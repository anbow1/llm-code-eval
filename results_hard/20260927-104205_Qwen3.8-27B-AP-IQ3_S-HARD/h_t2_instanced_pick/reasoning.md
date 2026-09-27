The user wants a complete TypeScript file that:
1. Renders a 30x30 grid (900 boxes) using ONE InstancedMesh
2. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking an instance toggles gray to red, red to gray
8. Use Raycaster with NDC from canvas bounding rect, use intersection.instanceId
9. Flag instance colors for upload after changing
10. Expose __scene, __camera, __renderer, __mesh, __ready

Let me think about the layout:
- 30x30 grid, spacing 1.0, so the grid spans from -14.5 to 14.5 (for indices 0-29, centered at origin)
- Actually, for 30 items centered: positions would be -14.5, -13.5, ..., 13.5, 14.5
- That's (i - 14.5) for i in 0..29, which gives -14.5 to 14.5
- Box size 0.8, spacing 1.0, so gaps of 0.2 between boxes
- Camera needs to see the whole grid with margin

Camera:
- Looking at the grid from the Z axis (positive Z looking toward negative Z, or negative Z looking toward positive Z)
- Grid is in XY plane, so camera should be at some positive Z looking at origin
- Grid spans about 29 units (from -14.5 to 14.5, that's 29 units wide) plus the box size 0.8, so about 30 units
- With margin, let's say the camera needs to see about 34 units of height
- Using perspective projection: if camera is at z = d, and fov is say 60 degrees (half angle 30 degrees)
- Visible height at distance d: 2 * d * tan(fov/2)
- For 60 degree fov: 2 * d * tan(30°) = 2 * d * 0.577 = 1.155 * d
- We need 1.155 * d >= 34, so d >= 29.4
- Let's use z = 35 for a nice margin
- Actually let me recalculate. The grid is 30 boxes with spacing 1.0. The outermost boxes are at ±14.5 from center, and the box half-size is 0.4. So the total extent is ±14.9. Total width/height = 29.8. With margin, say we want to see 34 units.
- With fov 60: 2 * d * tan(30°) = 2 * d * 0.5774 = 1.1547 * d >= 34 → d >= 29.4
- Let's use z = 35 to be safe.

Wait, the camera aspect ratio matters too. Since the grid is square (30x30), and the window might not be square, I need to make sure the whole grid is visible. Let me use a fov that accounts for both dimensions.

Actually, let me think more carefully. The grid is 29.8 units in both X and Y. The window has aspect ratio = width/height. If aspect > 1, the horizontal field is wider, so the vertical constraint is binding. If aspect < 1, the horizontal constraint is binding.

To be safe, I'll compute the camera distance such that the grid fits. Let me just pick a reasonable distance like 40 and use a 50-degree fov. That gives visible height = 2 * 40 * tan(25°) = 80 * 0.466 = 37.3. And for width, if aspect = 16/9 ≈ 1.78, visible width = 37.3 * 1.78 = 66.4. So 29.8 fits easily in both dimensions. z = 40 should work fine.

Actually let me just use z = 35 and fov = 50. Visible height = 2 * 35 * tan(25°) = 70 * 0.4663 = 32.6. That's cutting it close for 29.8. Let me use z = 40.

Visible height at z=40, fov=50: 2 * 40 * tan(25°) = 80 * 0.4663 = 37.3. Good, 29.8 fits with margin.

For the raycaster click handling:
- Get mouse position relative to canvas
- Convert to NDC: x = (clientX - rect.left) / rect.width * 2 - 1, y = -( (clientY - rect.top) / rect.height * 2 - 1)
- Raycaster.setFromCamera(ndc, camera)
- intersectObjects([mesh]) or intersectObject(mesh)
- If hit, get instanceId
- Get current color, toggle between 0x808080 and 0xff0000
- Set new color via setColorAt
- Flag instanceColor.needsUpdate = true

Let me also make sure I handle the "no animation" requirement. I'll use setAnimationLoop but just render without any time-based motion. Actually the requirement says "No camera movement, no animation" but the hard rules say "Motion must use delta/elapsed time, not frame counts." Since there's no motion, I'll just render. But I still need to use setAnimationLoop.

Let me also make sure I set __ready after the first frame. I can use a flag.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create instanced mesh
const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(boxGeometry, material, gridSize * gridSize);

const dummy = new THREE.Object3D();
const color = new THREE.Color(0x808080);
const half = (gridSize - 1) / 2; // 14.5

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const idx = i * gridSize + j;
    dummy.position.set(
      (i - half) * spacing,
      (j - half) * spacing,
      0
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, color);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Click handling
const raycaster = new THREE.Raycaster();
const mouseNdc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouseNdc, camera);
  const hits = raycaster.intersectObject(mesh);
  
  if (hits.length > 0) {
    const instanceId = hits[0].instanceId;
    if (instanceId !== undefined) {
      const currentColor = new THREE.Color();
      mesh.getColorAt(instanceId, currentColor);
      
      if (currentColor.getHex() === 0xff0000) {
        mesh.setColorAt(instanceId, new THREE.Color(0x808080));
      } else {
        mesh.setColorAt(instanceId, new THREE.Color(0xff0000));
      }
      
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

Wait, I need to double-check: the hard rules say "Motion must use delta/elapsed time, not frame counts." Since there's no motion here, this is fine. The setAnimationLoop just renders.

Let me also verify: "no other meshes at all" - I only have the one InstancedMesh. Good.

"MeshBasicMaterial (white)" - yes, color 0xffffff. This means the instance colors will show exactly as set.

Let me also make sure the `getColorAt` method exists in Three.js. Yes, InstancedMesh has `getColorAt(index, target)` and `setColorAt(index, color)`.

One concern: `mesh.instanceColor` might be null if no colors have been set. But since I'm calling `setColorAt` in the loop, it should be created. Let me add a null check to be safe, or just use optional chaining.

Actually in TypeScript strict mode, I need to be careful. `mesh.instanceColor` is typed as `InstancedBufferAttribute | null`. So I should check for null.

Let me also make sure `hits[0].instanceId` - in Three.js, intersection objects from InstancedMesh have `instanceId?: number`. In strict mode, I need to handle the case where it might be undefined.

I think the code looks good. Let me finalize it.
