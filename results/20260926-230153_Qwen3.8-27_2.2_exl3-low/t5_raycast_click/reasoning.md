Let me create a complete TypeScript file that:

1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one selected at a time
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with normalized device coordinates from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. Creates WebGLRenderer, appends canvas to document.body
10. Handles window resize
11. Uses renderer.setAnimationLoop
12. Exposes __scene, __camera, __renderer, __ready
13. No external assets

Let me think about the layout:
- 5x5 grid in XY plane, facing the camera (which looks along -Z)
- Cubes should have gaps between them
- Camera looks straight at the grid

Let me plan the grid:
- Grid spacing: let's say 1.2 units between cube centers (cube size 1.0, gap 0.2)
- Grid spans from -2.4 to +2.4 in X and Y (5 cubes with spacing 1.2: positions at -2.4, -1.2, 0, 1.2, 2.4)
- Total span: 4.8 units wide and tall

Camera needs to see the whole grid with margin. Let's say the grid is 4.8 units wide. With some margin, let's say we want to see about 6 units wide.

For a perspective camera with FOV 45 degrees, if the camera is at z = -8 (or z = 8 looking toward origin... wait, the grid is in XY plane facing the camera, so the camera should be looking in the -Z direction from a positive Z position).

Actually, let me think: the grid is in the XY plane. The camera looks at the grid. So the camera is at some position on the Z axis looking toward the origin (or the grid center).

Let me place the grid centered at origin. Camera at (0, 0, 10) looking at (0, 0, 0).

With FOV 45 degrees and distance 10, the visible height at the grid plane is: 2 * 10 * tan(22.5°) ≈ 2 * 10 * 0.414 ≈ 8.28 units. That's enough for a 4.8 unit grid with margin.

Let me code this up:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Grid of cubes
const cubeSize = 1.0;
const spacing = 1.2;
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set((i - 2) * spacing, (j - 2) * spacing, 0);
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
renderer.setAnimationLoop((time) => {
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

Wait, I need to make sure this compiles with `tsc --strict`. Let me check for potential issues:

1. `renderer.domElement` - this is typed as HTMLCanvasElement, so `getBoundingClientRect()` works fine.
2. The event listener - `click` event is a MouseEvent, so `event.clientX` and `event.clientY` are fine.
3. `raycaster.intersectObjects(cubes)` - cubes is `THREE.Mesh[]`, which is `THREE.Object3D[]`, so this should work.
4. `intersects[0].object` is typed as `THREE.Object3D`, so I need to cast it.
5. The `setAnimationLoop` callback receives a `number` (time in ms), which is fine.

Let me also make sure I'm not using any deprecated APIs. `setFromCamera` takes a `Vector2` and a camera - that's correct.

I think this looks good. Let me finalize it.
