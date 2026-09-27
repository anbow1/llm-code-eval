Let me build a mini solar system in Three.js with TypeScript. Let me plan the components:

1. **Sun**: Sphere at origin with MeshBasicMaterial (emissive look), plus a PointLight at origin. For physically based lighting, I should use `renderer.useLegacyLights = false` or set appropriate intensity. In modern Three.js, PointLight intensity is in candela when using physically correct lights. I'll set a high intensity to illuminate planets at distances 4, 7, 10.

2. **Planets**: 3 spheres with MeshStandardMaterial at distances ~4, 7, 10 in the XZ plane. Each orbits the sun at different angular speeds (inner faster). Each also spins on its own axis.

3. **Moon**: Planet 2 (middle one at distance 7) has a moon as a child, orbiting that planet.

4. **AmbientLight**: Weak ambient light so dark sides aren't pure black.

5. **Camera**: Above and to the side, looking at origin, whole system visible.

6. **Renderer**: WebGLRenderer, appended to document.body, sized from window dimensions, handle resize.

7. **Animation loop**: Use `renderer.setAnimationLoop`, use delta time.

8. **Expose for testing**: `__scene`, `__camera`, `__renderer`, `__ready`.

Let me think about the physically based light:
- In Three.js r155+, `renderer.useLegacyLights` defaults to false. PointLight intensity is in candela. For a planet at distance 7, I need enough light. Let me use a high intensity like 500 or 1000 candela. Actually, let me think about this more carefully.

With physically correct lights (useLegacyLights = false in newer versions, or it's the default now), PointLight intensity is in candela. The illuminance at distance d is I/d². For a planet at distance 7, if I want reasonable illumination, I need intensity around 500-1000.

Actually, let me just set a high enough intensity. I'll use something like 800 candela so planets at distance 4, 7, 10 are well lit.

For the PointLight decay: `decay = 2` is the physically correct value (inverse square). Let me use that.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera - above and to the side
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight at origin
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0x222222, 0.3);
scene.add(ambientLight);

// Planets
const planetData = [
  { radius: 0.4, distance: 4, orbitSpeed: 1.0, spinSpeed: 0.5, color: 0x4488ff },
  { radius: 0.5, distance: 7, orbitSpeed: 0.6, spinSpeed: 0.3, color: 0x44aa66 },
  { radius: 0.35, distance: 10, orbitSpeed: 0.3, spinSpeed: 0.7, color: 0xcc6644 },
];

const planets: THREE.Mesh[] = [];

for (const data of planetData) {
  const geo = new THREE.SphereGeometry(data.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(data.distance, 0, 0);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.0, 0, 0);
planets[1].add(moon);

// Animation
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((time) => {
  const delta = clock.getDelta(); // or compute from time
  ...
});
```

Wait, I need to be careful with delta time. Let me use a Clock or track the previous time.

Actually, `renderer.setAnimationLoop` gives me a timestamp in milliseconds. I can track the previous timestamp to compute delta.

Let me also think about the orbit mechanics:
- Each planet orbits in the XZ plane around the origin
- Angular speed: inner faster
- Each planet spins on its own axis (rotation around Y)

For the moon:
- It's a child of planet 2's mesh
- It orbits around the planet (in the local frame of the planet)
- So I need to rotate the moon around the planet's Y axis

Let me think about the structure more carefully:

For orbiting: I'll store the angle and update it each frame. The position is:
- x = distance * cos(angle)
- z = distance * sin(angle)
- y = 0

For spinning: rotate the mesh around its local Y axis.

For the moon: since it's a child of the planet mesh, its position is relative to the planet. I'll orbit it around the planet's local Y axis.

Let me also add a slight axial tilt for visual interest? The problem says "spins on its own axis" - I'll just do Y-axis rotation.

Let me also add some visual elements like orbit lines? Not required, but it could be nice. The problem doesn't ask for it, so I'll keep it simple.

Actually, let me re-read the requirements:
- Sun: sphere at origin with MeshBasicMaterial ✓
- PointLight at origin that actually lights the planets (physically based light intensity/decay) ✓
- 3 planets: spheres with MeshStandardMaterial at distances about 4, 7 and 10 ✓
- Each orbiting the sun at a different angular speed (inner planets faster) ✓
- Every planet also spins on its own axis ✓
- Planet 2 has a moon: small sphere added as child of planet mesh (planet.add(moon)), orbiting that planet ✓
- Weak AmbientLight so dark sides are not pure black ✓
- Camera above and to the side, looking at origin, whole system visible ✓

Let me finalize the code. I need to make sure it compiles with `tsc --strict`.

For the point light with physically based lighting:
- In Three.js, when `useLegacyLights` is false (default in newer versions), PointLight intensity is in candela
- decay = 2 for inverse square
- At distance 4: illuminance = 800/16 = 50
- At distance 7: illuminance = 800/49 ≈ 16.3
- At distance 10: illuminance = 800/100 = 8

These should be reasonable for standard materials. Let me go with 800.

Actually, I should be careful. In newer Three.js (r155+), the default for useLegacyLights is false. But to be safe and explicit, I could set it. Actually, let me just set the light properties that make sense.

Let me write the final code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight (physically based: intensity in candela, decay = 2)
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Ambient
const ambient = new THREE.AmbientLight(0x111122, 0.4);
scene.add(ambient);

// Planet configs
interface PlanetConfig {
  radius: number;
  distance: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.4, distance: 4, orbitSpeed: 0.8, spinSpeed: 1.2, color: 0x4488ff },
  { radius: 0.55, distance: 7, orbitSpeed: 0.5, spinSpeed: 0.8, color: 0x44aa77 },
  { radius: 0.35, distance: 10, orbitSpeed: 0.3, spinSpeed: 1.5, color: 0xcc7744 },
];

const planets: THREE.Mesh[] = [];
const orbitAngles: number[] = [0, 0, 0];

for (const cfg of configs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cfg.distance, 0, 0);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.18, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
planets[1].add(moon);

// Moon orbit angle
let moonAngle = 0;
const moonOrbitSpeed = 2.0; // rad/s
const moonOrbitRadius = 1.2;

// Animation
let prevTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = prevTime === 0 ? 0 : (time - prevTime) / 1000;
  prevTime = time;

  // Orbit planets
  for (let i = 0; i < planets.length; i++) {
    orbitAngles[i] += configs[i].orbitSpeed * delta;
    const a = orbitAngles[i];
    planets[i].position.x = configs[i].distance * Math.cos(a);
    planets[i].position.z = configs[i].distance * Math.sin(a);
    planets[i].rotation.y += configs[i].spinSpeed * delta;
  }

  // Moon orbit (local to planet 2)
  moonAngle += moonOrbitSpeed * delta;
  moon.position.x = moonOrbitRadius * Math.cos(moonAngle);
  moon.position.z = moonOrbitRadius * Math.sin(moonAngle);

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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This looks good. Let me double-check for strict mode:
- All variables are typed
- No implicit any
- The `PlanetConfig` interface is defined
- The `configs` array is typed
- `planets` is typed as `THREE.Mesh[]`
- `orbitAngles` is typed as `number[]`
- `prevTime` is `number`
- `ready` is `boolean`
- `moonAngle` is `number`
- `moonOrbitSpeed` is `number`
- `moonOrbitRadius` is `number`

The `time` parameter in the animation loop callback - in Three.js, the callback receives a `number` (DOMHighResPerformanceNow). This should be fine.

Wait, I need to make sure the `renderer.setAnimationLoop` callback signature is correct. It's `(time: number) => void`. Yes, that's correct.

Let me also make sure I'm not using any deprecated APIs. `PointLight(color, intensity, distance, decay)` - yes, that's the constructor signature.

I think this is solid. Let me write the final version.
