The user wants a complete TypeScript file that simulates 20 balls bouncing inside a box using Three.js. Let me plan this carefully:

1. **Box**: Cube from -5 to +5 on all axes, drawn with LineSegments + EdgesGeometry
2. **Balls**: 20 balls, radius 0.4, random masses (1-3), non-overlapping start positions fully inside box, random velocities (speed 2-4)
3. **Physics**: Perfectly elastic collisions (walls + ball-ball), conserve momentum and kinetic energy, use masses, substeps for stability, separate overlapping pairs
4. **Rendering**: Each ball as Mesh with SphereGeometry + MeshStandardMaterial, AmbientLight + DirectionalLight, keep meshes in sync
5. **Expose**: `__sim = { balls, step, paused }` where step(dt) advances physics with substeps, paused boolean controls whether step is called
6. **Render loop**: setAnimationLoop, clamp delta to 1/30, call step only when not paused

Let me think about the physics:

**Wall collisions**: For each axis, if ball position + radius > 5 or position - radius < -5, reflect velocity on that axis. Clamp position.

**Ball-ball collisions**: For perfectly elastic collision between two balls with masses m1, m2:
- Check if distance between centers < r1 + r2 (overlap)
- If overlapping, separate them along the collision normal
- Apply elastic collision formula using masses

Elastic collision formula for velocity components along the collision normal:
- v1_new = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
- v2_new = v2 - (2*m1/(m1+m2)) * dot(v2-v1, n) * n

where n is the unit vector from ball1 to ball2.

**Substeps**: I'll use multiple substeps per frame for stability.

**Non-overlapping initial positions**: I'll use rejection sampling - pick random position inside box, check against all existing balls, if overlap, pick again.

Let me write the code:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Box edges
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const edges = new THREE.EdgesGeometry(boxGeometry);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const wireframe = new THREE.LineSegments(edges, lineMaterial);
scene.add(wireframe);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Balls
interface BallState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const RADIUS = 0.4;
const NUM_BALLS = 20;
const balls: BallState[] = [];
const meshes: THREE.Mesh[] = [];

// Generate non-overlapping positions
for (let i = 0; i < NUM_BALLS; i++) {
  let x: number, y: number, z: number;
  let valid: boolean;
  do {
    x = (Math.random() * 2 - 1) * (5 - RADIUS);
    y = (Math.random() * 2 - 1) * (5 - RADIUS);
    z = (Math.random() * 2 - 1) * (5 - RADIUS);
    valid = true;
    for (const b of balls) {
      const dx = x - b.x, dy = y - b.y, dz = z - b.z;
      if (dx*dx + dy*dy + dz*dz < (RADIUS + RADIUS) * (RADIUS + RADIUS)) {
        valid = false;
        break;
      }
    }
  } while (!valid);
  
  const speed = 2 + Math.random() * 2; // 2..4
  const dirX = Math.random() * 2 - 1;
  const dirY = Math.random() * 2 - 1;
  const dirZ = Math.random() * 2 - 1;
  const dirLen = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ) || 1;
  
  const mass = 1 + Math.random() * 2; // 1..3
  
  balls.push({
    x, y, z,
    vx: (dirX / dirLen) * speed,
    vy: (dirY / dirLen) * speed,
    vz: (dirZ / dirLen) * speed,
    r: RADIUS,
    m: mass
  });
  
  const sphereGeo = new THREE.SphereGeometry(RADIUS, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics step function
function step(dt: number): void {
  const SUBSTEPS = 16;
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
      const bound = 5 - b.r;
      if (b.x < -bound) { b.x = -bound; b.vx = Math.abs(b.vx); }
      if (b.x > bound) { b.x = bound; b.vx = -Math.abs(b.vx); }
      if (b.y < -bound) { b.y = -bound; b.vy = Math.abs(b.vy); }
      if (b.y > bound) { b.y = bound; b.vy = -Math.abs(b.vy); }
      if (b.z < -bound) { b.z = -bound; b.vz = Math.abs(b.vz); }
      if (b.z > bound) { b.z = bound; b.vz = -Math.abs(b.vz); }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const minDist = a.r + b.r;
        
        if (dist < minDist) {
          // Normal vector
          const nx = dist > 0 ? dx / dist : 1;
          const ny = dist > 0 ? dy / dist : 0;
          const nz = dist > 0 ? dz / dist : 0;
          
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
          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const relVz = a.vz - b.vz;
          const dv = relVx * nx + relVy * ny + relVz * nz;
          
          if (dv > 0) {
            // Only if approaching
            const factorA = 2 * b.m / totalMass;
            const factorB = 2 * a.m / totalMass;
            a.vx -= dv * factorA * nx;
            a.vy -= dv * factorA * ny;
            a.vz -= dv * factorA * nz;
            b.vx += dv * factorB * nx;
            b.vy += dv * factorB * ny;
            b.vz += dv * factorB * nz;
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

// Expose simulation
(window as any).__sim = {
  balls,
  step,
  paused: false
};

// Render loop
let lastTime = 0;
renderer.setAnimationLoop((time: number) => {
  if (lastTime === 0) {
    lastTime = time;
    return;
  }
  let delta = (time - lastTime) / 1000;
  lastTime = time;
  if (delta > 1/30) delta = 1/30;
  
  if (!(window as any).__sim.paused) {
    step(delta);
  }
  syncMeshes();
  renderer.render(scene, camera);
  
  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose scene, camera, renderer
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about the `paused` property. The spec says `__sim.paused` is a boolean. When I set it on the object, I need to make sure reading it works correctly. Let me use a property on the object directly.

Also, I need to make sure `tsc --strict` compiles. Let me check for strict mode issues:
- `setAnimationLoop` callback: the `time` parameter is `number` in Three.js types. Actually in newer Three.js, the callback signature is `(time: number) => void`. Let me check - actually it might be `(time: number, frame?: XRFrame) => void` in some versions. I'll just use `time: number`.

Actually, looking at Three.js types more carefully, `setAnimationLoop` accepts `((time: number) => void) | null`. The callback parameter is `time: number`. That should be fine.

Let me also make sure the `paused` boolean works correctly. The object `__sim` has a `paused` property that can be toggled. When I read `(window as any).__sim.paused`, it should work.

One issue: in strict TypeScript, I need to be careful with the `do...while` loop - TypeScript should be fine with that.

Let me also double-check the elastic collision formula:
- For two balls with masses m1, m2 approaching each other with relative velocity component along collision normal dv > 0 (approaching):
  - v1_new_normal = v1_normal - (2*m2/(m1+m2)) * dv
  - v2_new_normal = v2_normal + (2*m1/(m1+m2)) * dv

This is correct for elastic collisions. It conserves momentum (m1*v1 + m2*v2) and kinetic energy.

Let me verify: 
- Momentum before: m1*v1n + m2*v2n
- dv = v1n - v2n (relative velocity along normal, positive means approaching)
- v1n_new = v1n - 2*m2/(m1+m2) * dv
- v2n_new = v2n + 2*m1/(m1+m2) * dv

Momentum after: m1*(v1n - 2m2/(m1+m2)*dv) + m2*(v2n + 2m1/(m1+m2)*dv)
= m1*v1n - 2m1*m2/(m1+m2)*dv + m2*v2n + 2m1*m2/(m1+m2)*dv
= m1*v1n + m2*v2n ✓

KE: Let me verify with a simple case. m1=m2=1, v1n=1, v2n=-1. dv=2.
v1n_new = 1 - 2*1/2*2 = 1-2 = -1
v2n_new = -1 + 2*1/2*2 = -1+2 = 1
KE before: 0.5+0.5=1, KE after: 0.5+0.5=1 ✓

Good. The formula is correct.

Now let me also handle the edge case where dist is 0 (perfectly overlapping). I'll use a fallback normal direction.

I think the code is ready. Let me write it out cleanly.
