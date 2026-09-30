The user wants a single TypeScript file that creates a Three.js scene with:
1. A PlaneGeometry 10x10 with 128x128 segments, rotated to lie flat in XZ plane
2. Custom ShaderMaterial with GLSL vertex and fragment shaders
3. Vertex shader: displaces vertices based on position and `uTime` uniform
4. Fragment shader: colors by height (low = deep blue, high = white foam) using a varying
5. Update uTime every frame from elapsed time
6. No lights
7. Camera at an angle
8. Proper renderer setup, resize handling, animation loop, window exposure

Let me write this carefully to ensure it compiles with `tsc --strict`.

Key considerations:
- Use `import * as THREE from 'three';`
- ShaderMaterial with vertexShader and fragmentShader strings
- Uniform: uTime (float)
- Varying: vHeight (float)
- PlaneGeometry(10, 10, 128, 128) rotated -Math.PI/2 on X axis to lie in XZ
- Vertex shader: displace position.y (or position.z since it's a plane in XY before rotation... wait)

Actually, PlaneGeometry creates a plane in XY. When we rotate it by -PI/2 on X, the local Y becomes world Z, and local Z becomes world Y (sort of). Let me think more carefully.

PlaneGeometry(10, 10, 128, 128) creates vertices in XY plane (z=0). If I rotate the mesh by -Math.PI/2 around X axis:
- Local X stays as world X
- Local Y becomes world Z (well, -Z or +Z depending on rotation direction)
- Local Z becomes world Y (or -Y)

Actually, rotating by -PI/2 around X:
- Y axis rotates toward Z
- Z axis rotates toward -Y

So local Y → world -Z... hmm. Let me think differently.

A rotation matrix for -PI/2 around X:
- x' = x
- y' = z (wait no)

Rotation by angle θ around X:
- x' = x
- y' = y*cos(θ) - z*sin(θ)
- z' = y*sin(θ) + z*cos(θ)

For θ = -PI/2: cos(-PI/2) = 0, sin(-PI/2) = -1
- x' = x
- y' = y*0 - z*(-1) = z
- z' = y*(-1) + z*0 = -y

So for the plane in XY (z=0):
- x' = x
- y' = 0
- z' = -y

So the plane lies in XZ, and the local Y coordinate becomes -Z in world space.

But for displacement in the vertex shader, I'm working in local space. If I displace along local Y (which is the normal direction of the plane), after rotation that becomes world Z direction... wait no.

Actually, let me reconsider. The vertex shader works in local/object space. The plane is in local XY with Z=0. If I displace along Z in the vertex shader, then after the mesh rotation of -PI/2 around X:
- Local Z becomes world Y (from the matrix: y' = z when we had y' = z... wait let me redo)

With θ = -PI/2:
- y' = y*0 - z*(-1) = z
- z' = y*(-1) + z*0 = -y

So local Z maps to world Y. So if I displace vertices along local Z in the vertex shader, it will appear as vertical displacement (world Y) after the mesh rotation. 

Actually, even simpler: I could just rotate the plane by -PI/2 around X, and in the vertex shader, displace along position.z (the local normal). After rotation, that becomes the world Y direction. That works.

Wait, but actually it might be cleaner to just do the rotation via `mesh.rotation.x = -Math.PI / 2` and in the vertex shader displace `position.z` (since the plane normal in local space is +Z).

Hmm, actually for PlaneGeometry, the normal is (0,0,1) in local space. So displacing along Z in local space, after rotating the mesh -PI/2 around X, gives vertical (world Y) displacement. 

Let me write the vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float h = sin(pos.x * 1.5 + uTime * 2.0) * 0.5
            + sin(pos.y * 2.0 + uTime * 1.5) * 0.3
            + sin((pos.x + pos.y) * 1.0 + uTime * 3.0) * 0.2;
    pos.z += h;
    vHeight = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    float t = smoothstep(-1.0, 1.0, vHeight);
    vec3 deepBlue = vec3(0.0, 0.1, 0.5);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Now for TypeScript strict mode, I need to be careful with types. Let me make sure everything compiles.

Let me write the full file now.
