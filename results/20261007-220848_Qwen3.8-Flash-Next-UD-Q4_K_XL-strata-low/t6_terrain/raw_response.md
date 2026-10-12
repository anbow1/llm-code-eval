```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 14, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- Procedural terrain from hand-made BufferGeometry ---
const GRID_SIZE = 128;
const TERRAIN_SIZE = 20;
const halfSize = TERRAIN_SIZE / 2;
const stepX = TERRAIN_SIZE / (GRID_SIZE - 1);
const stepZ = TERRAIN_SIZE / (GRID_SIZE - 1);

// Height function: sum of 3 sine/cosine layers
function getHeight(x: number, z: number): number {
  const h =
    0.8 * Math.sin(x * 1.2 + z * 0.8) +
    0.7 * Math.cos(x * 2.5 - z * 1.8) +
    0.5 * Math.sin(x * 0.6 + z * 3.2);
  return h;
}

// Build vertex positions
const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
let minH = Infinity;
let maxH = -Infinity;

for (let j = 0; j < GRID_SIZE; j++) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const idx = (j * GRID_SIZE + i) * 3;
    const x = -halfSize + i * stepX;
    const z = -halfSize + j * stepZ;
    const y = getHeight(x, z);
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
  }
}

// Build index buffer: two triangles per cell, winding for +Y normals
const indices: number[] = [];
for (let j = 0; j < GRID_SIZE - 1; j++) {
  for (let i = 0; i < GRID_SIZE - 1; i++) {
    const a = j * GRID_SIZE + i;
    const b = j * GRID_SIZE + (i + 1);
    const c = (j + 1) * GRID_SIZE + (i + 1);
    const d = (j + 1) * GRID_SIZE + i;

    // Triangle 1: a, d, b  (CCW from above → +Y normal)
    indices.push(a, d, b);
    // Triangle 2: b, d, c  (CCW from above → +Y normal)
    indices.push(b, d, c);
  }
}

// Build vertex colors based on height
const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
const colorLow = new THREE.Color(0x228b22);   // green
const colorMid = new THREE.Color(0x8b6914);   // brown
const colorHigh = new THREE.Color(0xffffff);  // white

for (let j = 0; j < GRID_SIZE; j++) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const vIdx = (j * GRID_SIZE + i) * 3;
    const h = positions[vIdx + 1];
    const t = (h - minH) / (maxH - minH); // normalize to [0,1]

    const col = new THREE.Color();
    if (t < 0.5) {
      col.lerpColors(colorLow, colorMid, t * 2.0);
    } else {
      col.lerpColors(colorMid, colorHigh, (t - 0.5) * 2.0);
    }

    colors[vIdx] = col.r;
    colors[vIdx + 1] = col.g;
    colors[vIdx + 2] = col.b;
  }
}

// Assemble BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

// Material
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```