import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID: number = 128;
const SIZE: number = 20;
const SPACING: number = SIZE / (GRID - 1);

const vertexCount: number = GRID * GRID;
const triangleCount: number = (GRID - 1) * (GRID - 1) * 2;

const positions: Float32Array = new Float32Array(vertexCount * 3);
const colors: Float32Array = new Float32Array(vertexCount * 3);
const indices: Uint32Array = new Uint32Array(triangleCount * 3);

// Height: 3 sine/cosine layers, max amplitude ≈ 2
function heightAt(x: number, z: number): number {
  const h1: number = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 1.0;
  const h2: number = Math.sin(x * 1.5 + z * 1.2) * 0.7;
  const h3: number = Math.cos(x * 2.5) * Math.sin(z * 2.0) * 0.3;
  return h1 + h2 + h3;
}

// Fill vertex positions and vertex colors
for (let j: number = 0; j < GRID; j++) {
  for (let i: number = 0; i < GRID; i++) {
    const idx: number = j * GRID + i;
    const x: number = -SIZE / 2 + i * SPACING;
    const z: number = -SIZE / 2 + j * SPACING;
    const y: number = heightAt(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Vertex color by height: green (low) → brown (mid) → white (high)
    const t: number = (y + 2) / 4; // normalise to [0, 1]
    let r: number;
    let g: number;
    let b: number;
    if (t < 0.5) {
      const s: number = t / 0.5;
      r = 0.0 + s * 0.5;
      g = 0.4 + s * (-0.1);
      b = 0.0 + s * 0.1;
    } else {
      const s: number = (t - 0.5) / 0.5;
      r = 0.5 + s * 0.5;
      g = 0.3 + s * 0.7;
      b = 0.1 + s * 0.9;
    }
    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Fill index buffer – two triangles per cell, winding for +Y normal
let idxPtr: number = 0;
for (let j: number = 0; j < GRID - 1; j++) {
  for (let i: number = 0; i < GRID - 1; i++) {
    const v0: number = j * GRID + i;
    const v1: number = j * GRID + (i + 1);
    const v2: number = (j + 1) * GRID + (i + 1);
    const v3: number = (j + 1) * GRID + i;

    // Triangle 1: v0 → v2 → v1  (normal points +Y)
    indices[idxPtr] = v0;
    indices[idxPtr + 1] = v2;
    indices[idxPtr + 2] = v1;
    idxPtr += 3;

    // Triangle 2: v0 → v3 → v2  (normal points +Y)
    indices[idxPtr] = v0;
    indices[idxPtr + 1] = v3;
    indices[idxPtr + 2] = v2;
    idxPtr += 3;
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

// --- Resize handling ---
window.addEventListener('resize', () => {
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

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
