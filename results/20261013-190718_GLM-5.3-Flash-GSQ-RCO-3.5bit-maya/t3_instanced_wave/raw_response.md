```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------- Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d14);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Elevated, angled view so the whole 100x100 grid and the wave are visible.
const CAM_HEIGHT = 90;
const CAM_BACK = 85;
camera.position.set(0, CAM_HEIGHT, CAM_BACK);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(60, 120, 45);
scene.add(directionalLight);

// ---------------------------------------------------------------- Instanced grid
const GRID_SIZE = 100;              // 100x100 => 10,000 instances
const INSTANCE_COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1.0;                // distance between grid cells
const CUBE_SIZE = 0.6;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.1,
});

const cubes = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(cubes);

// Precompute static grid data (no allocations inside the render loop).
const half = (GRID_SIZE - 1) / 2;
const positionsX = new Float32Array(INSTANCE_COUNT);
const positionsZ = new Float32Array(INSTANCE_COUNT);
const distances = new Float32Array(INSTANCE_COUNT);
const maxDistance = Math.hypot(half, half) * SPACING;

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

for (let gx = 0; gx < GRID_SIZE; gx++) {
  for (let gz = 0; gz < GRID_SIZE; gz++) {
    const idx = gx * GRID_SIZE + gz;
    const x = (gx - half) * SPACING;
    const z = (gz - half) * SPACING;
    positionsX[idx] = x;
    positionsZ[idx] = z;
    distances[idx] = Math.hypot(x, z);

    // Per-instance gradient color by grid position (radial, center -> edge).
    const t = distances[idx] / maxDistance;
    tmpColor.setHSL(0.62 - t * 0.55, 0.85, 0.45 + 0.15 * t);
    cubes.setColorAt(idx, tmpColor);
  }
}
if (cubes.instanceColor !== null) {
  cubes.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------- Wave animation
const WAVE_K = 0.35;      // spatial frequency
const WAVE_SPEED = 4.0;   // radians per second
const WAVE_AMPLITUDE = 4.0;

const clock = new THREE.Clock();
let elapsedTime = 0;
let hasRenderedFirstFrame = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsedTime += delta;

  // Update every instance's Y via the reused Object3D/Matrix — no allocations.
  for (let idx = 0; idx < INSTANCE_COUNT; idx++) {
    const y =
      Math.sin(distances[idx] * WAVE_K - elapsedTime * WAVE_SPEED) *
      WAVE_AMPLITUDE;
    dummy.position.set(positionsX[idx], y, positionsZ[idx]);
    dummy.updateMatrix();
    cubes.setMatrixAt(idx, dummy.matrix);
  }
  cubes.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!hasRenderedFirstFrame) {
    hasRenderedFirstFrame = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------- Test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```