// ============================================================================
// 07f EVENTS, BATCH 3a — creatures. Big sprites, spines and crowds.
// ============================================================================

const SPR4 = {};
function initSprites4() {
  const pg = { g: '#8a8f96', G: '#646a72', w: '#c4c9d0', O: '#e8a33a', n: '#5a9a8a' };
  SPR4.pigeonUp = makeSprite(['w......w', 'ww....ww', '.wgggggO', '.gGGggn.', '..g..g..'], pg);
  SPR4.pigeonDown = makeSprite(['........', '..gggggO', 'wgGGggnw', 'ww.g.gww', 'w......w'], pg);
  const kj = { g: '#5a9a4a', G: '#3f7a3a', e: '#fff3a0', w: '#ffffff', s: '#2f5a2a', h: '#6aaa5a' };
  SPR4.kaijuA = makeSprite([
    '......gggg..', '.....gGggeg.', '.....ggggggw', '....sggggg..', '...sggggg...', '..sggGgggh..',
    '.sgggGggg...', 'sgggggggg...', 's.gggGggg...', 's..ggggg....', '...gg..gg...', '...gg...gg..', '..ggg...ggg.',
  ], kj);
  SPR4.kaijuB = makeSprite([
    '......gggg..', '.....gGggeg.', '.....ggggggw', '....sggggg..', '...sggggg...', '..sggGggg...',
    '.sgggGgggh..', 'sgggggggg...', 's.gggGggg...', 's..ggggg....', '....gggg....', '....g..gg...', '...gg..ggg..',
  ], kj);
  SPR4.ghost = makeSprite(['.w.', 'www', 'wew', 'w.w'], { w: '#eef4ff', e: '#3a4a6a' });
}

// ---------------------------------------------------------------------------
defineEvent({
  id: 'pigeons',
  title: 'Giant Pigeons',
  stamp: 'Wildlife',
  weight: () => 1,
  requires: () => true,
  duration: 18,
  setup(ev) {
    const opts = world.cities.filter((c) => !c.capital && c.id !== world.eastCapitalId && c.y > 80);
    ev.city = ev.rng.pick(opts.length ? opts : world.cities);
  },
  headline: (ev) => ({
    title: `Giant pigeons fly off with ${ev.city.name}`,
    sub: ev.rng.pick([
      'Residents admit they had been feeding them. With an entire bakery.',
      'Ornithologists confirm the pigeons are "much bigger than usual".',
      'The town is expected back "once they get bored".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 14, zoom: 1.9 }),
  start(ev) { ev.s.birds = [0, 1, 2, 3, 4].map((k) => ({ a: (k / 5) * TAU, phase: k })); ev.s.r = 70; ev.s.z = 30; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`Five enormous pigeons circle ${c.name}. They look hungry, and slightly smug.`));
    ev.at(1.5, 'b1', () => say(c, 'Are those... pigeons?', {}));
    if (t < 4.5) ev.s.r = lerp(70, 9, smooth(t / 4.5));
    ev.at(3.2, 'b2', () => say(c, "They're HUGE", {}));
    if (t > 4.5 && t < 6.5) c.lift = lerp(0, 18, smooth((t - 4.5) / 2));
    if (t > 6.5 && t < 12) {
      const u = (t - 6.5) / 5.5;
      c.ox = Math.sin(u * TAU) * 26; c.oy = (Math.cos(u * TAU) - 1) * 9;
    }
    if (t > 12 && t < 13) { c.ox = approach(c.ox, 0, 6, dt); c.oy = approach(c.oy, 0, 6, dt); }
    ev.at(7, 't1', () => ticker(`${c.name} is now airborne. The view is lovely. The residents are less lovely about it.`));
    ev.at(9, 'b3', () => say(c, 'Put us down!', {}));
    if (t > 13 && t < 14.5) c.lift = lerp(18, 0, easeIn((t - 13) / 1.5));
    ev.at(14.5, 'thud', () => {
      c.lift = 0; c.ox = 0; c.oy = 0;
      camera.kick(3); fx.dust(c.x, c.y + 1, 18);
      say(c, 'Thank you. Please never do that again.', {});
    });
    if (t > 14.5) { ev.s.r += dt * 40; ev.s.z += dt * 30; }
    for (const b of ev.s.birds) b.a += dt * (t > 4.5 && t < 14.5 ? 2.4 : 1.2);
    camera.focus(c.x + c.ox, c.y + c.oy - c.lift - 8, 1.9, 2);
  },
  draw(ev, g, layer, t) {
    if (layer !== 'air') return;
    const c = ev.city;
    const cx = c.x + offX(c.x, c.y) + c.ox, cy = c.y + c.oy - c.lift;
    for (const b of ev.s.birds) {
      const x = cx + Math.cos(b.a) * ev.s.r * 1.3, y = cy - ev.s.z * 0.3 - 4 + Math.sin(b.a) * ev.s.r * 0.5;
      const spr = Math.sin(t * 9 + b.phase) > 0 ? SPR4.pigeonUp : SPR4.pigeonDown;
      drawSprite(g, spr, x, y, Math.sin(b.a) < 0);
    }
  },
  finish(ev) {
    const c = ev.city;
    c.lift = 0; c.ox = 0; c.oy = 0;
    ev.delta('mood', -3);
    logCity(c, 'Carried off by giant pigeons. Returned, eventually');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'kaiju',
  title: 'Kaiju',
  stamp: 'Wildlife',
  weight: () => 0.9,
  requires: () => true,
  duration: 22,
  setup(ev) {
    let y = 0;
    for (let k = 0; k < 50; k++) {
      y = Math.round(ev.rng.range(map.top + 40, map.bottom - 30));
      if (map.rowMin[y] > 0 && map.rowMax[y] - map.rowMin[y] > 150) break;
    }
    ev.fromWest = ev.rng.chance(0.5);
    const xw = map.rowMin[y] - 16, xe = map.rowMax[y] + 16;
    ev.x0 = ev.fromWest ? xw : xe; ev.x1 = ev.fromWest ? xe : xw;
    ev.y0 = y; ev.y1 = y + ev.rng.range(-20, 20);
    ev.len = Math.abs(ev.x1 - ev.x0);
    ev.name = ev.rng.pick(['Gerald', 'Big Susan', 'Mr Stompy', 'Norbert', 'Colossal Kevin']);
  },
  headline: (ev) => ({
    title: `A giant lizard named ${ev.name} strolls across Eternia`,
    sub: ev.rng.pick([
      `${ev.name} is reportedly "just passing through" and "very sorry about the footprints".`,
      'Scientists recommend staying indoors, or at least out of the way.',
      'Several towns hastily put up "please wipe your feet" signs.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x0, y: ev.y0 - 10, zoom: 1.8 }),
  start(ev) { ev.s.x = ev.x0; ev.s.y = ev.y0; ev.s.step = 0; ev.s.hit = new Set(); ev.s.foot = 0; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Something very large rises out of the sea. It waves.'));
    const u = clamp((t - 1) / (ev.dur - 4), 0, 1);
    ev.s.x = lerp(ev.x0, ev.x1, u);
    ev.s.y = lerp(ev.y0, ev.y1, u) + Math.sin(u * 9) * 4;
    camera.focus(ev.s.x, ev.s.y - 16, 1.6, 1.8);
    const inSea = map.oceanDepth(ev.s.x, ev.s.y) > 0;
    ev.s.step += dt;
    if (ev.s.step > 0.55 && t > 1 && t < ev.dur - 3) {
      ev.s.step = 0; ev.s.foot ^= 1;
      if (inSea) fx.splash(ev.s.x, ev.s.y, false);
      else {
        camera.kick(2.5);
        const fx0 = Math.round(ev.s.x + (ev.s.foot ? -6 : 4)), fy = Math.round(ev.s.y + 1);
        for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [-1, -1], [1, -1], [3, -1]]) stampPixel(fx0 + dx, fy + dy, '#3e4a32', 0.75);
        fx.dust(ev.s.x, ev.s.y + 1, 5);
      }
    }
    for (const c of world.cities) {
      if (ev.s.hit.has(c.id) || dist(c.x, c.y, ev.s.x, ev.s.y) > 13) continue;
      ev.s.hit.add(c.id);
      c.damage = clamp(c.damage + 0.35, 0, 1); c.shake = 0.8;
      say(c, ev.rng.pick(['My garden!', 'Mind the roof!', 'Watch where you step!']), {});
      ev.at(ev.t + 0.9, 'sorry' + c.id, () => say({ x: ev.s.x, y: ev.s.y - 26 }, 'Sorry! Sorry!', { life: 1.8 }));
      logCity(c, `Stepped on by ${ev.name}, who apologised`);
    }
    ev.at(2, 'rawr', () => say({ x: ev.s.x, y: ev.s.y - 26 }, 'RAWR', {}));
    ev.at(ev.dur * 0.5, 't1', () => ticker(`${ev.name} stops to admire a windmill. The windmill does not admire ${ev.name} back.`));
    ev.at(ev.dur - 2.5, 't2', () => ticker(`${ev.name} wades back into the sea, leaving footprints the size of ponds.`));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'air') return;
    const spr = Math.floor(t * 3.6) % 2 ? SPR4.kaijuA : SPR4.kaijuB;
    const S = 2, sw = spr.width * S, sh = spr.height * S;
    const inSea = map.oceanDepth(ev.s.x, ev.s.y) > 0;
    const x = Math.round(ev.s.x + offX(ev.s.x, ev.s.y) - sw / 2), y = Math.round(ev.s.y - sh);
    const cut = inSea ? 5 : 0;   // source rows hidden under the waves
    g.fillStyle = 'rgba(20,30,25,0.3)'; g.fillRect(x + 4, Math.round(ev.s.y), 16, 3);
    g.save();
    if (!ev.fromWest) { g.translate(x + sw, y); g.scale(-1, 1); g.drawImage(spr, 0, 0, spr.width, spr.height - cut, 0, 0, sw, sh - cut * S); }
    else g.drawImage(spr, 0, 0, spr.width, spr.height - cut, x, y, sw, sh - cut * S);
    g.restore();
    if (inSea) { g.fillStyle = '#c6e3d8'; g.fillRect(x + 2, y + sh - cut * S, sw - 4, 1); }
  },
  finish(ev) {
    world.devastation = Math.min(1, world.devastation + 0.15);
    ev.delta('mood', -5);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'serpent',
  title: 'Sea Serpent',
  stamp: 'Wildlife',
  weight: () => 0.9,
  requires: () => true,
  duration: 18,
  setup(ev) {
    const a0 = ev.rng.range(0, TAU);
    ev.path = polyPath(coastArc(a0, ev.rng.chance(0.5) ? 2.6 : -2.6, 7));
    const mid = ev.path.at(ev.path.length * 0.5);
    ev.near = nearestCity(mid.x, mid.y);
  },
  headline: (ev) => ({
    title: `Sea serpent spotted off the coast near ${ev.near.name}`,
    sub: ev.rng.pick([
      'Fishermen describe it as "long", "wiggly", and "rude about boats".',
      'Local tourism board insists it is "basically a big eel".',
      'The serpent has asked people to stop calling it Nessie.',
    ]),
  }),
  focus: (ev) => { const p = ev.path.at(0); return { x: p.x, y: p.y, zoom: 2 }; },
  start(ev) {
    const p0 = ev.path.at(0);
    ev.s.spine = new Spine(20, 2.2, p0.x, p0.y);
    ev.s.d = 0;
    const bp = ev.path.at(ev.path.length * 0.45);
    ev.s.boat = ambient.boats.slice().sort((a, b) => dist(a.x, a.y, bp.x, bp.y) - dist(b.x, b.y, bp.x, bp.y))[0];
    if (ev.s.boat) { ev.s.boat.x = bp.x; ev.s.boat.y = bp.y; ev.s.boat.hold = true; }
  },
  update(ev, dt) {
    const t = ev.t, sp = ev.s.spine;
    ev.at(0.2, 't0', () => ticker('The sea starts wiggling. The sea is not supposed to wiggle.'));
    ev.s.d = Math.min(ev.path.length, ev.s.d + (ev.path.length / (ev.dur - 2)) * dt);
    const h = ev.path.at(ev.s.d);
    sp.lead(h.x, h.y);
    camera.focus(h.x, h.y, 2, 1.8);
    if (Math.random() < 0.4) fx.spawn({ x: h.x, y: h.y + 1, life: 1, colors: ['#c6e3d8', '#8cc0c0'], layer: 'ground' });
    const b = ev.s.boat;
    if (b && !b.hidden && !ev.s.ate && dist(h.x, h.y, b.x, b.y) < 4) {
      ev.s.ate = true; b.hidden = true;
      fx.splash(b.x, b.y); camera.kick(2);
      say({ x: h.x, y: h.y - 3 }, 'Gulp', { life: 1.5 });
      ticker('The serpent swallows a fishing boat whole. The crew report "it is quite roomy in here".');
    }
    if (ev.s.ate && !ev.s.spat && t > ev.dur - 5) {
      ev.s.spat = true; b.hidden = false; b.hold = false; b.x = h.x + 3; b.y = h.y + 2;
      fx.splash(b.x, b.y);
      say({ x: h.x, y: h.y - 3 }, '*hic*', { life: 1.5 });
      ev.at(ev.t + 1, 'crew', () => say(b, "We're fine! We're fine!", { life: 2 }));
    }
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || !ev.s.spine) return;
    const ns = ev.s.spine.nodes;
    for (let k = ns.length - 1; k >= 0; k--) {
      const n = ns[k];
      const x = Math.round(n.x + offX(n.x, n.y)), y = Math.round(n.y);
      const up = Math.sin(k * 0.55 - t * 5) > 0.1 || k === 0;
      if (!up) { g.fillStyle = 'rgba(198,227,216,0.55)'; g.fillRect(x, y, 2, 1); continue; }
      g.fillStyle = k === 0 ? '#2f7a5a' : k % 2 ? '#3f8a6a' : '#4f9a7a';
      g.fillRect(x - (k === 0 ? 1 : 0), y - 1 - (k === 0 ? 1 : 0), k === 0 ? 3 : 2, k === 0 ? 3 : 2);
      if (k === 0) {
        g.fillStyle = '#fff3a0'; g.fillRect(x, y - 2, 1, 1);
        if (Math.sin(t * 7) > 0.5) { g.fillStyle = '#e04a6a'; g.fillRect(x + 2, y - 1, 1, 1); }
      }
    }
  },
  finish(ev) {
    const b = ev.s.boat;
    if (b) { b.hidden = false; b.hold = false; }
    ev.delta('mood', -2);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'sandworm',
  title: 'Sandworm',
  stamp: 'Wildlife',
  weight: () => 0.8,
  requires: () => true,
  duration: 16,
  setup(ev) {
    ev.desert = [];
    for (let ci = 0; ci < CN; ci++) if (cells.land[ci] && cells.biome[ci] === BIOME.DESERT) ev.desert.push(ci);
    if (ev.desert.length < 30) for (let ci = 0; ci < CN; ci++) if (cells.land[ci] && cells.biome[ci] === BIOME.PLAINS) ev.desert.push(ci);
    // the biggest patch: start from a random desert cell with lots of desert around
    let best = null;
    for (let k = 0; k < 40; k++) {
      const ci = ev.rng.pick(ev.desert);
      if (world.cities.some((c) => dist(c.x, c.y, cellX(ci), cellY(ci)) < 22)) continue;
      let n = 0;
      for (const cj of ev.desert) if (dist(cellX(ci), cellY(ci), cellX(cj), cellY(cj)) < 18) n++;
      if (!best || n > best.n) best = { ci, n };
    }
    if (!best) best = { ci: ev.rng.pick(ev.desert) };
    ev.x = cellX(best.ci); ev.y = cellY(best.ci);
    ev.near = nearestCity(ev.x, ev.y);
  },
  headline: (ev) => ({
    title: `Something big is moving under the sand near ${ev.near.name}`,
    sub: ev.rng.pick([
      'Experts say it is "probably friendly" and "definitely enormous".',
      'Locals advised to walk without rhythm, just in case.',
      'The worm is reported to be looking for its lost sock.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x, y: ev.y, zoom: 2.3 }),
  start(ev) {
    ev.s.spine = new Spine(12, 2, ev.x, ev.y);
    ev.s.h = { x: ev.x, y: ev.y, a: ev.rng.range(0, TAU) };
    ev.s.home = { x: ev.x, y: ev.y };
    ev.s.furrow = new Cover({ alpha: 0.7, color: (ci, v) => (dith(ci, v) ? P('#a8884e') : 0) });
  },
  update(ev, dt) {
    const t = ev.t, h = ev.s.h;
    ev.at(0.2, 't0', () => ticker('The desert develops a large, moving bump.'));
    const breach = t > 7.5 && t < 10.5;
    if (!breach) {
      h.a += Math.sin(t * 1.3) * 1.6 * dt;
      const nx = h.x + Math.cos(h.a) * 16 * dt, ny = h.y + Math.sin(h.a) * 11 * dt;
      const ok = (cells.biome[cellOf(nx, ny)] === BIOME.DESERT || dist(nx, ny, ev.s.home.x, ev.s.home.y) < 10)
        && world.cities.every((c) => dist(c.x, c.y, nx, ny) > 14);
      if (ok && map.isWalkable(nx, ny)) { h.x = nx; h.y = ny; } else h.a += Math.PI * 0.6;
      ev.s.furrow.seedAt(h.x, h.y, 0);
      if (Math.random() < 0.5) fx.dust(h.x, h.y, 1, ['#e5ca8d', '#c6a162']);
    }
    ev.s.spine.lead(h.x, h.y);
    camera.focus(h.x, h.y - (breach ? 10 : 0), 2.3, 2);
    ev.s.furrow.fade(dt, 0.12);
    ev.at(7.5, 'up', () => {
      camera.kick(4);
      fx.burst(h.x, h.y, 40, { speed: 26, vz: 40, g: 60, bounce: 0.2, colors: ['#e5ca8d', '#c6a162', '#a8884e'], life: 1.6, layer: 'ground' });
      ticker('The sandworm surfaces. It is huge. It is pink. It appears to be smiling.');
    });
    ev.at(8.3, 'b1', () => say({ x: h.x, y: h.y - 20 }, 'Hello!', { life: 2 }));
    ev.at(10.5, 'down', () => { fx.dust(h.x, h.y, 20); camera.kick(2); });
    ev.at(12, 't1', () => ticker('The worm dives back under. Experts upgrade it to "a good boy".'));
  },
  draw(ev, g, layer, t) {
    if (!ev.s.spine) return;
    const ns = ev.s.spine.nodes;
    const breachU = clamp((ev.t - 7.5) / 3, 0, 1);
    const arc = Math.sin(breachU * Math.PI);
    if (layer === 'ground' && arc <= 0.02) {
      for (let k = 0; k < ns.length; k++) {
        const n = ns[k];
        g.fillStyle = k % 2 ? '#efd9a3' : '#d7b776';
        g.fillRect(Math.round(n.x + offX(n.x, n.y)), Math.round(n.y) - 1, 2, 1);
      }
    }
    if (layer === 'air' && arc > 0.02) {
      const h = ev.s.h;
      for (let k = 11; k >= 0; k--) {
        const z = Math.sin((k / 11) * Math.PI) * 26 * arc + (k === 0 ? 26 * arc * 0.6 : 0);
        const x = Math.round(h.x + offX(h.x, h.y) + (k - 5) * 1.6), y = Math.round(h.y - z);
        g.fillStyle = k % 2 ? '#d88a8a' : '#c47070';
        g.fillRect(x - 1, y - 1, 4, 4);
      }
      const x = Math.round(h.x + offX(h.x, h.y) - 8), y = Math.round(h.y - 26 * arc * 1.1);
      g.fillStyle = '#6a2a3a'; g.fillRect(x - 1, y - 1, 4, 3);
      g.fillStyle = '#f6f3ea'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 2, y - 1, 1, 1);
    }
  },
  finish(ev) {
    ev.s.furrow.remove();
    ev.delta('mood', +2);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'cats',
  title: 'Cat Takeover',
  stamp: 'Wildlife',
  weight: () => 1,
  requires: () => true,
  duration: 16,
  setup(ev) {
    ev.towns = world.cities.slice().sort(() => ev.rng.next() - 0.5).slice(0, 5);
    for (const c of ev.towns) {
      // push each town towards its nearest coast
      let best = null;
      for (let a = 0; a < TAU; a += 0.3) for (let r = 4; r < 60; r += 2) {
        if (map.oceanDepth(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7) > 0) { if (!best || r < best.r) best = { a, r }; break; }
      }
      c._push = best ? { x: Math.cos(best.a), y: Math.sin(best.a) * 0.7 } : { x: 1, y: 0 };
    }
  },
  headline: (ev) => ({
    title: 'Cats take over Eternia, one nudge at a time',
    sub: ev.rng.pick([
      'Their goal is to push every town off the edge of the map, slowly, while making eye contact.',
      'The cats refuse to explain themselves.',
      'Several towns report being sat on.',
    ]),
  }),
  focus: (ev) => ({ x: ev.towns[0].x, y: ev.towns[0].y, zoom: 2.6 }),
  start(ev) {
    ev.s.cats = new Crowd();
    for (const c of ev.towns) {
      for (let k = 0; k < 3; k++) {
        const from = landSpotNear({ x: c.x - c._push.x * 26, y: c.y - c._push.y * 26 }, 0, 8, ev.rng);
        ev.s.cats.add({ kind: 'cat', town: c, x: from.x, y: from.y, tx: c.x, ty: c.y, speed: ev.rng.range(12, 18), color: ev.rng.pick(['#f0a24a', '#3a342c', '#a8a49c', '#f2eee2']), k });
      }
    }
  },
  update(ev, dt) {
    const t = ev.t, cats = ev.s.cats;
    ev.at(0.2, 't0', () => ticker('Cats arrive in five towns and start pushing. Nobody knows why. Nobody ever knows why.'));
    for (const a of cats.list) {
      const c = a.town;
      a.tx = c.x + c.ox - c._push.x * 7 + (a.k - 1) * 2 * c._push.y;
      a.ty = c.y + c.oy - c._push.y * 7 - (a.k - 1) * 2 * c._push.x + 1;
    }
    cats.update(dt);
    if (t > 3 && t < 11) for (const c of ev.towns) {
      const push = Math.sin(t * 5 + c.id) > 0.6 ? 1 : 0;
      const nx = c.ox + c._push.x * push * dt * 2.4, ny = c.oy + c._push.y * push * dt * 2.4;
      const i = Math.round(c.y + ny) * W + Math.round(c.x + nx);
      if (map.landDist[i] >= 6) { c.ox = nx; c.oy = ny; }
    }
    const watch = ev.towns[t < 6 ? 0 : t < 9 ? 1 : 2];
    if (t < 11) camera.focus(watch.x + watch.ox, watch.y + watch.oy, 2.6, 1.5);
    ev.at(11.2, 'wide', () => camera.focus(W / 2, H / 2, 1.05, 1));
    ev.at(3.5, 'b1', () => say(ev.towns[0], 'Stop pushing!', {}));
    ev.at(5, 'b2', () => say(ev.rng.pick(cats.list), 'Mrrp', { life: 1.5 }));
    ev.at(6.5, 'b3', () => say(ev.towns[1], 'We were here first!', {}));
    ev.at(8, 'b4', () => say(ev.rng.pick(cats.list), 'Meow.', { life: 1.5 }));
    ev.at(11, 'treats', () => {
      ticker('Owners arrive with treats. The cats lose interest instantly. The towns are pushed back into place.');
      cats.send((a) => { const to = landSpotNear({ x: a.x, y: a.y }, 20, 45, ev.rng); a.town = { x: to.x, y: to.y, ox: 0, oy: 0, _push: { x: 0, y: 0 } }; });
      cats.dismiss(2.5);
    });
    if (t > 11) for (const c of ev.towns) { c.ox = approach(c.ox, 0, 3, dt); c.oy = approach(c.oy, 0, 3, dt); }
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.cats.draw(g, t); },
  finish(ev) {
    for (const c of ev.towns) { c.ox = 0; c.oy = 0; delete c._push; }
    ev.delta('mood', +2);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'goats',
  title: 'Goat Parliament',
  stamp: 'Wildlife',
  weight: () => 1,
  requires: () => true,
  duration: 16,
  setup(ev) { ev.city = capitalOf('west'); },
  headline: (ev) => ({
    title: `Goats seize parliament in ${ev.city.name}`,
    sub: ev.rng.pick([
      'Productivity is unchanged.',
      'The goats have eaten three bills, a budget and one very important hat.',
      'Opposition leaders describe the goats as "more organised than us".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 4, zoom: 2.4 }),
  start(ev) {
    ev.s.goats = new Crowd();
    const c = ev.city;
    for (let k = 0; k < 18; k++) {
      const ci = randomLandCell(ev.rng, (x) => (cells.biome[x] === BIOME.MOUNTAIN || cells.biome[x] === BIOME.PLAINS) && dist(cellX(x), cellY(x), c.x, c.y) < 60 && dist(cellX(x), cellY(x), c.x, c.y) > 20);
      if (ci < 0) continue;
      ev.s.goats.add({ kind: 'goat', x: cellX(ci), y: cellY(ci), tx: c.x, ty: c.y + 1, ...spreadAround(0, 0, 7), speed: ev.rng.range(12, 18) });
    }
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city, goats = ev.s.goats;
    goats.update(dt);
    ev.at(0.2, 't0', () => ticker('Goats descend from the hills. Their stride is purposeful. Their eyes are sideways.'));
    ev.at(0.6, 'zoom', () => camera.focus(c.x, c.y, 1.6, 1));
    ev.at(5, 'zoom2', () => camera.focus(c.x, c.y - 6, 2.6, 1));
    ev.at(6, 'b1', () => say(c, 'Order! Order!', {}));
    ev.at(7.5, 'b2', () => say(ev.rng.pick(goats.list), 'Baa', { life: 1.5 }));
    ev.at(9, 'b3', () => say(ev.rng.pick(goats.list), 'Baa. (The motion passes.)', {}));
    ev.at(10, 't1', () => ticker('The first Goat Law is passed: everything is now a snack.'));
    ev.at(12.5, 'leave', () => goats.send((a) => { a.tx = a.x + ev.rng.range(-40, 40); a.ty = a.y + ev.rng.range(-20, 20); a.jx = 0; a.jy = 0; }));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    ev.s.goats.draw(g, t);
    if (ev.t > 7 && ev.t < 12.5) {
      // one goat on top of the castle, naturally
      const c = ev.city, x = Math.round(c.x + offX(c.x, c.y)) - 1, y = Math.round(c.y) - 8 - c.era;
      Crowd.shapes.goat(g, x, y, { face: 1, walking: false }, t);
    }
  },
  finish(ev) {
    ev.delta('mood', +2);
    logCity(ev.city, 'Parliament briefly run by goats. Productivity unchanged');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'bees',
  title: 'Bees!',
  stamp: 'Wildlife',
  weight: () => 1,
  requires: (w) => w.freeze < 0.1,
  duration: 17,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities);
    const ci = randomLandCell(ev.rng, (x) => cells.biome[x] === BIOME.FOREST && dist(cellX(x), cellY(x), ev.city.x, ev.city.y) < 60);
    ev.hive = ci >= 0 ? { x: cellX(ci), y: cellY(ci) } : { x: ev.city.x - 30, y: ev.city.y };
  },
  headline: (ev) => ({
    title: `A swarm of bees descends on ${ev.city.name}`,
    sub: ev.rng.pick([
      'The bees are not angry. They are just extremely busy.',
      'Residents are advised to remain calm and smell less like flowers.',
      'Beekeepers arrive with nets, veils and a lot of false confidence.',
    ]),
  }),
  focus: (ev) => ({ x: (ev.hive.x + ev.city.x) / 2, y: (ev.hive.y + ev.city.y) / 2, zoom: 2.2 }),
  start(ev) {
    ev.s.center = { x: ev.hive.x, y: ev.hive.y };
    ev.s.bees = Array.from({ length: 90 }, () => ({ x: ev.hive.x, y: ev.hive.y, vx: 0, vy: 0, p: Math.random() * 6 }));
    ev.s.honey = new Cover({ alpha: 0.85, animated: true, color: (ci, v, t) => (dith(ci, v) ? (Math.sin(t * 2 + noiseAt(ci) * 8) > 0.7 ? P('#ffe28a') : P('#e8a82a')) : 0) });
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city, ctr = ev.s.center;
    ev.at(0.2, 't0', () => ticker('A buzzing sound is heard. It gets louder. It gets much louder.'));
    const target = t < 11 ? c : ev.hive;
    ctr.x = approach(ctr.x, target.x, 0.5, dt); ctr.y = approach(ctr.y, target.y - 2, 0.5, dt);
    for (const b of ev.s.bees) {
      const tx = ctr.x + Math.sin(t * 3 + b.p) * 8, ty = ctr.y + Math.cos(t * 2.3 + b.p * 1.7) * 5;
      b.vx = approach(b.vx, (tx - b.x) * 3 + (Math.random() - 0.5) * 30, 5, dt);
      b.vy = approach(b.vy, (ty - b.y) * 3 + (Math.random() - 0.5) * 30, 5, dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
    camera.focus(ctr.x, ctr.y, 2.2, 1.5);
    ev.at(4.5, 'b1', () => say(c, 'BEES!', {}));
    ev.at(5, 'honey', () => { ev.s.honey.seedAt(c.x, c.y + 2, 3); ticker(`The bees build a hive the size of a house. ${c.name} is now 40% honey.`); });
    if (t > 5 && t < 11) ev.s.honey.grow(dt, 220, (ci) => cells.land[ci] && dist(cellX(ci), cellY(ci), c.x, c.y) < 20);
    ev.at(7, 'b2', () => say(c, "It's sticky!", {}));
    ev.at(9, 'b3', () => say(c, 'Free honey though', {}));
    if (t > 12) ev.s.honey.fade(dt, 0.3);
  },
  draw(ev, g, layer, t) {
    if (layer !== 'air') return;
    for (const b of ev.s.bees) {
      g.fillStyle = Math.sin(t * 20 + b.p) > 0 ? '#f4c542' : '#2b2622';
      g.fillRect(Math.round(b.x + offX(b.x, b.y)), Math.round(b.y), 1, 1);
    }
  },
  finish(ev) {
    ev.s.honey.remove();
    ev.delta('mood', +1);
    logCity(ev.city, 'Covered in honey by an enormous swarm of bees');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'dragon',
  title: 'The Dragon Returns',
  stamp: 'Wildlife',
  weight: () => 0.8,
  requires: () => true,
  duration: 21,
  setup(ev) {
    const ci = randomLandCell(ev.rng, (x) => cells.biome[x] === BIOME.MOUNTAIN || cells.biome[x] === BIOME.SNOW);
    ev.lair = ci >= 0 ? { x: cellX(ci), y: cellY(ci) } : { x: W / 2, y: H / 2 };
    ev.name = ev.rng.pick(['Smoulderina', 'Old Crispy', 'Toastbeard', 'Sir Burnsalot']);
  },
  headline: (ev) => ({
    title: `The dragon ${ev.name} returns to Eternia`,
    sub: ev.rng.pick([
      'It has come back for the gold. It has always been about the gold.',
      'Knights are on standby, but mostly just standing.',
      'The dragon insists it "left some things here" and would like them back.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { ev.s.spine = new Spine(10, 3, -30, H / 2); ev.s.pile = 0; ev.s.z = 34; ev.s.hx = -30; ev.s.hy = H / 2; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('A shadow crosses the whole country. Everyone looks up. It is a dragon.'));
    let hx, hy;
    if (t < 9.5) {
      const a = (t / 9.5) * TAU * 1.05 - Math.PI;
      hx = W / 2 + Math.cos(a) * W * 0.36; hy = H / 2 + Math.sin(a) * H * 0.33;
    } else { hx = ev.lair.x; hy = ev.lair.y; ev.s.z = approach(ev.s.z, 4, 1.5, dt); }
    ev.s.hx = approach(ev.s.hx, hx, 3, dt); ev.s.hy = approach(ev.s.hy, hy, 3, dt);
    ev.s.spine.lead(ev.s.hx, ev.s.hy);
    if (t < 9.5) camera.focus(ev.s.hx, ev.s.hy - ev.s.z * 0.6, 1.6, 1.4);
    if (t < 9.5) ev.every('fire', 1.3, dt, () => {
      for (let k = 0; k < 14; k++) fx.fire(ev.s.hx + ev.rng.range(-2, 2), ev.s.hy, { z: ev.s.z - 2 - k * 1.8, spread: 2 + k * 0.3, size: 1 });
    });
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Is that a dragon?', {}));
    ev.at(9.5, 'land', () => { camera.focus(ev.lair.x, ev.lair.y - 8, 2, 1); ticker(`${ev.name} lands on the mountain and starts collecting.`); });
    if (t > 11 && t < 16.5) ev.every('gold', 0.06, dt, () => {
      const c = ev.rng.pick(world.cities);
      fx.launch({
        x0: c.x, y0: c.y, x1: ev.lair.x + ev.rng.range(-4, 4), y1: ev.lair.y + ev.rng.range(-2, 3), z0: 2, z1: 1, arc: 30, dur: 1.2,
        draw: (g, x, y) => { g.fillStyle = '#f4c542'; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
        onHit: () => { ev.s.pile = Math.min(1, ev.s.pile + 0.006); },
      });
    });
    ev.at(12, 'b2', () => say({ x: ev.s.hx, y: ev.s.hy - 6 }, 'MINE.', {}));
    ev.at(13.5, 'b3', () => say(ev.rng.pick(world.cities), "That's our gold!", {}));
    ev.at(15, 'b4', () => say({ x: ev.s.hx, y: ev.s.hy - 6 }, 'Finders keepers.', {}));
    ev.at(17, 't1', () => ticker(`${ev.name} curls up on the gold and falls asleep. Nobody is brave enough to wake it.`));
  },
  draw(ev, g, layer, t) {
    const ns = ev.s.spine.nodes, z = ev.s.z;
    if (layer === 'ground') {
      const r = Math.round(ev.s.pile * 5);
      if (r > 0) for (let k = 0; k < r; k++) { g.fillStyle = k % 2 ? '#f4c542' : '#c8962a'; g.fillRect(Math.round(ev.lair.x + offX(ev.lair.x, ev.lair.y)) - (r - k) - 3, Math.round(ev.lair.y) + 2 - k, (r - k) * 2, 1); }
      g.fillStyle = 'rgba(15,25,20,0.2)';
      for (const n of ns) g.fillRect(Math.round(n.x + offX(n.x, n.y)), Math.round(n.y), 2, 1);
      return;
    }
    if (layer !== 'air') return;
    for (let k = ns.length - 1; k >= 0; k--) {
      const n = ns[k];
      const x = Math.round(n.x + offX(n.x, n.y)), y = Math.round(n.y - z);
      const sz = k === 0 ? 4 : k < 4 ? 3 : k < 8 ? 2 : 1;
      g.fillStyle = k === 0 ? '#a82a1e' : k % 2 ? '#c8412e' : '#b8361f';
      g.fillRect(x - (sz >> 1), y - (sz >> 1), sz, sz);
      if (k === 2) {
        const flap = Math.round(Math.sin(t * 7) * 6);
        for (let s = 1; s <= 9; s++) {
          const dy = Math.round((flap * s) / 9);
          g.fillStyle = s % 3 === 0 ? '#c8412e' : '#e06a3a';
          g.fillRect(x - 1 - s, y - dy, 1, 2); g.fillRect(x + 1 + s, y - dy, 1, 2);
        }
      }
      if (k === 0) { g.fillStyle = '#ffe28a'; g.fillRect(x, y - 1, 1, 1); g.fillStyle = '#e8dcc0'; g.fillRect(x - 1, y - 3, 1, 1); g.fillRect(x + 1, y - 3, 1, 1); }
    }
  },
  finish(ev) {
    const X = Math.round(ev.lair.x), Y = Math.round(ev.lair.y);
    for (let r = 0; r < 4; r++) for (let dx = -(4 - r); dx <= 4 - r; dx++) stampPixel(X + dx - 1, Y + 2 - r, r % 2 ? '#f4c542' : '#c8962a', 1);
    ev.delta('mood', -6);
    for (const c of world.cities) c.pop = Math.round(c.pop * 0.98);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'squirrels',
  title: 'The Squirrel Heist',
  stamp: 'Crime',
  weight: () => 1,
  requires: () => true,
  duration: 16,
  setup(ev) {
    ev.city = capitalOf('west');
    const ci = randomLandCell(ev.rng, (x) => cells.biome[x] === BIOME.FOREST && dist(cellX(x), cellY(x), ev.city.x, ev.city.y) < 45 && dist(cellX(x), cellY(x), ev.city.x, ev.city.y) > 14);
    ev.tree = ci >= 0 ? { x: cellX(ci), y: cellY(ci) } : { x: ev.city.x - 20, y: ev.city.y + 6 };
  },
  headline: (ev) => ({
    title: `Squirrels rob the national treasury in ${ev.city.name}`,
    sub: ev.rng.pick([
      'The treasury reports a shortfall of "approximately all of it".',
      'Police describe the suspects as "small, brown, and extremely fast".',
      'The squirrels left a single acorn behind as a calling card.',
    ]),
  }),
  focus: (ev) => ({ x: (ev.tree.x + ev.city.x) / 2, y: (ev.tree.y + ev.city.y) / 2 - 3, zoom: 2.8 }),
  start(ev) {
    ev.s.gang = new Crowd();
    for (let k = 0; k < 9; k++) ev.s.gang.add({ kind: 'squirrel', x: ev.tree.x + ev.rng.range(-2, 2), y: ev.tree.y + ev.rng.range(-1, 1), tx: ev.city.x, ty: ev.city.y + 1, ...spreadAround(0, 0, 3), speed: ev.rng.range(18, 26), state: 'go', delay: k * 0.35 });
  },
  update(ev, dt) {
    const t = ev.t, gang = ev.s.gang;
    ev.at(0.2, 't0', () => ticker('Nine squirrels in tiny masks gather at the base of an oak. They have a plan.'));
    for (const s of gang.list) {
      if (t < s.delay + 1) continue;
      if (gang.arrived(s)) {
        if (s.state === 'go') { s.state = 'back'; s.coin = true; s.tx = ev.tree.x; s.ty = ev.tree.y; }
        else if (t < 12) { s.state = 'go'; s.coin = false; s.tx = ev.city.x; s.ty = ev.city.y + 1; fx.burst(ev.tree.x, ev.tree.y - 2, 2, { speed: 5, colors: ['#f4c542'], life: 0.4 }); }
      }
    }
    if (t > 1) gang.update(dt);
    ev.at(4, 'b1', () => say(ev.city, 'Did anyone hear a scurry?', {}));
    ev.at(7, 'b2', () => say(ev.rng.pick(gang.list), 'Go go go!', { life: 1.5 }));
    ev.at(9, 't1', () => ticker('The treasury is empty. The oak tree is suspiciously shiny.'));
    ev.at(12.5, 'b3', () => say(ev.city, 'Can we at least have the acorn back?', {}));
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.gang.draw(g, t); },
  finish(ev) {
    ev.delta('mood', -4);
    logCity(ev.city, 'Treasury robbed by squirrels. Case still open');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'mosquitoes',
  title: 'Mosquito Season',
  stamp: 'Wildlife',
  weight: () => 0.9,
  requires: (w) => w.freeze < 0.1,
  duration: 14,
  setup() {},
  headline: (ev) => ({
    title: 'Mosquito season arrives two months early',
    sub: ev.rng.pick([
      'The national sound is now a high-pitched whine, followed by a slap.',
      'Citrus candle sales up 800%. Mosquito opinions of citrus candles: unchanged.',
      'Experts recommend long sleeves, and moving somewhere else.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    world.grades.dusk.t = 0.3;
    ev.s.swarms = world.cities.slice().sort(() => ev.rng.next() - 0.5).slice(0, 5).map((c) => ({
      target: c, x: c.x + ev.rng.range(-40, 40), y: c.y + ev.rng.range(-30, 30),
      bugs: Array.from({ length: 30 }, () => ({ dx: 0, dy: 0, p: Math.random() * 6 })),
    }));
    ev.s.bats = [];
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('A faint whining sound spreads across the country.'));
    for (const s of ev.s.swarms) {
      if (ev.s.gone) continue;
      s.x = approach(s.x, s.target.x, 0.6, dt); s.y = approach(s.y, s.target.y - 2, 0.6, dt);
      if (dist(s.x, s.y, s.target.x, s.target.y) < 6 && Math.random() < dt * 0.5) {
        s.target.shake = 0.3;
        say(s.target, ev.rng.pick(['Ow!', '*slap*', 'Got one!', 'Missed.', 'Why me?']), { life: 1.2 });
        s.target = ev.rng.pick(world.cities);
      }
    }
    ev.at(9, 'bats', () => {
      ticker('Bats arrive. The mosquito problem becomes a bat buffet.');
      for (let k = 0; k < 10; k++) ev.s.bats.push({ x: -10 - k * 8, y: ev.rng.range(30, H - 30), p: k });
    });
    for (const b of ev.s.bats) { b.x += 90 * dt; b.y += Math.sin(t * 6 + b.p) * 20 * dt; }
    ev.at(9.5, 'eaten', () => { ev.s.eatenAt = t; });
    ev.at(11.5, 'gone', () => { ev.s.gone = true; world.grades.dusk.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'air') return;
    if (!ev.s.gone) for (const s of ev.s.swarms) for (const b of s.bugs) {
      if (ev.s.eatenAt != null && ev.t - ev.s.eatenAt > (b.p / 6) * 2) continue;
      const x = s.x + Math.sin(t * 9 + b.p * 3) * 5 + Math.sin(t * 23 + b.p) * 1.5, y = s.y + Math.cos(t * 7 + b.p * 2) * 3;
      g.fillStyle = '#2b2622'; g.fillRect(Math.round(x + offX(s.x, s.y)), Math.round(y - 3), 1, 1);
    }
    for (const b of ev.s.bats) {
      const x = Math.round(b.x), y = Math.round(b.y), f = Math.sin(t * 14 + b.p) > 0 ? -1 : 0;
      g.fillStyle = '#2b2622'; g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + f, 1, 1); g.fillRect(x + 1, y + f, 1, 1);
    }
  },
  finish(ev) { world.grades.dusk.t = 0; ev.delta('mood', -5); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'moose',
  title: 'The Moose Migration',
  stamp: 'Wildlife',
  weight: () => 0.9,
  requires: () => true,
  duration: 19,
  setup(ev) {
    // find the longest stretch of unbroken land (river crossings allowed) across a row
    let best = null;
    for (let k = 0; k < 80; k++) {
      const y = Math.round(ev.rng.range(map.top + 25, map.bottom - 25));
      let run = 0, start = 0;
      for (let x = 0; x < W; x++) {
        const ok = [-6, 0, 6].every((dy) => map.isLand(x, y + dy));
        if (ok) { if (!run) start = x; run++; if (!best || run > best.len) best = { y, x0: start, x1: x, len: run }; } else run = 0;
      }
    }
    if (!best) best = { y: Math.round(H / 2), x0: W * 0.3, x1: W * 0.7 };
    ev.y = best.y; ev.x0 = best.x0 + 3; ev.x1 = best.x1 - 3;
  },
  headline: (ev) => ({
    title: 'The great moose migration crosses Eternia',
    sub: ev.rng.pick([
      'Everything stops for the moose. Everything.',
      'The moose do not know where they are going, but they are going there majestically.',
      'Traffic is halted, boats drop anchor, and a hush falls over the land.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x0 + 20, y: ev.y, zoom: 2 }),
  start(ev) {
    ev.s.herd = new Crowd();
    const span = Math.min(40, (ev.x1 - ev.x0) * 0.3);
    for (let k = 0; k < 12; k++) {
      ev.s.herd.add({ kind: 'moose', x: ev.x0 + span - (k / 11) * span + ev.rng.range(-1, 1), y: ev.y + ev.rng.range(-5, 5), tx: ev.x1, ty: ev.y + ev.rng.range(-5, 5), speed: ((ev.x1 - ev.x0) / (ev.dur - 4.5)) * ev.rng.range(0.95, 1.08), face: 1, color: '#5a3a24', appear: k * 0.25 });
    }
    world.freezeTraffic = true;
  },
  update(ev, dt) {
    const t = ev.t, herd = ev.s.herd;
    herd.update(dt);
    const lead = herd.list[0];
    camera.focus(lead.x - 10, lead.y, 2, 1.2);
    ev.at(0.2, 't0', () => ticker('Everything stops. Caravans halt. Boats drift. The moose are crossing.'));
    ev.at(2.5, 'b1', () => say(nearestCity(lead.x, lead.y), 'Shh, don\'t startle them', {}));
    ev.at(6, 'b2', () => say(nearestCity(lead.x, lead.y), 'Majestic.', {}));
    ev.at(9, 't1', () => ticker('A moose stops in the middle of a road for no reason. Nobody complains.'));
    ev.at(11, 'b3', () => say(nearestCity(lead.x, lead.y), 'I think I\'m crying', {}));
    for (const m of herd.list) if (!m.gone && m.x >= ev.x1 - 2 && m.vanishAt == null) m.vanishAt = herd.t + Math.random() * 0.6;
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    // the herd arrives one by one rather than popping into existence together
    const shown = ev.s.herd.list.filter((m) => ev.t >= m.appear);
    const all = ev.s.herd.list; ev.s.herd.list = shown; ev.s.herd.draw(g, t); ev.s.herd.list = all;
  },
  finish(ev) {
    world.freezeTraffic = false;
    ev.delta('mood', +6);
  },
});
