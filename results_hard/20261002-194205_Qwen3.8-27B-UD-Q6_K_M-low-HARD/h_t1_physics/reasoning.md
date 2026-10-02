Let me break down the requirements:

1. 20 balls bouncing in a box from -5 to +5 on every axis
2. No gravity
3. Box edges visible with LineSegments + EdgesGeometry
4. Each ball: radius 0.4, random mass (1-3)
5. Start positions non-overlapping, fully inside box
6. Start velocities random, speed 2-4 units/s
7. Perfectly elastic collisions (walls and ball-ball), conserve momentum and KE
8. Balls never leave box, never stay overlapping (separate overlapping pairs)
9. Each ball is a Mesh with SphereGeometry and MeshStandardMaterial
10. AmbientLight + DirectionalLight
11. Expose __sim = { balls, step, paused }
12. balls: array of {x, y, z, vx, vy, vz, r, m}
13. step(dt) advances physics with substeps
14. paused: when true, keep rendering but don't call step()
15. Camera sees whole box
16. Standard requirements: Three.js import, WebGLRenderer, resize handling, setAnimationLoop, __scene/__camera/__renderer, __ready

Let me write this carefully:

For the physics:
- Wall collision: if ball.x - r < -5, reflect vx and set x = -5 + r (and same for all walls)
- Ball-ball collision: elastic collision formula using masses
  - For two balls with positions p1, p2, velocities v1, v2, masses m1, m2:
  - Normal direction: n = (p2 - p1) / |p2 - p1|
  - Relative velocity: vrel = v1 - v2
  - Velocity along normal: vn = dot(vrel, n)
  - If vn > 0 (approaching), apply impulse:
    - j = (2 * vn) / (1/m1 + 1/m2)
    - v1 += (j/m1) * n
    - v2 -= (j/m2) * n
  - Then separate: push balls apart so they don't overlap

For substeps: I'll divide dt into smaller substeps (e.g., 4-8 substeps) to maintain stability.

For non-overlapping start positions: I'll use rejection sampling - try random positions and check against all existing balls.

Let me think about the camera position. The box goes from -5 to +5, so it's 10 units wide. I'll place the camera at something like (0, 0, 20) or (10, 10, 15) to see the whole box. Let me use (0, 0, 20) with a reasonable FOV.

Actually, let me use (12, 12, 12) looking at origin for a nice 3D perspective.

Let me code this up:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Box edges
const boxSize = 10;
const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// Ball physics
const R = 0.4;
const BOUND = 5;
const NUM_BALLS = 20;
const SUBSTEPS = 8;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomSpeed(): { vx: number; vy: number; vz: number } {
  // Random direction
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const speed = 2 + Math.random() * 2; // 2 to 4
  return {
    vx: speed * Math.sin(phi) * Math.cos(theta),
    vy: speed * Math.sin(phi) * Math.sin(theta),
    vz: speed * Math.cos(phi),
  };
}

// Generate non-overlapping positions
function generateBalls(): Ball[] {
  const balls: Ball[] = [];
  const minDist = 2 * R; // 0.8
  
  for (let i = 0; i < NUM_BALLS; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 10000) {
      attempts++;
      const x = -BOUND + R + Math.random() * (2 * (BOUND - R));
      const y = -BOUND + R + Math.random() * (2 * (BOUND - R));
      const z = -BOUND + R + Math.random() * (2 * (BOUND - R));
      
      let valid = true;
      for (const b of balls) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) {
          valid = false;
          break;
        }
      }
      
      if (valid) {
        const v = randomSpeed();
        balls.push({
          x, y, z,
          vx: v.vx, vy: v.vy, vz: v.vz,
          r: R,
          m: 1 + Math.random() * 2, // 1 to 3
        });
        placed = true;
      }
    }
  }
  return balls;
}

const balls = generateBalls();

// Create meshes
const sphereGeometry = new THREE.SphereGeometry(R, 32, 16);
const meshes: THREE.Mesh[] = [];

for (const ball of balls) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
    roughness: 0.3,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(ball.x, ball.y, ball.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step
function step(dt: number): void {
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
      if (b.x - b.r < -BOUND) { b.x = -BOUND + b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > BOUND) { b.x = BOUND - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < -BOUND) { b.y = -BOUND + b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > BOUND) { b.y = BOUND - b.r; b.vy = -Math.abs(b.vy); }
      if (b.z - b.r < -BOUND) { b.z = -BOUND + b.r; b.vz = Math.abs(b.vz); }
      if (b.z + b.r > BOUND) { b.z = BOUND - b.r; b.vz = -Math.abs(b.vz); }
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
            const impulse = (2 * dvDotN) / (1 / a.m + 1 / b.m);
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
  
  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
}

// Expose
const paused = false;
(window as any).__sim = { balls, step, paused: false };

// Wait, the requirement says `paused` is a boolean in __sim. But if I just set a property to false, the user can modify it. Let me re-read...
// "paused is a boolean: when __sim.paused is true the render loop must keep rendering but must NOT call step()"
// So I need to check __sim.paused in the render loop.

// Actually let me just expose it as a plain object where paused is a mutable property.

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  
  const sim = (window as any).__sim;
  if (!sim.paused) {
    step(delta);
  }
  
  renderer.render(scene, camera);
  
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful with the `paused` property. The requirement says `__sim = { balls, step, paused }` where `paused` is a boolean. If I do `const paused = false; (window as any).__sim = { balls, step, paused }`, then `paused` in the object is just a property that can be set externally. That's fine - the test can set `__sim.paused = true` and the render loop checks it.

Actually, I realize I should double-check the elastic collision formula. For two balls:
- n = (p2 - p1) / |p2 - p1| (points from 1 to 2)
- vrel = v1 - v2 (relative velocity of 1 w.r.t. 2)
- vn = dot(vrel, n) = component of relative velocity along the normal
- If vn > 0, they are approaching (ball 1 is moving toward ball 2 along the normal)
- Impulse magnitude: j = (1 + e) * vn / (1/m1 + 1/m2), where e = 1 for perfectly elastic
  - So j = 2 * vn / (1/m1 + 1/m2)
- v1' = v1 - (j/m1) * n
- v2' = v2 + (j/m2) * n

Let me verify conservation:
- Momentum: m1*v1 + m2*v2 = m1*(v1 - j*n/m1) + m2*(v2 + j*n/m2) = m1*v1 - j*n + m2*v2 + j*n = m1*v1 + m2*v2 ✓
- KE: This is the standard elastic collision formula, so it's correct.

Let me also make sure the separation is correct. When balls overlap, I push them apart proportionally to their masses (heavier ball moves less). This is standard.

One issue: after separating, the balls might be pushed outside the box. I should handle wall collisions after ball-ball separation, or do another pass of wall clamping. Actually, in my substep loop, I do wall collisions after ball-ball collisions... wait no, I do wall collisions first, then ball-ball. Let me reorder: move, ball-ball, wall. Or I can do wall after ball-ball to be safe.

Actually, let me do: move → ball-ball (with separation) → wall clamping. This way, if separation pushes a ball outside, the wall clamping catches it.

Let me also add a final separation pass to ensure no overlapping at the end of each substep. Actually, the single pass should be fine with substeps. But to be extra safe, I could do multiple collision resolution iterations per substep. Let me just do 2 iterations of ball-ball collision per substep to be safe.

Actually, for 20 balls, a single pass should be fine with 8 substeps. The balls are small relative to the box, so overlaps should be minor.

Let me finalize the code. I'll also make sure the `step` function signature matches - it takes `dt: number`.

One more thing - the requirement says "use at least two different masses (e.g. random 1..3)". I'm using `1 + Math.random() * 2` which gives [1, 3). Good.

Let me also make sure the TypeScript is strict-mode compatible. I need to be careful about null checks, etc.

Actually, looking at my code again, `generateBalls()` might not place all 20 balls if it can't find non-overlapping positions. With radius 0.4 and box size 10, the available volume is 9.2^3 ≈ 778 cubic units, and each ball occupies a sphere of radius 0.4 (effective radius for center placement is 0.4 from walls, so the center can be in [-4.6, 4.6] which is 9.2^3). 20 balls of radius 0.4 should fit easily. The rejection sampling should work fine.

But to be safe with TypeScript strict mode, I should handle the case where `placed` is never true. Let me add a fallback or just assert it works (which it will for 20 balls in a 10-unit box).

Actually, in strict mode, the `balls` array might not have length 20 if placement fails. Let me just make sure the loop always finds a position (which it will with 10000 attempts for 20 balls in a 10-unit box).

Let me write the final version now.
