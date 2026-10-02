The user wants a complete TypeScript file that:
1. Renders a 30x30 grid of boxes (900 instances) using ONE InstancedMesh
2. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white)
7. Clicking an instance toggles its color: gray <-> red
8. Use THREE.Raycaster with NDC from canvas bounding rect, intersection.instanceId
9. Flag instance colors for upload after changing (instanceColor.needsUpdate = true)
10. Expose: __scene, __camera, __renderer, __mesh, __ready
11. No external assets
12. Must compile with tsc --strict
13. Use renderer.setAnimationLoop
14. Size renderer from window.innerWidth/innerHeight, handle resize

Let me think about the camera position:
- 30x30 grid, spacing 1.0, centered on origin
- Grid extends from -14.5 to 14.5 in both X and Y (positions are -14, -13, ..., 0, ..., 13, 14)
- Actually, 30 items with spacing 1.0: indices 0..29, centered means positions go from -14.5 to +14.5 (step 1.0)
- So the grid spans 29 units in each direction, plus box size 0.8, so total extent is about 29.8 units
- Camera needs to be looking straight at the grid (along Z axis, looking at origin)
- Camera at z = some distance, looking at origin

For the camera to see the whole grid with margin:
- Grid half-extent in XY: ~15 units
- With perspective camera, we need to calculate FOV or position
- Let's use FOV 45 degrees, position camera at z = 40 or so
- At distance d with FOV f, visible height = 2 * d * tan(f/2)
- For 45 deg: visible height = 2 * d * tan(22.5°) ≈ 2 * d * 0.4142 ≈ 0.828 * d
- Need visible height > 30 + margin (say 35)
- d > 35 / 0.828 ≈ 42
- Let's use d = 50 to be safe

Actually let me reconsider. 30 items, spacing 1.0, centered:
- positions: for i in 0..29, pos = (i - 14.5) * 1.0 = -14.5, -13.5, ..., 0, ..., 13.5, 14.5
- So grid spans from -14.5 to 14.5, total 29 units
- With box size 0.8, the outer edges are at ±14.9
- Let's say we need to see about 32 units (with margin)

Camera at z=50, FOV=45: visible height = 2*50*tan(22.5°) ≈ 2*50*0.4142 = 41.4 units. That's plenty.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// InstancedMesh
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
if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Track colors
const colors: number[] = new Array(count).fill(0x808080);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const id = intersects[0].instanceId;
        const newColor = colors[id] === 0x808080 ? 0xff0000 : 0x808080;
        colors[id] = newColor;
        mesh.setColorAt(id, new THREE.Color(newColor));
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
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
- `intersects[0].instanceId` - this is `number | undefined`, so I need to handle it
- `mesh.instanceColor` is `BufferAttribute | null`, so I need to check
- The `event` parameter in the click handler is properly typed

Actually, looking at the Three.js types more carefully:
- `intersection.instanceId` is typed as `number | undefined`
- So `intersects[0].instanceId !== undefined` is the right check

Let me also make sure I'm not using any features that would break strict mode. The code looks fine.

One thing: the requirement says "No camera movement, no animation." I'm using setAnimationLoop which is required by the rules, but there's no actual animation happening - just rendering the same scene each frame. That should be fine.

Let me also double-check: "Use MeshBasicMaterial (white) so the instance colors show exactly." - MeshBasicMaterial with white color means the instance colors are multiplied by white, so they show as-is. Correct.

"Grid in the XY plane facing the camera" - boxes are in the XY plane, camera looks along -Z at origin. The boxes are at z=0. Correct.

I think the code is good. Let me finalize it.
