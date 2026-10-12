The user wants a mini solar system simulation in TypeScript with Three.js. Let me plan this out:

1. Sun at origin with MeshBasicMaterial (emissive-looking, self-lit)
2. PointLight at origin to actually light the planets (need to handle physically-based rendering - intensity and decay)
3. 3 planets at distances ~4, 7, 10 with different angular speeds (faster closer in)
4. Each planet spins on its own axis
5. Planet 2 (the middle one at distance 7) has a moon as a child that orbits around it
6. Weak AmbientLight
7. Camera positioned above and to the side looking at origin

Key considerations:
- THREE.js PBR: PointLight with decay=2 requires high intensity. I'll use something like intensity=500 or so, or set decay to 0 to make it behave like legacy lights. Actually with physical lights, intensity is in candela. For PointLight with decay=2, the formula is intensity / (distance^2). At distance 10, to get brightness ~1, need intensity ~100. Let me use decay=2 and intensity=200 to make sure all planets are lit.
- Actually, let me set renderer.toneMapping to ACESFilmic or just use a reasonable intensity. I'll use intensity=100 with decay=2 which at distance 4 gives 6.25, at 7 gives ~2, at 10 gives 1. That should work with standard materials.

Wait, actually with THREE.js r150+, PointLight intensity is in candela (lumens per steradian). The attenuation formula is: irradiance = intensity / (distance^decay). With decay=2 (physical falloff), at distance 4: 100/16=6.25, at distance 7: 100/49≈2, at distance 10: 100/100=1. That should work but might be dim. Let me bump intensity higher or use decay=1.5. Or I could just set decay=0 which makes it constant. But the problem says "mind physically based light intensity/decay" so they want me to use physical falloff but set appropriate values.

Let me use intensity=300, decay=2. At distance 4: 300/16=18.75, at 7: 300/49≈6, at 10: 300/100=3. With ACES tone mapping that should look nice. Or I'll just set renderer.toneMapping = ACESFilmic and use intensity=100.

Actually let me just use intensity=200, decay=2 and see. The values should be fine for MeshStandardMaterial which has roughness/metalness.

For angular speeds: inner faster. Let's say planet1 speed=0.5, planet2 speed=0.3, planet3 speed=0.15 (radians/second).

Planet self-spin: I'll rotate each planet mesh on its Y axis (or some tilted axis) at different rates.

Moon orbiting planet 2: I'll create a pivot group, add it as child of planet2 mesh, then rotate the pivot to orbit the moon.

Camera position: something like (12, 8, 12) looking at origin.

Let me write the code now.

```typescript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// Ambient
const ambient = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambient);

// Sun
const sunGeo = new THREE.SphereGeometry(0.8, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Point light
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2); // distance=0 means no cutoff, decay=2
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Planets
// Planet 1: distance 4, speed 0.8
const planet1Group = new THREE.Group();
const planet1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const planet1Mat = new THREE.MeshStandardMaterial({ color: 0x3388ff, roughness: 0.7, metalness: 0.2 });
const planet1Mesh = new THREE.Mesh(planet1Geo, planet1Mat);
planet1Group.add(planet1Mesh);
scene.add(planet1Group);

// Planet 2: distance 7, speed 0.5, has moon
const planet2Group = new THREE.Group();
const planet2Geo = new THREE.SphereGeometry(0.5, 32, 32);
const planet2Mat = new THREE.MeshStandardMaterial({ color: 0x44aa88, roughness: 0.7, metalness: 0.2 });
const planet2Mesh = new THREE.Mesh(planet2Geo, planet2Mat);
planet2Group.add(planet2Mesh);
scene.add(planet2Group);

// Moon - child of planet2 mesh
const moonPivot = new THREE.Group();
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
moonMesh.position.set(1.0, 0, 0); // offset from pivot
moonPivot.add(moonMesh);
planet2Mesh.add(moonPivot);

// Planet 3: distance 10, speed 0.25
const planet3Group = new THREE.Group();
const planet3Geo = new THREE.SphereGeometry(0.35, 32, 32);
const planet3Mat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.7, metalness: 0.2 });
const planet3Mesh = new THREE.Mesh(planet3Geo, planet3Mat);
planet3Group.add(planet3Mesh);
scene.add(planet3Group);

const speeds = [0.8, 0.5, 0.25];
const distances = [4, 7, 10];
const spinSpeeds = [2, 1.5, 1];
const moonOrbitSpeed = 2.0;

let firstFrame = true;

renderer.setAnimationLoop(() => {
  const t = performance.now() * 0.001; // elapsed time in seconds

  for (let i = 0; i < 3; i++) {
    const angle = speeds[i] * t;
    const groups = [planet1Group, planet2Group, planet3Group];
    groups[i].position.set(
      Math.cos(angle) * distances[i],
      0,
      Math.sin(angle) * distances[i]
    );
  }

  // Self-spin
  planet1Mesh.rotation.y = spinSpeeds[0] * t;
  planet2Mesh.rotation.y = spinSpeeds[1] * t;
  planet3Mesh.rotation.y = spinSpeeds[2] * t;

  // Moon orbit
  moonPivot.rotation.y = moonOrbitSpeed * t;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about TypeScript strict mode. Let me check:
- `performance.now()` returns number - fine
- `Math.cos`, `Math.sin` - fine
- The types for Three.js should be fine with the import.

Actually with `import * as THREE from 'three'` in a browser TypeScript file, this might not work with strict tsc unless there's a proper module resolution. But the user said this is for browser Three.js so I'll assume the type definitions are available.

Let me also double-check: the moon should be a child of planet2Mesh. When I set `planet2Mesh.add(moonPivot)`, the moonPivot is now in the local space of planet2Mesh. Since planet2Mesh rotates on Y, the moon orbit will also rotate. That's fine - it orbits around the planet.

But wait - if I spin planet2Mesh on its Y axis, and the moonPivot is a child of planet2Mesh, then the moon will orbit in the XZ plane of the planet's local space. Since the planet is spinning on Y, the moon orbit is also in XZ plane (rotated by the planet's spin). Actually the moonPivot rotates independently too. Let me think...

When planet2Mesh rotates on Y, its local coordinate frame rotates. moonPivot is a child, so it inherits that rotation. Then I also rotate moonPivot on Y. The net effect is the moon orbits in the planet's local XZ plane. Since the planet's Y axis is the same as world Y (assuming planet2Group has no rotation), the moon orbits in the XZ plane. That's fine.

Actually wait - planet2Group is positioned at the orbit location, and planet2Mesh is a child at (0,0,0). When I set `planet2Mesh.rotation.y`, the moon which is a child of planet2Mesh will rotate with it. And then moonPivot.rotation.y adds additional rotation. The moon will still orbit around the planet center. Good.

One issue: if planet2Mesh is spinning fast, the moon orbit direction will be affected. But that's fine for a demo.

Let me also make sure the PointLight parameters are correct. In Three.js:
`new THREE.PointLight(color, intensity, distance, decay)`

The `distance` parameter: 0 means infinite range. `decay`: 2 is physically correct (inverse square law).

With intensity=200 and decay=2:
- At distance 4: effective = 200/(4^2) = 200/16 = 12.5
- At distance 7: 200/49 ≈ 4.08
- At distance 10: 200/100 = 2.0

With ACES tone mapping, these values should produce visible lighting. The ambient at 0.3 helps with dark sides.

Let me also check: do I need to use `renderer.physicallyCorrectLights = true`? In newer Three.js (r150+), this is `renderer.useLegacyLights = false` or it's already the default. Actually in r155+ it's been removed and physical is default. In older versions you need `renderer.useLegacyLights = false`. Let me just set it conditionally or not at all - in recent versions physical lights are default.

Actually I'll just not set it since the latest Three.js (r155+) uses physical lights by default. The import path 'three/addons/...' suggests this is for a modern setup.

Let me finalize the code. I'll clean it up and make sure it's strict TypeScript compatible.
