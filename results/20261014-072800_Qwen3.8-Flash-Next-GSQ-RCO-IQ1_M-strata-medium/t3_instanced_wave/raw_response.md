```ts
import * as THREE from "three";

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(75, 55, 75);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
dirLight.position.set(60, 120, 40);
scene.add(dirLight);

// Instanced grid
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;

const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const mat = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.25,
});

const mesh = new THREE.InstancedMesh(boxGeo, mat, COUNT);

// Reusable objects – no allocations in the loop
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

// Initial grid placement + per-instance color
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - (GRID - 1) / 2) * SPACING;
    const z = (j - (GRID - 1) / 2) * SPACING;

    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Gradient color by grid position
    const hue = (i / (GRID - 1)) * 0.7 + (j / (GRID - 1)) * 0.3;
    const saturation = 0.65 + 0.2 * Math.sin(hue * Math.PI);
    tmpColor.setHSL(hue % 1.0, saturation, 0.5);
    mesh.setColorAt(idx, tmpColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== undefined) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// Wave parameters
const K = 0.22;
const SPEED = 2.5;
const AMPLITUDE = 4.0;

// Precompute distances from center (no sqrt in inner loop each frame)
const distances = new Float32Array(COUNT);
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = i - (GRID - 1) / 2;
    const z = j - (GRID - 1) / 2;
    distances[i * GRID + j] = Math.sqrt(x * x + z * z);
  }
}

const startTime = performance.now();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const elapsed = (performance.now() - startTime) / 1000;

  // Radial wave – reuse dummy, no allocations
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const x = (i - (GRID - 1) / 2) * SPACING;
      const z = (j - (GRID - 1) / 2) * SPACING;
      const yOffset = Math.sin(distances[idx] * K - elapsed * SPEED) * AMPLITUDE;

      dummy.position.set(x, yOffset, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handler
const resizeHandler = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
window.addEventListener("resize", resizeHandler);
```