Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions.

Key requirements:
1. Import THREE from 'three'
2. WebGLRenderer, append canvas to document.body
3. Size from window.innerWidth/innerHeight, handle resize
4. renderer.setAnimationLoop
5. Box from -5 to +5 on every axis, draw edges
6. 20 balls, radius 0.4, masses 1..3 (at least two different)
7. Start positions non-overlapping, fully inside box
8. Random velocities, speed 2..4 units/s
9. Perfectly elastic collisions with walls and between balls (use masses, conserve momentum and KE)
10. Balls never leave box, never stay overlapping (separate overlapping pairs)
11. Each ball as Mesh with SphereGeometry and MeshStandardMaterial
12. AmbientLight + DirectionalLight
13. Keep meshes in sync with physics
14. Expose __scene, __camera, __renderer, __ready, __sim
15. __sim = { balls, step, paused }
16. balls is array of plain objects { x, y, z, vx, vy, vz, r, m }
17. step(dt) advances physics with substeps
18. paused: when true, render loop keeps rendering but doesn't call step()
19. Render loop clamps delta to 1/30 s
20. Camera so whole box is visible

Let me think about the physics:

Wall collision:
- If ball position.x - r < -5, reflect vx and set x = -5 + r
- If ball position.x + r > 5, reflect vx and set x = 5 - r
- Same for y and z

Ball-ball elastic collision:
- Check distance between centers < r1 + r2
- Separate them (push apart along collision normal)
- Apply elastic collision formula using masses

For the elastic collision between two balls:
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- Velocity along normal: vrel_n = dot(vrel, n)
- If vrel_n > 0, they're separating, no collision
- Impulse: j = (2 * vrel_n) / (1/m1 + 1/m2)
- v1 -= (j / m1) * n
- v2 += (j / m2) * n

Wait, let me be more careful. The standard formula:

For two balls with positions p1, p2, velocities v1, v2, masses m1, m2:
- n = normalize(p2 - p1)
- vrel = v1 - v2
- vrel_n = dot(vrel, n)
- If vrel_n > 0 (approaching), compute impulse:
  - j = (2 * vrel_n) / (1/m1 + 1/m2)
  - v1 -= (j / m1) * n
  - v2 += (j / m2) * n

Wait, let me re-derive. In 1D elastic collision:
v1' = v1 - (2*m2/(m1+m2)) * (v1-v2) * n
v2' = v2 + (2*m1/(m1+m2)) * (v1-v2) * n

where (v1-v2) * n is the relative velocity along the normal.

Actually let me use the impulse formulation:
- n = normalize(p2 - p1)  (normal from ball1 to ball2)
- vrel = v1 - v2  (relative velocity of 1 w.r.t. 2)
- vrel_n = dot(vrel, n)
- If vrel_n > 0 (they're approaching):
  - impulse magnitude: j = (2 * vrel_n) / (1/m1 + 1/m2)
  - v1 -= (j/m1) * n
  - v2 += (j/m2) * n

This conserves momentum and kinetic energy for elastic collisions.

For separation (position correction):
- overlap = (r1 + r2) - distance
- If overlap > 0:
  - correction = overlap / 2 (or proportional to inverse mass)
  - p1 -= correction * n
  - p2 += correction * n

Actually for proper mass-weighted separation:
- p1 -= (overlap / (m1 + m2)) * m2 * n... hmm, actually let me just split evenly or use inverse mass weights.

Let me use inverse mass weighting:
- w1 = 1/m1, w2 = 1/m2
- total_w = w1 + w2
- p1 -= n * overlap * (w1 / total_w)
- p2 += n * overlap * (w2 / total_w)

For substeps: I'll divide dt into multiple substeps (e.g., 4 or 8) for stability.

Let me also make sure start positions don't overlap. I'll use a rejection sampling approach:
- Place each ball randomly, check against all previous balls
- If overlapping, try again (with a max retry count)

Box boundaries for ball center: -5 + r to 5 - r, which is -4.6 to 4.6.

Let me write the code now.

For the camera: the box is 10x10x10 centered at origin. I'll place the camera at something like (10, 8, 10) looking at origin. That should show the whole box.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 8, 10);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Box
const BOX = 5;
const R = 0.4;
const boxGeo = new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2);
const boxEdges = new THREE.EdgesGeometry(boxGeo);
const boxLines = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0xffffff }));
scene.add(boxLines);

// Ball state
interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const NUM_BALLS = 20;
const balls: BallState[] = [];

// Generate non-overlapping positions
function randomInBox(): [number, number, number] {
  const min = -BOX + R;
  const max = BOX - R;
  return [
    min + Math.random() * (max - min),
    min + Math.random() * (max - min),
    min + Math.random() * (max - min)
  ];
}

function generateVelocity(): [number, number, number] {
  const speed = 2 + Math.random() * 2; // 2..4
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    speed * Math.sin(phi) * Math.cos(theta),
    speed * Math.sin(phi) * Math.sin(theta),
    speed * Math.cos(phi)
  ];
}

for (let i = 0; i < NUM_BALLS; i++) {
  let pos: [number, number, number];
  let tries = 0;
  do {
    pos = randomInBox();
    tries++;
  } while (tries < 1000 && balls.some(b => {
    const dx = b.x - pos[0], dy = b.y - pos[1], dz = b.z - pos[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz) < 2 * R;
  }));
  
  const [vx, vy, vz] = generateVelocity();
  const m = 1 + Math.random() * 2; // 1..3
  balls.push({ x: pos[0], y: pos[1], z: pos[2], vx, vy, vz, r: R, m });
}

// Create meshes
const sphereGeo = new THREE.SphereGeometry(R, 32, 32);
const meshes: THREE.Mesh[] = [];
const colors = new Array(NUM_BALLS).fill(0).map(() => 
  new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
);

for (let i = 0; i < NUM_BALLS; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.4, metalness: 0.3 });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step with substeps
function stepPhysics(dt: number): void {
  const SUBSTEPS = 4;
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
      const lo = -BOX + b.r;
      const hi = BOX - b.r;
      
      if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx); }
      else if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx); }
      
      if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy); }
      else if (b.y > hi) { b.y = hi; b.vy = -Math.abs(b.vy); }
      
      if (b.z < lo) { b.z = lo; b.vz = Math.abs(b.vz); }
      else if (b.z > hi) { b.z = hi; b.vz = -Math.abs(b.vz); }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const minDist = a.r + b.r;
        
        if (dist < minDist && dist > 0.0001) {
          // Normal
          const nx = dx / dist, ny = dy / dist, nz = dz / dist;
          
          // Separate
          const overlap = minDist - dist;
          const wa = 1 / a.m, wb = 1 / b.m;
          const wTotal = wa + wb;
          
          a.x -= nx * overlap * (wa / wTotal);
          a.y -= ny * overlap * (wa / wTotal);
          a.z -= nz * overlap * (wa / wTotal);
          b.x += nx * overlap * (wb / wTotal);
          b.y += ny * overlap * (wb / wTotal);
          b.z += nz * overlap * (wb / wTotal);
          
          // Elastic collision (only if approaching)
          const rvx = a.vx - b.vx, rvy = a.vy - b.vy, rvz = a.vz - b.vz;
          const rvn = rvx * nx + rvy * ny + rvz * nz;
          
          if (rvn > 0) {
            const j_impulse = (2 * rvn) / wTotal;
            a.vx -= (j_impulse * wa) * nx;
            a.vy -= (j_impulse * wa) * ny;
            a.vz -= (j_impulse * wa) * nz;
            b.vx += (j_impulse * wb) * nx;
            b.vy += (j_impulse * wb) * ny;
            b.vz += (j_impulse * wb) * nz;
          }
        }
      }
    }
  }
}

// Sim object
const sim = {
  balls,
  step: (dt: number) => stepPhysics(dt),
  paused: false
};

// Expose
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
let lastTime: number | null = null;
let ready = false;

function animate(time: number): void {
  if (lastTime === null) lastTime = time;
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  
  dt = Math.min(dt, 1 / 30);
  
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
}

renderer.setAnimationLoop(animate);
```

Wait, I need to check the `renderer.setAnimationLoop` callback signature. In Three.js, it's `setAnimationLoop(callback: ((time: DOMHighResTimeStamp) => void) | null)`. The time parameter is a DOMHighResTimeStamp (number). So `animate(time: number)` should work.

Let me also double-check: the `step` function in `__sim` should be a method that advances physics. When `paused` is true, the render loop should NOT call step. That's handled.

Let me also make sure the types are correct for strict mode. The `setAnimationLoop` callback receives a `number` (DOMHighResTimeStamp). Let me verify the signature.

Actually, looking at Three.js types, `setAnimationLoop` accepts `((time: DOMHighResTimeStamp) => void) | null`. `DOMHighResTimeStamp` is `number` in TypeScript's DOM types. So `time: number` should work.

Let me also make sure I'm handling the `wa` and `wb` correctly. The impulse formula:
- j = 2 * rvn / (1/m1 + 1/m2) = 2 * rvn / (wa + wb)
- Δv1 = -j / m1 * n = -j * wa * n
- Δv2 = +j / m2 * n = +j * wb * n

So:
- a.vx -= (j_impulse * wa) * nx  ✓
- b.vx += (j_impulse * wb) * nx  ✓

This looks correct. Let me verify conservation:
- Momentum: m1*Δv1 + m2*Δv2 = m1*(-j/m1*n) + m2*(j/m2*n) = -j*n + j*n = 0 ✓
- KE conservation: This is the standard elastic collision formula, so it's correct.

Let me also make sure the code compiles with `tsc --strict`. I need to be careful about:
- No implicit any
- All variables typed
- No unused variables

Let me refine and write the final version. I think I should also handle the case where `dist` could be 0 (balls at exact same position) - I already check `dist > 0.0001`.

One more thing: I should use `const` where possible and make sure all types are explicit.

Actually, let me reconsider the substep count. With 20 balls and radius 0.4, in a 10x10x10 box, the minimum distance between centers is 0.8. With max speed 4 units/s, in one frame (1/30 s = 0.033s), a ball moves about 0.13 units. That's well within the radius, so 4 substeps should be plenty. Even 2 would work, but 4 is safer.

Let me finalize the code.
