// ============================================================================
// 05 TOOLKIT — reusable building blocks. Each event is a short script that
// combines these, which is what makes a hundred events a realistic goal.
// ============================================================================

const fx = {
  particles: [],
  rings: [],
  projectiles: [],
  MAX_PARTICLES: 3000,

  // ---- particles --------------------------------------------------------------
  spawn(o) {
    if (this.particles.length >= this.MAX_PARTICLES) return null;
    const p = {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: 1, size: 1, grow: 0,
      colors: ['#ffffff'], layer: 'air', fade: true, bounce: 0, ...o,
    };
    p.max = p.life;
    this.particles.push(p);
    return p;
  },
  updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vz -= p.g * dt; p.z += p.vz * dt;
      if (p.g > 0 && p.z < 0) { p.z = 0; p.vz = -p.vz * p.bounce; p.vx *= 0.5; p.vy *= 0.5; }
      p.size += p.grow * dt;
    }
  },
  drawParticles(g, layer) {
    for (const p of this.particles) {
      if (p.layer !== layer) continue;
      const age = 1 - p.life / p.max;
      g.fillStyle = p.colors[Math.min(p.colors.length - 1, (age * p.colors.length) | 0)];
      g.globalAlpha = p.fade ? Math.min(1, (p.life / p.max) * 2.2) : 1;
      const s = Math.max(1, Math.round(p.size));
      const ox = p.screen ? 0 : offX(p.x, p.y);
      if (p.streak) { g.globalAlpha = 0.75; g.fillRect(Math.round(p.x + ox), Math.round(p.y - p.z), 1, 3); continue; }
      g.fillRect(Math.round(p.x + ox - s / 2), Math.round(p.y - p.z - s / 2), s, s);
    }
    g.globalAlpha = 1;
  },

  // ---- rings (shockwaves, ripples, landings) -----------------------------------
  ring(x, y, o = {}) {
    this.rings.push({ x, y, r: o.r0 || 1, speed: o.speed || 40, max: o.max || 30, color: o.color || '#fff', squash: o.squash || 0.72, width: o.width || 1, screen: !!o.screen });
  },
  updateRings(dt) {
    this.rings = this.rings.filter((r) => { r.r += r.speed * dt; return r.r < r.max; });
  },
  drawRings(g) {
    for (const r of this.rings) {
      g.fillStyle = r.color;
      g.globalAlpha = clamp(1 - r.r / r.max, 0, 1);
      const n = Math.ceil(r.r * 5);
      const ox = r.screen ? 0 : offX(r.x, r.y);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        g.fillRect(Math.round(r.x + ox + Math.cos(a) * r.r), Math.round(r.y + Math.sin(a) * r.r * r.squash), r.width, r.width);
      }
    }
    g.globalAlpha = 1;
  },

  // ---- projectiles: anything that travels from A to B, optionally in an arc -----
  launch(o) {
    const p = { t: 0, z0: 0, z1: 0, arc: 0, ease: (u) => u, dur: 1, ...o };
    p.x = p.x0; p.y = p.y0; p.z = p.z0;
    this.projectiles.push(p);
    return p;
  },
  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter((p) => {
      p.t += dt;
      const u = clamp(p.t / p.dur, 0, 1);
      const e = p.ease(u);
      const px = p.x, py = p.y, pz = p.z;
      p.x = lerp(p.x0, p.x1, e);
      p.y = lerp(p.y0, p.y1, e);
      p.z = lerp(p.z0, p.z1, e) + p.arc * 4 * u * (1 - u);
      p.dx = p.x - px; p.dy = (p.y - p.z) - (py - pz);
      if (p.onStep) p.onStep(p, dt);
      if (u >= 1) { if (p.onHit) p.onHit(p); return false; }
      return true;
    });
  },
  drawProjectiles(g) {
    for (const p of this.projectiles) {
      const x = p.x + (p.screen ? 0 : offX(p.x, p.y)), y = p.y - p.z;
      if (p.draw) { p.draw(g, x, y, p); continue; }
      g.fillStyle = p.color || '#fff';
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  },

  // lightning: a jagged 1px bolt that lives for a few frames
  bolts: [],
  bolt(x, y) {
    const pts = [];
    let bx = x + (Math.random() - 0.5) * 20, by = y - 90;
    while (by < y) { pts.push([bx, by]); by += 4 + Math.random() * 5; bx += (Math.random() - 0.5) * 6; }
    pts.push([x, y]);
    this.bolts.push({ pts, life: 0.18 });
    world.grades.flash.v = Math.max(world.grades.flash.v, 0.35);
    camera.kick(1.5);
  },
  updateBolts(dt) { this.bolts = this.bolts.filter((b) => (b.life -= dt) > 0); },
  drawBolts(g) {
    for (const b of this.bolts) {
      g.fillStyle = b.life > 0.09 ? '#fffbe6' : '#c9d8ff';
      for (let k = 1; k < b.pts.length; k++) {
        const [x0, y0] = b.pts[k - 1], [x1, y1] = b.pts[k];
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let s = 0; s <= n; s++) g.fillRect(Math.round(lerp(x0, x1, s / n)), Math.round(lerp(y0, y1, s / n)), 1, 1);
      }
    }
  },

  clear() { this.particles.length = 0; this.rings.length = 0; this.projectiles.length = 0; this.bolts.length = 0; },

  // ---- ready-made effects ------------------------------------------------------
  smoke(x, y, o = {}) {
    return this.spawn({
      x: x + (Math.random() - 0.5) * 2, y, z: o.z || 0, vx: 1.5 + (Math.random() - 0.5) * 2, vz: o.rise || 7,
      vy: 0, life: o.life || 2.4, size: o.size || 1, grow: o.grow ?? 0.9, drag: 0.3,
      colors: o.colors || ['#9a9690', '#7d7a76', '#5f5c5a'], layer: 'air', screen: !!o.screen,
    });
  },
  fire(x, y, o = {}) {
    return this.spawn({
      x: x + (Math.random() - 0.5) * (o.spread || 3), y: y + (Math.random() - 0.5) * 1.5, z: o.z || 0,
      vx: (Math.random() - 0.5) * 3, vz: 6 + Math.random() * 10, life: 0.5 + Math.random() * 0.5,
      size: o.size || 1, colors: ['#fff6c0', '#ffd24a', '#ff8a2a', '#c8421e', '#4a3a36'], layer: 'air',
    });
  },
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = (o.speed || 20) * (0.3 + Math.random() * 0.7);
      this.spawn({
        x, y, z: o.z || 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, vz: o.vz != null ? o.vz * Math.random() : 0,
        g: o.g || 0, bounce: o.bounce || 0, drag: o.drag ?? 1.5, life: (o.life || 1) * (0.6 + Math.random() * 0.6),
        size: o.size || 1, colors: o.colors || ['#ffffff'], layer: o.layer || 'air', grow: o.grow || 0, screen: !!o.screen,
      });
    }
  },
  dust(x, y, n = 12, colors = ['#d8c8a8', '#b8a888', '#8a7a64']) {
    this.burst(x, y, n, { speed: 14, drag: 2.5, life: 1.2, colors, layer: 'ground', size: 1 });
  },
  firework(x, y, z) {
    const palettes = [
      ['#fffbe0', '#ffd24a', '#ff8a2a'], ['#fffbe0', '#8ee8ff', '#3aa0e0'],
      ['#fffbe0', '#ff9ad8', '#d04fa0'], ['#fffbe0', '#b8ff8a', '#4ac060'],
      ['#fffbe0', SIDE.west.color, SIDE.east.color],
    ];
    const cols = palettes[(Math.random() * palettes.length) | 0];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * TAU, s = 16 + Math.random() * 6;
      this.spawn({ x, y, z, vx: Math.cos(a) * s, vy: 0, vz: Math.sin(a) * s, g: 9, drag: 1.4, life: 1.3 + Math.random() * 0.4, colors: cols, layer: 'sky' });
    }
    this.ring(x, y - z, { max: 14, speed: 30, color: '#fffbe0', squash: 1 });
  },
  hearts(x, y) {
    for (let i = 0; i < 5; i++) {
      this.spawn({ x: x + (Math.random() - 0.5) * 8, y, z: 2, vz: 8 + Math.random() * 6, vx: (Math.random() - 0.5) * 4, life: 1.4, colors: ['#ff7a9a', '#ff9ab4', '#ffc4d4'], layer: 'air', size: 1 });
    }
  },
  splash(x, y, screen = false) {
    this.burst(x, y, 6, { speed: 8, vz: 12, g: 40, life: 0.6, colors: ['#e8f6f2', '#9fd4d0'], layer: 'air', screen });
  },
};

// ---- pixel sprites ------------------------------------------------------------------
function makeSprite(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const c = makeCanvas(w, h);
  const cc = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    if (ch === '.' || !pal[ch]) continue;
    cc.fillStyle = pal[ch];
    cc.fillRect(x, y, 1, 1);
  }
  return c;
}
function drawSpriteScaled(g, spr, x, y, scale, flip = false) {
  const w = spr.width * scale, h = spr.height * scale;
  const dx = Math.round(x - w / 2), dy = Math.round(y - h / 2);
  if (!flip) { g.drawImage(spr, dx, dy, w, h); return; }
  g.save(); g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(spr, 0, 0, w, h); g.restore();
}
function drawSprite(g, spr, x, y, flip = false) {
  const dx = Math.round(x - spr.width / 2), dy = Math.round(y - spr.height / 2);
  if (!flip) { g.drawImage(spr, dx, dy); return; }
  g.save(); g.translate(dx + spr.width, dy); g.scale(-1, 1); g.drawImage(spr, 0, 0); g.restore();
}

const SPRITES = {};
function initSprites() {
  SPRITES.mothership = makeSprite([
    '......aaaaaaaaa......',
    '....abbccbbbbbbba....',
    '...abcccbbbbbbbbba...',
    '.ddddddddddddddddddd.',
    'deeeeeeeeeeeeeeeeeeed',
    '.dddddddddddddddddd..',
    '....ddddddddddddd....',
  ], { a: '#9ad6cc', b: '#6fc2b8', c: '#e6fff9', d: '#5c6470', e: '#a9b2bc' });
  SPRITES.saucer = makeSprite([
    '...aaa...',
    '..abcba..',
    'ddddddddd',
    '.deeeeed.',
  ], { a: '#9ad6cc', b: '#6fc2b8', c: '#e6fff9', d: '#5c6470', e: '#a9b2bc' });
  SPRITES.carrotBoat = makeSprite([
    '............gg....',
    '...........gggg...',
    '............gG....',
    '....ooooooooOg....',
    '..oooOoooOoooo....',
    'oooooooooooo......',
    '..oooOooooo.......',
    'hhhhhhhhhhhhhhhhh.',
    '.hHHHHHHHHHHHHHh..',
    '..hhhhhhhhhhhhh...',
  ], { o: '#f08a24', O: '#c9661a', g: '#5aa04a', G: '#3c7a36', h: '#6b4a30', H: '#8d6a44' });
  SPRITES.zipper = makeSprite([
    'mmm',
    'mMm',
    'mmm',
    '.m.',
    '.M.',
  ], { m: '#c8ccd0', M: '#8a9096' });
  SPRITES.leaf = makeSprite(['.l.', 'lLl', '.L.'], { l: '#e39a34', L: '#a85a1e' });
}

// ---- decals: permanent marks stamped onto the world -------------------------------------
function stampPixel(x, y, color, alpha = 1) {
  if (!map.isLand(x, y)) return;
  const d = world.dctx;
  d.globalAlpha = alpha;
  d.fillStyle = color;
  d.fillRect(Math.round(x), Math.round(y), 1, 1);
  d.globalAlpha = 1;
}
function stampCrater(cx, cy, R) {
  for (let dy = -Math.ceil(R * 2); dy <= R * 2; dy++) {
    for (let dx = -Math.ceil(R * 2); dx <= R * 2; dx++) {
      const x = cx + dx, y = cy + dy;
      const d = Math.hypot(dx, dy * 1.3);
      const h = hash2(x * 7, y * 3);
      if (d < R * 0.62) stampPixel(x, y, (dy < 0 ? '#2f2722' : '#43372e'), 1);
      else if (d < R * 0.8) stampPixel(x, y, dy < 0 ? '#5a4a3c' : '#6e5c4a', 1);
      else if (d < R) stampPixel(x, y, dy < 0 ? '#8d7a5f' : '#b09878', 1);
      else if (d < R * 1.9 && h < (1 - (d - R) / (R * 0.9)) * 0.7) stampPixel(x, y, '#3d3a2c', 0.45);
    }
  }
  for (let k = 0; k < 22; k++) {
    const a = Math.random() * TAU, rr = R * (1.1 + Math.random() * 1.3);
    stampPixel(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.77, '#6a5a48', 0.9);
  }
}
function stampCropCircle(cx, cy) {
  const col = '#d8e6a4';
  for (let dy = -7; dy <= 7; dy++) for (let dx = -9; dx <= 9; dx++) {
    const d = Math.hypot(dx, dy * 1.3);
    if ((d > 6.2 && d < 7.3) || (d > 3.2 && d < 4.2) || d < 1.2) stampPixel(cx + dx, cy + dy, col, 0.9);
  }
  for (let k = 0; k < 7; k++) stampPixel(cx + 7 + k, cy - Math.round(k * 0.4), col, 0.9);
}
function stampSeam(fromY, toY) {
  for (let y = Math.min(fromY, toY); y <= Math.max(fromY, toY); y++) {
    const x = Math.round(map.bx(y));
    if (y % 2 === 0) { stampPixel(x - 1, y, '#5a4636', 0.55); stampPixel(x + 1, y + 1, '#5a4636', 0.55); }
  }
}

// ---- speech bubbles (HTML, so text stays crisp) ------------------------------------------
const bubbles = [];
function say(anchor, text, o = {}) {
  const layer = document.getElementById('bubbles');
  if (!layer) return { set() {} };
  // one bubble per anchor at a time; the newest line wins
  for (const b of bubbles) if (b.anchor === anchor) b.life = Math.min(b.life, 0.2);
  const el = document.createElement('div');
  el.className = 'bubble' + (o.side ? ' side-' + o.side : '') + (o.alien ? ' alien' : '') + (o.align ? ' align-' + o.align : '');
  const inner = document.createElement('span');
  inner.className = 'b';
  inner.textContent = text;
  el.appendChild(inner);
  layer.appendChild(el);
  const b = { el, anchor, life: o.life || 3, lift: o.lift || 9, align: o.align || 'center', set(txt) { inner.textContent = txt; } };
  bubbles.push(b);
  return b;
}
function updateBubbles(dt) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    if (b.life <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    b.el.classList.toggle('leaving', b.life < 0.3);
  }
}
function positionBubbles() {
  for (const b of bubbles) {
    const a = b.anchor;
    const ax = a.x + (a.ox || 0), ay = a.y + (a.oy || 0) - (a.lift || 0) - (a.z || 0) - b.lift;
    const p = toScreen(ax + (a.screen ? 0 : offX(a.x, a.y)), ay);
    const shift = b.align === 'left' ? 'calc(-100% + 10px)' : b.align === 'right' ? '-10px' : '-50%';
    b.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(${shift}, -100%)`;
  }
}
function clearBubbles() {
  for (const b of bubbles) b.el.remove();
  bubbles.length = 0;
}
