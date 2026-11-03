We need to write a single TypeScript file. Complex. Let's plan carefully to avoid TS strict errors.

Key elements:
- Imports: THREE, EffectComposer, RenderPass, UnrealBloomPass, Sky, maybe OrbitControls not needed.
- Renderer setup, canvas to body, resize.
- Scene with fog / custom sky shader.
- Rocket model built procedurally.
- Pad, tower, lightning masts, ground, ocean, roads, buildings, vegetation.
- Particle systems: exhaust plume, smoke/steam, contrail.
- Camera logic.
- Physics with __rocket API.
- UI overlay with mission data and buttons, keyboard.

Let's be careful with TypeScript strict mode: no implicit any, strict null checks. For window as any it's fine. Avoid unused variables (noUnusedLocals may not be on by default with --strict; strict doesn't include noUnusedLocals, so okay but be tidy).

Let me write.

Imports:
```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```
These types available if @types/three installed. Three's addons with .js extension. TypeScript may complain about missing types for three/addons/... but typical environment resolves. We'll assume.

Renderer:
```ts
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
```
Style body margin 0, overflow hidden.

Camera: PerspectiveCamera(55, aspect, 0.5, 2e7?) Large far plane for Earth view. With logarithmicDepthBuffer maybe needed. Use camera far = 1e7 and near = 1... precision issues. Use logarithmicDepthBuffer: true on renderer. Sky at large distances? Sky is a box 450000? Sky addon scale typically 450000. With camera far 1e7 okay.

Actually for space view with the Earth curve, we need a ground/earth mesh of radius 6,371,000. Hmm. That's ambitious but doable: build a big sphere for the Earth? The local terrain is flat within a few km. Let's do local flat terrain for the pad and ocean, and add a large "Earth curvature" sphere far away? Might conflict.

Alternative: make the local ground a large plane (say 40 km), and use fog to blend to sky. When at altitude 100 km, the plane below looks like the ground from space but flat, and horizon would be at distance... With camera near rocket at 100 km, seeing flat plane 40 km wide below — looks like a small patch. Hmm.

Better: create Earth as a sphere of radius R centered at (0, -R, 0) so surface at y=0 at origin. Then place the local terrain (pad, coastline, ocean) as a slightly raised patch on top. But the sphere's surface is curved and a flat patch of a few km is fine. The sphere can be a sphere geometry with high segment count? Actually a sphere of radius 6371 km rendered with camera near it: use segment count 128x64, will look smooth enough near horizon? The horizon at 100 km altitude... the visible curvature. Might look chunky at low res but acceptable. Add vertex colors / material with procedural? Use a shader material that mixes ocean blue and green land based on a noise pattern near origin? Simpler: Earth sphere with a custom shader doing a crude continent pattern, plus the local detailed ground patch near the origin drawn on top (slightly above sphere surface, e.g., y offsets 0..small). But z-fighting between sphere and flat patch: place patch at y=0 and sphere surface at y = -0.5*? Actually sphere top at y=0 exactly at origin; moving away it dips down as y ≈ -d²/(2R), tiny at 20 km: -0.000031 km = 0.03 m. So the flat patch at y=0 would be above the sphere everywhere within 20 km by a few cm — z-fighting in depth is fine since patch above sphere and camera above: depth differs tiny; precision issues with far plane 1e7. Use logarithmic depth buffer to solve.

Hmm, but the ocean "on the horizon behind the pad" — we can just make the ground plane split: land to the west of the pad, ocean to the east beyond a coastline. Within a 40 km plane. Then further out the Earth sphere.

Let's simplify: Use a big flat ground plane 60 km x 60 km with procedural shader: land (green scrub) west, ocean east with coastline; plus distant Earth sphere for curvature at large scale. Actually with a flat ground plane and haze, from 100 km up you'd see a flat plane. The requirement says "view of the coast, the curve of the Earth and then space". Curve of Earth would be nice.

Plan: Earth sphere radius R=6,371,000 at center (0,-R,0), with a shader material drawing ocean/land with a coastline near origin based on world x,z. The local detailed ground (pad, roads, buildings, vegetation) is placed small on top of the sphere at origin: a flat disc/plane of 8 km radius at y=0.02 maybe, textured procedurally, with the ocean beyond a certain x. Hmm, the coastline shape: let's define coastline at x = 1200 m (ocean to the east/+x). Local ground plane covers 0..? Let's make land a plane extending from x=-20000 to x=600, and ocean plane from x=600 to x=20000? That creates straight coastline. Then further out, Earth sphere handles it with the same coastline rule and haze/fog.

Honestly, precision at these scales is a nightmare but let's try something pragmatic:

- Earth sphere with shader: color based on noise; near the launch site area, draw Florida-ish land. Distances beyond 200 km visible at high altitude. Use a shader with a smooth noise for continents, and the ocean blue, with atmosphere-like scattering from the light.
- Local terrain: plane 30km with detail, at y=0, blended into sphere. Since both are at y≈0 near origin, and sphere diverges downward at distance, the local plane (flat) will float above the sphere near its edges. Fog will hide it. Set fog to hide distant stuff, but at high altitude fog should fade out (thin atmosphere). Hmm, fog per altitude: adjust scene.fog density based on altitude.

Let's not over-engineer. Priority: realistic launch photograph at pad, then chase cam through ascent showing plume, contrail, sky darkening, stars appearing, and Earth's curve visible at high altitude.

Design decisions:

World scale in meters, but the rocket is 70 m, camera at ~100 m. Earth sphere radius 6.371e6. Using float32 precision in shaders: fine for the sphere itself. Camera far plane: 1.5e7. near: 0.3? ratio 5e7 — depth precision destroyed. Use logarithmicDepthBuffer: true. That helps a lot. Also for the Earth sphere, place its center at (0,-R,0) in world so we only need geometry around. Actually with logarithmic depth, fine.

Alternatively use a scaled-down Earth for visuals: e.g., a sphere of radius 6,371,000 but we only need to render it when high. Let's just do it.

Hmm, but the ground plane being flat and the sphere curving: when the rocket is at 100 km, looking down, you'd see the flat plane patch at y=0 which is at world distance 100 km and the sphere. The flat plane is a square 30 km; from 100 km it appears small but okay.

Let me reduce the ground plane to 40 km x 40 km with fog/haze blend and a shader that includes ocean beyond the coastline. Then the Earth sphere is underneath at lower y; the plane floating above would be visible as a "plate" edge. To hide, make the plane's shader fade to transparent/or to the haze color at distance using fog. With fog exponential, at 20 km distance the fog factor should be high (haze). Set fog density such that ~90% at 20 km. Then at 100 km up looking down, the ground within 20 km appears through fog... hmm at high altitude the fog should be less dense (space). If fog is thin at altitude, the plate edge shows.

Alternative approach: Skip the separate Earth sphere; render one big sphere as the ground (radius R), and place local details (pad, tower, buildings) on top at the origin using the sphere's local tangent plane. The sphere is huge; the region within 10 km is effectively flat with deviations of mm. So: Earth sphere geometry with e.g. 512x256 segments covers the whole planet; but detail near origin is poor (each quad ~78 km). Not good for ground detail near the pad. But we don't need sphere detail near origin because we cover it with local meshes: a local ground disc radius 20 km at y=0. The sphere under it deviates downward by up to 31 m at 20 km (d²/2R = 400e6/12.7e6 ≈ 31 m). So local disc floats 0..31 m above the sphere — at the edge there'd be a visible gap/cliff of 31 m at 20 km distance, mostly hidden by haze and the ground plane surface itself. Actually from above at 100 km you'd see a flat 40 km disc floating... the edge drop of 31 m at 20 km distance viewed from 100 km is negligible angularly (0.0003 rad). Fine! Actually the mismatch is fine.

So: Earth sphere radius R, centered at (0,-R,0), custom shader with procedural continents + ocean + atmosphere glow. Local ground: a circular plane radius 20,000 m at y=0 with detailed procedural texture: green scrub, roads, buildings, ocean beyond coastline. Wait, the ocean should extend to the horizon. From the pad at eye level, horizon is at ~5 km for 2 m eye height; from camera at 100 m altitude, horizon ~36 km. So the local 20 km radius plane covers ocean to 20 km, then the sphere beyond. The sphere near origin should look like ocean eastward and land westward to match. In the sphere shader, determine continent based on world position: use a coordinate where around origin we paint Florida: land to the west of coastline x<~1000 m and ocean east. Use smooth procedural noise plus a base shape.

Simplify: sphere shader color = mix(oceanColor, landColor, step(coastNoise)). Make land where a large-scale noise > 0.5, but force it to be ocean near the "Cape" area to match. Honestly a generic continent pattern is fine at high altitude; near the pad, the local plane covers everything out to 20 km. Between 20 km and ~200 km the sphere is visible with generic coast; acceptable.

Hmm wait, sphere is under the plane; near the origin the sphere is at y≈0 exactly under, and the local plane covers it z-fighting-wise? The plane is at y=0 and sphere top at y=0 → z-fighting. Raise the local plane to y=0? Instead lower the sphere by 30 m: center at (0, -(R+30), 0)? Then at origin sphere top is y=-30. At 20 km, sphere y = -30 - 31 = -61. Plane edge at y=0, drop of 61 m to sphere at 20 km; viewed from ground level, you'd see a 61 m cliff at 20 km distance — hidden by haze/atmosphere. Let's use plane radius 30 km and lower sphere 100 m; drop at edge = 100+71=171 m, at 30 km distance → 0.0057 rad ~ 0.3°, small. Haze at 30 km distance will fully obscure. OK.

Better: make the sphere radius 6,371,000 with center (0, -R - 80, 0). Fine.

Hmm, honestly, is the Earth sphere worth it? "the curve of the Earth and then space" — yes let's include.

Actually there's another approach for the curve: use a large ground plane that curves? No, sphere is right.

Let me now write the sky. Use three's Sky addon, driven by sun position and turbidity. But requirement: "Sky: from blue at the ground to black at 100 km... Stars must appear above ~70 km". The Sky addon shader (Preetham) doesn't handle altitude directly; we can fade the sky object opacity? Better: custom sky shader on a large sphere (BackSide) with:
- gradient: horizon haze color → zenith blue → black at high altitude based on camera/rocket altitude
- sun glow
- stars: procedural via hash noise in the fragment shader, fading in above 70 km.

That gives full control and no need for Sky addon. But "e.g., the Sky addon or your own shader" — custom is allowed. I'll write a custom sky shader. Simpler and no addon type issues. But using Sky addon is fewer lines... custom gives stars. Let's do custom.

Sky sphere: radius, say, 5e6? Must be inside camera far. Use radius 4e6? At high altitude, camera at 100 km, sky sphere centered on camera each frame (position = camera.position). Then radius 1e6 is fine and it moves with camera. Yes! Sky sphere centered on camera always, radius large (e.g., 1e6 or even 10000?). If it's too small, stars/geometry parallax none since centered. Set radius 500000, depthWrite false, depthTest false? If depthTest false it draws over everything unless renderOrder. Set material.side = BackSide, depthWrite = false, and render order -1? With depthTest false and renderOrder -1000 it draws first and everything else on top. But it needs to be behind the Earth: Earth is real geometry, drawn after, will cover it. Good. Use depthTest: false, depthWrite: false, renderOrder: -1 (must render before opaque? renderOrder affects sorting within same group; opaque objects sorted by renderOrder then material.id/z. Setting renderOrder -1 ensures drawn first among opaque). Hmm, for opaque, three sorts by renderOrder first, so -1 draws first. Good.

Sky shader with uniforms: uSunDir, uAltitude (camera/rocket altitude), uTime maybe.

Compute view direction in world space: vWorldDir = normalize(worldPos - cameraPosition). With the sphere centered on camera, worldPos - cameraPosition = position. Use `varying vec3 vWorldPosition` and in fragment `normalize(vWorldPosition)`. Since the mesh is centered at camera each frame, the local position direction = view direction.

Colors:
- zenith: mix of deep blue (0.15,0.35,0.7)*? Let's define skyTop = vec3(0.05,0.18,0.45), horizon = vec3(0.75,0.82,0.88) haze.
- t = clamp(dir.y,0,1); sky = mix(horizonColor, zenithColor, pow(t, 0.5)).
- Sun: add glow pow(max(dot(dir,sunDir),0), 900) * white * 20 + pow(...,8)*0.3 warm.
- Altitude: as altitude rises, sky darkens: factor = exp(-alt/12000) etc. Real: at 100 km black. Use `float above = smoothstep(0.0, 100000.0, uAltitude);` then mix sky color towards black more sharply: `sky *= mix(1.0, 0.02, pow(above, 0.7))`. Also horizon glow should persist a bit.
- Stars: hash-based on direction. `vec3 d = normalize(dir); ` Use a grid approach: compute spherical coords and cell hash. Simple star function:

```glsl
float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
```
Stars: 
```glsl
vec3 starField(vec3 dir){
  vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y,-1.,1.)));
  vec2 g = uv * 60.0;
  vec2 id = floor(g); vec2 f = fract(g)-0.5;
  float h = hash21(id);
  float star = smoothstep(0.5, 0.0, length(f)) * step(0.985, h);
  ...
}
```
That produces blocky stars on a lat-long grid with distortion at poles — acceptable. Add twinkle. Multiply by starVisibility = smoothstep(70000, 110000, uAltitude). Also stars should be visible when looking up. Fine.

Alternatively use points for stars — but shader is simpler.

Also need sun light matching sun direction.

Fog: scene.fog = new THREE.FogExp2(hazeColor, density). Density driven by altitude: base 4e-5? Exponential fog with density 4e-5 gives at 10 km exp(-(0.00004*10000)^2)? FogExp2 factor = 1 - exp(-(d*density)^2). At d=10000, (0.4)^2=0.16 → 15% fog. At 30 km: (1.2)^2=1.44 → 76%. Good. Set density = 4e-5 * exp(-alt/8000) or something decreasing with altitude... but then high-altitude view of ground has no haze. Real atmosphere has haze near surface, so from 100 km up the ground is clear-ish with a blue limb. Simplify: density decreases with altitude: `fogDensity = 4e-5 * Math.exp(-alt/9000) + 1e-7`. Hmm, but fog is camera-centric: from 100 km altitude, the ground at distance 100 km with density 1e-7 → negligible, so the ground appears crisp. That's okay, maybe add a slight blue tint via the Earth shader.

But wait — fog affects the rocket at close distance, negligible.

Sky sphere with depthTest false bypasses fog (fog: false in material).

Now the rocket.

Dimensions: height 70 m total, diameter 3.7 m. Build a group `rocketGroup` with local origin at the bottom of the engines? Let's set rocket local origin at the base (bottom of the engines) and build upward, so rocketGroup.position.y = padTop + altitude. Actually the physics gives altitude above pad (0 at liftoff). So rocket group position = (0, padY + alt, 0). Hmm but we also need horizontal displacement and pitch. The trail is world points of the rocket.

Physics: we track vertical altitude h and horizontal downrange x (along +x, pitch direction). Pitch from vertical, so thrust direction = (sin(pitch), cos(pitch)) in x-y. Then rocket orientation: rotate about z by -pitch? If thrust points toward +x and up, rocket tilts toward +x: rotate about z axis by -pitch in three.js (rotation.z = -pitch tilts +y toward +x). Yes: rotating about z by -θ maps (0,1,0) to (sinθ, cosθ, 0). Good.

Rocket mass: linear from m0 to dry over 200 s. Thrust T = 1.3*m0*g0, but limited to 3*m*g0 (throttle). Note 1.3*m0*g0 vs 3*m*g0: since m >= 220000, 3*m*g0 = 3*220000*9.81 = 6.47e6; T = 1.3*550000*9.81 = 7.014e6. So at the end, thrust is limited to 3*220000*9.81 = 6.47e6. So thrust = min(1.3 m0 g0, 3 m g0) while burning, and 0 after 200 s. Note at the beginning 1.3*550000*9.81 = 7.01e6 < 3*550000*9.81, so no throttle initially. Throttle kicks in when 3m < 1.3 m0 → m < 0.4333*550000 = 238333 kg, i.e., near the very end of the burn (m goes 550k→220k linearly over 200s; m=238333 at t = 200*(550-238.3)/330 = 188.9 s). Fine.

Burn time 200 s, but with time scale 10 or 30, the ascent to 100 km takes a while. Let's think: with 1.3 T/W and a 200 s burn, the rocket reaches high altitude fast. Actually the total delta-v: average thrust/avg mass ~ 7e6/385000 = 18.2 m/s² minus gravity ~9 → net ~9 m/s² for 200s → 1800 m/s. Altitude during burn ~ 0.5*9*40000 = 180 km. Plus after burn, coasting up at 1800 m/s → additional 165 km. So it reaches well above 100 km. Good. Time to 100 km maybe ~150 s of sim. At 10x that's 15 s real. Hmm, the whole flight lasts minutes: "the flight lasts minutes". At 30x, 150s sim = 5s real. Well, the rocket keeps going up and falls back. Fine.

Pitch: 0 at liftoff; after 10 s, grows, reaching ~0.5 rad at 150 s, never decreases. Let's define: if t < 10, pitch = 0; else if t < 150: pitch = 0.5 * smoothstep-ish? "starts to grow (a gravity turn), reaching about 0.5 rad at 150 s". Use pitch = 0.5 * ((t-10)/140)^1.6 maybe, then after 150 continue to grow slowly? "never decreases" — keep constant 0.5 after 150, or keep slowly growing to 1.2 rad. Let's keep growing slowly toward 1.2 rad limited, e.g. pitch = 0.5 + 0.4 * (1 - exp(-(t-150)/100))? That continues to grow and never decreases. Fine. But for a "gravity turn" realism, the pitch rate should relate to velocity. Keep simple.

Actually for the physics to be a gravity turn: thrust vector along the rocket axis. We'll just prescribe pitch.

Equations of motion:
- a_thrust = T/m in direction (sin p, cos p).
- gravity: -g(h) in y, and gravity doesn't affect horizontal.
- Also atmospheric drag? Not required. Skip.
- Note "acc (net vertical acceleration, m/s^2)" — vertical component: T*cos(p)/m - g(h).

Integrate with substeps ≤0.02 s. Semi-implicit Euler: v += a*dt; h += v*dt; horizontal similarly. Rocket cannot go below pad: if h<0 and v<0, h=0, v=0.

Mass: m = m0 - (m0-dryMass) * min(t,200)/200.

Thrust after t>=200 → 0.

Also after landing... rocket can't go below pad. If the rocket falls back and hits the ground, we stop? Set v=0 and h=0. That's fine. Also acceleration would be 0.

trail: array of {x,y,z} world points, one per step() call. Push only if alt changed? "one per step() call" — push exactly one per step. But with 10x speed each step advancing maybe 1/30*10 = 0.33 s, so ~ 600 points over 200 s / 0.33. Fine. Cap trail length maybe to avoid growth (but requirement says push one per step; we can cap by shifting when too long, still "one per step"). Keep e.g. max 4000 points.

Note: trail points should be world positions of the rocket — e.g., the base of the rocket (x, padY + alt, z) or a bit above (the engines). Use the nozzle position.

`__rocket.state()` returns { t, alt, vel (vertical velocity), acc (net vertical acceleration), pitch, speed }.

`__rocket.paused` boolean.

`__rocket.reset()` — resets simulation to t=0, rocket on pad, trail emptied (same array object → use `trail.length = 0`), clears viewer speed choice (back to automatic).

Speed: `state().speed` returns current value = time scale: 1 for t<10, then 10, unless viewer chose 1, 2, or 3 (x1, x10, x30). Keys 1,2,3 and three buttons.

Implement `speed()` function: if viewerSpeed !== null → viewerSpeed; else t < 10 ? 1 : 10.

Note: while t<10 with viewer choice, use the choice.

Now rendering.

Scene setup:
- scene = new THREE.Scene()
- fog: I'll use FogExp2 with color pale haze; update density each frame.

Sun: DirectionalLight, position direction; intensity ~3.0 (physically based? With ACES tonemapping and default lights, values like 2-3 are fine). Use `renderer.toneMappingExposure = 1`. Sun color slightly warm (0xfff2e0). Shadow camera covering pad area (e.g., ortho ±150, near 1 far 1000), positioned relative to pad. Set light.target at pad. Shadows: rocket, tower, masts cast; ground receives.

Hemisphere light for ambient sky: HemisphereLight(0xbfd6ff, 0x2a3a22, 0.35)? With PBR that works.

Maybe use an environment map from a PMREM of the sky? That would give nice reflections on the white rocket. Could generate a small procedural gradient environment using `THREE.PMREMGenerator.fromScene(new RoomEnvironment())`? RoomEnvironment is an addon; allowed ("three/addons/..."). But it looks indoor. Instead, create an env map from a simple gradient scene? Simpler: use `new THREE.Scene()` with a large sphere gradient... Too much. Use PMREM from the sky shader? Sky is centered on camera... complicated.

Alternative: create a small canvas gradient texture and set as scene.environment via EquirectangularReflectionMapping + PMREMGenerator. Cheap and gives realistic subtle reflections. Let's do: create a canvas 128x64 with vertical gradient (sky blue top to pale horizon to dark ground), `THREE.CanvasTexture`, mapping = EquirectangularReflectionMapping, then `pmrem.fromEquirectangular(tex).texture` as scene.environment. Nice. And update? No, static is fine. Add a sun blob in the canvas for specular highlight. Good.

Ground:
- Large local ground: CircleGeometry(30000, 64) rotated flat, at y=0? With a custom shader material for the land/ocean/roads? Or use canvas textures. Requirement: "procedural textures (canvas or shader) for the concrete, the ground and the vegetation."

Let's use canvas textures:
1. Ground texture: 1024x1024 canvas with noise of green/brown scrub, painted; repeat 40x over 30 km? Then detail is 750 m per tile — coarse but okay with vegetation objects.
2. Concrete pad texture: 512x512 canvas with grey noise and stains, repeat.
3. Rocket markings: canvas texture with flag + "SPX" lettering.

For ocean: a separate large mesh? Simplest: ground plane covering everything with a shader/vertex colors? Let's do:
- Land: CircleGeometry radius 20000 at y=0 with the scrub canvas texture (repeat).
- Ocean: a big PlaneGeometry (200 km x 200 km) at y=-1 (or 0.5 below) with a water material (MeshStandardMaterial color 0x123a55, roughness 0.15, metalness 0.0). Placed so the coastline is at x=+1500 m: ocean covers x from 1500 to 200000? Use plane 200000 x 200000 centered at (1500+100000, -1, 0)? Then the land circle overlaps the ocean plane on the west side; land at y=0 above ocean at y=-1 hides the ocean under land. Good. Coastline straight line at x=1500 m... A straight coastline is a bit odd but fine. Could make the land a shape with an irregular edge — skip; add some beach color? Let's just have a slight curve using a Shape? Simpler: keep straight; add a sandy beach strip (box/plane) along the coast at x≈1500.

But the ocean plane 200 km wide at y=-1 vs the Earth sphere... The Earth sphere top is at y=-100 (we lower it). Ocean plane extends to 100 km, where Earth sphere is at -100 - (100000²/1.27e7)= -100-787 = -887. So the ocean plane floats above the sphere. From 100 km altitude looking at horizon, the ocean plane edge at 100 km distance would be visible as a straight edge with a drop... but the fog/haze at that distance... At high altitude fog density low → visible edge. Hmm.

Alternative: make the ocean plane huge (2,000,000 m) and let the sphere be visible beyond? Earth's curvature: the ocean plane at y=-1 would then intersect the sphere at distance where d²/(2R) = 1 → d = 3570 m. Beyond that, the sphere pokes above the plane, ruining it.

OK so the flat plane approach conflicts with the sphere. Options:
(a) Drop the Earth sphere entirely and rely on a huge flat ocean/land plane + sky gradient + haze. The "curve of the Earth" not visible. Could fake curvature by bending the ground plane shader? 
(b) Use only the sphere (no flat plane) and place detail on top.

Actually (b) is workable: the sphere is the ground everywhere. Local details (pad, roads, buildings, vegetation, ocean plane? no) sit on top at the origin. The sphere's material must show ocean east / land west near origin.

The issue with (b) is the sphere's resolution near origin. A sphere with 1024x512 segments has 4096 triangles per... no: 1024*512*2 = 1M triangles, heavy but maybe okay? Each quad is ~12 km. Way too coarse near origin for a 3 km coastline. But the local detail area is covered by separate meshes (land patch and ocean patch) which sit slightly above the sphere (y = +1 m). Then at large distance the sphere shows generic continents.

But the ocean patch (say 20 km radius) hovering 1 m above the sphere: at 20 km distance the sphere is 31 m below → ocean patch edge floats 32 m above the sphere. Visible as a cliff at 20 km from the pad when at altitude? Angular size small; with haze, tolerable.

Hmm, honestly. Do we even need the Earth sphere? Let's consider the requirement: "the view of the coast, the curve of the Earth and then space are seen from near the rocket". The curve of the Earth is desirable but maybe achievable with a huge ground disc (radius 400 km) plus the sky. Actually a flat disc of 400 km radius viewed from 100 km: horizon at ~ 400 km; the disc edge would be visible as a circle... with the sky beyond. If the disc is huge and fogged, it reads as an atmosphere limb? Not really.

Alternative trick: the sphere is the ground AND we make the local detail meshes conform to the sphere curvature (place them at y = -d²/(2R) offset? no, they'd need to curve). Since within 3 km, the deviation is 0.7 m, negligible. Within 20 km, 31 m. So a flat local patch of radius 3 km at y=0 matches the sphere to within 0.7 m — invisible. Use a local detailed ground of radius 3 km (pad + surroundings), and beyond that use the sphere for the ocean and land. But then the coastline must be beyond 3 km, and the terrain from 3 km to the horizon is the sphere (which near origin is low-res). Bad: visible near the horizon at ground level (horizon at ~5-30 km).

Compromise: local flat ground disc of radius 30 km (covers to the visual horizon from low altitude), made of two parts: land (west of coastline) and ocean (east). Sphere below, offset -171 m at the seam, with a "skirt" (a cylinder/cone connecting the disc edge down to the sphere) colored hazy, or just rely on haze: at 30 km distance, haze with density 4e-5 gives ~76% fog, so the seam is mostly hidden at ground level. From high altitude, the seam is visible but the whole thing is tiny in view and fog density is lower... Hmm.

You know what — simpler: forget the Earth sphere; instead render the "curve of the Earth" by making the ocean a giant curved surface? 

Alternative: use a spherical cap! Build the ground as a sphere cap around the origin: a sphere of radius R centered at (0,-R,0), i.e., the actual Earth, BUT generate the cap geometry with radial rings so that resolution is high near the origin and low far away. Then apply a shader that colors it: land near origin, ocean beyond the coastline, continents by noise far away. This is elegant: one mesh, no seams. 

Generate a "polar cap" geometry: rings by ground distance from origin (r = 0, 100, 200, ... up to 2000 km), each ring a circle in the tangent plane, projected onto the sphere: point = (r*cosθ, -R + sqrt(R²-r²), r*sinθ). Normals are radial from the Earth center. Resolution: use many angular segments (128) and radial rings denser near origin (geometric progression). This gives a curved ground with a proper horizon from any altitude. 

The shader can color based on the local tangent-plane coords (x,z): land/scrub green near origin, ocean east of the coastline (x > 1200), roads? Skip roads in the shader; add separate road meshes near the pad.

This is nice! Let's do that. Ground cap radius out to, say, 1500 km (beyond the horizon from 100 km up... horizon from 100 km is 1130 km). Add rings up to 2000 km. From space at 100 km, the horizon is at ~1130 km and the Earth's limb curves. Beyond 2000 km the cap ends — but the horizon at 1130 km: the cap edge at 2000 km is below the horizon? Let's see: from altitude 100 km, a point at ground distance 2000 km is way beyond the horizon (1130 km) so it's not visible. Good, so the cap covers everything visible.

But we also need the sky/space to not show a gap below the horizon. The cap edge is below the horizon, so no gap. 

Cap size: 2000 km radius → depth below origin = r²/(2R) = 4e12/1.27e7 = 314 km. Camera far must exceed ~ 2000 km + 314 km. Set far = 1e7 (10,000 km), near = 0.3. With logarithmicDepthBuffer, fine.

Resolution: We need detail near the pad (a few cm? no—we cover the pad area with separate meshes: concrete pad, roads, buildings, vegetation, ocean?). Hmm, but the ocean must be the cap surface. The cap shader colors ocean beyond the coastline. So the "beach" is at 1200 m and the ocean is the cap. That's fine — the ocean is a very flat colored surface with roughness ~0.1 and a normal perturbation? Add wave normals via a procedural normal in the shader? Keep it simple: use MeshStandardMaterial? A custom shader is needed for land/ocean mixing.

Let's write a ShaderMaterial for the ground cap:
- Varyings: vWorldPos (or tangent coords), vNormal.
- Fragment: compute a "coast" mask: land if x < coastLine(z) where coastline is a gentle curve: `float coastX = 1300.0 + 400.0*sin(z*0.0004) + 150.0*sin(z*0.0013);` Land when x < coastX.
- Near origin land color: green/military scrub with noise (procedural fbm). Ocean: deep teal with a bit of specular? Use lighting: simple Lambert + Blinn-Phong specular for the ocean using the sun direction. Or better, set the material to be lit manually: compute diffuse with sun + sky ambient, plus specular for ocean highlight. That's doable in a custom shader.
- Add a beach strip: sand color where |x - coastX| < 60.
- Far away: mix land color to a generic green/brown, plus atmospheric haze based on distance from camera (aerial perspective): `fogColor` mix by exp(-dist * density) with a blue tint. Use a uniform for haze density driven by camera altitude. Or rely on scene fog: custom ShaderMaterial doesn't get fog unless we implement it, but we can include fog uniforms via `fog: true` and `THREE.UniformsLib.fog` merge, adding `#include <fog_pars_fragment>` etc. That's a nice approach: use ShaderMaterial with fog: true and include the fog chunks. But FogExp2 + our own computed distance... The fog chunks use vFogDepth = -mvPosition.z which is fine.

Actually simpler: use a MeshStandardMaterial with onBeforeCompile to inject color variation? Hmm, messy.

Let's use ShaderMaterial with manual aerial perspective: pass uSunDir, uSunColor, uHazeColor, uHazeDensity, uCameraPos. Compute distance from camera, mix with haze color (pale blue) with factor = 1 - exp(-distance * density * something). This also handles the space view (density low). And the ocean's sun glint.

OK. Ground cap generation in TS:

```ts
function makeEarthCap(radius: number, rings: number, segments: number) {
  const R = 6371000;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  // radial distribution: r_i = radius * (i/rings)^2.2  -> denser near origin
  const rr: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const f = i / rings;
    rr.push(radius * Math.pow(f, 2.5));
  }
  ...
}
```
With rings=160, segments=256 → 160*256*2 = 82k triangles. Fine.

Ring 0: r=0 with multiple coincident vertices (degenerate triangles at center). Handle by starting i=1 and adding a center vertex.

For each ring i (1..rings), for each segment j: theta = j/segments * 2π; x = r*cosθ; z = r*sinθ; y = -R + sqrt(R² - r²) (relative to ground origin). Normal = normalize(x, y + R, z)? The sphere center is at (0, -R, 0), so the normal = normalize(pos - center) = normalize(x, y+R, z). Since y = -R + sqrt(R²-r²), y+R = sqrt(R²-r²), so normal = (x, sqrt(R²-r²), z)/R. Good.

Use a non-indexed? Indexed is fine.

Vertex shader passes world position.

Actually, positions are in world coordinates; mesh at origin, no transform. Fine.

For fog and aerial perspective, we have world position and camera position.

Ocean shader specular: compute `reflected` glint: use Blinn-Phong with normal = smooth sphere normal (i.e., up approx) plus small wave perturbation via noise on xz. Might look okay.

But wait: this ground cap's ocean is flat-ish (curved over Earth), no wave displacement. From the launch pad, the ocean at 1200 m away is visible with a shoreline. Add separate beach/water detail? Not needed.

Also "roads and low buildings around it" — add a few instanced boxes with dark roofs, a road (long dark ribbon), and vegetation (instanced low-poly bushes/trees). Keep counts moderate.

Now: the pad.
- Concrete pad: a box or cylinder, e.g., CircleGeometry radius 60 m at y=0.5, with concrete canvas texture. Plus the flame trench: a rectangular hole/trench with two ramps? Build: pad surface as a box 120x120x1 at y=0, with a trench cut? Can't cut easily. Instead build the pad as several boxes leaving a gap: two side slabs with a trench in the middle (the trench along the x axis? For the exhaust to go sideways out of the flame trench). Let's make the trench a rectangular depression: pad slabs left/right of a trench of width 14 m running along z from -60 to 60? Actually the rocket sits over the trench; the exhaust deflects out one side. Simpler: build a raised concrete pad 3 m high, 100x100, and a dark trench opening under the rocket going toward +x with a slot. Use boxes: pad base with a gap: left slab x from -50 to -7, right slab x from 7 to 50, and a back slab. Then a dark trench floor at y=-6? But the ground is at y=0, and the pad is raised 3 m. Hmm.

Let's design: ground y=0. Launch pad: a concrete apron: a circular/rect slab 100 m x 100 m, 1.5 m thick, top at y=1.5. The rocket sits on a launch mount at the top of the pad (a steel table) at y=~7. Flame trench: a slot in the pad from the mount going in -x direction? Real Falcon 9 pad has a flame trench. Since the rocket is on a mount above the trench, exhaust goes down into the trench and out sideways.

Build:
- Apron: BoxGeometry(120, 1.5, 120) at y=0.75 (top at 1.5) — but with a trench cut. Instead make the apron from 4 boxes around a central trench 16 m wide (in x) running along z:
  - left slab: x from -60 to -8 → Box(52,1.5,120) at x=-34
  - right slab: x from 8 to 60 → Box(52,1.5,120) at x=34
  - (trench between x=-8 and 8, full z length, open at both z ends)
- Trench floor at y=-4: Box(16, 0.5, 120) at y=-4.
- Trench walls: the sides of the slabs (they exist as box sides).
- The rocket mount: a steel structure at y=1.5 to 6, holding the rocket; a box/table 20x4x20 at y=3.5? With the rocket's base at y = 7. Then the rocket's height 70 m tops at 77 m.

Hmm, for the camera at ground level, the rocket base at 7 m is fine.

Simplify: rocket base (pad level for physics) at y = 7. When alt = 0, the rocket bottom is at 7.

Flame trench visible as a dark opening; smoke comes out of both z ends and the top.

Launch tower: a lattice tower next to the rocket at x = +14 m? Typically the tower is beside. Height ~ 80 m. Build from thin boxes: 4 vertical columns with cross bracing, plus a service arm or two. Use InstancedMesh or just merge? Simple loop creating boxes and adding to a group: maybe ~100 boxes, fine.

Lightning masts: 3 lattice masts ~ 120 m tall around the pad, at radius 90 m, with catenary wires. Build masts as simple tapered cylinders or lattice; use thin cylinders (3 legs + cross braces) — keep simple: a tapered steel cylinder with a few crossbars? Requirement says "tall lattice lightning-protection masts". Let's do simple lattice: 3 vertical thin cylinders + diagonal braces, 60 m tall. And thin lines (wires) between mast tops using Line geometry.

Also the rocket: 
- Body: CylinderGeometry(1.85, 1.85, 60, 32) — the main stage plus second stage, white.
- Interstage: darker band at some height (e.g., y 42-46) — a cylinder with a slightly larger radius and dark gray material.
- Engine section: a cylinder at the bottom, dark gray/black, with 9 nozzle cones (Merlin engines) arranged in a ring of 8 + 1 center. Nozzles: ConeGeometry/CylinderGeometry inverted, dark metal with a glowing interior? Add a small emissive disc.
- Nose fairing: a cone or a capsule-shaped ogive at the top, white. Use LatheGeometry for the fairing shape for realism.
- Grid fins / landing legs — optional; add small boxes near the top? Realism++, but skip or add simple grid fins.
- Markings: a canvas texture with a flag and "SPACEX"-like lettering? Requirement says "a flag and lettering drawn on a canvas texture". We can draw an American flag and "FALCON" text. Apply as a decal: a separate plane wrapped on the cylinder? Simplest: a cylinder with the marking texture applied to a section (an open-ended cylinder segment of height 6 m and radius 1.86 with a transparent texture). Use CylinderGeometry(1.87, 1.87, 6, 32, 1, true, thetaStart, thetaLength) with the canvas texture mapped. Then the text will wrap. Good.

Canvas texture for body markings: 512x512, transparent, draw an American flag on the left and "FALCON 9" text? The flag drawing: draw a blue canton with white stars (as dots) and red/white stripes. Text: white or black? On a white rocket, the lettering is usually black "SPACEX". Draw "SPACEX" in black.

Apply to two spots: near the top and mid.

Rocket material: MeshStandardMaterial white (0xf2f2f2), roughness 0.45, metalness 0.05. Dark band: 0x1a1a1a roughness 0.6. Engine section: 0x2a2a2a metalness 0.8 roughness 0.4.

Plume and smoke particles.

Plume: Build a group attached to the rocket's base (nozzle exit). Two parts:
1. A bright core: a cone/cylinder of emissive material (additive blending), length grows as altitude increases (plume expands in vacuum). Use a Mesh with a custom shader or a simple additive MeshBasicMaterial with a procedural gradient texture. Let's use a cone geometry pointing down, with a canvas gradient texture (white-yellow core to transparent orange edges) on a `MeshBasicMaterial({ map, transparent, blending: AdditiveBlending, depthWrite: false })`. Scale length with altitude: length = 25 + alt*0.002? At 100 km, 25+200 = 225 m... "the plume grows longer and wider as the air thins". Also the width grows. Plus Mach diamonds: add a few small bright quads/discs along the core at regular intervals near the nozzle (visible only at low altitude, fade with altitude).

2. Lights: a PointLight at the nozzle, intensity flickering with time, color white-yellow, distance ~200 m, castShadow false. Also light the smoke.

3. Smoke particles: use a Points system with a soft circular sprite texture (canvas radial gradient) and additive? No — smoke is white/gray, not additive. Use normal blending with a texture, depthWrite false, transparent, and sort issues. Points with size attenuation. Large counts (2000-4000). Each particle has: position, velocity, age, life, size, and drag/buoyancy. Update per frame.

Use a custom ShaderMaterial for points with per-particle attributes (size, opacity, color) and soft circular alpha, plus fog. Or use THREE.PointsMaterial with a map... PointsMaterial doesn't allow per-particle color easily (vertexColors allows color but not opacity/size). Custom ShaderMaterial with attributes: aSize, aOpacity, aColor (or just brightness). Use the built-in `size` uniform with gl_PointSize = aSize * (300.0 / -mvPosition.z) etc.

I'll write a ParticleSystem class with a BufferGeometry and dynamic attributes updated each frame. Maybe simpler: maintain arrays of particle data and write positions each frame. With 3000 particles that's fine.

Two particle systems:
- Pad smoke/steam: spawned during the first ~30 s at the trench ends and around the pad, big soft white puffs that roll sideways and rise. Color white/pale gray. Size 10-40 m growing over life. Life ~8-20 s.
- Exhaust plume particles: bright orange/white additive sprites emitted from the nozzle downward, moving fast, short life.
- Contrail: "the contrail stays in the sky and drifts slowly" — spawn puff particles at the rocket's position during ascent (after leaving the pad, or the whole time), with long life (never die within the mission), slowly expanding, white/ice. Use a separate particle system with a long life (e.g., 600 s) and low drift. Also the trail line: "a visible white contrail behind the rocket, drawn from the trail points" — implement a Line with a BufferGeometry updated from the trail array (LineBasicMaterial white, transparent 0.5). Hmm, at world scale with pitch, the trail of base positions is a curve in x-y; a line is thin. Use a tube? Simpler: use a Line with linewidth 1 (can't change width in WebGL). For visibility, use both the line and particles? Use a custom mesh ribbon: build a triangle strip from trail points with a width perpendicular to the view? Complex. Let's use a `Line` with a bright white color and also spawn contrail particles that drift slowly. Good enough. Actually, three's Line with 1px width is barely visible from far. A ribbon: for each trail point, compute the perpendicular in the plane facing the camera... Let's instead use a "smoke trail" mesh made of quads (billboards) — no.

Alternative: create a `THREE.Line` but scale up: use LineBasicMaterial with color white, and set `linewidth` (ignored). Hmm.

Better approach: build a ribbon geometry manually each frame from the last N trail points: for each point i, compute tangent t = normalize(p[i+1]-p[i-1]), and a side vector s = normalize(cross(t, viewDirToCamera)) * halfWidth. Build a triangle strip with two vertices per point. Width ~ 2-4 m. But the contrail should look like smoke and expand. Given the camera is a chase cam within 100 m, a 4 m wide ribbon is visible. Let's do the ribbon with a dynamic BufferGeometry with capacity for N points, updating each frame. N maybe 3000. Using camera-facing sides, recompute each frame — 3000*2 vertices fine.

Hmm, this adds complexity. Let's implement a simpler ribbon: since the trajectory lies in the x-y plane (z=0), the ribbon can be oriented along z: width in z. For a camera near the rocket looking at it, a ribbon in the y-x plane with z width is visible from the side. Since the camera orbits around (mostly staying in the x-y plane), a z-oriented ribbon would be edge-on sometimes. Use a camera-facing ribbon.

I'll implement the ribbon with both side vectors computed via cross(tangent, toCamera).

Also for the smoke: "large billowing white steam and smoke clouds that roll sideways out of the flame trench along the ground and then rise". So spawn particles at (0, 2, ±60) with velocity outward along z, plus up. Actually the trench runs along z, exhaust exits both ends (z = ±60). Emit from those two points with velocities ±z and up. Also emit from the pad top around the rocket base.

Contrail: emitted from the rocket's position while alt > ~200 m, as white puffs slowly expanding and drifting, life very long (or infinite with a cap).

Performance: particle counts: pad smoke 2500, plume 1500, contrail 1500. Each with position/size/opacity updates per frame. Fine.

Let's use additive blending for the plume (bright), normal for smoke.

Camera logic:
- Phase 1 (t < 8 s or until rocket clears the tower, alt > 90 m): camera near the pad at a low position, looking up at the rocket. Position e.g. (70, 6, 90)? Looking at the rocket base/top. Let's have a fixed ground camera at (-90, 5, 110) looking at the rocket (target = rocket position + 30 m). Actually "A low camera near the pad looking up at liftoff". Place at (60, 2.5, 85) with a slight FOV. Hmm, the rocket at x=0,z=0. Let's place the camera at (75, 3, 95) (distance ~120 m), look at the rocket center (0, 40, 0). Fine.
- Transition: as the rocket climbs above ~100 m, blend to chase cam.
- Chase cam: offset from the rocket, e.g., 60-90 m behind and to the side, looking at the rocket. The rocket goes mostly along +x. So the camera should be behind in the -x direction? But we want to see the coast. Let's place the camera offset rotating slowly: offset = (dx, dy, dz) where the camera stays ~80 m from the rocket and looks at it, with a slight downward angle to include the plume and ground. As the rocket ascends, the offset direction could rotate. Smooth with lerp.

Implementation: compute desired camera position:
```
const rocketPos = new THREE.Vector3(rx, baseY+alt, 0);
const center = rocketPos + (0, 30, 0) (rocket mid)
```
For chase: desiredPos = rocketPos + offset where offset = new Vector3(-70, 25, 100)? That's ~ 130 m away. Spec says within about 100 m. Use offset length ~85 m: offset = (-45, 20, 65) → length ~81. Good. But as the rocket pitches toward +x, we want the camera to see it against the ground/ocean. Keep offset fixed in world space (not rotating with the rocket), lerped over time maybe with a slow orbit.

Phase transitions with smoothstep on alt or time: 
- blend = smoothstep(80, 250, alt) → 0 at ground camera, 1 chase.
- Also when the rocket goes high, the camera stays 85 m away, so the ground falls away, Earth curvature visible.

Camera look-at: lerp between the pad look target and the rocket center.

Additionally the camera should keep the rocket in frame; with a fixed relative offset it will.

Note: once the rocket is very high and moving fast, the camera follows exactly. Good.

At the end (rocket falls back), whatever.

Also smooth: use damping (lerp with 1-exp(-k*dt)).

FOV: maybe narrow it slightly at altitude (85 → 60)? Keep 55.

Now physics integration with time scale: at speed 30, each frame dt = min(delta,1/30)*30 ≈ 1 s sim; substeps 0.02 → 50 substeps per frame. Fine.

Trail: push one point per step() call, not per substep. Good (as specified).

But visual smoothness: the rocket position updates per frame, and at 30x with 1/30 s frame it moves ~1 s of sim = maybe 1000 m per frame. That's okay; it's a fast-forward.

Now the `step(dt)` function must handle arbitrary dt, using substeps of ≤0.02 s.

```ts
const state = { t:0, alt:0, vel:0, acc:0, pitch:0, hVel:0, x:0 };
function step(dt: number) {
  if (!(dt > 0)) return;  // guard
  let remaining = dt;
  const MAX = 0.02;
  while (remaining > 0) {
    const h = Math.min(MAX, remaining);
    remaining -= h;
    integrate(h);
  }
  pushTrail();
}
```
If paused, the render loop doesn't call step; but step itself can still be called manually.

Integrate:
```ts
function integrate(dt:number) {
  const t = state.t;
  const burn = 200;
  const mass = t < burn ? m0 - (m0 - dryMass) * (t / burn) : dryMass;
  // mass at time t; use current mass
  let thrust = t < burn ? 1.3*m0*g0 : 0;
  thrust = Math.min(thrust, 3 * mass * g0);
  const p = pitchAt(t);
  const g = g0 * Math.pow(R/(R+state.alt), 2);
  const aT = thrust/mass;
  const ay = aT*Math.cos(p) - g;
  const ax = aT*Math.sin(p);
  state.vel += ay*dt;
  state.hVel += ax*dt;
  state.alt += state.vel*dt;
  state.x += state.hVel*dt;
  if (state.alt < 0) { state.alt = 0; state.vel = Math.max(0, state.vel); state.hVel = 0; }
  state.acc = ay;
  state.t += dt;
  state.pitch = pitchAt(state.t); // or after
}
```
Careful with mass and thrust at the moment. Also once the rocket is on the pad with t increasing before liftoff — T/W = 1.3 > 1 so it lifts immediately.

Also when it crashes back: alt = 0, vel = 0 — the rocket sits on the pad. That's fine.

pitchAt(t):
```ts
function pitchAt(t: number) {
  if (t <= 10) return 0;
  if (t <= 150) return 0.5 * Math.pow((t-10)/140, 1.7);
  return 0.5 + 0.35 * (1 - Math.exp(-(t-150)/120));
}
```
Hmm at t=150: 0.5*1 = 0.5. Good. Then grows to 0.85 asymptotically. Never decreases. Good.

But "pitch is 0 at liftoff; after 10 s it starts to grow". Good.

Hmm, but this pitch function is not a true gravity turn (which is derived from dynamics). Requirement just says gravity turn reaching 0.5 rad; okay.

Also note with pitch ~0.5 rad, horizontal velocity accumulates; the rocket moves downrange +x. The chase camera stays in world offset; the rocket flies away from the pad in +x while the camera follows. Ground features scroll. Fine.

Wait: the rocket moves in +x, toward the ocean (coastline at x=1200 m). Over 200 s with a horizontal velocity of maybe 500 m/s, it goes 50 km. That's fine, out over the ocean. Good — realistic (Falcon 9 goes east over the Atlantic).

Now `state().speed` — returns the current time scale.

The API object:
```ts
const trail: {x:number,y:number,z:number}[] = [];
(window as any).__rocket = {
  reset, step, state, trail, paused: false,
  ...
};
```
`paused` is a property on the object, not a getter. The render loop reads `__rocket.paused`.

Note: "paused: boolean (when true, the render loop does not call step())".

Also the viewer's speed choice: keys/buttons; store in a variable; `reset()` clears it.

Now the render loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!rocketApi.paused) {
    const spd = currentSpeed();
    rocketApi.step(Math.min(dt, 1/30) * spd);
  }
  updateVisuals(dt);
  composer.render();
  if (firstFrame) { firstFrame=false; (window as any).__ready = true; }
});
```
Hmm "After the first frame is rendered, set __ready = true". Set after composer.render() on the first frame. Good.

Wait — the dt: if paused, time doesn't advance but visuals should still update (smoke decays, flicker). Fine.

Note that step is only called when not paused. Also with speed multiplier. And the render loop should use `min(delta, 1/30) * speed`.

Use `clock.getDelta()` but the first delta may be large; clamp to 1/30 effectively in step. For visual updates use a clamped dt.

Now update visuals:
- rocketGroup.position.set(state.x, padTop + state.alt, 0); rotation.z = -pitch.
- Actually the rocket base is at padTop + alt. But the rocket is on a mount 7 m up; at alt=0, base y = 7. Hmm, but the trail should be at world coords. Fine.

Wait — if alt = 0 the rocket is on the pad; as the sim starts it lifts off immediately. Good.

- The rocket's base position for plume/trail: use rocketGroup.localToWorld or just compute (state.x, 7+alt, 0).

- Plume: attach to the rocket group at y=0 (base). Since the group rotates with pitch, the plume points down along the rocket's axis. Good.

- Contrail spawn at the nozzle world position.

Camera:
```
const alt = state.alt;
const rx = state.x;
const rocketBase = new Vector3(rx, padTop+alt, 0);
const rocketMid = rocketBase + (0,35,0) rotated? Just vertical offset.
```
Chase target = rocketBase + (0, 28, 0) (mid-body). The rocket tilts, so the top moves toward +x by ~sin(pitch)*70 = 34 m at 0.5 rad. Maybe target = rocketBase + rotated(0,35,0) using the pitch: (sin(p)*35, cos(p)*35, 0). Nice.

Chase camera position: target + offset where offset = (-55, 22, 78)? Let's compute length: sqrt(3025+484+6084)=98. Good, within 100 m.

But at liftoff, the pad camera at (75, 3, 95) — distance ~120 m, okay "low camera near the pad".

Blend factor b = smoothstep(60, 220, alt). Camera pos = lerp(padCam, chasePos, b). But at b=0 with the rocket on the pad, chasePos would be at (-55,~29,78) which is also near the pad. The pad camera should be static, looking at the rocket: pos (95, 2.6, 105), look target (0, 40, 0).

Actually we want a low camera looking up. Let's put the camera at (80, 2.2, 120), target (0, 45, 0) → looking up ~ 17°. Fine.

Also handle the case where the rocket is high: the ground camera stays at the pad; but b→1 so we follow.

Smooth camera: instead of lerping positions directly (which can cause jitter with the fast rocket), the chase offset is constant relative to the rocket, so no jitter. Blend with b computed from altitude (smooth). Also add slight smoothing on the look target: lerp target with damping.

One issue: at high speed (30x), the rocket position jumps ~1000 m/frame; the camera follows with the same jump, so visually it's fine (the ground scrolls fast).

Sky: update uAltitude with the rocket altitude (or camera altitude — use the rocket altitude as required). Sky mesh position = camera.position.

Also scene.fog density should follow altitude: `density = 3.5e-5 * Math.exp(-alt/6000)` maybe. Hmm, at alt=0 you want haze at 20-30 km. FogExp2 with density 3.5e-5: at 10 km, (0.35)² = 0.1225 → 11.5% fog. At 30 km, 1.1 → 67%. Reasonable. At 100 km, exp(-16) ≈ 0 → clear. But we want a blue limb — the ground shader's own aerial perspective handles that. Let's use a custom ground shader with its own haze. And also set scene.fog for other objects (trees, buildings, tower) — a FogExp2 with density tied to altitude.

Actually, using scene.fog with custom shaders requires the fog chunks; our ground shader will do its own thing, and the sky is unfogged. Let's just set scene.fog = new THREE.FogExp2(0xbcd4e6, density) and let standard materials use it. And the particles? Points with ShaderMaterial - we can skip fog or implement fade by distance.

OK.

Bloom: EffectComposer with RenderPass + UnrealBloomPass(resolution, strength 0.6, radius 0.4, threshold 0.85). Need resize handling for the composer too.

Note: with ACES tonemapping, bloom pass works in linear space then the output pass applies tone mapping? EffectComposer: the RenderPass renders the scene to a target (renderer.toneMapping applies to the final output...). Actually with post-processing, tone mapping happens in the render pass output when rendering to a render target? Three applies tone mapping in the material shaders when `renderer.toneMapping` is set, regardless of the target. Hmm, actually three's tone mapping is applied in the fragment shader of materials (for the built-in tone mapping chunk) — so it applies also when rendering to a render target. That can look washed with bloom. Many examples set `renderer.toneMapping = ACESFilmic` and use the composer; it works fine (bloom applied on tone-mapped colors). Acceptable.

Let's now write the code carefully.

Structure:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ---------- constants
const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const DRY = 220000;
const BURN = 200;
const THRUST = 1.3 * M0 * G0;
const PAD_TOP = 7;   // rocket base height above ground when on pad
```

Hmm: physics alt is above the pad; the rocket cannot go below the pad → alt>=0.

Now the code for the scene parts.

Let me write out the whole file mentally and check TS types.

```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.3, 1.2e7);
camera.position.set(90, 2.5, 120);
```

Renderer:
```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.logarithmicDepthBuffer = true;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);
```
Note: logarithmicDepthBuffer with custom ShaderMaterials — the logdepthbuf chunks need to be included in the custom shader for correct depth! Hmm. With logarithmicDepthBuffer, three's built-in materials include #include <logdepthbuf_pars_vertex> etc. For a custom ShaderMaterial, if we don't include the chunks, depth will be wrong (it writes standard gl_FragDepth? No—logarithmicDepthBuffer in three is done via gl_FragDepthEXT in the shader; without the chunk, the material writes normal depth and gets z-tested against... the built-in materials also write log depth. Inconsistent → depth artifacts).

Options: enable logarithmicDepthBuffer and include the chunks in custom shaders, or disable it and use a large far plane with a near plane of 1 m. Given the scale (0.3 m to 10,000 km), we need log depth. Let's include the logdepthbuf chunks in the ground shader and any custom shaders that write depth. Points shaders with depthWrite false still need correct depth testing... they'd fail the depth test against the log depth buffer. Hmm.

Alternative: avoid a custom ShaderMaterial for the ground by using MeshStandardMaterial + onBeforeCompile injection? onBeforeCompile keeps all the chunks including logdepth. That's a good approach: use a MeshStandardMaterial for the ground and inject color variation + ocean specular via onBeforeCompile. That's more complex to write but keeps PBR lighting and logdepth and fog automatically.

Hmm, but writing the ground coloring in the standard material requires replacing the `#include <map_fragment>` and modifying roughness/metalness. Doable:

```ts
const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
groundMat.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGPos = (modelMatrix * vec4(position,1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGPos;\n' + noiseFunctions)
    .replace('#include <map_fragment>', `... custom color ...`)
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.95, 0.12, oceanMask);')
    ...
};
```
This is a solid approach. But writing GLSL noise in a TS template string is fine.

Hmm, but the ground sphere normals are correct; the ocean should have lower roughness for sun glint, and could get normal perturbation. Roughness map injection works.

I think this is manageable. Alternatively, use logarithmicDepthBuffer = false and set near = 1, far = 2e7? Depth precision: with a 24-bit depth buffer and near=1, far=2e7, precision at 100 m: z precision ~ ... With a perspective projection, precision at distance d ≈ d² * (1/near - 1/far) / (2^24) ≈ d²/near/16.7e6. At d=100: 10000/1/1.67e7 = 0.0006 m. Actually that's fine! At d=1000: 0.06 m. At d=1e6: 60,000 m — but at that distance, precision doesn't matter much. Hmm, actually the issue is the ground at 100 km distance and the rocket at 100 m — depth buffer resolution at 100 km is huge, but that's fine as nothing else is there.

The real problem is geometry close to the camera (rocket at 80 m) vs far (Earth at 100 km): both need depth testing, and with a single depth buffer, objects at 80 m get precision ~0.0004 m — fine. Objects at 100 km get precision 60 km — but that's okay since nothing overlaps at that distance except the ground vs. the sky (sky has depthTest false).

So maybe I don't need logarithmic depth! With near = 0.5, far = 2e7: at d=80 m precision = 6400/0.5/1.67e7 = 0.00077 m. Good. At 1 km: 0.12 m. Good. At 100 km: 1200 m — the ground and the rocket are far apart there. Z-fighting risk: the rocket sitting on the pad, the pad details at 1-100 m from the camera — precision fine. The Earth cap near the camera also fine.

But wait: at high altitude, the camera is at 100 km and the ground at 100 km distance. Depth precision there is ~1200 m, but the ground is a single surface; no z-fighting. The rocket is at 80 m from the camera → good precision.

Objects far away but overlapping in depth: the launch tower vs. the rocket at ~100 m — fine.

So skip logarithmicDepthBuffer. Use near = 0.5, far = 2.0e7. Hmm, but precision near 0.00077 m means at the pad, objects 1 mm apart z-fight — not an issue.

Actually careful: the depth precision formula is nonlinear; near=0.5 makes precision at 100 m about 0.0008 m? Let me recompute: for a perspective projection, depth precision Δz ≈ z² * (far-near)/(near*far*2^bits)... roughly z²/(near * 2^bits) for far>>near. z²=1e4, near=0.5 → 1e4/0.5 = 2e4, /1.67e7 = 0.0012 m. Yes ~1 mm at 100 m. Fine.

At 1 km: 1e6/0.5/1.67e7 = 0.12 m. Two buildings 0.12 m apart at 1 km would z-fight — not an issue.

Good, no log depth needed. But then custom shaders are simple. 

Let's still set near = 0.5, far = 2e7.

Hmm, one thing: the sky sphere radius 1e6 centered on the camera is within far. Good.

The Earth cap extends 2000 km from the origin; when the camera is at 100 km altitude, distances up to ~2100 km < 2e7. Good.

Now, the ground cap and the ocean color. Let's write a custom ShaderMaterial for the ground with manual lighting (diffuse + specular + haze). Then no need for the standard material complexity, and it gets exactly the look we want. Since lighting is manual, include sun direction and ambient.

But shadows: the ground should receive shadows from the tower/rocket? A custom ShaderMaterial receiving shadows requires shadow map chunks. Skip shadows on the ground; instead put a shadow-receiving concrete pad (MeshStandardMaterial) near the rocket, which is where it matters. Actually the pad and the immediate ground: use MeshStandardMaterial for the concrete pad (receives shadows). The big terrain cap gets no shadows — fine since it's mostly distant.

OK, decision:
- Terrain: custom ShaderMaterial (no shadows), manual lighting + haze.
- Pad concrete: MeshStandardMaterial with canvas texture, receives shadows.
- Rocket, tower, masts, buildings: MeshStandardMaterial, cast/receive shadows.
- Vegetation: instanced meshes (cast shadows off for perf, maybe).

Sun shadows: directional light with an ortho shadow camera covering ~ 200x200 m around the pad, following the pad (not the rocket). Since the rocket flies away, shadows only near the pad — fine.

Now, the vegetation: instanced low-poly bushes (icosahedron spheres scaled) colored dark green, scattered over an area of 3000 m around the pad, avoiding the pad and the ocean (x<coast). Use InstancedMesh with ~1500 instances of a low-poly bush. And some palm trees? Keep simple: bushes + a few palmetto-ish cones.

Buildings: a few low boxes with light gray/white walls and dark roofs at 300-800 m distance, plus a horizontal assembly building maybe.

Roads: dark gray long thin boxes on the terrain (y=0.05) going toward the pad from the south, plus a couple of cross roads. Add a beach road along the coast.

The terrain shader must not paint the ocean where the roads are... roads are separate meshes above.

Also the ocean needs to be to the east (x>coast). Let's set the coastline at x = 1500 m, running roughly north-south with a wavy shape, and the ocean occupying x > coast. But the camera looks from the pad; the ocean should be "on the horizon behind the pad". If the camera is at (90,2.5,120) looking toward (0,40,0), i.e., looking mostly -x and up, the ocean at +x would be behind the camera. Hmm.

Let's place the ocean to the -x? Then the rocket pitches toward +x (over land). Real Cape Canaveral: launches go east over the Atlantic. Let's make the rocket pitch toward -x (rotate +pitch) and put the ocean at -x. Or put the ocean at +x and have the camera positioned so that the view direction includes the ocean.

The camera at (90, 2.5, 120) looking at (0, 40, 0): direction ≈ (-90, 37.5, -120) → mostly -x, -z. The ocean at x > 1500 is behind. Let's put the ocean to the... hmm, with the rocket flying toward +x over the ocean, the chase camera behind the rocket (at -x offset) looks toward +x and sees the ocean and the coast. That's the money shot! So the ocean at +x is good for the chase, but at liftoff the pad camera sees land behind the rocket. Fine? Requirement: "the Atlantic Ocean on the horizon behind the pad". Hmm, "behind the pad" — with the pad at the origin and the ocean to +x, and the ground camera at +x looking at the pad, the ocean is behind the camera.

Let's rearrange: ocean to the -x direction? Then the rocket should pitch toward -x to fly over the ocean. Pitch rotation about z by +pitch maps +y to (-sin, cos) → toward -x. So define the thrust direction as (-sin p, cos p). Then the rocket flies toward -x over the ocean. The ground camera at (90, 2.5, 120) looking toward the origin looks in -x direction → ocean on the horizon behind the pad. And the chase camera sits behind the rocket at +x offset, looking toward -x: it sees the rocket and the ocean/Earth below. 

So: ocean at x < -1200 (coastline at x ≈ -1200), land at x > -1200. Rocket pitches toward -x, horizontal velocity negative.

Camera chase offset: target + (70, 20, 80)? Length ~ 108. Use (60, 18, 70) → 93.7. The camera looks toward -x, and the plume below. Good.

The sun: place it to light the rocket nicely, e.g., sun direction from the east-southeast, low-ish angle: sun at position (0.6, 0.55, 0.4) normalized * 1000. With the ocean at -x, a morning sun over the Atlantic at -x would be backlighting. Let's put the sun high to the south-east: direction (0.5, 0.75, 0.45). Fine: sun from +x +z, so the rocket is lit from the front-right when viewed from the pad camera at +x +z... The pad camera at (90,2.5,120) looking toward -x: the sun at +x is behind the camera → frontal lighting, good visibility, blue sky behind the rocket. Nice.

Hmm, but the ocean at -x in the background: the sun behind the camera → the ocean is lit, fine.

Sky gradient: The sun's position in the sky shader drives the glow. With a hazy horizon, it looks good.

Now let's write the sky shader.

```glsl
uniform vec3 uSunDir;
uniform float uAlt;
varying vec3 vDir;  // direction in world space (normalized)

void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 haze = vec3(0.72, 0.80, 0.88);
  vec3 mid  = vec3(0.28, 0.48, 0.78);
  vec3 zenith = vec3(0.06, 0.16, 0.42);
  float t = clamp(y, 0.0, 1.0);
  vec3 col = mix(haze, mid, smoothstep(0.0, 0.25, t));
  col = mix(col, zenith, smoothstep(0.15, 1.0, t));
  // below horizon: pale (fog) 
  col = mix(col, haze*0.8, smoothstep(0.0, -0.15, y));
  // sun
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += vec3(1.0,0.85,0.6) * pow(sd, 1200.0) * 25.0;
  col += vec3(1.0,0.8,0.55) * pow(sd, 8.0) * 0.25;
  // altitude darkening
  float a = clamp(uAlt / 100000.0, 0.0, 1.0);
  float dark = smoothstep(0.0, 1.0, pow(a, 0.6));
  // keep a horizon glow
  col = mix(col, vec3(0.0), dark * smoothstep(0.02, 0.6, t));
  // stars
  ...
  gl_FragColor = vec4(col, 1.0);
}
```
Careful with the "below horizon" sky: since the ground covers it, rarely visible.

Star field: compute from direction using a 3D cell approach may be better than lat-long. Use the lat-long approach; the poles are distorted but the camera looks around the equator mostly.

```glsl
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y,-1.0,1.0)) / 3.14159265 + 0.5);
vec2 g = uv * vec2(600.0, 300.0);
vec2 id = floor(g);
vec2 f = fract(g) - 0.5;
float h = hash(id);
float star = smoothstep(0.35, 0.0, length(f)) * step(0.995, h);
float h2 = hash(id + 17.0);
float tw = 0.6 + 0.4*sin(uTime*2.0 + h2*50.0);
col += vec3(0.9,0.95,1.0) * star * tw * smoothstep(65000.0, 105000.0, uAlt) * (0.5 + 1.5*h2);
```
600x300 cells → many stars, each cell 0.6° × 0.6°. Step 0.995 → ~0.5% of cells → 900 stars. Reasonable.

Star visibility: also stars should be visible "above about 70 km" and clearly above 100 km. smoothstep(70000, 110000) gives full at 110 km. Plus the sky must be dark by then (it is).

Note the sky sphere geometry: SphereGeometry(1e6, 32, 16). Position it at the camera each frame. Since it's huge and centered, the direction = normalize(position) in local space. Use vDir = position (local, since no rotation). Careful: the mesh is translated only, so local position = direction. Compute vDir = normalize(position) in the vertex shader. Good.

Material: ShaderMaterial({side: BackSide, depthWrite:false, depthTest:false, fog:false}), renderOrder = -1? With depthTest false and drawn first... For opaque objects, three sorts them front-to-back by z but renderOrder overrides. Set renderOrder = -1000 and the object will be rendered first among opaque. Then it fills the background; the rest is drawn over. Since depthWrite false, no depth interfering. 

But with depthTest false, the sky also draws over... nothing else yet. Fine.

Hmm, careful with the EffectComposer: the RenderPass clears with the clear color; the sky covers all.

Now the ground cap shader. Since it's a ShaderMaterial without lighting chunks, we do manual lighting.

Vertex:
```glsl
varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Fragment:
```glsl
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uHaze; uniform float uHazeDensity; uniform vec3 uCamPos; uniform vec3 uAmbient;
varying vec3 vWorld;

float hash(vec2 p){...}
float noise(vec2 p){...}
float fbm(vec2 p){...}

void main(){
  vec3 n = normalize(vWorld - vec3(0.0, -6371000.0, 0.0));
  vec2 p = vWorld.xz;
  // coastline
  float coast = -1250.0 + 220.0*sin(p.y*0.00055) + 90.0*sin(p.y*0.0017 + 1.3);
  float ocean = smoothstep(coast - 40.0, coast + 40.0, p.x); // ocean where x < coast
  float beach = smoothstep(0.0, 90.0, abs(p.x - coast)) * ... 
```
Hmm, let me define `float landMask = step(coast, p.x)` → 1 on land (x > coast).

Wait, the ocean at x < coast? Coastline at x = -1250, ocean further negative. So oceanMask = smoothstep(coast+30, coast-30, p.x) → 1 when p.x < coast-30. Let's do:

```
float d = p.x - coast; // negative = ocean
float oceanMask = 1.0 - smoothstep(-30.0, 30.0, d); // 1 for ocean
float beachMask = exp(-pow(d/70.0, 2.0));
```

Land color: green scrub mix:
```
float n1 = fbm(p*0.004);
float n2 = fbm(p*0.03);
vec3 land = mix(vec3(0.10,0.17,0.07), vec3(0.22,0.28,0.12), n1);
land = mix(land, vec3(0.35,0.33,0.22), smoothstep(0.5,0.8,n2)*0.5); // sandy patches
```
Ocean color: deep blue with a slight gradient by distance? Just `vec3(0.02,0.09,0.16)`. Add waves specular: perturb n a bit:
```
vec2 w = vec2(sin(p.x*0.02 + uTime*0.7), cos(p.y*0.017 + uTime*0.5));
n = normalize(mix(n, normalize(n + vec3(w.x*0.02, 0.0, w.y*0.02)), oceanMask));
```
Lighting:
```
float ndl = max(dot(n, normalize(uSunDir)), 0.0);
vec3 diffuse = albedo * (uSunColor * ndl + uAmbient);
// specular for ocean
vec3 v = normalize(uCamPos - vWorld);
vec3 h = normalize(normalize(uSunDir) + v);
float spec = pow(max(dot(n,h),0.0), 200.0) * oceanMask * 2.0;
col += uSunColor * spec;
```
Haze (aerial perspective):
```
float dist = length(uCamPos - vWorld);
float f = 1.0 - exp(-dist * uHazeDensity);
col = mix(col, uHaze, f);
```
Also add a slight blue tint with distance. And a "limb" atmosphere when looking at the far horizon: the haze color pale blue.

Note the earth cap is not affected by scene fog, so set fog there manually.

We need uTime for waves — or skip waves. Let's include a simple time uniform.

Hmm, this is getting long but fine.

Now the concrete texture via canvas:
```ts
function makeConcreteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9a9a97'; ctx.fillRect(0,0,512,512);
  for (let i=0;i<9000;i++){
    const x = Math.random()*512, y = Math.random()*512;
    const g = 130 + Math.random()*60;
    ctx.fillStyle = `rgba(${g},${g},${g-4},${0.06+Math.random()*0.15})`;
    ctx.fillRect(x,y,1+Math.random()*3,1+Math.random()*3);
  }
  // stains
  ...
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8,8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```
Note: `document.createElement('canvas').getContext('2d')` returns CanvasRenderingContext2D | null; use `!`.

Rocket marking texture: 1024x256 transparent canvas, flag on the left and text.

```ts
function makeMarkingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width=1024; c.height=256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0,0,1024,256);
  // flag
  const fx=40, fy=60, fw=200, fh=110;
  ctx.fillStyle='#b22234'; ctx.fillRect(fx,fy,fw,fh);
  ctx.fillStyle='#fff';
  for (let i=1;i<13;i+=2) ctx.fillRect(fx, fy + i*(fh/13), fw, fh/13);
  ctx.fillStyle='#3c3b6e'; ctx.fillRect(fx,fy,fw*0.4,fh*0.54);
  // stars (dots)
  ctx.fillStyle='#fff';
  for (let i=0;i<5;i++) for (let j=0;j<4;j++){ ... small rects }
  // text
  ctx.fillStyle='#111'; ctx.font='bold 90px sans-serif'; ctx.textBaseline='middle';
  ctx.fillText('SPACEX', 300, 128);
  return texture (transparent)
}
```
Font: 'sans-serif' is a system font, not external. Fine.

Apply to a curved surface: CylinderGeometry(1.88, 1.88, 4.5, 64, 1, true, -Math.PI*0.5? ...). The texture wraps around the open cylinder; the full 1024 width wraps 360°, so the flag+text appear once around. Use one decal ring near the top (y ~ 52 m) and maybe another near the bottom. Use `transparent: true, depthWrite: false, polygonOffset` to avoid z-fighting with the body (radius +0.02 offset avoids it).

Rocket build (local coords, base at y=0):
- Engine section: cylinder r=1.85, h=4.5, at y=2.25, dark metal.
- Nozzles: 9 cones, at y=0.6, arranged r=0.75 ring of 8 at radius 1.25, center one at 0. Cone height 1.6, radius 0.45, pointing down (rotate x by PI). Use ConeGeometry(0.45, 1.6, 12, 1, true) open-ended, dark, with a glowing disc at the top? The nozzle interior glows when the engine runs: add an emissive small disc/sphere at the nozzle exit with an additive material whose intensity depends on thrust.
- First stage body: cylinder r=1.85, from y=4.5 to y=45 → height 40.5, center y=24.75. White.
- Interstage: cylinder r=1.86, height 5, y=45..50, dark gray (0x303030).
- Second stage: from y=50 to y=62, white.
- Fairing: LatheGeometry ogive from y=62 to y=70, white.
- Total 70 m. 

The fairing: create points along an ogive curve:
```ts
const pts: THREE.Vector2[] = [];
for (let i=0;i<=20;i++){
  const t = i/20;
  const y = 62 + t*8;
  const r = 1.85 * Math.pow(1 - t*t, 0.5) ... 
}
```
Ogive: r(t) = 1.85 * sqrt(1 - t^2)? At t=1 → 0. But a fairing is more like a bullet. Use r = 1.85 * Math.pow(1 - Math.pow(t, 2.2), 0.5). Good. Lathe with points from (r, y).

Actually LatheGeometry takes Vector2 (x=radius, y=height) and rotates around Y. Add a point at the tip (0, 70). Good.

Materials: white body MeshStandardMaterial({color:0xf4f5f6, roughness:0.42, metalness:0.05}); dark band 0x1b1c1e roughness 0.55; interstage maybe 0x2b2d30 with metalness 0.3; engines 0x3a3a3c metalness 0.85 roughness 0.35.

Grid fins? Skip. Add a couple of small black rectangles as markings? Fine.

Also add "umbilical" arms from the tower to the rocket: two boxes at heights 30 and 50 connecting the tower to the rocket, but they'd break when the rocket launches — they can stay static on the tower (retract). Skip or make them part of the tower.

Tower: at x = +18, z = 0, height 85 m, footprint 10x10.
Build a lattice: 4 corner columns (boxes 0.5x0.5xH) at (±5, ±5). Cross braces every 10 m: diagonal boxes. Use a helper to make a box between two points:

```ts
function beam(a: THREE.Vector3, b: THREE.Vector3, thickness: number, mat: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.BoxGeometry(thickness, len, thickness);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  return mesh;
}
```
This creates many geometries; use a shared geometry per length? Simpler: create a unit box geometry (1,1,1) and scale it. Use `new THREE.BoxGeometry(1,1,1)` shared, and set mesh.scale = (thickness, len, thickness). Then the quaternion orients it. That's efficient.

Beams for the tower: 4 verticals, horizontal rings every 10 m (4 per level), diagonals. ~ 8 levels * 8 = 64 beams. Fine.

Also a hammerhead crane on top? Skip. Add an antenna.

Lightning masts: 3 masts at radius 110 m, angles 0, 120, 240 (avoiding the tower), height 120 m, lattice with 3 columns. And catenary wires: use a Line with points between mast tops (a sagging curve) and down to the ground. Add a `LineBasicMaterial({color:0x333333})`.

Flame trench & mount: 
- The rocket base at y=7. The launch mount: 4 support legs? Simplify: a steel platform at y=6..7 (a box 12x1x12) held by 4 columns, with a central hole... The plume must shoot down into the trench. The platform would block it. Use 2 support arms from the sides (the rocket is held by clamps at the base sides). Let's have 4 angled steel beams from the pad up to the base ring at y=7, positioned at the corners outside the rocket radius, plus a ring.

Simplify: a "launch mount" = a cylindrical steel ring at y=6.5, radius 4 m, thickness 1 m, with 4 legs down to the pad. The rocket sits inside, and the plume goes through the ring down into the trench. Good. The ring is a TorusGeometry(4, 0.4) rotated flat, plus 4 legs (boxes).

Trench: below the pad top (1.5) down to -5: a dark box interior. Build the pad as 2 slabs with a gap between x=-8 and 8, and the trench floor at y=-5, trench side walls are the slab faces. Then the exhaust exits at z=±60 to the sides. The trench is open at both z ends.

Also add a water deluge? The steam comes from the deluge; the particle system handles it.

Ground detail near the pad: 
- The terrain cap is at y = -sqrt(R²-r²)+R? At r=0, y=0. So the terrain surface at the pad is y=0. The concrete pad sits on it.
- Add a gravel area around the pad: a circle of a darker sand texture at y=0.05, radius 200 m.
- Roads: boxes 8 m wide, y=0.06, from the pad area to the south (+z) to buildings.
- Buildings: a few boxes at 300-900 m with light walls, dark roofs; a large hangar (60x30x25) with a curved roof? Keep boxes.

Vegetation: instanced bushes over an area of radius 2500 m, excluding the pad (r<180) and the ocean (x < coast). ~2000 instances of an icosahedron with a dark green material, scaled 1-4 m. Also add some taller palmetto clusters.

Perf: 2000 instances of a 20-triangle icosahedron = fine.

Now, particle systems.

Let's write a generic class:

```ts
interface Particle { x:number;y:number;z:number; vx:number;vy:number;vz:number; age:number; life:number; size:number; grow:number; drag:number; buoy:number; r:number;g:number;b:number; }
```

But with typed arrays, simpler to use an object pool array. For 4000 particles, object updates are fine.

```ts
class SmokeSystem {
  points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private col: Float32Array;
  private count = 0;
  private max: number;
  private particles: Particle[] = [];
```
Hmm, use a fixed-size arrays with a "free list" isn't needed; just keep an array of active particles and write to the buffer each frame, with drawRange = active count.

Attributes: position (3), aSize (1), aAlpha (1), aColor (3). Material: ShaderMaterial with uniforms { uTex } and blending.

Shader:
```glsl
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
varying float vAlpha; varying vec3 vColor;
void main(){
  vAlpha = aAlpha; vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (500.0 / max(-mv.z, 1.0));
  gl_PointSize = min(gl_PointSize, 900.0);
  gl_Position = projectionMatrix * mv;
}
```
Hmm, gl_PointSize in pixels: size_world * (screenHeight/2) / (tan(fov/2) * dist). Let's pass a uniform `uScale = renderer.getSize().y * 0.5 / Math.tan(fov/2)`... Actually the standard three formula: `scale = height / (2*tan(fov/2))`; pointSize = size * scale / -mv.z. Use uniform uPixelScale updated on resize. Note devicePixelRatio: the drawing buffer height. Use renderer.getDrawingBufferSize. I'll compute uPixelScale = drawingBufferHeight / (2*tan(fov/2)).

Also large point sizes are capped by GPU (usually 1024 or 2048). Big smoke puffs at close range could exceed; clamp to 1024.

Fragment:
```glsl
uniform sampler2D uTex;
varying float vAlpha; varying vec3 vColor;
void main(){
  vec4 t = texture2D(uTex, gl_PointCoord);
  float a = t.a * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * t.rgb, a);
}
```
The texture: radial soft gradient with some noise for billowiness. Use a canvas 128x128 radial gradient white center to transparent, then multiply by a fbm-ish noise for a cloudy look. Add slight alpha variation.

Blending: NormalBlending for smoke, Additive for fire.

Depth: depthWrite false, depthTest true, transparent true.

Sorting: not sorted per particle, but with soft smoke it's acceptable.

Counts: smoke 3500, fire 1200, contrail 2000.

Particle updates:
```ts
for each particle:
  age += dt;
  if (age > life) remove;
  else {
    vy += buoy*dt; (buoyancy)
    v *= (1 - drag*dt)  (or exp)
    pos += v*dt;
    if (pos.y < groundY + size*0.3) { pos.y = ...; vy = max(vy, 0) } // roll along ground
    size += grow*dt;
    alpha = fade in/out
  }
```
For the pad smoke: spawn at the trench ends with a sideways velocity, plus a rising component and ground interaction. The puffs should roll sideways along the ground then rise. Implement: if the particle's y is near the ground, damp the downward velocity and increase buoyancy over time.

Simple: buoy = 2..6 m/s², initial vy ~ 0..5, initial v sideways 20-40 m/s from the trench, drag 0.4.

Spawn rate: during t<25 s: 60/s at each trench end. Life 12-25 s. So ~ 1500-3000 particles. Fine.

Also emit steam around the rocket base (deluge) upward.

Fire particles: spawn at the nozzle while thrust > 0, with a downward velocity of ~150 m/s, short life 0.3-0.8 s, additive, bright yellow-white, size 3-10 m growing. Count ~ 800. They add to the plume look. But the plume mesh might be enough. Let's include both: a plume mesh (cone) + a light + some fire particles.

Actually for realism, the exhaust at liftoff should be a huge bright column hitting the trench and billowing out. The mesh cone plus additive sprites should read well.

Contrail: spawn at the rocket's altitude when alt > 1500 m, one puff every ~0.3 s of sim time, size 3 m growing to 25 m, life 400 s, drifting slowly with a light wind (vx small). Also persists in the sky. Count ~ 1500 max.

Since the trail array is per step, and the contrail spawn uses sim time, tie the spawn to the step function? Better: spawn in updateVisuals using the current altitude and dt. But when at 30x speed, the dt per frame is large and the rocket moves a lot; spawn multiple puffs per frame proportional to the distance moved (e.g., every 100 m). Let's use distance-based spawning: keep the last contrail spawn position; if the distance from the last spawn > 150 m, spawn.

OK.

Now the trail ribbon. Let me reconsider: The trail array gets a point per step() call. With the render loop at 60 fps and speed 10, points are ~ 1/30*10 = 0.33 s apart. The rocket moves maybe 100-500 m between points at high altitude. A line from these points would be a polyline with visible segments — fine.

Implement a ribbon:
- Keep a dynamic BufferGeometry with a maximum of 4000 points → 8000 vertices, 2 per point, and indices as a triangle strip (use an indexed geometry with 6 indices per segment).
- Each frame, take the last N points (from the trail array, or copy them on step? The trail is the public array). Rebuild the ribbon only when the trail changes (track length).
- For each point i: tangent = normalize(p[i+1] - p[i-1]); viewDir = normalize(camera.position - p[i]); side = normalize(cross(tangent, viewDir)) * width; vertices p ± side.
- Width could grow with age (older points wider), e.g., width = 1.5 + 0.02*(age). Or simply 3 m.
- Material: MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.55, depthWrite:false, side:DoubleSide}).
- Also fade with distance? Fine.

Hmm, with many points (3000) and rebuilding each frame it's fine.

Actually, the contrail is white smoke; a ribbon works.

Maybe simpler and better: skip the ribbon and use dense contrail particles (which look like a real contrail). But the requirement explicitly says "a visible white contrail behind the rocket, drawn from the trail points". So implement the ribbon from trail points. Do both.

OK, let's write the ribbon with a fixed capacity; update on each frame using the current trail.

Since the trail is reset on reset(), the ribbon rebuild handles it.

Ribbon code:

```ts
const TRAIL_MAX = 3000;
const ribbonGeo = new THREE.BufferGeometry();
const ribbonPos = new Float32Array(TRAIL_MAX*2*3);
ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPos, 3).setUsage(THREE.DynamicDrawUsage));
const idx: number[] = [];
for (let i=0;i<TRAIL_MAX-1;i++){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
ribbonGeo.setIndex(idx);
ribbonGeo.setDrawRange(0, 0);
```
Index array of 3000*6 = 18000 — fine.

Each frame:
```ts
const pts = rocket.trail;
const n = Math.min(pts.length, TRAIL_MAX);
const start = pts.length - n;
if (n >= 2) { ...fill... }
ribbonGeo.setDrawRange(0, (n-1)*6);
```
Careful: the ribbon mesh must be added to the scene, and updating the position attribute needs `needsUpdate = true`. Also `computeBoundingSphere` issues → set `frustumCulled = false`.

The trail points: do they include the current position each step? Yes, push after each step. But the rocket's visual position is updated from state each frame, so the last trail point may lag slightly behind the current position. Fine; could add the current position at the end.

Hmm, one subtlety: the trail array must only be appended once per step() call (spec). The test might check trail.length === number of step calls. So don't push in the render loop. Good. But the ribbon can append the current position virtually (not in the array) — I'll just use the array.

Now, the camera and view of the coast: the rocket flies toward -x, over the ocean. The chase camera at the rocket + (60, 18, 70) looking at the rocket. Since the rocket is at (x, y, 0) with x negative, the camera at x+60 is behind (toward land) and z+70 to the side. Looking toward -x, we see the ocean and the coast behind. 

Let's double check the pad camera: position (95, 3, 110), looking at (0, 45, 0). Direction (-95, 42, -110) normalized. The ocean at x < -1250 is directly ahead beyond the pad → visible on the horizon behind the pad. 

Chase camera offset should be chosen so the rocket appears in the frame nicely: offset (60, 22, 75) from the rocket base, looking at the rocket center (base + 35 up). Distance = sqrt(3600+484+5625)=98.5. Slight downward view? The camera at y = base+22, target at base+35 → looking slightly up. As the rocket pitches toward -x, the rocket's top tilts toward -x. The camera behind at +x sees the rocket from the rear-side. Good, the plume goes down and away, visible.

Let's refine: while ascending, the camera should also show the ground/ocean below. With the target at the rocket and a 55° FOV, the ground appears in the lower part. Good.

Smooth: the camera position = target + offset, where offset could rotate slowly as altitude increases (e.g., the camera drifts to a side view). Let's compute an offset that slowly rotates around the rocket:

```ts
const ang = 0.0 + alt*0.00001; // slow rotation
const off = new THREE.Vector3(Math.cos(ang)*60, 22, Math.sin? ...)
```
Keep it simple: constant offset but with a slow yaw:
```ts
const yaw = 0.35 + Math.min(alt*0.000004, 1.2); // rad
const dist = 85;
const off = new THREE.Vector3(Math.cos(yaw)*dist, 25, Math.sin(yaw)*dist);
```
With yaw from 0.35 to 1.5 rad: the camera starts behind-right and moves to the side. Hmm, at yaw=1.5, the camera is at (6, 25, 84) — directly beside the rocket (+z), looking at it with the rocket crossing the frame laterally. The rocket moves toward -x with high velocity, so a side view shows the rocket and the plume with the ocean below → nice. But the motion relative to the camera... fine.

Let's use yaw = 0.4 + clamp(alt/200000,0,1)*0.9 → up to 1.3 rad.

Also the camera distance could grow with the plume length? Keep ~90-110.

I'll compute:
```ts
const chaseDist = 95;
const yaw = 0.45 + Math.min(alt / 150000, 1) * 0.8;
const desired = new THREE.Vector3(
  rocketPos.x + Math.cos(yaw) * chaseDist,
  rocketPos.y + 24,
  rocketPos.z + Math.sin(yaw) * chaseDist
);
```
With yaw=0.45: offset (85.6, 24, 41.3). Hmm, that's mostly behind in +x. Good. At yaw=1.25: (30, 24, 90). Fine.

Look target: rocket mid: rocketPos + rotated(0,32,0) by pitch about z:
```ts
const mid = new THREE.Vector3(rocketPos.x - Math.sin(pitch)*32, rocketPos.y + Math.cos(pitch)*32, 0);
```
(Since pitch tilts toward -x.)

Hmm wait: the rocket rotation is rotation.z = +pitch (tilting toward -x)? Rotating about z by +θ maps (0,1,0) → (-sinθ, cosθ, 0). Yes, so rotation.z = pitch and the axis points toward -x for positive pitch. Good.

Blend the camera: `b = smoothstep(120, 400, alt)` — the rocket clears the 85 m tower at 120 m. Let's start the blend at alt 100 and finish at 350.

The pad camera should keep looking at the rocket as it rises until the blend. So the pad camera is static at (95,3,110) and its look target = rocket mid. Then as b→1 we transition to the chase position.

Implementation:
```ts
const padPos = new THREE.Vector3(95, 3.0, 110);
const b = THREE.MathUtils.smoothstep(alt, 90, 320);
const desiredPos = padPos.clone().lerp(chasePos, b);
```
But careful: the camera position lerp between two positions while the rocket moves fast may cause the camera to lag; the lerp of positions is fine.

Then smooth:
```ts
camPosCurrent.lerp(desiredPos, 1 - Math.exp(-8*dt));
```
Hmm, with a fast-moving rocket, the smoothing causes the camera to trail behind, which is actually nice (a slight lag). But at 30x speed the lag becomes huge (since the desired position moves 1000 m per frame). Use a high damping factor of 20 and clamp dt. Or set the camera position directly for the chase part and only smooth the blend. Let's use `1 - Math.exp(-6*dt)` with dt clamped to 1/30 → 0.18 per frame; at high speed, the camera lags ~ 5 frames → 5000 m behind. Bad. Use a stronger damping: 1 - exp(-15*dt) = 0.39. Still a lag of ~2.5 frames → 2500 m at 30x.

Better: compute the camera position analytically (no damping) from the smoothed rocket position. The rocket position itself jumps at high time scale, but that's inherent. Any smoothing would create lag. Solution: for the chase phase, set the camera exactly. For the ground phase, it's static. For the blend, use the analytic blend (smoothstep on altitude, which is smooth in world terms). Then the camera motion is smooth relative to the rocket.

So: camera.position.copy(desiredPos) directly, and camera.lookAt(target) where target is smoothed slightly... lookAt with a target that jumps is fine since the camera jumps too.

Let's just set directly. But at liftoff, the pad camera is fixed and the target moves up smoothly. Good.

Hmm, one problem: when the blend b is between 0 and 1, the padPos → chasePos lerp while the rocket accelerates upward — the resulting camera motion may be odd but okay.

Actually there's a subtlety: when b = 0, desiredPos = padPos (static). As alt grows, the chase position is ~100 m from the rocket. The lerp between them travels. Fine.

Let's also add a slight camera shake / rumble at liftoff? Skip.

Now the UI overlay:
```html
<div id="hud">...</div>
<div id="btns"><button>1×</button>...</div>
```
Created via document.createElement and appended to body with absolute positioning.

Text: "T+ 00:12", "ALT 1.2 km", "VEL 320 m/s", "SPEED ×10", "PITCH 12°".

Update each frame with the state.

Buttons: x1, x10, x30 → set viewerSpeed. Also a pause button? Not required but handy. Skip (or add). The spec mentions keys 1,2,3 and three buttons. Add a pause toggle with the space bar? Not required, but `paused` exists. I'll add a pause button and key P — extra but harmless. Hmm, "three buttons" only; adding a fourth could be fine. I'll add a pause button too? Let's keep exactly three speed buttons plus maybe a pause. I'll add pause via the Space key only, no button, to avoid clutter. Actually let's include a small "PAUSE" button too — harmless.

Careful: keydown handler must ignore if the event target is an input. Not relevant.

Also need to prevent the buttons from keeping focus (space triggering them) — call blur() after click.

Now, the reset button? Not required. Add one? "reset() clears the viewer's choice" — the API only. Add a reset button too? Not required; but nice. I'll add one small button "RESET" — hmm, "three buttons" for speed. Extra buttons are fine but let's keep it clean: 3 speed buttons + pause + reset. It's fine.

Now, the flame light: a PointLight at the nozzle, color 0xffcc77, intensity flickering, distance 400, decay 2. In three r155+, lights use physically correct units by default; intensity for a PointLight in candela. With decay 2 and distance 400, an intensity of e.g. 3e6 would be needed to light nearby objects. Hmm. Three r155 removed `useLegacyLights`. PointLight intensity in candela; illuminance at distance d = I/d². To light the pad at 30 m with ~1 (relative), need I ~ 900. For a bright flame, use intensity ~ 2e5 at 30 m → 222. Too bright. Let's use ~ 5000 with decay 2 → at 20 m: 12.5. Hmm, that's very bright given the directional sun is ~3. Let's target the flame light at ~5x the sun's illuminance near the pad: at 25 m, 5*3 = 15 → I = 15*625 = 9375. So I ~ 10000 at liftoff, decreasing with altitude (the flame gets farther from anything). Actually as the rocket rises, the flame lights nothing; keep it for the first 200 m only.

Also add a second light for the plume glow below the rocket (a PointLight attached to the plume at y=-15).

Set castShadow false for performance.

Now the sun: DirectionalLight(0xfff3e0, 3.2) with position (400, 700, 300) normalized relative to the target. Shadow camera: ortho -180..180, near 1, far 2000; light position at pad + dir*600. Shadow map 2048. Bias -0.0005.

Ambient: HemisphereLight(0x9ec8ff, 0x3a3524, 0.6)? With ACES and a sun of 3.2, ambient 0.6 might be okay. Actually with physically based rendering and three's default, HemisphereLight intensity ~0.5 works.

Hmm, three r155+ "WebGLRenderer.useLegacyLights" default false → lights are physical, and intensities need to be higher (directional light intensity ~ 3 is like the sun in "physical" units? DirectionalLight intensity is in lux-ish arbitrary). In r155+, directional light intensity 3 is roughly like the sun. Common examples use 3. Let's use directional 3.0, hemi 0.8, and exposure 1.0.

Now the ocean/terrain shading ambient: uAmbient ~ vec3(0.35,0.45,0.6)*0.4.

Let me now write the actual code. I'll be systematic.

```ts
// ===== Physics =====
const G0 = 9.81, R_EARTH = 6371000, M0 = 550000, M_DRY = 220000, BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;

interface FlightState { t: number; alt: number; vel: number; acc: number; pitch: number; hv: number; x: number; }

const flight: FlightState = { t:0, alt:0, vel:0, acc:0, pitch:0, hv:0, x:0 };
const trail: Array<{x:number;y:number;z:number}> = [];
let paused = false;
let viewerSpeed: number | null = null;

function pitchAt(t: number): number {
  if (t <= 10) return 0;
  if (t <= 150) return 0.5 * Math.pow((t - 10) / 140, 1.7);
  return 0.5 + 0.35 * (1 - Math.exp(-(t - 150) / 120));
}
function massAt(t: number): number {
  const f = Math.min(Math.max(t, 0), BURN_TIME) / BURN_TIME;
  return M0 - (M0 - M_DRY) * f;
}
function thrustAt(t: number, m: number): number {
  if (t >= BURN_TIME) return 0;
  return Math.min(LIFTOFF_THRUST, 3 * m * G0);
}
```

Integrate step by step. The substep loop should use the state.t at the start of each substep.

```ts
function substep(dt: number) {
  const t = flight.t;
  const m = massAt(t);
  const T = thrustAt(t, m);
  const p = pitchAt(t);
  const g = G0 * Math.pow(R_EARTH / (R_EARTH + Math.max(flight.alt, 0)), 2);
  const aThrust = T / m;
  const ay = aThrust * Math.cos(p) - g;
  const ax = -aThrust * Math.sin(p);
  flight.vel += ay * dt;
  flight.hv += ax * dt;
  flight.alt += flight.vel * dt;
  flight.x += flight.hv * dt;
  if (flight.alt < 0) { flight.alt = 0; if (flight.vel < 0) flight.vel = 0; flight.hv = 0; }
  flight.acc = ay;
  flight.pitch = p;
  flight.t = t + dt;
}
```
Wait: pitch should be computed at t and then the state.pitch updated. And "acc (net vertical acceleration)" - yes ay.

Hmm, the rocket "cannot go below the pad": if alt is 0 and vel is 0, it stays.

One issue: with massAt(t) at t=0, m=550000, T=1.3*m0*g0 = 7.014e6, a = 12.75, ay = 12.75-9.81 = 2.94 m/s². Good.

Now for the "step" function:

```ts
function stepSim(dt: number): void {
  if (!isFinite(dt) || dt <= 0) { trail.push(trailPoint()); return; }  // hmm, should we push?
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(0.02, remaining);
    substep(h);
    remaining -= h;
  }
  trail.push(trailPoint());
  if (trail.length > 4000) trail.splice(0, trail.length - 4000);
}
```
Careful: `splice` mutates the same array object — fine (keeps the same object identity). But then the ribbon uses the tail. Good.

If dt is 0, spec says one point per call; but step(0) probably shouldn't push. Let's handle: if dt <= 0 return without pushing (but that violates "one per step call"...). Edge case; I'll push even for dt=0? A duplicate point is harmless. Let's do: if dt <= 0 { push } else { integrate, push }.

Hmm, a test might call step(0.016) many times and check trail.length. Fine.

trailPoint: the world position of the rocket's nozzle, i.e., {x: flight.x, y: PAD_TOP + flight.alt, z: 0}.

Now the API:

```ts
const rocketApi = {
  trail,
  paused: false,
  reset() { ... },
  step(dt: number) { stepSim(dt); },
  state() { return { t: flight.t, alt: flight.alt, vel: flight.vel, acc: flight.acc, pitch: flight.pitch, speed: currentSpeed() }; },
};
```
But `paused` is used by the render loop: read `rocketApi.paused`. And `reset()` must set paused? Not specified; leave paused unchanged.

`state().speed`: returns the current time scale. Implement:

```ts
function currentSpeed(): number {
  if (viewerSpeed !== null) return viewerSpeed;
  return flight.t < 10 ? 1 : 10;
}
```
Note flight.t is the sim time; after reset it's 0 → speed 1.

Assign `(window as any).__rocket = rocketApi;`.

Also `reset()`: flight fields to 0; trail.length = 0; viewerSpeed = null; paused stays? I'd reset paused to false too. Hmm, "reset(): time 0, the rocket on the pad, trail emptied (keep the same array object)". Not mentioning paused. I'll leave paused as is... but if paused is true and you reset, nothing moves. Tests probably set paused=false. I'll not touch paused.

Now, rendering setup and scene building. Let's write it.

```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.5, 2.0e7);
```
Hmm, `innerWidth` global usage in strict TS: `window.innerWidth`. Use window inner.

Sun direction: normalize(0.55, 0.62, 0.35)? Let's pick a morning sun in the east over the ocean (-x) but a bit south: sunDir = normalize(-0.45, 0.72, 0.53). Hmm, then the sun is behind the rocket from the pad camera (which looks toward -x) → the rocket would be backlit/silhouetted. Backlighting a white rocket with a bright sky can look great, but you'd lose the markings. Let's put the sun to the side: normalize(0.6, 0.7, 0.35) → from +x, front-right of the pad camera; the rocket is front-lit from the right. The ocean at -x is lit from behind the camera → bright ocean. Good.

Sky shader sun position should match.

Fog: FogExp2(0xc3d7e8, 3.2e-5). But wait, the ground cap has manual haze and scene fog will also apply to standard materials. The vegetation at 2 km should fade. Fine.

Update the fog density each frame: `(scene.fog as THREE.FogExp2).density = 3.2e-5 * Math.exp(-alt/7000) + 1e-7;`

Hmm, but at high altitude, the ground shader's uHazeDensity should be small. Use a similar function. Let's set uHazeDensity = 2.2e-5 * exp(-alt/8000) + 1.5e-7.

Now let's think about how the scene looks from 100 km: the Earth cap 2000 km radius, with the ocean at x<-1250 and land elsewhere. From 100 km altitude above the origin, the horizon is at ~1130 km. The cap extends to 2000 km, so it covers the visible area. The sky beyond the limb: with depthTest false, the sky only shows where nothing was drawn — beyond the cap edge, which is beyond the horizon (the cap curves down). Actually, is the cap edge at 2000 km below the horizon line? The horizon from 100 km is at 1130 km ground distance; the cap edge at 2000 km is way below the horizon (hidden by the cap itself? no—the cap is a sphere surface; points beyond 1130 km are "over the horizon" and not visible; the cap surface itself occludes them). Yes, because the sphere is convex, the near part of the cap occludes the far part. So the visible cap extends to the horizon, and beyond that we see the sky. 

But wait: does the cap occlude the sky below the horizon? The camera at 100 km: the line of sight to the horizon is tangent; below that, the cap. Yes. So the cap fills the lower part of the view up to the horizon, and the sky above. The limb should show the atmosphere: the ground shader's haze handles coloring near the horizon.

But there's an issue: the cap's far surface is drawn with the haze color at high distance. With uHazeDensity small at altitude, the ground far away will be clearly colored (not hazy). Realistically from 100 km, the ground is clear-ish with a thin blue haze near the limb. Good enough.

Also, stars: the sky sphere with depthTest false is drawn first and fills the screen; the ground covers the lower part. Fine.

But wait: the sky sphere is centered on the camera and has radius 1e6, drawn with depthTest=false so everything else covers it. But the Earth cap at 2000 km is beyond the sky sphere radius 1e6? The cap's far edge is 2000 km away, beyond the sky sphere. Since the sky is depthTest false and drawn first with depthWrite false, and the cap is drawn later with normal depth testing against a cleared depth buffer → the cap draws over the sky regardless of distance. 

But there is a risk: the camera far plane is 2e7, and the cap max distance ~2100 km < far. Fine.

Now, the terrain cap with 2000 km radius and only 160 rings — near the origin the ring spacing: r_i = 2000km * (i/160)^2.5. At i=1: 2000e3 * (0.00625)^2.5 = 2000e3 * 3.05e-6 = 6.1 m. i=2: 2000e3*(0.0125)^2.5 = 17.3 m. i=3: 32 m. Good, dense near the origin. i=160 → 2000 km. Spacing grows; at i=100: 2000e3*(0.625)^2.5=2000e3*0.309=618 km; i=99: 601 km. So between 600 and 2000 km there are 60 rings — fine.

But the pad area within 200 m: rings at 6, 17, 32, 52, 78, 110, 148, 190, 238... So the terrain near the pad has vertices every ~30 m → the terrain is essentially flat there; the pad meshes cover it. Good. With 256 angular segments, at r=6 m the segments are 0.15 m apart — overkill but fine.

Total triangles: 160*256*2 = 82k. Fine.

Now, the ocean: since the terrain is one mesh with ocean color, the ocean at the pad's east... The coastline at x=-1250. The pad at the origin. The distance to the coast is 1.25 km. From the pad camera at 3 m height, the horizon is at ~6 km; the ocean starts at 1.25 km → visible. 

But wait: the terrain at 6 m from the origin has rings; the color function uses world x,z → the coastline will be rendered with the mesh's resolution: at 1250 m, the ring spacing is ~ (i where r=1250): f=(1250/2000e3)^0.4 = (0.000625)^0.4 = e^{0.4*ln(0.000625)} = e^{0.4*(-7.38)} = e^{-2.95} = 0.052 → i=8.4; rings at i=8: r=2000e3*(0.05)^2.5=2000e3*0.000559=1118 m; i=9: 2000e3*(0.05625)^2.5=1489 m. So the coastline at 1250 m falls between rings at 1118 and 1489 → the shoreline will be a jagged line following the mesh rings (angular resolution 256 → segment length 2π*1250/256 = 30 m). Acceptable; a wavy coastline in the shader will look pixelated at 30 m resolution. Let's make the coastline at about 1500 m and increase the rings to 220 with a power of 2.0 for better mid-range resolution. With power 2.0: ring i → 2000e3*(i/220)^2. i where r=1500: i/220 = sqrt(0.00075)=0.0274 → i=6. Rings near 1500: i=6 → 1488, i=7 → 2025. Hmm still coarse.

Increase segments to 512 and rings to 300, power 2? Triangles = 300*512*2 = 307k. That's heavy but okay on modern GPUs? Maybe. Let's use 256 rings and 512 segments = 262k triangles. Hmm.

Alternative: use a separate detailed ground plane for the near field (radius 4 km) and the big cap for the distant Earth? Then the seam. With the cap at radius 4 km, the sphere sags by 1.25 m at 4 km (r²/2R = 1.25 m). Place the flat local plane at y=0 and the cap's near part at y≈0 (it's the same sphere) — the local plane would be above the cap by up to 1.25 m at 4 km. A 1.25 m step at 4 km distance is invisible (0.0003 rad). 

So: local detail plane: a CircleGeometry radius 4000 m, 128 segments, with a nice shader/canvas texture for land and ocean, at y=0.2. And the cap underneath for everything beyond. The coastline must be within 4 km? The coastline at 1250 m is inside. Then the ocean is drawn on the local plane from 1250 to 4000 m, and beyond 4000 m the cap shows ocean up to the horizon. The transition at 4 km: the local plane's ocean color vs the cap's ocean color must match closely. Both use a similar shader → make them share the same shading code and just have the local plane's ocean color match.

Hmm, this doubles the work. Alternatively, make the cap resolution better with a non-uniform ring distribution that's dense up to 10 km: use r_i = 2000e3 * (i/N)^3? At i=1: 2000e3*(1/200)^3 = 0.25 m. i=10: 250 m. i=20: 2000e3*0.001=2000 m. i=40: 2000e3*0.008=16 km. i=60: 54 km. i=100: 250 km. i=200: 2000 km. Hmm, at 1500 m the ring spacing: between i=19 (2000e3*(0.095)^3=1715) and i=18 (1460) — 255 m spacing. At 4 km: i=25 → 2000e3*(0.125)^3=3906; i=26 → 4397. So 500 m spacing. Still coarse but the coastline is the only high-frequency feature; a 250 m vertex spacing on a shoreline seen from 1 km away is noticeable but not terrible with a smooth gradient.

Better idea: draw the ocean/land boundary using a texture instead of geometry! Use a procedural canvas or shader texture sampled in the fragment shader → resolution independent of geometry. The cap geometry only needs to be reasonably dense for the shading variation (which is mostly low-frequency). The coastline color transition would be sharp regardless of geometry if computed per-fragment from the world position. But the geometry silhouette (the horizon) is coarse near the origin... no, the geometry is a smooth sphere; the horizon is fine.

So: compute the coastline per-fragment in the shader, using the world x,z (which is interpolated across triangles). Within a triangle spanning 250 m, the interpolation is linear — the coastline computed per-fragment from interpolated world x,z is still accurate (world position interpolation over a planar triangle is exact since the triangle is planar in world space and the position is linear in the screen space? Perspective-correct interpolation is exact for planar attributes). So the coastline will be crisp! Only the underlying noise pattern would be smooth (interpolated normals are exact-ish).

So the cap geometry can be coarse; the shader does the detail. 

So use rings=160, segments=256, with a power of 2 distribution from 0 to 2500 km. Then near the origin, the rings are at (i/160)^2 * 2500 km: i=1 → 97 m, i=2 → 390 m, i=3 → 878 m, i=5 → 2.4 km. Fine. The pad area is covered by separate meshes anyway. The vertex spacing near the pad is ~100 m — the terrain is flat, so no visible faceting.

But wait: normals. We compute normals from the sphere geometry, which is smooth. Per-fragment normals are interpolated → good.

Alright, use the cap with 200 rings and 256 segments = 102k triangles, radius 2500 km.

Now, the terrain shader's noise scale: use world coordinates in meters, with the fbm at scales of 0.002 (500 m wavelength) etc.

Land: Florida scrub near the cape: mottled green/brown, with patches of sand and marsh.

Let's write the fragment shader for the terrain:

```glsl
uniform vec3 uSunDir, uSunColor, uAmbient, uHaze, uCamPos;
uniform float uHazeDensity, uTime;
varying vec3 vWorld;

float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s += a*vnoise(p); p*=2.03; a*=0.5; } return s; }
```

Main:
```glsl
void main(){
  vec3 sp = vWorld - vec3(0.0, -6371000.0, 0.0);
  vec3 n = normalize(sp);
  vec2 p = vWorld.xz;
  float coast = -1500.0 + 260.0*sin(p.y*0.00042) + 120.0*sin(p.y*0.0016 + 2.1) + 60.0*sin(p.y*0.0043+0.7);
  float d = p.x - coast; // >0 land
  float ocean = 1.0 - smoothstep(-25.0, 25.0, d);
  float beach = exp(-d*d/ (2.0*90.0*90.0)) * (1.0 - ocean*0.5);
  // land albedo
  float n1 = fbm(p*0.0012);
  float n2 = vnoise(p*0.011);
  float n3 = fbm(p*0.00018);
  vec3 landCol = mix(vec3(0.055,0.115,0.045), vec3(0.16,0.22,0.08), n1);
  landCol = mix(landCol, vec3(0.26,0.24,0.14), smoothstep(0.55,0.85,n3)*0.6);
  landCol = mix(landCol, vec3(0.20,0.24,0.10), n2*0.3);
  // marsh/water inland? skip
  vec3 seaCol = mix(vec3(0.012,0.055,0.10), vec3(0.03,0.13,0.20), fbm(p*0.0007));
  vec3 albedo = mix(landCol, seaCol, ocean);
  albedo = mix(albedo, vec3(0.62,0.56,0.42), beach*0.85);
  // normal perturb for waves
  vec2 w = vec2(sin(p.x*0.02 + uTime*0.9) + sin(p.y*0.031 - uTime*0.7), cos(p.y*0.024 + uTime*0.8));
  n = normalize(n + vec3(w.x, 0.0, w.y) * 0.012 * ocean);
  // lighting
  vec3 L = normalize(uSunDir);
  float ndl = max(dot(n, L), 0.0);
  vec3 col = albedo * (uSunColor * ndl + uAmbient);
  vec3 V = normalize(uCamPos - vWorld);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(n, H), 0.0), 350.0);
  col += uSunColor * spec * (0.6 + 1.6*ocean) * ocean;  // hmm
  // aerial perspective
  float dist = length(uCamPos - vWorld);
  float f = 1.0 - exp(-dist * uHazeDensity);
  f = clamp(f, 0.0, 0.96);
  col = mix(col, uHaze, f);
  gl_FragColor = vec4(col, 1.0);
}
```
Hmm, `ocean` specular: for ocean only, plus a bit for land (no).

Careful with the terrain color output being in linear space (since we're using ACES tone mapping, which expects linear). The albedo values above are roughly linear-ish (0.05-0.3). Good; they'll appear brighter after tone mapping but fine. Actually the ground appears fairly bright; sRGB 0.2 green ≈ linear 0.033. So use linear values ~0.02-0.1 for green. My landCol values (0.055-0.22) are moderately dark. Fine.

The ocean: linear 0.012-0.03 blue → dark. With the sun's specular, it'll look nice.

Haze color: pale blue (0.55, 0.68, 0.82)? Since we mix the terrain toward the haze with the sun's brightness... The sky's horizon color is (0.72,0.80,0.88) in the sky shader — these are linear values; that's quite bright (after ACES it'll be near-white). The real horizon haze is bright. Good.

Let's set uHaze = vec3(0.52, 0.65, 0.80).

Now the local ground detail around the pad (grass/scrub near the pad, roads, buildings). The terrain shader gives green scrub. The pad concrete sits at y=0..1.5. Around the pad, add:

- A gravel/sand apron: a ring/plane 260 m radius at y=0.03 with a sandy texture.
Actually the terrain starts at y=0; overlaying a plane at y=0.03 with a soft alpha texture would look nice. But z-fighting risk at distances? 0.03 m separation at 260 m distance: with near=0.5, far=2e7, precision at 260 m ≈ 260²/0.5/1.67e7 = 0.008 m. So 0.03 m is fine. At 2 km: 0.48 m precision; if we have an overlay at 1 km with 0.03 m offset → z-fighting. Keep overlays within 500 m.

Let's keep it simple:
- Pad slabs (concrete) at y 0..1.5.
- A dirt/gravel area around the pad: a circle radius 180 m at y=0.02 with a canvas texture (sandy gray). Its outer edge would show a hard circle; use a radial alpha fade. Use a CanvasTexture with alpha, transparent material.
- Roads: long boxes at y=0.05, 10 m wide.
- Buildings.
- Vegetation.

Actually, since the terrain shader colors near the pad are green scrub, we need the pad's immediate surroundings to look like the Cape: sandy/gravel with scrub. The shader can vary near the origin: add a sandy patch around the pad:
In the shader, `float nearPad = exp(-dot(p,p)/(2.0*400.0*400.0));` then mix the land toward sand near the pad. That's easy and avoids the overlay plane. But then the roads and vegetation sit on sand. Good.

Hmm, but the terrain near the pad within 100 m also needs to be flat for the pad structures. The sphere at 100 m sags 0.0008 m. Fine.

Let's add to the shader: a sandy/gravel area within ~600 m of the origin, plus a mottled grass.

OK, and the vegetation: instanced bushes placed at random positions within radius 3000 m, excluding the pad area (<150 m) and the ocean (x < coast). But the coastline function is in GLSL... Reimplement a simple version in TS:
```ts
function coastX(z: number): number { return -1500 + 260*Math.sin(z*0.00042) + 120*Math.sin(z*0.0016+2.1) + 60*Math.sin(z*0.0043+0.7); }
```
Place bushes only where x > coastX(z) + 100 (land). Also avoid the roads.

Bushes: InstancedMesh with an IcosahedronGeometry(1, 1) scaled non-uniformly, colored via instanceColor (dark greens/browns). ~2500 instances within 3 km. Each is a low-poly blob. Additionally, scatter some taller "palms": use cones/cylinders. Let's keep bushes + a few trees (a trunk + a canopy sphere).

Given the camera at ~100 m looking at the rocket, the vegetation at 200+ m appears small; the distant terrain shader does most of the work. So keep the vegetation count modest (~2000) within 1500 m.

Now the buildings: place a few hangars at z ~ 600-1200, x ~ -200..400 (land side). And the road from the pad to the south (+z).

Let's also add a couple of distant towers? Skip.

Now, particle textures:

```ts
function makeSoftCircleTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
  // add cloudiness
  const img = ctx.getImageData(0,0,size,size);
  for (let i=0;i<img.data.length;i+=4){
    const x = (i/4)%size, y = Math.floor((i/4)/size);
    const nx = x/size, ny = y/size;
    const nn = 0.75 + 0.25*Math.sin(nx*13.1)*Math.sin(ny*17.7) + 0.15*Math.sin((nx+ny)*31.0);
    img.data[i+3] = Math.min(255, img.data[i+3]*nn);
  }
  ctx.putImageData(img,0,0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;  // alpha texture; fine
  return tex;
}
```
Hmm, but `ctx.getImageData` on a canvas with a radial gradient: fine.

Smoke particles will sample this soft texture; with the noise modulation, they look billowy.

Particle system implementation:

```ts
interface P { x:number;y:number;z:number; vx:number;vy:number;vz:number; age:number; life:number; size:number; grow:number; drag:number; buoy:number; r:number;g:number;b:number; a0:number; }

class ParticleSystem {
  points: THREE.Points;
  private pos: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private colors: Float32Array;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  parts: P[] = [];
  max: number;
  constructor(max: number, tex: THREE.Texture, blending: THREE.Blending) {...}
  spawn(p: P): void {...}
  update(dt: number, groundLevel: (x:number,z:number)=>number): void {...}
  ...
}
```
For the ground collision, most of our particles start on the pad (y ~ 4). The ground is y=0. Use groundY = 0 for the smoke rolling.

Update loop: iterate and compact.

```ts
update(dt: number) {
  if (dt > 0.2) dt = 0.2;  // hmm, at high speed the smoke ages fast; we want real-time smoke, not sim-time
```
Wait: should the smoke animate in simulated time or real time? At 10x speed, the rocket ascends quickly; the liftoff smoke should billow at normal speed for it to look good, but then it lags behind the sim. Practically, particle systems should use the real dt (clamped) so they animate at a watchable rate. But the spawn should be tied to the flight time so smoke only appears at liftoff.

Use the real frame dt (clamped to 1/30) for particle updates. Then at 10x, the rocket leaves quickly but the smoke billows in real time. That's fine visually.

Hmm, but when the rocket is at 100 km and the camera is chasing, the pad smoke is 100 km away — negligible.

Emission while thrust > 0 && t < 25 (sim time): but at 10x, 25 s of sim = 2.5 s real. Emit based on sim time but spawn many particles in one frame (count proportional to the sim time advanced). Let's compute in the render loop: `const simDt = ...`; emit `n = simDt * rate` particles. With rate 80/s and simDt 0.33, that's 26 per frame. Over 25 s sim, 2000 particles. Good.

So the particle system's spawn is driven by sim time, the update by real dt. Careful: if paused, no spawn.

Let me now decide the overall update order in the loop:

```ts
const rawDt = clock.getDelta();
const dt = Math.min(rawDt, 1/30);
if (!api.paused) {
  const sp = currentSpeed();
  api.step(dt * sp);
}
updateScene(dt);   // visual updates in real time
composer.render();
```

`updateScene(dt)`:
- rocketGroup position/rotation from flight.
- sky uniforms (alt = flight.alt, time += dt).
- camera.
- particles update.
- spawn particles using flight.t.
- plume scale.
- ribbon update.
- hud update.
- fog density.

For spawning, we need the sim time delta to know how many to spawn. Track `lastSimT`. In updateScene: `const simDt = flight.t - lastSimT; lastSimT = flight.t;`. After reset, flight.t = 0 → simDt negative; handle by resetting lastSimT.

Now the plume:
```ts
const plumeGroup = new THREE.Group(); // attached to rocketGroup at y=0
```
Actually attach the plume meshes to rocketGroup so they rotate with the rocket. The plume points down along the rocket's -y. As the rocket pitches, the plume follows.

Plume mesh: a cone with the apex at the top (nozzle) opening downward. Use CylinderGeometry(topRadius=1.6, bottomRadius=3.0, height=1, openEnded=true) with a texture that's bright at the top and fades. Scale y to the plume length.

Let's construct the plume with a custom shader for a nice gradient + noise + flicker:

```glsl
uniform float uTime; uniform float uAlt; uniform float uLen;
varying vec2 vUv; varying float vY;
void main(){
  vec3 c;
  float t = vUv.y; // 0 at nozzle, 1 at tail
  ...
}
```
Simpler: a MeshBasicMaterial with a canvas gradient texture (white → yellow → orange → transparent), additive blending, depthWrite false. Scale: length = 18 + min(alt,100000)*0.0018 (at 100 km → 198 m), radius scale = 1 + alt/60000 (at 100 km → 2.7).

Mach diamonds: small bright quads along the axis near the nozzle, only visible at low altitude: a few additive spheres/cones with a bright white color, fading when alt > 2000 m.

Let's do: plume core cylinder + an outer cone (softer orange) + Mach diamond discs.

Given time, keep the plume as: 
- inner bright cylinder (white-yellow) scaling,
- outer cone (orange, additive, alpha 0.35),
- a PointLight.

The gradient texture: 64x256 canvas, vertical gradient.

```ts
function makePlumeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.15, 'rgba(255,240,190,0.95)');
  g.addColorStop(0.4, 'rgba(255,190,90,0.75)');
  g.addColorStop(0.75, 'rgba(255,110,30,0.35)');
  g.addColorStop(1, 'rgba(255,60,10,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,64,256);
  // horizontal falloff: black at the edges? Need alpha from the texture's alpha channel.
  ...
}
```
For a cylinder, the UV v runs along the height. Use the alpha channel from the vertical gradient and add a horizontal fade: multiply alpha by a horizontal cosine → but the cylinder is viewed from the side, so a horizontal fade inside the texture would make vertical stripes. Not good. Just use a uniform color with vertical alpha. The cylinder's silhouette gives the shape. With additive blending, the edges won't be soft, but the bloom will help. Alternatively use a cone and rely on the vertical fade.

Fine.

Now the rocket's "engine glow": a small emissive disc at the nozzle.

Also add a light flash at ignition: the PointLight intensity peaks at liftoff.

Let's write the plume update:
```ts
const thrusting = flight.t < BURN_TIME;
plume.visible = thrusting && flight.alt < 250000;
const alt = flight.alt;
const len = 20 + alt * 0.0016;
const wid = 1 + alt * 0.000012;
plume1.scale.set(wid, len/20, wid);
```
The base geometry: a cylinder of height 20, top radius 1.9, bottom radius 1.2? For a rocket plume, it's widest near the nozzle and narrows then expands. Let's make: CylinderGeometry(2.2, 1.2, 20, 16, 1, true) positioned so the top is at y=0 (the nozzle) → position.y = -10. Then scale.y = len/20 scales around the center — we need it to scale from the top. Instead set the mesh position.y = -len/2 each frame and scale.y = len/20. Good.

Now, the smoke spawn positions:
- Trench exits at z = ±58, x=0, y=2.5.
- Velocity: (vx = ±? ) The exhaust exits along z, so the smoke rolls out along z. Spawn velocity: (rand*15, rand*4, sign*35).
- Also spawn at the pad around the rocket: (rand*20, 3, rand*20) with an upward velocity.

During the first ~8 s: heavy ground smoke. Then the deluge steam rises.

Let's define `spawnPadSmoke(simDt)`.

Also the "billowing white steam" should cover the pad. With particles of size 10-40 m growing to 60 m and ~1500 particles, it will.

Particle color: white (0.95,0.95,0.97) with alpha ~0.35, growing. In a lit scene, the smoke should be lit by the flame — using a bright point light won't affect the particles (ShaderMaterial without lighting). Instead, tint the smoke near the flame: set the particle color based on its position and the flame intensity at spawn time (orange tint near the trench during ignition). We can add emissive coloring manually. Let's give the smoke a color that starts warm near the trench and becomes white/gray as it ages. That's doable in the spawn: color = mix(orange, white) based on distance.

OK, let's write the code now. I'll be careful with types.

Also: `renderer.setAnimationLoop`.

EffectComposer resize: `composer.setSize(w, h)` on resize; also the bloom pass resolution.

Let me write the file.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```

Potential TS issue: `three/addons/...` types. If @types/three is installed, these paths resolve via the package's exports? In recent three versions, the types are bundled (three r150+ ships its own types? No, three still uses @types/three). @types/three provides `three/addons/*` declarations? The DefinitelyTyped package has an `addons` folder mapping? Hmm, @types/three includes `examples/jsm/*` declarations. The `three/addons/*` alias is a package export mapping in three's package.json (`"./addons/*": "./examples/jsm/*"`). TypeScript with `moduleResolution: bundler` or `node16` resolves via exports to the .js file and looks for the .d.ts... For @types/three, the declaration files are in `@types/three/examples/jsm/...`. The package.json exports of the actual `three` package point to ./examples/jsm/*.js, and TS will look for @types/three/examples/jsm/*.d.ts. I believe modern setups handle `three/addons/...` fine.

The task says "Addons from 'three/addons/...'", so we must use that. OK.

Let's write everything.

```ts
// ---------- Renderer / Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc6d9e8, 3.0e-5);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 2.0e7);
camera.position.set(95, 3, 110);
```

Now the sun:
```ts
const sunDir = new THREE.Vector3(0.55, 0.62, 0.56).normalize();
const sun = new THREE.DirectionalLight(0xfff1e0, 3.0);
sun.position.copy(sunDir).multiplyScalar(600);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera as THREE.OrthographicCamera;
sc.left = -180; sc.right = 180; sc.top = 180; sc.bottom = -180; sc.near = 1; sc.far = 2000;
sun.shadow.bias = -0.0006;
sun.target.position.set(0, 20, 0);
scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xa9c8ef, 0x3b3a26, 0.75);
scene.add(hemi);
```
Wait: sun.position = sunDir*600 and the target at (0,20,0) → the shadow camera looks from the sun toward the target. Good.

Environment map from a canvas:
```ts
function makeEnvironment(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, '#1b3f78');
  g.addColorStop(0.45, '#8fb6dd');
  g.addColorStop(0.52, '#cfdce6');
  g.addColorStop(1.0, '#4a452c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
  // sun blob
  const sg = ctx.createRadialGradient(190, 40, 0, 190, 40, 30);
  sg.addColorStop(0, 'rgba(255,250,235,1)');
  sg.addColorStop(1, 'rgba(255,250,235,0)');
  ctx.fillStyle = sg; ctx.fillRect(0,0,256,128);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromEquirectangular(makeEnvironment()).texture;
scene.environment = envTex;
```
Hmm, PMREMGenerator.fromEquirectangular needs the texture's colorSpace set to sRGB for correct conversion; fine. `scene.environment` gives reflections on the PBR materials. Note the envMap intensity: `scene.environmentIntensity = 0.6` (three r163+). This property exists in newer three; if the installed version is older, TS might complain. Avoid: set `material.envMapIntensity = 0.5` per material. Safer. Actually I can just skip setting intensity.

Hmm, PMREMGenerator requires `renderer` — fine. Dispose after: `pmrem.dispose()`.

Careful: `pmrem.fromEquirectangular(tex)` returns a WebGLRenderTarget; keep .texture. Dispose the render target? Keep it (needed).

Now the sky.

```ts
const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uAlt: { value: 0 },
  uTime: { value: 0 },
};
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
  vertexShader: `...`,
  fragmentShader: `...`,
});
const skyGeo = new THREE.SphereGeometry(500000, 32, 16);
const skyMesh = new THREE.Mesh(skyGeo, skyMat);
skyMesh.frustumCulled = false;
skyMesh.renderOrder = -1000;
scene.add(skyMesh);
```
The sky mesh position is set to the camera each frame. Since the radius is 500000 and the camera far is 2e7, fine. But with depthTest false, it's drawn first.

Wait: renderOrder -1000 with an opaque material and depthTest false — three sorts opaque objects by renderOrder, ascending. So the sky draws first. Good.

Sky vertex:
```glsl
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
Since the mesh is translated (not rotated), local position = direction. Good. But the modelViewMatrix includes the translation; gl_Position is correct. vDir = normalized position.

Fragment as designed.

Now the terrain cap.

```ts
function buildEarthCap(): THREE.Mesh {
  const R = R_EARTH;
  const radius = 2.5e6;
  const rings = 200, segs = 256;
  const positions: number[] = [];
  const indices: number[] = [];
  // center vertex
  positions.push(0, 0, 0);
  for (let i = 1; i <= rings; i++) {
    const f = i / rings;
    const r = radius * f * f;
    const y = -R + Math.sqrt(Math.max(R*R - r*r, 0));
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  // indices
  const ringStart = (i: number) => 1 + (i - 1) * segs;
  for (let j = 0; j < segs; j++) {
    const j2 = (j + 1) % segs;
    indices.push(0, ringStart(1) + j, ringStart(1) + j2);
  }
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const j2 = (j + 1) % segs;
      const a = ringStart(i) + j, b = ringStart(i) + j2;
      const c = ringStart(i+1) + j, d = ringStart(i+1) + j2;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  ...
}
```
Winding: the surface normal should point up. Let's check the triangle (0, ring1_j, ring1_j2) with j=0 at angle 0 → (1,0) direction (cos, sin) = (1,0), j2 at a small positive angle → (1, ε) in xz. The triangle is (0,0,0), (r,0), (r cosε, r sinε) → in the XZ plane viewed from above (looking down -y), the winding... Cross product of (p1-p0) × (p2-p0) = (r,0,0) × (r, rε, 0) = (0*0 - 0*rε, 0*r - r*0, r*rε - 0) = (0, 0, r²ε) → normal +z, not up. So it's clockwise when viewed from above → the normal points down. Need to flip: use (0, j2, j) order. Let's just use `geo.computeVertexNormals()` after setting correct winding. I'll flip: push(0, ring1+j2, ring1+j).

For the quads: a=inner j, b=inner j2, c=outer j, d=outer j2. Want normals up. From above, the inner ring is smaller. The quad in the XZ plane: a=(r1,0), b=(r1 cosε, r1 sinε), c=(r2,0), d=(r2 cosε, r2 sinε) with r2>r1. Viewed from above with x right and z up in the screen... Let's just compute the cross product for the triangle a,b,d: (b-a) × (d-a). b-a ≈ (0, r1 ε, 0) (in x,y,z with y=0), d-a ≈ (r2-r1, 0, 0). Cross = (b-a) × (d-a) = (0, r1ε, 0) × (r2-r1, 0, 0) = (r1ε*0 - 0*0, 0*(r2-r1) - 0*0, 0*0 - r1ε*(r2-r1)) = (0, 0, -r1ε(r2-r1)) → normal -z (down). So flip: use (a, d, b) and (b, d, c). I'll just compute the normals manually instead: set the normal attribute from the sphere position (exact normals, pointing up). Then winding matters only for backface culling. Set `side: THREE.DoubleSide` on the material to avoid culling issues. Then no need to worry about winding! And compute normals manually:

```ts
const normals: number[] = [];
// center normal (0,1,0)
for each position: n = normalize(x, y+R, z) 
```
Since y+R = sqrt(R²-r²) > 0, the normal points up. Good.

Use side: THREE.FrontSide? With DoubleSide and manual normals, we're safe. DoubleSide disables culling — fine, 100k triangles.

Actually, if the winding is wrong and we use DoubleSide, the lighting with our manual normal is correct anyway (we compute our own normal). Good.

Use `side: THREE.DoubleSide`.

Now the terrain material:

```ts
const terrainUniforms = {
  uSunDir: { value: sunDir }, uSunColor: { value: new THREE.Color(1.0, 0.93, 0.82) },
  uAmbient: { value: new THREE.Color(0.18, 0.24, 0.34) },
  uHaze: { value: new THREE.Color(0.52, 0.66, 0.82) },
  uHazeDensity: { value: 2.2e-5 },
  uCamPos: { value: new THREE.Vector3() },
  uTime: { value: 0 },
};
```
Note: THREE.Color values are in linear? When you do new THREE.Color(0.52,0.66,0.82), it's treated as linear-srgb already? In three, `Color` constructor with numbers sets rgb directly; with hex and `setHex` there's color management that converts sRGB to linear (if ColorManagement enabled). Using numbers directly → the values are linear. Good.

Uniform update each frame: uCamPos = camera.position.

Terrain fragment shader needs the sun direction normalized.

Now the concrete pad, tower, rocket, smoke, camera, HUD.

Let me write the code in order and be careful.

Also: the "lightning masts" and "tower" need materials: steel gray MeshStandardMaterial(0x8a8f94, metalness 0.7, roughness 0.5).

Let me write the beam helper:

```ts
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const upVec = new THREE.Vector3(0, 1, 0);
function addBeam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, t: number, mat: THREE.Material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-6) return;
  const m = new THREE.Mesh(unitBox, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(upVec, dir.clone().normalize());
  m.scale.set(t, len, t);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
}
```
Note: shared geometry with different scales — fine.

Tower at (18, 0, 0), 88 m tall, 9x9 footprint:
```ts
function buildTower(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(18, 1.5, 0);
  const w = 4.5, h = 88;
  const corners = [new THREE.Vector3(-w,0,-w), new THREE.Vector3(w,0,-w), new THREE.Vector3(w,0,w), new THREE.Vector3(-w,0,w)];
  for (const c of corners) {
    addBeam(g, c.clone(), c.clone().setY(h), 0.45, steelMat);
  }
  for (let y = 0; y <= h; y += 8) {
    for (let i = 0; i < 4; i++) {
      const a = corners[i].clone().setY(y), b = corners[(i+1)%4].clone().setY(y);
      addBeam(g, a, b, 0.25, steelMat);
    }
    if (y + 8 <= h) {
      for (let i = 0; i < 4; i++) {
        const a = corners[i].clone().setY(y), b = corners[(i+1)%4].clone().setY(y+8);
        addBeam(g, a, b, 0.18, steelMat);
      }
    }
  }
  return g;
}
```
That's 4 + 12*8 = 100 beams. Fine.

Add a service arm to the rocket: a horizontal beam from the tower to the rocket at y=45 and y=25? But the rocket is at x=0 and the tower at x=18 with a half-width of 4.5 → the tower's near face at x=13.5; the rocket radius 1.85. So the arm spans x from 13.5 to 2 (11.5 m). Fine. It should retract, but leave it static.

Also add a water tower and a lightning mast.

Lightning masts: 3 at radius 130 m, angles 30°, 150°, 270°. Height 110 m, lattice of 3 legs.

Wires: catenary from mast top to mast top, and from each mast top down to the ground at a nearby anchor. Use `THREE.Line` with a catenary computed by 20 points.

Now the rocket.

```ts
const rocketGroup = new THREE.Group();
scene.add(rocketGroup);
```
Build:

```ts
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: 0.45, metalness: 0.08 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.55, metalness: 0.35 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.7, metalness: 0.2 });
const engineMat = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.35, metalness: 0.9 });
```
Add cylinders:
```ts
function addCyl(rTop:number,rBot:number,h:number,y:number,mat:THREE.Material, seg=32, open=false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBot,h,seg,1,open), mat);
  m.position.y = y + h/2;
  m.castShadow = true; m.receiveShadow = true;
  rocketGroup.add(m);
  return m;
}
```
Body from y=4.5 to 45: r 1.85. Then interstage 45→49.5 r 1.85 dark. Then second stage 49.5→60.5. Then the fairing 60.5→70.

Wait, engines: the engine section from 0 to 4.5 (black), nozzles below y=0? The nozzles should extend below the base... The rocket's base at y=0 is the bottom of the engine section; the nozzles stick below by ~1.6 m. But the pad is at PAD_TOP=7, so the nozzles would be at y=5.4 — above the launch mount ring at 6.5? Hmm, the nozzles should be above the ring so the plume goes through the ring hole. Let's put the engine section bottom at y=0 and the nozzle cones from y=0 down to y=-1.5. Then the base of the rocket group at y=7 means the nozzles are at 5.5, and the mount ring at y=6.5 with radius 4 would intersect the nozzles. Move the ring to y=5.0 with radius 3.5, and legs down to the pad. Then the nozzles (radius ~1.25+0.45 = 1.7) are inside the ring. Good.

Let's set PAD_TOP = 7 (the rocket's "base" y=0 in local coords is the engine section bottom). Plume from y=-1.5 downward.

Rocket height: 70 m from y=0 to 70. Good.

Nozzles:
```ts
for (let i=0;i<9;i++){
  let x=0,z=0;
  if (i<8){ const a = i/8*Math.PI*2; x=Math.cos(a)*1.15; z=Math.sin(a)*1.15; }
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.52, 1.5, 12, 1, true), engineMat);
  n.position.set(x, -0.75, z);
  rocketGroup.add(n);
}
```
CylinderGeometry (radiusTop, radiusBottom, ...) with radiusTop 0.22 (the throat at the top? no—the nozzle bell is wider at the bottom). The cylinder's top is at +y. We want a bell: narrow at the top (throat, attached to the engine) and wide at the bottom (exit). So radiusTop=0.25, radiusBottom=0.55. Position y = -0.75. Good.

Markings decal: a cylinder segment of height 5 m at y=40, radius 1.87.
```ts
const markMat = new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const markGeo = new THREE.CylinderGeometry(1.88, 1.88, 5, 48, 1, true, Math.PI*0.55, Math.PI*0.9);
```
The theta start/length define which part of the circumference; the texture maps across the segment's UVs. Hmm, for an open-ended cylinder, the UV u goes around the theta range 0..1. So the flag+text would be compressed into 0.9*π of the circumference. The ratio: circumference 11.8 m; 0.9π rad = 2.83 rad → 5.3 m wide, 5 m tall. The texture is 1024x256 (aspect 4:1) mapped to 5.3x5 → stretched. Adjust the texture aspect: 1024x512 and the segment height 4 m, width 5.3 m → still not 4:1. Make the segment theta length = 1.2 rad (2.26 m) — too narrow for the flag.

Alternative: use a full 360° cylinder with the texture, but then the marking wraps around the whole rocket (the flag appears once on the visible half if we set the texture so the rest is transparent). With a full wrap, the texture's 1024 width maps to the full circumference 11.8 m, and the height maps to the segment height. Use texture 2048x1024 mapped to 11.8 m x 5.9 m (aspect 2:1) — matches the texture's 2:1. The flag would be ~2 m wide on the rocket. Fine.

So: `CylinderGeometry(1.87,1.87,5.8,64,1,true)` full wrap, with the texture 2048x1024 containing the flag and "SPACEX" text positioned within the left half and transparent elsewhere. The rest is transparent so only the marking shows. DepthWrite false, polygonOffset to avoid z-fighting with the body at radius 1.85 vs 1.87 — 2 cm gap, no z-fighting. Good. Set side: THREE.FrontSide (a decal on the outside).

Hmm, but with transparent material and depthWrite false, it renders after opaque, fine.

Actually, simpler: make the marking part of the body texture? The body is a cylinder with a white material; we could use a map with a subtle pattern. Skip.

Let's do two decal bands: y=38 (upper stage/booster) and y=8 (near the bottom).

Hmm, the flag on the body at y=38 with the interstage at 45-49.5. Fine.

Also a "FALCON" text? The spec says "markings (a flag and lettering drawn on a canvas texture)". Good.

Now let's write the camera update.

```ts
const camPos = new THREE.Vector3(95, 3, 110);
const camTarget = new THREE.Vector3(0, 40, 0);
function updateCamera(dt: number) {
  const alt = flight.alt;
  const rx = flight.x;
  const baseY = PAD_TOP + alt;
  const pitch = flight.pitch;
  const mid = new THREE.Vector3(rx - Math.sin(pitch) * 32, baseY + Math.cos(pitch) * 32, 0);
  const chaseYaw = 0.5 + Math.min(alt / 120000, 1) * 0.75;
  const dist = 92;
  const chase = new THREE.Vector3(rx + Math.cos(chaseYaw) * dist, baseY + 22, Math.sin(chaseYaw) * dist);
  const b = THREE.MathUtils.smoothstep(alt, 90, 330);
  const desired = new THREE.Vector3(95, 3, 110).lerp(chase, b);
  camera.position.copy(desired);
  const target = new THREE.Vector3(0, 45, 0).lerp(mid, Math.min(1, b * 1.6));
  camera.lookAt(target);
  camera.up.set(0, 1, 0);
}
```
Hmm, at b=0 the pad camera's target should follow the rocket as it rises, otherwise the rocket leaves the frame before b grows. Alt 90 m → b starts at 0. The rocket at alt 90 is at y=97, and the pad camera at (95,3,110) looking at (0,45,0) — the rocket would be way up. The FOV 55° with a target at 45 m: the rocket at 97 m is 50 m above the target at ~145 m distance → 19° up; within the half-FOV of 27.5°, so still visible. At alt 200, b = smoothstep(90,330,200)=0.46 → the camera moves toward the chase. Probably fine.

But the transition: from the pad view to the chase, the camera moves through the pad area. Fine.

Also, at very high altitude, the camera is 92 m from the rocket, and the FOV includes the rocket (70 m tall) — at 92 m distance with a 55° FOV, the visible height at that distance is 2*92*tan(27.5°)=95 m. So the rocket (70 m) fills most of the frame. Good. But we want to see the coast and the Earth curve too — a 55° FOV at 92 m shows a lot of the background. Fine.

Maybe increase the distance to 120 m so more context is visible? The spec says within about 100 m. Use 95.

As the rocket accelerates and the plume lengthens, the camera follows the base+22. The plume extends below the base by 20-200 m; at high altitude the plume is 200 m long and would be out of frame (the camera looks at the rocket mid). Let's tilt the look target down as the altitude increases? Or just accept it. Maybe the target should be between the rocket and the plume: target = mid - (0, min(plumeLen*0.4, 40), 0). Let's include a slight downward bias with altitude.

Alternatively, increase the camera distance with altitude: dist = 92 + min(alt/3000, 60) → up to 152 m. Then the plume fits. The spec says "within about 100 m" for the close chase; 150 is a bit far but okay. Let's keep dist = 92 + min(alt/4000, 40) = up to 132.

Fine.

Now, the HUD.

```ts
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;left:14px;top:12px;color:#dff0ff;font:500 13px/1.5 ui-monospace,Menlo,monospace;text-shadow:0 0 6px #000;pointer-events:none;letter-spacing:.05em;z-index:10';
document.body.appendChild(hud);
```
Buttons container at top right? Bottom center. Style them.

```ts
const btnWrap = document.createElement('div');
btnWrap.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:8px;z-index:11';
const speeds = [1, 10, 30];
for (const s of speeds) { const b = document.createElement('button'); ... }
```
Style buttons: translucent dark with a light border.

Speed keys: keydown → if e.key === '1' set 1; '2' → 10; '3' → 30; 'p' → toggle paused; 'r' → reset.

Now, the effect composer:

```ts
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.6, 0.9);
composer.addPass(bloom);
```
UnrealBloomPass constructor signature: (resolution: Vector2, strength: number, radius: number, threshold: number). Good.

With ACES tone mapping applied in the material shaders, the bloom threshold 0.9 in the post-tonemap range... it's fine.

Hmm, actually when using EffectComposer, the RenderPass renders into a float/half-float target and the tone mapping is applied by the materials (since renderer.toneMapping is set). Then the bloom operates on tone-mapped values. Colors > 0.9 will bloom, e.g., the white sky (0.8 after ACES?) — the whole bright sky might bloom. That's actually fine/pretty, but could wash out. Set threshold 1.0? Tone-mapped values are ≤1, so threshold 1.0 would never bloom. Hmm!

Wait: does three apply tone mapping when rendering to a render target? In WebGLProgram, `toneMapping` is applied in the shader when `parameters.toneMapping !== NoToneMapping`, and the renderer sets `toneMapping` for materials unless rendering to a render target? Let me recall: WebGLRenderer.getRenderTarget()... In WebGLRenderer, the program parameters include `toneMapping: renderTarget === null ? this.toneMapping : NoToneMapping`? Yes! There is this in WebGLRenderer:

```js
const parameters = {
  ...
  toneMapping: currentRenderTarget === null ? this.toneMapping : NoToneMapping,
```
I believe this is the case — tone mapping is only applied when rendering to the canvas. Yes, three has this behavior: `toneMapping` in program parameters is `this.toneMapping` only if the render target is null. So with the composer, the RenderPass renders to an HDR-ish target without tone mapping (values can exceed 1), then the last pass (a copy/output) ... but EffectComposer doesn't add an OutputPass by default, so the final pass renders to the canvas with the material's tone mapping... Hmm, UnrealBloomPass's final composite (ShaderPass) writes to the canvas but the material has no tone mapping applied → the image would be un-tonemapped and clipping.

In recent three versions, examples add `OutputPass` at the end which applies tone mapping and color space conversion. So we should add `OutputPass` from 'three/addons/postprocessing/OutputPass.js'. Then set renderer.toneMapping = ACESFilmic and add the OutputPass at the end.

Yes: import OutputPass and add after bloom. Then the bloom works on HDR values > 1 (threshold ~1.0), which is correct.

Let's set bloom threshold 1.0, strength 0.5, radius 0.5.

With OutputPass, the tone mapping and sRGB conversion happen at the end. Then the material colors are in linear space, and the HDR values can exceed 1 for the bright plume.

OK: `composer.addPass(new OutputPass());`.

Also, `renderer.outputColorSpace` remains sRGB by default; the OutputPass handles the conversion.

Note: when rendering to intermediate targets, the color space is linear-srgb. The composer's render targets default to... EffectComposer creates a WebGLRenderTarget with type HalfFloatType in newer versions (r152+ uses HalfFloatType). Good for HDR.

Now, `renderer.toneMappingExposure` applies in the OutputPass.

Let's write the smoke materials with colors in linear space (values > 0 for brightness). For additive fire particles, use color values like (8, 4, 1) to get HDR and bloom.

For the plume mesh with MeshBasicMaterial color set > 1? MeshBasicMaterial color can be a THREE.Color with values > 1 (e.g., setRGB(6,3,1)) — yes, colors can exceed 1 in linear space. Combined with the additive map, the plume will be HDR and bloom.

Let's set the plume material: `new THREE.MeshBasicMaterial({ map: plumeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(3.0, 1.8, 0.9), side: THREE.DoubleSide })`. Hmm, the map's color multiplies. With the gradient texture (white to orange), the result is HDR.

But the texture is sRGB → converted to linear, so white stays 1.0 and orange ~0.5. Multiplied by color (3,1.8,0.9) → bright.

OK.

Now the particle systems' colors: for the smoke, use linear colors around 0.7-0.9 (white-ish). With the standard material lighting absent (custom shader), the smoke would appear at the given brightness. The sun-lit smoke is bright white; use color 0.8. With ACES tone mapping, 0.8 → ~0.75. Good.

For the fire: HDR values.

Let's write the particle system class:

```ts
class ParticleSystem {
  readonly points: THREE.Points;
  private readonly geo: THREE.BufferGeometry;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly max: number;
  private list: Particle[] = [];
  constructor(max: number, tex: THREE.Texture, blending: THREE.Blending, fogColor?: THREE.Color) {
    ...
  }
}
```

Attributes arrays of size max*3 etc.

Shader with uPixelScale uniform.

Update:
```ts
update(dt: number, groundY = 0) {
  const arr = this.list;
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    p.age += dt;
    if (p.age >= p.life) continue;
    // physics
    p.vy += p.buoy * dt;
    const d = Math.exp(-p.drag * dt);
    p.vx *= d; p.vz *= d; // not vy
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < groundY + p.size*0.25) { p.y = groundY + p.size*0.25; if (p.vy < 0) p.vy *= -0.05; p.vx *= 0.96; p.vz *= 0.96; }
    p.size += p.grow * dt;
    const t = p.age / p.life;
    const a = p.a0 * Math.min(1, t*8) * (1 - t) * (1 - t*0.3);
    // write
    arr[w++] = p;  // in-place compaction
    ...
  }
  arr.length = w;
  this.geo.setDrawRange(0, w);
  ...
}
```
Careful with in-place compaction while iterating: since w <= i always, assigning arr[w] = p is safe.

Then write the attributes for indices 0..w-1.

But we need to write positions in the same loop. Let's do:

```ts
let w = 0;
for (let i = 0; i < arr.length; i++) {
  const p = arr[i];
  ... update ...
  if (dead) continue;
  arr[w] = p;
  const o3 = w * 3;
  pos[o3] = p.x; pos[o3+1] = p.y; pos[o3+2] = p.z;
  sizes[w] = p.size;
  alphas[w] = a;
  cols[o3] = p.r; cols[o3+1] = p.g; cols[o3+2] = p.b;
  w++;
}
arr.length = w;
```
And mark the attributes needsUpdate.

Note: `geometry.setDrawRange(0, w)` for points; and `geometry.attributes.position.updateRanges`? Just set needsUpdate = true.

Since the attributes are allocated with max, updateRanges can be used but needsUpdate is fine.

Also computeBoundingSphere: set `points.frustumCulled = false`.

Particles: the spawn method takes a config.

Let's define:
```ts
interface Particle {
  x:number; y:number; z:number;
  vx:number; vy:number; vz:number;
  age:number; life:number;
  size:number; grow:number;
  drag:number; buoy:number;
  r:number; g:number; b:number;
  a0:number;
}
```
Spawn function creates an object.

Now, spawning:

```ts
function spawnPadSmoke(sys: ParticleSystem, simDt: number) {
  if (flight.t > 30) return;
  const rate = 90; // per sim second
  let n = simDt * rate;
  while (n > 0) {
    if (n < 1 && Math.random() > n) break;
    n -= 1;
    const side = Math.random() < 0.5 ? -1 : 1;
    ...
  }
}
```
Hmm, `n` handling: better `const count = Math.floor(simDt*rate + Math.random())`.

Spawn at the trench ends:
```ts
const z = side * (56 + Math.random()*8);
sys.spawn({
  x: (Math.random()-0.5)*14, y: 2 + Math.random()*4, z,
  vx: (Math.random()-0.5)*10, vy: 1 + Math.random()*6, vz: side*(18 + Math.random()*30),
  life: 9 + Math.random()*14,
  size: 8 + Math.random()*14, grow: 6 + Math.random()*10,
  drag: 0.55, buoy: 1.8 + Math.random()*1.6,
  r: 0.85, g: 0.86, b: 0.9, a0: 0.45,
});
```
And also near the base:
```ts
x: (Math.random()-0.5)*30, y: 8+..., z: (Math.random()-0.5)*30
vy: 4..14
```
These rise up around the rocket. During the first seconds, lots of steam.

The color: warm near the flame. Add a slight orange tint at spawn: r=0.95, g=0.9, b=0.85.

Also add a "flame-lit" tint for the first 5 s: r=1.0, g=0.72, b=0.4 with alpha 0.3. Maybe not necessary.

The white steam needs to look soft and volumetric — with the soft texture and 1000+ particles, it will.

Fire/exhaust particles: spawn at the nozzle while thrusting:
```ts
if (flight.t < 200 && flight.alt < 20000) { ... }
```
The exhaust particles should follow the rocket's direction. Spawn at the nozzle with a velocity of -thrustDir * (120 + rand*80) plus some spread. Life 0.4-0.9 s. Size 4-12 growing 20. Additive, HDR color (4, 2.4, 1.0). At 30x speed, spawning per real time is better (they're transient). Use the real dt for these: rate 300/s → with dt=1/30 that's 10 per frame. Life 0.6 → ~180 alive. Good.

But at high time scale, the rocket moves 1000 m/frame and the particles linger at the spawn point — they'd trail behind, forming a plume trail. That's actually good.

Let's spawn the fire based on real dt.

Contrail: spawn puffs at the rocket's current position when alt > 3000, one every N meters of travel, with a long life.

```ts
let lastContrailPos = new THREE.Vector3();
function updateContrail(dt: number) { ... }
```
Spawn with size 5, grow 1.5, life 400, buoy 0, drag 0.1, drift vx = -1 (wind), white alpha 0.25.

The contrail puffs at high altitude should be white and slowly expanding. Good.

Total contrail particles: if spawned every 200 m over a 300 km flight → 1500. Cap at 1800 (the system max); when full, the spawn is skipped (or replace the oldest). Fine.

Now the ribbon trail. Let's write it as described.

Also the rocket's own trail should be the nozzle world position.

Now, let's write the sky fragment shader carefully.

```glsl
uniform vec3 uSunDir;
uniform float uAlt;
uniform float uTime;
varying vec3 vDir;

float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }

void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  float t = clamp(y, 0.0, 1.0);

  vec3 horizon = vec3(0.62, 0.73, 0.85);
  vec3 midSky  = vec3(0.20, 0.42, 0.78);
  vec3 zenith  = vec3(0.035, 0.12, 0.36);

  vec3 col = mix(horizon, midSky, smoothstep(0.0, 0.22, t));
  col = mix(col, zenith, smoothstep(0.12, 0.9, t));

  // haze band right at the horizon
  col = mix(col, vec3(0.72, 0.80, 0.90), pow(1.0 - t, 24.0) * 0.7);

  // sun glow
  vec3 sd = normalize(uSunDir);
  float cosAngle = max(dot(d, sd), 0.0);
  col += vec3(1.0, 0.86, 0.62) * pow(cosAngle, 800.0) * 40.0;
  col += vec3(1.0, 0.80, 0.55) * pow(cosAngle, 12.0) * 0.28;
  col += vec3(1.0, 0.88, 0.70) * pow(cosAngle, 3.0) * 0.06;

  // altitude darkening
  float a = clamp(uAlt / 100000.0, 0.0, 1.0);
  float dark = smoothstep(0.0, 1.0, pow(a, 0.55));
  col *= mix(1.0, 0.02, dark);
  // horizon keeps a blue glow
  col += vec3(0.03, 0.10, 0.22) * dark * pow(1.0 - t, 8.0);

  // stars
  float starVis = smoothstep(60000.0, 100000.0, uAlt);
  if (starVis > 0.001) {
    vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
    vec2 g = uv * vec2(900.0, 450.0);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash21(id);
    float star = smoothstep(0.42, 0.0, length(f)) * step(0.993, h);
    float tw = 0.65 + 0.35 * sin(uTime * 2.1 + h * 63.0);
    col += vec3(0.85, 0.92, 1.0) * star * tw * starVis * (0.6 + h);
  }

  gl_FragColor = vec4(col, 1.0);
}
```
Note: `atan(d.z, d.x)` in GLSL ES 1.0 is supported. Yes, atan(y,x) exists.

The `pow(cosAngle, 800.0)` may be problematic in low precision? WebGL1 mediump has limited exponent range; use highp float in the fragment shader. ShaderMaterial defaults to highp? The default precision is highp for vertex and mediump for fragment on some devices. Add `precision highp float;`? ShaderMaterial doesn't allow a custom precision header easily... Actually you can add `precision highp float;` at the start of the fragment string; three prepends its own precision declaration, and declaring again may be an error? Redeclaring precision is allowed. Let's not worry.

pow(x, 800) with mediump might return 0 or garbage. Use a different sun disc: `float sunDisc = smoothstep(0.9995, 0.9999, cosAngle);` — cleaner and avoids pow. And glow via pow(cosAngle, 8.0).

Let's do:
```glsl
float sun = smoothstep(0.9993, 0.99985, cosAngle);
col += vec3(1.0, 0.95, 0.85) * sun * 60.0;
col += vec3(1.0, 0.8, 0.55) * pow(cosAngle, 10.0) * 0.35;
```
Note the sun disc size: acos(0.9993)=0.037 rad ≈ 2.1°; real sun is 0.53°. Use 0.99996 (0.28°)? Let's use smoothstep(0.9996, 0.9999, cos) → acos(0.9996)=0.028 rad=1.6°. A bit big but okay for a bright bloom. Use 0.9998→0.99995: 0.02→0.01 rad. Fine.

Also, the "below horizon" handling: the ground covers it, but the sky is drawn everywhere; below the horizon (y<0), set col to the haze color so that if there's any gap, it's not black:
```glsl
col = mix(col, vec3(0.55,0.65,0.75), smoothstep(0.0, -0.1, y));
```

Now, the plume and smoke should be visible against the sky.

Let's also add a "sun glare" via bloom.

Now, the code for the visual update of the rocket:

```ts
function updateRocketVisual() {
  const alt = flight.alt;
  rocketGroup.position.set(flight.x, PAD_TOP + alt, 0);
  rocketGroup.rotation.z = flight.pitch;
  // plume
  const firing = flight.t < BURN_TIME;
  ...
}
```

Wait: rotation.z = pitch tilts the top toward -x. Good.

The rocket group's origin is at its base. The position x is the horizontal displacement of the base.

The noise/shake at liftoff: skip.

Now, the point light for the flame:
```ts
const flameLight = new THREE.PointLight(0xffb060, 0, 900, 2);
rocketGroup.add(flameLight);
flameLight.position.set(0, -12, 0);
```
Since it's a child of the rocket group, it follows and rotates. Intensity: flicker = 1 + 0.35*sin(t*40) + 0.2*sin(t*77). Set intensity = 40000 * flicker while firing, fading with altitude (the flame is smaller relative to the scene). Actually the light should illuminate the pad at liftoff. Light intensity in three (physical) = candela; illuminance at 20 m = I/400. For an intensity of 40000 → 100 lux at 20 m, vs. the sun's ~3 (in three's arbitrary units, a directional light of intensity 3 ≈ sun). Hmm, the units are inconsistent, but practically the directional light intensity of 3 with ACES maps to a bright sun. A point light of intensity 40000 at 20 m gives 100 — way brighter than the sun. Let's compute: three's PointLight illuminance contribution = intensity * decay factor / distance². With decay 2, at 20 m: I/400. To be comparable to the sun (3), need I ≈ 1200. For a bright flame (3-5x the sun near the pad), I ≈ 4000-6000. Let's use 8000 with flicker. At 100 m, that's 0.8 — dim. Fine, the light falls off.

Set distance = 600 (a cutoff) to avoid lighting the whole terrain? Point lights with distance > 0 attenuate to zero at that distance (with decay). Use distance 500.

Ok.

Also, add a second smaller light at the plume tip? Skip.

Now let's write everything. I'll aim for a complete, compiling file.

Potential pitfalls:
- `THREE.MathUtils.smoothstep(x, min, max)` exists (returns 0..1). Signature: smoothstep(x, min, max). Yes.
- `THREE.PMREMGenerator` type.
- `scene.environment = envTex` expects Texture | null.
- `renderer.setAnimationLoop(callback)` — callback type `XRFrameRequestCallback | null`. A no-arg arrow is fine.

- The `document.body.style` etc.

- `window.addEventListener('resize', ...)`.

Let me now write the final code.

One more consideration: `state()` must return a fresh object each call including speed. Good.

Also, the render loop should call `step(min(delta,1/30)*speed)` when not paused.

Let's define `currentSpeed()` using viewerSpeed/time.

Test might set `__rocket.paused = true`. Our render loop reads `(window as any).__rocket.paused`? Use our local `rocketApi.paused` — same object. Good.

Now writing.

```ts
/* ---------- Physics ---------- */
const G0 = 9.81;
const R_EARTH = 6371000;
const M0 = 550000;
const M_DRY = 220000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;
const PAD_TOP = 7;

type Vec3 = { x: number; y: number; z: number };

const flight = { t: 0, alt: 0, vel: 0, acc: 0, pitch: 0, hv: 0, x: 0 };
const trail: Vec3[] = [];
let viewerSpeed: number | null = null;

function pitchAt(t: number): number { ... }
function massAt(t: number): number { ... }
function thrustAt(t: number, m: number): number { ... }
function currentSpeed(): number { return viewerSpeed !== null ? viewerSpeed : (flight.t < 10 ? 1 : 10); }

function substep(dt: number) { ... }

function stepSim(dt: number) {
  if (dt > 0) {
    let rem = dt;
    let guard = 0;
    while (rem > 1e-9 && guard++ < 200000) {
      const h = Math.min(0.02, rem);
      substep(h);
      rem -= h;
    }
  }
  trail.push({ x: flight.x, y: PAD_TOP + flight.alt, z: 0 });
  if (trail.length > 6000) trail.splice(0, trail.length - 6000);
}

function resetSim() {
  flight.t = 0; flight.alt = 0; flight.vel = 0; flight.acc = 0; flight.pitch = 0; flight.hv = 0; flight.x = 0;
  trail.length = 0;
  viewerSpeed = null;
  lastSimT = 0;
  resetParticles();
}

const rocketApi = {
  trail,
  paused: false,
  reset() { resetSim(); },
  step(dt: number) { stepSim(dt); },
  state() { return { t: flight.t, alt: flight.alt, vel: flight.vel, acc: flight.acc, pitch: flight.pitch, speed: currentSpeed() }; },
};
(window as any).__rocket = rocketApi;
```

Wait: `resetSim` calls `resetParticles` which is defined later (function hoisting works for function declarations). Fine.

Also, `lastSimT` declared with let before use.

Careful about the order of declarations: `rocketApi` references `resetSim` (function declaration, hoisted) — fine. But `resetSim` references `resetParticles` — also a hoisted function declaration as long as I define it with `function`.

The particle systems themselves are created in the scene setup, which must happen before any reset call (reset is only called by the user later). But `resetSim` is fine.

Also, `rocketApi.paused`: the render loop reads `rocketApi.paused`.

Now, is `__rocket` supposed to be set before or after the scene? Doesn't matter, but the test may access it immediately. Set it right after defining (physics is independent of rendering). But `resetSim` calls resetParticles which touches the scene objects — if called before they're created, crash. So define __rocket after the scene is built. Hmm, the test probably waits for __ready. But safer: define resetParticles as a function that checks if the systems exist. Let's assign __rocket at the very end, after everything. Actually the spec says expose __scene/__camera/__renderer and then __ready after the first frame. Tests will wait for __ready. So assigning __rocket at the end is fine.

I'll assign __scene/__camera/__renderer right after creation anyway.

Now, let's write all the scene building code.

I need to be careful about TypeScript strict null checks with `document.getElementById` etc. — not used.

`canvas.getContext('2d')!` — non-null assertion is allowed in strict mode.

Let me write the full file now.

Also the resize handler updates the camera aspect, renderer size, composer size, and the particle pixel scale.

```ts
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  updatePixelScale();
}
```
`composer.setSize` also sets the bloom pass size? EffectComposer.setSize sets each pass's size via pass.setSize(w,h). UnrealBloomPass implements setSize. Good.

updatePixelScale:
```ts
const size = new THREE.Vector2();
renderer.getDrawingBufferSize(size);
const s = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
smokeSys.points.material.uniforms.uPixelScale.value = s;  // need typed access
```
Store the uniform references in the class: `uPixelScale: { value: number }` as a public field.

Let's write the class with a public `uniforms` object.

```ts
class ParticleSystem {
  readonly points: THREE.Points;
  readonly uniforms: { uPixelScale: { value: number }; uTex: { value: THREE.Texture } };
  ...
}
```
Then `smoke.uniforms.uPixelScale.value = s`.

Hmm, ShaderMaterial's uniforms are typed as `{ [uniform: string]: IUniform }`. Our own reference is separate; fine.

Now writing the shaders as template strings.

Let me write the full particle shader:

```glsl
// vertex
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uPixelScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = max(-mv.z, 1.0);
  gl_PointSize = clamp(aSize * uPixelScale / d, 1.0, 1500.0);
  gl_Position = projectionMatrix * mv;
}
```
```glsl
// fragment
uniform sampler2D uTex;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 t = texture2D(uTex, gl_PointCoord);
  float a = t.a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * t.rgb, a);
}
```
Hmm, `t.rgb` for a white texture is white. Good. For the fire texture we can use the same soft circle.

Note: with AdditiveBlending, alpha matters: gl_FragColor.rgb * srcAlpha added. Actually for additive blending, three uses blendSrc = SrcAlpha, blendDst = One. So the contribution is color*alpha. Fine.

For normal blending, color*alpha is composited.

OK.

Now write the actual file. I'll try to be thorough but not insane.

One more: the ocean "beach" and the pad area color in the terrain shader. Also roads.

Let's include a simple "road" in the terrain shader? Roads as boxes might z-fight with the terrain (curved). A road box 10 m wide, 1 m tall, 3 km long at y=0..0.5 sitting on the curved terrain would sink into the ground at 3 km (the sphere sags 0.7 m at 3 km). Hmm: at 3 km, the terrain is 0.7 m below y=0. A road at y=0.3 with 1 m height → its bottom at y=-0.2, top at 0.8 → at 3 km it floats 0.7+... it's fine if the road is thick enough: use a box of height 2 m with the top at y=1 and the bottom at -1. At 3 km, the ground is at -0.7, so the road sticks up 1.7 m there — a visible edge? From a distance, negligible.

Alternatively draw the roads in the shader as colored strips. That's elegant: in the terrain fragment shader, compute a road mask near the pad:
```glsl
float road = 0.0;
// vertical road at x = 300
road = max(road, 1.0 - smoothstep(4.0, 8.0, abs(p.x - 300.0 - 40.0*sin(p.y*0.001))));
// horizontal road
road = max(road, 1.0 - smoothstep(4.0, 8.0, abs(p.y - 500.0)));
```
Then mix the albedo toward asphalt gray. But the terrain mesh resolution is ~100 m near the pad, so a 10 m road will be interpolated per-fragment from the world position — it will render as a crisp line if the world position interpolation is accurate. Since the triangles are large (100 m) and planar, the interpolated world position is linearly interpolated in the plane — actually, for a planar triangle, the world position is exactly linear in screen space after perspective correction, so the per-fragment world position is exact on the plane. Yes! Since the sphere is approximated by flat triangles, the world position computed in the shader equals the true triangle's plane position, which matches the sphere to within ~1 cm over 100 m. So a road drawn in the shader is crisp. 

So draw the roads in the terrain shader. Also draw a couple of buildings? No, buildings as boxes.

Let's add in the shader:
```glsl
float roadX = 260.0 + 30.0*sin(p.y*0.002);
float r1 = 1.0 - smoothstep(5.0, 9.0, abs(p.x - roadX));
float r2 = 1.0 - smoothstep(5.0, 9.0, abs(p.y - 420.0 - 20.0*sin(p.x*0.001)));
float road = max(r1, r2);
albedo = mix(albedo, vec3(0.035), road * 0.9);
```
Roads only on land (they'd cross the ocean otherwise): multiply by (1-ocean).

Good.

Also the beach: at the coastline, sand.

Also, near the pad: a concrete/gravel area:
```glsl
float padArea = exp(-dot(p,p)/(2.0*260.0*260.0));
albedo = mix(albedo, vec3(0.18,0.17,0.15), padArea*0.7);
```
Hmm, near the pad we want sand/gravel (pale). 0.18 linear is a medium gray-brown; after tone mapping it's fairly dark. The real Cape pad surroundings are pale sand (linear ~0.35). Use vec3(0.30,0.27,0.20).

Fine.

Now, one more issue: the terrain shader uses vWorld computed from modelMatrix. The earth cap mesh is at the origin with no transform, so modelMatrix = identity. Fine.

The terrain normals: manual from the sphere. But the pad area is flat. Fine.

Let's now write it all.

Also the "low buildings": place a few boxes with simple materials. Let's add a hangar at (-400, 0, 700) size 80x30x50, and a few small buildings near the roads.

Also a water tower? Skip.

Let me finally write.

Additional detail: adding a slight camera shake at liftoff would enhance realism, but the smooth camera requirement... skip.

Let's handle `resetParticles()`: clear all particle lists and the trail ribbon.

Now, writing the code:

```ts
/* ================= Physics ================= */
...

/* ================= Renderer / Scene ================= */
...

/* ================= Sky ================= */
...

/* ================= Terrain ================= */
...

/* ================= Pad & structures ================= */
...

/* ================= Rocket ================= */
...

/* ================= Particles ================= */
...

/* ================= Camera / loop ================= */
```

I'll write it in a linear order, defining things before use where required (const/let are not hoisted, so order matters for consts; function declarations are hoisted).

Careful: `resetParticles` (function declaration) references particle system consts defined later — as long as it's only called after they're initialized, it's fine.

Let me write out everything now.

For the trail ribbon, I need the camera and trail.

Let me write the ribbon code:

```ts
const RIBBON_MAX = 4000;
const ribbonGeo = new THREE.BufferGeometry();
const ribbonPositions = new Float32Array(RIBBON_MAX * 2 * 3);
const ribbonAttr = new THREE.BufferAttribute(ribbonPositions, 3);
ribbonAttr.setUsage(THREE.DynamicDrawUsage);
ribbonGeo.setAttribute('position', ribbonAttr);
const ribbonIndices: number[] = [];
for (let i = 0; i < RIBBON_MAX - 1; i++) {
  const a = i * 2;
  ribbonIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
}
ribbonGeo.setIndex(ribbonIndices);
const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false });
const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
ribbon.frustumCulled = false;
ribbon.renderOrder = 2;
scene.add(ribbon);
```
Hmm, indices: a,(a+1),(a+2) and (a+1),(a+3),(a+2) — a quad with vertices 2i, 2i+1, 2i+2, 2i+3. Good.

Update:
```ts
function updateRibbon() {
  const pts = trail;
  const n = Math.min(pts.length, RIBBON_MAX);
  if (n < 2) { ribbonGeo.setDrawRange(0, 0); return; }
  const start = pts.length - n;
  const cam = camera.position;
  const tangent = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const p = pts[start + i];
    const pPrev = pts[Math.max(start + i - 1, start)];
    const pNext = pts[Math.min(start + i + 1, pts.length - 1)];
    tangent.set(pNext.x - pPrev.x, pNext.y - pPrev.y, pNext.z - pPrev.z);
    if (tangent.lengthSq() < 1e-6) tangent.set(0, 1, 0); else tangent.normalize();
    toCam.set(cam.x - p.x, cam.y - p.y, cam.z - p.z);
    if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1); else toCam.normalize();
    side.crossVectors(tangent, toCam).normalize();
    const w = 1.5 + Math.min(i * 0.01, 6);
    const o = i * 6;
    ribbonPositions[o] = p.x + side.x * w;
    ribbonPositions[o+1] = p.y + side.y * w;
    ribbonPositions[o+2] = p.z + side.z * w;
    ribbonPositions[o+3] = p.x - side.x * w;
    ribbonPositions[o+4] = p.y - side.y * w;
    ribbonPositions[o+5] = p.z - side.z * w;
  }
  ribbonAttr.needsUpdate = true;
  ribbonGeo.setDrawRange(0, (n - 1) * 6);
}
```
Note: `pNext` when i is the last: pts.length - 1, correct.

Wait: `pts[Math.max(start+i-1, start)]` — if start+i-1 < start, use the first. Good.

`side.crossVectors(tangent, toCam)` — if parallel, zero; normalize would give NaN. Add a check: if lengthSq < 1e-6, set side (1,0,0). Let's handle.

Also, the trail is only appended when step() is called, so during pause it's static — fine.

Performance: allocating 3 Vector3 per frame is fine.

Now the contrail spawn uses `lastContrail` position.

Let's write the render loop:

```ts
const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop(() => {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 1/30);
  elapsed += dt;
  if (!rocketApi.paused) {
    rocketApi.step(dt * currentSpeed());
  }
  updateScene(dt);
  composer.render();
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```
Careful: `__ready = true` after the first frame is rendered. The first call renders then sets. Good.

Also `clock.getDelta()` on the first call may be large (time since creation) — clamp.

`updateScene(dt)`:

```ts
function updateScene(dt: number) {
  const alt = flight.alt;
  // rocket transform
  rocketGroup.position.set(flight.x, PAD_TOP + alt, 0);
  rocketGroup.rotation.z = flight.pitch;
  // sky
  skyMesh.position.copy(camera.position);  // before camera update? update camera first
  ...
}
```
Order: update camera first, then the sky follows the camera. Let's do:

1. updateRocketVisual()
2. updateCamera()
3. skyMesh.position.copy(camera.position); uniforms.
4. terrain uniforms (uCamPos = camera.position).
5. particles.
6. ribbon.
7. fog.
8. hud.

Now, the camera's altitude for fog/haze should be the rocket's altitude (as specified for the sky) — actually the camera altitude is PAD_TOP+alt + ~22. Use flight.alt for everything.

Now, the HUD format:
```ts
const t = flight.t;
const mm = Math.floor(t/60), ss = Math.floor(t%60);
hud.innerHTML = `T+ ${mm}:${ss.toString().padStart(2,'0')} <br> ALT ${(alt/1000).toFixed(2)} km <br> VEL ${vel.toFixed(0)} m/s <br> SPEED ×${currentSpeed()}`;
```
Use innerHTML with <br> and CSS line-height.

OK, writing the final code now. I'll be careful with TS types.

One thing: `new THREE.Color(0.52, 0.66, 0.82)` for uniforms — but I want to pass a Color to a `vec3` uniform. Three handles Color as vec3. Fine.

For the ShaderMaterial uniform types, define as `{ [k: string]: THREE.IUniform }`.

Let's write.

Also `THREE.PMREMGenerator` — after creating the env texture, call `pmrem.dispose()`? That disposes the generator's internal resources but the returned texture remains. Actually `dispose()` disposes the render targets created by the generator? Looking at three's source, `PMREMGenerator.dispose()` disposes `_blurMaterial`, `_equirectMaterial`, and `_cubemapMaterial` — not the output target. Safe.

Let me now write the final answer.

A note on the terrain shader's `uSunColor` — pass `new THREE.Color(2.2, 2.0, 1.8)`? The direct sun illumination. With ACES tone mapping, if we output albedo*(sun*ndl + ambient), albedo 0.1 * sun 2.5 = 0.25 → tone-mapped ~0.3. Reasonable. Use uSunColor = (2.6, 2.4, 2.15) and uAmbient = (0.22, 0.30, 0.42) (sky ambient).

Hmm, the directional light for the PBR objects is intensity 3.0. The sun in the sky is very bright. Consistent enough.

Now the terrain haze: uHaze = (0.50, 0.63, 0.78) linear — that matches a pale blue sky horizon. But the sky shader's horizon = (0.62,0.73,0.85), brighter. Since the haze is what the distant terrain fades into, matching matters. Use (0.55,0.68,0.82).

OK writing now. Final code.

Regarding the ocean color: with the sun specular at a high angle, we get a glint. Good.

Let me also add a subtle atmosphere "limb glow" — not needed.

One more thought on the sky: at high altitude the stars appear, but the camera is looking mostly horizontally/downward at the rocket. The stars appear in the upper part. Fine.

Also at 100 km the sky is nearly black but the "horizon" has the blue glow band. Good.

Let me write the code.

```ts
// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
const G0 = 9.81;
const R_EARTH = 6371000;
const M0 = 550000;
const M_DRY = 220000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;
const PAD_TOP = 7;
const GRAVITY_H = (h: number) => G0 * Math.pow(R_EARTH / (R_EARTH + Math.max(h, 0)), 2);
```
A const arrow function is fine.

OK.

Another detail: the trail points should probably represent the rocket's world position — I use the base. Good.

Let me write out everything completely now, carefully.

I also need `resetParticles` to reset `lastContrail`.

Final check on the render order for transparency: the ribbon and particle meshes are transparent → rendered after opaque, sorted by z. Fine.

Writing the answer now.

Actually one more important thing: the rocket must be visible at the pad from the camera 150 m away. The pad camera at (95,3,110) → distance to the rocket base (0,7,0) = sqrt(9025+16+12100)=145 m. FOV 55°, so the rocket's 70 m height spans 2*atan(35/145)=27° — about half the frame height. Good.

Let's write.

Also: `rocketGroup.rotation.z = flight.pitch;` — but with rotation.z positive, the rocket tilts toward -x. The thrust direction in physics is (-sin p, cos p). Consistent. 

The plume attaches at the base and points down along the rocket's -y; when the rocket tilts, the plume tilts with it. Good.

Now the code for the flame direction for fire particles: the nozzle in world space = rocketGroup.localToWorld(new Vector3(0,-1.5,0)). The thrust direction (world) = (-sin p, cos p)*(-1) = (sin p, -cos p). So the fire particles move along (sin p, -cos p, 0) — mostly downward. Use velocity = thrustDir * speed.

Let's write.

Given the size, I'll write it as compactly as reasonable while keeping clarity.

One risk: `THREE.UniformsLib` not needed.

Another risk: TypeScript's `noUnusedLocals` — not part of strict, so unused variables are OK, but let's minimize them anyway.

Writing now for real.

Additional: the `state()` return type must match; the test may check `speed`. Fine.

Let me make sure `step(dt)` handles NaN/undefined gracefully: `if (!Number.isFinite(dt) || dt <= 0) { trail.push(...); return; }` — hmm, should we push when dt<=0? The spec: "trail: array of ... one per step() call". I'll push regardless.

But at reset, the trail is empty and the first step pushes a point at alt 0. Fine.

Final code writing.

For the concrete texture repeat: the pad meshes are 120 m; set repeat (8,8) → 15 m per tile. Fine.

Let me write the buildings quickly:

```ts
function addBuilding(x:number, z:number, w:number, d:number, h:number, col:number) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, metalness: 0.05 }));
  b.position.set(x, h/2, z);
  b.castShadow = true; b.receiveShadow = true;
  scene.add(b);
  // roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w*1.05, 0.6, d*1.05), new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.9 }));
  roof.position.set(x, h + 0.3, z);
  scene.add(roof);
}
```
Add ~6 buildings.

Vegetation:

```ts
const bushGeo = new THREE.IcosahedronGeometry(1, 1);
const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: false });
const COUNT = 2200;
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, COUNT);
bushes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT*3), 3);
```
Hmm, setting instanceColor requires `new THREE.InstancedBufferAttribute`. Alternatively use `bushes.setColorAt(i, color)` after creating; three creates the instanceColor attribute automatically on the first setColorAt. Yes: `setColorAt` lazily creates the attribute. Use that.

```ts
const dummy = new THREE.Object3D();
const col = new THREE.Color();
for (let i=0;i<COUNT;i++){
  ...find pos...
  dummy.position.set(x, 0, z);
  dummy.rotation.y = Math.random()*Math.PI*2;
  dummy.scale.set(1+Math.random()*2, 0.6+Math.random()*1.6, 1+Math.random()*2);
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
  col.setHSL(0.22 + Math.random()*0.08, 0.35 + Math.random()*0.3, 0.12 + Math.random()*0.14);
  bushes.setColorAt(i, col);
}
bushes.instanceMatrix.needsUpdate = true;
bushes.castShadow = true;  // maybe false for perf
bushes.receiveShadow = true;
```
Hmm, the y position: the bush's base should sit on the terrain. The terrain at radius r is y = -r²/(2R) (approximately). For r up to 1500 m, the drop is 0.18 m — negligible. Use y=0 with the bush center at 0.6*scale.

Actually IcosahedronGeometry(1) centered at the origin; place at y = 0.5*scaleY so it sits on the ground.

The vegetation color via instanceColor requires the material's color to be white (multiplied). Good.

Also, castShadow for 2200 instances of 20 triangles = 44k triangles in the shadow map — fine, but the shadow camera only covers 180 m, so most are culled? InstancedMesh isn't per-instance culled, so all 2200 are drawn in the shadow pass. Still fine.

OK. Writing the final answer now, for real. I'll produce the complete file.

Let me count the pieces and write them out.

Also for the launch mount ring: a TorusGeometry(3.6, 0.5, 8, 24) rotated -PI/2 about x, at y=5.

Legs: 4 beams from (±4, 1.5, ±4) to (±3.6, 5, ±3.6).

Hmm, the pad top is at 1.5, and the trench is between x=-8 and 8 through the whole pad along z. The mount legs at x=±4 are over the trench. Fine, they stand on the trench walls? Let's just place the legs at the pad top level y=1.5 going to the ring at y=5; visually okay.

Actually, the mount ring should be over the trench so the exhaust goes down. Yes, the ring at y=5 with radius 3.6, and the rocket's nozzles at y=7-1.5=5.5 — just above the ring. The plume goes down through the ring into the trench. 

The flame trench: the pad slabs are from x=-60..-8 and 8..60, y=0..1.5. The trench between x=-8..8 from y=1.5 down to -5, with a floor at y=-5 and walls at x=±8 (the inner faces of the slabs). The trench is open at z=±60 (the ends of the pad). Good.

Add a dark "deflector" wedge at the trench bottom center: a box rotated 45° to deflect the exhaust? Optional. Add a simple wedge: a box rotated about z... skip.

Now, the steam comes out at z=±60 (the trench exits) — matches the spawn.

OK writing.

For the pad's concrete material, use the canvas texture with repeat and color 0xffffff.

Final write.

I'll now produce the code. I need to double check GLSL syntax as I write (no TS errors, but GLSL errors would break rendering at runtime — be careful).

Also, `texture2D` in ShaderMaterial fragment: three's WebGL2 renderer converts GLSL1 to GLSL3? Three's ShaderMaterial uses GLSL1 by default and the WebGL2 renderer handles `texture2D` via a compatibility define. Yes, three prefixes `#define texture2D texture` for WebGL2. Good.

`gl_FragColor` is also handled (three defines `out highp vec4 pc_fragColor; #define gl_FragColor pc_fragColor`). Good.

Writing now.

One more: in the sky fragment, `atan(d.z, d.x)` — fine in GLSL1.

Let's go.

Regarding `scene.environment`: the PMREM texture from a small canvas; the reflections will be subtle. Good.

Final answer below.

Wait, one more detail on the "viewer speed default": "speed is the time scale. It is 1 for the liftoff (t < 10 s) and then 10, unless the viewer chose a speed". Our `currentSpeed()` checks viewerSpeed first. Good.

And `state().speed` returns that.

Now write.

Also, for the HUD, the requirement says "Show the speed and the mission data (T+ time, altitude in km, velocity)".

OK.

Let me write the code.

def final:

I'll write it now in full.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ===========================================================================
// Physics
// ===========================================================================
...
```

Let me be careful that OutputPass exists in the three version. OutputPass was added in r152. Should be fine for a modern setup. If not available, the build would fail... The task says use three/addons. OutputPass is standard now. Keep it.

Writing.

For the `updateScene`, I need to compute the flame flicker with elapsed.

All right, writing the final.