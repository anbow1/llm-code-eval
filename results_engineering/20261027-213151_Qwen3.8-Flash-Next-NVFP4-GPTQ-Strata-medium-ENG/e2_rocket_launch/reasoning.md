This is a complex request for a complete Three.js scene simulating a Falcon 9-like rocket launch with physics simulation. Let me break down what I need to build:

1. **Physics Model**: Window.__rocket with reset(), step(dt), state(), trail, paused
   - Constants: g0=9.81, R=6371000, m0=550000, dry_mass=220000
   - Thrust T = 1.3 * m0 * g0, limited to 3*m*g0
   - Burn: 200s, mass falls linearly
   - Gravity: g(h) = g0 * (R/(R+h))^2
   - Pitch: 0 at liftoff, grows after 10s, ~0.5 rad at 150s, never decreases
   - Fixed substep ≤ 0.02s
   - Equations of motion for vertical and horizontal

2. **Scene Elements**:
   - Florida coast setting: flat land, green vegetation, Atlantic Ocean, roads, buildings, haze
   - Launch pad: concrete, flame trench, lattice tower, lightning masts
   - Rocket: white body, interstage, engine nozzles, nose fairing, canvas texture markings
   - PBR materials, ACES tone mapping, shadows, atmospheric scattering, aerial perspective, bloom
   - Procedural textures (canvas) for concrete, ground, vegetation

3. **Visual Effects**:
   - Liftoff: blinding white-yellow core, orange plume, Mach diamonds, flickering light, steam/smoke clouds
   - Ascent: plume grows as air thins, contrail drifts
   - Camera: low near pad at liftoff, long-lens tracking upward
   - Sky: blue to black at 100km, stars above 70km
   - Trail: white contrail

4. **Technical Requirements**:
   - Single TypeScript file
   - Compiles with tsc --strict
   - Import THREE from 'three', addons from 'three/addons/...'
   - Renderer created by file, canvas appended to body
   - Window resize handling
   - renderer.setAnimationLoop
   - Delta/elapsed time
   - Expose __scene, __camera, __renderer, __ready
   - No external assets

Let me write this step by step. This is going to be a very long file. Let me structure it carefully.

For the sky, I'll use the Sky addon from three/addons. For bloom, UnrealBloomPass from postprocessing. For controls, I won't use OrbitControls since the camera is scripted.

Let me think about the physics:
- m(t) = m0 - (m0 - dry_mass) * min(t/200, 1) for t in [0, 200]
- T(t) = 1.3 * m0 * g0 for t < 200, else 0
- T limited to min(T, 3 * m * g0)
- g(h) = g0 * (R / (R + h))^2
- Pitch(t) = 0 for t < 10, then grows to ~0.5 rad at 150s
  - Pitch = 0.5 * (t - 10) / 140 for t in [10, 150], clamped
  - Actually, let me make it smooth: pitch = max(0, 0.5 * smoothstep((t-10)/140))
  - Or: pitch = 0.5 * clamp((t-10)/140, 0, 1) but with a smooth curve
  - Let me use: pitch = 0.5 * Math.min(1, Math.pow(Math.max(0, (t-10))/140, 0.7))
  - At t=150: (140/140)^0.7 = 1, so pitch = 0.5. Good.
  - At t=10: 0. Good.
  - At t=80: (70/140)^0.7 = 0.5^0.7 ≈ 0.616, pitch ≈ 0.31. Reasonable.

- Equations of motion:
  - vy += (T * cos(pitch) - m * g(h)) / m * dt
  - vx += (T * sin(pitch)) / m * dt
  - x += vx * dt
  - y += vy * dt
  - y = max(0, y) (can't go below pad)

- vel = sqrt(vx^2 + vy^2)
- acc = net vertical acceleration = (T * cos(pitch) - m * g) / m

For the trail, one point per step() call.

Now for the visual scene:

Rocket (70m tall, 3.7m diameter):
- Main body: cylinder
- Interstage: slightly different color/band
- Engine section: with nozzles
- Nose fairing: cone/ogive

I'll use canvas textures for the markings.

For the pad:
- Concrete slab (box geometry with procedural texture)
- Flame trench (box geometry cut)
- Lattice tower (cylinders/boxes in lattice pattern)
- Lightning masts (tall thin cylinders)

Ground:
- Large plane with procedural green texture
- Ocean: large plane with blue color/gradient
- Roads: thin boxes
- Buildings: boxes

Sky: Use the Sky addon

Bloom: Use EffectComposer with UnrealBloomPass

Let me structure the code now. This will be quite long but I'll make it comprehensive.

Actually, let me reconsider the scale. The rocket is 70m tall, 3.7m diameter. The camera needs to be close to it initially. The ground extends to the horizon. The ocean is "on the horizon behind the pad."

For the Sky addon, the sun position and turbidity/rayleigh parameters control the appearance. I'll need to update it based on altitude.

For stars: I'll create a particle system that becomes visible above 70km.

For the contrail: I'll use a series of small billboard sprites or a tube geometry following the trail points.

For the exhaust plume: particle system with additive blending, growing as altitude increases.

For the steam/smoke clouds: many soft sprites with varying opacity, rolling sideways from the flame trench.

Let me write this now. I'll try to keep it organized but it will be a single large file.

For the camera:
- At liftoff: low position near pad, looking up
- During ascent: zoom in (long lens = high FOV reduction) tracking the rocket

Let me think about the camera more carefully:
- Initial: position (30, 5, 50), looking at rocket base
- During ascent: position follows but with long lens (FOV ~5-10 degrees), tracking rocket position
- Smooth transitions

For the bloom effect, I need EffectComposer, RenderPass, and UnrealBloomPass from three/addons.

Let me also think about the "aerial perspective" - distant things should be paler and bluer. I can use fog for this, or a custom shader. Using scene.fog with exponential falloff would help.

Actually, for aerial perspective at the scale we're working with (70m rocket, but the ground extends to maybe 100km), fog alone won't work perfectly. I'll use a combination.

Let me start writing the code:

```typescript
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```

This is going to be very long. Let me make sure I cover all requirements while keeping it compilable.

For the tsc --strict compilation, I need to be careful with types. Let me use explicit types where needed.

Let me think about the procedural textures:
- Concrete: grey with noise/grain
- Ground: green/brown patches
- Vegetation: green with variation
- Rocket markings: white body, flag (red/white/blue stripes), lettering

For the flag, I'll draw US flag stripes on a canvas. For lettering, I'll draw "FALCON 9" text (but wait, no fonts from network - I'll use canvas 2D context fillText with a default font, which should be fine since it's built into the browser).

Actually, the constraint says "no external assets (no textures, models, fonts or network requests)". Using canvas fillText with a system font should be fine since it's not an external asset.

Let me plan the rocket geometry:
- Engine section: cylinder r=1.85, h=5, dark grey/black with 9 nozzle cones
- Lower stage: cylinder r=1.85, h=42, white
- Interstage: cylinder r=1.9, h=5, darker band
- Upper stage/fairing transition: cylinder r=1.85, h=10
- Nose fairing: cone/ogive, r=2.6 base, h=13

Total: 5+42+5+10+13 = 75... let me adjust. Actually Falcon 9 is:
- Engines: ~3m
- First stage: ~42m  
- Interstage: ~3m
- Second stage: ~15m (with fairing)
- Fairing: ~13m
Total ~73m, close to 70m.

Let me do:
- Engine bell section: 4m (dark)
- First stage body: 40m (white)
- Interstage: 4m (dark band)
- Second stage body: 10m (white)  
- Nose fairing: 12m (white, ogive)
Total: 70m ✓

For the lattice tower, I'll create a simplified lattice structure with cylinders.

For the steam clouds, I'll use a particle system with soft circular textures (drawn on canvas), with additive or alpha blending.

Let me also think about the "Mach diamonds" - these are periodic bright spots in the exhaust plume. I can simulate them with small bright spheres spaced along the plume axis.

For the "flickering light from the plume" - I'll add a PointLight at the engine position that flickers in intensity.

OK, let me write this now. It's going to be ~800-1200 lines probably.

One concern: the Sky addon creates a very large sky sphere. When the rocket goes to 100km+ altitude, I need the sky to still look right. I'll attach the sky to the camera or make it follow the camera.

Actually, for the sky to work correctly at different altitudes, I should move the sky dome with the camera. The Sky addon creates a mesh that's typically large enough to surround everything.

For the stars: I'll create a points system in a large sphere that fades in above 70km.

Let me also handle the "Karman line at 100km" - at that altitude, the sky should be black and stars clearly visible.

The atmosphere should thin: I'll adjust fog density based on altitude.

Let me structure the code:

1. Setup (renderer, scene, camera, lights, post-processing)
2. Sky
3. Ground/terrain (ocean, land, roads, buildings, vegetation)
4. Launch pad (concrete, flame trench, tower, masts)
5. Rocket (with canvas textures)
6. Exhaust/plume system
7. Steam/smoke system
8. Contrail system
9. Stars
10. Physics model (window.__rocket)
11. Camera animation
12. Render loop
13. Resize handler

Let me write it now, being careful with types for strict mode.
