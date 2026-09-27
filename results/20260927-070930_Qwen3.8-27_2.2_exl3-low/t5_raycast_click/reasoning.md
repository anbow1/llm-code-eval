Let me think through this carefully:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one selected at a time
4. Clicking empty background clears selection
5. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. No other meshes
10. Must compile with tsc --strict

Let me plan the layout:
- 5x5 grid in XY plane
- Cubes with gaps between them
- Let's say cube size = 1, gap = 0.5, so spacing = 1.5
- Grid spans from -3 to +3 in both X and Y (center at origin)
- Camera looks at origin from +Z direction

Camera setup:
- Position at (0, 0, 10) looking at origin
- FOV needs to be wide enough to see the whole grid with margin
- Grid total size: 5 * 1 + 4 * 0.5 = 7 units wide/tall
- With margin, let's say we need to see about 9 units
- At distance 10, with FOV 45 degrees, visible height = 2 * 10 * tan(22.5) ≈ 8.28... might be tight
- Let's use FOV 50 or position camera further back
- At distance 12, FOV 45: visible height = 2 * 12 * tan(22.5) ≈ 9.94 - good
- Or simpler: camera at (0, 0, 10), FOV 50: visible height = 2 * 10 * tan(25) ≈ 9.33 - should work

Let me go with camera at (0, 0, 10), FOV 50.

For the raycaster:
- Need to compute NDC from canvas bounding rect
- event.clientX - rect.left, event.clientY - rect.top
- x = (clientX - rect.left) / rect.width * 2 - 1
- y = -(clientY - rect.top) / rect.height * 2 + 1

For the animation loop:
- No cube animation, but we still need to render
- Use setAnimationLoop
- Set __ready after first frame

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
const gridSize = 5;
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap;
const offset = (gridSize - 1) * spacing / 2;

const cubes: THREE.Mesh[] = [];
const baseColor = 0x4488ff;
const selectedColor = 0xff0000;

for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: baseColor });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(i * spacing - offset, j * spacing - offset, 0);
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
        const hit = intersects[0].object as THREE.Mesh;
        if (selectedCube === hit) return;
        if (selectedCube) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
        }
        selectedCube = hit;
        (hit.material as THREE.MeshStandardMaterial).color.setHex(selectedColor);
    } else {
        if (selectedCube) {
            (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
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

Wait, the requirement says "Motion must use delta/elapsed time, not frame counts." But there's no animation of cubes. The render loop just renders. I think this is fine - we just render every frame. The "motion" requirement is about if there were animation, use delta time. Since there's no animation, just rendering is fine.

Let me double-check: "No camera movement, no animation of the cubes." So we just render. That's fine.

Let me make sure the code compiles with strict mode. The key things:
- All variables are typed
- No implicit any
- The event handler has proper types

I think this looks good. Let me finalize it.
