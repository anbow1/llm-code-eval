```ts
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
  200
);
camera.position.set(0, 16, 24);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 12, 8);
scene.add(directionalLight);

// --- Procedural Terrain ---
const GRID: number = 128;
const SIZE: number = 20;
const STEP: number = SIZE / (GRID - 1);

function heightAt(x: number, z: number): number {
  return (
    1.2 * Math.sin(0.8 * x) * Math.cos(0.6 * z) +
    0.5 * Math.sin(1.5 * x + 1.2 * z) +
    0.3 * Math.cos(2.5 * x - 1.8 * z)
  );
}

const positions: number[] = [];
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = -SIZE / 2 + i * STEP;
    const z = -SIZE / 2 + j * STEP;
    const y = heightAt(x, z);
    positions.push(x, y, z);
  }
}

// Compute min/max height for color normalization
let minY: number = Infinity;
let maxY: number = -Infinity;
for (let k = 1; k < positions.length; k += 3) {
  const h: number = positions[k];
  if (h < minY) minY = h;
  if (h > maxY) maxY = h;
}
const range: number = maxY - minY;

// Vertex colors: green (low) -> brown (mid) -> white (high)
const colors: number[] = [];
const cGreen: [number, number, number] = [0.1, 0.55, 0.1];
const cBrown: [number, number, number] = [0.45, 0.3, 0.1];
const cWhite: [number, number, number] = [1.0, 1.0, 1.0];

for (let k = 0; k < positions.length; k += 3) {
  const t: number = (positions[k + 1] - minY) / range;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s: number = t * 2.0;
    r = cGreen[0] + s * (cBrown[0] - cGreen[0]);
    g = cGreen[1] + s * (cBrown[1] - cGreen[1]);
    b = cGreen[2] + s * (cBrown[2] - cGreen[2]);
  } else {
    const s: number = (t - 0.5) * 2.0;
    r = cBrown[0] + s * (cWhite[0] - cBrown[0]);
    g = cBrown[1] + s * (cWhite[1] - cBrown[1]);
    b = cBrown[2] + s * (cWhite[2] - cBrown[2]);
  }
  colors.push(r, g, b);
}

// Index buffer: two triangles per cell, winding for +Y normals
const indices: number[] = [];
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const idx0: number = j * GRID + i;
    const idx1: number = j * GRID + i + 1;
    const idx2: number = (j + 1) * GRID + i;
    const idx3: number = (j + 1) * GRID + i + 1;
    // Triangle 1: (idx0, idx2, idx1)
    indices.push(idx0, idx2, idx1);
    // Triangle 2: (idx1, idx2, idx3)
    indices.push(idx1, idx2, idx3);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
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
let firstFrame: boolean = true;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();
  const elapsed: number = clock.getElapsedTime();

  // Subtle ambient rotation to demonstrate time-based motion
  terrain.rotation.y = Math.sin(elapsed * 0.1) * 0.05;

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```