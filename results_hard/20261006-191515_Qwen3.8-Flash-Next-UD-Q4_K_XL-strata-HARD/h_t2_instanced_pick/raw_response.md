```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const totalInstances = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, totalInstances);

const dummy = new THREE.Object3D();
const offset = (gridSize - 1) * spacing * 0.5;

let idx = 0;
for (let iy = 0; iy < gridSize; iy++) {
  for (let ix = 0; ix < gridSize; ix++) {
    dummy.position.set(ix * spacing - offset, iy * spacing - offset, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, new THREE.Color(0x808080));
    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const colorGray = new THREE.Color(0x808080);
const colorRed = new THREE.Color(0xff0000);
const tmpColor = new THREE.Color();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
    const id = intersects[0].instanceId;
    mesh.getColorAt(id, tmpColor);

    if (tmpColor.equals(colorGray)) {
      mesh.setColorAt(id, colorRed);
    } else {
      mesh.setColorAt(id, colorGray);
    }

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```