import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 18, 18);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Terrain Geometry (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

function getHeight(x: number, z: number): number {
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.8;
  const h2 = Math.sin(x * 1.3 + 1.0) * Math.cos(z * 1.3 + 0.7) * 0.6;
  const h3 = Math.sin(x * 2.7 + 2.0) * Math.cos(z * 2.7 + 1.4) * 0.4;
  return h1 + h2 + h3;
}

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const y = getHeight(x, z);

    const idx = row * GRID + col;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Vertex color by height: green (low) → brown (mid) → white (high)
    const t = Math.max(0, Math.min(1, (y + 2) / 4));
    let r: number, g: number, b: number;
    if (t < 0.5) {
      const f = t / 0.5;
      r = 0.0 + f * 0.5;
      g = 0.5 + f * (-0.2);
      b = 0.0 + f * 0.1;
    } else {
      const f = (t - 0.5) / 0.5;
      r = 0.5 + f * 0.5;
      g = 0.3 + f * 0.7;
      b = 0.1 + f * 0.9;
    }
    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer: two triangles per cell, CCW winding for +Y normal
const numCells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(numCells * 6);
let ii = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const tl = row * GRID + col;
    const tr = row * GRID + col + 1;
    const bl = (row + 1) * GRID + col;
    const br = (row + 1) * GRID + col + 1;

    // Triangle 1: TL → BR → TR  (normal +Y)
    indices[ii++] = tl;
    indices[ii++] = br;
    indices[ii++] = tr;

    // Triangle 2: TL → BL → BR  (normal +Y)
    indices[ii++] = tl;
    indices[ii++] = bl;
    indices[ii++] = br;
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
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

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

// --- Resize ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop((): void => {
  const delta = clock.getDelta();
  // OrbitControls damping is time-based internally; we simply update each frame.
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
