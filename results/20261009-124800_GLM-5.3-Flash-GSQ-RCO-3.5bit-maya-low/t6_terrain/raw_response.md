```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(16, 14, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

const amb = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(amb);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 20, 8);
scene.add(dir);

// ---- hand-made terrain geometry ----
const GRID = 128; // vertices per side
const SIZE = 20;  // world units
const half = SIZE / 2;
const step = SIZE / (GRID - 1);

function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.35) * Math.cos(z * 0.35) * 1.0 +
    Math.sin(x * 0.8 + 1.3) * Math.cos(z * 0.6 + 0.7) * 0.6 +
    Math.sin((x + z) * 1.4) * 0.3
  );
}

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);
const lowColor = new THREE.Color(0x2e7d32);   // green
const midColor = new THREE.Color(0x8d6e63);   // brown
const highColor = new THREE.Color(0xffffff);  // white

let minH = Infinity, maxH = -Infinity;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = -half + ix * step;
    const z = -half + iz * step;
    const y = heightAt(x, z);
    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
    const i = (iz * GRID + ix) * 3;
    positions[i] = x;
    positions[i + 1] = y;
    positions[i + 2] = z;
  }
}

for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i = (iz * GRID + ix) * 3;
    const t = (positions[i + 1] - minH) / (maxH - minH);
    const c = new THREE.Color();
    if (t < 0.5) c.copy(lowColor).lerp(midColor, t * 2);
    else c.copy(midColor).lerp(highColor, (t - 0.5) * 2);
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
}

const indices: number[] = [];
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;
    const b = a + 1;
    const c = a + GRID;
    const d = c + 1;
    // CCW when viewed from above (+Y)
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geo.setIndex(indices);
geo.computeVertexNormals();

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
const terrain = new THREE.Mesh(geo, mat);
scene.add(terrain);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

let firstFrame = true;
renderer.setAnimationLoop((time) => {
  const delta = Math.min((time || 0) / 1000, 0.1);
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
  void delta;
});
```