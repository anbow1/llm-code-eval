import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(60, 55, 80);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.1);
directional.position.set(40, 70, 30);
scene.add(directional);

// ---------- Instanced cube grid ----------
const GRID_SIZE = 100;
const CUBE_SIZE = 0.8;
const SPACING = 1.1; // spacing between cube centers
const COUNT = GRID_SIZE * GRID_SIZE; // 10,000 instances

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Grid extent so the camera framing works regardless of spacing
const halfExtent = (GRID_SIZE - 1) * SPACING * 0.5;

// Base XZ positions (computed once, reused every frame)
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);

// Per-instance colors: gradient by grid position (computed once)
const color = new THREE.Color();
for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const i = iz * GRID_SIZE + ix;
    const x = ix * SPACING - halfExtent;
    const z = iz * SPACING - halfExtent;
    baseX[i] = x;
    baseZ[i] = z;

    // Gradient: mixes across both axes for a smooth 2D gradient
    const t = (ix + iz) / (2 * (GRID_SIZE - 1));
    color.setHSL(0.55 + 0.25 * t, 0.75, 0.35 + 0.3 * t);
    mesh.setColorAt(i, color);
  }
}
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// Wave parameters
const WAVE_K = 0.55; // spatial frequency (radians per unit distance)
const WAVE_SPEED = 3.0; // temporal speed (radians per second)
const WAVE_AMPLITUDE = 4.5;

// Reusable objects for matrix updates — no allocations in the loop
const dummy = new THREE.Object3D();

// ---------- Resize handling ----------
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------- Render loop ----------
let firstFrameDone = false;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time * 0.001; // seconds
  const t = elapsed * WAVE_SPEED;

  for (let i = 0; i < COUNT; i++) {
    const dx = baseX[i];
    const dz = baseZ[i];
    const dist = Math.sqrt(dx * dx + dz * dz);
    dummy.position.set(dx, Math.sin(dist * WAVE_K - t) * WAVE_AMPLITUDE, dz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
