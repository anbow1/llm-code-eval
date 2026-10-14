Let me build a procedural terrain using hand-made BufferGeometry with a 128x128 grid of vertices. Let me plan this carefully:

1. Grid: 128x128 vertices, 20x20 units in XZ, centered at origin
   - So x ranges from -10 to 10, z ranges from -10 to 10
   - 128 vertices per axis means 127 cells per axis

2. Height function: sum of 3 sine/cosine layers with different frequencies, amplitude ~2

3. Index buffer: two triangles per grid cell, winding faces up (+Y)
   - For upward-facing normals, we need counter-clockwise winding when viewed from above (which is CCW from +Y looking down)
   - For a quad with vertices at (x,z), (x+1,z), (x+1,z+1), (x,z+1):
     - Triangle 1: (x,z), (x+1,z), (x+1,z+1) - CCW from above
     - Triangle 2: (x,z), (x+1,z+1), (x,z+1) - CCW from above

4. computeVertexNormals() after setting up geometry

5. Vertex colors: green (low), brown (middle), white (high) - use height to interpolate

6. MeshStandardMaterial with vertexColors: true

7. Lights: AmbientLight + DirectionalLight

8. OrbitControls with damping, updated every frame

9. Camera positioned above at an angle

Let me write the code:

For the height function, I'll use 3 layers of sine/cosine:
```
function height(x, z) {
  let h = 0;
  h += 0.8 * Math.sin(x * 0.7 + z * 0.5);
  h += 0.6 * Math.cos(x * 1.3 - z * 0.9);
  h += 0.6 * Math.sin((x + z) * 0.4);
  return h;
}
```
Total amplitude ~2.0

For vertex colors based on height:
- Normalize height to [0, 1]
- Green (0.2, 0.6, 0.2) for low
- Brown (0.5, 0.3, 0.15) for middle
- White (0.9, 0.9, 0.9) for high

Let me code this up. The grid is 128x128 vertices, so:
- positions: Float32Array(128 * 128 * 3)
- normals: Float32Array(128 * 128 * 3)
- colors: Float32Array(128 * 128 * 3)
- indices: Uint32Array(127 * 127 * 6)

For winding that makes faces point UP (+Y):
Looking from above (down at -Y), CCW winding = CCW when projected onto XZ plane viewed from +Y.

For a cell at grid position (i, j):
- v0 = (i, j) → position (x, y, z)
- v1 = (i+1, j) → position (x+dx, y, z)
- v2 = (i+1, j+1) → position (x+dx, y, z+dz)
- v3 = (i, j+1) → position (x, y, z+dz)

Triangle 1: v0, v1, v2 (CCW from above)
Triangle 2: v0, v2, v3 (CCW from above)

Let me verify: v0=(0,0), v1=(1,0), v2=(1,1) in grid coords. Cross product of (v1-v0) × (v2-v0) = (1,0,0) × (1,0,1)... wait, I need to think in 3D.

Actually in the XZ plane with Y up:
v0 = (x0, h0, z0), v1 = (x0+dx, h1, z0), v2 = (x0+dx, h2, z0+dz)

The face normal = (v1-v0) × (v2-v0). For flat terrain:
(v1-v0) = (dx, 0, 0), (v2-v0) = (dx, 0, dz)
Cross = (0*dz - 0*0, 0*dx - dx*dz, dx*0 - 0*dx) = (0, -dx*dz, 0)

If dx>0 and dz>0, then cross_y = -dx*dz < 0, meaning normal points DOWN. That's wrong.

So I need to flip the winding. Let me use:
Triangle 1: v0, v2, v1
Triangle 2: v0, v3, v2

Cross of (v2-v0) × (v1-v0) = (dx, 0, dz) × (dx, 0, 0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → points UP. Good.

Triangle 2: (v3-v0) × (v2-v0) = (0, 0, dz) × (dx, 0, dz) = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dz*dx, 0) → UP. Good.

So indices:
- tri1: v0, v2, v1
- tri2: v0, v3, v2

Let me write the full code now.

For the import of OrbitControls: `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`

Let me make sure the code compiles with --strict. I need to be careful with types.

Let me finalize:
