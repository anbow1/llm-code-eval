The user wants a TypeScript file that:
1. Creates a 100x100 grid of small cubes using InstancedMesh
2. Animates a radial wave using sin(distance * k - time * speed) * amplitude
3. Uses setColorAt for gradient colors
4. Reuses a single Object3D or Matrix4 (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid
7. Follows all the hard rules (imports, renderer setup, resize, setAnimationLoop, expose globals, __ready flag, no external assets)

Let me think through the implementation:

- 100x100 = 10,000 instances
- Each instance is a small cube (BoxGeometry)
- I'll use a reusable Matrix4 (or Object3D) to set positions
- For the wave: sin(distanceFromCenter * k - time * speed) * amplitude
- For colors: a gradient based on grid position (e.g., from blue to red based on x+y)
- Camera positioned at an angle (e.g., elevated and offset)

For the render loop:
- Use a single Matrix4 that I compose with position each frame
- Call mesh.setMatrixAt(index, matrix)
- After all updates, set mesh.instanceMatrix.needsUpdate = true

Let me write this carefully to ensure no allocations in the loop. I'll precompute the grid positions (x, z) and store them in a Float32Array or array of vectors.

Actually, to avoid allocations, I'll precompute an array of x,z positions (as a flat array or array of pre-allocated vectors), and reuse a single Matrix4.

Let me structure:
- Pre-allocate: positions array (Float32Array of 20000 values for x,z pairs)
- Reuse: a single Matrix4, a single Color (for setColorAt only done once at init)
- In the loop: for each instance, compute y from the wave formula, compose the matrix, setMatrixAt

For colors - I'll do this once at initialization, not in the render loop.

Camera: position it at something like (50, 60, 50) looking at origin, with a grid of size ~100 (spacing of 1 unit between cubes, so the grid spans from -50 to 50 or 0 to 100). Let me center it at origin, so positions go from -49.5 to 49.5 (with spacing 1).

Let me use spacing = 1, so grid positions are: (i - 50) * spacing for i in 0..99, same for j. That gives -50 to 49.

Camera at (60, 50, 60) looking at (0, 0, 0) should work well.

Wave parameters:
- k (spatial frequency): maybe 0.3
- speed: maybe 3
- amplitude: maybe 3

Let me write the code now.
