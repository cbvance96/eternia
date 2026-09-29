// ============================================================================
// 07g EVENTS, BATCH 3b — sci-fi and the supernatural. Several of these bend
// the rendering itself: inverted colours, torn pixels, a mirrored map.
// ============================================================================

// ---------------------------------------------------------------------------
defineEvent({
  id: 'directions',
  title: 'Aliens Ask for Directions',
  stamp: 'Unexplained',
  weight: () => 0.9,
  requires: () => true,
  duration: 16,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities.filter((c) => c.y > 70));
    ev.spot = { x: ev.city.x + 14, y: ev.city.y + 4 };
    for (let k = 0; k < 60; k++) {
      const a = ev.rng.range(0, TAU);
      const x = Math.round(ev.city.x + Math.cos(a) * 14), y = Math.round(ev.city.y + Math.sin(a) * 9);
      if (map.isWalkable(x, y)) { ev.spot = { x, y }; break; }
    }
    ev.dest = ev.rng.pick(['Andromeda', 'the Crab Nebula', 'Planet Gloop', 'the nearest petrol station', 'Space Swindon']);
  },
  headline: (ev) => ({
    title: `A UFO lands in ${ev.city.name} to ask for directions`,
    sub: ev.rng.pick([
      'Their satnav has apparently been "recalculating" for four hundred years.',
      'Residents are relieved it is not another invasion.',
      'The aliens are polite, lost, and slightly embarrassed.',
    ]),
  }),
  focus: (ev) => ({ x: (ev.spot.x + ev.city.x) / 2, y: ev.city.y - 8, zoom: 2.8 }),
  start(ev) {
    ev.s.ufo = { x: ev.spot.x, y: ev.spot.y, z: 70 };
    ev.s.crew = new Crowd();
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city, u = ev.s.ufo;
    ev.at(0.2, 't0', () => ticker(`A small UFO wobbles down near ${c.name}, very carefully, like a learner driver.`));
    if (t < 3) u.z = lerp(70, 3, smooth(t / 3));
    ev.at(3.2, 'out', () => { ev.s.alien = ev.s.crew.add({ kind: 'alien', x: u.x, y: u.y, tx: c.x + 3, ty: c.y + 3, speed: 8 }); });
    ev.s.crew.update(dt);
    ev.at(5.5, 'q', () => say(ev.s.alien, `Excuse me. Which way to ${ev.dest}?`, { alien: true, life: 2.8 }));
    ev.at(8, 'a', () => say(c, 'Left at the Moon. You can\'t miss it.', { life: 2.5 }));
    ev.at(10.2, 'thx', () => { say(ev.s.alien, 'Thank you!', { alien: true, life: 1.5 }); ev.s.alien.tx = u.x; ev.s.alien.ty = u.y; });
    ev.at(12, 'board', () => { ev.s.alien.gone = true; });
    if (t > 12) {
      const k = t - 12;
      u.z = 3 + k * 16;
      u.x = ev.spot.x + (k < 1.5 ? k * 30 : 45 - (k - 1.5) * 90);
    }
    ev.at(13.5, 't1', () => ticker('The UFO flies off in the wrong direction, stops, then goes the other way.'));
  },
  draw(ev, g, layer) {
    const u = ev.s.ufo;
    if (layer === 'ground') { ev.s.crew.draw(g, ev.t); g.fillStyle = 'rgba(20,30,25,0.25)'; g.fillRect(Math.round(u.x + offX(u.x, u.y)) - 4, Math.round(u.y) + 1, 9, 1); }
    if (layer === 'air') drawSprite(g, SPRITES.saucer, u.x + offX(u.x, u.y), u.y - u.z - 2);
  },
  finish(ev) { ev.delta('mood', +3); logCity(ev.city, `Gave aliens directions to ${ev.dest}`); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'zombies',
  title: 'Cartoon Zombie Outbreak',
  stamp: 'Unexplained',
  weight: () => 0.9,
  requires: () => true,
  duration: 21,
  setup(ev) {
    ev.cap = capitalOf('west');
    ev.zero = ev.rng.pick(world.cities.filter((c) => c !== ev.cap));
  },
  headline: (ev) => ({
    title: `Zombie outbreak begins in ${ev.zero.name}`,
    sub: ev.rng.pick([
      'Symptoms include groaning, shuffling, and an intense need for brunch.',
      'The zombies are described as "very slow" and "honestly quite polite".',
      'Doctors suspect a bad batch of decaf.',
    ]),
  }),
  focus: (ev) => ({ x: ev.zero.x, y: ev.zero.y, zoom: 2 }),
  start(ev) {
    ev.s.hordes = new Crowd();
    ev.zero.zombie = 1;
    ev.s.infected = new Set([ev.zero.id]);
  },
  update(ev, dt) {
    const t = ev.t, hordes = ev.s.hordes;
    ev.at(0.2, 't0', () => ticker(`Something is wrong in ${ev.zero.name}. Everyone is groaning. Even more than usual.`));
    ev.at(1, 'b0', () => say(ev.zero, 'Braaains... or toast. Toast is fine.', {}));
    ev.at(2.5, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.8));
    if (t > 2 && t < 11) ev.every('spread', 1.1, dt, () => {
      const from = world.cities.find((c) => ev.s.infected.has(c.id) && ev.rng.chance(0.6)) || ev.zero;
      const next = world.cities.filter((c) => !ev.s.infected.has(c.id) && c !== ev.cap && (!world.split || c.side === from.side)).sort((a, b) => dist(a.x, a.y, from.x, from.y) - dist(b.x, b.y, from.x, from.y))[0];
      if (!next) return;
      for (let k = 0; k < 5; k++) hordes.add({ x: from.x, y: from.y, tx: next.x, ty: next.y, ...spreadAround(0, 0, 4), speed: ev.rng.range(9, 13), color: '#5a8a3a', head: '#9ac87a', target: next });
    });
    for (const z of hordes.list) {
      if (z.gone || !z.target || !hordes.arrived(z)) continue;
      if (!ev.s.infected.has(z.target.id)) {
        ev.s.infected.add(z.target.id); z.target.zombie = 1;
        fx.burst(z.target.x, z.target.y - 3, 8, { speed: 10, colors: ['#9ac87a', '#5a8a3a'], life: 0.8 });
        if (ev.s.infected.size === 4) say(z.target, 'Mmmrrrgh', {});
      }
      hordes.vanish(z);
    }
    hordes.update(dt);
    ev.at(6, 't1', () => ticker('The zombies spread town to town at roughly walking pace, because that is how they travel.'));
    ev.at(11, 'coffee', () => { ticker(`${ev.cap.name} discovers the cure: strong coffee. Lots of it.`); say(ev.cap, 'Fire the coffee!', {}); });
    if (t > 11.5 && t < 16) ev.every('cup', 0.35, dt, () => {
      const target = world.cities.find((c) => c.zombie > 0.5 && !c._cup);
      if (!target) return;
      target._cup = true;
      fx.launch({
        x0: ev.cap.x, y0: ev.cap.y, x1: target.x, y1: target.y, z0: 2, z1: 2, arc: 40, dur: 1.4,
        draw: (g, x, y) => { g.fillStyle = '#f2eee2'; g.fillRect(Math.round(x), Math.round(y) - 1, 2, 2); g.fillStyle = '#6a3a1e'; g.fillRect(Math.round(x), Math.round(y) - 1, 2, 1); },
        onHit: () => {
          target.zombie = 0; delete target._cup;
          fx.burst(target.x, target.y - 3, 10, { speed: 12, colors: ['#ffe9a6', '#a0602a'], life: 0.8 });
          say(target, ev.rng.pick(['Good morning!', 'What happened?', 'Why am I holding a rake?', 'Is it Monday?']), { life: 1.8 });
        },
      });
    });
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.hordes.draw(g, t); },
  finish(ev) {
    for (const c of world.cities) { c.zombie = 0; delete c._cup; }
    ev.delta('mood', -4);
    logCity(ev.zero, 'Patient zero of the Great Zombie Outbreak. Now drinks only coffee');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'timetravel',
  title: 'The Time Traveller',
  stamp: 'Unexplained',
  weight: (w) => (w.chronicle.length > 3 ? 0.9 : 0),
  requires: (w) => w.chronicle.length > 3,
  duration: 16,
  setup(ev) {
    ev.city = capitalOf('west');
    ev.prev = world.chronicle[1] || world.chronicle[0];
    ev.spot = landSpotNear(ev.city, 8, 12, ev.rng, 1);
  },
  headline: (ev) => ({
    title: `A time traveller appears in ${ev.city.name}`,
    sub: ev.rng.pick([
      'She is from the future and would like everyone to stop making it weird.',
      'He claims to be from next Tuesday. Next Tuesday is apparently "fine".',
      'The time machine is a phone box. Of course it is.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x - 4, y: ev.spot.y - 8, zoom: 2.8 }),
  start(ev) { ev.s.day0 = world.day; ev.s.booth = 0; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`A blue box appears out of nowhere in ${c.name}. It is making a wheezing noise.`));
    ev.s.booth = t < 2 ? (Math.sin(t * 20) > 0 ? t / 2 : 0.2) : t > 13 ? Math.max(0, (Math.sin(t * 20) > 0 ? 1 : 0.3) * (15 - t) / 2) : 1;
    ev.at(2.5, 'q', () => say({ x: ev.spot.x, y: ev.spot.y - 4 }, 'What year is it?', { life: 2 }));
    ev.at(4.2, 'a', () => say(c, `Year ${year()}.`, { life: 1.6 }));
    ev.at(5.6, 'oops', () => say({ x: ev.spot.x, y: ev.spot.y - 4 }, 'Oh no. Rewind!', { life: 1.6 }));
    // rewind: the calendar runs backwards and the clouds reverse
    if (t > 6.5 && t < 9.5) {
      world.timeDir = -6;
      world.day = ev.s.day0 - smooth((t - 6.5) / 3) * 365 * 40;
      ev.at(6.6, 'rw', () => { ticker(`Rewinding... "${ev.prev.title}"... rewinding...`); camera.focus(W / 2, H / 2, 1.05, 1.5); });
    } else if (t > 9.5 && t < 12) {
      world.timeDir = 8;
      world.day = ev.s.day0 - 365 * 40 + smooth((t - 9.5) / 2.5) * 365 * 40.3;
      ev.at(9.6, 'ff', () => ticker('Fast-forwarding back to the present. Everyone feels slightly seasick.'));
    } else if (t >= 12) {
      world.timeDir = 1;
      world.day = Math.max(world.day, ev.s.day0 + 110);
    }
    ev.at(12.5, 'bye', () => { camera.focus(ev.spot.x - 4, ev.spot.y - 8, 2.4, 1.5); say({ x: ev.spot.x, y: ev.spot.y - 4 }, 'Sorry! Wrong century!', { life: 2 }); });
  },
  draw(ev, g, layer, t) {
    if (layer === 'ground' && ev.s.booth > 0) {
      const x = Math.round(ev.spot.x + offX(ev.spot.x, ev.spot.y)), y = Math.round(ev.spot.y);
      g.globalAlpha = ev.s.booth;
      g.fillStyle = '#1f3f8a'; g.fillRect(x - 1, y - 6, 3, 6);
      g.fillStyle = '#9ad0ff'; g.fillRect(x, y - 5, 1, 1);
      g.fillStyle = Math.sin(t * 8) > 0 ? '#ffffff' : '#9ad0ff'; g.fillRect(x, y - 7, 1, 1);
      g.globalAlpha = 1;
    }
    if (layer === 'sky' && ((ev.t > 6.5 && ev.t < 12))) {
      // a VHS look: scanlines, a colour cast and a tracking band
      g.fillStyle = 'rgba(255,220,180,0.10)'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
      const band = Math.floor((t * 90) % (H + 20)) - 10;
      g.drawImage(R.buf, 0, band, W, 8, 4, band, W, 8);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, band, W, 2);
    }
  },
  finish(ev) {
    world.timeDir = 1;
    world.day = Math.max(world.day, ev.s.day0 + 110);
    ev.delta('mood', +1);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'portal',
  title: 'The Portal',
  stamp: 'Unexplained',
  weight: () => 0.9,
  requires: () => true,
  duration: 16,
  setup(ev) {
    const ci = randomLandCell(ev.rng, (x) => cells.biome[x] === BIOME.PLAINS && world.cities.every((c) => dist(c.x, c.y, cellX(x), cellY(x)) > 16) && cells.coast[x] > 10);
    ev.x = ci >= 0 ? cellX(ci) : W / 2; ev.y = ci >= 0 ? cellY(ci) : H / 2;
    ev.near = nearestCity(ev.x, ev.y);
  },
  headline: (ev) => ({
    title: `A portal opens in a field near ${ev.near.name}`,
    sub: ev.rng.pick([
      'Scientists say it leads to "somewhere with an awful lot of ducks".',
      'Everything near the portal is now the wrong colour. Nobody minds.',
      'A farmer is refusing to move his cows. The cows are refusing to move him.',
    ]),
  }),
  focus: (ev) => ({ x: ev.x, y: ev.y - 4, zoom: 2.4 }),
  start(ev) { ev.s.r = 0; ev.s.inv = 0; ev.s.ducks = new Crowd(); },
  update(ev, dt) {
    const t = ev.t, ducks = ev.s.ducks;
    ev.at(0.2, 't0', () => ticker('The air in a field starts to swirl. Then it starts to glow. Then it starts to quack.'));
    ev.s.r = t < 2 ? t * 4 : t > 13.5 ? Math.max(0, (15 - t) * 5) : 8;
    ev.s.inv = t < 3 ? 0 : t < 5 ? (t - 3) * 18 : t < 11 ? 36 + Math.sin(t * 2) * 4 : Math.max(0, 36 - (t - 11) * 16);
    ev.at(4.5, 'flash', () => { ev.s.flash = 0.35; camera.kick(3); });
    if (ev.s.flash) ev.s.flash = Math.max(0, ev.s.flash - dt);
    if (t > 4 && t < 9) ev.every('duck', 0.2, dt, () => {
      const a = ev.rng.range(0, TAU);
      ducks.add({ kind: 'duck', x: ev.x, y: ev.y, tx: ev.x + Math.cos(a) * ev.rng.range(8, 22), ty: ev.y + Math.sin(a) * ev.rng.range(5, 14), speed: ev.rng.range(8, 14) });
    });
    ducks.update(dt);
    ev.at(5.5, 'b1', () => say(ev.near, 'Is that a hole in the sky?', {}));
    ev.at(7, 'b2', () => say(ev.near, 'DUCKS?!', {}));
    ev.at(10, 'suck', () => { ducks.send((d) => { d.tx = ev.x; d.ty = ev.y; d.speed = 16; }); ticker('The portal calls its ducks home. They go, reluctantly.'); });
    for (const d of ducks.list) if (t > 10 && ducks.arrived(d)) d.gone = true;
  },
  draw(ev, g, layer, t) {
    const x = ev.x + offX(ev.x, ev.y), y = ev.y;
    if (layer === 'ground') {
      ev.s.ducks.draw(g, t);
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU + t * 3, r = ev.s.r * (0.7 + 0.3 * Math.sin(k + t * 5));
        g.fillStyle = k % 2 ? '#c86aff' : '#5ae8f0';
        g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 1, 1);
      }
      if (ev.s.r > 2) { g.fillStyle = '#1b0a2a'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 2); }
    }
    if (layer === 'sky' && (ev.s.inv > 0.5 || ev.s.flash > 0)) {
      g.save();
      g.globalCompositeOperation = 'difference';
      g.fillStyle = '#ffffff';
      if (ev.s.flash > 0) g.fillRect(0, 0, W, H);
      else { g.beginPath(); g.ellipse(x, y, ev.s.inv, ev.s.inv * 0.7, 0, 0, TAU); g.fill(); }
      g.restore();
    }
  },
  finish(ev) { ev.delta('mood', +2); logCity(ev.near, 'A portal opened nearby. Ducks were involved'); },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'ghosttown',
  title: 'Ghost Town',
  stamp: 'Unexplained',
  weight: () => 0.9,
  requires: () => true,
  duration: 15,
  setup(ev) { ev.city = ev.rng.pick(world.cities.filter((c) => !c.capital)); },
  headline: (ev) => ({
    title: `${ev.city.name} turns into a ghost town`,
    sub: ev.rng.pick([
      'Literally. You can see straight through it.',
      'Residents say it is "quite relaxing" and "a bit draughty".',
      'Ghost hunters arrive, get scared, and leave.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 6, zoom: 2.8 }),
  start(ev) {
    world.grades.dusk.t = 0.35;
    ev.s.ghosts = [0, 1, 2, 3, 4].map((k) => ({ a: k * 1.3, r: 8 + k * 2, p: k }));
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`${c.name} starts going see-through. The mayor says it "happens sometimes".`));
    c.alpha = t < 2 ? 1 - t * 0.33 : t > 11 ? Math.min(1, 0.34 + (t - 11) * 0.4) : 0.34;
    for (const gh of ev.s.ghosts) gh.a += dt * 1.1;
    ev.at(3, 'boo', () => say({ x: c.x + 8, y: c.y - 6 }, 'Boo!', { life: 1.6 }));
    ev.at(5, 'b1', () => say(c, "We're not scary. We're just see-through.", {}));
    ev.at(7.5, 't1', () => ticker('The ghosts turn out to be very pale tourists who took a wrong turn.'));
    ev.at(9, 'b2', () => say({ x: c.x - 8, y: c.y - 6 }, 'Is there a gift shop?', { life: 2 }));
    ev.at(11, 'solid', () => { world.grades.dusk.t = 0; });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'air' || ev.t > 12) return;
    const c = ev.city;
    for (const gh of ev.s.ghosts) {
      const x = c.x + offX(c.x, c.y) + Math.cos(gh.a) * gh.r * 1.4, y = c.y - 6 + Math.sin(gh.a) * gh.r * 0.5 + Math.sin(t * 3 + gh.p) * 2;
      g.globalAlpha = 0.75 * clamp(ev.t / 2, 0, 1);
      drawSprite(g, SPR4.ghost, x, y);
    }
    g.globalAlpha = 1;
  },
  finish(ev) {
    ev.city.alpha = 1;
    world.grades.dusk.t = 0;
    ev.delta('mood', +1);
    logCity(ev.city, 'Was briefly a ghost town. The ghosts left a nice review');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'wizard',
  title: 'The Wizard Tower',
  stamp: 'Unexplained',
  weight: () => 0.9,
  requires: () => true,
  duration: 16,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities.filter((c) => !c.cheese));
    ev.spot = null;
    for (let k = 0; k < 100 && !ev.spot; k++) {
      const a = ev.rng.range(0, TAU), r = ev.rng.range(16, 26);
      const x = Math.round(ev.city.x + Math.cos(a) * r), y = Math.round(ev.city.y + Math.sin(a) * r * 0.6);
      if (map.isWalkable(x, y)) ev.spot = { x, y };
    }
    ev.spot = ev.spot || { x: ev.city.x + 18, y: ev.city.y };
    ev.name = ev.rng.pick(['Mildred the Mildly Magical', 'Gerald the Grey-ish', 'Barnaby the Befuddled', 'Esmerelda of the Late Fee']);
  },
  headline: (ev) => ({
    title: `A wizard's tower appears next to ${ev.city.name}`,
    sub: ev.rng.pick([
      `${ev.name} was aiming for "prosperity" and got "cheese".`,
      'The town is now 100% cheese. Mice are relocating from across the country.',
      'Residents report the new houses are "delicious but structurally questionable".',
    ]),
  }),
  focus: (ev) => ({ x: (ev.spot.x + ev.city.x) / 2, y: ev.city.y - 10, zoom: 2.5 }),
  start(ev) { ev.s.h = 0; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`A tower grows out of the ground near ${c.name}. It has a pointy hat.`));
    ev.s.h = t < 3 ? smooth(t / 3) : t > 13 ? Math.max(0, 1 - (t - 13) / 1.5) : 1;
    if (t < 3) fx.dust(ev.spot.x, ev.spot.y, 1);
    ev.at(3.5, 'b1', () => say({ x: ev.spot.x, y: ev.spot.y - 18 }, 'Behold! A blessing of prosperity!', { life: 2.2 }));
    ev.at(6, 'zap', () => {
      ev.s.zap = 0.5;
      c.cheese = true;
      camera.kick(2);
      fx.burst(c.x, c.y - 3, 30, { speed: 18, colors: ['#fff6c8', '#f4d45a', '#c86aff'], life: 1 });
    });
    if (ev.s.zap) ev.s.zap = Math.max(0, ev.s.zap - dt);
    ev.at(7.2, 'b2', () => say(c, "We're cheese now?", {}));
    ev.at(8.8, 'b3', () => say({ x: ev.spot.x, y: ev.spot.y - 18 }, '...close enough.', { life: 1.8 }));
    ev.at(10.5, 'b4', () => say(c, 'Smells nice, though', {}));
    ev.at(11.5, 't1', () => ticker(`${c.name} is now made entirely of cheese. The wizard is "looking into it".`));
  },
  draw(ev, g, layer, t) {
    const x = Math.round(ev.spot.x + offX(ev.spot.x, ev.spot.y)), y = Math.round(ev.spot.y);
    if (layer === 'ground' && ev.s.h > 0) {
      const h = Math.round(ev.s.h * 14);
      g.fillStyle = 'rgba(20,30,25,0.35)'; g.fillRect(x - 1, y + 1, 5, 1);
      g.fillStyle = '#6a4a8a'; g.fillRect(x - 1, y - h, 4, h);
      g.fillStyle = '#8a6aaa'; g.fillRect(x - 1, y - h, 1, h);
      if (h > 6) {
        g.fillStyle = '#3a2a5a'; g.fillRect(x - 2, y - h - 1, 6, 1); g.fillRect(x - 1, y - h - 2, 4, 1); g.fillRect(x, y - h - 4, 2, 2); g.fillRect(x + 1, y - h - 5, 1, 1);
        g.fillStyle = Math.sin(t * 6) > 0 ? '#fff6a0' : '#f4d45a'; g.fillRect(x + 1, y - h - 6, 1, 1);
        g.fillStyle = '#ffe9a6'; g.fillRect(x, y - h + 3, 1, 1); g.fillRect(x + 2, y - h + 7, 1, 1);
      }
    }
    if (layer === 'sky' && ev.s.zap > 0) {
      const c = ev.city, cx = c.x + offX(c.x, c.y), cy = c.y - 3;
      g.fillStyle = '#f4d45a';
      const n = Math.ceil(dist(x, y - 14, cx, cy));
      for (let s = 0; s <= n; s++) g.fillRect(Math.round(lerp(x + 1, cx, s / n) + (Math.random() - 0.5) * 2), Math.round(lerp(y - 14, cy, s / n)), 1, 1);
    }
  },
  finish(ev) {
    ev.city.cheese = true;
    ev.delta('mood', +2);
    logCity(ev.city, `Turned into cheese by ${ev.name}. Delicious, structurally questionable`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'glitch',
  title: 'Simulation Glitch',
  stamp: 'Unexplained',
  weight: () => 0.7,
  requires: (w) => w.eventsPlayed > 3,
  duration: 13,
  setup(ev) { ev.victim = ev.rng.pick(world.cities); },
  headline: () => ({
    title: 'Eternia briefly glitches',
    sub: 'Nothing to see here. Please continue to enjoy your reality.',
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) { ev.s.debugWas = ui.debug; ev.s.oldName = ev.victim.name; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('ERROR: reality.exe has stopped responding.'));
    ev.at(1.5, 'dbg', () => { if (!ev.s.debugWas) { ui.debug = true; $('debug').hidden = false; } camera.kick(2); });
    ev.at(3, 'undef', () => { ev.victim.name = 'undefined'; });
    ev.at(4, 'b1', () => say(world.cities.find((c) => c !== ev.victim), 'Did everything just flicker?', {}));
    ev.at(5, 'n1', () => ticker('Patch 1.0.1: Cows no longer clip through mountains.'));
    ev.at(6.5, 'b2', () => say(ev.victim, 'Why is my name "undefined"?', {}));
    ev.at(7.5, 'n2', () => ticker('Patch 1.0.2: Fixed a bug where the sun was square on Tuesdays.'));
    ev.at(8.5, 'fix', () => { ev.victim.name = ev.s.oldName; });
    ev.at(9.5, 'n3', () => ticker('Patch 1.0.3: Reduced the number of rabbits by three. Rabbits have appealed.'));
    ev.at(11, 'done', () => {
      if (!ev.s.debugWas) { ui.debug = false; $('debug').hidden = true; }
      ticker('Simulation restored. Please do not look behind the curtain.');
    });
  },
  draw(ev, g, layer) {
    if (layer !== 'sky' || ev.t > 11) return;
    const intensity = ev.t < 1 ? ev.t : ev.t > 9 ? Math.max(0, (11 - ev.t) / 2) : 1;
    // tear a few horizontal strips sideways, and drop in some stray colour blocks
    const n = Math.floor(intensity * (Math.random() < 0.3 ? 9 : 3));
    for (let k = 0; k < n; k++) {
      const y = (Math.random() * H) | 0, h = 1 + ((Math.random() * 8) | 0), dx = ((Math.random() - 0.5) * 30) | 0;
      g.drawImage(R.buf, 0, y, W, h, dx, y, W, h);
    }
    if (Math.random() < intensity * 0.5) {
      g.fillStyle = ['#ff00ff', '#00ffff', '#00ff00', '#ffffff'][(Math.random() * 4) | 0];
      g.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2 + ((Math.random() * 10) | 0), 1 + ((Math.random() * 4) | 0));
    }
  },
  finish(ev) {
    ev.victim.name = ev.s.oldName || ev.victim.name;
    if (!ev.s.debugWas) { ui.debug = false; $('debug').hidden = true; }
    ev.delta('mood', -1);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'gravity',
  title: 'Gravity Takes a Day Off',
  stamp: 'Unexplained',
  weight: () => 0.8,
  requires: () => true,
  duration: 16,
  setup() {},
  headline: (ev) => ({
    title: 'Gravity takes a day off',
    sub: ev.rng.pick([
      'Physicists confirm gravity "just needed a bit of me-time".',
      'Everything that is not tied down floats. Several things that are tied down also float.',
      'Soup is now served in bags.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.cows = world.cows.filter((c) => !c.abducted && !c.held);
    for (const c of ev.s.cows) { c.held = true; c._fz = 3 + Math.random() * 10; c._p = Math.random() * 6; }
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('At exactly noon, gravity clocks off.'));
    const up = t < 2 ? smooth(t / 2) : t > 10 ? Math.max(0, 1 - (t - 10) / 2.5) : 1;
    for (const c of world.cities) c.lift = up * (6 + (c.id % 4) * 3 + Math.sin(t * 1.5 + c.id) * 1.5);
    for (const cow of ev.s.cows) cow.z = up * (cow._fz + Math.sin(t * 2 + cow._p) * 1.5);
    if (t > 1 && t < 10) ev.every('stuff', 0.08, dt, () => {
      const c = ev.rng.pick(world.cities);
      fx.spawn({ x: c.x + ev.rng.range(-6, 6), y: c.y, z: c.lift, vz: ev.rng.range(3, 7), vx: ev.rng.range(-2, 2), life: 3, colors: [ev.rng.pick(['#c8412e', '#f2eee2', '#3a8ad8', '#f4c542', '#6ab04a'])], layer: 'air' });
    });
    ev.at(3, 'b1', () => say(ev.rng.pick(world.cities), 'Wheee!', {}));
    ev.at(5, 'b2', () => say(ev.rng.pick(world.cities), 'My soup is floating!', {}));
    ev.at(7, 't1', () => ticker('Every town is now hovering. Property is technically "airspace". Lawyers are thrilled.'));
    ev.at(8, 'b3', () => say(ev.rng.pick(ev.s.cows), 'Moo?', { life: 1.5, lift: 4 }));
    ev.at(12.5, 'thud', () => {
      camera.kick(3);
      for (const c of world.cities) fx.dust(c.x, c.y + 1, 8);
      ticker('Gravity returns, looking refreshed. Everything lands with a gentle bump.');
    });
  },
  finish(ev) {
    for (const c of world.cities) c.lift = 0;
    for (const cow of ev.s.cows || []) { cow.held = false; cow.z = 0; delete cow._fz; delete cow._p; }
    ev.delta('mood', +4);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'mirror',
  title: 'Mirror Eternia',
  stamp: 'Unexplained',
  weight: () => 0.7,
  requires: () => true,
  duration: 17,
  setup() {},
  headline: (ev) => ({
    title: 'A mirror-image Eternia appears offshore',
    sub: ev.rng.pick([
      'Everyone waves. The other Eternia waves back, slightly too late.',
      'The mirror version is identical, except everyone there is left-handed.',
      'Both countries agree not to make eye contact.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    // a purple-tinted, horizontally flipped copy of the terrain
    const c = makeCanvas(W, H), cc = c.getContext('2d');
    cc.translate(W, 0); cc.scale(-1, 1);
    cc.drawImage(map.terrain, 0, 0);
    cc.setTransform(1, 0, 0, 1, 0, 0);
    cc.globalCompositeOperation = 'source-atop';
    cc.fillStyle = 'rgba(150,110,210,0.35)'; cc.fillRect(0, 0, W, H);
    ev.s.img = c;
    ev.s.shift = W;
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Something glimmers on the horizon. It is... Eternia? Again? But backwards?'));
    const target = t < 11 ? W * 0.62 : W + 20;
    ev.s.shift = approach(ev.s.shift, target, t < 11 ? 0.7 : 1.1, dt);
    ev.at(6, 'hi1', () => { const c = world.cities.slice().sort((a, b) => b.x - a.x)[0]; say(c, '...hi.', { life: 2 }); });
    ev.at(7.5, 'hi2', () => {
      const c = world.cities.slice().sort((a, b) => b.x - a.x)[0];
      say({ x: W - c.x + ev.s.shift, y: c.y, screen: true }, '...hi.', { life: 2 });
    });
    ev.at(9, 't1', () => ticker('Nobody knows what to say. The mirror country also does not know what to say. It is awkward.'));
    ev.at(10, 'b3', () => say(capitalOf('west'), 'Should we... invite them in?', {}));
    ev.at(11.2, 't2', () => ticker('Mirror Eternia leaves, having also decided it was a bit much.'));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || !ev.s.img) return;
    g.globalAlpha = 0.8;
    g.drawImage(ev.s.img, Math.round(ev.s.shift), 0);
    g.globalAlpha = 1;
    // its towns, mirrored too
    for (const c of world.cities) {
      const proxy = { ...c, x: W - c.x + ev.s.shift, lift: 0, ox: 0, oy: 0, shake: 0, alpha: 0.85, keepAway: false };
      if (proxy.x > -10 && proxy.x < W + 10 && proxy.x >= map.bx(c.y) + world.eastOffset + 4) drawCity(g, proxy, t);
    }
  },
  finish(ev) { ev.delta('mood', +2); },
});
