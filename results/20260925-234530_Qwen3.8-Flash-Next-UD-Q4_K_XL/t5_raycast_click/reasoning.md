The user wants a single TypeScript file that creates a 5x5 grid of cubes in the XY plane with specific interaction behaviors. Let me plan this out:

1. Import Three.js
2. Set up scene, camera, renderer
3. Create 25 MeshStandardMaterial instances (each cube gets its own)
4. Arrange in a 5x5 grid in XY plane with gaps
5. Set up lights (AmbientLight + DirectionalLight)
6. Handle click events with Raycaster
7. Selection logic: clicking a cube selects it (red), clicking another deselects previous and selects new, clicking background clears all
8. Handle resize
9. Use setAnimationLoop
10. Expose globals for testing

Let me think about the grid spacing. If each cube is size 1, I'll use spacing of 1.5 (gap of 0.5). The grid goes from -3 to +3 in both X and Y (5 positions: -3, -1.5, 0, 1.5, 3 with spacing 1.5).

Actually let me use spacing of 1.5: positions at -3, -1.5, 0, 1.5, 3. That gives a total extent of 6 units plus cube size 1, so roughly -3.5 to 3.5. Camera at z=10 with fov 50 should see it fine.

For the click handling, I need to use pointerdown or click event. I'll compute NDC from the canvas bounding rect as specified.

Let me make sure each cube has its OWN MeshStandardMaterial instance - not shared.

For "facing the camera" - since the camera looks at the grid from +Z, the cubes in XY plane with no rotation face the camera naturally.

Let me write the code now.
