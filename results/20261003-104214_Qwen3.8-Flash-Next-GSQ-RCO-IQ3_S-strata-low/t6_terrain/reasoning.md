The user wants a procedural terrain built from a hand-made BufferGeometry. Let me break down the requirements:

1. 128x128 vertices grid, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer with two triangles per grid cell, winding for UP-facing normals
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping, updated every frame, exposed as window.__controls
9. Camera above terrain at an angle, whole terrain visible
10. Renderer, resize handling, animation loop with delta time
11. Expose __scene, __camera, __renderer, __ready

Let me write this carefully:

- Grid: 128x128 vertices means segments = 127 in each direction (127x127 quads)
- Positions: 128*128 vertices = 16384 vertices
- X range: -10 to 10, Z range: -10 to 10
- Index: 127*127*2 triangles * 3 indices = 96774 indices

For winding to face UP (+Y):
- Looking from above (+Y), triangles should be wound counter-clockwise
- For a quad with vertices at (row, col), (row+1, col), (row+1, col+1), (row, col+1):
  - Triangle 1: (row, col), (row+1, col), (row+1, col+1) - but I need to think about this in terms of XZ positions
  - Let's say vertex at index [row * width + col] is at x = -10 + col * (20/127), z = -10 + row * (20/127)
  - For a face pointing UP (+Y), when viewed from above, we need counter-clockwise winding
  - Looking down from +Y: +X is right, +Z is... let's think. The cross product of edge1 × edge2 should point in +Y
  - If we go (row, col) -> (row+1, col) -> (row+1, col+1): edge1 goes in +Z direction, edge2 goes in +X direction. Cross product of +Z × +X = +Y. Wait, Z × X = Y? Let me use right-hand rule: Z cross X = -(X cross Z) = -(-Y) = Y. Hmm, actually X × Y = Z, Y × Z = X, Z × X = Y. So Z × X = Y. Yes, that points up.
  - Wait, let me reconsider. If vertex A = (row, col), B = (row+1, col), C = (row+1, col+1):
    - A to B: direction is (0, dy, dz) where dz > 0 (increasing row means increasing z)
    - A to C: direction is (dx, dy, dz) where dx > 0 (increasing col means increasing x)
    - Normal = (B-A) × (C-A) = (0, dy1, dz) × (dx, dy2, dz)
    - For flat terrain: (0, 0, dz) × (dx, 0, dz) = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dz*dx, 0)
    - Since dz > 0 and dx > 0, normal = (0, positive, 0) = +Y. 

So triangle order: (row, col), (row+1, col), (row+1, col+1) and (row, col), (row+1, col+1), (row, col+1) gives upward normals.

For height: sum of 3 sine/cosine layers with amplitude about 2 total.
- I'll use something like: h = 0.7*sin(x*0.5) * cos(z*0.3) + 0.5*sin(x*1.2 + z*0.8) + 0.5*cos(x*0.7 - z*1.1)
- This gives max amplitude of about 1.7, which is "about 2"

For vertex colors:
- Low (negative/zero height): green
- Middle: brown
- High: white
- I'll normalize height to 0-1 range and interpolate

Let me write the complete file now.
