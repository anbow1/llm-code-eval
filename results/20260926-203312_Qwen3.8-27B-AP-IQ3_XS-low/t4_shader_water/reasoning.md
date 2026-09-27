The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a WebGLRenderer
2. Has a PlaneGeometry 10x10 with 128x128 segments, rotated flat in XZ plane
3. Custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime
   - Fragment shader: colors by height (low = deep blue, high = white foam), height passed as varying
4. Updates uTime every frame from elapsed time
5. Camera at an angle so waves are visible
6. No lights (ShaderMaterial is unlit)
7. Handles resize, uses setAnimationLoop, exposes testing variables, sets __ready after first frame
8. No external assets

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128) - this creates a plane in XY by default
- Rotate it to lie flat in XZ plane: rotation.x = -Math.PI / 2
- Vertex shader: use position attribute (which is the local position), apply wave displacement along the Y axis (which after rotation becomes the "up" direction in world space, but since we're rotating the geometry, the displacement should be along the local Z... wait, let me think about this more carefully.

Actually, PlaneGeometry is created in the XY plane. If I rotate the mesh by -PI/2 around X, the plane lies flat in XZ. The local Y axis of the plane becomes the world Z axis, and local Z becomes world -Y (or +Y depending on direction).

For the wave displacement in the vertex shader, I should displace along the local Z axis (which becomes the world Y after rotation). Wait, let me think again.

PlaneGeometry(10, 10, 128, 128) creates vertices in the XY plane (z=0). The normal points in +Z direction.

If I set mesh.rotation.x = -Math.PI/2, then:
- Local X → World X
- Local Y → World -Z (or +Z depending on rotation direction)
- Local Z → World Y

So if I displace vertices along local Z in the vertex shader, they'll move up/down in world space. That makes sense.

Actually, let me just use the position attribute in the vertex shader. The position will be in local space (XY plane with z=0). I'll add a wave offset to position.z (local), which after the mesh rotation will appear as vertical displacement in world space.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    
    // Wave pattern based on position and time
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.15;
    float wave2 = sin(pos.y * 3.0 + uTime * 2.0) * 0.1;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 1.0) * 0.12;
    
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
    // Height range is roughly -0.37 to 0.37
    float normalized = (vHeight + 0.4) / 0.8; // roughly 0 to 1
    normalized = clamp(normalized, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0);
    
    vec3 color = mix(deepBlue, white, normalized);
    
    gl_FragColor = vec4(color, 1.0);
}
```

Now let me put it all together in a complete TypeScript file.

For the camera, I'll position it at an angle like (0, 8, 12) looking at the origin so the waves are clearly visible from above and slightly angled.

Let me make sure all the requirements are met:
- import * as THREE from 'three' ✓
- WebGLRenderer created and canvas appended to document.body ✓
- Size from window.innerWidth/innerHeight ✓
- Handle window resize ✓
- setAnimationLoop ✓
- Delta/elapsed time for motion ✓
- Expose __scene, __camera, __renderer ✓
- Set __ready after first frame ✓
- No external assets ✓
- tsc --strict compatible ✓

Let me write the complete file now.
