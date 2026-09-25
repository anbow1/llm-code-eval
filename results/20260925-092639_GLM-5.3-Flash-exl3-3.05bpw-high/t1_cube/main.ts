import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223344);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(3, 4, 2);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff7700 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((timeMs) => {
  const delta = Math.min(timeMs / 1000 - previousTime, 0.1);
  previousTime = timeMs / 1000;

  cube.rotation.x += 0.75 * delta;
  cube.rotation.y += 1.25 * delta;

  renderer.render(scene, camera);
  hasRendered = true;
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let previousTime = 0;
let hasRendered = false;

// Mark ready after the first rendered frame
function checkReady(): void {
  if (hasRendered) {
    (window as any).__ready = true;
  } else {
    requestAnimationFrame(checkReady);
  }
}
requestAnimationFrame(checkReady);
