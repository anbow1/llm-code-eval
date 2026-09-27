```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Procedural Terrain
const GRID = 128;
const SIZE = 20;
const SPACING = SIZE / (GRID - 1);

function terrainHeight(x: number, z: number): number {
  return (
    2.0 * Math.sin(x * 0.5) * Math.cos(z * 0.3) +
    1.0 * Math.sin(x * 1.2 + z * 0.8) +
    0.5 * Math.cos(x * 2.5 - z * 1.7)
  );
}

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const MIN_H = -3.5;
const MAX_H = 3.5;

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = (i * GRID + j) * 3;
    const x = -SIZE / 2 + i * SPACING;
    const z = -SIZE / 2 + j * SPACING;
    const y = terrainHeight(x, z);

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    const t = Math.max(0, Math.min(1, (y - MIN_H) / (MAX_H - MIN_H)));
    let r: number, g: number, b: number;

    if (t < 0.5) {
      const s = t / 0.5;
      r = 0.0 * (1 - s) + 0.5 * s;
      g = 0.6 * (1 - s) + 0.3 * s;
      b = 0.0 * (1 - s) + 0.1 * s;
    } else {
      const s = (t - 0.5) / 0.5;
      r = 0.5 * (1 - s) + 1.0 * s;
      g = 0.3 * (1 - s) + 1.0 * s;
      b = 0.1 * (1 - s) + 1.0 * s;
    }

    colors[idx] = r;
    colors[idx + 1] = g;
    colors[idx + 2] = b;
  }
}

const numCells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(numCells * 6);
let ptr = 0;

for (let i = 0; i < GRID - 1; i++) {
  for (let j = 0; j < GRID - 1; j++) {
    const v00 = i * GRID + j;
    const v10 = (i + 1) * GRID + j;
    const v01 = i * GRID + (j + 1);
    const v11 = (i + 1) * GRID + (j + 1);

    // Triangle 1: v00 -> v01 -> v11 (normal points +Y)
    indices[ptr++] = v00;
    indices[ptr++] = v01;
    indices[ptr++] = v11;

    // Triangle 2: v00 -> v11 -> v10 (normal points +Y)
    indices[ptr++] = v00;
    indices[ptr++] = v11;
    indices[ptr++] = v10;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```