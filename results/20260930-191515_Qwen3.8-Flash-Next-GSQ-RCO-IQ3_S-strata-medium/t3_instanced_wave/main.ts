import * as THREE from "three";

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 90, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Grid Parameters ---
const GRID = 100;
const SPACING = 0.8;
const CUBE_SIZE = 0.35;
const COUNT = GRID * GRID;
const HALF = (GRID - 1) * SPACING * 0.5;

// --- Geometry & Material ---
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.2,
});

// --- InstancedMesh ---
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.castShadow = true;
mesh.receiveShadow = true;

// Precomputed per-instance data (no allocations in loop)
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const distFromCenter = new Float32Array(COUNT);

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

let idx = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const x = gx * SPACING - HALF;
    const z = gz * SPACING - HALF;
    const cx = ((GRID - 1) * SPACING) * 0.5;
    const cz = ((GRID - 1) * SPACING) * 0.5;
    const wx = (GRID - 1) * SPACING * 0.5;
    const wz = (GRID - 1) * SPACING * 0.5;

    baseX[idx] = x;
    baseZ[idx] = z;

    const dx = gx * SPACING - (GRID - 1) * SPACING * 0.5;
    const dz = gz * SPACING - (GRID - 1) * SPACING * 0.5;
    distFromCenter[idx] = Math.sqrt(dx * dx + dz * dz);

    // Per-instance color: HSL gradient by grid position
    const hue = (gx / GRID + gz / GRID) * 0.5;
    const sat = 0.8;
    const light = 0.55 + 0.1 * Math.sin((gx + gz) * 0.05);
    tempColor.setHSL(hue % 1.0, sat, light);
    mesh.setColorAt(idx, tempColor);

    // Initial matrix (flat)
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// --- Lights ---
const ambient = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
dirLight.position.set(40, 80, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 200;
scene.add(dirLight);

// --- Wave Parameters ---
const WAVE_K = 0.18;
const WAVE_SPEED = 2.5;
const WAVE_AMPLITUDE = 2.5;

// --- Animation Loop ---
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < COUNT; i++) {
    const y =
      Math.sin(distFromCenter[i] * WAVE_K - elapsed * WAVE_SPEED) *
      WAVE_AMPLITUDE;

    dummy.position.x = baseX[i];
    dummy.position.y = y;
    dummy.position.z = baseZ[i];
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// --- Resize Handler ---
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
