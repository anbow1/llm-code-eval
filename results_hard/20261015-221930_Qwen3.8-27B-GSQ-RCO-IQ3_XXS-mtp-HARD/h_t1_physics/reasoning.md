Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions.

Key requirements:
1. Three.js scene with a box (edges visible)
2. 20 balls, radius 0.4, masses random 1..3
3. Non-overlapping start positions, fully inside box
4. Random velocities, speed 2..4 units/s
5. Perfectly elastic collisions (walls and ball-ball)
6. Substeps for stability
7. MeshStandardMaterial for balls, AmbientLight + DirectionalLight
8. Expose __sim = { balls, step, paused }
9. paused = true means render but don't step
10. Camera sees whole box
11. Clamp dt to 1/30
12. Expose __scene, __camera, __renderer
13. Set __ready after first frame
14. Resize handling
15. setAnimationLoop

Let me think about the physics:

- Box: -5 to +5 on every axis
- Ball radius: 0.4
- Ball center must be between -5+0.4 = -4.6 and 5-0.4 = 4.6

Wall collision: if ball.x - r < -5, reflect vx and set x = -5 + r. Same for all axes.

Ball-ball elastic collision:
- For two balls with masses m1, m2, velocities v1, v2:
- v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2) / |x1-x2|^2 * (x1-x2)
- v2' = v2 + (2*m1/(m1+m2)) * dot(v1-v2, x1-x2) / |x1-x2|^2 * (x1-x2)

Actually the standard formula:
- Let n = (x1 - x2) / |x1 - x2| (normal from 2 to 1)
- Relative velocity: vrel = v1 - v2
- j = (2 * dot(vrel, n)) / (1/m1 + 1/m2)
- v1' = v1 - (j/m1) * n
- v2' = v2 + (j/m2) * n

Wait, let me be more careful. For elastic collision:
- n = (r1 - r2) / |r1 - r2|
- vrel = v1 - v2
- vn = dot(vrel, n)
- If vn > 0, they're moving apart, no collision
- j = (2 * vn) / (1/m1 + 1/m2)
- v1' = v1 - (j/m1) * n
- v2' = v2 + (j/m2) * n

This conserves momentum: m1*v1' + m2*v2' = m1*v1 - j*n + m2*v2 + j*n = m1*v1 + m2*v2 ✓
This conserves KE for elastic collision ✓

Substeps: I'll use multiple substeps. Maybe 4-8 substeps per frame for stability.

Position separation: if balls overlap, push them apart along the normal.

Let me think about the structure:

```typescript
import * as THREE from 'three';

// Scene setup
// Box edges
// Lights
// Balls creation
// Physics step function
// Render loop
```

For non-overlapping start positions: I'll use a rejection sampling approach. Place balls one by one, reject if within 2*r of any existing ball.

Let me code this up:

```typescript
import * as THREE from 'three';

const BOX_MIN = -5;
const BOX_MAX = 5;
const R = 0.4;
const NUM_BALLS = 20;
const INNER_MIN = BOX_MIN + R; // -4.6
const INNER_MAX = BOX_MAX - R; // 4.6

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// Create balls
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  let attempts = 0;
  while (balls.length < NUM_BALLS && attempts < 100000) {
    attempts++;
    const x = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    const y = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    const z = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    
    let valid = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      if (dx*dx + dy*dy + dz*dz < (2*R)*(2*R)) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    
    const speed = 2 + Math.random() * 2; // 2..4
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);
    
    const m = 1 + Math.random() * 2; // 1..3
    
    balls.push({ x, y, z, vx, vy, vz, r: R, m });
  }
  return balls;
}
```

For the step function with substeps:

```typescript
function step(dt: number): void {
  const substeps = 8;
  const sdt = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    // Move
    for (const b of balls) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.z += b.vz * sdt;
    }
    // Wall collisions
    for (const b of balls) {
      if (b.x - b.r < BOX_MIN) { b.x = BOX_MIN + b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > BOX_MAX) { b.x = BOX_MAX - b.r; b.vx = -Math.abs(b.vx); }
      // same for y, z
    }
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        const distSq = dx*dx + dy*dy + dz*dz;
        const minDist = a.r + b.r;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 1e-8) continue;
          const nx = dx / dist, ny = dy / dist, nz = dz / dist;
          
          // Separate
          const overlap = minDist - dist;
          a.x += nx * overlap / 2;
          a.y += ny * overlap / 2;
          a.z += nz * overlap / 2;
          b.x -= nx * overlap / 2;
          b.y -= ny * overlap / 2;
          b.z -= nz * overlap / 2;
          
          // Elastic collision
          const dvx = a.vx - b.vx, dvy = a.vy - b.vy, dvz = a.vz - b.vz;
          const vn = dvx * nx + dvy * ny + dvz * nz;
          if (vn > 0) {
            const j_imp = 2 * vn / (1/a.m + 1/b.m);
            a.vx -= (j_imp / a.m) * nx;
            a.vy -= (j_imp / a.m) * ny;
            a.vz -= (j_imp / a.m) * nz;
            b.vx += (j_imp / b.m) * nx;
            b.vy += (j_imp / b.m) * ny;
            b.vz += (j_imp / b.m) * nz;
          }
        }
      }
    }
  }
}
```

Now for the Three.js setup, I need to be careful with strict TypeScript. Let me write the full file.

One concern: the `step` function needs to be exposed and it operates on the `balls` array. I'll keep balls as a plain array and the meshes reference them by index.

Let me also make sure the camera is positioned to see the whole box. The box is 10 units wide. I'll put the camera at something like (12, 10, 12) looking at origin, or maybe (15, 12, 15). Let me use a perspective camera with fov 50 and position at (12, 10, 15) looking at (0,0,0). Actually let me calculate: the box goes from -5 to 5, so it's 10 units. With fov 50, to see the full box from the corner, I need to be at roughly distance where the diagonal (10*sqrt(3) ≈ 17.3) fits. Let me just put camera at (14, 12, 14) looking at origin. That should work.

Actually, let me use a simpler approach: camera at (0, 0, 20) looking at origin with fov 60. That gives a nice frontal view. But the box is 10 wide and 10 tall, so at distance 20 with fov 60, the visible width is 2*20*tan(30°) ≈ 23, which is more than enough.

Hmm, but a 3D view is nicer. Let me go with (15, 12, 15) looking at origin, fov 50.

Let me finalize the code now.
