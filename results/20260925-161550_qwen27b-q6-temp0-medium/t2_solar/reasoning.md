Mini solar system in Three.js. Let me write a complete TypeScript file.

Key points:
- Y-axis up, orbits on the XZ plane
- Sun: MeshBasicMaterial + a PointLight with physical decay (decay=2, needs to set intensity to a high value because of physical falloff)
- 3 planets at 4, 7, 10 distances, with different angular velocities (faster when closer), MeshStandardMaterial
- Planets rotate on their own axes
- Planet 2 (the 7-distance one) has a moon as a child
- Weak AmbientLight
- Camera up and to the side, looking at the origin
- Resize handler, setAnimationLoop, delta-based motion
- Expose __scene, __camera, __renderer, and set __ready after the first frame

About the moon: it's added as a child of the planet mesh, and orbits the planet — meaning rotate the moon's position within the planet's local XZ plane. But the planet is also rotating... the moon being a child will be affected by the planet's rotation. That's fine per the spec (planet.add(moon)); just orbit it locally.

PointLight with physically based attenuation: in newer three, decay defaults to 2. Set intensity to something like 200 (units of candela), so planets at distance 10 are lit with 200/100 = 2. Good.

For delta, use a clock, and for __ready a frame flag.

I'll write the code.
