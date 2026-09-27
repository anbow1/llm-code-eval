

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const gridSize = 5;
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap;
const offset = ((gridSize - 1) * spacing) / 2;

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    const x = col * spacing - offset;
    const y = row * spacing - offset;
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function handleClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    if (selectedCube !== null && selectedCube !== hitMesh) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    }
    selectedCube = hitMesh;
    (hitMesh.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  } else {
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', handleClick);

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```