import * as THREE from 'three';

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = GRID * GRID;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const defaultColor = new THREE.Color(0x808080);
const offset = (GRID - 1) * SPACING * 0.5;

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const idx = row * GRID + col;
    dummy.position.set(col * SPACING - offset, row * SPACING - offset, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, defaultColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const redColor = new THREE.Color(0xff0000);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      const color = new THREE.Color();
      mesh.getColorAt(instanceId, color);
      if (color.r > 0.9) {
        mesh.setColorAt(instanceId, defaultColor);
      } else {
        mesh.setColorAt(instanceId, redColor);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrame = true;

renderer.setAnimationLoop(() => {
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
