```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151f);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 55, 75);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(30, 60, 20);
scene.add(dir);

const GRID = 100;
const SPACING = 1;
const geometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
scene.add(mesh);

// Set colors once: gradient by grid position
const color = new THREE.Color();
for (let ix = 0; ix < GRID; ix++) {
  for (let iz = 0; iz < GRID; iz++) {
    const idx = ix * GRID + iz;
    const t = (ix / (GRID - 1) + iz / (GRID - 1)) / 2;
    color.setHSL(0.6 - 0.6 * t, 0.9, 0.55);
    mesh.setColorAt(idx, color);
  }
}
mesh.instanceColor!.needsUpdate = true;

const center = (GRID - 1) * SPACING / 2;
const dummy = new THREE.Object3D();
const K = 0.35;
const SPEED = 2.5;
const AMPLITUDE = 5;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const time = clock.getElapsedTime();

  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const x = ix * SPACING - center;
      const z = iz * SPACING - center;
      const dist = Math.sqrt(x * x + z * z);
      const idx = ix * GRID + iz;
      dummy.position.set(x, Math.sin(dist * K - time * SPEED) * AMPLITUDE, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
  (window as any).__ready = true;
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