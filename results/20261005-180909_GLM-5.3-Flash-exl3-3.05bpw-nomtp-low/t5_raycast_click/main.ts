import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(5, 5, 10);
scene.add(directional);

const BASE_COLOR = 0x4488ff;
const SELECT_COLOR = 0xff0000;
const GRID = 5;

const cubes: THREE.Mesh[] = [];
let selected: THREE.Mesh | null = null;

for (let x = 0; x < GRID; x++) {
  for (let y = 0; y < GRID; y++) {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x - (GRID - 1) / 2) * 1.2, (y - (GRID - 1) / 2) * 1.2, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

const raycaster = new THREE.Raycaster();

function onSelect(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(cubes, false);

  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.setHex(BASE_COLOR);
    selected = null;
  }
  if (hits.length > 0 && hits[0].object instanceof THREE.Mesh) {
    selected = hits[0].object;
    (selected.material as THREE.MeshStandardMaterial).color.setHex(SELECT_COLOR);
  }
}

renderer.domElement.addEventListener('click', onSelect);

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
