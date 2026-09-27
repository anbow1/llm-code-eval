```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 65, 80);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 80, 40);
scene.add(directionalLight);

// Grid constants
const GRID = 100;
const SPACING = 1;
const HALF = (GRID - 1) / 2;
const COUNT = GRID * GRID;

// Wave parameters
const WAVE_K = 0.35;
const WAVE_SPEED = 2.5;
const WAVE_AMPLITUDE = 2.5;

// Pre-allocate per-instance data
const posArray = new Float32Array(COUNT * 2); // x, z pairs
const distArray = new Float32Array(COUNT);    // distance from center

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - HALF) * SPACING;
    const z = (j - HALF) * SPACING;
    posArray[idx * 2] = x;
    posArray[idx * 2 + 1] = z;
    distArray[idx] = Math.sqrt(x * x + z * z);
  }
}

// Geometry & Material
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.15,
});

// InstancedMesh
const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, COUNT);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Set per-instance colors (gradient by grid position)
const tmpColor = new THREE.Color();
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const nx = (i - HALF) / HALF; // -1 to 1
    const nz = (j - HALF) / HALF; // -1 to 1
    const hue = 0.55 + nx * 0.15 + nz * 0.1;
    const sat = 0.7;
    const light = 0.45 + 0.1 * (1 - Math.sqrt(nx * nx + nz * nz));
    tmpColor.setHSL(hue, sat, light);
    instancedMesh.setColorAt(idx, tmpColor);
  }
}
instancedMesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
scene.add(instancedMesh);

// Reusable objects (zero allocations in the loop)
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();
let ready = false;

// Render loop
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const x = posArray[idx * 2];
      const z = posArray[idx * 2 + 1];
      const y =
        Math.sin(distArray[idx] * WAVE_K - elapsed * WAVE_SPEED) *
        WAVE_AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize handling
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