import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202030);

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

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(4, 6, 5);
scene.add(directional);

// Cube
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshStandardMaterial({ color: 0x88cc44 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop (delta-time based, frame-rate independent)
let firstFrameRendered = false;

renderer.setAnimationLoop((_time: number) => {
  const delta = Math.min(renderer.getDelta(), 0.1);
  cube.rotation.x += 0.8 * delta;
  cube.rotation.y += 1.2 * delta;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
