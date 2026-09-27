import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera (above and to the side) ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x333333, 0.25);
scene.add(ambientLight);

// Physically-based point light at the sun (intensity in candela, decay 2)
const sunLight = new THREE.PointLight(0xffffff, 150, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.5, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- Planet definitions ---
interface PlanetConfig {
  radius: number;
  distance: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.4, distance: 4,  orbitSpeed: 1.2,  spinSpeed: 1.5,  color: 0x4488ff },
  { radius: 0.6, distance: 7,  orbitSpeed: 0.6,  spinSpeed: 0.8,  color: 0xff8844 },
  { radius: 0.5, distance: 10, orbitSpeed: 0.3,  spinSpeed: 1.0,  color: 0x44ff88 },
];

// Build pivots and planet meshes
const planetPivots: THREE.Object3D[] = [];
const planetMeshes: THREE.Mesh[] = [];

for (const cfg of configs) {
  const pivot = new THREE.Object3D();
  pivot.position.set(0, 0, 0);

  const geo = new THREE.SphereGeometry(cfg.radius, 48, 48);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cfg.distance, 0, 0);
  pivot.add(mesh);
  scene.add(pivot);

  planetPivots.push(pivot);
  planetMeshes.push(mesh);
}

// --- Moon (child of planet 2) ---
const moonGeo = new THREE.SphereGeometry(0.15, 24, 24);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planetMeshes[1].add(moon); // planet.add(moon)

const moonOrbitRadius = 1.4;
const moonOrbitSpeed = 2.0; // rad/s

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
let prevTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = (time - prevTime) / 1000; // seconds
  prevTime = time;

  // Orbit & spin each planet
  for (let i = 0; i < planetPivots.length; i++) {
    planetPivots[i].rotation.y += configs[i].orbitSpeed * delta;
    planetMeshes[i].rotation.y += configs[i].spinSpeed * delta;
  }

  // Moon orbits planet 2 (position in local space of planet 2)
  const moonAngle = moonOrbitSpeed * (time / 1000);
  moon.position.x = moonOrbitRadius * Math.cos(moonAngle);
  moon.position.z = moonOrbitRadius * Math.sin(moonAngle);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
