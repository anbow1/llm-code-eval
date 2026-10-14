The user wants a complete TypeScript file using Three.js that creates a plane with a custom shader material for animated waves. Let me write this carefully.

Key requirements:
1. PlaneGeometry 10x10 with 128x128 segments, rotated to XZ plane
2. Custom ShaderMaterial with vertex and fragment shaders
3. Vertex shader: displace Y based on wave pattern using position and uTime
4. Fragment shader: color by height (low = deep blue, high = white foam)
5. Pass height via varying
6. Update uTime every frame from elapsed time
7. Camera at an angle
8. Must compile with tsc --strict
9. Expose scene, camera, renderer on window
10. Set __ready = true after first frame
11. No external assets

Let me write the shaders:

Vertex shader:
- Takes position, applies a sine-wave based displacement to y
- Uses uTime as a uniform
- Computes height and passes it as varying

Fragment shader:
- Uses varying height to mix between deep blue and white
- Low = deep blue, high = white foam

For the wave pattern, I'll use a combination of sine functions based on x and z positions with time offset to create interesting ocean-like waves.

Let me make sure the TypeScript is strict-compliant. I need to be careful with types.

Let me structure the file:
- Import THREE
- Create renderer, scene, camera
- Create ShaderMaterial with uniforms
- Create PlaneGeometry, rotate it
- Set up resize handler
- setAnimationLoop with delta time update
- Set __ready after first frame

For strict TypeScript, I need to make sure all types are correct. THREE.js types should be fine with standard imports.

Let me write it out:
