Need to write a TypeScript file with Three.js, physics for 20 balls, elastic collisions with walls and between balls, box edges, lights, exposure hooks.

Key details:
- Balls as plain objects with x,y,z,vx,vy,vz,r,m — but meshes need to sync. I'll keep balls array of plain objects (live state), and meshes separately.
- step(dt) with substeps.
- Non-overlapping start positions: rejection sampling.
- Elastic collision between balls: standard 1D along collision normal with restitution 1: 
  v1' = v1 - (2 m2 / (m1+m2)) * (dot(v1-v2, n)) * n where n = (p1-p2)/dist... careful signs.
  j = 2 * dot(vrel, n) / (1/m1 + 1/m2) where vrel = v1 - v2, n from 1 to 2 or whatever. Standard impulse: n = (p2-p1)/dist, vrel = v2 - v1, vn = dot(vrel, n); if vn < 0 (approaching), impulse magnitude j = -(1+e)*vn / (1/m1+1/m2) with e=1 → j = -2*vn/(1/m1+1/m2); apply v1 -= j*n/m1... wait sign. Let me define: n points from ball1 to ball2. vrel = v2 - v1. Approaching if dot(vrel, n) < 0. Impulse J on ball2: J = -(1+e)*vn/(1/m1+1/m2) * n? With e=1: J = -2*vn/(1/m1+1/m2). Since vn<0, J positive. Then v2 += J*n/m2, v1 -= J*n/m1. Check: equal masses, head-on: v2-v1 = (v2-v1), n along that direction... vn = |vrel| relative closing speed negative. J = 2*|vn|/(2/m) = m*|vn|. v2 += |vn|*n → moves in n direction... Hmm, head-on equal masses should exchange velocities. Let vn = dot(vrel,n) = -(closing speed). J = -2*vn/(2/m) = -m*vn = m*closing. v2 += J*n/m = closing * n. If n points from 1 to 2 and ball1 moving toward 2, v1 = (c,0,0), v2 = 0, n=(1,0,0). vrel = v2-v1 = (-c,0,0), vn = -c. J = 2c/(2/m)= m c. v2 += c*n → v2 = c. v1 -= c*n → v1 = 0. Correct exchange. 

- Separation of overlapping pairs: after collision detection, if overlapping but not approaching (or anyway), push them apart positionally along normal. Also clamp positions to walls.
- Wall collisions: reflect velocity component, clamp position to ±(5 - r).
- Substeps: e.g. fixed substep of 1/240 or split dt into ceil(dt/maxSub) steps.

Mesh sync: read ball positions into mesh.position.

Camera: perspective at like (11, 9, 13) looking at origin; box from -5 to 5, fits.

__ready after first frame: use a flag in animation loop — set after first render call.

TypeScript strict: all typed.

Write code:

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

interface BallState { x,y,z,vx,vy,vz,r,m: number }
```

Actually interface with number fields.

Random start positions: rejection sampling with minimum distance 2*r.

step(dt): substeps: const sub = Math.max(1, Math.ceil(dt / (1/240))); const h = dt / sub; loop.

In each substep: integrate positions; wall collide; ball-ball collide with impulse + positional separation.

Wall collision: for each axis, if pos > 5 - r: pos = 5 - r; if vel > 0 vel = -vel (elastic). Similarly min side.

Ball-ball: dist < 2r: compute normal, if approaching apply impulse; always separate positions: move each by half the overlap along ±n. Edge case dist ~ 0: random normal.

Render loop: delta from renderer.setAnimationLoop callback (time param). Use clock or the time param. timeMS param: delta = (time - last)/1000, clamp to 1/30.

paused: default false; render always; step only if !paused.

Expose __sim = { balls, step, paused } — paused must reflect live. Use an object whose paused property is read each frame: sim.paused. The loop checks sim.paused.

Materials: MeshStandardMaterial with varied colors. Lights: AmbientLight + DirectionalLight.

Edges: LineSegments with EdgesGeometry(BoxGeometry(10,10,10)).

Write full file.