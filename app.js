/* Kawan Kata prototype: teacher picks words → learner snaps → confirm or choose → listen & pick → done → teacher summary.
   Photos stay in memory only and are never uploaded or saved. Recognition runs on the device (TensorFlow.js MobileNet). */

// ---------- word bank (KSSR BM, Tahun 1–3) ----------
const ICON = {
  buku: `<svg viewBox="0 0 80 100" width="W"><rect x="6" y="6" width="68" height="88" rx="8" fill="#86b8aa" stroke="#5f9a8b" stroke-width="3"/><line x1="40" y1="8" x2="40" y2="92" stroke="#e9f3ef" stroke-width="3"/><line x1="14" y1="18" x2="30" y2="18" stroke="#e9f3ef" stroke-width="3"/></svg>`,
  pensel: `<svg viewBox="0 0 40 120" width="W"><rect x="6" y="4" width="28" height="86" rx="10" fill="#f0c44f" stroke="#d6a52e" stroke-width="2"/><rect x="6" y="18" width="28" height="4" fill="#fbe7a6"/><polygon points="6,90 34,90 20,114" fill="#e7b896"/><polygon points="15,104 25,104 20,116" fill="#2f3a40"/></svg>`,
  pemadam: `<svg viewBox="0 0 100 70" width="W"><rect x="8" y="10" width="84" height="50" rx="9" fill="#efa79a" stroke="#dd8b7e" stroke-width="2"/><rect x="58" y="10" width="34" height="50" rx="2" fill="#f7d3cc"/></svg>`,
  bola: `<svg viewBox="0 0 100 100" width="W"><circle cx="50" cy="50" r="44" fill="#f0c45c" stroke="#d6a62e" stroke-width="2"/><path d="M30 12 A44 44 0 0 0 30 88 A36 44 0 0 1 30 12Z" fill="#f7dc8f"/></svg>`,
  cawan: `<svg viewBox="0 0 110 100" width="W"><rect x="10" y="10" width="64" height="80" rx="8" fill="#a8c7e8" stroke="#7aa0c8" stroke-width="3"/><path d="M74 30 h12 a14 14 0 0 1 0 28 h-12" fill="none" stroke="#7aa0c8" stroke-width="5"/><line x1="18" y1="18" x2="56" y2="18" stroke="#e3eefa" stroke-width="3"/></svg>`,
};
const WORDS = [
  { id: 'buku', bm: 'Buku', match: /book jacket|comic book|binder/i },
  { id: 'pensel', bm: 'Pensel', match: /pencil|ballpoint|fountain pen/i },
  { id: 'pemadam', bm: 'Pemadam', match: /eraser/i },
  { id: 'bola', bm: 'Bola', match: /\bball\b|basketball|volleyball/i },
  { id: 'cawan', bm: 'Cawan', match: /\bcup\b|mug/i },
];
const W = id => WORDS.find(w => w.id === id);
const icon = (id, w) => ICON[id].replace('width="W"', `width="${w}"`);

// ---------- state ----------
const qs = new URLSearchParams(location.search);
const S = {
  selected: new Set(WORDS.map(w => w.id)),
  screen: 'setup', current: null, snap: null,
  log: { words: [], supports: new Set(), start: null },
  settings: { sound: true, big: false, calm: false },
  demo: qs.has('demo'), demoUnsure: false,
  model: null, modelState: 'idle', stream: null,
};
try { Object.assign(S.settings, JSON.parse(localStorage.getItem('kk-settings') || '{}')); } catch (e) {}
const $ = sel => document.querySelector(sel);
const screenEl = $('#screen');

// ---------- speech ----------
function speak(text) {
  if (!S.settings.sound || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const vs = speechSynthesis.getVoices();
  const v = vs.find(v => /^ms/i.test(v.lang)) || vs.find(v => /^id/i.test(v.lang));
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ms-MY';
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

// ---------- model (on-device) ----------
async function loadModel() {
  if (S.model || S.modelState === 'loading' || !window.mobilenet) return;
  S.modelState = 'loading';
  try { S.model = await mobilenet.load({ version: 2, alpha: 1.0 }); S.modelState = 'ready'; }
  catch (e) { S.modelState = 'failed'; }
  const pill = $('#campill'); if (pill) pill.textContent = pillText();
}
function pillText() {
  if (S.demo) return 'Objek dikesan dalam ruang';
  return { loading: 'Memuatkan pengecam objek…', ready: 'Objek dikesan dalam ruang', failed: 'Pengecam tidak tersedia, anda boleh pilih sendiri', idle: 'Letakkan objek di dalam ruang' }[S.modelState];
}

// ---------- layout helpers ----------
function steps(state) {
  const n = ['SEKARANG', 'SETERUSNYA', 'SIAP'];
  return `<div class="steps">${n.map((t, i) => `<div class="${state[i]}">${t}</div>`).join('')}</div>`;
}
function head(title, sub) { return `<h1>${title}</h1><p class="sub">${sub}</p>`; }
function setChip(teacher) {
  const c = $('#chip');
  c.textContent = teacher ? 'PAPARAN GURU' : 'Murid 01';
  c.className = 'chip' + (teacher ? ' guru' : '');
}
function showControls(on) { $('#controls').classList.toggle('hidden', !on); }
function stopCam() { if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; } }

function go(name, arg) {
  if (name !== 'camera') stopCam();
  S.screen = name;
  SCREENS[name](arg);
  window.scrollTo(0, 0);
}

// ---------- screens ----------
const SCREENS = {
  setup() {
    setChip(true); showControls(false);
    screenEl.innerHTML = head('Sediakan sesi pembelajaran', 'Guru pilih perkataan sasaran daripada senarai kelas atau tambah foto sendiri.') +
      `<div class="band"><span>KSSR • Bahasa Melayu • Tahun 1–3</span><small id="count"></small></div>
      <div class="words">${WORDS.map(w => `
        <button class="wcard" data-w="${w.id}"><div class="ring"></div><div class="pic">${icon(w.id, w.id === 'pensel' ? 34 : 76)}</div>
        <b>${w.bm}</b><span class="st"></span></button>`).join('')}</div>
      <div class="card objective"><div><div class="lbl">Objektif sesi</div><p>Murid memadankan foto objek dengan perkataan yang dipelajari.</p></div>
      <button class="btn" id="start">Mula sesi</button></div>
      <p class="foot">Foto yang diambil tidak disimpan. Gunakan kod murid, bukan nama penuh.</p>`;
    const paint = () => {
      document.querySelectorAll('.wcard').forEach(c => {
        const on = S.selected.has(c.dataset.w);
        c.classList.toggle('sel', on); c.classList.toggle('off', !on);
        c.querySelector('.st').textContent = on ? 'Dipilih untuk sesi' : 'Tekan untuk pilih';
      });
      $('#count').textContent = `${S.selected.size} perkataan dipilih`;
      $('#start').disabled = S.selected.size < 2;
    };
    document.querySelectorAll('.wcard').forEach(c => c.onclick = () => {
      S.selected.has(c.dataset.w) ? S.selected.delete(c.dataset.w) : S.selected.add(c.dataset.w); paint();
    });
    $('#start').onclick = () => { S.log = { words: [], supports: new Set(), start: Date.now() }; go('mission'); };
    paint();
  },

  mission() {
    setChip(false); showControls(true); S.snap = null;
    screenEl.innerHTML = head('Hai! Kita belajar tentang objek.', 'Anda boleh ikut langkah ini dengan tenang. Tiada had masa.') +
      steps(['on', '', '']) +
      `<div class="card panel"><div class="art">${icon('pensel', 64)}<span class="cap">Objek harian</span></div>
      <div><div class="kicker">Misi hari ini</div><div class="big-t">Cari satu objek</div>
      <p class="para">Lihat sekeliling dan pilih satu objek.<br>Guru akan bantu jika anda perlukan.</p>
      <div class="row"><button class="btn" id="mula">Mula</button><span class="hint">Boleh berhenti bila-bila masa.</span></div></div></div>`;
    $('#mula').onclick = () => go('camera');
    speak('Cari satu objek.');
  },

  async camera() {
    screenEl.innerHTML = head('Ambil gambar satu objek', 'Letakkan objek di dalam ruang. Anda boleh minta bantuan.') +
      steps(['on', '', '']) +
      `<div class="cam"><div class="view" id="view">
        <div class="fake" id="fake">${icon('pensel', 64)}</div>
        <div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>
        <div class="pill" id="campill">${pillText()}</div></div></div>
      <button class="btn snapbtn" id="snap">Ambil gambar</button>`;
    $('#snap').onclick = takePhoto;
    loadModel();
    if (!S.demo && navigator.mediaDevices?.getUserMedia) {
      try {
        S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (S.screen !== 'camera') return stopCam();
        const v = document.createElement('video');
        v.autoplay = true; v.playsInline = true; v.muted = true; v.srcObject = S.stream; v.id = 'video';
        $('#fake').replaceWith(v);
      } catch (e) { /* no camera: keep the illustration, the learner can still continue */ }
    }
  },

  confirm(id) {
    const w = W(id); S.current = id;
    screenEl.innerHTML = head(`Adakah ini ${w.bm.toLowerCase()}?`, 'Saya padankan gambar dengan perkataan pilihan guru.') +
      steps(['on', '', '']) +
      `<div class="cpanel"><div class="card"><div class="art">${S.snap ? `<img class="snap" src="${S.snap}" alt="">` : icon(id, id === 'pensel' ? 64 : 150)}<span class="cap">Gambar anda</span></div></div>
      <div class="card"><div class="maybe"><small>MUNGKIN</small><b>${w.bm}</b></div>
      <button class="listen" id="hear">Dengar perkataan</button>
      <p class="center hint" style="font-size:18px;margin-top:26px">Betul? Anda yang tentukan.</p>
      <div class="yesno"><button class="btn" id="yes">Ya, ini</button><button class="btn ghost" id="no">Saya tak pasti</button></div>
      <p class="center hint" style="font-size:14px;margin-top:18px">AI tidak pasti? Pilih daripada senarai guru.</p></div></div>`;
    $('#hear').onclick = () => speak(w.bm);
    $('#yes').onclick = () => go('listen', id);
    $('#no').onclick = () => go('choose');
    speak(`Adakah ini ${w.bm}?`);
  },

  choose() {
    const list = WORDS.filter(w => S.selected.has(w.id));
    screenEl.innerHTML = head('Saya belum pasti.', 'Pilih perkataan yang paling sesuai. Tiada jawapan diteka.') +
      steps(['on', '', '']) +
      `<div class="choose">${list.map(w => `<button class="wcard" data-w="${w.id}"><div class="ring"></div>
        <div class="pic">${icon(w.id, w.id === 'pensel' ? 30 : 74)}</div><b>${w.bm}</b><span>Tekan untuk pilih</span></button>`).join('')}
        <div class="tip"><div class="kicker">Pilihan anda</div><b>Gambar tidak sepadan?</b><p class="para" style="font-size:17px;line-height:1.6">Pilih objek lain atau<br>minta bantuan guru.</p>
        <button class="btn out" id="again" style="min-width:0;font-size:16px;padding:10px 18px;margin-top:10px">Ambil gambar semula</button></div></div>`;
    document.querySelectorAll('.choose .wcard').forEach(c => c.onclick = () => go('listen', c.dataset.w));
    $('#again').onclick = () => go('camera');
    speak('Saya belum pasti. Pilih perkataan yang paling sesuai.');
  },

  listen(id) {
    const w = W(id); S.current = id;
    if (!S.log.words.includes(id)) S.log.words.push(id);
    const pool = WORDS.filter(x => x.id !== id);
    const others = pool.filter(x => S.selected.has(x.id)).concat(pool.filter(x => !S.selected.has(x.id))).slice(0, 2);
    const opts = [w, ...others].sort(() => Math.random() - 0.5);
    screenEl.innerHTML = head('Dengar dan pilih perkataan', 'Satu aktiviti pendek. Anda boleh ulang seberapa banyak kali.') +
      steps(['done', 'on', '']) +
      `<div class="card lpanel"><div class="art">${S.snap ? `<img class="snap" src="${S.snap}" alt="">` : icon(id, id === 'pensel' ? 64 : 150)}<span class="cap">Objek</span></div>
      <div><div class="kicker" style="font-size:18px">Dengar perkataan</div>
      <button class="wordbtn" id="hear">🔊 <span>${w.bm}</span></button>
      <div style="font-weight:700;font-size:19px;margin-top:40px">Pilih kad perkataan yang sama.</div>
      <div class="cards3">${opts.map(o => `<button class="wc" data-w="${o.id}">${o.bm}<small>Pilih</small></button>`).join('')}</div>
      <div class="feedback" id="fb">Tekan Ulang, Bantu, Rehat atau Henti pada bila-bila masa.</div></div></div>`;
    $('#hear').onclick = () => speak(w.bm);
    document.querySelectorAll('.wc').forEach(b => b.onclick = () => {
      document.querySelectorAll('.wc').forEach(x => x.classList.remove('try'));
      if (b.dataset.w === id) {
        b.classList.add('right'); $('#fb').textContent = `Betul! ${w.bm}.`; speak(`Betul. ${w.bm}.`);
        setTimeout(() => S.screen === 'listen' && go('done'), 1400);
      } else {
        b.classList.add('try'); $('#fb').textContent = 'Tidak mengapa. Dengar sekali lagi dan cuba.'; speak(w.bm);
      }
    });
    setTimeout(() => speak(w.bm), 300);
  },

  done() {
    S.snap = null; // photo discarded
    screenEl.innerHTML = head('Bagus, sesi sudah selesai.', 'Tiada markah atau kelajuan dibandingkan.') +
      steps(['done', 'done', 'on']) +
      `<div class="card dpanel"><div class="tick"><svg width="118" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#186b67"/><path d="M27 52 l15 15 l32 -34" fill="none" stroke="#fff" stroke-width="10"/></svg></div>
      <div><p class="hint" style="font-size:18px;margin:4px 0 18px">Anda mencuba langkah ini:</p>
      <div class="dlist"><div>1. Ambil gambar objek</div><div>2. Dengar dan pilih perkataan</div></div>
      <button class="next" id="more" style="background:none;padding:0">Seterusnya: belajar perkataan lain →</button>
      <div class="row" style="margin-top:22px"><button class="btn" id="fin">Selesai</button><span class="hint">Boleh rehat sekarang.</span></div></div></div>`;
    $('#more').onclick = () => go('mission');
    $('#fin').onclick = () => go('summary');
    speak('Bagus. Sesi sudah selesai.');
  },

  summary() {
    setChip(true); showControls(false);
    const mins = Math.max(1, Math.round((Date.now() - (S.log.start || Date.now())) / 60000));
    const words = S.log.words.length ? S.log.words : [];
    screenEl.innerHTML = head('Ringkasan sesi', 'Maklumat untuk guru menyesuaikan aktiviti seterusnya.') +
      `<div class="sband"><b>Murid 01 &nbsp;•&nbsp; Sesi: Objek harian &nbsp;•&nbsp; ${mins} minit</b><p>Paparan ini merekod sokongan, bukan memberi diagnosis atau ranking.</p></div>
      <div class="sgrid"><div class="card"><div class="lbl hint" style="font-weight:700;font-size:18px">Sasaran pembelajaran</div>
        <div class="big-t" style="font-size:25px;margin:22px 0 26px">Memadankan foto dengan perkataan sasaran</div>
        <div class="hint" style="font-weight:700;font-size:17px">Perkataan dicuba</div>
        <div class="mini">${words.length ? words.map(id => `<div>${icon(id, id === 'pensel' ? 14 : 44)}${W(id).bm}</div>`).join('') : '<span class="hint">Belum ada perkataan dicuba.</span>'}</div></div>
      <div class="card"><div class="hint" style="font-weight:700;font-size:18px">Sokongan digunakan</div>
        <div class="sup">${['Ulang', 'Bantu', 'Rehat', 'Henti'].map(s => `<div><span class="dot ${S.log.supports.has(s) ? 'on' : ''}">${S.log.supports.has(s) ? '<svg width="14" viewBox="0 0 20 20"><path d="M4 10 l4 4 l8 -9" stroke="#fff" stroke-width="3" fill="none"/></svg>' : ''}</span>${s}</div>`).join('')}</div>
        <textarea class="note" rows="2" placeholder="Guru boleh tambah nota pemerhatian."></textarea></div></div>
      <div style="display:flex;justify-content:flex-end;margin:34px 24px 0"><button class="btn" id="close" style="min-width:330px;font-size:18px;padding:14px">Tutup ringkasan</button></div>`;
    $('#close').onclick = () => go('setup');
  },
};

// ---------- photo + matching ----------
async function takePhoto() {
  const btn = $('#snap'); btn.disabled = true; btn.textContent = 'Sedang melihat…';
  const video = $('#video');
  let canvas = null;
  if (video && video.videoWidth) {
    canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    S.snap = canvas.toDataURL('image/jpeg', 0.8); // kept in memory only
  }
  stopCam();
  let best = null;
  if (S.demo || !canvas) {
    best = S.demoUnsure ? null : (S.selected.has('pensel') ? 'pensel' : [...S.selected][0]);
    S.demoUnsure = false;
    await new Promise(r => setTimeout(r, 700));
  } else {
    if (!S.model && S.modelState !== 'failed') await loadModel();
    if (S.model) {
      const preds = await S.model.classify(canvas, 5);
      let top = 0;
      for (const w of WORDS) {
        if (!S.selected.has(w.id)) continue; // closed word set: only the teacher's words
        const score = preds.filter(p => w.match.test(p.className)).reduce((a, p) => a + p.probability, 0);
        if (score > top) { top = score; best = w.id; }
      }
      if (top < 0.15) best = null; // not confident → never guess
    }
  }
  best ? go('confirm', best) : go('choose');
}

// ---------- always-on controls ----------
function overlay(html, cls = '') {
  $('#sheet').className = 'sheet ' + cls; $('#sheet').innerHTML = html; $('#overlay').classList.remove('hidden');
}
function closeOverlay() { $('#overlay').classList.add('hidden'); }
const SAY = {
  mission: 'Cari satu objek. Lihat sekeliling dan pilih satu objek.',
  camera: 'Ambil gambar satu objek. Letakkan objek di dalam ruang.',
  confirm: () => `Adakah ini ${W(S.current).bm}?`,
  choose: 'Pilih perkataan yang paling sesuai.',
  listen: () => W(S.current).bm,
  done: 'Bagus. Sesi sudah selesai.',
};
document.querySelectorAll('[data-ctl]').forEach(b => b.onclick = () => {
  const c = b.dataset.ctl;
  if (c !== 'pilihan') S.log.supports.add(c[0].toUpperCase() + c.slice(1));
  if (c === 'ulang') { const s = SAY[S.screen]; speak(typeof s === 'function' ? s() : s); }
  if (c === 'bantu') {
    overlay(`<div style="font-size:52px">🙋</div><h2>Cikgu sudah dimaklumkan</h2><p>Tunggu sebentar. Cikgu akan datang membantu anda.</p><button class="btn" id="ok">OK</button>`);
    speak('Cikgu sudah dimaklumkan.'); $('#ok').onclick = closeOverlay;
  }
  if (c === 'rehat') {
    overlay(`<div class="breath">🌿</div><h2>Masa rehat</h2><p>Tarik nafas perlahan-lahan.<br>Tiada had masa. Kembali bila anda sedia.</p><button class="btn" id="back">Kembali</button>`, 'rest');
    speechSynthesis?.cancel(); $('#back').onclick = closeOverlay;
  }
  if (c === 'henti') {
    overlay(`<h2>Mahu berhenti?</h2><p>Tidak mengapa. Anda boleh sambung lain kali.</p>
      <div class="yesno" style="margin-top:10px"><button class="btn" id="stop">Ya, berhenti</button><button class="btn ghost" id="cont">Teruskan</button></div>`);
    $('#stop').onclick = () => { closeOverlay(); go('summary'); }; $('#cont').onclick = closeOverlay;
  }
  if (c === 'pilihan') {
    const row = (k, t) => `<div class="setrow"><span>${t}</span><button class="toggle ${S.settings[k] ? 'on' : ''}" data-k="${k}"></button></div>`;
    overlay(`<h2>Pilihan anda</h2>${row('sound', 'Bunyi / suara')}${row('big', 'Teks besar')}${row('calm', 'Kurangkan animasi')}<button class="btn" id="ok">Siap</button>`);
    document.querySelectorAll('.toggle').forEach(t => t.onclick = () => {
      const k = t.dataset.k; S.settings[k] = !S.settings[k]; t.classList.toggle('on', S.settings[k]); applySettings();
    });
    $('#ok').onclick = closeOverlay;
  }
});
function applySettings() {
  document.body.classList.toggle('big', S.settings.big);
  document.body.classList.toggle('calm', S.settings.calm);
  try { localStorage.setItem('kk-settings', JSON.stringify(S.settings)); } catch (e) {}
}
$('#chip').onclick = () => { if (!['setup', 'summary'].includes(S.screen)) go('summary'); };

// ---------- demo keys (for reliable video recording) ----------
// D = toggle demo mode (camera replaced by illustration, snap always suggests "Pensel")
// U = make the NEXT snap return "Saya belum pasti" (to show the fallback)
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'd' || e.key === 'D') { S.demo = !S.demo; $('#demoBadge').classList.toggle('hidden', !S.demo); if (S.screen === 'camera') go('camera'); }
  if (e.key === 'u' || e.key === 'U') { S.demoUnsure = true; $('#demoBadge').textContent = S.demo ? 'DEMO · TAK PASTI' : 'TAK PASTI'; $('#demoBadge').classList.remove('hidden'); }
});
$('#demoBadge').classList.toggle('hidden', !S.demo);
if (qs.has('nobadge')) $('#demoBadge').style.display = 'none';

applySettings();
go('setup');
