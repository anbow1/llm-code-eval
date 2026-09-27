Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions.

Let me plan the structure:

1. Import THREE
2. Set up renderer, scene, camera
3. Create box edges (LineSegments with EdgesGeometry)
4. Create 20 balls with SphereGeometry and MeshStandardMaterial
5. Physics: balls with position, velocity, radius 0.4, mass (random 1-3)
6. Elastic collisions with walls and between balls
7. Substeps for stability
8. Render loop with delta time clamped to 1/30
9. Expose __sim, __scene, __camera, __renderer, __ready

Key physics details:
- Box from -5 to +5 on every axis
- Ball radius = 0.4
- So ball center must stay within [-5 + 0.4, 5 - 0.4] = [-4.6, 4.6] on each axis
- Elastic collision with wall: reflect velocity component
- Elastic collision between balls: use standard 2D/3D elastic collision formula with masses
  - For two balls with masses m1, m2 and velocities v1, v2:
  - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2) / |x1-x2|^2 * (x1-x2)
  - v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1) / |x2-x1|^2 * (x2-x1)
  - Wait, let me be more careful. The standard elastic collision formula:
  - Let n = (x1 - x2) / |x1 - x2| (normal from ball 2 to ball 1)
  - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
  - v2' = v2 + (2*m1/(m1+m2)) * dot(v1-v2, n) * n

Actually let me reconsider. The formula for elastic collision:
- n = normalize(p1 - p2)
- vRel = v1 - v2
- vDotN = dot(vRel, n)
- If vDotN > 0, balls are moving apart, no collision
- Otherwise:
  - j = (2 * vDotN) / (1/m1 + 1/m2)  -- wait, let me think again
  - Actually: impulse = (2 * m1 * m2 / (m1 + m2)) * dot(v1 - v2, n) / ... 
  
Let me use the standard formulation:
- n = (p1 - p2) / |p1 - p2|
- relVel = dot(v1 - v2, n)
- If relVel < 0 (approaching):
  - j = -(1 + e) * relVel / (1/m1 + 1/m2) where e=1 for elastic
  - j = -2 * relVel / (1/m1 + 1/m2)
  - v1 += (j/m1) * n
  - v2 -= (j/m2) * n

Wait, let me be more careful:
- relVel = dot(v1 - v2, n) where n points from 2 to 1
- If relVel > 0, balls are separating (no collision needed)
- If relVel < 0, balls are approaching:
  - impulse magnitude: j = -(1+e) * relVel / (1/m1 + 1/m2)
  - For e=1: j = -2 * relVel / (1/m1 + 1/m2)
  - v1_new = v1 + (j/m1) * n
  - v2_new = v2 - (j/m2) * n

Let me verify: if m1 = m2 = m, then 1/m1 + 1/m2 = 2/m
j = -2 * relVel / (2/m) = -m * relVel
v1_new = v1 + (-m * relVel / m) * n = v1 - relVel * n
v2_new = v2 - (-m * relVel / m) * n = v2 + relVel * n

For equal masses with head-on collision: v1 - v2 = relVel along n, so:
v1_new = v1 - (v1-v2)_n * n = v1 - (v1-v2) (if 1D) = v2 ✓
v2_new = v2 + (v1-v2) = v1 ✓

Good, that's correct.

Now for non-overlapping start positions:
- Need to place 20 balls of radius 0.4 in a box of size 10x10x10
- Ball centers must be within [-4.6, 4.6] on each axis
- Minimum distance between centers: 0.8 (2 * radius)
- I'll use a grid or rejection sampling

Let me use a grid approach: divide the box into a grid and place balls in cells, or just use rejection sampling with a maximum number of tries.

For the substeps: I'll use multiple substeps per frame to keep physics stable. Let's say substeps = 8 or so, or calculate based on dt.

Let me also handle the "separate overlapping pairs" requirement - after collision detection, if balls overlap, push them apart.

Let me write the code now:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Box
const boxSize = 10;
const boxGeom = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const boxEdges = new THREE.EdgesGeometry(boxGeom);
const boxLines = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0x4488ff }));
scene.add(boxLines);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Physics
const R = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;
const LIMIT = 5 - R; // 4.6

interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomIn(range: number, min: number): number {
  return min + Math.random() * range;
}

function createBalls(count: number): BallState[] {
  const balls: BallState[] = [];
  const minDist = 2 * R + 0.01; // slight buffer
  const halfRange = LIMIT;
  
  for (let i = 0; i < count; i++) {
    let placed = false;
    let maxTries = 10000;
    while (!placed && maxTries-- > 0) {
      const x = randomIn(2 * halfRange, -halfRange);
      const y = randomIn(2 * halfRange, -halfRange);
      const z = randomIn(2 * halfRange, -halfRange);
      
      let ok = true;
      for (const b of balls) {
        const dx = x - b.x, dy = y - b.y, dz = z - b.z;
        if (dx*dx + dy*dy + dz*dz < minDist * minDist) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const m = 1 + Math.random() * 2; // 1..3
        const speed = 2 + Math.random() * 2; // 2..4
        // Random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);
        
        balls.push({ x, y, z, vx, vy, vz, r: R, m });
        placed = true;
      }
    }
    if (!placed) {
      // Fallback: place at a deterministic position
      balls.push({
        x: -4 + i * 0.4, y: 0, z: 0,
        vx: 3, vy: 0, vz: 0,
        r: R, m: 1 + Math.random() * 2
      });
    }
  }
  return balls;
}

const balls: BallState[] = createBalls(20);

// Meshes
const sphereGeom = new THREE.SphereGeometry(R, 24, 24);
const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x88ff44, 0x8844ff, 0xff4488];
const meshes: THREE.Mesh[] = balls.map((b, i) => {
  const mat = new THREE.MeshStandardMaterial({ 
    color: colors[i % colors.length], 
    roughness: 0.4, 
    metalness: 0.3 
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  mesh.position.set(b.x, b.y, b.z);
  scene.add(mesh);
  return mesh;
});

// Physics step
function step(dt: number): void {
  const substeps = Math.max(4, Math.ceil(dt / (1/240)));
  const subDt = dt / substeps;
  
  for (let s = 0; s < substeps; s++) {
    // Move
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }
    
    // Wall collisions
    for (const b of balls) {
      if (b.x - R < BOX_MIN) { b.x = BOX_MIN + R; b.vx = Math.abs(b.vx); }
      if (b.x + R > BOX_MAX) { b.x = BOX_MAX - R; b.vx = -Math.abs(b.vx); }
      if (b.y - R < BOX_MIN) { b.y = BOX_MIN + R; b.vy = Math.abs(b.vy); }
      if (b.y + R > BOX_MAX) { b.y = BOX_MAX - R; b.vy = -Math.abs(b.vy); }
      if (b.z - R < BOX_MIN) { b.z = BOX_MIN + R; b.vz = Math.abs(b.vz); }
      if (b.z + R > BOX_MAX) { b.z = BOX_MAX - R; b.vz = -Math.abs(b.vz); }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        const distSq = dx*dx + dy*dy + dz*dz;
        const minDist = a.r + b.r;
        
        if (distSq < minDist * minDist && distSq > 1e-10) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist, ny = dy / dist, nz = dz / dist;
          
          // Separate overlapping balls
          const overlap = minDist - dist;
          const totalM = a.m + b.m;
          a.x += nx * overlap * (b.m / totalM);
          a.y += ny * overlap * (b.m / totalM);
          a.z += nz * overlap * (b.m / totalM);
          b.x -= nx * overlap * (a.m / totalM);
          b.y -= ny * overlap * (a.m / totalM);
          b.z -= nz * overlap * (a.m / totalM);
          
          // Elastic collision
          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const relVz = a.vz - b.vz;
          const relVn = relVx * nx + relVy * ny + relVz * nz;
          
          if (relVn > 0) {
            // Already separating, skip
            continue;
          }
          
          const j_impulse = -2 * relVn / (1/a.m + 1/b.m);
          
          a.vx += (j_impulse / a.m) * nx;
          a.vy += (j_impulse / a.m) * ny;
          a.vz += (j_impulse / a.m) * nz;
          b.vx -= (j_impulse / b.m) * nx;
          b.vy -= (j_impulse / b.m) * ny;
          b.vz -= (j_impulse / b.m) * nz;
        }
      }
    }
  }
}

// Render loop
let paused = false;
let ready = false;
const clock = new THREE.Clock();

function animate(): void {
  const delta = Math.min(clock.getDelta(), 1/30);
  
  if (!paused) {
    step(delta);
  }
  
  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    meshes[i].position.set(b.x, b.y, b.z);
  }
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = { balls, step, paused: false };
```

Wait, I need to think about the `paused` property. The spec says `__sim.paused` is a boolean that when true, the render loop must keep rendering but must NOT call step(). So I need to check `__sim.paused` in the render loop, not a local variable. Or I can use a local variable that's synced.

Actually, looking at the spec more carefully: "paused is a boolean: when __sim.paused is true the render loop must keep rendering but must NOT call step()."

So the render loop should check `__sim.paused`. Let me restructure so that the `paused` in `__sim` is the actual flag checked.

Let me also reconsider the substeps. With 20 balls and dt clamped to 1/30, using substeps of at least 4 should be fine. Let me use a fixed number of substeps or calculate based on dt.

Actually, let me reconsider: `Math.ceil(dt / (1/240))` - if dt = 1/30, that's `Math.ceil(8)` = 8 substeps. If dt = 1/60, that's `Math.ceil(4)` = 4. That seems reasonable.

Let me also make sure the `step` function is the one exposed. The spec says `step(dt: number)` advances the physics by dt seconds.

One issue: the `paused` in `__sim` needs to be the actual boolean that's checked. If I do `(window as any).__sim = { balls, step, paused: false }`, then checking `__sim.paused` in the loop would work. But I also have a local `paused` variable. Let me just reference `__sim.paused` directly.

Actually, to keep it clean, let me store the sim object first and reference it.

Let me also double-check: the spec says "balls is an array of plain objects { x, y, z, vx, vy, vz, r, m } (numbers, the live state that step() updates)". So the balls array IS the live state. Good, my implementation does that.

Let me finalize the code and make sure it compiles with strict mode. I need to be careful about:
- No implicit any
- All types properly declared
- No unused variables (well, tsc --strict doesn't flag unused by default, but let's be clean)

Let me also make sure the camera position gives a good view of the box. The box is 10 units wide. Camera at z=18 with 60 degree FOV should see it. Let me check: at z=18, the visible height is 2 * 18 * tan(30°) ≈ 2 * 18 * 0.577 ≈ 20.8. The box is 10 units, so it should be well within view.

Actually, let me move the camera a bit closer or adjust. With FOV 60 and camera at z=18, the vertical extent visible is about 20.8, and horizontal (with 16:9) would be about 37. The box is 10x10x10 centered at origin. So it should be nicely visible.

Let me finalize.
