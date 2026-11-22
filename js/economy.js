// Tuma — ekonomija igre (čiste funkcije, bez DOM-a)

export const RES = [
  { id: 'mushroom', name: 'Gljive' },
  { id: 'acorn', name: 'Žir' },
  { id: 'stone', name: 'Kamen' },
  { id: 'coin', name: 'Zlatnici' },
  { id: 'honey', name: 'Med' },
  { id: 'scroll', name: 'Svici' },
  { id: 'letter', name: 'Pisma' },
];

export const LOCS = [
  { id: 'hedgehog', res: 0, name: 'Gljivarnica', g: 'f', animal: 'Ježić Pero', animalAcc: 'Ježića Peru', ag: 'm',
    perk: 'Najbolje gljive u šumi. Temelj cijelog sela.' },
  { id: 'squirrel', res: 1, name: 'Žirnica', g: 'f', animal: 'Vjeverica Vida', animalAcc: 'Vjevericu Vidu', ag: 'f',
    perk: 'Veće skladište: selo dulje zarađuje dok te nema.' },
  { id: 'badger', res: 2, name: 'Kamenolom', g: 'm', animal: 'Jazavac Jura', animalAcc: 'Jazavca Juru', ag: 'm',
    perk: 'Kamen za gradnju: sve nadogradnje su jeftinije.' },
  { id: 'fox', res: 3, name: 'Tržnica', g: 'f', animal: 'Lisica Lina', animalAcc: 'Lisicu Linu', ag: 'f',
    perk: 'Trgovina: cijelo selo više proizvodi.' },
  { id: 'bear', res: 4, name: 'Pčelinjak', g: 'm', animal: 'Medo Brundo', animalAcc: 'Medu Brundu', ag: 'm',
    perk: 'Med daje snagu: dodir više vrijedi.' },
  { id: 'owl', res: 5, name: 'Knjižnica', g: 'f', animal: 'Sova Sofija', animalAcc: 'Sovu Sofiju', ag: 'f',
    perk: 'Otključava istraživanja.' },
  { id: 'tit', res: 6, name: 'Pošta', g: 'f', animal: 'Sjenica Seka', animalAcc: 'Sjenicu Seku', ag: 'f',
    perk: 'Glasnici: brže automatsko skupljanje.' },
];
// rod: g(loc, 'narastao', 'narasla')
export const byG = (x, m, f) => (x === 'f' ? f : m);

const PROD = [1, 1, 1, 1, 1, 1, 1];          // po razini u sekundi
const UP_BASE = [5, 8, 12, 18, 27, 40, 60];   // osnovna cijena nadogradnje
const UP_GROWTH = 1.17;
const UNLOCK = [0, 100, 3000, 1.5e5, 1e7, 1e9, 1.5e11];
const HIRE = [15, 60, 300, 1500, 8000, 40000, 2e5];
export const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
export const TIERS = [1, 75, 200]; // razine od kojih se mijenja izgled (sporo, kroz više proljeća)

export const RESEARCH = [
  { id: 'tap', name: 'Spretne šapice', desc: '+25% snaga dodira', base: 15, g: 1.9, max: 50 },
  { id: 'prod', name: 'Marljivo selo', desc: '+10% sva proizvodnja', base: 25, g: 2.0, max: 50 },
  { id: 'cellar', name: 'Dublji podrumi', desc: '+1 h zarade dok te nema', base: 20, g: 2.0, max: 10 },
  { id: 'mail', name: 'Brzi glasnici', desc: '+15% automatsko skupljanje', base: 30, g: 2.1, max: 50, letters: true },
];

export const SHOP = [
  { id: 'soil', name: 'Plodno tlo', desc: 'Sva proizvodnja ×1,5 (množi se), zauvijek', base: 3, g: 1.6, max: 200 },
  { id: 'paws', name: 'Jake šape', desc: 'Snaga dodira ×1,5 (množi se), zauvijek', base: 2, g: 1.6, max: 200 },
  { id: 'cellar', name: 'Velika smočnica', desc: '+2 h zarade dok te nema', base: 3, g: 1.8, max: 6 },
  { id: 'dawn', name: 'Rano buđenje', desc: 'Novo proljeće počinje s još jednom otvorenom lokacijom', base: 8, g: 3, max: 2 },
  { id: 'helpers', name: 'Stari prijatelji', desc: '−20% cijena zapošljavanja', base: 4, g: 2.0, max: 4 },
];

export function newRun(state, now = Date.now()) {
  const dawn = state?.shop?.dawn || 0;
  const s = {
    v: 1,
    res: RES.map(() => 0),
    earned: RES.map(() => 0),   // ukupno proizvedeno u ovom proljeću
    locs: LOCS.map((_, i) => ({ unlocked: i <= dawn, level: i <= dawn ? 1 : 0, hired: dawn > 0 && i === 0 })),
    research: { tap: 0, prod: 0, cellar: 0, mail: 0 },
    shop: state?.shop ? { ...state.shop } : { soil: 0, paws: 0, cellar: 0, dawn: 0, helpers: 0 },
    seeds: state?.seeds || 0,
    seedsTotal: state?.seedsTotal || 0,
    prestiges: state?.prestiges || 0,
    runStart: now,
    gameStart: state?.gameStart || now,   // početak cijele igre (ostaje kroz sva proljeća)
    runTime: 0,           // sekunde u ovom proljeću (uključujući odsutnost)
    lastTick: now,
    taps: state?.taps || 0,
    best: state?.best || 0,
    settings: state?.settings || { music: 0.6, sfx: true, vib: true, time: 'auto' },
    seen: state?.seen || {},
  };
  return s;
}

export function milestoneMult(level) {
  let m = 1;
  for (const t of MILESTONES) if (level >= t) m *= 2;
  return m;
}
export function tierOf(level) { return level >= TIERS[2] ? 3 : level >= TIERS[1] ? 2 : 1; }
export function nextMilestone(level) { return MILESTONES.find(t => t > level); }

const lv = (s, i) => (s.locs[i].unlocked ? s.locs[i].level : 0);

export function globalMult(s) {
  return Math.pow(1.5, s.shop.soil) * (1 + 0.10 * s.research.prod) * (1 + 0.015 * lv(s, 3));
}
export function autoMult(s) { return (1 + 0.03 * lv(s, 6)) * (1 + 0.15 * s.research.mail); }
export function tapMult(s) { return Math.pow(1.5, s.shop.paws) * (1 + 0.25 * s.research.tap) * (1 + 0.04 * lv(s, 4)); }
export function costMult(s) { return Math.max(0.55, 1 - 0.005 * lv(s, 2)); }
export function offlineCapHours(s) {
  return Math.min(24, 2 + 0.08 * lv(s, 1) + s.research.cellar + 2 * s.shop.cellar);
}

export function prodOf(s, i) {
  const L = s.locs[i];
  if (!L.unlocked || !L.hired) return 0;
  return PROD[i] * L.level * milestoneMult(L.level) * globalMult(s) * autoMult(s);
}
export function tapOf(s, i) {
  const L = s.locs[i];
  if (!L.unlocked) return 0;
  return (1 + L.level) * milestoneMult(L.level) * globalMult(s) * tapMult(s) + 0.2 * prodOf(s, i);
}

// cijena n nadogradnji od trenutne razine; vraća niz [resIdx, iznos]
export function upgradeCost(s, i, n = 1) {
  const L = s.locs[i];
  const g = UP_GROWTH;
  const first = UP_BASE[i] * Math.pow(g, L.level - 1) * costMult(s);
  const sum = first * (Math.pow(g, n) - 1) / (g - 1);
  const out = [[i, Math.ceil(sum)]];
  if (i > 0) out.push([i - 1, Math.ceil(sum * 0.6)]);
  return out;
}
export function maxAffordable(s, i, cap = 1000) {
  let lo = 0, hi = 1;
  while (hi <= cap && canPay(s, upgradeCost(s, i, hi))) { lo = hi; hi *= 2; }
  hi = Math.min(hi, cap + 1);
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (canPay(s, upgradeCost(s, i, mid))) lo = mid; else hi = mid;
  }
  return lo;
}
export function unlockCost(s, i) {
  const out = [[i - 1, UNLOCK[i]]];
  if (i > 1) out.push([i - 2, UNLOCK[i] * 2]);
  return out;
}
export function hireCost(s, i) {
  return [[i, Math.ceil(HIRE[i] * Math.pow(0.8, s.shop.helpers))]];
}

export function canPay(s, cost) { return cost.every(([r, a]) => s.res[r] >= a); }
export function pay(s, cost) { if (!canPay(s, cost)) return false; cost.forEach(([r, a]) => s.res[r] -= a); return true; }

export function researchCost(s, k) {
  const R = RESEARCH.find(r => r.id === k);
  const lvl = s.research[k];
  const c = Math.ceil(R.base * Math.pow(R.g, lvl));
  const out = [[5, c]];
  if (R.letters) out.push([6, Math.ceil(c * 0.5)]);
  return out;
}
export function shopCost(s, k) {
  const R = SHOP.find(r => r.id === k);
  return Math.ceil(R.base * Math.pow(R.g, s.shop[k]));
}

export function unlockedCount(s) { return s.locs.filter(l => l.unlocked).length; }
export function totalLevels(s) { return s.locs.reduce((a, l) => a + (l.unlocked ? l.level : 0), 0); }

// Zlatno sjeme: ovisi o tome dokle smo stigli, koliko smo nadogradili i koliko dugo igramo
const VALUE = [1, 2, 10, 80, 700, 7000, 8e4]; // koliko vrijedi jedinica resursa
export function villageValue(s) { return (s.earned || []).reduce((a, e, i) => a + e * VALUE[i], 0); }
export function seedBreakdown(s) {
  const stage = unlockedCount(s);
  const levels = totalLevels(s);
  const hours = s.runTime / 3600;
  const ok = stage >= 3;
  const a = ok ? stage * stage : 0;                                  // dokle je selo stiglo
  const b = ok ? Math.pow(villageValue(s) / 1e4, 0.18) : 0;           // koliko je selo proizvelo
  const c = ok ? 3 * Math.sqrt(hours) : 0;                           // koliko dugo traje proljeće
  const total = Math.floor(a + b + c);
  return { stage, levels, hours, a: Math.floor(a), b: Math.floor(b), c: Math.floor(c), total };
}

// napreduj vrijeme (sekunde)
export function gain(s, i, v) { s.res[i] += v; s.earned[i] += v; }
export function advance(s, dt) {
  if (!s.earned) s.earned = RES.map(() => 0);
  for (let i = 0; i < LOCS.length; i++) { const v = prodOf(s, i) * dt; s.res[i] += v; s.earned[i] += v; }
  s.runTime += dt;
}

// formatiranje brojeva (hrvatski decimalni zarez)
const SUF = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah'];
export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 10) return (Math.floor(n * 10) / 10).toString().replace('.', ',');
  if (n < 1000) return Math.floor(n).toString();
  let k = 0;
  while (n >= 1000 && k < SUF.length - 1) { n /= 1000; k++; }
  const d = n < 10 ? 2 : n < 100 ? 1 : 0;
  return (Math.floor(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',') + SUF[k];
}

// broj + "zrno/zrna" (hrvatska množina)
export function zrna(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  const w = b === 1 && a !== 11 ? 'zrno' : (b >= 2 && b <= 4 && (a < 12 || a > 14)) ? 'zrna' : 'zrna';
  return `${fmt(n)} ${w}`;
}
