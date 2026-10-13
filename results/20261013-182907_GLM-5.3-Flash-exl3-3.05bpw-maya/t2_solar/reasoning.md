Create a TypeScript file with Three.js solar system. Key details:

- PointLight with physically based intensity — with default decay=2, need intensity like 100-300 for distances ~10. Use intensity ~300.
- Camera above and side, looking at origin, whole system visible.
- Planet 2 moon as child of planet mesh, orbiting — moon should orbit around planet: since moon is child of planet mesh, but planet spins on its own axis, adding moon as child means moon would also follow the planet's spin. Better: use a pivot group? But requirement says planet.add(moon). To make the moon orbit while planet spins, we can put the moon at an offset and rotate... If the planet spins on Y axis, and moon orbits in XZ plane around planet, then adding moon as child of planet and rotating planet would rotate moon too — the moon's orbit would just match planet spin. That's acceptable: moon as child, offset position, planet's spin carries it around. But spin speed and moon orbital speed would be identical then. Alternative: add moon to planet, and each frame set moon position manually in planet's local space (orbit angle). That satisfies planet.add(moon) and gives independent orbit. But if planet spins on Y, moon local coordinates get rotated by spin too. To keep moon orbit independent, could set moon.position each frame based on angle and compensate... Simpler: make planet mesh spin, and moon child; moon position set each frame in local space — the spin rotation applies to child, so moon's world position combines spin rotation + local orbit position. That makes moon wobble. Alternative: make planet spin around its own axis but put the moon's orbital rotation by rotating moon around planet using moon.rotateOnAxis? Hmm.

Cleanest approach: planet mesh spins on its axis (rotate .y). Moon is child. Set moon.position each frame via angle: moon.position.set(cos(a)*r, 0, sin(a)*r). The planet's rotation also rotates the moon's local frame, so moon world position = planetRotation * moonLocalPos — effectively moon orbits at spin speed + orbit speed. That's fine visually — still orbits the planet. Actually it just adds spin speed to orbital angular speed; moon still orbits in XZ plane (since planet spins around Y). That's perfectly acceptable. I'll just note effective speed. Or I can compensate by subtracting spin speed from moon angle so effective orbit speed is desired. I'll do that for cleanliness.

Also planets: each planet at distance — position set each frame via angle: planet.position.set(cos*dist, 0, sin*dist). Spin: planet.rotation.y += spinSpeed * delta.

Renderer: physically correct lighting is default in modern three (r155+). PointLight intensity: with decay 2, intensity in candela; illuminance at distance d = I/d². At d=10, I=300 gives 3 — decent. Use intensity 400, maybe. Let's use 500? At distance 4, 500/16≈31, quite bright; tone mapping could help. Set renderer.toneMapping = THREE.ACESFilmicToneMapping. With ACES, bright areas ok. Use intensity 300 and tone mapping.

AmbientLight intensity 0.15 or so.

Camera: position like (0, 12, 18) looking at origin — above and to side. Whole system radius 10 visible. Maybe (10, 12, 16).

Sun sphere radius ~1.5, planets 0.5, 0.7, 0.6, moon 0.2.

__ready after first frame: use a flag in animation loop — after renderer.render, set if not set.

Add starfield? Not required; keep simple, maybe add subtle stars via Points — allowed, no external assets. Optional; keep it, it's nice. But "no external assets" fine — generated points. I'll add a small starfield for looks. Keep code moderate.

Write code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
camera.position.set(12, 10, 16);
camera.lookAt(0,0,0);

renderer setup, append canvas, tone mapping.

Lights: PointLight(0xffffff, 300, 0, 2) at origin; Ambient 0.12.

Sun: SphereGeometry(1.6, 48, 32), MeshBasicMaterial color 0xffcc33. Maybe add glow sprite? Skip.

Planets data array: {distance, radius, speed, spin, color}. Orbit angle randomized initial.

Moon for planet index 1.

Animate with clock delta.

Resize handler.

Expose __scene etc.

Set __ready after first render.
```

Starfield: BufferGeometry with random points on sphere radius 60-90, PointsMaterial size 0.5 sizeAttenuation. Fine.

Ensure tsc --strict: no implicit any, handle possibly null. document.body append — body exists. Use non-null where needed carefully: `document.body.appendChild` fine.

Moon: create moon mesh, planet2.add(moon); each frame: moonOrbit angle += moonSpeed*delta; compensate spin: since planet spins at spinSpeed around Y, effective angle = spinAngle + moonAngle; to get desired moonAngle relative to world, set moon.position using (moonAngle - accumulatedSpin). Track planet.rotation.y accumulated. Simpler: moonAngle -= planetSpinSpeed*delta too when incrementing... Let spinAngle = planet2.rotation.y. moon.position.set(Math.cos(moonAngle - spinAngle)*moonDist, 0, Math.sin(moonAngle - spinAngle)*moonDist)? Wait: world position of moon = R_y(spinAngle) * localPos. If localPos = (cos(a)*r,0,sin(a)*r), world angle = a + spinAngle (rotation around Y maps x->cos*x - sin*z... rotation by θ around Y: x' = x cosθ + z sinθ, z' = -x sinθ + z cosθ for right-handed? Actually THREE rotation Y positive: x' = x cosθ + z sinθ? Let's not overthink; the point is world angle = a ± spinAngle). To keep world orbital rate constant, set a = desiredWorldAngle - spinAngle. Then world angle = desiredWorldAngle regardless of sign convention. 

So: moonWorldAngle += moonSpeed*delta; moon.position.set(cos(moonWorldAngle - planet2.rotation.y)*d, 0, sin(...)*d). 

Hmm sign: rotation around Y by θ transforms point (x,0,z): x' = x cosθ + z sinθ, z' = -x sinθ + z cosθ. So (cos a, 0, sin a) -> (cos a cosθ + sin a sinθ, 0, -cos a sinθ + sin a cosθ) = (cos(a-θ), 0, sin(a-θ)). So world angle = a - θ. To make world angle = φ, set a = φ + θ. So moon.position.set(cos(φ + spin)*d, 0, sin(φ + spin)*d). Good.

Planet orbit positions: angle per planet, position.set(cos*d, 0, sin*d).

Tilt planets slightly? Keep axes vertical-ish; maybe small axial tilt for looks. Spin around own axis — use rotation.y. If I tilt the mesh, spin on local y is fine. Keep simple: no tilt, or small tilt via a parent group. Keep simple — planets spin with rotation.y.

Camera: "above and to the side" — position (0? no, side) e.g. (14, 10, 14), lookAt origin. Distance ~22, fov 50 — system radius 10 fits? Half-angle needed: atan(10/22) ≈ 24.4° < 25 vertical half-fov, ok. Use fov 55 for safety or distance 24. Use position (16, 12, 16): distance ~25.7. Fine.

Write final code.