Requirements: A single TypeScript file, importing * as THREE from 'three', with the renderer appended to document.body, size set from the window with resize handling, setAnimationLoop, delta-based motion, expose __scene/__camera/__renderer and set __ready after the first frame, no external assets.

Core: A 100×100 = 10,000 instance grid using InstancedMesh. Animate a radial wave every frame: y = sin(distance * k − time * speed) * amplitude, via setMatrixAt, and flag instanceMatrix.needsUpdate. Set instance colors with setColorAt (a gradient based on grid position). Reuse a single Object3D or Matrix4 — no allocations inside the loop. MeshStandardMaterial, AmbientLight + DirectionalLight. An angled camera that shows the whole grid and the wave.

Design:

Grid: 100×100, spacing about 1.0, cube size around 0.85. Center the grid: offset = -(N-1)/2 * spacing, so coordinates run from -49.5 to +49.5.

Precompute per-instance distance from the center (Float32Array of length 10000), so no allocation or sqrt in the loop. Actually, computing dist = Math.hypot(x, z) just once in setup is fine. In the loop: y = Math.sin(dist * k − time * speed) * amplitude.

Reuse a single Matrix4 (or Object3D). Since only Y changes and the rotation/scale are identity, we can directly compose the matrix: matrix.setPosition(x, y, z)? Matrix4.setPosition mutates the existing matrix. Since all instances are identity + translation, we can prebuild the matrix once and just call setPosition every frame. That's the cleanest: const m = new THREE.Matrix4(); every frame m.setPosition(x, y, z); mesh.setMatrixAt(i, m);.

Wait — does setMatrixAt copy? Yes, it writes to an array. Good, no allocation.

Color: after mesh.setColorAt(i, color), instanceColor.needsUpdate = true (set it once in setup). Gradient based on grid position: e.g. mix color based on (u, v), or HSL based on distance for a nice radial look. "A gradient based on grid position" — do a diagonal gradient using HSL, or a mix of two colors. Keep it simple: color.setHSL(0.6 - 0.6 * (u + v)/2, 0.8, 0.55) or something. Or a lerp between cyan and magenta. Since it's MeshStandardMaterial, instanceColor multiplies into the base color (base color should be white so the instance color shows).

Material: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 }).

Lights: AmbientLight(0xffffff, 0.5), DirectionalLight(0xffffff, 1.2) placed at (50, 80, 30).

Camera: PerspectiveCamera(55, aspect, 0.1, 1000). Position around (70, 55, 70), lookAt(0,0,0). Grid span is about 99 units; from a distance of ~100 at 55° FOV it should fit. Maybe position (60, 48, 60) or so. Let's compute: distance sqrt(60²+48²+60²) ≈ sqrt(3600+2304+3600)= sqrt(9504) ≈ 97.5. FOV 55°, vertical half-angle ~27.5°, at distance 97.5 the visible half-height ≈ 97.5*tan(27.5°) ≈ 97.5*0.52 ≈ 50.7. Grid half-diagonal ≈ 70. Hmm, it might get clipped horizontally. Horizontal FOV depends on aspect; at aspect 16/9, horizontal half-angle = atan(tan(27.5°)*1.78) ≈ atan(0.52*1.78)=atan(0.925)≈42.8°, half-width ≈ 97.5*0.925 ≈ 90. The far corner of the grid is 70.6 from center in the XZ plane, but the grid is roughly in a horizontal plane; from a camera tilted at ~34°, the projected extent is… roughly fine. To be safe, pull the camera back to (80, 60, 80): distance = sqrt(6400+3600+6400)=sqrt(16400)≈128. Half-height ≈ 128*0.52 ≈ 66.6, at aspect 1.78 half-width ≈ 118. The farthest corner (49.5, 0, 49.5) from the camera… no problem. Use (75, 58, 75) or something and lookAt origin. Maybe set camera to (70, 55, 70) and set FOV to 60. Visible half-height = 97.5*tan30 ≈ 56.3. Grid corners are 49.5√2 ≈ 70 from center along the far diagonal… projected to camera. It should mostly fit. To be safe: (85, 65, 85) with FOV 55 → distance ≈ 147, half-height ≈ 76. That's more than enough. Slightly high angle. OK.

Wave params: amplitude 3, k (spatial frequency) ~0.35, speed ~3.

delta-based: const clock = new THREE.Clock(); elapsed += clock.getDelta(). Guard against huge delta on tab switch? Can clamp delta to 0.1. Nice touch.

__ready: set after the first frame is rendered. Use a flag: inside the loop, if (!readyFlag) { after renderer.render? } In practice "after the first frame is rendered" — after renderer.render call in the loop, before the next frame. setAnimationLoop callback: render, then if (!firstFrameDone) { firstFrameDone = true; (window as any).__ready = true; }.

Strict TS: types — InstancedMesh<BoxGeometry, MeshStandardMaterial>. setColorAt exists on InstancedMesh (in recent three's typings, InstancedMesh has setColorAt). Yes, three r150+ has setColorAt in typings (r126+? included in typings). Recent three has it. Note: before calling setColorAt, mesh.instanceColor may be null; three creates it. setColorAt initializes the instanceColor attribute. Then after all setColorAt calls, set mesh.instanceColor.needsUpdate = true. In strict TS, instanceColor is InstancedBufferAttribute | null, so need a null check: if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true.

Resize handler: update camera.aspect, updateProjectionMatrix, renderer.setSize.

DPR: setPixelRatio(Math.min(window.devicePixelRatio, 2)).

Colors: gradient based on grid position. Example: for row i (0..99) and column j: t = (i + j) / 198; color.setHSL(0.55 + 0.45*t? ...). Let's do a 2-color gradient: cA = new Color(0x2255ff) blue, cB = new Color(0xff3366)? Hmm, "a gradient based on grid position" — a diagonal gradient is nice. Use hsl: hue = 0.55 - 0.5 * ((u+v)/2) → cyan to red. Or keep two corners: lerpColors with a diagonal parameter. To avoid per-loop allocation, use a temp Color outside the loop — but color is only set once in setup, so allocation in setup is fine (the "no allocation" constraint is only for the render loop).

Actually, to make the wave more visible, tint color with height? The spec says color is a static gradient based on grid position, and Y is animated. Keep it static.

Instance color multiplies material color; material color is white.

Also frustum culling: does InstancedMesh culling use the base geometry's bounding sphere? InstancedMesh computes its own bounding sphere via computeBoundingSphere in newer three. To be safe, set mesh.frustumCulled = false. Good.

Ground? Not needed. A subtle background color and fog? Keep it simple: scene.background = new THREE.Color(0x0b0e14).

Shadows? Not needed; can enable for looks but costs perf with 10k instances — fine either way. Skip shadows for perf safety (10k instances with shadows is fine but unnecessary). Keep it lightweight.

Code:

```ts
import * as THREE from 'three';

// ---- Config ----
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE = 0.82;
const AMPLITUDE = 3.0;
const K = 0.32;
const SPEED = 3.0;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1017);

// Camera
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(85, 62, 85);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.4);
dir.position.set(60, 100, 40);
scene.add(dir);

// Grid geometry + material
const geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 });
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.frustumCulled = false;
scene.add(mesh);

// Precompute positions + radial distances (static; no per-frame allocs)
const xs = new Float32Array(COUNT);
const zs = new Float32Array(COUNT);
const dists = new Float32Array(COUNT);
const half = (GRID - 1) * 0.5;

const color = new THREE.Color();
const colorA = new THREE.Color(0x1e90ff); // deep sky blue
const colorB = new THREE.Color(0xff2e88); // pink
// or HSL

let idx = 0;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = (j - half) * SPACING;
    const z = (i - half) * SPACING;
    xs[idx] = x;
    zs[idx] = z;
    dists[idx] = Math.hypot(x, z);
    const t = ((i / (GRID - 1)) + (j / (GRID - 1))) / 2;
    color.copy(colorA).lerp(colorB, t);
    mesh.setColorAt(idx, color);
    idx++;
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// Shared matrix (single allocation, reused every frame)
const m = new THREE.Matrix4();

// Initial matrices
for (let i = 0; i < COUNT; i++) {
  m.setPosition(xs[i], 0, zs[i]);
  mesh.setMatrixAt(i, m);
}
mesh.instanceMatrix.needsUpdate = true;

// Animation
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(dists[i] * K - elapsed * SPEED) * AMPLITUDE;
    m.setPosition(xs[i], y, zs[i]);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;

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

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Wait: the initial m is identity Matrix4; setPosition mutates element 12, 13, 14 — fine.

Strict TS considerations:
- Math.min(window.devicePixelRatio, 2) is fine.
- setColorAt is typed in three's typings: yes, `setColorAt(index: number, color: Color): void`.
- instanceColor: `instanceColor: InstancedBufferAttribute | null;` — handled with null check.
- setAnimationLoop callback param is (time: number) — unused param; use no params.

One more: "reuse a single Object3D or Matrix4 for the update" — we use a single Matrix4 m. Good.

Camera angle: whole grid is 99 units wide; camera (85,62,85), distance ≈ sqrt(7225+3844+7225)= sqrt(18294)≈135.2. Half-height = 135.2*tan(27.5°)≈72.4; at 16:9 aspect, tan hfov/2 = tan(vfov/2)*aspect = 0.5206*1.78≈0.927 → half-width ≈ 125. Grid far corner (-49.5,0,-49.5) projects somewhere inside. Fine. lookAt(0,0,0) is enough.

Could also lookAt(0, 0, 0). Yes.

__ready set after render call — good.

Also body has no other HTML; maybe set body margin to 0 via document.body.style.margin = '0'? "The page has no other HTML" — modifying body style is fine. Add document.body.style.margin = '0' and overflow hidden to avoid scrollbars. That's a DOM style change, allowed.

Edge: tsc --strict — `window.addEventListener('resize', ...)` is fine. All typed. No unused variables (GRID etc. are all used; half used; idx used). All variables used. colorA, colorB used.

One subtlety: `mesh.instanceColor.needsUpdate = true;` — after the if check, TS narrows? We wrote `if (mesh.instanceColor) { mesh.instanceColor.needsUpdate = true; }` — fine.

Also confirm the render loop uses time, not frame count — yes, elapsed from clock delta.

Add fog? Not needed; skip to keep it minimal, or add a subtle fog for depth. Optional — skip to keep strict and simple. Actually a small fog looks nice: scene.fog = new THREE.Fog(0x0d1017, 120, 300); harmless. Add it.

Double-check "flag instanceMatrix for update" — mesh.instanceMatrix.needsUpdate = true every frame. Done.

Also "give each instance its own color via setColorAt (e.g. gradient based on grid position)" — diagonal lerp gradient, done. Each instance has its own color (each t varies).

Final answer: single ```ts code block, nothing else.
