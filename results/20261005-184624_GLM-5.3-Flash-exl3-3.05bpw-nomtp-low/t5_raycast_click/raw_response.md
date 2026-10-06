```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(3, 5, 8);
scene.add(dir);

const BASE_COLOR = 0x4488ff;
const SELECT_COLOR = 0xff0000;
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
let selected: THREE.Mesh | null = null;

const geometry = new THREE.BoxGeometry(1, 1, 1);

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const material = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((col - 2) * 1.2, (row - 2) * 1.2, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

function clearSelection(): void {
  if (selected) {
    selected.material.color.setHex(BASE_COLOR);
    selected = null;
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cubes, false);
  clearSelection();
  if (hits.length > 0 && hits[0].object instanceof THREE.Mesh) {
    selected = hits[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    selected.material.color.setHex(SELECT_COLOR);
  }
}

renderer.domElement.addEventListener('click', onClick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrame = true;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```