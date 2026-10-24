 straightforward. Grid 30x30, spacing 1.0, so span 29 + 0.8 → camera distance to fit. Camera at z, looking at origin. FOV 50, aspect from window. Need whole grid visible with margin regardless of aspect. Compute distance based on vertical fov and horizontal fov.

Grid size ~29.8 wide. Vertical: need distance such that height fits: d = (halfHeight) / tan(fov/2). Horizontal: halfWidth / (tan(fov/2)*aspect). Use max. Add margin factor.

Raycasting InstancedMesh works with basic material. instanceId from intersection.

instanceColor.needsUpdate = true after setColorAt.

Use mesh.instanceColor! after setColorAt; with strict TS, setColorAt exists; instanceColor may be null typed. Use mesh.instanceColor!.needsUpdate = true? Actually setColorAt creates instanceColor. TS types: instanceColor: InstancedBufferAttribute | null. Use non-null assertion.

Raycaster intersects: raycaster.intersectObject(mesh) returns intersections with instanceId?: number (optional). Check undefined.

Write code.