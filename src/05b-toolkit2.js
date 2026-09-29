// ============================================================================
// 05b TOOLKIT, PART 2 — the pieces Phase 4 needed:
//   Cover   a terrain painter: fire, flood, snow, drought, flowers, lava...
//   weather rain, snow and ash that fall wherever the camera is looking
//   Spine   Nagomi's chain: a head leads, every node follows at a fixed gap
//   eraWave towns upgrade (or regress) one by one, rippling out from a place
// ============================================================================

// ---- a half-resolution grid of cells that covers paint into -----------------------
const CS = 2, CW = W / CS, CH = H / CS, CN = CW * CH;
const cells = {};
function initCells() {
  cells.land = new Uint8Array(CN);
  cells.wet = new Uint8Array(CN);
  cells.wetAny = new Uint8Array(CN);
  cells.biome = new Uint8Array(CN);
  cells.elev = new Float32Array(CN);
  cells.coast = new Uint8Array(CN);    // distance to the ocean, in world pixels
  cells.noise = new Float32Array(CN);
  const landElev = [];
  for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
    const ci = cy * CW + cx, i = cy * CS * W + cx * CS;
    cells.land[ci] = map.land[i] && !map.wet[i] && !map.island[i] ? 1 : 0;
    cells.wet[ci] = map.wet[i];
    cells.wetAny[ci] = map.wet[i] || map.wet[i + 1] || map.wet[i + W] || map.wet[i + W + 1] ? 1 : 0;
    cells.biome[ci] = map.biome[i];
    cells.elev[ci] = map.elev[i];
    cells.coast[ci] = map.landDist[i];
    cells.noise[ci] = hash2(cx * 3 + 1, cy * 7 + 2);
    if (cells.land[ci]) landElev.push(map.elev[i]);
  }
  landElev.sort((a, b) => a - b);
  cells.elevAt = (q) => landElev[Math.floor(clamp(q, 0, 0.999) * landElev.length)];
}
const cellOf = (x, y) => clamp(Math.round(y / CS), 0, CH - 1) * CW + clamp(Math.round(x / CS), 0, CW - 1);
const cellX = (ci) => (ci % CW) * CS + 1;
const cellY = (ci) => Math.floor(ci / CW) * CS + 1;

const covers = [];
class Cover {
  // color(ci, value, t) returns a packed colour (or 0 for nothing) for one cell
  constructor({ color, animated = false, alpha = 1 }) {
    this.f = new Float32Array(CN);
    this.frontier = [];
    this.acc = 0;
    this.color = color;
    this.animated = animated;
    this.alpha = alpha;
    this.canvas = makeCanvas(CW, CH);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(CW, CH);
    this.px = new Uint32Array(this.img.data.buffer);
    this.dirty = true;
    covers.push(this);
  }
  seed(ci, v = 1) {
    if (ci < 0 || ci >= CN) return;
    if (this.f[ci] === 0) this.frontier.push(ci);
    this.f[ci] = Math.max(this.f[ci], v);
    this.dirty = true;
  }
  seedAt(x, y, r = 0, v = 1) {
    if (r <= 0) { this.seed(cellOf(x, y), v); return; }
    for (let dy = -r; dy <= r; dy += CS) for (let dx = -r; dx <= r; dx += CS) {
      if (dx * dx + dy * dy <= r * r) this.seed(cellOf(x + dx, y + dy), v);
    }
  }
  // spread outward from the frontier; allow(ci) decides where it can go
  grow(dt, perSecond, allow, value = () => 1) {
    this.acc += dt * perSecond;
    let n = Math.floor(this.acc);
    this.acc -= n;
    const fr = this.frontier;
    while (n-- > 0 && fr.length) {
      const k = (Math.random() * fr.length) | 0;
      const ci = fr[k];
      const cx = ci % CW;
      const dir = (Math.random() * 4) | 0;
      const nb = dir === 0 ? (cx > 0 ? ci - 1 : -1) : dir === 1 ? (cx < CW - 1 ? ci + 1 : -1) : dir === 2 ? ci - CW : ci + CW;
      if (nb >= 0 && nb < CN && this.f[nb] === 0 && allow(nb, ci)) {
        this.f[nb] = value(nb, ci);
        fr.push(nb);
        this.dirty = true;
      } else if (Math.random() < 0.12) {
        fr[k] = fr[fr.length - 1]; fr.pop();
      }
    }
  }
  // dissolve unevenly, cell by cell, which reads as pixel-art melting
  fade(dt, rate) {
    const f = this.f, nz = cells.noise;
    for (let i = 0; i < CN; i++) {
      if (f[i] > 0) { f[i] -= dt * rate * (0.4 + nz[i] * 1.2); if (f[i] < 0) f[i] = 0; }
    }
    this.frontier = this.frontier.filter((ci) => f[ci] > 0);
    this.dirty = true;
    let alive = 0;
    for (let i = 0; i < CN; i++) if (f[i] > 0) { alive = 1; break; }
    this.alive = alive;
  }
  count() { let n = 0; for (let i = 0; i < CN; i++) if (this.f[i] > 0) n++; return n; }
  render(t) {
    if (!this.dirty && !this.animated) return;
    const f = this.f, px = this.px;
    for (let i = 0; i < CN; i++) px[i] = f[i] > 0 ? this.color(i, f[i], t) : 0;
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = false;
  }
  // removing a cover lets it melt away over about a second instead of vanishing
  remove() { this.dying = true; }
  kill() { const k = covers.indexOf(this); if (k >= 0) covers.splice(k, 1); }
}
// a dithered colour helper for covers: shows the cell only once value beats the pattern
const dith = (ci, v) => v > bayer(ci % CW, Math.floor(ci / CW));
const P = (hex) => packRgb(hexToRgb(hex));

// ---- weather ------------------------------------------------------------------------
const weather = {
  rain: 0, rainT: 0, snow: 0, snowT: 0, ash: 0, ashT: 0, acc: 0,
  reset() { this.rain = this.rainT = this.snow = this.snowT = this.ash = this.ashT = 0; },
  update(dt) {
    this.rain = approach(this.rain, this.rainT, 1.2, dt);
    this.snow = approach(this.snow, this.snowT, 1.0, dt);
    this.ash = approach(this.ash, this.ashT, 0.8, dt);
    const v = camera.view();
    const area = (v.w * v.h) / (W * H);
    const spawn = (n, make) => {
      let k = n * dt * area;
      while (k > 0) { if (Math.random() < k) make(v.x0 - 10 + Math.random() * (v.w + 30), v.y0 + Math.random() * (v.h + 40)); k -= 1; }
    };
    if (this.rain > 0.02) {
      spawn(this.rain * 1500, (x, y) => {
        const z = 30 + Math.random() * 60;
        fx.spawn({ x, y, z, vx: -18, vz: -140, life: z / 140, colors: ['#dbeaf2', '#b9d4e0'], streak: true, fade: false, layer: 'air' });
      });
      if (Math.random() < this.rain * dt * 30) {
        const x = v.x0 + Math.random() * v.w, y = v.y0 + Math.random() * v.h;
        if (map.oceanDepth(x, y) > 1) fx.ring(x, y, { max: 4, speed: 8, color: '#a8d0d4' });
      }
    }
    if (this.snow > 0.02) {
      spawn(this.snow * 160, (x, y) => {
        const z = 30 + Math.random() * 40;
        fx.spawn({ x, y, z, vx: 3 + Math.random() * 3, vz: -12 - Math.random() * 6, life: z / 15, colors: ['#ffffff', '#eef4f8'], fade: false, layer: 'air' });
      });
    }
    if (this.ash > 0.02) {
      spawn(this.ash * 120, (x, y) => {
        const z = 30 + Math.random() * 40;
        fx.spawn({ x, y, z, vx: 4, vz: -9, life: z / 11, colors: ['#9a9590', '#77726e'], layer: 'air' });
      });
    }
  },
};

// ---- spine: a chain of nodes, each following the one ahead ------------------------------
class Spine {
  constructor(n, gap, x, y) {
    this.gap = gap;
    this.nodes = Array.from({ length: n }, () => ({ x, y }));
  }
  lead(x, y) {
    const ns = this.nodes;
    ns[0].x = x; ns[0].y = y;
    for (let k = 1; k < ns.length; k++) {
      const a = ns[k - 1], b = ns[k];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > this.gap) { b.x = a.x + (dx / d) * this.gap; b.y = a.y + (dy / d) * this.gap; }
    }
  }
}

// ---- a route along the road network: a list of points to follow ------------------------
function roadRoute(startCity, legs, rng) {
  const pts = [];
  const visited = [];
  let at = startCity.id, prevRoad = null;
  for (let k = 0; k < legs; k++) {
    let options = map.roads.filter((r) => (r.a === at || r.b === at) && r !== prevRoad);
    if (world.split) options = options.filter((r) => !r.crossesBorder);
    const fresh = options.filter((r) => !visited.includes(r));
    if (fresh.length) options = fresh;
    if (!options.length) break;
    const road = rng.pick(options);
    const seq = road.a === at ? road.pts : road.pts.slice().reverse();
    for (const p of seq) pts.push(p);
    visited.push(road);
    prevRoad = road;
    at = road.a === at ? road.b : road.a;
  }
  // cumulative distances so a head can travel at constant speed
  const lens = [0];
  for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + dist(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y));
  return {
    pts, length: lens[lens.length - 1] || 0,
    at(s) {
      s = clamp(s, 0, this.length);
      let lo = 0, hi = lens.length - 1;
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (lens[mid] <= s) lo = mid; else hi = mid; }
      const u = (s - lens[lo]) / Math.max(0.0001, lens[hi] - lens[lo]);
      return { x: lerp(pts[lo].x, pts[hi].x, u), y: lerp(pts[lo].y, pts[hi].y, u) };
    },
  };
}

// ---- eras move forward (or backward) one town at a time --------------------------------
function eraWave(ev, newEra, t0, span, origin, onTown) {
  if (!ev.s.eraOrder) {
    ev.s.eraOrder = world.cities.slice().sort((a, b) => dist(a.x, a.y, origin.x, origin.y) - dist(b.x, b.y, origin.x, origin.y));
  }
  ev.at(t0, 'eraStart', () => { world.era = newEra; });
  const order = ev.s.eraOrder;
  order.forEach((c, i) => {
    ev.at(t0 + (i * span) / order.length, 'era' + c.id, () => {
      c.era = newEra;
      fx.dust(c.x, c.y + 1, 10);
      fx.burst(c.x, c.y - 4, 10, { speed: 14, colors: ['#fffbe0', '#ffe28a'], life: 0.8 });
      if (onTown) onTown(c, i);
    });
  });
}

// ---- small helpers events share ---------------------------------------------------------
const nearestCity = (x, y, filter = () => true) =>
  world.cities.filter(filter).sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y))[0];
function randomLandCell(rng, test) {
  for (let k = 0; k < 4000; k++) {
    const ci = (rng.next() * CN) | 0;
    if (cells.land[ci] && test(ci)) return ci;
  }
  return -1;
}
function damageNear(x, y, r, amount, ev, note) {
  const hit = [];
  for (const c of world.cities) {
    const d = dist(c.x, c.y, x, y);
    if (d > r) continue;
    const dmg = amount * (1 - d / r * 0.5);
    c.damage = clamp(c.damage + dmg, 0, 1);
    const lost = Math.round(c.pop * dmg * 0.25);
    c.pop -= lost;
    if (ev && lost) ev.delta('pop', -lost);
    if (note) logCity(c, note);
    hit.push(c);
  }
  return hit;
}

// ---- crowds: mobs, delegates, spies, peas. Little pixel people with a goal ---------
class Crowd {
  constructor() { this.list = []; }
  add(o) {
    const a = {
      x: 0, y: 0, tx: 0, ty: 0, speed: 12, color: '#6a4a3a', head: '#f0c9a0', prop: null,
      kind: 'person', down: 0, phase: Math.random() * 6, jx: 0, jy: 0, walking: false, gone: false, ...o,
    };
    this.list.push(a);
    return a;
  }
  send(fn) { for (const a of this.list) fn(a); }
  // everyone leaves, one at a time, over `spread` seconds
  dismiss(spread = 1.2) { for (const a of this.list) if (!a.gone && a.vanishAt == null) a.vanishAt = (this.t || 0) + Math.random() * spread; }
  vanish(a) {
    if (a.gone) return;
    a.gone = true;
    fx.burst(a.x, a.y - 1, 3, { speed: 5, drag: 3, colors: [a.color || '#f2eee2', '#ffffff'], life: 0.45 });
  }
  update(dt) {
    this.t = (this.t || 0) + dt;
    for (const a of this.list) {
      if (a.gone) continue;
      if (a.vanishAt != null && this.t >= a.vanishAt) { this.vanish(a); continue; }
      if (a.down > 0) { a.down -= dt; continue; }
      const tx = a.tx + a.jx, ty = a.ty + a.jy;
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      a.walking = d > 0.6;
      if (!a.walking) continue;
      const s = Math.min(d, a.speed * dt);
      let mx = (dx / d) * s, my = (dy / d) * s;
      // walkers stay on land: steer around the sea, and only give up after a while
      if (a.land !== false && map.isLand(a.x, a.y) && !map.isLand(a.x + mx, a.y + my)) {
        // follow the coastline: keep turning the same way we last turned until there's land
        const turn = a.turn || (Math.random() < 0.5 ? 1 : -1);
        let ok = false;
        for (const step of [0.5, 1, 1.5, 2, 2.5, 3]) {
          for (const sign of [turn, -turn]) {
            const r = step * sign, c = Math.cos(r), sn = Math.sin(r), rx = mx * c - my * sn, ry = mx * sn + my * c;
            if (map.isLand(a.x + rx, a.y + ry)) { mx = rx; my = ry; a.turn = sign; ok = true; break; }
          }
          if (ok) break;
        }
        if (!ok) { a.stuck = (a.stuck || 0) + dt; if (a.stuck < 6) { mx = 0; my = 0; } }
      } else if (a.turn && Math.random() < dt * 0.5) a.turn = 0;
      a.x += mx; a.y += my;
      a.face = Math.sign(dx) || a.face || 1;
    }
  }
  arrived(a) { return Math.hypot(a.tx + a.jx - a.x, a.ty + a.jy - a.y) < 1; }
  draw(g, t) {
    for (const a of this.list) {
      if (a.gone) continue;
      const x = Math.round(a.x + offX(a.x, a.y)), y = Math.round(a.y);
      if (a.kind === 'pea') {
        const hop = a.walking && Math.sin(t * 16 + a.phase) > 0 ? 1 : 0;
        g.fillStyle = '#3f7a2a'; g.fillRect(x, y - hop, 2, 2);
        g.fillStyle = '#8ed45a'; g.fillRect(x, y - hop, 1, 1);
        continue;
      }
      if (a.down > 0) { g.fillStyle = a.color; g.fillRect(x - 1, y, 2, 1); g.fillStyle = a.head; g.fillRect(x + 1, y, 1, 1); continue; }
      const bob = a.walking && Math.sin(t * 16 + a.phase) > 0 ? 1 : 0;
      g.fillStyle = 'rgba(20,30,25,0.35)'; g.fillRect(x, y + 1, 1, 1);
      g.fillStyle = a.color; g.fillRect(x, y - 1 - bob, 1, 2);
      g.fillStyle = a.head; g.fillRect(x, y - 2 - bob, 1, 1);
      if (a.hat) { g.fillStyle = a.hat; g.fillRect(x, y - 3 - bob, 1, 1); if (a.hatWide) g.fillRect(x - 1, y - 3 - bob, 3, 1); }
      if (a.prop) { g.fillStyle = a.prop; g.fillRect(x + (a.face || 1), y - 3 - bob, 1, 3); }
    }
  }
}
// where a town can send people: its own spot plus a little spread
const spreadAround = (x, y, r = 4) => ({ jx: (Math.random() - 0.5) * r * 2, jy: (Math.random() - 0.5) * r });

// ---- a path through any list of points, walked at constant speed -------------------
function polyPath(pts) {
  const lens = [0];
  for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + dist(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y));
  return {
    pts, length: lens[lens.length - 1] || 0,
    at(s) {
      s = clamp(s, 0, this.length);
      let lo = 0, hi = lens.length - 1;
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (lens[mid] <= s) lo = mid; else hi = mid; }
      const u = (s - lens[lo]) / Math.max(0.0001, lens[hi] - lens[lo]);
      return { x: lerp(pts[lo].x, pts[hi].x, u), y: lerp(pts[lo].y, pts[hi].y, u) };
    },
  };
}
// a ring of sea hugging the coast, from angle a0 through a sweep (radians)
function coastArc(a0, sweep, depth = 6, step = 0.03) {
  const cx = W / 2, cy = H / 2, pts = [];
  for (let a = a0; Math.abs(a - a0) <= Math.abs(sweep); a += Math.sign(sweep) * step) {
    let seenLand = false, found = null;
    for (let r = 4; r < 300; r += 1) {
      const x = cx + Math.cos(a) * r * 1.5, y = cy + Math.sin(a) * r;
      if (x < 6 || y < 6 || x > W - 6 || y > H - 6) break;
      const d = map.oceanDepth(x, y);
      if (d === 0) seenLand = true;
      else if (seenLand && d >= depth) { found = { x, y }; }
      if (found && d < depth) break;
      if (found && map.oceanDepth(x + Math.cos(a) * 3, y + Math.sin(a) * 2) >= depth + 3) break;
    }
    if (found) pts.push(found);
  }
  // smooth out corners
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
    return { x: (a.x + p.x * 2 + b.x) / 4, y: (a.y + p.y * 2 + b.y) / 4 };
  });
}

// extra crowd shapes for creatures
Crowd.shapes = {
  goat(g, x, y, a, t) { const b = a.walking && Math.sin(t * 14 + a.phase) > 0 ? 1 : 0; g.fillStyle = '#f2eee2'; g.fillRect(x, y - 1 - b, 2, 1); g.fillRect(x + (a.face > 0 ? 2 : -1), y - 2 - b, 1, 1); g.fillStyle = '#8a7a64'; g.fillRect(x + (a.face > 0 ? 2 : -1), y - 3 - b, 1, 1); g.fillStyle = '#3a342c'; g.fillRect(x, y - b, 1, 1); g.fillRect(x + 1, y - b, 1, 1); },
  cat(g, x, y, a, t) { g.fillStyle = a.color; g.fillRect(x, y - 1, 2, 1); g.fillRect(x + (a.face > 0 ? 2 : -1), y - 2, 1, 1); g.fillRect(x - (a.face > 0 ? 1 : -2), y - 2 - (Math.sin(t * 6 + a.phase) > 0 ? 1 : 0), 1, 1); },
  moose(g, x, y, a, t) { const b = Math.sin(t * 8 + a.phase) > 0 ? 1 : 0; g.fillStyle = '#5a3a24'; g.fillRect(x - 1, y - 2, 4, 2); g.fillRect(x + (a.face > 0 ? 3 : -2), y - 3, 1, 2); g.fillStyle = '#3a2618'; g.fillRect(x - 1 + b, y, 1, 1); g.fillRect(x + 2 - b, y, 1, 1); g.fillStyle = '#c8b090'; g.fillRect(x + (a.face > 0 ? 2 : -3), y - 5, 3, 1); g.fillRect(x + (a.face > 0 ? 2 : -3), y - 6, 1, 1); g.fillRect(x + (a.face > 0 ? 4 : -1), y - 6, 1, 1); },
  squirrel(g, x, y, a, t) { g.fillStyle = '#a0602a'; g.fillRect(x, y - 1, 2, 1); g.fillStyle = '#c87a3a'; g.fillRect(x - (a.face > 0 ? 1 : -2), y - 2, 1, 2); if (a.coin) { g.fillStyle = '#f4c542'; g.fillRect(x + (a.face > 0 ? 2 : -1), y - 1, 1, 1); } },
  duck(g, x, y, a) { g.fillStyle = '#f4d45a'; g.fillRect(x, y - 1, 2, 1); g.fillRect(x + (a.face > 0 ? 1 : 0), y - 2, 1, 1); g.fillStyle = '#f08a24'; g.fillRect(x + (a.face > 0 ? 2 : -1), y - 2, 1, 1); },
  alien(g, x, y, a, t) { const b = a.walking && Math.sin(t * 12) > 0 ? 1 : 0; g.fillStyle = '#7dd86a'; g.fillRect(x, y - 1 - b, 1, 2); g.fillRect(x - 1, y - 3 - b, 3, 2); g.fillStyle = '#1b2a2f'; g.fillRect(x - 1, y - 3 - b, 1, 1); g.fillRect(x + 1, y - 3 - b, 1, 1); },
};
const crowdDrawBase = Crowd.prototype.draw;
Crowd.prototype.draw = function (g, t) {
  const plain = [];
  for (const a of this.list) {
    if (a.gone) continue;
    const shape = Crowd.shapes[a.kind];
    if (!shape) { plain.push(a); continue; }
    shape(g, Math.round(a.x + offX(a.x, a.y)), Math.round(a.y), a, t);
  }
  const keep = this.list; this.list = plain; crowdDrawBase.call(this, g, t); this.list = keep;
};


// ---- event leftovers: the last frame of an event dissolves pixel by pixel ----------
// When an event ends it stops drawing, which used to make everything it drew vanish
// in one frame. Instead we capture that frame and let it disintegrate gently.
const NO_SKY_CAPTURE = new Set(['glitch', 'heatwave', 'timetravel', 'portal']);
const leftovers = {
  list: [],
  capture(ev) {
    if (!ev.def.draw) return;
    const c = makeCanvas(W, H), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const layers = NO_SKY_CAPTURE.has(ev.def.id) ? ['ground', 'air'] : ['ground', 'air', 'sky'];
    try { for (const layer of layers) ev.def.draw(ev, g, layer, simTime); } catch (e) { return; }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const img = g.getImageData(0, 0, W, H), px = new Uint32Array(img.data.buffer);
    const order = [];
    for (let i = 0; i < px.length; i++) if (px[i] >>> 24) order.push(i);
    if (!order.length) return;
    for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    this.list.push({ c, g, img, px, order, done: 0, t: 0, dur: clamp(0.7 + order.length / 5000, 0.9, 1.6), dirty: true });
  },
  update(dt) {
    for (const L of this.list) {
      L.t += dt;
      const target = Math.floor(L.order.length * smooth(L.t / L.dur));
      while (L.done < target) {
        const i = L.order[L.done++], v = L.px[i];
        if (Math.random() < 0.05 && (v >>> 24) > 100) {
          fx.spawn({ x: i % W, y: (i / W) | 0, vz: 3 + Math.random() * 6, vx: (Math.random() - 0.5) * 5, life: 0.7, colors: [`rgb(${v & 255},${(v >> 8) & 255},${(v >> 16) & 255})`], layer: 'air', screen: true });
        }
        L.px[i] = 0;
        L.dirty = true;
      }
    }
    this.list = this.list.filter((L) => L.done < L.order.length);
  },
  draw(g) {
    for (const L of this.list) {
      if (L.dirty) { L.g.putImageData(L.img, 0, 0); L.dirty = false; }
      g.drawImage(L.c, 0, 0);
    }
  },
  clear() { this.list.length = 0; },
};

function updateCovers(dt) {
  for (let k = covers.length - 1; k >= 0; k--) {
    const cv = covers[k];
    if (!cv.dying) continue;
    // clear cells in a random order over about a second; works whatever the cover stores
    // in its values (strengths, or ignition times for fire and lava)
    cv.dieT = (cv.dieT || 0) + dt;
    const p = cv.dieT / 1.1, f = cv.f, nz = cells.noise;
    for (let i = 0; i < CN; i++) if (f[i] !== 0 && nz[i] < p) f[i] = 0;
    cv.dirty = true;
    if (p >= 1) covers.splice(k, 1);
  }
}

// ---- where things can logically stand ------------------------------------------------
// a walkable spot near a town (for launch pads, booths, stalls...)
function landSpotNear(c, rMin, rMax, rng, clear = 0) {
  for (let k = 0; k < 200; k++) {
    const a = rng.range(0, TAU), r = rng.range(rMin, rMax);
    const x = Math.round(c.x + Math.cos(a) * r), y = Math.round(c.y + Math.sin(a) * r * 0.65);
    if (!map.isWalkable(x, y)) continue;
    let ok = true;
    for (let dy = -clear; dy <= clear && ok; dy += Math.max(1, clear)) for (let dx = -clear; dx <= clear && ok; dx += Math.max(1, clear)) if (!map.isWalkable(x + dx, y + dy)) ok = false;
    if (ok && (x >= map.bx(y)) === (c.x >= map.bx(c.y))) return { x, y };
  }
  // nothing suitable in range: take the nearest walkable ground in any direction
  for (let r = 1; r < 80; r++) {
    for (let a = 0; a < TAU; a += 0.2) {
      const x = Math.round(c.x + Math.cos(a) * r), y = Math.round(c.y + Math.sin(a) * r * 0.7);
      if (map.isWalkable(x, y)) return { x, y };
    }
  }
  return { x: c.x, y: c.y };
}
// how a ship reaches a coastal town: an offshore start, a dock in the shallows, and the shore
function seaApproach(c) {
  const sameSide = (x, y) => (x >= map.bx(y)) === (c.x >= map.bx(c.y));
  let dock = null;
  for (let r = 3; r < 60 && !dock; r += 1) {
    for (let a = 0; a < TAU; a += 0.08) {
      const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r * 0.8;
      const d = map.oceanDepth(x, y);
      if (d >= 2 && d <= 4 && sameSide(x, y)) { dock = { x, y }; break; }
    }
  }
  if (!dock) dock = { x: c.x, y: c.y + 10 };
  let shore = { x: c.x, y: c.y };
  for (let r = 1; r < 10; r++) {
    let found = null;
    for (let a = 0; a < TAU; a += 0.3) { const x = dock.x + Math.cos(a) * r, y = dock.y + Math.sin(a) * r; if (map.isWalkable(x, y)) { found = { x, y }; break; } }
    if (found) { shore = found; break; }
  }
  const ux = dock.x - c.x, uy = dock.y - c.y, ul = Math.hypot(ux, uy) || 1;
  let off = { x: dock.x + (ux / ul) * 60, y: dock.y + (uy / ul) * 40 };
  for (let s = 4; s < 90; s += 3) {
    const x = dock.x + (ux / ul) * s, y = dock.y + (uy / ul) * s;
    if (map.oceanDepth(x, y) >= 12) { off = { x, y }; break; }
  }
  off.x = clamp(off.x, -10, W + 10); off.y = clamp(off.y, -10, H + 10);
  return { dock, shore, off };
}
// the road network as a graph: the shortest way from one town to another
function roadPath(from, to) {
  const prev = new Map([[from.id, null]]);
  const queue = [from.id];
  while (queue.length) {
    const id = queue.shift();
    if (id === to.id) break;
    for (const r of map.roads) {
      const other = r.a === id ? r.b : r.b === id ? r.a : null;
      if (other == null || prev.has(other)) continue;
      prev.set(other, { id, road: r });
      queue.push(other);
    }
  }
  if (!prev.has(to.id)) return polyPath([{ x: from.x, y: from.y }, { x: to.x, y: to.y }]);
  const legs = [];
  for (let id = to.id; prev.get(id); id = prev.get(id).id) legs.unshift({ road: prev.get(id).road, from: prev.get(id).id });
  const pts = [];
  for (const { road, from: f } of legs) for (const p of (road.a === f ? road.pts : road.pts.slice().reverse())) pts.push(p);
  return polyPath(pts);
}
