Let me think through this carefully.

Requirements:
1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera, with visible gaps.
2. Each cube has its OWN MeshStandardMaterial with color 0x4488ff.
3. Clicking a cube selects it: color becomes 0xff0000. Only one selected at a time; previously selected goes back to 0x4488ff.
4. Clicking empty background clears selection (all cubes 0x4488ff).
5. Use THREE.Raycaster with NDC computed from canvas bounding rect.
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin. No camera movement, no animation.
7. AmbientLight + DirectionalLight.
8. Import THREE from 'three'.
9. Create WebGLRenderer, append canvas to document.body.
10. Size from window.innerWidth/innerHeight, handle resize.
11. Use renderer.setAnimationLoop.
12. Expose __scene, __camera, __renderer.
13. After first frame, set __ready = true.
14. No external assets.
15. Must compile with tsc --strict.

Let me design the grid:
- 5x5 grid in XY plane. Let's say spacing = 2, cube size = 1. So gaps of 1 unit between cubes.
- Grid positions: for i in 0..4, j in 0..4: x = (i - 2) * spacing, y = (j - 2) * spacing, z = 0.
- Cube size: 1x1x1 BoxGeometry.
- Spacing: 2 (so gap is 1).
- Grid extent: from -4 to 4 in x and y (with cube size 1, extent is -4.5 to 4.5).

Camera:
- PerspectiveCamera looking at origin from positive Z.
- Need to fit the whole grid with margin. Grid extent is about 5 units (spacing 2, 5 cubes → range -4 to 4, plus half cube = -4.5 to 4.5).
- Let's place camera at z = 15 or so, with fov = 50 or 60.
- At z=15, with fov=50, the vertical extent visible is 2 * 15 * tan(25°) ≈ 2 * 15 * 0.466 ≈ 14. So the grid (9 units tall) fits with margin.

Raycaster:
- On click, compute NDC from event: 
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
- raycaster.setFromCamera({x, y} as THREE.Vector2, camera);
- Intersect with cubes array.
- If hit: select that cube. If previously selected, deselect it.
- If no hit: deselect all.

Let me write the code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const SPACING = 2;
const CUBE_SIZE = 1;
const gridSize = 5;
const cubes: THREE.Mesh[] = [];

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((i - 2) * SPACING, (j - 2) * SPACING, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection logic
let selected: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

function onPointerDown(event: PointerEvent): void {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const intersects = raycaster.intersectObjects(cubes, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    if (selected) {
      const mat = selected.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0x4488ff);
    }
    selected = hitMesh;
    const mat = hitMesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(0xff0000);
  } else {
    if (selected) {
      const mat = selected.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0x4488ff);
    }
    selected = null;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);

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

Wait, I need to be careful with tsc --strict. Let me check:
- All variables are typed.
- `event` in pointerdown is `PointerEvent` — that's fine.
- `rect` is `DOMRect` — fine.
- `ndcX`, `ndcY` are `number` — fine.
- `intersects[0].object` is `THREE.Object3D`, I cast to `THREE.Mesh` — fine.
- `selected` is `THREE.Mesh | null` — fine.
- The `ready` variable is `boolean` — fine.

Actually, I should use `let` for `ready` and it's initialized. Good.

Let me also make sure the scene background is set (not required but nice). Actually the requirement says "Clicking empty background clears the selection" — so the background should be visible. Setting scene.background is fine.

One more thing: "No camera movement, no animation of the cubes." — I'm not animating anything, just rendering. Good.

Let me also make sure I'm not using `frame counts` — I'm using setAnimationLoop which is time-based internally, and I'm not doing any time-based animation anyway. Good.

I think this is complete. Let me double-check the grid: 5x5 = 25 cubes. Positions range from -4 to 4 in both x and y (step 2). Cube size 1, so edges go from -4.5 to 4.5. That's a 9-unit span. Camera at z=15, fov=50: vertical extent = 2*15*tan(25°) ≈ 14.0. So margin is about 2.5 units on each side. Good.

The file should be self-contained and compile cleanly.
