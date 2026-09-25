import * as THREE from 'three';

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e1a);
scene.fog = new THREE.Fog(0x0b0e1a, 250, 500);

// ---------- Camera (angled so the whole grid + wave are visible) ----------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 90, 150);
camera.lookAt(0, 0, 0);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(80, 120, 50);
scene.add(dirLight);

// ---------- Instanced grid: 100 x 100 = 10,000 cubes ----------
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.4;
const CUBE_SIZE = 1.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Precomputed per-instance base data (no per-frame allocation)
const baseXZ = new Float32Array(COUNT * 2); // x, z
const dists = new Float32Array(COUNT); // distance from grid center

// Reused single Object3D for all matrix updates
const dummy = new THREE.Object3D();
const color = new THREE.Color();

const half = (GRID - 1) / 2;
let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - half) * SPACING;
    const z = (row - half) * SPACING;
    baseXZ[i * 2] = x;
    baseXZ[i * 2 + 1] = z;
    dists[i] = Math.sqrt(x * x + z * z);

    // Initial matrix
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Per-instance gradient color by grid position
    const t = (col + row) / (2 * (GRID - 1)); // 0..1 diagonal gradient
    color.setHSL(0.55 + t * 0.45, 0.75, 0.5);
    mesh.setColorAt(i, color);

    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

// ---------- Wave parameters ----------
const WAVE_K = 0.16;       // spatial frequency
const WAVE_SPEED = 4.0;    // temporal speed
const WAVE_AMPLITUDE = 3.0;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  for (let idx = 0; idx < COUNT; idx++) {
    const x = baseXZ[idx * 2];
    const z = baseXZ[idx * 2 + 1];
    const y = Math.sin(dists[idx] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
