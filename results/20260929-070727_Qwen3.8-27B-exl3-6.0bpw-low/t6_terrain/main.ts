import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Procedural terrain
const GRID = 128;
const SIZE = 20;
const SPACING = SIZE / (GRID - 1);

// Height function: sum of 3 sine/cosine layers
function getHeight(x: number, z: number): number {
  const layer1 = 0.8 * Math.sin(x * 0.5) * Math.cos(z * 0.5);
  const layer2 = 0.7 * Math.sin(x * 1.2 + z * 0.8);
  const layer3 = 0.5 * Math.cos(x * 2.1 - z * 1.7);
  return layer1 + layer2 + layer3;
}

// Generate positions
const positions = new Float32Array(GRID * GRID * 3);
const heights = new Float32Array(GRID * GRID);

let minY = Infinity;
let maxY = -Infinity;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = -SIZE / 2 + col * SPACING;
    const z = -SIZE / 2 + row * SPACING;
    const y = getHeight(x, z);
    heights[idx] = y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
  }
}

// Generate vertex colors based on height
const colors = new Float32Array(GRID * GRID * 3);
const range = maxY - minY;

const lowColor = new THREE.Color(0.2, 0.6, 0.2);   // green
const midColor = new THREE.Color(0.5, 0.35, 0.2);  // brown
const highColor = new THREE.Color(1.0, 1.0, 1.0);  // white

const tmpColor = new THREE.Color();

for (let i = 0; i < GRID * GRID; i++) {
  const t = (heights[i] - minY) / range; // 0 to 1
  if (t < 0.5) {
    const f = t / 0.5;
    tmpColor.copy(lowColor).lerp(midColor, f);
  } else {
    const f = (t - 0.5) / 0.5;
    tmpColor.copy(midColor).lerp(highColor, f);
  }
  colors[i * 3] = tmpColor.r;
  colors[i * 3 + 1] = tmpColor.g;
  colors[i * 3 + 2] = tmpColor.b;
}

// Generate index buffer: two triangles per cell, winding for +Y normal
const indexCount = (GRID - 1) * (GRID - 1) * 6;
const indices = new Uint32Array(indexCount);
let idxPtr = 0;

for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const v0 = row * GRID + col;
    const v1 = row * GRID + (col + 1);
    const v2 = (row + 1) * GRID + col;
    const v3 = (row + 1) * GRID + (col + 1);

    // Triangle 1: v0, v2, v1 (bottom-left, top-left, bottom-right)
    indices[idxPtr++] = v0;
    indices[idxPtr++] = v2;
    indices[idxPtr++] = v1;

    // Triangle 2: v1, v2, v3 (bottom-right, top-left, top-right)
    indices[idxPtr++] = v1;
    indices[idxPtr++] = v2;
    indices[idxPtr++] = v3;
  }
}

// Build BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Material and mesh
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

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
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
