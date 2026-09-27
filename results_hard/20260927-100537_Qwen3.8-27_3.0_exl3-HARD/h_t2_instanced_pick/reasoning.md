The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 instances) of boxes using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray -> red, red -> gray
8. Use Raycaster with NDC from canvas bounding rect, use intersection.instanceId
9. Flag instance colors for upload after changing
10. Expose scene, camera, renderer, mesh on window
11. Set __ready = true after first frame rendered
12. No external assets
13. Handle window resize
14. Use renderer.setAnimationLoop

Let me think about the setup:
- 30x30 grid = 900 instances
- Box size 0.8, spacing 1.0
- Grid centered on origin in XY plane
- So positions: x from -14.5 to 14.5 (step 1.0), y from -14.5 to 14.5 (step 1.0)
- Grid spans from -14.5 to 14.5 in both x and y = 29 units total span
- Box is 0.8 wide, so the outermost boxes extend from -14.5-0.4 to 14.5+0.4 = -14.9 to 14.9
- So the grid is about 29.8 units wide/tall

For the camera to see the whole grid with margin:
- Using a perspective camera looking at the origin from the positive Z axis
- If the grid is 29.8 units tall, and we want margin, let's say we want to see about 34 units tall
- With a 45 degree FOV (or maybe 60), the distance needed:
  - For FOV θ, the visible height at distance d is 2*d*tan(θ/2)
  - For 60° FOV: visible height = 2*d*tan(30°) = 2*d*0.577 = 1.155*d
  - We need visible height >= 34, so d >= 34/1.155 ≈ 29.4
  - Let's use d = 35 to have margin

Actually let me recalculate. The grid spans:
- 30 boxes with spacing 1.0
- Positions: (i - 14.5) * 1.0 for i = 0..29, so from -14.5 to 14.5
- Total span: 29.0 units between centers
- With box size 0.8, outermost edges: -14.5 - 0.4 = -14.9 to 14.5 + 0.4 = 14.9
- Total visible span: 29.8 units

With a 60° FOV and aspect ratio (say 16:9), the vertical visible area at distance d is 2*d*tan(30°) ≈ 1.155*d
For the grid to fit with margin (say 20% margin), we need visible height ≈ 29.8 * 1.2 ≈ 35.8
So d ≈ 35.8 / 1.155 ≈ 31

Let me use FOV 60 and distance 35. That gives visible height = 2*35*tan(30°) = 70*0.577 = 40.4 units. That's plenty of margin.

Actually, I should also consider the aspect ratio. If the window is wider than tall, the horizontal FOV is larger, so the vertical constraint is the binding one. If the window is taller than wide, the horizontal constraint might bind. But since we're looking at a square grid, the worst case is when the window is very wide (then vertical is the constraint) or very tall (then horizontal is the constraint).

For safety, let me use a slightly larger distance or a wider FOV. Let me use FOV 50 and distance 40.
- Visible height at d=40: 2*40*tan(25°) = 80*0.466 = 37.3
- Visible width at d=40 with aspect 1: 37.3 (square)
- With aspect 16/9: visible width = 37.3 * 16/9 = 66.3

That should work fine. The grid is 29.8 units, so 37.3 vertical gives about 24% margin. Good.

Let me go with FOV 50, camera at (0, 0, 40).

Now for the click handling:
- Get mouse position relative to canvas
- Convert to NDC: x = (clientX - rect.left) / rect.width * 2 - 1, y = -(clientY - rect.top) / rect.height * 2 + 1
- Raycaster from camera through that point
- Check intersection with the InstancedMesh
- If hit, get instanceId, toggle color

For the animation loop - since there's no animation, I just need to render. But I need to set __ready after the first frame.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Grid setup
const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const totalInstances = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, totalInstances);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Initialize all instances
for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const idx = i * gridSize + j;
    const x = (i - (gridSize - 1) / 2) * spacing;
    const y = (j - (gridSize - 1) / 2) * spacing;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    color.setHex(0x808080);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Click handling
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
      const currentColor = new THREE.Color();
      mesh.getColorAt(instanceId, currentColor);
      
      if (currentColor.getHex() === 0x808080) {
        currentColor.setHex(0xff0000);
      } else {
        currentColor.setHex(0x808080);
      }
      
      mesh.setColorAt(instanceId, currentColor);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
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
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

Wait, I need to be careful with the color comparison. Using `getHex()` might have floating point issues. Let me use a different approach - I'll track which instances are red using a Set or array.

Actually, `Color.getHex()` returns an integer, and `0x808080` is `8388608`. The comparison should work fine since we're setting exact hex values. But to be safe, let me use a Set to track which ones are red.

Actually, let me reconsider. The hex comparison should be fine since we're setting exact values. But let me use a simpler approach with a boolean array or Set.

Let me also make sure the `getColorAt` method exists. In Three.js, `InstancedMesh` has `getColorAt(index, color)` method. Yes, it does.

Let me also double-check: `MeshBasicMaterial` with white color - the instance colors will multiply with the material color. Since white is (1,1,1), the instance colors will show through exactly. Good.

One thing: I should make sure the box is facing the camera. Since the camera is at (0,0,40) looking at origin, and the boxes are in the XY plane at z=0, the front face of the box (positive Z face) faces the camera. The BoxGeometry has faces in all directions, so this works fine.

Let me also consider: the z-size of the box is 0.8, so it extends from z=-0.4 to z=0.4. The camera is at z=40, so this is fine.

I think the code is correct. Let me finalize it.
