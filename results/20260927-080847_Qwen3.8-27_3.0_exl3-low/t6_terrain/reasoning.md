The user wants a procedural terrain built from a hand-made BufferGeometry. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. Call computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
9. Camera above terrain at an angle, whole terrain visible
10. Expose scene, camera, renderer, controls, and __ready

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- XZ plane is 20x20 units, centered at origin
- So x ranges from -10 to 10, z ranges from -10 to 10
- Step in x and z: 20 / 127

For the height function, I'll use 3 sine/cosine layers:
- y = A1 * sin(f1 * x) * cos(f1 * z) + A2 * sin(f2 * x + phase) * cos(f2 * z + phase) + A3 * sin(f3 * x) * cos(f3 * z)
- Total amplitude about 2, so maybe A1=1, A2=0.5, A3=0.5

For winding order (faces pointing UP +Y):
- For a cell with vertices at (i,j), (i+1,j), (i,j+1), (i+1,j+1)
- Looking from above (down -Y), the winding should be counter-clockwise
- Actually, for faces pointing UP (+Y), we need the normal to point in +Y direction
- Using the right-hand rule: if we look from above (looking down -Y), the vertices should be counter-clockwise
- Let me think more carefully. The normal is computed from the cross product of (v1-v0) and (v2-v0).
- For a quad with corners:
  - v0 = (i, j) -> position (x_i, y_i, z_j)
  - v1 = (i+1, j) -> position (x_{i+1}, y_{i+1}, z_j)
  - v2 = (i, j+1) -> position (x_i, y_i, z_{j+1})
  - v3 = (i+1, j+1) -> position (x_{i+1}, y_{i+1}, z_{j+1})

- Triangle 1: v0, v1, v2 -> (i,j), (i+1,j), (i,j+1)
  - Edge 1: v1 - v0 = (dx, dy1, 0)
  - Edge 2: v2 - v0 = (0, dy2, dz)
  - Cross product: (dx, dy1, 0) × (0, dy2, dz) = (dy1*dz - 0*dy2, 0*0 - dx*dz, dx*dy2 - dy1*0) = (dy1*dz, -dx*dz, dx*dy2)
  - For flat terrain (dy=0): (0, -dx*dz, 0) -> points DOWN. That's wrong.

- Let me try: v0, v2, v1 -> (i,j), (i,j+1), (i+1,j)
  - Edge 1: v2 - v0 = (0, dy2, dz)
  - Edge 2: v1 - v0 = (dx, dy1, 0)
  - Cross product: (0, dy2, dz) × (dx, dy1, 0) = (dy2*0 - dz*dy1, dz*dx - 0*0, 0*dy1 - dy2*dx) = (-dz*dy1, dz*dx, -dy2*dx)
  - For flat terrain: (0, dz*dx, 0) -> points UP. 

- So triangle 1: v0, v2, v1 -> indices: i*128+j, i*128+(j+1), (i+1)*128+j
  Wait, let me be more careful with indexing.

Let me define:
- Vertex index for (col, row) where col is x-index (0..127) and row is z-index (0..127)
- index = row * 128 + col

For cell (col, row) where col goes 0..126 and row goes 0..126:
- v00 = row * 128 + col (bottom-left)
- v10 = row * 128 + (col + 1) (bottom-right)
- v01 = (row + 1) * 128 + col (top-left)
- v11 = (row + 1) * 128 + (col + 1) (top-right)

For upward-facing triangles:
- Triangle 1: v00, v01, v10 (bottom-left, top-left, bottom-right)
- Triangle 2: v01, v11, v10 (top-left, top-right, bottom-right)

Let me verify triangle 1: v00, v01, v10
- v00 is at (x_col, y, z_row)
- v01 is at (x_col, y, z_{row+1})
- v10 is at (x_{col+1}, y, z_row)

Edge 1: v01 - v00 = (0, 0, dz) (for flat)
Edge 2: v10 - v00 = (dx, 0, 0) (for flat)
Cross: (0,0,dz) × (dx,0,0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) -> UP. 

Triangle 2: v01, v11, v10
- v01 is at (x_col, y, z_{row+1})
- v11 is at (x_{col+1}, y, z_{row+1})
- v10 is at (x_{col+1}, y, z_row)

Edge 1: v11 - v01 = (dx, 0, 0)
Edge 2: v10 - v01 = (dx, 0, -dz)
Cross: (dx,0,0) × (dx,0,-dz) = (0*(-dz) - 0*0, 0*dx - dx*(-dz), dx*0 - 0*dx) = (0, dx*dz, 0) -> UP. 

Now for vertex colors by height:
- Green for low, brown for middle, white for high
- I'll compute min and max height, then interpolate

Let me write the code now.

For the height function:
```
function getHeight(x: number, z: number): number {
  return 1.0 * Math.sin(x * 0.5) * Math.cos(z * 0.5)
       + 0.5 * Math.sin(x * 1.2 + 1.0) * Math.cos(z * 1.2 + 0.5)
       + 0.5 * Math.sin(x * 2.5 + 2.0) * Math.cos(z * 2.5 + 1.5);
}
```

This gives amplitude of about 2 (1 + 0.5 + 0.5 = 2 max).

For colors, I'll normalize height between min and max, then:
- 0.0 -> green (0, 0.5, 0)
- 0.5 -> brown (0.5, 0.3, 0.1)
- 1.0 -> white (1, 1, 1)

I'll use a simple lerp between these.

Camera position: terrain is 20x20, so camera should be at something like (15, 15, 15) looking at origin.

Let me write the complete file now.
