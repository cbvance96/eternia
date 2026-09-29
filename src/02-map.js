// ============================================================================
// 02 MAP — Eternia is generated once from MAP_SEED and then treated as a fixed
// country. The same shape every run gives it an identity, like a real place.
// ============================================================================

const BIOME = { OCEAN: 0, PLAINS: 1, FOREST: 2, DESERT: 3, BEACH: 4, MOUNTAIN: 5, SNOW: 6, WET: 7 };

const TERRAIN_COLORS = {
  plains: ['#6f9150', '#86a861', '#9cbc72', '#b1cd84'],
  forest: ['#35593a', '#446d43', '#56824f'],
  desert: ['#c6a162', '#d7b776', '#e5ca8d', '#efd9a3'],
  beach: ['#d9c592', '#e7d6a6'],
  mountain: ['#665f58', '#7f766b', '#9a9083', '#b4ab9d'],
  snow: ['#dfe5e3', '#f3f6f2'],
  ink: '#27403b',
  road: '#d2bf93',
  roadDark: '#b39f73',
  bridge: '#7a5638',
};

const INLAND_NAMES = [
  'Upper Brambleford', 'Grumbleton', 'Snootsbury', 'Mildew', 'Wobblemere',
  'Nether Snorkel', 'Fort Probably', "Saint Gerald's", 'Crumpet Hollow', 'Dampshire',
  'Little Fussing', 'Muddle', 'Lower Brambleford', 'Great Fussing',
];
const COASTAL_NAMES = ['Pudding-on-Sea', 'Port Soggy', 'Saltwhistle Bay', 'Clam Harbour', 'Wetley'];

function generateMap() {
  const noise = makeNoise(MAP_SEED);
  const noiseB = makeNoise(MAP_SEED + 101);
  const N = W * H;
  const idx = (x, y) => y * W + x;

  // ---- 1. raw elevation: warped fractal noise minus an elliptical falloff ----
  const elev = new Float32Array(N);
  const cx = W * 0.5, cy = H * 0.5;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wx = x + (noise.fbm(x * 0.008 + 11, y * 0.008 + 3, 3) - 0.5) * 120;
      const wy = y + (noise.fbm(x * 0.008 + 57, y * 0.008 + 91, 3) - 0.5) * 90;
      const e = noise.fbm(wx * 0.0105, wy * 0.0105, 5);
      const nx = (x - cx) / (W * 0.41);
      const ny = (y - cy) / (H * 0.40);
      const d = Math.sqrt(nx * nx + ny * ny);
      elev[idx(x, y)] = e * 1.25 - Math.pow(d, 1.6) * 0.62 - 0.12;
    }
  }

  // ---- 2. land mask with a guaranteed ocean frame --------------------------
  let land = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    const edge = x < 18 || x > W - 19 || y < 14 || y > H - 15;
    land[i] = !edge && elev[i] > 0 ? 1 : 0;
  }

  // ---- 3. keep the largest landmass plus a few sizeable islands ------------
  const comp = new Int32Array(N).fill(-1);
  const sizes = [];
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (!land[i] || comp[i] >= 0) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(i); comp[i] = id;
    while (stack.length) {
      const k = stack.pop(); size++;
      const kx = k % W, ky = (k / W) | 0;
      const nb = [kx > 0 ? k - 1 : -1, kx < W - 1 ? k + 1 : -1, ky > 0 ? k - W : -1, ky < H - 1 ? k + W : -1];
      for (const n of nb) if (n >= 0 && land[n] && comp[n] < 0) { comp[n] = id; stack.push(n); }
    }
    sizes.push(size);
  }
  let mainId = 0;
  sizes.forEach((s, i) => { if (s > sizes[mainId]) mainId = i; });
  const island = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const c = comp[i];
    if (c === mainId) continue;
    if (sizes[c] >= 70) island[i] = 1; else land[i] = 0;
  }

  // ---- 4. fill enclosed water so the ocean is one body ---------------------
  const oceanReach = new Uint8Array(N);
  for (let x = 0; x < W; x++) { stack.push(idx(x, 0), idx(x, H - 1)); }
  for (let y = 0; y < H; y++) { stack.push(idx(0, y), idx(W - 1, y)); }
  while (stack.length) {
    const k = stack.pop();
    if (oceanReach[k] || land[k]) continue;
    oceanReach[k] = 1;
    const kx = k % W, ky = (k / W) | 0;
    if (kx > 0) stack.push(k - 1);
    if (kx < W - 1) stack.push(k + 1);
    if (ky > 0) stack.push(k - W);
    if (ky < H - 1) stack.push(k + W);
  }
  for (let i = 0; i < N; i++) if (!land[i] && !oceanReach[i]) land[i] = 1;

  // ---- 5. the East/West border: a meandering line through the mainland -----
  let top = H, bottom = 0;
  const rowMin = new Int32Array(H).fill(-1), rowMax = new Int32Array(H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (land[i] && !island[i]) {
      if (rowMin[y] < 0) rowMin[y] = x;
      rowMax[y] = x;
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  // Walk outward from the middle row, following the land run nearest to the
  // previous row's midpoint, so the line hugs the mainland instead of drifting.
  const rawBorder = new Float32Array(H);
  const runMid = (y, prev) => {
    let best = null;
    let x = 0;
    while (x < W) {
      const i = idx(x, y);
      if (land[i] && !island[i]) {
        const s0 = x;
        while (x < W && land[idx(x, y)]) x++;
        const mid = (s0 + x - 1) / 2;
        const d = prev >= s0 && prev <= x - 1 ? 0 : Math.min(Math.abs(prev - s0), Math.abs(prev - x + 1));
        if (d < 30 && (!best || d < best.d)) best = { mid, d };
      } else x++;
    }
    return best ? best.mid : prev;
  };
  const midRow = Math.round((top + bottom) / 2);
  rawBorder[midRow] = runMid(midRow, W / 2);
  for (let y = midRow - 1; y >= 0; y--) rawBorder[y] = runMid(y, rawBorder[y + 1]);
  for (let y = midRow + 1; y < H; y++) rawBorder[y] = runMid(y, rawBorder[y - 1]);
  for (let y = 0; y < H; y++) {
    rawBorder[y] = clamp(rawBorder[y], W * 0.42, W * 0.58) + (noiseB.fbm(y * 0.035, 7.3, 3) - 0.5) * 26;
  }
  const borderX = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    let s = 0, n = 0;
    for (let k = -10; k <= 10; k++) { s += rawBorder[clamp(y + k, 0, H - 1)]; n++; }
    borderX[y] = s / n;
  }
  const bx = (y) => borderX[clamp(Math.round(y), 0, H - 1)];

  // ---- 6. lake, river and the northern ridge along the border --------------
  const lakeY = Math.round(top + (bottom - top) * 0.34);
  const lake = { x: bx(lakeY), y: lakeY, rx: 8, ry: 5 };
  const wet = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (!land[i]) continue;
    const lx = (x - lake.x) / lake.rx, ly = (y - lake.y) / lake.ry;
    const wob = noiseB.n2(x * 0.3, y * 0.3) * 0.35;
    if (lx * lx + ly * ly < 1 + wob) wet[i] = 1;
    if (y > lakeY && Math.abs(x - bx(y)) <= 1) wet[i] = 1;          // the river
    if (y < lakeY - 2) {                                               // the ridge
      const dx = x - bx(y);
      const fade = smooth((y - top) / 8) * smooth((lakeY - 2 - y) / 10);
      elev[i] += Math.exp(-(dx * dx) / (2 * 10 * 10)) * 0.42 * fade;
    }
  }

  // ---- 7. distance fields (BFS) ---------------------------------------------
  const waterDist = new Uint8Array(N).fill(255);  // ocean cell -> distance to land
  const landDist = new Uint8Array(N).fill(255);   // land cell -> distance to ocean
  let queue = [];
  for (let i = 0; i < N; i++) if (land[i]) { waterDist[i] = 0; queue.push(i); }
  bfs(queue, waterDist, (i) => !land[i], 40);
  queue = [];
  for (let i = 0; i < N; i++) if (!land[i]) { landDist[i] = 0; queue.push(i); }
  bfs(queue, landDist, (i) => land[i] === 1, 60);
  function bfs(q, field, passable, cap) {
    let head = 0;
    while (head < q.length) {
      const k = q[head++];
      const d = field[k];
      if (d >= cap) continue;
      const kx = k % W, ky = (k / W) | 0;
      const nb = [kx > 0 ? k - 1 : -1, kx < W - 1 ? k + 1 : -1, ky > 0 ? k - W : -1, ky < H - 1 ? k + W : -1];
      for (const n of nb) {
        if (n < 0 || !passable(n) || field[n] <= d + 1) continue;
        field[n] = d + 1;
        q.push(n);
      }
    }
  }

  // ---- 8. biomes --------------------------------------------------------------
  const landElev = [];
  for (let i = 0; i < N; i++) if (land[i] && !wet[i]) landElev.push(elev[i]);
  landElev.sort((a, b) => a - b);
  const mountainAt = landElev[Math.floor(landElev.length * 0.86)];
  const snowAt = landElev[Math.floor(landElev.length * 0.985)];
  const biome = new Uint8Array(N);
  const moisture = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (!land[i]) { biome[i] = BIOME.OCEAN; continue; }
    if (wet[i]) { biome[i] = BIOME.WET; continue; }
    const m = noiseB.fbm(x * 0.017 + 40, y * 0.017 + 12, 4) + 0.2 - (x / W) * 0.4;
    moisture[i] = m;
    const e = elev[i];
    if (e > snowAt) biome[i] = BIOME.SNOW;
    else if (e > mountainAt) biome[i] = BIOME.MOUNTAIN;
    else if (landDist[i] <= 2) biome[i] = BIOME.BEACH;
    else if (m > 0.53) biome[i] = BIOME.FOREST;
    else if (m < 0.34) biome[i] = BIOME.DESERT;
    else biome[i] = BIOME.PLAINS;
  }

  // ---- 9. bake terrain pixels ---------------------------------------------
  const terrain = makeCanvas(W, H);
  const tctx = terrain.getContext('2d');
  const img = tctx.createImageData(W, H);
  const px = new Uint32Array(img.data.buffer);
  const pal = {};
  for (const k of ['plains', 'forest', 'desert', 'beach', 'mountain', 'snow']) {
    pal[k] = TERRAIN_COLORS[k].map((h) => hexToRgb(h));
  }
  const ink = hexToRgb(TERRAIN_COLORS.ink);
  const eAt = (x, y) => elev[idx(clamp(x, 0, W - 1), clamp(y, 0, H - 1))];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    const b = biome[i];
    if (b === BIOME.OCEAN || b === BIOME.WET) { px[i] = 0; continue; }
    // hillshade: light comes from the north-west
    const slope = (eAt(x - 1, y - 1) - eAt(x + 1, y + 1)) * 9;
    const tone = clamp(0.5 + slope + (hash2(x, y) - 0.5) * 0.12, 0, 0.999);
    let ramp;
    switch (b) {
      case BIOME.FOREST: ramp = pal.forest; break;
      case BIOME.DESERT: ramp = pal.desert; break;
      case BIOME.BEACH: ramp = pal.beach; break;
      case BIOME.MOUNTAIN: ramp = pal.mountain; break;
      case BIOME.SNOW: ramp = pal.snow; break;
      default: ramp = pal.plains;
    }
    // ordered dither between the two nearest ramp steps
    const f = tone * (ramp.length - 1);
    const lo = Math.floor(f);
    const pick = f - lo > bayer(x, y) ? Math.min(lo + 1, ramp.length - 1) : lo;
    px[i] = packRgb(ramp[pick]);
  }
  // decorations: tree clumps, grass tufts, dunes, peaks
  const setPx = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = idx(x, y);
    if (!land[i] || wet[i]) return;
    px[i] = packRgb(c);
  };
  for (let gy = 0; gy < H; gy += 3) for (let gx = 0; gx < W; gx += 3) {
    const jx = gx + Math.floor(hash2(gx, gy) * 3), jy = gy + Math.floor(hash2(gy, gx) * 3);
    if (jx >= W || jy >= H) continue;
    const b = biome[idx(jx, jy)];
    if (b === BIOME.FOREST && hash2(jx + 5, jy) < 0.8) {
      setPx(jx, jy, pal.forest[0]); setPx(jx + 1, jy, pal.forest[0]);
      setPx(jx, jy - 1, pal.forest[2]); setPx(jx + 1, jy - 1, pal.forest[1]);
    } else if (b === BIOME.PLAINS && hash2(jx, jy + 9) < 0.09) {
      setPx(jx, jy, pal.plains[3]);
    } else if (b === BIOME.DESERT && hash2(jx + 2, jy + 3) < 0.12) {
      setPx(jx, jy, pal.desert[3]); setPx(jx + 1, jy, pal.desert[3]); setPx(jx + 1, jy + 1, pal.desert[0]);
    }
  }
  for (let gy = 0; gy < H; gy += 5) for (let gx = 0; gx < W; gx += 7) {
    const jx = gx + Math.floor(hash2(gx + 1, gy) * 4), jy = gy + Math.floor(hash2(gy + 3, gx) * 3);
    if (jx >= W || jy >= H) continue;
    const b = biome[idx(jx, jy)];
    if ((b === BIOME.MOUNTAIN || b === BIOME.SNOW) && hash2(jx, jy + 77) < 0.75) {
      const snowy = b === BIOME.SNOW || elev[idx(jx, jy)] > (mountainAt + snowAt) / 2;
      const peak = snowy ? pal.snow[1] : pal.mountain[3];
      setPx(jx, jy - 2, peak);
      setPx(jx - 1, jy - 1, peak); setPx(jx, jy - 1, pal.mountain[2]); setPx(jx + 1, jy - 1, pal.mountain[1]);
      setPx(jx - 2, jy, pal.mountain[2]); setPx(jx - 1, jy, pal.mountain[2]);
      setPx(jx, jy, pal.mountain[1]); setPx(jx + 1, jy, pal.mountain[0]); setPx(jx + 2, jy, pal.mountain[0]);
    }
  }
  // coast ink outline makes it read like a drawn map
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = idx(x, y);
    if (!land[i] || wet[i]) continue;
    if (!land[i - 1] || !land[i + 1] || !land[i - W] || !land[i + W]) px[i] = packRgb(ink);
    else if (wet[i - 1] || wet[i + 1] || wet[i - W] || wet[i + W]) px[i] = packRgb(shadeRgb(hexToRgb('#6f9150'), 0.72));
  }

  // ---- 10. cities ------------------------------------------------------------
  const crng = new RNG(MAP_SEED + 7);
  const okSpot = (x, y, minBorder = 12) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return false;
    const i = idx(x, y);
    if (!land[i] || wet[i] || island[i]) return false;
    const b = biome[i];
    if (b === BIOME.MOUNTAIN || b === BIOME.SNOW) return false;
    if (landDist[i] < 5) return false;
    if (Math.abs(x - bx(y)) < minBorder) return false;
    return true;
  };
  const cities = [];
  const farEnough = (x, y, d) => cities.every((c) => dist(c.x, c.y, x, y) >= d);
  // the capital sits a short ride west of the river, like all good capitals
  const capY = (top + bottom) * 0.5;
  let capital = null;
  for (let y = top; y <= bottom; y++) for (let x = 20; x < W - 20; x++) {
    const dx = bx(y) - x;
    if (dx < 16 || dx > 70 || !okSpot(x, y)) continue;
    const score = Math.abs(dx - 30) + Math.abs(y - capY) * 0.8 + (hash2(x, y) * 6);
    if (!capital || score < capital.score) capital = { x, y, score };
  }
  if (capital) cities.push({ x: capital.x, y: capital.y, capital: true });
  // alternate sides so both halves of a future civil war have enough towns
  for (let tries = 0; tries < 12000 && cities.length < 11; tries++) {
    const x = crng.range(20, W - 20), y = crng.range(16, H - 16);
    const west = cities.filter((c) => c.x < bx(c.y)).length;
    const wantWest = west * 2 <= cities.length;
    if ((x < bx(y)) !== wantWest && tries < 9000) continue;
    if (okSpot(x, y) && farEnough(x, y, 36)) cities.push({ x: Math.round(x), y: Math.round(y), capital: false });
  }
  const inland = INLAND_NAMES.slice(), coastal = COASTAL_NAMES.slice();
  cities.forEach((c, n) => {
    c.id = n;
    c.coastal = landDist[idx(c.x, c.y)] <= 9;
    c.side = c.x < bx(c.y) ? 'west' : 'east';
    c.level = c.capital ? 3 : crng.chance(0.4) ? 2 : 1;
    if (c.capital) c.name = 'Eternopolis';
    else if (c.coastal && coastal.length) c.name = coastal.splice(crng.int(0, coastal.length - 1), 1)[0];
    else c.name = inland.splice(crng.int(0, inland.length - 1), 1)[0];
    c.baseName = c.name;
  });

  // ---- 11. roads: a minimum spanning tree plus a couple of shortcuts --------
  const segmentCost = (a, b) => {
    let oceanPx = 0;
    const steps = Math.ceil(dist(a.x, a.y, b.x, b.y));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(lerp(a.x, b.x, s / steps)), y = Math.round(lerp(a.y, b.y, s / steps));
      if (!land[idx(x, y)]) oceanPx++;
    }
    return dist(a.x, a.y, b.x, b.y) * (oceanPx > 2 ? 50 : 1) + (Math.sign(a.x - bx(a.y)) !== Math.sign(b.x - bx(b.y)) ? 20 : 0);
  };
  const inTree = new Set([0]);
  const roads = [];
  while (inTree.size < cities.length) {
    let best = null;
    for (const i of inTree) for (let j = 0; j < cities.length; j++) {
      if (inTree.has(j)) continue;
      const cost = segmentCost(cities[i], cities[j]);
      if (!best || cost < best.cost) best = { i, j, cost };
    }
    inTree.add(best.j);
    roads.push({ a: best.i, b: best.j });
  }
  // two extra roads so traffic has loops
  const extras = [];
  for (let i = 0; i < cities.length; i++) for (let j = i + 1; j < cities.length; j++) {
    if (roads.some((r) => (r.a === i && r.b === j) || (r.a === j && r.b === i))) continue;
    const c = segmentCost(cities[i], cities[j]);
    if (c < 95) extras.push({ a: i, b: j, cost: c });
  }
  extras.sort((p, q) => p.cost - q.cost).slice(0, 2).forEach((e) => roads.push({ a: e.a, b: e.b }));
  roads.forEach((r, n) => { r.id = n; });
  for (const r of roads) {
    const A = cities[r.a], B = cities[r.b];
    const len = dist(A.x, A.y, B.x, B.y);
    const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
    const bend = (hash2(r.a * 13, r.b * 7) - 0.5) * len * 0.22;
    r.pts = [];
    r.pixels = [];
    const steps = Math.ceil(len * 1.2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const k = Math.sin(t * Math.PI) * bend;
      const x = lerp(A.x, B.x, t) + nx * k, y = lerp(A.y, B.y, t) + ny * k;
      r.pts.push({ x, y });
      const ix = Math.round(x), iy = Math.round(y);
      const i = idx(ix, iy);
      const last = r.pixels.length ? r.pixels[r.pixels.length - 1] : null;
      if (last && last.x === ix && last.y === iy) continue;
      if (wet[i]) r.pixels.push({ x: ix, y: iy, c: TERRAIN_COLORS.bridge, t });
      else if (land[i] && dist(ix, iy, A.x, A.y) > 3 && dist(ix, iy, B.x, B.y) > 3) {
        r.pixels.push({ x: ix, y: iy, c: (ix + iy) % 3 === 0 ? TERRAIN_COLORS.roadDark : TERRAIN_COLORS.road, t });
      }
    }
    r.length = len;
    r.crossesBorder = cities[r.a].side !== cities[r.b].side;
  }
  tctx.putImageData(img, 0, 0);

  // ---- 12. clip paths and land silhouettes for the split ---------------------
  const eastPath = new Path2D(), westPath = new Path2D();
  eastPath.moveTo(W + 40, -10); westPath.moveTo(-40, -10);
  for (let y = -10; y <= H + 10; y++) { eastPath.lineTo(bx(y) + 0.5, y); westPath.lineTo(bx(y) + 0.5, y); }
  eastPath.lineTo(W + 40, H + 10); eastPath.closePath();
  westPath.lineTo(-40, H + 10); westPath.closePath();
  const silhouette = (color) => {
    const c = makeCanvas(W, H);
    const cc = c.getContext('2d');
    const im = cc.createImageData(W, H);
    const p = new Uint32Array(im.data.buffer);
    const col = packRgb(hexToRgb(color));
    for (let i = 0; i < N; i++) if (land[i] && !island[i]) p[i] = col;
    cc.putImageData(im, 0, 0);
    return c;
  };

  // label anchors: centroid of each half
  const centroidUnused = (test) => {
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const i = idx(x, y);
      if (land[i] && !island[i] && test(x, y)) { sx += x; sy += y; n++; }
    }
    return { x: sx / n, y: sy / n };
  };
  // country names go in the emptiest stretch of land on each side
  const labelSpot = (test) => {
    let best = null;
    for (let y = 30; y < H - 20; y += 3) for (let x = 30; x < W - 30; x += 3) {
      if (!test(x, y)) continue;
      let ok = true;
      for (let dx = -22; dx <= 22 && ok; dx += 4) {
        const i = idx(clamp(x + dx, 0, W - 1), y);
        if (!land[i] || island[i] || biome[i] === BIOME.MOUNTAIN || biome[i] === BIOME.SNOW) ok = false;
      }
      if (!ok) continue;
      const near = Math.min(...cities.map((c) => dist(c.x, c.y, x, y) + Math.abs(c.y + 7 - y) * 0.5));
      if (!best || near > best.near) best = { x, y, near };
    }
    return best || { x: W / 2, y: H / 2 };
  };
  const islands = [];
  const seen = new Set();
  for (let i = 0; i < N; i++) if (island[i] && !seen.has(comp[i])) {
    seen.add(comp[i]);
    let sx = 0, sy = 0, n = 0;
    for (let k = 0; k < N; k++) if (comp[k] === comp[i]) { sx += k % W; sy += (k / W) | 0; n++; }
    islands.push({ x: sx / n, y: sy / n, size: n });
  }

  return {
    land, wet, island, biome, elev, moisture, waterDist, landDist, borderX, bx, lake,
    top, bottom, rowMin, rowMax, cities, roads, terrain, eastPath, westPath,
    westTint: silhouette('#e3a33a'), eastTint: silhouette('#8b4f9b'),
    centers: {
      all: labelSpot(() => true),
      west: labelSpot((x, y) => x < bx(y) - 26),
      east: labelSpot((x, y) => x > bx(y) + 26),
    },
    islands,
    isLand: (x, y) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      return land[idx(x, y)] === 1;
    },
    isWalkable: (x, y) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const i = idx(x, y);
      return land[i] === 1 && !wet[i];
    },
    oceanDepth: (x, y) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return 40;
      const i = idx(x, y);
      return land[i] ? 0 : waterDist[i];
    },
  };
}
