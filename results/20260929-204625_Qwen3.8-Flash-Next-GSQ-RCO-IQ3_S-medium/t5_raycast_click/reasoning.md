The user wants a single TypeScript file that:
1. Creates a 5x5 grid of cubes in the XY plane, facing the camera
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one selected at a time
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation
8. AmbientLight + DirectionalLight
9. No other meshes
10. Standard setup with renderer, resize handling, __ready flag, etc.

Let me plan the grid:
- 5x5 = 25 cubes
- XY plane means cubes are arranged in X and Y, with Z depth for the cube itself
- "Facing the camera" - camera looks along -Z, so cubes are in XY plane
- "Visible gaps between them" - cubes should be smaller than the spacing
- Let's say cube size = 1, spacing = 1.5 (0.5 gap between cubes)

Grid positions:
- For i in 0..4, j in 0..4: x = (i - 2) * spacing, y = (j - 2) * spacing, z = 0

Camera position: looking at origin, need to see 5*1.5 = 7.5 units wide (from -3 to 3, so span 6 units for centers, plus 0.5 for half cubes = 7 units). With some margin, maybe 8-9 units.

For PerspectiveCamera with fov=60:
- Half width at distance d: d * tan(fov/2) * aspect
- We need to fit ~8 units wide
- With aspect ~16/9: 8/2 = 4 = d * tan(30°) * (16/9) → d = 4 / (0.577 * 1.778) ≈ 3.89
- Let's use d = 12 to have comfortable margin

Actually let me think more carefully:
- Grid spans: x from -3 to 3 (centers), cubes extend 0.5 more each side → -3.5 to 3.5, so 7 units wide
- y from -3 to 3, cubes extend 0.5 more each side → -3.5 to 3.5, so 7 units tall
- With margin, need ~9 units in view
- FOV = 60°, tan(30°) = 0.577
- Half-height at distance d: d * 0.577
- Need: d * 0.577 >= 4.5 → d >= 7.8
- Half-width at distance d: d * 0.577 * aspect
- For aspect = 1.5: d * 0.577 * 1.5 >= 4.5 → d >= 5.2
- So height is the limiting factor for square-ish aspect
- Let's use d = 12 for nice margin

Let me use cube size 1.0 and spacing 1.5. Grid centers: (i-2)*1.5, (j-2)*1.5 for i,j in 0..4.

For raycasting on click:
- Get canvas bounding rect
- Compute NDC: ((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1
- Raycaster.setFromCamera(ndc, camera)
- intersectObjects with the cubes array

Let me write the code now.
