The user wants a single TypeScript file that:
1. Creates a 30x30 grid of boxes (900 instances) using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking at the grid, whole grid visible with margin
4. MeshBasicMaterial (white) with instance colors starting at 0x808080
5. Click toggles instance color between gray (0x808080) and red (0xff0000)
6. Uses Raycaster with NDC from canvas bounding rect, intersection.instanceId
7. Flags instance colors for upload after changing
8. Exposes mesh as window.__mesh
9. No animation, no camera movement
10. No other meshes
11. setAnimationLoop for render loop
12. Handle resize
13. Set __ready after first frame

Let me calculate the grid dimensions:
- 30x30 grid, spacing 1.0, centered on origin
- Positions range from -14.5 to 14.5 in both X and Y (since 29 * 1.0 / 2 = 14.5)
- Total width/height ≈ 29.0 units
- Need camera far enough to see all with margin

Camera setup:
- Perspective camera looking down -Z at the grid in XY plane
- Need FOV and distance such that 29 units fit with margin
- tan(fov/2) * distance >= 29/2 * some margin factor
- Let's use fov=50, then tan(25°) ≈ 0.466
- distance * 0.466 >= 14.5 * 1.2 (margin) = 17.4
- distance >= 17.4 / 0.466 ≈ 37.3
- Let's use distance = 40, fov = 50

Box geometry: BoxGeometry(0.8, 0.8, 0.8) - since grid is in XY plane, depth doesn't matter much visually but 0.8 is fine.

For the click handling:
- Use 'click' event on renderer.domElement
- Convert to NDC using canvas bounding rect
- Raycast against the InstancedMesh
- If intersection exists and instanceId is defined, toggle color

For color toggling:
- Keep track of which instances are red vs gray
- Use setColorAt with a THREE.Color

Let me write the code now.

Important strict TypeScript considerations:
- intersection.instanceId can be undefined, need to check
- Need to use `!` or proper checks

Let me write this carefully.
