Camera position: grid 30x30 spans 30 units (from -14.5 to +14.5... actually centers at -14.5..14.5, extent ±14.9 with box size 0.8). Need whole grid visible with margin. Use FOV 50, distance such that height ~ 32 fits vertically. Vertical half-extent = 30/2 + margin ~ 16. tan(fov/2)*d = 16 → fov 50: tan(25°)=0.4663, d ≈ 34.3. But also aspect matters; use distance 40 to be safe. Place camera at (0,0,40) looking at origin.

Note: window resize could make grid clipped vertically if aspect < ~1? Requirement says perspective camera; just choose distance so grid fits for typical aspect. Maybe compute distance based on aspect? Keep simple: distance 44 ensures vertical fit for aspect ≥ ~0.85... Actually vertical fit only depends on fov: d = 16/tan(25°) ≈ 34.3. Use 36. Horizontal fit needs aspect ≥ 30/29.1... fine. Use fov 50, distance 40.

Raycaster with InstancedMesh: mesh.raycast works. Need mesh.computeBoundingSphere? InstancedMesh boundingSphere computed lazily. Fine.

instanceColor needsUpdate: (mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true.

Colors stored in array; initial setColorAt gray for all.