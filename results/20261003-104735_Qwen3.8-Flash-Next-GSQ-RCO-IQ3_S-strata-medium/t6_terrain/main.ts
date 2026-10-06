import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88bbee);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 3);
scene.add(dirLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

function height(x: number, z: number): number {
  return (
    1.0 * Math.sin(0.5 * x) * Math.cos(0.3 * z) +
    0.7 * Math.sin(1.2 * x + 0.8 * z) +
    0.3 * Math.cos(2.0 * x) * Math.sin(1.5 * z)
  );
}

const geometry = new THREE.BufferGeometry();

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const y = height(x, z);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Color by height: normalize to [0,1]
    const t = (y + 2.0) / 4.0; // clamp to 0..1
    const clamped = Math.max(0, Math.min(1, t));

    let r: number, g: number, b: number;
    if (clamped < 0.4) {
      // Green low
      r = 0.15; g = 0.7; b = 0.15;
    } else if (clamped < 0.7) {
      // Green → Brown
      const f = (clamped - 0.4) / 0.3;
      r = 0.15 + f * (0.6 - 0.15);
      g = 0.7 + f * (0.35 - 0.7);
      b = 0.15 + f * (0.1 - 0.15);
    } else {
      // Brown → White
      const f = (clamped - 0.7) / 0.3;
      r = 0.6 + f * (1.0 - 0.6);
      g = 0.35 + f * (1.0 - 0.35);
      b = 0.1 + f * (1.0 - 0.1);
    }

    colors[idx * 3 + 0] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer: two triangles per cell, winding so normal points +Y
const indices = new Uint32Array((GRID - 1) * (GRID - 1) * 6);
let ii = 0;
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const v0 = j * GRID + i;
    const v1 = v0 + 1;
    const v2 = v0 + GRID + 1;
    const v3 = v0 + GRID;

    // Triangle 1: v0, v2, v1  (normal = (v2-v0)×(v1-v0) → +Y)
    indices[ii++] = v0;
    indices[ii++] = v2;
    indices[ii++] = v1;

    // Triangle 2: v0, v3, v2  (normal = (v3-v0)×(v2-v0) → +Y)
    indices[ii++] = v0;
    indices[ii++] = v3;
    indices[ii++] = v2;
  }
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
  flatShading: false,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render Loop ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  clock.getDelta(); // delta time available if needed
  controls.update();
  renderer.render(scene, camera);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Mark ready after first frame renders
requestAnimationFrame(() => {
  (window as any).__ready = true;
});
