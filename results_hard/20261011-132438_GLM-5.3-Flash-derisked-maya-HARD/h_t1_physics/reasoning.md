Simple implementation. Balls with radius 0.4, 20 balls, non-overlapping start positions via rejection sampling. Elastic collisions: wall reflections, ball-ball using standard impulse formula for equal restitution 1: relative velocity along normal, j = -(1+e)*vrel_n / (1/m1 + 1/m2) with e=1. Separate overlaps by pushing apart proportional to inverse mass.

Substeps: step(dt) does e.g. ceil(dt/0.005) substeps.

Box from -5 to 5. Balls fully inside: positions in [-5+r, 5-r]. Wall collision: if x - r < -5, x = -5 + r, vx = |vx|; etc.

Camera at like (10, 8, 12) looking at origin, fov 45.

Ready flag after first frame: set in animation loop after first render.

Write code.