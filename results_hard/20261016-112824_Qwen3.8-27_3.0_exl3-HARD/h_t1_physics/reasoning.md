Let me carefully design this TypeScript file for a 20-ball bouncing simulation inside a box.

Key requirements:
1. Box from -5 to +5 on every axis, drawn with LineSegments + EdgesGeometry
2. 20 balls, radius 0.4, mass random 1..3 (at least two different masses)
3. Start positions non-overlapping, fully inside box
4. Start velocities random, speed ~2..4 units/s
5. Perfectly elastic collisions (walls AND balls), conserve momentum and KE
6. Balls never leave box, never stay overlapping
7. Each ball: Mesh with SphereGeometry + MeshStandardMaterial
8. AmbientLight + DirectionalLight
9. Expose __sim = { balls, step, paused }
10. balls is array of plain objects { x, y, z, vx, vy, vz, r, m }
11. step(dt) advances physics with substeps
12. paused: when true, render but don't call step()
13. Render loop calls step() with frame delta clamped to 1/30s
14. Camera positioned so whole box is visible
15. Expose __scene, __camera, __renderer
16. After first frame: __ready = true
17. Handle window resize
18. Use renderer.setAnimationLoop
19. No external assets

Let me think about the physics:

**Wall collisions:**
- If ball.x - r < -5: ball.x = -5 + r, ball.vx = -ball.vx
- If ball.x + r > 5: ball.x = 5 - r, ball.vx = -ball.vx
- Same for y and z

**Ball-ball elastic collision:**
For two balls with masses m1, m2, velocities v1, v2:
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity along normal: vRel = (v1 - v2) · n
- If vRel > 0 (approaching), apply impulse:
  - j = 2 * vRel / (1/m1 + 1/m2)
  - v1 -= (j/m1) * n
  - v2 += (j/m2) * n

Wait, let me be more careful. The standard elastic collision formula:

For 1D elastic collision:
v1' = (m1 - m2)/(m1 + m2) * v1 + 2*m2/(m1 + m2) * v2
v2' = 2*m1/(m1 + m2) * v1 + (m2 - m1)/(m1 + m2) * v2

In 3D, we only apply this along the collision normal.

Let me use the impulse-based approach:
- n = normalize(p2 - p1)
- vRel = dot(v1 - v2, n)
- If vRel > 0 (they're approaching):
  - impulse scalar: j = (1 + e) * vRel / (1/m1 + 1/m2), where e = 1 for perfectly elastic
  - v1 -= (j/m1) * n
  - v2 += (j/m2) * n

Wait, let me reconsider. If n points from ball1 to ball2, then:
- vRel = dot(v1 - v2, n) — if this is positive, ball1 is moving toward ball2 relative to ball2
- Actually, let me think again. If n = (p2 - p1)/|p2-p1|, then the relative velocity along n is (v1 - v2)·n. If this is positive, ball 1 is moving in the direction of ball 2 relative to ball 2, meaning they're approaching.

For perfectly elastic (e=1):
j = 2 * (v1 - v2)·n / (1/m1 + 1/m2)
v1 -= (j/m1) * n
v2 += (j/m2) * n

Let me verify: In 1D, if m1=m2, v1=1, v2=0:
j = 2*(1-0)/(1+1) = 1
v1' = 1 - 1*1 = 0
v2' = 0 + 1*1 = 1
Correct! They swap velocities.

If m1=2, m2=1, v1=1, v2=0:
j = 2*(1-0)/(1/2+1) = 2/(1.5) = 4/3
v1' = 1 - (4/3)/2 = 1 - 2/3 = 1/3
v2' = 0 + (4/3)/1 = 4/3

Check KE: 0.5*2*1 + 0 = 1; 0.5*2*(1/9) + 0.5*1*(16/9) = 1/9 + 8/9 = 1 ✓
Check momentum: 2*1 = 2; 2*(1/3) + 1*(4/3) = 2/3 + 4/3 = 2 ✓

Great, the formula works.

**Separation of overlapping balls:**
After collision resolution, if balls are still overlapping (distance < r1 + r2), push them apart along the normal.

**Substeps:**
I'll use multiple substeps for stability. Let's say substep count based on dt, or a fixed number like 4-8 substeps.

**Initial positions:**
Place 20 balls of radius 0.4 inside a box from -5 to +5. The available space for centers is from -4.6 to +4.6 (since radius is 0.4). I'll use a grid-like approach with some randomness to ensure no overlaps.

Grid: if I divide the space into cells, with 20 balls in a ~9.2 unit cube, I can use a 3x3x3 grid (27 cells) and pick 20 of them, adding small random offsets.

Actually, let me use a simpler approach: try random placement, reject if overlapping. With 20 balls of radius 0.4 in a 10-unit cube, there's plenty of space.

Each ball center must be in [-4.6, 4.6] on each axis. Distance between any two centers must be >= 0.8.

Let me use a rejection sampling approach with a max attempts limit, falling back to a grid if needed.

Actually, a 3x3x3 grid of cells (each cell ~3.06 units wide) with balls in the center of 20 of the 27 cells would work perfectly. Let me do that with small random perturbations.

Grid spacing: 9.2 / 2 = 4.6 per half, so cells at -4.6, 0, 4.6 → spacing of 4.6. That's way more than 0.8, so no overlap.

Actually let me just do:
- 3x3x3 grid, positions at -4.6, 0, 4.6 on each axis
- Pick 20 of the 27 positions
- Add small random offset (±0.5) to make it look natural

**Rendering:**
- SphereGeometry(0.4, 32, 32)
- MeshStandardMaterial with random colors
- EdgesGeometry(BoxGeometry(10, 10, 10)) → LineSegments

**Camera:**
Position it at something like (15, 15, 15) looking at origin, or (0, 0, 20) looking at origin. Let me use a perspective camera at (12, 12, 12) looking at (0,0,0).

Let me write the code now.

```typescript
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Box edges
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// Ball data
interface BallData {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BALL_COUNT = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

// Generate initial positions using grid + perturbation
function generateBalls(): BallData[] {
  const balls: BallData[] = [];
  const gridPositions: [number, number, number][] = [];
  const gridVals = [-4.6, 0, 4.6];
  for (const x of gridVals)
    for (const y of gridVals)
      for (const z of gridVals)
        gridPositions.push([x, y, z]);
  
  // Shuffle and pick 20
  for (let i = gridPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
  }
  
  for (let i = 0; i < BALL_COUNT; i++) {
    const [gx, gy, gz] = gridPositions[i];
    const px = gx + (Math.random() - 0.5) * 1.0;
    const py = gy + (Math.random() - 0.5) * 1.0;
    const pz = gz + (Math.random() - 0.5) * 1.0;
    
    // Clamp to box
    const cx = Math.max(BOX_MIN + RADIUS, Math.min(BOX_MAX - RADIUS, px));
    const cy = Math.max(BOX_MIN + RADIUS, Math.min(BOX_MAX - RADIUS, py));
    const cz = Math.max(BOX_MIN + RADIUS, Math.min(BOX_MAX - RADIUS, pz));
    
    // Random velocity, speed 2..4
    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);
    
    const m = 1 + Math.random() * 2; // 1..3
    
    balls.push({ x: cx, y: cy, z: cz, vx, vy, vz, r: RADIUS, m });
  }
  
  return balls;
}

const balls = generateBalls();

// Create meshes
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 32, 32);
const ballMeshes: THREE.Mesh[] = [];

for (let i = 0; i < balls.length; i++) {
  const color = new THREE.Color().setHSL(i / BALL_COUNT, 0.8, 0.5);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Physics step
function step(dt: number): void {
  const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const subDt = dt / substeps;
  
  for (let s = 0; s < substeps; s++) {
    // Move balls
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }
    
    // Wall collisions
    for (const b of balls) {
      if (b.x - b.r < BOX_MIN) { b.x = BOX_MIN + b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > BOX_MAX) { b.x = BOX_MAX - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < BOX_MIN) { b.y = BOX_MIN + b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > BOX_MAX) { b.y = BOX_MAX - b.r; b.vy = -Math.abs(b.vy); }
      if (b.z - b.r < BOX_MIN) { b.z = BOX_MIN + b.r; b.vz = Math.abs(b.vz); }
      if (b.z + b.r > BOX_MAX) { b.z = BOX_MAX - b.r; b.vz = -Math.abs(b.vz); }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        
        if (distSq < minDist * minDist && distSq > 1e-12) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          
          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x -= nx * overlap * (b.m / totalMass);
          a.y -= ny * overlap * (b.m / totalMass);
          a.z -= nz * overlap * (b.m / totalMass);
          b.x += nx * overlap * (a.m / totalMass);
          b.y += ny * overlap * (a.m / totalMass);
          b.z += nz * overlap * (a.m / totalMass);
          
          // Elastic collision
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvDotN = dvx * nx + dvy * ny + dvz * nz;
          
          if (dvDotN > 0) { // approaching
            const impulse = 2 * dvDotN / (1 / a.m + 1 / b.m);
            a.vx -= (impulse / a.m) * nx;
            a.vy -= (impulse / a.m) * ny;
            a.vz -= (impulse / a.m) * nz;
            b.vx += (impulse / b.m) * nx;
            b.vy += (impulse / b.m) * ny;
            b.vz += (impulse / b.m) * nz;
          }
        }
      }
    }
  }
}

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let lastTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  if (lastTime === 0) lastTime = time;
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  
  if (dt > 1 / 30) dt = 1 / 30;
  
  const sim = (window as any).__sim as { balls: BallData[]; step: (dt: number) => void; paused: boolean };
  
  if (!sim.paused) {
    sim.step(dt);
  }
  
  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to double-check the `tsc --strict` compatibility. Let me review:
- All variables are typed
- No implicit any
- The `sim` access through `(window as any)` is fine
- The `BallData` interface is defined
- All callbacks are properly typed

One issue: `renderer.setAnimationLoop((time: number) => {...})` — the callback parameter is `number` in Three.js. Let me check... Actually in Three.js, `setAnimationLoop` takes a callback with a `time` parameter of type `number`. That should be fine.

Let me also make sure the `step` function is properly typed when exposed. The `__sim` object has `step` which is the function I defined. Since I'm assigning it to `(window as any).__sim`, TypeScript won't complain.

Actually, I realize I should be more careful. The `step` function I defined takes `dt: number`. When I expose it via `(window as any).__sim = { balls, step, paused: false }`, TypeScript should be fine since we're assigning to `any`.

Let me also verify: the `lastTime` initial value of 0 — on the first frame, `time` will be some large number (DOMHighResTimeStamp), so `dt` will be huge. I should handle this. Actually, I set `lastTime = 0` initially, and on the first call, `time` will be something like 16.67ms. So `dt = (16.67 - 0) / 1000 = 0.01667`. That's fine, it's under 1/30.

Actually wait, I should handle the case where `lastTime` is 0 more carefully. Let me just set `lastTime = -1` and check, or use the pattern where I skip the first frame's dt. Actually the simplest is: if lastTime is 0, set it to time and use dt=0.

Let me refine:

```typescript
let lastTime = -1;

renderer.setAnimationLoop((time: number) => {
  if (lastTime < 0) {
    lastTime = time;
  }
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  
  if (dt > 1 / 30) dt = 1 / 30;
  if (dt < 0) dt = 0;
  
  // ...
});
```

This is cleaner. On the first frame, dt = 0, which is fine.

Let me finalize the code.
