Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box.

Key requirements:
1. Box from -5 to +5 on every axis
2. Draw box edges with LineSegments + EdgesGeometry
3. 20 balls, radius 0.4, at least two different masses (random 1..3)
4. Start positions non-overlapping, fully inside box
5. Start velocities random, speed ~2..4 units/s
6. Perfectly elastic collisions with walls AND between balls (conserving momentum and KE)
7. Balls never leave box, never overlap
8. Each ball is a Mesh with SphereGeometry + MeshStandardMaterial
9. AmbientLight + DirectionalLight
10. Keep meshes in sync with physics
11. Expose (window as any).__sim = { balls, step, paused }
12. balls is array of plain objects { x, y, z, vx, vy, vz, r, m }
13. step(dt) advances physics with substeps
14. paused: when true, render but don't call step
15. Render loop clamps delta to 1/30 s
16. Camera sees whole box
17. Use renderer.setAnimationLoop
18. Handle resize
19. Import Three.js properly
20. No external assets
21. Set (window as any).__ready = true after first frame
22. Expose __scene, __camera, __renderer

Let me think about the physics:

For wall collisions: if ball position +/- radius exceeds the box boundary, reflect the velocity component and clamp position.

For ball-ball elastic collisions:
- Detect overlap: distance < r1 + r2
- Separate: push them apart along the collision normal
- Elastic collision formula:
  - Relative velocity: dv = v1 - v2
  - Normal: n = (pos1 - pos2) / |pos1 - pos2|
  - If dv · n > 0 (approaching), apply impulse:
    - j = (2 * dv · n) / (1/m1 + 1/m2)
    - v1 -= (j/m1) * n
    - v2 += (j/m2) * n

Wait, let me be more careful. For two balls with masses m1, m2:
- Normal vector n = (p2 - p1) / |p2 - p1| (from ball 1 to ball 2)
- Relative velocity along normal: vrel = (v1 - v2) · n
- If vrel > 0 (approaching):
  - Impulse magnitude: j = (1 + e) * vrel / (1/m1 + 1/m2) where e=1 for perfectly elastic
  - v1 -= (j/m1) * n
  - v2 += (j/m2) * n

For separation: if distance < r1 + r2, push apart:
- overlap = (r1 + r2) - distance
- push each ball apart proportionally to inverse mass
- p1 -= (overlap * m2/(m1+m2)) * n
- p2 += (overlap * m1/(m1+m2)) * n

Let me think about substeps. I'll use a fixed substep size, say dt/10 or some reasonable number of substeps.

For initial positions: I need to ensure no overlap. I'll try random positions and reject if overlapping.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(boxEdges);

// Balls
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5, BOX_MAX = 5;
const balls: Ball[] = [];

// Generate non-overlapping positions
function randomPosition(): { x: number; y: number; z: number } {
  const margin = RADIUS;
  while (true) {
    const x = BOX_MIN + margin + Math.random() * (BOX_MAX - BOX_MIN - 2 * margin);
    const y = BOX_MIN + margin + Math.random() * (BOX_MAX - BOX_MIN - 2 * margin);
    const z = BOX_MIN + margin + Math.random() * (BOX_MAX - BOX_MIN - 2 * margin);
    // Check overlap with existing balls
    let ok = true;
    for (const b of balls) {
      const dx = b.x - x, dy = b.y - y, dz = b.z - z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 2 * RADIUS) { ok = false; break; }
    }
    if (ok) return { x, y, z };
  }
}

function randomVelocity(): { vx: number; vy: number; vz: number } {
  const speed = 2 + Math.random() * 2; // 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi)
  };
}

for (let i = 0; i < NUM_BALLS; i++) {
  const pos = randomPosition();
  const vel = randomVelocity();
  const m = 1 + Math.random() * 2; // 1..3
  balls.push({
    x: pos.x, y: pos.y, z: pos.z,
    vx: vel.vx, vy: vel.vy, vz: vel.vz,
    r: RADIUS, m: m
  });
}

// Create meshes
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 16);
const ballMeshes: THREE.Mesh[] = [];
const colors = new Array(NUM_BALLS).fill(0).map((_, i) => {
  const hue = i / NUM_BALLS;
  return new THREE.Color().setHSL(hue, 0.8, 0.5);
});

for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.3, metalness: 0.1 });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Physics step
function step(dt: number) {
  const substeps = 10;
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
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const minDist = a.r + b.r;
        
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist, ny = dy / dist, nz = dz / dist;
          
          // Separate
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          a.x -= overlap * (b.m / totalM) * nx;
          a.y -= overlap * (b.m / totalM) * ny;
          a.z -= overlap * (b.m / totalM) * nz;
          b.x += overlap * (a.m / totalM) * nx;
          b.y += overlap * (a.m / totalM) * ny;
          b.z += overlap * (a.m / totalM) * nz;
          
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
    
    // Re-check walls after separation (balls might be pushed out)
    for (const b of balls) {
      const min = BOX_MIN + b.r;
      const max = BOX_MAX - b.r;
      b.x = Math.max(min, Math.min(max, b.x));
      b.y = Math.max(min, Math.min(max, b.y));
      b.z = Math.max(min, Math.min(max, b.z));
    }
  }
}

// Sync meshes
function syncMeshes() {
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// Expose
const sim = { balls, step, paused: false };
(window as any).__sim = sim;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  
  if (!sim.paused) {
    step(delta);
  }
  
  syncMeshes();
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to be careful. The `step` function exposed via `__sim` should be the same function. Let me make sure the closure works correctly.

Also, I need to make sure the `balls` array reference is shared. Since I'm using `balls` directly in the closure, and I assign `sim.balls = balls`, the reference is shared. Good.

Let me also make sure the strict TypeScript compiles. Let me check for potential issues:
- `clock.getDelta()` returns a number - fine
- The `setAnimationLoop` callback - fine
- All variables are properly typed

One issue: I'm using `const sim = { balls, step, paused: false }` but `paused` needs to be mutable. Since it's a plain object property, it should be fine - the user can set `sim.paused = true` and it'll work.

Actually wait - I need to be careful with the `step` function. If I define it as a const arrow function, it captures the closure over `balls`. But the `sim` object's `step` property points to that function. When the render loop calls `step(delta)`, it calls the same function. Good.

Let me also make sure I handle the edge case where `dist` is 0 (two balls at exactly the same position). I added the `dist > 0.0001` check.

Let me also think about whether I need to handle the case where separation pushes a ball outside the box. I added a re-check after ball-ball collisions. Good.

Let me refine the code to make sure it's clean and compiles under strict mode. I'll use proper types everywhere.

Actually, let me reconsider the `step` function signature. The spec says `step(dt: number)`. Let me make sure it's typed correctly.

Also, I should make sure the `balls` array in `__sim` is the actual live array (same reference), not a copy. Since I'm using `balls` directly, this should work.

Let me write the final clean version.
