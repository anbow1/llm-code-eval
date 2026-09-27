

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

// --- OrbitControls ---
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
const STEP = SIZE / (GRID - 1);

const positions: number[] = [];
const colors: number[] = [];
const indices: number[] = [];

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = -SIZE / 2 + j * STEP;
    const z = -SIZE / 2 + i * STEP;

    // Three sine/cosine layers, amplitude ≈ 2
    const y =
      Math.sin(x * 0.8) * Math.cos(z * 0.6) * 1.0 +
      Math.sin(x * 1.5 + z * 1.2) * 0.5 +
      Math.cos(x * 0.4 - z * 0.9) * 0.5;

    positions.push(x, y, z);

    // Vertex colour by height: green → brown → white
    const t = (y + 2) / 4; // normalise to [0, 1]
    let r: number, g: number, b: number;
    if (t < 0.5) {
      // green → brown
      const s = t / 0.5;
      r = 0.2 + (0.6 - 0.2) * s;
      g = 0.7 + (0.4 - 0.7) * s;
      b = 0.2 + (0.2 - 0.2) * s;
    } else {
      // brown → white
      const s = (t - 0.5) / 0.5;
      r = 0.6 + (1.0 - 0.6) * s;
      g = 0.4 + (1.0 - 0.4) * s;
      b = 0.2 + (1.0 - 0.2) * s;
    }
    colors.push(r, g, b);
  }
}

// Index buffer: two triangles per cell, winding for +Y normal
for (let i = 0; i < GRID - 1; i++) {
  for (let j = 0; j < GRID - 1; j++) {
    const v0 = i * GRID + j;
    const v1 = v0 + 1;
    const v2 = v0 + GRID;
    const v3 = v2 + 1;

    // Triangle 1: v0, v2, v1  (CCW from above → +Y)
    indices.push(v0, v2, v1);
    // Triangle 2: v1, v3, v2  (CCW from above → +Y)
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
  roughness: 0.85,
  metalness: 0.05,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
let firstFrame = false;

renderer.setAnimationLoop((time: number) => {
  const delta = 0.016; // approximate; OrbitControls uses its own timing
  controls.update();

  renderer.render(scene, camera);

  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```