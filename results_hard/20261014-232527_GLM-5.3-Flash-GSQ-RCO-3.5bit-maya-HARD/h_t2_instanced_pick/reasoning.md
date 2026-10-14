 straightforward. Grid 30x30, spacing 1.0, so width 29 → extent from -14.5 to 14.5. Camera at z distance to fit: fov 50, grid half-size 14.5 plus margin. Use vertical fov: need half height 14.5+margin. distance = (halfSize) / tan(fov/2). Use fov 50, margin factor: half = 15.5 → distance = 15.5/tan(25°) ≈ 33.2. Set camera at (0,0,34).

Raycaster against InstancedMesh gives instanceId. Colors state array of booleans. Use mesh.setColorAt then instanceColor.needsUpdate = true.

MeshBasicMaterial white color. Initial setColorAt all 0x808080 in loop.

Handle click on window or renderer.domElement. Compute NDC from canvas bounding rect.