import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 55, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

// --- Instanced grid of cubes ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const BASE_Y = 0;

const boxGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });

const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, COUNT);
scene.add(instancedMesh);

// Reusable objects — no allocations inside the render loop
const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

// Initial matrices (flat grid) and per-instance colors (gradient by grid position)
let index = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const x = (gx - (GRID - 1) / 2) * SPACING;
    const z = (gz - (GRID - 1) / 2) * SPACING;
    dummy.position.set(x, BASE_Y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);

    // Gradient from blue (one corner) to red (opposite corner)
    const t = (gx + gz) / (2 * (GRID - 1));
    tempColor.setHSL(0.66 - 0.66 * t, 0.8, 0.5 + 0.15 * t);
    instancedMesh.setColorAt(index, tempColor);

    index++;
  }
}
instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) {
  instancedMesh.instanceColor.needsUpdate = true;
}

// --- Wave parameters ---
const WAVE_K = 0.35;
const WAVE_SPEED = 3.0;
const WAVE_AMPLITUDE = 6.0;
const CENTER_OFFSET = (GRID - 1) / 2;

// Precompute distances from center so the loop only does sin + matrix writes
const distances = new Float32Array(COUNT);
index = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const dx = gx - CENTER_OFFSET;
    const dz = gz - CENTER_OFFSET;
    distances[index] = Math.sqrt(dx * dx + dz * dz);
    index++;
  }
}

// --- Resize handling ---
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --- Render loop ---
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time / 1000; // seconds

  // Radial wave: update every instance's Y via setMatrixAt (reusing `dummy`)
  index = 0;
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const x = (gx - CENTER_OFFSET) * SPACING;
      const z = (gz - CENTER_OFFSET) * SPACING;
      const y = Math.sin(distances[index] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);
      index++;
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

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
