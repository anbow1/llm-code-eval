Let me build a procedural terrain using a hand-made BufferGeometry.

Requirements:
1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. Call computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
9. Camera above terrain at an angle, whole terrain visible
10. Expose __scene, __camera, __renderer, __controls, __ready

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- 20x20 units centered at origin: so x and z range from -10 to 10
- Step = 20 / 127 for both x and z

For the height function:
- 3 sine/cosine layers with different frequencies
- Amplitude about 2 total

For the index buffer:
- Each cell has 4 vertices. We need two triangles per cell.
- For a cell at (i, j), the four vertices are:
  - v0 = (i, j)
  - v1 = (i+1, j)
  - v2 = (i, j+1)
  - v3 = (i+1, j+1)
  
  Vertex index in the buffer: i * 128 + j (row-major, x varies first)
  
  Actually let me think about the indexing. If we have 128 vertices along x and 128 along z:
  - Vertex at position (i, j) where i is x-index (0..127) and j is z-index (0..127)
  - Linear index = i * 128 + j
  
  For a cell (i, j):
  - v0 = i * 128 + j
  - v1 = (i+1) * 128 + j
  - v2 = i * 128 + (j+1)
  - v3 = (i+1) * 128 + (j+1)
  
  Two triangles:
  - Triangle 1: v0, v1, v2 (or v0, v2, v1 depending on winding)
  - Triangle 2: v1, v3, v2 (or v1, v2, v3)
  
  For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above.
  
  Looking from above (looking down -Y direction), counter-clockwise means:
  - If we look from above, the x-axis goes right, z-axis goes... let me think.
  
  Actually, in Three.js, the front face is counter-clockwise by default. For a face to point in +Y direction, we need the normal to point up.
  
  Let me think about this more carefully. In Three.js, the default front face is counter-clockwise (CCW) when viewed from the front. The normal points toward the viewer.
  
  For a triangle with vertices A, B, C, the normal is computed as (B-A) × (C-A). For the normal to point +Y:
  
  Let's say v0 is at bottom-left, v1 is at bottom-right, v2 is at top-left, v3 is at top-right (in XZ plane).
  
  v0 = (x0, y0, z0)
  v1 = (x1, y0, z0) (x increases)
  v2 = (x0, y0, z1) (z increases)
  v3 = (x1, y0, z1)
  
  For triangle (v0, v1, v2):
  Edge1 = v1 - v0 = (dx, 0, 0) (approximately, since y varies)
  Edge2 = v2 - v0 = (0, 0, dz) (approximately)
  Normal = Edge1 × Edge2 = (0, dx*dz, 0) → points +Y if dx > 0 and dz > 0 ✓
  
  Wait, let me redo:
  Edge1 = v1 - v0
  Edge2 = v2 - v0
  Normal = Edge1 × Edge2
  
  If v0 is at (x, y, z), v1 is at (x+dx, y, z), v2 is at (x, y, z+dz):
  Edge1 = (dx, 0, 0)
  Edge2 = (0, 0, dz)
  Cross product = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)
  
  Hmm, that gives -Y. Let me reconsider.
  
  Actually, the cross product of (dx, 0, 0) × (0, 0, dz):
  i: 0*dz - 0*0 = 0
  j: 0*0 - dx*dz = -dx*dz
  k: dx*0 - 0*0 = 0
  
  So normal = (0, -dx*dz, 0) which points -Y. That's wrong.
  
  So I need to swap: use (v0, v2, v1) instead:
  Edge1 = v2 - v0 = (0, 0, dz)
  Edge2 = v1 - v0 = (dx, 0, 0)
  Cross product:
  i: 0*0 - dz*0 = 0
  j: dz*dx - 0*0 = dx*dz
  k: 0*0 - 0*dx = 0
  
  Normal = (0, dx*dz, 0) → +Y ✓
  
  So triangle 1: v0, v2, v1
  Triangle 2: v2, v3, v1
  
  Let me verify triangle 2:
  v2 = (x, y, z+dz), v3 = (x+dx, y, z+dz), v1 = (x+dx, y, z)
  Edge1 = v3 - v2 = (dx, 0, 0)
  Edge2 = v1 - v2 = (dx, 0, -dz)
  Cross product:
  i: 0*(-dz) - 0*0 = 0
  j: 0*dx - dx*(-dz) = dx*dz
  k: 0*0 - 0*dx = 0
  
  Normal = (0, dx*dz, 0) → +Y ✓
  
  So the indices for cell (i, j):
  v0 = i * 128 + j
  v1 = (i+1) * 128 + j
  v2 = i * 128 + (j+1)
  v3 = (i+1) * 128 + (j+1)
  
  Triangle 1: v0, v2, v1
  Triangle 2: v2, v3, v1

Now for the height function:
- 3 sine/cosine layers with different frequencies
- Amplitude about 2

Let me use:
- h1 = 1.0 * sin(2π * x / 20) * cos(2π * z / 20)  (large scale)
- h2 = 0.5 * sin(4π * x / 20) * cos(4π * z / 20)  (medium scale)
- h3 = 0.5 * sin(8π * x / 20) * cos(8π * z / 20)  (small scale)

Total amplitude = 1.0 + 0.5 + 0.5 = 2.0 ✓

For vertex colors:
- Green (low): (0, 0.5, 0) or similar
- Brown (middle): (0.5, 0.3, 0.1) or similar
- White (high): (1, 1, 1)

I'll interpolate based on height.

Camera position: above the terrain at an angle. The terrain is 20x20, so camera should be maybe at (15, 15, 15) looking at origin, or something that shows the whole terrain.

Let me write the code now.

For the vertex positions:
- 128 * 128 = 16384 vertices
- x ranges from -10 to 10, step = 20/127
- z ranges from -10 to 10, step = 20/127

For the index buffer:
- 127 * 127 cells, 2 triangles per cell = 127*127*2 triangles = 32162 triangles
- Each triangle has 3 indices → 96486 indices

Let me write the complete file.
