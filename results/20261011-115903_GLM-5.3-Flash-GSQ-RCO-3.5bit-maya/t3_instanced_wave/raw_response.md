```ts
import * as THREE from 'three';
import 'three/addons/';

const GRID = 100;
const SPACING = 1.0;
const HALF = ((GRID - 1) * SPACING) / 2;
const WAVE_K = 0.35;
const WAVE_SPEED = 4.0;
const AMPLITUDE = 3.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 60, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 80, 30);
scene.add(dirLight);

// Instanced mesh: one draw call for 10,000 cubes
const boxGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  metalness: 0.1,
});
const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, GRID * GRID);
scene.add(instancedMesh);

// Precompute grid positions (no allocation in the render loop)
const gridX = new Float32Array(GRID * GRID);
const gridZ = new Float32Array(GRID * GRID);
const gridDist = new Float32Array(GRID * GRID);

// Reusable objects for per-frame updates
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = col * SPACING - HALF;
    const z = row * SPACING - HALF;
    gridX[index] = x;
    gridZ[index] = z;
    gridDist[index] = Math.sqrt(x * x + z * z);

    // Gradient color: hue sweeps across the grid, slight vertical gradient by column
    tmpColor.setHSL(0.55 + (col / GRID) * 0.4, 0.7, 0.35 + (row / GRID) * 0.3);
    instancedMesh.setColorAt(index, tmpColor);

    // Set an initial matrix so the first render is correct
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);
    index++;
  }
}
instancedMesh.instanceMatrix.needsUpdate = true;

function animate(): void {
  const t = animate.clock.getElapsedTime();

  for (let i = 0; i < GRID * GRID; i++) {
    const y = Math.sin(gridDist[i] * WAVE_K - t * WAVE_SPEED) * AMPLITUDE;
    tmpMatrix.makeTranslation(gridX[i], y, gridZ[i]);
    instancedMesh.setMatrixAt(i, tmpMatrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!animate.ready) {
    animate.ready = true;
    (window as any).__ready = true;
  }
}
animate.clock = new THREE.Clock();
animate.ready = false;

renderer.setAnimationLoop(animate);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```