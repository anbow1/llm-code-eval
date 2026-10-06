```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 90, 80);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

// --- Grid parameters ---
const GRID_SIZE = 100;
const TOTAL = GRID_SIZE * GRID_SIZE;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const CENTER = (GRID_SIZE - 1) / 2;

// --- InstancedMesh ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.3,
  roughness: 0.4,
});

const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);
scene.add(mesh);

// --- Set initial positions and colors (one-time setup) ---
const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let z = 0; z < GRID_SIZE; z++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    const i = z * GRID_SIZE + x;
    const px = (x - CENTER) * SPACING;
    const pz = (z - CENTER) * SPACING;

    dummy.position.set(px, 0, pz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Gradient color by grid position
    const u = x / (GRID_SIZE - 1);
    const v = z / (GRID_SIZE - 1);
    color.setHSL(0.6 - u * 0.4, 0.8, 0.4 + v * 0.3);
    mesh.setColorAt(i, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// --- Animation constants ---
const K = 0.18; // radial wave frequency
const SPEED = 3.0; // wave speed
const AMPLITUDE = 4.0; // wave height

// Reusable objects (no allocations in render loop)
let firstFrame = true;

// Precompute distances from center for each instance
const distances = new Float32Array(TOTAL);
for (let z = 0; z < GRID_SIZE; z++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    const i = z * GRID_SIZE + x;
    const dx = (x - CENTER) * SPACING;
    const dz = (z - CENTER) * SPACING;
    distances[i] = Math.sqrt(dx * dx + dz * dz);
  }
}

// --- Render loop ---
function animate(): void {
  const time = performance.now() * 0.001; // seconds

  for (let i = 0; i < TOTAL; i++) {
    const z = (i / GRID_SIZE) | 0;
    const x = i % GRID_SIZE;

    const px = (x - CENTER) * SPACING;
    const pz = (z - CENTER) * SPACING;
    const dist = distances[i];

    const y = Math.sin(dist * K - time * SPEED) * AMPLITUDE;

    dummy.position.set(px, y, pz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Start ---
renderer.setAnimationLoop(animate);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```