 straightforward. Grid 30x30, spacing 1.0, box 0.8. Camera z distance to fit ~30 units with margin. FOV 50, need vertical fit: grid height 29+0.8 ≈ 29.8... spacing 1.0, positions from -14.5 to 14.5. Extent ±14.9. Vertical half = 14.9. fov 50 → distance = 14.9 / tan(25°) ≈ 14.9/0.4663 ≈ 31.9. Use distance like 34. Aspect wider than 1 usually so vertical is limiting. Set camera at z=34, fov 50.

Raycast: raycaster.setFromCamera(ndc, camera); intersectObject(mesh). instanceId toggle.

Write code.