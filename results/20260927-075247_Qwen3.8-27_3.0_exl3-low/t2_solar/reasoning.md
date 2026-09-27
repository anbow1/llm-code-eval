Let me build a mini solar system with Three.js in TypeScript. Let me think through the requirements:

1. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin
2. 3 planets at distances ~4, 7, 10, orbiting at different speeds (inner faster)
3. Each planet spins on its own axis
4. Planet 2 has a moon (child of planet mesh)
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. Physically based light intensity/decay for PointLight

For physically based lighting in Three.js:
- PointLight uses physical intensity (candela) and decay (typically 2 for inverse square law)
- With `renderer.physicallyCorrectLights = true` (or in newer versions, `renderer.useLegacyLights = false`), the intensity is in candela
- Actually in newer Three.js versions (r155+), `useLegacyLights` is deprecated and physically correct lights are default
- For a PointLight with decay=2, intensity in candela... at distance 4, illuminance = intensity / (4^2) = intensity/16
- I'll use a reasonably high intensity value like 200-500 candela to make planets visible

Let me think about the structure:
- Sun: MeshBasicMaterial (emissive, doesn't need light)
- PointLight at origin with decay=2
- Planets: MeshStandardMaterial, positioned in XZ plane
- Orbit: rotate position using angle that increases with time
- Spin: rotate the planet mesh around its own axis (Y axis)
- Moon: child of planet 2, orbiting around planet 2

For the animation:
- Use delta time from the animation loop
- Each planet has an angular speed for orbit and spin
- Inner planets orbit faster

Let me code this up:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera - above and to the side
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
interface PlanetConfig {
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planetConfigs: PlanetConfig[] = [
  { distance: 4, radius: 0.3, color: 0x884422, orbitSpeed: 1.0, spinSpeed: 2.0, angle: 0 },
  { distance: 7, radius: 0.5, color: 0x4488cc, orbitSpeed: 0.6, spinSpeed: 1.5, angle: Math.PI * 0.7 },
  { distance: 10, radius: 0.4, color: 0xcc6644, orbitSpeed: 0.4, spinSpeed: 1.0, angle: Math.PI * 1.4 },
];

const planets: THREE.Mesh[] = [];
const planetData: { config: PlanetConfig; angle: number }[] = [];

for (const config of planetConfigs) {
  const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push(mesh);
  planetData.push({ config, angle: config.angle });
}

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
const moonOrbitRadius = 1.0;
moon.position.set(moonOrbitRadius, 0, 0);
planets[1].add(moon);

let moonAngle = 0;
const moonOrbitSpeed = 3.0;

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
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  
  // Update planets
  for (let i = 0; i < planetData.length; i++) {
    const { config, angle } = planetData[i];
    planetData[i].angle += config.orbitSpeed * delta;
    const a = planetData[i].angle;
    planets[i].position.set(
      Math.cos(a) * config.distance,
      0,
      Math.sin(a) * config.distance
    );
    planets[i].rotation.y += config.spinSpeed * delta;
  }
  
  // Moon orbit
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
```

Wait, I need to be careful with the PointLight. In modern Three.js (r155+), physically correct lighting is the default. The PointLight intensity is in candela. With decay=2 (inverse square), at distance d, the illuminance is intensity/d².

At distance 4: illuminance = 300/16 = 18.75
At distance 7: illuminance = 300/49 ≈ 6.1
At distance 10: illuminance = 300/100 = 3.0

These should be visible with MeshStandardMaterial. Let me keep intensity at 300.

Actually, let me reconsider. In Three.js r155+, `useLegacyLights` defaults to false, meaning physically correct lights are used. The PointLight constructor signature is `PointLight(color, intensity, distance, decay)`. With physically correct lights, intensity is in candela.

Let me set intensity to 500 to make sure planets are well-lit. At distance 4: 500/16 = 31.25, at distance 10: 500/100 = 5.0. That should work.

Actually, I'll go with 300. It should be fine.

Let me also make sure the code compiles with `tsc --strict`. I need to be careful about types.

One issue: `planetData[i].angle` - I'm modifying it through the object reference, which is fine.

Let me also add `document.body.style.margin = '0'` and `overflow: 'hidden'` to make the canvas fill the page.

Let me finalize the code.
