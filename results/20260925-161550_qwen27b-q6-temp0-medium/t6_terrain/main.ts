import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Scene, camera, renderer
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb8de);
scene.fog = new THREE.Fog(0x8fb8de, 45, 100);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(17, 13, 17);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// OrbitControls
// ---------------------------------------------------------------------------

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1.0, 0);
controls.minDistance = 5;
controls.maxDistance = 70;
controls.maxPolarAngle = Math.PI / 2 - 0.02;

// ---------------------------------------------------------------------------
// Procedural terrain — hand-built BufferGeometry (no built-in geometry)
// ---------------------------------------------------------------------------

const GRID = 128; // vertices per side
const SIZE = 20; // world units in XZ
const VERT_COUNT = GRID * GRID;

// Sum of three sine/cosine layers, total amplitude ~2
function heightAt(x: number, z: number): number {
  const layer1 = 1.0 * Math.sin(x * 0.7) * Math.cos(z * 0.55);
  const layer2 = 0.6 * Math.sin(x * 1.8 + 1.3) * Math.sin(z * 1.5 + 0.7);
  const layer3 = 0.4 * Math.cos(x * 3.6 - 0.4) * Math.cos(z * 4.2 + 2.1);
  return layer1 + layer2 + layer3;
}

const positions = new Float32Array(VERT_COUNT * 3);
const colors = new Float32Array(VERT_COUNT * 3);

// Pass 1: positions, track height range
let minH = Infinity;
let maxH = -Infinity;
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const x = (i / (GRID - 1) - 0.5) * SIZE;
    const z = (j / (GRID - 1) - 0.5) * SIZE;
    const y = heightAt(x, z);
    positions[idx * 3 + 0] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
  }
}

// Color stops by normalized height: green (low) -> brown (mid) -> white (high)
const lowColor = new THREE.Color(0x2e7d32); // green
const midColor = new THREE.Color(0x79553a); // brown
const highColor = new THREE.Color(0xf5f5f5); // white
const tmpColor = new THREE.Color();

function colorForHeight(t: number): THREE.Color {
  if (t < 0.5) {
    return tmpColor.lerpColors(lowColor, midColor, t * 2);
  }
  return tmpColor.lerpColors(midColor, highColor, (t - 0.5) * 2);
}

// Pass 2: vertex colors
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const idx = j * GRID + i;
    const y = positions[idx * 3 + 1];
    const t = THREE.MathUtils.clamp((y - minH) / (maxH - minH), 0, 1);
    colorForHeight(t).toArray(colors, idx * 3);
  }
}

// Index buffer: two triangles per grid cell, +Y (up) winding
const CELL_COUNT = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(CELL_COUNT * 6);
let k = 0;
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const v00 = j * GRID + i;
    const v10 = j * GRID + i + 1;
    const v01 = (j + 1) * GRID + i;
    const v11 = (j + 1) * GRID + i + 1;

    // Winding verified: (v00 -> v01 -> v11) and (v00 -> v11 -> v10) give +Y normals
    indices[k++] = v00;
    indices[k++] = v01;
    indices[k++] = v11;

    indices[k++] = v00;
    indices[k++] = v11;
    indices[k++] = v10;
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  flatShading: false
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrain);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff2d9, 1.6);
sunLight.position.set(18, 22, 10);
scene.add(sunLight);

// ---------------------------------------------------------------------------
// Animation (delta / elapsed time based)
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let readySet = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  // Slowly orbit the sun around the terrain
  const sunAngle = t * 0.12;
  sunLight.position.set(Math.cos(sunAngle) * 24, 20, Math.sin(sunAngle) * 24);

  // Gentle "breathing" of the ambient to show dt-driven motion
  ambientLight.intensity = 0.55 + 0.05 * Math.sin(t * 0.6);

  controls.update();
  renderer.render(scene, camera);

  if (!readySet) {
    readySet = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
