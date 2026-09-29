// ============================================================================
// 04 RENDER — the world is drawn into a 480x270 buffer in layers, then scaled
// up to the screen with the camera. Same idea as Nagomi's render passes.
// ============================================================================

const R = {};
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION = reducedMotion ? 0.2 : 1;

const WATER_PAL = ['#1f4d5f', '#245868', '#2a6372', '#316f7c', '#3b7f88', '#4b9396'].map((h) => packRgb(hexToRgb(h)));
const RIVER_PAL = ['#3a8792', '#4a98a0', '#79bdb8'].map((h) => packRgb(hexToRgb(h)));
const FOAM = packRgb(hexToRgb('#c6e3d8'));
const MUD = [packRgb(hexToRgb('#7d6446')), packRgb(hexToRgb('#94795a'))];
const ICE = [packRgb(hexToRgb('#dbeef2')), packRgb(hexToRgb('#bcd9e3'))];
const SEA_BG = '#1f4d5f';

function initRender() {
  R.buf = makeCanvas(W, H);
  R.g = R.buf.getContext('2d');
  R.water = R.g.createImageData(W, H);
  R.waterPx = new Uint32Array(R.water.data.buffer);
  const tn = makeNoise(99);
  R.tex = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) R.tex[y * W + x] = tn.fbm(x * 0.09, y * 0.09, 2);
  R.sparkles = [];
  R.screen = document.getElementById('screen');
  R.sg = R.screen.getContext('2d');
  R.rect = { x: 0, y: 0, w: W, h: H, dpr: 1 };
  R.vignette = makeCanvas(W, H);
  const vg = R.vignette.getContext('2d');
  const grad = vg.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  grad.addColorStop(0, 'rgba(10,30,40,0)');
  grad.addColorStop(1, 'rgba(10,30,40,0.38)');
  vg.fillStyle = grad; vg.fillRect(0, 0, W, H);
  R.clouds = makeClouds();
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // contain the 16:9 world, but allow a gentle crop on tall phones so it isn't tiny
  const portrait = vh > vw;
  const scale = portrait ? Math.min(vw / (W * 0.62), vh / H) : Math.min(vw / W, vh / H);
  const w = W * scale, h = H * scale;
  R.rect = { x: (vw - w) / 2, y: (vh - h) / 2, w, h, dpr };
  R.screen.width = Math.round(vw * dpr);
  R.screen.height = Math.round(vh * dpr);
  R.screen.style.width = vw + 'px';
  R.screen.style.height = vh + 'px';
}

// ---- camera -------------------------------------------------------------------
const camera = {
  x: W / 2, y: H / 2, zoom: 1, tx: W / 2, ty: H / 2, tz: 1, shake: 0, sx: 0, sy: 0, rate: 1.6,
  focus(x, y, zoom = 1.5, rate = 1.6) {
    this.tx = x + offX(x, y); this.ty = y; this.tz = zoom; this.rate = rate;
  },
  reset(rate = 1.2) { this.focus(W / 2, H / 2, 1, rate); },
  kick(amount) { this.shake = Math.max(this.shake, amount * MOTION); },
  update(dt) {
    this.x = approach(this.x, this.tx, this.rate, dt);
    this.y = approach(this.y, this.ty, this.rate, dt);
    this.zoom = approach(this.zoom, this.tz, this.rate, dt);
    this.shake = approach(this.shake, 0, 5, dt);
    this.sx = (Math.random() - 0.5) * 2 * this.shake;
    this.sy = (Math.random() - 0.5) * 2 * this.shake;
  },
  view() {
    const w = W / this.zoom, h = H / this.zoom;
    return { x0: clamp(this.x - w / 2, 0, W - w), y0: clamp(this.y - h / 2, 0, H - h), w, h };
  },
};

// world coordinates (including split offset) -> CSS pixels on screen
function toScreen(x, y) {
  const v = camera.view();
  const r = R.rect;
  const scale = r.w / W;
  let px = r.x + ((x - v.x0) / v.w) * r.w + camera.sx * scale;
  let py = r.y + ((y - v.y0) / v.h) * r.h + camera.sy * scale;
  const tilt = (world.tilt || 0) * Math.PI / 180;
  if (tilt) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, c = Math.cos(tilt), s = Math.sin(tilt);
    const dx = px - cx, dy = py - cy;
    px = cx + dx * c - dy * s; py = cy + dx * s + dy * c;
  }
  return { x: px, y: py, s: (r.w / v.w) };
}
function toWorld(sxp, syp) {
  const v = camera.view();
  const r = R.rect;
  const tilt = (world.tilt || 0) * Math.PI / 180;
  if (tilt) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, c = Math.cos(-tilt), s = Math.sin(-tilt);
    const dx = sxp - cx, dy = syp - cy;
    sxp = cx + dx * c - dy * s; syp = cy + dx * s + dy * c;
  }
  return { x: v.x0 + ((sxp - r.x) / r.w) * v.w, y: v.y0 + ((syp - r.y) / r.h) * v.h };
}

// ---- water ----------------------------------------------------------------------
function renderWater(t) {
  const px = R.waterPx, tex = R.tex;
  const { land, wet, waterDist } = map;
  for (let by = 0; by < H; by += 2) {
    for (let bx = 0; bx < W; bx += 2) {
      const i = by * W + bx;
      let col;
      if (wet[i]) {
        const v = Math.sin(by * 0.55 - t * 2.4 + bx * 0.25) + tex[i] * 1.4;
        col = RIVER_PAL[v > 1.3 ? 2 : v > 0.2 ? 1 : 0];
        if (tex[i] * 1.6 - 0.1 > world.riverLevel) col = MUD[(bx + by) & 2 ? 1 : 0];
        if (world.freeze > tex[i] * 1.3) col = ICE[tex[i] > 0.5 ? 1 : 0];
      } else {
        const d = land[i] ? 0 : waterDist[i];
        const depth = d > 18 ? 1 : d / 18;
        const w = Math.sin(bx * 0.055 + t * 0.7 + Math.sin(by * 0.045 - t * 0.35) * 1.8) * 0.5
          + Math.sin((bx - by) * 0.035 + t * 0.5) * 0.5;
        const v = (1 - depth) * 4.3 + w * 0.75 + tex[i] * 0.7;
        col = WATER_PAL[v < 0 ? 0 : v > 5 ? 5 : v | 0];
        if (d >= 1 && d <= 2 && Math.sin(t * 1.3 - d * 1.4 + tex[i] * 6) > 0.72) col = FOAM;
        if (world.freeze > 0.05 && d > 0 && d < world.freeze * 9 && tex[i] > 0.36) col = ICE[d & 1];
      }
      px[i] = col; px[i + 1] = col; px[i + W] = col; px[i + W + 1] = col;
    }
  }
  R.g.putImageData(R.water, 0, 0);
  // a few glints on open water
  if (R.sparkles.length < 14 && Math.random() < 0.5) {
    const x = Math.random() * W, y = Math.random() * H;
    if (map.oceanDepth(x, y) > 6) R.sparkles.push({ x: x | 0, y: y | 0, life: 0.5 });
  }
  R.g.fillStyle = 'rgba(220,240,235,0.8)';
  R.sparkles = R.sparkles.filter((s) => {
    s.life -= 1 / 60;
    if (s.life > 0.15 && s.life < 0.4) R.g.fillRect(s.x, s.y, 2, 1);
    return s.life > 0;
  });
}

// Draw a full-world image, sliding the eastern half when the country is split.
function drawSplit(img, alpha = 1) {
  const g = R.g;
  g.globalAlpha = alpha;
  const off = Math.round(world.eastOffset);
  if (off === 0) { g.drawImage(img, 0, 0, W, H); g.globalAlpha = 1; return; }
  g.save(); g.clip(map.westPath); g.drawImage(img, 0, 0, W, H); g.restore();
  g.save(); g.translate(off, 0); g.clip(map.eastPath); g.drawImage(img, 0, 0, W, H); g.restore();
  g.globalAlpha = 1;
}

function drawDivision(t) {
  const g = R.g;
  if (world.tint > 0.01) {
    const off = Math.round(world.eastOffset);
    g.globalAlpha = world.tint * 0.12;
    g.save(); g.clip(map.westPath); g.drawImage(map.westTint, 0, 0); g.restore();
    g.save(); g.translate(off, 0); g.clip(map.eastPath); g.drawImage(map.eastTint, 0, 0); g.restore();
    g.globalAlpha = 1;
  }
  if (world.split && world.eastOffset > 3) {
    // fence posts along both new coastlines
    const off = Math.round(world.eastOffset);
    for (let y = map.top; y <= map.bottom; y += 3) {
      const x = Math.round(map.bx(y));
      if (!map.isLand(x, y) && !map.isLand(x - 2, y) && !map.isLand(x + 2, y)) continue;
      if (map.isLand(x - 1, y)) { g.fillStyle = SIDE.west.dark; g.fillRect(x - 1, y, 1, 2); }
      if (map.isLand(x + 1, y)) { g.fillStyle = SIDE.east.dark; g.fillRect(x + 1 + off, y, 1, 2); }
    }
  }
}

// ---- roads: rebuilt from data whenever one is destroyed or (re)built -----------
function renderRoads() {
  if (!R.roads) { R.roads = makeCanvas(W, H); R.rg = R.roads.getContext('2d'); }
  const rg = R.rg;
  rg.clearRect(0, 0, W, H);
  for (const r of map.roads) {
    const reveal = world.roadReveal[r.id];
    if (reveal <= 0) continue;
    const fromB = world.roadFrom[r.id] === 'b';
    for (const p of r.pixels) {
      if ((fromB ? 1 - p.t : p.t) > reveal) continue;
      rg.fillStyle = p.c;
      rg.fillRect(p.x, p.y, 1, 1);
    }
  }
  world.roadsDirty = false;
}

// ---- city lights at night --------------------------------------------------------
function drawCityLights(g, t, night) {
  const a = clamp((night - 0.15) * 1.7, 0, 1);
  if (a <= 0) return;
  for (const c of world.cities) {
    const ox = offX(c.x, c.y);
    const electric = c.era >= 3 && c.lit > 0.5;
    const warm = electric ? (c.era >= 5 ? '#9ff6ff' : '#ffe9a6') : '#ffb45a';
    for (let k = 0; k < c.buildings.length; k++) {
      const b = c.buildings[k];
      if (b.ruinRoll < c.damage) continue;
      if (!electric && k % 3 !== 0) continue;
      if (!electric && Math.sin(t * 9 + k * 3.1 + c.id) < -0.6) continue;   // candles flicker
      const x = Math.round(c.x + ox + b.dx), y = Math.round(c.y - c.lift + b.dy - 1);
      g.globalAlpha = a * 0.22;
      g.fillStyle = warm; g.fillRect(x - 1, y - 1, 3, 3);
      g.globalAlpha = a;
      g.fillRect(x, y, 1, 1);
    }
  }
  g.globalAlpha = 1;
}

// ---- clouds -------------------------------------------------------------------
function makeClouds() {
  const r = new RNG(4242);
  const list = [];
  for (let k = 0; k < 7; k++) {
    const w = r.int(26, 46), h = r.int(10, 16);
    const puffs = [];
    for (let p = 0; p < 6; p++) puffs.push({ x: r.range(6, w - 6), y: r.range(h * 0.45, h - 4), r: r.range(3.5, 6.5) });
    const c = makeCanvas(w, h), s = makeCanvas(w, h);
    const cc = c.getContext('2d'), sc = s.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let inside = false, top = false;
      for (const p of puffs) {
        const d = Math.hypot(x - p.x, (y - p.y) * 1.2);
        if (d < p.r) { inside = true; if (y < p.y - p.r * 0.2) top = true; }
      }
      if (!inside) continue;
      cc.fillStyle = top ? '#f6f8f4' : '#dfe8e4'; cc.fillRect(x, y, 1, 1);
      sc.fillStyle = '#0c2226'; sc.fillRect(x, y, 1, 1);
    }
    list.push({ img: c, shadow: s, x: r.range(-40, W), y: r.range(-4, H - 20), speed: r.range(2.2, 4.2) });
  }
  return list;
}
function updateClouds(dt) {
  for (const c of R.clouds) {
    c.x += c.speed * dt * (world.timeDir || 1);
    if (c.x > W + 20) { c.x = -60; c.y = Math.random() * (H - 20); }
    if (c.x < -70) { c.x = W + 10; c.y = Math.random() * (H - 20); }
  }
}

// ---- the full frame ---------------------------------------------------------------
function render(t) {
  const g = R.g;
  g.imageSmoothingEnabled = false;
  renderWater(t);
  drawSplit(map.terrain);
  if (world.roadsDirty || !R.roads) renderRoads();
  drawSplit(R.roads);
  drawSplit(world.decals);
  for (const cv of covers) { cv.render(t); drawSplit(cv.canvas, cv.alpha); }
  drawDivision(t);
  // cloud shadows sit on the ground
  g.globalAlpha = 0.13;
  for (const c of R.clouds) g.drawImage(c.shadow, Math.round(c.x + 12), Math.round(c.y + 16));
  g.globalAlpha = 1;

  const ev = director.phase === 'play' ? director.active : null;
  drawCows(g, t);
  drawAmbientGround(g, t);
  const cities = world.cities.slice().sort((a, b) => a.y - b.y);
  drawIslands(g, t);
  for (const c of cities) drawCity(g, c, t);
  if (ev && ev.def.draw) ev.def.draw(ev, g, 'ground', t);
  fx.drawParticles(g, 'ground');
  fx.drawRings(g);
  if (ev && ev.def.draw) ev.def.draw(ev, g, 'air', t);
  leftovers.draw(g);
  fx.drawProjectiles(g);
  fx.drawParticles(g, 'air');
  g.globalAlpha = 0.82;
  for (const c of R.clouds) g.drawImage(c.img, Math.round(c.x), Math.round(c.y));
  g.globalAlpha = 1;

  // colour grades: the world's mood lighting
  const gr = world.grades;
  if (gr.ash.v > 0.01) {
    g.globalCompositeOperation = 'saturation';
    g.fillStyle = `rgba(128,128,128,${Math.min(1, gr.ash.v)})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgba(90,86,84,${gr.ash.v * 0.25})`; g.fillRect(0, 0, W, H);
  }
  if (gr.smog.v > 0.01) { g.fillStyle = `rgba(120,104,84,${gr.smog.v * 0.35})`; g.fillRect(0, 0, W, H); }
  if (gr.heat.v > 0.01) { g.fillStyle = `rgba(255,170,60,${gr.heat.v * 0.16})`; g.fillRect(0, 0, W, H); }
  if (gr.cold.v > 0.01) { g.fillStyle = `rgba(200,225,245,${gr.cold.v * 0.22})`; g.fillRect(0, 0, W, H); }
  if (gr.dust.v > 0.01) { g.fillStyle = `rgba(150,112,70,${gr.dust.v * 0.42})`; g.fillRect(0, 0, W, H); }
  if (gr.dusk.v > 0.01) { g.fillStyle = `rgba(30,20,60,${gr.dusk.v * 0.35})`; g.fillRect(0, 0, W, H); }
  if (gr.alien.v > 0.01) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgba(120,90,170,${gr.alien.v * 0.4})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgba(90,255,170,${gr.alien.v * 0.08})`; g.fillRect(0, 0, W, H);
  }
  if (gr.night.v > 0.01) {
    const n = gr.night.v;
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = rgbStr(mixRgb([255, 255, 255], [38, 48, 104], n)); g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    drawCityLights(g, t, n);
  }
  if (ev && ev.def.draw) ev.def.draw(ev, g, 'sky', t);
  fx.drawParticles(g, 'sky');
  fx.drawBolts(g);
  if (gr.glow.v > 0.01) { g.fillStyle = `rgba(255,236,170,${gr.glow.v * 0.12})`; g.fillRect(0, 0, W, H); }
  if (gr.flash.v > 0.01) { g.fillStyle = `rgba(255,250,235,${gr.flash.v * MOTION * (settings.values.flashes === false ? 0.15 : 1)})`; g.fillRect(0, 0, W, H); }
  g.drawImage(R.vignette, 0, 0);

  // blit to the screen through the camera
  const sg = R.sg, r = R.rect, dpr = r.dpr;
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.fillStyle = SEA_BG;
  sg.fillRect(0, 0, R.screen.width, R.screen.height);
  sg.imageSmoothingEnabled = false;
  const v = camera.view();
  const scale = r.w / W;
  const tilt = (world.tilt || 0) * Math.PI / 180;
  if (tilt) {
    // continental drift: the whole country leans about the middle of the view
    const cx = (r.x + r.w / 2) * dpr, cy = (r.y + r.h / 2) * dpr;
    sg.translate(cx, cy); sg.rotate(tilt); sg.translate(-cx, -cy);
  }
  sg.drawImage(R.buf, v.x0, v.y0, v.w, v.h,
    (r.x + camera.sx * scale) * dpr, (r.y + camera.sy * scale) * dpr, r.w * dpr, r.h * dpr);
  sg.setTransform(1, 0, 0, 1, 0, 0);
}
