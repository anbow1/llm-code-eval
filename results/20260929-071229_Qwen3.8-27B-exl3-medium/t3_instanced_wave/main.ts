import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// --- Camera (angled to see whole grid + wave) ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(85, 65, 85);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 80, 60);
scene.add(directionalLight);

// --- Grid constants ---
const GRID = 100;
const COUNT = GRID * GRID; // 10 000
const SPACING = 1.2;
const CUBE_SIZE = 0.8;

// --- InstancedMesh ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  metalness: 0.25,
});
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// --- Pre-compute per-instance data (no allocations later) ---
const positionsXZ = new Float32Array(COUNT * 2);
const distances = new Float32Array(COUNT);

const color = new THREE.Color();
let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = (i - GRID / 2 + 0.5) * SPACING;
    const z = (j - GRID / 2 + 0.5) * SPACING;
    positionsXZ[idx * 2] = x;
    positionsXZ[idx * 2 + 1] = z;
    distances[idx] = Math.sqrt(x * x + z * z);

    // Diagonal HSL gradient
    const t = (i / GRID + j / GRID) * 0.5;
    color.setHSL(t, 0.85, 0.5);
    mesh.setColorAt(idx, color);

    idx++;
  }
}

// Initial matrices (flat grid at y = 0)
const dummy = new THREE.Object3D();
for (let i = 0; i < COUNT; i++) {
  dummy.position.set(positionsXZ[i * 2], 0, positionsXZ[i * 2 + 1]);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

// --- Wave parameters ---
const K = 0.35;
const SPEED = 3.0;
const AMPLITUDE = 3.0;

// --- Clock / ready flag ---
const clock = new THREE.Clock();
let ready = false;

// --- Render loop (zero allocations) ---
renderer.setAnimationLoop(() => {
  const elapsed: number = clock.getElapsedTime();

  for (let i = 0; i < COUNT; i++) {
    const x: number = positionsXZ[i * 2];
    const z: number = positionsXZ[i * 2 + 1];
    const y: number =
      Math.sin(distances[i] * K - elapsed * SPEED) * AMPLITUDE;

    dummy.position.set(x, y, z);
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

// --- Resize ---
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
