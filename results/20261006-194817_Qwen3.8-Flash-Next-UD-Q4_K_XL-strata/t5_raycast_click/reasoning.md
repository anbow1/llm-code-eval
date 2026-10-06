The user wants a single TypeScript file that:
1. Creates a 5x5 grid of cubes in the XY plane facing the camera
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), deselects previous
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. renderer.setAnimationLoop for render loop
10. Delta/elapsed time based motion (but no animation of cubes, so just render)
11. Expose __scene, __camera, __renderer, __ready
12. Handle window resize
13. No external assets

Let me think about the grid layout:
- 5x5 grid in XY plane
- Cube size: let's say 0.8 units, spacing of 1.2 units (gaps between them)
- Center the grid at origin
- Camera at (0, 0, some z) looking at origin

Grid spacing: let's use cube size 1, gap 0.4, so total step = 1.4. Grid goes from -2*1.4 to 2*1.4 = -2.8 to 2.8. Camera needs to see this with margin.

Camera FOV 50, aspect ~16/9. Vertical visible at distance d: 2*d*tan(25°). For grid height ~5.6 + margin ~7, need 2*d*tan(25°) > 7, so d > 7/(2*0.466) ≈ 7.5. Let's put camera at z=10.

Let me write the complete file.
