The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Rotates continuously around X and Y axes (frame-rate independent using delta time)
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera placed so cube is visible
5. Background color different from cube color
6. WebGLRenderer appended to document.body
7. Handle window resize
8. Use setAnimationLoop
9. Expose scene, camera, renderer on window
10. Set __ready = true after first frame
11. Must compile with tsc --strict

Let me write a clean, complete TypeScript file.
