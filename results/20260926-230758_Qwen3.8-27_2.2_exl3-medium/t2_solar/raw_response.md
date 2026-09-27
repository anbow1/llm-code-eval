

```ts
import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(16, 12, 16);
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

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.5, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight at origin – physically based (decay = 2, intensity in candela)
const sunLight = new THREE.PointLight(0xffffff, 400, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient so dark sides aren't pure black
const ambient = new THREE.AmbientLight(0x222222, 0.3);
scene.add(ambient);

// --- Planet types ---
interface PlanetEntry {
  mesh: THREE.Mesh;
  orbitRadius: number;
  angularSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planetEntries: PlanetEntry[] = [];

const configs: Array<{
  radius: number;
  color: number;
  orbitRadius: number;
  angularSpeed: number;
  spinSpeed: number;
}> = [
  { radius: 0.5, color: 0x4488ff, orbitRadius: 4, angularSpeed: 0.6, spinSpeed: 1.2 },
  { radius: 0.7, color: 0xcc8844, orbitRadius: 7, angularSpeed: 0.35, spinSpeed: 0.8 },
  { radius: 0.6, color: 0x88cc88, orbitRadius: 10, angularSpeed: 0.2, spinSpeed: 0.5 },
];

for (const cfg of configs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planetEntries.push({
    mesh,
    orbitRadius: cfg.orbitRadius,
    angularSpeed: cfg.angularSpeed,
    spinSpeed: cfg.spinSpeed,
    angle: Math.random() * Math.PI * 2,
  });
}

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.2, 24, 24);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planetEntries[1].mesh.add(moon);

const moonOrbitRadius = 1.6;
const moonOrbitSpeed = 0.9;
let moonAngle: number = 0;

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Orbit + spin each planet
  for (const p of planetEntries) {
    p.angle += p.angularSpeed * delta;
    p.mesh.position.x = p.orbitRadius * Math.cos(p.angle);
    p.mesh.position.z = p.orbitRadius * Math.sin(p.angle);
    p.mesh.position.y = 0;
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2 in local space
  moonAngle += moonOrbitSpeed * delta;
  moon.position.x = moonOrbitRadius * Math.cos(moonAngle);
  moon.position.z = moonOrbitRadius * Math.sin(moonAngle);
  moon.position.y = 0;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```