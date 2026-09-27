The user wants a complete TypeScript file that renders a 100x100 grid of small cubes using InstancedMesh with a radial wave animation. Let me plan this carefully:

1. **InstancedMesh**: One `THREE.InstancedMesh` with 10,000 instances (100x100 grid).
2. **Radial wave**: Each frame, compute `y = sin(distanceFromCenter * k - time * speed) * amplitude` for each instance, update its matrix via `setMatrixAt`, then set `instanceMatrix.needsUpdate = true`.
3. **Colors**: Use `setColorAt` for a gradient based on grid position (e.g., from center to edges, or a hue gradient across the grid).
4. **No allocations in render loop**: Reuse a single `Matrix4` (and possibly a `Vector3` or just compute inline) for the matrix updates.
5. **MeshStandardMaterial** with **AmbientLight** + **DirectionalLight**.
6. **Camera at an angle** so the whole grid and wave are visible.
7. **Hard rules**: Import THREE, create renderer, append to body, handle resize, use `setAnimationLoop`, expose `__scene`, `__camera`, `__renderer`, set `__ready` after first frame, no external assets.

Let me think about the implementation:

- Grid: 100x100, so indices go from 0 to 9999. For index `i`, row = Math.floor(i / 100), col = i % 100.
- Position: x = col - 50, z = row - 50 (centered at origin). Or maybe spread them out a bit. Let's say spacing = 1, so x goes from -49.5 to 49.5 or similar. Actually let's use spacing like 1.0 and center at origin: x = (col - 49.5) * spacing, z = (row - 49.5) * spacing. Or simpler: x = col * spacing - (100-1)/2 * spacing, z = row * spacing - (49.5) * spacing.

Let me use:
- spacing = 1.0
- x = (col - 49.5) * spacing
- z = (row - 49.5) * spacing
- Base Y = 0 (will be modified by wave)

- Wave: `y = Math.sin(dist * k - time * speed) * amplitude`
  - dist = sqrt(x*x + z*z)
  - k = 0.5 (wave number)
  - speed = 2.0
  - amplitude = 2.0

- For the matrix: I'll use a single `Matrix4` and set its elements directly. Since each cube is axis-aligned (no rotation), I can just set the translation part. Actually, to be safe, I'll compose a translation matrix. The matrix for a unit cube at position (x, y, z) is:
  ```
  1 0 0 x
  0 1 0 y
  0 0 1 z
  0 0 0 1
  ```

- Reuse: Create `const dummy = new THREE.Object3D()` or `const mat4 = new THREE.Matrix4()`. Using Object3D is cleaner - set position, call updateMatrix, then setMatrixAt.

Wait, the rule says "Reuse one Object3D or Matrix4 for the updates: no allocations inside the render loop." So I'll create one `THREE.Object3D` outside the loop and reuse it.

- Colors: Gradient by grid position. I'll use a color that varies based on the position - maybe hue based on angle from center, or a gradient from blue at center to red at edges. Let's do a hue gradient: hue = (col + row) / (200) or something. Or distance-based: hue = dist / maxDist.

Let me go with: `const color = new THREE.Color()` reused, and for each instance set color based on position. I'll use `setColorAt` once during setup (not in the render loop, since colors don't change).

Wait, actually `setColorAt` needs to be called for each instance during setup. I need a temporary Color object for that too. Let me allocate it outside.

- Camera: Position it at an angle. For a 100x100 grid, the grid spans roughly -50 to 50 in x and z. So I need the camera far enough back. Let's put it at (80, 60, 80) looking at origin, with a wider FOV.

- Renderer: Standard setup with antialias.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 60, 80);
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
directionalLight.position.set(30, 50, 30);
scene.add(directionalLight);

// InstancedMesh setup
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const AMPLITUDE = 2.0;
const K = 0.5;
const SPEED = 2.0;

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.7,
});
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// Set initial positions and colors
const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

for (let i = 0; i < COUNT; i++) {
  const row = Math.floor(i / GRID);
  const col = i % GRID;
  const x = (col - (GRID - 1) / 2) * SPACING;
  const z = (row - (GRID - 1) / 2) * SPACING;
  
  dummy.position.set(x, 0, z);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  
  // Color gradient
  const dist = Math.sqrt(x * x + z * z);
  const maxDist = Math.sqrt(2) * (GRID / 2) * SPACING;
  const hue = dist / maxDist;
  tempColor.setHSL(hue * 0.6, 0.8, 0.5);
  mesh.setColorAt(i, tempColor);
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// Pre-compute positions and distances for the render loop
const posX = new Float32Array(COUNT);
const posZ = new Float32Array(COUNT);
const dists = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  const row = Math.floor(i / GRID);
  const col = i % GRID;
  posX[i] = (col - (GRID - 1) / 2) * SPACING;
  posZ[i] = (row - (GRID - 1) / 2) * SPACING;
  dists[i] = Math.sqrt(posX[i] * posX[i] + posZ[i] * posZ[i]);
}

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((timestamp: number) => {
  if (!ready) {
    // We need delta - let's track it
  }
  // Actually, setAnimationLoop passes a timestamp. Let me use that.
});
```

Wait, `setAnimationLoop` passes a `DOMHighResTimeStamp` (same as `requestAnimationFrame`). I need to compute delta. Let me use a `lastTime` variable.

Actually, looking at the Three.js docs, `setAnimationLoop` callback receives a timestamp similar to rAF. Let me track the last timestamp to compute delta.

Let me also make sure I'm not allocating in the loop. The `dummy` Object3D is reused. I set `dummy.position.set(x, y, z)` each iteration - that doesn't allocate, it just modifies the existing Vector3.

Let me finalize the code. I need to be careful about `tsc --strict` compliance:
- All variables properly typed
- No implicit any
- Null checks where needed

Let me also make sure `mesh.instanceColor` is handled - after `setColorAt` is called, `instanceColor` should exist.

One more thing: the `__ready` flag should be set after the first frame is rendered. I'll use a flag and set it on the first call of the animation loop.

Let me write the final version now.
