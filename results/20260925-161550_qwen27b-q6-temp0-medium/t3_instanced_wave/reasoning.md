Create a single TypeScript file. Use InstancedMesh, no allocations in the loop, use setColorAt only once at init (or per-frame, but init-time is sufficient; the spec says "give each instance its own color with setColorAt (e.g., a gradient by grid position)" — set it at init and flag instanceColor.needsUpdate). Use a dummy Object3D for matrix updates. Compute the wave in the loop.

Grid 100x100, spacing probably 1.2, cube size 1. Precompute base positions (x, z) and distanceFromCenter, and store the index arrays.

Set camera position to (0, 60, 90) or so, looking at the origin. Grid size 100*1.2=120, half = 60. Camera at (0, 70, 110) with lookAt(0,0,0) — the whole grid is visible.

Lights: Ambient + Directional.

Set the renderer, shadows are optional (skip shadows for performance).

Mark __ready after the first frame: use a frame flag inside the animation loop.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e1a);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0, 80, 130);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(60, 100, 40);
scene.add(dir);

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.4;
const CUBE = 1.0;

const geo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
scene.add(mesh);

// base data
const basePositions = new Float32Array(COUNT * 2); // x, z
const dists = new Float32Array(COUNT);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

let i = 0;
const half = (GRID - 1) / 2;
for (let r = 0; r < GRID; r++) {
  for (let c = 0; c < GRID; c++) {
    const x = (c - half) * SPACING;
    const z = (r - half) * SPACING;
    basePositions[i*2] = x;
    basePositions[i*2+1] = z;
    const d = Math.sqrt(x*x + z*z);
    dists[i] = d;
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    // gradient color
    const t = (c + r) / (2 * (GRID - 1));
    color.setHSL(0.55 + t * 0.45, 0.75, 0.5);
    mesh.setColorAt(i, color);
    i++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

const k = 0.15; // wave number
const speed = 4.0;
const amplitude = 6.0;

const clock = new THREE.Clock();
let ready = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // elapsed time
  const t = clock.elapsedTime;
  for (let idx = 0; idx < COUNT; idx++) {
    const x = basePositions[idx*2];
    const z = basePositions[idx*2+1];
    const y = Math.sin(dists[idx] * k - t * speed) * amplitude;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

delta is unused… I'm using clock.elapsedTime so it's fine, but in strict mode: unused local variable — tsc's strict doesn't error on unused locals unless noUnusedLocals is set. Just to be safe, use delta: accumulate time manually: `let elapsed = 0; elapsed += delta;` and use elapsed for the wave. That way delta gets used.

k = 0.15, with max distance ~ sqrt(60^2+60^2)*… half = 49.5, spacing 1.4 → max offset 69.3, distance ~98. k*98 ≈ 14.7 rad, plenty of waves. No problem.

Amplitude 6, cube 1, spacing 1.4 — the cubes may intersect vertically, but that's fine, or reduce the amplitude to 3. Use 3.

Write the final code block.
