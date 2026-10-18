Need raycasting on InstancedMesh with instanceId. Set mesh.instanceMatrix needsUpdate. Set frustumCulled false or compute bounding sphere — raycaster uses boundingSphere of geometry? For InstancedMesh, raycast iterates instances. Fine.

Camera: grid spans 30 units (spacing 1, centered). Perspective camera at z distance to fit with margin. FOV 50, distance ~35. Grid width 30, height 30. Camera at (0,0,35): vertical visible height at z=0: 2*35*tan(25°)=32.6 > 30+margin. Good.

Click vs drag: simple click listener. Use pointerdown/pointerup check small movement? Simple 'click' is fine.

Raycaster: instanceId intersection. Toggle color array. Colors stored: keep boolean array or read from instanceColor. Read color: mesh.getColorAt(id, tmpColor) and check red vs gray.

Write code.