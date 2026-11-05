We need produce one TS file strict compile, three.js imports. Need design scene. Must be complete. Need be careful about types, strict. Need expose window.__rocket etc. Need no HTML other than canvas appended; overlay via DOM created by JS acceptable? "page has no other HTML" means we can create overlay elements in JS. Fine.

Need implement physics, rocket model, pad, tower, masts, terrain, ocean, sky, bloom, particles smoke, plume, trail, camera, UI. Single file.

Need import Sky addon? three/addons/objects/Sky.js. EffectComposer, RenderPass, UnrealBloomPass, OutputPass maybe available. TypeScript typings for three addons? Usually three package includes typings for addons? We assume yes. Could avoid addons except Orbit? Need bloom required. Use EffectComposer, RenderPass, UnrealBloomPass. Import from 'three/addons/postprocessing/...'. Strict compile likely types exist. Sky addon for atmosphere? Could use own shader sky to avoid potential import path/types. But Bloom addon path types maybe. Use:
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
These are standard. Could use OutputPass maybe type? Yes. Alternatively composer with renderer toneMapping ACES and render target may output correct. OutputPass handles tone mapping? If renderer.toneMapping set, render pass and bloom... With OutputPass, renderer toneMapping? It does tone mapping in pass. Simpler set renderer.toneMapping = ACESFilmicToneMapping; composer render then OutputPass. Bloom pass works on linear? Fine.

Need strict TS. Need ensure no implicit any. Use types explicit. DOM types included? tsconfig likely lib DOM. The code is browser, tsc strict. Good.

Need think simulation details.

window.__rocket object with reset, step(dt), state(), trail array, paused boolean. Need track t, y alt vertical, x horizontal? Equations: vertical and horizontal acceleration. We need horizontal velocity. Rocket has position in world. Could maintain alt (vertical), downrange x (horizontal), vx, vy. Pitch angle from vertical; thrust direction has vertical cos(pitch), horizontal sin(pitch) along +x. Gravity vertical. Drag? Not specified. Ignore drag for physics. Mass decreases linearly during burn from m0 to dry mass over 200s. Thrust T = 1.3*m0*g0, limited to 3*m*g0, zero after burn. But wait if T constant 1.3*m0*g0 = 7.0 MN, m decreases, acceleration grows. At end 200, mass dry 220k, thrust? "Burn: 200 s. The mass falls linearly from m0 to the dry mass during the burn." "Thrust: T = 1.3 * m0 * g0, limited to 3 * m * g0 (throttle) and zero after the burn." So constant base thrust until t>=200. At early t mass m0, T = 1.3 m0 g0; 3 m g0 cap larger. Fine. At t=200 thrust zero. Rocket cannot go below pad. Integrate substep max 0.02. Need state().acc net vertical acceleration at current t maybe compute.

Pitch: 0 at liftoff; after 10s starts to grow (gravity turn), reaching about 0.5 rad at 150s, never decreases. Need define monotonic function. E.g pitch = 0 for t<10; for t>=10: 0.5 * smoothstep((t-10)/(150-10))? But gravity turn usually pitch rate increases and saturates. "reaching about 0.5 rad at 150 s, and it never decreases." Could use pitch = 0.5 * (1 - exp(- ...))? Need 0.5 at 150. Simple: pitch = 0.5 * clamp((t-10)/(140), 0, 1) linear, about 0.5 at 150. But more realistic gravity turn: pitch = 0.5 * (1 - cos(pi * u/2))? At u=1 0.5. But rate zero at ends. "starts to grow" after 10, reaching at 150. Use smooth but never decreases. Let's use pitch = 0.5 * Math.pow(clamp((t-10)/140), 0.8)? At t=150 =0.5. Pitch remains 0.5 after? "never decreases", can continue? Not specified. Could hold at 0.5 after 150. Good. But ascent to orbit? Horizontal velocity maybe modest. If pitch 0.5 rad, thrust component horizontal ~ sin(0.5)=0.48, vertical cos=0.878. For 200s acceleration average ~? mass 550 to 220. Thrust 7.0 MN, avg mass 385k -> a_thrust ~18 m/s². vertical component avg ~16 m/s², gravity ~9.8, net ~6, over 200 sec delta-v ~1200 m/s vertical plus initial. Altitude huge ~100 km. Horizontal ~? could be. After burn, ballistic with vertical velocity maybe 1200*cos? Need calculate. At t 150 pitch .5 vertical thrust 6.1 MN / mass? mass at 150 = 550 -330*(150/200)=302.5k, a=20.2 m/s² vertical component ~17.7, g~9.8, net ~7.9. Average net maybe 5-8. Vertical vel at 200 maybe ~1500? alt ~150 km. Wait thrust acceleration early: T=7.0MN / 550k=12.7 m/s² vertical, net 2.9 at liftoff (T/W 1.3 minus gravity). At 150 m 302k, T=7.0MN->23.1 m/s², vertical component 20.3, net 10.5. Vertical velocity integral could be ~? At 200 likely 1700 m/s, altitude maybe ~145 km. Good. After burn coast to Karman quickly. Need camera chase.

Need map to world. Rocket model ~70 m tall, 3.7 m diameter. In world, base at y=0? Pad top maybe y=1? Rocket base at y ~2. Model origin? Let's define rocket group with model base at y=0, position.y = padTop + alt? On pad alt=0 mean rocket base at pad top. In world, "alt" altitude above pad? They say h altitude. Rocket cannot go below pad. Could define padTop = 2m (concrete slab elevation). If alt measured above ground at y=0? The launch pad top maybe y=2, rocket base at 2+alt. But physics h=alt. For camera and state. Simpler set ground at y=0, pad concrete top at y=1.5, rocket base at y=1.5 + alt. alt = rocket base above pad? Hmm state alt in m should be height above ground. Let's set pad top y=2; rocket base world y = 2 + alt, so alt is above pad, but requirement altitude in km. At liftoff alt=0. Could add 2. Fine. For sky altitude use max(0, rocketBaseY - 2) maybe alt. For visible ground, pad at y=0? Let's just make ground y=0, concrete pad slab y=0.6 high? Rocket base at y=1? To avoid model through pad. But physics alt could be base above pad. At t=0 state alt=0. Good.

Rocket model: total height 70. Build group with base at y=0. Components:
- first stage: cylinder radius 1.85, height maybe 42 m, from y=0 to 42. White.
- interstage/darker band around y=42? Falcon 9 first stage ~42 m, interstage ~? second stage ~? total 70. Need body white with visible interstage and darker band. Build:
  - engine section at bottom y 0-4 (dark gray), with 9 nozzles around base. Nozzles cones from y=1? We can create cone geometry radius .45 height 1.5 rotated? Actually nozzles point downward, visible. Use cylinder/cone.
  - first stage tank cylinder y=4 to 44 (height 40), white.
  - black/dark band at y=4? 
  - interstage y=44-48 dark gray/white? Falcon interstage black? Actually white with black? We'll make dark gray band.
  - second stage y=48-58 white.
  - fairing/nose y=58-70 with cone + ogive maybe two cones. "nose fairing". Use cylinder 58-64, cone 64-70.
  - landing legs maybe small boxes along bottom.
  - grid fins at top of first stage.
  - markings: canvas texture with US flag and "SPACEX" / "FALCON 9" lettering. Need apply to cylinder side. We can create CanvasTexture. Must be strict. Need texture not external. Use canvas. Apply as map on side of first stage? If cylinder UV wraps entire circumference, text repeats? Cylinder has radial UV. We can make decals via planes attached slightly outside body facing outward. Better: create flag plane and text plane as textured planes positioned on front (+z) side of rocket, rotate by cylinder? At rocket body, attach plane at z=radius+0.01, y positions. Since rocket rotates? We'll not rotate rocket around y except maybe orient pitch along +x. The model is symmetric; markings front toward camera? Camera near pad maybe at x? We can choose camera near pad offset +x? If rocket pitch tilts +x, camera chase behind? Need set orientation of rocket group to pitch. We can rotate group about z-axis by -pitch? Let's establish world axes: y up, +x downrange east. Rocket initially vertical. When pitch>0, thrust tilts toward +x (east), so rocket's long axis tilts toward +x: rotate about z by -pitch? A vector (0,1,0) rotated around z by angle θ: (-sinθ, cosθ, 0). To get +x component, θ negative: (sin(-? wait rotation matrix z: x' = x cos - y sin = -sinθ for y=1; y'=x sin+y cos=cosθ). For θ=-pitch, x'=sin(pitch), y'=cos(pitch). So rotation.z = -pitch. Good.

Position x = downrange, y = padTop + alt? The model base at origin; rocket extends +y. If group rotated, base origin at position. Good. The center of mass not modeled, pivot at base. That's okay, rocket tilts around base. But position.y=padTop+alt where alt is base altitude. Fine.

When tilt, top shifts x and y. Camera chase should look at rocket center maybe position + rotated vector (0, 35,0) i.e. rocket center. Need track.

Need trail points: array {x,y,z} world points of rocket, one per step() call. Should be maybe position of rocket center? "world points of the rocket" likely sample position. Use rocket center (base + tilted center offset) or base. To draw contrail behind rocket, use center or base? Use position at rocket base? Contrails from engine, use nozzle position (base + offset). But trail points one per step() call of the rocket. Could use center. For drawing tube/line, need points. For trail visible. We can use base? Since at liftoff altitude small, line from pad to up. Better use engine/nozzle world position (base + local (0, 0,0)? base), as contrail starts at engine. But camera etc. The trail should be behind rocket; engine base position is good, but after pitch, engine point is base. We can store rocket.position (base world) as trail point. Requirement "of the rocket" ambiguous. Fine. To make contrail visually behind, we can use center? Hmm if trail at base, after ascent the trail starts from engine. Good.

Need one point per step() call, not per substep. step(dt) can advance with substeps, then push point after entire dt. If step dt huge, only one point. Fine. Trail array object same on reset: set length =0. One per step() call. If dt<=0? Should still? Probably if dt >0. Could push. If dt huge, one. We'll implement push after step if dt>0. Need step may use many substeps max 0.02. Also paused handled by render loop, not step. __rocket.paused boolean initial false? Yes. When paused true render loop does not call step.

State(): t, alt, vel, acc, pitch, speed. vel likely vertical velocity? Maybe total velocity? Requirement: state { t, alt (m), vel (m/s), acc (net vertical acceleration, m/s^2), pitch, speed }. It says vel m/s maybe vertical velocity? And speed maybe current playback speed? Wait state().speed returns current time scale, but also the launch has speed. The list includes vel and speed, speed is likely playback speed (they explicitly state state().speed returns current value). So vel = vertical velocity, maybe speed total? They mention overlay T+ time, altitude, velocity. Need state().vel maybe vertical? We'll return vertical velocity vy. Add totalSpeed? Not required. state().acc net vertical acceleration. Good.

Need physics. Let's define:
const g0=9.81, R=6371000, m0=550000, dryMass=220000, burnTime=200;
let t=0; let alt=0; // rocket base above pad, vertical position
let downrange=0; // x from pad
let vAlt=0; let vDown=0;
let simMass = m0;
let pitchAngle=0;
let lastAcc=0;
let speedScale=1; viewerSpeed: number|null=null.

Pitch function:
function pitchAt(t: number): number {
 if (t <= 10) return 0;
 const u = Math.min((t-10)/140, 1);
 // smooth monotonic, 0.5 at 150. Let's use u^0.75 maybe at t=150 =0.5, derivative positive.
 return 0.5 * Math.pow(u, 0.8);
}
For t>150, return 0.5. But "reaching about 0.5 rad at 150 s, and it never decreases." If holds yes. Could continue increasing slowly after? Not necessary. Maybe pitch 0.5 at 150 and stays. That's okay. But then horizontal accel still 0.5. Good.

Mass during burn: t burn. But t is simulated time from liftoff. Mass falls linearly from m0 to dry over 200s while burning. If t>=burnTime, dry. m = m0 + (dry-m0)*clamp(t/burnTime). At t=0 m0. Thrust if t<200: T = 1.3*m0*g0, limited to 3*m*g0. Actually T maybe constant but min. At early m0, 3*m*g0=3*550k*9.81=16.2 MN > 7.0. At end m=220k, 3*m*g0=6.47 MN < 7.0, so throttle to 6.47 near end. Need calculate. "limited to 3 * m * g0 (throttle)" means T = min(1.3*m0*g0, 3*m*g0) during burn. At t>200 zero. Force direction: vertical = T*cos(pitch), horizontal = T*sin(pitch). Gravity g(h) down. Acceleration:
aY = (T*cos(pitch))/m - g(h)
aX = (T*sin(pitch))/m
If altitude <=0 and vAlt <=0? Rocket cannot go below pad. At t=0, aY maybe (1.3*m0*g0)/m0 - g0 = 3.0*? T/m = 12.753, g=9.81 => 2.943 positive. So lifts. If somehow clamped alt=0 and vy negative, set vy=0. Also while on pad, if T vertical < weight? Not here. Use max. Need no below pad. Downrange no clamp. Could also padTop.

Integration fixed substep max 0.02, any dt. Need handle dt maybe negative? Set if dt<=0 return. Use while remaining >0; h = min(remaining, 0.02). But if dt very large, many iterations maybe okay. Could if dt > 1000? Not necessary but time. Use maybe 0.02.

Need step calls with speed from render loop. Render loop:
const delta = clock? Use performance? Three.Clock? Use THREE.Clock. Need elapsed. delta = clock.getDelta(); stepDt = Math.min(delta, 1/30) * rocket.speed? But speed depends state and playback. The __rocket.paused check. The playback speed: "speed is the time scale. It is 1 for the liftoff (t < 10 s) and then 10, unless the viewer chose a speed: keys 1, 2, 3 (and three buttons) set x1, x10, x30. state().speed returns current value; reset() clears the viewer's choice." So if viewerChoice null: speed = t < 10 ? 1 : 10. If chosen: 1/10/30. Need currentSpeed accessible. We'll implement `viewerSpeed: 1 | 10 | 30 | null`. getSpeed(): if viewerSpeed !== null return viewerSpeed; else return t < 10 ? 1 : 10. When t crosses 10, speed jumps 1 -> 10. Fine.

UI overlay: create div fixed top-left; show mission data and speed. Buttons set speed 1,10,30. Keys 1,2,3. Need button click. Add paused maybe Space toggle? Not required, but could. UI include speed. Buttons in overlay. Need ensure keyboard digits not conflict. Use addEventListener('keydown').

Camera: "low camera near pad looking up at liftoff; once rocket clears the tower the viewer travels with it, close to rocket (within about 100 m, like a chase plane), smooth." Need implement camera transition. Could use smooth interpolation based on alt/time. We need view rocket, plume, coast, earth curve and space.

We can define camera modes:
- On pad (alt < towerHeight ~ 80? rocket clears tower when rocket top > tower height: alt + 70 > 90 maybe alt >20? Actually tower height ~85m. Rocket base alt at liftoff 0, top 70; clears when alt > 20. But "once rocket clears the tower" maybe alt > 80? Since rocket height 70 and tower 85, top clears at alt 15. But base clears at alt 85. Usually clear tower when base above tower? We can transition at alt > 30 maybe. Hmm camera near pad looking up. We can start camera at (18, 2, 28) looking at rocket center; as rocket rises, camera follows? "once the rocket clears the tower the viewer travels with it" Use transition if alt > 40 or t > 20. At liftoff camera fixed low, tracking rocket by lookAt. After alt > 60, switch to chase. But flight reaches 60m within maybe 6-7s. Fine. Need smooth.

We can calculate desired camera each frame:
- For alt < transitionAlt (e.g., 90 m): camera near pad fixed at (25, 3, 35) with slight tracking? Look target rocket center. This is low, close. It will track upward. Rocket passes quickly. Once alt > 90, chase.
- Chase: position relative to rocket. Need within 100m. Want rocket, plume, coast. We can place camera at rocket center + vector. But rocket is rising fast; camera chase plane near rocket. For view of plume and rocket, camera behind and to side? Since rocket tilts downrange +x, exhaust plume extends opposite thrust, downward/backward. Camera should see rocket from side maybe offset +z (south) and slight behind? We can position relative to rocket center:
  - Look target = rocket center.
  - Camera = look target + (side distance, maybe - vertical? let's design).
  We need see rocket, plume, view of coast below, Earth curve, then space. If camera close at 100m, can see rocket full 70m and plume. As rocket goes up, rocket maybe length 70, camera distance 90. To see Earth below, camera maybe slightly below rocket and looking up? But to see rocket and Earth, we can position camera at rocket center + (0, -10, 80) i.e., 80m behind along z, looking at rocket center; Earth ground visible below. As altitude increases, camera looks horizontally? Hmm.

Chase plane near rocket: camera at rocket center + offset vector. The rocket's local up direction? After gravity turn, rocket tilts. Camera should follow orientation maybe relative to rocket axis? But to see horizon, camera can be fixed offset in world coordinates (e.g., +z side, -y 15, +x 10). The rocket's tilt toward +x; plume extends down-left. Camera at +z side sees profile of rocket and plume, with Earth below behind. Good. Set offset = (10, -5, 85)? Actually camera at z + 85 (south), y maybe center.y - 5, x center.x + 10. Look target maybe rocket center. Distance ~86. Within 100. When rocket is high, if camera offset y -5, camera below rocket center, looking upward slightly. That shows rocket against sky, Earth below. But at 100 km, rocket against black space, Earth below. Good.

Need "view of the coast, the curve of the Earth" from near rocket all the way up. Camera near rocket 80m, Earth is far below, but with FOV 55, you can see horizon/earth below if camera looks slightly down? Wait looking at rocket center, camera at same y as center, horizon around. Earth may not be visible because camera near rocket at altitude but looking at rocket, ground is below; if camera below center by 10m, look up at center. The ground is behind/below, might not be visible. Could instead camera offset below and further, looking at rocket center with slight upward angle; the Earth below appears in lower field. At 50 km altitude, ground horizon at 800km, visible in lower part if looking horizontal. Good. At 100 km, Earth appears as curved surface below. Should be visible if look target is rocket center and camera orientation nearly horizontal; ground is below the horizon line but in FOV lower. Need maybe tilt camera down a bit? But looking at rocket center from below, angle up ~ arctan(10/85) = 6.7°; horizon at 0°, so ground visible below horizon at bottom. Good. At 100km, horizon distance ~1130 km, Earth's surface below. Good.

Need scale: Earth radius huge; can't model full earth with local terrain. We can make local flat ground plane and ocean; for high altitude, need Earth curve. Could use a large sphere for Earth? But camera at 100 km, sphere radius 6,371 km. Could add a massive sphere at center (0,-R,0) with radius R, textured? But camera near launch site, looking outward/horizon. A sphere of radius R centered at (0, -R, 0) includes local ground y=0. But using full sphere with surface at origin? At x,z far, curvature. The sphere huge; local ground plane would z-fight. Could use a large sphere with a procedural shader / color, and place local terrain/ocean on top? At low altitude, sphere surface near pad is y=0 but curvature; local ground plane 10 km. At high altitude, sphere visible. Need Earth curve. But making Earth sphere with radius 6.371e6 and camera at 100 km above surface: horizon. Use a large sphere with MeshStandardMaterial? At radius 6.371e6, geometry 64 segments yields facets? Need high segments 128. At high altitude, visible. But local scene units meters; sphere huge. Could create earth sphere with radius R, center (0, -R, 0). Material with procedural colors? But no external textures. Could use MeshStandardMaterial color blue/green; or custom shader using world position noise? Simpler: a large sphere with dark ocean blue-green, plus local terrain plane for first 20km. However at liftoff low camera, Earth sphere under terrain may show beyond horizon as blue ocean if terrain plane ends. Need ocean horizon. We'll create a large ocean plane (e.g., 100 km x 100 km) at y=-0.2 colored blue, plus land plane around pad (20km), and a distant earth sphere? Hmm "Atlantic Ocean on the horizon behind the pad". With local ground at y=0 and ocean plane maybe at y=-0.5 beyond coastline. Need set camera near pad at z maybe south, land. The ocean horizon behind pad: if pad near coast, ocean toward east or north? Need choose orientation. Camera initial position (30, 3, 40) looking at rocket; horizon behind rocket. If ocean is behind rocket in +? The rocket at origin, camera at positive z looking toward origin (negative z). Behind rocket from camera view is -z direction. Put ocean beyond z=-? So coastline at z=-2000 maybe, ocean extends. But if camera is at z=40 looking north (-z), ocean behind pad at z<-2500. Good. Land plane covers z>-2500. Ocean plane at y=-0.4 extends z<-2000 etc. Need ocean horizon. At low altitude, ocean plane can extend to 30km, horizon at a few km due eye height? Actually camera 3m high, horizon ~6km. Ocean plane 20km visible. Fog/haze.

Need Earth curve at high altitude. Could include earth sphere large, maybe with surface color, and local terrain plane. But at high altitude, camera near rocket, the sphere surface local region at y=0 but its curvature. If we use sphere, local terrain plane may float but at 100km camera sees sphere. Need earth sphere render. Build SphereGeometry(R, 128, 64) centered at (0, -R, 0). Material maybe MeshStandardMaterial with vertex colors? But the sphere's surface at origin (0,0,0) with normal (0,1,0). It extends. At high altitude, the horizon appears as a curve. However the sphere is huge, at 100km camera near (x ~ maybe?) The sphere surface around launch site. Good. But local terrain plane at y=0 will be above sphere surface? At x/z away, sphere drops below y=0, but local terrain plane flat at y=0. At camera low, the plane extends to 20km; okay. At high altitude, flat plane could stick out? It's only 20km, not visible. Need ocean plane maybe 200km; at high altitude it may look flat and cover a large area. Could instead use sphere alone for Earth, but need local detail. We can use large sphere colored with procedural shader that shows land/ocean patterns? Hard but possible. Or use terrain plane only for local area, and sphere for distant earth. At high altitude, the flat plane at y=0 extends 20km around origin; from 100 km, it is a small patch on sphere, okay. Ocean plane maybe local. The sphere will show whole Earth. But if sphere is colored uniform blue, land absent. Need coast visible at low altitude. Could use sphere with a custom shader generating land/ocean and clouds based on spherical position. But no textures. Could create canvas texture for Earth? Maybe use a procedural canvas equirectangular texture with land/ocean patterns, but no external. Could generate a 1024x512 canvas with noise and draw continents approximate (Florida coast etc.). But mapping sphere with equirectangular texture. Might be heavy but fine. Need not overdo. We can make local terrain and ocean and a distant sphere colored blue with a canvas texture for Earth? The Earth sphere at 100km could show blue and green patches. Let's consider.

Need "as realistic as possible ... looks like a launch photograph, not a diagram." We'll add lots of visual detail.

Environment:
- Renderer: antialias, pixelRatio min(2), shadows enabled PCFSoftShadowMap, toneMapping ACES, shadowMap type. Set colorSpace? `renderer.outputColorSpace = THREE.SRGBColorSpace;`
- Scene fog: FogExp2 pale blue, but high altitude need fog change? Fog should fade out at altitude, since no atmosphere? We can update fog density based on altitude. But fog affects distant objects; at high altitude atmosphere less. Need maybe switch fog near altitude. Use `scene.fog = new THREE.FogExp2(0xb9d2e8, 0.00008)` and update density based alt: low 0.00012, high 0.000000? But FogExp2 affects entire scene; at high altitude should be less. We can set density = 0.00012 * Math.exp(-alt/8000). At 100km ~0. Good. But for distant Earth, aerial perspective at high alt? black space. Fine.

- Sky: Own shader maybe with atmosphere. But also need stars above 70/100. Could use Sky addon plus stars. Simpler custom sky dome with shader that blends blue to black based altitude; add star points visible based altitude. Need atmospheric scattering in sky. Use shader dome with gradient horizon. Or use Sky addon with uniforms and update sun position. Sky addon has turbidity, rayleigh, mieCoefficient, sunPosition. Could use it. But we need sky black at 100 km. Sky addon has no altitude parameter; can scale? Might make sky too bright at altitude. Could create own ShaderMaterial dome, with uniforms `altitude`, `sunDir`, and compute atmospheric color. This may be easier to control. But need "atmospheric scattering in the sky (e.g. Sky addon or your own shader)". Our own shader qualifies. Need stars appear above 70/100. Use points or shader dome with stars? Could create starfield Points around camera? Use Points geometry with random positions on huge sphere. Update visibility opacity based on alt. But points could be occluded by sky dome? Use renderOrder? Sky dome is Mesh with side BackSide at large radius. Stars at radius inside or outside? If sky dome at 1e6, stars at radius 2e6 with depthWrite false, but sky dome depthWrite? We can make sky dome render first with depthWrite false, stars render after? Need camera far plane. Units meters, far plane maybe 1e8. With huge earth, camera far maybe 2e7? We can set far = 1e8. Precision issues? Use logarithmicDepthBuffer? With 1 unit=m and far 1e8, near 0.1 yields poor depth. Could use camera near 0.1, far 2e7; depth precision poor. Use `logarithmicDepthBuffer: true` maybe. But with huge sphere radius 6.3e6, okay. Earth center at -R. Camera up to 100km. Far 1e7 enough for stars sphere radius 1e7. Could use near 0.5. Fine.

Sky dome: radius 1e6 maybe less than earth radius? We need sky around camera, but camera rises to 100km. If dome radius 1e6, still. Stars radius 2e6. Earth sphere radius 6.37e6; if camera at 100km, sphere surface below. Sky dome radius 2e6 centered at camera? If dome not follow camera, at altitude 100km near dome? Could attach sky dome to camera? But then stars? Common sky dome centered at origin, radius 1e6; camera at 100km, inside dome. Fine. But Earth radius 6.371e6 centered at -R; its top at origin. Sky dome radius 1e6 would intersect earth? At horizon, earth sphere extends; dome is inside earth? The top of earth at origin; sky dome centered at origin radius 1e6 extends below y= -1e6, inside earth sphere? Hmm if dome sphere centered at origin radius 1e6, lower half is below local ground and inside earth. Not visible? But sky is rendered as background around camera. For camera at origin looking up, upper half visible. At camera at 100km, lower half may be behind earth. Since earth sphere huge centered below, sky dome inside Earth? At 100km above surface, earth sphere top at y=0, camera y=100km; sky dome radius 1e6 centered at origin, lower part maybe below earth surface and hidden. Upper part visible. Fine. But the sky dome not centered on camera; at 100km, direction to dome different, but far enough. Better make sky dome follow camera each frame (position camera), radius 5e5; then horizon gradient relative to camera. But if it moves, need uniform? That's okay. Stars also could follow. But earth remains. Use a large sky sphere centered at camera, rendered with depthWrite false, depthTest false? Or renderOrder -1 and material side BackSide. If depthTest false, sky always behind. The stars need be visible; can render sky with depthWrite false and stars with depthTest false and renderOrder? Transparent order. Simpler create sky dome as scene.background? Could use ShaderMaterial on sphere and set `scene.background` to color? But need gradient and altitude. We can render dome at camera position and radius 1e6 with depthWrite false and renderOrder -1000; stars points radius 1.2e6, depthWrite false, renderOrder -900? Without depth test? Points could be on same huge sphere. But if sky is drawn after stars? Need set renderOrder: sky -100, stars -50, objects 0. Transparent/opaque. For opaque, rendering order by renderOrder; depthTest maybe false. Use `depthTest: false` for sky, `depthWrite:false`. Stars `depthTest:false`, `depthWrite:false`, transparent true. Then draw order: sky first, stars next. They appear on top. But stars will render over earth/rocket? If depthTest false and renderOrder -50, they render before objects; objects overwrite. Good. Since sky first, stars second, objects later. Works. But sky dome should be centered on camera; set position.copy(camera.position) each frame. Stars also follow? Could set stars.position.copy(camera.position) each frame, but earth sphere huge. Star sphere centered camera. Good.

Stars visibility: use custom Points with ShaderMaterial or PointsMaterial with opacity based alt. PointsMaterial has transparent, opacity. Set opacity = smoothstep(60km, 100km, alt) maybe 0 -> 1; but "must appear above about 70 km and clearly visible above 100 km." Use smoothstep(70,100) maybe at 100 =1. At 70 ~0.0. The sky also darkens with altitude. Good. We can create 3000 stars positions random on sphere radius 1e6. Use PointsMaterial size 2? In world at far, size attenuation? If size in pixels; use `sizeAttenuation: false` so stars visible. But points in meter units? Use sizeAttenuation false and size 1.5. Need color white. Need random distribution uniform on sphere. Use spherical. But if centered camera, points always around. We'll update positions? We can set stars.position.copy(camera.position); since the points are local to stars object, they move with camera. That means star directions fixed relative to camera (translation), so stars don't shift as camera moves—fine. But Earth below moves. Good.

Sky shader: Need gradient from horizon pale blue to zenith blue, then darken to black based altitude. The sun maybe. We can compute in fragment based on normalized world direction. Since the dome follows camera, vertex position relative to center. Use varying vWorldPosition. In fragment, normalize(vWorldPosition - cameraPosition?) If dome centered at camera, local position is direction. Simpler vertex: `vDir = normalize(position);` because sphere local coordinates centered at origin, camera at center due position copy, so direction is local position normalized. Good. Then skyColor. Need include sun disk? We can render sun glow from direction. Add sun direction uniform. Use palette:
- low altitude: horizon color (0.72,0.82,0.9) hazy pale; zenith (0.25,0.45,0.75). Add sun brightness.
- high altitude: mix to black. `spaceFactor = smoothstep(10000, 120000, altitude)` maybe at 100km factor ~0.9. But requirement "from blue at ground to black at 100 km" exactly: factor = clamp(alt/100000). However at 20km still blue. Use smoothstep(0,100000,alt). At 100 km factor 1 black. The horizon at ground pale haze. At altitude, horizon glow. Add atmospheric rim. Need stars appear above 70. Sky at 70km factor ~0.7, still dark blue. Good.
- maybe sky shader takes `uAltitude`, `uSunDir`. `h = clamp(dir.y, -1, 1)`. `horizon = pow(1 - max(h,0), 4)` etc. Compute:
```
float h = normalize(vDir).y;
float sky = smoothstep(-0.1, 0.8, h);
vec3 lowHorizon = vec3(0.62,0.74,0.86);
vec3 lowZenith = vec3(0.18,0.38,0.68);
vec3 groundSky = mix(lowHorizon, lowZenith, sky);
vec3 space = vec3(0.0);
float sf = clamp(uAltitude/100000.0, 0.0, 1.0);
vec3 col = mix(groundSky, space, sf);
// sun glow
float sd = max(dot(normalize(vDir), uSunDir), 0.0);
col += vec3(1.0,0.85,0.6) * pow(sd, 256.0) * 0.8 * (1.0 - sf*0.7);
col += vec3(1.0,0.9,0.75) * pow(sd, 16.0) * 0.15 * (1.0 - sf*0.8);
```
But at high altitude, sun visible in space; add. Could include sun disk. Good.

Need bloom. Composer with RenderPass, UnrealBloomPass resolution, strength maybe 0.9, radius 0.4, threshold 0.85. Bloom for flame. Need plume material bright and maybe emissive. Use custom shader or sprites. Need flame and smoke.

Rocket plume:
- Engine plume group at rocket base, oriented along rocket axis? The plume should extend opposite thrust direction (down/back along rocket local -y). Attach to rocket group at y=0, so as rocket rotates, plume rotates with it. But exhaust in world should follow thrust direction, which is rocket's up axis; yes plume extends along local -y from base. Good.
- Need plume grows longer and wider as air thins. Use a cone/mesh with additive shader, plus core point light. At low altitude, bright. As altitude increases, plume length increases to maybe 300m and width. But local plume attached to rocket; scale with altitude.
- Mach diamonds: use a few bright ellipsoids/cylinders along plume or shader stripes. Could implement in shader with sin along length. Use cone geometry with ShaderMaterial additive, transparent, depthWrite false, side DoubleSide. Vertex/ fragment. Need plume shape. Could use several cone meshes with additive material. Simpler: create `plume` Mesh ConeGeometry(radius ~1.8, length 30, open) with material shader. Position local y negative? Cone geometry default apex up? ConeGeometry radius, height, radialSegments, heightSegments, openEnded. It creates cone along y with base at -h/2 and apex +h/2? Actually ConeGeometry is CylinderGeometry(0, radius, height), radiusTop=0, radiusBottom=radius; base at bottom y=-h/2, apex y=+h/2. We want plume expanding away downward from engine; near engine at y=0, far end down at y=-length and radius larger? The exhaust plume is wide far? Actually rocket exhaust expands, but at low altitude is narrower. We can use cone with apex at engine and base down: apex at y=0, base at y=-length. ConeGeometry apex at +h/2, so rotate 180? Set scale etc. Could create geometry with `CylinderGeometry(0.8, 4, length, 16, 1, true)` radiusTop=0.8 at y=+h/2, radiusBottom=4 at -h/2. Position y = -length/2 so top at 0 and bottom -length. Then plume widens downward. Good. But material shader uses local vUv.y: 0 bottom, 1 top? CylinderGeometry uv y from 0 at bottom to 1 at top. We want near engine at top? Hmm.

Use additive shader with alpha based on distance. We can create a plume cone with material:
```
vertex: vUv=uv; vPos=position; ...
fragment:
float y = vUv.y; // 0 bottom (far), 1 top (engine)
float core = smoothstep(0.0,1.0, y);? 
```
Actually near engine bright, far fades. Use intensity = pow(vUv.y, 1.5) maybe top near engine bright. Also radial edge soft? Cone surface only; need volume. Add multiple nested cones with different colors/scales. Or use sprites.

Maybe easier: build plume from sprites: a series of additive sprites along local -y, with sizes, colors, and a bright core. But sprites always face camera, good soft. Use a generated radial gradient canvas texture for particles/glow. For flame, use a custom canvas texture radial gradient yellow-white; sprites with additive blending. Create `plumeGroup` attached to rocket with 20 sprites along -y; update scale/length/altitude. Mach diamonds via small bright sprites at intervals. The plume will look volumetric. But sprites attached to rocket, always face camera. Good. Use CanvasTexture generated at runtime, no external. Need bloom picks up additive bright colors. Use SpriteMaterial with color, blending Additive, transparent, depthWrite false, opacity. But all sprites same texture. Generate `flameTexture` radial gradient white-yellow alpha. Maybe create several textures: soft white smoke, flame, star? Use canvas.

Smoke clouds from pad: many soft particles (sprites) generated with radial gradient, white/gray, transparent, depthWrite false, fog? Should be soft and volumetric. Use Points? Use Sprites individually? Hundreds of sprites each with SpriteMaterial maybe expensive but fine. Could use InstancedMesh with billboard shader for smoke. Simpler: create smoke particles as `THREE.Points` with custom shader and soft circular texture? Points render as circles, size attenuation, alpha texture. But points are flat, always camera-facing, good for soft clouds. Use `PointsMaterial` with map = smokeTexture, transparent, depthWrite false, alphaTest? Points size in world? `sizeAttenuation: true`, size e.g. 20. But points have uniform size; can use shader to vary per-particle size and opacity and drift. Build custom BufferGeometry with attributes: position, velocity, seed, size, life, age? Need animate in CPU or shader. We'll need large billowing clouds rolling sideways then rising. Could simulate ~600 smoke particles CPU with positions/velocities/life. Each frame update and set positions buffer. Render as points with custom shader to texture. But PointsMaterial can have size per vertex only if custom shader. Use `THREE.ShaderMaterial` with attributes `aSize`, `aOpacity`, `aColor`? GLSL. Need texture uniform. Points size in pixels? With sizeAttenuation. Vertex: `gl_PointSize = aSize * (300.0 / -mvPosition.z)` etc. Fragment sample texture. But size in world units? Need point size scaling. We can implement. But easier use sprites? 600 sprites each draw call? SpriteMaterial per sprite maybe same material with color? Sprite color and scale can be per sprite. 600 draw calls maybe okay but heavy. Custom Points is efficient and soft.

However smoke clouds are large near pad, and from moving camera at high altitude maybe not visible. Use points with world positions. Need depth sorting? transparent points not sorted individually; acceptable. But when camera close, points may be huge. Need point size clamp.

Custom smoke shader:
- Use `THREE.Points` geometry with positions, aSize, aOpacity. Material with uniforms map, fog? We can not use scene fog? Points shader can approximate. Could use built-in fog? Use ShaderMaterial with fog: true? Need include fog chunks. Manual.
- Vertex:
```
attribute float aSize;
attribute float aOpacity;
attribute vec3 aColor;
varying float vOpacity; varying vec3 vColor;
void main() {
 vec4 mv = modelViewMatrix * vec4(position,1.0);
 gl_Position = projectionMatrix * mv;
 gl_PointSize = aSize * (600.0 / -mv.z); // scale based on resolution? need uniform pixelRatio? 
 vOpacity = aOpacity;
 vColor = aColor;
}
```
But size in world? `gl_PointSize` pixel. For a particle of diameter aSize meters at distance d, projected pixel size = aSize * (viewportHeight / (2*tan(fov/2))) / d. Use uniform `uScale = renderer.domElement.height * 0.5 / tan(fov/2)`? Actually gl_PointSize = aSize * (height / (2*tan(fov/2))) / -mv.z. Use uniform uPixelScale = (window.innerHeight * pixelRatio?) / (2*tan(fov/2))? renderer's drawing buffer height. Since drawing buffer height in pixels. Need update on resize. Could just use `uSizeScale` passed. For aSize in meters, at 100m, pixel size = size * 600 / 100 = 6*size? With height 1000, fov 55 tan27.5=0.52, scale = 1000/(1.04)=961 => size*961/d. For smoke size 20 at 100m => 192 pixels. Okay. Need max gl_PointSize. Use clamp perhaps.
- Fragment: `vec4 tex = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vColor, tex.a * vOpacity);` with soft radial texture. Add maybe lighting? For smoke, white/gray with fog. We can include fog mixing: compute distance from camera? Use `vFogDepth` from vertex. `fogColor`, `fogDensity` uniforms. Manual:
```
float fogFactor = exp(-fogDensity*fogDensity*vFogDepth*vFogDepth); // exp2
col = mix(fogColor, col, fogFactor);
```
Need update fog density. But if points shader uses fog manually, okay. Smoke near pad mostly not affected. Fine.
- Need blend normal for smoke, depthWrite false. Additive for flame maybe separate.

Could use same Points system for contrail? Trail visible white contrail. Draw line with custom shader or meshes? The trail array can be large (each step, simulation time can be minutes; render loop fps 60, speed 30, maybe 200s sim in ~? At 30x, 200s sim in 6.7 real seconds, 60fps -> ~400 points. At 10x ~1200 points. Fine. After burn coast could go many seconds. Trail array maybe thousands. Use `THREE.Line` with BufferGeometry updated from trail points. But line width 1. Need visible white contrail. Could create a ribbon or use points puffs along trail. Use a line plus billboard points? Simpler: create `THREE.Line` material white, transparent opacity 0.8, linewidth not supported. It will be thin. For contrail, use points puffs sampled from trail, maybe white soft. But requirement "Trail: a visible white contrail behind the rocket, drawn from the trail points." Use Line from trail points plus points? We can draw with a custom shader ribbon? Could use `THREE.Line` with `LineBasicMaterial` white. At high altitude, line width 1 may be barely visible. Add sprite puffs along trail? Could create a `THREE.Line` and update its geometry from trail. Also create trail puffs as Points at trail points with size based on age and altitude? But trail array is points. Could make a tube? Dynamic TubeGeometry from points maybe heavy. Or create a ribbon mesh from trail points with width in world, facing camera? A contrail is volumetric, but line okay. Maybe use `Line2` addon? Not needed. Use a `THREE.Points` with custom shader, size maybe 15m, white with alpha. But trail should persist. At high altitude, puffs can be visible. We can create a separate Points object with positions from trail, aSize maybe grows with index. But if points per trail point, one per step. Use additive? White contrail. Use smokePoints material (normal blending) with white opacity. Create `trailPoints` geometry dynamic; update each frame from trail array. But 1000 points okay. Need one per step? Drawing can use all. Good.
- Trail from `rocket.trail` positions. We can update line geometry and points. Points size maybe 8-20m, opacity 0.4. But at pad, trail near engine? Hmm. Use line too. The contrail should start at engine; our trail points are base positions. At high altitude, points spaced by step dt (sim time * speed / fps). At 30x, 0.5 sec sim per frame, spacing maybe hundreds of m. Points size 20m would be dotted. Line fills. Add line and points. Points puffs maybe size 40 at high alt. Could look. But requirement says drawn from trail points; okay.

Need coast/space environment. Sky driven by altitude. Update fog. Earth sphere. Need local terrain plane. At high alt, camera near rocket; earth sphere visible. Need perhaps hide local flat terrain when above e.g. 20 km? Actually local terrain should be hidden or tiny. Could keep. But local terrain plane and ocean plane at y ~0 might intersect earth sphere and be visible as a flat patch from 100km? It will be small but perhaps okay. It could also stick above earth sphere at distance > ~sqrt(2R*h)? Hmm local plane extends 20km; at altitude 100km, camera sees it as a tiny patch near launch site. Fine, but flat may look unnatural. We can add `localGround.visible = alt < 30000`? But then coastline disappears. At high alt, Earth sphere shows blue/green. We can toggle local terrain visibility when alt < 50km to avoid artifacts. But when camera at 100km, earth sphere visible. Good. Ocean plane maybe hide above 30km. Use sphere with procedural texture.

Earth sphere: Need realistic colors. Could create canvas texture (equirectangular) with generated noise/land shapes. But a detailed Earth texture generated procedurally may be hard. We can create a 2048x1024 canvas with ocean blue base, then add landmasses with noise and green/brown, plus clouds? No external. Could also use vertex colors based on noise in shader. But sphere only visible from space; colored with blue/green patches. Need Earth curve. A simple sphere with a procedural shader using UV and noise is okay. Need local coast? At low altitude, local terrain/ocean planes dominate. At high altitude, Earth sphere.

However, Earth sphere radius 6.371e6 centered (0,-R,0). The camera at altitude up to 100km is far from sphere center. The sphere geometry with radius 6.371e6 and 128x64 segments: segment size ~300km, coarse. Need 256x128 for smooth horizon. At horizon curvature, 128 segments might show facets. Use SphereGeometry(R, 256, 128) (33k vertices) okay. Material maybe MeshStandardMaterial with map? A generated CanvasTexture 1024x512 with noise. But UV mapping standard. Need orient texture so Florida coast at local origin? The sphere center at (0,-R,0); local origin is top of sphere at y=0. The sphere's UV at top? Equirectangular map has top at north pole. We need not exact. Could instead use a custom shader with procedural land based on world normal. But the local origin corresponds to north pole of the sphere? Wait sphere centered at (0,-R,0), radius R. Its top point is (0,0,0), which is the north pole in local sphere coordinates (if y axis). Standard SphereGeometry has poles along y, so top is north pole. If we texture with equirectangular map, the launch site at north pole (unrealistic) but we can rotate sphere so launch site at a latitude ~28°N. But visually from space, we see a giant sphere with texture; the sub-camera point at top is the north pole. That would show polar ice at launch site if texture realistic. Need maybe rotate sphere to put a land area at launch site. But could use procedural with a landmass near top. Hmm.

Alternatively use a large `Mesh` with a custom shader and world-space noise to color Earth by direction. The top point can be land/ocean around Florida. We can create a shader that computes `p = normalize(position)` in local sphere; use noise to create land patches. But making local coast align is hard. Not critical.

Could skip Earth sphere and use a large curved ocean/land via custom shader on a huge plane? At 100km, the horizon curvature visible as a curved edge if we render a sphere. Need curve of Earth. Could create a spherical shell only for distant Earth. Use shader with blue-green noise. Good.

At low altitude, Earth sphere surface near local origin would be at y=0. If we add local terrain plane, it sits above sphere? At origin both y=0. At radius 20km, sphere drops ~31m, local plane at y=0 floats above sphere by 31m. At low camera 3m high, you might see gap? But only at edge of local plane; ocean plane? Maybe hide sphere near low altitude? Actually sphere visible beyond local plane; at distance >20km, sphere surface below y=0; it can serve as ocean horizon. But local terrain plane flat ends at 20km; then sphere surface ~31m lower; ocean might show. Could be okay. Need avoid z-fighting at origin. Set local terrain plane y=0.1, sphere surface y=0. At low, camera 3m, can't see 31m drop at 20km? Might see. Fog hides. Use local terrain size 30km and ocean plane size 200km? At high altitude, hide local. But sphere alone is Earth. Let's use sphere for all terrain/ocean? Need local detail for pad? Use local land plane 20km around pad, ocean plane at y=-0.5 for coast. The sphere huge behind.

Maybe create a local terrain plane with generated texture: green scrub, sand, roads. Need roads and low buildings around. Could draw procedural canvas texture for ground with noise and roads; apply to plane ~10km. But a flat plane with texture. Need roads as meshes maybe. Add roads lines and buildings (low boxes) around pad. Need keep visual.

Let's plan scene objects:

1. Renderer setup, scene, camera. Camera near (35, 4, 45), lookAt rocket at (0, 35, 0). FOV 55, near 0.3, far 2e7 or 5e7. Use logarithmicDepthBuffer? With huge earth sphere and stars, maybe set `logarithmicDepthBuffer: true` to avoid depth issues. But with custom shader materials, need handle log depth? ShaderMaterial not automatically. Use built-in materials for huge sphere/terrain. Custom sky and particle shaders don't need depth? Sky depthTest false; stars depthTest false; smoke near. Use logarithmicDepthBuffer true might affect shadows? Fine. But custom shader for plume/smoke with points depth? They use gl_Position; if log depth disabled in shader, depth may be wrong relative to other geometry. We can avoid logarithmic and use near=0.5, far=1e7. Depth precision at 1e7 with near 0.5: ratio huge, but mostly background. Could set near=1, far=2e7. Terrain and rocket within 1000m? At chase, camera near rocket 100m, ground far 100km; depth precision near okay. Use `logarithmicDepthBuffer: false`. Earth sphere might z-fight with local plane? Use polygonOffset. We'll set camera near 0.5 far 2e7; at 100km, earth surface 100km away. Precision okay? Depth resolution at 1000m with near 0.5: 24-bit depth maybe fine; at 100km, z precision maybe ~10m. Visual okay. Use far 1e8? No. Set far = 20_000_000 (20,000 km). Earth radius 6.3e6, camera 100km; distance to horizon ~1e6. Stars radius maybe 1.5e7. Good. Near=1. Depth ratio 2e7, precision poor at far but okay for broad earth. Could use logarithmicDepthBuffer true; then custom shaders need `#include <logdepthbuf_pars_vertex>` etc. That's extra. I can avoid. Use near=0.5, far=2e7. Might cause z-fighting on distant earth vs sky? Sky depthTest false. Local ground at y=0 and earth sphere near origin same y -> z-fighting? Set earth sphere slightly lower center? At local origin, sphere surface y=0. We can position sphere center at (0, -R - 2, 0) so surface at -2 below local ground. At high altitude, negligible. Good. Local ground y=0.2. Fine.

2. Sun light: DirectionalLight from east/south? Need shadows. Position maybe (120, 180, 80) or similar. Since camera at +z looking north, sun behind? For launch photo, sun maybe high. Set directional light at (200, 300, -100)? Need shadow camera covering pad ~300m. At high altitude, sun shadows irrelevant but light. Use `dirLight.castShadow = true`, shadow map 2048, camera bounds ±200, bias -0.0005. Add hemisphere light for ambient. Add ambient. As rocket ascends, sun light still. Could update shadow camera? Not necessary.

3. Ground: Procedural canvas texture 1024x1024 with green/brown noise, patches. Use CanvasTexture with repeat 20, repeat wrap. MeshStandardMaterial map, roughness 1. PlaneGeometry(20000,20000) rotated -90 at y=0.1. But if plane huge and camera at high altitude, may be visible beyond. We'll toggle visible when alt < 40km? But at 100km, earth sphere. At alt > 40km, hide local ground/ocean. At low altitude, local ground visible. Need maybe use plane size 20x20 km. Use fog to fade. Texture generated with noise; no image. Need roads and buildings around pad. Could draw roads onto ground texture at correct positions? The plane UV maps entire 20km; draw roads maybe as meshes. Add simple roads: dark gray thin planes at y=0.2, maybe lines around pad (a road from south to pad, cross roads). Low buildings: boxes with gray/white materials around, e.g., 20 buildings at distances 200-2000m. Need "roads and low buildings around it." Add road strips at y=0.25, rotated. Maybe road from z=+2000 to z=-2000 through pad? Pad area. Build 3 roads: a straight road along z at x=120; horizontal road at z=300. Use PlaneGeometry(40,4000) rotated -90. Add buildings: group of boxes at x/z, y=height/2, maybe hangar, storage. Use MeshStandardMaterial light gray, metalness .1, roughness .8. Some with roofs. Use simple geometry. Could use instanced? Few enough.

4. Ocean: plane maybe 100,000 x 100,000 at y=-0.2, from z=-? Actually ocean horizon behind pad. The local ground plane covers all; ocean should be beyond coastline. Could create separate ocean plane at y=-0.5 with size 40000, positioned z=-25000? Need coastline line at z=-2500. But ground plane covers entire 20km, including ocean area. Need ground only on land side, ocean on other. Could set ground plane 20km squared centered at origin, and ocean plane 100km squared at y=-0.6, but ground covers ocean. Need either ground plane limited to coastline: make land plane rectangular extending from z=+10000 to z=-3000, x ±10000. Ocean plane covers beyond z<-3000 and sides? Could make land plane 20km x 13km centered z=+3500? Hmm.
   - Coordinate: camera at z=+40 looking toward origin (north, -z). Ocean behind pad at z < -3000 (north). Land for z > -3000. So land plane size x 20000, z 13000, centered at z=3500 (from -3000 to +10000). Ocean plane size 100000 x 100000 at y=-0.5 centered z=-30000? It would be under land? If ocean plane is large, under land plane at y lower; land covers. At z < -3000, ocean visible. At x beyond land, ocean. Good. Set ocean y=-0.6; land y=0.1. Ground plane top. At coastline, hard edge; add beach strip and maybe breakwater. Add a sand-colored plane along z=-3000, width 200m. Add ocean material with procedural small waves? Could use MeshStandardMaterial color blue, roughness 0.2, metalness 0.0, maybe with a generated normal map? No external, could create canvas texture for water ripples. Use standard material with map of blue noise, but at low camera will look flat. Add a custom shader? Not necessary; ocean horizon behind, mostly distant. Use MeshStandardMaterial color #1b4c6b, roughness 0.35, metalness 0.1. At high altitude local ocean hidden.
   - For horizon at low altitude, ocean plane extends 100km, fog/haze covers.

5. Earth sphere: `SphereGeometry(R, 256,128)`, material custom shader or standard. Need maybe procedural shader:
   - Vertex normal/position. Varying vPos.
   - Fragment: use world/local direction `p = normalize(vPos)`. Generate pseudo-random land/ocean. Since sphere coordinates; but top pole = launch site. If we use noise based on p.x/p.z, can create patches. Colors: ocean blue, land green/brown, clouds white. Add lighting? Use simple sun lambert: `float light = max(dot(normal, sunDir), 0.0)`. But sunDir in world. Need vNormal world. Since sphere is huge; material shader. We can use `MeshStandardMaterial` with `map` generated canvas texture. Simpler maybe a canvas texture with land/ocean. We can generate an equirectangular map 1024x512 by drawing a blue base and random blobs. Then sphere standard material with map. But top pole mapping means texture top row at launch site; could make top row land near 28N? Not needed. Actually the sphere is viewed from near the north pole (local top), so we see the top area. If texture top has green/blue patches, okay. But equirectangular at pole is distorted. Use noise texture maybe. Since Earth is far, okay.
   - Alternative use a shader with noise. Need implement noise in GLSL. We can include simple hash and value noise. But strict TS shader string. We'll write GLSL.
   - Earth shader:
```
uniform vec3 sunDirection;
varying vec3 vNormalW;
varying vec3 vPos;
float hash(vec2 p){...}
float noise(vec2 p){...}
float fbm(vec2 p){...}
void main() {
 vec3 n = normalize(vPos); // local sphere normal
 // map to uv based on spherical coords? use n.xz for land
 vec2 uv = vec2(atan(n.z,n.x)/6.283+0.5, n.y*0.5+0.5);
 float land = fbm(uv*6.0 + vec2(3.1,1.7));
 float clouds = fbm(uv*15.0 + vec2(7.3,2.1));
 vec3 ocean = vec3(0.02,0.12,0.25);
 vec3 landCol = mix(vec3(0.1,0.25,0.08), vec3(0.35,0.28,0.15), smoothstep(0.55,0.8, land));
 float isLand = smoothstep(0.52,0.58, land);
 vec3 col = mix(ocean, landCol, isLand);
 // clouds
 col = mix(col, vec3(0.9), smoothstep(0.55,0.75, clouds)*0.5);
 // lighting
 float dif = max(dot(normalize(vNormalW), sunDirection),0.0);
 col *= 0.25 + 0.9 * dif;
 // atmosphere rim
 float rim = pow(1.0 - abs(dot(normalize(vNormalW), normalize(cameraPosition - vWorldPos))), 3.0);? Need camera position.
 gl_FragColor = vec4(col,1.0);
}
```
But with huge sphere, camera inside? Camera is above sphere; normal. Need lighting from sun. At altitude, visible. Add atmosphere rim blue. Need not exact. But local origin at north pole with noise might show ocean/land. At low alt, sphere surface under local terrain; hidden by local. At high alt, Earth sphere. Good.
   - Need vertex shader world normal. Use `vNormalW = normalize(mat3(modelMatrix) * normal); vPos = position;` local pos for pattern. `vWorldPos = (modelMatrix * vec4(position,1.0)).xyz`.
   - Since sphere is at center below, local y top. At launch site, n = (0,1,0). UV y=1. Texture top. Noise. Fine.
   - Fragment should not include fog? At high altitude no fog. Good. Add atmosphere rim. Could use `cameraPosition` built-in. ShaderMaterial automatically provides cameraPosition uniform? In ShaderMaterial, `cameraPosition` built-in yes. Need include? Yes Three injects? Actually ShaderMaterial built-in uniforms available including cameraPosition. Good. Use varying vWorldPos.
   - Need tone mapping? ShaderMaterial not tone mapped unless include tonemapping chunk. But renderer toneMapping applies to built-in materials only? ShaderMaterial fragment doesn't automatically tone map; need include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` maybe. But with OutputPass? If composer OutputPass handles toneMapping, renderer's toneMapping maybe set to NoToneMapping? Let's think. Using EffectComposer and OutputPass: Set renderer.toneMapping = ACESFilmicToneMapping? OutputPass uses renderer.toneMapping? Actually OutputPass shader applies tone mapping based on defines from renderer? Let's recall Three.js OutputPass: constructor maybe reads renderer.toneMapping and outputColorSpace? It uses `toneMapping` in its shader. EffectComposer render target linear. RenderPass renders materials without tone mapping? If renderer.toneMapping is set, built-in materials apply tone mapping in shader. OutputPass then applies again? Typically for post-processing with tone mapping, set renderer.toneMapping = ACESFilmicToneMapping and add OutputPass with renderer.outputColorSpace? In examples they often set `renderer.toneMapping = THREE.ACESFilmicToneMapping;` and add OutputPass; but OutputPass applies tone mapping too? Let's recall: OutputPass is "Output Pass" for tone mapping and color space conversion. It includes `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`. If renderer.toneMapping set, built-in materials also tonemap? Actually WebGLRenderer applies tone mapping in materials only when rendering to screen? Hmm. In the latest Three, `WebGLProgram` includes tone mapping for all materials if renderer.toneMapping !== NoToneMapping. When using EffectComposer, render target, materials still tonemap? I think yes, might double. Many examples for bloom set renderer.toneMapping = ACESFilmicToneMapping and use OutputPass, so likely correct. Maybe RenderPass sets renderer.toneMapping to NoToneMapping? Let's not overcomplicate. Use composer with RenderPass and UnrealBloomPass and OutputPass, set renderer.toneMapping = ACESFilmicToneMapping. Fine. Custom shaders should include tone mapping? If renderer tone maps only built-in, custom will not be tone mapped, could blow out. Add `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`? But if OutputPass also does, double? For ShaderMaterial, you can include. But with composer, custom shader should output linear; OutputPass will tone map. So don't include. For built-in materials, if they tone map early, OutputPass? Hmm. Let's check typical three.js postprocessing example with bloom: They set `renderer.toneMapping = THREE.ReinhardToneMapping;` and use EffectComposer with RenderPass, UnrealBloomPass, OutputPass. And material shaders include tonemapping? I recall WebGLRenderer's tone mapping is applied only when rendering to screen, not to render target? There is a `renderer.toneMapping` and `renderTarget` maybe sets `_currentRenderTarget` and toneMapping? In WebGLProgram, toneMapping define based on renderer.toneMapping and material.toneMapped. It applies to all. But when rendering to render target, maybe still. Hmm. Many examples use `renderer.toneMapping = THREE.ACESFilmicToneMapping` with EffectComposer and OutputPass; okay. We'll follow.

Need custom sky shader at high altitude. Use ShaderMaterial side BackSide, depthWrite false, depthTest false, fog false, toneMapped? For custom shader, output linear; with OutputPass. If renderer applies tone mapping to custom? ShaderMaterial with `toneMapped: false`? Set `toneMapped: false` to avoid double. But then OutputPass applies. For built-in materials, maybe they tone map. Hard to know. We can set `renderer.toneMapping = THREE.ACESFilmicToneMapping` and `material.toneMapped` standard. OutputPass maybe not needed? Could skip OutputPass and just use composer RenderPass + BloomPass, set renderer.toneMapping and outputColorSpace. But bloom pass output may show incorrect color space? Examples include OutputPass for correct. We can use OutputPass.

Let's design particle shaders with custom. Need no TS errors with uniforms. Use `new THREE.ShaderMaterial({uniforms: {...}, vertexShader: `...`, fragmentShader: `...`, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending})`. Uniform values typed as `THREE.IUniform`. For TS strict, object literal with uniforms works? ShaderMaterialParameters.uniforms?: { [uniform: string]: IUniform }. We can assign.

Need functions createCanvasTexture for smoke, flame, ground, markings.

Physics implementation in detail.

Variables:
```
type TrailPoint = { x:number; y:number; z:number };
interface RocketState { t:number; alt:number; vel:number; acc:number; pitch:number; speed:number; }
interface RocketSim {
 reset(): void;
 step(dt:number): void;
 state(): RocketState;
 trail: TrailPoint[];
 paused: boolean;
 speed?: ??? no.
}
```
Need window.__rocket = object. Additional property maybe `getSpeed` not required. We can expose a function? But user expects exactly reset step state trail paused. We can add internal not necessary. But UI needs speed: call `rocket.state().speed`. Render loop uses `rocket.state().speed`. Good. Viewer choice and reset internal. Reset resets viewerSpeed = null.

Physics variables:
```
let t=0, alt=0, vAlt=0, downrange=0, vDown=0, currentMass=m0, lastPitch=0, lastAcc=0;
let viewerSpeed: number | null = null;
```
`state()` returns `{t, alt, vel: vAlt, acc: lastAcc, pitch, speed: getPlaybackSpeed()}`. `lastAcc` computed during step; at t=0 compute acceleration? state should return current. At reset, compute? Use `computeAccel(t, alt)`. But state doesn't need update acceleration? Could compute from current t, alt. Need mass at t, thrust. Use function. But after step with substeps, lastAcc final. At reset set to initial acceleration. Compute.
`computePhysics(t, alt)` returns {mass, thrust, g, pitch}. Need thrust if t < burnTime. For acceleration net vertical. Pitch based on t.
`step(dt)`:
```
if (!(dt > 0)) return;
let remaining = dt;
while (remaining > 1e-9) {
 const h = Math.min(0.02, remaining);
 // use current t for mass/thrust/pitch; maybe mid-point? Could integrate with substeps.
 const m = massAt(t);
 const p = pitchAt(t);
 const thrust = t < burnTime ? Math.min(1.3*m0*g0, 3*m*g0) : 0;
 const g = g0 * Math.pow(R/(R + Math.max(alt,0)), 2);
 const ay = thrust*Math.cos(p)/m - g;
 const ax = thrust*Math.sin(p)/m;
 // integrate semi-implicit? v += a*h; alt += v*h; downrange += vDown*h.
 vAlt += ay*h;
 vDown += ax*h;
 alt += vAlt*h;
 downrange += vDown*h;
 if (alt < 0) { alt=0; if (vAlt < 0) vAlt=0; }
 t += h;
 remaining -= h;
 lastAcc = ay; lastPitch = p;
}
pushTrail();
```
But if integration with alt updated after v, at t=0 to h, alt=0.5*? Fine. But need net vertical acceleration in state maybe at end. Could compute at end. At t=0, vAlt += ay*h, alt positive. Good.
Potential issue burn cutoff at t crossing 200 within substep: using thrust based on t before step means if t=199.99 with h=0.02, thrust for entire 0.02; negligible. Fine.
Mass falls linearly; use t.
Rocket cannot go below pad: if alt < 0 clamp. But if vAlt negative and alt=0, we set vAlt=0; but acceleration might be positive. Good.
Could rocket fall back to pad after long time? Yes after burn, gravity pulls it back eventually. The simulated ascent may last minutes. At some point alt returns to 0. With pitch, horizontal. The requirement not explicit orbit. It may crash; but ascent to space. We can stop? The physics should integrate. Maybe at high altitude, rocket may fall back. But overlay. The camera follows. It's okay. However if it falls to pad, alt clamps at 0 and velocity 0, not physically crash. We can maybe allow. But "ascent to space"; if user waits long, falls. Fine.
Could add drag? Not specified. No.

Trail push: `trail.push({ x: downrange, y: padTop + alt, z: 0 })`? Need world point. Rocket base position = (downrange, padTop + alt, 0). But because pitch, rocket center = base + rotated (0,35,0). requirement trail of rocket perhaps base. For contrail, engine position at base. Use base. But "one per step() call" means even if step dt small. On reset, trail emptied. On step, push. If dt <=0 maybe still push? Probably if dt>0. We'll push after successful dt. If paused, render loop won't call. Good.
Note x coordinate: downrange positive east. Rocket tilts toward +x. The trail point base x = downrange. y=padTop+alt. z=0. But if rocket group is at position (downrange, padTop+alt,0) and rotated, the base point is exactly. Good. At liftoff, trail points along y; visible line vertical. The contrail at low altitude maybe smoke. Fine.

Need rocket object update from physics each frame:
```
const s = rocket.state();
rocketGroup.position.set(s.downrange? need expose x? state doesn't include x. We need x. We can use trail last point? Or internal variable access. The rocketSim object can have extra internal method not in spec? We can just use trailing point for position. Last trail point is base; if trail empty reset. Use `const p = rocket.trail[rocket.trail.length-1]` for base. But trail is array of points. Use p.x, p.y. If no step (paused), trail holds last position. Good. But for initial, reset should push initial point? Requirement trail emptied at reset. Then if paused at t=0 no point. We can set rocket group position initially (0,padTop,0). Use p if exists else (0,padTop,0).
```
Need maybe expose downrange? Not required. Use trail last point. For camera chase, need rocket center. Rocket group's world position and rotation. We can compute center from group localToWorld? Use `rocketGroup.updateMatrixWorld(); const center = new THREE.Vector3(0,35,0).applyMatrix4(rocketGroup.matrixWorld);` Or use group.position plus rotated. Need for camera. Use helper `getRocketCenter`.
Set rocketGroup.position from last trail point? The trail y includes padTop+alt. At t=0, no trail maybe. Set initial position. After step, trail exists. On reset, set.
```
function syncRocketTransform() {
 const last = rocket.trail.length ? rocket.trail[rocket.trail.length-1] : {x:0,y:padTop,z:0};
 rocketGroup.position.set(last.x, last.y, last.z);
 rocketGroup.rotation.z = -lastPitch; // Need pitch current even if no trail? state pitch
 rocketGroup.rotation.z = -rocket.state().pitch;
}
```
But lastPitch is internal; state().pitch. Use s.pitch. If paused and reset, state pitch 0. Good.
But trail point y = padTop+alt. At t0 alt 0 => padTop. Model base at pad top. Good.

Need rocket model orientation: rotation.z = -pitch. It may tilt around base, causing top x offset. The trail uses base point; contrail at engine base. Good.

Rocket model details:

Create `rocketGroup = new THREE.Group(); scene.add(rocketGroup);`
Use materials:
```
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, metalness: 0.15, roughness: 0.55 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x20242a, metalness: 0.3, roughness: 0.6 });
const greyMat = ...
const engineMat = ...
```
Need physically based. Use `envMap`? No environment. We can create a simple PMREM environment? Could use RoomEnvironment from addons? External? Could import RoomEnvironment from 'three/addons/environments/RoomEnvironment.js'; no external assets. But maybe too much. We can set scene.environment from generated equirect? Not needed. Standard materials with directional light. Could add HemisphereLight.

Rocket geometry:
- Main first stage: CylinderGeometry(1.85, 1.85, 40, 32, 1, false) at y=4+20=24? From y=4 to 44. Position y=24. Actually height 40, center 24. Good.
- Bottom engine section: CylinderGeometry(1.85,1.85,4,32) at y=2 from 0 to4. Dark? Maybe white/black. Add 9 nozzle cones at base. Nozzles below base? But model base at y=0; engine nozzles extend from y=0 down to -2? Then rocket base would be below pad. Better set model origin at nozzle bottom? Hmm rocket total 70 includes engines? Need avoid clipping. Set rocketGroup base at pad top; engines attached at y 0.. maybe nozzles from y=1 to -? If nozzles extend below 0, when on pad they intersect pad. We can set rocket base reference at bottom of engines, so nozzles start at y=0 and engine section above. The rocket body cylinder from y=4 to44. Engine section y=0 to4, nozzles within or at bottom. Nine nozzles around y=0.5? Use cone geometry height 1.2 centered y=0.6, so bottom at 0. Good. The engine section body maybe covers. Good.
- First stage body from y=4 to 44, radius 1.85.
- Interstage: y=44 to 48, radius 1.85, dark gray. Actually Falcon 9 interstage is white? Use dark metallic band. Add a darker band at y=42-44? Requirement visible interstage and darker band. Let's create:
  - y=4..42: white first stage.
  - y=42..44: dark band (mesh cylinder radius 1.86).
  - y=44..48: interstage white? Maybe dark? "visible interstage and a darker band" - use interstage dark gray 44-48 and black band 42-44. Good.
  - y=48..58: second stage white (radius 1.85).
  - y=58..62: fairing cylinder maybe radius 1.85->? Use cylinder 58..64 radius 1.85; then nose cone 64..70 radius 1.85 to 0. Use ConeGeometry(1.85,6,32) at y=67. But cone geometry apex at top. Good. Need fairing nose maybe ogive. Use LatheGeometry for smooth ogive? Could create a `LatheGeometry` profile for nose from y=58 to70. But cylinder plus cone is fine. To look realistic, use a custom lathe geometry with radii:
    - y=58 radius 1.85 (bottom)
    - y=60 radius 1.85
    - y=62 radius 1.6
    - y=65 radius 1.15
    - y=68 radius 0.55
    - y=70 radius 0.05
   Build `LatheGeometry(points, 48)` where points are Vector2(radius, y)? Lathe rotates around Y, points (x=radius, y). Good. That makes smooth fairing. Add a cylinder base maybe.
- Add vertical weld lines / details: thin rings with TorusGeometry? Or cylinders at bands. Add a few thin dark rings at y=10, 20, 30, 40 with radius 1.87, height .1? Cylinder. Add a black band at y=42.
- Add grid fins: four small box/dark grid fins near y=42 around body. Could use boxes at angles, dark. A `Grid` with boxes? Low priority.
- Add landing legs: four thin long boxes/cylinders folded along body at y=12, angles. Dark. Maybe use `CylinderGeometry(0.12,0.12,12)` positioned around radius, rotated? Complex. Add simple dark strips along sides.
- Add engine nozzles: nine small cone/cylinders. Arrangement: one center and eight around radius 1.0. ConeGeometry(0.35,1.0,12,1,true) with material dark metallic, position at y=0.5? Actually cone apex? Use `CylinderGeometry(0.25,0.45,1.2,12,1,true)` open-ended, position y=0.6. bottom y=0.0. Fine. Dark inside? Add bright inner? No.
- Add a bit of black soot near base: dark band.
- Markings: create canvas 512x256 or 1024x512. Need flag and lettering. Canvas texture:
  - transparent background? Use `MeshBasicMaterial` or Standard with map. For plane decal on cylinder side. We can create texture with transparent background. Draw "SPACEX" text and US flag. Use canvas fill. But text uses font "sans-serif" built-in (not external), allowed. Need no external fonts. Use `font = 'bold 80px sans-serif'`.
  - Create two decals: US flag at y=35, size 2.2x1.2; "SPACEX" vertical? On rocket side maybe text horizontal. We can place planes at z = radius + 0.01, rotate to face +z? Actually plane default lies in XY plane facing +z. If we put at z=1.86, it faces +z, visible from camera at +z. Good. But the rocket cylinder curves; plane floats slightly outside. Use a plane width 4, height 2.5. For text "SPACEX" maybe plane 5x1.5 at y=25, z=1.87. Add flag plane 2.5x1.4 at y=35. Need also on other side? Camera from +z, fine. Use MeshStandardMaterial map, transparent true, roughness .5, metalness .1, polygonOffset. Use `alphaTest: 0.05` maybe.
  - Marking texture: draw white/black? The body white, so text black. Draw a US flag with blue canton, red/white stripes. Use canvas. Draw "SPACEX" in black. Maybe "FALCON 9". Add.
- Add "Falcon 9" text vertical on the side? Could place plane rotated? Plane default width horizontal; text can be horizontal. Fine.
- Add a dark band at interstage with "FALCON 9" maybe.

Need rocket model orientation and scale. Total height 70. Good.

Plume:
Attach to rocketGroup at y=0.5? Engine nozzles bottom at y=0; plume extends from y=0 downward. Build group `plumeGroup`; add to rocketGroup at y=0. `plumeGroup` local coordinates. It will rotate with rocket. Use sprites with flame texture.

Create `flameTexture` 256x256 radial gradient. Use `ctx.createRadialGradient(128,128,0,128,128,128)` stops: center rgba(255,255,235,1), 0.2 rgba(255,240,180,0.9), 0.5 rgba(255,140,20,0.6), 1 rgba(255,60,0,0). For soft additive.

Create `smokeTexture` 256x256 radial gradient white alpha: center rgba(255,255,255,0.9), 0.35 rgba(255,255,255,0.6), 0.7 rgba(255,255,255,0.2), 1 alpha 0. Maybe add noise? Use radial. For smoke, use multiple with random. Could generate with per-pixel noise? Canvas radial with slight noise maybe. We can create via ImageData to make soft noise puff. Better: draw multiple overlapping radial gradients with varying gray. Simpler radial is okay.

Plume sprites:
- Create maybe 12 sprites along local y. Each `SpriteMaterial({map: flameTexture, color, blending: AdditiveBlending, transparent:true, depthWrite:false, depthTest:true, toneMapped:false?})`. If `toneMapped:false`, not affected by tone mapping? For bloom bright. Fine. SpriteMaterial has toneMapped property? Yes Material.
- Use `sprite.scale.set(width, length?)` but sprites are square aspect; a flame should be elongated. We can use multiple sprites at positions down the plume, each scale with width. Or use a plane mesh with shader for elongated. Sprites can be scaled non-uniform? Sprite scale x/y non-uniform yes. It will scale. Create a chain: near engine, bright white-yellow sprites scale 5x8; further down, wider orange sprites scale 8x14. Since local -y direction. Add 15 sprites from y=-2 to -length, with varying sizes. But sprite always faces camera; chain visible.
- As altitude increases, update plume length and width. At low alt, length ~30m, width ~5m. At high alt, length ~200m, width ~20m. Need scale factor `plumeScale = 1 + clamp(alt/50000,0,3)`? "grows longer and wider as air thins." Use alt factor from 0 to maybe 6 at 100km. For each sprite, base y position times lengthFactor; scale x/y times widthFactor and lengthFactor. Since sprites are square, scaling y for length. The chain positions can be spaced. Use 18 sprites.
- Add a bright core at nozzle: 2 sprites bright white, scale 8. Add flickering intensity with elapsed time: material.opacity = base * (0.75 + 0.25 * noise). For additive, opacity. Use per-sprite phase. Need update with frame time (elapsed). Good.
- Mach diamonds: Add a few small bright sprites along center with color white-blue at intervals, opacity sine. Could be part of chain with alternating scale. Use a separate set of 4 sprites at y=-6,-12,-18,-24 scaled 2x4, color 0xffffff, additive, opacity flicker. Their positions scale with length. Good.
- PointLight at engine: `plumeLight = new THREE.PointLight(0xffaa55, 50, 500, 2)` attached or separate. At low alt, intensity high; as altitude increases maybe still. It lights pad and rocket. But point light with distance 500, intensity maybe 800? In three r155, lighting physically correct? `useLegacyLights` removed? Intensity units. Use high intensity 2000? Directional light 3. PointLight intensity maybe 500. Need not blow. Set 1200, distance 800, decay 2. At engine position. Since attached to plumeGroup, moves. At high alt, no pad. Flicker. CastShadow? PointLight castShadow expensive; maybe false. The launch flame lighting pad: add a large point light near pad? The plume attached to rocket at base, lights pad. At liftoff, engine at y=0.5, point light there. Light pad/rocket. Good. But as rocket ascends quickly, light moves away. Smoke lit? Smoke shader doesn't receive light; we can tint based on flame via vertex colors? Not necessary. Add a ground orange light near pad? Could create a point light at pad with flicker for first 10s to light smoke and pad. But flame attaches. Maybe add `padLight = new THREE.PointLight(0xff7a20, 0, 300,2)` at (0,3,0), intensity based on t<... and alt low. Use for smoke? Smoke shader could include a tint but not lighting. We'll set smoke colors near ground to warm gray. We can update smoke colors? Too much. Use smoke white/gray, point lights affect smoke if using sprites? No. But sprites additive? For normal blending, they don't receive light. Could set color warm near pad? Maybe not necessary.

Smoke system:
Need large billowing clouds from flame trench rolling sideways then rising. We'll implement CPU particle simulation with `SmokeParticle`:
```
interface SmokeParticle { pos: THREE.Vector3; vel: THREE.Vector3; age:number; life:number; size:number; opacity:number; seed:number; }
```
But updating hundreds each frame with Vector3 okay. To render as Points, need arrays positions, size, opacity, color. Use one BufferGeometry with max particles, attributes. Need dynamic draw. Or use sprites? Let's use Points custom shader. Need manage active particles. Use `const smokeParticles: SmokeParticle[] = [];` and arrays of active. To avoid dynamic allocation, maybe fixed arrays. But simple.

Create geometry with `Float32Array(maxSmoke*3)` positions, `Float32Array(maxSmoke)` sizes, opacities, colors? Add color attribute for near-flame warm maybe. But color per particle can be grayscale/warm. Use `aColor` vec3. Shader.

Particle simulation:
- At t < ~25s? Liftoff plume generates smoke continuously. We need spawn smoke from flame trench and around pad. Use a spawn rate per simulated time. But render loop step dt may be large (speed 10/30). The smoke should animate in real time? It's visual, independent of simulated time perhaps. Requirement smoke clouds roll sideways and rise during liftoff. Since playback speed high, smoke should billow. We can update smoke with real delta * maybe speed? To appear realistic, use real time. But as rocket ascends 10s sim, at speed 10 it's 1 real sec, smoke needs billow fast? Maybe update with simulation time? If speed high, smoke evolves faster. But visual can use real time for smoke. Let's tie smoke spawn to simulated t and rocket altitude. For t<~20s (sim), engine near pad, spawn smoke. Since at speed 10, 20s sim = 2 real sec, enough smoke? Need many. Use spawn based on real delta and rocket altitude low (<100m) or t<? But liftoff duration in real time at speed 1 for first 10s, then 10x. Smoke cloud should be large. We can spawn at t<25 with rate ~120 particles/sec real time. At 1x 10s + 10x next 15s=1.5s => total 11.5 real sec, enough 1000 particles. Use max 1200. Good. But if viewer sets x1, t<10? Actually speed choices could be x30 at liftoff? User can choose 30 from start, so smoke spawn only ~0.3s. Not enough. Increase spawn per real time, but still. Could spawn based on simulation time? Spawn rate per sim sec enormous. Better: spawn a lot whenever engine near pad, based on real delta with high rate 300/s and max 1500. At 30x, 10s sim = 0.33s => 100 particles, maybe okay. But smoke needs visible; could also initialize a pre-existing smoke cloud? Hmm requirement "large billowing white steam and smoke clouds that roll sideways out of the flame trench along the ground and then rise." We can spawn from t<30 based on both real and simulated. To ensure at high playback there is smoke, spawn particles per frame while t<25 and altitude<200, maybe 20 per frame. At 60fps, 0.33s -> 400 particles. Good. Use spawn count based on frame count? But motion must use delta/elapsed time, not frame counts. Spawning particles per frame could be considered frame-count. We can use accumulator based on real time: `smokeSpawnAccumulator += dt * rate` where rate maybe 500 particles/sec real; at dt 1/60, ~8 particles/frame. At 30x 0.33s -> 165. Fine. To make massive, use rate 1200, max 2000. At low speed, 12s*1200=14400 capped; max 2000. Enough. Use max 1800.
- Spawn positions: near pad flame trench exits. Need pad has flame trench. We can model trench as a dark rectangular recessed channel along x? Falcon 9 pad has flame trench under rocket. Let's create pad: concrete slab large e.g. 120 x 120 m, height 2m, at y=1? But rocket base at padTop=2.0. A flame trench opening below rocket. Use a dark box opening from x=-8 to8? Need smoke emitted at trench exits: left and right sides along x? The plume goes down into trench and exits sideways. Spawn smoke at positions around x = ±(10 to 30), y=1.5, z random ±10, with velocity sideways outward and up. Also spawn some at base around pad.
- Pad top: Let's define `PAD_TOP = 2.0`. Concrete pad: box 120x2x120 centered y=1.0. Top surface y=2.0. Rocket base at y=PAD_TOP+alt = 2+alt. On pad alt=0, base y=2, nozzles at y=2? The flame trench under, but plume extends downward from y=2 into trench (which is below top?). Model base at top; plume extends to -length and will go through pad initially if length 30. Need flame trench to hide. But visually, plume should go down and out. Could position rocket base above pad with a launch mount gap? For simplicity, pad top y=2, rocket base at y=4? Then plume down to y=-26, through pad. We can make a flame trench cutout: build pad as ring around a central rectangular hole. Instead of a solid box, create concrete pad with a central trench: use two side slabs and end slabs leaving a rectangular hole under rocket. Or use a dark trench box. The plume can go into the hole. Need "concrete pad with a flame trench". Build pad from boxes:
  - Main slab 120x2x120 at y=1? But hole. Could build four slabs:
    - left slab x from -60 to -10? width 50, z length 120; right slab x 10..60; central trench between x=-10..10 along z full length? Flame trench typically runs one direction (e.g., z) with exit. Let's make trench along z: opening width 16 in x, full z? Maybe under rocket central hole 16x40. Smoke exits along z (north/south). But requirement "roll sideways out of the flame trench along the ground" could be along x. Simpler: central rectangular hole 16x40 along z; build pad as boxes around it. Need smoke spawn at trench ends z=±20 with velocity sideways along z. The rocket is at origin; plume down into hole. The hole under rocket extends z=-20..20, x=-8..8. Build pad pieces:
      - left slab: x -60..-8, z -60..60, height 2 -> center x=-34, width 52.
      - right slab: x 8..60 -> center 34.
      - front slab: z 20..60, x -8..8? Wait hole x -8..8, z -20..20. Add front/back small pieces for x within hole width but z outside: z 20..60 and -60..-20, x -8..8. Or just leave a trench through entire z: If we build left/right slabs and no front/back, there's a long trench x -8..8, z -60..60. That's plausible flame trench exiting both ends. Then under rocket open to trench. Good. The pad is two side slabs separated by trench. But camera sees top; the trench dark. Add bottom trench floor at y=-1.5, dark concrete, and side walls. Add flame trench exit ramps? Fine.
      - Pad top at y=2. Side slabs 52 wide x 2 high x 120 long. The gap is 16 wide along x, full z. But rocket needs a launch mount over trench at y=2 maybe. Add a launch mount table under rocket: steel structure 10x2x10? But would block plume. Use four hold-down clamps at corners. Keep rocket base at y=2.8? Hmm.
  - Alternatively set pad top at y=0.5 and rocket base at y=2? Need. Let's use PAD_TOP=2.0. The engine plume starts at base y=2.0. The trench gap under it. Good.
  - Add concrete texture on slabs.
  - Add a dark trench floor at y=0.2 (below top) with width 16, length 120. Add side walls. Add steel flame deflector (angled plate) under rocket to deflect exhaust sideways. Could add a wedge. A flame deflector: a triangular prism under the rocket, dark metal, at y=0.5, oriented. The plume passes through. Good visual.
  - Add launch mount: a steel ring/table at y=2 under rocket? Actually rocket sits on clamps around base. Add 4 small dark boxes at x ±2, z ±2, y=2.1. Fine.

Need smoke spawn from trench exits at z=±30, x random ±6, y~2.5. Velocity: sideways along z outward (z sign) and up. Also some from central base around x? Spawn group.

Smoke particle simulation:
- Spawn particle near trench exit:
```
const side = Math.random()<0.5 ? 1 : -1;
const x = (Math.random()*2-1)*10;
const z = side * (20 + Math.random()*30);
const y = 2.5 + Math.random()*3;
vel = (rand*4, 1+rand*3, side*(8+rand*10))? Wait sideways out along z. To roll sideways out along ground, velocity mostly horizontal z sign, with upward. Also turbulence.
```
But at t=0 rocket plume down; smoke exits both ends along z. Good. Also spawn at x sides? Our trench along z; exits at z ends. "roll sideways out of the flame trench along the ground" yes.
- Some particles spawn at x±? Could add to make billows around pad. We'll spawn at both ends and around.
- Update:
  - age += realDt? If using real time. `life` e.g. 8-20 seconds. To be visible after liftoff at 10x, they may die in real time while rocket ascends. But smoke stays around pad. Use real time. Fine.
  - velocity damping; buoyancy upward; add wind. Position. Scale grows over age: size = baseSize * (1 + age*0.4); opacity = smoothstep in/out. Particles remain until life. Cap max.
  - Need smoke not all rise quickly; some roll sideways then rise. Use velocity y increases with age? We'll model:
```
p.vel.x += (rand...)? no per-frame random maybe.
p.vel.y += (0.6 + p.seed*0.5) * dt; // buoyancy
p.vel.x *= exp(-0.2*dt); p.vel.z *= exp(-0.15*dt);
p.pos += vel*dt
```
But if vel z outward, damping. Good.
- Need update geometry attributes each frame. Use arrays. For each active particle up to MAX, write. For inactive, opacity 0 and size 0. Use `geometry.setDrawRange(0, activeCount)`? If particles die, we can compact array. Simpler use fixed pool and pack active particles into beginning each frame, then setDrawRange(count). Use `smokeParticles` array and filter? Filter allocates. Could maintain fixed array with `alive` and compact into `smokeParticles` by removing dead with swap/pop. Use array of active; update and remove. Then pack attributes. That's okay.
```
for (let i=smokeParticles.length-1;i>=0;i--) { update; if age>life remove with splice? } 
```
Splice per particle O(n) but max 1800, okay. Or swap-pop.
Then write attributes for i< count; set needsUpdate.
- Need spawn using accumulator:
```
let smokeSpawnAccum = 0;
function updateSmoke(realDt: number, t:number, alt:number) {
  const engineActive = t < 25 && alt < 300? Actually after ignition and during ascent. Spawn if (t >= 0 && t < 30) perhaps. At reset t=0. The rocket lifts off. Need smoke at liftoff even t=0. Use t < 40 and alt < 500? At 10x, 40s sim occurs in 3s; smoke visible. Good. Actually engines burn for 200s; but at altitude > few km, exhaust doesn't hit pad. Smoke only near pad when rocket low. Use alt < 500 or t < 30. Use `smokeActive = rocket.state().t < 200 && rocket.state().alt < 600`? At 600m, plume still might hit? No. Use alt < 300. At low speed, 300m reached ~10s; smoke. Good.
  const spawnRate = engineActive ? 900 : 0; // particles/sec real
  smokeSpawnAccum += spawnRate * realDt;
  while (smokeSpawnAccum >= 1 && particles.length < MAX) { spawnSmoke(); smokeSpawnAccum -=1; }
  if !engineActive reset accumulator.
}
```
At 30x, alt 300 reached maybe sim 8s, real 0.27s -> 240 particles. Maybe enough? Could add a pre-seeded smoke cloud at liftoff? To look good, we can spawn many at reset? Requirement only trail emptied, not smoke. But we can initialize smoke on reset? Maybe no; reset should reset whole scene. We can clear smoke. But at first liftoff, we want large cloud quickly. Use rate 1800; at 0.27s -> 486 particles. Good.
Could also spawn 100 at t=0? The cloud should billow from trench. At render start, before liftoff, no smoke maybe? A launch photograph at ignition shows steam. We can spawn some immediately? The simulation starts at t=0, engines thrust. In first frame, generate. Fine.
- Use particle sizes 8-30m and grow to 100m. Points with large sizes. Need soft. Max point size? WebGL max point size maybe 1024. At close camera, sizes huge. Clamp in shader to 1024 maybe. `gl_PointSize = min(size * scale / depth, 1024.0);`. Good.
- Smoke colors: white-gray. At near flame, tinted orange? We can set color based on spawn position / distance to engine and age. Use color attribute. For near trench, warm light gray (1.0,0.95,0.85). As age, white. Could set `aColor` from spawn random, maybe. Use smoke shader with color. Maybe add `vColor` and mix. Good.
- Need smoke lit? Use color uniform light. Fine.

Need maybe "steam and smoke clouds" large. Points can look soft. Use normal blending and alpha. Multiple overlapping. Good.

Flame light update:
- `plumeLight.position` attached to plumeGroup? If attached to rocketGroup, position local (0, 0.5,0); world moves. At high alt, point light still. Set intensity based on throttle and altitude? If t<200 and alt< something? Keep with rocket. It lights rocket itself. But point light attached inside rocket? Need position at engine below base, local y=-2. Attach to rocketGroup. For pad light, add second point light at pad? Could also use plumeLight at engine; at pad lights concrete. It is close. For smoke, not lit. Add `padFlameLight` at (0, 3, 0) with intensity `t<20 && alt<200 ? ... : 0`. It lights pad and rocket. Add a flickering orange point light in trench. Good.
- Flicker via elapsed time noise: `0.75 + 0.25*sin(elapsed*37)+0.15*sin(elapsed*17.3)`.

Plume update:
- Given alt and t, engine on if t<burnTime. But after burn, plume should be zero. At t>200, hide plume and light. At reset, show. While engine on, throttle factor due T cap? At t near 200 throttle reduces. Compute throttle ratio? Not exposed. Could use `t<200`. Flicker.
- Plume length/widen based altitude. `altFactor = clamp(alt/50000,0,1)` maybe. `plumeLen = 30 + 180 * altFactor`; width `1 + 4*altFactor`. At 100km, huge. But at 100km engine off (t=200, alt maybe 100km? Actually burn ends at 200, alt >100km). During burn, alt might be e.g. 100km at 200? We estimated 145km. So altFactor up to 1. Good.
- Update sprite chain positions along local -y. Use base sprite data: for each i from 0..N, `fraction = i/(N-1)`, y = -2 - fraction*plumeLen; scale = width * (0.5+1.5*fraction) maybe plume widens downward. But flame plume usually expands then narrows? At altitude, plumes expand hugely. We'll widen. Sprite scale x=scale, y=scale*1.3. Opacity decreases with fraction and flicker. Color from white-yellow near to orange far. The near sprites bright. Use `material.color.setHex` per sprite? We can create individual SpriteMaterials? Could use same material for all? Color changes per sprite. Need separate materials or set colors per sprite. 18 sprites with own materials okay. Use `new THREE.SpriteMaterial({ map: flameTexture, color: ..., blending: THREE.AdditiveBlending, transparent:true, depthWrite:false, opacity:1, toneMapped:false })`. Each sprite. Update opacity and scale. Need color set based on fraction. Good.
- Mach diamonds: Maybe 5 sprites with bright white-blue, small, placed at fractions, scale 1.5x4, opacity. Add to plumeGroup. Update positions. These are small; use separate array. They should appear at low alt maybe. Use additive. Could be visible.
- Also create an actual cone mesh for core? The sprite chain may be enough with bloom. Add a bright central `Mesh` cylinder/cone with additive shader? Maybe not. Sprites create soft flame. Need "blinding white-yellow core at nozzles fading to orange". The first few sprites bright. Good.

Maybe a bloom pass will make it glow.

Need smoke and plume textures. Canvas texture generation:
```
function makeRadialTexture(size:number, inner:string, mid:string, outer:string): THREE.CanvasTexture {
 const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d')!;
 const g=ctx.createRadialGradient(...); ...
 const tex=new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace? For alpha? Maybe no.
 return tex;
}
```
For flame additive, use white center. For smoke, use white with alpha. Set `tex.wrapS = ClampToEdgeWrapping`. Use `tex.needsUpdate=true`.

Need ground texture:
```
function makeGroundTexture(): THREE.CanvasTexture {
 const size=1024; canvas; ctx; fill dark green; for many circles with green/brown; draw noise; maybe roads? Use repeat wrap. 
}
```
Applying plane texture with repeat. But if we draw noise and use repeat 8, it tiles. Add scrub patches. Need visually green scrub. Use random deterministic? Math.random okay. For texture, noise. Use canvas 1024; fill #3b4a2a; draw 2000 circles with random green/brown alpha; add some dark patches. Then create CanvasTexture; wrap repeat; repeat.set(20,20); anisotropy 4.
But applying to a 20km plane with repeat 20 gives each tile 1km. Good. Need roads around. Add road meshes.

Concrete texture:
```
makeConcreteTexture(): CanvasTexture 512; base #777; noise pixels; cracks lines. repeat 8.
```
Use pad slabs material.

Ocean texture maybe: blue with lighter streaks, repeat. MeshStandardMaterial map. Could create CanvasTexture with blue base and horizontal streaks. Use repeat 40. At low altitude, ocean looks textured. At high, hide. Use ocean plane. Need water not too dark.

Marking texture:
Need alpha transparent. Canvas with `clearRect`; use `globalAlpha` etc. Use draw. For CanvasTexture, set `colorSpace = SRGBColorSpace`. Use MeshStandardMaterial transparent true, map, alphaTest maybe. Need text orientation. For flag:
```
function makeFlagTexture(): CanvasTexture {
 512x256? Draw transparent. At x=0..512? Draw stripes top? 
}
```
For lettering, one texture with both? Simpler two textures:
- `makeMarkingTexture(text:string)`: transparent canvas 1024x256, fill text black, maybe underline. Use font "bold 180px sans-serif". Need plane aspect 5:1. Text.
- `makeFlagTexture`: canvas 256x160, draw US flag: blue rect at top-left, red/white stripes, maybe stars. Use simple white dots. Then apply plane.
The US flag on rocket likely small. We'll use flag plane at y=34, z=1.87, size 2.4x1.5. Text plane at y=25, z=1.87, size 5x1.4. But camera at +z sees. Add also a second text on other side? Maybe not.

Need materials physically based. For markings, `MeshStandardMaterial` with map, transparent true, alphaTest 0.05, roughness 0.7, metalness 0.0, polygonOffset true. But for transparent decals on white, okay. However `alphaTest` requires alpha; CanvasTexture has alpha. Fine.

Potential issue text plane on cylinder at z=1.87 but plane flat; at edges might float. Fine.

Camera:
Need smooth camera motion. We'll use `cameraTarget` and `cameraPosition` current, lerp toward desired each frame using delta. Need preserve initial. Compute desired based on rocket altitude and state.

Define:
```
const camera = new THREE.PerspectiveCamera(55, aspect, 0.5, 2e7);
const camPos = new THREE.Vector3(30, 6, 55);
const camLook = new THREE.Vector3(0, 35, 0);
camera.position.copy(camPos);
camera.lookAt(camLook);
```
Desired:
- Low phase: if rocket alt < phaseAlt (e.g., 80m) and t < maybe 20, camera fixed at (28, 4, 48) relative world, look at rocket center with slight offset. But as rocket rises, if fixed camera at y=4 looking up, okay. Need if rocket exceeds height 200m, still fixed? At alt 80, rocket top 150m, camera can see. After alt > 60m, transition. Use smooth blend parameter `chase = smoothstep(60, 200, alt)`. But altitude grows fast. At low speed first 10s, maybe 100m. Then speed 10. Use blend based on alt or t.
- Chase position: relative to rocket center in world. But need compute rocket center as `rocketGroup.localToWorld(new THREE.Vector3(0, 35, 0))`. With pitch, center shifts. Use target = center. Desired camera = center + offset. Offset might depend on rocket's local orientation? To keep camera side, use world offset (12, -12, 85). But as rocket tilts, camera stays south. Good. Distance sqrt(12^2+12^2+85^2)=87. Within 100. At high altitude, rocket center y huge, camera follows. For view of Earth, y offset maybe -20 (camera below rocket center) looking up? If camera offset y=-15, looking at center, ground below. Good. At low phase, camera near pad at (28, 4, 48) looking at center. To transition, desired = mix(lowPos, chasePos, blend). Look target = mix(lowLook, center, blend) or always center? At low, look at rocket center; at high, look at center. So look always center. The camera position transition. Need if rocket center goes high, lowPos stays. Blend based on alt. At alt 200, chase. But if camera smoothly moves from pad to chase, it will fly upwards alongside rocket. Good.
- However when rocket altitude huge, `center` may be far. `camera.position` lerp in world with factor. Need use exponential smoothing with dt. Use `camera.position.lerp(desired, 1 - Math.exp(-k*dt))`. At high speed, rocket moves fast; if chase desired moves, camera lags maybe. k=3. Need avoid losing. Use k=5. Smooth.
- Need camera lookAt smoothly. Use `lookAt` with smoothed target. `lookTarget.lerp(desiredLook, 1 - Math.exp(-k*dt))`. `camera.lookAt(lookTarget)`. At high altitude, desired look center. Good.
- Need initial camera not too far. Maybe `lowPos = (32, 5, 50)`, target center (0, 35, 0). FOV 55. Rocket fills? Distance ~70m, rocket 70m tall -> 55° vertical field at 70m is 73m, good. Low camera looking up. Good.
- When rocket clears tower, chase offset. If chase camera at (center.x+12, center.y-12, center.z+85) and looks at center, vertical angle up 8°. The plume (down) visible below. Earth below. Good.
- At high altitude, because rocket center y increases, camera y = center-12. The horizon. Good.
- Need camera far. At high alt, Earth sphere radius. Fine.

Need camera near low camera at pad to see smoke. At t=0 rocket at pad. camera low. As rocket ascends, camera could stay low for first 10s, tracking. At speed 10 after 10s, quickly transition. Good.

Need update world environment with altitude:
- `const alt = s.alt`.
- Sky uniform uAltitude = alt.
- Fog density = maybe 0.00009 * exp(-alt/6000). But at high alt, fog near zero. Use scene.fog as FogExp2; update density.
- Local ground/ocean visible if alt < 30000? At high altitude, hide. But camera near rocket at 100km, earth sphere. However if local ground hidden when alt >30km, during ascent from 30 to 100km, earth sphere becomes visible. The local ground disappears abruptly. Could use opacity fade? MeshStandardMaterial transparent? Could set visible = alt < 50000. Abrupt but maybe not noticeable. Better set local ground materials transparent? Not needed. Use `if (alt > 40000) { ground.visible=false; ocean.visible=false; coast.visible=false; } else true`. At 40km, the local ground is small below, but earth sphere visible. The switch may be visible if looking down, but rocket ascending fast. Fine. Could fade by scaling? Hmm.
- Buildings/roads/tower/pad visibility at high alt: they are tiny; can remain, but if local ground hidden, they float. Hide all local details when alt > 40km. Need group `localScene` containing ground, ocean, pad, tower, masts, buildings, roads. Set `localScene.visible = alt < 40000`. But at 40km, rocket at altitude, all local gone. Earth sphere shows. Good. At 100km, pad invisible. The rocket still visible. Trail remains. Smoke likely gone. Good.
- Earth sphere visible always. At low alt, local scene covers. Good.
- Stars opacity: smoothstep(70km, 100km, alt) maybe; at 100, 1. Need stars clearly visible above 100. Use `starMaterial.opacity = THREE.MathUtils.smoothstep(alt, 70000, 100000)`. Or custom: `Math.max(0, Math.min(1, (alt-70000)/30000))`. At 100, 1. Good.
- Sky uniform uAltitude = Math.max(0,alt) and maybe `uSpace = clamp(alt/100000,0,1)`.
- Fog: at 100km no. `scene.fog.density = 0.00012 * Math.exp(-alt/7000)`; at 0, 0.00012; at 100km ~0. But if scene.fog applies to rocket at high alt no issue. Local scene gone. Earth sphere uses ShaderMaterial no fog; okay. Trail line maybe fog true? Use custom trail material with fog? Could set fog false. At high alt, trail white. Fine.
- Background? Scene.background = null; sky dome handles. At high alt, sky dome black.

Need maybe sunlight position and color. At high altitude, sun direction. Use `dirLight.position.set(200,400,-100)`? Need shadows. At high, same. The Sky shader uses sunDir = dirLight.position normalized? But if position is relative to origin, sun direction from scene to light. `sunDirection = dirLight.position.clone().normalize()`. Good. Update? Static.

Need shadow camera: if rocket ascends, shadow not visible after high. But directional light shadow camera fixed around pad. At high, rocket outside, but no issue. Need shadow from sun on pad and rocket. Directional light shadows only for local. Set shadow camera ±200, near 1, far 1000, map 2048. Position at (120, 180, 80) maybe. The sun is behind camera? Camera at +z. If light at +z, shadows cast toward -z. Fine. But sky sun disk maybe at +z; camera looking -z sees sun behind? For launch photo, sun could be behind camera. Hmm. Let's set sun at (-180, 250, -120) (northwest) so sky sun visible? Camera looks north, sun in view. But shadows. Use sunDir normalized (0.4,0.75,0.5)? Let's set directional light at (180, 300, 120) behind camera. Sky sun not visible from launch looking north? If sun behind camera, sky bright. Launch photographs often sun behind. But if sun behind camera, no sun in sky. Fine. We can set sun at (-200, 250, -150) so sun in front/left. Then camera looking north sees sun? At horizon? Might be. Shadows cast toward camera. Good. Let's choose `sunPos = new THREE.Vector3(-220, 260, -160)`. Directional light position. Sky shader sunDir = sunPos.normalize(). Camera looking -z; sun at -z left, visible high. Good.

Need shadows from sun on pad. Light shadow camera at position, target origin. Add target to scene.

Need environment lighting maybe. Add HemisphereLight with sky color, ground color, intensity 1.0. Add ambient 0.2. With physically based materials and ACES, intensity units. Directional light intensity 3.5. Hemisphere 0.8. Point light. Fine.

Need bloom threshold maybe 1.0 to only flame. With ACES, bright white. Use strength 0.7, radius 0.6, threshold 0.85. Need composer resize on window resize. Also renderer size.

Need ensure first frame ready. Use `let firstFrame = true;` in animation loop after `composer.render()`, set `window.__ready = true`. Need check __ready set after first frame rendered. Good.

Need animation loop:
```
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
 const dt = Math.min(clock.getDelta(), 0.1); // real delta clamp?
 const s = rocket.state();
 if (!rocket.paused) {
   const speed = rocket.state().speed; // get current before step? if t<10 speed 1. Need speed for step. If step changes t across 10, uses old speed for whole dt, okay. Use speed before.
   rocket.step(Math.min(dt, 1/30) * speed);
 }
 const state = rocket.state();
 update rocket transform, plume, trail, smoke, environment, camera, UI.
 composer.render();
 if (firstFrame) { window.__ready = true; firstFrame=false; }
});
```
Important: playback speed changes automatically at t=10. If we compute speed before step, at t=9.99 speed 1, step 0.033 -> t=10.02, next frame speed 10. Fine. The render loop must call step(min(delta,1/30)*speed) when not paused. Use `Math.min(delta, 1/30)`. Should use delta from clock. Clamp to avoid huge. Good.
- For smoke update, use real delta (not sim) maybe clamp to 0.05. Use same delta. If paused, should smoke animate? Maybe no? Requirement paused when true render loop does not call step. Smoke could still animate? likely pause should stop flight but smoke maybe continues. Better freeze smoke when paused? Could update smoke only if not paused. But camera still. We'll update smoke with real dt regardless? Pause should pause flight. For visual, freeze maybe. We'll use `if (!paused)` update smoke and plume flicker? Plume flicker can continue. Smoke cloud could billow even when paused, not specified. But okay.
- Need UI update every frame. Create overlay with `div` and text. Use `overlay.innerHTML`? Better textContent for data and separate buttons. We can set `dataDiv.textContent = ...`. Buttons. Need speed. Show T+ mm:ss, altitude km, velocity m/s, speed x. Could include status "LIFTOFF". Need style inline. Since no CSS file, set style properties. Create overlay with background rgba, color white, font. Buttons. Use position fixed top 12 left 12; pointer-events auto. Need not interfere with canvas. Buttons. Use CSS via `style.cssText`. Create `div` with `data` and `speedLabel` and buttons. On click set speed. `button` elements. Need maybe buttons set `rocket` speed internal. We need a function `setViewerSpeed(value: number | null)`. Expose to UI and keydown. But rocket object spec doesn't include. We can implement internal function and use key events. UI buttons call. Reset clears choice. Good.
- Keydown: '1' -> viewerSpeed=1; '2' ->10; '3' ->30. Maybe 'r' reset, 'p' pause? Not required but helpful. Could add. Avoid. Use event listener.
- UI speed: state.speed current. If auto, show x1/x10. Good.
- Buttons styling.

Need TypeScript strict: Avoid implicit any. Use `const ctx = canvas.getContext('2d'); if (!ctx) throw...`. DOM types. Need null assertions? Use `!`. Fine.

Potential issue `THREE.MathUtils.smoothstep(x, min, max)` signature returns number. Good.

Need import `OrbitControls`? Not required; camera auto. No controls. But maybe user can't move. Fine.

Need implement custom shader strings with backticks. Must be careful no TS syntax errors. Use `THREE.ShaderMaterial` with uniforms. For uniforms types, define:
```
const skyUniforms = {
  uAltitude: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.5,0.5,-0.5).normalize() },
  uTime: { value: 0 }
};
```
TS infers `uAltitude: { value: number }` etc. ShaderMaterial expects `IUniform` but structural okay? `IUniform<TValue>` maybe. Object with value number. Good. But when using `skyUniforms.uAltitude.value = alt;` okay. If TypeScript strict, `skyUniforms` inferred object values. Fine.
- For smoke material uniforms, define `uMap: { value: smokeTexture }`, `uScale: { value: 1000 }`, `uFogColor`, `uFogDensity`. Need update. Good.
- For smoke shader attributes: BufferGeometry must have attributes. Use `geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes,1));`. Names. In shader use `attribute float aSize; attribute float aOpacity; attribute vec3 aColor;`.
- `gl_PointSize = clamp(aSize * uScale / max(-mv.z, 1.0), 0.0, 1024.0);` uScale = drawingBufferHeight / (2*tan(fov/2)). We need update on resize. If fov 55, tan 27.5 = 0.5206, scale = h /1.041 = h*0.96. If h=1080, 1037. For size 20 at 100m ->207 px. Good.
- Fragment smoke:
```
uniform sampler2D uMap;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vOpacity;
varying vec3 vColor;
varying float vFogDepth;
void main() {
 vec4 tex = texture2D(uMap, gl_PointCoord);
 float alpha = tex.a * vOpacity;
 if(alpha < 0.01) discard;
 float fogFactor = exp(-uFogDensity*uFogDensity*vFogDepth*vFogDepth);
 vec3 col = mix(uFogColor, vColor, fogFactor);
 gl_FragColor = vec4(col, alpha);
}
```
Need fog. `vFogDepth = -mv.z`.
- For smoke, `transparent: true, depthWrite: false, blending: THREE.NormalBlending, vertexColors: true?` Not needed.
- `uFogColor` update with scene fog color. `uFogDensity` update. Good.
- But `THREE.FogExp2` density formula: factor = exp(-density^2 * depth^2) maybe. Use.

- Stars: Need points with PointsMaterial. But PointsMaterial with `sizeAttenuation: false`, size = 2, transparent, opacity. `depthTest: false`, `depthWrite: false`. But PointsMaterial uses tone mapping? Set `toneMapped:false` maybe. Stars should be white. Add to scene, position copy camera each frame. But if stars are in scene and camera moves, if not following, at high alt stars sphere center origin; camera near 100km; fine. But at 100km, stars radius 1.5e7 centered at origin, still. Could just position stars at camera. Need render before objects? Use `stars.renderOrder = -50`. Opaque? PointsMaterial transparent true. Set `stars.frustumCulled = false`; since centered on camera, maybe. If stars.position.copy(camera.position), frustum culling bounding sphere radius? It may be culled? Set false. Good. Sky dome also `frustumCulled=false`, renderOrder -100.
- Star geometry: random on sphere radius `STAR_RADIUS=8e6`. Need ensure within far plane 2e7. Use 1.2e7. Far = 2e7. Fine. Generate 3000. Uniform sphere:
```
const u = Math.random()*2-1;
const theta = Math.random()*Math.PI*2;
const r = Math.sqrt(1-u*u);
x = r*Math.cos(theta); y=u; z=r*Math.sin(theta);
```
Positions scaled. Good.
- Star opacity = `smoothstep(alt, 70000, 100000)`? Three MathUtils smoothstep(x, min, max). Use `THREE.MathUtils.smoothstep(alt, 70000, 100000)`. At alt 70 ->0, 100 ->1. Good. Maybe stars appear above 70 and clearly above 100. At 100 exactly 1. Good. At 70 no. If strict "above about 70" maybe at 80 some. Fine.
- Need maybe turn off sky gradient at high alt; our sky black. At 100km exactly black. Good.
- Need sky dome radius. If centered at camera and radius e.g. 1.5e6, but far=2e7. Use 1e6. Stars radius 8e6; but sky depthTest false, renderOrder -100. Stars depthTest false, renderOrder -90. Both drawn before objects. Stars are at radius 8e6, but since depthTest false, positions just for projection. Fine. Sky sphere radius 1e6, stars radius 8e6. At camera center, both. But if stars centered at camera too, radius 8e6. Fine.
- Sky shader `vDir = normalize(position)` because sphere centered at origin local; camera at sphere center (since sky.position.copy(camera.position)), so direction is local. Good.
- However the sky sphere is centered on camera but the camera near 0.1? The sphere radius 1e6. Fine.

Need Earth sphere may be hidden by sky? Sky depthTest false but renderOrder -100, drawn first, then objects including earth with depthTest. Earth will overwrite. Good. Stars draw after sky before objects; earth overwrites stars if depthTest true? Earth depthTest true and writes depth; stars drawn earlier with depthTest false, so stars would appear over earth? Wait render order: sky -100, stars -90, earth 0. Stars are drawn before earth. Stars write no depth and are transparent. Then earth draws over them (depthTest of earth against depth buffer: sky/stars wrote no depth; earth writes and covers wherever its screen pixels are). So stars behind earth are covered. Good. But stars that are in front? Stars all at large radius, effectively background. Earth covers. Good.
- Rocket/trail objects draw after. Good.

Need custom shaders and tone mapping: with OutputPass, custom shaders output linear. For sky, colors in linear? We can specify RGB linear values. The sky color values we pick are sRGB-ish but treated linear; with ACES, may look different. We can adjust. It's fine. If no tone mapping for ShaderMaterial, OutputPass applies. Good.

Need earth sphere visibility. At low altitude, local scene hides earth mostly. But the earth sphere huge might still show through gaps? Local ground is 20km, earth sphere below it at y=-2. At the horizon, earth sphere below local plane; could be visible beyond local plane as blue? At low, the ocean plane extends 100km, so covers. The earth sphere under ocean hidden by ocean? Ocean at y=-0.6, earth surface -2. The ocean plane covers. Good. At high, hide local, earth visible. If earth sphere material is custom shader and no fog, at 100km. Good.
- At alt 40km, local hidden; earth sphere at surface origin, camera near rocket. The earth sphere's surface should be exactly y=-2 at local origin, but camera at 40km, so planet below. Good.
- Earth sphere geometry with 256x128, radius 6.371e6. Need orientation so top at origin. Center (0, -R - 2, 0). Top = (0, -2, 0). But local ground y=0. There is a 2m gap. Fine.
- Earth sphere shader pattern: vPos local sphere position. At top n=(0,1,0). Use uv from x,z. At top, uv x maybe arbitrary. We can make top area land maybe. The noise at n.y=1 -> uv y=1, x=0.5. It will show some color. Not necessarily Florida. Fine.

Need local ground texture and ocean. For "Atlantic Ocean on the horizon behind the pad", camera at z positive looking toward origin (north). Ocean at z negative behind pad. With fog, horizon pale. Good. The rocket ascends, camera chase at +z side looking at rocket; ocean behind rocket in -z, visible. Good.
- Pad orientation, tower. Launch tower next to rocket. Place tower at x=-15, z=0? Camera at +z, tower beside. Tower height ~85m, lattice. Use simple lattice structure: vertical beams (4) and horizontal/diagonal beams. Need performance. Create `THREE.Group` with thin boxes/cylinders. Use `BoxGeometry(0.3,0.3,0.3)` etc. Could build 4 columns at corners (x±4, z±4) around tower center. Tower at x=-10? Wait rocket at 0. Tower next to rocket, so maybe tower centered x=-12, z=0, footprint 8x8, height 85. Four columns at x -16..-8, z -4..4. Horizontal beams every 6m. Use boxes: vertical cylinders/boxes. Use `BoxGeometry(0.35, height, 0.35)` at each corner. Horizontal beams: `BoxGeometry(8,0.2,0.2)` between columns along x/z. Diagonal beams for lattice: cylinders/boxes rotated. Could use `LineSegments` with `LineBasicMaterial` for lattice? But should have shadows? Use thin boxes. Maybe create a lattice tower with `THREE.Mesh` thin boxes. 85m tall. Add umbilical arm from tower to rocket at y~40. Add crane top? Keep simple.
- Lightning masts around pad: tall lattice masts (3-4) height 120-150m, placed at around x/z ±70. Use similarly thin boxes/cylinders. Need visible. Build with cylinders and crossbars. Could use `createLatticeMast(center, height, width)`. Add 4 masts. They should be tall. Use dark gray.
- Tower/masts local group hidden at high alt. Need shadow? Thin boxes cast shadow maybe. Enabled. Performance okay.

- Buildings: low boxes around. Maybe 10. Use simple. Add a few roads.

- Flame trench: Build pad as two side slabs and trench floor. Need concrete texture. Let's define pad:
  - `const padGroup = new THREE.Group(); localScene.add(padGroup);`
  - `PAD_TOP = 2.0`.
  - Slab geometry: BoxGeometry(52, 2, 140) left at x=-34, y=1, z=0; right x=34. But width 52, center ±34 => left spans -60..-8, right 8..60. Gap x -8..8 (16m). Good.
  - End slabs? The trench runs full z; slab length 140 from z=-70..70. Good. Pad top y=2.
  - Trench floor: BoxGeometry(16, 0.5, 140) at y=0.25, x=0. Dark concrete. Maybe side walls? The slabs have vertical sides. Add a dark deflector at center under rocket: a wedge. Use `CylinderGeometry`? Maybe a steel ramp. Add `BoxGeometry(14,0.5,3)` rotated? Not necessary.
  - Launch mount: four clamps at x ±3, z ±3, y=2.2 boxes (0.8,1.2,0.8) dark. Maybe rocket base sits above? At y=2.0, clamps around. Good.
  - Add yellow/black hazard markings? Use texture? Could add small stripes.
- Rocket base at y=2.0. Engine nozzles bottom at y=0 local, so world y=2.0. Good. The plume starts at y=2 and goes downward into trench. Since trench gap under, okay. But if plume length 30, extends to y=-28, through trench floor and into ground. It will be visible through the floor? The plume is additive and depthTest true, so hidden behind trench floor/ground? The trench floor at y=0.25 would occlude part. But plume may extend below ground and be hidden. The visible plume down to y=0.25 only ~1.75m, not enough. Need plume should be visible above pad and down into trench. Since ground occludes below, the plume's lower portion hidden. We need more visible flame. Could raise rocket on launch mount above pad, base y=5? Then plume extends down to y=-25, still hidden. We need the trench opening to show plume and smoke. The plume sprites are additive with depthWrite false but depthTest true; if below trench floor, hidden. But the trench is open, and camera at low angle may see into it? Not much. The plume visible above pad from engine down to pad top (2m). That's too short. In reality the plume is visible below the rocket, expanding. We need a larger gap: rocket base elevated above pad maybe 8m on launch mount, with flame trench below. Then visible plume from y=8 down to y=2 (6m) plus trench. Still short. But low camera looking up sees plume against sky above? Actually plume extends downward, hidden by pad. Could make the plume mostly sideways after hitting deflector. Or have the rocket start at pad top but plume length 30, with lower part occluded; the visible portion above pad is from y=2 down to y=2? None. Wait plume group attached at rocket base y=2, extends downward. From camera at (32,5,50) looking at rocket, the pad top at y=2. The plume extends below pad top, hidden by the pad if not in trench. But the trench gap at x -8..8 is open; the camera looking from +z at x=32, sees pad side? The trench is a slot along z; from +z, you might see into it. The plume in the gap could be visible above trench floor at y=0.25. So visible from y=2 to 0.25 (1.75m). Not enough. Need launch mount raises rocket maybe 6m above pad. Then plume visible from y=8 to 0.25 (7.75m). Better. Could set PAD_TOP=2, rocket base y=8? The rocket base at alt=0 should be y maybe 8. Use `PAD_TOP` as launch mount height? But state alt maybe height above ground. We can set `ROCKET_BASE_Y=8` at alt 0, while pad concrete top 2. The rocket sits on a launch mount 6m above pad, with open flame trench below. That is realistic: Falcon 9 sits on launch mount above flame trench. Good. Then `rocketGroup.position.y = padTop?` Use `LAUNCH_BASE = 8`. Physics alt=0 -> base at 8. Trail y=8+alt. Camera sees plume from y=8 down. The flame trench under. The pad top y=2, launch mount has legs. We can add a launch mount table at y=7.5 around base? But plume needs through center. Add 4 support legs at corners x±4,z±4 going from pad to y=7.5, and a ring/table at y=7.5 with hole. The rocket engine at y=8. The plume goes down through the hole. Good.
- Set `BASE_Y = 8.0`. Physics `alt` is altitude above pad/ground? At liftoff alt=0 but base y=8. State alt=0. Overlay altitude 0. This is acceptable (rocket on launch mount above pad). The pad top is 2m. The rocket bottom is 8m above ground. Launch tower height 90m. Fine.
- Need "rocket cannot go below the pad" means alt>=0, base y>=8. Good.
- Trail y = BASE_Y + alt. At liftoff y=8, not 0. Good.
- Camera low at y=5, looking at center y=8+35=43. Good.

Maybe total rocket height 70, base y=8, top y=78. Tower height 90. Clears tower when base y? Top 78 <90; when alt >12, top >90. Good.

Need launch mount structure:
- Add 4 support legs (boxes/cylinders) from y=2 to y=7.5 at x ±4,z ±4, dark gray. Add table ring? Use a box with hole? Could use four beams connecting legs at y=7.0. Add hold-down clamps at y=7.7. Rocket base at y=8. Add a steel deck maybe 12x0.4x12 at y=7.5 with a central hole? Hard. Use four arms around, leaving center open. Good.
- Build mount as `BoxGeometry` beams: two crossing beams under rocket at y=7.5, but would block plume. Could use four diagonal arms. Simpler: four vertical legs and a ring of 4 horizontal beams at y=7.2 around perimeter. Empty center. The rocket base sits on clamps. Good.

Tower at x=-16, z=0, height 90. Umbilical arm reaches to rocket at y=40. Use lattice. Need if rocket tilts, arm stays. Fine.

Lightning masts: e.g., positions (80,0,80), (-80,0,80), (80,0,-80), (-80,0,-80), height 130. Use lattice mast. Need camera near pad sees them. Good.

Roads: Maybe in local scene. Use `MeshStandardMaterial({color:0x555555, roughness:0.9})`, PlaneGeometry(width, length) rotated -90 at y=0.15. Add road from z=+3000 to z=-2000 at x=0? But pad occupies. Maybe a road along x=100 from z=2000 to -1000. Another horizontal. Add centerline? Not needed. Low buildings around. Add buildings at (150,0,200), (200,0,-100), (-250,0,300), etc. Use boxes 20x10x30, colors. Add a few roofs.

Need maybe vegetation: ground texture green scrub, plus some bushes? Could add instanced low cones/spheres around pad. But at camera, ground texture enough. Add maybe 100 low scrub bushes as `InstancedMesh` of IcosahedronGeometry(1,0) green. But the scene should look real. We can add a few bushes to break flatness. Use InstancedMesh with 200 small dark green spheres/cones at random within 2km excluding pad. Need deterministic random? Math.random. Use `THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5,0), material, 200)`. Set matrices at ground y. It may be performance okay. Add localScene. But at high alt hidden. Good. Could also add trees? Florida scrub low. Use varied scales. Add.

Need roads and buildings not too many. Fine.

Need ocean shoreline: Add a beach strip at z=-3000? But our land plane covers from -3000 to +10000. Let's define `landPlane = new THREE.Mesh(new THREE.PlaneGeometry(20000, 13000), groundMat)`, rotated -90, position z = 3500 (center from -3000 to 10000). Since plane geometry width x 20000, height 13000. Rotate x -pi/2. When rotated, plane's height maps to z. Center z = (-3000+10000)/2=3500. Good. Ground y=0. Ocean plane `PlaneGeometry(100000,100000)` at y=-0.5, center z=-30000? If centered at z=-30000, spans -80000..20000; under land. At z>-3000, hidden by land? Ocean y=-0.5 lower, land y=0.1; yes. But beyond x ±10000, ocean visible even on land side. That's okay, coast extends. At z=-3000 coastline. Add beach strip at z=-3000, size x 20000, depth 200, y=0.15, sand color. Add small surf line. Use ocean plane. But ground plane ends at z=-3000; ocean plane starts under. There might be a visible seam. Beach strip covers.

Wait if ocean plane centered z=-30000 spans -80000..20000, under land; at z>10000, ocean visible (behind camera) but okay. The horizon on camera looking north (-z) is ocean. Good. But the ocean plane extends to z=-80000, horizon maybe 80km; fog. Good.

At high altitude, hide local.

Need "Florida coast" maybe ocean behind pad. Good.

Need Earth sphere material and local scene. For Earth, use custom shader. Could use `THREE.ShaderMaterial` with `side: THREE.FrontSide`? Sphere from outside; camera above, sees outside surface. SphereGeometry normals outward. Use FrontSide. The camera is outside sphere? The sphere centered below, camera at y=100km, radius 6.37e6, so camera is outside (distance from center ~6.47e6 > R). Yes, sees front side. Good.
- The sphere is huge; camera might be inside? At y=0, distance to center R+2, outside. Good.
- Shader no fog. Lighting using sunDir. Need maybe atmospheric scattering rim. Use `normalize(cameraPosition - vWorldPos)` viewDir. `rim = pow(1.0 - max(dot(normal, viewDir),0.0), 3.0)`. At horizon, rim. Add blue. But at high altitude, atmosphere thin; still. Fine.
- Add a `clouds` pattern. Need noise GLSL. Implement hash/noise/fbm. In fragment, use `uv = vec2(atan(n.z, n.x)/(2*PI)+0.5, n.y*0.5+0.5)`. At top, n.y=1 -> uv.y=1. The top row. Land = fbm(uv*8 + ...). Use `isLand = smoothstep(0.5,0.56,land)`. Add ice at poles? Not needed. Use ocean and land. Add clouds with `smoothstep(0.58,0.72, clouds) * 0.6`. Add specular? simple.
- Since sphere is enormous, texture not needed.

Need trail update:
- The trail is a `THREE.Line` with BufferGeometry dynamic. Need max points? Trail array can grow unbounded. Use BufferGeometry with positions array allocated maybe 20000 points. At speed 30, 200s sim in ~6.7s, 60fps -> 400 points. Coast after burn maybe 1000s sim? User might leave. Trail could grow large. Need limit. Requirement trail array contains one point per step, don't truncate? They may test array length. Must not truncate array? "trail: array ... one per step() call" implies keep all. Could be thousands. BufferGeometry can handle dynamic. For rendering, update with all points or sample. Use array. If huge, performance. Max maybe if user waits 30x for minutes real, could be 100k. But okay. We can allocate max 50000 and if more, render last? But requirement maybe no. We'll create line geometry positions array with capacity 20000? Need update. For strict, use dynamic arrays. Simpler each frame create Float32Array of trail.length*3. That allocates. Fine for moderate. But if 10000 points, okay. Use preallocated? We can implement `updateTrailGeometry` with capacity and setDrawRange. Need not modify trail. Use `trailLine.geometry` with `position` BufferAttribute capacity 100000? Use dynamic if needed. Could allocate 200000 floats (3*60000). If trail longer, use first? But one point per step still in array. For rendering, use up to capacity. Fine.
- For trail points, positions are base points. Need line material white. Use `LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.55, depthWrite:false })`. At high alt, line. But line width 1. Add trail puff Points with same positions and custom smoke shader? Could use a separate Points with white soft material and aSize based on altitude? The requirement visible white contrail. We can update points geometry with positions and sizes that grow with index and altitude. Use a simple `PointsMaterial({ map: smokeTexture, color:0xffffff, transparent:true, opacity:0.5, size: 10, sizeAttenuation:true, depthWrite:false })`. But size fixed. Better custom shader. Could use the same smoke shader with aSize attribute computed maybe 20 + alt? But trail points persist; the size per point could depend on point altitude. Use a `ShaderMaterial` with attributes aSize, aOpacity, and uMap smoke texture. But color white. Need not fog? We can use. However the trail line might be enough. Add both.
- Trail point size at high altitude: contrail puffs should expand. Use `size = 8 + y*0.0002?` Wait y in meters. At 100km, size maybe 40m. Could use constant 25m. But one per step at 30x spacing ~300m, dotted. Use line plus points. Points may not connect. Could instead interpolate points? Not necessary. The line is continuous. The points add puffs. Use size 30. At low, points near pad could be huge? At 8m y, not. Use custom size maybe `8 + Math.min(40, Math.max(0, (y-1000)*0.02))`. But not necessary.
- Simpler: Use line and a `THREE.Points` with same geometry, PointsMaterial map smoke, size 12, opacity 0.35. But PointsMaterial sizeAttenuation true, size in world units? For PointsMaterial, with sizeAttenuation true, size is in world units? Actually size is in pixels scaled by perspective? It uses size / -mvPosition.z * scale. So size is world-ish. Good. Use size 15. Good.
- Need update trail geometry positions with all points; use dynamic. We can share geometry between line and points? Points and Line can share BufferGeometry. Yes. Create one geometry with position attribute; both `trailLine` and `trailPuffs` use it. Update once. Good. Need one geometry. The positions attribute maybe capacity. Use `const maxTrail = 20000; const trailPositions = new Float32Array(maxTrail*3); const trailGeom = new THREE.BufferGeometry(); trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions,3)); trailGeom.setDrawRange(0,0);` On update, copy up to maxTrail. If trail.length > maxTrail, maybe render last maxTrail? But line should show recent. Requirement drawn from trail points. Use first or last? For contrail, all. Could allocate dynamic: if trail.length > maxTrail, expand. We can implement `if (trail.length > capacity) { capacity = Math.max(trail.length, capacity*2); create new Float32Array and set attribute; }`. But attribute capacity variable. Need TS. Doable.
```
let trailCapacity = 4096;
let trailPositions = new Float32Array(trailCapacity*3);
const trailGeom = new THREE.BufferGeometry();
trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions,3));
function updateTrailGeometry(): void {
 const n = rocket.trail.length;
 if (n > trailCapacity) { trailCapacity = Math.max(n, trailCapacity*2); trailPositions = new Float32Array(trailCapacity*3); trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions,3)); }
 for...; trailGeom.setDrawRange(0,n); trailGeom.attributes.position.needsUpdate = true; trailGeom.computeBoundingSphere? maybe not every frame.
}
```
But `trailGeom.attributes.position` type BufferAttribute; need cast. Use `const posAttr = trailGeom.getAttribute('position') as THREE.BufferAttribute;` then update. Could keep reference. We'll manage. Need `trailGeom.setDrawRange`. Set `trailGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity)`? To avoid recompute/frustum culling. Set `trailLine.frustumCulled=false`, `trailPuffs.frustumCulled=false`. Good.
- For PointsMaterial with map smoke, can use `size: 16, sizeAttenuation:true, transparent:true, opacity:0.35, depthWrite:false, color:0xffffff`. But points not lit. Good.
- Need trail color white. At high alt, white contrail. Good.
- Contrails drift slowly: "the contrail stays in the sky and drifts slowly." Our trail is static, not drifting. Need drift slowly. Could apply a slight drift to trail rendering over time? But trail points stored fixed. Requirement says contrail stays and drifts slowly. We can visually offset older trail points by a wind drift based on age. But trail array points should remain as world points of rocket, not modified. For rendering, we can add drift based on index/time. But if we reconstruct at each frame with drift, older points move. Need know age of each point? Could use time when added. Trail array only {x,y,z}. Can't modify. Add an internal parallel array `trailTimes`? Not exposed. Yes. Maintain `trailAge` or `trailTimes: number[]`. On step push time. Reset clear. For rendering, for each point, drift = (currentT - pointTime) * wind? But if sim time jumps 10x, drift would be huge. Contrails drift in real time slowly. Use chronological index and maybe a small fixed lateral offset increasing with older point? But older points should drift slowly over real elapsed, not sim. We can store `trailRealTimes` using elapsed real time at step. In render loop, use `elapsed`. But step may be called many times per frame? Only once per frame. Good. Record `wallTime` at step call. Then drift offset = (elapsed - wallTime) * windSpeed (e.g., 2 m/s) in x/z and maybe y. But the trail should not deviate too much. At high alt, wind. Add `x + driftX`, `z + driftZ`. However if we use real time, after 60s, old trail drifts 120m; visible. Good. But the newest trail near rocket should not drift much. Good.
- Need also "contrail stays in the sky and drifts slowly". We'll implement with internal `trailTimes` array, same length. `step` push time `clockElapsed?` But physics module doesn't have access to render loop's elapsed. Could use `performance.now()` or a realTime variable from render loop. We can set an internal `realClock` = `performance.now()/1000` at each step. Since step can be called by tests outside render loop, use performance.now? That's fine. Or expose no. Use `const now = performance.now() / 1000;` at step push. Then render uses performance.now. But tests may not care. Simulated. Or use a module-level `visualTime` updated each frame. The trail drift is visual only. We can store `trailRealTime` using `performance.now()/1000`. Good. But if step called manually in tests quickly, times close. Fine.
- In rendering, drift = (now - trailTimes[i]) * 1.5? If a point is 10s old, 15m. Fine. Add small sinusoidal? Not needed. "drifts slowly" okay.
- Use `trailTimes` array not exposed; reset clear. When trail length grows, push. If tests call step without render, drift uses now. Fine.
- But if trail line and puffs positions drift, the contrail no longer exactly from trail points? It's still drawn from trail points with slight wind offset. Acceptable.

Need maybe ensure trail points array object same after reset: `rocket.trail.length = 0`, don't reassign. Good. `trailTimes.length=0`.
- Reset physics t=0, alt=0, vAlt=0, downrange=0, vDown=0, pitch=0, lastAcc initial, viewerSpeed=null, clear trail, clear smoke, reset camera? Not necessarily. But reset should reset flight. Maybe also reset rocket transform. Render loop sync. Smoke clear. Camera will smooth to pad. Could reset camera position too? The requirement reset only flight. But okay. Reset camera to initial for visual? Maybe. We can set current camera to low. But if reset while camera high, it will fly down. Better set camera immediately to low to show launch. We'll in reset call `camera.position.copy(lowCameraPos); camLook.copy(...)`? But reset defined before camera? We can set a flag `cameraSnap = true` on reset. In render loop after reset, snap. But simpler: in reset, if camera exists. Need order. Define rocket object after camera? We can create camera before rocket. Or use closure with `let snapCamera = true`. Reset sets `snapCamera = true`. Render loop if snapCamera, set camera position/look to desired low. Good.

Need expose `window.__rocket` after define. Use:
```
const rocket = { reset, step, state, trail, paused:false };
(window as any).__rocket = rocket;
```
Need TypeScript strict: `(window as any)` okay. But no implicit any? Explicit any allowed. Strict noImplicitAny doesn't disallow explicit any. Fine.
- Expose __scene, __camera, __renderer. Set after creation.
- `window.__ready` after first frame. Use `(window as any).__ready = true;`.

Need `renderer.setAnimationLoop`. Signature accepts XRFrame? callback with time? We can use no params. `renderer.setAnimationLoop(animate);` where `function animate(): void`. Good.
- `THREE.Clock` getDelta. Need update after. Fine.

Need handle resize:
```
function onResize(): void { const w=window.innerWidth; const h=window.innerHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); composer.setSize(w,h); updateParticleScale(); }
window.addEventListener('resize', onResize);
```
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));` Then particle scale maybe use renderer.domElement.height? `renderer.domElement.height` is drawing buffer height. Use `renderer.domElement.height / (2*Math.tan(THREE.MathUtils.degToRad(camera.fov*0.5)))`. But after setSize, domElement.height includes pixel ratio. Good. Use function `updatePointScale()` called on resize and init. `smokeUniforms.uScale.value = ...`. For stars PointsMaterial sizeAttenuation false, no scale.

Need shader compile errors? Let's carefully craft GLSL.

Sky shader:
Vertex:
```
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
```
Since sphere local position centered at origin. Good.
Fragment:
```
uniform float uAltitude;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, -1.0, 1.0);
  float sky = smoothstep(-0.15, 0.75, h);
  vec3 horizon = vec3(0.68, 0.78, 0.88);
  vec3 zenith = vec3(0.16, 0.36, 0.66);
  vec3 ground = mix(horizon, zenith, sky);
  float space = clamp(uAltitude / 100000.0, 0.0, 1.0);
  vec3 col = mix(ground, vec3(0.0), space);
  float sun = max(dot(dir, normalize(uSunDir)), 0.0);
  col += vec3(1.0, 0.84, 0.58) * pow(sun, 512.0) * 2.0 * (1.0 - space * 0.8);
  col += vec3(1.0, 0.78, 0.52) * pow(sun, 16.0) * 0.12 * (1.0 - space * 0.9);
  // haze near horizon
  col += vec3(0.08,0.12,0.17) * pow(1.0 - max(h,0.0), 6.0) * (1.0 - space);
  gl_FragColor = vec4(col, 1.0);
}
```
Need maybe lower hemisphere? At high altitude, ground sphere covers. At low, sky dome lower half may show pale. Fine.
- At altitude 100km, space=1, col black plus sun disk (2.0*(1-0.8)=0.4). Good. Sun disk visible in space. Stars. Good.
- But at altitude >100km, space=1. Fine.

Earth shader:
Vertex:
```
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
 vPos = position;
 vNormalW = normalize(mat3(modelMatrix) * normal);
 vec4 wp = modelMatrix * vec4(position,1.0);
 vWorldPos = wp.xyz;
 gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Fragment:
```
uniform vec3 uSunDir;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vWorldPos;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p) { float v=0.; float a=0.5; for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7,9.2); a*=0.5; } return v; }
void main() {
 vec3 n = normalize(vPos);
 vec2 uv = vec2(atan(n.z, n.x) / 6.2831853 + 0.5, n.y * 0.5 + 0.5);
 float land = fbm(uv * vec2(7.0,4.0) + vec2(2.3, 5.1));
 float clouds = fbm(uv * vec2(18.0,10.0) + vec2(9.2, 3.4));
 vec3 ocean = vec3(0.015, 0.10, 0.20);
 vec3 landCol = mix(vec3(0.08,0.18,0.06), vec3(0.32,0.27,0.13), smoothstep(0.45,0.75, land));
 float isLand = smoothstep(0.52, 0.60, land);
 vec3 col = mix(ocean, landCol, isLand);
 float cloud = smoothstep(0.58, 0.72, clouds) * 0.55;
 col = mix(col, vec3(0.88,0.92,0.96), cloud);
 vec3 nw = normalize(vNormalW);
 float sun = max(dot(nw, normalize(uSunDir)), 0.0);
 col *= 0.18 + 0.95 * sun;
 vec3 viewDir = normalize(cameraPosition - vWorldPos);
 float rim = pow(1.0 - max(dot(nw, viewDir), 0.0), 3.0);
 col += vec3(0.16,0.35,0.7) * rim * 0.8;
 gl_FragColor = vec4(col, 1.0);
}
```
At top point, uv.y=1, uv.x = atan(0/0?) n.x=0,n.z=0 at top? At pole, atan(0,0) undefined. Could ignore. The texture pattern around. At top pole, maybe noise constant. But local site small. Fine.

Need maybe Earth sphere not visible through local scene? local scene with ground plane covers. Good.

Custom smoke shader:
Vertex:
```
attribute float aSize;
attribute float aOpacity;
attribute vec3 aColor;
uniform float uScale;
varying float vOpacity;
varying vec3 vColor;
varying float vFogDepth;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = aSize * uScale / max(-mv.z, 1.0);
  gl_PointSize = clamp(s, 1.0, 1024.0);
  vOpacity = aOpacity;
  vColor = aColor;
  vFogDepth = -mv.z;
}
```
Fragment:
```
uniform sampler2D uMap;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vOpacity;
varying vec3 vColor;
varying float vFogDepth;
void main() {
 vec4 tex = texture2D(uMap, gl_PointCoord);
 float a = tex.a * vOpacity;
 if (a < 0.005) discard;
 float f = exp(-uFogDensity*uFogDensity*vFogDepth*vFogDepth);
 vec3 col = mix(uFogColor, vColor, f);
 gl_FragColor = vec4(col, a);
}
```
Need texture alpha. Canvas radial gradient with white -> transparent. Good. Use `tex.a`.
- For trail puffs, we can use same smoke material? Need a separate Points with same positions but aSize/aOpacity/aColor attributes. Since geometry shared with line but line needs only position. Points needs additional attributes. Could create separate geometry for trail puffs with aSize/aOpacity/aColor. Or make trail line separate geometry and puffs separate. Simpler: create two geometries: one for line positions, one for puffs with same positions + sizes. Update both. Or use trailLine and trailPuffs with separate geometry. Fine.
- For trail puffs, we could just use PointsMaterial to avoid custom attributes. Use `PointsMaterial({map: smokeTexture, color:0xffffff, size:12, sizeAttenuation:true, transparent:true, opacity:0.35, depthWrite:false})`. That is simpler. However PointsMaterial may use point size not based on perspective? It does. Use size 20. It doesn't have per-point size. Fine.
- The contrail should be white. Use line plus puffs. Good.

Need smoke texture with alpha. PointsMaterial map uses alpha. Good.

Need plume sprite texture. For SpriteMaterial map, color, blending Additive. Canvas texture with alpha. Good. The sprite's center is at flame center, radial. Good.

Potential issue using canvas texture with `SRGBColorSpace` for alpha; set `colorSpace = THREE.SRGBColorSpace` for color maps. For additive flame, if sRGB, colors maybe. Fine.
- For CanvasTexture from alpha gradient, set `colorSpace = THREE.SRGBColorSpace`? Probably yes.
- `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()`? renderer created before textures. Can set after. Not needed.

Need ground material: `MeshStandardMaterial({ map: groundTexture, roughness: 0.95, metalness: 0.0 })`. Plane with texture. Need shadows. `ground.receiveShadow = true`. Ground plane at y=0.1. Rocket shadow. Good. Use `ground.castShadow=false`.
- Pad slabs receive/cast shadow. `padMesh.castShadow=true; receiveShadow=true`.
- Buildings cast/receive.
- Tower/masts cast/receive maybe. Thin. Use castShadow true for main columns only to save. Shadow map 2048.

Need smoke particles not cast shadows. Fine.

Need rocket shadows. Set each mesh `castShadow=true; receiveShadow=true`. Use `traverse`.

Need rocket decals receive shadows? Fine.

Need point light flicker. For flame light attached to rocket, `plumeLight.castShadow = false`. intensity. Need if t>=burnTime hide. At t>=200, no flame. Trail remains. Good.

Need after burn, plume hidden. At low altitude? if paused at t=0, plume visible? Engine thrust? Yes. At reset, t=0 and engines should be on. Show plume. Fine.
- But at t=0, state speed 1. Render loop step at 1x. Liftoff. Good.

Need state acceleration after reset. Initial acceleration net vertical: T=1.3*m0*g0=7.0e6? Wait 1.3*550000*9.81 = 1.3*5,395,500 = 7,014,150 N. T/m = 12.753, minus 9.81 = 2.943. So acc ~2.943. Good. With pitch 0. Good.
- At t=0, mass 550k. Good.

Need implement `massAt(t)`:
```
const m = t < BURN_TIME ? M0 + (DRY_MASS - M0) * (t / BURN_TIME) : DRY_MASS;
```
If t negative, clamp. Good.
- `thrustAt(t,m)`: if t >= BURN_TIME return 0; return Math.min(1.3*M0*G0, 3*m*G0);
- `pitchAt(t)`: t <= 10 ->0; u=min((t-10)/140,1); return 0.5 * Math.pow(u, 0.85)? At t=150, 0.5. At t>150, 0.5. But "after 10 it starts to grow", at t=10 pitch 0. Smooth derivative? `Math.pow(u,0.8)` has derivative infinite at u=0, but starts at 0. Fine. Could use smoothstep? smoothstep derivative 0 at start, grows. At t=150, 0.5. Use `0.5 * (u * u * (3 - 2*u))` gives 0.5 at u=1. "starts to grow" derivative 0. Fine. More realistic. Use smoothstep. But gravity turn pitch rate maybe. Use smoothstep. It never decreases. Good.
```
return 0.5 * (u*u*(3.0-2.0*u));
```
At 150 0.5. At 80 u=0.5 ->0.25. Good. Then hold 0.5.

Need acceleration maybe if t>burn no thrust, net vertical negative g. State acc. Good.
- At t=0 with alt=0, a positive. Good.
- If alt < 0 clamp, but never.

Could add drag? Not specified. No.

Need maybe horizontal acceleration, downrange. State doesn't include x but trail. Good.
- For rocket body pitch orientation, use state().pitch. At t=0 zero.
- We also need position x from trail. Trail last point x. But if reset and no trail, x=0. Good.
- Need simulate step may push trail after every step call, but if render loop calls step with dt small and speed, trail points. Good.
- For test, they may call `step(0.1)` 100 times. Trail length 100. Good.
- If paused true, tests may call step manually? paused only render loop. step should still work regardless. Fine.

Need UI overlay creation maybe after all. Overlay style. Use `<div>` and buttons. Since no HTML other than canvas, we create. Need ensure overlay not blocking canvas full? It's small. pointer events auto for buttons. Fine.

Need use no external assets. Good.

Potential issue TypeScript strict with `CanvasRenderingContext2D` and `createRadialGradient`. Fine.
Need no unused variables? `tsc --strict` doesn't have noUnusedLocals by default, but if config includes? The prompt only says tsc --strict, which doesn't enable noUnusedLocals. But could. We can avoid unused. Be careful.

Need implement all types. Let's outline code:

```
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const G0 = 9.81; ...
const PAD_TOP = 2.0;
const LAUNCH_BASE = 8.0;
const BURN_TIME=200;
const M0=550000;
const DRY_MASS=220000;
const R_EARTH=6371000;

type TrailPoint = { x:number; y:number; z:number };
type RocketState = { t:number; alt:number; vel:number; acc:number; pitch:number; speed:number };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(...);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
...
```
Need `renderer.domElement.style.display = 'block'; renderer.domElement.style.position = 'fixed';` maybe. `document.body.appendChild(renderer.domElement);`. Body margin? Could set document.body.style.margin='0'; overflow hidden; background black. Fine.
- Renderer size.

Texture functions.

Order:
1. Constants, scene, camera, renderer, composer.
2. Textures.
3. Materials/objects.
4. Physics / rocket.
5. Smoke system.
6. UI.
7. Animate.

Need ensure `composer` created after renderer and scene/camera. Use renderer.getDrawingBufferSize? For UnrealBloomPass resolution vector `new THREE.Vector2(window.innerWidth, window.innerHeight)`. Good.
- `const renderPass = new RenderPass(scene, camera); const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.6, 0.85); const outputPass = new OutputPass(); const composer = new EffectComposer(renderer); composer.addPass(renderPass); composer.addPass(bloomPass); composer.addPass(outputPass);` Should set renderer.setPixelRatio before composer. EffectComposer uses renderer size. Good.
- `renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;` Need maybe exposure 1.1.
- `renderer.outputColorSpace = THREE.SRGBColorSpace;`

Potential import type issues for `OutputPass`. Usually available. If tsc strict with `moduleResolution` maybe. The prompt expects. Good.

Need add `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
- `renderer.setClearColor(0x0a0e16,1)` maybe. Sky covers.

Need create `sunDirection`. Directional light:
```
const sunPos = new THREE.Vector3(-180, 260, -160);
const sunDir = sunPos.clone().normalize();
const sunLight = new THREE.DirectionalLight(0xfff4e6, 3.2);
sunLight.position.copy(sunPos);
sunLight.target.position.set(0, 20, 0);
scene.add(sunLight.target);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.near = 1; far = 1000; left=-200; right=200; top=200; bottom=-200;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);
```
But sun position at z=-160 (north), while camera at +z looking north. Light behind scene, shadows towards camera. Good. It lights front faces? Rocket front faces facing camera (+z) receive light from -z? Directional light direction from position to target: from -z to origin means light travels +z; faces facing +z are backlit? Hmm. A directional light at position (-180,260,-160) shines toward target (0,0,0), direction (180,-260,160) normalized. The surface normal facing +z dot light direction? The light direction from surface to light is (-180,260,-160) normalized, dot with +z normal is negative -> front (+z) in shadow. Camera at +z would see the shadowed side. That may be dramatic but rocket dark. Better place sun at +z side so camera-facing side lit. Set sunPos = (180, 260, 160). Then light from +z, camera at +z sees lit side. Sky sun behind camera not visible. Launch photographs often sun behind camera. We'll place sun at (220, 310, 180) (southeast) so rocket lit from front-right. Sky sun not visible. Fine.
- But shadow camera. Good.

Could make sun visible in sky? Not necessary. But sky shader sun disk behind camera, not seen. Fine.

Hemisphere light: sky color blue, ground brown, intensity 0.8. `new THREE.HemisphereLight(0xbcd7f0, 0x3a3b2a, 0.9)`. Ambient maybe 0.1. Since physically based, use. Add to scene.

Fog: `scene.fog = new THREE.FogExp2(0xbcd2e8, 0.00011);` Need color maybe pale. At low, horizon hazy. For material fog. Use.

Now textures:
`makeNoiseTexture` etc. Use functions.

Make ground:
```
function makeGroundTexture(): THREE.CanvasTexture {
 const size=1024; const c=document.createElement('canvas'); c.width=c.height=size;
 const ctx=c.getContext('2d'); if(!ctx) throw new Error...
 ctx.fillStyle='#44502e'; ctx.fillRect(0,0,size,size);
 for (let i=0;i<4000;i++){...}
 // draw darker patches, sandy roads? 
 const tex = new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(14,10); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4; return tex;
}
```
Need use deterministic? Math.random. Fine. But texture repeat at plane width 20000, height 13000. Repeat x 20, y 13 maybe. Use 18,12. Each tile ~1km. Good.

Concrete:
```
function makeConcreteTexture(): CanvasTexture { size 512; base gray; 1000 random dots; cracks; repeat 4,8. }
```
Ocean:
```
function makeOceanTexture(): CanvasTexture { 512; base #1b4f6b; horizontal lines; repeat 40,40; }
```
Smoke texture:
```
function makeSoftTexture(inner: string, mid: string, outer: string): CanvasTexture {
 const size=256; const c=...; ctx.clearRect; const g=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
 g.addColorStop(0,inner); g.addColorStop(0.35,mid); g.addColorStop(1,outer);
 ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
 // Add some noise? Could draw small blobs.
 const tex = new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
```
Need `inner` etc. Use rgba strings. For smoke, center rgba(255,255,255,0.95), mid rgba(255,255,255,0.5), outer rgba(255,255,255,0). For flame, center rgba(255,255,240,1), mid rgba(255,220,120,0.85), outer rgba(255,80,0,0). For star? PointsMaterial no map.
- For smoke, radial gradient no noise. Could add fractal puff by drawing several smaller gradients? Better to generate soft volumetric texture with some variation:
```
for (let i=0;i<40;i++) { const x=...; const y=...; const r=...; const g=...; draw radial with alpha; }
```
But easier: use a single radial, looks soft. For volumetric, overlapping points with varied sizes and opacity create shapes. Good.

Marking textures:
```
function makeFlagTexture(): CanvasTexture {
 const w=256,h=160; c.width=w; c.height=h; ctx.clearRect...
 // Draw flag with margin? Fill blue canton, red/white stripes.
 ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,w,h); // stripes
 for (let i=0;i<13;i++){ if(i%2===0) ctx.fillStyle='#b22234'; else '#fff'; ctx.fillRect(0, i*h/13, w, h/13+1);}
 // blue canton
 ctx.fillStyle='#3c3b6e'; ctx.fillRect(0,0,w*0.45,h*0.54);
 // stars
 ctx.fillStyle='#fff'; for... small circles.
 tex... colorSpace.
}
```
Need transparent background? Flag should be full. Use plane with rectangular flag. Fine. Add white border? Not.
- Make text texture:
```
function makeTextTexture(text: string, color: string): CanvasTexture {
 const w=1024,h=256; ctx.clearRect; ctx.fillStyle=color; ctx.font='bold 170px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,w/2,h/2); // maybe draw line
 return tex;
}
```
For text on white body, use black. Need alpha. `CanvasTexture` with transparent background. Use `MeshStandardMaterial({ map: textTex, transparent:true, alphaTest:0.05, depthWrite:false, roughness:0.6, metalness:0.1, polygonOffset:true, polygonOffsetFactor:-1 })`. But if depthWrite false, might not occlude? Decal on body. Fine. Use `side: THREE.DoubleSide`? no.
- Planes: need plane geometry with texture aspect. For text texture 1024x256 aspect 4:1. Plane width 5, height 1.25. Position z=1.86. But plane's default normal +z. It will be at front. Good. For flag aspect 1.6:1. plane 2.2 x 1.375. Position y=36, z=1.87. Text at y=26, z=1.87. The cylinder radius 1.85; plane at z=1.87 may intersect only at center; okay.
- To ensure decals visible from camera +z. Good.

Rocket model:
```
const rocketGroup = new THREE.Group();
scene.add(rocketGroup);
rocketGroup.position.set(0, LAUNCH_BASE, 0);
```
Need `rocketGroup` added to scene, not localScene (so visible high). Its materials shadow.
- Add body mesh etc. Use `new THREE.Mesh(geom, mat)`. Set cast/receive.
- We need `rocketGroup.traverse((obj: THREE.Object3D) => { if (obj instanceof THREE.Mesh) { obj.castShadow = true; obj.receiveShadow = true; } });` TypeScript `instanceof THREE.Mesh` works. Three.Mesh generic? `THREE.Mesh` class. Good.

- Build `lathe` fairing. Need `LatheGeometry(points, 48)`. Points array of `THREE.Vector2`. Place at y? LatheGeometry uses points y as vertical from 0. If points y from 58 to 70, geometry positioned accordingly. Add directly. Good.
```
const nosePoints: THREE.Vector2[] = [ new THREE.Vector2(1.85, 0), ... ];
const noseGeom = new THREE.LatheGeometry(nosePoints, 48);
const nose = new THREE.Mesh(noseGeom, whiteMat);
nose.position.y = 58; // if points y relative 0..12
```
Better points y 0..12; place y=58. Then top y=70. Use radii.
- Cylinder for second stage y=48..58 height 10 center 53.
- Interstage y=44..48 height 4 center 46, dark.
- Band y=42..44 height 2 center 43, dark.
- First stage y=4..42 height 38 center 23.
- Engine section y=0..4 height 4 center 2, dark maybe.
- Nozzles at y=0.6? Since engine section bottom at 0. Add nine. But total height: engine section 0-4, first stage 4-42 (38), band 42-44, interstage 44-48 (4), second stage 48-58 (10), fairing 58-70 (12). Total 70. Good.
- First stage body 38m. Good.

Add details:
- Rings: CylinderGeometry(1.87,1.87,0.12,32) at y=4.1, 10, 20, 30, 41.9, dark? Use dark grey thin. Adds visible bands. Good.
- A darker band at y=4? engine base.
- Grid fins: four boxes at y=41.5, around radius 1.9, size 1.2 x 2.5 x 0.15. Position at angles. To orient around cylinder, use group and rotate? Create a grid fin mesh with BoxGeometry(1.4,2.4,0.12) dark, position at x=0, z=1.9, rotate? Simpler create four meshes at angle θ, position (sinθ*2.0, 41.5, cosθ*2.0), rotation.y = θ, so plane faces outward? Box dimensions: width x, height y, depth z. If at z=2 and rotation.y=0, plane faces +z. Good. At θ=90°, position x=2, z=0, rotation.y = Math.PI/2, plane faces +x. Good. Use 4.
- Landing legs: folded dark strips at y=12, around. Use BoxGeometry(0.25, 12, 0.5) positioned at radius 1.9 and rotated y. Maybe too visible. Add 4.
- Engine nozzles: 9 cones. Arrangement: center at (0,0.4,0) + 8 around radius 1.0. But engine section radius 1.85, so nozzles radius ~1.0. Nozzle geometry `CylinderGeometry(0.22,0.38,1.2,12,1,true)` (radiusTop 0.22 small, radiusBottom 0.38). Position y=0.6 (center), bottom at 0.0 top at1.2. It should be open. Material dark metallic. Maybe `side: THREE.DoubleSide`. Use `new THREE.MeshStandardMaterial({color:0x2a2a2c, metalness:0.8, roughness:0.35, side:THREE.DoubleSide})`. Add inner glow? Not.
- Engine section has 9 nozzles visible below. Good.
- Add a central engine maybe. Fine.

- Markings. Add planes. Need add to rocketGroup. Use `markingMat`.
- Add US flag and text. Maybe second text on other side? Add at z=-1.87? Camera at +z, not needed. But when camera moves around? Camera stays +z. Fine.
- Add a small "NASA"? no.

Tower and pad:
- `localScene = new THREE.Group(); scene.add(localScene);` Contains ground, ocean, pad, tower, masts, buildings, roads, scrub.
- Ground:
```
const groundGeo = new THREE.PlaneGeometry(20000,13000);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.set(0,0.1,3500);
ground.receiveShadow = true;
localScene.add(ground);
```
Wait plane height 13000 centered z=3500 spans z= -3000 to 10000. Good. x ±10000. Good.
- Ocean:
```
const oceanGeo = new THREE.PlaneGeometry(100000,100000);
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x=-Math.PI/2; ocean.position.set(0,-0.5,-30000); ocean.receiveShadow=false; localScene.add(ocean);
```
Will ocean plane extend under land. Good. But at z=-30000 center, spans -80000 to 20000; y=-0.5. At z>-3000, land at 0.1 covers. Good.
- Beach strip: PlaneGeometry(20000,240) at y=0.15,z=-3000? Since land ends at z=-3000. Set rotate -pi/2. position z=-3000. Sand material. The strip spans z -3120..-2880. Good.
- Add a coastal road? not needed.

- Pad: create `createPad()`.
```
const padGroup = new THREE.Group(); localScene.add(padGroup);
const slabGeo = new THREE.BoxGeometry(52,2,140);
const left = new THREE.Mesh(slabGeo, concreteMat); left.position.set(-34,1,0); ...
```
Need top y=2. Good.
- Trench floor: BoxGeometry(16,0.6,140) at (0,0.3,0), dark concrete. It lies below. Add side walls? The slabs sides are visible. Add inner wall panels with dark concrete material maybe. Could add `BoxGeometry(1,2,140)` at x=±8? Already slab sides. Use dark material? The slab side facing trench maybe concrete. Fine.
- Flame deflector: Add a wedge under rocket. Use a `CylinderGeometry(8,8,2,4,1)`? Not. Use a `BoxGeometry(14,1.5,4)` at y=1.2, z=0, rotated? Maybe a steel plate angled. Use `BoxGeometry(14,0.4,8)` at y=0.8, rotate x? Hmm. Could skip.
- Launch mount: 4 legs at x±4,z±4 from y=2 to 7.5:
```
const legGeo = new THREE.BoxGeometry(0.6,5.5,0.6);
for... position y=4.75.
```
Add horizontal beams at y=7.2: boxes `(10,0.4,0.6)` etc around perimeter. Use dark metal. Empty center. Rocket base at y=8. Add clamps at y=7.6 at x±2,z±2, boxes.
- Add umbilical arm? Tower has arm.

- Tower: `createLatticeTower(centerX, centerZ, width, height, beamMat)`. For tower center (-16,0), width 8, height 90. Four vertical columns at x±4,z±4. Use `BoxGeometry(0.35,height,0.35)` at y=height/2+baseY? We want tower from pad top y=2 to y=92. So base at y=2. Height 90. Columns center y=2+45=47. Four corners. Horizontal beams every 6m: at each y, boxes along x and z connecting corners. Use `BoxGeometry(width,0.18,0.18)` at center z ±4? Actually horizontal beams along x at z corners: length width (8) from x -4..4 at z=-4 and +4. And along z at x corners: length width. Also diagonal braces maybe. Need add many. Use small boxes. Good. Could add diagonal braces using cylinders. But okay. Use line material? Thin boxes.
- Add top crane/arm. Add a horizontal arm from tower to rocket at y=40: `BoxGeometry(10,0.4,0.4)` at x=-8? Tower center -16, rocket at 0. Arm extends to x=-6? Need length 16. Position x=-8, y=40, z=0. Add umbilical hose maybe. Fine.
- Lightning masts: create `createMast(x,z,height)`: width 3, base y=0.5, height 130. Four columns, horizontal beams every 10m. Add a pointed top cone? Add `CylinderGeometry(0.2,0.8,4,8)` at top. Use dark gray. Positions: (75,75), (-75,75), (75,-75), (-75,-75) relative. Need not block. Good.

- Buildings: function createBuilding(x,z,w,d,h,color). Box at y=0.1+h/2. Use material. Add roof maybe. Add 8 around. Some at (140,200), (-180,120), (220,-180), (-260,-260), etc. Avoid pad. Add windows? Could add dark strips? Not necessary.
- Roads: road material MeshStandardMaterial color 0x3a3a3a, roughness 0.9. Add planes rotated -pi/2 at y=0.2. Road from z=3000 to -2000 at x=120 width 18. Another horizontal at z=250 from x=-3000 to 3000 width 14. Maybe. Use PlaneGeometry(18,5000). rotate. Good. Add road markings? maybe centerline thin yellow plane. Not necessary.
- Scrub: InstancedMesh of low bushes. Generate 400 instances within x ±8000,z -2000..8000 but avoid pad radius <150? Need deterministic. Use `Math.random`. For each, position x,z; scale random 0.8-3; y=0.2. Geometry `IcosahedronGeometry(1.5,0)` or `SphereGeometry(1.5,6,4)`. Material green. Use `InstancedMesh`. Set matrix with `matrix.compose(position, quaternion, scale)`. Need quaternion random rotation around y. Good. Add. This adds vegetation. `instancedMesh.receiveShadow = true; castShadow = true?` Many shadows maybe; set castShadow false. Fine. Could set count 300. Good.
- Maybe add distant tree line? Not necessary.

- Pad lights? Add small yellow lights? Could add emissive spheres. Not required.

- Launch tower shadow.

Need localScene visibility high: `localScene.visible = state.alt < 40000;` but if localScene hidden, tower, pad, ground gone. The rocket group remains. The smoke maybe should also be hidden? Smoke attached not in localScene. It's a separate Points object in scene. At high alt, smoke particles at pad are far below; still visible small maybe. Fine. At alt >40km, smoke likely dead. Trail puffs. Good.
- Ocean plane if local hidden. Fine.
- At high altitude, Earth sphere visible. Need maybe hide Earth sphere at low? It under local. Keep.

Need Earth sphere material use sunDir uniform. `earthUniforms = { uSunDir: { value: sunDir } }`. But `sunDir` is a Vector3. Good.
- Earth mesh position (0, -R_EARTH - 2, 0), renderOrder? normal.
- `earth.receiveShadow=false; castShadow=false`.
- Sphere material `side: THREE.FrontSide`, `fog: false`. ShaderMaterial supports `fog`? Set false. Fine.

Need sky dome:
```
const skyGeom = new THREE.SphereGeometry(1_000_000, 48, 24);
const skyMat = new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader, fragmentShader, side: THREE.BackSide, depthWrite:false, depthTest:false, fog:false });
const sky = new THREE.Mesh(skyGeom, skyMat);
sky.renderOrder = -1000;
sky.frustumCulled = false;
scene.add(sky);
```
But sphere radius 1e6, camera far 2e7. Good. In animate, `sky.position.copy(camera.position);` But if sky position follows camera, the local vertex `position` normalized direction. Good.
- Since depthTest false, it draws over everything if drawn after? It renders first due renderOrder -1000, but depthTest false doesn't matter. It draws first, then objects draw over. Good.
- Stars `renderOrder = -900`, depthTest false. But stars drawn after sky. Good. Need update stars.position.copy(camera.position) each frame. If sky and stars both follow camera, okay.
- But stars geometry radius 8e6. Camera far 2e7. Good.
- If stars draw after sky with transparent true and depthTest false, they appear. Then objects. Good.
- Need star opacity smoothstep. `starMat.opacity = ...`. PointsMaterial with transparent true, depthWrite false. Good. Need starMat visible? Set opacity 0 at low. Points still draw but alpha 0. Fine. `starPoints.visible = starOpacity > 0.01` maybe. If invisible, no draw. Update. Good.
- Stars appear above 70 km. At 70 exactly 0. Use `smoothstep(70000,100000,alt)`. At 85 ->0.5. At 100 ->1. Good.
- Maybe sky shader at high alt black; stars.

Need camera and sky update order: animate updates physics, rocket transform, environment, camera, then sky.position.copy(camera.position), stars.position.copy(camera.position), then composer.render. Good.

Need `state().speed` returns number, but type `speed: number`. Good.
- getPlaybackSpeed:
```
function getPlaybackSpeed(): number {
 return viewerSpeed !== null ? viewerSpeed : (t < 10 ? 1 : 10);
}
```
- `viewerSpeed` type `number | null`. Set via `setPlaybackSpeed(v: number | null)`.
- UI buttons. Need buttons clickable. `button.addEventListener('click', () => setViewerSpeed(v));`
- Reset clears viewer speed: `viewerSpeed = null;`.
- Note state().speed should return current value. If t<10 and viewerSpeed null ->1, else 10. Good.

Need `step(dt: number): void` may be called with dt large. Use substeps. If dt not finite? Could handle:
```
if (!Number.isFinite(dt) || dt <= 0) return;
```
Need if dt > 10000 maybe too many substeps. Could compute max steps? But physics any dt. The loop with dt huge could freeze. Maybe clamp? Requirement any dt; use substeps of at most 0.02. That implies if dt=100000, 5 million steps, could be slow. But tests won't. Could optimize by doing substeps. Fine. Could cap at 3600? Not specified. Better exactly any dt. We'll do while. If dt=1000, 50000 steps, okay. If 1e6, bad. Not worry.
- Need use `t` for pitch. At t crossing 10, pitch starts. Good.
- Integrate vertical and horizontal. `lastAcc` set to ay at last substep. But net vertical acceleration if alt clamped? still. Good.
- After substeps, push trail with base point. `trail.push({ x: downrange, y: LAUNCH_BASE + alt, z: 0 });` Need if alt<0 clamp. Good.
- `trailTimes.push(performance.now()/1000);` Need import? performance global. DOM. Fine.
- If trail array object same. Good.

- Initial acceleration at reset: compute `accelerationAt(0,0)` returns. Set lastAcc = initialAcc. lastPitch=0. Need state before any step. Good.
- At reset, rocketGroup position sync? We can set in animate. But if test checks __rocket state immediately, good. Trail empty. Rocket group at initial. Fine.
- reset should also clear smoke, trail geometry, maybe reset `smokeSpawnAccum`. Need functions defined before? We can implement reset using `clearSmoke()` etc. Since reset defined earlier? We'll define smoke functions before rocket? Or use closure functions declared below with function hoisting. In JS function declarations hoisted. We can call `clearSmoke()` in reset if function declared later. TypeScript okay. But `smokeParticles` variable must be initialized before reset is called. Reset may be called after init. Fine. We can declare rocket after smoke? Simpler order: create physics object after smoke system? But rocket object needed by animate. We can define smoke before rocket. But smoke needs rocket state for spawning in update; can be later. We can define reset to call `resetSmoke()` declared. Function declaration hoisted, but variable smokeParticles initialized before any external call. Good.
- Camera snap flag.

Need `window.__rocket` type: define interface maybe:
```
interface RocketAPI {
 reset(): void;
 step(dt: number): void;
 state(): RocketState;
 trail: TrailPoint[];
 paused: boolean;
}
```
Then `const rocket: RocketAPI = {...}`. Good. Expose. Tests can call. Good.

Need `window.__scene = scene` etc. TypeScript any. Good.

Need maybe set `(window as any).__rocket = rocket;` after.

Need update UI. `dataEl.textContent`. Use T+ format:
```
function formatTime(t:number): string { const m=Math.floor(t/60); const s=Math.floor(t%60); return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; }
```
Show `T+ ${formatTime(t)}   ALT ${(alt/1000).toFixed(2)} km   VEL ${vel.toFixed(0)} m/s   SPEED x${speed}`.
Maybe acc too? Not required. Show speed. Use text. Add buttons. Need avoid `innerHTML`? Use elements. Fine.
- Overlay background: `rgba(6,10,18,0.55)`, border, backdropFilter. Use CSS not supported? Fine. `backdropFilter` property in CSSStyleDeclaration maybe TypeScript? Setting via `style.cssText` avoids. Use `dataEl.style.cssText = ...`. `overlay.style.cssText = 'position:fixed; left:14px; top:14px; ...'`. Buttons style. Fine.
- Button container flex. Add three buttons with labels x1 x10 x30. `button.style.cssText = '...'`. Add click.
- Maybe add "PAUSE" button? Not required. Could add. Use key `p`. But no.
- Need speed auto display. Good.
- Need if viewer speed set, button active? Could update styles. Not necessary. Could highlight by setting border. But update each frame? Simpler not.

Need starfield:
```
const starGeom = new THREE.BufferGeometry(); const starPositions = new Float32Array(4000*3); ...
const starMat = new THREE.PointsMaterial({color:0xffffff,size:1.5,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,depthTest:false});
const stars = new THREE.Points(starGeom, starMat); stars.renderOrder=-900; stars.frustumCulled=false; scene.add(stars);
```
Wait PointsMaterial `sizeAttenuation:false` size is in pixels. Good. At 4000 stars. Need random.
- If stars centered at camera, local positions on sphere radius 8e6. Camera at 100km, radius. Good.
- When camera moves, stars.position.copy(camera.position). Direction constant. Good.
- At high altitude, stars visible. The Earth sphere may cover lower hemisphere; stars above horizon. Good.
- Sky shader drawn first. Stars after. Good.

Need sky render order with composer? RenderPass will render scene. `renderOrder` works. Good.

Need maybe use `scene.background = new THREE.Color(0x05080f)`? Sky covers. If sky not covering lower? Sky sphere full. But if camera outside sky? no. Set background black for space. Fine.
- `scene.background = new THREE.Color(0x05080f)`? At high, sky black. But if sky depthTest false draws. Fine. Use null? Use color. I'll set `scene.background = new THREE.Color(0x05080f)`? But at low, sky overwrites. Good.

Need update fog density and color. `scene.fog` type `THREE.FogExp2`; need cast:
```
const fog = new THREE.FogExp2(0xc3d7e8, 0.00012);
scene.fog = fog;
...
fog.density = 0.00012 * Math.exp(-alt/7000);
```
`scene.fog` is FogBase | null. We have `fog` const. Fine.
- For smoke uniform fog: `smokeMat.uniforms.uFogDensity.value = fog.density; uFogColor.value.copy(fog.color);`
- For points shader, need `uFogColor` value type Color. Good.

Need atmospheric haze on local scene. FogExp2 at low. Good.

Need maybe update sun light shadow if rocket goes high? At high alt, rocket outside shadow camera, no shadow. Fine. But rocket still lit. Good.

Need maybe update camera near/far as altitude? Not needed. Far fixed.

Potential issue Earth sphere radius 6,371,000 and camera far 20,000,000. Fine. But sky sphere radius 1,000,000 centered camera, at high alt it is smaller than Earth? Camera at 100km, sphere radius 1e6, stars radius 8e6. Earth radius 6.37e6 centered below. At high alt, Earth surface distance to horizon ~1.1e6. Earth sphere extends far. The sky sphere centered camera radius 1e6 might be inside the Earth sphere? Since Earth sphere is huge and camera above; the sky sphere around camera of radius 1e6. The Earth's surface below is about 100km away, so the sky sphere lower half intersects Earth. But sky depthTest false and drawn first; Earth draws over lower half. Upper sky visible. Fine. But the sky sphere radius 1e6 is smaller than Earth horizon distance 1.1e6; the horizon in sky shader not aligned. But sky shader just direction. Good.
- Stars radius 8e6 centered camera, Earth sphere may cover lower. Fine.

Need camera chase offset and orientation. Let's define:
```
const lowPos = new THREE.Vector3(28, 5.0, 46);
const lowLookOffset = new THREE.Vector3(0, 35, 0);
const chaseOffset = new THREE.Vector3(14, -14, 88);
```
But camera at +z side looking north. Rocket tilt toward +x. The plume extends opposite rocket axis: down and -x. Camera at +z sees profile. Good. The rocket center local (0,35,0). The chase offset (14,-14,88) distance sqrt(196+196+7744)=90.3. Within 100. Good.
- As rocket tilts, look at center. Camera offset world +z. Good.
- Low camera desired position: fixed (28,5,46). If rocket center moves to x maybe 0, y 8+70=78. Look at center. At t=0 center y=8+35=43. Camera y=5, look up. Good.
- Blend factor: `const chase = THREE.MathUtils.smoothstep(alt, 60, 200);` At alt >200, full chase. At 100m, 0.5. The rocket at 100m top ~? Camera transition. Good.
- Desired camera = lowPos.clone().lerp(chasePos, chase). But lowPos fixed and chasePos moves up. At alt=100, desired halfway, camera may be at y ~? chasePos y = center-14, center ~8+100+35? Wait center = base+35 rotated. At alt 100, base y=108, center y~143, chase y=129. Mix with low y=5 at 0.5 ->67. Camera moves up rapidly. At alt=200, full chase y ~229. The camera transitions over 140m altitude, maybe within 0.2s at speed 10. That's fast but okay. We use smoothing. Need "once clears tower" around alt 100? Tower height 90; rocket top clears when alt >12. Hmm our transition at 60-200 is after clearing. Good.
- But at alt 60, rocket top y=60+8+70=138 > tower 92. Cleared. Start transition. Good.
- At liftoff camera tracks rocket by look target. It may look up steeply. Good.
- After full chase, camera follows. If rocket altitude >100km, center y high. Camera same. Earth below. Good.

Need camera smoothing with snap:
```
if (snapCamera) { camera.position.copy(desired); camLook.copy(target); snapCamera=false; } else { const k = 1 - Math.exp(-4.0*dt); camera.position.lerp(desired,k); camLook.lerp(target,k); }
camera.lookAt(camLook);
```
At low speed dt ~0.016, k~0.062, smooth. At high speed rocket moves fast; camera lags. Need maybe k=8. Use 6. `1 - Math.exp(-6*dt)`. At 60fps k~0.095. Good.
- But at high speeds, desired camera jumps; maybe lag 0.5s. Could use k=12. Use 8. Fine.
- Camera target uses rocket center computed from group matrix. Need update matrix after setting position/rotation. `rocketGroup.updateMatrixWorld(true); const center = new THREE.Vector3(0, 35, 0).applyMatrix4(rocketGroup.matrixWorld);` But rotation.z = -pitch. If pivot at base, center local (0,35,0) rotates. Good. Need also maybe look at center + slightly up? The rocket center. Good.
- The local vector is in group coordinates. Use `const centerLocal = new THREE.Vector3(0,35,0);` Each frame allocate. Could use preallocated. Fine.
- At liftoff, center y = base+35. Good.

Need rocket group position from trail last. But if paused and no trail, initial. Use function:
```
function syncRocket() {
 const s = rocket.state();
 if (rocket.trail.length > 0) { const p = rocket.trail[rocket.trail.length-1]; rocketGroup.position.set(p.x,p.y,p.z); } else { rocketGroup.position.set(0, LAUNCH_BASE, 0); }
 rocketGroup.rotation.z = -s.pitch;
 rocketGroup.updateMatrixWorld(true);
}
```
But state pitch and trail. Note trail point is base world. Good.
- On reset, trail empty, position initial. But render loop will call sync. Good.

Need localScene visible based on alt. If local hidden at 40km, rocket may be far above. Good.
- At reset if alt 0, local visible.
- At high, smoke points maybe still visible? They are separate. Could hide smoke when local hidden? `smokePoints.visible = state.alt < 50000`? But smoke could be in atmosphere. At high alt, not. Do that. `smokePoints.visible = localScene.visible`? At 40km, no smoke. Good.
- Trail points visible always.

Need update plume:
```
function updatePlume(state:RocketState, elapsed:number): void {
 const engineOn = state.t < BURN_TIME;
 plumeGroup.visible = engineOn;
 plumeLight.visible = engineOn;
 if (!engineOn) { padFlameLight.intensity = 0; return; }
 const alt = state.alt;
 const airFactor = clamp(alt / 60000, 0, 1); // at 60km full
 const length = 28 + 260 * airFactor;
 const width = 1.8 + 9 * airFactor;
 const flick = 0.8 + 0.18*Math.sin(elapsed*33.1) + 0.12*Math.sin(elapsed*17.7+1.3);
 for each sprite i: fraction = i/(N-1); y=-3 - fraction*length; scale = width*(1.0 + fraction*2.2) ...; opacity = ... * flick; color set based fraction. 
 // mach diamonds positions at y = -5 - fraction*length? Scale with width. 
 plumeLight.intensity = 700 * flick * (1 - airFactor*0.6)? maybe. At high alt no atmosphere but light still. Use 1200*flick.
 padFlameLight.intensity = state.alt < 300 ? 250*flick : 0;
```
Need sprite material opacity. For additive sprite, color maybe. `material.opacity = opacity`.
- The flame sprites are attached to `plumeGroup`, which is child of rocketGroup at y=0. If sprite positions local y negative. Good. The flame rotates with rocket. Good.
- The plume length 28m at ground. With rocket base y=8, extends to y=-20, into trench/ground. Visible portion above pad from y=8 to y=2 (6m) plus through trench. The flame sprites below y=0 are hidden by ground/trench? The trench floor at y=0.3 will occlude. But the additive sprites with depthTest true will be hidden below floor. The visible flame near engine y=8 to y=2 (6m). That's somewhat small. Maybe set base y=12? Then 10m visible. Hmm. Rocket sitting on launch mount 8m above pad. Flame length 28m, most hidden. In real launch, flame plume is huge sideways and visible. Could make the flame curve sideways after hitting deflector? Hard. But smoke covers. The bright core at nozzles visible. The long plume at altitude becomes visible when rocket is above pad. That's okay. At liftoff, the flame under rocket is partly hidden; but bright core and smoke. As rocket ascends, plume length visible against sky. Good.
- Could add a "flame trench plume" separate: a horizontal flame jet from trench exits. But not required. Maybe add orange glow at trench. But smoke enough. Add a point light at trench.
- At altitude >0, rocket base above pad, plume visible below against pad/sky. Good.

Need mach diamonds. Create 6 sprites maybe:
```
const diamondSprites: THREE.Sprite[] = [];
for i 0..5 { material additive color 0xdff2ff; scale...; add to plumeGroup; }
```
Update positions along center. Use opacity. Might be too much. Fine.
- Need set sprites `depthTest: true`? For flame, depthWrite false, depthTest true. It will be occluded by rocket? The plume is behind/below. Good.
- The `plumeGroup` is child of rocket, rotates. Good.

Need padFlameLight:
```
const padFlameLight = new THREE.PointLight(0xff7b2a, 0, 500, 2);
padFlameLight.position.set(0, 4, 0);
scene.add(padFlameLight);
```
At engine on and alt low, set intensity. Lights pad. It might cast? false. Good.
- plumeLight:
```
const plumeLight = new THREE.PointLight(0xffb15a, 0, 600, 2);
plumeGroup.add(plumeLight); plumeLight.position.set(0,-2,0);
```
But if plumeGroup hidden, light hidden? PointLight visible property? If parent hidden, light still? Object3D visible false disables rendering and lights? Likely. Good. Set intensity. The light moves with rocket. Good.

Need maybe update `smokeParticles` with rocket state. Spawn only when engine active and alt low. Use real dt. Need smoke points geometry. Let's implement.

Smoke data:
```
interface SmokeParticle {
 pos: THREE.Vector3;
 vel: THREE.Vector3;
 age: number;
 life: number;
 size: number;
 opacity: number;
 color: THREE.Color;
 seed: number;
}
const MAX_SMOKE = 1800;
const smokeParticles: SmokeParticle[] = [];
const smokeGeometry = new THREE.BufferGeometry();
const smokePositions = new Float32Array(MAX_SMOKE*3);
const smokeSizes = new Float32Array(MAX_SMOKE);
const smokeOpacities = new Float32Array(MAX_SMOKE);
const smokeColors = new Float32Array(MAX_SMOKE*3);
smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions,3));
...
smokeGeometry.setDrawRange(0,0);
const smokeMaterial = new THREE.ShaderMaterial({...});
const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
smokePoints.frustumCulled = false;
smokePoints.renderOrder = 1;
scene.add(smokePoints);
```
Need update attributes `needsUpdate`. Use `const posAttr = smokeGeometry.getAttribute('position') as THREE.BufferAttribute;` etc. Or keep attributes references:
```
const smokePosAttr = new THREE.BufferAttribute(smokePositions,3);
smokeGeometry.setAttribute('position', smokePosAttr);
...
```
Then update `smokePosAttr.needsUpdate = true;`.
- `smokePositions` arrays fixed. In update, for i<count write. For rest maybe old but drawRange count hides. Good.
- `smokeGeometry.setDrawRange(0,count)`.
- `smokeMaterial.uniforms.uScale.value = pointScale;` etc.
- `smokePoints.visible = smokeParticles.length > 0 && state.alt < 60000;` But if local hidden at 40km, smoke visible? At 40km, smoke points far below; maybe tiny. Could hide at 50km. Fine.
- Reset smoke: `smokeParticles.length=0; smokeGeometry.setDrawRange(0,0);` maybe clear arrays. Good.

Spawn function:
```
function spawnSmoke(): void {
 if (smokeParticles.length >= MAX_SMOKE) return;
 const side = Math.random() < 0.5 ? -1 : 1;
 const dist = 20 + Math.random()*45;
 const x = (Math.random()*2-1)*8;
 const z = side * dist;
 const y = 2.2 + Math.random()*4;
 const speed = 8 + Math.random()*12;
 const vel = new THREE.Vector3((Math.random()-0.5)*4, 2 + Math.random()*5, side * (8+Math.random()*12));
 // Actually z sign outward: if side=1, z positive (toward camera) or? Trench along z, exits at ±. For side=1 at z=+dist, velocity +z outward. Good.
 smokeParticles.push({pos: new THREE.Vector3(x,y,z), vel, age:0, life: 7+Math.random()*12, size: 8+Math.random()*18, opacity: 0.25+Math.random()*0.25, color: new THREE.Color(...), seed: Math.random()*Math.PI*2});
}
```
But camera at +z; smoke from z positive exit moves toward camera, could fill view. Good. Some from negative.
- Need large billowing clouds. Size 8-26m growing. At 20m from camera, point size huge. Could obscure. That's okay. Smoke from both sides. Maybe initial cloud around pad. Add spawn near center? Some at x=±8? We'll spawn with z side. Good.
- Color: white/gray. `color.setRGB(0.9+0.1*Math.random(), 0.9..., 0.86...)` warm. At near flame, maybe orange? We can tint by distance to origin. Use `const warm = Math.max(0,1 - Math.hypot(x,z)/80); color.setRGB(1.0, 0.85 - warm*0.1, 0.7 - warm*0.2)`? But normal blending with warm gray. Good.
- Age/life real seconds. Opacity grows in first 1s then fades. Size grows. Update:
```
for (let i=smokeParticles.length-1; i>=0; i--) {
 const p = smokeParticles[i];
 p.age += dt;
 if (p.age >= p.life) { smokeParticles[i] = smokeParticles[smokeParticles.length-1]; smokeParticles.pop(); continue; }
 // damping
 p.vel.x *= Math.exp(-0.18*dt);
 p.vel.z *= Math.exp(-0.18*dt);
 p.vel.y += (0.7 + 0.4*Math.sin(p.seed + p.age*2)) * dt;
 // slight turbulence
 p.vel.x += Math.sin(p.age*0.7 + p.seed)*0.3*dt;
 p.pos.addScaledVector(p.vel, dt);
 // Keep y above ground
 if (p.pos.y < 1.0) { p.pos.y = 1.0; p.vel.y = Math.max(p.vel.y,0); }
}
```
Need smoke "roll sideways out ... along ground and then rise." Initial vel z 10-20, y 2-7. Damping z, buoyancy increases y over time. Good. Maybe set y velocity low initially 1, and buoyancy. Good.
- Size and opacity based on age:
```
const t = p.age / p.life;
const grow = 1 + p.age * 0.35;
const fadeIn = Math.min(1, p.age / 0.8);
const fadeOut = Math.min(1, (p.life - p.age) / 3.0);
const alpha = p.opacity * fadeIn * fadeOut;
```
At age > life remove. Good.
- Color maybe. Use `p.color`.
- Write to attributes:
```
smokePositions[i*3] = p.pos.x; ...
smokeSizes[i] = p.size * grow;
smokeOpacities[i] = alpha;
smokeColors[...] = p.color.r...
```
Need `p.size` maybe large. `grow` could be 1+age*0.5. At 10s ->6x. size 15 ->90m. Good. Clamp maybe 120.
- Need `smokeSpawnAccumulator` and update. Engine active if `state.t < 30 || state.alt < 800`? Actually smoke only while rocket low. Use `const engineNearPad = state.t < 30 && state.alt < 600;` But at t=0, yes. At 30s, rocket alt? At speed 1 first 10s: altitude maybe? Let's estimate: thrust acceleration ~3 m/s² then increases. At 10s, alt ~150m? In 10s, average acc maybe 3.5, v~35, alt~175. So at t=10, alt 175. Then speed 10. At t=30, alt maybe >1km. Engine near pad condition fails at alt 600 maybe t~18. So smoke spawns for 10s real + 0.8s real = 10.8s, enough. If viewer x30 from t=0, t=10 sim in 0.33s, alt 175; then alt 600 reached at t~? 0.3s later; spawn 0.6s total. With rate 2000/s ->1200 particles. Good. Use condition `state.t < 60 && state.alt < 2000`? At alt 2km, exhaust won't hit pad, but smoke could still billow. To ensure at high playback, maybe spawn for t<30 regardless alt. But smoke at pad even after rocket high, steam still billows. Good. Use `state.t < 40 && localScene.visible`? At t=40, alt maybe? At 10x, 3s real. We can spawn for t<40. At x30, 1.33s real -> 2400 capped. Good. Use `state.t < 45`. Since burn 200, after 45s rocket high, no more smoke. Good.
- Smoke spawn rate real: 1400/sec. At 1x first 10s, 14000 capped 1800. Enough. At 30x first 1.5s, 2100 capped. Good. Rate 1400. Max 1800. Good.
- Need initial cloud maybe. At t=0 first frame spawn accumulator not enough? `smokeSpawnAccumulator += 1400*dt` ~23 particles first frame. Good. Over several frames, fills. At speed 30, dt 1/60, first frame 23, 0.33s -> 462 particles. Good.
- If user starts at t=0 and engine on, cloud builds. Good.

Need reset smoke clears. Also maybe set `smokeSpawnAccumulator=0`.

Need update smoke when paused? The flight is paused, but smoke could continue. Use `if (!rocket.paused)` in animate for step; for smoke, maybe update regardless with real dt? If paused at liftoff, smoke should continue billowing? It's okay. But pause semantics only says render loop does not call step. Smoke can animate. However if paused and t=0, engine on, spawn smoke continuously. Could fill. Fine. We'll update smoke with dt regardless, but only spawn if engine active and not paused? If paused, maybe freeze physics but smoke can still. To avoid endless spawning, if paused, no new spawn but existing billow. Or simply update smoke always. Hmm. Not specified. Better if paused, freeze the world (including smoke) for consistency. Use `if (!rocket.paused) updateSmoke(dt, state); else update smoke positions?` Maybe pause should stop all motion. The requirement specifically says render loop does not call step when paused. It doesn't say smoke. But likely pause stops flight, smoke could still. We can freeze smoke too. Use `const simDelta = rocket.paused ? 0 : dt;` for smoke? But smoke uses real dt. We can call updateSmoke(dt,state) only if not paused. If paused, don't update. But then smoke static. Good.
- Plume flicker can still animate even paused? Fine. Not physics.

Need trail drift using `performance.now()` and trailTimes. For paused, still drift? Could freeze if paused. Use real now; if paused, still drift. Fine. Not critical.

Need update trail geometry:
```
function updateTrailVisual(now:number): void {
 const n=rocket.trail.length;
 if (n > trailCapacity) ...
 const driftX = 0.0; const driftZ = 0.0;
 for (let i=0;i<n;i++) {
  const p=rocket.trail[i];
  const age = Math.max(0, now - (trailTimes[i] ?? now));
  const dx = Math.sin(i*0.01 + p.y*0.0001)*? Actually wind direction maybe (1.5,0, -0.5). Use age * 1.2; driftX = age*1.5; driftZ = -age*0.6;
  trailPositions[i*3] = p.x + dx;
  trailPositions[i*3+1] = p.y + age*0.2? Contrails rise? no. 
  trailPositions[i*3+2] = p.z + dz;
 }
 ...
}
```
But if trail points are old, drift. At high altitude, wind. Use small. `dx = age*1.8; dz = -age*0.7; dy = age*0.15`? Contrails drift horizontally, not vertically. Use x/z. At high alt, wind maybe. Good.
- If age huge (minutes), drift hundreds m, okay. But trail should start at rocket? The newest age near 0, no drift. Good.
- Need `trailTimes[i]` might be undefined if trail was modified externally? Tests may call `__rocket.trail.push`? Not. Use fallback.

- Need line and points use same geometry. If we update trail positions with drift, both. Good.
- Trail line material opacity maybe 0.7. At high alt, line visible. `LineBasicMaterial` doesn't support fog? It does if fog true and scene.fog. At high fog zero. Good. But line may be affected by fog at low, okay.
- Trail puffs PointsMaterial with map smoke. `sizeAttenuation` true, size 18. At high alt, size. Good.
- Need the trail puffs perhaps appear as white soft points. `PointsMaterial` uses color 0xffffff, opacity 0.35, transparent, depthWrite false, blending normal. Good.
- But PointsMaterial map smoke uses alpha; fine.
- Need no external.

Need `updateTrailVisual` allocation and capacity. Let's implement with `let trailCapacity = 4096; let trailPositions = new Float32Array(trailCapacity*3); const trailGeometry = new THREE.BufferGeometry(); let trailPosAttr = new THREE.BufferAttribute(trailPositions,3); trailGeometry.setAttribute('position', trailPosAttr);` But if reallocating, we need reassign `trailPosAttr`. Use `trailGeometry.setAttribute('position', trailPosAttr)`.
- `trailLine = new THREE.Line(trailGeometry, lineMat)`, `trailPuffs = new THREE.Points(trailGeometry, pointsMat)`. Both share geometry. Add to scene. `trailLine.frustumCulled=false` etc.
- When updating, `trailPosAttr.needsUpdate = true; trailGeometry.setDrawRange(0,n);`. Need `trailGeometry.setAttribute` with new attr if capacity grows; both objects reference geometry, so okay. The old attribute replaced. Fine.
- If n=0, setDrawRange(0,0). Good.
- To compute `now`, use `performance.now()/1000`. In animate, get `const now = performance.now()/1000;`. Good.
- When reset, trailTimes.length=0. Trail array length=0. Geometry draw range 0. Good.
- Since reset empties same array, update visual next frame.

Need `window.__rocket.trail` same array. Good.

Need update UI overlay and buttons. Need state.speed. UI speed. Good.

Need potential TS issue: `THREE.MathUtils.smoothstep` returns number but x clamped? It does. Good.

Need `Math.random` in shader? no.

Need create `localScene` before objects. Good.

Need maybe use `renderer.info`? no.

Need "physically based materials" - Use MeshStandardMaterial, MeshPhysicalMaterial maybe. Rocket white material use MeshPhysicalMaterial with clearcoat? Could. Use `MeshPhysicalMaterial({ color:0xf4f4f0, metalness:0.05, roughness:0.45, clearcoat:0.5, clearcoatRoughness:0.4 })`. Need physically based. Good. Use for body. Other standard. Fine.

Need "markings (a flag and lettering drawn on a canvas texture)" yes.

Need "ACES tone mapping" yes.

Need "atmospheric scattering in the sky" own shader. yes.

Need "aerial perspective (distant things paler and bluer)" fog. yes.

Need "bloom for flame" yes.

Need "procedural textures (canvas or shader) for concrete, ground, vegetation." yes.

Need "Mach diamonds welcome" we add.

Need "large billowing white steam and smoke clouds that roll sideways out of the flame trench along the ground and then rise." Smoke particles from trench. yes.

Need "plume grows longer and wider as air thins" update. yes.

Need "contrail stays in sky and drifts slowly" trail with drift. yes.

Need "camera low ... once clears tower viewer travels with it ... smooth." yes.

Need "curve of Earth" earth sphere. yes.

Need "sky from blue at ground to black at 100km ... stars above 70, clearly above 100." yes.

Need "trail visible white contrail" line and puffs. yes.

Need no external assets. yes.

Potential compile issues with imported addons and strict. Need ensure `OutputPass` has types. In three package, addons include `examples/jsm/postprocessing/OutputPass.js` and types from `@types/three`? The prompt likely uses `three` with types generated. The imports from 'three/addons/...' are typical. Fine.
- But if `OutputPass` unavailable in some version? Could avoid OutputPass to reduce risk. Use EffectComposer + RenderPass + UnrealBloomPass. But output color space? Set renderer.outputColorSpace. Without OutputPass, composer's final pass may render to screen with color space? The last pass renderToScreen true. The render target is linear? EffectComposer creates render target with type HalfFloat? It may not apply tone mapping. Hmm. The prompt asks ACES. We can include OutputPass. Standard in current three. Fine.
- If using `renderer.toneMapping = ACESFilmicToneMapping` with OutputPass, might double tone map. But many examples. Need maybe set `renderer.toneMapping = THREE.NoToneMapping` and let OutputPass? But OutputPass uses `toneMapping` uniform? Let's recall exact OutputPass implementation. In three r152:
```
class OutputPass extends Pass {
 constructor() { super(); this._outputColorSpace = renderer.outputColorSpace; this._toneMapping = renderer.toneMapping; ...}
 render(renderer, writeBuffer, readBuffer) {
   this.uniforms['tDiffuse'].value = readBuffer.texture;
   this.material.defines = {};
   this.material.defines[ColorManagement.getToneMappingDefine(renderer.toneMapping)] = '';
   this.material.defines[ColorManagement.getColorSpaceDefine(renderer.outputColorSpace)] = '';
   ...
 }
}
```
It applies tone mapping and color space based on renderer. If materials also tone map, double. But built-in materials in render target may not? Actually in WebGLRenderer, tone mapping is not applied when rendering to render target? I recall: `renderer.toneMapping` is applied in shaders regardless, but if rendering to render target, it sets `toneMapping` to NoToneMapping? Let's search memory: WebGLProgram parameters include `toneMapping: renderer.toneMapping` if `material.toneMapped` and `currentRenderTarget === null`? I think there's a check: `const toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping;` It might still. But OutputPass handles. In many examples using postprocessing, they set renderer.toneMapping = ACESFilmicToneMapping and use OutputPass, so likely works. We'll do. If double, image may be darker. But okay.

Need maybe set `renderer.toneMappingExposure = 1.2`, bloom threshold.

Need lights intensity with ACES. Good.

Potential issue shadows on huge scene: directional light shadow camera covers ±200m. Rocket at altitude beyond no shadow. Fine. Pad shadow. The sun light target at origin. Good. Need `sunLight.shadow.camera` type OrthographicCamera; properties. `sunLight.shadow.camera.updateProjectionMatrix()`. Good.
- Light position at (220,310,180). Light target (0,10,0). Direction. Fine.

Need maybe add a subtle `DirectionalLight` at high altitude? same.

Need local scene with earth sphere: If localScene hidden at 40km, the pad/tower disappear. But when camera chase at alt 40km, the rocket, plume, trail. Earth sphere. Good.
- At alt 40km, smoke not visible. Good.

Need update `skyUniforms.uAltitude.value = state.alt;` and `sky.position.copy(camera.position)`.
- `earthUniforms.uSunDir.value = sunDir;` static. Maybe `earth` rotates? No. The Earth sphere centered below. The camera moves with rocket; the view changes.

Need maybe update `sunLight.position` relative? Static. At high altitude, directional light still. Fine.

Need add `const ambient = new THREE.AmbientLight(0xffffff,0.15);` maybe. Good.

Need `renderer.domElement` appended. Add CSS body margin 0. Good.

Need UI overlay. `document.body.style.margin = '0'; document.body.style.overflow='hidden'; document.body.style.background='#000';` Good.

Need maybe pointer events. Canvas full.

Need `resize` updates composer and point scale. Use `onResize`. Need initial call after composer and smoke material created. But smoke material created after renderer. We can call at end. Need `smokeUniforms` defined before onResize? Function can reference later variable if defined. But initial call after. Good.

Potential issue onResize references `smokeUniforms` before initialization if called early. We'll call after define. Good.

Need create smoke texture before smoke material. Good.

Let's decide code order:

1. Imports, constants, types.
2. Scene/camera/renderer/composer, lights/fog.
3. Texture helper functions.
4. Textures/materials.
5. Sky, stars, earth.
6. Local scene: ground, ocean, pad, tower, masts, buildings, roads, scrub.
7. Rocket group/model, plume, lights.
8. Trail objects.
9. Smoke system objects.
10. Physics state and rocket API.
11. UI overlay and speed controls.
12. Camera state/helper functions.
13. Animate loop and resize.
14. Expose globals and set animation loop.

But physics `reset` calls `clearSmoke()` and `snapCamera`. These variables/function declared later? We can define rocket after smoke and trail and camera state. Need animate uses rocket. Fine. Let's order:
- after objects, define camera state and helpers? The camera helper uses rocket, which defined later. But functions can reference later variables if not called before. We'll define physics before camera? Physics reset needs camera snap flag. We can use `let snapCamera = true;` declared near top, and `clearSmoke` function declaration later. Hoisted. Fine. Physics can be before smoke objects? `reset` calls `clearSmoke()`, but clearSmoke function declared later as function declaration. Variables `smokeParticles` etc initialized later before any reset call. External reset called after init. Fine. We can define rocket object after physics, before smoke? Eh.

Simpler: declare all variable top-level in sequence, but function declarations can be anywhere. We'll put physics API after smoke/trail to have variables. But `window.__rocket` after. Animate uses. Good.

Need speed controls UI before animate. Set `setPlaybackSpeed` function uses `viewerSpeed` variable declared in physics. If physics defined before UI, okay. UI after physics. Good.

Need `rocket.reset()` maybe called initially? At start, t=0 and trail empty. No need. Set rocket group initial. But maybe call reset after objects? That clears smoke. Fine. Could call `rocket.reset()` at end to ensure. But reset sets snapCamera true. Good. It also clears trail. Fine. Use initial state.
- `rocket.paused = false`.

Need initial acceleration. Set in physics initialization.

Let's write detailed code.

### Texture helpers

Need ensure `THREE.CanvasTexture` color space. For alpha textures, set `colorSpace` maybe not necessary; but for color textures yes. Use `tex.colorSpace = THREE.SRGBColorSpace;` for ground, concrete, ocean, flag, text, flame, smoke. For flame/smoke alpha, sRGB alpha unchanged. Fine.
- `tex.anisotropy = 4;` requires renderer? Just number. Fine.
- `tex.minFilter = THREE.LinearMipmapLinearFilter` default. Good.

`makeNoiseCanvasTexture` maybe.

Ground texture:
```
function makeGroundTexture(): THREE.CanvasTexture {
 const size = 1024;
 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = size;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('2D canvas unavailable');
 ctx.fillStyle = '#3c4828';
 ctx.fillRect(0,0,size,size);
 for (let i=0;i<6000;i++) {
   const x = Math.random()*size;
   const y = Math.random()*size;
   const r = 1 + Math.random()*8;
   const g = 30 + Math.random()*40;
   const col = `rgba(${20+Math.random()*45}, ${g+20}, ${10+Math.random()*25}, ${0.15+Math.random()*0.25})`;
   ctx.fillStyle = col;
   ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
 }
 // lighter sandy patches
 for (let i=0;i<500;i++) {...}
 // dark scrub
 const tex = new THREE.CanvasTexture(canvas);
 tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
 tex.repeat.set(18,12);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.anisotropy = 4;
 return tex;
}
```
Colors: `rgba` with computed. Need no invalid. Fine.

Concrete:
```
ctx.fillStyle='#8a8a83'; fill; for 20000 small pixels; cracks lines dark.
tex.wrap... repeat.set(4,8);
```
Ocean:
```
ctx.fillStyle='#1a4d68'; fill; for i<1000 draw horizontal lines alpha; maybe gradient. repeat 30,30.
```
Flag:
```
ctx.fillStyle='#ffffff'; fillRect(0,0,w,h);
for (i=0;i<13;i++) { ctx.fillStyle = i%2===0 ? '#b22234' : '#ffffff'; ctx.fillRect(0, i*h/13, w, h/13+0.5); }
ctx.fillStyle='#3c3b6e'; ctx.fillRect(0,0,w*0.42,h*0.54);
ctx.fillStyle='#ffffff'; for rows/cols draw stars circles.
```
Need stripes cover blue? Draw blue after stripes. Good.
Text:
```
ctx.clearRect; ctx.fillStyle='#111'; ctx.font='bold 150px Arial, sans-serif'; ... fillText('SPACEX',...). Maybe add small line.
```
No external fonts; using generic sans-serif. Good.
- Maybe `ctx.font = 'bold 170px sans-serif'`. Good.

Soft texture:
```
function makeSoftTexture(stops: [number,string][]): CanvasTexture {
 const size=256; ...
 const g=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
 for (const [offset,color] of stops) g.addColorStop(offset,color);
 ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
 // maybe add a few subtle blobs? not.
 const tex = new THREE.CanvasTexture(canvas);
 tex.colorSpace = THREE.SRGBColorSpace;
 return tex;
}
```
Type `stops: Array<[number, string]>`. Good.
- Smoke texture: `makeSoftTexture([[0,'rgba(255,255,255,0.95)'],[0.35,'rgba(255,255,255,0.55)'],[1,'rgba(255,255,255,0)']])`.
- Flame: `[[0,'rgba(255,255,240,1)'],[0.18,'rgba(255,245,180,0.95)'],[0.45,'rgba(255,150,35,0.75)'],[0.8,'rgba(255,60,0,0.15)'],[1,'rgba(255,30,0,0)']]`.
- Maybe a separate "star" no.

### Sky and stars

Sky geometry 1e6. But `SphereGeometry(1000000, 32, 16)` fine. Since shader only direction. Use 32x16 enough.

Stars positions radius 8e6. Use 3000.

### Earth

SphereGeometry(R_EARTH, 256, 128). Hmm 256*128 = 32768 vertices, okay. But radius huge; camera far 2e7. Sphere geometry bounding sphere huge. Fine. Use `new THREE.SphereGeometry(R_EARTH, 128, 64)` maybe 8k, enough. Horizon at 100km: Earth sphere segment angular size 360/128=2.8°; at horizon, visible curvature might be faceted? The sphere's local surface near camera is at pole; segments 2.8° correspond ~300km. The horizon curvature over thousands km; could show facets. 128 might be okay due fog? Use 256,128 for smooth. 33k vertices fine. Use `SphereGeometry(R_EARTH, 256, 128)`. For TypeScript.

Earth material uniforms. Use `sunDir` normalized. `transparent: false`, `fog:false`, `side: THREE.FrontSide`. `depthWrite: true`.

### Local scene

Ground material: MeshStandardMaterial map groundTexture, roughness 1.0, metalness 0.0. Need maybe `color: 0xffffff`.
Ocean: MeshStandardMaterial map oceanTexture, color 0xffffff, roughness 0.35, metalness 0.05. Maybe `transparent`? no.
Concrete: map concreteTexture, roughness 0.9, metalness 0.0, color 0xcccccc.
Dark concrete: color 0x42423e.
Metal: color 0x5a5d60, metalness 0.8, roughness 0.45.
Dark metal: color 0x2a2c2f.
Building materials: create few.

Add local scene objects. Need use `localScene.add`.

Pad top y=2. Rocket base y=8. Launch mount legs. Need tower base y=2, height 90. Masts base y=0.

Tower creation function:
```
function addLatticeTower(cx:number, cz:number, width:number, height:number, baseY:number, mat:THREE.Material): void {
 const group = new THREE.Group();
 const hw = width/2;
 const colGeo = new THREE.BoxGeometry(0.35, height, 0.35);
 const corners = [[-hw,-hw],[hw,-hw],[-hw,hw],[hw,hw]];
 for (const [x,z] of corners) { const m = new THREE.Mesh(colGeo, mat); m.position.set(cx+x, baseY+height/2, cz+z); m.castShadow=true; m.receiveShadow=true; group.add(m);}
 const step = 6;
 for (let y=baseY+4; y<baseY+height; y+=step) { 
   const beamXGeo = new THREE.BoxGeometry(width,0.18,0.18);
   // two beams along x at z corners
   for (const z of [-hw, hw]) { const b = new THREE.Mesh(beamXGeo, mat); b.position.set(cx, y, cz+z); ...}
   const beamZGeo = new THREE.BoxGeometry(0.18,0.18,width);
   for (const x of [-hw, hw]) { ...}
 }
 // Add diagonal braces maybe as thin cylinders
 // top
 const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.25,3,8), mat); cap.position...
 localScene.add(group);
}
```
Need destructuring `for (const [x,z] of corners)` with strict. `corners` inferred number[][]. Destructuring works. Could type `Array<[number,number]>`. Good.
- Add diagonal braces: maybe skip to keep code. Lattice tower needs diagonals. Add a few diagonal cylinders using `CylinderGeometry` and quaternion? Could be heavy. But "lattice" with horizontal beams and vertical columns looks lattice. Add diagonals for realism:
  - For each face, create a beam between corners every 6m. Use helper `makeBeamBetween(start,end,thickness,mat)`: create cylinder along segment. But many. Could add 2 diagonals per segment. Use `THREE.CylinderGeometry(0.08,0.08,length,6)`, position midpoint, quaternion setFromUnitVectors(Y, dir). Need type. Function.
  - We can build a generic `addBeam(p1,p2,material,thickness)` returns mesh. Use `new THREE.CylinderGeometry(radius,radius,length,6)`, position midpoint, quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize())`. Add to group. This is easier. But many meshes. Tower height 90, step 6 => 15 segments * 4 faces * 1 diagonal = 60 meshes. Masts 4*13 segments*4=208. Total ~300 meshes. Okay maybe. But performance. Could use fewer. Use horizontal boxes only plus a few diagonals. For visual, fine. Tower 15*2 horizontal beams =30. Masts 4*13*2=104. Total 134. Add diagonals maybe 50. Fine.

Let's implement `addLatticeStructure` with columns and horizontal beams and diagonal braces on two faces? It might be long. But okay.

Maybe simpler: create tower group with 4 columns and many horizontal crossbars. The "lattice" look adequate. Add diagonal braces with cylinders for tower only and masts. Use helper.

Define:
```
function addBeam(group: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material): void {
 const dir = new THREE.Vector3().subVectors(b, a);
 const len = dir.length();
 const geom = new THREE.CylinderGeometry(radius, radius, len, 6);
 const mesh = new THREE.Mesh(geom, mat);
 mesh.position.copy(a).addScaledVector(dir, 0.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
 mesh.castShadow=true; mesh.receiveShadow=true;
 group.add(mesh);
}
```
Need `mat` type `THREE.Material` but MeshStandardMaterial. Good.
- In lattice function, vertical columns use boxes, horizontal beams use addBeam between corners at each level. Diagonal braces between opposite corners at adjacent levels. Good. This uses cylinders for all. Could use for vertical too. Simpler: Use addBeam for all. But many geometries created. Fine. Use `BoxGeometry` for columns? addBeam cylinders okay. Use dark metal. Lattice tower looks like tubes. Good.

`addLatticeTower`:
```
function addLatticeTower(cx,cz,width,height,baseY,mat) {
 const group = new THREE.Group();
 const hw = width/2;
 const corners = [new THREE.Vector3(cx-hw,0,cz-hw), ...] // x,z only, y will be baseY+...
 // vertical columns from baseY to baseY+height
 for (const c of corners) addBeam(group, new Vector3(c.x,baseY,c.z), new Vector3(c.x,baseY+height,c.z),0.18,mat);
 const step=6;
 for (let y=baseY; y<=baseY+height; y+=step) {
  const p0 = ...
  // horizontal on four sides
  addBeam between corners at y
 }
 // diagonals on each face per segment
 for (let y=baseY; y<baseY+height; y+=step) {
  const y2 = Math.min(y+step, baseY+height);
  addBeam from corner0 at y to corner1 at y2 etc // face pair
 }
 // top cap
 ...
 localScene.add(group)
}
```
Need not add beams at every segment maybe too many but okay.
- For tower, height 90, step 6 ->15, 4 vertical + 4*16 horizontal =68 + diagonals 4*15=60 total 128. Masts height 130, step 8 ->16, 4*4 masts=256. Total ~400. Fine.
- Use `mesh.castShadow` maybe only for vertical? Set all castShadow true; 400 meshes shadow map draw might be heavy but okay. Could set castShadow false for thin beams except columns. Maybe set castShadow true for columns only. But code simple. With 400 meshes, shadow pass okay maybe. Use shadow map 2048. Fine.
- Could use `THREE.Group` and add. Good.

- Tower at x=-16, z=0, width 8, height 90, baseY=2. Masts at (75,75),(-75,75),(75,-75),(-75,-75), width 3, height 130, baseY=0.5. Add pointed top. For mast top, add cylinder cone. Use `ConeGeometry(0.8, 4, 8)` at top. Add.

- Umbilical arm: add box from tower to rocket at y=40. Tower edge x=-12, rocket at x=0. Use `addBeam` from (-12,40,0) to (-1.9,40,0) radius 0.35, mat, but add to localScene. Good. Add a second at y=25. Maybe.
- Need tower next to rocket.

- Launch mount legs:
```
function makeBox(w,h,d,mat,x,y,z) {...}
```
Add four legs at x±4,z±4 from y=2 to 7.5 (height 5.5, center 4.75). Add horizontal beams at y=7.2: boxes along x/z. Add hold-down clamps at y=7.7. Use dark metal.
- Rocket base y=8. Clamps maybe touch bottom. Good.

- Buildings: function `addBuilding(x,z,w,d,h,color)`:
```
const mat = new THREE.MeshStandardMaterial({color, roughness:0.85, metalness:0.05});
const box = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
box.position.set(x, h/2+0.1, z);
box.castShadow=true; box.receiveShadow=true;
localScene.add(box);
// roof
const roof = new THREE.Mesh(new THREE.BoxGeometry(w+1,0.4,d+1), roofMat); roof.position.y = h+0.3...
```
Need y. Good.
- Add buildings with positions. Maybe some have windows? skip. Use colors gray/white.

- Roads: function `addRoad(x,z,w,l,rotY)` PlaneGeometry(w,l), rotate x -pi/2 and rotY? If plane rotated x -pi/2 lies horizontal with width along x and length along z. To rotate on ground, set rotation.z? Actually after rotation.x=-pi/2, rotation.y? For a plane in XY, rotate x -pi/2 -> lies XZ with width x, height z. To rotate around Y, `road.rotation.y = rotY`. But Euler order? Setting rotation.x=-pi/2 and rotation.y=rotY might not rotate as expected because rotation order XYZ. Better create geometry PlaneGeometry(w,l), rotateX(-pi/2), then mesh.rotation.y=rotY. Or use `mesh.rotation.set(-Math.PI/2, 0, rotY)`? Hmm. Simpler use planes only axis-aligned. Add one along z and one along x. Roads axis-aligned. Good.
  - Road along z: PlaneGeometry(18, 4000) rotated x -pi/2, position (120, 0.25, 1000). It extends z -1000..3000. Good.
  - Road along x: PlaneGeometry(3000, 14) rotated x -pi/2, position (0,0.25,400). Extends x ±1500. Good.
  - Maybe another road along x at z=-1200. Good.
- Road material dark gray. At y=0.25 above ground. Receive shadow. Fine.

- Scrub instanced:
```
const bushGeo = new THREE.IcosahedronGeometry(1.4,0);
const bushMat = new THREE.MeshStandardMaterial({color:0x2f4a22, roughness:0.95});
const bushCount = 500;
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
const matrix = new THREE.Matrix4(); const q = new THREE.Quaternion(); ...
for i ... random x,z; if (Math.abs(x)<100 && Math.abs(z)<100) continue? Need exact count. Use loop until count. 
```
Simpler generate `bushCount` all around but skip near pad by choosing distance >120. Use angle/radius. For i:
```
const angle = Math.random()*Math.PI*2;
const radius = 120 + Math.random()*7000;
const x = Math.cos(angle)*radius;
const z = 3500? Hmm local land from -3000..10000. Use z = -2800 + Math.random()*12000. But x range ±10000. Could distribute rectangular. Use x = (Math.random()*2-1)*9000; z = -2800 + Math.random()*12000; if (Math.hypot(x,z) < 150) adjust. Fine.
```
Need ensure on land, not ocean. z>-2900. Use z = -2800 + Math.random()*12000 (to 9200). Good.
- Scale y 0.5-1.5, x/z. Use matrix. Set position y=0.5*scale. Good. Bushes may be visible. CastShadow false. ReceiveShadow false? Set true maybe.
- `bushes.instanceMatrix.needsUpdate = true;` needed? After setting all, set. Good. `bushes.count = bushCount` maybe. Add to localScene.
- Scrub is low; good.

- Maybe add a few palm trees? Not necessary.

Need pad and tower at local origin. Good.

### Rocket model

Helper `makeMesh` maybe. Use materials. Need set shadow.
- whiteMat `MeshPhysicalMaterial`. It might require `clearcoat` property type. MeshPhysicalMaterial supports. Good.
- darkMat `MeshStandardMaterial`.
- engineMat.
- marking materials.

Build rocket group. Need maybe `rocketGroup.position.set(0, LAUNCH_BASE, 0)`. Add to scene (not localScene). Good.
- Set rotation order? `rocketGroup.rotation.z = -pitch`. Since group position at base. Good.
- Note if rotation.z changes, rocket model tilts. The plume child also tilts. Good.
- Add `rocketGroup` to scene.

Add body:
```
const firstStage = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,38,32,1,false), whiteMat);
firstStage.position.y = 23; // 4 to 42
rocketGroup.add(firstStage);
```
- Engine section at y=2 height 4 (0-4). Use dark gray. Add 9 nozzles.
- Interstage etc.

Rings:
```
for (const y of [4.05, 10, 20, 30, 41.95]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.87,1.87,0.12,32,1,true), darkMat); ring.position.y=y; ...}
```
Open-ended cylinder side only. Good.
- Add black band at y=43 height 2 radius 1.86. Use darkMat.
- Interstage 44-48 dark? Use maybe `interstageMat` color 0xcfcfcf with dark? Requirement visible interstage and darker band. Use interstage white? A Falcon 9 interstage is white composite with black? Actually black? We'll make interstage dark gray 44-48, and darker band at 42-44 black. Good.
- Second stage white 48-58.
- Fairing: lathe points y 0..12 place at y=58. Radius 1.85 to 0.05. Use whiteMat. Add a seam ring at y=58. Good.
- Nose tip maybe.
- Add grid fins at y=41.5. Use fins with box. Add to rocketGroup.
- Add landing legs: four `BoxGeometry(0.18,10,0.55)` at radius 1.95, y=12, rotation.y angle. But boxes at x/z, maybe. Use `fin` positions. Good.
- Add engine nozzles:
```
const nozzleGeom = new THREE.CylinderGeometry(0.22,0.38,1.2,12,1,true);
const nozzleMat = new THREE.MeshStandardMaterial({color:0x303236, metalness:0.9, roughness:0.35, side:THREE.DoubleSide});
for (let i=-1; i<8? ) ...
```
Arrangement: center one at (0,0.6,0); eight around radius 1.0:
```
for (let i=0;i<8;i++) { const a = i/8*Math.PI*2; const n = new THREE.Mesh(nozzleGeom, nozzleMat); n.position.set(Math.cos(a)*1.0, 0.6, Math.sin(a)*1.0); rocketGroup.add(n); }
const center = new THREE.Mesh(...); center.position.set(0,0.6,0);
```
Nozzle orientation: CylinderGeometry along y, radiusTop at +y, radiusBottom at -y. We want wider at bottom? `CylinderGeometry(0.22,0.38,1.2,...)` radiusTop 0.22 at +y, radiusBottom 0.38 at -y. So it flares downward. Good. Position center y=0.6 -> bottom at 0, top at 1.2. Nice.
- Add inner glow maybe small emissive disk at nozzle? Could add a `CircleGeometry` vertical? Not needed. Flame sprites at y=0.

- Markings:
```
const textTex = makeTextTexture('SPACEX','#111111');
const textMat = new THREE.MeshStandardMaterial({ map:textTex, transparent:true, alphaTest:0.02, depthWrite:false, roughness:0.6, metalness:0.05, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-1 });
const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.0,1.25), textMat);
textPlane.position.set(0, 26, 1.87);
rocketGroup.add(textPlane);
```
But plane at z=1.87, normal +z. It may be visible. For camera at +z. Good. Need maybe `renderOrder=1`? transparent. Add. The plane floats outside cylinder. At y=26, body radius 1.85, z=1.87. Good.
- Flag plane size 2.2,1.375 at y=36,z=1.87. Add.
- Add a second "SPACEX" text on other side? Maybe not.
- Add a small "USA" text? no.

- Add darker band with "SPACEX" maybe. Good.

- Add a visible `interstage` darker. Good.

- Maybe add a "Falcon 9" text vertical on second stage? not necessary. Could add text plane at y=52, z=1.87, but second stage radius 1.85. Add "FALCON 9" small. Fine.

- Add a small US flag. Good.

- Need perhaps add a thin "black band" at y=42. Good.

- Add rocket group to scene. `rocketGroup.traverse` set shadow.

### Plume

Need create sprite materials. We can use array:
```
const plumeSprites: THREE.Sprite[] = [];
const plumeBaseColors = [0xffffff, 0xfff2b0, 0xffb040, 0xff6a10, 0xff3a00];
const N=18;
for (let i=0;i<N;i++) {
 const mat = new THREE.SpriteMaterial({map: flameTexture, color: 0xffffff, blending: THREE.AdditiveBlending, transparent:true, depthWrite:false, opacity:0.8, toneMapped:false});
 const spr = new THREE.Sprite(mat);
 spr.position.set(0,-2,0);
 plumeGroup.add(spr);
 plumeSprites.push(spr);
}
```
Need `SpriteMaterial.toneMapped` property exists? Material has toneMapped. Yes.
- For mach diamonds, 6 sprites with smaller scale. Add. Maybe use `diamondMats`. Good.
- Add plumeGroup to rocketGroup at y=0. `plumeGroup.position.y = 0.0`.
- `plumeLight` add to plumeGroup.
- `plumeGroup.visible = true`.

Need update plume function. Use `plumeSprites.length`. For each:
```
const f = i/(plumeSprites.length-1);
const y = -3 - f*length;
sprite.position.set(0, y, 0);
const s = width * (0.65 + f*2.2);
sprite.scale.set(s, s*(1.2 + f*0.5), 1);
const mat = sprite.material as THREE.SpriteMaterial;
const flicker = 0.75 + 0.2*Math.sin(elapsed*40 + i*1.7) + 0.15*Math.sin(elapsed*13 + i*0.9);
mat.opacity = (1 - f*0.65) * flicker * 0.85;
mat.color.setHSL? Use setHex based on f. Could set color based on f:
if f<0.15 white; else if f<0.45 color 0xffd080; else if f<0.8 0xff7b20; else 0xff3a00. Use `mat.color.setHex(colorHex)`.
```
Need perhaps core bright. Good.
- Mach diamonds: positions at fractions maybe `0.18,0.3,0.42,0.54,0.66`. Use y = -5 - f*length; scale = width*(0.3+0.1?); opacity = flicker*0.6*(1-f*0.6). Use color 0xd8f0ff.
- Plume light intensity: `2000 * flicker * (1 - Math.min(alt/100000,0.8))`? At high alt, less atmospheric scattering but light still. Keep 800. Use.
- Pad flame light intensity: if alt < 150, 300*flicker, else 0. Also if t<... engine on. Good.
- Plume visible if engineOn. Also if t>=burnTime hide. At t=200, engine off. Good.
- At t=0, engineOn true. Good.

Could also scale entire plumeGroup by? We update individual. Good.

### Trail

Need create line. Use `LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.65, depthWrite:false, fog:true })`. LineBasicMaterial has `toneMapped`? default true. Good.
- Points material: `new THREE.PointsMaterial({map: smokeTexture, color:0xffffff, size:18, sizeAttenuation:true, transparent:true, opacity:0.28, depthWrite:false, alphaTest:0.01 })`. But `alphaTest` maybe. Good.
- Both share geometry. Need line and puffs.
- `trailLine.renderOrder=2; trailPuffs.renderOrder=3;` maybe.
- Geometry initial empty.
- `trailPuffs.frustumCulled=false; trailLine.frustumCulled=false;`.

### Smoke

As above. Need set `smokePoints.renderOrder=1`. Smoke should render after local? Transparent. Fine.
- Points shader with `depthTest: true`, `depthWrite:false`. Good. It will be occluded by pad. Good.
- `smokePoints.frustumCulled=false`.

Need smoke material uniforms. `uScale` initial set later. `uFogColor` and density from fog. `uMap` smokeTexture. Good.
- `smokePoints.visible = smokeParticles.length > 0` maybe update.
- Smoke points not localScene, so at high alt still. Hide when alt>60km. Good.

### Physics API

Variables:
```
let simTime=0;
let simAlt=0;
let simVAlt=0;
let simDownrange=0;
let simVDown=0;
let currentPitch=0;
let lastAcc=0;
let viewerSpeed: number | null = null;
```
Need `simMassAt`.
```
function massAt(time:number): number {
 const u = Math.min(Math.max(time / BURN_TIME, 0), 1);
 return M0 + (DRY_MASS - M0) * u;
}
function thrustAt(time:number, mass:number): number {
 if (time >= BURN_TIME || time < 0) return 0;
 return Math.min(1.3 * M0 * G0, 3 * mass * G0);
}
function pitchAt(time:number): number {
 if (time <= 10) return 0;
 const u = Math.min((time - 10) / 140, 1);
 return 0.5 * u * u * (3 - 2 * u);
}
function gravityAt(altitude:number): number {
 const h = Math.max(altitude,0);
 const r = R_EARTH / (R_EARTH + h);
 return G0 * r * r;
}
function netVerticalAccel(time:number, altitude:number): number {
 const mass = massAt(time);
 const thrust = thrustAt(time, mass);
 const p = pitchAt(time);
 return thrust * Math.cos(p) / mass - gravityAt(altitude);
}
```
At reset:
```
simTime=0; simAlt=0; simVAlt=0; simDownrange=0; simVDown=0; currentPitch=0; lastAcc=netVerticalAccel(0,0); viewerSpeed=null; rocket.trail.length=0; trailTimes.length=0; clearSmoke(); snapCamera=true; rocket.paused? should reset paused? Requirement reset() clears viewer choice, time 0 etc. Does it reset paused? Not specified. Likely keep paused? It says window.__rocket paused boolean. reset maybe not. Could set paused=false? Hmm reset should reset flight; maybe not pause. But if paused true and reset, still paused. I'd leave paused unchanged to respect user. But "reset(): time 0, the rocket on the pad, trail emptied" no mention paused. Keep.
```
Need `rocket` referenced in reset before initialized? If reset function defined inside object literal, it can reference `trail` property? Use local arrays. Better define `const trail: TrailPoint[] = [];` and `const rocket: RocketAPI = { reset(){ trail.length=0; ... }, step(){...}, state(){...}, trail, paused:false};`. Then reset uses `trail`, not rocket.trail. Good.
- `clearSmoke()` function declared later. Call.
- `snapCamera = true`. Need declare `let snapCamera = true;` near top before. Good.
- `viewerSpeed = null`.
- `lastAcc = netVerticalAccel(0,0)`.
- Maybe set currentPitch = 0.
- Clear trail times.

Step:
```
step(dt:number): void {
 if (!Number.isFinite(dt) || dt <= 0) return;
 let remaining = dt;
 while (remaining > 1e-9) {
   const h = Math.min(0.02, remaining);
   const mass = massAt(simTime);
   const thrust = thrustAt(simTime, mass);
   const p = pitchAt(simTime);
   const g = gravityAt(simAlt);
   const ay = thrust * Math.cos(p) / mass - g;
   const ax = thrust * Math.sin(p) / mass;
   simVAlt += ay * h;
   simVDown += ax * h;
   simAlt += simVAlt * h;
   simDownrange += simVDown * h;
   if (simAlt < 0) { simAlt = 0; if (simVAlt < 0) simVAlt = 0; }
   simTime += h;
   lastAcc = ay;
   currentPitch = p;
   remaining -= h;
 }
 currentPitch = pitchAt(simTime);
 trail.push({ x: simDownrange, y: LAUNCH_BASE + simAlt, z: 0 });
 trailTimes.push(performance.now() / 1000);
}
```
Potential issue if simAlt becomes negative and we clamp vAlt, acceleration next substep maybe. Good.
- The horizontal position no clamp. z=0. Rocket tilts along x. Good.
- At t=0, h=0.02, alt increases. Good.
- The pitch at end maybe if crossed 10. Good.
- `lastAcc` maybe at last substep before t increment. Fine. Could recompute at end `lastAcc = netVerticalAccel(simTime, simAlt)`. But net vertical acceleration after step. Use that for state. Also `currentPitch = pitchAt(simTime)`. Good. Let's recompute after loop:
```
lastAcc = netVerticalAccel(simTime, simAlt);
currentPitch = pitchAt(simTime);
```
But this acceleration uses current mass and altitude; okay. However if t>=burn, thrust zero. Good.
- Need maybe if dt huge, while. Good.

State:
```
state(): RocketState {
 return { t: simTime, alt: simAlt, vel: simVAlt, acc: lastAcc, pitch: currentPitch, speed: getSpeed() };
}
```
- `vel` vertical velocity. They may expect total vertical? "vel" maybe vertical. The overlay velocity maybe vertical. Use. Could include total? Not in interface. If they test `state().speed` is playback speed. Good.
- Should `vel` be total velocity? The specification says state(): {t, alt (m), vel (m/s), acc (net vertical acceleration, m/s^2), pitch (rad), speed}. It says net vertical acceleration, so vel likely vertical velocity. Good.
- Could make `vel` total speed magnitude? Hmm "velocity" in overlay. But "acc net vertical". Usually vel vertical. We'll use vertical. Maybe tests check t=0 vel=0. Fine.
- `speed` returns playback speed. Good.

Get speed:
```
function getPlaybackSpeed(): number {
 return viewerSpeed === null ? (simTime < 10 ? 1 : 10) : viewerSpeed;
}
```
Need viewerSpeed type. Good.

Set speed:
```
function setPlaybackSpeed(value: number | null): void { viewerSpeed = value; }
```
- For keys. Use `value` as 1,10,30. Good.

`clearSmoke()` function:
```
function clearSmoke(): void {
 smokeParticles.length = 0;
 smokeGeometry.setDrawRange(0,0);
 smokeSpawnAccumulator = 0;
}
```
But smokeGeometry declared later. Function declaration hoisted, variables? `smokeGeometry` is `const` declared later. Calling reset before smokeGeometry initialized? We will not call reset until after all initialization. The rocket object reset could be called by external after page loaded. Fine. But at initial maybe we call `rocket.reset()` after smokeGeometry defined. If reset method itself defined before, but not called. Good.
- However JS temporal dead zone: `clearSmoke` references `smokeGeometry` const declared later. If reset is called after initialization, fine. If reset called during initialization before smokeGeometry, error. We won't. Good.

Need `trailTimes` array and `trailGeometry` not cleared in reset? reset clears trail and trailTimes. Trail geometry updated next frame. Fine.

### UI

Create overlay after physics. Use `const overlay = document.createElement('div'); ... document.body.appendChild(overlay);`
- Data text. Buttons. Need style.
- Maybe add a title "FALCON 9 / LC-39A" but not required.
- `dataEl` style.
- Buttons container. Create `button` with text. Need `button.style.cssText`.
- Keydown:
```
window.addEventListener('keydown', (event: KeyboardEvent) => {
 if (event.key === '1') setPlaybackSpeed(1);
 else if (event.key === '2') setPlaybackSpeed(10);
 else if (event.key === '3') setPlaybackSpeed(30);
});
```
Maybe 'r' reset. Not required but can add. Could add `if (event.key.toLowerCase() === 'r') rocket.reset();`. But `rocket` defined. Fine. Not necessary. Keep only 1,2,3.
- Buttons click. Good.
- Need `overlay.style.pointerEvents='none'`? Buttons need. Set overlay pointer-events auto? If overlay covers only small. Use `overlay.style.pointerEvents='auto'`. Fine.
- Add CSS to buttons.

Update UI:
```
function updateHud(): void {
 const s = rocket.state();
 dataEl.textContent = `T+ ${formatTime(s.t)}   ALT ${(s.alt/1000).toFixed(2)} km   VEL ${s.vel.toFixed(0)} m/s   SPD x${s.speed.toFixed(0)}`;
}
```
Maybe show `ACC`. Not required. Add speed. Good.
- Format speed: if 1 show 1, 10, 30. `s.speed.toFixed(0)`.
- Use `dataEl.textContent`. Good.

### Environment update

```
function updateEnvironment(state: RocketState, elapsed: number): void {
 skyUniforms.uAltitude.value = state.alt;
 sky.position.copy(camera.position); // but after camera update? The camera updated after. Need update sky after camera. We'll do in animate after camera.
 stars.position.copy(camera.position);
 const starOpacity = THREE.MathUtils.smoothstep(state.alt, 70000, 100000);
 starMaterial.opacity = starOpacity;
 stars.visible = starOpacity > 0.01;
 const density = 0.00012 * Math.exp(-Math.max(state.alt,0)/7000);
 fog.density = density;
 smokeUniforms.uFogDensity.value = density;
 smokeUniforms.uFogColor.value.copy(fog.color);
 localScene.visible = state.alt < 45000;
 smokePoints.visible = state.alt < 60000 && smokeParticles.length > 0;
 // maybe earth.visible always.
}
```
- Need sky position after camera. So in animate call updateEnvironment after camera.
- `THREE.MathUtils.smoothstep` expects x first? Signature `smoothstep(x, min, max)`. Yes. Use.
- Need `starMaterial.opacity` value. PointsMaterial has opacity. Good.
- `localScene.visible` toggles. At alt just under 45km true. At high false. Good.
- `smokePoints.visible` if local false but alt<60? at 45km local false, smoke maybe visible? It is far below. Hide if alt>45km perhaps. Use `state.alt < 40000`. Good. Or same as local. Use `smokePoints.visible = localScene.visible && smokeParticles.length > 0;` Good. At alt 40km, local hides. Good.
- Earth sphere always. At low, local covers. Good.
- `scene.background` maybe. Fine.

- Update sky `uSunDir` static. Good.
- Maybe update `sunLight.position`? static.

### Camera update

Need compute desired camera based on rocket center. Use `rocketGroup.updateMatrixWorld(true)` after sync. Then:
```
const center = new THREE.Vector3(0, 35, 0).applyMatrix4(rocketGroup.matrixWorld);
const chaseBlend = THREE.MathUtils.smoothstep(state.alt, 60, 220);
const chasePos = center.clone().add(new THREE.Vector3(14, -12, 86));
const desired = lowCameraPos.clone().lerp(chasePos, chaseBlend);
const target = center.clone().add(new THREE.Vector3(0, 2, 0)); // slight above? Maybe center.
```
- At low blend 0, desired lowPos fixed. Look target center. Good.
- At chase blend 1, desired center + offset. Look target center. Distance 88. Good.
- Need maybe at very high altitude, camera offset below by 12. Looking at center. Earth below. Good.
- Could vary offset with altitude to show more Earth: at high, offset y = -25, z=80. But within 100. Let's define:
```
const highFactor = Math.min(state.alt/100000,1);
const chaseOffset = new THREE.Vector3(12, -10 - 15*highFactor, 82 + 8*highFactor);
```
Distance at high: sqrt(144 + 625 + 8100)=94.2. Good. Camera below center 25m, looking up ~15°, Earth below visible. At 100km, good. At low chase, y=-10. Good.
- But if camera below rocket center by 25m, looking at center, the rocket extends 35m above center and base 35m below. The camera at center-25, so engine base is 35m below center = 10m below camera. The plume extends down. Good. The rocket fills. The Earth below maybe. Good.
- At low chase, offset y=-12. Good.
- The camera x offset 12, z 82. Within 100.
- Maybe the rocket occupies center; with FOV 55 and distance 85, vertical field 88m, rocket 70m fits. Good.
- If camera below center, looking up at center, rocket top at center+35. The angle to top ~ atan(35+? /85) ~22°, within. Rocket base at center-35, camera y center-25, base 10m below camera, angle down ~ -7°, within. Good. Entire rocket visible. Nice.
- At high altitude, plume length 260m, camera only 85m away. The plume extends far below, might go out of view. But that's okay, plume visible near. Could widen. The camera near rocket. Good.

- Smoothing:
```
if (snapCamera) { camera.position.copy(desired); camLook.copy(target); snapCamera=false; }
else { const k = 1 - Math.exp(-6.5 * dt); camera.position.lerp(desired, k); camLook.lerp(target, k); }
camera.lookAt(camLook);
```
But if dt is real delta clamped to 1/30? Use real dt (frame) not sim. In animate, we use `const frameDt = Math.min(clock.getDelta(), 0.1);` For camera smoothing use frameDt. For simulation step, use min(frameDt,1/30)*speed. Good. Need avoid clock.getDelta twice. Use one.
- At low phase if rocket rises, desired camera low fixed but look target center moves. Camera stays low. It will track. Good.
- However during first 10s at speed 1, rocket altitude maybe 150m at t=10. Chase blend starts at 60m, so by t=10 blend ~0.3? The camera starts moving upward before clearing tower? Tower height 90; rocket top at alt 12 clears. At alt 60, blend 0. So camera starts transitioning after 60m, around t=7s? The rocket top clears tower at alt 12 around maybe 3s. "once clears tower" we start at 60m, later. Fine.
- At high speed after 10, transitions in 0.2s. Fine.

- Need camera.lookAt after position. Good.

### Animate loop

```
const clock = new THREE.Clock();
let firstFrame = true;
function animate(): void {
 const frameDt = Math.min(clock.getDelta(), 0.1);
 const stateBefore = rocket.state();
 if (!rocket.paused) {
   const speed = stateBefore.speed;
   rocket.step(Math.min(frameDt, 1/30) * speed);
 }
 const state = rocket.state();
 // sync rocket
 syncRocketTransform();
 // update plume
 updatePlume(state, clock.elapsedTime);
 // update trail visual
 const now = performance.now()/1000;
 updateTrailVisual(now);
 // update smoke
 if (!rocket.paused) updateSmoke(frameDt, state);
 // update environment after camera? need camera first for sky position; but updateEnvironment uses camera only sky position. We can update camera first.
 updateCamera(frameDt, state);
 // update environment
 updateEnvironment(state);
 // sky/stars positions after camera
 sky.position.copy(camera.position);
 stars.position.copy(camera.position);
 // update HUD
 updateHud();
 // maybe update pad flame light
 // render
 composer.render();
 if (firstFrame) { (window as any).__ready = true; firstFrame = false; }
}
```
Need `clock.elapsedTime` after getDelta? Three.Clock has `elapsedTime` property updated by getDelta. Good.
- But `clock.elapsedTime` after getDelta. Fine.
- Need update camera before sky. Good.
- updateEnvironment uses camera? no, but local visibility. Fine.
- `updatePlume` needs engine on and pad light. Good.
- `updateSmoke` uses rocket state. Should be called before environment? It sets smoke points visible maybe environment also. We can call updateEnvironment after smoke to set visibility. Good.
- `syncRocketTransform` before camera. Good.
- Need update `rocketGroup` position from trail last after step. If paused, still sync. Good.
- Need initial first frame before any step? At t=0, no trail, sync initial. Good.
- Need update plume at t=0: engineOn true. Good. Smoke update maybe spawns. Good.
- Need `renderer.setAnimationLoop(animate);` at end.
- Need set `window.__scene`, `__camera`, `__renderer`, `__rocket`. Set before animation? yes. `window.__ready` after first. Good.
- Need `onResize()` initial. Call after composer/smoke uniform. Good.
- Need maybe call `updateHud()` initial. It will. Fine.

Potential issue `updateSmoke` references `smokeParticles` and `smokeGeometry`, defined. Good.

Need `syncRocketTransform` function:
```
function syncRocketTransform(): void {
 const s = rocket.state();
 if (rocket.trail.length > 0) {
   const p = rocket.trail[rocket.trail.length - 1];
   rocketGroup.position.set(p.x, p.y, p.z);
 } else {
   rocketGroup.position.set(0, LAUNCH_BASE, 0);
 }
 rocketGroup.rotation.z = -s.pitch;
 rocketGroup.updateMatrixWorld(true);
}
```
But if trail last point uses y=LAUNCH_BASE+alt. Good. If reset, no trail, position initial. Good.
- If trail length >0 but simTime? okay.

Need `updateCamera` function uses `rocketGroup.matrixWorld` updated. Good.

Need `updateTrailVisual` uses trailTimes. When reset, `trailTimes` length 0. Good.
- Need if trailTimes shorter than trail due external push? fallback.
- Need capacity. Implement:
```
let trailCapacity = 2048;
let trailPositions = new Float32Array(trailCapacity * 3);
const trailGeometry = new THREE.BufferGeometry();
let trailPositionAttribute = new THREE.BufferAttribute(trailPositions,3);
trailGeometry.setAttribute('position', trailPositionAttribute);
...
function ensureTrailCapacity(n:number): void {
 if (n <= trailCapacity) return;
 while (trailCapacity < n) trailCapacity *= 2;
 trailPositions = new Float32Array(trailCapacity * 3);
 trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
 trailGeometry.setAttribute('position', trailPositionAttribute);
}
```
Need `trailPositionAttribute` declared `let`. In update, after filling, `trailPositionAttribute.needsUpdate = true;`. Good.
- `trailGeometry.setDrawRange(0, n);`.
- `trailGeometry.boundingSphere`? Set `trailGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,0), 1e7);` maybe. But frustumCulled false. Not needed.
- If n=0, set drawrange 0. Fine.
- For drift, use now - trailTimes[i]. But if age huge, drift huge. Use clamp age to maybe 120s? Contrails drift slowly, could drift. Use `const age = Math.min(Math.max(0, now - (trailTimes[i] ?? now)), 120);` Then drift max ~200m. Good. If trail from minutes, drift capped. But contrail in sky should stay and drift slowly, not necessarily cap. But cap avoids crazy. Use 120? The flight lasts minutes; at 30x, real time may be short. Fine. Use 180.
- Drift vector maybe x = age*1.2, z = -age*0.5. At 100s, x=120m, z=-50. Good.
- The trail line's newest point is rocket base. Old points drift. Good.
- But if we cap, okay.
- Need y maybe `p.y + age*0.1`? Not. Keep.
- `trailPositions[i*3] = p.x + age*1.2; ...`.
- At high alt, the line drifts sideways; visible.

Need `updateSmoke`:
```
let smokeSpawnAccumulator = 0;
function updateSmoke(dt:number, state:RocketState): void {
 if (dt <= 0) return;
 // spawn
 if (state.t < 45 && state.alt < 5000) {
   smokeSpawnAccumulator += Math.min(dt,0.05) * 1400;
   while (smokeSpawnAccumulator >= 1 && smokeParticles.length < MAX_SMOKE) { spawnSmokeParticle(); smokeSpawnAccumulator -=1; }
 } else { smokeSpawnAccumulator = 0; }
 // update existing
 for...
 // pack
 ...
}
```
Using `Math.min(dt,0.05)` to avoid huge spawn on tab resume. But if paused? not called. Good.
- At 30x, frameDt maybe 0.016, dt 0.016, spawn 22 per frame. Over 1.3s ~1800. Good.
- At low speed, 1400/s; over 10s max 1800. Good. Fine.
- `state.t < 45 && state.alt < 5000` could stop at alt 5000 (maybe t ~25). Use both. Good. At x30, t<45 is 1.5s. Enough.
- If reset t=0. Good.
- Need update existing before spawn or after? Spawn then update ages? New particles age dt. Fine. We can update existing then spawn. Simpler: spawn first then update. New age dt. Good.
- Need remove dead with swap-pop:
```
for (let i = smokeParticles.length - 1; i >= 0; i--) {
 const p = smokeParticles[i];
 p.age += dt;
 if (p.age >= p.life) { smokeParticles[i] = smokeParticles[smokeParticles.length-1]; smokeParticles.pop(); continue; }
 ...
}
```
But then packing after removal. Good.
- Need if i replacement? We iterate descending and remove with swap-pop. If we swap from end (which may be >i? Since iterating descending, end index is >= i, maybe already processed? Example length 5, i=4 remove -> pop; no swap. i=3 remove -> swap with last index 3? Actually length after pop? If i=3 and length=4, last index 3, assign self then pop. Fine. If i=1, length 2, last index1, assign self. Actually descending means last index equals current i? Usually if removing lower index after higher removed, length is i+1? Let's check: iterate i=4..0, after removing at i, length decreases. At i=3, length=4, last index3 = i, so no swap problem. So no issue. Because we iterate from end, current i is always last index after previous removals? Yes, if no new particles. So simple pop. But if at i=2, length=3, last index2. So just `smokeParticles.pop()`? Actually if descending, i equals length-1 always? Initially i=length-1. Remove i -> pop. Next i-- equals new length-1. Yes. So just `smokeParticles.pop()` works when removing current i. But if we skip some? still. Use `smokeParticles.splice(i,1)` simpler. Max 1800, O(n) but okay. Use splice.
- Then pack all active to attributes.
- Need positions array length MAX_SMOKE. If smokeParticles.length <= MAX. Good.
- Update geometry drawRange. Set needsUpdate for attrs. `smokePositionAttribute.needsUpdate=true` etc.
- `smokePoints.visible = smokeParticles.length > 0 && localScene.visible;` But environment sets. Good.

Spawn function:
```
function spawnSmokeParticle(): void {
 if (smokeParticles.length >= MAX_SMOKE) return;
 const side = Math.random() < 0.5 ? -1 : 1;
 const x = (Math.random() * 2 - 1) * 10;
 const z = side * (16 + Math.random() * 55);
 const y = 2.5 + Math.random() * 5;
 const vel = new THREE.Vector3((Math.random() - 0.5) * 5, 0.8 + Math.random() * 3.0, side * (7 + Math.random() * 11));
 const warm = Math.max(0, 1 - Math.hypot(x, z) / 80);
 const color = new THREE.Color(
   0.95 + 0.05 * Math.random(),
   0.92 - 0.08 * warm,
   0.88 - 0.18 * warm
 );
 smokeParticles.push({pos: new THREE.Vector3(x,y,z), vel, age:0, life: 8+Math.random()*14, size: 8+Math.random()*18, opacity: 0.18+Math.random()*0.22, color, seed: Math.random()*10});
}
```
But `new THREE.Color(r,g,b)` accepts numbers. Good. Values maybe >1? 0.95+0.05=1.0. Good.
- Initial y 2.5-7.5. Ground y=0.1. Smoke rolls out. Good.
- Since trench exits along z, z=±16..71. Good.
- Some smoke near x? x ±10, within trench. Good.
- The initial `y` should maybe start at 2.5, above pad. Good.
- The smoke cloud rolls sideways along ground. Good.

Update particle:
```
const grow = 1 + p.age * 0.55;
const fadeIn = Math.min(1, p.age / 0.8);
const fadeOut = Math.min(1, (p.life - p.age) / 3.0);
const alpha = p.opacity * fadeIn * fadeOut;
```
- `p.opacity` max 0.4; overlapping many gives thick. Good.
- Need velocity update:
```
p.vel.x *= Math.exp(-0.18*dt);
p.vel.z *= Math.exp(-0.12*dt);
p.vel.y += (0.8 + 0.4*Math.sin(p.seed + p.age*1.7)) * dt;
p.vel.x += Math.sin(p.seed + p.age*0.9) * 0.15 * dt;
p.pos.addScaledVector(p.vel, dt);
if (p.pos.y < 1.0) { p.pos.y = 1.0; p.vel.y = Math.max(p.vel.y,0.2); }
```
- For rolling sideways, z velocity initial high, damping 0.12. Over 10s, decays to 0.3*initial; moves ~? integral 20/0.12*(1-exp(-1.2)) =166*0.7=116m. Good. Nice.
- y velocity buoyancy increases. Initial 0.8-3, buoyancy 0.8/s over 10s -> 8m/s, rises ~50m. Good.
- size grows to 8+18 * (1+5.5)=~150? Actually p.size 26, age 10 -> grow 6.5 =>169m. Very large. Could be too big. Maybe grow = 1 + age*0.35; at 10 ->4.5; size 26 ->117. Good. Use 0.35. At 20 ->8; 208. Life up to 22. Fine. Soft. Clamp size to 180 maybe. Use `Math.min(180, p.size*grow)`. Good.
- At camera low, large smoke. Good.

Need update smoke geometry color. `smokeColors[i*3] = p.color.r` etc. `smokeColorAttribute.needsUpdate=true`. Good.

Need smoke material uScale. On resize:
```
function updatePointScale(): void {
 const h = renderer.domElement.height;
 smokeUniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
}
```
But `renderer.domElement.height` after setSize. Good.
- Need use `renderer.getDrawingBufferSize`? `renderer.domElement.height` actual pixels. Good.
- On resize, set size then updatePointScale. Good.

Need `composer.setSize` with width,height (CSS). Good.

Potential issue `renderer.domElement.height` after setPixelRatio/size. `setSize` sets canvas.width = width*pixelRatio. Good.

Need no `THREE` namespace types for `THREE.Material`? yes.

Need maybe use `Math.random` in shader? no.

Let's consider strict TS issues with `THREE.MeshPhysicalMaterial` parameters `clearcoat`. Type exists. Good.
- `toneMapped` in SpriteMaterialParameters? `MaterialParameters` includes `toneMapped?: boolean`. Yes.

Potential issue imported `OutputPass` path. In three v0.160, `three/addons/postprocessing/OutputPass.js` exists. Good.

Potential issue `UnrealBloomPass` constructor resolution `new THREE.Vector2(window.innerWidth, window.innerHeight)`. Good.

Potential issue `renderer.setAnimationLoop(animate);` animate returns void. Good.

Potential issue `clock.elapsedTime` property maybe after getDelta. Good.

Need maybe add `renderer.domElement.style.userSelect = 'none';`. no.

Need use `window.innerWidth` and `innerHeight`. Good.

Need no other HTML. We create overlay, canvas. Fine.

Need test expose. Good.

Now think about physics realism and possible huge accelerations. Let's roughly calculate t=200 altitude and velocity. Thrust constant 7.0 MN. Mass decreases linearly. Vertical component cos(pitch). Pitch starts 10s, reaches 0.5 at 150. Horizontal component. Vertical accel from thrust T cos/m - g. Thrust/m:
- t=0: 12.75, net 2.94.
- t=50: mass = 550 - 330*(50/200)=467.5k; T/m=15.0; pitch maybe u=(40/140)=0.286, smoothstep=0.286²*(3-0.572)=0.0818*2.428=0.1986 rad; cos=0.980; net=15*0.98 -9.81=4.9.
- t=100: mass=385k; T/m=18.22; pitch u=90/140=0.643; smooth=0.643²*(3-1.286)=0.413*1.714=0.708; pitch=0.354; cos=0.938; net=17.1-9.81=7.3.
- t=150: mass=302.5k; T/m=23.24; pitch=0.5 cos .878; net=20.4-9.81=10.6.
- t=180: mass=253k; T cap? 3*m*g=3*253k*9.81=7.45MN >7.0, so T=7.0; T/m=27.7; pitch 0.5 cos .878; net=24.3-9.8=14.5.
- t=200: mass=220k; T cap 3*220k*9.81=6.475MN; T/m=29.43; cos .878 =>25.84; net ~16.0 at end. But mass linear to dry, thrust zero exactly at 200. At t just before 200, high. Vertical velocity integral maybe huge. At t=200, vertical velocity maybe >2500 m/s. Altitude maybe >200km. This is too high? Let's integrate roughly: net vertical acceleration average over 0-200 maybe 7 m/s², delta v 1400. But acceleration increases to 16, average maybe 8. At t=150 v maybe 900, alt 50km. At t=200 v maybe 1800, alt 140km. Good. Actual Falcon 9 reaches 200km? First stage separation at ~70km, second stage etc. This model thrust for 200s at full may go high. But okay.

At t=200, thrust zero, vertical velocity ~? If alt >100km, sky black. Good.

Need camera at 100km. Good.

Earth curve. At 100km, horizon distance sqrt(2Rh)=sqrt(2*6.371e6*1e5)=1.13e6 m. Earth sphere visible. Good.

Need local scene hidden at 45km. At 45km, earth sphere. Good.

Potential issue Earth sphere at high altitude and sky: The earth sphere is huge and centered below, extends far. The camera at 100km, if looking at rocket center and camera below center, the earth may fill lower half. Good.

Need trail. Good.

Now perhaps need add a sun and sky atmosphere. The sky shader with altitude from ground blue to black at 100km. At low, horizon pale. Good.

Need maybe add clouds? Not required. Local fog/haze. Good.

Need no external assets. Good.

Potential issue strict compile: `new THREE.CanvasTexture(canvas)` uses HTMLCanvasElement, available. `document.createElement('canvas')` returns HTMLCanvasElement. Good.
- `const ctx = canvas.getContext('2d'); if (!ctx) throw new Error(...)`; ctx type CanvasRenderingContext2D. Good.
- `ctx.createRadialGradient`. Good.

Potential issue `THREE.Color` constructed with r,g,b numbers. Good.

Potential issue `THREE.SpriteMaterial` color property type Color. `mat.color.setHex`. Good.

Potential issue when accessing sprite material: `const mat = sprite.material as THREE.SpriteMaterial;` Good.

Potential issue with arrays of `THREE.Sprite` typed. Good.

Potential issue with `sunLight.shadow.camera` typed OrthographicCamera? DirectionalLightShadow.camera is OrthographicCamera. Good.
- Set left/right/top/bottom. Good.

Potential issue `renderer.outputColorSpace` property exists. Good.
- `THREE.SRGBColorSpace` constant. Good.

Potential issue `composer.setSize` type. Good.

Potential issue `UnrealBloomPass` strength etc. Good.

Potential issue `OutputPass` no types? Assume.

Need maybe avoid `OutputPass` to reduce type risk? The prompt expects addons. But `OutputPass` is fine. If types missing, compile error. In three.js npm, the `examples/jsm` modules are included but TypeScript types? Modern three package includes types for addons? Actually three package ships TypeScript declarations under `types/three/examples/jsm/...`? There is `@types/three` for main, but examples maybe included. The prompt likely uses installed three with addons types. Using `three/addons/...` is standard and types exist in `@types/three`. The import path `three/addons/postprocessing/EffectComposer.js` is supported by `@types/three`? I think yes since r147 uses `three/addons/...` type mappings. Good.

Need maybe use `import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';` Some versions call it `OutputPass` yes.

Now code. Need be mindful of file length. Could be long. Must be single code block.

Let's write full code. Need ensure no syntax errors. Use semicolons. Let's craft carefully.

Potential `THREE.MathUtils.smoothstep` usage: `THREE.MathUtils.smoothstep(state.alt, 60, 220)` returns number. Good.
- In updateEnvironment: `const starOpacity = THREE.MathUtils.smoothstep(state.alt, 70000, 100000);` Good.
- `const chaseBlend = THREE.MathUtils.smoothstep(state.alt, 60, 220);` Good.

Potential `THREE.Vector3` allocations each frame. Fine.

Need `const starMaterial = new THREE.PointsMaterial...`; update `starMaterial.opacity`. Good.

Need `stars.position.copy(camera.position)` but if stars geometry radius 8e6, and camera far 2e7. Good.

Need sky position copy camera. But sky sphere radius 1e6. Camera inside. Good.

Potential issue sky shader uses `normalize(position)` local sphere. Since sky sphere position copied to camera, the local sphere center is camera. Good.
- But `position` local at radius 1e6. normalize gives direction. Good.

Potential issue earth sphere material with `cameraPosition` built-in in ShaderMaterial. In three ShaderMaterial, built-in uniform `cameraPosition` is available? Yes, WebGLProgram adds. Good. But if using ShaderMaterial and not including `#include <common>`, built-in uniforms still? The renderer injects common uniforms via `uniforms`? Actually ShaderMaterial's uniform list is user-defined plus built-ins? In WebGLProgram, built-in uniforms are not automatically declared unless you include `<common>`? Wait ShaderMaterial vertex/fragment code gets prefixed with built-in uniforms? Three injects a prefix with `uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; uniform vec3 cameraPosition;` etc. Yes, ShaderMaterial shaders get these declarations automatically. So `cameraPosition` available. Good.
- For fragment, built-in `cameraPosition` also? The prefix for fragment includes cameraPosition? Usually yes, fragment prefix includes `uniform vec3 cameraPosition;`? Let's recall: WebGLProgram prefixFragment includes `uniform mat4 viewMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;`? I think yes. Good. If not, compile error. To be safe, pass our own `uCamera`? But cameraPosition is standard. We can avoid using `cameraPosition` in Earth fragment by approximating rim with normal and sun? But atmospheric rim needs view dir. Could use `vec3 viewDir = normalize(vWorldPos - cameraPosition);` cameraPosition built-in. Standard. Fine.

Potential issue ShaderMaterial sky fragment uses no built-ins. Good.

Potential issue smoke shader uses `gl_PointCoord` available. Good.

Potential issue `PointsMaterial` map with transparent and alphaTest? Fine.

Potential issue `trailGeometry.getAttribute` not used. Good.

Need maybe `trailPositionAttribute` update after capacity increase. Good.

Need `clearSmoke` references `smokeGeometry`, `smokeParticles`, `smokeSpawnAccumulator`. If called by rocket.reset after initialization. Good.

Need initial `rocket` object creation after smoke? Let's order:
- Define `trail` and `trailTimes` and `viewerSpeed` etc.
- Create smoke system? Actually physics object can be created after smoke. Let's place physics after smoke and trail objects. Then UI uses rocket. Good.
- The smoke update function uses `rocket` state but rocket defined after? Function declaration `updateSmoke` can reference `rocket`? It takes `state` argument, not rocket. Good. `spawnSmokeParticle` no rocket. Good.
- `clearSmoke` no rocket. Good.
- `reset` uses `clearSmoke`, `snapCamera`. Good.
- `snapCamera` declared before? We'll declare near top.
- `rocket` object defined after all. Good.
- UI after rocket.
- Animate after all.

Need `syncRocketTransform` uses `rocket` defined. Function declaration after rocket maybe. Fine.
- `updateCamera` uses `rocketGroup`. Fine.

Let's write.

Check for a potential issue: `smokeUniforms.uMap.value` as CanvasTexture. Fine.
- `uFogColor` value new THREE.Color(0xc3d7e8). In shader `uniform vec3 uFogColor`; Three automatically passes Color as vec3? If uniform value is Color, WebGLUniforms handles. Yes.
- `uSunDir` value Vector3.

Need setting `smokeUniforms.uFogColor.value.copy(fog.color);` if value typed as `THREE.Color`. Inferred from object initial. Good.

Potential issue `fog` const declared after? We'll declare fog before. Good.

Potential issue `localScene` declared before functions. Good.

Need `makeTextTexture` and `makeFlagTexture` use canvas alpha. `ctx.clearRect(0,0,w,h)` then draw. Good.

Need set `tex.needsUpdate = true`? CanvasTexture constructor sets needsUpdate true? Usually yes? Might need `texture.needsUpdate = true`. We can set for all. Not necessary but do. For CanvasTexture, it's true by default? I think not? CanvasTexture sets needsUpdate = true in constructor. But safe set. We'll set `tex.needsUpdate = true`.
- For ground/ocean/concrete too.

Need not use `document.body` before existing? The script runs after body? The module runs, document.body exists. Good.

Need maybe `document.body.style.backgroundColor = '#000';` Good.

Need overlay appended after canvas. Fine.

Potential issue if `window.__ready` set after first composer.render. Good.

Need maybe `renderer.setClearColor(0x05080f, 1)`. With sky, fine. Set.

Now let's produce code.

Double-check TypeScript strict with `interface SmokeParticle` color `THREE.Color`, pos/vel. Good.
- `function spawnSmokeParticle(): void` uses `smokeParticles.push({...})`. Good.
- `MAX_SMOKE` number.
- `smokeGeometry.setDrawRange(0, smokeParticles.length);` good.
- `smokePositionAttribute.needsUpdate = true;` etc. Good.

Potential issue `smokeParticles.splice(i,1)` and then packing. Good.
- In update loop, if splice, loop descending. Fine.

Potential issue `smokeParticles.length` may be 0, set draw range 0. Good.

Need trail line and points share geometry. When capacity changes, both use same geometry. Good.
- `trailLine` and `trailPuffs` added. Good.
- Set `trailPuffs.renderOrder = 4;`. Transparent. Fine.

Need `trailPuffs` PointsMaterial map smokeTexture. It may be affected by fog. PointsMaterial fog true and scene fog. Good. At high fog zero. Good.
- PointsMaterial size 18. At high, size. Good.

Need `updateTrailVisual(now)`:
```
const n = robot.trail.length? Use rocket.trail.
```
Use `rocket.trail`. Good.
- If n > trailCapacity, grow. Need while loop. Use `while (trailCapacity < n) trailCapacity *= 2;`.
- Fill positions. `const age = Math.max(0, Math.min(180, now - (trailTimes[i] ?? now)));`
- `trailPositionAttribute.needsUpdate = true;`
- `trailGeometry.setDrawRange(0,n);`
- Maybe set `trailGeometry.computeBoundingSphere()`? Frustum culled false. Not.

Need `updateCamera(frameDt, state)` uses `state.alt`. Good.
- `const center = new THREE.Vector3(0, 35, 0); center.applyMatrix4(rocketGroup.matrixWorld);` This allocates each frame. Fine.
- `const chaseBlend = THREE.MathUtils.smoothstep(state.alt, 60, 220);`
- `const high = Math.min(state.alt / 100000, 1);`
- `const chaseOffset = new THREE.Vector3(12, -10 - 16 * high, 82 + 8 * high);`
- `const chasePos = center.clone().add(chaseOffset);`
- `const desired = lowCameraPos.clone().lerp(chasePos, chaseBlend);`
- `const target = center.clone();` Maybe target.add(new THREE.Vector3(0,0,0)). Good.
- Smoothing. `const k = 1 - Math.exp(-6.5 * frameDt);`
- If snap camera. Need `camLook` is `THREE.Vector3`. Declared near camera? Use.
- After lookAt, maybe camera.updateMatrixWorld? Not necessary.

Need `updateEnvironment(state)`:
```
skyUniforms.uAltitude.value = state.alt;
const starOpacity = THREE.MathUtils.smoothstep(state.alt, 70000, 100000);
starMaterial.opacity = starOpacity;
stars.visible = starOpacity > 0.01;
fog.density = 0.00012 * Math.exp(-Math.max(state.alt,0)/7000);
smokeUniforms.uFogDensity.value = fog.density;
smokeUniforms.uFogColor.value.copy(fog.color);
localScene.visible = state.alt < 45000;
smokePoints.visible = localScene.visible && smokeParticles.length > 0;
```
- Need `sky.position.copy(camera.position); stars.position.copy(camera.position);` after camera. Could include in updateEnvironment. It has access to camera. Good. Put there.
- Maybe sky uniform sun. Good.
- Earth material? no.

Need `updateHud` uses `rocket.state()`. Good.
- `formatTime`. Good.

Need `onResize` uses `smokeUniforms`. Declared const. Good. Call after smokeUniforms. Good.
- `renderer.setSize(window.innerWidth, window.innerHeight);` and composer. Good.
- `camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();`
- `composer.setSize(window.innerWidth, window.innerHeight);`
- `updatePointScale();`
- Need initial after composer. Good.

Need `updatePointScale` uses `renderer.domElement.height`. If devicePixelRatio, yes. Use:
```
function updatePointScale(): void {
 const h = renderer.domElement.height;
 smokeUniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
}
```
- At initial, renderer.domElement.height set. Good.

Need maybe pixel ratio max 2. Good.

Potential issue `renderer.domElement.height` could be 0 before setSize. We call after setSize. Good.

Now code.