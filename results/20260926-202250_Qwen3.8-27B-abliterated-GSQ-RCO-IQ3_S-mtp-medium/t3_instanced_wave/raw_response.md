```ts
import * as THREE from 'three';

// ---------- Configuration ----------
const GRID = 100;                 // 100 x 100 = 10,000 instances
const COUNT = GRID * GRID;
const SPACING = 1.0;
const AMP = 1.5;                  // wave amplitude
const K = 0.45;                   // spatial frequency
const SPEED = 3.0;                // temporal frequency

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Angle so the whole grid and the radial wave are visible
camera.position.set(58, 48, 58);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(30, 60, 25);
scene.add(dirLight);

// ---------- Instanced grid ----------
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Precompute base X/Z per instance (no allocations in the render loop)
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);

// Per-instance colors: gradient across the grid
const tmpColor = new THREE.Color();
let idx = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    baseX[idx] = (gx - (GRID - 1) / 2) * SPACING;
    baseZ[idx] = (gz - (GRID - 1) / 2) * SPACING;
    tmpColor.setHSL(((gx / GRID + gz / GRID) * 0.5) % 1.0, 0.75, 0.55);
    mesh.setColorAt(idx, tmpColor);
    idx++;
  }
}
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// ---------- Animation (reused Matrix4, delta/elapsed time) ----------
const m = new THREE.Matrix4();
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta(); // keep the clock ticking
  const t = clock.elapsedTime; // dt accumulates into elapsedTime

  idx = 0;
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const x = baseX[idx];
      const z = baseZ[idx];
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * K - t * SPEED) * AMP;
      m.makeTranslation(x, y, z);
      mesh.setMatrixAt(idx, m);
      idx++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
  void dt;
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```