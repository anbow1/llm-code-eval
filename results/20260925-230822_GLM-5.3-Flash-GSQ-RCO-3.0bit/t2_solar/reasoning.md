Need physically correct lighting: PointLight with decay 2, intensity in candela. With three.js r155+, renderer.useLegacyLights default false; intensity of PointLight in candela: for distance ~4-10, need intensity roughly I/d^2 illuminance. PointLight intensity 1 candela gives irradiance 1/d^2. So intensity around e.g. 30? Actually with decay=2, illuminance = intensity / d². At d=4: intensity/16; need ~1-ish → intensity ~ 16-100. Use intensity like 50 or use decay 0... Better: set decay = 2, intensity = 100? Let's compute: at d=4, intensity/d² = 100/16 = 6.25 — too bright? Standard material exposure default. Maybe intensity = 20: d=4 → 1.25, d=10 → 0.2. Reasonable-ish. Could also set decay=2, intensity = 4·π·? Simpler: use intensity ~ 30 and tune. Many examples use intensity like 3 with decay... Actually in three.js examples with physically correct, e.g., "webgl_lights_pointlight" uses intensity... Let's just pick intensity = 60, decay = 2 → d=4: 3.75, d=7: 1.22, d=10: 0.6. With tone mapping none default, MeshStandardMaterial output might saturate at near side. Maybe add toneMapping ACESFilmic and exposure 1. Or intensity = 40. I'll use renderer.toneMapping = THREE.ACESFilmicToneMapping, intensity 50.

Sun MeshBasicMaterial bright — could color slightly yellow, maybe use color and material. Could also make sun material with emissive-like brightness; Basic material color white/yellow.

Moon child of planet2 at radius ~1.2 from planet, orbiting: set moon position each frame relative to planet (moon.position.set(cos,0,sin)*1.2). Planet spins: rotate planet on its axis — but if we rotate planet mesh, moon as child would also rotate (that's fine, moon orbits planet via own position). Planet spin: planet.rotation.y += spinSpeed*dt — but moon position set in planet's local frame; fine.

Actually careful: if we set planet.rotation.y for spin and moon position in planet local space, moon's world orbit combines planet spin — acceptable but moon orbit speed would add planet spin. Better: put moon orbit independent: keep planet mesh spin via rotating a child "spin group"? Simplest: planet mesh itself spins (rotation.y), moon child with its own position updated in world-ish coordinates relative... If moon.position is set each frame in planet's local coordinates using angle θ_moon, world moon position = planet rotation applied. To keep moon orbit speed independent, use moonAngle = θ_moon - planetSpin? Or just accept. Alternative: make planet a group? Spec says "planet mesh" add moon. I'll update moon.position in planet's local frame with angle = moonAngle - planet.rotation.y so world orbit is controlled. Actually simpler: don't overthink; moon.position.set(cos(a)*r,0,sin(a)*r) with a = moonAngle - planetSpin gives fixed world orbital speed.

Positions: planet.position.set(cos(orbitAngle)*dist, 0, sin(orbitAngle)*dist). Don't rotate planet position via rotation to avoid affecting children.

Camera: above and side, e.g., position (12, 10, 14), lookAt origin. Whole system visible: outermost r=10, so distance ~ sqrt(144+100+196)... (12,10,14): dist = sqrt(144+100+196)= sqrt440 ≈ 21. FOV 60 → fine.

Orbital speeds: e.g., 1.2, 0.8, 0.5 rad/s. Spins: 2, 1.5, 1 rad/s. Moon: 2 rad/s around planet at radius 1.3, moon radius 0.15. Planet radii: 0.4, 0.6, 0.5 maybe.

AmbientLight intensity 0.05-0.1.

Write strict TS code. __ready after first frame: use a flag in animate callback.

Compile strict: fine.