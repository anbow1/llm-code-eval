The user wants a single TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in XZ plane
3. Uses a custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader displaces vertices up/down with a moving wave pattern based on position and uTime
5. Fragment shader colors by height (low = deep blue, high = white foam) using a varying
6. Updates uTime every frame from elapsed time
7. Camera at an angle so waves are visible
8. Follows all the hard rules (renderer setup, resize, setAnimationLoop, expose testing variables, etc.)

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- PlaneGeometry(10, 10, 128, 128)
- Rotate to lie flat: the default PlaneGeometry is in XY plane, so I need to rotate -PI/2 around X axis
- Custom ShaderMaterial with:
  - Vertex shader: use position (which after rotation would be in local XY, but since we rotate the mesh, the position attribute is still in local space). Actually, let me think about this more carefully.

The PlaneGeometry(10, 10, 128, 128) creates vertices in the XY plane (x and y range from -5 to 5, z = 0). If I rotate the mesh by -PI/2 around X, the local Y becomes world Z, and the plane lies in the XZ plane in world space.

In the vertex shader, I work with the local `position` attribute. The position is in local space (XY plane, z=0). I'll displace along the local Z axis (which after rotation becomes world Y, i.e., up/down).

Wait, actually let me reconsider. If I rotate the mesh, the position attribute is still in local coordinates. The displacement should be along the local Z direction (which maps to world Y after the -PI/2 X rotation). So I'll displace `position.z` in the vertex shader.

Actually, let me think again. PlaneGeometry creates a plane in the XY plane. The normal is along Z. If I rotate the mesh by -PI/2 around X axis, then:
- Local X → World X
- Local Y → World -Z (or World Z depending on direction)
- Local Z → World Y

So displacing position.z in the shader will displace up/down in world space. Good.

For the wave pattern, I'll use something like:
```
float wave = sin(position.x * 2.0 + uTime) * 0.3 + cos(position.y * 3.0 + uTime * 1.5) * 0.2;
position.z += wave;
```

For the fragment shader, I'll pass the height (the z displacement) as a varying, then map it to a color gradient from deep blue to white.

Let me write the complete file now.
