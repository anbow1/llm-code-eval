The user wants a single TypeScript file that:
1. Creates a 30x30 grid of boxes (900 instances) using a single InstancedMesh
2. Grid is in XY plane, facing camera, centered at origin
3. Box size 0.8, spacing 1.0 (gaps visible)
4. PerspectiveCamera looking straight at the grid, whole grid visible with margin
5. No camera movement, no animation
6. All instances start with color 0x808080 via setColorAt
7. MeshBasicMaterial (white) so instance colors show exactly
8. Clicking an instance toggles color between gray and red
9. Use Raycaster with NDC from canvas bounding rect, use instanceId
10. Flag instanceColor.needsUpdate after changing
11. Expose __mesh, __scene, __camera, __renderer, __ready

Let me think about the camera positioning:
- Grid is 30x30 with spacing 1.0, centered at origin
- Grid extends from -14.5 to +14.5 in both X and Y
- For the camera to see the whole grid with margin, I need to figure out the FOV and distance
- With a 60 degree FOV, half-height visible = distance * tan(30°)
- I need half-height >= 15 (to cover -14.5 to 14.5 with some margin)
- So distance >= 15 / tan(30°) ≈ 26
- Let's use a camera distance of about 30 to have nice margin

For the grid:
- 30 columns, 30 rows
- Index i goes from 0 to 899
- col = i % 30, row = Math.floor(i / 30)
- x = (col - 14.5) * 1.0, y = (row - 14.5) * 1.0
- z = 0

For the raycaster:
- Need to handle click events
- Convert mouse position to NDC using canvas bounding rect
- Intersect with the InstancedMesh
- Use intersection.instanceId to get which instance was hit
- Toggle its color between 0x808080 and 0xff0000

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// InstancedMesh setup
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const count = 30 * 30;
const mesh = new THREE.InstancedMesh(geometry, material, count);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let i = 0; i < count; i++) {
    const col = i % 30;
    const row = Math.floor(i / 30);
    const x = (col - 14.5) * 1.0;
    const y = (row - 14.5) * 1.0;
    
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    
    color.setHex(0x808080);
    mesh.setColorAt(i, color);
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Raycaster for clicking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
            mesh.getColorAt(instanceId, color);
            if (color.r > 0.5) {
                color.setHex(0x808080);
            } else {
                color.setHex(0xff0000);
            }
            mesh.setColorAt(instanceId, color);
            mesh.instanceColor!.needsUpdate = true;
        }
    }
});

// Resize handler
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
        (window as any).__ready = true;
        ready = true;
    }
});
```

Wait, I need to be careful about the `instanceColor` type. In newer Three.js, `instanceColor` is typed as `THREE.InstancedBufferAttribute | null`. So I need to handle the null case or use non-null assertion. Let me use `mesh.instanceColor!.needsUpdate = true;` but since we call `setColorAt` which creates the instanceColor buffer, it should exist after that.

Actually, for strict TypeScript, `instanceColor` might be typed as `InstancedBufferAttribute | null`. After calling `setColorAt`, it's guaranteed to exist. Using `!` assertion should be fine.

Let me also think about whether `MeshBasicMaterial` with white color and instance colors will work correctly. Yes - MeshBasicMaterial doesn't have lighting, and the instance color multiplies with the material color. Since material color is white (1,1,1), the final color will be exactly the instance color. That's correct.

One issue: the box geometry has depth (0.8 in Z). The camera is at z=30 looking at the grid at z=0. The boxes extend from z=-0.4 to z=0.4. That's fine, they'll be visible as squares from the front.

Actually wait - with MeshBasicMaterial, the boxes will look flat since there's no lighting/shading. But they'll still be visible as colored squares. The front face will be the visible one. That should be fine for the requirements.

Let me also make sure the click detection works with boxes that have depth. The raycaster should intersect the front face of the boxes fine.

I think this is complete. Let me finalize the code.
