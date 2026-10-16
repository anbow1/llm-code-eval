The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 instances) of boxes using ONE InstancedMesh
2. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray ↔ red
8. Uses Raycaster with NDC from canvas bounding rect
9. After changing colors, flag instance colors for upload (instanceColor.needsUpdate = true)
10. Expose __scene, __camera, __renderer, __mesh, __ready
11. No external assets
12. Use setAnimationLoop
13. Handle resize
14. tsc --strict compatible

Let me think about the layout:
- 30x30 grid, spacing 1.0, box size 0.8
- Centered on origin: positions range from -14.5 to 14.5 (since 30/2 = 15, indices 0..29, offset by 14.5)
- Actually: positions from -14.5 to 14.5 with step 1.0. That's 30 positions.
- Grid is in XY plane, so boxes are at (x, y, 0) with z=0
- Camera looks at origin from +z direction

Camera setup:
- Grid spans from -14.5 to 14.5 in both x and y (19 units total width/height)
- Need margin, so let's say the camera should see at least 20x20 area
- For a perspective camera, I need to figure out the distance. If FOV is 45 degrees, and I want to see a 20-unit wide area:
  - At distance d, the visible width = 2 * d * tan(fov/2)
  - 20 = 2 * d * tan(22.5°) = 2 * d * 0.4142
  - d = 20 / 0.8284 ≈ 24.15
  - Let's use d = 25 for good margin
  - Or maybe use a wider FOV. Let's use FOV 50, distance 25
  - Visible width = 2 * 25 * tan(25°) = 50 * 0.4663 = 23.3 - that gives about 1.5 units margin on each side
  - Actually let me use FOV 45, distance 25: visible width = 2*25*tan(22.5) = 50*0.4142 = 20.7 - good margin

Let me use:
- FOV: 45
- Position: (0, 0, 25)
- Looking at (0, 0, 0)

Box geometry: BoxGeometry(0.8, 0.8, 0.8)

For the InstancedMesh:
- 900 instances
- Set each instance's matrix (position in XY plane)
- Set each instance's color to 0x808080

For clicking:
- Raycaster with NDC from canvas bounding rect
- Check intersection.instanceId
- Toggle color
- Set instanceColor.needsUpdate = true

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the InstancedMesh
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(boxGeometry, material, 900);

const dummy = new THREE.Object3D();
const color = new THREE.Color(0x808080);

for (let i = 0; i < 30; i++) {
    for (let j = 0; j < 30; j++) {
        const idx = i * 30 + j;
        const x = (j - 14.5) * 1.0;
        const y = (i - 14.5) * 1.0;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, color);
    }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Click handling
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId!;
        const currentColor = new THREE.Color();
        mesh.getColorAt(instanceId, currentColor);
        if (currentColor.getHex() === 0x808080) {
            mesh.setColorAt(instanceId, new THREE.Color(0xff0000));
        } else {
            mesh.setColorAt(instanceId, new THREE.Color(0x808080));
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

// Animation loop
let ready = false;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- `mesh.instanceColor` is `BufferAttribute | null` - I need to handle the null case
- `intersects[0].instanceId` is `number | undefined` - I need to handle
- The `dummy` Object3D approach is fine

Actually, for `instanceColor`, in Three.js it's typed as `InstancedBufferAttribute | null`. I should use non-null assertion or check.

Let me also make sure the `getHex()` comparison works. Actually, `getHex()` returns a number. 0x808080 is 8388608. Let me just compare hex values.

Wait, actually `getColorAt` fills a Color, and `getHex()` returns the hex as a number. So comparing with 0x808080 should work.

Let me also think about whether I need `renderer.domElement` to be in the event listener - yes, that's fine.

One issue: with `tsc --strict`, I need to be careful about:
- `mesh.instanceColor` could be null → use `!` or check
- `intersects[0].instanceId` could be undefined → use `!` or check
- The `dummy` variable is typed correctly

Let me finalize the code. I think it's solid. Let me write it out cleanly.
