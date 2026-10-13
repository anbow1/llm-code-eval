Let me write the code. Note physically-based lighting: renderer.useLegacyLights? In modern three (r155+), useLegacyLights default false, so PointLight intensity needs to be large (candela) — intensity = distance² roughly. PointLight decay default 2. Set intensity ~ 300-500.

Camera: position like (12, 14, 18), lookAt origin. Use PerspectiveCamera fov 50.

Planets: radius 0.5, 0.6, 0.7 maybe; distances 4,7,10. Angular speeds: 0.8, 0.5, 0.3. Spins: different rates. Moon at radius 1.2 from planet 2, orbiting; moon child of planet mesh — but if moon is child of planet mesh, planet's own spin would drag moon. Common approach: planet spins on own axis; moon should orbit planet. If moon is child of spinning planet, moon position rotates with spin — that's still an orbit but tied to spin rate. Better: create a pivot group at planet position... But requirement says planet.add(moon). To avoid spin dragging moon, add moon to planet but counter... Simplest: make planet mesh not spin but add a spin child? Requirement: "Every planet also spins on its own axis" and "moon: a small sphere added as a child of the planet mesh". If moon is child of planet mesh and planet mesh spins, moon orbits at spin rate — moon orbit then equals spin. That's acceptable: moon child of planet, offset by moonOrbit distance, and set moon orbit speed independent? Can't if child of spinning mesh unless we offset rotation each frame: moonAngle += dt * moonSpeed; moon.position.set(cos, 0, sin) * r. If planet spins, moon's position gets multiplied by planet rotation — messy. Alternative: planet mesh spins, moon is child, and we update moon.position each frame with angle — the effective motion is spin + orbit, fine. Or make planet mesh contain a "spinGroup"... Actually simpler: make planet a Group (mesh)? Requirement says "planet mesh" — use Mesh as planet, add moon as child, and update moon.position in world-independent angle; combined with planet spin it's still orbiting. Acceptable.

Better: planet mesh spins on Y axis; moon position updated as child; total moon angle = planetSpin + moonAngle. Fine.

Set ready flag after first frame: in animation loop, after first render call set __ready = true.

Code:

import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010); — black fine.

Camera perspective, position (0, 12, 16)? Need whole system visible: radius 10 + planet sizes. Position (0, 14, 18), lookAt(0,0,0).

Renderer: antialias, setPixelRatio, append.

Resize handler.

Sun: SphereGeometry(1.5), MeshBasicMaterial color 0xffdd66. PointLight color 0xffffff, intensity: with decay=2 and distances 4-10, need intensity ~ 200 (at distance 7, intensity/49 ≈ 4). Use intensity 300, decay 2 (default). Maybe set decay explicitly.

Planets array with config: distance, radius, color, orbitSpeed, spinSpeed. Planet 2 gets moon.

AmbientLight intensity 0.15.

Loop: use clock delta; update angles; renderer.render; if first frame, set ready.

Expose window props.

Write code carefully typed.