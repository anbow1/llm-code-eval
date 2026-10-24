We need to write a single TS file. Let's design.

Physics: ball state as plain objects {x,y,z,vx,vy,vz,r,m}. They should be live objects referenced by meshes. Balls array exposed. step(dt) advances physics with substeps.

Constraints: box -5..5, radius 0.4, so center range [-4.6, 4.6].

Collision handling: elastic collisions between balls with masses. Momentum and energy conservation for 1D along normal: relative velocity along normal, impulse j = (1+e)*(vrel·n)/(1/m1+1/m2), with e=1. Then apply. Also positional correction to separate overlapping.

Wall collisions: reflect velocity component, clamp position.

Substeps: fixed dt of e.g. 1/240, iterate.

Start positions: non-overlapping with min distance 0.85 maybe (radius 0.4 → 0.8, use 0.9). Random rejection sampling.

Velocities: random direction, speed between 2 and 4.

Mass random 1..3.

Need strict TS. Avoid `any` misuse but exposed stuff uses `(window as any)`.

Let's write.

```ts
import * as THREE from 'three';
```

No addons needed.

Code:

```ts
const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;

interface Ball { x:number; y:number; z:number; vx:number; vy:number; vz:number; r:number; m:number; }
```

Note that the exposed balls array must be the live state. We'll keep `const balls: Ball[] = []`.

Init positions with rejection sampling.

```ts
function randomPoint(): void ...
```

Let me write init:

```ts
function createBalls(): Ball[] {
  const list: Ball[] = [];
  const limit = BOX_HALF - BALL_RADIUS;
  for (let i = 0; i < BALL_COUNT; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 10000 && !placed; attempt++) {
      const x = (Math.random()*2-1)*limit;
      ...
      let ok = true;
      for (const b of list) {
        const dx = b.x - x, ...
        if (dx*dx+dy*dy+dz*dz < (2*BALL_RADIUS + 0.1)**2) { ok=false; break; }
      }
      if (ok) { push ball; placed = true; }
    }
    if (!placed) { /* fallback: grid? */ }
  }
}
```

Fallback: with 20 balls in 4.6 range, likely fine. But to guarantee, add fallback: if not placed after attempts, place at a position from a lattice offset. Actually simplest: use a deterministic lattice layout for positions first, then jitter? But requirement says "Start positions must not overlap and must be fully inside the box". Lattice: 20 balls in 3x3x3=27 grid at spacing... range 9.2 wide, need spacing >0.8. Use grid 3x3x3 with coordinates spaced at 9.2/3 ≈ 3.07 apart... that's fine, all interior. Let's just do deterministic lattice with random jitter, guaranteed separation? Jitter could break it. Let's do rejection sampling with a fallback counting. Simpler: use lattice positions and small jitter but validate. Honestly rejection sampling with 20000 attempts works with high probability. I'll add a fallback using lattice + fallback guarantee.

Let me do: attempt random; if fails, do a grid scan for a free spot. Grid step of 0.1... that's fine but let's do a coarse scan: for ix in 0..N ... Actually simpler fallback: try positions along a spiral / lattice: for (let idx = 0; idx < 1000; idx++) compute lattice point. Let's do lattice with 3x3x3 positions at coordinates -3.0, 0, 3.0 (spacing 3 > 0.8). 27 slots, we place 20. If a lattice slot is free (not occupied by another ball already placed), place there. That's guaranteed to work for up to 27 balls. Good.

Physics step:

```ts
function step(dt: number): void {
  if (dt <= 0) return;
  const maxSub = 1/240;
  let remaining = dt;
  // cap total? 
  while (remaining > 1e-9) {
    const h = Math.min(maxSub, remaining);
    substep(h);
    remaining -= h;
  }
}
```

Hmm, but if dt huge, many substeps. Clamp total to maybe 1/15? The render loop clamps to 1/30. Test might call step(1/60). Fine. But guard: if dt > 0.25 clamp? Might break "advances physics by dt". I'll leave but cap substeps to avoid hangs... Actually keep simple: substep with maxSub=1/240. For dt=1 that's 240 substeps — fine.

substep(h):
1. move positions: x += vx*h etc.
2. wall collisions: if x > limit → x = limit - (x - limit)? Reflect and clamp. Since we integrate and clamp, we can do: if (x > limit) { x = limit; vx = -vx } etc. This loses a bit of energy accuracy but fine. Actually to be more accurate, do reflection with time... clamp is fine.
3. ball-ball collisions: for each pair, check overlap; resolve: compute normal, separate along normal weighted by inverse mass, and apply impulse if approaching.

Since balls move and we do position correction with inverse-mass weighting, they won't stay overlapped.

Pair resolution:

```ts
for (let i=0;i<balls.length;i++){
  for (let j=i+1;j<balls.length;j++){
    const a = balls[i], b = balls[j];
    let dx = b.x-a.x, dy = b.y-a.y, dz = b.z-a.z;
    let dist2 = dx*dx+dy*dy+dz*dz;
    const rsum = a.r + b.r;
    if (dist2 >= rsum*rsum) continue;
    let dist = Math.sqrt(dist2);
    let nx, ny, nz;
    if (dist < 1e-9) { nx=1;ny=0;nz=0;dist=0; } else { nx=dx/dist; ... }
    // positional correction
    const overlap = rsum - dist;
    const invA = 1/a.m, invB = 1/b.m, invSum = invA+invB;
    const corr = overlap / invSum; // total
    a.x -= nx * corr * invA; ... b.x += nx*corr*invB;
    // relative velocity along normal
    const rvx = b.vx - a.vx; ... rvn = rvx*nx + ...;
    if (rvn < 0) {  // approaching
      const jimp = -(1+1)*rvn / invSum;  // = -2*rvn/invSum
      a.vx -= jimp*invA*nx; a.vy -= ...
      b.vx += jimp*invB*nx;
    }
  }
}
```

Wait sign: impulse along normal from a to b. j = -(1+e)*rvn/(invA+invB). For rvn<0 (approaching), j > 0. a gets -j*n*invA, b gets +j*n*invB. Yes.

Note: after positional correction, positions may push balls outside box; then clamp again afterward within the substep. So do wall clamp after collisions too. Order: move, collide pairs, wall clamp. Or move, wall clamp, pairs, wall clamp. Let's do: move → pair collision (with positional correction) → wall clamp → velocity wall reflect. Hmm, wall handling both position and velocity. If a ball is pushed outside by separation, we clamp position but the velocity reflection at that point may be wrong (velocity might be pointing inward already, then flipping would be wrong). Better: if position outside, clamp; and reflect velocity only if velocity points outward. Do that.

```ts
function applyWalls(b: Ball) {
  const limit = BOX_HALF - b.r;
  if (b.x > limit) { b.x = limit; if (b.vx > 0) b.vx = -b.vx; }
  else if (b.x < -limit) { b.x = -limit; if (b.vx < 0) b.vx = -b.vx; }
  ... same y, z
}
```

That's physically correct for a wall.

For precision of elastic bouncing, the position clamping loses a small amount of the trajectory but energy is preserved (speed unchanged). Good — energy conserved.

Order per substep: integrate positions, resolve pairs (with corrections), then applyWalls for all balls. Good.

Also a concern: with substeps, balls might pass through each other if h too big. maxSub = 1/240, speed 4 → 4/240 = 0.0167 per substep, radius 0.4. Fine.

Kinetic energy conservation: pair impulses conserve energy exactly with e=1. Wall reflections conserve. Position correction doesn't change velocities. So energy conserved exactly (up to floating point).

Now the three.js setup.

Scene, PerspectiveCamera at, say, (10, 8, 14) looking at origin. fov 50. Box diagonal from -5 to 5 → half-diagonal ~8.66. Distance ~19.4 to fit. Let's compute: with fov 50, half-angle 25°, need distance = 8.66/sin(25°) ≈ 20.5. Let's place camera at (13, 10, 17) → distance from origin = sqrt(169+100+289)= sqrt(558)≈23.6. Good, and lookAt(0,0,0). Also aspect could be narrow; handle with resize but fine.

Better: use a function to position camera accounting aspect. Simple: on resize, if aspect < 1, scale distance. Keep simple but reasonable: set camera position, then in resize, adjust camera.position by distance factor. Let's do:

```ts
const camDir = new THREE.Vector3(1, 0.78, 1.3).normalize();
function updateCamera() {
  const halfDiag = Math.sqrt(3)*BOX_HALF; // 8.66
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const vFov = fovRad;
  const hFov = 2*Math.atan(Math.tan(fovRad/2)*aspect);
  const minFov = Math.min(vFov, hFov);
  const dist = (halfDiag) / Math.sin(minFov/2) * 1.05;
  camera.position.copy(camDir).multiplyScalar(dist);
  camera.lookAt(0,0,0);
}
```

Hmm, halfDiag/sin(minFov/2) — for a sphere of radius halfDiag. Actually radius must enclose cube: sqrt(3)*5 = 8.66. Good.

Edges: `new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10,10,10)), new THREE.LineBasicMaterial({color:0xffffff}))`. Good.

Balls: SphereGeometry(0.4, 24, 16) shared; MeshStandardMaterial per ball with random hue.

Materials/lights: AmbientLight(0xffffff, 0.6), DirectionalLight(0xffffff, 1.2) positioned at (8,12,10).

Renderer: antialias, setPixelRatio(Math.min(devicePixelRatio,2)), setSize.

Animation loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  const sim = (window as any).__sim;
  if (!paused) step(dt);
  syncMeshes();
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Careful: `paused` is a boolean exposed in __sim. The object `__sim = { balls, step, paused: false }` — when the test sets `__sim.paused = true`, the render loop must see it. So read `(window as any).__sim.paused` each frame, or keep a reference to the sim object. I'll keep `const simObj = { balls, step, paused: false }` and assign to window; then in loop read `simObj.paused`. Since test sets property on the same object, that works.

But careful: if test does `window.__sim = {...}` replacement — unlikely. Use simObj reference and also check window.__sim?.paused? Simpler: read from the exposed object each frame: 

```ts
const exposed = (window as any).__sim;
if (!(exposed && exposed.paused)) step(dt);
```

That handles both. But step must be the closure. Fine.

Sync meshes: mesh.position.set(b.x,b.y,b.z).

Also expose __scene, __camera, __renderer.

TypeScript strict: avoid implicit any. `(window as any)` is fine.

Let's be careful that `step` is defined as function declaration hoisted, so it can be referenced in the simObj literal.

Let me write the actual code.

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const LIMIT = BOX_HALF - BALL_RADIUS;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomUnitVector(): [number, number, number] {
  // uniform on sphere
  const u = Math.random() * 2 - 1;
  const phi = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(phi), s * Math.sin(phi), u];  // careful: u is z
}
```

Hmm let's return [x,y,z] properly: [s*cos(phi), s*sin(phi), u] — yes that's a unit vector since s²+u²=1.

Balls creation:

```ts
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const minDist = 2 * BALL_RADIUS + 0.05;
  const minDist2 = minDist * minDist;

  const isFree = (x: number, y: number, z: number): boolean => {
    for (const b of balls) {
      const dx = b.x - x, dy = b.y - y, dz = b.z - z;
      if (dx*dx + dy*dy + dz*dz < minDist2) return false;
    }
    return true;
  };

  for (let i = 0; i < BALL_COUNT; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 5000; attempt++) {
      const x = randRange(-LIMIT, LIMIT);
      ...
      if (isFree(x,y,z)) { pushBall(x,y,z); placed = true; break; }
    }
    if (!placed) {
      // lattice fallback
      outer: for (let ix = 0; ix < 3; ix++)
        for (let iy...) for (let iz...)
          const x = (ix - 1) * 3 ... // -3, 0, 3
          if (isFree) { push; placed = true; break outer; }
    }
  }
}
```

The lattice coordinates -3,0,3 are within ±4.6, spacing 3 > 0.85. Good.

pushBall helper that generates velocity and mass:

```ts
function makeBall(x,y,z): Ball {
  const dir = randomUnitVector();
  const speed = randRange(2, 4);
  const m = randRange(1, 3); // random mass 1..3
  return { x, y, z, vx: dir[0]*speed, vy: dir[1]*speed, vz: dir[2]*speed, r: BALL_RADIUS, m };
}
```

Mass: use at least two different masses. Random floats between 1 and 3 will almost surely differ. But to guarantee, alternate: m = (i % 2 === 0) ? randRange(1,1.8) : randRange(2.2,3). Let's do that to guarantee variety. Actually let's do mass = 1 + Math.random()*2 but ensure at least two distinct: with 20 balls, guaranteed practically. I'll do the deterministic-ish version: `const m = (i % 2 === 0) ? randRange(1, 1.6) : randRange(2.4, 3);` That guarantees two distinct masses.

But makeBall doesn't know i; pass mass in.

Let's restructure: 

```ts
function createBallState(x,y,z,mass): Ball
```

OK.

Now let's write everything out.

Also `syncMeshes` function.

One more: the `step` function exposed must use "substeps" - implemented.

Also need to make sure balls never leave the box even with big dt: applying walls at the end of each substep ensures position clamp.

Edge case: pair positional correction could push a ball far outside if it's deep in another ball? No, correction is small.

Also for very dense scenario, sequential pair resolution might leave residual overlap; but with 20 balls of radius 0.4 in a 10³ box, it's spacious.

Let's also consider adding a second pass of pair separation? Not necessary.

Write the render loop with clock.

```ts
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const exposed = (window as any).__sim;
  if (!(exposed !== undefined && exposed.paused === true)) {
    step(dt);
  }
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Note: exposed check - if exposed is undefined at first frame? We set it before loop starts, so fine. Use `if (!exposed || exposed.paused !== true) step(dt)`.

Hmm: but if `__sim.paused` is set true, step should not be called. Right.

Also, should render loop call step when paused? No.

Materials: use a palette, e.g. `new THREE.Color().setHSL(i/20, 0.7, 0.55)`.

MeshStandardMaterial with roughness 0.35, metalness 0.1.

Now the camera update on resize.

Let me write final code.

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const POS_LIMIT = BOX_HALF - BALL_RADIUS;
const MAX_SUBSTEP = 1 / 240;

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

const balls: Ball[] = [];

... 

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 500);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```

Also `document.body.style.margin = '0'`? Optional; set to remove scrollbars. I'll add overflow hidden & margin 0.

Lights.

Box edges.

Now write camera framing:

```ts
const cameraDir = new THREE.Vector3(1.0, 0.72, 1.25).normalize();
const boundingRadius = Math.sqrt(3) * BOX_HALF;

function updateCameraFraming(): void {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const minFov = Math.min(vFov, hFov);
  const dist = boundingRadius / Math.sin(minFov / 2) * 1.05;
  camera.position.copy(cameraDir).multiplyScalar(dist);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(0.1, dist - boundingRadius * 2);  // hmm
  camera.far = dist + boundingRadius * 3;
  camera.updateProjectionMatrix();
}
```

Careful near plane: dist ≈ 8.66/sin(25°)*1.05 ≈ 8.66/0.4226*1.05 ≈ 21.5. near = 0.1 fine. Just set near 0.1, far 200. Don't complicate.

Actually careful with minFov when aspect small: for aspect 0.5, hFov = 2*atan(tan(0.4363)*0.5) = 2*atan(0.2332)=0.4595 rad; sin(0.2297)=0.2275 → dist=8.66/0.2275*1.05 ≈ 40. Fine, far=200 covers.

Resize handler:

```ts
function onResize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  updateCameraFraming();
}
window.addEventListener('resize', onResize);
```

But updateCameraFraming calls updateProjectionMatrix too — fine.

Now step function:

```ts
function step(dt: number): void {
  if (!isFinite(dt) || dt <= 0) return;
  let remaining = dt;
  let guard = 0;
  while (remaining > 1e-9 && guard < 1000) {
    const h = Math.min(remaining, MAX_SUBSTEP);
    substep(h);
    remaining -= h;
    guard++;
  }
}
```

Hmm guard 1000 substeps * 1/240 = 4.17 s max. Fine.

Actually I'd rather not cap; but a guard prevents hang. Keep.

substep:

```ts
function substep(h: number): void {
  const n = balls.length;

  // 1. integrate
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // 2. ball-ball
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    for (let j = i + 1; j < n; j++) {
      const b = balls[j];
      let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const rs = a.r + b.r;
      let d2 = dx*dx + dy*dy + dz*dz;
      if (d2 >= rs*rs) continue;
      let d = Math.sqrt(d2);
      let nx: number, ny: number, nz: number;
      if (d > 1e-9) { const inv = 1/d; nx = dx*inv; ny = dy*inv; nz = dz*inv; }
      else { nx = 1; ny = 0; nz = 0; d = 0; }

      const invA = 1 / a.m;
      const invB = 1 / b.m;
      const invSum = invA + invB;

      // positional separation
      const overlap = rs - d;
      const total = overlap / invSum;
      a.x -= nx * total * invA; ...
      b.x += nx * total * invB; ...

      // impulse
      const rvx = b.vx - a.vx, ...
      const rvn = rvx*nx + rvy*ny + rvz*nz;
      if (rvn < 0) {
        const jimp = (-(1+1) * rvn) / invSum;
        a.vx -= jimp * invA * nx; ...
        b.vx += jimp * invB * nx; ...
      }
    }
  }

  // 3. walls
  for (let i = 0; i < n; i++) applyWall(balls[i]);
}
```

Note: after separation, dx,dy,dz changed - fine since we already computed normal.

One issue: since we separated positions, subsequent pairs use updated positions — good, sequential resolution.

Also note overlap correction weight: `total = overlap / invSum` then a moves by -nx*total*invA, b by +nx*total*invB. Total separation = total*(invA+invB) = overlap. ✓.

applyWall:

```ts
function applyWall(b: Ball): void {
  if (b.x > POS_LIMIT) { b.x = POS_LIMIT; if (b.vx > 0) b.vx = -b.vx; }
  else if (b.x < -POS_LIMIT) { b.x = -POS_LIMIT; if (b.vx < 0) b.vx = -b.vx; }
  ... y, z
}
```

Wait POS_LIMIT depends on b.r which is always 0.4, fine. But use `const limit = BOX_HALF - b.r;` inside for generality.

Now writing the whole thing.

Also note the `paused` property: define `const sim = { balls, step, paused: false };` then `(window as any).__sim = sim;`.

But careful: object literal with `step` referring to function declaration — hoisted, ok.

Let me now produce final code with types correct.

For randomUnitVector returning tuple type.

Also the meshes array type: `const meshes: THREE.Mesh[] = [];` — Mesh<SphereGeometry, MeshStandardMaterial>.

Write full file.

Also add a small grid? No, keep it clean.

One more check: `renderer.setAnimationLoop` callback receives time, frame args; using clock.getDelta works regardless.

Also first frame: set `__ready` after render.

Final code below.

Double-check TypeScript strict: no unused variables? `noUnusedLocals` might be on in the test's tsc config — but "tsc --strict" doesn't include noUnusedLocals. Still, avoid unused.

Clock import: `THREE.Clock` exists.

Let me write out.

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const BALL_COUNT = 20;
const MAX_SUBSTEP = 1 / 240;

interface Ball { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number; }

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomUnitVector(): [number, number, number] {
  const z = Math.random() * 2 - 1;
  const phi = Math.random() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}

const balls: Ball[] = [];

function initBalls(): void {
  const limit = BOX_HALF - BALL_RADIUS;
  const minDist = 2 * BALL_RADIUS + 0.05;
  const minDist2 = minDist * minDist;

  const isFree = (x: number, y: number, z: number): boolean => {
    for (const b of balls) {
      const dx = b.x - x, dy = b.y - y, dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz < minDist2) return false;
    }
    return true;
  };

  const addBall = (x: number, y: number, z: number, mass: number): void => {
    const dir = randomUnitVector();
    const speed = randRange(2, 4);
    balls.push({
      x, y, z,
      vx: dir[0] * speed, vy: dir[1] * speed, vz: dir[2] * speed,
      r: BALL_RADIUS,
      m: mass,
    });
  };

  for (let i = 0; i < BALL_COUNT; i++) {
    const mass = i % 2 === 0 ? randRange(1, 1.6) : randRange(2.4, 3);
    let placed = false;
    for (let attempt = 0; attempt < 4000 && !placed; attempt++) {
      const x = randRange(-limit, limit);
      const y = randRange(-limit, limit);
      const z = randRange(-limit, limit);
      if (isFree(x, y, z)) { addBall(x, y, z, mass); placed = true; }
    }
    if (!placed) {
      for (let ix = 0; ix < 3 && !placed; ix++) {
        for (let iy = 0; iy < 3 && !placed; iy++) {
          for (let iz = 0; iz < 3 && !placed; iz++) {
            const x = (ix - 1) * 3;
            const y = (iy - 1) * 3;
            const z = (iz - 1) * 3;
            if (isFree(x, y, z)) { addBall(x, y, z, mass); placed = true; }
          }
        }
      }
    }
  }
}
```

Good.

Now everything else.

I'll write it out fully now.

One concern about `for (const b of balls)` inside isFree while pushing — fine.

Let's finalize.