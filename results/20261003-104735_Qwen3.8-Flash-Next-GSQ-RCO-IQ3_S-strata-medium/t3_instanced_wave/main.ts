import * as THREE from 'three';

// ─── Renderer ───────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ─── Scene ──────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

// ─── Camera (angled view to see full grid + wave) ──────────────────────────────
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(100, 70, 100);
camera.lookAt(0, 0, 0);

// ─── Lights ─────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x404060, 0.6));
const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
dirLight.position.set(60, 100, 40);
scene.add(dirLight);

// ─── Grid constants ─────────────────────────────────────────────────────────────
const GRID = 100;
const COUNT = GRID * GRID; // 10 000
const SPACING = 1.0;
const CUBE = 0.7;

// ─── InstancedMesh (single draw call for 10 000 cubes) ────────────────────────
const geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.25,
  roughness: 0.65,
  flatShading: true,
});
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);

// ─── Pre-allocate per-instance data (x, z, dist) – no alloc in loop ───────────
const posX = new Float64Array(COUNT);
const posZ = new Float64Array(COUNT);
const dist = new Float64Array(COUNT);

const half = GRID / 2;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = (col - half) * SPACING;
    const z = (row - half) * SPACING;
    posX[idx] = x;
    posZ[idx] = z;
    dist[idx] = Math.sqrt(x * x + z * z);
  }
}

// ─── Per-instance colours (gradient by grid position) – set once ───────────────
const tmpColor = new THREE.Color();
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const hue = ((col / GRID) + (row / GRID)) * 0.5; // 0 → 1 diagonal
    tmpColor.setHSL(hue, 0.85, 0.55);
    mesh.setColorAt(idx, tmpColor);
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// ─── Reusable dummy (no allocations in render loop) ────────────────────────────
const dummy = new THREE.Object3D();

// Set initial matrices
for (let idx = 0; idx < COUNT; idx++) {
  dummy.position.set(posX[idx], 0, posZ[idx]);
  dummy.updateMatrix();
  mesh.setMatrixAt(idx, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;

// ─── Wave parameters ───────────────────────────────────────────────────────────
const K = 0.3;
const SPEED = 2.5;
const AMPLITUDE = 3.5;

// ─── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  // Update every instance Y via radial wave – reusing `dummy` (zero alloc)
  for (let idx = 0; idx < COUNT; idx++) {
    const y = Math.sin(dist[idx] * K - t * SPEED) * AMPLITUDE;
    dummy.position.set(posX[idx], y, posZ[idx]);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  // Slowly orbit camera for a nicer view
  const angle = t * 0.05;
  camera.position.set(
    Math.cos(angle) * 110,
    75,
    Math.sin(angle) * 110
  );
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// ─── Resize handler ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Expose for testing ────────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
