

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(70, 45, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

// Grid constants
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.0;
const K = 0.3;
const SPEED = 2.0;

// Geometry & material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Precompute base X, Z and distance-from-center
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const baseDist = new Float32Array(COUNT);

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = i * SPACING - (GRID - 1) * SPACING * 0.5;
    const z = j * SPACING - (GRID - 1) * SPACING * 0.5;
    baseX[idx] = x;
    baseZ[idx] = z;
    baseDist[idx] = Math.sqrt(x * x + z * z);
  }
}

// Set per-instance colours (gradient by grid position)
const tmpColor = new THREE.Color();
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const u = i / (GRID - 1);
    const v = j / (GRID - 1);
    tmpColor.setHSL(0.55 + u * 0.35, 0.75, 0.3 + v * 0.4);
    mesh.setColorAt(idx, tmpColor);
  }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable matrix – no allocations inside the render loop
const mat = new THREE.Matrix4();

let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const t = time / 1000; // seconds

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const y = Math.sin(baseDist[idx] * K - t * SPEED) * AMPLITUDE;
      mat.makeTranslation(baseX[idx], y, baseZ[idx]);
      mesh.setMatrixAt(idx, mat);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```