Standard implementation. Grid 30x30 in XY plane, centered: offset -(29)/2 * 1.0. Camera at z distance to fit. Grid width ~29 units. With fov 50, distance = 29/(2*tan(25°)) ≈ 31. Use 40 to be safe with margin.

Raycast against InstancedMesh works with MeshBasicMaterial. Toggle colors, instanceColor.needsUpdate = true.