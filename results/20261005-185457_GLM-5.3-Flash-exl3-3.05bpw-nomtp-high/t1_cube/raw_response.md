```ts
import * as THREE from 'three';

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x228866);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.2, 4);
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xcc2244,
  metalness: 0.2,
  roughness: 0.5
});
const cube: THREE.Mesh = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(3, 5, 4);
scene.add(directionalLight);

window.addEventListener('resize', () => {
  const width: number = window.innerWidth;
  const height: number = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

const ROTATION_SPEED: number = 0.8; // radians per second

let ready: boolean = false;

renderer.setAnimationLoop((time: number) => {
  const deltaTime: number = Math.min(clock.getDelta(), 0.1);

  cube.rotation.x += ROTATION_SPEED * deltaTime;
  cube.rotation.y += ROTATION_SPEED * deltaTime * 0.7;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

const clock = new THREE.Clock();

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```