// ============================================================================
// 07c EVENTS, BATCH 1b — nature, weather, geology and the sky.
// Most of these are a Cover (terrain painter) plus weather plus a grade.
// ============================================================================

const PAL = {
  dry: [P('#c7ab6b'), P('#b59a5c'), P('#d6bf84')],
  flood: [P('#3f8a98'), P('#4f9aa6'), P('#8fc8c8')],
  snow: [P('#ffffff'), P('#eaf2f4'), P('#d2e0e8')],
  fire: [P('#fff0a0'), P('#ffd24a'), P('#ff8a2a'), P('#e0501e')],
  char: [P('#3a3430'), P('#4a4038'), P('#2e2a26')],
  flower: [P('#f29ab8'), P('#f4d45a'), P('#fbf6ea'), P('#b58ad8'), P('#ff7a6a')],
  lava: [P('#fff0a0'), P('#ffb02a'), P('#ff6a1e'), P('#d0401a')],
  crust: [P('#8a3a1e'), P('#5a2a1e')],
  basalt: [P('#3a3232'), P('#2e2826'), P('#453c3a')],
};
const noiseAt = (ci) => cells.noise[ci];
const pick3 = (arr, ci) => arr[Math.floor(noiseAt(ci) * arr.length * 0.999)];

// ---------------------------------------------------------------------------
defineEvent({
  id: 'drought',
  title: 'Drought',
  stamp: 'Weather',
  weight: () => 1,
  requires: (w) => w.freeze < 0.1,
  duration: 18,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: 'Drought grips Eternia',
    sub: ev.rng.pick([
      'Citizens are encouraged to shower with a friend.',
      'The river is reduced to a strongly worded puddle.',
      'Cactus sales up 3,000%.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cover = new Cover({ alpha: 0.82, color: (ci, v) => (dith(ci, v) ? pick3(PAL.dry, ci) : 0) });
    for (let k = 0; k < 40; k++) {
      const ci = randomLandCell(ev.rng, (c) => cells.biome[c] === BIOME.DESERT || ev.rng.chance(0.2));
      if (ci >= 0) ev.s.cover.seed(ci);
    }
    world.grades.heat.t = 0.8;
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker('No rain for 400 days. The national rain-dance troupe is under review.'));
    if (t < 12) {
      cv.grow(dt, 1100, (ci) => cells.land[ci] && cells.biome[ci] !== BIOME.SNOW);
      world.riverLevel = approach(world.riverLevel, 0.15, 0.35, dt);
      world.grades.dust.t = 0.25;
    }
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Is it hot or is it me?', {}));
    ev.at(5.5, 'b2', () => say(ev.city, 'My cactus is thirsty', {}));
    ev.at(7, 't1', () => ticker('The river dries up. Fish are relocated to the royal bathtub.'));
    ev.at(8.5, 'b3', () => say(capitalOf('west'), 'Save water: drink juice', {}));
    ev.at(12, 'rain', () => {
      weather.rainT = 0.8; world.grades.heat.t = 0; world.grades.dust.t = 0;
      ticker('Rain! Actual rain! Several people cry, which also helps.');
    });
    if (t > 12) { cv.fade(dt, 0.35); world.riverLevel = approach(world.riverLevel, 1, 0.8, dt); }
    ev.at(16.5, 'dry', () => { weather.rainT = 0; });
  },
  finish(ev) {
    ev.s.cover.remove();
    world.riverLevel = 1; weather.rainT = 0;
    world.grades.heat.t = 0; world.grades.dust.t = 0;
    ev.delta('mood', -6);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'flood',
  title: 'The Great Flood',
  stamp: 'Weather',
  weight: () => 1,
  requires: (w) => w.freeze < 0.1,
  duration: 19,
  setup(ev) {
    ev.limit = cells.elevAt(0.4);
    ev.low = cells.elevAt(0.0);
    ev.seeds = [];
    for (let ci = 0; ci < CN; ci++) {
      if (!cells.land[ci]) continue;
      const nearWet = cells.wetAny[ci - 1] || cells.wetAny[ci + 1] || cells.wetAny[ci - CW] || cells.wetAny[ci + CW] || cells.wetAny[ci];
      if (nearWet || cells.coast[ci] <= 3) ev.seeds.push(ci);
    }
  },
  headline: (ev) => ({
    title: 'The river bursts its banks',
    sub: ev.rng.pick([
      'Towns bob gently. Morale is surprisingly high.',
      'Fish report a record year for tourism.',
      'Every basement is now a swimming pool.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cover = new Cover({
      alpha: 0.9, animated: true,
      color: (ci, v, t) => {
        if (!dith(ci, v)) return 0;
        const s = Math.sin(t * 2 + noiseAt(ci) * 9 + (ci % CW) * 0.2);
        return s > 0.85 ? PAL.flood[2] : s > 0 ? PAL.flood[1] : PAL.flood[0];
      },
    });
    ev.s.warned = new Set();
    weather.rainT = 1;
    world.grades.dusk.t = 0.45;
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker('It has rained for 40 days. The forecast says "more".'));
    if (t < 10.5) {
      const level = lerp(ev.low, ev.limit, smooth((t - 0.5) / 8));
      ev.every('seed', 0.3, dt, () => { for (const ci of ev.seeds) if (cv.f[ci] === 0 && cells.elev[ci] < level) cv.seed(ci); });
      cv.grow(dt, 3000, (ci) => cells.land[ci] && cells.elev[ci] < level);
    }
    for (const c of world.cities) {
      const wet = cv.f[cellOf(c.x, c.y)] > 0.3;
      c.bob = approach(c.bob, wet ? 1 : 0, 2, dt);
      if (wet && !ev.s.warned.has(c.id) && ev.s.warned.size < 3) {
        ev.s.warned.add(c.id);
        say(c, ev.rng.pick(['Anyone got a boat?', 'Our basement is a lake now', "We're a port town now!", 'Wheee!']), {});
      }
    }
    ev.at(11, 'stop', () => {
      weather.rainT = 0; world.grades.dusk.t = 0;
      ticker('The rain stops. The water leaves, taking several sheds with it.');
    });
    if (t > 11) cv.fade(dt, 0.3);
  },
  finish(ev) {
    ev.s.cover.remove();
    weather.rainT = 0; world.grades.dusk.t = 0;
    for (const c of world.cities) {
      if (c.bob > 0.3) { c.damage = clamp(c.damage + 0.15, 0, 1); logCity(c, 'Flooded. Now has excellent swimming pools'); }
      c.bob = 0;
    }
    world.riverLevel = 1;
    ev.delta('mood', -7);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'iceage',
  title: 'The Little Ice Age',
  stamp: 'Weather',
  weight: () => 1,
  requires: (w) => w.riverLevel >= 1,
  duration: 21,
  setup() {},
  headline: (ev) => ({
    title: 'A small ice age arrives',
    sub: ev.rng.pick([
      'Snowball fights escalate into snowball diplomacy.',
      'Scientists blame a door someone left open.',
      'Penguins arrive and insist they were invited.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cover = new Cover({ alpha: 0.95, color: (ci, v) => (dith(ci, v) ? (cells.biome[ci] === BIOME.MOUNTAIN ? PAL.snow[2] : noiseAt(ci) > 0.7 ? PAL.snow[0] : PAL.snow[1]) : 0) });
    for (let ci = 0; ci < CN; ci++) {
      if (!cells.land[ci]) continue;
      const y = cellY(ci);
      if (y < map.top + 16 || cells.biome[ci] === BIOME.SNOW) ev.s.cover.seed(ci);
    }
    weather.snowT = 0.9;
    world.grades.cold.t = 0.9;
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker('Temperatures drop. Then they drop again, out of spite.'));
    if (t < 13) {
      cv.grow(dt, 2600, (ci, from) => cells.land[ci] && (cellY(ci) >= cellY(from) - 2 || Math.random() < 0.45));
      world.freeze = approach(world.freeze, 0.95, 0.4, dt);
    }
    ev.at(3.5, 'b1', () => say(ev.rng.pick(world.cities), 'Brrr!', {}));
    ev.at(6, 'b2', () => say(ev.rng.pick(world.cities), 'Snowball fight!', {}));
    ev.at(7.5, 't1', () => ticker('The river freezes solid. Ice skating becomes the national sport.'));
    ev.at(9.5, 'b3', () => say(ev.rng.pick(world.cities), 'Where did the river go?', {}));
    ev.at(13, 'thaw', () => {
      weather.snowT = 0; world.grades.cold.t = 0;
      ticker('Spring finally turns up, apologising profusely.');
    });
    if (t > 13) { cv.fade(dt, 0.25); world.freeze = approach(world.freeze, 0, 0.6, dt); }
  },
  finish(ev) {
    ev.s.cover.remove();
    world.freeze = 0; weather.snowT = 0; world.grades.cold.t = 0;
    ev.delta('mood', -4);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'wildfire',
  title: 'Wildfire',
  stamp: 'Act of nature',
  weight: () => 1,
  requires: (w) => w.freeze < 0.1,
  duration: 18,
  setup(ev) {
    ev.ci = randomLandCell(ev.rng, (c) => cells.biome[c] === BIOME.FOREST && cells.coast[c] > 4);
    if (ev.ci < 0) ev.ci = randomLandCell(ev.rng, () => true);
    ev.x = cellX(ev.ci); ev.y = cellY(ev.ci);
    ev.near = nearestCity(ev.x, ev.y);
  },
  headline: (ev) => ({
    title: `Wildfire breaks out near ${ev.near.name}`,
    sub: ev.rng.pick([
      'Investigators blame a very ambitious barbecue.',
      'Firefighters arrive with buckets and a lot of confidence.',
      'Marshmallow sales briefly and inappropriately spike.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x, y: ev.y, zoom: 2 }),
  start(ev) {
    ev.s.out = false;
    const burning = (v, t) => !ev.s.out && t - v < 2.4;
    ev.s.burning = burning;
    ev.s.cover = new Cover({
      animated: true,
      color: (ci, v, t) => {
        if (burning(v, t)) return PAL.fire[(Math.floor(t * 12 + noiseAt(ci) * 7) % 4)];
        return noiseAt(ci) < 0.75 ? pick3(PAL.char, ci) : 0;
      },
    });
    ev.s.cover.seed(ev.ci, simTime);
    ev.s.hurt = new Set();
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker(`Smoke is spotted near ${ev.near.name}. Someone says "that's probably fine".`));
    ev.at(3.5, 'zoom', () => camera.focus(ev.x, ev.y, 1.35, 0.8));
    if (!ev.s.out) {
      cv.grow(dt, 320, (ci, from) => {
        if (!cells.land[ci] || !ev.s.burning(cv.f[from], simTime)) return false;
        const b = cells.biome[ci];
        return b === BIOME.FOREST || (b === BIOME.PLAINS && Math.random() < 0.18);
      }, () => simTime);
      ev.every('smoke', 0.04, dt, () => {
        const fr = cv.frontier;
        if (!fr.length) return;
        const ci = fr[(Math.random() * fr.length) | 0];
        fx.smoke(cellX(ci), cellY(ci), { size: 2, grow: 1.4, life: 2.6, colors: ['#8a847c', '#6f6a64', '#55514d'] });
        fx.fire(cellX(ci), cellY(ci));
      });
      ev.every('towns', 0.5, dt, () => {
        for (const c of world.cities) {
          if (ev.s.hurt.has(c.id)) continue;
          const ci = cellOf(c.x, c.y);
          let hot = false;
          for (let dy = -3; dy <= 3 && !hot; dy++) for (let dx = -3; dx <= 3 && !hot; dx++) {
            const k = ci + dy * CW + dx;
            if (k >= 0 && k < CN && cv.f[k] > 0 && ev.s.burning(cv.f[k], simTime)) hot = true;
          }
          if (hot) {
            ev.s.hurt.add(c.id);
            c.damage = clamp(c.damage + 0.3, 0, 1);
            say(c, ev.rng.pick(['Is something burning?', 'Who left the campfire on?', 'Hot hot hot!']), {});
            logCity(c, 'Singed by a wildfire. Smells faintly of toast');
          }
        }
      });
    }
    ev.at(10.5, 'rain', () => {
      ev.s.out = true; cv.dirty = true;
      weather.rainT = 1; world.grades.dusk.t = 0.35;
      ticker('The rain arrives. The fire leaves, sulking.');
    });
    ev.at(15.5, 'dry', () => { weather.rainT = 0; world.grades.dusk.t = 0; });
  },
  finish(ev) {
    const cv = ev.s.cover;
    // burnt ground stays as a scar that slowly grows back
    for (let ci = 0; ci < CN; ci++) {
      if (cv.f[ci] <= 0 || noiseAt(ci) >= 0.75) continue;
      const x = cellX(ci) - 1, y = cellY(ci) - 1;
      stampPixel(x, y, '#3a3430', 0.55); stampPixel(x + 1, y, '#3a3430', 0.45);
      stampPixel(x, y + 1, '#4a4038', 0.45); stampPixel(x + 1, y + 1, '#3a3430', 0.55);
    }
    cv.remove();
    weather.rainT = 0; world.grades.dusk.t = 0;
    world.devastation = Math.min(1, world.devastation + 0.1);
    ev.delta('mood', -6);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'monsoon',
  title: 'Monsoon',
  stamp: 'Weather',
  weight: () => 0.9,
  requires: (w) => w.freeze < 0.1,
  duration: 14,
  setup() {},
  headline: (ev) => ({
    title: 'Monsoon season arrives early, and loudly',
    sub: ev.rng.pick([
      'Umbrella sales up 900%. Umbrella thefts up 1,000%.',
      'Ducks declare it the best week ever.',
      'The national anthem is temporarily replaced by thunder.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { weather.rainT = 1.4; world.grades.dusk.t = 0.6; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Dark clouds gather. They look like they mean it.'));
    if (t > 1.5 && t < 11) ev.every('bolt', 1.1, dt, () => {
      const ci = randomLandCell(ev.rng, () => true);
      if (ci >= 0) fx.bolt(cellX(ci), cellY(ci));
    });
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'My hair!', {}));
    ev.at(6, 'b2', () => say(ev.rng.pick(world.cities), 'Has anyone seen my umbrella?', {}));
    ev.at(7, 't1', () => ticker('Rivers are full again. So is everyone\'s left boot.'));
    ev.at(11, 'stop', () => { weather.rainT = 0; world.grades.dusk.t = 0; });
    world.riverLevel = approach(world.riverLevel, 1, 1, dt);
  },
  finish(ev) {
    weather.rainT = 0; world.grades.dusk.t = 0; world.riverLevel = 1;
    ev.delta('mood', -2);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'tornado',
  title: 'Tornado Outbreak',
  stamp: 'Weather',
  weight: () => 1,
  requires: () => true,
  duration: 19,
  setup(ev) {
    ev.twisters = [];
    const n = ev.rng.int(2, 3);
    for (let k = 0; k < n; k++) {
      const band = [map.top + (map.bottom - map.top) * (0.2 + k * 0.3), 0];
      const ci = randomLandCell(ev.rng, (c) => cellX(c) < W * 0.4 && Math.abs(cellY(c) - band[0]) < 18);
      ev.twisters.push({ x: ci >= 0 ? cellX(ci) : W * 0.3, y: ci >= 0 ? cellY(ci) : H * 0.5, seed: ev.rng.range(0, 10), hit: new Set(), carried: [], size: 1 });
    }
  },
  headline: (ev) => ({
    title: 'Tornado outbreak sweeps across Eternia',
    sub: ev.rng.pick([
      'Cows describe it as "the best day of our lives".',
      'Several houses are now in different towns.',
      'Residents advised to hold on to their hats, and their neighbours.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.dusk.t = 0.3; weather.rainT = 0.3; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Sirens sound. Cows look up with interest.'));
    for (const tw of ev.twisters) {
      tw.size = t < 1 ? t : t > 15 ? Math.max(0, 1 - (t - 15) / 2) : 1;
      tw.x += (9 + Math.sin(t * 0.7 + tw.seed) * 6) * dt;
      tw.y += Math.sin(t * 0.9 + tw.seed * 2) * 9 * dt;
      tw.y = clamp(tw.y, 20, H - 20);
      if (Math.random() < 0.6) fx.dust(tw.x, tw.y, 1, ['#b8a888', '#8a7a64']);
      for (const cow of world.cows) {
        if (cow.held || cow.abducted || tw.size < 0.8 || dist(cow.x, cow.y, tw.x, tw.y) > 5) continue;
        cow.held = true; tw.carried.push({ cow, a: Math.random() * TAU, h: 6 + Math.random() * 12 });
        if (tw.carried.length === 1) say(cow, 'Moooo!', { life: 1.5, lift: 4 });
      }
      for (const k of tw.carried) {
        k.a += dt * 7;
        k.cow.x = tw.x + Math.cos(k.a) * 3; k.cow.y = tw.y; k.cow.z = k.h + Math.sin(k.a) * 1.5;
      }
      for (const c of world.cities) {
        if (tw.hit.has(c.id) || dist(c.x, c.y, tw.x, tw.y) > 8) continue;
        tw.hit.add(c.id);
        c.damage = clamp(c.damage + 0.25, 0, 1); c.shake = 0.8;
        fx.burst(c.x, c.y - 2, 12, { speed: 16, vz: 20, g: 30, colors: ['#b5523b', '#e6dcc4', '#7c5a3c'], life: 1.4 });
        say(c, ev.rng.pick(['My roof!', 'Has anyone seen my house?', 'Wheeee— no wait']), {});
        logCity(c, 'Visited by a tornado. Rearranged slightly');
      }
    }
    ev.at(8, 't1', () => ticker('Update: the tornadoes have collected several cows. The cows seem fine with it.'));
    ev.at(15, 'drop', () => {
      for (const tw of ev.twisters) for (const k of tw.carried) { k.cow.held = false; k.cow.chute = true; k.cow.vz = -6; k.cow.z = Math.max(k.cow.z, 16); }
      ticker('The cows are returned by parachute. Nobody knows where the parachutes came from.');
    });
  },
  draw(ev, g, layer, t) {
    const cols = ['#7f7a74', '#a9a39b', '#d2ccc3'];
    for (const tw of ev.twisters) {
      if (tw.size <= 0) continue;
      const ox = offX(tw.x, tw.y);
      if (layer === 'ground') {
        g.fillStyle = 'rgba(20,25,20,0.3)';
        g.fillRect(Math.round(tw.x + ox - 4 * tw.size), Math.round(tw.y), Math.round(8 * tw.size), 2);
        continue;
      }
      if (layer !== 'air') continue;
      // a solid funnel: stacked bands that scroll upward, so it reads as spinning
      for (let k = 0; k < 14; k++) {
        const r = (0.8 + k * 0.42) * tw.size;
        const z = k * 2 * tw.size;
        const sway = Math.sin(t * 3 + tw.seed + k * 0.35) * k * 0.18;
        const x = Math.round(tw.x + ox + sway - r), w = Math.max(1, Math.round(r * 2));
        g.fillStyle = cols[(k + Math.floor(t * 10)) % 3];
        g.fillRect(x, Math.round(tw.y - z - 2), w, 2);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x + ((Math.floor(t * 14) + k) % w), Math.round(tw.y - z - 2), 1, 1);
      }
    }
  },
  finish(ev) {
    for (const tw of ev.twisters) for (const k of tw.carried) {
      k.cow.held = false; if (k.cow.z > 0) { k.cow.chute = true; k.cow.vz = -6; }
    }
    world.grades.dusk.t = 0; weather.rainT = 0;
    ev.delta('mood', -5);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'spring',
  title: 'Endless Spring',
  stamp: 'Weather',
  weight: () => 1,
  requires: (w) => w.freeze < 0.1,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Spring refuses to end',
    sub: ev.rng.pick([
      'Hay fever is declared a national holiday.',
      'Bees are working overtime and would like to talk about it.',
      'Flowers bloom in several places they really should not.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cover = new Cover({ color: (ci, v) => (dith(ci, v * 0.4) ? PAL.flower[Math.floor(hash2(ci, 3) * 5)] : 0) });
    for (const c of world.cities) ev.s.cover.seedAt(c.x, c.y + 4, 3);
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker('The first flower opens. Then all of the other flowers open.'));
    if (t < 10) cv.grow(dt, 1300, (ci) => cells.land[ci] && (cells.biome[ci] === BIOME.PLAINS || cells.biome[ci] === BIOME.FOREST || cells.biome[ci] === BIOME.BEACH));
    if (t < 12) ev.every('pollen', 0.05, dt, () => {
      const v = camera.view();
      fx.spawn({ x: v.x0 + Math.random() * v.w, y: v.y0 + Math.random() * v.h, z: 4, vx: 4, vz: 2, life: 2, colors: ['#f4e27a', '#f4d45a'], layer: 'air' });
    });
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Achoo!', {}));
    ev.at(4, 'b2', () => say(ev.rng.pick(world.cities), 'Achoo!', {}));
    ev.at(5.5, 'b3', () => say(ev.rng.pick(world.cities), 'So pretty!', {}));
    ev.at(7, 'sneeze', () => { camera.kick(3); ticker('The whole country sneezes at once. Seismologists are alarmed.'); });
    ev.at(8, 'hearts', () => { for (const c of world.cities) fx.hearts(c.x, c.y - 3); });
    if (t > 11) cv.fade(dt, 0.28);
  },
  finish(ev) {
    ev.s.cover.remove();
    ev.delta('mood', +10);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'earthquake',
  title: 'Earthquake',
  stamp: 'Act of nature',
  weight: () => 1,
  requires: () => true,
  duration: 12,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities);
    let x = ev.city.x, y = ev.city.y;
    for (let k = 0; k < 200; k++) {
      const tx = ev.city.x + ev.rng.range(-26, 26), ty = ev.city.y + ev.rng.range(-18, 18);
      if (map.isWalkable(tx, ty) && dist(tx, ty, ev.city.x, ev.city.y) > 10) { x = tx; y = ty; break; }
    }
    ev.x = Math.round(x); ev.y = Math.round(y);
    // two cracks wander away from the epicentre
    ev.crack = [];
    for (const dir of [0, Math.PI]) {
      let a = ev.rng.range(-0.6, 0.6) + dir, cx = ev.x, cy = ev.y;
      for (let s = 0; s < 44; s++) {
        a += ev.rng.range(-0.5, 0.5);
        cx += Math.cos(a); cy += Math.sin(a) * 0.8;
        if (!map.isWalkable(cx, cy)) break;
        ev.crack.push({ x: Math.round(cx), y: Math.round(cy), s });
      }
    }
  },
  headline: (ev) => ({
    title: `Earthquake rattles ${ev.city.name}`,
    sub: ev.rng.pick([
      'Seismologists rate it "quite wobbly".',
      'Every picture frame in the country is now slightly crooked.',
      'Jelly production halted as a precaution.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x, y: ev.y, zoom: 1.7 }),
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('The ground begins to hum. Then it begins to dance.'));
    if (t > 1 && t < 6) {
      camera.kick(4 * (1 - (t - 1) / 5) + 0.5);
      ev.every('ring', 0.45, dt, () => fx.ring(ev.x, ev.y, { max: 60, speed: 50, color: '#d8c8a8' }));
      for (const c of world.cities) if (dist(c.x, c.y, ev.x, ev.y) < 70) c.shake = 0.3;
      const reach = (t - 1) * 14;
      for (const p of ev.crack) {
        if (p.s <= reach && !p.done) {
          p.done = true;
          stampPixel(p.x, p.y, '#2b221c', 0.95);
          if (p.s % 2) stampPixel(p.x, p.y + 1, '#6a5a48', 0.6);
          if (Math.random() < 0.3) fx.dust(p.x, p.y, 2);
        }
      }
    }
    ev.at(2, 'dmg', () => {
      const hit = damageNear(ev.x, ev.y, 34, 0.35, ev, 'Shaken by an earthquake. Everything is slightly crooked');
      for (const c of hit) fx.dust(c.x, c.y, 12);
    });
    ev.at(2.6, 'b1', () => say(ev.city, 'Was that you?', {}));
    ev.at(6.5, 'b2', () => say(ev.city, 'I felt that', {}));
    ev.at(8, 't1', () => ticker('Aftershocks consist mostly of people asking "did you feel that?"'));
  },
  finish(ev) {
    for (const p of ev.crack) if (!p.done) stampPixel(p.x, p.y, '#2b221c', 0.95);
    world.devastation = Math.min(1, world.devastation + 0.15);
    ev.delta('mood', -6);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'volcano',
  title: 'Volcano',
  stamp: 'Act of nature',
  weight: () => 1,
  requires: () => true,
  duration: 21,
  setup(ev) {
    ev.ci = randomLandCell(ev.rng, (c) => (cells.biome[c] === BIOME.MOUNTAIN || cells.biome[c] === BIOME.SNOW)
      && world.cities.every((k) => dist(k.x, k.y, cellX(c), cellY(c)) > 16));
    if (ev.ci < 0) ev.ci = randomLandCell(ev.rng, () => true);
    ev.x = cellX(ev.ci); ev.y = cellY(ev.ci);
    ev.near = nearestCity(ev.x, ev.y);
    ev.name = ev.rng.pick(['Mount Grumble', 'Mount Probably Fine', 'Mount Crumpet', 'Mount Oh Dear', 'Mount Gerald']);
  },
  headline: (ev) => ({
    title: `${ev.name} erupts near ${ev.near.name}`,
    sub: ev.rng.pick([
      'The lava is described as "very spicy".',
      'Tourists are told to enjoy the view from much, much further away.',
      'Previously listed on maps as "just a big hill".',
    ]),
  }),
  focus: (ev) => ({ x: ev.x, y: ev.y - 8, zoom: 1.9 }),
  start(ev) {
    ev.s.cover = new Cover({
      animated: true,
      color: (ci, v, t) => {
        const age = t - v;
        if (age < 4) return PAL.lava[(Math.floor(t * 8 + noiseAt(ci) * 9) % 4)];
        if (age < 8) return PAL.crust[noiseAt(ci) > 0.5 ? 1 : 0];
        return pick3(PAL.basalt, ci);
      },
    });
    ev.s.hurt = new Set();
    ev.s.cells = 0;
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker(`${ev.name}, previously considered "just a big hill", begins to rumble.`));
    if (t < 3) { camera.kick(1.2); if (Math.random() < 0.3) fx.smoke(ev.x, ev.y - 2, { size: 2, life: 2 }); }
    ev.at(3, 'boom', () => {
      world.grades.flash.v = 0.35; camera.kick(6);
      fx.ring(ev.x, ev.y, { max: 50, speed: 60, color: '#ffb35a' });
      cv.seedAt(ev.x, ev.y, 3, simTime);
      world.grades.dust.t = 0.35; weather.ashT = 0.45;
    });
    if (t > 3 && t < 11) {
      ev.every('bomb', 0.09, dt, () => {
        const a = ev.rng.range(0, TAU), r = ev.rng.range(4, 22);
        const tx = ev.x + Math.cos(a) * r, ty = ev.y + Math.sin(a) * r * 0.7;
        fx.launch({
          x0: ev.x, y0: ev.y, x1: tx, y1: ty, z0: 3, z1: 0, arc: ev.rng.range(18, 40), dur: ev.rng.range(0.9, 1.5),
          draw: (g, x, y) => { g.fillStyle = '#ffb02a'; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
          onStep: (p) => { if (Math.random() < 0.3) fx.spawn({ x: p.x, y: p.y, z: p.z, life: 0.3, colors: ['#ff8a2a', '#8a3a1e'] }); },
          onHit: (p) => { if (map.isWalkable(p.x, p.y)) cv.seed(cellOf(p.x, p.y), simTime); fx.fire(p.x, p.y); },
        });
      });
      for (let k = 0; k < 2; k++) fx.smoke(ev.x + ev.rng.range(-2, 2), ev.y - 3, { rise: 16, size: 3, grow: 2, life: 3, colors: ['#6a6460', '#55514d', '#44403c'] });
    }
    if (t > 3 && t < 14 && ev.s.cells < 900) {
      const before = cv.frontier.length;
      cv.grow(dt, 160, (ci, from) => cells.land[ci] && cells.elev[ci] <= cells.elev[from] + 0.004 + Math.random() * 0.01, () => simTime);
      ev.s.cells += Math.max(0, cv.frontier.length - before);
    }
    ev.every('towns', 0.5, dt, () => {
      for (const c of world.cities) {
        if (ev.s.hurt.has(c.id)) continue;
        const v = cv.f[cellOf(c.x, c.y)];
        if (v > 0) {
          ev.s.hurt.add(c.id);
          c.damage = clamp(c.damage + 0.45, 0, 1);
          say(c, ev.rng.pick(['Hot hot hot!', 'Is that... lava?', 'Free hot tub!']), {});
          logCity(c, `Visited by lava from ${ev.name}`);
        }
      }
    });
    ev.at(5, 'b1', () => say(ev.near, 'Is that... lava?', {}));
    ev.at(6, 'zoom', () => camera.focus(ev.x, ev.y, 1.4, 0.7));
    ev.at(14, 't1', () => ticker('The lava cools into brand-new rock. Estate agents are thrilled.'));
    ev.at(15, 'clear', () => { world.grades.dust.t = 0; weather.ashT = 0; });
    ev.at(16, 'b2', () => say(ev.near, 'Lovely view though', {}));
  },
  finish(ev) {
    const cv = ev.s.cover;
    for (let ci = 0; ci < CN; ci++) {
      if (cv.f[ci] <= 0) continue;
      const x = cellX(ci) - 1, y = cellY(ci) - 1;
      const col = noiseAt(ci) > 0.5 ? '#3a3232' : '#2e2826';
      stampPixel(x, y, col, 0.9); stampPixel(x + 1, y, col, 0.9); stampPixel(x, y + 1, col, 0.9); stampPixel(x + 1, y + 1, col, 0.9);
    }
    // a little cone with a glowing top marks the new volcano
    const X = Math.round(ev.x), Y = Math.round(ev.y);
    for (let r = 0; r < 4; r++) for (let dx = -r; dx <= r; dx++) stampPixel(X + dx, Y - 3 + r, r === 0 ? '#e0501e' : '#4a3e38', 1);
    cv.remove();
    world.grades.dust.t = 0; weather.ashT = 0;
    world.devastation = Math.min(1, world.devastation + 0.1);
    ev.delta('mood', -5);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'eclipse',
  title: 'Solar Eclipse',
  stamp: 'Sky watch',
  weight: () => 0.8,
  requires: () => true,
  duration: 13,
  setup() {},
  headline: (ev) => ({
    title: 'Total eclipse over Eternia',
    sub: ev.rng.pick([
      'Everyone looks up at the same time. Several necks are sprained.',
      'Cows go to bed early and are furious about it.',
      'The moon has been asked to apologise. It has not.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  update(ev) {
    const t = ev.t;
    const p = clamp((t - 0.5) / 11.5, 0, 1);
    ev.s.sx = lerp(-80, W + 80, p); ev.s.sy = lerp(H * 0.3, H * 0.72, p);
    world.grades.night.t = Math.pow(Math.max(0, 1 - Math.abs(p - 0.5) * 2.2), 0.7) * 0.55;
    ev.at(0.2, 't0', () => ticker('The moon slides in front of the sun. Nobody told the moon that was rude.'));
    const lines = ['Ooooh', "Don't look directly at it!", 'Who turned off the sun?', 'Make a wish!', 'Ahhh'];
    world.cities.slice(0, 5).forEach((c, i) => ev.at(3.5 + i * 0.7, 'b' + i, () => say(c, lines[i], { life: 2.2 })));
    ev.at(9.5, 't1', () => ticker('The sun comes back. Everyone claps, for some reason.'));
  },
  draw(ev, g, layer) {
    if (layer !== 'sky' || ev.s.sx == null) return;
    for (const [r, a] of [[95, 0.1], [70, 0.12], [48, 0.18]]) {
      g.fillStyle = `rgba(8,10,28,${a})`;
      g.beginPath(); g.ellipse(ev.s.sx, ev.s.sy, r, r * 0.75, 0, 0, TAU); g.fill();
    }
  },
  finish(ev) {
    world.grades.night.t = 0;
    ev.delta('mood', +4);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'aurora',
  title: 'Aurora',
  stamp: 'Sky watch',
  weight: () => 0.8,
  requires: () => true,
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Northern lights dance over Eternia',
    sub: ev.rng.pick([
      'Scientists are baffled, as Eternia does not really have a north.',
      'Everyone agrees it is the prettiest thing to happen in years.',
      'Several couples get engaged. One gets engaged twice.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    world.grades.night.t = 0.85;
    if (!SPR2.auroraGreen) {
      const make = (top, bottom) => {
        const c = makeCanvas(1, 24), cc = c.getContext('2d');
        const gr = cc.createLinearGradient(0, 0, 0, 24);
        gr.addColorStop(0, top); gr.addColorStop(0.6, bottom); gr.addColorStop(1, 'rgba(0,0,0,0)');
        cc.fillStyle = gr; cc.fillRect(0, 0, 1, 24);
        return c;
      };
      SPR2.auroraGreen = make('rgba(125,255,176,0)', 'rgba(125,255,176,0.9)');
      SPR2.auroraPink = make('rgba(255,138,216,0)', 'rgba(255,138,216,0.8)');
    }
  },
  update(ev) {
    ev.at(0.2, 't0', () => ticker('Ribbons of light appear in the sky. Nobody can agree what colour they are.'));
    ev.at(3.5, 'b1', () => say(ev.rng.pick(world.cities), 'Wow', {}));
    ev.at(5.5, 'b2', () => say(ev.rng.pick(world.cities), "It's like the sky is dancing", {}));
    ev.at(8, 'b3', () => say(ev.rng.pick(world.cities), 'Quick, paint it!', {}));
    ev.at(12, 'day', () => { world.grades.night.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky') return;
    const fade = clamp(ev.t / 2.5, 0, 1) * clamp((12.5 - ev.t) / 2, 0, 1);
    if (fade <= 0) return;
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 70; k++) {
      const x = hash2(k, 11) * W, y = hash2(k, 23) * H;
      if (map.isLand(x, y)) continue;
      g.globalAlpha = fade * (0.4 + 0.6 * Math.max(0, Math.sin(t * 3 + k)));
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    const bands = [[H * 0.18, SPR2.auroraGreen, 0], [H * 0.32, SPR2.auroraPink, 2], [H * 0.46, SPR2.auroraGreen, 4]];
    for (const [base, img, ph] of bands) {
      for (let x = 0; x < W; x++) {
        const y = base + Math.sin(x * 0.03 + t * 0.6 + ph) * 12 + Math.sin(x * 0.011 - t * 0.3 + ph) * 18;
        const h = 14 + Math.sin(x * 0.07 + t * 1.3 + ph) * 7;
        g.globalAlpha = fade * (0.35 + 0.25 * Math.sin(x * 0.05 + t * 2 + ph));
        g.drawImage(img, x, y - h, 1, h);
      }
    }
    g.globalAlpha = 1;
  },
  finish(ev) {
    world.grades.night.t = 0;
    ev.delta('mood', +8);
  },
});
