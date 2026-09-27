import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);

const colorStates: boolean[] = new Array<boolean>(GRID_SIZE * GRID_SIZE).fill(false);

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const idx: number = row * GRID_SIZE + col;
    const x: number = (col - (GRID_SIZE - 1) / 2) * SPACING;
    const y: number = (row - (GRID_SIZE - 1) / 2) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    tempColor.copy(GRAY);
    mesh.setColorAt(idx, tempColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersections: THREE.Intersection[] = raycaster.intersectObject(mesh);

  if (intersections.length > 0) {
    const instanceId: number | undefined = intersections[0].instanceId;
    if (instanceId !== undefined) {
      colorStates[instanceId] = !colorStates[instanceId];
      tempColor.copy(colorStates[instanceId] ? RED : GRAY);
      mesh.setColorAt(instanceId, tempColor);
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
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
