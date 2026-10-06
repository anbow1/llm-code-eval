import * as THREE from 'three';

// --- Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(50, 80, 30);
scene.add(dirLight);

// --- Grid configuration ---
const GRID_SIZE = 100;
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.0;
const WAVE_K = 0.15;
const WAVE_SPEED = 3.0;

// --- InstancedMesh ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.3,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// --- Pre-compute grid positions and distances ---
const positionsX = new Float32Array(COUNT);
const positionsZ = new Float32Array(COUNT);
const distances = new Float32Array(COUNT);

const halfGrid = (GRID_SIZE - 1) * SPACING * 0.5;

for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const idx = iz * GRID_SIZE + ix;
    const x = ix * SPACING - halfGrid;
    const z = iz * SPACING - halfGrid;
    positionsX[idx] = x;
    positionsZ[idx] = z;
    distances[idx] = Math.sqrt(x * x + z * z);
  }
}

// --- Set colors (gradient by grid position using HSL) ---
const color = new THREE.Color();
for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const idx = iz * GRID_SIZE + ix;
    const hue = (ix / GRID_SIZE + iz / GRID_SIZE) * 0.5;
    const saturation = 0.7 + 0.3 * (ix / GRID_SIZE);
    const lightness = 0.4 + 0.2 * (iz / GRID_SIZE);
    color.setHSL(hue % 1.0, saturation, lightness);
    mesh.setColorAt(idx, color);
  }
}
mesh.instanceColor!.needsUpdate = true;

// --- Reusable objects for animation (no allocations in loop) ---
const dummy = new THREE.Object3D();

let elapsed = 0;

function animate(time: number): void {
  const deltaTime = renderer.info.render.frame === 1 ? 0 : (time - (animate as any).__lastTime || 0) * 0.001;
  (animate as any).__lastTime = time;
  elapsed += deltaTime;

  for (let i = 0; i < COUNT; i++) {
    const x = positionsX[i];
    const z = positionsZ[i];
    const dist = distances[i];

    const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * AMPLITUDE;

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  // Slow camera orbit for visual interest
  const angle = elapsed * 0.1;
  camera.position.x = 80 * Math.cos(angle);
  camera.position.z = 80 * Math.sin(angle);
  camera.position.y = 60;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
