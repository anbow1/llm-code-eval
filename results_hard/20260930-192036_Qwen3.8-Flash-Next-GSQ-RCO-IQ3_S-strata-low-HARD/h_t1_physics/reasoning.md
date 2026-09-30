The user wants a complete TypeScript file that:
1. Uses Three.js to render 20 balls bouncing inside a box
2. Implements elastic collisions (walls and between balls)
3. Exposes the simulation for testing
4. Follows strict TypeScript compilation rules

Let me plan the implementation:

1. **Scene setup**: Camera, renderer, lights, box edges, 20 ball meshes
2. **Ball data**: 20 balls with random positions (non-overlapping, inside box), random velocities (speed 2-4), random masses (1-3), radius 0.4
3. **Physics step**: 
   - Substeps for stability
   - Wall collisions (elastic, reflect velocity when hitting boundary)
   - Ball-ball elastic collisions (using masses, conserving momentum and kinetic energy)
   - Separate overlapping pairs
4. **Render loop**: Uses `setAnimationLoop`, clamps delta to 1/30s, calls step() when not paused

Key considerations:
- Elastic collision between two balls: use the standard 1D collision formula projected onto the collision normal
- Wall collision: when ball center is within radius of wall, reflect velocity component
- Non-overlapping initial positions: I'll use a rejection sampling approach
- Substeps: divide dt into smaller steps (e.g., 4 substeps)

For elastic collision between two balls with masses m1, m2:
- Find collision normal n = (p2 - p1) / |p2 - p1|
- Relative velocity along normal: v_rel = dot(v1 - v2, n)
- If v_rel > 0 (approaching), apply impulse:
  - j = 2 * m1 * m2 / (m1 + m2) * v_rel
  - v1 -= j / m1 * n
  - v2 += j / m2 * n

For wall collision: if ball center < -5 + r or > 5 - r on any axis, reflect that velocity component.

Let me write this out carefully.

For the camera, I'll place it at a distance that shows the whole box. The box goes from -5 to 5, so it's 10 units wide. A camera at distance ~20 should work with a FOV of 60 degrees.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Box edges
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const edges = new THREE.EdgesGeometry(boxGeometry);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const wireframe = new THREE.LineSegments(edges, lineMaterial);
scene.add(wireframe);

// Balls
const R = 0.4;
const BALL_COUNT = 20;

interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

const balls: Ball[] = [];
const meshes: THREE.Mesh[] = [];

function generatePosition(): [number, number, number] {
  const margin = R + 0.1;
  while (true) {
    const x = (Math.random() * 2 - 1) * (5 - margin);
    const y = (Math.random() * 2 - 1) * (5 - margin);
    const z = (Math.random() * 2 - 1) * (5 - margin);
    
    let valid = true;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dz = z - b.z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 2 * R + 0.1) {
        valid = false;
        break;
      }
    }
    if (valid) return [x, y, z];
  }
}

const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x44ff88, 0x8844ff, 0xff4488];

for (let i = 0; i < BALL_COUNT; i++) {
  const [x, y, z] = generatePosition();
  const speed = 2 + Math.random() * 2;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const vx = speed * Math.sin(phi) * Math.cos(theta);
  const vy = speed * Math.sin(phi) * Math.sin(theta);
  const vz = speed * Math.cos(phi);
  const m = 1 + Math.random() * 2;
  
  const ball: Ball = { x, y, z, vx, vy, vz, r: R, m };
  balls.push(ball);
  
  const geo = new THREE.SphereGeometry(R, 32, 16);
  const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  meshes.push(mesh);
}

// Physics
function step(dt: number): void {
  const substeps = 4;
  const h = dt / substeps;
  
  for (let s = 0; s < substeps; s++) {
    // Move balls
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }
    
    // Wall collisions
    for (const b of balls) {
      if (b.x < -5 + b.r) { b.x = -5 + b.r; b.vx = Math.abs(b.vx); }
      if (b.x > 5 - b.r) { b.x = 5 - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < -5 + b.r) { b.y = -5 + b.r; b.vy = Math.abs(b.vy); }
      if (b.y > 5 - b.r) { b.y = 5 - b.r; b.vy = -Math.abs(b.vy); }
      if (b.z < -5 + b.r) { b.z = -5 + b.r; b.vz = Math.abs(b.vz); }
      if (b.z > 5 - b.r) { b.z = 5 - b.r; b.vz = -Math.abs(b.vz); }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = a.r + b.r;
        
        if (dist < minDist && dist > 0.0001) {
          // Collision normal
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
          const dvn = dvx * nx + dvy * ny + dvz * nz;
          
          if (dvn > 0) {
            const j_impulse = 2 * dvn / (1/a.m + 1/b.m);
            // Wait, let me redo this properly.
            // For elastic collision:
            // j = 2 * m1 * m2 / (m1 + m2) * dvn
            // v1 -= j/m1 * n
            // v2 += j/m2 * n
            const impulse = (2 * a.m * b.m / (a.m + b.m)) * dvn;
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
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

// Render loop
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  if (!sim.paused) {
    step(dt);
  }
  
  // Sync meshes with physics
  for (let i = 0; i < balls.length; i++) {
    meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
  }
  
  renderer.render(scene, camera);
  
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to check TypeScript strict mode. Let me think about potential issues:
- `const clock = new THREE.Clock()` - fine
- The `generatePosition` function needs a return type that TS can infer properly. Let me use explicit typing.
- Actually with `as const` or explicit tuple return... Let me use a different approach to avoid tuple type issues.

Let me also double-check the elastic collision formula:
- Two balls with masses m1, m2, velocities v1, v2
- Collision normal n = (p2 - p1) / |p2 - p1|
- Relative velocity along normal: dvn = (v1 - v2) · n
- If dvn > 0, they're approaching
- Impulse magnitude: j = 2 * m1 * m2 * dvn / (m1 + m2)
- Update: v1 -= (j/m1) * n, v2 += (j/m2) * n

This conserves both momentum and kinetic energy for elastic collisions. Let me verify:
- Momentum before: m1*v1 + m2*v2
- Change in momentum of ball 1: -(j/m1) * n * m1 = -j*n
- Change in momentum of ball 2: +(j/m2) * n * m2 = +j*n
- Net change: 0 ✓

- KE: The formula j = 2*m1*m2*dvn/(m1+m2) is the standard elastic collision impulse. ✓

Let me also make sure I'm handling the TypeScript strict mode properly. The `as any` casts should handle the window properties. The function parameters are typed. The interfaces are defined. I think this should compile cleanly.

One issue: `new THREE.Clock()` and `clock.getDelta()` - the first call to getDelta() will return a very small number since the clock hasn't started yet. Actually THREE.Clock starts automatically. The first getDelta() call will return the time since the clock was created. This should be fine since we're clamping to 1/30 anyway.

Let me finalize the code.
