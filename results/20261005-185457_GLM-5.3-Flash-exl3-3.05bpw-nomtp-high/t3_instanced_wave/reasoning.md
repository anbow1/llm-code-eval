Write the code. Grid 100x100, spacing ~1. Use dummy Object3D reused. Precompute positions and distances arrays. Colors: set once via setColorAt gradient. Y updates each frame via setMatrixAt. Use reuse dummy.

Colors gradient by position — set once (colors don't change per frame), fine. Note when using setColorAt before first render, instanceColor needs update but setColorAt sets it.

Camera at angle. Ready flag after first render.