Need to write a TypeScript file with Three.js, physics sim. Balls array plain objects; physics step function. Meshes sync. Substeps.

Implementation:

- 20 balls, r=0.4, m random 1..3, positions non-overlapping: rejection sampling within [-5+r, 5-r].
- velocities speed 2..4 random direction.
- step(dt): substeps with fixed dt e.g. max 1/240 or so; do wall collisions (reflect with restitution 1: v = -v on that axis), ball-ball elastic collision: check overlap, resolve positional overlap by mass-weighted separation, then elastic impulse: standard formulas. Only apply impulse if approaching (dot(relVel, n) < 0).
- Ensure separation: move positions apart along normal proportional to inverse masses.
- Also clamp balls inside box after step.

Type strictness: plain objects. Keep meshes in array.

Code:

```ts
import * as THREE from 'three';

interface Ball { x,y,z,vx,vy,vz,r,m }

const R = 0.4, N = 20;
const balls: Ball[] = [];
function overlap(a,b){ dx... dist < a.r+b.r }
positions: while balls.length<N: sample random in [-5+R,5-R], check no overlap, push.
velocity: random dir unit vector * (2+rand*2).

scene, camera perspective fov 50, position (10,10,12) lookAt origin. Actually to see box fully: distance ~ sqrt(75+25)? position (12,10,14), lookAt 0.

renderer: antialias, setPixelRatio, append canvas.

Lighting: AmbientLight(0xffffff, 0.5), DirectionalLight(0xffffff, 1) at (5,10,7).

Edges: new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10,10,10)), new THREE.LineBasicMaterial({color:0xffffff})).

Meshes: SphereGeometry(R, 24, 16), MeshStandardMaterial with random colors. mesh.position.set.

step(dt): substeps: n = Math.ceil(dt / (1/240)) maybe max 32? dt clamp 1/30 => n up to 8 at 1/240. Fine.

Substep:
- integrate positions x += vx*h.
- wall: if x - r < -5 and vx<0: x = -5+r; vx = -vx. etc. Simpler: if x < -5+r { x = -5+r; vx = Math.abs(vx);} if x > 5-r {x=5-r; vx=-Math.abs(vx);}.
- ball pairs: for i<j: dx..., dist2, minD = ri+rj; if dist2 < minD^2: dist = sqrt; n = (dx/dist,...); relative velocity along n: vrel = (vi - vj)·n; separate positions: overlap = minD - dist; push apart by overlap weighted by inverse mass: i moves by +overlap*(mj/(mi+mj)) along n, j by -overlap*(mi/(mi+mj)). If vrel < 0 (approaching, since n points from j to i? define dx = xi - xj, n = dx/dist; vrel = (vi - vj)·n; if vrel < 0 approaching): impulse j = -(2*vrel)/(1/mi+1/mj); vi += (j/mi)*n; vj -= (j/mj)*n. Wait elastic: impulse magnitude = -(1+e)*vrel/(1/mi+1/mj), e=1 → -2*vrel/(1/mi+1/mj). Then vi += impulse/mi * n, vj -= impulse/mj * n. Check: vrel' = vrel + impulse*(1/mi+1/mj) = vrel - 2vrel = -vrel. Good.

Then final clamp inside box: for each ball, clamp position to [-5+r, 5-r].

Also handle dist == 0 edge: dist < 1e-6, use random or default n = (1,0,0).

Expose:
(window as any).__sim = { balls, step, paused: false };
window __scene etc.

Animation loop: delta from clock: use clock.getDelta(), clamp. If !paused step(dt). Sync meshes. After render first frame set __ready = true (guard flag).

paused as boolean property on sim object; but sim object typed as any since window. Fine: define `const sim = { balls, step, paused: false };` and assign.

Write it.