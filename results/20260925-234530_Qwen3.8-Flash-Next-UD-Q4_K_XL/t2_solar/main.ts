import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
// Enable physically-based lighting where supported
(renderer as Record<string, unknown>)['useLegacyLights'] = false;
document.body.appendChild(renderer.domElement);

// --- Lights ---
const pointLight = new THREE.PointLight(0xffffff, 250, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.3);
scene.add(ambientLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.2, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, 0);
scene.add(sun);

// --- Planet definitions ---
interface PlanetEntry {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number; // rad/s
  spinSpeed: number;    // rad/s
  angle: number;
}

const planetConfigs = [
  { distance: 4, radius: 0.4, color: 0x5599ff, angularSpeed: 1.4, spinSpeed: 3.0 },
  { distance: 7, radius: 0.65, color: 0xff7744, angularSpeed: 0.8, spinSpeed: 2.0 },
  { distance: 10, radius: 0.5, color: 0x55ee99, angularSpeed: 0.45, spinSpeed: 4.0 },
];

const planets: PlanetEntry[] = [];
let planet2Mesh: THREE.Mesh | null = null;

for (let i = 0; i < planetConfigs.length; i++) {
  const cfg = planetConfigs[i];
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cfg.distance, 0, 0);
  scene.add(mesh);

  const entry: PlanetEntry = {
    mesh,
    distance: cfg.distance,
    angularSpeed: cfg.angularSpeed,
    spinSpeed: cfg.spinSpeed,
    angle: (i * Math.PI * 2) / planetConfigs.length, // stagger starting positions
  };
  planets.push(entry);

  if (i === 1) {
    planet2Mesh = mesh;
  }
}

// --- Moon (child of Planet 2) ---
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
if (planet2Mesh) {
  planet2Mesh.add(moon);
}
let moonAngle = 0;
const moonOrbitSpeed = 3.5; // rad/s
const moonOrbitRadius = 1.2;

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Animation loop ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Orbit + spin each planet
  for (const p of planets) {
    p.angle += p.angularSpeed * delta;
    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbit around planet 2 (local coords since it's a child)
  moonAngle += moonOrbitSpeed * delta;
  moon.position.x = Math.cos(moonAngle) * moonOrbitRadius;
  moon.position.z = Math.sin(moonAngle) * moonOrbitRadius;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    (window as any).__ready = true;
    firstFrameDone = true;
  }
});
