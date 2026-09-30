The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 instances) of boxes using ONE InstancedMesh
2. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking at the grid with margin
4. MeshBasicMaterial (white) with instance colors starting at 0x808080
5. Click to toggle: gray (0x808080) ↔ red (0xff0000)
6. Raycaster with NDC from canvas bounding rect, use instanceId
7. Flag instance colors for upload (instanceColor.needsUpdate = true)
8. Expose mesh as (window as any).__mesh = mesh
9. No other meshes, no animation, no camera movement
10. Handle resize
11. Expose scene, camera, renderer, __ready

Let me calculate the grid:
- 30x30 grid, spacing 1.0, centered on origin
- Positions range from -14.5 to 14.5 in both X and Y
- Total span: 29 units in each direction
- Box size 0.8, so with spacing 1.0 there are 0.2 gaps

Camera:
- Need to see the full grid (29 units wide) with some margin
- Let's use a perspective camera with fov=50 or so
- Position it along Z axis looking at origin
- For a 29-unit wide view at distance d with fov f: half_width = d * tan(fov/2)
- If fov=50, tan(25°) ≈ 0.466, need half_width ≈ 16 (29/2 + margin)
- d = 16 / 0.466 ≈ 34.3
- Let's use fov=50, z=35 or so. Or fov=60, tan(30°)=0.577, d = 16/0.577 ≈ 27.7, use z=30.

Let me use fov=50, z=40 to have comfortable margin.

For the raycaster:
- On click, compute NDC from event coordinates relative to canvas bounding rect
- Cast ray, get intersection, check instanceId
- Get current color, toggle between gray and red

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

const SIZE = 30;
const COUNT = SIZE * SIZE;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const dummy = new THREE.Object3D();
const offset = (SIZE - 1) / 2;

for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
        const idx = i * SIZE + j;
        dummy.position.set(j - offset, i - offset, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, gray);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Raycaster for click handling
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
            const color = new THREE.Color();
            mesh.getColorAt(instanceId, color);
            
            if (color.r === red.r && color.g === red.g && color.b === red.b) {
                mesh.setColorAt(instanceId, gray);
            } else {
                mesh.setColorAt(instanceId, red);
            }
            
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
    }
});

// Resize handler
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

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, comparing colors with exact equality might be tricky due to floating point. Let me use a threshold comparison or just check if r > 0.5 (red channel) since gray has r=0.50196 and red has r=1.0. Actually, let me check more carefully:
- Gray: 0x808080 → r=128/255 ≈ 0.50196, g=0.50196, b=0.50196
- Red: 0xff0000 → r=1.0, g=0.0, b=0.0

So I can check if r > 0.75 (red) or not (gray). That's safer than exact comparison.

Actually, since we're setting exact values from THREE.Color constructors, the values should be exactly representable. But to be safe, let me use a comparison like color.r > 0.75.

Let me finalize the code.
