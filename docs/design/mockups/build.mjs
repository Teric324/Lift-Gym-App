// Builds the static mockups (HTML) from the tokens and components. Run: node build.mjs
import { writeFileSync } from 'node:fs';

const C = {
  bg: '#0a0a0b',
  surface1: '#141416',
  surface2: '#1c1c1f',
  surface3: '#26262a',
  text: '#f5f5f6',
  text2: '#a4a4ac',
  text3: '#6f6f78',
  yellow: '#ffd60a',
  onYellow: '#0a0a0b',
  danger: '#ff5a52',
  warning: '#ff9f0a',
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* ---------- shared pieces ---------- */
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13.500 2L4.500 13.500H11L10 22L19.500 9.500H13Z" stroke-linejoin="round"/></symbol>
  <symbol id="i-history" viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8M12 7.5V12l3 2"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
  <symbol id="i-more" viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.5"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24"><path d="M6 12h12"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></symbol>
  <symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></symbol>
</svg>`;
const ic = (name, cls = '') => `<svg class="i ${cls}"><use href="#i-${name}"/></svg>`;

// A chunky, unmistakable lightning bolt (100 x 100 box, drawn between x 14 and x 88).
const BOLT_PATH = 'M46 0H78L58 36H88L30 100L44 58H14Z';

let gid = 0;
/** Glossy bolt: gold gradient, top highlight, bright rim and a soft drop shadow. */
function glossyBolt({ shadow = true } = {}) {
  const id = `b${++gid}`;
  return {
    defs: `
      <linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff27a"/><stop offset="0.42" stop-color="#ffd60a"/>
        <stop offset="1" stop-color="#e29a00"/>
      </linearGradient>
      <linearGradient id="${id}-gloss" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
        <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <clipPath id="${id}-clip"><path d="${BOLT_PATH}"/></clipPath>
      <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
      </filter>
      <filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5"/>
      </filter>`,
    body: `
      <path d="${BOLT_PATH}" fill="#ffd60a" opacity="0.55" filter="url(#${id}-glow)"/>
      <path d="${BOLT_PATH}" fill="url(#${id}-fill)" ${shadow ? `filter="url(#${id}-shadow)"` : ''}/>
      <g clip-path="url(#${id}-clip)">
        <rect x="0" y="0" width="100" height="62" fill="url(#${id}-gloss)"/>
        <path d="M46 0L14 58" stroke="#fffbd0" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
        <path d="M30 100L44 58" stroke="#b97800" stroke-width="3" opacity="0.5"/>
      </g>
      <path d="${BOLT_PATH}" fill="none" stroke="#fff3a0" stroke-opacity="0.55" stroke-width="0.8" stroke-linejoin="round"/>`,
  };
}

/** LIFT wordmark. A: bolt in place of the I (first-version letters). B: emblem + LIFT. C: blocky. */
function wordmark({ letters = '#f5f5f6', mono = null, height = 20, cls = 'wordmark', variant = 'A' } = {}) {
  const g = glossyBolt({ shadow: mono === null });
  const boltMark = mono ? `<path d="${BOLT_PATH}" fill="${mono}"/>` : g.body;
  const defs = mono ? '' : `<defs>${g.defs}</defs>`;
  const p = (d, x) => `<path fill="${letters}" transform="translate(${x} 0)" d="${d}"/>`;
  const thin = {
    L: 'M0 0H22V78H54V100H0Z',
    I: 'M0 0H22V100H0Z',
    F: 'M0 0H54V22H22V38H46V58H22V100H0Z',
    T: 'M0 0H66V22H44V100H22V22H0Z',
  };
  const block = thin;
  const wrap = (box, inner) =>
    `<svg class="${cls}" viewBox="${box}" height="${height}" role="img" aria-label="LIFT">${defs}${inner}</svg>`;
  if (variant === 'B') {
    return wrap('-6 -6 326 112',
      `<g transform="translate(-14 0)">${boltMark}</g>${p(thin.L, 88)}${p(thin.I, 152)}${p(thin.F, 184)}${p(thin.T, 248)}`);
  }
  if (variant === 'C') {
    return wrap('-6 -6 292 112',
      `${p(block.L, 0)}<g transform="translate(52 0)">${boltMark}</g>${p(block.F, 150)}${p(block.T, 216)}`);
  }
  return wrap('-6 -6 296 112',
    `${p(thin.L, 0)}<g transform="translate(52 0)">${boltMark}</g>${p(thin.F, 152)}${p(thin.T, 218)}`);
}

/** App icon: a flat black bolt on a yellow tile. No gradients, lights or shadows. */
function boltIcon(size, { radius = 0, scale = 0.62 } = {}) {
  const s = (size * scale) / 100;
  // the bolt is drawn between x 14 and x 88 of its box: centre it on that
  const ox = size / 2 - 51 * s;
  const oy = (size - 100 * s) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Lift app icon">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#ffd60a"/>
    <path fill="#0a0a0b" transform="translate(${ox} ${oy}) scale(${s})" d="${BOLT_PATH}"/>
  </svg>`;
}

const statusbar = `<div class="statusbar"><span class="num">18:42</span><span class="right">
  <svg viewBox="0 0 24 24"><path d="M2 18h3v4H2zM7 14h3v8H7zM12 10h3v12h-3zM17 6h3v16h-3z"/></svg>
  <svg viewBox="0 0 24 24"><path d="M12 5c4 0 7.500 1.600 10 4.300l-1.700 1.700C18 8.800 15.200 7.500 12 7.500S6 8.800 3.700 11L2 9.300C4.500 6.600 8 5 12 5zm0 5c2.600 0 5 1 6.800 2.700l-1.700 1.700C15.800 13.200 14 12.500 12 12.500s-3.800.7-5.100 1.900l-1.700-1.700C7 11 9.400 10 12 10zm0 5c1.200 0 2.300.4 3.100 1.200L12 19.500 8.900 16.200C9.700 15.400 10.800 15 12 15z"/></svg>
  <svg viewBox="0 0 28 24"><rect x="1" y="6" width="22" height="12" rx="3.500" fill="none" stroke="currentColor" stroke-width="1.500"/><rect x="3" y="8" width="16" height="8" rx="2"/><rect x="24" y="10" width="2" height="4" rx="1"/></svg>
</span></div>`;

const topbar = (right = '') => `<div class="topbar">${wordmark({ variant: 'A', height: 22 })}${right}</div>`;

const tabbar = (active) => {
  const tab = (id, icon, label) =>
    `<div class="tab ${active === id ? 'tab--on' : ''}">${ic(icon)}<span>${label}</span></div>`;
  return `<nav class="tabbar">${tab('workouts', 'bolt', 'Workouts')}${tab('history', 'history', 'History')}${tab('exercises', 'list', 'Exercises')}${tab('settings', 'sliders', 'Settings')}</nav><div class="homebar"></div>`;
};

const page = (title, body, extraCss = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="mock.css">
<style>${extraCss}</style></head><body>${sprite}${body}</body></html>`;

const phone = (inner, { nav = 'workouts', overlay = '' } = {}) =>
  `<div class="phone">${statusbar}${inner}${nav ? tabbar(nav) : ''}${overlay}</div>`;

/* ---------- screens ---------- */
const workoutCard = (name, exercises, last, extra = '') => `<article class="card">
  <h2>${name}</h2>
  <div class="meta" style="margin:2px 0 10px">${exercises} · Last done ${last}</div>
  ${extra}
  <div class="btn btn--primary" style="margin-top:12px">Start</div>
</article>`;

const workouts = phone(`
  ${topbar()}
  <div class="page">
    <h1 class="title">Workouts</h1>
    <p class="sub">Your routines. Tap Start to train.</p>
    <div class="banner">
      <svg class="bolt" viewBox="0 0 100 100"><path d="${BOLT_PATH}"/></svg>
      <div class="grow"><strong>Workout in progress</strong><span class="meta">Push · started 18:05</span></div>
      <span class="btn btn--primary btn--small">Resume</span>
    </div>
    ${workoutCard('Push', '5 exercises', 'Mon 12 Oct', '<div class="meta" style="color:var(--text-3)">Bench press, Incline press, Cable fly +2</div>')}
    ${workoutCard('Pull', '6 exercises', 'Fri 9 Oct', '<div class="meta" style="color:var(--text-3)">Lat pulldown, Barbell row, Biceps curl +3</div>')}
    <div class="btn btn--ghost" style="margin-top:4px">${ic('plus')} New workout</div>
    <div class="collapsed"><span>Archived (1)</span>${ic('down')}</div>
  </div>`);

const setRow = (n, kg, reps, done) => `<div class="set ${done ? 'set--done' : ''}">
  <span class="n">${n}</span>
  <span class="weight num">${kg}<small>kg</small></span>
  <span class="reps num"><span class="step">${ic('minus')}</span><span>${reps}</span><span class="step">${ic('plus')}</span></span>
  <span class="check ${done ? 'check--on' : ''}">${ic('check')}</span>
</div>`;

const exerciseCard = (name, step, rows, extra = '') => `<article class="card">
  <div class="ex-head">
    <div><h2>${name}</h2><span class="chip" style="margin-top:6px">${step} kg step</span>${extra}</div>
    <div class="acts"><span class="icon-btn">${ic('up')}</span><span class="icon-btn">${ic('down')}</span><span class="icon-btn">${ic('more')}</span></div>
  </div>
  ${rows}
  <div class="btn btn--ghost add-set">${ic('plus')} Add set</div>
</article>`;

const workout = phone(
  `
  ${topbar()}
  <div class="page">
    <h1 class="title">Push</h1>
    <p class="sub">Thu 15 Oct · started 18:05</p>
    <div class="meta" style="display:flex;justify-content:space-between"><span>3 of 7 sets done</span><span class="num">43%</span></div>
    <div class="progress"><span style="width:43%"></span></div>
    ${exerciseCard('Bench press', '2.5', setRow(1, '80', 5, true) + setRow(2, '82.5', 4, true) + setRow(3, '82.5', 4, false) + setRow(4, '80', 6, false))}
    ${exerciseCard('Incline dumbbell press', '2', setRow(1, '30', 10, true) + setRow(2, '30', 10, false), '<div class="meta" style="margin-top:6px">Instead of Cable fly</div>')}
    <div class="btn btn--ghost">${ic('plus')} Add exercise</div>
    <div class="btn btn--primary" style="margin-top:12px">Finish workout</div>
    <div class="collapsed"><span>Skipped (1)</span>${ic('down')}</div>
  </div>`,
  { nav: 'workouts' },
);

const pickerRows = [
  ['77.5', ''],
  ['80', ''],
  ['82.5', 'now'],
  ['85', ''],
  ['87.5', ''],
  ['90', ''],
]
  .map(([v, now]) => `<li class="${now ? 'now' : ''} num"><span>${v} kg</span>${now ? '<span class="tag">NOW</span>' : ''}</li>`)
  .join('');

const picker = phone(
  `
  ${topbar()}
  <div class="page">
    <h1 class="title">Push</h1>
    <p class="sub">Thu 15 Oct · started 18:05</p>
    <div class="meta">3 of 7 sets done</div>
    <div class="progress"><span style="width:43%"></span></div>
    ${exerciseCard('Bench press', '2.5', setRow(1, '80', 5, true) + setRow(2, '82.5', 4, true) + setRow(3, '82.5', 4, false))}
  </div>`,
  {
    nav: null,
    overlay: `<div class="dim"></div><div class="sheet">
      <div class="grabber"></div>
      <div class="sheet-head">
        <div><h3>Weight · set 3</h3><div class="meta">Bench press · 2.5 kg step · current 82.5 kg</div></div>
        <span class="btn btn--primary btn--small">Done</span>
      </div>
      <div class="field" style="margin-top:12px"><span style="color:var(--text-2);font-weight:700">Type a weight</span><span class="suffix">kg</span></div>
      <div class="chips-row">
        <span class="btn btn--small btn--ghost">0 kg</span>
        <span class="btn btn--small">−25</span><span class="btn btn--small">−10</span>
        <span class="btn btn--small">+10</span><span class="btn btn--small">+25</span>
      </div>
      <ul class="picker-list">${pickerRows}</ul>
    </div>`,
  },
);

const pickerLandscape = `<div class="phone" style="width:812px;min-height:375px;height:375px">
  <div class="dim" style="background:#000"></div>
  <div class="sheet" style="border-radius:20px;left:90px;right:90px;top:8px;bottom:auto;padding:12px 16px">
    <div class="sheet-head">
      <div><h3>Weight · set 3</h3><div class="meta">Bench press · 2.5 kg step</div></div>
      <span class="btn btn--primary btn--small">Done</span>
    </div>
    <div class="field field--focus" style="margin-top:10px"><span class="num">82,5x</span><span class="suffix">kg</span></div>
    <div class="meta" style="margin-top:6px;color:var(--danger)">Enter a number like 27.5 or 27,5. Not saved. Keeping 82.5 kg.</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:#2a2a2e;display:grid;place-items:center;color:var(--text-2)">on-screen keyboard (about 150 px tall in landscape)</div>
</div>`;

const dateTile = (d, wd) => `<div class="date-tile"><b class="num">${d}</b><span>${wd}</span></div>`;
const historyRow = (d, wd, name, counts, time) => `<div class="row-card">
  ${dateTile(d, wd)}
  <div class="main"><strong>${name}</strong><span class="meta">${counts}</span><br><span class="meta" style="color:var(--text-3)">${time}</span></div>
  ${ic('chev', 'chev')}
</div>`;

const history = phone(
  `
  ${topbar()}
  <div class="page">
    <h1 class="title">History</h1>
    <p class="sub">Your finished workouts, newest first.</p>
    <div class="caption">October 2026</div>
    ${historyRow(12, 'MON', 'Push', '5 exercises · 16 sets', '18:00 – 19:05')}
    ${historyRow(9, 'FRI', 'Pull', '6 exercises · 19 sets', '17:40 – 18:52')}
    ${historyRow(7, 'WED', 'Legs', '4 exercises · 14 sets', '09:00 – 10:10')}
    ${historyRow(5, 'MON', 'Push', '5 exercises · 15 sets', '18:05 – 19:12')}
    <div class="caption">September 2026</div>
    ${historyRow(30, 'WED', 'Pull', '6 exercises · 18 sets', '18:10 – 19:20')}
    ${historyRow(28, 'MON', 'Push', '5 exercises · 16 sets', '18:00 – 19:00')}
  </div>`,
  { nav: 'history' },
);

const exRow = (name, step, last) => `<div class="row-card">
  <div class="main"><strong>${name}</strong><span class="meta">${step === null ? 'Not done yet' : `Step ${step} kg · Last done ${last}`}</span></div>
  ${ic('chev', 'chev')}
</div>`;

const exercises = phone(
  `
  ${topbar()}
  <div class="page">
    <div class="title-row"><h1 class="title">Exercises</h1><span class="btn btn--primary btn--small" style="margin-bottom:6px">${ic('plus')} Add</span></div>
    <p class="sub">Every exercise exists once. History and records belong to the exercise.</p>
    <div class="search">${ic('search')}<span>Search exercises</span></div>
    ${exRow('Bench press', '2.5', 'Mon 12 Oct')}
    ${exRow('Cable fly', '2.5', 'Mon 12 Oct')}
    ${exRow('Incline dumbbell press', '2', 'Fri 9 Oct')}
    ${exRow('Lat pulldown', '5', 'Fri 9 Oct')}
    ${exRow('Squat', '2.5', 'Wed 7 Oct')}
    ${exRow('Triceps pushdown', null, '')}
    <div class="collapsed"><span>Archived (2)</span>${ic('down')}</div>
  </div>`,
  { nav: 'exercises' },
);

/* ---------- boards ---------- */
const sw = (name, hex, note, textOn = C.text) => `<div class="swatch">
  <div class="chipcolor" style="background:${hex};color:${textOn}"></div>
  <div class="info"><b>${name}</b><code>${hex}</code><br>${note}</div></div>`;

const pairs = [
  ['Text on background', C.text, C.bg],
  ['Secondary text on background', C.text2, C.bg],
  ['Secondary text on card', C.text2, C.surface1],
  ['Black on yellow (buttons)', C.onYellow, C.yellow],
  ['Yellow on background (links, active tab)', C.yellow, C.bg],
  ['Yellow on card', C.yellow, C.surface1],
  ['Danger on card', C.danger, C.surface1],
  ['Warning on background', C.warning, C.bg],
  ['Decorative grey on background (not for text)', C.text3, C.bg],
];
const contrastRows = pairs
  .map(([label, fg, bg]) => {
    const r = ratio(fg, bg);
    const mark = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : 'decor.';
    return `<tr><td>${label}</td><td class="num">${r.toFixed(1)} : 1</td><td class="${r >= 4.5 ? 'ok' : ''}">${mark}</td></tr>`;
  })
  .join('');

const palette = `<div class="board">
  <h1>Lift · palette, type and shape</h1>
  <div class="meta">Dark, yellow and black. Tokens go in <code>src/app/theme.css</code>; nothing is hard-coded elsewhere.</div>
  <h2>Colour</h2>
  <div class="swatches">
    ${sw('Background', C.bg, 'page, status bar')}
    ${sw('Surface 1', C.surface1, 'cards, sheets')}
    ${sw('Surface 2', C.surface2, 'fields, tiles')}
    ${sw('Surface 3', C.surface3, 'chips, progress track')}
    ${sw('Yellow', C.yellow, 'brand, primary buttons, done sets', C.onYellow)}
    ${sw('Text', C.text, 'main text')}
    ${sw('Text 2', C.text2, 'secondary text, inactive tab')}
    ${sw('Danger / warning', C.danger, 'delete, errors · warning ' + C.warning)}
  </div>
  <h2>Contrast (WCAG)</h2>
  <div class="spec"><table class="contrast">${contrastRows}</table></div>
  <h2>Shape and depth</h2>
  <div class="grid2">
    <div class="spec"><div class="label">Radii</div>
      <div style="display:flex;gap:12px;align-items:flex-end">
        ${[10, 14, 20, 28].map((r) => `<div style="width:64px;height:64px;border-radius:${r}px;background:var(--surface-3);border:1px solid var(--line);display:grid;place-items:center;font-size:12px;color:var(--text-2)">${r}</div>`).join('')}
        <div style="width:96px;height:40px;border-radius:999px;background:var(--surface-3);display:grid;place-items:center;font-size:12px;color:var(--text-2)">pill</div>
      </div></div>
    <div class="spec"><div class="label">Depth</div>
      <div style="font-size:14px;color:var(--text-2)">Cards: 1 px line and a hairline top highlight, no blur. Only the weight sheet has a shadow. Nothing animates except a 120 ms press state on buttons; no transitions on scrolling content.</div></div>
  </div>
  <h2>Type: Inter for text, Black Ops One for page titles</h2>
  <div class="grid2">
    <div class="spec">
      <div style="font-size:28px;font-weight:900;letter-spacing:-0.02em;line-height:1.15">Workouts <span style="color:var(--text-2);font-size:12px;font-weight:800">28 / 900</span></div>
      <div style="font-size:22px;font-weight:900;margin-top:8px">Push day <span style="color:var(--text-2);font-size:12px;font-weight:800">22 / 900</span></div>
      <div style="font-size:18px;font-weight:900;margin-top:8px">Bench press <span style="color:var(--text-2);font-size:12px;font-weight:800">18 / 900</span></div>
      <div style="font-size:16px;margin-top:8px">Body text, inputs never below 16 px <span style="color:var(--text-2);font-size:12px;font-weight:800">16 / 600</span></div>
      <div style="font-size:14px;color:var(--text-2);margin-top:8px">Secondary text and meta <span style="font-size:12px;font-weight:800">14 / 700</span></div>
      <div style="font-size:12px;font-weight:900;letter-spacing:0.08em;color:var(--text-2);margin-top:8px">CAPTION · OCTOBER 2026</div>
      <div class="num" style="font-size:22px;font-weight:900;margin-top:10px">82.5 kg × 8 &nbsp; 107.5 kg × 3 <span style="color:var(--text-2);font-size:12px;font-weight:800">numbers: tabular</span></div>
    </div>
    <div class="spec">
      <div class="label">Inter vs Space Grotesk, same text</div>
      <div style="font-family:'Inter';font-size:20px;font-weight:900">Inter · Bench press 82.5 kg × 8</div>
      <div style="font-family:'Inter';font-size:15px;color:var(--text-2);margin-top:2px">Împingeri la bancă, genuflexiuni, ș ț ă î â · Mon 12 Oct</div>
      <div style="font-family:'Space Grotesk';font-size:20px;font-weight:900;margin-top:14px">Space Grotesk · Bench press 82.5 kg × 8</div>
      <div style="font-family:'Space Grotesk';font-size:15px;color:var(--text-2);margin-top:2px">Împingeri la bancă, genuflexiuni, ș ț ă î â · Mon 12 Oct</div>
      <div style="font-size:13px;color:var(--text-2);margin-top:14px">Inter: neutral, very legible numbers (tabular), 48 KB + 85 KB for ș ț ă. Space Grotesk: more character, 22 KB + 19 KB, numbers are less even. Recommendation: Inter.</div>
    </div>
  </div>
</div>`;

const brand = `<div class="board">
  <h1>Lift · wordmark and app icon</h1>
  <div class="meta">The wordmark keeps the lit yellow bolt, standing where the I of LIFT is. The app icon is flat: a black bolt on a yellow tile, no lights or shadows.</div>
  <h2>Wordmark: the bolt is the I of LIFT</h2>
  <div class="grid2">
    <div class="spec" style="background:#0a0a0b;display:grid;place-items:center;height:170px">${wordmark({ height: 84 })}</div>
    <div class="spec" style="background:var(--yellow);display:grid;place-items:center;height:170px">${wordmark({ letters: '#0a0a0b', mono: '#0a0a0b', height: 76 })}</div>
    <div class="spec" style="background:#0a0a0b;display:flex;align-items:center;justify-content:center;gap:34px;height:110px"><span style="font-size:12px;color:var(--text-2)">top bar, 22 px</span>${wordmark({ height: 22 })}<span style="font-size:12px;color:var(--text-2)">16 px</span>${wordmark({ height: 16 })}</div>
    <div class="spec" style="background:#0a0a0b;display:flex;align-items:center;justify-content:center;gap:24px;height:110px"><span style="font-size:12px;color:var(--text-2)">all yellow</span>${wordmark({ letters: '#ffd60a', mono: '#ffd60a', height: 40 })}</div>
  </div>
  <h2>App icon</h2>
  <div class="spec" style="display:flex;gap:36px;align-items:flex-start;flex-wrap:wrap">
    <div><div class="label">180 px, apple-touch-icon (no transparency)</div>${boltIcon(180, { radius: 40 })}</div>
    <div><div class="label">PWA 192 / 512 (as square)</div>${boltIcon(120)}</div>
    <div><div class="label">Maskable (safe zone)</div>
      <div style="position:relative">${boltIcon(120, { scale: 0.5 })}
        <div style="position:absolute;inset:12px;border:1px dashed var(--yellow-line);border-radius:50%"></div></div></div>
    <div><div class="label">60 px</div>${boltIcon(60, { radius: 13.4 })}</div>
    <div><div class="label">32 px favicon</div>${boltIcon(32, { radius: 7 })}</div>
  </div>
  <h2>On the Home Screen</h2>
  <div style="width:390px;height:330px;border-radius:36px;padding:34px 22px;background:linear-gradient(160deg,#23232a,#0d0d12 70%);display:grid;grid-template-columns:repeat(4,1fr);gap:22px 12px;align-content:start">
    ${[
      ['Mail', '#3b82f6'],
      ['Photos', '#8b5cf6'],
      ['Notes', '#eab308'],
      ['Maps', '#22c55e'],
    ]
      .map(([n, c]) => `<div style="text-align:center"><div style="width:60px;height:60px;margin:0 auto;border-radius:13.4px;background:${c};opacity:.55"></div><div style="font-size:11px;margin-top:6px">${n}</div></div>`)
      .join('')}
    <div style="text-align:center"><div style="width:60px;height:60px;margin:0 auto;border-radius:13.4px;overflow:hidden">${boltIcon(60)}</div><div style="font-size:11px;margin-top:6px;font-weight:800">Lift</div></div>
    ${[
      ['Clock', '#64748b'],
      ['Weather', '#0ea5e9'],
      ['Music', '#ef4444'],
    ]
      .map(([n, c]) => `<div style="text-align:center"><div style="width:60px;height:60px;margin:0 auto;border-radius:13.4px;background:${c};opacity:.55"></div><div style="font-size:11px;margin-top:6px">${n}</div></div>`)
      .join('')}
  </div>
</div>`;

/* ---------- write ---------- */
const files = {
  'workouts.html': page('Workouts', workouts),
  'workout.html': page('Workout', workout),
  'picker.html': page('Weight picker', picker),
  'picker-landscape.html': page('Weight picker, landscape with keyboard', pickerLandscape),
  'history.html': page('History', history),
  'exercises.html': page('Exercises', exercises),
  'palette.html': page('Palette', palette),
  'brand.html': page('Brand', brand),
};
for (const [name, html] of Object.entries(files)) writeFileSync(name, html);

// standalone SVGs (what would go in the repo)
writeFileSync('wordmark.svg', wordmark({ height: 100 }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
writeFileSync('icon.svg', boltIcon(512).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
console.log(Object.keys(files).join('\n'));
console.log(pairs.map(([l, f, b]) => `${l}: ${ratio(f, b).toFixed(2)}`).join('\n'));

export { wordmark, boltIcon, sprite, ic, BOLT_PATH };
