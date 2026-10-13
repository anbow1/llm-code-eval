Need to write TypeScript strict-compliant Three.js code. Non-indexed or indexed? Use indexed via setIndex. 128x128 vertices grid, 20x20 units. Winding: for faces pointing up (+Y), with default camera orientation... Standard: triangles (a, b, c) counterclockwise when viewed from above. Grid indices: for cell (x,z), a = z*128+x, b = a+1, c = a+128, d = c+1. Faces: (a, c, b) and (b, c, d) — check winding.

Coordinates: x increases with column index, z increases with row index. Viewed from +Y looking down, with x right and z toward viewer... CCW from above (looking down -Y): need to be careful. A triangle is front-facing if CCW when viewed from the side the normal points to. Normal should be +Y, so viewed from +Y looking down, vertices must be CCW.

In XZ plane viewed from above with x to the right and z downward (typical top view with standard right-handed coords: looking down -Y, x right, z... if camera looks along -Y, with up = -Z or whatever, but topologically: from above, going CCW means... In right-handed coords, normal +Y = cross of edge1 x edge2. Take triangle a=(x,z), b=(x+1,z), c=(x,z+1). edge1 = b-a = (+x). edge2 = c-a = (+z). cross((1,0,0),(0,0,1)) = (0*1-0*0, 0*0-1*1, 0) = (0,-1,0). That points down. So order a,b,c gives -Y normal. Use a,c,b: cross((0,0,1),(1,0,0)) = (0*0-1*0, 1*1-0*0, 0-0)= (0,1,0). Yes, (a, c, b) gives +Y.

So triangles: (a, c, b) and (b, c, d). Check second: b=(x,z), c=(x,z+1), d=(x+1,z+1). edge1 = c-b = (0,0,1), edge2 = d-b = (1,0,1). cross = (0*1-1*0... compute: (e1.y*e2.z - e1.z*e2.y, e1.z*e2.x - e1.x*e2.z, e1.x*e2.y - e1.y*e2.x) = (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1) = (0,1,0). Good.

Actually wait, but heights differ, so exact winding matters less, but base plane winding is what matters.

Height: sum of 3 sine layers, amplitude ~2 total. E.g.:
y = 0.6*sin(x*1.3+2.1)*cos(z*0.9) + 0.4*sin(z*1.7 + x*0.5) + 0.3*cos(x*2.2 - z*1.4) plus small noise? Keep simple: three layers, amplitude about 2. Let's do:

h = 1.0*sin(x*0.9)*cos(z*0.7) + 0.6*sin(z*1.4 + x*0.8) + 0.4*cos(x*2.0 - z*1.1) → amplitude up to 2.0.

Colors: normalize height by max amplitude, map green→brown→white.

Set __ready after first frame: use a flag in animation loop.

Write code.