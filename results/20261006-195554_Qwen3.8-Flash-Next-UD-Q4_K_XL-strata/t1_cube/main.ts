import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(2.5, 2.0, 3.0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x4fc3f7,
  roughness: 0.4,
  metalness: 0.3,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const clock = new THREE.Clock();
let firstFrameRendered = false;

const ROTATION_SPEED_X = 0.8; // radians per second
const ROTATION_SPEED_Y = 1.2; // radians per second

function animate(): void {
  const delta = clock.getDelta();

  cube.rotation.x += ROTATION_SPEED_X * delta;
  cube.rotation.y += ROTATION_SPEED_Y * delta;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as unknown as Record<string, unknown>).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as unknown as Record<string, unknown>).__scene = scene;
(window as unknown as Record<string, unknown>).__camera = camera;
(window as unknown as Record<string, unknown>).__renderer = renderer;
