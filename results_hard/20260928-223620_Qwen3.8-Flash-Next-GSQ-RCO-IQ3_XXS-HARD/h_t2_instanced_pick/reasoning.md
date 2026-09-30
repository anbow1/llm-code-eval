The user wants a single TypeScript file that:

1. Creates a 30x30 grid of boxes using ONE InstancedMesh
2. Grid in XY plane, facing camera
3. Box size 0.8, spacing 1.0 (gaps visible)
4. Centered on origin
5. PerspectiveCamera looking straight at the grid, whole grid visible with margin
6. No camera movement, no animation
7. Every instance starts with color 0x808080 via setColorAt
8. MeshBasicMaterial (white) so instance colors show exactly
9. Clicking an instance toggles color: gray (0x808080) <-> red (0xff0000)
10. Each instance toggles independently
11. Clicking empty background changes nothing
12. Use THREE.Raycaster with NDC from canvas bounding rect
13. Use intersection.instanceId
14. Flag instance colors for upload after changing
15. Expose (window as any).__mesh = mesh

Let me think about the layout:
- 30x30 grid, spacing 1.0, box size 0.8
- Centered on origin: positions from -14.5 to 14.5 in both X and Y
- The grid extends from -14.5 to 14.5, so total size is 29 units wide/tall
- Camera looking straight at the grid (along -Z direction, camera at some Z position)

Camera setup:
- PerspectiveCamera, looking at origin
- Need to ensure whole grid is visible with margin
- Grid is 29x29 units in XY plane at Z=0
- Camera at (0, 0, some_distance) looking at (0, 0, 0)
- For perspective camera: at FOV 60°, to see 29 units height with some margin, we need distance such that: 2 * d * tan(FOV/2) > 30 (with margin)
- tan(30°) ≈ 0.577, so 2 * d * 0.577 > 30 → d > 26
- Let's use d = 30 to have margin

Actually, let me reconsider. The grid spans from -14.5 to 14.5 in both X and Y (30 boxes with spacing 1.0, centered). So the grid is 29 units in each dimension (from center of first to center of last). With box size 0.8, the actual extent is 29 + 0.8 = 29.8.

Camera at z = 30 should work with FOV 60.

Let me write the code:

```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera - looking straight at the grid (along -Z)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

// InstancedMesh: 30x30 = 900 instances
const count = 900;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

// Set instance transforms
const matrix = new THREE.Matrix4();
const color = new THREE.Color();
let index = 0;
for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 30; j++) {
    const x = (i - 14.5) * 1.0;
    const y = (j - 14.5) * 1.0;
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(index, matrix);
    color.set(0x808080);
    mesh.setColorAt(index, color);
    index++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Track colors
const colors = new Array<number>(count).fill(0x808080);

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length > 0) {
    const id = intersects[0].instanceId;
    if (id !== undefined) {
      if (colors[id] === 0x808080) {
        colors[id] = 0xff0000;
        color.set(0xff0000);
      } else {
        colors[id] = 0x808080;
        color.set(0x808080);
      }
      mesh.setColorAt(id, color);
      mesh.instanceColor!.needsUpdate = true;
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
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check potential issues:

1. `mesh.instanceColor` is `THREE.InstancedBufferAttribute | null` in newer Three.js. Using `!` non-null assertion should work since we called setColorAt which creates it.
2. `intersects[0].instanceId` is `number | undefined` in the type definition. The check `if (id !== undefined)` handles it.
3. The click event handler - `event` parameter type should be fine.

Actually, let me double-check: in strict mode, `renderer.domElement.addEventListener('click', ...)` - the event parameter might need to be typed. Let me use `(event: MouseEvent)` explicitly.

Also `mesh.instanceColor` - in Three.js types, it's `THREE.InstancedBufferAttribute | null`. After setColorAt is called, it should not be null. But TypeScript might not know that. Using `!` assertion should be fine for strict mode.

Let me also make sure `intersectObject` returns the right type. `raycaster.intersectObject(mesh)` returns `THREE.Intersection[]`. Each intersection has `instanceId?: number | undefined`.

I think the code is solid. Let me finalize it.
