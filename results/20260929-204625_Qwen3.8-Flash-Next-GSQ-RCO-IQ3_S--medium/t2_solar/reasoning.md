The user wants a mini solar system in Three.js TypeScript. Let me build this carefully:

1. Sun: sphere at origin with MeshBasicMaterial (so it doesn't need light), plus PointLight at origin
2. 3 planets: spheres with MeshStandardMaterial at distances ~4, 7, 10, orbiting at different speeds (inner faster)
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child of the planet mesh, orbiting the planet
5. Weak AmbientLight
6. Camera above and to the side, looking at origin

Key considerations:
- Y is up, orbits in XZ plane
- PointLight intensity/decay: In newer Three.js, physically correct lights use intensity in candela and decay of 2. I need to set appropriate intensity values. For a PointLight with default decay of 2, I need a high intensity value since it falls off with distance squared.
- MeshBasicMaterial for sun so it glows regardless of lighting
- MeshStandardMaterial for planets so they respond to the PointLight
- Use setAnimationLoop with delta time
- Handle window resize
- Expose scene, camera, renderer on window
- Set __ready = true after first frame

Let me think about the PointLight intensity. In Three.js r152+, `renderer.useLegacyLights` is deprecated and physically correct lights are default. PointLight intensity is in candela, and with decay=2, the light falloff is 1/r². At distance 10, the light would be intensity/100. So I need a reasonably high intensity, like 500-1000, to light planets at distance 10.

Actually, let me check: in recent Three.js (r155+), PointLight intensity is in candela by default. The formula is roughly: color = intensity / (4 * PI * r^2). So at r=10, we get intensity/(4*PI*100) ≈ intensity/1256. For a value of 1 (full brightness), we'd need intensity around 1256. Let me use something like 2000 to be safe, or I could set decay to 1 or use a different approach.

Actually, to be safe and ensure planets are well-lit, I'll set the PointLight intensity to something like 200-500 with decay 2. Or I could set `renderer.physicallyCorrectLights = false` but that's deprecated. Let me just use a high enough intensity value. With decay=2 and intensity=500, at distance 4 we get 500/(4π·16) ≈ 2.5, at distance 7 we get 500/(4π·49) ≈ 0.8, at distance 10 we get 500/(4π·100) ≈ 0.4. That seems reasonable with an ambient light of 0.3-0.5.

Wait, actually I need to double-check the formula. In Three.js physically correct mode, the PointLight contribution is:
`color * intensity / (4 * Math.PI * distance^2)`

But MeshStandardMaterial also has its own energy conservation. Let me just go with intensity=300 and see. Actually for safety, let me use 1000 to make sure everything is well-lit.

For the camera position: above and to the side. Something like (12, 8, 12) looking at origin.

Let me write the complete file now.
