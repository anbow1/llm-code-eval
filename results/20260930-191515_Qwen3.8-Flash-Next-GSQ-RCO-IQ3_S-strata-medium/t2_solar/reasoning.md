The user wants a mini solar system in Three.js as a single TypeScript file. Let me plan this carefully:

1. Sun: Sphere at origin with MeshBasicMaterial + PointLight at origin
2. 3 planets: MeshStandardMaterial at distances ~4, 7, 10, orbiting at different speeds (inner faster)
3. Each planet spins on its own axis
4. Planet 2 has a moon (child of planet mesh, orbiting around planet)
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. OrbitControls for interaction (or just fixed camera looking at origin)

Key considerations:
- PointLight physically based: In newer Three.js (r155+), PointLight uses physically correct lighting by default. Intensity should be set appropriately. With physically correct lighting, intensity is in candela. For a point light to light objects at distance 4-10, I need a reasonable intensity. Actually, let me think... with decay=2 (physical), the intensity falls off as 1/r². At distance 4, the irradiance would be intensity/(4²). So if I want reasonable illumination, I might need intensity around 100-500 or so. Let me use intensity around 100 with decay 2. Actually, let me use a moderate value like 50-100 to be safe. I'll try 100 with decay 2.

Wait, actually in Three.js r155+, `useLegacyLights` was removed and physically correct lighting is the default. PointLight intensity is in candela (cd), and the light contribution is `intensity / (distance^2)`. So for distance 10, that's 1/100. For the planets to be visible, I need intensity high enough. Let me use something like 200-500. I'll go with 200 and see. Actually, let me be generous and use 300 to ensure visibility.

Hmm, but the user said "mind physically based light intensity/decay" - so they want me to be aware of this. Let me set a reasonable intensity. With decay=2 (default in newer Three.js), intensity needs to be proportional to distance² to get uniform illumination. At the farthest planet (distance 10), intensity/distance² = intensity/100. For MeshStandardMaterial to show up well, we need irradiance around 1-5 or so. So intensity = 5 * 100 = 500. Let me use 300 to 500.

Actually, let me think more carefully. MeshStandardMaterial with roughness ~0.7, metalness ~0. The diffuse contribution is roughly `albedo * irradiance / PI`. For a visible result, irradiance should be around 1-3. So intensity at distance 10 should give irradiance ~1-3. irradiance = intensity / distance² = intensity / 100. So intensity = 100-300. Let me use 200.

Wait, I should also set decay to 2 explicitly to be safe across versions.

Let me structure the code:
- Renderer setup
- Scene, camera, lights
- Sun mesh + PointLight
- Planet groups (each in XZ plane)
- Planet 2 with moon as child
- OrbitControls (optional - user didn't ask for it, but "camera above and to the side, looking at the origin")
- Actually, user just says camera positioned to see whole system. No controls needed necessarily. But let me add OrbitControls for interactivity - wait, the rules say no external assets but addons are fine. Let me include OrbitControls for a nice experience.

Actually, the user didn't ask for controls. Let me just set up the camera looking at origin. I'll add OrbitControls anyway for a nicer experience since it's an addon import and allowed.

Let me write the code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera - above and to the side
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 15);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Lights
const ambientLight = new THREE.AmbientLight(0x111111, 0.3); // weak ambient
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2); // intensity 300, decay 2
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Planet data
const planets: { mesh: THREE.Mesh; speed: number; spinSpeed: number; angle: number }[] = [];

const planetConfigs = [
  { radius: 4, size: 0.5, color: 0x4488ff, speed: 1.2, spinSpeed: 2.0 },
  { radius: 7, size: 0.7, color: 0xff6644, speed: 0.6, spinSpeed: 1.5 },
  { radius: 10, size: 0.6, color: 0x44ff88, speed: 0.3, spinSpeed: 1.0 },
];

// Create planets
planetConfigs.forEach((cfg, i) => {
  const geo = new THREE.SphereGeometry(cfg.size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.7, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push({ mesh, speed: cfg.speed, spinSpeed: cfg.spinSpeed, angle: Math.random() * Math.PI * 2 });
});

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.1 });
const moon = new THREE.Mesh(moonGeo, moonMat);
const moonOrbitRadius = 1.2;
// We'll position moon in the animation loop relative to parent planet
planets[1].mesh.add(moon);

// Orbit rings (visual helper)
planetConfigs.forEach(cfg => {
  const ringGeo = new THREE.RingGeometry(cfg.radius - 0.02, cfg.radius + 0.02, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
});

// Animation
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Animate planets
  planets.forEach((p, i) => {
    p.angle += p.speed * delta;
    const cfg = planetConfigs[i];
    p.mesh.position.x = Math.cos(p.angle) * cfg.radius;
    p.mesh.position.z = Math.sin(p.angle) * cfg.radius;
    p.mesh.position.y = 0;
    
    // Spin on own axis
    p.mesh.rotation.y += p.spinSpeed * delta;
  });

  // Moon orbit - since moon is child of planet, we just rotate it in local space
  const moonAngle = elapsed * 3.0;
  moon.position.x = Math.cos(moonAngle) * moonOrbitRadius;
  moon.position.z = Math.sin(moonAngle) * moonOrbitRadius;
  moon.position.y = 0;

  controls.update();
  renderer.render(scene, camera);
  
  if (!(window as any).__ready) {
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about the PointLight constructor. In newer Three.js, the PointLight constructor signature is `PointLight(color, intensity, distance, decay)`. With distance=0, it means infinite range. With decay=2, it's physically correct. Let me verify: `new THREE.PointLight(0xffffff, 300, 0, 2)` - this should work.

Actually, in very recent Three.js versions, the `distance` parameter default is 0 (no limit) and `decay` defaults to 2. So `new THREE.PointLight(0xffffff, 300)` would be fine too. But let me be explicit.

Also, for the tone mapping, ACESFilmic might wash things out or make them too dark depending on intensity. Let me use a moderate intensity like 200 and tone mapping exposure of 1.5 or something. Actually, let me just use linear tone mapping or no tone mapping to keep it simple and predictable. Or I'll use ACES with exposure 1.0 and intensity 500.

Hmm, let me think about what works well. With ACESFilmic, the mapping compresses high values. An intensity of 300 at distance 4 gives 300/16 ≈ 18.75 irradiance. At distance 10, it gives 300/100 = 3. With standard material albedo ~0.5 and BRDF, the final color value might be around 2-3 for the inner planets and 0.3-0.5 for the outer. ACES would tone map these to look reasonable.

Actually, let me not use tone mapping to keep it simpler. Or I'll use it with moderate settings. Let me use `renderer.toneMapping = THREE.ACESFilmicToneMapping` and intensity of 400. That should look good.

Let me also make sure the moon orbit works correctly. Since the moon is added as a child of the planet mesh, its position is in the planet's local space. I set moon.position in the animation loop. But the planet also has its own rotation (spin). So the moon will orbit AND be affected by the planet's rotation. That's actually physically fine - the moon orbits in the planet's equatorial plane as it spins. But for a cleaner look, maybe I should put the moon in a separate group that's a child of the planet but counter-rotates? No, the user specifically said "planet.add(moon)" and it should orbit the planet. The spinning of the planet affecting the moon's local space is fine - it creates a natural-looking system.

Actually wait - if the planet rotates on its Y axis, and the moon orbits in XZ (local), then the moon will appear to orbit in the world XZ plane regardless of the planet's Y spin (since Y-axis rotation maps X to Z and Z to -X, but circular orbit in XZ remains circular in XZ). So it's fine actually. The moon orbit plane stays in the XZ plane.

Let me also add some stars in the background for aesthetics. No - the rules say no external assets. I could make procedural stars with small spheres or points. Let me skip it to keep it clean. Actually, I could add a few point-based stars using THREE.Points. That's not an external asset. But let me keep it simple and focused.

Let me finalize the code. I'll make it clean and well-structured.
