The user wants a TypeScript file that:
1. Creates a PlaneGeometry (10x10, 128x128 segments)
2. Rotates it to lie flat in XZ plane
3. Uses a custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
4. Updates uTime every frame from elapsed time
5. No lights (ShaderMaterial is unlit)
6. Camera at an angle so waves are visible
7. Follows all the hard rules (import, renderer, resize, animation loop, window exports, __ready flag)

Let me write this carefully:

- PlaneGeometry is in XY plane by default, so I need to rotate it -PI/2 around X to make it lie in XZ plane
- For the vertex shader, I'll use a combination of sine waves based on position.x and position.z (after rotation, the local Y becomes world Z... actually let me think about this more carefully)

When I rotate the plane -PI/2 around X:
- Local X stays as world X
- Local Y becomes world -Z (or Z depending on direction)
- Local Z becomes world Y

Actually, the plane geometry vertices are in the XY plane (z=0). When I rotate the mesh by -PI/2 around X:
- x stays x
- y becomes -z (world)
- z (which was 0) becomes y (world)

So in the vertex shader, the position is in local space (XY plane). I should use position.x and position.y for the wave pattern, and displace along position.z (which will become world Y after rotation).

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 0.5 + uTime) * 0.3 + cos(pos.y * 0.7 + uTime * 0.8) * 0.2 + sin((pos.x + pos.y) * 0.3 + uTime * 0.5) * 0.4;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    float t = clamp(vHeight / 0.9 + 0.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Wait, I need to think about the height range. The waves sum up to about 0.3 + 0.2 + 0.4 = 0.9 max, and -0.9 min. So I should normalize accordingly.

Let me use: `float t = clamp(vHeight / 0.9 + 0.5, 0.0, 1.0);` — this maps [-0.9, 0.9] to [0, 1].

For the camera, I'll place it at an angle looking down at the plane, something like (5, 5, 5) looking at origin.

Let me make sure the code compiles with tsc --strict. I need to be careful with types.

Let me finalize the code.
