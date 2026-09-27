

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

// --- Lighting ---
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x333333, 0.4);
scene.add(ambientLight);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.5, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- Planets ---
interface PlanetConfig {
  radius: number;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.4, distance: 4, orbitSpeed: 1.0, spinSpeed: 2.0, color: 0x4488ff },
  { radius: 0.5, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.5, color: 0xbb5533 },
  { radius: 0.6, distance: 10, orbitSpeed: 0.25, spinSpeed: 1.0, color: 0x44aa55 },
];

const planets: THREE.Mesh[] = [];

for (const cfg of configs) {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// --- Moon (child of planet 2, index 1) ---
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0;

// --- Resize ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Animation ---
let prevTime = 0;
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = (time - prevTime) / 1000;
  prevTime = time;
  elapsed += delta;

  // Orbit & spin planets
  for (let i = 0; i < planets.length; i++) {
    const cfg = configs[i];
    const angle = elapsed * cfg.orbitSpeed;
    planets[i].position.set(
      cfg.distance * Math.cos(angle),
      0,
      cfg.distance * Math.sin(angle)
    );
    planets[i].rotation.y += cfg.spinSpeed * delta;
  }

  // Moon orbits planet 2 in its local frame
  const moonAngle = elapsed * moonOrbitSpeed;
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

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```