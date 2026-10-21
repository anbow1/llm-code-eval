import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------------ */
/* Renderer / Scene / Camera                                          */
/* ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1220);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(20, 18, 20);
camera.lookAt(0, 0, 0);

/* ------------------------------------------------------------------ */
/* Lights                                                             */
/* ------------------------------------------------------------------ */

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(14, 22, 9);
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

/* ------------------------------------------------------------------ */
/* Procedural terrain (hand-made BufferGeometry)                      */
/* ------------------------------------------------------------------ */

const GRID = 128;                       // 128 x 128 vertices
const SIZE = 20;                        // 20 x 20 units in XZ
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

/** Sum of 3 sine/cosine layers, combined amplitude ~2. */
function heightAt(x: number, z: number): number {
  const layer1 = 1.0 * Math.sin(x * 0.35) * Math.cos(z * 0.4);
  const layer2 = 0.6 * Math.sin(x * 0.9 + 1.7) * Math.cos(z * 0.75 + 0.5);
  const layer3 = 0.35 * Math.cos(x * 1.9 - 0.4) * Math.sin(z * 2.1 + 2.2);
  return layer1 + layer2 + layer3;
}

const vertexCount = GRID * GRID;

const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);
const heights = new Float32Array(vertexCount);

// Pass 1: sample heights, record min / max for the color ramp.
let minH = Infinity;
let maxH = -Infinity;

for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i = iz * GRID + ix;
    const x = -HALF + ix * STEP;
    const z = -HALF + iz * STEP;
    const y = heightAt(x, z);

    heights[i] = y;
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
  }
}

// Pass 2: color by height -> green (low), brown (mid), white (high).
const cLow = new THREE.Color(0x2c6e2a);
const cMid = new THREE.Color(0x8a5a2b);
const cHigh = new THREE.Color(0xf4f6fa);
const tmpColor = new THREE.Color();

const span = Math.max(maxH - minH, 1e-6);

for (let i = 0; i < vertexCount; i++) {
  const t = (heights[i] - minH) / span; // 0 .. 1

  if (t < 0.5) {
    tmpColor.copy(cLow).lerp(cMid, t / 0.5);
  } else {
    tmpColor.copy(cMid).lerp(cHigh, (t - 0.5) / 0.5);
  }

  colors[i * 3 + 0] = tmpColor.r;
  colors[i * 3 + 1] = tmpColor.g;
  colors[i * 3 + 2] = tmpColor.b;
}

// Index buffer: two triangles per grid cell, wound so normals point +Y.
const indexCount = (GRID - 1) * (GRID - 1) * 6;
const indices = new Uint32Array(indexCount);
let idxPtr = 0;

for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;             // (ix,     iz)
    const b = iz * GRID + (ix + 1);       // (ix + 1, iz)
    const c = (iz + 1) * GRID + ix;       // (ix,     iz + 1)
    const d = (iz + 1) * GRID + (ix + 1); // (ix + 1, iz + 1)

    // Triangle 1: a -> c -> b  (u = +Z, v = +X  =>  u x v = +Y)
    indices[idxPtr++] = a;
    indices[idxPtr++] = c;
    indices[idxPtr++] = b;

    // Triangle 2: b -> c -> d
    indices[idxPtr++] = b;
    indices[idxPtr++] = c;
    indices[idxPtr++] = d;
  }
}

const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeometry.computeVertexNormals();
terrainGeometry.computeBoundingSphere();

const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
  metalness: 0.02,
  side: THREE.FrontSide,
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrain);

/* ------------------------------------------------------------------ */
/* Controls                                                           */
/* ------------------------------------------------------------------ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

/* ------------------------------------------------------------------ */
/* Resize                                                             */
/* ------------------------------------------------------------------ */

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
});

/* ------------------------------------------------------------------ */
/* Render loop                                                        */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Use elapsed/delta so nothing depends on frame count.
  controls.update(delta);
  terrain.position.y = Math.sin(elapsed * 0.35) * 0.05; // subtle breathing motion

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

/* ------------------------------------------------------------------ */
/* Test hooks                                                         */
/* ------------------------------------------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
