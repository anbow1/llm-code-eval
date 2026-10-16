

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const count = 30 * 30;
const mesh = new THREE.InstancedMesh(boxGeometry, material, count);

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();
const isRed: boolean[] = new Array<boolean>(count).fill(false);

for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 30; j++) {
    const idx: number = i * 30 + j;
    const x: number = (i - 14.5) * 1.0;
    const y: number = (j - 14.5) * 1.0;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    tmpColor.setHex(0x808080);
    mesh.setColorAt(idx, tmpColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  const intersections: THREE.Intersection[] = raycaster.intersectObject(mesh);

  if (intersections.length > 0) {
    const first = intersections[0];
    const instanceId: number | undefined = first.instanceId;
    if (instanceId !== undefined) {
      isRed[instanceId] = !isRed[instanceId];
      tmpColor.setHex(isRed[instanceId] ? 0xff0000 : 0x808080);
      mesh.setColorAt(instanceId, tmpColor);
      if (mesh.instanceColor !== null) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
});

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let ready: boolean = false;

renderer.setAnimationLoop((_time: number): void => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```