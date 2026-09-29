// ============================================================================
// 10 MAIN — boot, then a fixed-step loop: simulate at exactly 60 Hz no matter
// the display's refresh rate, and draw once per frame (Nagomi's accumulator).
// ============================================================================

function boot() {
  settings.load();
  map = generateMap();
  initCells();
  initSprites();
  initSprites2();
  initSprites3();
  initSprites4();
  initRender();
  const params = new URLSearchParams(location.search);
  const seedParam = parseInt(params.get('seed'), 10);
  const seed = Number.isFinite(seedParam) ? seedParam >>> 0 : (Math.floor(Math.random() * 1e9) >>> 0);
  resetWorld(seed);
  resetAmbient();
  director.reset();
  if (params.get('event')) director.queue = params.get('event').split(',');
  ui.init();
  installSoundHooks();
  settings.apply();
  bindInput();
  foundingNotes();
  try { history.replaceState(null, '', `?seed=${seed}${params.get('event') ? `&event=${params.get('event')}` : ''}`); } catch (e) { /* ignore */ }
  window.eternia = { advance: (sec) => { for (let k = 0; k < sec * 60; k++) { simTime += STEP; step(STEP, simTime); camera.update(STEP); } }, world, director, map, fx, camera, EVENTS, force: (id) => { director.queue.unshift(id); director.skip(); } };

  let acc = 0, last = performance.now();
  function frame(now) {
    const real = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!paused) acc += real * speeds[speedIdx];
    let steps = 0;
    while (acc >= STEP && steps < 30) {
      simTime += STEP;
      step(STEP, simTime);
      acc -= STEP;
      steps++;
    }
    if (steps >= 30) acc = 0;
    camera.update(real);
    render(simTime);
    ui.refreshLabels();
    positionBubbles();
    ui.placeCard();
    ui.updateHUD(real);
    audio.update(real);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let simTime = 0;
function step(dt, t) {
  director.update(dt);
  updateWorld(dt);
  updateCows(dt);
  updateAmbient(dt, t);
  updateClouds(dt);
  weather.update(dt);
  leftovers.update(dt);
  updateCovers(dt);
  fx.updateParticles(dt);
  fx.updateRings(dt);
  fx.updateProjectiles(dt);
  fx.updateBolts(dt);
  updateBubbles(dt);
}

boot();
