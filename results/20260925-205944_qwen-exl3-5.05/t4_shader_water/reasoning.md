The user wants a single TypeScript file that creates a Three.js scene with an animated ocean-like plane using custom shaders. Let me plan this out:

1. PlaneGeometry 10x10 with 128x128 segments
2. Rotated to lie flat in XZ plane (rotate -PI/2 around X)
3. Custom ShaderMaterial with:
   - Vertex shader: displaces Y based on wave pattern using uTime uniform
   - Fragment shader: colors by height (deep blue low, white foam high)
   - Varying to pass height from vertex to fragment
4. Update uTime each frame from elapsed time
5. Camera at an angle
6. Handle resize, expose globals, set __ready after first frame

Let me write the shaders:

Vertex shader:
- Get position
- Calculate wave displacement using sin/cos of position.x, position.z, and uTime
- Set position.y to the displacement
- Pass height as varying

Fragment shader:
- Use varying height to mix between deep blue and white
- Maybe add some intermediate colors for visual interest

Camera: positioned at an angle, looking at origin. Something like (5, 4, 5) looking at (0, 0, 0).

Let me write the complete file now.
