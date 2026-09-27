```ts
import * as THREE from 'three';

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a3e);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 2, 4);
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xe74c3c,
  roughness: 0.4,
  metalness: 0.3,
});
const cube: THREE.Mesh = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

const clock: THREE.Clock = new THREE.Clock();

const rotSpeedX: number = 1.2;
const rotSpeedY: number = 0.8;

let firstFrame: boolean = false;

window.addEventListener('resize', (): void => {
  const w: number = window.innerWidth;
  const h: number = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();

  cube.rotation.x += rotSpeedX * delta;
  cube.rotation.y += rotSpeedY * delta;

  renderer.render(scene, camera);

  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```