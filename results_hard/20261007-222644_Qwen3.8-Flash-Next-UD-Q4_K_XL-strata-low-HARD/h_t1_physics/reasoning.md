The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box using Three.js. Let me break down the requirements:

1. Box from -5 to +5 on every axis, drawn with LineSegments + EdgesGeometry
2. 20 balls with radius 0.4, mass between 1-3, non-overlapping start positions, velocities 2-4 units/s
3. Physics: elastic collisions with walls and between balls (conserving momentum and kinetic energy)
4. Render with MeshStandardMaterial, AmbientLight, DirectionalLight
5. Expose __sim with balls, step, paused
6. Render loop with delta clamped to 1/30s, substeps for stability

Let me write this carefully:

- For ball-ball elastic collisions, I need to use the 1D collision formula projected onto the collision normal:
  - For two balls with masses m1, m2, velocities v1, v2:
    - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2)/|x1-x2|^2 * (x1-x2)
    - v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1)/|x2-x1|^2 * (x2-x1)

- For wall collisions: reflect velocity component, clamp position

- Substeps: I'll use something like 4-8 substeps per frame for stability

- Non-overlapping start: I'll use rejection sampling

- The balls array should be plain objects { x, y, z, vx, vy, vz, r, m }

Let me write the complete file now.
