const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;

const state = { view: 'table', lens: 'category', T: 298, hover: 79, open: null, query: '', catFilter: null, layout: null };

/* ---------------- formatting ---------------- */
const fmtC = K => K == null ? '—' : `${Math.round(K - 273.15).toLocaleString()} °C`;
const fmtK = K => `${Math.round(K).toLocaleString()} K`;
const fmtYear = e => e.year === 0 ? 'Antiquity' : e.year < 1600 ? `c. ${e.year}` : String(e.year);
const fmtMass = e => e.synthetic && e.Z > 94 || [43, 61, 84, 85, 86, 87, 88, 89, 93, 94].includes(e.Z) ? `[${e.mass}]` : e.mass.toLocaleString(undefined, { maximumFractionDigits: 3 });
function fmtDensity(d) {
  if (d == null) return '—';
  if (d < 0.01) return `${(d * 1000).toFixed(2)} g/L`;
  return `${d.toLocaleString(undefined, { maximumFractionDigits: 2 })} g/cm³`;
}
function phaseAt(e, T) {
  if (e.mp == null && e.bp == null) return 'unknown';
  if (e.mp != null && T < e.mp) return 'solid';
  if (e.bp == null) return e.mp != null ? 'liquid' : 'unknown';
  if (T < e.bp) return 'liquid';
  return 'gas';
}

/* ---------------- color ---------------- */
const RAMP = ['#2a2c86', '#2f63d6', '#22b8b0', '#b9e05a', '#ffb03b', '#ff4f5e'];
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function ramp(t) {
  t = clamp(t, 0, 1) * (RAMP.length - 1);
  const i = Math.min(Math.floor(t), RAMP.length - 2), f = t - i;
  const a = hex2rgb(RAMP[i]), b = hex2rgb(RAMP[i + 1]);
  return rgb2hex(a.map((v, k) => lerp(v, b[k], f)));
}
const UNKNOWN = '#3a3d52';
const LENSES = {
  category: { color: e => e.color },
  en: { color: e => e.en == null ? null : ramp((e.en - 0.7) / 3.3), lo: '0.7 · gives electrons away', hi: '4.0 · grabs electrons' },
  mp: { color: e => e.mp == null ? null : ramp(Math.log10(e.mp / 10) / Math.log10(400)), lo: '−260 °C', hi: '3,400 °C+' },
  density: { color: e => e.density == null ? null : ramp((Math.log10(e.density) + 4) / (Math.log10(23) + 4)), lo: 'lighter than air', hi: 'osmium, 22.6 g/cm³' },
  year: { color: e => e.year === 0 ? '#f1e4c2' : ramp((e.year - 1660) / 350), lo: '1660', hi: '2010' },
};
const lensColor = e => LENSES[state.lens].color(e) || UNKNOWN;

function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  let f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (750 - nm) / 50 : 1;
  return `rgb(${[r, g, b].map(v => Math.round(255 * Math.pow(v * f, 0.8))).join(',')})`;
}

/* ---------------- photos (live from Wikipedia) ---------------- */
const photoCache = new Map();
function getPhoto(e) {
  if (e.Z >= 100) return Promise.resolve(null);
  if (photoCache.has(e.Z)) return photoCache.get(e.Z);
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('aom-photo2-' + e.Z)); } catch (_) {}
  const p = stored ? Promise.resolve(stored) :
    fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(e.wiki))
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j || !j.thumbnail) return null;
        const o = j.originalimage || {};
        const big = o.width >= 960 ? j.thumbnail.source.replace(/\/\d+px-/, '/960px-') : (o.source || j.thumbnail.source);
        const file = decodeURIComponent((o.source || '').split('/').pop().split('?')[0]).replace(/_/g, ' ');
        const res = { thumb: j.thumbnail.source, big, page: j.content_urls && j.content_urls.desktop.page, file };
        try { localStorage.setItem('aom-photo2-' + e.Z, JSON.stringify(res)); } catch (_) {}
        return res;
      })
      .catch(() => null);
  photoCache.set(e.Z, p);
  return p;
}

/* ---------------- tiles ---------------- */
const stage = $('#stage'), stageWrap = $('#stageWrap'), feature = $('#feature');
const tiles = ELEMENTS.map(e => {
  const t = document.createElement('div');
  t.className = 'tile';
  t.dataset.z = e.Z;
  t.tabIndex = 0;
  t.setAttribute('role', 'button');
  t.setAttribute('aria-label', `${e.name}, element ${e.Z}`);
  t.innerHTML = `<div class="face"><span class="z">${e.Z}</span>${e.radioactive ? '<span class="rad" title="Radioactive"></span>' : ''}<span class="sym">${e.sym}</span><span class="nm">${e.name}</span><span class="ms">${fmtMass(e)}</span></div>`;
  t.face = t.firstChild;
  stage.appendChild(t);
  return t;
});

function paintTiles() {
  const q = state.query.trim().toLowerCase();
  const counts = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
  ELEMENTS.forEach((e, i) => {
    const t = tiles[i];
    t.face.style.setProperty('--c', lensColor(e));
    const ph = phaseAt(e, state.T);
    counts[ph]++;
    t.classList.toggle('liquid', ph === 'liquid');
    t.classList.toggle('gas', ph === 'gas');
    t.classList.toggle('unknown', ph === 'unknown');
    const match = (!q || e.name.toLowerCase().startsWith(q) || e.sym.toLowerCase() === q || String(e.Z) === q || (q.length > 2 && e.name.toLowerCase().includes(q)))
      && (!state.catFilter || e.cat === state.catFilter);
    t.classList.toggle('dim', !match);
  });
  return counts;
}

/* ---------------- layouts: the same 118 tiles, three arrangements ---------------- */
function computeLayout() {
  const avail = $('#explore').clientWidth - 4;
  const out = { pos: {}, annots: [], ghosts: [], feature: null, guide: null, compact: false };
  if (state.view === 'table') {
    const cell = clamp(Math.floor(avail / 18), 40, 86);
    const s = cell - Math.max(3, Math.round(cell * 0.07));
    out.W = cell * 17 + s; out.H = cell * 8.4 + s;
    ELEMENTS.forEach(e => (out.pos[e.Z] = { x: e.col * cell, y: e.row * cell, s }));
    out.ghosts = [{ x: 2 * cell, y: 5 * cell, s, text: '57–71' }, { x: 2 * cell, y: 6 * cell, s, text: '89–103' }];
    out.annots.push({ x: 0, y: 7.4 * cell + s / 2 - 7, text: 'Lanthanides' }, { x: 0, y: 8.4 * cell + s / 2 - 7, text: 'Actinides' });
    if (cell >= 46) out.feature = { x: 2 * cell + 10, y: 0, w: 10 * cell - (cell - s) - 20, h: 3 * cell - (cell - s) };
  } else if (state.view === 'spiral') {
    const W = Math.max(avail, 680), size = Math.min(W, 1000);
    const s = clamp(size / 24, 26, 46);
    const cx = W / 2, cy = size / 2, R0 = s * 1.5, Rmax = size / 2 - s * 0.85, dR = (Rmax - R0) / 7;
    out.W = W; out.H = size; out.compact = true;
    const byP = {};
    ELEMENTS.forEach(e => (byP[e.period] = byP[e.period] || []).push(e));
    Object.entries(byP).forEach(([p, list]) => {
      list.forEach((e, i) => {
        const f = i / list.length, a = -Math.PI / 2 + f * Math.PI * 2, r = R0 + (p - 1 + f) * dR;
        out.pos[e.Z] = { x: cx + r * Math.cos(a) - s / 2, y: cy + r * Math.sin(a) - s / 2, s };
      });
      const r0 = R0 + (p - 1) * dR;
      out.annots.push({ x: cx - s / 2 - 8, y: cy - r0 - 7, text: `${list.length}`, cls: 'right' });
    });
    let d = '';
    for (let k = 0; k <= 7 * 120; k++) {
      const f = k / 120, a = -Math.PI / 2 + f * Math.PI * 2, r = R0 + f * dR;
      d += (k ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    }
    out.guide = d;
    out.annots.push({ x: cx - 90, y: cy - 22, w: 180, text: 'One turn per period. Every turn ends on a noble gas.', cls: 'big' });
  } else {
    const bin = e => (e.year < 1660 ? 0 : 1 + Math.floor((e.year - 1660) / 10));
    const nb = 37;
    const cell = clamp(Math.floor(avail / (nb + 1.5)), 24, 46), s = cell - 2;
    const stacks = Array.from({ length: nb }, () => []);
    [...ELEMENTS].sort((a, b) => a.year - b.year || a.Z - b.Z).forEach(e => stacks[bin(e)].push(e));
    const maxStack = Math.max(...stacks.map(x => x.length));
    const top = 104;
    out.W = (nb + 1.5) * cell; out.H = top + maxStack * cell + 34; out.compact = true;
    const y0 = top + maxStack * cell;
    stacks.forEach((list, b) => list.forEach((e, k) => (out.pos[e.Z] = { x: (b + 0.5) * cell, y: y0 - (k + 1) * cell, s })));
    out.annots.push({ x: 0.5 * cell, y: y0 + 10, text: 'Ancient' });
    for (let yr = 1700; yr <= 2000; yr += 50) out.annots.push({ x: (1.5 + (yr - 1660) / 10) * cell, y: y0 + 10, text: String(yr) });
    const eras = [
      [1807, 'Electrolysis', 'Davy splits out K, Na, Ca, Ba'],
      [1860, 'Spectroscope', 'Cs and Rb found by their color'],
      [1894, 'Noble gases', 'a whole column in five years'],
      [1940, 'Nuclear age', 'reactors make new elements'],
      [1981, 'Heavy-ion beams', 'atoms made one at a time'],
    ];
    eras.forEach(([yr, t, d], i) => out.annots.push({ x: (1.5 + (yr - 1660) / 10) * cell, y: 4 + (i % 2) * 48, html: `<b>${yr} · ${t}</b>${d}`, cls: 'era' }));
  }
  return out;
}

let annotEls = [];
let firstLayout = true;
function applyLayout(animate) {
  const L = state.layout = computeLayout();
  if (firstLayout) { tiles.forEach(t => (t.style.transition = 'none')); requestAnimationFrame(() => requestAnimationFrame(() => tiles.forEach(t => (t.style.transition = '')))); firstLayout = false; }
  stage.style.width = L.W + 'px';
  stage.style.height = L.H + 'px';
  stageWrap.classList.toggle('scroll', L.W > $('#explore').clientWidth);
  stage.classList.toggle('compact', L.compact);
  ELEMENTS.forEach((e, i) => {
    const p = L.pos[e.Z], t = tiles[i];
    t.style.transitionDelay = animate && !REDUCED ? `${(state.view === 'timeline' ? e.year % 97 : e.Z) * 5}ms` : '0ms';
    t.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.s / 64})`;
  });
  annotEls.forEach(a => a.remove());
  annotEls = [];
  L.ghosts.forEach(g => {
    const d = document.createElement('div');
    d.className = 'ghost-tile';
    Object.assign(d.style, { left: g.x + 'px', top: g.y + 'px', width: g.s + 'px', height: g.s + 'px' });
    d.textContent = g.text;
    stage.appendChild(d); annotEls.push(d);
  });
  L.annots.forEach(a => {
    const d = document.createElement('div');
    d.className = 'annot ' + (a.cls || '');
    Object.assign(d.style, { left: a.x + 'px', top: a.y + 'px' });
    if (a.w) d.style.width = a.w + 'px';
    if (a.cls === 'right') d.style.transform = 'translateX(-100%)';
    if (a.html) d.innerHTML = a.html; else d.textContent = a.text;
    stage.appendChild(d); annotEls.push(d);
  });
  const g = $('#spiralGuide');
  g.setAttribute('width', L.W); g.setAttribute('height', L.H);
  g.innerHTML = L.guide ? `<path d="${L.guide}" fill="none" stroke="#2a2e45" stroke-width="1.2" stroke-dasharray="2 5"/>` : '';
  if (L.feature) {
    Object.assign(feature.style, { left: L.feature.x + 'px', top: L.feature.y + 'px', width: L.feature.w + 'px', height: L.feature.h + 'px', opacity: 1 });
    feature.hidden = false;
    renderFeature(el(state.hover), true);
  } else {
    feature.style.opacity = 0;
    feature.hidden = true;
  }
  fishDirty = true;
}

/* ---------------- featured element (lives in the table's empty gap) ---------------- */
let featureZ = null;
function renderFeature(e, force) {
  if (!force && featureZ === e.Z) return;
  featureZ = e.Z;
  feature.style.setProperty('--fc', e.color);
  const ph = phaseAt(e, state.T);
  feature.innerHTML = `
    <div class="fphoto"><img alt="Photo of ${e.name}"><div class="fsym">${e.sym}</div></div>
    <div class="ftext">
      <div class="fkicker">${e.Z} · ${CATS[e.cat].name}</div>
      <div class="fname">${e.name}</div>
      <p class="flook">${e.look}</p>
      <div class="fstats">
        <div><span>Mass</span>${fmtMass(e)}</div>
        <div><span>At ${fmtK(state.T)}</span>${ph}</div>
        <div><span>Melts</span>${fmtC(e.mp)}</div>
        <div><span>Found</span>${fmtYear(e)}</div>
      </div>
    </div>`;
  const img = feature.querySelector('img');
  getPhoto(e).then(p => {
    if (!p || featureZ !== e.Z) return;
    img.onload = () => img.classList.add('ok');
    img.src = p.thumb;
  });
}

/* ---------------- hover card (spiral / timeline / small screens) ---------------- */
const hc = $('#hovercard');
let hcZ = null;
function showHoverCard(e, x, y) {
  if (hcZ !== e.Z) {
    hcZ = e.Z;
    hc.innerHTML = `<div class="hc-img" style="color:${e.color}">${e.sym}</div><div><b>${e.name}</b><small>${e.Z} · ${CATS[e.cat].name}<br>${fmtYear(e)} · ${phaseAt(e, state.T)} at ${fmtK(state.T)}</small></div>`;
    getPhoto(e).then(p => {
      if (p && hcZ === e.Z) hc.querySelector('.hc-img').innerHTML = `<img alt="" src="${p.thumb}">`;
    });
  }
  const w = 220;
  hc.style.left = clamp(x + 18, 8, innerWidth - w - 8) + 'px';
  hc.style.top = clamp(y + 18, 8, innerHeight - 90) + 'px';
  hc.classList.add('on');
}
const hideHoverCard = () => hc.classList.remove('on');

/* ---------------- cursor lens: tiles swell, tilt and glow near the pointer ---------------- */
const ptr = { x: 0, y: 0, in: false, cx: -1, cy: -1 };
let fishDirty = false;
stage.addEventListener('pointermove', ev => {
  const r = stage.getBoundingClientRect();
  ptr.x = ev.clientX - r.left; ptr.y = ev.clientY - r.top; ptr.in = ev.pointerType !== 'touch';
  stage.style.setProperty('--mx', ptr.x + 'px');
  stage.style.setProperty('--my', ptr.y + 'px');
  fishDirty = true;
  const t = ev.target.closest('.tile');
  if (t) {
    const e = el(+t.dataset.z);
    setHover(e);
    if (!state.layout.feature && ev.pointerType !== 'touch') showHoverCard(e, ev.clientX, ev.clientY);
  } else hideHoverCard();
});
stage.addEventListener('pointerleave', () => { ptr.in = false; fishDirty = true; hideHoverCard(); tiles.forEach(t => t.classList.remove('hot')); });

function setHover(e) {
  if (state.hover === e.Z) return;
  state.hover = e.Z;
  if (state.layout.feature) renderFeature(e);
}

function fishFrame() {
  if (fishDirty && state.layout) {
    fishDirty = false;
    const amp = state.view === 'table' ? 0.42 : 0.7;
    ELEMENTS.forEach((e, i) => {
      const p = state.layout.pos[e.Z], t = tiles[i];
      const dx = ptr.x - (p.x + p.s / 2), dy = ptr.y - (p.y + p.s / 2);
      const R = p.s * 2.6;
      let k = ptr.in ? clamp(1 - Math.hypot(dx, dy) / R, 0, 1) : 0;
      k = k * k * (3 - 2 * k);
      if (k > 0.002) {
        t.face.style.transform = `perspective(240px) rotateX(${(-dy / R) * 18 * k}deg) rotateY(${(dx / R) * 18 * k}deg) scale(${1 + amp * k})`;
        t.style.zIndex = 10 + Math.round(k * 100);
        t.classList.toggle('hot', k > 0.6);
      } else if (t.face.style.transform) {
        t.face.style.transform = '';
        t.style.zIndex = '';
        t.classList.remove('hot');
      }
    });
  }
  requestAnimationFrame(fishFrame);
}
requestAnimationFrame(fishFrame);

stage.addEventListener('click', ev => {
  const t = ev.target.closest('.tile');
  if (t) openDetail(+t.dataset.z);
});
stage.addEventListener('keydown', ev => {
  const t = ev.target.closest('.tile');
  if (t && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openDetail(+t.dataset.z); }
});
stage.addEventListener('focusin', ev => {
  const t = ev.target.closest('.tile');
  if (t) setHover(el(+t.dataset.z));
});

/* ---------------- controls ---------------- */
const tempInput = $('#temp');
const sliderToT = v => Math.max(1, Math.round(6000 * Math.pow(v / 1000, 2)));
const tToSlider = T => Math.round(Math.sqrt(T / 6000) * 1000);
function setTemp(T, fromSlider) {
  state.T = T;
  if (!fromSlider) tempInput.value = tToSlider(T);
  $('#tempRead').innerHTML = `${fmtK(T)}<small>${fmtC(T)}</small>`;
  refresh();
  if (state.layout && state.layout.feature) renderFeature(el(state.hover), true);
}
tempInput.addEventListener('input', () => setTemp(sliderToT(+tempInput.value), true));
$$('.presets button').forEach(b => b.addEventListener('click', () => setTemp(+b.dataset.t)));

$$('#lens button').forEach(b => b.addEventListener('click', () => {
  state.lens = b.dataset.lens;
  state.catFilter = null;
  $$('#lens button').forEach(x => x.setAttribute('aria-pressed', x === b));
  refresh();
}));

const q = $('#q');
q.addEventListener('input', () => { state.query = q.value; refresh(); });
q.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter') return;
  const i = tiles.findIndex(t => !t.classList.contains('dim'));
  if (i >= 0) openDetail(i + 1);
});

function renderLegend(counts) {
  const lg = $('#legend');
  let html = '';
  if (state.lens === 'category') {
    html = Object.entries(CATS).map(([k, c]) => {
      const n = ELEMENTS.filter(e => e.cat === k).length;
      return `<button class="lg ${state.catFilter === k ? 'on' : ''}" data-cat="${k}" style="--c:${c.color}"><span class="sw"></span>${c.name} <span style="color:var(--faint)">${n}</span></button>`;
    }).join('');
  } else {
    const L = LENSES[state.lens];
    html = `${state.lens === 'year' ? `<span class="lg" style="--c:#f1e4c2"><span class="sw"></span>Antiquity</span>` : ''}
      <span>${L.lo}</span><span class="ramp" style="background:linear-gradient(90deg,${RAMP.join(',')})"></span><span>${L.hi}</span>
      <span class="lg" style="--c:${UNKNOWN}"><span class="sw"></span>unknown</span>`;
  }
  html += `<span class="phases">at ${fmtK(state.T)}: <span><b>${counts.solid}</b> solid</span><span><b>${counts.liquid}</b> liquid</span><span><b>${counts.gas}</b> gas</span><span><b>${counts.unknown}</b> unknown</span></span>`;
  lg.innerHTML = html;
  $$('.lg[data-cat]', lg).forEach(b => b.addEventListener('click', () => {
    state.catFilter = state.catFilter === b.dataset.cat ? null : b.dataset.cat;
    refresh();
  }));
}

function refresh() {
  const counts = paintTiles();
  renderLegend(counts);
}

/* ---------------- views ---------------- */
function setView(v) {
  const prev = state.view;
  state.view = v;
  $$('.views button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v));
  const lab = v === 'lab';
  $('#explore').hidden = lab;
  $('#lab').hidden = !lab;
  try { history.replaceState(null, '', '#' + v); } catch (_) {}
  hideHoverCard();
  if (lab) { window.Lab && Lab.start(); }
  else {
    window.Lab && Lab.stop();
    applyLayout(prev !== v && prev !== 'lab');
  }
}
$$('.views button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

let resizeT, lastW = 0;
new ResizeObserver(() => {
  const w = $('#explore').clientWidth;
  if (!w || w === lastW) return;
  lastW = w;
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (state.view !== 'lab') applyLayout(false); }, 120);
}).observe($('#explore'));
addEventListener('resize', () => Bohr.resize());

/* ---------------- background: a quiet field of particles that orbit the cursor ---------------- */
const BG = (() => {
  const cv = $('#bg'), ctx = cv.getContext('2d');
  let W, H, dpr, parts = [], mouse = { x: -999, y: -999 };
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: Math.round(W * H / 14000) }, () => ({
      x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1.3 + 0.3, hue: Math.random(),
    }));
  }
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener('resize', resize);
  resize();
  function frame() {
    ctx.clearRect(0, 0, W, H);
    if (!REDUCED && state.view !== 'lab' && !document.hidden) {
      for (const p of parts) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 180 && d > 1) {
          const f = (1 - d / 180) * 0.06;
          p.vx += (-dy / d) * f + (dx / d) * f * 0.25;
          p.vy += (dx / d) * f + (dy / d) * f * 0.25;
        }
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx + 0.04; p.y += p.vy;
        if (p.x > W) p.x = 0; if (p.x < 0) p.x = W; if (p.y > H) p.y = 0; if (p.y < 0) p.y = H;
        const near = d < 180 ? 1 - d / 180 : 0;
        ctx.fillStyle = p.hue > 0.85 ? `rgba(255,181,71,${0.25 + near * 0.6})` : `rgba(170,180,230,${0.18 + near * 0.6})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + near * 1.2, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------------- the atom: a Bohr model you can excite with the cursor ---------------- */
const Bohr = (() => {
  const cv = $('#bohr'), ctx = cv.getContext('2d');
  let W = 0, H = 0, e = null, nucleons = [], energy = 0, jumps = [], photons = [], running = false, last = 0;
  const mouse = { x: 0.5, y: 0.5, px: null, py: null };
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W) return;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function emissionColor() {
    const lines = SPECTRA[e.sym];
    if (lines) return wavelengthRGB(lines[Math.floor(Math.random() * lines.length)]);
    return e.flame || e.color;
  }
  function set(next) {
    e = next; jumps = []; photons = []; energy = 0;
    const protons = Math.min(e.Z, 40), neutrons = Math.min(Math.round(e.mass) - e.Z, 48);
    const list = [...Array(protons).fill(1), ...Array(Math.max(0, neutrons)).fill(0)];
    let seed = e.Z * 9301;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    nucleons = list.map((p, i) => ({ p, a: i * 2.39996, r: Math.sqrt(i + 0.5), ph: rnd() * 6.28 }));
    resize();
  }
  function excite() {
    const outer = e.shells.length - 1;
    const n = e.shells[outer];
    const idx = Math.floor(Math.random() * n);
    if (jumps.some(j => j.shell === outer && j.idx === idx)) return;
    jumps.push({ shell: outer, idx, t: 0, dur: 1.1, color: emissionColor() });
  }
  cv.addEventListener('pointermove', ev => {
    const r = cv.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (mouse.px != null) energy += Math.hypot(x - mouse.px, y - mouse.py) * 0.006;
    mouse.px = x; mouse.py = y;
    mouse.x = x / r.width; mouse.y = y / r.height;
  });
  cv.addEventListener('pointerleave', () => { mouse.px = null; mouse.x = 0.5; mouse.y = 0.5; });
  cv.addEventListener('pointerdown', () => { energy += 1.2; });

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const t = now / 1000;
    if (energy > 1) { energy -= 1; excite(); }
    energy *= 0.995;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const ns = e.shells.length;
    const nucR = 6 + Math.sqrt(nucleons.length) * 3.4;
    const Rmax = Math.min(W, H) / 2 - 16, R1 = nucR + 18;
    const step = ns > 1 ? (Rmax - R1) / (ns - 1) : 0;
    const tiltX = lerp(0.95, 0.42, Math.abs(mouse.y - 0.5) * 2);
    const rotBase = (mouse.x - 0.5) * 1.2;

    // shells + electrons
    for (let s = 0; s < ns; s++) {
      const R = R1 + s * step, sq = lerp(1, tiltX, 0.5 + s * 0.08), rot = rotBase + s * 0.55;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(140,150,190,0.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, R, R * sq, 0, 0, 6.283); ctx.stroke();
      const n = e.shells[s], w = 0.9 / Math.pow(s + 1, 0.85);
      for (let j = 0; j < n; j++) {
        const jump = jumps.find(q => q.shell === s && q.idx === j);
        const a = t * w * (REDUCED ? 0.2 : 1) + (j / n) * 6.283 + s;
        let rr = R;
        if (jump) {
          const u = jump.t / jump.dur;
          rr = R + Math.sin(Math.min(1, u) * Math.PI) * (step || 30) * 1.4 + 6;
        }
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * sq;
        ctx.fillStyle = jump ? jump.color : '#cfe3ff';
        ctx.shadowColor = jump ? jump.color : '#7fb0ff'; ctx.shadowBlur = jump ? 18 : 8;
        ctx.beginPath(); ctx.arc(x, y, jump ? 3.6 : 2.6, 0, 6.283); ctx.fill();
        if (jump && !jump.emitted && jump.t / jump.dur > 0.55) {
          jump.emitted = true;
          const c = Math.cos(rot), sn = Math.sin(rot);
          const wx = cx + x * c - y * sn, wy = cy + x * sn + y * c;
          const ang = Math.atan2(wy - cy, wx - cx) + (Math.random() - 0.5) * 0.6;
          photons.push({ x: wx, y: wy, a: ang, life: 0, color: jump.color });
        }
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    jumps.forEach(j => (j.t += dt));
    jumps = jumps.filter(j => j.t < j.dur);

    // nucleus
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR * 2.4);
    glow.addColorStop(0, e.color + '55'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, nucR * 2.4, 0, 6.283); ctx.fill();
    const nr = 3.2;
    for (const n of nucleons) {
      const jit = REDUCED ? 0 : Math.sin(t * 9 + n.ph) * 0.35;
      const x = cx + Math.cos(n.a) * n.r * nr * 1.05 + jit, y = cy + Math.sin(n.a) * n.r * nr * 1.05 - jit;
      const g = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, nr * 1.1);
      g.addColorStop(0, n.p ? '#ffb3a8' : '#f2f3f8'); g.addColorStop(1, n.p ? '#c8324a' : '#6b6f86');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, nr * 1.1, 0, 6.283); ctx.fill();
    }

    // photons: wavy packets flying outward
    for (const p of photons) {
      p.life += dt;
      const dist = p.life * 240;
      const ux = Math.cos(p.a), uy = Math.sin(p.a);
      ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.globalAlpha = Math.max(0, 1 - p.life / 1.3);
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let k = 0; k <= 36; k++) {
        const s = dist + k, wv = Math.sin(k * 0.7 - p.life * 30) * 4 * Math.sin((k / 36) * Math.PI);
        const x = p.x + ux * s - uy * wv, y = p.y + uy * s + ux * wv;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    photons = photons.filter(p => p.life < 1.3);

    // energy meter
    ctx.fillStyle = 'rgba(141,145,166,0.7)'; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`${e.Z} protons · ${Math.round(e.mass) - e.Z} neutrons · ${e.Z} electrons`, 4, H - 6);
    requestAnimationFrame(frame);
  }
  return {
    set, resize,
    start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
    stop() { running = false; },
  };
})();

function drawSpectrum(e) {
  const cv = $('#spectrum'), ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  let lines = SPECTRA[e.sym], measured = !!lines;
  if (!lines) {
    let seed = e.Z * 7919; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    lines = Array.from({ length: 3 + (e.Z % 6) }, () => 400 + rnd() * 300);
  }
  const x = nm => ((nm - 380) / 370) * W;
  for (const nm of lines) {
    const c = wavelengthRGB(nm);
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12;
    ctx.fillRect(x(nm) - 1, 0, 2, H);
  }
  ctx.shadowBlur = 0;
  $('#specNote').textContent = measured ? 'measured emission lines' : 'stylized lines (measured data not included here)';
}

/* ---------------- detail drawer ---------------- */
const drawer = $('#detail');
let lastFocus = null;
function openDetail(Z) {
  const e = el(Z);
  state.open = Z;
  hideHoverCard();
  const sheet = $('.sheet', drawer);
  sheet.style.setProperty('--dc', e.color);
  $('#dSym').textContent = e.sym;
  $('#dZ').textContent = `Element ${e.Z}${e.group ? ` · Group ${e.group}` : ' · f-block'} · Period ${e.period}`;
  $('#dName').textContent = e.name;
  $('#dCat').innerHTML = `<span class="pill" style="color:${e.color}">${CATS[e.cat].name}</span>` +
    (e.radioactive ? '<span class="pill" style="color:#c6ff4a">Radioactive</span>' : '') +
    (e.synthetic ? '<span class="pill" style="color:var(--muted)">Synthetic</span>' : '') +
    `<span class="pill" style="color:var(--muted)">${phaseAt(e, 298)} at room temp</span>`;
  $('#dLook').textContent = e.look + '.';
  $('#dFact').textContent = e.fact;
  $('#dShells').innerHTML = `Electrons per shell: <b>${e.shells.join(' · ')}</b>`;

  // photo
  const img = $('#dImg'), no = $('#dNo'), cap = $('#dCap');
  img.classList.remove('ok'); img.removeAttribute('src'); img.alt = `Photo of ${e.name}`;
  no.hidden = true; cap.textContent = 'Loading photo…';
  const noPhoto = msg => { no.hidden = false; no.innerHTML = `<div><div class="orb"></div>${msg}</div>`; };
  if (e.Z >= 100) { noPhoto(`No one has ever seen a visible piece of ${e.name}. It has only been made a few atoms at a time, and they decay within seconds or less.`); cap.textContent = ''; }
  getPhoto(e).then(p => {
    if (state.open !== Z) return;
    if (!p) { if (e.Z < 100) { noPhoto(`No photo available offline. Connect to the internet to load ${e.name}'s photo from Wikipedia.`); cap.textContent = ''; } return; }
    img.onload = () => img.classList.add('ok');
    img.onerror = () => { img.src = p.thumb; };
    img.src = p.big;
    cap.innerHTML = `Photo: <a href="${p.page}" target="_blank" rel="noopener">${p.file || e.name} · Wikimedia Commons</a>`;
  });

  // stats
  const enPct = e.en ? (e.en / 4) * 100 : 0;
  const dPct = e.density ? ((Math.log10(e.density) + 4) / (Math.log10(23) + 4)) * 100 : 0;
  $('#dStats').innerHTML = `
    <div class="stat"><span>Atomic mass</span><b>${fmtMass(e)}</b><i>${e.mass > 200 ? 'heavier than 200 hydrogen atoms' : `${(e.mass / 1.008).toFixed(1)}× hydrogen`}</i></div>
    <div class="stat"><span>Electronegativity</span><b>${e.en ?? '—'}</b><div class="meter"><div style="width:0" data-w="${enPct}"></div></div></div>
    <div class="stat"><span>Density</span><b>${fmtDensity(e.density)}</b><div class="meter"><div style="width:0" data-w="${dPct}"></div></div></div>
    <div class="stat"><span>Discovered</span><b>${fmtYear(e)}</b></div>
    <div class="stat"><span>At ${fmtK(state.T)}</span><b>${phaseAt(e, state.T)}</b><i>set on the main slider</i></div>
    <div class="stat"><span>Outer electrons</span><b>${e.shells[e.shells.length - 1]}</b><i>these do the chemistry</i></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $$('#dStats .meter > div').forEach(d => (d.style.width = d.dataset.w + '%'))));

  // thermometer (log scale 1 K → 7,000 K)
  const lx = K => (clamp(Math.log10(K) / Math.log10(7000), 0, 1) * 100).toFixed(2) + '%';
  const th = $('#thermo');
  let tm = `<div class="bar"></div>`;
  if (e.mp != null) tm += `<div class="solid" style="width:${lx(e.mp)}"></div><div class="mk" style="left:${lx(e.mp)}"><em>melts</em></div>`;
  if (e.bp != null && e.bp !== e.mp) tm += `<div class="mk" style="left:${lx(e.bp)}"><em>boils</em></div>`;
  tm += `<div class="mk room" style="left:${lx(298)}"><em>you</em></div>`;
  th.innerHTML = tm;
  $('#thermoNote').textContent = e.mp == null && e.bp == null ? 'never measured'
    : e.mp == null ? `never freezes at normal pressure · boils ${fmtC(e.bp)}`
    : e.mp === e.bp ? `turns straight to gas at ${fmtC(e.mp)}`
    : `melts ${fmtC(e.mp)}${e.bp ? ` · boils ${fmtC(e.bp)}` : ''}`;

  // density tank
  const cube = $('#cube'), tt = $('#tankText');
  cube.getAnimations().forEach(a => a.cancel());
  const d = e.density;
  cube.hidden = d == null;
  if (d == null) tt.innerHTML = `Never made in a visible amount, so its density is only a guess.`;
  else if (d < 0.01) {
    tt.innerHTML = `<b>A gas.</b> A whole liter of ${e.name.toLowerCase()} weighs ${(d * 1000).toFixed(2)} g. Bottle it, open it under water, and it bubbles straight up.`;
    if (!REDUCED) cube.animate([{ top: '96px', opacity: 0.9, transform: 'scale(.6)' }, { top: '40px', opacity: 0.7, transform: 'scale(.8)' }, { top: '-40px', opacity: 0, transform: 'scale(1.3)' }], { duration: 2600, iterations: Infinity, easing: 'ease-in' });
  } else {
    const floats = d < 1;
    const final = floats ? 44 + 30 * d - 30 : 98;
    tt.innerHTML = floats
      ? `<b>Floats.</b> At ${d} g/cm³ it is lighter than water. A 10 cm cube would weigh ${(d).toFixed(2)} kg.`
      : `<b>Sinks.</b> ${d.toFixed(2)}× as dense as water. A 10 cm cube would weigh ${d.toFixed(1)} kg${d > 19 ? ', like a large dog' : d > 7 ? ', like a bowling ball' : ''}.`;
    const dur = floats ? 1600 : clamp(3200 / Math.sqrt(d), 700, 3000);
    cube.animate([{ top: '-36px' }, { top: '14px', offset: 0.2 }, { top: final + 'px' }], { duration: REDUCED ? 1 : dur, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
  }

  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  if (!lastFocus) lastFocus = document.activeElement;
  sheet.scrollTop = 0;
  requestAnimationFrame(() => { Bohr.set(e); Bohr.start(); drawSpectrum(e); });
  $('.close', drawer).focus({ preventScroll: true });
}
function closeDetail() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  state.open = null;
  Bohr.stop();
  if (lastFocus) { lastFocus.focus({ preventScroll: true }); lastFocus = null; }
}
$$('[data-close]', drawer).forEach(b => b.addEventListener('click', closeDetail));
$('#dPrev').addEventListener('click', () => openDetail(state.open > 1 ? state.open - 1 : 118));
$('#dNext').addEventListener('click', () => openDetail(state.open < 118 ? state.open + 1 : 1));
$('#dLab').addEventListener('click', () => {
  const Z = state.open;
  closeDetail();
  setView('lab');
  window.Lab && Lab.spawn(Z);
});
addEventListener('keydown', ev => {
  if (state.open) {
    if (ev.key === 'Escape') closeDetail();
    else if (ev.key === 'ArrowRight') $('#dNext').click();
    else if (ev.key === 'ArrowLeft') $('#dPrev').click();
  } else if (ev.key === '/' && document.activeElement.tagName !== 'INPUT' && state.view !== 'lab') {
    ev.preventDefault(); q.focus();
  }
});

// photo tilts with the cursor, with a moving glare
const tilt = $('.d-photo .tilt');
$('#dPhoto').addEventListener('pointermove', ev => {
  const r = tilt.getBoundingClientRect();
  const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
  tilt.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg) scale(1.02)`;
  tilt.style.setProperty('--gx', (x + 0.5) * 100 + '%');
  tilt.style.setProperty('--gy', (y + 0.5) * 100 + '%');
});
$('#dPhoto').addEventListener('pointerleave', () => (tilt.style.transform = ''));

/* ---------------- boot ---------------- */
window.App = { openDetail, setView, getPhoto, state, fmtC, wavelengthRGB };
refresh();
const startView = (location.hash || '').slice(1);
if (['spiral', 'timeline', 'lab'].includes(startView)) setView(startView);
else applyLayout(false);
