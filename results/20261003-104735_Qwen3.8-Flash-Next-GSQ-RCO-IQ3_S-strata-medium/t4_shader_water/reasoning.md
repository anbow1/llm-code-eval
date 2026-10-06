The user wants a single TypeScript file that creates a 3D scene with an animated ocean/water plane using a custom ShaderMaterial in Three.js. Let me plan this out:

1. Create a renderer, scene, camera setup
2. Create a PlaneGeometry(10, 10, 128, 128) rotated to lie flat in XZ plane (rotate -π/2 around X)
3. Custom ShaderMaterial with:
   - Uniforms: uTime (float)
   - Vertex shader: displace Y based on wave pattern using position and uTime
   - Fragment shader: color based on height varying (low=deep blue, high=white)
4. Animation loop updating uTime
5. Handle resize
6. Expose globals for testing

Let me write the GLSL shaders carefully:

Vertex shader:
- Take position, compute a wave displacement based on x, z (well, the plane is 10x10 so positions range from -5 to 5)
- Use sin/cos combinations for interesting wave patterns
- Pass height to fragment via varying

Fragment shader:
- Mix between deep blue and white based on height varying
- Could also add some intermediate colors (lighter blue for medium heights)

Let me make sure the TypeScript compiles with strict mode. I need to be careful with types.

For the camera, I'll position it at an angle to see the waves clearly, like position (5, 6, 8) looking at origin.

Let me write the complete file now.
