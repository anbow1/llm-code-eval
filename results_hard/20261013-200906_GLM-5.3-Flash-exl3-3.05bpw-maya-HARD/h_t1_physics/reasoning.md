Standard elastic collision physics. Write code.

Balls: radius 0.4, 20 balls in box 10 units. Positions non-overlapping: random attempts.

Collision resolution elastic with masses:
For pair, relative velocity along normal. If approaching (vn < 0), impulse j = -(1+e)*vn / (1/m1 + 1/m2), e=1. Apply. Then positional correction: separate overlap.

Walls: if x - r < -5, x = -5 + r, vx = -vx etc.

Substeps: e.g. fixed substep of 1/240 or split dt into n substeps based on max speed. Simple: substeps = 4 or compute. Use fixed substep count like ceil(dt / (1/240)) clamped.

Write the file.