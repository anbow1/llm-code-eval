```ts
import * as THREE from 'three';

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 14, 17);
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- Lighting -------------------------------------------------------------
// With physically based decay (decay = 2), illuminance falls off as
// 1/distance², so the intensity must be high enough to keep the outermost
// planet (d = 10) meaningfully lit while not blowing out the inner one.
const sunLight: THREE.PointLight = new THREE.PointLight(0xfff2cc, 260, 0, 2);
scene.add(sunLight);

const ambient: THREE.AmbientLight = new THREE.AmbientLight(0x334455, 0.35);
scene.add(ambient);

// --- Sun (emissive — MeshBasicMaterial is unaffected by lights) -----------
const sun: THREE.Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffc044 })
);
scene.add(sun);

// Gentle glow via a small additive halo (no textures needed).
const halo: THREE.Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.9, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xffaa22,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
scene.add(halo);

// --- Planets --------------------------------------------------------------
interface Planet {
  mesh: THREE.Mesh;
  distance: number;
  orbitSpeed: number; // rad/s — inner planets orbit faster
  spinSpeed: number; // rad/s — axial spin
  angle: number;
}

const planetDefs = [
  { distance: 4, radius: 0.42, color: 0xb0653a, orbitSpeed: 1.05, spinSpeed: 1.4 },
  { distance: 7, radius: 0.58, color: 0x5f86b8, orbitSpeed: 0.62, spinSpeed: 1.9 },
  { distance: 10, radius: 0.72, color: 0xc9a25e, orbitSpeed: 0.4, spinSpeed: 1.1 },
];

const planets: Planet[] = planetDefs.map((def) => {
  const mesh: THREE.Mesh = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius, 32, 32),
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.65,
      metalness: 0.1,
    })
  );
  scene.add(mesh);
  return {
    mesh,
    distance: def.distance,
    orbitSpeed: def.orbitSpeed,
    spinSpeed: def.spinSpeed,
    angle: Math.random() * Math.PI * 2,
  };
});

// --- Moon: child of planet 2 --------------------------------------------
const moonPivot: THREE.Object3D = planets[1].mesh;
const moon: THREE.Mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 })
);
moonPivot.add(moon);
let moonAngle = 0;

// --- Starfield backdrop (plain points, no textures) ----------------------
const starCount = 800;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 180 + Math.random() * 120;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(
  new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true }))
);

// --- Resize --------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ------------------------------------------------------
let ready = false;
const clock: THREE.Clock = new THREE.Clock();
const moonOrbitRadius = 1.15;

renderer.setAnimationLoop(() => {
  const delta: number = Math.min(clock.getDelta(), 0.1);

  sun.rotation.y += 0.05 * delta;
  halo.rotation.y -= 0.02 * delta;

  for (const planet of planets) {
    planet.angle += planet.orbitSpeed * delta;
    planet.mesh.position.set(
      Math.cos(planet.angle) * planet.distance,
      0,
      Math.sin(planet.angle) * planet.distance
    );
    planet.mesh.rotation.y += planet.spinSpeed * delta;
  }

  // Moon orbits planet 2 (in its local frame, so it follows the planet).
  moonAngle += 3.2 * delta;
  moon.position.set(Math.cos(moonAngle) * moonOrbitRadius, 0, Math.sin(moonAngle) * moonOrbitRadius);
  moon.rotation.y += 2.0 * delta;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
    (window as any).__ready = true;
  }
});

// Expose from the start as well (ready flag signals first completed frame).
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```