Let me write a complete TypeScript file that:

1. Imports Three.js
2. Creates a PlaneGeometry 10x10 with 128x128 segments
3. Rotates it flat in XZ plane
4. Uses a custom ShaderMaterial with:
   - Vertex shader: displaces vertices with a moving wave pattern based on position and uTime
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
5. Updates uTime every frame from elapsed time
6. No lights (unlit ShaderMaterial)
7. Camera at an angle so waves are visible
8. Handles resize
9. Uses renderer.setAnimationLoop
10. Exposes __scene, __camera, __renderer, and sets __ready after first frame
11. Compiles with tsc --strict

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128) - creates a plane in XY by default
- Rotate it to lie flat: rotateX(-Math.PI / 2) to make it lie in XZ plane
- ShaderMaterial with uTime uniform
- Vertex shader uses position (which after rotation is in XZ) - actually, the geometry is rotated, so position in the vertex shader will be in local space. Wait, if I rotate the mesh, the position attribute is still in XY space (plane geometry default). The rotation is applied as a transform. So in the vertex shader, `position` will still be in the plane's local XY coordinates.

Actually, let me think about this more carefully. PlaneGeometry creates a plane in the XY plane. If I rotate the mesh by -PI/2 around X, the plane lies flat in XZ. But in the vertex shader, `position` is the local geometry position (still XY). So I should use position.x and position.y for the wave pattern in the shader.

For the wave displacement, I'll use `position.z` (which after rotation points up in world space... wait, no). Actually, the vertex shader operates in local space. The geometry is in XY plane, and I'll displace along Z (local). After the mesh rotation, local Z becomes world Y (up). So displacing along local Z will make waves go up/down in world space.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    // Plane is in XY, Z is the displacement direction (which becomes Y in world after rotation)
    float wave = sin(pos.x * 2.0 + uTime) * 0.2 + cos(pos.y * 3.0 + uTime * 1.5) * 0.15 + sin((pos.x + pos.y) * 1.5 + uTime * 0.8) * 0.1;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    float t = clamp((vHeight + 0.35) / 0.7, 0.0, 1.0);
    vec3 lowColor = vec3(0.0, 0.05, 0.3);
    vec3 highColor = vec3(1.0);
    vec3 color = mix(lowColor, highColor, t);
    gl_FragColor = vec4(color, 1.0);
}
```

The wave amplitude: sin gives max ~0.2+0.15+0.1 = 0.45, min ~ -0.45. So range is about -0.45 to 0.45. I'll normalize: (vHeight + 0.45) / 0.9.

Camera: position it at an angle, like (0, 5, 8) looking at origin.

Let me make sure everything is strict-mode compatible.
