The user wants a complete TypeScript file that simulates 20 bouncing balls inside a box using Three.js. Let me plan this carefully:

1. **Scene setup**: Renderer, camera, lights, box edges, ball meshes
2. **Physics**: Elastic collisions (wall + ball-ball), momentum/energy conservation with masses
3. **Initialization**: Non-overlapping positions, random velocities (speed 2-4), masses 1-3, radius 0.4
4. **Simulation loop**: Substeps, clamp dt to 1/30s, expose __sim
5. **Rendering**: Sync mesh positions with physics state

Key physics details:
- Wall collision: reflect velocity component, clamp position
- Ball-ball collision: use conservation of momentum and kinetic energy formula for 1D along collision normal
- Separation: push overlapping pairs apart along collision normal

Let me write this carefully:

For ball-ball elastic collision with masses m1, m2:
- Find normal vector from ball1 to ball2
- Decompose velocities into normal and tangential components
- Apply 1D elastic collision formula on normal components:
  v1n_new = ((m1-m2)*v1n + 2*m2*v2n) / (m1+m2)
  v2n_new = ((m2-m1)*v2n + 2*m1*v1n) / (m1+m2)
- Tangential components unchanged

For separation: push apart along normal so they're exactly touching (distance = r1 + r2)

Let me make sure all positions are within [-5+r, 5-r] = [-4.6, 4.6]

For initial positions, I'll use a rejection sampling approach to avoid overlaps.

Substeps: I'll use ~10 substeps per frame for stability.

Let me write the complete file now.
