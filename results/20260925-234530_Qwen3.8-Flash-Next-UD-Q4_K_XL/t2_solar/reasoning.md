The user wants a mini solar system built with Three.js in a single TypeScript file. Let me plan this carefully:

1. Import Three.js
2. Create scene, camera, renderer
3. Sun: sphere at origin with MeshBasicMaterial (emissive-looking), PointLight at origin
4. 3 planets with MeshStandardMaterial at distances 4, 7, 10
5. Each planet orbits at different angular speeds (inner faster)
6. Each planet spins on its own axis
7. Planet 2 has a moon (child of planet mesh)
8. Weak AmbientLight
9. Camera positioned above and to the side, looking at origin
10. Handle resize
11. Use setAnimationLoop with delta time
12. Expose globals for testing
13. Set __ready = true after first frame

For physically based lighting with Three.js:
- PointLight with decay=2 (physical), intensity needs to be high (e.g., 100+) since it follows inverse square law
- The renderer should have physicallyCorrectLights or useLegacyLights set appropriately

Actually in newer Three.js (r155+), `physicallyCorrectLights` is deprecated and replaced by `renderer.useLegacyLights = false`. But to be safe and compatible, let me think about what works.

Actually, in recent Three.js versions (r152+), `useLegacyLights` defaults to false, and light intensity is in physical units. A PointLight with decay=2 means intensity is in candela (cd). For a scene spanning ~10 units, an intensity of around 50-200 should work well.

Let me structure the orbit system:
- Use a pivot Object3D at the origin, add the planet as a child at the given distance, then rotate the pivot around Y axis.
- OR: directly compute x,z position using sin/cos each frame.

I'll go with direct position computation for clarity.

For planet rotation (spin), I'll rotate the planet mesh itself around its Y axis.

For the moon: add as child of planet mesh, compute its position relative to the planet each frame.

Camera: position like (15, 12, 15) looking at origin should show everything.

Let me write this out carefully:

```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2); // intensity in candela, decay=2
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
scene.add(ambientLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planets: { mesh: THREE.Mesh; distance: number; speed: number; spinSpeed: number; angle: number }[] = [];

const planetData = [
  { distance: 4, size: 0.4, color: 0x4488ff, speed: 1.2, spinSpeed: 3 },
  { distance: 7, size: 0.6, color: 0xff6644, speed: 0.7, spinSpeed: 2 },
  { distance: 10, size: 0.5, color: 0x44ff88, speed: 0.4, spinSpeed: 4 },
];

let planet2: THREE.Mesh | null = null;
let moonAngle = 0;

planetData.forEach((data, i) => {
  const geo = new THREE.SphereGeometry(data.size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(data.distance, 0, 0);
  scene.add(mesh);
  planets.push({ mesh, distance: data.distance, speed: data.speed, spinSpeed: data.spinSpeed, angle: 0 });
  if (i === 1) planet2 = mesh;
});

// Moon - child of planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.0, 0, 0); // offset from planet center
if (planet2) {
  planet2.add(moon);
}

// Clock
const clock = new THREE.Clock();
let firstFrame = true;

// Animation
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Orbit planets
  planets.forEach((p) => {
    p.angle += p.speed * delta;
    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    // Spin
    p.mesh.rotation.y += p.spinSpeed * delta;
  });

  // Moon orbits planet 2
  if (planet2) {
    moonAngle += 3.0 * delta;
    moon.position.x = Math.cos(moonAngle) * 1.0;
    moon.position.z = Math.sin(moonAngle) * 1.0;
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Wait, I should expose __scene, __camera, __renderer immediately or at least before the first frame? The instructions say "Expose for testing" - let me set them right after creation, and __ready after first frame.

Also, I need to be careful about the `decay` parameter. In Three.js, the PointLight constructor is `PointLight(color, intensity, distance, decay)`. With decay=2 (physical), the light falls off as 1/r². For the scene to be lit at distance 10, intensity needs to be quite high.

Let me also think about `useLegacyLights`. In Three.js r155+, it's removed and physical lights are the default. In r152-r154, `renderer.useLegacyLights` exists. To be safe, I'll just set the intensity high enough. Actually, since we don't know the exact version, let me set intensity to something like 200-500 which should work for either mode.

Actually, let me just not set `useLegacyLights` and use a high intensity value like 200. With decay=2 and physical lights, at distance 4: illumination = 200/16 = 12.5, at distance 10: 200/100 = 2. That should be visible.

Hmm, but if legacy lights are on (older versions), intensity 200 would be way too bright. Let me set it to something moderate and also set `renderer.useLegacyLights = false` if available. But with strict TypeScript, accessing a property that might not exist... I'll use `(renderer as any).useLegacyLights = false;`

Actually, let me just go with intensity=150 and decay=2. That should work reasonably in both modes, and the ambient light ensures visibility.

Let me finalize the code.
