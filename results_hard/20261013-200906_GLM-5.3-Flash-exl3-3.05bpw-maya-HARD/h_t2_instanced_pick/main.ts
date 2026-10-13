import * as THREE from 'three';

const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const GRAY = 0x808080;
const RED = 0xff0000;

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

function fitCamera(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Grid spans from -(GRID-1)*SPACING/2 to +(GRID-1)*SPACING/2 = ±14.5
  const halfExtent = ((GRID - 1) * SPACING) / 2 + 2.5; // margin
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distForHeight = halfExtent / Math.tan(vFov / 2);
  const distForWidth = halfExtent / (Math.tan(vFov / 2) * camera.aspect);
  const dist = Math.max(distForHeight, distForWidth);
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
}
fitCamera();

// --- InstancedMesh (the ONLY mesh) ---
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    dummy.position.set(
      (col - (GRID - 1) / 2) * SPACING,
      (row - (GRID - 1) / 2) * SPACING,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.setHex(GRAY));
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// --- Raycasting / click handling ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);

  if (hits.length > 0) {
    const instanceId = hits[0].instanceId;
    if (instanceId !== undefined && mesh.instanceColor) {
      mesh.getColorAt(instanceId, color);
      if (color.getHex() === GRAY) {
        mesh.setColorAt(instanceId, color.setHex(RED));
      } else {
        mesh.setColorAt(instanceId, color.setHex(GRAY));
      }
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop (no animation, just render) ---
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
