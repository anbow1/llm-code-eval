The user wants a single TypeScript file that creates a Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes (frame-rate independent using delta time)
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Must compile with `tsc --strict`
7. Must import Three.js as `import * as THREE from 'three';`
8. Must create WebGLRenderer, append canvas to document.body
9. Must handle window resize
10. Must use renderer.setAnimationLoop
11. Must expose __scene, __camera, __renderer on window
12. Must set __ready = true after first frame
13. No external assets

Let me write this carefully for strict TypeScript compliance.
