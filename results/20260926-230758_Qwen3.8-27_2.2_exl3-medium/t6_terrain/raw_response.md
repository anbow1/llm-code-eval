

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
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
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID: number = 128;
const SIZE: number = 20;
const SPACING: number = SIZE / (GRID - 1);
const VERT_COUNT: number = GRID * GRID;
const CELL_COUNT: number = (GRID - 1) * (GRID - 1);
const TRI_COUNT: number = CELL_COUNT * 2;
const INDEX_COUNT: number = TRI_COUNT * 3;

const positions: Float32Array = new Float32Array(VERT_COUNT * 3);
const colors: Float32Array = new Float32Array(VERT_COUNT * 3);
const indices: Uint32Array = new Uint32Array(INDEX_COUNT);

// Height function: 3 sine/cosine layers, total amplitude ≈ 2
function heightAt(x: number, z: number): number {
  const h1: number = Math.sin(x * 0.5) * 0.8;
  const h2: number = Math.cos(z * 0.7) * 0.7;
  const h3: number = Math.sin((x + z) * 0.3) * 0.5;
  return h1 + h2 + h3;
}

// Fill position and color buffers
for (let i: number = 0; i < GRID; i++) {
  for (let j: number = 0; j < GRID; j++) {
    const idx: number = i * GRID + j;
    const x: number = -SIZE / 2 + i * SPACING;
    const z: number = -SIZE / 2 + j * SPACING;
    const y: number = heightAt(x, z);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Vertex colour by height: green → brown → white
    const t: number = (y + 2) / 4; // normalise to [0, 1]
    let r: number;
    let g: number;
    let b: number;
    if (t < 0.5) {
      const f: number = t / 0.5;
      r = 0.1 + f * 0.4;
      g = 0.5 - f * 0.2;
      b = 0.0 + f * 0.1;
    } else {
      const f: number = (t - 0.5) / 0.5;
      r = 0.5 + f * 0.5;
      g = 0.3 + f * 0.7;
      b = 0.1 + f * 0.9;
    }

    colors[idx * 3 + 0] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Fill index buffer: two triangles per cell, winding for +Y normals
let ptr: number = 0;
for (let i: number = 0; i < GRID - 1; i++) {
  for (let j: number = 0; j < GRID - 1; j++) {
    const v0: number = i * GRID + j;
    const v1: number = (i + 1) * GRID + j;
    const v2: number = i * GRID + (j + 1);
    const v3: number = (i + 1) * GRID + (j + 1);

    // Triangle 1: v0 → v3 → v1  (CCW from above → normal +Y)
    indices[ptr++] = v0;
    indices[ptr++] = v3;
    indices[ptr++] = v1;

    // Triangle 2: v1 → v2 → v3  (CCW from above → normal +Y)
    indices[ptr++] = v1;
    indices[ptr++] = v2;
    indices[ptr++] = v3;
  }
}

const geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain: THREE.Mesh = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- OrbitControls ---
const controls: OrbitControls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// --- Resize handling ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let ready: boolean = false;
renderer.setAnimationLoop((_time: number): void => {
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```