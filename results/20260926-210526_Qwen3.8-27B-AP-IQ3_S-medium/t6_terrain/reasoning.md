The user wants a complete TypeScript file that:
1. Creates a procedural terrain using hand-made BufferGeometry (NOT PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. Call computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high)
7. MeshStandardMaterial with vertexColors: true
8. AmbientLight + DirectionalLight
9. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
10. Camera above terrain at an angle, whole terrain visible
11. Expose __scene, __camera, __renderer, __controls, __ready
12. Use setAnimationLoop
13. Handle resize
14. No external assets

Let me think about the grid:
- 128x128 vertices means 128 vertices along X and 128 vertices along Z
- 20x20 units in XZ plane, centered at origin
- So x goes from -10 to 10, z goes from -10 to 10
- Step = 20 / (128 - 1) = 20/127

For the height function:
- 3 sine/cosine layers with different frequencies
- Amplitude about 2
- e.g., y = 1.0 * sin(x * 0.5) * cos(z * 0.5) + 0.5 * sin(x * 1.2 + z * 0.8) + 0.2 * cos(x * 3.0) * sin(z * 2.5)
- Total amplitude roughly 1.0 + 0.5 + 0.2 = 1.7, close to 2

For the index buffer:
- Grid cells: 127x127 cells
- Each cell has 4 vertices: (i,j), (i+1,j), (i,j+1), (i+1,j+1)
- For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above
- Looking from +Y down at the XZ plane: X is to the right, Z is... 
- In Three.js, the default coordinate system: X right, Y up, Z toward viewer
- For a face to point in +Y direction, we need counter-clockwise winding when looking from +Y

Let me think about vertex positions:
- Vertex (i, j) where i is column (X direction) and j is row (Z direction)
- x_i = -10 + i * (20/127), i from 0 to 127
- z_j = -10 + j * (20/127), j from 0 to 127

For a quad with corners:
- A = (i, j) - bottom-left (lower x, lower z)
- B = (i+1, j) - bottom-right (higher x, lower z)
- C = (i, j+1) - top-left (lower x, higher z)
- D = (i+1, j+1) - top-right (higher x, higher z)

Looking from +Y (above), X goes right, Z goes... In Three.js, Z goes toward the camera by default. But when looking from above (down the -Y axis), X goes right and Z goes... Let me think more carefully.

In Three.js right-hand coordinate system: X right, Y up, Z toward viewer.
Looking from above (looking down -Y):
- X axis goes to the right
- Z axis goes toward us (but since we're looking down, it goes "down" on screen)

Actually, let me just use the cross product to verify. For a triangle (A, B, C), the normal is (B-A) × (C-A).

A = (x0, y, z0), B = (x1, y, z0), C = (x0, y, z1) where x1 > x0, z1 > z0

B - A = (dx, 0, 0)
C - A = (0, 0, dz)

(B-A) × (C-A) = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

That's pointing in -Y direction! So that winding is WRONG for +Y.

Let me try (A, C, B):
A = (x0, y, z0), C = (x0, y, z1), B = (x1, y, z0)

C - A = (0, 0, dz)
B - A = (dx, 0, 0)

(C-A) × (B-A) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)

That's +Y! Good.

So for each quad (A, B, C, D):
- A = (i, j)
- B = (i+1, j)  
- C = (i, j+1)
- D = (i+1, j+1)

Triangle 1: A, C, B (indices: id(i,j), id(i,j+1), id(i+1,j))
Triangle 2: A, D, C (indices: id(i,j), id(i+1,j+1), id(i,j+1))

Wait let me re-verify triangle 2:
A = (x0, y, z0), D = (x1, y, z1), C = (x0, y, z1)

D - A = (dx, 0, dz)
C - A = (0, 0, dz)

(D-A) × (C-A) = (0*dz - dz*0, dz*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

That's -Y! Wrong.

Let me try: A, C, D
A = (x0, y, z0), C = (x0, y, z1), D = (x1, y, z1)

C - A = (0, 0, dz)
D - A = (dx, 0, dz)

(C-A) × (D-A) = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dz*dx, 0)

+Y! Good.

So:
- Triangle 1: A, C, B → (i,j), (i,j+1), (i+1,j)
- Triangle 2: A, C, D → (i,j), (i,j+1), (i+1,j+1)

Wait, let me double-check triangle 1 again:
A = (x0, y, z0), C = (x0, y, z1), B = (x1, y, z0)

C - A = (0, 0, dz)
B - A = (dx, 0, 0)

(C-A) × (B-A) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)

Yes, +Y. 

So the indices for cell (i, j):
- Tri 1: id(i,j), id(i,j+1), id(i+1,j)
- Tri 2: id(i,j), id(i,j+1), id(i+1,j+1)

Where id(i,j) = i * 128 + j

Number of vertices: 128 * 128 = 16384
Number of indices: 127 * 127 * 6 = 976,494

For vertex colors:
- Need to find min and max height
- Low (min) → green (0, 0.6, 0)
- Middle → brown (0.5, 0.3, 0.1)
- High (max) → white (1, 1, 1)

I'll compute the height first, find min/max, then assign colors.

Let me write the complete file now.
