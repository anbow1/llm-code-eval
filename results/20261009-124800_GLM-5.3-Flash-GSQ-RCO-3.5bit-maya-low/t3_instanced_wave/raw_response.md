```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(30, 60, 20);
scene.add(dir);

const GRID = 100;
const SIZE = 1.2;
const SPACING = 1.5;

const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
scene.add(mesh);

const color = new THREE.Color();
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);

const half = ((GRID - 1) * SPACING) / 2;
const centerDist = Math.sqrt(2) * half;
const k = 0.25;
const speed = 3;
const amplitude = 3;

let i = 0;
for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++, i++) {
    const px = x * SPACING - half;
    const pz = z * SPACING - half;
    color.setHSL((px + pz + centerDist * 2) / (centerDist * 4) * 0.35, 0.7, 0.55);
    mesh.setColorAt(i, color);
    matrix.makeTranslation(px, 0, pz);
    mesh.setMatrixAt(i, matrix);
  }
}
mesh.instanceColor!.needsUpdate = true;

const dummy = new THREE.Object3D();

function updateWave(time: number): void {
  let idx = 0;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++, idx++) {
      const px = x * SPACING - half;
      const pz = z * SPACING - half;
      const dist = Math.sqrt(px * px + pz * pz);
      const y = Math.sin(dist * k - time * speed) * amplitude;
      dummy.position.set(px, y, pz);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
renderer.setAnimationLoop((time: number) => {
  const t = time / 1000;
  updateWave(t);
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```