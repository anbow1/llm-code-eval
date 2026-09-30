The user wants a mini solar system built with Three.js in TypeScript. Let me plan this out:

1. Sun at origin: MeshBasicMaterial sphere + PointLight at origin
2. 3 planets with MeshStandardMaterial at distances 4, 7, 10
3. Each planet orbits the sun in XZ plane at different angular speeds (inner faster)
4. Planets spin on their own axis
5. Planet 2 has a moon as a child that orbits the planet
6. Weak AmbientLight
7. Camera positioned to see the whole system
8. Must handle resize, use delta time, expose scene/camera/renderer, set __ready after first frame

Key considerations:
- PointLight intensity and decay: with physically correct lights (default in newer Three.js), PointLight intensity is in candela. For physically based rendering, I need to set appropriate intensity. Since Three.js r155+, useLegacyLights defaults to false. I should set intensity high enough to light planets at distances 4, 7, 10. With decay=2 (physical falloff), intensity in candela. For a point light at the origin illuminating objects at distance 4-10, I'll need a fairly high intensity value. Let me use something like intensity: 500 or so, and decay: 2. Actually, let me think about this more carefully.

With physical lights (decay=2), the irradiance at distance d is intensity / (d^2). So at d=10, irradiance = intensity/100. If I want reasonable illumination, intensity around 500 should work well. Or I could use decay: 1 for artistic purposes. But the prompt says "mind physically based light intensity/decay", so I should use decay: 2 and a high enough intensity.

Let me use intensity: 500, decay: 2.

For the orbit approach:
- I'll create planet meshes and add them to the scene directly
- Each frame, I update their position based on angle = angularSpeed * elapsed
- For the moon, I'll create a pivot object as a child of planet 2, and add the moon to that pivot. Then rotate the pivot.

Actually, for the moon orbiting the planet as a child: I can create a group (pivot) added to planet2, and add the moon to that group. Then rotate the group around Y axis.

Let me structure:
- scene
- camera (PerspectiveCamera)
- renderer
- sun mesh (MeshBasicMaterial, emissive-looking)
- PointLight at origin
- AmbientLight (weak, like 0.1 intensity)
- planet1 at radius 4, angular speed faster
- planet2 at radius 7, with moon
- planet3 at radius 10, angular speed slowest

For the camera: position above and to the side, like (15, 12, 15) looking at origin.

Let me write the code now.

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planetData = [
  { radius: 4, size: 0.4, color: 0x4488ff, angularSpeed: 1.2 },
  { radius: 7, size: 0.6, color: 0x44cc44, angularSpeed: 0.7 },
  { radius: 10, size: 0.5, color: 0xcc4444, angularSpeed: 0.4 },
];

const planets: THREE.Mesh[] = [];

planetData.forEach((data) => {
  const geo = new THREE.SphereGeometry(data.size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color });
  const planet = new THREE.Mesh(geo, mat);
  scene.add(planet);
  planets.push(planet);
});

// Moon for planet 2
const moonPivot = new THREE.Object3D();
planets[1].add(moonPivot);
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
moonPivot.add(moon);

// Animation
let firstFrame = true;

renderer.setAnimationLoop((time) => {
  const elapsed = time / 1000;

  // Orbit planets
  planets.forEach((planet, i) => {
    const data = planetData[i];
    const angle = data.angularSpeed * elapsed;
    planet.position.x = data.radius * Math.cos(angle);
    planet.position.z = data.radius * Math.sin(angle);
    // Spin on own axis
    planet.rotation.y += 0.02; // Hmm, this is frame-dependent. Let me use delta.
  });

  // Moon orbit
  moonPivot.rotation.y = 2.0 * elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
```

Wait, for the planet spin, I need delta time. The setAnimationLoop callback receives the time in ms. I can compute delta from previous time. Let me track previousTime.

Also for orbit, using elapsed * angularSpeed is fine and frame-rate independent.

For spin, I should use delta. Let me store previous time.

Let me also make sure the code compiles with --strict. I need to be careful about types.

Let me refine:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd00 })
);
scene.add(sun);

// Planet definitions
const planetDefs: Array<{
  orbitRadius: number;
  size: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}> = [
  { orbitRadius: 4, size: 0.4, color: 0x4488ff, orbitSpeed: 1.2, spinSpeed: 2.0 },
  { orbitRadius: 7, size: 0.6, color: 0x44cc44, orbitSpeed: 0.7, spinSpeed: 1.5 },
  { orbitRadius: 10, size: 0.5, color: 0xcc4444, orbitSpeed: 0.4, spinSpeed: 1.0 },
];

const planets: THREE.Mesh[] = [];

for (const def of planetDefs) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.size, 32, 32),
    new THREE.MeshStandardMaterial({ color: def.color })
  );
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonPivot = new THREE.Object3D();
planets[1].add(moonPivot);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
moon.position.set(1.2, 0, 0);
moonPivot.add(moon);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let prevTime = 0;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time * 0.001;
  const delta = elapsed - prevTime;
  prevTime = elapsed;

  for (let i = 0; i < planets.length; i++) {
    const def = planetDefs[i];
    const angle = def.orbitSpeed * elapsed;
    planets[i].position.x = def.orbitRadius * Math.cos(angle);
    planets[i].position.z = def.orbitRadius * Math.sin(angle);
    planets[i].rotation.y += def.spinSpeed * delta;
  }

  moonPivot.rotation.y = 2.0 * elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This looks good. Let me check for strict mode issues:
- `time` parameter in setAnimationLoop: it's typed as number in Three.js types, so that's fine.
- `prevTime` starts at 0, first delta will be elapsed (which is fine since the first frame delta doesn't matter much).
- Array access `planets[i]` and `planetDefs[i]` - in strict mode without noUncheckedIndexedAccess, this should be fine. The default tsconfig for strict doesn't include noUncheckedIndexedAccess. So this should compile fine.

Actually wait, I should double-check: does `strict` in tsconfig include `noUncheckedIndexedAccess`? No, it does not. `strict` enables: strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitAny, noImplicitThis, alwaysStrict, useUnknownInCatchVariables. So indexed access should be fine.

One thing: `renderer.setPixelRatio(window.devicePixelRatio)` - the type expects a number, and `window.devicePixelRatio` is `number`, so that's fine.

I think this is solid. Let me finalize.
