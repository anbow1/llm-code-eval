import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 14, 22);
camera.lookAt(0, 0, 0);

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

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

// Height function: 3 sine/cosine layers, total amplitude ~2
function getHeight(x: number, z: number): number {
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
  const h2 = Math.sin(x * 1.2 + 0.5) * Math.cos(z * 0.8 + 0.3) * 0.7;
  const h3 = Math.sin(x * 2.5 + 1.0) * Math.cos(z * 2.0 + 0.7) * 0.3;
  return h1 + h2 + h3;
}

// Color interpolation: green (low) -> brown (mid) -> white (high)
function heightToColor(h: number, out: Float32Array, idx: number): void {
  // Normalize height to [0, 1] assuming range [-2, 2]
  const t = Math.max(0, Math.min(1, (h + 2) / 4));

  let r: number, g: number, b: number;
  if (t < 0.5) {
    // Green to Brown
    const f = t / 0.5;
    r = 0.2 + (0.5 - 0.2) * f;
    g = 0.6 + (0.35 - 0.6) * f;
    b = 0.2 + (0.2 - 0.2) * f;
  } else {
    // Brown to White
    const f = (t - 0.5) / 0.5;
    r = 0.5 + (1.0 - 0.5) * f;
    g = 0.35 + (1.0 - 0.35) * f;
    b = 0.2 + (1.0 - 0.2) * f;
  }

  out[idx * 3] = r;
  out[idx * 3 + 1] = g;
  out[idx * 3 + 2] = b;
}

// Fill positions and colors
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const y = getHeight(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    heightToColor(y, colors, idx);
  }
}

// Build index buffer: two triangles per cell, winding for +Y normals
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);

let iPtr = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const a = row * GRID + col;
    const b = a + 1;
    const c = a + GRID;
    const d = c + 1;

    // Triangle 1: a, c, b  (normal points +Y)
    indices[iPtr++] = a;
    indices[iPtr++] = c;
    indices[iPtr++] = b;

    // Triangle 2: b, c, d  (normal points +Y)
    indices[iPtr++] = b;
    indices[iPtr++] = c;
    indices[iPtr++] = d;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// --- Terrain Mesh ---
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
  side: THREE.FrontSide,
});

const terrainMesh = new THREE.Mesh(geometry, material);
scene.add(terrainMesh);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.maxDistance = 60;
controls.minDistance = 5;
controls.update();

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// --- Resize handling ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Animation loop ---
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
