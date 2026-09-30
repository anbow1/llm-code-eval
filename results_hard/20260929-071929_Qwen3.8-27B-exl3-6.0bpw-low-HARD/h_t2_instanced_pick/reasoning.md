Let me break down the requirements:

1. 30x30 grid of boxes (900 instances) using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show exactly
7. Clicking toggles color: gray → red, red → gray
8. Use Raycaster with NDC from canvas bounding rect, use intersection.instanceId
9. Flag instance colors for upload after changing
10. Expose scene, camera, renderer, mesh, and __ready flag

Let me think about the camera distance. The grid is 30x30 with spacing 1.0, so it spans from -14.5 to 14.5 in both X and Y (since centered, positions are -14.5, -13.5, ..., 13.5, 14.5). The grid width/height is 29 units (from center of first to center of last) plus the box size 0.8, so total extent is about 29.8 units.

For a perspective camera to see the whole grid with margin, I need to calculate the distance. Let's say the grid spans about 30 units in both X and Y. With a FOV of, say, 45 degrees, the half-height visible at distance d is d * tan(FOV/2). I need d * tan(FOV/2) >= 15 + margin. Let's use FOV 45, so tan(22.5°) ≈ 0.4142. So d >= 15 / 0.4142 ≈ 36. Let's add some margin, so d = 40 should work. Actually let me be more precise.

The grid positions: for i in 0..29, position = (i - 14.5) * 1.0 = i - 14.5. So positions range from -14.5 to 14.5. The box size is 0.8, so the grid extends from -14.5 - 0.4 = -14.9 to 14.5 + 0.4 = 14.9. Total extent is 29.8.

With FOV 45° (vertical), at distance d, the visible half-height is d * tan(22.5°) = d * 0.4142. I need this to be at least 14.9 + some margin. Let's say margin of 2 units, so I need d * 0.4142 >= 16.9, so d >= 40.8. Let's use d = 45 to be safe.

Actually, I also need to consider the aspect ratio. The vertical FOV is what's fixed, and the horizontal depends on aspect. For a typical widescreen, the horizontal will be wider, so vertical is the constraint. Let me use distance 45 and FOV 45.

Wait, let me reconsider. At distance 45 with FOV 45:
- Half-height visible = 45 * tan(22.5°) = 45 * 0.4142 = 18.64
- Grid half-height = 14.9
- Margin = 18.64 - 14.9 = 3.74 units. That's good.

For the click handling:
- Get mouse position relative to canvas
- Convert to NDC: x = (clientX - rect.left) / rect.width * 2 - 1, y = -(（clientY - rect.top) / rect.height * 2 - 1)
- Raycast against the mesh
- If intersection has instanceId, toggle color

For tracking colors, I'll keep an array of booleans or just read the current color and toggle.

Actually, I'll keep a simple array of whether each instance is "red" or not. When clicked, toggle and set the color accordingly.

Let me also make sure I handle the `instanceColor` properly. When using `setColorAt`, Three.js creates the `instanceColor` attribute. I need to set `instanceColor.needsUpdate = true` after modifying.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 45);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const count = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);
const isRed = new Array<boolean>(count).fill(false);

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const idx = i * gridSize + j;
        const x = (i - (gridSize - 1) / 2) * spacing;
        const y = (j - (gridSize - 1) / 2) * spacing;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, grayColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

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
            isRed[instanceId] = !isRed[instanceId];
            mesh.setColorAt(instanceId, isRed[instanceId] ? redColor : grayColor);
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

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

This looks good. Let me double-check:
- No other meshes ✓
- InstancedMesh with 900 instances ✓
- Box size 0.8, spacing 1.0 ✓
- Grid in XY plane ✓
- Centered on origin ✓
- PerspectiveCamera looking straight at grid ✓
- No camera movement, no animation ✓
- Starts with 0x808080 ✓
- MeshBasicMaterial white ✓
- Click toggles color ✓
- Raycaster with NDC from bounding rect ✓
- Uses intersection.instanceId ✓
- Flags instance colors for upload ✓
- Exposes all required variables ✓
- No external assets ✓
- Uses setAnimationLoop ✓
- Handles resize ✓

I think this is complete and correct.
