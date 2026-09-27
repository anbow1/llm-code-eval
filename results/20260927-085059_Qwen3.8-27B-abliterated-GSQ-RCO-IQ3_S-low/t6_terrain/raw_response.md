```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 14);
camera.lookAt(0, 0, 0);

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

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Terrain construction
const GRID = 128;
const SIZE = 20;
const SEGMENTS = GRID - 1;

// Height function: sum of 3 sine/cosine layers, amplitude ~2
function getHeight(x: number, z: number): number {
  const layer1 = 1.2 * Math.sin(x * 0.8) * Math.cos(z * 0.8);
  const layer2 = 0.5 * Math.sin(x * 1.5 + 1.3) * Math.cos(z * 1.5 - 0.7);
  const layer3 = 0.3 * Math.sin(x * 3.0) * Math.cos(z * 3.0 + 2.1);
  return layer1 + layer2 + layer3;
}

// Build position and color arrays
const positions: number[] = [];
const colors: number[] = [];

let minY = Infinity;
let maxY = -Infinity;

const tempHeights: number[] = new Array(GRID * GRID);

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = -SIZE / 2 + (j / SEGMENTS) * SIZE;
    const z = -SIZE / 2 + (i / SEGMENTS) * SIZE;
    const y = getHeight(x, z);

    tempHeights[i * GRID + j] = y;
    positions.push(x, y, z);

    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

// Compute colors based on normalized height
const colorLow = new THREE.Color(0x228b22);   // green
const colorMid = new THREE.Color(0x8b5a2b);   // brown
const colorHigh = new THREE.Color(0xffffff);  // white
const tmpColor = new THREE.Color();

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const y = tempHeights[i * GRID + j];
    const t = (y - minY) / (maxY - minY); // 0..1

    if (t < 0.5) {
      const s = t / 0.5;
      tmpColor.copy(colorLow).lerp(colorMid, s);
    } else {
      const s = (t - 0.5) / 0.5;
      tmpColor.copy(colorMid).lerp(colorHigh, s);
    }
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
  }
}

// Build index buffer: two triangles per cell, winding for +Y faces
const indices: number[] = [];

for (let i = 0; i < SEGMENTS; i++) {
  for (let j = 0; j < SEGMENTS; j++) {
    const idx0 = i * GRID + j;         // bottom-left
    const idx1 = i * GRID + (j + 1);   // bottom-right
    const idx2 = (i + 1) * GRID + j;   // top-left
    const idx3 = (i + 1) * GRID + (j + 1); // top-right

    // Triangle 1: v0 -> v2 -> v1 (CCW from above => +Y normal)
    indices.push(idx0, idx2, idx1);
    // Triangle 2: v2 -> v3 -> v1 (CCW from above => +Y normal)
    indices.push(idx2, idx3, idx1);
  }
}

// Create BufferGeometry
const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeometry.setIndex(indices);
terrainGeometry.computeVertexNormals();

// Material and mesh
const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrainMesh);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```