Let me break down the requirements:

1. Procedural terrain from hand-made BufferGeometry (no PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. Call computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as (window as any).__controls = controls
9. Camera above terrain at an angle, whole terrain visible

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- XZ plane: x from -10 to 10, z from -10 to 10
- Spacing: 20 / 127 in each direction

For the index buffer with faces pointing UP (+Y):
- For a cell with vertices at (row, col), (row, col+1), (row+1, col), (row+1, col+1)
- Looking from above (+Y), we need counter-clockwise winding
- Let me think about this carefully.

If we have a grid where:
- vertex index = row * 128 + col
- row goes from 0 to 127 (z from -10 to 10, so z = -10 + row * spacing)
- col goes from 0 to 127 (x from -10 to 10, so x = -10 + col * spacing)

For a cell at (row, col):
- v0 = row * 128 + col (bottom-left)
- v1 = row * 128 + (col + 1) (bottom-right)
- v2 = (row + 1) * 128 + col (top-left)
- v3 = (row + 1) * 128 + (col + 1) (top-right)

For faces pointing UP (+Y), when viewed from above, the winding should be counter-clockwise.

Looking from above (looking down -Y):
- x increases to the right
- z increases "into the screen" (away from viewer)

Wait, let me think more carefully. In Three.js, the camera looks down -Z by default. If we're looking from above (looking down -Y), then:
- x is to the right
- z is... let me think. If we look down -Y, then x is right and z is "up" in screen space (away from us).

Actually, for Three.js face culling, a face is visible if its vertices are in counter-clockwise order when viewed from the front. For a face pointing up (+Y), the front is the +Y direction.

Looking from +Y down at the XZ plane:
- x goes right
- z goes... if we're looking from +Y toward -Y, then x is right and z is toward us (or away?).

Let me use the right-hand rule. If the normal is +Y, and we look at the face from the +Y side, the vertices should be counter-clockwise.

Looking from +Y down:
- x axis points right
- z axis points... In a right-handed coordinate system, if Y is up and X is right, then Z points toward the viewer (out of the screen). So when looking from +Y down, X is right and Z is toward us (downward in screen space if we think of it as a top-down view).

Wait, let me reconsider. In Three.js (right-handed):
- X: right
- Y: up
- Z: toward viewer (out of screen)

If I'm looking from above (from +Y looking down toward -Y):
- X is still right
- Z is... toward me? No. If I'm above looking down, Z would be pointing "into the ground" from my perspective, which means it points away from me in screen space.

Actually, let me just use the cross product approach. For a triangle with vertices A, B, C, the normal is (B-A) × (C-A). For the normal to point +Y:

If I have:
- A = (0, 0, 0)
- B = (1, 0, 0)
- C = (0, 0, 1)

Normal = (B-A) × (C-A) = (1,0,0) × (0,0,1) = (0*1-0*0, 0*0-1*1, 1*0-0*0) = (0, -1, 0)

That points DOWN. So this order gives a downward normal.

Let me try:
- A = (0, 0, 0)
- B = (0, 0, 1)
- C = (1, 0, 0)

Normal = (B-A) × (C-A) = (0,0,1) × (1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0, 1, 0)

That points UP! So the order should be: bottom-left, top-left, bottom-right (or equivalently, for the other triangle: bottom-right, top-left, top-right).

Wait, let me redo. My grid:
- row increases with z (z goes from -10 to 10 as row goes 0 to 127)
- col increases with x (x goes from -10 to 10 as col goes 0 to 127)

So:
- v0 = (row, col) → bottom-left (smallest x, smallest z)
- v1 = (row, col+1) → bottom-right (largest x, smallest z)
- v2 = (row+1, col) → top-left (smallest x, largest z)
- v3 = (row+1, col+1) → top-right (largest x, largest z)

From my calculation above, for upward normal:
- Triangle 1: v0, v2, v1 (bottom-left, top-left, bottom-right)
- Triangle 2: v1, v2, v3 (bottom-right, top-left, top-right)

Let me verify triangle 2:
- A = v1 = (1, 0, 0) [bottom-right]
- B = v2 = (0, 0, 1) [top-left]
- C = v3 = (1, 0, 1) [top-right]

Normal = (B-A) × (C-A) = (-1, 0, 1) × (0, 0, 1) = (0*1-1*0, 1*0-(-1)*1, (-1)*0-0*0) = (0, 1, 0) ✓

Great, so the indices for each cell (row, col) are:
- v0 = row * 128 + col
- v1 = row * 128 + (col + 1)
- v2 = (row + 1) * 128 + col
- v3 = (row + 1) * 128 + (col + 1)

Triangle 1: v0, v2, v1
Triangle 2: v1, v2, v3

Now for the height function:
y = sin(x * f1) * a1 + cos(z * f2) * a2 + sin(x * f3 + z * f3) * a3

With amplitude about 2 total. Let me use:
- y = 0.8 * sin(x * 0.5) * cos(z * 0.5) + 0.7 * sin(x * 1.2 + z * 0.8) + 0.5 * cos(x * 2.1 - z * 1.7)

Total max amplitude ≈ 0.8 + 0.7 + 0.5 = 2.0

For vertex colors:
- I need to normalize the height to [0, 1] range
- Low (green): (0.2, 0.6, 0.2)
- Middle (brown): (0.5, 0.35, 0.2)
- High (white): (1, 1, 1)

I'll interpolate between these based on normalized height.

Let me find the min and max height, or just use a fixed range. Since the max amplitude is about 2, the range is roughly [-2, 2]. I'll normalize by dividing by 2 and mapping to [0, 1].

Actually, let me compute the actual min/max after generating all heights, then normalize.

For the camera position, I want it above and at an angle. Maybe (15, 15, 15) looking at origin, or something like that. The terrain is 20x20, so I need to be far enough to see it all.

Let me write the complete file now.
