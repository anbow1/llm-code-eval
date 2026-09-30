Raycasting InstancedMesh with MeshBasicMaterial: intersection.instanceId works. Need raycast tolerance — boxes 0.8 size, gaps fine.

Grid: 30x30, spacing 1, centered: positions from -14.5 to 14.5. Camera at distance so whole grid visible. Grid height 29 units (from -14.5 to 14.5) plus box size. Use fov 50, distance ~ 32 to fit height ~30. Half-height 15 => distance = 15 / tan(25°) ≈ 15/0.4663 ≈ 32.2. Use 36 for margin.

Camera looks straight at grid: position (0,0,36), rotation 0, looking at origin along -Z. Grid in XY plane.

Store colors in array of booleans. instanceColor needs update: mesh.instanceColor.needsUpdate = true. Note setColorAt creates instanceColor first time; must call setColorAt before first render for it to exist. TypeScript: mesh.instanceColor may be null — use non-null assertion or set material? With tsc strict, instanceColor is InstancedBufferAttribute | null. Use if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true.

Ready flag after first frame render: use a flag in the loop, set after renderer.render.