Let me write a complete TypeScript file.

Key points:
- 100x100 = 10,000 instances.
- One InstancedMesh with BoxGeometry.
- setColorAt with gradient.
- Animation loop using delta/elapsed.
- Reuse Object3D dummy.
- Camera positioned at an angle to see the whole grid.

Grid spacing: let's use spacing 0.5 units, so grid extent 100*0.5 = 50 wide. Cube size 0.4.

Camera at (40, 45, 40) looking at origin, maybe with fov 60 — grid spans 50x50, so diagonal ~70 units. Distance from origin to camera ≈ 70. That should be fine, maybe pull back a bit. Let's use camera at (45, 55, 45) ~ 81 distance. Good.

Radial wave: distance from center * k, k = 0.35, speed = 2.5, amplitude = 1.2.

Precompute distances in a Float32Array to avoid sqrt per frame (fine either way, but nice).

Colors: gradient by grid position — use HSL or lerp between two colors. Use THREE.Color reused.

For matrix updates: use dummy.position.set, dummy.updateMatrix, mesh.setMatrixAt. Actually more efficient: use Matrix4 reused and compose... dummy Object3D is fine and simple. But to avoid updateMatrix overhead? It's fine.

Actually a slightly more efficient way: reuse a THREE.Matrix4 and use .makeTranslation? But we also want rotation? Just translation + scale set once. Since scale is constant, we can pre-scale geometry instead? But we need each cube the same size. We could use BoxGeometry(0.4, 0.4, 0.4) and then only set translation matrices. But rotation identity and scale 1 — using makeTranslation gives identity rotation and scale 1, which is fine since geometry already has size baked in. That's the cheapest: matrix.makeTranslation(x, y, z). 10,000 per frame, that's fine.

Hmm, but with a wave, keeping cubes axis-aligned is fine.

Use Matrix4 reused: `const mat = new THREE.Matrix4();` then `mat.makeTranslation(x, y, z)` — no allocations.

Actually makeTranslation sets the matrix fully. Good.

Also set instanceMatrix.setUsage(THREE.DynamicDrawUsage).

Frustum culling: set mesh.frustumCulled = false? Not necessary but the bounding sphere may be off. InstancedMesh computes bounding box from instances at construction? Actually InstancedMesh.computeBoundingSphere uses instanceMatrix... it's computed lazily. Since we update matrices, culling could be wrong-ish, but it's the whole grid so fine. Set frustumCulled = false to be safe? The mesh is at the center, camera looks at it, so culling would keep it. Fine either way; I'll leave it default but call computeBoundingSphere after init... Actually simplest: frustumCulled = false.

Renderer: antialias, set pixel ratio.

Colors: use setColorAt, need mesh.instanceColor.needsUpdate = true after init.

Gradient by grid position: use HSL hue based on x and y grid indices. e.g. color.setHSL(0.6 + 0.3 * (i/99)... Let's do hue from 0.55 to 0.05 by row, and lightness by column. Use reused Color.

Let me write it.

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d14);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(48, 52, 48);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```

Also set document.body.style.margin = 0? Page has no other HTML; body default margin 8px would cause scrollbars. Let's set styles.

Grid config:

```ts
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 0.5;
const CUBE = 0.42;
const AMP = 1.3;
const K = 0.36;
const SPEED = 2.4;
```

Half extent = (GRID-1)*SPACING/2 = 99*0.5/2 = 24.75.

Geometry: BoxGeometry(CUBE, CUBE, CUBE). Material MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }). Note: when using instanceColor, material color multiplies; set material color white (default).

Lights:
- AmbientLight 0x404a66, intensity ~1.2 (with three r150+ physically correct lighting, intensities differ). Hmm, three version unknown. Use reasonable values: AmbientLight(0xffffff, 0.6)? In newer three (r155+), lights use physical units by default with useLegacyLights=false. Ambient intensity ~1-2 fine. DirectionalLight intensity 2.5.

Let's use AmbientLight(0x6688cc, 1.0) and DirectionalLight(0xffffff, 2.5) at (30, 60, 25).

Positions precomputed: Float32Array for x, z, dist (or compute in loop). Precompute arrays: xArr, zArr, distArr.

Since we always loop over the full count, we can compute index → ix = i % GRID, iz = (i / GRID) | 0.

Store a single Float32Array of positions and distances to reduce per-frame work.

Animation:

```ts
const dummy = new THREE.Matrix4();
const elapsed = ...;

function animate() {
  const time = clock.getElapsedTime(); // or accumulate
  ...
}
```

Use renderer.setAnimationLoop((timeMs) => ...) — the callback receives time in ms. Also use a Clock for delta. Requirement: motion uses delta/elapsed time. Using clock.getElapsedTime() is fine.

But careful: the first frame callback time might be 0. Fine.

I'll maintain my own accumulator: `let elapsed = 0; const clock = new THREE.Clock();` in loop: `const dt = clock.getDelta(); elapsed += dt;` Hmm, but simpler to use elapsed directly. Let's do:

```ts
const clock = new THREE.Clock();
let time = 0;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  time += dt;
  ...
});
```

That satisfies the delta requirement.

Update loop:

```ts
for (let i = 0; i < COUNT; i++) {
  const d = distArr[i];
  const y = Math.sin(d * K - time * SPEED) * AMP;
  mat.makeTranslation(xArr[i], y, zArr[i]);
  mesh.setMatrixAt(i, mat);
}
mesh.instanceMatrix.needsUpdate = true;
```

Note makeTranslation sets only the elements; Matrix4.makeTranslation sets all 16 elements properly. Yes: `makeTranslation` calls `this.set(1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1)`. Good.

Also can add slight vertical offset so cubes hover around 0. Fine.

Also maybe add a gentle scale variation? Not required.

Set __ready after first frame render: inside animation loop, after renderer.render, if (!ready) { ready = true; (window as any).__ready = true; }

TypeScript strict: `(window as any).__scene = scene;` fine.

Resize handler.

Also `mesh.instanceColor` might be null in types; after setColorAt it exists. Type is `InstancedBufferAttribute | null`. Set needsUpdate with null check: `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;`

Colors: gradient by grid position — hue based on radial distance? Spec says gradient by grid position. Let's do:

```ts
const color = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  const u = ix / (GRID-1), v = iz / (GRID-1);
  color.setHSL(0.58 - 0.42 * v * 0.75 + ... )
}
```

Simpler: hsl hue = 0.6 - 0.45*u? Let's do hue from 0.62 (blue) to 0.08 (orange) mixed with v: 
`const hue = 0.62 - 0.5 * (0.35 * u + 0.65 * v);` Hmm just use hue = 0.62 - 0.55 * ((u + v) / 2) → ranges 0.62 to 0.07. Lightness 0.45 + 0.2 * (1 - v). Saturation 0.85.

Use HSL colors, then setColorAt(i, color). Note: with color space management (three r152+), setColorAt with a Color in working space... Color.setHSL produces values in sRGB? Actually `setHSL` has an optional colorSpace parameter defaulting to SRGBColorSpace in newer three, which converts to working (linear) space. That could make it darker/brighter but fine.

Actually, careful: in newer three, `Color.setHSL(h, s, l, colorSpace = SRGBColorSpace)`. Works fine.

To keep simple and version-agnostic, I could use setRGB with lerp between colors: color.copy(a).lerp(b, t) — but a.lerp also does color-space handling? `lerp` works in working space directly, no conversion. That's fine and predictable. Let's use two colors and lerp based on u, plus a second lerp... Simplicity: use setHSL. I'll use setHSL — it's readable and gives vivid gradient.

Let me also add some subtle rotation? No, matrix makeTranslation only.

Wait — for a nicer wave look, we could also scale each cube by the wave. That requires compose. Skip.

Let's write it out, checking strict TS.

```ts
import * as THREE from 'three';

// --- renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
...
```

document.body.style.margin = '0'; document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';

Everything fine.

One more detail: BoxGeometry(CUBE, CUBE, CUBE) - with 10,000 boxes of 12 triangles each = 120k triangles, fine.

Check: does the whole grid fit the view? Grid extent 50 x 50 (spanning -24.75..24.75). Camera at (48, 52, 48), distance sqrt(48²+52²+48²) = sqrt(2304+2704+2304)= sqrt(7312)=85.5. FOV 60 vertical, aspect maybe 1.7. Visible height at distance 85.5 = 2*85.5*tan(30°)=98.7. Width = 98.7*1.7=168. The grid diagonal is 70. Should fit comfortably. Good — for narrow windows (aspect ~1), width = 98.7, still fine.

Maybe move camera closer: (40, 44, 40) distance 71.8 → height 82.9. Grid diagonal projected... probably fine. I'll keep 48,52,48 for safety but maybe reduce slightly to 44,48,44. Let's use (46, 50, 46).

Let's finalize code.

```ts
import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 0.5;
const CUBE_SIZE = 0.42;
const AMPLITUDE = 1.35;
const WAVE_K = 0.34;
const WAVE_SPEED = 2.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x05070d, 90, 190);
```

Fog might kill the far side; camera distance to far corners ~ 100+. Fog 90-190 gives a subtle fade. Hmm, could look nice but might dim. Keep fog optional — I'll include with far values 110..220. Actually fog with InstancedMesh works fine. Let's skip fog to keep it simple and avoid dimming. Actually a subtle fog adds depth. I'll include fog(0x05070d, 100, 240).

Camera: PerspectiveCamera(55, aspect, 0.1, 1000).

Let me now write final.

```ts
camera.position.set(46, 50, 46);
camera.lookAt(0, 0, 0);
```

Lights:

```ts
const ambient = new THREE.AmbientLight(0x88aaff, 1.1);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 2.6);
dir.position.set(40, 80, 30);
scene.add(dir);

const fill = new THREE.DirectionalLight(0x4466ff, 1.0);
fill.position.set(-50, 30, -40);
scene.add(fill);
```

Extra fill light is fine.

InstancedMesh setup:

```ts
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.frustumCulled = false;
scene.add(mesh);
```

Positions arrays:

```ts
const xs = new Float32Array(COUNT);
const zs = new Float32Array(COUNT);
const dists = new Float32Array(COUNT);
const half = (GRID - 1) * SPACING * 0.5;

const color = new THREE.Color();
let idx = 0;
for (let iz = 0; iz < GRID; iz++) {
  const z = iz * SPACING - half;
  for (let ix = 0; ix < GRID; ix++) {
    const x = ix * SPACING - half;
    xs[idx] = x;
    zs[idx] = z;
    dists[idx] = Math.hypot(x, z);
    const u = ix / (GRID - 1);
    const v = iz / (GRID - 1);
    const hue = 0.62 - 0.55 * (0.5 * u + 0.5 * v);
    color.setHSL(hue, 0.85, 0.42 + 0.22 * (1 - 0.5 * (u + v)));
    mesh.setColorAt(idx, color);
    idx++;
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
```

Hmm lightness: 0.42 + 0.22*(1 - 0.5*(u+v)) ranges 0.64 (at 0,0) to 0.42 (at 1,1). Fine.

Also need initial matrices set before first render — set by first animation frame anyway, but for safety, call the update once before starting loop? The first animation loop frame will do it. Fine.

Update function:

```ts
const matrix = new THREE.Matrix4();

function updateWave(t: number): void {
  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(dists[i] * WAVE_K - t * WAVE_SPEED) * AMPLITUDE;
    matrix.makeTranslation(xs[i], y, zs[i]);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
```

Note strict TS: indexing Float32Array gives number (no undefined since noUncheckedIndexedAccess isn't part of strict). Fine.

Animation loop:

```ts
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  updateWave(elapsed);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Resize:

```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
```

Also set pixelRatio in resize? Not needed.

Expose globals at end.

Order: define renderer/camera first? The exposes at end.

Type checks: `renderer.setAnimationLoop(() => {...})` — signature accepts `XRAnimationLoopCallback | null` which is `(time: number, frame?: XRFrame) => void`. A zero-arg arrow is assignable. Fine.

THREE.Clock.getDelta() fine.

Also need `Math.hypot` fine.

Everything compiles. Write out final answer.

One consideration: `mesh.instanceColor` type — after setColorAt, TS type is `InstancedBufferAttribute | null`. Guard handles it.

Also, InstancedMesh in newer three requires `instanceColor` created by setColorAt. Yes, setColorAt creates it if null.

Let me write the whole file cleanly.

Maybe add a small polar angle / camera orbit? No — static camera as required.

Also to be safe about the grid scale being visible, double-check visible extents. Camera at (46,50,46), looking at origin. dist = sqrt(2116+2500+2116)= sqrt(6732)=82.05. Vertical FOV 55 → visible height at 82 = 2*82*tan(27.5°)=2*82*0.5206=85.4. Aspect 1.78 → width 152. Grid diagonal 70 in XZ plane; projected height on screen: the grid tilted. Should fit. For a very narrow window (aspect 0.5), width = 42.7 which could clip — but that's an edge case. Maybe reduce fov to 50 and move camera to (44, 46, 44)? Meh. Use fov 50, camera (44, 48, 44): dist = sqrt(1936+2304+1936)=sqrt(6176)=78.6; height = 2*78.6*tan25 = 2*78.6*0.4663=73.3; width at 1.78 = 130. Grid diagonal 70 → fits within height 73.3 barely but grid is tilted so its screen height is less than diagonal. Fine. I'll use fov 55 with camera (46,50,46) for margin.

Final code.