Let me break down the requirements:

1. **Box**: Cube from -5 to +5 on every axis, drawn with edges (LineSegments + EdgesGeometry)
2. **Balls**: 20 balls, radius 0.4, masses random 1..3 (at least two different masses)
3. **Start positions**: Non-overlapping, fully inside the box
4. **Start velocities**: Random, speed about 2..4 units/s
5. **Physics**: 
   - Perfectly elastic collisions with walls
   - Perfectly elastic collisions between balls (using masses, conserve momentum and KE)
   - Balls must never leave the box
   - Balls must never stay overlapping (separate overlapping pairs)
6. **Rendering**: Each ball as Mesh with SphereGeometry + MeshStandardMaterial, AmbientLight + DirectionalLight
7. **Expose**: `(window as any).__sim = { balls, step, paused }`
   - balls: array of plain objects { x, y, z, vx, vy, vz, r, m }
   - step(dt): advances physics by dt seconds with substeps
   - paused: boolean - when true, render loop keeps rendering but doesn't call step()
8. **Render loop**: calls step() with frame delta (clamped to 1/30s) when not paused
9. **Camera**: placed so whole box is visible

Let me think about the physics:

**Wall collisions**: When a ball hits a wall, reflect the velocity component. For a box from -5 to +5 with radius 0.4:
- If x - r < -5, set x = -5 + r, vx = |vx|
- If x + r > 5, set x = 5 - r, vx = -|vx|
- Same for y and z

**Ball-ball elastic collisions**: For two balls with masses m1, m2, velocities v1, v2:
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity along normal: vrel = (v1 - v2) · n
- If vrel > 0 (approaching), apply impulse:
  - j = (2 * vrel) / (1/m1 + 1/m2)  ... wait, let me think more carefully.
  
  Actually for elastic collision:
  - vrel_n = (v1 - v2) · n (where n points from 1 to 2)
  - If vrel_n > 0, they're approaching
  - Impulse magnitude: j = (2 * vrel_n) / (1/m1 + 1/m2)
  - v1' = v1 - (j/m1) * n
  - v2' = v2 + (j/m2) * n

Wait, let me reconsider. n points from ball 1 to ball 2. The relative velocity of approach is (v1 - v2) · n. If this is positive, ball 1 is moving toward ball 2 along the normal.

For elastic collision:
- j = 2 * (v1 - v2) · n / (1/m1 + 1/m2)
- v1' = v1 - (j/m1) * n
- v2' = v2 + (j/m2) * n

This conserves both momentum and kinetic energy.

**Separation**: After collision detection, if balls overlap, push them apart along the normal.

**Substeps**: Use multiple substeps per frame for stability. I'll use something like 4-8 substeps.

**Non-overlapping start positions**: I'll use a rejection sampling approach - try random positions and check against all existing balls.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
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
const boxSize = 10;
const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// Ball data
interface Ball {
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    r: number; m: number;
}

const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

const balls: Ball[] = [];

// Generate non-overlapping positions
function generatePosition(): { x: number; y: number; z: number } {
    const min = BOX_MIN + RADIUS;
    const max = BOX_MAX - RADIUS;
    for (let attempt = 0; attempt < 10000; attempt++) {
        const x = min + Math.random() * (max - min);
        const y = min + Math.random() * (max - min);
        const z = min + Math.random() * (max - min);
        let valid = true;
        for (const b of balls) {
            const dx = x - b.x;
            const dy = y - b.y;
            const dz = z - b.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < RADIUS * 2) {
                valid = false;
                break;
            }
        }
        if (valid) return { x, y, z };
    }
    // Fallback: place at a grid position (shouldn't happen with 20 balls in a 10^3 box)
    const idx = balls.length;
    const gridSize = 3;
    const gx = BOX_MIN + RADIUS + (idx % gridSize) * (2 * RADIUS + 0.5);
    const gy = BOX_MIN + RADIUS + (Math.floor(idx / gridSize) % gridSize) * (2 * RADIUS + 0.5);
    const gz = BOX_MIN + RADIUS + (Math.floor(idx / (gridSize * gridSize)) % gridSize) * (2 * RADIUS + 0.5);
    return { x: gx, y: gy, z: gz };
}

// Initialize balls
for (let i = 0; i < NUM_BALLS; i++) {
    const pos = generatePosition();
    const m = 1 + Math.random() * 2; // mass 1..3
    const speed = 2 + Math.random() * 2; // speed 2..4
    // Random direction
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);
    
    balls.push({ x: pos.x, y: pos.y, z: pos.z, vx, vy, vz, r: RADIUS, m });
}

// Create meshes
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 32, 32);
const meshes: THREE.Mesh[] = [];
const colors = new THREE.Color();

for (let i = 0; i < NUM_BALLS; i++) {
    colors.setHSL(i / NUM_BALLS, 0.8, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: colors.clone(), roughness: 0.3, metalness: 0.2 });
    const mesh = new THREE.Mesh(sphereGeometry, material);
    scene.add(mesh);
    meshes.push(mesh);
}

// Physics step
function step(dt: number): void {
    const SUBSTEPS = 8;
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
            if (b.x - b.r < BOX_MIN) {
                b.x = BOX_MIN + b.r;
                b.vx = Math.abs(b.vx);
            } else if (b.x + b.r > BOX_MAX) {
                b.x = BOX_MAX - b.r;
                b.vx = -Math.abs(b.vx);
            }
            if (b.y - b.r < BOX_MIN) {
                b.y = BOX_MIN + b.r;
                b.vy = Math.abs(b.vy);
            } else if (b.y + b.r > BOX_MAX) {
                b.y = BOX_MAX - b.r;
                b.vy = -Math.abs(b.vy);
            }
            if (b.z - b.r < BOX_MIN) {
                b.z = BOX_MIN + b.r;
                b.vz = Math.abs(b.vz);
            } else if (b.z + b.r > BOX_MAX) {
                b.z = BOX_MAX - b.r;
                b.vz = -Math.abs(b.vz);
            }
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
    }
}

// Simulation object
const sim = {
    balls,
    step,
    paused: false
};
(window as any).__sim = sim;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handler
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
    
    // Sync meshes
    for (let i = 0; i < balls.length; i++) {
        meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
    }
    
    renderer.render(scene, camera);
    
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to double-check the TypeScript strictness. Let me review:
- `clock.getDelta()` returns a number, fine.
- All variables are properly typed.
- The `balls` array is typed as `Ball[]`.
- The `meshes` array is typed as `THREE.Mesh[]`.

I think this looks good. Let me also make sure the separation is done correctly - after separating, we should check if the balls are still in bounds (separation might push them out). Actually, since we do wall collision after... wait, no, I do wall collision before ball-ball. Let me reorder: move → ball-ball (with separation) → wall collision. That way separation can't push balls out of bounds.

Actually, let me reconsider the order:
1. Move balls
2. Ball-ball collisions (detect, separate, apply impulse)
3. Wall collisions (clamp and reflect)

This is better because after separation, we clamp to walls.

Let me also add a small epsilon check for the distance to avoid division by zero.

Let me finalize the code.
