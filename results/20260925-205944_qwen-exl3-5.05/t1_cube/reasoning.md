The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes (frame-rate independent using delta time)
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. WebGLRenderer appended to document.body
7. Handle window resize
8. Use setAnimationLoop
9. Expose __scene, __camera, __renderer, __ready

Let me write a clean, strict TypeScript file that compiles with `tsc --strict`.

Key considerations:
- Import THREE from 'three'
- Use Clock for delta time
- BoxGeometry default is 1x1x1, MeshStandardMaterial with a color
- Camera at z=3 or so to see the cube clearly
- Background: e.g., dark blue (0x1a1a2e), cube: e.g., orange (0xff6600)
- AmbientLight + DirectionalLight
- Rotation: cube.rotation.x += speed * delta; cube.rotation.y += speed * delta;
- Handle resize
- setAnimationLoop
- __ready after first frame

Let me make sure it's strict-safe. No implicit any, proper types.
