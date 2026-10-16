Let me write a complete TypeScript file that:

1. Creates a 30x30 grid (900) of boxes using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray → red, red → gray
8. Use Raycaster with NDC from canvas bounding rect, use intersection.instanceId
9. Flag instance colors for upload after changing
10. Expose scene, camera, renderer, mesh, ready flag

Let me think about the camera position. The grid is 30x30 with spacing 1.0, so it spans from -14.5 to +14.5 in both X and Y (since 30 cells, centered, spacing 1.0, the positions go from -14.5 to 14.5). Wait, let me recalculate: 30 cells, indices 0 to 29, centered means positions from -14.5 to +14.5 (step 1.0). So the grid spans 29 units in each direction, plus box size 0.8, so total span is about 29.8.

For a perspective camera looking straight at the grid (along Z axis), I need to position it at some distance on the Z axis. The camera looks at the origin. The grid is in XY plane.

For a perspective camera with FOV, to see the whole grid: The grid spans about 29.8 units in X and Y. If the camera is at distance d along Z, the visible height at the grid plane is 2*d*tan(fov/2). I need this to be at least 29.8 + margin.

Let's use FOV = 45 degrees. Then visible height = 2*d*tan(22.5°) = 2*d*0.4142 = 0.8284*d. For 30 + margin (say 35), d ≈ 35/0.8284 ≈ 42.2. Let's use d = 45 to be safe.

Actually, let me be more precise. The grid positions: for i in 0..29, position x = i - 14.5, so from -14.5 to 14.5. The box has size 0.8, so the outermost boxes extend to ±14.5 ± 0.4 = ±14.9. So total span is 29.8. With margin, let's say we want to see 32 units. 

Visible height at distance d with FOV θ: 2*d*tan(θ/2). For FOV=45°, tan(22.5°)≈0.4142. So 2*d*0.4142 ≥ 32 → d ≥ 38.8. Let's use d=40.

Actually, I'll just use a generous distance like 50 and FOV 40 to be safe.

For the raycaster: I need to get the mouse position relative to the canvas, then convert to NDC:
- x_ndc = ((event.clientX - rect.left) / rect.width) * 2 - 1
- y_ndc = -((event.clientY - rect.top) / rect.height) * 2 + 1

Then raycaster.setFromCamera(ndcVector, camera).

For the InstancedMesh:
- Geometry: BoxGeometry(0.8, 0.8, 0.8)
- Material: MeshBasicMaterial({ color: 0xffffff })
- Count: 900
- Set each instance's position via matrix
- Set each instance's color via setColorAt

The grid is in XY plane, so the boxes are at z=0 (or some z). The camera looks along Z axis at the grid.

Wait, "Grid in the XY plane facing the camera" - so the grid lies in the XY plane and the camera is looking at it from the Z direction. That means the boxes are at z=0 and the camera is at positive z looking toward origin.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // some dark background

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

// InstancedMesh
const gridSize = 30;
const count = gridSize * gridSize;
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(boxGeometry, material, count);

const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);

const dummy = new THREE.Object3D();
let idx = 0;
for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const x = col - (gridSize - 1) / 2;
    const y = row - (gridSize - 1) / 2;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const isRed: boolean[] = new Array(count).fill(false);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  mouse.set(x, y);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length > 0) {
    const id = intersects[0].instanceId!;
    isRed[id] = !isRed[id];
    mesh.setColorAt(id, isRed[id] ? red : gray);
    mesh.instanceColor!.needsUpdate = true;
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, the instructions say "Motion must use delta/elapsed time, not frame counts." But there's no animation here - "No camera movement, no animation." So I just need to render. I'll still use setAnimationLoop but no delta needed since there's no motion.

Let me also make sure `instanceId` is properly typed. In Three.js, `Intersection.instanceId` is `number | undefined`. I should handle that.

Actually, looking at the Three.js types, `intersection.instanceId` is `number | undefined`. I'll use a non-null assertion since we know the mesh has instances.

Let me also check: `mesh.setColorAt` requires that `mesh.instanceColor` exists. After the first `setColorAt` call, it creates the `instanceColor` attribute. So after setting all colors, `mesh.instanceColor` should be defined. I'll use `!` for the needsUpdate flag.

Let me also consider: the instructions say "No external assets (no textures, models, fonts or network requests)." I'm not using any, so that's fine.

One more thing: the instructions say the page has no other HTML. So I just append the canvas to document.body. I should also make sure body has no margin to avoid issues, but since I can't add HTML... actually I can set body style via JS. Let me add `document.body.style.margin = '0';` to avoid default margins.

Let me finalize the code.
