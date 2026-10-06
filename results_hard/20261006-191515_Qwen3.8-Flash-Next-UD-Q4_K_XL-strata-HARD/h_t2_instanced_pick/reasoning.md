The user wants a single TypeScript file that:
1. Creates a 30x30 grid of boxes using ONE InstancedMesh (900 instances)
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show exactly
7. Clicking toggles color: gray → red, red → gray
8. Uses THREE.Raycaster with NDC from canvas bounding rect, uses intersection.instanceId
9. Flag instance colors for upload after changing
10. Expose (window as any).__mesh = mesh
11. Standard setup: renderer, resize handler, animation loop, (window as any).__scene, __camera, __renderer, __ready

Let me think about the grid:
- 30x30 grid, spacing 1.0, so total width/height = 29 * 1.0 = 29 units (from center of first to center of last)
- Centered on origin: positions from -14.5 to +14.5 in both X and Y
- Box size 0.8, spacing 1.0 → gaps of 0.2

Camera:
- PerspectiveCamera looking straight at the grid (along -Z axis, looking at origin)
- Need to calculate distance so the whole grid is visible with margin
- Grid extent: ~29 units wide/tall
- With a perspective camera, vertical FOV determines how much is visible
- Let's use FOV of 45°, and calculate distance to see 29 units + margin
- At FOV 45°, visible height at distance d is 2 * d * tan(22.5°)
- We want visible height ≥ 32 (29 + some margin)
- 2 * d * tan(22.5°) = 32 → d = 32 / (2 * 0.4142) = 32 / 0.8284 ≈ 38.6
- Let's use distance ~40 for good margin

Raycasting:
- On click, get NDC from canvas bounding rect
- Cast ray, get first intersection
- Toggle color using setColorAt and getMatrixAt for position
- Flag instanceColor for upload

Let me write the code:
