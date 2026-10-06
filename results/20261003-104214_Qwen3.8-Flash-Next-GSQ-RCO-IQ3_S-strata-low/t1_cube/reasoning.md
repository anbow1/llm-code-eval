The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. AmbientLight and DirectionalLight
4. PerspectiveCamera clearly showing the cube
5. Background color different from cube color
6. Frame-rate independent rotation using delta time

I need to write a complete TypeScript file that:
- Imports Three.js
- Creates renderer, scene, camera
- Adds lights, cube
- Uses setAnimationLoop with delta time
- Handles window resize
- Exposes scene/camera/renderer on window
- Sets __ready after first frame
- Compiles with tsc --strict

Let me write this carefully to ensure strict TypeScript compliance.
