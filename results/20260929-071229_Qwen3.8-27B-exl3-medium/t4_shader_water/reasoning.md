The user wants a complete TypeScript file that creates a water-like wave simulation using Three.js with a custom ShaderMaterial. Let me plan this out:

1. Import THREE
2. Create scene, camera (angled view), renderer
3. Create a PlaneGeometry(10, 10, 128, 128)
4. Rotate it to lie flat in XZ plane (rotateX(-Math.PI/2))
5. Write custom vertex shader that displaces vertices with a wave pattern using uTime
6. Write custom fragment shader that colors by height (deep blue to white foam)
7. Pass height as a varying
8. Update uTime from elapsed time
9. Handle resize
10. Use setAnimationLoop
11. Expose __scene, __camera, __renderer, __ready

Let me write the shaders:

Vertex shader:
- Takes position (already in local space, but since we rotate the mesh, the position will be in XY plane before rotation... actually, let me think about this)
- Actually, PlaneGeometry creates a plane in XY. If I rotate the mesh by -PI/2 around X, it lies in XZ. But the vertex shader works in local space, so the position is still in XY.
- Wait, let me reconsider. The vertex shader receives `position` in local object space. PlaneGeometry(10,10,128,128) creates vertices in the XY plane (z=0). If I rotate the mesh, the vertex shader still sees the original XY positions.
- So in the vertex shader, I should displace along the local Z axis (which becomes world Y after rotation).
- Wave pattern: use sin/cos of position.x and position.y (local) with uTime to create moving waves.

Actually, let me think more carefully. The PlaneGeometry is in XY plane. I'll rotate the mesh with rotation.x = -Math.PI/2 to make it lie in XZ. In the vertex shader, position is in local space (XY plane, z=0). I displace position.z (local) which maps to world Y after the rotation.

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    // Wave pattern based on local x and y
    float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.3;
    float wave2 = cos(pos.y * 2.0 + uTime * 1.5) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.0) * 0.15;
    float height = wave1 + wave2 + wave3;
    pos.z += height;
    vHeight = height;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height to 0-1 range (approximate)
    float t = clamp(vHeight / 0.65 + 0.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Camera: position it at an angle, like (0, 8, 12) looking at origin.

Let me make sure the max height is about 0.3 + 0.2 + 0.15 = 0.65, so I'll normalize by that.

Let me write the complete file now.
