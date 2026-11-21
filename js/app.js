// Tuma — glavna logika sučelja
import * as E from './economy.js';
import { Music, Sfx } from './audio.js';

const VERSION = '1.3.1';
const SAVE_KEY = 'tuma-save-v2';
const $ = (q, el = document) => el.querySelector(q);
const icon = r => `assets/icon/${E.RES[r].id}.webp`;
const locImg = (i, t) => `assets/loc/${E.LOCS[i].id}_${t}.webp`;
const charImg = i => `assets/char/${E.LOCS[i].id}.webp`;
// noćna svjetla (prozori, lampe) postoje samo za neke slike
const LIGHTS = new Set(['badger_3', 'bear_3', 'fox_1', 'fox_2', 'fox_3', 'hedgehog_1', 'hedgehog_2', 'hedgehog_3', 'owl_1', 'owl_2', 'owl_3', 'squirrel_2', 'squirrel_3', 'tit_2', 'tit_3']);
const lightImg = (i, t) => LIGHTS.has(`${E.LOCS[i].id}_${t}`) ? `assets/light/${E.LOCS[i].id}_${t}.webp` : '';
const nightImg = (i, t) => `assets/night/${E.LOCS[i].id}_${t}.webp`;
const nightChar = i => `assets/night/char_${E.LOCS[i].id}.webp`;
function setLight(img, i, t) { const u = lightImg(i, t); img.style.visibility = u ? '' : 'hidden'; if (u) img.src = u; else img.removeAttribute('src'); }

// ---------- stanje ----------
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const base = E.newRun(null);
      // popuni eventualno nove ključeve
      return { ...base, ...s, research: { ...base.research, ...s.research }, shop: { ...base.shop, ...s.shop }, settings: { ...base.settings, ...s.settings } };
    }
  } catch (e) { console.warn('save', e); }
  return E.newRun(null);
}
function save() {
  S.lastTick = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}

const music = new Music();
const sfx = new Sfx();
music.setVolume(S.settings.music);
sfx.on = S.settings.sfx;
let buyMode = '1';
let started = false;

// ---------- HUD ----------
const chipsEl = $('#chips');
const chipEls = E.RES.map((r, i) => {
  const d = document.createElement('div');
  d.className = 'chip';
  d.innerHTML = `<img src="${icon(i)}" alt=""><div><b>0</b><small></small></div>`;
  chipsEl.appendChild(d);
  return { el: d, b: d.querySelector('b'), sm: d.querySelector('small') };
});
const seedChip = document.createElement('div');
seedChip.className = 'chip seed';
seedChip.innerHTML = `<img src="assets/icon/seed.webp" alt=""><div><b>0</b><small>sjeme</small></div>`;
chipsEl.appendChild(seedChip);

// visina HUD-a (jedan ili dva reda resursa)
const hudEl = $('#hud');
new ResizeObserver(() => document.documentElement.style.setProperty('--hud-h', hudEl.offsetHeight + 'px')).observe(hudEl);

// ---------- lokacije ----------
const list = $('#locList');
const locEls = E.LOCS.map((L, i) => {
  const el = document.createElement('div');
  el.className = 'loc';
  el.dataset.i = i;
  el.innerHTML = `
    <div class="stage">
      <button class="sprite" aria-label="${L.name}"><img alt=""><img class="nt" alt=""><img class="lit" alt=""></button>
      <img class="animal" src="${charImg(i)}" alt="">
      <img class="animal nt" src="${nightChar(i)}" alt="">
      <img class="silhouette" src="${charImg(i)}" alt="">
      <div class="lock">🔒</div>
    </div>
    <div class="plate">
      <div class="ptitle"><b>${L.name}</b><span class="lvl"></span></div>
      <div class="rate"></div>
      <div class="barwrap"><div class="bar"><i></i></div><div class="barlbl"></div></div>
      <div class="btns">
        <button class="btn up"><span class="bl"></span><span class="costs"></span></button>
        <button class="btn hire"><span class="bl">Zaposli ${L.animalAcc}</span><span class="costs"></span></button>
        <button class="btn unlock"><span class="bl">Otključaj</span><span class="costs"></span></button>
      </div>
      <div class="perk">${L.perk}</div>
    </div>`;
  list.appendChild(el);
  const r = {
    el, sprite: $('.sprite', el), img: $('.sprite img', el), lit: $('.sprite .lit', el), nt: $('.sprite .nt', el), animalNt: $('.animal.nt', el), animal: $('.animal:not(.nt)', el), lock: $('.lock', el),
    lvl: $('.lvl', el), rate: $('.rate', el), barwrap: $('.barwrap', el), bar: $('.bar i', el), barlbl: $('.barlbl', el),
    up: $('.up', el), upL: $('.up .bl', el), upC: $('.up .costs', el),
    hire: $('.hire', el), hireC: $('.hire .costs', el),
    unlock: $('.unlock', el), unlockC: $('.unlock .costs', el), perk: $('.perk', el),
    tier: 0,
  };
  bindTap(r.sprite, i);
  r.up.addEventListener('click', () => doUpgrade(i));
  r.hire.addEventListener('click', () => doHire(i));
  r.unlock.addEventListener('click', () => doUnlock(i));
  return r;
});

function costHTML(cost) {
  return cost.map(([r, a]) => `<span class="cost${S.res[r] >= a ? '' : ' no'}"><img src="${icon(r)}" alt="">${E.fmt(a)}</span>`).join('');
}
function upN(i) {
  if (buyMode === 'max') return Math.max(1, E.maxAffordable(S, i));
  return +buyMode;
}

function renderLocs() {
  const n = E.unlockedCount(S);
  E.LOCS.forEach((L, i) => {
    const r = locEls[i], st = S.locs[i];
    const visible = i === selected && (st.unlocked || i === firstLocked());
    r.el.style.display = visible ? '' : 'none';
    if (!visible) return;
    r.el.classList.toggle('locked', !st.unlocked);
    const tier = st.unlocked ? E.tierOf(st.level) : 1;
    if (tier !== r.tier) { r.img.src = locImg(i, tier); r.nt.src = nightImg(i, tier); setLight(r.lit, i, tier); r.tier = tier; r.el.dataset.tier = tier; }
    r.lock.style.display = st.unlocked ? 'none' : '';
    r.animal.classList.toggle('waiting', !st.hired);
    r.animalNt.classList.toggle('waiting', !st.hired);
    if (!st.unlocked) {
      r.lvl.textContent = '';
      r.rate.innerHTML = `Netko novi bi se mogao doseliti ovamo…`;
      r.barwrap.style.display = 'none';
      r.up.style.display = 'none'; r.hire.style.display = 'none'; r.unlock.style.display = '';
      const c = E.unlockCost(S, i);
      r.unlockC.innerHTML = costHTML(c);
      r.unlock.disabled = !E.canPay(S, c);
      return;
    }
    r.unlock.style.display = 'none';
    r.barwrap.style.display = '';
    r.lvl.textContent = 'Razina ' + st.level;
    const p = E.prodOf(S, i), t = E.tapOf(S, i);
    r.rate.innerHTML = `<img src="${icon(L.res)}" alt="">${st.hired ? E.fmt(p) + '/s · ' : ''}dodir +${E.fmt(t)}`;
    const nm = E.nextMilestone(st.level);
    const prev = [0, ...E.MILESTONES].filter(m => m <= st.level).pop();
    if (nm) {
      r.bar.style.width = ((st.level - prev) / (nm - prev) * 100).toFixed(1) + '%';
      r.barlbl.textContent = `Do razine ${nm}: proizvodnja ×2${(nm === 10 || nm === 25) ? ' i nova izgradnja' : ''}`;
    }
    const k = upN(i);
    const c = E.upgradeCost(S, i, k);
    r.upL.textContent = k > 1 ? `Nadogradi ×${k}` : 'Nadogradi';
    r.upC.innerHTML = costHTML(c);
    r.up.disabled = !E.canPay(S, c);
    r.up.style.display = '';
    if (!st.hired) {
      const hc = E.hireCost(S, i);
      r.hire.style.display = '';
      r.hireC.innerHTML = costHTML(hc);
      r.hire.disabled = !E.canPay(S, hc);
    } else r.hire.style.display = 'none';
  });
}
const firstLocked = () => S.locs.findIndex(l => !l.unlocked);

function renderHud() {
  E.RES.forEach((R, i) => {
    const c = chipEls[i];
    const show = S.locs[i].unlocked || S.res[i] > 0;
    c.el.style.display = show ? '' : 'none';
    if (!show) return;
    c.b.textContent = E.fmt(S.res[i]);
    const p = E.prodOf(S, i);
    c.sm.textContent = p > 0 ? '+' + E.fmt(p) + '/s' : R.name;
  });
  seedChip.style.display = S.seeds > 0 || S.prestiges > 0 ? '' : 'none';
  seedChip.querySelector('b').textContent = E.fmt(S.seeds);
}


// ---------- karta sela ----------
// položaj na livadi u koordinatama pozadinske slike (0–1): x = središte, y = dno, s = veličina (perspektiva)
const SPOTS = [
  { x: 0.50, y: 0.835, s: 1.0, side: 1 },   // jež — sprijeda, travnati otok između putova
  { x: 0.31, y: 0.775, s: 0.92, side: -1 }, // vjeverica — lijeva livada
  { x: 0.76, y: 0.695, s: 0.85, side: -1 }, // jazavac — desno, uz krivinu puta
  { x: 0.31, y: 0.680, s: 0.8, side: 1 },   // lisica — lijevo, ispod gornjeg puta
  { x: 0.59, y: 0.650, s: 0.74, side: 1 },  // medvjed — središnja livada
  { x: 0.40, y: 0.583, s: 0.66, side: -1 }, // sova — uz račvanje, pred drvećem
  { x: 0.74, y: 0.566, s: 0.6, side: -1 },  // sjenica — kod velikog stabla
];
// pretvara koordinate slike u piksele ekrana (pozadina je 'cover', poravnata dolje, srednji sloj ×1.10)
function imgToScreen(ix, iy) {
  const W = innerWidth, H = innerHeight, k = Math.max(W / 1024, H / 1792);
  const dw = 1024 * k, dh = 1792 * k, x0 = (W - dw) / 2, y0 = H - dh;
  return [W / 2 + (x0 + ix * dw - W / 2) * 1.10, H / 2 + (y0 + iy * dh - H / 2) * 1.10, dh * 1.10];
}
const village = $('#village');
const mapIn = $('#mapIn');
const mapWrap = document.createElement('div');
mapWrap.id = 'mapWrap';
mapIn.appendChild(mapWrap);
const mapEls = E.LOCS.map((L, i) => {
  const b = document.createElement('button');
  b.className = 'mloc';
  b.setAttribute('aria-label', L.name);
  b.innerHTML = `<img class="l" alt=""><img class="nt" alt=""><img class="lit" alt=""><img class="a" src="${charImg(i)}" alt=""><img class="a nt" src="${nightChar(i)}" alt=""><span class="badge"></span>`;
  b.addEventListener('click', () => openDetail(i));
  mapWrap.appendChild(b);
  const r = { b, l: $('img.l', b), lit: $('img.lit', b), nt: $('img.nt', b), a: $('img.a:not(.nt)', b), aNt: $('img.a.nt', b), badge: $('.badge', b), tier: 0 };
  r.l.addEventListener('load', () => layoutMap());
  return r;
});
const sign = document.createElement('button');
sign.className = 'msign';
sign.innerHTML = `<div class="post">🔒</div><span>Novo mjesto</span>`;
sign.addEventListener('click', () => { const k = firstLocked(); if (k >= 0) openDetail(k); });
mapWrap.appendChild(sign);

function layoutMap() {
  const W = innerWidth;
  E.LOCS.forEach((L, i) => {
    const r = mapEls[i], sp = SPOTS[i];
    const nw = r.l.naturalWidth, nh = r.l.naturalHeight;
    if (!nw) return;
    const [X, Y, DH] = imgToScreen(sp.x, sp.y);
    const asp = nw / nh;
    let h = DH * 0.085 * sp.s, w = h * asp;
    const maxW = Math.min(W, DH * 0.6) * 0.36 * sp.s;
    if (w > maxW) { w = maxW; h = w / asp; }
    r.l.style.width = w + 'px'; r.l.style.height = h + 'px';
    r.lit.style.width = w + 'px'; r.lit.style.height = h + 'px';
    r.nt.style.width = w + 'px'; r.nt.style.height = h + 'px';
    r.b.style.left = X + 'px';
    r.b.style.top = (Y - h) + 'px';
    r.b.style.zIndex = Math.round(sp.y * 100);
    const ah = Math.max(DH * 0.045 * sp.s, h * 0.62);
    for (const a of [r.a, r.aNt]) {
      a.style.height = ah + 'px';
      a.style.left = sp.side > 0 ? (w - ah * 0.25) + 'px' : (-ah * 0.5) + 'px';
      a.style.animationDelay = (-i * 0.7) + 's';
    }
  });
  const k = firstLocked();
  if (k >= 0) {
    const [X, Y] = imgToScreen(SPOTS[k].x, SPOTS[k].y);
    sign.style.left = X + 'px';
    sign.style.top = (Y - 70) + 'px';
    sign.style.zIndex = Math.round(SPOTS[k].y * 100);
  }
}
function renderMap(force) {
  let relayout = force;
  E.LOCS.forEach((L, i) => {
    const r = mapEls[i], st = S.locs[i];
    r.b.style.display = st.unlocked ? '' : 'none';
    if (!st.unlocked) return;
    const t = E.tierOf(st.level);
    if (t !== r.tier) { r.tier = t; r.l.src = locImg(i, t); r.nt.src = nightImg(i, t); setLight(r.lit, i, t); relayout = true; }
    r.a.style.display = r.aNt.style.display = st.hired ? '' : 'none';
    const ready = E.canPay(S, E.upgradeCost(S, i, 1)) || (!st.hired && E.canPay(S, E.hireCost(S, i)));
    r.badge.classList.toggle('ready', ready);
  });
  const k = firstLocked();
  sign.style.display = k >= 0 ? '' : 'none';
  if (k >= 0) sign.classList.toggle('ready', E.canPay(S, E.unlockCost(S, k)));
  if (relayout) layoutMap();
}
window.addEventListener('resize', () => layoutMap());

// ---------- prikaz: karta ili detalj ----------
let view = 'map', selected = 0;
function showMap() {
  view = 'map';
  document.body.classList.add('view-map'); document.body.classList.remove('view-detail');
  renderMap(true);
}
function openDetail(i) {
  selected = i; view = 'detail';
  document.body.classList.add('view-detail'); document.body.classList.remove('view-map');
  renderLocs();
  village.scrollTo({ top: 0 });
}
function detailOrder() {
  const k = firstLocked();
  return E.LOCS.map((_, i) => i).filter(i => S.locs[i].unlocked || i === k);
}
function stepDetail(d) {
  const ord = detailOrder();
  const p = ord.indexOf(selected);
  openDetail(ord[(p + d + ord.length) % ord.length]);
}
$('#dBack').addEventListener('click', showMap);
$('#dPrev').addEventListener('click', () => stepDetail(-1));
$('#dNext').addEventListener('click', () => stepDetail(1));
// dulji dodir na pozadinu (ne na lokaciju ili kartu) vraća na selo
{
  let timer = null, start = null;
  const cancel = () => { clearTimeout(timer); timer = null; start = null; };
  const begin = (target, x, y) => {
    if (view !== 'detail' || target.closest('.sprite, .plate, button')) return;
    cancel();
    start = [x, y];
    timer = setTimeout(() => {
      timer = null;
      if (S.settings.vib && navigator.vibrate) navigator.vibrate(15);
      showMap();
    }, 500);
  };
  const move = (x, y) => { if (timer && start && Math.hypot(x - start[0], y - start[1]) > 14) cancel(); };
  // dodir (Android)
  village.addEventListener('touchstart', e => { if (e.touches.length === 1) begin(e.target, e.touches[0].clientX, e.touches[0].clientY); else cancel(); }, { passive: true });
  village.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  village.addEventListener('touchend', cancel, { passive: true });
  village.addEventListener('touchcancel', cancel, { passive: true });
  // miš (računalo)
  village.addEventListener('mousedown', e => begin(e.target, e.clientX, e.clientY));
  village.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  village.addEventListener('mouseup', cancel);
  village.addEventListener('scroll', cancel, { passive: true });
  village.addEventListener('contextmenu', e => e.preventDefault());
}
// povlačenje lijevo/desno u detalju
{
  let sx = null, sy = 0;
  village.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  village.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) stepDetail(dx < 0 ? 1 : -1);
  }, { passive: true });
}

// ---------- dodir ----------
function bindTap(btn, i) {
  const downs = new Map();
  btn.addEventListener('pointerdown', e => { downs.set(e.pointerId, [e.clientX, e.clientY]); });
  btn.addEventListener('pointerup', e => {
    const d = downs.get(e.pointerId); downs.delete(e.pointerId);
    if (!d) return;
    if (Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 14) return;
    collect(i, e.clientX, e.clientY);
  });
  btn.addEventListener('pointercancel', e => downs.delete(e.pointerId));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
function collect(i, x, y) {
  if (!S.locs[i].unlocked) return;
  const v = E.tapOf(S, i);
  E.gain(S, E.LOCS[i].res, v);
  S.taps++;
  const sp = locEls[i].sprite;
  sp.classList.remove('squish'); void sp.offsetWidth; sp.classList.add('squish');
  floatText(x, y, '+' + E.fmt(v), icon(E.LOCS[i].res));
  sfx.tap();
  if (S.settings.vib && navigator.vibrate) navigator.vibrate(6);
  pulseChip(E.LOCS[i].res);
  dirty = true;
}
function floatText(x, y, text, img) {
  const f = document.createElement('div');
  f.className = 'float';
  f.style.left = x + (Math.random() * 30 - 15) + 'px';
  f.style.top = y - 20 + 'px';
  f.innerHTML = (img ? `<img src="${img}" alt="">` : '') + text;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
function sparkles(el, n = 14) {
  const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  for (let k = 0; k < n; k++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}
const pulseT = {};
function pulseChip(r) {
  const now = performance.now();
  if (pulseT[r] && now - pulseT[r] < 300) return;
  pulseT[r] = now;
  const el = chipEls[r].el;
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}

// ---------- kupovine ----------
function doUpgrade(i) {
  const st = S.locs[i], k = upN(i);
  const before = st.level, tierBefore = E.tierOf(before);
  if (!E.pay(S, E.upgradeCost(S, i, k))) return;
  st.level += k;
  sfx.buy();
  const tierAfter = E.tierOf(st.level);
  const crossed = E.MILESTONES.filter(m => m > before && m <= st.level);
  if (tierAfter !== tierBefore) {
    sfx.big();
    toast(`${E.LOCS[i].name} je ${E.byG(E.LOCS[i].g, 'narastao', 'narasla')}!`, locImg(i, tierAfter));
    setTimeout(() => sparkles(locEls[i].sprite, 22), 60);
  } else if (crossed.length) {
    toast(`${E.LOCS[i].name}: proizvodnja ×${2 ** crossed.length}`, icon(E.LOCS[i].res));
    sparkles(locEls[i].sprite, 10);
  }
  dirty = true;
}
function doHire(i) {
  if (!E.pay(S, E.hireCost(S, i))) return;
  S.locs[i].hired = true;
  sfx.big();
  toast(`${E.LOCS[i].animal} sad ${E.byG(E.LOCS[i].ag, 'skuplja sam', 'skuplja sama')}!`, charImg(i));
  sparkles(locEls[i].animal, 12);
  dirty = true;
}
function doUnlock(i) {
  if (!E.pay(S, E.unlockCost(S, i))) return;
  S.locs[i].unlocked = true;
  S.locs[i].level = 1;
  S.best = Math.max(S.best || 0, E.unlockedCount(S));
  sfx.big();
  toast(`${E.byG(E.LOCS[i].ag, 'Novi susjed', 'Nova susjeda')}: ${E.LOCS[i].animal}!`, charImg(i));
  renderLocs(); renderMap(true);
  setTimeout(() => sparkles(locEls[i].sprite, 24), 80);
  dirty = true;
}

// ---------- obavijesti i modal ----------
function toast(text, img) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (img ? `<img src="${img}" alt="">` : '') + text;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function modal(html, buttons) {
  $('#modalBody').innerHTML = html;
  const b = $('#modalBtns'); b.innerHTML = '';
  buttons.forEach(([label, cls, fn]) => {
    const x = document.createElement('button');
    x.className = 'btn ' + (cls || '');
    x.textContent = label;
    x.onclick = () => { closeModal(); fn && fn(); };
    b.appendChild(x);
  });
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }

// ---------- listovi (izbornici) ----------
let openSheet = '';
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => {
  if (!b.dataset.sheet) { setSheet(''); showMap(); } else setSheet(b.dataset.sheet);
}));
function setSheet(name) {
  if (name && name === openSheet) name = '';
  openSheet = name;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.sheet === name));
  document.querySelectorAll('.sheet').forEach(s => s.classList.toggle('open', s.id === 'sheet-' + name));
  $('#buyMode').style.visibility = name ? 'hidden' : '';
  if (name) { music.enterMenu(); renderSheet(); } else music.leaveMenu();
}
function renderSheet() {
  if (openSheet === 'research') renderResearch();
  if (openSheet === 'spring') renderSpring();
  if (openSheet === 'settings') renderSettings();
}

function renderResearch() {
  const el = $('#researchList');
  if (!S.locs[5].unlocked) {
    el.innerHTML = `<div class="empty"><img src="${charImg(5)}" alt="">Knjižnica je još zatvorena.<br>Otključaj <b>Knjižnicu</b> i Sova Sofija će ti pomoći s istraživanjima.</div>`;
    return;
  }
  el.innerHTML = E.RESEARCH.map(R => {
    const lvl = S.research[R.id];
    const maxed = lvl >= R.max;
    const c = E.researchCost(S, R.id);
    const lettersLocked = R.letters && !S.locs[6].unlocked;
    return `<div class="card"><div class="txt"><b>${R.name} · ${lvl}${maxed ? ' (max)' : ''}</b><small>${R.desc}${lettersLocked ? ' · treba Pošta' : ''}</small></div>
      <button class="btn" data-r="${R.id}" ${maxed || lettersLocked || !E.canPay(S, c) ? 'disabled' : ''}><span>Istraži</span><span class="costs">${maxed ? '' : costHTML(c)}</span></button></div>`;
  }).join('');
  el.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => {
    const k = b.dataset.r, R = E.RESEARCH.find(x => x.id === k);
    if (S.research[k] >= R.max) return;
    if (!E.pay(S, E.researchCost(S, k))) return;
    S.research[k]++; sfx.buy(); dirty = true; renderResearch();
  });
}

function renderSpring() {
  const b = E.seedBreakdown(S);
  const can = b.total > 0;
  const hrs = b.hours >= 1 ? `${Math.floor(b.hours)} h ${Math.floor((b.hours % 1) * 60)} min` : `${Math.floor(b.hours * 60)} min`;
  $('#springBox').innerHTML = `
    <div class="brk">
      <div><span>Dokle je selo stiglo (${b.stage} od 7)</span><b>+${b.a}</b></div>
      <div><span>Koliko je selo proizvelo</span><b>+${b.b}</b></div>
      <div><span>Vrijeme ovog proljeća (${hrs})</span><b>+${b.c}</b></div>
      <div class="tot"><span>Dobit ćeš</span><span><img src="assets/icon/seed.webp" alt=""> ${b.total}</span></div>
    </div>
    ${can ? '' : '<p class="hint">Novo proljeće postaje moguće kad otključaš Kamenolom.</p>'}
    <button class="btn bigbtn" id="btnSpring" ${can ? '' : 'disabled'}>Započni novo proljeće</button>`;
  $('#btnSpring').onclick = () => modal(
    `<img class="hero" src="assets/icon/seed.webp" alt=""><h3>Novo proljeće?</h3><p>Resursi, razine i istraživanja kreću ispočetka, a ti dobivaš <b>${E.zrna(b.total)}</b> zlatnog sjemena za trajne pojačivače.</p>`,
    [['Ne još', 'ghost'], ['Da, novo proljeće', '', doPrestige]]);
  $('#seedBal').innerHTML = `<span class="cost" style="background:#fff3cf;color:#8a6142"><img src="assets/icon/seed.webp" alt="">${E.fmt(S.seeds)}</span>`;
  $('#shopList').innerHTML = E.SHOP.map(R => {
    const lvl = S.shop[R.id], maxed = lvl >= R.max, c = E.shopCost(S, R.id);
    return `<div class="card"><div class="txt"><b>${R.name} · ${lvl}${maxed ? ' (max)' : ''}</b><small>${R.desc}</small></div>
      <button class="btn hire" data-s="${R.id}" ${maxed || S.seeds < c ? 'disabled' : ''}><span>Posadi</span><span class="costs">${maxed ? '' : `<span class="cost${S.seeds >= c ? '' : ' no'}"><img src="assets/icon/seed.webp" alt="">${c}</span>`}</span></button></div>`;
  }).join('');
  $('#shopList').querySelectorAll('button[data-s]').forEach(x => x.onclick = () => {
    const k = x.dataset.s, R = E.SHOP.find(z => z.id === k), c = E.shopCost(S, k);
    if (S.shop[k] >= R.max || S.seeds < c) return;
    S.seeds -= c; S.shop[k]++; sfx.buy(); dirty = true; save(); renderSpring();
  });
}
function doPrestige() {
  const b = E.seedBreakdown(S);
  if (b.total <= 0) return;
  const keep = { ...S, seeds: S.seeds + b.total, seedsTotal: (S.seedsTotal || 0) + b.total, prestiges: (S.prestiges || 0) + 1 };
  S = E.newRun(keep);
  for (const r of locEls) r.tier = 0;
  save();
  sfx.big();
  setSheet('');
  showMap();
  renderAll();
  toast(`Novo proljeće! +${E.zrna(b.total)} zlatnog sjemena`, 'assets/icon/seed.webp');
}

function renderSettings() {
  $('#setMusic').value = S.settings.music;
  $('#setSfx').checked = S.settings.sfx;
  $('#setVib').checked = S.settings.vib;
  document.querySelectorAll('#setTime button').forEach(b => b.classList.toggle('on', b.dataset.v === S.settings.time));
  const rt = S.runTime / 3600;
  $('#stats').innerHTML = `Dodira: <b>${E.fmt(S.taps)}</b><br>Ovo proljeće traje: <b>${Math.floor(rt)} h ${Math.floor((rt % 1) * 60)} min</b><br>Proljeća: <b>${S.prestiges || 0}</b><br>Ukupno zlatnog sjemena: <b>${E.zrna(S.seedsTotal || 0)}</b>`;
  $('#ver').textContent = 'Tuma ' + VERSION;
}
$('#setMusic').addEventListener('input', e => { S.settings.music = +e.target.value; music.setVolume(S.settings.music); });
$('#setSfx').addEventListener('change', e => { S.settings.sfx = e.target.checked; sfx.on = e.target.checked; });
$('#setVib').addEventListener('change', e => { S.settings.vib = e.target.checked; });
document.querySelectorAll('#setTime button').forEach(b => b.addEventListener('click', () => {
  S.settings.time = b.dataset.v; renderSettings(); checkNight(true); save();
}));
$('#btnReset').addEventListener('click', () => modal('<h3>Obrisati sve?</h3><p>Izgubit ćeš cijelo selo, sve sjeme i sve pojačivače. Ovo se ne može vratiti.</p>',
  [['Odustani', 'ghost'], ['Obriši', 'unlock', () => { localStorage.removeItem(SAVE_KEY); location.reload(); }]]));

document.querySelectorAll('#buyMode button').forEach(b => b.addEventListener('click', () => {
  buyMode = b.dataset.m;
  document.querySelectorAll('#buyMode button').forEach(x => x.classList.toggle('on', x === b));
  renderLocs();
}));

// ---------- dan i noć ----------
let night = null;
function isNightNow() {
  if (S.settings.time === 'night') return true;
  if (S.settings.time === 'day') return false;
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}
function checkNight(force) {
  const n = isNightNow();
  if (n === night && !force) return;
  const changed = n !== night;
  night = n;
  document.body.classList.toggle('night', n);
  $('meta[name=theme-color]').content = n ? '#7d86a8' : '#cfe7b0';
  setupParticles();
  if (started && changed) music.setMode(n ? 'night' : 'day');
}

// ---------- čestice ----------
const pEl = $('#particles');
let leafTimer = null;
function setupParticles() {
  pEl.innerHTML = '';
  clearInterval(leafTimer);
  if (night) {
    for (let k = 0; k < 16; k++) {
      const f = document.createElement('div');
      f.className = 'firefly';
      f.style.left = Math.random() * 100 + '%';
      f.style.top = 30 + Math.random() * 65 + '%';
      f.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      f.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
      f.style.animationDuration = 5 + Math.random() * 6 + 's';
      f.style.animationDelay = -Math.random() * 8 + 's';
      pEl.appendChild(f);
    }
  } else {
    leafTimer = setInterval(() => {
      if (document.hidden || pEl.childElementCount > 7) return;
      const l = document.createElement('div');
      l.className = 'leaf';
      l.style.left = Math.random() * 95 + '%';
      const dur = 10 + Math.random() * 6;
      l.style.animationDuration = dur + 's';
      l.style.transform = `scale(${0.7 + Math.random() * 0.6})`;
      pEl.appendChild(l);
      setTimeout(() => l.remove(), dur * 1000);
    }, 2600);
  }
}

// ---------- parallax ----------
const layers = [[$('#bgSky'), 1.06, 0.02], [$('#bgMid'), 1.10, 0.04], [$('#bgFront'), 1.16, 0.075]];
let tilt = { x: 0, y: 0 }, cur = { p: 0, x: 0, y: 0 };
window.addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  tilt.x = Math.max(-1, Math.min(1, e.gamma / 25));
  tilt.y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30));
});
window.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  tilt.x = (e.clientX / innerWidth - 0.5) * 2; tilt.y = (e.clientY / innerHeight - 0.5) * 2;
});
function parallax() {
  const max = village.scrollHeight - village.clientHeight;
  const p = view === 'detail' && max > 0 ? village.scrollTop / max : 0.5;
  cur.p += (p - cur.p) * 0.12; cur.x += (tilt.x - cur.x) * 0.06; cur.y += (tilt.y - cur.y) * 0.06;
  const H = innerHeight, W = innerWidth;
  for (const [el, sc, f] of layers) {
    const ty = (0.5 - cur.p) * 2 * f * H - cur.y * f * 0.35 * H;
    const tx = -cur.x * f * 0.6 * W;
    el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc})`;
    if (el.id === 'bgMid') mapWrap.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
  }
}

// ---------- odsutnost ----------
function applyAway(seconds) {
  if (seconds < 30) { E.advance(S, seconds); return; }
  const capS = E.offlineCapHours(S) * 3600;
  const used = Math.min(seconds, capS);
  const before = S.res.slice();
  E.advance(S, used);
  S.runTime += Math.min(seconds, 86400) - used;
  const gains = S.res.map((v, i) => v - before[i]).map((g, i) => [i, g]).filter(([, g]) => g >= 1);
  if (!gains.length) return;
  const t = seconds / 3600;
  const tt = t >= 1 ? `${Math.floor(t)} h ${Math.floor((t % 1) * 60)} min` : `${Math.max(1, Math.floor(t * 60))} min`;
  const capNote = seconds > capS ? `<p class="hint">Smočnica je bila puna nakon ${E.offlineCapHours(S).toFixed(1).replace('.', ',')} h. Veća Žirnica i istraživanja daju više mjesta.</p>` : '';
  pendingAway = `<img class="hero" src="${charImg(0)}" alt=""><h3>Opet si tu!</h3><p>Dok te nije bilo (${tt}) seljani su skupili:</p>
    <div class="gains">${gains.map(([i, g]) => `<span><img src="${icon(i)}" alt="">+${E.fmt(g)}</span>`).join('')}</div>${capNote}`;
  if (started) showAway();
}
let pendingAway = null;
function showAway() { if (pendingAway) { modal(pendingAway, [['Super!', '']]); pendingAway = null; } }

// ---------- glavna petlja ----------
let last = performance.now(), dirty = true, uiT = 0, saveT = 0;
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  if (dt > 30) applyAway(dt);
  else if (dt > 0) E.advance(S, dt);
  S.lastTick = Date.now();
  uiT += dt; saveT += dt;
  if (uiT > 0.25 || dirty) {
    uiT = 0; dirty = false;
    renderHud(); renderLocs(); renderMap();
    if (openSheet === 'research' || openSheet === 'spring') renderSheetLive();
  }
  if (saveT > 5) { saveT = 0; save(); }
  parallax();
  requestAnimationFrame(frame);
}
let sheetT = 0;
function renderSheetLive() {
  const n = performance.now();
  if (n - sheetT < 1000) return;
  sheetT = n; renderSheet();
}
function renderAll() { renderHud(); renderLocs(); renderMap(true); checkNight(true); }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); music.pauseAll(); }
  else { music.resume(); checkNight(); }
});
window.addEventListener('pagehide', save);
setInterval(() => checkNight(), 20000);

// ---------- start ----------
(function boot() {
  const away = (Date.now() - (S.lastTick || Date.now())) / 1000;
  if (away > 30) applyAway(away);
  S.lastTick = Date.now();
  showMap();
  renderAll();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();

$('#btnPlay').addEventListener('click', () => {
  started = true;
  $('#title').classList.add('gone');
  document.body.classList.remove('intro');
  sfx._ctx();
  music.start(night ? 'night' : 'day');
  if (pendingAway) setTimeout(showAway, 500);
  if (!S.seen.intro) {
    S.seen.intro = true;
    setTimeout(() => toast('Dodiruj Gljivarnicu i skupljaj gljive!', icon(0)), 900);
  }
});

// ---------- automatsko ažuriranje ----------
if ('serviceWorker' in navigator) {
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // nova verzija je preuzela: učitaj je odmah (samo ako je postojala stara)
    if (!hadController || reloading) return;
    reloading = true;
    save();
    location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      reg.update();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
      setInterval(() => reg.update(), 10 * 60 * 1000);
    } catch (e) {}
  });
}
