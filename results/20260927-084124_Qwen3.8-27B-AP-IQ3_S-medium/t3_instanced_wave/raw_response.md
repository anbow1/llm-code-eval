```ts
import * as THREE from 'three';

// --- Scene ---
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// --- Camera ---
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(75, 55, 75);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 60, 20);
scene.add(directionalLight);

// --- Instanced Grid ---
const GRID: number = 100;
const COUNT: number = GRID * GRID;
const SPACING: number = 1.0;
const AMPLITUDE: number = 2.0;
const K: number = 0.5;
const SPEED: number = 2.0;

const boxGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.6,
});

const mesh: THREE.InstancedMesh = new THREE.InstancedMesh(boxGeometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Pre-compute per-instance data (positions + distance from center)
const posX: Float32Array = new Float32Array(COUNT);
const posZ: Float32Array = new Float32Array(COUNT);
const dists: Float32Array = new Float32Array(COUNT);

const dummy: THREE.Object3D = new THREE.Object3D();
const tmpColor: THREE.Color = new THREE.Color();

for (let i = 0; i < COUNT; i++) {
  const row: number = Math.floor(i / GRID);
  const col: number = i % GRID;
  const x: number = (col - (GRID - 1) / 2) * SPACING;
  const z: number = (row - (GRID - 1) / 2) * SPACING;

  posX[i] = x;
  posZ[i] = z;
  dists[i] = Math.sqrt(x * x + z * z);

  dummy.position.set(x, 0, z);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);

  // Gradient colour by distance from center
  const maxDist: number = (GRID / 2) * SPACING * Math.SQRT2;
  const hue: number = dists[i] / maxDist;
  tmpColor.setHSL(hue * 0.65, 0.85, 0.55);
  mesh.setColorAt(i, tmpColor);
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

// --- Resize ---
const onResize: () => void = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener('resize', onResize);

// --- Animation ---
let lastTimestamp: number = 0;
let elapsed: number = 0;
let firstFrame: boolean = true;

const animate: (timestamp: number) => void = (timestamp: number) => {
  // Compute delta in seconds
  let delta: number;
  if (lastTimestamp === 0) {
    delta = 0;
  } else {
    delta = (timestamp - lastTimestamp) / 1000;
  }
  lastTimestamp = timestamp;
  elapsed += delta;

  const phase: number = elapsed * SPEED;

  // Update every instance – no allocations here
  for (let i = 0; i < COUNT; i++) {
    const y: number = Math.sin(dists[i] * K - phase) * AMPLITUDE;
    dummy.position.set(posX[i], y, posZ[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
};

renderer.setAnimationLoop(animate);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```