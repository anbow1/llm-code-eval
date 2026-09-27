```ts
import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 90, 120);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(60, 100, 40);
scene.add(directionalLight);

// --- Grid constants ---
const GRID = 100;
const SPACING = 1.0;
const HALF = ((GRID - 1) * SPACING) / 2;
const CUBE_SIZE = 0.6;
const WAVE_K = 0.18;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 3.5;
const COUNT = GRID * GRID; // 10 000

// --- Geometry & Material ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.45,
  metalness: 0.25,
});

// --- InstancedMesh ---
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// --- Pre-computed per-instance data (no allocations in loop) ---
const posX = new Float32Array(COUNT);
const posZ = new Float32Array(COUNT);
const distX = new Float32Array(COUNT); // distance from centre

let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = col * SPACING - HALF;
    const z = row * SPACING - HALF;
    posX[i] = x;
    posZ[i] = z;
    distX[i] = Math.sqrt(x * x + z * z);
    i++;
  }
}

// --- Set initial matrices & per-instance colours (one-time) ---
const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();

for (let j = 0; j < COUNT; j++) {
  _matrix.makeTranslation(posX[j], 0, posZ[j]);
  mesh.setMatrixAt(j, _matrix);

  // Diagonal gradient: blue → cyan → green → yellow → red
  const u = (j % GRID) / (GRID - 1);        // 0..1 across columns
  const v = Math.floor(j / GRID) / (GRID - 1); // 0..1 across rows
  const t = (u + v) * 0.5;                  // 0..1 diagonal
  _color.setHSL(t * 0.75, 0.85, 0.55);
  mesh.setColorAt(j, _color);
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

// --- Resize handling ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

// --- Animation loop ---
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let j = 0; j < COUNT; j++) {
    const y = Math.sin(distX[j] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    _matrix.makeTranslation(posX[j], y, posZ[j]);
    mesh.setMatrixAt(j, _matrix);
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
```