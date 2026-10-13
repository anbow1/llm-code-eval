Create a TypeScript file with Three.js. Set up sun with MeshBasicMaterial and PointLight with appropriate intensity (with physically based lighting, PointLight intensity needs to be high, e.g., decay=2 default, intensity ~ maybe 50-100 or set decay=0... Better: use intensity like 200 with distance 0? In recent Three.js, PointLight default decay=2, physically correct. Intensity in candela; at distance 4, illuminance = intensity/16. So intensity ~ 100 gives ~6 lux, fine. Use intensity like 300.)

Planets orbit at distances 4, 7, 10 with different angular speeds, spin on axis. Planet 2 has moon child orbiting. AmbientLight weak. Camera positioned above/side looking at origin.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
camera.position.set(12, 12, 16); camera.lookAt(0,0,0);

renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(...); document.body.appendChild(renderer.domElement);

sun = MeshBasicMaterial color 0xffd27f... sphere radius 1.5.
pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);

planets: radii 0.5, 0.7, 0.6; speeds 1.2, 0.7, 0.4 (rad/s). spin speeds.

moon as child of planet mesh: but planet mesh is positioned in world via orbit calc — if we set planet.position each frame, moon child at local position rotates. Moon orbit: set moon position each frame: moon.position.set(cos(t*speed)*r, 0, sin(t*speed)*r). Since planet spins, moon as child also inherits spin; that's fine, moon orbits anyway. Actually if planet spins on its axis, moon's local position rotates with it—acceptable but could add. Simpler: moon position relative to planet set each frame in local coords, plus planet spin. It'll still orbit. Fine.

Use pivot groups? Simpler: compute planet positions directly each frame:
angle = speed * t + offset; planet.position.set(cos*r, 0, sin*r).
Spin: planet.rotation.y = spinSpeed * t.

__ready after first frame: use a flag in render loop, set ready after renderer.render first time.

Resize handler.

Write code.