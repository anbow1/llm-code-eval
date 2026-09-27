The user wants a single TypeScript file that creates a Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. WebGLRenderer created manually, appended to document.body
8. Window resize handling
9. setAnimationLoop for render loop
10. Expose __scene, __camera, __renderer on window
11. Set __ready = true after first frame
12. No external assets
13. Must compile with tsc --strict

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- Add cube with BoxGeometry and MeshStandardMaterial
- Add AmbientLight and DirectionalLight
- Set background color different from cube
- Handle resize
- Use setAnimationLoop with delta time for rotation
- Expose objects on window
- Set __ready after first frame

Let me make sure the types are correct for strict mode. The `setAnimationLoop` callback receives `(time: number, delta: number)` - actually it receives a DOMHighResPerformanceTimeStamp value. Let me check: `renderer.setAnimationLoop(callback: ((time: number, delta: number) => void) | null)`. Yes, it passes delta as the second argument.

For strict mode, I need to be careful with types. Let me write clean code.
