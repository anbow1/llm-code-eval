The user wants a complete TypeScript file that creates a wave simulation on a plane using a custom ShaderMaterial. Let me break down the requirements:

1. PlaneGeometry 10x10 with 128x128 segments
2. Rotated to lie flat in XZ plane (rotate -PI/2 around X axis)
3. Custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
4. Update uTime every frame from elapsed time
5. No lights (unlit ShaderMaterial)
6. Camera at an angle to see waves clearly
7. All the standard requirements: import three, append to body, resize handling, setAnimationLoop, expose __scene/__camera/__renderer, set __ready after first frame

Let me write this:

- Vertex shader: I'll use multiple sine waves for a nice wave pattern. The displacement will be along the local Y axis (which becomes world Z after rotation, but actually since we rotate the mesh, the local Y is the normal direction). Wait - let me think about this more carefully.

When we create a PlaneGeometry, it lies in the XY plane by default (facing +Z). If we rotate the mesh -PI/2 around X, it lies in the XZ plane (facing +Y). So in the vertex shader, the local coordinates are still x, y (the plane's original coordinates), and we displace along z (local normal direction). After the rotation, local z becomes world y (up). So I should displace along the local z axis in the vertex shader.

Actually, let me reconsider. The PlaneGeometry by default has vertices in the XY plane with Z=0. The normal is +Z. If I rotate the mesh -PI/2 around X, the plane ends up in the XZ plane with normal pointing +Y (up).

In the vertex shader, I work in local space. The position attribute has x, y (in the plane) and z=0. I want to displace along the local Z axis (which after rotation becomes world Y). So I'll do `pos.z += waveHeight`.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float height = 0.0;
    
    // Multiple waves for visual interest
    height += sin(pos.x * 1.5 + uTime * 1.2) * 0.3;
    height += sin(pos.y * 2.0 + uTime * 0.8) * 0.2;
    height += sin((pos.x + pos.y) * 1.0 + uTime * 1.5) * 0.2;
    
    pos.z += height;
    vHeight = height;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height to 0-1 range
    // The height range is roughly -0.7 to 0.7
    float t = clamp(vHeight / 0.7 + 0.5, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0);
    
    vec3 color = mix(deepBlue, white, t);
    
    gl_FragColor = vec4(color, 1.0);
}
```

For the camera, I'll position it at an angle looking down at the plane. Something like position (0, 8, 8) looking at origin, or (5, 5, 5) looking at (0, 0, 0).

Let me put it all together now.
