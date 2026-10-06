The user wants a complete TypeScript file that creates a procedural terrain using a hand-made BufferGeometry (not PlaneGeometry). Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers, amplitude about 2
3. Index buffer via setIndex: two triangles per grid cell, winding for UP-facing faces
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping, updated every frame, exposed as __controls
9. Camera above terrain at an angle, whole terrain visible
10. Renderer created and appended to document.body
11. Window resize handler
12. setAnimationLoop with delta/elapsed time
13. Expose __scene, __camera, __renderer, __controls, __ready

Let me write this carefully:

- Grid: 128x128 vertices means 127x127 cells
- XZ range: -10 to 10 (20 units centered at origin)
- Height function: 3 layers of sine/cosine, total amplitude ~2
- Index: for each cell (i,j), two triangles. For UP-facing (+Y), with vertices in XZ plane where Y is up, the winding should be counter-clockwise when viewed from above.
  - Vertex at (i, j): position is (x, height, z) where x goes from -10 to 10 and z goes from -10 to 10
  - For a cell with corners: v00, v01, v10, v11 (i.e., (i,j), (i+1,j), (i,j+1), (i+1,j+1))
  - Wait, let me think about this more carefully.
  
  Let me index vertices as: vertex index = row * 128 + col, where row corresponds to z and col corresponds to x.
  
  For a cell at (col, row), the four vertices are:
  - v0 = (col, row)     -> top-left
  - v1 = (col+1, row)   -> top-right
  - v2 = (col, row+1)   -> bottom-left
  - v3 = (col+1, row+1) -> bottom-right
  
  In 3D: x increases with col, z increases with row.
  
  For faces pointing UP (+Y), when viewed from above (looking down -Y), we need counter-clockwise winding.
  
  Looking from above (+Y looking down):
  - x goes right, z goes... let's say z increases going "into" the screen or "down" in top view.
  
  Actually, let's think about it with the cross product. If we have triangle v0, v1, v3:
  - edge1 = v1 - v0 (in +x direction)
  - edge2 = v3 - v0 (in +z direction)
  - cross(edge1, edge2) = cross(+x, +z) = -y (pointing DOWN)
  
  So for UP-facing, we need the cross product to point in +Y. Let me try:
  - Triangle: v0, v3, v1: cross(v3-v0, v1-v0) = cross(+z, +x) = +y ✓
  
  Or equivalently:
  - Triangle: v0, v1, v3 would give -y (down)
  - Triangle: v0, v3, v1 would give +y (up)
  
  Let me reconsider. The standard cross product:
  - cross((a,0,0), (0,0,a)) = (0*a - 0*0, 0*0 - a*a, a*0 - 0*0) = (0, -a², 0) -> points DOWN
  
  So cross(+x, +z) = -y. For UP facing:
  - cross(+z, +x) = +y ✓
  - Or: cross(+x, -z) = +y ✓
  
  For a cell (col, row) with vertices:
  - v00 = row * GRID + col
  - v10 = row * GRID + (col+1)  (next col, same row -> +x direction)
  - v01 = (row+1) * GRID + col  (same col, next row -> +z direction)
  - v11 = (row+1) * GRID + (col+1)
  
  Triangle 1: v00, v01, v10 -> cross(v01-v00, v10-v00) = cross(+z, +x) = +y ✓
  Triangle 2: v10, v01, v11 -> cross(v01-v10, v11-v10) = cross(-x+z, z) hmm let me recalculate
  
  Actually let me just use the standard approach:
  - Triangle 1: v00, v01, v11 -> cross(v01-v00, v11-v00) = cross(+z, +z+x) = cross(+z, +x) [the z component cancels] = +y ✓
  - Triangle 2: v00, v11, v10 -> cross(v11-v00, v10-v00) = cross(+z+x, +x) = cross(+z, +x) = +y ✓
  
  Let me verify triangle 1: v00, v01, v11
  - edge1 = v01 - v00 = (0, 0, step_z) (in +z)
  - edge2 = v11 - v00 = (step_x, 0, step_z) (in +x and +z)
  - cross(edge1, edge2) = cross((0,0,sz), (sx,0,sz)) = (0*sz - sz*0, sz*sx - 0*sz, 0*0 - 0*sx) = (0, sz*sx, 0) -> +y ✓
  
  Triangle 2: v00, v11, v10
  - edge1 = v11 - v00 = (sx, 0, sz)
  - edge2 = v10 - v00 = (sx, 0, 0)
  - cross(edge1, edge2) = (0*0 - sz*0, sz*sx - sx*0, sx*0 - 0*sx) = (0, sz*sx, 0) -> +y ✓
  
  Great, so:
  - Triangle 1: v00, v01, v11
  - Triangle 2: v00, v11, v10
  
  Now for the height function with amplitude about 2:
  - Layer 1: sin(x * freq1) * cos(z * freq1) * amp1
  - Layer 2: sin(x * freq2 + z * freq2) * amp2
  - Layer 3: cos(x * freq3) * sin(z * freq3) * amp3
  - Total amplitude: amp1 + amp2 + amp3 ≈ 2
  
  Let me use: amp1=1.0, amp2=0.6, amp3=0.4, total max = 2.0

  For vertex colors:
  - Low (y < some threshold): green
  - Middle: brown
  - High: white
  - I'll interpolate based on normalized height

  Let me write the complete file now.
