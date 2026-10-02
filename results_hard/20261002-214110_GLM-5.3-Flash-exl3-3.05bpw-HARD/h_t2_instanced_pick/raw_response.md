```ts
import * as THREE from 'three';

const GRID = 30;
const SPACING = 1.0;
const HALF_W = 32; // needed horizontal + vertical world extent (grid is ~29 + margin)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

function fitCamera(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const tan = Math.tan(vFov / 2);
  // Required distance so that both the vertical and horizontal extents cover HALF_W
  const distV = (HALF_W / 2) / tan;
  const distH = (HALF_W / 2) / (tan * camera.aspect);
  const dist = Math.max(distV, distH);
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
}
fitCamera();

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);

const gray = new THREE.Color(0x808080);
const matrix = new THREE.Matrix4();
let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = ((GRID - 1) / 2 - row) * SPACING;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, gray);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function toggleAt(clientX: number, clientY: number): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;
    if (instanceId !== undefined && instanceId !== null && mesh.instanceColor) {
      const color = new THREE.Color();
      mesh.getColorAt(instanceId, color);
      if (color.getHex() === 0x808080) {
        mesh.setColorAt(instanceId, new THREE.Color(0xff0000));
      } else {
        mesh.setColorAt(instanceId, new THREE.Color(0x808080));
      }
      mesh.instanceColor.needsUpdate = true;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  toggleAt(event.clientX, event.clientY);
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let firstFrameRendered = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```