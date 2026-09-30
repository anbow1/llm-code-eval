The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes (frame-rate independent using delta time)
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. Proper setup: renderer, resize handling, animation loop, window exports, __ready flag

Let me write a clean, strict-mode compatible TypeScript file.

Key considerations:
- Use `setAnimationLoop` with a callback that receives elapsed time
- Calculate delta from elapsed time between frames
- Use `setAnimationLoop((elapsedTime) => {...})` where elapsedTime is in milliseconds
- For delta: track previous elapsed time and compute difference
- BoxGeometry with MeshStandardMaterial
- Set clear color different from cube color
- Export scene, camera, renderer to window
- Set __ready after first frame
- Handle window resize

Let me write this carefully to compile with tsc --strict.
