Let me design a complete TypeScript file that:

1. Sets up Three.js scene, camera, renderer, lights
2. Creates a box (wireframe edges from -5 to +5)
3. Creates 20 balls with radius 0.4, random masses (1..3), random non-overlapping positions inside the box, random velocities (speed 2..4)
4. Implements physics with:
   - Wall collisions (perfectly elastic)
   - Ball-ball collisions (perfectly elastic, momentum + energy conservation)
   - Substeps for stability
   - Overlap separation
5. Exposes `__sim` with balls array, step function, paused flag
6. Uses `setAnimationLoop` with delta clamped to 1/30s

Let me think about the physics carefully:

**Ball-ball elastic collision (2 balls with masses m1, m2):**
- Normal vector: n = (p2 - p1) / |p2 - p1|
- Relative velocity along normal: v_rel = (v2 - v1) · n
- If v_rel > 0, balls are separating, skip
- Impulse: j = -(1 + e) * v_rel / (1/m1 + 1/m2), with e = 1 (perfectly elastic)
- So j = -2 * v_rel / (1/m1 + 1/m2) = -2 * v_rel * m1 * m2 / (m1 + m2)
- v1 += (j / m1) * n
- v2 -= (j / m2) * n

Wait, let me be more careful. Standard formulation:

For two balls with velocities v1, v2, normal n pointing from ball1 to ball2:
- relative velocity along normal: v_rel = (v1 - v2) · n
- If v_rel <= 0, they're separating, skip
- For elastic collision (e=1):
  - v1_new = v1 - (2*m2/(m1+m2)) * ((v1-v2)·n) * n
  - v2_new = v2 + (2*m1/(m1+m2)) * ((v1-v2)·n) * n

**Wall collisions:** Simply reflect the velocity component and clamp position.

**Substeps:** Use maybe 4 substeps per frame for stability.

**Non-overlapping initialization:** I'll use rejection sampling - generate random positions, check they don't overlap with existing balls and are fully inside the box (distance from wall >= r).

Let me write the code now.

For TypeScript strict mode, I need to be careful about types. Let me define the Ball interface clearly.

Let me also make sure the camera is positioned to see the whole box. The box goes from -5 to +5, so it's 10 units across. I'll place the camera at something like (12, 10, 12) looking at origin.

Let me code this up:

```typescript
import * as THREE from 'three';

// ... scene setup, ball creation, physics step, render loop
```

I need to be careful with the `step` function - it needs to use substeps. Let me use 4 substeps per step call.

For the render loop delta clamping: `Math.min(delta, 1/30)`.

Let me write the complete file now.
