The user wants a single TypeScript file that:
1. Creates a PlaneGeometry (10x10, 128x128 segments)
2. Rotates it to lie flat in the XZ plane (rotate -PI/2 around X)
3. Uses a custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
4. Updates uTime every frame from elapsed time
5. No lights (ShaderMaterial is unlit)
6. Camera at an angle so waves are clearly visible
7. Standard requirements: resize handling, setAnimationLoop, expose __scene, __camera, __renderer, __ready

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128)
- Rotate the geometry itself (not the mesh) so the normals point up: geometry.rotateX(-Math.PI / 2)
- Vertex shader: use position.x and position.z (after rotation, the plane is in XZ) with a sine wave pattern using uTime
- Fragment shader: use a varying for height, map from deep blue to white foam

Let me think about the wave pattern. After rotating the plane to XZ:
- position.x ranges from -5 to 5
- position.z ranges from -5 to 5
- position.y is 0 (displacement axis)

Wave: I'll use a combination of sine waves for a nice ocean-like effect.

For the fragment shader, I'll pass the displaced height as a varying and use it to interpolate between deep blue and white.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 1.5 + uTime * 2.0) * 0.3
               + sin(pos.z * 2.0 + uTime * 1.5) * 0.2
               + sin((pos.x + pos.z) * 1.0 + uTime * 1.0) * 0.15;
    pos.y += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height: wave ranges roughly from -0.65 to 0.65
    float t = (vHeight + 0.65) / 1.3;
    t = clamp(t, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 midBlue = vec3(0.0, 0.2, 0.5);
    vec3 white = vec3(1.0, 1.0, 1.0);
    
    vec3 color;
    if (t < 0.5) {
        color = mix(deepBlue, midBlue, t * 2.0);
    } else {
        color = mix(midBlue, white, (t - 0.5) * 2.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
```

Actually, let me use a smoother mix without if/else, or use smoothstep for a nicer transition. Let me use a simple linear interpolation with a power curve for more foam at the top.

Let me finalize the code.
