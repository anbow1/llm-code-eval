import * as THREE from 'three';

const COLS = 100;
const ROWS = 100;
const COUNT = COLS * ROWS;
const SPACING = 0.3;
const CUBE_SIZE = 0.18;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

// Camera at an angle
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(18, 22, 18);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0x606070, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
dirLight.position.set(10, 20, 8);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
fillLight.position.set(-5, 5, -10);
scene.add(fillLight);

// Geometry & material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.15,
});

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Pre-compute grid positions and distances
const centerX = (COLS - 1) / 2;
const centerZ = (ROWS - 1) / 2;
const distances = new Float32Array(COUNT);
const posXs = new Float32Array(COUNT);
const posZs = new Float32Array(COUNT);

// Reusable objects — zero allocations in render loop
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

// Initial transforms + per-instance gradient colors
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const idx = row * COLS + col;
    const cx = col - centerX;
    const cz = row - centerZ;
    const x = cx * SPACING;
    const z = cz * SPACING;

    posXs[idx] = x;
    posZs[idx] = z;
    distances[idx] = Math.sqrt(cx * cx + cz * cz);

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Gradient: hue from grid position
    const t = col / (COLS - 1);
    const s = row / (ROWS - 1);
    tmpColor.setHSL(0.55 + t * 0.35 + s * 0.1, 0.85, 0.50);
    mesh.setColorAt(idx, tmpColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// Animation constants
const WAVE_K = 0.55;
const WAVE_SPEED = 3.2;
const WAVE_AMPLITUDE = 0.6;

let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const t = time * 0.001; // ms → seconds

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * WAVE_K - t * WAVE_SPEED) * WAVE_AMPLITUDE;

    dummy.position.set(posXs[i], y, posZs[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  // Slow camera orbit for extra visual flair
  const angle = t * 0.15;
  camera.position.set(
    20 * Math.cos(angle),
    20,
    20 * Math.sin(angle),
  );
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
