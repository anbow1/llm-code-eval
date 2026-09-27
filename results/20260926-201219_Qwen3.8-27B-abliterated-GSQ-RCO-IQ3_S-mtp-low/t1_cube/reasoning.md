The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time

Let me write a complete TypeScript file that meets all the hard rules:
- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Motion uses delta/elapsed time
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- No external assets

Let me write this carefully to ensure it compiles with tsc --strict.
