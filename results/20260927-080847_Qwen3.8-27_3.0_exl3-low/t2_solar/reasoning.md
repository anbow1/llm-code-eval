Let me build a mini solar system with Three.js in TypeScript. Let me think through the requirements:

1. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin (physically based - use decay=2, appropriate intensity)
2. 3 planets at distances ~4, 7, 10, orbiting at different speeds (inner faster)
3. Planets spin on their own axis
4. Planet 2 has a moon (child of planet mesh)
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. Y is up, orbits in XZ plane

For physically based lighting with PointLight:
- In Three.js, when using physically correct lighting (which is default in newer versions), PointLight intensity is in candela (cd) and decay=2 is the default.
- With decay=2, the light falls off as 1/distance². So for a planet at distance 4, the intensity received would be intensity/16. For distance 7, intensity/49. For distance 10, intensity/100.
- I need to set the PointLight intensity high enough that planets are visible. Let's use something like 200-500 candela.

Let me think about the structure:
- Sun mesh at origin
- PointLight at origin
- AmbientLight (weak)
- For each planet, I'll use a "pivot" group or just compute positions manually
- Actually, the simplest approach: use a Group for each planet's orbit, rotate the group, and the planet is a child at the orbital distance.
- Wait, but the requirement says "planet.add(moon)" for the moon. So the moon is a child of the planet mesh.
- For orbiting: I can either use a pivot group or manually compute positions with sin/cos.

Let me use the pivot group approach:
- Create a Group at origin for each planet's orbit
- Add the planet mesh as a child of the group at position (distance, 0, 0)
- Rotate the group around Y axis for orbit
- The planet spins on its own axis (rotate the planet mesh itself)

For the moon:
- Moon is a child of planet 2's mesh
- It orbits planet 2 - I can make it a child of the planet mesh and rotate the planet mesh... wait, that would make the moon orbit with the planet's spin. 
- Actually, the requirement says "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."
- So the moon is a child of the planet. To make it orbit, I can rotate the planet mesh, but that would also spin the moon with the planet. 
- Better approach: the moon is a child of the planet, positioned at some offset. Then I rotate the planet mesh for spin, and the moon orbits because... hmm.
- Actually, if the moon is a child of the planet mesh, and I rotate the planet mesh for spin, the moon will orbit the planet as the planet spins. That's a valid interpretation. But it might look odd if the spin is fast.
- Alternative: I can put the moon in a separate orbit group that's a child of the planet. But the requirement specifically says "planet.add(moon)".
- Let me just make the moon a child of the planet, offset in X, and the planet's spin will cause the moon to orbit. I'll make the spin speed reasonable so it looks like an orbit.

Actually, re-reading: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

The key constraint is that it must be added with planet.add(moon). The orbiting can be achieved by rotating the planet (which makes the moon go around) or by moving the moon's local position. Let me just rotate the planet mesh for spin, and the moon being a child will orbit as a result. That's the simplest interpretation.

Wait, but if the planet spins, the moon will orbit at the same rate as the spin. That's fine for a demo.

Let me code this up:

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

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight (physically based)
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// AmbientLight
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  orbitGroup: THREE.Group;
  orbitSpeed: number;
  spinSpeed: number;
  distance: number;
}

const planets: PlanetData[] = [];

const planetConfigs = [
  { distance: 4, radius: 0.4, color: 0x3498db, orbitSpeed: 0.8, spinSpeed: 1.5 },
  { distance: 7, radius: 0.6, color: 0xe74c3c, orbitSpeed: 0.5, spinSpeed: 1.0 },
  { distance: 10, radius: 0.5, color: 0x2ecc71, orbitSpeed: 0.3, spinSpeed: 0.8 },
];

planetConfigs.forEach((config, index) => {
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  
  const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(config.distance, 0, 0);
  orbitGroup.add(mesh);
  
  planets.push({
    mesh,
    orbitGroup,
    orbitSpeed: config.orbitSpeed,
    spinSpeed: config.spinSpeed,
    distance: config.distance,
  });
});

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(1.2, 0, 0);
planets[1].mesh.add(moon);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  
  planets.forEach((p) => {
    p.orbitGroup.rotation.y += p.orbitSpeed * delta;
    p.mesh.rotation.y += p.spinSpeed * delta;
  });
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, let me reconsider the PointLight intensity. With physically correct lighting in Three.js (r155+), the intensity is in candela. With decay=2, at distance d, the illuminance is intensity/d². 

For a planet at distance 4: illuminance = 500/16 = 31.25
For a planet at distance 7: illuminance = 500/49 ≈ 10.2
For a planet at distance 10: illuminance = 500/100 = 5

These should be visible with MeshStandardMaterial. Let me keep 500.

Actually, I should also consider that in newer Three.js versions (r155+), `useLegacyLights` is false by default, meaning physically correct lighting is on. The PointLight intensity in that mode is in candela. 500 candela should work fine.

Let me also make sure the camera can see the whole system. The outermost planet is at distance 10. Camera at (15, 12, 15) looking at origin should work. The distance from camera to origin is sqrt(15² + 12² + 15²) = sqrt(225+144+225) = sqrt(594) ≈ 24.4. With a 60° FOV, the vertical extent visible at distance 24.4 is 2 * 24.4 * tan(30°) ≈ 2 * 24.4 * 0.577 ≈ 28. That should be enough to see planets at distance 10.

Let me finalize the code. I think it's solid. Let me also add a slight tilt to some planets for visual interest (but the requirement doesn't ask for it, so I'll keep it simple).

One more thing - I should make sure the moon orbits. Since the moon is a child of the planet mesh, and the planet mesh rotates (spin), the moon will orbit around the planet. The spin speed of planet 2 is 1.0 rad/s, so the moon will orbit once per ~6.28 seconds. That seems reasonable.

Let me finalize.
