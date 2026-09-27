The user wants a procedural terrain built from a hand-made BufferGeometry. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
3. Index buffer with two triangles per grid cell, winding for +Y faces
4. computeVertexNormals()
5. Vertex colors: green (low), brown (middle), white (high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping, updated every frame, exposed
9. Camera above terrain at an angle, whole terrain visible

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- Each cell has 2 triangles = 127*127*2 = 32258 triangles
- Index buffer size: 32258 * 3 = 96774 indices

For winding (faces pointing +Y):
- Looking from above (+Y), counterclockwise winding
- For a cell with vertices (row, col), (row, col+1), (row+1, col), (row+1, col+1):
  - Triangle 1: (row, col), (row+1, col), (row+1, col+1) - let me think more carefully

Actually, let me think about this. If we're looking from above (down the -Y axis), and vertices are arranged in a grid:

For cell (i, j) where i is row (z-direction) and j is column (x-direction):
- Bottom-left: (i, j)
- Bottom-right: (i, j+1)
- Top-left: (i+1, j)
- Top-right: (i+1, j+1)

For faces pointing +Y (up), we need counterclockwise winding when viewed from above.

When looking down from +Y:
- X increases to the right
- Z increases downward (in screen space when looking down)

So counterclockwise from above means:
- Triangle 1: (i, j) -> (i+1, j) -> (i+1, j+1)
- Triangle 2: (i, j) -> (i+1, j+1) -> (i, j+1)

Wait, let me reconsider. In Three.js, the default is right-hand rule. For a face to point in +Y direction, when looking from +Y towards origin (looking down), the vertices should appear counterclockwise.

Looking from above (camera at +Y looking down at origin):
- X axis goes right
- Z axis goes "down" on screen (towards viewer in default orientation, but when looking down, it goes away from us... actually in standard orientation, when looking down -Y, X goes right and Z goes up on screen)

Hmm, let me just think about it differently. The normal of a triangle with vertices A, B, C is (B-A) × (C-A).

For +Y normal, I need (B-A) × (C-A) to point in +Y direction.

Let's say our grid has:
- x increasing with column index j
- z increasing with row index i

So vertex at (i, j) has position (x_j, y, z_i) where x_j and z_i increase.

For cell (i, j):
- v0 = (i, j) -> position (x_j, h, z_i)
- v1 = (i, j+1) -> position (x_{j+1}, h, z_i)
- v2 = (i+1, j) -> position (x_j, h, z_{i+1})
- v3 = (i+1, j+1) -> position (x_{j+1}, h, z_{i+1})

For triangle (v0, v1, v2):
- edge1 = v1 - v0 = (+dx, 0, 0) (approximately)
- edge2 = v2 - v0 = (0, 0, +dz)
- normal = edge1 × edge2 = (dx, 0, 0) × (0, 0, dz) = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

That gives -Y. So I need to swap: (v0, v2, v1) would give +Y.

Let me verify: (v0, v2, v1):
- edge1 = v2 - v0 = (0, 0, +dz)
- edge2 = v1 - v0 = (+dx, 0, 0)
- normal = (0, 0, dz) × (dx, 0, 0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)

Yes! That's +Y. So the winding for +Y faces is:
- Triangle 1: v0, v2, v1 -> (i,j), (i+1,j), (i,j+1)
- Triangle 2: v2, v3, v1 -> (i+1,j), (i+1,j+1), (i,j+1)

Let me verify triangle 2:
- edge1 = v3 - v2 = (dx, 0, 0)
- edge2 = v1 - v2 = (0, 0, -dz)
- normal = (dx, 0, 0) × (0, 0, -dz) = (0*(-dz) - 0*0, 0*0 - dx*(-dz), dx*0 - 0*0) = (0, dx*dz, 0)

Yes, +Y. 

So indices for cell (i, j):
- idx0 = i * 128 + j
- idx1 = i * 128 + (j+1)
- idx2 = (i+1) * 128 + j
- idx3 = (i+1) * 128 + (j+1)

Triangle 1: idx0, idx2, idx1
Triangle 2: idx2, idx3, idx1

Now for the height function, I'll use 3 sine/cosine layers:
y = 2 * (sin(x * 0.5) * cos(z * 0.5) + 0.5 * sin(x * 1.2 + 1) * cos(z * 1.2 - 2) + 0.25 * sin(x * 2.5) * cos(z * 2.5 + 3))

This should give amplitude roughly 2 (sum of 1 + 0.5 + 0.25 = 1.75, times 2 = 3.5 max... let me adjust). Actually the max of the sum is 1 + 0.5 + 0.25 = 1.75, so with amplitude 2, max would be 3.5. Let me use amplitude factor that gives about 2 total.

Actually, let me just use:
y = 1.2 * sin(x * 0.8) * cos(z * 0.8) + 0.5 * sin(x * 1.5 + 1.3) * cos(z * 1.5 - 0.7) + 0.3 * sin(x * 3.0) * cos(z * 3.0 + 2.1)

Max amplitude would be about 1.2 + 0.5 + 0.3 = 2.0. That works.

For colors:
- Low (y near min): green (0, 1, 0)
- Middle: brown (0.5, 0.3, 0.1)
- High (y near max): white (1, 1, 1)

I'll normalize height to [0, 1] and interpolate.

For the camera, the terrain is 20x20 units, so I'll place the camera at something like (15, 12, 15) looking at origin.

Let me write the code now.
