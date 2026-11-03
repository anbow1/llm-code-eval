We need answer with single code block, a complete TS file. Need implement complex scene. Need compile strict with zero errors. Need expose window.__rocket physics etc. Need renderer, camera, sky, rocket, pad, tower, particles, bloom. Need careful TypeScript typings, imports. Addons: three/addons/objects/Sky.js, and UnrealBloomPass, EffectComposer, RenderPass. Need no external assets. Need use canvas textures. Need physically based materials. Need likely use imports:
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
Maybe no OrbitControls needed. Need strict types for addon modules? In three, addons typings may or may not available. Since tsc --strict likely with TS types? Three package includes types? Three.js npm does not include addon types? Actually @types/three? In modern three, addons types maybe included? Could cause module declaration errors. To reduce risk, avoid addons except maybe implement own sky shader and bloom manually? But request says e.g. bloom UnrealBloomPass. We could implement custom bloom via EffectComposer? That has addon typings risk. But accepted likely environment has types. Need single file.

Need no external assets. Need write robust.

Main challenge: Physics exact semantics and rendering. Need simulate rocket with state, trail per step call, speed logic. Reset clears trail array same object. paused boolean. state returns t, alt, vel, acc net vertical acceleration, pitch, speed. Trail array world points one per step call. Need use step with fixed substeps max 0.02. Need compute pitch angle never decreases: pitch 0 <10s, grows to 0.5 at 150s, never decreases. Need burn 200s, mass linear m0 to dry mass. Thrust T=1.3*m0*g0 (714...? 550k*9.81*1.3=7,011,? Let's compute: 550k*9.81=5,395,500; *1.3=7,014,150 N). limited to 3*m*g0, zero after burn. As mass decreases, 3*m*g0 maybe above? At dry 220k, 3*220k*9.81=6,473,? At m=550k, 3*m*g0=16.18MN > 7MN, so no throttle initially. At m=220k, 3*m*g0=6.47MN < T, throttle at end. Need implement.

Gravity turn / pitch: define pitch(t): 0 if t<10; then maybe smooth ramp reaching 0.5 at 150. They say starts to grow (gravity turn), reaching about 0.5 rad at 150 s, never decreases. Use p = clamp((t-10)/(140))*0.5 perhaps smoothstep. After 150 p remains 0.5. Or could continue increase slowly? "reaching about 0.5 rad at 150 s, and it never decreases." Could hold 0.5. Fine.

Equations: vertical and horizontal acceleration from thrust component and gravity. We maintain altitude h, horizontal position x? Rocket in world maybe launches straight up then pitch tilts horizontal. We can use vertical speed vy, horizontal speed vx (east). vertical acceleration = (T/m)*cos(pitch) - g(h); horizontal acceleration = (T/m)*sin(pitch); maybe include drag? Not specified. Could include? Physics model simple. Use gravity. For trail points world x,y,z: launch pad origin (0, padHeight? Need world coordinates). Rocket world vertical y altitude maybe h. Set pad at y=0? Ground at y=0, rocket base at y= maybe 0? Need rocket body centered. We'll place rocket group with base at launch pad top. Use state.alt altitude above pad/ground. World rocket position y = alt + padHeight? Let's decide launch pad top y = maybe 3, terrain ground around maybe 1? For units 1m. Rocket ~70m tall. Set rocket base at y=3 maybe. But state alt is altitude. trail world points include x,y,z. render rocket root position x (horizontal offset), y = PAD_TOP + alt, z=0. Need pad.

For physics, keep horizontal distance dx maybe. Use state.alt=0 at pad. y speed.

Trail one per step() call: push current rocket world pos to trail. It says trail array of {x,y,z} world points of rocket, one per step() call. So each call step(dt) records one point after advancing? Could push at end. The trail array is used to draw contrail. We can also have visual particle contrail. Need when speed high and dt large, trail still one point per step call. Render loop calls step(delta*speed) once per frame -> trail points per frame. Good. Reset keep same array object, empty.

Window __rocket includes reset, step, state, trail, paused. Need speed logic: speed is time scale. 1 for t<10, then 10 unless viewer chose: keys 1,2,3 and buttons set x1,x10,x30. state().speed returns current. reset clears viewer choice. Need viewer choice variable chosenSpeed: number | null. On reset null. effective speed = chosenSpeed ?? (t<10 ? 1 : 10). What about if viewer chooses x1, speed=1 always. Keys 1 2 3 set chosen 1,10,30. Buttons three. Need small overlay showing speed and mission data. Buttons in DOM: page no HTML, create overlay div, buttons.

Need render loop: calls step(min(delta, 1/30)*speed) when not paused. But careful speed computed from t before step. step(dt) advances simulated time by dt; speed maybe state returned. In step, should compute speed maybe based on t before/after? "Playback speed is time scale. It is 1 for liftoff (t < 10 s) and then 10" state().speed current. In render loop use speed = rocket.state().speed before step. Fine.

Need paused property on __rocket. We can define object with paused property. The render loop checks. Need maybe toggle pause key space. Add UI.

Need physically based rendering: use WebGLRenderer with toneMapping = ACESFilmicToneMapping, outputColorSpace; shadowMap enabled; camera near far huge (0.1 to maybe 1e7). Need large world. Use logarithmicDepthBuffer? Camera near/far huge; set near 0.1 far 1e9 maybe; okay. For close to rocket and Earth horizon. Could use logarithmicDepthBuffer true? Might complicate. Set near 0.5 far 1e7. At 100km, ground far? Need far 1e7 (10,000 km) enough. Camera moves with rocket. Ground at origin distance 100km okay. Earth curve maybe visible. Need sky driven altitude. Could create large skydome with custom shader; or Sky addon. But Sky addon sun position etc and atmospheric scattering; changing colors from altitude? Could use custom shader for sky easier and altitude-dependent. But realism: atmospheric scattering in sky. Could implement custom sky dome shader with gradient, sun, haze, stars. Need stars above 70 km. Could use points. Need Earth curve? Could create ground plane large (Florida coast, ocean). Horizon appears due to haze/plane size and fog. At high altitude, maybe far below. Need no actual earth sphere? Could add huge sphere ground? "curve of Earth" could be seen near rocket maybe not essential but desired. We can create ground plane of size 200km with green/ocean and low buildings. At 100km, ground could be small? But camera near rocket. To see coast and curve, a large sphere segment maybe. But complexity. Could create a ground disc/plane and ocean plane, and haze. The camera at altitude 100km near rocket, looking down maybe? It travels with it. Need ground horizon. Use large plane of maybe 200,000 x 200,000, with fog. At high altitude, plane visible. But flat plane doesn't curve. Could add a very large sphere below? Actually a sphere of Earth radius centered at y=-R (6,371,000) as ground? World scale huge and rocket altitude h relative. If sphere radius R and camera near rocket at h, the ground will curve. But terrain details on sphere? We can render a flat local terrain for the pad and ocean plane maybe. Simpler: use a giant sphere with radius R centered at (0,-R,0), color green/ocean, plus local terrain. But with rocket at 100km, sphere surface at altitude; large scene. It may help curve. But materials and procedural textures. Could create earth sphere with shader texture of land/ocean? More complexity. Need realistic photograph. Maybe can use a local ground plane plus large ocean; camera at altitude, horizon curves due to far plane? Not really.

Maybe implement earth dome with custom shader using procedural noise for land/ocean? At local horizon it could conflict. Let's think. Scene origin at pad, y=0. For camera low, ground plane 100 km with materials. For high altitude, earth sphere might be below. Can create a sphere centered at (0, -R, 0), radius R, with maybe MeshStandardMaterial green/blue gradient via canvas texture? The local pad is on sphere top; sphere surface y=0 at origin. Since radius huge, locally flat. If we overlay local terrain plane (maybe 40km) at y=0, it covers. The sphere will show Earth's curvature from altitude. Need orient. A sphere with radius 6,371,000 centered y=-6,371,000. The visible surface at y=0 at origin. At high altitude camera y=100,000, sphere below. It will show curve. The sphere surface can have land/ocean colors procedural? For realistic, could use a huge sphere with material with canvas texture mapping using equirectangular coordinates. But mapping at local area? We can create 8192x4096 canvas maybe too heavy. Use shader material with noise for ocean/land? But physically based? Could use MeshStandardMaterial with vertex colors? Need not too complex. Could just have earth sphere with ocean blue and land green patches via canvas texture. But camera at close low y, sphere top near flat; local terrain overrides. At high, sphere shows Earth. Also fog maybe.

But local terrain plane 100,000 x 100,000 at y=0; Earth sphere radius huge. Overlap z-fighting at y=0? Fine if local plane at y=0.0, sphere just below? Actually sphere top at y=0. Local plane y=0.1. At far distances beyond plane, sphere visible. Good. Need ocean on horizon behind pad. Local terrain has land and ocean? "Florida coast. Flat land with green scrub vegetation, Atlantic Ocean on horizon behind pad." We can make local plane with land east? Need orientation: camera low near pad looking up at rocket, maybe background coast. Put ocean to east (x positive? z negative?). Maybe make a large ocean plane from z < -? We can create ground as separate: land plane and ocean plane. But earth sphere can be ocean colored; local ground textured green. Add distant ocean plane starting at z=-1200 to horizon. Camera maybe at (60, 8, 90) looking at rocket origin. Background? Rocket at x=0,z=0. Ocean to south/east? Let's set ocean along z = -2500 onward (north?). Camera positioned at z=120, looking toward origin; ocean behind pad at z=-2000, visible horizon. Land with green scrub around pad extends to z=-1800; ocean plane beyond. But plane with green texture can cover entire local 50km, hiding ocean. Could make land plane small 2000x2000 centered origin, then ocean huge plane from z=-2000 to -300000? Use large ocean plane 300km x 300km at y=-0.2 for horizon. But a huge ocean plane flat; at altitude can see. Earth sphere maybe ocean blue. Fine.

Need procedural textures: concrete pad, ground vegetation. Use canvas textures. Need canvas helper. Canvas 512. Ground: base green, speckles, roads? Could paint land texture. Concrete: grey noise, cracks. Rocket markings: canvas texture 1024x2048 maybe white with flag and lettering. Need apply to rocket cylinder wrapped. Create cylinder geometry and texture. But body has white with visible interstage and darker band; canvas texture can include. Apply map to cylinder side, maybe separate bands with material. Since texture repeats? Cylinder UV wraps map around. Need texture with vertical stripes? Markings: flag and lettering drawn on texture repeated around circum? Might be okay. Use CanvasTexture with white background, gray band, black lettering "FALCON 9", small US flag near top/mid. Cylinder UV: u wraps around, v along height. Draw vertical. Maybe use texture with white background, text horizontal at some v? On cylinder, text wraps around circumference; can be visible. Fine.

Rocket structure:
- Group rocket at base. Height 70 m, diameter 3.7 m.
- Body cylinder radius 1.85, height maybe 58 m? total height 70. Stage 1 + interstage + stage 2 + fairing.
Falcon 9: height 70, diameter 3.7. Body:
  - first stage cylinder height 42, radius 1.85, y= 21
  - interstage darker? height 8, y= 46
  - second stage height 12, y= 52? plus fairing nose cone height 8? Need total 70. Let's model 70 tall. Use:
base engine section from y=0..4.5 (radius maybe 2.0 dark); body stage1 y=4.5..45; interstage y=45..50 (darker band); stage2 y=50..62; fairing/nose cone y=62..70 (cone). Nose fairing maybe cylinder 4m plus cone 4m. Total.
- Engine section with nozzles: group below base; 9 nozzles? Falcon 9 has 9 Merlin engines. Create small cones/cylinders arranged around, black metal. Need nozzle visible. 9 nozzles: 8 around at radius 1.1, one center. Height 3.5, pointing down. Cone with radius maybe 0.5, height 2.5. Use MeshStandardMaterial metallic dark.
- Add thin details: stringers, logo, flag, interstage darker, gray band, maybe small grid fins at top. Add lattice tower adjacent.

Launch pad:
- Ground local terrain plane size maybe 5000x5000, material with canvas texture repeat. But need green scrub. Could use PlaneGeometry(4000,4000,128,128) with slight height? We can texture. Flat. At y=0. Maybe ocean huge plane at y=-0.5, size 600000.
- Pad concrete: maybe a large rectangular slab 80x100x3 at y=1.5. Flame trench: a rectangular cut? Could make darker recess with two concrete berms. Use boxes around. Add flame trench opening under rocket: box trench black, maybe a channel along x? Build: concrete pad slab 80x100, y=1.5; cut? Can't cut easily but add dark recess along x at z=0 with width 12, depth? Maybe place black trench floor at y=0.1 and concrete walls sides. Rocket sits at one end? Actually vertical rocket above flame trench? Could make pad with trench running east-west under rocket. Use a dark rectangle (box) at y=1.25, 14 x 80. concrete side walls. Add launch pedestal. A launch mount under rocket.
- Launch tower: lattice tower next to rocket. Need lattice structure. Build from thin cylinders/boxes. Tower maybe 75 m tall at x=7, z=0. Use vertical beams and cross-beams. Could make many BoxGeometry thin. Use material silver. Build function addLatticeTower.
- Lightning masts: tall lattice masts around pad, ~100 m tall, maybe three. Use same lattice function slender.
- Roads and low buildings around. Create road strips using planes/boxes, low boxes buildings. Surround local.

Sky/atmosphere:
- Use custom sky dome (SphereGeometry radius maybe 5,000,000? But camera can move; make skydome follow camera? Or shader with vertex position. Use large sphere centered on camera, backside. But altitude changes. Could create sphere radius 10,000,000 centered at origin? Camera at 100km, still inside. But horizon depends. Better set sky dome position to camera each frame? Then altitude gradient based on rocket altitude. But if sky sphere follows camera, stars always around. Good. Use ShaderMaterial side BackSide, depthWrite false, transparent? Draw gradient based on normalized direction y. Uniforms: topColor, horizonColor, sunDirection, altitude, starVisibility. Add sun disc. Need stars: Create Points with many random positions on a huge sphere around origin/camera? Could use stars group position follow camera? If stars are static at huge radius maybe okay. Use PointsMaterial? For stars clearly visible above 100km, need them visible. Maybe use custom shader with random star field based on direction and time. Easier: build star points in a shell radius 9000000 around origin, but camera moves 100km, negligible? At high altitude, stars points visible. But if placed on huge sphere centered world origin, when camera moves, still okay. But sky dome should occlude stars? We can put stars as Points and render before sky? Need draw sky behind stars? If sky is opaque, stars won't show unless we adjust opacity and render order. Could create stars in sky shader itself. Or use points with additive blending and make sky transparent? Another approach: sky shader computes stars based on view direction and altitude uniform, with twinkle. Easier, all in one. Need star pattern. Implement hash/noise in GLSL. For each fragment compute direction from camera? Since sky sphere centered at camera and geometry positions; use varyings world position. Star field based on direction. We can use 3D hash to place stars. Use multiple cells and random. But robust. Could use shader:
```
float hash31(vec3 p) ...
float stars(vec3 dir) {
  vec3 p = dir * 300.0;
  ...
}
```
Maybe use a cube mapping. Star field: for each direction, generate star by grid on sphere maybe. Could use noise to produce sparse points. Simpler: create points for stars and place them in a group that follows camera (position = camera.position). Use Points, PointsMaterial with size attenuation false, opacity controlled by altitude. Render order? Add stars group to scene, render with depthTest true; sky dome with depthWrite false and renderOrder -1? If sky drawn first, stars drawn after, they show. Set sky mesh renderOrder = -10, stars renderOrder = 10? But stars behind? With depthTest false for sky. Stars at radius 2e6, depth? Camera far 1e7. Set stars positions on sphere radius 5e6 around origin; if group follows camera at (camera.x, camera.y, camera.z), stars local sphere. Use Points with vertex colors/white, size 2 maybe. At low altitude opacity 0, at 70km partial, at 100km 1. Stars group follows camera. Set renderOrder 5; material depthWrite false, transparent true, opacity uniform. But sky mesh drawn with depthWrite false, renderOrder -1; stars after, visible. Good. Need no external.

Sky shader colors: altitude affects; at ground horizon pale blue / sky blue, at 100km black. We can set uniforms uAltitude. Compute h = clamp(altitude/100000,0,1). Base sky top color mix from blue (0.12,0.3,0.65) to black. Horizon color from pale blue to dark blue/black. Sun. Add haze near horizon. Use ACES? ShaderMaterial not toneMapped? Need set toneMapped false maybe. Use output in linear? The renderer tone maps only materials? For custom shader, include toneMapping? We can set material.toneMapped = false and use colors as output? Actually renderer applies tonemapping to shader if `material.toneMapped`? Need include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` in shader. But use raw RGB maybe. Let's use ShaderMaterial with toneMapped false, depthWrite false, side BackSide. Output linear? It may appear okay. Need not overcomplicate.

Alternatively use Sky addon for atmospheric scattering and stars? But high altitude black with stars difficult. Custom easier.

Fog/haze: use scene.fog = FogExp2 pale blue, density maybe 0.00008? At distance 1000 haze. For high altitude, fog color maybe blue/black? Could adjust fog based altitude? We can set fog density lower or color. Need aerial perspective distant things paler and bluer. FogExp2 with density maybe 0.00015 and color pale blue. At high altitude, fog color dark blue? We can update scene.fog.color based altitude. But camera near rocket, ground far. Need distant ground pale. Okay. Use fog = new THREE.FogExp2(0xb3cbe4, 0.00012). For high altitude maybe density 0.00003? Actually fog applies with distance; at 100 km, ground far ~100km, fog would dominate. Update density according altitude? Hmm.

Lighting: sun directional light with shadow. Hemisphere/ambient. Sun direction maybe (1,1,0.3). Sun light intensity 3, position. Need shadow camera near rocket / pad: directional light shadow map 2048, camera size maybe 100. But at high altitude, rocket not shadowed near ground? Could set shadow camera to follow rocket? Not necessary. Use a large shadow camera around pad initially; after launch rocket not shadowed on ground. Rocket shadows on itself. Directional light shadow camera centered at origin size 500. Since rocket rises, its shadow on ground not important. Could update light target to rocket? But then pad shadows? For realism. Use directional light with shadow camera 300 box at pad; no shadows above. Fine. Add ambient light.

Plume:
Need blinding white-yellow core at nozzles fading orange, Mach diamonds, flickering light, large billowing steam/smoke clouds from trench. Build from particles/sprites. No external textures? We can generate smoke particle texture using canvas. Create radial gradient canvas 128. Create Points or InstancedMesh planes. Many soft particles. For smoke, perhaps use Points with PointsMaterial using texture (canvas), transparent, depthWrite false, blending Normal/Additive? White steam needs normal blending. Use points for smoke clouds: array of particle positions, velocities, ages. At liftoff, spawn lots near trench and pad sides; expand and rise. But for performance, use Points with custom shader or PointsMaterial with texture. Need varying sizes? PointsMaterial size fixed per material, not per particle; could use ShaderMaterial with per-particle size attribute. Or use multiple smoke sprites? 800 smoke particles, Points with size maybe 12, sizeAttenuation. But varying sizes could use shader.

Create smoke texture (radial gradient from white to transparent). Use Points material: map, transparent, depthWrite false, blending Normal, size 18, opacity 0.7, vertexColors? Need particle colors white/gray. Use BufferGeometry with positions and colors maybe. PointsMaterial vertexColors true. It doesn't support per-point size. We could have two Points sets: big clouds and small. Or custom ShaderMaterial with attributes size, alpha and texture. Use gl_PointCoord. But need fog? We can implement simple. TypeScript.

Maybe use `THREE.Points` with ShaderMaterial uniforms pointTexture, and attributes size, color, alpha. Vertex shader:
```
attribute float size; attribute float alpha; varying float vAlpha; varying vec3 vColor; attribute vec3 color? built-in color if vertexColors? 
gl_PointSize = size * (300.0 / -mvPosition.z); // scale
```
Need world sizes. For smoke at 10m radius, point size in pixels based on distance. Use `gl_PointSize = size * (projectedScale / -mvPosition.z)` with uniform uPixelRatio. Choose smoke particle size 8-30 m. At camera near, huge. Use gl_PointSize maybe size * (renderer height / -mvPosition.z). Set uniform uPixelScale. Use: `gl_PointSize = size * (uHeight / max(-mvPosition.z, 0.1));` hmm. For perspective, size world units projected: pixelSize = size * (0.5 * viewportHeight / tan(fov/2)) / distance. Use uniform uProjectionScale = viewportHeight / (2*tan(fov/2)). Then gl_PointSize = size * uProjectionScale / -mvPosition.z. This gives world-size points. Clamp maybe 1..1000. Fine.

Fragment: sample texture alpha, multiply by vAlpha, color. Need soft. Use transparent, depthWrite false, blending Normal for smoke, and Additive for flame separate.

Flame plume: build dynamic group with multiple meshes? Need core white-yellow at nozzles fading orange, Mach diamonds, flicker light. At liftoff, plume from nozzles downward. As altitude grows, plume longer/wider. Build a flame group with cone/cylinder meshes and particle jets. Could use shader-based cone with additive blending and noise. Simpler: create flame cylinder (cone) beneath rocket, length dynamic, radius dynamic, with custom shader gradient, additive; plus Mach diamond rings (small bright emissive spheres) along; plus point/sprites for flicker. Flickering PointLight at nozzle, intensity updated. Need plume grows longer/wider with altitude (air thinning). At ground length maybe 15m, radius 3; at altitude length maybe 80m, radius 8. The launch vehicle is moving. In rocket group, flame points downward from engine base. Use mesh cone/cylinder with material additive, color gradient. Could create a group attached to rocket. But plume in rocket local coordinate, pointing down. We need at liftoff nozzle bottom at y=0? Rocket group at pad base; engine nozzles below maybe y=-? Let's define rocket group position at pad base y=0? We place bodies above. Nozzles extend below base maybe 0? Need if rocket base at y=0, nozzles below ground. Better set rocket group base at pad top y=3, and nozzle bottom at y= -2? Hmm. Let's define rocket local y=0 at engine bottom, body starts y=0.7. Rocket total 70 from y=0 to 70. Then group position y=PAD_TOP. Engine nozzles local y=0..4? Actually nozzle extends down from body; can set nozzle bottom at y=0, engine section y=0..4.5. Rocket base at y=0. Group at ground pad top + alt. Plume extends below local y=0 downward. At liftoff group at y=padTop (maybe 2.5). Plume extends below ground maybe? It can visually go into trench; okay but should not go below pad? We'll set plume length initially 12 upward? Wait plume is exhaust below rocket; at liftoff rocket base at pad top, plume extends into flame trench/ground below. That's fine; plume below pad maybe hidden? We need billowing smoke around pad. The nozzle bottom at pad top maybe. Flame extends down through trench; pad hides some but smoke shows. If rocket is on pad, there should be launch mount.

Maybe set rocket base at y=4 (pad top) and nozzles bottom y=0. Flame extends downward to y=-12, but pad is at y=3, so hidden? No the flame would be under pad? At liftoff after a few seconds, rocket is above pad, plume visible. We can place pad top at y=2.5 and rocket group base at y=padTop + alt. Flame extends down. At t=0, flame goes below pad, but pad is at ground; we can still see around. Fine.

Need smoke clouds spawn when t< maybe 20s, along trench and ground. Build smoke system with particles stored. Could spawn continuously using delta simulated time. Need positions world. For liftoff smoke, huge billowing white clouds out of trench along ground and rising. Use particle pool 1000. In render loop, update smoke based on real delta and rocket state? It should be physically based simulation? Smoke visual can use real time? The scene time should maybe use simulated time for plume/cloud expansion? Since playback speed high, smoke will animate quickly. Use simulated dt for smoke? Should look okay. We can use total simulated time / speed? Realism. For liftoff, t<10 speed 1, so smoke real. After, speed 10; smoke may update fast. We can use real delta for visual smoke so it doesn't blow too fast? The rocket is gone after 10s; smoke cloud should remain and rise. Use visual real time update, but spawn based on simulated t. It's okay. Render loop step uses speed; visual updates use delta clamped. Keep smoke visible and drifting.

Need chase camera smooth. Initially low near pad looking up at liftoff. Once rocket clears tower (alt maybe > tower height 80? Wait tower 75, rocket 70, clear tower at alt > ~80?), viewer travels with it. Use camera mode:
- At rocket.alt < threshold (say 80m), camera stays at low position e.g. (60, 10, 90) looking at rocket current position (base y+35). Need look up.
- After rocket clears tower, chase: camera position = rocket position + offset trailing behind/side, maybe rotated; smooth using lerp. Camera offset relative to rocket, maybe (-80,-30?)? Need within about 100m, close. Use offset maybe (40, 20, 80) from rocket? Camera near rocket. But rocket travels horizontally too; need orientation. Could set offset derived from rocket world pos + fixed vector with scale? "close to the rocket (within about 100 m, like a chase plane), so rocket, plume and view of coast, Earth curve and then space seen from near rocket all the way up." For rocket altitude 100km, camera y=rocket.y+? but need see rocket and plume maybe from side. Use camera = rocketPos + (60, 20, 80) maybe distance ~95m. Look at rocket center. This offset can rotate? If rocket is pitched horizontal, plume behind; camera side. At high altitude, looking at rocket, background includes Earth and space. But offset fixed in world, should follow. Smooth lerp. Need camera orientation lookAt rocket center plus maybe nose. Maybe camera y = rocket.y + 10? But rocket y=alt; look at rocket center y+35. Offset maybe (70, 30, 100) length ~136 >100. Need within 100. Use (40, 10, 70) length ~82. Camera close. During ascent, rocket rotates? Our rocket group orientation pitch? We can rotate rocket around z by pitch? Pitch is angle from vertical; vertical and horizontal. Need tilt rocket maybe. At liftoff pitch 0. Rocket rotates slowly to 0.5 rad after 150s. Use rocketGroup.rotation.z = -pitch? But camera chase. Trail points maybe at rocket base? We'll rotate rocket group around z? Need rocket local y axis tilts. If pitch = angle of thrust from vertical, rocket orientation should align with thrust (or gravity turn). Use group.rotation.z = -pitch maybe; but position x = horizontal displacement. However physics horizontal acceleration accumulates, rocket moves horizontally. Need rotate group around z so nose points along thrust direction: vertical component plus horizontal. If pitch angle from vertical measured toward +x? Define pitch positive x. Then rocket local up vector = (sin(pitch), cos(pitch), 0). A group rotated about z by -pitch? Local +Y rotated by z angle? rotation z = -pitch rotates +Y to (sin p, cos p)? Let's verify: Rotation z by θ maps (0,1) -> (-sin θ, cos θ), so θ=-p gives (sin p, cos p). Good. Use rotation.z=-pitch. But plume local down along -Y; if group rotated, plume goes down along -(sin p, cos p). Good. The rocket moves +x in world. Trail world pos should maybe base? use rocket group position. Good.

But physics vertical altitude h and horizontal x only (no z). World x = xPos, y = padTop + alt, z=0. Rocket position. Need alt cannot below pad: h>=0, vy>=? At t=0, on pad; vertical acceleration maybe T/m - g >0, so it lifts. Ensure after integration h>=0; if h<0 set h=0 and vy=0? "cannot go below pad." Yes.

Need step substeps max 0.02. For dt any. If paused? step doesn't check paused? The render loop checks paused. __rocket.paused is a property. step(dt) should still advance even paused? Probably yes if called directly. The render loop doesn't call if paused. Good.

Need `state().acc` net vertical acceleration (m/s^2). Use current vertical acceleration. `vel` maybe vertical velocity? They specify state: { t, alt (m), vel (m/s), acc (net vertical acceleration), pitch, speed }. "vel" likely vertical velocity. Use vertical. Could also return? Keep. `speed` current time scale. Could include horizontal? Not required. trail uses world points.

Mass within burn: m = m0 + (dry-m0) * (t/200) for t<=200; after burn dry. But if t>200, dry. Thrust after burn zero. Need thrust limited to 3*m*g0. At t<200, thrust = min(T0, 3*m*g0). At beginning m=550k, 3mg huge. At t=200 m=220k, maybe thrust limited. At t=200 burn ends. Fine. Maybe thrust should continue after burn? "limited to 3*m*g0 (throttle) and zero after the burn." yes.
Need g(h). altitude h in meters. pitch. vertical acceleration = (T/m)*cos(pitch) - g(h). horizontal = (T/m)*sin(pitch) (maybe no gravity horizontal? Earth's gravity radial; horizontal component due to curve negligible). The rocket cannot go below pad. Integrate: vy += a_y*dt; xv += a_x*dt; h += vy*dt; x += xv*dt. Use substeps. Need if h<0 set h=0 and vy=0; maybe if h>R? fine.
Need update t.

Pitch function: `if (t < 10) 0; else p = Math.min((t - 10) / (150 - 10) * 0.5, 0.5);` Maybe smoothstep to be smooth. Use smoothstep(x) = x*x*(3-2x) -> p=0.5*s. Never decreases. At t=10 zero; at 150 0.5. Good. After 200, maybe keep 0.5. Use if t<=10 0 else if t<150 smoothstep *0.5 else 0.5. Note at t=10 exactly 0. Fine.

Need speed logic:
```
let viewerSpeed: number|null = null;
const rocket = {
 paused:false,
 reset(){ t=0; alt=0;vy=0;x=0;vx=0; trail.length=0; viewerSpeed=null; ... },
 step(dt){ ... },
 state(){ ... speed: viewerSpeed ?? (t < 10 ? 1 : 10) ...}
 trail: trailArray
}
```
Need reset same trail array object: trail.length=0. Good. reset clears viewer choice. Maybe also reset buttons? Not necessary. But viewer's choice variable. Add UI buttons update chosen. Speed auto in state. Need if reset clears viewer choice, speed 1/10. Good. But buttons? Could highlight maybe. Fine.

Need window.__rocket type. Casting.

Renderer:
```
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; type PCFSoft...
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```
Need style body margin 0, overflow hidden.

Scene, camera PerspectiveCamera(50, aspect, 0.5, 1e7?) Actually view space. Set near 0.5 far 1e7. But sky dome radius maybe 9,000,000 < far. Camera at altitude 100 km, stars at radius 2e6, okay. But at low, sky dome radius 1e6? Need far 1e7. Set near 0.1? With logarithmic? Use near 0.5. For chase camera 80m, good.

Set scene.fog = new THREE.FogExp2(0xaac3dd, 0.00006). At high update maybe color/density. Fog affects all materials. Sky ShaderMaterial fog false. Need fog for distant low stuff.

Lighting:
```
const sun = new THREE.DirectionalLight(0xfff3e0, 4.0);
sun.position.set(2000, 3000, 1000);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
const d=300; sun.shadow.camera.left=-d...
sun.target.position.set(0,20,0);
scene.add(sun.target);
```
Need hemisphere light or ambient: `new THREE.HemisphereLight(0xbad7ff, 0x2b2f1e, 1.2)` plus ambient 0.2. With PBR physical? Use standard materials. Need if tone mapping, intensity maybe 2.5. Add sun light.

Sky:
Create large sphere (radius perhaps 4,000,000) centered? If mesh position follows camera, then camera near rocket at 100km, okay. Use SphereGeometry(5000000, 32, 16), material shader side BackSide, depthWrite false, fog false, toneMapped false, renderOrder -100. Add to scene. Each frame `sky.position.copy(camera.position)`. But if sky centered at camera, sun direction should be relative. Stars points group follows camera. Fine. But sky sphere at radius 5e6, camera far 1e7, okay. Its vertex positions relative, use direction. Shader:
```
uniform vec3 uSunDirection; uniform float uAltitude; uniform vec3 uHorizonColor, uZenithColor; uniform float uStarOpacity;
varying vec3 vWorldDirection;
void main() {
 vec4 mv = modelViewMatrix * vec4(position,1.0);
 vWorldDirection = normalize(worldMatrix * vec4(position,1.0) - cameraPosition); // no, camera position same as sphere center? simpler normalize(position)
 gl_Position = projectionMatrix * mv;
}
```
Since sphere centered at camera, direction = normalize(position). Use `vDir = normalize(position);` but object may be translated? Vertex position local at sphere center; good. If sphere follows camera, local position direction. In fragment, use vDir. Need interpolate normalized direction. Use `varying vec3 vDir;` assign normalize(position). But with BackSide and camera inside, okay.

Fragment:
```
float h = clamp(uAltitude / 100000.0,0.0,1.0);
vec3 zenith = mix(vec3(0.08,0.18,0.45), vec3(0.0,0.0,0.02), smoothstep(0.0,1.0,h)); // ground blue to black
vec3 horizon = mix(vec3(0.62,0.78,0.9), vec3(0.02,0.03,0.06), h); // pale haze -> dark
float x = max(vDir.y, 0.0);
vec3 skyCol = mix(horizon, zenith, pow(clamp(vDir.y,0.0,1.0), 0.55)); // y direction. Below horizon maybe fog/ground? 
float sun = max(dot(normalize(vDir), normalize(uSunDirection)), 0.0);
float sunDisc = smoothstep(0.9995,0.9999,sun); // add glow
skyCol += vec3(1.0,0.95,0.8)* (pow(sun, 1000.0)*...) maybe.
```
Need stars. Generate using hash. `float star = ...` based on direction. Could implement in fragment using `hash` and cell. Use multiple layers? Let's craft:
```
float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y);}
float starField(vec3 dir){
  // map to 2d angular coords maybe
  vec2 uv = vec2(atan(dir.z,dir.x), asin(clamp(dir.y,-1.,1.))); // ranges
  ...
}
```
Simplicity: Use a 3D noise cell:
```
float stars(vec3 dir) {
 vec3 p = dir * 500.0;
 vec3 id = floor(p);
 vec3 g = fract(p);
 float h = hash31(id);
 float star = smoothstep(0.06, 0.0, length(g - vec3(0.5))); // only if center random? 
 return star * step(0.98,h)? 
}
```
But each cell 0.06? This creates grid stars maybe. Need sparse. Use random star in cell via offset. Could use sphere mapping with hash31 and small point:
```
float hash31(vec3 p){ p = fract(p*0.3183099+vec3(0.1)); p*=17.; return fract(p.x*p.y*p.z);}
float starDensity(vec3 dir) {
  vec3 p = dir * 300.0;
  vec3 id = floor(p);
  vec3 f = fract(p);
  float h = hash31(id);
  if(h > 0.985) { vec3 center = vec3(0.5)+ (vec3(hash31(id+1.0),hash31(id+2.0),hash31(id+3.0))-0.5)*0.4; float d=length(f-center); return smoothstep(0.06,0.0,d)*(h-0.985)/0.015; }
  return 0.0;
}
```
But fragment loops? A hash per fragment maybe okay. Could use star layer with 2 scales. Better to use Points stars. Simpler and reliable. Create stars as points on sphere radius 5e6 around camera, group follows camera. Generate 4000 random points, maybe with random sizes. Use PointsMaterial with color white, size 1.4, sizeAttenuation false? If sizeAttenuation false, size pixels constant. transparent, opacity uniform? PointsMaterial has opacity. Update opacity based altitude. Render order? Use group added. Mesh sky depthWrite false, depthTest true? If sky renders after stars? Need set sky renderOrder -10, stars renderOrder 0? Default. But sky is transparent? ShaderMaterial may not be transparent, depthWrite false; it writes no depth. Stars at radius 5e6 will render; depth test against no sky depth. Since sky mesh no depthWrite, stars visible. But sky color will overwrite stars if drawn after? Render order -10 ensures sky first, stars after, but sky no depth. Stars drawn after and blend over. Good. Need stars behind Earth? At high altitude, Earth may occlude stars? Points have depthTest true, depth against Earth sphere. Fine.

Stars group follows camera. Points local positions on sphere radius 2,000,000. If group position camera, stars appear around. But if camera moves, all stars move with camera (parallax none) okay. Use 3000 points. Need opacity `stars.material.opacity = THREE.MathUtils.smoothstep(alt, 70000, 100000)` maybe 0 at 70k, 1 at 100k. They say stars appear above about 70 km and clearly visible above 100 km. Set reveal = smoothstep(70000,100000). Maybe also visible slightly. Points size 1.2. Use `sizeAttenuation = false` for point size in pixels. Use `transparent = true`, depthWrite = false, blending Additive? Additive white. Fine. Need star colors white-blue.

Earth sphere:
Need maybe. Let's implement a large `SphereGeometry(6370000, 64, 32)` centered at (0,-6370000,0), material MeshStandardMaterial with map from procedural canvas? But sphere top at y=0. Local terrain at y=0.2. At high altitude, earth visible. Need procedural texture of Earth with land/ocean. Create canvas 4096x2048 maybe heavy. Use 2048x1024. Draw ocean blue base, continents green/brown via noise, clouds? Not necessary. Map equirectangular: x=longitude, y=latitude. But local Florida area at sphere top perhaps. Need realistic coast? Could simply use a noise-based land/ocean pattern. But local terrain covers near pad. At altitude 100km, Earth below mostly ocean/land maybe. Could use a large sphere with material color blue and green patches to show curve. Add atmosphere halo? Could be okay. But creating texture with random continents may look unrealistic. Maybe use a sphere with gradient ocean blue and local terrain covers. The coast/horizon visible from low camera thanks local ocean plane. At high altitude, you see horizon and curve from earth sphere; color ocean blue with green land maybe. Good enough.

Need local terrain: a plane 6000x6000 with canvas texture. But sphere top surface at y=0. At 6km, sphere curvature drop ~3m? negligible. Use plane y=0.1. Ocean plane huge 300000x300000 at y=-0.2? But if flat, at high altitude horizon maybe; Earth sphere below could be visible. Use local terrain 8000x8000 at y=0.2; ocean plane 300000 x 300000 at y=0.0 with ocean material. But plane extends under terrain; terrain hides around. Horizon behind pad. Need green land around pad, ocean beyond. Could place ocean plane at y=0, local terrain covers near pad. At 100 km, local terrain is tiny, Earth sphere visible. Maybe we can make ocean plane 200km and local land 5km. At high altitude, flat ocean plane at y=0 extends 200km; it won't curve but okay. Earth sphere also. Could potentially hide earth sphere due ocean plane. Fine.

Need terrain procedural texture with green scrub: create canvas 1024x1024 using noise and patches. Use a noise function maybe simple random circles. Map repeat 30x30? We'll create texture repeating. For plane 6000x6000, repeat maybe 20. Need roads and low buildings around. Use boxes.

Ocean: MeshStandardMaterial color blue, roughness 0.15, metalness 0.0? For water, use physical? Could add a procedural normal? No external. Use MeshStandardMaterial with color 0x2f5f8a, roughness 0.2. Maybe plane is huge, not reflective. Add slight noise texture? Create water canvas gradient/noise. But maybe fine.

Need aerial perspective: fog + haze. Distant objects paler blue.

Pad details:
- Create concrete pad with BoxGeometry maybe 100x3x120? Need flame trench. We can create concrete material with canvas concrete texture repeat. Use MeshStandardMaterial map concreteTexture, roughness 0.9. Create pad base at y=-? Let's set ground y=0. Pad slab top y=2.5, thickness 3.5, size 80x100? Use BoxGeometry(90, 3, 110), position y=1.5. The rocket base at y=2.5? Rocket group local y=0 base, world y=padTop + alt. Good. Trench: Create a dark rectangular pit below rocket? maybe BoxGeometry(12,2.4,90) at y=-? If pad top 2.5, trench floor maybe y=0.1, dark. But if pad slab covers, we can overlay black strip on top? Actually flame trench is an opening in pad under rocket. Use two concrete side walls and dark floor along x? We can build pad slab as multiple boxes leaving central trench under rocket. For simplicity, create pad base slab (90,3,110) at y=1.5; then trench strip black box (14,0.2,90) at y=3.05 (top) plus ramp? It will look like dark trench on surface. But flame trench should be below rocket, not visible top. Could create a dark channel with depth 2m at y=2.2? Hmm. Could use mesh slab with no cut. Maybe add two concrete "flame trench walls" around a black recessed strip at y=2.4, with side walls. Rocket at center. The trench can run along z? Let's set trench along x? Falcon 9 flame trench deflects exhaust; exhaust exits under launch mount. We'll create a rectangular dark cut from x=-7..7, z=-45..45? Wait pad top. If channel runs east-west (x), under rocket at z=0? We can make trench floor 14 x 90? Actually trench under the rocket, running x direction. Use dark box (90, 1.0, 12) at y=2.0. But rocket at center x=0,z=0. It could extend across. Add concrete side walls. It may look good from low camera. Add launch mount pedestal: concrete pillars under rocket. But rocket base at y=2.5, launch mount? Add ring/cylinder around base. We'll place small concrete pylons.

- Lattice launch tower: next to rocket, at x=8, z=0. It can be 75 m tall. Build lattice with vertical columns and horizontal/diagonal beams. Could use `BoxGeometry` thin. Need efficient. Maybe a group with many boxes; use function createLatticeTower(x,z,height,width,depth,color). Use vertical beams at corners and crossbars every 6m, plus diagonal. For tower, 4 columns around footprint 6x6? For lightning masts, narrow 2x2, height 90. Need tall lattice masts around pad. Add 3 masts at e.g. (-35, z=35), (35, -30), (-35,-35)? Use slim.

- Low buildings and roads: Place a few boxes 100-200m away, low 6-15m, with grey roofs. Use concrete material? Add roads as dark strips using planes at y=0.1. Maybe create road texture? Add `BoxGeometry` or `PlaneGeometry` rotated. The plane must follow ground; use thin boxes y=0.05. Add road straight line from pad to horizon, intersections. Low buildings with windows? No external; simple.

- Vegetation: add scrub patches? Could create many low small cone/cylinder bushes around land, but many meshes heavy. Maybe use InstancedMesh for bushes 400. Use low poly green bushes. But terrain texture with green speckles enough. Add some low trees/shrubs as clusters of cones? Could use `InstancedMesh` of dodecahedron maybe. But scene complex. Need "scrub vegetation". Procedural texture plus some instanced bushes. Use `THREE.InstancedMesh` with IcosahedronGeometry(1,0) green, 200 instances scattered. Maybe random. Good.

- Coast and ocean horizon: large ocean plane from z=-3000 to -200000 maybe. But terrain plane covers all? We can place ocean plane huge at y=-0.1, with terrain plane 6000x6000 at y=0.2. It will cover near. At horizon, ocean plane visible beyond 3000? But terrain plane 6000 covers; ocean plane is below and extends to 300000, visible beyond terrain edge. The horizon behind pad should show ocean. Camera low at z=120 looking at rocket, ocean maybe behind rocket if terrain edge beyond ~3000; with haze it may show. Need maybe set ocean start at z=-1500 and terrain plane only from z=-1500..? Could build land plane 5000 x 3000 maybe, ocean plane beyond. Simpler create ocean plane 400000x400000 at y=-0.5; land plane 5000x5000 at y=0.2; ocean visible beyond land edges. At low camera, horizon at land edge maybe visible. Fog blends. Good. Add another land plane (Florida peninsula) extends maybe 5km. Fine.

Need sky altitude update: uniforms.
Need camera low near pad:
`const lowCameraPos = new THREE.Vector3(80, 8, 110);` maybe x=45,z=90,y=8 looking at rocket center at y=30. Rocket at origin. Low camera should be near pad maybe 90m. Good. Once rocket clears tower, chase. Need camera smoothing: maintain current camera position and target. We can compute desired position and lerp with damping based on delta. Use `smoothFactor = 1 - Math.exp(-delta*2)`. For low camera before clear, desired low static; once after, desired chase. Could transition automatically based on rocket altitude. At alt > 80m, chase. Use smooth.

Chase camera: Use rocket world position `rp` plus offset. Need offset maybe rotate to rocket direction? But if rocket tilts and moves horizontal, chase plane relative? A simple offset of (70, 20, 100) gives distance ~125. Need within 100m. Use (45, 18, 75) length ~89. But looking at rocket center (rp + y 35). At high altitude camera also y=alt+18 while looking at rocket center alt+35, so camera below rocket by 17m, good view. In the direction x=45, z=75. If rocket tilts +x, camera offset +x to side, not behind. Might see plume. Maybe offset relative to rocket orientation: behind and to side along horizontal direction? At high altitude, Earth horizon visible. Fixed offset okay. To see coast and horizon, camera should look at rocket with background down? If camera is below rocket looking up, background is sky. At 100km, ground below, camera y=100018, rocket center y=100035, looking slightly up; background behind rocket is sky/dark, ground may be below horizon not visible because camera look upward. Hmm. Need "view of coast, curve of Earth, and then space seen from near rocket all the way up." For low altitude, camera near rocket looking up, coast not visible. Maybe as ascent, camera moves to side and looks slightly down? But to see rocket and Earth curve, choose camera position above/side of rocket looking down? Need a chase plane within 100m. If camera is slightly above rocket looking down at rocket, Earth below in background. At high altitude, stars above maybe not visible if looking down. Need a compromise: camera at rocket altitude + maybe 40m, looking at rocket somewhat down, horizon/earth visible around. Stars visible above horizon maybe if FOV. At 100 km, sky mostly black with stars, Earth fills lower half. Camera at rocket center y+20? Looking at rocket center might center on rocket with Earth below. Good. Could set camera offset (60, 25, 85), look target rocket center (y+35). Camera at y+25, target y+35, looking up slightly. Earth below likely visible at lower part of frame. Stars above visible. Fine.

Maybe at low altitude, camera near ground looking up. At chase, offset behind/high. Smooth.

Need trail contrail:
- Trail array of world points from physics. Render as a line or tube? "visible white contrail behind rocket, drawn from trail points." Use THREE.Line with BufferGeometry updated from trail. But trail points may be many; one per frame. Use LineBasicMaterial white transparent opacity 0.6, depthWrite false. Line visible at distance maybe. For contrail, better use line with additive or normal. Update geometry each frame with trail points. Trail includes current rocket position. Use `trailLine.geometry.setFromPoints(trailPoints)`? BufferGeometry setFromPoints each frame maybe okay for thousands. Need dynamic. Use a preallocated buffer maybe. Simpler: create line with BufferGeometry and update attributes. If trail length up to maybe thousands (minutes at speed 30, frames ~60*minutes=3600?). Fine. Use `line.geometry.dispose`? Could create new Float32Array each frame and update buffer. Strict. Use `BufferGeometry` and `setAttribute('position', new THREE.Float32BufferAttribute(...))` and `setDrawRange`. But allocations okay. Better use fixed max 20000 and update. But trail array grows indefinitely? The rocket flight duration maybe 200s burn, after that ballistic to space. Render loop could long. Need maybe keep trail length limited? spec trail one per step call; reset empties. Could keep all; fine. But "keep same array object". We can push. Use line geometry with dynamic positions length max? Could adapt when needed. Simpler: in updateVisuals, if trail.length > 1:
```
const positions = new Float32Array(trail.length*3);
...
trailLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
trailLine.geometry.setDrawRange(0, trail.length);
trailLine.geometry.computeBoundingSphere();
```
This creates new buffer each frame. Acceptable for maybe thousands. But can be heavy. Use dynamic buffer if length > capacity. Maybe implement helper. We can also use Line of points and draw. The line material fog maybe. Need contrail stays in sky drifts slowly. Trail points from rocket are exact. Visual line can drift? Not necessary. Could add particle contrail behind. Maybe line white, width not supported >1. Use Line2 addon? Avoid. Use points/line. Use a tube? Could create a strip with custom? Simpler line with transparent white additive. It will be visible.

But contrail should be white trail in sky. Use `LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.6, depthWrite:false, blending: THREE.AdditiveBlending})` maybe additive makes bright. At high altitude, contrast. It will draw between trail points. Perhaps 1px thin, visible. Could use points along trail? Use `Line` no width. Good enough.

Maybe add contrail puffs: a Points cloud spawning at rocket position, drifting slowly. "contrail stays in the sky and drifts slowly." We can spawn small white particles along rocket position each step when at altitude > 10? But smoke and contrail. Visual particles with drift. Use a contrail Points system? Could use same smoke particle maybe. Need realistic. We can create `contrailParticles` Points with 600 points, spawn at rocket pos, expand/drift. But trail line is required. We can do both. Avoid too much complexity.

Ascent plume: flame group scaling by altitude. Need position. Attach to rocket group. At high altitude, plume grows longer/wider. But rocket group moves, flame attached. The flame group at local y=0 maybe. Need flame mesh. We'll implement:
- `flameGroup = new THREE.Group(); rocketGroup.add(flameGroup);`
- create flame cone mesh with CylinderGeometry(0,? maybe top radius 2? bottom? Exhaust expands). For plume extending down from nozzle. Use `CylinderGeometry(2.0, 0.8, 1, 32, 1, true)`? Actually plume is a cone with narrow at nozzle? Real plume expands then shrinks? Let's make a cylinder/cone along -Y, with top radius near nozzle 2.5, bottom radius 4 at length. Use CylinderGeometry(radiusTop, radiusBottom, height,...). Need orient. Geometry axis Y. Place at y=-length/2. For plume, local from y=0 down to y=-length. Top at y=0 radius 2, bottom y=-length radius 3. Use CylinderGeometry(2, 3, length, 32, 1, true)`; position.y=-length/2. But for dynamic scaling, create base geometry height 1, scale y=-? We can use object scale. But shader. Use mesh with geometry height 1, radius maybe. Scale.
- Material ShaderMaterial additive blending, depthWrite false, transparent. Vertex/fragment gradient by vUv and vTime. Use colors blue-white core. For flame, we want white-yellow core fading orange. Shader:
```
vUv = uv; vPos=position;
fragment:
float y = 1.0 - uv.y; // 0 at top/nozzle? Need Cylinder UV
vec3 core = mix(vec3(1.0,0.95,0.7), vec3(1.0,0.35,0.05), smoothstep(0.0,1.0, ...));
float pulse = ...
gl_FragColor = vec4(color, alpha * ...);
```
Better create multiple meshes: inner core white-yellow, outer orange transparent. Add Mach diamonds as glowing spheres/rings along plume. Could create a set of `Mesh` spheres with emissive additive material, positioned at y=- distances. Update with flicker and length. Use instanced? 6 small spheres. Fine.

Need flame core flicker light. `PointLight` at nozzle, color orange, intensity dynamic, distance 120, decay 2. Attach to rocket group at local y=0 maybe. At high altitude still lights rocket? point light near rocket. Need castShadow? no. Intensity maybe 200 (physically correct? r150 units?). Use decay 2. At low, illuminate pad. Add a second point light for smoke? Fine.

Smoke clouds:
- We'll build `SmokeSystem` with Points, custom shader. Need manage particles. Could implement arrays positions, velocities, life, size, alpha. Need spawn at liftoff. We'll update using real delta maybe. Let's design.

Particle system:
```
const MAX_SMOKE = 1200;
const positions = new Float32Array(MAX*3);
const sizes = new Float32Array(MAX);
const alphas = new Float32Array(MAX);
const colors? maybe not needed. Points positions etc.
const smokeGeo = new THREE.BufferGeometry();
smokeGeo.setAttribute('position', new BufferAttribute(positions,3));
smokeGeo.setAttribute('size', ...);
smokeGeo.setAttribute('alpha', ...);
```
Need dynamic update. Use ShaderMaterial with uniforms uTexture? Use built-in `map` texture from canvas. Vertex shader:
```
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
uniform float uPixelScale;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = clamp(aSize * uPixelScale / max(-mvPosition.z, 0.1), 1.0, 2000.0);
  vAlpha = aAlpha;
}
```
But if using ShaderMaterial, need depth/fog? Could add fog? Not necessary. We can include fog maybe. Use `transparent:true, depthWrite:false, blending:NormalBlending`. Fragment sample texture:
```
uniform sampler2D uMap; varying float vAlpha;
void main(){
 vec4 tex = texture2D(uMap, gl_PointCoord);
 vec2 c = gl_PointCoord - 0.5;
 float d = length(c);
 float soft = smoothstep(0.5, 0.1, d);
 vec3 col = mix(vec3(0.82,0.85,0.88), vec3(1.0,1.0,1.0), ...);
 gl_FragColor = vec4(col, tex.a * vAlpha * soft);
}
```
Need smoke white steam. Use color uniform maybe. Could vary per particle color attribute to create gray/dirty? Add color attribute. Use vColor. Smoke should billow. Create canvas radial gradient texture for softness. Use ShaderMaterial with uniform map. gl_PointCoord works. Need texture.

Spawn logic: At t < maybe 22s, spawn per visual delta. Need particle origin:
- Along trench: x from -20 to 20, z maybe 0, y ~2.5; with velocities sideways ±, up. The smoke cloud rolls sideways out of trench along ground then rises. Spawn at pad base y~2.5. Then velocity direction outward from center. For liftoff, billowing huge clouds; spawn 60/s maybe. At speed 1 for first 10s, 600 particles; after speed 10 and burn continues to 200s, we shouldn't spawn huge all the way? Actually plume smoke at high altitude different. For pad smoke only t< maybe 15? At t<20, smoke generated. Use spawn rate maybe 80 per second of simulated time? With speed 10, 11s -> 1100. Fine. Use time-based spawn accumulator. Limit. Could also spawn from rocket trail? At high altitude contrail.

Particles have life 20-40s; updated by real delta. If sim speed 10, smoke real movement slower. Fine. Spawn based on sim t. After t> maybe 30 stop spawning ground smoke. For smoke cloud, positions at y maybe 0-10 and velocities outward, upward. Use noise for turbulence.

Update: for each active particle, age += dtReal; if age>life reset alpha 0 (inactive) or keep. Position += vel*dtReal; vel.y += buoyancy; vel *= drag; size grows. We need manage active. Simpler arrays and state. Each frame update all; spawn finds inactive slots. Use inactive if alpha=0. For spawn set positions, sizes, alphas, velocities. Update alpha to fade. Use particle arrays.

Need ensure smoke particle opacity high enough. Use `aAlpha = lifeRatio * baseAlpha`. Size grows from 8 to 40m. Billowing clouds. Maybe 1000 active.

Maybe also create "fire smoke" at launch: orange tint from plume. We can color some particles warm near base. Create color attr. Use vec3 color. In fragment multiply. Smoke white/grey; initial hot could orange? We can set color based on age? Use normal white steam. Add orange light point.

Flame plume visual: Use flame mesh + Mach diamonds. At liftoff, big white steam. Need "blinding white-yellow core at nozzles fading to orange". We can create flame cone meshes with additive. Also add a small intense sphere at nozzle maybe. Use sprite? Mesh sphere with emissive. But no external. Use mesh sphere material MeshBasicMaterial color white, blending Additive, transparent. Add nozzle glow. Use `THREE.Mesh(new SphereGeometry(2,16,16), MeshBasicMaterial({color:0xffffee, transparent:true, opacity:0.9, blending:Additive}))` at y=0.3. Or use point light.
- Mach diamonds: rings/bright spheres along plume every e.g. 4m. Use group of small sprites? We can use SphereGeometry with additive material; update positions. Mach diamonds are bright spots in exhaust. Use small spheres scale.
- Flicker: animate light intensity with sin/noise.

Contrail: Use line from trail. Need update each frame. Trail includes all points; draw. To make broader/soft, use line + points maybe. Could create a `Line` plus a `Points` with points from trail and size 2? Points at trail positions, white transparent, sizeAttenuation true. But at high altitude, trail points one per frame maybe dense. Add points from trail to create puffy contrail. Could update a `Points` geometry with trail points, size 3, opacity. Additive blending. Maybe line alone sufficient.

Need Earth/sky. Let's outline code file.

Potential TypeScript strict issues:
- `window as any` property assignments.
- `rocket` object with methods and properties typed.
- Addon imports type.
- `THREE.BufferAttribute` etc.
- Canvas getContext may return null; handle.
- `document.body.appendChild`.
- Use `let` variables.
- No implicit any in callbacks? Need annotate? `random` etc. Strict includes noImplicitAny. All functions typed.
- No unused? not error unless noUnusedLocals maybe. Avoid unused.

Need potentially `new THREE.ShaderMaterial({...})` uniforms typed. Fine.
- Use `THREE.AdditiveBlending`, etc.

Need compile with strict. Some APIs maybe typed. Need import paths. Let's verify.

Using addons:
`import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';`
`import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';`
`import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';`
Need maybe `OutputPass`? Not necessary. Composer may need output color? In newer three, EffectComposer with renderer output? Add `OutputPass` maybe. But addons types. Could use `UnrealBloomPass` in composer. Need render with composer. Need bloom. Could skip composer and implement no bloom? Requirement says e.g. UnrealBloomPass. Better use composer. But to avoid import errors, maybe check types. In current Three.js, addons don't have TS declarations unless environment includes. In many code playgrounds, TypeScript compile with @types/three which includes examples? Not sure. There are type definitions for addons in three package? As of r160, three/src? Addons are JS with no .d.ts. `@types/three` includes examples? Actually TypeScript may report "Could not find a declaration file for module 'three/addons/postprocessing/EffectComposer.js'." There is a known issue; `three` package includes types for core but not examples. However many environments use `three/examples/jsm` types from @types/three? Modern @types/three includes examples. But the import path specified "three/addons/..." maybe @types doesn't map. Hmm. Need satisfy "must compile with tsc --strict zero errors" and imports addons from three/addons/... as allowed. Usually evaluation environment has a declare module? The instructions explicitly say Addons from 'three/addons/...' so they expect it. Use it. Could maybe add `// @ts-ignore` before imports? Strict compile but suppress missing modules? `// @ts-ignore` could help, but if import missing, not zero errors? It suppresses. But if strict type of imported class? With ts-ignore, imported symbol becomes any? It might compile. However user says import Three.js as specified, addons from 'three/addons/...'. Could use `// @ts-ignore`. But clean? We can use `import ...` normally. I think environment likely has three and types. Use addons.

Need if EffectComposer type. Use `const composer = new EffectComposer(renderer); const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass); const bloomPass = new UnrealBloomPass(new THREE.Vector2(...), 0.8, 0.4, 0.85); composer.addPass(bloomPass);` Then render `composer.render(delta);`. Need set renderer size/aspect on resize; composer.setSize(width, height); bloomPass resolution? UnrealBloomPass takes Vector2. On resize set composer size and bloom pass maybe `bloomPass.resolution.set`? Actually UnrealBloomPass has setSize(width,height). composer handles passes? EffectComposer setSize calls passes' setSize? It calls pass.setSize. Fine.

Need setAnimationLoop:
```
let firstFrame = false;
let prevTime = performance.now()/1000;
renderer.setAnimationLoop((time: number) => { ... });
```
setAnimationLoop callback receives `time` maybe typed as number? In Three types, `(time: number) => void`? Use `(time: number)`. Need delta computed from time; but first call time maybe. Use clock? `const clock = new THREE.Clock();` in animation loop `const dt = Math.min(clock.getDelta(), 1/30);` But `clock.getDelta` uses time. Need if paused no step. Render. Use `const delta = Math.min(clock.getDelta(), 1/30);` Good. But after first render set __ready true. Need if composer. Set after first render.

Need motion delta/elapsed time. For visuals use delta. For simulation step uses `rocket.state().speed`. Need speed after reset.
```
const speed = rocket.state().speed;
if (!rocket.paused && !rocket.finished?) rocket.step(delta*speed);
```
Could continue after burn, gravity slows until maybe altitude falls? It might fall back. Fine. Playback. Need if state speed changes at t=10. Good.

Need overlay showing speed and mission data. Create div maybe with pointer events? Buttons. Use `position: fixed; left: 14px; top: 14px; ...` etc. UI:
```
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:12px;left:12px;padding:10px 12px;background:rgba(0,0,0,.55);color:#fff;font:12px/1.4 monospace;border-radius:6px;z-index:10;';
document.body.appendChild(overlay);
```
Maybe data div and button div. Use innerHTML update. Need if speed and mission. Text content update per frame. Buttons: 1x,10x,30x; plus pause. Maybe three buttons only. Need reset? optional. Add pause/reset small buttons maybe. But prompt says keys 1,2,3 (and three buttons) set speed. Add reset button? maybe. We'll add speed buttons and pause button/reset maybe. Need no HTML. Overlay should show. Buttons styled. Buttons click set viewerSpeed. Use event listeners. But reset clears viewer choice. Reset button calls rocket.reset. Maybe helpful. Add pause button toggles rocket.paused; but paused is bool property. In rocket object, define paused:false. Need TypeScript type. We can update button text.

Keys:
```
window.addEventListener('keydown', (e) => {
 if (e.key==='1') selectedSpeed=1; ...
});
```
Need viewer speed variable accessible inside rocket methods and UI. Define `let userSpeed: number | null = null;` in closure. rocket.reset sets userSpeed = null. But functions? Use global. UI buttons set userSpeed. state speed computes. Good.
Need keys "1,2,3" set x1 x10 x30 and three buttons. Maybe button class active? Update. Not necessary but nice.

Physics implementation details in rocket object:
```
interface RocketTrailPoint { x:number; y:number; z:number; }
interface RocketState { t:number; alt:number; vel:number; acc:number; pitch:number; speed:number; }
interface Rocket { reset():void; step(dt:number):void; state():RocketState; trail: RocketTrailPoint[]; paused:boolean; }
```
But `trail` array of points. Need keep same array object. `const trail: RocketTrailPoint[] = [];` push clones. Reset trail.length=0. The rocket object uses trail. Fine.

Internal state:
```
let simT=0, alt=0, vy=0, x=0, vx=0, netAcc=0, pitch=0;
let userSpeed: number | null = null;
const launchPadTop = PAD_TOP? need constants
```
Trail world point at rocket base? Should be world points of rocket. Use rocket group position. Maybe trail "of the rocket" point at base or center? We'll use base position plus maybe `y=PAD_TOP + alt` and x=xPos. z=0. Good. Maybe use center? They say world points of the rocket; base okay. In rendering line should go from nozzle to up; using base okay. If trail point at rocket base, line follows. Could use rocket position. Fine.

Constants:
```
const G0=9.81,R=6371000,M0=550000,DRY=220000, T0=1.3*M0*G0, BURN=200;
const PAD_TOP=3.0;
```
Need rocket group position y = PAD_TOP + alt. Trail y same. But if rocket tilted, base position remains. Could use base. Good.

Step:
```
function pitchAt(t) { if (t<=10) return 0; const x = Math.min((t-10)/(150-10),1); const s=x*x*(3-2*x); return 0.5*s; }
step(dt) {
  if (!Number.isFinite(dt) || dt <= 0) { record? maybe if dt==0 still push trail? The spec step advances; one per step() call. Render calls maybe dt>0. For dt<=0, still push? If dt=0, record. We'll if dt <=0 push and return.}
  let remaining=dt;
  const maxStep=0.02;
  while (remaining > 1e-9) {
    const sub = Math.min(remaining, maxStep);
    integrate(sub);
    remaining -= sub;
  }
  trail.push({x: xPos? ...});
}
```
But if dt huge e.g. 10s, 500 substeps. okay. For dt 1e30, infinite? clamp? step any dt; use loop; but could be huge. Use maybe if dt > 1000?? Playback speed 30, delta max 1/30 ->1s. Fine. Any dt theoretically. Use while; okay.

Integrate:
```
const tOld=simT;
const m = tOld < BURN ? M0 + (DRY-M0)*(tOld/BURN) : DRY;
let thrust = tOld < BURN ? T0 : 0;
thrust = Math.min(thrust, 3*m*G0);
const p = pitchAt(tOld); // compute at current time
const g = G0 * Math.pow(R/(R+alt),2);
const aThrustY = (thrust/m)*Math.cos(p);
const aThrustX = (thrust/m)*Math.sin(p);
const aY = aThrustY - g;
const aX = aThrustX;
netAcc = aY;
vy += aY*sub; vx += aX*sub;
alt += vy*sub; x += vx*sub;
simT += sub;
if (alt < 0) { alt=0; vy=0; } // cannot below pad. Maybe also vx unaffected.
```
But order: mass at current t. After burn, zero. At t=200, thrust to zero? Use t < BURN; as substep crossing 200, maybe still tiny. Fine. Need acceleration state `acc` current vertical acceleration at end. Update netAcc maybe after final? Use latest. If alt clamped, netAcc maybe? Fine.

Need `vel` should likely vertical speed. state.vel=vy. `acc` computed at current alt and simT. Return netAcc. Speed computed.

Potential issue at liftoff: t=0, thrust/m = T0/M0 =1.3*g0=12.753; vertical acceleration = 12.753 -9.81 =2.943, >0. good. Mass decreases; acceleration increases. At t=200, thrust limited 3*m*g0 = 6.47MN; T0 7.014MN, so throttle; acceleration at end (T/m huge). At t > 200, thrust 0, gravity decel. It will still go up; eventually fall. Fine.

Need pitch never decreases. Fine. Also maybe after 150 hold 0.5, never decrease. If t after reset. okay.

Need state speed: `userSpeed !== null ? userSpeed : (simT < 10 ? 1 : 10)`.
But speed is a time scale. If reset, userSpeed=null. Good.

Need UI overlay update using rocket.state(). speed. Use state data.
```
const s = rocket.state();
overlayText.innerHTML = `T+ ${formatTime(s.t)} ...`;
```
Need T+ time formatting. Use minutes seconds maybe. at t=100s -> T+ 00:01:40. altitude km, velocity m/s. speed x. Need maybe show speed. Use speedValue = s.speed.toFixed(0). Use innerHTML with monospace. Should not be too verbose.

Buttons: create `button1`, `button10`, `button30`; add click. Maybe speed buttons have text `x1`, `x10`, `x30`. Add active styling. On click set `userSpeed`. Need update active classes each frame? Could. Use buttons with dataset? We'll keep array and update style. Strict DOM types.

Need `window.__rocket = rocket;` where rocket object typed. Also `__scene`, `__camera`, `__renderer` etc. Need `(window as any).__ready=false` maybe. Expose. `__ready = true` after first frame.
Need first frame after composer.render. Set `if (!hasRendered) { hasRendered=true; (window as any).__ready = true; }`.

Need build scene functions and texture helpers.

Let's plan file code with top imports. Maybe include `Sky`? Could skip Sky addon and use custom shader; instruction says atmospheric scattering e.g. Sky addon or own shader. Own shader is fine. Use custom. No Sky import needed. Use EffectComposer and UnrealBloomPass. Could use `OutputPass`? Add maybe. But addons import risk. Let's use EffectComposer, RenderPass, UnrealBloomPass only. Need maybe after bloom, tone mapping? EffectComposer uses renderer toneMapping? Actually RenderPass renders scene into HDR? The renderer toneMapping applies to materials? EffectComposer's built-in render target uses color space? With postprocessing, output color may be weird. UnrealBloomPass with renderer tone mapping? In three, bloom pass output should be written to screen, but may need OutputPass for tone mapping/color space. Without, colors might be okay? EffectComposer render target uses HalfFloat and renderer's toneMapping? The RenderPass renders scene with renderer's toneMapping and outputColorSpace? The final bloom pass writes linear? Hmm. To be safe, import OutputPass and add. But more import. Use:
```
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
...
composer.addPass(new OutputPass());
```
Need types. Good. But maybe older three not have OutputPass; three r150+ has. Fine.

Alternatively use no composer, manually render and skip bloom. But requirement. Use composer.

Need `UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.5, 0.8)` etc. Set threshold maybe 0.85. But with ACES, bright flame. Bloom. On resize:
```
renderer.setSize(w,h);
camera.aspect = w/h; camera.updateProjectionMatrix();
composer.setSize(w,h);
```
Need pixel ratio? composer uses renderer pixel ratio? Usually EffectComposer uses renderer.getDrawingBufferSize? setSize called. Use renderer.setPixelRatio min. composer.setPixelRatio? EffectComposer has setPixelRatio? It might. Not necessary; set composer.setSize(w,h). It uses renderer pixel ratio? In three EffectComposer, constructor sets internal pixel ratio? It has setPixelRatio. Could call composer.setPixelRatio(renderer.getPixelRatio()) maybe typed. Use `composer.setPixelRatio(Math.min(window.devicePixelRatio,2))`? Hmm. Better:
```
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
...
composer.setSize(innerWidth, innerHeight);
```
EffectComposer renderTarget size maybe in pixels? It uses width/height and pixelRatio. Actually setSize sets renderTarget.setSize(width*this.pixelRatio,...). It has pixelRatio. Set `composer.setPixelRatio(Math.min(window.devicePixelRatio,2))`? Type maybe exists. I think EffectComposer has `pixelRatio: number` and `setPixelRatio(value:number)`. Could use. Or not. If not, might still work.
Need maybe `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.

Now textures helpers:

`function makeCanvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture` create canvas, get context, draw, set wrap repeat. But if context null throw? Use `const ctx = canvas.getContext('2d'); if (!ctx) throw new Error(...)`.
Need no external assets. Fine.

Concrete texture:
- 512x512. Fill gray base, random speckles, cracks lines. Use pseudo random deterministic. `let seed = 12345; function rand(){ seed = (seed*1664525+1013904223)>>>0; return seed/4294967296; }`. Could use for textures and scene. But multiple random usage. Define a `rng` with seed. Fine.
- concrete: base #8e8e8e, draw random small rectangles with varying gray; draw cracks. Repeat.
Ground texture:
- 512x512. Base dark green/brown. Use noise speckles, patches. Add roads? Not in texture. For scrub vegetation, draw many small circles in greens. Set repeat.
- Rocket texture: 512x1024? Draw white, gray band, black lettering, US flag. Need correct vertical positions. We'll draw. The cylinder UV: u from 0..1 around circumference, v 0..1 along height with bottom y v=0? In cylinder geometry, v maybe 0 at bottom? It likely v=0 at bottom? Cylinder UV y maybe 0 at bottom? Need check: CylinderGeometry uv y from 0 at bottom to 1 at top? I think top at 1, bottom at 0. We'll draw accordingly. Height along cylinder side. For stage1 cylinder height 40 from y=4.5 to 44.5. Texture can have white, grey band near top, logo etc. Interstage separate material dark. Stage2 maybe white/black band. Nose fairing with texture. Could use same or separate.
Maybe create rocket texture canvas 1024x2048, draw white, thin grey lines, gray band at v=0.92? But mapped to stage1 only? Need per stage.
Simplify:
- Use white material for body.
- Stage1 cylinder with texture map (white with flag and "FALCON 9"). The texture drawn with horizontal text maybe wrapping around. Need display flag and lettering. We'll create a 1024x2048 canvas; draw white base, gray band at bottom? Use text drawn vertically? On cylinder, if text horizontal in canvas, it wraps around circumference and appears across one side. Flag near top. Good.
- Stage2 cylinder white with slight texture.
- Interstage dark band cylinder height 5, material charcoal.
- Engine section dark/charcoal cylinder bottom with nozzles.
- Nose fairing cone white.

Better use one body cylinder from y=4 to y=45, texture. Then interstage from 45 to 50 dark. Upper stage from 50 to 62 white. Nose cone 62-70. Total. Engine section 0-4.5 dark. Good.

Need body cylinder radius 1.85, height 41 maybe. Use `CylinderGeometry(1.85,1.85,41,32,1)` position y=24.5. Add map. Maybe texture repeat 1. The flag/text can be visible.
- Interstage: `CylinderGeometry(1.88,1.88,5,32,1)` y=47.5 dark. Add maybe ring.
- Upper stage: `CylinderGeometry(1.85,1.85,12,32,1)` y=56? Wait body top =45; interstage 45-50; upper 50-62; fairing cylinder 62-66? Nose cone 66-70. Use upper stage height 12 y=56. Fairing body 4 y=64? cone height 4 y=69? Hmm total. Let's define:
  engine section y=0..4.5 dark.
  stage1 y=4.5..45 (h=40.5) body y=24.75.
  interstage y=45..50 (h=5) dark.
  stage2 y=50..62 (h=12) white y=56.
  fairing cylinder y=62..66 (h=4) white y=64.
  nose cone y=66..70 (h=4) cone geometry? Use `ConeGeometry(1.85,4,32)` at y=68. Cone base at y=66, tip y=70, good.
 Total 70. Good.
Add engine nozzles below y=0? Need engine section from y=0 to 4.5; nozzles under y=-3 to 0? But rocket base at y=0. If nozzles extend below, rocket base could be group at pad top. They stick down 2m below, visually. We'll add nozzle meshes positioned y=-1.2 with cone height 2.4, top? Engine section bottom at y=0. Maybe okay. The plume extends below. The rocket base y=0. Let's set engine section y=2.25 h=4.5? Wait if base y=0, engine section should be lower, y=2? Let's reorder: engine section maybe from y=-? Better set overall rocket local y=0 at bottom of engine/nozzles. If engine section height 4, nozzles bottom at y=0. Stage1 starts y=4.5. Good:
- engine section cylinder from y=0 to 4.5? But nozzles below? Add nozzles at y=-1? That would below base. Could set engine section at y=2.25 (h=4.5) with nozzles at y=-0.8? Hmm.
Maybe define rocket local y=0 at base (bottom of nozzles). Nozzles bottom y=0, engine section body from y=1.5 to 4.5, stage1 above. Or engine section h=4.5 at y=2.25; nozzles extend from y=-2 to 0? Contradicts. Let's set local y=0 at rocket base = nozzle bottom. Engine section cylinder starts y=2.0 and ends y=5.0? Then stage1 y=5 to 45. Rocket total 70. Need adjust. Simpler:
- engine section cylinder y=1.5, height 3.0 (from 0 to3? If center 1.5). Nozzles bottom y=0, nozzle height 1.5, center y=0.75, attach under engine section bottom at y=0. They stick below stage. Actually engine section bottom at y=0 and nozzles at y=0..1.5? Wait.
Let's just create nozzle meshes at y=-1 with height 2.5 so bottom y=-2.25, and body engine section y=2.25 height 4.5. Rocket base concept could be nozzle bottom at y=-2.25. But rocket group position y=PAD_TOP + alt. Then nozzle bottom would be below pad top if alt=0. But pad top at 3, nozzle bottom at 0.75, okay; sits on pad? maybe. The stage body starts at y=0 to4.5, nozzles extend to -2.25. Rocket total height from nozzle bottom -2.25 to top 70? That makes 72.25. Hmm.

Maybe easier: rocket height 70 above pad, nozzles at bottom but don't need exact. Set body total 70 from y=0 to70; engine section y=0..4; nozzle cones attached at y=0 extend down to -3? Then rocket total physical height 70 plus nozzles. But spec rocket about 70m tall. Fine. The plume starts at y=-3. Rocket group position at pad top; nozzle bottom below pad? If y=-3 and padTop=3, nozzle bottom y=0 ground, okay! That's nice. Set padTop=3.0. Rocket group local y=0 = body base. Nozzle bottom y=-3 => world y=0. Stage body from y=0. Good. Rocket top y=70, plus nozzle bottom -3, total 73. Close enough.

Maybe set rocket group y=PAD_TOP+alt. At t=0, nozzle bottom y=0 at ground surface. Body base at 3. Stage 70 tall. Nice. Rocket base local y=0 is at pad top 3. Nozzles from y=-3 to 0, bottom at ground y=0. Flame extends below ground when at pad, hidden by pad? But okay. Rocket launch mount at y=3. Good.

Use PAD_TOP=3.0. Ground y=0. Pad top y=3.0. rocket body local y=0..70 at group y=3+alt. The rocket base at pad top. Engine nozzles local y=-2.8, bottom y=0.2 world at t=0. Good.

Rocket body:
- engine section maybe y=0..4.5 with dark material, body base at y=0.
- stage1 y=4.5..45
- interstage y=45..50
- stage2 y=50..62
- fairing y=62..66 and cone 66..70
- nozzle group under engine section: 9 nozzles at local y=-1.5? Nozzle height 2.8 from y=-2.8 to 0. Place center -1.4. Good.
Plume starts local y=-2.8 (nozzle bottom) downward. Add flame group with base at y=-2.8.

Rocket group rotation z = -pitch. Then at pitch 0.5, rocket tilts, nozzle bottom may go below pad etc. At high altitude no issue. At liftoff pitch<0.005.

Camera low near pad: place (70, 8, 95) looking at rocket center y=3+35.

Need add launch support/umbilical tower adjacent: tower at x=7.5, z=0, maybe height 75. Lattice tower with top arm? Add a small arm to rocket. Could add "crew access arm" at y=45. Maybe.

Lightning masts around pad: x=±40,z=±40, height 100. Lattice slim.

Need maybe pad and tower shadows. Use castShadow/receiveShadow. Many boxes cast? Could be heavy. Set tower meshes castShadow true? Could. 100s of boxes; shadow map okay. Use only some.

Need low buildings. Use boxes with materials; maybe use MeshStandardMaterial colors. Low around 200-800m. Roads.

Earth sphere:
Let's use `SphereGeometry(6371000, 64, 32)` with material. But if centered at -R, top at y=0; local terrain plane at y=0.2. The sphere uses physical material with texture map. Need avoid extreme camera coordinates? Camera near rocket at 100km, sphere radius 6,371,000, fine. Far plane 12,000,000. Shadow? no.

However using a sphere centered y=-R means its top surface at origin. It will be below local terrain. At altitude 100km, camera sees horizon and curvature. Good. The sphere's UV mapping: equirectangular. We can draw ocean base + continents. But at local Florida area, sphere top texture mapping maybe not green. Need not.

Could make earth sphere material with map `earthTexture` generated: use canvas 2048x1024. Fill ocean #225d8d, draw land masses with gradient green/brown using random noise blobs. Add white cloud streaks? Might look decent from space. At low, local terrain hides. At high, shows a curved Earth. Need atmospheric haze. Fog? Earth sphere material fog false? Actually fog if high altitude? Maybe. Use MeshStandardMaterial with map, roughness 0.8, metalness 0.0. It will be lit by sun, nice. Add `earth.receiveShadow=false`. It is huge; polygon count. Good.
But if local ocean plane huge 400km at y=0, it may obscure sphere when high altitude? From 100km camera, ocean plane limited to 200km radius, flat; horizon plane at 200km, Earth sphere below beyond. The plane itself maybe visible as a flat disc with abrupt edge? Fog/haze hides. Better not have ocean plane huge; use earth sphere for ocean/ground at far. Use local land plane 8km and an ocean plane maybe 200km x 200km? At high altitude, flat plane could look weird but fog. Could just use earth sphere for far, and local land plane 10km; add a local ocean plane 100km? Hmm.

For low camera ocean horizon behind pad, we need ocean visible beyond land maybe 1000m. We can create an ocean plane 100km x 100km at y=-0.1; land plane 8km x 8km at y=0.1. The ocean plane extends far. At high altitude, it will be visible as flat plane covering much; but earth sphere could be hidden if plane huge. Maybe set ocean plane 40km? At 100km altitude, 40km radius. Not too huge. The earth sphere beyond. At low, horizon 40km, due haze. Good. Use ocean plane 120km x 120km, but flat. At 100km, plane seen as flat, maybe acceptable with fog. But actual earth curvature visible? The earth sphere beyond edges. Could set ocean plane 40km. Haze hides edge. Let's use 60km.

For low horizon behind pad, ocean extends to 30km. Good. Land plane maybe 10km. At center, terrain covers. Ocean plane visible beyond land. Great.

But local land plane 8km may not cover ocean plane in all directions; ocean visible in background. Need roads/buildings within 3km. Good.

Terrain plane:
`PlaneGeometry(8000,8000,64,64)` rotated -PI/2, y=0.2. Material map repeat(32,32) maybe. Need flat, no height. Could add some bumps via vertex positions? Not necessary. Maybe add slight bumps in geometry (y values) at edges? Simple no.

Roads: We can create dark gray strip from pad to horizon. Use `PlaneGeometry(100, maybe 5000)`? Maybe roads around pad. Add a main road along x direction at z=0? Could be. Create boxes with asphalt material. Add low buildings around at positions. Use deterministic random.

Vegetation: InstancedMesh of bushes:
```
const bushGeo = new THREE.IcosahedronGeometry(1,0);
const bushMat = new THREE.MeshStandardMaterial({color:0x3a5a2e, roughness:1});
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 300);
for ... random pos radius 200..3000, y=... scale 0.5..3, y=1; set matrix; castShadow false; receiveShadow true.
```
Maybe 300. Fine.

Roads and buildings:
- roads: thin boxes y=0.25, maybe color #555. Add crossroad. Use material.
- Buildings: 8 simple boxes with roof separate? Use material gray/white, positions 150-1000m, height 6-25. Add windows maybe not. Low buildings.
- Maybe add water tower? Not necessary.

Pad/trench:
Create concrete pad base: `BoxGeometry(100, 3, 120)` position y=1.5, receiveShadow. Pad top at y=3.
Flame trench: create dark recess. Since rocket center at z=0, make trench along x from -45 to 45? Actually Falcon flame trench exhaust goes east/west under launch mount. Use box `BoxGeometry(80, 0.2, 14)` at y=3.02? That's on top, ugly. Better create trench as a sunken rectangle by building pad around it: Instead of one big box, create pad as four boxes around a central trench:
- Pad slab dimensions 100 x 3 x 120. Could create base slab with top hole? Use four boxes: left, right, front, back? The trench runs along x? Let's define trench along x (width in x 90, depth in z 16). The pad sides around trench: front slab (z=+? maybe) and back; plus? If trench runs along x entire pad, then pad is split into two halves north/south (z ±). The rocket sits at z=0 over trench? Launch mount can span. Pad slab split: two boxes of 100 x 3 x 45 each, located z=±27.5, leaving gap z=-8..8 for trench. But rocket at z=0 in gap; flame trench visible. Add trench floor dark at y=0.2, size (100,0.5,16). Add concrete side walls? The split boxes have inner walls. Good. Pad top y=3. Rocket launch mount at center spans trench.
Let's build pad:
```
const padHalfWidth=50, padHalfDepth=60, trenchHalf=7.5;
const left/right? Actually split along z:
box size 100x3x (60-7.5)=52.5, position z=±(7.5+52.5/2=33.75).
```
Wait padDepth 120, total depth 120 -> half60. Trench width 16 (z -8..8). North slab depth 52 from z=8..60 center 34; south slab z=-60..-8 center -34. Use two boxes size 100,3,52. Good. Pad top at y=3 (base y=1.5). Add trench floor box at y=0.3, size 100x0.5x16 black/dark, maybe at z=0. Add low concrete walls along trench edges? The slabs form walls. Add angled flame deflector? Maybe add two concrete walls along z=±7.5? Already slab edges. Add dark scorch marks via texture. Add launch mount: concrete pedestal ring? Create four concrete supports around rocket base at (±3, ±3) y=3..6? Rocket base at y=3. Add launch ring maybe cylinder. But rocket sits on pad. Add "launch mount" as box at (0,4,0) size (9,2,9)? That might intersect rocket. Use ring? A dark metal base around nozzle. `CylinderGeometry(5,6,2,32,1,true)`? Could. Keep simple: concrete pedestal box at y=2? Hmm. Rocket base at y=3; engine nozzles bottom y=0? Wait rocket group y=padTop + alt=3. Nozzles local -2.8 bottom -> world y=0.2. So nozzles extend down to ground; rocket body base at y=3. Pad top y=3. Rocket body base sits at pad top, nozzles go down into trench. Good. Launch mount could be a ring at y=3 around body base. Add `CylinderGeometry(4,4,1,32)` at y=3 maybe. But rocket intersects. Fine.
- flame trench runs under rocket. Smoke emanates from ends x=±? Actually trench along x, exhaust exits sides. Smoke spawn along ground at x=±, z=0. Good.

Tower:
Lattice function:
```
function createLatticeTower(width:number, depth:number, height:number, x:number, z:number, color:number, beam=0.18): THREE.Group
```
Use positions at four corners. Add vertical boxes/cylinders; horizontal beams every few m; diagonal cross braces. Could use BoxGeometry per beam with dimensions. For each segment between levels. Simpler:
- columns: four vertical BoxGeometry(0.35,height,0.35) at corners.
- horizontal cross beams along x/z at each y step 6m.
- diagonals: use cylinders between points? Use BoxGeometry aligned? Easier use `THREE.CylinderGeometry(0.06,0.06,1,6)` and position/rotate. But many. Could use boxes and rotate. Need helper `addBeam(group, start, end, thickness, material)` using cylinder aligned. Use `THREE.CylinderGeometry(0.08,0.08,1,6)` and scale length; position midpoint; quaternion set from direction. Works.
- tower at x=8,z=0, footprint 6x5,height 75.
- add horizontal platform boxes maybe. Add upper arm at y=45 extending to rocket: cylinder from tower to rocket. Add small room? Not needed.
- lightning masts at x=±37,z=±37, height 100, footprint 2x2, slender, with lattice. Use function.

Need create beam helper:
```
function beamBetween(group:THREE.Group, a:THREE.Vector3,b:THREE.Vector3,radius:number,mat:THREE.Material): void {
 const dir = new THREE.Vector3().subVectors(b,a); const len = dir.length(); if(len<=0)return;
 const geo = new THREE.CylinderGeometry(radius,radius,len,6);
 const mesh = new THREE.Mesh(geo, mat);
 mesh.position.copy(a).add(b).multiplyScalar(0.5)? Wait a+b? use copy(a).add(b).multiplyScalar(0.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
 group.add(mesh);
}
```
Need material typed THREE.Material. Geometry per beam can be heavy. Could reuse unit cylinder and scale, but okay. For each tower maybe 100 beams. Fine.
Tower: columns 4 + horizontal rings maybe at 7 levels 4 beams each + diagonals 8 per level = 100. lightning masts 3 * maybe 60 = 180. Performance okay.

Lattice tower details:
- Use silver material with metalness 0.7 roughness 0.4.
- For each level y=0 to height step maybe 6. Add horizontal beams at y. Add diagonals between corners on two sides. Need no shadow? maybe.
- Add top platform small boxes.
- Add a white "spacex" sign? no fonts.

Rocket textures:
Need procedural canvas. We'll write helper `makeRocketTexture`. Create 1024x2048 canvas. Fill white. Add subtle vertical panel lines? gray. Add black band at maybe y= 0.76? Let's think. Stage1 texture v coordinate: bottom 0 to top1. On cylinder canvas, v=0 bottom? We can draw black band near top? Falcon 9 has black interstage at top of first stage? We also have separate interstage dark. Texture could include "FALCON 9" lettering near center and US flag near top. Draw flag: small canvas rectangles. The texture wrapping means text visible on one side. We'll draw at x=512, y=800? Need canvas y coordinate from top. For CylinderGeometry, UV v=0 at bottom, but Canvas texture v=0 at bottom? Texture coordinate v=0 maps to image bottom? Actually Three.js texture flipY default true, so uv v=0 maps to bottom of image (after flip); Canvas texture image y=0 top. So draw text at canvas y=?? Need not too precise. We'll just draw.

Maybe draw a white base with a gray band at top 20%, black lettering near center, US flag with blue canton. Need flag at y=300. Use `ctx.fillRect(700,200,100,60)` flag red/white stripes/blue. Actually flag horizontal. Good.

Need rocket material physically based. Use MeshStandardMaterial map texture roughness 0.35 metalness 0.3. White. Interstage material dark gray rough 0.5 metal 0.4. Nozzles black.
Potential issue bright white under sun; okay.

Rocket shadow and flame light.

Flame:
Need create flame material shader. Need dynamic length/width based altitude. In render update:
```
const alt = state.alt;
const plumeLen = 18 + Math.min(alt/1000, 1) * 50 + ...? As air thins, plume grows longer/wider. Need at altitude 0 small, at 100km huge maybe 160m. Use `plumeLen = 16 + Math.min(alt/50000,1)*120` maybe. Width = 1.5 + alt/100000*6.
flameGroup.scale.set(width, plumeLen, width)? But geometry is unit height with top/bottom radii? We'll build cone geometry height 1 from y=0 down. Use scale. But scaling width and length: create flame mesh with `CylinderGeometry(0.8, 1.8, 1, 32, 8, true)`; position y=-0.5. Then flameMesh.scale.set(width, length, width); But scaling x,z. Need geometry top radius 0.8 bottom 1.8. At length scale. If geometry height 1, position y=-0.5 before scale? If scale y length and position y = -length/2. We can set mesh position.y=-length/2. Mesh scale.set(width, length, width). Good. The flame extends from y=0 down to -length. The nozzle bottom is not local 0; we attach flame group at local y=-2.8. Then flame mesh y= -length/2 within flame group. Good.
- inner core flame mesh with smaller radius, length. Use additive, depthWrite false, opacity. Maybe two meshes: outer orange, inner white. Inner length *0.7, width*0.5. Use same shader with color uniform? Could use one material with color gradient from white center? Hard. Use two meshes.
- Mach diamonds group: create 8 small spheres? Use a single `THREE.Group` of 6 meshes with additive material. Position along y=-distance. They should scale with plume length. Create small `SphereGeometry(1,8,8)` material white. On update, for each i, position.y = -distance[i], scale based flicker. Could be visible.
- Flame point light: attach at local y=-3, intensity based length/alt. Use PointLight color 0xffaa33. distance 250 decay 2. Update flicker.
- Maybe add glow mesh sphere around nozzle. Use additive sphere.

Smoke:
Need spawn at pad. Need determine if spawn. Use simulation time: rocket.state().t. Spawn before t< 25s. But render loop calls step speed; t advances quickly. Use `if (simT < 25)`. Spawn accumulator using delta real? Could use simulation dt? The smoke should be thick at liftoff. Use visual delta for spawn rate maybe. At speed 1, 25s. At speed 10, t advances 10x; if spawn rate based real delta, smoke less. Use spawn based sim dt * spawnRate (say 40 particles per sim sec). That yields more when speed high. But smoke updates real; could be many. Limit. Use `spawnAccumulator += Math.min(stepDt, 1.0) * 80`? stepDt is sim dt. For t<20, at speed 1, 80/s = 1600 particles. At speed 10 after 10s, only first 15 sim sec? Actually t reaches 20 in about 11 real seconds, spawn 1600. Fine. Cap 1200. Good.
Maybe spawn smoke also near trench ends and along ground. Use random.
At t<4, plume not burning? engine startup. Fine.

Particle system details:
Implement with arrays:
```
interface SmokeParticle { active:boolean; pos:THREE.Vector3; vel:THREE.Vector3; age:number; life:number; size:number; alpha:number; color:THREE.Color; }
```
Could store arrays of objects; update and write buffer. 1200 objects okay. Use pool. Need no TS issues.
- Geometry attributes positions Float32Array, colors Float32Array, sizes Float32Array, alphas Float32Array. Use `BufferAttribute` dynamic usage.
- For each particle update, write. Inactive alpha 0.
- Fragment uses color. Need texture map. Add `uniform sampler2D uMap`.
- Vertex needs `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; varying vec3 vColor; varying float vAlpha;`
- Need set attributes.
- Update `geo.attributes.position.needsUpdate = true` etc. Need TS attributes property? `geometry.getAttribute('position') as THREE.BufferAttribute`. Could access `(geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;`. In Three types, attributes is `{[name:string]: BufferAttribute | InterleavedBufferAttribute}`? Fine.
- For spawning, find inactive particle. Better random index. Use pool array.
```
function spawnSmoke(): void {
 for (let attempt=0; attempt<20; attempt++ {
  const p=particles[Math.floor(Math.random()*MAX)];
  if(!p.active) {...}
 }
}
```
Need if none. okay.
- Smoke origin: pad top y=2.5, x = (Math.random()<0.5?-1:1)*? Actually trench along x, exits at x ±? Let's spawn at x near ±(15..40), z ±(3..8)? Need sideways and rising. Also spawn around rocket base? Use:
```
const side = Math.random()<0.5?-1:1;
pos.set(side*(20+Math.random()*30), 2+Math.random()*2, (Math.random()-0.5)*12);
vel.set(side*(12+Math.random()*20), 1+Math.random()*4, (Math.random()-0.5)*15);
```
But exhaust exits trench along x; smoke rolls sideways along x. It should also billow upward. Use positions near pad around x=±10..50, y=2-8, z random 0±10. Fine. Also some at rocket base center.
- Smoke should glow orange initially near flame? Add some color warm. Set color base from 0.65..1.0 white; initial maybe orange if age<1? In update we can set color with warm factor. But custom shader color attribute can vary. For realism, smoke white steam lit by orange light. Use warm color near origin? Could set random color (0.9-1.0,0.9-1.0,0.9-1.0), near base maybe light peach. We'll set.
- Update age += delta; if age>life deactivate. size = start + age*rate; alpha = base * (1-age/life)^? maybe smooth. Need cloud billowing, soft volumetric.
- Vel: add turbulent noise. We can use sin function with age and particle index? Simple.
- Position changes. Ground smoke should rise and roll sideways. `p.vel.y += 1.5*dt; p.vel.multiplyScalar(0.99);` maybe. If no active, alpha 0.
- Use real delta clamped 0.05. Since speed 10, smoke moves slowly; okay.
- Need size grow large: from 3 to 30. Use `p.size = 4 + p.age*2 + p.growth` maybe up to 40. In vertex, gl_PointSize world-size; at distance 100, 30m -> 30*projectionScale/100; projectionScale maybe height/(2tan) ~ 1080/(2*0.46)=1170, size ~350 px huge. That can be okay. Clamp 2000. Particle overlap produces clouds. Good.
- Fragment soft: radial gradient with texture and `smoothstep(0.5,0.05,d)` maybe. Use map generated radial. Actually texture alpha already radial; multiply. Good.

Need spawn smoke from trench along ground. Maybe separate "smoke cloud" Points with large particles. Good.

Contrail particles:
Need contrail behind rocket. Could use a Trail line plus contrail puffs. Implement a separate Points system with 500 particles, spawn at rocket trail position as rocket ascends above maybe 80m. White vapor. It should stay in sky and drift slowly. We can reuse smoke system? But smoke ground spawn stops. Contrail should be persistent. Use a second particle system perhaps using same shader material but with smaller sizes and different behavior. Or use trail line only. The prompt specifically "Trail: a visible white contrail behind the rocket, drawn from the trail points." So line is enough. But "contrail stays in sky and drifts slowly." Line updates from trail, stays at launch trajectory; drift slowly maybe visual update shift? But trail array required world points; visual trail could drift? Use line directly. It stays, because points fixed. Drift? Could add slight sinusoidal lateral offset based on age, but then not from trail points. Maybe okay. We can add contrail particles spawned and drift. Let's implement simple contrail particles with same smoke shader but a separate Points with maybe 400 objects and smaller sizes, white. Spawn at rocket position when t > 10, rate. But at high playback speed, could spawn lots. Update real delta. It would create puffy exhaust trail. Maybe too much. Use line plus a few puffs. Hmm.

Given time, implement trail line and maybe a contrail points "puff" system using same smoke shader, with max 600, spawn when rocket alt > 50 and t < 200. Position at rocket along trail, size small 2-8, expand, alpha low, drift. But if camera follows, trail behind. Good.

Could have a generic particle system class? To avoid duplication, implement Ground smoke and contrail using same particle arrays? Maybe create `ParticleCloud` class. Need TypeScript strict. Could implement class with arrays, geometry, material. But more code. Let's keep two `Points` systems using same helper? Maybe define `createParticleSystem(max, texture)`. But ground smoke and contrail need different spawn. Could create `ParticlePool` class with methods spawn. This is cleaner.

Define:
```
class ParticlePool {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private particles: SmokeParticle[];
  constructor(max:number, texture:THREE.Texture, blending:THREE.Blending) { ... }
  spawn(pos: THREE.Vector3, vel: THREE.Vector3, size:number, life:number, alpha:number, warm?:boolean): void { ... }
  update(dt:number, drag:number, rise:number): void { ... }
  setVisible? 
}
```
Need no unused. This class can be used for smoke and contrail. `particles` array of object with `active`. Strict okay.
But need different behaviors (smoke expands more, contrail drifts). Add methods update with rise/drag. Use particle growth. Could pass parameters. Or use fields in particle. Keep simple.
- In constructor, create geometry with attributes, material ShaderMaterial. Texture uniform. Additive? For smoke normal blending; for contrail maybe normal. use `blending` param.
- ShaderMaterial fragment uses `aColor`.
- Need gl_PointCoord texture. `uniform sampler2D uMap`.
- Use `uniform float uPixelScale`.
- Need set `transparent: true, depthWrite: false, blending`.
- `points.frustumCulled = false`? If particles spread, bounding sphere could cull incorrectly. Set false. Good.
- In update, call attribute needsUpdate.

Particle interface:
```
interface Particle {
 active:boolean;
 pos:THREE.Vector3;
 vel:THREE.Vector3;
 age:number;
 life:number;
 size:number;
 startSize:number;
 growth:number;
 alpha:number;
 color:THREE.Color;
}
```
Class spawn:
```
spawn(pos, vel, startSize, growth, life, alpha, color): void {
 const p = this.particles.find? expensive. Use sequential cursor. 
 let p=this.particles[this.cursor]; this.cursor=(this.cursor+1)%this.particles.length;
 p.active=true; p.pos.copy(pos); p.vel.copy(vel); p.age=0; p.life=life; p.startSize=startSize; p.size=startSize; p.growth=growth; p.alpha=alpha; p.color.copy(color); 
}
```
If all active, overwrites oldest. Fine. For ground smoke many. Use random index? Use cursor. Good.

Update:
```
update(delta: number, rise:number, drag:number): void {
 const dt = Math.min(delta, 0.05)? But need real delta maybe up to 0.033. Use delta. clamp? Use min(0.05). 
 for i particle:
  if (!active) {alphas[i]=0; continue;}
  age += dt; if age>life {active=false; alphas[i]=0; continue;}
  const f = age/life;
  // turbulence
  p.vel.y += rise * dt; // buoyancy
  p.vel.multiplyScalar(1 - drag*dt);
  p.pos.addScaledVector(p.vel, dt);
  p.size = startSize + growth * f; maybe growth * age.
  alpha = baseAlpha * (1-f) * ... maybe fade in/out: smoothstep(0,0.1,f)*(1-smoothstep(0.7,1,f)).
  positions...
  colors...
  sizes...
  alphas...
 }
 mark needsUpdate
}
```
Need if particle pos below ground, clamp y. Smoke from trench starts low. If pos.y<0.5 set y=0.5 and vel.y positive. Maybe.
- Add slight sinusoidal turbulence to vel based on index/time. Could store index. Use `p.vel.x += Math.sin(age*... + i) * ...`. Not necessary.
- particle size grows with age: `p.size = p.startSize + p.growth * age;` The `growth` units m/s. For smoke start 5, growth 2.0 m/s -> after 10s 25m. Good. Contrail start 1, growth 0.3.

Ground smoke:
```
if (simT < 24) {
 spawnCounter += simDt * 90;
 while spawnCounter >=1 { spawn...; spawnCounter-=1; }
}
```
At t<10 speed 1, dt ~0.016, spawn 90/s ->1.5/frame. 900 particles by 10s. At t>10 speed10, simDt ~0.16, 14/frame, only until t<24 => additional 1200. Could max out. Good. Maybe spawn rate 70/s. Use 80. Smoke life 18-30s real. At t=24, no spawn; clouds fade after. But rocket is high by then. Smoke remains. good.
Spawn positions: At t< maybe 1 no? start at t=0. There's steam at liftoff. Fine.
```
const side = Math.random() < 0.5 ? -1 : 1;
const x = side * (8 + Math.random()*40);
const z = (Math.random()-0.5)*18;
const y = 2 + Math.random()*3;
const pos = new THREE.Vector3(x, y, z);
const vel = new THREE.Vector3(side*(20+Math.random()*30), 2+Math.random()*8, (Math.random()-0.5)*20);
```
But smoke should also rise and roll sideways. Good.
Maybe some spawn directly under rocket: position x=(Math.random()-0.5)*10,z etc. The trench ends. Use mix.

Use a color: mostly white with slight gray. `new THREE.Color().setRGB(0.92+rand*0.08,...)`. Need use object.

Contrail:
- Spawn maybe every visual step when rocket alt>20 and simT<220? Use spawn accumulator based simDt * 20? But many. Size 1.5, growth 1.0, life 25, alpha 0.25. Spawn at rocket world pos, velocity slight lateral (wind) and upward? Actually contrail particles stay and drift. Use `vel` small random (0.5). White.
- The trail line draws them. Maybe contrail particles from rocket position at every ~0.1 sim sec. At speed 30, simDt 0.5, spawn 100? Too many. Use based real dt? Hmm. Contrails should be continuous. Line suffices. Use fewer puffs: spawn if counter > 1 with rate 8/sec of real time, maybe. It will trail. At high speed rocket moves fast, still. Use `contrailCounter += Math.min(delta,0.05)*8;`. At 60fps spawns 0.13/s? Actually `delta*8` ~0.133, so one every ~7 frames. Fine. Trail line plus puffs.

Need smoke texture: create canvas radial gradient. `makeSmokeTexture()`: 128x128, radial gradient from center white alpha 1 to transparent. Could implement additional noise? radial gradient enough. Use `ctx.createRadialGradient`. Fill. The texture alpha. Use `THREE.CanvasTexture`; `colorSpace = THREE.SRGBColorSpace`? For alpha texture, maybe no. Set `needsUpdate`. Add maybe `minFilter = THREE.LinearFilter`. Good.

Flame shader:
Create material with uniforms time, altitude? But update uniforms. Could use MeshBasic? Simpler use custom ShaderMaterial additive. Need compile. Two materials: core and outer. We can create with `makeFlameMaterial(color1,color2)`. Fragment:
```
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
void main(){
  float y = clamp(vUv.y,0.0,1.0); // 0 bottom? Maybe cylinder v? 
  float edge = smoothstep(0.0,0.45, abs(vUv.x-0.5));? not.
  float n = 0.6 + 0.4*sin(vUv.y*20.0 + uTime*20.0);
  vec3 col = mix(uColorB, uColorA, pow(1.0-vUv.y, 1.5)); // need nozzle top bright
  float alpha = smoothstep(0.0,0.15,vUv.y)*(1.0-vUv.y) * (0.7+0.3*n);
  gl_FragColor = vec4(col, alpha*0.8);
}
```
But need glow. Could set `transparent=true, blending=Additive, depthWrite=false`. No need tone mapping? It will be bright. Need render after. Set `toneMapped=false` maybe.

Cylinder geometry UV v along height; if cylinder oriented y, v=0 bottom, v=1 top? Actually cylinder side UV y: from 0 at bottom to 1 at top? I think in three CylinderGeometry, uv.y = 1.0 at top? Need maybe. We can avoid relying on UV; use local position y in varying. In vertex:
```
varying float vY;
gl_Position...
vY = position.y; // geometry unit height from -0.5 to 0.5
```
Fragment use `float y = vY + 0.5;` 0 bottom,1 top. But mesh scale? It scales position? Vertex position before scale, but vY local. For flame attached, geometry height 1 centered. Need gradient: bright at top (nozzle) and fade to bottom. Use `float nozzle = smoothstep(-0.5,0.5,position.y)`? Actually top at y=0.5 (near nozzle), bottom -0.5. Bright at top. Use `float g = smoothstep(-0.45,0.45,vY);` Then col mix from bottom orange to top white. Use `vUv` not needed. Vertex varying `vY = position.y;`.
Fragment:
```
float heat = smoothstep(-0.6,0.5,vY);
vec3 col = mix(vec3(1.0,0.25,0.02), vec3(1.0,0.95,0.7), heat);
float alpha = smoothstep(-0.5,0.45,vY) * 0.8 + ...;  // fade at bottom
```
Need also radial edge glow; using cylinder surface not volumetric. Additive transparent. Outer orange. Need soft edge? Cylinder with openEnded. It looks like a cone. Add maybe another cone with larger radius and lower opacity. Good.
Could use `CylinderGeometry(0.6,1.4,1,32,16,true)` with `vY`. The flame mesh scale y length. Good.
Inner core: `CylinderGeometry(0.2,0.8,1,24,8,true)` with white-yellow, length 0.7. Add.
Maybe use `THREE.Mesh` with `side=THREE.DoubleSide` to see from inside? Additive. Set side DoubleSide. Fine.
Need plume grow. Update flame outer length, width. Inner length 0.7. Mach diamonds: create array of maybe 6 sphere meshes with additive material, same. Their positions along flame length from nozzle downward. Use y = -i * length/6. Scale sizes. Their local y not affected by flameGroup? Attach to flameGroup (which is at nozzle bottom). Use positions y= -i*len/6. Need update. Could set opacity? Use one material, all share. Set visible if length>something. Flicker scale.

Point light flicker: intensity based on altitude? At low, 90 (maybe physical units), at high maybe lower? It lights rocket; set intensity = 150 + random. Use decay 2 distance 200. At high altitude, light still. Fine.
Nozzle glow mesh: sphere at local y=-2, scale ~3. Use additive white. Update scale with plume width.

Sky stars:
Create stars Points. Need star group follow camera. Use `new THREE.BufferGeometry` with positions random on sphere. PointsMaterial. Color maybe white, size 1.4, opacity initial 0. Use `transparent:true, depthWrite:false, blending:Additive`. Add to scene. Set `starsGroup.position.copy(camera.position)` each frame? Need if stars local positions on sphere centered origin; group position. The actual star points at local radius 5e6 around camera. But if camera far 1e7. Good. Set group position = camera.position. Because stars positions relative. But points depth against sky? sky mesh follows camera too, render order -100. stars renderOrder? default; will render after sky due render order? We can set starsGroup.renderOrder = 1. Points material depthTest true, sky no depth. Stars might be occluded by Earth. Good.
Set material.opacity based altitude:
```
const starOpacity = THREE.MathUtils.smoothstep(rocket.state().alt, 65000, 105000) * maybe 0.9; 
starsMat.opacity = starOpacity;
```
Need `THREE.MathUtils.smoothstep` signature (x,min,max) returns number. Strict okay. At 70km maybe 0.5? Use smoothstep(70000,110000). At 100km ~0.8. At >100 visible. Fine.
Also star size maybe 1.5 and opacity. Stars positions fixed local relative to camera; as camera rotates? Camera always looks at rocket, orientation changes slowly. Stars appear. Good.

Sky update:
- `skyMat.uniforms.uAltitude.value = alt;`
- sky position follows camera.
- Maybe horizon color, sun direction update. uSunDirection = new Vector3(0.5,0.8,0.2). normal. Use normalized constant. Need light sun direction. Could use sun.position normalized. Since directional light far, direction. Use uniform value. Fine.
- Sky altitude at 100km: black. At ground horizon pale. We need stars visible above 70; sky black enough. Use h = smoothstep(0,110000, alt). Top color mix from blue to black; horizon from pale to maybe dark blue. At high altitude, horizon black. Use:
```
float altFactor = smoothstep(0.0, 120000.0, uAltitude);
vec3 zenith = mix(vec3(0.08,0.22,0.55), vec3(0.0,0.0,0.0), altFactor);
vec3 horizon = mix(vec3(0.68,0.82,0.95), vec3(0.01,0.02,0.04), altFactor);
```
But near ground maybe sky blue. Use vDir.y. Need `h = clamp(vDir.y,0,1)`. Below horizon not visible due ground. For sky dome, camera inside, below y might show dark? ground covers. Use.

Sun disc/glow:
```
vec3 sunDir = normalize(uSunDirection);
float cosSun = dot(normalize(vDir), sunDir);
float sunDisc = smoothstep(0.9994,0.9999,cosSun);
float glow = pow(max(cosSun,0.0), 60.0) * 0.8 + pow(max(cosSun,0.0), 8.0)*0.08;
skyCol += vec3(1.0,0.96,0.85)*(sunDisc*3.0 + glow);
```
Need maybe sun visibility at high altitude. Fine.

Atmospheric scattering: use horizon. Could add noise for haze? Fine.

Earth texture:
Generate canvas 2048x1024. Fill ocean. Draw continents with random blob. Need perhaps not too random. Use fixed random seed. Use `for (let i=0;i<80;i++)` blobs. Colors between green and brown. Add `ctx.globalAlpha`. Draw at random x,y. But equirectangular should be on sphere; at local top maybe land. Fine. Add cloud bands? Maybe not.
Set `texture.wrapS = RepeatWrapping; wrapT=ClampToEdge`? Sphere UV. Set color space. Use MeshStandardMaterial map. Need earth sphere material fog false? If fog true, earth beyond hazy. Fine. FogExp2 may apply. At high altitude maybe weird. Could set earth material fog false, use atmosphere in shader? Hmm. Keep fog true maybe not. Large distances would be foggy pale blue, which is aerial perspective. At high altitude, fog color updated to blue? We can update fog color from sky horizon based altitude. But fog on earth might make it pale; okay.
Maybe create a custom Earth shader? Too much. Use standard.

Need local ocean material with `MeshStandardMaterial` color? Could use water texture or use earth? Ocean plane. Add perhaps slight `roughness=0.15, metalness=0.1` and color blue. But no reflections. Could add a `MeshStandardMaterial` with normal map? no. Fine.

Need atmosphere near horizon: maybe use huge planes/fog.

Camera low and chase:
Store `const rocketWorldPos = new THREE.Vector3()`. In update, set rocketGroup.position = (xState? from rocket state? We need horizontal position from physics. state only alt, vel; no horizontal exposed. trail last point has world x,y,z. Use trail last point? Trail points recorded every step. Render update after step, trail length updated. Last trail point = base position. Use it to position rocket. But if no step (paused) rocket position stays. Need position from state plus horizontal internal. State doesn't expose x. Could use trail last point if exists; else initial. But for visual rocket orientation and position, use trail last point (base). However trail point is base; y=padTop+alt. Good. x = horizontal. Use last point. But when paused before first step, trail empty; use base pad. In update visuals, we can use `rocket.trail.length ? rocket.trail[rocket.trail.length-1] : {x:0,y:PAD_TOP,z:0}`. Need altitude for sky from state. This also means rocket position updates once per step call, not substep. fine.

But if the render loop calls step multiple substeps inside, trail one point at end. Good.

Need rocket group position y = trail point y maybe. x,z. Set group.position. rocket rotation z = -pitch.

Need flame attached. Good.

Camera low:
- compute rocketPos from trail. rocketCenter = rocketPos + (0,35,0) but group rotated? center maybe. If pitch, center off? Could use local offset rotated. For camera target, use rocketPos + up vector * 35? Since rocket tilts. But okay. Use `rocketCenter = rocketPos.clone().add(new THREE.Vector3(Math.sin(pitch)*35, Math.cos(pitch)*35,0))`. Good. For camera look.
- low camera position maybe `new THREE.Vector3(70, 9, 95)` (relative world), target rocketCenter. At liftoff, rocket begins at y=3. camera at (60,8,90) distance ~110, looking up. Good.
- Chase desired: rocketCenter + offset? offset from rocket center, not base. Use `chaseOffset = new THREE.Vector3(45, 18, 75)`. distance ~89. Add maybe rotated with pitch? If rocket tilts right, offset fixed could be at side. distance. Use rocketCenter + chaseOffset. Look at rocketCenter + forward*? maybe rocket nose. Use target rocketCenter plus up? Actually center. Good.
- Smoothly interpolate camera position and target using `camera.position.lerp(desiredPos, 1-Math.exp(-delta*1.5))` but if delta 0.016 factor 0.02? Wait 1-exp(-0.024)=0.024 slow. For desired transitions, maybe factor 1-exp(-delta*3)=0.046 at 60fps. Not super smooth. Could use higher 8 ->0.12. Use delta*2? For camera smoothing across long distance? At chase, the camera needs follow rocket which moves fast; if smoothing too slow, it lags. Could compute smoothing factor `1 - Math.exp(-dt*6)` ~0.095 at 60fps. Good. At speed 30, rocket moves 30x; but motion simulated per frame, rocket moves maybe a few km per frame? Camera lag huge. Need camera follow closely. If rocket velocity 1000 m/s, sim speed 30 => 30km per real second; per frame 500m, smoothing factor 0.1 leaves behind. Need camera directly track chase with less smoothing or use desired position and strong smoothing. For chase, use higher smoothing or set camera target lerp quickly. Use factor 1 - exp(-delta*20) ~0.28. At speed 30, could lag. Better use `camera.position.lerp(desiredPos, 0.5)`? Smooth enough. But "Smooth camera motion." Use damping after rocket. For low camera static no issue. For chase, track with 0.25 per frame. We can compute from movement. Maybe use `const smoothing = 1 - Math.exp(-8 * delta);` at 60fps factor 0.13. Could use 1-exp(-12*delta)=0.18. Fine. At speed30, rocket moves 500m per frame, camera lags 400m first frame but catches. Distance could exceed 100m temporarily. Need "within about 100m". Use direct chase with smoothing small enough. Use camera position lerp to desired with `1-Math.exp(-20*delta)` ~0.28. At 60fps, steady state lag = v/(20) ~ (1000*30)/20=1500m if using exponential smoothing with time constant 0.05s and speed 30,000m/s? Wait simulated velocity e.g. at t=150, maybe v=2000m/s; speed 30 => effective 60,000 m/s of world motion per real second. Actually rocket advances sim time 30x; per real second rocket moves 60km. Camera needs follow, smoothing lag ~v*τ = 60000*0.05=3000m. Bad. To maintain within 100m at high playback, either camera snaps with rocket or simulation speed physically too fast. Could set camera to desired exactly for chase, with smoothing on orientation. But "Smooth camera motion" could use exact position but smooth target. However at high speed, camera follows exact. Motion still smooth because rocket position evolves smoothly. Use `camera.position.copy(desiredPos)` for chase, or lerp with dt? The rocket trajectory itself smooth. The issue is lag. We can use desired directly. But to avoid abrupt transition at tower clear, use a blend based on altitude. For chase, direct. At low, direct low. Transition maybe. Could set desiredPos based on altitude blend. For alt > tower threshold, chase. The switch could snap; use smoothstep blend between lowPos and chasePos? Because chasePos far from low; blend. But as rocket ascends, blend factor. However when altitude crosses threshold, camera transitions over time. Need not snap. Use `transition` variable that increases when alt > 80; maintain `chaseBlend` smoothed separately but using desired positions. The desiredPos = lowPos.lerp(chaseDesired, blend). At speed high, but blend smooth. Once blend ~1, direct. Could set blend rate 1-exp(-delta*2), takes seconds. But rocket speed high, then camera low for some time; maybe okay. Simpler:
- Before clear: camera position low static.
- After clear: camera position chase exact but `camera.position.lerp(chaseDesired, 0.5)`? As discussed lag. Use `camera.position.copy(chaseDesired)`; the transition can be smoothed using a `chaseStartTime` but since speed maybe 10, after 10s rocket altitude maybe? At t=10, speed switches to 10. Rocket maybe altitude ~? Compute quickly: acceleration initial 2.94 then increases; at 10s altitude ~500m? tower clear at 80m maybe t~5? Wait at t=3, altitude maybe 20m? Let's estimate: a~3 m/s², after 5s h=37m, v=15. At 10s h~100m. Tower 75m, clears around 7s. So chase starts at alt>80 around t=8. speed still 1 (until t=10); transition can happen in real time. Fine. Use blend; at t=10 speed10. Good.
- Could use chase exact once blend>0.95.

But camera target smoothing maybe use lerp with factor 0.15. But target moves with rocket; at high speed lag causes direction issues. Use `camera.lookAt(rocketCenter)` exact. Camera orientation direct. Smooth enough because rocket trajectory smooth. Use `camera.lookAt(rocketCenter)`. Fine. Camera position exact chase. Low static. Blend transition with a camera state variable? Let's implement:
```
let cameraBlend=0;
...
const alt=state.alt;
const targetBlend = alt > 80 ? 1 : 0; // maybe starts after clearing tower
cameraBlend += (targetBlend - cameraBlend) * (1 - Math.exp(-delta*1.5)); 
```
But at high speed, if alt jumps from 80 to 1000 in a frame, blend 1 slowly. But chase desired; camera still low while rocket leaps huge. It may take several frames. At speed 10, t advances 0.5 per frame, rocket moves maybe 100m/frame. After alt>80, camera could lag low for 2 seconds, rocket maybe km away; but camera transition should be quick. Use blend rate high: `1-exp(-delta*10)` ~0.17 at 60fps; takes ~0.5s. At speed 10, rocket moves 500m; camera transitioning. Might be okay with dramatic. Alternatively set blend instantly after alt>80; acceptable. But smooth camera motion. Let's use a dedicated cinematic camera: when alt<80, low camera. When alt>=80, chase exact but with `camera.position.lerp` high factor maybe or direct. Could smooth transition over 1.2 sec using time? At speed 10, rocket moves huge but camera still can fly to chase. Hmm. We can compute desired and lerp at factor 0.12; from low to chase huge distance maybe 100m, 0.5 sec. Rocket moves ~? at alt80 v~50m/s sim, speed 10 => 500m/s, over 0.5s 250m. Camera still behind but catches. The camera distance to rocket might exceed 100m. But after catches. Requirement says once clears tower, viewer travels with it close. Could be okay after initial transition. Use blend: position = low.lerp(chase, blend) with blend ramps at rate 5/s. At t alt>80, blend from0 to1 in ~0.2s? Use `blend += (1-blend)*delta*4` maybe 0.4s. Fine.

Maybe set "chase" desired direct and camera position = desired for alt>100. To avoid lag, after blend ~1, direct. The blending itself. We'll implement:
```
let cameraBlend = 0;
const desiredChase = rocketCenter + offset;
const transitionSpeed = 3.0;
cameraBlend = Math.min(1, cameraBlend + delta*2.5);
const desiredPos = lowPos.clone().lerp(desiredChase, cameraBlend);
camera.position.lerp(desiredPos, 1 - Math.exp(-delta*20)); 
```
Actually lerp twice. At blend 1 and high speed, desiredPos moves fast; camera lerp factor ~0.28 lags. Could instead if cameraBlend >0.98, copy desired. Use:
```
if (cameraBlend > 0.9 && alt > 80) {
  camera.position.copy(desiredChase);
} else {
  camera.position.lerp(desiredPos, 1 - Math.exp(-delta*6));
}
```
Once chase active, direct. Smooth because desiredChase smooth. Good. Use cameraBlend increases when alt>80. After, direct. The transition from low to chase when blend <0.9 uses lerp. At t after ~0.5s, direct. Fine.

But at high speed, rocket altitude jumps from 80 to 1000, cameraBlend maybe still 0.2 then desired blend far; camera lerp lags. After next frame blend maybe, direct. Fine. Could just set cameraBlend=1 immediately when alt>80 to avoid. But transition snap. Use 0.5 sec. Acceptable.

Camera target: if alt<80 look at rocketCenter; else look at rocketCenter. Good. Maybe adjust camera to see Earth: offset. Use `camera.lookAt(rocketCenter)`. Need low camera target rocketCenter, yes.

Need trail line update. Use geometry update.
- Set trail line positions from trail points. To avoid huge arrays: maybe maintain draw count. Create BufferGeometry with dynamic attribute if needed. Use function:
```
const trailMax = 6000? But flight could exceed; if length > capacity, new Float32Array.
let trailPositions = new Float32Array(0);
function updateTrailLine() {
 const n = rocket.trail.length;
 if (n < 2) { trailLine.visible=false; return; }
 trailLine.visible=true;
 const arr = new Float32Array(n*3); // allocate per frame
 for...
 const attr = trailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
 if (attr.array.length < n*3 || ...) {
   trailLine.geometry.setAttribute('position', new THREE.BufferAttribute(arr,3));
 } else { attr.array.set(arr); attr.needsUpdate=true; }
 geometry.setDrawRange(0,n);
}
```
This still allocates arr each frame. Fine. Or write to dynamic. Given N maybe grows thousands, allocations each frame heavy but okay. Could optimize. Use capacity 20000. If exceed, grow. Use attribute. We'll implement simple:
```
let trailArray = new Float32Array(0);
function updateTrail() {
 const n=rocket.trail.length;
 if (trailArray.length < n*3) trailArray = new Float32Array(n*3 + 6000);
