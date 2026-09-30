The user wants a complete TypeScript file that creates a mini solar system using Three.js. Let me plan this out:

1. Import Three.js
2. Create scene, camera, renderer
3. Sun: MeshBasicMaterial sphere at origin + PointLight at origin
4. 3 planets: MeshStandardMaterial spheres at distances 4, 7, 10 with different angular speeds
5. Planet 2 has a moon (child of planet mesh) orbiting that planet
6. Weak AmbientLight
7. Camera above and to the side, looking at origin
8. Handle resize
9. Animation loop with delta time
10. Expose __scene, __camera, __renderer, __ready

Let me think about the physically based light intensity/decay. In newer Three.js versions (r155+), PointLight uses physically correct lighting by default. The intensity needs to be quite high for physically correct mode. I'll set the PointLight with appropriate intensity and decay values.

Actually, let me think about this more carefully. In Three.js r155+, `renderer.useLegacyLights` was deprecated and physically correct lights became the default. PointLight intensity is in candela (cd) and falls off with distance². So I need to set a high intensity value.

For a scene where planets are at distances 4, 7, 10, I'll set intensity high enough to illuminate them. Let me use intensity around 200-500 and decay of 2 (physically correct inverse square law). Actually, let me use a moderate intensity that works. I'll set intensity to around 500 with decay 2, which should illuminate things at those distances reasonably well.

Wait, actually with physically correct lighting and decay=2, the light falls off as 1/distance². At distance 10, that's 1/100 of the intensity at distance 1. So intensity needs to be quite high. Let me use something like 1000 or so.

Actually, let me just set it to a reasonable value. The MeshStandardMaterial has an albedo factor, so the perceived brightness depends on both. Let me use intensity = 200 and see if that works. Actually, for testing purposes and to ensure planets are visible, I'll use a higher value like 500.

Let me also think about the structure:
- For orbiting, I'll use a pivot group at the origin, add the planet as a child offset by the distance, then rotate the pivot. Or I can just compute positions directly.
- Actually, a cleaner approach: create an orbit group for each planet, add the planet to it at an offset, then rotate the group. But for the moon, the requirement says planet.add(moon), so the moon should be a child of the planet mesh.

Let me use the approach where:
- Each planet has its position computed based on time (x = dist * cos(angle), z = dist * sin(angle))
- The planet mesh rotates on its own axis
- Planet 2's moon is added as child, positioned at some offset, and rotates around the planet

Wait, if the moon is a child of the planet, and the planet spins on its axis, the moon will also orbit with the planet's rotation. That might not be ideal. Let me think...

Actually, the requirement says "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So the moon should orbit the planet. If the planet is spinning, and the moon is a child, the moon will move with the planet's rotation. 

To make the moon orbit the planet independently, I could:
1. Make the planet a child of an orbit group, then set the planet's position in the orbit group. The moon is a child of the planet mesh. If the planet mesh has its own rotation (spinning), the moon rotates with it. To counteract this, I could counter-rotate the moon.

Actually, a simpler approach: 
- Create an orbit pivot group for the planet
- Add the planet mesh to the pivot at an offset
- Rotate the pivot to make the planet orbit the sun
- For planet spin, rotate the planet mesh's own rotation.y
- Add the moon as a child of the planet mesh, positioned at some offset
- To make the moon orbit independently of the planet's spin, I can add a moon pivot as a child of the planet, and rotate that pivot

Wait, but the requirement says `planet.add(moon)`. So the moon mesh should be a direct child of the planet mesh. Let me just position the moon at an offset and have it orbit by rotating around the planet. Since the planet is spinning, I can set the moon's local rotation/position to create its orbit.

Actually, the simplest interpretation: add the moon as a child of the planet mesh, positioned at some offset from the planet's center. Then, to make it orbit, I can update the moon's local position each frame based on time. The planet's rotation (spin) will add an additional rotation to the moon, but since the moon is orbiting in the XZ plane and the planet spins around Y, the moon's orbit would be affected by the planet's spin.

To handle this properly: I'll track the planet's spin and the moon's orbital angle separately. Each frame, I'll set the moon's position relative to the planet (in the planet's local space). Since the planet's spin rotates the local space, I need to account for that. 

Actually, the simplest clean approach:
- Planet mesh is added to an orbit group (which rotates around Y to make it orbit the sun)
- Planet mesh position is set at [distance, 0, 0] in the orbit group
- Planet mesh rotates on its own Y axis (spin)
- Moon is added as child of planet mesh
- Moon's position in local space is computed each frame: moonPos = [moonDist * cos(moonAngle), 0, moonDist * sin(moonAngle)]

But wait, if the planet is spinning (rotating around its local Y axis), the moon's position in world space will be planet's orbit position + rotated by planet's spin * moon offset. So the moon will orbit the planet but the orbit will be "wrapped" by the planet's spin. The effective angular speed of the moon around the planet in world space would be moonAngle + planetSpinAngle.

That's actually fine for a demo. Or I can compensate by adjusting the moon angle. Let me just do it straightforwardly: the moon orbits in the planet's local XZ plane, and since the planet spins around Y, the moon effectively orbits at speed (moonAngularSpeed + planetSpinSpeed) in world space. That's fine for a mini solar system demo.

Let me write the code now. I'll use a straightforward approach:

- Use `clock.getDelta()` and `clock.getElapsedTime()` for timing
- For orbits, I'll compute positions directly using sin/cos
- For the moon, I'll add it as child of planet 2 and set its position in local space each frame

Let me also think about whether to use orbit groups or direct positioning. Direct positioning is simpler for the moon case. But actually, for the moon to be a child of the planet, I need the planet to be a proper Object3D. 

Plan:
- Planet meshes are standalone (not children of orbit groups). I just set their world position each frame.
- Moon is child of planet 2, I set its local position each frame.
- Planet spin: planet.rotation.y += spinSpeed * delta

For the moon orbiting the planet: moon.position.set(moonDist * cos(moonAngle), 0, moonDist * sin(moonAngle)) in local space of planet 2.

Since the planet itself is rotating, the moon's world position will be planet.position + rotationMatrix(planet.rotation.y) * moon.position. So the moon orbits at (moonAngularSpeed + planetSpinSpeed) effectively. That's fine.

Let me write clean, compilable TypeScript code.

One more thing about PointLight and physically correct lighting: In recent Three.js (0.155+), `useLegacyLights` defaults to false (physically correct). With decay=2 and high intensity, it should work. Let me set intensity to something like 300-500 and decay=2. Actually for testing/visual purposes, let me use a moderate value. I'll go with intensity=200, decay=2. If that's too dim, I can adjust. Actually for the test environment (just checking that things render), let me use a higher value to ensure visibility. I'll use 500.

Hmm, actually let me also consider: should I set `renderer.useLegacyLights = true`? In newer versions it's deprecated and may cause a warning. Let me just use physically correct values. With intensity=500 and decay=2:
- At distance 4: effective light = 500 / 16 = ~31
- At distance 7: effective light = 500 / 49 = ~10
- At distance 10: effective light = 500 / 100 = 5

With MeshStandardMaterial, these should be visible. Actually with physical lighting, the formula might be different (might involve 4π or something). Let me just use a value that works visually. I'll go with 800 to be safe.

Actually, in Three.js with physically correct lighting, PointLight intensity is in candela, and the illuminance at distance d is intensity / d². The MeshStandardMaterial's BRDF then modulates this. For a white material, at distance 4 with intensity 800, illuminance would be 50, which should definitely be visible.

Let me finalize the code now.
