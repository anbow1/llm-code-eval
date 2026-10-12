The user wants a complete TypeScript file that creates a plane with custom shaders for wave animation. Let me break down the requirements:

1. PlaneGeometry 10x10 with 128x128 segments, rotated to lie flat in XZ plane
2. Custom ShaderMaterial with vertex and fragment shaders
3. Vertex shader: displace vertices with wave pattern based on position and uTime uniform
4. Fragment shader: color by height (low = deep blue, high = white foam), pass height via varying
5. Update uTime every frame from elapsed time
6. No lights needed
7. Camera at an angle
8. WebGLRenderer appended to document.body
9. Handle window resize
10. Use setAnimationLoop
11. Expose __scene, __camera, __renderer, __ready
12. Must compile with tsc --strict

Let me write this carefully.

For the vertex shader, I'll use sin/cos based on position.x and position.y (before rotation, since the plane's local space has x and y, and after rotation by -PI/2 around X, y becomes z). Actually, in the vertex shader, the position is in local space before the model matrix is applied. The plane geometry has vertices in XY plane, so position.x and position.y are the 2D coordinates. After rotation by -Math.PI/2 around X axis, it lies in XZ plane.

So in the vertex shader, I'll use position.x and position.y for the wave calculation, and displace position.z (which becomes Y after rotation).

Wait, actually with a ShaderMaterial and the rotation applied via mesh.rotation.x = -Math.PI/2, the vertex shader works in local space. The plane geometry vertices are in XY plane (x, y, z=0). After rotation, they'll be in XZ. So in the vertex shader, I should displace along the local Z axis (position.z), which after rotation becomes world Y.

Let me write the vertex shader:
- Get wave height from sin/cos of position.x, position.y, and uTime
- Displace position.z by that height
- Pass height as varying

Fragment shader:
- Use varying height to interpolate between deep blue and white

Let me make sure the TypeScript compiles with --strict. I need to be careful with types.

For the uniform, I'll define it as `{ value: number }`.

Let me write the complete file now.
