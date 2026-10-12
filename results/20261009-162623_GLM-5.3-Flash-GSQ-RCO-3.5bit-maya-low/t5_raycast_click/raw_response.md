```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(3, 4, 6);
scene.add(dirLight);

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const cubes: THREE.Mesh[] = [];
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 5; x++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((x - 2) * 1.1, (y - 2) * 1.1, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selected: THREE.Mesh | null = null;

function setSelected(mesh: THREE.Mesh | null): void {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
  }
  selected = mesh;
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0xff0000);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cubes, false);
  setSelected(hits.length > 0 ? (hits[0].object as THREE.Mesh) : null);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
renderer.setAnimationLoop((_time: number) => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```