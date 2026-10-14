import * as THREE from 'three';

// --- Renderer / Scene / Camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(55, 45, 65);
camera.lookAt(0, 0, 0);

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);

// --- Instanced grid of cubes ---
const GRID_SIZE = 100;
const SPACING = 1.1;
const COUNT = GRID_SIZE * GRID_SIZE;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.45,
  metalness: 0.1,
});

const cubes = new THREE.InstancedMesh(geometry, material, COUNT);
cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Per-instance colors: gradient from center outward
const center = (GRID_SIZE - 1) / 2;
const color = new THREE.Color();
for (let ix = 0; ix < GRID_SIZE; ix++) {
  for (let iz = 0; iz < GRID_SIZE; iz++) {
    const i = ix * GRID_SIZE + iz;
    const dx = ix - center;
    const dz = iz - center;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const maxDist = Math.sqrt(2) * center;
    const t = dist / maxDist;
    color.setHSL(0.62 - 0.62 * t, 0.8, 0.5 + 0.15 * Math.cos((dx + dz) * 0.1));
    cubes.setColorAt(i, color);
  }
}
if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;

// Set initial matrices
const dummy = new THREE.Object3D();
for (let ix = 0; ix < GRID_SIZE; ix++) {
  for (let iz = 0; iz < GRID_SIZE; iz++) {
    const i = ix * GRID_SIZE + iz;
    dummy.position.set(
      (ix - center) * SPACING,
      0,
      (iz - center) * SPACING
    );
    dummy.updateMatrix();
    cubes.setMatrixAt(i, dummy.matrix);
  }
}
cubes.instanceMatrix.needsUpdate = true;
scene.add(cubes);

// --- Wave parameters ---
const WAVE_K = 0.55;
const WAVE_SPEED = 2.2;
const WAVE_AMPLITUDE = 5.0;

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let hasRendered = false;

renderer.setAnimationLoop((time) => {
  const t = time * 0.001; // ms -> seconds
  const delta = 1 / 60; // not needed for correctness; motion uses absolute time

  void delta;

  // Update every instance's Y position with a radial wave (no allocations)
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    for (let iz = 0; iz < GRID_SIZE; iz++) {
      const i = ix * GRID_SIZE + iz;
      const dx = ix - center;
      const dz = iz - center;
      const dist = Math.sqrt(dx * dx + dz * dz);
      dummy.position.set(
        (ix - center) * SPACING,
        Math.sin(dist * WAVE_K - t * WAVE_SPEED) * WAVE_AMPLITUDE,
        (iz - center) * SPACING
      );
      dummy.updateMatrix();
      cubes.setMatrixAt(i, dummy.matrix);
    }
  }
  cubes.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
});

// --- Test hooks ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
