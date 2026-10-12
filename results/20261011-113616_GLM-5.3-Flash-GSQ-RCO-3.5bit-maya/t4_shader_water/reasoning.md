Simple task. Write TypeScript with shader material, waves in vertex shader, height varying, color ramp in fragment. Plane rotated -PI/2 X. Camera at angle. Handle resize, animation loop, delta time, __ready after first frame.

Note: after rotating plane, vertex displacement in local space (z becomes world y). Displace along normal or local z — fine either way. Pass height varying.