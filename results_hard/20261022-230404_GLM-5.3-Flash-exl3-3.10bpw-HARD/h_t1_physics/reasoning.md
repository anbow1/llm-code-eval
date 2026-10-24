Standard elastic collision physics. Write single TS file.

Ball-ball elastic collision with masses:
- normal n = (p2-p1)/|p2-p1|
- relative velocity along normal: vn = dot(v2-v1, n)
- if vn < 0 (approaching): impulse j = -(1+e)*vn / (1/m1 + 1/m2), e=1
- v1 -= j/m1 * n; v2 += j/m2 * n
Wait signs: vn = dot(v1 - v2, n) approaching if vn > 0? Let me use standard: relative velocity vRel = v1 - v2, along normal from 2 to 1... I'll do: n = (p1-p2)/d. vRel = dot(v1-v2, n). If vRel < 0 approaching. j = -(1+e)*vRel/(1/m1+1/m2). v1 += j/m1*n; v2 -= j/m2*n.

Wall collision: if p - r < -5 and v<0 → v = -v, p = -5 + r. Similarly positive.

Positional correction for overlaps to avoid sticking.

Substeps: split dt into e.g. fixed substep of 1/240s or ceil.

Write code.