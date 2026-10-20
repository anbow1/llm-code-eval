The user wants a single TypeScript file that:
1. Renders a 30x30 grid of boxes (900 instances) using one InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show exactly
7. Clicking an instance toggles color: gray ↔ red
8. Clicking empty background changes nothing
9. Raycaster with NDC from canvas bounding rect, use intersection.instanceId
10. Flag instance colors for upload after changing
11. Expose InstancedMesh as (window as any).__mesh = mesh
12. Standard boilerplate: WebGLRenderer, resize handler, __scene, __camera, __renderer, __ready

Let me calculate the camera position:
- Grid: 30x30, spacing 1.0, so extent is 29 units in each direction (from -14.5 to 14.5)
- Box size 0.8, so visible extent is about -14.9 to 14.9 (with half box = 0.4)
- Total visible extent: ~29.8 units wide and tall
- With margin, let's say we need about 32 units visible
- Camera looking down Z axis at origin, grid in XY plane
- With perspective camera, need to figure out distance for FOV to see ~32 units
- FOV 45 degrees: tan(22.5°) * distance = half_height
- half_height = 16, so distance = 16 / tan(22.5°) = 16 / 0.4142 ≈ 38.6
- Let's use distance ~45 for comfortable margin, or compute properly.

Actually let me use FOV 50 degrees:
- tan(25°) ≈ 0.4663
- distance = 16 / 0.4663 ≈ 34.3
- With margin, ~40 should work fine.

Let me use FOV 45 and distance 45:
- visible half-height at z=0: tan(22.5°) * 45 = 0.4142 * 45 = 18.64
- Grid half-extent: 14.5 + 0.4 = 14.9
- Margin: (18.64 - 14.9) / 14.9 ≈ 25% margin. Good.

For the grid centered on origin with 30x30:
- Positions: for i in 0..29, j in 0..29
- x = (j - 14.5) * 1.0
- y = (i - 14.5) * 1.0
- z = 0

Box geometry: BoxGeometry(0.8, 0.8, 0.8)

For raycasting with InstancedMesh:
- Set up raycaster
- On click, compute NDC from canvas bounding rect
- Raycast against the InstancedMesh
- Use intersection.instanceId to get which instance was hit
- Toggle color

For color toggling:
- Store a boolean array or just read current color and toggle
- Use setColorAt(instanceId, color) and then mesh.instanceColor.needsUpdate = true

Let me write the code now.
