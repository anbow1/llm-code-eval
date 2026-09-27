The user wants a single TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in the XZ plane (so we need to rotate it -90 degrees around X axis)
3. Uses a custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and `uTime` uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
6. Updates uTime every frame from elapsed time
7. No lights needed (ShaderMaterial is unlit)
8. Camera at an angle so waves are clearly visible
9. Standard setup: WebGLRenderer, append canvas to document.body, handle resize, setAnimationLoop, expose scene/camera/renderer/ready

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128) - this creates a plane in XY plane by default
- To make it lie flat in XZ plane, I rotate it by -PI/2 around X axis (so Y becomes Z, and the plane is horizontal)
- Actually, let me think about this. PlaneGeometry creates a plane in the XY plane (facing +Z). To make it lie flat in XZ, I need to rotate it so the normal points up (+Y). That means rotating around X by -PI/2 (or +PI/2 depending on direction).

Actually, let me think more carefully. PlaneGeometry(10, 10, 128, 128) creates vertices in the XY plane, centered at origin, facing +Z direction. The vertices are at positions (x, y, 0) where x goes from -5 to 5 and y goes from -5 to 5.

To make it lie flat in the XZ plane (horizontal), I need to rotate it so that what was the Y axis becomes the Z axis. So I rotate around X by -PI/2. After rotation:
- Original (x, y, 0) becomes (x, 0, y) ... wait no.

Rotation around X by -PI/2:
- x stays the same
- y becomes z (y * cos(-PI/2) - z * sin(-PI/2) = 0 - 0 = 0... wait)

Let me use the rotation matrix. Rotation around X by angle θ:
- x' = x
- y' = y*cos(θ) - z*sin(θ)
- z' = y*sin(θ) + z*cos(θ)

For θ = -PI/2:
- x' = x
- y' = y*0 - z*(-1) = z = 0 (since original z=0)
- z' = y*(-1) + z*0 = -y

So after rotation, the plane is at y=0, with x going from -5 to 5 and z going from -5 to 5. That's the XZ plane. Good.

Now for the vertex shader, I need to displace vertices up/down (along Y) based on a wave pattern. Since the plane is in XZ, the wave displacement should be in the Y direction.

In the vertex shader, the position attribute is in local space. After the mesh is rotated, the local position is (x, y, z) where y is the displacement direction. Wait, no - the geometry's vertices are in local space before the mesh transform is applied. The mesh has a rotation applied, so the local space is still the original XY plane.

Actually, let me reconsider. The PlaneGeometry vertices are in local space as (x, y, 0). The mesh has a rotation of -PI/2 around X. So in world space, the vertices end up at (x, 0, -y). The displacement in the vertex shader should be along the local Y axis (which after rotation becomes the world Y axis... wait no).

Hmm, let me think again. If I rotate the mesh by -PI/2 around X:
- Local (x, y, 0) → World (x, 0, -y)

So the "up" direction in world space is +Y. In local space, the "up" direction (perpendicular to the plane) is the Z axis (since the plane is in XY). So if I displace along local Z, that becomes world Y (after the rotation... let me verify).

Local (x, y, z) → World:
- x' = x
- y' = y*cos(-PI/2) - z*sin(-PI/2) = 0 + z = z
- z' = y*sin(-PI/2) + z*cos(-PI/2) = -y + 0 = -y

So local Z becomes world Y. That means if I displace vertices along local Z in the vertex shader, it will appear as vertical displacement in world space.

Wait, but I want to displace "up/down" which is world Y. So in the vertex shader, I should add to the Z component of the position (local space), and after the modelViewMatrix transform, it will appear as Y displacement in world space.

Actually, let me just use `position` in the vertex shader and add the wave to the z component. The wave pattern should be based on x and y (which in world space are the horizontal coordinates).

Let me write the vertex shader:
```glsl
varying float vHeight;
uniform float uTime;

void main() {
    float wave = sin(position.x * 1.5 + uTime) * 0.15 + sin(position.y * 1.2 + uTime * 0.8) * 0.12 + sin((position.x + position.y) * 0.8 + uTime * 1.2) * 0.1;
    float height = wave;
    vHeight = height;
    vec3 pos = position;
    pos.z += height; // displace along local Z which becomes world Y
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Map height to color: low = deep blue, high = white
    float t = (vHeight + 0.4) / 0.8; // normalize roughly
    t = clamp(t, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Camera: position it at an angle, maybe (8, 5, 8) looking at origin, or something like that.

Let me also think about the wave range. With the coefficients I chose, the max displacement is about 0.15 + 0.12 + 0.1 = 0.37, and min is -0.37. So the range is roughly -0.37 to +0.37. Let me adjust the normalization in the fragment shader accordingly.

Actually let me make the waves a bit more dramatic for visual appeal. Let me use:
- sin(position.x * 2.0 + uTime) * 0.2
- sin(position.y * 1.5 + uTime * 0.7) * 0.15
- sin((position.x + position.y) * 1.0 + uTime * 1.3) * 0.15

Max total: 0.2 + 0.15 + 0.15 = 0.5
Min total: -0.5

So range is -0.5 to +0.5. In fragment shader, I'll normalize: t = (vHeight + 0.5) / 1.0, clamped to [0, 1].

Let me finalize the code. I need to make sure it compiles with tsc --strict.

For the TypeScript strict mode:
- All variables typed
- No implicit any
- Proper handling of window as any

Let me write the complete file now.
