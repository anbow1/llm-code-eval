import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

const GRID = 30;
const COUNT = GRID * GRID;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const matrix = new THREE.Matrix4();
const color = new THREE.Color();

let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = (i - (GRID - 1) / 2) * 1.0;
    const y = (j - (GRID - 1) / 2) * 1.0;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(idx, matrix);
    color.set(0x808080);
    mesh.setColorAt(idx, color);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

const stateColors: number[] = new Array(COUNT).fill(0x808080);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent): void => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length > 0) {
    const id = intersects[0].instanceId;
    if (id !== undefined) {
      if (stateColors[id] === 0x808080) {
        stateColors[id] = 0xff0000;
        color.set(0xff0000);
      } else {
        stateColors[id] = 0x808080;
        color.set(0x808080);
      }
      mesh.setColorAt(id, color);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
});

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrame = true;
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
