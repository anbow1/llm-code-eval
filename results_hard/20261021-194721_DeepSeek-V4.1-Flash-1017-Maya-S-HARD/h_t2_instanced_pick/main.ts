import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101012);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = GRID * GRID;

const GRAY = 0x808080;
const RED = 0xff0000;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const dummy = new THREE.Object3D();
const grayColor = new THREE.Color(GRAY);
const offset = ((GRID - 1) * SPACING) / 2;

for (let iy = 0; iy < GRID; iy++) {
  for (let ix = 0; ix < GRID; ix++) {
    const index = iy * GRID + ix;
    dummy.position.set(ix * SPACING - offset, iy * SPACING - offset, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, grayColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Fit the whole grid in view with a margin, whatever the window shape.
const HALF_EXTENT = offset + BOX_SIZE / 2 + 0.5;
function updateCameraFraming(): void {
  const vFov = (camera.fov * Math.PI) / 180;
  const tanHalfV = Math.tan(vFov / 2);
  const tanHalfH = tanHalfV * camera.aspect;
  const distV = HALF_EXTENT / tanHalfV;
  const distH = HALF_EXTENT / tanHalfH;
  const dist = Math.max(distV, distH) * 1.1;

  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

camera.aspect = window.innerWidth / window.innerHeight;
updateCameraFraming();

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function onPointerClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);

  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length === 0) return;

  const hit = hits[0];
  const id = hit.instanceId;
  if (id === undefined || id === null) return;

  const colorAttr = mesh.instanceColor;
  if (!colorAttr) return;

  const arr = colorAttr.array as Float32Array;
  const base = id * 3;

  // Toggle: gray -> red, red -> gray
  const isRed = arr[base] > 0.5 && arr[base + 1] < 0.5 && arr[base + 2] < 0.5;
  const next = new THREE.Color(isRed ? GRAY : RED);
  mesh.setColorAt(id, next);

  colorAttr.needsUpdate = true;
}

renderer.domElement.addEventListener('click', onPointerClick);

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateCameraFraming();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}

window.addEventListener('resize', onResize);

let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
