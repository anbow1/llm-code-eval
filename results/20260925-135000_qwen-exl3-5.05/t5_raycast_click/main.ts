import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

type Cube = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

const cubes: Cube[] = [];
const geometry = new THREE.BoxGeometry(1, 1, 1);

const count = 5;
const cubeSize = 1;
const gap = 0.5;
const step = cubeSize + gap;
const offset = ((count - 1) * step) / 2;

for (let x = 0; x < count; x++) {
  for (let y = 0; y < count; y++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);

    cube.position.set(
      x * step - offset,
      y * step - offset,
      0
    );

    scene.add(cube);
    cubes.push(cube);
  }
}

let selected: Cube | null = null;

function setSelected(cube: Cube | null): void {
  if (selected === cube) {
    return;
  }

  if (selected !== null) {
    selected.material.color.setHex(0x4488ff);
  }

  selected = cube;

  if (selected !== null) {
    selected.material.color.setHex(0xff0000);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function handleClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const cube = intersects[0].object as unknown as Cube;

    if (cubes.includes(cube)) {
      setSelected(cube);
    } else {
      setSelected(null);
    }
  } else {
    setSelected(null);
  }
}

renderer.domElement.addEventListener('click', handleClick);

function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  void elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
