Standard elastic collision between balls. Wall bounce with restitution 1. Substeps. Let me write the code.

Collision response: relative velocity along normal, if approaching, impulse j = -(1+e) * velAlongNormal / (1/m1 + 1/m2). Apply. Also separate overlaps positionally.

Ball-ball: only move balls that are actually overlapping? Simpler: positional correction split by mass.

Non-overlap start: grid placement with jitter — 20 balls, radius 0.4. Place on a grid in [-4,4] with spacing ~2, pick random unique cells within inner box [-4.5,4.5] minus radius... Actually positions must be fully inside box: |x| <= 5 - 0.4 = 4.6. Use grid cells in [-3.6, 3.6] with spacing 1.8, jitter small so distance stays > 0.8. Simplest: grid 3x3x3 minus... 20 <= 27, pick 20 distinct cells from a 3x3x3 grid of positions at {-3, 0, 3}? Distance between adjacent = 3 > 0.8, fine. Shuffle, take 20. Jitter ±0.5 keeps min distance 3-1.0=2 > 0.8. Good.

Substeps: divide dt into e.g. 4 substeps, or compute based on max speed. Use fixed substeps = 4.

step(dt): substeps each dt/n; move, wall collide, ball collide (resolve pairs). For ball pairs: separate overlap positionally (push apart by half overlap each, weighted by inverse mass) and resolve velocity with impulse.

Write code.