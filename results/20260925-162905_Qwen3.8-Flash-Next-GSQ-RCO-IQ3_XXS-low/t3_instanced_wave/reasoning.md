The user wants a single TypeScript file that:
1. Creates a 100x100 grid (10,000 instances) of small cubes using ONE InstancedMesh
2. Animates a radial wave using sin(distance * k - time * speed) * amplitude
3. Sets colors per instance with setColorAt (gradient by grid position)
4. Reuses a Matrix4/Object3D for updates - no allocations in the render loop
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle showing the whole grid and wave
7. Proper Three.js setup with renderer, resize handling, __ready flag

Let me write this carefully to ensure it compiles with `tsc --strict`.

Key considerations:
- InstancedMesh constructor takes geometry, material, count
- setMatrixAt requires a Matrix4
- setColorAt requires a Color
- Need to mark instanceMatrix.needsUpdate and instanceColor.needsUpdate
- Use a reusable Matrix4 and Object3D (or compose the matrix directly)
- Clock for delta time
- Camera positioned at an angle (e.g., elevated and offset)

Let me structure the code:

```ts
import * as THREE from 'three';

// Scene setup
// Renderer setup
// Camera setup (angled view)
// Lights
// InstancedMesh with 10000 instances
// Set initial colors with setColorAt
// Render loop with wave animation
// Resize handler
// Window exports
```

For the wave:
- distance = sqrt((x - center)^2 + (z - center)^2)
- y = sin(distance * k - time * speed) * amplitude

For colors: gradient based on grid position (x, z) - e.g., map x to red component, z to blue component.

I'll use a reusable Matrix4 and compose it with position, no rotation, uniform scale.
