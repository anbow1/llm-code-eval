Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000, only one selected at a time
5. Clicking empty background clears selection
6. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
7. PerspectiveCamera looking straight at the grid, whole grid visible with margin
8. No camera movement, no animation of cubes
9. AmbientLight + DirectionalLight
10. Hard rules: import THREE, create renderer, append canvas to body, size from window, handle resize, use setAnimationLoop, expose __scene/__camera/__renderer, set __ready after first frame, no external assets

Let me plan:

- Grid: 5x5 = 25 cubes
- Cube size: let's say 1 unit each
- Gap: let's say 0.3 units between cubes
- Total grid width: 5 * 1 + 4 * 0.3 = 5 + 1.2 = 6.2 units
- Positions: centered at origin in XY plane
- Spacing: 1 + 0.3 = 1.3 units between centers
- Position x: (col - 2) * 1.3, Position y: (row - 2) * 1.3
- So positions range from -2.6 to 2.6 in both x and y
- Grid extent: -2.6 - 0.5 to 2.6 + 0.5 = -3.1 to 3.1, so 6.2 units wide
- Camera: perspective, looking at origin from +Z direction
- Need margin: let's say camera should see at least 7-8 units in height
- For a perspective camera with FOV 45 degrees, to see a range of ~7 units at distance d:
  - visible height = 2 * d * tan(fov/2)
  - 7 = 2 * d * tan(22.5°) = 2 * d * 0.4142
  - d = 7 / (2 * 0.4142) ≈ 8.45
- Let's use camera at z = 10, FOV 40
  - visible height = 2 * 10 * tan(20°) = 2 * 10 * 0.364 = 7.28
  - Grid is 6.2 units tall, so margin is about 0.54 on each side. That's fine.

Actually let me recalculate. The grid spans from -3.1 to 3.1 in y (6.2 units). With camera at z=10, FOV=40:
- Visible height at z=0 plane: 2 * 10 * tan(20°) ≈ 7.28
- So the grid takes up 6.2/7.28 ≈ 85% of the view height. Good margin.

For the click handling:
- Use raycaster with normalized device coordinates from canvas bounding rect
- On click, raycast against all cubes
- If hit a cube: select it (turn red), deselect previous
- If no hit: deselect all

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const CUBE_SIZE = 1;
const GAP = 0.3;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh[] = [];

for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(cubeGeometry, material);
        const x = (col - (GRID - 1) / 2) * SPACING;
        const y = ((GRID - 1) / 2 - row) * SPACING;
        cube.position.set(x, y, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Selection
let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects(cubes);
    
    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (selectedCube === hit) {
            // Already selected, keep it (or could deselect, but spec says "clicking a cube selects it")
        } else {
            if (selectedCube) {
                (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            }
            selectedCube = hit;
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        }
    } else {
        if (selectedCube) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedCube = null;
        }
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to think about whether `cubeGeometry` being shared is okay. The spec says 25 separate Mesh objects with their OWN MeshStandardMaterial. Sharing the geometry is fine since the requirement is about materials.

Let me also make sure the `strict` mode is satisfied. The `intersects[0].object` is typed as `Object3D`, so I need to cast it. Let me check - actually in Three.js types, `intersectObjects` returns `Intersection[]` and `object` is `Object3D`. I'll cast to Mesh.

Let me also double-check: the spec says "No camera movement, no animation of the cubes." So I just render, no updates needed. The animation loop just renders.

I think this is solid. Let me finalize it.
