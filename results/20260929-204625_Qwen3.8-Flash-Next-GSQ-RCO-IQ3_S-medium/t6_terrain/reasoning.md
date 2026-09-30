The user wants a procedural terrain built from a hand-made BufferGeometry. Let me plan this out:

1. Grid of 128x128 vertices (that means 128 columns and 128 rows, so 128*128 = 16384 vertices)
2. 20x20 units in XZ plane, centered at origin (so x ranges from -10 to 10, z ranges from -10 to 10)
3. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer: two triangles per grid cell. With 128x128 vertices, there are 127x127 cells, each with 2 triangles = 127*127*2*3 indices
5. Winding so faces point UP (+Y) - this means counter-clockwise when viewed from above
6. computeVertexNormals()
7. Vertex colors by height: green low, brown middle, white high
8. MeshStandardMaterial with vertexColors: true
9. AmbientLight + DirectionalLight
10. OrbitControls with damping, updated every frame, exposed as __controls
11. Camera above terrain at an angle, whole terrain visible
12. No PlaneGeometry or built-in geometry for terrain

Let me think about the vertex layout:
- 128 columns (x), 128 rows (z)
- x goes from -10 to 10: step = 20 / 127
- z goes from -10 to 10: step = 20 / 127
- Vertex index: row * 128 + col

For indices (two triangles per cell):
- For cell at (col, row):
  - v00 = row * 128 + col
  - v01 = row * 128 + col + 1
  - v10 = (row + 1) * 128 + col
  - v11 = (row + 1) * 128 + col + 1
- Triangle 1: v00, v10, v11
- Triangle 2: v00, v11, v01

Wait, let me think about winding for UP-facing normals. If we're looking down at the XZ plane, for the normal to point +Y, we need counter-clockwise winding when viewed from above (+Y direction).

Let's say x increases to the right, z increases "forward" (away from viewer looking down).

For a cell with corners:
- v00 = (col, row) -> bottom-left
- v01 = (col+1, row) -> bottom-right  
- v10 = (col, row+1) -> top-left
- v11 = (col+1, row+1) -> top-right

Looking from above (+Y), counter-clockwise would be:
Triangle 1: v00, v10, v11 (BL, TL, TR) - let's verify with cross product
Triangle 2: v00, v11, v01 (BL, TR, BR)

Cross product for triangle 1: (v10-v00) × (v11-v00)
v10-v00 = (0, 0, step_z)  [z increases with row]
v11-v00 = (step_x, 0, step_z)
cross = (0*step_z - step_z*0, step_z*step_x - 0*0, 0*0 - 0*step_x) 

Hmm, wait. Let me use actual coordinates. If row increases in +z direction and col increases in +x direction:
- v00 = (x, ?, z)
- v01 = (x+dx, ?, z)
- v10 = (x, ?, z+dz)
- v11 = (x+dx, ?, z+dz)

For triangle (v00, v10, v11):
edge1 = v10 - v00 = (0, ?, dz)
edge2 = v11 - v00 = (dx, ?, dz)
cross = edge1 × edge2 = (?, ?, ?)

Actually let me just think about it in the XZ plane. The normal should point +Y. For the cross product of two edges to give +Y:

If we go v00 -> v10 -> v11, the edges are (0,0,dz) and (dx,0,dz).
Cross: i(dy*dz - dz*dy) - j(0*dz - dz*dx) + k(0*0 - 0*dx) 
Wait let me be more careful.

edge1 = v10 - v00 = (0, dy1, dz)
edge2 = v11 - v00 = (dx, dy2, dz)

cross = (dy1*dz - dz*dy2, dz*dx - 0*dz, 0*dy2 - dy1*dx)

For flat terrain (dy1=dy2=0): cross = (0, dz*dx, 0)

Since dx > 0 and dz > 0, this gives +Y. 

So triangle 1: v00, v10, v11 gives upward normal.

For triangle 2: v00, v11, v01
edge1 = v11 - v00 = (dx, dy, dz)
edge2 = v01 - v00 = (dx, dy, 0)

cross = (dy*0 - dz*dy, dz*dx - dx*0, dx*dy - dy*dx)
For flat: cross = (0, dz*dx, 0) -> +Y. 

So the index order is: v00, v10, v11, v00, v11, v01 for each cell.

Now for the height function with 3 layers:
y = sin(x * freq1) * amp1 + cos(z * freq2) * amp2 + sin((x+z) * freq3) * amp3

With amplitudes summing to about 2.

For vertex colors: I'll map height to a color gradient:
- Low (near min): green
- Middle: brown
- High (near max): white

I'll use a simple lerp between these colors based on normalized height.

Let me write the complete file now.

For the camera: terrain is 20x20, max height ~2. Camera should be above at an angle. Maybe position (15, 12, 15) looking at origin, with fov 60.

Actually, let me think about 128x128 vertices. That's 16384 vertices. The grid has 127x127 = 16129 cells. Each cell has 2 triangles = 6 indices. Total indices = 96774.

Let me write the code now.
