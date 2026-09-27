

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Terrain geometry
const GRID = 128;
const SIZE = 20;
const STEP = SIZE / (GRID - 1);

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

function heightAt(x: number, z: number): number {
  const l1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
  const l2 = Math.sin(x * 1.2 + 1.0) * Math.cos(z * 0.8 + 0.5) * 0.6;
  const l3 = Math.sin(x * 2.5 + 2.0) * Math.cos(z * 2.0 + 1.0) * 0.4;
  return l1 + l2 + l3;
}

function heightToColor(h: number, out: Float32Array, offset: number): void {
  // Normalize height to 0..1 (height range is roughly -2..2)
  const t = (h + 2) / 4;
  const clamped = Math.max(0, Math.min(1, t));

  let r: number, g: number, b: number;
  if (clamped < 0.5) {
    // Green to brown
    const f = clamped / 0.5;
    r = 0.2 + f * (0.55 - 0.2);
    g = 0.6 + f * (0.35 - 0.6);
    b = 0.15 + f * (0.15 - 0.15);
  } else {
    // Brown to white
    const f = (clamped - 0.5) / 0.5;
    r = 0.55 + f * (1.0 - 0.55);
    g = 0.35 + f * (1.0 - 0.35);
    b = 0.15 + f * (1.0 - 0.15);
  }

  out[offset] = r;
  out[offset + 1] = g;
  out[offset + 2] = b;
}

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = -SIZE / 2 + i * STEP;
    const z = -SIZE / 2 + j * STEP;
    const y = heightAt(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    heightToColor(y, colors, idx * 3);
  }
}

// Index buffer: two triangles per cell, CCW when viewed from above (+Y)
const indices: number[] = [];
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const v0 = j * GRID + i;
    const v1 = j * GRID + (i + 1);
    const v2 = (j + 1) * GRID + i;
    const v3 = (j + 1) * GRID + (i + 1);

    // Triangle 1: v0, v2, v1
    indices.push(v0, v2, v1);
    // Triangle 2: v1, v2, v3
    indices.push(v1, v2, v3);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Resize handler
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
```