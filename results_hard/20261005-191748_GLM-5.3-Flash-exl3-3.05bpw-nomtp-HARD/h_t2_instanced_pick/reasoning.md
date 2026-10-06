Write the file. Grid 30x30, boxes size 0.8, spacing 1.0, XY plane, centered. Camera at z distance to see 30 units wide + margin. Camera fov 50, distance: grid extent ~15 from center. Fit vertical: half-height 15 → distance = 15 / tan(fov/2) plus margin. Use fov 45: tan(22.5°)=0.4142 → dist = 16/0.4142 ≈ 38.6, use 42.

Toggle state via array of booleans or check current color. Use instanceColor to read. Keep colors array. Need mesh.instanceColor flagged: instanceColor.needsUpdate = true.

Raycast: raycaster.setFromCamera(pointer, camera); intersectObject(mesh) returns instanceId.

Set matrix per instance with position offset. Compute positions: (i - 14.5) * 1.0.

After first render: set flag in animation loop using a variable; renderer.setAnimationLoop callback — after render, set __ready = true.