Let me design this carefully.

Box: -5 to +5 on every axis. Edges drawn with LineSegments + EdgesGeometry.

Balls: 20 balls, radius 0.4, mass random 1..3 (at least two different masses). Start positions non-overlapping, fully inside box. Start velocities random, speed 2..4 units/s.

Physics:
- Wall collisions: perfectly elastic. If ball hits wall, reflect velocity component. Clamp position so ball stays inside (position clamped to [-5+r, 5-r]).
- Ball-ball collisions: elastic collision with masses. Conserve momentum and kinetic energy.
- Separate overlapping pairs: if two balls overlap, push them apart.

Step function with substeps for stability.

Rendering:
- Each ball is a Mesh with SphereGeometry and MeshStandardMaterial.
- AmbientLight + DirectionalLight.
- Meshes synced with physics.

Exposure:
- (window as any).__scene = scene
- (window as any).__camera = camera
- (window as any).__renderer = renderer
- (window as any).__sim = { balls, step, paused }
- (window as any).__ready = true after first frame

Let me write this out.

For the elastic collision between two balls:
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- If vrel · n > 0 (approaching), apply impulse:
  - j = (1 + e) * (vrel · n) / (1/m1 + 1/m2), where e = 1 for perfectly elastic
  - v1 += j * n / m1
  - v2 -= j * n / m2

Wait, let me be more careful. For elastic collision:
- n = (p2 - p1) / |p2 - p1|
- vrel = v1 - v2
- vn = vrel · n (component along normal)
- If vn > 0 (they're approaching):
  - impulse magnitude: j = 2 * vn / (1/m1 + 1/m2)
  - v1 -= j * n / m1
  - v2 += j * n / m2

This conserves momentum and kinetic energy for perfectly elastic collision.

For separating overlapping pairs:
- If distance < r1 + r2, push them apart along the normal by the overlap amount, weighted by inverse mass.

Let me think about substeps. With dt clamped to 1/30, and 20 balls moving at 2-4 units/s, in 1/30 s a ball moves about 0.067-0.133 units. Ball radius is 0.4, so relative movement is small. But to be safe, I'll use substeps. Let's say 4 substeps.

Actually, let me think about this more carefully. The step function takes dt. I'll divide it into substeps. Let's use enough substeps to keep movement per substep small relative to ball radius.

For initial positions: I need to place 20 balls of radius 0.4 in a 10x10x10 box. The balls must not overlap. I'll use a grid-like approach with some randomness, or rejection sampling.

Grid approach: 10x10x10 box, radius 0.4, so diameter 0.8. If I use a grid with spacing 0.9, I can fit about 11 per axis. That's way more than 20. Let me use a 3x3x3 grid (27 positions) and pick 20, or use rejection sampling.

Actually, let me use a simpler approach: place them in a grid pattern with jitter. 3x3x3 = 27 positions in a 6x6x6 area centered at origin (from -3 to 3). Spacing 2.0, that gives positions at -2, 0, 2 on each axis. That's 27 positions, pick 20. But with radius 0.4, minimum distance needed is 0.8. Spacing of 2.0 is more than enough.

Actually let me just do rejection sampling with a minimum distance of 0.8 (2*radius) plus a small margin. Or I can use a grid.

Let me use a grid: positions at -3, -1, 1, 3 on each axis (4 per axis = 64 positions). Pick 20 randomly from these. Spacing is 2.0 which is >> 0.8.

Wait, the box is -5 to +5. Balls with radius 0.4 must be fully inside, so center must be in [-4.6, 4.6]. A grid from -3 to 3 with spacing 2 gives positions at -3, -1, 1, 3. That's 4 per axis, 64 total. Pick 20.

Let me code this up.

For the camera: box is 10 units wide. Camera at (0, 0, 15) looking at origin should work. Or maybe (10, 10, 10) for a nice angle. Let me use (0, 0, 15) with a reasonable FOV.

Actually, let me use (12, 12, 12) looking at origin for a nice 3D perspective. FOV 45 or 50.

Let me write the complete file now.

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
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// Ball physics
const BOX_MIN = -5;
const BOX_MAX = 5;
const BALL_RADIUS = 0.4;
const NUM_BALLS = 20;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function generatePositions(): { x: number; y: number; z: number }[] {
  // Grid of positions: -3, -1, 1, 3 on each axis
  const positions: { x: number; y: number; z: number }[] = [];
  for (let x = -3; x <= 3; x += 2) {
    for (let y = -3; y <= 3; y += 2) {
      for (let z = -3; z <= 3; z += 2) {
        positions.push({ x, y, z });
      }
    }
  }
  // Shuffle and pick 20
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, NUM_BALLS);
}

function randomVelocity(): { vx: number; vy: number; vz: number } {
  const speed = 2 + Math.random() * 2; // 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi),
  };
}

const positions = generatePositions();
const balls: Ball[] = positions.map((p) => {
  const m = 1 + Math.random() * 2; // 1..3
  const v = randomVelocity();
  return {
    x: p.x, y: p.y, z: p.z,
    vx: v.vx, vy: v.vy, vz: v.vz,
    r: BALL_RADIUS,
    m,
  };
});

// Ensure at least two different masses
// Since we use random 1..3, with 20 balls we'll almost certainly have different masses.
// But to be safe, force first two to be different:
balls[0].m = 1;
balls[1].m = 3;

// Create meshes
const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
const meshes: THREE.Mesh[] = [];
const colors = [
  0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
  0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488,
  0x8844ff, 0xff44ff, 0x44ff88, 0x8844ff, 0xff8844,
  0x4488ff, 0xff4444, 0x44ff44, 0x4444ff, 0xffff44,
];

for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.3, metalness: 0.5 });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step
function step(dt: number): void {
  const substeps = 4;
  const sdt = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    // Move balls
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.z += b.vz * sdt;
    }
    // Wall collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      const b = balls[i];
      const min = BOX_MIN + b.r;
      const max = BOX_MAX - b.r;
      if (b.x < min) { b.x = min; b.vx = Math.abs(b.vx); }
      if (b.x > max) { b.x = max; b.vx = -Math.abs(b.vx); }
      if (b.y < min) { b.y = min; b.vy = Math.abs(b.vy); }
      if (b.y > max) { b.y = max; b.vy = -Math.abs(b.vy); }
      if (b.z < min) { b.z = min; b.vz = Math.abs(b.vz); }
      if (b.z > max) { b.z = max; b.vz = -Math.abs(b.vz); }
    }
    // Ball-ball collisions
    for (let i = 0; i < NUM_BALLS; i++) {
      for (let j = i + 1; j < NUM_BALLS; j++) {
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
          const rvx = a.vx - b.vx;
          const rvy = a.vy - b.vy;
          const rvz = a.vz - b.vz;
          const rvDotN = rvx * nx + rvy * ny + rvz * nz;
          
          if (rvDotN > 0) { // approaching
            const impulse = 2 * rvDotN / (1 / a.m + 1 / b.m);
            a.vx -= impulse * nx / a.m;
            a.vy -= impulse * ny / a.m;
            a.vz -= impulse * nz / a.m;
            b.vx += impulse * nx / b.m;
            b.vy += impulse * ny / b.m;
            b.vz += impulse * nz / b.m;
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

// Resize
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
  dt = Math.min(dt, 1 / 30);
  
  const sim = (window as any).__sim as { balls: Ball[]; step: (dt: number) => void; paused: boolean };
  if (!sim.paused) {
    sim.step(dt);
  }
  
  // Sync meshes
  for (let i = 0; i < NUM_BALLS; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to double-check the `step` function. The `__sim` object has `balls`, `step`, and `paused`. The `step` function should be the one I defined. Let me make sure the reference is correct.

Actually, `step` is a function defined in the module scope. When I assign `(window as any).__sim = { balls, step, paused: false }`, the `step` there refers to the function I defined. That's correct.

But wait - the `paused` property needs to be mutable and checked in the render loop. Since I'm accessing `(window as any).__sim.paused` in the render loop, that will work because it's the same object reference.

Let me also make sure the TypeScript compiles with `--strict`. Let me check:
- All variables are typed
- No implicit any
- The `time` parameter in `setAnimationLoop` is a number
- The `lastTime` is a number

I think this looks good. Let me also add `document.body.style.margin = '0'` and `overflow: 'hidden'` to make it full-screen.

One concern: the `setAnimationLoop` callback receives `time` as a DOMHighResTimeStamp (number). In strict mode, this should be fine.

Let me also verify: the `renderer.setAnimationLoop` signature. It takes a callback `(time: number) => void`. Actually, looking at Three.js types, it's `SetAnimationLoopCallback = (time: number) => void`. So `time` is a number. Good.

Actually wait, I should double-check: in newer Three.js, `setAnimationLoop` callback might receive `time` as `number | undefined`? Let me just handle it safely. Actually no, the standard signature is `(time: number) => void`. I'll keep it as is.

Let me finalize the code.
