We need to write a TypeScript file. Need to be careful: strict, no errors.

Requirements:
- 30x30 grid of boxes, one InstancedMesh only, no other meshes.
- Box size 0.8, spacing 1.0, centered origin, in XY plane facing camera.
- PerspectiveCamera looking straight at grid, whole grid visible with margin. Grid spans 30 units (positions from -14.5 to 14.5). Need camera distance such that visible. Camera at (0,0,d) looking at origin default -Z direction. Use fov 50. Need vertical extent 30 + margin. distance = (15+margin)/tan(fov/2) roughly. Use fov 50 → tan25=0.4663; half extent 15 → d=32.2. Use d=45 for margin. Also aspect ratio might be less than 1 if window narrow; horizontal extent needed 15 with aspect. If aspect < 1, horizontal FOV smaller, need check. We can just compute distance based on both. Simpler: camera fov 60, distance 50. Let's compute robust: choose fov = 50 (deg), camera aspect = w/h. Horizontal half-angle tangent = tan(vfov/2)*aspect. Need vertical half extent 15.5 and horizontal half extent 15.5. distance = max(15.5/tan(vfov/2), 15.5/(tan(vfov/2)*aspect)). Use margin 1.0 maybe. Let half = 15.5 (max coordinate 14.5 plus box half 0.4 = 14.9 plus margin). Use halfSize = 16. distance = max(16/tan(vfov/2), 16/(tan(vfov/2)*aspect)) * 1.05. Since aspect may change on resize, update camera distance? Requirement says no camera movement. Resize handling only aspect and renderer size. Could set camera position once with initial aspect; on resize maybe keep. But "whole grid visible with a margin" – better recompute distance on resize? That would be camera movement technically, but no animation. Hmm requirement says "No camera movement, no animation." Recomputing on resize maybe considered movement, but acceptable? Better set once and use fov large enough to handle typical aspect. But if window is narrow, grid might get cut. Let's just recompute camera position on resize to ensure visibility—this is not animation. But strict "No camera movement" probably means no animation. Keep static.

Actually simpler: camera at (0,0,60), fov 50, aspect from window. If aspect < ~1, horizontal FOV = 2*atan(tan(25°)*aspect). At aspect 0.5, half horizontal extent at distance 60 = 60*tan25*0.5=13.99 < 15. So grid clipped. We can set fov 60 and distance 60: tan30=0.577, at aspect 0.5 horizontal half = 17.3, vertical half = 34.6. Fine for wide. If aspect very small, still potential. Could use fov 70, distance 55: tan35=0.700, vertical half 38.5, horizontal half at aspect 0.3 = 11.5 < 15. Hmm. Let's compute distance based on aspect.

We'll implement a function updateCamera() that computes distance to fit grid with margin for current aspect, sets camera position. Called at init and on resize. That is static camera direction (0,0,1) looking at origin. Fine.

InstancedMesh: BoxGeometry(0.8,0.8,0.8). MeshBasicMaterial({ color: 0xffffff }) to show instance colors. Set colors via setColorAt for each instance to gray. instanceColor.needsUpdate = true after initial set? Yes.

Click handling: raycaster.setFromCamera with NDC computed from canvas bounding rect. Raycast against mesh. If intersect found, instanceId. Toggle color array stored, update setColorAt, instanceColor.needsUpdate = true.

Need to make sure raycast works with instance colors—yes.

Need to handle no other meshes. We add canvas only. No lights needed with MeshBasicMaterial.

Strict TS errors: 
- import * as THREE from 'three'; Addons not needed.
- document.body may be typed. window.innerWidth etc.
- intersection.instanceId possibly undefined. Check `const id = hit.instanceId; if (id !== undefined)`.
- Colors: `new THREE.Color(0x808080)`.

Need to expose __scene, __camera, __renderer, __mesh, __ready after first frame.

Animation loop: use setAnimationLoop; after first render set __ready true. Track firstFrame boolean.

Need to append renderer canvas to body and maybe set style margin 0 overflow hidden? Can set document.body.style.margin = '0'; overflow hidden; maybe background. Not required but okay.

Raycaster NDC: use canvas bounding rect:
```
const rect = renderer.domElement.getBoundingClientRect();
const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
```
Event type MouseEvent or PointerEvent. Use 'pointerdown' or 'click'. Clicking is click. Use click listener.

Need to ensure raycasting works with InstancedMesh and MeshBasicMaterial. Yes.

Potential issue: boxes in XY plane facing camera: BoxGeometry extends in Z too. Camera looking down -Z from +Z. Boxes size 0.8 in Z, fine.

Grid positions:
```
const cols = 30, rows = 30;
const spacing = 1.0;
const count = cols*rows;
const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshBasicMaterial({color:0xffffff}), count);
```
Positions: x = (i - (cols-1)/2)*spacing; y = (j - (rows-1)/2)*spacing; z=0. (cols-1)/2 = 14.5. So from -14.5 to 14.5. Good.

Set matrix:
```
const dummy = new THREE.Object3D();
dummy.position.set(x,y,0);
dummy.updateMatrix();
mesh.setMatrixAt(index, dummy.matrix);
```
Set colors array. Could store colors as Uint8? Use array of boolean or number. Simpler store `const colors: THREE.Color[] = ...`? To toggle, we need current state. Store `const isRed = new Uint8Array(count);` and a function.

Initial gray:
```
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
for (let i=0;i<count;i++) mesh.setColorAt(i, gray);
```
Note setColorAt requires instanceColor exists; it creates it if not? In Three.js, InstancedMesh.setColorAt sets instanceColor, creating if needed. Yes.

When toggling: if red, set gray; else set red. Then `mesh.instanceColor!.needsUpdate = true;` Strict: instanceColor is `InstancedBufferAttribute | null`. Use `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;`.

Also `mesh.instanceMatrix.needsUpdate = true;` not strictly needed after init but fine, set once.

Need to set `mesh.frustumCulled = false`? Not necessary but could. Since grid entirely visible.

Camera fit:
```
const CAM_FOV_DEG = 50;
const camera = new THREE.PerspectiveCamera(CAM_FOV_DEG, window.innerWidth/window.innerHeight, 0.1, 500);
const halfExtent = 15.5; // half of 30 grid = 15, plus box half 0.4 = 15.4. Add margin: 15.8?
```
Max coordinate: 14.5 + 0.4 = 14.9. Margin e.g. 1.0 => 15.9. Use `const requiredHalf = 15.9;`.

Compute distance:
```
function updateCameraDistance() {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const tanHalf = Math.tan(vFov / 2);
  const aspect = camera.aspect;
  const dV = requiredHalf / tanHalf;
  const dH = requiredHalf / (tanHalf * aspect);
  const dist = Math.max(dV, dH) * 1.05;
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
}
```
But camera.fov is in degrees. Good.

On resize:
```
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
updateCameraDistance();
renderer.setSize(window.innerWidth, window.innerHeight);
```
Camera position changes with resize, but static otherwise. Acceptable.

Maybe if aspect very wide, vertical fit dominates; good.

Initial camera aspect set before update.

Renderer:
```
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```
Set body style.

Scene:
```
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // maybe white? But if clicking empty background changes nothing; white background with white? Instance colors gray/red. Use a different background like 0x222222 for contrast. But MeshBasicMaterial white and instance colors show exactly. Background can be dark. Let's use 0x101010.
```
No other meshes.

Animation loop:
```
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```
Elapsed time not used since no animation. But requirement "Motion must use delta/elapsed time, not frame counts." No motion. Fine. Could compute delta but not needed. Maybe have no animation. setAnimationLoop still renders continuously. That's fine.

Need to expose __mesh.

Click handler:
```
renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length === 0) return;
  const id = hits[0].instanceId;
  if (id === undefined) return;
  ...
});
```
Raycaster should be created. `raycaster.setFromCamera(coords, camera)`.

Potential issue: `hits[0].instanceId` type number | undefined. Good.

Toggling:
```
if (isRed[id]) { mesh.setColorAt(id, gray); isRed[id] = 0; } else { mesh.setColorAt(id, red); isRed[id] = 1; }
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
```
Need colors object reused; setColorAt copies color into attribute. Good.

Strict errors about `window as any` okay.

Potential TS error: `renderer.setAnimationLoop` callback type maybe `(time: number, frame?: XRFrame) => void`. Our callback with no params is fine.

Need strict: `THREE.MathUtils` exists. `THREE.Vector2`.

Need import only `three`. No addons.

Need no external assets.

Check `document.body.style.margin = '0';` etc.

Let's think about whether InstancedMesh instanceColor updates cause material to use instance colors. MeshBasicMaterial with white color, vertexColors? Three.js handles instanceColor automatically. Yes, shader uses instanceColor if present. Actually in Three.js, `USE_INSTANCING_COLOR` define is set when instanceColor exists. It multiplies material color by instance color. So white material shows exact instance color. Good.

Potential issue: When initializing `setColorAt` after setting matrices, instanceColor created. Good.

Potential issue: Raycasting InstancedMesh with BoxGeometry works. Yes. But `raycaster.intersectObject(mesh, false)` returns intersections. Need ensure mesh not culled; but raycaster doesn't use frustum. Fine.

Potential issue: click empty background: hits empty. Good.

Potential issue: If boxes overlap? spacing 1.0, size 0.8, gaps 0.2. Good.

Potential issue: Whole grid visible with margin. requiredHalf 15.9 maybe. Grid half extent = 15.0 (center positions ±14.5 plus 0.4 = 14.9). Actually outermost edge = 14.5+0.4=14.9. So requiredHalf 15.9 gives 1.0 margin. Fine. Distance computed.

Camera near/far: set near 0.1 far 1000 to accommodate distance ~ maybe 43. Good.

Let's compute distance with fov 50, aspect 1: tan25=0.4663, d=15.9/0.4663=34.1, *1.05=35.8. Camera at z=35.8. Grid edges at z ±0.4. Fine.

If aspect 0.5: dH=15.9/(0.4663*0.5)=68.2, *1.05=71.6. Far 1000. Good.

But `camera.position.set(0,0,dist)` and `lookAt(0,0,0)`. Camera looks down -Z. Good.

Need `camera.updateProjectionMatrix()` after aspect change.

Does `updateCameraDistance` need camera.aspect set first. Yes in resize: set aspect, update projection, update distance.

Potential subtlety: The camera's fov is 50 degrees vertical. The grid vertical half extent 15.9. Distance computed from vertical and horizontal. Good.

Now code structure.

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const COLS = 30;
const ROWS = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const COUNT = COLS * ROWS;

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // optional
scene.add(mesh);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
const isRed = new Uint8Array(COUNT);

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    const x = (c - (COLS - 1) / 2) * SPACING;
    const y = (r - (ROWS - 1) / 2) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, gray);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
```

Wait `mesh.setColorAt` before instanceColor exists. It creates. Good.

Raycaster:
```
const raycaster = new THREE.Raycaster();
```

Camera distance function:
```
function fitCamera() {
  const halfExtent = 15.9;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
  const distV = halfExtent / tanHalfFov;
  const distH = halfExtent / (tanHalfFov * camera.aspect);
  const distance = Math.max(distV, distH) * 1.05;
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
}
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
fitCamera();
```

On resize:
```
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});
```

Note if `window.innerHeight` 0? unlikely. Could guard: `const aspect = window.innerWidth / Math.max(1, window.innerHeight);` use that. But camera aspect from requirement. Fine.

Click:
```
renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersections = raycaster.intersectObject(mesh, false);
  if (intersections.length === 0) return;
  const instanceId = intersections[0].instanceId;
  if (instanceId === undefined) return;
  if (isRed[instanceId]) {
    mesh.setColorAt(instanceId, gray);
    isRed[instanceId] = 0;
  } else {
    mesh.setColorAt(instanceId, red);
    isRed[instanceId] = 1;
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
});
```

One potential issue: `raycaster.intersectObject(mesh, false)` with `recursive` false. Fine.

Need exports:
```
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Ready:
```
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

Could add `renderer.domElement.style.cursor = 'pointer'` not necessary.

Strict TS: `THREE.DynamicDrawUsage` exists in Three.js types? Yes, `DynamicDrawUsage` constant. But we don't need setUsage; remove to simplify. Actually instanceMatrix is set once, set usage default. Fine.

Potential strict noUnusedLocals? We use all. Good.

Potential issue: `mesh.instanceColor` property type may be `InstancedBufferAttribute | null`. We check.

Potential issue: `isRed` typed Uint8Array. Good.

Potential issue: `new THREE.MeshBasicMaterial({ color: 0xffffff })` with instance colors. Good.

Potential issue: `scene.background` with MeshBasicMaterial. Fine.

Potential issue: If window.devicePixelRatio undefined? It's number. `Math.min(window.devicePixelRatio, 2)` fine.

Potential issue: `renderer.domElement.style.display = 'block';` okay.

Potential issue: `document.body` may not exist? In browser yes.

Need maybe make camera aspect 1 initially? No.

Let's consider requirement "No camera movement, no animation." Our setAnimationLoop renders continuously but scene static. That's okay, no animation. Could render only once? But requirement use setAnimationLoop. We use it. Motion must use delta/elapsed time, not frame counts. Since no motion, fine.

Could set `renderer.setAnimationLoop` and render every frame. That's still no animation visually.

Potential concern: Clicking instances after resize with camera reposition changes. Fine.

Potential concern: Raycasting uses camera projection matrix. If camera position updated, fine.

Potential concern: The boxes are in XY plane facing camera, but BoxGeometry edges maybe. Good.

Potential concern: InstancedMesh raycasting with no matrix updates? The mesh matrixWorld is identity, scene added. Fine.

Potential concern: `mesh.setColorAt` requires instanceColor allocated. The first call creates it. In Three.js source:
```
setColorAt(index, color) {
  if (this.instanceColor === null) {
    this.instanceColor = new InstancedBufferAttribute(new Float32Array(this.count * 3), 3);
  }
  color.toArray(this.instanceColor.array, index * 3);
}
```
Yes.

Potential concern: In newer Three.js versions, `instanceColor` type maybe `InstancedBufferAttribute | null`. Check.

Potential concern: `Color.toArray` writes. Fine.

Potential concern: strict type for `raycaster.setFromCamera(coords, camera)`: coords `Vector2`. Good.

Potential concern: event listener type in TS: `(event: MouseEvent) => void` works for `click`. Good.

Potential concern: if `intersections[0]` maybe undefined due to noUncheckedIndexedAccess? Not enabled by default in strict? `strict` includes noImplicitAny, strictNullChecks, but not noUncheckedIndexedAccess. So indexing fine. But if `--strict` only, `intersections[0]` type Intersection. Good.

Potential concern: `mesh.setColorAt(instanceId, gray)` where `instanceId` number. Good.

Let's maybe add `renderer.domElement.style.touchAction = 'none'`? Not needed.

Need reply only code block. Fine.

Let's double-check geometry and grid: 30x30 = 900. count = 900. Good.

Spacing: positions from -14.5 to 14.5. Gaps 0.2. Good.

Box size 0.8. Good.

Camera fits whole grid: outermost edge 14.9. requiredHalf 15.9. Good.

Maybe `distance = Math.max(distV, distH) * 1.05` ensures margin. Actually if aspect < 1, distH larger; if aspect > 1, distV. With distance computed, half vertical visible = dist * tan = halfExtent * 1.05 = 16.7, enough. Good.

Potential issue: `camera.lookAt(0,0,0)` after position set. It updates quaternion. Good.

Let's write final.