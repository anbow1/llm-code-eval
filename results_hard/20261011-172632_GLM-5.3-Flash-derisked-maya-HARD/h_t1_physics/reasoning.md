Simple implementation. Balls with radius 0.4, box half extent 5 - 0.4 = 4.6. Start positions non-overlapping: use rejection sampling or grid. Elastic collisions: swap velocity components along normal proportional to masses (standard impulse for equal restitution 1).

step(dt): substeps: n = Math.ceil(dt/0.005) or fixed substep count, e.g. substeps = Math.max(1, Math.ceil(dt/0.005)); h = dt/substeps.

Ball-ball collision: if dist < 2r, separate by half each (relative masses), compute impulse.

Wall collision: reflect velocity, clamp position.

Write code.