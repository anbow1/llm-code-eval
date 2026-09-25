import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene + camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb8d8);
scene.fog = new THREE.Fog(0x8fb8d8, 45, 130);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

let sunAngle = 0.9;
const sunLight = new THREE.DirectionalLight(0xfff1dc, 1.8);
sunLight.position.set(Math.cos(sunAngle) * 22, 16, Math.sin(sunAngle) * 22);
scene.add(sunLight);

// ---------------------------------------------------------------------------
// Procedural terrain — hand-built BufferGeometry (no built-in geometries)
// ---------------------------------------------------------------------------
const GRID = 128; // 128 x 128 vertices
const SIZE = 20; // 20 x 20 world units in XZ, centered at origin
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);
const VERT_COUNT = GRID * GRID;

function terrainHeight(x: number, z: number): number {
  // Three sine/cosine layers with different frequencies, combined amplitude ~ 2.0
  const layer1 = 1.2 * Math.sin(x * 0.45 + 0.8) * Math.cos(z * 0.35 - 0.4);
  const layer2 = 0.5 * Math.sin(x * 1.1 - 1.3) * Math.sin(z * 0.9 + 2.0);
  const layer3 = 0.3 * Math.cos(x * 2.6 + 0.5) * Math.cos(z * 2.2 - 1.1);
  return layer1 + layer2 + layer3;
}

const positions = new Float32Array(VERT_COUNT * 3);
const colors = new Float32Array(VERT_COUNT * 3);
const heights = new Float32Array(VERT_COUNT);

let minH = Infinity;
let maxH = -Infinity;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const index = j * GRID + i;
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const h = terrainHeight(x, z);

    heights[index] = h;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;

    positions[index * 3 + 0] = x;
    positions[index * 3 + 1] = h;
    positions[index * 3 + 2] = z;
  }
}

// Vertex colors by height: green (low) -> brown (middle) -> white (high)
const colorLow = new THREE.Color(0x3f8f3f);
const colorMid = new THREE.Color(0x8a6a3d);
const colorHigh = new THREE.Color(0xf4f6f7);
const span = Math.max(maxH - minH, 1e-6);
const tmpColor = new THREE.Color();

for (let k = 0; k < VERT_COUNT; k++) {
  const t = Math.min(Math.max((heights[k] - minH) / span, 0), 1);
  if (t < 0.5) {
    tmpColor.copy(colorLow).lerp(colorMid, t * 2);
  } else {
    tmpColor.copy(colorMid).lerp(colorHigh, (t - 0.5) * 2);
  }
  colors[k * 3 + 0] = tmpColor.r;
  colors[k * 3 + 1] = tmpColor.g;
  colors[k * 3 + 2] = tmpColor.b;
}

// Index buffer: two triangles per grid cell, CCW winding when viewed from +Y
// (front faces point up).
const CELL_COUNT = (GRID - 1) * (GRID - 1);
const indexArray = new Uint16Array(CELL_COUNT * 2 * 3);
let cursor = 0;
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const a = j * GRID + i; // (x0, z0)
    const b = a + 1; // (x1, z0)
    const c = a + GRID; // (x0, z1)
    const d = a + GRID + 1; // (x1, z1)

    indexArray[cursor++] = a;
    indexArray[cursor++] = c;
    indexArray[cursor++] = b;
    indexArray[cursor++] = b;
    indexArray[cursor++] = c;
    indexArray[cursor++] = d;
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0,
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.name = 'terrain';
scene.add(terrain);

// ---------------------------------------------------------------------------
// Orbit controls (damping enabled, updated every frame)
// ---------------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.minDistance = 4;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

// ---------------------------------------------------------------------------
// Expose handles for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Render loop — all motion driven by delta / elapsed time
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let isReady = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Slow, frame-rate-independent sun orbit + gentle elevation bob.
  sunAngle += delta * 0.05;
  sunLight.position.set(
    Math.cos(sunAngle) * 22,
    16 + Math.sin(elapsed * 0.4) * 1.5,
    Math.sin(sunAngle) * 22
  );

  controls.update();
  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});
