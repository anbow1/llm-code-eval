Need to write a TypeScript file with Three.js, physics for 20 balls, elastic collisions with walls and between balls, exposed sim.

Key points:
- balls array of plain objects, live state updated by step. So meshes sync from those objects.
- step(dt) with substeps.
- Non-overlapping start positions: rejection sampling or grid placement.
- Elastic ball-ball collision: impulse along normal, restitution 1, conserve momentum & KE. Standard formula: j = -(1+e) * relVel·n / (1/m1 + 1/m2). With e=1. Then v1 -= (j/m1) n? Careful sign: j = (1+e) * rel·n / (1/m1+1/m2) with rel = v1 - v2, n from 1 to 2... Let me do: n = (p2-p1)/dist, relVel = v1 - v2, velAlongNormal = relVel·n. If velAlongNormal > 0 they're separating, skip. j = -(1+e)*velAlongNormal / (1/m1 + 1/m2). Then v1 += j/m1 * n, v2 -= j/m2 * n. Check: impulse on ball1 is +j*n, on ball2 is -j*n. Momentum conserved. e=1 conserves KE.

Also separate overlapping pairs: positional correction — push apart along normal proportionally to inverse mass, keeping inside box. Push then clamp to box.

Wall collisions: reflect velocity component, clamp position.

Substeps: e.g., fixed timestep 1/240 or divide dt into n substeps where max displacement < radius. Use e.g. maxStep = 1/120, loop.

Substep count: compute n = Math.ceil(dt / (1/120)) maybe cap. With speeds up to ~4 and radius 0.4, dt 1/120 gives displacement 0.033 — fine.

Start positions: use lattice with jitter, 20 balls. Grid 5x4 in some plane? Better: 3D placement — try random points in [-4.5,4.5], reject if overlapping any existing (dist < 2*r + margin). 20 balls radius 0.4, easy.

Masses: random 1..3.

Camera: position like (10, 8, 12), lookAt origin. fov 50. Box diagonal ~ 8.66 half... Box from -5 to 5, distance ~17 works.

Edges: LineSegments with EdgesGeometry(BoxGeometry(10,10,10)) and LineBasicMaterial.

Render loop: clock delta clamp 1/30, if !paused step(delta). Sync mesh positions.

__ready after first frame: set in animation loop after first render (flag).

Write code:

```ts
import * as THREE from 'three';

interface BallState { x,y,z,vx,vy,vz,r,m }
```

step function: uses closure over balls array.

step(dt): substeps: let steps = Math.ceil(dt / 0.005)? Let's pick substep so stable: h = dt / n where n = Math.ceil(dt / (1/240)). Actually 1/240 with dt 1/30 gives 8 substeps, fine.

Each substep: integrate positions, wall collisions, ball collisions (pairwise), separation.

Order: move, then resolve collisions (walls + balls), then positional de-overlap.

Wall: for each axis, if x - r < -5: x = -5 + r, vx = |vx|; if x + r > 5: x = 5 - r, vx = -|vx|.

Ball pairs: for i<j, dx etc., dist < r1+r2: resolve impulse if approaching, then separate positionally: overlap = (r1+r2 - dist); move each along n by overlap * (inv mass fraction). n = (p_j - p_i)/dist (guard dist==0). Then clamp positions to box and re-reflect velocity if clamping caused... simpler: after separation, run wall clamp again. Just do wall resolution after ball resolution each substep.

Edge case: dist very small — use n = random or axis.

Code:

```ts
const balls: BallState[] = [];
// placement
let attempts = 0;
while (balls.length < 20 && attempts < 10000) {
  attempts++;
  const x = -4.5 + Math.random()*9; ... 
  const r = 0.4;
  let ok = true;
  for (const b of balls) { dx... if dist < 2*r + 0.1 ok=false }
  if ok: push {x,y,z, vx: dir*speed...}
}
```

Velocity: random direction, speed 2..4.

Mass: 1 + Math.random()*2.

Scene setup: scene, camera PerspectiveCamera(50, aspect, 0.1, 200), position (11, 9, 13) lookAt(0,0,0). Check visibility: distance sqrt(121+81+169)=~17.6. Box half-diagonal ~8.66. fov 50 -> half angle 25 deg, at 17.6 distance visible radius ~ 17.6*tan(25)=8.2. Hmm tight. Use fov 55 or distance larger: (12,10,15): dist = sqrt(144+100+225)=20.7, tan25*20.7=9.65 > 8.66. Good. Use fov 50, position (12,10,15).

Lights: AmbientLight(0xffffff, 0.6), DirectionalLight(0xffffff, 1) at (10,15,8).

Renderer: antialias true, setSize, append canvas. setAnimationLoop.

Sync: mesh.position.set(ball.x, y, z).

__sim: { balls, step, paused }.

step implementation as closure:

```ts
function step(dt: number): void {
  const maxSub = 1/240;
  const n = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / n;
  for (let s = 0; s < n; s++) {
    // integrate
    for (const b of balls) { b.x += b.vx*h; ... }
    // ball-ball
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      for (let j = i+1; j < balls.length; j++) {
        const c = balls[j];
        let dx = c.x - a.x, dy = ..., dz = ...;
        let dist = Math.sqrt(...);
        const minDist = a.r + c.r;
        if (dist >= minDist) continue;
        let nx, ny, nz;
        if (dist < 1e-9) { nx=1; ny=0; nz=0; dist=1e-9... } else normalize.
        const rel = (c.vx - a.vx)*nx + ...;
        if (rel < 0) { // approaching (rel is velocity of c relative a along n from a to c; approaching means rel<0)
          const e = 1;
          const jImp = -(1+e)*rel / (1/a.m + 1/c.m);
          a.vx -= jImp/a.m * nx ...? 
```

Wait sign: impulse applied to c is +J*n (pushing c away from a), to a is -J*n. J = -(1+e)*rel/(1/ma+1/mc). rel<0 so J>0. Then c.v += J/mc * n, a.v -= J/ma * n. Check head-on equal masses: a at v=1 moving toward c at 0. n from a to c = +x. rel = 0 - 1 = -1. J = -(2)(-1)/(2) = 1. c.v += 1/1 = 1, a.v -= 1 → a=0, c=1. Correct.

Positional separation: overlap = minDist - dist; totalInv = 1/ma + 1/mc; a moves by -n * overlap * (1/ma)/totalInv, c moves by +n * overlap * (1/mc)/totalInv.

Then walls for all balls after pair loop.

Also clamp velocities magnitude? Not needed.

paused: boolean, toggled maybe with key? Not required. Just expose false.

__ready: set true after first render — use a flag: let firstFrame = true; in loop: renderer.render(...); if (firstFrame) { __ready = true; firstFrame = false; }

Resize handler.

Strict TS: all typed. Write final code.

Mesh materials: MeshStandardMaterial with color random-ish from palette; use HSL. Fine, no external assets.

Type of __sim balls: BallState matches {x,y,z,vx,vy,vz,r,m}.

One detail: mesh.geometry SphereGeometry(0.4, 32, 16).

Full code: