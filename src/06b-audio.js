// ============================================================================
// 06b AUDIO — every sound is synthesised with the Web Audio API, no files.
// Browsers only allow audio after a user gesture, so it starts muted and the
// sound button (or the settings panel) switches it on.
// ============================================================================

const audio = {
  ctx: null,
  on: false,
  vol: 0.7,
  musicOn: true,
  ambienceOn: true,
  last: {},

  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.5; this.amb.connect(this.master);
    this.mus = ctx.createGain(); this.mus.gain.value = 0.35; this.mus.connect(this.master);
    // a soft echo so the music box sounds like it's in a room
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200;
    this.mus.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(this.master);
    // two seconds of white noise, reused by every noisy sound
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // ambience: surf (slowly breathing low noise) and rain (brighter noise)
    const loop = (type, freq, q) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.amb); src.start();
      return g;
    };
    this.surf = loop('lowpass', 420, 0.5);
    this.rain = loop('highpass', 2400, 0.3);
    this.wind = loop('bandpass', 600, 0.8);
    this.nextNote = 0;
    return true;
  },

  setOn(on) {
    this.on = on;
    if (on && !this.ensure()) { this.on = false; return; }
    if (!this.ctx) return;
    if (on && this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.setTargetAtTime(on ? this.vol : 0, this.ctx.currentTime, 0.15);
  },
  setVolume(v) { this.vol = v; if (this.ctx && this.on) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); },
  ready() { return this.on && this.ctx && this.ctx.state === 'running'; },
  // don't let one sound machine-gun
  gate(key, gap) {
    const now = this.ctx.currentTime;
    if (now - (this.last[key] ?? -99) < gap) return false;
    this.last[key] = now;
    return true;
  },

  // ---- building blocks ----------------------------------------------------------------
  tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.2, vol = 0.3, attack = 0.005, delay = 0, bus = this.sfx }) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  },
  noise({ dur = 0.3, vol = 0.3, type = 'lowpass', f0 = 1200, f1 = f0, q = 0.7, attack = 0.005, delay = 0, bus = this.sfx }) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },

  // ---- the sound palette ---------------------------------------------------------------
  paper() { if (!this.ready()) return; this.noise({ dur: 0.35, vol: 0.18, type: 'bandpass', f0: 3000, f1: 1500, q: 1.2, attack: 0.05 }); },
  stamp() {
    if (!this.ready()) return;
    this.tone({ type: 'sine', f0: 140, f1: 60, dur: 0.18, vol: 0.5 });
    this.noise({ dur: 0.08, vol: 0.25, type: 'lowpass', f0: 900 });
  },
  blip(text = '') {
    if (!this.ready() || !this.gate('blip', 0.09)) return;
    // a tiny "voice": a few pitched chirps, seeded by the text so each line sounds its own
    let h = 7;
    for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const n = 2 + (h % 3), base = 420 + (h % 300);
    for (let k = 0; k < n; k++) this.tone({ type: 'triangle', f0: base * (1 + ((h >> (k * 3)) % 5) * 0.08), dur: 0.06, vol: 0.07, delay: k * 0.07 });
  },
  boom(size = 5) {
    if (!this.ready() || !this.gate('boom', 0.25)) return;
    const big = clamp(size / 10, 0.3, 1);
    this.noise({ dur: 0.8 + big * 1.4, vol: 0.35 + big * 0.35, type: 'lowpass', f0: 900, f1: 60, attack: 0.01 });
    this.tone({ type: 'sine', f0: 110, f1: 32, dur: 0.6 + big, vol: 0.5 * big });
  },
  thud() { if (!this.ready() || !this.gate('thud', 0.2)) return; this.tone({ type: 'sine', f0: 95, f1: 45, dur: 0.25, vol: 0.3 }); },
  zap() {
    if (!this.ready() || !this.gate('zap', 0.15)) return;
    this.noise({ dur: 0.5, vol: 0.35, type: 'highpass', f0: 2500, f1: 400, attack: 0.002 });
    this.tone({ type: 'square', f0: 1800, f1: 120, dur: 0.25, vol: 0.05 });
  },
  firework() {
    if (!this.ready() || !this.gate('fw', 0.12)) return;
    this.noise({ dur: 0.25, vol: 0.2, type: 'lowpass', f0: 1400, f1: 200 });
    for (let k = 0; k < 5; k++) this.noise({ dur: 0.05, vol: 0.06, type: 'highpass', f0: 5000, delay: 0.15 + Math.random() * 0.5 });
  },
  splash() { if (!this.ready() || !this.gate('splash', 0.2)) return; this.noise({ dur: 0.3, vol: 0.12, type: 'bandpass', f0: 1800, f1: 700, q: 0.8 }); },
  sparkle() {
    if (!this.ready() || !this.gate('sparkle', 0.08)) return;
    const notes = [1047, 1175, 1319, 1568, 1760];
    this.tone({ type: 'triangle', f0: notes[(Math.random() * notes.length) | 0], dur: 0.25, vol: 0.06 });
  },
  chime(good = true) {
    if (!this.ready()) return;
    const seq = good ? [523, 659, 784] : [392, 330, 262];
    seq.forEach((f, k) => this.tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.12, delay: k * 0.11 }));
  },
  tick() { if (!this.ready() || !this.gate('tick', 0.5)) return; this.tone({ type: 'square', f0: 2200, dur: 0.02, vol: 0.02 }); },

  // ---- per-frame: ambience levels and the music box -----------------------------------
  update(dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const amb = this.on && this.ambienceOn ? 1 : 0;
    const surf = 0.05 + Math.sin(t * 0.5) * 0.02 + Math.sin(t * 0.13) * 0.015;
    this.surf.gain.setTargetAtTime(amb * surf, t, 0.3);
    this.rain.gain.setTargetAtTime(amb * clamp(weather.rain, 0, 1.5) * 0.12, t, 0.3);
    const windy = director.active && ['tornado', 'hurricane', 'weathercontrol'].includes(director.active.def.id) && director.phase === 'play';
    this.wind.gain.setTargetAtTime(amb * (windy ? 0.1 : 0), t, 0.5);
    if (!this.on || !this.musicOn || this.ctx.state !== 'running') return;
    if (t < this.nextNote) return;
    // a slow pentatonic music box: brighter when the country is happy
    const happy = world.mood > 45;
    const scale = happy ? [0, 2, 4, 7, 9, 12, 14, 16] : [0, 3, 5, 7, 10, 12, 15];
    const root = world.grades.night.v > 0.4 ? 196 : 262;
    const step = scale[(Math.random() * scale.length) | 0];
    const f = root * Math.pow(2, step / 12);
    this.tone({ type: 'triangle', f0: f, dur: 1.6, vol: 0.1, attack: 0.01, bus: this.mus });
    if (Math.random() < 0.3) this.tone({ type: 'sine', f0: f * 1.5, dur: 1.2, vol: 0.04, delay: 0.18, bus: this.mus });
    this.nextNote = t + (director.phase === 'interlude' ? 1.1 : 1.8) + Math.random() * 1.6;
  },
};
