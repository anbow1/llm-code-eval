import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const COUNT = 30;
const SPACING = 1.0;
const SIZE = 0.8;

const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT * COUNT);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
let i = 0;
for (let x = 0; x < COUNT; x++) {
  for (let y = 0; y < COUNT; y++) {
    dummy.position.set((x - (COUNT - 1) / 2) * SPACING, (y - (COUNT - 1) / 2) * SPACING, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, gray);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const red = new THREE.Color(0xff0000);

let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = renderer.getAnimationLoop() ? 0 : 0; // no per-frame motion needed
  void dt;
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(mesh);
  if (hits.length > 0 && hits[0].instanceId !== undefined) {
    const id = hits[0].instanceId;
    const c = mesh.instanceColor!;
    const cur = new THREE.Color(c.getX(id), c.getY(id), c.getZ(id));
    if (cur.getHex() === 0x808080) {
      mesh.setColorAt(id, red);
    } else {
      mesh.setColorAt(id, gray);
    }
    c.needsUpdate = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
