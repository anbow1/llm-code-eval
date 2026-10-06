The user wants a single TypeScript file that renders a 100x100 grid of cubes using a single InstancedMesh with radial wave animation. Let me plan this carefully:

1. Create scene, camera, renderer
2. Create InstancedMesh with 100x100 = 10000 instances
3. Use BoxGeometry for small cubes
4. MeshStandardMaterial
5. AmbientLight + DirectionalLight
6. Animate with sin wave based on distance from center
7. setColorAt for gradient colors
8. Reuse Object3D/Matrix4 - no allocations in loop
9. Expose __scene, __camera, __renderer, __ready

Key considerations:
- No allocations in render loop: reuse a dummy Object3D and Matrix4
- setMatrixAt + instanceMatrix.needsUpdate = true
- setColorAt + instanceColor.needsUpdate = true (only once at init)
- Camera at angle to see the whole grid
- Delta time or elapsed time for animation

Let me write this carefully to be strict-mode compliant.
