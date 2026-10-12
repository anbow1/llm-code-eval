Standard elastic collision physics. Write one TS file.

Key points: balls array of plain objects {x,y,z,vx,vy,vz,r,m}. step(dt) with substeps. Elastic wall collisions: flip velocity component when hitting boundary (with r offset). Ball-ball elastic collision: standard impulse formula with restitution 1: j = 2*(v_rel·n)/(1/m1+1/m2), apply. Positional separation for overlaps.

Ensure balls never leave box: clamp positions, reflect velocity if out.

Substeps: fixed step like 1/240 or divide dt into chunks.

Write code carefully to compile strict.

Camera at e.g. (10, 10, 12) looking at origin. Directional light.

After first frame set __ready true — use a flag in animate.

Code:

```ts
import * as THREE from 'three';

const BALL_COUNT = 20;
const R = 0.4;
const BOX = 5;

interface Ball { x,y,z,vx,vy,vz,r,m }

setup balls: non-overlap via rejection sampling, positions in [-5+R, 5-R] with margin.

step(dt): substeps: n = Math.ceil(dt / 0.005) capped? use dt/Math.max... Let's do: const sub = Math.max(1, Math.ceil(dt / 0.01)); h = dt/sub; loop h: integrate positions, wall collisions, ball collisions.

Wall: for each axis, if pos > BOX - r: pos = BOX - r; if vel>0 vel = -vel. Same negative.

Pair collisions: for i<j, dx..., dist < r1+r2 => separate: push apart proportional to inverse mass along normal; relative velocity along normal vn; if vn < 0 (approaching) apply impulse j = -(2*vn)/(1/mi+1/mj)... sign care. n = (pj - pi)/dist. rel = vj - vi; vn = rel·n. If vn < 0: impulse magnitude = -(1+e)*vn/(1/mi+1/mj), e=1 => -2*vn/(...). vi -= (j/mi)*n? Let's derive: impulse on j is +j*n, on i is -j*n. vi += -j/mi * n? Actually impulse applied: vi -= j/mi * n... standard: vi_new = vi - (j/mi) n, vj_new = vj + (j/mj) n with j = -(1+e)vn / (1/mi+1/mj). With e=1, j = -2vn/(1/mi+1/mj). Since vn<0, j>0. Check: vi -= (j/mi)n moves vi opposite to n (away from j), good.

Separation: overlap = (r1+r2) - dist; move i by -overlap*(mi/(mi+mj))*n... i moves opposite n: pi -= n * overlap * (mj/(mi+mj)); pj += n * overlap * (mi/(mi+mj)). Then clamp to walls.

Also clamp positions to box always after each substep.

Render loop: delta from clock.getDelta(), clamp to 1/30, if !paused step(delta). Sync meshes.

__sim.step must advance physics by dt with substeps — expose step function directly.

Resize handler.

First frame ready flag: in animate, after render, if !readyFlag set __ready.

Write it.