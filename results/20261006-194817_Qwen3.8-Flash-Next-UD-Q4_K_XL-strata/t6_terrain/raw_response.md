```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const W = 128;
const H = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const SEGX = W - 1;
const SEGZ = H - 1;

// --- Height function: 3 sine/cosine layers, total amplitude ~2 ---
function height(x: number, z: number): number {
  return (
    0.8 * Math.sin(x * 1.5) * Math.cos(z * 1.2) +
    0.6 * Math.sin(x * 0.7 + z * 0.5) +
    0.6 * Math.cos(x * 2.1) * Math.sin(z * 1.8)
  );
}

// --- Positions ---
const positions = new Float32Array(W * H * 3);
const dx = SIZE / (W - 1);
const dz = SIZE / (H - 1);
let maxAbsH = 0;

for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const idx = j * W + i;
    const x = -HALF + i * dx;
    const z = -HALF + j * dz;
    const y = height(x, z);
    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    if (Math.abs(y) > maxAbsH) maxAbsH = Math.abs(y);
  }
}

// --- Index buffer: two triangles per cell, CCW winding => faces point +Y ---
const indices = new Uint32Array(SEGX * SEGZ * 6);
let ii = 0;
for (let j = 0; j < SEGZ; j++) {
  for (let i = 0; i < SEGX; i++) {
    const v0 = j * W + i;
    const v1 = j * W + (i + 1);
    const v2 = (j + 1) * W + (i + 1);
    const v3 = (j + 1) * W + i;
    // Triangle 1: v0, v3, v1  (CCW viewed from +Y)
    indices[ii++] = v0;
    indices[ii++] = v3;
    indices[ii++] = v1;
    // Triangle 2: v1, v3, v2  (CCW viewed from +Y)
    indices[ii++] = v1;
    indices[ii++] = v3;
    indices[ii++] = v2;
  }
}

// --- Vertex colors: green (low) -> brown (mid) -> white (high) ---
const colors = new Float32Array(W * H * 3);
const green = new THREE.Color(0.15, 0.55, 0.10);
const brown = new THREE.Color(0.55, 0.38, 0.18);
const white = new THREE.Color(0.95, 0.95, 0.95);
const tmpColor = new THREE.Color();

for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const idx = j * W + i;
    const y = positions[idx * 3 + 1];
    const t = (y / maxAbsH + 1) * 0.5; // normalize to [0, 1]
    if (t < 0.5) {
      tmpColor.copy(green).lerp(brown, t / 0.5);
    } else {
      tmpColor.copy(brown).lerp(white, (t - 0.5) / 0.5);
    }
    colors[idx * 3 + 0] = tmpColor.r;
    colors[idx * 3 + 1] = tmpColor.g;
    colors[idx * 3 + 2] = tmpColor.b;
  }
}

// --- BufferGeometry ---
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// --- Material & Mesh ---
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.05,
  side: THREE.DoubleSide,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(8, 12, 5);
scene.add(dirLight);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop with delta time ---
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const _delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```