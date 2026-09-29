// ============================================================================
// 08 DIRECTOR — a single state machine guarantees events happen in series:
//   interlude -> announce -> play -> aftermath -> interlude ...
// Only the interlude can pick a new event, so two can never overlap.
// ============================================================================

const director = {
  phase: 'interlude',
  t: 0,
  dur: 4,
  active: null,
  bag: [],
  lastId: null,
  queue: [],   // forced events for testing, e.g. ?event=meteor,aliens

  reset() {
    this.phase = 'interlude';
    this.t = 0;
    this.dur = 4.5;
    this.active = null;
    this.refill();
    this.lastId = null;
  },

  // Rare events only make it into some bags, so "rarity" controls frequency.
  refill() {
    this.bag = EVENTS.filter((d) => world.rng.chance(d.rarity ?? 1)).map((d) => d.id);
  },

  eligible() {
    const list = EVENTS.filter((d) => d.requires(world) && settings.allows(d.id));
    // if the filters leave nothing, history takes a quiet year
    return list.length ? list : EVENTS.filter((d) => d.id === 'nothing');
  },

  pick() {
    while (this.queue.length) {
      const forced = EVENTS.find((d) => d.id === this.queue[0]);
      this.queue.shift();
      if (forced && forced.requires(world)) return forced;
    }
    const eligible = this.eligible();
    // "unbagged" events (the era advances) stay available so history keeps moving
    let candidates = eligible.filter((d) => (d.unbagged || this.bag.includes(d.id)) && d.id !== this.lastId);
    if (!candidates.length) {
      this.refill();
      candidates = eligible.filter((d) => (d.unbagged || this.bag.includes(d.id)) && d.id !== this.lastId);
    }
    if (!candidates.length) candidates = eligible;
    const def = world.rng.weighted(candidates, (d) => d.weight(world));
    this.bag = this.bag.filter((id) => id !== def.id);
    return def;
  },

  begin(def) {
    world.day += world.rng.int(2, 26) * 365 + world.rng.int(0, 364);
    const ev = {
      def, rng: world.rng, t: 0, dur: def.duration, s: {}, flags: new Set(), timers: {},
      deltas: { mood: 0, pop: 0 },
      at(time, key, fn) { if (this.t >= time && !this.flags.has(key)) { this.flags.add(key); fn(); } },
      every(key, interval, dt, fn) {
        this.timers[key] = (this.timers[key] ?? 0) - dt;
        let guard = 0;
        while (this.timers[key] <= 0 && guard++ < 8) { this.timers[key] += interval; fn(); }
      },
      delta(k, n) { this.deltas[k] += n; },
    };
    def.setup(ev);
    ev.head = def.headline(ev);
    world.lastIncidentDay = world.day;
    world.chronicle.unshift({ year: year(), title: ev.head.title, id: def.id });
    this.active = ev;
    this.phase = 'announce';
    this.t = 0;
    const f = def.focus(ev);
    camera.focus(f.x, f.y, f.zoom, 1.3);
    ui.showNotice(ev);
    ui.renderChronicle();
  },

  end() {
    const ev = this.active;
    if (!ev) return;
    leftovers.capture(ev);
    ev.def.finish(ev);
    world.mood = clamp(world.mood + ev.deltas.mood, 0, 100);
    world.eventsPlayed++;
    this.lastId = ev.def.id;
    this.active = null;
    this.phase = 'aftermath';
    this.t = 0;
    ui.showDeltas(ev.deltas);
  },

  update(dt) {
    this.t += dt;
    switch (this.phase) {
      case 'interlude':
        world.day += dt * 45;
        if (this.t >= this.dur) this.begin(this.pick());
        break;
      case 'announce':
        if (this.t >= 3.4) {
          this.phase = 'play';
          this.t = 0;
          if (this.active.def.start) this.active.def.start(this.active);
          ui.compactNotice();
        }
        break;
      case 'play': {
        const ev = this.active;
        ev.t += dt;
        ev.def.update(ev, dt);
        if (ev.t >= ev.dur) this.end();
        break;
      }
      case 'aftermath':
        if (this.t > 1.2 && camera.tz !== 1) camera.reset(0.9);
        if (this.t >= 3.4) {
          ui.hideNotice();
          this.phase = 'interlude';
          this.t = 0;
          this.dur = world.rng.range(4.5, 8) * (settings.values.pause || 1);
        }
        break;
    }
  },

  // "Next event": jump to the next stage without leaving anything half-applied
  skip() {
    if (this.phase === 'interlude') this.t = this.dur;
    else if (this.phase === 'announce') this.t = 3.4;
    else if (this.phase === 'play') { clearBubbles(); fx.projectiles.length = 0; this.end(); }
    else if (this.phase === 'aftermath') this.t = 3.4;
  },
};

function ticker(text) { ui.ticker(text); }
