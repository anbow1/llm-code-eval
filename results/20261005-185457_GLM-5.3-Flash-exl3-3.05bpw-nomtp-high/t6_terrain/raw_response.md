```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Scene, camera, renderer
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a8c8);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(14, 12, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
sun.position.set(10, 18, 6);
scene.add(sun);

// ---------------------------------------------------------------------------
// Hand-made terrain geometry (no built-in geometry classes)
// ---------------------------------------------------------------------------
const GRID = 128;          // 128x128 vertices per side
const SIZE = 20;           // 20x20 units in XZ
const SEG = GRID - 1;      // number of quads per side
const step = SIZE / SEG;

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

// Height function: 3 sine/cosine layers, total amplitude ~2
function terrainHeight(x: number, z: number): number {
  const nx = x / SIZE;
  const nz = z / SIZE;
  const h =
    0.9 * Math.sin(nx * Math.PI * 3.1 + 0.4) * Math.cos(nz * Math.PI * 2.3) +
    0.6 * Math.sin((nx + nz) * Math.PI * 4.7 + 1.7) +
    0.5 * Math.cos(nx * Math.PI * 7.3) * Math.sin(nz * Math.PI * 6.1);
  return h;
}

let ptr = 0;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = ix * step - SIZE / 2;
    const z = iz * step - SIZE / 2;
    const y = terrainHeight(x, z);
    positions[ptr + 0] = x;
    positions[ptr + 1] = y;
    positions[ptr + 2] = z;
    ptr += 3;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Index buffer: two triangles per quad, counterclockwise seen from +Y
const indices = new Uint32Array(SEG * SEG * 6);
let ii = 0;
for (let iz = 0; iz < SEG; iz++) {
  for (let ix = 0; ix < SEG; ix++) {
    const a = iz * GRID + ix;        // (x,   z)
    const b = iz * GRID + ix + 1;    // (x+1, z)
    const c = (iz + 1) * GRID + ix;  // (x,   z+1)
    const d = (iz + 1) * GRID + ix + 1; // (x+1, z+1)
    // CCW from above -> normals point +Y
    indices[ii++] = a; indices[ii++] = c; indices[ii++] = b;
    indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
  }
}
geometry.setIndex(new THREE.BufferAttribute(indices, 1));

geometry.computeVertexNormals();

// Vertex colors by height: green low, brown middle, white high
const colorLow = new THREE.Color(0x2e7d32);   // green
const colorMid = new THREE.Color(0x8d6e4a);   // brown
const colorHigh = new THREE.Color(0xffffff);  // white

const tmpColor = new THREE.Color();
ptr = 0;
for (let iv = 0; iv < GRID * GRID; iv++) {
  const y = positions[iv * 3 + 1];
  if (y < 0.6) {
    const t = Math.max(0, (y + 2) / (0.6 + 2));
    tmpColor.copy(colorLow).lerp(colorMid, t);
  } else {
    const t = Math.min(1, (y - 0.6) / (2.0 - 0.6));
    tmpColor.copy(colorMid).lerp(colorHigh, t);
  }
  colors[ptr + 0] = tmpColor.r;
  colors[ptr + 1] = tmpColor.g;
  colors[ptr + 2] = tmpColor.b;
  ptr += 3;
}
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  flatShading: false,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);
controls.update();

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = renderer.getDelta();
  const elapsed = renderer.getElapsedTime();

  // Gentle ambient rotation of the sun for subtle shading shifts
  sun.position.set(
    10 * Math.cos(elapsed * 0.1),
    18,
    10 * Math.sin(elapsed * 0.1)
  );

  controls.update();

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```