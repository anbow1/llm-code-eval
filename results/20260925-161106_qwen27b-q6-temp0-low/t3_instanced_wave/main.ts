import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 55, 70);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(30, 50, 20);
scene.add(directionalLight);

// --- Grid parameters ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1;
const HALF = (GRID - 1) * SPACING * 0.5;

const WAVE_K = 0.3;
const WAVE_SPEED = 3.0;
const WAVE_AMPLITUDE = 3.0;

// --- Pre-allocate positions (x, z for each instance) ---
const positions: Float32Array = new Float32Array(COUNT * 2);
let idx = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    positions[idx * 2] = col * SPACING - HALF;
    positions[idx * 2 + 1] = row * SPACING - HALF;
    idx++;
  }
}

// --- Geometry & Material ---
const boxGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.5,
  metalness: 0.3,
});

// --- InstancedMesh ---
const mesh = new THREE.InstancedMesh(boxGeometry, material, COUNT);
scene.add(mesh);

// --- Set initial matrices and colors (one-time) ---
const dummy = new THREE.Matrix4();
const tempColor = new THREE.Color();

for (let i = 0; i < COUNT; i++) {
  const x = positions[i * 2];
  const z = positions[i * 2 + 1];
  dummy.makeTranslation(x, 0, z);
  mesh.setMatrixAt(i, dummy);

  // Gradient color based on grid position
  const u = x / (GRID * SPACING);
  const v = z / (GRID * SPACING);
  tempColor.setRGB(
    0.2 + 0.6 * (u + 0.5),
    0.3 + 0.4 * (v + 0.5),
    0.8 - 0.5 * (u * 0.5 + v * 0.5)
  );
  mesh.setColorAt(i, tempColor);
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// --- Reusable objects for the render loop (no allocations) ---
const loopMatrix = new THREE.Matrix4();
let elapsedTime = 0;
let ready = false;

// --- Resize handler ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Render loop ---
renderer.setAnimationLoop((time: number) => {
  const delta = time * 0.001; // convert to seconds
  elapsedTime = delta;

  for (let i = 0; i < COUNT; i++) {
    const x = positions[i * 2];
    const z = positions[i * 2 + 1];
    const dist = Math.sqrt(x * x + z * z);
    const y = Math.sin(dist * WAVE_K - elapsedTime * WAVE_SPEED) * WAVE_AMPLITUDE;
    loopMatrix.makeTranslation(x, y, z);
    mesh.setMatrixAt(i, loopMatrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

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
