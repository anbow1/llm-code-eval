```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(18, 16, 18);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(12, 20, 8);
scene.add(directionalLight);

// --- Procedural Terrain ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

function getHeight(x: number, z: number): number {
  const h1 = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 0.8;
  const h2 = Math.sin(x * 1.5 + 1.0) * Math.cos(z * 1.2 + 0.5) * 0.6;
  const h3 = Math.sin(x * 3.0 + 2.0) * Math.cos(z * 2.5 + 1.5) * 0.4;
  return h1 + h2 + h3;
}

const colorLow = new THREE.Color(0x2d6a27);
const colorMid = new THREE.Color(0x8b6914);
const colorHigh = new THREE.Color(0xffffff);
const tmpColor = new THREE.Color();

function getTerrainColor(h: number, out: THREE.Color): void {
  const t = Math.max(0, Math.min(1, (h + 2) / 4));
  if (t < 0.5) {
    const f = t / 0.5;
    out.copy(colorLow).lerp(colorMid, f);
  } else {
    const f = (t - 0.5) / 0.5;
    out.copy(colorMid).lerp(colorHigh, f);
  }
}

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const y = getHeight(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    getTerrainColor(y, tmpColor);
    colors[idx * 3] = tmpColor.r;
    colors[idx * 3 + 1] = tmpColor.g;
    colors[idx * 3 + 2] = tmpColor.b;
  }
}

// Index buffer: two triangles per cell, CCW winding for +Y normal
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let ii = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const a = row * GRID + col;
    const b = row * GRID + col + 1;
    const c = (row + 1) * GRID + col;
    const d = (row + 1) * GRID + col + 1;

    // Triangle 1: a -> c -> b
    indices[ii++] = a;
    indices[ii++] = c;
    indices[ii++] = b;

    // Triangle 2: b -> c -> d
    indices[ii++] = b;
    indices[ii++] = c;
    indices[ii++] = d;
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```