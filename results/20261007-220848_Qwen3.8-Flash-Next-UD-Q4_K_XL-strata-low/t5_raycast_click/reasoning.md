The user wants a single TypeScript file that creates a 5x5 grid of cubes in the XY plane with specific interaction behavior. Let me break down the requirements:

1. 25 cubes in a 5x5 grid in XY plane, facing camera, with gaps
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Click selection: red (0xff0000) for selected, only one at a time
4. Clicking background clears selection
5. Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at grid, all visible with margin
7. No camera movement, no animation
8. AmbientLight + DirectionalLight
9. Standard Three.js setup with renderer, resize handler, animation loop
10. Expose __scene, __camera, __renderer, __ready

Let me think about the layout:
- 5x5 grid in XY plane means cubes at positions varying in X and Y, with Z = 0
- Gaps between cubes: if cube size is 1, spacing could be 1.5 or 2
- Let me use cube size 1 and spacing 1.5 (gap of 0.5 between cubes)

Camera: looking straight at the grid from Z axis. Need to ensure all cubes are visible with margin. The grid spans from -3 to 3 in both X and Y (with spacing 1.5, positions at -3, -1.5, 0, 1.5, 3). So the grid is about 7x7 units. With a perspective camera at z=12 or so, FOV 60, this should be visible.

Let me calculate: at FOV 60, the half-height at distance d is d * tan(30°) = d * 0.577. For the grid to fit with margin, I need half-height > 4 (half of grid height ~7, plus margin). So d > 4/0.577 ≈ 6.9. Let's use d = 12 for comfortable margin.

Actually, let me reconsider. Grid positions: for i in 0..4, j in 0..4, position = (i * spacing - offset, j * spacing - offset, 0). With spacing 1.5 and offset 3 (so centered), positions range from -3 to 3. The grid extends from -3.5 to 3.5 (with cube size 1, so half-size 0.5). Total span = 7.

With camera at z=12, FOV=60: half-height = 12 * tan(30) = 12 * 0.577 = 6.93. So 6.93 > 3.5, plenty of margin.

For the render loop, I need to render at least once then set __ready = true.

For raycasting, I need to handle click events on the renderer's canvas (or window), compute NDC from the canvas bounding rect.

Let me write the code:
