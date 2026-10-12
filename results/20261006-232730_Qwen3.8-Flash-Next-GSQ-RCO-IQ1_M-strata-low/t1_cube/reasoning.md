The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes (frame-rate independent using delta time)
3. AmbientLight + DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. Must compile with tsc --strict
7. Must expose __scene, __camera, __renderer, __ready
8. Use setAnimationLoop
9. Handle window resize

Let me write a complete TypeScript file that does all this.
