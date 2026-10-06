The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box using Three.js. Let me break down the requirements:

1. Box: cube from -5 to +5 on every axis, drawn with LineSegments + EdgesGeometry
2. 20 balls: radius 0.4, mass random 1..3, start positions non-overlapping and inside box, velocities random speed 2..4
3. Physics: perfectly elastic collisions with walls and between balls, conserve momentum and KE, no overlap
4. Render: SphereGeometry + MeshStandardMaterial per ball, AmbientLight + DirectionalLight
5. Expose __sim with balls, step, paused
6. Render loop with clamped delta, substeps for stability
7. Camera sees whole box

Let me write this carefully:

- For ball-ball elastic collision with masses:
  - Normal vector: n = (p2 - p1) / |p2 - p1|
  - Relative velocity: v_rel = v1 - v2
  - v_rel_n = dot(v_rel, n)
  - If v_rel_n > 0, they're separating, skip
  - j = 2 * v_rel_n / (1/m1 + 1/m2) -- wait, for elastic collision the impulse is:
  - Actually for elastic collision: j = 2 * m1 * m2 / (m1 + m2) * v_rel_n
  - v1_new = v1 - (j / m1) * n
  - v2_new = v2 + (j / m2) * n
  
  Wait, let me redo this. For perfectly elastic collision:
  - v_rel = v1 - v2
  - v_rel_n = dot(v_rel, n) where n points from ball1 to ball2
  - If v_rel_n <= 0, separating, skip
  - j = (2 * m1 * m2 / (m1 + m2)) * v_rel_n  -- this is the impulse magnitude along n
  - v1_new = v1 - (j/m1) * n
  - v2_new = v2 + (j/m2) * n

  Let me verify: if m1 = m2 = m, n = (1,0,0), v1 = (1,0,0), v2 = (0,0,0)
  v_rel_n = 1
  j = 2*m*m/(2m) * 1 = m
  v1_new = (1,0,0) - (m/m)*(1,0,0) = (0,0,0)
  v2_new = (0,0,0) + (m/m)*(1,0,0) = (1,0,0)
  ✓ They swap velocities.

- Wall collision: reflect velocity component, clamp position
- Substeps for stability: use e.g. 4 substeps per frame
- Separation of overlapping pairs

- For non-overlapping start positions: I'll place balls one by one, checking against all previously placed ones. If overlap, retry with new position.

- Camera: box is 10 units wide, so camera at maybe (15, 10, 15) looking at origin should work.

Let me write the complete file now.
