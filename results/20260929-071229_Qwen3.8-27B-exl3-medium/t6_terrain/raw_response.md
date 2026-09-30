

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
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 14, 14);
camera.lookAt(0, 0, 0);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

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

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

// Height function: 3 sine/cosine layers, total amplitude ≈ 2
function getHeight(x: number, z: number): number {
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.8;
  const h2 = Math.sin(x * 1.2 + 1.0) * Math.cos(z * 0.8 + 0.5) * 0.7;
  const h3 = Math.sin(x * 2.5 + 2.0) * Math.cos(z * 2.0 + 1.5) * 0.5;
  return h1 + h2 + h3;
}

// Color interpolation: green (low) → brown (mid) → white (high)
function lerpColor(
  out: Float32Array,
  offset: number,
  t: number
): void {
  // t is normalized 0..1
  const green = [0.2, 0.6, 0.2];
  const brown = [0.5, 0.35, 0.2];
  const white = [1.0, 1.0, 1.0];

  let r: number, g: number, b: number;
  if (t < 0.5) {
    const f = t / 0.5;
    r = green[0] + (brown[0] - green[0]) * f;
    g = green[1] + (brown[1] - green[1]) * f;
    b = green[2] + (brown[2] - green[2]) * f;
  } else {
    const f = (t - 0.5) / 0.5;
    r = brown[0] + (white[0] - brown[0]) * f;
    g = brown[1] + (white[1] - brown[1]) * f;
    b = brown[2] + (white[2] - brown[2]) * f;
  }
  out[offset] = r;
  out[offset + 1] = g;
  out[offset + 2] = b;
}

let minY = Infinity;
let maxY = -Infinity;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const y = getHeight(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

// Assign vertex colors based on normalized height
for (let idx = 0; idx < vertexCount; idx++) {
  const y = positions[idx * 3 + 1];
  const t = (y - minY) / (maxY - minY);
  lerpColor(colors, idx * 3, t);
}

// Index buffer: two triangles per cell, CCW winding for +Y normal
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let ptr = 0;

for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const a = j * GRID + i;
    const b = j * GRID + (i + 1);
    const c = (j + 1) * GRID + i;
    const d = (j + 1) * GRID + (i + 1);

    // Triangle 1: a, c, d
    indices[ptr++] = a;
    indices[ptr++] = c;
    indices[ptr++] = d;

    // Triangle 2: a, d, b
    indices[ptr++] = a;
    indices[ptr++] = d;
    indices[ptr++] = b;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.FrontSide,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

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
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Subtle camera drift for visual interest (uses elapsed time)
  // controls.target stays at origin; we gently orbit the light
  directionalLight.position.x = 10 + Math.sin(elapsed * 0.3) * 3;
  directionalLight.position.z = 10 + Math.cos(elapsed * 0.3) * 3;

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```