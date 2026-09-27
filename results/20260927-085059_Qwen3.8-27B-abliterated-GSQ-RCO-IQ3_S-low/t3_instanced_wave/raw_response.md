```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
const GRID = 100;
const SPACING = 1.0;
const HALF = (GRID / 2) * SPACING;
camera.position.set(HALF * 0.9, HALF * 0.9, HALF * 0.9);
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
directionalLight.position.set(50, 80, 50);
scene.add(directionalLight);

// InstancedMesh setup
const CUBE_SIZE = 0.5;
const COUNT = GRID * GRID;
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Reusable objects (no allocations in loop)
const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Pre-compute grid positions to avoid recomputation
const posX = new Float32Array(COUNT);
const posZ = new Float32Array(COUNT);
const distFromCenter = new Float32Array(COUNT);

let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = (i - GRID / 2 + 0.5) * SPACING;
    const z = (j - GRID / 2 + 0.5) * SPACING;
    posX[idx] = x;
    posZ[idx] = z;
    distFromCenter[idx] = Math.sqrt(x * x + z * z);
    idx++;
  }
}

// Set initial matrices and colors
for (let n = 0; n < COUNT; n++) {
  dummy.position.set(posX[n], 0, posZ[n]);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(n, dummy.matrix);

  // Gradient: hue based on normalized grid position
  const u = (n % GRID) / GRID;
  const v = Math.floor(n / GRID) / GRID;
  color.setHSL((u + v) * 0.5, 0.85, 0.55);
  instancedMesh.setColorAt(n, color);
}

instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) {
  instancedMesh.instanceColor.needsUpdate = true;
}
scene.add(instancedMesh);

// Animation
const clock = new THREE.Clock();
const WAVE_K = 0.5;
const WAVE_SPEED = 2.5;
const WAVE_AMPLITUDE = 1.5;
let ready = false;

renderer.setAnimationLoop(() => {
  const time = clock.getElapsedTime();

  for (let n = 0; n < COUNT; n++) {
    const y =
      Math.sin(distFromCenter[n] * WAVE_K - time * WAVE_SPEED) *
      WAVE_AMPLITUDE;
    dummy.position.set(posX[n], y, posZ[n]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(n, dummy.matrix);
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