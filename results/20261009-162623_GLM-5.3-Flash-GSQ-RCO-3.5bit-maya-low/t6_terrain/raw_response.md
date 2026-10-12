```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88aadd);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(18, 16, 22);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 20, 8);
scene.add(dir);

// --- Procedural terrain geometry ---
const GRID = 128; // vertices per side
const SIZE = 20; // units in XZ

function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.55) * Math.cos(z * 0.45) * 0.9 +
    Math.sin(x * 0.15 + 1.7) * Math.sin(z * 0.2) * 1.1 +
    Math.cos(x * 1.3 + 4.0) * Math.cos(z * 1.1 + 2.0) * 0.25
  );
}

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

let p = 0;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = (ix / (GRID - 1) - 0.5) * SIZE;
    const z = (iz / (GRID - 1) - 0.5) * SIZE;
    const y = heightAt(x, z);
    positions[p] = x;
    positions[p + 1] = y;
    positions[p + 2] = z;

    // Height-based color: green -> brown -> white
    const t = THREE.MathUtils.clamp((y + 1.5) / 3.5, 0, 1);
    const low = new THREE.Color(0x2e7d32);
    const mid = new THREE.Color(0x8d6e63);
    const high = new THREE.Color(0xffffff);
    const c = t < 0.5 ? low.clone().lerp(mid, t * 2) : mid.clone().lerp(high, (t - 0.5) * 2);
    colors[p] = c.r;
    colors[p + 1] = c.g;
    colors[p + 2] = c.b;
    p += 3;
  }
}

const indices: number[] = [];
for (let iz = 0; iz < GRID - 1; iz++) {
  for (let ix = 0; ix < GRID - 1; ix++) {
    const a = iz * GRID + ix;
    const b = a + 1;
    const c = a + GRID;
    const d = c + 1;
    // Winding for +Y facing (counter-clockwise seen from above)
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geo.setIndex(indices);
geo.computeVertexNormals();

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
const terrain = new THREE.Mesh(geo, mat);
scene.add(terrain);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

let firstFrame = true;
renderer.setAnimationLoop((/* time */) => {
  const delta = renderer.clock ? 0 : 0; // not used; keep loop time-based below
  const t = performance.now() / 1000;
  const dt = 1 / 60; // damping handled internally by controls
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
  void delta; void dt; void t;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```