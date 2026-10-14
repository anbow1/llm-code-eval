```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121420);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  roughness: 0.35,
  metalness: 0.25
});

const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
directionalLight.position.set(5, 8, 7);
scene.add(directionalLight);

let viewportWidth = Math.max(1, window.innerWidth);
let viewportHeight = Math.max(1, window.innerHeight);

const camera = new THREE.PerspectiveCamera(
  55,
  viewportWidth / viewportHeight,
  0.1,
  100
);
camera.position.set(3.25, 2.6, 4.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(viewportWidth, viewportHeight);
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const resize = () => {
  viewportWidth = Math.max(1, window.innerWidth);
  viewportHeight = Math.max(1, window.innerHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(viewportWidth, viewportHeight);

  camera.aspect = viewportWidth / viewportHeight;
  camera.updateProjectionMatrix();
};

window.addEventListener('resize', resize);

const clock = new THREE.Clock();
const rotationSpeed = 0.9;
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  cube.rotation.x += rotationSpeed * delta;
  cube.rotation.y += rotationSpeed * delta;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});
```