import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain construction
const GRID = 128;
const SIZE = 20;
const STEP = SIZE / (GRID - 1);
const HALF = SIZE / 2;

function getHeight(x: number, z: number): number {
  const a1 = 1.0 * Math.sin(x * 0.5) * Math.cos(z * 0.5);
  const a2 = 0.6 * Math.sin(x * 1.2 + 1.0) * Math.cos(z * 1.1 - 0.5);
  const a3 = 0.4 * Math.sin(x * 2.5) * Math.cos(z * 2.3 + 0.7);
  return a1 + a2 + a3;
}

// Build positions
const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const minH = -2.0;
const maxH = 2.0;

// Low color: green, mid color: brown, high color: white
const cLow = new THREE.Color(0x2d8a2d);
const cMid = new THREE.Color(0x8b6b3e);
const cHigh = new THREE.Color(0xffffff);

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const y = getHeight(x, z);
    const idx = i * GRID + j;

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Normalize height to 0..1
    const t = Math.max(0, Math.min(1, (y - minH) / (maxH - minH)));

    let r: number, g: number, b: number;
    if (t < 0.5) {
      const s = t / 0.5;
      r = cLow.r + (cMid.r - cLow.r) * s;
      g = cLow.g + (cMid.g - cLow.g) * s;
      b = cLow.b + (cMid.b - cLow.b) * s;
    } else {
      const s = (t - 0.5) / 0.5;
      r = cMid.r + (cHigh.r - cMid.r) * s;
      g = cMid.g + (cHigh.g - cMid.g) * s;
      b = cMid.b + (cHigh.b - cMid.b) * s;
    }

    colors[idx * 3 + 0] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Build index buffer: two triangles per cell, winding for +Y up
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let k = 0;

for (let i = 0; i < GRID - 1; i++) {
  for (let j = 0; j < GRID - 1; j++) {
    const a = i * GRID + j;
    const b = (i + 1) * GRID + j;
    const c = (i + 1) * GRID + (j + 1);
    const d = i * GRID + (j + 1);

    // Triangle 1: A, D, B (normal points +Y)
    indices[k++] = a;
    indices[k++] = d;
    indices[k++] = b;

    // Triangle 2: D, C, B (normal points +Y)
    indices[k++] = d;
    indices[k++] = c;
    indices[k++] = b;
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

const terrainMesh = new THREE.Mesh(geometry, material);
scene.add(terrainMesh);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Animation loop
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const _delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  (window as any).__ready = true;
});
