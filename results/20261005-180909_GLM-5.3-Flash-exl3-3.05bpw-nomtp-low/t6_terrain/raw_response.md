```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(14, 12, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 20, 8);
scene.add(dir);

const SIZE = 20;
const COLS = 128;
const ROWS = 128;

function height(x: number, z: number): number {
  return (
    Math.sin(x * 0.5) * Math.cos(z * 0.4) * 1.0 +
    Math.sin(x * 1.1 + 1.3) * Math.cos(z * 0.9 + 0.7) * 0.6 +
    Math.cos(x * 2.3 + 2.1) * Math.sin(z * 2.7 + 1.1) * 0.4
  );
}

const positions: number[] = [];
const colors: number[] = [];
const indices: number[] = [];

const green = new THREE.Color(0x2e8b3d);
const brown = new THREE.Color(0x8b5a2b);
const white = new THREE.Color(0xf5f5f5);

for (let iz = 0; iz < ROWS; iz++) {
  for (let ix = 0; ix < COLS; ix++) {
    const x = (ix / (COLS - 1)) * SIZE - SIZE / 2;
    const z = (iz / (ROWS - 1)) * SIZE - SIZE / 2;
    const y = height(x, z);
    positions.push(x, y, z);

    const t = THREE.MathUtils.clamp((y + 1.2) / 2.8, 0, 1);
    const c = new THREE.Color();
    if (t < 0.5) c.copy(green).lerp(brown, t / 0.5);
    else c.copy(brown).lerp(white, (t - 0.5) / 0.5);
    colors.push(c.r, c.g, c.b);
  }
}

for (let iz = 0; iz < ROWS - 1; iz++) {
  for (let ix = 0; ix < COLS - 1; ix++) {
    const a = iz * COLS + ix;
    const b = a + 1;
    const c = a + COLS;
    const d = c + 1;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9 });
const terrain = new THREE.Mesh(geometry, material);
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
  const delta = (time - (renderer as any).__lastTime ?? 0) / 1000;
  void delta;
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
```