The user wants a mini solar system in Three.js as a single TypeScript file. Let me plan this out:

1. Scene, Camera, Renderer setup
2. Sun: MeshBasicMaterial sphere at origin + PointLight at origin
3. 3 planets with MeshStandardMaterial at distances 4, 7, 10
4. Different angular speeds (inner faster)
5. Planet spin on own axis
6. Planet 2 has a moon as child
7. Weak AmbientLight
8. Camera above and to the side looking at origin
9. Resize handling
10. Animation loop with delta time
11. Expose globals for testing

Key considerations:
- PointLight with physically correct lighting: need to set `renderer.useLegacyLights = false` (or in newer Three.js, it's the default). Actually in newer Three.js (r155+), `useLegacyLights` is deprecated and physically correct is default. I'll set the intensity appropriately. For physically based, PointLight intensity is in candela. I'll use a high intensity value.
- Actually, for compatibility, I should be careful. Let me use `renderer.useLegacyLights = false` but that might be deprecated. Let me just set a reasonable intensity and make sure it works. In r152+, `useLegacyLights` defaults to false. I'll set intensity to something like 200-500 to account for decay.
- PointLight: by default `decay = 2` (physically correct). With physically correct lighting, intensity is in candela and falls off with 1/r². At distance 4, 7, 10, I need enough intensity. Let me use intensity around 300-500.
- Orbits in XZ plane: position.x = distance * cos(angle), position.z = distance * sin(angle), y = 0
- Moon as child of planet mesh: it will inherit the planet's position AND rotation. The moon orbits the planet by updating its local position.
- Planet spin: rotate the planet mesh on its Y axis each frame.

Let me write the code:

```typescript
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planetData = [
  { distance: 4, speed: 1.0, size: 0.5, color: 0x4488ff, spinSpeed: 2.0 },
  { distance: 7, speed: 0.6, size: 0.7, color: 0x44ff88, spinSpeed: 1.5 },
  { distance: 10, speed: 0.35, size: 0.6, color: 0xff8844, spinSpeed: 1.0 },
];

const planets: THREE.Mesh[] = [];

planetData.forEach((data) => {
  const geo = new THREE.SphereGeometry(data.size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
});

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.2, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

// Animation
const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Orbit planets
  planets.forEach((planet, i) => {
    const data = planetData[i];
    const angle = elapsed * data.speed;
    planet.position.x = data.distance * Math.cos(angle);
    planet.position.z = data.distance * Math.sin(angle);
    planet.position.y = 0;
    // Spin
    planet.rotation.y += data.spinSpeed * delta;
  });

  // Moon orbits planet 2
  const moonAngle = elapsed * 3.0;
  moon.position.x = 1.2 * Math.cos(moonAngle);
  moon.position.z = 1.2 * Math.sin(moonAngle);
  moon.position.y = 0;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

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

Wait, I need to be careful with `useLegacyLights`. In newer Three.js versions (r155+), this property is removed and physically correct lighting is always on. In r152-r154, it defaults to false. Let me not set it explicitly to avoid deprecation warnings, but ensure the intensity is high enough for physically correct mode.

Actually, with `decay = 2` (default) and physically correct mode, the light falloff is `intensity / (distance^2)`. At distance 4, that's 500/16 = 31.25. At distance 10, that's 500/100 = 5. Should be visible. Let me bump it up a bit to 800 to be safe.

Let me also make sure the `__ready` flag is set after the first render. The clock.getElapsedTime() on first call will be ~0, and getDelta() will also be ~0. That's fine.

One issue: `clock.getElapsedTime()` and `clock.getDelta()` - calling both in the same frame might cause issues because getElapsedTime internally calls getDelta in some implementations. Let me use just `getDelta()` and accumulate elapsed time manually, or use `getElapsedTime()` only.

Actually, looking at Three.js source, `getElapsedTime()` calls `getDelta()` internally. So calling both will give delta=0 on the second call. Let me just use `getElapsedTime()` for the orbital angle and `getDelta()` for the spin. Or better, store elapsed time and compute delta from it.

Let me restructure: use `clock.getDelta()` for delta, and accumulate elapsed time manually.

Actually the simplest: just use `performance.now()` or accumulate manually.

Let me use:
```
const delta = clock.getDelta();
elapsedTime += delta;
```

This avoids the issue. Let me finalize the code.
