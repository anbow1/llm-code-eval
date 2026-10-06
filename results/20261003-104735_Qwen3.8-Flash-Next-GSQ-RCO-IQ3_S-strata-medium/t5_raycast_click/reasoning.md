The user wants a complete TypeScript file that creates a 5x5 grid of cubes in the XY plane. Let me carefully implement all requirements:

1. 5x5 grid of cubes (25 Mesh objects) in XY plane, facing camera, with gaps
2. No other meshes
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000, previous selection reverts to 0x4488ff
5. Clicking empty background clears selection
6. Raycaster with NDC from canvas bounding rect
7. PerspectiveCamera looking straight at grid, whole grid visible with margin, no camera movement, no animation
8. AmbientLight + DirectionalLight

Let me think about the grid layout:
- 5x5 grid in XY plane
- Cubes with gaps between them
- Let's say cube size 0.8, spacing 1.2 (gap of 0.4 between cubes)
- Grid center at origin, so positions from -2*spacing to 2*spacing

Camera setup:
- Looking straight at the grid (positioned along Z axis)
- Need to ensure whole grid is visible with margin
- Grid extends from -2*1.2 to 2*1.2 = -2.4 to 2.4 in X and Y
- So need camera far enough back. With FOV 60, half-width at distance d is d*tan(30°) ≈ 0.577*d
- Need 0.577*d > 2.4 + some margin, say 3.0, so d > 5.2. Let's use d = 8 or so.

Let me calculate:
- Grid spans -2.4 to 2.4 in both X and Y (with cube size 0.8 and spacing 1.2)
- Half-extent = 2.4
- With margin, need to see about 3.0
- tan(30°) * d > 3.0 → d > 5.2
- Use d = 8 for comfortable margin

Let me write the code carefully with strict TypeScript.
