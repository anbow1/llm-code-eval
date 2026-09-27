The user wants a single TypeScript file that:

1. Creates a 5x5 grid of 25 cubes (separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between cubes
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it (color becomes 0xff0000), only one at a time, previously selected goes back to 0x4488ff
5. Clicking empty background clears selection (all cubes back to 0x4488ff)
6. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
7. PerspectiveCamera looking straight at the grid, whole grid visible with margin
8. No camera movement, no animation of cubes
9. AmbientLight + DirectionalLight
10. Import Three.js as `import * as THREE from 'three';`
11. Create WebGLRenderer, append canvas to document.body
12. Size from window.innerWidth/innerHeight, handle resize
13. Use renderer.setAnimationLoop
14. Expose __scene, __camera, __renderer
15. Set __ready = true after first frame
16. No external assets
17. Must compile with tsc --strict

Let me think about the layout:
- 5x5 grid in XY plane
- Gaps between cubes
- Cube size: let's say 1 unit
- Gap: let's say 0.5 units
- So spacing = 1.5 units between centers
- Grid spans from -2 to 2 in both X and Y (centers at -2, -1, 0, 1, 2)
- Total grid size: 5 cubes * 1 unit + 4 gaps * 0.5 = 5 + 2 = 7 units wide
- Actually, center positions: -2, -1, 0, 1, 2 with spacing 1.5
- So positions: -2, -0.5, 1, 2.5... wait let me recalculate

Let me use:
- Cube size: 1
- Gap: 0.5
- Spacing (center to center): 1.5
- Positions: -2, -0.5, 1, 2.5... no that's not centered

Let me center it:
- 5 positions, spacing 1.5
- Total span: 4 * 1.5 = 6
- Positions: -3, -1.5, 0, 1.5, 3

Camera needs to see the whole grid with margin. The grid is 6 units wide (from -3 to 3) plus the cube half-size (0.5) on each side, so total is about 7 units wide.

Let me place the camera at z = 10 or so, looking at origin. The camera's FOV determines how much is visible. With a 45 degree FOV, at distance 10, the visible height is 2 * 10 * tan(22.5°) ≈ 2 * 10 * 0.414 ≈ 8.28. That should be enough to see a 7-unit grid.

Actually let me use a smaller FOV or adjust. Let me use FOV 50 and distance 12.

Visible height at distance 12 with FOV 50: 2 * 12 * tan(25°) ≈ 2 * 12 * 0.466 ≈ 11.2
Visible width depends on aspect ratio. For a typical 16:9 screen, width would be about 11.2 * 1.78 ≈ 19.9. That's plenty.

Let me use:
- Cube size: 1
- Spacing: 1.8 (gap of 0.8)
- Positions: -3.6, -1.8, 0, 1.8, 3.6
- Total span: 7.2 + 1 (half cube on each side) = 8.2

Camera at z = 12, FOV 50. That should work.

Actually let me keep it simpler:
- Cube size: 1
- Spacing: 1.6 (gap of 0.6)
- Positions: -3.2, -1.6, 0, 1.6, 3.2
- Total extent: 6.4 + 1 = 7.4 (from -3.7 to 3.7)

Camera at z = 10, FOV 50.
Visible height: 2 * 10 * tan(25°) ≈ 9.33
That's enough for 7.4 height.

Let me go with that.

For the raycaster with bounding rect:
```typescript
const rect = renderer.domElement.getBoundingClientRect();
const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
```

For strict TypeScript, I need to be careful with types.

Let me write the complete file:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Grid of cubes
const gridSize = 5;
const cubeSize = 1;
const spacing = 1.6;
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(geometry, material);
        const x = (col - (gridSize - 1) / 2) * spacing;
        const y = (row - (gridSize - 1) / 2) * spacing;
        cube.position.set(x, y, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Selection
let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

function onPointerDown(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const intersects = raycaster.intersectObjects(cubes);
    
    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        // Deselect previous
        if (selectedCube && selectedCube !== hit) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        }
        // Select new
        selectedCube = hit;
        (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    } else {
        // Clear selection
        if (selectedCube) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedCube = null;
        }
    }
}

renderer.domElement.addEventListener('click', onPointerDown);

// Resize
window.addEventListener('resize', (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
renderer.setAnimationLoop((): void => {
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to double-check strict mode. In strict mode, `intersects[0].object` is typed as `Object`, so I need to cast it. Actually in Three.js types, `intersectObjects` returns `Intersection[]` where `object` is `Object3D`. I cast to `THREE.Mesh`.

Also, the event type for addEventListener - I should use `MouseEvent`. The `click` event gives a `MouseEvent`.

Let me also make sure the `renderer.domElement` is properly typed. In Three.js, `domElement` is `HTMLCanvasElement`.

Let me also consider: the `setFromCamera` takes a `Vector2` for the NDC coordinates. That's correct.

One thing: I should make sure the geometry is shared but each material is unique. Yes, I'm creating a new `MeshStandardMaterial` for each cube.

Let me also verify: `tsc --strict` means I need to handle all the typing properly. The `event` in the click handler will be `MouseEvent` if I specify the type properly.

Actually, with `addEventListener('click', onPointerDown)`, TypeScript will infer the event type. But to be safe, I'll type the parameter as `MouseEvent`.

Let me finalize the code.
