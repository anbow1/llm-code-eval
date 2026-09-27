import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(70, 65, 70);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(40, 80, 40);
scene.add(dirLight);

// ---------- Grid / InstancedMesh ----------
const GRID = 100;
const COUNT = GRID * GRID; // 10 000
const SPACING = 1.0;
const CUBE = 0.8;
const HALF = (GRID - 1) / 2;

const geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// ---------- Pre-allocated temporaries (no allocations in loop) ----------
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

// ---------- Initial matrices + per-instance colours ----------
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - HALF) * SPACING;
    const z = (j - HALF) * SPACING;

    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Gradient by grid position (r from left, g from bottom, b mix)
    const u = i / (GRID - 1);
    const v = j / (GRID - 1);
    tmpColor.setRGB(
      0.15 + 0.75 * u,
      0.2 + 0.6 * v,
      1.0 - 0.5 * u - 0.3 * v
    );
    mesh.setColorAt(idx, tmpColor);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// ---------- Wave constants ----------
const K = 0.25;        // spatial frequency
const SPEED = 3.0;     // angular speed (rad/s)
const AMPLITUDE = 3.5; // max Y displacement

// ---------- Clock / readiness ----------
const clock = new THREE.Clock();
let firstFrame = true;

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ---------- Render loop ----------
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < GRID; i++) {
    const x = (i - HALF) * SPACING;
    for (let j = 0; j < GRID; j++) {
      const z = (j - HALF) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * K - elapsed * SPEED) * AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i * GRID + j, dummy.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
