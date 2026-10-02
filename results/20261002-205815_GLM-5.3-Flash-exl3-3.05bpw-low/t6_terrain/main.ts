import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 12, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 15, 8);
scene.add(dir);

// Hand-built terrain geometry
const N = 128;          // vertices per side
const SIZE = 20;        // world units
const SEG = N - 1;
const step = SIZE / SEG;

// Value noise
function hash(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function valueNoise(x: number, y: number): number {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function height(x: number, z: number): number {
  return (
    Math.sin(x * 0.35) * Math.cos(z * 0.3) * 1.2 +
    Math.cos(x * 0.8 + 1.3) * Math.sin(z * 0.7 + 0.5) * 0.6 +
    (valueNoise(x * 0.15 + 10, z * 0.15 + 10) - 0.5) * 1.0
  );
}

const positions = new Float32Array(N * N * 3);
const colors = new Float32Array(N * N * 3);
let minH = Infinity, maxH = -Infinity;

for (let iz = 0; iz < N; iz++) {
  for (let ix = 0; ix < N; ix++) {
    const x = -SIZE / 2 + ix * step;
    const z = -SIZE / 2 + iz * step;
    const y = height(x, z);
    const idx = (iz * N + ix) * 3;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
  }
}

const green = new THREE.Color(0x3d8b37);
const brown = new THREE.Color(0x8b6f47);
const white = new THREE.Color(0xf0f0f0);
const c = new THREE.Color();

for (let i = 0; i < N * N; i++) {
  const y = positions[i * 3 + 1];
  const t = (y - minH) / (maxH - minH);
  if (t < 0.4) {
    c.copy(green).lerp(brown, t / 0.4);
  } else {
    c.copy(brown).lerp(white, (t - 0.4) / 0.6);
  }
  colors[i * 3] = c.r;
  colors[i * 3 + 1] = c.g;
  colors[i * 3 + 2] = c.b;
}

const indices: number[] = [];
for (let iz = 0; iz < SEG; iz++) {
  for (let ix = 0; ix < SEG; ix++) {
    const a = iz * N + ix;
    const b = a + 1;
    const cc = a + N;
    const d = a + N + 1;
    // CCW from above (+Y) winding
    indices.push(a, d, b);
    indices.push(a, cc, d);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
renderer.setAnimationLoop((time) => {
  const delta = (time - (renderer as any).__lastTime ?? 0) as number;
  (renderer as any).__lastTime = time;
  const _dt = delta; // delta in ms
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
