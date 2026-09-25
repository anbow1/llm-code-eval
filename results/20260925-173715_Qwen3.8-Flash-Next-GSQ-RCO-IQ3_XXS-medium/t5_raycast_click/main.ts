import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(3, 4, 5);
scene.add(directionalLight);

const CUBE_SIZE = 1;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;
const HALF = (GRID - 1) / 2;

const cubes: THREE.Mesh[] = [];
const defaultColor = new THREE.Color(0x4488ff);
const selectedColor = new THREE.Color(0xff0000);

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let ix = 0; ix < GRID; ix++) {
  for (let iy = 0; iy < GRID; iy++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (ix - HALF) * SPACING,
      (iy - HALF) * SPACING,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

let selected: THREE.Mesh | null = null;

function handleSelect(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const intersects = raycaster.intersectObjects(cubes);

  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.copy(defaultColor);
    selected = null;
  }

  if (intersects.length > 0) {
    selected = intersects[0].object as THREE.Mesh;
    (selected.material as THREE.MeshStandardMaterial).color.copy(selectedColor);
  }
}

renderer.domElement.addEventListener('click', handleSelect);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
