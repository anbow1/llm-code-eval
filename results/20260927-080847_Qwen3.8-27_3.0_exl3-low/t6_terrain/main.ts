import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID = 128;
const SIZE = 20;
const STEP = SIZE / (GRID - 1);

function getHeight(x: number, z: number): number {
  return (
    1.0 * Math.sin(x * 0.5) * Math.cos(z * 0.5) +
    0.5 * Math.sin(x * 1.2 + 1.0) * Math.cos(z * 1.2 + 0.5) +
    0.5 * Math.sin(x * 2.5 + 2.0) * Math.cos(z * 2.5 + 1.5)
  );
}

// Build positions
const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

let minY = Infinity;
let maxY = -Infinity;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = -SIZE / 2 + col * STEP;
    const z = -SIZE / 2 + row * STEP;
    const y = getHeight(x, z);
    const idx = (row * GRID + col) * 3;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

// Compute vertex colors based on normalized height
const lowColor = new THREE.Color(0.1, 0.5, 0.1);
const midColor = new THREE.Color(0.5, 0.3, 0.1);
const highColor = new THREE.Color(1.0, 1.0, 1.0);
const tmpColor = new THREE.Color();

for (let i = 0; i < GRID * GRID; i++) {
  const y = positions[i * 3 + 1];
  const t = (y - minY) / (maxY - minY);
  if (t < 0.5) {
    tmpColor.copy(lowColor).lerp(midColor, t * 2);
  } else {
    tmpColor.copy(midColor).lerp(highColor, (t - 0.5) * 2);
  }
  colors[i * 3] = tmpColor.r;
  colors[i * 3 + 1] = tmpColor.g;
  colors[i * 3 + 2] = tmpColor.b;
}

// Build index buffer
const numCells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(numCells * 6);
let idxPtr = 0;

for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const v00 = row * GRID + col;
    const v10 = row * GRID + (col + 1);
    const v01 = (row + 1) * GRID + col;
    const v11 = (row + 1) * GRID + (col + 1);

    // Triangle 1: v00, v01, v10 (upward facing)
    indices[idxPtr++] = v00;
    indices[idxPtr++] = v01;
    indices[idxPtr++] = v10;

    // Triangle 2: v01, v11, v10 (upward facing)
    indices[idxPtr++] = v01;
    indices[idxPtr++] = v11;
    indices[idxPtr++] = v10;
  }
}

// Create geometry
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

const mesh = new THREE.Mesh(geometry, material);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.add(mesh);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Render loop
let ready = false;
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
