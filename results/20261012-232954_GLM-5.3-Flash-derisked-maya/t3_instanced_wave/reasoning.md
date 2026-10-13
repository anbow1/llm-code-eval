Provide a single TS file. Strict mode. Use InstancedMesh with 100x100 grid. Update Y per frame. Colors gradient. Need to set needsUpdate on instanceColor? setColorAt once initially; but if colors are static set once, but instanceColor may need needsUpdate flag after setting. We can set colors once and flag instanceColor.needsUpdate = true.

Write code carefully: dummy Object3D reused, matrices reused. No allocations in loop.

Ready flag after first frame: track hasRendered variable, set __ready = true in first animation callback after render.