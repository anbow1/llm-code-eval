The user wants a complete TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in the XZ plane
3. Uses a custom THREE.ShaderMaterial with custom GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and a `uTime` float uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height with a varying
6. Updates uTime every frame from elapsed time
7. No lights needed (ShaderMaterial is unlit)
8. Camera at an angle so waves are clearly visible
9. Exposes scene, camera, renderer on window
10. Sets __ready after first frame
11. Uses renderer.setAnimationLoop
12. Handles window resize
13. Uses delta/elapsed time for motion

Let me write this:

- PlaneGeometry(10, 10, 128, 128) - this creates a plane in XY by default
- Rotate it to lie flat in XZ plane: rotateX(-Math.PI / 2) or set rotation.x = -Math.PI / 2
- Actually, PlaneGeometry is in XY plane by default (facing +Z). To make it lie flat in XZ (facing +Y), I rotate it -PI/2 around X axis.

Vertex shader:
- Use uTime uniform
- Displace the z component (which becomes Y after rotation... wait, actually the geometry is rotated after creation, so the vertex positions are still in local space. Let me think about this.

Actually, PlaneGeometry creates vertices in the XY plane. If I rotate the mesh by -PI/2 around X, the local Z becomes world Y. But in the shader, we work with local positions. So the "up" direction in local space is Z (since the plane is in XY, the normal is Z).

Wait, let me reconsider. PlaneGeometry(10, 10, 128, 128) creates a plane in the XY plane with vertices having z=0. The plane faces +Z. If I rotate the mesh by -PI/2 around X, the plane will be in the XZ plane facing +Y (lying flat).

In the vertex shader, `position` is in local space. The local Z is the "up" direction for the plane (normal). So I should displace `position.z` based on `position.x` and `position.y` and `uTime`.

Actually wait - when we rotate the mesh, the vertex shader still works in local space. The `position` attribute is in local coordinates. So the plane vertices are in XY with z=0 in local space. I'll displace `position.z` (which becomes world Y after the rotation).

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 1.5 + uTime * 2.0) * cos(pos.y * 1.5 + uTime * 1.5) * 0.3;
    wave += sin(pos.x * 3.0 - uTime * 1.0) * 0.15;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height to 0..1 range (wave range is roughly -0.45 to 0.45)
    float h = (vHeight + 0.45) / 0.9;
    vec3 deepBlue = vec3(0.0, 0.1, 0.3);
    vec3 foam = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, foam, h);
    gl_FragColor = vec4(color, 1.0);
}
```

Camera: position at something like (0, 5, 8) looking at origin.

Let me write the full file now.
