

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const totalInstances = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, totalInstances);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const idx = i * gridSize + j;
    const x = (i - (gridSize - 1) / 2) * spacing;
    const y = (j - (gridSize - 1) / 2) * spacing;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    color.setHex(0x808080);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const isRed: boolean[] = new Array(totalInstances).fill(false);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      isRed[instanceId] = !isRed[instanceId];
      color.setHex(isRed[instanceId] ? 0xff0000 : 0x808080);
      mesh.setColorAt(instanceId, color);
      if (mesh.instanceColor !== null) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
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

let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```