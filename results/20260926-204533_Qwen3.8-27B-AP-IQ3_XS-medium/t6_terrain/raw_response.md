```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88aacc);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 18, 22);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 8);
scene.add(directionalLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

function terrainHeight(x: number, z: number): number {
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
  const h2 = Math.sin(x * 1.5 + z * 1.5) * 0.7;
  const h3 = Math.cos(x * 3.0 + z * 3.0) * 0.3;
  return h1 + h2 + h3;
}

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const heights = new Float32Array(vertexCount);

let minY = Infinity;
let maxY = -Infinity;

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const h = terrainHeight(x, z);
    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = h;
    positions[idx * 3 + 2] = z;
    heights[idx] = h;
    if (h < minY) minY = h;
    if (h > maxY) maxY = h;
  }
}

// Index buffer: two triangles per cell, winding for +Y normal
const cellsX = GRID - 1;
const cellsZ = GRID - 1;
const indexCount = cellsX * cellsZ * 6;
const indices = new Uint32Array(indexCount);
let ip = 0;

for (let i = 0; i < cellsX; i++) {
  for (let j = 0; j < cellsZ; j++) {
    const v0 = i * GRID + j;
    const v1 = (i + 1) * GRID + j;
    const v2 = i * GRID + (j + 1);
    const v3 = (i + 1) * GRID + (j + 1);
    // Triangle 1: v0, v2, v3 (CCW from above → +Y normal)
    indices[ip++] = v0;
    indices[ip++] = v2;
    indices[ip++] = v3;
    // Triangle 2: v0, v3, v1 (CCW from above → +Y normal)
    indices[ip++] = v0;
    indices[ip++] = v3;
    indices[ip++] = v1;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Vertex colors by height: green (low) → brown (middle) → white (high)
const colors = new Float32Array(vertexCount * 3);
const range = maxY - minY || 1;

for (let idx = 0; idx < vertexCount; idx++) {
  const t = (heights[idx] - minY) / range;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    // Green → Brown
    const s = t / 0.5;
    r = 0.1 + s * 0.5;
    g = 0.7 - s * 0.3;
    b = 0.1 - s * 0.05;
  } else {
    // Brown → White
    const s = (t - 0.5) / 0.5;
    r = 0.6 + s * 0.4;
    g = 0.4 + s * 0.6;
    b = 0.05 + s * 0.95;
  }
  colors[idx * 3 + 0] = r;
  colors[idx * 3 + 1] = g;
  colors[idx * 3 + 2] = b;
}

geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

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
(window as any).__controls = controls;

// --- Render loop ---
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
  void delta;
});
```