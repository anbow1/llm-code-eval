Implement physics with elastic collisions. Write TypeScript code.

Key: elastic ball-ball collision: impulse j = -(1+e)*(vRel·n)/(1/m1+1/m2) with e=1, apply along normal. Then separate overlap by moving along normal proportional to inverse masses.

Wall collision: reflect velocity component, clamp position.

Substeps: e.g. fixed dt substeps of 1/240 or compute steps = ceil(dt/0.005).

Expose __sim with balls plain objects, step, paused. Internal meshes reference ball objects.

Set __ready after first frame.