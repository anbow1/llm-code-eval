 straightforward. Grid 30x30, spacing 1, centered: positions (i - 14.5, j - 14.5). Camera at z such that whole grid visible with margin. Grid size 30. Perspective camera fov 50, distance: height 30 visible → z = 15 / tan(25°) ≈ 32.2, plus margin. Use fov 50, z = 40.

Raycaster with instanced mesh: raycaster.intersectObject(mesh) returns intersection with instanceId.

Need matrix update — set instanceMatrix once. No animation. But use setAnimationLoop anyway (rules say use setAnimationLoop for render loop). Render loop with delta unused? We can still use clock elapsed but no motion. Just render.

First frame ready flag: set in loop after render.

Click handling on renderer.domElement, compute NDC from rect.