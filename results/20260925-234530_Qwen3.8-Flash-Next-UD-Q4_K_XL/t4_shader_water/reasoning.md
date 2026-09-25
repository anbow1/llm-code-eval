The user wants a single TypeScript file that creates a 3D scene with a plane using a custom ShaderMaterial for water-like waves. Let me plan this out:

1. Import Three.js
2. Create scene, camera, renderer
3. Create PlaneGeometry(10, 10, 128, 128)
4. Create ShaderMaterial with vertex and fragment shaders
   - Vertex: displace Y based on sin/cos waves using uTime uniform, pass height as varying
   - Fragment: color by height (deep blue low, white foam high)
5. Rotate plane to lie flat in XZ plane (rotate -PI/2 around X)
6. Position camera at an angle
7. Handle resize
8. Use setAnimationLoop with elapsed time
9. Expose scene, camera, renderer, __ready

Let me write this carefully to ensure it compiles with --strict and has zero errors.

For the vertex shader:
- uniform float uTime
- varying float vHeight
- Displace position.y (or in the case of a plane rotated, we need to think about this)

Wait - if the plane is created as PlaneGeometry (which is in XY plane by default) and then rotated to XZ, the vertex displacement in the vertex shader should be along the normal direction. Since we're applying a matrix transform, we can displace along Y before the model matrix is applied... actually, for a plane that's in XY and we rotate it to XZ, the local Y becomes world Y. So in the vertex shader, displacing along Y in local space before the model matrix transform would work if we rotate the mesh.

Actually, let me think more carefully. PlaneGeometry creates vertices in the XY plane (z=0). When we rotate the mesh by -PI/2 around X, the local Y axis maps to world Z, and local Z maps to world -Y. Wait no:

Rotation by -PI/2 around X:
- X stays X
- Y -> -Z (local Y becomes world -Z... no)

Actually rotation matrix for -PI/2 around X:
- x' = x
- y' = z
- z' = -y

Wait, let me think again. Rotation by angle θ around X:
- x' = x
- y' = y*cos(θ) - z*sin(θ)
- z' = y*sin(θ) + z*cos(θ)

For θ = -PI/2: cos = 0, sin = -1
- x' = x
- y' = z
- z' = -y

So if I have a plane in XY (z=0), after rotation:
- x' = x
- y' = 0 (since z=0)
- z' = -y

So the plane lies in XZ plane at y=0. Good.

Now in the vertex shader, if I displace along Y (local space), after the model matrix rotation:
- The displacement in local Y becomes displacement in world -Z direction. That's not what we want.

Better approach: rotate the plane to XZ in the vertex shader or use a different rotation. 

Actually, the simpler approach: rotate by PI/2 around X axis instead:
For θ = PI/2: cos = 0, sin = 1
- x' = x
- y' = -z
- z' = y

So a plane in XY (z=0):
- x' = x
- y' = 0
- z' = y

Plane lies in XZ plane. And if I displace along local Y in the vertex shader, world Y displacement would be... local Y maps to world Z. Hmm.

Alternative: I can rotate the geometry itself rather than the mesh. Or I can displace along the normal in the vertex shader.

Actually, the simplest approach: rotate the mesh by -Math.PI/2 on X. In the vertex shader, the position is in local space. The plane's normal in local space is (0,0,1) (Z direction). After rotation by -PI/2 around X, local Z becomes world Y. So if I displace along local Z in the vertex shader, it becomes world Y displacement. 

OR, even simpler: rotate the geometry itself. `geometry.rotateX(-Math.PI/2)` transforms all vertex positions so the plane is in XZ with normals pointing up (Y). Then in the vertex shader, displacing Y gives world Y displacement directly, and the model matrix is identity.

Let me go with: `geometry.rotateX(-Math.PI/2)` on the geometry itself. This modifies the vertex positions and normals. Then the mesh has no rotation, and in the vertex shader, position.y is the height, and displacing y gives world-space height.

For the vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 2.0 + uTime) * 0.5 + 
                 sin(pos.z * 3.0 + uTime * 1.3) * 0.3 +
                 sin((pos.x + pos.z) * 1.5 + uTime * 0.7) * 0.4;
    pos.y += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

For the fragment shader:
```glsl
varying float vHeight;

void main() {
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    vec3 white = vec3(1.0);
    // Map height to color
    float t = clamp((vHeight + 1.0) / 2.0, 0.0, 1.0);
    vec3 color = mix(deepBlue, white, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Wait, for strict TypeScript with Three.js, I need to be careful about types. Let me also make sure I use `renderer.setAnimationLoop` and handle the delta time properly.

For the clock, I'll use THREE.Clock or just compute from performance.now(). Actually THREE.Clock is simplest.

Let me also handle the `__ready` flag after the first frame.

Let me also check: with `--strict`, `document.body` could be null. I should handle that or just use non-null assertion since the problem states there's no other HTML but there is a body.

Let me write the complete file now.
