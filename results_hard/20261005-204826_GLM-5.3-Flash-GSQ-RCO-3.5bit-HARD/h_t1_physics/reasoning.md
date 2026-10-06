Write a complete TypeScript file. Key considerations:

- Compile with tsc --strict: need DOM lib. Just write plain code.
- Physics: balls array of plain objects. step(dt) advances physics with substeps.
- Ball-ball elastic collision with masses: relative velocity along normal, impulse. Positional separation to avoid overlap.
- Walls: reflect velocity, clamp position.
- Random non-overlapping start positions via rejection sampling.
- Use import map? Just imports; assume bundler/resolver handles 'three/addons/...' — but we don't actually need addons. We only need three. Requirement says addons from 'three/addons/...' if used; we don't need any, fine.

Code:

```ts
import * as THREE from 'three';

const BOX = 5;
const R = 0.4;
const N = 20;

type Ball = { x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;m:number };

function randRange(a,b){...}

function makeBalls(): Ball[] {
  const balls: Ball[] = [];
  while (balls.length < N) {
    const x = randRange(-BOX+R, BOX-R); ...
    if overlap with existing, skip
    const m = randRange(1,3);
    // velocity with speed 2..4, random direction
  }
}

function step(dt) { physics }
```

Physics function: substeps: const sub = Math.ceil(dt / 0.01); h = dt/sub; loop. In each substep: integrate positions, wall collisions, ball-ball collisions (multiple iterations maybe; do 2 passes or loop until resolved... simple: after integrating, resolve collisions pair by pair + separation, maybe iterate a few times).

Elastic collision between two balls:
- dx = b2 - b1, dist, if dist < r1+r2:
  - normal n = dx/dist (handle dist ~ 0: random or use old normal).
  - separate: overlap = (r1+r2 - dist)/2; move b1 back along n by overlap weighted... For conservation just split: b1 -= n*overlap*(m2/(m1+m2))? Standard: move each proportional to inverse mass: b1 -= n * overlap * (m2/(m1+m2)), b2 += n * overlap * (m1/(m1+m2)). Actually inverse mass weighting: w1 = 1/m1, w2=1/m2, total w = w1+w2; b1 -= n*overlap*(w1/w2)? Hmm: move each by overlap * (other's share). b1 moves along -n by overlap*(w1/ (w1+w2))? No — heavier ball moves less: b1 displacement magnitude = overlap * w1/(w1+w2). Yes.
  - relative velocity along normal: vn = (v2-v1)·n. If vn < 0 (approaching), impulse j = -(1+e)*vn / (w1+w2) with e=1: j = -2*vn/(w1+w2). v1 -= n * j*w1... careful sign. Standard: impulse applied: v1 -= j*w1*n? Let's derive: j scalar, impulse J = j*n applied to ball2 (+) and -J to ball1. v2 += J/m2 = j*w2*n, v1 -= j*w1*n. j = -(1+e)*vn / (w1+w2), with vn = (v2-v1)·n. With e=1, j = -2*vn/(w1+w2). If vn<0, j>0. Then v2 += j*w2*n increases v2 along n, v1 -= j*w1*n decreases. Good.

Wall: if x - R < -BOX: x = -BOX+R... actually clamp exactly: x = -BOX + R? If x-R < -5, set x = -5+R, vx = -vx (if vx<0). Elastic: reflect.

Render: mesh positions from balls each frame.

Renderer, camera at (12, 10, 14) looking at origin — distance ~ sqrt(144+100+196)=~21, box diagonal ~ 8.66 radius; fine with fov 45.

Expose __sim = { balls, step, paused } where balls are plain objects live state.

Animation loop: delta = clock.getDelta(); clamp to 1/30; if (!__sim.paused) step(delta). Sync meshes. Render. After first frame set __ready = true.

Strict TS: type everything, avoid noUnusedLocals issues (tsc --strict doesn't include noUnusedLocals unless configured — assume just strict). Handle null canvas: renderer.domElement always exists.

Clock delta on first frame: fine.

Write final code.