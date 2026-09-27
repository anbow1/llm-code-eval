Let me plan out this mini solar system:

1. **Sun**: Sphere at origin with MeshBasicMaterial (emissive look), plus a PointLight at origin. For physically based lighting, I need to set `renderer.physicallyCorrectLights = true` (or in newer Three.js, `renderer.useLegacyLights = false`). The PointLight needs appropriate intensity and decay. With physically correct lights, intensity is in candela and decay=2 is default. I'll set intensity high enough to light planets at distances 4-10.

2. **3 Planets**: MeshStandardMaterial spheres at distances ~4, 7, 10. Different angular speeds (inner faster). Each spins on its own axis.

3. **Moon**: Small sphere as child of planet 2 (the middle one at distance 7). It orbits the planet - since it's a child of the planet mesh, I need to position it relative to the planet and rotate it. Actually, if the moon is a child of the planet mesh, and the planet mesh is what orbits the sun... I need to think about this carefully.

Let me think about the orbit structure:
- Each planet needs to orbit the sun. I can either:
  a) Use a pivot/group that rotates, with the planet positioned at the orbit radius
  b) Directly set the planet's position each frame using sin/cos

I'll use approach (b) - directly setting positions each frame. This is cleaner.

For the moon: it's a child of planet 2's mesh. So the moon's position is relative to the planet. I'll animate the moon's local position (or rotate a group). Since the moon is a child of the planet mesh, I can set moon.position each frame to orbit around the planet's local origin.

Wait, but if the planet mesh is the one whose position I'm setting (for orbit), and the moon is a child, then the moon will automatically follow the planet. I just need to animate the moon's local position.

Let me structure:
- `scene`
- Sun mesh at (0,0,0)
- PointLight at (0,0,0)
- AmbientLight
- Planet 1 mesh (position animated)
- Planet 2 mesh (position animated)
  - Moon mesh (child, local position animated)
- Planet 3 mesh (position animated)

For the physically correct light: In modern Three.js (r155+), `renderer.useLegacyLights = false` is the default. The PointLight intensity with decay=2 follows inverse square law. At distance 4, the illuminance would be intensity/16. At distance 10, it would be intensity/100. I'll set intensity to something like 200-500 to make planets visible.

Actually, let me reconsider. With `useLegacyLights = false` (physically correct), the point light intensity is in candela. The formula is: `illuminance = intensity / (distance^2)` when decay=2. So at distance 4, illuminance = intensity/16. At distance 10, illuminance = intensity/100.

If I set intensity = 300:
- At d=4: 300/16 ≈ 18.75
- At d=7: 300/49 ≈ 6.1
- At d=10: 300/100 = 3

That should work well. The ambient light will handle the dark side.

Let me write the code:

```typescript
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.useLegacyLights = false; // physically correct
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Point Light
const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(pointLight);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
scene.add(ambientLight);

// Planets
// Planet 1 - inner
const planet1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const planet1Mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.7, metalness: 0.1 });
const planet1 = new THREE.Mesh(planet1Geo, planet1Mat);
scene.add(planet1);

// Planet 2 - middle (has moon)
const planet2Geo = new THREE.SphereGeometry(0.6, 32, 32);
const planet2Mat = new THREE.MeshStandardMaterial({ color: 0xcc6644, roughness: 0.8, metalness: 0.1 });
const planet2 = new THREE.Mesh(planet2Geo, planet2Mat);
scene.add(planet2);

// Moon (child of planet2)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planet2.add(moon);

// Planet 3 - outer
const planet3Geo = new THREE.SphereGeometry(0.5, 32, 32);
const planet3Mat = new THREE.MeshStandardMaterial({ color: 0x88cc88, roughness: 0.7, metalness: 0.1 });
const planet3 = new THREE.Mesh(planet3Geo, planet3Mat);
scene.add(planet3);

// Animation
const clock = new THREE.Clock();

// Orbit parameters
const orbits = [
  { mesh: planet1, radius: 4, speed: 0.8, spinSpeed: 1.5 },
  { mesh: planet2, radius: 7, speed: 0.5, spinSpeed: 1.0 },
  { mesh: planet3, radius: 10, speed: 0.3, spinSpeed: 0.7 },
];

let moonAngle = 0;
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 2.0;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Orbit planets
  for (const orbit of orbits) {
    const angle = elapsed * orbit.speed;
    orbit.mesh.position.set(
      Math.cos(angle) * orbit.radius,
      0,
      Math.sin(angle) * orbit.radius
    );
    // Spin
    orbit.mesh.rotation.y += orbit.spinSpeed * delta;
  }

  // Moon orbit around planet2
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Wait, I need to check: `renderer.useLegacyLights` - in newer versions of Three.js this might be deprecated or the property name might differ. Let me use `renderer.useLegacyLights = false` which should work for Three.js r155+. Actually, in r155+, `useLegacyLights` was deprecated in favor of just always using physically correct lights. Let me just set it to be safe, or I can skip it since newer versions default to physically correct.

Actually, looking at Three.js changelog:
- r155: `useLegacyLights` defaults to `false`
- r163: `useLegacyLights` removed

So for safety, I'll just not set it (modern Three.js defaults to physically correct). But if the user is on an older version... Let me just set it to be safe:

```typescript
if ('useLegacyLights' in renderer) {
  (renderer as any).useLegacyLights = false;
}
```

Hmm, but that's ugly. Let me just set it directly. If it's removed in the version being used, it'll just be a no-op property assignment. Actually in strict TypeScript, if the property doesn't exist on the type, it would error. Let me use `(renderer as any).useLegacyLights = false;` to be safe.

Actually, I'll just skip it. Modern Three.js (r155+) defaults to physically correct lights. The intensity values I chose (300 for point light) should work well with physically correct lighting.

Let me also make sure the camera sees the whole system. The outermost planet is at radius 10. Camera at (0, 15, 20) looking at origin. The distance from camera to origin is sqrt(0 + 225 + 400) = sqrt(625) = 25. With FOV 60 degrees, the visible width at distance 25 is 2 * 25 * tan(30°) ≈ 2 * 25 * 0.577 ≈ 28.9. So the system (diameter 20) should be visible. Good.

Let me finalize the code.
