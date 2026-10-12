import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223322);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.5, 2, 3.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(4, 6, 3);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff8844 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ROTATION_SPEED = 1.0; // radians per second

function animate(): void {
  const delta = renderer.getDelta();
  cube.rotation.x += ROTATION_SPEED * delta;
  cube.rotation.y += ROTATION_SPEED * delta * 1.5;
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let readyFlagged = false;
renderer.setAnimationLoop((time: number) => {
  const delta = renderer.getDelta();
  cube.rotation.x += ROTATION_SPEED * delta;
  cube.rotation.y += ROTATION_SPEED * delta * 1.5;
  renderer.render(scene, camera);
  if (!readyFlagged) {
    readyFlagged = true;
    (window as any).__ready = true;
  }
});
