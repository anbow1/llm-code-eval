The user wants a single TypeScript file that builds a procedural terrain using a hand-made BufferGeometry (not PlaneGeometry or any built-in geometry). Let me carefully implement all the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer via setIndex: two triangles per grid cell, winding pointing UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
6. AmbientLight + DirectionalLight
7. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as (window as any).__controls = controls
8. Camera above terrain at an angle, whole terrain visible

Let me think about the winding order for faces pointing UP (+Y):
- For a grid cell with corners at (x, z), (x+1, z), (x+1, z+1), (x, z+1):
- We need the normal to point +Y. Using right-hand rule, if we go counterclockwise when viewed from above (+Y looking down), that's the correct winding.
- Triangle 1: v0, v1, v2 (counterclockwise from above)
- Triangle 2: v0, v2, v3

Let me set up the grid coordinates:
- 128x128 vertices means 127x127 cells
- XZ plane from -10 to +10 (20x20 units)
- x[i] = -10 + i * 20/127
- z[j] = -10 + j * 20/127

Vertex index for (i, j): i + j * 128

For the height function, I'll use 3 sine/cosine layers:
- y = A1 * sin(f1*x + phase) * cos(f1*z + phase) + A2 * sin(f2*x) * sin(f2*z) + A3 * cos(f3*x + f3*z)
- With different frequencies and amplitudes summing to about 2 total amplitude

For vertex colors by height:
- Green (low) → Brown (middle) → White (high)
- Map height to 0-1 range, then interpolate colors

For winding pointing UP: When looking from +Y down, we want counterclockwise winding.
- v(i,j), v(i+1,j), v(i+1,j+1) - let me check: going right then down... 
- Actually, let me think more carefully. In Three.js, the front face is determined by the counter-clockwise winding when viewed from the front.
- For a face to point +Y (upward), when viewed from above (from +Y), the vertices should go counter-clockwise.

Let me define the grid:
- Row j goes from z=-10 to z=+10
- Col i goes from x=-10 to x=+10
- Vertex (i,j) is at position (x_i, height, z_j)

For cell (i,j), the four corners are:
- v0 = (i, j), v1 = (i+1, j), v2 = (i+1, j+1), v3 = (i, j+1)

In XZ plane from above:
- v0 is at (x_i, z_j) - top-left
- v1 is at (x_{i+1}, z_j) - top-right  
- v2 is at (x_{i+1}, z_{j+1}) - bottom-right
- v3 is at (x_i, z_{j+1}) - bottom-left

Counter-clockwise when viewed from above (+Y looking down at XZ plane):
- v0 → v3 → v2 (going left then down) - wait, let me think again.

Actually, in a standard XZ grid where z increases going "down" on screen when viewed from above:
- CCW from above would be: v0 → v1 → v2 → v3? No...

Let me use the cross product. For v0→v1 × v0→v2 to give +Y:
- v0→v1 = (+dx, 0, 0)
- v0→v2 = (+dx, 0, +dz)
- Cross = (0*dz - 0*0, 0*dx - (+dx)*dz, 0) = (0, -dx*dz, 0)

That gives -Y, so that's wrong. Let me try v0→v2 × v0→v1:
- That gives +Y. So the order should be v0, v2, v1? No wait, for a triangle v_a, v_b, v_c, the normal is (v_b - v_a) × (v_c - v_a).

For triangle (v0, v1, v2): normal = (v1-v0) × (v2-v0) = (+dx,0,0) × (+dx,0,+dz) = (0*dz - 0*0, 0*dx - dx*dz, 0) = (0, -dx*dz, 0) → pointing DOWN. Bad.

For triangle (v0, v2, v1): normal = (v2-v0) × (v1-v0) = (+dx,0,+dz) × (+dx,0,0) = (0*0-dz*0, dz*dx-0*dx, 0) = (0, dz*dx, 0) → pointing UP. 

So for the first triangle: v0, v2, v1? Or equivalently, the triangle order (v1, v0, v2)? Let me just be careful.

Actually, the standard approach: for triangle (a, b, c), normal = (b-a) × (c-a).
- (v0, v1, v2): (v1-v0)×(v2-v0) = (+dx,0,0)×(+dx,0,+dz) = (0, -dx*dz, 0) → -Y ❌
- (v0, v2, v1): (v2-v0)×(v1-v0) = (+dx,0,+dz)×(+dx,0,0) = (0*0-dz*0, dz*dx-0*dx, 0*0-0*dx) = (0, dx*dz, 0) → +Y ✓
- (v0, v3, v2): (v3-v0)×(v2-v0) = (0,0,+dz)×(+dx,0,+dz) = (0*dz-dz*0, dz*dx-0*dz, 0*0-0*dx) = (0, dx*dz, 0) → +Y ✓

So the triangles should be: (v0, v2, v1) and (v0, v3, v2).

Wait, let me double-check (v0, v3, v2):
- v3-v0 = (0, 0, +dz)
- v2-v0 = (+dx, 0, +dz)
- Cross: ((0)(+dz) - (0)(+dz), (0)(+dx) - (0)(+dz), (0)(0) - (0)(+dx)) = (0, 0, 0)? 

Hmm, let me redo this more carefully.
v3 - v0 = (0, 0, dz)
v2 - v0 = (dx, 0, dz)

Cross product (v3-v0) × (v2-v0):
x: (0)(dz) - (dz)(0) = 0
y: (dz)(dx) - (0)(dz) = dx*dz
z: (0)(0) - (0)(dx) = 0

So normal = (0, dx*dz, 0) → +Y ✓ Great.

So triangles: (v0, v2, v1) and (v0, v3, v2).

Let me now write the code. I need to be careful with strict TypeScript.

For the height function:
- Layer 1: 1.0 * sin(0.5*x) * cos(0.3*z)
- Layer 2: 0.7 * sin(1.2*x + 0.8*z)
- Layer 3: 0.3 * cos(2.0*x) * sin(1.5*z)
Total max amplitude ~ 2.0

For vertex colors:
- Map height from -2 to +2 (approximately) to [0, 1]
- t < 0.4: green (0.2, 0.7, 0.2)
- 0.4-0.7: interpolate green to brown (0.6, 0.4, 0.2)
- 0.7-1.0: interpolate brown to white (1.0, 1.0, 1.0)

Let me write the complete file now.
