```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const SIZE = 30;
const COUNT = SIZE * SIZE;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const matrix = new THREE.Matrix4();
const half = (SIZE - 1) / 2;
let i = 0;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    matrix.makeTranslation(x - half, half - y, 0);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, gray);
    i++;
  }
}
mesh.instanceColor!.needsUpdate = true;
scene.add(mesh);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (ev: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);
  if (hits.length > 0 && hits[0].instanceId !== undefined) {
    const id = hits[0].instanceId;
    const c = new THREE.Color();
    mesh.getColorAt(id, c);
    if (c.getHex() === 0x808080) {
      mesh.setColorAt(id, red);
    } else {
      mesh.setColorAt(id, gray);
    }
    mesh.instanceColor!.needsUpdate = true;
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
(window as any).__mesh = mesh;

let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```