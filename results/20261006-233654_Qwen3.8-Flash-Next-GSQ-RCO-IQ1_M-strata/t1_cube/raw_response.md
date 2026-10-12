```ts
import * as THREE from 'three';

const scene = new THREE.Scene();

const background = new THREE.Color(0x0f172a);
const cubeColor = new THREE.Color(0x00b4ff);
scene.background = background;

const initialWidth = Math.max(1, window.innerWidth);
const initialHeight = Math.max(1, window.innerHeight);

const camera = new THREE.PerspectiveCamera(50, initialWidth / initialHeight, 0.1, 100);
camera.position.set(3.0, 2.0, 4.0);

const lookTarget = new THREE.Vector3(0, 0, 0);
camera.lookAt(lookTarget);

const ambientLight = new THREE.AmbientLight(new THREE.Color(0xffffff), 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(new THREE.Color(0xffffff), 1.2);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

const geometry = new THREE.BoxGeometry(1.25, 1.25, 1.25);
const material = new THREE.MeshStandardMaterial({
  color: cubeColor,
  roughness: 0.35,
  metalness: 0.25,
});

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const renderer = new THREE.WebGLRenderer({ antialias: true });

const applyViewportSize = (): void => {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

applyViewportSize();
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', applyViewportSize);

let firstFrameRendered = false;

const rotationSpeedX = 1.35;
const rotationSpeedY = 1.95;

renderer.setAnimationLoop((delta: number): void => {
  const dt = delta > 0 ? delta : 0;

  cube.rotation.x += rotationSpeedX * dt;
  cube.rotation.y += rotationSpeedY * dt;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```