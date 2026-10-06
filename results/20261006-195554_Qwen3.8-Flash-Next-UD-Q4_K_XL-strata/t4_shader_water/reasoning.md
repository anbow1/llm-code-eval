The user wants a single TypeScript file that creates a waving plane using a custom ShaderMaterial with GLSL vertex and fragment shaders. Let me plan this out:

1. Import Three.js
2. Create scene, camera, renderer
3. Create a PlaneGeometry(10, 10, 128, 128)
4. Rotate it to lie flat in XZ plane (rotation.x = -Math.PI/2)
5. Custom ShaderMaterial with:
   - Vertex shader: displace Y based on wave pattern using position.x and position.z (or just position since it's a plane before rotation... wait, after rotation the plane's local coordinates are X and Y, but the shader works in local space before the model matrix transforms it)
   - Actually, PlaneGeometry creates a plane in XY plane. When rotated -PI/2 around X, it lies in XZ. But in the vertex shader, we work in local space where the plane is in XY. So I should displace along local Z (which becomes world Y after rotation).
   - Fragment shader: color by height using a varying passed from vertex shader
6. Update uTime uniform each frame
7. Handle resize
8. Set up animation loop
9. Expose window globals

Let me think about the vertex shader:
- The plane is in XY local space (before rotation)
- I'll use position.x and position.y for wave calculation
- Displace position.z (which after rotation becomes Y in world space)
- Pass the displacement as a varying to fragment shader

Fragment shader:
- Use the varying height to interpolate between deep blue (low) and white (high)

Camera at an angle - I'll position it at something like (5, 7, 5) looking at origin.

Let me write the code carefully for strict TypeScript compilation.
