Let me write the TypeScript file. Key details:

- Balls array of plain objects with x,y,z,vx,vy,vz,r,m.
- step(dt) with substeps.
- Elastic collisions with walls (reflect velocity), ball-ball elastic collision with masses.
- Separate overlapping pairs.
- Meshes synced.
- Expose __scene, __camera, __renderer, __sim, __ready after first frame.

Physics step: substeps, e.g. fixed substep of 1/120 or compute nSub = ceil(dt / (1/240)). Ball-ball collision: relative velocity along normal; impulse j = -(1+e) * velAlongNormal / (1/m1 + 1/m2), e=1. Positional correction: separate by half each based on overlap.

Wall: if x - r < -5 => x = -5 + r, vx = -vx if vx < 0. Also clamp velocity magnitude maybe to avoid explosion. Elastic so energy conserved; numerical drift could add energy; clamp max speed maybe (e.g., 12). Fine.

Start positions: non-overlapping, fully inside: sample random positions with min distance 2*r = 0.8, use rejection with retry.

Camera: perspective at position (10, 10, 12) looking at origin, distance ~ sqrt(300) ≈ 17.3, box half-diagonal sqrt(3)*5 ≈ 8.66, fov 50 works.

Write code.

Substeps: h = dt / n. n = Math.ceil(dt / 0.004) clamped maybe; use max substep 1/120 → n = Math.max(1, Math.ceil(dt / (1/120))).

Ball-ball broadphase: O(n²) with n=20 fine.

step signature: step(dt: number) => void. Internal function doStep(h).

Also handle paused toggle via sim.paused.

Code:

```ts
import * as THREE from 'three';

const BOX = 5;
const R = 0.4;
const NUM = 20;

interface Ball { x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;m:number; }

const balls: Ball[] = [];
function rand(a:number,b:number){return a + Math.random()*(b-a);}

// positions
const minDist = 2*R + 0.05;
let guard = 0;
while (balls.length < NUM && guard < 100000) {
  guard++;
  const x = rand(-BOX+R+0.1, BOX-R-0.1);
  ... check overlap with existing
}
// velocities
speed rand(2,4), random direction.
mass rand(1,3).
```

Collision resolution:

```ts
function step(dt:number){
  const n = Math.max(1, Math.ceil(dt / (1/120)));
  const h = dt / n;
  for (let s=0;s<n;s++){
    for (const b of balls){
      b.x += b.vx*h; b.y += b.vy*h; b.z += b.vz*h;
    }
    // walls
    for (const b of balls){
      if (b.x - b.r < -BOX){ b.x = -BOX + b.r; if (b.vx<0) b.vx = -b.vx; }
      if (b.x + b.r > BOX){ b.x = BOX - b.r; if (b.vx>0) b.vx = -b.vx; }
      ... y,z
    }
    // pairs
    for (let i=0;i<NUM;i++) for (let j=i+1;j<NUM;j++){
      const a=balls[i], c=balls[j];
      let dx=c.x-a.x, dy=c.y-a.y, dz=c.z-a.z;
      const distSq = dx*dx+dy*dy+dz*dz;
      const minD = a.r+c.r;
      if (distSq >= minD*minD || distSq === 0) { if (distSq===0) { nudge } continue; }
      const dist = Math.sqrt(distSq);
      const nx=dx/dist, ny=dy/dist, nz=dz/dist;
      // separate
      const overlap = minD - dist;
      const totalM = a.m + c.m;
      const wa = c.m/totalM, wc = a.m/totalM;
      a.x -= nx*overlap*wa; ...
      c.x += nx*overlap*wc; ...
      // impulse
      const rvx=c.vx-a.vx, ...
      const vn = rvx*nx+rvy*ny+rvz*nz;
      if (vn < 0){
        const jimp = -(2*vn)/(1/a.m + 1/c.m);
        a.vx -= jimp*nx/a.m; ...
        c.vx += jimp*nx/c.m; ...
      }
    }
  }
}
```

Note jimp = -(1+e)*vn / (1/m1+1/m2), e=1 → -2*vn/(...).

Clamp speed: max speed say 10 (initial max 4, elastic preserves; drift might increase slightly). Add clamp per ball after step: cap at say 8? Could alter energy but safe. I'll clamp at 10.

Edge case distSq === 0: give tiny separation nudge.

Renderer, scene, camera, lights, box edges, spheres. Sync meshes each frame.

Ready flag: in animation loop, after renderer.render, set __ready = true once.

Resize handler.

Write full code.