```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(200, 160, 200);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(80, 120, 60);
scene.add(dirLight);

const gridSize = 100;
const spacing = 2;
const half = gridSize / 2;
const count = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
instancedMesh.castShadow = false;
instancedMesh.receiveShadow = false;

const dummy: THREE.Object3D = new THREE.Object3D();
const tempColor: THREE.Color = new THREE.Color();
const distances: Float32Array = new Float32Array(count);

let idx: number = 0;
for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const x = (row - half) * spacing;
    const z = (col - half) * spacing;
    const dist = Math.sqrt(x * x + z * z);
    distances[idx] = dist;

    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(idx, dummy.matrix);

    const hue = 0.55 + 0.45 * (dist / (half * spacing));
    tempColor.setHSL(hue, 0.75, 0.5);
    instancedMesh.setColorAt(idx, tempColor);

    idx++;
  }
}

instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) {
  instancedMesh.instanceColor.needsUpdate = true;
}
scene.add(instancedMesh);

const waveK: number = 0.12;
const waveSpeed: number = 2.5;
const waveAmplitude: number = 5.0;

const clock = new THREE.Clock();
let firstFrame: boolean = true;

renderer.setAnimationLoop(() => {
  const time = clock.getElapsedTime();

  idx = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = (row - half) * spacing;
      const z = (col - half) * spacing;
      const y = Math.sin(distances[idx] * waveK - time * waveSpeed) * waveAmplitude;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);

      idx++;
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```