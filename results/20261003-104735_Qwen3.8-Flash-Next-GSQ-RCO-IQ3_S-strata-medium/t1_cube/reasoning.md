The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes using delta time (frame-rate independent)
3. AmbientLight + DirectionalLight
4. PerspectiveCamera positioned to see the cube
5. Background color different from cube color
6. Full TypeScript file that compiles with tsc --strict
7. Import Three.js as `import * as THREE from 'three'`
8. Create WebGLRenderer, append to document.body
9. Handle window resize
10. Use setAnimationLoop
11. Expose __scene, __camera, __renderer, __ready

Let me write a clean, complete TypeScript file.
