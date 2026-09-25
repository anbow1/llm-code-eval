import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Scene setup ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(15, 14, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ─── Procedural terrain via hand-made BufferGeometry ────────────────────────
const SIZE = 128; // vertices per side
const WORLD = 20; // world extent in XZ

function height(x: number, z: number): number {
  // 3 sine/cosine layers with different frequencies, total amplitude ≈ 2
  let h = 0;
  h += 0.9 * Math.sin(x * 1.2 + z * 0.7);
  h += 0.7 * Math.cos(x * 2.5 - z * 1.8);
  h += 0.5 * Math.sin(x * 0.4 + z * 3.1);
  return h;
}

// Build position array
const positions = new Float32Array(SIZE * SIZE * 3);
let idx = 0;
for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++) {
    const x = (col / (SIZE - 1) - 0.5) * WORLD;
    const z = (row / (SIZE - 1) - 0.5) * WORLD;
    const y = height(x, z);
    positions[idx++] = x;
    positions[idx++] = y;
    positions[idx++] = z;
  }
}

// Build index buffer – two triangles per cell, winding so normal points +Y
const numCells = (SIZE - 1) * (SIZE - 1);
const indices = new Uint32Array(numCells * 6);
let ii = 0;
for (let row = 0; row < SIZE - 1; row++) {
  for (let col = 0; col < SIZE - 1; col++) {
    const v00 = row * SIZE + col;
    const v01 = row * SIZE + col + 1;
    const v10 = (row + 1) * SIZE + col;
    const v11 = (row + 1) * SIZE + col + 1;

    // Triangle 1: v00, v10, v01  → cross has +Y component → faces UP
    indices[ii++] = v00;
    indices[ii++] = v10;
    indices[ii++] = v01;

    // Triangle 2: v10, v11, v01  → faces UP
    indices[ii++] = v10;
    indices[ii++] = v11;
    indices[ii++] = v01;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// ─── Vertex colors by height (green → brown → white) ───────────────────────
const colors = new Float32Array(SIZE * SIZE * 3);
const cLow = new THREE.Color(0x2d8a2d);   // green  (low)
const cMid = new THREE.Color(0x8b6914);   // brown  (middle)
const cHigh = new THREE.Color(0xffffff);  // white  (high)
const tmpColor = new THREE.Color();

// Determine actual height range for mapping
let minH = Infinity, maxH = -Infinity;
for (let i = 0; i < SIZE * SIZE; i++) {
  const y = positions[i * 3 + 1];
  if (y < minH) minH = y;
  if (y > maxH) maxH = y;
}
const range = maxH - minH || 1;

for (let i = 0; i < SIZE * SIZE; i++) {
  const y = positions[i * 3 + 1];
  const t = (y - minH) / range; // 0..1

  if (t < 0.5) {
    tmpColor.copy(cLow).lerp(cMid, t * 2);
  } else {
    tmpColor.copy(cMid).lerp(cHigh, (t - 0.5) * 2);
  }
  colors[i * 3] = tmpColor.r;
  colors[i * 3 + 1] = tmpColor.g;
  colors[i * 3 + 2] = tmpColor.b;
}
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// ─── Material & mesh ────────────────────────────────────────────────────────
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.FrontSide,
  roughness: 0.85,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ─── Lights ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x404050, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
dirLight.position.set(10, 20, 8);
scene.add(dirLight);

// ─── Controls ───────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();
(window as any).__controls = controls;

// ─── Resize handling ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render loop ────────────────────────────────────────────────────────────
let firstFrame = true;

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// ─── Expose for testing ─────────────────────────────────────────────────────
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
