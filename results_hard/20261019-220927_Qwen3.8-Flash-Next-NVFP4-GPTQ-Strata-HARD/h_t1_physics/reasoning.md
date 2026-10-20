The user wants a complete TypeScript file that simulates 20 balls bouncing inside a box using Three.js. Let me plan this carefully:

1. **Setup**: Create scene, camera, renderer, lights
2. **Box**: Draw edges of a cube from -5 to +5 using LineSegments + EdgesGeometry
3. **Balls**: 20 balls, radius 0.4, mass 1-3, non-overlapping start positions, random velocities (speed 2-4)
4. **Physics**: Elastic collisions with walls and between balls (using masses), substeps for stability
5. **Rendering**: SphereGeometry + MeshStandardMaterial for each ball
6. **Expose**: `__sim` with balls, step, paused
7. **Render loop**: setAnimationLoop, delta clamped to 1/30s

Key physics details:
- Wall collision: reflect velocity component when ball reaches boundary (5 - radius)
- Ball-ball collision: elastic collision formula with masses
  - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2) / |x1-x2|^2 * (x1-x2)
  - v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1) / |x2-x1|^2 * (x2-x1)
- Separation: push overlapping pairs apart along collision normal
- Substeps: divide dt into smaller steps (e.g., 4 substeps)

Let me write this carefully to ensure it compiles with strict TypeScript.

For the ball initialization:
- Random positions inside [-5+r, 5-r] = [-4.6, 4.6]
- Check no overlap with existing balls (distance > 2*r = 0.8)
- Random velocity direction with magnitude 2-4

For the camera: place it at something like (12, 10, 12) looking at origin, or use a distance that encompasses the box.

Let me write the complete file now.
