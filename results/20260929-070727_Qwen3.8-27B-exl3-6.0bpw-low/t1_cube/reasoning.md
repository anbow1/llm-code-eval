The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. The cube rotates continuously around X and Y axes
3. Lit with one AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Follows all the hard rules (imports, renderer creation, resize handling, setAnimationLoop, window exports, __ready flag)

Let me write this carefully:

- Import THREE from 'three'
- Create scene, set background color (e.g., dark blue or gray)
- Create cube with BoxGeometry and MeshStandardMaterial (e.g., red or orange)
- Add AmbientLight and DirectionalLight
- Create PerspectiveCamera positioned at some distance (e.g., z=3 or z=5)
- Create WebGLRenderer, append to document.body
- Handle resize
- Use Clock for delta time
- In animation loop, rotate cube by delta * speed
- Set window exports
- Set __ready after first frame

Let me make sure it compiles with `tsc --strict`. I need to be careful about types.

For the clock, I'll use THREE.Clock.

Let me write this out:
