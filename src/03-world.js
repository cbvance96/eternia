// ============================================================================
// 03 WORLD — the persistent state events read and change. History piles up
// here: splits, craters, renamed towns, the three rabbits that never left.
// ============================================================================

const ERAS = [
  { name: 'Stone Age', label: 'Stone Age', roofs: ['#8a6a44', '#735737'], walls: ['#b89a70', '#a88b62'], h: [1, 2], keep: '#a39479' },
  { name: 'Medieval', label: 'Medieval era', roofs: ['#b5523b', '#9e4430', '#7c5a3c', '#c46b3f'], walls: ['#e6dcc4', '#d6c9ab'], h: [2, 3], keep: '#b9b1a3' },
  { name: 'Industrial', label: 'Industrial era', roofs: ['#5b4a44', '#6a3a2e'], walls: ['#a8583f', '#94503c', '#b8a48c'], h: [2, 4], keep: '#8c8078', stacks: true },
  { name: 'Atomic', label: 'Atomic era', roofs: ['#6d7a82', '#58656c'], walls: ['#c9cdc8', '#b0b8b4'], h: [3, 5], keep: '#dfe3de' },
  { name: 'Digital', label: 'Digital era', roofs: ['#2f5e7a', '#3a7392'], walls: ['#9fc4d6', '#7fb0c8'], h: [4, 6], keep: '#e8f4fa' },
  { name: 'Future', label: 'Future era', roofs: ['#2ee6f0', '#e04fd0'], walls: ['#f2f6fa', '#dce8f0'], h: [4, 7], keep: '#ffffff' },
];

const SIDE = {
  west: { name: 'West Eternia', color: '#e3a33a', dark: '#b87812', rgb: hexToRgb('#e3a33a') },
  east: { name: 'East Eternia', color: '#8b4f9b', dark: '#6a3279', rgb: hexToRgb('#8b4f9b') },
};

let map = null;     // set once at boot
const world = {};   // filled by resetWorld

function resetWorld(seed) {
  world.seed = seed >>> 0;
  world.rng = new RNG(seed);
  world.startYear = 612 + world.rng.int(0, 400);
  world.day = 0;
  world.lastIncidentDay = 0;
  world.era = 1;
  world.split = false;
  world.splitAt = 0;
  world.eastCapitalId = null;
  world.eventsPlayed = 0;
  world.eastOffset = 0;
  world.eastOffsetTarget = 0;
  world.tint = 0;
  world.tintTarget = 0;
  world.mood = 64;
  world.craters = 0;
  world.devastation = 0;
  world.brand = 'Eternia';
  world.flagColor = '#2f7a6a';
  world.ruler = 'council';      // council | monarch | people | chef
  world.crowned = false;
  world.rulerName = null;
  world.freezeTraffic = false;
  world.tilt = 0;
  world.islands = [];     // new islands raised by events, kept forever
  world.fashion = null;   // a roof colour trend, or null
  world.trafficSpeed = 1;
  world.timeDir = 1;
  world.riverLevel = 1;
  world.freeze = 0;
  world.roadReveal = map.roads.map(() => 1);
  world.roadFrom = map.roads.map(() => 'a');
  world.roadsDirty = true;
  world.chronicle = [];
  world.grades = {
    flash: { v: 0, t: 0, rate: 5 },
    dust: { v: 0, t: 0, rate: 0.8 },
    alien: { v: 0, t: 0, rate: 1.2 },
    dusk: { v: 0, t: 0, rate: 0.8 },
    night: { v: 0, t: 0, rate: 0.9 },
    smog: { v: 0, t: 0, rate: 0.5 },
    cold: { v: 0, t: 0, rate: 0.6 },
    ash: { v: 0, t: 0, rate: 0.25 },
    glow: { v: 0, t: 0, rate: 1.2 },
    heat: { v: 0, t: 0, rate: 0.7 },
  };
  if (!world.decals) {
    world.decals = makeCanvas(W, H);
    world.dctx = world.decals.getContext('2d');
  }
  world.dctx.clearRect(0, 0, W, H);

  world.cities = map.cities.map((mc) => {
    const r = new RNG(MAP_SEED + mc.id * 31 + 5);
    const count = mc.capital ? 15 : 5 + mc.level * 3;
    const buildings = [];
    for (let k = 0; k < count; k++) {
      const a = k * 2.39996 + r.range(-0.3, 0.3);
      const rad = Math.sqrt(k + 0.5) * (mc.capital ? 2.1 : 1.9);
      buildings.push({
        dx: Math.round(Math.cos(a) * rad * 1.35),
        dy: Math.round(Math.sin(a) * rad * 0.85),
        w: r.chance(0.35) ? 3 : 2,
        hv: r.next(),
        roof: r.int(0, 3),
        wall: r.int(0, 2),
        ruinRoll: r.next(),
      });
    }
    buildings.sort((p, q) => p.dy - q.dy);
    const popCap = mc.capital ? r.int(14000, 19000) : mc.level * r.int(2600, 4800);
    return {
      ...mc,
      name: mc.baseName,
      pop: popCap,
      popCap,
      damage: 0,
      lift: 0,
      history: [],
      buildings,
      souvenirs: new Set(),
      renamed: false,
      era: world.era,
      lit: 1,
      bob: 0,
      chrome: 0,
      shake: 0,
      shrink: 0,
      keepAway: false,
      ox: 0, oy: 0,        // temporary draw offset (carried by pigeons, pushed by cats)
      alpha: 1,            // ghost towns go see-through
      cheese: false,       // wizards
      zombie: 0,
    };
  });

  // cows: little herds grazing near towns, mostly so aliens have something to take
  world.cows = [];
  const hr = new RNG(seed ^ 0xC0FFEE);
  for (let herd = 0; herd < 5; herd++) {
    for (let tries = 0; tries < 300; tries++) {
      const c = hr.pick(world.cities);
      const hx = c.x + hr.range(-28, 28), hy = c.y + hr.range(-20, 20);
      if (!map.isWalkable(hx, hy) || dist(hx, hy, c.x, c.y) < 12) continue;
      const i = Math.round(hy) * W + Math.round(hx);
      if (map.biome[i] !== BIOME.PLAINS) continue;
      const n = hr.int(4, 7);
      for (let k = 0; k < n; k++) {
        world.cows.push({
          x: hx + hr.range(-4, 4), y: hy + hr.range(-3, 3), hx, hy,
          tx: hx, ty: hy, wait: hr.range(0, 3), z: 0, vz: 0, abducted: false, chute: false,
          spots: hr.chance(0.5),
        });
      }
      break;
    }
  }
  world.rabbits = [];   // survivors of the Great Rabbit Incident, if it ever happens
}

const year = () => world.startYear + Math.floor(world.day / 365);
const eraInfo = () => ERAS[world.era];
function setEra(e) {
  world.era = e;
  for (const c of world.cities) c.era = e;
}
const avgDamage = () => world.cities.reduce((s, c) => s + c.damage, 0) / world.cities.length;
const population = () => world.cities.reduce((s, c) => s + c.pop, 0);
function moodWord(m = world.mood) {
  if (m > 82) return 'Jubilant';
  if (m > 62) return 'Content';
  if (m > 42) return 'Grumbling';
  if (m > 22) return 'Grumpy';
  return 'Furious';
}
function capitalOf(side) {
  if (!world.split) return world.cities.find((c) => c.capital);
  if (side === 'west') return world.cities.find((c) => c.capital);
  return world.cities.find((c) => c.id === world.eastCapitalId) || world.cities.find((c) => c.side === 'east');
}
function countryName() {
  return world.split ? 'East & West Eternia' : world.brand;
}
function logCity(city, text) {
  city.history.unshift({ year: year(), text });
  if (city.history.length > 8) city.history.pop();
}

// split-aware horizontal offset for anything drawn at world position (x, y)
function offX(x, y) {
  if (world.eastOffset < 0.01) return 0;
  return x >= map.bx(y) ? world.eastOffset : 0;
}

function updateWorld(dt) {
  world.eastOffset = approach(world.eastOffset, world.eastOffsetTarget, 1.1, dt);
  if (Math.abs(world.eastOffset - world.eastOffsetTarget) < 0.02) world.eastOffset = world.eastOffsetTarget;
  world.tint = approach(world.tint, world.tintTarget, 1.3, dt);
  for (const k in world.grades) {
    const gr = world.grades[k];
    gr.v = approach(gr.v, gr.t, gr.rate, dt);
  }
  for (const c of world.cities) {
    // towns slowly rebuild and refill on their own between disasters
    if (c.damage > 0) c.damage = Math.max(0, c.damage - dt * 0.011);
    if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    c.pop += (c.popCap - c.pop) * dt * 0.03;
  }
  world.mood = approach(world.mood, 62, 0.02, dt);
  world.devastation = Math.max(0, world.devastation - dt * 0.003);
  // old scars slowly grass over, so a long history never turns into a mess
  world.erode = (world.erode || 0) + dt;
  if (world.erode > 2) {
    world.erode = 0;
    const d = world.dctx;
    d.globalCompositeOperation = 'destination-out';
    d.fillStyle = 'rgba(0,0,0,0.012)';
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'source-over';
  }
}

// ---- drawing a town ---------------------------------------------------------
const CHROME = { roofs: ['#8fa4ad', '#a9bcc4'], walls: ['#dfe7ea', '#c9d4d8'], keep: '#eef4f6' };
const CHEESE = { roofs: ['#e8b83a', '#dca830'], walls: ['#f4d45a', '#f0cc50'], keep: '#f4d45a' };
const ZOMBIE = { roofs: ['#4a6a3a', '#3f5a32'], walls: ['#a8c890', '#98b880'], keep: '#9ab880' };
function drawCity(g, c, t) {
  const base = ERAS[c.era];
  let era = c.cheese ? { ...base, ...CHEESE } : c.zombie > 0.5 ? { ...base, ...ZOMBIE } : c.chrome > 0.5 ? { ...base, ...CHROME } : base;
  if (world.fashion && !c.cheese) era = { ...era, roofs: world.fashion };
  if (c.alpha < 1) g.globalAlpha = c.alpha;
  const ox = offX(c.x, c.y);
  const bob = c.bob ? Math.round(Math.sin(t * 2.6 + c.id) * 1.2 * c.bob) : 0;
  const jig = c.shake > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
  const cx = Math.round(c.x + ox + c.ox) + jig;
  const cy = Math.round(c.y - c.lift + c.oy) + bob;
  // exposed dirt where the town used to be, if it is currently in the sky
  if (c.lift > 0.5) {
    g.fillStyle = '#7a5f45';
    g.fillRect(Math.round(c.x + ox) - 7, c.y - 2, 15, 5);
    g.fillStyle = '#5e4735';
    g.fillRect(Math.round(c.x + ox) - 5, c.y - 1, 11, 3);
    const s = clamp(1 - c.lift / 40, 0.3, 1);
    g.fillStyle = `rgba(20,30,30,${0.25 * s})`;
    g.fillRect(Math.round(c.x + ox) - Math.round(9 * s), c.y + 3, Math.round(18 * s), 2);
  }
  for (let k = 0; k < c.buildings.length; k++) {
    const b = c.buildings[k];
    const x = cx + b.dx, y = cy + b.dy;
    if (b.ruinRoll > 1 - c.shrink) continue;
    const ruined = b.ruinRoll < c.damage;
    if (ruined) {
      g.fillStyle = '#5a4a3e'; g.fillRect(x, y, b.w, 1);
      g.fillStyle = '#8a7a68'; g.fillRect(x + (k & 1), y - 1, 1, 1);
      continue;
    }
    const h = Math.round(lerp(era.h[0], era.h[1], b.hv));
    g.fillStyle = 'rgba(25,35,30,0.35)';
    g.fillRect(x + 1, y + 1, b.w, 1);
    g.fillStyle = era.walls[b.wall % era.walls.length];
    g.fillRect(x, y - h + 1, b.w, h);
    g.fillStyle = era.roofs[b.roof % era.roofs.length];
    g.fillRect(x, y - h, b.w, 1);
    if (b.w === 3 && world.era <= 1) g.fillRect(x + 1, y - h - 1, 1, 1);
    if (h >= 3) { g.fillStyle = 'rgba(40,40,50,0.45)'; g.fillRect(x + (b.w > 2 ? 1 : 0), y - h + 2, 1, 1); }
    if (c.cheese && (k % 2 === 0)) { g.fillStyle = '#b8862a'; g.fillRect(x + (k % 3 === 0 ? 0 : b.w - 1), y - Math.max(0, h - 2), 1, 1); }
    if (era.stacks && (k % 4 === 0)) { g.fillStyle = '#3a3230'; g.fillRect(x + b.w - 1, y - h - 2, 1, 2); }
  }
  if ((c.capital || c.id === world.eastCapitalId) && !c.keepAway) {
    // the keep, with a flag in the colour of whoever currently owns it
    const kx = cx - 1, ky = cy - 1;
    const kh = 6 + c.era;
    g.fillStyle = 'rgba(25,35,30,0.35)'; g.fillRect(kx + 1, ky + 1, 3, 1);
    g.fillStyle = era.keep; g.fillRect(kx, ky - kh + 1, 3, kh);
    g.fillRect(kx - 1, ky - kh, 1, 1); g.fillRect(kx + 1, ky - kh, 1, 1); g.fillRect(kx + 3, ky - kh, 1, 1);
    g.fillStyle = '#3d3a36'; g.fillRect(kx + 1, ky - kh - 4, 1, 4);
    const flag = world.split ? SIDE[c.side].color : world.flagColor;
    const wave = Math.sin(t * 5 + c.id) > 0 ? 1 : 0;
    if (world.ruler === 'chef' && c.capital) {
      // the ladle of state
      g.fillStyle = '#c8ccd0'; g.fillRect(kx + 2, ky - kh - 4, 1, 3); g.fillRect(kx + 1, ky - kh - 1, 3, 1);
    } else {
      g.fillStyle = flag;
      g.fillRect(kx + 2, ky - kh - 4, 3, 1);
      g.fillRect(kx + 2, ky - kh - 3, 2 + wave, 1);
    }
    if (world.crowned && c.capital) {
      g.fillStyle = '#f4c542';
      g.fillRect(kx, ky - kh - 6, 3, 1); g.fillRect(kx, ky - kh - 7, 1, 1); g.fillRect(kx + 2, ky - kh - 7, 1, 1);
    }
  }
  if (c.souvenirs.has('statue')) {
    g.fillStyle = '#8a6a2a'; g.fillRect(cx + 6, cy + 1, 3, 1);
    g.fillStyle = '#f4c542'; g.fillRect(cx + 7, cy - 3, 1, 4); g.fillRect(cx + 6, cy - 2, 3, 1);
    g.fillStyle = '#fff0a0'; g.fillRect(cx + 7, cy - 4, 1, 1);
  }
  if (c.souvenirs.has('moonrock')) {
    g.fillStyle = '#6a6460'; g.fillRect(cx - 7, cy + 2, 3, 1);
    g.fillStyle = '#b8b2a8'; g.fillRect(cx - 7, cy + 1, 2, 1);
  }
  if (c.souvenirs.has('sun')) {
    const p = 0.5 + Math.sin(t * 3) * 0.5;
    g.fillStyle = `rgba(255,220,120,${0.25 + p * 0.2})`; g.fillRect(cx - 2, cy - 17, 5, 5);
    g.fillStyle = '#fff4c0'; g.fillRect(cx - 1, cy - 16, 3, 3);
  }
  if (c.souvenirs.has('antenna')) {
    g.fillStyle = '#c9d3d8'; g.fillRect(cx + 5, cy - 7, 1, 5);
    g.fillStyle = Math.sin(t * 6) > 0 ? '#7dffb0' : '#2a8a5a'; g.fillRect(cx + 5, cy - 8, 1, 1);
  }
  g.globalAlpha = 1;
}

function drawCows(g, t) {
  for (const cow of world.cows) {
    if (cow.abducted) continue;
    const x = Math.round(cow.x + offX(cow.x, cow.y));
    const y = Math.round(cow.y - cow.z);
    if (cow.chute) {
      g.fillStyle = '#f2efe6'; g.fillRect(x - 2, y - 6, 5, 1); g.fillRect(x - 1, y - 7, 3, 1);
      g.fillStyle = 'rgba(242,239,230,0.6)'; g.fillRect(x - 2, y - 5, 1, 4); g.fillRect(x + 2, y - 5, 1, 4);
    }
    if (cow.z < 0.5) { g.fillStyle = 'rgba(20,35,25,0.3)'; g.fillRect(x, y + 1, 2, 1); }
    g.fillStyle = '#f4f1ea'; g.fillRect(x, y, 2, 1);
    g.fillStyle = '#2b2622'; g.fillRect(x + (cow.spots ? 1 : 0), y, 1, 1);
    g.fillStyle = '#f4f1ea'; g.fillRect(x + (cow.face > 0 ? 2 : -1), y - 1, 1, 1);
  }
}

function updateCows(dt) {
  for (const cow of world.cows) {
    if (cow.abducted || cow.held) continue;
    if (cow.z > 0) {
      cow.z = Math.max(0, cow.z + cow.vz * dt);
      if (cow.z === 0) cow.chute = false;
      continue;
    }
    cow.wait -= dt;
    if (cow.wait <= 0) {
      cow.wait = world.rng.range(1.5, 5);
      cow.tx = cow.hx + world.rng.range(-7, 7);
      cow.ty = cow.hy + world.rng.range(-5, 5);
    }
    const dx = cow.tx - cow.x, dy = cow.ty - cow.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const nx = cow.x + (dx / d) * 1.6 * dt, ny = cow.y + (dy / d) * 1.6 * dt;
      if (map.isWalkable(nx, ny)) { cow.x = nx; cow.y = ny; cow.face = Math.sign(dx); }
    }
  }
}

// islands raised from the sea by events; they stay for the rest of history
function drawIslands(g, t) {
  for (const is of world.islands) {
    const grow = clamp(is.grow ?? 1, 0, 1);
    if (grow <= 0) continue;
    const r = is.r * grow, x0 = Math.round(is.x + offX(is.x, is.y)), y0 = Math.round(is.y);
    for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r * 1.5); dx <= r * 1.5; dx++) {
      const d = Math.hypot(dx / 1.5, dy) + (hash2(dx + is.seed, dy) - 0.5) * 1.4;
      if (d > r) continue;
      g.fillStyle = d > r - 1.2 ? TERRAIN_COLORS.ink : d > r - 2.4 ? '#e7d6a6' : (hash2(dx, dy + is.seed) > 0.5 ? '#86a861' : '#9cbc72');
      g.fillRect(x0 + dx, y0 + dy, 1, 1);
    }
    if (grow >= 1 && is.r >= 4) {
      g.fillStyle = '#6b4a30'; g.fillRect(x0, y0 - 3, 1, 3);
      g.fillStyle = '#3f7a2a'; g.fillRect(x0 - 2, y0 - 4, 5, 1); g.fillRect(x0 - 1, y0 - 5, 3, 1);
    }
  }
}
