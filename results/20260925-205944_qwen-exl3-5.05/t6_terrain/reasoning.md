The user wants a complete TypeScript file that creates a procedural terrain using hand-made BufferGeometry. Let me plan this out:

1. Import Three.js and OrbitControls
2. Create scene, camera, renderer
3. Build a 128x128 vertex grid (so 127x127 cells) spanning 20x20 units in XZ, centered at origin
4. Height = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
5. Index buffer with two triangles per cell, winding order so faces point UP (+Y)
6. computeVertexNormals()
7. Vertex colors based on height (green low, brown middle, white high)
8. MeshStandardMaterial with vertexColors: true
9. AmbientLight + DirectionalLight
10. OrbitControls with damping, updated every frame
11. Camera positioned above terrain at an angle
12. Handle resize
13. Use setAnimationLoop with delta time
14. Expose __scene, __camera, __renderer, __controls, __ready

Let me think about the winding order. For faces pointing UP (+Y), when looking from above (+Y direction), vertices should be in counter-clockwise order.

Grid: 128x128 vertices. Vertices are indexed as row-major: index = row * 128 + col.
- X ranges from -10 to 10 (20 units)
- Z ranges from -10 to 10 (20 units)

For a cell (row, col) with vertices:
- v00 = (row, col)
- v01 = (row, col+1)
- v10 = (row+1, col)
- v11 = (row+1, col+1)

For faces pointing UP, looking from +Y:
- Triangle 1: v00, v10, v11 (CCW when viewed from above)
- Triangle 2: v00, v11, v01 (CCW when viewed from above)

Wait, let me think more carefully. The X axis goes right, Z axis goes... let's say Z increases going "forward" (away from camera looking in -Z). Actually in Three.js, the default camera looks down -Z.

Let me think about it differently. If I'm looking down from +Y:
- X increases to the right
- Z increases... let's say towards the viewer (or away, depending on convention)

For CCW winding when viewed from +Y (normal pointing up):
- Going counter-clockwise means: if X is right and Z is towards viewer, then CCW is: right -> towards viewer -> left -> away

Actually, let me just think of it simply. For a face with normal +Y, the vertices when projected onto XZ plane should be in CCW order.

For a quad with corners:
- (x, z), (x+dx, z), (x+dx, z+dz), (x, z+dz)

In the XZ plane (looking from +Y down), X is right and Z is... if we look from +Y down, Z points towards us (out of screen) or away. Actually in a standard right-hand coordinate system looking from +Y down:
- X points right
- Z points towards viewer (out of screen)

So CCW in this view would be: right -> up (towards viewer) -> left -> down (away from viewer)

Wait, let me reconsider. Looking from +Y down at the XZ plane:
- X axis points right
- Z axis points... In right-hand rule, if Y is up, then X cross Y = Z, so Z points... X×Y = Z means if X is right and Y is up, Z points towards viewer.

Looking from +Y down: X is right, Z is towards viewer (down on screen if we're looking down).

CCW when viewed from +Y: that would be going in the direction: right -> down (towards viewer, +Z) -> left -> up (away, -Z).

For a quad with vertices at (x,z), (x+dx,z), (x+dx,z+dz), (x,z+dz):
- v00=(x,z), v01=(x+dx,z), v11=(x+dx,z+dz), v10=(x,z+dz)

CCW order looking from above: v00 -> v10 -> v11 -> v01 (going right then towards viewer then left then away)

Wait no. Let me be more careful. If looking from +Y:
- X goes right
- Z goes... let's say it goes "down" on the screen (towards viewer when looking from top)

CCW means: starting at top-left, go right, then down, then left, then up.

So for vertices:
- v00 = (x, z) - top-left
- v01 = (x+dx, z) - top-right  
- v11 = (x+dx, z+dz) - bottom-right
- v10 = (x, z+dz) - bottom-left

CCW order: v00 -> v01 -> v11 -> v10? No that's CW.

Actually, CCW when looking from +Y down at XZ plane where X is right and Z is down:
- Going CCW: start top-left, go bottom-left, bottom-right, top-right... no.

Let me just use the cross product to verify. For triangle (v00, v10, v11):
- edge1 = v10 - v00 = (0, 0, dz)
- edge2 = v11 - v00 = (dx, 0, dz)
- normal = edge1 × edge2 = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dz*dx, 0)

If dx > 0 and dz > 0, normal is (0, positive, 0) = +Y. 

So triangle (v00, v10, v11) has normal pointing +Y. 

For the second triangle, we need (v00, v11, v01):
- edge1 = v11 - v00 = (dx, 0, dz)
- edge2 = v01 - v00 = (dx, 0, 0)
- normal = edge1 × edge2 = (0*0 - dz*0, dz*dx - dx*0, dx*0 - 0*dx) = (0, dz*dx, 0)

Also +Y. 

So the two triangles per cell are:
- (v00, v10, v11)
- (v00, v11, v01)

Where:
- v00 = row * 128 + col
- v01 = row * 128 + (col+1)
- v10 = (row+1) * 128 + col
- v11 = (row+1) * 128 + (col+1)

Now for the height function, I'll use 3 sine/cosine layers:
- h = 0.7 * sin(x * 0.8) * cos(z * 0.6) + 0.5 * sin(x * 1.5 + z * 1.2) + 0.8 * cos(x * 0.3 - z * 0.4)

That gives amplitude roughly 0.7 + 0.5 + 0.8 = 2.0 max.

Vertex colors: height ranges roughly from -2 to 2.
- Low (negative/low): green
- Middle: brown
- High: white

I'll interpolate based on normalized height.

Let me write the complete file now.
