// ============================================================================
// 09b SETTINGS — one schema drives the panel, the saved preferences and how
// they're applied (Nagomi does the same with its settings object).
// Also: sound hooks into the rest of the game, and sharing.
// ============================================================================

const EVENT_CATEGORIES = {
  politics: { label: 'Politics', ids: ['schism', 'reunification', 'coronation', 'revolution', 'election', 'bureaucracy', 'relocation', 'rebrand', 'secede', 'treaty', 'census', 'peas', 'taxman', 'goldenage', 'chefcoup'] },
  war: { label: 'War', ids: ['skirmish', 'grievances', 'naval', 'siege', 'coldwar', 'invasion', 'pillowwar', 'dronewar', 'mae', 'bigoops'] },
  tech: { label: 'Technology', ids: ['wheel', 'press', 'industrial', 'railroad', 'electricity', 'internet', 'space', 'robots', 'fusion', 'blackout', 'rebuild', 'ai', 'flyingcars', 'cloning', 'teleporter', 'weathercontrol'] },
  nature: { label: 'Nature and weather', ids: ['drought', 'flood', 'iceage', 'wildfire', 'monsoon', 'tornado', 'spring', 'famine', 'heatwave', 'hurricane', 'fog', 'rainbow', 'pollen', 'hail'] },
  space: { label: 'Earth and sky', ids: ['meteor', 'earthquake', 'volcano', 'eclipse', 'aurora', 'tsunami', 'sinkhole', 'drift', 'newisland', 'moon', 'comet'] },
  creatures: { label: 'Creatures', ids: ['rabbits', 'pigeons', 'kaiju', 'serpent', 'sandworm', 'cats', 'goats', 'bees', 'dragon', 'squirrels', 'mosquitoes', 'moose'] },
  scifi: { label: 'Sci-fi and spooky', ids: ['aliens', 'directions', 'zombies', 'timetravel', 'portal', 'ghosttown', 'wizard', 'glitch', 'gravity', 'mirror'] },
  culture: { label: 'Economy and culture', ids: ['goldrush', 'crash', 'tulips', 'championship', 'olympics', 'tourism', 'bakeoff', 'fashion'] },
  wholesome: { label: 'Wholesome', ids: ['nothing', 'nap', 'dance', 'lights'] },
};
const CATEGORY_OF = {};
for (const [k, c] of Object.entries(EVENT_CATEGORIES)) for (const id of c.ids) CATEGORY_OF[id] = k;
// these stay on whatever you filter, so the story can always recover
const ALWAYS_ALLOWED = new Set(['reunification', 'rebuild']);

const SETTINGS_SCHEMA = [
  { group: 'Sound', items: [
    { key: 'sound', label: 'Sound', type: 'toggle', def: false },
    { key: 'volume', label: 'Volume', type: 'range', min: 0, max: 1, step: 0.05, def: 0.7 },
    { key: 'music', label: 'Music box', type: 'toggle', def: true },
    { key: 'ambience', label: 'Waves and rain', type: 'toggle', def: true },
  ] },
  { group: 'Pace', items: [
    { key: 'speed', label: 'Speed', type: 'choice', options: [[0.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×']], def: 1 },
    { key: 'pause', label: 'Quiet time between events', type: 'choice', options: [[0.5, 'Short'], [1, 'Normal'], [2, 'Long']], def: 1 },
  ] },
  { group: 'Display', items: [
    { key: 'labels', label: 'Town names', type: 'toggle', def: true },
    { key: 'ticker', label: 'News ticker', type: 'toggle', def: true },
    { key: 'hud', label: 'Stats panel', type: 'toggle', def: true },
    { key: 'shake', label: 'Screen shake', type: 'toggle', def: !reducedMotion },
    { key: 'flashes', label: 'Bright flashes', type: 'toggle', def: !reducedMotion },
    { key: 'crt', label: 'Old TV lines', type: 'toggle', def: false },
  ] },
  { group: 'Events', note: 'Turn off the kinds of things you would rather not see.', items:
    Object.entries(EVENT_CATEGORIES).map(([k, c]) => ({ key: 'cat_' + k, label: `${c.label} (${c.ids.length})`, type: 'toggle', def: true })),
  },
];

const settings = {
  values: {},
  storageKey: 'eternia.settings.v1',
  load() {
    for (const g of SETTINGS_SCHEMA) for (const it of g.items) this.values[it.key] = it.def;
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      for (const k in saved) if (k in this.values) this.values[k] = saved[k];
    } catch (e) { /* storage can be unavailable; defaults are fine */ }
  },
  save() { try { localStorage.setItem(this.storageKey, JSON.stringify(this.values)); } catch (e) { /* ignore */ } },
  set(key, value) { this.values[key] = value; this.save(); this.apply(key); this.syncControl(key); },
  allows(id) {
    if (ALWAYS_ALLOWED.has(id)) return true;
    const cat = CATEGORY_OF[id];
    return !cat || this.values['cat_' + cat] !== false;
  },
  // push a value out to the game
  apply(key) {
    const v = this.values;
    const all = key == null;
    if (all || key === 'sound') { if (!v.sound) audio.setOn(false); else if (audio.unlocked) audio.setOn(true); ui.syncSoundButton(); }
    if (all || key === 'volume') audio.setVolume(v.volume);
    if (all || key === 'music') audio.musicOn = v.music;
    if (all || key === 'ambience') audio.ambienceOn = v.ambience;
    if (all || key === 'speed') { speedIdx = Math.max(0, speeds.indexOf(v.speed)); $('btn-speed').textContent = `${speeds[speedIdx]}×`; }
    if (all || key === 'labels') document.body.classList.toggle('no-labels', !v.labels);
    if (all || key === 'ticker') document.body.classList.toggle('no-ticker', !v.ticker);
    if (all || key === 'hud') document.body.classList.toggle('no-hud', !v.hud);
    if (all || key === 'crt') document.body.classList.toggle('crt', !!v.crt);
  },

  // ---- the panel, built from the schema ----------------------------------------------------
  build() {
    const body = $('settings-body');
    body.replaceChildren();
    for (const g of SETTINGS_SCHEMA) {
      const sec = document.createElement('section');
      const h = document.createElement('h3'); h.textContent = g.group; sec.appendChild(h);
      if (g.note) { const p = document.createElement('p'); p.className = 'note'; p.textContent = g.note; sec.appendChild(p); }
      for (const it of g.items) sec.appendChild(this.control(it));
      body.appendChild(sec);
    }
    // play a particular history
    const sec = document.createElement('section');
    const h = document.createElement('h3'); h.textContent = 'History'; sec.appendChild(h);
    const row = document.createElement('div'); row.className = 'seed-row';
    const label = document.createElement('label'); label.htmlFor = 'seed-input'; label.textContent = 'Seed';
    const input = document.createElement('input'); input.id = 'seed-input'; input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off';
    input.value = String(world.seed);
    const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Play this history';
    go.addEventListener('click', () => {
      const n = parseInt(input.value.replace(/\D/g, ''), 10);
      if (Number.isFinite(n)) { newHistory(n >>> 0); toast(`Playing history ${n >>> 0}`); }
    });
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'quiet'; reset.textContent = 'Reset all settings';
    reset.addEventListener('click', () => {
      try { localStorage.removeItem(this.storageKey); } catch (e) { /* ignore */ }
      this.load(); this.apply(); this.build(); toast('Settings reset');
    });
    row.append(label, input, go);
    sec.append(row, reset);
    body.appendChild(sec);
  },
  control(it) {
    const row = document.createElement('div');
    row.className = 'setting ' + it.type;
    const id = 'set-' + it.key;
    const label = document.createElement('label'); label.htmlFor = id; label.textContent = it.label;
    let input;
    if (it.type === 'toggle') {
      input = document.createElement('input'); input.type = 'checkbox'; input.role = 'switch';
      input.checked = !!this.values[it.key];
      input.addEventListener('change', () => this.set(it.key, input.checked));
      row.append(label, input);
    } else if (it.type === 'range') {
      input = document.createElement('input'); input.type = 'range';
      input.min = it.min; input.max = it.max; input.step = it.step; input.value = this.values[it.key];
      input.addEventListener('input', () => this.set(it.key, parseFloat(input.value)));
      row.append(label, input);
    } else if (it.type === 'choice') {
      const group = document.createElement('div'); group.className = 'choices'; group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-label', it.label);
      for (const [val, text] of it.options) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.value = val;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(this.values[it.key] === val));
        b.addEventListener('click', () => this.set(it.key, val));
        group.appendChild(b);
      }
      label.removeAttribute('for'); label.id = id;
      group.setAttribute('aria-labelledby', id);
      row.append(label, group);
      input = group;
    }
    input.id = input.id || id;
    return row;
  },
  syncControl(key) {
    const el = document.getElementById('set-' + key);
    if (!el) return;
    const v = this.values[key];
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'range') el.value = v;
    else for (const b of el.querySelectorAll('button')) b.setAttribute('aria-checked', String(String(v) === b.dataset.value));
  },
  toggle(force) {
    const panel = $('settings');
    const open = force ?? panel.hidden;
    if (open) { ui.toggleChronicle(false); this.build(); }
    panel.hidden = !open;
    $('btn-settings').setAttribute('aria-expanded', String(open));
    if (open) $('btn-close-settings').focus();
  },
};

// ---- toasts ------------------------------------------------------------------------------
let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---- sharing -------------------------------------------------------------------------------
async function shareHistory() {
  const url = `${location.origin}${location.pathname}?seed=${world.seed}`;
  const latest = world.chronicle[0];
  const text = latest && latest.id !== 'founding'
    ? `Year ${latest.year} in Eternia: ${latest.title}. Watch the same history with seed ${world.seed}.`
    : `Watch Eternia, history number ${world.seed}.`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Eternia', text, url }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Link copied'); }
  catch (e) { toast(`History seed: ${world.seed}`); }
}

// ---- sound hooks: the rest of the game doesn't need to know audio exists ---------------------
function installSoundHooks() {
  const kick = camera.kick.bind(camera);
  camera.kick = (a) => {
    kick(a * (settings.values.shake ? 1 : 0));
    if (a >= 3.5) audio.boom(a); else if (a >= 1.8) audio.thud();
  };
  const bolt = fx.bolt.bind(fx); fx.bolt = (x, y) => { bolt(x, y); audio.zap(); };
  const firework = fx.firework.bind(fx); fx.firework = (...a) => { firework(...a); audio.firework(); };
  const splash = fx.splash.bind(fx); fx.splash = (...a) => { splash(...a); audio.splash(); };
  const sayOriginal = say;
  say = (anchor, text, o) => { const b = sayOriginal(anchor, text, o); audio.blip(text); return b; };
  const showNotice = ui.showNotice.bind(ui);
  ui.showNotice = (ev) => { showNotice(ev); audio.paper(); setTimeout(() => audio.stamp(), 560); };
  const showDeltas = ui.showDeltas.bind(ui);
  ui.showDeltas = (d) => { showDeltas(d); audio.chime((d.mood || 0) >= 0); };
  const tick = ui.ticker.bind(ui);
  ui.ticker = (text) => { tick(text); audio.tick(); };
  const wave = eraWave;
  eraWave = (ev, era, t0, span, origin, onTown) => wave(ev, era, t0, span, origin, (c, i) => { audio.sparkle(); if (onTown) onTown(c, i); });
  // browsers only allow sound after a gesture: the first click or key press unlocks it
  const unlock = () => {
    audio.unlocked = true;
    if (settings.values.sound) audio.setOn(true);
    ui.syncSoundButton();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

ui.syncSoundButton = function () {
  const on = audio.on;
  const b = $('btn-sound');
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Mute sound' : 'Turn sound on');
  b.classList.toggle('on', on);
};
function toggleSound() {
  audio.unlocked = true;
  settings.set('sound', !audio.on);
  if (settings.values.sound) { audio.setOn(true); toast('Sound on'); } else toast('Sound off');
  ui.syncSoundButton();
}
