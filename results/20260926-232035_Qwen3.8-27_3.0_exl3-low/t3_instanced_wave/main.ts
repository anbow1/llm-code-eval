import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(75, 65, 75);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 80, 40);
scene.add(directionalLight);

// --- InstancedMesh setup ---
const GRID = 100;
const TOTAL = GRID * GRID;
const CUBE = 0.7;
const SPACING = 1.0;
const HALF = (GRID - 1) / 2;

const geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.3,
});
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);

// Reusable objects – no allocations in the render loop
const mat4 = new THREE.Matrix4();
const col = new THREE.Color();

// Initialize instance matrices and colors
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - HALF) * SPACING;
    const z = (j - HALF) * SPACING;

    mat4.makeTranslation(x, 0, z);
    mesh.setMatrixAt(idx, mat4);

    const hue = (i / GRID + j / GRID) * 0.5;
    col.setHSL(hue, 0.85, 0.55);
    mesh.setColorAt(idx, col);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Wave parameters ---
const WAVE_K = 0.25;
const WAVE_SPEED = 3.0;
const WAVE_AMP = 3.0;

const clock = new THREE.Clock();
let ready = false;

// --- Render loop ---
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const x = (i - HALF) * SPACING;
      const z = (j - HALF) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_K - t * WAVE_SPEED) * WAVE_AMP;

      mat4.makeTranslation(x, y, z);
      mesh.setMatrixAt(idx, mat4);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
