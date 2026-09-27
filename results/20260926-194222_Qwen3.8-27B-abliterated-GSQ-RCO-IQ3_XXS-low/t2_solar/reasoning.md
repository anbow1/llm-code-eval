Let me think through this carefully.

Requirements:
1. Sun: sphere at origin with MeshBasicMaterial, PointLight at origin
2. 3 planets: spheres with MeshStandardMaterial at distances ~4, 7, 10
3. Planets orbit sun at different angular speeds (inner faster)
4. Planets spin on their own axis
5. Planet 2 has a moon (child of planet mesh, orbiting planet)
6. Weak AmbientLight
7. Camera above and to the side, looking at origin
8. All orbits in XZ plane
9. Y is up

For physically based lighting with PointLight:
- In Three.js with `renderer.useLegacyLights = false` (or by default in newer versions), PointLight intensity is in candela (for physical units).
- Actually, let me think about this. In Three.js r155+, the default is `useLegacyLights = false`. PointLight intensity is in candela, and decay defaults to 2 (physically correct).
- With decay=2, intensity needs to be higher because the falloff is inverse-square. For a scene of size ~10 units, I should use an intensity that's reasonable. With decay=2, at distance d, the light is `intensity / d^2`. So at d=4, that's `intensity/16`. At d=10, that's `intensity/100`.
- Let me use something like intensity = 200 or so. Actually, let me think... For MeshStandardMaterial to look good, we need enough light. Let's say intensity = 300, decay = 2. At distance 4: 300/16 ≈ 18.75. At distance 10: 300/100 = 3. That should be visible.

Actually, let me reconsider. In newer Three.js versions (r155+), `useLegacyLights` defaults to `false`. The PointLight with `decay = 2` (default) and physically based intensity means:
- irradiance = intensity / (4 * pi * distance^2) ... actually no, it's just intensity / distance^2 for the falloff.

Let me just use a high enough intensity. I'll go with intensity = 500, decay = 2. That gives:
- At d=4: 500/16 ≈ 31
- At d=7: 500/49 ≈ 10
- At d=10: 500/100 = 5

That should work well for MeshStandardMaterial.

For the orbit: planets are positioned on the XZ plane. So position = (r * cos(angle), 0, r * sin(angle)).

For spinning: rotate the mesh around Y axis (since Y is up).

For the moon: add as child of planet mesh. But wait - if the moon is a child of the planet mesh, and the planet mesh rotates (spins), then the moon's orbit would be affected by the parent's rotation. That's a problem.

Solution: I should not rotate the planet mesh directly. Instead, I should:
- Have a group for the planet that handles position (orbit)
- The planet mesh is a child of the group and handles spinning
- The moon is... hmm, if moon is a child of the planet mesh, it will spin with the planet.

Actually, the requirement says "a small sphere added as a child of the planet mesh (planet.add(moon))". So it must be a child of the planet mesh. To handle the spin issue, I can:
1. Spin the planet mesh (rotate around Y)
2. The moon orbits relative to the planet mesh's local space
3. To counteract the parent's spin, I can rotate the moon in the opposite direction, OR
4. Better approach: use a group for the planet. But the requirement says "planet.add(moon)" specifically.

Let me re-read: "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

So the moon must be a direct child of the planet mesh. The planet spins, so the moon's local orbit will appear to spin with the planet. One approach:
- Spin the planet mesh around Y
- For the moon, set its position in the planet's local space to orbit, but counteract the parent rotation

Actually, a cleaner approach: Don't spin the planet mesh directly. Instead, create a group for each planet:
- Orbit group (handles orbital position) → child: planet mesh (handles spin) + moon (handles moon orbit)

But the requirement says "planet.add(moon)". Let me just do it that way and counteract the spin for the moon.

Actually, let me re-think. If I spin the planet mesh (rotate its Y), and the moon is a child at some position that also rotates (orbiting), then in world space the moon's orbit will be the combination of the planet's spin and the moon's local orbit. That's actually fine visually - it just means the moon's orbit precesses, which is realistic.

But for simplicity and correctness, let me do:
- Planet is a Mesh
- Moon is added as child of planet mesh
- Planet spins: I rotate planet.rotation.y
- Moon orbits: I set moon's position in local space each frame, but I need to account for the parent's rotation.

Actually, the simplest correct approach: 
- Create a planet group (THREE.Group) for orbital positioning
- The planet mesh is a child of this group
- The moon is a child of the planet mesh (as required)
- Spin the planet mesh
- For the moon, since it's a child of the spinning planet, I need to counteract. In local space, if the planet has rotated by angle θ around Y, then to make the moon orbit at angle φ in world space, I set the moon's local angle to φ - θ (or something like that).

Hmm, actually let me just do it more simply:
- The planet mesh rotates (spins)
- The moon, as a child, has its position set each frame
- The moon's local position: (r_moon * cos(moonAngle), 0, r_moon * sin(moonAngle))
- Since the parent is spinning, the effective world-space orbit of the moon will be moonAngle + planetSpinAngle, which is fine and actually looks good (precessing orbit)

This is actually fine! The moon will orbit the planet, and because the planet is spinning, the moon's orbit will appear to precess. That's realistic. I'll just go with it.

Let me code this up:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x333333, 0.3);
scene.add(ambientLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
interface PlanetConfig {
  radius: number;
  distance: number;
  angularSpeed: number;
  spinSpeed: number;
  color: number;
}

const planetConfigs: PlanetConfig[] = [
  { radius: 0.3, distance: 4, angularSpeed: 1.0, spinSpeed: 2.0, color: 0x4488ff },
  { radius: 0.5, distance: 7, angularSpeed: 0.6, spinSpeed: 1.5, color: 0xff8844 },
  { radius: 0.4, distance: 10, angularSpeed: 0.4, spinSpeed: 1.0, color: 0x88cc88 },
];

const planets: THREE.Mesh[] = [];
const planetAngles: number[] = [0, Math.PI * 0.5, Math.PI];

planetConfigs.forEach((config, i) => {
  const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push(mesh);
});

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planets[1].add(moon);

let moonAngle = 0;
const moonOrbitRadius = 1.0;
const moonAngularSpeed = 3.0;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

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
  const elapsed = clock.elapsedTime;

  // Update planet positions and spins
  planets.forEach((planet, i) => {
    const config = planetConfigs[i];
    planetAngles[i] += config.angularSpeed * delta;
    planet.position.x = config.distance * Math.cos(planetAngles[i]);
    planet.position.z = config.distance * Math.sin(planetAngles[i]);
    planet.rotation.y += config.spinSpeed * delta;
  });

  // Update moon orbit
  moonAngle += moonAngularSpeed * delta;
  moon.position.x = moonOrbitRadius * Math.cos(moonAngle);
  moon.position.z = moonOrbitRadius * Math.sin(moonAngle);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, let me double-check the physically based light. In Three.js r155+, `useLegacyLights` is `false` by default. With `decay = 2` (which is the default for PointLight), the attenuation is `1/distance^2`. The intensity is in candela.

For a scene where the furthest planet is at distance 10:
- irradiance at d=10: intensity / 100
- For this to be visible with MeshStandardMaterial, I want it to be at least ~1-2.
- So intensity should be at least 100-200.
- Let me use 500. At d=4: 500/16 ≈ 31 (bright), at d=7: 500/49 ≈ 10 (good), at d=10: 500/100 = 5 (still visible).

That seems reasonable. Let me go with 500.

For ambient light, I'll use a low intensity like 0.2 to keep dark sides from being pure black.

Let me also make sure the camera is positioned well to see the whole system. The furthest planet is at distance 10, so the system extends about 10 units in each direction. Camera at (15, 12, 15) looking at origin should give a good view. Let me check: distance from camera to origin = sqrt(15² + 12² + 15²) = sqrt(225+144+225) = sqrt(594) ≈ 24.4. With FOV 60°, the visible width at that distance is about 2 * 24.4 * tan(30°) ≈ 28. The system diameter is 20, so it should fit.

Actually, let me reconsider the PointLight intensity. In Three.js with physically based lighting:
- PointLight intensity is in candela (cd)
- The actual irradiance at a surface depends on the angle and distance
- For a rough visual, intensity of 500 should work

Let me also make sure I'm not using any deprecated APIs. `renderer.useLegacyLights` is deprecated in newer versions, but since we're just using defaults, we're fine.

One more thing: the `PointLight` constructor signature is `PointLight(color, intensity, distance, decay)`. With `distance = 0` means infinite range (no cutoff). `decay = 2` is physically correct. So `new THREE.PointLight(0xffffff, 500, 0, 2)` is correct.

Let me finalize the code.
