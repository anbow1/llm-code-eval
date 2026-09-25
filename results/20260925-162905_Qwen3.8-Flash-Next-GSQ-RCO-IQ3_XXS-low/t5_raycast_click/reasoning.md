The user wants a 5x5 grid of cubes in the XY plane, facing the camera, with gaps between them. Let me plan this out:

1. Scene setup with PerspectiveCamera looking straight at the grid
2. 25 cubes arranged in a 5x5 grid in the XY plane (z=0)
3. Each cube has its own MeshStandardMaterial with color 0x4488ff
4. Raycaster for click detection
5. Selection logic: click a cube -> red, previously selected goes back to blue
6. Click empty background -> all cubes return to blue
7. AmbientLight + DirectionalLight
8. Proper resize handling
9. setAnimationLoop for render loop
10. Expose scene, camera, renderer on window
11. Set __ready after first frame

Let me think about the camera position. The grid is 5x5 cubes. If each cube is 1x1x1 and there are gaps of say 0.5, then the total grid width would be 5*1 + 4*0.5 = 7 units wide. I need the camera to be positioned so the whole grid is visible with margin.

Camera position: z = 10 or so, looking at origin. FOV 50 degrees. Let me calculate: at z=10, with FOV=50, the visible height is 2*10*tan(25°) ≈ 9.3 units. The grid is about 7 units tall, so that fits with margin.

Let me think about the raycaster click handling. I need to:
- Get mouse position relative to the canvas
- Convert to NDC (-1 to 1)
- Use raycaster to intersect with the cube meshes
- If hit, select that cube (set color to red, reset previous)
- If no hit, clear selection (all back to blue)

For the click event, I'll use 'click' on the renderer's canvas.

Let me write the complete TypeScript file now.
