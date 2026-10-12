```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 14, 16);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 8);
scene.add(dirLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const SPACING = SIZE / (GRID - 1);

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);
const heights = new Float32Array(vertexCount);

// Compute vertex positions with height = sum of 3 sine/cosine layers (~amp 2)
let maxH = -Infinity;
let minH = Infinity;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = -HALF + i * SPACING;
    const z = -HALF + j * SPACING;

    // Three layers of sine/cosine, total amplitude ≈ 2
    const h =
      0.8 * Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.5 + 0.2) +
      0.7 * Math.sin(x * 1.8 - z * 1.4 + 0.5) +
      0.5 * Math.cos(x * 3.1 + z * 2.7 - 0.8);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = h;
    positions[idx * 3 + 2] = z;
    heights[idx] = h;

    if (h > maxH) maxH = h;
    if (h < minH) minH = h;
  }
}

// Vertex colors: green (low) → brown (mid) → white (high)
const greenLow = new THREE.Color(0.15, 0.6, 0.1);
const brownMid = new THREE.Color(0.55, 0.38, 0.2);
const whiteHigh = new THREE.Color(0.95, 0.95, 0.95);
const tmpColor = new THREE.Color();

for (let idx = 0; idx < vertexCount; idx++) {
  const t = (heights[idx] - minH) / (maxH - minH); // 0..1

  if (t < 0.5) {
    const s = t * 2; // 0..1
    tmpColor.copy(greenLow).lerp(brownMid, s);
  } else {
    const s = (t - 0.5) * 2; // 0..1
    tmpColor.copy(brownMid).lerp(whiteHigh, s);
  }

  colors[idx * 3 + 0] = tmpColor.r;
  colors[idx * 3 + 1] = tmpColor.g;
  colors[idx * 3 + 2] = tmpColor.b;
}

// Index buffer: two triangles per cell, winding for normals pointing +Y
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let face = 0;

for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const v0 = j * GRID + i;         // (i, j)
    const v1 = j * GRID + i + 1;     // (i+1, j)
    const v2 = (j + 1) * GRID + i;   // (i, j+1)
    const v3 = (j + 1) * GRID + i + 1; // (i+1, j+1)

    // Triangle 1: v0, v2, v1  → CCW from above → normal +Y
    indices[face++] = v0;
    indices[face++] = v2;
    indices[face++] = v1;

    // Triangle 2: v1, v2, v3  → CCW from above → normal +Y
    indices[face++] = v1;
    indices[face++] = v2;
    indices[face++] = v3;
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
controls.minDistance = 5;
controls.maxDistance = 60;

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