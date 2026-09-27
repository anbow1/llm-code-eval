import * as THREE from 'three';

const scene = new THREE.Scene();

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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const cubeSize: number = 1;
const gap: number = 0.5;
const spacing: number = cubeSize + gap;
const baseColor: number = 0x4488ff;
const selectedColor: number = 0xff0000;

const cubes: THREE.Mesh[] = [];

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: baseColor });
    const mesh = new THREE.Mesh(geometry, material);
    const x: number = (col - 2) * spacing;
    const y: number = (row - 2) * spacing;
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onClick(event: MouseEvent): void {
  const rect: DOMRect = renderer.domElement.getBoundingClientRect();
  const ndcX: number = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY: number = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersects: THREE.Intersection[] = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const clickedMesh: THREE.Mesh = intersects[0].object as THREE.Mesh;
    if (selectedCube !== null && selectedCube !== clickedMesh) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
    }
    selectedCube = clickedMesh;
    (clickedMesh.material as THREE.MeshStandardMaterial).color.setHex(selectedColor);
  } else {
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
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
