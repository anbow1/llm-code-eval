Create a TS file. A 128x128 vertex grid => indices are 127*127*6. Winding: looking from +Y, faces point upward. Standard: for cell (i,j), vertices are a=i+ (j)*N, etc. Define gridX = gridZ = 128, N=128. Position: x from -10 to 10.

Height function: a sum of 3 sine/cosine terms with an amplitude of roughly 2.

Colors: green at low elevation, brown in the middle, white at high elevations. Use interpolation based on normalized height.

Camera: position (14, 12, 14), lookAt 0.

Set ready after the first frame: use a flag inside the loop.

OrbitControls with damping, update with delta.

Make it strict-safe.
