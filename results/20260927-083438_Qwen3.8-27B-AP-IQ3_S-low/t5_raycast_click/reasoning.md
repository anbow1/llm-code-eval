Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it (color becomes 0xff0000), only one at a time
5. Clicking empty background clears selection
6. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
7. PerspectiveCamera looking straight at the grid, whole grid visible with margin
8. No camera movement, no animation of cubes
9. AmbientLight + DirectionalLight
10. Must compile with tsc --strict
11. Expose __scene, __camera, __renderer, __ready
12. Use renderer.setAnimationLoop
13. Handle window resize
14. No external assets

Let me think about the layout:
- 5x5 grid in XY plane
- Cubes facing the camera (so camera is on the +Z axis looking at -Z)
- Let cube size be 1, gap be 0.5 (or something similar)
- Grid spacing = cube size + gap = 1.5
- Total grid width = 5 * 1.5 - 0.5 = 7 (from -3 to 3 in terms of centers)
- Actually, let me think more carefully. If cube size is 1 and gap is 0.5, the spacing is 1.5.
- Centers at: -3, -1.5, 0, 1.5, 3 (for 5 cubes centered at 0)
- So the grid spans from -3.5 to 3.5 in both X and Y (total width 7)

Camera:
- PerspectiveCamera looking at the grid from +Z
- Need to fit the whole grid with margin
- If grid is 7 units wide, with some margin let's say 10 units total
- FOV 60 degrees, so half-angle is 30 degrees
- tan(30°) ≈ 0.577
- For vertical: distance * 0.577 >= 3.5 + margin
- Let's use a distance that gives enough margin. If we want 5 units total half-height (grid is 3.5, margin ~1.5), then distance = 5 / 0.577 ≈ 8.66
- Let's just use a distance like 12 to be safe, or calculate it properly.

Actually let me just pick a reasonable camera distance. With FOV 60, at distance 10:
- half-height visible = 10 * tan(30°) = 10 * 0.577 = 5.77
- The grid half-height is 3.5, so we have margin of 2.27. Good.

For click handling:
- Use pointerdown or click event
- Compute NDC from canvas bounding rect
- Raycast against the array of cubes
- If hit, select that cube (deselect previous)
- If no hit, clear selection

Let me write the code:

```typescript
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const gridSize = 5;
const halfGrid = (gridSize - 1) / 2; // 2

const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(cubeGeometry, material);
        const x = (i - halfGrid) * spacing;
        const y = (j - halfGrid) * spacing;
        cube.position.set(x, y, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Raycasting
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: PointerEvent): void {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersects = raycaster.intersectObjects(cubes);
    
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        
        // Deselect previous
        if (selectedCube !== null) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        }
        
        // Select new
        selectedCube = hitMesh;
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    } else {
        // Clear selection
        if (selectedCube !== null) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedCube = null;
        }
    }
}

canvas.addEventListener('pointerdown', onPointerDown);

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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful with the `cubes` variable - it's typed as `THREE.Mesh[]` but `Mesh` could be `Mesh<THREE.BufferGeometry, THREE.Material>`. Let me use proper typing.

Actually in strict mode, `new THREE.Mesh(cubeGeometry, material)` should work fine since BoxGeometry extends BufferGeometry and MeshStandardMaterial extends Material.

Let me also make sure the `intersects[0].object` cast is correct. In Three.js, `intersectObjects` returns `Intersection[]` where `object` is `Object3D`. So I need to cast to `THREE.Mesh`.

Actually, looking at the Three.js types more carefully, `raycaster.intersectObjects(cubes)` where cubes is `THREE.Mesh[]` should return intersections with `object` typed as `THREE.Mesh` if I use the proper overloads. Let me check... Actually the return type is `Intersection<Object3D>[]` in most versions. I'll cast it.

Let me also consider: the `cubes` array - I should make sure the geometry is shared (which it is since I create it once) but materials are separate (which they are).

Let me finalize the code and make sure it's clean and strict-compatible.
