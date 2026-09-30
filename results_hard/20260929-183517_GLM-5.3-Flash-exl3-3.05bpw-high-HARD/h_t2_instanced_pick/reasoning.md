Write a single TS file. Grid 30x30, spacing 1, size 0.8, centered. Camera z distance to fit ~30 units with margin. Use raycaster with pointer events, raycast InstancedMesh; need geometry bboxes. Toggle colors. Also need mesh.instanceMatrix for raycasting? Raycasting InstancedMesh uses matrixWorld and instanceMatrix. Need boundingSphere computed — computeBoundingSphere on geometry, raycaster handles instanced.

Also ensure raycast works: three's InstancedMesh raycast works with MeshBasicMaterial fine.

Note: after setColorAt initially, set instanceColor.needsUpdate = true; also colors init — before first setColorAt, instanceColor is null; setting first time creates it.

Canvas rect: renderer.domElement.getBoundingClientRect().

__ready after first frame rendered: in render callback, set a flag after first render.