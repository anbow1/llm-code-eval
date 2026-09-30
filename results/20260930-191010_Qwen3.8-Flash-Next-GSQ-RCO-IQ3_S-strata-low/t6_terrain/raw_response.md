```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(18, 16, 18);
camera.lookAt(0, 0, 0);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
(window as any).__controls = controls;

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 5);
scene.add(dirLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const CELL = SIZE / (GRID - 1);

const vertCount = GRID * GRID;
const positions = new Float32Array(vertCount * 3);
const colors = new Float32Array(vertCount * 3);

// Height function: 3 sine/cosine layers, amplitude sum ≈ 2
function getHeight(x: number, z: number): number {
  const layer1 = 0.8 * Math.sin(x * 2.5 + 1.0) * Math.cos(z * 1.7);
  const layer2 = 0.7 * Math.sin(x * 4.0) * Math.sin(z * 3.0 + 0.5);
  const layer3 = 0.5 * Math.cos(x * 7.0 + z * 5.0);
  return layer1 + layer2 + layer3;
}

// Compute vertex positions and colors
const maxHeight = 2.0;
const minHeight = -2.0;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = -HALF + i * CELL;
    const z = -HALF + j * CELL;
    const y = getHeight(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Normalize height to [0, 1] for coloring
    const t = (y - minHeight) / (maxHeight - minHeight);

    // Green (low) -> Brown (middle) -> White (high)
    const green: [number, number, number] = [0.15, 0.55, 0.15];
    const brown: [number, number, number] = [0.55, 0.35, 0.12];
    const white: [number, number, number] = [0.92, 0.92, 0.92];

    let r: number, g: number, b: number;
    if (t < 0.5) {
      const u = t * 2.0;
      r = green[0] + (brown[0] - green[0]) * u;
      g = green[1] + (brown[1] - green[1]) * u;
      b = green[2] + (brown[2] - green[2]) * u;
    } else {
      const u = (t - 0.5) * 2.0;
      r = brown[0] + (white[0] - brown[0]) * u;
      g = brown[1] + (white[1] - brown[1]) * u;
      b = brown[2] + (white[2] - brown[2]) * u;
    }

    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer: two triangles per cell, winding points faces UP (+Y)
const indexCount = (GRID - 1) * (GRID - 1) * 6;
const indices = new Uint32Array(indexCount);
let ptr = 0;

for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const v00 = j * GRID + i;
    const v10 = v00 + 1;
    const v01 = v00 + GRID;
    const v11 = v00 + GRID + 1;

    // Triangle 1: v00, v11, v10 (upward-facing)
    indices[ptr++] = v00;
    indices[ptr++] = v11;
    indices[ptr++] = v10;

    // Triangle 2: v00, v01, v11 (upward-facing)
    indices[ptr++] = v00;
    indices[ptr++] = v01;
    indices[ptr++] = v11;
  }
}

// Build the BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Material with vertex colors
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
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
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  clock.getDelta(); // delta time available for any animation
  controls.update();
  renderer.render(scene, camera);

  // Set ready flag after first frame
  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
});
```