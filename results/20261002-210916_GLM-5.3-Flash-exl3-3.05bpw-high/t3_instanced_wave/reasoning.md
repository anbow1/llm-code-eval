Write the code. Colors gradient by grid position — set once. Wave updates per frame with reusable Object3D or Matrix4. Also color could animate but requirement says set color gradient once — keep it. Maybe animate colors too? Requirement only says give each instance its own color with setColorAt. I'll set once.

Camera at angle. Grid centered: x from -49.5 to 49.5? Use spacing 1.2, positions (i - 50 + 0.5)*spacing. Distance from center of grid (0,0).

Use dummy Object3D, matrix reuse. Compile strict.