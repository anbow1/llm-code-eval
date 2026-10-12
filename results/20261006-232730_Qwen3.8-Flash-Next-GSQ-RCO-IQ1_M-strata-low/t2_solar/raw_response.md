```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0x333344, 0.4);
scene.add(ambient);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(1.0, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

// --- Planets ---
const planetConfigs: { dist: number; radius: number; speed: number; spinSpeed: number; color: number }[] = [
  { dist: 4, radius: 0.4, speed: 0.7, spinSpeed: 3.0, color: 0x4488ff },
  { dist: 7, radius: 0.55, speed: 0.45, spinSpeed: 2.0, color: 0x44bb77 },
  { dist: 10, radius: 0.35, speed: 0.22, spinSpeed: 1.5, color: 0xcc3322 },
];

const planetGroups: THREE.Group[] = [];
const planetMeshes: THREE.Mesh[] = [];

for (let i = 0; i < 3; i++) {
  const cfg = planetConfigs[i];
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.65,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  scene.add(group);
  planetGroups.push(group);
  planetMeshes.push(mesh);
}

// --- Moon (child of Planet 2) ---
const moonPivot = new THREE.Group();
const moonGeo = new THREE.SphereGeometry(0.18, 20, 20);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.0 });
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
moonMesh.position.set(1.2, 0, 0);
moonPivot.add(moonMesh);
planetMeshes[1].add(moonPivot);

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const t = (performance.now() as unknown as number) * 0.001;

  for (let i = 0; i < 3; i++) {
    const cfg = planetConfigs[i];
    const angle = cfg.speed * t;
    planetGroups[i].position.set(
      Math.cos(angle) * cfg.dist,
      0,
      Math.sin(angle) * cfg.dist
    );
    planetMeshes[i].rotation.y = cfg.spinSpeed * t;
  }

  moonPivot.rotation.y = 1.8 * t;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```