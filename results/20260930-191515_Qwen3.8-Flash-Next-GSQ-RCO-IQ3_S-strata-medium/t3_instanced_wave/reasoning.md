The user wants a single TypeScript file that renders a 100x100 grid of cubes using InstancedMesh with a radial wave animation. Let me carefully implement all the requirements:

1. 100x100 grid (10,000 instances) using ONE InstancedMesh
2. Radial wave animation: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Per-instance colors with setColorAt (gradient by grid position)
4. Reuse one Object3D or Matrix4 - no allocations in render loop
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle
7. Must compile with tsc --strict
8. Use setAnimationLoop, delta/elapsed time
9. Expose __scene, __camera, __renderer, __ready

Let me write this carefully:

- Grid is 100x100, spacing between cubes
- Each cube is small (e.g., 0.5 units)
- Spacing maybe 1 unit apart
- Center is at (50, 50) in grid coords, world coords centered at origin
- Precompute distances from center for each instance
- In render loop, for each instance, set Y position based on wave formula
- Use a reused Object3D for composing matrices

Let me structure this:

```ts
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(...);
const renderer = new THREE.WebGLRenderer(...);

// Grid parameters
const SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.4;

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial();

// InstancedMesh
const count = SIZE * SIZE;
const mesh = new THREE.InstancedMesh(geometry, material, count);

// Precompute distances from center
const distances = new Float32Array(count);

// Set colors
// Set initial matrices

// Reusable Object3D
const dummy = new THREE.Object3D();

// Animation
const clock = new THREE.Clock();

// In loop:
// - update Y positions using wave
// - flag instanceMatrix.needsUpdate

// Lights
// Camera at angle
```

For the camera angle, I'll position it at something like (50, 80, 80) looking at center. The grid is 100x100 with spacing 1, so it spans 100 units. Center is at (0,0,0) in world space.

Let me make sure no allocations happen in the render loop. I'll precompute:
- x positions for each instance
- z positions for each instance
- distances from center for each instance

Then in the loop, I just set dummy.position, dummy.updateMatrix(), mesh.setMatrixAt(), and flag needsUpdate.

Actually, for strict TypeScript compliance, I need to be careful. Let me also make sure `instanceColor` is properly typed - in newer Three.js, `setColorAt` exists on InstancedMesh.

Let me also use `mesh.instanceMatrix.needsUpdate = true;` and `mesh.instanceColor!.needsUpdate = true;` after setting colors.

For the color gradient: I'll use HSL based on position - hue based on x+z, saturation and lightness fixed.

Let me write the complete file now.
