The user wants a single TypeScript file that creates a Three.js scene with a plane geometry (10x10, 128x128 segments) using a custom ShaderMaterial with wave displacement in the vertex shader and height-based coloring in the fragment shader.

Let me plan the implementation:

1. Import Three.js
2. Create scene, camera, renderer
3. Create PlaneGeometry(10, 10, 128, 128)
4. Write vertex shader: displace Y based on sin/cos waves using position.x, position.z, and uTime uniform
5. Write fragment shader: mix between deep blue and white based on varying height
6. Create ShaderMaterial with these shaders
7. Rotate plane to lie flat in XZ plane (rotation.x = -Math.PI / 2)
8. Position camera at an angle
9. Render loop with elapsed time updating uTime
10. Handle resize
11. Expose scene, camera, renderer, __ready

Let me write the shaders:

Vertex shader:
- uniform float uTime
- varying float vHeight
- Displace position.y with something like sin(pos.x * freq + uTime) * sin(pos.z * freq + uTime * 0.7)

Fragment shader:
- varying float vHeight
- Mix between deep blue (0,0,0.3) and white (1,1,1) based on normalized height

Let me make sure the types are correct for strict TypeScript compilation. The uniforms object for ShaderMaterial in Three.js types might need to be typed as `{ [uniform: string]: THREE.IUniform }`.

Let me write the complete file.
