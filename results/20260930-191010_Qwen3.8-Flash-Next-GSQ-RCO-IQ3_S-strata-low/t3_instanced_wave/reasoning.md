The user wants a single TypeScript file that renders a 100x100 grid of cubes using a single InstancedMesh. Let me plan this out:

1. Create the scene, camera, renderer
2. Create an InstancedMesh with 10000 instances
3. Set up MeshStandardMaterial, AmbientLight, DirectionalLight
4. Set per-instance colors using setColorAt
5. Animate with radial wave using setMatrixAt
6. Reuse a Matrix4 (or Object3D) for transforms - no allocations in the loop
7. Handle resize
8. Expose globals for testing
9. Set __ready = true after first frame

Key considerations:
- Grid spacing: 100x100, let's use a small cube size (e.g., 0.5) with spacing of 1 unit, centered at origin
- The center of the grid is (0, 0, 0) in grid coordinates
- distanceFromCenter = sqrt(x² + y²) in the XZ plane
- Wave: Y = sin(distance * k - time * speed) * amplitude
- Camera positioned at an angle to see the whole grid

Let me write this carefully to ensure it compiles with strict TypeScript.

For the grid: 100x100 = 10000 instances. I'll place them centered at origin with spacing of 1. So positions go from -49.5 to 49.5 in both X and Z.

For colors: I'll use HSL based on grid position to create a gradient.

For the animation: I'll store the positions in arrays and compute the wave Y offset each frame.

Let me make sure no allocations happen in the render loop - I'll pre-allocate the Matrix4 and use it via dummy Object3D approach or directly with Matrix4.

Actually, using a dummy Object3D is fine as long as it's allocated once outside the loop. I'll use `dummy.position.set(...)` and `dummy.updateMatrix()` then `mesh.setMatrixAt(i, dummy.matrix)`.

Let me write the code:
