The user wants a TypeScript file using Three.js that:

1. Renders a 100x100 grid (10,000 instances) of small cubes using ONE InstancedMesh.
2. Animate a radial wave: each frame set Y of each instance via setMatrixAt, update instanceMatrix.
3. Give every instance its own color via setColorAt (gradient by grid position).
4. Reuse one Object3D or Matrix4 — no allocations inside the render loop.
5. MeshStandardMaterial, AmbientLight + DirectionalLight.
6. Camera at an angle showing whole grid and wave.
7. Standard requirements: renderer setup, resize, setAnimationLoop with delta time, expose __scene/__camera/__renderer/__ready.

I'll write clean, strict-mode TypeScript. Let me plan:

- Imports: `import * as THREE from 'three';`
- Scene background color maybe.
- Camera: PerspectiveCamera, positioned at angle, e.g. (60, 60, 60), looking at center (0, 0, 0).
- Grid: 100x100, spacing maybe 1.5, cube size 1 (BoxGeometry(1, 1, 1)) or 0.9 for gaps. Let's use spacing = 1.4, cube size 1.0. Grid centered at origin: x = (i - 49.5) * spacing, z = (j - 49.5) * spacing.
- distanceFromCenter computed per instance — precompute a Float32Array of distances once (not in render loop). Actually computing distances per frame is allowed but better precompute; precomputing avoids allocations and computation. The rule says no allocations inside render loop — a Float32Array allocated once outside is fine.

- Wave: y = sin(dist * k - time * speed) * amplitude.

- Colors: gradient by grid position. e.g. mix from color A to color B based on distance or x+z. Use THREE.Color, hsl perhaps. Colors are set once (outside loop) — that's fine; setColorAt once then instanceColor.needsUpdate = true. But the requirement says "Give every instance its own color with setColorAt" — set once at init, no need to update each frame.

- Reuse: a dummy Object3D created once outside loop; inside loop: dummy.position.set(x, y, z); dummy.updateMatrix(); mesh.setMatrixAt(idx, dummy.matrix). Then instanceMatrix.needsUpdate = true.

- Lights: AmbientLight + DirectionalLight. Maybe position directional light.

- MeshStandardMaterial with flatShading? vertex colors: since we use instance colors, the base color is multiplied. Set material color to white (0xffffff) so instance colors show. MeshStandardMaterial with instanceColor works automatically (Three.js handles instanceColor with built-in materials when mesh.instanceColor is set — requires material to support vertex colors? Actually in three.js, InstancedMesh color works via `setColorAt` and the material automatically uses the instanceColor attribute; you don't need vertexColors=true. Since r125+, the shader includes `#ifdef USE_INSTANCING_COLOR`. The renderer sets that define when instanceColor is present. So no need for vertexColors.)

- Resize handler: camera.aspect, updateProjectionMatrix, renderer.setSize.

- setAnimationLoop: callback receives (time, frame). Use time in seconds (time is ms). Or use clock. I'll use THREE.Clock or the time param. The requirement: "Motion must use delta/elapsed time, not frame counts." Use elapsed seconds from performance time: `const seconds = time / 1000;` Actually setAnimationLoop callback gets `time` DOMHighResTimeStamp. Alternatively use a THREE.Clock. I'll use the clock for clarity: `const delta = clock.getDelta(); const elapsed = clock.getElapsedTime();` Or just use the time param. Either fine.

- __ready after first frame: in the animation loop, after renderer.render, if firstFrame flag, set `(window as any).__ready = true`. Actually to guarantee "after the first frame is rendered", set ready after render call in the loop. Use a boolean flag.

- Expose __scene, __camera, __renderer.

Strict TypeScript considerations:
- `(window as any).__scene = scene;` fine.
- `renderer.setAnimationLoop(callback)` — callback signature `(time?: DOMHighResTimeStamp, frame?: XRFrame) => void`. I'll write `renderer.setAnimationLoop((time) => {...})` — time param typed as number? In three types, AnimationRequestFrameCallback = (time: number, frame?: XRFrame) => void? Actually it's `type AnimationRequestFrameCallback = (time: number, frame?: ...) => void`? Let's check: In three.js types (three.js/src/renderers/WebGLRenderer.d.ts): `setAnimationLoop(callback: XRFrameRequestCallback | null): void;` and XRFrameRequestCallback is `(time: number, frame: XRFrame) => void`. Hmm — XRFrameRequestCallback in the WebGL typings. Either way, if I write `(time: number) => {...}` it should be compatible if the parameter type accepts number. To be safe, I could avoid relying on the param typing and use a clock:

```ts
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();
  ...
});
```

That sidesteps typing issues. But the time param approach is also fine — three's types define `AnimationRequestFrameCallback`? Let me recall @types/three vs three's built-in types. Modern three ships its own types (three/src with .d.ts). WebGLRenderer:

```ts
setAnimationLoop(callback: XRFrameRequestCallback | null): void;
```

and XRFrameRequestCallback is declared in `renderers/webxr/WebXRManager.d.ts`? It's:

```ts
export type XRFrameRequestCallback = (
  time: number,
  frame: XRFrame
) => void;
```

Hmm, XRFrame requires DOM lib types but that's fine in browser. If I write `(time: number) => {...}`, is `(time: number) => void` assignable to `XRFrameRequestCallback`? Function parameter bivariance — a function with fewer params is assignable. `(time: number) => void` vs `(time: number, frame: XRFrame) => void`: yes, callbacks with fewer parameters are assignable. So it works. But using the clock is safest and cleaner. Actually I might use the time param but convert with `time * 0.001`. Hmm, both fine. I'll use THREE.Clock to be robust.

Actually, to satisfy "Motion must use delta/elapsed time, not frame counts" — clock works.

Grid geometry: BoxGeometry(0.95, 1.0, 0.95)? Small cubes. spacing 1.2? Let's define:

- GRID = 100
- spacing = 1.2 → total width 118.8, half-extent ~ 59.4 + offsets. Camera at distance maybe 120.

Let me compute camera: position (70, 60, 70), lookAt (0,0,0). With fov 60, near 0.1, far 1000. Grid half extent = (100-1)/2 * spacing = 49.5 * 1.2 = 59.4. Diagonal extent ~ 84 from center. Camera distance sqrt(70²+60²+70²) = sqrt(4900+3600+4900)= sqrt(13400) ≈ 115.7. That should show the whole grid at fov 60. Good.

Wave: amplitude maybe 6, k = 0.25? distance from center up to ~84 (diagonal). sin(dist * 0.25 - t * 2) * 6. Let's pick k such that several rings visible: wavelength = 2π/k ≈ 25 units with k=0.25 — several rings across the grid. Speed: t*1.5 rad/s. Amplitude 7.

Colors gradient: from center outward? "a gradient by grid position". Use a lerped color based on normalized distance from center: colorA (e.g., 0x1e3c72 deep blue) to colorB (0xff6b6b?). Or hue based on x/z. Let's do: hue from 0.55 (blue) to 0.85? Or use Color lerp between two colors based on dist/maxDist. I'll do two-color lerp: cold blue at edges, warm coral near center — gives nice visual.

Implementation for colors:

```ts
const cStart = new THREE.Color('#3a86ff');
const cEnd = new THREE.Color('#ff5e8a');
const color = new THREE.Color();
for (...) {
  const t = dist[i] / maxDist;
  color.copy(cStart).lerp(cEnd, t);
  mesh.setColorAt(i, color);
}
mesh.instanceColor!.needsUpdate = true;
```

Note: with strict TS, `mesh.instanceColor` is `InstancedBufferAttribute | null`, so `mesh.instanceColor!.needsUpdate = true;` — non-null assertion needed. Actually setColorAt allocates instanceColor if null; after first call it exists. Using `!` is fine for strict mode.

Positions precomputed:

```ts
const dummy = new THREE.Object3D();
const positions: { x: number; z: number }[] — better Float32Array of x and z.
```

Use Float32Array(10000*2) or two arrays. Or compute x,z inside the loop arithmetically each frame — cheap but recomputing; precompute dist array:

```ts
const offsets = new Float32Array(count * 2); // x, z
const dists = new Float32Array(count);
```

Precompute in init loop.

Render loop:

```ts
const dummy = new THREE.Object3D();
function animate(): void {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  for (let i = 0; i < count; i++) {
    const y = Math.sin(dists[i] * WAVE_NUMBER - elapsed * WAVE_SPEED) * AMPLITUDE;
    dummy.position.set(offsets[i*2], y, offsets[i*2+1]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
  if (!ready) { (window as any).__ready = true; ready = true; }
}
```

Hmm — the requirement says "sin(distanceFromCenter * k - time * speed)". So phase = dist*k - t*speed. Good.

Set __ready — could set it after render inside loop first iteration. But maybe cleaner: render one frame then set. Just do flag check inside loop.

Also, should frustum culling be disabled? InstancedMesh computes bounding sphere from base geometry (a unit cube at origin), which may cause the whole mesh to be culled when camera moves... Actually with instanced meshes, three.js uses boundingSphere of geometry; since instances spread beyond it, the mesh might get culled incorrectly if the bounding sphere doesn't encompass all instances. Common fix: `mesh.frustumCulled = false;`. Since instances move (matrix updates), bounding doesn't automatically recompute. I'll set frustumCulled = false to be safe. That's good practice; camera is static though, and the culling check happens... The instanced mesh's bounding sphere is computed from geometry bounding sphere (unit cube radius ~0.87), expanded? Actually InstancedMesh.computeBoundingSphere? Newer three (r150+?) InstancedMesh has computeBoundingSphere that accounts for instance matrices, but it's only computed when computeBoundingSphere is called? Let me recall: In three.js, WebGLRenderer calls `projectObject` → frustum intersects with object's boundingSphere via geometry. For InstancedMesh, there is `instancedMesh.computeBoundingSphere()` since r158 or so which uses instanceMatrix. But automatic frustum culling for InstancedMesh uses `this.boundingSphere`? Hmm. Safe route: frustumCulled = false. Many examples do that. I'll include it.

Material: MeshStandardMaterial with roughness ~0.4, metalness ~0.1. Flat shading optional.

Lighting: AmbientLight(0xffffff, 0.4), DirectionalLight(0xffffff, 1.2) at (50, 80, 30). Since MeshStandard is physically correct lighting in newer three, intensities: ambient 0.5, directional 1.5. Fine.

Renderer: antialias true, setPixelRatio(Math.min(window.devicePixelRatio, 2)).

Resize:

```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Scene background: new THREE.Color('#0b0d17') or similar.

Also shadow? Not required; skip to keep perf.

Camera lookAt: camera.lookAt(0, 0, 0).

One nuance: "no allocations inside the render loop" — dummy.position.set doesn't allocate. Math.sin fine. Good.

Let me also double check: `mesh.setColorAt` requires the geometry/material to support; with MeshStandardMaterial works.

Now the full code. Also handle `import * as THREE from 'three';` exactly.

TypeScript strict details:
- `const ready` variable — let ready = false.
- window exposure: `(window as any).__scene = scene;`

Let me also think about whether instanceColor needsUpdate needs setting before first render — setColorAt before first render is fine; needsUpdate defaults. Set it anyway.

Also set `mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);` — good practice for animating matrices.

Write final code:

```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- constants
const GRID_SIZE = 100;          // 100 x 100 = 10,000 instances
const SPACING = 1.2;            // distance between cube centers
const CUBE_SIZE = 0.95;         // small gap between cubes
const WAVE_NUMBER = 0.22;       // k: radians of phase per world unit
const WAVE_SPEED = 1.8;         // phase speed (radians per second)
const WAVE_AMPLITUDE = 6.5;     // vertical travel

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1021');

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(72, 58, 72);
camera.lookAt(0, 0, 0);

// lights
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.6);
dir.position.set(40, 90, 25);
scene.add(dir);

// ---------------------------------------------------------------- instances
const count = GRID_SIZE * GRID_SIZE;
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 });
const cubes = new THREE.InstancedMesh(geometry, material, count);
cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
cubes.frustumCulled = false; // instances move beyond the unit-cube bounds
scene.add(cubes);

// precomputed per-instance data (allocated once, read every frame)
const offsetX = new Float32Array(count);
const offsetZ = new Float32Array(count);
const distance = new Float32Array(count);

const halfSpan = ((GRID_SIZE - 1) / 2) * SPACING;
let maxDistance = 0;

for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const i = iz * GRID_SIZE + ix;
    const x = ix * SPACING - halfSpan;
    const z = iz * SPACING - halfSpan;
    offsetX[i] = x;
    offsetZ[i] = z;
    const d = Math.hypot(x, z);
    distance[i] = d;
    if (d > maxDistance) maxDistance = d;
  }
}

// per-instance colors: gradient along the distance from the center
const colorInner = new THREE.Color('#ffb347');
const colorOuter = new THREE.Color('#2f6bff');
const tmpColor = new THREE.Color();
for (let i = 0; i < count; i++) {
  const t = distance[i] / maxDistance;
  tmpColor.copy(colorOuter).lerp(colorInner, 1 - t);
  cubes.setColorAt(i, tmpColor);
}
if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;

// reusable objects — never allocated inside the loop
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  void clock.getDelta();

  for (let i = 0; i < count; i++) {
    const y = Math.sin(distance[i] * WAVE_NUMBER - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    dummy.position.set(offsetX[i], y, offsetZ[i]);
    dummy.updateMatrix();
    cubes.setMatrixAt(i, dummy.matrix);
  }
  cubes.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------- resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Hmm: I call clock.getDelta() and discard with `void` — that's a bit awkward. Better to use delta to accumulate time, or just use getDelta for the wave phase? The wave needs elapsed time for a phase; using delta accumulation:

```ts
let elapsed = 0;
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  elapsed += dt;
  ...
});
```

That uses delta cleanly and yields elapsed time. Good, avoids the `void` weirdness. Since the loop runs on requestAnimationFrame, elapsed accumulation matches real time.

Alternatively use the time param: `renderer.setAnimationLoop((time) => { const t = time * 0.001; ... })`. That's simplest and typing: `(time: number) => void` assignable to callback type? Let me double check three's typings (current, "three" >= r150 ships types in `three/src`? Actually three ships .d.ts files since r150+? Hmm — three.js added official TypeScript declarations in v150? No... three.js includes types starting with version ~0.153? Yes — since r153 the "three" package includes built-in types. Before that, you'd use @types/three. Built-in types for setAnimationLoop:

In three/src/renderers/WebGLRenderer.d.ts:
```ts
setAnimationLoop( callback: XRFrameRequestCallback | null ): void;
```

Hmm, wait, actually there might be a type AnimationRequestFrameCallback? Let me recall... In build/three.types? The types define:

```ts
type AnimationRequestFrameCallback = (time: number, frame?: XRFrame) => void;
```

Hmm, I'm not sure exactly. There were both variants across versions. To be safe with either typing, using `THREE.Clock` and a zero-arg callback avoids all signature concerns. A callback with zero params is assignable to any callback signature. So `renderer.setAnimationLoop(() => {...})` with a clock is safest. I'll go with delta accumulation + clock.

One more consideration: "Motion must use delta/elapsed time" — accumulating delta is elapsed time. Good.

Amplitude 6.5 with wavelength 2π/0.22 ≈ 28.5 world units — nice big ripples across ~119-unit grid. Speed 1.8 rad/s ≈ 0.29 Hz phase motion — okay maybe 2.0. Fine.

Directional light: with standard material and physically correct... intensity 1.6 might be bright but fine. Add second dim fill light? Not required. Keep ambient + directional as required. (Requirement says "AmbientLight + DirectionalLight" — exactly those; I'll only add those two.)

Color gradient note: material color defaults to white (0xffffff), so instance colors multiply properly.

Double-check `Math.hypot` fine.

maxDistance: corner distance = hypot(59.4, 59.4) ≈ 83.99.

Check camera framing: grid spans x,z ∈ [-59.4, 59.4] (plus wave height ±6.5). Camera at (72,58,72) looking at origin, fov 60 vertical. Distance ≈ sqrt(72²+58²+72²) = sqrt(5184+3364+5184)=sqrt(13732)≈117.2. Half-fov 30° → visible half-height at target ≈ tan(30°)*117.2 ≈ 67.7 in the view plane... Grid projected: it's tilted; should fit. Corner at (-59.4, 0, -59.4) relative to camera direction... Rough check: the farthest grid corner from center horizontally along view: view direction is (-72,-58,-72) normalized; horizontal component. Corner (-59.4,-59.4): its projection... I'll bump camera a bit further: (80, 60, 80) → distance = sqrt(6400+3600+6400)=sqrt(16400)≈128. tan30*128 ≈ 74. Half diagonal of grid in view ~ 59.4*√2 ≈ 84 across diagonal... Hmm, the grid diagonal half-length is 84; when viewed at an angle, the diagonal extent projects to less than 84 horizontally. Rough estimate: horizontal half-extent of the grid projected onto screen is around 59.4 * something ~ 70-84. Vertical aspect multiplies width. Should be fine at 128 distance with fov 60. To be safer, could set fov 55 and position (78, 62, 78). Let me compute more carefully.

Camera pos P = (80, 60, 80). Look at origin. Forward f = -(80,60,80)/|.|. Up ≈ (0,1,0) adjusted. The grid corners: C1 = (59.4, ~0, 59.4) (near-camera side at base), C2 = (-59.4, 0, -59.4) (far side), C3 = (59.4, 0, -59.4), C4 = (-59.4, 0, 59.4), plus wave tops.

For culling-in-frame check, compute angle between view direction and direction to each corner, compare to fov half-angles.

View dir normalized: v = (-80,-60,-80)/128.06 → (-0.6246, -0.4685, -0.6246). Camera right vector r = normalize(v × up... actually r = normalize(cross(f, up))? Let's just compute projection: for point C, direction d = (C - P)/|C-P|. Angle between d and v must be < fov/2 (vertical, adjusted by aspect horizontally: horizontal half-angle = atan(tan(30°)*aspect). With aspect ~1.6, horizontal half-angle ≈ atan(0.577*1.6)=atan(0.924)=42.7°. Vertical 30°.

C4 = (-59.4, y, 59.4) where y = wave (say ±6.5, take 6.5). C4 - P = (-139.4, -53.5, -20.6); norm = sqrt(19432+2862+424)= sqrt(22718)=150.7; d = (-0.925, -0.355, -0.137). Dot with v: 0.578+0.166+0.0856= 0.830 → angle = 33.9°. Horizontal component: decompose d into horizontal plane: d_horiz = (-0.925, -0.137) normalized: (-0.989, -0.147). v_horiz = (-0.6246,-0.6246) normalized: (-0.7071,-0.7071). Dot = 0.699+0.104=0.803 → horizontal angle = 36.6° < 42.7° ✓. Vertical: d_y=-0.355; v_y = -0.4685. Vertical angle between: The vertical component of d in the plane containing v and camera-up. Approx: angle between d and its horizontal projection: arcsin(0.355) = 20.8° downward; angle between v and its horizontal projection: arcsin(0.4685)=27.9° downward. Vertical difference ≈ -7.1° (d is less steep than v → point appears above center? Actually if the ray to point is less steep than view center, the point appears above center). |−7.1| < 30 ✓.

C3 = (59.4, 6.5, -59.4): C3 - P = (-20.6, -53.5, -139.4), norm = sqrt(424+2862+19432)=150.7; d = (-0.137, -0.355, -0.925). Dot with v: 0.0857+0.166+0.578=0.830 → similar. Horizontal: (-0.137, -0.925) norm 0.935: (-0.1466, -0.9893). dot with (-0.7071,-0.7071)= 0.1037+0.6995=0.803 → 36.6° again ✓ vertical similar ✓.

C2 = (-59.4, 6.5, -59.4): C2-P = (-139.4, -53.5, -139.4); norm = sqrt(19432+2862+19432)= sqrt(41726)=204.3; d = (-0.6822, -0.2618, -0.6822). dot v: 0.426+0.1227+0.426=0.975 → 12.9° ✓.

C1 = (59.4, 6.5, 59.4): (−20.6, −53.5, −20.6): norm = sqrt(424+2862+424)= sqrt(3710)=60.9; d=(-0.338,-0.879,-0.338). dot v: 0.211+0.412+0.211=0.834 → 33.4° ✓. Vertical: d vertical angle arcsin(0.879)=61.5° downward vs v 27.9° → difference 33.6° > 30 ✗! The near bottom corner might be slightly outside vertical fov? Hmm wait, near corner is below the camera looking down—the bottom edge might be clipped. Angle difference 33.6° vs half-fov 30° → the nearest cube base would be just outside the bottom of view? But actually the nearest cube (59.4, y, 59.4)... distance from camera horizontal is sqrt((80-59.4)² *2) = sqrt(20.6²*2)=29.1 horizontally, camera height 60. Ray steepness: atan(60/29.1)=64.2° below horizontal; camera view center at atan(sqrt(80²+80²)…/ let me recompute: v has horizontal length sqrt(0.6246²+0.6246²)=0.8833, vertical 0.4685 → downward tilt angle = atan(0.4685/0.8833) = 27.9°. Ray to C1: horizontal dist 29.1, vertical drop 60 - y ≈ 53.5 → tilt = atan(53.5/29.1) = 61.4° below horizontal. Difference from center = 33.5° below center. Vertical half-fov = 30°. So bottom of nearest corner is ~3.5° outside → nearest cube would be clipped when at lowest wave position. Hmm, that means the closest corner of the grid may go off-screen bottom. Not catastrophic but let's improve framing: raise camera or pull back, or reduce fov? Increase fov to 62? Let's just increase distance and height: P = (85, 70, 85). Horizontal distance to center = 120.2; height 70. tilt = atan(70/120.2)=30.2°. Nearest corner (59.4): horizontal dist = sqrt((85-59.4)²*2) = sqrt(655*2)= sqrt(1311)=36.2; drop = 70 - 6.5 = 63.5 → tilt = atan(63.5/36.2)=60.3°; difference = 30.1° ≈ borderline. Hmm still borderline at the very nearest cube bottom. But wait — the nearest corner in terms of screen position: cubes near the camera-projected bottom. Being 30.1° vs 30° means the single nearest cube base sits right at the edge. Since the camera also has vertical fov measured in screen space, the extreme edge is corner-ish, not full-frame; the horizontal offset matters too. The point at exactly bottom-center would be clipped only if directly below-ish. Our point C1 lies along the diagonal direction which is the horizontal center of the screen actually (camera diagonal view → near corner projects to bottom-center of screen). Hmm, C1 is along the same diagonal as view direction, so it projects at bottom-center. tilt diff 30.1° ≈ exactly the edge. So nearest cube at max wave height +6.5... wait I used y=6.5 lowering drop to 63.5. With y at -6.5, drop = 76.5, tilt = atan(76.5/36.2)=64.7°, diff ~34.5° → clipped.

Options: pull camera farther: P=(95,72,95). horiz dist 134.4, height 72 → center tilt atan(72/134.4)=28.2°. Nearest corner horizontal: sqrt((95-59.4)²*2) = sqrt(35.6²*2)=50.3. Drop with y=+6.5: 65.5 → tilt 52.5° → diff 24.3° ✓. With y=-6.5: 78.5 drop → tilt 57.3° → diff 29.1° < 30 ✓ (barely). Also check far corner C2 angle: C2-P = (-95-59.4? wait C2=(-59.4,0,-59.4)); C2 - P = (-154.4, -6.5, -154.4) → norm sqrt(23839+42+23839)= sqrt(47720)=218.4; d=(-0.7069,-0.0298,-0.7069). dot with v: v = -(95,72,95)/norm; norm = sqrt(9025+5184+9025)=sqrt(23234)=152.4; v = (-0.6234,-0.4725,-0.6234). dot: 0.4406+0.0141+0.4406=0.895 → 26.5°... horizontal: d_horiz = (-0.7069,-0.7069) → aligned with v_horiz (-0.7987? compute: v horizontal = (-0.6234,-0.6234)/0.8816 = (-0.7071,-0.7071)); dot = 0.7069*0.7071*2 = 0.9998 → ~1.0° horizontally... fine. Vertical: d tilt = atan(0.0298/0.9996)=1.7°; v tilt 28.2°; diff 26.5° < 30 ✓. And side corners C3=(59.4,0,-59.4): C3-P = (-35.6, -72, -154.4)... wait y=... use 0: (-35.6, -72, -154.4); norm = sqrt(1267+5184+23839)= sqrt(30290)=174.1; d = (-0.2045,-0.4136,-0.8869). dot v: 0.1275+0.1954+0.5530=0.876 → 28.8° ✓ within 30. Horizontal check: horizontal half-angle = atan(tan(30°)*aspect). For aspect ≥ 1.2, ~35°+. d_horiz = (-0.2045,-0.8869) normalized: (-0.2250, 0.9743)? norm sqrt(0.0418+0.7866)= sqrt(0.8284)=0.9102 → d_h = (-0.2247,-0.9744). dot with v_h (-0.7071,-0.7071): 0.1589+0.6889=0.8478 → 32° < ~35+ ✓ (assuming aspect ≥ 1.15). For a square window (aspect 1), horizontal half-angle = 30° → 32° > 30 slightly clipped on the side. Meh. Typical test window is wider than tall. But to be robust, maybe widen fov to 55? No—larger fov fits more. Let's set fov 60 and camera (95,75,95)? Vertical half 30.

Actually simpler robust approach: keep fov 60, position (90, 70, 90). Distance-based fit: I trust it's approximately fine; the requirement just wants "camera at an angle so the whole grid and wave are visible". Slight edge clipping of the nearest cube at the extreme wave position is acceptable, but let's aim comfortably inside. Use fov 60, P = (100, 75, 100). hdist=141.4, height 75, center tilt = atan(75/141.4)=27.9°, vertical half fov 30.

Far corner: (−59.4,0,−59.4): drop 75, hdist 159.1 → tilt 25.2°; diff 2.7° ✓ trivially. Side corners: C3=(59.4, 0, -59.4): dx = 100-59.4=40.6 toward x, dz = 100+59.4=159.4; horizontal dist = sqrt(40.6²+159.4²)= sqrt(1648+25408)= sqrt(27056)=164.5; drop 75 → vertical tilt atan(75/164.5)=24.5°, diff vs 27.9 = 3.4° ✓. Horizontal angle of C3: d_h = (-40.6, -159.4)/164.5 = (-0.2468, -0.9689). v_h = (-0.7071,-0.7071). dot = 0.1745+0.6851=0.8596 → 30.7°. Need ≤ horizontal half-angle: atan(tan(30)*aspect). aspect 1 → 30°: slightly out. aspect 1.6 → atan(0.9237) = 42.7°: fine. With fov 60 vertical on a portrait window it'd clip the sides, but portrait screens are unusual for this; also the requirement is that the setup is reasonable on typical windows.

Near corner (59.4, y, 59.4): horizontal dist = sqrt(40.6²*2)=57.4; drop = 75 - y. y=-6.5 → 81.5 → tilt = atan(81.5/57.4)=54.8°, diff = 26.9° < 30 ✓. y=+6.5 → 68.5 → tilt = atan(68.5/57.4)=50.0°, diff 22.1° ✓.

So camera (100, 75, 100), fov 60 works for landscape windows and fits even near-square. Distance = sqrt(10000+5625+10000)=sqrt(25625)=160.1; far plane 1000 fine. Fog? no.

Alternatively reduce amplitude to make the wave fit more forgivingly. Amplitude 6.5 → total wave height 13 on a 119-wide grid; visually good. Keep.

Actually, let me double check vertical extent: at the far corner, cube tops at y=6.5 and the horizon... far corner top: (−59.4, 6.5, −59.4) tilt: drop = 75−6.5=68.5, hdist 159.1 → 23.3° → diff 4.6° ✓.

Also I should double check the horizontal half-angle for aspect 1: tan(30°)=0.5774 → horizontal half-angle = 30° (square). C3 at 30.7° — marginally outside by 0.7°, i.e., the extreme side corners would clip ~1% on a perfectly square window. Negligible; and typical test harness uses a wide-ish viewport. Could add fov 62 to add margin. Let me set fov 62? That changes vertical half to 31: near corner fits (26.9 < 31) ✓, sides get more margin. I'll use fov 60... honestly, using 62 or 65 is fine too. I'll keep 60 but pull slightly: P = (105, 80, 105). hdist = 148.5, center tilt 28.3°. Near corner: horiz dist sqrt(45.6²*2)=64.5; drop y=-6.5 → 86.5 → tilt 53.3° → diff 25° ✓. Side corner: horizontal 164.5→ wait recompute: dx = 105-59.4 = 45.6; dz = 105+59.4 = 164.4; hdist = sqrt(2079+27027)= sqrt(29106)=170.6; drop 75... wait height 80: drop = 80; tilt = atan(80/170.6)=25.1° vs center 28.3 → vertical diff 3.2° ✓; horizontal angle: d_h = (-45.6,-164.4)/170.6 = (-0.2673,-0.9638); dot with (-0.7071,-0.7071) = 0.1890+0.6815=0.8705 → 29.5° < 30 ✓ even square aspect.

Far corner top: hdist = sqrt((105+59.4)²*2)=232.5; drop = 80-6.5=73.5 → tilt 17.5°, diff 10.8° ✓.

So camera.position.set(105, 80, 105) works robustly. Distance from origin: sqrt(11025+6400+11025) = sqrt(28450) = 168.7. Far plane 2000 to be safe. Fine.

Hmm, but bigger amplitude cubes nearer camera... fine.

Now, one more check: cube size 0.95 with spacing 1.2 gives gaps. Looks good.

Wave parameters: k = 0.22 rad/unit → wavelength 28.6; grid diagonal extent 84 → about 5.9 wavelengths along diagonal — hmm that's plenty of rings; maybe k = 0.18 → λ ~ 35 → about 4.8 rings. Fine. Speed 2.0 rad/s → phase velocity = speed/k = 2/0.22 ≈ 9 units/s outward. Looks dynamic. Amplitude 6.

I'll set WAVE_NUMBER = 0.25, WAVE_SPEED = 2.0, AMPLITUDE = 6.0. λ = 2π/0.25 = 25.1; phase velocity 8 units/s.

Colors: inner '#ff8a3d' warm orange, outer '#3a7bd5' cool blue? Gradient by distance: center warm, edges blue. Good contrast with dark blue background.

Alternatively gradient by grid position linearly: color changes along x from teal to magenta... radial matches wave theme. The requirement: "e.g. a gradient by grid position" — distance-based gradient qualifies.

Now write the code carefully, strict mode:

Potential strict issues:
- All declarations typed.
- `cubes.instanceColor` possibly null → guard with if.
- No unused vars.

Also note "the page has no other HTML" — we append canvas to document.body. Maybe set body margin via style? Not necessary but could add `renderer.domElement.style.display = 'block'`? Not required. Keep minimal, maybe set body margin 0? Could cause scrollbars due to canvas 100vw? The canvas at window size might overflow if body has default margin → scrollbars. That's page CSS, not required. I can optionally set `document.body.style.margin = '0px'` to avoid scrollbars — harmless. I'll include it minimally? The instructions say reply with a single ts code block and nothing else — fine, code can include that line. I'll include `document.body.style.margin = '0';`? Hmm, "The page has no other HTML" means no markup; setting style via JS is fine. I'll add it; low risk... Actually careful: `document.body.style.margin = '0';` valid TS. Yes.

Let me finalize the animation loop with delta accumulation:

```ts
let elapsed = 0;
renderer.setAnimationLoop(() => {
  elapsed += clock.getDelta();
  ...
});
```

And set __ready after first render.

Wait — should __ready be set after first frame rendered. Yes, right after renderer.render call, set flag.

Also expose __scene etc. at module top-level after creation.

Edge: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — devicePixelRatio could be fractional; fine.

Write the header comments concisely.

One more strict-typing pitfall: `THREE.Clock` exists. `clock.getDelta()` returns seconds.

Also for updateMatrix: dummy.rotation untouched (identity). Good. Could use a Matrix4 + makeTranslation instead — either; Object3D approach is explicit. I'll use Matrix4 with makeTranslation for fewer ops:

```ts
const matrix = new THREE.Matrix4();
...
matrix.makeTranslation(x, y, z);
cubes.setMatrixAt(i, matrix);
```

make Translation allocates? No, it writes into the existing matrix elements. Both fine. I'll use Object3D dummy — commonly recognizable. Either satisfies "Reuse one Object3D or Matrix4". I'll use a single Matrix4 via makeTranslation — simplest, no updateMatrix overhead. Actually dummy.updateMatrix() composes position/quaternion/scale — negligible. I'll pick Matrix4 for clarity that we reuse one. Hmm, requirement says "Reuse one Object3D or Matrix4 for the updates" — either satisfies. I'll use Matrix4 + makeTranslation.

Final code assembly. Also add small comment noting no per-frame allocations.

Check for any `any` leaking besides window exposure. `(window as any).__scene = scene;` per spec.

Let me write it:

```ts
import * as THREE from 'three';

const GRID = 100;              // 100 x 100 = 10,000 instances
const SPACING = 1.2;           // world-space distance between cube centers
const CUBE_SIZE = 0.95;        // slightly smaller than spacing -> visible gaps
const WAVE_NUMBER = 0.25;      // k  (phase radians per world unit)
const WAVE_SPEED = 2.0;        // phase speed (radians per second)
const WAVE_AMPLITUDE = 6.0;    // vertical amplitude

const COUNT = GRID * GRID;
const HALF_SPAN = ((GRID - 1) / 2) * SPACING;   // 59.4

// ----------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ------------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0e1a');

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
);
camera.position.set(105, 80, 105);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(60, 100, 40);
scene.add(directionalLight);

// ---------------------------------------------------------- instanced mesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.35,
  metalness: 0.15,
});
const cubes = new THREE.InstancedMesh(geometry, material, COUNT);
cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
cubes.frustumCulled = false;
scene.add(cubes);

// --- static per-instance data, allocated exactly once --------------------
const offsetX = new Float32Array(COUNT);
const offsetZ = new Float32Array(COUNT);
const distance = new Float32Array(COUNT);

let maxDistance = 0;
for (let iz = 0; iz < GRID; iz++) {
  const z = iz * SPACING - HALF_SPAN;
  for (let ix = 0; ix < GRID; ix++) {
    const i = iz * GRID + ix;
    const x = ix * SPACING - HALF_SPAN;
    offsetX[i] = x;
    offsetZ[i] = z;
    const d = Math.hypot(x, z);
    distance[i] = d;
    if (d > maxDistance) maxDistance = d;
  }
}

// --- per-instance colors: radial gradient out from the centre -------------
const colorCenter = new THREE.Color('#ffb347');
const colorEdge = new THREE.Color('#2f6bff');
const color = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  color.copy(colorEdge).lerp(colorCenter, 1 - distance[i] / maxDistance);
  cubes.setColorAt(i, color);
}
if (cubes.instanceColor !== null) cubes.instanceColor.needsUpdate = true;

// --- reusable helpers (nothing is allocated inside the render loop) -------
const matrix = new THREE.Matrix4();
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  elapsed += clock.getDelta();

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distance[i] * WAVE_NUMBER - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    matrix.makeTranslation(offsetX[i], y, offsetZ[i]);
    cubes.setMatrixAt(i, matrix);
  }
  cubes.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ----------------------------------------------------------------- resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------------------------------------------- test hooks
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Check: `color.copy(colorEdge).lerp(colorCenter, 1 - distance[i] / maxDistance)` — lerp toward center color by inverse normalized distance: at center (t_dist=0) → 1-0=1 → fully center color ✓; at edge → 0 → edge color ✓.

Strict mode: `maxDistance` declared with let, used. All good.

No allocations in loop: matrix.makeTranslation writes in place (it calls set internally — no allocation). Math.sin returns number. getDelta returns number. Good.

The spec says "sin(distanceFromCenter * k - time * speed)" — matches.

Ensure no unused imports: THREE used everywhere ✓.

Should I set `document.body.style.margin = '0px';`? Optional—skip or add. I'll add `renderer.domElement.style.display = 'block';` to avoid inline-canvas baseline gap causing scrollbars. That's a nice touch, harmless. Actually canvas default display is inline in CSS? Canvas is replaced inline element — with body margin 0 the canvas exactly fits; inline adds line-height space though possibly causing 4px overflow and scrollbars. Setting display block avoids it. I'll add one line: `renderer.domElement.style.display = 'block';`.

Also `renderer.setPixelRatio` — resize: pixel ratio handled? On resize we call setSize which respects current pixel ratio ✓.

Double-check directional light intensity: with `MeshStandardMaterial`, in newer three (r155+) lighting mode "physicallyCorrectLights" default (useLegacyLights false default since r155), directional intensity 1.5 ~ fine.

Ambient 0.45 fine.

instanceColor needsUpdate before first render — even without flags, the attribute uploads on first render. Setting true harmless.

TypeScript: `cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);` ✓.

Everything checks. One more subtlety: requirement "Reuse one Object3D or Matrix4 for the updates" — I use one Matrix4 named `matrix` ✓ and reuse `color` only at init (fine).

Also, should the loop function name be `animate`? Doesn't matter.

tsc --strict with DOM lib — window, document available ✓. `(window as any)` ✓.

I think it's complete. Provide one ts code block, nothing else. Also no leading text. Let me finalize formatting with the code block labeled ts.