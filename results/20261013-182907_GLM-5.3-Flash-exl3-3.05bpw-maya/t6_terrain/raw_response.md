```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene & Camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(14, 12, 16);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(10, 18, 6);
scene.add(sun);

// ---------------------------------------------------------------------------
// Procedural terrain height function (3 sine/cosine layers, amplitude ~2)
// ---------------------------------------------------------------------------
function terrainHeight(x: number, z: number): number {
  let h = 0;
  h += Math.sin(x * 0.6 + 1.3) * Math.cos(z * 0.5 - 0.7) * 1.1; // large rolling hills
  h += Math.sin(x * 1.7 - z * 1.2 + 0.4) * 0.6;                 // medium detail
  h += Math.cos(x * 3.1 + z * 2.6) * 0.3;                       // fine detail
  return h; // max amplitude ~2.0
}

// ---------------------------------------------------------------------------
// Hand-made BufferGeometry: 128x128 vertices over a 20x20 XZ area
// ---------------------------------------------------------------------------
const GRID = 128;              // vertices per side
const SIZE = 20;               // world size in XZ
const STEP = SIZE / (GRID - 1); // spacing between vertices

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

const colorLow = new THREE.Color(0x3d8b3d);    // green
const colorMid = new THREE.Color(0x8b5a2b);    // brown
const colorHigh = new THREE.Color(0xffffff);   // white
const tmpColor = new THREE.Color();

const minH = -2.0;
const maxH = 2.0;

for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i = iz * GRID + ix;
    const x = -SIZE / 2 + ix * STEP;
    const z = -SIZE / 2 + iz * STEP;
    const y = terrainHeight(x, z);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Vertex colors by height: green (low) -> brown (middle) -> white (high)
    const t = (y - minH) / (maxH - minH); // 0..1
    if (t < 0.5) {
      tmpColor.copy(colorLow).lerp(colorMid, t / 0.5);
    } else {
      tmpColor.copy(colorMid).lerp(colorHigh, (t - 0.5) / 0.5);
    }
    colors[i * 3 + 0] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
}

// Index buffer: two triangles per grid cell, wound so normals point UP (+Y)
const indices = new Uint32Array((GRID - 1) * (GRID - 1) * 6);
let ptr = 0;
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;         // (x,     z)
    const b = a + 1;                  // (x + 1, z)
    const c = a + GRID;               // (x,     z + 1)
    const d = a + GRID + 1;           // (x + 1, z + 1)

    indices[ptr++] = a;
    indices[ptr++] = c;
    indices[ptr++] = b;

    indices[ptr++] = b;
    indices[ptr++] = c;
    indices[ptr++] = d;
  }
}

const terrainGeo = new THREE.BufferGeometry();
terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.0,
  flatShading: false,
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.maxDistance = 70;
controls.minDistance = 3;
controls.update();

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Render loop (delta-time based)
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  void delta;

  // Gentle sun orbit so lighting subtly shifts over time
  sun.position.set(
    Math.cos(elapsed * 0.05) * 18,
    18,
    Math.sin(elapsed * 0.05) * 18
  );

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Test exposure
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```