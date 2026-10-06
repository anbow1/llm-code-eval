A straightforward physics sim with elastic collisions. Write the code.

Key physics:
- Wall collision: if pos ± r exceeds ±5, reflect velocity component, clamp position.
- Ball-ball: if dist < r1+r2, separate (push apart proportional to inverse mass), and elastic collision: standard impulse along normal with restitution 1: j = -(1+e) * vRel·n / (1/m1 + 1/m2). With e=1, relative normal velocity reverses.

Positions: use the balls array of plain objects directly as state; meshes sync from it.

Substeps: fixed substep like 1/240, accumulate dt, or split dt into N substeps. Use accumulator with max dt.

Ready flag: set after first render. Can set via a flag in animation loop after renderer.render.

Write code:

```ts
import * as THREE from 'three';

const BOX = 5;
const R = 0.4;
const N = 20;

interface Ball { x,y,z,vx,vy,vz,r,m }

Scene setup, camera at like (11, 9, 11) looking at origin.

Lights: ambient + directional.

Box edges: EdgesGeometry(BoxGeometry(10,10,10)) + LineSegments with LineBasicMaterial.

Init positions: rejection sampling with min distance 2*R + small epsilon, inside |coord| <= 5 - R. Velocity: random direction, speed 2..4.

step(dtRaw): accumulator with fixed substep h = 1/240, max substeps maybe 40. Also cap.

Collision resolution per substep:
- integrate positions
- walls
- pairwise

Pairwise elastic collision with separation:
For each pair i<j:
dx = xi - xj etc, distSq; if distSq < (r1+r2)^2:
 dist = sqrt(distSq) (guard zero)
 nx = dx/dist ...
 overlap = r1+r2 - dist
 // separate by inverse mass
 totalInv = 1/m1 + 1/m2
 wi = (1/m1)/totalInv, wj = (1/m2)/totalInv
 xi += n * overlap * wi; xj -= n * overlap * wj
 // impulse
 vrel = (vi - vj)·n
 if vrel < 0:
   j = -(2) * vrel / totalInv  (e=1: j = -(1+e)*vrel/total = -2*vrel/total)
   vi += n * j/m1; vj -= n * j/m2

Expose __sim = { balls, step, paused }.

Render loop: delta = clock.getDelta(), clamp to 1/30; if !paused step(delta); sync meshes; renderer.render.

window as any assignments. tsc strict — avoid unused vars.

Also add slight color variation for masses.

Write final code carefully typed.