The user wants a complete TypeScript file that builds a procedural terrain using a hand-made BufferGeometry (not PlaneGeometry). Let me plan this carefully:

1. Grid of 128x128 vertices in XZ plane, 20x20 units centered at origin
2. Height from 3 sine/cosine layers, amplitude ~2
3. Index buffer with two triangles per cell, faces pointing UP (+Y)
4. computeVertexNormals()
5. Vertex colors: green (low), brown (middle), white (high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping
9. Camera positioned to see whole terrain
10. Handle resize, setAnimationLoop, expose scene/camera/renderer/controls

For winding that points UP (+Y):
- Grid vertices indexed as: index = row * width + col
- For a cell at (row, col), vertices are:
  - v00 = row * 128 + col
  - v01 = row * 128 + (col+1)
  - v10 = (row+1) * 128 + col
  - v11 = (row+1) * 128 + (col+1)

For triangles pointing UP (+Y normal):
- Triangle 1: v00, v01, v10 (or v00, v10, v01 depending on winding)
- Triangle 2: v01, v11, v10 (or v01, v10, v11)

Let me think about this. In the XZ plane, looking from +Y:
- v00 is at (x, z), v01 at (x+1, z), v10 at (x, z+1), v11 at (x+1, z+1)
- Cross product for triangle v00->v01->v10: (v01-v00) × (v10-v00) = (1,0,0)×(0,0,1) = (0*1-0*0, 0*0-1*1, 1*0-0*0) = (0,-1,0) → points DOWN
  
Wait, let me recalculate. v00 = (x, y00, z), v01 = (x+dx, y01, z), v10 = (x, y10, z+dz)
- edge1 = v01 - v00 = (dx, dy01-dy00, 0)
- edge2 = v10 - v00 = (0, dy10-dy00, dz)
- cross = edge1 × edge2 = (dy01-dy00)*dz - 0*(dy10-dy00), 0*0 - dx*dz, dx*(dy10-dy00) - (dy01-dy00)*0)

Actually for a flat terrain (all same height):
- edge1 = (dx, 0, 0)
- edge2 = (0, 0, dz)
- cross = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0) → points DOWN

So for UP normals with counter-clockwise winding when viewed from above (+Y):
- Triangle 1: v00, v10, v01 → edge1 = v10-v00 = (0,0,dz), edge2 = v01-v00 = (dx,0,0)
  cross = (0*0-dz*0, dz*dx-0*0, 0*0-0*dx) = (0, dx*dz, 0) → points UP ✓

- Triangle 2: v10, v11, v01 → edge1 = v11-v10 = (dx,0,0), edge2 = v01-v10 = (-dx,0,-dz)
  cross = (0*(-dz)-0*0, 0*(-dx)-dx*(-dz), dx*0-0*(-dx)) = (0, dx*dz, 0) → points UP ✓

So indices: v00, v10, v01, v10, v11, v01 (or equivalently for CCW from above)

Actually let me reconsider. The convention for "faces point up" is that when you look from +Y down, the triangles should be counter-clockwise. In Three.js, front face is CCW.

Looking from +Y down at the XZ plane:
- x goes right, z goes... toward viewer or away? In standard Three.js, +Z comes toward viewer, +X goes right.

Let me just use the winding that gives cross product with +Y component:
- For quad vertices (row, col), (row, col+1), (row+1, col), (row+1, col+1):
  - Tri1: (row,col), (row+1,col), (row,col+1)
  - Tri2: (row+1,col), (row+1,col+1), (row,col+1)

Let me verify: position(row,col) = (x, y, z), position(row+1,col) = (x, y', z+dz), position(row,col+1) = (x+dx, y'', z)
- edge1 = (0, y'-y, dz), edge2 = (dx, y''-y, 0)
- cross = ((y'-y)*0 - dz*(y''-y), dz*dx - 0*0, 0*(y''-y) - (y'-y)*dx)
  = (-dz*(y''-y), dx*dz, -dx*(y'-y))

The Y component is dx*dz which is positive (since dx>0, dz>0). So the normal points UP. 

Now for the height function: sum of 3 sine/cosine layers.

For vertex colors based on height:
- low → green
- middle → brown  
- high → white

I'll interpolate based on height value (roughly -2 to +2).

Let me write the complete file now.
