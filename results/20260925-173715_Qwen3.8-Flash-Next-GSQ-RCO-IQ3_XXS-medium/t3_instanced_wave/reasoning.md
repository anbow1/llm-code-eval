The user wants a single TypeScript file that renders a 100x100 grid of cubes using a single InstancedMesh with an animated radial wave. Let me carefully design this:

1. Create scene, camera, renderer
2. Create an InstancedMesh with 10,000 instances (100x100 grid)
3. Use MeshStandardMaterial
4. Add AmbientLight + DirectionalLight
5. Animate a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
6. Use setColorAt for per-instance colors (gradient by grid position)
7. Reuse a single Object3D/Matrix4 for updates - no allocations in the render loop
8. Handle resize
9. Expose scene, camera, renderer on window
10. Set __ready = true after first frame

Let me write this carefully to compile with `tsc --strict`:

- Import THREE from 'three'
- Create geometry (BoxGeometry) and material (MeshStandardMaterial)
- Create InstancedMesh with count 10000
- Pre-compute positions, colors, and distances (for the wave)
- In the animation loop, use a single reusable dummy Object3D to set matrices
- Use setAnimationLoop with a timestamp parameter

Let me think about the grid:
- 100x100 = 10,000 instances
- Each cube is small (e.g., 0.5x0.5x0.5)
- Spacing: let's say 1.0 units apart
- Grid goes from -50 to +49 (or -49.5 to +49.5)
- Center is at (0, 0, 0)

For the radial wave:
- distance = sqrt(x^2 + z^2)
- Y = sin(distance * k - time * speed) * amplitude
- k controls spatial frequency, speed controls temporal frequency

For colors: gradient by grid position - could use HSL based on distance from center or position.

Camera at an angle: position it at something like (80, 80, 80) looking at origin.

Let me make sure no allocations happen in the render loop. I'll pre-allocate:
- A dummy Object3D
- Pre-compute distance array
- Pre-compute base positions

For colors, I'll use a gradient. Let me use HSL: hue based on (x + z) / (2*100) or something similar.

Let me write the code now.
