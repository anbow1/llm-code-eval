The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes
3. AmbientLight + DirectionalLight
4. PerspectiveCamera positioned to see the cube
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Must compile with tsc --strict
8. Expose __scene, __camera, __renderer, __ready to window

Let me write a clean, complete TypeScript file.
