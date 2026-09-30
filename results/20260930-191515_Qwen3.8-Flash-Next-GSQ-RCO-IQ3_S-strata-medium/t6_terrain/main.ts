import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID_W = 128;
const GRID_H = 128;
const WORLD_SIZE = 20;

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 5;
controls.maxDistance = 60;
(window as any).__controls = controls;

// --- Lights ---
const ambient = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 3);
scene.add(dirLight);

// --- Procedural height function: 3 sine/cosine layers ---
function heightAt(x: number, z: number): number {
  const layer1 = 1.0 * Math.sin(0.6 * x + 0.3) * Math.cos(0.5 * z + 0.1);
  const layer2 = 0.6 * Math.sin(1.2 * x + 2.0 * z + 0.7);
  const layer3 = 0.4 * Math.cos(1.8 * x - 0.9 * z + 1.3);
  return layer1 + layer2 + layer3;
}

// --- Build BufferGeometry (hand-made, no built-in) ---
const positions: number[] = [];
const colors: number[] = [];
const indices: number[] = [];

const halfSize = WORLD_SIZE / 2;
const stepX = WORLD_SIZE / (GRID_W - 1);
const stepZ = WORLD_SIZE / (GRID_H - 1);

// Track min/max height for color mapping
let minH = Infinity;
let maxH = -Infinity;

// Generate vertices
for (let iz = 0; iz < GRID_H; iz++) {
  for (let ix = 0; ix < GRID_W; ix++) {
    const x = -halfSize + ix * stepX;
    const z = -halfSize + iz * stepZ;
    const y = heightAt(x, z);

    if (y < minH) minH = y;
    if (y > maxH) maxH = y;

    positions.push(x, y, z);
  }
}

// Generate vertex colors (green low -> brown mid -> white high)
for (let iz = 0; iz < GRID_H; iz++) {
  for (let ix = 0; ix < GRID_W; ix++) {
    const x = -halfSize + ix * stepX;
    const z = -halfSize + iz * stepZ;
    const y = heightAt(x, z);
    const t = (y - minH) / (maxH - minH + 1e-9); // 0..1

    let r: number, g: number, b: number;
    if (t < 0.5) {
      // green -> brown
      const s = t / 0.5;
      r = 0.2 + s * 0.45; // 0.2 -> 0.65
      g = 0.55 - s * 0.25; // 0.55 -> 0.30
      b = 0.1;
    } else {
      // brown -> white
      const s = (t - 0.5) / 0.5;
      r = 0.65 + s * 0.35; // 0.65 -> 1.0
      g = 0.30 + s * 0.70; // 0.30 -> 1.0
      b = 0.1 + s * 0.90;  // 0.10 -> 1.0
    }
    colors.push(r, g, b);
  }
}

// Generate index buffer: 2 triangles per cell, CCW when viewed from +Y
for (let iz = 0; iz < GRID_H - 1; iz++) {
  for (let ix = 0; ix < GRID_W - 1; ix++) {
    const a = iz * GRID_W + ix;       // (ix, iz)
    const b = iz * GRID_W + (ix + 1); // (ix+1, iz)
    const c = (iz + 1) * GRID_W + ix; // (ix, iz+1)
    const d = (iz + 1) * GRID_W + (ix + 1); // (ix+1, iz+1)

    // Triangle 1: a, c, d  (CCW from +Y → normal +Y)
    indices.push(a, c, d);
    // Triangle 2: a, d, b  (CCW from +Y → normal +Y)
    indices.push(a, d, b);
  }
}

// --- Create geometry ---
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

// --- Material ---
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.FrontSide,
});

// --- Mesh ---
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
