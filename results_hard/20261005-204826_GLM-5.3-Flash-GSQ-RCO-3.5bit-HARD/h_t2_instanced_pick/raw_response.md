```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 36);
camera.lookAt(0, 0, 0);

// ---------- Grid of instances ----------
const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);

const halfSpan = ((GRID - 1) * SPACING) / 2; // 14.5 -> centered on origin

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    dummy.position.set(
      col * SPACING - halfSpan,
      halfSpan - row * SPACING,
      0
    );
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, gray);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// ---------- Click handling ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const red = new THREE.Color(0xff0000);

const isRed = new Array<boolean>(COUNT).fill(false);

function onClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh, false);

  if (intersections.length > 0) {
    const hit = intersections[0];
    const instanceId = hit.instanceId;
    if (instanceId !== undefined && instanceId >= 0 && instanceId < COUNT) {
      if (isRed[instanceId]) {
        mesh.setColorAt(instanceId, gray);
        isRed[instanceId] = false;
      } else {
        mesh.setColorAt(instanceId, red);
        isRed[instanceId] = true;
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
}

renderer.domElement.addEventListener('click', onClick);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// ---------- Render loop ----------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  (window as any).__ready = true;
});
```