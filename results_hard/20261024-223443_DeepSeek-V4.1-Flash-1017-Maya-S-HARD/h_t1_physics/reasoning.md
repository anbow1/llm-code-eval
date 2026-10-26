Let me write the file.

Physics: 20 balls radius 0.4, box -5..5. Non-overlapping start positions, inside box: center must be within [-4.6, 4.6] on each axis.

Elastic collisions with masses: 1D along collision normal.

Wall collision: reflect velocity component, position clamp.

Ball-ball: check distance < 2r, resolve: separate along normal proportional to inverse mass, then apply elastic impulse.

Let me implement:

```ts
function resolveBallCollision(a, b) {
  const dx = b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
  const dist = Math.hypot(dx,dy,dz);
  const minDist = a.r+b.r;
  if (dist >= minDist || dist < 1e-9) return;
  const nx = dx/dist, ny=dy/dist, nz=dz/dist;
  // separate
  const overlap = minDist - dist;
  const invA = 1/a.m, invB = 1/b.m, invSum = invA+invB;
  a.x -= nx*overlap*(invA/invSum); ...
  b.x += nx*overlap*(invB/invSum);
  // relative velocity along normal
  const rvx = b.vx-a.vx, ...
  const vn = rvx*nx+...;
  if (vn > 0) return; // separating
  const j = -(2*vn)/invSum; // impulse... wait
```
For elastic collision impulse: j = -(1+e) * vn / (invA+invB) with e=1 → j = -2*vn/invSum. Then a.v -= j*invA*n? Actually impulse applied: a.vel -= j*invA*n, b.vel += j*invB*n where j scalar = -2vn/invSum... Let's check: vn = (vb-va)·n is negative when approaching. j = -(1+e)vn/(invA+invB) = -2vn/invSum > 0. Then va' = va - j*invA*n, vb' = vb + j*invB*n. Check new relative normal velocity: (vb'-va')·n = vn + j*(invB+invA) = vn - 2vn = -vn. Correct, reversal. Good.

Substeps: use fixed dt of e.g. 1/240 or adapt. Use step(dt) → number of substeps = ceil(dt / maxSub), with maxSub = 1/300 maybe. But for stability with many collisions, do small substeps plus positional correction.

Also need to handle potential stuck overlaps: after resolving positions, balls may be pushed out of the box; clamp positions after separation.

Better approach: substep dt fixed at 1/600? Might be heavy but with 20 balls it's fine. Let's do substeps of max 1/300 s, capping count at, say, 60 substeps to avoid huge dt. Actually step could be called with arbitrary dt in tests — they might call step(1) or step(10). Let's cap substeps to a reasonable number, e.g., maxSubsteps = 200, each substep h = dt/n with n = ceil(dt/(1/300)) clamped to 200. That means if dt is large, h becomes large — but fine.

Actually simpler: iterate substeps with h = min(dt/ n...). Let me do:

```
const MAX_H = 1/300;
export function step(dt) {
  if (!(dt > 0)) return;
  const n = Math.min(300, Math.max(1, Math.ceil(dt / MAX_H)));
  const h = dt / n;
  for (let i=0;i<n;i++) sub(h);
}
```

With n up to 300 and 20 balls, pair check 190 pairs — 57k pair checks per step, fine.

But repeated overlap: after collision resolution, positions are separated exactly (up to float). Then they may collide again next substep. Good.

Also, need to ensure the separation doesn't cause overlap with a third ball — handled iteratively over substeps.

Let me also consider the wall check: after ball-ball separation, clamp position to [-5+r, 5-r] and if clamped, reflect velocity component.

Actually reflecting velocity when clamped might not be right since clamping is due to separation. Just clamp position, and wall bounce handled in the wall function. Let's do: integrate positions, then wall collision: if x < -L+r, x = -L+r, vx = -vx (positive), etc. Then ball-ball resolution; then final clamp positions to box bounds (without velocity change) to guarantee never leave.

Hmm, but if a ball is pressed against a wall by another ball, the clamping pushes it back into the other ball, causing overlap. The iterative substeps handle this — mostly. To be safe, do multiple resolution iterations per substep (e.g., 3 passes over pairs). Let's keep it simple: per substep, do the pair pass twice. Hmm, could cause jitter. Let's just do one pass but also relax by allowing slight overlap tolerance.

Alternatively, use "position correction with slop" approach. Let's keep it simple: single pass per substep, plus final clamp. Good enough.

Non-overlapping starts: use rejection sampling with random positions in [-4.6,4.6]^3, check distance >= 0.8 + tiny epsilon (0.801). Should be feasible with 20 balls in 9.2^3 box.

Velocities: random direction, speed 2..4.

Mass: random 1..3.

Rendering: sphere geometry radius 0.4, MeshStandardMaterial with color per ball (hsv). Add lights.

Box edges: BoxGeometry(10,10,10) → EdgesGeometry → LineSegments.

Camera: perspective, position (10, 8, 12) looking at origin. Actually box spans -5..5, so distance ~ sqrt(100+64+144)=~17.5; that's fine with fov 50. Let's use (9,7,11) lookAt(0,0,0).

Renderer: antialias true, setPixelRatio.

Frame loop: delta from clock, clamp to 1/30.

Also draw a subtle background.

Now `__sim = { balls, step, paused }`. paused must be a mutable boolean on the object—the render loop reads `sim.paused`. Since tests set `(window as any).__sim.paused = true`, the loop must read from that same object. So define `const sim = { balls, step, paused: false }` and use `sim.paused` in the loop.

Types: balls are plain objects with x,y,z,vx,vy,vz,r,m — define interface Ball.

Note: the interface must be a plain object type; `step` is a function. Use:

```ts
const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = { balls, step, paused: false };
```

Where `step` is a function declaration or const arrow. Note the task says "expose __sim = { balls, step, paused } where balls is an array of plain objects ... and paused is a boolean". Fine.

TS strict: make sure no implicit any, no unused vars (strict doesn't error on unused unless noUnusedLocals; not part of strict). Fine.

Let me write the code.

```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const HALF = 5;
const RADIUS = 0.4;
const BALL_COUNT = 20;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = HALF - RADIUS - 0.01; // 4.59
  const minDist = 2*RADIUS + 1e-3;
  for (let i = 0; i < BALL_COUNT; i++) {
    let x=0,y=0,z=0, ok=false;
    for (let attempt=0; attempt<5000 && !ok; attempt++) {
      x = rand(-limit, limit);
      y = rand(-limit, limit);
      z = rand(-limit, limit);
      ok = true;
      for (const b of balls) {
        const dx=b.x-x, dy=b.y-y, dz=b.z-z;
        if (dx*dx+dy*dy+dz*dz < minDist*minDist) { ok = false; break; }
      }
    }
    // velocity
    const speed = rand(2,4);
    // random unit vector
    let ux: number, uy: number, uz: number, len: number;
    do {
      ux = rand(-1,1); uy = rand(-1,1); uz = rand(-1,1);
      len = Math.hypot(ux,uy,uz);
    } while (len < 1e-3 || len > 1);
    ux/=len; uy/=len; uz/=len;
    balls.push({ x, y, z, vx: ux*speed, vy: uy*speed, vz: uz*speed, r: RADIUS, m: rand(1,3) });
  }
  return balls;
}
```

Hmm, the loop `for attempt...` if !ok after 5000 attempts, we still place overlapping. With 20 balls it's essentially guaranteed to succeed. But better: use a fallback grid placement. Let's make attempt limit larger (10000) — fine.

Actually, a cleaner approach guaranteeing no overlap: place balls on a lattice with jitter. Grid of 3x3x3=27 positions in cube of side 9.2... spacing 9.2/3 ≈ 3.07 > 0.8. Place 20 of 27 lattice points, with small jitter ±0.5. That guarantees no overlap. That's deterministic-ish and safe. But random-looking is nicer. Let's do rejection sampling with fallback to lattice - complexity. I'll just do rejection sampling with many attempts; probability of failure is negligible (20 balls, 9.2^3=778 volume, each ball 0.8 sphere exclusion... it's fine).

Actually to be really safe: if after attempts !ok, then... I'd have to handle. Let's just do the lattice approach with jitter — clean and guaranteed.

Lattice: 3x3x3 with coordinates at -3.6, 0, 3.6? Box limit 4.59. Spacing 3.6 > 0.8+epsilon. Jitter ±1.2 keeps minimum distance ≥ 3.6-2.4 = 1.2 > 0.8. And positions stay within [-4.8,4.8] which is outside 4.59... Let's use coordinates at -3.5,0,3.5 with jitter ±1.0 → range [-4.5,4.5], within 4.59. Minimum distance 3.5-2.0 = 1.5 > 0.8. 

But a regular grid looks less natural — jitter helps. Hmm, but grid-ish arrangement looks fine visually. Alternatively random with rejection is more natural. Let me use rejection sampling primarily, that's fine. I'll do rejection sampling with max attempts and if it fails, break with whatever (rare). I'll just do maxAttempts = 2000 per ball and log nothing. Probability of placing 20 balls with min distance 0.8 in the box: essentially 1.

Ok.

Now physics.

```ts
function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const MAX_H = 1 / 400;
  const n = Math.min(400, Math.max(1, Math.ceil(dt / MAX_H)));
  const h = dt / n;
  for (let i = 0; i < n; i++) substep(h);
}
```

substep(h):
1. Move: x += vx*h etc.
2. Wall collisions.
3. Ball-ball collisions (pairs loop).
4. Clamp positions to bounds (guarantee inside).

Wall collision function:
```ts
const LOW = -HALF + b.r, HIGH = HALF - b.r;
if (b.x < LOW) { b.x = LOW; b.vx = Math.abs(b.vx); }
else if (b.x > HIGH) { b.x = HIGH; b.vx = -Math.abs(b.vx); }
```
Similar for y and z. That reflects with the mass irrelevant for wall (elastic with infinite mass wall, energy conserved).

Ball-ball:

```ts
for (let i=0;i<balls.length;i++){
  const a = balls[i];
  for (let j=i+1;j<balls.length;j++){
    const b = balls[j];
    let dx = b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
    let d2 = dx*dx+dy*dy+dz*dz;
    const rsum = a.r + b.r;
    if (d2 >= rsum*rsum || d2 <= 1e-12) continue;
    let d = Math.sqrt(d2);
    let nx = dx/d, ny=dy/d, nz=dz/d;
    // positional correction
    const invA = 1/a.m, invB = 1/b.m, invSum = invA+invB;
    const overlap = rsum - d;
    const corr = overlap / invSum; // total move
    a.x -= nx * corr * invA; ...
    b.x += nx * corr * invB; ...
    // relative velocity
    const rvx = b.vx - a.vx, ...
    const vn = rvx*nx + rvy*ny + rvz*nz;
    if (vn < 0) {
      const j2 = -2*vn / invSum;  // impulse magnitude
      a.vx -= j2*invA*nx; ...
      b.vx += j2*invB*nx; ...
    }
  }
}
```

Wait check units: impulse j scalar = -(1+e)vn/(invSum). Energy: Let's verify with equal masses m=1, invA=invB=1, invSum=2. vn = (vb-va)·n. j = -2vn/2 = -vn. Then va' = va - j*1*n = va + vn*n, vb' = vb + j*1*n = vb - vn*n. Hmm: va'·n = va·n + vn, vb'·n = vb·n - vn. Relative: (vb'-va')·n = vn - 2vn = -vn ✓. Wait that's a reversal of relative normal velocity, correct for equal masses (they swap normal components). Good.

Momentum: m_a*va' + m_b*vb' change = -j*n + j*n = 0 ✓.

Correction: after positional correction, the velocities were computed... fine.

Now, note dx computed before correction; after correction positions change but we use old normal — fine.

After the pair loop, clamp positions to box (in case correction pushed a ball out).

Actually better order: wall collision after pair resolution too. Let's do: integrate → pair collisions → wall collisions (clamp+reflect) → final clamp. Let me do substep:

```
for each ball: integrate
resolve pairs
for each ball: wall
```
And the wall function also clamps position. That guarantees inside. But if pair resolution pushes ball past wall and then wall reflects, it's fine.

Edge case: a ball pushed through the wall and then clamped, but the velocity direction — reflecting is fine as approximation.

Now render: create meshes.

```ts
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(11, 9, 13);
camera.lookAt(0,0,0);
```

Renderer setup with ACESFilmic? Keep simple.

Lights: AmbientLight(0xffffff, 0.55) — with MeshStandardMaterial, ambient intensity 0.5 works. DirectionalLight(0xffffff, 1.6) at (8, 12, 10). Maybe add a second dim directional from another angle to avoid dark sides.

Box: 
```ts
const boxGeo = new THREE.BoxGeometry(10,10,10);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({color: 0x66ccff}));
scene.add(edges);
```

Could also add a translucent box. Keep edges only (plus maybe faint wireframe). Fine.

Balls with colors from HSL.

Animation loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  if (!sim.paused) step(dt);
  syncMeshes();
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Hmm, __ready must be set "after the first frame is rendered". Setting it right after render works.

Note: clock.getDelta() first call returns time since clock creation... Actually THREE.Clock getDelta returns time since last getDelta (or since start). First frame delta could be a few ms. Fine, and clamped.

Also note: `step` should be defined before sim object uses it. Use function declaration for hoisting.

For `__sim` assignment after all created.

Also need to expose `__scene`, `__camera`, `__renderer`.

Let me make sure of types for the mesh sync: keep arrays.

Now writing full file.

One more consideration: velocity magnitude after collision — energy conservation should hold. With substeps and positional correction, energy may drift slightly but should be ok.

Also should handle the case where dt is huge (e.g., test calls step(1)). n = min(400, ceil(1*400)) = 400, h = 0.0025. Good. For dt=10: ceil(4000)=4000 → min 400 → h=0.025 — that's a big substep, ball at speed 4 moves 0.1 per substep, less than radius 0.4, fine. Actually 0.025*4 = 0.1, still fine but tunneling? Ball radius 0.4, relative speed up to 8 → 0.2 movement per substep, less than diameter 0.8, so collisions still detected. Good.

Let's finalize with MAX_H = 1/240 maybe lighter for normal frame (1/60 → n=4). Let's use 1/300 → n=5 per frame. Fine.

Positional correction factor: use full overlap correction (1.0) to guarantee no overlap.

Also I need "must never stay overlapping" — full correction each substep handles it.

Let me write it out.

Colors: `new THREE.Color().setHSL(i/20, 0.65, 0.55)`.

syncMeshes: mesh.position.set(b.x,b.y,b.z).

Full code:

```ts
import * as THREE from 'three';

interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  m: number;
}

const HALF_BOX = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = HALF_BOX - BALL_RADIUS - 0.02;
  const minCenterDist = BALL_RADIUS * 2 + 0.002;
  for (let i = 0; i < BALL_COUNT; i++) {
    let x = 0, y = 0, z = 0;
    for (let attempt = 0; attempt < 4000; attempt++) {
      x = randRange(-limit, limit);
      y = randRange(-limit, limit);
      z = randRange(-limit, limit);
      let ok = true;
      for (let k = 0; k < balls.length; k++) {
        const o = balls[k];
        const dx = o.x - x, dy = o.y - y, dz = o.z - z;
        if (dx*dx + dy*dy + dz*dz < minCenterDist*minCenterDist) { ok = false; break; }
      }
      if (ok) break;
    }
    const speed = randRange(2, 4);
    let ux = 0, uy = 0, uz = 0, len = 0;
    do {
      ux = randRange(-1, 1); uy = randRange(-1, 1); uz = randRange(-1, 1);
      len = Math.sqrt(ux*ux + uy*uy + uz*uz);
    } while (len < 1e-3 || len > 1);
    ...
```

Careful: after loop, if we never found ok... we just break out of attempt loop only when ok. If not found, x,y,z are from the last attempt (overlapping possibly). Set a fallback? I'll accept.

Hmm, `while (len < 1e-3 || len > 1)` — random in cube, len ≤ sqrt(3) ≈ 1.73 so condition len>1 forces resample; rejects ~some fraction. Fine.

Let me write the whole thing now.

Also, one potential issue: `for (let attempt...` and `ok` declared inside; after loop we break with `if (ok) break;`. Good.

Final code assembly. Also dispose? Not needed.

I'll also add `window.innerWidth` guards.

Write out:

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
```

Also `renderer.shadowMap`? Not needed.

OK writing final.

For the animation loop timing, use `THREE.Clock`. Also set `clock.start()` implicitly.

Let me produce the file.