The user wants a complete TypeScript file that:
1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one selected at a time
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with normalized device coordinates from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. Renderer created and appended to document.body
10. Window resize handling
11. setAnimationLoop for render loop
12. Expose __scene, __camera, __renderer, __ready
13. Must compile with tsc --strict
14. No external assets

Let me think about the layout:
- 5x5 grid in XY plane (facing camera, so cubes are in XY plane, camera looks along -Z or +Z)
- Cubes should be in the XY plane facing the camera - so they're arranged in X and Y, with Z=0
- Gaps between them
- Camera looks straight at the grid (along Z axis)

Let me plan the grid:
- 5x5 grid, cube size 1, gap 0.3 (so spacing is 1.3)
- Total width: 5*1 + 4*0.3 = 5 + 1.2 = 6.2
- Center at origin, so cubes range from -3.1 to +3.1 in X and Y

Camera:
- Position at (0, 0, some distance) looking at (0, 0, 0)
- Need to see the whole grid with margin
- FOV 45 or so, distance enough to see 6.2 units wide grid with margin

Let me calculate: if grid is 6.2 units wide, and we want some margin (say 10%), total view width should be about 7. With FOV 45 degrees, at distance d, the visible height is 2*d*tan(FOV/2) = 2*d*tan(22.5°) ≈ 2*d*0.4142 ≈ 0.828*d. For height 7, d ≈ 8.4. Let's use distance 10 for safety.

Actually let me be more careful. The grid spans from -3.1 to 3.1 in both X and Y (if cube size is 1 and gap is 0.3, spacing is 1.3, so positions are -2.6, -1.3, 0, 1.3, 2.6). Total span is 5.2 + 1 (cube size) = 6.2. With margin, let's say we want to see 8 units. At FOV 45, tan(22.5) ≈ 0.4142. Visible height at distance d = 2*d*0.4142. For 8 units: d = 8/(2*0.4142) ≈ 9.66. Let's use d = 10.

For raycasting, I need to:
1. Get canvas bounding rect
2. Compute NDC: x = ((event.clientX - rect.left) / rect.width) * 2 - 1, y = -((event.clientY - rect.top) / rect.height) * 2 + 1
3. Use raycaster.setFromCamera(ndc, camera)
4. Intersect with the 25 cubes

For the render loop, I'll use delta time but since there's no animation, I just render.

Let me write the code:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const CUBES = 5;
const CUBE_SIZE = 1;
const GAP = 0.3;
const SPACING = CUBE_SIZE + GAP;
const cubes: THREE.Mesh[] = [];
const SELECTED_COLOR = 0xff0000;
const DEFAULT_COLOR = 0x4488ff;

for (let row = 0; row < CUBES; row++) {
  for (let col = 0; col < CUBES; col++) {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: DEFAULT_COLOR });
    const cube = new THREE.Mesh(geometry, material);
    const x = (col - (CUBES - 1) / 2) * SPACING;
    const y = (row - (CUBES - 1) / 2) * SPACING;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Raycaster
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onPointerDown(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  // Deselect previous
  if (selectedCube) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(DEFAULT_COLOR);
    selectedCube = null;
  }
  
  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    (hit.material as THREE.MeshStandardMaterial).color.setHex(SELECTED_COLOR);
    selectedCube = hit;
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
let ready = false;
renderer.setAnimationLoop((time: number) => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, the requirement says "Motion must use delta/elapsed time, not frame counts." But there's no motion. I think that's fine - the rule is about IF there's motion, use time. Since there's no animation, I just render.

Actually, let me re-read: "Use renderer.setAnimationLoop for the render loop. Motion must use delta/elapsed time, not frame counts." Since there's no motion, I just need to use setAnimationLoop and render. That should be fine.

Let me also make sure the camera is positioned correctly. The grid spans:
- X: from -(4/2)*1.3 to +(4/2)*1.3 = -2.6 to 2.6, plus half cube = ±3.1
- Y: same

So total width/height is 6.2. With margin, I want the view to be about 8 units. At FOV 45, distance 10: visible height = 2*10*tan(22.5°) = 20*0.4142 = 8.28. That's good, gives about 1 unit of margin on each side.

Let me also make sure I handle the `strict` mode properly. All variables need types. Let me check:
- `cubes` is `THREE.Mesh[]`
- `selectedCube` is `THREE.Mesh | null`
- The event handler parameter is typed
- `ready` is a boolean

I think this is complete. Let me finalize.
