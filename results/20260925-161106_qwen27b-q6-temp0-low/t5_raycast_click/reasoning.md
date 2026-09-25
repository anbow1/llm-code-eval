The user wants a TypeScript file that:
1. Creates a 5x5 grid of 25 cube Mesh objects in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (turns red 0xff0000), deselecting the previous one
4. Clicking empty background clears all selections
5. Uses THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. AmbientLight + DirectionalLight
8. No other meshes, no animation of cubes
9. Must compile with tsc --strict
10. Handle resize
11. Expose __scene, __camera, __renderer, __ready

Let me think about the layout:
- 5x5 grid in XY plane, facing camera (so camera looks along -Z or +Z)
- Cubes with gaps between them. Let's say cube size = 1, gap = 0.5, so spacing = 1.5
- Grid spans from -2*1.5 to +2*1.5 = -3 to +3 in both X and Y (center at 0)
- Total grid size = 6 units (from -3 to 3)

Camera: looking straight at the grid. If grid is in XY plane, camera should be on Z axis looking at origin. Let's put camera at (0, 0, 10) looking at (0, 0, 0).

With a perspective camera at z=10, I need to figure out the FOV so the whole grid is visible with margin. The grid is 6 units wide/tall. Let's use FOV 45 degrees. At z=10, the visible height is 2 * 10 * tan(45/2 * pi/180) = 2 * 10 * tan(22.5°) ≈ 2 * 10 * 0.4142 ≈ 8.28. That gives about 1.14 units margin on each side. That should be fine.

Actually let me reconsider. The grid positions:
- For i in 0..4, j in 0..4
- x = (i - 2) * spacing, y = (j - 2) * spacing
- spacing = 1.5 (cube size 1 + gap 0.5)

So positions range from -3 to 3. Total span = 6.

Camera at (0, 0, 10), FOV 45:
- Visible height at z=0: 2 * 10 * tan(22.5°) ≈ 8.28
- Margin: (8.28 - 6) / 2 ≈ 1.14 on each side

That looks good.

For the click handling:
- Use canvas.getBoundingClientRect() to compute NDC
- Raycaster from camera through the click point
- Intersect with all cubes
- If hit, select that cube (deselect previous)
- If no hit, deselect all

Let me write this out carefully with strict TypeScript.
