The user wants a complete TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry 10x10 with 128x128 segments
2. Rotated to lie flat in the XZ plane
3. Custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displace vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: color by height (low = deep blue, high = white foam), pass height with a varying
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
- Rotate to lie flat in XZ plane: default plane is in XY plane, so I need to rotate it. I can rotate around X axis by -PI/2 to make it lie in XZ plane. Or I can just set the mesh rotation.

Actually, PlaneGeometry by default is in the XY plane (facing +Z). To make it lie flat in XZ plane, I rotate it around X by -PI/2 (or PI/2). Let me think... If I rotate around X by -PI/2, the Y axis becomes Z and Z becomes -Y. So the plane would be in XZ plane facing up (+Y). That's what I want.

For the vertex shader:
- I need to displace vertices based on position and uTime
- Wave pattern: something like sin(x * freq + time) * cos(z * freq + time) * amplitude
- The plane is in XZ plane after rotation, so in local space the vertices are in XY. But after rotation, the local X stays X, local Y becomes Z in world space. Actually, let me think about this differently.

The PlaneGeometry(10, 10, 128, 128) has vertices in the XY plane by default (x ranges from -5 to 5, y ranges from -5 to 5, z = 0). When I rotate the mesh by -PI/2 around X, the local Y becomes world Z, and local Z becomes world -Y. So in local space, the displacement should be along local Z (which becomes world Y after rotation).

In the vertex shader, I'll displace along the local Z axis (the normal direction of the plane). The position attribute in local space has x and y coordinates (the plane surface), and I'll use those to create the wave pattern, displacing along z.

Actually, let me reconsider. In the vertex shader, `position` is in local space. For a PlaneGeometry(10,10,128,128), positions range from (-5,-5,0) to (5,5,0). I'll use position.x and position.y to create the wave, and displace position.z.

After the mesh is rotated by -PI/2 around X, the local z displacement becomes world Y (upward). That's what I want.

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    float wave1 = sin(position.x * 1.5 + uTime * 2.0) * 0.15;
    float wave2 = cos(position.y * 1.2 + uTime * 1.5) * 0.12;
    float wave3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.08;
    float displacement = wave1 + wave2 + wave3;
    position.z += displacement;
    vHeight = displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height: displacement ranges roughly -0.35 to 0.35
    float t = (vHeight + 0.35) / 0.7; // 0 to 1
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    vec3 whiteFoam = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, whiteFoam, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Camera: Place it at an angle, like position (0, 5, 10) looking at origin, or maybe (8, 6, 8) looking at (0, 0, 0).

Let me write the complete file now.

For the `__ready` flag: I need to set it after the first frame is rendered. I can use a flag that gets set on the first call to the animation loop.

Let me make sure the TypeScript compiles with --strict. I need to be careful with types.

Let me write the full file:
