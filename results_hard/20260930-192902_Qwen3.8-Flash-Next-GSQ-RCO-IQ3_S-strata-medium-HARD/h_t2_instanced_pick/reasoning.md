The user wants a single TypeScript file that:

1. Creates a 30x30 grid (900) of boxes using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at grid, whole grid visible with margin, no camera movement, no animation
4. Every instance starts with color 0x808080 via setColorAt, MeshBasicMaterial white so instance colors show exactly
5. Clicking toggles color: gray → red, red → gray, each independently
6. Clicking background does nothing
7. Raycaster with NDC from canvas bounding rect, use intersection.instanceId
8. Flag instance colors for upload after changing
9. Expose __scene, __camera, __renderer, __ready, __mesh

Let me think about the grid centering:
- 30 boxes with spacing 1.0 means positions from -14.5 to 14.5 (since (30-1)/2 = 14.5)
- Box size 0.8, so boxes are 0.8 wide with 0.2 gap between them

Camera: The grid spans from about -14.9 to 14.9 in both X and Y. With a perspective camera looking at the center, I need to calculate the distance so the whole grid is visible with margin.

For a perspective camera with FOV, the visible height at distance d is: 2 * d * tan(fov/2)
I want to see about 32 units height (30 + margin). With FOV 60°: tan(30°) = 0.577, so d = 16 / 0.577 ≈ 27.7. Let me use FOV 50° and compute: tan(25°) ≈ 0.466, d = 16 / 0.466 ≈ 34.3. I'll use d = 40 to have margin.

Actually let me use FOV 60 and distance 45 or so to be safe with margin.

For the InstancedMesh:
- geometry: BoxGeometry(0.8, 0.8, 0.8)
- material: MeshBasicMaterial({ color: 0xffffff })
- count: 900
- Set matrices for each instance positioning them in XY plane (z=0)
- Set colors via setColorAt

For raycasting:
- Listen for click event on the canvas
- Convert mouse position to NDC using canvas bounding rect
- Raycaster intersects the InstancedMesh
- If intersection found, get instanceId
- Toggle color for that instance

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 45);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// InstancedMesh
const GRID = 30;
const COUNT = GRID * GRID;
const SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
const grayColor = new THREE.Color(0x808080);

for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        dummy.position.set(
            (j - (GRID - 1) / 2) * SPACING,
            (i - (GRID - 1) / 2) * SPACING,
            0
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, grayColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Raycaster for click
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const redColor = new THREE.Color(0xff0000);
const colors = new Map<number, THREE.Color>();

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersections = raycaster.intersectObject(mesh);
    
    if (intersections.length > 0) {
        const id = intersections[0].instanceId!;
        const currentColor = new THREE.Color();
        mesh.getColorAt(id, currentColor);
        
        if (currentColor.equals(redColor)) {
            mesh.setColorAt(id, grayColor);
        } else {
            mesh.setColorAt(id, redColor);
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

// Render loop
let rendered = false;
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (!rendered) {
        rendered = true;
        (window as any).__ready = true;
    }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

This looks good. Let me double-check:
- Grid centered on origin: positions from -(GRID-1)/2 * SPACING to +(GRID-1)/2 * SPACING = -14.5 to 14.5. ✓
- Box size 0.8, spacing 1.0. ✓
- MeshBasicMaterial white so instance colors show exactly. ✓
- setColorAt with gray initially. ✓
- Click toggles independently. ✓
- Raycaster with NDC from bounding rect. ✓
- Uses instanceId. ✓
- Flags instanceColor.needsUpdate. ✓
- No animation of camera. ✓
- Exposes __scene, __camera, __renderer, __mesh, __ready. ✓

One concern: with a 45 unit distance and FOV 60, the visible area is about 52 units. The grid is about 30 units. That gives good margin. Good.

Actually wait, let me reconsider the camera distance. Grid spans from -14.5 to 14.5 = 29 units plus box size 0.8 on each side = about 30.3 units. At distance 45 with FOV 60: visible height = 2 * 45 * tan(30°) = 2 * 45 * 0.577 = 51.9. So grid occupies about 30/52 = 58% of screen. That's reasonable with margin.

Let me also make sure I don't set `mesh.instanceColor!.needsUpdate = true` when instanceColor might not exist yet. Since we call setColorAt before adding to scene, instanceColor should be created. This should be fine.

The code looks solid. Let me finalize it.
