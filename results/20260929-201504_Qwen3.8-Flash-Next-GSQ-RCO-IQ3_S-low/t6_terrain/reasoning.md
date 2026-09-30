The user wants a procedural terrain built from a hand-made BufferGeometry (not PlaneGeometry). Let me plan this out:

1. Create a BufferGeometry with 128x128 vertices in the XZ plane, 20x20 units, centered at origin.
2. Heights from 3 sine/cosine layers with amplitude ~2.
3. Index buffer with two triangles per cell, winding order pointing UP (+Y).
4. computeVertexNormals()
5. Vertex colors based on height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping
9. Camera positioned to see the whole terrain
10. Handle resize, use setAnimationLoop, expose __scene, __camera, __renderer, __controls, __ready

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- 20x20 units, centered at origin means x goes from -10 to 10, z goes from -10 to 10
- Step size: 20 / 127

For winding order pointing UP (+Y):
- For a quad with vertices at (x, z), (x+step, z), (x+step, z+step), (x, z+step)
- We need the normal to point up. Using right-hand rule:
  - Triangle 1: (x,z), (x+step, z), (x+step, z+step) - this goes counter-clockwise when viewed from above, which gives +Y normal
  - Wait, let me think more carefully. In Three.js, the front face is determined by counter-clockwise winding when viewed from the front.
  - For a face pointing +Y (up), when viewed from above (+Y looking down at XZ plane), the vertices should go counter-clockwise.
  - Counter-clockwise in XZ plane (viewed from +Y): x increases to the right, z increases... depends on orientation.
  - Actually in Three.js with standard right-hand coordinate system: if we look down from +Y, x is to the right, z is... forward (towards viewer if we're looking from +Y towards origin). Actually let me just think about the cross product.
  - For vertices A, B, C: normal = (B-A) × (C-A). For this to point +Y:
  - If A = (0,0,0), B = (step, 0, 0), C = (step, 0, step): (B-A) = (step,0,0), (C-A) = (step,0,step). Cross product = (0*step - 0*0, 0*step - step*step, step*0 - 0*step) = (0, -step², 0). That points -Y. So I need the opposite winding.
  - Try A = (0,0,0), B = (0,0,step), C = (step,0,step): (B-A) = (0,0,step), (C-A) = (step,0,step). Cross = (0*step - step*0, step*step - 0*step, 0*0 - 0*step) = (0, step², 0). Points +Y. 
  - So triangle 1: (row, col), (row+1, col), (row+1, col+1) — wait, let me map this properly.
  
Let me define vertex at (row, col) as position (x = col * step - 10, y = height, z = row * step - 10).

For a cell with corners:
- TL = (row, col)
- TR = (row, col+1)
- BL = (row+1, col)
- BR = (row+1, col+1)

Triangle 1: TL, BL, BR → positions: (x, ?, z), (x, ?, z+step), (x+step, ?, z+step)
  (BL-TL) = (0, ?, step), (BR-TL) = (step, ?, step)
  Cross: (?*step - step*?, step*0 - step*step, 0*? - ?*step) 
  Hmm, the y components make this complex. But since the terrain is relatively flat (amplitude 2 vs 20 unit extent), the dominant term in the y-component of the cross product will be from the XZ components.
  
  (BL-TL) × (BR-TL): y-component = (0*step - step*step) = -step² for the pure XZ case. Wait:
  
  Let vectors be a = BL-TL = (0, 0, step) and b = BR-TL = (step, 0, step) (ignoring y for winding determination).
  a × b = (0*step - step*0, step*step - 0*step, 0*0 - 0*step) = (0, step², 0). Points +Y! ✓

Triangle 2: TL, BR, TR → positions: (x, ?, z), (x+step, ?, z+step), (x+step, ?, z)
  a = BR-TL = (step, 0, step), b = TR-TL = (step, 0, 0)
  a × b = (0*0 - step*0, step*step - step*0, step*0 - 0*step) = (0, step², 0). Points +Y! ✓

So: Triangle 1 = [TL, BL, BR], Triangle 2 = [TL, BR, TR]

Now for vertex indices: index = row * GRID_SIZE + col, where GRID_SIZE = 128.

Let me write the code now.
