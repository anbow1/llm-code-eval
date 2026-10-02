import * as THREE from 'three';

// ---------- Config ----------
const GRID_X = 100;
const GRID_Z = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.6;
const WAVE_AMPLITUDE = 3.0;
const WAVE_K = 0.35;
const WAVE_SPEED = 2.0;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const gridHalfWidth = (GRID_X * SPACING) / 2;
const cameraDistance = GRID_X * SPACING * 0.75;
camera.position.set(
  cameraDistance * 0.7,
  cameraDistance * 0.65,
  cameraDistance * 0.7
);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 80, 30);
scene.add(dirLight);

// ---------- Instanced grid of cubes ----------
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, GRID_X * GRID_Z);

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const total = GRID_X * GRID_Z;

// Precompute static per-instance X/Z data once (no per-frame grid math needed for layout)
const baseX = new Float32Array(total);
const baseZ = new Float32Array(total);
const gridDistance = new Float32Array(total);

let index = 0;
for (let ix = 0; ix < GRID_X; ix++) {
  for (let iz = 0; iz < GRID_Z; iz++) {
    const x = (ix - GRID_X / 2 + 0.5) * SPACING;
    const z = (iz - GRID_Z / 2 + 0.5) * SPACING;
    baseX[index] = x;
    baseZ[index] = z;
    gridDistance[index] = Math.sqrt(x * x + z * z);

    // Gradient color by grid position (blue -> red across X, green tilt across Z)
    const tX = ix / (GRID_X - 1);
    const tZ = iz / (GRID_Z - 1);
    color.setRGB(0.15 + 0.85 * tX, 0.3 + 0.4 * tZ, 1.0 - 0.85 * tX);
    instancedMesh.setColorAt(index, color);

    index++;
  }
}

// Initial placement (matrix before first frame)
for (let i = 0; i < total; i++) {
  dummy.position.set(baseX[i], 0, baseZ[i]);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor !== null) {
  instancedMesh.instanceColor.needsUpdate = true;
}

scene.add(instancedMesh);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------
(window as unknown as Record<string, unknown>).__scene = scene;
(window as unknown as Record<string, unknown>).__camera = camera;
(window as unknown as Record<string, unknown>).__renderer = renderer;

// ---------- Render loop ----------
renderer.setAnimationLoop((_time: number, frame?: THREE.XRFrame) => {
  void frame;
  const elapsed = performance.now() / 1000;

  // Reuse `dummy` and its matrix — zero allocations here
  for (let i = 0; i < total; i++) {
    const waveY =
      Math.sin(gridDistance[i] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    dummy.position.set(baseX[i], waveY, baseZ[i]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!(window as unknown as Record<string, unknown>).__ready) {
    (window as unknown as Record<string, unknown>).__ready = true;
  }
});
