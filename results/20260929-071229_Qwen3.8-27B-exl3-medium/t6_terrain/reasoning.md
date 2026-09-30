The user wants a complete TypeScript file that creates a procedural terrain using Three.js. Let me break down the requirements:

1. Hand-made BufferGeometry (NOT PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. Call computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high)
7. MeshStandardMaterial with vertexColors: true
8. AmbientLight + DirectionalLight
9. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
10. Camera above terrain at an angle, whole terrain visible
11. Expose __scene, __camera, __renderer, __controls, __ready
12. No external assets
13. Handle resize
14. Use setAnimationLoop
15. Motion uses delta/elapsed time

Let me write this carefully:

- 128x128 vertices means 128 in X and 128 in Z
- 20x20 units, centered at origin: x ranges from -10 to 10, z ranges from -10 to 10
- Step: 20 / (128-1) = 20/127 for each axis
- Height: 3 sine/cosine layers, amplitude about 2 total
  - Layer 1: sin(x * 0.5) * cos(z * 0.5) * 0.8
  - Layer 2: sin(x * 1.2 + 1.0) * cos(z * 0.8 + 0.5) * 0.7
  - Layer 3: sin(x * 2.5 + 2.0) * cos(z * 2.0 + 1.5) * 0.5
  - Total amplitude: 0.8 + 0.7 + 0.5 = 2.0

- Index buffer: For each cell (i, j) where i is 0..126 and j is 0..126:
  - vertex indices: 
    - topLeft = j * 128 + i
    - topRight = j * 128 + i + 1
    - bottomLeft = (j+1) * 128 + i
    - bottomRight = (j+1) * 128 + i + 1
  - Two triangles per cell with upward-facing normals:
    - Triangle 1: topLeft, bottomLeft, bottomRight (or topLeft, bottomRight, bottomLeft)
    - Triangle 2: topLeft, bottomRight, topRight
    
  Wait, let me think about winding. For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above.
  
  Looking from above (+Y looking down at -Y):
  - x increases to the right
  - z increases downward (in screen space from above)
  
  Actually, let me think in 3D. Looking from +Y down:
  - x is to the right
  - z is "into the screen" (away from viewer)
  
  For a quad with corners:
  - A = (i, j) -> topLeft (smaller x, smaller z)
  - B = (i+1, j) -> topRight (larger x, smaller z)
  - C = (i, j+1) -> bottomLeft (smaller x, larger z)
  - D = (i+1, j+1) -> bottomRight (larger x, larger z)
  
  For CCW winding (right-hand rule, normal points up):
  - Triangle 1: A, C, D (going counter-clockwise when viewed from above)
  - Triangle 2: A, D, B
  
  Wait, let me reconsider. In Three.js, the default is that counter-clockwise winding defines the front face. When looking from +Y down at the XZ plane:
  - x goes right
  - z goes "down" (towards viewer if looking from above)
  
  Actually in Three.js coordinate system:
  - X is right
  - Y is up
  - Z is towards the viewer (out of screen)
  
  So looking from above (from +Y down):
  - X goes right
  - Z goes "down" on screen (towards viewer)
  
  For CCW when viewed from above:
  A (0,0), B (1,0), C (0,1), D (1,1) in (x,z)
  
  CCW from above: A -> C -> D and A -> D -> B
  That is: (0,0) -> (0,1) -> (1,1) and (0,0) -> (1,1) -> (1,0)
  
  Let me verify with cross product:
  Triangle A(0,0,0), C(0,1,0), D(1,1,0):
  AC = (0,1,0), AD = (1,1,0)
  Normal = AC × AD = (1*0-0*1, 0*1-0*0, 0*1-1*1) = (0, 0, -1)
  
  Hmm, that gives -Z, not +Y. Let me reconsider.
  
  Actually wait, the vertices have Y component (height), but for the base plane (y=0):
  A = (0, 0, 0), C = (0, 0, 1), D = (1, 0, 1)
  
  AC = C - A = (0, 0, 1)
  AD = D - A = (1, 0, 1)
  Normal = AC × AD = (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1) = (0, 1, 0) ✓
  
  OK so A(0,0,0), C(0,0,1), D(1,0,1) gives +Y normal. Good.
  
  So:
  - index order: vertex at (i, j) is at position index j * 128 + i
  - For cell (i, j):
    - A = j * 128 + i          (x_i, z_j)
    - B = j * 128 + (i+1)     (x_{i+1}, z_j)
    - C = (j+1) * 128 + i     (x_i, z_{j+1})
    - D = (j+1) * 128 + (i+1) (x_{i+1}, z_{j+1})
  
  Triangles:
  - A, C, D
  - A, D, B
  
  Let me verify second triangle:
  A = (0,0,0), D = (1,0,1), B = (1,0,0)
  AD = (1,0,1), AB = (1,0,0)
  Normal = AD × AB = (0*0-1*0, 1*1-1*0, 1*0-0*1) = (0, 1, 0) ✓
  
  Now for vertex colors by height:
  - Green low: (0.2, 0.6, 0.2)
  - Brown middle: (0.5, 0.35, 0.2)
  - White high: (1, 1, 1)
  
  I'll interpolate based on normalized height.

  Camera: above terrain at an angle. Terrain is 20x20, height up to ~2. 
  Camera at (15, 15, 15) looking at origin should work. Or maybe (0, 15, 20) for a good angle.

Let me write the complete file now.
