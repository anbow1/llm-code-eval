import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Grid parameters
const GRID = 30;
const SPACING = 1.0;
const SIZE = 0.8;

const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.name = 'grid';

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const dummy = new THREE.Object3D();

const offset = (GRID - 1) / 2; // 14.5 for GRID = 30

let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - offset) * SPACING;
    const y = (row - offset) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, gray);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// Track toggle state per instance (false = gray, true = red)
const isRed = new Array<boolean>(GRID * GRID).fill(false);

// Position the camera so the whole grid fits with a margin
function fitCamera() {
  const halfExtent = (GRID * SPACING) / 2;
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const fitHeight = halfExtent / Math.tan(fovRad / 2);
  const fitWidth = halfExtent / Math.tan(fovRad / 2) / aspect;
  const distance = Math.max(fitHeight, fitWidth) + 2;
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
fitCamera();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length > 0) {
    const hit = intersects[0];
    if (hit.instanceId !== undefined) {
      const id: number = hit.instanceId;
      isRed[id] = !isRed[id];
      mesh.setColorAt(id, isRed[id] ? red : gray);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});

let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
