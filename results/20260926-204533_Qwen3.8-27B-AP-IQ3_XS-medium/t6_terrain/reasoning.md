Let me build this step by step:

1. Create a 128x128 vertex grid on a 20x20 unit XZ plane centered at origin
2. Height function: sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer: two triangles per grid cell with upward-facing winding
4. computeVertexNormals()
5. Vertex colors by height: green (low), brown (middle), white (high)
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping
9. Camera above terrain at an angle, whole terrain visible

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- X range: -10 to 10 (20 units centered at origin)
- Z range: -10 to 10
- Step: 20/127 for both X and Z

Height function (3 sine/cosine layers):
- Layer 1: sin(x * freq1) * cos(z * freq1) * amp1
- Layer 2: sin(x * freq2 + z * freq2) * amp2
- Layer 3: cos(x * freq3 + z * freq3) * amp3
- Total amplitude ~2

Let me pick:
- Layer 1: amplitude 1.0, frequency 0.5 (wavelength ~12.6 units)
- Layer 2: amplitude 0.7, frequency 1.5 (wavelength ~4.2 units)
- Layer 3: amplitude 0.3, frequency 3.0 (wavelength ~2.1 units)
- Total max: 1.0 + 0.7 + 0.3 = 2.0

Index buffer for upward-facing triangles:
For a grid where vertices are numbered row by row:
- vertex(i, j) = i * 128 + j where i is the X index (0..127) and j is the Z index (0..127)

Wait, let me think about this more carefully. Let me define:
- i goes from 0 to 127 (X direction)
- j goes from 0 to 127 (Z direction)
- vertex index = i * 128 + j

For cell (i, j) where i is 0..126 and j is 0..126:
- v0 = i * 128 + j       (bottom-left)
- v1 = (i+1) * 128 + j   (bottom-right)
- v2 = i * 128 + (j+1)   (top-left)
- v3 = (i+1) * 128 + (j+1) (top-right)

For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above.

Looking from above (+Y looking down at -Y):
- X goes right, Z goes... let's say Z goes "into" the screen (away from viewer)
- Actually in Three.js, +X is right, +Z is towards the camera (out of screen)

Wait, let me think about this differently. In Three.js:
- +X is right
- +Y is up
- +Z is towards the viewer (out of screen)

For a face to point UP (+Y normal), when looking from above (looking down in -Y direction):
- The vertices should be in counter-clockwise order

Let me set up the grid:
- X goes from -10 to 10 (left to right)
- Z goes from -10 to 10

For cell (i, j):
- v0 at (x_i, z_j) - let's say lower x, lower z
- v1 at (x_{i+1}, z_j) - higher x, lower z
- v2 at (x_i, z_{j+1}) - lower x, higher z
- v3 at (x_{i+1}, z_{j+1}) - higher x, higher z

Looking from above (top view, +Y looking down):
- v0 is bottom-left
- v1 is bottom-right
- v2 is top-left
- v3 is top-right

For CCW winding from above:
- Triangle 1: v0, v2, v1 (bottom-left, top-left, bottom-right) - is this CCW?
  - From above: v0 is at bottom-left, v2 is at top-left, v1 is at bottom-right
  - Going v0 -> v2 -> v1: that's going up-left then right-down... 
  - Actually let me think in terms of the cross product.
  
Normal = (v1 - v0) × (v2 - v0) for triangle (v0, v1, v2)
- v0 = (x0, y0, z0)
- v1 = (x1, y1, z0)
- v2 = (x0, y2, z1)

For triangle (v0, v1, v2):
- Edge 1: v1 - v0 = (dx, dy1, 0)
- Edge 2: v2 - v0 = (0, dy2, dz)
- Cross: (dy1*dz - 0*dy2, 0*0 - dx*dz, dx*dy2 - dy1*0) = (dy1*dz, -dx*dz, dx*dy2)
  
For upward normal (+Y), we need the Y component to be positive: -dx*dz > 0, so dx*dz < 0.
But dx > 0 and dz > 0, so -dx*dz < 0. That gives a downward normal.

So triangle (v0, v1, v2) gives downward normal. We need to reverse: (v0, v2, v1) or (v2, v0, v1).

Let me use:
- Triangle 1: v0, v2, v3 (bottom-left, top-left, top-right)
  - Edge 1: v2 - v0 = (0, dy2, dz)
  - Edge 2: v3 - v0 = (dx, dy3, dz)
  - Cross: (dy2*dz - dz*dy3, dz*dx - 0*dz, 0*dy3 - dy2*dx) = (dy2*dz - dz*dy3, dx*dz, -dy2*dx)
  - Y component: dx*dz > 0 ✓ (upward)

- Triangle 2: v0, v3, v1 (bottom-left, top-right, bottom-right)
  - Edge 1: v3 - v0 = (dx, dy3, dz)
  - Edge 2: v1 - v0 = (dx, dy1, 0)
  - Cross: (dy3*0 - dz*dy1, dz*dx - dx*0, dx*dy1 - dy3*dx) = (-dz*dy1, dx*dz, dx*(dy1-dy3))
  - Y component: dx*dz > 0 ✓ (upward)

So the indices for each cell (i, j):
- v0 = i * 128 + j
- v1 = (i+1) * 128 + j
- v2 = i * 128 + (j+1)
- v3 = (i+1) * 128 + (j+1)

Triangle 1: v0, v2, v3
Triangle 2: v0, v3, v1

Number of indices: 127 * 127 * 6 = 96,762

Vertex colors by height:
- Need to normalize height to [0, 1] or use min/max
- Green (low): rgb(0, 1, 0) or similar
- Brown (middle): rgb(0.6, 0.4, 0.2)
- White (high): rgb(1, 1, 1)

I'll use a simple interpolation. Let me compute the height range first (min and max of the height function) and then map.

Actually, let me just compute the heights, find min/max, and then interpolate colors.

For the height function:
```
function height(x: number, z: number): number {
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
  const h2 = Math.sin(x * 1.5 + z * 1.5) * 0.7;
  const h3 = Math.cos(x * 3.0 + z * 3.0) * 0.3;
  return h1 + h2 + h3;
}
```

Max possible: 1.0 + 0.7 + 0.3 = 2.0
Min possible: -2.0

For colors, I'll normalize t = (h - minH) / (maxH - minH) where minH and maxH are computed from actual vertex data.

Let me write the full code now.

Camera position: above the terrain at an angle. Terrain is 20x20, so camera at something like (0, 15, 15) looking at origin. That should show the whole terrain.

Let me make sure the code compiles with strict mode. I need to be careful with types.

Let me write it out:
