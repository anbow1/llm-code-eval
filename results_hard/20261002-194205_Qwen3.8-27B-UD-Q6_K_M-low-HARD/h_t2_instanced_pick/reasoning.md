The user wants a complete TypeScript file that:

1. Creates a WebGLRenderer, appends to document.body
2. Creates a PerspectiveCamera looking at a 30x30 grid of boxes
3. Uses ONE InstancedMesh with 900 instances (30x30)
4. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
5. MeshBasicMaterial with white color
6. All instances start with color 0x808080
7. Clicking toggles between gray and red
8. Uses Raycaster with normalized device coordinates
9. Flags instance colors for upload after changing
10. Exposes __scene, __camera, __renderer, __mesh, __ready

Let me think about the setup:

- Box size 0.8, spacing 1.0
- Grid is 30x30, so positions go from -14.5 to 14.5 (spacing 1.0, centered)
  - Actually, for 30 items centered at origin with spacing 1.0: positions are -14.5, -13.5, ..., 13.5, 14.5
  - That's (i - 14.5) for i in 0..29
  - Range: -14.5 to 14.5, total span = 29.0
  - With box size 0.8, the grid extends from -14.5 - 0.4 = -14.9 to 14.5 + 0.4 = 14.9

- Camera needs to see the whole grid with margin. Let me use a perspective camera.
  - The grid spans about 29.8 units in both X and Y.
  - With some margin, let's say we need to see about 35 units wide.
  - FOV 45 degrees, let's calculate the distance needed.
  - For FOV = 45°, half-angle = 22.5°, tan(22.5°) ≈ 0.4142
  - To see 17.5 units (half of 35) at distance d: 17.5 / d = tan(22.5°)
  - d = 17.5 / 0.4142 ≈ 42.3
  - Let's use distance 50 to be safe, or maybe 45.

Actually, let me reconsider. The grid is in the XY plane facing the camera (camera looks along -Z or +Z). Let me put the camera at z = 50 looking at origin.

For a perspective camera with FOV 45°:
- Vertical visible range at distance d: 2 * d * tan(FOV/2)
- At d = 50: 2 * 50 * tan(22.5°) = 100 * 0.4142 = 41.4 units
- Half range: 20.7 units
- Grid half-range: 14.9 units
- So 20.7 > 14.9, we have margin. Good.

Let me also check horizontal: aspect ratio depends on window size, but with 41.4 vertical and typical 16:9, horizontal would be ~73.5, which is plenty.

Now for the click handling:
- Get mouse position relative to canvas
- Convert to NDC: x = (x / width) * 2 - 1, y = -(y / height) * 2 + 1
- Use raycaster to find intersection
- If intersection has instanceId, toggle that instance's color
- Set instanceColor.needsUpdate = true

Let me write this out:

```typescript
import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const count = GRID_SIZE * GRID_SIZE;
const mesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);

for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const idx = i * GRID_SIZE + j;
    const x = (j - (GRID_SIZE - 1) / 2) * SPACING;
    const y = (i - (GRID_SIZE - 1) / 2) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, grayColor);
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;
scene.add(mesh);

// Click handling
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh);
  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      const currentColor = new THREE.Color();
      mesh.getColorAt(instanceId, currentColor);
      if (currentColor.getHex() === 0x808080) {
        mesh.setColorAt(instanceId, redColor);
      } else {
        mesh.setColorAt(instanceId, grayColor);
      }
      mesh.instanceColor!.needsUpdate = true;
    }
  }
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Render loop
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to be careful with `tsc --strict`. Let me check:
- `mesh.instanceColor` is nullable in Three.js types. I'm using `!` to assert non-null. That should be fine.
- Actually, let me double check - `instanceColor` is of type `InstancedBufferAttribute | null`. So `mesh.instanceColor!.needsUpdate = true` should work.

Let me also make sure the background click does nothing - the raycaster will simply return no intersections if clicking empty space, so that's handled.

I think this is solid. Let me finalize.
