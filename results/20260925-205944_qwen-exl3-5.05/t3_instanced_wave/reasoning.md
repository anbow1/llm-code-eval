The user wants a single TypeScript file that renders a 100x100 grid of small cubes using a single InstancedMesh with a radial wave animation. Let me plan this carefully:

1. Setup: renderer, scene, camera, lights
2. Create one InstancedMesh with 10,000 instances (100x100)
3. Use MeshStandardMaterial
4. Add AmbientLight + DirectionalLight
5. For each instance, set position on the grid, set color (gradient by position)
6. In the animation loop, compute Y = sin(distance * k - time * speed) * amplitude
7. Reuse a single Object3D for matrix computation (no allocations in loop)
8. Flag instanceMatrix.needsUpdate = true each frame
9. Handle resize
10. Expose globals for testing

Key considerations:
- Reuse one Object3D for setMatrixAt calls - no new Matrix4 or Object3D in the loop
- Use delta/elapsed time via renderer.setAnimationLoop's time parameter
- setColorAt with a gradient based on grid position
- Camera at an angle (e.g., elevated and slightly rotated)
- The cubes should be small (e.g., 0.8 x 0.8 x 0.8) with spacing of 1.0
- Center the grid so distance from center makes sense

Let me write this out carefully to ensure it compiles with tsc --strict.

For the grid: 100x100 = 10000 instances. Spacing of 1.0, cube size of 0.8. Grid goes from -49.5 to 49.5 in both X and Z.

For the wave: distance from center = sqrt(x^2 + z^2), k controls spatial frequency, speed controls temporal frequency, amplitude controls height.

For colors: gradient by grid position - I'll use HSL color based on the angle or position in the grid.

Let me make sure I handle the time correctly. renderer.setAnimationLoop passes a timestamp in milliseconds. I'll convert to seconds.

For the Object3D reuse: I'll create one dummy Object3D outside the loop, set its position/rotation/scale, call updateMatrix(), then use setMatrixAt with dummy.matrix.

Let me write the code now.
