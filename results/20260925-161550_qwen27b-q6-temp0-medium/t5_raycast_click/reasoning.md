The user wants a complete TypeScript file that creates a 5x5 grid of cubes using Three.js. Let me plan this out:

1. Import THREE
2. Create renderer, append to body
3. Create scene, camera (PerspectiveCamera looking at grid)
4. Create 25 cubes in a 5x5 grid in XY plane facing camera
5. Each cube has its own MeshStandardMaterial with color 0x4488ff
6. Add lights (AmbientLight + DirectionalLight)
7. Raycaster for click handling - select/deselect cubes
8. Handle window resize
9. Use renderer.setAnimationLoop
10. Expose __scene, __camera, __renderer, __ready

Let me think about the grid layout:
- 5x5 grid in XY plane
- Cubes should face the camera (camera is along Z axis looking at origin)
- Visible gaps between cubes
- Let's say cube size is 1, gap is 0.5, so spacing is 1.5
- Grid positions: from -2 to 2 in both X and Y, times spacing

For the camera:
- PerspectiveCamera looking straight at the grid
- The whole grid should be visible with margin
- No camera movement, no animation

Grid extent: 5 cubes with spacing 1.5 → from -2*1.5 to +2*1.5 = -3 to +3 in both X and Y
So grid width/height is 6 units. With margin, let's say camera needs to see about 8 units.

For a perspective camera, I'll position it at z=some distance and look at origin.

Let me use:
- Cube size: 1
- Spacing: 1.8 (so gap is 0.8)
- Positions: (i - 2) * 1.8 for i in 0..4, same for Y
- Grid extent: ±3.6, total 7.2
- Camera at z = 12 or so, with FOV 45 degrees

Let me calculate: with FOV 45 and distance d, the visible height at the grid plane is 2 * d * tan(FOV/2) = 2 * d * tan(22.5°) ≈ 2 * d * 0.4142

For visible height of about 10 (7.2 grid + margin): d ≈ 10 / (2 * 0.4142) ≈ 12

So camera at z = 12 should work.

For the click handling:
- Get canvas bounding rect
- Compute NDC: x = ((event.clientX - rect.left) / rect.width) * 2 - 1
- y = -((event.clientY - rect.top) / rect.height) * 2 + 1
- Use raycaster to intersect with cubes
- If hit: select that cube (red), deselect previous (blue)
- If no hit: deselect all

Let me write the complete file now.
