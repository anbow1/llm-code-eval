The user wants a complete TypeScript file that simulates 20 bouncing balls inside a box with elastic collisions. Let me plan this carefully:

1. **Setup**: Three.js scene, camera, renderer, lights
2. **Box**: Wireframe cube from -5 to +5
3. **Physics**: 
   - Ball-wall elastic collisions (reflect velocity component)
   - Ball-ball elastic collisions (1D along collision normal, using masses)
   - Separation of overlapping pairs
   - Substeps for stability
4. **Balls**: 20 balls, radius 0.4, mass random 1-3, random positions (non-overlapping, inside box), random velocities (speed 2-4)
5. **Render**: SphereGeometry + MeshStandardMaterial per ball, sync with physics
6. **Animation loop**: Use setAnimationLoop, delta clamped to 1/30, paused check
7. **Expose**: __sim = { balls, step, paused }

Let me think about the physics:

**Wall collisions**: For each ball, check if position ± radius exceeds ±5. If so, clamp position and reflect velocity.

**Ball-ball collisions**: 
- Check if distance between centers < sum of radii (0.4 + 0.4 = 0.8)
- If so, separate them (push apart along collision normal)
- Apply elastic collision formula along collision normal:
  - v1_new = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
  - v2_new = v2 - (2*m1/(m1+m2)) * dot(v2-v1, -n) * (-n)
  Wait, let me be more careful:
  - n = normalize(p2 - p1)
  - rel_v = v1 - v2
  - rel_vn = dot(rel_v, n)
  - If rel_vn > 0, they're approaching
  - impulse = (2 * m1 * m2 / (m1 + m2)) * rel_vn  -- actually for elastic:
  - v1 -= (2*m2/(m1+m2)) * rel_vn * n
  - v2 += (2*m1/(m1+m2)) * rel_vn * n

**Non-overlapping start positions**: Use rejection sampling - place each ball at random position inside [-4.6, 4.6] (5 - 0.4), check distance to all previously placed balls > 0.8.

**Substeps**: In step(dt), divide into N substeps (e.g., 4 or 8).

Let me write the code now.

For TypeScript strict mode, I need to be careful with types. Let me make sure everything is properly typed.

The `__sim` object should have `balls` as array of plain objects, `step` as function, `paused` as boolean. But since `paused` needs to be mutable and accessible, I'll use a getter/setter pattern or just make it a mutable property on the object.

Actually, looking at the spec: `(window as any).__sim = { balls, step, paused }` where `paused` is a boolean. If it's set via `(window as any).__sim.paused = true`, then it needs to be a mutable property. I'll define the object and reference it in the render loop.

Let me structure the code:

```ts
import * as THREE from 'three';

// Type for ball
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// Setup renderer, scene, camera
// Box edges
// Lights
// Create 20 balls
// Physics step function with substeps
// Render loop
```

Let me be careful about the separation logic. When two balls overlap:
- Compute overlap = (r1 + r2) - distance
- Push each ball apart along the normal, proportional to inverse mass (heavier ball moves less)
- Then apply elastic collision

Actually, for simplicity and correctness, I'll:
1. First separate overlapping pairs
2. Then apply velocity changes for elastic collision (only if approaching)

Let me code this up now.
