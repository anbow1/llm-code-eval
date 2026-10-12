import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------- scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ec8dd);

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

// ------------------------------------------------------------ terrain ----
// Hand-made BufferGeometry: 128x128 vertices spanning 20x20 units in XZ.
const GRID = 128;          // vertices per side
const SEG = GRID - 1;      // 127 cells per side
const SIZE = 20;           // world units in X and Z

// Three-layer procedural height function (sum of sines/cosines), amp ~ 2.
function terrainHeight(x: number, z: number): number {
  return (
    1.1 * Math.sin(x * 0.5) * Math.cos(z * 0.45) +
    0.6 * Math.sin(x * 1.3 + z * 0.9) +
    0.3 * Math.cos(x * 2.1 - z * 1.7)
  );
}

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

const MIN_H = -2.0;
const MAX_H = 2.0;

// Height-based color palette: green (low) -> brown (mid) -> white (high).
const C_LOW = new THREE.Color(0.22, 0.55, 0.20);
const C_MID = new THREE.Color(0.55, 0.38, 0.20);
const C_HIGH = new THREE.Color(0.97, 0.97, 0.99);
const tmpColor = new THREE.Color();

let p = 0;
for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = (i / SEG - 0.5) * SIZE;
    const z = (j / SEG - 0.5) * SIZE;
    const y = terrainHeight(x, z);

    positions[p] = x;
    positions[p + 1] = y;
    positions[p + 2] = z;

    // Normalized height with color stops at 45% and 75% of the range.
    const t = THREE.MathUtils.clamp((y - MIN_H) / (MAX_H - MIN_H), 0, 1);
    if (t < 0.45) {
      tmpColor.copy(C_LOW).lerp(C_MID, THREE.MathUtils.smoothstep(t, 0.0, 0.45));
    } else {
      tmpColor.copy(C_MID).lerp(C_HIGH, THREE.MathUtils.smoothstep(t, 0.45, 0.75));
    }
    colors[p] = tmpColor.r;
    colors[p + 1] = tmpColor.g;
    colors[p + 2] = tmpColor.b;

    p += 3;
  }
}

// Index buffer: two triangles per cell, wound so normals point UP (+Y).
const indices = new Uint16Array(SEG * SEG * 6);
let idx = 0;
for (let j = 0; j < SEG; j++) {
  for (let i = 0; i < SEG; i++) {
    const a = j * GRID + i;         // (x,     z)
    const b = j * GRID + i + 1;     // (x+dx,  z)
    const c = (j + 1) * GRID + i;   // (x,     z+dz)
    const d = (j + 1) * GRID + i + 1; // (x+dx, z+dz)
    // From +Y, counter-clockwise order => upward-facing normal.
    indices[idx++] = a; indices[idx++] = c; indices[idx++] = b;
    indices[idx++] = b; indices[idx++] = c; indices[idx++] = d;
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
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrain);

// ------------------------------------------------------------- lights ----
scene.add(new THREE.AmbientLight(0xffffff, 0.45));

const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
sun.position.set(12, 22, 9);
scene.add(sun);

// ------------------------------------------------------------ controls ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.5, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

// -------------------------------------------------------------- resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------- test hooks ----
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ----------------------------------------------------------- render loop ----
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // timed motion basis (controls damping)
  controls.update();

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
