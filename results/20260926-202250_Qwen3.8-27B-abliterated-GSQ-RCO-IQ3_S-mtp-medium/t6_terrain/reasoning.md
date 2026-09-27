Need to write a single TS file. Manually build BufferGeometry, set positions, indices, colors, computeVertexNormals, material, lights, OrbitControls, resize, animation loop, __ready after the first frame.

Winding order for upward-facing faces: a grid cell with vertices (x,z), (x+1,z), (x,z+1), (x+1,z+1). Upward-facing: counter-clockwise (CCW) as seen from +Y. Triangle 1: (i), (i+1), (i+cols+1)? Let me check: vertices at (0,0), (1,0), (0,1), (1,1). As seen from above (viewing down the -Y direction from +Y), is CCW (counter-clockwise) in the XZ plane when Y is up and viewed from +Y... viewed from above, X is right, Z is toward the viewer (downward on screen). The CCW as seen from +Y (looking down -Y) means the normal is +Y. Triangle (0,0), (0,1), (1,1): vectors a = v1-v0 = (0,0,1), b = v2-v0 = (1,0,1), normal = a×b = (0*1-1*0, 1*1-0*1, 0*0-0*1) = (0,1,0). Good. So the triangles are (a, b, d) and (b, c, d), where a=(i), b=(i+cols+1)? Let's define idx(x,z) = z*cols + x. For cell (x, z): a = idx(x,z), b = idx(x,z+1), c = idx(x+1,z), d = idx(x+1,z+1). Triangles (a,b,d) and (b,c,d).

Colors: green (low) → brown (mid) → white (high). Height range is roughly ±2 or so. Normalize by amplitude.

Amp ~2: y = 2*(sin(x*0.6)*cos(z*0.5) + ... ) — sum of 3 layers, maybe total amplitude 2. Keep it simple: y = Math.sin(x*0.5)*Math.cos(z*0.4)*0.8 + Math.sin(x*1.3+z*0.7)*0.7 + Math.cos(x*0.9 - z*1.1)*0.5, max total ~2.

Camera: position (18, 18, 18), target (0,0,0).

Colors: low green (0.15,0.5,0.15), mid brown (0.55,0.4,0.25), high white. Interpolation: t = clamp((h + 1.5)/3, 0,1). If t < 0.5, lerp green→brown, otherwise lerp brown→white.

__ready: set it after the first frame inside the render loop, with a guard.

Resize handler. setAnimationLoop with a clock.

Strict TS: typing is fine.
