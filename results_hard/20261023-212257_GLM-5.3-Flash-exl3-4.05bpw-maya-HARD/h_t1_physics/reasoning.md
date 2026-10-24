Standard elastic ball physics in a box. Write TypeScript strict-clean file.

Key details:
- 20 balls, radius 0.4, mass random 1..3, non-overlapping start positions fully inside box (so position within ±(5-0.4)).
- Elastic wall collisions: reflect velocity component.
- Ball-ball: elastic collision using masses.
- Substeps: divide dt into fixed substeps, e.g. substep size ~1/240 or enough steps.
- Position correction for overlaps: push apart along normal proportionally to inverse mass.
- step(dt) exposed: uses substeps.
- Paused flag.

Write code carefully strict. Simple placement: rejection sampling.

Substep: nSub = Math.ceil(dt / (1/240)) etc. dt clamped to 1/30 in loop; step itself clamps internally too maybe.

Implementation:

```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
  mesh: THREE.Mesh;
}
```

But __sim.balls must be plain objects {x,y,z,vx,vy,vz,r,m} — "numbers, the live state that step() updates". So make plain objects with mesh stored separately in a parallel array. Simpler: balls array of plain state objects, and meshes array.

Physics step:

```
function step(dt: number) {
  const maxSub = 1/240;
  let remaining = Math.min(dt, 0.1);
  while (remaining > 0) {
    const h = Math.min(maxSub, remaining);
    substep(h);
    remaining -= h;
  }
}
```

substep(h): integrate positions, wall collisions, ball-ball collisions with overlap separation.

Wall collision: if x + r > 5 and vx > 0: x = 5 - r; vx = -vx. Similarly negative.

Ball-ball: for each pair, dx etc, dist < r1+r2: normal n, relative velocity along normal; if approaching (vrel·n < 0), impulse j = -(1+e)*vrel·n / (1/m1 + 1/m2), e=1. Apply. Then separate overlap: move each along n proportional to inverse masses so they just touch.

Order: integrate, then resolve walls, then resolve pairs (maybe iterate pairs once; with small substeps it's fine). Could do a couple of iterations of pair resolution for stability. Do 2 iterations.

Rendering: sync mesh positions.

Camera: PerspectiveCamera at (10, 8, 12) lookAt origin, fov 50.

Renderer: antialias, setPixelRatio maybe. Append canvas.

__ready after first frame: flag in animation loop.

Expose __sim with balls (plain objects), step, paused.

Full code:

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const NUM_BALLS = 20;
const BALL_RADIUS = 0.4;

interface BallState { x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;m:number; }

const balls: BallState[] = [];
const meshes: THREE.Mesh[] = [];

function spawnBalls(): void {
  const limit = BOX_HALF - BALL_RADIUS - 0.05;
  let guard = 0;
  while (balls.length < NUM_BALLS && guard < 100000) {
    guard++;
    const x = (Math.random()*2-1)*limit; ... 
    check no overlap with existing (dist > 2r + small)
    ...
    speed 2..4, random direction
    mass 1..3
  }
}
```

If guard exceeded... with 20 balls r=0.4 in a 10 box, plenty of space; fine. But to be safe, could use a deterministic grid with jitter. Rejection sampling is fine.

Physics:

```ts
function resolveWalls(b: BallState): void {
  const lim = BOX_HALF - b.r;
  if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  else if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  ...
}
```

Pairs:

```ts
function resolvePairs(): void {
  for (let i=0;i<balls.length;i++){
    for (let j=i+1;j<balls.length;j++){
      const a=balls[i], b=balls[j];
      let dx=b.x-a.x, dy=..., dz=...;
      const dist2 = dx*dx+dy*dy+dz*dz;
      const minDist = a.r+b.r;
      if (dist2 >= minDist*minDist || dist2 === 0) { if dist2===0 nudge randomly; continue; }
      const dist = Math.sqrt(dist2);
      const nx=dx/dist, ny=dy/dist, nz=dz/dist;
      const rvx=b.vx-a.vx ...;
      const vn = rvx*nx+rvy*ny+rvz*nz;
      if (vn < 0) {
        const invA = 1/a.m, invB = 1/b.m;
        const jimp = -(2*vn)/(invA+invB); // e=1: j = -(1+e)vn/(invA+invB)
        a.vx -= jimp*invA*nx; ... b.vx += jimp*invB*nx; ...
      }
      // separate overlap
      const overlap = minDist - dist;
      if (overlap > 0) {
        const invA=1/a.m, invB=1/b.m, invSum=invA+invB;
        const corr = overlap/invSum;
        a.x -= corr*invA*nx; ...
        b.x += corr*invB*nx; ...
      }
    }
  }
}
```

Wait impulse sign: vn < 0 means approaching (relative velocity of b wrt a along n from a to b is negative → they approach). Impulse magnitude j = -(1+e)*vn/(invA+invB), positive. Apply a.vx -= j*invA*nx (a pushed opposite n), b.vx += j*invB*nx. Correct.

Substep: integrate positions then resolve walls and pairs (maybe twice).

Scene setup: boxes edges via EdgesGeometry of BoxGeometry(10,10,10), LineBasicMaterial. Balls: SphereGeometry(0.4, 24, 16), MeshStandardMaterial with random colors, roughness ~0.4, metalness 0.1.

Lights: AmbientLight(0xffffff, 0.5), DirectionalLight(0xffffff, 1.5) at (8,12,10).

Camera aspect resize handler.

Animation loop: clock delta, clamp to 1/30, if !paused sim.step(dt). Sync meshes. Render. Set __ready after first render.

__sim: { balls, step, paused: false }. paused is a boolean property on object; the loop reads simPaused variable or __sim.paused. Use object with getter? Simpler: keep a module-level `let paused = false;` and define __sim = { balls, step, get paused(){return paused;}, set paused(v){paused=v;} }. That works with tsc. Or just mutate object property: `const sim = { balls, step, paused: false }` and loop checks `sim.paused`. Tests set `__sim.paused = true` which mutates same object. That's simplest and works.

Write final code.