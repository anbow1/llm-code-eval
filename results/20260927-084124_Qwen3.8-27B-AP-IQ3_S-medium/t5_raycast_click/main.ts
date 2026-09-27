import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(5, 5, 8);
scene.add(directionalLight);

// 5x5 grid of cubes in the XY plane
const GRID = 5;
const CUBE_SIZE = 1;
const SPACING = 1.6;
const HALF = (GRID - 1) / 2;

const boxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>(
      boxGeometry,
      material
    );
    const x = (col - HALF) * SPACING;
    const y = (row - HALF) * SPACING;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Selection logic
let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null =
  null;

const raycaster = new THREE.Raycaster();
const ndcVector = new THREE.Vector2();

function handlePointerDown(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  ndcVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndcVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndcVector, camera);
  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh<
      THREE.BoxGeometry,
      THREE.MeshStandardMaterial
    >;

    if (selectedCube && selectedCube !== hit) {
      selectedCube.material.color.setHex(0x4488ff);
    }

    selectedCube = hit;
    hit.material.color.setHex(0xff0000);
  } else {
    if (selectedCube) {
      selectedCube.material.color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', handlePointerDown);

// Resize handling
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Render loop
let firstFrame = true;
renderer.setAnimationLoop((): void => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
