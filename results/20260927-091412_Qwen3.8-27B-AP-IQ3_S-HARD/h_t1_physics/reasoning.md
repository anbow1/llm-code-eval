Let me write a complete TypeScript file that:

1. Creates a Three.js scene with a box (edges) from -5 to +5
2. Creates 20 balls with radius 0.4, random masses (1-3)
3. Non-overlapping start positions fully inside the box
4. Random velocities with speed 2-4 units/s
5. Physics: elastic collisions with walls and between balls
6. Substeps for stability
7. Render loop with delta time clamped to 1/30s
8. Expose __scene, __camera, __renderer, __ready, __sim
9. __sim = { balls, step, paused } where balls are plain objects
10. Camera placed to see the whole box

Let me think about the physics:
- Wall collisions: if ball position + radius exceeds boundary, reflect velocity and clamp position
- Ball-ball collisions: elastic collision using masses, conserve momentum and kinetic energy
- Substeps: divide dt into smaller steps for stability

For non-overlapping start positions: I'll place balls in a grid or use rejection sampling to ensure no two balls overlap (distance between centers > 2*radius = 0.8) and all are inside the box (center must be at least radius from each wall, so between -4.6 and +4.6).

Let me think about the elastic collision formula:
For two balls with positions p1, p2, velocities v1, v2, masses m1, m2:
- Normal direction: n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- Relative velocity along normal: vrel_n = dot(vrel, n)
- If vrel_n > 0 (approaching), apply impulse:
  j = (2 * vrel_n) / (1/m1 + 1/m2)
  v1 -= (j/m1) * n
  v2 += (j/m2) * n

Wait, let me be more careful. The standard elastic collision in 1D along the normal:
- vrel_n = dot(v1 - v2, n) where n points from ball1 to ball2
- If vrel_n > 0 (they're approaching), impulse magnitude j = 2 * vrel_n / (1/m1 + 1/m2)
- v1_new = v1 - (j/m1) * n
- v2_new = v2 + (j/m2) * n

This conserves momentum: m1*v1 + m2*v2 = m1*(v1 - j/m1*n) + m2*(v2 + j/m2*n) = m1*v1 - j*n + m2*v2 + j*n = m1*v1 + m2*v2 ✓

Kinetic energy: 0.5*m1*|v1|^2 + 0.5*m2*|v2|^2 vs 0.5*m1*|v1 - j/m1*n|^2 + 0.5*m2*|v2 + j/m2*n|^2

This is the standard elastic collision formula and it conserves both.

For separation of overlapping pairs: after detecting overlap, push balls apart along the normal direction so they just touch.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Setup renderer, scene, camera, lights
// Create box edges
// Create balls (physics state + meshes)
// Physics step function with substeps
// Render loop
// Expose for testing
```

Let me write this carefully to ensure strict TypeScript compliance.

For the box edges: use BoxGeometry(10, 10, 10) and EdgesGeometry, then LineSegments.

For balls: SphereGeometry(0.4, 32, 32) with MeshStandardMaterial in random colors.

Camera: position it at something like (0, 0, 15) looking at origin. The box is 10x10x10 centered at origin, so from z=15 we can see the whole thing.

Let me think about substeps. With 20 balls and dt up to 1/30, I'll use something like 4-8 substeps. Actually, let me use a fixed number of substeps based on dt. Something like: substeps = Math.ceil(dt / (1/200)) or just use a fixed number like 8 substeps.

Actually, let me use: const substeps = Math.max(1, Math.ceil(dt / 0.005)); This gives us substeps of at most 5ms each.

Wait, 1/30 ≈ 0.0333s. 0.0333/0.005 ≈ 6.67, so ceil gives 7 substeps. That's reasonable.

Let me also handle the separation carefully - if two balls overlap, I need to push them apart. The amount of overlap is (2*r) - distance. I push each ball apart by half the overlap (weighted by mass inversely).

Actually for proper mass-weighted separation:
- overlap = 2*r - dist (when dist < 2*r)
- correction = overlap / (1/m1 + 1/m2)
- ball1 moves by correction/m1 * n in the -n direction
- ball2 moves by correction/m2 * n in the +n direction

This ensures the total displacement is exactly the overlap amount.

Let me write the full code now.
