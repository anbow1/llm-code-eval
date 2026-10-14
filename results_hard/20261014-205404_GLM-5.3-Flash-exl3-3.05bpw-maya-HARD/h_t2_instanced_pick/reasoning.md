Need to write TypeScript file. Use InstancedMesh with raycast. Grid in XY plane, camera looking at it (z axis). 30x30, spacing 1, centered: positions from -14.5 to 14.5. Box size 0.8. Camera at z such that whole grid visible with margin: grid half-extent ~15. FOV 50, distance d: half-height visible = d*tan(fov/2). Need >= 15.5 margin. tan(25°)=0.4663. d = 15.5/0.4663 ≈ 33.2. Also horizontal aspect fine. Use d=36.

Set mesh.instanceColor needsUpdate after toggle. Colors: use setColorAt for all initially, then instanceColor.needsUpdate = true.

Toggle logic: store state array; or read current color. Reading from instanceColor buffer works: if r > 0.5 then set gray else red. Simpler to keep boolean array.

Pointer events on renderer.domElement. Compute NDC from bounding rect.

__ready after first frame: use a flag, set in animation loop first iteration.