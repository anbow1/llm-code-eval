```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 20, 8);
scene.add(dir);

// ---- Terrain geometry ----
const SIZE = 20;
const GRID = 128; // vertices per side (129x129 grid)
const segments = GRID - 1;
const step = SIZE / segments;
const half = SIZE / 2;

// value-noise hash
function hash(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function height(x: number, z: number): number {
  let y = 0;
  y += Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.3) * 1.0;
  y += Math.sin(x * 0.7 + z * 0.8) * 0.5;
  y += noise(x * 0.15, z * 0.15) * 0.6;
  return y;
}

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);
const low = new THREE.Color(0x3a7d2c);
const mid = new THREE.Color(0x8b6437);
const high = new THREE.Color(0xffffff);

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = -half + i * step;
    const z = -half + j * step;
    const y = height(x, z);
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    // color by height (range roughly -1.5..2.1)
    const t = THREE.MathUtils.clamp((y + 1.5) / 3.6, 0, 1);
    const c = new THREE.Color();
    if (t < 0.5) c.copy(low).lerp(mid, t * 2);
    else c.copy(mid).lerp(high, (t - 0.5) * 2);
    colors[idx * 3] = c.r;
    colors[idx * 3 + 1] = c.g;
    colors[idx * 3 + 2] = c.b;
  }
}

const indices: number[] = [];
for (let j = 0; j < segments; j++) {
  for (let i = 0; i < segments; i++) {
    const a = j * GRID + i;
    const b = j * GRID + i + 1;
    const c = (j + 1) * GRID + i;
    const d = (j + 1) * GRID + i + 1;
    // counter-clockwise viewed from +Y => normals point up
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Expose ----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

let ready = false;
renderer.setAnimationLoop((time) => {
  const delta = 0.001 * time; // seconds; unused but time-based
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```