The user wants a complete TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry (10x10, 128x128 segments) rotated to lie flat in XZ plane
2. Custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
3. uTime updated every frame from elapsed time
4. No lights (ShaderMaterial is unlit)
5. Camera at an angle so waves are visible
6. All the hard rules: import three, create renderer, append to body, handle resize, use setAnimationLoop, expose __scene/__camera/__renderer, set __ready after first frame

Let me write this:

- PlaneGeometry(10, 10, 128, 128)
- Rotate it: mesh.rotation.x = -Math.PI / 2 to lie flat in XZ plane
- ShaderMaterial with vertex and fragment shaders
- Vertex shader: use position.x and position.z (after rotation, the plane's local Y becomes world Z... wait, no. The rotation is applied to the mesh, so in the vertex shader, position is still in local space. The plane geometry is in XY plane by default. So position.x and position.y are the local coordinates. After rotation.x = -PI/2, the local Y axis maps to world -Z axis.

Actually, let me think about this more carefully. The PlaneGeometry creates vertices in the XY plane (z=0). When we rotate the mesh by -PI/2 around X, the local Y axis points to world -Z, and local Z points to world Y. So in the vertex shader, position.x and position.y are the "flat" coordinates, and we displace position.z (which becomes world Y after rotation).

So in the vertex shader:
- Use position.x and position.y as the 2D coordinates for the wave pattern
- Displace position.z based on the wave (this becomes the up/down in world space after rotation)

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 2.0 + uTime) * cos(pos.y * 2.0 + uTime * 0.7) * 0.3;
    wave += sin(pos.x * 4.0 - uTime * 1.3) * sin(pos.y * 3.0 + uTime * 0.5) * 0.15;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height to 0-1 range (roughly -0.45 to 0.45)
    float t = (vHeight + 0.45) / 0.9;
    t = clamp(t, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

For the camera, I'll place it at an angle like (5, 5, 5) looking at origin, or maybe (0, 4, 8) looking at origin.

Let me put it all together now.
