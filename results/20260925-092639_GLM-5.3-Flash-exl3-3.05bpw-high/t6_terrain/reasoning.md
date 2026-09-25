Create terrain with 256 triangles etc. Build indices with winding for +Y normals. For a plane in XZ with y up, counterclockwise when viewed from above (+Y). Vertex at (ix, iz). Grid: x = ix * (sizeX/(nx-1)) - halfx.

Winding: viewed from +Y looking down, with x to the right and z toward viewer... Let's define: for cell with corners a=(ix,iy), b=(ix+1,iy), c=(ix,iy+1), d=(ix+1,iy+1) where iy indexes z. Triangles: a, c, b and b, c, d gives counterclockwise when viewed from above? Compute normal for triangle a=(0,0,0), c=(0,0,1), b=(1,0,0): cross(c-a, b-a) = cross((0,0,1),(1,0,0)) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Yes +Y. So triangles: (a, c, b), (b, c, d). Wait check second: b=(1,0,0), c=(0,0,1), d=(1,0,1): cross(c-b, d-b) = cross((-1,0,1),(0,0,1)) = (0*1-1*0, 1*0-(-1)*1, 0) = (0,1,0). Good.

Colors: green at low, brown middle, white high based on normalized height.

Camera above at angle, terrain visible: position (26, 18, 26), lookAt origin, terrain 20x20 so fits.