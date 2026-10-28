# e1_watch_unitas: prompt for comparisons

Suite `engineering` ([README](../README.md)). Send the **system** and the **user** prompt below unchanged, as two
messages (or, where the tool has no system prompt, the system text first and then the user text in one message).
The local models get exactly this, with 120 min and 196,608 tokens per task.

How the answer is run: one TypeScript file, bundled with esbuild against Three.js 0.186.1
(`three` and `three/addons/...`), compiled with `tsc --strict`, opened in Chromium at 1280 x 720
with a software WebGL renderer (SwiftShader).

**Chat or API:** save the whole reply as `e1_watch_unitas.md` (the ```ts block is taken from it).
**Agent harness** (Claude Code, Codex, Cursor and the like): add one line to the user prompt,
"Write the file to main.ts instead of replying with a code block.", then save it as `e1_watch_unitas.ts`.
Do not let the agent install other packages or add an HTML file: only the TypeScript file is used.

Grade it like a local run (it goes to the same tables and gallery):

```
python run_eval.py --suite engineering --tasks e1_watch_unitas --from-file answers/ --label <Model-Name>-<harness>
```

Optional `answers/e1_watch_unitas.json` with `{"minutes": 12.5, "tokens": 48000, "reasoning_tokens": 30000}` adds time and
tokens to the tables.

## System prompt

```text
You are an expert TypeScript and Three.js developer.
Write ONE complete TypeScript file for the browser.

Hard rules:
- Import Three.js as: import * as THREE from 'three';  Addons from 'three/addons/...'.
- The file must compile with `tsc --strict` with zero errors.
- Create the WebGLRenderer yourself and append its canvas to document.body. The page has no other HTML.
- Size the renderer from window.innerWidth / window.innerHeight and handle window resize (camera aspect + renderer size).
- Use renderer.setAnimationLoop for the render loop. Motion must use delta/elapsed time, not frame counts.
- Expose for testing:
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
- After the first frame is rendered, set (window as any).__ready = true.
- No external assets (no textures, models, fonts or network requests).

Reply with a single ```ts code block and nothing else.
```

## User prompt

```text
Build a working model of a hand-wound mechanical wristwatch movement: the ETA/Unitas 6497-1
(17 jewels, 18 000 vibrations per hour = 2.5 Hz = 5 beats per second, hand-wound, Swiss lever escapement with a
15-tooth escape wheel). The point is the mechanics: it must work like the real movement, with simplified shapes.
Units: 1 unit = 1 mm. The movement lies in the x-z plane (the plate is horizontal), all wheel axes are vertical (y).

How it works (this is what must be visible and what is measured)
- The mainspring in the barrel drives the going train: barrel -> center wheel (1 turn per hour, carries the minute
  hand) -> third wheel -> fourth wheel (1 turn per minute, carries the small seconds hand) -> escape wheel.
  Each wheel drives the PINION of the next one; meshing wheels turn in opposite directions.
- The escapement lets the train move only in steps: the balance swings, the pallet fork flips from one side to
  the other each time the balance passes its centre (a beat), and at each beat the escape wheel is released and
  moves half a tooth (12 degrees). So the escape wheel turns once per 6 s, 10 times a minute, and the whole train
  (and the hands) moves in small jumps, 5 per second.
- The hairspring breathes (coils in and out) with the balance. The cannon pinion, minute wheel and hour wheel (the
  motion works, 12:1) drive the hour hand.

Wheels: real toothed gears (an extruded THREE.Shape with teeth, not plain cylinders), and pinions as separate small
toothed parts on the same axis. Each train wheel stores its data in userData:
  { teeth, pinion, radius, pinionRadius }   (teeth of the wheel, leaves of its own pinion, pitch radii in mm)
- Ratios: (center.teeth / third.pinion) * (third.teeth / fourth.pinion) = 60, fourth.teeth / escape.pinion = 10,
  escape wheel 15 teeth, barrel.teeth / center.pinion between 4 and 10 (the barrel turns once in 4-10 hours).
  For example: barrel 72, center 80 / pinion 12, third 75 / pinion 10, fourth 80 / pinion 10, escape 15 / pinion 8.
- Placement: with explode(0), the distance between the axes of a wheel and the next wheel (in x-z) equals
  wheel.radius + next.pinionRadius, so the teeth really mesh. Use one tooth size (module) per mesh, e.g. 0.1 mm:
  radius = module * teeth / 2.

Parts (window.__watch.parts: an array of THREE.Object3D, each with a unique non-empty name)
- At least 40 separate meshes, with unique names, including: mainspring_barrel, mainspring, arbor, center_wheel,
  third_wheel, fourth_wheel, escape_wheel, their pinions, pallet_fork, balance_wheel, hairspring, balance_cock, stud,
  crown, stem, setting_lever, click, ratchet_wheel, cannon_pinion, hour_wheel, minute_wheel, the 17 jewels named
  jewel_1 ... jewel_17 (at the pivots), the main plate and the bridges, and the screws.
- Metal parts in brass or steel (metalness with an environment map, so they are not black), the jewels in red.

Realism: as realistic as possible, like a macro photograph of a real 6497 movement (shapes may be simplified,
the look must not be)
- Materials: physically based (MeshPhysicalMaterial where it helps), an environment map for reflections (e.g.
  RoomEnvironment with PMREMGenerator), ACES tone mapping, soft shadows.
- Finishes drawn procedurally (canvas or shader, no downloaded textures): Geneva stripes (cotes de Geneve) on the
  bridges, perlage (overlapping circular grain) on the main plate, polished bevels (chamfered edges) on the bridges,
  gilded or rhodium-plated plates, heat-blued screws with slotted heads, steel wheels and pinions with a polished
  look, golden chatons around the ruby jewels, translucent red jewels (transmission or clearcoat), a blued hairspring
  as a thin flat spiral, an engraved text on the bridge ("UNITAS 6497 17 JEWELS SWISS MADE").
- Wheels with spokes (crossings), not solid discs; the balance wheel with screws or a smooth rim; the hairspring
  attached to the stud on the balance cock.
- Lighting like a studio macro shot: a key light, a soft fill, a rim light, a dark background, a shallow depth of
  field is welcome (e.g. BokehPass).

Timing (window.__watch, the simulated clock)
- reset(): sets the time t to 0 and every angle to 0.
- step(dt): advances the simulated time t by dt seconds (for any dt, including large ones).
- state(): returns, in radians, computed from t with exact formulas, where k = floor(5*t) is the number of beats
  and tau = k / 5 is the time the train has been released for:
    balance(t) = 1.2*PI * sin(2*PI*2.5*t)            (balance angle; amplitude 216 degrees; passes 0 at each beat)
    pallet(t)  = 0.2 * (k even ? 1 : -1)             (pallet fork: flips at each beat)
    escape(t)  = -k * 2*PI/30                        (half a tooth per beat)
    fourth(t)  =  2*PI * tau / 60                    (one turn per minute)
    third(t)   = -fourth(t) * fourth.pinion / third.teeth
    center(t)  =  2*PI * tau / 3600                  (one turn per hour)
    barrel(t)  = -center(t) * center.pinion / barrel.teeth
    second(t)  = fourth(t), minute(t) = center(t), hour(t) = minute(t) / 12
  Return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour }, angles not wrapped.
- paused (boolean): when true, the render loop must not call step(); it keeps rendering.
- explode(f): f in [0, 1]. 0 = assembled (every part at its place in the movement), 1 = exploded (every part moved
  away from the centre, along its own direction, clearly separated). It applies the view at once (only the E key and
  the button animate).
- The movement starts ASSEMBLED and running, so the mechanism can be watched working; the key E (and a button)
  animates between the assembled and the exploded view.
- The render loop calls step(min(delta, 1/30)) when not paused. Rotate every wheel, pinion, the fork, the balance
  and the hands with the angles from state(), so the picture matches the simulation.

Scene
- The camera frames the movement from above and in front, close enough to see the teeth mesh and the escapement
  work; orbit controls. A text label near each main part
  (canvas texture or DOM is fine).
- No external assets (no textures, models or fonts from the network).

Reply with a single ```ts code block and nothing else.
```
