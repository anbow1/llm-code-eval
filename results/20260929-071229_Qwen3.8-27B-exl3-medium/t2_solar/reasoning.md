Let me build a mini solar system in TypeScript with Three.js. Let me plan:

1. Sun: sphere at origin with MeshBasicMaterial (emissive look), PointLight at origin
2. 3 planets with MeshStandardMaterial at distances 4, 7, 10, orbiting at different speeds
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. Y is up, orbits in XZ plane

Key considerations:
- PointLight with physically based rendering: need to set decay to 2 (physical) and use appropriate intensity. In Three.js with physically correct lights, PointLight intensity is in candela. With decay=2, the light falls off as 1/distance². For distances of 4-10, I need a reasonably high intensity. Let me use intensity around 50-100 with decay 2.
- Actually, in newer Three.js, `renderer.useLegacyLights` is deprecated and lights are physically based by default. PointLight intensity is in candela, and with decay=2, at distance d, the illuminance is intensity/d². For a planet at distance 4, that's intensity/16. For distance 10, intensity/100. So I need intensity around 100-200 to make outer planets visible.

Let me use intensity = 200, decay = 2.

- Orbits in XZ plane: x = r * cos(θ), z = r * sin(θ), y = 0
- Angular speeds: inner faster. Planet 1 (r=4): speed 1.0, Planet 2 (r=7): speed 0.5, Planet 3 (r=10): speed 0.3
- Spin: each planet rotates around Y axis at different rates
- Moon: child of planet 2, orbits planet 2. Since it's a child, its position is relative to planet 2. I'll animate its local position.

Let me write the code:

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

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planetData = [
  { radius: 0.4, distance: 4, color: 0x4488ff, orbitSpeed: 1.0, spinSpeed: 2.0 },
  { radius: 0.6, distance: 7, color: 0xcc6644, orbitSpeed: 0.5, spinSpeed: 1.0 },
  { radius: 0.5, distance: 10, color: 0x88cc88, orbitSpeed: 0.3, spinSpeed: 1.5 },
];

const planets: THREE.Mesh[] = [];
const planetAngles: number[] = [0, Math.PI / 3, Math.PI * 2 / 3];

for (let i = 0; i < 3; i++) {
  const d = planetData[i];
  const geo = new THREE.SphereGeometry(d.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
planets[1].add(moon);

// Animation
let elapsed = 0;
let ready = false;
const clock = new THREE.Clock();

// Initial positions
for (let i = 0; i < 3; i++) {
  const d = planetData[i];
  planets[i].position.set(
    d.distance * Math.cos(planetAngles[i]),
    0,
    d.distance * Math.sin(planetAngles[i])
  );
}

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  // Orbit planets
  for (let i = 0; i < 3; i++) {
    const d = planetData[i];
    const angle = planetAngles[i] + elapsed * d.orbitSpeed;
    planets[i].position.set(
      d.distance * Math.cos(angle),
      0,
      d.distance * Math.sin(angle)
    );
    // Spin
    planets[i].rotation.y += d.spinSpeed * delta;
  }

  // Moon orbit around planet 2
  const moonAngle = elapsed * 3.0;
  moon.position.set(
    1.2 * Math.cos(moonAngle),
    0,
    1.2 * Math.sin(moonAngle)
  );

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

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are properly typed
- No implicit any
- The `for` loops are fine
- `planetData` is properly typed

Let me also make sure the ambient light intensity is appropriate. With physically based rendering, AmbientLight intensity of 0.3 should be weak enough.

Actually, let me reconsider the PointLight. In Three.js r155+, the default is physically correct lighting. The PointLight constructor is `PointLight(color, intensity, distance, decay)`. With decay=2 (physical), at distance 4, the effective intensity is 200/16 = 12.5, at distance 7 it's 200/49 ≈ 4, at distance 10 it's 200/100 = 2. That should be visible.

Let me finalize the code.
