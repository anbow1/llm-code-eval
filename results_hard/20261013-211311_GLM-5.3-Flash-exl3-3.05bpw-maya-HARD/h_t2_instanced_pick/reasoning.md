Need to write TypeScript file. Use raycaster with instanceId. MeshBasicMaterial white, vertexColors? For InstancedMesh with setColorAt, material needs to support instance colors — Three.js automatically uses instanceColor if set; with MeshBasicMaterial it works (defines USE_INSTANCING_COLOR). No need vertexColors flag.

Grid 30x30, spacing 1, box size 0.8. Centered: positions from -14.5 to 14.5. Camera at z looking at origin. Whole grid visible with margin: grid half-extent 15 (14.5 + 0.4 = 14.9). PerspectiveCamera with FOV, distance so that height 30 visible. FOV 50, distance = 15/tan(25°) ≈ 32.2, add margin → distance 40. But width: aspect must show width 30 too. distance 40 with aspect ≥1 fine; if narrow window (portrait), width constraint: horizontal FOV smaller. Use distance based on both: required distance = max( (15)/tan(vFov/2), (15)/(tan(vFov/2)*aspect) ). Compute on resize? Camera position could be static but then narrow windows cut off grid. Better to update camera distance on resize to keep grid visible. Spec says "no camera movement" but resize handling is allowed. I'll compute distance in a function called on resize.

Raycasting InstancedMesh with MeshBasicMaterial works.

instanceColor needsUpdate flag.

Write code.