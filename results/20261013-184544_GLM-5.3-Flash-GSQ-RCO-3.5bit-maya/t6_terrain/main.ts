import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------- Renderer / Scene / Camera ----------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8d4);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 13, 16);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ---------------- Lights ----------------

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(12, 18, 8);
scene.add(directionalLight);

// ---------------- Procedural height function ----------------
// Sum of 3 sine/cosine layers, total amplitude about 2.

function terrainHeight(x: number, z: number): number {
  const h =
    0.9 * Math.sin(x * 0.35) * Math.cos(z * 0.35) +
    0.6 * Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.55 - 0.7) +
    0.4 * Math.cos(x * 1.35 - 0.4) * Math.sin(z * 1.1 + 2.1) +
    0.1 * Math.sin(x * 2.7 + z * 2.4);
  return h;
}

// ---------------- Hand-made BufferGeometry ----------------
// 128x128 vertices spanning 20x20 units, centered at origin.

const GRID = 128;
const SIZE = 20;
const SEG = GRID - 1; // 127 cells per side

const positions: number[] = [];
const colors: number[] = [];
const indices: number[] = [];

// Height range for color mapping
const maxHeight = terrainHeight(0, 0);
let minH = Infinity;
let maxH = -Infinity;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = (ix / SEG) * SIZE - SIZE / 2;
    const z = (iz / SEG) * SIZE - SIZE / 2;
    const h = terrainHeight(x, z);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
}
const hSpan = maxH - minH;

const colorLow = new THREE.Color(0x3a7d2c); // green (low)
const colorMid = new THREE.Color(0x8a5a2b); // brown (middle)
const colorHigh = new THREE.Color(0xffffff); // white (high)

const tmpColor = new THREE.Color();

for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = (ix / SEG) * SIZE - SIZE / 2;
    const z = (iz / SEG) * SIZE - SIZE / 2;
    const y = terrainHeight(x, z);

    positions.push(x, y, z);

    // Height -> color: green -> brown -> white
    const t = (y - minH) / hSpan; // 0..1
    if (t < 0.5) {
      tmpColor.copy(colorLow).lerp(colorMid, t / 0.5);
    } else {
      tmpColor.copy(colorMid).lerp(colorHigh, (t - 0.5) / 0.5);
    }
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
  }
}

// Two triangles per cell, winding chosen so normals point UP (+Y).
// Vertex index at (ix, iz) is iz * GRID + ix.
for (let iz = 0; iz < SEG; iz++) {
  for (let ix = 0; ix < SEG; ix++) {
    const v00 = iz * GRID + ix;
    const v10 = iz * GRID + ix + 1;
    const v01 = (iz + 1) * GRID + ix;
    const v11 = (iz + 1) * GRID + ix + 1;

    // (v00, v01, v11): e1 = (0,0,dz), e2 = (dx,0,dz) -> normal +Y
    indices.push(v00, v01, v11);
    // (v00, v11, v10): e1 = (dx,0,dz), e2 = (dx,0,0) -> normal +Y
    indices.push(v00, v11, v10);
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(positions, 3)
);
terrainGeometry.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(colors, 3)
);
terrainGeometry.setIndex(indices);
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  flatShading: false,
});

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrainMesh);

// ---------------- Resize handling ----------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- Render loop ----------------

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Subtle light drift driven by elapsed time (delta-based motion)
  directionalLight.position.set(
    Math.cos(elapsed * 0.15) * 14,
    18,
    Math.sin(elapsed * 0.15) * 14
  );

  controls.update();
  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }

  // Silence unused-variable lint for delta (kept for time-based updates)
  void delta;
});

// ---------------- Test exposure ----------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
