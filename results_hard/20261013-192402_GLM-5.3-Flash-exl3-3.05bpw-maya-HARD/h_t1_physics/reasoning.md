Create a single TS file. Ball-ball elastic collision with masses: standard impulse along normal: j = -(1+e)*vRel·n / (1/m1 + 1/m2), e=1. Positional correction: separate overlapping pairs by pushing along normal proportional to inverse mass.

Substeps: fixed dt substeps, e.g. step(dt) splits into substeps of max 1/240 or so, or compute n = ceil(dt / (1/240)).

Random non-overlapping start positions: rejection sampling.

Edges: EdgesGeometry(BoxGeometry(10,10,10)).

Materials: MeshStandardMaterial with varied colors. Also could use MeshPhysicalMaterial but Standard required.

Render loop: clock delta, clamp to 1/30, call step when not paused. __ready after first frame.

Write code.