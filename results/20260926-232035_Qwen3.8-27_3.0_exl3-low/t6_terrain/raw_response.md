

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 18, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Procedural Terrain ---
const SIZE = 128;
const EXTENT = 20;
const HALF = EXTENT / 2;
const STEP = EXTENT / (SIZE - 1);

// Height function: 3 sine/cosine layers, total amplitude ~2
function heightAt(x: number, z: number): number {
  const a1 = 1.0;
  const a2 = 0.6;
  const a3 = 0.4;
  const f1x = 0.3;
  const f1z = 0.4;
  const f2x = 0.7;
  const f2z = 0.5;
  const f3x = 1.2;
  const f3z = 1.0;

  const h1 = a1 * Math.sin(f1x * x) * Math.cos(f1z * z);
  const h2 = a2 * Math.sin(f2x * x + f2z * z);
  const h3 = a3 * Math.cos(f3x * x) * Math.sin(f3z * z);
  return h1 + h2 + h3;
}

// Build positions
const positions = new Float32Array(SIZE * SIZE * 3);
for (let j = 0; j < SIZE; j++) {
  for (let i = 0; i < SIZE; i++) {
    const idx = j * SIZE + i;
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const y = heightAt(x, z);
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
  }
}

// Build index buffer: two triangles per cell, winding for +Y normals
const cellCount = (SIZE - 1) * (SIZE - 1);
const indices = new Uint32Array(cellCount * 6);
let k = 0;
for (let j = 0; j < SIZE - 1; j++) {
  for (let i = 0; i < SIZE - 1; i++) {
    const v00 = j * SIZE + i;
    const v10 = j * SIZE + i + 1;
    const v01 = (j + 1) * SIZE + i;
    const v11 = (j + 1) * SIZE + i + 1;

    // Triangle 1: v00, v01, v11
    indices[k++] = v00;
    indices[k++] = v01;
    indices[k++] = v11;
    // Triangle 2: v00, v11, v10
    indices[k++] = v00;
    indices[k++] = v11;
    indices[k++] = v10;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Vertex colors by height
const colors = new Float32Array(SIZE * SIZE * 3);
// Find min/max height for normalization
let hMin = Infinity;
let hMax = -Infinity;
for (let i = 0; i < SIZE * SIZE; i++) {
  const y = positions[i * 3 + 1];
  if (y < hMin) hMin = y;
  if (y > hMax) hMax = y;
}
const hRange = hMax - hMin;

// Color stops: green (low), brown (middle), white (high)
const cLow = new THREE.Color(0.15, 0.55, 0.15);
const cMid = new THREE.Color(0.55, 0.35, 0.15);
const cHigh = new THREE.Color(1.0, 1.0, 1.0);

for (let i = 0; i < SIZE * SIZE; i++) {
  const y = positions[i * 3 + 1];
  const t = (y - hMin) / hRange;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s = t / 0.5;
    r = cLow.r + (cMid.r - cLow.r) * s;
    g = cLow.g + (cMid.g - cLow.g) * s;
    b = cLow.b + (cMid.b - cLow.b) * s;
  } else {
    const s = (t - 0.5) / 0.5;
    r = cMid.r + (cHigh.r - cMid.r) * s;
    g = cMid.g + (cHigh.g - cMid.g) * s;
    b = cMid.b + (cHigh.b - cMid.b) * s;
  }
  colors[i * 3] = r;
  colors[i * 3 + 1] = g;
  colors[i * 3 + 2] = b;
}
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Controls ---
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

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```