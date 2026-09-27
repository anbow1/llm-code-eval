The user wants a procedural terrain built from a hand-made BufferGeometry in TypeScript. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. Call computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
6. AmbientLight + DirectionalLight
7. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as (window as any).__controls = controls
8. Camera above terrain at an angle, whole terrain visible

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- X and Z range from -10 to 10 (20 units total)
- Step size: 20 / 127 ≈ 0.15748...

For the height function, I'll use 3 sine/cosine layers:
- Layer 1: sin(x * 0.5) * cos(z * 0.5) * 1.0
- Layer 2: sin(x * 1.2 + 0.5) * cos(z * 0.8 + 0.3) * 0.7
- Layer 3: sin(x * 2.5 + 1.0) * cos(z * 2.0 + 0.7) * 0.3

Total amplitude roughly 2.0 (1.0 + 0.7 + 0.3 = 2.0)

For the index buffer:
- Vertices are indexed as: vertex index = row * 128 + col
- For cell (row, col), the four vertices are:
  - a = row * 128 + col
  - b = a + 1 (right)
  - c = a + 128 (below)
  - d = c + 1 (below-right)

For faces pointing UP (+Y), using right-hand rule:
- Looking from above, we want counter-clockwise winding
- For a cell with corners:
  - top-left (a), top-right (b)
  - bottom-left (c), bottom-right (d)

Wait, let me think about this more carefully. The XZ plane:
- X goes right, Z goes... in Three.js, +Z is toward the viewer (out of screen), -Z is away.

Actually, let me think about the grid layout:
- Row 0 is at z = -10 (far), row 127 is at z = 10 (near)
- Col 0 is at x = -10 (left), col 127 is at x = 10 (right)

For a cell at (row, col):
- a = row * 128 + col → (x[col], z[row])
- b = a + 1 → (x[col+1], z[row])
- c = a + 128 → (x[col], z[row+1])
- d = c + 1 → (x[col+1], z[row+1])

For upward-facing normals (using right-hand rule, cross product of edge vectors should point +Y):

Triangle 1: a, c, b
- Edge 1: c - a = (0, 0, dz) (going in +Z direction)
- Edge 2: b - a = (dx, 0, 0) (going in +X direction)
- Cross product: (0,0,dz) × (dx,0,0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → +Y ✓

Triangle 2: b, c, d
- Edge 1: c - b = (-dx, 0, dz)
- Edge 2: d - b = (0, 0, dz)
- Cross product: (-dx,0,dz) × (0,0,dz) = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0) → +Y ✓

So the indices for each cell are: a, c, b, b, c, d

Let me verify: for triangle (a, c, b):
- v0 = a, v1 = c, v2 = b
- e1 = c - a, e2 = b - a
- normal = e1 × e2

If a is at (x, y, z), c is at (x, y, z+dz), b is at (x+dx, y, z):
- e1 = (0, 0, dz)
- e2 = (dx, 0, 0)
- e1 × e2 = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → +Y ✓

For triangle (b, c, d):
- v0 = b, v1 = c, v2 = d
- e1 = c - b, e2 = d - b
- b is at (x+dx, y, z), c is at (x, y, z+dz), d is at (x+dx, y, z+dz)
- e1 = (-dx, 0, dz)
- e2 = (0, 0, dz)
- e1 × e2 = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0) → +Y ✓

Great, so indices per cell: [a, c, b, b, c, d]

Now for vertex colors by height:
- Green (low): roughly (0.2, 0.6, 0.2)
- Brown (middle): roughly (0.5, 0.35, 0.2)
- White (high): (1, 1, 1)

I'll interpolate based on normalized height. The height range is roughly -2 to +2, so I'll normalize to 0-1.

Let me write the complete file now.

For the camera: terrain is 20x20 units, height about ±2. Camera should be above at an angle. Let's put it at (0, 15, 20) looking at origin. That should give a nice angled view with the whole terrain visible.

Let me make sure I handle:
- Renderer creation and appending to document.body
- Window resize handling
- setAnimationLoop
- Delta time for motion (OrbitControls damping uses its own update, but I should still track delta)
- Expose __scene, __camera, __renderer, __controls, __ready

Actually, the requirement says "Motion must use delta/elapsed time, not frame counts." Since we're using OrbitControls with damping, the controls.update() handles its own timing internally. But I should still get delta from the clock for any other motion. Since there's no explicit animation beyond the controls, I'll just use the clock to get delta and pass it to controls.update() if needed. Actually, OrbitControls.update() doesn't take a delta parameter - it uses its own internal clock. So I'll just call controls.update() each frame.

Let me also make sure the code compiles with tsc --strict. I need to be careful with types.

Let me write it out:
