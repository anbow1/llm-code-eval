Let me build a mini solar system in TypeScript with Three.js. Let me plan the structure:

1. Scene, camera, renderer setup
2. Sun: sphere with MeshBasicMaterial at origin, PointLight at origin
3. 3 planets at distances ~4, 7, 10 with MeshStandardMaterial
4. Each planet orbits at different angular speed (inner faster)
5. Each planet spins on its own axis
6. Planet 2 has a moon as a child
7. AmbientLight (weak)
8. Camera above and to the side, looking at origin
9. Resize handling
10. Animation loop with delta time
11. Expose __scene, __camera, __renderer, __ready

Let me think about the orbital mechanics:
- Planets orbit in XZ plane (Y is up)
- Position: x = distance * cos(angle), z = distance * sin(angle)
- Different angular speeds: inner faster
- Each planet spins (rotation around its own Y axis)

For the PointLight, I need to use physically based lighting. In Three.js, PointLight with physically correct lighting uses candela units. I'll set decay to 2 (physically correct) and use a reasonable intensity.

Actually, let me think about this more carefully. With `renderer.useLegacyLights = false` (which is the default in newer Three.js), the PointLight intensity is in candela. With decay=2, the light falls off as 1/distance². So at distance 4, the intensity would be intensity/16. I should use a fairly high intensity value.

Let me set the PointLight intensity to something like 200 or so to make it visible at distances 4-10.

Actually, in newer Three.js (r155+), `useLegacyLights` is deprecated and physically correct lighting is always on. Let me just use a high intensity value for the PointLight.

Let me structure the code:

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

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planetData = [
  { distance: 4, radius: 0.3, color: 0x3366cc, orbitSpeed: 1.0, spinSpeed: 2.0 },
  { distance: 7, radius: 0.5, color: 0xcc6633, orbitSpeed: 0.6, spinSpeed: 1.5 },
  { distance: 10, radius: 0.4, color: 0x996699, orbitSpeed: 0.4, spinSpeed: 1.0 },
];

const planets: THREE.Mesh[] = [];
const moon: THREE.Mesh; // will be defined for planet 2

// Create planets
for (let i = 0; i < planetData.length; i++) {
  const data = planetData[i];
  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1 });
  const planet = new THREE.Mesh(geometry, material);
  scene.add(planet);
  planets.push(planet);
}

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planets[1].add(moon);

// Initial positions
for (let i = 0; i < planets.length; i++) {
  const angle = Math.random() * Math.PI * 2;
  const d = planetData[i].distance;
  planets[i].position.set(d * Math.cos(angle), 0, d * Math.sin(angle));
}

// Moon initial position (relative to planet)
moon.position.set(1.2, 0, 0);

// Animation
let lastTime = 0;
let moonAngle = 0;

function animate(time: number) {
  const delta = lastTime === 0 ? 0.016 : (time - lastTime) / 1000;
  lastTime = time;
  
  // Orbit planets
  for (let i = 0; i < planets.length; i++) {
    const data = planetData[i];
    const angle = planets[i].position.x / data.distance; // Hmm, this won't work well
    // Better: track angles
  }
}
```

Wait, I need to track the orbital angles properly. Let me use a different approach - store the angles and update them each frame.

Let me restructure:

```typescript
const orbitAngles: number[] = [0, 1, 2]; // initial angles spread out
const spinAngles: number[] = [0, 0, 0];
let moonAngle = 0;
```

Actually, let me just track angles as state variables and update positions based on them.

Let me also think about the moon orbit. The moon is a child of planet 2, so its position is relative to the planet. I'll orbit it in the XZ plane relative to the planet.

Let me also make sure the camera can see the whole system. The outermost planet is at distance 10, so the camera should be at least at distance ~15-20 from origin, elevated.

Let me write the complete file now.

For the PointLight intensity with physically based rendering:
- At distance 4: intensity/16
- At distance 7: intensity/49
- At distance 10: intensity/100

If I set intensity to 500:
- At 4: 500/16 ≈ 31
- At 7: 500/49 ≈ 10
- At 10: 500/100 = 5

That should work. Let me use 500.

Actually, I should double-check. In Three.js with physically correct lights, PointLight intensity is in candela. The irradiance at distance d is I/d². So with intensity 500 and decay 2:
- At d=4: 500/16 = 31.25
- At d=7: 500/49 ≈ 10.2
- At d=10: 500/100 = 5

These seem reasonable for a visible effect on standard materials.

Let me finalize the code.
