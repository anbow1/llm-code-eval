The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 instances) using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. MeshBasicMaterial (white) with setColorAt for instance colors (gray 0x808080)
5. Click toggles instance color: gray ↔ red
6. Raycaster with normalized device coordinates from canvas bounding rect
7. Use intersection.instanceId
8. Flag instance colors for upload after changing
9. No animation, no camera movement
10. Expose __scene, __camera, __renderer, __ready, __mesh

Let me calculate the grid:
- 30x30 grid, spacing 1.0, so total size = 29 * 1.0 = 29 units wide/tall (from -14.5 to 14.5)
- Box size 0.8, spacing 1.0 means gaps of 0.2 between boxes
- Centered on origin: positions from -14.5 to 14.5 in X and Y

Camera: Looking straight at the grid (along -Z axis). The grid is in XY plane at Z=0. Camera at some Z position looking at origin.

FOV: Let's use 50 degrees. The grid spans 29 units (from -14.5 to 14.5) plus box size 0.8, so total about 29.8 units. With some margin, let's say 32 units.

For a perspective camera with FOV 50, the vertical extent at distance d is: 2 * d * tan(25°)
We want 2 * d * tan(25°) >= 32
d >= 32 / (2 * tan(25°)) = 32 / (2 * 0.4663) = 32 / 0.9326 ≈ 34.3

Let's use d = 40 for some margin.

Actually, let me think about aspect ratio. The horizontal extent might be wider or narrower. Let's just use a reasonable distance like 40.

For the click handler:
- Get bounding rect of canvas
- Convert click to NDC: x = ((clientX - rect.left) / rect.width) * 2 - 1, y = -((clientY - rect.top) / rect.height) * 2 + 1
- Raycast
- If intersection found, use instanceId
- Toggle color

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// InstancedMesh
const COLS = 30;
const ROWS = 30;
const COUNT = COLS * ROWS;
const BOX_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const defaultColor = new THREE.Color(0x808080);

for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        const x = (col - (COLS - 1) / 2) * SPACING;
        const y = (row - (ROWS - 1) / 2) * SPACING;
        dummy.position.set(x, y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, defaultColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Click handler
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const redColor = new THREE.Color(0xff0000);
const grayColor = new THREE.Color(0x808080);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        const id = intersects[0].instanceId;
        if (id !== undefined && id !== null) {
            // Determine current color
            const color = new THREE.Color();
            mesh.getColorAt(id, color);
            if (color.equals(grayColor)) {
                mesh.setColorAt(id, redColor);
            } else {
                mesh.setColorAt(id, grayColor);
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (firstFrame) {
        (window as any).__ready = true;
        firstFrame = false;
    }
});
```

This looks good. Let me double-check:
- ONE InstancedMesh ✓
- 900 instances (30x30) ✓
- XY plane facing camera ✓
- Box size 0.8, spacing 1.0 ✓
- Centered on origin ✓
- PerspectiveCamera looking straight at grid ✓
- MeshBasicMaterial white ✓
- setColorAt with 0x808080 ✓
- Click toggle gray ↔ red ✓
- Raycaster with NDC from canvas bounding rect ✓
- intersection.instanceId ✓
- Flag colors for upload ✓
- No animation ✓
- Expose all required globals ✓
- setAnimationLoop ✓
- Resize handler ✓

Looks complete and correct.
