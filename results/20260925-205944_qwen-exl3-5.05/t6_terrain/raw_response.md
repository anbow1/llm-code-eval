

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(18, 14, 18);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 8);
scene.add(dirLight);

// --- Procedural Terrain (hand-made BufferGeometry) ---
const GRID = 128; // 128x128 vertices
const SIZE = 20;  // 20x20 units in XZ
const HALF = SIZE / 2;

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

// Height function: 3 sine/cosine layers, amplitude ~2
function height(x: number, z: number): number {
  return (
    0.7 * Math.sin(x * 0.8) * Math.cos(z * 0.6) +
    0.5 * Math.sin(x * 1.5 + z * 1.2) +
    0.8 * Math.cos(x * 0.3 - z * 0.4)
  );
}

// Fill positions and colors
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = (col / (GRID - 1)) * SIZE - HALF;
    const z = (row / (GRID - 1)) * SIZE - HALF;
    const y = height(x, z);

    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Normalize height to [0, 1] roughly (range ~ -2..2)
    const t = THREE.MathUtils.clamp((y + 2) / 4, 0, 1);

    // Green (low) -> Brown (mid) -> White (high)
    let r: number, g: number, b: number;
    if (t < 0.5) {
      const s = t / 0.5;
      r = THREE.MathUtils.lerp(0.15, 0.55, s);
      g = THREE.MathUtils.lerp(0.65, 0.35, s);
      b = THREE.MathUtils.lerp(0.15, 0.10, s);
    } else {
      const s = (t - 0.5) / 0.5;
      r = THREE.MathUtils.lerp(0.55, 1.0, s);
      g = THREE.MathUtils.lerp(0.35, 1.0, s);
      b = THREE.MathUtils.lerp(0.10, 1.0, s);
    }
    colors[idx * 3 + 0] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer: two triangles per cell, winding so normal points +Y
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let ii = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const v00 = row * GRID + col;
    const v01 = row * GRID + (col + 1);
    const v10 = (row + 1) * GRID + col;
    const v11 = (row + 1) * GRID + (col + 1);

    // Triangle 1: v00, v10, v11  (cross product gives +Y)
    indices[ii++] = v00;
    indices[ii++] = v10;
    indices[ii++] = v11;

    // Triangle 2: v00, v11, v01  (cross product gives +Y)
    indices[ii++] = v00;
    indices[ii++] = v11;
    indices[ii++] = v01;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.FrontSide,
  roughness: 0.85,
  metalness: 0.05,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const _delta = clock.getDelta(); // available for future animation

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