The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time

Let me write a clean TypeScript file that meets all requirements.

Key considerations:
- Import THREE from 'three'
- Set up renderer, scene, camera, lights, cube
- Use `renderer.setAnimationLoop` with clock for delta time
- Expose `__scene`, `__camera`, `__renderer`, `__ready`
- Handle window resize
- Background color different from cube color
- No external assets

Let me pick colors:
- Cube: e.g., 0x4285f4 (blue)
- Background: e.g., 0x1a1a2e (dark navy)

Camera position: something like (4, 3, 5) looking at origin, or (3, 2, 3) — anything that clearly shows the cube.

For delta time: use THREE.Clock and getDelta() in the animation loop.

Let me write it out.
