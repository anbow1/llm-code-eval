Write a complete TypeScript file. Need to be careful with strict typing.

Balls: plain objects {x,y,z,vx,vy,vz,r,m}. Physics with substeps. Elastic collisions, wall and ball-ball.

Implementation:

- Create scene, camera (perspective, positioned e.g. at (10,10,12) looking at origin).
- Box edges: BoxGeometry(10,10,10), EdgesGeometry, LineSegments.
- 20 balls, radius 0.4, random positions non-overlapping inside [-5+0.4, 5-0.4], masses random 1..3, velocities random direction speed 2..4.
- Render loop: renderer.setAnimationLoop; delta from clock.getDelta(), clamp to 1/30; if not paused, sim.step(delta).
- step(dt): substeps based on dt: e.g. n = Math.ceil(dt / (1/120)) or fixed substep 1/240; each substep: move balls, wall collisions (reflect: if x + r > 5, x = 5 - r, vx = -vx, etc.), ball-ball collisions: for pairs, if dist < r1+r2, resolve overlap (positional correction proportional to inverse mass) and elastic collision along normal: relative velocity along normal, impulse j = -(1+e)*vRel·n / (1/m1 + 1/m2) with e=1.
- Sim.step must use plain objects updated in place; meshes sync from those objects.

Avoid overlap at start: rejection sampling.

Handle zero overlap separation robustly: after moving, check pairwise overlap, push apart along normal proportional to inverse masses; if vRel·n < 0 (approaching), apply impulse.

Also handle degenerate dist ~ 0: use random normal.

Code:

```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}
```

Wall collision handling: after integrating position, check each axis: if x - r < -5 → x = -5 + r, vx = Math.abs(vx); if x + r > 5 → x = 5 - r, vx = -Math.abs(vx). Use abs to be safe.

Ball-ball:

```
const dx = b.x - a.x; ...
const dist = Math.hypot(dx,dy,dz);
const minDist = a.r + b.r;
if (dist < minDist) {
  const nx = ..., ny, nz normalized (dist>eps ? dist : random)
  // separate
  const overlap = minDist - dist;
  const invA = 1/a.m, invB = 1/b.m, invSum = invA + invB;
  a.x -= nx * overlap * invA / invSum; etc.
  b.x += ...
  // impulse
  const rvx = b.vx - a.vx; ...
  const vn = rv·n;
  if (vn < 0) {
    const j = -(1 + 1) * vn / invSum; // e=1 → 2*... wait: j = -(1+e)vn / invSum with e=1 → j = -2vn/invSum
    a.vx -= j * invA * nx; ... b.vx += j * invB * nx;
  }
}
```

Wait sign: j applied along n to b (positive) and negative to a. vn = (vb - va)·n. If vn < 0 they're approaching. Impulse magnitude j = -(1+e)*vn / invSum. Then va -= j*invA*n, vb += j*invB*n. Check: e=1 → energy conserved? Elastic collision formula: j = 2*|vn|/(invSum) when e=1... standard: j = -(1+e)*vn/invSum. With e=1, vn<0, j>0. va -= j*invA*n: since n points from a to b, va decreases along n... hmm let's verify with equal masses head-on: a at (-d,0), b at (d,0), va=+1, vb=-1. n = (1,0,0). rv = vb - va = -2. vn = -2. j = -(2)(-2)/(1+1) = 2. va -= 2 * 0.5 * 1 = va - 1 = 0. vb += 1 → 0. Correct, both stop.

Substeps: choose substep count: `const sub = Math.max(1, Math.ceil(dt / (1/240)))`; h = dt/sub.

Random non-overlap start: loop attempts, check distance to existing balls > 2*r + small margin, within [-4.5, 4.5].

Meshes: SphereGeometry(0.4, 24, 16), MeshStandardMaterial with distinct colors. Sync: mesh.position.set(ball.x, y, z).

Also could set ball geometry radius exactly 0.4 — yes single geometry.

Camera: position (9, 7, 11), lookAt origin; or use larger distance. Box half-diagonal ~ 8.66; camera at distance ~16 fine.

Ready flag: set __ready = true after first render. In setAnimationLoop callback, track firstFrame boolean: render, then if !firstRendered { firstRendered = true; __ready = true; }.

Lights: AmbientLight(0xffffff, 0.4), DirectionalLight at (5,10,7).

Colors: random via HSL, or fixed palette. Use `new THREE.Color().setHSL(Math.random(), 0.7, 0.55)`.

Expose __sim = { balls, step, paused }.

step signature: (dt: number) => void.

Also the render loop uses window.__sim? Better keep local references and expose same objects.

Write code carefully typed. Use `const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean }`.

Full code:

```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BOX_HALF = 5;
const BALL_R = 0.4;
const NUM_BALLS = 20;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(8, 12, 10);
scene.add(dir);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x66ffcc }));
scene.add(edges);
boxGeo.dispose();

// Balls
function createBalls(): Ball[] { ... }
```

Ball creation with rejection sampling:

```ts
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = BOX_HALF - BALL_R - 0.05;
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 10000) {
    guard++;
    const x = (Math.random() * 2 - 1) * limit;
    const y = ..., z = ...;
    let ok = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      if (dx*dx+dy*dy+dz*dz < (2*BALL_R + 0.1) ** 2) { ok = false; break; }
    }
    if (!ok) continue;
    const m = 1 + Math.random() * 2;
    // velocity: random direction, speed 2..4
    let vx = Math.random()*2-1, vy = ..., vz = ...;
    const len = Math.hypot(vx, vy, vz);
    if (len < 1e-6) continue;
    const speed = 2 + Math.random()*2;
    vx = vx/len*speed; ...
    balls.push({ x, y, z, vx, vy, vz, r: BALL_R, m });
  }
  return balls;
}
```

Physics step:

```ts
function stepPhysics(balls: Ball[], dt: number): void {
  const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    for (const b of balls) {
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
    }
    // walls
    for (const b of balls) {
      const lo = -BOX_HALF + b.r, hi = BOX_HALF - b.r;
      if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
      else if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
      ... y, z
    }
    // ball-ball
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const minDist = a.r + b.r;
        if (dist >= minDist) continue;
        let nx: number, ny: number, nz: number;
        if (dist < 1e-9) {
          nx = 1; ny = 0; nz = 0; dist = 0;
        } else {
          nx = dx/dist; ny = dy/dist; nz = dz/dist;
        }
        const invA = 1/a.m, invB = 1/b.m, invSum = invA + invB;
        const overlap = minDist - dist;
        a.x -= nx * overlap * invA/invSum; ... b.x += ...
        const vn = (b.vx - a.vx)*nx + (b.vy - a.vy)*ny + (b.vz - a.vz)*nz;
        if (vn < 0) {
          const jImp = -(2 * vn) / invSum; // e = 1
          a.vx -= jImp * invA * nx; ...
          b.vx += jImp * invB * nx; ...
        }
      }
    }
  }
}
```

Then meshes. Create per ball: shared geometry SphereGeometry(BALL_R, 24, 16); material per ball with random HSL color.

Sync function: for each ball, mesh.position.set(...).

Render loop:

```ts
const clock = new THREE.Clock();
let firstFrame = false;

const sim = {
  balls,
  step: (dt: number): void => { stepPhysics(balls, dt); },
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  if (!sim.paused) sim.step(delta);
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  renderer.render(scene, camera);
  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});
```

Note clock.getDelta() also used when paused — fine, it resets timer anyway.

One subtle: `dist` variable reassignment — use `let dist`. Fine.

Type of __sim: assign with `as any` casts or just (window as any). The sim object literal type: balls: Ball[] — fine, they're plain objects.

Strict mode: all fine. Ensure no unused variables.

Write final code block.