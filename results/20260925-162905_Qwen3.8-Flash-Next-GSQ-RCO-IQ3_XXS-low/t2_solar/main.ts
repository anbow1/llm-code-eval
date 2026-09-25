import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Lights ---
const sunLight = new THREE.PointLight(0xffffff, 3000, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.25);
scene.add(ambientLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Planets ---
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s around Y axis
}

const planets: PlanetData[] = [];

const planetConfigs: { radius: number; distance: number; color: number; orbitSpeed: number; spinSpeed: number }[] = [
  { radius: 0.5, distance: 4, color: 0x4488ff, orbitSpeed: 1.0, spinSpeed: 2.5 },
  { radius: 0.8, distance: 7, color: 0xff6644, orbitSpeed: 0.55, spinSpeed: 1.8 },
  { radius: 0.6, distance: 10, color: 0x44dd88, orbitSpeed: 0.32, spinSpeed: 2.0 },
];

for (const cfg of planetConfigs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 24, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push({
    mesh,
    orbitRadius: cfg.distance,
    orbitSpeed: cfg.orbitSpeed,
    spinSpeed: cfg.spinSpeed,
  });
}

// --- Moon (child of planet 2) ---
const moonGeo = new THREE.SphereGeometry(0.2, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
const moonOrbitRadius = 1.5;
const moonOrbitSpeed = 2.0; // rad/s
planets[1].mesh.add(moon);

// --- Animation ---
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Orbit planets around sun in XZ plane
  for (const planet of planets) {
    const angle = planet.orbitSpeed * elapsed;
    planet.mesh.position.set(
      Math.cos(angle) * planet.orbitRadius,
      0,
      Math.sin(angle) * planet.orbitRadius
    );
    // Spin planet on its own Y axis
    planet.mesh.rotation.y += planet.spinSpeed * delta;
  }

  // Moon orbits its parent planet
  const moonAngle = moonOrbitSpeed * elapsed;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
