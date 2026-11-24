/* =========================================================
   FOR ASEL — qosımsha logikası (tek ǵana HTML / CSS / JS)
   ========================================================= */
(() => {
'use strict';

/* ---------- Turaqlılar hám járdemshiler ---------- */
const TARGET = new Date(2027, 0, 14, 23, 59, 0);   // 2027-jıl 14-yanvar, 23:59 (jergilikli waqıt)
const END_DAY = new Date(2027, 0, 14);
const ALARM = new Date(2027, 0, 14, 0, 0, 0);     // 13-yanvardan keyin, túngi 00:00 — kúshli oyatqısh
const QUESTIONS = [
  { q: 'Tayarsań ba?', a: ['Awa, tayarman', 'Ele emes'] },
  { q: 'Hámme nárse sen oylaǵanday ma?', a: ['Awa, hámmesi', 'Joq, basqasha'] },
  { q: 'Ózińnen maqtanasań ba?', a: ['Álbette', 'Azıraq'] },
];
const KEY = 'forasel.v1';
const HEART = 'M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.9 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.8 0 5.8 4.1 4.3 7.4C19.5 16.4 12 21 12 21z';
const EX = ['push', 'abs'];
const RING = 2 * Math.PI * 52;

/* Qaraqalpaq tilindegi sáneler */
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['Ekshembi', 'Dúyshembi', 'Siyshembi', 'Sárshembi', 'Piyshembi', 'Juma', 'Shembi'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtShort = d => `${d.getDate()}-${MONTHS[d.getMonth()]}`;
const fmtLong = d => `${WEEKDAYS[d.getDay()]}, ${fmtShort(d)}`;
const fmtStamp = t => { const d = new Date(t); return `${fmtShort(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const num = n => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const parseAmt = v => parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
const haptic = (ms = 10) => {
  try {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate && navigator.vibrate(ms);
  } catch (e) {}
};
const heartSVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${HEART}"/></svg>`;
const ICON = {
  trash: '<svg viewBox="0 0 24 24" class="st"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  lock: '<svg viewBox="0 0 24 24" class="st"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" class="st"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
  image: '<svg viewBox="0 0 24 24" class="st"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" class="st"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/></svg>',
};

/* ---------- Jaǵday (localStorage) ---------- */
const defaults = () => ({
  start: dkey(new Date()),
  target: 100,
  names: { push: 'Otjimaniya', abs: 'Press' },
  currency: '₸',
  goal: 0,
  days: {},      // 'YYYY-MM-DD' -> {push, abs}
  words: [],     // {id, text, date}
  savings: [],   // {id, amount, note, date}
  happy: false,  // haqıyqıy kúni «Biz baxıtlımız» basıldı
  started: false, // «Tayarman» basılmaǵansha hesh nárse baslanbaydı
  sound: true,    // hár sekundtaǵı saat sesi
  alarm: null,    // {done, answers:[{q,a}], at}
});
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = Object.assign(defaults(), JSON.parse(raw));
      s.names = Object.assign(defaults().names, s.names);
      if (s.names.push === 'Push-ups') s.names.push = 'Otjimaniya';   // eski inglisshe atlardı awdarıw
      if (s.names.abs === 'Abs') s.names.abs = 'Press';
      return s;
    }
  } catch (e) {}
  return defaults();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Yad tolı — rezerv nusqa saqla'); }
}
save();

/* ---------- Súwretler (IndexedDB) ---------- */
const DB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('forasel', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('photos', mode);
      const req = fn(t.objectStore('photos'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    all: () => tx('readonly', s => s.getAll()),
    put: p => tx('readwrite', s => s.put(p)),
    del: id => tx('readwrite', s => s.delete(id)),
  };
})();

let photos = [];
const urls = new Map();
const purl = p => { if (!urls.has(p.id)) urls.set(p.id, URL.createObjectURL(p.blob)); return urls.get(p.id); };

function compress(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1800, sc = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(u);
      c.toBlob(b => b ? res({ blob: b, w, h }) : rej(new Error('encode')), 'image/jpeg', .86);
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); };
    img.src = u;
  });
}

/* ---------- Ses (Web Audio — faylsız, sintez) ---------- */
const Sound = (() => {
  let ctx = null, master = null, siren = null, vibT = 0, pendingSiren = false, tock = false;
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // iPhone: «tıynısh» rejimde de esitiledi
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -8; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = 1;
      master.connect(comp); comp.connect(ctx.destination);
    }
    return ctx;
  }
  const running = () => ctx && ctx.state === 'running';
  function unlock() {
    if (!ensure()) return;
    const go = () => { if (pendingSiren) { pendingSiren = false; sirenStart(); } };
    if (ctx.state !== 'running') ctx.resume().then(go).catch(() => {}); else go();
  }
  /* Saat tilleri: tik-tak */
  function tick() {
    if (!running()) return;
    const t = ctx.currentTime; tock = !tock;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = tock ? 1400 : 1900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.05);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.setValueAtTime(tock ? 520 : 700, t); o2.frequency.exponentialRampToValueAtTime(110, t + 0.06);
    g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o2.connect(g2).connect(master); o2.start(t); o2.stop(t + 0.09);
  }
  /* Kúshli oyatqısh: eki tonlı sirena + tez pulsaciya + distorsiya */
  function sirenStart() {
    if (siren || !ensure()) return;
    if (!running()) { pendingSiren = true; ctx.resume().then(() => { if (pendingSiren) { pendingSiren = false; sirenStart(); } }).catch(() => {}); return; }
    const t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(1, t + 0.25);
    const shaper = ctx.createWaveShaper(); const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
    shaper.curve = curve;
    const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 1000;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 500;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 2;
    const l1 = ctx.createGain(); l1.gain.value = 350; const l2 = ctx.createGain(); l2.gain.value = 175;
    lfo.connect(l1).connect(o1.frequency); lfo.connect(l2).connect(o2.frequency);
    const gate = ctx.createGain(); gate.gain.value = 0.6;
    const plfo = ctx.createOscillator(); plfo.type = 'square'; plfo.frequency.value = 8;
    const pg = ctx.createGain(); pg.gain.value = 0.4; plfo.connect(pg).connect(gate.gain);
    o1.connect(gate); o2.connect(gate); gate.connect(shaper).connect(out).connect(master);
    const nodes = [o1, o2, lfo, plfo]; nodes.forEach(n => n.start());
    siren = { out, nodes };
  }
  function sirenStop() {
    pendingSiren = false;
    clearInterval(vibT); vibT = 0; try { navigator.vibrate && navigator.vibrate(0); } catch (e) {}
    if (!siren) return;
    const t = ctx.currentTime, s = siren; siren = null;
    s.out.gain.cancelScheduledValues(t); s.out.gain.setValueAtTime(s.out.gain.value, t); s.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    s.nodes.forEach(n => { try { n.stop(t + 0.25); } catch (e) {} });
  }
  function vibrateLoop() { clearInterval(vibT); haptic([600, 200, 600]); vibT = setInterval(() => haptic([600, 200, 600]), 1500); }
  return { unlock, tick, sirenStart, sirenStop, vibrateLoop, isPending: () => pendingSiren, running };
})();
document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
document.addEventListener('keydown', () => Sound.unlock());

/* Ekran óshpesin (13-yanvar keshi) */
let wakeLock = null;
async function keepAwake() {
  try {
    if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {}
}

/* ---------- UI tiykarları ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2300);
}
function openOv(el) { el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open'))); }
function closeOv(el, ms = 450) { el.classList.remove('open'); setTimeout(() => { if (!el.classList.contains('open')) el.hidden = true; }, ms); }
function ask(title, msg, ok = 'Óshiriw') {
  return new Promise(res => {
    const w = $('#ask');
    $('#askTitle').textContent = title; $('#askMsg').textContent = msg; $('#askOk').textContent = ok;
    openOv(w);
    const done = v => { closeOv(w, 300); $('#askOk').onclick = $('#askCancel').onclick = null; res(v); };
    $('#askOk').onclick = () => done(true);
    $('#askCancel').onclick = () => done(false);
  });
}

/* Scroll animaciyası */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .08 });
function observe(root = document) {
  $$('.reveal:not(.in)', root).forEach((el, i) => { el.style.setProperty('--d', `${Math.min(i, 6) * 70}ms`); io.observe(el); });
}

/* Kishkene júrekler hám ushıp shıǵatuǵın sanlar */
function floatNum(el, text) {
  const r = el.getBoundingClientRect();
  const s = document.createElement('span'); s.className = 'float-num'; s.textContent = text;
  s.style.left = `${r.left + r.width / 2 - 14}px`; s.style.top = `${r.top - 8}px`;
  document.body.appendChild(s); setTimeout(() => s.remove(), 950);
}
function burstFrom(el, n = 14) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const h = document.createElement('span'); h.className = 'mini-heart'; h.innerHTML = heartSVG;
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
    h.style.left = `${r.left + r.width / 2 - 8}px`; h.style.top = `${r.top + r.height / 2 - 8}px`;
    h.style.setProperty('--tx', `${Math.cos(a) * d}px`); h.style.setProperty('--ty', `${Math.sin(a) * d - 40}px`);
    h.style.setProperty('--tr', `${(Math.random() - .5) * 80}deg`);
    h.style.animationDelay = `${Math.random() * 120}ms`;
    document.body.appendChild(h); setTimeout(() => h.remove(), 1400);
  }
}

/* ---------- Betler arasında swipe ---------- */
const pager = $('#pager'), pages = $$('.page'), tabs = $$('.tab'), ind = $('#tabInd');
let current = 0, raf = 0;
function goTo(i, smooth = true) { pager.scrollTo({ left: i * pager.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); }
tabs.forEach((t, i) => t.addEventListener('click', () => {
  haptic(6);
  if (i === current) pages[i].scrollTo({ top: 0, behavior: 'smooth' });
  goTo(i);
}));
pager.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; onPager(); }); }, { passive: true });
function onPager() {
  const w = pager.clientWidth || 1, pos = pager.scrollLeft / w;
  pages.forEach((p, i) => {
    const o = i - pos, a = Math.min(1, Math.abs(o));
    const inner = p.firstElementChild;
    inner.style.transform = a < .001 ? '' : `translate3d(${-o * 18}%,0,0) scale(${1 - a * .08})`;
    inner.style.opacity = 1 - a * .65;
  });
  ind.style.transform = `translateX(${pos * 100}%)`;
  const idx = Math.round(pos);
  if (idx !== current) { current = idx; tabs.forEach((t, i) => t.classList.toggle('active', i === idx)); }
}
addEventListener('resize', () => goTo(current, false));
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea') || !$('#lightbox').hidden) return;
  if (e.key === 'ArrowRight') goTo(Math.min(pages.length - 1, current + 1));
  if (e.key === 'ArrowLeft') goTo(Math.max(0, current - 1));
});

/* ---------- Keri sanaw + joqarǵı panel ---------- */
let lastDay = dkey(new Date()), autoShown = false;
function tick() {
  const now = new Date();
  const ms = TARGET - now;
  if (ms <= 0) {
    ['#cdD', '#cdH', '#cdM', '#cdS'].forEach(s => $(s).textContent = '00');
    if (S.started && !S.happy && !autoShown && $('#finale').hidden) { autoShown = true; openFinale(false); }
  } else {
    $('#cdD').textContent = pad(Math.floor(ms / 864e5));
    $('#cdH').textContent = pad(Math.floor(ms / 36e5) % 24);
    $('#cdM').textContent = pad(Math.floor(ms / 6e4) % 60);
    $('#cdS').textContent = pad(Math.floor(ms / 1e3) % 60);
  }
  // Saat tilleri hár sekund
  if (S.started && S.sound && ms > 0 && !alarmOpen && document.visibilityState === 'visible') Sound.tick();
  // 14-yanvar 00:00 — oyatqısh
  if (S.started && !(S.alarm && S.alarm.done) && now >= ALARM && ms > 0 && !alarmOpen) openAlarm(false);
  if (S.started && ALARM - now < 3 * 36e5 && ms > 0) keepAwake();
  const left = $('#alarmLeft');
  if (left) { const r = Math.max(0, ms); left.textContent = `${pad(Math.floor(r / 36e5))}:${pad(Math.floor(r / 6e4) % 60)}:${pad(Math.floor(r / 1e3) % 60)}`; }
  const k = dkey(now);
  if (k !== lastDay) { if (viewDay === lastDay) viewDay = k; lastDay = k; renderAll(); }
  else if (now.getSeconds() === 0) { renderHeader(); renderJourney(); }
}
function renderHeader() {
  const now = new Date(), ms = TARGET - now;
  const days = Math.ceil(ms / 864e5);
  $('#daysChip').textContent = ms <= 0 ? 'Waqıt keldi ❤' : days === 1 ? 'Sońǵı kún' : `${days} kún qaldı`;
  const st = parseKey(S.start);
  const p = Math.max(0, Math.min(1, (now - st) / (TARGET - st)));
  $('#jbFill').style.width = `${p * 100}%`;
  $('#jbPct').textContent = `${(p * 100).toFixed(1)}%`;
  $('#jbStart').textContent = `Baslandı: ${fmtShort(st)}`;
  $('#todayDate').textContent = fmtLong(now);
}

/* ---------- Búgin / shınıǵıwlar ---------- */
let viewDay = dkey(new Date());
const dayData = k => S.days[k] || { push: 0, abs: 0 };
function buildEx() {
  $('#exList').innerHTML = EX.map(k => `
  <article class="card ex-card reveal" data-ex="${k}">
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="52"/>
        <circle class="ring-fg" cx="60" cy="60" r="52"/>
      </svg>
      <div class="ring-center"><b class="count">0</b><small class="of">/ 100</small></div>
    </div>
    <div class="ex-body">
      <div class="ex-top"><h3 class="ex-name"></h3><span class="badge">Tayın</span></div>
      <p class="ex-sub"></p>
    </div>
    <div class="steps">
      <button class="step minus" data-add="-5">−5</button>
      <button class="step" data-add="1">+1</button>
      <button class="step" data-add="5">+5</button>
      <button class="step" data-add="10">+10</button>
      <button class="step hot" data-add="25">+25</button>
    </div>
  </article>`).join('');
  $('#exList').addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    addReps(b.closest('[data-ex]').dataset.ex, +b.dataset.add, b);
  });
}
function addReps(k, n, btn) {
  const d = { push: 0, abs: 0, ...dayData(viewDay) };
  const before = d[k] || 0;
  d[k] = Math.max(0, Math.min(9999, before + n));
  if (d[k] === before) return;
  S.days[viewDay] = d; save();
  haptic(n > 0 ? 8 : 4);
  floatNum(btn, n > 0 ? `+${n}` : `${n}`);
  updateEx(k);
  const T = S.target;
  if (before < T && d[k] >= T) {
    burstFrom(btn.closest('.card').querySelector('.ring-wrap'), 18);
    toast(`${S.names[k]} — búginge tayın ❤`);
    haptic(40);
    if (d.push >= T && d.abs >= T) setTimeout(() => toast('Mınsız kún. Ózimizden maqtanaman ❤'), 1400);
  }
  renderStats(); renderJourney();
}
function updateEx(bumpKey) {
  const d = dayData(viewDay), T = S.target;
  $$('.ex-card').forEach(card => {
    const k = card.dataset.ex, v = d[k] || 0, p = Math.min(1, v / T);
    card.querySelector('.ex-name').textContent = S.names[k];
    const c = card.querySelector('.count'); c.textContent = v;
    card.querySelector('.of').textContent = `/ ${T}`;
    const fg = card.querySelector('.ring-fg');
    fg.style.strokeDashoffset = RING * (1 - p);
    fg.style.opacity = v > 0 ? 1 : 0;
    card.querySelector('.ex-sub').textContent = v >= T ? (v > T ? `+${v - T} artıq — ájayıp!` : 'Maqsetke jettiń ❤') : `${T - v} qaldı`;
    card.classList.toggle('done', v >= T);
    if (k === bumpKey) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  });
}
function renderToday() {
  const today = dkey(new Date());
  if (viewDay > today) viewDay = today;
  $('#dayLabel').textContent = viewDay === today ? 'Búgin' : fmtLong(parseKey(viewDay));
  $('#dayNext').disabled = viewDay >= today;
  $('#dayPrev').disabled = viewDay <= S.start;
  updateEx();
}
function shiftDay(n) {
  const d = parseKey(viewDay); d.setDate(d.getDate() + n);
  const k = dkey(d), today = dkey(new Date());
  if (k > today || k < S.start) return;
  viewDay = k; haptic(5); renderToday();
}
$('#dayPrev').onclick = () => shiftDay(-1);
$('#dayNext').onclick = () => shiftDay(1);

function totals() {
  let push = 0, abs = 0, perfect = 0; const T = S.target;
  for (const k in S.days) { const d = S.days[k]; push += d.push || 0; abs += d.abs || 0; if ((d.push || 0) >= T && (d.abs || 0) >= T) perfect++; }
  return { push, abs, perfect };
}
function streak() {
  const T = S.target, ok = k => { const x = S.days[k]; return x && (x.push || 0) >= T && (x.abs || 0) >= T; };
  const d = new Date(); let n = 0;
  if (!ok(dkey(d))) d.setDate(d.getDate() - 1);
  while (ok(dkey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function statsHTML(t, extra = []) {
  return [
    ...extra,
    [num(t.push), `${esc(S.names.push)} · jámi`],
    [num(t.abs), `${esc(S.names.abs)} · jámi`],
  ].map(([v, l], i) => `<div class="card stat reveal ${i === 0 ? 'accent' : ''}"><b>${v}</b><span>${l}</span></div>`).join('');
}
function renderStats() {
  const t = totals(), s = streak();
  $('#stats').innerHTML = statsHTML(t, [[`${s}🔥`, 'Izbe-iz kún'], [t.perfect, 'Mınsız kúnler']]);
  $$('#stats .reveal').forEach(el => el.classList.add('in'));
}

/* ---------- Sózler ---------- */
const wi = $('#wordInput');
wi.addEventListener('input', () => { $('#wordCount').textContent = `${wi.value.length} belgi`; });
$('#wordSave').onclick = () => {
  const text = wi.value.trim();
  if (!text) { wi.focus(); toast('Aldın júrekten bir nárse jaz'); return; }
  S.words.unshift({ id: uid(), text, date: Date.now() }); save();
  wi.value = ''; $('#wordCount').textContent = '0 belgi';
  haptic(15); burstFrom($('#wordSave'), 10); toast('Saqlandı. Ol bunı oqıydı ❤');
  renderWords();
};
function wordCard(w, del = true) {
  return `<article class="card word reveal" data-id="${w.id}">
    <div class="word-meta"><span>${fmtStamp(w.date)}</span>${del ? `<button class="icon-btn sm del" data-del-word aria-label="Óshiriw">${ICON.trash}</button>` : ''}</div>
    <span class="quote">“</span>
    <p class="word-text">${esc(w.text)}</p>
  </article>`;
}
function renderWords() {
  const L = $('#wordList');
  L.innerHTML = S.words.length ? S.words.map(w => wordCard(w)).join('')
    : `<div class="empty">${ICON.pen}<br>Ele sózler joq.<br>14-yanvarda oǵan aytatuǵın sózlerińdi jaz.</div>`;
  observe(L);
}
$('#wordList').addEventListener('click', async e => {
  const b = e.target.closest('[data-del-word]'); if (!b) return;
  const id = b.closest('[data-id]').dataset.id;
  if (await ask('Bul sózlerdi óshiresiz be?', 'Bunı qaytarıp bolmaydı.')) { S.words = S.words.filter(w => w.id !== id); save(); renderWords(); }
});

/* ---------- Jıynaq ---------- */
const money = n => `${num(n)} ${S.currency}`.trim();
const savedTotal = () => S.savings.reduce((a, b) => a + (+b.amount || 0), 0);
function renderSavings() {
  const tot = savedTotal(), g = +S.goal || 0;
  $('#moneyTotal').textContent = money(tot);
  $('#goalWrap').innerHTML = g > 0
    ? `<div class="bar"><i style="width:${Math.min(100, tot / g * 100)}%"></i></div>
       <div class="bar-meta"><span>${money(g)} dan ${Math.round(tot / g * 100)}%</span><span>${tot >= g ? 'Maqsetke jettiń ❤' : money(g - tot) + ' qaldı'}</span></div>`
    : `<button class="link" data-open-settings>Jıynaq maqsetin belgilew ›</button>`;
  const L = $('#moneyList');
  L.innerHTML = S.savings.length ? S.savings.map(s => `
    <article class="card item reveal" data-id="${s.id}">
      <div class="item-main"><div class="item-title">${esc(s.note || (s.amount >= 0 ? 'Jıynaldı' : 'Alındı'))}</div><div class="item-sub">${fmtStamp(s.date)}</div></div>
      <span class="amount ${s.amount < 0 ? 'neg' : ''}">${s.amount >= 0 ? '+' : '−'}${money(Math.abs(s.amount))}</span>
      <button class="icon-btn sm del" data-del-money aria-label="Óshiriw">${ICON.trash}</button>
    </article>`).join('')
    : `<div class="empty">${ICON.wallet}<br>Hár bir tıyın áhmiyetli.<br>Ol ushın birinshi jıynaǵıńdı qos.</div>`;
  observe(L);
}
$('#moneyChips').addEventListener('click', e => {
  const b = e.target.closest('[data-v]'); if (!b) return;
  const cur = parseAmt($('#moneyAmt').value) || 0;
  $('#moneyAmt').value = cur + +b.dataset.v; haptic(5);
});
$('#moneyAdd').onclick = () => {
  const a = parseAmt($('#moneyAmt').value);
  if (!a || !isFinite(a)) { $('#moneyAmt').focus(); toast('Muǵdardı kirgiz'); return; }
  S.savings.unshift({ id: uid(), amount: a, note: $('#moneyNote').value.trim(), date: Date.now() }); save();
  $('#moneyAmt').value = ''; $('#moneyNote').value = '';
  haptic(15); if (a > 0) burstFrom($('#moneyAdd'), 10);
  toast(a > 0 ? `+${money(a)} jıynaldı ❤` : 'Alıw jazıp alındı');
  renderSavings();
};
$('#moneyList').addEventListener('click', async e => {
  const b = e.target.closest('[data-del-money]'); if (!b) return;
  const id = b.closest('[data-id]').dataset.id;
  if (await ask('Bul jazbanı óshiresiz be?', 'Jámi muǵdar jańalanadı.')) { S.savings = S.savings.filter(s => s.id !== id); save(); renderSavings(); }
});

/* ---------- Súwretler ---------- */
async function loadPhotos() {
  try { photos = (await DB.all()).sort((a, b) => b.date - a.date); } catch (e) { photos = []; }
  renderPhotos();
}
function galleryHTML() {
  return photos.map((p, i) => `<button class="ph reveal" data-ph="${i}" style="aspect-ratio:${p.w}/${p.h}"><img src="${purl(p)}" alt="" loading="lazy"></button>`).join('');
}
function renderPhotos() {
  $('#photoCount').textContent = photos.length ? `${photos.length} sát` : 'Bizdiń sátlerimiz';
  const g = $('#gallery');
  g.innerHTML = photos.length ? galleryHTML() : `<div class="empty" style="column-span:all">${ICON.image}<br>Ele súwretler joq.<br>Esińde qalatuǵın sátlerdi qos.</div>`;
  observe(g);
}
$('#photoInput').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  toast(`${files.length} súwret qosılmaqta…`);
  let ok = 0;
  for (const f of files) {
    try { const { blob, w, h } = await compress(f); await DB.put({ id: uid(), blob, w, h, date: Date.now() }); ok++; } catch (err) {}
  }
  await loadPhotos();
  toast(ok ? `${ok} súwret saqlandı ❤` : 'Bul súwretti ashıw múmkin bolmadı');
});

/* Lightbox */
let lbIndex = 0;
function openLB(i) { lbIndex = i; showLB(); openOv($('#lightbox')); }
function showLB() {
  const p = photos[lbIndex]; if (!p) return closeOv($('#lightbox'));
  $('#lbImg').src = purl(p);
  $('#lbDate').textContent = `${lbIndex + 1} / ${photos.length} · ${fmtShort(new Date(p.date))}`;
}
const lbStep = n => { if (!photos.length) return; lbIndex = (lbIndex + n + photos.length) % photos.length; showLB(); haptic(4); };
document.addEventListener('click', e => { const b = e.target.closest('[data-ph]'); if (b) openLB(+b.dataset.ph); });
$('#lbPrev').onclick = () => lbStep(-1);
$('#lbNext').onclick = () => lbStep(1);
$('#lbClose').onclick = () => closeOv($('#lightbox'));
$('#lbDel').onclick = async () => {
  const p = photos[lbIndex]; if (!p) return;
  if (!(await ask('Bul súwretti óshiresiz be?', 'Ol usı qurılmadan óshiriledi.'))) return;
  await DB.del(p.id); URL.revokeObjectURL(urls.get(p.id)); urls.delete(p.id);
  await loadPhotos();
  if (!photos.length) closeOv($('#lightbox')); else { lbIndex = Math.min(lbIndex, photos.length - 1); showLB(); }
};
(() => {
  let x0 = null; const lb = $('#lightbox');
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1); x0 = null; });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'ArrowRight') lbStep(1); if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'Escape') closeOv(lb);
  });
})();

/* ---------- Jolımız ---------- */
function dayRange() {
  const out = [], d = parseKey(S.start);
  while (d <= END_DAY) { out.push(dkey(d)); d.setDate(d.getDate() + 1); }
  return out;
}
function heatHTML(interactive = true) {
  const T = S.target, today = dkey(new Date()), days = dayRange();
  if (!days.length) return '';
  const offset = (parseKey(days[0]).getDay() + 6) % 7;   // dúyshembiden baslap
  let h = '<span class="cell blank"></span>'.repeat(offset);
  h += days.map(k => {
    const x = S.days[k] || {}, p = (Math.min(x.push || 0, T) + Math.min(x.abs || 0, T)) / (2 * T);
    const lvl = p === 0 ? 0 : p < .34 ? 1 : p < .67 ? 2 : p < 1 ? 3 : 4;
    const fut = k > today, tag = interactive ? 'button' : 'span';
    return `<${tag} class="cell l${lvl}${k === today ? ' today' : ''}${fut ? ' future' : ''}" ${interactive ? `data-day="${k}" ${fut ? 'disabled' : ''}` : ''} title="${fmtShort(parseKey(k))} · ${x.push || 0} / ${x.abs || 0}">${parseKey(k).getDate()}</${tag}>`;
  }).join('');
  return h;
}
function dayLogHTML() {
  const T = S.target;
  const keys = Object.keys(S.days).filter(k => (S.days[k].push || 0) + (S.days[k].abs || 0) > 0).sort().reverse();
  if (!keys.length) return `<div class="empty">Kúnlik nátiyjeleriń usı jerde kórinedi.</div>`;
  return keys.map(k => {
    const d = S.days[k], perfect = (d.push || 0) >= T && (d.abs || 0) >= T;
    return `<article class="card item reveal">
      <div class="item-main"><div class="item-title">${fmtLong(parseKey(k))} ${perfect ? '❤' : ''}</div>
      <div class="item-sub">${esc(S.names.push)} ${d.push || 0} · ${esc(S.names.abs)} ${d.abs || 0}</div></div>
      <div class="log-bars">
        <div class="bar"><i style="width:${Math.min(100, (d.push || 0) / T * 100)}%"></i></div>
        <div class="bar"><i style="width:${Math.min(100, (d.abs || 0) / T * 100)}%"></i></div>
      </div>
    </article>`;
  }).join('');
}
function renderJourney() {
  const unlocked = new Date() >= TARGET;
  const days = Math.max(0, Math.ceil((TARGET - new Date()) / 864e5));
  $('#finaleCard').innerHTML = unlocked
    ? `<div class="lock open">${heartSVG}</div><h3>Waqıt keldi ❤</h3><p>Endi hámmesi ashıq.</p>
       <button class="btn primary" data-open-finale>${S.happy ? 'Tariyxımızdı ashıw' : 'Sıylıqtı ashıw'}</button>`
    : `<div class="lock">${ICON.lock}</div><h3>Tosınnan sıylıq</h3><p>14-yanvar saat 23:59 da ashıladı · ${days} kúnnen keyin</p>`;
  $('#heat').innerHTML = heatHTML(true);
  const L = $('#dayLog'); L.innerHTML = dayLogHTML(); observe(L);
}
$('#heat').addEventListener('click', e => {
  const c = e.target.closest('[data-day]'); if (!c || c.disabled) return;
  viewDay = c.dataset.day; renderToday(); goTo(0); haptic(6);
});
document.addEventListener('click', e => {
  if (e.target.closest('[data-open-finale]')) { if (S.happy) openStory(); else openFinale(false); }
  if (e.target.closest('[data-open-settings]')) openSettings('#setGoal');
});

/* ---------- Final: 14-yanvar, 23:59 ---------- */
const FX = (() => {
  let cv, ctx, parts = [], running = false, dpr = 1, W = 0, H = 0;
  const heart = new Path2D(HEART);
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  const colors = ['#ff2d46', '#ff6b81', '#ff2d46', '#c4001e', '#ffffff'];
  function ambient() {
    parts.push({ x: Math.random() * W, y: H + 20, vx: (Math.random() - .5) * .4, vy: -(.5 + Math.random() * 1.1), s: .5 + Math.random() * 1.2, r: Math.random() * 6.28, vr: (Math.random() - .5) * .03, life: 0, max: 500 + Math.random() * 500, c: colors[Math.random() * colors.length | 0] });
  }
  function burst() {
    const cx = W / 2, cy = H * .5;
    for (let i = 0; i < 180; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 11;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, s: .5 + Math.random() * 1.4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .25, life: 0, max: 110 + Math.random() * 110, c: colors[Math.random() * colors.length | 0], b: true });
    }
  }
  function frame() {
    if (!running) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (Math.random() < .16) ambient();
    parts = parts.filter(p => p.life < p.max && p.y > -80 && p.y < H + 80);
    for (const p of parts) {
      p.life++; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      let a;
      if (p.b) { p.vy += .17; p.vx *= .985; a = 1 - p.life / p.max; }
      else a = Math.min(.6, p.life / 60) * (1 - p.life / p.max);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.r) * .45); ctx.scale(p.s, p.s); ctx.translate(-12, -12.5);
      ctx.fillStyle = p.c; ctx.fill(heart); ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  return {
    start() { cv = $('#fx'); ctx = cv.getContext('2d'); size(); addEventListener('resize', size); if (!running) { running = true; frame(); } },
    stop() { running = false; parts = []; },
    burst,
  };
})();

let finalePreview = false;
function openFinale(preview) {
  finalePreview = preview;
  const f = $('#finale');
  f.classList.remove('happy');
  $('#fCongrats').hidden = true;
  let i = 0;
  $('#fTitle').innerHTML = 'Biz kóp miynet ettik'.split(' ')
    .map(w => `<span class="w">${[...w].map(ch => `<span class="ch" style="--i:${i++}">${ch}</span>`).join('')}</span>`).join(' ');
  const btn = $('#happyBtn'); btn.classList.remove('show');
  openOv(f); FX.start(); haptic(20);
  setTimeout(() => btn.classList.add('show'), 2900);
}
$('#happyBtn').onclick = () => {
  haptic([30, 40, 60]);
  const f = $('#finale'), t = totals(), days = Object.keys(S.days).filter(k => (S.days[k].push || 0) + (S.days[k].abs || 0) > 0).length;
  f.classList.add('happy'); FX.burst(); setTimeout(FX.burst, 700);
  const c = $('#fCongrats');
  c.innerHTML = `
    <h3>Qutlıqlaymız!</h3>
    <p>Biz bunı ámelge asırdıq. ${days} kún tártip, ${num(t.push)} ${esc(S.names.push.toLowerCase())}, ${num(t.abs)} ${esc(S.names.abs.toLowerCase())}, ${money(savedTotal())} jıynaq hám júrekten jazılǵan ${S.words.length} xat — bári de seniń ushın, Asel. Bul tek baslanıwı ❤</p>
    <div class="f-stats">
      ${[[num(t.push), S.names.push], [num(t.abs), S.names.abs], [money(savedTotal()), 'Jıynaldı'], [t.perfect, 'Mınsız kúnler']]
        .map(([v, l], i) => `<div class="card stat ${i === 2 ? 'accent' : ''}" style="animation-delay:${.5 + i * .12}s"><b>${v}</b><span>${esc(l)}</span></div>`).join('')}
    </div>
    <div class="f-actions">
      <button class="btn primary" id="toStory">Jolımızdı kóriw</button>
      <button class="btn ghost" id="closeFinale">Jabıw</button>
    </div>`;
  c.hidden = false;
  $('#toStory').onclick = () => { closeFinale(); openStory(); };
  $('#closeFinale').onclick = closeFinale;
  if (!finalePreview) { S.happy = true; save(); renderJourney(); }
};
function closeFinale() { closeOv($('#finale'), 1400); setTimeout(() => { if ($('#finale').hidden) FX.stop(); }, 1500); }

/* Tariyxımız: hámmesi birge */
function openStory() {
  const t = totals(), st = $('#story');
  const words = [...S.words].reverse();
  $('#storyInner').innerHTML = `
    <div class="page-head reveal"><p class="eyebrow">${fmtShort(parseKey(S.start))} → 14-yanvar</p><h2>Bizdiń tariyxımız</h2></div>
    <div class="stats">${statsHTML(t, [[money(savedTotal()), 'Oǵan jıynaldı'], [t.perfect, 'Mınsız kúnler']])}</div>
    <p class="section-title">Hár bir kún</p>
    <article class="card reveal">
      <div class="heat-head"><span>D</span><span>S</span><span>S</span><span>P</span><span>J</span><span>Sh</span><span>E</span></div>
      <div class="heat">${heatHTML(false)}</div>
    </article>
    ${S.alarm && S.alarm.answers && S.alarm.answers.length ? `<p class="section-title">14-yanvar, 00:00 — juwaplar</p>
      ${S.alarm.answers.map(x => `<article class="card answer reveal"><div class="item-title">${esc(x.q)}</div><div class="item-sub">${esc(x.a)}</div></article>`).join('')}` : ''}
    <p class="section-title">Saǵan sózlerim</p>
    ${words.length ? words.map(w => wordCard(w, false)).join('') : '<div class="empty">Sózler jazılmadı.</div>'}
    <p class="section-title">Bizdiń sátlerimiz</p>
    <div class="gallery">${photos.length ? galleryHTML() : '<div class="empty" style="column-span:all">Ele súwretler joq.</div>'}</div>
    <p class="section-title">Kúnnen-kúnge</p>
    <div class="list">${dayLogHTML()}</div>`;
  openOv(st); st.scrollTop = 0; observe(st);
}
$('#storyClose').onclick = () => closeOv($('#story'), 700);

/* ---------- Sazlawlar ---------- */
const sheetWrap = $('#settings');
function openSettings(focusSel) {
  $('#setN1').value = S.names.push; $('#setN2').value = S.names.abs;
  $('#setTarget').value = S.target; $('#setStart').value = S.start;
  $('#setCur').value = S.currency; $('#setGoal').value = S.goal || '';
  $('#setStart').max = dkey(new Date());
  openOv(sheetWrap);
  if (focusSel) setTimeout(() => $(focusSel).focus(), 500);
}
$('#settingsBtn').onclick = () => { haptic(6); openSettings(); };
sheetWrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeOv(sheetWrap, 550); });
const bindSet = (sel, fn) => $(sel).addEventListener('change', e => { fn(e.target.value.trim()); save(); renderAll(); });
bindSet('#setN1', v => { S.names.push = v || 'Otjimaniya'; });
bindSet('#setN2', v => { S.names.abs = v || 'Press'; });
bindSet('#setTarget', v => { const n = parseInt(v, 10); S.target = n > 0 ? Math.min(n, 1000) : 100; });
bindSet('#setStart', v => { if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= dkey(new Date())) { S.start = v; if (viewDay < v) viewDay = v; } });
bindSet('#setCur', v => { S.currency = v; });
bindSet('#setGoal', v => { const n = parseAmt(v); S.goal = n > 0 ? n : 0; });

/* Panel tómenge tartıp jabıladı */
(() => {
  const sh = $('.sheet', sheetWrap); let y0 = null, dy = 0;
  sh.addEventListener('touchstart', e => { if (sh.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.setProperty('--drag', `${dy}px`); }, { passive: true });
  sh.addEventListener('touchend', () => {
    if (y0 === null) return; y0 = null; sh.style.transition = '';
    sh.style.setProperty('--drag', '0px'); if (dy > 120) closeOv(sheetWrap, 550);
  });
})();

$('#previewBtn').onclick = () => { closeOv(sheetWrap, 550); setTimeout(() => openFinale(true), 400); };

/* Qosımsha sıpatında ornatıw (PWA) */
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
$('#installBtn').onclick = async () => {
  if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; return; }
  if (matchMedia('(display-mode: standalone)').matches) { toast('Ornatılǵan ❤'); return; }
  toast(/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'Safari → Bólisiw → Basqı ekranǵa qosıw' : 'Brauzer menyusı → Qosımshanı ornatıw');
};
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});

/* Basqı ekran ikonkası (iOS ushın PNG) */
function makeIcon(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, size, size);
  const s = size / 24 * .62;
  x.save(); x.translate(size / 2, size / 2 + size * .02); x.scale(s, s); x.translate(-11.8, -12.75);
  x.shadowColor = 'rgba(255,45,70,.85)'; x.shadowBlur = size * .1; x.fillStyle = '#ff2d46'; x.fill(new Path2D(HEART)); x.restore();
  return c.toDataURL('image/png');
}
try { $('#appleIcon').href = makeIcon(180); $('#favIcon').href = makeIcon(64); } catch (e) {}

/* Rezerv nusqa: saqlaw / tiklew (súwretler menen birge) */
const blobToURL = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
$('#exportBtn').onclick = async () => {
  toast('Rezerv nusqa tayarlanbaqta…');
  const ph = await Promise.all(photos.map(async p => ({ id: p.id, w: p.w, h: p.h, date: p.date, data: await blobToURL(p.blob) })));
  const blob = new Blob([JSON.stringify({ app: 'forasel', v: 1, state: S, photos: ph })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `for-asel-backup-${dkey(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Rezerv nusqa saqlandı ❤');
};
$('#importInput').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== 'forasel' || !j.state) throw new Error('bad');
    if (!(await ask('Rezerv nusqanı tikleysiz be?','Házirgi nátiyjeleriń rezerv nusqa menen almastırıladı.', 'Tiklew'))) return;
    S = Object.assign(defaults(), j.state); S.names = Object.assign(defaults().names, S.names); save();
    for (const p of j.photos || []) { const blob = await (await fetch(p.data)).blob(); await DB.put({ id: p.id, w: p.w, h: p.h, date: p.date, blob }); }
    viewDay = dkey(new Date()); await loadPhotos(); renderAll(); toast('Rezerv nusqa tiklendi ❤');
  } catch (err) { toast('Bul FOR ASEL rezerv faylı emes'); }
});

/* ---------- Oyatqısh: 14-yanvar, 00:00 ---------- */
let alarmOpen = false, alarmPreview = false, qIdx = 0, answers = [], stopTries = 0;
const alarmEl = $('#alarm'), stage = $('#alarmStage');
function openAlarm(preview) {
  alarmOpen = true; alarmPreview = preview; stopTries = 0;
  alarmEl.classList.add('ringing');
  stage.innerHTML = `
    <p class="eyebrow">14-yanvar</p>
    <div class="alarm-time">00:00</div>
    <h2 class="alarm-title">Oyan! Búgin sol kún ❤</h2>
    <button class="alarm-stop" id="alarmStop">Toqtatıw</button>
    <p class="alarm-hint" id="alarmHint"></p>`;
  $('#alarmStop').onclick = stopAlarm;
  openOv(alarmEl);
  Sound.sirenStart(); Sound.vibrateLoop();
  setTimeout(() => { const h = $('#alarmHint'); if (h && !Sound.running()) h.textContent = 'Sesti esitiw ushın ekranǵa bas'; }, 600);
}
function stopAlarm() {
  if (Sound.isPending() && stopTries++ === 0) { Sound.unlock(); return; }   // birinshi basıw — sesti qosadı, ekinshisi toqtatadı
  Sound.sirenStop(); haptic(30);
  alarmEl.classList.remove('ringing');
  qIdx = 0; answers = []; renderQuestion();
}
function renderQuestion() {
  if (qIdx >= QUESTIONS.length) return renderAlarmEnd();
  const Q = QUESTIONS[qIdx];
  stage.innerHTML = `<div class="q-card">
    <div class="q-dots">${QUESTIONS.map((_, i) => `<i class="${i <= qIdx ? 'on' : ''}"></i>`).join('')}</div>
    <p class="eyebrow">Soraw ${qIdx + 1} / ${QUESTIONS.length}</p>
    <h2 class="q-title">${esc(Q.q)}</h2>
    <div class="q-actions">
      <button class="btn primary big" data-ans="0">${esc(Q.a[0])}</button>
      <button class="btn ghost big" data-ans="1">${esc(Q.a[1])}</button>
    </div></div>`;
  $$('[data-ans]', stage).forEach(b => b.onclick = () => {
    answers.push({ q: Q.q, a: Q.a[+b.dataset.ans] }); haptic(12); qIdx++; renderQuestion();
  });
}
function renderAlarmEnd() {
  if (!alarmPreview) { S.alarm = { done: true, answers, at: Date.now() }; save(); }
  stage.innerHTML = `<div class="q-card">
    <div class="lock open">${heartSVG}</div>
    <h2 class="q-title">Búgin 23:59 da hámmesi ashıladı</h2>
    <p class="q-left">Qaldı: <b id="alarmLeft">—</b></p>
    <button class="btn primary big" id="alarmClose" style="min-width:200px">Jabıw</button></div>`;
  tick();
  $('#alarmClose').onclick = () => { closeOv(alarmEl, 500); setTimeout(() => { alarmOpen = false; }, 500); };
}

/* Ses túymesi */
function renderSoundBtn() { $('#soundBtn').classList.toggle('off', !S.sound); }
$('#soundBtn').onclick = () => {
  S.sound = !S.sound; save(); renderSoundBtn(); Sound.unlock();
  toast(S.sound ? 'Saat sesi qosıldı' : 'Saat sesi óshirildi');
};
$('#alarmPreviewBtn').onclick = () => { closeOv(sheetWrap, 550); setTimeout(() => openAlarm(true), 400); };

/* ---------- Baslaw: «Tayarman» — hámmesi 0 den baslanadı ---------- */
$('#readyBtn').onclick = async () => {
  const btn = $('#readyBtn');
  if (btn.disabled) return;
  btn.disabled = true;
  haptic([20, 30, 40]); burstFrom(btn, 24);
  S = defaults(); S.started = true; save();          // barlıq nátiyjeler 0
  try { for (const p of photos) await DB.del(p.id); } catch (e) {}
  urls.forEach(u => URL.revokeObjectURL(u)); urls.clear();
  viewDay = dkey(new Date()); lastDay = viewDay;
  await loadPhotos(); renderAll();
  const intro = $('#intro');
  intro.classList.add('leave');
  document.body.classList.remove('locked');
  goTo(0, false);
  $$('.reveal.in').forEach(el => el.classList.remove('in')); observe();   // animaciyalardı qaytadan
  setTimeout(() => { intro.classList.remove('leave'); }, 950);
  setTimeout(() => toast('Basladıq! Hár kúni 100 + 100 ❤'), 800);
};

/* ---------- Iske túsiriw ---------- */
function renderAll() { renderHeader(); renderToday(); renderStats(); renderWords(); renderSavings(); renderJourney(); observe(); }
document.body.classList.toggle('locked', !S.started);
renderSoundBtn();
buildEx();
renderAll();
loadPhotos();
onPager();
tick(); setInterval(tick, 1000);
if (S.started && /[?&]preview\b/.test(location.search)) setTimeout(() => openFinale(true), 600);
if (S.started && /[?&]alarm\b/.test(location.search)) setTimeout(() => openAlarm(true), 600);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeLock === null && S.started && ALARM - new Date() < 3 * 36e5 && TARGET > new Date()) keepAwake(); });
})();
