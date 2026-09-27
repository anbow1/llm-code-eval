The user wants a complete TypeScript file that:
1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (turns it red 0xff0000), only one at a time
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with normalized device coordinates from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. No other meshes added

Let me think about the layout:
- 5x5 grid in XY plane, facing camera (so Z axis is toward camera)
- Cubes with gaps between them
- Let's say cube size is 1, gap is 0.5, so spacing is 1.5
- Grid positions: from -2 to 2 in both x and y (indices 0-4, centered)
- Position for cube at (i, j): x = (i - 2) * 1.5, y = (j - 2) * 1.5

Camera:
- Looking straight at the grid from positive Z
- Grid width = 4 * 1.5 + 1 = 7 (from -3 to +3)
- Need margin, so let's place camera at z = 12 or so
- FOV 50 degrees, aspect from window

Let me calculate: grid extends from -3 to +3 in both x and y (with cube size 1 and spacing 1.5, the centers go from -3 to +3, and edges go from -3.5 to +3.5).

With FOV 50 degrees, at distance d, the visible height is 2 * d * tan(25°) = 2 * d * 0.4663 = 0.9326 * d.
For the grid to fit with margin (say 5 units visible height needed), d = 5 / 0.9326 ≈ 5.36. Let's use z = 10 to be safe with margin.

Actually let me recalculate. The grid centers range from -3 to +3 (5 cubes, spacing 1.5, centered at 0: positions are -3, -1.5, 0, 1.5, 3). The edges of the cubes extend 0.5 further, so the grid spans from -3.5 to +3.5 in both x and y.

With FOV 50° and camera at z=10: visible height = 2 * 10 * tan(25°) ≈ 2 * 10 * 0.4663 ≈ 9.33. The grid is 7 units tall, so we have about 1.16 units of margin on each side. That's decent.

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
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create 5x5 grid of cubes
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
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

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (selectedCube === hit) {
      // Already selected, deselect? Or keep selected?
      // The spec says "clicking a cube selects it" - I'll keep it selected
      // Actually re-reading: "Clicking a cube selects it" - so clicking always selects
      // Let me just select it (it's already red so no visual change)
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

// Render loop
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

Wait, I need to be careful about `tsc --strict`. Let me check:
- `intersects[0].object` is `THREE.Object3D`, I need to cast it
- The event listener parameter types should be fine
- `renderer.domElement.getBoundingClientRect()` returns `DOMRect` which is fine

Let me also make sure I'm not using any `any` types where they'd cause issues. The `(window as any)` casts are fine.

Actually, looking more carefully at the click handler - the spec says "Clicking a cube selects it" and "Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff." It doesn't say clicking the same cube again deselects it. So I'll just always select the clicked cube.

Let me also double-check: "Do not add any other meshes" - I only have the 25 cubes. The lights are not meshes, the geometry is shared but that's fine.

I think the code is good. Let me finalize it.
