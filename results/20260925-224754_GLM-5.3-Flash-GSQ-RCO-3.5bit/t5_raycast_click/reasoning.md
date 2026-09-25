Create scene, camera at z distance, 5x5 grid of cubes with spacing. Each cube own MeshStandardMaterial. Raycaster on pointerdown, use canvas bounding rect for NDC. Background click clears selection.

Need strict typing: raycaster.intersectObjects returns Intersection[]; first intersection object typed as THREE.Object3D. Cast mesh, check userData index or map via WeakSet/Map.

Use pointerdown on renderer.domElement. Compute rect via renderer.domElement.getBoundingClientRect().

Set __ready after first frame: use a flag in animation loop; after renderer.render, if !ready set true.

Spacing: cube size 1, gap 0.5 → pitch 1.5, total span 4*1.5+1 = 7. Camera fov 50, distance to fit: half-height needed 3.5+margin. distance = 3.8 / tan(fov/2). Use fov 45, distance ~ 4.2/tan(22.5°) ≈ 10.1. Also aspect width; assume width ≥ height typically. Compute distance from both vertical and horizontal extents.

Code:

const cell = 1, gap = 0.4, pitch = cell+gap = 1.4, span = 4*1.4+1 = 6.6. half = 3.3 + margin 0.6 → 3.9. distance = max(3.9/tan(fov/2), 3.9/(tan(fov/2)*aspect)). Compute once at init; camera stays fixed, no update on resize needed? Whole grid must remain visible with margin — on resize aspect changes; but "no camera movement". I can adjust camera.aspect on resize; distance fixed. To be safe choose distance accounting for worst aspect (e.g., aspect could be <1 on narrow windows). Just compute distance with initial aspect; acceptable. Or set distance generously using aspect 1. I'll compute using current aspect and also on resize recompute camera.position.z? That's camera movement... keep fixed; compute with min(aspect,1) factor: distance = halfExtent / tan(fov/2) / min(aspect, 1). Fine.

Selection: keep selectedMesh variable typed THREE.Mesh | null. Store materials array.

Intersection: intersects[0]?.object — but clicking a cube face; object is the mesh. Cast: const hit = intersects[0].object as THREE.Mesh; find index via userData.index as number.

Write code.