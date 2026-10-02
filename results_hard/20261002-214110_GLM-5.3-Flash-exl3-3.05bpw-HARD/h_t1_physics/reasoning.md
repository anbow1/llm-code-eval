Simple implementation. Balls array of plain objects, physics step with wall + pair collisions, substeps. Position sync to meshes. Ready flag after first frame via a flag set in first animation loop callback (renderer.setAnimationLoop callback runs each frame; set __ready after first render).

Write code.