```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 70, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Grid parameters
const GRID_SIZE = 100;
const SPACING = 0.8;
const COUNT = GRID_SIZE * GRID_SIZE;
const OFFSET = (GRID_SIZE - 1) * SPACING * 0.5;

// Geometry and material
const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.5,
});

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Dummy object reused for matrix updates (no allocations in loop)
const dummy = new THREE.Object3D();

// Colors: gradient by grid position
const color = new THREE.Color();
let index = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = (i / GRID_SIZE) * 360;
    const y = (j / GRID_SIZE) * 360;
    color.setHSL(((x + y) % 360) / 360, 0.7, 0.5);
    mesh.setColorAt(index, color);
    index++;
  }
}
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// Wave parameters
const K = 0.15;
const SPEED = 3.0;
const AMPLITUDE = 2.5;

// Animation
const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  const elapsed = clock.getElapsedTime();

  let idx = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = i * SPACING - OFFSET;
      const z = j * SPACING - OFFSET;

      const dx = x - 0;
      const dz = z - 0;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const y = Math.sin(dist * K - elapsed * SPEED) * AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

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