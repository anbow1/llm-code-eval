import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---- Scene & camera ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a5c4);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 12, 16);
camera.lookAt(0, 0, 0);

// ---- Lights ----
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 18, 8);
scene.add(dir);

// ---- Terrain geometry (hand-made BufferGeometry) ----
const GRID = 128;               // 128x128 vertices
const SIZE = 20;                // 20 x 20 units in XZ
const SEG = GRID - 1;           // 127 cells per axis

function terrainHeight(x: number, z: number): number {
  // Sum of 3 sine/cosine layers, amplitude ~2
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5);
  const h2 = Math.sin(x * 1.3 + 2.1) * Math.cos(z * 1.1 - 1.4) * 0.6;
  const h3 = Math.sin(x * 2.7 - 0.8) * Math.cos(z * 2.3 + 0.9) * 0.35;
  return (h1 + h2 + h3) * (2 / 1.95); // scale so peak-to-peak ~ 2
}

const positions: number[] = [];
const colors: number[] = [];

const low = new THREE.Color(0x2e7d32);   // green
const mid = new THREE.Color(0x8d6e63);   // brown
const high = new THREE.Color(0xffffff);  // white

let minH = Infinity;
let maxH = -Infinity;

const heights: number[] = new Array(GRID * GRID);

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = -SIZE / 2 + (i / SEG) * SIZE;
    const z = -SIZE / 2 + (j / SEG) * SIZE;
    const h = terrainHeight(x, z);
    heights[j * GRID + i] = h;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
    positions.push(x, h, z);
  }
}

// Normalize heights for coloring
const heightAt = (i: number, j: number): number => {
  const h = heights[j * GRID + i];
  const t = maxH > minH ? (h - minH) / (maxH - minH) : 0;
  const c = new THREE.Color();
  if (t < 0.5) {
    c.copy(low).lerp(mid, t / 0.5);
  } else {
    c.copy(mid).lerp(high, (t - 0.5) / 0.5);
  }
  colors.push(c.r, c.g, c.b);
  return h;
};

// Rebuild colors pass (positions already pushed above)
colors.length = 0;
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    heightAt(i, j);
  }
}

// Index buffer: two triangles per cell, wound for +Y-facing normals
const index: number[] = [];
for (let j = 0; j < SEG; j++) {
  for (let i = 0; i < SEG; i++) {
    const a = j * GRID + i;
    const b = a + 1;
    const c = a + GRID;
    const d = c + 1;
    // Triangles (a, c, b) and (b, c, d) are CCW when viewed from +Y
    index.push(a, c, b);
    index.push(b, c, d);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(index);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ---- Controls ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Render loop ----
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Subtle light orbit for visual interest (delta/elapsed based)
  dir.position.x = 10 * Math.cos(elapsed * 0.1);
  dir.position.z = 10 * Math.sin(elapsed * 0.1);

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---- Expose for testing ----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
