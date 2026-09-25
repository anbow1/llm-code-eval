```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(15, 25, 10);
scene.add(sun);

// --- deterministic value noise ---
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smoothNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// --- hand-made BufferGeometry ---
const GRID = 128;
const SIZE = 20;
const SEG = GRID - 1; // 127 cells per side -> 128x128 vertices
const step = SIZE / SEG;

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);
const indices: number[] = [];

const colorLow = new THREE.Color(0x3f7d20);
const colorMid = new THREE.Color(0x8b5a2b);
const colorHigh = new THREE.Color(0xffffff);

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = i * step - SIZE / 2;
    const z = j * step - SIZE / 2;
    const idx = (j * GRID + i) * 3;

    const h =
      Math.sin(x * 0.35 + Math.cos(z * 0.2)) * 0.6 +
      Math.cos(z * 0.45 - x * 0.15) * 0.5 +
      smoothNoise(x * 0.35, z * 0.35) * 1.1 - 0.55;
    const y = h * 2.0;

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    let color: THREE.Color;
    const t = y / 3.0;
    if (t < 0.35) {
      color = colorLow.clone().lerp(colorMid, t / 0.35);
    } else if (t < 0.75) {
      color = colorMid.clone().lerp(colorHigh, (t - 0.35) / 0.4);
    } else {
      color = colorHigh.clone();
    }
    colors[idx] = color.r;
    colors[idx + 1] = color.g;
    colors[idx + 2] = color.b;
  }
}

// Winding: counter-clockwise when viewed from +Y so normals point up
for (let j = 0; j < SEG; j++) {
  for (let i = 0; i < SEG; i++) {
    const a = j * GRID + i;
    const b = j * GRID + i + 1;
    const c = (j + 1) * GRID + i;
    const d = (j + 1) * GRID + i + 1;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

let ready = false;

renderer.setAnimationLoop((timeMs) => {
  const delta = (timeMs || 0) / 1000;
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
  void delta;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```