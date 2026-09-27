Let me plan this mini solar system:

1. **Sun**: Sphere at origin, MeshBasicMaterial (emissive-looking, not affected by lights), plus a PointLight at origin with physically based intensity/decay.

2. **3 Planets**: 
   - Planet 1: distance ~4, fastest orbit
   - Planet 2: distance ~7, medium orbit, has a moon
   - Planet 3: distance ~10, slowest orbit
   - All use MeshStandardMaterial
   - All orbit in XZ plane (Y is up)
   - All spin on their own axis

3. **Moon**: Small sphere, child of Planet 2's mesh, orbiting it.

4. **Lighting**:
   - PointLight at origin (physically based: in Three.js, PointLight with decay=2 is physically correct, intensity is in candela for physically correct lights)
   - Weak AmbientLight

5. **Camera**: Above and to the side, looking at origin, whole system visible.

For physically based light:
- PointLight intensity in Three.js r155+ with physically correct lights uses candela. With decay=2, the intensity at distance d is `intensity / (d^2)`.
- For the planets at distances 4, 7, 10, I need sufficient intensity. Let's say intensity = 200 or so. Actually, let me think... At distance 4, illuminance = 200/16 = 12.5. At distance 10, illuminance = 200/100 = 2. That should be visible.

Actually, in newer Three.js, `renderer.useLegacyLights` is deprecated and physically correct lights are default. The PointLight intensity with decay=2 means the light follows inverse square law. An intensity of 100-200 should work for this scale.

Let me set:
- PointLight: intensity = 150, decay = 2, color white/warm
- AmbientLight: intensity = 0.15, color dim blue-ish

Camera position: Let's say (12, 10, 12) looking at origin. The system extends to radius 10, so we need to be far enough. Let me use position (15, 12, 15) with a FOV of about 50-60 degrees.

For the animation:
- Use elapsed time for orbital positions: angle = speed * elapsed
- Position: x = distance * cos(angle), z = distance * sin(angle), y = 0
- Planet spin: rotation.y = spinSpeed * elapsed

For the moon:
- It's a child of planet 2's mesh
- It orbits in the XZ plane relative to the planet
- So in the animate loop, I set moon.position.x = moonDist * cos(moonAngle), moon.position.z = moonDist * sin(moonAngle)

Wait, but if the moon is a child of the planet mesh, and the planet is spinning (rotation.y), then the moon's position in local space will be affected by the planet's rotation. I need to think about this.

Actually, if I set the moon's position in local space each frame, it will orbit relative to the planet's local coordinate system. Since the planet is spinning, the moon will orbit in the planet's rotating frame. That might look odd.

Better approach: Don't spin the planet mesh directly if it has a moon child. Instead, I could:
- Have the planet mesh spin (rotation.y)
- The moon is a child, so it inherits the planet's rotation
- If I set moon.position in local space, the moon will orbit in the planet's local frame

Actually, for visual correctness, I should either:
1. Not have the moon as a direct child but use a group, OR
2. Account for the planet's rotation when setting moon position

Actually, the simplest approach: The moon is a child of the planet. Each frame, I set the moon's local position. Since the planet is rotating, the moon's orbit will appear to rotate with the planet in world space, but in local space it just orbits. This is actually fine and looks good - the moon orbits in the planet's equatorial plane (which makes physical sense).

Let me code this up:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const pointLight = new THREE.PointLight(0xfff5e0, 150, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x334466, 0.15);
scene.add(ambientLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon?: THREE.Mesh;
  moonDistance: number;
  moonSpeed: number;
}

const planets: PlanetData[] = [];

// Planet 1 - inner
const p1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const p1Mat = new THREE.MeshStandardMaterial({ color: 0xcc6644, roughness: 0.8, metalness: 0.1 });
const p1 = new THREE.Mesh(p1Geo, p1Mat);
scene.add(p1);
planets.push({ mesh: p1, distance: 4, orbitSpeed: 0.8, spinSpeed: 1.5, moonDistance: 0, moonSpeed: 0 });

// Planet 2 - middle (has moon)
const p2Geo = new THREE.SphereGeometry(0.6, 32, 32);
const p2Mat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.7, metalness: 0.2 });
const p2 = new THREE.Mesh(p2Geo, p2Mat);
scene.add(p2);

const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
p2.add(moon);
planets.push({ mesh: p2, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.0, moon: moon, moonDistance: 1.2, moonSpeed: 2.0 });

// Planet 3 - outer
const p3Geo = new THREE.SphereGeometry(0.5, 32, 32);
const p3Mat = new THREE.MeshStandardMaterial({ color: 0x88aa66, roughness: 0.75, metalness: 0.15 });
const p3 = new THREE.Mesh(p3Geo, p3Mat);
scene.add(p3);
planets.push({ mesh: p3, distance: 10, orbitSpeed: 0.3, spinSpeed: 0.8, moonDistance: 0, moonSpeed: 0 });

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let elapsed = 0;
let lastTime = performance.now();
let firstFrame = false;

renderer.setAnimationLoop((time: number) => {
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  elapsed += delta;

  // Update planet positions
  for (const p of planets) {
    const angle = p.orbitSpeed * elapsed;
    p.mesh.position.x = p.distance * Math.cos(angle);
    p.mesh.position.z = p.distance * Math.sin(angle);
    p.mesh.position.y = 0;
    p.mesh.rotation.y = p.spinSpeed * elapsed;

    // Update moon
    if (p.moon) {
      const moonAngle = p.moonSpeed * elapsed;
      p.moon.position.x = p.moonDistance * Math.cos(moonAngle);
      p.moon.position.z = p.moonDistance * Math.sin(moonAngle);
      p.moon.position.y = 0;
    }
  }

  renderer.render(scene, camera);

  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to double-check the `setAnimationLoop` callback signature. It receives a `number` (DOMHighResTimeStamp) or `undefined`. Let me handle that.

Actually, in Three.js, `setAnimationLoop` callback receives a `number` parameter (the time in milliseconds). Let me make sure the type is correct.

Also, I should make sure the `lastTime` initialization is correct. The first call to `setAnimationLoop` will have a time value, so I should initialize `lastTime` to something reasonable or handle the first frame delta.

Let me refine: I'll initialize `lastTime` to `-1` and on the first frame, just set it to the current time without computing delta (or set delta to 0).

Actually, simpler: initialize `lastTime = performance.now()` before starting the loop. The first frame delta will be small but valid.

Let me also reconsider the PointLight. In Three.js with physically correct lighting (which is default now):
- PointLight intensity is in candela
- With decay=2, illuminance at distance d = intensity / d²
- At distance 4: 150/16 ≈ 9.4
- At distance 7: 150/49 ≈ 3.1
- At distance 10: 150/100 = 1.5

These should be visible. Let me bump it to 200 for better visibility.

Actually, I realize I should double check: in Three.js, when `renderer.useLegacyLights` is false (default in newer versions), the PointLight intensity is in candela and the formula is `intensity / (distance * distance)` for decay=2. So 200 should work fine.

Let me finalize the code.
