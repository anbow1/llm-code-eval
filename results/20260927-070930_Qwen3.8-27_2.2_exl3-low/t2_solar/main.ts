import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera (above and to the side, looking at origin) ---
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

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.5, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- PointLight (physically based: intensity in candela, decay = 2) ---
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Weak AmbientLight ---
const ambientLight = new THREE.AmbientLight(0x111122, 0.4);
scene.add(ambientLight);

// --- Planet configuration ---
interface PlanetConfig {
  radius: number;
  distance: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.4,  distance: 4,  orbitSpeed: 0.8, spinSpeed: 1.2, color: 0x4488ff },
  { radius: 0.55, distance: 7,  orbitSpeed: 0.5, spinSpeed: 0.8, color: 0x44aa77 },
  { radius: 0.35, distance: 10, orbitSpeed: 0.3, spinSpeed: 1.5, color: 0xcc7744 },
];

const planets: THREE.Mesh[] = [];
const orbitAngles: number[] = [0, 0, 0];

for (const cfg of configs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cfg.distance, 0, 0);
  scene.add(mesh);
  planets.push(mesh);
}

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.18, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
planets[1].add(moon);

const moonOrbitRadius: number = 1.2;
const moonOrbitSpeed: number = 2.0; // rad/s
let moonAngle: number = 0;

// --- Animation loop ---
let prevTime: number = 0;
let ready: boolean = false;

renderer.setAnimationLoop((time: number): void => {
  const delta: number = prevTime === 0 ? 0 : (time - prevTime) / 1000;
  prevTime = time;

  // Orbit + spin each planet
  for (let i = 0; i < planets.length; i++): void {
    orbitAngles[i] += configs[i].orbitSpeed * delta;
    const a: number = orbitAngles[i];
    planets[i].position.x = configs[i].distance * Math.cos(a);
    planets[i].position.z = configs[i].distance * Math.sin(a);
    planets[i].rotation.y += configs[i].spinSpeed * delta;
  }

  // Moon orbits planet 2 in local space
  moonAngle += moonOrbitSpeed * delta;
  moon.position.x = moonOrbitRadius * Math.cos(moonAngle);
  moon.position.z = moonOrbitRadius * Math.sin(moonAngle);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
