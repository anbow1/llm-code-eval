import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 70, 80);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// --- Grid & InstancedMesh ---
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const COUNT = GRID_SIZE * GRID_SIZE;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.3,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute per-instance data
const px: number[] = new Array(COUNT);
const pz: number[] = new Array(COUNT);
const dist: number[] = new Array(COUNT);

const half = GRID_SIZE * 0.5;
let idx = 0;
for (let j = 0; j < GRID_SIZE; j++) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const x = (i - half + 0.5) * SPACING;
    const z = (j - half + 0.5) * SPACING;
    px[idx] = x;
    pz[idx] = z;
    dist[idx] = Math.sqrt(x * x + z * z);
    idx++;
  }
}

// Colors: gradient by grid position
const tmpColor = new THREE.Color();
for (let j = 0; j < GRID_SIZE; j++) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const n = j * GRID_SIZE + i;
    const u = i / (GRID_SIZE - 1);
    const v = j / (GRID_SIZE - 1);
    tmpColor.setHSL((u + v) * 0.5, 0.85, 0.55);
    mesh.setColorAt(n, tmpColor);
  }
}
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// --- Wave parameters ---
const WAVE_K = 0.5;
const WAVE_SPEED = 2.5;
const WAVE_AMPLITUDE = 1.5;

// --- Reusable objects (no allocation in loop) ---
const matrix = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3(1, 1, 1);

// Initial matrices
for (let i = 0; i < COUNT; i++) {
  pos.set(px[i], 0, pz[i]);
  matrix.compose(pos, quat, scl);
  mesh.setMatrixAt(i, matrix);
}
mesh.instanceMatrix.needsUpdate = true;

scene.add(mesh);

// --- Animation ---
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  const phase = elapsed * WAVE_SPEED;

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(dist[i] * WAVE_K - phase) * WAVE_AMPLITUDE;
    pos.set(px[i], y, pz[i]);
    matrix.compose(pos, quat, scl);
    mesh.setMatrixAt(i, matrix);
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
