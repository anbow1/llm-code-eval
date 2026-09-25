The user wants a complete TypeScript file that:
1. Creates a 10x10 plane with 128x128 segments, rotated flat in XZ plane
2. Uses a custom ShaderMaterial with GLSL vertex and fragment shaders
3. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
4. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
5. Updates uTime every frame from elapsed time
6. No lights (ShaderMaterial is unlit)
7. Camera at an angle so waves are visible
8. All the hard rules about imports, renderer, resize, animation loop, exposing for testing, etc.

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- Create PlaneGeometry(10, 10, 128, 128)
- Rotate the plane to lie flat: rotation.x = -Math.PI / 2
- Write vertex shader with uTime uniform, compute wave displacement
- Write fragment shader with vHeight varying, color from deep blue to white
- Update uTime from elapsed time (clock.getElapsedTime() or similar)
- Handle resize
- Use setAnimationLoop
- Expose __scene, __camera, __renderer, __ready

Let me think about the wave pattern. A good wave could be:
- Multiple sine waves combined for natural look
- displacement = sin(x * freq + time) * cos(z * freq + time) * amplitude
- Or simpler: sin(length(xz) * freq - time) for circular waves

I'll use a combination for visual interest:
- wave1 = sin(x * 1.5 + uTime) * 0.3
- wave2 = cos(z * 2.0 + uTime * 0.8) * 0.2
- wave3 = sin((x + z) * 1.0 + uTime * 1.2) * 0.15
- total displacement = wave1 + wave2 + wave3

In the vertex shader, since the plane is rotated to XZ, but the geometry itself is in XY before rotation. Wait - if I rotate the mesh, the geometry positions are still in XY plane (local space). So in the vertex shader, the position attribute has x and y as the plane coordinates, and z is 0 (before displacement). The mesh rotation handles the XZ orientation.

Actually, let me reconsider. PlaneGeometry creates vertices in the XY plane. If I rotate the mesh by -PI/2 around X, it lies flat in XZ. But the vertex shader operates in local space, so the positions are still in XY. I should displace along the local Z axis (which becomes world Y after rotation).

So in vertex shader:
- position.x and position.y are the plane coordinates
- I displace position.z (local up) based on x, y and uTime

For the fragment shader:
- varying vHeight (the displacement value)
- Color gradient: deep blue at low, white at high

Let me think about the height range. With amplitudes of 0.3 + 0.2 + 0.15 = max 0.65, and min -0.65. I'll normalize this in the fragment shader.

Actually, let me use a simpler range. I'll make the displacement range roughly [-1, 1] and normalize accordingly.

Let me set:
- amplitude components sum to about 1.0 max
- vHeight ranges from about -1 to 1
- In fragment: normalized = (vHeight + 1.0) / 2.0 → [0, 1]
- Color: mix(deepBlue, white, normalized)

But I should add some non-linearity for the "foam" effect - maybe make the top 20% more white quickly.

Let me write the code now.

For the camera: position it at an angle looking down at the plane. Something like (0, 8, 10) looking at (0, 0, 0).

Let me make sure the code compiles with tsc --strict. I need to be careful with types.

One thing: the PlaneGeometry rotation. I'll set mesh.rotation.x = -Math.PI / 2. This rotates the XY plane to XZ.

In the vertex shader, local position:
- x: left-right
- y: front-back (before rotation)
- z: up (before rotation)

After mesh rotation of -PI/2 around X:
- local x → world x
- local y → world -z (or z, depending)
- local z → world y

So displacing local z will move vertices up/down in world space. Good.

Let me write the complete file.
