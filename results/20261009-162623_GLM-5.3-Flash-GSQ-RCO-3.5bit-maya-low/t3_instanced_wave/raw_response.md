```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(60, 70, 90);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(50, 100, 40);
scene.add(dir);

const GRID = 100;
const SIZE = 2;
const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geo, mat, GRID * GRID);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const half = (GRID - 1) / 2;

// initial colors: gradient by grid position
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    color.setHSL(0.55 + (i + j) / (2 * GRID) * 0.35, 0.8, 0.5);
    mesh.setColorAt(idx, color);
  }
}
mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);

const AMP = 8, SPEED = 4, K = 0.35;

function updateWave(time: number) {
  let idx = 0;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = (i - half) * SIZE;
      const z = (j - half) * SIZE;
      const dist = Math.sqrt(x * x + z * z);
      dummy.position.set(x, Math.sin(dist * K - time * SPEED) * AMP, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      const h = (dummy.position.y / AMP + 1) / 2;
      color.setHSL(0.55 + h * 0.35, 0.8, 0.4 + h * 0.3);
      mesh.setColorAt(idx, color);
      idx++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

let ready = false;

renderer.setAnimationLoop(() => {
  const t = performance.now() / 1000;
  updateWave(t);
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```