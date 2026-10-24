I need to write a TypeScript file. Careful: __sim.balls must be plain objects { x, y, z, vx, vy, vz, r, m } that step() updates — so the physics state must live directly on those objects, and meshes sync from them.

Physics: elastic collisions. Wall collision: reflect velocity component, position clamp inside. Ball-ball: equal masses formula generalized: along normal, v1' = v1 - (2 m2/(m1+m2)) * dot(v_rel, n) n, v2' = v2 + (2 m1/(m1+m2)) dot(v_rel,n) n (perfectly elastic). Also separate overlapping pairs.

Substeps: fixed substep like dt/4 or split so movement per substep < radius.

Positions: use plain objects, no THREE.Vector3 in state to keep numbers exact. Balls array typed as Ball[] where Ball is interface with numbers.

Camera at like (10, 8, 10) looking at origin; box diagonal ~ 8.66 half... fov 50, distance ~17 works. Let's use position (11, 9, 11), lookAt origin.

Write code:

interface BallState { x,y,z,vx,vy,vz,r,m: number }

step(dt): substeps n = Math.max(1, Math.ceil(dt / (r*0.5 / maxSpeed)))... simpler: fixed substeps = 8, h = dt/8. Each substep: integrate positions, wall collisions, pairwise collisions. With max speed maybe could grow? Elastic collisions preserve speeds (max speed = max initial speed ~4, but collision can give up to sum? For elastic, speed of one ball can change; max relative speed... a ball speed could increase up to roughly sum? Actually elastic collision between two: velocity component along normal exchanges scaled; a ball's speed can at most increase to something like |v1| + 2m2/(m1+m2)|v_rel|... could be up to ~ 2*max speed ~8. With h = dt/8 ≤ 1/240, movement 8/240 = 0.033 << 0.4 radius. Fine. Use substeps = 8.

Ball-ball collision resolution: if distance < r1+r2: separate positions by pushing apart along normal proportionally (or equally), then elastic impulse if approaching: vn = dot(v1-v2, n); if vn < 0 (approaching when n from ball1 to ball2? define n = (p2-p1)/d; relative velocity v_rel = v1 - v2; approaching if dot(v_rel, n) > 0). Let's do: n from 1 to 2. rel = v1 - v2. vn = rel·n. If vn > 0 (moving toward each other): impulse j = 2*vn/(m1+m2)... standard: v1 -= (2 m2/(m1+m2)) vn n; v2 += (2 m1/(m1+m2)) vn n. Conserves momentum and KE.

Positional separation: overlap = (r1+r2 - d); move each by overlap/2 * ±n (equal, regardless of mass, fine — "separate overlapping pairs").

Wall: for each axis, if pos - r < -5: pos = -5 + r, v = |v|; if pos + r > 5: pos = 5 - r, v = -|v|.

Start positions: non-overlapping sampling with rejection.

Meshes: SphereGeometry(0.4, 24, 16), MeshStandardMaterial with random color. Update mesh.position each frame from ball state.

Edges: LineSegments with EdgesGeometry(BoxGeometry(10,10,10)), positioned at origin. Box center at origin, -5..5.

Lights: AmbientLight(0xffffff, 0.5), DirectionalLight.

Render loop: delta from setAnimationLoop(timeMs) — use clock. Use THREE.Clock, delta = clock.getDelta(), clamp to 1/30. If !paused: step(delta). Sync meshes. Render. Set __ready = true after first render.

step signature: step(dt: number). Substeps inside.

Expose __sim = { balls, step, paused } — paused must be a mutable boolean; since object property, sim.paused = ... test can set it directly. Render loop reads sim.paused.

TypeScript strict: all fine.

Code:

```ts
import * as THREE from 'three';

interface BallState { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; m: number; }

const BOX = 5;
const R = 0.4;
const N = 20;

function makeBalls(): BallState[] {
  const balls: BallState[] = [];
  let guard = 0;
  while (balls.length < N && guard < 100000) {
    guard++;
    const x = -BOX + R + Math.random() * (2 * (BOX - R));
    ... y, z
    // check overlap against existing (with small epsilon)
    ...
    // velocity: random direction, speed 2..4
    const speed = 2 + Math.random()*2;
    const theta = Math.random()*Math.PI*2; const zphi = Math.random()*2-1;
    const s = Math.sqrt(1-zphi*zphi);
    vx = speed * s * Math.cos(theta); etc.
    m = 1 + Math.random()*2;
    balls.push({...});
  }
  return balls;
}
```

step function with substeps:

```ts
const SUB = 8;
function step(dt: number): void {
  const h = dt / SUB;
  for (let s = 0; s < SUB; s++) {
    for (const b of balls) {
      b.x += b.vx*h; b.y += b.vy*h; b.z += b.vz*h;
      // walls
      if (b.x - b.r < -BOX) { b.x = -BOX + b.r; b.vx = Math.abs(b.vx); }
      else if (b.x + b.r > BOX) { b.x = BOX - b.r; b.vx = -Math.abs(b.vx); }
      ... y, z
    }
    // pairs
    for (let i = 0; i < balls.length; i++) {
      for (let j = i+1; j < balls.length; j++) {
        const a = balls[i], c = balls[j];
        const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
        const d2 = dx*dx+dy*dy+dz*dz;
        const minD = a.r + c.r;
        if (d2 >= minD*minD || d2 === 0) { if d2===0 handle? unlikely; skip }
        const d = Math.sqrt(d2);
        const nx = dx/d, ny=dy/d, nz=dz/d;
        // separate
        const overlap = minD - d;
        const half = overlap/2;
        a.x -= nx*half; ... c.x += nx*half; ...
        // elastic impulse if approaching
        const rvx = a.vx - c.vx, ...;
        const vn = rvx*nx + rvy*ny + rvz*nz;
        if (vn > 0) {
          const f = 2*vn/(a.m + c.m);
          a.vx -= f*c.m*nx; ... c.vx += f*a.m*nx; ...
        }
      }
    }
  }
}
```

Note: positional separation before velocity check is fine.

Scene setup, camera, renderer, lights, edges, ball meshes array synced. Colors: use HSL random.

Resize handler. Animation loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  if (!sim.paused) sim.step(dt);
  for (let i=0;i<N;i++) meshes[i].position.set(balls[i].x, ...);
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Expose sim, scene, camera, renderer.

sim.paused initial false.

Make sure step updates balls array (same references). sim.balls = balls.

Write final code.