Straightforward. 30x30 grid, XY plane, camera at z distance to fit grid of size ~30 (width 29 + 0.8 = ~29.8). Camera FOV 50, need distance so vertical extent ~30 fits: half-height 15, tan(fov/2)*d >= 15.5 → d ≈ 33 for fov 50. Use fov 50, d = 34.

Boxes centered: position x = (i - 14.5) * 1, y = (j - 14.5) * 1.

Matrix: setMatrixAt with makeTranslation.

Raycaster against single mesh, intersect.instanceId.

Also need mesh.instanceColor after setColorAt — after setColorAt, instanceColor exists. Set needsUpdate after change.

Compile strict: fine.