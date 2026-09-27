The user wants a single TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry (10x10, 128x128 segments) rotated to lie flat in XZ plane
2. Custom ShaderMaterial with GLSL vertex and fragment shaders
3. Vertex shader: displaces vertices up/down with moving wave pattern using position and uTime uniform
4. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
5. Update uTime every frame from elapsed time
6. No lights needed
7. Camera at an angle to see waves clearly
8. All the hard rules about compilation, resize, animation loop, exposing scene/camera/renderer, setting __ready after first frame

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128) - creates in XY plane by default
- Rotate it to lie flat in XZ plane: rotation.x = -Math.PI / 2
- Custom ShaderMaterial with:
  - Vertex shader: uses position (in object space, which is XY before rotation) to compute wave displacement along the local Z axis (which becomes Y in world space after rotation)
  - Actually, since we rotate the mesh, the vertex shader works in object space. The plane is in XY, so we displace along Z in object space. After rotation, Z becomes Y in world space.
  - Fragment shader: receives height (displacement amount) as varying, colors based on it

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 2.0 + uTime) * 0.3 
               + cos(pos.y * 3.0 + uTime * 1.5) * 0.2
               + sin((pos.x + pos.y) * 1.5 + uTime * 0.8) * 0.15;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    float normalized = (vHeight + 0.65) / 1.3; // normalize roughly
    normalized = clamp(normalized, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, normalized);
    gl_FragColor = vec4(color, 1.0);
}
```

Now let me make sure everything compiles with tsc --strict:
- Import THREE
- Create renderer, append to body
- Size from window
- Handle resize
- setAnimationLoop with delta/elapsed
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- No external assets

Let me write the complete file.
