// Tuma — glazba i zvukovi

const M = 'assets/music/';
const PLAYLISTS = {
  day: { intro: 'main_theme', loop: ['day_1', 'day_2', 'day_3'] },
  night: { intro: null, loop: ['night_1', 'night_2'] },
};

function fade(el, to, ms, done) {
  clearInterval(el._fade);
  const from = el.volume, steps = Math.max(1, Math.round(ms / 50));
  let k = 0;
  el._fade = setInterval(() => {
    k++;
    el.volume = Math.min(1, Math.max(0, from + (to - from) * (k / steps)));
    if (k >= steps) { clearInterval(el._fade); done && done(); }
  }, 50);
}

export class Music {
  constructor() {
    this.world = new Audio();
    this.menu = new Audio(M + 'main_theme.mp3');
    this.menu.loop = true;
    this.world.preload = 'auto';
    this.vol = 0.6;
    this.mode = null;        // 'day' | 'night'
    this.queue = [];
    this.pos = 0;
    this.inMenu = false;
    this.started = false;
    this.world.addEventListener('ended', () => this.next());
  }
  setVolume(v) {
    this.vol = v;
    const active = this.inMenu ? this.menu : this.world;
    clearInterval(active._fade);
    active.volume = v;
  }
  _load(name) {
    this.world.src = M + name + '.mp3';
    this.current = name;
    this.world.volume = 0;
    this.world.play().catch(() => {});
    fade(this.world, this.vol, 1500);
  }
  start(mode) {
    this.started = true;
    this.setMode(mode, true);
  }
  setMode(mode, first = false) {
    if (mode === this.mode && !first) return;
    this.mode = mode;
    const P = PLAYLISTS[mode];
    this.queue = (P.intro ? [P.intro] : []).concat(P.loop);
    this.pos = 0;
    if (this.inMenu) { this._pendingSwitch = true; return; }
    if (!this.world.paused && this.world.src) {
      fade(this.world, 0, 1500, () => this._load(this.queue[0]));
    } else this._load(this.queue[0]);
  }
  next() {
    const P = PLAYLISTS[this.mode];
    this.pos++;
    if (this.pos >= this.queue.length) { this.queue = P.loop.slice(); this.pos = 0; }
    this._load(this.queue[this.pos]);
  }
  enterMenu() {
    if (!this.started || this.inMenu) return;
    this.inMenu = true;
    // ako već svira glavna tema, ne prekidamo je
    if (this.current === 'main_theme' && !this.world.paused) { this._menuIsWorld = true; return; }
    this._menuIsWorld = false;
    fade(this.world, 0, 900, () => this.world.pause());
    this.menu.currentTime = 0;
    this.menu.volume = 0;
    this.menu.play().catch(() => {});
    fade(this.menu, this.vol, 1200);
  }
  leaveMenu() {
    if (!this.inMenu) return;
    this.inMenu = false;
    if (this._menuIsWorld) return;
    fade(this.menu, 0, 900, () => this.menu.pause());
    if (this._pendingSwitch) { this._pendingSwitch = false; this._load(this.queue[0]); return; }
    this.world.volume = 0;
    this.world.play().catch(() => {});
    fade(this.world, this.vol, 1500);
  }
  pauseAll() { this.world.pause(); this.menu.pause(); }
  resume() {
    if (!this.started) return;
    const a = this.inMenu && !this._menuIsWorld ? this.menu : this.world;
    a.play().catch(() => {});
  }
}

// kratki sintetizirani zvukovi (bez datoteka)
export class Sfx {
  constructor() { this.on = true; this.ctx = null; }
  _ctx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  _note(freq, t0, dur, vol, type = 'triangle') {
    const c = this._ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  tap() {
    if (!this.on) return;
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const c = this._ctx();
    this._note(scale[Math.floor(Math.random() * scale.length)], c.currentTime, 0.18, 0.06);
  }
  buy() {
    if (!this.on) return;
    const c = this._ctx(), t = c.currentTime;
    this._note(659.25, t, 0.25, 0.07); this._note(987.77, t + 0.07, 0.35, 0.06);
  }
  big() {
    if (!this.on) return;
    const c = this._ctx(), t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._note(f, t + i * 0.09, 0.5, 0.06));
  }
}
