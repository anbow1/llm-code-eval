A straightforward physics sim. Write it.

Plan:
- Scene, camera, renderer, lights.
- Box edges via LineSegments with EdgesGeometry of BoxGeometry(10,10,10).
- 20 balls, radius 0.4, masses random 1..3, non-overlapping start positions (rejection sampling), fully inside box: |coord| <= 5 - 0.4.
- Velocities random direction, speed 2..4.
- step(dt): substeps (e.g. fixed substep 1/240, ceil), integrate positions, wall collisions (elastic: v flip on axis), ball-ball collisions: if dist < sum radii, separate positions proportionally to mass, then elastic collision along normal.
- Elastic collision impulse: j = -(1+e)*vRelN / (1/m1 + 1/m2), e=1.
- Keep meshes in sync.
- Pause handling.
- __ready after first frame.

Code it carefully with strict types.