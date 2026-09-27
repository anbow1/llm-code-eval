The user wants a TypeScript file that creates a plane with a custom shader material that displays waves. Let me write this carefully:

1. Import THREE
2. Create renderer, append to document.body
3. Create PlaneGeometry 10x10 with 128x128 segments
4. Rotate it to lie flat in XZ plane (rotation.x = -Math.PI/2)
5. Custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down based on position and uTime
   - Fragment shader: colors by height (deep blue to white), passes height via varying
6. Update uTime each frame from elapsed time
7. No lights needed
8. Camera at an angle
9. Handle resize
10. Use setAnimationLoop
11. Expose __scene, __camera, __renderer, __ready

Let me write the vertex shader:
- Input: position (from PlaneGeometry), which is in XY plane before rotation
- But wait, the plane is rotated via the mesh's rotation, so in the shader, position is still in the local XY plane
- I need to displace along the local Z axis (which becomes world Y after rotation)
- Actually, let me think about this. The PlaneGeometry creates a plane in XY. If I rotate the mesh by -PI/2 around X, the local Z becomes world Y. So displacing position.z in the vertex shader will move vertices up/down in world space.
- For the wave pattern, I'll use the local x and y coordinates (which map to world X and Z after rotation)

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 1.5 + uTime * 2.0) * 0.3
               + cos(pos.y * 1.2 + uTime * 1.5) * 0.2
               + sin((pos.x + pos.y) * 0.8 + uTime) * 0.15;
    pos.z += wave;
    vHeight = pos.z; // local z becomes world y after rotation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Normalize height: waves range roughly from -0.65 to 0.65
    float h = (vHeight + 0.65) / 1.3; // 0 to 1
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, white, h);
    gl_FragColor = vec4(color, 1.0);
}
```

Wait, I should think about the height range. The waves:
- sin(pos.x * 1.5 + uTime * 2.0) * 0.3 → max 0.3
- cos(pos.y * 1.2 + uTime * 1.5) * 0.2 → max 0.2
- sin((pos.x + pos.y) * 0.8 + uTime) * 0.15 → max 0.15

Total max: 0.65, total min: -0.65

So normalizing: (vHeight + 0.65) / 1.3 gives 0 to 1 range.

For the camera, I'll position it at something like (0, 5, 8) looking at origin to see the waves at an angle.

Let me make sure the code compiles with tsc --strict:
- All variables properly typed
- No implicit any
- Proper null checks where needed

Let me write the complete file now.
