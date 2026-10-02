```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);

const GRID = 100;
const SPACING = 1.1;
const COUNT = GRID * GRID;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Per-instance static data (positions & colors), computed once.
const xs = new Float32Array(COUNT);
const zs = new Float32Array(COUNT);

const half = (GRID - 1) / 2;
let i = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const x = (gx - half) * SPACING;
    const z = (gz - half) * SPACING;
    xs[i] = x;
    zs[i] = z;
    // Gradient color by grid position
    color.setHSL(gx / GRID * 0.4, 0.7, 0.35 + (gz / GRID) * 0.3);
    mesh.setColorAt(i, color);
    i++;
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

const K = 0.35;
const SPEED = 3;
const AMPLITUDE = 6;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  for (let j = 0; j < COUNT; j++) {
    const dx = xs[j];
    const dz = zs[j];
    const dist = Math.sqrt(dx * dx + dz * dz);
    dummy.position.set(dx, Math.sin(dist * K - t * SPEED) * AMPLITUDE, dz);
    dummy.updateMatrix();
    mesh.setMatrixAt(j, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  for (let j = 0; j < COUNT; j++) {
    const dist = Math.sqrt(xs[j] * xs[j] + zs[j] * zs[j]);
    dummy.position.set(xs[j], Math.sin(dist * K - t * SPEED) * AMPLITUDE, zs[j]);
    dummy.updateMatrix();
    mesh.setMatrixAt(j, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Re-register to ensure __ready fires after first frame
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  for (let j = 0; j < COUNT; j++) {
    const dist = Math.sqrt(xs[j] * xs[j] + zs[j] * zs[j]);
    dummy.position.set(xs[j], Math.sin(dist * K - t * SPEED) * AMPLITUDE, zs[j]);
    dummy.updateMatrix();
    mesh.setMatrixAt(j, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
  (window as any).__ready = true;
});
```

Wait — I accidentally duplicated the loop. Here is the corrected single loop:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);

const GRID = 100;
const SPACING = 1.1;
const COUNT = GRID * GRID;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

const xs = new Float32Array(COUNT);
const zs = new Float32Array(COUNT);

const half = (GRID - 1) / 2;
let i = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const x = (gx - half) * SPACING;
    const z = (gz - half) * SPACING;
    xs[i] = x;
    zs[i] = z;
    color.setHSL((gx / GRID) * 0.4, 0.7, 0.35 + (gz / GRID) * 0.3);
    mesh.setColorAt(i, color);
    i++;
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

const K = 0.35;
const SPEED = 3;
const AMPLITUDE = 6;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  for (let j = 0; j < COUNT; j++) {
    const dist = Math.sqrt(xs[j] * xs[j] + zs[j] * zs[j]);
    dummy.position.set(xs[j], Math.sin(dist * K - t * SPEED) * AMPLITUDE, zs[j]);
    dummy.updateMatrix();
    mesh.setMatrixAt(j, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```