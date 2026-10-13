The user wants a single TypeScript file with a 100x100 instanced cube grid, radial wave animation, per-instance colors, lights, camera at angle, resize handling, animation loop with delta time, and testing hooks.

Requirements:
- 100x100 = 10,000 instances in ONE InstancedMesh
- Every frame: set Y = sin(distanceFromCenter * k - time * speed) * amplitude via setMatrixAt, then instanceMatrix.needsUpdate = true
- setColorAt with gradient by grid position
- Reuse one Object3D (no allocations in loop)
- MeshStandardMaterial, AmbientLight + DirectionalLight
- Camera angled to see whole grid + wave
- Delta time based motion
- window.__scene, __camera, __renderer, __ready after first frame

Let me write clean, strict TypeScript:

```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const camDistance = 120;
// position at angle
camera.position.set(0, 80, 90);
camera.lookAt(0, 0, 0);

// resize
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(50, 100, 40);
scene.add(dir);

// ---------- Grid of instanced cubes ----------
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0; // grid cell spacing
const CUBE = 0.6;

const geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Precompute grid positions, distances, colors
const xs: Float32Array = new Float32Array(COUNT);
const zs: Float32Array = new Float32Array(COUNT);
const dists: Float32Array = new Float32Array(COUNT);
const half = (GRID - 1) / 2;
const maxDist = Math.hypot(half, half) * SPACING;
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const index = 0...
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - half) * SPACING;
    const z = (j - half) * SPACING;
    xs[idx] = x;
    zs[idx] = z;
    dists[idx] = Math.hypot(x, z);
    // gradient color by grid position
    color.setHSL(0.6 - (dists[idx]/maxDist) * 0.5, 0.8, 0.5);
    mesh.setColorAt(idx, color);
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// wave params
const K = 0.35;
const SPEED = 4;
const AMPLITUDE = 4;

let time = 0;
let firstFrame = true;

renderer.setAnimationLoop((elapsed... ) => {
```

setAnimationLoop callback receives (time, render context) where time is elapsed in ms. I'll use the Clock for delta.

```ts
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  time += delta;
  for (let idx = 0; idx < COUNT; idx++) {
    dummy.position.set(xs[idx], Math.sin(dists[idx] * K - time * SPEED) * AMPLITUDE, zs[idx]);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Grid extent: 100 units wide (spacing 1). Camera at (0, 80, 90) looking at origin should see the whole grid. Maybe make camera position more explicitly computed. Camera at angle — fine.

Strict TS: `(window as any).__scene = scene;` works. Clock delta fine. Ensure everything typed. The animation loop callback signature: `(time: number, frame?: XRFrame)` — passing a zero-arg arrow is fine.

Expose hooks before or after loop — before is fine.

Double-check strict: no implicit any. All good. `dummy.matrix` typed Matrix4 — setMatrixAt accepts Matrix4. Good.

Maybe rotate camera slowly? Not required. Keep static but angled. Fine.

One note: setColorAt requires material color support; with MeshStandardMaterial works, needsUpdate on instanceColor once at init. Good.

Write final code.