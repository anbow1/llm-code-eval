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
11. Standard Three.js setup with renderer, resize handling, setAnimationLoop
12. Expose __scene, __camera, __renderer, __ready
13. No external assets

Let me plan the layout:
- 5x5 grid in XY plane
- Cubes with gaps. Let's say cube size = 1, gap = 0.5, so spacing = 1.5
- Grid spans from -3*1.5 to +3*1.5 = -4.5 to +4.5 in X and Y
- Total width/height = 9 + 1 = 10 (including cube size)
- Camera should be looking at the origin, positioned on Z axis looking at -Z direction
- Camera at z = 15 or so, with a FOV that shows the whole grid with margin

Let me think about the camera:
- Grid is centered at origin, spans roughly -5 to +5 in X and Y
- Camera at (0, 0, 15) looking at origin
- FOV of 50 degrees should work. Let me calculate: at z=15, the visible height = 2 * 15 * tan(25°) ≈ 2 * 15 * 0.466 ≈ 14. So the grid (10 units) fits with margin.

Actually let me reconsider. The grid:
- 5 cubes, each 1 unit wide
- Gap between cubes: 0.5 units
- Total width: 5*1 + 4*0.5 = 7 units
- Centered at origin: from -3.5 to +3.5

Camera at z=12, FOV 50: visible height = 2*12*tan(25°) ≈ 2*12*0.466 ≈ 11.16. Grid is 7 units. Good margin.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap;
const gridOffset = -2 * spacing; // center of 5 items

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(gridOffset + i * spacing, gridOffset + j * spacing, 0);
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
        if (selectedCube === hit) return; // already selected
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

Wait, I need to make sure the `time` parameter in setAnimationLoop is typed. The callback receives a DOMHighResTimeStamp (number). Let me make sure this compiles with strict mode.

Actually, `renderer.setAnimationLoop` takes a callback that receives a number (timestamp). The parameter type is `((time: number) => void) | null`. So I just need to use the parameter or not. Since we don't need delta time for anything (no animation), I can just ignore it.

Let me also make sure I'm not using the `time` parameter since there's no animation. The requirement says "Motion must use delta/elapsed time, not frame counts" but there's no motion here. The render loop just renders. That's fine.

Let me double-check the strict mode concerns:
- `intersects[0].object` is typed as `THREE.Object3D`. I need to cast it to `THREE.Mesh`.
- `hit.material` is `THREE.Material | THREE.Material[]`. I need to cast to `THREE.MeshStandardMaterial`.

Actually in Three.js types, `Mesh.material` is `Material | Material[]`. So I need to handle that. Let me use a type assertion.

Let me refine:

```typescript
const hit = intersects[0].object as THREE.Mesh;
const mat = hit.material as THREE.MeshStandardMaterial;
```

This should work with strict mode.

Let me also make sure I'm not importing anything from addons. I don't need any addons.

One more thing - the `setAnimationLoop` callback: the signature is `setAnimationLoop(callback: ((time: number) => void) | null)`. So I can write:

```typescript
renderer.setAnimationLoop((_time: number) => {
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Actually, I don't even need the parameter since I'm not using it. But TypeScript strict mode might complain about unused parameters... actually no, it doesn't complain about unused function parameters in strict mode. It's fine to just write:

```typescript
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, the callback signature expects `(time: number) => void`. If I pass `() => void`, that's still valid because a function with fewer parameters is assignable to a function type with more parameters. So this is fine.

Let me finalize the code.
