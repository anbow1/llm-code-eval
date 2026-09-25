

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera (angled to see whole grid + wave) ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(60, 55, 60);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);

// --- Grid parameters ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.75;
const HALF = (GRID - 1) * SPACING * 0.5;

// --- InstancedMesh (single mesh for all 10,000 cubes) ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.1,
  roughness: 0.5,
});
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// --- Pre-compute grid positions & set initial colors ---
const dummy = new THREE.Object3D(); // reused every frame, no allocations in loop
const color = new THREE.Color();

interface InstanceData {
  x: number;
  z: number;
  dist: number;
}

const instances: InstanceData[] = new Array(COUNT);

let idx = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = col * SPACING - HALF;
    const z = row * SPACING - HALF;
    const dist = Math.sqrt(x * x + z * z);
    instances[idx] = { x, z, dist };

    // Initial matrix (flat grid, Y = 0)
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Gradient color by grid position (hue sweeps across the grid)
    const hue = (col / GRID + row / GRID) * 0.5;
    const sat = 0.7 + 0.3 * (row / GRID);
    const light = 0.4 + 0.3 * (col / GRID);
    color.setHSL(hue, sat, light);
    mesh.setColorAt(idx, color);

    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// --- Wave parameters ---
const K = 0.35; // spatial frequency
const SPEED = 2.5; // temporal speed
const AMPLITUDE = 3.0;

// --- Animation loop (uses elapsed time in seconds, no allocations) ---
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const t = time * 0.001; // ms → s

  for (let i = 0; i < COUNT; i++) {
    const inst = instances[i];
    const y = Math.sin(inst.dist * K - t * SPEED) * AMPLITUDE;

    dummy.position.set(inst.x, y, inst.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
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

// --- Resize handler ---
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