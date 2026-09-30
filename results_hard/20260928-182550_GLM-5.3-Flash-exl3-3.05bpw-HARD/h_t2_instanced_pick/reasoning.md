Camera at z distance to fit 30 units wide grid. Box size 0.8, spacing 1 → grid spans 29 + margins... centers from -14.5 to 14.5, so extent 29.5 with boxes. Fit with margin: grid half-width ~15. Vertical FOV 50, aspect ~1.7. Distance for width 30: halfWidth 15 / tan(fovV/2) ... compute: needed distance = max based on aspect. Use distance = 15 / tan(fov/2) considering horizontal. Simpler: fov=50, distance ~32. Let's compute: tan(25°)=0.4663. Half-height visible at d: d*0.4663. Half-width: that * aspect. Need half-width ≥15 → d ≥ 15/(0.4663*aspect). Aspect 16/9=1.778 → d ≥ 17.8. Also half-height ≥15 → d ≥ 32.2. Hmm vertical may be the constraint on narrow windows. To always fit regardless of aspect, compute distance on resize? "No camera movement" — but resize handling is required. I can compute camera position in onResize so grid always fits; that's adjusting for resize, allowed. Set camera.position.z based on aspect each resize. That's fine.

Grid: positions i,j from 0..29, x = (i - 14.5), y = (j - 14.5).

Set instanceMatrix, colors. Toggle via state array. Mark instanceColor.needsUpdate.

Raycast with pointer events on window or canvas. Since mesh is only mesh, if intersection exists toggle instanceId; else nothing.

Mesh count 900. Frustum culling: instanced mesh bounding sphere — compute boundingSphere or set frustumCulled=false. Use mesh.computeBoundingSphere? Three has instanceMesh.computeBoundingSphere in recent versions. Safer: mesh.frustumCulled = false? That's fine but raycast works regardless. Actually keep frustumCulled = false to avoid disappearing.

Ready flag: set after first render — in animation loop counter or set in a first-render callback. Use renderer.render then set flag; but with setAnimationLoop, do render manually in loop, increment frames, set __ready after first.