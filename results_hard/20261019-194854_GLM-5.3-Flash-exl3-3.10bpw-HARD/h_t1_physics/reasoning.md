Standard elastic collision physics. Write single TS file.

Physics details:
- Wall collisions: reflect velocity component, elastic, mass-independent (wall infinite mass). Position clamp to keep inside.
- Ball-ball elastic collision: normal n, relative velocity along normal; if approaching, impulse j = -(1+e) * vRel·n / (1/m1 + 1/m2), e=1. Separate overlap by pushing apart proportional to inverse mass.

Substeps: fixed dt substeps, e.g. substep of 1/240 or split dt into N = ceil(dt/0.005).

Expose balls as plain objects, step updates them directly. Render meshes synced from balls each frame.

Camera: position like (10, 8, 12), lookAt origin.

Code:

```ts
import * as THREE from 'three';

const BOX = 5;
const N = 20;
const R = 0.4;

interface Ball { x:number; y:number; z:number; vx:number; vy:number; vz:number; r:number; m:number; }
```

Non-overlap start: grid placement 20 balls in e.g. 3x3x3 = 27 slots, pick 20. Grid spacing: box from -5 to 5, use slots at -3.3, 0, 3.3? Need ball fully inside with r=0.4: |coord| <= 4.6. Use grid positions from -4 to 4 step 4: that's 3 per axis = 27, spacing 4 > 0.8, fine. Positions: -4, 0, 4 → |4| <= 4.6 ok. Shuffle, take 20.

Velocities random direction, speed 2..4.

step(dt): substeps: const steps = Math.max(1, Math.ceil(dt / (1/240))); const h = dt/steps; loop: integrate positions, resolve wall, resolve ball collisions.

Ball-ball: for i<j, dist < 2r → resolve. Elastic: compute normal, overlap separation: move each by overlap * (invM / (invM1+invM2)) along normal. Impulse only if approaching (vRel·n < 0): j = -2*(vRel·n)/(invM1+invM2)... with e=1: j = -(1+e)*vn/(invSum) = -2*vn/(invSum). Apply: v1 += j*invM1*n? Sign conventions: n from i to j. vn = (vj - vi)·n. If vn < 0 approaching. j = -(1+e)*vn/(invMi+invMj); vi -= j*invMi*n; vj += j*invMj*n. Wait check: impulse on j is +j*n, on i is -j*n. With vn<0, j>0. vj += j*invMj*n → increases vn toward 0... vn' = vn + j*(invMj+invMi) = vn - (1+e)*vn = -e*vn. Good.

Wall: if x - r < -BOX: x = -BOX + r; if vx < 0 vx = -vx. Similarly others.

Meshes: SphereGeometry(0.4, 24, 16), MeshStandardMaterial with random-ish colors. Sync position each frame.

Renderer, scene, camera PerspectiveCamera fov 50, aspect, near 0.1 far 100, position (12, 9, 12) lookAt(0,0,0).

Lights: AmbientLight(0xffffff, 0.4), DirectionalLight(0xffffff, 1) at (10,15,8).

Edges: BoxGeometry(10,10,10), EdgesGeometry, LineSegments with LineBasicMaterial.

Animation loop: clock delta clamp to 1/30, if !paused step(delta). Set __ready after first frame.

window assignments typed as any casts.

Compile strict: fine.

Write it.