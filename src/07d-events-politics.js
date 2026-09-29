// ============================================================================
// 07d EVENTS, BATCH 2a — politics and society.
// These change persistent state: who rules (council, monarch, the people, a
// chef), the flag colour, the country's name, and where the capital lives.
// ============================================================================

const SPR3 = {};
function initSprites3() {
  SPR3.crown = makeSprite([
    'y...y...y',
    'yy.yyy.yy',
    'yyyyyyyyy',
    'yryybyyry',
    'yyyyyyyyy',
    'ooooooooo',
  ], { y: '#f4c542', r: '#d8412e', b: '#3a8ad8', o: '#c8962a' });
  SPR3.coin = makeSprite([
    '..ooo..',
    '.oyyyo.',
    'oyyEyyo',
    'oyEEEyo',
    'oyyEyyo',
    '.oyyyo.',
    '..ooo..',
  ], { o: '#c8962a', y: '#f4c542', E: '#a8741a' });
  SPR3.ladle = makeSprite(['.s.', '.s.', '.s.', '.s.', '.s.', 'sss', 'sSs', '.s.'], { s: '#d8dce0', S: '#8a9096' });
  SPR3.table = makeSprite(['ttttttt', 't.....t'], { t: '#8d6a44' });
  const ship = (sail) => makeSprite(['...m...', '..sSs..', '.sSSSs.', 'hhhhhhh', '.hhhhh.'],
    { m: '#3d3a36', s: sail, S: '#f2eee2', h: '#6b4a30' });
  SPR3.shipWest = ship(SIDE.west.color);
  SPR3.shipEast = ship(SIDE.east.color);
  SPR3.shipForeign = ship('#3a8ad8');
  SPR3.shipPirate = ship('#2b2622');
}
const capital = () => capitalOf('west');
const otherCities = (c) => world.cities.filter((k) => k !== c);

// ---------------------------------------------------------------------------
defineEvent({
  id: 'coronation',
  title: 'Coronation',
  stamp: 'Politics',
  weight: () => 1,
  requires: (w) => !w.crowned,
  duration: 15,
  setup(ev) {
    ev.city = capital();
    ev.name = ev.rng.pick(['Queen Beatrix the Adequate', 'King Gerald the Punctual', 'Queen Mildred the Slightly Taller',
      'King Bob', 'Queen Philippa the Mostly Awake', 'King Norbert the Reasonable']);
  },
  headline: (ev) => ({
    title: `${ev.name} is crowned in ${ev.city.name}`,
    sub: ev.rng.pick([
      'The crown was ordered in the wrong size. It was ordered in "enormous".',
      'First royal decree: naps are mandatory.',
      world.ruler === 'chef' ? 'The Royal Chef is thanked for his service and handed a very small apron.' : 'The previous ruling council is given a nice fruit basket.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 16, zoom: 2.3 }),
  start(ev) { ev.s.z = 90; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`The whole country gathers in ${c.name}. Most of them brought snacks.`));
    if (t < 7) ev.s.z = lerp(90, 14, smooth(t / 7));
    ev.at(3, 'b1', () => say(c, "It's a bit big, isn't it?", {}));
    ev.at(7, 'land', () => {
      camera.kick(2);
      fx.burst(c.x, c.y - 14, 30, { speed: 20, vz: 16, g: 12, colors: ['#f4c542', '#fff0a0', '#d8412e', '#3a8ad8'], life: 2 });
      world.crowned = true; world.ruler = 'monarch';
      ticker(`Long live ${ev.name}! The crown shrinks to fit, which is honestly a relief.`);
    });
    if (t > 7.5 && t < 13) ev.every('fw', 0.45, dt, () => {
      const k = ev.rng.pick(world.cities);
      fx.firework(k.x + ev.rng.range(-4, 4), k.y, ev.rng.range(24, 40));
    });
    ev.at(8, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.8));
    ev.at(10, 'b2', () => say(ev.rng.pick(otherCities(c)), 'Long live the whoever!', {}));
  },
  draw(ev, g, layer) {
    if (layer !== 'air' || ev.t >= 7) return;
    const c = ev.city, spr = SPR3.crown;
    const x = Math.round(c.x + offX(c.x, c.y) - spr.width), y = Math.round(c.y - ev.s.z - spr.height * 2);
    g.drawImage(spr, x, y + Math.round(Math.sin(ev.t * 2) * 1.5), spr.width * 2, spr.height * 2);
  },
  finish(ev) {
    world.crowned = true; world.ruler = 'monarch'; world.rulerName = ev.name;
    ev.delta('mood', +8);
    logCity(ev.city, `${ev.name} was crowned here`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'revolution',
  title: 'Revolution!',
  stamp: 'Politics',
  weight: () => 1.2,
  requires: (w) => w.crowned || w.ruler === 'chef',
  duration: 18,
  setup(ev) { ev.city = capital(); ev.was = world.ruler; },
  headline: (ev) => ({
    title: ev.was === 'chef' ? 'The people rise up against the Royal Chef' : `The people rise up against ${world.rulerName || 'the crown'}`,
    sub: ev.rng.pick([
      'Their demands are unclear but extremely loud.',
      'Pitchfork shortage reported. Several rebels bring forks.',
      'The revolution is scheduled to finish before dinner.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.mob = new Crowd();
    const c = ev.city;
    for (const k of otherCities(c).filter((k) => !world.split || k.side === c.side)) {
      for (let n = 0; n < 6; n++) {
        ev.s.mob.add({ x: k.x + ev.rng.range(-3, 3), y: k.y + ev.rng.range(-2, 2), tx: c.x, ty: c.y,
          ...spreadAround(0, 0, 9), speed: ev.rng.range(9, 14), color: ev.rng.pick(['#7a4a3a', '#5a6a3a', '#6a5a7a']), prop: '#c8c0b0', home: k });
      }
    }
    ev.s.newFlag = ev.rng.pick(['#c8412e', '#3a8ad8', '#e3a33a', '#7a3a9a', '#2b2622', '#e86aa0']);
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.s.mob.update(dt);
    ev.at(0.2, 't0', () => ticker('Pitchforks are sharpened. Torches are lit. Snacks are packed.'));
    ev.at(2.5, 'b1', () => say(ev.rng.pick(ev.s.mob.list), 'Down with... um...', {}));
    ev.at(3.8, 'b2', () => say(ev.rng.pick(ev.s.mob.list), '...HATS!', {}));
    ev.at(6.5, 'zoom', () => camera.focus(c.x, c.y - 8, 2.1, 0.8));
    ev.at(9, 'topple', () => {
      camera.kick(3);
      const lost = world.crowned ? 'crown' : 'ladle';
      world.crowned = false;
      if (world.ruler === 'chef') world.ruler = 'people';
      const land = { x: c.x + 26, y: c.y + 10 };
      fx.launch({
        x0: c.x, y0: c.y, z0: 12, x1: land.x, y1: land.y, z1: 0, arc: 30, dur: 1.4,
        draw: (g, x, y, p) => {
          if (lost === 'crown') { g.fillStyle = '#f4c542'; g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1); g.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1); }
          else { g.fillStyle = '#d8dce0'; g.fillRect(Math.round(x), Math.round(y) - 2, 1, 3); }
        },
        onHit: (p) => { if (map.oceanDepth(p.x, p.y) > 0 || !map.isWalkable(p.x, p.y)) fx.splash(p.x, p.y); else fx.dust(p.x, p.y, 6); },
      });
      say(c, lost === 'crown' ? 'Not the crown!' : 'Not the ladle!', {});
    });
    ev.at(10.5, 'flag', () => {
      world.flagColor = ev.s.newFlag; world.ruler = 'people';
      fx.burst(c.x, c.y - 12, 26, { speed: 18, vz: 14, g: 10, colors: ['#ffffff', ev.s.newFlag], life: 1.8 });
      ticker('A new flag is raised. It was designed by committee and it shows.');
    });
    ev.at(12, 'home', () => { ev.s.mob.send((a) => { a.tx = a.home.x; a.ty = a.home.y; }); camera.focus(W / 2, H / 2, 1.05, 0.8); });
    ev.at(13, 'b3', () => say(ev.rng.pick(ev.s.mob.list), 'Same time next year?', {}));
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.mob.draw(g, t); },
  finish(ev) {
    world.crowned = false; world.ruler = 'people'; world.flagColor = ev.s.newFlag || world.flagColor; world.rulerName = null;
    ev.delta('mood', +4);
    logCity(ev.city, 'Stormed during the Revolution. The gift shop survived');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'election',
  title: 'The Election Nobody Won',
  stamp: 'Politics',
  weight: () => 1,
  requires: (w) => w.era >= 1 && !w.split,
  duration: 17,
  setup(ev) {
    ev.city = capital();
    ev.a = ev.rng.pick(['The Sensible Party', 'The Party Party', 'Citizens for Longer Weekends', 'The Moderately Green Party']);
    ev.b = ev.rng.pick(['The Other Sensible Party', 'The Anti-Party Party', 'The Society of Shorter Weekends', 'The Moderately Blue Party']);
  },
  headline: (ev) => ({
    title: `${ev.a} and ${ev.b} face off at the polls`,
    sub: ev.rng.pick([
      'Both campaigns promise "more of the good stuff and less of the bad stuff".',
      'Turnout is expected to be high, mostly because there is free cake.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 10, zoom: 1.2 }),
  start(ev) { ev.s.coin = null; ev.s.votes = 0; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker('Polls open. Every town sends its ballots to the capital by very fast pigeon.'));
    if (t > 0.8 && t < 7) ev.every('ballot', 0.05, dt, () => {
      const from = ev.rng.pick(otherCities(c));
      fx.launch({
        x0: from.x, y0: from.y, x1: c.x + ev.rng.range(-4, 4), y1: c.y + ev.rng.range(-2, 2), z0: 2, z1: 6, arc: ev.rng.range(20, 36), dur: ev.rng.range(1, 1.6),
        draw: (g, x, y) => { g.fillStyle = '#f6f3ea'; g.fillRect(Math.round(x), Math.round(y), 2, 1); g.fillStyle = '#c8412e'; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
      });
    });
    ev.at(1.5, 'tally', () => { ev.s.tally = say(c, '0 vs 0', { life: 7.5, lift: 12 }); });
    if (ev.s.tally && t < 8) {
      ev.s.votes = Math.floor(Math.min(1, (t - 1.5) / 5.5) * 31337);
      ev.s.tally.set(`${fmt(ev.s.votes)} vs ${fmt(ev.s.votes)}`);
    }
    ev.at(7.5, 't1', () => ticker('The votes are counted. It is an exact tie. Down to the last vote. Twice.'));
    ev.at(8.5, 'zoom', () => camera.focus(c.x, c.y - 24, 2.3, 1));
    ev.at(9, 'coin', () => { ev.s.coin = { z: 0 }; say(c, 'Heads or tails?', {}); });
    if (ev.s.coin) {
      const u = clamp((t - 9) / 3.5, 0, 1);
      ev.s.coin.z = Math.sin(u * Math.PI) * 44 + 8;
      ev.s.coin.spin = u < 1 ? t * 14 : Math.PI / 2;
    }
    ev.at(12.5, 'edge', () => {
      camera.kick(2);
      ticker('The coin, larger than most houses, lands on its edge. A new election is scheduled for never.');
    });
    ev.at(13.5, 'b1', () => say(ev.rng.pick(otherCities(c)), 'Best of three?', {}));
  },
  draw(ev, g, layer) {
    if (layer !== 'air' || !ev.s.coin) return;
    const c = ev.city, spr = SPR3.coin;
    const w = Math.max(1, Math.round(Math.abs(Math.cos(ev.s.coin.spin)) * spr.width * 2));
    const x = Math.round(c.x + offX(c.x, c.y) - w / 2), y = Math.round(c.y - ev.s.coin.z - spr.height * 2);
    g.drawImage(spr, x, y, w, spr.height * 2);
  },
  finish(ev) {
    ev.delta('mood', -2);
    logCity(ev.city, 'Hosted the election nobody won. Keeps the coin in a museum');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'bureaucracy',
  title: 'The Bureaucratic Singularity',
  stamp: 'Politics',
  weight: () => 0.9,
  requires: (w) => w.era >= 1,
  duration: 16,
  setup(ev) {
    ev.city = capital();
    ev.px = ev.city.x - 14; ev.py = ev.city.y + 4;
    for (let k = 0; k < 60; k++) {
      const x = ev.city.x + ev.rng.range(-18, 18), y = ev.city.y + ev.rng.range(-4, 10);
      if (map.isWalkable(x, y) && dist(x, y, ev.city.x, ev.city.y) > 9) { ev.px = Math.round(x); ev.py = Math.round(y); break; }
    }
  },
  headline: (ev) => ({
    title: `Paperwork in ${ev.city.name} reaches critical mass`,
    sub: ev.rng.pick([
      'Form 27B/6 must now be filed in order to request Form 27B/6.',
      'A permit to remove the paperwork is currently being processed.',
      'Officials describe the situation as "under review", then fall asleep.',
    ]),
  }),
  focus: (ev) => ({ x: ev.px, y: ev.py - 14, zoom: 2.2 }),
  start(ev) { ev.s.h = 0; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker('Every town is asked to submit its paperwork in triplicate. It does so, in quintuplicate.'));
    if (t < 11) {
      ev.s.h = Math.min(34, ev.s.h + dt * 3.4);
      ev.every('paper', 0.06, dt, () => {
        const from = ev.rng.pick(world.cities);
        fx.launch({
          x0: from.x, y0: from.y, x1: ev.px + ev.rng.range(-3, 3), y1: ev.py, z0: 2, z1: ev.s.h, arc: 16, dur: ev.rng.range(1, 1.6),
          draw: (g, x, y) => { g.fillStyle = '#f6f3ea'; g.fillRect(Math.round(x), Math.round(y), 2, 1); },
        });
      });
    }
    ev.at(2.5, 'b1', () => say(c, 'Form 27B/6, please', {}));
    ev.at(5.5, 'b2', () => say(c, 'In triplicate!', {}));
    ev.at(8, 't1', () => ticker('The pile of paperwork is now visible from space, which requires another form.'));
    ev.at(11, 'collapse', () => {
      camera.kick(4);
      fx.burst(ev.px, ev.py, 40, { speed: 26, vz: 30, g: 30, bounce: 0.2, colors: ['#f6f3ea', '#e6e1d2', '#c9c3b2'], life: 2.4, layer: 'ground' });
      ticker(`The paper mountain settles next to ${c.name}. It is declared a national park.`);
      ev.s.fallen = true;
    });
    ev.at(12.5, 'b3', () => say(c, 'Is there a form to climb it?', {}));
  },
  draw(ev, g, layer) {
    if (layer !== 'ground') return;
    const x = Math.round(ev.px + offX(ev.px, ev.py)), y = ev.py;
    if (!ev.s.fallen) {
      const h = Math.round(ev.s.h);
      for (let k = 0; k < h; k++) {
        const wob = Math.round(Math.sin(k * 0.7 + ev.t * 2) * Math.min(2, k / 10));
        g.fillStyle = k % 3 === 0 ? '#d6d0c0' : '#f6f3ea';
        g.fillRect(x - 3 + wob, y - k, 7, 1);
      }
    }
  },
  finish(ev) {
    // the paper mountain stays, until it slowly composts into grass
    for (let r = 0; r < 7; r++) for (let dx = -8 + r; dx <= 8 - r; dx++) {
      stampPixel(ev.px + dx, ev.py - r, r % 2 ? '#f0ece0' : '#d6d0c0', 0.95);
    }
    ev.delta('mood', -4);
    logCity(ev.city, 'Home of the Paper Mountain National Park');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'relocation',
  title: 'Capital Relocation',
  stamp: 'Politics',
  weight: () => 0.8,
  requires: (w) => !w.split && w.eventsPlayed > 2,
  duration: 16,
  setup(ev) {
    ev.from = capital();
    const options = world.cities.filter((c) => c !== ev.from && c.side === 'west' && dist(c.x, c.y, ev.from.x, ev.from.y) > 40);
    ev.to = ev.rng.pick(options.length ? options : otherCities(ev.from).filter((c) => c.side === 'west'));
    if (!ev.to) ev.to = ev.rng.pick(otherCities(ev.from));
    ev.path = roadPath(ev.from, ev.to);
    ev.dur = clamp(ev.path.length / 14 + 5, 10, 22);
  },
  headline: (ev) => ({
    title: `The capital packs its bags and moves to ${ev.to.name}`,
    sub: ev.rng.pick([
      `${ev.from.name} is described as "fine about it" and "totally not crying".`,
      'Officials cite "better parking" and "a nicer view of the other towns".',
      'The castle walks there itself, because the moving company was booked.',
    ]),
  }),
  focus: (ev) => ({ x: ev.from.x, y: ev.from.y - 6, zoom: 2.2 }),
  start(ev) { ev.s.x = ev.from.x; ev.s.y = ev.from.y; ev.s.d = 0; ev.from.keepAway = true; },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`The castle in ${ev.from.name} stands up. It has legs. Nobody knew it had legs.`));
    ev.at(0.6, 'b0', () => say(ev.from, 'Where are you going?!', {}));
    if (t > 1.5 && !ev.s.arrived) {
      ev.s.d = Math.min(ev.path.length, ev.s.d + 14 * dt);
      const p = ev.path.at(ev.s.d);
      ev.s.x = p.x; ev.s.y = p.y;
      camera.focus(ev.s.x, ev.s.y - 6, 1.9, 2.5);
      if (Math.random() < 0.15) fx.dust(ev.s.x, ev.s.y + 1, 2);
      if (ev.s.d >= ev.path.length) {
        ev.s.arrived = true;
        ev.from.capital = false; ev.from.keepAway = false;
        ev.to.capital = true;
        camera.kick(2);
        fx.dust(ev.to.x, ev.to.y, 16);
        say(ev.to, ev.rng.pick(['Oh! Hello!', "We weren't expecting guests", 'Do you need a parking spot?']), {});
        ticker(`${ev.to.name} is the new capital. Property prices triple before lunch.`);
      }
    }
    ev.at(ev.dur * 0.45, 'b1', () => say({ x: ev.s.x, y: ev.s.y - 8 }, ev.rng.pick(['Just popping over', 'Nearly there', 'Are we there yet?']), { life: 2 }));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || ev.s.arrived) return;
    const x = Math.round(ev.s.x + offX(ev.s.x, ev.s.y)), y = Math.round(ev.s.y);
    const step = Math.sin(t * 10) > 0;
    const kh = 6 + ev.from.era;
    g.fillStyle = 'rgba(25,35,30,0.35)'; g.fillRect(x - 1, y + 1, 4, 1);
    g.fillStyle = '#5a4636'; g.fillRect(x - 1 + (step ? 0 : 1), y - 1, 1, 2); g.fillRect(x + 2 - (step ? 1 : 0), y - 1, 1, 2);
    g.fillStyle = ERAS[ev.from.era].keep; g.fillRect(x - 1, y - kh - 1, 4, kh);
    g.fillRect(x - 1, y - kh - 2, 1, 1); g.fillRect(x + 2, y - kh - 2, 1, 1);
    g.fillStyle = '#3d3a36'; g.fillRect(x, y - kh - 5, 1, 3);
    g.fillStyle = world.flagColor; g.fillRect(x + 1, y - kh - 5, 3, 1);
    g.fillStyle = '#8d6a44'; g.fillRect(x + 3, y - kh + 2, 3, 2);   // a suitcase
  },
  finish(ev) {
    ev.from.capital = false; ev.from.keepAway = false;
    ev.to.capital = true;
    logCity(ev.to, `Became the capital when the castle walked over from ${ev.from.name}`);
    logCity(ev.from, 'Used to be the capital. Is fine about it');
    ev.delta('mood', +1);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'rebrand',
  title: 'National Rebrand',
  stamp: 'Politics',
  weight: () => 0.8,
  requires: (w) => !w.split,
  duration: 14,
  setup(ev) {
    ev.names = [`${world.brand}™`, `New ${world.brand.replace(/^New /, '')}`, 'Eternia 2', 'Eternia: Director\'s Cut', 'eternia (lowercase)'];
    ev.final = ev.rng.pick(['Eternia Classic', 'Eternia (Original Recipe)', 'Eternia 2: Electric Boogaloo', 'Eternia+', 'Eternia, Probably']);
  },
  headline: (ev) => ({
    title: 'Eternia hires a branding agency',
    sub: ev.rng.pick([
      'The agency\'s first recommendation is to hire a second agency.',
      'Budget: 40 million coins. Result: a slightly different font.',
      'Citizens are asked to "get excited about the new us".',
    ]),
  }),
  focus: () => ({ x: map.centers.all.x, y: map.centers.all.y, zoom: 1.6 }),
  start() { document.body.classList.add('rebranding'); },
  update(ev) {
    ev.at(0.2, 't0', () => ticker('Focus groups are held. The focus groups are also rebranded.'));
    ev.at(12.5, 'quiet', () => document.body.classList.remove('rebranding'));
    ev.names.forEach((n, i) => ev.at(1.2 + i * 1.7, 'n' + i, () => {
      world.brand = n;
      camera.kick(1.5);
      fx.burst(map.centers.all.x, map.centers.all.y, 18, { speed: 22, colors: ['#ffffff', '#f4c542', '#e86aa0'], life: 0.9 });
    }));
    ev.at(3.5, 'b1', () => say(ev.rng.pick(world.cities), 'I liked the old one', {}));
    ev.at(7, 'b2', () => say(ev.rng.pick(world.cities), 'What was wrong with the old one?', {}));
    ev.at(10, 'final', () => {
      world.brand = ev.final;
      camera.kick(2.5);
      fx.burst(map.centers.all.x, map.centers.all.y, 36, { speed: 30, colors: ['#ffffff', '#f4c542', '#5ae8f0'], life: 1.2 });
      ticker(`The country is now officially "${ev.final}". The old signs are kept, just in case.`);
    });
  },
  finish(ev) {
    world.brand = ev.final;
    document.body.classList.remove('rebranding');
    ev.delta('mood', -1);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'secede',
  title: 'One Village Secedes',
  stamp: 'Politics',
  weight: () => 0.9,
  requires: () => true,
  duration: 15,
  setup(ev) {
    const small = world.cities.filter((c) => !c.capital && c.id !== world.eastCapitalId).sort((a, b) => a.popCap - b.popCap);
    ev.city = small[ev.rng.int(0, Math.min(2, small.length - 1))];
    ev.flag = ev.rng.pick(['#e86aa0', '#5ae8f0', '#f4c542', '#7ac04a']);
  },
  headline: (ev) => ({
    title: `${ev.city.name} declares independence`,
    sub: ev.rng.pick([
      'The new nation has a flag, an anthem and roughly one road.',
      'Its army is a goose. The goose is very committed.',
      'Foreign policy: "leave us alone, but also please visit".',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 4, zoom: 2.6 }),
  start(ev) { ev.s.ring = 0; ev.s.oldName = ev.city.name; },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`${c.name} draws a border around itself with a very long crayon.`));
    if (t > 0.8 && t < 4) ev.s.ring = clamp((t - 0.8) / 3, 0, 1);
    ev.at(4, 'free', () => {
      c.name = `Free Republic of ${ev.s.oldName}`;
      fx.burst(c.x, c.y - 8, 20, { speed: 16, colors: ['#ffffff', ev.flag], life: 1.2 });
      say(c, 'We have our own anthem now!', {});
    });
    ev.at(6.5, 'b1', () => say(c, "It's mostly humming", {}));
    ev.at(7.5, 't1', () => ticker(`The Free Republic of ${ev.s.oldName} issues its own currency: buttons.`));
    ev.at(10, 't2', () => ticker('Three days later the bread runs out. Negotiations begin immediately.'));
    ev.at(11.5, 'rejoin', () => { c.name = ev.s.oldName; ev.s.fading = true; say(c, "We're back! Did you miss us?", {}); });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    const c = ev.city;
    const alpha = ev.s.fading ? clamp(1 - (ev.t - 11.5) / 2, 0, 1) : 1;
    if (alpha <= 0) return;
    const ox = offX(c.x, c.y);
    g.globalAlpha = alpha;
    const n = 64;
    for (let k = 0; k < n * ev.s.ring; k++) {
      if (k % 3 === 2) continue;
      const a = (k / n) * TAU;
      const wx = c.x + Math.cos(a) * 11, wy = c.y - 1 + Math.sin(a) * 7;
      if (!map.isWalkable(wx, wy)) continue;   // a border stops at the shore
      g.fillStyle = ev.flag;
      g.fillRect(Math.round(wx + ox), Math.round(wy), 1, 1);
    }
    if (ev.t > 4) {
      const fxo = map.isWalkable(c.x + 5, c.y) ? 5 : -7;   // plant the flag on land
      g.fillStyle = '#3d3a36'; g.fillRect(Math.round(c.x + ox) + fxo, Math.round(c.y) - 8, 1, 6);
      g.fillStyle = ev.flag; g.fillRect(Math.round(c.x + ox) + fxo + 1, Math.round(c.y) - 8, 3 + (Math.sin(t * 6) > 0 ? 1 : 0), 2);
    }
    g.globalAlpha = 1;
  },
  finish(ev) {
    ev.city.name = ev.s.oldName || ev.city.name;
    ev.delta('mood', +2);
    logCity(ev.city, 'Was an independent nation for three days. Has the buttons to prove it');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'treaty',
  title: 'The Treaty of Snacks',
  stamp: 'Diplomacy',
  weight: (w) => (w.split ? 1.4 : 0.6),
  requires: () => true,
  duration: 16,
  setup(ev) {
    if (world.split) {
      ev.a = capitalOf('west'); ev.b = capitalOf('east');
      const y = Math.round(lerp(ev.a.y, ev.b.y, 0.5));
      let spot = null;
      for (let dy = 0; dy < 40 && !spot; dy++) for (const yy of [y + dy, y - dy]) {
        const x = Math.round(map.bx(yy)) - 5;
        if (map.isWalkable(x, yy) && map.isWalkable(x - 3, yy)) { spot = { x, y: yy }; break; }
      }
      ev.spot = spot || { x: ev.a.x + 6, y: ev.a.y + 4 };
    } else {
      const pairs = [];
      for (const a of world.cities) for (const b of world.cities) if (a.id < b.id && dist(a.x, a.y, b.x, b.y) < 70) pairs.push([a, b]);
      [ev.a, ev.b] = ev.rng.pick(pairs);
      let spot = { x: ev.a.x + 6, y: ev.a.y + 4 };
      for (let k = 0; k < 60; k++) {
        const u = ev.rng.range(0.35, 0.65);
        const x = Math.round(lerp(ev.a.x, ev.b.x, u) + ev.rng.range(-6, 6)), y = Math.round(lerp(ev.a.y, ev.b.y, u) + ev.rng.range(-4, 4));
        if (map.isWalkable(x, y) && map.isWalkable(x - 3, y) && map.isWalkable(x + 3, y)) { spot = { x, y }; break; }
      }
      ev.spot = spot;
    }
  },
  headline: (ev) => ({
    title: world.split ? 'East and West sit down for the Treaty of Snacks' : `${ev.a.name} and ${ev.b.name} settle a feud over snacks`,
    sub: ev.rng.pick([
      'The treaty is signed in crumbs. It is legally binding and slightly greasy.',
      'Talks nearly collapse over the last cheese puff.',
      'Diplomats agree on everything except who brought the dip.',
    ]),
  }),
  focus: (ev) => ({ x: ev.spot.x, y: ev.spot.y - 4, zoom: 2.6 }),
  start(ev) {
    ev.s.del = new Crowd();
    const sp = ev.spot;
    for (let k = 0; k < 3; k++) {
      ev.s.del.add({ x: ev.a.x + k, y: ev.a.y, tx: sp.x - 4, ty: sp.y - 1 + k, speed: 14, color: world.split ? SIDE.west.dark : '#3a5a7a', hat: '#2b2622', home: ev.a });
      ev.s.del.add({ x: ev.b.x + k, y: ev.b.y, tx: sp.x + 4, ty: sp.y - 1 + k, speed: 14, color: world.split ? SIDE.east.dark : '#7a3a4a', hat: '#2b2622', home: ev.b });
    }
  },
  update(ev, dt) {
    const t = ev.t, sp = ev.spot;
    ev.s.del.update(dt);
    ev.at(0.2, 't0', () => ticker('Delegates set off, each carrying a very serious briefcase full of crisps.'));
    if (t > 5 && t < 11) ev.every('crumb', 0.07, dt, () => fx.spawn({ x: sp.x + ev.rng.range(-3, 3), y: sp.y, z: 2, vz: 6, vx: ev.rng.range(-5, 5), g: 30, bounce: 0.2, life: 1, colors: ['#e8c070', '#c8962a'], layer: 'ground' }));
    ev.at(5.5, 'b1', () => say(ev.rng.pick(ev.s.del.list.filter((a) => a.home === ev.a)), 'Pass the crisps', { align: 'left' }));
    ev.at(7.5, 'b2', () => say(ev.rng.pick(ev.s.del.list.filter((a) => a.home === ev.b)), 'Is this clause about cheese?', { align: 'right' }));
    ev.at(10, 'sign', () => {
      fx.burst(sp.x, sp.y - 3, 24, { speed: 16, colors: ['#fffbe0', '#f4c542'], life: 1 });
      ticker('The treaty is signed in crumbs. Historians will argue over the smudges for centuries.');
    });
    ev.at(11.5, 'home', () => ev.s.del.send((a) => { a.tx = a.home.x; a.ty = a.home.y; }));
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground') return;
    const sp = ev.spot;
    drawSprite(g, SPR3.table, sp.x + offX(sp.x, sp.y), sp.y);
    ev.s.del.draw(g, t);
  },
  finish(ev) {
    // a treaty makes the eventual reunification a bit more likely
    if (world.split) world.splitAt -= 2;
    ev.delta('mood', +7);
    logCity(ev.a, `Signed the Treaty of Snacks with ${ev.b.name}`);
    logCity(ev.b, `Signed the Treaty of Snacks with ${ev.a.name}`);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'census',
  title: 'The Great Census',
  stamp: 'Politics',
  weight: () => 0.9,
  requires: (w) => w.era >= 1,
  duration: 15,
  setup(ev) { ev.city = capital(); },
  headline: (ev) => ({
    title: 'Eternia attempts to count everyone',
    sub: ev.rng.pick([
      'Citizens asked to stand still. Several have been standing still since Tuesday.',
      'Counters are issued one pencil each and told to "go".',
      'Cows keep getting counted by mistake. The cows are delighted.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.takers = new Crowd();
    for (const c of otherCities(ev.city)) {
      if (world.split && c.side !== ev.city.side) continue;
      ev.s.takers.add({ x: ev.city.x, y: ev.city.y, tx: c.x, ty: c.y + 3, speed: ev.rng.range(18, 26), color: '#3a5a7a', prop: '#f6f3ea', town: c });
    }
    ev.s.count = 0;
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.s.takers.update(dt);
    ev.at(0.2, 't0', () => ticker('Census takers fan out across the country with clipboards and determination.'));
    ev.at(0.5, 'counter', () => { ev.s.board = say(c, 'Counted: 0', { life: 14, lift: 14 }); });
    for (const a of ev.s.takers.list) {
      if (!ev.s.takers.arrived(a)) continue;
      if (Math.random() < dt * 14) fx.spawn({ x: a.town.x + ev.rng.range(-5, 5), y: a.town.y, z: 1, vz: 14, g: 30, life: 0.8, colors: ['#f4c542', '#ffffff'], layer: 'air' });
    }
    if (t < 10.5) ev.s.count = Math.min(65535, Math.floor(Math.pow(clamp((t - 1) / 9.5, 0, 1), 2) * 65535));
    ev.at(10.5, 'overflow', () => {
      ev.s.count = 0;
      camera.kick(2);
      ticker('The counter reaches 65,535, then flips over to zero. Official population: nobody. The population objects.');
    });
    if (ev.s.board) ev.s.board.set(`Counted: ${fmt(ev.s.count)}`);
    ev.at(11.5, 'b1', () => say(ev.rng.pick(otherCities(c)), 'Excuse me, I exist', {}));
    ev.at(12.5, 'home', () => ev.s.takers.send((a) => { a.tx = c.x; a.ty = c.y; }));
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.takers.draw(g, t); },
  finish(ev) {
    ev.delta('mood', -1);
    logCity(ev.city, 'Ran the Great Census. Lost count at 65,535');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'peas',
  title: 'The Peasant Uprising',
  stamp: 'Politics',
  weight: () => 0.9,
  requires: () => true,
  duration: 18,
  setup(ev) { ev.city = capital(); },
  headline: (ev) => ({
    title: 'Peasant uprising turns out to be an uprising of actual peas',
    sub: ev.rng.pick([
      'Their demands: more butter, less soup.',
      `${ev.city.name} barricades the kitchens.`,
      'Experts confirm the peas are "very small but very organised".',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    ev.s.peas = new Crowd();
    const c = ev.city;
    for (let k = 0; k < 140; k++) {
      const ci = randomLandCell(ev.rng, (x) => cells.biome[x] === BIOME.PLAINS && dist(cellX(x), cellY(x), c.x, c.y) > 25 && dist(cellX(x), cellY(x), c.x, c.y) < 95);
      if (ci < 0) continue;
      ev.s.peas.add({ kind: 'pea', x: cellX(ci), y: cellY(ci), tx: c.x, ty: c.y, ...spreadAround(0, 0, 12), speed: ev.rng.range(12, 18) });
    }
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city, peas = ev.s.peas;
    if (t > 1) peas.update(dt);
    ev.at(0.2, 't0', () => ticker('Every field in Eternia starts rolling towards the capital.'));
    ev.at(3.5, 'b1', () => say(ev.rng.pick(peas.list), 'Give peas a chance!', {}));
    ev.at(6.5, 'zoom', () => camera.focus(c.x, c.y, 2, 0.8));
    ev.at(8, 'b2', () => say(c, 'Is that... peas?', {}));
    ev.at(10, 'butter', () => {
      say(c, 'Would you like some butter?', {});
      ticker('The government offers butter. The peas accept. The uprising is over.');
    });
    ev.at(11, 'cheer', () => { for (const p of peas.list) p.down = 0; fx.hearts(c.x, c.y - 3); fx.hearts(c.x + 6, c.y); });
    ev.at(12, 'home', () => { peas.send((p) => { p.tx = p.x + ev.rng.range(-60, 60); p.ty = p.y + ev.rng.range(-40, 40); }); camera.focus(W / 2, H / 2, 1.05, 0.8); });
  },
  draw(ev, g, layer, t) { if (layer === 'ground') ev.s.peas.draw(g, t); },
  finish(ev) {
    ev.delta('mood', +3);
    logCity(ev.city, 'Survived the Peasant Uprising. Butter reserves low');
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'taxman',
  title: "The Tax Collector's Tour",
  stamp: 'Politics',
  weight: () => 1,
  requires: (w) => w.era >= 1 && w.roadReveal.every((r) => r > 0.99),
  duration: 20,
  setup(ev) {
    ev.start = capital();
    ev.route = roadRoute(ev.start, 7, ev.rng);
    ev.dur = clamp(ev.route.length / 30 + 4, 10, 22);
  },
  headline: (ev) => ({
    title: 'The tax collector begins his annual tour',
    sub: ev.rng.pick([
      'Every town he visits shrinks slightly, out of embarrassment.',
      'New taxes this year include a tax on complaining about taxes.',
      'He is very polite about it, which somehow makes it worse.',
    ]),
  }),
  focus: (ev) => ({ x: ev.start.x, y: ev.start.y, zoom: 2 }),
  start(ev) { ev.s.cart = new Spine(3, 3, ev.start.x, ev.start.y); ev.s.d = 0; ev.s.visited = new Set([ev.start.id]); },
  update(ev, dt) {
    const t = ev.t;
    ev.at(0.2, 't0', () => ticker(`The tax carriage leaves ${ev.start.name}. Curtains close in every town.`));
    if (t < 1) return;
    ev.s.d = Math.min(ev.route.length, ev.s.d + 30 * dt);
    const h = ev.route.at(ev.s.d);
    ev.s.cart.lead(h.x, h.y);
    camera.focus(h.x, h.y, 1.8, 2);
    for (const c of world.cities) {
      if (ev.s.visited.has(c.id) || dist(c.x, c.y, h.x, h.y) > 7) continue;
      ev.s.visited.add(c.id);
      c.shrink = 0.35;
      for (let k = 0; k < 8; k++) {
        fx.launch({
          x0: c.x + ev.rng.range(-4, 4), y0: c.y, z0: 2, x1: h.x, y1: h.y, z1: 1, arc: 10, dur: 0.5 + k * 0.05,
          draw: (g, x, y) => { g.fillStyle = '#f4c542'; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
        });
      }
      say(c, ev.rng.pick(['Again?!', 'We paid last year!', 'Can we pay in turnips?', 'Take the goose instead']), {});
      if (ev.s.visited.size % 2 === 0) ticker(`${c.name} pays up and shrinks slightly, out of embarrassment.`);
    }
    if (Math.random() < 0.2) fx.spawn({ x: h.x, y: h.y, z: 2, vz: 8, g: 30, bounce: 0.3, life: 0.8, colors: ['#f4c542', '#c8962a'], layer: 'ground' });
  },
  draw(ev, g, layer, t) {
    if (layer !== 'ground' || !ev.s.cart) return;
    const [horse, cart, back] = ev.s.cart.nodes;
    const hx = Math.round(horse.x + offX(horse.x, horse.y)), hy = Math.round(horse.y);
    g.fillStyle = '#7a5234'; g.fillRect(hx - 1, hy - 2, 3, 2); g.fillRect(hx + 1, hy - 3, 1, 1);
    g.fillStyle = '#5a3a24'; g.fillRect(hx - 1 + (Math.sin(t * 14) > 0 ? 0 : 1), hy, 1, 1); g.fillRect(hx + 1 - (Math.sin(t * 14) > 0 ? 0 : 1), hy, 1, 1);
    const cx = Math.round(cart.x + offX(cart.x, cart.y)), cy = Math.round(cart.y);
    g.fillStyle = 'rgba(20,30,25,0.35)'; g.fillRect(cx - 2, cy + 1, 5, 1);
    g.fillStyle = '#2b2622'; g.fillRect(cx - 2, cy - 3, 5, 3);
    g.fillStyle = '#8a1f2a'; g.fillRect(cx - 1, cy - 2, 3, 1);
    g.fillStyle = '#f4c542'; g.fillRect(cx, cy - 4, 1, 1); g.fillRect(cx - 2, cy, 1, 1); g.fillRect(cx + 2, cy, 1, 1);
    void back;
  },
  finish(ev) {
    for (const c of world.cities) c.shrink = 0;
    ev.delta('mood', -8);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'goldenage',
  title: 'The Golden Age',
  stamp: 'Good news',
  weight: (w) => (w.mood > 60 ? 1.2 : 0.4),
  requires: (w) => w.devastation < 0.3,
  duration: 16,
  setup() {},
  headline: (ev) => ({
    title: 'Eternia enters a Golden Age',
    sub: ev.rng.pick([
      'Everything is going well, which everyone finds deeply suspicious.',
      'Statues are commissioned of people who were simply nice.',
      'Poets run out of words for "lovely" and start inventing new ones.',
    ]),
  }),
  focus: () => ({ x: W / 2, y: H / 2, zoom: 1.05 }),
  start(ev) {
    world.grades.glow.t = 1;
    ev.s.cover = new Cover({ alpha: 0.5, color: (ci, v) => (dith(ci, v * 0.35) ? (noiseAt(ci) > 0.5 ? P('#f4d45a') : P('#e8b83a')) : 0) });
    for (const c of world.cities) ev.s.cover.seedAt(c.x, c.y, 3);
  },
  update(ev, dt) {
    const t = ev.t, cv = ev.s.cover;
    ev.at(0.2, 't0', () => ticker('Crops are up. Crime is down. Someone invents a sandwich that never gets soggy.'));
    if (t < 9) cv.grow(dt, 1400, (ci) => cells.land[ci]);
    world.cities.forEach((c, i) => ev.at(2 + i * 0.6, 'st' + c.id, () => {
      c.souvenirs.add('statue');
      fx.burst(c.x + 7, c.y - 3, 10, { speed: 12, colors: ['#fff0a0', '#f4c542'], life: 0.9 });
    }));
    ev.at(5, 'b1', () => say(ev.rng.pick(world.cities), 'Everything is lovely!', {}));
    ev.at(8, 'b2', () => say(ev.rng.pick(world.cities), 'Who is the statue of?', {}));
    ev.at(9, 'b3', () => say(ev.rng.pick(world.cities), 'Gary. He held a door once.', {}));
    ev.at(12, 'fade', () => { world.grades.glow.t = 0; });
    if (t > 11.5) cv.fade(dt, 0.3);
  },
  finish(ev) {
    ev.s.cover.remove();
    world.grades.glow.t = 0;
    for (const c of world.cities) c.souvenirs.add('statue');
    ev.delta('mood', +15);
  },
});

// ---------------------------------------------------------------------------
defineEvent({
  id: 'chefcoup',
  title: 'Coup by the Royal Chef',
  stamp: 'Politics',
  weight: () => 0.9,
  requires: (w) => w.ruler !== 'chef' && !w.split,
  duration: 16,
  setup(ev) {
    ev.city = capital();
    ev.from = ev.rng.pick(otherCities(ev.city).filter((c) => dist(c.x, c.y, ev.city.x, ev.city.y) < 80)) || ev.rng.pick(otherCities(ev.city));
    ev.dish = ev.rng.pick(['soup', 'a very large stew', 'porridge', 'the national casserole']);
  },
  headline: (ev) => ({
    title: `The Royal Chef seizes power with ${ev.dish}`,
    sub: ev.rng.pick([
      'The ladle replaces the sceptre as the symbol of the state.',
      'First decree: second breakfast is now compulsory.',
      'Nobody resists, because the chef was holding a very hot pot.',
    ]),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y - 8, zoom: 2.3 }),
  start(ev) {
    ev.s.z = 80;
    ev.s.hadCrown = world.crowned;
  },
  update(ev, dt) {
    const t = ev.t, c = ev.city;
    ev.at(0.2, 't0', () => ticker(`The Royal Chef walks out of the kitchen in ${c.name} holding a ladle. He does not put it back.`));
    ev.at(1, 'b0', () => say(c, 'I have an announcement', {}));
    if (t > 2 && t < 6) ev.s.z = lerp(80, 12, smooth((t - 2) / 4));
    ev.at(6, 'land', () => {
      camera.kick(3);
      if (ev.s.hadCrown) {
        world.crowned = false;
        fx.launch({
          x0: c.x, y0: c.y, z0: 12, x1: c.x - 20, y1: c.y + 8, z1: 0, arc: 24, dur: 1.2,
          draw: (g, x, y) => { g.fillStyle = '#f4c542'; g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); },
          onHit: (p) => fx.dust(p.x, p.y, 5),
        });
      }
      world.ruler = 'chef';
      ticker(`The ladle of state is installed. ${ev.dish[0].toUpperCase() + ev.dish.slice(1)} is served nationwide.`);
    });
    ev.at(7, 'zoom', () => camera.focus(W / 2, H / 2, 1.05, 0.8));
    if (t > 7 && t < 13) ev.every('steam', 0.12, dt, () => {
      const k = ev.rng.pick(world.cities);
      fx.smoke(k.x + ev.rng.range(-4, 4), k.y - 2, { life: 1.6, rise: 6, colors: ['#ffffff', '#e8eef0', '#cfd8dc'] });
    });
    ev.at(8.5, 'b1', () => say(ev.rng.pick(world.cities), 'Soup for everyone!', {}));
    ev.at(10.5, 'b2', () => say(ev.rng.pick(world.cities), 'Is it soup again?', {}));
    ev.at(12.5, 'b3', () => say(c, 'It is always soup now.', {}));
  },
  draw(ev, g, layer) {
    if (layer !== 'air' || ev.t >= 6) return;
    const c = ev.city, spr = SPR3.ladle;
    const x = Math.round(c.x + offX(c.x, c.y) - spr.width), y = Math.round(c.y - ev.s.z - spr.height * 2);
    g.drawImage(spr, x, y, spr.width * 2, spr.height * 2);
  },
  finish(ev) {
    world.ruler = 'chef'; world.crowned = false; world.rulerName = 'the Royal Chef';
    ev.delta('mood', +3);
    logCity(ev.city, 'Seat of the Royal Chef. Always smells of soup');
  },
});
