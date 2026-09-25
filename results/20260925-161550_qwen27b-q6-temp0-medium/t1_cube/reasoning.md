The user wants a single TypeScript file that:
1. Creates a Three.js scene with a single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Cube rotates continuously around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. Rotation speed uses delta time (frame-rate independent)
7. Follows all the hard rules: import Three.js, create renderer, append to body, handle resize, use setAnimationLoop, expose __scene/__camera/__renderer, set __ready after first frame, no external assets, compile with tsc --strict

Let me write this carefully to ensure it compiles with strict mode.

Key considerations:
- `tsc --strict` means no implicit any, all types must be explicit where needed
- Need to use `renderer.setAnimationLoop` with a callback that receives `time` parameter
- Delta time: I'll track previous time and compute delta
- The `setAnimationLoop` callback receives a `time` parameter in milliseconds
- Need to handle the case where delta might be 0 or very large on first frame

Let me write the file:
