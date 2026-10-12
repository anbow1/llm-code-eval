Basic setup. Grid 5x5, spacing with gaps. Cube size 1, spacing 1.5 → span 4*1.5+1 = 7 wide. Camera at z distance to fit with margin. PerspectiveCamera fov 50, z = 10 maybe. Grid centered at origin in XY plane, cubes facing camera (default orientation fine).

Raycaster on pointerdown/click. Use canvas bounding rect for NDC. Clicking background clears selection.

Use renderer.domElement for rect. setAnimationLoop; set __ready after first frame (use a flag in loop).