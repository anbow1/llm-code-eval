Let me plan this carefully:

1. **Box**: Cube from -5 to +5 on every axis. Draw edges using LineSegments + EdgesGeometry.
2. **Balls**: 20 balls, radius 0.4, masses random 1..3. Start positions non-overlapping, fully inside box. Start velocities random, speed 2..4 units/s.
3. **Physics**: 
   - Elastic collisions with walls (reflect velocity, adjust position)
   - Elastic collisions between balls (use masses, conserve momentum and kinetic energy)
   - Substeps for stability
   - Separation of overlapping pairs
4. **Rendering**: Each ball as Mesh with SphereGeometry and MeshStandardMaterial. AmbientLight + DirectionalLight.
5. **Expose**: `__sim = { balls, step, paused }` where balls is array of plain objects `{ x, y, z, vx, vy, vz, r, m }`.
6. **Render loop**: Call step() with frame delta (clamped to 1/30) when not paused.
7. **Camera**: Placed so whole box is visible.

Let me think about the physics:

**Wall collisions**: When a ball hits a wall, reflect the velocity component and clamp position.
- If x - r < -5: x = -5 + r, vx = -vx
- If x + r > 5: x = 5 - r, vx = -vx
- Same for y and z

**Ball-ball elastic collisions**: 
For two balls with masses m1, m2, velocities v1, v2:
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- Only collide if approaching: dot(vrel, n) > 0
- Impulse: j = 2 * dot(vrel, n) / (1/m1 + 1/m2)
- v1 += (j/m1) * n
- v2 -= (j/m2) * n

Wait, let me re-derive. For elastic collision:
- v1' = v1 - (1 + e) * (dot(v1 - v2, n) / (m1 + m2)) * m1 * n  ... no let me be more careful.

For 1D elastic collision along normal n:
- v1n = dot(v1, n), v2n = dot(v2, n)
- v1n' = ((m1 - m2)/(m1 + m2)) * v1n + (2*m2/(m1+m2)) * v2n
- v2n' = ((m2 - m1)/(m1 + m2)) * v2n + (2*m1/(m1+m2)) * v1n

In 3D, we only change the component along n:
- v1 += (v1n' - v1n) * n = (v1n - v1n') ... wait

Let me use the impulse approach:
- n = normalize(p2 - p1)
- vrel = v1 - v2
- vrel_n = dot(vrel, n)
- If vrel_n > 0 (approaching), compute impulse:
  - j = 2 * vrel_n / (1/m1 + 1/m2)
  - v1 += (j/m1) * n
  - v2 -= (j/m2) * n

Wait, that's for the case where they're moving toward each other. Let me verify:
- vrel_n = dot(v1 - v2, n) where n points from ball1 to ball2
- If vrel_n > 0, ball1 is moving toward ball2 (they're approaching)
- After collision: v1_new = v1 + (j/m1)*n, v2_new = v2 - (j/m2)*n
- j = 2 * vrel_n / (1/m1 + 1/m2)

Let me verify conservation:
- Momentum: m1*v1 + m2*v2 → m1*(v1 + j/m1*n) + m2*(v2 - j/m2*n) = m1*v1 + m2*v2 + j*n - j*n = m1*v1 + m2*v2 ✓
- KE: For 1D along n: v1n' = v1n + j/m1, v2n' = v2n - j/m2
  - j = 2*vrel_n / (1/m1 + 1/m2) = 2*(v1n - v2n) / (1/m1 + 1/m2)
  - v1n' = v1n + 2*(v1n-v2n)/(m1*(1/m1+1/m2)) = v1n + 2*(v1n-v2n)/(1/m2 + 1) ... hmm let me just trust the formula.

Actually let me just use the standard formula:
- v1n' = v1n - (1 + e) * m2/(m1+m2) * (v1n - v2n)  for e=1
- v2n' = v2n + (1 + e) * m1/(m1+m2) * (v1n - v2n)  for e=1

So:
- v1n' = v1n - 2*m2/(m1+m2) * (v1n - v2n)
- v2n' = v2n + 2*m1/(m1+m2) * (v1n - v2n)

This is cleaner. In 3D:
- v1 += (v1n' - v1n) * n = -2*m2/(m1+m2) * (v1n - v2n) * n
- v2 += (v2n' - v2n) * n = 2*m1/(m1+m2) * (v1n - v2n) * n

Let me verify KE conservation:
- 0.5*m1*v1n'^2 + 0.5*m2*v2n'^2
- v1n' = v1n - 2*m2/(m1+m2)*(v1n-v2n)
- v2n' = v2n + 2*m1/(m1+m2)*(v1n-v2n)

Let u = v1n - v2n, M = m1+m2
- v1n' = v1n - 2*m2*u/M
- v2n' = v2n + 2*m1*u/M

KE = 0.5*m1*(v1n - 2*m2*u/M)^2 + 0.5*m2*(v2n + 2*m1*u/M)^2
= 0.5*m1*(v1n^2 - 4*m2*u*v1n/M + 4*m2^2*u^2/M^2) + 0.5*m2*(v2n^2 + 4*m1*u*v2n/M + 4*m1^2*u^2/M^2)
= 0.5*m1*v1n^2 + 0.5*m2*v2n^2 - 2*m1*m2*u*v1n/M + 2*m1*m2*u^2/M^2 + 2*m1*m2*u*v2n/M + 2*m1*m2*u^2/M^2
= 0.5*m1*v1n^2 + 0.5*m2*v2n^2 - 2*m1*m2*u*(v1n-v2n)/M + 4*m1*m2*u^2/M^2
= 0.5*m1*v1n^2 + 0.5*m2*v2n^2 - 2*m1*m2*u^2/M + 4*m1*m2*u^2/M^2
= 0.5*m1*v1n^2 + 0.5*m2*v2n^2 - 2*m1*m2*u^2/M + 4*m1*m2*u^2/M^2

Hmm, that doesn't look right. Let me try a different approach.

Actually, for the impulse method:
- j = 2 * vrel_n / (1/m1 + 1/m2) where vrel_n = dot(v1 - v2, n)

Then:
- v1_new = v1 + (j/m1) * n
- v2_new = v2 - (j/m2) * n

Let me verify with 1D (n = 1):
- v1n' = v1n + j/m1 = v1n + 2*(v1n-v2n)/(m1*(1/m1+1/m2)) = v1n + 2*(v1n-v2n)/(1/m2 + 1)
  = v1n + 2*(v1n-v2n)*m2/(m1+m2)
  = v1n + 2*m2*(v1n-v2n)/(m1+m2)

Hmm wait: 1/m1 + 1/m2 = (m1+m2)/(m1*m2)
So j = 2*(v1n-v2n) / ((m1+m2)/(m1*m2)) = 2*(v1n-v2n)*m1*m2/(m1+m2)

v1n' = v1n + j/m1 = v1n + 2*(v1n-v2n)*m2/(m1+m2)
v2n' = v2n - j/m2 = v2n - 2*(v1n-v2n)*m1/(m1+m2)

Let me check: v1n' + v2n' ... no, let me check momentum:
m1*v1n' + m2*v2n' = m1*(v1n + 2*m2*(v1n-v2n)/(m1+m2)) + m2*(v2n - 2*m1*(v1n-v2n)/(m1+m2))
= m1*v1n + 2*m1*m2*(v1n-v2n)/(m1+m2) + m2*v2n - 2*m1*m2*(v1n-v2n)/(m1+m2)
= m1*v1n + m2*v2n ✓

KE:
0.5*m1*v1n'^2 + 0.5*m2*v2n'^2
= 0.5*m1*(v1n + 2*m2*u/(m1+m2))^2 + 0.5*m2*(v2n - 2*m1*u/(m1+m2))^2 where u = v1n-v2n

Let a = 2*m2*u/(m1+m2), b = 2*m1*u/(m1+m2)
= 0.5*m1*(v1n+a)^2 + 0.5*m2*(v2n-b)^2
= 0.5*m1*(v1n^2 + 2*v1n*a + a^2) + 0.5*m2*(v2n^2 - 2*v2n*b + b^2)
= 0.5*m1*v1n^2 + m1*v1n*a + 0.5*m1*a^2 + 0.5*m2*v2n^2 - m2*v2n*b + 0.5*m2*b^2

Now m1*a = m1*2*m2*u/(m1+m2) = 2*m1*m2*u/(m1+m2)
m2*b = m2*2*m1*u/(m1+m2) = 2*m1*m2*u/(m1+m2)

So m1*v1n*a - m2*v2n*b = 2*m1*m2*u/(m1+m2) * (v1n - v2n) = 2*m1*m2*u^2/(m1+m2)

And 0.5*m1*a^2 + 0.5*m2*b^2 = 0.5*m1*(4*m2^2*u^2/(m1+m2)^2) + 0.5*m2*(4*m1^2*u^2/(m1+m2)^2)
= 2*m1*m2^2*u^2/(m1+m2)^2 + 2*m1^2*m2*u^2/(m1+m2)^2
= 2*m1*m2*u^2*(m2+m1)/(m1+m2)^2
= 2*m1*m2*u^2/(m1+m2)

Total extra = 2*m1*m2*u^2/(m1+m2) + 2*m1*m2*u^2/(m1+m2) = 4*m1*m2*u^2/(m1+m2)

Wait, that's the extra KE. But original KE = 0.5*m1*v1n^2 + 0.5*m2*v2n^2. So the new KE = original + 4*m1*m2*u^2/(m1+m2)? That can't be right for elastic collision.

I think I made an error. Let me redo more carefully.

Actually wait, I think the issue is that I'm computing KE in the normal direction only. The tangential components don't change. So total KE should be conserved.

Let me just verify with a simple case: m1=1, m2=1, v1=1, v2=0 (1D)
- u = 1
- j = 2*1/(1+1) = 1
- v1' = 1 + 1/1 = 2... wait that's wrong. For equal masses, they should swap velocities.

Hmm, j = 2*u/(1/m1 + 1/m2) = 2*1/(1+1) = 1
v1' = v1 + j/m1 = 1 + 1 = 2
v2' = v2 - j/m2 = 0 - 1 = -1

That's wrong! For equal masses, v1 should become 0 and v2 should become 1.

I think the issue is the sign convention. Let me reconsider.

If n points from ball1 to ball2, and vrel = v1 - v2, then vrel_n = dot(v1-v2, n). If they're approaching, vrel_n > 0 (ball1 moving toward ball2).

The impulse should REDUCE v1n and INCREASE v2n (push them apart).

So: v1' = v1 - (j/m1)*n and v2' = v2 + (j/m2)*n

Let me redo: j = 2*u/(1/m1 + 1/m2) = 2*u*m1*m2/(m1+m2)

v1' = v1 - j/m1 * n = v1 - 2*m2*u/(m1+m2) * n
v2' = v2 + j/m2 * n = v2 + 2*m1*u/(m1+m2) * n

For m1=m2=1, v1=1, v2=0, n=1:
v1' = 1 - 2*1*1/2 = 0 ✓
v2' = 0 + 2*1*1/2 = 1 ✓

Great, so the correct formula is:
- v1 += -2*m2/(m1+m2) * u * n  (where u = dot(v1-v2, n))
- v2 += 2*m1/(m1+m2) * u * n

And we only apply this when u > 0 (approaching).

Now for the substeps: I'll use a fixed substep of maybe 1/60 or 1/120 seconds, and call it multiple times within a frame.

Let me also handle the separation: after collision detection, if balls are still overlapping (distance < 2*r), push them apart.

For non-overlapping start positions: I'll use a rejection sampling approach. Place each ball at a random position, check it doesn't overlap with existing balls, and is fully inside the box.

Let me write the code now.

```typescript
import * as THREE from 'three';

// --- Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Box edges
const boxGeom = new THREE.BoxGeometry(10, 10, 10);
const edgesGeom = new THREE.EdgesGeometry(boxGeom);
const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeom, edgesMat);
scene.add(boxEdges);

// Balls
const R = 0.4;
const BOX = 5;
const N = 20;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

function randomInBox(r: number): { x: number; y: number; z: number } {
  const lo = -BOX + r;
  const hi = BOX - r;
  return {
    x: lo + Math.random() * (hi - lo),
    y: lo + Math.random() * (hi - lo),
    z: lo + Math.random() * (hi - lo),
  };
}

function overlaps(a: Ball, b: Ball): boolean {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  return dist < a.r + b.r;
}

const balls: Ball[] = [];
for (let i = 0; i < N; i++) {
  let p: { x: number; y: number; z: number };
  let attempts = 0;
  do {
    p = randomInBox(R);
    const b: Ball = { ...p, vx: 0, vy: 0, vz: 0, r: R, m: 1 + Math.random() * 2 };
    if (balls.every(o => !overlaps(b, o))) {
      balls.push(b);
    }
    attempts++;
  } while (attempts < 500);
  // If we couldn't find a spot (very unlikely), force it
  if (balls.length < N) {
    const b: Ball = { ...p, vx: 0, vy: 0, vz: 0, r: R, m: 1 + Math.random() * 2 };
    balls.push(b);
  }
}

// Random velocities, speed 2..4
for (const b of balls) {
  const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  dir.normalize();
  const speed = 2 + Math.random() * 2;
  b.vx = dir.x * speed;
  b.vy = dir.y * speed;
  b.vz = dir.z * speed;
}

// Meshes
const sphereGeom = new THREE.SphereGeometry(R, 24, 16);
const ballMeshes: THREE.Mesh[] = [];
for (let i = 0; i < N; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / N, 0.7, 0.5),
    roughness: 0.4,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  scene.add(mesh);
  ballMeshes.push(mesh);
}

// Physics step
function substep(dt: number): void {
  // Integrate positions
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }

  // Wall collisions
  for (const b of balls) {
    if (b.x - b.r < -BOX) { b.x = -BOX + b.r; b.vx = -b.vx; }
    if (b.x + b.r > BOX) { b.x = BOX - b.r; b.vx = -b.vx; }
    if (b.y - b.r < -BOX) { b.y = -BOX + b.r; b.vy = -b.vy; }
    if (b.y + b.r > BOX) { b.y = BOX - b.r; b.vy = -b.vy; }
    if (b.z - b.r < -BOX) { b.z = -BOX + b.r; b.vz = -b.vz; }
    if (b.z + b.r > BOX) { b.z = BOX - b.r; b.vz = -b.vz; }
  }

  // Ball-ball collisions
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const minDist = a.r + b.r;
      if (dist < minDist && dist > 0) {
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
        if (vrel > 0) {
          const M = a.m + b.m;
          const factor = 2 * vrel / M;
          a.vx -= factor * b.m * nx;
          a.vy -= factor * b.m * ny;
          a.vz -= factor * b.m * nz;
          b.vx += factor * a.m * nx;
          b.vy += factor * a.m * ny;
          b.vz += factor * a.m * nz;
        }
        // Separate overlapping balls
        const overlap = minDist - dist;
        if (overlap > 0) {
          a.x -= overlap * 0.5 * nx;
          a.y -= overlap * 0.5 * ny;
          a.z -= overlap * 0.5 * nz;
          b.x += overlap * 0.5 * nx;
          b.y += overlap * 0.5 * ny;
          b.z += overlap * 0.5 * nz;
        }
      }
    }
  }
}

function step(dt: number): void {
  const substepDt = 1 / 120;
  let remaining = dt;
  while (remaining > 0) {
    const s = Math.min(substepDt, remaining);
    substep(s);
    remaining -= s;
  }
}

// Expose
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
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1 / 30);
  const sim = (window as any).__sim;
  if (!sim.paused) {
    step(delta);
  }
  // Sync meshes
  for (let i = 0; i < N; i++) {
    const b = balls[i];
    ballMeshes[i].position.set(b.x, b.y, b.z);
  }
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to be careful with the `step` function reference. The `__sim` object has `step` as a function. But I also reference `step` in the render loop. Let me make sure they're the same function.

Actually, looking at the requirement: `__sim = { balls, step, paused }` where `step(dt: number)` advances the physics. The render loop calls `step()` with the frame delta. So I should use the same `step` function.

Let me also make sure the `paused` property is a boolean that the render loop checks. I'll use `sim.paused` which is a mutable property on the object.

One issue: the `step` function in `__sim` should be the same function used in the render loop. Let me structure it so that the render loop calls `(window as any).__sim.step(delta)`.

Actually, let me re-read: "The render loop calls step() with the frame delta (clamp it to at most 1/30 s) when not paused."

So the render loop should:
1. Get delta from clock
2. Clamp to 1/30
3. If not paused, call step(delta)
4. Sync meshes
5. Render

Let me also double-check the collision formula. The factor approach:
- vrel = dot(v_a - v_b, n) where n points from a to b
- If vrel > 0, they're approaching
- M = m_a + m_b
- factor = 2 * vrel / M
- a.v -= factor * m_b * n
- b.v += factor * m_a * n

Let me verify with equal masses m_a = m_b = 1, v_a = (1,0,0), v_b = (0,0,0), n = (1,0,0):
- vrel = 1
- M = 2
- factor = 2*1/2 = 1
- a.v -= 1 * 1 * (1,0,0) = (0,0,0) ✓
- b.v += 1 * 1 * (1,0,0) = (1,0,0) ✓

Good. Let me verify with m_a = 2, m_b = 1, v_a = (1,0,0), v_b = (0,0,0), n = (1,0,0):
- vrel = 1
- M = 3
- factor = 2/3
- a.v -= (2/3)*1*(1,0,0) = (1/3, 0, 0)
- b.v += (2/3)*2*(1,0,0) = (4/3, 0, 0)

Check momentum: 2*(1/3) + 1*(4/3) = 2/3 + 4/3 = 2 ✓ (original: 2*1 + 1*0 = 2)
Check KE: 0.5*2*(1/3)^2 + 0.5*1*(4/3)^2 = 0.5*2/9 + 0.5*16/9 = 1/9 + 8/9 = 1 ✓ (original: 0.5*2*1 + 0 = 1)



Now let me also make sure the `step` function is properly typed. The `__sim` object should have `step` as a function that takes a number.

Let me finalize the code. I need to make sure it compiles with `tsc --strict`. Let me be careful with types.

Actually, I realize I should be more careful about the `clock.getDelta()` - on the first call it might return 0 or a large value. Using `THREE.Clock` should handle this properly since it starts on first call.

Let me also think about whether I need to handle the case where `dt` is 0 (first frame). If delta is 0, step(0) would just do nothing, which is fine.

One more thing: the requirement says "After the first frame is rendered, set (window as any).__ready = true." So I should set it after the first render call.

Let me write the final version.
