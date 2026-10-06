The user wants a single TypeScript file that creates a plane with custom shaders for a wave animation. Let me write this carefully:

1. Set up Three.js scene, camera, renderer
2. Create a PlaneGeometry 10x10 with 128x128 segments
3. Rotate it to lie flat in XZ plane (rotation.x = -Math.PI/2)
4. Use ShaderMaterial with custom vertex/fragment shaders
5. Vertex shader: displace vertices based on uTime uniform
6. Fragment shader: color by height (low = deep blue, high = white foam)
7. Pass height via varying
8. Update uTime each frame
9. Handle resize
10. Expose __scene, __camera, __renderer, __ready

Let me write the shaders:

Vertex shader:
- Take position, compute wave displacement using sin/cos based on x, z (which in local space before rotation are x, y), and uTime
- Displace along the normal (which is y in local space, becomes z after rotation)
- Pass the height to fragment shader via varying

Wait, since the plane is rotated to lie in XZ plane, the local y-axis of the plane maps to world z-axis. So in the vertex shader, I should displace along the local normal which is (0, 1, 0) in local space. The position.x and position.y in local space correspond to world x and z.

Fragment shader:
- Mix from deep blue to white based on the varying height value

Let me make sure it compiles with --strict. I need to be careful with types.

Let me write this out:
