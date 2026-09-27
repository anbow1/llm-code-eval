Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions.

Key requirements:
1. Box from -5 to +5 on every axis, draw edges
2. 20 balls, radius 0.4, mass random 1..3 (at least two different masses)
3. Start positions non-overlapping, fully inside box
4. Start velocities random, speed 2..4 units/s
5. Perfectly elastic collisions with walls AND between balls (conserve momentum and KE)
6. Balls never leave box, never stay overlapping (separate overlapping pairs)
7. Each ball is a Mesh with SphereGeometry and MeshStandardMaterial
8. AmbientLight + DirectionalLight
9. Expose __sim = { balls, step, paused }
10. balls is array of plain objects { x, y, z, vx, vy, vz, r, m }
11. step(dt) advances physics with substeps
12. paused boolean: render loop keeps rendering but doesn't call step()
13. Render loop clamps delta to max 1/30 s
14. Camera placed so whole box is visible
15. Import THREE from 'three'
16. Handle window resize
17. Use renderer.setAnimationLoop
18. Expose __scene, __camera, __renderer
19. Set __ready = true after first frame

Let me think about the physics:

For wall collisions: if ball position exceeds box boundary minus radius, reflect velocity component and clamp position.

For ball-ball elastic collisions:
- Detect overlap: distance < r1 + r2
- Separate: push apart along collision normal
- Elastic collision formula using masses:
  - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
  - v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, n) * n
  where n is unit vector from ball1 to ball2

For substeps: divide dt into smaller chunks (e.g., 4 substeps or more) to keep things stable.

Let me think about non-overlapping start positions:
- Box goes from -5 to 5, so usable space for ball center is from -4.6 to 4.6 (radius 0.4)
- Need to place 20 balls without overlap (distance between any two > 0.8)
- I'll use a rejection sampling approach

Let me write the code:

```typescript
import * as THREE from 'three';

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const BOX = 5;
const RADIUS = 0.4;
const NUM_BALLS = 20;

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Box edges
const boxGeo = new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x888888 });
const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
scene.add(edgesMesh);

// Balls
const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];
const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 16);

function randomInBox(): { x: number; y: number; z: number } {
  const margin = BOX - RADIUS;
  return {
    x: (Math.random() * 2 - 1) * margin,
    y: (Math.random() * 2 - 1) * margin,
    z: (Math.random() * 2 - 1) * margin,
  };
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

for (let i = 0; i < NUM_BALLS; i++) {
  let pos: { x: number; y: number; z: number };
  let attempts = 0;
  do {
    pos = randomInBox();
    attempts++;
    if (attempts > 10000) break;
  } while (balls.some(b => {
    const dx = b.x - pos.x, dy = b.y - pos.y, dz = b.z - pos.z;
    return (dx*dx + dy*dy + dz*dz) < (RADIUS * 2) * (RADIUS * 2);
  }));
  
  const vel = randomVelocity();
  const m = 1 + Math.random() * 2; // 1..3
  
  const ball: Ball = {
    x: pos.x, y: pos.y, z: pos.z,
    vx: vel.vx, vy: vel.vy, vz: vel.vz,
    r: RADIUS, m,
  };
  balls.push(ball);
  
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / NUM_BALLS, 0.8, 0.5) });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step with substeps
const SUBSTEPS = 4;

function step(dt: number): void {
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    // Integrate
    for (const b of balls) {
      b.x += b.vx * subDt;
      b.y += b.vy * subDt;
      b.z += b.vz * subDt;
    }
    
    // Wall collisions
    for (const b of balls) {
      const limit = BOX - b.r;
      if (b.x < -limit) { b.x = -limit; b.vx = Math.abs(b.vx); }
      if (b.x > limit) { b.x = limit; b.vx = -Math.abs(b.vx); }
      if (b.y < -limit) { b.y = -limit; b.vy = Math.abs(b.vy); }
      if (b.y > limit) { b.y = limit; b.vy = -Math.abs(b.vy); }
      if (b.z < -limit) { b.z = -limit; b.vz = Math.abs(b.vz); }
      if (b.z > limit) { b.z = limit; b.vz = -Math.abs(b.vz); }
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
          
          // Normal from a to b
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
          
          if (dvDotN > 0) { // only if approaching
            const impulse = 2 * dvDotN / totalMass;
            a.vx -= impulse * b.m * nx;
            a.vy -= impulse * b.m * ny;
            a.vz -= impulse * b.m * nz;
            b.vx += impulse * a.m * nx;
            b.vy += impulse * a.m * ny;
            b.vz += impulse * a.m * nz;
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
  paused: false,
};

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sim = sim;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let lastTime = 0;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const dt = lastTime ? (time - lastTime) / 1000 : 1/60;
  lastTime = time;
  
  const clampedDt = Math.min(dt, 1/30);
  
  if (!sim.paused) {
    step(clampedDt);
  }
  
  // Sync meshes
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  
  renderer.render(scene, camera);
  
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

Wait, I need to double-check the elastic collision formula. For two balls with masses m1, m2:

The relative velocity along the normal is `dvDotN = (v1 - v2) · n` where n points from 1 to 2.

If dvDotN > 0, they're approaching (ball 1 moving toward ball 2).

The impulse for elastic collision:
- j = 2 * dvDotN / (1/m1 + 1/m2) = 2 * dvDotN * m1 * m2 / (m1 + m2)

Wait, let me re-derive:

For elastic collision along normal n (unit vector from a to b):
- v1' = v1 - (2*m2/(m1+m2)) * (v1-v2)·n * n
- v2' = v2 + (2*m1/(m1+m2)) * (v1-v2)·n * n

So:
```
const dvDotN = (a.vx - b.vx)*nx + (a.vy - b.vy)*ny + (a.vz - b.vz)*nz;
if (dvDotN > 0) {
  const factor_a = 2 * b.m / (a.m + b.m);
  const factor_b = 2 * a.m / (a.m + b.m);
  a.vx -= factor_a * dvDotN * nx;
  a.vy -= factor_a * dvDotN * ny;
  a.vz -= factor_a * dvDotN * nz;
  b.vx += factor_b * dvDotN * nx;
  b.vy += factor_b * dvDotN * ny;
  b.vz += factor_b * dvDotN * nz;
}
```

Let me verify this conserves momentum:
- Change in a: -factor_a * dvDotN * n = -2*m2/(m1+m2) * dvDotN * n
- Change in b: +factor_b * dvDotN * n = +2*m1/(m1+m2) * dvDotN * n

Momentum change: m1 * (-2*m2/(m1+m2) * dvDotN * n) + m2 * (2*m1/(m1+m2) * dvDotN * n)
= -2*m1*m2/(m1+m2) * dvDotN * n + 2*m1*m2/(m1+m2) * dvDotN * n = 0 ✓

KE conservation: For 1D elastic collision this is well-known to conserve KE. ✓

Let me also make sure the separation is correct. When two balls overlap by `overlap` amount, we push them apart proportionally to their masses (lighter ball moves more):
- a moves by: overlap * (b.m / totalMass) in the -n direction
- b moves by: overlap * (a.m / totalMass) in the +n direction

This ensures center of mass is preserved. ✓

Now let me also think about whether I need more substeps for stability. With 20 balls and speeds up to 4, and radius 0.4, the minimum time for a meaningful collision is about 0.8/4 = 0.2 seconds. With dt clamped to 1/30 ≈ 0.033s and 4 substeps, each substep is about 0.0083s. At speed 4, a ball moves 0.033 units per substep, which is much less than the radius 0.4. So 4 substeps should be fine.

Actually, let me use more substeps for safety. Let's use 8 substeps. That way each substep moves a ball at most 4 * (1/30) / 8 = 0.0167 units, which is well within the radius.

Let me finalize the code. I need to make sure it compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- No unused variables

One thing: `time` in setAnimationLoop - the callback receives a number (DOMHighResTimeStamp). Let me make sure the type is correct.

Actually, `renderer.setAnimationLoop` takes a callback `(time: number) => void` or `(time: DOMHighResTimeStamp) => void`. In strict mode, I should type it properly. Let me just use `time: number`.

Let me also make sure I handle the case where `lastTime` is 0 (first frame). I'll initialize it to -1 and handle that case.

Actually, a cleaner approach: track whether we've seen a frame before.

Let me write the final version now.
