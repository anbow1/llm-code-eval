The user wants a complete TypeScript file that simulates 20 balls bouncing inside a closed box using Three.js. Let me break down the requirements:

1. Box: cube from -5 to +5 on every axis, drawn with edges
2. 20 balls, radius 0.4, mass between 1-3, non-overlapping positions, velocities 2-4 units/s
3. Physics: elastic collisions with walls AND between balls (conserving momentum and KE)
4. Render with SphereGeometry, MeshStandardMaterial, AmbientLight + DirectionalLight
5. Expose __sim with balls, step, paused
6. Render loop with delta clamped to 1/30s
7. Camera showing whole box

Let me write this carefully:

- For ball-ball elastic collision: use the standard formula for elastic collisions in 3D
  - v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2) / |x1-x2|^2 * (x1-x2)
  - v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1) / |x2-x1|^2 * (x2-x1)

- For wall collision: reflect velocity component and clamp position

- Substeps for stability

- Non-overlapping start positions: I'll use rejection sampling

- Edge geometry for the box

Let me write the complete file.
