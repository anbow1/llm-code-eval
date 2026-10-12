The user wants a procedural terrain built from a hand-made BufferGeometry with specific requirements:

1. 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height = sum of 3 sine/cosine layers, amplitude ~2
3. Index buffer with two triangles per grid cell, winding for faces pointing UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping, updated every frame
9. Camera above terrain at angle, whole terrain visible
10. Proper setup with renderer, resize handler, animation loop, __ready flag, etc.

Let me think about the index buffer winding. For a grid cell with vertices at (i,j), (i+1,j), (i,j+1), (i+1,j+1), to have faces pointing UP (+Y), the winding should be counter-clockwise when viewed from above (+Y looking down).

For vertex indices:
- A = (i, j) → top-left when viewed from above
- B = (i+1, j) → top-right
- C = (i, j+1) → bottom-left
- D = (i+1, j+1) → bottom-right

Wait, let me think in terms of XZ coordinates. X goes right, Z goes... let's say forward (away from camera). Looking from above (+Y), we see X going right and Z going down (or up depending on convention).

For CCW winding when viewed from +Y:
- Triangle 1: A, C, B (or equivalently A, C, D for one tri and A, D, B for another)

Actually, let me think more carefully. In Three.js, front face is CCW. Looking from +Y down:
- X goes right, Z goes... in standard math, Z would go "into" the screen, but in Three.js with a top-down view, Z goes "down" on screen.

For a quad with corners:
- (i,j), (i+1,j), (i,j+1), (i+1,j+1)

Looking from +Y, X is right and Z is down. So:
- (i,j) is top-left
- (i+1,j) is top-right  
- (i,j+1) is bottom-left
- (i+1,j+1) is bottom-right

CCW from above:
- Triangle 1: (i,j), (i,j+1), (i+1,j+1) → A, C, D
- Triangle 2: (i,j), (i+1,j+1), (i+1,j) → A, D, B

Wait, let me reconsider. Looking from +Y down at the XZ plane:
- X axis points right
- Z axis points... if we look from +Y down, Z points towards us (out of screen in standard right-hand). Actually in Three.js, camera looks along -Z by default. Looking from +Y down at XZ plane: X is right, Z is towards the viewer (down on screen if Z is up in screen space).

Actually, let me just think about it differently. The normal of a triangle with vertices A, B, C in CCW order (when viewed from the front) points towards the viewer. If we want the normal to point +Y (up), we need CCW when viewed from above.

From above (+Y looking down at XZ plane):
- X goes right
- Z goes "up" on screen (since we're looking down, +Z is away from us... no)

Hmm, let me just use the cross product. If we have:
- A = (x, y, z)
- B = (x+dx, y, z)  
- C = (x, y, z+dz)

Edge1 = B - A = (dx, 0, 0)
Edge2 = C - A = (0, 0, dz)

Normal = Edge1 × Edge2 = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

If dx > 0 and dz > 0, this gives (0, -something, 0), pointing DOWN. So A, B, C gives normal pointing DOWN.

For normal pointing UP: A, C, B gives Edge1 = C-A = (0,0,dz), Edge2 = B-A = (dx,0,0)
Normal = Edge1 × Edge2 = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → UP! 

So for a quad with vertices at grid (i,j), (i+1,j), (i,j+1), (i+1,j+1):
- Triangle 1: A(i,j), C(i,j+1), B(i+1,j) → CCW from above → normal UP
- Triangle 2: B(i+1,j), C(i,j+1), D(i+1,j+1) → check: Edge1=C-B=(-dx,0,dz), Edge2=D-B=(0,0,dz), Normal = (dz*dz - dz*0, dz*0-(-dz)*dz, ...) hmm let me redo.

Actually let me use a simpler approach. For the quad:
- v0 = index(i, j)
- v1 = index(i+1, j)
- v2 = index(i, j+1)
- v3 = index(i+1, j+1)

Triangle 1: v0, v2, v1 (A, C, B as above → UP)
Triangle 2: v1, v2, v3 (B, C, D)

Check Triangle 2: B=(dx,0,0) relative, C=(0,0,dz) relative, D=(dx,0,dz) relative from A
Edge1 = C - B = (-dx, 0, dz)
Edge2 = D - B = (0, 0, dz)
Normal = Edge1 × Edge2 = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0) → UP! ✓

Great, so:
- Triangle 1: v0, v2, v1
- Triangle 2: v1, v2, v3

Now for the height function with amplitude ~2, using 3 layers of sine/cosine:
y = sin(x * freq1) * cos(z * freq1) * amp1 + sin(x * freq2 + z * freq2) * amp2 + cos(x * freq3 - z * freq3) * amp3

Total amplitude should be about 2, so maybe amplitudes like 0.8, 0.7, 0.5.

For the grid: 128x128 vertices, 20x20 units. Spacing = 20 / 127 in both X and Z. Centered at origin means X goes from -10 to 10, Z goes from -10 to 10.

Vertex colors: I'll normalize height to [0,1] range and interpolate green → brown → white.

Let me write the complete file now.
