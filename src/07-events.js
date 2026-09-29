// ============================================================================
// 07 EVENTS — each event is a small script with a fixed shape:
//   requires(world) -> can it happen right now?
//   setup(ev)       -> pick targets (no visuals yet)
//   headline(ev)    -> the newspaper text
//   focus(ev)       -> where the camera should look
//   update(ev, dt)  -> animate by composing toolkit pieces, keyed on ev.t
//   draw(ev, g, layer, t) -> anything custom
//   finish(ev)      -> apply the final state (must be safe to call early on skip)
// ============================================================================

const EVENTS = [];
const defineEvent = (def) => { EVENTS.push(def); return def; };

// ---------------------------------------------------------------------------
defineEvent({
  id: 'schism',
  title: 'The Great Schism',
  stamp: 'Politics',
  weight: () => 1.1,
  requires: (w) => !w.split,
  duration: 18,
  setup(ev) {
    ev.grievance = ev.rng.pick([
      'whether a hot dog is a sandwich', 'the correct way to hang toilet paper',
      'how to pronounce "scone"', 'which half has the better sunsets',
      'pineapple on pizza', 'who ate the last royal biscuit', 'whether cereal is a soup',
    ]);
    const east = world.cities.filter((c) => c.side === 'east');
    ev.eastCap = east.slice().sort((a, b) => b.level - a.level || a.id - b.id)[0];
    ev.westCap = world.cities.find((c) => c.capital);
    const y0 = Math.round(lerp(map.lake.y, map.bottom, 0.5));
    ev.frontY = y0;
  },
  headline: (ev) => ({
    title: `Eternia splits in two over ${ev.grievance}`,
    sub: ev.rng.pick([
      'Both sides claim the river. The river has declined to pick a side.',
      'Families divided. Dinner tables divided. One dog divided, emotionally.',
      'Historians call it "extremely avoidable".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.soldiers = [];
    ev.s.crackTop = map.top;
    for (let y = map.top; y < map.bottom; y++) if (map.isLand(map.bx(y), y)) { ev.s.crackTop = y; break; }
    ev.s.crackLen = map.bottom - ev.s.crackTop;
  },
  update(ev, dt) {
    const t = ev.t;
    // 1. the crack runs down the country
    if (t < 4.5) {
      const y = ev.s.crackTop + ev.s.crackLen * easeInOut(t / 4);
      camera.kick(1.2);
      if (Math.random() < 0.8) fx.burst(map.bx(y), y, 2, { speed: 10, colors: ['#ffe6a0', '#ff9a3c'], life: 0.5, vz: 10, g: 40 });
    }
    ev.at(0.2, 't0', () => ticker('Negotiations collapse after fourteen minutes.'));
    ev.at(0.8, 'b1', () => say(ev.westCap, "Take that back!", { side: 'west' }));
    ev.at(2.2, 'b2', () => say(ev.eastCap, 'Never!', { side: 'east' }));
    // 2. the east half drifts away
    ev.at(4.5, 'drift', () => {
      world.eastOffsetTarget = SPLIT_GAP;
      world.tintTarget = 1;
      world.split = true;
      world.eastCapitalId = ev.eastCap.id;
      camera.kick(3);
      ticker(`${ev.eastCap.name} is now the capital of East Eternia. It is thrilled and slightly overwhelmed.`);
    });
    // 3. two tiny armies march to the new coastlines
    ev.at(6, 'armies', () => {
      for (const side of ['west', 'east']) {
        const home = side === 'west' ? ev.westCap : ev.eastCap;
        for (let k = 0; k < 14; k++) {
          const rank = k % 2, file = (k >> 1) - 3;
          ev.s.soldiers.push({
            side, home, x: home.x + ev.rng.range(-3, 3), y: home.y + ev.rng.range(-2, 2),
            fy: ev.frontY + file * 5, rank, down: 0, speed: ev.rng.range(11, 16),
          });
        }
      }
      ticker('Both armies arrive at the border at exactly the same time. Awkward eye contact follows.');
      camera.focus(map.bx(ev.frontY), ev.frontY - 4, 2.3, 0.7);
    });
    const push = t > 9.5 && t < 15.5 ? Math.sin((t - 9.5) * 1.5) * 3 : 0;
    for (const s of ev.s.soldiers) {
      let tx, ty;
      if (t < 15.5) {
        const edge = map.bx(s.fy);
        tx = s.side === 'west' ? edge - 5 - s.rank * 3 + push : edge + 5 + s.rank * 3 + push;
        ty = s.fy;
      } else { tx = s.home.x; ty = s.home.y; }
      if (s.down > 0) { s.down -= dt; continue; }
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d > 0.6) { s.x += (dx / d) * Math.min(d, s.speed * dt); s.y += (dy / d) * Math.min(d, s.speed * dt); }
      s.walking = d > 0.6;
    }
    // 4. the skirmish: lots of arrows, very few consequences
    if (t > 9.5 && t < 15.3) {
      ev.every('arrow', 0.12, dt, () => {
        const from = ev.rng.pick(ev.s.soldiers);
        const foes = ev.s.soldiers.filter((s) => s.side !== from.side);
        const to = ev.rng.pick(foes);
        fx.launch({
          x0: from.x, y0: from.y - 1, x1: to.x + ev.rng.range(-3, 3), y1: to.y + ev.rng.range(-2, 2), z0: 1, z1: 0,
          arc: 7, dur: 0.75,
          draw: (g, x, y, p) => { g.fillStyle = '#3a2e26'; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.fillStyle = '#d8d0c0'; g.fillRect(Math.round(x - Math.sign(p.dx || 1)), Math.round(y), 1, 1); },
          onHit: (p) => {
            fx.dust(p.x, p.y, 3);
            if (dist(p.x, p.y, to.x, to.y) < 2.5 && Math.random() < 0.5) to.down = 1.2;
          },
        });
      });
    }
    ev.at(11, 'b3', () => say(ev.rng.pick(ev.s.soldiers.filter((s) => s.side === 'west')) || ev.westCap, 'For the West!', { side: 'west', align: 'left' }));
    ev.at(12.5, 'b4', () => say(ev.rng.pick(ev.s.soldiers.filter((s) => s.side === 'east')) || ev.eastCap, 'Ow. Rude.', { side: 'east', align: 'right' }));
    ev.at(15.5, 'home', () => {
      ticker('Everyone goes home for lunch. The war is technically still on.');
      camera.focus(W / 2, H / 2, 1.05, 0.8);
    });
  },
  draw(ev, g, layer, t) {
    if (layer === 'ground' && ev.t < 5) {
      const bottomY = ev.s.crackTop + ev.s.crackLen * easeInOut(ev.t / 4);
      for (let y = ev.s.crackTop; y <= bottomY; y++) {
        const x = Math.round(map.bx(y) + Math.sin(y * 1.7) * 0.8);
        if (!map.isLand(x, y)) continue;
        g.fillStyle = '#2b1f1b'; g.fillRect(x, y, 1, 1);
        g.fillStyle = Math.random() < 0.5 ? '#ff9a3c' : '#ffd27a';
        g.fillRect(x + (y % 2 ? 1 : -1), y, 1, 1);
      }
    }
    if (layer === 'ground') {
      for (const s of ev.s.soldiers) {
        const x = Math.round(s.x + offX(s.x, s.y)), y = Math.round(s.y);
        const col = SIDE[s.side].dark;
        if (s.down > 0) { g.fillStyle = col; g.fillRect(x - 1, y, 2, 1); g.fillStyle = '#f0c9a0'; g.fillRect(x + 1, y, 1, 1); continue; }
        const bob = s.walking && Math.sin(t * 18 + s.fy) > 0 ? 1 : 0;
        g.fillStyle = 'rgba(20,30,25,0.35)'; g.fillRect(x, y + 1, 1, 1);
        g.fillStyle = col; g.fillRect(x, y - 1 - bob, 1, 2);
        g.fillStyle = '#f0c9a0'; g.fillRect(x, y - 2 - bob, 1, 1);
        g.fillStyle = '#d8d8d8'; g.fillRect(x + (s.side === 'west' ? 1 : -1), y - 3 - bob, 1, 2);
      }
    }
  },
  finish(ev) {
    world.split = true;
    world.splitAt = world.eventsPlayed;
    world.eastOffsetTarget = SPLIT_GAP;
    world.tintTarget = 1;
    world.eastCapitalId = ev.eastCap.id;
    ev.delta('mood', -16);
    logCity(ev.eastCap, 'Became the capital of East Eternia');
    logCity(ev.westCap, 'Stayed the capital of West Eternia, out of spite');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'reunification',
  title: 'The Reunification',
  stamp: 'Politics',
  weight: (w) => 0.5 + (w.eventsPlayed - w.splitAt) * 0.55,
  requires: (w) => w.split,
  duration: 16,
  setup(ev) {
    ev.reason = ev.rng.pick([
      'both sides forget what they were arguing about',
      'a joint discovery of nachos',
      'everyone admits the other side also has nice sunsets',
      'a very long group hug',
      'the river files a formal complaint',
    ]);
    ev.westCap = capitalOf('west'); ev.eastCap = capitalOf('east');
  },
  headline: (ev) => ({
    title: `East and West reunite after ${ev.reason}`,
    sub: ev.rng.pick([
      'The border fence will be recycled into a very long bench.',
      'Both capitals insist they were the first to apologise.',
      'Brief ceremony marred only by the zipper getting stuck twice.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.zipTop = map.top; ev.s.zipBottom = map.bottom;
    for (let y = map.top; y < map.bottom; y++) if (map.isLand(map.bx(y), y)) { ev.s.zipTop = y; break; }
    for (let y = map.bottom; y > map.top; y--) if (map.isLand(map.bx(y), y)) { ev.s.zipBottom = y; break; }
    ev.s.stitched = ev.s.zipBottom;
  },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker('Peace talks begin. Snacks are provided.'));
    ev.at(0.5, 'b1', () => say(ev.eastCap, 'So... what were we fighting about?', { side: 'east' }));
    ev.at(2.2, 'b2', () => say(ev.westCap, 'Honestly? No idea.', { side: 'west' }));
    ev.at(3.2, 'close', () => ticker('The two halves are zipped back together. It takes a few tries.'));
    if (t > 3.2 && t < 9) {
      const p = easeInOut((t - 3.2) / 5.5);
      world.eastOffsetTarget = world.eastOffset = SPLIT_GAP * (1 - p);
      const zy = lerp(ev.s.zipBottom, ev.s.zipTop, p);
      camera.focus(map.bx(zy), zy, 2, 3);
      const y = Math.round(lerp(ev.s.zipBottom, ev.s.zipTop, p));
      if (y < ev.s.stitched) { stampSeam(y, ev.s.stitched); ev.s.stitched = y; }
      ev.s.zipY = y;
      if (Math.random() < 0.6) fx.burst(map.bx(y), y, 1, { speed: 8, colors: ['#fffbe0', '#c8ccd0'], life: 0.5 });
    }
    ev.at(8.8, 'tint', () => { world.tintTarget = 0; camera.kick(1.5); camera.focus(W / 2, H / 2, 1.05, 1.2); });
    if (t > 9 && t < 15) {
      ev.every('fw', 0.35, dt, () => {
        const c = ev.rng.pick(world.cities);
        fx.launch({
          x0: c.x, y0: c.y, x1: c.x + ev.rng.range(-6, 6), y1: c.y, z0: 2, z1: ev.rng.range(26, 44), dur: 0.9, ease: easeOut,
          onStep: (p) => { if (Math.random() < 0.6) fx.spawn({ x: p.x, y: p.y, z: p.z, life: 0.4, colors: ['#ffe6a0', '#ff9a3c'] }); },
          draw: (g, x, y) => { g.fillStyle = '#fffbe0'; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
          onHit: (p) => fx.firework(p.x, p.y, p.z),
        });
      });
    }
    ev.at(10.5, 't1', () => ticker('Fireworks in every town. One goes sideways into Muddle. Nobody minds.'));
  },
  draw(ev, g, layer) {
    if (layer === 'air' && ev.s.zipY != null && ev.t < 9.2) {
      const y = ev.s.zipY;
      drawSprite(g, SPRITES.zipper, map.bx(y) + world.eastOffset / 2 + 0.5, y);
    }
  },
  finish(ev) {
    world.split = false;
    world.eastOffsetTarget = 0;
    world.tintTarget = 0;
    if (ev.s.stitched > ev.s.zipTop) stampSeam(ev.s.zipTop, ev.s.stitched);
    const eastCap = ev.eastCap;
    world.eastCapitalId = null;
    ev.delta('mood', +24);
    if (eastCap) logCity(eastCap, 'Handed its capital status back, a little reluctantly');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'meteor',
  title: 'Meteor Strike',
  stamp: 'Act of sky',
  weight: () => 1,
  requires: () => true,
  duration: 11,
  setup(ev) {
    const hitTown = ev.rng.chance(0.6);
    if (hitTown) {
      const c = ev.rng.pick(world.cities.filter((k) => k.lift === 0));
      ev.city = c;
      let x = c.x, y = c.y;
      for (let k = 0; k < 40; k++) {
        const tx = c.x + ev.rng.range(-5, 5), ty = c.y + ev.rng.range(-3, 5);
        if (map.isWalkable(tx, ty)) { x = tx; y = ty; break; }
      }
      ev.x = Math.round(x); ev.y = Math.round(y);
    } else {
      for (let k = 0; k < 500; k++) {
        const x = ev.rng.range(40, W - 40), y = ev.rng.range(30, H - 30);
        if (map.isWalkable(x, y) && map.landDist[Math.round(y) * W + Math.round(x)] > 6 && world.cities.every((c) => dist(c.x, c.y, x, y) > 26)) {
          ev.x = Math.round(x); ev.y = Math.round(y); break;
        }
      }
      if (ev.x == null) { const c = world.cities[0]; ev.x = c.x + 10; ev.y = c.y; }
      ev.near = world.cities.slice().sort((a, b) => dist(a.x, a.y, ev.x, ev.y) - dist(b.x, b.y, ev.x, ev.y))[0];
    }
    ev.R = ev.city ? 8 : 10;
  },
  headline: (ev) => ev.city ? {
    title: `Meteor strikes ${ev.city.name}`,
    sub: ev.rng.pick([
      "Residents describe it as \"big\" and \"honestly quite rude\".",
      'Mayor insists the crater "was always there".',
      'Local bakery reports record sales of rock cakes.',
    ]),
  } : {
    title: `Meteor lands in the middle of nowhere near ${ev.near.name}`,
    sub: ev.rng.pick([
      'The only witness, a sheep, has declined to comment.',
      'Experts say it could have been much worse, then refuse to elaborate.',
      'Crater immediately becomes the second most popular picnic spot.',
    ]),
  },
  focus: (ev) => ({ x: ev.x - 12, y: ev.y - 10, zoom: 1.75 }),
  start(ev) {
    ev.s.impacted = false;
    ev.s.sx = ev.x - 120; ev.s.sy = ev.y - 18;
  },
  update(ev, dt) {
    const t = ev.t;
    const witness = ev.city || ev.near;
    ev.at(0.2, 't0', () => ticker('Astronomers spot something heading this way. They look nervous.'));
    ev.at(0.5, 'b1', () => say(witness, ev.rng.pick(['Is that a bird?', 'Make a wish!', 'Ooh, a shooting star']), {}));
    ev.at(1.5, 'launch', () => {
      fx.launch({
        x0: ev.s.sx, y0: ev.s.sy, z0: 160, x1: ev.x, y1: ev.y, z1: 0, dur: 2.4, ease: (u) => u * u * 0.4 + u * 0.6,
        onStep: (p) => {
          for (let k = 0; k < 3; k++) fx.fire(p.x, p.y, { z: p.z, spread: 2, size: k === 0 ? 2 : 1 });
          if (Math.random() < 0.5) fx.smoke(p.x, p.y, { z: p.z + 1, rise: 2, life: 1.4, colors: ['#8a847c', '#6a6560'] });
        },
        draw: (g, x, y) => {
          g.fillStyle = '#ffcf5a'; g.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 3);
          g.fillStyle = '#fffbe8'; g.fillRect(Math.round(x) - 1, Math.round(y), 2, 1);
        },
        onHit: () => impact(ev),
      });
    });
    ev.at(2.6, 'b2', () => say(witness, ev.rng.pick(['That is not a bird.', 'Is it getting bigger?', 'Everyone inside!']), {}));
    if (ev.s.impacted && t < 9) {
      ev.every('smoke', 0.08, dt, () => fx.smoke(ev.x + ev.rng.range(-3, 3), ev.y, { size: 2, grow: 1.4, life: 3, colors: ['#8a847c', '#716c66', '#5a5652'] }));
      if (t < 6) ev.every('fire', 0.05, dt, () => fx.fire(ev.x + ev.rng.range(-5, 5), ev.y + ev.rng.range(-2, 3)));
    }
    ev.at(5.5, 'dustclear', () => { world.grades.dust.t = 0; });
    ev.at(7.2, 'b3', () => say(witness, ev.city ? 'Crater tours! Two coins!' : 'Can we keep it?', {}));
  },
  draw(ev, g, layer) {
    if (layer === 'ground' && !ev.s.impacted && ev.t > 1.5) {
      const p = clamp((ev.t - 1.5) / 2.4, 0, 1);
      const r = 2 + p * 8;
      g.fillStyle = `rgba(20,20,15,${0.1 + p * 0.3})`;
      const ox = offX(ev.x, ev.y);
      for (let dy = -r; dy <= r; dy++) {
        const w = Math.sqrt(Math.max(0, r * r - dy * dy));
        g.fillRect(Math.round(ev.x + ox - w), Math.round(ev.y + dy * 0.6), Math.round(w * 2), 1);
      }
    }
    if (layer === 'ground' && ev.s.impacted) {
      const cool = clamp((ev.t - ev.s.hitAt) / 7, 0, 1);
      const col = mixRgb(hexToRgb('#ffd24a'), hexToRgb('#4a4440'), cool);
      g.fillStyle = rgbStr(col);
      g.fillRect(Math.round(ev.x + offX(ev.x, ev.y)) - 1, ev.y - 1, 2, 2);
    }
  },
  finish(ev) {
    if (!ev.s.impacted) impact(ev, true);
    world.grades.dust.t = 0;
    stampPixel(ev.x - 1, ev.y - 1, '#4a4440'); stampPixel(ev.x, ev.y - 1, '#5a544e');
    stampPixel(ev.x - 1, ev.y, '#3a3632'); stampPixel(ev.x, ev.y, '#4a4440');
    world.craters++;
  },
});

function impact(ev, quiet = false) {
  if (ev.s.impacted) return;
  ev.s.impacted = true;
  ev.s.hitAt = ev.t;
  stampCrater(ev.x, ev.y, ev.R);
  let lost = 0;
  for (const c of world.cities) {
    const d = dist(c.x, c.y, ev.x, ev.y);
    if (d < 22) {
      const dmg = clamp(1.15 - d / 20, 0, 1);
      c.damage = Math.max(c.damage, dmg);
      const l = Math.round(c.pop * dmg * 0.35);
      c.pop -= l; lost += l;
      logCity(c, dmg > 0.6 ? 'Hit by a meteor. Rebuilt, with a nice crater view' : 'Rattled by a nearby meteor');
    }
  }
  if (lost) ev.delta('pop', -lost);
  ev.delta('mood', -8);
  world.devastation = Math.min(1, world.devastation + (ev.city ? 0.2 : 0.05));
  if (quiet) return;
  world.grades.flash.v = 1; world.grades.flash.t = 0;
  world.grades.dust.t = 0.65;
  camera.kick(8);
  fx.ring(ev.x, ev.y, { max: 42, speed: 70, color: '#fff2d0' });
  fx.ring(ev.x, ev.y, { max: 60, speed: 50, color: '#ffb35a' });
  fx.ring(ev.x, ev.y, { max: 80, speed: 36, color: '#c9b089' });
  fx.burst(ev.x, ev.y, 60, { speed: 42, vz: 60, g: 90, bounce: 0.3, drag: 0.4, life: 1.8, colors: ['#8a7a66', '#6a5a4a', '#3e342c'], layer: 'ground' });
  fx.burst(ev.x, ev.y, 30, { speed: 20, vz: 30, g: 30, life: 1, colors: ['#fff6c0', '#ffd24a', '#ff8a2a', '#c8421e'] });
  ticker(ev.city ? `Direct hit on ${ev.city.name}. Scientists confirm: "That was a big one."` : 'The meteor misses everything important. The sheep is fine.');
}

// ---------------------------------------------------------------------------
defineEvent({
  id: 'rabbits',
  title: 'Invasive Rabbits',
  stamp: 'Wildlife',
  weight: () => 1,
  requires: () => true,
  duration: 25,
  setup(ev) {
    ev.city = ev.rng.pick(world.cities.filter((c) => !c.capital));
  },
  headline: (ev) => ({
    title: `Two rabbits released near ${ev.city.name}`,
    sub: ev.rng.pick([
      '"What\'s the worst that could happen?" asks local man.',
      'Owner says they were "a gift" and "very small at the time".',
      'Pet shop insists both rabbits were "definitely boys".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y, zoom: 2.2 }),
  start(ev) {
    ev.s.list = [];
    ev.s.milestone = 2;
    ev.s.boarded = 0;
    ev.s.warned = new Set();
    for (let k = 0; k < 2; k++) {
      ev.s.list.push({ x: ev.city.x + (k ? 3 : -3), y: ev.city.y + 3, ht: 0, hop: 0, z: 0, vx: 0, vy: 0, breed: 1.1, home: ev.city, fast: true });
    }
  },
  update(ev, dt) {
    const t = ev.t, list = ev.s.list;
    const CAP = 650;
    ev.at(0.2, 't0', () => ticker(`Two rabbits spotted near ${ev.city.name}. Residents find them adorable.`));
    ev.at(0.6, 'b1', () => say(ev.city, 'Aww, look at them!', {}));
    ev.at(4.5, 'zoom', () => camera.focus(ev.city.x, ev.city.y, 1.25, 0.8));
    ev.at(8, 'zoom2', () => camera.focus(W / 2, H / 2, 1, 0.8));
    // exponential breeding until the lure arrives
    if (t < 13) {
      for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        r.breed -= dt;
        if (r.breed <= 0 && list.length < CAP) {
          r.breed = 0.9 + Math.random() * 0.8;
          list.push({ x: r.x + (Math.random() - 0.5) * 2, y: r.y + (Math.random() - 0.5) * 2, ht: 0, hop: 0, z: 0, vx: 0, vy: 0, breed: 1 + Math.random(), home: ev.city, grey: Math.random() < 0.3, fast: true });
        }
      }
      while (list.length >= ev.s.milestone * 4 && ev.s.milestone < 512) {
        ev.s.milestone *= 4;
        const quips = {
          8: 'Rabbit count: 8. "Still manageable," says the mayor.',
          32: 'Rabbit count: 32. Lettuce prices triple.',
          128: 'Rabbit count: 128. Farmers form a strongly worded committee.',
          512: 'Rabbit count: 512. The rabbits now outnumber the voters.',
        };
        if (quips[ev.s.milestone]) ticker(quips[ev.s.milestone]);
      }
    }
    // the lure: a giant carrot on a boat
    ev.at(13, 'lure', () => {
      let cx = 0, cy = 0;
      for (const r of list) { cx += r.x; cy += r.y; }
      cx /= list.length; cy /= list.length;
      let best = null;
      for (let y = 10; y < H - 10; y += 2) for (let x = 10; x < W - 10; x += 2) {
        const d = map.oceanDepth(x, y);
        if (d < 5 || d > 8) continue;
        const s = dist(x, y, cx, cy);
        if (!best || s < best.s) best = { x, y, s };
      }
      ev.s.boat = { x: best.x, y: best.y, dir: Math.atan2(best.y - cy, best.x - cx) };
      ev.s.boat.sx = best.x + Math.cos(ev.s.boat.dir) * 90; ev.s.boat.sy = best.y + Math.sin(ev.s.boat.dir) * 90;
      let shore = null;
      for (let r = 1; r < 16 && !shore; r++) {
        for (let a = 0; a < TAU; a += 0.2) {
          const x = best.x + Math.cos(a) * r, y = best.y + Math.sin(a) * r;
          if (map.isWalkable(x, y)) { shore = { x, y }; break; }
        }
      }
      ev.s.shore = shore || { x: best.x, y: best.y };
      camera.focus(best.x, best.y, 2, 0.9);
      ticker('The government deploys its secret weapon: an enormous carrot.');
    });
    if (ev.s.boat) {
      const b = ev.s.boat;
      const arrive = easeOut((t - 13) / 2.2), leave = easeIn((t - 22) / 2.5);
      b.cx = lerp(b.sx, b.x, arrive); b.cy = lerp(b.sy, b.y, arrive);
      if (t > 22) { b.cx = lerp(b.x, b.sx, leave); b.cy = lerp(b.y, b.sy, leave); }
    }
    // move everyone
    const luring = t > 14.5 && t < 22;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      hopRabbit(r, dt, luring ? ev.s.shore : null, luring && t > 19.5);
      if (luring && dist(r.x, r.y, ev.s.shore.x, ev.s.shore.y) < 4 && list.length > 3) {
        if (Math.random() < 0.15) fx.splash(r.x, r.y);
        list[i] = list[list.length - 1]; list.pop();
        ev.s.boarded++;
      }
    }
    // towns react when rabbits arrive
    for (const c of world.cities) {
      if (ev.s.warned.has(c.id) || t > 13) continue;
      let n = 0;
      for (const r of list) if (Math.abs(r.x - c.x) < 8 && Math.abs(r.y - c.y) < 6) n++;
      if (n > 6) {
        ev.s.warned.add(c.id);
        say(c, ev.rng.pick(["They're in the bread!", 'My lettuce!!', "They're cute though", 'RUN', 'Not the petunias!', 'This is fine']), {});
      }
    }
    ev.at(20.5, 'b2', () => say({ x: ev.s.boat.cx, y: ev.s.boat.cy }, 'All aboard!', {}));
    ev.at(22.2, 'gone', () => ticker(`${ev.s.boarded.toLocaleString()} rabbits sail away to a better life. Three stay behind, on principle.`));
  },
  draw(ev, g, layer) {
    if (layer === 'ground') {
      drawRabbits(g, ev.s.list);
      if (ev.s.boat && ev.s.boat.cx != null) {
        const b = ev.s.boat;
        g.fillStyle = 'rgba(190,224,214,0.7)'; g.fillRect(Math.round(b.cx) - 9, Math.round(b.cy) + 5, 18, 1);
        drawSprite(g, SPRITES.carrotBoat, b.cx, b.cy, Math.cos(b.dir) > 0);
      }
    }
  },
  finish(ev) {
    const keep = ev.s.list.slice(0, 3);
    for (const r of keep) { r.home = null; r.fast = false; world.rabbits.push(r); }
    while (world.rabbits.length < 3) world.rabbits.push({ x: ev.city.x + 4, y: ev.city.y + 3, ht: 0, hop: 0, z: 0, vx: 0, vy: 0 });
    ev.s.list = [];
    ev.delta('mood', -6);
    logCity(ev.city, 'Where the Great Rabbit Incident began. Denies everything');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'aliens',
  title: 'Alien Invasion',
  stamp: 'Unexplained',
  weight: () => 1,
  requires: () => true,
  duration: 22,
  setup(ev) {
    // towns near the top edge would hide the mothership behind the headline
    const open = world.cities.filter((c) => c.lift === 0 && c.y > 85);
    ev.city = ev.rng.pick(open.length ? open : world.cities);
    const cows = world.cows.filter((c) => !c.abducted)
      .sort((a, b) => dist(a.x, a.y, ev.city.x, ev.city.y) - dist(b.x, b.y, ev.city.x, ev.city.y));
    ev.cows = cows.slice(0, 3);
  },
  headline: (ev) => ({
    title: `Visitors from beyond arrive over ${ev.city.name}`,
    sub: ev.rng.pick([
      'They demand to speak to whoever is in charge of cows.',
      'Locals unsure whether to wave or panic. Most choose both.',
      'Mayor greets them with a slightly stale fruitcake.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 16, zoom: 1.55 }),
  start(ev) {
    const c = ev.city;
    ev.s.mother = { x: c.x, y: c.y, z: 150 };
    ev.s.saucers = ev.cows.map((cow, k) => ({ x: c.x, y: c.y, z: 30, cow, state: 'docked', k }));
    world.grades.alien.t = 1;
  },
  update(ev, dt) {
    const t = ev.t, m = ev.s.mother, c = ev.city;
    // mothership: descend, hover, leave
    if (t < 3.2) m.z = lerp(150, 34, easeOut(t / 3.2));
    else if (t < 19.5) m.z = 34 + Math.sin(t * 2.2) * 1.2;
    else { const u = easeIn((t - 19.5) / 1.6); m.z = lerp(34, 260, u); m.x = c.x + u * 70; }
    ev.at(0.2, 't0', () => ticker(`Unidentified object spotted over ${c.name}. It is identified almost immediately as a spaceship.`));
    ev.at(1.2, 'b1', () => say(c, ev.rng.pick(['Ooh, shiny', 'Everyone act natural', 'Is it the tax collector?']), {}));
    // saucers fly to cows and beam them up
    for (const s of ev.s.saucers) {
      const cow = s.cow;
      if (s.state === 'docked' && t > 3.5 + s.k * 0.5) s.state = 'fly';
      if (s.state === 'fly') {
        s.x = approach(s.x, cow.x, 2.2, dt); s.y = approach(s.y, cow.y, 2.2, dt); s.z = approach(s.z, 16, 2.2, dt);
        if (dist(s.x, s.y, cow.x, cow.y) < 1.2) { s.state = 'beam'; s.beamT = 0; cow.held = true; }
      } else if (s.state === 'beam') {
        s.beamT += dt;
        cow.z = lerp(0, 14, smooth(s.beamT / 2.2));
        if (s.beamT > 0.4 && !s.mooed) { s.mooed = true; say(cow, 'moo?', { life: 1.8, lift: 4 }); }
        if (s.beamT > 2.3) { cow.abducted = true; s.state = 'return'; }
      } else if (s.state === 'return' || (s.state === 'home' && t > 19)) {
        s.x = approach(s.x, m.x, 2.5, dt); s.y = approach(s.y, m.y, 2.5, dt); s.z = approach(s.z, m.z, 2.5, dt);
        if (dist(s.x, s.y, m.x, m.y) < 1) s.state = 'home';
      }
      if (s.state === 'home') { s.x = m.x; s.y = m.y; s.z = m.z; }
    }
    // the main event: the whole town goes up
    ev.at(8.8, 't1', () => ticker(`The aliens have taken the cows. The aliens are now taking ${c.name}. All of it.`));
    if (t > 9 && t < 13.5) {
      c.lift = lerp(0, 20, smooth((t - 9) / 3.5));
      if (Math.random() < 0.5) fx.dust(c.x + ev.rng.range(-6, 6), c.y + 1, 1);
      camera.kick(0.6);
    }
    ev.at(13.8, 'b2', () => say(m, ev.rng.pick([
      'Hm. Smaller than it looked on the map.',
      '...this is the wrong planet, isn\'t it.',
      'We were told there would be snacks.',
    ]), { alien: true, life: 3.2, lift: 6 }));
    if (t > 16.5 && t < 17.3) {
      c.lift = lerp(20, 0, easeIn((t - 16.5) / 0.7));
    }
    ev.at(17.3, 'thud', () => {
      c.lift = 0;
      camera.kick(4);
      fx.ring(c.x, c.y + 1, { max: 22, speed: 40, color: '#d8c8a8' });
      fx.dust(c.x, c.y + 1, 24);
      say(c, ev.rng.pick(['Ow.', 'Thanks, we guess?', 'Did they... add Wi-Fi?']), {});
      for (const cow of ev.cows) {
        cow.abducted = false; cow.held = false; cow.z = 30 + Math.random() * 10; cow.vz = -7; cow.chute = true;
        cow.x = cow.x + (Math.random() - 0.5) * 2;
      }
    });
    ev.at(18.5, 't2', () => ticker('The cows are returned by parachute, looking thoughtful.'));
    ev.at(19.5, 'leave', () => {
      world.grades.alien.t = 0;
      fx.ring(m.x, m.y - m.z, { max: 30, speed: 60, color: '#9dffd0', squash: 0.5 });
    });
  },
  draw(ev, g, layer, t) {
    const m = ev.s.mother, c = ev.city;
    if (layer === 'ground') {
      // ground shadows of the ships
      const s = clamp(1 - m.z / 200, 0.1, 1);
      g.fillStyle = `rgba(10,20,20,${0.22 * s})`;
      g.fillRect(Math.round(m.x + offX(m.x, m.y) - 10 * s), Math.round(m.y + 3), Math.round(20 * s), 2);
    }
    if (layer !== 'air') return;
    const beam = (x1, y1, x2, y2, halfTop, halfBottom) => {
      const n = Math.max(1, Math.round(y2 - y1));
      for (let k = 0; k <= n; k++) {
        const u = k / n, y = Math.round(y1 + (y2 - y1) * u);
        const half = lerp(halfTop, halfBottom, u), cx = lerp(x1, x2, u);
        const scan = ((y + Math.floor(t * 12)) % 3) === 0;
        g.fillStyle = scan ? 'rgba(200,255,225,0.45)' : 'rgba(140,255,200,0.22)';
        g.fillRect(Math.round(cx - half), y, Math.round(half * 2) + 1, 1);
      }
    };
    for (const s of ev.s.saucers) {
      if (s.state === 'beam' && !s.cow.abducted) {
        const ox = offX(s.x, s.y);
        beam(s.x + ox, s.y - s.z + 2, s.cow.x + ox, s.cow.y + 1, 1, 3);
      }
    }
    if (ev.t > 8.8 && ev.t < 17.3) {
      const ox = offX(c.x, c.y);
      beam(m.x + ox, m.y - m.z + 3, c.x + ox, c.y + 3, 3, 11);
    }
    const mox = offX(m.x, m.y);
    drawSprite(g, SPRITES.mothership, m.x + mox, m.y - m.z);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = (Math.floor(t * 6) + k) % 3 === 0 ? '#ffe86a' : '#7dffb0';
      g.fillRect(Math.round(m.x + mox) - 8 + k * 3, Math.round(m.y - m.z) + 1, 1, 1);
    }
    for (const s of ev.s.saucers) {
      if (s.state === 'home' || s.state === 'docked') continue;
      drawSprite(g, SPRITES.saucer, s.x + offX(s.x, s.y), s.y - s.z);
    }
  },
  finish(ev) {
    const c = ev.city;
    c.lift = 0;
    world.grades.alien.t = 0;
    for (const cow of ev.cows) {
      if (cow.abducted || cow.held) { cow.abducted = false; cow.held = false; cow.z = 0; cow.chute = false; }
    }
    // a souvenir: a crop circle in a nearby field and a new antenna
    for (let k = 0; k < 200; k++) {
      const a = Math.random() * TAU, r = 14 + Math.random() * 14;
      const x = Math.round(c.x + Math.cos(a) * r), y = Math.round(c.y + Math.sin(a) * r * 0.7);
      let ok = true;
      for (let dy = -6; dy <= 6 && ok; dy += 3) for (let dx = -9; dx <= 16 && ok; dx += 3) if (!map.isWalkable(x + dx, y + dy)) ok = false;
      if (ok && world.cities.every((o) => dist(o.x, o.y, x, y) > 12)) { stampCropCircle(x, y); break; }
    }
    c.souvenirs.add('antenna');
    if (!c.renamed) {
      c.renamed = true;
      c.name = ev.rng.pick([`New ${c.baseName}`, `${c.baseName}-Upon-Mothership`, `${c.baseName} (Now With Wi-Fi)`]);
      ticker(`${c.baseName} renames itself ${c.name}. Tourism up 400%.`);
    }
    ev.delta('mood', +6);
    logCity(c, 'Briefly abducted by aliens, then returned with an antenna');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'nothing',
  title: 'Nothing Happens',
  stamp: 'Slow news day',
  rarity: 0.35,
  weight: () => 0.3,
  requires: (w) => w.eventsPlayed > 2,
  duration: 9,
  setup(ev) { ev.city = ev.rng.pick(world.cities); },
  headline: (ev) => ({
    title: 'Nothing happens',
    sub: ev.rng.pick([
      'Historians describe the year as "fine".',
      `A leaf falls near ${ev.city.name}. That is the whole story.`,
      'Newspaper prints a very large crossword instead.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 12, zoom: 2.4 }),
  start(ev) { ev.s.leaf = { x: ev.city.x - 6, y: ev.city.y + 3, z: 50 }; },
  update(ev) {
    const l = ev.s.leaf, t = ev.t;
    l.z = Math.max(0, 50 - t * 8.5);
    l.drawX = l.x + Math.sin(t * 2.2) * 5;
    ev.at(0.2, 't0', () => ticker('Reporters wait patiently for something to happen.'));
    ev.at(6.6, 'b1', () => say(ev.city, ev.rng.pick(['Did you see that?', '...anyway.', 'Beautiful.']), {}));
  },
  draw(ev, g, layer) {
    if (layer !== 'air') return;
    const l = ev.s.leaf;
    drawSprite(g, SPRITES.leaf, (l.drawX ?? l.x) + offX(l.x, l.y), l.y - l.z);
  },
  finish(ev) {
    const l = ev.s.leaf;
    stampPixel(l.x, l.y, '#c07a2a');
    ev.delta('mood', +2);
  },
});
