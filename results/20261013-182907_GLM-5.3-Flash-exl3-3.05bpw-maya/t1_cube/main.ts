import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222831);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 2.5, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 6, 4);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xd7263d });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let hasRenderedFirstFrame = false;

renderer.setAnimationLoop(() => {
  const delta = renderer.setAnimationLoop === undefined ? 0 : 0;
  void delta;
  const elapsedTime = performance.now() / 1000;
  const frameDelta = Math.min(elapsedTime - (lastTime || elapsedTime), 0.1);
  lastTime = elapsedTime;

  cube.rotation.x += frameDelta * 0.8;
  cube.rotation.y += frameDelta * 1.2;

  renderer.render(scene, camera);

  if (!hasRenderedFirstFrame) {
    hasRenderedFirstFrame = true;
    (window as any).__ready = true;
  }
});

let lastTime = 0;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
