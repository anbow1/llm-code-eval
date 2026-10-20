```ts
import * as THREE from 'three';

// ---------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------
// Scene & Camera
// ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101a2c);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(2.5, 2.0, 4.5);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------
// Lights
// ---------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// ---------------------------------------------------------------
// Cube
// ---------------------------------------------------------------
const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
const material = new THREE.MeshStandardMaterial({
  color: 0xff8a3d,
  roughness: 0.35,
  metalness: 0.15,
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// ---------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------
function onWindowResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize);

// ---------------------------------------------------------------
// Animation loop (delta-time based, frame-rate independent)
// ---------------------------------------------------------------
const clock = new THREE.Clock();
let readySignalled = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  cube.rotation.x += delta * 0.9;
  cube.rotation.y += delta * 1.35;

  renderer.render(scene, camera);

  if (!readySignalled) {
    readySignalled = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------
// Testing hooks
// ---------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```