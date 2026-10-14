Simple. 5x5 grid of cubes, spacing with gaps, raycaster on pointerdown. Compute NDC from canvas bounding rect. Set __ready after first render.

Grid: cube size 1, gap 0.3, spacing 1.3. Center at origin, camera at z distance to fit. Grid width = 5*1.3 - 0.3 = 6.2, half 3.1. Camera fov 50, distance: half extent / tan(fov/2) with margin. Use distance ~7-8. Compute: tan(25°)=0.466, need visible half-width 3.1*margin at distance d = 3.5/0.466 ≈ 7.5. Use z = 8.

Use pointerdown or click event on renderer.domElement.