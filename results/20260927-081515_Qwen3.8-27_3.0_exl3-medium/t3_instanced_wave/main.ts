import * as THREE from 'three';

// ── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);

// ── Camera (angled so the whole grid + wave are visible) ─────────────────────
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 65, 85);
camera.lookAt(0, 0, 0);

// ── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ── Lights ───────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 60, 30);
scene.add(directionalLight);

// ── Grid constants ───────────────────────────────────────────────────────────
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 3.0;
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;
const COUNT = GRID_SIZE * GRID_SIZE; // 10 000

// ── Pre-compute per-instance data (no allocations in the loop) ───────────────
const posX = new Float32Array(COUNT);
const posZ = new Float32Array(COUNT);
const dist = new Float32Array(COUNT);

let idx = 0;
for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const x = (ix - (GRID_SIZE - 1) / 2) * SPACING;
    const z = (iz - (GRID_SIZE - 1) / 2) * SPACING;
    posX[idx] = x;
    posZ[idx] = z;
    dist[idx] = Math.sqrt(x * x + z * z);
    idx++;
  }
}

// ── InstancedMesh ────────────────────────────────────────────────────────────
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  metalness: 0.25,
});
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Per-instance colour: HSL gradient across the grid
const tmpColor = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  const ix = i % GRID_SIZE;
  const iz = Math.floor(i / GRID_SIZE);
  const hue = (ix / GRID_SIZE) * 0.55 + (iz / GRID_SIZE) * 0.35;
  tmpColor.setHSL(hue, 0.85, 0.5);
  mesh.setColorAt(i, tmpColor);
}
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// ── Reusable Object3D (single allocation, reused every frame) ────────────────
const dummy = new THREE.Object3D();

// ── Animation loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const elapsed: number = clock.getElapsedTime();

  for (let i = 0; i < COUNT; i++) {
    const y: number =
      Math.sin(dist[i] * WAVE_K - elapsed * WAVE_SPEED) * AMPLITUDE;
    dummy.position.set(posX[i], y, posZ[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// ── Resize handling ──────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Expose for testing ───────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
