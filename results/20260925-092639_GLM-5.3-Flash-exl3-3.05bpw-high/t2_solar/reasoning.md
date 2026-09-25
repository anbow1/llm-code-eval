Create a single TypeScript file. Add subtle starfield? Keep it simple but nice. Physically correct lighting: PointLight with decay 2, intensity needs to be large (e.g., intensity = 300 or set decay). renderer.useLegacyLights? In recent three, default is physically correct. Set light.intensity high enough for radius 10: intensity ~ 400 works (irradiance = intensity / d² ≈ 4 at d=10). Actually intensity/d^2... PointLight intensity in candela; illuminance = intensity / dist². For standard material, need ~1-ish. Distance 4 → intensity/16; distance 10 → intensity/100. intensity = 300 gives ~3 at inner, ~0.75? Hmm, that darkens outer. Maybe set decay=2 with intensity 400, or just decay = 1... spec says "mind physically based light intensity/decay" — keep decay 2 and boost intensity. 300 → inner 18.75? no: 300/16=18.75, too bright. Let's compute: want ~2 at d=10 → intensity 200; at d=4 → 12.5, too bright? Materials will just be bright white-ish, tone mapping helps. Use ACESFilmic tone mapping. intensity = 250, decay 2. Fine.

Orbits: planets as meshes positioned; each has pivot? Just set angle per planet: position x = cos(theta)*radius, z = sin(theta)*radius. theta += speed*dt. Each planet spins: rotation.y += spin*dt.

Moon: child of planet 2. But if moon orbits planet, planet position moves; moon child position rotates. Add moon to planet mesh, and set moon position each frame: moon.position.set(cos(a)*1.2, 0, sin(a)*1.2), a += dt. Moon spins too optionally. Planet scale? Planet radius ~0.5, moon ~0.15, distance 1.2 ok. But planet 3 radius bigger? distances 4,7,10; radii 0.45,0.6,0.75, moon at 1.5 offset? Keep moon offset 1.2.

Spinning: rotation.y on planet mesh; moon as child — fine.

Camera: position (0, 12, 16) lookAt origin; aspect handle. Whole system visible: radius 10, so fov 50, distance sqrt(12²+16²)=20. Fine.

Add faint starfield points? Allowed (no textures). Optional nice. Keep code minimal but add subtle stars with small Points — fine, no external assets.

__ready after first frame: use a flag in animation loop: if (!ready) { ready=true; set }. Set after renderer.render? setAnimationLoop callback runs after render call; set flag at end of callback after first render call.

Write code.