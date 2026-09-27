The user wants a single TypeScript file that:

1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera, with visible gaps between them.
2. Each cube has its OWN MeshStandardMaterial with color 0x4488ff.
3. Clicking a cube selects it (color becomes 0xff0000). Only one at a time; previously selected goes back to 0x4488ff.
4. Clicking empty background clears selection (all cubes 0x4488ff).
5. Use THREE.Raycaster with NDC computed from canvas bounding rect.
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin. No camera movement, no animation.
7. AmbientLight + DirectionalLight.
8. No other meshes.

Let me plan:

- 5x5 grid in XY plane. Each cube is 1 unit size, gap between them maybe 0.2. So spacing = 1.2.
- Grid centered at origin. Positions: for i, j in 0..4, x = (i - 2) * spacing, y = (j - 2) * spacing.
- Camera at z = some distance looking at origin. Need to see the whole grid with margin.
- Grid total width/height = 4 * 1.2 = 4.8 (from -2.4 to 2.4). With margin, camera needs to be far enough.
- With a perspective camera with FOV 45°, at distance d, the visible height is 2 * d * tan(22.5°). Need this to be at least 4.8 + margin. Let's say we want visible height ~ 7 or so. d = 3.5 / tan(22.5°) ≈ 3.5 / 0.4142 ≈ 8.45. Let's use d = 10 for good margin.
- Camera at (0, 0, 10) looking at (0, 0, 0).

- Raycaster: on click, compute NDC from canvas bounding rect:
  - rect = canvas.getBoundingClientRect()
  - ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
  - ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1

- Lights: AmbientLight(0xffffff, 0.5) + DirectionalLight(0xffffff, 1) from some angle.

- Animation loop: just render, no motion. Use setAnimationLoop.

- Handle resize.

- Expose __scene, __camera, __renderer, and set __ready after first frame.

Let me write the code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const CUBE_SIZE = 1;
const GAP = 0.2;
const SPACING = CUBE_SIZE + GAP;
const GRID = 5;
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    const x = (i - (GRID - 1) / 2) * SPACING;
    const y = (j - (GRID - 1) / 2) * SPACING;
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

  // Deselect previous
  if (selectedCube) {
    selectedCube.material.color.setHex(0x4488ff);
    selectedCube = null;
  }

  if (intersects.length > 0) {
    selectedCube = intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    selectedCube.material.color.setHex(0xff0000);
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

Wait, the user says "No camera movement, no animation of the cubes." and "Motion must use delta/elapsed time, not frame counts." But there's no motion here. The setAnimationLoop is still required by the hard rules. I'll just render in the loop without any time-based motion.

Actually, re-reading the rules: "Motion must use delta/elapsed time, not frame counts." This is a constraint IF there is motion. Since there's no motion, I don't need to track delta time. But I should still use setAnimationLoop as required.

Let me also make sure the geometry is shared (same BoxGeometry instance) but materials are separate. That's fine.

Let me double-check: "Do not add any other meshes." - I'm only adding the 25 cubes and lights. Lights are not meshes. Good.

The scene background color - I'll set it to something dark so the "empty background" click makes sense. Actually, clicking on the background (where no cube is hit by the raycaster) should clear selection. That's handled by the `if (intersects.length > 0)` check.

One issue: `tsc --strict` compliance. Let me check types carefully.

- `renderer.domElement` is an HTMLCanvasElement, which is a valid event target.
- `intersects[0].object` is of type `Object3D`, so I need to cast it.
- The `cubes` array type should work.

Actually, let me reconsider the type. `THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>` - in newer Three.js types this should work. But to be safe with strict mode, let me use `THREE.Mesh` and cast where needed.

Let me also make sure I'm not using any deprecated APIs.

I think the code is solid. Let me finalize it.
