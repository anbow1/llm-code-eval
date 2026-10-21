```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GRID = 100;                       // 100 x 100 = 10,000 instances
const COUNT = GRID * GRID;
const SPACING = 0.5;                    // distance between cube centres
const CUBE_SIZE = 0.42;                 // edge length of a single cube
const AMPLITUDE = 1.35;                 // wave height
const WAVE_K = 0.34;                    // radial frequency
const WAVE_SPEED = 2.2;                 // temporal frequency
const HALF_EXTENT = ((GRID - 1) * SPACING) / 2;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05070d';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene & camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x05070d, 110, 240);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(46, 50, 46);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0x88aaff, 1.1);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
keyLight.position.set(40, 80, 30);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x4466ff, 1.0);
fillLight.position.set(-50, 30, -40);
scene.add(fillLight);

// ---------------------------------------------------------------------------
// One InstancedMesh for all 10,000 cubes
// ---------------------------------------------------------------------------
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.frustumCulled = false; // matrices change every frame
scene.add(mesh);

// ---------------------------------------------------------------------------
// Pre-computed per-instance data (x, z, radial distance) + per-instance colour
// ---------------------------------------------------------------------------
const xPositions = new Float32Array(COUNT);
const zPositions = new Float32Array(COUNT);
const distances = new Float32Array(COUNT);

const tmpColor = new THREE.Color();

for (let iz = 0; iz < GRID; iz++) {
  const z = iz * SPACING - HALF_EXTENT;
  const v = iz / (GRID - 1);

  for (let ix = 0; ix < GRID; ix++) {
    const x = ix * SPACING - HALF_EXTENT;
    const u = ix / (GRID - 1);
    const i = iz * GRID + ix;

    xPositions[i] = x;
    zPositions[i] = z;
    distances[i] = Math.hypot(x, z);

    // Gradient across the grid: hue shifts along both axes, lightness too.
    const hue = 0.62 - 0.55 * (0.5 * u + 0.5 * v);
    const lightness = 0.42 + 0.22 * (1 - 0.5 * (u + v));
    tmpColor.setHSL(hue, 0.85, lightness);
    mesh.setColorAt(i, tmpColor);
  }
}

if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Reused scratch matrix — no allocations inside the render loop
// ---------------------------------------------------------------------------
const scratchMatrix = new THREE.Matrix4();

function updateWave(time: number): void {
  const phase = time * WAVE_SPEED;

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * WAVE_K - phase) * AMPLITUDE;
    scratchMatrix.makeTranslation(xPositions[i], y, zPositions[i]);
    mesh.setMatrixAt(i, scratchMatrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05); // clamp long tab-switch gaps
  elapsed += delta;

  updateWave(elapsed);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```