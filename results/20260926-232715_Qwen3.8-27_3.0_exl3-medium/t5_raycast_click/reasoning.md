The user wants a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera, with visible gaps between them. Let me plan this out:

1. 5x5 grid of cubes - 25 separate Mesh objects
2. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one at a time
4. Clicking empty background clears selection
5. Use THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at the grid, whole grid visible with margin
7. No camera movement, no animation of cubes
8. AmbientLight + DirectionalLight
9. No other meshes

Let me think about the layout:
- 5x5 grid in XY plane
- Cubes facing the camera (so they face the Z axis, camera looks down -Z)
- Visible gaps between them

Let me use cube size of 1, gap of 0.5, so spacing is 1.5.
Grid positions: for i in 0..4, j in 0..4:
  x = (i - 2) * 1.5
  y = (j - 2) * 1.5
  z = 0

Total grid size: 4 * 1.5 + 1 = 7 units wide/tall

Camera: looking straight at the grid from positive Z.
- Grid spans from -3 to +3 in X and Y (roughly)
- Need margin, so camera should be at z that gives enough FOV

With FOV 60 degrees, to see 7 units wide with margin (say 10 units total visible), we need:
- tan(30°) = 5 / z => z = 5 / tan(30°) = 5 / 0.577 ≈ 8.66

Let me use z = 10 for comfortable margin. Camera at (0, 0, 10), looking at (0, 0, 0).

For the raycaster:
- Get canvas bounding rect
- Compute NDC: x = ((event.clientX - rect.left) / rect.width) * 2 - 1
- y = -((event.clientY - rect.top) / rect.height) * 2 + 1

Let me write the complete TypeScript file.

I need to make sure:
- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight
- Handle resize
- Use setAnimationLoop
- Expose __scene, __camera, __renderer
- Set __ready = true after first frame
- No external assets
- Compiles with tsc --strict

Let me write this carefully for strict mode - no implicit any, all types explicit.
