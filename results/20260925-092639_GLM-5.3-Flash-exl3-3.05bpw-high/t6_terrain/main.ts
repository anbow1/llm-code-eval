import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Renderer / Scene / Camera
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 140);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(24, 18, 28);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(30, 40, 15);
scene.add(sun);

// ---------------------------------------------------------------------------
// Hand-made terrain geometry (128x128 vertices, 20x20 units, centered)
// ---------------------------------------------------------------------------

const GRID_X = 128; // vertices along X
const GRID_Z = 128; // vertices along Z
const SIZE_X = 20;
const SIZE_Z = 20;

const vertexCount = GRID_X * GRID_Z;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);
const indices: number[] = [];

// Height function: sum of 3 sine/cosine layers, total amplitude ~2
function terrainHeight(x: number, z: number): number {
  let h = 0;
  h += Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.42 - 0.7) * 1.0;
  h += Math.sin(x * 0.85 - 0.4) * 0.6 + Math.cos(z * 0.95 + 2.1) * 0.6;
  h *= 0.7;
  h += Math.sin(x * 1.9 + z * 2.1) * 0.35;
  return h * 2.0; // overall amplitude ≈ 2
}

const halfX = SIZE_X / 2;
const halfZ = SIZE_Z / 2;
const stepX = SIZE_X / (GRID_X - 1);
const stepZ = SIZE_Z / (GRID_Z - 1);

let minHeight = Infinity;
let maxHeight = -Infinity;

for (let iz = 0; iz < GRID_Z; iz++) {
  for (let ix = 0; ix < GRID_X; ix++) {
    const x = ix * stepX - halfX;
    const z = iz * stepZ - halfZ;
    const y = terrainHeight(x, z);

    const i = iz * GRID_X + ix;
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    if (y < minHeight) minHeight = y;
    if (y > maxHeight) maxHeight = y;
  }
}

// Vertex colors by height: green (low) -> brown (middle) -> white (high)
const greenLow = new THREE.Color(0x3a8f3a);
const brownMid = new THREE.Color(0x8b6a42);
const whiteHigh = new THREE.Color(0xf2f2f2);
const tmpColor = new THREE.Color();

const heightRange = maxHeight - minHeight;

for (let i = 0; i < vertexCount; i++) {
  const y = positions[i * 3 + 1];
  const t = (y - minHeight) / heightRange; // 0..1

  if (t < 0.5) {
    tmpColor.copy(greenLow).lerp(brownMid, t / 0.5);
  } else {
    tmpColor.copy(brownMid).lerp(whiteHigh, (t - 0.5) / 0.5);
  }

  colors[i * 3 + 0] = tmpColor.r;
  colors[i * 3 + 1] = tmpColor.g;
  colors[i * 3 + 2] = tmpColor.b;
}

// Index buffer: two triangles per cell, wound so faces point up (+Y).
// Viewed from above (+Y), triangles must be counter-clockwise.
// a = (ix, iz)          b = (ix+1, iz)
// c = (ix,  iz+1)       d = (ix+1, iz+1)
for (let iz = 0; iz < GRID_Z - 1; iz++) {
  for (let ix = 0; ix < GRID_X - 1; ix++) {
    const a = iz * GRID_X + ix;
    const b = iz * GRID_X + ix + 1;
    const c = (iz + 1) * GRID_X + ix;
    const d = (iz + 1) * GRID_X + ix + 1;

    indices.push(a, c, b); // cross((c-a),(b-a)) => +Y
    indices.push(b, c, d); // cross((c-b),(d-b)) => +Y
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeometry.setIndex(indices);
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  flatShading: false,
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrain);

// ---------------------------------------------------------------------------
// Controls / Resize
// ---------------------------------------------------------------------------

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const fogBaseNear = scene.fog instanceof THREE.Fog ? scene.fog.near : 60;

let firstFrameDone = false;

renderer.setAnimationLoop((_timeMsec, _frame) => {
  const clockInfo = renderer.info.render; // not needed for motion; use own clock
  void clockInfo;

  // Delta-time based motion (gentle drifting fog distance for subtle atmosphere)
  if (!terrain.userData.clockStart) {
    terrain.userData.clockStart = performance.now();
  }
  const elapsedSec = (performance.now() - (terrain.userData.clockStart as number)) / 1000;

  const fog = scene.fog instanceof THREE.Fog ? scene.fog : null;
  if (fog !== null) {
    fog.near = fogBaseNear + Math.sin(elapsedSec * 0.35) * 6;
  }

  controls.update();
  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
