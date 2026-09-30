The user wants a single TypeScript file that:
1. Creates a 5x5 grid of cubes in the XY plane (facing camera)
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (changes to 0xff0000), deselects previously selected
4. Clicking empty background clears selection
5. Uses Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking at the grid, all visible with margin
7. AmbientLight + DirectionalLight
8. No other meshes, no animation
9. Handles resize
10. Exposes scene, camera, renderer on window
11. Sets __ready after first frame

Let me write this carefully:

- 5x5 grid in XY plane: cubes at positions (-2, -2), (-1, -2), ... (2, 2) in XY, z=0
- Cube size: let's use size 0.8 with gap between them (so they don't touch)
- Camera: z position enough to see the grid. Grid spans from -2 to 2 in X and Y. With perspective camera, FOV 60, at z=10, the visible height at z=0 is 2*10*tan(30°) ≈ 11.5, so the 4-unit grid fits with margin.

Let me structure this properly with strict TypeScript.

For the click handler:
- Get bounding rect of canvas
- Compute NDC: ((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1
- Raycast against the cubes array
- If hit, change that cube's material color to 0xff0000, reset previous
- If no hit, reset all

Let me write the complete file.
