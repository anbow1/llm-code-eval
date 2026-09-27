The user wants a complete TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry 10x10 with 128x128 segments
2. Rotated to lie flat in the XZ plane
3. Custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
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
- Rotate to lie flat in XZ plane: by default PlaneGeometry is in XY plane, so I need to rotate it -90 degrees around X axis to make it lie in XZ plane. Actually, PlaneGeometry(10, 10, 128, 128) creates a plane in the XY plane (z=0). To make it lie flat in XZ plane, I rotate it by -Math.PI/2 around the X axis. Or I can just set the mesh rotation.

Actually, let me think about this more carefully. PlaneGeometry(10, 10, 128, 128) creates vertices in the XY plane (x from -5 to 5, y from -5 to 5, z = 0). To make it lie flat in the XZ plane, I rotate the mesh by -Math.PI/2 around the X axis. This makes y become z, so the plane is now in the XZ plane.

Wait, but if I rotate the mesh, the vertex positions in the shader will still be in the original XY plane coordinates. The rotation is applied at the mesh level. So in the vertex shader, the positions are still in the original plane (x, y, 0). I need to displace along the normal direction (which after rotation points up, i.e., +Y in world space).

Actually, let me think differently. If I rotate the mesh, the vertex positions in local space are still (x, y, 0). The normal in local space is (0, 0, 1). After rotation by -PI/2 around X, the normal in world space is (0, 1, 0) - pointing up.

In the vertex shader, I can displace along the local normal (0, 0, 1) direction, which after the mesh rotation will point up in world space. Or I can just add to the z component of the position in local space.

Let me just displace the z component in local space. Since the mesh is rotated, this will appear as vertical displacement in world space.

Actually, let me reconsider. If I rotate the mesh by -PI/2 around X:
- Local (x, y, 0) -> World (x, 0, y) approximately... no, let me think more carefully.

Rotation by -PI/2 around X axis:
- x stays x
- y -> z (rotated)
- z -> -y (rotated)

Wait, rotation matrix for -PI/2 around X:
- x' = x
- y' = y*cos(-PI/2) - z*sin(-PI/2) = y*0 - z*(-1) = z
- z' = y*sin(-PI/2) + z*cos(-PI/2) = y*(-1) + z*0 = -y

So local (x, y, 0) -> world (x, 0, -y)

Hmm, that means the plane is in the XZ plane (y=0 in world). The local z direction (0,0,1) becomes world (0, 1, 0) which is up. Good.

So in the vertex shader, I can displace the z component of the position (local space), and it will appear as vertical displacement in world space.

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    float wave1 = sin(position.x * 1.5 + uTime * 2.0) * 0.3;
    float wave2 = sin(position.y * 1.0 + uTime * 1.5) * 0.2;
    float wave3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.15;
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
    // Map height from roughly -0.65 to 0.65 to 0 to 1
    float t = clamp((vHeight + 0.65) / 1.3, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    vec3 whiteFoam = vec3(1.0, 1.0, 1.0);
    
    vec3 color = mix(deepBlue, whiteFoam, t);
    
    gl_FragColor = vec4(color, 1.0);
}
```

Camera position: I'll put it at an angle, like (8, 6, 8) looking at the origin, so the waves are visible from an oblique angle.

Let me make sure the TypeScript compiles with --strict. I need to be careful with types.

Let me write the complete file now.
