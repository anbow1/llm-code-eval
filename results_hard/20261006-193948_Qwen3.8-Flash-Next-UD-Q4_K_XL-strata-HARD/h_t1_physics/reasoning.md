The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box with elastic collisions. Let me plan this out:

1. **Box**: Cube from -5 to +5 on all axes, rendered with EdgesGeometry + LineSegments
2. **Balls**: 20 balls, radius 0.4, random masses 1-3, non-overlapping start positions, random velocities speed 2-4
3. **Physics**: Elastic collisions with walls and between balls (momentum + KE conservation), substeps, no overlap
4. **Rendering**: SphereGeometry + MeshStandardMaterial per ball, AmbientLight + DirectionalLight
5. **Simulation exposure**: `__sim = { balls, step, paused }`
6. **Render loop**: Uses `renderer.setAnimationLoop`, clamps delta to 1/30, respects paused flag

Key considerations:
- Non-overlapping start positions: I'll place them randomly and check for overlaps, retrying if needed
- Elastic ball-ball collision: Use the standard formula for 2D elastic collisions extended to 3D along the collision normal
- Wall collisions: Reflect velocity component when ball hits wall (accounting for radius)
- Substeps for stability
- Separate overlapping pairs each step
- Must use `import * as THREE from 'three'`
- Must handle resize
- Must set `__ready` after first frame
- Must compile with `tsc --strict`

Let me write the elastic collision formula:
For two balls with masses m1, m2, velocities v1, v2, the collision normal n = (p2 - p1) / |p2 - p1|
The relative velocity along normal: vrel = (v1 - v2) · n
If vrel > 0 (approaching), apply impulse:
j = 2 * vrel / (1/m1 + 1/m2) -- wait, for perfectly elastic:
j = (2 * m1 * m2 * vrel) / (m1 + m2) -- hmm, let me think more carefully.

Standard elastic collision along normal n:
- v1_new = v1 - (2*m2/(m1+m2)) * ((v1-v2)·n) * n
- v2_new = v2 + (2*m1/(m1+m2)) * ((v1-v2)·n) * n

This conserves both momentum and kinetic energy.

For the overlap separation: when two balls overlap, push them apart along the collision normal so they're exactly touching.

For substeps: I'll use maybe 8 substeps per frame for stability.

Let me write the code now.
