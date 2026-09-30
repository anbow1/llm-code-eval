The user wants a procedural terrain built from a hand-made BufferGeometry. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as window.__controls
9. Camera above terrain at an angle, whole terrain visible

Let me think about the winding order. For faces pointing UP (+Y), when viewed from above (looking down at the XZ plane), the vertices should be in counter-clockwise order. In Three.js, front faces are counter-clockwise by default.

For a grid cell at (i, j) to (i+1, j+1):
- Vertex positions in XZ: (i, j), (i+1, j), (i+1, j+1), (i, j+1)

For the face to point UP (+Y normal), when looking from above (+Y looking down), we need counter-clockwise winding. Looking from +Y down at the XZ plane, counter-clockwise means going in the order that, when projected to XZ, goes counter-clockwise.

Let me think carefully. If we're looking from +Y down at the XZ plane:
- X goes right, Z goes... well, it depends. In standard math, if X is right and Z is "up" in the projected view, then CCW would be: (0,0) -> (1,0) -> (1,1) -> (0,1).

Actually, let me think more carefully. In Three.js, the default front face is counter-clockwise (THREE.CW is not used). The normal direction is determined by the right-hand rule: if fingers curl in the vertex order, thumb points in the normal direction.

For a quad with vertices at:
- A = (x, y1, z) at (i, j)
- B = (x+dx, y2, z) at (i+1, j)  
- C = (x+dx, y3, z+dz) at (i+1, j+1)
- D = (x, y4, z+dz) at (i, j+1)

Triangle ABC: A -> B -> C
- AB = (dx, y2-y1, 0)
- AC = (dx, y3-y1, dz)
- Cross product AB × AC = (0*dz - 0*(y3-y1), 0*dx - dx*dz, dx*(y3-y1) - (y2-y1)*dx)
  = (0, -dx*dz, dx*(y3-y1) - (y2-y1)*dx)

For flat terrain (y all same), this gives (0, -dx*dz, 0). Since dx and dz are positive, the Y component is negative. So this triangle points DOWN.

Let me try A -> C -> B:
- AC = (dx, y3-y1, dz)
- AB = (dx, y2-y1, 0)
- Cross product AC × AB = ((y3-y1)*0 - dz*(y2-y1), dz*dx - dx*0, dx*(y2-y1) - (y3-y1)*dx)
  = (-(y3-y1)*dz - dz*(y2-y1)... wait let me redo this.

Actually, cross product of vectors u × v = (u_y*v_z - u_z*v_y, u_z*v_x - u_x*v_z, u_x*v_y - u_y*v_x)

For triangle A, C, B:
u = AC = (dx, y3-y1, dz)
v = AB = (dx, y2-y1, 0)

u × v = ((y3-y1)*0 - dz*(y2-y1), dz*dx - dx*0, dx*(y2-y1) - (y3-y1)*dx)
= (-dz*(y2-y1), dz*dx, dx*(y2-y1) - (y3-y1)*dx)

For flat terrain: (0, dx*dz, 0) - positive Y! So A, C, B gives upward normal.

So the correct winding for upward-facing triangles is:
- Triangle 1: A, C, B (indices: topLeft, bottomRight, topRight)
- Triangle 2: A, D, C (indices: topLeft, bottomLeft, bottomRight)

Wait, let me redefine. Let's say vertex (i, j) maps to grid position where i is the column (x direction) and j is the row (z direction).

Vertex index: i + j * width

For cell (i, j):
- v00 = i + j * width (position (x, y, z))
- v10 = (i+1) + j * width (position (x+dx, y, z))
- v01 = i + (j+1) * width (position (x, y, z+dz))
- v11 = (i+1) + (j+1) * width (position (x+dx, y, z+dz))

For upward-facing normal, I need:
- Triangle 1: v00, v11, v10
- Triangle 2: v00, v01, v11

Let me verify triangle 1: v00, v11, v10
u = v11 - v00 = (dx, y11-y00, dz)
v = v10 - v00 = (dx, y10-y00, 0)

u × v = ((y11-y00)*0 - dz*(y10-y00), dz*dx - dx*0, dx*(y10-y00) - (y11-y00)*dx)

For flat: (0, dz*dx, 0) → positive Y. Good.

Triangle 2: v00, v01, v11
u = v01 - v00 = (0, y01-y00, dz)
v = v11 - v00 = (dx, y11-y00, dz)

u × v = ((y01-y00)*dz - dz*(y11-y00), dz*dx - 0*dz, 0*(y11-y00) - (y01-y00)*dx)
For flat: (0, dz*dx, 0) → positive Y. Good.

So the index pattern is:
- i, i + width + 1, i + 1
- i, i + width, i + width + 1

Wait let me recheck. v00 = i + j*width, v11 = (i+1) + (j+1)*width = i + 1 + j*width + width = v00 + width + 1, v10 = i + 1 + j*width = v00 + 1, v01 = i + (j+1)*width = v00 + width.

So:
- Triangle 1: v00, v00 + width + 1, v00 + 1
- Triangle 2: v00, v00 + width, v00 + width + 1

Now for the height function, I'll use 3 sine/cosine layers:
```
y = 0.5 * sin(x * 2.5 + 1) * cos(z * 1.7) 
  + 0.3 * sin(x * 4.0) * sin(z * 3.0 + 0.5)
  + 0.2 * cos(x * 7.0 + z * 5.0)
```
Total amplitude around 1.0... let me scale to get about 2. Let me use amplitudes that sum to about 2.

For vertex colors by height:
- Green (low): RGB(0.2, 0.6, 0.2)
- Brown (middle): RGB(0.5, 0.3, 0.1)
- White (high): RGB(0.9, 0.9, 0.9)

I'll interpolate based on normalized height.

For the camera: terrain is 20x20 centered at origin, so it spans from -10 to 10 in X and Z. I'll place the camera at something like (20, 15, 20) looking at origin.

Let me also handle the `__ready` flag after the first frame.

Let me write the complete file now.

Actually, let me reconsider the amplitude. "amplitude about 2" - I'll make the max height around 2. Sum of amplitudes: 0.8 + 0.7 + 0.5 = 2.0. That works.

For the color mapping, I need to normalize height to [0, 1] range. The height ranges from about -2 to +2 (since sine/cosine oscillate between -1 and 1, multiplied by amplitudes). Actually, the maximum absolute value is 2, and it could be negative. So I'll normalize to [0,1] by (y + 2) / 4 or similar.

Let me write the code:
