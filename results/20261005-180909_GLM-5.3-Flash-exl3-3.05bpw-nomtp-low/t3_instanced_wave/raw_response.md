```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 40, 55);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(20, 30, 15);
scene.add(dir);

const GRID = 100;
const SPACING = 1.1;
const count = GRID * GRID;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, count);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const half = (GRID - 1) / 2;

let i = 0;
for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++) {
    const px = (x - half) * SPACING;
    const pz = (z - half) * SPACING;
    dummy.position.set(px, 0, pz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const t = (x / (GRID - 1) + z / (GRID - 1)) / 2;
    color.setHSL(0.65 - 0.4 * t, 0.8, 0.55);
    mesh.setColorAt(i, color);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();
  const time = t + dt; // ensure progress even when dt = 0
  const k = 0.35;
  const speed = 2.5;
  const amp = 3.5;

  i = 0;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const px = (x - half) * SPACING;
      const pz = (z - half) * SPACING;
      const dist = Math.sqrt(px * px + pz * pz);
      dummy.position.set(px, Math.sin(dist * k - time * speed) * amp, pz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

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