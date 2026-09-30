```ts
import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Grid parameters
const GRID_SIZE = 100;
const CUBE_SIZE = 0.6;
const SPACING = 1.0;
const HALF = (GRID_SIZE - 1) * SPACING / 2;

// InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.3,
});
const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
scene.add(mesh);

// Pre-compute positions and colors
const positions: number[] = new Float64Array(GRID_SIZE * GRID_SIZE * 2); // store x, z for distance calc

let idx = 0;
for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const x = ix * SPACING - HALF;
    const z = iz * SPACING - HALF;
    positions[idx * 2] = x;
    positions[idx * 2 + 1] = z;

    // Color gradient based on grid position
    const hue = (ix + iz) / (2 * GRID_SIZE);
    const color = new THREE.Color();
    color.setHSL(hue, 0.8, 0.5);
    mesh.setColorAt(idx, color);

    idx++;
  }
}
mesh.instanceColor!.needsUpdate = true;

// Wave parameters
const K = 0.4;
const SPEED = 3.0;
const AMPLITUDE = 2.0;

// Reusable objects - no allocations in render loop
const dummy = new THREE.Object3D();
let firstFrame = true;
let startTime = 0;

function animate(time: number): void {
  if (firstFrame) {
    startTime = time;
    firstFrame = false;
    (window as any).__ready = true;
  }

  const t = (time - startTime) * 0.001; // convert to seconds

  const count = GRID_SIZE * GRID_SIZE;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 2];
    const z = positions[i * 2 + 1];
    const dist = Math.sqrt(x * x + z * z);
    const y = Math.sin(dist * K - t * SPEED) * AMPLITUDE;

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```