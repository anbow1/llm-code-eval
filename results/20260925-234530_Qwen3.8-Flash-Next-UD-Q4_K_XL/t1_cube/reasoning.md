The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time

Let me write a complete TypeScript file that meets all the requirements:
- Import three as `import * as THREE from 'three';`
- Create WebGLRenderer, append to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use setAnimationLoop with delta time
- Expose __scene, __camera, __renderer, __ready
- No external assets
- Must compile with tsc --strict

For delta time with setAnimationLoop, the callback receives a timestamp. I can use THREE.Clock to get delta.

Let me write this carefully:
