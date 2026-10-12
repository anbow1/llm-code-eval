A straightforward physics sim. Write it.

Ball-ball elastic collision with masses:
- normal n = (p2-p1)/d
- relative velocity along normal vn = dot(v2-v1, n)
- if vn < 0 (approaching): impulse j = -(1+e)*vn / (1/m1 + 1/m2), with e=1: j = -2*vn/(1/m1+1/m2)
- v1 -= j/m1 * n... careful sign. Standard: j = -(1+e)*vn / (invM1+invM2); v1 -= (j*invM1)*n; v2 += (j*invM2)*n. With vn = dot(v2-v1,n). Check: if approaching, vn<0, j>0, v1 -= j/m1 n means v1 moves away from 2? n points from 1 to 2. v1 should move in -n direction: v1 -= j/m1*n with j>0 gives v1 decreasing along n — correct. v2 += j/m2 n — correct.

Positional correction: separate overlapping pairs by pushing apart proportional to inverse mass. Also clamp positions inside box and reflect velocities if penetration into wall.

Substeps: fixed dt substeps, e.g. step(dt) does N substeps with h = dt/N, N = ceil(dt/0.004) or fixed like 4.

Also handle wall collision: for each axis, if pos - r < -5 and v < 0: pos = -5 + r, v = -v. Similarly +5.

Start positions: rejection sampling for non-overlap.

Write the code.