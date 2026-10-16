

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- InstancedMesh: 30x30 grid in XY plane ---
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(boxGeometry, material, 900);

const dummy = new THREE.Object3D();
const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);

for (let row = 0; row < 30; row++) {
  for (let col = 0; col < 30; col++) {
    const idx = row * 30 + col;
    const x = (col - 14.5) * 1.0;
    const y = (row - 14.5) * 1.0;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, grayColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// --- Click to toggle instance color ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId!;
    const current = new THREE.Color();
    mesh.getColorAt(instanceId, current);

    if (current.getHex() === 0x808080) {
      mesh.setColorAt(instanceId, redColor);
    } else {
      mesh.setColorAt(instanceId, grayColor);
    }

    mesh.instanceColor!.needsUpdate = true;
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```