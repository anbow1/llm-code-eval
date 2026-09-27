The user wants a single TypeScript file that:
1. Creates a Three.js scene with a rotating cube
2. Uses BoxGeometry + MeshStandardMaterial
3. AmbientLight + DirectionalLight
4. PerspectiveCamera positioned to clearly see the cube
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Follows all the hard rules specified

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Delta time for rotation (Clock)
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- No external assets

Let me think about the rotation: I'll use THREE.Clock to get delta time, then rotate by a fixed angular velocity * delta.

For the camera, I'll place it at something like (2, 2, 3) looking at origin, so the cube at origin with size 1 is clearly visible.

Background: dark blue or gray. Cube: red or orange.
