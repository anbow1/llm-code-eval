The user wants a complete TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry (10x10, 128x128 segments) rotated to lie flat in XZ plane
2. Custom ShaderMaterial with:
   - Vertex shader: displaces vertices with moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
3. Update uTime every frame
4. No lights (ShaderMaterial is unlit)
5. Camera at an angle to see waves clearly

Let me write this carefully:

- PlaneGeometry is in XY plane by default, so I need to rotate it -PI/2 around X to make it lie in XZ plane
- The vertex shader will displace along the local Y axis (which becomes world Y after rotation)
- Actually, if I rotate the mesh, the geometry's local Y becomes world Y. So in the vertex shader, I displace position.y (local) which becomes world Y after the model matrix is applied.
- For the wave pattern, I'll use a combination of sine waves based on position.x and position.z (local coordinates) and uTime.
- The fragment shader will use a varying for height and interpolate between deep blue and white.

Let me think about the shader:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    // Use x and z of the position (before rotation, the plane is in XY, so x and y are the plane coords)
    // Wait - PlaneGeometry creates vertices in XY plane. So position.x and position.y are the plane coordinates, position.z is 0.
    // After rotation, x stays x, y becomes -z (or z becomes y depending on rotation)
    // Let me just use position.x and position.y as the 2D coordinates for the wave pattern
    float wave = sin(pos.x * 2.0 + uTime) * cos(pos.y * 2.0 + uTime * 0.7);
    wave += sin(pos.x * 1.5 - uTime * 0.5) * 0.5;
    wave += cos(pos.y * 1.2 + uTime * 0.8) * 0.3;
    pos.z += wave; // displace along local z (which becomes world y after rotation)
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Wait, let me reconsider. PlaneGeometry(10, 10, 128, 128) creates a plane in the XY plane, centered at origin. The vertices have x in [-5,5], y in [-5,5], z = 0.

If I rotate the mesh by -PI/2 around X axis, the plane lies in XZ plane. The local z becomes world -y (or +y depending on direction).

Actually, let me think more carefully. If I rotate by -PI/2 around X:
- local x → world x
- local y → world -z  
- local z → world y

So if I displace local z, it becomes world y (up). That works.

But for the wave pattern, I should use the 2D coordinates of the plane, which are local x and local y.

Let me use `position.x` and `position.y` for the wave calculation in the vertex shader.

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height to 0-1 range (roughly)
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.1, 0.4);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Actually, the wave values depend on the specific wave function. Let me estimate: if I use sin * cos with amplitude 1, the max is about 1, min about -1. Adding the extra terms, maybe range is about [-2, 2]. Let me normalize by dividing by 2 or so. Or I can just use a reasonable range.

Let me refine the wave to have a known range. If I use:
- sin(x * 2 + time) * cos(y * 2 + time * 0.7) → range [-1, 1]
- sin(x * 1.5 - time * 0.5) * 0.5 → range [-0.5, 0.5]
- cos(y * 1.2 + time * 0.8) * 0.3 → range [-0.3, 0.3]

Total range approximately [-1.8, 1.8]. So I'll normalize by dividing by ~1.8 or just use a clamp with appropriate values.

Let me write the complete file now.
