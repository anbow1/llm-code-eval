```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 38);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const SIZE = 0.8;

const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const GRAY = new THREE.Color(0x808080);
let index = 0;
for (let x = 0; x < GRID; x++) {
  for (let y = 0; y < GRID; y++) {
    dummy.position.set(
      (x - (GRID - 1) / 2) * SPACING,
      (y - (GRID - 1) / 2) * SPACING,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, GRAY);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh);
  if (intersections.length > 0) {
    const hit = intersections[0];
    const id = hit.instanceId;
    if (id !== undefined && mesh.instanceColor) {
      const color = new THREE.Color();
      color.fromBufferAttribute(mesh.instanceColor, id);
      if (color.getHex() === 0x808080) {
        mesh.setColorAt(id, new THREE.Color(0xff0000));
      } else {
        mesh.setColorAt(id, GRAY);
      }
      mesh.instanceColor.needsUpdate = true;
    }
  }
}
window.addEventListener('pointerdown', onPointerDown);

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