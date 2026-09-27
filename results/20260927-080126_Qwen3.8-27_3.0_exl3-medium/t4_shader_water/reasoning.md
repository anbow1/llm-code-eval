The user wants a complete TypeScript file that:
1. Creates a WebGLRenderer, appends canvas to document.body
2. Creates a PlaneGeometry 10x10 with 128x128 segments
3. Rotates it to lie flat in XZ plane (rotateX(-Math.PI/2))
4. Uses a custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height with varying
5. Updates uTime every frame from elapsed time
6. Camera at an angle so waves are visible
7. Exposes __scene, __camera, __renderer
8. Sets __ready = true after first frame
9. Handles window resize
10. Uses renderer.setAnimationLoop
11. No external assets
12. Must compile with tsc --strict

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128)
- Rotate the geometry or the mesh to lie flat in XZ plane. The plane is in XY by default, so I need to rotate it by -PI/2 around X axis. I can do this via geometry.rotateX(-Math.PI/2) or mesh.rotation.x = -Math.PI/2.

Actually, if I rotate the mesh, the positions in the shader are still in local space (XY plane). So the wave displacement should be along the local Z axis (which becomes world Y after rotation). Let me think about this...

If I use geometry.rotateX(-Math.PI/2), the geometry vertices are now in XZ plane with Y being up. Then in the vertex shader, I displace along Y (position.y += wave).

Alternatively, if I rotate the mesh, the local position is still in XY, and I'd displace along Z in local space.

I think using geometry.rotateX(-Math.PI/2) is cleaner - the positions are already in XZ, and I displace Y.

Wait, actually let me reconsider. PlaneGeometry creates vertices in the XY plane (z=0). If I do geometry.rotateX(-Math.PI/2), the plane becomes XZ (y=0), and the normal points up (Y axis). Then in the vertex shader, I can displace position.y based on position.x and position.z.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    // position is in XZ plane after rotation
    float wave = sin(position.x * 1.5 + uTime) * 0.3 
               + cos(position.z * 1.2 + uTime * 0.7) * 0.25
               + sin((position.x + position.z) * 0.8 + uTime * 1.3) * 0.2;
    position.y += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height: wave ranges roughly from -0.75 to 0.75
    float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Camera at an angle - something like position (0, 5, 8) looking at origin.

Let me make sure the TypeScript is strict-compatible. I need to be careful with types.

For the elapsed time, I'll use a Clock or track time manually. Let me use THREE.Clock.

Let me write the complete file now.
