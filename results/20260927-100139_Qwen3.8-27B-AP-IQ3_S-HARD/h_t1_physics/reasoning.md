Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions.

Key requirements:
1. Box from -5 to +5 on every axis, with visible edges
2. 20 balls, radius 0.4, masses random 1..3 (at least two different masses)
3. Non-overlapping start positions fully inside the box
4. Random velocities, speed 2..4 units/s
5. Perfectly elastic collisions (walls and ball-to-ball) using masses
6. Balls never leave box, never stay overlapping (separate overlapping pairs)
7. Each ball as Mesh with SphereGeometry + MeshStandardMaterial
8. AmbientLight + DirectionalLight
9. Expose __sim = { balls, step, paused }
10. balls is array of { x, y, z, vx, vy, vz, r, m }
11. step(dt) uses substeps
12. paused: when true, render but don't step
13. Render loop clamps delta to 1/30
14. Camera sees whole box
15. Use THREE from 'three', renderer.setAnimationLoop
16. Expose __scene, __camera, __renderer, __ready
17. No external assets
18. Handle resize

Let me think about the physics:

Wall collisions: If ball position + radius > 5, reflect velocity component and clamp position. Same for -5 side.

Ball-ball collisions: 
- Detect if distance between centers < r1 + r2
- Separate: push them apart along the collision normal
- Elastic collision with masses:
  - Relative velocity along normal
  - Apply impulse formula for 1D elastic collision extended to 3D

For the elastic collision formula:
- Normal n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- Velocity along normal: vrel_n = dot(vrel, n)
- If vrel_n > 0, they're already separating, skip
- Impulse j = (1 + e) * vrel_n / (1/m1 + 1/m2), where e=1 for perfectly elastic
- v1 -= (j/m1) * n
- v2 += (j/m2) * n

Wait, let me be more careful. The standard elastic collision:
- n = (p2 - p1) / |p2 - p1|
- vrel = v1 - v2
- vrel_n = dot(vrel, n)
- If vrel_n <= 0: already separating, skip
- j = 2 * vrel_n / (1/m1 + 1/m2)  [for e=1]
- Actually: j = (1+e) * vrel_n / (1/m1 + 1/m2), e=1 → j = 2*vrel_n/(1/m1+1/m2)
- v1 -= (j/m1) * n
- v2 += (j/m2) * n

Let me verify: for equal masses, v1_new = v1 - vrel_n*n, v2_new = v2 + vrel_n*n. That's correct for 1D elastic.

For separation: if distance < r1 + r2, push them apart. Total overlap = (r1+r2) - dist. Push each by overlap * (other mass / total mass) in opposite directions? Or just split evenly? For stability, let's push each by overlap/2 along the normal (or weighted by inverse mass).

Actually for separation, a common approach:
- overlap = (r1 + r2) - dist
- push each by overlap/2 along normal (or weighted by 1/m)

Let me use mass-weighted separation for correctness:
- push1 = overlap * m2/(m1+m2) in direction of n
- push2 = overlap * m1/(m1+m2) in direction of -n

This way lighter balls get pushed more.

Substeps: divide dt into substeps of maybe 1/120 or smaller. Let's use a fixed substep count, say 4 substeps per step call, or compute based on max speed.

Actually, let me use a fixed number of substeps, say 4-8, to keep things stable. With 20 balls of radius 0.4 in a 10x10x10 box, speeds of 2-4, a substep of dt/4 should be fine.

Let me think about non-overlapping start positions. With radius 0.4, diameter 0.8. 20 balls in a 10x10x10 box. I'll use rejection sampling: try random positions, check against all existing balls (distance > 0.8), and check they're within [-5+0.4, 5-0.4] = [-4.6, 4.6].

Let me also think about the rendering. Each ball gets its own Mesh. I'll create them once and update positions each frame.

Let me structure the code:

```typescript
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 7);
scene.add(dir);

// Box edges
const boxGeom = new THREE.BoxGeometry(10, 10, 10);
const edges = new THREE.EdgesGeometry(boxGeom);
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxLines = new THREE.LineSegments(edges, lineMat);
scene.add(boxLines);

// Balls
const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5, BOX_MAX = 5;

function randSpeed(): { vx: number; vy: number; vz: number } {
  // Random direction, speed 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2;
  return {
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi)
  };
}

const balls: Ball[] = [];
const sphereGeom = new THREE.SphereGeometry(RADIUS, 24, 24);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  // Generate non-overlapping position
  let x = 0, y = 0, z = 0;
  let valid = false;
  const maxTries = 1000;
  for (let t = 0; t < maxTries && !valid; t++) {
    x = BOX_MIN + RADIUS + Math.random() * (BOX_MAX - BOX_MIN - 2 * RADIUS);
    y = BOX_MIN + RADIUS + Math.random() * (BOX_MAX - BOX_MIN - 2 * RADIUS);
    z = BOX_MIN + RADIUS + Math.random() * (BOX_MAX - BOX_MIN - 2 * RADIUS);
    valid = true;
    for (let j = 0; j < balls.length; j++) {
      const dx = x - balls[j].x;
      const dy = y - balls[j].y;
      const dz = z - balls[j].z;
      if (dx*dx + dy*dy + dz*dz < (2*RADIUS) * (2*RADIUS)) {
        valid = false;
        break;
      }
    }
  }
  
  const { vx, vy, vz } = randSpeed();
  const m = 1 + Math.random() * 2; // 1..3
  
  const ball: Ball = { x, y, z, vx, vy, vz, r: RADIUS, m };
  balls.push(ball);
  
  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step
const SUBSTEPS = 8;

function step(dt: number): void {
  if (dt <= 0) return;
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate positions
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }
    
    // Wall collisions
    for (const b of balls) {
      const min = -BOX_MAX + b.r; // -5 + 0.4 = -4.6
      const max = BOX_MAX - b.r;  // 5 - 0.4 = 4.6
      if (b.x < min) { b.x = min; b.vx = Math.abs(b.vx); }
      if (b.x > max) { b.x = max; b.vx = -Math.abs(b.vx); }
      if (b.y < min) { b.y = min; b.vy = Math.abs(b.vy); }
      if (b.y > max) { b.y = max; b.vy = -Math.abs(b.vy); }
      if (b.z < min) { b.z = min; b.z = min; b.vz = Math.abs(b.vz); }
      if (b.z > max) { b.z = max; b.vz = -Math.abs(b.vz); }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx*dx + dy*dy + dz*dz;
        const minDist = a.r + b.r;
        
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist < 1e-8) continue;
          
          // Normal
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          
          // Separate
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          const pushA = overlap * (b.m / totalM);
          const pushB = overlap * (a.m / totalM);
          a.x -= nx * pushA;
          a.y -= ny * pushA;
          a.z -= nz * pushA;
          b.x += nx * pushB;
          b.y += ny * pushB;
          b.z += nz * pushB;
          
          // Elastic collision
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;
          
          if (dvDotN > 0) { // approaching
            const j = 2 * dvDotN / (1/a.m + 1/b.m);
            a.vx -= (j / a.m) * nx;
            a.vy -= (j / a.m) * ny;
            a.vz -= (j / a.m) * nz;
            b.vx += (j / b.m) * nx;
            b.vy += (j / b.m) * ny;
            b.vz += (j / b.m) * nz;
          }
        }
      }
    }
  }
}

// Sync meshes
function syncMeshes(): void {
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// Expose
let paused = false;
(window as any).__sim = { balls, step, paused: false };

// Hmm, the requirement says __sim = { balls, step, paused } and paused is a boolean.
// But if I set it as a plain object, changes to __sim.paused won't affect a local variable.
// Let me use a getter/setter or just check __sim.paused directly.

// Actually, let me re-read: "paused is a boolean: when __sim.paused is true the render loop must keep rendering but must NOT call step()"
// So I should check the object's paused property each frame.

const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  
  if (!sim.paused) {
    step(dt);
    syncMeshes();
  }
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I have a typo in the wall collision for z:
```
if (b.z < min) { b.z = min; b.z = min; b.vz = Math.abs(b.vz); }
```
Should be `b.z = min; b.vz = Math.abs(b.vz);`

Let me also reconsider the camera position. Box is 10x10x10. Camera at (0,0,15) should work. Actually let me put it a bit further back and slightly up for a better view. Maybe (0, 5, 14) looking at origin.

Actually (0, 0, 15) should show the whole box fine since the box extends to 5 in each direction and the camera is at 15.

Let me also think about the `__sim` object. The requirement says:
- balls is an array of plain objects { x, y, z, vx, vy, vz, r, m }
- step(dt: number) advances physics by dt seconds
- paused is a boolean

Since I'm checking `sim.paused` in the loop and `sim` is the same object as `__sim`, external code can set `__sim.paused = true` and the loop will respect it. Good.

Let me also make sure the `step` function is the one I defined. The balls array is the live state. Good.

Let me also consider: the requirement says "use substeps so it stays stable". I'm using 8 substeps. With speeds of 2-4 and radius 0.4, the minimum time to cross a radius is 0.4/4 = 0.1s. With dt clamped to 1/30 ≈ 0.033s, each substep is about 0.004s, and the ball moves at most 4*0.004 = 0.016 per substep, much less than the radius. Should be fine.

Let me finalize the code and make sure it compiles with strict TypeScript. I need to make sure all types are correct.

One issue: I'm using `let` for `x, y, z` in the ball spawning loop. With `--strict`, I need to make sure they're properly initialized. Let me use a different pattern.

Actually, I initialize them to 0 and then assign in the loop. But the `valid` flag pattern should work. Let me use a while loop or just ensure the values are assigned before use.

Let me restructure:

```typescript
let bx = 0, by = 0, bz = 0;
let placed = false;
for (let t = 0; t < maxTries && !placed; t++) {
  bx = ...;
  by = ...;
  bz = ...;
  // check
  placed = true;
  for (...) { if (overlap) { placed = false; break; } }
}
```

This should work with strict mode since bx, by, bz are initialized to 0 and then assigned before use.

Let me write the final clean version now.
