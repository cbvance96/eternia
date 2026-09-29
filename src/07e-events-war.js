// ============================================================================
// 07e EVENTS, BATCH 2b — war and conflict, Eternia style: lots of noise,
// very few consequences. Several need a split country; those that happen in
// the water channel between the halves work in screen space (screen: true).
// ============================================================================

const sxOf = (x, y) => x + offX(x, y);                              // world -> drawn x
const channelX = (y, u) => map.bx(y) + u * world.eastOffset;       // u: 0 west shore, 1 east shore
function channelRows(rng, n) {
  // rows where both shores are land, spread along the middle of the country
  const rows = [];
  for (let y = map.top + 10; y < map.bottom - 10; y++) {
    const x = Math.round(map.bx(y));
    if (map.isLand(x - 2, y) && map.isLand(x + 2, y) && y > map.lake.y + 8) rows.push(y);
  }
  const mid = rows[Math.floor(rows.length / 2)] ?? H / 2;
  return Array.from({ length: n }, (_, k) => mid + (k - (n - 1) / 2) * 6 + Math.round(rng.range(-1, 1)));
}
function sameSidePair(rng, maxDist = 75) {
  const pairs = [];
  for (const a of world.cities) for (const b of world.cities) {
    if (a.id < b.id && a.side === b.side && dist(a.x, a.y, b.x, b.y) < maxDist) pairs.push([a, b]);
  }
  return rng.pick(pairs);
}
function meetingPoint(rng, a, b) {
  for (let k = 0; k < 80; k++) {
    const u = rng.range(0.4, 0.6);
    const x = Math.round(lerp(a.x, b.x, u) + rng.range(-5, 5)), y = Math.round(lerp(a.y, b.y, u) + rng.range(-4, 4));
    if (map.isWalkable(x, y) && map.isWalkable(x - 6, y) && map.isWalkable(x + 6, y)) return { x, y };
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ---------------------------------------------------------------------------
defineEvent({
  id: 'skirmish',
  title: 'Border Skirmish',
  stamp: 'War',
  weight: () => 1,
  requires: (w) => w.split && w.eastOffset > 8,
  duration: 15,
  setup(ev) { ev.rows = channelRows(ev.rng, 3); },
  headline: (ev) => ({
    title: 'Border skirmish breaks out on the river',
    sub: ev.rng.pick([
      'Both navies consist of one raft each. Both rafts are named "Victory".',
      'Military experts describe the tactics as "mostly splashing".',
      'The war is paused twice for lunch and once for a swan.',
    ]),
  }),
  focus: (ev) => ({ x: map.bx(ev.rows[1]) + world.eastOffset / 2, y: ev.rows[1], zoom: 3.2 }),
  start(ev) {
    ev.s.rafts = [];
    for (const y of ev.rows) {
      ev.s.rafts.push({ side: 'west', y, u: 0.05, target: 0.46, state: 'row' });
      ev.s.rafts.push({ side: 'east', y: y + 1, u: 0.95, target: 0.54, state: 'row' });
    }
    ev.s.swimmers = [];
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('The East and West navies launch. All six rafts of them.'));
    ev.at(1, 'b1', () => say({ x: map.bx(ev.rows[0]) - 1, y: ev.rows[0] }, 'Charge!', { side: 'west', align: 'left' }));
    for (const r of ev.s.rafts) {
      if (r.state === 'row') {
        r.u = approach(r.u, r.target, 0.9, dt);
        if (Math.abs(r.u - r.target) < 0.01 && t > 3) r.state = 'bump';
      }
    }
    ev.at(4.5, 'bump', () => {
      camera.kick(2);
      for (const r of ev.s.rafts) fx.splash(channelX(r.y, r.u), r.y, true);
      say({ x: map.bx(ev.rows[1]) + 1, y: ev.rows[1] }, 'Oi! Watch it!', { side: 'east', align: 'right' });
    });
    ev.at(7, 'capsize', () => {
      for (const r of ev.s.rafts) {
        r.state = 'flipped';
        fx.splash(channelX(r.y, r.u), r.y, true);
        ev.s.swimmers.push({ side: r.side, y: r.y, u: r.u, home: r.side === 'west' ? 0 : 1 });
      }
      ticker('Both navies capsize at exactly the same moment. Both claim victory.');
    });
    for (const s of ev.s.swimmers) s.u = approach(s.u, s.home, 0.5, dt);
    ev.at(8, 'b2', () => say({ x: map.bx(ev.rows[2]) - 1, y: ev.rows[2] }, 'Glub', { align: 'left' }));
    ev.at(11, 't1', () => ticker('The swimmers reach home. The rafts drift out to sea and start a new life.'));
    if (t > 9) for (const r of ev.s.rafts) r.y += dt * 4;
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    for (const r of ev.s.rafts) {
      const x = Math.round(channelX(r.y, r.u)), y = Math.round(r.y);
      g.fillStyle = '#6b4a30'; g.fillRect(x - 1, y, 3, 1);
      if (r.state !== 'flipped') {
        g.fillStyle = SIDE[r.side].dark; g.fillRect(x, y - 2, 1, 2);
        g.fillStyle = '#f0c9a0'; g.fillRect(x, y - 3, 1, 1);
        g.fillStyle = '#d8d0c0'; g.fillRect(x + (r.side === 'west' ? 1 : -1), y - 1 - (Math.sin(t * 8) > 0 ? 1 : 0), 1, 1);
      }
    }
    for (const s of ev.s.swimmers) {
      const x = Math.round(channelX(s.y, s.u)), y = Math.round(s.y);
      g.fillStyle = '#f0c9a0'; g.fillRect(x, y, 1, 1);
      if (Math.sin(t * 10 + s.y) > 0.5) { g.fillStyle = '#e8f6f2'; g.fillRect(x - 1, y + 1, 3, 1); }
    }
  },
  finish(ev) { ev.delta('mood', -3); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'grievances',
  title: 'The War of Minor Grievances',
  stamp: 'War',
  weight: () => 1,
  requires: (w) => w.split && w.eastOffset > 8,
  duration: 16,
  setup(ev) { ev.rows = channelRows(ev.rng, 9); },
  headline: (ev) => ({
    title: 'The War of Minor Grievances begins',
    sub: ev.rng.pick([
      'The official cause is a borrowed ladder that was never returned.',
      'Both sides fire arrows. Both sides mostly hit the river.',
      'Casualties: zero. Hurt feelings: extensive.',
    ]),
  }),
  focus: (ev) => ({ x: map.bx(ev.rows[4]), y: ev.rows[4], zoom: 2.2 }),
  update(ev, dt) {
    const t = ev.t, off = world.eastOffset;
    const lines = [
      ['west', 'You borrowed our ladder!'], ['east', 'Your cows look at us funny!'],
      ['west', 'You have the better sunsets!'], ['east', 'You started it!'], ['west', 'Did not!'], ['east', 'Did too!'],
    ];
    lines.forEach(([side, line], i) => ev.at(1 + i * 1.8, 'l' + i, () => {
      const y = ev.rng.pick(ev.rows);
      say({ x: side === 'west' ? map.bx(y) - 6 : map.bx(y) + 6, y }, line, { side, align: side === 'west' ? 'left' : 'right', life: 2 });
    }));
    ev.at(0.2, 't0', () => ticker('Archers line up on both banks. Everyone has brought far too many arrows.'));
    if (t > 1.5 && t < 13) ev.every('volley', 0.09, dt, () => {
      const fromWest = ev.rng.chance(0.5);
      const y0 = ev.rng.pick(ev.rows), y1 = y0 + ev.rng.range(-8, 8);
      const x0 = fromWest ? map.bx(y0) - ev.rng.range(3, 12) : map.bx(y0) + off + ev.rng.range(3, 12);
      const short = ev.rng.chance(0.6);
      const x1 = short ? map.bx(y1) + ev.rng.range(1, off - 1) : (fromWest ? map.bx(y1) + off + ev.rng.range(2, 10) : map.bx(y1) - ev.rng.range(2, 10));
      fx.launch({
        x0, y0, x1, y1, z0: 1, z1: 0, arc: ev.rng.range(8, 16), dur: ev.rng.range(0.7, 1.1), screen: true,
        draw: (g, x, y, p) => { g.fillStyle = '#3a2e26'; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.fillStyle = '#d8d0c0'; g.fillRect(Math.round(x - Math.sign(p.dx || 1)), Math.round(y), 1, 1); },
        onHit: (p) => { if (short) fx.splash(p.x, p.y, true); else fx.burst(p.x, p.y, 2, { speed: 6, colors: ['#b8a888'], life: 0.4, screen: true, layer: 'ground' }); },
      });
    });
    ev.at(13.5, 't1', () => ticker('Both sides run out of arrows. The river is now 30% arrow.'));
  },
  finish(ev) { ev.delta('mood', -6); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'naval',
  title: 'Naval Battle',
  stamp: 'War',
  weight: () => 0.9,
  requires: (w) => w.era >= 1,
  duration: 17,
  setup(ev) {
    // open water with room to circle, as close to the middle of the map as possible
    let best = null;
    for (let y = 40; y < H - 34; y += 3) for (let x = 60; x < W - 60; x += 3) {
      if (map.oceanDepth(x, y) < 12) continue;
      let clear = true;
      for (const [dx, dy] of [[-34, 0], [34, 0], [0, -16], [0, 16]]) if (map.oceanDepth(x + dx, y + dy) < 3) clear = false;
      if (!clear) continue;
      const score = dist(x, y, W / 2, H / 2) + ev.rng.range(0, 30);
      if (!best || score < best.score) best = { x, y, score };
    }
    ev.x = best ? best.x : W / 2; ev.y = best ? best.y : H - 20;
    ev.teams = world.split
      ? [{ spr: SPR3.shipWest, name: 'West' }, { spr: SPR3.shipEast, name: 'East' }]
      : [{ spr: SPR3.shipForeign, name: 'Eternia' }, { spr: SPR3.shipPirate, name: 'pirates' }];
  },
  headline: (ev) => ({
    title: world.split ? 'East and West navies clash at sea' : 'The Eternian navy meets some very lost pirates',
    sub: ev.rng.pick([
      'Admirals on both sides are seasick but "managing".',
      'Cannons are fired mostly in the general direction of the sea.',
      'Seagulls declare neutrality and demand chips.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x, y: ev.y - 6, zoom: 2.6 }),
  start(ev) {
    ev.s.ships = [];
    for (let k = 0; k < 6; k++) {
      ev.s.ships.push({ team: k % 2, a: (k / 6) * TAU, r: 14 + (k % 3) * 5, sink: 0, alive: true });
    }
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('The fleets meet at sea and immediately start sailing in circles.'));
    for (const s of ev.s.ships) {
      if (!s.alive) { s.sink = Math.min(1, s.sink + dt * 0.35); continue; }
      s.a += dt * (0.35 + s.team * 0.08);
      s.x = ev.x + Math.cos(s.a) * s.r * 1.4; s.y = ev.y + Math.sin(s.a) * s.r * 0.6;
      if (Math.random() < 0.3) fx.spawn({ x: s.x, y: s.y + 2, life: 0.9, colors: ['#bfe0d6', '#8cc0c0'], layer: 'ground', screen: true });
    }
    if (t > 1.5 && t < 13) ev.every('cannon', 0.28, dt, () => {
      const alive = ev.s.ships.filter((s) => s.alive);
      const from = ev.rng.pick(alive);
      const foes = alive.filter((s) => s.team !== from.team);
      if (!from || !foes.length) return;
      const to = ev.rng.pick(foes);
      fx.smoke(from.x, from.y - 1, { size: 2, life: 1.2, rise: 3, colors: ['#e8e4dc', '#b8b4ac'], screen: true });
      fx.launch({
        x0: from.x, y0: from.y - 1, x1: to.x + ev.rng.range(-6, 6), y1: to.y + ev.rng.range(-3, 3), z0: 1, z1: 0, arc: 6, dur: 0.7, screen: true,
        draw: (g, x, y) => { g.fillStyle = '#2b2622'; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
        onHit: (p) => fx.splash(p.x, p.y, true),
      });
    });
    ev.at(3, 'b1', () => { const s = ev.s.ships[0]; say({ x: s.x, y: s.y - 4, screen: true }, 'Fire!', { life: 1.5 }); });
    ev.at(9, 'sink', () => {
      const s = ev.s.ships[3];
      s.alive = false;
      camera.kick(2);
      fx.smoke(s.x, s.y, { size: 3, grow: 2, life: 3, screen: true });
      say({ x: s.x, y: s.y - 4, screen: true }, 'Glub glub', { life: 2 });
      ticker(world.split ? 'One ship springs a leak. Its crew swims to the other side\'s ship and asks for tea.' : 'The pirates sink, apologise, and ask for directions home.');
    });
    ev.at(12.5, 't1', () => ticker('Both fleets sail home to report a "decisive draw".'));
  },
  draw(ev, g, layer) {
    if (layer !== 'ground') return;
    for (const s of ev.s.ships) {
      if (s.x == null) continue;
      const spr = ev.teams[s.team].spr;
      const flip = Math.sin(s.a) < 0;
      if (s.sink >= 1) continue;
      const cut = Math.round(s.sink * spr.height);
      const x = Math.round(s.x - spr.width / 2), y = Math.round(s.y - spr.height / 2) + cut;
      g.save();
      if (flip) { g.translate(x + spr.width, y); g.scale(-1, 1); g.drawImage(spr, 0, 0, spr.width, spr.height - cut, 0, 0, spr.width, spr.height - cut); }
      else g.drawImage(spr, 0, 0, spr.width, spr.height - cut, x, y, spr.width, spr.height - cut);
      g.restore();
    }
  },
  finish(ev) { ev.delta('mood', -4); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'siege',
  title: 'The Siege',
  stamp: 'War',
  weight: () => 1,
  requires: (w) => w.era >= 1,
  duration: 18,
  setup(ev) {
    const [a, b] = sameSidePair(ev.rng, 80);
    ev.attacker = a; ev.town = b;
    const d = dist(a.x, a.y, b.x, b.y);
    const ux = (a.x - b.x) / d, uy = (a.y - b.y) / d;
    ev.cats = [];
    for (const side of [-1, 1]) {
      let x = b.x + ux * 24 - uy * side * 6, y = b.y + uy * 16 + ux * side * 5;
      for (let k = 0; k < 20 && !map.isWalkable(x, y); k++) { x += ux * 2; y += uy * 2; }
      ev.cats.push({ x: Math.round(x), y: Math.round(y), swing: 0 });
    }
  },
  headline: (ev) => ({
    title: `${ev.attacker.name} lays siege to ${ev.town.name}`,
    sub: ev.rng.pick([
      'The dispute concerns a cheese that was "definitely ours".',
      `${ev.town.name} builds walls overnight, mainly out of garden furniture.`,
      'Catapults are borrowed from a museum and returned with apologies.',
    ]),
  }),
  focus: (ev) => ({ x: (ev.town.x + ev.cats[0].x) / 2, y: ev.town.y - 4, zoom: 2.4 }),
  start(ev) { ev.s.wall = 0; ev.s.gaps = new Set(); },
  update(ev, dt) {
    const t = ev.t, c = ev.town;
    ev.at(0.2, 't0', () => ticker(`${c.name} builds walls. Very quickly. Out of whatever it can find.`));
    if (t < 3) ev.s.wall = clamp(t / 2.5, 0, 1);
    ev.at(3, 'b1', () => say(c, 'Ha! Try getting past that!', {}));
    if (t > 3.5 && t < 13) ev.every('stone', 0.55, dt, () => {
      const cat = ev.rng.pick(ev.cats);
      cat.swing = 0.4;
      const a = ev.rng.range(0, TAU);
      const tx = c.x + Math.cos(a) * ev.rng.range(5, 12), ty = c.y - 1 + Math.sin(a) * ev.rng.range(3, 8);
      fx.launch({
        x0: cat.x, y0: cat.y - 2, x1: tx, y1: ty, z0: 3, z1: 0, arc: 26, dur: 1.3,
        draw: (g, x, y) => { g.fillStyle = '#8a8680'; g.fillRect(Math.round(x), Math.round(y), 2, 2); },
        onHit: (p) => {
          fx.dust(p.x, p.y, 6, ['#b8b4ac', '#8a8680']);
          const k = Math.round(((Math.atan2(p.y - c.y + 1, (p.x - c.x) / 1.55) + TAU) % TAU) / TAU * 64);
          ev.s.gaps.add(k); ev.s.gaps.add((k + 1) % 64);
        },
      });
    });
    if (t > 5 && t < 13) ev.every('cabbage', 0.8, dt, () => {
      const cat = ev.rng.pick(ev.cats);
      fx.launch({
        x0: c.x, y0: c.y - 2, x1: cat.x + ev.rng.range(-3, 3), y1: cat.y + ev.rng.range(-2, 2), z0: 3, z1: 0, arc: 20, dur: 1.1,
        draw: (g, x, y) => { g.fillStyle = '#6ab04a'; g.fillRect(Math.round(x), Math.round(y), 2, 2); },
        onHit: (p) => fx.burst(p.x, p.y, 5, { speed: 8, colors: ['#8ed45a', '#4a8a3a'], life: 0.6, layer: 'ground' }),
      });
    });
    for (const cat of ev.cats) cat.swing = Math.max(0, cat.swing - dt);
    ev.at(6, 't1', () => ticker(`${c.name} responds by throwing cabbages. It is surprisingly effective.`));
    ev.at(8, 'b2', () => say(c, 'Is that all you have?', {}));
    ev.at(13.5, 't2', () => ticker('Both sides run out of rocks and cabbages. The siege ends in a shared salad.'));
    ev.at(14.5, 'b3', () => say(c, 'Anyone want coleslaw?', {}));
  },
  draw(ev, g, layer) {
    if (layer !== 'ground') return;
    const c = ev.town, ox = offX(c.x, c.y);
    const n = 64, shown = Math.floor(n * ev.s.wall);
    const fade = clamp((ev.dur - ev.t) / 2, 0, 1);
    g.globalAlpha = fade;
    for (let k = 0; k < shown; k++) {
      if (ev.s.gaps.has(k)) continue;
      const a = (k / n) * TAU;
      const wx = c.x + Math.cos(a) * 12, wy = c.y - 1 + Math.sin(a) * 8;
      if (!map.isWalkable(wx, wy)) continue;   // no walls in the sea
      const x = Math.round(wx + ox), y = Math.round(wy);
      g.fillStyle = '#8a8680'; g.fillRect(x, y - 1, 1, 2);
      g.fillStyle = '#b8b4ac'; g.fillRect(x, y - 2, 1, 1);
    }
    g.globalAlpha = 1;
    for (const cat of ev.cats) {
      const x = Math.round(cat.x + offX(cat.x, cat.y)), y = cat.y;
      g.fillStyle = '#6b4a30'; g.fillRect(x - 2, y, 5, 1); g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1);
      g.fillStyle = '#8d6a44';
      if (cat.swing > 0.2) { g.fillRect(x, y - 4, 1, 3); } else { g.fillRect(x - 2, y - 2, 4, 1); }
    }
  },
  finish(ev) {
    ev.town.damage = clamp(ev.town.damage + 0.2, 0, 1);
    ev.delta('mood', -5);
    logCity(ev.town, `Besieged by ${ev.attacker.name}. The siege ended in salad`);
    logCity(ev.attacker, `Besieged ${ev.town.name} over a cheese`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'coldwar',
  title: 'The Cold War',
  stamp: 'War',
  weight: () => 1,
  requires: (w) => w.split && w.eastOffset > 8 && w.freeze < 0.1,
  duration: 17,
  setup(ev) { ev.rows = channelRows(ev.rng, 5); },
  headline: (ev) => ({
    title: 'East and West enter a Cold War',
    sub: ev.rng.pick([
      'Nobody fires a shot. Everyone stares very intensely.',
      'Spies in trench coats outnumber regular citizens two to one.',
      'Both sides secretly agree the other side has nicer biscuits.',
    ]),
  }),
  focus: (ev) => ({ x: map.bx(ev.rows[2]), y: ev.rows[2], zoom: 2.3 }),
  start(ev) {
    ev.s.cover = new Cover({ alpha: 0.9, color: (ci, v) => (dith(ci, v) ? (noiseAt(ci) > 0.6 ? PAL.snow[0] : PAL.snow[2]) : 0) });
    for (let y = map.top; y < map.bottom; y += 2) {
      const x = map.bx(y);
      ev.s.cover.seed(cellOf(x - 2, y)); ev.s.cover.seed(cellOf(x + 2, y));
    }
    world.grades.cold.t = 0.5;
    ev.s.spies = [];
    for (let k = 0; k < 6; k++) {
      const side = k % 2 ? 'east' : 'west';
      const y = ev.rng.pick(ev.rows);
      ev.s.spies.push({ side, y, u: side === 'west' ? -1.4 : 2.4, target: side === 'west' ? 2.2 : -1.2, delay: 1 + k * 1.3, doc: true });
    }
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Relations cool. Then they freeze. Then someone puts up a sign that says "no".'));
    if (t < 11) ev.s.cover.grow(dt, 500, (ci) => cells.land[ci] && Math.abs(cellX(ci) - map.bx(cellY(ci))) < 16);
    for (const s of ev.s.spies) {
      if (t < s.delay) continue;
      s.u += Math.sign(s.target - s.u) * dt * 0.5;
      if (Math.abs(s.u - s.target) < 0.05) s.u = s.target;
      if (!s.said && s.u > 0.2 && s.u < 0.8) {
        s.said = true;
        fx.splash(channelX(s.y, s.u), s.y, true);
        say({ x: channelX(s.y, s.u), y: s.y, screen: true }, ev.rng.pick(['Psst', 'Nothing to see here', "I'm a tree", 'Lovely weather', 'Shhh']), { life: 1.6 });
      }
    }
    ev.at(7, 't1', () => ticker('Intelligence report: the other side is also sending spies. Both reports are stolen.'));
    ev.at(12, 'thaw', () => { world.grades.cold.t = 0; ticker('The Cold War thaws slightly after both sides share a pot of tea. Neither admits it.'); });
    if (t > 12) ev.s.cover.fade(dt, 0.3);
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    for (const s of ev.s.spies) {
      if (t < 0 || ev.t < s.delay) continue;
      const x = Math.round(channelX(s.y, clamp(s.u, 0, 1)) + (s.u < 0 ? s.u * 4 : s.u > 1 ? (s.u - 1) * 4 : 0)), y = Math.round(s.y);
      const inWater = s.u > 0.1 && s.u < 0.9;
      g.fillStyle = '#5a4a3a'; g.fillRect(x, y - (inWater ? 0 : 1), 1, inWater ? 1 : 2);
      g.fillStyle = '#f0c9a0'; g.fillRect(x, y - (inWater ? 1 : 2), 1, 1);
      g.fillStyle = '#2b2622'; g.fillRect(x - 1, y - (inWater ? 2 : 3), 3, 1);
      if (s.doc && !inWater) { g.fillStyle = '#f6f3ea'; g.fillRect(x + 1, y - 1, 1, 1); }
    }
  },
  finish(ev) {
    ev.s.cover.remove();
    world.grades.cold.t = 0;
    ev.delta('mood', -3);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'invasion',
  title: 'Foreign Invasion',
  stamp: 'War',
  weight: () => 0.9,
  requires: () => true,
  duration: 19,
  setup(ev) {
    const coastal = world.cities.filter((c) => c.coastal);
    ev.city = ev.rng.pick(coastal.length ? coastal : world.cities);
    ev.sea = seaApproach(ev.city);
    ev.landing = ev.sea.dock;
    ev.from = ev.sea.off;
    ev.who = ev.rng.pick(['the Duchy of Elsewhere', 'the Kingdom of Nearby', 'a nation nobody has heard of', 'the Principality of Sort-Of']);
  },
  headline: (ev) => ({
    title: `An army from ${ev.who} lands near ${ev.city.name}`,
    sub: ev.rng.pick([
      'The invaders appear to be holding the map upside down.',
      'Their stated goal is "conquest, or failing that, a nice lunch".',
      'Local defences consist of one goose. The goose is ready.',
    ]),
  }),
  focus: (ev) => ({ x: ev.landing.x, y: ev.landing.y - 4, zoom: 2.2 }),
  start(ev) {
    ev.s.ships = [0, 1, 2].map((k) => ({ x: ev.from.x + (k - 1) * 6, y: ev.from.y + (k - 1) * 4, sx: ev.from.x + (k - 1) * 6, sy: ev.from.y + (k - 1) * 4, tx: ev.landing.x + (k - 1) * 4, ty: ev.landing.y + (k - 1) * 3 }));
    ev.s.troops = new Crowd();
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city, troops = ev.s.troops;
    ev.at(0.2, 't0', () => ticker('Sails on the horizon! Everyone rushes to the beach, mostly to watch.'));
    const leaving = t > 13.5;
    for (const s of ev.s.ships) {
      const tx = leaving ? s.sx : s.tx, ty = leaving ? s.sy : s.ty;
      s.x = approach(s.x, tx, leaving ? 0.5 : 0.7, dt); s.y = approach(s.y, ty, 0.7, dt);
    }
    ev.at(4, 'land', () => {
      for (let k = 0; k < 14; k++) troops.add({ x: ev.sea.shore.x, y: ev.sea.shore.y, tx: c.x, ty: c.y + 3, ...spreadAround(0, 0, 8), speed: ev.rng.range(8, 12), color: '#3a6aa8', hat: '#c8ccd0' });
      ticker('The invaders land and charge bravely in the wrong direction.');
    });
    troops.update(dt);
    ev.at(6.5, 'b1', () => say(ev.rng.pick(troops.list), 'Is this France?', {}));
    ev.at(8, 'b2', () => say(c, "It's Eternia. France is that way.", {}));
    ev.at(9.5, 'b3', () => say(ev.rng.pick(troops.list), 'Oh. Sorry. Nice town though.', {}));
    ev.at(10.5, 'back', () => troops.send((a) => { a.tx = ev.sea.shore.x; a.ty = ev.sea.shore.y; }));
    ev.at(12.5, 'board', () => { troops.dismiss(1.2); ticker(`The invaders sail home, leaving a thank-you card and a slightly damp flag.`); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    for (const s of ev.s.ships) drawSprite(g, SPR3.shipForeign, s.x + offX(s.x, s.y), s.y - 2, ev.from.x > ev.landing.x);
    ev.s.troops.draw(g, t);
  },
  finish(ev) {
    ev.delta('mood', +1);
    logCity(ev.city, `Invaded by ${ev.who}, who were looking for France`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'pillowwar',
  title: 'The Pillow War',
  stamp: 'War',
  weight: () => 1,
  requires: () => true,
  duration: 17,
  setup(ev) {
    [ev.a, ev.b] = sameSidePair(ev.rng, 90);
    ev.spot = meetingPoint(ev.rng, ev.a, ev.b);
  },
  headline: (ev) => ({
    title: `${ev.a.name} declares a pillow war on ${ev.b.name}`,
    sub: ev.rng.pick([
      'The Geneva Conventions have been updated to allow tickling.',
      'Generals on both sides are in pyjamas, which they insist is uniform.',
      'The war is fought with extreme softness.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x, y: ev.spot.y - 4, zoom: 2.6 }),
  start(ev) {
    ev.s.army = new Crowd();
    const dx = Math.sign(ev.b.x - ev.a.x) || 1;
    for (let k = 0; k < 10; k++) {
      ev.s.army.add({ x: ev.a.x, y: ev.a.y, tx: ev.spot.x - dx * 4, ty: ev.spot.y, ...spreadAround(0, 0, 5), speed: 13, color: '#8ab4e8', prop: '#ffffff', team: 0, home: ev.a });
      ev.s.army.add({ x: ev.b.x, y: ev.b.y, tx: ev.spot.x + dx * 4, ty: ev.spot.y, ...spreadAround(0, 0, 5), speed: 13, color: '#e8a0c8', prop: '#ffffff', team: 1, home: ev.b });
    }
    ev.s.cover = new Cover({ alpha: 0.9, color: (ci, v) => (hash2(ci, 17) < v * 0.45 ? P('#fbf8f0') : 0) });
  },
  update(ev, dt) {
    const t = ev.t, sp = ev.spot, army = ev.s.army;
    army.update(dt);
    ev.at(0.2, 't0', () => ticker('Both armies advance, pillows raised. Somebody is humming a lullaby.'));
    if (t > 4 && t < 12) {
      ev.every('whack', 0.08, dt, () => {
        const a = ev.rng.pick(army.list);
        a.down = ev.rng.chance(0.2) ? 0.8 : 0;
        for (let k = 0; k < 4; k++) {
          fx.spawn({ x: a.x, y: a.y, z: 3, vx: ev.rng.range(-8, 8), vy: ev.rng.range(-3, 3), vz: ev.rng.range(4, 14), g: 4, drag: 1.2, life: 2.5, colors: ['#ffffff', '#f4f0e6'], layer: 'air' });
        }
      });
      ev.s.cover.seedAt(sp.x + ev.rng.range(-8, 8), sp.y + ev.rng.range(-5, 5), 0);
      ev.s.cover.grow(dt, 120, (ci) => cells.land[ci] && dist(cellX(ci), cellY(ci), sp.x, sp.y) < 16);
    }
    ev.at(5, 'b1', () => say(ev.rng.pick(army.list.filter((a) => a.team === 0)), 'Take that!', { align: 'left' }));
    ev.at(6.5, 'b2', () => say(ev.rng.pick(army.list.filter((a) => a.team === 1)), 'Ow! Fluffy!', { align: 'right', lift: 18 }));
    ev.at(9, 't1', () => ticker('Feathers everywhere. Visibility down to one metre. Morale up to 100%.'));
    ev.at(12, 'hug', () => { fx.hearts(sp.x, sp.y - 2); fx.hearts(sp.x + 4, sp.y); ticker('The war ends in a group hug. Both sides claim they hugged first.'); });
    ev.at(13, 'home', () => army.send((a) => { a.tx = a.home.x; a.ty = a.home.y; a.down = 0; }));
    if (t > 13) ev.s.cover.fade(dt, 0.35);
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.army.draw(g, t); },
  finish(ev) {
    ev.s.cover.remove();
    ev.delta('mood', +5);
    logCity(ev.a, `Fought the Pillow War against ${ev.b.name}. Still finding feathers`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'dronewar',
  title: 'The Drone War',
  stamp: 'War',
  weight: () => 1,
  requires: (w) => w.era >= 4,
  duration: 17,
  setup(ev) {
    if (world.split) { ev.a = capitalOf('west'); ev.b = capitalOf('east'); }
    else {
      const sorted = world.cities.slice().sort((p, q) => p.x - q.x);
      ev.a = sorted[0]; ev.b = sorted[sorted.length - 1];
    }
    ev.mid = { x: (sxOf(ev.a.x, ev.a.y) + sxOf(ev.b.x, ev.b.y)) / 2, y: Math.min(ev.a.y, ev.b.y) - 10 };
  },
  headline: (ev) => ({
    title: `${ev.a.name} and ${ev.b.name} launch drone swarms`,
    sub: ev.rng.pick([
      'Each side has 60 drones and one very stressed person with a remote.',
      'Both swarms immediately get distracted by a bird.',
      'The battle is mostly beeping.',
    ]),
  }),
  focus: (ev) => ({ x: ev.mid.x, y: ev.mid.y, zoom: 1.4 }),
  start(ev) {
    world.grades.night.t = 0.55;
    ev.s.drones = [];
    for (const [team, c] of [[0, ev.a], [1, ev.b]]) {
      for (let k = 0; k < 60; k++) {
        ev.s.drones.push({ team, x: sxOf(c.x, c.y) + ev.rng.range(-3, 3), y: c.y - ev.rng.range(2, 8), vx: 0, vy: 0, k, phase: ev.rng.range(0, 6) });
      }
    }
  },
  update(ev, dt) {
    const t = ev.t, m = ev.mid;
    ev.at(0.2, 't0', () => ticker('Two drone swarms take off. The sky fills with beeping.'));
    for (const d of ev.s.drones) {
      let tx, ty;
      if (t < 9.5) {
        // circle each other over the middle
        const a = t * (d.team ? -1.2 : 1.2) + d.k * 0.21;
        const r = 18 + (d.k % 5) * 4;
        tx = m.x + (d.team ? 10 : -10) + Math.cos(a) * r; ty = m.y + Math.sin(a) * r * 0.5;
      } else if (t < 15) {
        // ...then give up and make a heart together
        const s = ((d.team * 60 + d.k) / 120) * TAU;
        const hx = 16 * Math.pow(Math.sin(s), 3), hy = -(13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s));
        tx = m.x + hx * 1.6; ty = m.y + hy * 1.3;
      } else { const home = d.team ? ev.b : ev.a; tx = sxOf(home.x, home.y); ty = home.y - 4; }
      d.vx = approach(d.vx, (tx - d.x) * 2, 4, dt); d.vy = approach(d.vy, (ty - d.y) * 2, 4, dt);
      d.x += d.vx * dt; d.y += d.vy * dt;
    }
    if (t > 3 && t < 9) ev.every('zap', 0.15, dt, () => {
      const d = ev.rng.pick(ev.s.drones);
      fx.burst(d.x, d.y, 3, { speed: 10, colors: ['#ffffff', '#5ae8f0'], life: 0.3, screen: true });
    });
    ev.at(9.5, 't1', () => ticker('The drones stop fighting and form a giant heart. Nobody programmed this.'));
    ev.at(11, 'b1', () => say({ x: ev.a.x, y: ev.a.y }, 'Aww', {}));
    ev.at(12, 'b2', () => say({ x: ev.b.x, y: ev.b.y }, 'Aww!', {}));
    ev.at(14.5, 'day', () => { world.grades.night.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky') return;
    for (const d of ev.s.drones) {
      const on = Math.sin(t * 9 + d.phase) > -0.3;
      g.fillStyle = d.team ? (on ? '#ff6ad8' : '#8a3a7a') : (on ? '#5ae8f0' : '#2a7a8a');
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
    }
  },
  finish(ev) {
    world.grades.night.t = 0;
    ev.delta('mood', +3);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'mae',
  title: 'Mutually Assured Embarrassment',
  stamp: 'War',
  weight: () => 0.8,
  requires: (w) => w.split && w.era >= 3 && w.eastOffset > 8,
  duration: 15,
  setup(ev) {
    ev.a = capitalOf('west'); ev.b = capitalOf('east');
    ev.rows = channelRows(ev.rng, 3);
  },
  headline: (ev) => ({
    title: 'East and West launch their missiles at the same time',
    sub: ev.rng.pick([
      'Military historians call it "the most awkward day in Eternian history".',
      'Both sides had been polishing their big red buttons for years.',
      'Neighbouring seagulls report "a lot of noise, then not much".',
    ]),
  }),
  focus: (ev) => ({ x: map.bx(ev.rows[1]), y: ev.rows[1] - 20, zoom: 1.5 }),
  start(ev) { ev.s.bangs = []; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Both sides press their buttons. Both buttons make a slightly disappointing click.'));
    [[ev.a, 0], [ev.b, 1]].forEach(([c, side]) => ev.at(1 + side * 0.4, 'launch' + side, () => {
      const y1 = ev.rows[side * 2], x1 = channelX(y1, 0.5);
      fx.launch({
        x0: sxOf(c.x, c.y), y0: c.y, x1, y1, z0: 0, z1: 0, arc: 70, dur: 4.2, screen: true,
        ease: (u) => (u < 0.45 ? u * 0.9 : 0.405 + (u - 0.45) * 1.08),
        onStep: (p) => {
          if (p.t < 1.9) fx.fire(p.x, p.y, { z: p.z, spread: 1 });
          else if (Math.random() < 0.3) fx.smoke(p.x, p.y, { z: p.z, rise: 1, life: 1, screen: true });
        },
        draw: (g, x, y, p) => {
          g.fillStyle = '#f2f0ea'; g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
          g.fillStyle = p.t > 1.9 ? '#8a8680' : '#c8412e'; g.fillRect(Math.round(x), Math.round(y) - 2, 1, 1);
        },
        onHit: (p) => {
          fx.splash(p.x, p.y, true);
          const b = say({ x: p.x, y: p.y, screen: true }, 'BANG!', { life: 3, lift: 10 });
          ev.s.bangs.push(b);
        },
      });
    }));
    ev.at(3.2, 'fizz', () => ticker('At the top of their arcs, both missiles go "fzzt".'));
    ev.at(5.8, 'plop', () => ticker('Both missiles land in the river with a small plop. Two tiny flags pop out.'));
    ev.at(8.5, 'b1', () => say(ev.a, '...was that it?', { side: 'west' }));
    ev.at(10, 'b2', () => say(ev.b, 'Let us never speak of this.', { side: 'east' }));
  },
  finish(ev) {
    ev.delta('mood', -2);
    logCity(ev.a, 'Launched a missile that went "fzzt"');
    logCity(ev.b, 'Launched a missile that went "fzzt"');
  },
});
