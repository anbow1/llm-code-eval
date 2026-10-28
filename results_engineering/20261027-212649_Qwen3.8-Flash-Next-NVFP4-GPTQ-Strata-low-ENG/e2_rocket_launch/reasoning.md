This is a complex request for a full rocket launch simulation with Three.js. Let me break down what I need to build:

1. **Physics simulation** - Rocket equation with gravity turn, fixed substeps
2. **Rocket model** - Falcon 9-like geometry with procedural textures
3. **Launch pad** - Concrete pad, flame trench, tower, masts
4. **Environment** - Florida coast, ocean, buildings, roads, vegetation
5. **Sky** - Atmospheric scattering, stars appearing at altitude
6. **Effects** - Engine flame, steam/smoke clouds, contrail
7. **Camera** - Cinematic tracking
8. **Post-processing** - Bloom, ACES tone mapping

Let me plan the structure:

- Single file, TypeScript, imports from 'three' and 'three/addons/...'
- Physics: `window.__rocket` with reset, step, state, trail, paused
- Scene setup: renderer, camera, lights, sky
- Geometry: rocket, pad, environment
- Effects: particles for steam, contrail, flame
- Animation loop with delta time

For the sky, I'll use the Sky addon from three/addons/objects/Sky.js. For bloom, I'll use UnrealBloomPass. For the ground, I'll use procedural canvas textures.

Let me think about the physics:
- m0 = 550,000 kg, dry mass = 220,000 kg
- Thrust T = 1.3 * m0 * g0 = 1.3 * 550000 * 9.81 ≈ 7,016,150 N
- Burn time: 200s, mass falls linearly from m0 to dry mass
- Mass flow rate: (m0 - dry) / 200 = 330000 / 200 = 1650 kg/s
- g(h) = g0 * (R / (R + h))^2
- Pitch: 0 for first 10s, then grows to ~0.5 rad at 150s (so from t=10 to t=150, pitch goes from 0 to 0.5)
- Pitch rate: 0.5 / 140 rad/s after 10s, capped at 0.5 rad

Equations of motion:
- Vertical acceleration: (T * cos(pitch)) / m - g(h)
- Horizontal acceleration: (T * sin(pitch)) / m

Integration with substeps of at most 0.02s.

For the camera:
- Initially low near pad looking up
- Then tracks rocket with a long lens (small FOV or zoom)

For steam/smoke:
- Use sprite particles with procedural soft textures
- Spawn from flame trench, roll sideways then rise

For the contrail:
- Draw a line or use a tube geometry from trail points

Let me write this out. It's going to be a large file but I need to keep it self-contained.

Key considerations:
- ACES tone mapping: renderer.toneMapping = THREE.ACESFilmicToneMapping
- Shadows: directional light with shadow map
- Bloom: EffectComposer + UnrealBloomPass
- Sky: Use the Sky addon with changing turbidity/rayleigh based on altitude
- Stars: Add star points when altitude > 70km

Let me structure the code:

```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Now let me write the full implementation. I need to be careful about TypeScript strict mode - no implicit any, proper types, etc.

For the rocket geometry:
- Body: cylinder r=1.85, h=~50 (first stage) + interstage + second stage + fairing
- Engine nozzles: small cones at bottom
- Flag and lettering on canvas texture applied to the body

For the pad:
- Large concrete slab
- Flame trench (a pit)
- Tower: lattice structure made of boxes/lines
- Lightning masts: tall thin lattice structures

For the environment:
- Large flat ground plane with green/brown texture
- Ocean: large blue plane or shader at some distance
- Roads: darker strips
- Buildings: simple boxes
- Fog/haze: use scene fog

For steam particles:
- Use Points or sprites with a soft radial gradient texture
- Spawn from trench, move outward then upward
- Use a particle system with custom attributes

For the flame:
- A bright emissive mesh/sprite at the engine section
- Flickering point light

For contrail:
- Line geometry updated each frame with trail points
- Or a tube/ribbon

Let me think about scale. The rocket is 70m tall, 3.7m diameter. The pad might be 100m wide. The tower is maybe 100m. The scene extends far for the ocean.

Camera positions:
- Liftoff: about 50-100m from pad, low (eye level ~2m), looking up
- Ascent: gradually zoom in (decrease FOV) to keep rocket in frame

Actually for the camera, I'll start with FOV ~45 and a position near the pad, then as the rocket climbs, I'll move the camera and/or zoom in.

Let me think about the trail rendering. The trail is an array of {x, y, z} points. I'll create a BufferGeometry line that I update each frame. For a visible contrail, I could use a thick line or a series of small quads.

Actually, for a contrail that looks good, I'll use a Line2 or just a regular Line with a material. Since Line width isn't well supported in WebGL, I might use a TubeGeometry or just accept thin lines. Or I could use a series of small sprite particles along the trail.

Let me use a combination: a line for the trail path, and maybe some sprites for thickness.

For the stars, I'll create a Points object with random positions on a large sphere, and fade them in based on altitude.

Let me now write the complete file. This will be long but comprehensive.

One issue: the Sky addon in Three.js works best when the camera is near the origin and the sky is at a fixed large radius. As the rocket goes up, I need to move the sky center to the camera position. I'll update the sky's position to match the camera.

For the bloom, I need to be careful about what blooms. I could use selective bloom with layers, but that's complex. A simpler approach: set the bloom threshold high enough that only the flame and bright lights bloom.

Let me finalize my approach and write the code. I'll aim for something that's impressive but also compiles cleanly.

Actually, thinking more carefully about the scale issue: when the rocket is on the ground, we're at ~70m scale. When it's at 100km altitude, we need to see it at ~100,000m scale. This means the camera needs to adjust its far plane dynamically, and the sky/environment needs to handle this range.

Approach:
- Keep the camera near the ground and zoom in as the rocket rises
- The far plane needs to be very large (say 200,000m) to see the sky
- The sky dome should be large enough

Actually, a simpler approach: move the camera to follow the rocket, always looking slightly behind/below. This way we're always close to the rocket. The sky moves with the camera.

Let me plan the camera:
- Camera follows rocket with some offset
- At low altitude: camera is near the ground, looking up
- As rocket ascends: camera rises with it, maintaining a view

For the long-lens tracking shot: I'll decrease FOV as the rocket gets higher, keeping it the same screen size.

Let me write this now. I'll be thorough but pragmatic.

For the procedural textures, I'll create canvas elements and draw patterns on them.

Let me write the full implementation now:
