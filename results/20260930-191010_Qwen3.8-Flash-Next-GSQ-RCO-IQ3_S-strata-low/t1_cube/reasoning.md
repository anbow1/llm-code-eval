The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes (frame-rate independent using delta time)
3. AmbientLight and DirectionalLight
4. PerspectiveCamera with the cube clearly visible
5. Background color different from the cube color
6. Proper setup: renderer, resize handling, __scene, __camera, __renderer, __ready flags
7. Uses setAnimationLoop with clock/delta time

Let me write a clean, complete TypeScript file that compiles with `tsc --strict`.
