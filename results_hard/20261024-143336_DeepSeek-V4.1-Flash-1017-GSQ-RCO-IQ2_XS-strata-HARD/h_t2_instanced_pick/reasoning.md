We need write one TS file. Need ensure strict compile. Need think through details.

We need render 30x30 grid boxes one InstancedMesh, no other meshes at all. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered origin. PerspectiveCamera straight at grid, whole grid visible with margin. No animation / camera movement? But use setAnimationLoop for render loop. Motion must use delta elapsed, but no animation. We can just render each frame. Need __ready after first frame rendered.

Need click raycasting, NDC from canvas bounding rect, instanceId, toggle per instance, setColorAt, instanceColor.needsUpdate = true.

Need create renderer append to body. Canvas has no other HTML. Should set background? Maybe default black. Need maybe handle pixel ratio? Not required. Size from window.innerWidth/innerHeight. Use setAnimationLoop. Need strict TS.

Potential issue: InstancedMesh color initially. To use per-instance colors, need call setColorAt for every instance. Material vertexColors? For InstancedMesh, setColorAt activates instanceColor; MeshBasicMaterial with white color supports instance color automatically? Three.js: InstancedMesh instanceColor used if material has vertexColors? Let's recall. In WebGLProgram, if object.isInstancedMesh and object.instanceColor !== null, USE_INSTANCING_COLOR define. It multiplies diffuse color by instance color regardless of vertexColors? In three r160, instance color included. MeshBasicMaterial white. Good.

Need boxes: use BoxGeometry(0.8,0.8,0.8). But grid in XY plane facing camera: boxes have depth 0.8 along z. Camera looking along -z or +z? If camera at (0,0,d) looking at origin, boxes front faces at z=+0.4. Click raycast hits them. Grid coordinates x,y spacing 1 centered. For 30x30: indices 0..29, coordinate = (i - 29/2) * 1.0 = i - 14.5. So extents -14.5..14.5 plus 0.4 = ±14.9. Need camera whole grid visible with margin. Perspective fov maybe 50, aspect likely. Need compute camera distance to fit 29.8 wide/high. For vertical FOV, with square window (but could be non-square), ensure both width and height visible. Use fov 50, aspect. Camera at (0,0,D), D such that vertical extent fits with margin. Half-height needed = (14.9)*1.1 ~16.4. tan(25°)=0.4663, D=16.4/0.4663 ≈35.2. But width if aspect large. For aspect <1 (portrait), horizontal fov smaller, need D based on half-width / tan(hfov). Could compute robustly on resize? Need camera fixed? "No camera movement" but aspect updates on resize. Whole grid visible with margin. We can compute camera position based on window aspect and set fixed after? On resize camera aspect changes; we can adjust camera position maybe that is camera movement? They likely mean no animation. But "No camera movement" means static. Yet resize needs aspect. If camera position depends on aspect, at initialization only; on resize could reposition to keep visible. Hmm. Requirement handle window resize camera aspect + renderer size. It doesn't explicitly require reposition. We can set camera distance large enough to handle typical portrait. But window could be narrow. Need ensure whole grid visible with margin. Could use fov 45 and distance based on both dimensions at initial. If resized narrower, maybe not visible. But maybe okay for test. Better set camera based on aspect at all times? It is movement on resize but not animation. Could perhaps choose very large distance to fit vertical and horizontal for aspect up to maybe 0.5? For 30 grid wide 29.8. For aspect 0.5, horizontal half-angle: hfov = 2 atan(tan(vfov/2)*aspect). Need D = halfWidth / tan(hfov/2) = halfWidth / (tan(vfov/2)*aspect). With vfov=50, aspect=0.5, tan=0.4663*0.5=0.233, D=16.4/0.233=70.4. If aspect extremely small, huge. Could handle resize by recompute. But "No camera movement" likely means no animation. We can keep camera on z and adjust distance on resize? That's movement though. Simpler: Use PerspectiveCamera at z computed to fit grid at initial aspect, and on resize update aspect only. But may fail whole grid if narrow.

Could use fov large enough 90 to reduce distance and fit wide. For vertical extent 29.8, fov 90, distance = 14.9/tan(45)=14.9? Wait margin. But when looking at a flat grid from z distance, perspective projection: object at z=0; vertical size projects as halfHeight/d. tan(vfov/2)=halfHeight/d. So D = halfHeight / tan(25). with fov 90, D=14.9/1=14.9. But near plane maybe. For horizontal, need D = halfWidth / (tan(vfov/2)*aspect) = 14.9/(1*aspect). For aspect 0.5 D=29.8. manageable. But fov 90 perspective strong. Grid still visible. Could choose fov 70, aspect minimum maybe 1? Most test viewport 800x600 aspect 1.333. D = halfHeight / tan35 =16.4/0.700=23.4; horizontal factor aspect 1.333 => tan horizontal half =0.933; D horiz=16.4/0.933=17.6. vertical dominates. Good. For portrait 0.75, D horiz=16.4/(0.700*0.75)=31.2. Fine.

Could compute on resize and set camera.position.z = required distance. But if no camera movement? I'd rather compute once and update on resize; acceptable.

Maybe no need margin too huge. Let's design helper fitCamera:
- object bounds maybe width 30 (29*spacing + 0.8 = 29.8? Wait 30 positions from -14.5 to 14.5, extent center ±14.5 plus half box 0.4 => ±14.9. Width =29.8. Yes spacing 1, box 0.8, outer gap? Actually positions 30, centers spread 29, width =29 +0.8 =29.8.)
- margin 1.15 => required half height/width =14.9*1.15 =17.135.
- camera fov 50 maybe.
- D for vertical: halfH / tan(fov/2). For horizontal: halfW / (tan(fov/2)*aspect). Use max.
- Set camera.position.set(0,0,D), lookAt(0,0,0). Since flat grid, camera straight. For resize, set aspect and recompute D. But camera position changes on resize. Fine.

However raycasting from camera: Need set raycaster. Use canvas.getBoundingClientRect. Compute ndc:
const rect = renderer.domElement.getBoundingClientRect();
const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
raycaster.setFromCamera(new THREE.Vector2(x,y), camera);
const intersections = raycaster.intersectObject(mesh, false);
if (intersections.length > 0) { const id = intersections[0].instanceId; if (id !== undefined) toggleColor(id); }
Need instanceId may be undefined in type? Three's intersection type has instanceId?: number. Check. In TS, Intersection has instanceId?: number. Good.

Toggle: need maintain colors? We can inspect instanceColor array or store state. Start all gray. For toggle id, get color via mesh.getColorAt(id, tempColor?) Three's getColorAt(index, color) exists r? InstancedMesh has getColorAt(index: number, color: Color): void. Then compare to red maybe. Could maintain colors array? Simpler store an array of booleans toggled: boolean[900] initially false. But requirement every instance starts with color set via setColorAt. Toggle gray/red. If using boolean, setColorAt(id, red/gray), needsUpdate. But perhaps if instanceColor null? We call setColorAt for all initial. Good.

Need ensure material white: new THREE.MeshBasicMaterial({color:0xffffff}). Should we set vertexColors? Maybe not needed. But to be safe, set vertexColors: true? For MeshBasicMaterial with InstancedMesh instanceColor, three uses instanceColor independent. Actually in WebGLProgram, if object.isInstancedMesh and object.instanceColor !== null, USE_INSTANCING_COLOR is defined. It doesn't require material.vertexColors. In shader: vColor = instanceColor. It uses vColor multiply. MeshBasicMaterial fragment uses vColor if USE_COLOR? Let's recall. In Three.js, material.vertexColors true sets USE_COLOR_ALPHA? Actually code:
if (parameters.vertexColors) { shader defines USE_COLOR...? }
Maybe instanceColor triggers USE_INSTANCING_COLOR and vertex color varying. In WebGLProgram:
if ( object.isInstancedMesh === true && object.instanceColor !== null ) {
  parameters.instancingColor = true;
}
...
if ( parameters.vertexColors ) { prefixVertex += '#define USE_COLOR'; }
if ( parameters.instancingColor ) { prefixVertex += '#define USE_INSTANCING_COLOR'; }
...
In color_pars_vertex:
#if defined( USE_COLOR_ALPHA )
 varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
 varying vec3 vColor;
#endif
Then color_vertex:
#if defined( USE_COLOR_ALPHA )
 vColor = vec4(1.0);
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
 vColor = vec3(1.0);
#endif
#ifdef USE_COLOR
 vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
 vColor.xyz *= instanceColor.xyz;
#endif
Then in fragment, color_pars_fragment:
#if defined( USE_COLOR_ALPHA )
 varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
 varying vec3 vColor;
#endif
color_fragment:
#if defined( USE_COLOR_ALPHA )
 diffuseColor *= vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
 diffuseColor.rgb *= vColor;
#endif
So no need vertexColors. Material white. Good.

Need maybe set instanceColor.needsUpdate true after initial? setColorAt creates attribute and needs update automatically? In Three, setColorAt sets instanceColor; if null creates InstancedBufferAttribute; sets needsUpdate? Let's check implementation:
```js
setColorAt(index, color) {
 if (this.instanceColor === null) {
   this.instanceColor = new InstancedBufferAttribute(new Float32Array(this.instanceMatrix.count*3).fill(1),3);
 }
 color.toArray(this.instanceColor.array, index*3);
}
```
It does not set needsUpdate? Actually I think at end maybe. If initial before render, newly created attribute uploads automatically when used? It will be uploaded. But after changes need needsUpdate true. We can set after all.

Need no other meshes at all. Scene may have InstancedMesh only. No ground, no lights needed. MeshBasicMaterial doesn't need lights. Scene background? maybe color 0x111111? We can set scene.background = new THREE.Color(0x111111) maybe. Not a mesh. Fine. But canvas background; click empty background. Need background perhaps darker to distinguish. No other meshes.

Need renderer setup:
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); maybe. Add to body. But requirement size from innerWidth/height. Using setPixelRatio acceptable. Body style margin 0? page has no other HTML; renderer canvas appended. Need ensure canvas covers full. Could set document.body.style.margin = '0'; overflow hidden. Is that allowed? Yes. No HTML other than canvas. Use body style. Also set renderer.domElement.style.display = 'block'; maybe canvas no default inline spacing. Fine.

Scene:
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); maybe. Could use 0x000000? Gray boxes on black. Red visible. Background click doesn't matter. Maybe 0x202020.

Camera:
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
Need compute position. Function updateCameraForGrid:
const halfExtent = 14.9; margin = 1.15; const requiredHalf = halfExtent * margin;
const vFovRad = THREE.MathUtils.degToRad(camera.fov);
const tanV = Math.tan(vFovRad / 2);
const tanH = tanV * camera.aspect;
const distanceV = requiredHalf / tanV;
const distanceH = requiredHalf / tanH;
camera.position.set(0,0,Math.max(distanceV, distanceH));
camera.lookAt(0,0,0);
camera.updateProjectionMatrix maybe aspect set. Need set aspect before distance.

But for perspective projection of object plane not exactly half extent? Camera at z=D looking straight at plane z=0. Projected half-height at z=0 is D*tanV. So D = halfExtent / tanV. Fine. But boxes have depth; front face at z=+0.4 closer to camera, projected a bit larger. Need account front z. The object extends from z=-0.4 to +0.4. Max projected size from front +0.4 at distance D-0.4. Our condition D*tanV >= halfExtent? If D computed for plane center z=0, front face at z=0.4 projects to halfExtent*(D/(D-0.4))? Wait if point x=halfExtent at z=0.4, projected relative tan = halfExtent/(D-0.4). Need <= tanV. So D >= halfExtent/tanV + 0.4. Similarly horizontal. Add box half depth maybe. Could use D = requiredHalf/tanV + 0.5. But small. Use margin enough. Or compute using depth. Simpler use margin 1.2 and add 0.5. Fine.

But grid in XY plane facing camera: Are boxes lying in XY plane? BoxGeometry default faces along axes. Grid plane XY, camera z. Good.

Create InstancedMesh:
const geometry = new THREE.BoxGeometry(0.8,0.8,0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, 900);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); maybe. Need set matrix for each. Use dummy Object3D or Matrix4.
const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
let index = 0;
for (let i=0;i<30;i++){ for(let j=0;j<30;j++){ const x = (i - 14.5)*1.0; const y = (j - 14.5)*1.0; dummy.position.set(x,y,0); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index,gray); index++; } }
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);
Could set mesh.frustumCulled = false? Not necessary. All visible. But with bounding sphere maybe okay. InstancedMesh bounding sphere computed? Need ensure not culled. InstancedMesh computes boundingSphere? It has computeBoundingSphere. By default culling with boundingSphere maybe computed from instances? Three calls computeBoundingSphere in raycast maybe. Could leave.

Color toggle state:
const isRed = new Uint8Array(900); // initially 0
function toggleInstance(id: number) {
  isRed[id] = isRed[id] === 0 ? 1 : 0;
  mesh.setColorAt(id, isRed[id] ? red : gray);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
Need click event listener on renderer.domElement (canvas). Event coordinates. Need prevent? Add pointerdown/click. Requirement clicking. Use 'click'. Or 'pointerdown'? click more straightforward. On click, after raycast. If background, nothing. Note click event maybe double. Good.
function onClick(event: MouseEvent) {
 const rect = renderer.domElement.getBoundingClientRect();
 const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
 const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
 raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
 const hits = raycaster.intersectObject(mesh, false);
 if (hits.length > 0) {
   const id = hits[0].instanceId;
   if (typeof id === 'number') toggleInstance(id);
 }
}
renderer.domElement.addEventListener('click', onClick);

Need use event.clientX? MouseEvent. TypeScript strict. In browser, window. Fine.

Need resize:
function onResize() {
 const width = window.innerWidth;
 const height = window.innerHeight;
 camera.aspect = width/height;
 camera.updateProjectionMatrix();
 updateCameraPosition(); // maybe movement
 renderer.setSize(width, height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // maybe not necessary but okay
}
window.addEventListener('resize', onResize). Need ensure camera aspect before updateCamera.

Potential issue "No camera movement" maybe we should not update camera position on resize; only aspect. But requirement handle window resize camera aspect + renderer size. If update camera position to fit, that's camera movement due to resize. The phrase "No camera movement, no animation" likely means camera static during animation, not necessarily resize. But to be safe, could compute a fixed camera distance at startup that ensures whole grid visible for any aspect? If aspect can be any, no finite distance if aspect→0. But practical. Could set camera distance based on grid and a minimum aspect? Hmm.

Maybe we can set camera with very large distance fixed, e.g., z=60. Then whole grid visible vertically with margin: fov 50, tan25=0.466, vertical half at z=60 =60*0.466=27.97 > 16.4, yes. Horizontal at aspect 0.5 = 60*0.466*0.5=13.99 <16.4 => not fit portrait 0.5. For aspect 1, horizontal 27.97 >16.4. Typical test aspect >0.68. Distance 60 vertical margin huge. But grid appears smaller. Maybe okay. Could use z=50 fov 60: tan30=0.577, vertical half=28.8, horizontal at aspect 0.5=14.4 <16.4; aspect 0.6=17.3. Most. If fixed z=80, fov 50: horizontal at aspect 0.35 =13.0; so narrow would fail. But window likely 800x600. Could set z=60 and ensure. But whole grid visible with margin at typical. However perspective makes boxes smaller but fine. Would the grid still fill reasonable? At z=60, vertical view half 28, grid half 14.9 => occupies 53% vertical. That's okay. Maybe too small but visible with margin. If use z=40, fov 50, vertical half 18.65, grid 14.9 => 80%. Horizontal at aspect 1.333=24.87, grid width 14.9 => 60%. For portrait 0.75 horizontal half=13.99 => grid (14.9) not fit. So z=40 not.

Could choose fov 60 and z=40: tan30=0.577, vertical half=23.1; horizontal at aspect 0.75=17.3 >14.9 fits. For aspect 0.6 horizontal=13.9 <14.9 fail. Could z=45: horizontal at 0.6=15.6 fits. At aspect 0.5=13.0 fail. So not universally.

Maybe adjust camera on resize is better and acceptable. But "No camera movement" maybe they test that camera position not changed in animation loop. We won't animate. Resize handler only on resize. Fine.

Need set __scene, __camera, __renderer. __mesh. __ready after first frame rendered:
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
No motion. Maybe use elapsed? The instruction "Motion must use delta/elapsed time, not frame counts." Since no motion, no need. But maybe the testing expects animation loop. We can get clock but unused. Could use const clock = new THREE.Clock(); In loop const delta = clock.getDelta(); but unused would produce TS noUnusedLocals? Strict includes noUnusedLocals? tsc --strict does not include noUnusedLocals by default. But we don't need. They said motion must use delta/elapsed time. There is no motion. Good.

Need ensure TypeScript strict zero errors. Need imports. `import * as THREE from 'three';` Addons not used. OK.

Potential TS type issue: (window as any).__scene = scene; fine.

Need maybe declare window properties? Using any.

Need ensure `renderer.domElement` type HTMLCanvasElement. `addEventListener('click', onClick)` accepts. Good.

Need maybe event coordinates if rect width zero? no.

Need consider raycaster and instanced mesh: `raycaster.intersectObject(mesh, false)` returns intersections with instanceId. For MeshBasicMaterial, side default FrontSide. Box has front faces. Camera sees front faces and sides? Ray from camera hits front face. Good. If clicking edge, perhaps side face? still instanceId.

Need no other meshes. Scene includes only mesh. Scene.background color not mesh.

Need handle renderer size: window.innerWidth/Height. `renderer.setSize(window.innerWidth, window.innerHeight)`. We can set pixel ratio. If using pixel ratio, setSize uses CSS size. Good. But canvas bounding rect.

Need maybe append renderer.domElement to document.body. Add body styles. Do so.

Now possible issue with using `mesh.setColorAt` before `mesh.instanceColor` exists. It creates. Need after all `mesh.instanceColor.needsUpdate = true`. In TS, mesh.instanceColor is `InstancedBufferAttribute | null`. `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;`.

Need maybe `mesh.instanceMatrix.needsUpdate = true`.

Need use `mesh.count` maybe 900.

Need updateCameraForGrid uses camera.fov. Could compute `const half = (30 - 1) * 0.5 + 0.4` = 14.9. Let's set constants:
const GRID_COUNT = 30;
const SPACING = 1.0;
const BOX_SIZE = 0.8;
const halfGrid = (GRID_COUNT - 1) * SPACING / 2 + BOX_SIZE / 2; // 14.5+0.4=14.9
const margin = 1.15;
const required = halfGrid * margin; // 17.135
Need account box depth: camera at z positive. Box z half=0.4. For projected extent, require D - BOX_SIZE/2 >= required/tanV -> D >= required/tanV + 0.4. Use `const depthOffset = BOX_SIZE/2;`.
But if camera distance D, front face at z = +0.4, distance D-0.4. Projection half angle = required / (D - 0.4). Need tanV >= required/(D -0.4) => D >= required/tanV +0.4.
Similarly horizontal `D >= required/(tanV*aspect) + 0.4`.
Use max of both.
function updateCameraFraming() {
 const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
 const tanH = tanV * camera.aspect;
 const depth = BOX_SIZE / 2;
 const distanceV = required / tanV + depth;
 const distanceH = required / tanH + depth;
 camera.position.set(0, 0, Math.max(distanceV, distanceH));
 camera.lookAt(0, 0, 0);
}
But camera.lookAt called; camera at z positive, looking at origin. Fine.
On init, camera.aspect set from window. Then updateCameraFraming.

Need maybe camera near plane: distance could be >1000? If aspect tiny, distance huge. Set near=0.1, far=5000. Or compute far enough. Use far=1000? If aspect 0.1, distance ~? required=17.1, tanV=0.466, tanH=0.0466, D=367+0.4=367.4, far 1000 enough. If aspect 0.01, 3670 >1000. Could set far=10000. Fine. Use near 0.1 far 10000.

Now let's think if no lighting and MeshBasicMaterial white: instance colors show exactly. Gray 0x808080 becomes material color white * instance gray = gray. Red = red. Good.

Potential issue color space: THREE.Color(0x808080) in sRGB? In Three r152+, Color management enabled? For MeshBasicMaterial, color values are sRGB converted to linear? Instance colors set via setColorAt: `color.toArray` writes linear? Actually Color stores linear-srgb internally after color management? `new THREE.Color(0x808080)` with color management converts to linear. When setColorAt, writes linear values. Shader outputs converted to sRGB by renderer. So final appears 0x808080. Good.

Need maybe call `mesh.setColorAt(index, gray)` with same Color object. setColorAt copies to array, so fine. Red toggled.

Need state array. `const isRed = new Uint8Array(GRID_COUNT * GRID_COUNT);` toggling. Good.

Need maybe no animation loop timing. Use renderer.setAnimationLoop(render). In render, renderer.render. After first frame ready. Good.

Could maybe use requestAnimationFrame? No setAnimationLoop as required. Good.

Need maybe renderer.setAnimationLoop callback type accepts XRFrame? `renderer.setAnimationLoop(() => { ... })` fine.

Need maybe add window resize listener before initial? Set after. On resize, update renderer size and camera. Need call `renderer.setPixelRatio` maybe after setSize? Actually setPixelRatio before setSize or after? Either. Use:
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
On resize:
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
camera.aspect = width / height;
camera.updateProjectionMatrix();
updateCameraFraming();

Need note setPixelRatio on resize maybe triggers renderer.setSize internally? Actually setPixelRatio then setSize. Fine.

Need maybe body style. `document.body.style.margin = '0';` `document.body.style.overflow = 'hidden';` `document.body.style.background = '#111';` This is okay. No other HTML. Append canvas. Canvas display block.

Could maybe set `renderer.domElement.style.display = 'block';` Good.

Need maybe click coordinates from `event.clientX`/`clientY` relative to viewport. Use rect. Normalize. `const ndc = new THREE.Vector2(...)`. We can reuse vector:
const pointer = new THREE.Vector2();
function onClick(event: MouseEvent) {
 const rect = renderer.domElement.getBoundingClientRect();
 pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
 raycaster.setFromCamera(pointer, camera);
 ...
}
Need ensure rect width/height nonzero. Fine.

Potential TS issue: `event.clientX` exists. Use `MouseEvent`. listener type okay.

Potential strict compile with `window as any` okay. Imports. No unused? noUnusedLocals not part strict? Actually `--strict` includes noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, useUnknownInCatchVariables, alwaysStrict. It does not include noUnusedLocals/Parameters. So unused imports? We don't have. `THREE` used. Fine.

Need maybe type of `mesh` is `THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>`? In TS Three types, InstancedMesh generic might be `<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material = Material>`? We can just use const mesh = new THREE.InstancedMesh(geometry, material, count); inference. Good.

Need maybe `mesh.instanceColor` type in current Three? Yes.

Need potential issue with raycast and `intersection.instanceId` in strict type. The `Intersection` type may not have instanceId? Let's recall Three.js types. In `src/Three.js` examples? The @types/three definitions. `Intersection` interface:
```
export interface Intersection extends RaycastResult {
 distance: number;
 object: Object3D;
 ...
 instanceId?: number;
 point: Vector3;
 ...
}
```
I think yes. But to be safe:
const instanceId = hits[0].instanceId;
if (instanceId !== undefined) { ... }
If TS says property instanceId doesn't exist? Need know. In recent Three types, `Intersection` from `three/src/Three.d.ts` maybe:
```
export interface Intersection {
    distance: number;
    point: Vector3;
    object: Object3D;
    uv?: Vector2;
    face?: Face;
    faceIndex?: number;
    normal?: Vector3;
    instanceId?: number;
}
```
Yes.

Need maybe `raycaster.intersectObject(mesh, false)` type accepts Object3D. Fine.

Potential issue: BoxGeometry at positions; if clicking boxes, because material FrontSide, ray hits front face. If click on side profile visible due perspective, front face still. Good.

Need ensure whole grid visible with margin and centered. Camera position x=0 y=0 z>0, looking at origin. The grid in XY plane, boxes extend z ±0.4. Perspective view: The outer boxes may overlap? No spacing 1 > box 0.8, visible gaps. In projection, due perspective, boxes at edges maybe overlap? Since boxes are flat in z, they all same depth, scaling by distance from camera varies with x,y? Perspective projection of object plane: x' = x / (D-z). For all same z, x' = x/(D), y' = y/D, linear. Spacing in screen uniform. Gaps remain. But different boxes at same z, no overlap if spacing > size. Good.

Could there be issue with box depth causing side faces? It's okay.

Need maybe no other meshes. We create BoxGeometry and material only. Scene only includes mesh. No lights. Good.

Let's draft code.

```ts
import * as THREE from 'three';

const GRID_SIZE = 30;
const BOX_SIZE = 0.8;
const SPACING = 1.0;
const INSTANCE_COUNT = GRID_SIZE * GRID_SIZE;
const GRAY = new THREE.Color(0x808080);
const RED = new THREE.Color(0xff0000);

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#111';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);

// instanced mesh
const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const dummy = new THREE.Object3D();
const isRed = new Uint8Array(INSTANCE_COUNT);

let idx = 0;
const half = (GRID_SIZE - 1) * SPACING / 2;
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const x = (col - (GRID_SIZE - 1) / 2) * SPACING;
    const y = (row - (GRID_SIZE - 1) / 2) * SPACING;
    dummy.position.set(x, y, 0);
    dummy.rotation.set(0,0,0);
    dummy.scale.set(1,1,1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, GRAY);
    isRed[idx] = 0;
    idx++;
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// framing
const halfExtent = half + BOX_SIZE / 2;
const margin = 1.15;
const requiredHalf = halfExtent * margin;
const depthOffset = BOX_SIZE / 2;

function updateCameraFraming(): void {
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  const distanceVertical = requiredHalf / tanV + depthOffset;
  const distanceHorizontal = requiredHalf / tanH + depthOffset;
  camera.position.set(0, 0, Math.max(distanceVertical, distanceHorizontal));
  camera.lookAt(0, 0, 0);
}
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
updateCameraFraming();

// raycasting
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function toggleInstance(instanceId: number): void {
  isRed[instanceId] = isRed[instanceId] === 0 ? 1 : 0;
  mesh.setColorAt(instanceId, isRed[instanceId] === 1 ? RED : GRAY);
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

function onClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length > 0) {
    const instanceId = hits[0].instanceId;
    if (instanceId !== undefined) {
      toggleInstance(instanceId);
    }
  }
}
renderer.domElement.addEventListener('click', onClick);

// resize
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateCameraFraming();
}
window.addEventListener('resize', onResize);

// expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

Need double-check half variables: `half = (30-1)*1/2 = 14.5`. x = col - 14.5. Good.

Potential compile issue: `mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);` `StaticDrawUsage` exported as constant? In Three, `THREE.StaticDrawUsage` yes. It's a number? Actually `StaticDrawUsage` is `Usage` enum? It exists. Good.

Potential compile issue: `camera.aspect` type number. `Math.tan` etc.

Potential issue: `THREE.MathUtils.degToRad(camera.fov)` uses camera.fov. Good.

Potential issue: `renderer.setPixelRatio` with `window.devicePixelRatio || 1`. In browser, devicePixelRatio number. Fine.

Potential issue: `document.body.style.background = '#111';` body exists. Fine.

Potential issue: no `THREE` addons imports. Fine.

Need maybe use `renderer.setAnimationLoop` and no delta/elapsed. The instruction says "Motion must use delta/elapsed time, not frame counts." Since no motion, okay. But maybe tester checks for no animation. Fine.

Wait: "PerspectiveCamera looking straight at the grid, whole grid visible with a margin. No camera movement, no animation." Our resize changes camera distance. Could be considered camera movement. But only on resize. If testing sets window size and clicks, no movement. Good.

Could avoid camera movement by computing camera distance with a fixed value based on worst-case aspect? Not necessary.

Need maybe no other meshes at all: Scene background set to color. No mesh. Good.

Could maybe `scene.background = new THREE.Color(0x111111)` means background click can still be on canvas but not mesh. Fine.

Need maybe clicking empty background changes nothing. Our if hits > 0 only. Good.

Need perhaps multiple intersections if clicking overlapping? Boxes don't overlap. It picks nearest. Toggles that. Good.

Need maybe if click on background but ray intersects back face? `FrontSide` only front faces, but boxes are closed; ray can hit front face then back face? Raycaster with FrontSide material: For Mesh, `intersectObject` uses material.side to filter triangle faces. FrontSide only triangles whose normal points toward camera? Actually BoxGeometry has front faces on +z (normal +z), side faces etc. Ray from camera along -z hits +z faces; front faces. Back faces are culled. Good.

Need maybe boxes' front faces at z=0.4. Raycaster hits. Good.

Need maybe colors in `setColorAt` need `mesh.instanceColor!.needsUpdate = true;` after initial. We do.

One nuance: In Three.js recent versions, `InstancedMesh` automatically has `instanceColor` attribute only if `setColorAt` called. It sets `instanceColor.needsUpdate`? According to source, `setColorAt` does not set needsUpdate. Initial before upload not needed because new attribute is uploaded when first rendered? In WebGLAttributes, for new buffer, it creates and uploads. Since needsUpdate default false? Let's recall InstancedBufferAttribute needsUpdate false. But when buffer is first used, WebGLAttributes.update creates buffer if not existing, and uploads. So fine. For toggling, we set needsUpdate. Good.

Need maybe after initial setColorAt, set needsUpdate true anyway.

Potential issue: Raycaster intersects InstancedMesh with bounding sphere. InstancedMesh boundingSphere may be null? In `raycast`, it calls if boundingSphere === null computeBoundingSphere? Let's recall Three's InstancedMesh.raycast:
```js
raycast(raycaster, intersects) {
 const matrixWorld = this.matrixWorld;
 const raycastTimes = this.count;
 _mesh.geometry = this.geometry;
 _mesh.material = this.material;
 if (_mesh.boundingSphere === null) _mesh.computeBoundingSphere();
 ...
}
```
Wait it uses `_mesh` (Mesh) with geometry and material, but sets `_mesh.matrixWorld = matrixWorld`; for each instance sets instance matrix; calls `_mesh.raycast`. It uses geometry bounding sphere, not InstancedMesh bounding sphere? Hmm. But works. Good.

Need maybe material side? Fine.

Could maybe use `mesh.frustumCulled = false` to ensure all instances rendered. Bounding sphere computed on first render? InstancedMesh's computeBoundingSphere may use instanceMatrix; default boundingSphere null, WebGLRenderer calls object.boundingSphere? For frustum culling, if boundingSphere null, it calls computeBoundingSphere? In WebGLRenderer, `if (object.frustumCulled === true) { ... if (object.boundingSphere === null) object.computeBoundingSphere(); }` maybe. InstancedMesh has computeBoundingSphere. Good. But to be safe, set `mesh.frustumCulled = false`. Since only 900 boxes, fine. Does that violate? No. Add maybe. It ensures visible.

Need maybe "no other meshes at all" means don't create temporary Mesh for raycast? We don't.

Need maybe "single InstancedMesh" no other Mesh. Good.

Potential issue with color exactness: MeshBasicMaterial white plus instance gray. In renderer with color management output sRGB, 0x808080 exactly. Good.

Need maybe `renderer.outputColorSpace = THREE.SRGBColorSpace;` default. Not needed.

Need maybe disable color management? No.

Let's think if `tsc --strict` compiles with no DOM lib? The file browser, likely TS config includes DOM. If not, `window`, `document`, `MouseEvent` would error. But typical. They said browser. We can use `window` etc. Fine.

Need maybe type assertions. Good.

Now possible subtlety: The camera framing computes `distanceHorizontal = requiredHalf / tanH + depthOffset`. If camera.aspect is very small, distance large. `camera.far = 10000`; if aspect <0.0035 distance >10000. Unlikely. Could set far = 100000. Use 100000 to be safe. `near` 0.1. Perspective depth precision maybe. Fine. Use far=100000. But if distance huge, boxes tiny. No. Resize extremely narrow may break. Could cap? Not needed.

Need maybe margin 1.15 means 15% margin. Good.

Wait: halfExtent = 14.9, required = 17.135. With fov 50 and aspect 1.333:
tanV = 0.4663. distanceV = 17.135/0.4663 +0.4 = 37.15. horizontal = 17.135/(0.4663*1.333)=27.57+0.4=27.97. Max=37.15. At z=37.15, vertical view half = 17.32, grid front half projection = 14.9/(37.15-0.4)=0.405? Wait projection tan = 14.9/(36.75)=0.4054 vs tanV 0.4663, so occupies 87% of view. Margin ~13%. Good. The grid appears 87% vertical. Nice.

At aspect 1.333, horizontal view tan =0.6217, grid half tan=0.405, occupies 65%. Fine.

At portrait aspect 0.75: tanH=0.3497, distanceHorizontal=17.135/0.3497+0.4=49.4. vertical view half at D=49.4: tanV=0.4663, grid projection tan=14.9/49=0.304, occupies 65% vertical. Horizontal projection tan=0.304 vs tanH=0.3497, 87% horizontal. Good.

Now click instance: NDC computed with full canvas. Camera aspect current. Good.

One nuance: If the window resizes, renderer canvas size and camera update. Good.

Now should we set `window.__ready` after first frame rendered. In animation loop, render then set. Fine.

Need no animation. `renderer.setAnimationLoop` will run continuously though. It renders every frame. That's technically not animation but render loop. The instruction requires use setAnimationLoop. Good.

Potential issue: "Motion must use delta/elapsed time, not frame counts." There is no motion. Maybe they expect `const clock = new THREE.Clock();` but no. Fine.

Need output only code block.

But before final, let's consider whether need to expose `__ready` only after first frame. We do. Good.

Could there be a TypeScript error due to `mesh.instanceColor` property being read-only? In Three types, `instanceColor: InstancedBufferAttribute | null;` is writable? We don't assign. Just read and set needsUpdate. Good.

Need maybe `mesh.setColorAt` expects `Color` or `ColorRepresentation`? In types, `setColorAt(index: number, color: Color): void`; we pass Color. Fine.

Potential issue with `new THREE.Color(0x808080)` and `new THREE.Color(0xff0000)`. Good.

Need perhaps set `mesh.instanceColor!.needsUpdate = true;` after toggling. We check.

Potential issue: `const isRed = new Uint8Array(INSTANCE_COUNT);` and `isRed[instanceId]` where instanceId number from hit can be integer. Type `number`; Uint8Array index. Fine. If instanceId out of range? no.

Potential issue: `toggleInstance(instanceId)` uses `isRed[instanceId] === 0 ? 1 : 0`; `Uint8Array` assignment. Fine.

Could simplify. Good.

Need maybe no external assets. Good.

Now final with single code block.