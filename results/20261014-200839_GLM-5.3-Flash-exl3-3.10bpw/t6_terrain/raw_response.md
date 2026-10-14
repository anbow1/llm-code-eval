```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(10, 20, 8);
scene.add(directional);

// ---------- Procedural terrain: hand-made BufferGeometry ----------
const GRID = 128;              // 128x128 vertices
const SIZE = 20;               // 20x20 units
const verticesPerSide = GRID;  // GRID vertices per side
const cellCount = verticesPerSide - 1;

const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
const colors = new Float32Array(verticesPerSide * verticesPerSide * 3);

// Height function: 3 layered sine/cosine waves. Amplitude total ~2.
function terrainHeight(x: number, z: number): number {
  const bigWaves =
    Math.sin(x * 0.35 + z * 0.15) * 0.7 +
    Math.cos(z * 0.30 - x * 0.20) * 0.6;
  const mediumWaves =
    Math.sin(x * 0.9 + 1.3) * Math.cos(z * 0.8 - 0.4) * 0.45;
  const smallWaves =
    Math.sin((x + z) * 2.1) * Math.cos((x - z) * 1.7) * 0.25;
  return bigWaves + mediumWaves + smallWaves;
}

// Low = green, mid = brown, high = white
const cLow = new THREE.Color(0x3fa33f);
const cMid = new THREE.Color(0x8b5a2b);
const cHigh = new THREE.Color(0xffffff);

const tmpColor = new THREE.Color();
let minHeight = Infinity;
let maxHeight = -Infinity;

// First pass: heights (also track min/max for color normalization)
const heights = new Float32Array(verticesPerSide * verticesPerSide);
for (let iz = 0; iz < verticesPerSide; iz++) {
  for (let ix = 0; ix < verticesPerSide; ix++) {
    const x = (ix / cellCount) * SIZE - SIZE / 2;
    const z = (iz / cellCount) * SIZE - SIZE / 2;
    const y = terrainHeight(x, z);
    heights[iz * verticesPerSide + ix] = y;
    if (y < minHeight) minHeight = y;
    if (y > maxHeight) maxHeight = y;
  }
}

// Second pass: positions + colors
for (let iz = 0; iz < verticesPerSide; iz++) {
  for (let ix = 0; ix < verticesPerSide; ix++) {
    const idx = iz * verticesPerSide + ix;
    const x = (ix / cellCount) * SIZE - SIZE / 2;
    const z = (iz / cellCount) * SIZE - SIZE / 2;
    const y = heights[idx];

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Normalize height 0..1
    const t = (y - minHeight) / (maxHeight - minHeight);
    if (t < 0.45) {
      // green -> brown
      tmpColor.copy(cLow).lerp(cMid, t / 0.45);
    } else {
      // brown -> white
      tmpColor.copy(cMid).lerp(cHigh, (t - 0.45) / 0.55);
    }
    colors[idx * 3 + 0] = tmpColor.r;
    colors[idx * 3 + 1] = tmpColor.g;
    colors[idx * 3 + 2] = tmpColor.b;
  }
}

// Index buffer: two triangles per cell, wound CCW viewed from +Y
const indices = new Uint32Array(cellCount * cellCount * 6);
let ii = 0;
for (let iz = 0; iz < cellCount; iz++) {
  for (let ix = 0; ix < cellCount; ix++) {
    const a = iz * verticesPerSide + ix;
    const b = a + 1;
    const c = a + verticesPerSide;
    const d = c + 1;

    // CCW from above → normals point +Y
    indices[ii++] = a;
    indices[ii++] = c;
    indices[ii++] = b;

    indices[ii++] = b;
    indices[ii++] = c;
    indices[ii++] = d;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
  flatShading: false,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.05;
controls.update();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
let ready = false;
renderer.setAnimationLoop((time) => {
  const seconds = time * 0.001;
  const delta = Math.min(seconds - lastTime, 0.1);
  lastTime = seconds;

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
  void delta;
});
let lastTime = 0;

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```