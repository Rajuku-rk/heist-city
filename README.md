# HEIST CITY — modular open-city chase prototype

Thief vs. police. Run a night city, steal a car, fight cops who gang up and call backup,
hide to heal, then beat the **Captain** (boss) to grab the diamond and escape.

## Run it (IMPORTANT)
This version uses ES modules, so browsers block it from `file://`. Serve it locally:

```bash
cd heist-city
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

(Any static server works. The single-file Phase 4 build still opens by double-click if you
just want a quick look; this modular build is the maintainable one going forward.)

## File map
```
index.html        markup + HUD; loads Three.js (CDN) then js/main.js
css/styles.css     all styling
js/
  config.js        CFG constants + math helpers   <- tune balance here
  state.js         shared mutable game state (S)
  engine.js        renderer / scene / camera / lights / sky
  audio.js         procedural run + fight soundtracks and SFX
  nav.js           A* pathfinding + GPS reroute
  factory.js       mesh builders (characters, car, trees)
  world.js         buildCity() + spawnAll() + collision
  input.js         keyboard/touch, control basis, button labels
  fight.js         multi-cop gang fight + Captain boss
  police.js        patrol / checkpoint / guard / boss AI + backup alert
  actors.js        player on-foot & driving, pickups/hideouts, win check
  camera.js        follow camera + screen shake
  bot.js           self-playing pro-demo AI
  ui.js            HUD, banner, minimap
  game.js          start/end + main loop
  main.js          entry point
```

## What changed this build
- Reliable **multi-cop fights** (cops crowd in, up to 3 attack at once, backup joins).
- Police **pursue and defend the escape**; the safe house is guarded.
- **Boss fight**: the Captain (big HP, harder hits, block only softens) must be beaten
  before the diamond can be taken.

## Notes / next steps
This is a prototype. For real animations, vehicle physics, navmesh AI, and Play Store / iOS
export, port the proven design into Godot 4 or Unity rather than extending this further.
