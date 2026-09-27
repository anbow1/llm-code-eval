The user wants a complete TypeScript file that:
1. Creates a 30x30 grid (900 instances) of boxes using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray -> red, red -> gray
8. Uses Raycaster with NDC from canvas bounding rect, intersection.instanceId
9. Flags instance colors for upload after changing
10. Exposes __scene, __camera, __renderer, __mesh, __ready
11. No external assets
12. Uses renderer.setAnimationLoop
13. Handles window resize
14. Must compile with tsc --strict

Let me plan the layout:
- 30x30 grid, spacing 1.0, box size 0.8
- Grid spans from -14.5 to +14.5 in both X and Y (30 cells * 1.0 spacing, centered)
- Actually: 30 cells with spacing 1.0. The positions would be at (i - 14.5) * 1.0 for i in 0..29, giving range -14.5 to +14.5
- So the grid is 29 units wide (from -14.5 to 14.5)
- Box size 0.8, so the total visible extent is about 29 + 0.8 = 29.8 units
- Camera needs to see all of this with margin

For the camera:
- Looking at origin from Z axis (grid is in XY plane)
- Let's say camera at z = 40, with FOV 60 degrees
- At z=40, the visible height = 2 * 40 * tan(30°) = 2 * 40 * 0.577 = 46.2 units
- The grid is about 29.8 units tall, so with margin that's fine
- Actually let me use a slightly smaller FOV or further camera. Let's use z=35, FOV=50
- Visible height at z=35: 2 * 35 * tan(25°) = 2 * 35 * 0.466 = 32.6 units
- Grid is ~29.8 units, so margin is about 1.4 units on each side. That's decent.
- Or let's use z=40, FOV=50: visible height = 2 * 40 * tan(25°) = 2 * 40 * 0.466 = 37.3 units. Good margin.

Let me use z=40, FOV=50.

For the raycaster:
- Get mouse position relative to canvas bounding rect
- Convert to NDC: x = ((clientX - rect.left) / rect.width) * 2 - 1, y = -((clientY - rect.top) / rect.height) * 2 + 1
- Raycaster from camera
- Check intersection with the InstancedMesh
- If intersection exists and has instanceId, toggle that instance's color

For the instance colors:
- Store an array of booleans or just read the current color and toggle
- Actually, I'll maintain a boolean array of 900 entries
- gray = 0x808080, red = 0xff0000

Let me write the code:

```typescript
import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Create InstancedMesh
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);

const colorStates: boolean[] = new Array(GRID_SIZE * GRID_SIZE).fill(false); // false = gray, true = red

const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const idx = row * GRID_SIZE + col;
    const x = (col - (GRID_SIZE - 1) / 2) * SPACING;
    const y = (row - (GRID_SIZE - 1) / 2) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    color.copy(GRAY);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersections = raycaster.intersectObject(mesh);

  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      colorStates[instanceId] = !colorStates[instanceId];
      color.copy(colorStates[instanceId] ? RED : GRAY);
      mesh.setColorAt(instanceId, color);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
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
(window as any).__mesh = mesh;

let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The event listener parameter is typed as MouseEvent
- The `instanceId` could be `number | undefined` in newer Three.js types

Let me also make sure I'm not using any external assets. The background color is fine.

One issue: in strict mode, `intersections[0].instanceId` - in Three.js types, `instanceId` is `number | undefined`. I handle that with the check.

Let me also consider: the problem says "no animation" but I still need the render loop via setAnimationLoop. That's fine - the loop just renders the same scene each frame without any changes.

Let me also make sure the `dummy.matrix` is properly set. Actually, I should use `dummy.updateMatrix()` after setting position, which I do.

I think this is solid. Let me finalize.
