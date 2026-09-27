import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(75, 55, 75);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(20, 40, 20);
scene.add(directionalLight);

// Grid constants
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.7;
const COUNT = GRID_SIZE * GRID_SIZE;

// Wave parameters
const WAVE_K = 0.4;
const WAVE_SPEED = 3.0;
const WAVE_AMPLITUDE = 1.8;

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.2,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Pre-allocate: base positions (x, z per instance) to avoid re-deriving each frame
const baseXZ = new Float32Array(COUNT * 2);

// Reusable objects for the render loop (no allocations inside the loop)
const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Initialize all instances: positions, matrices, colors
let idx = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = (i - GRID_SIZE / 2 + 0.5) * SPACING;
    const z = (j - GRID_SIZE / 2 + 0.5) * SPACING;
    baseXZ[idx * 2] = x;
    baseXZ[idx * 2 + 1] = z;

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Gradient by grid position: hue sweeps from blue (top-left) to warm (bottom-right)
    const u = i / (GRID_SIZE - 1);
    const v = j / (GRID_SIZE - 1);
    const hue = 0.6 + (u + v) * 0.35; // ~0.6 (blue) to ~0.95 (magenta/pink)
    color.setHSL(hue % 1.0, 0.75, 0.55);
    mesh.setColorAt(idx, color);

    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// Timing
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  // Update every instance's Y via the radial wave formula
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const idx2 = i * GRID_SIZE + j;
      const x = baseXZ[idx2 * 2];
      const z = baseXZ[idx2 * 2 + 1];
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx2, dummy.matrix);
    }
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
