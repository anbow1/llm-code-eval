The user wants a single TypeScript file that:
1. Creates a Three.js scene with a cube (BoxGeometry + MeshStandardMaterial) at origin
2. Cube rotates continuously around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is clearly visible
5. Background color different from cube color
6. Rotation speed is frame-rate independent (delta time)
7. Imports: `import * as THREE from 'three'`
8. Creates WebGLRenderer, appends canvas to document.body
9. Sizes from window.innerWidth / window.innerHeight, handles resize
10. Uses renderer.setAnimationLoop
11. Exposes __scene, __camera, __renderer on window
12. Sets __ready = true after first frame
13. No external assets
14. Must compile with tsc --strict

Let me write this carefully:

- Cube: BoxGeometry(1, 1, 1) with MeshStandardMaterial (e.g., red color)
- Background: something different, like dark blue or gray
- Camera: PerspectiveCamera, positioned at (2, 2, 2) looking at origin
- Lights: AmbientLight + DirectionalLight
- Rotation: use clock.getDelta() for frame-rate independence
- Animation loop: renderer.setAnimationLoop
- Resize handler
- __ready set after first frame using a flag

Let me make sure strict mode compliance:
- All variables typed
- No implicit any
- Proper null checks

Let me write it:
