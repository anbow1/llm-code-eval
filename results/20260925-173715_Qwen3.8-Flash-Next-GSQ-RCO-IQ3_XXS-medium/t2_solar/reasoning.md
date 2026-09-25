The user wants a mini solar system built with Three.js in a single TypeScript file. Let me plan this carefully:

1. **Sun**: Sphere at origin with MeshBasicMaterial (self-illuminated) + PointLight at origin with physically based intensity/decay.
2. **3 Planets**: Spheres with MeshStandardMaterial at distances ~4, 7, 10. Each orbits the sun at different angular speeds (inner faster). Each spins on its own axis.
3. **Moon**: Small sphere as child of Planet 2, orbiting Planet 2.
4. **AmbientLight**: Weak, so dark sides aren't pure black.
5. **Camera**: Above and to the side, looking at origin.

Key considerations:
- Physically based light: PointLight with decay=2 (inverse square law), intensity in candela (or watts depending on Three.js version). In modern Three.js (r155+), physically correct lighting is default. A PointLight with decay=2 and a reasonable intensity (e.g., 200-500 candela) should work for planets at distances 4-10.
- Orbits in XZ plane (Y is up).
- Angular speeds: inner faster, e.g., 0.5, 0.3, 0.15 rad/s.
- Self-rotation: each planet rotates on Y axis.
- Moon: child of planet mesh, orbits planet in XZ plane of planet's local space.
- Use delta time from clock.
- setAnimationLoop for render loop.
- Handle resize.
- Expose globals for testing.

Let me write this out carefully.

For physically based PointLight:
- In Three.js r155+, `renderer.useLegacyLights` is deprecated and physically correct is default.
- PointLight intensity is in candela. With decay=2, the irradiance falls as 1/r².
- For planets at distance 4, 7, 10, I need sufficient intensity. Let's try intensity=300 with decay=2. At distance 4: 300/16 ≈ 18.75, at 7: 300/49 ≈ 6.1, at 10: 300/100 = 3. That should be reasonable.

Actually, let me think about what looks good. MeshStandardMaterial with default roughness/metalness. With physically correct lighting, I might need higher intensity. Let me go with 500 candela and see.

Wait - in newer Three.js, `useLegacyLights` was removed. The PointLight intensity in physically correct mode... let me just use a value that works. I'll use intensity around 800-1000 with decay 2, and set `renderer.useLegacyLights = false` explicitly (though it might not exist in very new versions). Actually, to be safe and compile-clean, I'll just set the intensity and decay properly.

Let me use:
- PointLight: intensity = 1000, decay = 2 (default in modern Three.js)
- AmbientLight: intensity = 0.1

For the sun glow effect, MeshBasicMaterial (unaffected by lights).

Camera: position like (8, 12, 18) looking at origin - above and to the side.

Let me write the file now.
