Need to write a complete TS file. InstancedMesh of 100x100. Colors set once. Inside the loop, use a reusable matrix (new THREE.Matrix4 or Object3D) to compute positions, setMatrixAt, and set instanceMatrix.needsUpdate = true.

Set colors once before the loop. Use delta time via clock.

Camera positioned at an angle: position (60, 45, 60), lookAt(0,0,0). Grid spacing 1.

Code:

```ts
import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const AMP = 1.5;
const K = 0.5;
const SPEED = 3.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(55, 45, 55);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(30, 50, 20);
scene.add(dir);

const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 });
const mesh = new THREE.InstancedMesh(geo, mat, COUNT);

// Precompute base positions (x, z) and colors
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const color = new THREE.Color();
let i = 0;
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    const x = (gx - (GRID - 1) / 2) * SPACING;
    const z = (gz - (GRID - 1) / 2) * SPACING;
    baseX[i] = x; baseZ[i] = z;
    color.setHSL(((gx / GRID + gz / GRID) / 2) % 1, 0.8, 0.55);
    mesh.setColorAt(i, color);
    i++;
  }
}
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

const m = new THREE.Matrix4();
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.elapsedTime; // accumulated via getDelta
  let idx = 0;
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const x = baseX[idx];
      const z = baseZ[idx];
      const d = Math.sqrt(x * x + z * z);
      const y = Math.sin(d * K - t * SPEED) * AMP;
      m.makeTranslation(x, y, z);
      mesh.setMatrixAt(idx, m);
      idx++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

clock.elapsedTime works even when using getDelta (getDelta updates elapsedTime). No problem.

Note: mesh.instanceColor is created by setColorAt. Might need to call mesh.instanceColor!.needsUpdate = true, but since we're only setting it once before the first render, it's fine. In fact, setColorAt creates instanceColor. It gets uploaded on the first render. OK.

Make sure there are no unused variables for tsc strict (noUnusedLocals isn't part of strict, so no problem either way).

Output a single code block.
