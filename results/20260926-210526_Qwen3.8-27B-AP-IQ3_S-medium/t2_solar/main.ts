import * as THREE from 'three';

// --- Scene / Camera / Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(16, 12, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.5, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Lighting ---
// PointLight: physically-based, intensity in candela, decay 2 (inverse-square)
const sunLight = new THREE.PointLight(0xffffff, 500, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// --- Planet definitions ---
interface PlanetConfig {
  radius: number;
  distance: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.5, distance: 4,  orbitSpeed: 1.2, spinSpeed: 2.0, color: 0x4488ff },
  { radius: 0.7, distance: 7,  orbitSpeed: 0.6, spinSpeed: 1.5, color: 0xff6633 },
  { radius: 0.6, distance: 10, orbitSpeed: 0.35, spinSpeed: 1.0, color: 0x88cc44 },
];

interface Planet {
  mesh: THREE.Mesh;
  config: PlanetConfig;
}

const planets: Planet[] = configs.map((cfg) => {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return { mesh, config: cfg };
});

// --- Moon (child of planet 2, index 1) ---
const moonRadius = 0.15;
const moonOrbitRadius = 1.5;
const moonOrbitSpeed = 3.0; // rad/s (local)

const moonGeo = new THREE.SphereGeometry(moonRadius, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.8,
  metalness: 0.1,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].mesh.add(moon);

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Orbit & spin planets
  for (const planet of planets) {
    const { distance, orbitSpeed, spinSpeed } = planet.config;
    const orbitAngle = orbitSpeed * elapsed;
    planet.mesh.position.set(
      distance * Math.cos(orbitAngle),
      0,
      distance * Math.sin(orbitAngle)
    );
    planet.mesh.rotation.y = spinSpeed * elapsed;
  }

  // Moon orbits planet 2 (local XZ plane)
  const moonAngle = moonOrbitSpeed * elapsed;
  moon.position.set(
    moonOrbitRadius * Math.cos(moonAngle),
    0,
    moonOrbitRadius * Math.sin(moonAngle)
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
