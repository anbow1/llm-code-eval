The user wants a mini solar system in Three.js. Let me plan this out:

1. Sun: sphere at origin with MeshBasicMaterial (emissive look), plus a PointLight at origin
2. 3 planets at distances ~4, 7, 10, orbiting at different speeds (inner faster)
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child of the planet mesh
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. Y is up, orbits in XZ plane

Let me think about the physically based light. In Three.js with physically correct lighting, PointLight intensity is in candela and decay is typically 2 (inverse square law). For a point light to actually light objects at distance 4-10, I need a reasonably high intensity. With decay=2, the intensity at distance d is intensity/d². So at distance 10, I need intensity around 100-200 to get reasonable lighting. Let me use intensity around 200 with decay 2.

Actually, let me think about this more carefully. In Three.js r155+, the lighting model changed. PointLight intensity is in candela. With decay=2 (physical), the illuminance at distance d is intensity/d². At distance 4, that's intensity/16. At distance 10, that's intensity/100. So if I want the outer planet to get maybe 2-5 units of illuminance, I need intensity around 200-500.

Let me use intensity = 300, decay = 2. That gives:
- At distance 4: 300/16 ≈ 18.75
- At distance 7: 300/49 ≈ 6.1
- At distance 10: 300/100 = 3.0

That seems reasonable.

For the camera: position above and to the side. Maybe (15, 12, 15) looking at origin. That should give a nice 3/4 view of the whole system.

Let me structure the code:

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
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
// Planet 1: distance 4, speed faster
// Planet 2: distance 7, speed medium, has moon
// Planet 3: distance 10, speed slower

interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: PlanetData[] = [];

// Planet 1
const p1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const p1Mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.8, metalness: 0.1 });
const p1 = new THREE.Mesh(p1Geo, p1Mat);
scene.add(p1);
planets.push({ mesh: p1, distance: 4, orbitSpeed: 1.5, spinSpeed: 2.0, angle: 0 });

// Planet 2 (with moon)
const p2Geo = new THREE.SphereGeometry(0.6, 32, 32);
const p2Mat = new THREE.MeshStandardMaterial({ color: 0xcc6644, roughness: 0.7, metalness: 0.2 });
const p2 = new THREE.Mesh(p2Geo, p2Mat);
scene.add(p2);
planets.push({ mesh: p2, distance: 7, orbitSpeed: 0.8, spinSpeed: 1.5, angle: Math.PI * 0.5 });

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
p2.add(moon);

// Planet 3
const p3Geo = new THREE.SphereGeometry(0.5, 32, 32);
const p3Mat = new THREE.MeshStandardMaterial({ color: 0x88cc88, roughness: 0.6, metalness: 0.3 });
const p3 = new THREE.Mesh(p3Geo, p3Mat);
scene.add(p3);
planets.push({ mesh: p3, distance: 10, orbitSpeed: 0.5, spinSpeed: 1.0, angle: Math.PI });

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Orbit planets
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    // Spin
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbit around planet 2
  const moonAngle = elapsed * 3.0;
  moon.position.x = Math.cos(moonAngle) * 1.2;
  moon.position.z = Math.sin(moonAngle) * 1.2;

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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check for potential issues:
- All variables are typed
- No implicit any
- The `as any` casts are fine

Let me also think about whether the moon position should be relative to the planet. Since moon is a child of p2, its position is in p2's local space. So setting moon.position.x and moon.position.z will orbit it around the planet. Good.

But wait - when the planet spins (rotation.y), the moon will also rotate with it since it's a child. That's actually fine - the moon orbits in the planet's local frame. Actually, this might look a bit odd because the moon's orbit will rotate with the planet's spin. Let me think... Actually for a mini solar system demo, this is perfectly fine and expected. The moon orbits the planet, and the planet's spin carries the orbital plane along. In reality, moons orbit in inertial space, but for this demo it's fine.

Actually, let me reconsider. If the planet spins and the moon is a child, the moon's position is in the planet's local coordinate system. So when the planet rotates, the moon's orbit plane rotates too. This is actually realistic in a sense (tidal locking), but for a simple demo it's fine.

Let me also make sure the PointLight actually has physically based settings. In newer Three.js versions, `renderer.useLegacyLights` was deprecated and removed. The default is physically correct lighting. So `PointLight(color, intensity, distance, decay)` where intensity is in candela and decay=2 is the default physical behavior.

Let me set intensity to 300 and decay to 2 explicitly. Distance 0 means no cutoff.

I think the code looks good. Let me finalize it.
