Single TypeScript file. Use InstancedMesh 100x100, dummy Object3D, color gradient via setColorAt, per-frame update Y via setMatrixAt. Need instanceColor.needsUpdate? Only set colors once initially — but InstancedMesh needs instanceColor created by setColorAt; set once before loop. Also need mesh.instanceColor.needsUpdate = true after initial set.

Colors: gradient by grid position — set once in init.

Wave: distance from center, k, speed, amplitude. Reuse dummy object.

Camera at angle: e.g. position (60, 60, 60) looking at origin, grid spread over 100 units? Small cubes spaced 1 unit apart → grid 100x100 units. Camera at (70, 50, 70) maybe. Use ortho? Perspective fine.

Compile with strict: all vars typed, handle null checks.