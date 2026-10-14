The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box using Three.js. Let me plan this carefully:

1. **Setup**: Three.js scene, camera, renderer, lights, box edges, 20 ball meshes
2. **Physics**: Elastic collisions with walls and between balls, using masses. Substeps for stability.
3. **Rendering**: Each ball as Mesh with SphereGeometry + MeshStandardMaterial
4. **Expose**: `__sim` with balls array, step function, paused boolean
5. **Render loop**: Uses `setAnimationLoop`, delta clamped to 1/30s, calls step when not paused

Key physics details:
- Elastic collision between two balls with different masses:
  - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2)/|x1-x2|² * (x1-x2)
  - v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1)/|x2-x1|² * (x2-x1)
- Wall collision: reflect velocity component, ensure position is within bounds
- Substeps: divide dt into smaller steps for stability

Let me write the complete TypeScript file.

For non-overlapping start positions: I'll use a rejection sampling approach to place balls so they don't overlap.

For the box edges: Use EdgesGeometry on a BoxGeometry with size 10, centered at origin.

Let me make sure:
- Radius is exactly 0.4
- Box is from -5 to +5
- Speed is 2..4 units/s
- Masses random 1..3, at least two different
- No gravity
- Elastic collisions with walls AND between balls
- Separate overlapping pairs

Let me write this carefully.

```ts
import * as THREE from 'three';

// ... full implementation
```

Let me think about the substep approach:
- step(dt) divides dt into N substeps
- For each substep:
  1. Move balls by v * subDt
  2. Check and resolve wall collisions
  3. Check and resolve ball-ball collisions
  4. Separate overlapping balls

For ball-ball elastic collision:
- Normal: n = (p2 - p1) / |p2 - p1|
- Relative velocity: vrel = v1 - v2
- If dot(vrel, n) > 0, they're approaching
- Impulse: j = (1 + e) * dot(vrel, n) / (1/m1 + 1/m2), e=1 for elastic
- v1 -= (j/m1) * n
- v2 += (j/m2) * n

Wait, let me be more careful. For perfectly elastic (e=1):
- j = 2 * dot(vrel, n) / (1/m1 + 1/m2)
- v1' = v1 - (j/m1) * n
- v2' = v2 + (j/m2) * n

Actually, the standard formula:
- n = normalize(p1 - p2)
- vrel = v1 - v2
- if dot(vrel, n) <= 0: not approaching, skip
- j = -(1+e) * dot(vrel, n) / (1/m1 + 1/m2)  -- wait, sign conventions

Let me use a cleaner formulation:
- n = normalize(p1 - p2)  // points from p2 to p1
- vrel = v1 - v2
- vn = dot(vrel, n)
- if vn <= 0: balls are separating, skip
- j = (2 * m1 * m2) / (m1 + m2) * vn  // for e=1, coefficient = 2*m1*m2/(m1+m2)
- Wait no. The impulse scalar for elastic collision:
  j = (1 + e) * vn / (1/m1 + 1/m2)
  For e=1: j = 2 * vn / (1/m1 + 1/m2) = 2 * vn * m1 * m2 / (m1 + m2)
- v1 -= (j / m1) * n
- v2 += (j / m2) * n

Let me verify: 
- v1' = v1 - (2*m2/(m1+m2)) * vn * n
- v2' = v2 + (2*m1/(m1+m2)) * vn * n

Check momentum: m1*v1' + m2*v2' = m1*v1 + m2*v2 - m1*(2*m2/(m1+m2))*vn*n + m2*(2*m1/(m1+m2))*vn*n = m1*v1 + m2*v2 - 2*m1*m2/(m1+m2)*vn*n + 2*m1*m2/(m1+m2)*vn*n = m1*v1 + m2*v2 ✓

Check KE: For e=1 it should be conserved. ✓ (standard result)

For separation of overlapping balls:
- overlap = 2*r - dist
- Move each ball by overlap * (m_other / (m1+m2)) along n

For wall collisions:
- If x + r > 5: x = 5 - r, vx = -|vx| (or if vx > 0, vx = -vx)
- If x - r < -5: x = -5 + r, vx = -vx (if vx < 0)

For non-overlapping initial placement:
- Use rejection sampling, try random positions, reject if too close to existing balls

For the camera: place it at a distance where the whole 10x10x10 box is visible. FOV of 60 degrees, box half-size is 5, need distance such that 5/tan(30°) fits. tan(30°) = 0.577, so distance > 5/0.577 ≈ 8.66. Let's place camera at (15, 10, 15) looking at origin. Actually (12, 8, 12) should work.

Let me also handle the case where at least two different masses are used. I'll assign random masses in [1, 3], but to guarantee at least two different values, I'll make the first ball mass 1 and second mass 3, then randomize the rest.

Actually, with random values in [1, 3], it's virtually guaranteed to have different values. But to be safe, I'll explicitly set ball[0].m = 1.0 and ball[1].m = 3.0.

For the number of substeps: with 20 balls, radius 0.4, box size 10, speed up to 4 m/s. In 1/30 s, a ball moves at most 4/30 ≈ 0.133 units. A substep should be small enough that balls don't tunnel through each other. With 10 substeps per frame, each substep is ~0.003s, movement ~0.013, well below radius 0.4. 10 substeps should be fine. Let me use 10.

Actually, let me use more substeps to be safe: 8 substeps per frame call. With dt clamped to 1/30, each substep is ~0.004s, movement ~0.016, well within safe limits.

Let me write the code now.
