```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

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
camera.position.set(14, 11, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffee44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Planet configuration ---
interface PlanetConfig {
  radius: number;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  color: number;
}

const configs: PlanetConfig[] = [
  { radius: 0.3, distance: 4, orbitSpeed: 0.9, spinSpeed: 1.6, color: 0x4488ff },
  { radius: 0.5, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.0, color: 0x66cc44 },
  { radius: 0.4, distance: 10, orbitSpeed: 0.3, spinSpeed: 0.7, color: 0xff8844 },
];

// --- Create planets ---
const planets: THREE.Mesh[] = [];
for (let i = 0; i < configs.length; i++) {
  const cfg: PlanetConfig = configs[i];
  const geo: THREE.SphereGeometry = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh: THREE.Mesh = new THREE.Mesh(geo, mat);

  const initAngle: number = (i * Math.PI * 2) / 3;
  mesh.position.set(
    cfg.distance * Math.cos(initAngle),
    0,
    cfg.distance * Math.sin(initAngle)
  );
  scene.add(mesh);
  planets.push(mesh);
}

// --- Moon (child of planet 2) ---
const moonGeo: THREE.SphereGeometry = new THREE.SphereGeometry(0.15, 20, 20);
const moonMat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.9,
  metalness: 0.0,
});
const moon: THREE.Mesh = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
planets[1].add(moon);

// --- Timing ---
let lastTime: number | null = null;
let elapsed: number = 0;

const moonOrbitSpeed: number = 2.0;
const moonRadius: number = 1.2;

// --- Animation loop ---
function animate(time: number): void {
  if (lastTime === null) {
    lastTime = time;
  }
  const delta: number = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  elapsed += delta;

  // Update planet orbits and spins
  for (let i = 0; i < planets.length; i++) {
    const cfg: PlanetConfig = configs[i];
    const angle: number = (i * Math.PI * 2) / 3 + elapsed * cfg.orbitSpeed;
    planets[i].position.set(
      cfg.distance * Math.cos(angle),
      0,
      cfg.distance * Math.sin(angle)
    );
    planets[i].rotation.y += delta * cfg.spinSpeed;
  }

  // Update moon orbit (local space of planet 2)
  const moonAngle: number = elapsed * moonOrbitSpeed;
  moon.position.set(
    moonRadius * Math.cos(moonAngle),
    0,
    moonRadius * Math.sin(moonAngle)
  );
  moon.rotation.y += delta * 0.5;

  renderer.render(scene, camera);

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
}

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Start render loop ---
renderer.setAnimationLoop(animate);

// --- Resize handler ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```