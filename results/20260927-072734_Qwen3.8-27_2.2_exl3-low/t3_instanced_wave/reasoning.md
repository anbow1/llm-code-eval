Let me plan this out:

1. Create a 100x100 grid of small cubes using InstancedMesh (10,000 instances)
2. Animate a radial wave using setMatrixAt and instanceMatrix.needsUpdate
3. Give each instance a color via setColorAt (gradient by grid position)
4. Reuse one Object3D/Matrix4 for updates - no allocations in render loop
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid

Key considerations:
- Use a single Object3D to compute matrices, or directly compute the matrix manually
- The grid is 100x100, so positions range from -50 to 50 (or 0 to 99, centered)
- Small cubes - let's say 0.8 units with 1.0 spacing, so the grid spans about 100 units
- Wave: sin(distanceFromCenter * k - time * speed) * amplitude
- Colors: gradient by grid position (e.g., x/y based HSL)
- Camera at an angle - elevated and to the side

Let me write this carefully:

- Grid positions: i from 0 to 99, x = i - 50, z = j - 50 (centered at origin)
- Cube size: 0.8, spacing: 1.0
- Amplitude: ~2.0
- k: ~0.3 (wave frequency)
- speed: ~2.0

For the Object3D reuse: I'll create one Object3D and set its position and matrix each frame. Actually, since only Y changes, I can just update the Y component of the matrix directly. But the requirement says to use setMatrixAt with a reused Object3D or Matrix4.

Let me use a single Matrix4 that I update each frame. I'll precompute the base positions (X, Z) and just update Y.

Actually, let me think about this more carefully. The matrix for each instance is a translation matrix (position) since the cubes don't rotate or scale. So the matrix is:
```
1 0 0 x
0 1 0 y
0 0 1 z
0 0 0 1
```

I can reuse a single Matrix4 and just update the x, y, z translation values.

For colors: I'll use a gradient based on grid position. Let's do a gradient from (x+50)/100 for R and (z+50)/100 for G, or something like that. Maybe a radial gradient for hue.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(60, 40, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

// Grid
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.0;
const K = 0.3;
const SPEED = 2.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.2,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Precompute base positions
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const baseDist = new Float32Array(COUNT);

let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = i * SPACING - (GRID - 1) * SPACING * 0.5;
    const z = j * SPACING - (GRID - 1) * SPACING * 0.5;
    baseX[idx] = x;
    baseZ[idx] = z;
    baseDist[idx] = Math.sqrt(x * x + z * z);
    idx++;
  }
}

// Set colors
const color = new THREE.Color();
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx2 = i * GRID + j;
    const u = i / (GRID - 1);
    const v = j / (GRID - 1);
    color.setHSL(0.55 + u * 0.3, 0.7, 0.35 + v * 0.35);
    mesh.setColorAt(idx2, color);
  }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable matrix (no allocation in loop)
const mat = new THREE.Matrix4();

let elapsed = 0;

renderer.setAnimationLoop((time) => {
  const delta = time - elapsed;
  elapsed = time;

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const y = Math.sin(baseDist[idx] * K - time * SPEED) * AMPLITUDE;
      mat.makeTranslation(baseX[idx], y, baseZ[idx]);
      mesh.setMatrixAt(idx, mat);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  (window as any).__ready = true;
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about the `__ready` flag. It should be set after the first frame is rendered. Let me use a flag to set it only once.

Also, I should make sure the code compiles with `tsc --strict`. Let me check:
- `mesh.instanceColor` is nullable - I use `!` which is fine
- The `time` parameter in setAnimationLoop is a number (DOMHighResTimeStamp)
- `delta` is unused - I can remove it or just not compute it. Actually the requirement says "Motion must use delta/elapsed time, not frame counts." So I should use the time value for the wave animation. The `time` parameter gives absolute time, which is fine for `sin(time * SPEED)`.

Actually, let me re-read: "Motion must use delta/elapsed time, not frame counts." This means I shouldn't do `frame++` and use that. Using the `time` parameter (which is elapsed time in ms) is fine. I'll use `time / 1000` to get seconds.

Let me also double-check: the `setAnimationLoop` callback receives a `time` parameter which is a DOMHighResTimeStamp (milliseconds). So `time / 1000` gives seconds.

Let me finalize the code. I'll track whether the first frame has been rendered with a boolean.
