import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera – angled so the full 100×100 grid and wave are visible
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 50);
scene.add(directionalLight);

// Grid parameters
const GRID_SIZE: number = 100;
const SPACING: number = 1.0;
const CUBE_SIZE: number = 0.8;
const HALF: number = ((GRID_SIZE - 1) * SPACING) * 0.5;
const TOTAL: number = GRID_SIZE * GRID_SIZE;

// Geometry & Material
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.5,
  metalness: 0.3,
});

// InstancedMesh (single draw call for all 10 000 cubes)
const mesh: THREE.InstancedMesh = new THREE.InstancedMesh(geometry, material, TOTAL);
scene.add(mesh);

// Pre-compute per-instance data (positions, distances) and colours
const baseX: Float32Array = new Float32Array(TOTAL);
const baseZ: Float32Array = new Float32Array(TOTAL);
const distances: Float32Array = new Float32Array(TOTAL);

const tmpColor: THREE.Color = new THREE.Color();
for (let iz: number = 0; iz < GRID_SIZE; iz++) {
  for (let ix: number = 0; ix < GRID_SIZE; ix++) {
    const idx: number = iz * GRID_SIZE + ix;
    const x: number = ix * SPACING - HALF;
    const z: number = iz * SPACING - HALF;
    baseX[idx] = x;
    baseZ[idx] = z;
    distances[idx] = Math.sqrt(x * x + z * z);

    // Gradient hue across the grid
    const hue: number = ((ix / GRID_SIZE) + (iz / GRID_SIZE)) * 0.5;
    tmpColor.setHSL(hue, 0.8, 0.5);
    mesh.setColorAt(idx, tmpColor);
  }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable matrix – zero allocations inside the render loop
const mat: THREE.Matrix4 = new THREE.Matrix4();

// Wave parameters
const WAVE_K: number = 0.15;
const WAVE_SPEED: number = 2.0;
const WAVE_AMPLITUDE: number = 3.0;

// Timing
const clock: THREE.Clock = new THREE.Clock();
let elapsed: number = 0;
let firstFrame: boolean = true;

// Render loop
renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();
  elapsed += delta;

  for (let i: number = 0; i < TOTAL; i++) {
    const y: number =
      Math.sin(distances[i] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    mat.makeTranslation(baseX[i], y, baseZ[i]);
    mesh.setMatrixAt(i, mat);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Resize handling
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
