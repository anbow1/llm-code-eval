 straightforward. Grid 30x30, centered: x = (i - 14.5), y = (j - 14.5). Camera at z such that whole grid visible with margin. Grid width ~30, height 30. Use fov 50, distance = 15 / tan(fov/2) plus margin. Compute: half-height 15, margin ~ 2 → visible half height ~17. distance = 17 / tan(25°) ≈ 36.4. Set camera z = 40, fov 50. Half visible height at z=40: 40*tan(25°)=18.65 → good.

Raycast: raycaster.setFromCamera(ndc, camera); intersectObject(mesh). instanceColor needsUpdate.

Colors stored in array or just read instanceColor. Toggle by checking current color.