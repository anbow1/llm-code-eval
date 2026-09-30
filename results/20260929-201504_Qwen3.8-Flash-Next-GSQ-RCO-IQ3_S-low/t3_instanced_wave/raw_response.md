```ts
import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.4;
const WAVE_K = 0.4;
const WAVE_SPEED = 6.0;
const WAVE_AMPLITUDE = 4.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 50, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Set per-instance colors as a gradient across the grid
const color = new THREE.Color();
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const hue = (i / GRID + j / GRID) * 0.5;
    color.setHSL(hue % 1.0, 0.8, 0.55);
    mesh.setColorAt(idx, color);
  }
}
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 60, 40);
scene.add(dirLight);

// Pre-allocated objects for the animation loop (no allocations per frame)
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();
let firstFrameRendered = false;

function animate(): void {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = (i - GRID / 2) * SPACING;
      const z = (j - GRID / 2) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i * GRID + j, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```