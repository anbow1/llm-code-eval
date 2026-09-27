Let me break down the requirements:

1. 20 balls bouncing inside a box from -5 to +5 on every axis
2. Box edges drawn with LineSegments + EdgesGeometry
3. Ball radius = 0.4, mass random 1..3 (at least two different masses)
4. Start positions non-overlapping, fully inside box
5. Start velocities random, speed 2..4 units/s
6. Physics: perfectly elastic collisions (walls AND balls), conserve momentum and KE
7. Balls never leave box, never stay overlapping
8. Each ball is a Mesh with SphereGeometry + MeshStandardMaterial
9. AmbientLight + DirectionalLight
10. Expose __sim = { balls, step, paused }
11. balls is array of plain objects { x, y, z, vx, vy, vz, r, m }
12. step(dt) advances physics with substeps
13. paused: when true, render but don't call step()
14. Render loop calls step() with frame delta clamped to 1/30s
15. Camera placed so whole box is visible
16. Expose __scene, __camera, __renderer
17. After first frame, set __ready = true
18. Handle window resize
19. Use renderer.setAnimationLoop
20. No external assets

Let me write this carefully:

For the physics:
- Wall collisions: if ball position - radius < -5, reflect velocity and clamp position
- Ball-ball collisions: check distance < r1 + r2, then separate and apply elastic collision formulas

Elastic collision between two balls:
- Relative velocity along normal
- If approaching (relative velocity dot normal < 0), apply impulse
- Impulse: j = -(1 + e) * vrel_n / (1/m1 + 1/m2), where e = 1 for perfectly elastic
- v1 += j * n / m1
- v2 -= j * n / m2

Substeps: divide dt into smaller steps for stability. Let's use substeps of at most 1/120s or so.

Let me think about the ball initialization:
- 20 balls, radius 0.4
- Must be fully inside box: position must be in [-5+0.4, 5-0.4] = [-4.6, 4.6] on each axis
- Must not overlap: distance between any two balls > 0.8

For non-overlapping placement, I'll use a simple rejection sampling approach.

Let me write the code:

```typescript
import * as THREE from 'three';

// Setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera - place so whole box is visible
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 12);
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
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x4488ff });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// Ball data
interface BallData {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

const balls: BallData[] = [];

// Generate non-overlapping positions
function generateBalls(): BallData[] {
  const result: BallData[] = [];
  const minPos = BOX_MIN + RADIUS;
  const maxPos = BOX_MAX - RADIUS;
  
  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 10000) {
      attempts++;
      const x = minPos + Math.random() * (maxPos - minPos);
      const y = minPos + Math.random() * (maxPos - minPos);
      const z = minPos + Math.random() * (maxPos - minPos);
      
      let overlaps = false;
      for (const b of result) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < RADIUS * 2) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        // Random velocity with speed 2..4
        const speed = 2 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);
        
        const m = 1 + Math.random() * 2; // mass 1..3
        
        result.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
        placed = true;
      }
    }
    if (!placed) {
      // Fallback: place in a grid-like pattern
      const gridPos = i * 0.1;
      const x = minPos + (i % 5) * 2;
      const y = minPos + Math.floor(i / 5) * 2;
      const z = minPos + Math.floor(i / 25) * 2;
      const speed = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);
      const m = 1 + Math.random() * 2;
      result.push({ x, y, z, vx, vy, vz, r: RADIUS, m });
    }
  }
  return result;
}

balls.push(...generateBalls());

// Create meshes
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 32, 16);
const ballMeshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
  const hue = i / NUM_BALLS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Physics step
function step(dt: number): void {
  const SUBSTEPS = Math.max(1, Math.ceil(dt / (1 / 120)));
  const subDt = dt / SUBSTEPS;
  
  for (let s = 0; s < SUBSTEPS; s++) {
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
        const a = balls[i];
        const b = balls[j];
        
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.r + b.r;
        
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          
          // Separate
          const overlap = minDist - dist;
          const totalMass = a.m + b.m;
          a.x -= nx * overlap * (b.m / totalMass);
          a.y -= ny * overlap * (b.m / totalMass);
          a.z -= nz * overlap * (b.m / totalMass);
          b.x += nx * overlap * (a.m / totalMass);
          b.y += ny * overlap * (a.m / totalMass);
          b.z += nz * overlap * (a.m / totalMass);
          
          // Elastic collision
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const rvz = b.vz - a.vz;
          const rvDotN = rvx * nx + rvy * ny + rvz * nz;
          
          if (rvDotN < 0) {
            const impulse = -(1 + 1) * rvDotN / (1 / a.m + 1 / b.m);
            a.vx -= (impulse * nx) / a.m;
            a.vy -= (impulse * ny) / a.m;
            a.vz -= (impulse * nz) / a.m;
            b.vx += (impulse * nx) / b.m;
            b.vy += (impulse * ny) / b.m;
            b.vz += (impulse * nz) / b.m;
          }
        }
      }
    }
  }
}

// Sim object
const sim = {
  balls,
  step,
  paused: false
};

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
let lastTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const dt = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;
  
  if (!sim.paused) {
    step(dt);
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

Wait, I need to be careful with the `time` parameter in setAnimationLoop. On the first call, `lastTime` is 0 and `time` might be a large number. Let me handle that.

Actually, `setAnimationLoop` passes the DOMHighResTimeStamp (milliseconds). On the first frame, `lastTime` is 0, so `dt` would be huge. I should handle the first frame specially.

Let me also make sure the code compiles with `tsc --strict`. I need to be careful about types.

Let me also double-check: the `step` function in `__sim` should be the same function I'm calling in the render loop. Yes, it is.

One issue: `lastTime` starts at 0, and the first `time` value from the animation loop could be something like 16ms. So dt would be 0.016s which is fine. But if it's the very first frame, it could be larger. Let me initialize `lastTime` to -1 and handle the first frame.

Actually, let me just set `lastTime = time` on the first frame and skip the step. Or better, I'll use a flag.

Let me refine:

```typescript
let lastTime: number | null = null;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  if (lastTime === null) {
    lastTime = time;
  }
  
  const dt = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;
  
  if (!sim.paused && dt > 0) {
    step(dt);
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

This looks good. Let me finalize the code.
