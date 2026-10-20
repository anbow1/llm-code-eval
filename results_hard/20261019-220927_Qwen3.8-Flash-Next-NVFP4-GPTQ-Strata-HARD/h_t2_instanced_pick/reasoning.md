The user wants a single TypeScript file that:
1. Creates a WebGLRenderer and appends to document.body
2. Creates a PerspectiveCamera looking at a 30x30 grid of boxes in XY plane
3. Uses ONE InstancedMesh with 900 instances of a box (size 0.8, spacing 1.0, centered at origin)
4. MeshBasicMaterial with white color so instance colors show exactly
5. Every instance starts with color 0x808080 via setColorAt
6. Clicking an instance toggles gray(0x808080) ↔ red(0xff0000)
7. Clicking background does nothing
8. Uses Raycaster with NDC from canvas bounding rect, uses intersection.instanceId
9. Flags instance colors for upload after changing
10. Exposes mesh, scene, camera, renderer on window
11. Handles window resize
12. No animation (static camera)
13. __ready = true after first frame

Let me think about the grid:
- 30x30 grid in XY plane
- Box size 0.8, spacing 1.0
- Centered on origin
- So positions range from -14.5 to +14.5 in both X and Y (since (30-1)/2 = 14.5)

Camera: PerspectiveCamera looking at the grid from Z axis. Need to ensure whole grid is visible with margin.
- Grid spans from -14.5 to +14.5, so about 29 units wide/tall (plus box size 0.8, so ~29.8)
- With margin, let's say we need to see about 32 units.
- For a 45-degree FOV, the half-angle is 22.5 degrees. tan(22.5°) ≈ 0.4142
- We need: distance * tan(fov/2) >= 16 (half of 32)
- distance >= 16 / 0.4142 ≈ 38.6
- Let's use FOV 60 and distance 30: tan(30°) = 0.577, 30*0.577 = 17.3 > 16 ✓
- Or FOV 50, distance 35: tan(25°) = 0.466, 35*0.466 = 16.3 > 16 ✓
- Let's use FOV 50, distance 40 for good margin.

Actually let me recalculate. The grid is 30 boxes with spacing 1.0. The centers go from index 0 to 29. Centered means:
- x = (i - 14.5) for i in 0..29
- Range: -14.5 to 14.5
- Plus box size 0.8, so -14.9 to 14.9
- Total width: 29.8

With margin, let's target ~35 units visible. 
- FOV 60, aspect varies. For vertical: tan(30°) = 0.577
- distance * 0.577 >= 17.5 → distance >= 30.3
- Let's use distance 40 for safe margin.

No camera movement, no animation. But we need setAnimationLoop for rendering. We can render once and stop, or just render in the loop without moving anything. Actually the requirement says "Use renderer.setAnimationLoop for the render loop" - so we need the loop but no motion.

For the click handler:
- Listen for 'click' on the canvas (or document)
- Compute NDC from canvas bounding rect
- Raycast against the InstancedMesh
- If intersection found and has instanceId, toggle color

For setColorAt and instanceColor.needsUpdate:
- After setColorAt, we need to set mesh.instanceColor!.needsUpdate = true

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const GRID = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = GRID * GRID;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const color = new THREE.Color(0x808080);

let idx = 0;
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = (col - (GRID - 1) / 2) * SPACING;
    const y = (row - (GRID - 1) / 2) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, color);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Click handling
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);
  
  if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
    const id = intersects[0].instanceId;
    const existingColor = new THREE.Color();
    mesh.getColorAt(id, existingColor);
    
    if (existingColor.getHex() === GRAY.getHex()) {
      mesh.setColorAt(id, RED);
    } else {
      mesh.setColorAt(id, GRAY);
    }
    mesh.instanceColor!.needsUpdate = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, I need to be careful with `mesh.instanceColor!.needsUpdate` - in strict TypeScript, this should work since setColorAt creates the instanceColor attribute. But let me make sure the types are correct.

Also, checking color equality: `existingColor.getHex() === GRAY.getHex()` - this might have floating point issues. Since we're setting exact colors (0x808080 and 0xff0000), and MeshBasicMaterial is white (0xffffff), the instance color is multiplied directly. The stored color should be exact since we set it directly. Let me use `.equals()` instead for safety.

Actually, `getHex()` returns an integer, so comparing integers should be fine. But `equals()` is safer for color comparison. Let me use `.equals()`.

Let me also make sure the `body` has no margin by default - actually the renderer canvas is appended to body, and by default body has margin. Let me set body margin to 0. Actually the instructions say "The page has no other HTML" so I should handle it. Let me add a style.

Actually, I'll just set `document.body.style.margin = '0'` and `document.body.style.overflow = 'hidden'`.

Let me finalize the code.
