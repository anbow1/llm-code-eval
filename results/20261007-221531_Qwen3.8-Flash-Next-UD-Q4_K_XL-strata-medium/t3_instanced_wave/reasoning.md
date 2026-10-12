The user wants a single TypeScript file that renders a 100x100 grid of small cubes using a single InstancedMesh with a radial wave animation. Let me plan this out:

1. Setup: renderer, scene, camera, lights
2. InstancedMesh with 10000 instances (100x100)
3. Radial wave animation using sin(distance * k - time * speed) * amplitude
4. Per-instance colors via setColorAt (gradient by grid position)
5. Reuse one Object3D for matrix updates - no allocations in render loop
6. MeshStandardMaterial, AmbientLight + DirectionalLight
7. Camera at an angle to see the whole grid

Key constraints:
- Import Three.js as `import * as THREE from 'three'`
- Compiles with `tsc --strict` zero errors
- Create WebGLRenderer, append to document.body
- Handle resize
- Use setAnimationLoop
- Delta/elapsed time for animation
- Expose __scene, __camera, __renderer, __ready
- No external assets
- No allocations inside render loop

Let me write this carefully:

- Grid: 100x100, spacing maybe 0.3 units, cube size 0.2
- Center of grid: (49.5, 0, 49.5) or I'll center it at origin
- Distance from center for each instance
- Pre-compute distances and positions outside the loop
- Use a single Matrix4 or Object3D for setMatrixAt

For strict TypeScript, I need to be careful with types. InstancedMesh.setColorAt requires instanceColor to be set first (by calling setColorAt at least once before the loop, or it creates it).

Let me structure the code:

```ts
import * as THREE from 'three';

// Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
// Position camera at an angle
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(5, 10, 7);
scene.add(directional);

// Grid setup
const COLS = 100;
const ROWS = 100;
const COUNT = COLS * ROWS;
const SPACING = 0.3;
const CUBE_SIZE = 0.15;

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Pre-compute distances from center
const centerX = (COLS - 1) / 2;
const centerZ = (ROWS - 1) / 2;
const distances = new Float32Array(COUNT);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Set initial transforms and colors
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const idx = row * COLS + col;
    const x = (col - centerX) * SPACING;
    const z = (row - centerZ) * SPACING;
    distances[idx] = Math.sqrt((col - centerX) * (col - centerX) + (row - centerZ) * (row - centerZ));
    
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    
    // Gradient color by position
    const t = col / (COLS - 1);
    const s = row / (ROWS - 1);
    color.setHSL(t * 0.3 + s * 0.5, 0.8, 0.5);
    mesh.setColorAt(idx, color);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// Animation
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const t = time * 0.001; // convert ms to seconds
  const speed = 3.0;
  const k = 0.5;
  const amplitude = 0.5;
  
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      const x = (col - centerX) * SPACING;
      const z = (row - centerZ) * SPACING;
      const y = Math.sin(distances[idx] * k - t * speed) * amplitude;
      
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  
  renderer.render(scene, camera);
  
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
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

Wait, I should check - with strict TypeScript, `renderer.setAnimationLoop` callback receives `time: number`. Let me verify the signature. In Three.js types, it's `(time: number) => void`. That should be fine.

Also, `mesh.instanceColor` could be null in strict mode - I need to handle that. Actually, after calling `setColorAt`, it creates the buffer. But in strict mode, TypeScript might complain about the null check. Let me use optional chaining or a non-null assertion.

Actually, looking at the Three.js types more carefully - `instanceColor` is `THREE.InstancedBufferAttribute | null`. After calling `setColorAt`, it's no longer null, but TypeScript doesn't know that. I'll use `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;` which is safe.

Let me also make sure `dummy.updateMatrix()` is called - yes, `Object3D.updateMatrix()` computes the local matrix from position, quaternion, scale.

One thing - the `setAnimationLoop` callback parameter type. In Three.js, the loop function type is `(time: number, frame?: XRFrame) => void`. So I should use `time: number` which should be fine.

Let me also make the camera position good for viewing the grid. The grid spans from -14.85 to 14.85 in both x and z (100 * 0.3 / 2 = 15). A camera at (20, 20, 20) looking at origin should work well.

Let me also add a slight rotation to the dummy for visual interest? No, the spec says just Y position wave. Keep it simple.

Let me finalize the code.
