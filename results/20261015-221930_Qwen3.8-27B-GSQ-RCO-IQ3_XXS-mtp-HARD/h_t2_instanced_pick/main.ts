import * as THREE from 'three';

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera – looks straight at the grid along +Z
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

// InstancedMesh: 30x30 grid of boxes
const GRID = 30;
const COUNT = GRID * GRID;
const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(boxGeo, mat, COUNT);

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const dummy = new THREE.Object3D();
let idx = 0;
for (let r = 0; r < GRID; r++) {
  for (let c = 0; c < GRID; c++) {
    const x = c - (GRID - 1) / 2;
    const y = r - (GRID - 1) / 2;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Raycasting state
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const isRed: boolean[] = new Array(COUNT).fill(false);

// Click handler – toggle color of hit instance
renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  mouse.set(nx, ny);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(mesh);
  if (hits.length > 0) {
    const id: number = hits[0].instanceId!;
    isRed[id] = !isRed[id];
    mesh.setColorAt(id, isRed[id] ? red : gray);
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = false;
renderer.setAnimationLoop((_time: number, _delta: number) => {
  renderer.render(scene, camera);
  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
