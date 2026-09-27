Let me build a complete TypeScript file for a mini solar system in Three.js.

Requirements:
1. Sun: sphere at origin with MeshBasicMaterial, PointLight at origin (physically based - use decay and intensity properly)
2. 3 planets at distances ~4, 7, 10 with different angular speeds (inner faster)
3. Every planet spins on its own axis
4. Planet 2 (the middle one at distance 7) has a moon as a child, orbiting the planet
5. Weak AmbientLight
6. Camera above and to the side, looking at origin, whole system visible
7. Y is up, orbits in XZ plane
8. MeshStandardMaterial for planets
9. Physically based light intensity/decay for PointLight

Let me think about the PointLight with physically based intensity. In Three.js, when using physically correct lights (renderer.useLegacyLights = false or the default in newer versions), PointLight intensity is in candela. The decay should be 2 for physically accurate inverse square falloff. Let me set `light.decay = 2` and use a reasonable intensity.

For the camera position: above and to the side. Let's say (12, 12, 12) looking at origin. That should show the whole system (max orbit radius is 10).

Let me structure the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Size
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera position - above and to the side
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight at origin - physically based
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
// With decay=2, intensity is in candela. 500 candela at distance 4 gives 500/16 ≈ 31 lux
// At distance 10: 500/100 = 5 lux
scene.add(pointLight);

// Ambient light - weak
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Planets
const planetData = [
  { radius: 0.5, distance: 4, orbitSpeed: 1.0, spinSpeed: 2.0, color: 0x4488ff },
  { radius: 0.8, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.5, color: 0x44aa44 },
  { radius: 0.6, distance: 10, orbitSpeed: 0.3, spinSpeed: 1.0, color: 0xcc6644 },
];

const planets: THREE.Mesh[] = [];
const orbitAngles: number[] = [0, 0, 0];
const spinAngles: number[] = [0, 0, 0];

for (let i = 0; i < 3; i++) {
  const geo = new THREE.SphereGeometry(planetData[i].radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ 
    color: planetData[i].color,
    roughness: 0.7,
    metalness: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.2, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.1 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

let moonAngle = 0;
const moonDistance = 2.0;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Update orbit angles
  for (let i = 0; i < 3; i++) {
    orbitAngles[i] += planetData[i].orbitSpeed * delta;
    spinAngles[i] += planetData[i].spinSpeed * delta;
    
    const x = Math.cos(orbitAngles[i]) * planetData[i].distance;
    const z = Math.sin(orbitAngles[i]) * planetData[i].distance;
    planets[i].position.set(x, 0, z);
    planets[i].rotation.y = spinAngles[i];
  }

  // Moon orbit (relative to planet 2)
  moonAngle += 3.0 * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonDistance,
    0,
    Math.sin(moonAngle) * moonDistance
  );

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful with `tsc --strict`. Let me check for potential issues:
- All variables are properly typed
- No implicit any
- The `planetData` array is properly typed
- `orbitAngles` and `spinAngles` are typed as `number[]`

Let me also think about the light intensity. With physically based rendering (which is default in newer Three.js), a PointLight with decay=2 means intensity/distance². At distance 4: intensity/16. At distance 10: intensity/100. So I need a high enough intensity to see the planets. Let's use 500 or 800.

Actually, in Three.js r155+, the default is physically correct lights. The `useLegacyLights` property was removed. So I should just set the intensity appropriately.

Let me also make sure the moon orbiting is in the XZ plane relative to the planet. Since the moon is a child of the planet mesh, its position is in local space. The planet is in the XZ plane, so the moon orbiting in local XZ should be fine.

Wait - the moon is added as a child of the planet mesh. The planet mesh's position is set in world space, and the moon's position is in the planet's local space. Since the planet's rotation.y changes (for spin), the moon's local XZ plane will rotate with the planet. That's actually fine - the moon will still orbit in a plane, just rotating with the planet. But actually, this means the moon's orbit plane will spin with the planet. Let me think...

Actually, since the moon is a child of the planet mesh, when the planet rotates (rotation.y), the moon's local frame rotates too. So if I set moon.position in local XZ, the moon will orbit in a plane that rotates with the planet's spin. That's not ideal for a realistic look, but the requirement just says "orbiting that planet" and it's added as a child. Let me keep it simple - the moon orbits in local XZ of the planet. The visual effect will be that the moon's orbit plane tilts/rotates as the planet spins, which is a bit odd but acceptable for a mini solar system.

Actually wait - let me reconsider. The planet's rotation.y is set each frame for spin. The moon is a child. If I update moon.position each frame in local space, the moon will indeed orbit in the planet's local XZ plane, which rotates with the planet. This means the moon's world-space orbit plane will wobble as the planet spins. 

A better approach might be to not have the spin affect the moon. But the requirement says "planet spins on its own axis" and "moon orbiting that planet" with `planet.add(moon)`. I think the simplest interpretation is fine - the moon is a child and orbits in local XZ. The spin is the planet's visual rotation. This is the standard approach for simple solar systems.

Let me finalize the code and make sure it compiles with strict mode.
