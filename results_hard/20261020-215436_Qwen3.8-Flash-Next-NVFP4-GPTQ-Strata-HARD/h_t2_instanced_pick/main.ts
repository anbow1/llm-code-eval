import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 32);
camera.lookAt(0, 0, 0);

const gridSize = 30;
const count = gridSize * gridSize;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
const initialColor = new THREE.Color(0x808080);

let idx = 0;
for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    dummy.position.set((i - (gridSize - 1) / 2) * 1.0, (j - (gridSize - 1) / 2) * 1.0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, initialColor);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

(window as any).__mesh = mesh;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
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

    if (tmpColor.r > 0.9) {
      mesh.setColorAt(id, new THREE.Color(0x808080));
    } else {
      mesh.setColorAt(id, new THREE.Color(0xff0000));
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
