The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a cube at the origin
2. The cube rotates continuously around X and Y axes using delta time
3. Lit with AmbientLight and DirectionalLight
4. PerspectiveCamera positioned to see the cube clearly
5. Background color different from cube color
6. Frame-rate independent rotation
7. Follows all the hard rules (import, renderer setup, resize, setAnimationLoop, window exposure, __ready flag)

Let me write this carefully to ensure it compiles with `tsc --strict`.

Key considerations:
- Use `import * as THREE from 'three'`
- Create renderer, append canvas to document.body
- Size from window.innerWidth/innerHeight
- Handle resize
- Use setAnimationLoop
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- No external assets
- Delta time for rotation

I'll use a clock or track time manually. Actually, `setAnimationLoop` passes a timestamp parameter. I can use that or use THREE.Clock.

Let me use THREE.Clock for clean delta time.

For the first frame detection, I'll use a flag and set __ready after the first render call.

Let me make sure the code is strict-mode compliant - no implicit any, all types explicit where needed.
