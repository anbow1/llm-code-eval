Need to write TypeScript file. 30x30 grid of boxes, InstancedMesh, MeshBasicMaterial white, setColorAt gray. Raycast on click, toggle color. instanceColor needsUpdate.

Camera: grid in XY plane, boxes size 0.8, spacing 1.0, centered. Grid spans 29 units across (from -14.5 to 14.5). Camera z distance to fit with margin: fov 50, height needed ~32 → distance = 16 / tan(25°) ≈ 16/0.4663 ≈ 34.3. Add aspect consideration. Use fov 50, z=36. Or compute dynamically on resize? Simplest: compute camera.position.z based on viewport so whole grid visible with margin, update on resize.

Fit: grid half-size 14.5 + margin 2 = 16.5. distance = 16.5 / tan(fov/2 * π/180), also consider aspect: halfWidth = 16.5; if aspect < 1 need distance for width: halfWidth / (tan*aspect). Take max.

Click handling: pointerdown or click on renderer.domElement. Compute NDC from bounding rect. Raycaster.intersectObject(mesh) — only mesh in scene. Toggle via instanceId.

Colors stored via setColorAt; need mesh.instanceColor.needsUpdate = true after change. After initial setColorAt loop, also set needsUpdate.

MeshBasicMaterial color white (default). Set material.color to white explicitly.

instanceColor may be typed as InstanceColor | null in three types; use non-null assertion after setColorAt.

Write code.