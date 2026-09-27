The user wants a complete TypeScript file for a mini solar system using Three.js. Let me plan this out:

1. Import Three.js
2. Create renderer, scene, camera
3. Sun: sphere at origin with MeshBasicMaterial + PointLight
4. 3 planets at distances 4, 7, 10 with MeshStandardMaterial, different orbital speeds
5. Planets spin on their own axis
6. Planet 2 has a moon (child of planet mesh)
7. AmbientLight for dark sides
8. Camera above and to the side, looking at origin
9. Handle resize
10. Use setAnimationLoop
11. Use delta/elapsed time for motion
12. Expose __scene, __camera, __renderer, __ready

Key considerations:
- Physically based light: PointLight in Three.js with `power` or `intensity`. In newer Three.js, PointLight uses physical units by default. I should use a reasonable intensity. Actually, let me think about this. In Three.js, PointLight intensity is in candela by default (physically correct). But for a mini solar system at distances 4-10, I need enough light. Let me use a high intensity value like 100 or 200 with decay of 2 (physically correct inverse square).

Actually, in Three.js r155+, the default for `useLegacyLights` changed. Let me just set a reasonable intensity. With decay=2 (physically correct), at distance 4, the light intensity would be `intensity / (4^2)` = `intensity / 16`. So I need a fairly high intensity. Let me use something like 200 or even 500.

Wait, let me reconsider. In Three.js, `PointLight(color, intensity, distance, decay)`. The intensity in physical mode is in candela. With decay=2, the falloff is inverse square. At distance d, illuminance = intensity / d^2.

For distance 4: intensity/16
For distance 7: intensity/49
For distance 10: intensity/100

So if I want reasonable lighting, I need intensity around 100-500. Let me go with 200.

Actually, let me just use a high enough value. 100 should work for the innermost. Let me use 300 to be safe.

For the orbital speeds: inner faster. So planet 1 (dist 4) fastest, planet 2 (dist 7) medium, planet 3 (dist 10) slowest.

For planet 2's moon: add as child of planet mesh. The moon orbits in local space of the planet.

Camera: above and to the side. Something like position (10, 12, 14) looking at origin.

Let me write the code:

```typescript
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 14);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet data
interface PlanetData {
  radius: number;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  color: number;
}

const planetConfigs: PlanetData[] = [
  { radius: 0.3, distance: 4, orbitSpeed: 0.8, spinSpeed: 1.5, color: 0x4488ff },
  { radius: 0.5, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.0, color: 0x88cc44 },
  { radius: 0.4, distance: 10, orbitSpeed: 0.3, spinSpeed: 0.7, color: 0xff8844 },
];

// Create planets
const planets: THREE.Mesh[] = [];
let moon: THREE.Mesh | null = null;

for (let i = 0; i < planetConfigs.length; i++) {
  const cfg = planetConfigs[i];
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  
  // Set initial position on orbit
  const angle = (i * Math.PI * 2) / 3;
  mesh.position.set(
    cfg.distance * Math.cos(angle),
    0,
    cfg.distance * Math.sin(angle)
  );
  
  scene.add(mesh);
  planets.push(mesh);
  
  if (i === 1) {
    // Moon for planet 2
    const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.0 });
    moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(1.2, 0, 0); // offset from planet center in local space
    mesh.add(moon);
  }
}

// Store initial angles for orbits
const initialAngles = planets.map((_, i) => (i * Math.PI * 2) / 3);
const distances = planetConfigs.map(cfg => cfg.distance);
const orbitSpeeds = planetConfigs.map(cfg => cfg.orbitSpeed);
const spinSpeeds = planetConfigs.map(cfg => cfg.spinSpeed);

// Animation
let elapsed = 0;
let lastTime: number | null = null;

// Moon orbit
const moonOrbitSpeed = 2.0;

(function animate(time: number) {
  if (lastTime === null) {
    lastTime = time;
  }
  const delta = Math.min((time - lastTime) / 1000, 0.1); // cap delta
  lastTime = time;
  elapsed += delta;
  
  // Update planet orbits
  for (let i = 0; i < planets.length; i++) {
    const angle = initialAngles[i] + elapsed * orbitSpeeds[i];
    planets[i].position.set(
      distances[i] * Math.cos(angle),
      0,
      distances[i] * Math.sin(angle)
    );
    
    // Spin
    planets[i].rotation.y += delta * spinSpeeds[i];
  }
  
  // Moon orbit (in local space of planet 2)
  if (moon) {
    const moonAngle = elapsed * moonOrbitSpeed;
    moon.position.set(
      1.2 * Math.cos(moonAngle),
      0,
      1.2 * Math.sin(moonAngle)
    );
    moon.rotation.y += delta * 0.5;
  }
  
  renderer.render(scene, camera);
  
  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
})();

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(animate);
```

Wait, I'm using an IIFE for animate but then also calling renderer.setAnimationLoop(animate). That's wrong. Let me restructure.

The `renderer.setAnimationLoop` callback receives `(time: number)` where time is in milliseconds (DOMHighResTimeStamp). I need to track delta time properly.

Let me restructure:

```typescript
let lastTime: number | null = null;
let elapsed = 0;

function animate(time: number): void {
  if (lastTime === null) {
    lastTime = time;
    delta = 0;
  } else {
    delta = Math.min((time - lastTime) / 1000, 0.1);
  }
  lastTime = time;
  elapsed += delta;
  
  // ... updates ...
  
  renderer.render(scene, camera);
  
  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);
```

Actually, `renderer.setAnimationLoop` passes a single argument which is the time in ms. Let me make sure the type is correct. The signature is `setAnimationLoop(callback: XRFrameRequestCallback | null)` where the callback gets `(time: DOMHighResTimeStamp, frame?: XRFrame)`. So `time` is a number.

Let me also be careful with strict mode. I need to handle all types properly.

Let me also make sure the PointLight intensity makes sense. In Three.js r155+, `useLegacyLights` defaults to false, meaning lights use physical units. A PointLight with intensity 300 and decay 2 should work. At distance 4, the effective intensity is 300/16 ≈ 18.75. At distance 7, it's 300/49 ≈ 6.1. At distance 10, it's 300/100 = 3. That should be visible with MeshStandardMaterial.

Actually wait - in Three.js, the intensity for PointLight in physical mode is in candela. The formula is: `illuminance = intensity * (1 / distance^decay)` when decay is 2. Actually I think it's `intensity / distance^2` for decay=2. Let me just use a high value like 500 to be safe.

Hmm, actually let me think more carefully. The Three.js docs say:
- For PointLight: `power` (in lumens) is preferred. `intensity` in candela = power / (4 * PI).
- But `intensity` can also be used directly as candela.

With `decay = 2` and `distance = 0` (infinite range), the light falloff is physically correct inverse square.

At distance d from light: effective illuminance = intensity / d² (in candela / m² = lux)

For our scene where planets are at 4, 7, 10 units:
- At d=4: intensity/16
- At d=7: intensity/49  
- At d=10: intensity/100

If intensity = 500:
- At d=4: 31.25
- At d=7: 10.2
- At d=10: 5.0

That should be fine for visualization. Let me use 500.

Let me finalize the code now with proper strict TypeScript.
