```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;

function heightAt(x: number, z: number): number {
  let h = 0;
  h += 0.8 * Math.sin(x * 0.7 + z * 0.5);
  h += 0.6 * Math.cos(x * 1.3 - z * 0.9);
  h += 0.6 * Math.sin((x + z) * 0.4);
  return h;
}

// --- Build hand-made BufferGeometry ---
const vertCount = GRID * GRID;
const positions = new Float32Array(vertCount * 3);
const colors = new Float32Array(vertCount * 3);

let minH = Infinity;
let maxH = -Infinity;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = -HALF + (i / (GRID - 1)) * SIZE;
    const z = -HALF + (j / (GRID - 1)) * SIZE;
    const y = heightAt(x, z);
    const idx = (j * GRID + i) * 3;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
  }
}

const range = maxH - minH;
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = (j * GRID + i) * 3;
    const h = (positions[idx + 1] - minH) / range; // 0..1
    let r: number, g: number, b: number;
    if (h < 0.5) {
      const t = h / 0.5;
      r = 0.2 + t * 0.3;
      g = 0.6 - t * 0.3;
      b = 0.2 - t * 0.05;
    } else {
      const t = (h - 0.5) / 0.5;
      r = 0.5 + t * 0.4;
      g = 0.3 + t * 0.6;
      b = 0.15 + t * 0.75;
    }
    colors[idx] = r;
    colors[idx + 1] = g;
    colors[idx + 2] = b;
  }
}

const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let idxOff = 0;
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const v0 = j * GRID + i;
    const v1 = j * GRID + (i + 1);
    const v2 = (j + 1) * GRID + (i + 1);
    const v3 = (j + 1) * GRID + i;
    indices[idxOff++] = v0;
    indices[idxOff++] = v2;
    indices[idxOff++] = v1;
    indices[idxOff++] = v0;
    indices[idxOff++] = v3;
    indices[idxOff++] = v2;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: false,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 15, 8);
scene.add(dirLight);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 14, 12);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.canvas);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.minDistance = 5;
controls.maxDistance = 50;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// --- Resize handler ---
function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop((): void => {
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```