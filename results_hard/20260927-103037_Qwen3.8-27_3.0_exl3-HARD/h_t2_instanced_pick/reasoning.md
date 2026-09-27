The user wants a complete TypeScript file that:

1. Creates a 30x30 grid (900 instances) of boxes using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray → red, red → gray
8. Uses Raycaster with NDC from canvas bounding rect, intersection.instanceId
9. Flags instance colors for upload after changing
10. Exposes scene, camera, renderer, mesh on window
11. Sets __ready = true after first frame

Let me think about the setup:

- Grid: 30x30 = 900 instances
- Box size: 0.8, spacing: 1.0
- Grid in XY plane, so boxes are positioned at (x, y, 0) where x and y range from -14.5 to 14.5 (since 30 items with spacing 1.0, centered)
- Positions: for i in 0..29, for j in 0..29: x = (i - 14.5) * 1.0, y = (j - 14.5) * 1.0
- Total grid size: 29 * 1.0 = 29 units in each direction, plus 0.8 box size = 29.8 total
- Camera needs to see the whole grid with margin. Let's use a perspective camera.

For the camera:
- Grid spans from -14.5 to 14.5 in both X and Y (center to edge), so total width/height is 29 + 0.8 = 29.8
- With margin, let's say we want to see about 35 units of height
- FOV: let's use 60 degrees
- At distance d, the visible height is 2 * d * tan(fov/2)
- We need visible height >= 35 (with margin)
- 35 = 2 * d * tan(30°) = 2 * d * 0.577
- d = 35 / (2 * 0.577) ≈ 30.3
- Let's use distance = 35 to be safe
- Camera at (0, 0, 35), looking at origin

Actually let me recalculate. The grid is 30 items with spacing 1.0. The positions go from -(29/2) to +(29/2) = -14.5 to 14.5. The boxes are 0.8 wide, so the total extent is 29 + 0.8 = 29.8 in each direction.

With a margin, let's say we want to see 35 units of height. 
- FOV 60°, tan(30°) ≈ 0.5774
- visible height at distance d = 2 * d * tan(30°)
- 35 = 2 * d * 0.5774
- d = 35 / 1.1547 ≈ 30.3

Let's use d = 35 for a comfortable margin.

For the InstancedMesh:
- Geometry: BoxGeometry(0.8, 0.8, 0.8)
- Material: MeshBasicMaterial({ color: 0xffffff })
- Count: 900
- Set matrices for each instance
- Set colors for each instance to 0x808080

For click handling:
- Get mouse position relative to canvas
- Convert to NDC (-1 to 1)
- Raycaster from camera
- Check intersection with the InstancedMesh
- If intersection has instanceId, toggle that instance's color
- Flag instanceColor.needsUpdate = true

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create InstancedMesh
const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const count = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const matrix = new THREE.Matrix4();
const color = new THREE.Color();

const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);

// Track instance colors
const instanceColors: number[] = new Array(count).fill(0x808080);

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const idx = i * gridSize + j;
        const x = (i - (gridSize - 1) / 2) * spacing;
        const y = (j - (gridSize - 1) / 2) * spacing;
        matrix.makeTranslation(x, y, 0);
        mesh.setMatrixAt(idx, matrix);
        mesh.setColorAt(idx, grayColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

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
            if (instanceColors[instanceId] === 0x808080) {
                instanceColors[instanceId] = 0xff0000;
                mesh.setColorAt(instanceId, redColor);
            } else {
                instanceColors[instanceId] = 0x808080;
                mesh.setColorAt(instanceId, grayColor);
            }
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

Wait, I need to be careful with the `instanceId` type. In Three.js, `intersection.instanceId` is `number | undefined`. With strict mode, I need to handle that.

Also, I should check: `mesh.instanceColor` - in Three.js, after calling `setColorAt`, the `instanceColor` property should be set. But TypeScript might complain about it being possibly null. Let me use a non-null assertion or check.

Actually, `mesh.instanceColor` is typed as `InstancedBufferAttribute | null` in Three.js. So I need to handle the null case.

Let me also make sure the code compiles with `tsc --strict`. The `instanceId` from intersection is `number | undefined`, so I need to check it.

Let me also think about whether I need the `instanceColors` array. I could just read the color from the mesh, but that's more complex. The array approach is simpler and cleaner.

Actually, I realize I should double-check: does `setColorAt` with a `THREE.Color` work correctly? Yes, it sets the RGBA in the instanceColor buffer.

Let me finalize the code.
