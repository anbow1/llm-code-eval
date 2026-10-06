The user wants a single TypeScript file that renders a 100x100 grid of small cubes using a single InstancedMesh (10,000 instances). Let me plan this carefully:

1. Import Three.js and set up scene, camera, renderer
2. Create a single BoxGeometry and MeshStandardMaterial
3. Create InstancedMesh with count = 100 * 100 = 10000
4. Set up lights (AmbientLight + DirectionalLight)
5. In the render loop, update each instance's matrix using setMatrixAt with sin wave animation
6. Use setColorAt for gradient colors based on grid position
7. Reuse a single Object3D/Matrix4 - no allocations in the loop
8. Handle resize
9. Expose __scene, __camera, __renderer, __ready

Key considerations:
- No allocations inside the render loop (reuse Object3D or Matrix4)
- 100x100 grid centered at origin
- Wave: sin(distanceFromCenter * k - time * speed) * amplitude
- Camera at an angle to see the whole grid
- setAnimationLoop for render loop
- Delta/elapsed time for animation

Let me write this carefully to ensure it compiles with `tsc --strict`.

For the grid spacing, I'll use small cubes (e.g., size 0.5) with spacing of 1.0, centered at origin. The grid goes from -49.5 to 49.5 in both x and z.

For colors, I'll use a gradient based on grid position - maybe HSL color where hue varies by x position and saturation/lightness varies by z.

Let me make sure the Object3D helper is reused (no new allocations in the loop). I'll use a single THREE.Object3D and set its position, rotation, scale, then updateMatrix, then setMatrixAt.

Actually, to avoid allocations entirely in the loop, I can use a Matrix4 directly with compose(). Let me use the Object3D approach since it's cleaner and we create it once outside the loop.

Let me also precompute the distances from center for each instance to avoid sqrt in the loop... actually the rule says no allocations, but sqrt is fine, it's just a math operation. But precomputing distances is also fine and more efficient.

Let me write the code:
