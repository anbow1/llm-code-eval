Need to write a single TypeScript file. Key details:

- 20 balls, radius 0.4, masses random 1..3.
- Elastic collisions with walls and between balls, conserve momentum/KE.
- step(dt) advances physics with substeps.
- Expose __sim with balls as plain objects (live state), step, paused.
- Meshes synced with physics.
- EdgesGeometry for box.
- No gravity.
- Clamp delta to 1/30.
- __ready after first frame.
- tsc strict compile: need DOM lib types; window, document fine. `import * as THREE from 'three'` — fine with node module resolution assumption.

Physics: ball-ball collision resolution: along normal, relative velocity; impulse j = -(1+e) * relVel·n / (1/m1 + 1/m2), with e=1. Positional separation: move each ball along normal proportional to inverse mass.

Wall collision: if x - r < -5, set x = -5 + r, vx = -vx (or reflect with elastic: vx = -vx). Since perfectly elastic and wall infinite mass: v component flips.

Substeps: choose substeps so max movement per substep is small. e.g., dt/ceil(dt / (1/240)) or fixed number like 8. Let's do: substeps = Math.ceil(dt / 0.002) capped, or simpler: fixed substeps = 10 per step call. With dt clamped 1/30, substep = 1/300 s. Speed max ~4 => movement 0.013 per substep, fine. But user may call step(dt) with larger dt; use adaptive: substeps = Math.max(1, Math.ceil(dt / (1/240))). Also cap substeps maybe 120? For dt=1, 240 substeps fine.

Also handle overlapping pairs: after collision resolution, separate positions.

Also positional correction to prevent tunneling: after each substep, if ball outside box, clamp and reflect.

Ball start positions non-overlapping: rejection sampling — random positions in [-5+r+margin, 5-r-margin], check distance between centers > 2*r.

Plain object balls: {x,y,z,vx,vy,vz,r,m}. Meshes created separately, updated each frame from balls.

Render loop: renderer.setAnimationLoop((time) => ...) — time in ms. Better track previous time. Use clock: THREE.Clock. delta = clock.getDelta(), clamp to 1/30. If not paused, sim.step(delta). Then sync meshes. First frame sets __ready = true.

Handle resize.

Camera: perspective, position e.g. (10, 10, 14), lookAt origin; ensure whole box visible. fov 50, distance ~ sqrt(300)... fine.

Code:

```ts
import * as THREE from 'three';

const BOX_HALF = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const balls: BallState[] = [];

function randRange(min: number, max: number): number { return min + Math.random() * (max - min); }

// non-overlapping placement
const minDist = 2 * BALL_RADIUS * 1.05;
const lim = BOX_HALF - BALL_RADIUS - 0.1;
while (balls.length < NUM_BALLS) {
  const x = randRange(-lim, lim), y = ..., z = ...;
  let ok = true;
  for (const b of balls) {
    const dx = ..., etc; if (dist < minDist) { ok = false; break; }
  }
  if (!ok) continue;
  // velocity
  const speed = randRange(2, 4);
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(randRange(-1, 1));
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  ...
  balls.push({x,y,z,vx,vy,vz,r: BALL_RADIUS, m: randRange(1,3)});
}
```

step function:

```ts
function step(dt: number): void {
  const sub = Math.max(1, Math.min(240, Math.ceil(dt / (1/240))));
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    // integrate
    for (const b of balls) {
      b.x += b.vx * h; ...
    }
    // wall collisions
    for (const b of balls) {
      if (b.x - b.r < -BOX_HALF && b.vx < 0) { b.x = -BOX_HALF + b.r; b.vx = -b.vx; }
      else if (b.x + b.r > BOX_HALF && b.vx > 0) { b.x = BOX_HALF - b.r; b.vx = -b.vx; }
      ... y, z
      // safety clamp
      b.x = Math.max(-BOX_HALF + b.r, Math.min(BOX_HALF - b.r, b.x));
    }
    // ball-ball
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], c = balls[j];
        const dx = c.x - a.x, dy = ..., dz = ...;
        const distSq = dx*dx+dy*dy+dz*dz;
        const minD = a.r + c.r;
        if (distSq >= minD*minD || distSq === 0) continue;
        const dist = Math.sqrt(distSq);
        const nx = dx/dist, ny=..., nz=...;
        // impulse
        const rvn = (c.vx - a.vx)*nx + (c.vy - a.vy)*ny + (c.vz - a.vz)*nz;
        if (rvn < 0) {
          const invA = 1/a.m, invC = 1/c.m;
          const jImp = -(2 * rvn) / (invA + invC); // e=1: -(1+e)*rvn/(sum) = -2*rvn/(sum)
          a.vx -= jImp * invA * nx; ... actually impulse applied: a.v -= j*invA*n? Standard: va += -j*invA*n, vc += j*invC*n where j = -(1+e)*rvn/(invA+invC). Check sign: rvn<0 approaching. j = -(1+e)*rvn/(invA+invC) > 0. va -= j*invA*n? Let's derive: impulse along n from a to c... relative velocity rv = vc - va. impulse J on c: vc += J*invC*n; on a: va -= J*invA*n. New rvn' = rvn + J*(invC+invA)*n·n = rvn + J*(invA+invC). Want rvn' = -rvn (e=1): J = -2*rvn/(invA+invC) > 0. Good.
        }
        // separate
        const overlap = minD - dist;
        const invSum = 1/a.m + 1/c.m;
        a.x -= nx * overlap * (1/a.m) / invSum; ...
        c.x += nx * overlap * (1/c.m) / invSum; ...
      }
    }
  }
}
```

Also after separation, ensure balls still inside box — clamp again at end of substep.

Scene setup: renderer with antialias, setPixelRatio maybe. Scene background color. Camera PerspectiveCamera(50, aspect, 0.1, 200), position (9, 8, 12), lookAt(0,0,0). Actually ensure whole box visible: distance sqrt(9*3)=~... position (10,9,11) length ~ sqrt(100+81+121)=17.3; box half diag = 5*sqrt3 ≈ 8.66; fov 50 → visible half-angle 25°, at distance 17.3 → radius 17.3*tan(25°)=8.07 — slightly less than 8.66. Use fov 55 or position (12,10,13): length sqrt(144+100+169)=19.3 → radius 19.3*tan(27.5)=10.05 > 8.66. Good. Use fov 55, position (12,10,13).

Lights: AmbientLight(0xffffff, 0.4), DirectionalLight(0xffffff, 1) at (10, 15, 8).

Box edges: BoxGeometry(10,10,10), EdgesGeometry, LineSegments with LineBasicMaterial color 0xffffff.

Also maybe add slightly transparent box faces? Not required. Keep just edges.

Meshes: SphereGeometry(0.4, 24, 16), MeshStandardMaterial with random-ish colors from palette (no external). Colors via Color().setHSL.

Sync: mesh.position.set(b.x,b.y,b.z).

__sim = { balls, step, paused: false }.

Render loop:

```ts
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1/30);
  if (!paused) step(delta);
  sync meshes;
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

paused variable referenced by __sim.paused; expose object referencing same variable — use getter? __sim.paused boolean must reflect current value; assign (window as any).__sim = { balls, step, paused: false } — if tester sets __sim.paused = true, the render loop must check that. So check via sim object. Keep reference:

```ts
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
```
And in loop: if (!sim.paused) step(delta). Good — tester mutates sim.paused.

Resize handler.

TypeScript strict: window as any casts fine. Ensure no unused variables. clock delta first frame fine.

Write final code.