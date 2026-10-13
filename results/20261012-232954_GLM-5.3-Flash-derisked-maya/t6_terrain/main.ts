import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2530);
scene.fog = new THREE.Fog(0x1a2530, 30, 70);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(16, 14, 18);
camera.lookAt(0, 0, 0);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ---------- Hand-made terrain BufferGeometry ----------
const GRID = 128;          // vertices per side
const SIZE = 20;           // world units in XZ
const STEP = SIZE / (GRID - 1);

function terrainHeight(x: number, z: number): number {
  // Three layered trig functions, total amplitude about 2
  return (
    1.0 * Math.sin(x * 0.9) * Math.cos(z * 0.7) +
    0.6 * Math.sin(z * 1.4 + x * 0.8) +
    0.4 * Math.cos(x * 2.0 - z * 1.1)
  );
}

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const colorLow = new THREE.Color(0x3d8b3d);   // green
const colorMid = new THREE.Color(0x8b6b3d);   // brown
const colorHigh = new THREE.Color(0xf2f2f2);  // white
const tmpColor = new THREE.Color();

let minH = Infinity;
let maxH = -Infinity;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = -SIZE / 2 + ix * STEP;
    const z = -SIZE / 2 + iz * STEP;
    const h = terrainHeight(x, z);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
    const i = (iz * GRID + ix) * 3;
    positions[i] = x;
    positions[i + 1] = h;
    positions[i + 2] = z;
  }
}

// Vertex colors by normalized height: green -> brown -> white
const heightSpan = maxH - minH;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i3 = (iz * GRID + ix) * 3;
    const t = (positions[i3 + 1] - minH) / heightSpan;
    if (t < 0.5) {
      tmpColor.copy(colorLow).lerp(colorMid, t / 0.5);
    } else {
      tmpColor.copy(colorMid).lerp(colorHigh, (t - 0.5) / 0.5);
    }
    colors[i3] = tmpColor.r;
    colors[i3 + 1] = tmpColor.g;
    colors[i3 + 2] = tmpColor.b;
  }
}

// Index buffer: two triangles per cell, wound so faces point UP (+Y)
const indices = new Uint32Array((GRID - 1) * (GRID - 1) * 6);
let ptr = 0;
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;         // (x, z)
    const b = a + 1;                  // (x+1, z)
    const c = a + GRID;               // (x, z+1)
    const d = c + 1;                  // (x+1, z+1)
    indices[ptr++] = a;
    indices[ptr++] = c;
    indices[ptr++] = b; // +Y winding
    indices[ptr++] = b;
    indices[ptr++] = c;
    indices[ptr++] = d; // +Y winding
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2d9, 1.4);
sun.position.set(12, 20, 8);
scene.add(sun);

const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
fill.position.set(-10, 8, -12);
scene.add(fill);

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
let firstFrameDone = false;

renderer.setAnimationLoop((_, deltaTime) => {
  const delta = Math.min(deltaTime, 0.1);
  const elapsed = performance.now() / 1000;

  // Gentle motion driven by time, not frame counts
  sun.position.set(
    Math.cos(elapsed * 0.05) * 14,
    18,
    Math.sin(elapsed * 0.05) * 14
  );
  terrain.rotation.y += delta * 0.03;

  controls.update();
  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
