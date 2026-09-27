The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Rotates continuously around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation (delta time)
7. All the hard rules: import three, create renderer, append to body, resize handling, setAnimationLoop, expose window properties, __ready flag, no external assets

Let me write this carefully to ensure it compiles with tsc --strict.

Key considerations:
- Use `import * as THREE from 'three'`
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight
- Handle resize
- Use renderer.setAnimationLoop
- Use clock for delta time
- Expose scene, camera, renderer on window
- Set __ready = true after first frame
- No external assets

Let me write this:
