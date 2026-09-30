The user wants a complete TypeScript file that:
1. Imports Three.js from 'three'
2. Creates a WebGLRenderer, appends canvas to document.body
3. Handles resize
4. Uses renderer.setAnimationLoop
5. Exposes __scene, __camera, __renderer, __ready, __sim
6. Simulates 20 balls bouncing inside a closed box (-5 to +5)
7. Box drawn with LineSegments + EdgesGeometry
8. Balls: radius 0.4, varying mass (1..3), non-overlapping start positions, speeds 2..4
9. Physics: elastic wall collisions, elastic ball-ball collisions (mass-aware), no gravity
10. __sim = { balls, step, paused }
11. step(dt) uses substeps
12. Render loop: when not paused, call step with clamped delta (max 1/30)
13. Camera sees whole box

Let me write this carefully.

For ball-ball elastic collisions with different masses:
v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, x1-x2)/|x1-x2|^2 * (x1-x2)
v2' = v2 - (2*m1/(m1+m2)) * dot(v2-v1, x2-x1)/|x2-x1|^2 * (x2-x1)

For wall collisions: reflect velocity component, clamp position.

For non-overlapping start: I'll use rejection sampling.

Let me structure the code:

```ts
import * as THREE from 'three';

// Ball type
interface Ball {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
}

// Create balls with non-overlapping positions
// Physics step with substeps
// Render loop
```

Let me be careful about strict TypeScript compilation. I need to make sure all types are correct.

Let me write the complete file now.
