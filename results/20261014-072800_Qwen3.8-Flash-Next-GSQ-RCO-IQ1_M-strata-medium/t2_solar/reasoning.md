The user wants a complete TypeScript file that creates a mini solar system using Three.js. Let me plan this out:

1. Import Three.js
2. Create scene, camera, renderer
3. Sun: sphere at origin with MeshBasicMaterial + PointLight
4. 3 planets orbiting at distances 4, 7, 10 with different speeds (inner faster)
5. Each planet spins on its own axis
6. Planet 2 (the one at distance 7) has a moon as a child
7. Weak AmbientLight
8. Camera positioned above and to the side
9. Handle resize
10. Expose globals
11. Use setAnimationLoop with delta time

Let me think about physically-based light intensity. PointLight in Three.js with physically correct lighting uses intensity in candela and decay of 2. I'll set a reasonable intensity so planets are visible. With decay=2, the light follows physical inverse-square falloff. At distance 4-10, we need intensity high enough. Let's use intensity around 5000 or so. Actually, let me think more carefully.

With physicallyCorrectLights (now useLegacyLights is deprecated, renderer.useLegacyLights defaults to false in newer versions), the PointLight intensity is in candela. The irradiance at distance d is intensity / (4 * pi * d^2) * decay_factor... Actually the formula is: irradiance = intensity / (distance^decay). Wait, in Three.js with physically correct mode, the attenuation is intensity / (distance^decay). So at distance 10 with decay=2, we need intensity / 100 to be visible. Let's use intensity = 2000 or 5000. That gives irradiance of 20-50 at distance 10, which should be plenty bright.

Actually let me check: in Three.js, for PointLight with decay=2, the light contribution is intensity * pow(1.0 - saturate(distance/maxDistance), decay). No wait, that's not right either. Let me recall...

In newer Three.js (r150+), PointLight intensity is in candela, and the physically correct attenuation formula uses inverse square falloff. The formula is roughly: irradiance = intensity / (4 * PI * distance^2) when decay = 2. Hmm, actually I think it might just be intensity / distance^decay.

Let me just use a high enough value like 10000 and decay=2. At distance 10, that gives 10000/100 = 100 irradiance which is very bright. Or I could use decay=1 for simplicity but the prompt says "physically based light intensity/decay" so I should use decay=2 with appropriate intensity.

Actually let me just use intensity = 5000, decay = 2. At distance 4: 5000/16 = 312.5, at distance 10: 5000/100 = 50. These are all very bright. Maybe I should use lower values. Let me think about what MeshStandardMaterial looks like. Albedo colors are typically 0-1, and a surface is "fully lit" at irradiance ~1. So I need intensity such that intensity/(d^2) ≈ 1 at the planet distances.

For the closest planet at d=4: intensity/16 ≈ 1 → intensity ≈ 16. But at d=10: 16/100 = 0.16, which is dim. For the farthest planet to be visible, I need higher intensity. Let's use intensity = 500, decay = 2. At d=4: 500/16 ≈ 31. At d=10: 500/100 = 5. Still quite bright. Maybe that's fine - the outer planets will still be visible.

Actually let me use intensity = 100, decay = 2. At d=4: 100/16 ≈ 6.25. At d=10: 100/100 = 1. That's a nice range. But 6.25 might overexpose the inner planet. Let me use 50. At d=4: 50/16 ≈ 3. At d=7: 50/49 ≈ 1. At d=10: 50/100 = 0.5.

Actually with ACES tone mapping (default in newer Three.js), high values get tonemapped down. Let me just use something reasonable like intensity=1000, decay=2 and let tone mapping handle it. Or I'll go with a moderate value.

Let me just use intensity = 500, decay = 2. That should work with the default tone mapping.

Now for the code structure:

- Create scene, camera (position like (15, 12, 15) looking at origin)
- Sun at origin: sphere radius 1, MeshBasicMaterial yellow
- PointLight at origin
- AmbientLight weak
- 3 planets as groups or just meshes:
  - Planet 1: distance 4, radius 0.4, speed 2
  - Planet 2: distance 7, radius 0.6, speed 1.2, with moon child
  - Planet 3: distance 10, radius 0.5, speed 0.6
- Each planet orbits in XZ plane: position.x = cos(angle) * distance, position.z = sin(angle) * distance
- Each planet spins: planet.rotation.y += spinSpeed * delta
- Moon: child of planet 2 mesh, small sphere, orbits around planet using its own angle

Wait, if moon is added as child of planet mesh (planet.add(moon)), and planet spins, the moon will also spin with it. To make the moon orbit around the planet, I need to animate the moon's position relative to the planet. But since the planet itself is rotating (spinning on its axis), I need to be careful.

Actually, let me think. If I do planet.add(moon) and then set moon.position based on cos/sin of a moon orbit angle, the moon will orbit around the planet in local space. The planet's spin (rotation.y) will cause the moon's orbit to also rotate, but that's actually fine for the visual. Or I can set the moon's orbit angle independent of the planet's spin.

Let me structure it:
- planetMesh: Mesh at position (cos(angle)*dist, 0, sin(angle)*dist) in world
- planetMesh.rotation.y increments for spin
- moonMesh is child of planetMesh, at position (cos(moonAngle)*moonDist, 0, sin(moonAngle)*moonDist) in local space

Since the parent rotates, the moon's local position will rotate with the parent, but the moonAngle changes independently, so the moon effectively orbits at a combined rate. That's fine for this demo.

Actually, to make it cleaner, I could add an intermediate group (orbit pivot) but the spec says "planet.add(moon)" so I'll just add it directly.

Let me write the code now.
