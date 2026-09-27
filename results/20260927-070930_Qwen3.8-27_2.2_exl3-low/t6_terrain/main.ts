import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// --- Procedural Terrain ---
const SIZE = 128;
const WORLD_SIZE = 20;
const SPACING = WORLD_SIZE / (SIZE - 1);
const HALF = WORLD_SIZE / 2;

function height(x: number, z: number): number {
  const h1 = Math.sin(x * 1.2) * 0.8;
  const h2 = Math.cos(z * 1.5) * 0.7;
  const h3 = Math.sin((x + z) * 0.8) * 0.5;
  return h1 + h2 + h3;
}

const positions: number[] = [];
const colors: number[] = [];

for (let j = 0; j < SIZE; j++) {
  for (let i = 0; i < SIZE; i++) {
    const x = -HALF + i * SPACING;
    const z = -HALF + j * SPACING;
    const y = height(x, z);
    positions.push(x, y, z);

    // Vertex color: green (low) → brown (mid) → white (high)
    const t = (y + 2) / 4; // normalise to ~0..1
    if (t < 0.5) {
      const f = t / 0.5;
      colors.push(0.2 + f * 0.5, 0.6 - f * 0.3, 0.1);
    } else {
      const f = (t - 0.5) / 0.5;
      colors.push(0.7 + f * 0.3, 0.3 + f * 0.7, 0.1 + f * 0.9);
    }
  }
}

// Index buffer – two triangles per cell, CCW from above → +Y normal
const indices: number[] = [];
for (let j = 0; j < SIZE - 1; j++) {
  for (let i = 0; i < SIZE - 1; i++) {
    const v0 = j * SIZE + i;
    const v1 = j * SIZE + (i + 1);
    const v2 = (j + 1) * SIZE + i;
    const v3 = (j + 1) * SIZE + (i + 1);
    indices.push(v0, v1, v2);
    indices.push(v1, v3, v2);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
renderer.setAnimationLoop((_time: number) => {
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
