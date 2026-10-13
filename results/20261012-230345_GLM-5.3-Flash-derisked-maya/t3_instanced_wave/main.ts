import * as THREE from 'three';

const GRID_SIZE = 100;
const SPACING = 1;
const CUBE_SIZE = 0.5;
const AMPLITUDE = 2.0;
const WAVE_NUMBER = 0.35;
const SPEED = 2.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const gridExtent = (GRID_SIZE - 1) * SPACING;
const centerOffset = gridExtent / 2;
camera.position.set(centerOffset * 0.6, 60, gridExtent * 0.75);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(30, 50, 20);
scene.add(directional);

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
scene.add(mesh);

// Color gradient by grid position (assigned once)
const color = new THREE.Color();
for (let x = 0; x < GRID_SIZE; x++) {
  for (let z = 0; z < GRID_SIZE; z++) {
    const index = z * GRID_SIZE + x;
    const u = x / (GRID_SIZE - 1);
    const v = z / (GRID_SIZE - 1);
    color.setHSL(0.55 + 0.3 * (u * 0.5 + v * 0.5), 0.7, 0.25 + 0.45 * v);
    mesh.setColorAt(index, color);
  }
}

// Center the mesh so the grid is at the origin
mesh.position.set(-centerOffset, 0, -centerOffset);

// Reusable objects — no allocations in the render loop
const dummy = new THREE.Object3D();
const center = (GRID_SIZE - 1) * SPACING * 0.5;

function updateWave(time: number): void {
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      const dx = x * SPACING - center;
      const dz = z * SPACING - center;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const waveY = Math.sin(dist * WAVE_NUMBER - time * SPEED) * AMPLITUDE;
      dummy.position.set(x * SPACING, waveY, z * SPACING);
      dummy.updateMatrix();
      mesh.setMatrixAt(z * GRID_SIZE + x, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrameDone = false;

renderer.setAnimationLoop((time) => {
  const elapsed = time / 1000; // ms -> seconds
  updateWave(elapsed);
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
