The user wants a complete TypeScript file that creates a procedural terrain using a hand-made BufferGeometry. Let me break down the requirements:

1. 128x128 vertex grid, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers, amplitude ~2
3. Index buffer with setIndex: two triangles per cell, winding faces UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping
9. Camera above terrain at angle
10. Handle resize, use setAnimationLoop, delta time
11. Expose __scene, __camera, __renderer, __controls, __ready

Let me write this carefully.

Grid: 128x128 vertices means 127x127 cells. XZ plane centered at origin, 20x20 units. So x goes from -10 to 10, z goes from -10 to 10.

For winding to face UP (+Y): Looking from above (+Y), the vertices should go counter-clockwise. For a cell with vertices at (i,j), (i+1,j), (i+1,j+1), (i,j+1):
- Triangle 1: (i,j), (i,j+1), (i+1,j) - wait, let me think about this more carefully.

Actually, let me define: vertex index = j * 128 + i, where i is x-index and j is z-index.

For a cell at (i, j):
- v0 = (i, j)     -> position (x0, h, z0)
- v1 = (i+1, j)   -> position (x1, h, z0)
- v2 = (i+1, j+1) -> position (x1, h, z1)
- v3 = (i, j+1)   -> position (x0, h, z1)

For faces to point UP (+Y), when looking from above, vertices should be counter-clockwise.

If we look from +Y down:
- v0 is at (x0, z0) - bottom-left
- v1 is at (x1, z0) - bottom-right
- v2 is at (x1, z1) - top-right
- v3 is at (x0, z1) - top-left

Wait, in XZ plane viewed from above, "up" on screen is +Z direction typically. Let me think of it as a 2D plane with x to the right and z "forward" (up on screen when looking from +Y).

Counter-clockwise when viewed from +Y:
- Triangle 1: v0, v3, v1 (bottom-left, top-left, bottom-right) - this goes CCW
- Triangle 2: v1, v3, v2 (bottom-right, top-left, top-right) - this goes CCW

Wait, let me reconsider. In Three.js, front face is CCW when viewed from outside. For a face pointing UP (+Y), viewed from +Y looking down, vertices should be CCW.

In the XZ plane (viewed from +Y):
- x goes right
- z goes... in Three.js, if camera is at +Y looking down, +X is right and +Z is... depends on orientation. 

Actually, let me just use the standard: for a plane in XZ, to get normals pointing +Y, the winding when viewed from +Y should be counter-clockwise.

Let me place vertices: i goes along X (left to right), j goes along Z.

v0 = (i, j): x = -10 + i*dx, z = -10 + j*dz
v1 = (i+1, j): x = -10 + (i+1)*dx, z = -10 + j*dz  
v2 = (i+1, j+1): x = -10 + (i+1)*dx, z = -10 + (j+1)*dz
v3 = (i, j+1): x = -10 + i*dx, z = -10 + (j+1)*dz

Viewed from +Y (looking down at XZ plane), if we think of X as horizontal and Z as vertical (up on screen):
- v0 is bottom-left
- v1 is bottom-right
- v2 is top-right
- v3 is top-left

CCW from +Y: v0 -> v3 -> v2 -> v1 (or v0 -> v1 -> v2 -> v3 is CW)

So for CCW (face pointing up):
Triangle 1: v0, v3, v1 (indices: j*W+i, (j+1)*W+i, j*W+i+1)
Triangle 2: v1, v3, v2 (indices: j*W+i+1, (j+1)*W+i, (j+1)*W+i+1)

Let me verify triangle 1: v0(bottom-left) -> v3(top-left) -> v1(bottom-right). Going from bottom-left up to top-left, then across to bottom-right. That's CCW. Yes.

Triangle 2: v1(bottom-right) -> v3(top-left) -> v2(top-right). Going from bottom-right to top-left, then across to top-right. That's CCW. Yes.

Now for the height function, 3 sine/cosine layers with amplitude ~2 total:

height(x, z) = 0.8 * sin(x * 1.5) * cos(z * 1.2) + 0.6 * sin(x * 0.7 + z * 0.5) + 0.6 * cos(x * 2.1) * sin(z * 1.8)

That gives roughly amplitude 2.

Vertex colors by height:
- Green (low, e.g. y < -0.3): (0.2, 0.6, 0.1)
- Brown (middle): (0.5, 0.35, 0.15)
- White (high, e.g. y > 0.5): (0.95, 0.95, 0.95)

I'll interpolate between them.

Let me write the complete file now.
