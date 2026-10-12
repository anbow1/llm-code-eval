Standard elastic collision physics. Write one TS file.

Key points: balls array of plain objects (live state), step(dt) with substeps, wall collisions elastic (reflect velocity component, position clamp), ball-ball elastic collision with mass-based exchange along normal, positional separation for overlaps.

Elastic ball-ball collision: relative velocity along normal; if approaching, impulse j = -(1+e) * vRel·n / (1/m1 + 1/m2), e=1. Apply ± j/m. Also separate positions proportionally to inverse masses.

Wall: if x - r < -5, set x = -5 + r, vx = |vx|. etc.

Substeps: e.g. max move per substep, use fixed substep like 1/120 or compute n = ceil(dt / 0.005) capped.

Camera at (12, 12, 16) looking at origin, or simpler position (10,10,12).

Non-overlap start: rejection sampling.

Write code.