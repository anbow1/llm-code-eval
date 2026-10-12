```ts
import * as THREE from 'three';

// ─── Scene ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000018);

// ─── Renderer ───
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ─── Camera ───
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// ─── Lights ───
const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// ─── Sun ───
const sunGeo = new THREE.SphereGeometry(1.2, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

// ─── Planet configuration ───
interface PlanetConfig {
  distance: number;
  orbitSpeed: number;
  selfSpeed: number;
  radius: number;
  color: number;
}

const configs: readonly PlanetConfig[] = [
  { distance: 4, orbitSpeed: 1.5, selfSpeed: 2.0, radius: 0.4, color: 0x44bb88 },
  { distance: 7, orbitSpeed: 0.8, selfSpeed: 1.5, radius: 0.6, color: 0xcc4455 },
  { distance: 10, orbitSpeed: 0.4, selfSpeed: 1.0, radius: 0.5, color: 0x5566ee },
];

interface PlanetRef {
  orbitGroup: THREE.Group;
  mesh: THREE.Mesh;
}

const planets: PlanetRef[] = [];

for (const cfg of configs) {
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.6,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = cfg.distance;
  orbitGroup.add(mesh);
  planets.push({ orbitGroup, mesh });
}

// ─── Moon (child of planet index 1) ───
const moonOrbit = new THREE.Group();
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaabb, roughness: 0.5 });
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
moonMesh.position.x = 1.2;
moonOrbit.add(moonMesh);
planets[1].mesh.add(moonOrbit);

// ─── Resize handler ───
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

// ─── Animation loop ───
let prevTime = performance.now();
let rendered = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = (now - prevTime) / 1000;
  prevTime = now;

  // orbit + self-spin
  for (let i = 0; i < planets.length; i++) {
    planets[i].orbitGroup.rotation.y += configs[i].orbitSpeed * delta;
    planets[i].mesh.rotation.y += configs[i].selfSpeed * delta;
  }

  // moon orbit around its parent
  moonOrbit.rotation.y += 3.0 * delta;

  renderer.render(scene, camera);

  if (!rendered) {
    rendered = true;
    (window as any).__ready = true;
  }
});

// ─── Expose for testing ───
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```