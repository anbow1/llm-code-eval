5x5 grid of cubes, raycaster click, single file. Use raycaster.intersectObjects(meshes). Click on background clears selection. Use canvas bounding rect for NDC.

Spacing: cube size 1, gap 0.5, pitch 1.5, total span 5*1.5 = 7.5 minus gap... positions centered. Camera z distance to fit: fov 50, height 7.5 + margin. distance = (span/2)/tan(fov/2) plus some margin.

First frame __ready: set in animation loop after first render.