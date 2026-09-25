import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  1,
  500
);
camera.position.set(80, 80, 80);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 80);
scene.add(dirLight);

// --- Grid setup ---
const SIZE = 100;
const COUNT = SIZE * SIZE; // 10000
const SPACING = 1.0;
const CUBE_SIZE = 0.7;
const OFFSET = -(SIZE - 1) / 2 * SPACING; // center the grid

// Pre-compute per-instance data (distances, base X/Z, colors)
const distances = new Float32Array(COUNT);
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);

// --- Geometry & Material ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.1,
});

// --- InstancedMesh ---
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// --- Colors (gradient by grid position) ---
const color = new THREE.Color();
let idx = 0;
for (let ix = 0; ix < SIZE; ix++) {
  for (let iz = 0; iz < SIZE; iz++) {
    const x = OFFSET + ix * SPACING;
    const z = OFFSET + iz * SPACING;
    const dist = Math.sqrt(x * x + z * z);

    baseX[idx] = x;
    baseZ[idx] = z;
    distances[idx] = dist;

    // Gradient: hue sweeps across the grid, lightness based on distance
    const hue = (ix + iz) / (2 * SIZE);
    const lightness = 0.35 + 0.3 * Math.sin(dist * 0.15);
    color.setHSL(hue, 0.8, lightness);
    mesh.setColorAt(idx, color);

    idx++;
  }
}
mesh.instanceColor!.needsUpdate = true;

// --- Wave parameters ---
const K = 0.3;          // spatial wave number
const SPEED = 3.0;      // temporal speed
const AMPLITUDE = 2.0;  // wave height

// --- Reusable dummy object (NO allocations in loop) ---
const dummy = new THREE.Object3D();

// --- Initial matrices ---
for (let i = 0; i < COUNT; i++) {
  dummy.position.set(baseX[i], 0, baseZ[i]);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;

scene.add(mesh);

// --- Animation ---
let firstFrame = true;

renderer.setAnimationLoop((timeMs: number) => {
  const time = timeMs * 0.001; // seconds

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * K - time * SPEED) * AMPLITUDE;
    dummy.position.set(baseX[i], y, baseZ[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
