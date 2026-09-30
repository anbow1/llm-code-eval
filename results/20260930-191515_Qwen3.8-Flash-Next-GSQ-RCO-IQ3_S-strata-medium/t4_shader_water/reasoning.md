The user wants a single TypeScript file that creates a plane with a custom ShaderMaterial using GLSL shaders for wave displacement and height-based coloring. Let me write this carefully.

Requirements:
- PlaneGeometry 10x10 with 128x128 segments, rotated to lie flat in XZ plane
- Custom THREE.ShaderMaterial with vertex and fragment shaders
- Vertex shader: displace vertices based on position and uTime uniform
- Fragment shader: color by height (low = deep blue, high = white foam), pass height via varying
- Update uTime every frame from elapsed time
- No lights needed
- Camera at an angle so waves are visible
- Proper setup: import three, create renderer, append to body, handle resize, setAnimationLoop, expose window.__scene, __camera, __renderer, set __ready after first frame

Let me write this carefully with strict TypeScript compliance.
