```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16213e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(75, 65, 75);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 80, 30);
scene.add(dirLight);

// Grid configuration
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 0.9;
const CUBE_SIZE = 0.55;
const half = (GRID - 1) / 2;

// Single InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.3 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute grid positions and distances (avoids re-computation each frame)
const positionsX = new Float32Array(COUNT);
const positionsZ = new Float32Array(COUNT);
const distances = new Float32Array(COUNT);

// Reusable objects — no allocations inside the render loop
const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = (col - half) * SPACING;
    const z = (row - half) * SPACING;

    positionsX[idx] = x;
    positionsZ[idx] = z;
    distances[idx] = Math.sqrt(x * x + z * z);

    // Initial matrix
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Per-instance colour: hue gradient across the grid
    const hue = (col / GRID) * 0.7 + (row / GRID) * 0.3;
    color.setHSL(hue, 0.82, 0.55);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// Wave parameters
const WAVE_K = 0.28;
const WAVE_SPEED = 2.5;
const WAVE_AMPLITUDE = 2.2;

const clock = new THREE.Clock();
let firstFrameDone = false;

function animate(): void {
  const time = clock.getElapsedTime();

  for (let i = 0; i < COUNT; i++) {
    const x = positionsX[i];
    const z = positionsZ[i];
    const y = Math.sin(distances[i] * WAVE_K - time * WAVE_SPEED) * WAVE_AMPLITUDE;

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as unknown as Record<string, unknown>).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as unknown as Record<string, unknown>).__scene = scene;
(window as unknown as Record<string, unknown>).__camera = camera;
(window as unknown as Record<string, unknown>).__renderer = renderer;
```