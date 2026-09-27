The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using one InstancedMesh (10,000 instances)
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setMatrixAt for each instance's Y position
4. Uses setColorAt for per-instance colors (gradient by grid position)
5. Reuses one Object3D or Matrix4 - no allocations in the render loop
6. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
7. Camera at an angle to see the whole grid and wave
8. Handles resize
9. Exposes __scene, __camera, __renderer, __ready
10. Uses setAnimationLoop with delta/elapsed time

Let me think about the implementation:

- Grid: 100x100 = 10,000 instances
- Each cube is small, let's say 0.9 units with 1 unit spacing (so they don't overlap)
- Grid spans from -50 to +50 in X and Z
- Center is at (0, 0, 0)
- For each instance, compute distance from center, then y = sin(dist * k - time * speed) * amplitude
- Reuse a single Object3D (or Matrix4) for setting matrices
- Colors: gradient by grid position - maybe a mix of colors based on x and z normalized

Let me think about the camera position. The grid is 100x100 units. To see the whole thing at an angle, I'll put the camera at something like (60, 60, 60) looking at the origin.

For the wave:
- k = some spatial frequency, maybe 0.3
- speed = maybe 2
- amplitude = maybe 2

For colors, I'll do a gradient - maybe hue based on position, or a simple lerp between two colors based on normalized x and z.

Let me write this out:

```typescript
import * as THREE from 'three';

const GRID_SIZE = 100;
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1;
const CUBE_SIZE = 0.9;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(60, 50, 60);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute positions and distances
const positions: { x: number; z: number; dist: number }[] = [];
const dummy = new THREE.Object3D();
const color = new THREE.Color();

let index = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = (i - GRID_SIZE / 2 + 0.5) * SPACING;
    const z = (j - GRID_SIZE / 2 + 0.5) * SPACING;
    const dist = Math.sqrt(x * x + z * z);
    positions.push({ x, z, dist });
    
    // Set initial matrix
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    
    // Color gradient
    const nx = i / (GRID_SIZE - 1);
    const nz = j / (GRID_SIZE - 1);
    color.setHSL(0.6 * nx + 0.4 * nz, 0.8, 0.5);
    mesh.setColorAt(index, color);
    
    index++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// Animation
const clock = new THREE.Clock();
const waveK = 0.3;
const waveSpeed = 2.0;
const waveAmplitude = 2.0;

let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  
  for (let i = 0; i < COUNT; i++) {
    const p = positions[i];
    const y = Math.sin(p.dist * waveK - elapsed * waveSpeed) * waveAmplitude;
    dummy.position.set(p.x, y, p.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- `positions` is typed as `{ x: number; z: number; dist: number }[]` - good
- `dummy` is `THREE.Object3D` - good
- `color` is `THREE.Color` - good
- The `mesh.instanceColor` could be null, so I need to handle that. Actually, after calling `setColorAt`, `instanceColor` should be non-null. But TypeScript might complain. Let me use a check.

Actually, `mesh.instanceColor` is typed as `THREE.InstancedBufferAttribute | null` in Three.js types. So I need to handle the null case. But since we're calling `setColorAt` before, it should be set. Let me just use a non-null assertion or check.

Actually, let me just do:
```typescript
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}
```

Or I could use `mesh.instanceColor!.needsUpdate = true;` since we know it's set after setColorAt.

Let me also make sure the dummy object is reused properly. The key requirement is "no allocations inside the render loop." The `dummy` Object3D is created outside the loop, and we just call `dummy.position.set()` and `dummy.updateMatrix()` each frame. That should be fine - `updateMatrix()` doesn't allocate a new matrix, it updates the existing one.

Let me also think about whether `setMatrixAt` allocates. Looking at the Three.js source, `setMatrixAt` just writes to the existing `instanceMatrix` buffer, so no allocation.

I think this is solid. Let me finalize.
