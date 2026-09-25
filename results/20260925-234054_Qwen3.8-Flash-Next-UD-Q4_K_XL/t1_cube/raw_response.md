```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.2, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x44aaff })
);
scene.add(cube);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(4, 6, 2);
scene.add(directionalLight);

const clock = new THREE.Clock();
let hasRenderedOnce = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  cube.rotation.x += delta * 0.8;
  cube.rotation.y += delta * 1.2;

  renderer.render(scene, camera);

  if (!hasRenderedOnce) {
    hasRenderedOnce = true;
    (window as any).__ready = true;
  }
});

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```