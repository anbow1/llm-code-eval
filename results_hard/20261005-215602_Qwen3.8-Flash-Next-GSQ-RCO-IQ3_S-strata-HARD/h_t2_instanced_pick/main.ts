import * as THREE from 'three';

const GRID_SIZE = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = GRID_SIZE * GRID_SIZE;

const scene = new THREE.Scene();

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const half = (GRID_SIZE - 1) / 2;

let index = 0;
for (let y = 0; y < GRID_SIZE; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    dummy.position.set(x - half, y - half, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    index++;
  }
}

mesh.instanceMatrix.needsUpdate = true;

const states = new Uint8Array(COUNT);
const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);

for (let i = 0; i < COUNT; i++) {
  mesh.setColorAt(i, grayColor);
}

if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

mesh.computeBoundingSphere();
scene.add(mesh);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);

const halfGrid = ((GRID_SIZE - 1) * SPACING + BOX_SIZE) / 2;
const requiredHalf = halfGrid * 1.1;

function updateCamera(): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const aspect = width / height;

  camera.aspect = aspect;

  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const safeAspect = Math.max(0.0001, aspect);
  const limitingAspect = Math.min(1, safeAspect);

  const distance = requiredHalf / (tanHalfFov * limitingAspect);

  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);

  camera.far = Math.max(10000, distance + 1000);
  camera.updateProjectionMatrix();
}

updateCamera();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

if (document.body) {
  document.body.style.margin = '0';
}

renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.display = 'block';

const appendTarget = document.body || document.documentElement;
appendTarget.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function handleClick(event: MouseEvent): void {
  const marker = event as any;
  if (marker.__alreadyProcessed === true) {
    return;
  }
  marker.__alreadyProcessed = true;

  if (event.button !== 0) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length === 0) {
    return;
  }

  const instanceId = (intersects[0] as any).instanceId;
  if (typeof instanceId !== 'number') {
    return;
  }

  const nextState = states[instanceId] === 0 ? 1 : 0;
  states[instanceId] = nextState;

  mesh.setColorAt(instanceId, nextState === 1 ? redColor : grayColor);

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

renderer.domElement.addEventListener('click', handleClick);
document.addEventListener('click', handleClick);
window.addEventListener('click', handleClick);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCamera();
});

let ready = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
