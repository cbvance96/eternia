# Contributing to Eternia

Thanks for wanting to make Eternia sillier. New events are the best contribution, but fixes, sounds, art and better jokes are all welcome.

## Getting set up

1. Fork the repository on GitHub, then clone your fork.
2. Build and open the game:
   ```bash
   python build.py      # bundles src/*.js into index.html
   ```
   Open `index.html` in a browser. There are no other dependencies.
3. After any change in `src/` or `template.html`, run `python build.py` again and refresh.

Handy while working:

- `?event=yourevent` in the URL makes your event happen first. Chain several: `?event=meteor,yourevent`.
- `?seed=123` replays the same history, so you can reproduce things.
- Press **D** for the debug view and **N** to skip ahead.

## Adding an event

Events live in `src/07*-events-*.js`, grouped by theme. Pick the file that fits, or add a new one named `07x-events-something.js` (files load in alphabetical order, so keep the `07` prefix).

Start from this template:

```js
defineEvent({
  id: 'myevent',                         // unique, lowercase
  title: 'My Event',
  stamp: 'Weather',                      // the rubber stamp on the newspaper
  weight: (w) => 1,                      // how likely, given the world
  requires: (w) => true,                 // can it happen right now? (era, split, etc.)
  duration: 15,                          // seconds
  setup(ev) {                            // choose targets; no visuals yet
    ev.city = ev.rng.pick(world.cities);
  },
  headline: (ev) => ({
    title: `Something funny happens in ${ev.city.name}`,
    sub: ev.rng.pick(['A dry follow-up line.', 'Or this one.']),
  }),
  focus: (ev) => ({ x: ev.city.x, y: ev.city.y, zoom: 2 }),
  update(ev, dt) {                       // animate, keyed on ev.t (seconds since start)
    ev.at(0.2, 't0', () => ticker('A line for the news ticker.'));
    ev.at(3, 'b1', () => say(ev.city, 'A speech bubble!', {}));
  },
  draw(ev, g, layer, t) {},              // optional: 'ground', 'air' or 'sky'
  finish(ev) {                           // leave the world in its final state
    ev.delta('mood', +3);
    logCity(ev.city, 'Something funny happened here');
  },
});
```

Then add its `id` to one of the categories in `EVENT_CATEGORIES` (`src/09b-settings.js`) so players can filter it.

### The toolkit

You rarely need to draw from scratch. Look at similar events and reuse:

| Want | Use |
| --- | --- |
| Speech bubbles, ticker lines | `say(anchor, text, opts)`, `ticker(text)` |
| Explosions, smoke, fire, confetti | `fx.burst`, `fx.smoke`, `fx.fire`, `fx.firework`, `fx.ring` |
| Something flying from A to B | `fx.launch({ x0, y0, x1, y1, arc, dur, onHit })` |
| People or animals walking | `new Crowd()`, `crowd.add({...})`, `crowd.dismiss()` |
| Something spreading over land | `new Cover({ color })`, `cover.grow()`, `cover.fade()` |
| Rain, snow, ash | `weather.rainT`, `weather.snowT`, `weather.ashT` |
| Night, dust, cold, heat | `world.grades.night.t = 0.8` (and back to 0) |
| Trains, serpents, dragons | `new Spine(n, gap, x, y)` |
| Permanent marks on the map | `stampPixel`, `stampCrater` |
| Camera | `camera.focus(x, y, zoom)`, `camera.kick(amount)` |
| Safe places to put things | `landSpotNear(town, min, max, ev.rng)`, `seaApproach(town)`, `roadPath(a, b)` |

### House rules

- **Keep it gentle and funny.** Eternia is a toy. Disasters are slapstick, nobody gets hurt in a way that's upsetting, and the jokes punch at the situation, not at groups of people.
- **Land things stay on land, sea things stay at sea.** Crowds steer around water automatically; for anything you place yourself, use `landSpotNear` or check `map.isWalkable(x, y)`.
- **Exits should be soft.** When things leave, use `crowd.dismiss()` rather than removing them. Anything still on screen when your event ends dissolves on its own.
- **`finish` must be safe to call early**, because players can skip. Put the world into its final state there, and undo anything temporary (lifted towns, frozen rivers, grades, weather).
- **Use `ev.rng` for choices** that change the story, so seeds replay the same history.
- **Split country:** if your event involves East and West, check `world.split` and keep crowds on their own side.

## Before you open a pull request

- [ ] `python build.py` runs, and `node --check dist.js` passes.
- [ ] Your event plays start to finish with `?event=yourid`, and skipping it with **N** leaves nothing behind.
- [ ] It looks right on a phone-sized window too.
- [ ] You committed the rebuilt `index.html` along with your `src/` changes.

Optional but lovely: run the soak test in `test/` (see the README) to make sure nothing breaks over a long history.

## Other ways to help

- **Ideas:** open an issue with the "New event idea" template. Even a one-line pitch is useful.
- **Bugs:** open an issue with the seed (from the History panel) and what you saw.
