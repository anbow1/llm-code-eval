```ts
import * as THREE from 'three';

// Scene
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

// Renderer
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cube
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0xff4444,
  roughness: 0.5,
  metalness: 0.3,
});
const cube: THREE.Mesh = new THREE.Mesh(geometry, material);
scene.add(cube);

// Lights
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Resize handling
window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock: THREE.Clock = new THREE.Clock();
let ready: boolean = false;

renderer.setAnimationLoop((): void => {
  const delta: number = clock.getDelta();
  cube.rotation.x += delta * 1.0;
  cube.rotation.y += delta * 0.7;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```