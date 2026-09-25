import * as THREE from 'three';

// ---------- Configuration ----------
const GRID = 100;                 // 100 x 100 = 10,000 instances
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.82;
const AMPLITUDE = 3.0;            // wave height
const K = 0.32;                   // spatial frequency
const SPEED = 3.0;                // temporal speed

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1017);
scene.fog = new THREE.Fog(0x0d1017, 140, 340);

// ---------- Camera (angled so the whole grid is visible) ----------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(85, 62, 85);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(60, 100, 40);
scene.add(dirLight);

// ---------- Instanced grid ----------
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff, // white base so per-instance colors show through
  roughness: 0.55,
  metalness: 0.05,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.frustumCulled = false; // instances move in Y; keep static bounds simple
scene.add(mesh);

// Precompute static per-instance data (allocation only at setup, never in the loop)
const xs = new Float32Array(COUNT);
const zs = new Float32Array(COUNT);
const dists = new Float32Array(COUNT);
const half = ((GRID - 1) * SPACING) * 0.5;

const tmpColor = new THREE.Color();
const colorA = new THREE.Color(0x1e90ff); // deep sky blue
const colorB = new THREE.Color(0xff2e88); // pink
const inv = 1 / (GRID - 1);

// ONE shared Matrix4 reused for every instance, every frame
const m4 = new THREE.Matrix4();

let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = (j * SPACING - half);
    const z = (i * SPACING - half);
    xs[idx] = x;
    zs[idx] = z;
    dists[idx] = Math.hypot(x, z); // distance from grid center

    // Diagonal gradient across the grid, one unique color per instance
    const t = (i * inv + j * inv) * 0.5;
    tmpColor.copy(colorA).lerp(colorB, t);
    mesh.setColorAt(idx, tmpColor);

    // Initial matrix at rest
    m4.setPosition(x, 0, z);
    mesh.setMatrixAt(idx, m4);

    idx++;
  }
}

if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
mesh.instanceMatrix.needsUpdate = true;

// ---------- Animation ----------
const clock = new THREE.Clock();
let elapsed = 0;
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  // Delta-time based motion (clamped so tab-switch jumps don't spike)
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(dists[i] * K - elapsed * SPEED) * AMPLITUDE;
    m4.setPosition(xs[i], y, zs[i]); // mutate the single shared matrix
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
