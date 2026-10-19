Standard instanced mesh picking. Write the file.

Grid: 30x30, spacing 1, centered → offsets -14.5 to 14.5. Camera at z such that whole grid visible: grid half-height 14.5+0.5=15. FOV 50, distance = 15/tan(25°) ≈ 32.2, add margin → z=40.

Raycaster with Mesh (InstancedMesh works). Need mesh.computeBoundingSphere? Raycaster against InstancedMesh iterates all instances regardless. Set instanceMatrix.needsUpdate once. After setColorAt initially, set instanceColor.needsUpdate = true (instanceColor exists after first setColorAt).