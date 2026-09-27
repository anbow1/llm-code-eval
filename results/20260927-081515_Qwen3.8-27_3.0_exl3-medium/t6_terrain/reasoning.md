Let me build a procedural terrain with all the specified requirements:

1. BufferGeometry with 128x128 vertices
2. 20x20 units in XZ plane, centered at origin
3. Height from 3 sine/cosine layers, amplitude ~2
4. Index buffer with two triangles per cell, faces pointing UP (+Y)
5. computeVertexNormals()
6. Vertex colors: green low, brown middle, white high
7. MeshStandardMaterial with vertexColors: true
8. AmbientLight + DirectionalLight
9. OrbitControls with damping
10. Camera above terrain at an angle, whole terrain visible
11. Resize handling
12. setAnimationLoop
13. Expose scene, camera, renderer, controls
14. __ready = true after first frame

Let me think about the geometry:
- 128x128 vertices means 127x127 cells
- X and Z range from -10 to 10 (20 units total)
- Step = 20 / 127 ≈ 0.1575

For winding order (faces pointing UP, +Y):
- For a quad with vertices (x, z), (x+dx, z), (x, z+dz), (x+dx, z+dz)
- Triangle 1: bottom-left, bottom-right, top-left → (0, 1, 2)
- Triangle 2: bottom-right, top-right, top-left → (1, 3, 2)

Wait, let me think about this more carefully. In Three.js, the vertex order for a vertex in a grid:
- Vertex index = row * 128 + col
- Where row corresponds to Z axis and col corresponds to X axis

For a cell at (col, row), the four vertices are:
- v0 = row * 128 + col          (bottom-left)
- v1 = row * 128 + col + 1      (bottom-right)
- v2 = (row+1) * 128 + col      (top-left)
- v3 = (row+1) * 128 + col + 1  (top-right)

For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above.

Looking from above (looking down -Y):
- x increases to the right
- z increases "up" in the view (away from viewer)

For CCW winding from above:
- Triangle 1: v0 (bottom-left), v2 (top-left), v1 (bottom-right) → CCW
- Triangle 2: v1 (bottom-right), v2 (top-left), v3 (top-right) → CCW

Wait, let me reconsider. In Three.js, the default is that faces with counter-clockwise winding (when viewed from the front) are the "front" face. For a plane looking down from +Y, "front" means the normal points toward +Y.

Let me think of it differently. If we're looking from +Y down:
- x goes right
- z goes... in Three.js, z goes toward the viewer by default, but when looking down from +Y, z going "forward" (away from camera) would be negative z or positive z depending on setup.

Actually, let me just use the standard approach:
- v0 = (col, row) → bottom-left of cell
- v1 = (col+1, row) → bottom-right
- v2 = (col, row+1) → top-left
- v3 = (col+1, row+1) → top-right

For +Y normal (looking from above):
- Triangle 1: v0, v1, v2 (or v0, v2, v1)
- Triangle 2: v1, v3, v2 (or v2, v3, v1)

Let me verify: if we look from +Y down at the XZ plane:
- x is to the right
- z is... in a standard right-hand system looking down from +Y, x is right, z is down (toward viewer if we think of it as looking at a map from above).

Actually, in Three.js coordinates:
- X is right
- Y is up
- Z is toward the viewer (out of screen in default view)

When looking down from +Y:
- X is right
- Z is... if we look down, positive Z would be "toward us" which in a top-down view would be "down" on screen.

For CCW winding (which gives +Y normal):
Looking from +Y down:
- v0 at (x_min, z_min) - let's say bottom-left in our grid
- v1 at (x_max, z_min) - bottom-right
- v2 at (x_min, z_max) - top-left (larger z)
- v3 at (x_max, z_max) - top-right

From above (+Y looking down), with x right and z going "down" on screen:
- v0 is bottom-left
- v1 is bottom-right
- v2 is top-left (larger z, which is "down" on screen... wait)

Hmm, let me just use the cross product to verify.

If v0 = (0, 0, 0), v1 = (1, 0, 0), v2 = (0, 0, 1):
- Edge 1: v1 - v0 = (1, 0, 0)
- Edge 2: v2 - v0 = (0, 0, 1)
- Normal = Edge1 × Edge2 = (1,0,0) × (0,0,1) = (0*1 - 0*0, 0*0 - 1*1, 1*0 - 0*0) = (0, -1, 0)

That gives -Y! So the order v0, v1, v2 gives -Y normal.

So for +Y normal, I need: v0, v2, v1:
- Edge 1: v2 - v0 = (0, 0, 1)
- Edge 2: v1 - v0 = (1, 0, 0)
- Normal = (0,0,1) × (1,0,0) = (0*0 - 1*0, 1*1 - 0*0, 0*0 - 0*1) = (0, 1, 0) ✓

So for +Y normal:
- Triangle 1: v0, v2, v1 → indices: [v0, v2, v1]
- Triangle 2: v1, v2, v3 → let me verify:
  - v1 = (1,0,0), v2 = (0,0,1), v3 = (1,0,1)
  - Edge 1: v2 - v1 = (-1, 0, 1)
  - Edge 2: v3 - v1 = (0, 0, 1)
  - Normal = (-1,0,1) × (0,0,1) = (0*1 - 1*0, 1*0 - (-1)*1, (-1)*0 - 0*0) = (0, 1, 0) ✓

So:
- Triangle 1: v0, v2, v1
- Triangle 2: v1, v2, v3

Where:
- v0 = row * 128 + col
- v1 = row * 128 + col + 1
- v2 = (row + 1) * 128 + col
- v3 = (row + 1) * 128 + col + 1

Now for the height function, I'll use 3 sine/cosine layers:
y = 2 * (sin(x * 0.5) * cos(z * 0.3) + 0.5 * sin(x * 1.2 + z * 0.8) + 0.3 * cos(x * 2.1 - z * 1.5))

Or something similar. Let me make it look nice.

For vertex colors:
- Low (y < some threshold): green
- Middle: brown
- High: white

I'll use a smooth interpolation.

Let me write the complete file now.
