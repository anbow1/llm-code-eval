Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000
5. Only one cube selected at a time; previously selected goes back to 0x4488ff
6. Clicking empty background clears selection (all cubes 0x4488ff)
7. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
8. PerspectiveCamera looking straight at the grid, whole grid visible with margin
9. No camera movement, no animation of cubes
10. AmbientLight + DirectionalLight
11. No other meshes

Let me think about the layout:
- 5x5 grid in XY plane
- Cubes should face the camera (camera looks along -Z direction)
- Gaps between cubes

Let me plan the grid:
- Cube size: let's say 1 unit
- Gap: let's say 0.5 units
- So spacing = 1 + 0.5 = 1.5 units
- Grid spans from -2*1.5 to +2*1.5 = -3 to +3 in both X and Y
- Total grid size: 6 units in each direction

Camera:
- PerspectiveCamera looking at origin from positive Z
- Need to fit the whole grid with margin
- If grid is 6 units wide/tall, camera should be far enough
- Let's use FOV 45 degrees
- At distance d, the visible height = 2 * d * tan(FOV/2)
- We need visible height >= 6 + margin (say 8)
- 8 = 2 * d * tan(22.5°) = 2 * d * 0.4142
- d = 8 / (2 * 0.4142) = 9.66
- Let's use d = 10 to be safe

Actually let me reconsider. The grid spans from position -2*spacing to +2*spacing. With spacing 1.5, that's -3 to +3, so 6 units total. With margin, let's say we want 8 units visible.

At FOV 45°, half-angle is 22.5°, tan(22.5°) ≈ 0.4142
Visible height at distance d = 2 * d * tan(22.5°)
We need 2 * d * 0.4142 >= 8
d >= 8 / 0.8284 ≈ 9.66

Let's use distance 10.

For the click handling:
- Get canvas bounding rect
- Compute NDC coordinates
- Use Raycaster to intersect with cubes
- If hit a cube, select it (deselect previous)
- If no hit, clear selection

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
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Grid of cubes
const gridSize = 5;
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const offset = (gridSize - 1) * spacing / 2; // 3

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    const x = col * spacing - offset;
    const y = row * spacing - offset;
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection
let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

function handleClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    if (selectedCube === hitMesh) {
      // Already selected, deselect
      (hitMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
    } else {
      // Deselect previous
      if (selectedCube) {
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      }
      // Select new
      (hitMesh.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
      selectedCube = hitMesh;
    }
  } else {
    // No hit, clear selection
    if (selectedCube) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', handleClick);

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

Wait, I need to think about whether clicking an already-selected cube should deselect it or keep it selected. The requirement says "Clicking a cube selects it" and "Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff." It doesn't explicitly say clicking the same cube again deselects it. Let me re-read...

"Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff."

I think the simplest interpretation is: clicking a cube always selects it (makes it red). If it was already selected, it stays selected. The "previously selected" refers to a different cube that was selected before.

Actually, let me just keep it simple: clicking a cube selects it. If another cube was selected, that one goes back. If the same cube is clicked again, it just stays selected (no change needed, but we can handle it).

Let me simplify: if the clicked cube is the same as selectedCube, do nothing (or we could deselect, but the spec doesn't say that). I'll just make it so clicking a cube always selects it, and the previously selected (if different) goes back.

Actually, I'll just keep my original logic but simplify: if clicking the same cube, it stays selected (no change). If clicking a different cube, deselect old, select new. If clicking empty, deselect.

Let me also make sure the `tsc --strict` will pass. I need to be careful with types.

The `intersects[0].object` is typed as `Object3D`, so I need to cast it to `THREE.Mesh`. The material on Mesh is `Material | Material[]`, so I need to cast to `THREE.MeshStandardMaterial`.

Let me also make sure I'm not using any deprecated APIs. `setHex` should be fine.

One thing: the requirement says "No camera movement, no animation of the cubes." So the render loop just renders, no transforms applied.

Let me finalize the code.
