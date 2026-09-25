```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 15, 12);
camera.lookAt(0, 0, 0);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
(window as any).__controls = controls;

// --- Lights ---
const ambient = new THREE.AmbientLight(0x404040, 1.0);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 3);
scene.add(dirLight);

// --- Procedural Terrain ---
const GRID = 128;
const SIZE = 20;
const NUM_VERTS = GRID * GRID;

const positions = new Float32Array(NUM_VERTS * 3);
const colors = new Float32Array(NUM_VERTS * 3);

// Height function: 3 sine/cosine layers, amplitude ~2
function height(x: number, z: number): number {
  return (
    Math.sin(x * 0.6) * 0.7 +
    Math.cos(z * 0.9) * 0.6 +
    Math.sin((x + z) * 1.3) * 0.7
  );
}

// Compute min/max height for color normalization
let minH = Infinity;
let maxH = -Infinity;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = -SIZE / 2 + (col / (GRID - 1)) * SIZE;
    const z = -SIZE / 2 + (row / (GRID - 1)) * SIZE;
    const h = height(x, z);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
}

// Fill positions and colors
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = (row * GRID + col) * 3;
    const x = -SIZE / 2 + (col / (GRID - 1)) * SIZE;
    const z = -SIZE / 2 + (row / (GRID - 1)) * SIZE;
    const h = height(x, z);

    positions[idx + 0] = x;
    positions[idx + 1] = h;
    positions[idx + 2] = z;

    // Normalize height to [0, 1]
    const t = (h - minH) / (maxH - minH);

    // Color: green (low) -> brown (mid) -> white (high)
    let r: number, g: number, b: number;
    if (t < 0.5) {
      // green to brown
      const f = t / 0.5;
      r = 0.1 + f * (0.55 - 0.1);
      g = 0.6 + f * (0.3 - 0.6);
      b = 0.1 + f * (0.05 - 0.1);
    } else {
      // brown to white
      const f = (t - 0.5) / 0.5;
      r = 0.55 + f * (1.0 - 0.55);
      g = 0.3 + f * (1.0 - 0.3);
      b = 0.05 + f * (1.0 - 0.05);
    }

    colors[idx + 0] = r;
    colors[idx + 1] = g;
    colors[idx + 2] = b;
  }
}

// Index buffer: 2 triangles per cell, winding for +Y normal
// Vertex (col, row): index = row * GRID + col
// For cell (col, row):
//   v00 = row*GRID + col
//   v01 = (row+1)*GRID + col
//   v10 = row*GRID + (col+1)
//   v11 = (row+1)*GRID + (col+1)
// Triangle 1: v00, v01, v10  (cross product gives +Y)
// Triangle 2: v10, v01, v11  (cross product gives +Y)

const NUM_CELLS = (GRID - 1) * (GRID - 1);
const indices = new Uint16Array(NUM_CELLS * 6);

let tri = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const v00 = row * GRID + col;
    const v01 = (row + 1) * GRID + col;
    const v10 = row * GRID + (col + 1);
    const v11 = (row + 1) * GRID + (col + 1);

    // Triangle 1
    indices[tri++] = v00;
    indices[tri++] = v01;
    indices[tri++] = v10;

    // Triangle 2
    indices[tri++] = v10;
    indices[tri++] = v01;
    indices[tri++] = v11;
  }
}

// Build BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Material
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
  side: THREE.FrontSide
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

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

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
```