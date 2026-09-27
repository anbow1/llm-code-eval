The user wants a complete TypeScript file that:
1. Creates a procedural terrain using a hand-made BufferGeometry (not PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. Call computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high)
7. MeshStandardMaterial with vertexColors: true
8. AmbientLight + DirectionalLight
9. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
10. Exposed as (window as any).__controls = controls
11. Camera above terrain at an angle, whole terrain visible
12. Standard requirements: renderer, resize, setAnimationLoop, expose scene/camera/renderer, __ready flag

Let me think about the geometry:
- 128x128 vertices means 128 columns and 128 rows
- 20x20 units in XZ plane, centered at origin
- So x ranges from -10 to 10, z ranges from -10 to 10
- Spacing: 20 / (128-1) = 20/127 for both x and z

For the index buffer:
- Two triangles per grid cell
- 127x127 cells
- For cell (i, j) where i is column (0 to 126) and j is row (0 to 126):
  - Vertex indices: 
    - bottom-left: j * 128 + i
    - bottom-right: j * 128 + i + 1
    - top-left: (j+1) * 128 + i
    - top-right: (j+1) * 128 + i + 1
  - For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above
  - Triangle 1: bottom-left, top-left, top-right (or bottom-left, bottom-right, top-right)
  
Let me think about winding. In Three.js, front face is counter-clockwise by default.
- Looking from above (+Y looking down), X goes right, Z goes down (in screen space)
- Actually in Three.js, the coordinate system is right-handed: X right, Y up, Z toward viewer
- When looking from above (down the -Y axis), X goes right, Z goes toward us (down in screen)

For a quad with corners:
- A = (i, j) = bottom-left in XZ (smallest x, smallest z)
- B = (i+1, j) = bottom-right (largest x, smallest z)
- C = (i, j+1) = top-left (smallest x, largest z)
- D = (i+1, j+1) = top-right (largest x, largest z)

Looking from above (+Y), we see X to the right and Z going "into" the screen (or rather, in a top-down view, Z increases going "down" on screen).

For CCW winding when viewed from above:
- Triangle 1: A, B, D (bottom-left, bottom-right, top-right) - let me check
  - A is at (small x, small z), B is at (large x, small z), D is at (large x, large z)
  - From above: A is bottom-left, B is bottom-right, D is top-right
  - A -> B -> D: left-to-right, then up-right... that's clockwise from above
  
Let me reconsider. In Three.js, the normal is computed using the right-hand rule: cross(B-A, C-A) for triangle ABC.

For the normal to point up (+Y):
- If A=(0,0,0), B=(1,0,0), C=(0,0,1): cross(B-A, C-A) = cross((1,0,0),(0,0,1)) = (0*1-0*0, 0*0-1*1, 1*0-0*0) = (0,-1,0) - that's DOWN
  
- If A=(0,0,0), B=(0,0,1), C=(1,0,0): cross(B-A, C-A) = cross((0,0,1),(1,0,0)) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0) - that's UP

So for faces pointing up, I need: A, C, B pattern where A is one corner, C is the corner that's "next" in Z, and B is the corner that's "next" in X.

Let me define:
- v00 = j * 128 + i (x=i, z=j)
- v10 = j * 128 + i + 1 (x=i+1, z=j)
- v01 = (j+1) * 128 + i (x=i, z=j+1)
- v11 = (j+1) * 128 + i + 1 (x=i+1, z=j+1)

For triangle 1: v00, v01, v11
- A = v00, B = v01, C = v11
- B-A = (0, 0, dz), C-A = (dx, 0, dz)
- cross(B-A, C-A) = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dz*dx, 0)
- Since dx > 0 and dz > 0, this gives (0, positive, 0) = UP ✓

For triangle 2: v00, v11, v10
- A = v00, B = v11, C = v10
- B-A = (dx, 0, dz), C-A = (dx, 0, 0)
- cross(B-A, C-A) = (0*0 - dz*0, dz*dx - dx*0, dx*0 - 0*dx) = (0, dz*dx, 0)
- UP ✓

So the indices for cell (i, j):
- Triangle 1: v00, v01, v11
- Triangle 2: v00, v11, v10

Total triangles: 127 * 127 * 2 = 32258
Total indices: 32258 * 3 = 96774

For the height function, I'll use 3 sine/cosine layers:
- y = A1 * sin(f1x * x) * cos(f1z * z) + A2 * sin(f2x * x + f2z * z) + A3 * cos(f3x * x) * sin(f3z * z)
- Total amplitude about 2, so maybe A1=1.0, A2=0.6, A3=0.4

For vertex colors:
- Normalize height to [0, 1] range (find min/max or use known range)
- Low: green (0, 0.5, 0)
- Middle: brown (0.5, 0.3, 0.1)
- High: white (1, 1, 1)
- Interpolate between these

Let me write the code now.
