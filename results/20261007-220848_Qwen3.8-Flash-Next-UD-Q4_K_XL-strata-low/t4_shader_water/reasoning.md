The user wants a complete TypeScript file that creates a plane with a custom ShaderMaterial showing animated waves. Let me write this carefully:

1. PlaneGeometry 10x10 with 128x128 segments
2. Custom ShaderMaterial with GLSL shaders
3. Vertex shader: displace Y based on position and uTime
4. Fragment shader: color by height (deep blue to white foam)
5. Update uTime each frame
6. Camera at an angle
7. Proper setup with renderer, scene, camera, resize handling

Let me make sure:
- PlaneGeometry is created in XY by default, so I need to rotate it to lie flat in XZ plane (rotate -PI/2 around X)
- Actually, I can rotate the geometry or the mesh. Rotating the mesh is cleaner.
- The vertex shader displaces along Y (up/down), so after rotation the plane is in XZ and displacement goes up in Y.
- I need to pass height as a varying to the fragment shader.

Let me write the shaders:

Vertex shader:
- Take position, compute a wave based on position.x, position.y (which will be z after rotation) and uTime
- Displace position.z (since in local space before rotation, the plane is in XY, so z is the "up" direction before rotation)
- Actually, if I rotate the mesh by -PI/2 on X, then local Y becomes world Z, and local Z becomes world -Y. Hmm, let me think more carefully.

Actually, let me just rotate the geometry itself so the plane is in XZ in local space. Then in the vertex shader, I displace along Y.

I can use `geometry.rotateX(-Math.PI / 2)` to rotate the geometry so it lies in the XZ plane.

Then in the vertex shader:
- position.x and position.z are the plane coordinates
- I displace position.y with the wave

Wave function: something like sin(x * freq + time) * cos(z * freq + time) or similar combination.

Fragment shader:
- Use the varying height to interpolate between deep blue and white

Let me write the complete file now.
