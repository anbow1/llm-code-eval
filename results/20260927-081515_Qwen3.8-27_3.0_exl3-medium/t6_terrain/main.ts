import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Procedural terrain
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

// Height function: 3 layers of sine/cosine
function heightAt(x: number, z: number): number {
  const y1 = Math.sin(x * 0.6) * Math.cos(z * 0.4);
  const y2 = 0.5 * Math.sin(x * 1.3 + z * 0.9);
  const y3 = 0.3 * Math.cos(x * 2.2 - z * 1.7);
  return 2.0 * (y1 + y2 + y3);
}

// Build BufferGeometry
const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const lowColor = new THREE.Color(0x2d6b2d);   // green
const midColor = new THREE.Color(0x8b6b3d);   // brown
const highColor = new THREE.Color(0xffffff);  // white

const minY = -2.5;
const maxY = 2.5;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const y = heightAt(x, z);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Normalize height to 0..1 for color mapping
    const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));

    let r: number, g: number, b: number;
    if (t < 0.5) {
      const f = t / 0.5;
      r = lowColor.r + (midColor.r - lowColor.r) * f;
      g = lowColor.g + (midColor.g - lowColor.g) * f;
      b = lowColor.b + (midColor.b - lowColor.b) * f;
    } else {
      const f = (t - 0.5) / 0.5;
      r = midColor.r + (highColor.r - midColor.r) * f;
      g = midColor.g + (highColor.g - midColor.g) * f;
      b = midColor.b + (highColor.b - midColor.b) * f;
    }

    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer: two triangles per cell, CCW winding for +Y normal
const indexCount = (GRID - 1) * (GRID - 1) * 6;
const indices = new Uint32Array(indexCount);
let iIdx = 0;

for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const v0 = row * GRID + col;
    const v1 = row * GRID + col + 1;
    const v2 = (row + 1) * GRID + col;
    const v3 = (row + 1) * GRID + col + 1;

    // Triangle 1: v0, v2, v1 (CCW from above → +Y normal)
    indices[iIdx++] = v0;
    indices[iIdx++] = v2;
    indices[iIdx++] = v1;

    // Triangle 2: v1, v2, v3 (CCW from above → +Y normal)
    indices[iIdx++] = v1;
    indices[iIdx++] = v2;
    indices[iIdx++] = v3;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
  side: THREE.FrontSide,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
