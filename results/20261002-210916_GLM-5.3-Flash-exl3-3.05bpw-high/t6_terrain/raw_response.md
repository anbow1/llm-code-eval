```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Renderer / Scene / Camera
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ec8e8);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 11, 14);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
sun.position.set(12, 18, 8);
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

// ---------------------------------------------------------------------------
// Procedural terrain — hand-built BufferGeometry
// ---------------------------------------------------------------------------

const GRID = 128;            // vertices per side (128 x 128 grid)
const WORLD_SIZE = 20;       // units in X and Z
const HALF = WORLD_SIZE / 2;
const STEP = WORLD_SIZE / (GRID - 1);
const CELL_COUNT = GRID - 1;

/** Layered sine/cosine heightfield, peak amplitude ~2 units. */
function heightAt(x: number, z: number): number {
  let y = 0;
  y += Math.sin(x * 0.35) * Math.cos(z * 0.28) * 1.2;
  y += Math.sin(x * 0.72 + 1.3) * Math.cos(z * 0.85 + 2.1) * 0.55;
  y += Math.cos(x * 1.45 - 0.7) * Math.sin(z * 1.2 + 0.4) * 0.25;
  y += Math.sin((x + z) * 2.1) * 0.05; // fine ripple detail
  return y;
}

// Two passes: first sample heights to find min/max for color normalization.
const heights = new Float32Array(GRID * GRID);
let hMin = Infinity;
let hMax = -Infinity;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const h = heightAt(-HALF + col * STEP, -HALF + row * STEP);
    heights[row * GRID + col] = h;
    if (h < hMin) hMin = h;
    if (h > hMax) hMax = h;
  }
}
const hRange = hMax - hMin;

// Height-based palette: green lowlands -> brown slopes -> snowy peaks.
const cLow = new THREE.Color(0.16, 0.55, 0.20);
const cMid = new THREE.Color(0.50, 0.36, 0.16);
const cHigh = new THREE.Color(0.96, 0.97, 0.99);
const GREEN_LINE = 0.35;
const SNOW_LINE = 0.65;
const tmpColor = new THREE.Color();

function colorForHeight(t: number, out: THREE.Color): void {
  if (t < GREEN_LINE) {
    out.lerpColors(cLow, cMid, t / GREEN_LINE);
  } else if (t < SNOW_LINE) {
    out.lerpColors(cMid, cHigh, (t - GREEN_LINE) / (SNOW_LINE - GREEN_LINE));
  } else {
    out.copy(cHigh);
  }
}

// Vertex buffers.
const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const i = row * GRID + col;
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const h = heights[i];

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = h;
    positions[i * 3 + 2] = z;

    const t = hRange > 0 ? (h - hMin) / hRange : 0.5;
    colorForHeight(t, tmpColor);
    colors[i * 3 + 0] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
}

// Index buffer: two triangles per cell, counter-clockwise when seen from
// above, so face normals point UP (+Y).
const indices = new Uint32Array(CELL_COUNT * CELL_COUNT * 6);
let ptr = 0;
for (let row = 0; row < CELL_COUNT; row++) {
  for (let col = 0; col < CELL_COUNT; col++) {
    const a = row * GRID + col;         // top-left  (+x right, +z down-grid)
    const b = row * GRID + col + 1;     // top-right
    const c = (row + 1) * GRID + col;   // bottom-left
    const d = (row + 1) * GRID + col + 1; // bottom-right

    indices[ptr++] = a;
    indices[ptr++] = c;
    indices[ptr++] = d;

    indices[ptr++] = a;
    indices[ptr++] = d;
    indices[ptr++] = b;
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.0,
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrain);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);
controls.maxDistance = 60;
controls.minDistance = 3;
controls.update();

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Damping update consumes delta time for frame-rate-independent motion.
  controls.update();

  // Subtle sun drift so the loop depends on elapsed time (not frame counts).
  sun.position.set(
    Math.sin(elapsed * 0.05) * 14 + 8,
    18,
    Math.cos(elapsed * 0.05) * 14 + 8
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```