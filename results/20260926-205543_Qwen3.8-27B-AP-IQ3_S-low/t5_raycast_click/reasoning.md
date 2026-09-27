Let me break down the requirements:

1. 5x5 grid of cubes (25 Mesh objects) in XY plane facing camera
2. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one at a time, previously selected goes back to 0x4488ff
4. Clicking empty background clears selection
5. Use THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. All the hard rules about renderer, resize, animation loop, exposing objects, etc.

Let me think about the grid layout:
- 5x5 grid in XY plane
- Cubes should face the camera (so they're in XY plane, camera looks along Z axis)
- Visible gaps between cubes

Let me say cube size = 1, gap = 0.3, so spacing = 1.3
Grid positions: for i in 0..4, j in 0..4, position = (i - 2) * spacing, (j - 2) * spacing, 0

Total grid width = 4 * 1.3 + 1 = 6.2 (from -3.1 to 3.1)

Camera: PerspectiveCamera looking at z=0 plane. I need to position it so the whole grid is visible with margin.

Let's use FOV 50 degrees, position at z = 10 or so. The grid spans about 6.2 units. With some margin, maybe 8 units total visible.

At z=10, with FOV 50, the visible height at z=0 is 2 * 10 * tan(25°) = 20 * 0.466 = 9.32 units. That should be enough to show a 6.2 unit grid with margin.

Actually let me recalculate. The grid spans from -3.1 to 3.1 in both X and Y (if spacing is 1.3 and cube size is 1). So the grid is 6.2 x 6.2. With margin, let's say we want 8 units visible. At z=10 with FOV 50:
- Visible height = 2 * 10 * tan(25°) ≈ 9.33
- Visible width depends on aspect ratio

That should work fine.

For the click handling:
- Get mouse position relative to canvas bounding rect
- Convert to NDC: x = (x - rect.left) / rect.width * 2 - 1, y = -( (y - rect.top) / rect.height * 2 - 1)
- Use raycaster to intersect with cubes array
- If hit a cube: deselect previous, select new
- If no hit: deselect all

Let me write the complete file now.
