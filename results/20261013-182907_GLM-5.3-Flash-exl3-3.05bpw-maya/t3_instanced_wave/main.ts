import * as THREE from 'three';

// ---------- Basic setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(60, 55, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(40, 60, 30);
scene.add(dirLight);

// ---------- Instanced grid of cubes ----------
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1;

const geometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Static colors: gradient by grid position (set once, not per frame)
const color = new THREE.Color();
for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++) {
    const t = (x + z) / (2 * (GRID - 1)); // 0..1 across the diagonal
    color.setHSL(0.55 - 0.35 * t, 0.8, 0.45 + 0.2 * t);
    mesh.setColorAt(x * GRID + z, color);
  }
}
mesh.instanceColor!.setUsage(THREE.StaticDrawUsage);

// Precompute distance-from-center per instance (used every frame)
const distances = new Float32Array(COUNT);
const half = (GRID - 1) / 2;
for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++) {
    const dx = x - half;
    const dz = z - half;
    distances[x * GRID + z] = Math.sqrt(dx * dx + dz * dz) * SPACING;
  }
}

// ---------- Reusable objects for matrix updates (no per-frame allocation) ----------
const dummy = new THREE.Object3D();

// ---------- Animation constants ----------
const WAVE_K = 0.55;     // spatial frequency
const WAVE_SPEED = 3.0;  // radians per second
const AMPLITUDE = 6.0;   // wave height

// ---------- Render loop ----------
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const time = clock.elapsedTime;

  // Radial wave: set Y per instance, reusing a single Object3D
  for (let i = 0; i < COUNT; i++) {
    const d = distances[i];
    dummy.position.set(
      ((i % GRID) - half) * SPACING,
      Math.sin(d * WAVE_K - time * WAVE_SPEED) * AMPLITUDE,
      (Math.floor(i / GRID) - half) * SPACING
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
