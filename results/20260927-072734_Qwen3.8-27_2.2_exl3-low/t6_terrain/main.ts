import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const N = 128;
const SIZE = 20;
const step = SIZE / (N - 1);

const positions = new Float32Array(N * N * 3);
const colors = new Float32Array(N * N * 3);

function heightAt(x: number, z: number): number {
  const h1 = 1.0 * Math.sin(2 * Math.PI * x / SIZE) * Math.cos(2 * Math.PI * z / SIZE);
  const h2 = 0.5 * Math.sin(4 * Math.PI * x / SIZE) * Math.cos(4 * Math.PI * z / SIZE);
  const h3 = 0.5 * Math.sin(8 * Math.PI * x / SIZE) * Math.cos(8 * Math.PI * z / SIZE);
  return h1 + h2 + h3;
}

function colorForHeight(h: number): [number, number, number] {
  // h ranges roughly -2 to +2
  const t = (h + 2) / 4; // 0..1
  let r: number, g: number, b: number;
  if (t < 0.5) {
    // green -> brown
    const f = t / 0.5;
    r = 0.1 + f * 0.4;
    g = 0.6 - f * 0.3;
    b = 0.1 + f * 0.0;
  } else {
    // brown -> white
    const f = (t - 0.5) / 0.5;
    r = 0.5 + f * 0.5;
    g = 0.3 + f * 0.7;
    b = 0.1 + f * 0.9;
  }
  return [r, g, b];
}

for (let i = 0; i < N; i++) {
  for (let j = 0; j < N; j++) {
    const idx = i * N + j;
    const x = -SIZE / 2 + i * step;
    const z = -SIZE / 2 + j * step;
    const y = heightAt(x, z);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    const [r, g, b] = colorForHeight(y);
    colors[idx * 3 + 0] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// --- Index buffer: two triangles per cell, faces pointing +Y ---
const indexCount = (N - 1) * (N - 1) * 2 * 3;
const indices = new Uint32Array(indexCount);
let ptr = 0;

for (let i = 0; i < N - 1; i++) {
  for (let j = 0; j < N - 1; j++) {
    const v0 = i * N + j;
    const v1 = (i + 1) * N + j;
    const v2 = i * N + (j + 1);
    const v3 = (i + 1) * N + (j + 1);

    // Triangle 1: v0, v2, v1 (CCW from above → normal +Y)
    indices[ptr++] = v0;
    indices[ptr++] = v2;
    indices[ptr++] = v1;

    // Triangle 2: v2, v3, v1 (CCW from above → normal +Y)
    indices[ptr++] = v2;
    indices[ptr++] = v3;
    indices[ptr++] = v1;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.0,
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

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop(() => {
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
