import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Instanced grid: 30x30 boxes in the XY plane ---
const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const COUNT = GRID * GRID;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);

const offset = (GRID - 1) / 2;
let i = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    dummy.position.set(
      (col - offset) * SPACING,
      (row - offset) * SPACING,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, gray);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}
scene.add(mesh);

// --- Click toggling via raycasting ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

const RED = new THREE.Color(0xff0000);
const toggled: boolean[] = new Array(COUNT).fill(false);
const tmpColor = new THREE.Color();

function onPointerDown(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh, false);

  if (hits.length > 0) {
    const id = hits[0].instanceId;
    if (id !== undefined && id !== null && id >= 0 && id < COUNT) {
      toggled[id] = !toggled[id];
      tmpColor.set(toggled[id] ? 0xff0000 : 0x808080);
      mesh.setColorAt(id, tmpColor);
      if (mesh.instanceColor !== null) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
