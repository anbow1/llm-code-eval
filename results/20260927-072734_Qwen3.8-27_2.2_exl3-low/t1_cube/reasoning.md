The user wants a single TypeScript file that creates a Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. WebGLRenderer created manually, appended to document.body
8. Window resize handling
9. setAnimationLoop for render loop
10. Expose __scene, __camera, __renderer, __ready on window
11. No external assets
12. Must compile with tsc --strict

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- Add cube with BoxGeometry and MeshStandardMaterial
- Add AmbientLight and DirectionalLight
- Position camera at a reasonable distance (e.g., z=5)
- Set background color (e.g., dark blue or gray)
- Cube color different (e.g., red or orange)
- Use clock.getDelta() for delta time
- Handle resize
- setAnimationLoop
- Expose window properties
- Set __ready after first frame

Let me make sure types are correct for strict mode.
