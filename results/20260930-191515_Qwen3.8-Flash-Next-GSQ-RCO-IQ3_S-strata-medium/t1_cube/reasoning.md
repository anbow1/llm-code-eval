The user wants a single TypeScript file that:
1. Creates a scene with a rotating cube (BoxGeometry + MeshStandardMaterial)
2. Lights it with AmbientLight and DirectionalLight
3. Uses PerspectiveCamera positioned to see the cube
4. Background color different from cube color
5. Rotation is frame-rate independent using delta time
6. Imports Three.js as `import * as THREE from 'three'`
7. Compiles with `tsc --strict`
8. Creates WebGLRenderer, appends to document.body
9. Handles resize
10. Uses setAnimationLoop
11. Exposes __scene, __camera, __renderer on window
12. Sets __ready = true after first frame
13. No external assets

Let me write a clean, strict TypeScript file.
