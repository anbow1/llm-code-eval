import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 15, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
(window as any).__controls = controls;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 3);
scene.add(dirLight);

// Procedural terrain from hand-made BufferGeometry
const GRID_SIZE = 128;
const TERRAIN_SIZE = 20;
const HALF_SIZE = TERRAIN_SIZE / 2;
const SEGMENTS = GRID_SIZE - 1;

// Height function: sum of 3 sine/cosine layers, amplitude ~2
function getHeight(x: number, z: number): number {
  const h1 = 0.7 * Math.sin(x * 0.5) * Math.cos(z * 0.3);
  const h2 = 0.5 * Math.sin(x * 1.2 + z * 0.8);
  const h3 = 0.5 * Math.cos(x * 0.7 - z * 1.1);
  return h1 + h2 + h3;
}

// Build positions and colors
const vertexCount = GRID_SIZE * GRID_SIZE;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

let minH = Infinity;
let maxH = -Infinity;

// First pass: compute heights to find min/max for color mapping
const heights = new Float32Array(vertexCount);
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const idx = row * GRID_SIZE + col;
    const x = -HALF_SIZE + (col / SEGMENTS) * TERRAIN_SIZE;
    const z = -HALF_SIZE + (row / SEGMENTS) * TERRAIN_SIZE;
    const h = getHeight(x, z);
    heights[idx] = h;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
}

// Second pass: fill positions and colors
const colorLow = new THREE.Color(0x228b22);   // green
const colorMid = new THREE.Color(0x8b4513);   // brown/saddlebrown
const colorHigh = new THREE.Color(0xffffff);  // white

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const idx = row * GRID_SIZE + col;
    const x = -HALF_SIZE + (col / SEGMENTS) * TERRAIN_SIZE;
    const z = -HALF_SIZE + (row / SEGMENTS) * TERRAIN_SIZE;
    const h = heights[idx];

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = h;
    positions[idx * 3 + 2] = z;

    // Map height to [0, 1]
    const t = (h - minH) / (maxH - minH);

    // Color: green (low) -> brown (mid) -> white (high)
    const c = new THREE.Color();
    if (t < 0.5) {
      c.lerpColors(colorLow, colorMid, t * 2.0);
    } else {
      c.lerpColors(colorMid, colorHigh, (t - 0.5) * 2.0);
    }

    colors[idx * 3] = c.r;
    colors[idx * 3 + 1] = c.g;
    colors[idx * 3 + 2] = c.b;
  }
}

// Index buffer: two triangles per quad, winding faces UP (+Y)
const indexCount = SEGMENTS * SEGMENTS * 2 * 3;
const indices = new Uint32Array(indexCount);
let idx = 0;

for (let row = 0; row < SEGMENTS; row++) {
  for (let col = 0; col < SEGMENTS; col++) {
    const a = row * GRID_SIZE + col;
    const b = (row + 1) * GRID_SIZE + col;
    const c = (row + 1) * GRID_SIZE + (col + 1);
    const d = row * GRID_SIZE + (col + 1);

    // Triangle 1: a, b, c  (normal points +Y)
    indices[idx++] = a;
    indices[idx++] = b;
    indices[idx++] = c;

    // Triangle 2: a, c, d  (normal points +Y)
    indices[idx++] = a;
    indices[idx++] = c;
    indices[idx++] = d;
  }
}

// Build BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Material
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // delta is available for time-based motion if needed
  void delta;

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
