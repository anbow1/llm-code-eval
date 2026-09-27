The user wants a mini solar system in Three.js with:
1. Sun: sphere at origin with MeshBasicMaterial, PointLight at origin
2. 3 planets: spheres with MeshStandardMaterial at distances ~4, 7, 10, orbiting at different angular speeds
3. Each planet spins on its own axis
4. Planet 2 has a moon (child of planet mesh)
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. WebGLRenderer, append canvas to document.body
8. Handle resize
9. Use setAnimationLoop with delta time
10. Expose __scene, __camera, __renderer, __ready
11. No external assets
12. TypeScript strict mode compatible

Let me think about the structure:

- Sun: SphereGeometry, MeshBasicMaterial (emissive yellow), PointLight at origin
- Planets: SphereGeometry, MeshStandardMaterial, positioned at distances 4, 7, 10 in XZ plane
- Orbits: angular speeds - inner faster, e.g., 1.0, 0.5, 0.3 rad/s
- Spin: each planet rotates around its own axis (Y axis)
- Moon: small sphere, child of planet 2 mesh, orbits planet 2
- AmbientLight: weak, like 0.1 intensity
- Camera: positioned above and to the side, e.g., (15, 10, 15) looking at origin

For the orbit: planets are in XZ plane. So position = (r*cos(θ), 0, r*sin(θ)).

For spin: rotate around Y axis.

For the moon: it's a child of planet 2's mesh. But wait - if it's a child of the mesh, and the mesh rotates (spins), the moon would rotate with it. I need to think about this. The moon orbits the planet, so I should have the moon orbit around the planet. If the moon is a child of the planet mesh, and the planet mesh spins, the moon's local position would rotate with the planet. 

Actually, let me reconsider. The requirement says "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So the moon is a child of the planet mesh. The moon orbits the planet - I'll update the moon's local position each frame to orbit around the planet's center. Since the planet mesh spins, the moon's local coordinates will also rotate with the planet. That's fine - the moon orbits in the planet's local space.

Wait, but if the planet spins on its Y axis, and the moon is in the XZ plane locally, the moon will orbit in the planet's local XZ plane, which rotates with the planet. That should look fine visually.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2); // physically based: intensity in candela, decay=2
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x222222, 0.1);
scene.add(ambientLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planetData = [
  { radius: 0.5, distance: 4, angularSpeed: 1.0, spinSpeed: 0.5, color: 0x4488ff },
  { radius: 0.4, distance: 7, angularSpeed: 0.5, spinSpeed: 0.3, color: 0xff8844 },
  { radius: 0.6, distance: 10, angularSpeed: 0.3, spinSpeed: 0.2, color: 0x44ff88 },
];

const planets: THREE.Mesh[] = [];
const planetAngles = [0, 0, 0];

for (const data of planetData) {
  const geo = new THREE.SphereGeometry(data.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

let moonAngle = 0;
const moonDistance = 1.2;
const moonAngularSpeed = 2.0;

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop((time) => {
  const delta = clock.getDelta();
  
  // Orbit planets
  for (let i = 0; i < planets.length; i++) {
    planetAngles[i] += planetData[i].angularSpeed * delta;
    const r = planetData[i].distance;
    planets[i].position.set(r * Math.cos(planetAngles[i]), 0, r * Math.sin(planetAngles[i]));
    planets[i].rotation.y += planetData[i].spinSpeed * delta;
  }
  
  // Moon orbit
  moonAngle += moonAngularSpeed * delta;
  moon.position.set(moonDistance * Math.cos(moonAngle), 0, moonDistance * Math.sin(moonAngle));
  
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

Wait, I need to be careful with TypeScript strict mode. Let me check:
- `clock.getDelta()` returns a number, fine
- All variables are properly typed
- The `planetData` array - I should type it properly

Let me also make sure the PointLight intensity is physically based. In Three.js, when `renderer.useLegacyLights = false` (which is the default in newer versions), PointLight intensity is in candela and decay is 2 (inverse square). Actually, in newer Three.js versions (r155+), `useLegacyLights` defaults to false. Let me use a reasonable intensity. With decay=2, an intensity of 200 candela should light objects at distance 4-10 well.

Actually, let me check: in Three.js r155+, physically correct lights are default. PointLight with intensity in candela. At distance 4, the illuminance would be 200/16 = 12.5 lux. That might be dim. Let me use a higher intensity, like 500 or 1000.

Actually, for a scene this small, let me use intensity around 500 with decay 2. At distance 4: 500/16 ≈ 31. At distance 10: 500/100 = 5. That should work well enough.

Let me also make sure I'm not using any deprecated APIs. The `PointLight` constructor is `new THREE.PointLight(color, intensity, distance, decay)`.

Let me finalize the code and make sure it's strict-mode compatible.
