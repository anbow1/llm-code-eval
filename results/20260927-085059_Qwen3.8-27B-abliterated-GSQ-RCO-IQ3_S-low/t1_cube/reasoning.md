The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned to see the cube clearly
5. Background color different from cube color
6. Frame-rate independent rotation using delta time

Let me write a complete TypeScript file that meets all the requirements:
- Import THREE from 'three'
- Create renderer, append to document.body
- Handle window resize
- Use setAnimationLoop
- Use delta time for rotation
- Expose __scene, __camera, __renderer
- Set __ready = true after first frame
- No external assets
- Must compile with tsc --strict

Let me write this carefully.
