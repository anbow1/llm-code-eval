Write a single TypeScript file. Key requirements: 20 balls, radius 0.4, masses 1..3, box -5..5, elastic collisions, LineSegments edges, expose __sim with live plain objects {x,y,z,vx,vy,vz,r,m}, step(dt) with substeps, paused flag, first frame sets __ready.

Physics approach per substep:
- integrate positions
- wall collisions: reflect velocity, clamp position
- ball-ball collisions: detect overlap, separate (push apart proportionally to mass), then resolve elastic collision.

Elastic collision between balls i,j: relative velocity along normal; impulse j = -(1+e) * vRel·n / (1/mi + 1/mj) with e=1. Then vi -= j*n/mi... standard.

Substeps: dt clamp, e.g. split into substeps of ~1/240 s or fixed count based on dt. Use e.g. substep length 1/120; compute steps = ceil(dt / (1/120)).

Non-overlap start positions: rejection sampling with random positions in [-5+0.4, 5-0.4], check distance >= 2*0.4 with margin.

Meshes in sync: sphere geometry radius 0.4, scale 1. Update position from sim state each frame (also when paused, positions stay).

Colors: maybe random color per ball via MeshStandardMaterial color.

Camera: position like (12, 10, 14), lookAt origin. Handle resize.

__sim.balls: array of plain objects updated by step — mesh sync reads from these.

Write code carefully for strict TS.

substep: subDt = dt / steps each iteration.

Wall collision: if x - r < -5: x = -5 + r; vx = Math.abs(vx) (or reflect: vx = -vx if vx < 0). Use reflect: if (pos < min && vel < 0) vel = -vel; pos = min. Actually pos = clamp then reflect vel if beyond.

Ball-ball: n = (pj - pi)/d. overlap = r1+r2 - d. If overlap > 0: separate: move i by -overlap * (mj/(mi+mj)) along n... push i opposite n, j along n proportional to inverse mass. Then relative velocity along n: vn = (vj - vi)·n; if vn < 0: impulse scalar imp = -(1+e)*vn / (1/mi + 1/mj); vi -= imp*n/mi... wait sign: vi += -imp? Let's define: impulse applied to i is -imp*n, to j is +imp*n where imp = -(1+e)*vn/(1/mi+1/mj). Since vn<0, imp>0. vi -= (imp/mi)*n; vj += (imp/mj)*n. Check: vRel'·n = vn + imp*(1/mi+1/mj) = vn - (1+e)vn = -e*vn. Good.

Edge case d == 0: pick random normal.

step function defined outside loop closure, referencing balls array.

Code:

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

interface BallState { x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;m:number; }

const balls: BallState[] = [];

// spawn non-overlapping
function randRange(a:number,b:number){return a + Math.random()*(b-a);}
let attempts = 0;
while (balls.length < NUM_BALLS && attempts < 10000) {
  attempts++;
  const x = randRange(-BOX_HALF+BALL_RADIUS, BOX_HALF-BALL_RADIUS); ...
  const candidate = {...};
  let ok = true;
  for (const b of balls) { dx... if dist < 2*BALL_RADIUS + 0.05 -> ok=false }
  if ok: velocity random direction with speed 2..4:
    speed = randRange(2,4); theta... uniform sphere direction: pick u,v.
  balls.push(candidate);
}
```

Direction: use random unit vector: pick random angle in sphere. Use THREE? Just math: z = rand(-1,1), a = rand(0, 2π), r = sqrt(1-z²).

Scene setup, lights, box edges, sphere meshes.

step(dt): substeps: const maxSub = 1/120; const n = Math.max(1, Math.ceil(dt / maxSub)); const h = dt/n; loop: integrate, walls, pairs.

Pairs collision O(n²) fine.

Renderer, camera at (11, 9, 13) lookAt(0,0,0).

Animation loop: const delta = clock.getDelta() clamped to 1/30; if (!paused) step(delta); sync meshes; render; after first render set __ready = true.

Expose __sim = { balls, step, paused }.

paused boolean variable; window.__sim.paused reads the variable — but exposing object with paused property copied at creation won't reflect updates. Need getter or update each frame. Options: define __sim once with get paused() { return paused; }. That works: object literal with getter. step: function reference.

Sync meshes even when paused (positions same). Mesh position from balls[i].

Write final code.