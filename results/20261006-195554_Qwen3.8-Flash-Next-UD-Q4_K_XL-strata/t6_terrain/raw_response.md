```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

// --- Height function: 3 sine/cosine layers, total amplitude ≈ 2 ---
function height(x: number, z: number): number {
  const h1 = Math.sin(x * 0.8) * Math.cos(z * 0.8) * 1.0;
  const h2 = Math.sin(x * 2.1 + z * 1.7) * 0.6;
  const h3 = Math.cos(x * 4.3 - z * 3.1) * 0.4;
  return h1 + h2 + h3;
}

// --- Build terrain BufferGeometry manually ---
const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const y = height(x, z);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Vertex color by height: green(low) -> brown(mid) -> white(high)
    // Normalize y from [-2, 2] to [0, 1]
    const t = (y + 2.0) / 4.0;
    const clamped = Math.max(0, Math.min(1, t));

    let r: number, g: number, b: number;
    if (clamped < 0.4) {
      // green region
      const f = clamped / 0.4;
      r = 0.1 + f * 0.4;
      g = 0.6 - f * 0.1;
      b = 0.1;
    } else if (clamped < 0.75) {
      // brown region
      const f = (clamped - 0.4) / 0.35;
      r = 0.5 + f * 0.3;
      g = 0.35 + f * 0.3;
      b = 0.1 + f * 0.3;
    } else {
      // white region
      const f = (clamped - 0.75) / 0.25;
      r = 0.8 + f * 0.2;
      g = 0.65 + f * 0.35;
      b = 0.4 + f * 0.6;
    }

    colors[idx * 3 + 0] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer: 2 triangles per cell, winding for +Y (UP) normals
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let ii = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const v00 = row * GRID + col;
    const v10 = row * GRID + (col + 1);
    const v01 = (row + 1) * GRID + col;
    const v11 = (row + 1) * GRID + (col + 1);

    // Triangle 1: v00, v01, v11  (cross(+z, +z+x) => +Y)
    indices[ii++] = v00;
    indices[ii++] = v01;
    indices[ii++] = v11;

    // Triangle 2: v00, v11, v10  (cross(+z+x, +x) => +Y)
    indices[ii++] = v00;
    indices[ii++] = v11;
    indices[ii++] = v10;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Mesh ---
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 15, 8);
scene.add(dirLight);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = renderer.clock.getDelta();
  const elapsed = renderer.clock.getElapsedTime();

  // Gentle rotation of directional light over time
  dirLight.position.x = Math.cos(elapsed * 0.3) * 12;
  dirLight.position.z = Math.sin(elapsed * 0.3) * 12;

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```