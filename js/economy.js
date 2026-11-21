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
  { id: 'hedgehog', res: 0, name: 'Gljivarnica', animal: 'Ježić Pero',
    perk: 'Najvrjednije gljive u šumi. Osnova svega.' },
  { id: 'squirrel', res: 1, name: 'Žirnica', animal: 'Vjeverica Vida',
    perk: 'Veće skladište: dulja zarada dok te nema' },
  { id: 'badger', res: 2, name: 'Kamenolom', animal: 'Jazavac Jura',
    perk: 'Kamen za gradnju: jeftinije nadogradnje' },
  { id: 'fox', res: 3, name: 'Tržnica', animal: 'Lisica Lina',
    perk: 'Trgovina: veća proizvodnja cijelog sela' },
  { id: 'bear', res: 4, name: 'Pčelinjak', animal: 'Medo Brundo',
    perk: 'Med daje snagu: jači dodir' },
  { id: 'owl', res: 5, name: 'Knjižnica', animal: 'Sova Sofija',
    perk: 'Otključava istraživanja' },
  { id: 'tit', res: 6, name: 'Pošta', animal: 'Sjenica Seka',
    perk: 'Glasnici: brže automatsko skupljanje' },
];

const PROD = [1, 1, 1, 1, 1, 1, 1];          // po razini u sekundi
const UP_BASE = [5, 8, 12, 18, 27, 40, 60];   // osnovna cijena nadogradnje
const UP_GROWTH = 1.16;
const UNLOCK = [0, 100, 1500, 30000, 8e5, 2.5e7, 8e8];
const HIRE = [15, 60, 300, 1500, 8000, 40000, 2e5];
export const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
export const TIERS = [1, 10, 25]; // razine od kojih se mijenja izgled

export const RESEARCH = [
  { id: 'tap', name: 'Spretne šapice', desc: '+25% snaga dodira', base: 15, g: 1.9, max: 50 },
  { id: 'prod', name: 'Marljivo selo', desc: '+10% sva proizvodnja', base: 25, g: 2.0, max: 50 },
  { id: 'cellar', name: 'Dublji podrumi', desc: '+1 h zarade dok te nema', base: 20, g: 2.0, max: 10 },
  { id: 'mail', name: 'Brzi glasnici', desc: '+15% automatsko skupljanje', base: 30, g: 2.1, max: 50, letters: true },
];

export const SHOP = [
  { id: 'soil', name: 'Plodno tlo', desc: '+25% sva proizvodnja, zauvijek', base: 2, g: 1.55, max: 100 },
  { id: 'paws', name: 'Jake šape', desc: '+50% snaga dodira, zauvijek', base: 2, g: 1.55, max: 100 },
  { id: 'cellar', name: 'Velika smočnica', desc: '+2 h zarade dok te nema', base: 3, g: 1.8, max: 6 },
  { id: 'dawn', name: 'Rano buđenje', desc: 'Novo proljeće počinje s još jednom otvorenom lokacijom', base: 6, g: 2.6, max: 3 },
  { id: 'helpers', name: 'Stari prijatelji', desc: '−20% cijena zapošljavanja', base: 4, g: 2.0, max: 4 },
];

export function newRun(state, now = Date.now()) {
  const dawn = state?.shop?.dawn || 0;
  const s = {
    v: 1,
    res: RES.map(() => 0),
    locs: LOCS.map((_, i) => ({ unlocked: i <= dawn, level: i <= dawn ? 1 : 0, hired: dawn > 0 && i === 0 })),
    research: { tap: 0, prod: 0, cellar: 0, mail: 0 },
    shop: state?.shop ? { ...state.shop } : { soil: 0, paws: 0, cellar: 0, dawn: 0, helpers: 0 },
    seeds: state?.seeds || 0,
    seedsTotal: state?.seedsTotal || 0,
    prestiges: state?.prestiges || 0,
    runStart: now,
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
export function tierOf(level) { return level >= 25 ? 3 : level >= 10 ? 2 : 1; }
export function nextMilestone(level) { return MILESTONES.find(t => t > level); }

const lv = (s, i) => (s.locs[i].unlocked ? s.locs[i].level : 0);

export function globalMult(s) {
  return (1 + 0.25 * s.shop.soil) * (1 + 0.10 * s.research.prod) * (1 + 0.015 * lv(s, 3));
}
export function autoMult(s) { return (1 + 0.03 * lv(s, 6)) * (1 + 0.15 * s.research.mail); }
export function tapMult(s) { return (1 + 0.5 * s.shop.paws) * (1 + 0.25 * s.research.tap) * (1 + 0.04 * lv(s, 4)); }
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
export function seedBreakdown(s) {
  const stage = unlockedCount(s);
  const levels = totalLevels(s);
  const hours = s.runTime / 3600;
  const a = stage >= 3 ? 0.6 * stage * stage : 0;
  const b = levels / 12;
  const c = 2.5 * Math.sqrt(hours);
  const total = stage >= 3 ? Math.floor(a + b + c) : 0;
  return { stage, levels, hours, a: Math.floor(a), b: Math.floor(b), c: Math.floor(c), total };
}

// napreduj vrijeme (sekunde)
export function advance(s, dt) {
  for (let i = 0; i < LOCS.length; i++) s.res[i] += prodOf(s, i) * dt;
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
