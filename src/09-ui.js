// ============================================================================
// 09 UI — crisp HTML on top of the pixel world. Text carries the jokes, so it
// never gets rendered into the low-res canvas.
// ============================================================================

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');

const ui = {
  labels: [],
  hudTimer: 0,
  tickerTimer: 0,
  debug: false,

  init() {
    const layer = $('labels');
    for (const c of world.cities) {
      const el = document.createElement('div');
      el.className = 'label' + (c.capital ? ' capital' : '');
      layer.appendChild(el);
      this.labels.push({ el, city: c });
    }
    this.country = {};
    for (const k of ['all', 'west', 'east']) {
      const el = document.createElement('div');
      el.className = 'country country-' + k;
      el.textContent = k === 'all' ? 'Eternia' : SIDE[k].name;
      layer.appendChild(el);
      this.country[k] = el;
    }
    $('btn-pause').addEventListener('click', () => togglePause());
    $('btn-next').addEventListener('click', () => director.skip());
    $('btn-speed').addEventListener('click', () => cycleSpeed(1));
    $('btn-history').addEventListener('click', () => this.toggleChronicle());
    $('btn-close-history').addEventListener('click', () => this.toggleChronicle(false));
    $('btn-new-history').addEventListener('click', () => newHistory());
    $('btn-copy').addEventListener('click', () => this.copyLink());
    $('city-card').addEventListener('click', (e) => e.stopPropagation());
    $('btn-sound').addEventListener('click', () => toggleSound());
    $('btn-settings').addEventListener('click', () => settings.toggle());
    $('btn-close-settings').addEventListener('click', () => settings.toggle(false));
    $('btn-share').addEventListener('click', () => shareHistory());
  },

  // city names follow the camera, the split, and towns in the sky
  refreshLabels() {
    const r = R.rect;
    const inside = (p) => p.x > r.x - 10 && p.x < r.x + r.w + 10 && p.y > r.y && p.y < r.y + r.h - 6;
    for (const { el, city } of this.labels) {
      const p = toScreen(city.x + offX(city.x, city.y) + city.ox, city.y - city.lift + city.oy + 7);
      el.style.visibility = inside(p) ? 'visible' : 'hidden';
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, 0)`;
      if (el.dataset.name !== city.name) {
        el.dataset.name = city.name;
        el.textContent = city.name;
      }
      const isCap = city.capital || city.id === world.eastCapitalId;
      el.classList.toggle('capital', isCap);
    }
    const put = (el, x, y, o) => {
      const p = toScreen(x + offX(x, y), y);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = inside(p) ? o.toFixed(3) : '0';
      el.style.fontSize = `${Math.max(16, p.s * 11)}px`;
    };
    if (this.country.all.textContent !== world.brand) this.country.all.textContent = world.brand;
    this.islandLabels = this.islandLabels || [];
    while (this.islandLabels.length > world.islands.length) this.islandLabels.pop().remove();
    world.islands.forEach((is, i) => {
      let el = this.islandLabels[i];
      if (!el) { el = document.createElement('div'); el.className = 'label island'; $('labels').appendChild(el); this.islandLabels[i] = el; }
      if (el.textContent !== is.name) el.textContent = is.name;
      const p = toScreen(is.x + offX(is.x, is.y), is.y + is.r + 3);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, 0)`;
      el.style.opacity = (is.grow ?? 1) >= 1 ? '1' : '0';
    });
    const c = map.centers;
    put(this.country.all, c.all.x, c.all.y, (1 - world.tint) * 0.9);
    put(this.country.west, c.west.x, c.west.y, world.tint * 0.9);
    put(this.country.east, c.east.x, c.east.y, world.tint * 0.9);
  },

  updateHUD(dt) {
    this.hudTimer -= dt;
    if (this.hudTimer > 0) return;
    this.hudTimer = 0.2;
    $('hud-name').textContent = countryName();
    $('hud-year').textContent = `Year ${year()}`;
    $('hud-era').textContent = eraInfo().label;
    $('hud-status').textContent = world.split ? 'Divided' : 'United';
    $('hud-pop').textContent = fmt(population());
    $('hud-mood').textContent = moodWord();
    $('hud-mood-bar').style.width = `${world.mood.toFixed(0)}%`;
    $('hud-days').textContent = fmt(world.day - world.lastIncidentDay);
    if (this.debug) this.renderDebug();
  },

  showNotice(ev) {
    const n = $('notice');
    $('notice-date').textContent = `Year ${year()}`;
    $('notice-title').textContent = ev.head.title;
    $('notice-sub').textContent = ev.head.sub;
    $('notice-stamp').textContent = ev.def.stamp;
    $('notice-deltas').replaceChildren();
    n.classList.remove('compact', 'show');
    void n.offsetWidth;   // restart the entrance animation
    n.classList.add('show');
    n.hidden = false;
  },
  compactNotice() { $('notice').classList.add('compact'); },
  hideNotice() { $('notice').classList.remove('show', 'compact'); },
  showDeltas(d) {
    const box = $('notice-deltas');
    box.replaceChildren();
    const chip = (text, good) => {
      const el = document.createElement('span');
      el.className = 'delta ' + (good ? 'up' : 'down');
      el.textContent = text;
      box.appendChild(el);
    };
    if (d.mood) chip(`Mood ${d.mood > 0 ? '+' : '−'}${Math.abs(d.mood)}`, d.mood > 0);
    if (d.pop) chip(`Population −${fmt(Math.abs(d.pop))}`, false);
    if (!d.mood && !d.pop) chip('No lasting harm', true);
    $('notice').classList.remove('compact');
  },

  ticker(text) {
    const el = $('ticker-text');
    el.textContent = text;
    el.parentElement.classList.remove('fresh');
    void el.offsetWidth;
    el.parentElement.classList.add('fresh');
  },

  toggleChronicle(force) {
    const panel = $('chronicle');
    const open = force ?? panel.hidden;
    if (open && typeof settings !== 'undefined') settings.toggle(false);
    panel.hidden = !open;
    $('btn-history').setAttribute('aria-expanded', String(open));
    if (open) { this.renderChronicle(); $('btn-close-history').focus(); }
  },
  renderChronicle() {
    const list = $('chronicle-list');
    if ($('chronicle').hidden) return;
    list.replaceChildren();
    for (const e of world.chronicle) {
      const li = document.createElement('li');
      const y = document.createElement('span'); y.className = 'c-year'; y.textContent = `Year ${e.year}`;
      const t = document.createElement('span'); t.className = 'c-title'; t.textContent = e.title;
      li.append(y, t);
      list.appendChild(li);
    }
    $('seed-value').textContent = String(world.seed);
  },
  copyLink() {
    const url = `${location.origin}${location.pathname}?seed=${world.seed}`;
    const done = () => { $('btn-copy').textContent = 'Link copied'; setTimeout(() => { $('btn-copy').textContent = 'Copy link to this history'; }, 1800); };
    try { navigator.clipboard.writeText(url).then(done, () => { $('seed-hint').textContent = url; }); }
    catch (e) { $('seed-hint').textContent = url; }
  },

  showCity(c) {
    const card = $('city-card');
    const dmg = c.damage;
    const condition = c.lift > 0 ? 'Currently in the sky' : dmg > 0.6 ? 'Smouldering' : dmg > 0.25 ? 'Dented' : dmg > 0.02 ? 'Nearly rebuilt' : 'Pristine';
    const owner = world.split ? SIDE[c.side].name : 'Eternia';
    card.replaceChildren();
    const h = document.createElement('h2'); h.textContent = c.name;
    const meta = document.createElement('p'); meta.className = 'meta';
    const isCap = c.capital || c.id === world.eastCapitalId;
    meta.textContent = `${isCap ? 'Capital of ' : 'Town in '}${owner}`;
    const stats = document.createElement('dl');
    const row = (k, v) => { const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; d.append(dt, dd); stats.appendChild(d); };
    row('Population', fmt(c.pop));
    row('Condition', condition);
    card.append(h, meta, stats);
    const hist = document.createElement('ul');
    if (c.history.length) {
      for (const e of c.history.slice(0, 4)) { const li = document.createElement('li'); li.textContent = `Year ${e.year}: ${e.text}`; hist.appendChild(li); }
    } else {
      const li = document.createElement('li'); li.textContent = 'Nothing has happened here yet. Residents are suspicious.'; hist.appendChild(li);
    }
    card.appendChild(hist);
    card.hidden = false;
    this.cardCity = c;
    this.placeCard();
  },
  placeCard() {
    const c = this.cardCity;
    if (!c) return;
    const card = $('city-card');
    const p = toScreen(c.x + offX(c.x, c.y) + c.ox, c.y - c.lift + c.oy);
    const w = card.offsetWidth, h = card.offsetHeight;
    const x = clamp(p.x + 18, 8, window.innerWidth - w - 8);
    const y = clamp(p.y - h / 2, 8, window.innerHeight - h - 8);
    card.style.transform = `translate(${x}px, ${y}px)`;
  },
  hideCity() { $('city-card').hidden = true; this.cardCity = null; },

  renderDebug() {
    const d = director;
    const lines = [
      `phase      ${d.phase}  t=${d.t.toFixed(1)}${d.active ? `  event=${d.active.def.id} ${d.active.t.toFixed(1)}/${d.active.dur}` : ''}`,
      `bag        ${d.bag.join(', ') || '(refilling)'}`,
      `weights    ${d.eligible().map((e) => `${e.id}:${e.weight(world).toFixed(2)}`).join('  ')}`,
      `world      split=${world.split} offset=${world.eastOffset.toFixed(1)} mood=${world.mood.toFixed(0)} played=${world.eventsPlayed} craters=${world.craters} devastation=${world.devastation.toFixed(2)}`,
      `covers     ${covers.length}  weather rain=${weather.rain.toFixed(2)} snow=${weather.snow.toFixed(2)}`,
      `entities   particles=${fx.particles.length} rings=${fx.rings.length} projectiles=${fx.projectiles.length} rabbits=${world.rabbits.length}`,
      `seed       ${world.seed}   speed ${speeds[speedIdx]}x   era ${world.era} (E cycles)`,
    ];
    $('debug').textContent = lines.join('\n');
  },
};

// ---- controls ----------------------------------------------------------------------
let paused = false;
const speeds = [0.5, 1, 2, 4];
let speedIdx = 1;
function togglePause() {
  paused = !paused;
  $('btn-pause').textContent = paused ? 'Resume' : 'Pause';
  $('paused').hidden = !paused;
}
function cycleSpeed(dir) {
  speedIdx = (speedIdx + dir + speeds.length) % speeds.length;
  $('btn-speed').textContent = `${speeds[speedIdx]}×`;
  settings.set('speed', speeds[speedIdx]);
}
function newHistory(seed) {
  const s = seed ?? (Math.floor(Math.random() * 1e9) >>> 0);
  resetWorld(s);
  resetAmbient();
  fx.clear();
  clearBubbles();
  covers.length = 0;
  leftovers.clear();
  weather.reset();
  document.body.classList.remove('rebranding');
  director.reset();
  camera.reset(3);
  ui.hideNotice();
  ui.hideCity();
  foundingNotes();
  ui.renderChronicle();
  try { history.replaceState(null, '', `?seed=${s}`); } catch (e) { /* sandboxed viewers may refuse */ }
}
function foundingNotes() {
  world.chronicle.unshift({ year: year(), title: 'Eternia is founded. Nobody remembers why.', id: 'founding' });
  const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  ui.ticker(touch ? 'Welcome to Eternia. Tap a town to meet it, or open History for the story so far.' : 'Welcome to Eternia. Click a town to meet it, or press C for the history so far.');
}

function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.repeat) return;
    switch (e.code) {
      case 'Space': if (e.target.tagName === 'BUTTON') return; e.preventDefault(); togglePause(); break;
      case 'KeyN': director.skip(); break;
      case 'KeyH': document.body.classList.toggle('bare'); break;
      case 'KeyC': ui.toggleChronicle(); break;
      case 'KeyD': ui.debug = !ui.debug; $('debug').hidden = !ui.debug; break;
      case 'KeyR': newHistory(); break;
      case 'KeyF':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        break;
      case 'BracketLeft': cycleSpeed(-1); break;
      case 'BracketRight': cycleSpeed(1); break;
      case 'KeyE': if (ui.debug) setEra((world.era + 1) % ERAS.length); break;
      case 'KeyM': toggleSound(); break;
      case 'KeyS': settings.toggle(); break;
      case 'Escape': ui.hideCity(); ui.toggleChronicle(false); settings.toggle(false); break;
      default: return;
    }
  });
  $('screen').addEventListener('pointerdown', (e) => {
    const p = toWorld(e.clientX, e.clientY);
    let best = null;
    for (const c of world.cities) {
      const d = dist(c.x + offX(c.x, c.y) + c.ox, c.y - c.lift + c.oy, p.x, p.y);
      if (d < 11 && (!best || d < best.d)) best = { c, d };
    }
    if (best) {
      ui.showCity(best.c);
      fx.hearts(best.c.x, best.c.y - 3);
      say(best.c, pickWave(best.c), { life: 2 });
    } else ui.hideCity();
  });
}
function pickWave(c) {
  const lines = ['Hello!', 'Oh, a visitor!', 'Mind the potholes', 'We have a museum now', 'Nice day for it', 'Wave back!'];
  if (world.craters > 0) lines.push('Have you seen our crater?');
  if (world.rabbits.length) lines.push('Watch out for the rabbits');
  if (c.damage > 0.3) return 'Pardon the mess';
  if (c.renamed) return 'We have Wi-Fi now';
  return lines[(Math.random() * lines.length) | 0];
}
