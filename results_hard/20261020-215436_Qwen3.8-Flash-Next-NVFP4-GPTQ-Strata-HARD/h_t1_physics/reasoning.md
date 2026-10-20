The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box using Three.js. Let me plan this carefully:

1. **Box**: Cube from -5 to +5, rendered with EdgesGeometry + LineSegments
2. **Balls**: 20 balls, radius 0.4, random masses (1..3), non-overlapping start positions inside box, random velocities (speed 2..4)
3. **Physics**: Perfectly elastic wall collisions and ball-ball collisions (using masses), no gravity
4. **Rendering**: SphereGeometry + MeshStandardMaterial for each ball, AmbientLight + DirectionalLight
5. **API**: `__sim = { balls, step, paused }` with substeps for stability
6. **Render loop**: setAnimationLoop, delta clamped to 1/30s, skip step if paused

Let me think about the physics:

**Wall collisions**: If ball.x - r < -5, reflect vx and clamp position. Same for all 6 walls.

**Ball-ball collisions (perfectly elastic with masses)**:
- Check if distance between centers < r1 + r2
- Separate overlapping pairs
- Apply 1D elastic collision along the collision normal
- Formula for elastic collision with different masses:
  - v1_new = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
  - v2_new = v2 - (2*m1/(m1+m2)) * dot(v2-v1, n) * n
  where n is the unit normal from ball1 to ball2

**Substeps**: I'll use maybe 4 substeps per frame for stability.

**Non-overlapping initial positions**: I'll use rejection sampling - generate random positions, check against all existing balls for overlap.

Let me write the complete file now.
