

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const cubeSize: number = 1;
const gap: number = 0.5;
const spacing: number = cubeSize + gap;
const gridSize: number = 5;
const offset: number = ((gridSize - 1) * spacing) / 2;

const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(i * spacing - offset, j * spacing - offset, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selectedMesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event: MouseEvent): void {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selectedMesh === hitMesh) {
      return;
    }
    if (selectedMesh !== null) {
      selectedMesh.material.color.setHex(0x4488ff);
    }
    selectedMesh = hitMesh;
    selectedMesh.material.color.setHex(0xff0000);
  } else {
    if (selectedMesh !== null) {
      selectedMesh.material.color.setHex(0x4488ff);
      selectedMesh = null;
    }
  }
}

renderer.domElement.addEventListener('click', onClick);

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready: boolean = false;
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```