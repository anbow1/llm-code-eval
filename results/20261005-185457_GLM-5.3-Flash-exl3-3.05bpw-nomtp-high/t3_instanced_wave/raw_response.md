```ts
import * as THREE from 'three';

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// ---------- Grid configuration ----------
const GRID = 100;          // 100 x 100 = 10,000 instances
const SPACING = 1.0;       // distance between cubes
const CUBE_SIZE = 0.55;
const HALF = (GRID - 1) / 2; // grid centered on origin
const WAVE_K = 0.55;       // spatial frequency
const WAVE_SPEED = 2.2;    // phase speed
const AMPLITUDE = 3.0;     // wave height

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(40, 60, 30);
scene.add(dirLight);

// ---------- Instanced mesh ----------
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// ---------- Precompute grid data (outside render loop) ----------
const positionsX = new Float32Array(GRID * GRID);
const positionsZ = new Float32Array(GRID * GRID);
const distances = new Float32Array(GRID * GRID);

const cR = new THREE.Color(0x1e3a8a); // low side of gradient
const cG = new THREE.Color(0x22d3ee); // high side of gradient
const tmpColor = new THREE.Color();

const dummy = new THREE.Object3D(); // reused for all matrix updates
dummy.scale.set(1, 1, 1);
dummy.rotation.set(0, 0, 0);

let i = 0;
for (let ix = 0; ix < GRID; ix++) {
  for (let iz = 0; iz < GRID; iz++) {
    const x = (ix - HALF) * SPACING;
    const z = (iz - HALF) * SPACING;
    positionsX[i] = x;
    positionsZ[i] = z;
    distances[i] = Math.sqrt(x * x + z * z);

    // Per-instance color: diagonal gradient across the grid
    const t = (ix + iz) / (2 * (GRID - 1));
    tmpColor.copy(cR).lerp(cG, t);
    mesh.setColorAt(i, tmpColor);

    i++;
  }
}
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// Initial placement (flat wave at t = 0)
for (let j = 0; j < GRID * GRID; j++) {
  dummy.position.set(positionsX[j], 0, positionsZ[j]);
  dummy.updateMatrix();
  mesh.setMatrixAt(j, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;

// ---------- Camera framing ----------
function frameCamera(): void {
  const extent = (GRID * SPACING) / 2;
  camera.position.set(extent * 0.95, extent * 1.15, extent * 0.95);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
frameCamera();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;

  const phase = t * WAVE_SPEED;
  const count = GRID * GRID;

  // Reuse `dummy` and `dummy.matrix` — no allocations per frame.
  for (let j = 0; j < count; j++) {
    const y = Math.sin(distances[j] * WAVE_K - phase) * AMPLITUDE;
    dummy.position.set(positionsX[j], y, positionsZ[j]);
    dummy.updateMatrix();
    mesh.setMatrixAt(j, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```