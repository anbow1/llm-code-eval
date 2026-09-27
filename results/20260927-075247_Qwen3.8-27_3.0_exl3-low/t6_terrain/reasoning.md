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

Let me think about the geometry:
- 128x128 vertices means 127x127 cells
- X range: -10 to 10 (20 units), so step = 20/127
- Z range: -10 to 10 (20 units), so step = 20/127

For the height function, I'll use 3 sine/cosine layers:
- Layer 1: sin(x * 0.5) * cos(z * 0.5) * 1.0
- Layer 2: sin(x * 1.2 + 1.0) * cos(z * 0.8 + 0.5) * 0.5
- Layer 3: sin(x * 2.5 + 2.0) * cos(z * 2.0 + 1.0) * 0.25

Total amplitude roughly 1.75, close to 2. Let me adjust to get closer to 2:
- Layer 1: sin(x * 0.5) * cos(z * 0.5) * 1.0
- Layer 2: sin(x * 1.2 + 1.0) * cos(z * 0.8 + 0.5) * 0.6
- Layer 3: sin(x * 2.5 + 2.0) * cos(z * 2.0 + 1.0) * 0.4

Total max amplitude = 2.0

For the index buffer:
- For cell (i, j) where i is 0..126 and j is 0..126:
  - Vertex indices:
    - bottom-left: j * 128 + i
    - bottom-right: j * 128 + i + 1
    - top-left: (j+1) * 128 + i
    - top-right: (j+1) * 128 + i + 1
  - Two triangles:
    - Triangle 1: bottom-left, top-left, bottom-right (or some winding)
    - Triangle 2: bottom-right, top-left, top-right

Wait, I need to think about winding. For faces pointing UP (+Y), when viewed from above, the vertices should be counter-clockwise.

Let me define the grid. Let's say:
- i goes from 0 to 127 along X (left to right)
- j goes from 0 to 127 along Z (back to front, or front to back)

Actually, let me think about this more carefully. In Three.js, the default is right-handed coordinate system. The camera looks down -Z by default.

Let me define:
- Vertex (i, j) where i is column (X direction) and j is row (Z direction)
- Position: x = -10 + i * (20/127), z = -10 + j * (20/127)

For the index buffer, for cell (i, j):
- v0 = j * 128 + i (bottom-left in XZ)
- v1 = j * 128 + (i+1) (bottom-right)
- v2 = (j+1) * 128 + i (top-left)
- v3 = (j+1) * 128 + (i+1) (top-right)

For faces pointing up (+Y), when looking from above (looking down -Y), the winding should be counter-clockwise.

Looking from above:
- v0 is at (x_i, z_j) - let's say this is bottom-left
- v1 is at (x_{i+1}, z_j) - bottom-right
- v2 is at (x_i, z_{j+1}) - top-left
- v3 is at (x_{i+1}, z_{j+1}) - top-right

In Three.js, the front face is counter-clockwise (CCW) by default.

When looking from above (down -Y), the X axis goes right and Z axis goes... let me think. In a right-handed system, if X is right and Y is up, then Z comes out of the screen toward the viewer. So when looking from above (looking down -Y), X goes right and Z goes... toward the viewer (which in screen space would be "down" on screen).

Actually, let me just think about it differently. The normal for a triangle with vertices A, B, C is (B-A) × (C-A). For the normal to point up (+Y), we need the cross product to have a positive Y component.

Let's say:
- A = (x_i, 0, z_j)
- B = (x_{i+1}, 0, z_j)
- C = (x_i, 0, z_{j+1})

(B-A) = (dx, 0, 0)
(C-A) = (0, 0, dz)

(B-A) × (C-A) = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

Since dx > 0 and dz > 0, this gives (0, -positive, 0) which points DOWN. So this winding is wrong.

Let me try:
- A = (x_i, 0, z_j)
- B = (x_i, 0, z_{j+1})
- C = (x_{i+1}, 0, z_j)

(B-A) = (0, 0, dz)
(C-A) = (dx, 0, 0)

(B-A) × (C-A) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dx*dz, 0)

This points UP! So the correct winding for upward-facing triangles is:
- Triangle 1: v0, v2, v1 (bottom-left, top-left, bottom-right)
- Triangle 2: v1, v2, v3 (bottom-right, top-left, top-right)

Let me verify triangle 2:
- A = v1 = (x_{i+1}, 0, z_j)
- B = v2 = (x_i, 0, z_{j+1})
- C = v3 = (x_{i+1}, 0, z_{j+1})

(B-A) = (-dx, 0, dz)
(C-A) = (0, 0, dz)

(B-A) × (C-A) = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0)

Yes! Points up. 

So the indices for cell (i, j):
- Triangle 1: v0, v2, v1
- Triangle 2: v1, v2, v3

Where:
- v0 = j * 128 + i
- v1 = j * 128 + (i + 1)
- v2 = (j + 1) * 128 + i
- v3 = (j + 1) * 128 + (i + 1)

For vertex colors based on height:
- Low (green): around y = -2
- Middle (brown): around y = 0
- High (white): around y = 2

I'll normalize the height to 0-1 range and interpolate between colors.

For the camera, I'll place it above and at an angle so the whole terrain is visible. Something like position (0, 15, 20) looking at origin.

Let me write the code now.
