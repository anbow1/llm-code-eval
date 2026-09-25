The user wants a simple Three.js scene with a 5x5 grid of cubes. Let me plan this out:

1. 25 cubes in a 5x5 grid on the XY plane (z=0)
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Raycasting for click selection - clicking a cube selects it (red), clicking background deselects
4. PerspectiveCamera looking straight at the grid
5. AmbientLight + DirectionalLight
6. No animation, no camera movement
7. Handle resize
8. Expose __scene, __camera, __renderer, __ready

Let me think about the grid layout:
- 5x5 grid, cubes with gaps between them
- Cube size: 1 unit
- Gap: let's say 0.5 units between them
- Spacing: 1.5 units apart
- Grid positions: from -3 to 3 in both x and y (5 positions: -3, -1.5, 0, 1.5, 3)
- All at z=0

Camera: looking straight at the grid from positive Z. Need to calculate distance so the whole grid is visible with margin.

Grid extent: from -3 to 3 = 6 units wide. With cube size 1, it goes from -3.5 to 3.5 = 7 units total. With margin, maybe 9 units.

For a perspective camera with FOV 50, the visible height at distance d is 2*d*tan(FOV/2). We want visible height > 9 (with margin).
9 = 2*d*tan(25°) = 2*d*0.4663 = 0.9326*d
d = 9/0.9326 ≈ 9.65. Let's use 12 for some margin.

Actually let me recalculate. Grid positions: I'll use spacing of 1.5 (cube size 1, gap 0.5).
Positions: -3, -1.5, 0, 1.5, 3
Total extent: 6 units center-to-center. With cube half-size 0.5 on each side: -3.5 to 3.5 = 7 units.
With some margin, let's aim for ~10 units visible.

d = 10 / (2 * tan(25°)) = 10 / 0.9326 ≈ 10.7. Let's use 12.

Raycaster: use canvas bounding rect for NDC calculation.

Let me write the complete TypeScript file.
