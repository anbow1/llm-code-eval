Let me write the file.

Grid 30x30, spacing 1.0, centered at origin. Box size 0.8. Camera perspective looking straight at grid (z axis). Grid extent 30 units. Camera at z = ~40 with fov 50, need to fit. Let's compute: half-size 15, plus margin. fov 50 → tan(25°)=0.4663. distance needed = 15/0.4663 ≈ 32.2. But aspect could be narrow; vertical extent is 15, horizontal 15*aspect. If aspect < 1 vertical fits, horizontal needs 15/aspect... Actually camera fov is vertical. For aspect 16:9, horizontal half-fov larger. For narrow window (portrait), horizontal is limiting. Let's compute distance based on aspect in resize: distance = max(15/tan(vfov/2), 15/(tan(vfov/2)*aspect)) * margin. Actually horizontal half-angle: tan(hfov/2) = tan(vfov/2)*aspect. So required distance = 15/tan(vfov/2) for vertical, 15/(tan(vfov/2)*aspect) for horizontal. Take max, add margin factor 1.15.

Handle resize: update camera position z and aspect.

Boxes: BoxGeometry(0.8,0.8,0.8) — but plane facing camera; depth fine. Use geometry.

Raycaster on click. NDC from bounding rect.

Also need the render loop with setAnimationLoop, delta not needed but requirement says motion must use delta/elapsed — there's no motion. Still set animation loop and set __ready after first frame.

InstancedMesh count 900, setColorAt each. instanceColor needs needsUpdate.

Material: MeshBasicMaterial({color: 0xffffff}) — vertexColors? For instanced colors, three handles instanceColor automatically. Actually with MeshBasicMaterial, instanced color is applied via instanceColor attribute automatically in shader (USE_INSTANCING_COLOR). Yes.

Careful: BoxGeometry depth 0.8, the front face at z = +0.4 relative to instance center 0. Camera looks at z axis. Fine.

Raycast: raycaster.intersectObject(mesh) returns intersections with instanceId.

Write code.

Also mesh.instanceMatrix needsUpdate not needed if set once before first render — actually needs to be set before render; three uploads on first render.

Set mesh.instanceColor after setColorAt; instanceColor created by setColorAt. Then instanceColor.needsUpdate = true.

Click handler: 'pointerdown' or 'click'. Use 'click'.

Let me write.

const size = 0.8; spacing = 1.0; count 30 per side; offset = (n-1)/2 * spacing = 14.5.

for i in 0..29, j in 0..29: x = (i-14.5), y = (j-14.5).

Set matrix.

Colors: Float32Array via mesh.instanceColor or use Color and setColorAt.

Use const color = new THREE.Color(0x808080); mesh.setColorAt(index, color) for all.

Toggling: read current color from mesh.instanceColor!.array? Simpler: maintain a boolean array or check color. Let's read from instanceColor array: r = arr[idx*3]; if > 0.5 → red → set gray; else set red.

Also handle if pointer misses.

Resize handler updates camera.aspect, position, updateProjectionMatrix, renderer.setSize.

Renderer appended to body, and body margin 0? Can't add CSS via HTML... I can set document.body.style.margin = '0'. That's fine, allowed.

Also set renderer size with pixel ratio maybe.

Write file.

For picking against InstancedMesh with MeshBasicMaterial — raycaster works via geometry, fine.

Note: raycasting a mesh whose instanceMatrix is set — three handles it. Yes, InstancedMesh.raycast exists.

Camera position: camera.position.set(0,0,z), lookAt(0,0,0). Since grid in XY plane, that's fine.

Compute z in a function updateCamera().

const fov = 50; const vfov = fov*Math.PI/180; const halfV = Math.tan(vfov/2); half-grid 15 (14.5 + 0.4 box half). Use 15.2.

dist = Math.max(15.2/halfV, 15.2/(halfV*camera.aspect)) * 1.1.

Actually for near/far: near 0.1, far 1000.

Write the code now.

Guard: mesh.instanceColor may be null - use non-null assertion.

Also __ready set after first frame in animation loop.

Full code:

```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);

const GRID = 30, SPACING = 1, BOX = 0.8;
const geometry = new THREE.BoxGeometry(BOX, BOX, BOX);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, GRID*GRID);
mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
...
```

Ok. Let me write final.

For the raycast NDC: 

```ts
const rect = renderer.domElement.getBoundingClientRect();
const ndc = new THREE.Vector2(
  ((e.clientX - rect.left) / rect.width) * 2 - 1,
  -((e.clientY - rect.top) / rect.height) * 2 + 1
);
```

Fine.

Also need delta time usage—not needed but use clock for elapsed maybe. I'll just use setAnimationLoop with renderer.render. Compliant enough; rule says motion must use delta — there is no motion. I'll keep a clock anyway? No, keep simple.

Actually to be safe, use renderer.setAnimationLoop(() => { ... render ... }) with elapsed from clock. Fine, no motion.