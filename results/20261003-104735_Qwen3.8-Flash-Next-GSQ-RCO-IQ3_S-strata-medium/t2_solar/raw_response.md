```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(18, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambientLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Planets ---
interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planets: PlanetData[] = [];

const planetConfigs = [
  { distance: 4, size: 0.4, color: 0x4488ff, speed: 1.2, spin: 3 },
  { distance: 7, size: 0.6, color: 0x44cc66, speed: 0.6, spin: 2 },
  { distance: 10, size: 0.5, color: 0xcc6644, speed: 0.3, spin: 1.5 },
];

for (const cfg of planetConfigs) {
  const geometry = new THREE.SphereGeometry(cfg.size, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push({
    mesh,
    distance: cfg.distance,
    angularSpeed: cfg.speed,
    spinSpeed: cfg.spin,
    angle: Math.random() * Math.PI * 2,
  });
}

// --- Moon for Planet 2 (index 1) ---
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.8,
  metalness: 0.0,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(1.2, 0, 0);
planets[1].mesh.add(moon);

// --- Orbit rings (visual guides) ---
for (const cfg of planetConfigs) {
  const ringGeo = new THREE.RingGeometry(cfg.distance - 0.01, cfg.distance + 0.01, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x333344,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
}

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation ---
let firstFrame = true;
let elapsed = 0;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  // Update planet positions (orbit in XZ plane)
  for (const p of planets) {
    p.angle += p.angularSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.distance,
      0,
      Math.sin(p.angle) * p.distance
    );
    // Spin on own Y axis
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  // Moon orbits planet 2 (as a child, position rotates via its own angle)
  const moonOrbitSpeed = 2.5;
  const moonDist = 1.2;
  moon.position.set(
    Math.cos(elapsed * moonOrbitSpeed) * moonDist,
    0,
    Math.sin(elapsed * moonOrbitSpeed) * moonDist
  );

  // Subtle sun pulse
  const pulse = 1.0 + 0.03 * Math.sin(elapsed * 4);
  sun.scale.setScalar(pulse);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```