The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box using Three.js. Let me plan this carefully:

1. Setup: Renderer, Scene, Camera, Lights
2. Box: EdgesGeometry of a cube from -5 to +5
3. 20 balls: radius 0.4, random mass 1-3, non-overlapping positions inside box, random velocities speed 2-4
4. Physics: elastic wall collisions (accounting for radius), elastic ball-ball collisions (with masses, conserving momentum and KE)
5. Substeps for stability
6. Expose __sim with balls, step, paused
7. Render loop with delta clamped to 1/30s

Let me think about the physics:

**Wall collisions:** Ball center must stay within [-5+r, 5-r] on each axis. When a ball hits a wall, reverse that component of velocity.

**Ball-ball elastic collisions with masses:**
For two balls with masses m1, m2, velocities v1, v2, and positions p1, p2:
- Normal direction: n = normalize(p1 - p2)
- Relative velocity along normal: v_rel = dot(v1 - v2, n)
- If v_rel > 0, they're separating, skip
- Impulse: j = -2 * v_rel / (1/m1 + 1/m2) ... wait, for elastic collision:
  - j = -(1 + e) * v_rel / (1/m1 + 1/m2) where e = 1 for elastic
  - j = -2 * v_rel / (1/m1 + 1/m2)
  - v1 += j/m1 * n
  - v2 -= j/m2 * n

Wait, let me be more careful. For elastic collision:
- n = normalize(p1 - p2) (from ball2 to ball1)
- v_rel = dot(v1 - v2, n)
- If v_rel >= 0, balls are separating, skip
- j = -2 * v_rel / (1/m1 + 1/m2)
- v1_new = v1 - (j/m1) * n ... hmm let me re-derive.

Actually, the standard formula:
- n = normalize(p1 - p2)
- v_rel = dot(v1 - v2, n)  (relative velocity of approach, should be negative if approaching)
- Wait, if n points from p2 to p1, and v_rel = dot(v1 - v2, n):
  - If v_rel < 0, they're approaching (ball1 moving toward ball2 along n)
  - If v_rel > 0, they're separating

For elastic collision (e=1):
- j = -2 * v_rel / (1/m1 + 1/m2)  ... no wait

Let me use the standard impulse formula:
- j_magnitude = -(1+e) * v_rel / (1/m1 + 1/m2)
- For e=1: j = -2 * v_rel / (1/m1 + 1/m2)
- Apply: v1 += (j/m1) * n, v2 -= (j/m2) * n

Wait, sign convention. Let me think again:
- n = normalize(p1 - p2), points from ball2 toward ball1
- v_rel = dot(v1 - v2, n)
- If v_rel < 0: approaching
- Impulse magnitude J = -(1+e) * v_rel / (1/m1 + 1/m2)
  - For e=1: J = -2 * v_rel / (1/m1 + 1/m2)
  - Since v_rel < 0, J > 0
- v1 += (J/m1) * n  → pushes ball1 away from ball2 (positive n direction) ✓
- v2 -= (J/m2) * n  → pushes ball2 away from ball1 (negative n direction) ✓

Let me verify: J = -2 * v_rel / (1/m1 + 1/m2). With v_rel negative, J is positive. v1 += positive * n (moves ball1 in +n direction, away from ball2). v2 -= positive * n (moves ball2 in -n direction, away from ball1). Correct.

**Separation of overlapping balls:** After collision detection, push balls apart along n so they no longer overlap. Distribute the separation inversely proportional to mass.

**Substeps:** I'll use maybe 4 substeps per step call to keep things stable.

**Non-overlapping initial positions:** I'll use rejection sampling - try random positions, check no overlap with existing balls and within box bounds.

**Speed 2-4:** Generate random direction, multiply by random speed in [2,4].

Let me write the code now.

For the camera: box goes from -5 to 5, so I'll place camera at something like (15, 12, 15) looking at origin.

Let me write the complete file.
