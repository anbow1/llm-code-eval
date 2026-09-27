import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);

// --- Camera (angled view so the whole grid is visible) ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(75, 55, 75);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 80, 30);
scene.add(directionalLight);

// --- Grid constants ---
const GRID_SIZE = 100;
const SPACING = 1.2;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.5;
const WAVE_K = 0.25;
const WAVE_SPEED = 2.5;
const TOTAL = GRID_SIZE * GRID_SIZE;
const HALF = ((GRID_SIZE - 1) * SPACING) / 2;

// --- Geometry & Material ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  metalness: 0.25,
});

// --- InstancedMesh ---
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);

// Pre-compute per-instance data (flat arrays, no objects)
const posX = new Float32Array(TOTAL);
const posZ = new Float32Array(TOTAL);
const dist = new Float32Array(TOTAL);

// Reusable objects – allocated ONCE, never inside the loop
const tmpMatrix = new THREE.Matrix4();
const tmpColor = new THREE.Color();

// Initialise matrices & colours
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const idx = i * GRID_SIZE + j;
    const x = i * SPACING - HALF;
    const z = j * SPACING - HALF;
    const d = Math.sqrt(x * x + z * z);

    posX[idx] = x;
    posZ[idx] = z;
    dist[idx] = d;

    tmpMatrix.makeTranslation(x, 0, z);
    mesh.setMatrixAt(idx, tmpMatrix);

    // Gradient: red→green across X, blue tint across Z
    const r = i / (GRID_SIZE - 1);
    const g = j / (GRID_SIZE - 1);
    tmpColor.setRGB(r, g, 0.35 + 0.3 * r * g);
    mesh.setColorAt(idx, tmpColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
// instanceColor is created by the first setColorAt call
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

// Single reusable Matrix4 for the hot loop
const animMatrix = new THREE.Matrix4();

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  for (let idx = 0; idx < TOTAL; idx++) {
    const y = Math.sin(dist[idx] * WAVE_K - t * WAVE_SPEED) * AMPLITUDE;
    animMatrix.makeTranslation(posX[idx], y, posZ[idx]);
    mesh.setMatrixAt(idx, animMatrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
