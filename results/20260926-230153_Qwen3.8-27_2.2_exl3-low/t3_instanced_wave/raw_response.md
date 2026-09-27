

```ts
import * as THREE from 'three';

// --- Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(70, 50, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(30, 50, 20);
scene.add(directionalLight);

// --- InstancedMesh: 100x100 grid ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.1,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.instanceColor = new THREE.InstancedBufferAttribute(
  new Float32Array(COUNT * 3),
  3
);
scene.add(mesh);

// --- Pre-compute grid positions (X, Z) and colors ---
const positions: Float32Array = new Float32Array(COUNT * 2); // x, z per instance
const color = new THREE.Color();

for (let i = 0; i < COUNT; i++) {
  const col = i % GRID;
  const row = Math.floor(i / GRID);
  const x = (col - (GRID - 1) / 2) * SPACING;
  const z = (row - (GRID - 1) / 2) * SPACING;
  positions[i * 2] = x;
  positions[i * 2 + 1] = z;

  // Gradient: hue based on grid position
  const t = (col + row) / (2 * GRID);
  color.setHSL(t, 0.85, 0.55);
  mesh.instanceColor.setXYZ(i, color.r, color.g, color.b);
}
mesh.instanceColor.needsUpdate = true;

// --- Reusable objects (no allocations in loop) ---
const dummy = new THREE.Object3D();
const mat4 = new THREE.Matrix4();

// --- Wave parameters ---
const WAVE_K = 0.15;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

// --- Animation ---
let elapsed = 0;
let lastTime = performance.now();
let ready = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  elapsed += delta;

  for (let i = 0; i < COUNT; i++) {
    const x = positions[i * 2];
    const z = positions[i * 2 + 1];
    const dist = Math.sqrt(x * x + z * z);
    const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mat4.copy(dummy.matrix);
    mesh.setMatrixAt(i, mat4);
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
```