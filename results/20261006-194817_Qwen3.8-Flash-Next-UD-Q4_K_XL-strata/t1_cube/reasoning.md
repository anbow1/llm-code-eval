The user wants a simple Three.js scene with:
- A single cube (BoxGeometry + MeshStandardMaterial) at origin
- Rotates continuously around X and Y axes
- One AmbientLight and one DirectionalLight
- PerspectiveCamera placed so cube is visible
- Background color different from cube color
- Frame-rate independent rotation using delta time

I need to create a complete TypeScript file that:
- Imports THREE from 'three'
- Creates WebGLRenderer and appends to document.body
- Handles window resize
- Uses renderer.setAnimationLoop
- Uses delta time for rotation
- Exposes __scene, __camera, __renderer, __ready

Let me write this carefully to ensure it compiles with tsc --strict.
