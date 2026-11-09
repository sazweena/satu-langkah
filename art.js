/* Kawan Kata v3 artwork: original SVG drawings (Cil the Sang Kancil mascot, objects, icon). */
const ART = (() => {
  const OUT = '#5b3a22';
  const ears = `
    <path d="M58 58 C40 20 52 6 66 14 C78 22 80 44 74 60 Z" fill="#c4834a" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M62 50 C54 28 60 20 67 24 C73 29 73 42 70 52 Z" fill="#f4b9a3"/>
    <path d="M142 58 C160 20 148 6 134 14 C122 22 120 44 126 60 Z" fill="#c4834a" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M138 50 C146 28 140 20 133 24 C127 29 127 42 130 52 Z" fill="#f4b9a3"/>`;
  const body = (arms) => `
    <ellipse cx="100" cy="180" rx="46" ry="34" fill="#d4955a" stroke="${OUT}" stroke-width="4"/>
    <ellipse cx="100" cy="189" rx="27" ry="19" fill="#f8e2bf"/>
    <rect x="76" y="200" width="13" height="22" rx="6" fill="#b87a42" stroke="${OUT}" stroke-width="3.5"/>
    <rect x="111" y="200" width="13" height="22" rx="6" fill="#b87a42" stroke="${OUT}" stroke-width="3.5"/>
    ${arms === 'up'
      ? `<rect x="46" y="128" width="13" height="36" rx="6.5" transform="rotate(-28 52 160)" fill="#d4955a" stroke="${OUT}" stroke-width="3.5"/>
         <rect x="141" y="128" width="13" height="36" rx="6.5" transform="rotate(28 148 160)" fill="#d4955a" stroke="${OUT}" stroke-width="3.5"/>`
      : `<rect x="60" y="166" width="13" height="30" rx="6.5" transform="rotate(14 66 170)" fill="#d4955a" stroke="${OUT}" stroke-width="3.5"/>
         <rect x="127" y="166" width="13" height="30" rx="6.5" transform="rotate(-14 134 170)" fill="#d4955a" stroke="${OUT}" stroke-width="3.5"/>`}
    <path d="M70 156 L132 206" stroke="#1f8f7c" stroke-width="6" stroke-linecap="round"/>
    <rect x="118" y="190" width="30" height="24" rx="7" fill="#2bb39b" stroke="#1a7f6e" stroke-width="3.5"/>
    <circle cx="133" cy="200" r="3" fill="#ffd36b"/>`;
  const head = `
    <circle cx="100" cy="96" r="60" fill="#d9a066" stroke="${OUT}" stroke-width="4"/>
    <path d="M70 52 Q100 40 130 52 Q118 60 100 58 Q82 60 70 52Z" fill="#c4834a" opacity=".55"/>
    <ellipse cx="100" cy="122" rx="33" ry="23" fill="#f8e2bf"/>
    <ellipse cx="62" cy="112" rx="10" ry="6.5" fill="#f49d86" opacity=".55"/>
    <ellipse cx="138" cy="112" rx="10" ry="6.5" fill="#f49d86" opacity=".55"/>
    <ellipse cx="100" cy="108" rx="9" ry="6.5" fill="#3a271b"/>
    <ellipse cx="97" cy="106" rx="2.6" ry="1.6" fill="#fff" opacity=".7"/>`;
  const eyesOpen = (look = 0) => `
    <ellipse cx="76" cy="${88 + look}" rx="10.5" ry="12" fill="#2a1b12"/><circle cx="80" cy="${83 + look}" r="4" fill="#fff"/><circle cx="73" cy="${92 + look}" r="1.8" fill="#fff"/>
    <ellipse cx="124" cy="${88 + look}" rx="10.5" ry="12" fill="#2a1b12"/><circle cx="128" cy="${83 + look}" r="4" fill="#fff"/><circle cx="121" cy="${92 + look}" r="1.8" fill="#fff"/>`;
  const eyesClosed = `<path d="M66 90 Q76 98 86 90" stroke="#2a1b12" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M114 90 Q124 98 134 90" stroke="#2a1b12" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const eyesHappy = `<path d="M66 92 Q76 80 86 92" stroke="#2a1b12" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M114 92 Q124 80 134 92" stroke="#2a1b12" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const MOUTH = {
    smile: `<path d="M88 124 Q100 136 112 124" stroke="#3a271b" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    talk: `<path d="M88 123 Q100 140 112 123 Z" fill="#7a3b2b" stroke="#3a271b" stroke-width="3"/><path d="M93 131 Q100 136 107 131" fill="#f49d86"/>`,
    open: `<path d="M86 122 Q100 146 114 122 Z" fill="#7a3b2b" stroke="#3a271b" stroke-width="3"/><path d="M92 133 Q100 140 108 133" fill="#f49d86"/>`,
    hmm: `<path d="M92 128 Q100 124 110 128" stroke="#3a271b" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    sleep: `<path d="M94 127 Q100 131 106 127" stroke="#3a271b" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  const sparkle = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6Z" fill="${c}"/>`;

  function cil(pose = 'happy', size = 140) {
    let face, arms = 'down', extra = '';
    if (pose === 'talk') face = eyesOpen() + MOUTH.talk;
    else if (pose === 'celebrate') { face = eyesHappy + MOUTH.open; arms = 'up'; extra = sparkle(28, 50, 1.2, '#ffd36b') + sparkle(176, 40, 1, '#8ecbff') + sparkle(170, 120, .8, '#ff8a7a'); }
    else if (pose === 'think') { face = eyesOpen(-4) + MOUTH.hmm; extra = `<g><circle cx="172" cy="40" r="20" fill="#fff" stroke="#cfe0dc" stroke-width="3"/><text x="172" y="49" text-anchor="middle" font-family="Baloo 2, sans-serif" font-size="28" font-weight="800" fill="#2bb39b">?</text><circle cx="150" cy="66" r="5" fill="#fff" stroke="#cfe0dc" stroke-width="2"/></g>`; }
    else if (pose === 'rest') { face = eyesClosed + MOUTH.sleep; extra = `<text x="160" y="46" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" fill="#8ecbff">z</text><text x="176" y="26" font-family="Baloo 2, sans-serif" font-size="18" font-weight="800" fill="#8ecbff">z</text>`; }
    else if (pose === 'wave') { face = eyesOpen() + MOUTH.smile; arms = 'up'; }
    else face = eyesOpen() + MOUTH.smile;
    return `<svg class="cil cil-${pose}" viewBox="0 0 200 228" width="${size}" height="${size * 1.14}" role="img" aria-label="Cil si Kancil">${ears}${body(arms)}${head}${face}${extra}</svg>`;
  }

  function iconSVG(size = 512, rounded = true) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fd1b9"/><stop offset="1" stop-color="#22a58e"/></linearGradient></defs>
      <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
      <circle cx="256" cy="300" r="190" fill="#ffffff" opacity=".14"/>
      <g transform="translate(16 46) scale(2.4)">${ears}${head}${eyesOpen()}${MOUTH.smile}</g>
      <g transform="translate(408 86) scale(.9)"><rect x="-44" y="-30" width="88" height="60" rx="22" fill="#ffd36b" stroke="#e0a93a" stroke-width="6"/><text x="0" y="13" text-anchor="middle" font-family="Baloo 2, Arial Rounded MT Bold, sans-serif" font-size="40" font-weight="800" fill="#5b3a22">Aa</text></g>
    </svg>`;
  }

  const O = '#33424a';
  const OBJ = {
    buku: `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M10 18 Q35 8 60 20 L60 90 Q35 78 10 88Z" fill="#7fd1c0" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M110 18 Q85 8 60 20 L60 90 Q85 78 110 88Z" fill="#a6e3d6" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M22 34 Q36 30 48 36 M22 48 Q36 44 48 50 M72 36 Q84 30 98 34 M72 50 Q84 44 98 48" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`,
    pensel: `<svg viewBox="0 0 120 100" aria-hidden="true"><g transform="rotate(-35 60 50)"><rect x="18" y="38" width="66" height="24" rx="5" fill="#ffd36b" stroke="${O}" stroke-width="5"/><rect x="10" y="38" width="14" height="24" rx="5" fill="#ff8a7a" stroke="${O}" stroke-width="5"/><rect x="22" y="38" width="6" height="24" fill="#cfd8dc" stroke="${O}" stroke-width="3"/><path d="M84 38 L108 50 L84 62Z" fill="#f6d5ad" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M100 46 L108 50 L100 54Z" fill="${O}"/><line x1="32" y1="50" x2="80" y2="50" stroke="#f2b93b" stroke-width="4"/></g></svg>`,
    pemadam: `<svg viewBox="0 0 120 100" aria-hidden="true"><g transform="rotate(-12 60 50)"><rect x="16" y="30" width="88" height="44" rx="10" fill="#ff9aa8" stroke="${O}" stroke-width="5"/><rect x="62" y="30" width="42" height="44" rx="8" fill="#8ecbff" stroke="${O}" stroke-width="5"/><path d="M26 40 Q34 36 44 40" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/></g></svg>`,
    bola: `<svg viewBox="0 0 120 100" aria-hidden="true"><circle cx="60" cy="50" r="40" fill="#ff8a7a" stroke="${O}" stroke-width="5"/><path d="M22 40 Q60 58 98 40 M26 66 Q60 80 94 66" stroke="#ffd36b" stroke-width="8" fill="none"/><path d="M22 40 Q60 58 98 40 M26 66 Q60 80 94 66" stroke="${O}" stroke-width="2" fill="none" opacity=".4"/><circle cx="44" cy="30" r="6" fill="#fff" opacity=".7"/></svg>`,
    cawan: `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M24 26 L86 26 L80 84 Q78 90 72 90 L38 90 Q32 90 30 84Z" fill="#8ecbff" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M84 40 Q104 40 102 56 Q100 70 80 70" fill="none" stroke="${O}" stroke-width="5"/><path d="M28 40 L82 40" stroke="#fff" stroke-width="4" opacity=".8"/><path d="M44 12 Q48 18 44 22 M58 10 Q62 16 58 22" stroke="#9aa9ae" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`,
  };
  return { cil, iconSVG, OBJ };
})();
