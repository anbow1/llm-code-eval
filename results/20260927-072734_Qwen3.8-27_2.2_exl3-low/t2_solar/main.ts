import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- PointLight (physically based: intensity in candela, decay = 2) ---
const pointLight = new THREE.PointLight(0xffffff, 1000, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Ambient light (weak fill) ---
const ambientLight = new THREE.AmbientLight(0x222222, 0.4);
scene.add(ambientLight);

// --- Planet definitions ---
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const planetConfigs: {
  radius: number;
  distance: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
}[] = [
  { radius: 0.3, distance: 4, color: 0x4488ff, orbitSpeed: 0.6, spinSpeed: 1.2 },
  { radius: 0.45, distance: 7, color: 0xcc8844, orbitSpeed: 0.35, spinSpeed: 0.8 },
  { radius: 0.55, distance: 10, color: 0x44aa66, orbitSpeed: 0.18, spinSpeed: 0.5 },
];

const planets: PlanetData[] = [];

for (const cfg of planetConfigs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push({
    mesh,
    distance: cfg.distance,
    angle: 0,
    orbitSpeed: cfg.orbitSpeed,
    spinSpeed: cfg.spinSpeed,
  });
}

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.15, 24, 24);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].mesh.add(moon);

let moonAngle: number = 0;
const moonOrbitSpeed: number = 2.0;
const moonDistance: number = 0.9;

// --- Animation loop ---
const clock = new THREE.Clock();
let ready: boolean = false;

renderer.setAnimationLoop((_time: number): void => {
  const delta: number = clock.getDelta();

  // Orbit + spin each planet
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.distance,
      0,
      Math.sin(p.angle) * p.distance
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonDistance,
    0,
    Math.sin(moonAngle) * moonDistance
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize handling ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
