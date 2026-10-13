Hand-made BufferGeometry: 128x128 vertices, indices 127*127*2 triangles. Build positions, indices with correct winding for +Y normals. For a grid with x increasing and z increasing, triangles (a, b, d) etc. Let's define vertices at (ix, iz), index = iz*128 + ix. Position x = ix/127*20 - 10, z = iz/127*20 - 10.

Winding: for triangle with vertices v00 (ix,iz), v10 (ix+1,iz), v01 (ix,iz+1), v11 (ix+1,iz+1). Up-facing (counter-clockwise when viewed from +Y looking down... actually counter-clockwise when viewed from above means normal points up). Viewed from +Y looking down, x to the right, z... In right-handed coords, cross product. Triangle (v00, v01, v10): edges e1 = v01-v00 = (0,0,dz), e2 = v10-v00 = (dx,0,0). Normal = e1 × e2 = (0,0,dz)×(dx,0,0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → +Y. Good. So triangle (v00, v01, v11) and (v00, v11, v10): check (v00, v11, v10): e1 = v11-v00 = (dx,0,dz), e2 = v10-v00 = (dx,0,0). cross = (0*0 - dz*0, dz*dx - dx*0, dx*0 - 0*dx) = (0, dz*dx, 0) → +Y. Good.

Height function: sum of sine layers amplitude ~2.

Vertex colors by height: green low, brown middle, white high. Normalize height over [-max, max].

Camera at position like (14, 12, 14), look at origin. OrbitControls damping, update each frame with delta-based? controls.update() each frame.

Ready flag after first frame rendered: set flag in loop after render, first iteration.

Code it.