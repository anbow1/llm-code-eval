A straightforward task: 20 balls in a box, elastic collisions, expose sim. Write one TS file.

Key details:
- Non-overlapping start positions: rejection sampling with min distance 2*0.4 = 0.8.
- Masses random 1..3.
- Elastic ball-ball collision: standard impulse along normal: j = -(1+e)*vRelN / (1/m1 + 1/m2), e=1. Also positional separation if overlapping.
- Wall collision: reflect velocity component, clamp position inside box minus radius.
- Substeps: fixed substep size, e.g. dt/max(1, ceil(dt/h)).

Expose __sim with balls as plain live objects that step() updates — so physics state should BE those plain objects; meshes sync from them.

Render loop: delta clamp to 1/30, step when not paused. Set __ready after first frame.

Write it.