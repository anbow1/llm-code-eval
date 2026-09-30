The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 boxes) using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray ↔ red
8. Uses Raycaster with NDC from canvas bounding rect, intersection.instanceId
9. Flags instance colors for upload after changing
10. Exposes __scene, __camera, __renderer, __mesh, __ready

Let me think about the layout:
- 30x30 grid = 900 instances
- Box size 0.8, spacing 1.0
- Grid in XY plane (so z=0 for all boxes)
- Centered on origin: positions from -14.5 to +14.5 (since 30 items with spacing 1.0, the offset is (i - 14.5) * 1.0)

Wait, let me recalculate. 30 items, spacing 1.0. The positions would be:
- index 0 to 29
- offset = (i - 14.5) * 1.0
- So range is -14.5 to +14.5

The grid spans from -14.5 - 0.4 to 14.5 + 0.4 in both X and Y (since box size is 0.8, half is 0.4).
Total span: 29 * 1.0 + 0.8 = 29.8, so from -14.9 to +14.9.

Camera needs to see the whole grid with margin. Let's put camera at z = some distance looking at origin.

For a perspective camera with FOV 60 degrees (or whatever), I need to calculate the distance. Let's use FOV 50 degrees. The half-height of the grid is about 14.9. With some margin, let's say we want to see about 16 units half-height.

tan(fov/2) = halfHeight / distance
distance = halfHeight / tan(fov/2)

With fov = 50 deg, tan(25 deg) ≈ 0.4663
distance = 16 / 0.4663 ≈ 34.3

Let's use fov = 50, camera at z = 35. That should give enough margin.

Actually, let me be more careful. The grid extends from -14.5 to 14.5 in both X and Y (center of boxes). The boxes are 0.8 wide, so the edges go from -14.9 to 14.9.

With FOV 50 degrees (vertical), the visible half-height at distance d is d * tan(25°).
For the grid to be visible with margin, I want d * tan(25°) > 14.9 + margin.
Let's say margin of 2 units: d * tan(25°) > 16.9
d > 16.9 / 0.4663 ≈ 36.2

Let's use camera at z = 40 to be safe.

Now for the code:

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
const count = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

let index = 0;
for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
        const x = (col - (gridSize - 1) / 2) * spacing;
        const y = (row - (gridSize - 1) / 2) * spacing;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        color.setHex(0x808080);
        mesh.setColorAt(index, color);
        index++;
    }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Raycaster
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
                color.setHex(0xff0000);
            } else {
                color.setHex(0x808080);
            }
            mesh.setColorAt(instanceId, color);
            mesh.instanceColor!.needsUpdate = true;
        }
    }
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, I need to make sure `mesh.instanceColor` is not null. After calling `setColorAt`, it should be created. But TypeScript strict mode might complain. Let me use a non-null assertion or check.

Actually, `setColorAt` creates the `instanceColor` buffer attribute if it doesn't exist. So after the loop, `mesh.instanceColor` should be defined. But TypeScript might still see it as `InstancedBufferAttribute | null`. I'll use `!` for strict mode.

Let me also make sure the `getColorAt` method exists - yes, it does in Three.js.

Let me also double-check: the problem says "No camera movement, no animation." So the render loop just renders without any updates. That's fine - we still need the loop for the initial render and for the __ready flag.

Let me also think about whether I need to handle the case where `instanceColor` might be null in the click handler. After the initial setup with `setColorAt` in the loop, it should be non-null. I'll use `!` to satisfy TypeScript.

One more thing: the problem says "MeshBasicMaterial (white)" - this means the material color is white (0xffffff), which means the instance colors will show through exactly as set. Good.

Let me finalize the code.
