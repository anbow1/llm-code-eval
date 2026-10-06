The user wants a single TypeScript file that creates a 5x5 grid of cubes in the XY plane, facing the camera, with click-to-select functionality using raycasting. Let me plan this out:

1. Create renderer, camera, scene
2. Create 25 cubes (5x5 grid) with individual MeshStandardMaterial (color 0x4488ff)
3. Add AmbientLight + DirectionalLight
4. Raycaster for click detection using NDC from canvas bounding rect
5. Click on cube → select it (color 0xff0000), deselect previous
6. Click on background → clear selection
7. Handle resize
8. Expose __scene, __camera, __renderer, __ready

Let me think about the grid spacing:
- 5x5 grid, cubes of size 1 with gaps. Let's say cube size 0.8, spacing 1.2 (gap of 0.4 between cubes)
- Grid spans from -2.4 to 2.4 in both X and Y (5 positions at -2.4, -1.2, 0, 1.2, 2.4)
- Camera looking down Z axis (or from positive Z toward origin)

Camera positioning:
- Grid spans roughly ±2.4 in X and Y. Need some margin.
- With a PerspectiveCamera FOV of 50, at distance Z, the visible height is 2 * Z * tan(fov/2)
- For margin, we want visible area to be at least ~6 units. 2 * Z * tan(25°) >= 6, so Z >= 6 / (2 * 0.466) ≈ 6.4. Let's use Z = 8 or 10.

Let me use FOV 50, Z = 8. Visible height = 2 * 8 * tan(25°) ≈ 2 * 8 * 0.466 ≈ 7.46. That gives margin.

For the raycaster, I need to use the canvas bounding rect for proper NDC computation.

Let me write the complete file.
