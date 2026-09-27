import * as THREE from 'three';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
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

const cubeSize: number = 1;
const gap: number = 0.3;
const spacing: number = cubeSize + gap;
const gridSize: number = 5;
const offset: number = ((gridSize - 1) * spacing) / 2;

const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
    });
    const cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> =
      new THREE.Mesh(geometry, material);
    cube.position.set(-offset + i * spacing, -offset + j * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

const raycaster: THREE.Raycaster = new THREE.Raycaster();

function onClick(event: MouseEvent): void {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  const ndcX: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hit: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> =
      intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selectedCube !== null && selectedCube !== hit) {
      selectedCube.material.color.setHex(0x4488ff);
    }
    selectedCube = hit;
    hit.material.color.setHex(0xff0000);
  } else {
    if (selectedCube !== null) {
      selectedCube.material.color.setHex(0x4488ff);
      selectedCube = null;
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
