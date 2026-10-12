The user wants a procedural terrain built from a hand-made BufferGeometry with specific requirements:

1. 128x128 vertex grid, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers, amplitude ~2
3. Index buffer with two triangles per cell, winding for UP-facing faces (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping
9. Camera positioned above terrain at an angle

Let me think about the winding order. For faces pointing up (+Y), when looking down from above, the vertices should go counter-clockwise. In a grid, for a quad with vertices:
- top-left (a), top-right (b), bottom-right (c), bottom-left (d)

Where "top" means higher Z and "bottom" means lower Z:
- If we go from (i, j) as bottom-left, (i+1, j) as bottom-right, (i+1, j+1) as top-right, (i, j+1) as top-left

For +Y facing (counter-clockwise when viewed from above/+Y):
Triangle 1: a, c, b (or a, d, c... let me think more carefully)

Actually, let me think in terms of indices. For vertex (i, j) where i is the column (X direction) and j is the row (Z direction):
- vertex index = j * 128 + i
- position = (i * step - 10, height, j * step - 10)

For a cell with corners:
- bottom-left: (i, j)     -> index = j * cols + i
- bottom-right: (i+1, j)   -> index = j * cols + (i+1)
- top-right: (i+1, j+1)    -> index = (j+1) * cols + (i+1)
- top-left: (i, j+1)       -> index = (j+1) * cols + i

For counter-clockwise winding when viewed from +Y (up):
Looking from +Y down, X goes right, Z goes "away" (or towards us depending on convention).

Actually in Three.js, the default camera looks down -Z. The right-hand rule: if fingers curl in the winding order of vertices, thumb points in the normal direction.

For +Y normal: vertices should be counter-clockwise when viewed from above (+Y looking down).

When looking from +Y down at the XZ plane:
- X increases to the right
- Z increases "up" on screen (away from camera which is at -Z looking at +Z... wait no)

Let me just use the standard approach. In Three.js with a standard up = (0,1,0):

For a quad with vertices ordered:
- a = (i, j)
- b = (i+1, j)  
- c = (i+1, j+1)
- d = (i, j+1)

Triangle 1: a, b, d → this gives normal... let's compute cross product.
Edge ab = b - a = (step, 0, 0) (approximately, ignoring height differences)
Edge ad = d - a = (0, 0, step) (approximately)

Cross product ab × ad = (0*step - 0*0, 0*0 - step*step, step*0 - 0*0) = (0, -step², 0)

That's -Y, so we want the opposite winding.

Triangle 1: a, d, b → normal = ad × ab = (0, step², 0) → +Y ✓

Wait, let me reconsider. The cross product for triangle (a, b, c) is (b-a) × (c-a).

For triangle (a, d, b):
(b-a) = (step, 0, 0)
(d-a) = (0, 0, step)
Cross = (0*step - 0*0, 0*0 - step*step, step*0 - 0*0) = (0, -step², 0) → -Y ✗

For triangle (a, b, d):
(b-a) = (step, 0, 0)  
(d-a) = (0, 0, step)
Cross = (0*step - 0*0, 0*0 - step*step, step*0 - 0*0) = (0, -step², 0) → -Y ✗

Hmm, let me recalculate. Cross product of vectors u × v:
u = (u1, u2, u3), v = (v1, v2, v3)
u × v = (u2*v3 - u3*v2, u3*v1 - u1*v3, u1*v2 - u2*v1)

For triangle (a, b, d):
u = b - a = (step, 0, 0)
v = d - a = (0, 0, step)
u × v = (0*step - 0*0, 0*0 - step*step, step*0 - 0*0) = (0, -step², 0)

That's -Y. So I need the reverse: triangle (a, d, b):
u = d - a = (0, 0, step)
v = b - a = (step, 0, 0)
u × v = (0*0 - step*0, step*step - 0*0, 0*0 - 0*step) = (0, step², 0) → +Y ✓

OK so for triangle 1: a, d, b (i.e., j*cols+i, (j+1)*cols+i, j*cols+i+1)
For triangle 2: b, d, c (i.e., j*cols+i+1, (j+1)*cols+i, (j+1)*cols+i+1)

Let me verify triangle 2 (b, d, c):
u = d - b = (0-step, 0, step-0) = (-step, 0, step)
v = c - b = (0, 0, step)
u × v = (0*step - step*0, step*0 - (-step)*step, (-step)*0 - 0*0) = (0, step², 0) → +Y ✓

Great!

Now for the height function: sum of 3 sine/cosine layers with different frequencies, amplitude about 2 total.

I'll do something like:
h(x, z) = 0.8 * sin(x * freq1 + z * freq1) + 0.7 * cos(x * freq2 - z * freq2) + 0.5 * sin(x * freq3 + z * freq3 * 0.5)

Let me make it look more interesting with different frequencies in x and z.

For vertex colors by height:
- Low (near min height): green
- Middle: brown  
- High (near max height): white

I'll normalize the height to [0, 1] and lerp between colors.

Let me write the complete file now.
