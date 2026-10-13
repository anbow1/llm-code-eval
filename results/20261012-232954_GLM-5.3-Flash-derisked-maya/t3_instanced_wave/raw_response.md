```ts
import * as THREE from 'three';

// --- Basic scene setup -----------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(45, 40, 45);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(animate);

// --- Lights ----------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);

// --- Instanced grid ---------------------------------------------------------
const GRID = 100;
const SPACING = 1.0;
const COUNT = GRID * GRID;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Initial colors: gradient by grid position (no per-frame allocation).
const color = new THREE.Color();
const c1 = new THREE.Color(0x2200ff);
const c2 = new THREE.Color(0x00ffcc);
let idx = 0;
for (let ix = 0; ix < GRID; ix++) {
  for (let iz = 0; iz < GRID; iz++) {
    const t = (ix + iz) / (2 * (GRID - 1));
    color.copy(c1).lerp(c2, t);
    mesh.setColorAt(idx, color);
    idx++;
  }
}
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// Reusable objects — no allocations inside the render loop.
const dummy = new THREE.Object3D();
const HALF = (GRID - 1) / 2;

const WAVE_SPEED = 3.0;
const WAVE_K = 0.55;
const AMPLITUDE = 5.0;
let hasRendered = false;

function animate(): void {
  const time = performance.now() / 1000;

  let i = 0;
  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const dx = ix - HALF;
      const dz = iz - HALF;
      const dist = Math.sqrt(dx * dx + dz * dz);
      dummy.position.set(
        (ix - HALF) * SPACING,
        Math.sin(dist * WAVE_K - time * WAVE_SPEED) * AMPLITUDE,
        (iz - HALF) * SPACING
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
}

// --- Resize handling --------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Test hooks -------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```