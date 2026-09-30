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
10. No other meshes

Let me think about the layout:
- 5x5 grid in XY plane facing the camera (so Z is towards camera)
- Cubes positioned in XY plane
- Camera looking down -Z axis at the grid

For the grid:
- Let's say cube size = 1, gap = 0.5
- So spacing = 1.5
- Grid positions: from -2 to 2 in both X and Y, spaced by 1.5
- Total grid width = 4 * 1.5 = 6, plus cube size = 7
- Camera needs to see this with margin

Camera setup:
- Position at (0, 0, some distance)
- Looking at origin
- FOV such that the grid is visible with margin

Let me calculate: if grid spans from -3.5 to 3.5 (width 7), and we want margin, let's say we want to see about 10 units wide. With a 45 degree FOV, the visible height at distance d is 2 * d * tan(22.5°) = 2 * d * 0.4142. For height 10, d = 10 / (2 * 0.4142) ≈ 12. But we also need to account for aspect ratio.

Actually, let me just use a reasonable distance. Let's say camera at z=15, FOV=50. That should give plenty of margin.

For the raycaster with normalized device coordinates from canvas bounding rect:
```typescript
const rect = renderer.domElement.getBoundingClientRect();
const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
```

Now let me write the complete file:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const gridSize = 5;
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const offset = ((gridSize - 1) * spacing) / 2; // 3

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(geometry, material);
        const x = col * spacing - offset;
        const y = row * spacing - offset;
        cube.position.set(x, y, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Raycaster
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects(cubes);
    
    if (intersects.length > 0) {
        const clickedCube = intersects[0].object as THREE.Mesh;
        if (selectedCube === clickedCube) {
            // Already selected, deselect
            (clickedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            selectedCube = null;
        } else {
            if (selectedCube) {
                (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
            }
            (clickedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
            selectedCube = clickedCube;
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

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

Wait, the requirement says "Clicking a cube selects it" - it doesn't say clicking an already selected cube deselects it. Let me re-read: "Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff."

So clicking a cube always selects it. If it's already selected, it stays selected (or we could argue it stays selected). Let me just make it so clicking a cube always selects it (if already selected, it stays selected - no toggle). Actually, the simplest interpretation is: clicking a cube selects it, deselecting any previously selected one. If you click the already selected one, it just stays selected.

Let me simplify:
- Click cube: deselect previous, select this one
- Click background: deselect

This is cleaner and matches the spec.

Also, I should use `const clock = new THREE.Clock()` for delta time even though there's no animation - the requirement says "Motion must use delta/elapsed time, not frame counts." Since there's no motion, I don't really need it, but I'll include it to be safe. Actually, there's no motion at all (no camera movement, no animation of cubes), so I don't need delta time. The requirement is about how to handle motion if there is any.

Let me finalize the code.
