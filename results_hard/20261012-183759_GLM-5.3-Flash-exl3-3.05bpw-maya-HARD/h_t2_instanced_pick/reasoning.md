Need to write TypeScript file. Use InstancedMesh with raycast. Grid in XY plane, camera looking at it (z axis). Box size 0.8, spacing 1.0, centered. Camera z distance such that grid fits: grid spans 29 spacing = 29 units wide. Camera fov 50, distance to fit height 29: half-height 14.5, distance = 14.5 / tan(25°) ≈ 14.5/0.4663 ≈ 31.1. Use margin: 34.

Raycasting InstancedMesh with MeshBasicMaterial works. Colors: set state array boolean for red.

instanceColor needsUpdate after change: mesh.instanceColor!.needsUpdate = true.

Note: instanceColor must exist before raycast? No, only needed for setColorAt; setColorAt creates it. Need material color white.

Write code carefully with strict typing.