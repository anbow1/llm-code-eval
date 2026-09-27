The user wants a single TypeScript file that:
1. Creates a 10x10 PlaneGeometry with 128x128 segments
2. Rotates it to lie flat in XZ plane
3. Uses a custom ShaderMaterial with vertex and fragment shaders
4. Vertex shader displaces vertices up/down with a moving wave pattern based on position and uTime
5. Fragment shader colors by height (low = deep blue, high = white foam)
6. Passes height via varying
7. Updates uTime every frame from elapsed time
8. No lights needed
9. Camera at an angle so waves are clearly visible
10. Handles resize
11. Exposes __scene, __camera, __renderer
12. Sets __ready after first frame
13. Uses renderer.setAnimationLoop

Let me write this out carefully with proper GLSL shaders.

For the vertex shader:
- I'll use a combination of sine waves based on position.x and position.z to create an interesting wave pattern
- The displacement will be along the Y axis (local space)
- I'll pass the displaced Y value as a varying to the fragment shader

For the fragment shader:
- Use the varying height to interpolate between deep blue (low) and white (high)
- Maybe add some subtle variation for visual interest

Let me think about the wave pattern. Since the plane is rotated to lie flat in XZ, the local coordinates before rotation would be in the XY plane (PlaneGeometry is in XY by default). After rotation (rotation.x = -PI/2), the local X maps to world X and local Y maps to world Z (or -Z depending on rotation direction).

Actually, let me think more carefully. PlaneGeometry(10, 10, 128, 128) creates a plane in the XY plane. If I rotate it with rotation.x = -Math.PI/2, it will lie flat in the XZ plane. The local Y axis becomes the world Z axis (pointing towards the camera if camera is above).

So in the vertex shader, I'll use position.x and position.y (local coordinates) to create waves, and displace along position.z (which after rotation becomes the world Y direction - the "up" direction).

Wait, let me reconsider. PlaneGeometry creates vertices in the XY plane with normal pointing in +Z direction. When I rotate the mesh with rotation.x = -PI/2, the +Z local axis becomes the +Y world axis (pointing up). So:
- Local X → World X
- Local Y → World Z  
- Local Z → World Y (up)

So in the vertex shader, I should:
- Use position.x and position.y as the horizontal coordinates
- Displace position.z (which will become the world Y/up direction)

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    // Create wave pattern using sin/cos of position
    float wave1 = sin(pos.x * 1.5 + uTime * 1.2) * 0.3;
    float wave2 = cos(pos.y * 1.8 + uTime * 0.8) * 0.25;
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.5) * 0.2;
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
    // Map height to color: low = deep blue, high = white
    float normalizedHeight = (vHeight + 0.75) / 1.5; // normalize to roughly 0-1
    normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 midBlue = vec3(0.0, 0.3, 0.6);
    vec3 white = vec3(1.0, 1.0, 1.0);
    
    vec3 color;
    if (normalizedHeight < 0.5) {
        color = mix(deepBlue, midBlue, normalizedHeight * 2.0);
    } else {
        color = mix(midBlue, white, (normalizedHeight - 0.5) * 2.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
```

Now let me put the full file together with proper TypeScript typing and the animation loop.
