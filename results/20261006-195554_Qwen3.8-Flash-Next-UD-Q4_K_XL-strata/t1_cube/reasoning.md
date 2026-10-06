The user wants a simple Three.js scene with:
- A single cube (BoxGeometry + MeshStandardMaterial) at origin
- Continuous rotation around X and Y axes using delta time
- AmbientLight + DirectionalLight
- PerspectiveCamera positioned to see the cube
- Background color different from cube color
- WebGLRenderer created and appended to document.body
- Window resize handling
- setAnimationLoop for render loop
- Delta-time based rotation
- Expose scene, camera, renderer, __ready on window
- No external assets
- TypeScript strict compatible

Let me write this carefully to ensure it compiles with `tsc --strict`.
