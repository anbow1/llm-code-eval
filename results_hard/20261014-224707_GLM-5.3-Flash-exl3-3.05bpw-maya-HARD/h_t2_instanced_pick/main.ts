import * as THREE from 'three';

// --- Renderer setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene & camera ---
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

// --- Instanced grid of boxes ---
const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);
const isRed: boolean[] = new Array(GRID * GRID).fill(false);

const dummy = new THREE.Object3D();
const offset = (GRID - 1) * SPACING * 0.5; // center the grid on the origin

let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    dummy.position.set(col * SPACING - offset, row * SPACING - offset, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, GRAY);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Click handling ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
    const id = intersects[0].instanceId;
    isRed[id] = !isRed[id];
    mesh.setColorAt(id, isRed[id] ? RED : GRAY);
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// --- Resize handling ---
function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop((_time: number) => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
