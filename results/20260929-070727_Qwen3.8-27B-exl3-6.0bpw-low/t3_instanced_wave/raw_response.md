

```ts
import * as THREE from 'three';

const GRID_SIZE = 100;
const COUNT = GRID_SIZE * GRID_SIZE;
const HALF = (GRID_SIZE - 1) / 2;

const K = 0.3;
const SPEED = 3.0;
const AMPLITUDE = 3.0;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 70, 90);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 80, 40);
scene.add(directionalLight);

// Geometry & Material
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.3,
});

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-allocated reusable objects (no allocations in loop)
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

// Pre-compute per-instance data
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const distances = new Float32Array(COUNT);

let idx = 0;
for (let ix = 0; ix < GRID_SIZE; ix++) {
  for (let iz = 0; iz < GRID_SIZE; iz++) {
    const x = ix - HALF;
    const z = iz - HALF;

    baseX[idx] = x;
    baseZ[idx] = z;
    distances[idx] = Math.sqrt(x * x + z * z);

    // Gradient color by grid position
    const t = (ix + iz) / (2 * (GRID_SIZE - 1));
    tmpColor.setHSL(0.55 + t * 0.35, 0.85, 0.45 + t * 0.15);
    mesh.setColorAt(idx, tmpColor);

    // Initial matrix (flat)
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

// Clock
const clock = new THREE.Clock();

// Ready flag
let ready = false;

// Render loop
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * K - elapsed * SPEED) * AMPLITUDE;
    dummy.position.set(baseX[i], y, baseZ[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```