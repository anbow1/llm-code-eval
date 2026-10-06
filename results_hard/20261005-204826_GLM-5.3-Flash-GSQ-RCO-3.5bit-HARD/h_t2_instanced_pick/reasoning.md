Grid 30x30, spacing 1.0, centered → positions from -14.5 to 14.5 in x and y. Camera at z distance so whole grid visible with margin. Grid width ~30. FOV say 50°, camera z: half-height 15, vertical fov 50 → z = 15/tan(25°) ≈ 15/0.4663 ≈ 32.2. Add margin, use z=36.

Boxes 0.8, spacing 1.0 → gaps visible. Use BoxGeometry(0.8,0.8,0.8).

Click handling: pointerdown or click on canvas, compute NDC from rect, raycast with mesh, instanceId.

instanceColor needsUpdate after change.