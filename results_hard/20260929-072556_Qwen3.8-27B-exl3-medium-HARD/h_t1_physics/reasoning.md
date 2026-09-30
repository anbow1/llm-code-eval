Let me write a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions.

Key requirements:
1. Box from -5 to +5 on every axis, with visible edges
2. 20 balls, radius 0.4, masses 1-3 (at least two different)
3. Start positions non-overlapping, fully inside box
4. Start velocities random, speed 2-4 units/s
5. Perfectly elastic collisions (walls AND ball-ball)
6. Balls never leave box, never stay overlapping
7. Render as Mesh with SphereGeometry + MeshStandardMaterial
8. AmbientLight + DirectionalLight
9. Expose __sim = { balls, step, paused }
10. step(dt) advances physics with substeps
11. paused boolean: when true, render but don't step
12. Render loop calls step() with clamped delta (max 1/30s)
13. Camera sees whole box
14. Three.js imports, WebGLRenderer, resize handling, setAnimationLoop
15. Expose __scene, __camera, __renderer, __ready

Let me think about the physics:

**Wall collisions:**
- If ball.x - r < -5, reflect vx, set x = -5 + r
- If ball.x + r > 5, reflect vx, set x = 5 - r
- Same for y and z

**Ball-ball elastic collisions:**
For two balls with masses m1, m2, positions p1, p2, velocities v1, v2:
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- Relative velocity along normal: vrel_n = dot(vrel, n)
- If vrel_n > 0, they're separating, skip
- Impulse scalar: j = (2 * vrel_n) / (1/m1 + 1/m2)
- v1 -= (j / m1) * n
- v2 += (j / m2) * n

Wait, let me re-derive. For elastic collision:
- n = (p2 - p1) / |p2 - p1| (from ball 1 to ball 2)
- vrel = v1 - v2
- vrel_n = dot(vrel, n)
- If vrel_n > 0, balls are approaching (since n points from 1 to 2, and v1 - v2 dotted with n > 0 means ball 1 is moving toward ball 2 faster than ball 2 is moving away)
- Actually wait. If n points from 1 to 2, and vrel = v1 - v2, then vrel_n > 0 means ball 1 is moving in the direction of ball 2 relative to ball 2, i.e., they're approaching.

Impulse: j = (2 * vrel_n) / (1/m1 + 1/m2)
v1 -= (j / m1) * n
v2 += (j / m2) * n

This conserves momentum and kinetic energy for elastic collisions.

**Separation:**
After collision detection, if balls overlap (distance < r1 + r2), separate them along the normal proportional to inverse mass.

**Substeps:**
Use a fixed substep dt, e.g., 1/240 or smaller. Number of substeps = ceil(dt / substepDt).

**Non-overlapping start positions:**
Place balls one by one. For each ball, try random positions until it doesn't overlap with any existing ball and is fully inside the box.

Let me code this up:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
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

const R = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;
const NUM_BALLS = 20;

const balls: Ball[] = [];

// Generate non-overlapping positions
function randomPosition(): { x: number; y: number; z: number } {
    const min = BOX_MIN + R;
    const max = BOX_MAX - R;
    return {
        x: min + Math.random() * (max - min),
        y: min + Math.random() * (max - min),
        z: min + Math.random() * (max - min),
    };
}

for (let i = 0; i < NUM_BALLS; i++) {
    let pos: { x: number; y: number; z: number };
    let attempts = 0;
    do {
        pos = randomPosition();
        attempts++;
        if (attempts > 10000) break;
    } while (balls.some(b => {
        const dx = b.x - pos.x;
        const dy = b.y - pos.y;
        const dz = b.z - pos.z;
        return (dx * dx + dy * dy + dz * dz) < (2 * R) * (2 * R);
    }));

    // Random velocity, speed 2-4
    const speed = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    const mass = 1 + Math.random() * 2; // 1 to 3

    balls.push({ x: pos.x, y: pos.y, z: pos.z, vx, vy, vz, r: R, m: mass });
}

// Create meshes
const sphereGeometry = new THREE.SphereGeometry(R, 32, 32);
const ballMeshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
    const color = new THREE.Color().setHSL(i / NUM_BALLS, 0.8, 0.5);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.set(balls[i].x, balls[i].y, balls[i].z);
    scene.add(mesh);
    ballMeshes.push(mesh);
}

// Physics step
function step(dt: number): void {
    const substepDt = 1 / 240;
    const numSubsteps = Math.max(1, Math.ceil(dt / substepDt));
    const actualDt = dt / numSubsteps;

    for (let s = 0; s < numSubsteps; s++) {
        // Move balls
        for (const b of balls) {
            b.x += b.vx * actualDt;
            b.y += b.vy * actualDt;
            b.z += b.vz * actualDt;
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

                if (distSq < minDist * minDist && distSq > 1e-12) {
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

                    if (dvDotN > 0) {
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
}

// Expose
let paused = false;
(window as any).__sim = { balls, step, paused: paused };

// Hmm, paused needs to be a live boolean. Let me use an object.
```

Wait, the requirement says `__sim = { balls, step, paused }` where `paused` is a boolean. But if I just assign `paused: false`, then changing `__sim.paused = true` won't affect my internal variable. I need to make `paused` a property that's read live.

Actually, looking at the requirement more carefully: "paused is a boolean: when __sim.paused is true the render loop must keep rendering but must NOT call step()"

So the render loop should check `__sim.paused` each frame. If I structure it as an object and the render loop reads `sim.paused`, then when the test sets `sim.paused = true`, it will work.

Let me restructure:

```typescript
const sim = {
    balls,
    step,
    paused: false
};
(window as any).__sim = sim;
```

Then in the render loop: `if (!sim.paused) step(dt);`

This way, when the test does `(window as any).__sim.paused = true`, it modifies the same object, and the render loop will see it.

Now for the render loop with delta time:

```typescript
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    
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

Let me also handle resize:

```typescript
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Let me also make sure the `step` function handles the case where dt is 0 or very small.

Actually, I need to be careful about the `step` function signature. The requirement says `step(dt: number)`. Let me make sure it's properly typed.

Let me also think about the camera position. The box is from -5 to +5, so it's 10 units on each side. A camera at (0, 5, 15) looking at origin should see the whole box with a 60 degree FOV. Let me verify: at distance 15, with 60 degree FOV, the visible height is 2 * 15 * tan(30°) ≈ 2 * 15 * 0.577 ≈ 17.3 units. The box is 10 units tall, so it should fit. The width depends on aspect ratio, but with a typical 16:9 it should be fine. Actually let me move it a bit further to be safe: (0, 5, 18) or even (12, 8, 12).

Let me go with camera at (12, 8, 12) looking at origin for a nice 3/4 view.

Actually, let me reconsider. With FOV 60 and distance from origin of sqrt(12² + 8² + 12²) = sqrt(144+64+144) = sqrt(352) ≈ 18.7. Visible height at that distance: 2 * 18.7 * tan(30°) ≈ 21.6. Box is 10 units, so it fits comfortably.

Let me finalize the code now. I need to make sure it compiles with `tsc --strict`.

One issue: the `step` function is defined as a local function. When I expose it via `__sim`, it should still work since it closes over `balls`.

Let me also make sure I handle the edge case where `distSq` is 0 (two balls at exactly the same position). I'll add a small epsilon check.

Let me write the final version:
