import * as THREE from 'three';

// ------------------------------------------------------------------ config
const GRID = 100;             // 100 x 100 = 10,000 instances
const SPACING = 1.2;          // distance between cube centers
const CUBE_SIZE = 0.95;       // slightly smaller than spacing -> visible gaps
const WAVE_NUMBER = 0.25;     // k: phase radians per world unit
const WAVE_SPEED = 2.0;       // phase speed (radians per second)
const WAVE_AMPLITUDE = 6.0;   // vertical amplitude

const COUNT = GRID * GRID;
const HALF_SPAN = ((GRID - 1) / 2) * SPACING;

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// ------------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0e1a');

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
);
camera.position.set(105, 80, 105); // elevated, angled view of the full grid
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(60, 100, 40);
scene.add(directionalLight);

// ---------------------------------------------------------- instanced mesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.35,
  metalness: 0.15,
});

const cubes = new THREE.InstancedMesh(geometry, material, COUNT);
cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
cubes.frustumCulled = false; // instances move beyond the unit-cube bounds
scene.add(cubes);

// --- static per-instance data, allocated exactly once ---------------------
const offsetX = new Float32Array(COUNT);
const offsetZ = new Float32Array(COUNT);
const distance = new Float32Array(COUNT);

let maxDistance = 0;
for (let iz = 0; iz < GRID; iz++) {
  const z = iz * SPACING - HALF_SPAN;
  for (let ix = 0; ix < GRID; ix++) {
    const i = iz * GRID + ix;
    const x = ix * SPACING - HALF_SPAN;
    offsetX[i] = x;
    offsetZ[i] = z;
    const d = Math.hypot(x, z);
    distance[i] = d;
    if (d > maxDistance) maxDistance = d;
  }
}

// --- per-instance colors: radial gradient out from the centre -------------
const colorCenter = new THREE.Color('#ffb347');
const colorEdge = new THREE.Color('#2f6bff');
const color = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  color.copy(colorEdge).lerp(colorCenter, 1 - distance[i] / maxDistance);
  cubes.setColorAt(i, color);
}
if (cubes.instanceColor !== null) {
  cubes.instanceColor.needsUpdate = true;
}

// --- reusable helpers: nothing is allocated inside the render loop --------
const matrix = new THREE.Matrix4();
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  elapsed += clock.getDelta();

  for (let i = 0; i < COUNT; i++) {
    const y =
      Math.sin(distance[i] * WAVE_NUMBER - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    matrix.makeTranslation(offsetX[i], y, offsetZ[i]);
    cubes.setMatrixAt(i, matrix);
  }
  cubes.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ------------------------------------------------------------------ resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------------------------------------------- test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
