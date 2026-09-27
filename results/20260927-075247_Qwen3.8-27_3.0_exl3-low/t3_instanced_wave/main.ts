import * as THREE from 'three';

const GRID_SIZE = 100;
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1;
const CUBE_SIZE = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(60, 50, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

interface GridCell {
  x: number;
  z: number;
  dist: number;
}

const cells: GridCell[] = [];
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

let idx = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = (i - GRID_SIZE / 2 + 0.5) * SPACING;
    const z = (j - GRID_SIZE / 2 + 0.5) * SPACING;
    const dist = Math.sqrt(x * x + z * z);
    cells.push({ x, z, dist });

    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    const nx = i / (GRID_SIZE - 1);
    const nz = j / (GRID_SIZE - 1);
    tmpColor.setHSL(0.55 * nx + 0.35 * nz, 0.85, 0.5);
    mesh.setColorAt(idx, tmpColor);

    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

const clock = new THREE.Clock();
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

let isReady = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < COUNT; i++) {
    const cell = cells[i];
    const y = Math.sin(cell.dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    dummy.position.set(cell.x, y, cell.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
