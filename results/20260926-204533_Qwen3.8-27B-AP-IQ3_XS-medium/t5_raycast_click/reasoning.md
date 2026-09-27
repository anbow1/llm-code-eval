Let me plan this carefully:

1. Create a 5x5 grid of cubes in the XY plane, facing the camera
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Click handling with Raycaster using NDC from canvas bounding rect
4. Selection logic: click cube → select (turn red), click another → deselect previous, select new, click background → deselect all
5. PerspectiveCamera looking straight at the grid
6. AmbientLight + DirectionalLight
7. No animation of cubes
8. Window resize handling
9. Expose __scene, __camera, __renderer, __ready

Let me think about the grid layout:
- 5x5 grid, cubes in XY plane facing camera (z-axis toward camera)
- Cube size: let's say 1.0
- Gap between cubes: let's say 0.5
- So spacing = cubeSize + gap = 1.5
- Grid positions: from -2 to 2 (indices), so positions: -3, -1.5, 0, 1.5, 3 in both X and Y

Camera: looking at origin from positive Z. Grid spans from -3 to 3 in both X and Y (with cube half-size of 0.5, so actual extent is -3.5 to 3.5). Let's put camera at z = 10 or so to see the whole grid with margin.

Let me calculate: grid extent is ±3.5 in X and Y. With some margin, let's say we want to see ±5. Camera at z = 10, with a fov that covers that. Actually let me just use a reasonable fov like 45 degrees and camera at z = 12.

For the Raycaster NDC computation from canvas bounding rect:
- Get canvas.getBoundingClientRect()
- ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
- ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1

Let me write the complete file now.

For the __ready flag: I need to set it after the first frame is rendered. I'll use a flag and check in the animation loop.

Let me make sure:
- No other meshes
- 25 separate Mesh objects
- Each with its OWN MeshStandardMaterial
- AmbientLight + DirectionalLight
- PerspectiveCamera, no movement
- No animation of cubes
- renderer.setAnimationLoop for render loop

Let me code this up.
