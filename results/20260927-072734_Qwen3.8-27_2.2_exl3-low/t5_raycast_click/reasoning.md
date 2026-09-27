Let me plan this out:

1. Create a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Gaps between cubes
4. PerspectiveCamera looking straight at the grid
5. Raycaster for click detection
6. Clicking a cube selects it (color becomes 0xff0000), only one at a time
7. Clicking empty background clears selection
8. AmbientLight + DirectionalLight
9. No other meshes
10. Set animation loop, handle resize
11. Expose scene, camera, renderer on window
12. Set __ready after first frame

Let me think about the grid layout:
- 5x5 grid in XY plane
- Cubes are 1x1x1 (or some size)
- Gaps between them - so spacing should be larger than cube size
- Let's say cube size = 1, gap = 0.5, so spacing = 1.5
- Grid spans from -3 to +3 in X and Y (5 cubes, spacing 1.5: positions at -3, -1.5, 0, 1.5, 3)

Camera:
- Looking straight at the grid (from positive Z)
- Position at (0, 0, 10) or so
- The grid spans roughly -3.5 to 3.5 (with cube size 1, so edges at -3.5 to 3.5)
- Need to see the whole grid with margin
- FOV 45 degrees, at distance 10, visible height = 2 * 10 * tan(22.5) ≈ 8.28
- Grid height is about 7 (from -3.5 to 3.5), so 8.28 gives margin. Good.

Raycaster:
- Use normalized device coordinates from canvas bounding rect
- On click event, compute NDC, raycast against the 25 cubes
- If hit a cube: select it (change color to 0xff0000), deselect previous
- If no hit: clear all selections

Let me write the code:

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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const cubes: THREE.Mesh[] = [];
const cubeSize = 1;
const spacing = 1.5;
const halfGrid = (5 - 1) * spacing / 2; // = 3

for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(i * spacing - halfGrid, j * spacing - halfGrid, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

// Raycaster
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
        if (selectedCube) {
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

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- `selectedCube` is `THREE.Mesh | null` - when I do `selectedCube.material`, TypeScript will complain because it could be null. I need to handle that.

Actually, let me re-check. In the click handler:
- `if (selectedCube)` - this narrows to `THREE.Mesh`, so `selectedCube.material` is fine.
- `hit.material` - `hit` is `THREE.Mesh`, so `.material` is `Material`. I need to cast it to `MeshStandardMaterial`.

Let me also make sure the `intersectObjects` return type is correct. `raycaster.intersectObjects(cubes)` returns `Intersection[]`. `intersects[0].object` is `Object3D`. I need to cast to `THREE.Mesh`.

Let me refine:

```typescript
const hit = intersects[0].object as THREE.Mesh;
(hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
```

That should work. Let me also make sure I'm not using any `any` that would fail strict mode. The `(window as any)` is fine since it's a type assertion.

Actually, for `tsc --strict`, I need to be careful. Let me think about what might fail:
- No implicit any
- No null assignments
- Strict null checks

The `selectedCube` variable is initialized as `null`, typed as `THREE.Mesh | null`. When I check `if (selectedCube)`, it narrows. Good.

Let me finalize the code.
