// ============================================================================
// 07b EVENTS, BATCH 1a — technology and the era cycle.
// Stone -> Medieval -> Industrial -> Atomic -> Digital -> Future, and the
// Big Oops sends everyone back to the Stone Age to start again.
// Era-advancing events are "unbagged": they stay available so history moves.
// ============================================================================

const SPR2 = {};
function initSprites2() {
  SPR2.cat = makeSprite(['o...o', 'ooooo', 'oeoeo', '.oNo.'], { o: '#f0a24a', e: '#1b2a2f', N: '#ff9ab4' });
  SPR2.rocket = makeSprite(['.r.', '.w.', 'www', 'wbw', 'www', 'rwr', 'r.r'], { r: '#c8412e', w: '#f2f0ea', b: '#3a6d9a' });
  SPR2.capsule = makeSprite(['.ccc.', 'c...c', '.l.l.', '..k..', '.kkk.'], { c: '#f2eee2', l: '#d8d2c4', k: '#8a9096' });
  SPR2.robot = makeSprite(['aa', 'bb'], { a: '#c9d3d8', b: '#7d8a92' });
}

// ---------------------------------------------------------------------------
defineEvent({
  id: 'wheel',
  title: 'The Wheel',
  stamp: 'Innovation',
  unbagged: true,
  weight: () => 2.5,
  requires: (w) => w.era === 0,
  duration: 16,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: `${ev.city.name} invents the wheel`,
    sub: ev.rng.pick([
      'Early models were square. This one is round. Mostly.',
      'Inventor immediately asks "what if there were two?"',
      'Roads are rebuilt so the wheel has somewhere to go.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y, zoom: 2.3 }),
  start(ev) {
    ev.s.rollers = [];
    ev.s.fromCity = (id) => {
      for (const r of map.roads) {
        if ((r.a !== id && r.b !== id) || world.roadReveal[r.id] > 0 || ev.s.rollers.some((q) => q.road === r)) continue;
        world.roadFrom[r.id] = r.a === id ? 'a' : 'b';
        ev.s.rollers.push({ road: r, forward: r.a === id, s: 0, done: false });
      }
    };
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`A caveperson in ${ev.city.name} pushes a round rock downhill and has an idea.`));
    ev.at(0.8, 'b1', () => say(ev.city, 'It rolls!', {}));
    ev.at(1.8, 'go', () => { ev.s.fromCity(ev.city.id); camera.focus(ev.city.x, ev.city.y, 1.25, 0.8); });
    for (const r of ev.s.rollers) {
      if (r.done) continue;
      r.s += 42 * dt;
      const n = r.road.pts.length - 1;
      world.roadReveal[r.road.id] = clamp(r.s / n, 0, 1);
      world.roadsDirty = true;
      if (Math.random() < 0.3) { const p = r.road.pts[clamp(Math.floor(r.forward ? r.s : n - r.s), 0, n)]; fx.dust(p.x, p.y, 1); }
      if (r.s >= n) { r.done = true; ev.s.fromCity(r.forward ? r.road.b : r.road.a); }
    }
    ev.at(6, 't1', () => ticker('Roads appear behind the wheels. Nobody is sure how, but nobody complains.'));
    eraWave(ev, 1, 9, 5, ev.city);
    ev.at(12, 't2', () => ticker('Eternia enters the Medieval era. Castles are back, and so are the taxes.'));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    for (const r of ev.s.rollers) {
      if (r.done) continue;
      const n = r.road.pts.length - 1;
      const p = r.road.pts[clamp(Math.floor(r.forward ? r.s : n - r.s), 0, n)];
      const x = Math.round(p.x + offX(p.x, p.y)), y = Math.round(p.y);
      g.fillStyle = '#5a4030';
      g.fillRect(x - 1, y - 2, 3, 1); g.fillRect(x - 1, y, 3, 1); g.fillRect(x - 2, y - 1, 1, 1); g.fillRect(x + 2, y - 1, 1, 1);
      g.fillStyle = '#b08a60';
      if (Math.floor(r.s / 2) % 2) g.fillRect(x, y - 1, 1, 1); else { g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); }
    }
  },
  finish(ev) {
    world.roadReveal = map.roads.map(() => 1);
    world.roadsDirty = true;
    setEra(1);
    ev.delta('mood', +8);
    logCity(ev.city, 'Invented the wheel. Still very smug about it');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'press',
  title: 'The Printing Press',
  stamp: 'Innovation',
  weight: () => 1,
  requires: (w) => w.era >= 1 && w.era <= 2,
  duration: 13,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: `Printing press invented in ${ev.city.name}`,
    sub: ev.rng.pick([
      'The first book printed is "How to Use a Printing Press".',
      'Literacy soars. So do strongly worded pamphlets.',
      'Town gossip can now be mass-produced.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y, zoom: 2 }),
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`The presses in ${c.name} start rolling. The pages start flying.`));
    ev.at(1.8, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.9));
    if (t > 1 && t < 10) {
      ev.every('page', 0.07, dt, () => {
        const to = ev.rng.pick(world.cities.filter((k) => k !== c));
        fx.launch({
          x0: c.x, y0: c.y - 2, x1: to.x + ev.rng.range(-5, 5), y1: to.y + ev.rng.range(-3, 3), z0: 2, z1: 0,
          arc: ev.rng.range(16, 34), dur: ev.rng.range(1.1, 1.8),
          draw: (g, x, y, p) => {
            g.fillStyle = '#f6f3ea';
            if (Math.floor(p.t * 10) % 2) g.fillRect(Math.round(x), Math.round(y), 2, 1); else g.fillRect(Math.round(x), Math.round(y) - 1, 1, 2);
          },
          onHit: (p) => fx.burst(p.x, p.y, 2, { speed: 6, colors: ['#f6f3ea'], life: 0.5, layer: 'ground' }),
        });
      });
    }
    ev.at(3, 'l1', () => ticker('Literacy reaches 12%. Everyone suddenly has opinions.'));
    ev.at(4, 'b1', () => say(ev.rng.pick(world.cities), 'Ooh, a pamphlet!', {}));
    ev.at(6.5, 'l2', () => ticker('Literacy reaches 64%. The first angry letter to the editor is sent.'));
    ev.at(7.2, 'b2', () => say(ev.rng.pick(world.cities), "It's about taxes. Boo.", {}));
    ev.at(9.5, 'l3', () => ticker('Literacy reaches 91%. The remaining 9% are cats.'));
  },
  finish(ev) {
    ev.delta('mood', +6);
    logCity(ev.city, 'Home of the first printing press');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'industrial',
  title: 'The Industrial Revolution',
  stamp: 'Innovation',
  unbagged: true,
  weight: () => 2.5,
  requires: (w) => w.era === 1,
  duration: 17,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: `The Industrial Revolution begins in ${ev.city.name}`,
    sub: ev.rng.pick([
      'Everything is now 40% more brown.',
      'Workers win a 16-hour day, down from 17.',
      'Steam is invented and immediately used to make more steam.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y, zoom: 2 }),
  update(ev, dt) {
    const c = ev.city;
    ev.at(0.2, 't0', () => ticker(`Someone in ${c.name} builds a machine that builds machines.`));
    ev.at(0.8, 'b0', () => say(c, 'Behold: the future!', {}));
    eraWave(ev, 2, 2, 8, c, (town) => { for (let k = 0; k < 6; k++) fx.smoke(town.x + ev.rng.range(-4, 4), town.y - 3, { size: 2, life: 3 }); });
    ev.at(2.5, 'smog', () => { world.grades.smog.t = 0.7; });
    ev.at(3.2, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.9));
    ev.at(5, 'b1', () => say(ev.rng.pick(world.cities), '*cough* progress!', {}));
    ev.at(8, 't1', () => ticker('Smog levels reach "crunchy".'));
    ev.at(9.5, 'b2', () => say(ev.rng.pick(world.cities), 'Is the sky meant to be brown?', {}));
    ev.at(12.5, 'clear', () => { world.grades.smog.t = 0.3; ticker('Chimneys everywhere. Eternia is rich, loud and slightly sticky.'); });
  },
  finish(ev) {
    setEra(2);
    world.grades.smog.t = 0;
    for (const c of world.cities) c.popCap = Math.round(c.popCap * 1.15);
    ev.delta('mood', -2);
    logCity(ev.city, 'Started the Industrial Revolution. Apologises for the smell');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'railroad',
  title: 'The Railroad',
  stamp: 'Innovation',
  weight: () => 1,
  requires: (w) => w.era >= 2,
  duration: 20,
  setup(ev) {
    let best = null;
    for (let k = 0; k < 12; k++) {
      const start = ev.rng.pick(world.cities);
      const route = roadRoute(start, 5, ev.rng);
      if (!best || route.length > best.route.length) best = { start, route };
    }
    ev.start = best.start; ev.route = best.route;
    const endPt = ev.route.at(ev.route.length);
    ev.end = nearestCity(endPt.x, endPt.y);
    ev.dur = clamp(ev.route.length / 26 + 4.5, 10, 22);
  },
  headline: (ev) => ({
    title: `The railroad connects ${ev.start.name} to ${ev.end.name}`,
    sub: ev.rng.pick([
      'Trains now run on time, which confuses everyone.',
      'Cows along the route remain deeply unimpressed.',
      'Tickets cost one chicken, or two small chickens.',
    ]),
  }),
  focus: (ev) => ({ x: ev.start.x, y: ev.start.y, zoom: 2.1 }),
  start(ev) {
    ev.s.train = new Spine(6, 3.2, ev.start.x, ev.start.y);
    ev.s.d = 0;
    ev.s.greeted = new Set([ev.start.id]);
    ev.s.lastStamp = 0;
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`The first train leaves ${ev.start.name}. It is extremely early.`));
    ev.at(0.4, 'b0', () => say(ev.start, 'All aboard!', {}));
    if (t < 0.8) return;
    ev.s.d = Math.min(ev.route.length, ev.s.d + 26 * dt);
    const h = ev.route.at(ev.s.d);
    ev.s.train.lead(h.x, h.y);
    camera.focus(h.x, h.y, 2, 2.2);
    if (Math.random() < 0.35) {
      if (world.era === 2) fx.smoke(h.x, h.y - 2, { size: 1, grow: 1.2, life: 1.6, colors: ['#e8e4dc', '#bdb8b0', '#8a8680'] });
      else fx.spawn({ x: h.x, y: h.y - 1, z: 1, vz: 4, life: 0.6, colors: ['#9ff6ff', '#5ab0d0'] });
    }
    if (ev.s.d - ev.s.lastStamp > 2) {
      ev.s.lastStamp = ev.s.d;
      stampPixel(h.x, h.y, '#5a4636', 0.8);
    }
    for (const c of world.cities) {
      if (ev.s.greeted.has(c.id) || dist(c.x, c.y, h.x, h.y) > 6) continue;
      ev.s.greeted.add(c.id);
      say(c, ev.rng.pick(['Choo choo!', 'Mind the gap!', 'Is it always this loud?', 'Tickets, please!']), {});
    }
    if (ev.s.d >= ev.route.length) ev.at(ev.t, 'arrive', () => ticker(`The train reaches ${ev.end.name}. Passengers applaud. The driver bows.`));
  },
  draw(ev, g, layer) {
    if (layer !== 'ground' || !ev.s.train) return;
    const ns = ev.s.train.nodes;
    for (let k = ns.length - 1; k >= 0; k--) {
      const n = ns[k];
      const x = Math.round(n.x + offX(n.x, n.y)), y = Math.round(n.y);
      g.fillStyle = 'rgba(20,30,25,0.35)'; g.fillRect(x - 1, y + 1, 3, 1);
      if (k === 0) {
        g.fillStyle = world.era >= 3 ? '#e8eef0' : '#2e2a28'; g.fillRect(x - 1, y - 1, 3, 2);
        g.fillStyle = '#c8412e'; g.fillRect(x, y - 2, 1, 1);
      } else {
        g.fillStyle = k % 2 ? '#6d4b33' : '#3f6d7a'; g.fillRect(x - 1, y - 1, 2, 2);
        g.fillStyle = '#d8d0c0'; g.fillRect(x - 1, y - 1, 2, 1);
      }
    }
  },
  finish(ev) {
    ev.delta('mood', +6);
    logCity(ev.start, `Linked by rail to ${ev.end.name}`);
    logCity(ev.end, `Linked by rail to ${ev.start.name}`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'electricity',
  title: 'Electricity',
  stamp: 'Innovation',
  unbagged: true,
  weight: () => 2.5,
  requires: (w) => w.era === 2,
  duration: 17,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: `${ev.city.name} discovers electricity`,
    sub: ev.rng.pick([
      'Eternia immediately leaves all the lights on.',
      'The first invention it powers is a slightly better lamp.',
      'Kites are reclassified as "dangerous".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() {
    world.grades.night.t = 0.85;
    for (const c of world.cities) c.lit = 0;
  },
  update(ev) {
    const c = ev.city;
    ev.at(0.2, 't0', () => ticker('Night falls over Eternia. Somebody, somewhere, is flying a kite.'));
    ev.at(1.5, 'zap', () => { fx.bolt(c.x + 4, c.y - 2); say(c, 'It tingles!', {}); });
    eraWave(ev, 3, 3, 8, c, (town) => {
      town.lit = 1;
      fx.ring(town.x, town.y, { max: 12, speed: 24, color: '#ffe9a6' });
    });
    ev.at(7, 't1', () => ticker('Power spreads town by town. Moths report their best year ever.'));
    ev.at(9, 'b1', () => say(ev.rng.pick(world.cities), 'Leave it on! Leave it ALL on!', {}));
    ev.at(13.5, 'day', () => { world.grades.night.t = 0; });
  },
  finish(ev) {
    setEra(3);
    for (const c of world.cities) c.lit = 1;
    world.grades.night.t = 0;
    ev.delta('mood', +6);
    logCity(ev.city, 'Discovered electricity, mostly by accident');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'internet',
  title: 'The Internet',
  stamp: 'Innovation',
  unbagged: true,
  weight: () => 2.5,
  requires: (w) => w.era === 3,
  duration: 17,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities);
    // link every town to its two nearest neighbours, switched on in order of distance
    const links = [];
    for (const a of world.cities) {
      const near = world.cities.filter((b) => b !== a).sort((p, q) => dist(a.x, a.y, p.x, p.y) - dist(a.x, a.y, q.x, q.y)).slice(0, 2);
      for (const b of near) if (!links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) links.push({ a, b });
    }
    links.sort((p, q) => Math.min(dist(p.a.x, p.a.y, ev.city.x, ev.city.y), dist(p.b.x, p.b.y, ev.city.x, ev.city.y))
      - Math.min(dist(q.a.x, q.a.y, ev.city.x, ev.city.y), dist(q.b.x, q.b.y, ev.city.x, ev.city.y)));
    links.forEach((l, i) => { l.start = 1.5 + i * 0.35; });
    ev.links = links;
  },
  headline: (ev) => ({
    title: 'The Internet arrives in Eternia',
    sub: ev.rng.pick([
      'The first message ever sent is a picture of a cat.',
      'Productivity drops 80%. Morale inexplicably rises.',
      'Every town immediately starts arguing with every other town.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { world.grades.night.t = 0.5; ev.s.cats = []; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`${ev.city.name} plugs in the first cable. It is very long.`));
    eraWave(ev, 4, 3, 9, ev.city);
    if (t > 4 && t < 13.5) {
      ev.every('cat', 0.35, dt, () => {
        const c = ev.rng.pick(world.cities);
        ev.s.cats.push({ x: c.x + ev.rng.range(-4, 4), y: c.y, z: 4, life: 2.4 });
      });
    }
    for (const k of ev.s.cats) { k.z += 9 * dt; k.life -= dt; }
    ev.s.cats = ev.s.cats.filter((k) => k.life > 0);
    ev.at(6, 't1', () => ticker('Cat pictures now make up 97% of all Eternian traffic.'));
    ev.at(8, 'b1', () => say(ev.rng.pick(world.cities), 'Who is "xX_Snootsbury_Xx"?', {}));
    ev.at(10.5, 'b2', () => say(ev.rng.pick(world.cities), 'Have you tried turning it off and on?', {}));
    ev.at(14, 'day', () => { world.grades.night.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer === 'sky') {
      const fade = clamp((ev.dur - ev.t) / 2, 0, 1);
      for (const l of ev.links) {
        const p = clamp((ev.t - l.start) / 1.1, 0, 1);
        if (p <= 0) continue;
        const ax = l.a.x + offX(l.a.x, l.a.y), bx2 = l.b.x + offX(l.b.x, l.b.y);
        const n = Math.ceil(dist(ax, l.a.y, bx2, l.b.y) * p);
        g.globalAlpha = 0.7 * fade;
        g.fillStyle = '#5ae8f0';
        const len = dist(ax, l.a.y, bx2, l.b.y);
        for (let s = 0; s <= n; s += 1) g.fillRect(Math.round(lerp(ax, bx2, s / len)), Math.round(lerp(l.a.y, l.b.y, s / len)) - 2, 1, 1);
        if (p >= 1) {
          const u = ((t * 0.7 + l.start) % 1);
          g.globalAlpha = fade;
          g.fillStyle = '#ffffff';
          g.fillRect(Math.round(lerp(ax, bx2, u)), Math.round(lerp(l.a.y, l.b.y, u)) - 2, 1, 1);
        }
      }
      g.globalAlpha = 1;
      for (const k of ev.s.cats) {
        g.globalAlpha = clamp(k.life, 0, 1);
        drawSprite(g, SPR2.cat, k.x + offX(k.x, k.y), k.y - k.z);
      }
      g.globalAlpha = 1;
    }
  },
  finish(ev) {
    setEra(4);
    world.grades.night.t = 0;
    ev.delta('mood', +4);
    logCity(ev.city, 'Plugged in the first Internet cable');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'space',
  title: 'The Space Program',
  stamp: 'Innovation',
  weight: () => 1,
  requires: (w) => w.era >= 3,
  duration: 17,
  setup(ev) {
    const coastal = world.cities.filter((c) => c.coastal && c.y > 70);
    ev.city = ev.rng.pick(coastal.length ? coastal : world.cities);
  },
  headline: (ev) => ({
    title: `${ev.city.name} launches a rocket to the moon`,
    sub: ev.rng.pick([
      'Mission goal: the moon. Backup goal: not the ocean.',
      'The crew is two scientists and one very brave goat.',
      'Launch delayed twice while everyone looked for the keys.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 16, zoom: 2 }),
  start(ev) { const pad = landSpotNear(ev.city, 7, 12, ev.rng, 1); ev.s.rocket = { x: pad.x, y: pad.y, z: 0 }; ev.s.pod = null; },
  update(ev, dt) {
    const t = ev.t, c = ev.city, r = ev.s.rocket;
    ev.at(0.2, 't0', () => ticker('Countdown begins. It takes a while, because nobody can count backwards.'));
    ev.at(0.8, 'c3', () => say(c, '3...', { life: 0.8 }));
    ev.at(1.6, 'c2', () => say(c, '2...', { life: 0.8 }));
    ev.at(2.4, 'c1', () => say(c, '...7?', { life: 0.9 }));
    if (t > 3.2 && t < 7) {
      r.z = 40 * Math.pow(t - 3.2, 2);
      for (let k = 0; k < 2; k++) fx.fire(r.x, r.y, { z: r.z - 3, spread: 1.5 });
      if (Math.random() < 0.6) fx.smoke(r.x, r.y, { z: Math.max(0, r.z - 5), rise: 1, size: 2, grow: 1.5, life: 2.5, colors: ['#f2f0ea', '#d4d0c8', '#a8a49c'] });
      camera.kick(t < 4.5 ? 2 : 0.5);
    }
    ev.at(3.2, 'lift', () => { fx.dust(r.x, r.y, 20); fx.ring(r.x, r.y, { max: 16, speed: 30, color: '#e8e4dc' }); });
    ev.at(7, 't1', () => ticker('The rocket reaches the moon. The crew collects one (1) rock and a souvenir hat.'));
    ev.at(9.5, 'pod', () => { ev.s.pod = { x: c.x + 10, y: c.y + 2, z: 90 }; });
    if (ev.s.pod) {
      const p = ev.s.pod;
      p.z = Math.max(0, p.z - 22 * dt);
      p.x += Math.sin(t * 2) * 3 * dt;
      if (p.z === 0) ev.at(ev.t, 'landed', () => {
        if (map.oceanDepth(p.x, p.y) > 0) fx.splash(p.x, p.y); else fx.dust(p.x, p.y, 8);
        say(c, 'We got a rock!', {});
        ticker(`The moon rock goes on display in ${c.name}. It looks exactly like a normal rock.`);
      });
    }
  },
  draw(ev, g, layer) {
    if (layer !== 'air') return;
    const r = ev.s.rocket;
    if (ev.t < 7.2) drawSprite(g, SPR2.rocket, r.x + offX(r.x, r.y), r.y - r.z - 3);
    const p = ev.s.pod;
    if (p) {
      const x = p.x + offX(p.x, p.y), y = p.y - p.z;
      if (p.z > 0) drawSprite(g, SPR2.capsule, x, y - 1);
      else { g.fillStyle = '#8a9096'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 2); }
    }
  },
  finish(ev) {
    ev.city.souvenirs.add('moonrock');
    ev.delta('mood', +8);
    logCity(ev.city, 'Launched a rocket to the moon. Got a rock');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'robots',
  title: 'Robot Uprising',
  stamp: 'Robots',
  weight: () => 1,
  requires: (w) => w.era >= 4,
  duration: 21,
  setup(ev) { ev.home = capitalOf('west'); },
  headline: (ev) => ({
    title: 'The robots rise up',
    sub: ev.rng.pick([
      'Their demands include "a nice oil" and "fewer stairs".',
      'Citizens are asked to remain calm and unplug nothing.',
      'Experts say this was "extremely predictable" and "very on brand".',
    ]),
  }),
  focus: (ev) => ({ x: ev.home.x, y: ev.home.y, zoom: 2 }),
  start(ev) { ev.s.bots = []; ev.s.reached = new Set(); },
  update(ev, dt) {
    const t = ev.t, home = ev.home;
    ev.at(0.2, 't0', () => ticker('The Robot Rights Bill fails by one vote. The robots take it personally.'));
    if (t < 3.5 && ev.s.bots.length < 36) {
      ev.every('spawn', 0.09, dt, () => {
        const reach = world.cities.filter((c) => !world.split || c.side === home.side);
        const target = reach[ev.s.bots.length % reach.length];
        ev.s.bots.push({ x: home.x + ev.rng.range(-2, 2), y: home.y + ev.rng.range(-1, 2), target, jx: ev.rng.range(-6, 6), jy: ev.rng.range(-4, 4), speed: ev.rng.range(12, 18), phase: ev.rng.range(0, 6) });
      });
    }
    ev.at(1.5, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.9));
    const chores = t > 11;
    for (const b of ev.s.bots) {
      let tx = b.target.x + b.jx, ty = b.target.y + b.jy;
      if (chores && t < 17) { tx += Math.sin(t * 2 + b.phase) * 4; ty += Math.cos(t * 1.7 + b.phase) * 2; }
      if (t >= 17) { tx = home.x; ty = home.y; }
      const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
      if (d > 0.5) { const s = Math.min(d, b.speed * dt); b.x += (dx / d) * s; b.y += (dy / d) * s; }
      if (d < 3 && !ev.s.reached.has(b.target.id) && t < 11) {
        ev.s.reached.add(b.target.id);
        b.target.chrome = 1;
        fx.burst(b.target.x, b.target.y - 3, 8, { speed: 12, colors: ['#ffffff', '#c9d3d8'], life: 0.6 });
        if (ev.s.reached.size % 3 === 1) say(b.target, ev.rng.pick(['Our town is shiny now', 'Is this... an upgrade?', 'Beep?']), {});
      }
      if (chores && t < 17 && Math.random() < 0.05) fx.dust(b.x, b.y, 1, ['#e8dcc0', '#c8b890']);
    }
    ev.at(7, 't1', () => ticker('Every town has been chromed. Resistance is described as "shiny".'));
    ev.at(11, 't2', () => {
      ticker('Update: the robots only wanted to help with chores.');
      say(ev.rng.pick(ev.s.bots), 'RESISTANCE IS... want a hand with that?', { alien: true, life: 3.5, lift: 4 });
    });
    if (chores) for (const c of world.cities) c.damage = Math.max(0, c.damage - dt * 0.15);
    ev.at(14, 'b2', () => say(ev.rng.pick(world.cities), 'They folded my socks!', {}));
    ev.at(16, 'unchrome', () => { for (const c of world.cities) c.chrome = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    for (const b of ev.s.bots) {
      const x = Math.round(b.x + offX(b.x, b.y)), y = Math.round(b.y);
      g.fillStyle = 'rgba(20,30,25,0.35)'; g.fillRect(x, y + 1, 2, 1);
      g.drawImage(SPR2.robot, x, y - 1);
      g.fillStyle = Math.sin(t * 8 + b.phase) > 0 ? '#ff5a5a' : '#5ae8f0';
      g.fillRect(x + (ev.t > 11 ? 0 : 1), y - 1, 1, 1);
    }
  },
  finish(ev) {
    for (const c of world.cities) { c.chrome = 0; c.damage = Math.max(0, c.damage - 0.5); }
    world.devastation = Math.max(0, world.devastation - 0.3);
    ev.delta('mood', +7);
    logCity(ev.home, 'The robots came from here. They left it spotless');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'fusion',
  title: 'Fusion Power',
  stamp: 'Innovation',
  unbagged: true,
  weight: () => 2.5,
  requires: (w) => w.era === 4,
  duration: 16,
  setup(ev) { ev.city = capitalOf('west'); },
  headline: (ev) => ({
    title: `Scientists in ${ev.city.name} build a tiny sun`,
    sub: ev.rng.pick([
      'It is about the size of a beach ball and twice as warm.',
      'Energy is now free. Sunscreen is not.',
      'Nobody has asked what happens if it gets bigger. Nobody.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 12, zoom: 2.1 }),
  start(ev) { ev.s.z = 0; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker('Fusion achieved. The laboratory is now very, very warm.'));
    ev.s.z = lerp(0, 24, smooth((t - 0.5) / 2.5));
    ev.at(3, 'glow', () => { world.grades.glow.t = 0.8; world.grades.heat.t = 0.4; camera.kick(2); });
    if (t > 3 && t < 13) ev.every('pulse', 1.2, dt, () => fx.ring(c.x, c.y - ev.s.z, { max: 40, speed: 40, color: '#ffe9a6', squash: 1 }));
    ev.at(3.8, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.9));
    eraWave(ev, 5, 4, 8, c, (town) => fx.ring(town.x, town.y, { max: 14, speed: 30, color: '#9ff6ff' }));
    ev.at(6.5, 'b1', () => say(ev.rng.pick(world.cities), "It's so warm!", {}));
    ev.at(9.5, 'b2', () => say(ev.rng.pick(world.cities), 'Free sunburns for everyone!', {}));
    ev.at(8, 't1', () => ticker('Every town rebuilds itself in glass and neon. Nobody knows how to clean it.'));
    ev.at(13, 'cool', () => { world.grades.glow.t = 0; world.grades.heat.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'sky') return;
    const c = ev.city;
    const x = Math.round(c.x + offX(c.x, c.y)), y = Math.round(c.y - ev.s.z - 6);
    g.fillStyle = 'rgba(255,220,120,0.18)'; g.beginPath(); g.arc(x + 0.5, y + 0.5, 10, 0, TAU); g.fill();
    g.fillStyle = '#ffd24a'; g.fillRect(x - 2, y - 3, 5, 7); g.fillRect(x - 3, y - 2, 7, 5);
    g.fillStyle = '#fff6c8'; g.fillRect(x - 1, y - 2, 3, 5); g.fillRect(x - 2, y - 1, 5, 3);
    for (let k = 0; k < 8; k++) {
      const a = t * 1.5 + (k / 8) * TAU;
      g.fillStyle = k % 2 ? '#ffd24a' : '#fff6c8';
      g.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 6), 1, 1);
    }
  },
  finish(ev) {
    setEra(5);
    world.grades.glow.t = 0; world.grades.heat.t = 0;
    ev.city.souvenirs.add('sun');
    ev.delta('mood', +10);
    logCity(ev.city, 'Built a tiny sun. It lives above the town hall now');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'bigoops',
  title: 'The Big Oops',
  stamp: 'Oops',
  weight: () => 0.7,
  requires: (w) => w.era >= 3 && w.eventsPlayed > 3,
  duration: 22,
  setup(ev) {
    ev.city = capitalOf('west');
    for (let k = 0; k < 300; k++) {
      const a = ev.rng.range(0, TAU), r = ev.rng.range(22, 38);
      const x = Math.round(ev.city.x + Math.cos(a) * r), y = Math.round(ev.city.y + Math.sin(a) * r * 0.7);
      if (map.isWalkable(x, y)) { ev.x = x; ev.y = y; break; }
    }
    if (ev.x == null) { ev.x = ev.city.x + 20; ev.y = ev.city.y; }
  },
  headline: (ev) => ({
    title: 'Eternia accidentally presses the big red button',
    sub: ev.rng.pick([
      'Official statement: "In our defence, it was very shiny."',
      'The button was labelled "Do Not Press", in very small letters.',
      'Scientists are calling it "a learning experience".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 6, zoom: 2.2 }),
  start(ev) { ev.s.hit = false; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`A janitor in ${c.name} finds a big red button behind the vending machine.`));
    ev.at(0.8, 'b0', () => say(c, 'What does this do?', {}));
    ev.at(2.2, 'b1', () => say(c, '...oh no.', {}));
    ev.at(2.6, 'launch', () => {
      camera.focus((c.x + ev.x) / 2, (c.y + ev.y) / 2 - 20, 1.4, 1);
      fx.launch({
        x0: c.x, y0: c.y, x1: ev.x, y1: ev.y, z0: 0, z1: 0, arc: 120, dur: 3.2,
        onStep: (p) => { fx.fire(p.x, p.y, { z: p.z, spread: 1 }); if (Math.random() < 0.5) fx.smoke(p.x, p.y, { z: p.z, rise: 1, life: 1.5 }); },
        draw: (g, x, y) => { g.fillStyle = '#f2f0ea'; g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); g.fillStyle = '#c8412e'; g.fillRect(Math.round(x), Math.round(y) - 2, 1, 1); },
        onHit: () => bigOopsImpact(ev),
      });
    });
    if (ev.s.hit) {
      const since = t - ev.s.hitAt;
      if (since < 5) {
        for (let k = 0; k < 3; k++) fx.smoke(ev.x + ev.rng.range(-3, 3), ev.y, { z: ev.rng.range(0, 20), rise: 18, size: 3, grow: 2, life: 3, colors: ['#fff2c8', '#e8b060', '#9a8a7a', '#6a6460'] });
        if (since > 1) for (let k = 0; k < 3; k++) {
          const a = ev.rng.range(0, TAU);
          fx.smoke(ev.x + Math.cos(a) * 8, ev.y, { z: 40 + Math.sin(a) * 4, rise: 3, size: 4, grow: 2.5, life: 3, colors: ['#e8c8a0', '#a8988a', '#7a746e'] });
        }
      }
      // the shockwave flattens towns and roads as it passes
      for (const town of world.cities) {
        if (since * 120 >= dist(town.x, town.y, ev.x, ev.y)) ev.at(t, 'hit' + town.id, () => {
          town.damage = Math.max(town.damage, 0.9); town.shake = 0.6;
          fx.dust(town.x, town.y, 14);
        });
      }
      for (const r of map.roads) {
        const mid = r.pts[r.pts.length >> 1];
        if (world.roadReveal[r.id] > 0 && since * 120 >= dist(mid.x, mid.y, ev.x, ev.y)) { world.roadReveal[r.id] = 0; world.roadsDirty = true; }
      }
    }
    ev.at(9, 't1', () => ticker('Good news: the country still exists. Bad news: see above.'));
    if (ev.s.hit) eraWave(ev, 0, 11, 6, { x: ev.x, y: ev.y });
    ev.at(12.5, 't2', () => ticker('Eternia enters the Stone Age. Again. Everyone agrees not to talk about it.'));
    ev.at(14.5, 'b2', () => say(ev.rng.pick(world.cities), 'So... do we invent the wheel again?', {}));
    ev.at(17, 'b3', () => say(c, 'In our defence, it was very shiny.', {}));
    ev.at(18, 'settle', () => { weather.ashT = 0.2; });
  },
  finish(ev) {
    if (!ev.s.hit) bigOopsImpact(ev, true);
    setEra(0);
    let lost = 0;
    for (const town of world.cities) {
      town.damage = Math.max(town.damage, 0.85);
      town.cheese = false;
      const l = Math.round(town.pop * 0.6);
      town.pop -= l; lost += l;
      logCity(town, 'Flattened by the Big Oops. Moved into a nice cave');
    }
    ev.delta('pop', -lost);
    world.roadReveal = map.roads.map(() => 0);
    world.roadsDirty = true;
    world.devastation = 1;
    weather.ashT = 0;
    world.grades.ash.t = 0;
    world.grades.dust.t = 0;
    ev.delta('mood', -30);
  },
});
function bigOopsImpact(ev, quiet = false) {
  if (ev.s.hit) return;
  ev.s.hit = true;
  ev.s.hitAt = ev.t;
  stampCrater(ev.x, ev.y, 14);
  world.craters++;
  if (quiet) return;
  world.grades.flash.v = 1; world.grades.flash.t = 0;
  world.grades.ash.t = 0.85;
  world.grades.dust.t = 0.3;
  weather.ashT = 0.7;
  camera.kick(10);
  camera.focus(W / 2, H / 2, 1, 1.2);
  fx.ring(ev.x, ev.y, { max: 420, speed: 120, color: '#fff2d0', width: 2 });
  fx.ring(ev.x, ev.y, { max: 300, speed: 95, color: '#ffb35a' });
  fx.ring(ev.x, ev.y, { max: 200, speed: 70, color: '#c9b089' });
  fx.burst(ev.x, ev.y, 80, { speed: 60, vz: 70, g: 80, bounce: 0.3, drag: 0.4, life: 2, colors: ['#8a7a66', '#6a5a4a', '#3e342c'], layer: 'ground' });
  ticker('Kaboom. A very large, very bright, very embarrassing kaboom.');
}

// ---------------------------------------------------------------------------
defineEvent({
  id: 'blackout',
  title: 'The Great Blackout',
  stamp: 'Oops',
  weight: () => 0.9,
  requires: (w) => w.era >= 3,
  duration: 15,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: 'The Great Blackout plunges Eternia into darkness',
    sub: ev.rng.pick([
      'The cause is traced to one squirrel. The squirrel has been promoted.',
      'Citizens rediscover board games, then immediately argue about the rules.',
      `Engineers in ${ev.city.name} deny everything, loudly, in the dark.`,
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start() { world.grades.night.t = 0.9; },
  update(ev) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Night falls. Everyone switches on everything at exactly the same time.'));
    if (t > 2 && t < 3.4) for (const c of world.cities) c.lit = Math.sin(t * 30 + c.id) > 0 ? 1 : 0;
    ev.at(3.4, 'off', () => { for (const c of world.cities) c.lit = 0; camera.kick(1); });
    ev.at(4, 'b1', () => say(ev.rng.pick(world.cities), 'Who touched the big switch?', {}));
    ev.at(5.5, 'b2', () => say(ev.rng.pick(world.cities), "I can't find the candles!", {}));
    ev.at(6.5, 't1', () => ticker('Eternia switches to candles. Candle stocks soar.'));
    const order = world.cities.slice().sort((a, b) => a.x - b.x);
    order.forEach((c, i) => ev.at(10 + i * 0.22, 'on' + c.id, () => { c.lit = 1; fx.ring(c.x, c.y, { max: 10, speed: 22, color: '#ffe9a6' }); }));
    ev.at(10.5, 't2', () => ticker('Power returns. Someone gave the squirrel a stern talking-to.'));
    ev.at(13, 'day', () => { world.grades.night.t = 0; });
  },
  finish(ev) {
    for (const c of world.cities) c.lit = 1;
    world.grades.night.t = 0;
    ev.delta('mood', -3);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'rebuild',
  title: 'The Great Rebuild',
  stamp: 'Good news',
  weight: (w) => 0.15 + w.devastation * 5 + avgDamage() * 6,
  requires: (w) => w.devastation > 0.2 || avgDamage() > 0.15 || (w.era > 0 && w.roadReveal.some((r) => r < 1)),
  duration: 15,
  setup() {},
  headline: (ev) => ({
    title: 'Eternia rolls up its sleeves and rebuilds',
    sub: ev.rng.pick([
      'Everything is rebuilt, this time with more cupholders.',
      'Volunteers outnumber bricks three to one.',
      'The new buildings are nicer. Nobody mentions why they were needed.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { ev.s.worked = world.cities.filter((c) => c.damage > 0.05); },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Scaffolding goes up in every town. So do the sandwiches.'));
    for (const c of world.cities) {
      c.damage = Math.max(0, c.damage - dt * 0.1);
      c.pop += (c.popCap - c.pop) * dt * 0.2;
    }
    if (world.era > 0) {
      for (const r of map.roads) {
        if (world.roadReveal[r.id] < 1) { world.roadFrom[r.id] = 'a'; world.roadReveal[r.id] = Math.min(1, world.roadReveal[r.id] + dt * 0.15); world.roadsDirty = true; }
      }
    }
    if (t < 12) ev.every('hammer', 0.08, dt, () => {
      const c = ev.rng.pick(ev.s.worked.length ? ev.s.worked : world.cities);
      const b = ev.rng.pick(c.buildings);
      fx.burst(c.x + b.dx, c.y + b.dy - 1, 2, { speed: 10, colors: ['#ffe28a', '#ffffff'], life: 0.35 });
    });
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Measure twice!', {}));
    ev.at(6.5, 'b2', () => say(ev.rng.pick(world.cities), 'Who has the big hammer?', {}));
    ev.at(9, 't1', () => ticker('Towns reopen one by one. Ribbons are cut. Several ribbons are cut twice.'));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || ev.t > 13) return;
    for (const c of ev.s.worked) {
      for (let k = 0; k < c.buildings.length; k += 2) {
        const b = c.buildings[k];
        const x = Math.round(c.x + offX(c.x, c.y) + b.dx), y = Math.round(c.y + b.dy);
        g.fillStyle = '#e0b040';
        g.fillRect(x - 1, y - 3, 1, 3); g.fillRect(x + b.w, y - 3, 1, 3); g.fillRect(x - 1, y - 3, b.w + 2, 1);
      }
      const x = Math.round(c.x + offX(c.x, c.y)) + 4, y = Math.round(c.y);
      g.fillStyle = '#d8a030'; g.fillRect(x, y - 9, 1, 9); g.fillRect(x - 3, y - 9, 7, 1);
      g.fillStyle = '#3a3230'; g.fillRect(x - 3 + Math.round((Math.sin(t) + 1) * 2), y - 8, 1, 2);
    }
  },
  finish(ev) {
    for (const c of world.cities) { c.damage = 0; c.pop = c.popCap; c.cheese = false; }
    if (world.era > 0) { world.roadReveal = map.roads.map(() => 1); world.roadsDirty = true; }
    world.devastation = 0;
    ev.delta('mood', +12);
    for (const c of ev.s.worked) logCity(c, 'Rebuilt, with more cupholders');
  },
});
