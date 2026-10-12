```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene / Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 90, 120);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(60, 100, 40);
scene.add(dirLight);

// ---------- Instanced cube grid ----------
const GRID_SIZE = 100;      // 100 x 100 = 10,000 instances
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1.2;
const HALF = (GRID_SIZE - 1) / 2;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Per-instance colors: gradient by grid position (set once, not per frame)
const gridX = new Float32Array(COUNT);
const gridZ = new Float32Array(COUNT);
const radialDist = new Float32Array(COUNT);

{
  const color = new THREE.Color();
  let i = 0;
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = (x - HALF) * SPACING;
      const pz = (z - HALF) * SPACING;
      gridX[i] = px;
      gridZ[i] = pz;
      radialDist[i] = Math.sqrt(px * px + pz * pz);
      // Gradient by grid position: X drives red, Z drives blue
      color.setRGB((x / (GRID_SIZE - 1)) * 0.5 + 0.25, 0.35, (z / (GRID_SIZE - 1)) * 0.5 + 0.25);
      mesh.setColorAt(i, color);
      i++;
    }
  }
}
mesh.instanceColor!.needsUpdate = true;

// Wave parameters
const WAVE_K = 0.12;      // spatial frequency
const WAVE_SPEED = 3.0;   // temporal speed
const AMPLITUDE = 8.0;

// Reused objects — no allocations inside the render loop
const dummy = new THREE.Object3D();
const baseMatrix = new THREE.Matrix4();

// ---------- Window resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
let firstFrame = true;

renderer.setAnimationLoop((time /* ms */) => {
  const t = time * 0.001; // seconds, delta/elapsed-time based

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(radialDist[i] * WAVE_K - t * WAVE_SPEED) * AMPLITUDE;
    dummy.position.set(gridX[i], y, gridZ[i]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// ---------- Testing hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```