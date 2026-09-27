import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(18, 16, 18);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.canvas);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain generation
const SIZE = 128;
const EXTENT = 20;
const STEP = EXTENT / (SIZE - 1);

function terrainHeight(x: number, z: number): number {
  // Three sine/cosine layers with different frequencies, total amplitude ≈ 2
  const layer1 = 0.8 * Math.sin(0.5 * x + 0.4 * z);
  const layer2 = 0.7 * Math.cos(1.3 * x - 0.9 * z);
  const layer3 = 0.5 * Math.sin(2.7 * z + 0.8 * x);
  return layer1 + layer2 + layer3;
}

// Build position array and track min/max height
const positions: number[] = [];
const yValues: Float64Array = new Float64Array(SIZE * SIZE);
let minY = Infinity;
let maxY = -Infinity;

for (let i = 0; i < SIZE; i++) {
  for (let j = 0; j < SIZE; j++) {
    const x = -EXTENT / 2 + j * STEP;
    const z = -EXTENT / 2 + i * STEP;
    const y = terrainHeight(x, z);
    const idx = i * SIZE + j;
    yValues[idx] = y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    positions.push(x, y, z);
  }
}

// Vertex colors based on height (green low → brown middle → white high)
const colors: number[] = [];
const range = maxY - minY;
for (let k = 0; k < SIZE * SIZE; k++) {
  const t = (yValues[k] - minY) / range;
  let r: number, g: number, b: number;
  if (t < 0.4) {
    // Green (low)
    const s = t / 0.4;
    r = 0.15 + s * 0.35;
    g = 0.55 + s * 0.1;
    b = 0.1;
  } else if (t < 0.7) {
    // Brown (middle)
    const s = (t - 0.4) / 0.3;
    r = 0.5 + s * 0.1;
    g = 0.35 + s * 0.05;
    b = 0.15 + s * 0.05;
  } else {
    // White (high)
    const s = (t - 0.7) / 0.3;
    r = 0.6 + s * 0.4;
    g = 0.4 + s * 0.6;
    b = 0.2 + s * 0.8;
  }
  colors.push(r, g, b);
}

// Index buffer: two triangles per grid cell, winding for +Y normal
const indices: number[] = [];
for (let i = 0; i < SIZE - 1; i++) {
  for (let j = 0; j < SIZE - 1; j++) {
    const v00 = i * SIZE + j;
    const v10 = i * SIZE + (j + 1);
    const v01 = (i + 1) * SIZE + j;
    const v11 = (i + 1) * SIZE + (j + 1);
    // Triangle 1: v00 → v01 → v11 (CCW from above, normal +Y)
    indices.push(v00, v01, v11);
    // Triangle 2: v00 → v11 → v10 (CCW from above, normal +Y)
    indices.push(v00, v11, v10);
  }
}

// Build BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

// Material and mesh
const material = new THREE.MeshStandardMaterial({ vertexColors: true });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

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
renderer.setAnimationLoop((_time: number) => {
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
