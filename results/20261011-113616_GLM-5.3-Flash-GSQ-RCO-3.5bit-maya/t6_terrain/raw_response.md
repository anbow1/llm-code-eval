```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ------------------------------------------------------------------
// Renderer / scene / camera
// ------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db8cf);
scene.fog = new THREE.Fog(0x9db8cf, 60, 150);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(20, 16, 20); // above the terrain, looking down at an angle

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ------------------------------------------------------------------
// Controls
// ------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

// ------------------------------------------------------------------
// Lights
// ------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(15, 18, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.1;
scene.add(sun);

// ------------------------------------------------------------------
// Hand-made terrain BufferGeometry (128x128 vertices, 20x20 units)
// ------------------------------------------------------------------
const GRID = 128;          // vertices per side
const SIZE = 20;           // world units per side (XZ)
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

// Height = sum of 3 sine/cosine layers, combined amplitude ~ 2
function terrainHeight(x: number, z: number): number {
  return (
    1.0 * Math.sin(x * 0.35) * Math.cos(z * 0.42) +
    0.6 * Math.sin(x * 0.9 + z * 1.15) +
    0.4 * Math.cos(x * 1.7 - z * 1.3)
  );
}

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);
const indices: number[] = [];

let minY = Infinity;
let maxY = -Infinity;

// Fill positions
for (let j = 0; j < GRID; j++) {
  const z = -HALF + j * STEP;
  for (let i = 0; i < GRID; i++) {
    const x = -HALF + i * STEP;
    const y = terrainHeight(x, z);
    const k = (j * GRID + i) * 3;
    positions[k + 0] = x;
    positions[k + 1] = y;
    positions[k + 2] = z;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

// Index buffer: two triangles per cell, wound so normals face +Y.
// Cross-product check for triangle (a, c, b):
//   a = (x0, z0), c = (x0, z1), b = (x1, z0)
//   (c - a) x (b - a) = (0,0,dz) x (dx,0,0) = (0, +dx*dz, 0) -> up
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const a = j * GRID + i;             // (i,     j)
    const b = j * GRID + i + 1;         // (i + 1, j)
    const c = (j + 1) * GRID + i;       // (i,     j + 1)
    const d = (j + 1) * GRID + i + 1;   // (i + 1, j + 1)
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

// Vertex colors by height: green (low) -> brown (middle) -> white (high)
const colLow = new THREE.Color(0.24, 0.5, 0.16);
const colMid = new THREE.Color(0.47, 0.33, 0.19);
const colHigh = new THREE.Color(0.94, 0.96, 0.97);
const col = new THREE.Color();
const range = maxY - minY;

for (let v = 0; v < vertexCount; v++) {
  const y = positions[v * 3 + 1];
  const t = range > 1e-6 ? (y - minY) / range : 0.5;
  if (t < 0.5) {
    col.copy(colLow).lerp(colMid, t * 2);
  } else {
    col.copy(colMid).lerp(colHigh, (t - 0.5) * 2);
  }
  colors[v * 3 + 0] = col.r;
  colors[v * 3 + 1] = col.g;
  colors[v * 3 + 2] = col.b;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.0,
});

const terrain = new THREE.Mesh(geometry, material);
terrain.castShadow = true;
terrain.receiveShadow = true;
scene.add(terrain);

// ------------------------------------------------------------------
// Test hooks
// ------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ------------------------------------------------------------------
// Render loop (time-based, not frame-count-based)
// ------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

function tick(): void {
  const elapsed = clock.getElapsedTime();

  // Gentle elapsed-time drift of the sun around the scene
  const sunAngle = elapsed * 0.05;
  sun.position.set(Math.cos(sunAngle) * 18, 18, Math.sin(sunAngle) * 18);

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(tick);

// ------------------------------------------------------------------
// Resize handling
// ------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```