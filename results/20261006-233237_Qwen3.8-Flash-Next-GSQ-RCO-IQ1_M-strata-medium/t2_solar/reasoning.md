The user wants a mini solar system simulation using Three.js in TypeScript. Let me break down the requirements:

1. Sun: sphere at origin with MeshBasicMaterial (emissive, doesn't need light)
2. PointLight at origin to light the planets (need to set intensity and decay properly for physically based rendering)
3. 3 planets with MeshStandardMaterial at distances 4, 7, 10
4. Different angular speeds (inner faster)
5. Every planet spins on its own axis
6. Planet 2 has a moon (child of planet mesh, orbits that planet)
7. Weak AmbientLight
8. Camera above and to the side, looking at origin
9. Y is up, orbits in XZ plane
10. Handle resize, use setAnimationLoop, delta time
11. Expose __scene, __camera, __renderer, __ready

Let me think about the physically based lighting:
- PointLight with physically correct mode needs high intensity (like 1000+) and decay of 2.
- renderer should have physicallyCorrectLights: true (or useLegacyLights: false in newer versions)
- Actually in newer Three.js, physicallyCorrectLights is deprecated in favor of renderer.useLegacyLights = false (which is default now). Let me use high intensity values.

For the PointLight:
- intensity: around 2000, decay: 2 (physically correct)
- distance: 0 (infinite) or maybe 50

For MeshBasicMaterial on sun - it's unaffected by lights, just shows its color.

Camera position: above and to the side, looking at origin. Something like (15, 10, 15) looking at (0,0,0).

Let me write the complete TypeScript file.

For strict TypeScript:
- Need to declare types properly
- No unused variables
- Proper imports

Let me structure the code:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
// ... etc
```

Wait, the import syntax: `import * as THREE from 'three'` - this is the Three.js module import. Let me make sure this compiles with tsc --strict. The `import * as THREE from 'three'` syntax works if there's a `three` module package. In a browser with importmap or ES modules, this should work.

Actually, for tsc --strict to compile, I need to make sure the types are correct. The `three` package should have type definitions. Let me write proper typed code.

Let me think about the structure:

1. Create renderer, scene, camera
2. Create sun (MeshBasicMaterial + PointLight)
3. Create 3 planets (MeshStandardMaterial, orbital groups)
4. Moon as child of planet 2
5. AmbientLight
6. Animation loop with delta time
7. Resize handler
8. Expose globals

For the orbiting, I'll use a group that rotates around Y axis, with the planet offset from center. Or I can compute positions mathematically. Using groups is cleaner for the moon child.

Let me use groups:
- orbitGroup for each planet: rotate around Y
- planet mesh positioned at (distance, 0, 0) within orbitGroup
- planet spins around its own Y axis
- moon as child of planet mesh, orbiting within the planet's local space

For delta time, I'll use a clock or track time in the animation loop.

Let me write the code carefully for strict TypeScript:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.canvas);
```

Wait, `renderer.canvas` - does that exist? Actually `renderer.domElement` is the canvas element. Let me use `renderer.domElement`.

Actually, looking at Three.js API: `renderer.domElement` is the canvas. There's no `renderer.canvas`. Let me use `renderer.domElement`.

For the PointLight physically correct:
- In modern Three.js (r150+), physicallyCorrectLights is gone. `useLegacyLights` defaults to false.
- PointLight intensity should be high. Let's use intensity around 500-2000 with decay 2.

Actually, let me check: with decay=2, the light falloff is 1/r². At distance 4, intensity/16 = effective. At distance 10, intensity/100. So for the farthest planet at distance 10 to be reasonably lit, I need intensity > 1000 or so. Let me use 3000.

For the animation, I'll use `renderer.setAnimationLoop`. Inside the callback, I can use `performance.now()` or a clock to get delta.

Let me use `renderer.getDeltaTime()` - actually that's not a method. Let me use a clock approach.

Actually in Three.js, `setAnimationLoop(callback)` calls the callback each frame. I can track time myself:

```ts
let prevTime = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = (now - prevTime) / 1000;
  prevTime = now;
  // animate
  renderer.render(scene, camera);
});
```

For resize:
```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
```

Now let me structure the planets:

Planet 1: distance 4, speed 1.5 rad/s
Planet 2: distance 7, speed 0.8 rad/s  
Planet 3: distance 10, speed 0.4 rad/s

Moon orbits planet 2 at distance 1.5, speed 3 rad/s

Self-rotation speed for planets: maybe 0.5 rad/s each, different.

Let me write the full code now, making sure it's strict TypeScript compliant.

For strict TypeScript, I need to be careful with:
- No `any` unless necessary
- Proper variable types (inferred is fine)
- No unused imports
- Proper optional chaining where needed

Let me also make sure `document.body.appendChild` works - in a browser context with proper typing, it should be fine.

Actually, for `tsc --strict`, the `window` type... In a browser context with DOM types, `window.innerWidth` is `number`. Should be fine with DOM typings.

Let me also handle: `(window as any).__scene = scene;` - the user specified this exact syntax.

Let me finalize the code:

```ts
import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000018);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 3000, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Planets ---
interface PlanetData {
  distance: number;
  orbitSpeed: number;
  selfSpeed: number;
  radius: number;
  color: number;
}

const planetConfigs: PlanetData[] = [
  { distance: 4, orbitSpeed: 1.5, selfSpeed: 2.0, radius: 0.4, color: 0x44aa88 },
  { distance: 7, orbitSpeed: 0.8, selfSpeed: 1.5, radius: 0.6, color: 0xcc4444 },
  { distance: 10, orbitSpeed: 0.4, selfSpeed: 1.0, radius: 0.5, color: 0x4444cc },
];

interface PlanetRefs {
  group: THREE.Group;
  mesh: THREE.Mesh;
}

const planets: PlanetRefs[] = [];

for (const cfg of planetConfigs) {
  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.6, metalness: 0.3 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = cfg.distance;
  group.add(mesh);
  planets.push({ group, mesh });
}

// --- Moon (child of planet index 1, i.e. the second planet) ---
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.x = 1.2; // orbit radius around planet
const moonOrbitGroup = new THREE.Group();
moonOrbitGroup.add(moon);
// Need to add moonOrbitGroup as child of planet 2's mesh
planets[1].mesh.add(moonOrbitGroup);

// --- Animation ---
let prevTime = performance.now();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = (now - prevTime) / 1000;
  prevTime = now;

  // Orbit each planet
  for (let i = 0; i < planets.length; i++) {
    const cfg = planetConfigs[i];
    planets[i].group.rotation.y += cfg.orbitSpeed * delta;
    planets[i].mesh.rotation.y += cfg.selfSpeed * delta;
  }

  // Moon orbits around its parent planet
  moonOrbitGroup.rotation.y += 3.0 * delta;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I have a typo: `cfg.orbitSpeed` should be `cfg.orbitSpeed` → `cfg.orbitSpeed` → actually it should be `cfg.orbitSpeed`... no, it's `cfg.orbitSpeed` - wait let me re-read. The property is `orbitSpeed` not `orbitSpeed`. Let me fix that.

Also, for strict TypeScript, the `for...of` with array destructuring should work fine.

One issue: `new THREE.Group()` - is that valid? Yes, `new THREE.Group()` creates a Group. Actually, let me double check: in Three.js, `new THREE.Group()` is the constructor. Yes.

Another consideration: the PointLight with `distance: 0` means infinite range in Three.js. With decay 2 and intensity 3000, at distance 10 the illumination is 3000/100 = 30, which should be fine. At distance 4, it's 3000/16 ≈ 187.5. That might be too bright for the inner planets. Let me reduce to maybe 1000. At distance 4: 1000/16 = 62.5. At distance 10: 1000/100 = 10. Still quite bright. 

Actually in Three.js physically correct mode, the formula is `intensity / (distance^decay)` roughly. With decay=2: at r=4, attenuation = 1/16 = 0.0625. So effective light = 3000 * 0.0625 = 187.5. At r=10, attenuation = 1/100 = 0.01, effective = 30. These are in "lux" units basically. MeshStandardMaterial uses PBR which normalizes to some degree. Let me try 1500. At r=4: 1500/16 ≈ 94. At r=10: 1500/100 = 15. Should be visible. The ambient at 0.5 intensity with color 0x222222 adds a small amount.

Actually let me just pick reasonable values. Let me use intensity 2000, decay 2. It should be fine visually. The user can see the lit side vs dark side.

Let me also double-check: `renderer.setPixelRatio(window.devicePixelRatio)` - this is fine.

For the strict TypeScript compilation: the `for (const cfg of planetConfigs)` should work. The interface types should be fine. Let me make sure I don't have any `undefined` issues.

Actually, `planets[i]` indexing - TypeScript with `--strict` and `--strictNullChecks` won't complain about array indexing unless using `noUncheckedIndexedAccess` flag. The prompt says `--strict` which includes strictNullChecks but NOT noUncheckedIndexedAccess. So `planets[i].group` should be fine.

Wait, actually `--strict` does NOT include `--strictNullChecks`... Let me check. From TypeScript docs: `--strict` enables: `--strictNullChecks`, `--strictFunctionTypes`, `--strictBindCallApply`, `--strictMethodConstraint`, `--strictObjectLiteral`, `--strictAssertion`. So strictNullChecks IS included. But `--strict` does NOT include `--strictNullChecks`... wait, let me re-check.

Actually from the TypeScript handbook: "The --strict flag enables all of the following flags when set to true: --strictNullChecks, --strictFunctionTypes, --strictBindCallApply, --strictMethodConstraint, --strictObjectLiteral, --strictAssertion" - no wait, that's wrong. Let me just check:

From TS docs: `--strict` enables: strictNullChecks, strictFunctionTypes, strictBindCallApply, strictMethodConstraint, strictObjectLiteral... Actually I think it enables strictNullChecks but not noUncheckedIndexedAccess. So `planets[i]` should be fine without null check issues.

Let me also make sure the `window.addEventListener('resize', ...)` callback type is correct. In DOM typings, the callback is `() => void` or `(Event) => void`? It should be `() => void` which is fine.

One more thing: I should make sure the code doesn't have issues with `performance.now()` returning a `number`. That should be fine.

Let me also think about: `renderer.domElement` - is that the right property? Yes, in Three.js `renderer.domElement` returns the `<canvas>` element.

I think my code is correct. Let me finalize and make sure there are no typos.
