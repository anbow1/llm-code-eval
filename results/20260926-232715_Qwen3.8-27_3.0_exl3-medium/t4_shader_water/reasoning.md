The user wants a single TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in XZ plane
3. Uses a custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
6. Updates uTime every frame from elapsed time
7. No lights (ShaderMaterial is unlit)
8. Camera at an angle so waves are clearly visible
9. Follows all the hard rules: Three.js import, WebGLRenderer, resize handling, setAnimationLoop, expose __scene/__camera/__renderer, __ready after first frame, no external assets

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128)
- Rotate -PI/2 around X to make it lie flat in XZ plane
- Custom ShaderMaterial with uTime uniform
- Vertex shader: use position.x and position.y (before rotation, the plane is in XY, so after rotation it's in XZ... actually let me think about this)

Wait - PlaneGeometry creates a plane in the XY plane. If I rotate it -PI/2 around X, it becomes flat in the XZ plane. But the vertex positions in the shader are still the original XY positions (the geometry's position attribute hasn't changed, only the mesh's rotation transforms it).

Actually, in the vertex shader, `position` is the local vertex position before any model transformation. So for a PlaneGeometry, position.x and position.y are the grid coordinates, and position.z is 0.

For the wave displacement, I want to displace along the local Z axis (which after rotation becomes the world Y axis - up). So I'll displace position.z in the vertex shader.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    // position.x and position.y are the grid coordinates
    float wave1 = sin(position.x * 1.5 + uTime * 2.0) * 0.3;
    float wave2 = cos(position.y * 1.2 + uTime * 1.5) * 0.25;
    float wave3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.2;
    
    float height = wave1 + wave2 + wave3;
    position.z += height;
    
    vHeight = height;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height to 0-1 range
    // Height range is roughly -0.75 to 0.75
    float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);
    
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

Actually, let me use a smoother mix without if/else, or use smoothstep for a nicer transition.

For the camera, I'll place it at an angle looking down at the plane. Something like position (0, 5, 8) looking at (0, 0, 0).

Let me make sure the code compiles with tsc --strict. I need to be careful with types.

Let me also think about the wave pattern more carefully. The plane is 10x10, so position.x and position.y range from -5 to 5. I want multiple overlapping sine waves for a nice ocean effect.

Let me refine:

```glsl
uniform float uTime;
varying float vHeight;

void main() {
    float wave1 = sin(position.x * 1.5 + uTime * 2.0) * 0.3;
    float wave2 = cos(position.y * 1.2 + uTime * 1.5) * 0.25;
    float wave3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.2;
    float wave4 = sin(length(position.xy) * 2.0 - uTime * 3.0) * 0.1;
    
    float height = wave1 + wave2 + wave3 + wave4;
    position.z += height;
    
    vHeight = height;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

For the fragment, let me use a nice gradient:
- Height range: roughly -0.85 to 0.85 (sum of amplitudes: 0.3 + 0.25 + 0.2 + 0.1 = 0.85)
- Map to 0-1
- Low: deep blue (0.0, 0.05, 0.15)
- Mid: medium blue (0.0, 0.3, 0.6)
- High: white foam (1.0, 1.0, 1.0)

I'll use mix with smoothstep for nice transitions.

Now let me write the complete file.
