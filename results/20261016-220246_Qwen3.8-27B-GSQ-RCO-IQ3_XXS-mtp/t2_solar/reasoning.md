Let me plan this TypeScript file carefully.

Requirements:
1. Import Three.js as `import * as THREE from 'three';`
2. Compile with `tsc --strict` with zero errors.
3. Create WebGLRenderer, append canvas to document.body.
4. Size from window.innerWidth/innerHeight, handle resize.
5. Use renderer.setAnimationLoop for render loop.
6. Motion uses delta/elapsed time.
7. Expose __scene, __camera, __renderer on window.
8. After first frame, set (window as any).__ready = true.
9. No external assets.

Scene design:
- Y is up, orbits in XZ plane.
- Sun: sphere at origin, MeshBasicMaterial (emissive look, no lighting needed). PointLight at origin.
- 3 planets at distances 4, 7, 10. MeshStandardMaterial. Different angular speeds (inner faster).
- Each planet spins on its own axis.
- Planet 2 has a moon: small sphere, child of planet mesh (planet.add(moon)), orbiting that planet.
- Weak AmbientLight.
- Camera above and to the side, looking at origin.

For physically based light:
- PointLight with decay = 2 (physically correct inverse square law)
- Intensity should be high enough to light planets at distance 4-10.
- In Three.js r155+, PointLight intensity is in candela (physical units). With decay=2, intensity of, say, 200 should work at distance 4-10.

Let me think about the light intensity. With decay=2:
- At distance 4: illuminance = intensity / 16
- At distance 7: illuminance = intensity / 49
- At distance 10: illuminance = intensity / 100

If intensity = 200:
- At 4: 12.5
- At 7: ~4.1
- At 10: 2

That should be visible. Maybe I'll use intensity = 300 or so. Let me use 200.

Actually, in newer Three.js versions (r155+), the lighting model changed. PointLight.intensity is in candela. With decay=2, the formula is:
lightContribution = intensity / (distance^decay)

So at distance 4 with intensity 200: 200/16 = 12.5
At distance 7: 200/49 ≈ 4.08
At distance 10: 200/100 = 2

These should be fine for MeshStandardMaterial.

For the planets orbiting:
- Planet 1: distance 4, angular speed say 1.0 rad/s
- Planet 2: distance 7, angular speed say 0.5 rad/s
- Planet 3: distance 10, angular speed say 0.25 rad/s

For spinning:
- Planet 1: spin speed 2 rad/s
- Planet 2: spin speed 1.5 rad/s
- Planet 3: spin speed 1 rad/s

Moon:
- Small sphere, child of planet 2
- Orbits planet 2 at some distance, say 1.5 units
- Angular speed maybe 2 rad/s

Camera:
- Position: maybe (15, 12, 15) looking at origin. This should show the whole system (max orbit radius 10, so need to be far enough).
- FOV 60 degrees should work.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Point Light at origin
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
scene.add(pointLight);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Planet data
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number; // orbit
  spinSpeed: number; // self rotation
  angle: number; // current orbit angle
  spinAngle: number; // current spin angle
}

// Planet 1
const planet1Geo = new THREE.SphereGeometry(0.4, 24, 24);
const planet1Mat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.8, metalness: 0.1 });
const planet1 = new THREE.Mesh(planet1Geo, planet1Mat);
scene.add(planet1);

// Planet 2
const planet2Geo = new THREE.SphereGeometry(0.5, 24, 24);
const planet2Mat = new THREE.MeshStandardMaterial({ color: 0xcc6644, roughness: 0.7, metalness: 0.1 });
const planet2 = new THREE.Mesh(planet2Geo, planet2Mat);
scene.add(planet2);

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planet2.add(moon);

// Planet 3
const planet3Geo = new THREE.SphereGeometry(0.3, 24, 24);
const planet3Mat = new THREE.MeshStandardMaterial({ color: 0x88cc44, roughness: 0.8, metalness: 0.1 });
const planet3 = new THREE.Mesh(planet3Geo, planet3Mat);
scene.add(planet3);

const planets: PlanetData[] = [
  { mesh: planet1, distance: 4, angularSpeed: 1.0, spinSpeed: 2.0, angle: 0, spinAngle: 0 },
  { mesh: planet2, distance: 7, angularSpeed: 0.5, spinSpeed: 1.5, angle: Math.PI / 3, spinAngle: 0 },
  { mesh: planet3, distance: 10, angularSpeed: 0.25, spinSpeed: 1.0, angle: 2 * Math.PI / 3, spinAngle: 0 },
];

let moonAngle = 0;
const moonDistance = 1.5;
const moonAngularSpeed = 2.0;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Update planet positions and spins
  for (const p of planets) {
    p.angle += p.angularSpeed * delta;
    p.spinAngle += p.spinSpeed * delta;

    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    p.mesh.rotation.y = p.spinAngle;
  }

  // Update moon
  moonAngle += moonAngularSpeed * delta;
  moon.position.x = Math.cos(moonAngle) * moonDistance;
  moon.position.z = Math.sin(moonAngle) * moonDistance;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, let me think about strict mode issues:
- All variables are typed.
- No implicit any.
- The `(window as any)` casts are fine.
- `clock.getDelta()` returns number.
- All good.

Actually, one issue: `new THREE.PointLight(0xffffff, 200, 0, 2)` - the signature is `PointLight(color, intensity, distance, decay)`. Setting distance to 0 means infinite range. That's fine.

Let me double-check the PointLight constructor: `new THREE.PointLight(color?: Color | number, intensity?: number, distance?: number, decay?: number)`. Yes, that's correct.

For strict mode, I need to make sure there are no issues. Let me review:
- `const scene = new THREE.Scene();` - fine
- `const camera = new THREE.PerspectiveCamera(...)` - fine
- All good.

One more thing: the clock. `new THREE.Clock()` - getDelta() returns the delta in seconds. Good.

Let me also make sure the moon is properly positioned relative to planet 2. Since moon is a child of planet2, its position is in planet2's local space. So `moon.position.x = Math.cos(moonAngle) * moonDistance` will orbit around planet2's center. Good.

The camera at (15, 12, 15) looking at origin with FOV 60 should show the whole system. The farthest planet is at distance 10 in the XZ plane. The camera is at distance sqrt(15²+12²+15²) ≈ 23.5 from origin. With FOV 60, the visible width at distance 23.5 is roughly 2*23.5*tan(30°) ≈ 27 units. So the system (diameter 20) fits.

I think this is solid. Let me finalize.
