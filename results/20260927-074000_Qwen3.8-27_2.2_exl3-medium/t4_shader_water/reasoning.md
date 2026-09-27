The user wants a complete TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry 10x10 with 128x128 segments
2. Rotated to lie flat in the XZ plane
3. Custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passing height via varying
6. Update uTime every frame from elapsed time
7. No lights needed (ShaderMaterial is unlit)
8. Camera at an angle so waves are clearly visible

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Expose __scene, __camera, __renderer, __ready
- No external assets

For the plane:
- PlaneGeometry(10, 10, 128, 128)
- Rotate to lie flat in XZ plane: the default plane is in XY plane, so I need to rotate it -90 degrees around X axis (or use rotation.x = -Math.PI/2)

For the vertex shader:
- Wave pattern based on position and uTime
- Something like: displacement = sin(position.x * frequency + uTime) * amplitude + cos(position.y * frequency + uTime * 0.8) * amplitude, etc.
- Actually since the plane is in XZ after rotation, the position in local space is XY. But I should use the position attribute which is in local space.

Wait, let me think about this. PlaneGeometry(10, 10, 128, 128) creates a plane in the XY plane by default. If I rotate it by -PI/2 around X, it lies in the XZ plane. The position attribute in the vertex shader is in local space (XY plane before rotation). So I can use position.x and position.y for the wave pattern.

Actually, let me reconsider. The vertex shader receives `position` which is the local position. For a PlaneGeometry(10, 10, 128, 128), positions range from -5 to 5 in both x and y. After rotating the mesh, the visual position changes but the `position` attribute in the shader is still the local XY coordinates.

So in the vertex shader, I'll use position.x and position.y to create the wave displacement along the normal direction (which is local Z, pointing up in world space after rotation).

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    float wave1 = sin(position.x * 1.5 + uTime * 1.2) * 0.3;
    float wave2 = cos(position.y * 1.8 + uTime * 0.9) * 0.25;
    float wave3 = sin((position.x + position.y) * 0.8 + uTime * 0.7) * 0.2;
    float displacement = wave1 + wave2 + wave3;
    
    vec3 newPos = position + vec3(0.0, 0.0, displacement);
    vHeight = displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Map height from roughly -0.75 to 0.75
    float t = (vHeight + 0.75) / 1.5; // normalize to 0-1
    t = clamp(t, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    vec3 whiteFoam = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, whiteFoam, t);
    
    gl_FragColor = vec4(color, 1.0);
}
```

Camera: position it at an angle, like (5, 4, 8) looking at origin, or something that gives a nice angled view.

Let me make sure the code compiles with tsc --strict. I need to be careful with types.

Let me write the complete file now.
