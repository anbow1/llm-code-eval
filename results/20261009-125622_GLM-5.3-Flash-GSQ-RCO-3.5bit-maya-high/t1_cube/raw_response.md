```ts
import * as THREE from 'three';

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Scene with a background color different from the cube color
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2b3c);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 2.5, 4);
camera.lookAt(0, 0, 0);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff5533 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// Window resize handling
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Animation loop: frame-rate independent rotation using delta time
const rotationSpeedX = 0.8; // radians per second
const rotationSpeedY = 1.2; // radians per second

let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = renderer.getDelta?.() ?? 0;
  // getDelta is unavailable in some versions; fall back to clock
  const dt = delta || clock.getDelta();

  cube.rotation.x += rotationSpeedX * dt;
  cube.rotation.y += rotationSpeedY * dt;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

const clock = new THREE.Clock();
```