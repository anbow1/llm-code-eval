```ts
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
  500
);
camera.position.set(20, 20, 20);
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

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Procedural terrain – hand-built BufferGeometry
const SIZE = 128;
const EXTENT = 20;
const HALF = EXTENT / 2;
const STEP = EXTENT / (SIZE - 1);

function getHeight(x: number, z: number): number {
  const layer1 = 1.2 * Math.sin(x * 0.5) * Math.cos(z * 0.5);
  const layer2 = 0.5 * Math.sin(x * 1.2 + 1.0) * Math.cos(z * 0.8);
  const layer3 = 0.3 * Math.sin(x * 2.5) * Math.cos(z * 2.5);
  return layer1 + layer2 + layer3;
}

const positions = new Float32Array(SIZE * SIZE * 3);
const colors = new Float32Array(SIZE * SIZE * 3);
const totalCells = (SIZE - 1) * (SIZE - 1);
const indices = new Uint32Array(totalCells * 6);

const colGreen = new THREE.Color(0.2, 0.8, 0.2);
const colBrown = new THREE.Color(0.6, 0.4, 0.2);
const colWhite = new THREE.Color(1, 1, 1);
const tmp = new THREE.Color();

for (let i = 0; i < SIZE; i++) {
  for (let j = 0; j < SIZE; j++) {
    const x = -HALF + i * STEP;
    const z = -HALF + j * STEP;
    const y = getHeight(x, z);

    const vi = i * SIZE + j;
    positions[vi * 3] = x;
    positions[vi * 3 + 1] = y;
    positions[vi * 3 + 2] = z;

    const t = Math.max(0, Math.min(1, (y + 2.0) / 4.0));
    if (t < 0.5) {
      tmp.lerpColors(colGreen, colBrown, t * 2);
    } else {
      tmp.lerpColors(colBrown, colWhite, (t - 0.5) * 2);
    }
    colors[vi * 3] = tmp.r;
    colors[vi * 3 + 1] = tmp.g;
    colors[vi * 3 + 2] = tmp.b;
  }
}

let idxPtr = 0;
for (let i = 0; i < SIZE - 1; i++) {
  for (let j = 0; j < SIZE - 1; j++) {
    const a = i * SIZE + j;
    const b = i * SIZE + (j + 1);
    const c = (i + 1) * SIZE + j;
    const d = (i + 1) * SIZE + (j + 1);

    // Winding verified so cross product points +Y
    indices[idxPtr++] = a;
    indices[idxPtr++] = b;
    indices[idxPtr++] = c;

    indices[idxPtr++] = c;
    indices[idxPtr++] = b;
    indices[idxPtr++] = d;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Resize
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
```