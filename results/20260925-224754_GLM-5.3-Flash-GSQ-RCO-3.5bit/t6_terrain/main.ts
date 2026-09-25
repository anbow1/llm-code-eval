import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Scene / Camera / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc7e8);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 13, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Hand-made terrain geometry ----------
const GRID = 128;               // 128x128 vertices
const SIZE = 20;                // 20x20 units, centered at origin
const HALF = SIZE / 2;

// Height field: sum of 3 sine/cosine layers, amplitude ~2 total
function terrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.9 +
    Math.sin(x * 0.9 + 1.3) * Math.cos(z * 0.7) * 0.55 +
    Math.cos(x * 1.7) * Math.sin(z * 1.9 + 2.1) * 0.3
  );
}

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

// Fill positions, track min/max height for color normalization
let hMin = Infinity;
let hMax = -Infinity;
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = -HALF + (i / (GRID - 1)) * SIZE;
    const z = -HALF + (j / (GRID - 1)) * SIZE;
    const y = terrainHeight(x, z);
    if (y < hMin) hMin = y;
    if (y > hMax) hMax = y;

    const idx = (j * GRID + i) * 3;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
  }
}

// Height -> color gradient: green (low) -> brown (middle) -> white (high)
const colorLow = new THREE.Color(0x3a8a3a);   // green
const colorMid = new THREE.Color(0x8b5a2b);   // brown
const colorHigh = new THREE.Color(0xffffff);  // white
const tmpColor = new THREE.Color();

for (let v = 0; v < vertexCount; v++) {
  const y = positions[v * 3 + 1];
  const t = (y - hMin) / (hMax - hMin); // 0..1
  if (t < 0.5) {
    tmpColor.copy(colorLow).lerp(colorMid, t * 2);
  } else {
    tmpColor.copy(colorMid).lerp(colorHigh, (t - 0.5) * 2);
  }
  colors[v * 3] = tmpColor.r;
  colors[v * 3 + 1] = tmpColor.g;
  colors[v * 3 + 2] = tmpColor.b;
}

// Index buffer: two triangles per grid cell, wound so normals point UP (+Y)
const cells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cells * 6);
let ptr = 0;
for (let j = 0; j < GRID - 1; j++) {
  for (let i = 0; i < GRID - 1; i++) {
    const a = j * GRID + i;         // (x,     z)
    const b = (j + 1) * GRID + i;   // (x,     z+dz)
    const c = j * GRID + i + 1;     // (x+dx,  z)
    const d = (j + 1) * GRID + i + 1; // (x+dx, z+dz)
    // Cross products of these orderings yield +Y normals
    indices[ptr++] = a;
    indices[ptr++] = b;
    indices[ptr++] = c;
    indices[ptr++] = b;
    indices[ptr++] = d;
    indices[ptr++] = c;
  }
}

const terrainGeo = new THREE.BufferGeometry();
terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  flatShading: false,
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
dirLight.position.set(12, 18, 8);
scene.add(dirLight);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.maxDistance = 80;
controls.minDistance = 5;
controls.update();

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // time-based, available for any motion
  void delta;

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
