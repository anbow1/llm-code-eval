```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(60, 55, 60);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambient = new THREE.AmbientLight(0x404060, 0.8);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(40, 80, 30);
scene.add(dirLight);

// --- Grid constants ---
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const OFFSET = (GRID - 1) * SPACING * 0.5;

// --- Geometry & Material ---
const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.5,
});

// --- InstancedMesh ---
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// --- Precompute distances and positions ---
const distances = new Float32Array(COUNT);
const positionsX = new Float32Array(COUNT);
const positionsZ = new Float32Array(COUNT);

const tempObj = new THREE.Object3D();
const tempColor = new THREE.Color();

let idx = 0;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const px = ix * SPACING - OFFSET;
    const pz = iz * SPACING - OFFSET;
    positionsX[idx] = px;
    positionsZ[idx] = pz;
    distances[idx] = Math.sqrt(px * px + pz * pz);

    // Gradient color based on grid position (hue by x, lightness by z)
    const hue = ix / GRID;
    const lightness = 0.3 + 0.4 * (iz / GRID);
    tempColor.setHSL(hue, 0.7, lightness);
    mesh.setColorAt(idx, tempColor);

    idx++;
  }
}
mesh.instanceColor!.needsUpdate = true;

// --- Wave parameters ---
const K = 0.25;
const SPEED = 2.0;
const AMPLITUDE = 2.5;

// --- Reusable objects (no allocations in loop) ---
const reusableMatrix = new THREE.Matrix4();
const reusablePosition = new THREE.Vector3();
const reusableQuaternion = new THREE.Quaternion();
const reusableScale = new THREE.Vector3(1, 1, 1);

let firstFrame = true;

// --- Animation loop ---
renderer.setAnimationLoop(() => {
  const time = renderer.info.render.frame > 0 ? performance.now() * 0.001 : 0;

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * K - time * SPEED) * AMPLITUDE;
    reusablePosition.set(positionsX[i], y, positionsZ[i]);
    reusableMatrix.compose(reusablePosition, reusableQuaternion, reusableScale);
    mesh.setMatrixAt(i, reusableMatrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```