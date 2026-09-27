The user wants a single TypeScript file that:
1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between cubes
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000
5. Only one cube selected at a time; previously selected goes back to 0x4488ff
6. Clicking empty background clears selection (all cubes 0x4488ff)
7. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
8. PerspectiveCamera looking straight at the grid, whole grid visible with margin
9. No camera movement, no animation of cubes
10. AmbientLight + DirectionalLight
11. Import Three.js as `import * as THREE from 'three'`
12. Create WebGLRenderer, append canvas to document.body
13. Size from window.innerWidth/innerHeight, handle resize
14. Use renderer.setAnimationLoop
15. Expose __scene, __camera, __renderer
16. After first frame, set __ready = true
17. No external assets

Let me plan the grid:
- 5x5 grid in XY plane
- Cubes are small enough with gaps between them
- Let's say cube size = 1, gap = 0.5, so spacing = 1.5
- Grid spans from -3 to +3 in both X and Y (5 cubes, spacing 1.5: positions at -3, -1.5, 0, 1.5, 3)
- Camera at z = 10, looking at origin

For the cube geometry: BoxGeometry(1, 1, 1) - facing the camera means the face is in XY plane, so the cube extends in Z as well. That's fine.

Actually, "in the XY plane, facing the camera" - the cubes are arranged in the XY plane (grid extends in X and Y), and they face the camera (camera is along Z axis looking at origin).

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
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
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const gridSize = 5;
const offset = (gridSize - 1) * spacing / 2; // 3

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set((j - (gridSize - 1) / 2) * spacing, (i - (gridSize - 1) / 2) * spacing, 0);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Raycasting
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    
    const intersects = raycaster.intersectObjects(cubes);
    
    if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (selectedCube && selectedCube !== hit) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
        }
        (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        selectedCube = hit;
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

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, let me check the camera framing. The grid spans from -3 to +3 in X and Y (with cube size 1, so actually -3.5 to +3.5). Let me recalculate:
- 5 cubes, spacing 1.5
- Positions: -3, -1.5, 0, 1.5, 3
- Cube extends 0.5 in each direction, so grid spans -3.5 to +3.5 in both X and Y

Camera at z=10, FOV 50 degrees. The visible height at z=10 would be 2 * 10 * tan(25°) ≈ 2 * 10 * 0.466 ≈ 9.33. So the grid (7 units tall) fits with margin. Good.

Actually let me double-check: tan(25°) ≈ 0.4663, so half-height = 10 * 0.4663 ≈ 4.663, full height ≈ 9.33. Grid is 7 units tall, so it fits with about 1.16 margin on each side. Good.

For width: if aspect ratio is 16:9, half-width = 4.663 * (16/9) ≈ 8.29, full width ≈ 16.58. Grid is 7 wide, fits easily.

This looks good. Let me finalize.
