// ============================================================================
// 07i EVENTS, BATCH 4b — geology and space, economy and culture, and the
// wholesome ones. With these, Eternia has all 100 planned events.
// ============================================================================

// ---------------------------------------------------------------------------
defineEvent({
  id: 'sinkhole',
  title: 'Sinkhole',
  stamp: 'Act of nature',
  weight: () => 0.9,
  requires: () => true,
  duration: 16,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities.filter((c) => !c.capital && c.id !== world.eastCapitalId));
    ev.pop = null;
    for (let k = 0; k < 80 && !ev.pop; k++) {
      const a = ev.rng.range(0, TAU), r = ev.rng.range(22, 34);
      const x = ev.city.x + Math.cos(a) * r, y = ev.city.y + Math.sin(a) * r * 0.6;
      if (map.isWalkable(x, y) && (x >= map.bx(y)) === (ev.city.x >= map.bx(ev.city.y))) ev.pop = { dx: x - ev.city.x, dy: y - ev.city.y };
    }
    ev.pop = ev.pop || { dx: 24, dy: 0 };
  },
  headline: (ev) => ({
    title: `${ev.city.name} falls into a sinkhole`,
    sub: ev.rng.pick([
      'It pops out somewhere else, looking embarrassed.',
      'Geologists describe the hole as "very round" and "in a bad spot".',
      'Residents say the view from the bottom was "not great".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x + ev.pop.dx / 2, y: ev.city.y + ev.pop.dy / 2, zoom: 2.2 }),
  start(ev) { ev.s.hole = 0; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`The ground under ${c.name} makes a noise like a very large stomach.`));
    if (t > 1 && t < 3) { ev.s.hole = (t - 1) / 2; c.shake = 0.3; }
    ev.at(1.2, 'b1', () => say(c, 'Did the ground just gulp?', {}));
    if (t > 3 && t < 4.5) { c.oy = lerp(0, 8, (t - 3) / 1.5); c.alpha = 1 - (t - 3) / 1.5; }
    ev.at(4.5, 'gone', () => { c.alpha = 0; ticker(`${c.name} has fallen into the hole. The hole seems pleased.`); });
    ev.at(6.5, 'pop', () => {
      c.ox = ev.pop.dx; c.oy = ev.pop.dy; c.alpha = 1;
      fx.dust(c.x + c.ox, c.y + c.oy, 20); camera.kick(3);
      say(c, 'Where are we?', {});
    });
    if (t > 8.5 && t < 13) { c.ox = approach(c.ox, 0, 0.9, dt); c.oy = approach(c.oy, 0, 0.9, dt); if (Math.random() < 0.2) fx.dust(c.x + c.ox, c.y + c.oy + 1, 1); }
    ev.at(9, 't1', () => ticker(`${c.name} walks home. The hole fills with water and becomes a rather nice pond.`));
    ev.at(12, 'pond', () => { ev.s.pond = true; });
  },
  draw(ev, g, layer) {
    if (layer !== 'ground' || ev.s.hole <= 0) return;
    const c = ev.city, x = Math.round(c.x + offX(c.x, c.y)), y = Math.round(c.y);
    const r = Math.round(ev.s.hole * 7);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r * 1.4; dx <= r * 1.4; dx++) {
      const d = Math.hypot(dx / 1.4, dy);
      if (d > r) continue;
      g.fillStyle = ev.s.pond ? (d > r - 1 ? '#4b9396' : '#316f7c') : (d > r - 1 ? '#5a4636' : '#1b1612');
      g.fillRect(x + Math.round(dx), y + dy + 1, 1, 1);
    }
  },
  finish(ev) {
    const c = ev.city;
    c.ox = 0; c.oy = 0; c.alpha = 1;
    // the pond stays
    for (let dy = -7; dy <= 7; dy++) for (let dx = -10; dx <= 10; dx++) {
      const d = Math.hypot(dx / 1.4, dy);
      if (d <= 7) stampPixel(c.x + dx, c.y + dy + 1, d > 6 ? '#4b9396' : '#316f7c', 0.9);
    }
    ev.delta('mood', -3);
    logCity(c, 'Fell into a sinkhole. Now has a pond');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'drift',
  title: 'Continental Drift',
  stamp: 'Act of nature',
  weight: () => 0.7,
  requires: () => true,
  duration: 15,
  setup(ev) { ev.dir = ev.rng.chance(0.5) ? 1 : -1; },
  headline: (ev) => ({
    title: 'Eternia drifts slightly to one side',
    sub: ev.rng.pick([
      'Geologists say it is "totally normal" and "please stop asking".',
      'Every marble in the country rolls to the same corner.',
      'Pictures on walls are now straight, but only by accident.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.1 }),
  update(ev) {
    const t = ev.t;
    world.tilt = ev.dir * 5 * (t < 5 ? smooth(t / 5) : t > 10 ? Math.max(0, 1 - (t - 10) / 4) : 1);
    ev.at(0.2, 't0', () => ticker('The whole country begins to lean. Very slowly. Very noticeably.'));
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Is it me, or is everything leaning?', {}));
    ev.at(5.5, 'b2', () => say(ev.rng.pick(world.cities), 'My soup is on a slant', {}));
    ev.at(7, 't1', () => ticker('Engineers suggest everyone stand on the other side to balance it out.'));
    ev.at(8.5, 'b3', () => say(ev.rng.pick(world.cities), 'Everyone to the left!', {}));
    ev.at(10, 't2', () => ticker('It works. Nobody knows why. The country slowly rights itself.'));
  },
  finish(ev) { world.tilt = 0; ev.delta('mood', -1); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'newisland',
  title: 'A New Island',
  stamp: 'Act of nature',
  weight: (w) => (w.islands.length < 3 ? 0.9 : 0),
  requires: (w) => w.islands.length < 3,
  duration: 15,
  setup(ev) {
    let best = null;
    for (let k = 0; k < 400; k++) {
      const x = ev.rng.range(40, W - 40), y = ev.rng.range(26, H - 26);
      const d = map.oceanDepth(x, y);
      if (d < 12 || d > 24) continue;
      if (world.islands.some((i) => dist(i.x, i.y, x, y) < 40)) continue;
      best = { x: Math.round(x), y: Math.round(y) }; break;
    }
    ev.spot = best || { x: 40, y: H - 30 };
    ev.near = nearestCity(ev.spot.x, ev.spot.y);
    ev.name = ev.rng.pick(['Isle of Mild Inconvenience', 'New Bit', 'Gerald Island', 'Little Surprise', 'Rock of Ages Ago', 'Not-Quite-Atlantis']);
  },
  headline: (ev) => ({
    title: `A brand-new island rises off the coast near ${ev.near.name}`,
    sub: ev.rng.pick([
      'It is immediately claimed by four towns and one very determined goat.',
      'Cartographers are furious. They just finished the maps.',
      'The island already has a palm tree. Nobody knows where it came from.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x, y: ev.spot.y, zoom: 2.6 }),
  start(ev) { ev.s.island = { x: ev.spot.x, y: ev.spot.y, r: 7, seed: Math.floor(ev.rng.range(0, 999)), name: ev.name, grow: 0 }; world.islands.push(ev.s.island); },
  update(ev, dt) {
    const t = ev.t, is = ev.s.island;
    ev.at(0.2, 't0', () => ticker('The sea starts to bubble. The fish look worried.'));
    if (t < 3) { if (Math.random() < 0.6) fx.smoke(is.x + ev.rng.range(-4, 4), is.y, { colors: ['#ffffff', '#e8eef0'], rise: 10, life: 1.5 }); if (Math.random() < 0.3) fx.splash(is.x + ev.rng.range(-5, 5), is.y); }
    if (t > 2.5 && t < 6.5) { is.grow = smooth((t - 2.5) / 4); camera.kick(0.8); if (Math.random() < 0.4) fx.splash(is.x + ev.rng.range(-8, 8), is.y + ev.rng.range(-3, 3)); }
    ev.at(6.5, 'done', () => { is.grow = 1; ticker(`It is officially named "${ev.name}". Nobody agrees to that either.`); });
    ev.at(8, 'b1', () => say(ev.near, 'Mine!', {}));
    ev.at(9.5, 'b2', () => say(ev.rng.pick(world.cities.filter((c) => c !== ev.near)), 'No, MINE!', {}));
    ev.at(11, 'b3', () => say({ x: is.x, y: is.y - 6 }, 'Baa. (Mine.)', { life: 2 }));
  },
  finish(ev) {
    ev.s.island.grow = 1;
    ev.delta('mood', +4);
    logCity(ev.near, `Claims ${ev.name}. So does everyone else`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'moon',
  title: 'The Moon Gets Too Close',
  stamp: 'Sky watch',
  weight: () => 0.7,
  requires: () => true,
  duration: 17,
  setup() {},
  headline: (ev) => ({
    title: 'The moon comes over for a closer look',
    sub: ev.rng.pick([
      'Astronomers are thrilled. Everyone else is holding onto something.',
      'Tides are described as "enthusiastic".',
      'The moon has been asked to please respect personal space.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    world.grades.night.t = 0.7;
    ev.s.size = 4;
    ev.s.cover = new Cover({ alpha: 0.85, animated: true, color: (ci, v, t) => (dith(ci, v) ? (Math.sin(t * 2 + noiseAt(ci) * 9) > 0.8 ? PAL.flood[2] : PAL.flood[1]) : 0) });
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    const near = t < 7 ? smooth(t / 7) : t > 11 ? Math.max(0, 1 - (t - 11) / 4) : 1;
    ev.s.size = 4 + near * 70;
    ev.at(0.2, 't0', () => ticker('The moon looks bigger tonight. Then it looks much bigger.'));
    // high tide: the coast floods a little, and everything gets a bit floaty
    if (near > 0.5 && t < 11) {
      ev.every('tide', 0.4, dt, () => { for (let k = 0; k < 20; k++) { const ci = randomLandCell(ev.rng, (c) => cells.coast[c] <= 2); if (ci >= 0) cv.seed(ci); } });
      cv.grow(dt, 900, (ci) => cells.land[ci] && cells.coast[ci] < 6);
    }
    if (t > 11) cv.fade(dt, 0.4);
    for (const c of world.cities) c.lift = near * (2 + (c.id % 3));
    ev.at(4, 'b1', () => say(ev.rng.pick(world.cities), 'Is the moon... waving?', {}));
    ev.at(6.5, 'b2', () => say(ev.rng.pick(world.cities), 'I feel lighter', {}));
    ev.at(8, 't1', () => ticker('High tide reaches places tide has never reached. A crab is seen in a library.'));
    ev.at(12, 't2', () => ticker('The moon backs away, slightly embarrassed.'));
    ev.at(14, 'day', () => { world.grades.night.t = 0; });
  },
  draw(ev, g, layer) {
    if (layer !== 'sky') return;
    const s = ev.s.size, x = W * 0.78, y = H * 0.22;
    g.fillStyle = 'rgba(230,236,220,0.15)'; g.beginPath(); g.arc(x, y, s * 1.3, 0, TAU); g.fill();
    g.fillStyle = '#e6e8dc'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    g.fillStyle = '#c4c6b8';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.12], [-0.05, 0.35, 0.1], [0.35, -0.35, 0.08]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); }
  },
  finish(ev) {
    ev.s.cover.remove();
    for (const c of world.cities) c.lift = 0;
    world.grades.night.t = 0;
    ev.delta('mood', +2);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'comet',
  title: 'The Comet',
  stamp: 'Sky watch',
  weight: () => 0.8,
  requires: () => true,
  duration: 15,
  setup(ev) { ev.name = ev.rng.pick(['Comet Gary', 'Comet Beryl', "Halley's Cousin", 'Comet Keith']); },
  headline: (ev) => ({
    title: `${ev.name} streaks across the sky`,
    sub: ev.rng.pick([
      'It will not return for 3,000 years, so everyone had better look now.',
      'Several people make wishes. One of them comes true, but only a small one.',
      'Doomsayers are disappointed, again.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.night.t = 0.75; },
  update(ev) {
    const t = ev.t;
    ev.s.u = clamp((t - 1) / 11, 0, 1);
    ev.at(0.2, 't0', () => ticker('Something bright appears on the horizon. It has a very long tail.'));
    const lines = ['Make a wish!', 'Ooooh', 'It\'s beautiful', 'Is it coming here?', 'No, it\'s leaving', 'Bye, comet!'];
    world.cities.slice(0, 6).forEach((c, i) => ev.at(2 + i * 1.3, 'b' + i, () => say(c, lines[i], { life: 2 })));
    ev.at(13, 'day', () => { world.grades.night.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky' || ev.s.u == null) return;
    const u = ev.s.u;
    const hx = lerp(-20, W + 20, u), hy = lerp(H * 0.45, H * 0.62, u) - Math.sin(u * Math.PI) * 26;
    for (let k = 60; k >= 0; k--) {
      const x = hx - k * 1.6, y = hy - k * 0.4 + Math.sin(k * 0.3 + t * 4) * (k * 0.04);
      g.fillStyle = k < 3 ? '#ffffff' : k < 15 ? 'rgba(230,245,255,0.9)' : `rgba(170,215,255,${0.75 * (1 - k / 60)})`;
      g.fillRect(Math.round(x), Math.round(y), k < 3 ? 3 : 2, k < 3 ? 3 : k < 25 ? 2 : 1);
    }
  },
  finish(ev) { world.grades.night.t = 0; ev.delta('mood', +5); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'goldrush',
  title: 'Gold Rush',
  stamp: 'Economy',
  weight: () => 1,
  requires: (w) => w.era >= 1,
  duration: 17,
  setup(ev) {
    const ci = randomLandCell(ev.rng, (x) => (cells.biome[x] === BIOME.MOUNTAIN || cells.biome[x] === BIOME.DESERT) && world.cities.every((c) => dist(c.x, c.y, cellX(x), cellY(x)) > 18));
    ev.spot = ci >= 0 ? { x: cellX(ci), y: cellY(ci) } : { x: W / 2, y: H / 2 };
    ev.near = nearestCity(ev.spot.x, ev.spot.y);
  },
  headline: (ev) => ({
    title: `Gold discovered near ${ev.near.name}`,
    sub: ev.rng.pick([
      'The whole country grabs a shovel and runs.',
      'Bread now costs one gold nugget. Nobody can find change.',
      'Several people find gold. Most people find a lot of rocks.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x, y: ev.spot.y - 4, zoom: 2.2 }),
  start(ev) {
    ev.s.crowd = new Crowd();
    for (const c of world.cities.filter((k) => !world.split || (k.x >= map.bx(k.y)) === (ev.spot.x >= map.bx(ev.spot.y)))) for (let k = 0; k < 4; k++) {
      ev.s.crowd.add({ x: c.x, y: c.y, tx: ev.spot.x, ty: ev.spot.y, ...spreadAround(0, 0, 14), speed: ev.rng.range(12, 20), color: '#6a5a4a', hat: '#8a6a3a', home: c, prop: '#9a9690' });
    }
  },
  update(ev, dt) {
    const t = ev.t, crowd = ev.s.crowd;
    crowd.update(dt);
    ev.at(0.2, 't0', () => ticker(`Someone near ${ev.near.name} finds something shiny. Word gets out in about four seconds.`));
    ev.at(1, 'b1', () => say({ x: ev.spot.x, y: ev.spot.y - 4 }, 'GOLD!', {}));
    ev.at(2, 'wide', () => camera.focus(ev.spot.x, ev.spot.y, 1.4, 0.8));
    ev.at(6, 'close', () => camera.focus(ev.spot.x, ev.spot.y - 2, 2.8, 0.8));
    if (t > 6 && t < 12) ev.every('dig', 0.05, dt, () => {
      const a = ev.rng.pick(crowd.list);
      if (!crowd.arrived(a)) return;
      fx.burst(a.x, a.y, 2, { speed: 8, colors: ev.rng.chance(0.15) ? ['#f4c542', '#fff0a0'] : ['#8a7a66', '#b8a888'], life: 0.5, layer: 'ground' });
    });
    ev.at(8, 't1', () => ticker('Everyone is rich. Prices go up. Everyone is exactly as rich as before.'));
    ev.at(9.5, 'b2', () => say(ev.rng.pick(crowd.list), 'I found a rock!', {}));
    ev.at(12, 'home', () => { crowd.send((a) => { a.tx = a.home.x; a.ty = a.home.y; }); camera.focus(W / 2, H / 2, 1.05, 0.8); });
    ev.at(13, 't2', () => ticker('The gold runs out. Everyone goes home with a shovel and a story.'));
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.crowd.draw(g, t); },
  finish(ev) {
    for (const c of world.cities) c.popCap = Math.round(c.popCap * 1.04);
    ev.delta('mood', +6);
    logCity(ev.near, 'Site of the Great Gold Rush. Mostly rocks');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'crash',
  title: 'Stock Market Crash',
  stamp: 'Economy',
  weight: () => 1,
  requires: (w) => w.era >= 2,
  duration: 15,
  setup(ev) { ev.stock = ev.rng.pick(['BREAD', 'GOAT', 'CHEESE', 'HATS', 'ETRN']); },
  headline: (ev) => ({
    title: 'The Eternian stock market crashes',
    sub: ev.rng.pick([
      `Shares in ${ev.stock} fall 99%, then a further 99%.`,
      'Economists blame "vibes".',
      'Nobody knows what a stock is, but everybody is very upset about it.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.pts = [];
    let v = 0.3;
    for (let k = 0; k < 90; k++) {
      v += k < 50 ? 0.012 + (Math.random() - 0.4) * 0.03 : k < 62 ? -0.07 + (Math.random() - 0.5) * 0.02 : (Math.random() - 0.35) * 0.02;
      ev.s.pts.push(clamp(v, 0.02, 1));
    }
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`The ${ev.stock} index is up. And up. And up. Somebody says "what could go wrong?"`));
    ev.at(5.5, 'crash', () => { camera.kick(4); world.grades.ash.t = 0.4; ticker(`${ev.stock} crashes. The national piggy bank is found crying in the corner.`); });
    if (t > 5.5 && t < 11) for (const c of world.cities) c.shrink = approach(c.shrink, 0.3, 1, dt);
    ev.at(6.5, 'b1', () => say(ev.rng.pick(world.cities), 'SELL!', {}));
    ev.at(7.5, 'b2', () => say(ev.rng.pick(world.cities), 'BUY!', {}));
    ev.at(8.5, 'b3', () => say(ev.rng.pick(world.cities), "What's a stock?", {}));
    ev.at(11, 'recover', () => { world.grades.ash.t = 0; ticker('The market recovers, mostly because everyone forgot to check it.'); });
    if (t > 11) for (const c of world.cities) c.shrink = approach(c.shrink, 0, 1.5, dt);
  },
  draw(ev, g, layer) {
    if (layer !== 'sky') return;
    const n = Math.floor(clamp(ev.t / 9, 0, 1) * ev.s.pts.length);
    const a = clamp((ev.dur - 1 - ev.t) / 2, 0, 1);
    if (n < 2 || a <= 0) return;
    const x0 = 60, y0 = 40, w = W - 120, h = 70;
    g.globalAlpha = 0.85 * a;
    g.fillStyle = 'rgba(14,30,36,0.55)'; g.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
    for (let k = 1; k < n; k++) {
      const up = ev.s.pts[k] >= ev.s.pts[k - 1];
      g.fillStyle = up ? '#7ad86a' : '#ff5a5a';
      const xa = x0 + ((k - 1) / 89) * w, xb = x0 + (k / 89) * w;
      const ya = y0 + h - ev.s.pts[k - 1] * h, yb = y0 + h - ev.s.pts[k] * h;
      const steps = Math.ceil(Math.hypot(xb - xa, yb - ya));
      for (let s = 0; s <= steps; s++) g.fillRect(Math.round(lerp(xa, xb, s / steps)), Math.round(lerp(ya, yb, s / steps)), 1, 1);
    }
    g.globalAlpha = 1;
  },
  finish(ev) {
    for (const c of world.cities) c.shrink = 0;
    world.grades.ash.t = 0;
    ev.delta('mood', -8);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'tulips',
  title: 'Tulip Mania',
  stamp: 'Economy',
  weight: () => 0.9,
  requires: (w) => w.era >= 1 && w.freeze < 0.1,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Tulip mania sweeps Eternia',
    sub: ev.rng.pick([
      'A single tulip is now worth more than a house. Houses are furious.',
      'Every field in the country is replanted with tulips overnight.',
      'Economists say this has "definitely never happened before, anywhere".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cover = new Cover({ color: (ci, v) => (hash2(ci, 9) < v * 0.45 ? [P('#e04a6a'), P('#f4d45a'), P('#ff8ad8'), P('#c8412e')][Math.floor(hash2(ci, 4) * 4)] : 0) });
    for (let k = 0; k < 20; k++) { const ci = randomLandCell(ev.rng, (c) => cells.biome[c] === BIOME.PLAINS); if (ci >= 0) ev.s.cover.seed(ci); }
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Tulips become fashionable. Then valuable. Then extremely valuable.'));
    if (t < 8) ev.s.cover.grow(dt, 1200, (ci) => cells.land[ci] && cells.biome[ci] === BIOME.PLAINS);
    ev.at(2.5, 'p1', () => ticker('Price of one tulip: a cow.'));
    ev.at(4.5, 'p2', () => ticker('Price of one tulip: a house.'));
    ev.at(6.5, 'p3', () => ticker('Price of one tulip: a small town. Snootsbury briefly considers selling.'));
    ev.at(8.5, 'pop', () => { camera.kick(2); ticker('Someone realises tulips are just flowers. Price of one tulip: one tulip.'); });
    ev.at(9.5, 'b1', () => say(ev.rng.pick(world.cities), 'I sold my house for these!', {}));
    ev.at(11, 'b2', () => say(ev.rng.pick(world.cities), 'They are very pretty, though', {}));
    if (t > 11) ev.s.cover.fade(dt, 0.3);
  },
  finish(ev) { ev.s.cover.remove(); ev.delta('mood', -2); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'championship',
  title: 'The National Championship',
  stamp: 'Sport',
  weight: () => 1,
  requires: (w) => w.era >= 1,
  duration: 17,
  setup(ev) {
    [ev.a, ev.b] = sameSidePair(ev.rng, 90);
    // the pitch needs solid ground under all of it
    ev.spot = null;
    for (let k = 0; k < 300 && !ev.spot; k++) {
      const u = ev.rng.range(0.3, 0.7);
      const x = Math.round(lerp(ev.a.x, ev.b.x, u) + ev.rng.range(-14, 14)), y = Math.round(lerp(ev.a.y, ev.b.y, u) + ev.rng.range(-10, 10));
      let ok = world.cities.every((c) => dist(c.x, c.y, x, y) > 14);
      for (let dy = -7; dy <= 7 && ok; dy += 2) for (let dx = -14; dx <= 14 && ok; dx += 2) if (!map.isWalkable(x + dx, y + dy)) ok = false;
      if (ok) ev.spot = { x, y };
    }
    if (!ev.spot) ev.spot = landSpotNear(ev.a, 16, 30, ev.rng, 6);
    ev.sport = ev.rng.pick(['football', 'competitive cheese rolling', 'extreme croquet', 'goat polo']);
    ev.winner = ev.rng.chance(0.5) ? ev.a : ev.b;
  },
  headline: (ev) => ({
    title: `${ev.a.name} and ${ev.b.name} meet in the national ${ev.sport} final`,
    sub: ev.rng.pick([
      'Both towns have been practising all year. Both towns have been practising different sports.',
      'Tickets sold out in four minutes. The stadium holds nine people.',
      'The referee has been bribed by both sides, so it evens out.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x, y: ev.spot.y - 2, zoom: 2.7 }),
  start(ev) {
    ev.s.fans = new Crowd(); ev.s.ball = { x: ev.spot.x, y: ev.spot.y };
    const colA = '#3a8ad8', colB = '#e04a3a';
    for (let k = 0; k < 10; k++) {
      ev.s.fans.add({ x: ev.a.x, y: ev.a.y, tx: ev.spot.x - 10 + ev.rng.range(-2, 2), ty: ev.spot.y + ev.rng.range(-5, 5), speed: 16, color: colA, home: ev.a });
      ev.s.fans.add({ x: ev.b.x, y: ev.b.y, tx: ev.spot.x + 10 + ev.rng.range(-2, 2), ty: ev.spot.y + ev.rng.range(-5, 5), speed: 16, color: colB, home: ev.b });
    }
  },
  update(ev, dt) {
    const t = ev.t, sp = ev.spot, fans = ev.s.fans;
    fans.update(dt);
    ev.at(0.2, 't0', () => ticker(`Fans from ${ev.a.name} and ${ev.b.name} pour into the stadium, which is a field.`));
    if (t > 3 && t < 11) {
      ev.s.ball.x = sp.x + Math.sin(t * 1.7) * 6 + Math.sin(t * 4.3) * 2;
      ev.s.ball.y = sp.y + Math.sin(t * 2.3) * 2;
    }
    ev.at(5, 'b1', () => say(ev.rng.pick(fans.list.filter((f) => f.home === ev.a)), `Come on ${ev.a.name}!`, { align: 'left' }));
    ev.at(7, 'b2', () => say(ev.rng.pick(fans.list.filter((f) => f.home === ev.b)), `Go ${ev.b.name}!`, { align: 'right', lift: 16 }));
    ev.at(11, 'goal', () => {
      ev.s.ball.x = sp.x + (ev.winner === ev.a ? 9 : -9);
      camera.kick(3);
      fx.burst(sp.x, sp.y - 4, 50, { speed: 26, vz: 20, g: 10, colors: ev.winner === ev.a ? ['#3a8ad8', '#ffffff', '#f4c542'] : ['#e04a3a', '#ffffff', '#f4c542'], life: 2 });
      ticker(`${ev.winner.name} wins! It was very close. It was also very confusing.`);
    });
    ev.at(12, 'b3', () => say(ev.winner, 'CHAMPIONS!', {}));
    ev.at(13.5, 'home', () => fans.send((f) => { f.tx = f.home.x; f.ty = f.home.y; }));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    const sp = ev.spot, ox = offX(sp.x, sp.y);
    g.fillStyle = 'rgba(160,210,110,0.9)'; g.fillRect(Math.round(sp.x + ox) - 12, Math.round(sp.y) - 5, 25, 11);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(sp.x + ox), Math.round(sp.y) - 5, 1, 11);
    g.fillRect(Math.round(sp.x + ox) - 12, Math.round(sp.y) - 1, 1, 3); g.fillRect(Math.round(sp.x + ox) + 12, Math.round(sp.y) - 1, 1, 3);
    ev.s.fans.draw(g, t);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(ev.s.ball.x + ox), Math.round(ev.s.ball.y), 1, 1);
  },
  finish(ev) {
    ev.winner.souvenirs.add('statue');
    ev.delta('mood', +6);
    logCity(ev.winner, `Won the national ${ev.sport} championship`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'olympics',
  title: 'The Eternian Games',
  stamp: 'Sport',
  weight: () => 0.9,
  requires: (w) => w.era >= 1,
  duration: 17,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities);
    ev.track = null;
    for (let k = 0; k < 80 && !ev.track; k++) {
      const a = ev.rng.range(0, TAU);
      const x = Math.round(ev.city.x + Math.cos(a) * 20), y = Math.round(ev.city.y + Math.sin(a) * 12);
      let ok = true;
      for (let dx = -12; dx <= 12 && ok; dx += 4) for (let dy = -6; dy <= 6 && ok; dy += 3) if (!map.isWalkable(x + dx, y + dy)) ok = false;
      if (ok) ev.track = { x, y };
    }
    ev.track = ev.track || { x: ev.city.x + 18, y: ev.city.y };
  },
  headline: (ev) => ({
    title: `${ev.city.name} hosts the Eternian Games`,
    sub: ev.rng.pick([
      'Events include running, jumping, and running while jumping.',
      'Every athlete wins a medal. Some win several. The medals are chocolate.',
      'The torch is lit, then immediately blown out by an excited sneeze.',
    ]),
  }),
  focus: (ev) => ({ x: ev.track.x, y: ev.track.y - 3, zoom: 2.8 }),
  start(ev) { ev.s.runners = [0, 1, 2, 3, 4, 5].map((k) => ({ a: k * 0.3, speed: 1.5 + k * 0.07, col: ['#c8412e', '#3a8ad8', '#f4c542', '#7ac04a', '#7a3a9a', '#f2eee2'][k] })); },
  update(ev, dt) {
    const t = ev.t, tr = ev.track;
    ev.at(0.2, 't0', () => ticker(`The torch arrives in ${ev.city.name}. It has been carried by 400 people, most of them lost.`));
    if (t > 1) fx.fire(tr.x - 14, tr.y - 7, { spread: 1.5 });
    if (t > 3 && t < 12) for (const r of ev.s.runners) r.a += dt * r.speed;
    ev.at(4, 'b1', () => say({ x: tr.x, y: tr.y - 7 }, 'And they\'re off!', {}));
    ev.at(12, 'win', () => {
      const win = ev.s.runners.slice().sort((p, q) => q.a - p.a)[0];
      fx.burst(tr.x, tr.y - 3, 40, { speed: 22, vz: 20, g: 10, colors: ['#f4c542', '#ffffff', win.col], life: 1.8 });
      ticker('Everyone gets a medal. The medals are chocolate. The medals are gone within minutes.');
    });
    if (t > 12.5 && t < 16) ev.every('fw', 0.45, dt, () => fx.firework(tr.x + ev.rng.range(-12, 12), tr.y, ev.rng.range(20, 34)));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    const tr = ev.track, x0 = Math.round(tr.x + offX(tr.x, tr.y)), y0 = Math.round(tr.y);
    for (let k = 0; k < 80; k++) {
      const a = (k / 80) * TAU;
      g.fillStyle = '#c86a4a'; g.fillRect(Math.round(x0 + Math.cos(a) * 11), Math.round(y0 + Math.sin(a) * 5), 1, 1);
      g.fillStyle = '#e8e4dc'; g.fillRect(Math.round(x0 + Math.cos(a) * 9), Math.round(y0 + Math.sin(a) * 4), 1, 1);
    }
    g.fillStyle = '#8aba5a'; g.fillRect(x0 - 7, y0 - 2, 15, 5);
    g.fillStyle = '#8a8680'; g.fillRect(x0 - 15, y0 - 5, 2, 5);
    for (const r of ev.s.runners) {
      const x = Math.round(x0 + Math.cos(r.a) * 10), y = Math.round(y0 + Math.sin(r.a) * 4.5);
      g.fillStyle = r.col; g.fillRect(x, y - 1, 1, 2);
      g.fillStyle = '#f0c9a0'; g.fillRect(x, y - 2, 1, 1);
    }
  },
  finish(ev) {
    ev.city.souvenirs.add('statue');
    ev.delta('mood', +8);
    logCity(ev.city, 'Hosted the Eternian Games. Chocolate medals for all');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'tourism',
  title: 'Tourism Boom',
  stamp: 'Economy',
  weight: () => 1,
  requires: () => true,
  duration: 16,
  setup(ev) {
    const coastal = world.cities.filter((c) => c.coastal);
    ev.towns = (coastal.length ? coastal : world.cities).slice(0, 3);
  },
  headline: (ev) => ({
    title: 'Eternia is suddenly the hottest holiday destination in the world',
    sub: ev.rng.pick([
      'Tourists photograph everything, including each other photographing everything.',
      'Guidebooks describe Eternia as "small, strange, and very cheap".',
      'Locals charge admission to look at the crater. And the pond. And the goat.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.crowd = new Crowd();
    ev.s.ships = ev.towns.map((c) => { const sea = seaApproach(c); return { c, sea, x: sea.off.x, y: sea.off.y }; });
    for (const { c, sea } of ev.s.ships) for (let k = 0; k < 8; k++) {
      ev.s.crowd.add({ x: sea.shore.x, y: sea.shore.y, tx: c.x, ty: c.y + 2, ...spreadAround(0, 0, 10), speed: ev.rng.range(8, 12), color: ev.rng.pick(['#ff6ad8', '#5ae8f0', '#f4d45a', '#ff8a4a']), hat: '#f2eee2', hatWide: true, town: c, delay: k * 0.4 });
    }
  },
  update(ev, dt) {
    const t = ev.t, crowd = ev.s.crowd;
    for (const s of ev.s.ships) {
      const to = t < 12.5 ? s.sea.dock : s.sea.off;
      s.x = approach(s.x, to.x, 0.9, dt); s.y = approach(s.y, to.y, 0.9, dt);
    }
    ev.at(0.2, 't0', () => ticker('Cruise ships appear on the horizon. They are very large and full of sun hats.'));
    for (const a of crowd.list) {
      if (t < 2 + a.delay) continue;
      if (crowd.arrived(a) && Math.random() < dt * 0.4) { a.tx = a.town.x + ev.rng.range(-10, 10); a.ty = a.town.y + ev.rng.range(-5, 6); a.jx = a.jy = 0; }
      if (Math.random() < dt * 0.3) fx.spawn({ x: a.x, y: a.y, z: 3, life: 0.12, colors: ['#ffffff'], size: 2, layer: 'air' });
    }
    if (t > 2) crowd.update(dt);
    ev.at(4, 'zoom', () => camera.focus(ev.towns[0].x, ev.towns[0].y, 2.2, 0.8));
    ev.at(5, 'b1', () => say(ev.rng.pick(crowd.list), 'Can you take our photo?', {}));
    ev.at(7.5, 'b2', () => say(ev.towns[0], 'Two coins to look at the goat', {}));
    ev.at(9, 't1', () => ticker('Souvenir shops open in every town. Top seller: a tiny model of the crater.'));
    ev.at(11.5, 'leave', () => { crowd.dismiss(1.4); camera.focus(W / 2, H / 2, 1.05, 0.8); ticker('The tourists sail home with sunburn and fond memories.'); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    for (const s of ev.s.ships) drawSprite(g, SPR3.shipForeign, s.x + offX(s.x, s.y), s.y - 2, s.sea.off.x > s.sea.dock.x);
    const all = ev.s.crowd.list;
    ev.s.crowd.list = all.filter((a) => ev.t >= 2 + a.delay);   // tourists step off one at a time
    ev.s.crowd.draw(g, t);
    ev.s.crowd.list = all;
  },
  finish(ev) {
    for (const c of ev.towns) c.popCap = Math.round(c.popCap * 1.05);
    ev.delta('mood', +6);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'bakeoff',
  title: 'The Great Bake-Off',
  stamp: 'Culture',
  weight: () => 1,
  requires: (w) => w.era >= 1,
  duration: 16,
  setup(ev) {
    ev.city = capitalOf('west');
    ev.spot = { x: ev.city.x + 12, y: ev.city.y + 3 };
    for (let k = 0; k < 60; k++) {
      const a = ev.rng.range(0, TAU);
      const x = Math.round(ev.city.x + Math.cos(a) * 13), y = Math.round(ev.city.y + Math.sin(a) * 8);
      if (map.isWalkable(x, y)) { ev.spot = { x, y }; break; }
    }
    ev.flavour = ev.rng.pick(['lemon drizzle', 'triple chocolate', 'carrot (disputed)', 'cheese', 'turnip surprise']);
  },
  headline: (ev) => ({
    title: `Eternia bakes the world's largest ${ev.flavour} cake`,
    sub: ev.rng.pick([
      'The recipe calls for 40,000 eggs and "a light touch".',
      'The judges agree it is "a bit soggy on the bottom".',
      'Every citizen gets a slice. Several get two, then deny it.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x, y: ev.spot.y - 8, zoom: 2.8 }),
  start(ev) { ev.s.layers = 0; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`Bakers from every town gather in ${ev.city.name} with very large spoons.`));
    if (t > 1 && t < 8) ev.s.layers = Math.min(5, Math.floor((t - 1) / 1.3) + 1);
    ev.at(8.5, 'candles', () => { ev.s.candles = true; fx.burst(ev.spot.x, ev.spot.y - 14, 12, { speed: 10, colors: ['#fff0a0', '#ff8a2a'], life: 0.8 }); });
    ev.at(9.5, 'b1', () => say({ x: ev.spot.x, y: ev.spot.y - 16 }, 'A bit soggy on the bottom', { life: 2.2 }));
    ev.at(11, 'eat', () => {
      ev.s.eaten = true;
      for (const c of world.cities) fx.hearts(c.x, c.y - 3);
      ticker(`The ${ev.flavour} cake is shared with the whole country. It is gone in eleven minutes.`);
    });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    const x = Math.round(ev.spot.x + offX(ev.spot.x, ev.spot.y)), y = Math.round(ev.spot.y);
    const cols = ['#e8c070', '#f2eee2', '#ff9ab4', '#e8c070', '#f2eee2'];
    const n = ev.s.eaten ? 1 : ev.s.layers;
    for (let k = 0; k < n; k++) {
      const w = 13 - k * 2;
      g.fillStyle = cols[k]; g.fillRect(x - (w >> 1), y - 2 - k * 2, w, 2);
      g.fillStyle = '#ff6a8a'; g.fillRect(x - (w >> 1), y - 2 - k * 2, w, 1);
    }
    if (ev.s.candles && !ev.s.eaten) for (let k = -2; k <= 2; k += 2) {
      g.fillStyle = '#f2eee2'; g.fillRect(x + k, y - 13, 1, 2);
      g.fillStyle = Math.sin(t * 12 + k) > 0 ? '#ffd24a' : '#ff8a2a'; g.fillRect(x + k, y - 14, 1, 1);
    }
  },
  finish(ev) { ev.delta('mood', +8); logCity(ev.city, `Baked the world's largest ${ev.flavour} cake`); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'fashion',
  title: 'The Fashion Craze',
  stamp: 'Culture',
  weight: () => 1,
  requires: (w) => w.era >= 1,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'A fashion craze sweeps Eternia',
    sub: ev.rng.pick([
      'Every town repaints its roofs to match the season. The season changes every three seconds.',
      'Hats are in. Then out. Then in, but sideways.',
      'Critics call it "bold", "brave" and "please stop".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  update(ev) {
    const t = ev.t;
    const trends = [
      [['#ff4fa0', '#e03a88'], 'Pink roofs are in!'],
      [['#9aff4a', '#6ad83a'], 'Lime is the new pink!'],
      [['#f4c542', '#e0a82a'], 'Gold! Everything gold!'],
      [['#2b2622', '#3a342c'], 'Black is back. Very serious.'],
      [['#5ae8f0', '#3ab8d0'], 'Aqua. Obviously.'],
    ];
    ev.at(0.2, 't0', () => ticker('A tastemaker in the capital declares roofs "so last season".'));
    const k = Math.floor((t - 1) / 2.2);
    if (t > 1 && t < 12 && trends[k] && ev.s.k !== k) {
      ev.s.k = k;
      world.fashion = trends[k][0];
      ticker(trends[k][1]);
      for (const c of world.cities) fx.burst(c.x, c.y - 3, 6, { speed: 10, colors: [trends[k][0][0], '#ffffff'], life: 0.6 });
    }
    ev.at(6, 'b1', () => say(ev.rng.pick(world.cities), 'So last season', {}));
    ev.at(12, 'over', () => { world.fashion = null; ticker('Everyone quietly repaints their roofs the old colour and pretends this never happened.'); });
  },
  finish(ev) { world.fashion = null; ev.delta('mood', +3); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'nap',
  title: 'The Nationwide Nap',
  stamp: 'Good news',
  weight: () => 0.9,
  requires: () => true,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Eternia takes a nationwide nap',
    sub: ev.rng.pick([
      'The whole country falls asleep at 2pm. Productivity is unaffected.',
      'Even the cows are having a lie-down.',
      'Historians call it "the most peaceful fifteen minutes on record".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.dusk.t = 0.4; world.freezeTraffic = true; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('At exactly 2pm, everyone in Eternia yawns at the same time.'));
    if (t > 1.5 && t < 11) ev.every('z', 0.5, dt, () => say(ev.rng.pick(world.cities), ev.rng.pick(['Zzz', 'zzZZzz', 'Zzz... five more minutes', '*snore*']), { life: 1.8 }));
    ev.at(6, 't1', () => ticker('The boats drift. The caravans rest. Somewhere, a cat approves.'));
    ev.at(11.5, 'wake', () => {
      world.grades.dusk.t = 0; world.freezeTraffic = false;
      camera.kick(1.5);
      ticker('An alarm clock goes off in the capital. Eternia wakes up, refreshed and slightly confused.');
    });
    ev.at(12.5, 'b1', () => say(capitalOf('west'), 'What year is it?', {}));
  },
  finish(ev) { world.grades.dusk.t = 0; world.freezeTraffic = false; ev.delta('mood', +7); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'dance',
  title: 'The Dance Craze',
  stamp: 'Culture',
  weight: () => 1,
  requires: () => true,
  duration: 15,
  setup(ev) { ev.dance = ev.rng.pick(['the Eternian Wobble', 'the Goat Shuffle', 'the Sinkhole Slide', 'the Crumpet']); },
  headline: (ev) => ({
    title: `A new dance, ${ev.dance}, sweeps the nation`,
    sub: ev.rng.pick([
      'Nobody knows who started it. Everybody knows how to do it.',
      'Doctors report a sharp rise in happily twisted ankles.',
      'The dance is banned twice and unbanned three times.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.night.t = 0.45; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`Someone in the capital invents ${ev.dance}. Within minutes, the whole country is doing it.`));
    const on = t > 1.5 && t < 12;
    for (const c of world.cities) c.oy = on ? -Math.abs(Math.sin(t * 6 + (c.id % 2) * 0.6)) * 2 : approach(c.oy, 0, 6, dt);
    ev.at(4, 'b1', () => say(ev.rng.pick(world.cities), 'Left foot! Right foot! Goat!', {}));
    ev.at(7, 'b2', () => say(ev.rng.pick(world.cities), 'I can\'t stop!', {}));
    ev.at(12, 'stop', () => { world.grades.night.t = 0; ticker('The music stops. The whole country sits down at once. It was a lot.'); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky' || ev.t < 1.5 || ev.t > 12) return;
    // disco lights sweeping the map
    const cols = ['rgba(255,80,200,0.18)', 'rgba(80,230,240,0.18)', 'rgba(250,220,80,0.18)'];
    for (let k = 0; k < 3; k++) {
      const x = W / 2 + Math.sin(t * (1.1 + k * 0.3) + k * 2) * W * 0.35, y = H / 2 + Math.cos(t * (0.9 + k * 0.25) + k) * H * 0.3;
      g.fillStyle = cols[k]; g.beginPath(); g.ellipse(x, y, 60, 40, 0, 0, TAU); g.fill();
    }
  },
  finish(ev) {
    for (const c of world.cities) c.oy = 0;
    world.grades.night.t = 0;
    ev.delta('mood', +8);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'lights',
  title: 'The Festival of Lights',
  stamp: 'Good news',
  weight: () => 1,
  requires: () => true,
  duration: 17,
  setup() {},
  headline: (ev) => ({
    title: 'Eternia celebrates the Festival of Lights',
    sub: ev.rng.pick([
      'Every town releases lanterns into the sky. The sky is delighted.',
      'Nobody remembers what the festival is for. Everybody agrees it is lovely.',
      'The moon reportedly feels a bit upstaged.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.night.t = 0.85; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Night falls. Every town lights a lantern. Then another. Then all of them.'));
    if (t > 2 && t < 12) ev.every('lantern', 0.05, dt, () => {
      const c = ev.rng.pick(world.cities);
      fx.spawn({ x: c.x + ev.rng.range(-5, 5), y: c.y, z: 2, vz: ev.rng.range(5, 9), vx: ev.rng.range(1, 4), drag: 0.1, life: ev.rng.range(4, 6), size: Math.random() < 0.5 ? 2 : 1, colors: ['#ffe29a', '#ffc46a', '#ffa45a'], layer: 'sky' });
    });
    ev.at(5, 'b1', () => say(ev.rng.pick(world.cities), 'Make a wish!', {}));
    ev.at(7.5, 'b2', () => say(ev.rng.pick(world.cities), 'So many lanterns!', {}));
    if (t > 10 && t < 14.5) ev.every('fw', 0.35, dt, () => { const c = ev.rng.pick(world.cities); fx.firework(c.x + ev.rng.range(-5, 5), c.y, ev.rng.range(26, 42)); });
    ev.at(10, 't1', () => ticker('The fireworks start. Every cow in Eternia looks up at once.'));
    ev.at(15, 'day', () => { world.grades.night.t = 0; });
  },
  finish(ev) { world.grades.night.t = 0; ev.delta('mood', +10); },
});
