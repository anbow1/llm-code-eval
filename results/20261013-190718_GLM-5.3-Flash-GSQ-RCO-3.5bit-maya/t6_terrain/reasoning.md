The user wants a complete TypeScript file for a browser with a procedural terrain built from a hand-made BufferGeometry. Let me write this carefully.

Requirements:
1. Import Three.js as `import * as THREE from 'three';`
2. Create WebGLRenderer, append canvas to document.body
3. Size from window.innerWidth/innerHeight, handle resize
4. Use renderer.setAnimationLoop, motion uses delta/elapsed time
5. Expose __scene, __camera, __renderer, __controls, __ready
6. Hand-made BufferGeometry for terrain:
   - 128x128 vertices, 20x20 units in XZ plane, centered at origin
   - Height = sum of 3 sine/cosine layers, amplitude ~2
   - Index buffer via setIndex, winding so faces point UP (+Y)
   - computeVertexNormals()
   - Vertex colors by height (green low, brown middle, white high), MeshStandardMaterial vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping, updated every frame
9. Camera above terrain at angle, whole terrain visible

Let me think about the winding. In Three.js, the default front face is counter-clockwise when viewed from the front. For faces pointing +Y (up), when viewed from above (+Y looking down), the vertices should appear counter-clockwise.

Let me define the grid: 128 vertices per side, so 127 segments. Size 20x20, so spacing = 20/127. Position: x = -10 + col * spacing, z = -10 + row * spacing (centered at origin).

For a grid indexed by (row, col) with row along Z and col along X, vertex index = row * 128 + col.

For a quad with corners:
- a = top-left (z0, x0) = (row, col)
- b = top-right (z0, x1) = (row, col+1)
- c = bottom-left (z1, x0) = (row+1, col)
- d = bottom-right (z1, x1) = (row+1, col+1)

When viewed from above (looking down -Y), with +X to the right and +Z pointing... In Three.js, when looking down from +Y, +X is right and +Z is toward the viewer's bottom (screen down) if camera is oriented normally. Actually, looking down -Y direction: +X right, +Z down on screen (if camera up is -Z... hmm). Let me think in terms of cross product instead.

Triangle (a, b, c): normal = (b - a) × (c - a).
- a = (x0, h_a, z0), b = (x1, h_b, z0), c = (x0, h_c, z1)
- b - a ≈ (dx, 0, 0) (ignoring heights)
- c - a ≈ (0, 0, dz) with dz > 0 (z1 > z0)
- (dx, 0, 0) × (0, 0, dz) = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

With dx > 0, dz > 0, that gives (0, negative, 0) — pointing down. So triangle (a, b, c) points down with that order. To point up, use (a, c, b): 
- (c - a) × (b - a) = (0,0,dz) × (dx,0,0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) — pointing up. 

Alternatively (a, b, d) and (a, d, c):
- a, b, d: (b-a) × (d-a) = (dx,0,0) × (dx,dz) → (dx, 0, 0) × (dx, 0, dz) = (0*dz - 0*0, 0*dx - dx*dz, ...) = (0, -dx*dz, 0) — down. Hmm.

Let me use (a, c, b) and (b, c, d):
- b, c, d: (c - b) × (d - b) = (-dx, 0, dz) × (0, 0, dz) = (0*dz - dz*0, dz*0 - (-dx)*dz, -dx*0 - 0*0) = (0, dx*dz, 0) — up. 

So triangles: (a, c, b) and (b, c, d). Wait let me double check (a, c, b):
- (c - a) × (b - a): c - a = (0, ?, dz) direction (0,0,dz); b - a = (dx, 0, 0).
- Cross product (0,0,dz) × (dx,0,0) = determinant:
  i: 0*0 - dz*0 = 0
  j: dz*dx - 0*0 = dz*dx
  k: 0*0 - 0*dx = 0
  = (0, dz*dx, 0) — up. Correct.

And (b, c, d):
- c - b = (0 - dx? ) c is (x0, z1), b is (x1, z0). c - b = (-dx, 0, dz). d - b = (0, 0, dz).
- (-dx, 0, dz) × (0, 0, dz) = 
  i: 0*dz - dz*0 = 0
  j: dz*0 - (-dx)*dz = dx*dz
  k: (-dx)*0 - 0*0 = 0
  = (0, dx*dz, 0) — up. Correct.

So index order per cell: a, c, b, b, c, d where:
- a = row * n + col
- b = row * n + col + 1
- c = (row + 1) * n + col
- d = (row + 1) * n + col + 1

Note: In Three.js BufferGeometry, counterclockwise is front-facing. A triangle with normal pointing +Y (up), when viewed from above, appears counterclockwise. Our cross product computation gives the geometric normal via right-hand rule; if it points +Y, the winding is CCW viewed from +Y. Good.

Heights: sum of 3 sine/cosine layers. Amplitude about 2 total. Let me do:
- h = 1.0 * sin(x * 0.5) * cos(z * 0.5) + 0.6 * sin(x * 1.2 + z * 0.8) + 0.4 * cos(x * 2.0 - z * 1.5)

Hmm, sum of amplitudes: 1.0 + 0.6 + 0.4 = 2.0. But the actual max might be less since they multiply... Actually first layer is product of sin and cos so max 1.0. Sum max could be 2.0. Good, "amplitude about 2".

Actually let me make it more interesting:
```ts
const height = (x: number, z: number): number => {
  const layer1 = Math.sin(x * 0.35) * Math.cos(z * 0.35);
  const layer2 = Math.sin(x * 0.9 + z * 0.6) * 0.55;
  const layer3 = Math.cos(x * 1.7 - z * 1.3) * 0.35;
  return layer1 + layer2 + layer3; // max amplitude ~1.9
};
```
Hmm 1.0 + 0.55 + 0.35 = 1.9, "about 2". Fine. But maybe scale to make peaks reach ~2. Let's multiply: amplitude ~2 total. Let me just do:

```ts
function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.0 +
    Math.sin(x * 0.8 + z * 0.5) * 0.6 +
    Math.cos(x * 1.6 - z * 1.1) * 0.35
  );
}
```
Max = 1.95 ≈ 2. Good.

Vertex colors by height. Height range: min ~ -1.95, max ~ +1.95. Normalize: t = (h - minH) / (maxH - minH). I'll compute min/max from actual heights to be safe. Color ramp:
- Low (t=0): green (e.g., 0x2e7d32 or (0.2, 0.65, 0.25))
- Middle (t=0.5): brown (0x8b5a2b or (0.55, 0.4, 0.2))
- High (t=1): white (1, 1, 1)

Interpolate: if t < 0.5, lerp green→brown with t*2; else lerp brown→white with (t-0.5)*2. Or use THREE.Color lerp. I'll write manual lerp or use THREE.Color#lerpColors. Simple:

```ts
const cLow = new THREE.Color(0x3a7d2c);
const cMid = new THREE.Color(0x8b6b3a); // brown
const cHigh = new THREE.Color(0xffffff);
```

Loop through vertices, compute height, normalized t, color, push into colors array.

Then geometry.setAttribute('position', ...), setAttribute('color', ...), setIndex(indices), computeVertexNormals().

Material: MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide? }) — front side is fine since winding points up, but DoubleSide could help visibility from below. I'll keep FrontSide default; actually to be safe for testing from any angle maybe DoubleSide. The spec says winding must point up; material side isn't specified. I'll use FrontSide (default). Hmm, but tests might check... Keep default. Actually DoubleSide doesn't hurt. I'll leave default FrontSide to keep normals meaningful. Either is fine.

Lights: AmbientLight(0xffffff, 0.4) and DirectionalLight(0xffffff, 1.0) positioned above, e.g., (10, 15, 8).

Camera: PerspectiveCamera, positioned above terrain at an angle. Terrain 20x20, height ±2. Camera at e.g. (14, 12, 14) looking at origin. Distance sqrt(14²+12²+14²) ≈ 23. With fov 55, visible. Set camera.position.set(16, 12, 16); camera.lookAt(0, 0, 0). OrbitControls target 0,0,0.

Renderer: setPixelRatio(Math.min(window.devicePixelRatio, 2)), setSize, append canvas. Renderer's canvas: renderer.domElement.

Animation loop: renderer.setAnimationLoop(() => { const delta = clock.getDelta(); controls.update(); renderer.render(scene, camera); if (!readyFlag) { (window as any).__ready = true; readyFlag = true; } }). "Motion must use delta/elapsed time" — the terrain is static; but to satisfy the requirement, maybe I should add some subtle motion? The spec doesn't require animated objects. But the general rules say motion must use delta. Since there's no motion needed, I can still create a clock and get delta, and maybe animate the directional light subtly? Hmm — orbit controls damping uses delta implicitly via controls.update(). I'll create a clock, get delta each frame, and use it for a subtle light movement or just pass to controls.update() (which doesn't take delta). To be safe, I could add a gentle rotation of the directional light around the scene using elapsed time — but that might change lighting during tests... probably fine. Actually, let me add a very subtle directional light orbit? That could affect shadow/appearance. Alternatively, no motion at all is acceptable — but rule says "Motion must use delta/elapsed time, not frame counts", which is a constraint IF there is motion. To be safe and compliant, I'll animate something minor using delta: maybe slowly rotate the directional light around Y axis. That's fine and shows delta usage. Actually, hmm, moving light could be considered a distraction. Let me add a gentle bobbing of directional light or orbit — it's tasteful. I'll do a slow orbit of the directional light using elapsed time: light position = (cos(t*0.15)*15, 18, sin(t*0.15)*15). That's subtle.

Alternatively, keep static. I think a slow sun orbit is nice and satisfies the delta rule. I'll include it.

__ready: set after first frame rendered. Use a flag: let firstFrame = true; in loop, render, then if firstFrame { (window).__ready = true; firstFrame = false; }.

Resize: window.addEventListener('resize', ...) update camera.aspect, projection matrix, renderer size.

TypeScript strict: 
- (window as any) casts fine.
- clock.getDelta() returns number.
- Arrays: use Float32Array directly or number[] then new Float32Array(arr). Either.

Grid: SIZE = 20, SEGMENTS = 127 (128 vertices per side). Grid 128x128 vertices → indices count = 127*127*6 = 96774 triangles? No, 127*127 cells * 6 indices = 96,744 indices, 32,248 triangles. Fine, use Uint32Array or regular array; setIndex accepts array of numbers — Three will pick Uint16/Uint32 automatically. Vertex count = 128*128 = 16384 < 65536 so Uint16 works. I'll just pass a number[] to setIndex.

Let me now write the code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9); // sky-ish. Maybe darker for contrast? 
```

Hmm, background color — with vertex colors and standard material, a soft sky blue or dark navy. I'll pick a soft dusk blue: 0x9db8c9 or dark 0x101820. Let me use a calm gradient-ish flat color: 0x8fb0c9. Fine.

```ts
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(16, 12, 16);
camera.lookAt(0, 0, 0);

// ---------- controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ---------- lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
sun.position.set(12, 18, 8);
scene.add(sun);
```

Terrain:

```ts
const GRID = 128;          // vertices per side
const TERRAIN_SIZE = 20;   // world units in XZ
const half = TERRAIN_SIZE / 2;
const step = TERRAIN_SIZE / (GRID - 1); // 127 segments

function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.32) * Math.cos(z * 0.32) * 1.05 +
    Math.sin(x * 0.85 + z * 0.6) * 0.55 +
    Math.cos(x * 1.6 - z * 1.15) * 0.35
  );
}
```

Sum max: 1.05 + 0.55 + 0.35 = 1.95 ≈ 2. 

Positions + heights, track min/max for color normalization:

```ts
const positions = new Float32Array(GRID * GRID * 3);
const heights = new Float32Array(GRID * GRID);
let minH = Infinity, maxH = -Infinity;

let i = 0;
for (let row = 0; row < GRID; row++) {
  const z = -half + row * step;
  for (let col = 0; col < GRID; col++) {
    const x = -half + col * step;
    const h = heightAt(x, z);
    heights[row * GRID + col] = h;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
    positions[i++] = x;
    positions[i++] = h;
    positions[i++] = z;
  }
}
```

Colors:

```ts
const cLow = new THREE.Color(0x3f8f3f);   // green (low)
const cMid = new THREE.Color(0x8a5a2b);   // brown (middle)
const cHigh = new THREE.Color(0xf4f4f4);  // white (high)
const colors = new Float32Array(GRID * GRID * 3);
const tmp = new THREE.Color();

let j = 0;
for (let v = 0; v < GRID * GRID; v++) {
  const t = (heights[v] - minH) / (maxH - minH);
  if (t < 0.5) tmp.lerpColors(cLow, cMid, t * 2);
  else tmp.lerpColors(cMid, cHigh, (t - 0.5) * 2);
  colors[j++] = tmp.r; colors[j++] = tmp.g; colors[j++] = tmp.b;
}
```

lerpColors exists on Color (r125+). Good.

Indices with upward winding:

```ts
const indices: number[] = [];
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const a = row * GRID + col;
    const b = row * GRID + (col + 1);
    const c = (row + 1) * GRID + col;
    const d = (row + 1) * GRID + (col + 1);
    // CCW seen from above → normal +Y
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
}
```

Verify second triangle (b, c, d) again — computed above gives +Y. Good. First (a, c, b) gives +Y. Good.

Geometry:

```ts
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();
```

Note: shared vertices along grid mean normals are smooth — good.

Material & mesh:

```ts
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);
```

Animation loop:

```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // gentle sun drift so the loop uses delta/elapsed time
  sun.position.set(
    Math.cos(elapsed * 0.12) * 16,
    18,
    Math.sin(elapsed * 0.12) * 16
  );

  controls.update();

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Hmm, the sun drift — does it matter? It's subtle and fine. Actually, wait — sun.position affects light direction since DirectionalLight shines from position toward target (default origin). Movement is slow. OK.

Resize:

```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Expose test hooks:

```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```

TypeScript strict compile check:
- `import { OrbitControls } from 'three/addons/controls/OrbitControls.js';` — fine.
- `renderer.domElement` — HTMLElement; appendChild fine.
- `let i = 0` used as index — number, fine. In strict mode, `let i = 0` inferred number. Fine.
- `minH = Infinity` typed number. Fine.
- Unused variable `delta` — noUnusedLocals could be on with strict? `tsc --strict` doesn't include noUnusedLocals by default. But to be safe, use delta: controls.update doesn't take delta. I can use delta for something, e.g., damping is internal. Let me use delta: `const elapsed = clock.getElapsedTime()` uses elapsed. delta unused → could trip noUnusedLocals if enabled. To be safe, I can void it or use it. I'll just not declare delta, or use it: e.g., `controls.update()` — no delta param. I could write `const delta = clock.getDelta();` and then use it in the sun drift speed: sun drift using accumulated angle with delta: `sunAngle += delta * 0.12;` That uses delta. Let me do:

```ts
let sunAngle = 0.6;
...
sunAngle += delta * 0.12;
sun.position.set(Math.cos(sunAngle) * 16, 18, Math.sin(sunAngle) * 16);
```

That uses delta cleanly. Or drop elapsed entirely. Both used then? Just use delta approach and skip getElapsedTime. Good — one variable, both rules satisfied (delta-based motion).

Also `ready` boolean fine.

Edge: `heights[row * GRID + col]` fine.

One more check: `THREE.Color.lerpColors(color1, color2, alpha)` — instance method, exists. Yes, Color.prototype.lerpColors added in r127. Fine with modern three.

Also might want `renderer.shadowMap`? Not required. Skip shadows for simplicity — vertex colors + lights fine.

Body margin: since page has no other HTML, canvas appended — default body margin 8px creates scrollbars. I could set document.body.style.margin = '0' and canvas display block. That's nice polish and doesn't violate "no other HTML" (it's styling). I'll add:

```ts
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
```

Good.

Camera framing: terrain 20x20, max height ~2. Camera at (16, 12, 16), fov 55, target origin. Distance ≈ sqrt(256+144+256) = sqrt(656) ≈ 25.6. Horizontal FOV at aspect ~1.77: vertical half-angle 27.5°, covers tan(27.5°)*25.6 ≈ 13.3 vertical radius — plenty. Whole terrain visible. Good.

Let me also double check the winding once more with concrete numbers. Take a flat grid: a=(0,0,0) [col=0,row=0 → x=-10, z=-10 scaled], b=(1,0,0), c=(0,0,1), d=(1,0,1) in local terms (x right, z "down" when viewed from above with standard orientation).

Triangle (a, c, b): vertices (0,0,0), (0,0,1), (1,0,0). Cross (c-a)×(b-a) = (0,0,1)×(1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Up. ✓.

Triangle (b, c, d): (1,0,0), (0,0,1), (1,0,1). (c-b)×(d-b) = (-1,0,1)×(0,0,1) = (0*1-1*0, 1*0-(-1)*1, (-1)*0-0*0) = (0,1,0). Up. ✓.

Great.

Note about "faces point UP": with heights applied, normals tilt with terrain but the base orientation is up. computeVertexNormals will produce smooth normals consistent with winding