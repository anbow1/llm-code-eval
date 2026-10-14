Build a hand-made BufferGeometry: 128x128 vertices, 20x20 units. Height via 3 sine/cosine layers. Indices with winding pointing +Y.

Winding: for CCW when viewed from above (+Y looking down), with x increasing right, z increasing toward viewer... Standard approach: grid indices i = z * N + x. Triangles: (a, b, d) and (a, d, c) where a = iz*N+ix, b = a+1, c = a+N, d = c+1 — check orientation. For +Y normals with standard grid: positions x = ix*dx - half, z = iz*dz - half. Vertex a at (x, z), b at (x+dx, z), c at (x, z+dz), d at (x+dx, z+dz). Triangle (a, c, b): cross of (c-a)=(0,0,dz) and (b-a)=(dx,0,0): (0,0,dz)×(dx,0,0) = (0*0 - dz*0, dz*dx - 0*0, 0) = (0, dz*dx, 0)? Compute cross: (c-a)×(b-a) = (0,dz... let's compute properly. v1 = (0, 0, dz), v2 = (dx, 0, 0). Cross v1×v2 = (v1.y*v2.z - v1.z*v2.y, v1.z*v2.x - v1.x*v2.z, v1.x*v2.y - v1.y*v2.x) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → +Y. Good. So triangle (a, c, b) and then (b, c, d): check (b,c,d): v1 = c - b = (-dx, 0, dz), v2 = d - b = (0, 0, dz). cross = (0*dz - dz*0, dz*0 - (-dx)*dz, ...) = (0, dx*dz, ...) → +Y. Good.

Colors: green low, brown mid, white high, smooth interpolation over height normalized.

Colors as Float32Array with 3 components; material vertexColors: true.

Camera: position like (14, 12, 14), look at origin.

Set __ready after first render: use a flag in the animation loop callback.

Write code.