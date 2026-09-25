The user wants a complete TypeScript file that creates a wave-animated plane using Three.js with custom GLSL shaders. Let me plan this out:

1. Create a PlaneGeometry 10x10 with 128x128 segments
2. Rotate it to lie flat in XZ plane (rotate -PI/2 around X)
3. Write a ShaderMaterial with:
   - Vertex shader: displaces vertices based on sin/cos wave patterns using uTime
   - Fragment shader: colors based on height (deep blue at low, white at high)
4. Update uTime each frame from elapsed time
5. Camera at an angle for visibility
6. Handle resize, expose globals, set __ready after first frame

Let me write this carefully to ensure it compiles with `tsc --strict`.

Key considerations:
- Need to use `import * as THREE from 'three'`
- Renderer must be created and appended to document.body
- Use `renderer.setAnimationLoop`
- Handle resize
- The varying should be called `vHeight` or similar to pass height to fragment shader
- Deep blue at low heights, white foam at high heights - can use mix()

Let me write the GLSL shaders:

Vertex shader:
- Compute wave height using sin/cos combinations of position.x, position.y (which will become z after rotation), and uTime
- Displace position.y (or z depending on how we think about it) - actually since we rotate the plane to lie in XZ, the local Y axis of the plane becomes the world Y axis. So we displace position.y in local space.
- Pass the height as a varying.

Wait, let me think about this more carefully. The PlaneGeometry is created in the XY plane by default. When we rotate it -PI/2 around X, the Y axis of the plane maps to -Z in world space, and the Z axis (which is 0) maps to Y in world space. 

Actually, for the shader approach, I'll apply the displacement in the vertex shader. The vertex shader works in local/object space. The plane geometry has vertices in the XY plane (x from -5 to 5, y from -5 to 5, z = 0). If I rotate the mesh by -PI/2 around X, the object-space Y becomes world-space Z (sort of). 

Actually, it might be simpler to NOT rotate the geometry but instead work with the vertex shader. The plane is in XY by default. If I rotate the mesh -Math.PI/2 on X, then object Y maps to world -Z and object Z maps to world Y. So in the vertex shader, I can displace along object-space Z (which will appear as world Y after rotation).

Alternatively, I could just displace along object-space Y in the vertex shader (making waves go up/down relative to the plane), and then rotate the mesh so the plane lies in XZ and waves go up in world Y. Wait no - if the plane is in XY and I displace Y, the waves go "up" in the plane's Y direction. After rotating -PI/2 around X, object Y becomes world -Z... that's not right.

Let me reconsider. PlaneGeometry by default:
- Vertices are in the XY plane (z=0)
- x ranges from -width/2 to width/2
- y ranges from -height/2 to height/2
- z = 0

If I rotate the mesh by -Math.PI/2 around X axis:
- Object X → World X
- Object Y → World -Z  (y goes to -z)
- Object Z → World Y

So to make waves go up in world Y, I should displace in object Z direction in the vertex shader. After the mesh rotation, object Z becomes world Y. 

But actually, since the mesh rotation is applied via the model matrix (uModelMatrix), the shader sees object-space coordinates. So in the vertex shader, I'll displace `position.z` (which is 0 for the plane), and after the mesh's model matrix rotates it, that displacement will appear along world Y.

Hmm, but the varying height should reflect the actual displacement. Let me just compute the wave height in the vertex shader and pass it as a varying.

Actually, let me think again. Maybe simpler approach:
- Don't rotate the mesh. Instead, create the geometry already in XZ plane by... no, PlaneGeometry is always XY.
- Rotate the mesh -PI/2 around X.
- In vertex shader, displace position.z by the wave height (since object Z → world Y after rotation).
- Pass the wave height as varying.

Wait, actually an even simpler approach: just use `position` in the shader which gives local coordinates. The plane is in XY. I'll displace `position.y` by the wave. Then I rotate the mesh -PI/2 on X. Object Y (where displacement happens) → World -Z. That means waves go in the Z direction in world space, not up. That's wrong.

OK so: rotate mesh -PI/2 around X. Object Z (originally 0 for plane vertices) → World Y. So displace position.z in vertex shader → waves go up in world space. 

Let me use this approach:
- `float h = sin(pos.x * freq + uTime) * cos(pos.y * freq + uTime) * amplitude;`
- `pos.z += h;` (displacement in z, which becomes world y after mesh rotation)
- Pass `h` as `vHeight` varying.

Actually, I realize I can simplify by just not rotating and instead making the camera look at it from the right angle. But the requirement says "rotated to lie flat in the XZ plane", so I should rotate.

Let me write the code now.

For the camera, I'll position it at something like (5, 6, 8) looking at origin, so waves are visible.

For colors: low height (negative) = deep blue (like ocean deep), high height (positive) = white (foam). I'll normalize height to 0-1 range and use mix.

Let me write the full file now.
