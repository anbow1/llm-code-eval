The user wants a complete TypeScript file that simulates 20 balls bouncing inside a box. Let me plan this carefully:

1. **Scene setup**: Renderer, camera, lights, box edges
2. **Physics**: Ball-ball elastic collisions (with different masses), ball-wall collisions, no gravity
3. **Rendering**: Sphere meshes for each ball, LineSegments for box edges
4. **Testing interface**: `__sim` object with balls array, step function, paused boolean

Key considerations:
- Box from -5 to +5 on all axes
- Ball radius = 0.4, so centers must be in [-4.6, 4.6]
- Start positions must not overlap (minimum distance between centers = 0.8)
- Random masses (1..3), random velocities (speed 2..4)
- Elastic ball-ball collision with momentum and KE conservation
- Elastic wall collisions (reflect velocity component, clamp position)
- Substeps for stability
- Delta time clamped to 1/30
- Use `renderer.setAnimationLoop`
- Handle resize
- Expose `__scene`, `__camera`, `__renderer`, `__sim`, `__ready`

For elastic collision between two balls:
- v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2)/|x1-x2|^2 * (x1-x2)
- v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1)/|x2-x1|^2 * (x2-x1)

For wall collisions: if x - r < -5 or x + r > 5, reflect and clamp.

For overlap separation: push balls apart along the collision normal proportional to their masses.

Let me write this carefully to compile with `tsc --strict`.

For the positions, I'll use rejection sampling to ensure no overlap. Generate random positions in [-4.6, 4.6], check distance to all existing balls > 0.8.

Let me structure the code:

```ts
import * as THREE from 'three';

// Types
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// Setup renderer, scene, camera
// Create box edges
// Create balls with non-overlapping positions
// Create meshes
// Physics step function
// Animation loop
```

Let me be careful about the strict TypeScript - no implicit any, proper null checks, etc.

For the box edges, I'll use a BoxGeometry and EdgesGeometry with LineSegments.

Camera: positioned at something like (12, 10, 12) looking at origin should show the whole box.

Let me write the complete file now.
