The user wants a 5x5 grid of cubes in the XY plane facing the camera. Let me plan this out:

1. 25 cubes in a 5x5 grid in XY plane (Z=0 for all)
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), deselecting previous
4. Clicking empty background clears selection
5. Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking at the grid center
7. AmbientLight + DirectionalLight
8. No animation of cubes, no camera movement
9. Renderer appended to document.body
10. Handle resize
11. Use setAnimationLoop
12. Expose __scene, __camera, __renderer, __ready

Let me think about the grid dimensions:
- 5x5 grid in XY plane
- Each cube is a BoxGeometry, let's say size 1x1x1
- Gaps between them - let's use spacing of 1.5 (cube size 1, gap 0.5)
- Grid center at origin, so positions go from -3 to 3 in X and Y (with spacing 1.5: positions -3, -1.5, 0, 1.5, 3)
- Actually let me think: 5 cubes with spacing 1.5. Positions: 0, 1.5, 3, 4.5, 6 → centered: -3, -1.5, 0, 1.5, 3

Camera: PerspectiveCamera looking at origin. The grid spans from -3 to 3 in both X and Y (size 1 cubes centered at those positions). So total span is about 7 units. With FOV 50, I need to be far enough back. Let me put camera at z=12 or so to have margin.

Let me calculate: at z=12, FOV=50, visible height = 2 * 12 * tan(25°) ≈ 2 * 12 * 0.466 ≈ 11.2. Grid height is about 7 (from -3.5 to 3.5). So there's margin. Good.

For the click handler:
- Use 'click' event on the renderer's domElement
- Compute NDC from bounding rect
- Raycast against the 25 cubes
- If hit, select that cube; if not, clear selection

Let me write the code now.
