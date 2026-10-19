Standard elastic collision physics. Write carefully with TypeScript strict.

Balls: plain objects {x,y,z,vx,vy,vz,r,m}. Physics step with substeps. Wall collision: reflect velocity if position - r < -5 or + r > 5, clamp position. Ball-ball: if dist < 2r, elastic collision along normal using masses; separate overlap.

Elastic collision between two balls: normal n, relative velocity along normal vrel = (v1-v2)·n. If approaching (vrel > 0 with n from ball2 to ball1... define carefully). Standard impulse: j = -(1+e)*vRel·n / (1/m1 + 1/m2), with n pointing from ball1 to ball2? Let me define: n = (p2-p1)/d. relative velocity vRel = v1 - v2? Let's do: vRelN = (v1 - v2)·n. If vRelN > 0 they approach? If ball1 moving toward ball2 along n, v1·n > v2·n, so approaching when vRelN > 0. Impulse magnitude j = 2*vRelN/(1/m1+1/m2) (for e=1). Apply v1 -= j/m1 * n; v2 += j/m2 * n. Check: momentum conserved; energy: yes for e=1.

Separate overlap: push apart along n proportional to inverse masses to touch exactly (dist = 2r + tiny epsilon).

Substeps: e.g., fixed dt with max substep length like 1/240, clamp count.

Write the code.