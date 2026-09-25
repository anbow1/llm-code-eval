import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 65, 95);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
directionalLight.position.set(50, 90, 40);
scene.add(directionalLight);

// --- Grid parameters ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.4;

// --- Instanced mesh ---
const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.45,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// --- Initial placement + per-instance colors ---
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const cA = new THREE.Color(0x1e3a8a); // deep blue (corner)
const cB = new THREE.Color(0xf59e0b); // warm amber (edge)

for (let ix = 0; ix < GRID; ix++) {
  for (let iz = 0; iz < GRID; iz++) {
    const i = ix * GRID + iz;
    const x = (ix - (GRID - 1) / 2) * SPACING;
    const z = (iz - (GRID - 1) / 2) * SPACING;

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Gradient by normalized grid position
    const t = ((ix + iz) / (2 * GRID)) ** 1.5;
    color.copy(cA).lerp(cB, t);
    mesh.setColorAt(i, color);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// --- Wave parameters ---
const K = 0.14; // spatial frequency
const SPEED = 2.2; // wave speed
const AMPLITUDE = 4.5;
const HALF = (GRID - 1) / 2;

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;

// --- Render loop ---
renderer.setAnimationLoop((time) => {
  const t = time * 0.001; // ms -> seconds

  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const i = ix * GRID + iz;
      const x = (ix - HALF) * SPACING;
      const z = (iz - HALF) * SPACING;

      const dist = Math.sqrt(x * x + z * z);
      dummy.position.set(
        x,
        Math.sin(dist * K - t * SPEED) * AMPLITUDE,
        z
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
