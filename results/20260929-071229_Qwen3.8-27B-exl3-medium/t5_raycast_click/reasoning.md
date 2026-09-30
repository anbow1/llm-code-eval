The user wants a complete TypeScript file that:
1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one at a time
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with normalized device coordinates from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. No other meshes
10. Must compile with tsc --strict
11. Expose __scene, __camera, __renderer, __ready
12. Use renderer.setAnimationLoop
13. Handle window resize
14. No external assets

Let me think about the layout:
- 5x5 grid in XY plane
- Cubes facing the camera (so they're in the XY plane, camera looks along -Z)
- Visible gaps between them
- Each cube is a BoxGeometry

Let me calculate sizes:
- Cube size: let's say 1 unit
- Gap: let's say 0.3 units
- So spacing = 1 + 0.3 = 1.3
- Grid spans from -2*1.3 to +2*1.3 = -2.6 to +2.6 in both X and Y
- Total grid size: 5.2 units in each direction

Camera:
- PerspectiveCamera looking at origin along -Z (so camera at z = some positive value)
- Need to fit the whole grid with margin
- Let's use FOV 60 degrees
- At distance d, the visible height = 2 * d * tan(FOV/2)
- We need visible height >= 5.2 + margin (say 1) = 6.2
- 6.2 = 2 * d * tan(30°) = 2 * d * 0.577
- d = 6.2 / 1.155 ≈ 5.37
- Let's use d = 7 to be safe with margin

Let me set camera at (0, 0, 7) looking at origin.

For the click handling:
- Use canvas.getBoundingClientRect()
- Compute NDC: x = ((event.clientX - rect.left) / rect.width) * 2 - 1
- y = -((event.clientY - rect.top) / rect.height) * 2 + 1
- Raycaster from camera through that point
- Check intersection with cubes array
- If hit: select that cube (deselect previous)
- If no hit: deselect all

Let me write the code now.

For strict TypeScript, I need to be careful with types. The material color is a THREE.Color, so I can use .setHex() or .set().

Let me structure this:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7);
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
const gap = 0.3;
const spacing = cubeSize + gap;
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
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

// Raycaster and click handling
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selectedCube && selectedCube !== hit) {
      selectedCube.material.color.setHex(0x4488ff);
    }
    selectedCube = hit;
    selectedCube.material.color.setHex(0xff0000);
  } else {
    if (selectedCube) {
      selectedCube.material.color.setHex(0x4488ff);
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

Wait, I need to think about whether the geometry can be shared. The requirement says "25 separate Mesh objects" - they don't say separate geometries. Each cube has its OWN material, which I'm doing. Sharing geometry is fine and efficient.

Actually, let me re-read: "Each cube has its OWN MeshStandardMaterial with color 0x4488ff." - Yes, each has its own material. Good.

"Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff." - Handled.

"Clicking empty background clears the selection (all cubes 0x4488ff)." - Handled.

"Use THREE.Raycaster with normalized device coordinates computed from the canvas bounding rect." - Handled.

"PerspectiveCamera looking straight at the grid, the whole grid visible with margin. No camera movement, no animation of the cubes." - Handled.

"AmbientLight + DirectionalLight." - Handled.

"Do not add any other meshes." - I only add cubes. Lights are not meshes. Good.

Let me make sure the types are strict-safe. The `intersects[0].object` is typed as `Object3D`, so I need to cast it. Let me use a proper cast.

Actually in strict mode, `intersects[0]` could be undefined if the array is empty, but I check `intersects.length > 0` first. However, TypeScript might still complain. Let me use a non-null assertion or restructure.

Actually, with `intersects.length > 0`, TypeScript should narrow it... no it doesn't for array indexing. Let me use:

```typescript
const first = intersects[0];
if (first) { ... }
```

Or I can just use the length check and then access [0] - in strict mode, array indexing returns `T | undefined` only if `noUncheckedIndexedAccess` is enabled. With just `--strict`, `intersects[0]` returns `Intersection` (not `Intersection | undefined`). So it should be fine.

Wait, actually `--strict` does NOT include `noUncheckedIndexedAccess`. So `intersects[0]` is typed as `Intersection<Object3D, BufferGeometry>` which is fine.

Let me finalize the code.
