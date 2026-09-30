Standard equal-mass-free elastic collision with masses. Implement step with substeps; substep count based on dt. Positional correction for overlaps along normal.

Let me write it.

Collision response between balls: normal n, relative velocity along n, impulse j = -(1+e)*vRel·n / (1/m1 + 1/m2), e=1. Positional correction: separate by overlap*0.5 each weighted by inverse mass.

Walls: if x - r < -5 => x = -5 + r, vx = -vx if vx<0; etc. Need velocity reflection only when moving toward wall.

Substeps: e.g. 4 per step, dt/4 each. Also cap speeds fine.

Non-overlap start: random positions with min distance 2*r. Retry loop with max attempts; 20 balls radius 0.4 in 10-cube, easy.

Camera at (10, 8, 12) look at origin, fov 50.

__ready after first frame: use a flag in animation loop; set after first render.