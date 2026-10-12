Standard Three.js solar system. Key points:

- PointLight intensity with physically based lighting: with default decay=2, need high intensity. Three.js r155+ uses physically correct lighting by default. Use intensity like 300 and decay 2, or set decay and intensity appropriately. Distances up to 10, so intensity ~ (distance)^2 * desired. At distance 10, irradiance = intensity/100. Want ~1, so intensity ~ 300-500. Use 400.

- Moon: child of planet mesh, positioned offset, orbiting. But if moon is child of planet mesh, it also spins with planet's self-rotation. That's fine—moon orbiting planet which is spinning means moon revolves faster. To keep it simple: add moon as child of planet, but then planet's spin rotates moon position too. Alternative: create planet pivot group for orbit, planet mesh child for spin, moon as child of planet mesh or a moon pivot child of pivot. Spec says planet.add(moon). Simplest: moon as child of planet mesh, moon position updated each frame (moon.position.set(Math.cos(t)*moonDist, 0, Math.sin(t)*moonDist)). Planet spin will rotate the frame but that's acceptable, still orbiting. To counteract, could rotate moon position accounting for spin; but requirement just says orbiting that planet. I'll make planet spin around Y; moon at y=0 offset so spin doesn't change its height, only its phase—fine.

- Use Object3D pivots for orbits maybe, but simpler: set planet position each frame via cos/sin of elapsed time.

- Camera: position like (12, 12, 16) looking at origin. System radius ~10, so camera far enough. Maybe (0, 12, 18)? "above and to the side" → e.g., (10, 10, 14).

- __ready after first frame: in animation loop, on first render set flag.

- Strict TypeScript: cast window.

Write code.