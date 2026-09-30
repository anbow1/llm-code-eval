```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Grid parameters
const GRID = 30;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

// Center the grid on the origin: positions from -14.5 to +14.5
const half = (GRID - 1) / 2;

// Camera looks straight at the grid (grid is in the XY plane, facing +Z)
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

// Set up instance matrices: 30x30 grid in the XY plane, centered at origin
const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);

let index = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    dummy.position.set((col - half) * SPACING, (row - half) * SPACING, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Raycasting
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const redColor = new THREE.Color(0xff0000);
const grayColor = new THREE.Color(0x808080);

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObject(mesh);
  if (intersections.length > 0) {
    const first = intersections[0];
    const instanceId = first.instanceId;
    if (instanceId !== undefined && mesh.instanceColor) {
      const current = new THREE.Color(
        mesh.instanceColor.getX(instanceId),
        mesh.instanceColor.getY(instanceId),
        mesh.instanceColor.getZ(instanceId)
      );
      if (current.getHex() === 0x808080) {
        mesh.setColorAt(instanceId, redColor);
      } else {
        mesh.setColorAt(instanceId, grayColor);
      }
      mesh.instanceColor.needsUpdate = true;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Render loop - static scene, no animation, but delta/time driven
let hasRendered = false;
renderer.setAnimationLoop((time: number, frame: THREE.XRFrame | undefined) => {
  const delta = frame ? 0 : 0; // no animation; keep static
  void time;
  void delta;
  renderer.render(scene, camera);
  if (!hasRendered) {
    hasRendered = true;
    (window as any).__ready = true;
  }
});
```