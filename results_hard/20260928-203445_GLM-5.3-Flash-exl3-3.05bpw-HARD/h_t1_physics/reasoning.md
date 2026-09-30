Standard elastic ball simulation. Write single TS file.

Key details: balls array of plain objects with live state, step(dt) with substeps, wall collisions with restitution 1 (reflect), ball-ball elastic collision using masses, positional separation. Paused flag. __ready after first render (set after renderer.render or after first animation loop callback).