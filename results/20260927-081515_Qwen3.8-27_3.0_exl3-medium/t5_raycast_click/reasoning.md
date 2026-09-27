Let me carefully analyze the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000. Only one selected at a time.
5. Clicking empty background clears selection (all cubes back to 0x4488ff)
6. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
7. PerspectiveCamera looking straight at the grid, whole grid visible with margin
8. No camera movement, no animation of cubes
9. AmbientLight + DirectionalLight
10. Create WebGLRenderer, append canvas to document.body
11. Size from window.innerWidth/innerHeight, handle resize
12. Use renderer.setAnimationLoop
13. Motion must use delta/elapsed time (but there's no animation, so just render)
14. Expose __scene, __camera, __renderer
15. After first frame, set __ready = true
16. No external assets

Let me think about the grid layout:
- 5x5 grid in XY plane
- Cubes facing the camera (so they're in the XY plane, with Z extending toward/away from camera)
- Camera looks straight at the grid (so camera is on the Z axis looking at origin)

Grid setup:
- Let's say each cube is 1 unit wide, with a gap of 0.3 units between them
- So spacing = 1 + 0.3 = 1.3
- Total grid width = 5 * 1 + 4 * 0.3 = 5 + 1.2 = 6.2
- Or: positions at -2, -1, 0, 1, 2 with spacing 1.3: -2.6, -1.3, 0, 1.3, 2.6
- Total span: 5.2 + 1 (cube size) = 6.2

Camera: PerspectiveCamera looking at origin from positive Z
- Need to see the whole grid with margin
- Grid spans about 6.2 units in X and Y
- With margin, let's say we need to see about 8 units
- FOV: let's use 45 degrees
- At distance d, visible height = 2 * d * tan(fov/2)
- For 45° FOV: visible height = 2 * d * tan(22.5°) = 2 * d * 0.4142
- To see 8 units: d = 8 / (2 * 0.4142) = 9.66
- Let's use distance = 15 to have comfortable margin
- At d=15: visible height = 2 * 15 * 0.4142 = 12.4 units (good margin)

Actually let me reconsider. The grid is 5x5 with cubes of size 1 and gaps. Let me use:
- Cube size: 1
- Gap: 0.4
- Spacing: 1.4
- Positions: -2.8, -1.4, 0, 1.4, 2.8
- Total span: 5.6 + 1 = 6.6

Camera at z=15, fov=45:
- Visible height at z=0: 2 * 15 * tan(22.5°) ≈ 12.43
- That gives good margin around the 6.6 unit grid.

Raycaster with NDC from canvas bounding rect:
```
const rect = renderer.domElement.getBoundingClientRect();
const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
```

For the animation loop - there's no animation per se, but I need to use delta/elapsed time. Since there's no motion, I'll just render. But I should still use the delta parameter in the callback.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const cubeSize = 1;
const gap = 0.4;
const spacing = cubeSize + gap;
const gridSize = 5;
const cubes: THREE.Mesh[] = [];

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);
        const x = (col - (gridSize - 1) / 2) * spacing;
        const y = (row - (gridSize - 1) / 2) * spacing;
        mesh.position.set(x, y, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

// Raycaster and click handling
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onClick(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects(cubes);
    
    // Deselect previous
    if (selectedCube) {
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        selectedCube = null;
    }
    
    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        selectedCube = hit;
    }
}

renderer.domElement.addEventListener('click', onClick);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Render loop
let ready = false;
renderer.setAnimationLoop((time: number) => {
    // No animation needed, just render
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, the requirement says "Motion must use delta/elapsed time, not frame counts." But there's no motion. I think this just means IF there were motion, use time-based. Since there's no motion, I just render. The setAnimationLoop callback receives a time parameter. I'll just use it for the ready flag.

Actually, let me re-read: "Motion must use delta/elapsed time, not frame counts." Since there's no motion, this is satisfied trivially. I'll just render each frame.

Let me also make sure the geometry is shared (one BoxGeometry) but each mesh has its own material. That's correct in my code.

Let me also make sure I'm not adding any other meshes. Only the 25 cubes. Lights are not meshes. Good.

One thing: the requirement says "facing the camera" - since cubes are BoxGeometry, they have all 6 faces. They're in the XY plane at z=0, and the camera is at z=15 looking at origin. So the front face (z+) faces the camera. That's fine.

Let me finalize the code.
