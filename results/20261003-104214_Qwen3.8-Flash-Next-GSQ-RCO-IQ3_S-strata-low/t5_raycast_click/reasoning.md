The user wants a single TypeScript file that:
1. Creates a 5x5 grid of cubes in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), deselecting any previously selected cube
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking at the grid, all visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. Proper sizing, resize handling
10. Expose __scene, __camera, __renderer, __ready
11. Must compile with tsc --strict

Let me think about the layout:
- 5x5 grid in XY plane, facing camera (camera on Z axis looking toward negative Z, or grid at Z=0 and camera at positive Z)
- Cubes with gaps between them
- Each cube has its OWN material (not shared)

For the grid:
- Let's say cube size is 1, gap is 0.5, so spacing is 1.5
- 5 columns: positions at x = -3, -1.5, 0, 1.5, 3 (spacing 1.5)
- 5 rows: positions at y = -3, -1.5, 0, 1.5, 3

Camera position: needs to see the whole grid with margin. The grid spans from -3.5 to 3.5 (including cube size 1, so -3.5 to 3.5 in both x and y). Let's put camera at z=20 or so with a reasonable FOV.

Actually, let me calculate more carefully. With cube size 1 and spacing 1.5:
- x positions: -3, -1.5, 0, 1.5, 3
- The grid spans from -3.5 to 3.5 (adding half cube size)

For a 60° FOV camera, to see a span of 8 units (7 + margin):
- Half span = 4, tan(30°) = 0.577, distance = 4/0.577 ≈ 7

Let me use a smaller FOV or larger distance for safety. Camera at z=15 should work fine.

For the click handling:
- Listen for 'click' event on the canvas (or document)
- Compute NDC from the canvas bounding rect
- Use Raycaster to find intersections with the cubes
- If a cube is hit, select it (set color to 0xff0000, deselect previous)
- If no cube is hit, clear selection

Let me also make sure the renderer's canvas is the one we're computing the bounding rect from. I'll attach the click listener to the renderer's domElement.

For strict TypeScript:
- Need to be careful with types
- `document.body` access is fine
- Event listener callbacks need proper typing

Let me write this out:

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Grid of cubes
const CUBE_SIZE = 1;
const GAP = 0.5;
const SPACING = CUBE_SIZE + GAP;
const GRID_SIZE = 5;
const HALF_GRID = (GRID_SIZE - 1) / 2;

const cubes: THREE.Mesh[] = [];
const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(cubeGeometry, material);
    mesh.position.x = (i - HALF_GRID) * SPACING;
    mesh.position.y = (j - HALF_GRID) * SPACING;
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection state
let selectedCube: THREE.Mesh | null = null;

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    if (selectedCube !== hitMesh) {
      if (selectedCube) {
        (selectedCube.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
      }
      selectedCube = hitMesh;
      (selectedCube.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    }
  } else {
    if (selectedCube) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', onPointerDown);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let rendered = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!rendered) {
    rendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful with the geometry. The prompt says "25 separate Mesh objects" and "Each cube has its OWN MeshStandardMaterial". Sharing geometry is fine - each has its own material. That satisfies the requirements.

Also, I should make sure the code compiles with strict TypeScript. Let me check for potential issues:
- `renderer.domElement` is `HTMLCanvasElement` - fine
- `event: MouseEvent` - fine for 'click' listener
- `intersects[0].object` is `THREE.Object3D` - casting to `THREE.Mesh` should be fine
- The cast to `THREE.MeshStandardMaterial` should be fine since we know what type it is

Actually, for strict TS, `intersects[0].object` returns `THREE.Object3D`. I'll cast it to `THREE.Mesh`. Then `.material` is `THREE.Material | THREE.Material[]`. I need to cast that too. Let me use a helper or just cast directly.

Let me also double check: the geometry is shared (BoxGeometry instance is the same for all 25 cubes). That's fine - the requirement is about separate Mesh objects and separate materials, not separate geometries.

This looks good. Let me finalize.
