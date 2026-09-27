import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 0.5;
const CUBE_SIZE = 0.3;
const WAVE_K = 1.0;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 1.2;

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(35, 28, 35);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(15, 25, 15);
scene.add(dirLight);

// --- InstancedMesh setup ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.1,
  roughness: 0.6,
});
const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-allocated reusable objects (no allocations in render loop)
const reusableMatrix = new THREE.Matrix4();
const reusablePosition = new THREE.Vector3();
const reusableQuaternion = new THREE.Quaternion();
const reusableScale = new THREE.Vector3(1, 1, 1);
const reusableColor = new THREE.Color();

// Pre-compute per-instance x, z, and radial distance
const instanceXZ: number[] = [];
const instanceDist: number[] = [];

let idx = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const x = (gx - GRID / 2 + 0.5) * SPACING;
    const z = (gz - GRID / 2 + 0.5) * SPACING;
    const dist = Math.sqrt(x * x + z * z);
    instanceXZ.push(x, z);
    instanceDist.push(dist);

    // Initial matrix (flat on Y=0)
    reusablePosition.set(x, 0, z);
    reusableMatrix.compose(reusablePosition, reusableQuaternion, reusableScale);
    instancedMesh.setMatrixAt(idx, reusableMatrix);

    // Gradient colour by grid position (hue sweeps across the grid)
    const hue = (gx / GRID) * 0.6 + (gz / GRID) * 0.4;
    reusableColor.setHSL(hue % 1.0, 0.85, 0.55);
    instancedMesh.setColorAt(idx, reusableColor);

    idx++;
  }
}

instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) {
  instancedMesh.instanceColor.needsUpdate = true;
}
scene.add(instancedMesh);

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
let elapsed: number = 0;
let isReady: boolean = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  const timePhase = elapsed * WAVE_SPEED;

  for (let i = 0; i < COUNT; i++) {
    const x = instanceXZ[i * 2];
    const z = instanceXZ[i * 2 + 1];
    const dist = instanceDist[i];
    const y = Math.sin(dist * WAVE_K - timePhase) * WAVE_AMPLITUDE;

    reusablePosition.set(x, y, z);
    reusableMatrix.compose(reusablePosition, reusableQuaternion, reusableScale);
    instancedMesh.setMatrixAt(i, reusableMatrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
