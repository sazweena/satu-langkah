/* Kawan Kata v3: kids' app with Cil si Kancil.
   Flow: splash → who is learning → Pulau Kata map → mission → camera → confirm / not sure →
   game 1 "Dengar & Pilih" → game 2 "Bina Perkataan" → Hebat! (stars + sticker) → map.
   Teacher area (hold-to-enter): Mod Kelas / Mod Latihan, words, settings, pupil summaries, paper cards.
   Photos stay in memory only (never uploaded or saved); recognition runs on the device (TensorFlow.js MobileNet). */

// ---------- content ----------
const WORDS = [
  { id: 'pensel', bm: 'Pensel', syl: ['pen', 'sel'], hint: 'benda yang kamu guna untuk menulis', match: /pencil|ballpoint|fountain pen/i },
  { id: 'buku', bm: 'Buku', syl: ['bu', 'ku'], hint: 'benda yang kamu baca', match: /book jacket|comic book|binder/i },
  { id: 'pemadam', bm: 'Pemadam', syl: ['pe', 'ma', 'dam'], hint: 'benda untuk memadam tulisan', match: /eraser/i },
  { id: 'bola', bm: 'Bola', syl: ['bo', 'la'], hint: 'benda bulat untuk bermain', match: /\bball\b|basketball|volleyball/i },
  { id: 'cawan', bm: 'Cawan', syl: ['ca', 'wan'], hint: 'benda untuk minum air', match: /\bcup\b|mug/i },
];
const STICKERS = [['🐢', 'Penyu'], ['🌺', 'Bunga raya'], ['🦋', 'Rama-rama'], ['🚀', 'Roket'], ['🌈', 'Pelangi'], ['🍉', 'Tembikai'], ['🐘', 'Gajah'], ['🐠', 'Ikan'], ['⭐', 'Bintang']];
const PUPILS = [{ id: 'Murid 01', face: '🐯', bg: '#ffe6e1' }, { id: 'Murid 02', face: '🐼', bg: '#e6f3ff' }, { id: 'Murid 03', face: '🐸', bg: '#dff5ef' }, { id: 'Murid 04', face: '🐨', bg: '#fff3cf' }];
const REWARDS = { pelekat: ['⭐', 'Pelekat'], rehat: ['🌿', 'Rehat'], lagu: ['🎵', 'Lagu'] };
const W = id => WORDS.find(w => w.id === id);

// ---------- state ----------
const qs = new URLSearchParams(location.search);
const S = {
  screen: 'splash', arg: null, pupil: PUPILS[0].id, current: null, snap: null, reward: 'pelekat',
  selected: new Set(WORDS.map(w => w.id)),
  teacher: { mode: 'kelas', voice: true, stickers: true, firstThen: true, breakTimer: true, build: true },
  settings: { big: false, contrast: false, calm: false },
  P: {}, demo: qs.has('demo'), demoUnsure: false, model: null, modelState: 'idle', stream: null, ret: null,
};
try { Object.assign(S.settings, JSON.parse(localStorage.getItem('kk3-settings') || '{}')); } catch (e) {}
const P = (id = S.pupil) => (S.P[id] ||= { stars: {}, stickers: [], start: Date.now(), words: {}, supports: { Ulang: 0, Bantu: 0, Rehat: 0, Henti: 0 }, note: '' });
const wl = id => (P().words[id] ||= { tries: 0, helps: 0 });
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const scr = $('#screen');
const face = p => { const x = PUPILS.find(q => q.id === p); return `<span class="f" style="background:${x.bg}">${x.face}</span>`; };

// ---------- sound ----------
function speak(text) {
  if (!S.teacher.voice || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const vs = speechSynthesis.getVoices();
  const v = vs.find(v => /^ms/i.test(v.lang)) || vs.find(v => /^id/i.test(v.lang));
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ms-MY';
  u.rate = 0.8; u.pitch = 1.1;
  speechSynthesis.speak(u);
}
let actx;
function chime(notes = [660, 880]) {
  if (!S.teacher.voice) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.17;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.4);
    });
  } catch (e) {}
}
const song = () => chime([523, 587, 659, 523, 659, 784, 659]);

// ---------- art helpers ----------
function pic(id) {
  const w = W(id);
  if (w.img) return `<img src="${w.img}" alt="">`;
  if (!ART.OBJ[id]) return `<span class="lt">${w.bm[0]}</span>`;
  return ART.OBJ[id];
}
const cil = (pose, size, cls = 'bob') => `<span class="${cls}" style="display:inline-flex">${ART.cil(pose, size)}</span>`;
function bubble(pose, size, text, sayText) {
  return `<div class="cilrow">${cil(pose, size)}<div class="bubble"><button class="sayin" data-say="${(sayText || text).replace(/"/g, '&quot;')}" aria-label="Dengar">🔊</button>${text}</div></div>`;
}

// ---------- shell pieces ----------
function topnav(step, sayText) {
  const seg = [0, 1, 2].map(i => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('');
  return `<div class="topnav"><button class="iconbtn" id="xmap" aria-label="Kembali ke peta">✕</button>
    <div class="progress" aria-label="Langkah ${step + 1} daripada 3">${seg}</div>
    <button class="iconbtn say" id="sayTop" aria-label="Dengar arahan" data-say="${sayText}">🔊</button></div>`;
}
const supportBar = () => `<nav class="support" aria-label="Butang sokongan">
  <button class="sbtn u" data-sup="Ulang" aria-label="Ulang arahan"><span>🔁</span>Ulang</button>
  <button class="sbtn b" data-sup="Bantu" aria-label="Minta bantuan cikgu"><span>🙋</span>Bantu</button>
  <button class="sbtn r" data-sup="Rehat" aria-label="Rehat"><span>🌿</span>Rehat</button>
  <button class="sbtn h" data-sup="Henti" aria-label="Berhenti"><span>✋</span>Henti</button></nav>`;
const tabbar = on => `<nav class="tabbar" aria-label="Menu">
  ${[['map', '🗺️', 'Peta'], ['stickers', '⭐', 'Pelekat'], ['rest', '🌿', 'Rehat'], ['settings', '⚙️', 'Tetapan']].map(([k, i, t]) =>
    `<button class="tab ${on === k ? 'on' : ''}" data-tab="${k}" aria-current="${on === k}"><span>${i}</span>${t}</button>`).join('')}</nav>`;

function wire() {
  $$('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); speak(b.dataset.say); });
  $('#xmap') && ($('#xmap').onclick = () => go('map'));
  $$('[data-tab]').forEach(b => b.onclick = () => b.dataset.tab === 'rest' ? goRest() : go(b.dataset.tab));
  $$('[data-sup]').forEach(b => b.onclick = () => support(b.dataset.sup));
}
function stopCam() { if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; } }
function go(name, arg) {
  if (name !== 'camera') stopCam();
  S.screen = name; S.arg = arg;
  closeSheet(true);
  SCREENS[name](arg);
  wire();
  const f = scr.querySelector('.scroll,.map'); if (f) f.scrollTop = 0;
}
const nextWord = () => WORDS.find(w => S.selected.has(w.id) && !P().stars[w.id]);

// ---------- screens ----------
const SCREENS = {
  splash() {
    scr.innerHTML = `<div class="splash">${cil('wave', 190)}
      <div class="appname">Kawan Kata</div><div class="tagline">Satu objek. Satu perkataan.<br>Satu langkah pada satu masa.</div>
      <button class="btn" id="go">Jom mula! 🚀</button></div>`;
    $('#go').onclick = () => go('who');
    speak('Hai! Saya Cil. Jom belajar bersama!');
  },

  who() {
    scr.innerHTML = `<div class="topnav"><span style="font-weight:800;font-size:18px">👋 Hai!</span><button class="teacherbtn" id="cikgu">🍎 Cikgu</button></div>
      <div class="scroll">${bubble('talk', 110, 'Siapa yang belajar hari ini?')}
      <div class="avatars">${PUPILS.map(p => `<button class="av" data-p="${p.id}"><span class="face" style="background:${p.bg}">${p.face}</span>${p.id}<small>⭐ ${Object.values(P(p.id).stars).reduce((a, b) => a + b, 0)} bintang</small></button>`).join('')}</div>
      <p class="lead" style="text-align:center;margin-top:16px;font-size:14px">Kod murid sahaja, tiada nama penuh.</p></div>`;
    $$('.av').forEach(b => b.onclick = () => { S.pupil = b.dataset.p; P(); go('map'); });
    $('#cikgu').onclick = () => go('gate');
    speak('Siapa yang belajar hari ini?');
  },

  map() {
    const list = WORDS.filter(w => S.selected.has(w.id));
    const cur = nextWord();
    const total = Object.values(P().stars).reduce((a, b) => a + b, 0);
    const xs = [50, 74, 50, 26, 50, 74, 50, 26];
    const pts = list.map((w, i) => [xs[i % xs.length], 165 + i * 116]);
    const H = 165 + list.length * 116 + 40;
    const d = pts.map((p, i) => i ? `C ${pts[i - 1][0]} ${pts[i - 1][1] + 58}, ${p[0]} ${p[1] - 58}, ${p[0]} ${p[1]}` : `M ${p[0]} ${p[1]}`).join(' ');
    const ci = cur ? list.indexOf(cur) : -1;
    const banner = S.teacher.mode === 'kelas'
      ? `<div class="modebanner kelas">🏫 Mod Kelas · Giliran ${S.pupil}<button id="turn">Tukar giliran</button></div>`
      : `<div class="modebanner latihan">🏠 Mod Latihan · Ibu bapa, duduk bersama anak ±10 minit</div>`;
    scr.innerHTML = `<div class="mapbar"><span class="who">${face(S.pupil)}${S.pupil}</span><span class="stars">⭐ ${total}</span></div>${banner}
      <div class="map"><div class="mapinner" style="height:${H}px">
        <div class="zone">🏫 Pulau Kata · Bilik Darjah<small>${list.filter(w => P().stars[w.id]).length}/${list.length} perkataan</small></div>
        <svg class="mapsvg" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#e8dcc4" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 9" vector-effect="non-scaling-stroke" style="stroke-width:16px"/></svg>
        <span class="deco" style="left:6%;top:200px">🌳</span><span class="deco" style="right:6%;top:330px">🌼</span><span class="deco" style="left:8%;top:520px">✏️</span><span class="deco" style="right:8%;top:640px">🌳</span>
        ${list.map((w, i) => {
          const st = P().stars[w.id] ? 'done' : (i === ci ? 'cur' : 'lock');
          return `<button class="node ${st}" style="left:${pts[i][0]}%;top:${pts[i][1]}px" data-w="${w.id}" aria-label="${w.bm}${st === 'done' ? ', selesai' : st === 'cur' ? ', seterusnya' : ', belum dibuka'}">${pic(w.id)}
            ${st === 'done' ? '<span class="st">⭐</span>' : st === 'lock' ? '<span class="lk">🔒</span>' : ''}<span class="badge">${st === 'lock' ? '?' : w.bm}</span></button>`;
        }).join('')}
        ${ci >= 0 ? `<div class="mapcil" style="left:calc(${pts[ci][0] > 50 ? pts[ci][0] - 46 : pts[ci][0] + 14}% );top:${pts[ci][1] - (pts[ci][0] > 50 ? 6 : 52)}px">${cil('talk', 74)}<span class="tip" style="top:-30px;left:0">Jom! ✨</span></div>` : ''}
        ${ci < 0 ? `<div class="mapcil" style="left:30%;top:${H - 150}px">${cil('celebrate', 100)}</div>` : ''}
      </div></div>${tabbar('map')}`;
    $$('.node').forEach(n => n.onclick = () => { if (!n.classList.contains('lock')) go('mission', n.dataset.w); else speak('Belum dibuka. Cuba perkataan yang bercahaya dahulu.'); });
    $('#turn') && ($('#turn').onclick = () => go('who'));
    speak(cur ? `Jom cari ${cur.bm.toLowerCase()}!` : 'Hebat! Semua perkataan sudah selesai.');
  },

  mission(id) {
    const w = W(id || (nextWord() || WORDS[0]).id); S.current = w.id; S.snap = null;
    const ft = S.teacher.firstThen;
    scr.innerHTML = topnav(0, `Misi: cari ${w.hint}.`) + `<div class="scroll">
      ${bubble('talk', 96, `Jom cari <b>${w.hint}</b>!`, `Jom cari ${w.hint}`)}
      <div class="sched" aria-label="Jadual langkah"><div class="on"><b>📷</b>Cari</div><div><b>👂</b>Dengar</div><div><b>⭐</b>Siap</div></div>
      <div class="missioncard"><span class="hint">Misi hari ini</span><div class="q">Cari ${w.hint} 🔍</div><p class="lead" style="margin:2px 0 0">Tiada had masa. Ambil masa anda.</p>
      ${ft ? `<div class="ft"><div><small>MULA</small>📷 Cari objek</div><div class="ar">➜</div><div><small>KEMUDIAN</small><span id="ftThen">${REWARDS[S.reward][0]} ${REWARDS[S.reward][1]}</span></div></div>
        <div class="rewards" role="group" aria-label="Saya usaha untuk">${Object.entries(REWARDS).map(([k, r]) => `<button class="rw ${S.reward === k ? 'sel' : ''}" data-r="${k}"><span>${r[0]}</span>${r[1]}</button>`).join('')}</div>` : ''}
      </div><button class="btn" id="mula">📷 Mula</button></div>${supportBar()}`;
    $$('.rw').forEach(b => b.onclick = () => { S.reward = b.dataset.r; $$('.rw').forEach(x => x.classList.toggle('sel', x === b)); $('#ftThen').textContent = REWARDS[S.reward].join(' '); speak('Saya usaha untuk ' + REWARDS[S.reward][1]); });
    $('#mula').onclick = () => go('camera');
    speak(`Jom cari ${w.hint}!`);
  },

  async camera() {
    scr.innerHTML = `<div class="camwrap"><div class="camtop"><button class="iconbtn" id="xmap" aria-label="Kembali ke peta">✕</button><div class="pill" id="campill">Halakan kamera ke objek</div>
      <button class="iconbtn" data-say="Halakan kamera ke objek, kemudian tekan butang bulat." aria-label="Dengar arahan">🔊</button></div>
      <div class="viewfinder" id="vf"><div class="fake" id="fake">${ART.OBJ[S.current] || ART.OBJ.pensel}</div><div class="vf"></div><span class="peek">${ART.cil('happy', 92)}</span></div>
      <div class="camctl"><button class="camside" id="upl">🖼️ Muat naik</button><button class="shutter" id="snap" aria-label="Ambil gambar"><i>📷</i></button><span class="camnote" style="padding:0">Tiada kilat ✨</span></div>
      <div class="camnote">Gambar tidak disimpan · hanya dipadankan dengan perkataan cikgu</div></div>${supportBar()}`;
    $('#snap').onclick = takePhoto;
    $('#upl').onclick = () => { const f = $('#filepick'); f.value = ''; f.removeAttribute('capture'); f.onchange = () => f.files[0] && fromFile(f.files[0]); f.click(); };
    wire(); loadModel(); speak('Halakan kamera ke objek.');
    if (!S.demo && navigator.mediaDevices?.getUserMedia) {
      try {
        S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (S.screen !== 'camera') return stopCam();
        const v = document.createElement('video');
        Object.assign(v, { autoplay: true, playsInline: true, muted: true, srcObject: S.stream, id: 'video' });
        $('#fake').replaceWith(v);
      } catch (e) { /* no camera: illustration stays; upload or demo still works */ }
    }
  },

  confirm(id) {
    const w = W(id); S.current = id;
    scr.innerHTML = topnav(0, `Adakah ini ${w.bm}?`) + `<div class="scroll">
      <div class="title" style="text-align:center">Adakah ini ${w.bm.toLowerCase()}?</div>
      <div class="polaroid"><div class="ph">${S.snap ? `<img src="${S.snap}" alt="Gambar anda">` : pic(id)}</div><small>Gambar anda 📸</small></div>
      <div class="maybe">${ART.cil('think', 54)}<div><small>CIL RASA MUNGKIN…</small><b>${w.bm}</b></div><button class="iconbtn" data-say="${w.bm}" aria-label="Dengar ${w.bm}">🔊</button></div>
      <div class="row2"><button class="btn" id="yes">👍 Ya, betul!</button><button class="btn white" id="no">🤔 Tak pasti</button></div>
      <p class="lead" style="text-align:center;margin-top:12px;font-size:14px">Kamu yang tentukan. <button class="link" id="retake" style="padding:0 4px">📷 Ambil semula</button></p></div>${supportBar()}`;
    $('#yes').onclick = () => go('listen', id);
    $('#no').onclick = () => go('choose');
    $('#retake').onclick = () => go('camera');
    speak(`Adakah ini ${w.bm}? Kamu yang tentukan.`);
  },

  choose() {
    const list = WORDS.filter(w => S.selected.has(w.id));
    scr.innerHTML = topnav(0, 'Saya belum pasti. Pilih gambar yang sama dengan objek kamu.') + `<div class="scroll">
      ${bubble('think', 88, 'Hmm… Cil belum pasti. Yang mana satu objek kamu?', 'Saya belum pasti. Pilih gambar yang sama dengan objek kamu.')}
      <div class="title" style="font-size:22px;margin-top:-4px">Saya belum pasti.</div>
      <div class="grid2">${list.map(w => `<div class="pcard" role="button" tabindex="0" data-w="${w.id}" aria-label="${w.bm}"><button class="say" data-say="${w.bm}" aria-label="Dengar ${w.bm}">🔊</button><div class="pic">${pic(w.id)}</div>${w.bm}</div>`).join('')}</div>
      <button class="btn white sm" id="again" style="margin-top:16px">📷 Ambil gambar semula</button></div>${supportBar()}`;
    $$('.grid2 .pcard').forEach(c => {
      const pick = () => go('listen', c.dataset.w);
      c.onclick = pick; c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    });
    $('#again').onclick = () => go('camera');
    speak('Saya belum pasti. Pilih gambar yang sama dengan objek kamu.');
  },

  listen(id) {
    const w = W(id); S.current = id; wl(id);
    const pool = WORDS.filter(x => x.id !== id);
    const others = pool.filter(x => S.selected.has(x.id)).concat(pool.filter(x => !S.selected.has(x.id))).slice(0, 2);
    const opts = [w, ...others].sort(() => Math.random() - 0.5);
    scr.innerHTML = topnav(1, `Dengar dan pilih. ${w.bm}.`) + `<div class="scroll">
      <div class="sched"><div class="done"><b>📷</b>Cari ✓</div><div class="on"><b>👂</b>Dengar</div><div><b>⭐</b>Siap</div></div>
      <div class="title">🎧 Dengar & Pilih</div><p class="lead">Dengar perkataan, kemudian pilih gambar yang sama.</p>
      <button class="bigword" id="hear" aria-label="Dengar perkataan">🔊 ${w.bm}</button>
      <div class="cards3">${opts.map(o => `<button class="pcard" data-w="${o.id}"><div class="pic">${pic(o.id)}</div>${o.bm}</button>`).join('')}</div>
      <div class="feedback" id="fb" aria-live="polite"></div></div>${supportBar()}`;
    $('#hear').onclick = () => speak(w.bm);
    $$('.cards3 .pcard').forEach(b => b.onclick = () => {
      $$('.cards3 .pcard').forEach(x => x.classList.remove('try'));
      wl(id).tries++;
      if (b.dataset.w === id) {
        b.classList.add('right'); $('#fb').className = 'feedback ok'; $('#fb').textContent = `Betul! ${w.bm} 🎉`; chime(); speak(`Betul! ${w.bm}.`);
        setTimeout(() => S.screen === 'listen' && go(S.teacher.build && w.syl ? 'build' : 'reward', id), 1400);
      } else {
        b.classList.add('try'); $('#fb').className = 'feedback'; $('#fb').textContent = 'Tidak mengapa! Dengar sekali lagi 👂'; speak(w.bm);
      }
    });
    setTimeout(() => speak(w.bm), 350);
  },

  build(id) {
    const w = W(id); const order = w.syl; let k = 0;
    const tiles = order.map((s, i) => ({ s, i })).sort(() => Math.random() - 0.5);
    if (tiles.every((t, j) => t.i === j) && tiles.length > 1) tiles.reverse();
    scr.innerHTML = topnav(2, `Bina perkataan ${w.bm}. Tekan suku kata mengikut urutan.`) + `<div class="scroll">
      <div class="sched"><div class="done"><b>📷</b>Cari ✓</div><div class="done"><b>👂</b>Dengar ✓</div><div class="on"><b>🧩</b>Bina</div></div>
      <div class="title">🧩 Bina Perkataan</div><p class="lead">Tekan suku kata mengikut urutan.</p>
      <div style="display:flex;justify-content:center;margin:2px 0 6px"><div class="pcard" style="width:130px;min-height:0;padding:8px"><div class="pic">${pic(id)}</div></div></div>
      <div class="slots">${order.map(() => `<div class="slot"></div>`).join('')}</div>
      <div class="tiles">${tiles.map(t => `<button class="tile" data-i="${t.i}">${t.s}</button>`).join('')}</div>
      <div class="feedback" id="fb" aria-live="polite"></div></div>${supportBar()}`;
    $$('.tile').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      speak(order[i]);
      if (i === k) {
        const slot = $$('.slot')[k]; slot.textContent = order[i]; slot.classList.add('fill'); b.classList.add('used'); k++;
        if (k === order.length) { $('#fb').className = 'feedback ok'; $('#fb').textContent = `${order.join(' + ')} = ${w.bm}! 🎉`; chime([523, 659, 784]); setTimeout(() => speak(w.bm), 500); setTimeout(() => S.screen === 'build' && go('reward', id), 1700); }
      } else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); $('#fb').className = 'feedback'; $('#fb').textContent = `Cuba cari "${order[k]}" 🙂`; }
    });
    speak(`Bina perkataan ${w.bm}.`);
  },

  reward(id) {
    const w = W(id); S.snap = null;
    const n = S.teacher.build && w.syl ? 3 : 2;
    const first = !P().stars[id];
    P().stars[id] = Math.max(P().stars[id] || 0, n);
    let stk = null;
    if (S.teacher.stickers && S.reward === 'pelekat' && first && P().stickers.length < STICKERS.length) { stk = STICKERS[P().stickers.length]; P().stickers.push(stk); }
    scr.innerHTML = topnav(3, 'Hebat!') + `<div class="scroll reward">${cil('celebrate', 150)}
      <div class="title">Hebat! 🎉</div><p class="lead">Kamu belajar perkataan <b>${w.bm}</b>.</p>
      <div class="starrow">${[0, 1, 2].map(i => `<span class="${i < n ? 'got' : ''}">⭐</span>`).join('')}</div>
      ${stk ? `<div class="newsticker"><span class="stk">${stk[0]}</span>Pelekat baharu: ${stk[1]}!</div>` : ''}
      ${S.reward === 'rehat' && S.teacher.firstThen ? `<button class="btn sky sm" id="myrest" style="margin-bottom:12px">🌿 Masa rehat saya</button>` : ''}
      ${S.reward === 'lagu' && S.teacher.firstThen ? `<button class="btn sun sm" id="mysong" style="margin-bottom:12px">🎵 Main lagu saya</button>` : ''}
      <button class="btn" id="next">Seterusnya ➜</button>
      <p class="lead" style="margin-top:12px;font-size:14px">Tiada markah atau kelajuan dibandingkan.</p></div>`;
    $('#next').onclick = () => go('map');
    $('#myrest') && ($('#myrest').onclick = () => goRest());
    $('#mysong') && ($('#mysong').onclick = song);
    chime([523, 659, 784, 1046]);
    speak(stk ? `Hebat! Kamu dapat pelekat ${stk[1]}.` : 'Hebat!');
  },

  stickers() {
    const got = P().stickers;
    scr.innerHTML = `<div class="topnav"><span style="font-weight:800;font-size:22px">⭐ Buku Pelekat</span></div><div class="scroll">
      ${bubble('happy', 80, `Kamu ada <b>${got.length}</b> pelekat. Kumpul lagi!`, `Kamu ada ${got.length} pelekat.`)}
      <div class="book">${STICKERS.map((s, i) => `<div><div class="stk ${i < got.length ? '' : 'lockd'}">${i < got.length ? s[0] : '?'}</div><small>${i < got.length ? s[1] : '???'}</small></div>`).join('')}</div></div>${tabbar('stickers')}`;
    speak(`Kamu ada ${got.length} pelekat.`);
  },

  rest() {
    const t = S.teacher.breakTimer;
    scr.innerHTML = `<div class="restwrap">${cil('rest', 130)}
      <div class="breathe" style="margin-top:-20px"><span style="font-size:20px;font-weight:800;color:#3c7fb3">Tarik nafas…</span></div>
      <div class="title">Masa rehat 🌿</div><p class="lead">Berapa lama kamu mahu rehat?</p>
      <div class="restopts">${t ? `<button data-m="1"><span>🕐</span>1 minit</button><button data-m="2"><span>🕑</span>2 minit</button>` : ''}<button data-m="0" style="${t ? '' : 'grid-column:span 3'}"><span>🙂</span>Bila saya sedia</button></div>
      <button class="btn white sm" id="back">↩ Kembali</button></div>`;
    $('#back').onclick = restBack;
    $$('.restopts button').forEach(b => b.onclick = () => restTimer(+b.dataset.m));
    speechSynthesis?.cancel();
  },

  settings() {
    const row = (k, t, d) => `<div class="tg"><span>${t}<small>${d}</small></span><button class="toggle ${S.settings[k] ? 'on' : ''}" data-k="${k}" role="switch" aria-checked="${!!S.settings[k]}" aria-label="${t}"></button></div>`;
    scr.innerHTML = `<div class="topnav"><span style="font-weight:800;font-size:22px">⚙️ Tetapan saya</span></div><div class="scroll">
      <div class="tsec"><div class="tg"><span>🔊 Suara Cil<small>Arahan dibacakan dengan perlahan</small></span><button class="toggle ${S.teacher.voice ? 'on' : ''}" id="tv" role="switch" aria-checked="${S.teacher.voice}" aria-label="Suara"></button></div>
      ${row('big', '🔠 Teks besar', 'Huruf lebih besar')}${row('contrast', '◐ Kontras tinggi', 'Warna lebih jelas')}${row('calm', '🍃 Kurangkan animasi', 'Tiada gerakan')}</div>
      <button class="btn white sm" id="sw">🔄 Tukar murid</button><div style="height:12px"></div>
      <button class="btn sky sm" id="tc">🍎 Paparan Cikgu</button></div>${tabbar('settings')}`;
    $$('.toggle[data-k]').forEach(t => t.onclick = () => { const k = t.dataset.k; S.settings[k] = !S.settings[k]; t.classList.toggle('on'); t.setAttribute('aria-checked', S.settings[k]); applySettings(); });
    $('#tv').onclick = e => { S.teacher.voice = !S.teacher.voice; e.currentTarget.classList.toggle('on'); };
    $('#sw').onclick = () => go('who'); $('#tc').onclick = () => go('gate');
  },

  gate() {
    scr.innerHTML = `<div class="topnav"><button class="iconbtn" id="bk" aria-label="Kembali">←</button><span style="font-weight:800;font-size:20px">Untuk cikgu & ibu bapa</span></div>
      <div class="scroll" style="text-align:center">${cil('happy', 110)}<div class="title">Ruang dewasa 🍎</div>
      <p class="lead">Tekan dan tahan butang selama 2 saat untuk masuk.</p>
      <button class="btn sky hold" id="hold">✋ Tekan & tahan</button></div>`;
    $('#bk').onclick = () => go('who');
    const h = $('#hold'); let t;
    const start = e => { e.preventDefault(); h.classList.add('go'); t = setTimeout(() => go('teacher'), 2000); };
    const stop = () => { h.classList.remove('go'); clearTimeout(t); };
    h.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h.addEventListener(ev, stop));
    h.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    h.addEventListener('keyup', stop);
  },

  teacher() {
    const T = S.teacher;
    const tg = (k, t, d) => `<div class="tg"><span>${t}<small>${d}</small></span><button class="toggle ${T[k] ? 'on' : ''}" data-t="${k}" role="switch" aria-checked="${T[k]}" aria-label="${t}"></button></div>`;
    scr.innerHTML = `<div class="topnav"><button class="iconbtn" id="bk" aria-label="Keluar">←</button><span style="font-weight:800;font-size:21px">🍎 Paparan Cikgu</span></div><div class="scroll">
      <div class="tsec"><h3>Cara guna</h3><div class="modes">
        <button class="mode ${T.mode === 'kelas' ? 'sel' : ''}" data-m="kelas"><span>🏫</span><b>Mod Kelas</b><small>Semasa PdP. Satu tablet sekolah, murid bergilir; cikgu di sisi.</small></button>
        <button class="mode ${T.mode === 'latihan' ? 'sel' : ''}" data-m="latihan"><span>🏠</span><b>Mod Latihan</b><small>Latihan di rumah dengan telefon ibu bapa. Perkataan sama seperti di kelas.</small></button></div></div>
      <div class="tsec"><h3>Murid & kemajuan</h3>${PUPILS.map(p => {
        const x = P(p.id), done = WORDS.filter(w => x.stars[w.id]);
        const sup = Object.entries(x.supports).filter(([, n]) => n);
        return `<button class="pupilrow" data-p="${p.id}" style="width:100%;text-align:left">${face(p.id).replace('class="f"', 'class="f"')}<span><b>${p.id}</b><small>${done.length ? done.map(w => w.bm).join(', ') : 'Belum mula'}${sup.length ? ' · Sokongan: ' + sup.map(([k, n]) => k + ' ' + n + '×').join(', ') : ''}</small></span><span class="s">⭐ ${Object.values(x.stars).reduce((a, b) => a + b, 0)} ›</span></button>`;
      }).join('')}</div>
      <div class="tsec"><h3>Perkataan sesi (KSSR BM Tahun 1–3)</h3><div class="grid2">${WORDS.map(w => `<button class="pcard ${S.selected.has(w.id) ? 'sel' : 'off'}" data-w="${w.id}" aria-pressed="${S.selected.has(w.id)}" style="min-height:104px"><span class="tick"></span><div class="pic" style="height:60px">${pic(w.id)}</div>${w.bm}</button>`).join('')}
        <button class="pcard add" id="addw" style="min-height:104px"><span class="plus">+</span>Tambah perkataan</button></div></div>
      <div class="tsec"><h3>Tetapan</h3>${tg('voice', '🔊 Suara', 'Cil membaca arahan')}${tg('build', '🧩 Bina Perkataan', 'Permainan suku kata selepas Dengar & Pilih')}${tg('firstThen', '➜ Mula → Kemudian', 'Murid pilih ganjaran sebelum mula')}${tg('stickers', '⭐ Pelekat', 'Kumpul pelekat dalam buku')}${tg('breakTimer', '🌿 Pemasa rehat', 'Pilihan 1 atau 2 minit')}</div>
      <button class="btn sun sm" id="print">🖨️ Cetak kad kertas</button>
      <p class="lead" style="font-size:13px;text-align:center;margin-top:12px">Gambar tidak disimpan. Rekod ialah sokongan, bukan diagnosis atau ranking.</p></div>`;
    $('#bk').onclick = () => go('who');
    $$('.mode').forEach(b => b.onclick = () => { T.mode = b.dataset.m; go('teacher'); });
    $$('.toggle[data-t]').forEach(t => t.onclick = () => { const k = t.dataset.t; T[k] = !T[k]; t.classList.toggle('on', T[k]); t.setAttribute('aria-checked', T[k]); });
    $$('.tsec .grid2 .pcard[data-w]').forEach(c => c.onclick = () => { const id = c.dataset.w; if (S.selected.has(id)) { if (S.selected.size > 2) S.selected.delete(id); } else S.selected.add(id); go('teacher'); });
    $$('.pupilrow').forEach(r => r.onclick = () => pupilSheet(r.dataset.p));
    $('#addw').onclick = addWordSheet;
    $('#print').onclick = printPaper;
  },
};

// ---------- support buttons ----------
const SAY = {
  mission: () => `Jom cari ${W(S.current).hint}.`, camera: 'Halakan kamera ke objek, kemudian tekan butang bulat.',
  confirm: () => `Adakah ini ${W(S.current).bm}?`, choose: 'Pilih gambar yang sama dengan objek kamu.',
  listen: () => W(S.current).bm, build: () => `Bina perkataan ${W(S.current).bm}.`,
};
function support(k) {
  P().supports[k]++;
  if (S.current && k === 'Bantu') wl(S.current).helps++;
  if (k === 'Ulang') { const s = SAY[S.screen]; s && speak(typeof s === 'function' ? s() : s); }
  if (k === 'Bantu') { sheet(`<div class="grab"></div>${ART.cil('wave', 100)}<h2>Cikgu sudah dimaklumkan 🙋</h2><p>Tunggu sebentar. Cikgu akan datang membantu kamu.</p><button class="btn" id="ok">OK</button>`); speak('Cikgu sudah dimaklumkan.'); $('#ok').onclick = () => closeSheet(); }
  if (k === 'Rehat') goRest();
  if (k === 'Henti') { sheet(`<div class="grab"></div>${ART.cil('happy', 90)}<h2>Mahu berhenti?</h2><p>Tidak mengapa. Kamu boleh sambung lain kali.</p><div class="row2"><button class="btn" id="stop">Ya, berhenti</button><button class="btn white" id="cont">Teruskan</button></div>`); $('#stop').onclick = () => go('map'); $('#cont').onclick = () => closeSheet(); }
}
function goRest() { S.ret = [S.screen, S.arg]; if (S.screen === 'rest') return; stopCam(); S.screen = 'rest'; SCREENS.rest(); wire(); }
function restBack() { clearInterval(restTimer.t); const [n, a] = S.ret || ['map']; go(['rest', 'camera'].includes(n) ? (n === 'camera' ? 'camera' : 'map') : n, a); }
function restTimer(m) {
  if (!m) { scr.querySelector('.restopts').outerHTML = `<p class="lead" style="font-weight:800">Tiada had masa. Kembali bila kamu sedia 🙂</p>`; return; }
  const total = m * 60, C = 2 * Math.PI * 86; let left = total;
  scr.innerHTML = `<div class="restwrap"><div class="title">Masa rehat 🌿</div>
    <div class="ring"><svg class="r" width="200" height="200" aria-hidden="true"><circle cx="100" cy="100" r="86" fill="none" stroke="#d6e8f5" stroke-width="16"/><circle id="rg" cx="100" cy="100" r="86" fill="none" stroke="#8ecbff" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
    <div class="in">${ART.cil('rest', 104)}</div></div>
    <p class="lead" id="rt">Rehat ${m} minit. Kamu boleh kembali bila-bila masa.</p><button class="btn white sm" id="back">↩ Kembali</button></div>`;
  $('#back').onclick = restBack;
  clearInterval(restTimer.t);
  restTimer.t = setInterval(() => {
    left--; const rg = $('#rg'); if (!rg) return clearInterval(restTimer.t);
    rg.setAttribute('stroke-dashoffset', String(C * (1 - left / total)));
    if (left <= 0) { clearInterval(restTimer.t); $('#rt').textContent = 'Masa rehat tamat. Kembali bila kamu sedia 🙂'; chime([523, 659]); }
  }, 1000);
}

// ---------- sheets ----------
function sheet(html) { $('#sheet').innerHTML = html; $('#overlay').classList.remove('hidden'); const f = $('#sheet').querySelector('button,input'); f && f.focus(); }
function closeSheet(silent) { $('#overlay').classList.add('hidden'); }
$('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
function pupilSheet(id) {
  const x = P(id), ids = Object.keys(x.words);
  const mins = Math.max(1, Math.round((Date.now() - x.start) / 60000));
  sheet(`<div class="grab"></div><h2>${face(id)} ${id}</h2><p>Sesi: Objek harian · ${mins} minit · Mod ${S.teacher.mode === 'kelas' ? 'Kelas' : 'Latihan'}</p>
    <div class="tsec" style="text-align:left"><h3>Perkataan dicuba</h3>${ids.length ? ids.map(w => `<div class="tg"><span>${W(w).bm}<small>Cubaan: ${x.words[w].tries} · Bantuan: ${x.words[w].helps}</small></span><span>${'⭐'.repeat(x.stars[w] || 0) || '…'}</span></div>`).join('') : '<p class="lead">Belum ada perkataan dicuba.</p>'}</div>
    <div class="tsec" style="text-align:left"><h3>Sokongan digunakan</h3><div class="chips">${Object.entries(x.supports).map(([k, n]) => `<span class="${n ? '' : 'z'}">${k} ${n}×</span>`).join('')}</div>
    <textarea class="note" rows="2" placeholder="Nota pemerhatian cikgu" aria-label="Nota cikgu">${x.note}</textarea></div>
    <p class="lead" style="font-size:13px">Rekod sokongan, bukan diagnosis atau ranking.</p><button class="btn" id="ok">Tutup</button>`);
  $('#sheet textarea').oninput = e => x.note = e.target.value;
  $('#ok').onclick = () => closeSheet();
}
function addWordSheet() {
  let img = null;
  sheet(`<div class="grab"></div><h2>Tambah perkataan</h2><p>Gunakan foto objek sebenar di kelas anda.</p>
    <div class="field"><label for="nw">Perkataan (BM)</label><input id="nw" type="text" maxlength="20" placeholder="cth: Kerusi"></div>
    <div class="field"><label for="ns">Suku kata (pilihan)</label><input id="ns" type="text" maxlength="30" placeholder="cth: ke-ru-si"></div>
    <div class="field"><label>Foto</label><div class="preview" id="pv">Tiada foto lagi</div></div>
    <button class="btn white sm" id="pf">📷 Ambil / pilih foto</button><div style="height:12px"></div>
    <div class="row2"><button class="btn" id="sv">Simpan</button><button class="btn white" id="cx">Batal</button></div>`);
  $('#pf').onclick = () => { const f = $('#filepick'); f.value = ''; f.setAttribute('capture', 'environment');
    f.onchange = () => { const file = f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { img = r.result; $('#pv').innerHTML = `<img src="${img}" alt="">`; }; r.readAsDataURL(file); }; f.click(); };
  $('#cx').onclick = () => closeSheet();
  $('#sv').onclick = () => {
    const t = $('#nw').value.trim(); if (!t) return $('#nw').focus();
    const bm = t[0].toUpperCase() + t.slice(1).toLowerCase();
    const syl = $('#ns').value.trim() ? $('#ns').value.trim().toLowerCase().split(/[-·\s]+/).filter(Boolean) : null;
    const id = 'c' + Date.now();
    WORDS.push({ id, bm, syl, hint: bm.toLowerCase(), match: null, img });
    S.selected.add(id); go('teacher');
  };
}

// ---------- recognition (on-device, closed word set) ----------
async function loadModel() {
  if (S.model || S.modelState === 'loading' || !window.mobilenet || S.demo) return;
  S.modelState = 'loading';
  try { S.model = await mobilenet.load({ version: 2, alpha: 1.0 }); S.modelState = 'ready'; } catch (e) { S.modelState = 'failed'; }
}
async function route(canvas) {
  let best = null;
  if (S.demo || !canvas) {
    best = S.demoUnsure ? null : (S.selected.has(S.current) && W(S.current).match ? S.current : (S.selected.has('pensel') ? 'pensel' : null));
    S.demoUnsure = false; badge(); await new Promise(r => setTimeout(r, 800));
  } else {
    if (S.demoUnsure) { S.demoUnsure = false; badge(); return go('choose'); }
    if (!S.model && S.modelState !== 'failed') await loadModel();
    if (S.model) {
      const preds = await S.model.classify(canvas, 5); let top = 0;
      for (const w of WORDS) {
        if (!S.selected.has(w.id) || !w.match) continue;
        const sc = preds.filter(p => w.match.test(p.className)).reduce((a, p) => a + p.probability, 0);
        if (sc > top) { top = sc; best = w.id; }
      }
      if (top < 0.15) best = null; // not confident → never guess
    }
  }
  best ? go('confirm', best) : go('choose');
}
async function takePhoto() {
  const b = $('#snap'); b.disabled = true; $('#campill').textContent = 'Cil sedang melihat… 👀';
  const v = $('#video'); let c = null;
  if (v && v.videoWidth) { c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); S.snap = c.toDataURL('image/jpeg', .8); }
  stopCam(); route(c);
}
function fromFile(file) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'), k = Math.min(1, 900 / Math.max(img.width, img.height));
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    S.snap = c.toDataURL('image/jpeg', .8); URL.revokeObjectURL(img.src); stopCam();
    const d = S.demo; S.demo = false; route(c).finally(() => S.demo = d);
  };
  img.src = URL.createObjectURL(file);
}

// ---------- paper version ----------
function printPaper() {
  const list = WORDS.filter(w => S.selected.has(w.id));
  $('#print').innerHTML = `<h2>Kawan Kata · Kad perkataan (versi kertas)</h2><div class="pcards">${list.map(w => `<div class="pc">${w.img ? `<img src="${w.img}" alt="">` : (ART.OBJ[w.id] || '')}<b>${w.bm}</b></div>`).join('')}</div>`;
  window.print();
}

// ---------- settings + boot ----------
function applySettings() {
  ['big', 'contrast', 'calm'].forEach(k => document.body.classList.toggle(k, !!S.settings[k]));
  try { localStorage.setItem('kk3-settings', JSON.stringify(S.settings)); } catch (e) {}
}
function badge() {
  const b = $('#demoBadge');
  b.textContent = S.demoUnsure ? (S.demo ? 'DEMO · TAK PASTI' : 'TAK PASTI') : 'DEMO';
  b.classList.toggle('hidden', !(S.demo || S.demoUnsure) || qs.has('nobadge'));
}
// Demo keys for reliable recording: D = demo mode on/off; U = next photo returns "Saya belum pasti"
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'd' || e.key === 'D') { S.demo = !S.demo; badge(); if (S.screen === 'camera') go('camera'); }
  if (e.key === 'u' || e.key === 'U') { S.demoUnsure = true; badge(); }
});
if (qs.get('mode') === 'latihan') S.teacher.mode = 'latihan';
$('#sideicon').innerHTML = ART.iconSVG(92);
const tick = () => { const d = new Date(); $('#clock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
tick(); setInterval(tick, 30000);
badge(); applySettings(); go(qs.get('start') === 'map' ? 'map' : 'splash');
