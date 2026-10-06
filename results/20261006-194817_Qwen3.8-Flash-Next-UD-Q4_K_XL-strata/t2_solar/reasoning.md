The user wants a mini solar system built with Three.js in TypeScript. Let me plan this out:

1. Sun: Sphere at origin with MeshBasicMaterial + PointLight
2. 3 planets: MeshStandardMaterial, distances 4, 7, 10, different angular speeds (inner faster)
3. Planet 2 has a moon (child of planet mesh, orbiting planet)
4. Weak AmbientLight
5. Camera above and to the side, looking at origin
6. All orbits in XZ plane, Y is up
7. Planets spin on their own axis

Key considerations:
- PointLight with physically correct lighting: need to set `renderer.useLegacyLights = false` (or `renderer.physicallyCorrectLights = true` for older versions). Actually in newer Three.js, physically correct lights is the default. I'll set intensity high enough and adjust decay.
- For PointLight with physically correct mode, intensity is in candela and decay is 2. I need to set it high enough to light planets at distance 4-10.
- Actually, let me check: in newer Three.js (r155+), `useLegacyLights` is removed and physically correct lights are always on. The PointLight intensity is in candela. At distance d, irradiance = intensity / (4π * d²) for decay=2. So for distance 10, I need intensity to be quite high. Let me use intensity around 500-1000.
- Actually, let me use `renderer.useLegacyLights = false` to be safe, and set intensity to something like 500. Or I could set decay to 1 or even 0 to make it simpler. Let me use decay=1 and intensity=100, or decay=2 and intensity=2000.

Wait, in the latest Three.js, `useLegacyLights` might not exist. Let me just set the intensity high enough. With physically correct lighting (default in r155+), PointLight intensity is in candela, and the falloff is intensity/(4π*d²) for decay=2. At d=10, that's intensity/(4π*100) = intensity/1256.6. For a visible result, I might want irradiance around 0.1-1, so intensity around 125-1250. Let me use intensity=500 with decay=2.

Actually, let me be more careful. MeshStandardMaterial with roughness=0.5 should look decent. Let me set PointLight intensity to 2000 and decay to 2. At distance 4: 2000/(4π*16) ≈ 10. At distance 7: 2000/(4π*49) ≈ 3.2. At distance 10: 2000/(4π*100) ≈ 1.6. These should give visible results.

Or I could set decay to 1: intensity/d. At d=10: 200/10=20. Still works.

Let me go with intensity=2000, decay=2 for realistic falloff.

For the orbit:
- Planet 1: distance 4, speed 0.8 rad/s
- Planet 2: distance 7, speed 0.5 rad/s
- Planet 3: distance 10, speed 0.3 rad/s

Moon orbiting planet 2: small sphere, orbit radius ~1.2, speed ~2 rad/s

Camera: position like (12, 8, 12) looking at origin.

Let me write the complete file now.

For strict TypeScript compliance:
- Need proper types
- No implicit any
- Handle the first frame flag properly

Let me write it:
