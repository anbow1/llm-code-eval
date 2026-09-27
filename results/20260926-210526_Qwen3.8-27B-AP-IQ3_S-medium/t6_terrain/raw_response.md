```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

function terrainHeight(x: number, z: number): number {
  return (
    1.0 * Math.sin(x * 0.6) * Math.cos(z * 0.6) +
    0.6 * Math.sin(x * 1.4 + z * 1.1) +
    0.3 * Math.cos(x * 2.8) * Math.sin(z * 2.2)
  );
}

// Compute positions
const positions = new Float32Array(GRID * GRID * 3);
let minY = Infinity;
let maxY = -Infinity;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = (i * GRID + j) * 3;
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const y = terrainHeight(x, z);
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

const range = maxY - minY;

// Compute vertex colors by height
const colors = new Float32Array(GRID * GRID * 3);
const lowColor = new THREE.Color(0.0, 0.6, 0.0);
const midColor = new THREE.Color(0.55, 0.35, 0.12);
const highColor = new THREE.Color(1.0, 1.0, 1.0);

const tmpColor = new THREE.Color();

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const vIdx = i * GRID + j;
    const cIdx = vIdx * 3;
    const y = positions[cIdx + 1];
    const t = (y - minY) / range; // 0..1

    if (t < 0.5) {
      tmpColor.lerpColors(lowColor, midColor, t * 2);
    } else {
      tmpColor.lerpColors(midColor, highColor, (t - 0.5) * 2);
    }

    colors[cIdx] = tmpColor.r;
    colors[cIdx + 1] = tmpColor.g;
    colors[cIdx + 2] = tmpColor.b;
  }
}

// Build index buffer: two triangles per grid cell, winding for +Y normal
const numCellsX = GRID - 1;
const numCellsZ = GRID - 1;
const indices = new Uint32Array(numCellsX * numCellsZ * 6);

let ptr = 0;
for (let j = 0; j < numCellsZ; j++) {
  for (let i = 0; i < numCellsX; i++) {
    const a = i * GRID + j;       // (i,   j  )
    const b = (i + 1) * GRID + j;       // (i+1, j  )
    const c = i * GRID + (j + 1);       // (i,   j+1)
    const d = (i + 1) * GRID + (j + 1); // (i+1, j+1)

    // Triangle 1: A, C, B (CCW from +Y)
    indices[ptr++] = a;
    indices[ptr++] = c;
    indices[ptr++] = b;

    // Triangle 2: A, C, D (CCW from +Y)
    indices[ptr++] = a;
    indices[ptr++] = c;
    indices[ptr++] = d;
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrainMesh);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// --- Resize handling ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// --- Animation loop ---
let firstFrame = true;
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```