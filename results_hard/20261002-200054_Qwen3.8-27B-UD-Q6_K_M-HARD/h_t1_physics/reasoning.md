Three.js bouncing balls simulation. Let me write a complete TypeScript file.

Key requirements:
- Box -5..+5, EdgesGeometry visible
- 20 balls, r=0.4, masses random 1..3 (at least two different)
- Non-overlapping start positions, fully inside the box
- Velocity 2..4 units/sec
- Elastic collisions walls and ball-ball, substeps
- Separate overlapping pairs (positional correction)
- Meshes with SphereGeometry + MeshStandardMaterial, sync with physics
- AmbientLight + DirectionalLight
- __sim = { balls, step, paused }
- Render loop: step(clamped dt) unless paused
- Camera sees the whole box
- Resize handling, setAnimationLoop, __ready after first frame

Physics:
- Wall collision: if x - r < -5, clamp and reflect vx (also for other axes).
- Ball-ball: distance < r1+r2 → resolve. Normal n, relative velocity along n; if approaching, apply impulse: j = -(1+e) * relVel·n / (1/m1 + 1/m2), e=1. Positional correction: push apart proportional to inverse mass.

Substeps: e.g. N = Math.max(1, Math.ceil(dt / (1/120))), or fixed substep count. Use substeps to stay stable.

Non-overlapping start: try random positions, reject if overlapping existing balls.

Balls plain objects with x,y,z,vx,vy,vz,r,m. Mesh array synced by index.

Let me write.

Strict TS: type everything. Careful with (window as any).

Code:

```ts
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BOX_HALF = 5;
const BALL_R = 0.4;
const N = 20;

function rand(a: number, b: number): number { return a + Math.random() * (b - a); }

function makeBalls(): Ball[] {
  const balls: Ball[] = [];
  const limit = BOX_HALF - BALL_R;
  while (balls.length < N) {
    const x = rand(-limit, limit);
    const y = rand(-limit, limit);
    const z = rand(-limit, limit);
    let ok = true;
    for (const b of balls) {
      const dx = b.x - x, dy = b.y - y, dz = b.z - z;
      if (dx*dx + dy*dy + dz*dz < (BALL_R*2)**2) { ok = false; break; }
    }
    if (!ok) continue;
    const m = rand(1, 3);
    const theta = rand(0, Math.PI*2);
    const phi = Math.acos(rand(-1,1));
    const speed = rand(2,4);
    balls.push({
      x, y, z,
      vx: speed*Math.sin(phi)*Math.cos(theta),
      vy: speed*Math.sin(phi)*Math.sin(theta),
      vz: speed*Math.cos(phi),
      r: BALL_R, m
    });
  }
  return balls;
}

function stepPhysics(balls: Ball[], dt: number): void {
  const sub = Math.max(1, Math.ceil(dt / (1/240)));
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    // integrate
    for (const b of balls) {
      b.x += b.vx*h; b.y += b.vy*h; b.z += b.vz*h;
    }
    // walls
    for (const b of balls) {
      if (b.x - b.r < -BOX_HALF) { b.x = -BOX_HALF + b.r; b.vx = Math.abs(b.vx); }
      else if (b.x + b.r > BOX_HALF) { b.x = BOX_HALF - b.r; b.vx = -Math.abs(b.vx); }
      ... same for y, z
    }
    // pairs
    for (let i = 0; i < balls.length; i++) {
      for (let j = i+1; j < balls.length; j++) {
        const a = balls[i], c = balls[j];
        let dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
        let dist2 = dx*dx+dy*dy+dz*dz;
        const minD = a.r + c.r;
        if (dist2 < minD*minD) {
          let dist = Math.sqrt(dist2);
          if (dist < 1e-9) { dist = 1e-9; dx = 1; dy=0; dz=0; }
          const nx = dx/dist, ny = dy/dist, nz = dz/dist;
          // positional correction
          const overlap = minD - dist;
          const totalInv = 1/a.m + 1/c.m;
          a.x -= nx * overlap * (1/a.m)/totalInv;
          ...
          c.x += nx * overlap * (1/c.m)/totalInv;
          // impulse
          const rvx = c.vx - a.vx, rvy = ..., rvz = ...;
          const velN = rvx*nx + rvy*ny + rvz*nz;
          if (velN < 0) {
            const jimp = -2 * velN / totalInv;
            a.vx -= (jimp/a.m)*nx; ...
            c.vx += (jimp/c.m)*nx; ...
          }
        }
      }
    }
  }
}
```

Wait: elastic collision impulse formula for e=1: j = -(1+e) * velN / (1/ma + 1/mc) = -2*velN/totalInv. Then a.v -= (j/ma)*n, c.v += (j/mc)*n. Sign check: velN < 0 means approaching. j is positive. a receives -j*n... a moves away from c along -n: a.vx -= j/ma * nx. Correct.

Rendering: scene, camera at position looking at origin, e.g. (14, 10, 18) lookAt(0,0,0). Box edge lines. Lights.

Meshes: SphereGeometry(BALL_R, 24, 16) shared, materials distinct colors.

Sim object:
```ts
const sim = {
  balls,
  step: (dt: number) => stepPhysics(balls, dt),
  paused: false,
};
```

Render loop with clock; clamp dt to 1/30. After first render, set __ready.

Resize handler.

Let me write the full file.
