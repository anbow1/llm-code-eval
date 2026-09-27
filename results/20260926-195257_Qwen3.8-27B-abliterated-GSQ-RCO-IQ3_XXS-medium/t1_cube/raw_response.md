```ts
import * as THREE from 'three';

// Scene
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 3, 3);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Renderer
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// Cube
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  color: 0x4fc3f7,
  metalness: 0.3,
  roughness: 0.4,
});
const cube: THREE.Mesh = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// Lights
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Resize handler
window.addEventListener("resize", (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation (frame-rate independent via delta time)
const ROTATION_SPEED_X: number = 0.8; // rad/s
const ROTATION_SPEED_Y: number = 0.6; // rad/s
let prevTime: number = 0;
let ready: boolean = false;

renderer.setAnimationLoop((time: number): void => {
  if (prevTime === 0) {
    prevTime = time;
  }
  const delta: number = (time - prevTime) / 1000;
  prevTime = time;

  cube.rotation.x += ROTATION_SPEED_X * delta;
  cube.rotation.y += ROTATION_SPEED_Y * delta;

  renderer.render(scene, camera);

  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```