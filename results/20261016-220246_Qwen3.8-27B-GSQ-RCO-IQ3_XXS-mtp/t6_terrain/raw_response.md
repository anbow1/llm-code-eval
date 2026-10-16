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
  500
);
camera.position.set(18, 22, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Procedural terrain: hand-made BufferGeometry ---
const GRID = 128; // 128x128 vertices
const CELLS = GRID - 1; // 127x127 cells
const SIZE = 20; // 20x20 units in XZ, centered at origin
const STEP = SIZE / CELLS;

// Height function: 3 sine/cosine layers, total amplitude ~2
function heightAt(x: number, z: number): number {
  const f1 = (2 * Math.PI * 3) / SIZE; // frequency layer 1
  const f2 = (2 * Math.PI * 5) / SIZE; // frequency layer 2
  const f3 = (2 * Math.PI * 7) / SIZE; // frequency layer 3
  const a1 = 1.0;
  const a2 = 0.6;
  const a3 = 0.4;

  const layer1 = a1 * Math.sin(f1 * x) * Math.cos(f1 * z * 0.7);
  const layer2 = a2 * Math.sin(f2 * z + 1.3);
  const layer3 = a3 * Math.cos(f3 * x + 2.1);

  return layer1 + layer2 + layer3;
}

// Build position buffer
const positions: number[] = new Array(GRID * GRID * 3);
const colors: number[] = new Array(GRID * GRID * 3);

// Track min/max height for color normalization
let hMin = Infinity;
let hMax = -Infinity;

for (let i = 0; i < GRID; i++) {
  const z = -SIZE / 2 + i * STEP;
  for (let j = 0; j < GRID; j++) {
    const x = -SIZE / 2 + j * STEP;
    const y = heightAt(x, z);
    const idx = (i * GRID + j) * 3;

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    if (y < hMin) hMin = y;
    if (y > hMax) hMax = y;
  }
}

// Vertex colors by height: green (low) -> brown (mid) -> white (high)
const green = new THREE.Color(0x228b22);
const brown = new THREE.Color(0x8b4513);
const white = new THREE.Color(0xffffff);

for (let i = 0; i < GRID; i++) {
  const z = -SIZE / 2 + i * STEP;
  for (let j = 0; j < GRID; j++) {
    const x = -SIZE / 2 + j * STEP;
    const y = heightAt(x, z);
    const t = (y - hMin) / (hMax - hMin); // normalized 0..1
    const idx = (i * GRID + j) * 3;

    let r: number, g: number, b: number;
    if (t < 0.5) {
      // green -> brown
      const s = t * 2;
      r = green.r + (brown.r - green.r) * s;
      g = green.g + (brown.g - green.g) * s;
      b = green.b + (brown.b - green.b) * s;
    } else {
      // brown -> white
      const s = (t - 0.5) * 2;
      r = brown.r + (white.r - brown.r) * s;
      g = brown.g + (white.g - brown.g) * s;
      b = brown.b + (white.b - brown.b) * s;
    }

    colors[idx] = r;
    colors[idx + 1] = g;
    colors[idx + 2] = b;
  }
}

// Index buffer: two triangles per grid cell
// Winding so normals point +Y:
//   Triangle 1: (i,j), (i+1,j+1), (i,j+1)
//   Triangle 2: (i,j), (i+1,j), (i+1,j+1)
const indices: number[] = new Array(CELLS * CELLS * 6);
let k = 0;

for (let i = 0; i < CELLS; i++) {
  for (let j = 0; j < CELLS; j++) {
    const a = i * GRID + j;
    const b = i * GRID + (j + 1);
    const c = (i + 1) * GRID + j;
    const d = (i + 1) * GRID + (j + 1);

    // Triangle 1: a, d, b
    indices[k++] = a;
    indices[k++] = d;
    indices[k++] = b;

    // Triangle 2: a, c, d
    indices[k++] = a;
    indices[k++] = c;
    indices[k++] = d;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.FrontSide
});

const terrainMesh = new THREE.Mesh(geometry, material);
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