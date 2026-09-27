

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const cubeSize = 1.0;
const spacing = 1.2;
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set((i - 2) * spacing, (j - 2) * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (selectedCube !== null && selectedCube !== hit) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    }
    (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    selectedCube = hit;
  } else {
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
```