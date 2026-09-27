import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera at an angle to see the whole grid
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(55, 55, 55);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(30, 50, 30);
scene.add(directionalLight);

// Grid constants
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const TOTAL = GRID_SIZE * GRID_SIZE;
const HALF_GRID = ((GRID_SIZE - 1) * SPACING) * 0.5;

// Geometry & Material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.3,
});

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);
scene.add(mesh);

// Pre-compute base positions and distances (no per-frame allocation)
const baseXZ = new Float32Array(TOTAL * 2);
const distances = new Float32Array(TOTAL);

const setupColor = new THREE.Color();

let idx = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = i * SPACING - HALF_GRID;
    const z = j * SPACING - HALF_GRID;
    baseXZ[idx * 2] = x;
    baseXZ[idx * 2 + 1] = z;
    distances[idx] = Math.sqrt(x * x + z * z);

    // Gradient color by grid position (hue from blue to red)
    const t = (i + j) / (2 * (GRID_SIZE - 1));
    setupColor.setHSL(t * 0.66, 0.85, 0.5);
    mesh.setColorAt(idx, setupColor);

    idx++;
  }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable matrix (no allocation in render loop)
const tempMatrix = new THREE.Matrix4();

// Wave parameters
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

// Clock
const clock = new THREE.Clock();
let ready = false;

// Render loop
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < TOTAL; i++) {
    const x = baseXZ[i * 2];
    const z = baseXZ[i * 2 + 1];
    const y = Math.sin(distances[i] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

    tempMatrix.makeTranslation(x, y, z);
    mesh.setMatrixAt(i, tempMatrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

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
