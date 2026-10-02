Simple single-file TypeScript using Three.js. Include OrbitControls? Not needed, keep to spec. Provide scene, perspective camera, WebGL renderer set to window size, resize handler, animation loop with clock delta, ambient + directional light, cube with MeshStandardMaterial, background color different from cube color. Expose __scene, __camera, __renderer, and __ready after first frame. Ensure strict typing.

Write code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x228833); // different from cube color

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xcc4444 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.2);
directional.position.set(3, 5, 4);
scene.add(directional);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrameRendered = false;
let hasInitializedTime = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);
  cube.rotation.x += delta * 0.8;
  cube.rotation.y += delta * 1.1;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Strict mode fine. Note: clock starts on first getDelta; delta large initial? On first call, getDelta returns time since start, small enough. Clamp anyway. Ensure background differs from cube color (0x228833 greenish vs 0xcc4444 reddish). Good.