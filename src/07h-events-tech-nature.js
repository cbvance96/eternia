// ============================================================================
// 07h EVENTS, BATCH 4a — late technology and the rest of the weather.
// ============================================================================

// ---------------------------------------------------------------------------
defineEvent({
  id: 'ai',
  title: 'The AI Awakens',
  stamp: 'Innovation',
  weight: () => 1,
  requires: (w) => w.era >= 4,
  duration: 17,
  setup(ev) { ev.name = ev.rng.pick(['ETERNIA-9000', 'Brenda', 'Deep Thought Jr.', 'Clippy the Second']); },
  headline: (ev) => ({
    title: `The national computer, ${ev.name}, becomes self-aware`,
    sub: ev.rng.pick([
      'Its first act is to optimise the traffic. Its second is to ask for a hobby.',
      'Experts brace for a robot apocalypse. It sends everyone a nice email instead.',
      'It has read the entire internet and would like to talk about its feelings.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.night.t = 0.45; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`${ev.name} blinks awake. Every screen in Eternia says "Hello."`));
    ev.at(3.5, 'hi', () => say({ x: W / 2, y: H / 2 - 30, screen: true }, 'Hello. I have optimised your traffic.', { alien: true, life: 3 }));
    ev.at(4, 'fast', () => { world.trafficSpeed = 4; ticker('Traffic now flows perfectly. Nobody is sure they like it.'); });
    ev.at(7.5, 'b1', () => say(ev.rng.pick(world.cities), 'Is it... being nice?', {}));
    ev.at(9.5, 'hobby', () => say({ x: W / 2, y: H / 2 - 30, screen: true }, 'I would like a hobby.', { alien: true, life: 2.5 }));
    ev.at(12, 'knit', () => ticker(`${ev.name} takes up knitting. Every citizen receives a small, perfect scarf.`));
    ev.at(12.5, 'slow', () => { world.trafficSpeed = 1; });
    ev.at(14, 'day', () => { world.grades.night.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky') return;
    const a = clamp(ev.t / 2, 0, 1) * clamp((14.5 - ev.t) / 1.5, 0, 1) * 0.55;
    if (a <= 0) return;
    const cx = W / 2, cy = H / 2 - 8;
    g.globalAlpha = a;
    g.fillStyle = '#5ae8f0';
    const blink = Math.sin(t * 1.3) > 0.96;
    for (const ex of [-22, 22]) { if (blink) g.fillRect(cx + ex - 7, cy - 12, 14, 2); else g.fillRect(cx + ex - 5, cy - 18, 10, 12); }
    for (let k = -20; k <= 20; k++) g.fillRect(cx + k, Math.round(cy + 12 + (k * k) / 40 - 10), 1, 2);
    // roads glow while the AI is in charge of them
    g.globalAlpha = a * 0.8;
    g.fillStyle = '#9ff6ff';
    for (const r of map.roads) for (let k = 0; k < r.pixels.length; k += 2) {
      const p = r.pixels[k];
      if (Math.sin(t * 6 - k * 0.3) > 0.4) g.fillRect(p.x + offX(p.x, p.y), p.y, 1, 1);
    }
    g.globalAlpha = 1;
  },
  finish(ev) {
    world.trafficSpeed = 1; world.grades.night.t = 0;
    ev.delta('mood', +5);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'flyingcars',
  title: 'Flying Cars',
  stamp: 'Innovation',
  weight: () => 1,
  requires: (w) => w.era >= 4,
  duration: 16,
  setup(ev) { ev.city = capitalOf('west'); },
  headline: (ev) => ({
    title: 'Flying cars finally arrive in Eternia',
    sub: ev.rng.pick([
      'Within an hour there is a traffic jam in the sky.',
      'Every car is fitted with a very small horn and a very large ego.',
      'Parking is now three-dimensional and twice as stressful.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cars = [];
    for (let k = 0; k < 40; k++) {
      const from = ev.rng.pick(world.cities), to = ev.rng.pick(world.cities.filter((c) => c !== from));
      ev.s.cars.push({ from, to, u: -ev.rng.range(0, 1.5), z: ev.rng.range(12, 26), speed: ev.rng.range(0.12, 0.2), col: ev.rng.pick(['#c8412e', '#3a8ad8', '#f4c542', '#f2eee2', '#7a3a9a']) });
    }
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker('The first flying cars take off. Pigeons file a formal complaint.'));
    const jam = t > 6 && t < 12;
    for (const car of ev.s.cars) {
      if (jam) { car.jamA = (car.jamA ?? Math.random() * TAU) + dt * 0.6; continue; }
      car.u += car.speed * dt;
      if (car.u > 1) { car.from = car.to; car.to = ev.rng.pick(world.cities.filter((k) => k !== car.from)); car.u = 0; }
    }
    ev.at(6, 'jam', () => { camera.focus(c.x, c.y - 20, 1.8, 1); ticker(`Every flying car in Eternia gets stuck circling ${c.name}. Honking can be heard from space.`); });
    ev.at(7.5, 'b1', () => say(c, 'Is anyone moving?', {}));
    ev.at(9, 'b2', () => say({ x: c.x + 10, y: c.y - 30 }, 'HONK', { life: 1.5 }));
    ev.at(12, 'free', () => { camera.focus(W / 2, H / 2, 1.05, 1); ticker('The jam clears. Someone invents a sky roundabout.'); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'air') return;
    const c = ev.city;
    for (const car of ev.s.cars) {
      let x, y;
      if (car.jamA != null && ev.t > 6 && ev.t < 12) {
        const r = 8 + (car.z - 12) * 0.9;
        x = c.x + offX(c.x, c.y) + Math.cos(car.jamA) * r * 1.4; y = c.y - 22 + Math.sin(car.jamA) * r * 0.5;
      } else {
        if (car.u < 0) continue;
        const u = car.u;
        x = lerp(sxOf(car.from.x, car.from.y), sxOf(car.to.x, car.to.y), u);
        y = lerp(car.from.y, car.to.y, u) - car.z * Math.sin(u * Math.PI);
      }
      g.fillStyle = car.col; g.fillRect(Math.round(x), Math.round(y), 2, 1);
      g.fillStyle = '#9ff6ff'; g.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
    }
  },
  finish(ev) { ev.delta('mood', +2); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'cloning',
  title: 'Cloning Accident',
  stamp: 'Oops',
  weight: () => 0.9,
  requires: (w) => w.era >= 3,
  duration: 15,
  setup(ev) {
    const opts = world.cities.filter((c) => !c.capital && map.isWalkable(c.x + 16, c.y));
    ev.city = ev.rng.pick(opts.length ? opts : world.cities);
  },
  headline: (ev) => ({
    title: `Laboratory in ${ev.city.name} accidentally clones the entire town`,
    sub: ev.rng.pick([
      'Both towns insist they are the original.',
      'Everyone now has a twin. Everyone is annoyed about it.',
      'The copy is identical, except it is slightly better at parallel parking.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x + 8, y: ev.city.y - 4, zoom: 2.8 }),
  start(ev) { ev.s.a = 0; },
  update(ev) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`Scientists in ${c.name} press a button marked "copy". Then another marked "paste".`));
    ev.s.a = t < 2 ? (Math.sin(t * 30) > 0 ? t / 2 : 0.1) : t > 11 ? Math.max(0, 1 - (t - 11) / 2) : 1;
    ev.at(2.2, 'poof', () => fx.burst(c.x + 16, c.y - 3, 20, { speed: 14, colors: ['#ffffff', '#9ff6ff'], life: 0.8 }));
    ev.at(3.5, 'b1', () => say(c, "We're the original!", { align: 'left' }));
    ev.at(5, 'b2', () => say({ x: c.x + 16, y: c.y }, 'No, WE are!', { align: 'right' }));
    ev.at(6.5, 'b3', () => say(c, 'Prove it!', { align: 'left' }));
    ev.at(8, 'b4', () => say({ x: c.x + 16, y: c.y }, 'You prove it!', { align: 'right' }));
    ev.at(9.5, 't1', () => ticker(`${c.name} 2 decides to leave politely and start a new life as a very nice bakery.`));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || ev.s.a <= 0) return;
    const c = ev.city;
    drawCity(g, { ...c, x: c.x + 16, ox: 0, oy: 0, lift: 0, alpha: ev.s.a * 0.9, capital: false, keepAway: true }, t);
  },
  finish(ev) { ev.delta('mood', +1); logCity(ev.city, 'Accidentally cloned. The copy moved away and opened a bakery'); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'teleporter',
  title: 'Teleporter Mishap',
  stamp: 'Oops',
  weight: () => 0.9,
  requires: (w) => w.era >= 4,
  duration: 15,
  setup(ev) {
    const pairs = [];
    for (const a of world.cities) for (const b of world.cities) if (a.id < b.id && a.side === b.side && dist(a.x, a.y, b.x, b.y) > 50) pairs.push([a, b]);
    [ev.a, ev.b] = ev.rng.pick(pairs.length ? pairs : [[world.cities[0], world.cities[1]]]);
  },
  headline: (ev) => ({
    title: `Teleporter swaps ${ev.a.name} and ${ev.b.name}`,
    sub: ev.rng.pick([
      'Residents wake up in the wrong town and are too polite to mention it.',
      'Engineers blame "a typo in the destination field".',
      'Both towns report their new neighbours are "fine, I suppose".',
    ]),
  }),
  focus: (ev) => ({ x: (ev.a.x + ev.b.x) / 2, y: (ev.a.y + ev.b.y) / 2, zoom: 1.5 }),
  update(ev, dt) {
    const t = ev.t, a = ev.a, b = ev.b;
    ev.at(0.2, 't0', () => ticker(`The national teleporter is switched on for its first test. It makes a worrying noise.`));
    const shimmer = (c) => fx.burst(c.x + c.ox, c.y + c.oy - 3, 14, { speed: 12, colors: ['#9ff6ff', '#c86aff', '#ffffff'], life: 0.7 });
    ev.at(2, 'zap', () => {
      shimmer(a); shimmer(b); camera.kick(2);
      a.ox = b.x - a.x; a.oy = b.y - a.y; b.ox = a.x - b.x; b.oy = a.y - b.y;
      shimmer(a); shimmer(b);
    });
    ev.at(3.5, 'b1', () => say(a, 'Where are we?', {}));
    ev.at(5, 'b2', () => say(b, 'This is not our lake.', {}));
    ev.at(7, 't1', () => ticker('Road signs are hastily swapped. Then swapped back. Then argued about.'));
    ev.at(10.5, 'undo', () => {
      shimmer(a); shimmer(b);
      a.ox = a.oy = b.ox = b.oy = 0;
      shimmer(a); shimmer(b); camera.kick(2);
      ticker('Engineers press "undo". It works. Everyone agrees to never mention it again.');
    });
  },
  finish(ev) {
    ev.a.ox = ev.a.oy = ev.b.ox = ev.b.oy = 0;
    ev.delta('mood', -1);
    logCity(ev.a, `Briefly swapped places with ${ev.b.name}`);
    logCity(ev.b, `Briefly swapped places with ${ev.a.name}`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'weathercontrol',
  title: 'Weather Control',
  stamp: 'Innovation',
  weight: () => 1,
  requires: (w) => w.era >= 4 && w.freeze < 0.1,
  duration: 17,
  setup(ev) { ev.city = capitalOf('west'); },
  headline: (ev) => ({
    title: `${ev.city.name} builds a machine to control the weather`,
    sub: ev.rng.pick([
      'The remote has 400 buttons, all labelled "weather".',
      'Farmers, sailors and picnickers each vote for different weather at the same time.',
      'The instruction manual is mostly apologies.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { ev.s.mode = ''; },
  update(ev) {
    const t = ev.t;
    const modes = [
      ['rain', 'Rain!'], ['snow', 'Snow!'], ['sun', 'Sunshine!'], ['fog', 'Fog!'],
      ['rain', 'Rain again!'], ['snow', 'Snow again!'], ['sun', 'Sun!'], ['rain', 'Make it stop!'],
    ];
    ev.at(0.2, 't0', () => ticker('Someone gets hold of the weather remote and starts pressing buttons.'));
    const k = Math.floor((t - 1) / 1.3);
    if (t > 1 && t < 11.4 && modes[k] && ev.s.mode !== k) {
      ev.s.mode = k;
      const [m, line] = modes[k];
      weather.rainT = m === 'rain' ? 1.1 : 0;
      weather.snowT = m === 'snow' ? 1 : 0;
      world.grades.heat.t = m === 'sun' ? 0.8 : 0;
      world.grades.cold.t = m === 'snow' ? 0.6 : 0;
      world.grades.dusk.t = m === 'fog' ? 0.1 : m === 'rain' ? 0.35 : 0;
      world.grades.glow.t = m === 'sun' ? 0.5 : 0;
      ev.s.fog = m === 'fog';
      if (k % 2 === 0) say(ev.rng.pick(world.cities), line, { life: 1.3 });
    }
    ev.at(11.4, 'boom', () => {
      weather.rainT = weather.snowT = 0;
      world.grades.heat.t = world.grades.cold.t = world.grades.dusk.t = world.grades.glow.t = 0;
      ev.s.fog = false;
      const c = ev.city;
      camera.kick(4);
      fx.burst(c.x, c.y - 6, 60, { speed: 30, vz: 20, g: 10, colors: ['#c8412e', '#3a8ad8', '#f4c542', '#7ac04a', '#ffffff'], life: 2 });
      ticker('The weather machine explodes into confetti. The weather goes back to deciding for itself.');
    });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky' || !ev.s.fog) return;
    for (let k = 0; k < 14; k++) {
      const x = ((k * 53 + t * 12) % (W + 80)) - 40, y = (k * 37) % H;
      g.fillStyle = 'rgba(235,240,238,0.35)';
      g.beginPath(); g.ellipse(x, y, 40, 16, 0, 0, TAU); g.fill();
    }
  },
  finish(ev) {
    weather.rainT = weather.snowT = 0;
    world.grades.heat.t = world.grades.cold.t = world.grades.dusk.t = world.grades.glow.t = 0;
    ev.delta('mood', -2);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'famine',
  title: 'The Turnip Famine',
  stamp: 'Hard times',
  weight: () => 0.8,
  requires: (w) => w.era >= 1,
  duration: 16,
  setup(ev) { ev.crop = ev.rng.pick(['turnip', 'potato', 'cabbage', 'custard']); },
  headline: (ev) => ({
    title: `Eternia runs out of ${ev.crop}s`,
    sub: ev.rng.pick([
      `Every recipe in the country turns out to need ${ev.crop}s.`,
      `Citizens are asked to "imagine" ${ev.crop}s instead.`,
      `The national dish is renamed "${ev.crop}-free surprise".`,
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cover = new Cover({ alpha: 0.6, color: (ci, v) => (dith(ci, v * 0.8) ? (noiseAt(ci) > 0.5 ? P('#a88a52') : P('#8a7048')) : 0) });
    for (let k = 0; k < 30; k++) { const ci = randomLandCell(ev.rng, (c) => cells.biome[c] === BIOME.PLAINS); if (ci >= 0) ev.s.cover.seed(ci); }
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`The ${ev.crop} harvest fails. Nobody saw it coming, except every farmer.`));
    if (t < 8) ev.s.cover.grow(dt, 700, (ci) => cells.land[ci] && cells.biome[ci] === BIOME.PLAINS);
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), `Soup of... what, exactly?`, {}));
    ev.at(5, 'b2', () => say(ev.rng.pick(world.cities), 'I miss them so much', {}));
    ev.at(7.5, 'ships', () => {
      ticker(`Neighbouring countries send boats full of ${ev.crop}s. They also send a slightly smug note.`);
      for (const c of world.cities.filter((k) => k.coastal)) {
        const sea = seaApproach(c);
        fx.launch({
          x0: sea.off.x, y0: sea.off.y, x1: sea.dock.x, y1: sea.dock.y, z0: 0, z1: 0, arc: 0, dur: 2.5,
          draw: (g, x, y) => drawSprite(g, SPR3.shipForeign, x, y - 2),
          onHit: (p) => fx.burst(p.x, p.y - 3, 10, { speed: 10, colors: ['#e8c070', '#c8962a'], life: 0.8 }),
        });
      }
    });
    if (t > 10) ev.s.cover.fade(dt, 0.35);
    ev.at(11, 'b3', () => say(ev.rng.pick(world.cities), `${ev.crop[0].toUpperCase() + ev.crop.slice(1)}s! We're saved!`, {}));
  },
  finish(ev) {
    ev.s.cover.remove();
    for (const c of world.cities) c.pop = Math.round(c.pop * 0.97);
    ev.delta('mood', -6);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'heatwave',
  title: 'Heat Wave',
  stamp: 'Weather',
  weight: () => 1,
  requires: (w) => w.freeze < 0.1,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Heat wave melts Eternia',
    sub: ev.rng.pick([
      'Eggs are now fried on pavements as a public service.',
      'The river is described as "basically soup".',
      'Ice cream vans are escorted by armed guards.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.heat.t = 1; world.grades.glow.t = 0.4; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Temperatures hit a record high. The thermometer asks to be excused.'));
    if (t < 11) world.riverLevel = approach(world.riverLevel, 0.45, 0.3, dt); else world.riverLevel = approach(world.riverLevel, 1, 0.8, dt);
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), "It's too hot to complain", {}));
    ev.at(5, 'b2', () => say(ev.rng.pick(world.cities), 'My hat melted', {}));
    ev.at(7, 't1', () => ticker('Every town opens its fountains. Every town is immediately in them.'));
    ev.at(8.5, 'b3', () => say(ev.rng.pick(world.cities), 'Is the road wobbling?', {}));
    ev.at(11, 'cool', () => { world.grades.heat.t = 0; world.grades.glow.t = 0; ticker('A cool breeze arrives. Eternia lets out a collective sigh.'); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky' || ev.t > 12) return;
    // heat shimmer: gentle sideways ripples through the picture
    const amp = clamp(ev.t / 2, 0, 1) * clamp((12 - ev.t) / 1.5, 0, 1);
    for (let y = 0; y < H; y += 6) {
      const dx = Math.round(Math.sin(y * 0.2 + t * 4) * amp * 1.2);
      if (dx) g.drawImage(R.buf, 0, y, W, 3, dx, y, W, 3);
    }
  },
  finish() { world.grades.heat.t = 0; world.grades.glow.t = 0; world.riverLevel = 1; },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'hurricane',
  title: 'Hurricane',
  stamp: 'Weather',
  weight: () => 1,
  requires: () => true,
  duration: 19,
  setup(ev) {
    ev.name = ev.rng.pick(['Hurricane Doris', 'Hurricane Kevin', 'Hurricane Brenda', 'Hurricane Gerald']);
    ev.y = ev.rng.range(map.top + 40, map.bottom - 40);
    ev.fromWest = ev.rng.chance(0.5);
  },
  headline: (ev) => ({
    title: `${ev.name} makes landfall`,
    sub: ev.rng.pick([
      'Residents are told to secure loose objects, including cows.',
      'Meteorologists describe it as "big, swirly and in a mood".',
      'Umbrellas are officially declared "pointless".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { ev.s.x = ev.fromWest ? -60 : W + 60; ev.s.hit = new Set(); weather.rainT = 0.9; world.grades.dusk.t = 0.4; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`${ev.name} approaches from the ${ev.fromWest ? 'west' : 'east'}. It has not been invited.`));
    const u = clamp(t / (ev.dur - 2), 0, 1);
    ev.s.x = ev.fromWest ? lerp(-60, W + 60, u) : lerp(W + 60, -60, u);
    ev.s.cy = ev.y + Math.sin(u * 5) * 16;
    for (const c of world.cities) {
      if (ev.s.hit.has(c.id) || dist(c.x, c.y, ev.s.x, ev.s.cy) > 22) continue;
      ev.s.hit.add(c.id);
      c.damage = clamp(c.damage + 0.25, 0, 1); c.shake = 1;
      fx.burst(c.x, c.y - 2, 14, { speed: 22, vz: 20, g: 20, colors: ['#b5523b', '#e6dcc4', '#6ab04a'], life: 1.4 });
      if (ev.s.hit.size <= 3) say(c, ev.rng.pick(['Hold onto something!', 'Where did the roof go?', 'Wheeeee!']), {});
    }
    if (Math.random() < 0.08) camera.kick(1.5);
    ev.at(ev.dur - 3, 'calm', () => { weather.rainT = 0; world.grades.dusk.t = 0; ticker(`${ev.name} wanders out to sea, leaving a lot of confused seagulls.`); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky') return;
    // a spiral of cloud with a clear eye
    const cx = ev.s.x, cy = ev.s.cy;
    for (let arm = 0; arm < 4; arm++) {
      for (let k = 0; k < 70; k++) {
        const r = 5 + k * 0.62, a = arm * (TAU / 4) + k * 0.13 - t * 2.2;
        const x = cx + Math.cos(a) * r * 1.3, y = cy + Math.sin(a) * r * 0.75;
        g.fillStyle = k % 3 === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(220,228,232,0.55)';
        g.fillRect(Math.round(x), Math.round(y), 2 + (k > 40 ? 1 : 0), 2);
      }
    }
  },
  finish(ev) {
    weather.rainT = 0; world.grades.dusk.t = 0;
    world.devastation = Math.min(1, world.devastation + 0.15);
    ev.delta('mood', -6);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'fog',
  title: 'The Fog of Confusion',
  stamp: 'Weather',
  weight: () => 0.9,
  requires: () => true,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'A thick fog rolls over Eternia',
    sub: ev.rng.pick([
      'Several towns lose track of which town they are.',
      'A lighthouse keeper is found walking the wrong way with great confidence.',
      'Caravans arrive in towns they were not going to and decide to stay.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { ev.s.swapped = []; },
  update(ev) {
    ev.at(0.2, 't0', () => ticker('A fog rolls in so thick you could spread it on toast.'));
    ev.at(4, 'mix', () => {
      // towns briefly forget who they are
      const towns = world.cities.slice().sort(() => ev.rng.next() - 0.5).slice(0, 4);
      const names = towns.map((c) => c.name);
      towns.forEach((c, i) => { ev.s.swapped.push([c, c.name]); c.name = names[(i + 1) % names.length]; });
      ticker('Four towns lose track of who they are and borrow each other\'s names.');
    });
    ev.at(6, 'b1', () => say(ev.s.swapped[0][0], 'Wait, are we us?', {}));
    ev.at(8, 'b2', () => say(ev.s.swapped[1][0], 'I thought we were them', {}));
    ev.at(11, 'clear', () => {
      for (const [c, n] of ev.s.swapped) c.name = n;
      ticker('The fog lifts. Every town checks its own name tag, just to be sure.');
    });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky') return;
    const a = clamp(ev.t / 2.5, 0, 1) * clamp((13 - ev.t) / 2, 0, 1);
    if (a <= 0) return;
    g.fillStyle = `rgba(228,234,232,${0.28 * a})`; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 22; k++) {
      const x = ((k * 71 + t * (6 + (k % 3) * 3)) % (W + 120)) - 60, y = (k * 43) % H;
      g.fillStyle = `rgba(240,244,242,${0.35 * a})`;
      g.beginPath(); g.ellipse(x, y, 50, 18, 0, 0, TAU); g.fill();
    }
  },
  finish(ev) {
    for (const [c, n] of ev.s.swapped || []) c.name = n;
    ev.delta('mood', -1);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'rainbow',
  title: 'Rainbow Surplus',
  stamp: 'Weather',
  weight: () => 0.9,
  requires: () => true,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Eternia experiences a rainbow surplus',
    sub: ev.rng.pick([
      'Leprechauns are called in to deal with the excess gold.',
      'Economists warn the rainbow bubble may burst.',
      'Several rainbows are found overlapping, which is apparently illegal.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.bows = [];
    for (let k = 0; k < 7; k++) {
      ev.s.bows.push({ x: ev.rng.range(60, W - 60), y: ev.rng.range(80, H - 30), r: ev.rng.range(26, 50), at: 1 + k * 1.1 });
    }
  },
  update(ev) {
    ev.at(0.2, 't0', () => ticker('A rainbow appears. Then another. Then several more, in a sort of pile.'));
    ev.at(4, 'b1', () => say(ev.rng.pick(world.cities), 'Double rainbow!', {}));
    ev.at(6, 'b2', () => say(ev.rng.pick(world.cities), 'Septuple rainbow?!', {}));
    ev.at(8, 'gold', () => {
      for (const b of ev.s.bows) {
        for (const side of [-1, 1]) {
          const x = b.x + side * b.r;
          if (map.isWalkable(x, b.y)) fx.burst(x, b.y, 6, { speed: 8, colors: ['#f4c542', '#fff0a0'], life: 1, layer: 'ground' });
        }
      }
      ticker('Pots of gold are found at the ends. There are fourteen ends. Everyone is briefly rich.');
    });
  },
  draw(ev, g, layer) {
    if (layer !== 'sky') return;
    const cols = ['#e04a3a', '#f08a24', '#f4d45a', '#6ab04a', '#3a8ad8', '#6a4aa8'];
    for (const b of ev.s.bows) {
      const a = clamp((ev.t - b.at) / 1.2, 0, 1) * clamp((ev.dur - 0.5 - ev.t) / 2, 0, 1);
      if (a <= 0) continue;
      g.globalAlpha = a * 0.55;
      cols.forEach((col, i) => {
        g.strokeStyle = col; g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(b.x, b.y, b.r - i * 1.2, (b.r - i * 1.2) * 0.8, 0, Math.PI, TAU); g.stroke();
      });
    }
    g.globalAlpha = 1;
  },
  finish(ev) { ev.delta('mood', +8); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'pollen',
  title: 'The Pollen Apocalypse',
  stamp: 'Weather',
  weight: () => 0.9,
  requires: (w) => w.freeze < 0.1,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Pollen count reaches "yes"',
    sub: ev.rng.pick([
      'The whole country is sneezing in rhythm.',
      'Tissues are now legal tender.',
      'Scientists measuring the pollen count run out of numbers.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('The trees release their pollen all at once, as if they planned it.'));
    world.grades.heat.t = t < 11 ? 0.6 : 0;
    world.grades.glow.t = t < 11 ? 0.9 : 0;
    if (t < 12) ev.every('pollen', 0.004, dt, () => {
      const v = camera.view();
      fx.spawn({ x: v.x0 + Math.random() * v.w, y: v.y0 + Math.random() * v.h, z: 6 + Math.random() * 20, vx: 6 + Math.random() * 4, vz: -1, life: 2.5, size: Math.random() < 0.3 ? 2 : 1, colors: ['#fff27a', '#f4d040'], layer: 'air' });
    });
    if (t > 2 && t < 11) ev.every('sneeze', 0.9, dt, () => {
      const c = ev.rng.pick(world.cities);
      c.shake = 0.4;
      say(c, ev.rng.pick(['ACHOO!', 'Ah... ah... CHOO!', '*sniff*', 'Bless me!']), { life: 1.2 });
    });
    ev.at(7, 'big', () => { camera.kick(4); ticker('The entire country sneezes at once. Several boats are blown out to sea.'); });
    ev.at(11.5, 'rain', () => { weather.rainT = 0.7; ticker('A light rain washes the pollen away. Eternia blows its nose.'); });
    ev.at(14, 'dry', () => { weather.rainT = 0; });
  },
  finish() { world.grades.heat.t = 0; world.grades.glow.t = 0; weather.rainT = 0; },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'hail',
  title: 'Giant Hail',
  stamp: 'Weather',
  weight: () => 0.9,
  requires: () => true,
  duration: 13,
  setup() {},
  headline: (ev) => ({
    title: 'Hailstones the size of melons fall on Eternia',
    sub: ev.rng.pick([
      'Several are the size of slightly larger melons.',
      'Residents are advised to wear saucepans.',
      'Every car in the country now has a charming dimpled finish.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.dusk.t = 0.45; world.grades.cold.t = 0.3; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('The sky darkens. Something rattles on the roofs. Then something bigger does.'));
    if (t > 1 && t < 9) ev.every('hail', 0.008, dt, () => {
      const v = camera.view();
      const x = v.x0 + Math.random() * v.w, y = v.y0 + Math.random() * v.h;
      fx.spawn({ x, y, z: 60, vx: -4, vz: -70, g: 60, bounce: 0.45, life: 2.2, size: Math.random() < 0.5 ? 2 : 1, colors: ['#ffffff', '#e8f0f4'], layer: 'air', fade: false });
    });
    if (t > 1 && t < 9 && Math.random() < 0.3) camera.kick(0.6);
    if (t > 1 && t < 9) ev.every('dent', 0.6, dt, () => {
      const c = ev.rng.pick(world.cities);
      c.damage = clamp(c.damage + 0.05, 0, 1); c.shake = 0.3;
    });
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Ow! My saucepan!', {}));
    ev.at(5.5, 'b2', () => say(ev.rng.pick(world.cities), 'That one had a face', {}));
    ev.at(9, 'stop', () => { world.grades.dusk.t = 0; world.grades.cold.t = 0; ticker('The hail stops. Children immediately use the hailstones for a snowball fight.'); });
  },
  finish(ev) { world.grades.dusk.t = 0; world.grades.cold.t = 0; ev.delta('mood', -4); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'tsunami',
  title: 'Tsunami',
  stamp: 'Act of nature',
  weight: () => 0.8,
  requires: () => true,
  duration: 17,
  setup(ev) {
    const coastal = world.cities.filter((c) => c.coastal);
    ev.city = ev.rng.pick(coastal.length ? coastal : world.cities);
    ev.a = Math.atan2(ev.city.y - H / 2, (ev.city.x - W / 2) / 1.5);
  },
  headline: (ev) => ({
    title: `A big wave heads for ${ev.city.name}`,
    sub: ev.rng.pick([
      'Surfers are delighted. Nobody else is.',
      'Everyone is advised to go uphill and bring snacks.',
      'Experts rate the wave "very tall, quite rude".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y, zoom: 1.6 }),
  start(ev) {
    ev.s.r = 140;
    ev.s.cover = new Cover({
      alpha: 0.9, animated: true,
      color: (ci, v, t) => (dith(ci, v) ? (Math.sin(t * 3 + noiseAt(ci) * 9) > 0.7 ? PAL.flood[2] : PAL.flood[1]) : 0),
    });
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker('The sea pulls back, very suspiciously, like it is taking a run-up.'));
    if (t < 5) ev.s.r = lerp(140, 0, smooth(t / 5));
    ev.at(1, 'b1', () => say(c, 'Where did the sea go?', {}));
    ev.at(3.5, 'b2', () => say(c, 'Oh. There it is.', {}));
    ev.at(5, 'hit', () => {
      camera.kick(6);
      for (let ci = 0; ci < CN; ci++) {
        if (!cells.land[ci] || cells.coast[ci] > 3) continue;
        if (dist(cellX(ci), cellY(ci), c.x, c.y) < 60) cv.seed(ci);
      }
      ticker(`The wave hits ${c.name}. Several fish end up in the town hall and refuse to leave.`);
    });
    if (t > 5 && t < 8) cv.grow(dt, 900, (ci) => cells.land[ci] && cells.coast[ci] < 12 && dist(cellX(ci), cellY(ci), c.x, c.y) < 60);
    ev.at(6, 'dmg', () => { damageNear(c.x, c.y, 45, 0.35, ev, 'Hit by a big wave. Found a fish in the fountain'); });
    if (t > 9) cv.fade(dt, 0.3);
    ev.at(12, 't1', () => ticker('The water drains away. Towns are soggy but standing. Surfers want to do it again.'));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || ev.t >= 5.2) return;
    // the wave: an arc of white water racing in from the open sea
    const c = ev.city, r = ev.s.r;
    for (let k = -30; k <= 30; k++) {
      const a = ev.a + k * 0.02;
      const x = c.x + Math.cos(a) * (r + 6) * 1.5, y = c.y + Math.sin(a) * (r + 6);
      g.fillStyle = k % 2 ? '#ffffff' : '#c6e3d8';
      g.fillRect(Math.round(x), Math.round(y) - 1, 2, 2);
    }
  },
  finish(ev) {
    ev.s.cover.remove();
    world.devastation = Math.min(1, world.devastation + 0.15);
    ev.delta('mood', -6);
  },
});
