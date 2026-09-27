The user wants a procedural terrain built from a hand-made BufferGeometry. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
9. Camera above terrain at an angle, whole terrain visible
10. All the standard requirements (renderer, resize, animation loop, window exposure, etc.)

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- Each cell has 2 triangles = 2 * 127 * 127 * 3 = 96762 indices
- X from -10 to 10, Z from -10 to 10

For the height function, I'll use 3 sine/cosine layers:
- y = 1.0 * sin(x * 0.5) * cos(z * 0.5) + 0.5 * sin(x * 1.2 + 1.0) * cos(z * 1.1 - 0.5) + 0.3 * sin(x * 2.5) * cos(z * 2.3 + 0.7)
- Total amplitude roughly 1.0 + 0.5 + 0.3 = 1.8, close to 2. Let me adjust to get closer to 2.
- y = 1.0 * sin(x * 0.5) * cos(z * 0.5) + 0.6 * sin(x * 1.2 + 1.0) * cos(z * 1.1 - 0.5) + 0.4 * sin(x * 2.5) * cos(z * 2.3 + 0.7)
- Max amplitude = 2.0

For winding that faces UP (+Y):
- For a cell with vertices (i, j), (i+1, j), (i, j+1), (i+1, j+1)
- Looking from above, the vertices go:
  - v00 = (i, j) - bottom-left
  - v10 = (i+1, j) - bottom-right
  - v01 = (i, j+1) - top-left
  - v11 = (i+1, j+1) - top-right

For faces pointing UP (+Y), when looking from above (+Y), the vertices should be counter-clockwise.

Actually, let me think about this more carefully. In Three.js, a face points in the direction given by the right-hand rule: cross product of (v1-v0) × (v2-v0) gives the normal direction.

For a triangle to face up (+Y), I need the normal to point in +Y direction.

Let's say the grid goes:
- x increases to the right (positive X)
- z increases "into" the screen (positive Z) - but in Three.js, positive Z is toward the camera by default

Actually, let me just think of it as a 2D grid in XZ:
- Vertex at grid position (i, j) has:
  - x = -10 + i * (20 / 127)
  - z = -10 + j * (20 / 127)

For a cell with corners (i, j), (i+1, j), (i, j+1), (i+1, j+1):
- Let's call them A=(i,j), B=(i+1,j), C=(i+1,j+1), D=(i,j+1)

Triangle 1: A, B, D → (i,j), (i+1,j), (i,j+1)
Triangle 2: B, C, D → (i+1,j), (i+1,j+1), (i,j+1)

For these to face UP:
- Triangle 1: A=(x0,z0), B=(x1,z0), D=(x0,z1)
  - AB = (dx, 0, 0), AD = (0, 0, dz)
  - AB × AD = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)
  - Since dx > 0 and dz > 0, this gives (0, -something, 0) → points DOWN

So I need to reverse. Let me try:
Triangle 1: A, D, B → (i,j), (i,j+1), (i+1,j)
- AD = (0, 0, dz), AB = (dx, 0, 0)
- AD × AB = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dx*dz, 0) → points UP ✓

Triangle 2: D, C, B → (i,j+1), (i+1,j+1), (i+1,j)
- DC = (dx, 0, 0), DB = (dx, 0, -dz)
- DC × DB = (0*(-dz) - 0*0, 0*dx - dx*(-dz), dx*0 - 0*dx) = (0, dx*dz, 0) → points UP ✓

So:
- Triangle 1: (i,j), (i,j+1), (i+1,j) → indices: idx(i,j), idx(i,j+1), idx(i+1,j)
- Triangle 2: (i,j+1), (i+1,j+1), (i+1,j) → indices: idx(i,j+1), idx(i+1,j+1), idx(i+1,j)

Where idx(i,j) = i * 128 + j

Let me verify:
- idx(i,j) = i * 128 + j (column-major in terms of i being x, j being z)

Actually, let me use row-major: idx(i, j) = i * 128 + j where i is the row (x index) and j is the column (z index). Or I can do idx = j * 128 + i. Let me just pick one and be consistent.

Let me use: vertex index = i * 128 + j, where i is x-index (0..127) and j is z-index (0..127).

For cell (i, j) where i is 0..126 and j is 0..126:
- A = idx(i, j) = i * 128 + j
- B = idx(i+1, j) = (i+1) * 128 + j
- C = idx(i+1, j+1) = (i+1) * 128 + (j+1)
- D = idx(i, j+1) = i * 128 + (j+1)

Triangle 1: A, D, B → i*128+j, i*128+j+1, (i+1)*128+j
Triangle 2: D, C, B → i*128+j+1, (i+1)*128+j+1, (i+1)*128+j

Let me verify Triangle 1 with actual coordinates:
- A = (x_i, z_j) → world (-10 + i*step, 0, -10 + j*step)
- D = (x_i, z_{j+1}) → world (-10 + i*step, 0, -10 + (j+1)*step)
- B = (x_{i+1}, z_j) → world (-10 + (i+1)*step, 0, -10 + j*step)

AB vector = B - A = (step, 0, 0)
AD vector = D - A = (0, 0, step)

Normal = AB × AD = (0*step - 0*0, 0*0 - step*step, step*0 - 0*step) = (0, -step², 0)

That's pointing DOWN! So I need to swap. Let me try A, B, D:
AB = (step, 0, 0), AD = (0, 0, step)
AB × AD = (0*step - 0*0, 0*0 - step*step, step*0 - 0*step) = (0, -step², 0) → still down

Hmm, let me reconsider. The cross product formula:
(a × b) = (a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x)

AB = (step, 0, 0), AD = (0, 0, step)
AB × AD = (0*step - 0*0, 0*0 - step*step, step*0 - 0*0) = (0, -step², 0) → DOWN

AD × AB = (0*0 - step*0, step*step - 0*0, 0*0 - 0*step) = (0, step², 0) → UP

So for UP normal, I need the order: A, D, B (i.e., AD first, then AB from A's perspective)
Wait no. The normal of triangle (v0, v1, v2) is (v1-v0) × (v2-v0).

For triangle (A, D, B): normal = (D-A) × (B-A) = AD × AB = (0, step², 0) → UP ✓

So Triangle 1: A, D, B = (i,j), (i,j+1), (i+1,j) → indices: i*128+j, i*128+j+1, (i+1)*128+j

For Triangle 2: D, C, B
DC = C - D = (step, 0, 0)
DB = B - D = (step, 0, -step)
DC × DB = (0*(-step) - 0*0, 0*step - step*(-step), step*0 - 0*step) = (0, step², 0) → UP ✓

Great! So:
- Triangle 1: idx(i,j), idx(i,j+1), idx(i+1,j)
- Triangle 2: idx(i,j+1), idx(i+1,j+1), idx(i+1,j)

Now for colors:
- Height range is roughly -2 to +2
- Green for low, brown for middle, white for high
- I'll normalize height to 0..1 and interpolate

Let me write the code now.
