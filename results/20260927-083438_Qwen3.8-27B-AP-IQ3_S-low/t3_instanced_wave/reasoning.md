Let me break down the requirements:

1. 100x100 grid (10,000 cubes) using ONE InstancedMesh
2. Animate a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Use setMatrixAt each frame, flag instanceMatrix.needsUpdate
4. setColorAt for each instance with a gradient by grid position
5. Reuse one Object3D or Matrix4 for updates - no allocations in render loop
6. MeshStandardMaterial, AmbientLight + DirectionalLight
7. Camera at an angle to see the whole grid and wave
8. All the hard rules about imports, renderer setup, resize, animation loop, window exposure, etc.

Let me plan the code:

- Import THREE from 'three'
- Create scene, camera, renderer
- Create a BoxGeometry (small cube)
- Create MeshStandardMaterial
- Create InstancedMesh with count 10000
- For each instance, set initial position and color
- In the animation loop, update each instance's Y position based on radial wave
- Use a single Matrix4 (or Object3D) reused for all matrix computations
- Handle resize
- Set window.__scene, __camera, __renderer, __ready

Let me think about the wave:
- Grid is 100x100, centered at origin
- Each cube position: (i * spacing, 0, j * spacing) where i, j go from -50 to 49 or similar
- distanceFromCenter = sqrt(x^2 + z^2)
- Y = sin(distanceFromCenter * k - time * speed) * amplitude

For no allocations in the render loop:
- Pre-allocate a Matrix4 and a Vector3 (or just use Matrix4 directly)
- Actually, I can just use a single Matrix4 and compose it manually or use Object3D

Let me think about the color gradient:
- Could be based on x position (left to right gradient) or radial (distance from center)
- I'll do a gradient based on grid position - maybe hue based on x/z position

Let me write this out:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Camera position - angled to see the grid
camera.position.set(60, 50, 60);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Grid setup
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const COUNT = GRID_SIZE * GRID_SIZE;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute base positions
const basePositions: Float32Array = new Float32Array(COUNT * 2); // x, z for each instance

const dummy = new THREE.Object3D();
const color = new THREE.Color();

let idx = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = (i - GRID_SIZE / 2 + 0.5) * SPACING;
    const z = (j - GRID_SIZE / 2 + 0.5) * SPACING;
    basePositions[idx * 2] = x;
    basePositions[idx * 2 + 1] = z;

    // Set initial matrix
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    // Set color gradient
    const hue = (i / GRID_SIZE) * 0.6; // blue to yellow
    const sat = 0.7;
    const light = 0.5;
    color.setHSL(hue, sat, light);
    mesh.setColorAt(idx, color);

    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// Wave parameters
const K = 0.5;
const SPEED = 3.0;
const AMPLITUDE = 1.5;

// Reusable matrix for the render loop
const m4 = new THREE.Matrix4();
// Actually, I need to be careful. Using Object3D or Matrix4.
// Let me use a Matrix4 and compose it manually to avoid needing Object3D.
// Or I can use a single Object3D.

const waveDummy = new THREE.Object3D();

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const idx2 = i * GRID_SIZE + j;
      const x = basePositions[idx2 * 2];
      const z = basePositions[idx2 * 2 + 1];
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * K - elapsed * SPEED) * AMPLITUDE;

      waveDummy.position.set(x, y, z);
      waveDummy.updateMatrix();
      mesh.setMatrixAt(idx2, waveDummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to check: `mesh.instanceColor` - if I use `setColorAt`, it creates the instanceColor buffer. Let me make sure I handle that properly.

Also, I should make sure there are no allocations in the render loop. The `waveDummy` is created outside the loop, `basePositions` is pre-allocated. The `Math.sqrt` and arithmetic are fine (they're primitives). `waveDummy.position.set` and `waveDummy.updateMatrix()` don't allocate. `mesh.setMatrixAt` doesn't allocate (it writes into the existing buffer).

Let me also think about whether I need to handle `instanceColor.needsUpdate` in the loop - no, colors are set once and don't change.

Actually wait - I should double-check that `setColorAt` creates the buffer. In Three.js, `InstancedMesh.setColorAt` will create `instanceColor` if it doesn't exist. After the loop, I should set `instanceColor.needsUpdate = true`.

Let me also reconsider the camera position. The grid spans from about -50 to +50 in both x and z. So the grid is 100 units wide. A camera at (60, 50, 60) looking at origin should give a nice angled view. Maybe I should go a bit further back to ensure the whole grid is visible. Let me use (70, 55, 70) or so.

Actually with a 60 degree FOV and the grid being 100 units wide, let me calculate. The grid diagonal is about 141 units. At distance ~100 from center with 60° FOV, the visible width at that distance is about 2 * 100 * tan(30°) ≈ 115 units. That might be tight. Let me use camera position (80, 60, 80) which is about 116 units from origin. That should work better.

Let me finalize the code.
