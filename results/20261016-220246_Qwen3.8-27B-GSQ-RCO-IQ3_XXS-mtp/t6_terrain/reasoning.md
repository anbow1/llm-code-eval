Let me build a complete TypeScript file that creates a procedural terrain using a hand-made BufferGeometry.

Key requirements:
1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed
9. Camera above terrain at an angle, whole terrain visible
10. Renderer setup, resize handling, setAnimationLoop
11. Expose __scene, __camera, __renderer, __controls, __ready

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- XZ plane is 20x20 units, centered at origin
- So X goes from -10 to +10, Z goes from -10 to +10
- Spacing: 20/127 units between vertices

Height function: sum of 3 sine/cosine layers
- y = A1 * sin(f1*x + p1) * cos(f2*z + p2) + A2 * sin(f3*x + p3) + A3 * cos(f4*z + p4)
- Amplitude about 2 total

Let me design:
- Layer 1: 1.0 * sin(2*x/20 * 2π) * cos(3*z/20 * 2π)
- Layer 2: 0.7 * sin(5*x/20 * 2π + 1.0)
- Layer 3: 0.5 * cos(4*z/20 * 2π + 2.0)

Total amplitude could be up to 1.0 + 0.7 + 0.5 = 2.2, which is "about 2".

Winding for faces pointing UP (+Y):
For a quad with vertices:
- v0 = (row*cols + col) - bottom-left
- v1 = (row*cols + col+1) - bottom-right
- v2 = ((row+1)*cols + col+1) - top-right
- v3 = ((row+1)*cols + col) - top-left

For faces pointing up (+Y), we need counter-clockwise winding when viewed from above.

Let me think about this. If we're looking from +Y down, the X axis points right and Z axis points... 

Actually, let me think in terms of the coordinate system. In Three.js, the default coordinate system is right-handed with Y up. X points right, Z points toward the viewer (out of screen).

For a triangle to point up (+Y), the normal computed by the right-hand rule (cross product of edge1 × edge2) should point in +Y direction.

Let's say we have a quad with:
- A = (x0, y, z0) - bottom-left (smaller x, smaller z)
- B = (x1, y, z0) - bottom-right (larger x, smaller z)
- C = (x1, y, z1) - top-right (larger x, larger z)
- D = (x0, y, z1) - top-left (smaller x, larger z)

Wait, I need to be careful with what "row" and "col" mean. Let me define:
- For row i (0 to 127), z = -10 + i * (20/127)
- For col j (0 to 127), x = -10 + j * (20/127)

So vertex index = i * 128 + j

For cell (i, j):
- A = vertex(i, j)    - (x_j, z_i)
- B = vertex(i, j+1)  - (x_{j+1}, z_i)
- C = vertex(i+1, j+1) - (x_{j+1}, z_{i+1})
- D = vertex(i+1, j)   - (x_j, z_{i+1})

For the normal to point +Y, we need the winding to be counter-clockwise when viewed from above.

Triangle 1: A, B, C
- Edge AB = B - A = (dx, 0, 0) where dx > 0
- Edge AC = C - A = (dx, 0, dz) where dz > 0
- Normal = AB × AC = (dx, 0, 0) × (dx, 0, dz) = (0*dz - 0*0, 0*dx - dx*dz, dx*0 - 0*dx) = (0, -dx*dz, 0)

That gives -Y! So A, B, C is wrong.

Let me try A, C, B:
- Edge AC = (dx, 0, dz)
- Edge AB = (dx, 0, 0)
- Normal = AC × AB = (0*0 - dz*0, dz*dx - dx*0, dx*0 - 0*dx) = (0, dz*dx, 0)

That gives +Y! So the order should be A, C, B.

Wait, let me redo this more carefully.

Normal = (v1 - v0) × (v2 - v0)

For triangle (A, C, B):
- v0 = A = (x0, y0, z0)
- v1 = C = (x1, y1, z1)
- v2 = B = (x1, y2, z0)

- v1 - v0 = (x1-x0, y1-y0, z1-z0) = (dx, dy1, dz)
- v2 - v0 = (x1-x0, y2-y0, z0-z0) = (dx, dy2, 0)

Cross product:
i: dy1*0 - dz*dy2 = -dz*dy2
j: dz*dx - dx*0 = dz*dx
k: dx*dy2 - dy1*dx = dx*(dy2 - dy1)

The j component is dz*dx which is positive (since dx>0, dz>0). So normal points in +Y. 

So Triangle 1: A, C, B → indices: (i*128+j), ((i+1)*128+(j+1)), (i*128+(j+1))

Triangle 2: A, D, C
- v0 = A = (x0, y0, z0)
- v1 = D = (x0, y1, z1)
- v2 = C = (x1, y2, z1)

- v1 - v0 = (0, dy1, dz)
- v2 - v0 = (dx, dy2, dz)

Cross product:
i: dy1*dz - dz*dy2 = dz*(dy1 - dy2)
j: dz*dx - 0*dz = dz*dx
k: 0*dy2 - dy1*dx = -dy1*dx

j component is dz*dx > 0. So normal points in +Y. 

So Triangle 2: A, D, C → indices: (i*128+j), ((i+1)*128+j), ((i+1)*128+(j+1))

Let me verify with a simple case where all y=0:
Triangle 1: A=(0,0,0), C=(1,0,1), B=(1,0,0)
Normal = (C-A) × (B-A) = (1,0,1) × (1,0,0) = (0*0-1*0, 1*1-1*0, 1*0-0*1) = (0, 1, 0) ✓

Triangle 2: A=(0,0,0), D=(0,0,1), C=(1,0,1)
Normal = (D-A) × (C-A) = (0,0,1) × (1,0,1) = (0*1-1*0, 1*1-0*1, 0*0-0*1) = (0, 1, 0) ✓

Great.

Now for vertex colors by height:
- The height range depends on the function. With amplitude ~2, the range is roughly [-2, 2]
- Green low, brown middle, white high
- I'll normalize height to [0, 1] and interpolate colors

Let me write the code now.

For the camera: terrain is 20x20, so camera should be above and at an angle. Something like (15, 20, 15) looking at (0, 0, 0).

Let me make sure I handle the resize properly and use delta time for the animation loop. Since there's no real animation besides OrbitControls damping, I'll still use the time parameter.

Let me write the complete file.
