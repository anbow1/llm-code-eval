We need answer single ts code block. Need ensure strict compile. Need import Three. Render grid 30x30 boxes in XY plane facing camera. Box size 0.8 spacing 1 centered origin. If 30 instances along x, positions from -14.5 to 14.5 if spacing 1; grid extent 29 + 0.8? The centers range 29 units, plus half box .4 each side => 29.8 width. Camera perspective straight looking at grid. Need whole grid visible with margin. Use camera at z maybe 50, fov 45. Need ensure visible. Could use camera z ~ 50 with fov 50, view height at z 50 = 2*50*tan25 = 46.6, width aspect maybe 16/9 82.9. Grid width 29.8, height 29.8 visible. Good. If aspect small height still 46.6 > 29.8 margin. Fine.

Box geometry 0.8 x 0.8 x 0.8? Grid in XY plane facing camera. A box centered at z=0 extends in z. Camera looking at origin along -z? If camera at (0,0,50) looking at origin, sees XY faces. Use BoxGeometry(0.8,0.8,0.8). Fine. Material MeshBasicMaterial({color: 0xffffff}) white. InstancedMesh count 900. Set colors per instance. Need set instance matrices. Since instance positions centered. i index = row*30+col. x = (col - 14.5)*1; y = (14.5 - row)*1 maybe. All z=0. Use dummy Object3D.

setColorAt requires instanceColor allocated. First call creates. Need setColorAt for each. Then instanceColor.needsUpdate = true maybe after initialization. Expose mesh. Raycaster click listener. Use canvas bounding rect, pointer coords: rect = renderer.domElement.getBoundingClientRect(); x = ((event.clientX - rect.left)/rect.width)*2 -1; y = -((event.clientY - rect.top)/rect.height)*2 +1. Raycaster.setFromCamera(new THREE.Vector2(x,y), camera); intersectObject(mesh); if intersects length >0, id = intersects[0].instanceId; if id !== undefined. Toggle current color? Need know state independently. Could use a Uint8Array state of 900 booleans red? Or read color from color buffer? Simpler states. But every starts gray. On click toggle boolean. Set color. mesh.instanceColor.needsUpdate = true. Need strict TS. instanceColor may be null. Check. Use mesh.instanceColor!.needsUpdate maybe in handler if exists. Since setColorAt ensures. But strict null: can do if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; Also need setColorAt. Mesh setColorAt signature color: Color. Fine.

Potential issue tsc strict with `import * as THREE from 'three';` and `three/addons/...` no addons needed. Need no other meshes at all – only InstancedMesh. A scene can have no other meshes. Lights not meshes? MeshBasicMaterial no lights. Could just scene.add(mesh). No other objects.

Need maybe set renderer pixel ratio? Not required. Use renderer.setSize etc. Append canvas to body. Since body may have default margin, maybe set style? Page no other HTML. Could set body margin 0 and overflow hidden. Is that okay? We can set document.body.style.margin = '0'; document.body.style.overflow = 'hidden'; Use renderer.domElement maybe display block.

Need first frame ready after renderer.render. We can use a boolean firstFrameRendered. In animation loop: update? no animation. Renderer render. if not ready then __ready = true. But if animation loop continues, okay. Need use delta/elapsed? No animation. But requirement says motion must use delta/elapsed time, not frame counts. There is no motion. Could compute clock and pass unused? Not necessary. But use renderer.setAnimationLoop(animate) and render every frame. No frame count based motion. Could include const clock = new THREE.Clock(); const delta = clock.getDelta(); but unused can cause noUnused? tsc --strict doesn't enable noUnusedLocals by default? Actually --strict does not include noUnusedLocals/Parameters. But better avoid unused. The render loop no time needed. The requirement "Motion must use..." no motion.

Need expose after creation. Expose __scene, __camera, __renderer. And __mesh. Need also __ready after first frame.

Need camera aspect and renderer size. `const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000); camera.position.set(0,0,50); camera.lookAt(0,0,0);` In resize update aspect and updateProjectionMatrix. Renderer setSize.

Need whole grid visible with margin regardless aspect? If narrow aspect mobile portrait, vertical field 46 at z=50, horizontal field = vertical*aspect. For aspect 0.5, width 23 < 29.8, grid not visible. Better compute camera distance to fit both dimensions with margin, keep looking straight. Since aspect unknown. Need ensure full grid visible. Could set camera z based on aspect and fov dynamically in updateCamera. Grid extent half = (29 + 0.8)/2 = 14.9. Margin maybe 1.15 -> half required 17.135. Need compute distance for vertical fit: halfHeight = tan(fov/2)*distance, distance = halfH / tan. For horizontal: halfWidth = tan(fov/2)*distance*aspect, distance = halfW/(tan*aspect). Use max. FOV 45 -> tan22.5=0.4142. Distance vertical = 17.135/0.4142=41.37; horizontal if aspect 0.5 = 82.7. Set camera z = distance. Far plane 1000 enough. near 0.1. For extreme aspect maybe. Good. We can compute on resize. FOV 45. Use margin factor 1.2. gridHalf = (29 + 0.8)/2 = 14.9. Need maybe perspective projection object at z=0. boxes have depth extends z ±0.4. When looking at, front faces at z=+0.4, back at -0.4. Camera distance should account. Use grid half plus box depth? We can simply margin. Distance to front plane differs. Fine.

Set camera at (0,0,distance). lookAt origin. Need no camera movement, but initial distance computed. On resize camera position changes (not movement in animation). Is that okay? "No camera movement, no animation" likely means no animated movement. Resizing changes aspect and fit. Fine.

Could set camera z each resize. Need render.

Potential issue with Raycaster and orth? Perspective. Use raycaster.intersectObject(mesh). Intersection of InstancedMesh. Works. Need `intersects[0].instanceId` maybe undefined for non instanced. fine.

Question: Box size 0.8, spacing 1.0. InstancedMesh count 900. Matrix translation. Need all z same. Centered. For 30 columns, positions: (c - (30-1)/2)*1 = c -14.5 => [-14.5,14.5]. For rows: (14.5 - r) maybe y from 14.5 to -14.5. centered.

Colors: Start gray. Use setColorAt(i, color). Need set after instance matrices. Also `mesh.instanceColor!.needsUpdate = true;` after init. For strict, instanceColor type? In Three.js types: InstancedMesh has instanceColor: InstancedBufferAttribute | null. setColorAt(index, color). Access via `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;`. Good.

Click handler: store red: Uint8Array(900) zeros. On click if id within [0,899] toggle. Need maybe if intersection instanceId could be undefined. Use `const id = intersects[0].instanceId; if (id === undefined) return;`. Then red[id] = red[id] ? 0 : 1. `const color = red[id] ? new THREE.Color(0xff0000) : new THREE.Color(0x808080);` Could avoid alloc? fine. Or reuse two colors constants. But setColorAt expects Color; can use redColor/grayColor. But if setColorAt copies values? In Three InstancedMesh.setColorAt copies to attribute and if instanceColor null creates. It doesn't retain reference I think. Safe to reuse. We'll use const colors.

Need note initial setColorAt: `mesh.setColorAt(i, new THREE.Color(0x808080));` 900 allocations; okay. Or one gray Color reused. In Three.js setColorAt stores color in attribute, no reference. Good. Use gray = new THREE.Color(0x808080); red = new THREE.Color(0xff0000). But if setColorAt copies? It calls color.toArray(this.instanceColor.array, index * 3). Yes. Fine.

Need type of event. Use `window.addEventListener('pointerdown', onClick);` function onClick(event: PointerEvent): void. Or 'click' event MouseEvent. Requirement Clicking. Use pointerdown perhaps. Better use 'click' with MouseEvent. Either. Use `renderer.domElement.addEventListener('pointerdown', onPointerDown);` But if canvas appended. Use event: PointerEvent. Need maybe prevent? no.

Coordinates: `const rect = renderer.domElement.getBoundingClientRect(); const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);` raycaster.setFromCamera(ndc, camera). Need import Vector2? Use THREE.Vector2.

Need ensure renderer domElement CSS fills? `renderer.domElement.style.display = 'block';` Body margin 0. On resize use window.innerWidth/height. Good.

Need set `renderer.setPixelRatio(window.devicePixelRatio)` maybe. But if no animation no issue. On resize update setPixelRatio? not necessary. Could set.

Need make `renderer.setAnimationLoop(render);` function render(): void. After render first frame sets ready. Use `let ready = false;` then if (!ready) { (window as any).__ready = true; ready = true; }. Note if using property name ready. Could set after render.

Need potential `tsc --strict` with DOM types includes window. Fine.

Need no external assets. Good.

Need "no other meshes at all" - scene contains only InstancedMesh. Could scene.background? Not a mesh. Fine. Maybe use background color? Not required. No extra objects. We can set scene background to maybe black? The boxes colored show. If background black, empty background click no changes. If white, gray boxes. We can set `scene.background = new THREE.Color(0x222222);` Is that an object? Not mesh. Fine. But requirement maybe background empty. Could leave default black. Fine.

Potential issue: MeshBasicMaterial white with vertexColors? Instance colors require `material.vertexColors`? For InstancedMesh, instanceColor is applied automatically if material supports vertex colors? Three.js InstancedMesh instanceColor works with MeshBasicMaterial without setting vertexColors? I believe yes: shaders include `#ifdef USE_INSTANCING_COLOR` if instanceColor exists. The material's color multiplies. No need vertexColors. In Three, WebGLPrograms parameters include instancingColor: object.isInstancedMesh && object.instanceColor !== null. The shader defines USE_INSTANCING_COLOR. So yes. Setting material white is correct.

Need maybe `mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)` optional. no.

Need set count. Use `const count = GRID * GRID; const mesh = new THREE.InstancedMesh(geometry, material, count);`

Need `const dummy = new THREE.Object3D();` update. `dummy.position.set(...); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);` After loop `mesh.instanceMatrix.needsUpdate = true;` Good.

Need maybe mesh.frustumCulled false? Since bounding sphere should encompass instances by default? InstancedMesh computes boundingSphere? I think it may. But after setting matrices, boundingSphere not automatically recalculated? Mesh raycast uses boundingSphere. InstancedMesh has computeBoundingSphere. If not computed, raycast may compute? Let's check. In InstancedMesh, boundingSphere null initially? The `raycast` in InstancedMesh: if `this.boundingSphere === null` this.computeBoundingSphere? I think it does in recent Three. But for rendering, frustum culling uses geometry boundingSphere not instance positions? InstancedMesh frustum culling uses boundingSphere computed? Need call `mesh.computeBoundingSphere()` after setting matrices to ensure rendering/raycasting. Also `mesh.computeBoundingBox()`? For raycast only boundingSphere. To be safe: `mesh.computeBoundingSphere();` after matrices. But types maybe InstancedMesh has method computeBoundingSphere(): void. Yes.

Alternatively set `mesh.frustumCulled = false;` avoid culling. For raycast, still need boundingSphere; InstancedMesh.raycast checks if boundingSphere null and computes? To be safe compute. Also when colors no issue.

Need ensure camera fits entire boxes including depth. Distance computed perhaps. Let's derive robust:

const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const halfExtent = ((GRID - 1) * SPACING + BOX_SIZE) / 2 = (29 + 0.8)/2 = 14.9.

fov 45. tan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)). Note THREE.MathUtils.degToRad.
margin = 1.2 perhaps. requiredHalf = halfExtent * margin = 17.88.
camera.position.z = Math.max(requiredHalf / tan, requiredHalf / (tan * aspect)) + boxDepthHalf maybe. Since box front at z=0.4, camera distance from front = z-0.4. If camera z set based on origin, the front face appears larger by factor cameraDist/(cameraDist-0.4). Need account: For a point at z=0.4, visible half extent at that z for given distance d (camera at z=d) = tan * (d - 0.4). Need d - 0.4 >= requiredHalf/tan => d >= requiredHalf/tan + 0.4. Similarly horizontal. So plus 0.5. Good. use `const cameraZ = Math.max(halfRequired / tan, halfRequired / (tan * aspect)) + BOX_SIZE / 2 + 0.1;` Actually front face at +0.4 toward camera. The required view half at z=+0.4. So yes d = needed/tan + 0.4. Add margin maybe already. For horizontal same: d = needed/(tan*aspect)+0.4. Use max. camera z. Good.

Could grid be clipped by near? near 0.1. d > 40. fine.

Need handle aspect in updateCamera on resize. Function updateCameraAndRenderer(): set renderer size, camera aspect, update projection, set z, lookAt. It should be called initially after renderer creation maybe before animation. Use `camera.lookAt(0,0,0);` after setting position. But camera direction unchanged. On resize position z changes; call lookAt.

Need no animation: render loop renders same. No movement. Could use `renderer.setAnimationLoop(() => { renderer.render(scene,camera); ... });` But requirement "Motion must use delta/elapsed time" no motion. Fine.

Need maybe "After the first frame is rendered, set __ready = true." With setAnimationLoop, first call after next animation frame. Good.

Potential concern: `window as any` in strict TS okay, but no `declare global`. Fine.

Need file compile zero errors. Check import. Since no addons. Use only `import * as THREE from 'three';`. Good.

Potential TypeScript strict issues: `event.clientX` for pointer event. If using window 'click', event type MouseEvent. Good.

`renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => { ... });` TypeScript overload accepts EventListenerOrEventListenerObject; with strictFunctionTypes maybe PointerEvent function parameter narrower than Event? DOM addEventListener has overload for `HTMLElementEventMap` and string? Actually on HTMLCanvasElement, addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any, ...) and generic `addEventListener(type: string, listener: EventListenerOrEventListenerObject, ...)`. For 'pointerdown', K is 'pointerdown', ev PointerEvent. Passing `(event: PointerEvent) => void` fine. However due overload with string maybe, but should compile. We can use `renderer.domElement.addEventListener('pointerdown', onPointerDown);` where function `function onPointerDown(event: PointerEvent): void`. Should be fine. Or use `'click'` with MouseEvent. Use click to match. Canvas gets click. Use `renderer.domElement.addEventListener('click', onClick); function onClick(event: MouseEvent): void { ... }`. Good.

Need maybe if event target not canvas? Since listener on canvas, fine.

Raycaster intersection instance id. `const intersections = raycaster.intersectObject(mesh);` The method signature `intersectObject<T extends Object3D>(object: T, recursive?: boolean, optionalTarget?: Intersection[]): Intersection[]`. It returns Intersection[]. `const hit = intersections[0]; if (!hit) return; const instanceId = hit.instanceId; if (instanceId === undefined) return;`. Good.

Need toggling color. `const isRed = toggleState[instanceId] === 1; toggleState[instanceId] = isRed ? 0 : 1; mesh.setColorAt(instanceId, isRed ? grayColor : redColor);` Wait if currently red -> turn gray. If state =1 (red), new state 0, color gray. Use `const newIsRed = toggleState[id] === 0; toggleState[id] = newIsRed ? 1 : 0; mesh.setColorAt(id, newIsRed ? redColor : grayColor);`. Need check state initial all 0. Good. Then `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;`. Also maybe `mesh.instanceColor!.needsUpdate` no.

Potential issue color state index bounds. instanceId should be 0..count-1. Add `if (instanceId < 0 || instanceId >= COUNT) return;`.

Need possibly prevent browser's default? not needed.

Need renderer.setClearColor? scene background. Maybe set scene.background = new THREE.Color(0x111111). The empty background raycast returns none. Fine. But if background same as gray? Gray boxes visible. Use 0x111111.

Need maybe antialias. `new THREE.WebGLRenderer({ antialias: true });`.

Need camera FOV constant. `const CAMERA_FOV = 45;`.

Need `const scene = new THREE.Scene(); scene.background = new THREE.Color(0x111111);`

Need set renderer size from window inner. Append. If body margin removed.

Potential issue if canvas receives click, but document.body style. fine.

Need expose. Could set `(window as any).__scene = scene;` etc. `(window as any).__mesh = mesh;`. `(window as any).__ready = false;`? Not required but maybe. Set only after first frame. Could leave. If tests check before first frame maybe undefined. Fine. Could set `(window as any).__ready = false;` initially. But requirement "After first frame set true". Setting false initial okay. Do that? Maybe no need. If do initial false, tests might expect false before. Fine.

Need no hidden extra meshes. If setting scene background no mesh. No lights. No helpers. Good.

Now answer with code block only. Need maybe include comments? Fine.

Let's ensure compile with strict. Let's think of TS issues with `mesh.setColorAt(instanceId, ...)`: In recent Three types, `setColorAt(index: number, color: Color): void`. Good. `mesh.instanceColor` type `InstancedBufferAttribute | null`. if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; Good.

Potential issue `mesh.computeBoundingSphere()` maybe types in InstancedMesh. In three r160, InstancedMesh has `computeBoundingBox(): void; computeBoundingSphere(): void;` yes.

Potential issue import package with no `three` types maybe module not found? The environment likely has. Fine.

Potential issue with `window.innerWidth` `const aspect = window.innerWidth / window.innerHeight;` if innerHeight zero? not relevant. Could guard Math.max. But no.

Let's consider camera position and lookAt. If camera at (0,0,d). lookAt(0,0,0) sets rotation, okay.

`function fitCamera(): void { const aspect = window.innerWidth / window.innerHeight; camera.aspect = aspect; camera.updateProjectionMatrix(); const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV); const tan = Math.tan(fovRad / 2); const halfExtent = ((GRID - 1) * SPACING + BOX_SIZE) / 2 * 1.15; const distanceForHeight = halfExtent / tan; const distanceForWidth = halfExtent / (tan * aspect); camera.position.set(0,0, Math.max(distanceForHeight, distanceForWidth) + BOX_SIZE / 2 + 1); camera.lookAt(0,0,0); }` Use aspect >? if aspect 0? no. Add 1 margin. Good.

Maybe camera too far and boxes small but visible. With desktop aspect 1.78, needed height 17.135/0.414=41.36 + 0.4 + 1=42.76. At distance 42.8, visible half height = 0.414*(42.4)=17.55, margin 1.18. width 31.2 half > 14.9. Good. For aspect 0.5, distanceForWidth=17.135/(0.414*0.5)=82.75 +1.4=84.15. visible width at z0 = 0.414*(84.15)*0.5 =17.4 half, good. Height half 34.8, huge margin vertical. Good.

Actually margin already in halfExtent 14.9*1.15=17.135. Plus +1. Good.

No camera movement during animation; resizing changes. Fine.

Need render with no animation. In render loop `renderer.render(scene, camera); if (!ready) { (window as any).__ready = true; ready = true; }`. But if test waits one frame. fine. Could set ready exactly after first render.

Need maybe use `requestAnimationFrame`? Requirement use renderer.setAnimationLoop. Use. Good.

Potential issue body canvas appended, pointer events on canvas. If style width/height not set? renderer.setSize sets width and height attributes and style width/height. Good. Body no other HTML.

Should we set `renderer.domElement.style.position = 'fixed'`? no.

Need maybe all boxes visible with camera behind? Camera at positive z looking at origin. Boxes at z=0. Faces toward camera. Good.

Raycaster from camera intersects boxes. It will hit the front face. instanceId works. Good.

InstancedMesh with MeshBasicMaterial has no depth? default depthTest true. Boxes opaque. Fine.

No other meshes at all: We create only one InstancedMesh. Scene contains no other. The canvas renderer isn't mesh. Good.

Could one argue InstancedMesh has one geometry and material, fine.

Need maybe `material.color` white. `new THREE.MeshBasicMaterial({ color: 0xffffff });` With instance colors, result exactly instance color? In shader, material color (white) * instanceColor => instanceColor. Good. Tone mapping? Renderer default toneMapping NoToneMapping in r? Default `NoToneMapping`? In recent three, default toneMapping is NoToneMapping? I think yes. But output color space sRGB may transform. Instance color values interpreted? Hmm "show exactly" likely means no lighting. Color management may adjust? Three.js default outputColorSpace = SRGBColorSpace, Color values maybe converted? `new THREE.Color(0x808080)` with color management enabled? In r152+, ColorManagement.enabled true, Color hex set as sRGB converted to linear? Actually Color.setHex(hex, colorSpace=SRGBColorSpace) converts to working linear. Then output re-encodes. The final displayed color matches hex. Fine. Red/gray exact. Good.

Need maybe use `THREE.Color` constants. When using setColorAt, color converted linear working, output linear->sRGB. fine.

Potential strict issue `function onClick(event: MouseEvent): void` but `addEventListener('click', onClick);` okay.

Potential noUnused? Not enabled but okay.

Need maybe `const COUNT = GRID * GRID;` Use for state. Good.

Potential `const toggleState = new Uint8Array(COUNT);` Good.

Need maybe `const gray = new THREE.Color(0x808080);` Use same for initial. `mesh.setColorAt(i, gray);` If setColorAt copies yes. Good. But after initial, if we later modify gray? We don't. Use grayColor. Good.

Now code:

```ts
import * as THREE from 'three';

const GRID = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const COUNT = GRID * GRID;
const HALF_GRID = (GRID - 1) / 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

const dummy = new THREE.Object3D();
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const index = row * GRID + col;
    dummy.position.set(col - HALF_GRID, HALF_GRID - row, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
}
mesh.instanceMatrix.needsUpdate = true;
mesh.computeBoundingBox();
mesh.computeBoundingSphere();

const grayColor = new THREE.Color(0x808080);
const redColor = new THREE.Color(0xff0000);
for (let i = 0; i < COUNT; i++) {
  mesh.setColorAt(i, grayColor);
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

const toggleState = new Uint8Array(COUNT);

scene.add(mesh);

function fitCameraAndRenderer(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const tanHalfFov = Math.tan(fovRad / 2);
  const halfExtent = ((GRID - 1) * SPACING + BOX_SIZE) / 2;
  const margin = 1.16;
  const requiredHalf = halfExtent * margin;
  const distanceForHeight = requiredHalf / tanHalfFov;
  const distanceForWidth = requiredHalf / (tanHalfFov * aspect);
  camera.position.set(0, 0, Math.max(distanceForHeight, distanceForWidth) + BOX_SIZE / 2 + 1);
  camera.lookAt(0, 0, 0);
}
fitCameraAndRenderer();

window.addEventListener('resize', fitCameraAndRenderer);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(mesh);
  const hit = intersections[0];
  if (!hit) return;

  const instanceId = hit.instanceId;
  if (instanceId === undefined) return;
  if (instanceId < 0 || instanceId >= COUNT) return;

  const newIsRed = toggleState[instanceId] === 0;
  toggleState[instanceId] = newIsRed ? 1 : 0;
  mesh.setColorAt(instanceId, newIsRed ? redColor : grayColor);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

renderer.domElement.addEventListener('click', onClick);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
(window as any).__ready = false;

let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

Check computeBoundingBox maybe not needed but okay. It compiles? Type definitions might not have computeBoundingBox on InstancedMesh? I recall InstancedMesh class extends Mesh; `computeBoundingBox()` and `computeBoundingSphere()` are in InstancedMesh. In some versions, yes. If not, code compile error. To be safe maybe avoid these methods and set `mesh.frustumCulled = false;` For raycasting, InstancedMesh raycast computes bounding sphere if null? Let's verify Three.js source. In r160 InstancedMesh:

```
raycast(raycaster, intersects) {
 const matrixWorld = this.matrixWorld;
 const raycastTimes = this.count;
 _mesh.geometry = this.geometry;
 _mesh.material = this.material;
 if (_mesh.material === undefined) return;
 if (this.boundingSphere === null) this.computeBoundingSphere();
 _sphere.copy(this.boundingSphere).applyMatrix4(matrixWorld);
 ...
}
```
So raycast handles. For rendering, InstancedMesh frustum culling maybe uses boundingSphere computed? WebGLRenderer projectObject: object.frustumCulled; if object.isMesh etc. For InstancedMesh, maybe uses object.boundingSphere? The Object3D has no boundingSphere. I recall WebGLRenderer's projectObject for InstancedMesh uses `object.frustumCulled` and `frustum.intersectsObject(object)` and `intersectsObject` uses object.geometry.boundingSphere for Mesh? For InstancedMesh, maybe `intersectsObject` checks object.boundingSphere if exists? In Three r160, Frustum.intersectsObject(object) {

```
if (object.boundingSphere !== undefined) {
 if (object.boundingSphere === null) object.computeBoundingSphere();
 _sphere.copy(object.boundingSphere).applyMatrix4(object.matrixWorld);
} else {
 const geometry = object.geometry;
 if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
 _sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);
}
return this.intersectsSphere(_sphere);
```
InstancedMesh has boundingSphere property. If null, `computeBoundingSphere` maybe called by Frustum? It expects object.computeBoundingSphere. So safe. Could leave default. But compute manually is safe if method exists. Need ensure tsc. Recent Three includes. likely. But to minimize risk, avoid computeBoundingBox/Sphere? However raycast computes itself. Rendering with InstancedMesh may compute. If no call, it might compute from geometry only, which is a single box at origin, causing frustum culling to cull instances when origin off screen? Actually Frustum.intersectsObject for InstancedMesh maybe uses object.boundingSphere property. If `boundingSphere` null, it calls object.computeBoundingSphere? Let's check r158. I think yes. So okay. But calling manually ensures. If type lacks, compile failure. Which is more likely? InstancedMesh definitely has computeBoundingSphere in recent types. Let's include. Or set `mesh.frustumCulled = false;` and no need. Raycast will compute. But for raycast, it checks if boundingSphere === null then compute. So no compile method usage. Let's set frustumCulled=false and remove compute calls. However raycast if boundingSphere null calls computeBoundingSphere internally. Good. If tsc strict, no issue. Could leave `mesh.computeBoundingSphere()`? I think safe. Need ensure compile. The question expects compile. I know Three.js Typescript has InstancedMesh:

```
export class InstancedMesh<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material | Material[]> extends Mesh<TGeometry, TMaterial> {
 constructor(geometry: TGeometry, material: TMaterial, count: number);
 instanceMatrix: InstancedBufferAttribute;
 instanceColor: InstancedBufferAttribute | null;
 count: number;
 instanceMatrix: InstancedBufferAttribute;
 ...
 setMatrixAt(index: number, matrix: Matrix4): void;
 getMatrixAt(index: number, matrix: Matrix4): void;
 setColorAt(index: number, color: Color): void;
 getColorAt(index: number, color: Color): void;
 computeBoundingBox(): void;
 computeBoundingSphere(): void;
 dispose(): void;
}
```
Yes. Fine.

Potential issue `renderer.domElement` is HTMLCanvasElement, addEventListener click onClick with MouseEvent. The generic `addEventListener` for Canvas has event map includes MouseEvent? yes.

Potential issue with `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` devicePixelRatio could be undefined? number. Fine.

Potential issue "No camera movement" - resizing changes camera position. If strict, tests may not resize, initial camera position computed. No animation. Fine.

Potential issue "Every instance starts with color 0x808080 set via setColorAt." We do. Good.

Potential issue "Clicking an instance toggles its color... Every instance toggles independently" We have per-instance state. Good.

Potential issue "Use THREE.Raycaster with normalized device coordinates from canvas bounding rect and use intersection.instanceId. Remember to flag instance colors for upload after changing them." We do.

Potential issue when clicking an instance behind others? With boxes and perspective, the raycaster may intersect multiple instances. intersections[0] is nearest. good.

Need maybe if click on empty background changes nothing. We return if no hit. Good.

Need maybe "no other meshes at all" We create BoxGeometry and material, no other Mesh. But InstancedMesh itself is a Mesh? It's one. Scene only that. fine.

Could include comments. The final answer just code block. Need nothing else. Use one code block. Good.

Let's think if any issue with `scene.background = new THREE.Color(0x111111);` no mesh. Fine.

Potential no animation and renderer setAnimationLoop: if page not focused? still. Good.

Maybe tests use `__ready` true after one frame and then click. Good.

Potential issue raycast with InstancedMesh instanceColor doesn't matter. Good.

Potential issue initial material color white and instanceColor set. Three's MeshBasicMaterial default toneMapped true? If tone mapping enabled, could alter color. Renderer default toneMapping NoToneMapping, so no. outputColorSpace sRGB. "exactly" likely okay. Could set `material.toneMapped = false;`? MeshBasicMaterial has `toneMapped` property? yes Material.toneMapped. But not necessary. Maybe set `renderer.toneMapping = THREE.NoToneMapping;` Default. Not needed. Could set to be safe. But no issue.

Need maybe the colors are converted and output. Fine.

Let's maybe avoid margin overcomplication. Good.

One subtlety: Boxes are in XY plane and camera looks straight. If boxes have depth 0.8, they overlap? spacing 1.0, size 0.8 gives gaps 0.2. Good. Centered. Whole grid extents ±14.9. Camera distance formula uses bounding half extent but boxes at corners with perspective: the projected extent of a corner at (14.9,14.9) maybe requires both x and y, but fitting width and height separately at z front is okay because rectangle corners project within if half width and half height fit. Because perspective projection: x_ndc = (x/(d-z?)) etc. For front plane z=0.4. At x=14.9,y=14.9, both fit. Good.

Actually camera at z=d, point at z=0.4. The distance along camera axis is d-0.4. NDC x = x / ((d-0.4)*tan*fov aspect). Fit. Fine.

Maybe camera near plane: near 0.1. d far. Good.

Potential issue boxes front z=0.4 and camera at d. Good.

Need maybe if aspect extremely wide, distanceForWidth smaller, height fits. Good.

Now final code.