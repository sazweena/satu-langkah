/* Kawan Kata v2
   Flow: teacher setup → mission (+ optional "Saya usaha untuk…") → camera → confirm / not sure →
   listen & pick → done (+ sticker) → teacher summary (+ paper version).
   Photos stay in memory only, are never uploaded or saved; recognition runs on the device (TensorFlow.js MobileNet). */

// ---------- word bank (KSSR BM, Tahun 1–3) ----------
const ICON = {
  buku: `<svg viewBox="0 0 80 100" width="W" aria-hidden="true"><rect x="6" y="6" width="68" height="88" rx="8" fill="#86b8aa" stroke="#5f9a8b" stroke-width="3"/><line x1="40" y1="8" x2="40" y2="92" stroke="#e9f3ef" stroke-width="3"/><line x1="14" y1="18" x2="30" y2="18" stroke="#e9f3ef" stroke-width="3"/></svg>`,
  pensel: `<svg viewBox="0 0 40 120" width="W" aria-hidden="true"><rect x="6" y="4" width="28" height="86" rx="10" fill="#f0c44f" stroke="#d6a52e" stroke-width="2"/><rect x="6" y="18" width="28" height="4" fill="#fbe7a6"/><polygon points="6,90 34,90 20,114" fill="#e7b896"/><polygon points="15,104 25,104 20,116" fill="#2f3a40"/></svg>`,
  pemadam: `<svg viewBox="0 0 100 70" width="W" aria-hidden="true"><rect x="8" y="10" width="84" height="50" rx="9" fill="#efa79a" stroke="#dd8b7e" stroke-width="2"/><rect x="58" y="10" width="34" height="50" rx="2" fill="#f7d3cc"/></svg>`,
  bola: `<svg viewBox="0 0 100 100" width="W" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="#f0c45c" stroke="#d6a62e" stroke-width="2"/><path d="M30 12 A44 44 0 0 0 30 88 A36 44 0 0 1 30 12Z" fill="#f7dc8f"/></svg>`,
  cawan: `<svg viewBox="0 0 110 100" width="W" aria-hidden="true"><rect x="10" y="10" width="64" height="80" rx="8" fill="#a8c7e8" stroke="#7aa0c8" stroke-width="3"/><path d="M74 30 h12 a14 14 0 0 1 0 28 h-12" fill="none" stroke="#7aa0c8" stroke-width="5"/><line x1="18" y1="18" x2="56" y2="18" stroke="#e3eefa" stroke-width="3"/></svg>`,
};
const SIZE = { buku: 1, pensel: .42, pemadam: 1.1, bola: 1, cawan: 1.05 };
const WORDS = [
  { id: 'buku', bm: 'Buku', match: /book jacket|comic book|binder/i },
  { id: 'pensel', bm: 'Pensel', match: /pencil|ballpoint|fountain pen/i },
  { id: 'pemadam', bm: 'Pemadam', match: /eraser/i },
  { id: 'bola', bm: 'Bola', match: /\bball\b|basketball|volleyball/i },
  { id: 'cawan', bm: 'Cawan', match: /\bcup\b|mug/i },
];
const REWARDS = { pelekat: { ic: '⭐', t: 'Pelekat' }, rehat: { ic: '🌿', t: 'Rehat' }, lagu: { ic: '🎵', t: 'Lagu' } };
const STICKERS = ['⭐', '🌈', '🐢', '🌻', '🚀'];
const W = id => WORDS.find(w => w.id === id);
function pic(id, base) {
  const w = W(id);
  if (w.letter) return `<span class="lt" style="font-size:${Math.round(base*0.7)}px">${w.bm[0]}</span>`;
  if (w.img) return `<img src="${w.img}" alt="">`;
  return ICON[id].replace('width="W"', `width="${Math.round(base * (SIZE[id] || 1))}"`);
}

// ---------- state ----------
const qs = new URLSearchParams(location.search);
const S = {
  selected: new Set(WORDS.map(w => w.id)),
  screen: 'setup', current: null, snap: null, pupil: 'Murid 01',
  teacher: { voice: true, reward: false, breakTimer: true },
  settings: { big: false, calm: false, contrast: false },
  reward: null, stickers: [], newSticker: false,
  log: null,
  demo: qs.has('demo'), demoUnsure: false,
  model: null, modelState: 'idle', stream: null,
};
try { Object.assign(S.settings, JSON.parse(localStorage.getItem('kk-settings') || '{}')); } catch (e) {}
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const screenEl = $('#screen');
function newLog() { return { start: Date.now(), words: {}, supports: { Ulang: 0, Bantu: 0, Rehat: 0, Henti: 0 } }; }
S.log = newLog();
const wlog = id => (S.log.words[id] ||= { tries: 0, helps: 0, done: false });

// ---------- sound ----------
function speak(text) {
  if (!S.teacher.voice || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const vs = speechSynthesis.getVoices();
  const v = vs.find(v => /^ms/i.test(v.lang)) || vs.find(v => /^id/i.test(v.lang));
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ms-MY';
  u.rate = 0.8;
  speechSynthesis.speak(u);
}
let actx;
function chime(notes = [660, 880]) { // soft confirmation, no harsh sounds
  if (!S.teacher.voice) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.18;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.4);
    });
  } catch (e) {}
}
const song = () => chime([523, 587, 659, 523, 659, 784]);

// ---------- model (on-device) ----------
async function loadModel() {
  if (S.model || S.modelState === 'loading' || !window.mobilenet) return;
  S.modelState = 'loading'; paintPill();
  try { S.model = await mobilenet.load({ version: 2, alpha: 1.0 }); S.modelState = 'ready'; }
  catch (e) { S.modelState = 'failed'; }
  paintPill();
}
function paintPill() {
  const p = $('#campill'); if (!p) return;
  p.textContent = S.demo ? 'Halakan kamera ke objek' :
    { loading: 'Menyediakan kamera pintar…', ready: 'Halakan kamera ke objek', failed: 'Ambil gambar, kemudian pilih perkataan', idle: 'Halakan kamera ke objek' }[S.modelState];
}

// ---------- layout helpers ----------
function sched(state) {
  const items = [['📷', 'Cari & ambil gambar'], ['👂', 'Dengar & pilih'], ['✅', 'Siap']];
  const lab = { on: 'SEKARANG', done: 'SIAP', '': 'SETERUSNYA' };
  return `<div class="sched" aria-label="Jadual langkah">${items.map(([ic, t], i) =>
    `<div class="${state[i]}" aria-current="${state[i] === 'on' ? 'step' : 'false'}"><span class="ic" aria-hidden="true">${ic}</span><span><small>${i === 2 && state[i] === '' ? 'AKHIR' : lab[state[i]]}</small>${t}</span></div>`).join('')}</div>`;
}
function head(title, sub, sayText) {
  return `<div class="head"><h1>${title}</h1><button class="say" id="sayHead" aria-label="Dengar arahan">🔊</button></div><p class="sub">${sub}</p>`;
}
function bindSay(text) { const b = $('#sayHead'); if (b) b.onclick = () => speak(text); }
function setChip(teacher) {
  const c = $('#chip');
  c.textContent = teacher ? 'PAPARAN GURU' : S.pupil;
  c.className = 'chip' + (teacher ? ' guru' : '');
  c.setAttribute('aria-label', teacher ? 'Paparan guru' : 'Tukar ke paparan guru');
}
function showControls(on) { $('#controls').classList.toggle('hidden', !on); }
function stopCam() { if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; } }
function go(name, arg) {
  if (name !== 'camera') stopCam();
  S.screen = name;
  SCREENS[name](arg);
  window.scrollTo(0, 0);
  screenEl.focus({ preventScroll: true });
}
const artOf = id => S.snap ? `<img class="snap" src="${S.snap}" alt="Gambar anda">` : pic(id, 150);

// ---------- screens ----------
const SCREENS = {
  setup() {
    setChip(true); showControls(false);
    const tg = (k, t, d) => `<div class="tg"><span>${t}<small>${d}</small></span><button class="toggle ${S.teacher[k] ? 'on' : ''}" data-t="${k}" role="switch" aria-checked="${S.teacher[k]}" aria-label="${t}"></button></div>`;
    screenEl.innerHTML = head('Sediakan sesi pembelajaran', 'Guru pilih perkataan sasaran daripada senarai kelas atau tambah foto sendiri.') +
      `<div class="band"><span>KSSR • Bahasa Melayu • Tahun 1–3</span>
        <span class="pupils" role="group" aria-label="Pilih murid">${['Murid 01', 'Murid 02', 'Murid 03'].map(p => `<button class="${p === S.pupil ? 'sel' : ''}" data-p="${p}">${p}</button>`).join('')}</span>
        <small id="count"></small></div>
      <div class="words">${WORDS.map(w => `
        <button class="wcard" data-w="${w.id}" aria-pressed="${S.selected.has(w.id)}"><div class="ring" aria-hidden="true"></div><div class="pic">${pic(w.id, 70)}</div>
        <b>${w.bm}</b><span class="st"></span></button>`).join('')}
        <button class="wcard add" id="addw"><span class="plus" aria-hidden="true">+</span>Tambah perkataan<span class="hint" style="font-weight:400">Foto objek sebenar kelas anda</span></button></div>
      <div class="setgrid">
        <div class="card objective"><div class="lbl">Objektif sesi</div><p>Murid memadankan foto objek dengan perkataan yang dipelajari.</p>
          <button class="btn" id="start">Mula sesi</button>
          <p class="hint" style="margin:14px 0 0">Foto yang diambil tidak disimpan. Gunakan kod murid, bukan nama penuh.</p></div>
        <div class="card"><div class="lbl" style="margin-bottom:4px">Tetapan sesi</div>
          ${tg('voice', 'Suara', 'Arahan dibacakan dengan perlahan')}
          ${tg('reward', 'Ganjaran pelekat', 'Murid pilih apa yang diusahakan (Mula → Kemudian)')}
          ${tg('breakTimer', 'Pemasa rehat', 'Pilihan 1 atau 2 minit semasa rehat')}</div>
      </div>`;
    const paint = () => {
      $$('.wcard[data-w]').forEach(c => {
        const on = S.selected.has(c.dataset.w);
        c.classList.toggle('sel', on); c.classList.toggle('off', !on); c.setAttribute('aria-pressed', on);
        c.querySelector('.st').textContent = on ? 'Dipilih untuk sesi' : 'Tekan untuk pilih';
      });
      $('#count').textContent = `${S.selected.size} perkataan dipilih`;
      $('#start').disabled = S.selected.size < 2;
    };
    $$('.wcard[data-w]').forEach(c => c.onclick = () => { S.selected.has(c.dataset.w) ? S.selected.delete(c.dataset.w) : S.selected.add(c.dataset.w); paint(); });
    $$('.pupils button').forEach(b => b.onclick = () => { S.pupil = b.dataset.p; go('setup'); });
    $$('.toggle[data-t]').forEach(t => t.onclick = () => { const k = t.dataset.t; S.teacher[k] = !S.teacher[k]; t.classList.toggle('on', S.teacher[k]); t.setAttribute('aria-checked', S.teacher[k]); });
    $('#addw').onclick = addWordSheet;
    $('#start').onclick = () => { S.log = newLog(); S.reward = null; go('mission'); };
    bindSay('Sediakan sesi pembelajaran. Pilih perkataan sasaran.');
    paint();
  },

  mission() {
    setChip(false); showControls(true); S.snap = null;
    const rw = S.teacher.reward;
    screenEl.innerHTML = head('Hai! Kita belajar tentang objek.', 'Anda boleh ikut langkah ini dengan tenang. Tiada had masa.') +
      sched(['on', '', '']) +
      `<div class="card panel"><div class="art">${pic('pensel', 150)}<span class="cap">Objek harian</span></div>
      <div><div class="kicker">Misi hari ini</div><div class="big-t">Cari satu objek</div>
      <p class="para">Lihat sekeliling dan pilih satu objek.<br>Guru akan bantu jika anda perlukan.</p>
      ${rw ? `<div class="ft"><div class="box"><small>MULA</small><b>📷 Cari objek</b></div><div class="arrow" aria-hidden="true">→</div>
        <div class="box"><small>KEMUDIAN</small><b id="ftThen">${S.reward ? REWARDS[S.reward].ic + ' ' + REWARDS[S.reward].t : 'Pilih di bawah'}</b></div></div>
        <div class="kicker" style="margin-top:14px">Saya usaha untuk…</div>
        <div class="rewards" role="group" aria-label="Pilih ganjaran">${Object.entries(REWARDS).map(([k, r]) => `<button class="rw ${S.reward === k ? 'sel' : ''}" data-r="${k}">${r.ic} ${r.t}</button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn" id="mula">Mula</button><span class="hint">Boleh berhenti bila-bila masa.</span></div></div></div>`;
    $$('.rw').forEach(b => b.onclick = () => { S.reward = b.dataset.r; $$('.rw').forEach(x => x.classList.toggle('sel', x === b)); $('#ftThen').textContent = REWARDS[S.reward].ic + ' ' + REWARDS[S.reward].t; speak('Saya usaha untuk ' + REWARDS[S.reward].t); });
    $('#mula').onclick = () => go('camera');
    bindSay('Cari satu objek. Lihat sekeliling dan pilih satu objek.');
    speak('Cari satu objek.');
  },

  async camera() {
    screenEl.innerHTML = head('Ambil gambar satu objek', 'Letakkan objek di dalam ruang. Anda boleh minta bantuan.') +
      sched(['on', '', '']) +
      `<div class="cam"><div class="view" id="view">
        <div class="fake" id="fake">${pic('pensel', 150)}</div>
        <div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>
        <div class="pill" id="campill"></div></div></div>
      <div class="shutterrow">
        <button class="upload" id="upl">🖼️ Muat naik gambar</button>
        <button class="shutter" id="snap" aria-label="Ambil gambar"><span class="o" aria-hidden="true">📷</span>Ambil gambar</button>
        <span class="hint camhint">Tiada kilat. Gambar tidak disimpan.</span></div>`;
    paintPill();
    $('#snap').onclick = () => takePhoto();
    $('#upl').onclick = () => { const f = $('#filepick'); f.value = ''; f.onchange = () => f.files[0] && fromFile(f.files[0]); f.click(); };
    bindSay('Ambil gambar satu objek. Letakkan objek di dalam ruang.');
    loadModel();
    if (!S.demo && navigator.mediaDevices?.getUserMedia) {
      try {
        S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (S.screen !== 'camera') return stopCam();
        const v = document.createElement('video');
        Object.assign(v, { autoplay: true, playsInline: true, muted: true, srcObject: S.stream, id: 'video' });
        $('#fake').replaceWith(v);
      } catch (e) { /* no camera: keep the illustration; upload or demo still works */ }
    }
  },

  confirm(id) {
    const w = W(id); S.current = id;
    screenEl.innerHTML = head(`Adakah ini ${w.bm.toLowerCase()}?`, 'Saya padankan gambar dengan perkataan pilihan guru.') +
      sched(['on', '', '']) +
      `<div class="cpanel"><div class="card"><div class="art">${artOf(id)}<span class="cap">Gambar anda</span></div>
        <button class="link" id="retake" style="margin-top:8px">📷 Ambil semula</button></div>
      <div class="card"><div class="maybe"><small>MUNGKIN</small><b>${w.bm}</b></div>
      <button class="listen" id="hear">🔊 Dengar perkataan</button>
      <p class="center hint" style="font-size:18px;margin-top:22px">Betul? Anda yang tentukan.</p>
      <div class="yesno"><button class="btn" id="yes">Ya, ini</button><button class="btn ghost" id="no">Saya tak pasti</button></div>
      <p class="center hint" style="font-size:14px;margin-top:14px">AI tidak pasti? Pilih daripada senarai guru.</p></div></div>`;
    $('#hear').onclick = () => speak(w.bm);
    $('#yes').onclick = () => go('listen', id);
    $('#no').onclick = () => go('choose');
    $('#retake').onclick = () => go('camera');
    bindSay(`Adakah ini ${w.bm}? Anda yang tentukan.`);
    speak(`Adakah ini ${w.bm}?`);
  },

  choose() {
    const list = WORDS.filter(w => S.selected.has(w.id));
    screenEl.innerHTML = head('Saya belum pasti.', 'Pilih perkataan yang paling sesuai. Tiada jawapan diteka.') +
      sched(['on', '', '']) +
      `<div class="choose${list.length > 5 ? ' many' : ''}">${list.map(w => `<div class="wcard" role="button" tabindex="0" data-w="${w.id}" aria-label="${w.bm}">
        <button class="mini-say" data-s="${w.id}" aria-label="Dengar ${w.bm}">🔊</button>
        <div class="pic">${pic(w.id, 66)}</div><b>${w.bm}</b><span class="st">Tekan untuk pilih</span></div>`).join('')}
        <div class="tip"><div class="kicker">Pilihan anda</div><b>Gambar tidak sepadan?</b><p class="para" style="font-size:17px;line-height:1.6">Pilih objek lain atau minta bantuan guru.</p>
        <button class="btn out" id="again" style="font-size:16px;padding:10px 18px;min-height:52px;margin-top:12px">📷 Ambil gambar semula</button></div></div>`;
    $$('.choose .wcard').forEach(c => {
      const pick = () => go('listen', c.dataset.w);
      c.onclick = e => { if (!e.target.closest('.mini-say')) pick(); };
      c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    });
    $$('.mini-say').forEach(b => b.onclick = () => speak(W(b.dataset.s).bm));
    $('#again').onclick = () => go('camera');
    bindSay('Saya belum pasti. Pilih perkataan yang paling sesuai.');
    speak('Saya belum pasti. Pilih perkataan yang paling sesuai.');
  },

  listen(id) {
    const w = W(id); S.current = id; wlog(id);
    const pool = WORDS.filter(x => x.id !== id);
    const others = pool.filter(x => S.selected.has(x.id)).concat(pool.filter(x => !S.selected.has(x.id))).slice(0, 2);
    const opts = [w, ...others].sort(() => Math.random() - 0.5);
    screenEl.innerHTML = head('Dengar dan pilih perkataan', 'Satu aktiviti pendek. Anda boleh ulang seberapa banyak kali.') +
      sched(['done', 'on', '']) +
      `<div class="card lpanel"><div class="art">${artOf(id)}<span class="cap">Objek</span></div>
      <div><div class="kicker" style="font-size:18px">Dengar perkataan</div>
      <button class="wordbtn" id="hear" aria-label="Dengar perkataan ${w.bm}">🔊 <span>${w.bm}</span></button>
      <div style="font-weight:700;font-size:19px;margin-top:30px">Pilih kad perkataan yang sama.</div>
      <div class="cards3">${opts.map(o => `<button class="wc" data-w="${o.id}"><span class="p">${pic(o.id, 44)}</span>${o.bm}</button>`).join('')}</div>
      <div class="feedback" id="fb" aria-live="polite">Tekan Ulang, Bantu, Rehat atau Henti pada bila-bila masa.</div></div></div>`;
    $('#hear').onclick = () => speak(w.bm);
    $$('.wc').forEach(b => b.onclick = () => {
      $$('.wc').forEach(x => x.classList.remove('try'));
      wlog(id).tries++;
      if (b.dataset.w === id) {
        wlog(id).done = true;
        b.classList.add('right'); $('#fb').textContent = `Betul! ${w.bm}.`; chime(); speak(`Betul. ${w.bm}.`);
        setTimeout(() => S.screen === 'listen' && go('done'), 1500);
      } else {
        b.classList.add('try'); $('#fb').textContent = 'Tidak mengapa. Dengar sekali lagi dan cuba.'; speak(w.bm);
      }
    });
    bindSay(`Dengar dan pilih perkataan. ${w.bm}.`);
    setTimeout(() => speak(w.bm), 300);
  },

  done() {
    S.snap = null; // photo discarded
    const r = S.teacher.reward && S.reward;
    S.newSticker = false;
    if (r === 'pelekat' && S.stickers.length < STICKERS.length) { S.stickers.push(STICKERS[S.stickers.length]); S.newSticker = true; }
    screenEl.innerHTML = head('Bagus, sesi sudah selesai.', 'Tiada markah atau kelajuan dibandingkan.') +
      sched(['done', 'done', 'on']) +
      `<div class="card dpanel"><div class="tick"><svg width="112" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#186b67"/><path d="M27 52 l15 15 l32 -34" fill="none" stroke="#fff" stroke-width="10"/></svg></div>
      <div><p class="hint" style="font-size:18px;margin:4px 0 10px">Anda mencuba langkah ini:</p>
      <div class="dlist"><div>Ambil gambar objek</div><div>Dengar dan pilih perkataan</div></div>
      ${r === 'pelekat' ? `<div class="stickers"><b>Koleksi pelekat saya</b><div class="slots">${STICKERS.map((s, i) => `<span class="${i < S.stickers.length ? 'got' : ''} ${S.newSticker && i === S.stickers.length - 1 ? 'new' : ''}">${i < S.stickers.length ? s : ''}</span>`).join('')}</div></div>` : ''}
      ${r === 'rehat' ? `<button class="btn out" id="myrest" style="margin-top:14px">🌿 Masa rehat saya</button>` : ''}
      ${r === 'lagu' ? `<button class="btn out" id="mysong" style="margin-top:14px">🎵 Main lagu saya</button>` : ''}
      <div class="row" style="margin-top:18px"><button class="btn" id="fin">Selesai</button><button class="link" id="more">Seterusnya: belajar perkataan lain →</button></div></div></div>`;
    $('#more').onclick = () => go('mission');
    $('#fin').onclick = () => go('summary');
    $('#myrest') && ($('#myrest').onclick = restSheet);
    $('#mysong') && ($('#mysong').onclick = song);
    chime([523, 659, 784]);
    bindSay('Bagus. Sesi sudah selesai.');
    speak(r === 'pelekat' ? 'Bagus. Anda dapat satu pelekat.' : 'Bagus. Sesi sudah selesai.');
  },

  summary() {
    setChip(true); showControls(false);
    const mins = Math.max(1, Math.round((Date.now() - S.log.start) / 60000));
    const ids = Object.keys(S.log.words);
    const sup = S.log.supports;
    screenEl.innerHTML = head('Ringkasan sesi', 'Maklumat untuk guru menyesuaikan aktiviti seterusnya.') +
      `<div class="sband"><b>${S.pupil} &nbsp;•&nbsp; Sesi: Objek harian &nbsp;•&nbsp; ${mins} minit</b><p>Paparan ini merekod sokongan, bukan memberi diagnosis atau ranking.</p></div>
      <div class="sgrid"><div class="card"><div class="lbl">Sasaran pembelajaran</div>
        <div class="big-t" style="font-size:24px;margin:12px 0 10px">Memadankan foto dengan perkataan sasaran</div>
        ${ids.length ? `<table class="wtable"><tr><th>PERKATAAN DICUBA</th><th>CUBAAN</th><th>STATUS</th></tr>${ids.map(id => {
          const l = S.log.words[id]; return `<tr><td><span class="wi"><i>${pic(id, 30)}</i>${W(id).bm}</span></td><td>${l.tries}</td><td>${l.done ? '✓ Dipadankan' : 'Belum selesai'}</td></tr>`; }).join('')}</table>`
        : '<p class="hint">Belum ada perkataan dicuba.</p>'}</div>
      <div class="card"><div class="lbl">Sokongan digunakan</div>
        <div class="sup">${Object.entries(sup).map(([k, n]) => `<div><span class="dot ${n ? 'on' : ''}">${n ? '<svg width="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10 l4 4 l8 -9" stroke="#fff" stroke-width="3" fill="none"/></svg>' : ''}</span>${k}<span class="n">${n ? n + '×' : ''}</span></div>`).join('')}</div>
        <textarea class="note" rows="2" aria-label="Nota guru" placeholder="Guru boleh tambah nota pemerhatian."></textarea></div></div>
      <div class="sbtns"><button class="btn out" id="printv">🖨️ Cetak versi kertas</button><button class="btn" id="close">Tutup ringkasan</button></div>`;
    $('#close').onclick = () => go('setup');
    $('#printv').onclick = printPaper;
    bindSay('Ringkasan sesi untuk guru.');
  },
};

// ---------- photo + matching ----------
async function classifyAndRoute(canvas) {
  let best = null;
  if (S.demo || !canvas) {
    best = S.demoUnsure ? null : (S.selected.has('pensel') ? 'pensel' : [...S.selected][0]);
    S.demoUnsure = false; badge();
    await new Promise(r => setTimeout(r, 700));
  } else {
    if (S.demoUnsure) { S.demoUnsure = false; badge(); return go('choose'); }
    if (!S.model && S.modelState !== 'failed') await loadModel();
    if (S.model) {
      const preds = await S.model.classify(canvas, 5);
      let top = 0;
      for (const w of WORDS) {
        if (!S.selected.has(w.id) || !w.match) continue; // closed word set: only the teacher's words
        const score = preds.filter(p => w.match.test(p.className)).reduce((a, p) => a + p.probability, 0);
        if (score > top) { top = score; best = w.id; }
      }
      if (top < 0.15) best = null; // not confident → never guess
    }
  }
  best ? go('confirm', best) : go('choose');
}
async function takePhoto() {
  const btn = $('#snap'); btn.disabled = true; btn.lastChild.textContent = 'Sedang melihat…';
  const video = $('#video'); let canvas = null;
  if (video && video.videoWidth) {
    canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    S.snap = canvas.toDataURL('image/jpeg', 0.8); // memory only
  }
  stopCam();
  classifyAndRoute(canvas);
}
function fromFile(file) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); const k = Math.min(1, 900 / Math.max(img.width, img.height));
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    S.snap = c.toDataURL('image/jpeg', 0.8); URL.revokeObjectURL(img.src); stopCam();
    const wasDemo = S.demo; S.demo = false; classifyAndRoute(c).finally(() => { S.demo = wasDemo; });
  };
  img.src = URL.createObjectURL(file);
}

// ---------- teacher: add own word ----------
function addWordSheet() {
  let img = null;
  overlay(`<h2>Tambah perkataan</h2><p style="margin:0">Gunakan foto objek sebenar di kelas anda.</p>
    <div class="field"><label for="nw">Perkataan (BM)</label><input type="text" id="nw" placeholder="cth: Kerusi" maxlength="20"></div>
    <div class="field"><label>Foto</label><div class="preview" id="pv">Tiada foto lagi</div>
      <button class="btn out" id="pf" style="width:100%;margin-top:10px">📷 Ambil / pilih foto</button></div>
    <div class="yesno"><button class="btn" id="sv">Simpan</button><button class="btn ghost" id="cx">Batal</button></div>
    <p class="hint" style="font-size:14px">Perkataan tambahan dipilih oleh murid daripada senarai (tanpa pengecaman kamera).</p>`);
  $('#pf').onclick = () => { const f = $('#filepick'); f.value = ''; f.setAttribute('capture', 'environment');
    f.onchange = () => { const file = f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { img = r.result; $('#pv').innerHTML = `<img src="${img}" alt="">`; }; r.readAsDataURL(file); f.removeAttribute('capture'); };
    f.click(); };
  $('#cx').onclick = closeOverlay;
  $('#sv').onclick = () => {
    const t = $('#nw').value.trim(); if (!t) { $('#nw').focus(); return; }
    const id = 'c' + Date.now();
    const bm = t[0].toUpperCase() + t.slice(1).toLowerCase();
    WORDS.push({ id, bm, match: null, img: img || svgLetter(bm), letter: !img });
    S.selected.add(id); closeOverlay(); go('setup');
  };
  setTimeout(() => $('#nw').focus(), 50);
}
function svgLetter(t) {
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#e3f1ee"/><text x="50" y="66" font-size="48" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#186b67">${t[0]}</text></svg>`);
}

// ---------- paper version ----------
function printPaper() {
  const list = WORDS.filter(w => S.selected.has(w.id));
  $('#print').innerHTML = `<h2>Kawan Kata · Kad perkataan (versi kertas) · ${S.pupil}</h2><div class="pcards">${list.map(w =>
    `<div class="pcard">${w.img && !w.letter ? `<img src="${w.img}" alt="">` : pic(w.id, 120)}<b>${w.bm}</b></div>`).join('')}</div>`;
  window.print();
}

// ---------- overlays + always-on controls ----------
function overlay(html, cls = '') {
  $('#sheet').className = 'sheet ' + cls; $('#sheet').innerHTML = html; $('#overlay').classList.remove('hidden');
  const f = $('#sheet').querySelector('button,input'); f && f.focus();
}
function closeOverlay() { $('#overlay').classList.add('hidden'); clearInterval(restSheet.t); $('#screen').focus({ preventScroll: true }); }
$('#overlay').addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });
function restSheet() {
  speechSynthesis?.cancel();
  overlay(`<div class="breath" aria-hidden="true">🌿</div><h2>Masa rehat</h2><p>Tarik nafas perlahan-lahan. Berapa lama anda mahu rehat?</p>
    <div class="breakopts">${S.teacher.breakTimer ? `<button data-m="1"><span>🕐</span>1 minit</button><button data-m="2"><span>🕑</span>2 minit</button>` : ''}
    <button data-m="0" style="${S.teacher.breakTimer ? '' : 'grid-column:span 3'}"><span>🙂</span>Bila saya sedia</button></div>`, 'rest');
  $$('.breakopts button').forEach(b => b.onclick = () => {
    const m = +b.dataset.m;
    if (!m) { overlay(`<div class="breath" aria-hidden="true">🌿</div><h2>Rehat dahulu</h2><p>Tiada had masa. Kembali bila anda sedia.</p><button class="btn" id="back">Kembali</button>`, 'rest'); $('#back').onclick = closeOverlay; return; }
    const total = m * 60; let left = total; const C = 2 * Math.PI * 80;
    overlay(`<h2>Masa rehat</h2><div class="ringwrap"><svg width="180" height="180" aria-hidden="true"><circle cx="90" cy="90" r="80" fill="none" stroke="#d6e8e3" stroke-width="14"/>
      <circle id="rg" cx="90" cy="90" r="80" fill="none" stroke="#186b67" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="lefttxt" aria-hidden="true">🌿</div></div>
      <p id="rt">Rehat ${m} minit. Anda boleh kembali bila-bila masa.</p><button class="btn" id="back">Kembali</button>`, 'rest');
    $('#back').onclick = closeOverlay;
    restSheet.t = setInterval(() => {
      left--; const rg = $('#rg'); if (!rg) return clearInterval(restSheet.t);
      rg.setAttribute('stroke-dashoffset', String(C * (1 - left / total)));
      if (left <= 0) { clearInterval(restSheet.t); $('#rt').textContent = 'Masa rehat tamat. Kembali bila anda sedia.'; chime([523, 659]); }
    }, 1000);
  });
}
const SAY = {
  mission: 'Cari satu objek. Lihat sekeliling dan pilih satu objek.',
  camera: 'Ambil gambar satu objek. Letakkan objek di dalam ruang.',
  confirm: () => `Adakah ini ${W(S.current).bm}?`,
  choose: 'Pilih perkataan yang paling sesuai.',
  listen: () => W(S.current).bm,
  done: 'Bagus. Sesi sudah selesai.',
};
$$('[data-ctl]').forEach(b => b.onclick = () => {
  const c = b.dataset.ctl, key = c[0].toUpperCase() + c.slice(1);
  if (c !== 'pilihan') { S.log.supports[key]++; if (S.current && ['Bantu'].includes(key)) wlog(S.current).helps++; }
  if (c === 'ulang') { const s = SAY[S.screen]; speak(typeof s === 'function' ? s() : s); }
  if (c === 'bantu') {
    overlay(`<div style="font-size:52px" aria-hidden="true">🙋</div><h2>Cikgu sudah dimaklumkan</h2><p>Tunggu sebentar. Cikgu akan datang membantu anda.</p><button class="btn" id="ok">OK</button>`);
    speak('Cikgu sudah dimaklumkan.'); $('#ok').onclick = closeOverlay;
  }
  if (c === 'rehat') restSheet();
  if (c === 'henti') {
    overlay(`<div style="font-size:46px" aria-hidden="true">✋</div><h2>Mahu berhenti?</h2><p>Tidak mengapa. Anda boleh sambung lain kali.</p>
      <div class="yesno" style="margin-top:10px"><button class="btn" id="stop">Ya, berhenti</button><button class="btn ghost" id="cont">Teruskan</button></div>`);
    $('#stop').onclick = () => { closeOverlay(); go('summary'); }; $('#cont').onclick = closeOverlay;
  }
  if (c === 'pilihan') {
    const row = (k, t, src) => `<div class="tg"><span>${t}</span><button class="toggle ${src[k] ? 'on' : ''}" data-k="${k}" data-src="${src === S.teacher ? 't' : 's'}" role="switch" aria-checked="${!!src[k]}" aria-label="${t}"></button></div>`;
    overlay(`<h2>Pilihan anda</h2>${row('voice', '🔊 Bunyi / suara', S.teacher)}${row('big', '🔠 Teks besar', S.settings)}${row('contrast', '◐ Kontras tinggi', S.settings)}${row('calm', '🍃 Kurangkan animasi', S.settings)}<button class="btn" id="ok">Siap</button>`);
    $$('.sheet .toggle').forEach(t => t.onclick = () => {
      const src = t.dataset.src === 't' ? S.teacher : S.settings, k = t.dataset.k;
      src[k] = !src[k]; t.classList.toggle('on', src[k]); t.setAttribute('aria-checked', src[k]); applySettings();
    });
    $('#ok').onclick = closeOverlay;
  }
});
function applySettings() {
  ['big', 'calm', 'contrast'].forEach(k => document.body.classList.toggle(k, !!S.settings[k]));
  try { localStorage.setItem('kk-settings', JSON.stringify(S.settings)); } catch (e) {}
}
$('#chip').onclick = () => { if (!['setup', 'summary'].includes(S.screen)) go('summary'); };

// ---------- demo keys (for reliable video recording) ----------
// D = toggle demo mode (illustration instead of camera; snap suggests "Pensel")
// U = make the NEXT snap return "Saya belum pasti" (to show the fallback)
function badge() {
  const b = $('#demoBadge');
  b.textContent = S.demoUnsure ? (S.demo ? 'DEMO · TAK PASTI' : 'TAK PASTI') : 'DEMO';
  b.classList.toggle('hidden', !(S.demo || S.demoUnsure) || qs.has('nobadge'));
}
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'd' || e.key === 'D') { S.demo = !S.demo; badge(); if (S.screen === 'camera') go('camera'); }
  if (e.key === 'u' || e.key === 'U') { S.demoUnsure = true; badge(); }
});
if (qs.has('reward')) S.teacher.reward = true;
badge(); applySettings(); go('setup');
