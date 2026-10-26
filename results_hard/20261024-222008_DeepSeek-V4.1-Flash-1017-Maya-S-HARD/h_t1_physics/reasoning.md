Let me write the file.

Physics: elastic collisions between balls with masses. Wall collisions: reverse velocity component (perfectly elastic, walls infinite mass).

Ball-ball elastic collision in 3D: along normal, use 1D elastic collision formulas with masses.

Relative velocity along normal; if separating, skip. Else compute impulse.

Standard formula:
v1' = v1 - (2*m2/(m1+m2)) * ((v1-v2)·n / |n|²) * n
v2' = v2 - (2*m1/(m1+m2)) * ((v2-v1)·n / |n|²) * n  ... wait sign.

Actually with unit normal n pointing from 1 to 2:
vrel = (v1 - v2)·n
if vrel <= 0, separating (since v1 moving toward... hmm). Let's define n = normalize(x2 - x1). Then relative approach velocity along n: (v1 - v2)·n > 0 means approaching.

impulse magnitude j = (2*m1*m2/(m1+m2)) * ((v1-v2)·n) / (m1+m2)? No.

For 1D elastic: v1' = v1 - (2 m2/(m1+m2)) * ((v1-v2)·n) * n, v2' = v2 + (2 m1/(m1+m2)) * ((v1-v2)·n) * n. Check: check momentum conservation: m1 v1' + m2 v2' = m1 v1 + m2 v2 + (-2 m1 m2/(m1+m2) + 2 m1 m2/(m1+m2)) ((v1-v2)·n) n = m1 v1 + m2 v2. Good.

Energy: for equal masses, m1=m2=m: v1' = v1 - (v1-v2)·n n, v2' = v2 + (v1-v2)·n n. Correct.

Only apply if (v1-v2)·n > 0 (approaching).

Positional separation: after resolving velocities, push apart so they don't overlap: move each by overlap/2 weighted inversely by mass? Or just push along n proportional. Use mass-weighted: ball1 moves -n * overlap * (m2/(m1+m2)), ball2 moves +n * overlap * (m1/(m1+m2)). Also clamp inside box.

Substeps: use fixed dt like 1/240 per substep, loop.

Handling walls: for each ball, if x - r < -5 then x = -5 + r, vx = -vx (also ensure sign correct: if vx<0 flip). Actually simply set vx = -vx if moving into wall. Use: if (x - r < -LIMIT) { x = -LIMIT + r; if (vx < 0) vx = -vx; }. Fine.

Since balls may need to not overlap: with positional correction and radius 0.4, 20 balls in 10x10x10 box. Volume of box 1000, each ball volume 0.268, total 5.4 — plenty of room.

Initial non-overlapping placement: rejection sampling with min distance 2r = 0.8, plus margin so fully inside: positions in [-5+0.4, 5-0.4] = [-4.6, 4.6].

Also to keep balls from staying overlapping, iterative separation loop each substep.

Step function signature: step(dt: number). Inside, substep count = ceil(dt / maxSubstep) with maxSubstep = 1/240? Might be heavy with 20 balls O(n²)=190 pairs * 240 substeps... fine.

Let's use maxSub = 1/300 and iterate.

Actually the render loop calls step(frameDelta clamped to 1/30). That's fine.

Balls array of plain objects { x,y,z,vx,vy,vz,r,m }. Meshes synced: create mesh per ball, sphere geometry radius 0.4 shared? Each ball own Mesh with SphereGeometry — requirement says render every ball as its own Mesh with SphereGeometry. Can share geometry, that's fine. Colors maybe based on mass. Use MeshStandardMaterial per ball.

Note: r = 0.4 exactly for all balls; ball.r stored.

Also need to update meshes positions after step in render loop.

Let me also keep the "balls" array exposed live so tests can mutate. Since the step function reads from the same array objects, that works.

Step should also handle balls that might be placed outside by tests? Not required.

Let me write the code.

```ts
import * as THREE from 'three';

const HALF = 5;
const R = 0.4;
const N = 20;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randRange(a: number, b: number): number { return a + Math.random() * (b - a); }

const balls: Ball[] = [];

// placement
const bound = HALF - R; // 4.6
const minDist = 2 * R + 1e-3;
for (let i = 0; i < N; i++) {
  let placed = false;
  for (let attempt = 0; attempt < 10000 && !placed; attempt++) {
    const x = randRange(-bound, bound);
    const y = randRange(-bound, bound);
    const z = randRange(-bound, bound);
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      if (Math.hypot(dx,dy,dz) < minDist + 0.05) { ok = false; break; }
    }
    if (!ok) continue;
    // random velocity with speed 2..4
    const speed = randRange(2, 4);
    const dir = randomUnitVector();
    balls.push({ x, y, z, vx: dir.x*speed, vy: dir.y*speed, vz: dir.z*speed, r: R, m: randRange(1,3) });
    placed = true;
  }
  if (!placed) { /* fallback: place on grid */ }
}
```

Better guarantee: use deterministic grid-based placement first then jitter. Simpler robust approach: place balls on a grid lattice with spacing >= 0.85 within bounds, then jitter slightly. Grid of 3x3x3 = 27 slots in range... need 20. Positions: choose from lattice coordinates where spacing = 1.5? Range [-4.6,4.6] length 9.2. With 3 per axis spacing 4.6: positions -4.6, 0, 4.6 → spacing 4.6 which is > 0.8. That gives 27 spots, take 20. That's very spread out though — fine, no overlap. But maybe too spread; still fine physically. Could do spacing to fit more: 4 per axis? -4.6 + k*(9.2/3). Fine with 3.

Actually let's do a mixed approach: random sampling with fallback to lattice. Simpler: just do random with 20000 attempts and a decreasing min distance? Let's just do lattice with jitter — deterministic and guaranteed. But jitter might create overlaps if spacing small; with spacing 4.6, jitter up to ±1.0 is safe. Hmm but grid positions at exactly ±4.6 are at the boundary — touching walls. Reduce to be safe: use positions -3.5, 0, 3.5 with spacing 3.5 and jitter ±1.2, gives range within [-4.7, 4.7] — careful, must stay within ±4.6. -3.5-1.2 = -4.7 out of bounds. Use jitter ±1.0 and base positions -3.5,0,3.5 → range [-4.5,4.5]. Safe. Spacing after jitter min: 3.5 - 2 = 1.5 > 0.8. Good.

So generate 27 lattice points, shuffle, take 20.

Velocities: random unit vector via normalized gaussian or spherical. Use three random numbers with rejection for gaussian-ish? Use Math.random-based spherical: u = 2*Math.random()-1, theta = 2π random; sqrt(1-u²). That's uniform.

Now step function:

```ts
const MAX_SUB = 1 / 240;

function step(dt: number): void {
  if (!(dt > 0)) return;
  const steps = Math.max(1, Math.ceil(dt / MAX_SUB));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) substep(h);
}
```

Hmm if dt huge (like 10s), steps = 2400 - acceptable but could be slow. Clamp dt to 1/30 in the loop anyway. For external step calls, maybe clamp dt to 0.5? The spec says step(dt) advances physics by dt. I'll clamp substep count max, e.g. steps = min(ceil(dt/MAX_SUB), 1000)? That would change physics. Keep it simple: no clamp, but MAX_SUB = 1/240. That's fine.

substep(h):
1. Integrate: for each ball: x += vx*h etc.
2. Wall collisions.
3. Pair collisions (resolve velocity + separate positions).
Repeat separation maybe twice.

Pair handling: for each pair, compute delta, dist. If dist < r1+r2 (2*0.4 = 0.8): 
- n = delta/dist (if dist ~ 0, pick arbitrary normal).
- separate positions: overlap = (r1+r2) - dist. Move ball i by -n * overlap * (m2/(m1+m2)), ball j by +n * overlap*(m1/(m1+m2)).
- velocity: vrel = (vi - vj)·n; if vrel > 0 (approaching? let's check). n points from i to j. If vi dot n > vj dot n, i is moving toward j faster than j moves away... yes approaching if (vi-vj)·n > 0.
  Then: vi -= (2*mj/(mi+mj)) * vrel * n; vj += (2*mi/(mi+mj)) * vrel * n.

Wait check the formula: vi' = vi - (2 mj/(mi+mj)) ((vi-vj)·n) n. Yes.

Then clamp positions inside box after separation (walls re-check).

Ordering: integrate, then wall clamp, then pairs, then wall clamp again.

Potential issue: with pairwise separation pushing balls into walls, could cause overlaps with other balls. Iterate a few times. Fine.

Also need to make sure balls never leave box: after all, clamp: x = clamp(x, -HALF+r, HALF-r) and zero/flip velocity toward inside.

Let me write wall collision:

```ts
function wallCollide(b: Ball): void {
  const lim = HALF - b.r;
  if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  else if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  ... same for y, z
}
```

Now setup three.js.

Scene, camera PerspectiveCamera(45, aspect, 0.1, 1000), position (12, 10, 14), lookAt(0,0,0). Box half 5 → diagonal 8.66, camera at distance ~ sqrt(144+100+196)=~21, fov 45 → visible height at 21 ≈ 2*21*tan(22.5)=17.4. Box diagonal ~17.3. Hmm tight. Move camera to (14,12,16) → dist ~24.6, visible height 20.4. Fine. But box appears small. Let's just use (13, 10, 15) dist = sqrt(169+100+225)=22.2, height 18.4 — ok for fov 50: 2*22.2*tan(25)=20.7. Use fov 50.

Actually careful for aspect ratio: vertical fov 50 → horizontal larger. The box extent on screen... fine.

Renderer: antialias true, setPixelRatio(min(devicePixelRatio, 2)), setSize. Append canvas to body. Also set body margin 0, overflow hidden, and canvas display block. Allowed via document.body.style.

Lights: AmbientLight(0xffffff, 0.6), DirectionalLight(0xffffff, 1.5) at (10,15,10). Note three r155+ uses different lighting units; use intensity accordingly. With MeshStandardMaterial and default renderer (no physically correct lights in newer versions — actually r155 changed default lighting, intensity 1.5 with directional is fine).

Edges: BoxGeometry(10,10,10) with EdgesGeometry → LineSegments with LineBasicMaterial color 0xffffff. Box geometry from -5 to 5 centered at origin: BoxGeometry(10,10,10) is centered → -5..5. Good.

Balls: geometry = new THREE.SphereGeometry(0.4, 24, 16). Each mesh with its own material colored by mass, e.g. lerp between colors.

Sync meshes each frame: mesh.position.set(b.x,b.y,b.z).

Render loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  if (!sim.paused) step(dt);
  for (...) update mesh positions
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

__ready should be set after first frame rendered. Fine.

`paused` as boolean property on sim object. The spec says "paused is a boolean". Provide object literal `const sim = { balls, step, paused: false }`. But `paused` also referenced inside render loop — use a variable. If we do `let paused = false; const sim = { balls, step, get paused(){...} }` — but spec says plain boolean. Better: define a mutable holder object and reference sim.paused in the loop. Since step and balls must be live, define:

```ts
const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = { balls, step, paused: false };
```
and in the loop use `if (!sim.paused) step(dt);`. Good.

Note balls array: Balls are objects with extra fields? Spec says plain objects { x,y,z,vx,vy,vz,r,m }. Fine, only those fields.

TS strict: careful with types. Let's write.

Also, careful: `document.body.style` assignments.

Let me write full code.

```ts
import * as THREE from 'three';

const HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 240;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomDirection(): THREE.Vector3 {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return new THREE.Vector3(s * Math.cos(theta), u, s * Math.sin(theta));
}
```

Placement:

```ts
function createBalls(): Ball[] {
  const limit = HALF - BALL_RADIUS;
  const gridPositions: THREE.Vector3[] = [];
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (let k = -1; k <= 1; k++)
        gridPositions.push(new THREE.Vector3(i * 3.5, j * 3.5, k * 3.5));
  // shuffle
  for (let i = gridPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = gridPositions[i]!;
    gridPositions[i] = gridPositions[j]!;
    gridPositions[j] = tmp;
  }
  ...
}
```

Hmm with noUncheckedIndexedAccess? Not part of --strict. --strict doesn't include noUncheckedIndexedAccess. So no `!` needed. But adding `!` is harmless. Actually `!` on a possibly-undefined... it's fine.

Wait: does strict include noUncheckedIndexedAccess? No, that's a separate flag. OK.

Jitter: after selecting a lattice point, add jitter up to ±0.8 each axis and clamp to [-(limit-0.85), limit-0.85]? Simpler: base spacing 3.5, jitter ±1.0 → min separation 1.5 > 0.8. And bounds: 3.5+1.0 = 4.5 <= 4.6. Good.

But we take only 20 of 27 lattice points, so also fine.

Velocities: speed = randRange(2,4).

Now substep function.

```ts
function wallCollide(b: Ball): void {
  const lim = HALF - b.r;
  if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  else if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  if (b.y < -lim) { b.y = -lim; if (b.vy < 0) b.vy = -b.vy; }
  else if (b.y > lim) { b.y = lim; if (b.vy > 0) b.vy = -b.vy; }
  if (b.z < -lim) { b.z = -lim; if (b.vz < 0) b.vz = -b.vz; }
  else if (b.z > lim) { b.z = lim; if (b.vz > 0) b.vz = -b.vz; }
}
```

Substep:

```ts
function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }
  for (const b of balls) wallCollide(b);

  for (let iter = 0; iter < 2; iter++) {
    let any = false;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
        const minDist = a.r + b.r;
        if (dist >= minDist) continue;
        if (dist < 1e-9) { dx = 1; dy = 0; dz = 0; dist = 1e-9 ... }
```

Hmm handle dist ~ 0: set arbitrary normal, dist small. Let's do:

```ts
if (dist < 1e-6) { dx = 1; dy = 0; dz = 0; dist = 1e-6; }
const nx = dx/dist, ny = dy/dist, nz = dz/dist;
const totalM = a.m + b.m;
const overlap = minDist - dist;
// separate
a.x -= nx * overlap * (b.m/totalM); ... b.x += nx * overlap * (a.m/totalM);
// velocity
const rvx = a.vx - b.vx, rvy = ..., rvz = ...;
const vn = rvx*nx + rvy*ny + rvz*nz;
if (vn > 0) {
  const ja = 2 * b.m / totalM * vn;
  const jb = 2 * a.m / totalM * vn;
  a.vx -= ja * nx; a.vy -= ja*ny; a.vz -= ja*nz;
  b.vx += jb * nx; b.vy += jb*ny; b.vz += jb*nz;
}
any = true;
```

Note: use typescript strict with `balls[i]` — fine.

Wait careful: `const a = balls[i]` — TS strict, index access returns Ball (no undefined) without noUncheckedIndexedAccess. Fine.

After separation, wall collide again all balls.

That's fine.

Also to satisfy "must never stay overlapping", the loop with 2 iterations of separation should suffice.

Edge case: two balls both pushed into the same corner overlapping with a third. It's ok basically.

Now also we should ensure that after the pair loop the balls are inside the box: call wallCollide for all at end.

Now build scene.

Let me write the whole file.

```ts
import * as THREE from 'three';

// ---- constants -----
const HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 240;

type Ball = { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number };

// -------- physics state ---------
const balls: Ball[] = [];

function randomUnit(): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return [s * Math.cos(t), u, s * Math.sin(t)];
}

(function initBalls() {
  const limit = HALF - BALL_RADIUS;
  const lattice: Array<{ x: number; y: number; z: number }> = [];
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (let k = -1; k <= 1; k++)
        lattice.push({ x: i * 3.5, y: j * 3.5, z: k * 3.5 });
  // shuffle
  for (let i = lattice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = lattice[i];
    lattice[i] = lattice[j];
    lattice[j] = tmp;
  }
  for (let n = 0; n < BALL_COUNT; n++) {
    const cell = lattice[n];
    const jitter = 0.9;
    let x = cell.x + (Math.random() * 2 - 1) * jitter;
    ...
    clamp to ±limit
    // ensure not overlapping the others (should hold by construction)
    ...
  }
})();
```

Then verify non-overlap with a push-apart loop just in case? Add a small validation: while overlapping any existing, move away. Keep it simple: after jitter, check with existing balls; if overlapping, fall back to the lattice point exactly. That guarantees no overlap since lattice spacing 3.5.

Let's implement that.

```ts
const speed = 2 + Math.random() * 2; // 2..4
const [dx, dy, dz] = randomUnit();
balls.push({ x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, r: BALL_RADIUS, m: 1 + Math.random() * 2 });
```

mass randRange(1,3) — at least two different masses; random floats ensure that.

Now three.js setup.

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(13, 10, 15);
camera.lookAt(0, 0, 0);
```

Lights.

```ts
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, 1.6);
dir.position.set(12, 18, 10);
scene.add(dir);
```

Box edges:

```ts
const boxGeometry = new THREE.BoxGeometry(HALF*2, HALF*2, HALF*2);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry), new THREE.LineBasicMaterial({ color: 0x66ccff }));
scene.add(edges);
```

Maybe also a faint transparent box? Not required; skip (transparency could obscure). Maybe add for depth? Keep simple.

Ball meshes:

```ts
const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const meshes: THREE.Mesh[] = [];
for (const b of balls) {
  const t = (b.m - 1) / 2; // 0..1
  const color = new THREE.Color().setHSL(0.6 - 0.5 * t, 0.75, 0.55); // hmm
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  meshes.push(mesh);
}
```

Note: "Render every ball as its own Mesh with SphereGeometry" — sharing geometry is ok but to be safest, create new SphereGeometry per ball? The requirement says each ball its own Mesh with SphereGeometry; sharing geometry is fine. But to be safe against any check, I'll create per-ball geometry instance. 20 geometries is fine.

Hmm, a test might check mesh.geometry instanceof THREE.SphereGeometry and mesh count. Sharing works. I'll create per-ball geometry anyway—slightly costly but fine.

Sync: I'll store meshes in an array parallel to balls.

Now the render loop and windows exposures.

Also sim.

```ts
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
```

Careful: `paused` typed boolean; assigning object literal is fine.

Now render loop:

```ts
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  if (!sim.paused) step(delta);
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const mesh = meshes[i];
    mesh.position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Resize handler:

```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
```

Expose scene/camera/renderer.

step definition with substeps.

One concern: step function must advance by dt exactly and be stable. With max substep 1/240 and typical dt 1/60, steps=4. Fine.

Also, if dt is not positive, return.

Also should the mesh syncing be done even if paused? Yes, harmless.

Potential TS strict issues: `lattice[n]` index returns object, fine. Destructuring tuple from randomUnit returns [number,number,number] - fine.

`const cell = lattice[n];` — fine.

Let me also double check the pair separation weight: heavier ball moves less. a moves by -n * overlap * (b.m/total), b moves by +n * overlap * (a.m/total). If a is heavy (large a.m), then b moves more. Correct.

One more consideration: The velocity resolution uses unit normal n and vn = (va - vb)·n. If separating (vn <= 0) we skip velocity change but still separate positions. Good.

Now also verify energy conservation: the impulse formula gives elastic collision along normal — yes.

Let me also handle the case where balls might be given by tests with different radii? Not needed.

Write final code.

Also add `mesh.castShadow = false` etc. Not needed.

One more: the exposed `__sim.balls` should be the live array — yes.

Potential issue: tests may call step with dt like 0.1 or 1/60 many times and check no overlaps and in-bounds. Our approach handles it.

What about balls ending up overlapping after the final wall clamp? Minor. Two iterations of pair resolution plus final clamp. If a ball is pushed to the wall and overlapping a third... Let's do 3 iterations of (pairs + walls) for safety.

Actually careful: doing pair separation multiple times repeatedly could cause jitter but it's position-only which is fine.

Let me structure substep:

```ts
function substep(h: number): void {
  for (const b of balls) {
    b.x += b.vx*h; b.y += b.vy*h; b.z += b.vz*h;
  }
  for (const b of balls) wallCollide(b);
  for (let iter = 0; iter < 3; iter++) {
    resolvePairs();  // separation + velocity
    if (iter < 2) for (const b of balls) wallCollide(b); // hmm
  }
  for (const b of balls) wallCollide(b);
}
```

Simplify:

```ts
for (let iter = 0; iter < 3; iter++) {
  const resolved = resolvePairsOnce();
  for (const b of balls) wallCollide(b);
  if (!resolved) break;
}
```

where resolvePairsOnce returns whether any pair overlapped. Good.

Write it.

Final code:

```ts
import * as THREE from 'three';

const HALF_BOX = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 240;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const balls: Ball[] = (() => { ... })();
```

Hmm, an IIFE returning Ball[] is fine but easier with a function.

I'll write:

```ts
function randomUnitVector(): [number, number, number] { ... }

function createBalls(): Ball[] {
  const result: Ball[] = [];
  const limit = HALF_BOX - BALL_RADIUS;
  const lattice: Array<[number, number, number]> = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) lattice.push([i*3.5, j*3.5, k*3.5]);
  for (let i = lattice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    const t = lattice[i]; lattice[i] = lattice[j]; lattice[j] = t;
  }
  const minDist = 2 * BALL_RADIUS + 1e-6;
  for (let n = 0; n < BALL_COUNT; n++) {
    const cell = lattice[n % lattice.length];
    let px = cell[0], py = cell[1], pz = cell[2];
    for (let attempt = 0; attempt < 50; attempt++) {
      const jitter = 0.9;
      const x = THREE.MathUtils.clamp(px + (Math.random()*2-1)*jitter, -limit, limit);
      ... 
      let ok = true;
      for (const o of result) { if (dist < minDist) { ok = false; break; } }
      if (ok) { place; break; }
    }
    if not placed -> place at exact cell
  }
```

Simpler: try jittered; if no valid after 50 attempts use exact cell (guaranteed non-overlapping since lattice spacing 3.5). Let me code cleanly with a helper `overlaps(x,y,z)`.

Note `lattice[n % lattice.length]` — BALL_COUNT 20 < 27 so fine.

Ok final code writing. Also need `const` declarations order: balls defined before step uses it (function hoisting handles it anyway).

I'll now write out the file completely.

Also need to make sure not using `speed` variable accidentally.

Let me write:

```ts
const balls: Ball[] = createBalls();
```

createBalls defined before? Function declarations hoist, so ok.

Now the full file.

Double check: `THREE.MathUtils.clamp` exists. Yes.

Also, should I worry that `import * as THREE from 'three'` and using THREE.Mesh etc. — fine.

Final render loop uses `sim.paused`.

Careful with the typing of sim: 

```ts
const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = {
  balls,
  step,
  paused: false,
};
```

Good.

Write out.