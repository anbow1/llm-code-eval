```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db8d2);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff2e0, 1.4);
dirLight.position.set(10, 20, 8);
scene.add(dirLight);

// ---------- Procedural terrain ----------
const GRID = 128;           // 128x128 vertices
const SIZE = 20;            // 20x20 units in XZ
const STEP = SIZE / (GRID - 1);

// Hand-made BufferGeometry (no built-in geometry)
const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const low = new THREE.Color(0x3d7a2a);   // green
const mid = new THREE.Color(0x8a6a45);   // brown
const high = new THREE.Color(0xffffff);  // white
const tmp = new THREE.Color();

function heightAt(x: number, z: number): number {
  // Sum of three sine/cosine layers, total amplitude ~2
  const h1 = Math.sin(x * 0.55) * Math.cos(z * 0.48) * 0.8;
  const h2 = Math.sin(x * 1.35 + z * 0.72) * 0.7;
  const h3 = Math.cos(x * 0.9 - z * 1.15) * 0.5;
  return h1 + h2 + h3;
}

let hMin = Infinity;
let hMax = -Infinity;

for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i = iz * GRID + ix;
    const x = -SIZE / 2 + ix * STEP;
    const z = -SIZE / 2 + iz * STEP;
    const y = heightAt(x, z);
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    if (y < hMin) hMin = y;
    if (y > hMax) hMax = y;
  }
}

// Vertex colors by height: green low -> brown middle -> white high
for (let i = 0; i < GRID * GRID; i++) {
  const y = positions[i * 3 + 1];
  const t = (y - hMin) / (hMax - hMin); // 0..1
  if (t < 0.5) {
    tmp.copy(low).lerp(mid, t * 2);
  } else {
    tmp.copy(mid).lerp(high, (t - 0.5) * 2);
  }
  colors[i * 3 + 0] = tmp.r;
  colors[i * 3 + 1] = tmp.g;
  colors[i * 3 + 2] = tmp.b;
}

// Index buffer: two triangles per cell, CCW winding viewed from +Y
const indices: number[] = [];
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;       // (x, z)
    const b = (iz + 1) * GRID + ix; // (x, z+1)
    const c = iz * GRID + (ix + 1);     // (x+1, z)
    const d = (iz + 1) * GRID + (ix + 1); // (x+1, z+1)
    // Triangle (a, b, d): a=(0,0), b=(0,1), d=(1,1) -> normal +Y
    indices.push(a, b, d);
    // Triangle (b, c, d): b=(0,1), c=(1,1), d=(1,1)-corner -> normal +Y
    indices.push(b, c, d);
  }
}

const terrainGeo = new THREE.BufferGeometry();
terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.setIndex(indices);
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.0,
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.maxDistance = 80;
controls.update();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const _delta = clock.getDelta(); // motion driven by delta time if needed
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```