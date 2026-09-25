The user wants a procedural terrain built from a hand-made BufferGeometry. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. Call computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
6. AmbientLight + DirectionalLight
7. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as (window as any).__controls
8. Camera above terrain at an angle, whole terrain visible
9. Must compile with tsc --strict
10. No external assets
11. Use setAnimationLoop
12. Expose scene, camera, renderer, controls on window
13. Set __ready after first frame

Let me think about the index winding. For a grid cell with vertices:
- bottom-left (i, j), bottom-right (i+1, j), top-left (i, j+1), top-right (i+1, j+1)

For faces pointing UP (+Y), the normal should point in +Y direction. Using the right-hand rule, vertices should be counter-clockwise when viewed from above (+Y looking down).

Let me define vertex indices. For a grid position (col, row) where col is X and row is Z:
- v00 = (col, row) - bottom-left in XZ
- v10 = (col+1, row) - bottom-right in XZ (higher X)
- v01 = (col, row+1) - top-left in XZ (higher Z)
- v11 = (col+1, row+1) - top-right in XZ

For a triangle with vertices v00, v10, v01:
- edge1 = v10 - v00 = (+dx, 0, 0)
- edge2 = v01 - v00 = (0, 0, +dz)
- cross product: edge1 × edge2 = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

Hmm, that points in -Y. Let me reconsider.

Actually wait, let me re-examine. If we have:
- v00 at (x, y, z)
- v10 at (x+dx, y, z)  -- higher X
- v01 at (x, y, z+dz)  -- higher Z

Cross product (v10 - v00) × (v01 - v00):
= (dx, 0, 0) × (0, 0, dz)
= (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0)
= (0, -dx*dz, 0)

That's -Y. So for UP-facing normals, we need the winding to be v00, v01, v10 (swap the last two).

Let me check: (v01 - v00) × (v10 - v00) = (0, 0, dz) × (dx, 0, 0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dx*dz, 0) -- that's +Y. Good.

So triangle 1: v00, v01, v10 (counter-clockwise from top)
Triangle 2: v10, v01, v11

Let me verify triangle 2: (v01 - v10) × (v11 - v10) = (-dx, 0, dz) × (0, 0, dz)
Wait, v11 - v10 = (0, 0, dz), v01 - v10 = (-dx, 0, dz)
(-dx, 0, dz) × (0, 0, dz) = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0) -- +Y. Good.

Actually let me just use the standard: for a quad (a, b, c, d) going counter-clockwise from above:
- a = v00, b = v10, c = v11, d = v01

Triangle 1: a, d, c (v00, v01, v11) -- hmm let me just go with what works.

Let me use:
- Triangle 1: v00, v01, v10
- Triangle 2: v10, v01, v11

And verify with cross products for the actual vertex positions (with heights):

Actually computeVertexNormals() will handle the normals. The key is just getting the winding right. Let me use the standard approach:

For a quad with vertices:
- bottom-left (bl), bottom-right (br), top-right (tr), top-left (tl)

Going counter-clockwise from above (looking down -Y):
- Triangle 1: bl, tl, tr
- Triangle 2: bl, tr, br

Wait, counter-clockwise from above means... if I'm looking from +Y down at the XZ plane:
- X goes right, Z goes... hmm, depends on orientation.

In Three.js, the default camera looks along -Z. So looking from +Y down:
- X goes right
- Z goes... in a standard right-hand coordinate system, Z would go "into" the screen when looking from +Y.

Actually, let me just think about it more simply. For a face normal pointing +Y, using the right-hand rule, the vertices should go counter-clockwise when viewed from the +Y side (looking down).

If I'm at +Y looking down at the XZ plane:
- +X is to the right
- +Z is... in Three.js, with the default camera, +Z is toward the viewer. But when looking from +Y, we need to figure out the screen orientation.

Let me just try: vertices in order (0,0), (1,0), (1,1), (0,1) in XZ coordinates. Going from (0,0)→(1,0)→(1,1)→(0,1) - is that clockwise or counter-clockwise?

In a standard 2D plane where X goes right and Y goes up (in 2D), (0,0)→(1,0)→(1,1)→(0,1) is counter-clockwise. But in our XZ plane viewed from above (+Y), Z might be "up" in screen space or "down" depending on convention.

You know what, let me just use the cross product formula directly. For vertices at positions (ignoring height for now):
- v00 = (0, 0, 0)
- v10 = (1, 0, 0) -- +X
- v01 = (0, 0, 1) -- +Z

For triangle (v00, v01, v10): normal = (v01-v00) × (v10-v00) = (0,0,1) × (1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0, 1, 0) -- YES, +Y!

For triangle (v10, v01, v11): v11 = (1, 0, 1)
normal = (v01-v10) × (v11-v10) = (-1,0,1) × (0,0,1) = (0*1-1*0, 1*0-(-1)*1, (-1)*0-0*0) = (0, 1, 0) -- YES, +Y!

So:
- Triangle 1: v00, v01, v10
- Triangle 2: v10, v01, v11

Where v00 = (col, row), v10 = (col+1, row), v01 = (col, row+1), v11 = (col+1, row+1)
And "col" maps to X, "row" maps to Z.

Now let me build the full TypeScript file.

For vertex index at (col, row) in a 128x128 grid: index = row * 128 + col (or col * 128 + row, doesn't matter as long as consistent).

Let me use index = row * GRID_SIZE + col, where GRID_SIZE = 128.

For position: 
- x = -10 + (col / (GRID_SIZE - 1)) * 20  -- from -10 to +10
- z = -10 + (row / (GRID_SIZE - 1)) * 20  -- from -10 to +10
- y = height function

For colors:
- low height → green
- middle height → brown
- high height → white

Let me write the height function with 3 sine/cosine layers:
```
h = sin(x * 0.5) * 0.7 + cos(z * 0.8) * 0.6 + sin((x + z) * 1.2) * 0.7
```
This gives amplitude roughly 0.7 + 0.6 + 0.7 = 2.0 max.

For colors, I'll normalize height to [0, 1] and interpolate:
- t < 0.33: green (0, 0.5, 0) to brown (0.5, 0.3, 0.1)
- t > 0.66: brown to white (1, 1, 1)

Let me now write the complete file, making sure it compiles with strict TypeScript.

I need to be careful with types. Let me use Float32Array for positions, normals, colors, and Uint32Array for indices (or Uint16Array since 128*128 = 16384 < 65536, so Uint16Array is fine).

Actually 128*128 = 16384 vertices, and for indices we have 127*127*6 = 96774 indices. Uint16Array max is 65535, and 16384 > 65535? No, 16384 < 65535, so Uint16Array is fine for vertex indices.

Wait, actually let me double-check: 128*128 = 16384. Uint16Array can hold values 0 to 65535. 16384 < 65536, so yes Uint16Array works.

Let me write the code now.
