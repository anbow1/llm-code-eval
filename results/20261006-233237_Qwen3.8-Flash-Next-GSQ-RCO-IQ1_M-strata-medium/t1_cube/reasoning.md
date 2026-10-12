The user wants a simple Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Rotates continuously around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned to see the cube
5. Background color different from cube color
6. Frame-rate independent rotation using delta time

Let me write a complete TypeScript file that compiles with `tsc --strict`.

Key considerations:
- Import as `import * as THREE from 'three'`
- Create WebGLRenderer, append to body
- Handle resize
- Use `setAnimationLoop` with delta time
- Expose `__scene`, `__camera`, `__renderer`, `__ready`
- No external assets

Let me write this carefully to ensure strict TypeScript compliance.
