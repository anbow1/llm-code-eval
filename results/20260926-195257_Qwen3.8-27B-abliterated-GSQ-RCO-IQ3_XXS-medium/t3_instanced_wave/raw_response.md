```ts
import * as THREE from 'three';

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera at an angle to see the full grid
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 60, 70);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(30, 50, 30);
scene.add(directionalLight);

// Grid parameters
const GRID = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.9;
const TOTAL = GRID * GRID;
const CENTER = (GRID - 1) / 2;

const k = 0.35;
const speed = 2.5;
const amplitude = 3.0;

// Pre-compute positions and distances
const xPositions = new Float32Array(TOTAL);
const zPositions = new Float32Array(TOTAL);
const distances = new Float32Array(TOTAL);

let idx = 0;
for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    const px = x - CENTER;
    const pz = z - CENTER;
    xPositions[idx] = px * SPACING;
    zPositions[idx] = pz * SPACING;
    distances[idx] = Math.sqrt(px * px + pz * pz);
    idx++;
  }
}

// Create InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);
scene.add(mesh);

// Set per-instance colors (gradient by grid position)
const color = new THREE.Color();
idx = 0;
for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    const u = x / (GRID - 1);
    const v = z / (GRID - 1);
    color.setHSL(0.6 - u * 0.4, 0.8, 0.4 + v * 0.3);
    mesh.setColorAt(idx, color);
    idx++;
  }
}
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

// Reusable matrix for updates – set once with identity rotation/scale
const mat = new THREE.Matrix4();
mat.makeTranslation(0, 0, 0); // initialize, we'll overwrite translation each frame

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handling
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Animation
let elapsed = 0;
let firstFrame = true;

renderer.setAnimationLoop((time) => {
  const delta = (time - (renderer as any).__lastTime || 0) / 1000;
  (renderer as any).__lastTime = time;
  elapsed += delta;

  // Update every instance's Y position (radial wave)
  for (let i = 0; i < TOTAL; i++) {
    const y = Math.sin(distances[i] * k - elapsed * speed) * amplitude;
    mat.setElements(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      xPositions[i], y, zPositions[i]
    );
    mesh.setMatrixAt(i, mat);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```