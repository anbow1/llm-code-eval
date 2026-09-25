import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;
const AMPLITUDE = 2.0;
const WAVE_K = 0.35;
const WAVE_SPEED = 3.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 50, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 80, 30);
scene.add(dirLight);

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.5,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

const halfGrid = (GRID - 1) / 2;

// Reusable objects for render loop (no allocations)
const reusableMatrix = new THREE.Matrix4();
const reusableColor = new THREE.Color();

// Set initial colors with gradient by grid position
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const r = i / (GRID - 1);
    const g = j / (GRID - 1);
    const b = (i + j) / (2 * (GRID - 1));
    reusableColor.setRGB(r * 0.7 + 0.3, g * 0.7 + 0.3, b * 0.5 + 0.5);
    mesh.setColorAt(idx, reusableColor);
  }
}

if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const x = (i - halfGrid) * SPACING;
      const z = (j - halfGrid) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * AMPLITUDE;

      reusableMatrix.makeTranslation(x, y, z);
      mesh.setMatrixAt(idx, reusableMatrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  (window as any).__ready = true;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
