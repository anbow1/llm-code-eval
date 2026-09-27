The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Cube rotates continuously around X and Y axes
3. Lit with one AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is clearly visible
5. Background color different from cube color
6. Rotation speed must be frame-rate independent (use delta time)
7. Must follow all the hard rules about imports, window properties, resize handling, animation loop, etc.

Let me write this carefully:

- Import THREE from 'three'
- Create scene with a background color (e.g., dark blue/gray)
- Create cube with MeshStandardMaterial (e.g., red/orange)
- Position camera at some distance (e.g., z=3) looking at origin
- Add AmbientLight and DirectionalLight
- Use renderer.setAnimationLoop with a clock for delta time
- Handle resize
- Expose __scene, __camera, __renderer, __ready

Let me make sure the rotation uses delta time: cube.rotation.x += speed * delta; cube.rotation.y += speed * delta;

I'll use THREE.Clock for timing.
