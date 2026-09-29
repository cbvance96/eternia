// ============================================================================
// 06 AMBIENT — the background life that makes Eternia worth watching between
// disasters. Boats wander like Nagomi's koi, caravans follow the roads.
// ============================================================================

const ambient = { boats: [], caravans: [] };

function resetAmbient() {
  const r = new RNG(world.seed ^ 0xB0A7);
  ambient.boats = [];
  for (let tries = 0; ambient.boats.length < 7 && tries < 2000; tries++) {
    const x = r.range(20, W - 20), y = r.range(16, H - 16);
    const d = map.oceanDepth(x, y);
    if (d < 5 || d > 30) continue;
    ambient.boats.push({ x, y, heading: r.range(0, TAU), speed: r.range(3.5, 6), wake: 0, seed: r.range(0, 100) });
  }
  ambient.caravans = [];
  for (let k = 0; k < 6; k++) {
    const road = r.pick(map.roads);
    ambient.caravans.push({ road, forward: r.chance(0.5), s: r.range(0, road.pts.length - 1), speed: r.range(4, 7), pause: 0 });
  }
}

function updateAmbient(dt, t) {
  // boats: wander, and turn toward deeper water when the coast gets close
  for (const b of ambient.boats) {
    if (b.hidden || b.hold || world.freezeTraffic) continue;
    b.heading += Math.sin(t * 0.3 + b.seed) * 0.35 * dt;
    const ahead = (a) => map.oceanDepth(b.x + Math.cos(a) * 9, b.y + Math.sin(a) * 9);
    if (ahead(b.heading) < 4 || b.x < 12 || b.x > W - 12 || b.y < 10 || b.y > H - 10) {
      const left = ahead(b.heading - 0.7), right = ahead(b.heading + 0.7);
      b.heading += (left > right ? -1 : 1) * 1.8 * dt;
      if (b.x < 12 || b.x > W - 12 || b.y < 10 || b.y > H - 10) {
        const toCenter = Math.atan2(H / 2 - b.y, W / 2 - b.x);
        b.heading += Math.sin(toCenter - b.heading) * 2 * dt;
      }
    }
    const nx = b.x + Math.cos(b.heading) * b.speed * dt, ny = b.y + Math.sin(b.heading) * b.speed * dt;
    if (map.oceanDepth(nx, ny) >= 2) { b.x = nx; b.y = ny; } else b.heading += 2 * dt;
    b.wake -= dt;
    if (b.wake <= 0) {
      b.wake = 0.35;
      fx.spawn({ x: b.x - Math.cos(b.heading) * 2, y: b.y - Math.sin(b.heading) * 2, life: 1.2, colors: ['#bfe0d6', '#8cc0c0'], layer: 'ground' });
    }
  }
  // caravans: trundle along roads between towns; border crossings close during a split
  for (const c of ambient.caravans) {
    if (world.freezeTraffic) continue;
    if (c.pause > 0) { c.pause -= dt; continue; }
    c.s += (c.forward ? 1 : -1) * c.speed * dt * (world.trafficSpeed || 1);
    const last = c.road.pts.length - 1;
    if (c.s <= 0 || c.s >= last) {
      const cityId = c.s <= 0 ? c.road.a : c.road.b;
      c.s = clamp(c.s, 0, last);
      let options = map.roads.filter((rd) => rd.a === cityId || rd.b === cityId);
      if (world.split) {
        const open = options.filter((rd) => !rd.crossesBorder);
        if (open.length) options = open;
      }
      const next = world.rng.pick(options);
      c.road = next;
      c.forward = next.a === cityId;
      c.s = c.forward ? 0 : next.pts.length - 1;
      c.pause = world.rng.range(0.5, 2.5);
    }
  }
  // the rabbits that stayed behind
  for (const r of world.rabbits) hopRabbit(r, dt, null);
  // smoke from damaged towns and industrial chimneys
  for (const c of world.cities) {
    if (c.lift > 0) continue;
    if (c.damage > 0.2 && Math.random() < dt * 5 * c.damage) {
      const b = c.buildings[(Math.random() * c.buildings.length) | 0];
      fx.smoke(c.x + b.dx, c.y + b.dy - 1, { life: 2 });
    }
    if (ERAS[c.era].stacks && Math.random() < dt * 1.5) {
      const b = c.buildings[0];
      fx.smoke(c.x + b.dx + 1, c.y + b.dy - 5, { life: 1.6, colors: ['#8a8680', '#6a6662'] });
    }
  }
}

function drawAmbientGround(g, t) {
  for (const b of ambient.boats) {
    if (b.hidden) continue;
    const x = Math.round(b.x + offX(b.x, b.y)), y = Math.round(b.y);
    const dir = Math.cos(b.heading) >= 0 ? 1 : -1;
    g.fillStyle = '#5c3e28'; g.fillRect(x - 1, y, 3, 1);
    g.fillStyle = '#f2eee2'; g.fillRect(x, y - 2, 1, 2);
    g.fillStyle = '#dcd6c6'; g.fillRect(x + dir, y - 1, 1, 1);
  }
  for (const c of ambient.caravans) {
    const p = c.road.pts[Math.round(c.s)];
    if (!p || world.roadReveal[c.road.id] < 0.99 || world.era === 0) continue;
    const x = Math.round(p.x + offX(p.x, p.y)), y = Math.round(p.y);
    g.fillStyle = '#6e4a2e'; g.fillRect(x, y, 2, 1);
    g.fillStyle = '#efe3c2'; g.fillRect(x, y - 1, 2, 1);
  }
  drawRabbits(g, world.rabbits);
}

// shared rabbit behaviour (also used by the Rabbit event)
function hopRabbit(r, dt, target, swim = false) {
  r.ht -= dt;
  if (r.ht <= 0) {
    r.ht = r.fast ? 0.14 + Math.random() * 0.3 : 0.25 + Math.random() * 0.5;
    let a = Math.random() * TAU;
    if (target) a = Math.atan2(target.y - r.y, target.x - r.x) + (Math.random() - 0.5) * 1.6;
    else if (r.home) a = Math.atan2(r.y - r.home.y, r.x - r.home.x) + (Math.random() - 0.5) * 2.6;
    const s = r.fast ? 12 + Math.random() * 12 : 9 + Math.random() * 9;
    r.vx = Math.cos(a) * s; r.vy = Math.sin(a) * s * 0.8;
    r.hop = 0.22;
  }
  if (r.hop > 0) {
    r.hop -= dt;
    const nx = r.x + r.vx * dt, ny = r.y + r.vy * dt;
    if (swim || map.isWalkable(nx, ny)) { r.x = nx; r.y = ny; } else r.ht = 0;
    r.z = Math.sin(clamp(r.hop / 0.22, 0, 1) * Math.PI) * 1.5;
  } else r.z = 0;
}
function drawRabbits(g, list) {
  for (const r of list) {
    const x = Math.round(r.x + offX(r.x, r.y)), y = Math.round(r.y - r.z);
    g.fillStyle = r.grey ? '#b9b2a8' : '#ece7dc';
    g.fillRect(x, y, 2, 1);
    g.fillRect(x + (r.vx > 0 ? 1 : 0), y - 1, 1, 1);
  }
}
