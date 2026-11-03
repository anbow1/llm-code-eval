We need produce a single TS file, compile strict zero errors. Must be thorough and realistic. Need careful engineering. Let's design.

We need Three.js code, procedural textures, physics simulation, camera, sky shader, bloom, smoke particles, flame, tower, ground, ocean, buildings, stars, trail.

Need TS strict. Use imports:
import * as THREE from 'three';
import { OrbitControls }? Not necessary and would conflict camera motion. Addons: Sky? We can use Sky from 'three/addons/objects/Sky.js' maybe. But sky must transition to black at 100 km and stars appear. Could implement own sky dome shader with uniforms altitude. Better. Need UnrealBloomPass from 'three/addons/postprocessing/UnrealBloomPass.js'; EffectComposer from 'three/addons/postprocessing/EffectComposer.js'. RenderPass. Also RoundedBox? no.

Need compile strict. Types.

We need canvas append. Add overlay via DOM? The instruction: page has no other HTML, but overlay text is requested. We can create overlay HTML from JS (append DOM elements) — acceptable since file must create canvas; overlay "small overlay". We can create div elements in code. That's fine. But "page has no other HTML" meaning no external HTML file. We'll create DOM dynamically.

Physics model:
- t, alt h, x? horizontal distance? Need world coordinates. Rocket starts on pad at origin; vertical y altitude. Horizontal position maybe along x? Use coordinate origin at pad center, y = altitude. The launch is gravity turn toward east? We define horizontal direction along +x. Need integrate vertical and horizontal acceleration from thrust + gravity. Gravity acts downward with magnitude g(h), but it also has horizontal component? In inertial frame, gravity vector points toward Earth's center; if rocket moves horizontally, gravity has horizontal component (toward center). At altitudes small, horizontal component negligible but we can model approximate. Requirement: equations of motion vertical and horizontal acceleration from thrust component and gravity. Could compute gravity vector in local? Simpler: gravity magnitude g(h) downward vertical only, but horizontal motion due to pitch. Physical: at altitude h, gravity direction toward Earth center; if horizontal displacement is small compared to R, almost vertical. We can use g(h) vertical downward, and pitch thrust components: vertical T cos(pitch) - g; horizontal T sin(pitch) (plus maybe gravity horizontal toward center = -g * x/(R+h)? We can include). Let's model position (x, y, z maybe z=0) in launch plane. Earth center below origin? Use altitude y plus horizontal x. Gravity vector = -g(h) * (x, y+R?)/norm? At small x, vertical. Let's keep gravity along -y plus small horizontal correction -g * x/(R+h), where radial vector from center to rocket: x horizontal, y+R vertical. Gravity points toward -radial: (-g*x/(R+h), -g*(R+h)/(R+h) = -g) essentially. Good. That yields no meaningful horizontal at small alt. But at large x? Rocket horizontal displacement may be hundreds km. That's correct. But altitude h is vertical y? "h altitude" from pad = y. Gravity formula uses R/(R+h)^2 based on height above surface, good. We can integrate horizontal with acceleration from thrust x component plus gravity x component. But for trajectory shape, gravity turn pitch. At burnout, no thrust. Need rocket coasts? Requirement ascent to space, likely burn then coast? Flight lasts minutes, 200s burn, reaches maybe ~? With T=1.3 m0 g0 and mass decreasing, acceleration high. Pitch 0-0.5. At 200s altitude maybe tens km? Let's estimate. T=1.3*550k*9.81=7.0e6 N. Mass 550k, accel 12.7 m/s² initially. Burn linearly mass 550k->220k. T constant? "Thrust: T = 1.3 * m0 * g0 ... limited to 3*m*g0 (throttle) and zero after the burn." So thrust constant nominal T (not proportional to current mass). Throttle limit only at beginning? 3*m*g0 = 16.2e6 > T, so no limit. T constant until 200 s, then 0. Mass drops. Accel rises to 7e6/220k = 31.8 m/s². Integrate: initial v 0. For first ~200s, mass decreases; average mass ~385k, accel ~18 m/s². v maybe 3600 m/s. altitude ~ (1/2 a t^2?) average velocity maybe 1800 m/s * 200 = 360 km? Wait a = T/m. m decreases, accel increases. v(t) = ∫ T/m(t) dt. m(t)=m0 - (m0-mdry)*t/200 = 550k - 1650 t. At t=200 m=220k. ∫ T/m dt = T*(200/(m0-mdry))*ln(m0/mdry)? Let's calculate: ∫0^200 T/(550000 -1650 t) dt = T*(1/1650)*ln(550000/220000)=T*0.000606*ln2.5=7e6*0.000606*0.916=3886 m/s. Altitude with vertical component and pitch: ∫ v cos pitch dt, maybe ~? first 10 sec straight, then pitch grows to0.5. Vertical velocity ~ v cos pitch. Average maybe 3000*0.9*200=540 km. But gravity reduces, about 100 km. At 200s altitude maybe 250 km? Let's numerically approximate. Vertical acceleration = T cos p /m - g. horizontal = T sin p/m. At t=200, m=220k, T/m=31.8. cos0.5=0.878 ->27.9; gravity g at h ~250km: g0*(R/(R+h))² ≈9.81*(6371/6621)^2≈9.13. net vertical 18.8. Pitch increases gradually to 0.5. Horizontal acceleration ~15.2. Velocity vertical accumulates. At t=0 a=12.7. At t=100 m=385k, T/m=18.2, pitch maybe 0.33, vertical 17.2, minus 9.7=7.5. Vertical velocity from 0 to100 maybe 500 m/s? Actually integrate: early high? Let's compute rough: vertical accel average maybe 10 for 200s, v=2000, altitude=200k. At burnout vertical speed maybe 2000. Then coasting under gravity to apogee around 200 km? But "ascent to space" maybe 100 km. Need trajectory to space. Possibly need add coast and reach high altitude. Let's simulate precisely later maybe. We can include after burn coast ballistic (no thrust). Height maybe 300 km, then falls? We need ascent to space and camera with rocket; don't need orbit. But "all the way up" and "curve of Earth and then space"; we can allow flight long enough, maybe reaches 100 km. We need perhaps stop at apogee? The physics model not animation. Need state speed and overlay.

At 200s, might be altitude 250 km? Let's estimate using differential with mass decreasing. Need maybe integrate. Could simulate approximate with code mentally. But we don't need exact numbers; scene can show. Need maybe rocket reaches >100km for sky stars. If at t=200 altitude ~70 km? Let's rough integrate.

m(t)=550000 - 1650 t kg.
a_vertical = (T/m) cos p - g(h).
At t=0 p=0 cos1, T/m=12.73, g=9.81 ->2.92 initial net.
t=10 p≈0? Actually pitch starts after 10s, p=0; m=533500, T/m=13.12, g≈9.81, net=3.31. v ~30m/s? altitude ~30m? Wait acceleration only 3 m/s², not 12 m/s² because gravity subtracts. Liftoff net acceleration 2.9 m/s². That's slow but realistic T-to-weight 1.3 gives net 3 m/s² yes. t=10 v= maybe 25m/s. By 100s p maybe 0.33, T/m=18.2, cos .946 ->17.2 - gravity ~9.6=7.6. average maybe 6; v ~600m/s. t=200 p=0.5, T/m=31.8, cos .878=27.9 - g ≈? altitude maybe 60km, g=9.35, net=18.5, v maybe 1400m/s. Altitude with average v maybe 500m/s over 200s =100 km. Ah could be ~100 km. At t=200 v maybe 1500, alt ~120 km. Then burn ends, coast up to apogee ~? deceleration g ~9; time 150s; altitude gain ~ (v^2/(2g)) ~125km, total ~250km. So stars. Good.

Need integrate with substep <=0.02. `step(dt)` any dt; internally substeps. Need ensure trail one point per step() call, not per substep. Use final position after integration. Trail array same object; reset length 0. paused boolean. Reset clears viewer choice. Speed: "It is 1 for liftoff (t<10 s) and then 10, unless viewer chose a speed: keys 1,2,3 (and three buttons) set x1,x10,x30. state().speed returns current value; reset clears viewer's choice." Need implement viewer speed selection. Since no external HTML, build buttons and listen keyboard keys 1,2,3. `viewerSpeed` null; effective speed? If viewer chosen speed, use that always? "It is 1 for liftoff (t < 10 s) and then 10, unless the viewer chose a speed". Could interpret default flight time scale: t<10 -> 1, t>=10 ->10; viewer choice overrides. But if viewer chose x1, speed 1 all times. If x10 or x30. Reset clears. Need state().speed returns current value. Render loop calls step(min(delta,1/30)*speed). We need compute speed based on t: default if no viewer: t<10?1:10; if viewer: chosen. On reset, t=0, speed maybe 1. The rocket object maybe state.speed dynamic. We'll implement in Rocket.

Need step function: update simulation with dt *? Wait step(dt) advances simulated time by dt seconds; render loop calls step(min(delta,1/30)*speed). So speed already applied externally. state().speed returns current playback speed. step's parameter in simulated seconds. So internal integrates to t+dt.

Trail array of {x,y,z} world points of rocket, one per step() call. If step dt huge, only one new trail point final position. That's okay. But trail visible contrail should be drawn from trail points; after reset emptied. Need create line geometry updated. Trail points can be at altitude up to hundreds km, scale huge. Three units 1m. Camera near rocket; Earth huge. Scene coordinate issues: World at Cape Canaveral origin at pad. Earth radius 6.371e6, ocean horizon. At altitude 100km, we need still show coast. Camera chase near rocket (within 100m). Need maybe render ground/ocean at origin and maybe large curvature? Since camera at 100km near rocket, pad far below and tiny; but view coast maybe from near rocket? Actually at 100km, near rocket, coast below far, visible? Need Earth curvature. We can create a huge sphere Earth? But scene local coordinate. We need camera travel with rocket. At high altitude, pad and coast disappear except maybe Earth below. We can build Earth as giant sphere centered at y=-R (below pad) with radius R. Pad on surface. Rocket ascends from surface. Camera near rocket. Then view Earth below. Ocean etc. But building all coast on surface of sphere complicated. Alternatively use flat ground with horizon fog, and as altitude increases, ground far below. At camera at 100km, looking at rocket, the ground will be below and far; curvature not obvious. Could include a large curved ground mesh (Earth hemisphere) with radius R, centered y=-R. Pad at top. Texture coast etc. This is huge scale; camera near rocket at y=alt; distance to Earth surface in view. Need render Earth from space: sphere radius 6.371e6, centered at (0,-R,0), top at y=0. Rocket altitude y. When camera near rocket at y=100km, Earth below. A sphere of radius R will appear huge. Need sky dome around camera? Use sky shader environment? We can create sky as large sphere maybe radius 1e7, center at origin? But camera altitude changes; sky dome center at Earth? Better use background gradient via shader on sphere/hemisphere at origin, or use scene.background Color and custom skyline. At high altitude, background black. But viewing Earth from space with stars.

Simplify: Use coordinate origin pad at y=0. Earth sphere centered y=-R. Ground surface only locally near pad? Could make huge sphere with material. But texture / ocean etc. Need horizon. Could instead make an Earth sphere (radius R) with procedural shader using position to color land/ocean? That would look realistic from orbit. At ground, local coast details need flat plane at y=0 around pad (few km) overlaid. At altitude, Earth sphere visible. Since sphere surface at y=0 near origin. A flat plane at y=0 would be tangent to sphere and hide near local terrain; from high altitude, sphere dominates. We can add local flat ground plane within radius maybe 20 km. Ocean horizon: flat plane extends far. At altitude, sphere.

The ground plane at y=0 with ocean on horizon. Use fog. But camera near rocket at alt 100km: fog? Fog density with height? Need aerial perspective. Use fog maybe not appropriate at high altitude; use atmospheric shader. Need manage.

Alternative scene: pad and coast as flat plane, but as camera climbs, the plane recedes below. To show Earth curve, use large sphere. Add local plane only near pad. At 100 km, looking at rocket, the camera sees Earth below, the pad may be distant 100 km down. The rocket and plume visible. Good.

Camera: Initial low camera near pad looking up at liftoff. We need "once the rocket clears the tower the viewer travels with it, close to rocket (within 100 m, like a chase plane)". We can smoothly transition from ground camera to chase. Camera position = rocket position + offset based on altitude/distance, looking at rocket. Need camera near rocket at altitude. Must show coast early and Earth/space later. For liftoff, low camera near pad, rocket moves up; camera stays near ground until clears tower? Then chase. Could implement camera:
- Define fixed pad camera at (e.g., 70m, 20m, 60m) looking at rocket. At t small, camera fixed near pad with slight tracking.
- After rocket altitude > tower height + maybe 20m (t maybe ~?), transition blend to chase position: rocket pos + offset vector (horizontal away, vertical maybe + some behind/above). Use elapsed/altitude smooth.
- Chase offset within 100 m: e.g. `offset = (90, 15, 40?)` scaled? Need look at rocket from near. But at high altitude, camera close to rocket, view coast below if camera angled. We need orientation such that looking at rocket, but also seeing Earth in background? Camera position relative to rocket with vector: maybe (35, 15, 65), looking at rocket, so camera sees rocket center and background behind includes Earth? If camera is above/side and look at rocket, Earth below in lower frame maybe. To see coast and curve, place camera slightly above rocket and look down at rocket? If camera looking at rocket, Earth behind. Let's design chase camera offset: `(40, 10, 80)`? The rocket vertical; camera near it at same altitude, looking roughly horizontally; it sees rocket and background sky. Coast below may not be visible if horizontal. Could have camera elevated above rocket by ~30m and look at rocket; ground/Earth in background? Actually looking down at rocket from above/forward, field includes Earth below. Hmm.

Maybe camera near rocket at altitude but with view angled downward: camera at 50m above rocket and horizontal offset 100m, looking at rocket; behind rocket is Earth below? The rocket is between camera and Earth? If camera above rocket, looking down, Earth below background. At 100km, Earth appears below, good. At early, pad visible. We can have chase camera offset relative rocket: `camPos = rocketPos + (60, 30, 80)`? Then looking at rocket center; background behind rocket is sky mostly, Earth below lower frame. Maybe okay.

Need "Smooth camera motion." Use interpolation with time and smooth target. Could use lerp with a transition. Use `THREE.Vector3` and elapsed.

Need rocket geometry: 70m tall, 3.7m diameter. Falcon 9-like: body cylinder 3.7m diameter, height ~? Actual Falcon 9 overall 70m with 3.7m diameter? 70m is S1 + S2 + fairing? We can model:
- engine section from y=0 to 8m? Nozzles at bottom. Body white cylinder from y=8 to y=55m; interstage band; second stage from y=55 to 62m; fairing y=62 to 70m tapered nose.
- Main body: CylinderGeometry(r=1.85,r=1.85,h=47, radial 64, open? maybe). Place y=8+23.5? Need bottom at y=0? On pad. Rocket base at pad y=0. Maybe engine nozzles extend below? Pad y=0, rocket base y=2? Let's define rocket group at launch pad top. Rocket bottom at y=0. Maybe nozzle section from y=0 to 8.
- Use MeshStandardMaterial with white, metalness low. Add dark band. Use canvas texture markings: flag and lettering. Could create a canvas with stripes/flag and words "FALCON 9" maybe not correct; no fonts? Canvas default fonts fine, not network. Use `ctx.fillText`. Need ensure texture maps onto cylinder (UV). Canvas width 1024 height 512. Draw white background? Wait body material already white; use texture only for markings with transparent? Better map a cylinder texture: background white, dark band, flag and "USAF" or "SpaceX". The requirement says markings (a flag and lettering drawn on a canvas texture). We can create a canvas texture with a flag + lettering, and use material map. We need orient on cylinder. Texture wraps. Draw band? Could use separate band material. Simpler create canvas texture for body: white base, horizontal dark band near top? Draw a US flag small + "FALCON 9" lettering. Use map on cylinder. But canvas is wrapped around circumference. The flag might appear on one side. That's fine. Need flag red, white, blue. Also maybe "USA" mark. Include lettering.

Need physically based materials: MeshStandardMaterial roughness/metalness.

Need engines/nozzles: 9? Falcon 9 main has 9 engines (Merlin). Build 9 nozzles using Cone/Cylinder, metallic dark. Maybe 8 around + center? Use mesh. Engine plume from nozzles: create big cone/glow. Need flame core blinding white-yellow, fading orange. Use additive shaders / sprite.

Need smoke clouds from many soft particles or sprites. Need procedural smoke sprites via canvas textures with radial gradients/noise. We can generate a small canvas (e.g., 256x256) with radial gradient multiple blobs, transparent). Use SpriteMaterial with map, transparent, depthWrite false, blending additive? Smoke should be white/gray, opacity. Many sprites around pad, with positions and animated rising/sideways. Need "large billowing white steam and smoke clouds that roll sideways out of flame trench along ground and then rise." Could create a particle system with sprites (THREE.Points with Shader material? SpriteMaterial per instance impossible huge but can use InstancedMesh? Sprites in Points with custom shader to render soft circles with noise? Simpler: create 300 Sprite objects, each with a canvas texture. This is okay. Animate positions based on elapsed after liftoff, using deterministic pseudo-random parameters. Need not depend on frame count. Use elapsed.

However 300 sprite objects each with own material? Use shared material. Use group. Add maybe 450 sprites. Update positions in animation loop based on elapsed. Need generate smoke initially at pad/ground and grow. At t simulated? We use elapsed real time? The scene motion uses elapsed time. But smoke should correspond to flight simulation time t? The launch plume/smoke should expand as rocket ascends, and when t grows, smoke still on ground. Since playback speed changes, use rocket state t for simulation effect? We can use real elapsed for flickering; smoke after liftoff should persist as rocket time. Use rocket t (sim time) for cloud evolution, because flight sim. However render loop step only when not paused; if paused, smoke frozen? We can freeze? Maybe use rocket altitude/time. For visual smoke, use launch time = rocket state t. Good.

But at t > 200 burn ends, plume vanish? "zero after burn". Need flame after burn maybe no thrust; at 200s engine off. However ascent to space after burn continues ballistically. Plume "ascent: plume grows longer and wider as air thins; contrail stays in sky". At high altitude, plume should remain? If thrust zero, no plume. But real Falcon 9 second stage continues? We only have one mass burn 200s. At 200s engine off, no plume. Requirement includes plume grows as air thins, maybe during burn. After burn ends; maybe can still show flame until 200 then fade quickly. Fine. But for high altitude >100km, likely at t=200 altitude ~? It may reach 100km. Need ensure stars. Let's simulate.

Need trail: white contrail behind rocket, drawn from trail points. Since trail points one per step call, may be sparse if speed 10 and dt 0.033 -> step dt 0.33s. Trail points every 0.33s. At 100km, line geometry using Buffer. Need line material transparent white, maybe use TubeGeometry? "visible white contrail behind rocket, drawn from trail points." Use LineSegments/Line with LineBasicMaterial or custom shader. At high altitude, trail line may be huge, draw depth. Need update geometry each frame. Trail array of points in world coordinates. Need line from trail, perhaps two lines? A simple `THREE.Line` with BufferGeometry. Use `LineBasicMaterial({color: 0xffffff, transparent:true, opacity:0.35, depthWrite:false})`. But line between points. At scale 100km length. Fine. For soft contrail, use TubeGeometry? Updating a line is simpler. Requirement says drawn from trail points. We can use `THREE.Line`. Maybe add a second line offset? The point itself is rocket position; trail should be behind rocket. That's okay.

Need launch tower next to rocket: lattice tower. Build using cylinders/box beams. A tall tower ~60m next to rocket. Use lattice: vertical pillars and horizontal crossbars, diagonal braces. Need tall lightning masts around pad. Use many thin cylinders. Need efficiency. Use MeshStandardMaterial metal gray. Add umbilical arms from tower to rocket? Could add horizontal pipes. Need not too heavy.

Pad: concrete pad with flame trench. Use cylinder or box. Pad dimensions e.g. 80m radius? Launch pad at Cape Canaveral, concrete pad with flame trench. Use a square-ish pad with concrete texture. Concrete procedural canvas: gray with noise, cracks, stains. Create canvas 512 or 1024, use as map on plane. Generate noise with Math.random? deterministic maybe not necessary. Use CanvasTexture. For large pad, repeat. Need "procedural textures (canvas or shader) for concrete, ground, vegetation". We can create canvas textures. Need no external assets.

Ground: flat plane large area with green scrub. Use ShaderMaterial or mesh with procedural texture. At large extents maybe 20000m? Fog. Since Earth sphere background. Let's think scale: pad at origin. Ground local plane 30km x 30km, ocean beyond horizon at maybe 20 km. Camera at pad low: horizon ocean visible. To make ocean horizon, use plane maybe from y=0, land extends to z? The coast: ocean horizon behind pad. We can create ocean plane at y=0.05 from e.g. x from -50000 to 50000 and z? Need coordinate. Maybe pad at (0,0,0), ocean starts at z=-8000? Hmm camera near pad looking up at rocket; background horizon at distance. Ocean on horizon behind pad: use large ocean plane behind land. Land plane z from -? Let's set north? Simplicity: origin pad, ocean in -z direction behind pad (camera might be at +z looking towards pad? Camera can see ocean behind). Set ground plane for x,z up to maybe 20km. Ocean plane huge at z < -2000? Actually pad is near coast; ocean horizon behind pad. Put ocean plane centered at z=-5000, large, y=0.01. Land plane covers z>= -2000? Need avoid ocean visible over land. Could have land plane extending to coast line at z=-1000, ocean beyond z<-1000. But camera low from side may see. Use ground plane with texture and another ocean plane.

However at high altitude, flat local plane would be too small. Add Earth sphere. Maybe local coast in first stage. At high alt, Earth sphere with procedural shader. Need hide local plane when camera high? It will be visible from high altitude if not too small? 20km plane at 100km altitude appears below; okay. But Earth sphere radius huge visible behind. The local plane at surface would be small. No issue.

Sky: Need from blue at ground to black at 100km, stars above 70km visible, clearly above 100km. Could use background sphere with ShaderMaterial dependent on camera/rocket altitude. If sky sphere centered at origin radius 1e6? At camera altitude 100km, background sphere centered at origin, camera inside, fine. Shader uses direction normalized from camera? Use vertex position normalized and `uniform alt`. But sky should be rendered as background sphere with camera moving; if sphere centered at origin radius large, horizon? At 100km, sphere radius 1e6, camera inside. Use side BackSide. Gradient based on vertical direction maybe. We can make sky dome with vertex y normalized and altitude uniform to blend to black. Also stars: points visible with opacity increasing with altitude. Could add star field as points on sky sphere? Use custom points with opacity based on alt. Need stars clearly visible above 100km. `starMaterial.opacity = smoothstep(70,100, alt)`; size maybe. Points distributed sphere. Since camera near rocket at high altitude, star sphere radius 100000? Need render beyond. Could make stars at radius 1e6 around origin. At camera around rocket at y=100km, stars far. But if camera near rocket, sphere center at origin and radius 1e6, stars. Fine. However stars in shader should appear above 70 km. Use Points with shader or material transparent opacity. Need update opacity per alt.

Sky shader: We need atmosphere scattering. Can use a custom sky dome shader with Rayleigh scattering approximate? Or use Sky addon. Addons include `Sky` which simulates atmosphere and sun. But need black at 100 km. Could use Sky shader with uniforms? The Sky addon uses shader with turbidity, rayleigh, etc. But to make black at altitude, we could set `scene.background` to a custom gradient or use Sky with `sunPosition` but not altitude. Custom shader easier.

Need realistic hazy sky near horizon. Sky dome shader: gradient based on view direction vertical `v = normalize(vPosition).y` maybe. At ground, horizon pale blue-white, zenith deep blue. Use `alt` uniform to darken and fade near horizon? At high alt, sky behind rocket should be black, with stars. But Earth below still visible. The sky dome should be black at 100km. Need account camera height? If sky dome sphere centered at origin and camera at altitude 100km, direction in shader relative origin maybe not same as view direction from camera. Better use a huge sky sphere with center at camera? But camera moves; could create sky sphere parented to camera? Use `scene.background` shader? Three.js supports shader background? Could set `scene.background = new THREE.Color` but no gradient. Use custom sky dome mesh positioned at camera each frame? Or set a sky sphere centered at origin with radius very large and use `vWorldPosition` direction from camera? We can update shader with `uCamPos` uniform and compute normalized `position - camera`. But positions on sphere at radius 1e7; camera inside. For a full sphere, direction from camera roughly position normalized; okay. Use vertex position and camera position? Need transform to world and camera position. Shader can use `vWorldPosition` and `uCameraPos`; compute gradient by normalized direction from camera. But sky dome is rendered from inside; for each fragment direction from camera to vertex. That's correct. However camera inside sphere; if sphere radius 1e10, directions approximate. Use `side: BackSide`. Shader:
```
uniform float uAlt;
uniform vec3 uCamPos;
varying vec3 vWorldPos;
...
vec3 dir = normalize(vWorldPos - uCamPos);
float y = dir.y;
float horizon = smoothstep(-0.1, 0.3, y);
vec3 day = mix(horizonColor, zenithColor, smoothstep(0,0.6,y));
day = mix(day, black, smoothstep(0.0, 1.0, uAlt/100000?)?)
```
When altitude 100km, entire sky black? But horizon at high altitude may be black too. At ground, y positive. Need stars. Also sun? Should show sun disk? We can add sun glow perhaps via sky shader based on `uSunDir`. Realistic. But if high altitude, black. At ground, pale near horizon. Include sun with haze.
Stars: Points material with vertex shader based on `uAlt`. Could use `THREE.Points` and custom shader:
```
uniform float uAlt;
vec3 color; opacity = smoothstep(70,100, alt)
```
But individual stars at sphere; if camera at 100km, stars are far. Need avoid occlusion by Earth? Stars behind Earth invisible because sphere? Points may render even through Earth? They are far and depth; Earth sphere might occlude if in front. At high camera, stars in upper sky. Use radius maybe 3e7; camera near rocket; Earth sphere radius R. The stars at radius 3e7 around origin; some below Earth center; not visible if behind Earth. Fine.

Bloom: use EffectComposer, UnrealBloomPass. Need renderer.toneMapping = ACESFilmicToneMapping; outputColorSpace = SRGBColorSpace. Postprocessing. Could use composer in animation loop. Need first frame. `renderer.setAnimationLoop(animate)`. `__ready = true` after first frame.

Need shadows from sun. Directional light large. Shadow camera: with huge scene, shadow needs cover launch area, not high altitude? Rocket shadow? At high altitude, shadow of rocket not on ground. Sun directional. Use light target at origin. Shadow map 2048. Need `castShadow`/`receiveShadow` for pad, tower, rocket. At high altitude rocket cast may not show. Directional light shadow camera near pad. Fine.

Need physically based materials. Use PBR. Need flame lighting from plume flickering lights pad/rocket. Add PointLight / SpotLight at nozzle with intensity flickering using elapsed. Need maybe two point lights (orange/yellow). Add directional sun. Need if plume off after burn, lights fade. Compute burn active = t<200, fade. Use simulation time. Use point light intensity based on t.

Need animation uses elapsed/delta. Render loop step. Need visual flicker from elapsed.

Need camera: if paused, camera still? paused stops step but render loops; motion no step. Use t from rocket state. Could maybe camera based on t. Fine.

Need physics integration. Let's define `Rocket` class/interface.

Constants:
```
const G0 = 9.81, EARTH_R = 6371000, M0 = 550000, M_DRY = 220000, BURN = 200;
const T_NOM = 1.3 * M0 * G0;
```
"T = 1.3*m0*g0 (thrust-to-weight 1.3 at liftoff), limited to 3*m*g0 (throttle) and zero after burn." T constant? yes. The mass falls linearly. In step, for each substep:
m = m0 + (m_dry - m0) * t / burn for t<burn, else m_dry. But if burn ends, mass dry. Thrust = (t<burn ? min(T_NOM, 3*m*g0) : 0).
Pitch: 0 at liftoff; after 10 s starts to grow (gravity turn), reaching about 0.5 rad at 150 s, never decreases. Need define pitch(t) as t<10 =>0; then smooth growth from 0 at 10 to 0.5 at 150, then maybe continues? Requirement "reaching about 0.5 rad at 150 s, and it never decreases." Could after 150 stay 0.5 or grow more? Real gravity turn pitch increases over burn. We can define pitch = 0.5 * smooth ramp for t in [10,150], then maybe slowly increase to e.g. 0.62 at 200? "never decreases". If reaches 0.5 at 150 and never decreases, we can stay 0.5 after. But maybe gravity turn should continue, but requirement only approximate. Let's use:
`pitch(t) = 0 for t<10; if t<150: 0.5 * smoothstep(10,150,t); else 0.5` (constant). Actually pitch starts after 10. At 150 0.5. It never decreases. Good. But after burnout, pitch might stay 0.5, ballistic. Fine.

Physics integrate:
State x = horizontal displacement along x; y = altitude. z=0. Rocket on pad at origin (pad y=0). Initial x=0, y=? Rocket bottom y=0? Pad surface y=0. The rocket center? State altitude should be altitude of rocket on pad. If rocket body base at y=0, altitude 0. World points of rocket are base? Requirement trail world points of the rocket. Could use center? We need camera target at rocket center. Maybe define `y` as rocket base altitude? Physics alt. Rocket model has group positioned at y = alt (base at alt). The trail points use rocket base position (x, y, z) maybe. But to render trail behind rocket, maybe use base. Alternatively trail points of rocket center at y = alt + 35. The physics altitude is base altitude. Trail should be rocket location world points. The user expects trail follow. Could use base point. We can offset by center? Let's define `alt` = altitude of rocket base above pad. Rocket group at y=alt. Trail points at (x, alt, z) base; visually trail from base/nozzle, good. But trail should behind rocket. The contrail emerges from engine, so base is okay. Camera target should be rocket center = y+35. We'll compute.

Gravity g(h) with h = altitude. In equation, acceleration from thrust and gravity. Gravity acceleration vertical downward = -g(h). Horizontal gravity component = -g(h) * x / (R+h) maybe. But x horizontal relative origin; radial horizontal component. Since rocket might move hundreds km, this matters. We can integrate x. At high x ~ maybe 200 km, horizontal grav ~ -g*x/(R) ~ -0.3 m/s², small. Fine.

Acc net vertical: `a_y = T cos(pitch)/m - g(h)`. `a_x = T sin(pitch)/m - g(h)*x/(R+h)`? Actually centrifugal? Gravity component toward center includes horizontal. `a_x = T sin p /m - g(h) * x/(R+h)` maybe. Also there is no horizontal atmospheric drag? Could include none. z=0.

Need velocity and acceleration. State acc = net vertical acceleration m/s^2 (state().acc). It should include net vertical acceleration from thrust minus gravity. `speed` likely the playback speed, not velocity? User says "state().speed returns the current value" ambiguous: In physics section, `speed` in state maybe playback speed? They say "Playback speed (the flight lasts minutes...): speed is the time scale... state().speed returns the current value". So state().speed is time scale, not rocket speed. But state() also has `vel (m/s)` and `speed`. Wait `state(): { t, alt (m), vel (m/s), acc (net vertical acceleration, m/s^2), pitch (rad), speed }`. `vel` is velocity? `speed` maybe playback speed. Need include both. Yes `speed` = time scale. It also says "velocity" overlay. So `vel` likely speed magnitude? Define `vel` as velocity magnitude? Could include `vel` as m/s vertical? They say state has vel (m/s) and speed. Hmm maybe `vel` is velocity magnitude. We can define `vel` as total velocity magnitude. `speed` as playback time scale. We'll implement.
- `t`, `alt`, `vel` = sqrt(vx^2+vy^2), `acc` = net vertical acceleration, `pitch`, `speed`.

Need integrate with substep at most 0.02s. `step(dt)` if dt maybe negative? clamp? Any dt. Use `while rem>0: h=Math.min(rem,0.02); integrate; rem-=h`. If dt huge, many loops (e.g. 100s / 0.02=5000) fine. But render loop max 1/30*speed=1s for x30 => 50 substeps. Fine.
- Stop rocket cannot go below pad: if y<0 set y=0, vy=0? "cannot go below the pad." We can enforce y=max(y,0). At initial no downward because thrust. After coasting, it will fall below eventually. If it goes below pad, y=0, vy=0? Maybe simulation should stop at pad? The state after apogee falls. Requirement ascent to space, but physics could continue indefinitely and crash. Need perhaps not let below pad, clamp and maybe set velocity? We should clamp y>=0 and if y reaches 0 after falling, make y=0 and vy=0? That makes it sticky. But flight lasts minutes; we may want show ascent and maybe not fall. The camera and scene could keep. For realism, after burn ballistic it will eventually fall. But overlay mission data. The requirements don't mention stopping. "ascent to space". Could integrate and clamp; if it falls below pad, set y=0, velocity vertical 0, maybe horizontal continues? Hmm. We can allow fall back but can't go below pad. At apogee, then descent, could hit pad. That might be weird. But flight lasts minutes; at 200s plus coast 100s maybe. Camera travelling with rocket as it descends? Maybe not. The requirement says ascent to space; likely we should keep ascending by adding a second burn? But physics says burn 200s only. Falcon 9 first stage? "Falcon-9-like rocket ... ascent to space" perhaps first stage reaches 100 km then ballistic. We can use physics model. Could after burn, no thrust, natural deceleration; it may reach space but then fall. We might cap simulation at t maybe? No, step advances. We need render loop keep calling step. If rocket descends, camera follows, might be weird. Could prevent descent by stopping at apogee? Not specified. "the rocket cannot go below the pad." Thus falling back and landing is okay? But for launch photograph, maybe better not descend below. We could add a simple "coast" that maintains altitude? But violates physics. Hmm.

Need see actual altitude by simulation. Let's compute more accurately. We can perhaps write small mental or simulate with approximations. We'll integrate average acceleration. At t=0: m=550k, T/m=12.73, p=0, g=9.81, net=2.92; velocity after small t ~2.92*? Vertical acceleration at t=10 p=0 but mass=533.5 =>13.12-9.81=3.31. Vertical accel low. At t=100 mass=385k, T/m=18.18; pitch from smoothstep(10,150) maybe at 100: ratio (90/140)=0.643; smoothstep? Need define. If linear pitch = 0.5*(t-10)/140 at t=100 =>0.321. cos=0.949; vertical=17.25 - g at h maybe? h at 100 maybe ~? Need integrate. Vertical acceleration ~7.5. So velocity after 200 ~? Use average accelerations: 0-10 ~3; 10-100 ~5-8; 100-200 ~? 10-18. Velocity grows. Let's integrate roughly: from 0 to10 a ~3.1 -> v=31 m/s; altitude 155m.
10-100: a maybe 5.5 avg -> v increase 495, v=526; altitude increase avg v ~260 *90=23.4km. So h ~23.5km.
100-200: a at 150 p=0.5 cos0.878, m=302.5k T/m=23.2 ->20.4-g(h~? maybe 35km) g=9.7 ->10.7. At 200 a=18.5. Average a maybe 13.5. v increase 1350 -> v=1876. altitude increase avg v ~1200 *100=120km, h ~143km at t=200. Good. At burnout altitude ~143km, velocity ~1876 m/s. Then coast vertical decel ~g ~9.5, time to apogee = v/g ~197s, extra height v^2/(2g) ~180km, apogee ~323km. So reaches >100km. Good. Then fall. But we could render until maybe t=400. The camera follows and Earth view. At apogee, if render loop continues, rocket descends; maybe okay, but "ascent to space" not descent. Could limit simulation time to e.g. 300s? But step any dt and no mention. Could make rocket hold at apogee? Physics would not. Maybe not worry; camera at high alt still shows rocket, descent may happen after minutes. For testing, they might step. But visual likely enough.

Need camera and sky use altitude. At t=200 alt 143km. Stars.

Need sky shader: altitude uniform from rocket alt. But camera altitude? We use rocket altitude. Sky sphere center at origin; camera near rocket at altitude. Shader direction from camera; uniform alt. At high alt black. Good.

Need Earth sphere visible from high altitude. Build Earth sphere (radius R) with procedural shader/material. It should look like Earth: ocean blue, land green, clouds? Use a shader based on position relative center. Because local details? We can use a procedural material with noise. But the whole Earth huge; camera near rocket at 100 km sees Earth surface at distance. Need include atmosphere haze. Perhaps create a giant sphere with `MeshStandardMaterial` color? But from near rocket at 100km, Earth below is large. Could use shader for Earth to show land/ocean. Need "curve of Earth" and ocean. Maybe add Earth sphere with `MeshStandardMaterial` map? Procedural canvas texture 2048x1024 with Earth-like texture? Could generate canvas with ocean, land, clouds. But applying to sphere with UV. That's okay. Use procedural texture on sphere. However at low altitude, the sphere's surface at origin is tangent; local ground planes overlay. At high altitude, Earth visible. We can generate a globe texture with rough continents. Need no external assets.

Earth sphere:
- radius EARTH_R = 6.371e6 m. Center at (0, -EARTH_R, 0). Top at y=0.
- Use SphereGeometry(EARTH_R, 128, 64). Material with texture. But scale huge. Depth precision? Three.js can handle.
- Use MeshStandardMaterial with roughness 1, metalness 0, map. But from inside? Camera is above surface, outside sphere; sphere is below. Need normal. Sphere geometry. Camera is outside (above). Good.
- Texture: canvas 1024x512 with ocean blue and green land shapes, white clouds. Use random noise. We can draw. At local pad, Earth surface maybe under land plane. But okay.
- Could add atmosphere halo on Earth? Maybe a transparent sphere radius R+100000 with shader. But large; could be subtle. Maybe not needed.
- Need not render Earth sphere's top under pad? It might intersect local ground. Since local ground at y=0, earth sphere surface at y=0 only top point; local plane extends beyond. At low altitude camera near pad, Earth sphere under plane mostly hidden. At high altitude, Earth sphere visible. Good.
- At low camera, the Earth sphere horizon might appear behind ocean? The local ocean plane at y=0. The sphere extends beyond. Hmm the ocean plane can cover.

Local ground and ocean:
- Create ground plane 12000 x 12000 at y=0, with green/brown texture. Use procedural canvas. Place centered at (0,0,0) maybe extends to coast. But ocean behind pad: create ocean plane huge at y=-0.1? Use plane 200000 x 200000 at y=0 maybe blue. But ocean plane might overlap land. Put ocean plane centered at z=-11000? Need know orientation. Let's define pad at origin, camera initially at (60, 18, 80) looking toward pad/rocket. Ocean behind pad could be in -z (further from camera). Land ground plane covers z > -2000, ocean plane at z < -2000. But if camera at +z, ocean beyond pad behind it. We can create land plane size 4000 x 4000 centered at (0,0,0), ocean plane size 20km centered at z=-10000, extends to horizon. Could have coast edge at z=-1500. Add shoreline strip. Low camera sees ocean beyond pad. Fine.
- Need roads and low buildings around pad. Add roads as flat planes/boxes, low buildings. Maybe a road from pad to side, small hangars, a launch complex. Add distant buildings. Procedural textures.
- Vegetation: add many bushes/scrub as instanced low-poly spheres or cross planes? Use InstancedMesh of small cone/sphere? 200 bushes. At ground level. Need green scrub. Add randomized green bushes around land. Use InstancedMesh with a simple icosahedron? Could be okay. Or use a plane with procedural texture and many bushes. Need realistic. Add bushes with `MeshStandardMaterial` green, roughness. Use InstancedMesh (ConeGeometry? SphereGeometry). Use instanced meshes for vegetation. Need not too many. 200-300 bushes.

- Lightning-protection masts: tall lattice masts around pad. Build 4 masts with lattice beams, perhaps 80m tall. Use `makeLatticeTower(radius, height, ...)`.

- Launch tower: lattice tower next to rocket. Build on one side. Height ~60m, lattice beams. Need grey. Add horizontal arms.

Need flame trench: concrete pad with dark trench. Maybe a rectangular pit under rocket? Use BoxGeometry with darker material. The pad should have flame trench underneath. Could include a low rectangular trench at center perhaps. But rocket sits over trench; engine exhaust goes downward. Build pad as large square cylinder/Box, and dark trench hole? A mesh with a long rectangular dark strip. For realism, add concrete pad with raised outer edge, flame trench (dark channel) behind/under. We'll create pad box 100x2x100 at y=-1? top y=0. Add trench box 12x0.8x40 at center with dark concrete. Maybe rocket base at y=0.

Need flame: At liftoff, from nozzles downward, blinding core. Build:
- Flame group anchored at rocket nozzle bottom at y=alt. But plume extends below and grows. Use cone/cylinder along -y, maybe cone with additive material and shader. Need "blinding white-yellow core at nozzles fading to orange, Mach diamonds are welcome". Use `ConeGeometry(radius, length)` with material using custom shader gradient? Create a plume cone oriented down from nozzle. Since rocket moves up, plume under it. It should extend downward and maybe with trail. The flame is not static below; thrust. Use a `THREE.Mesh` with shader that has white core and orange transparency. Could use additive blending. Add central bright cone, outer orange cone, and mach diamond rings (small torus/cylinders with emissive additive). Need flicker.

Plume can be built as group at rocket base; animate scale based on t and air density. In simulation, t and altitude. During burn active. Length grows with altitude? "Ascent: plume grows longer and wider as air thins" - physically exhaust plume expands due to low pressure. We can set plume scale length = 10 + altitude/??, width = 1 + altitude/1000. But at 0, length ~? Real plume from rocket maybe 30m. At 100km, very long? In vacuum, plume broad and long. We can use additive shader with length scaled by `1 + alt/5000`? Need visually. But camera chase close, plume extends below rocket. At high altitude, plume may stretch behind. Use scale.
- Flame core: `ConeGeometry(1.4, 18, 32, 1, true)` etc. We need orientation. Cone's apex? ConeGeometry has apex at +y? For rocket, plume downward from engine. Could make cone with apex at nozzle and base below. Use cone geometry height L, rotate π so base down? Actually ConeGeometry apex at +height/2, base at -height/2. To point down, rotate π? Let's define group at nozzle center (rocket base + maybe 2m). Plume should extend downward, wide at bottom? Real exhaust plume is narrow at nozzle and widens downward? It can be. Use cone with apex up at nozzle and base down: ConeGeometry(baseRadius, length) has apex at y=+L/2, base at y=-L/2. Place center at y=-L/2 from nozzle? Hmm.
Could use `ConeGeometry(1.8, L, 32)` and set position y = -L/2 below nozzle, with apex at y=0? ConeGeometry apex at y=+L/2, base at -L/2. If group at nozzle y=alt, position plume y=alt - L/2, apex at alt, base at alt-L. Good. So cone opens downward. That's okay.

Need custom shader for plume:
```
uniform float uIntensity;
varying float vY;
```
Maybe simpler use MeshBasicMaterial with additive blending and vertex colors? Use two meshes: inner white cone and outer orange cone with opacity. Additive. Use MeshBasicMaterial({color:..., transparent:true, blending:AdditiveBlending, depthWrite:false, opacity}). But cone will look solid. We can use vertex alpha via shader. Create custom shader:
```
vertex varying vUv, vY = position.y / L
fragment float a = smoothstep(0,1,vY?)...
```
Need color core. Maybe use cone geometry with vertex colors? We can create a shader material with uniform time and fade. `vUv` y from 0..1? Cone UV. Use radial? Let's create a tapered plume with `ShaderMaterial`:
- vertex: pass `vPos` local.
- fragment: `float t = clamp(-vPos.y / len, 0, 1);` local cone with apex at +L/2; if position y from -L/2 (base) to +L/2 (apex). We want core near apex top, fading at base? Actually plume: intense near nozzle (apex at rocket), fade downward. Use `t = smoothstep(0.0,1.0, (position.y + L/2)/L)`? Position at apex y=L/2 -> t=1; base y=-L/2 ->0. Intensity near nozzle high. Color mix white at t>0.8 to orange t>0.2. Alpha = pow(t, ?). But base should fade transparent. Use `alpha = smoothstep(0.0,1.0,t) * intensity`. The plume would be bright near nozzle and fade downward. Good.
- However cone's interior side; additive. Fine.
- Add mach diamonds: 3 torus rings? Or small white cylinders at intervals along plume. Use rings with additive emissive at specific y. Animate flicker.
- Need "blinding white-yellow core at nozzles fading to orange". Add point light near nozzle with high intensity, color 0xffd080. Use point light maybe decay, intensity scaled. Flicker.

Need smoke sprites. Let's design:
- Shared canvas texture for smoke: 256x256, radial gradients (white to transparent) with noise? Use draw radial gradient and random small circles. Since canvas transparent. SpriteMaterial map, color white, transparent, opacity maybe 0.55, depthWrite false. Blend? Normal blending for smoke, not additive. It should look soft. Use `opacity` property per sprite? SpriteMaterial shared, but opacity per sprite cannot be set on same material? You can set `sprite.material.opacity`, but shared material changes all. Better use per-sprite material? That's heavy. Could use a `ShaderMaterial` with per-vertex attributes via Points instead of Sprites. But requirement "many soft particles or sprites" - sprites okay. To have varying opacity, make a small number of materials with different opacity? Or use scale and color. Shared material opacity constant 0.3. We can create 300 sprites all with same material; individual color can't vary unless material shared. Could create 6 materials with different opacity and assign. Or use Points with custom shader and attributes for size/opacity, rendering soft circles. That's more efficient and flexible. But "sprites" okay. Using Points with a shader and per-vertex attributes could look soft. Let's use a custom Points shader for smoke:
   - Create BufferGeometry positions, attributes `aSize`, `aAlpha`, maybe `aSeed`.
   - Shader: gl_PointSize = size * (something); texture from procedural? In WebGL shaders, need soft round particle with noise. Fragment can use gl_PointCoord radial smoothstep plus noise. Use uniforms `uTime`, `uAlt?` for animation? But positions computed on CPU each frame. We can update positions array for 600 particles. That's fine. Use `THREE.Points` with ShaderMaterial. But points are screen-facing squares; soft with circular alpha. We can use procedural noise in fragment (no texture). Good. This avoids canvas texture. Requirement procedural textures; fine.
   - Need smoke clouds moving. Generate N=500 particles each with initial position around pad/flame trench, random angle/distance/radius, and height initially 0. Each has phase/seed. In update, compute based on flight time `t`: t0? If t < 0? We only advance positive. We want smoke appear during liftoff and persist. Use `launchTime = t`. At t=0 no smoke; after t > 0, clouds expand. Use `age = max(t - 0.5, 0)` maybe. But if playback speed x30, sim time advances quickly, smoke expands by simulation time. Good. But if paused, frozen. Fine.
   - Cloud motion: positions based on `age` and seed: spread radially along ground: `r = 8 + 14*age + random` etc. Height: `y = 2 + 0.5*age + ...` and rise. At t=10, smoke cloud around pad. At t=100, it should maybe still be huge; at high altitude, pad far below, smoke not visible? Camera near rocket at high altitude; smoke at pad tiny. Fine. The smoke visible during liftoff.
   - Need not too many; 600 points at 256 size? Points size in world units? Use ShaderMaterial with gl_PointSize based on projected size and size attribute. In Three.js Points, gl_PointSize in pixels. We can set size in screen pixels scaled by distance? Shader can compute: `gl_PointSize = aSize * (300.0 / -mvPosition.z);` if size world units. Actually aSize in meters, attenuation. We need large clouds visible. Use `gl_PointSize = aSize * (600.0 / max(-position.z, 1.0))`? In perspective, world size to pixels. Simpler use `THREE.Points` with `sizeAttenuation`? Custom shader. 
   - For smoke, use additive? Normal blending. Use `transparent: true, depthWrite: false, blending: Additive?` Smoke white, additive can glow. But smoke should not be too bright. Use normal blending with opacity. In shader, alpha = radial * aAlpha. Need depthWrite false. Colors maybe gray-white. Additive could look volumetric but overlit; use normal (THREE.NormalBlending) perhaps less bright. Smoke against sky can be white. We can set color white with alpha.
   - Need size attenuation. Use `gl_PointSize = aSize * (500.0 / -mvPosition.z)` maybe. At 100m distance, size 100m -> 500 pixels? Too big. Let's determine. aSize around 8m. distance 100m -> gl_PointSize=8*500/100=40 px. okay. At camera near pad, at 100m distance, 40px. Need large clouds up to 50m maybe 250px. Fine.
   - Fog? For smoke maybe no fog? Use fog in shader? not needed.
   - Also create sprites for ground steam? Points okay.

Need contrail trail and plume. Since trail points are world points, use line. But at high altitude, camera is near rocket, trail line behind down to pad; line may be huge. It can be drawn with transparent white, fading. Need "one per step() call". The line will update. Use `Line` and update geometry. Since trail may be long (100s *0.33 = 300 points). Good. But at x30 speed step .33 sim? Actually render loop delta ~0.016, speed 30 => step 0.48s. Points ~200. Fine. At speed 1 step ~0.016, points thousands over 200s -> up to 12,500 points. Buffer okay. Need dynamic geometry with set capacity? We can create geometry with fixed max 10000? But step may accumulate many. Need update buffer. Use a `Float32Array` dynamic? Could create line geometry each frame from trail points: new BufferGeometry with `setFromPoints(trail)` each frame; but recreating thousands each frame is okay but could be expensive. Better maintain a BufferGeometry with capacity max maybe 100000 and update. Simpler use `THREE.Line` and update positions. The trail array can grow indefinitely. But reset empties. For performance, we can rebuild every frame using `setFromPoints` on existing geometry? `BufferGeometry.setFromPoints`? There is `geometry.setFromPoints(points)` method? Actually BufferGeometry has `setFromPoints`? I think `BufferGeometry.setFromPoints` not a method? In Three.js, `Float32BufferAttribute`? There is `BufferGeometry.setFromPoints`? Hmm. Safer: use `THREE.BufferGeometry().setFromPoints(array)` but need dispose old. Recreate each frame. Acceptable? 10k points each frame, allocate. Could be fine. But strict TS. We can do:
```
const trailGeom = new THREE.BufferGeometry();
const trailPositions = new Float32Array(MAX_TRAIL*3);
trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
trailGeom.setDrawRange(0, count);
```
Need max capacity. Since steps can be many, we can choose MAX_TRAIL=20000. But if speed 1 and animation runs 200s, points ~12000. If long, could exceed. We can cap by creating capacity maybe 60000. Use dynamic if needed. Simpler: each frame if trail length > max, set draw range to last max? But requirement trail array full. We can keep array full, but line render last max? Need no drop? Could use line geometry from array each frame with dynamic buffer length. Alternative use `THREE.Line` with `geometry.setFromPoints(trail)` each frame. Let's verify method. In Three.js BufferGeometry, `setFromPoints(points)` exists? I recall `BufferGeometry.setFromPoints` is a method in three.module? Actually `BufferGeometry` has `setFromPoints(points: Vector3[])`? Let me recall: `new THREE.BufferGeometry().setFromPoints(points)` is common. Yes, `BufferGeometry` has `setFromPoints`. So we can create a new BufferGeometry each frame:
```
const geom = new THREE.BufferGeometry().setFromPoints(trail);
trailLine.geometry.dispose();
trailLine.geometry = geom;
```
But trailLine material. However if array length less than 2, line no. Fine. It allocates each frame. But maybe okay. Need strict types.

Need postprocessing `EffectComposer` with bloom. Renderer. We need `renderer.setAnimationLoop(animate)`. In animate, use clock delta. `const dt = Math.min(clock.getDelta(), 1/30);` but `getDelta` returns since last call. Need `elapsed = clock.elapsedTime`. Use `clock.getElapsedTime()`? If use getDelta and add. Better:
```
const clock = new THREE.Clock();
let elapsed = 0;
function animate() {
 const delta = Math.min(clock.getDelta(), 1/30);
 elapsed += delta;
 if (!rocket.paused) rocket.step(delta * rocket.state().speed?);
``` 
Careful: speed is computed based on state t. If we call `rocket.step(delta * rocket.speed())` and state speed default depends on current t. We can implement `rocket.playbackSpeed()` or `state().speed`. But state returns speed. For step, we need use current speed before step. If t<10 default 1; after t>=10 default 10. We can call `const sp = rocket.state().speed; rocket.step(delta * sp);`. If no viewer and t 9.5, speed 1, step 0.016; t becomes 9.52. At t crosses 10, next frame speed 10. Fine.
- But "Playback speed ... It is 1 for liftoff (t < 10 s) and then 10, unless viewer chose speed." Good.
- The speed should be in state; `step` doesn't apply playback. So render loop uses state.speed.

Need update visual based on rocket state. Rocket group position at (x, alt, z). Camera target maybe rocket center. Trail points from rocket base. If rocket moves horizontally, state x. Need model.

Camera:
Initial camera position maybe (80, 25, 120) looking at rocket center at y=35. Need low. At liftoff, rocket y=0, target center (0,35,0), camera pos (80, 20, 100) looks up at it. At t=0. Maybe camera should start near pad and see tower. Good.

Transition to chase once rocket clears tower. Tower height maybe 65m. When alt > 75m? Rocket base altitude > tower height maybe. At t~? Alt reaches 75m in maybe 5s? Initial accel 2.9 => after 5s velocity 15, altitude 40m. 10s alt 155m. clears. So transition at t=10 maybe. "once rocket clears the tower the viewer travels with it". Use a transition factor based on alt: smoothstep(60, 160, alt). At alt 60 start, 160 fully chase. Since t=10 alt ~150. Good. At t=0 low camera. Good.

Chase offset relative rocket center: want within 100m. Let center pos = (x, alt+35, 0). Camera pos = center + offset. Offset maybe (35, 12, 85) length ~98m. It is close. Looking at center. The camera is slightly above and to side. It will see rocket and sky. Earth below? Camera looks at center; background behind rocket is sky. Earth below lower frame if camera below? If camera above center by 12m, looking slightly down at center? Actually camera offset y=12 above center, looking at center. It is above; background behind rocket is sky (upper). Earth below may appear below rocket? If looking at center, the rocket occupies center; ground below might be behind in lower part? The direction from camera to center is slightly downward; lower part of frame could show Earth if center is above horizon. At high altitude, center altitude 100km, camera y=100km+12, looking down at rocket, horizon line maybe Earth below. Good.

But at liftoff low camera, use fixed pos and target. Smooth transition. We can interpolate positions:
```
const groundCamPos = new Vector3(80, 24, 110);
const chasePos = new Vector3(center.x+40, center.y+10, 80);
const transition = smoothstep(50, 150, alt); // after clears tower
camera.position.lerpVectors(groundCamPos, chasePos, transition);
```
But at altitude high, camera position relative to rocket. Need lookAt target:
```
const target = new Vector3(center.x, center.y, 0);
camera.lookAt(target);
```
At liftoff, target center at (0,35,0). Ground camera fixed. Smooth. But if rocket moves horizontally (x grows), ground camera fixed looking at rocket; okay until transition. Need camera smooth: maybe lerp with damping based on transition. Fine.
- However camera at ground fixed and rocket moves up; looking at rocket; at t=10 alt 150, transition factor high. Good.
- At high altitude, camera close to rocket; if rocket is moving at 2000 m/s, visual motion? Since camera follows with same position offset, relative stationary. Need update every frame. Fine.

Need perhaps camera should not pass through ground? Initial camera y=24, okay.

Need sun: directional light at e.g. (200, 300, 150) intensity 2.5, color warm. Shadow. Ambient Hemi light? Use HemisphereLight sky color. Since PBR and tone mapping. Need set renderer.toneMappingExposure maybe 1.1. Need bloom. The sky shader not affected.

Need materials:
- Concrete texture: generate canvas 512x512 with gray; add noise. Use `CanvasTexture`, repeat maybe.
- Ground texture: green scrub. Draw random green/brown pixels and patches. Use map on plane with repeat. 
- Ocean: MeshStandardMaterial with color 0x1f6f8d, roughness 0.25, metalness 0.0, maybe texture? Could create simple blue with some wave pattern canvas. Need physically based. We can use a procedural texture with blue variations and white highlights. Or use `MeshPhysicalMaterial`. 
- Earth texture: generate canvas globe with continents, ocean, clouds. Use map on sphere. At high altitude, Earth sphere with texture. Need maybe clouds. Use procedural canvas 2048x1024.
- Building materials: concrete/white, windows dark. 
- Roads: dark gray.
- Tower: gray metallic lattice.

Need rocket canvas texture:
Create `makeRocketTexture()` canvas 1024x512. Background white (or transparent?) Use white body. Draw dark band across around middle? Maybe horizontal stripe at y=100? Since cylinder UV wraps, horizontal bands correspond to height? For CylinderGeometry, UV mapping: u around circumference, v along height. So drawing horizontal band across canvas at v=0.75 maps near top? We'll use body material map. Draw a dark band near upper section as interstage? But body separate sections. Maybe texture used for main body only. Draw flag on u around somewhere, lettering "SPACEX" or "FALCON 9". Need no fonts from network; canvas default sans-serif.

We can create texture with white background, some gray panel lines, a black band at v=0.1 (bottom?) and flag/lettering. But if we use texture on cylinder, entire circumference. Good. Use `ctx.fillStyle='#fff'`, then draw dark band rect across y? A horizontal stripe across all u. Add flag at x=200,y=300, size. Draw blue rectangle, stripes. Draw text "FALCON 9" in black at x=600. Need canvas 1024x512. For cylinder UV, v=0 bottom or top? Three.js cylinder UV v maybe 0 at bottom? Doesn't matter. The band appears.
- Use `MeshStandardMaterial({map: rocketTexture, color:0xffffff, roughness:0.55, metalness:0.1})`. Actually map includes colors. Good.
- Separate interstage dark band maybe use `MeshStandardMaterial` black. Could be more explicit.

Need nose fairing: ConeGeometry radius 1.85, height 8, maybe white with fairing seam dark. Place top. Use Cylinder for main, cone at top. Maybe fairing is a truncated cone? Use `CylinderGeometry(1.85, 0.4, 8, 32)`? Actually nose fairing tapering from body radius to small tip. Use `CylinderGeometry(1.85, 0.55, 8, 32)` with top radius 0.55, bottom 1.85. But cylinder axis y, top radius at +y. Good. Place from y=62 to70. Add a small cone cone geometry height 2 at top. Rocket total 70. Good.
- Interstage: dark band between first and second stage. Use `CylinderGeometry(1.86,1.86,2,32)` etc.
- Engine section: dark gray cylinder 3.7m diameter, height 8, at bottom. Nozzles below. Add 9 nozzles: cylinders/cones around bottom.
- Rocket body base at y=0. Engine section from y=0 to 8. Main body from y=8 to 55. Interstage y=55-57. Second stage y=57-63. Fairing y=63-70. Need 70. Let's define:
   - nozzle section: y=0..4 maybe? Actually engine section black cylinder from y=2 to8? Nozzles extend from y=0 to2. Body bottom at y=2? If rocket base at pad y=0, nozzles touch pad? Real rocket sits on pad with engines slightly above. We can set nozzle bottoms at y=0.5. Rocket base at pad y=0.
   - engine section dark cylinder height 6, center y=5 (from y=2 to8).
   - main body white from y=8 to 55 (height 47).
   - interstage dark band from y=55 to56.5.
   - second stage white from 56.5 to62.5.
   - fairing from 62.5 to70 (height 7.5).
   - nozzles at y=1.8? maybe bottom. Good.
- Add vertical seam lines? Could use texture.

Need "visible interstage and a darker band" - yes.

Need launch tower: Place beside rocket at x maybe -8? It should be next to rocket, not overlap. Tower at x=-6, z=0, height 60. Build lattice tower of width maybe 4m. Use beams:
- vertical pillars at corners of square base (x offset ±1.5, z ±1.5), height 60.
- horizontal crossbars at levels.
- diagonal braces alternating.
Could create function `makeLatticeTower(x, z, height, width, material)`. Use cylinders (thin) with `CylinderGeometry(0.08,0.08,height)`. For diagonals, use cylinder between points: create `CylinderGeometry(0.06,0.06,length)` oriented along vector. Helper `addBeam(p1,p2,r,material)`.

Need four lightning masts around pad height maybe 80m, lattice. Could reuse. Place at corners of pad maybe radius 35. Use towers with 4 legs. Also add a tall lightning mast with guy wires? Overkill. We can place 4 around. Need "tall lattice lightning-protection masts around pad". Build 4 masts height 80 at positions (±35, 0, ±35) etc. Lattice style. Add thin vertical and crossbars. Fine.
- The launch tower next to rocket: at x=-6? If camera from +z, tower on left. Good.
- Umbilical arms: add horizontal beams from tower to rocket at heights 25, 40. Use cylinders.

Need pad details: flame trench. Use dark rectangular channel along z, at center under rocket. A trench of width 8, depth 0.8, length 40. But rocket sits over center. Add black/dark. Add concrete pad edges.

Need roads and buildings around pad: Add a few low buildings with boxes and roofs. Maybe a road (dark strip) extending left. Add some hangars at distance. Use `BoxGeometry`, `MeshStandardMaterial`. Add windows? Maybe small dark boxes. Add trees/bushes.

Need environmental haze/aerial perspective: Use fog in scene. `scene.fog = new THREE.FogExp2(0xa9c7db, 0.000035);` But at high altitude, fog would make sky weird? Fog applies to objects and Earth sphere; if camera at 100km, Earth sphere distance ~100km, fog density maybe 0.000035 -> exponential transmittance exp(-d^2 * density?) FogExp2 uses density * distance^2? Actually FogExp2 factor = 1 - exp(-density * dist²). With density 3.5e-5 and distance 100km =100000 -> density*1e10=350000 -> fully fog. That would make Earth pale/haze, perhaps okay. But stars and sky fog? Sky dome? Fog affects all? Sky shader no. At high altitude, Earth might be fogged white, which could be unrealistic but atmospheric haze. Need maybe lower density. For distance 10000 => factor 1-exp(-3.5e-5*1e8=3500) full. For 1000 => 1-exp(-0.035)=0.034. So fog dense far. We want aerial perspective. Maybe set fog density 0.00002 and fog color pale blue. At high altitude, Earth distance 100km will be pale blue/white; okay. But rocket at distance 100m no fog. At high altitude, Earth visible with haze. Good.
- But fog affects plume and trail? Trail at high altitude distance from camera maybe 100km -> completely fogged white; contrail white anyway. Fine.
- Need `scene.fog = new THREE.Fog(0xa8c9df, 1000, 80000)`? Linear fog. At 100km (100,000) fully fog; Earth hazy. At launch, distant ocean haze. Use linear Fog. But at high altitude, Earth may be fully pale; still can see. Maybe `FogExp2(0xb6d6e8, 0.00001)` -> dist 100km: 1-exp(-0.00001*1e10=100)=1 -> full. Too much. Use `Fog(0xb6d6e8, 1000, 120000)` -> at 100km full. Hmm.
Aerial perspective should make distant things paler and bluer. At sea level, horizon hazy. At high altitude, Earth should be blue with atmosphere haze, but not fully white. Could avoid fog for Earth sphere, and use fog only for local scenery. But scene fog affects all. Could use custom transparent haze overlay? Let's not use scene fog globally? But requirement mentions aerial perspective (distant things paler and bluer). We can use fog with moderate density and far range. At high altitude, the Earth is 6.371e6 m deep? Camera at 100km above surface, Earth surface points at distance up to 100km; fog could blend. Use `Fog(0xb9d6e8, 2000, 200000)` linear. At 100km, factor 0.5, pale. At 200km, full. Good. At launch, distance to ocean horizon ~20km factor 0.1. Good. Use linear fog. But sky shader no fog. Fine. For Earth sphere, may look pale; acceptable.

Need renderer setup:
```
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
```
Need style? document.body.margin? Could set `document.body.style.margin='0'; document.body.style.overflow='hidden';` and canvas display. The page has no HTML; okay.

Overlay: Create div at top-left with background semi dark, white text; maybe two lines. Need update in animation:
```
const overlay = document.createElement('div');
overlay.style.position='fixed'; ...
document.body.appendChild(overlay);
```
Need buttons: three buttons. Create container with buttons x1, x10, x30. Use `document.createElement('button')`. Add labels. Keys 1,2,3 set x1,x10,x30. We need listen `window.addEventListener('keydown', ...)`. Buttons event listeners. The "viewer chose speed: keys 1,2,3 (and three buttons) set x1, x10, x30." So pressing 1 sets viewerSpeed=1, pressing 2 sets=10, pressing 3 sets=30. Buttons set corresponding. Need reset clears viewer choice. Implement in Rocket? The viewer speed is global? We can define global `viewerSpeedChoice: number | null = null`. Rocket object can reference it? Better define `let viewerSpeed: number | null = null;` and `rocket.state.speed` computed:
```
function playbackSpeed() {
 const chosen = viewerSpeed;
 return chosen != null ? chosen : (this.t < 10 ? 1 : 10);
}
```
But reset() clears viewer choice. The Rocket object's reset should set `viewerSpeed = null`. Since viewerSpeed is global, reset can mutate it. Need in `window.__rocket`.
- Note: If viewer chooses speed 1, speed always 1, even during t<10? That's okay. If chooses x30, always 30. But phrase "unless viewer chose a speed" means override. Good.
- `reset()` should clear viewer's choice, yes. It resets t etc. But if global viewerSpeed is set by UI, reset clears. Fine.
- Overlay displays `T+`, altitude km, velocity, speed. Use state. Need update every frame. `const s = rocket.state(); overlay.textContent = ...`. Use if paused maybe.
- Use `s.speed` to display.
- Need `__ready` after first frame rendered. Set in animate after composer.render? First frame. Use flag:
```
let ready = false;
function animate() {
  ...
  composer.render();
  if (!ready) { (window as any).__ready = true; ready = true; }
}
```
Need make first frame. `renderer.setAnimationLoop(animate)`.

Need expose `__scene`, `__camera`, `__renderer`, `__rocket`. At end.
Need TypeScript strict. Use `(window as any)` etc. Need ensure no implicit any.
Need no errors with optional addon imports. Type definitions? `three/addons/...` works? In TS strict with Three types. `UnrealBloomPass` class. Need import `EffectComposer` and `UnrealBloomPass` maybe `RenderPass`. In addons, `RenderPass` exported. Use:
```
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```
Need type annotations for new composer etc. Use `new EffectComposer(renderer)`. Fine.
Need maybe `THREE.SRGBColorSpace` exists. Use current.

Need compile with tsc strict zero errors. Need careful with types, no `any` implicit. Can use `any` explicitly as casting. Need no unused variables? tsc strict doesn't error unused unless noUnusedLocals? Strict doesn't include noUnusedLocals; only strict flags. But if user uses `--strict` no noUnusedLocals. Fine.

Need use `THREE.CanvasTexture`. Need create textures. Need set `texture.colorSpace = THREE.SRGBColorSpace`? For maps perhaps. Use.

Need procedural canvas creation. Let's plan functions.

Helper pseudo-random deterministic:
```
function rand(seed: number): number {
  // simple hash
}
```
But for geometry random positions, use `Math.random()` okay. No need deterministic. For textures, Math.random. Fine.

Materials:
- `concreteMat` with map generated. Since canvas texture, use `new THREE.MeshStandardMaterial({map: concreteTex, roughness:0.9, metalness:0.0})`.
- Ground texture: make 512x512 with green/brown. Use `repeat` maybe 20. But plane sizes; set texture.repeat.set(8,8) maybe with wrap Repeat. Need set `texture.wrapS = THREE.RepeatWrapping;`. For ground plane 8000x8000, repeat 20 maybe. 
- Ocean texture: simple. Maybe not needed; material color.
- Earth texture: create canvas 2048x1024. Need draw continents. Use `ctx.fillStyle='#2c6e91'` ocean; draw random blobs greens/brown; clouds. Or use procedural noise. Need plausible. Draw several continent shapes with random polygon blobs. With canvas and random circles. Add atmosphere? Use material map and roughness. Since from high altitude, maybe nice.
- Sky shader: need uniforms update. Use `MeshBasicMaterial`? ShaderMaterial with side BackSide, depthWrite false. `uniform alt` and `cameraPos` maybe. Need update `uAlt.value = rocketAlt`. Since cameraPos changes, use uniform `uCamPos`; or use `viewPosition`? Let's consider sky sphere centered at origin radius 1e9. Vertex position is huge; compute direction from camera using uniform. We can update uCamPos each frame. Shader:
```
uniform vec3 uCamPos;
uniform float uAlt;
uniform vec3 uHorizonColor;
uniform vec3 uZenithColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
varying vec3 vWorldPos;

void main() {
  vec3 dir = normalize(vWorldPos - uCamPos);
  float h = dir.y;
  float horizon = smoothstep(-0.05, 0.25, h);
  float zenith = smoothstep(0.0, 0.65, h);
  vec3 col = mix(uHorizonColor, uZenithColor, zenith);
  // haze near horizon
  col = mix(col, uHazeColor, (1.0 - smoothstep(0.0,0.35,h)) * 0.8)
  // sun glow
  float sun = max(dot(dir, normalize(uSunDir)),0.0);
  col += uSunColor * pow(sun, 8.0) * 0.6;
  // altitude fade to black
  float altFactor = smoothstep(0.0, 100000.0, uAlt);
  col = mix(col, vec3(0.0), altFactor);
  // also sky at high altitude black
  gl_FragColor = vec4(col,1.0);
}
```
But at high altitude, all sky black; need stars. Stars separately. At 100km, stars visible; at exactly 100km, sky black. At 70km, stars begin. Good.
However at high altitude, the sun could still be visible? We mix sun to black too. Real space sun visible, but requirement black at 100 km. They say sky from blue to black; stars visible. We could leave a sun glow in space? Maybe but sky black. Fine.
- At high altitude, horizon color shouldn't be blue; all black. But Earth below still visible. Good.
- Need sky sphere radius large enough; `SphereGeometry(1.5e8? maybe 1e9)` maybe. But camera near rocket at altitude up to 300km, inside. Radius 1e8, okay. But stars at radius 1e7? If sky sphere at radius 3e8, stars could be closer or farther. Need stars not behind sky sphere if sphere depth? Sky shader depthWrite false and likely render order. We can set sky mesh `renderOrder = -100`? It should be background. Use `scene.add(sky)`. Because sky sphere is huge and back side, camera inside. It will render; depthWrite false means draw after? Actually if depthWrite false and transparent? Set `material.depthWrite = false`, `side: BackSide`. Render order maybe 0. It will be behind all objects due depth? With depthWrite false, objects will draw over. Need sky drawn first. Use `sky.renderOrder = -1000` and material depthWrite false. Fine.
- Stars: Points at radius maybe 1e7 around origin? If sky sphere radius 1e9, stars inside? Points at 1e7 from origin, camera at altitude 100km, distance ~10 million, visible. If sky sphere at radius 1e8, stars in front of sky? Sky has depthWrite false. Fine. Need stars not hidden by Earth. Earth sphere radius 6.37e6. Stars at radius 1e7; some below horizon behind Earth. If camera at 100km above Earth, stars behind Earth? Points at origin sphere, many behind Earth; depth with Earth sphere depthWrite true will occlude if behind. Good.

Star material: Custom shader:
```
uniform float uAlt;
uniform float uTime? 
attribute float aSize;
attribute float aPhase;
varying float vAlpha;
void main() {
  vAlpha = smoothstep(70.0, 100.0, uAlt) * (0.4+0.6*fract(aPhase...))? 
  ...
}
```
Need points fixed positions and sizes. Use `THREE.Points` with BufferGeometry positions and sizes? Could use `PointsMaterial` with transparent and opacity uniform. `PointsMaterial({color:0xffffff, size:1.2, sizeAttenuation:false, transparent:true, opacity:0.0, depthWrite:false})`. Update material.opacity = smoothstep(70,100,alt). But size in pixels? With sizeAttenuation false, size in pixels? Actually `size` world units if attenuation true? For PointsMaterial, size is in world units? In Three, size is in pixels? I think for PointsMaterial size is in pixels? Actually `size` attribute in PointsMaterial is a world unit if sizeAttenuation true; if false, pixel size? Let's recall: `PointsMaterial` size is in world units? It uses `gl_PointSize = size * (1.0 / -mvPosition.z)` if size attenuation; if false, no attenuation. The docs: `size` in world units? Hmm. Simpler use custom shader to control. But PointsMaterial should be fine. Need stars clearly visible. Set size=2.5, sizeAttenuation=false, opacity computed. But at high altitude, stars at distance millions, size fixed pixels, good. At ground, opacity 0. Use `transparent`, `depthWrite:false`. The stars might render through sky because sky depthWrite false; okay. But stars below Earth may be occluded by Earth if depthWrite true. Good. Need make star field on sphere of radius 1e7 centered at origin, random points. `PointsMaterial` with `size=1.5`, sizeAttenuation false? But if sizeAttenuation=false, gl_PointSize is constant in pixels; good. Need stars visible. Use `opacity` updated. Use `material.opacity = THREE.MathUtils.smoothstep(alt, 70_000, 100_000) * 0.9;` But `THREE.MathUtils.smoothstep` signature? `THREE.MathUtils.smoothstep(x, min, max)` returns 0..1. Yes.
- Also maybe add a subtle Milky Way? not required.
- Star positions random on sphere radius 5e7? At high altitude, distance ~50 million; okay. Use `Float32Array` with 3000 stars. Need avoid stars behind Earth? Earth sphere radius 6e6, camera above; some points at negative y (below origin) behind Earth, occluded by Earth. Fine.

Need Earth sphere and local ground. Earth sphere might occlude stars? Good.

Potential issue: At high altitude, camera near rocket at y maybe 100km, Earth sphere below. The sky sphere radius 1e8, camera inside. The star points radius maybe 5e7. Some stars behind Earth but okay. At launch camera low, stars opacity 0, not visible.

Need sky color at horizon ground. At high altitude, we set sky black. But horizon still maybe black; Earth provides. Good.

Need camera near rocket at 100km; pad and ground below. The sky background black. Sun light still illuminates rocket; physically in space, sun. Need sun intensity maybe 3.0. At high altitude, no atmospheric haze, but we can increase sun. Directional light already.

Need plume as a mesh under rocket. At high altitude, air thins -> plume grows longer and wider. If burn active. At t>200 no thrust; but requirement ascent: plume grows longer/wider. If at t=200 alt ~140km, burn ends. Stars visible. The plume disappears exactly at burn; but "plume grows longer and wider as air thins" may be seen near 140km. We can fade after burn over e.g. 5s. But physics says zero after burn; visual can fade. Need perhaps show second stage? Not necessary. Maybe allow flame during burn only. At high altitude after burnout, trail remains. Fine.

Need maybe set the rocket at liftoff: `rocketGroup.position.set(x, alt, 0)`. Physics `alt` base. The engine plume group at `rocketGroup.position`? If rocketGroup includes nozzle at y=0? We can add plume to rocket group at y=0.2. The flame extends downward below base. But if rocket base at alt=0 at pad, plume would extend below pad (negative y), which is correct flame trench. Use `flameGroup` parent to rocketGroup? If parent rocketGroup at y=alt; flame mesh local y negative. Good. It can extend below pad. At liftoff, rocket at pad, flame below pad into trench, okay. But if rocket at altitude, flame below. Need not go below pad if alt small? Flame can extend into pad. Fine.
- But rocketGroup position y=alt; if alt=0, engine section at y=0. Flame local y negative, below pad. That's okay; pad at y=0, flame in trench (trench at y=0 but visual below). Could be visible. Need it appears from nozzles and goes down. Good.

Need "camera low near pad looking up at liftoff" initial camera pos maybe (55, 22, 100), looking at target center (0,35,0). It sees rocket and tower. The flame below pad visible. Good.

Need "once the rocket clears the tower viewer travels with it" transition. The camera should maybe rise with rocket. If transition factor based on alt, at alt 150 it is chase; camera y = center.y+12 = alt+47. Good. At alt 150, camera y ~197, far above pad. Looks at rocket center. Fine.

Need smooth camera motion: Use `camera.position.lerp` maybe. But since rocket moves, if we set directly to target+offset, it's smooth with simulated motion; no abrupt except transition. Use transition interpolation.

Potential test: They may inspect `window.__rocket` and call reset/step. Need physics robust. Need trail exactly one per step. Need paused property. When paused, render loop does not call step. Our animate checks `if (!rocket.paused)`. Good.
Need reset clears viewer's speed choice. But if UI button changes viewerSpeed, then reset sets it null. Good.

Need state() object returns new each call? It can return `{...}`. Need speed computed. The trail array property same object. `trail` array stays same object even after reset. In reset do `this.trail.length = 0` (same array). Good.
Need step any dt. Use substeps. If `dt=0`, no steps? Add trail point per step() call. It says trail one per step() call, even if dt=0? A step call advances by dt; if 0, maybe still adds current point. We can add after integration. Good. If paused? step called manually. Fine.

Physics step details:
```
interface RocketState { t:number; alt:number; vel:number; acc:number; pitch:number; speed:number; }
class RocketSim {
  trail: {x:number,y:number,z:number}[] = [];
  paused = false;
  x=0; y=0; vx=0; vy=0; t=0;
  speed(): number...
  reset(): void { t=0; x=0; y=0; vx=0; vy=0; trail.length=0; paused? maybe leave paused? reset should set paused false? "reset(): time 0, the rocket on the pad, trail emptied (keep same array object)" likely paused maybe unchanged? Should reset paused to false? Probably yes, reset resets sim; paused maybe remain? Not specified. Could set paused=false to resume. We'll set paused=false. Also viewerSpeed=null. }
  step(dt) { if (!Number.isFinite(dt) || dt<0) dt=0? any dt; maybe clamp negative to 0. }
```
Need "rocket cannot go below pad". In integration, if y < 0 after update, set y=0 and vy=0? At liftoff none. But after apogee, if it descends and reaches pad, clamp. This could cause velocity vertical 0 at pad. Horizontal may continue. But if on pad at y=0 and no thrust, okay. Should alt clamp. Then if further steps, y remains 0 but vx? Not important. Could also if y <= 0 set vy=0. The accelerations computed from gravity and thrust; if thrust 0, gravity will push downward; clamping each substep. But if y=0 and thrust 0, gravity acceleration down, but clamp. Fine.
Need `acc` net vertical acceleration computed at state after integration? Could compute at current time and altitude before integrate, or after. We can compute as instantaneous vertical acceleration at final state using m, t, pitch, g(h). Store `acc`. `vel` = sqrt(vx²+vy²). `pitch` = pitch(t). `speed` computed. Good.

Need use substep at most 0.02s. We'll integrate loop:
```
let remaining = Math.max(0, dt);
while (remaining > 0) {
  const sub = Math.min(remaining, 0.02);
  const tMid = this.t + sub * 0.5? maybe use current state? 
  const mass = massAt(this.t); // mass linearly falls during burn, at current t
  const thrust = boost...
  const pitch = pitchAt(this.t);
  const h = this.y;
  const g = ...
  const ay = thrust*Math.cos(pitch)/mass - g;
  const ax = thrust*Math.sin(pitch)/mass - g*this.x/(EARTH_R + h);
  // update velocity and position using acceleration at current state
  this.vy += ay*sub;
  this.vx += ax*sub;
  this.y += this.vy*sub;
  this.x += this.vx*sub;
  if (this.y < 0) { this.y=0; this.vy=0; } // maybe
  this.t += sub;
  remaining -= sub;
}
```
Need careful: using acceleration at start of substep. Fine. But at t crossing burn, mass changes linearly. Thrust zero after burn. In substep if t<200 but t+sub >200, using current t mass and thrust for whole sub; error small (sub <=0.02). Fine.
But mass at t=0: m0. At t=200: m_dry. At t>200 mass dry.
Pitch at t. If pitch defined using t, okay.
Need `acc` net vertical acceleration at current final state: compute from mass/t. Could store.

Need trail world points: after step, `trail.push({ x: this.x, y: this.y, z: 0 })`. The rocket base. But if `alt` is base, okay.
Need when reset, clear. Also maybe add initial point? The requirement trail emptied; no initial point. Good.

Need physics "mass falls linearly from m0 to dry mass during burn." But if burn occurs at t=200, dry mass. Good.
Need "thrust limited to 3*m*g0 (throttle)" - T_nom < limit, but if m small at t=200, T_nom =7e6, 3*220k*9.81=6.47e6. Ah! At t=200, limit is 6.47e6 < T_nom. So throttle applies near end. We must implement min(T_nom, 3*m*g0). This reduces thrust slightly near end. At t=200 mass=220k, limit 6.47e6, T=7.0e6, so thrust 6.47e6. Good. At t somewhat before, mass e.g. 250k limit=7.36e6 > T. So only at very end. Fine.
Need "Thrust: T = 1.3*m0*g0 ... limited to 3*m*g0 (throttle)" yes.

Need pitch formula "0 at liftoff; after 10 s starts to grow (gravity turn), reaching about 0.5 rad at 150 s, and it never decreases." Could make:
```
function pitchAt(t) {
 if (t<=10) return 0;
 if (t<=150) return 0.5 * smoothstep(10,150,t);
 return 0.5 + 0.08 * Math.min(1, (t-150)/50)? 
}
```
But "never decreases" and "reaching about 0.5 at 150". If after 150 increases, okay. But if it grows beyond 0.5, it may not "reaching about 0.5 at 150" still. Real gravity turn might continue to pitch more. But requirement could be satisfied with constant 0.5 after 150. Simpler constant. Use smooth step. Need `MathUtils.smoothstep` or custom. Define `smoothstep`. At 150 exactly 0.5. Good.
Maybe pitch is thrust angle from vertical; after burnout thrust zero, pitch doesn't matter. State pitch still 0.5. Fine.

Need visual trail line. The line from rocket base to previous base. At high altitude, line will have horizontal displacement; okay. Need contrail white. Use custom shader to fade along line? `LineBasicMaterial` opacity 0.5. Could create two lines with different opacity? Maybe a soft contrail by using a `TubeGeometry`? But trail points maybe thousands; creating tube dynamic expensive. A line is enough. Could add a second line offset? Not necessary.

Need smoke points custom shader. Let's craft details.

Smoke particles:
- Count 520. Generate arrays positions, sizes, alphas, seeds maybe.
- For each particle, initial around pad/flame trench. Use random angle and radius. We want cloud rolling sideways and rising. The particle's base position at `(cosθ * r, 0, sinθ * r)` but mostly along ground. During burn, smoke grows outward. We can animate:
```
const smokePositions = new Float32Array(N*3);
const smokeBase = ... // random initial ground positions
const smokeSize = Float32Array(N);
const smokeAlpha = Float32Array(N);
const smokePhase = Float32Array(N);
```
Update in `updateSmoke(t)`:
```
for i:
 const age = Math.max(0, t - 0.5);
 const seed = i; // use sin etc.
 const radial = 8 + age*3? 
 // initial random around trench
 const dir = ...
 const r = baseR + age * spread + Math.sin(age*0.7 + phase)*...
 const y = 1 + age*0.6 + ...
 // at high altitude? Smoke still at pad, not with rocket.
 positions[i*3] = baseX + cosθ*(baseR+age*10) + ...
...
```
Need smoke visible during liftoff. If t reaches 100s, smoke positions spread to huge radius maybe 1000m; but camera at high alt, far below, tiny. Fine.
- Use noise to flicker alpha.
- The particles should "roll sideways out of flame trench along the ground and then rise". We can bias positions along x and z. For first 10 sec, smoke near pad. Use `age = Math.min(t, 30)`? If t grows to 200, smoke continues expanding. It might be huge. Fine.
- The smoke should appear only after ignition; at t=0 maybe zero. Use `age = Math.max(0, t-0.5)`. If t<0.5, alpha 0 or particles at pad? Maybe initial no smoke. At t=0.5 start. Good.
- Need maybe hide smoke at high altitude? Since at pad far below, not visible. No need.
- Use custom shader with soft circle and alpha:
```
vertex:
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = aSize * (600.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}
fragment:
varying vAlpha;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d); // 1 at center, 0 edge
  // add noise
  float noise = 0.5 + 0.5 * sin(gl_PointCoord.x*12.0 + ...); // But no varying? 
  gl_FragColor = vec4(vec3(0.95,0.95,0.95), a*vAlpha);
}
```
Need normal blending; `transparent:true, depthWrite:false`.
- To look volumetric, use several particles. The soft sprites with noise. Add alpha based on distance. Good.
- Because points are screen-sized, overlapping thousands create cloud. The size should be large. `aSize` maybe 7..20. If at 100m distance, gl_PointSize ~ 7*600/100=42px. With 500 particles, large. At closer 30m =>140px. Good. At high altitude, smoke far distance 100km => 7*600/100000=0.04px, not visible. Fine.

Need flame flicker. Use `elapsed` for light intensity. Use `t` maybe. Since smoke uses t. Flame active until `t<200`, intensity fade near end. `flameActive = Math.max(0, 1 - t/200)`? At t>0, active. Actually at t=0 liftoff; flame starts immediately. Use `burnProgress = t/BURN`; `active = t < BURN ? 1 : 0`. Add fade after burn by `active = smoothstep(BURN, BURN+5, t)?` Wait fade after burn: `active = t < BURN ? 1 : Math.max(0, 1 - (t-BURN)/5)`. But physics thrust zero after burn; visual should fade to zero by t=205. Use.
- Flicker: `flicker = 0.75 + 0.25*Math.sin(elapsed*37) + 0.15*Math.sin(elapsed*61+1)`. Use absolute.
- Light intensity = active * flicker * maybe 30? Point light with distance. Need point light high. Use `PointLight(0xffd08a, intensity, distance, decay)` inside flame group. In Three physically based, intensity maybe 200. But tone mapping. Since flame adds bloom. Use point light at rocket base, distance ~100. At high altitude, point light moves with rocket. It lights rocket. Use `flameLight.position.set(0,-2,0)` relative rocket group? If parent rocketGroup, position local. Add to rocket group at local (0,0,0)? Actually flame group. The flame light should be at nozzle. Add `PointLight` to flameGroup at (0,-2,0). The flame group is child of rocketGroup; light moves with rocket. Good. Intensity maybe 50. Or `PointLight(0xffccaa, 300, 200, 2)` maybe. Need bloom. Use `renderer.toneMappingExposure` and bloom threshold. For flame core use emissive material with toneMapping? Basic material not affected? Bloom picks bright. Use additive shader.

Need flame shader details. Let's define `createFlameMaterial(inner?)` maybe use ShaderMaterial with uniforms:
```
const flameShader = new THREE.ShaderMaterial({
 uniforms: { uTime: {value:0}, uIntensity:{value:1}, uLength:{value:1} } // not
 vertexShader: ...
 fragmentShader: ...
 blending: THREE.AdditiveBlending,
 depthWrite:false,
 transparent:true,
 side: THREE.DoubleSide
});
```
We can reuse for inner and outer cones with color uniforms. Maybe make a material with `uColorA`, `uColorB`, `uPower`, `uOpacity`. But need update.
Simpler: Use MeshBasicMaterial with additive blending and vertex colors? A cone with `vertexColors`? We can assign colors to geometry vertices based on y. But cones have few segments; color gradient along y. Use BufferGeometry with color attribute. We can create cone and add colors. But per-vertex colors with additive; the cone will have gradient white to orange. Need opacity fade. Additive blending makes transparency by color intensity? In additive, alpha? BasicMaterial doesn't use alpha per vertex. Could set `transparent` and opacity. A gradient in color from bright white near nozzle to orange bottom, with opacity uniform 0.8. It might look like solid cone, but bloom helps. Need "blinding core". Add an inner small cone with pure white emissive additive, plus outer orange cone. Could be enough.
- Inner cone: `MeshBasicMaterial({color:0xfff1b8, transparent:true, opacity:0.9, blending:AdditiveBlending, depthWrite:false})` geometry small radius 1.2, length 10.
- Outer cone: `MeshBasicMaterial({color:0xff7a24, transparent:true, opacity:0.45, blending:AdditiveBlending, depthWrite:false})` geometry radius 2.8, length 25.
- Maybe add glow sprites? Use point lights.
- Mach diamonds: Add 3 white rings (TorusGeometry radius 1.5, tube 0.1) rotated to horizontal? They are rings around plume at intervals; material additive white, opacity. Animate scale. Use cylinders? A torus ring at y positions. Add to flame group. But if flame length grows, positions. Could create 3 rings with emissive additive.
- Need flicker scale. Set flame group scale: `const plumeLen = 18 + Math.min(alt/10000, 25);`? At high alt, plume longer. But in vacuum, exhaust expands; length maybe 100m. Could set `flameGroup.scale.set(1, 1 + alt/5000, 1)`? But cone length. At alt 100km, factor 20; too long. Visual should be plausible. Since camera close, huge plume. Use `lengthScale = 1 + Math.min(alt/10000, 8)` perhaps. At 100km, 9x. Outer cone length 25*9=225m. That's big but okay. WidthScale = 1 + Math.min(alt/20000, 3). Add flicker. But if burn ends by alt 140km, scale ~14. Good.
- However if flame group scale changes, point light position unaffected? Fine.
- Need flame mesh orientation. Put flame group at rocket group local y=0? Let's create flame group at rocketGroup local? Add to rocketGroup. It needs base at nozzle bottom (y=0 local). The rocketGroup base at y=alt. Use cone geometry with length L and position y=-L/2 (apex at 0, base at -L). Good. Add white inner cone length L1, position y=-L1/2. Outer length L2, position y=-L2/2. Mach diamonds at y=-? ring positions. Note scale of group y affects cone. Fine.
- If rocket base at alt=0, plume below pad, maybe visible through pad? It should be in trench. Could be occluded by pad geometry if pad above? The flame is below pad at y<0; camera sees outside? Pad is at y=0 and extends. The flame below may be hidden by pad unless trench cut. But at liftoff, flame should be visible from nozzles downward into trench; if pad is solid, flame under pad hidden. We can position flame group at rocketGroup local y=2? Better engine nozzle at local y=2 and plume down from y=2 to negative. The pad at y=0; flame below 0 hidden. But we can make flame visible above pad as it comes from nozzles? Real flame exhaust is under rocket and into trench; if pad blocks, maybe hidden but smoke around. For visual, we can put a flame cone that extends downward but not fully occluded; pad is large box from y=-1 to0. If flame starts at nozzle y=2 and extends down to y=-20, part below pad hidden but upper part visible. Since camera at side, flame below pad blocked. But the flame should appear at nozzle base, above pad? Nozzles at y=0.5, pad top y=0; if nozzle at y=0.5, flame from nozzle down goes below pad; blocked. Real engine plume blasts out and smoke rolls out. The flame near nozzle visible above pad? Hmm.

Better place rocket base at y=0 but nozzles at y=1; flame starts at y=1, extends downward to y=-10; pad occupies around center but flame trench is a hole. We can create trench hole (a dark box) and maybe not solid pad at center? If pad is a large box with a trench cutout, flame can be visible through the cut. We can model pad as a ring/box with a gap? Simpler: make pad a flat plane (not solid) at y=0 with a trench dark area; flame below plane may still be visible from camera because plane occludes only if behind? A plane at y=0 does not occlude below if camera above looking at rocket? Actually flame extending downward from nozzle; camera above ground looking at rocket sees flame below plane? The plane is horizontal; if camera at y=20, looking at rocket, the flame below pad at y<0 is behind/under plane; plane may occlude from certain angle, but since camera above, the plane surface is between camera and flame? The flame below plane is hidden by plane if plane extends. However if flame trench is dark and maybe open, no. We can make pad smaller/plane not full at center? Or use flame trench as a gap with no concrete (a dark hole) where flame can be seen. But a plane with hole cannot easily. We can make pad as large slab with a trench area; flame could be above y=0 maybe.

Real launch: rocket sits on pad, exhaust goes down into flame trench, smoke billows out. The flame is mostly under pad, not visible? But launch photos show bright flame at base and smoke. We can make a visible flame above pad around nozzles, extending downward, and the pad not occlude if camera is low and flame trench is open. Maybe create a "flame trench" as a large dark rectangular depression (a box with top y=-0.2) and pad surround only around it. If we make pad as multiple boxes leaving a central trench, flame can be seen. But simpler: Set pad top at y=-0.5, rocket base at y=0, flame from y=0 to -20. The pad is below rocket base, so flame above pad? Wait rocket base y=0, pad top y=-0.5, nozzles at y=0; flame extends down from y=0 to -15, passing through pad top and below. If pad is solid, flame below -0.5 hidden. If we make pad as thin plane at y=-0.5 with dark trench hole, maybe. But camera could see upper flame from nozzle to pad top, enough. Real flame extends downward.

Could set the rocket base at y=2 above pad. Then flame starts at y=2 and extends down to y=-20; pad top y=0. Upper part visible above pad. Good. But altitude state should be 0 on pad? The rocket base on pad maybe at y=0; engines just above pad. But okay. Let's set nozzle bottom local y=1.0; flame starts y=1.0. RocketGroup at alt=0, so flame starts at y=1.0 above pad, extends down. It will pass through pad. But visible near nozzle. Smoke covers. Good enough. We can also make flame length shorter at liftoff, so upper plume visible. The pad/trench can be open.

Need camera at high altitude and Earth. The local ground plane at y=0 with huge scene. At high altitude camera y=alt+47; looking at rocket center. The ground plane far below. Earth sphere. Good.

Need building shadows. Directional light shadow map. Use `sun.castShadow = true; sun.shadow.mapSize = 2048;` shadow camera `left/right/top/bottom` maybe 120. But light is far; target origin. Shadow at pad only. Rocket at high altitude won't cast on pad, but light shadows on rocket? Directional light casts rocket shadow on itself? It will cast on pad if light. At high altitude rocket shadow far? Directional light shadow camera only covers origin, so rocket at high altitude outside shadow camera; no shadow. Fine. But rocket still lit.

Need sun directional position relative origin and target. Use `sun.position.set(150, 250, 100)`, `sun.target.position.set(0,0,0)`. Add. `sun.castShadow=true`. Shadow camera near/far. Orthographic camera: left=-100,right=100,top=100,bottom=-100, near=1,far=600. Since sun at 250 high, okay. But light position may be relative. Good.

Need ambient/hemisphere: `HemisphereLight(0xbfd9ff, 0x3a4a2b, 0.6)`. At high altitude, ambient maybe too dark? Sun. Fine. Could update ambient intensity with altitude? Not necessary.

Need realistic coast: ocean horizon behind pad. Build ocean plane large at y=-2? Actually pad and land at y=0, ocean at y=0.02. Put ocean plane centered at (0,-0.1,-30000) size 100000. But then land plane should cover near. We need avoid ocean cutting through land. Could create ocean plane at y=0.01 and land plane at y=0.02? Hmm. If ocean huge centered at z=-50000 extends to z=0, it will cover land near? We can place ocean beyond coastline. Let land plane centered at z=2000? Let's define coordinate: pad at (0,0,0). Camera initially at (80,20,100), i.e., +z side. It looks toward pad and rocket. Ocean behind pad (negative z). If land plane is from z=-1000 to +4000 and ocean starts z=-1000. We can make land plane size 6000, centered z=1000 (from -2000 to 4000). Ocean plane size 100000 centered z=-50000 (from -100000 to 0) but overlaps land from -2000 to0. To avoid overlap, ocean should start at z=-2000. Use ocean plane large centered z=-40000, size 80000? extends to 0. Could instead use a plane from z=-2000 to -100000: geometry width 100000, height 100000, center z=-52000. Then ocean edge at z=-2000. Land plane from z=-2000 to +4000: width 6000, depth 6000, center z=1000. Good. The ocean horizon far in -z. At low camera, ocean visible beyond pad. Good.
- Add shoreline strip at z=-2000 maybe a sandy line. Could add a thin plane/box. Good.

But Earth sphere at high altitude: ocean/land local planes may not show. Earth sphere texture with oceans/land globally. Fine.

Need road: Add a dark road along x, maybe from x=-100 to x=-1000, z=50. Use `BoxGeometry(1000,0.1,8)` or plane. Add buildings along road. Low buildings around pad.

Need trees/bushes: Use InstancedMesh? Strict TS. Create `ConeGeometry` or `SphereGeometry`; set instance matrices. `InstancedMesh` with count, matrix. Use `const bushGeo = new THREE.SphereGeometry(1, 8, 6); const bushMat = new THREE.MeshStandardMaterial({color:0x4a6b32, roughness:1}); const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 220);` Then for each, position random around land, scaled. Use `bushes.setMatrixAt(i, matrix)`. Need castShadow? receive? yes maybe cast. Use dummy Object3D or matrix. Type.
- Add some taller trees? Maybe not necessary.

Need roads and buildings:
```
function addBuilding(x,z,w,d,h,color) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial(...)); mesh.position.set(x,h/2,z); ...}
```
Add a few with dark roofs. Add hangars. Ensure low. Use cast/receive.
- Add a road: `BoxGeometry(600,0.1,8)` maybe at y=0.05. Use `MeshStandardMaterial({color:0x2c2f33, roughness:0.9})`.
- Maybe sidewalk. Fine.

Need launch pad concrete: Use `CylinderGeometry` maybe square. A launch pad often octagonal concrete pad. Use `CylinderGeometry(45,45,1.2,8)` with concrete texture; position y=-0.6? top at y=0. Use 8-sided. Add central trench dark rectangle. Add pad border. Camera low sees.
- Flame trench: `BoxGeometry(14, 0.7, 30)` dark concrete at y=-1? Top maybe y=0? Hmm. Put trench as dark box at center with top y=0.1? Need rocket over. Use dark concrete strip. Could add a raised ring? Fine.
- Pad top y=0. `CylinderGeometry(45,45,0.8,8)` position y=-0.4 -> top 0. Add `MeshStandardMaterial({map: concreteTex, roughness:0.85})`. `receiveShadow`.
- The trench maybe a `BoxGeometry(10,0.2,25)` at y=0.05 with dark concrete. It sits on top. But flame below. Fine.
- Pad edge: maybe a ring? not needed.

Need launch tower next to rocket:
- Add lattice tower at x=-5.5,z=0, height 60. It could look like tower.
- Use vertical beams and cross ties. Use a helper `beam(p1,p2,r,mat)` creates cylinder oriented. Need compute direction. `const dir = new THREE.Vector3().subVectors(p2,p1); const len = dir.length(); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8), mat); mesh.position.copy(p1).add(p2).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());`
- Add beams at corners: positions relative tower center.
- Add cross beams at z levels every 6m.
- Add diagonal braces: from top of level to bottom of next? Could add a few.
- Tower height 60, rocket 70. Good.
- Add umbilical arms: horizontal beams from tower to rocket at y=30, y=45. Start at tower side x=-5, end at x=0. Add pipes. Maybe attach to rocket. Use cylinders. Good.
- Lightning masts: four at positions (±30, 0, ±30) height 80, maybe wide lattice. Use helper with tower function.
- Need not too many beams; maybe 4 masts x 8 beams each. Fine.

Need rocket details:
- Use group `rocket = new THREE.Group();`. Materials:
  - whiteMat = MeshStandardMaterial({color:0xffffff, roughness:0.5, metalness:0.1, map: rocketTex})
  - darkMat = MeshStandardMaterial({color:0x222222, roughness:0.7, metalness:0.3})
  - metalMat = MeshStandardMaterial({color:0x555a5f, roughness=0.4, metalness=0.9})
  - nozzleMat = dark metal.
- Create body cylinder with `CylinderGeometry(1.85,1.85,47,48)` position y=31.5? Let's calculate:
  - engine section dark: CylinderGeometry(1.85,1.85,6,48) center y=5 (from 2 to8). Actually bottom at 2. But nozzle? We'll create.
  - main body white from y=8 to55 height 47 center 31.5.
  - interstage dark: CylinderGeometry(1.85,1.85,2,48) center y=56 (55-57).
  - second stage white: height 6 center y=60 (57-63).
  - fairing taper: CylinderGeometry(1.85,0.5,7,48,1) center y=66.5 (63-70). But CylinderGeometry top radius? signature (radiusTop, radiusBottom, height). Top at +y. We want bottom radius 1.85 at y=63 and top 0.5 at y=70. So radiusTop=0.5, radiusBottom=1.85. Good.
  - nose tip maybe small cone at top y=70 to 73? But total 70. Use fairing with rounded top? `CylinderGeometry(0.5,0.5,2)`? Hmm fairing ends at 70 with radius 0.5, not point. Fine.
  - Add a small cone top `ConeGeometry(0.5,1.5)` at y=71? But 70 height. Could extend to 70.5. Not important. Use total 70.
- Add vertical stripes? The map draws. Add a dark band at interstage. "visible interstage and darker band" yes.
- Add flag/lettering texture on main body. Use map.
- Add fins? Falcon 9 doesn't have fins. Add grid? Not.
- Add engine nozzles: 9 engines. Main body at bottom. Create 9 `CylinderGeometry(0.35,0.45,1.2,16)` nozzles at y=1.2? Actually engine section bottom y=2, nozzles extend down to y=0.5. Place nozzles at around y=1.4, radius 1.3 grid. Use 8 around ring radius 1.2 and one center. Use dark metal. Add each with `ConeGeometry`? Use `CylinderGeometry(0.25,0.35,1.2,16)` open. They stick down. We can add `MeshStandardMaterial` dark.
- Add engine section bottom plate.

- Add launch clamps? Maybe side arms from tower to rocket. Fine.

- Add "FALCON 9" lettering via texture. Need canvas texture map. For main body cylinder, UV mapping: texture stretched around circumference and along height. Draw letters along one side. Good.

Could also add a US flag on fairing? Use texture. The flag may be on body. Requirement "markings (a flag and lettering drawn on a canvas texture)". We'll draw on a canvas, map to body. Good.

Need map create:
```
function makeRocketTexture(): THREE.CanvasTexture {
 const w=1024,h=512; const canvas=document.createElement('canvas'); ...
 ctx.fillStyle='#f8f8f8'; ctx.fillRect(0,0,w,h);
 // subtle panels
 for ...
 // dark band? maybe
 ctx.fillStyle='#111'; ctx.fillRect(0, 360, w, 30); // one horizontal band
 // vertical seams
 ctx.strokeStyle='rgba(90,90,90,0.25)'; ...
 // flag
 ctx.fillStyle='#1f3c88'; ctx.fillRect(120,180,100,60);
 // stripes
 ctx.fillStyle='#d33'; ...
 // lettering
 ctx.fillStyle='#222'; ctx.font='bold 38px sans-serif'; ctx.textAlign='center'; ctx.fillText('FALCON 9', 620, 220);
 // maybe spacex
 ...
 const tex = new THREE.CanvasTexture(canvas);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.wrapS = THREE.RepeatWrapping? no.
 return tex;
}
```
Need no network fonts. Default sans-serif.
- Since texture map on cylinder, lettering may wrap. Fine.

Need ground texture and concrete. Make canvas textures with noise:
```
function makeConcreteTexture(): THREE.CanvasTexture {
 const c=document.createElement('canvas'); c.width=512; c.height=512;
 const ctx=...
 ctx.fillStyle='#a7a7a2'; ctx.fillRect...
 for (let i=0;i<4000;i++){ ctx.fillStyle = `rgba(${...},0.3)`; ctx.fillRect(random...)}
 // cracks
 ...
 return tex with repeat.
}
```
Need set wrapS/T repeat. But if we set repeat on material map used on pad; same texture maybe. For pad cylinder, repeat maybe 4. For Earth, separate.
- Ground texture: similar with greens and brown. Use 512. Maybe draw random patches and speckles. Set repeat 20.
- Ocean texture: maybe create simple wave gradient. Use `MeshStandardMaterial({color:0x1a607d, roughness:0.25, metalness:0.1})` no texture. But realism: procedural texture with waves. Create canvas 512 with blue gradient and white lines. Use map. Could use ocean material map and repeat.
- Earth texture: 1024x512 with ocean and continents. Need draw with random blobs. Use Math.random. Maybe use `ctx.fillStyle` and Bezier. Need no external. Could make rough. Add clouds white semi-transparent. Use map on Earth sphere. 
- Buildings: simple.

Need lighting: `const sun = new THREE.DirectionalLight(0xfff1d8, 3.0);` Need physically based. Set `sun.position.set(120, 180, 80);` target origin. CastShadow. Shadow map size 2048. Shadow bias maybe -0.0005. Use `sun.shadow.camera.near=10; far=500; left=-100; right=100; top=100; bottom=-100;` But with light at 120,180,80 distance ~225; far 500 okay. At ground, shadow of tower. Fine.
- Add `AmbientLight` or `HemisphereLight`. Use `new THREE.HemisphereLight(0xbcd6ff, 0x4b5b3a, 0.7)`.
- Need maybe additional fill light for rocket.

Need bloom settings: `new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.6, 0.3)`? Bloom pass constructor (resolution, strength, radius, threshold). Use strength 0.8, radius 0.5, threshold 0.2. Need not too much. Flame additive will bloom. Use `composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.6, 0.2));` Need update resolution on resize? `composer.setSize` and bloom pass resolution? Composer handles? It has bloom pass resolution set at creation; when composer set size, it may update? EffectComposer setSize updates passes? It updates renderTargets; UnrealBloomPass's resolution may not update. Could create it with window size and on resize set bloomPass.resolution? The UnrealBloomPass has `resolution` property. Could update. Need handle. Or use `composer.setSize` only. Fine maybe.
- `const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.5, 0.2); composer.addPass(bloom);`
- On resize: `renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); composer.setSize(w,h); bloom.resolution.set(w,h)?` UnrealBloomPass resolution property is Vector2. Need check. It likely has `resolution` property. We can update `bloom.resolution.set(w,h)`. But if pass has `resolution`? In addons, UnrealBloomPass constructor sets `this.resolution = new Vector2(...)`; I think yes. Use. Strict TS may know property? The type from addons likely defines `resolution: THREE.Vector2`. Should compile. Could avoid by recreating? Simpler update composer only. But bloom render target size maybe off. We can set `(bloom as any).resolution.set(w,h)`. But strict with any fine. Use `(bloomPass as any).resolution.set(w, h);` maybe. But to avoid any, use `bloomPass.resolution.set(w,h)` if property exists. Let's verify type definitions. `UnrealBloomPass` class has `resolution: Vector2`? In three examples, `this.resolution = new Vector2( resolution.x, resolution.y);` yes. So use.

Need `THREE.MathUtils.smoothstep`? For alt stars. Use `THREE.MathUtils.smoothstep(alt, 70000, 100000)` returns number. Good.
Need `MathUtils` imported via THREE.

Need create stars and update opacity. Since star material opacity update. Good.

Potential issue with sky shader uniforms: Need update `uCamPos` every frame with camera position. Need `uAlt` with rocket alt. Need `uSunDir`. Use normalized sun direction from camera? We can set sun direction as `sun.position.normalize()`? The sky sphere center at origin; use sun direction from origin. For sun glow, direction from camera to sun? Use sun position vector normalized. Fine.
Need `uTime`? Not.

Sky shader at ground: if camera at (80,20,100), and sky dome radius 2e8 centered at origin, `dir = normalize(vWorldPos - uCamPos)`. For top of dome, positive. Gradient. The horizon color maybe pale. Good.
- At high altitude, `uAlt=100000`, factor = smoothstep(0,100000,alt)? At alt=100000 ->1, all black. At alt=70000 ->0.5? Wait smoothstep(0,100000,70000)=? t=(70000/100000)^2*(3-2t)=0.7²*(1.6)=0.784. That fades too much at 70 km. Requirement sky from blue at ground to black at 100 km. At 70 km, should still be somewhat blue? Stars appear above 70km. Could use `smoothstep(0, 100000, alt)` for fade. At 70km, sky 22% original (since mix to black factor 0.78) -> dark blue. Stars opacity smoothstep(70,100)=? at 70 zero, above. Good.
- But sky at 100km black. Stars clearly visible above 100. Use opacity smoothstep(70,100) at 100=1. Good.
- Note at altitude >100, still black. Good.
- At ground, alt=0, factor 0. Good.

Need sun glow maybe. If sky black at high altitude, sun not visible. But the rocket still sun-lit. Fine.

Need Earth sphere: At high altitude, Earth visible. Use texture with "ocean on horizon behind pad" for low; local. The Earth sphere from high altitude shows oceans/land. Good.
- Earth sphere center y=-R; top at origin. Texture mapping. Need maybe `MeshStandardMaterial({map: earthTex, roughness:0.8, metalness:0.0})`. It receives sun. At high altitude, camera looks at rocket, Earth below; lighting. Good.
- Add atmosphere rim: maybe a transparent sphere slightly larger with shader to give blue halo. Could add `SphereGeometry(R+20000, 128, 64)` with `MeshBasicMaterial({color:0x66aaff, transparent:true, opacity:0.05, side:BackSide?})`? Might not look. Could skip.
- At ground, Earth sphere might show under ocean/land? It is below. The local planes cover. Good.

Need local planes receive shadows. Ground plane y=0.02. Use `MeshStandardMaterial({map:groundTex, roughness:1.0})`. Place `PlaneGeometry(6000,6000)` rotated -π/2, at y=0.01, center z=1000? Need orientation. A PlaneGeometry in XY; rotate x=-π/2 makes horizontal. Position z=1000. Then land from z=-2000 to4000. Ocean plane at z=-52000, size 100000. Use y=0.02. But land plane y=0.01, ocean y=0.015? Need not overlap. Ocean starts at z=-52000+50000=-2000, exactly. Great.
- Ocean plane size 100000 x 100000 centered z=-52000, extends z=-102000 to -2000. At y=0.005. Land plane from z=-2000 to4000. Good. The ocean horizon at distance -100000. Fog to horizon. Great.
- Add shoreline strip at z=-2000: a `BoxGeometry(100, 0.2, 4)` maybe along x? Actually coastline along x at z=-2000. Use a long strip `BoxGeometry(6000, 0.1, 4)` at y=0.02, z=-2000, color sand. Good.
- Land plane can be 6000x6000; center z=1000. yes.

Need camera initial view: camera (70,20,100) looks at target (0,35,0). Ocean behind pad at z=-2000. The view sees ocean beyond. Good.

Need roads and buildings around pad: place road along z=40, x=-1000? Add a road `BoxGeometry(1500, 0.1, 10)` at x=-800, z=40. Add buildings at x=-700,z=100 etc. Low. Add a few hangars.

Need launch pad at origin; camera at +z, the ocean behind (-z). Good.

Need launch tower position x=5? If camera from +z, tower on right? Fine. Rocket next to tower. Use x=5.5 maybe. It may be behind rocket? Let's set tower at x=-6, z=0. Camera sees left. Good.

Need lightning masts around pad at radius 35. Four at (35,0,-35), etc. Tall. Need not intersect tower. Fine.

Need smoke shader and update. Need update positions on CPU every frame. If paused, no step, but smoke should freeze? We can use simulation t; if paused, t unchanged so smoke frozen. Good. If viewer speed choice changes, t changes faster. Smoke uses t. Nice.
- For flicker use elapsed real time; when paused, flicker still moves? The flame maybe should flicker even paused? Paused means simulation paused; render loop still runs. Could freeze flame flicker based on t? Better use elapsed for flicker; pause doesn't affect. But paused maybe freeze? Not critical.
- The flame active based on rocket.t. If paused at t=50, flame remains active and flickers. Good.

Need overlay state update: Use `rocket.state()`. If paused, t fixed. Speed computed. Display:
```
const s = rocket.state();
overlay.innerHTML = `<span>${formatT}</span> ...`
```
Need avoid XSS? No external. Use text. Use separate elements. Simpler:
```
const overlay = document.createElement('div');
overlay.style...;
overlay.innerHTML = `<div>...</div>`;
```
But need update text. Use innerHTML with computed numbers. Fine.
- Need show speed and mission data (T+ time, altitude in km, velocity). E.g. `T+ ${t.toFixed(1)} s · Alt ${(alt/1000).toFixed(2)} km · Vel ${vel.toFixed(0)} m/s · Speed x${speed}`. If speed maybe decimal. Good.
- Need overlay small. Use fixed top-left with backdrop blur? CSS. Fine.
- Need buttons overlay at bottom? Create buttons container. Use button labels x1, x10, x30. Set. Add `viewerSpeed` updates.

Need keyboard event: `window.addEventListener('keydown', (ev) => { if (ev.key === '1') set 1; ... })`. Need not conflict with typing. Fine.
- Buttons: `for (const [label, value] of [[1,1],[2,10],[3,30]])`. In TS strict, array types. Use:
```
const speedOptions: Array<[number, number]> = [[1,1],[2,10],[3,30]];
```
However label and value both. Create buttons.
```
const buttonsContainer = document.createElement('div');
...
for (const [keyLabel, value] of speedOptions) {
 const btn = document.createElement('button');
 btn.textContent = `x${value}`;
 btn.addEventListener('click', () => { viewerSpeed = value; });
 buttonsContainer.appendChild(btn);
}
```
Need style. Good.
- reset clears viewer choice. But if user presses button after reset, set. Fine.

Need expose `window.__rocket` object. We can assign class instance. `(window as any).__rocket = rocketSim;` Need property `paused`. Class has. `state` method returns object. `trail` array. Good.

Need maybe `window.__rocket` should be plain object? The requirement says `window.__rocket = { reset():..., step():..., state():..., trail, paused }`. We can assign class instance with methods; fine. Ensure `paused` property writable. Use public. In TS strict, class properties. Need possibly `window.__rocket` type any. Good.
- When changing paused via `window.__rocket.paused = true`, render loop checks. Good.

Need `trail` array property typed `Array<{x:number;y:number;z:number}>`. In state? The object property. Good.

Need physics step uses `this.paused`? Step method can still advance even if paused? Requirement: paused boolean when true render loop does not call step. Manual step may still? Probably step should work regardless. Paused only affects render loop. Fine.

Need maybe the rocket group's position should be updated after step. We need visual update after step. We compute using `rocket.state()`. But `state()` returns a new object each frame; maybe many allocations. Fine.
- In animate, we call `rocketSim.step(delta * speed)`. Then get state. If paused, don't step; state remains. Need speed before step. Use a method `playbackSpeed()`? state() returns speed but computing state before step may create. Use `const sp = rocketSim.speed();` where speed method? We can implement `playbackSpeed(): number`. But requirement state().speed. The class can have both. Use `const sp = rocketSim.playbackSpeed();`.
- But if viewerSpeed chosen, reset sets null. The global viewerSpeed variable needs to be accessible in class. Could define `let viewerSpeed: number | null = null;` before class. Then method uses. Reset sets `viewerSpeed = null`. Good.
- But if class defined before viewerSpeed? Define variable then class.

Need default playback speed logic: `if (viewerSpeed !== null) return viewerSpeed; return this.t < 10 ? 1 : 10;`
- At t=0 speed 1. After t crosses 10, speed 10. Good.

Need `state()` include speed `this.playbackSpeed()`.

Need `step(dt)` update `this.t`. Trail point after step. If dt negative? We can clamp to 0. If dt=0, trail adds current point. The requirement "advances simulated time by dt seconds" any dt; negative maybe not. Use `if (!Number.isFinite(dt) || dt < 0) dt = 0;` but if `dt` is NaN, t unchanged. Good.
- Use `const remaining = dt;` then loop. Need no infinite loop if dt huge but finite. Fine.
- If dt = 0, while skip; push trail. Good.
- If dt > 1000, 50k loops; okay.
- Substep at most 0.02. Use `while (remaining > 0)`. Floating point maybe. Use `const sub = Math.min(remaining, 0.02);`.
- Need mass at current `this.t`. Use mass function.
- Need pitch at current `this.t`. Good.
- Need gravity at current `this.y`. 
- Need if y negative before substep? If clamped, y=0.
- Need compute acceleration with current pitch and current x/h. Then update. If after update y<0, clamp. If y<0 and velocity downward, set vy=0? If we clamp to 0, velocity set 0 to not continue downward. But if at pad and no thrust, gravity should keep it there. Fine. If horizontal velocity maybe, x moves. But rocket on pad cannot go below. Fine.
- Could also clamp y at 0 at start if negative. 
- Need if the rocket is descending and crosses pad, set y=0, vy=0. Then future gravity causes ay negative but no movement due clamp. Good.
- Use `this.vy += ay*sub;` then `this.y += this.vy*sub;`. If y < 0, set y=0, vy=0. But if x etc. fine. It may keep `acc` negative. Good.

Need `state.acc`: "net vertical acceleration, m/s^2" could be computed as `thrust * cos(pitch) / mass - g(h)` at final t. When on pad and no thrust, acc = -g(0). Good. When burn ended and descending, acc negative. Fine.
- `state.vel`: maybe total velocity magnitude: `Math.sqrt(vx*vx+vy*vy)`. At apogee perhaps. Good.

Need `alt` from `this.y`. `pitch`. `speed`.

Need trail coordinate y = this.y. The rocket base. Good.

Need visual model group height. The rocket center is base + 35. The camera target = (x, y+35, 0). The state alt = y. Good.

Need update rocket group position: `rocketGroup.position.set(st.x, st.alt, 0)`. But if the rocket base state is alt, the model base at local y=0. Good.
- The flame group child at local y=0? Add flame to rocketGroup. It will move. For flame start at local y=1? Need flame group local? Let's create flameGroup at local (0, 0, 0) and geometry positions downward from y=0. It will be under rocket base. If rocket base at y=0, flame extends to negative. Camera sees. Good. But plume near nozzle at base. Fine.
- Engine nozzles at local y=0.5? Fine.
- Flame group may be occluded by pad; we'll see. Could set flame group local y=2 so starts above base? But then it's not at nozzle. Actually nozzles extend from local y=0.5 to1.7. Flame should start at y=0.5. Use local y=0.5. Create flame group at local y=0.5. Cone apex at 0 (in group) to downward. It starts at y=0.5, below pad? If rocket base at alt=0, flame starts at 0.5 above pad, extends down negative. Good, part above pad visible. In trench.
- If flame group is child of rocketGroup, scale. Good.

Need maybe engine section dark at bottom. Nozzles.

Need smoke should not be inside rocket. Fine.

Need "view of coast, curve of Earth and then space". At high altitude camera near rocket; Earth sphere visible below. Good.
- The local coast/ocean maybe far below. At high altitude, Earth sphere. Good.

Need camera look target: rocket center. At high altitude y=rocket center. The camera offset: `(35, 18, 75)` maybe length ~86. This is within 100. But also camera should see coast/Earth. If camera is above rocket center by 18, looking down at center, then below center is sky? Actually target is center; camera above and in front. Looking at center, the view direction has downward component. Behind target is further downward? In perspective, the Earth below is behind the rocket and below, likely visible. The rocket may block some. Fine.

Could set chase offset `(45, 20, 70)`. Length ~86. Within 100. But at high altitude, if camera offset is fixed vector (x=45, y=20, z=70), and rocket moves horizontally x, camera at same offset. The view direction to center. Good.
- At liftoff, ground camera fixed (70,18,110). Distance to center ~?? target center (0,35,0). Camera position (70,18,110) dist ~? sqrt(4900+289+12100)=131. Camera low. Fine.
- Transition: use `const transition = THREE.MathUtils.smoothstep(st.alt, 55, 130);` At alt 0 ->0. At alt >130 ->1. The rocket clears tower at alt? Tower height 60. At alt 55 base reaches 55; rocket top at 70+? Actually rocket clears tower when base altitude > tower? The center. Use 60. At t=10 alt ~155. The transition fully by 130. Fine.
- To make camera smooth, use `camera.position.lerpVectors(groundCam, chasePos, transition)`. But as rocket moves, chasePos changes. Good. The ground camera remains until transition. Then camera moves. Smooth.
- Look target = rocket center. At liftoff, target moves up; camera fixed, looking at rocket as it ascends. This is like tracking from ground. At transition, camera moves to chase. Good.
- At high altitude, camera near rocket. Good.
- If the rocket descends after apogee, camera follows downward; maybe okay.
- Need camera near rocket within 100m. Offset length ~86. Good.
- But as rocket moves horizontally, the chase offset same; camera relative. Good.
- Could add slight oscillation based on elapsed? Not necessary.

Need stars clearly visible above 100 km. The rocket at t=200 alt ~143 km. Stars opacity 1. Good.

Need update sky uAlt: use `st.alt`. If rocket at 143km, sky black. At initial, alt 0, blue. Good.
- At t=10 alt 155m, sky still blue. Good.
- At t=100 alt ~? 20-30km, sky maybe dark blue. Good.
- At t=150 alt ~70km, stars starting. Good.
- At t=200 alt 140km, stars clear.

Need "atmospheric scattering in the sky (e.g. the Sky addon or your own shader)" We use own shader. Good.

Need "aerial perspective (distant things paler and bluer)" Use fog. But fog at high altitude may haze Earth. Fine. Use `scene.fog = new THREE.Fog(0xb6d7e8, 1000, 120000);` The ground horizon at 100km fog full? At high alt, Earth distance maybe 100km -> full pale blue, could obscure Earth details. Maybe use far 300000 and near 500, so at 100km factor (100000-500)/(300000-500)=0.33. Good. At horizon low distance 100km ocean maybe 0.33. More realistic. Use Fog(0xb9d6e8, 800, 250000). At 100km factor ~0.39. Good. At 143km factor ~0.57. The Earth becomes pale blue, good aerial perspective. Stars not fogged (Points material fog? If fog true, stars at distance 50 million will be fully fogged? Wait fog applies to all materials with fog true. PointsMaterial fog default true, so stars would be fogged out at high altitude! That's bad. Need disable fog for stars and sky. Set `starMat.fog = false`? MeshBasic/PointsMaterial has `fog` property. For custom shader no fog. If using PointsMaterial, set `starMaterial.fog = false`. Similarly flame additive materials maybe fog true? At high altitude, flame close. Fine. Sky shader no fog. Trail line material at high altitude distance behind rocket maybe 100km from camera? Trail points mostly behind rocket along trajectory; at high altitude, trail is close? Actually trail extends down from rocket to pad, distance from camera maybe large, could be fogged. Contrails in sky should be white; fog white okay. But maybe line material fog true default; at high alt, trail far will fog. Could set fog false? A contrail should be visible. Use custom line shader or `LineBasicMaterial({fog:false, transparent:true})`. Set fog false. Good.
- Smoke points at pad far below, fog true? Custom shader no fog. At high altitude smoke invisible due small size. Fine.
- Earth sphere fog true; good.
- Ground/ocean fog true; good.
- Rocket materials fog true; at high altitude camera close, no fog. Good.
- Stars fog false. Sky shader unaffected.
- Trail line fog false. Good.
- Maybe buildings fog.

Need star PointsMaterial custom. Use `PointsMaterial({color:0xddeeff, size:2.0, sizeAttenuation:false, transparent:true, opacity:0.0, depthWrite:false, fog:false})`. However `sizeAttenuation:false` and size 2 pixels. Good. But at high altitude, stars clear. Could use size 2.5. Need `vertexColors`? Not.
- Position stars on sphere radius 5e7? At camera distance 5e7, but points with sizeAttenuation false means fixed pixel 2. Good. Need not be fog. DepthWrite false. But with Earth sphere, depthWrite false means stars may draw over Earth? Hmm if depthWrite false, transparency and depth test? DepthTest default true; they are far behind Earth, so Earth occludes if Earth depthWrite true. If stars are behind Earth, depth test with Earth writes depth and stars fail. Good. But stars at radius 5e7 around origin; some at negative y below Earth; Earth sphere center at -R. At high altitude, those behind Earth likely occluded. Good.
- Need maybe stars should not appear during low altitude; opacity 0. Good.

Need Earth sphere maybe too large and its depth precision. Fine.

Need shadow. Directional light target. Add `sun.target` to scene? Directional light target property is Object3D; add target to scene. Use `scene.add(sun.target)`.
- Sun position fixed. At high altitude, directional light shines from far; shadow camera at origin. Rocket at high altitude maybe outside shadow frustum but lit. Fine.

Need scene background? Sky mesh. Could set `scene.background = new THREE.Color(0x000000)`? But sky dome covers. At high altitude, sky black. At ground, sky dome. Good. If sky dome not covering some direction? It is sphere. Good.
- Need renderer clear color? Not.

Need use `THREE.Group`. For rocket group.

Need perhaps the "flame flickering light lights the pad and rocket". Point light at high altitude moves with rocket; it lights rocket. At liftoff near pad, it lights pad. Good. Add a second point light at flame, maybe one orange and one white. Use `PointLight(0xffb066, 120, 100, 2)` and `PointLight(0xffffff, 60, 50, 2)`? Could be too bright. Use one.

Need use `shadow.camera` for point light? Point light doesn't cast shadow by default; add castShadow? Maybe set true but shadow cost. Use only directional for shadows. Flame light not cast shadow. Fine.

Need maybe ground smoke and plume bloom. Use additive materials, bloom. Good.

Need procedural textures code. Need avoid `ctx` maybe `CanvasRenderingContext2D | null`. In TS, `canvas.getContext('2d')` returns `CanvasRenderingContext2D | null`. Need handle. Define helper:
```
function getCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('...');
 return ctx;
}
```
Then use. Strict.

Need create texture functions:
```
function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D)=>void): THREE.CanvasTexture {
 const canvas = document.createElement('canvas');
 canvas.width=w; canvas.height=h;
 const ctx = getCtx(canvas);
 draw(ctx);
 const tex = new THREE.CanvasTexture(canvas);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.wrapS = THREE.RepeatWrapping;
 tex.wrapT = THREE.RepeatWrapping;
 tex.anisotropy = 4;
 return tex;
}
```
But for rocket texture, wrapS repeat? It should not repeat maybe. Use a function. For concrete/ground set repeat. The wrapper sets Repeat. For rocket map, if Repeat, the flag might repeat around circumference? Actually cylinder UV u 0..1; Repeat only matters if repeated. RepeatWrapping okay. We can set by material? For rocket texture, should not repeat. Set `tex.wrapS=THREE.ClampToEdgeWrapping`? Simpler create texture and then adjust. We'll create `makeCanvasTexture` with optional repeat. For rocket, no repeat, use clamp. But if wrap is repeat, and map repeated by UV 0..1 no issue. Fine. But if texture is applied to cylinder, the UV wraps once; repeat doesn't matter. Use repeat for ground.

Need no external assets. Canvas textures.

Need perhaps `MeshStandardMaterial` with `map` from CanvasTexture; color space set. Need `roughness` and `metalness`.

Need generate ground texture with vegetation. We can draw random noise. Code:
```
function createGroundTexture(): THREE.CanvasTexture {
 const c=... 512x512; const ctx...
 ctx.fillStyle = '#5d6b42'; fillRect.
 for (let i=0;i<1600;i++) {
   const x=Math.random()*512; const y=...
   const r=Math.random()*10+2;
   ctx.fillStyle = Math.random()<0.5 ? 'rgba(90,120,60,0.6)' : 'rgba(60,80,45,0.6)';
   ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
 }
 // dry patches
 ...
 return tex.
}
```
Need texture repeat set 12. But ground plane 6000x6000, repeat 8 means each tile ~750m; okay.
- Concrete texture: gray, noise, cracks. Use repeat 4.
- Ocean texture: blue waves, maybe repeat 20 on plane? The ocean plane huge; repeat maybe 20.
- Earth texture: use no repeat (sphere UV). Need canvas 2048x1024. Draw ocean fill, random continents. Use deterministic? Not. For a globe, if random blobs, okay. Draw clouds white. Use no repeat? Sphere UV wraps once. Set wrapS repeat maybe not. For sphere, texture maps around; if no repeat, fine. If wrap Repeat, at seam maybe. Use clamp? Actually SphereGeometry UV wraps u 0..1; clamp is fine. But if texture at 0..1, no issue. Use `wrapS=THREE.ClampToEdgeWrapping`. Good.
- Rocket texture: clamp.

Need maybe create normal maps? No.

Need "physically based materials" — use MeshStandard/Physical. For ocean maybe MeshPhysicalMaterial with clearcoat? Could use MeshStandard. Fine.

Need "launch photograph not diagram" — good.

Need perhaps use `renderer.physicallyCorrectLights`? In newer Three, default true? Not needed. `THREE.WebGLRenderer` has `physicallyCorrectLights`? Removed? Avoid.

Need `renderer.shadowMap.type = THREE.PCFSoftShadowMap`. Good.

Need camera: `PerspectiveCamera(55, aspect, 0.1, 1e9)`. Near 0.1, far maybe huge. At high altitude, Earth radius. Use far 1e9. With camera near 0.1 and far 1e9, depth precision issues near ground: maybe okay. The sky sphere radius 2e8, far >. Need far 1e9. But large depth range 0.1..1e9 could cause z-fighting? Possibly. Use near 1, far 1e9. Camera near rocket at distance 100m; near 1 okay. But at ground, objects at 1m. Fine. Use PerspectiveCamera(55, aspect, 0.5, 2e9). The sky sphere radius 5e8, far 2e9. Good. Stars radius 5e7. Earth radius. Fine.
- Depth precision with 1e9 and near 0.5 maybe okay. Could use near 1. Launch pad top; camera 131m away. Fine. Use near 1.
- Star points far 5e7. Fine.

Need sky dome radius maybe 1.5e9? far 2e9. Use 1e9. Camera at alt up to 300km, inside. Good.
- Sky shader `vWorldPos` from sphere; camera inside. The direction to sphere. Fine.
- But if camera at high alt 143km, sky sphere radius 1e9, fine.

Need Earth sphere radius 6.371e6 and center at y=-R. Camera at high alt 143km; distance to Earth surface 143km; Earth sphere top. Good. But Earth sphere with radius 6e6 and camera near rocket at 143km, the horizon from camera perhaps. The sphere appears. Good.

Need local ground plane size 6000; at high alt, it's far below and small. The Earth sphere texture maybe visible. Good.

Need perhaps use earth sphere with atmosphere: at low camera, the Earth sphere may show through ocean? It is under. Fine.

Potential issue: The Earth sphere's texture includes continents; at high altitude, the local view at 143km near Cape Canaveral, we see a large portion of Earth. The texture should show Florida coast. We can draw a coastline. But random. Fine.

Need "Atlantic Ocean on the horizon behind the pad" - local ocean plane. At high altitude, Earth texture has ocean. Good.

Need "roads and low buildings around it" - local.

Need "lightning-protection masts" - four lattice.

Need "flame trench" - create dark trench. Good.

Need "physical model not animation" - physics integration.

Need maybe no OrbitControls. Fine.

Need "state().speed returns current value" - speed property.

Need "reset clears viewer's choice" - we reset viewerSpeed = null. But if UI button pressed after reset, viewerSpeed set. Good.

Need "viewer chose a speed: keys 1,2,3 (and three buttons) set x1,x10,x30." Implement keys mapping. Need maybe keys '1','2','3'. Good.

Need "speed is the time scale. It is 1 for liftoff (t<10 s) and then 10" - our playback speed. Good.

Need "render loop calls step(min(delta,1/30) * speed) when not paused." We implement exactly: `const delta = Math.min(clock.getDelta(), 1/30); ... rocketSim.step(delta * rocketSim.playbackSpeed());` Good. Need if paused, no step.
- But if `clock.getDelta()` returns huge first frame? Use elapsed. Fine.
- Need call `renderer.setAnimationLoop(animate)`. Good.

Need update visual using `state()` after step. Need if paused, t stays. Good.

Need `__ready` after first frame. In animate after composer render. Good.
- But if first frame is before `__rocket`? No.

Need maybe call `renderer.render` once before animation? `setAnimationLoop` handles. First frame. Good.

Need `window as any` casting.

Need use `document.body.appendChild(renderer.domElement)`. Set style. Good.

Need overlay and buttons appended to body. Fine.

Let's think about TS strict issues.

Imports: `import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';` TS may not have declaration? Usually three's addons have .d.ts? The package `three` includes types for addons? In many setups, importing `three/addons/...` with TypeScript and `@types/three` maybe works. The prompt says compile with `tsc --strict` zero errors. The imports may be recognized if using three's types. Fine.

Need `new THREE.Vector2(window.innerWidth, window.innerHeight)`.
`composer.addPass(new RenderPass(scene, camera));` camera type PerspectiveCamera. Fine.
`bloomPass.resolution.set(...)` maybe type. Let's use `(bloomPass as any).resolution.set(w,h)`? But any is okay. Better:
```
bloomPass.resolution.set(w, h);
```
If property missing, TS error. Let's verify UnrealBloomPass type. In three/examples/jsm/postprocessing/UnrealBloomPass.d.ts? I think class has `resolution: Vector2`. It does. Use. 
- EffectComposer `setSize(w,h)` and maybe `setPixelRatio`? It accepts. Fine.

Potential issue `THREE.MathUtils.smoothstep` type accepts number. Use.

Need `MeshStandardMaterial` map with CanvasTexture. Fine.

Need `CanvasRenderingContext2D` get context. Use helper.

Need `THREE.CanvasTexture` types. Fine.

Need `InstancedMesh` setMatrixAt. Use `const dummy = new THREE.Object3D();`.
- For bushes, use `SphereGeometry(1,8,6)`. Instances with random scale. Use mesh count. Need set castShadow maybe. `bushes.castShadow = true; bushes.receiveShadow = true;`. instanced mesh supports. Fine.
- Use random positions around land but not on pad? Need avoid pad. Filter positions with distance from pad > 50. Loop count 200. Use `while`? Use for with random and if distance < 50 continue. But count fixed; if skip, count less? We can set count to 260 and generate all, with many near pad? Fine. Could make bushes around pad but not under. Use positions x,z random [-2500,2500] except within pad radius 50. If within, set to outside. Use `Math.random()*5000-2500`. Good.
- Need avoid ocean: land z from -2000 to4000. Use z random [-1800,3800]. Good.
- Position y = scale*0.5? Since sphere radius 1, position y = scale*0.5? Actually sphere centered at y=scale/2? If scale random 1-3, set y=scale*0.5. Good. Use dummy.position.set(x, scale*0.5, z); dummy.scale.set(scale, scale*0.7, scale); dummy.updateMatrix(); setMatrixAt.
- Use green material. Add some brown? Could use two materials? Simple.

Need buildings. Create function `addBuilding(x,z,w,d,h,c)`. Use BoxGeometry. Need cast/receive. Add windows? Could add small dark boxes on front maybe. No.

Need road. Use `BoxGeometry(1400, 0.08, 12)` at position (-800,0.04,55). But land plane at y=0.01. Road top at 0.08. Good. Add a second road maybe from pad to buildings. Fine.
- Use `MeshStandardMaterial({color:0x303235, roughness:0.9})`.

Need pad pad. Use `CylinderGeometry(45,45,0.8,8)`. Position y=-0.4. Top y=0. `receiveShadow`. `castShadow`? Maybe.
- Need concrete texture repeat. `concreteTex.repeat.set(4,4)`? For cylinder, texture maps around; repeat maybe wraps. Set.
- Add trench: `BoxGeometry(12,0.25,30)` at y=0.12, color dark concrete. It sits on pad. Maybe not a trench. Could add `BoxGeometry(10,0.4,26)` at y=-0.1? Hmm. Use a dark strip on top. Fine.
- Add pad edge ring? Maybe not.

Need "flame trench" perhaps use two side blocks leaving a channel. Could create a trench as a dark rectangular box at center, plus maybe raised side walls. `BoxGeometry(10,0.8,28)` at y=-0.4? Top y=0? Hmm. Let's create pad top y=0, dark trench strip at y=0.02. Good enough visually.

Need launch tower masts. Use helper `beamBetween` with material. Need create materials:
```
const metalMat = new THREE.MeshStandardMaterial({color:0x8a8f92, roughness:0.5, metalness:0.6});
```
For beams.

`function addBeam(p1: THREE.Vector3, p2: THREE.Vector3, radius: number, material: THREE.MeshStandardMaterial): THREE.Mesh` returns mesh. Need add to group. In strict, no implicit.
```
function createBeam(p1, p2, radius, material): THREE.Mesh {
 const dir = new THREE.Vector3().subVectors(p2,p1);
 const length = dir.length();
 const geo = new THREE.CylinderGeometry(radius, radius, length, 6);
 const mesh = new THREE.Mesh(geo, material);
 mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
 mesh.castShadow = true;
 mesh.receiveShadow = true;
 return mesh;
}
```
Need `p1.add(p2)`? `mesh.position.copy(p1).add(p2).multiplyScalar(0.5)` works: copy p1 then add p2 then multiply. Good.
- Use `dir.clone().normalize()`. Good.

`function buildLatticeTower(centerX, centerZ, height, baseWidth, levels)`:
```
const group = new THREE.Group();
const half = baseWidth/2;
const corners = [-half,-half etc.]
// vertical beams
for corners: p1=(cx+dx,0,cz+dz), p2=(cx+dx,height,cz+dz)
group.add(createBeam(...))
// cross bars at levels
for i=1..levels:
 const y=height*i/levels;
 // horizontal along x at z=±half
 ...
 // diagonals
```
Need maybe tower narrower at top? Use simple. 
- Launch tower height 60, width 4. BaseWidth=4.
- Lightning masts height 80, width 3. Use same.

Need add umbilical arms. Use beams from tower side to rocket. At y=30: from (-5.5,30,0) to (0,30,0)? Actually the tower center at x=-6; rocket center x=0. Use beam from (-6,30,0) to (0,30,0) with radius 0.18. Add at y=20 and 40. Good.
- Add a small vertical pipe at tower? Fine.

Need rocket group model. Let's compute positions precisely:
- rocketGroup local base at y=0. Then:
  - engine section dark cylinder height 6, center y=5, radius 1.85. Bottom y=2.
  - Add bottom ring? `CylinderGeometry(1.85,1.85,0.4)` at y=1.9 maybe.
  - nozzles: 9 nozzles. Use dark metal. Positions y=1.0 (center). Each nozzle height 1.2, top y=1.6, bottom y=0.4. That's below engine section? engine bottom y=2. Hmm nozzles should attach at bottom of engine section y=2 and extend down to 0.4. So nozzle cylinder height 1.8, center y=1.1 (from 0.2 to2.0). Good. Use height 1.8.
  - Main body: cylinder height 47, center y=31.5 (from8 to55).
  - Interstage dark: height 2, center y=56 (55 to57).
  - second stage white: height 6, center y=60 (57 to63).
  - fairing: height 7, radiusBottom=1.85, radiusTop=0.45, center y=66.5 (63 to70).
  - nose tip maybe small cone at y=70? Could skip. 
  - Add a black band at y=55-57. Good.
  - Add engine section dark.
- Add a white body map. For main body and second stage, use whiteMat with map? Main body map includes flag/lettering. Second stage maybe whiteMat no map? Use whiteMat. For fairing, use whiteMat. 
- Add vertical seam lines maybe add thin boxes? Not needed.
- Add interstage dark. Good.
- Add a black band on main body via texture.
- Add a base plate: `CylinderGeometry(1.85,1.85,0.3)` at y=2.1? Fine.

Need maybe `rocketGroup` add flame group. The flameGroup is child; no need separate.

Need engine nozzles positions:
- 8 around radius 1.15, angles 0..2π; one center. Use `CylinderGeometry(0.22,0.32,1.8,12)`. Positions:
  - center at (0, 1.1, 0).
  - ring: for i=0..7 angle i*π/4? Wait 8 engines around plus center = 9. Use radius 1.1. 8 at angles i*π/4. x=cos, z=sin. 
- Material nozzleMat = MeshStandardMaterial({color:0x333333, roughness:0.4, metalness:0.9}). 
- Add small inner nozzle? Fine.

Need flame group. Let's create:
```
const flameGroup = new THREE.Group();
rocketGroup.add(flameGroup);
flameGroup.position.set(0, 1.2, 0); // at nozzle exit? Maybe engine nozzle bottom y=0.2; use 0.2.
```
Maybe use position y=0.2. But if rocketGroup base at alt=0, flame starts at y=0.2 above pad. Good.
- Create inner cone length 12, radius 1.4? Let's create geometry with apex at 0 and base down. `ConeGeometry(2.2, 12, 32, 1, true)`? ConeGeometry apex at top. If position y=-6, apex at y=0? Yes if height 12, apex at +6 from center; position y=-6 => apex at 0. Good. But `ConeGeometry(radius, height)`: base at -height/2, apex at +height/2. Position y=-height/2 -> apex at 0, base at -height. Good.
- Inner: radius 1.0, height 10, position y=-5. Additive white. 
- Outer: radius 2.8, height 22, position y=-11. Additive orange.
- Add core sprite? Maybe. A point light.
- Mach diamonds: Create rings at y=-4, -8, -12? Use `TorusGeometry(1.1,0.08,8,32)` rotated x=π/2 (horizontal). Material additive white opacity 0.8. Positions. But ring should be larger as plume expands. Add to flameGroup. 
- Add flames flicker scaling:
```
const active = t < BURN ? 1 : Math.max(0, 1-(t-BURN)/6);
const flicker = 0.8+0.2*Math.sin(elapsed*40);
flameGroup.scale.set(1 + alt/10000, 1 + alt/10000, 1 + alt/10000)? 
```
Actually scale x,z with widening; y with length. Use `flameGroup.scale.set(1 + Math.min(alt/30000, 1.5), 1 + Math.min(alt/8000,6), 1 + Math.min(alt/30000,1.5))`. At high alt, length factor 6. Good.
- But flameGroup's geometry local; scaling y stretches positions. Fine.
- Need if burn ended, `flameGroup.visible = active >0`. We can set materials opacity maybe. The flame group scale and visible. 
- Light intensity using active. Good.

Need create flame shader? Use basic additive materials. But opacity of inner cone could be bright. Need "blinding white-yellow core fading to orange". Add inner cone white, outer orange. Good.

Need Mach diamonds maybe not visible after burn. Fine.

Need plume `cone` inside rocket group, moving. At high altitude, plume grows. Good.

Need contrail trail at high altitude. The trail uses rocket base. At t=200, trail long. Need trail line material additive? Use `LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.25, depthWrite:false, fog:false})`. But LineBasicMaterial has `fog` property? Mesh materials have `fog`. LineBasicMaterial has `fog`? I think yes. Use. Need `blending: THREE.AdditiveBlending`? Contrail white, normal. Use `transparent`.
- Need geometry: create `lineGeo` each frame with `setFromPoints`. Use `new THREE.Line(geom, material)`. We need update. Add to scene. But if trail length < 2, line geometry with points less than 2 may error? `BufferGeometry.setFromPoints` with 1 point okay but draws no line. Fine.
- At high altitude, trail line points huge; maybe. 
- Need maybe contrail also "stays in the sky and drifts slowly". The trail drawn from trail points; it stays. "drifts slowly" can offset points based on elapsed? But trail points are fixed world positions; we could add slight lateral drift to the line by modifying x with elapsed? Requirement trail array points physical; line should be drawn from trail points. Drift not specified for trail? "contrail stays in the sky and drifts slowly." Could optionally create line with a slight time-based lateral offset? But then not directly trail points? Could add a second line? Maybe not necessary. We can set line geometry from trail points and apply a slight `position.x += Math.sin(elapsed)*...`? But trail should stay. "drifts slowly" maybe just camera motion. We can leave.

Need "the contrail stays in the sky and drifts slowly." Could animate trail line with a small lateral drift based on elapsed, but use trail points as base. We can create a line from trail points with offset `drift = sin(elapsed*0.5)*small` to x? But at 100km, small. Hmm. Use trail line material. Fine.

Need smoke shader. Let's craft exact code.

```
function createSmokeTexture? 
```
Maybe use CanvasTexture for soft sprites? Custom shader simpler. But need "many soft particles or sprites" - points with shader qualifies. Need include noise in fragment. Use gl_PointCoord.

Smoke point geometry:
```
const smokeCount = 520;
const smokePositions = new Float32Array(smokeCount*3);
const smokeSizes = new Float32Array(smokeCount);
const smokeAlphas = new Float32Array(smokeCount);
const smokeSeeds = new Float32Array(smokeCount); // for update
const smokeBase = new Float32Array(smokeCount*2); // initial ground x,z
for i...
```
Need create `BufferAttribute` for `aSize` and `aAlpha`. For update, we need positions and alpha. In shader material, attributes:
```
const smokeGeo = new THREE.BufferGeometry();
smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions,3));
smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(smokeSizes,1));
smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(smokeAlphas,1));
```
Shader:
```
const smokeMat = new THREE.ShaderMaterial({
 vertexShader: `
 attribute float aSize;
 attribute float aAlpha;
 varying float vAlpha;
 void main() {
   vAlpha = aAlpha;
   vec4 mv = modelViewMatrix * vec4(position, 1.0);
   gl_PointSize = aSize * (700.0 / max(1.0, -mv.z));
   gl_Position = projectionMatrix * mv;
 }
 `,
 fragmentShader: `
 varying float vAlpha;
 void main() {
   vec2 c = gl_PointCoord - vec2(0.5);
   float d = length(c);
   float a = smoothstep(0.5, 0.0, d);
   float n = 0.55 + 0.45 * (0.5 + 0.5 * sin(gl_PointCoord.x * 16.0 + gl_PointCoord.y * 9.0));
   gl_FragColor = vec4(vec3(0.95, 0.95, 0.93), a * n * vAlpha);
 }
 `,
 transparent: true,
 depthWrite: false,
 blending: THREE.NormalBlending
});
```
Need `aAlpha` attribute name; okay.
- In update, positions; alpha based on age and flicker. `aAlpha = Math.min(0.55, 0.3 + 0.25 * ...)` etc. At t<0, zero. 
- We need set `smokeGeo.attributes.aAlpha.needsUpdate = true`? The attributes `aAlpha` and `position`. Create `smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(smokeAlphas,1));` and then update arrays. Need set needsUpdate each frame or set array. For positions: `smokeGeo.attributes.position.needsUpdate = true;` and `smokeGeo.attributes.aAlpha.needsUpdate = true;`. But `smokeGeo.attributes` type maybe indexed; use `smokeGeo.attributes.position`? Type `BufferGeometry` has `attributes` object; TS maybe any? Could store attributes separately:
```
const smokePosAttr = new THREE.BufferAttribute(smokePositions,3);
const smokeAlphaAttr = new THREE.BufferAttribute(smokeAlphas,1);
smokeGeo.setAttribute('position', smokePosAttr);
smokeGeo.setAttribute('aAlpha', smokeAlphaAttr);
...
smokePosAttr.needsUpdate = true;
smokeAlphaAttr.needsUpdate = true;
```
Better. The `BufferAttribute` has `needsUpdate`. Good.
- Size attribute maybe static. `aSize` array static. Set.
- Update alpha array each frame. Good.
- Need at t<0? t never negative. At t=0, alpha zero. At t=0.5, starts. Use `const age = Math.max(0, t - 0.6); const active = Math.min(1, age / 1.5);` 
- For each i:
```
const seed = smokeSeeds[i];
const angle = seed * Math.PI * 2;
const baseR = smokeBase[i]*? 
```
Let's define base positions randomly:
```
const rad = 4 + Math.random()*12;
const angle = Math.random()*Math.PI*2;
const bx = Math.cos(angle)*rad;
const bz = Math.sin(angle)*rad + (Math.random()-0.5)*6;
smokeBaseX[i]=bx; smokeBaseZ[i]=bz;
```
At t age, cloud expands:
```
const spread = 6 + age * 9;
const x = bx + Math.cos(angle) * (age * 7) + Math.sin(age*0.7+seed*6.28)*3;
const z = bz + Math.sin(angle) * (age * 5) + Math.cos(age*0.5+seed*6.28)*3;
const y = 0.5 + Math.max(0, age - 1.0) * 1.2 + seed*3? 
```
Need smoke rises: y = 1 + age*0.8 + Math.sin(angle+age)*? But if age huge, y huge, still far below. At t=20, smoke y ~18m, okay. The rocket at alt maybe thousands; smoke on pad. Good.
- Need cloud "roll sideways out of flame trench along ground then rise." We can split: first ages spread horizontal, then y increases. `const rise = Math.max(0, age - 2.0) * 1.5; const y = 0.5 + rise + Math.sin(seed*10)*0.5;`
- Smoke around pad not too high. Good.
- Size `aSize` = maybe 4 + Math.random()*10. At age, maybe grow: but size static. Could update size too? If cloud expands, sizes can grow. Use update `smokeSizes[i] = 4 + age*1.0 + Math.random()*...` but size attribute needs update. Could update every frame. Let's do. But if time huge, sizes huge. Maybe clamp. Use `const size = 3.5 + Math.min(age, 30)*0.8 + Math.random()*4;` at age 30 => size ~40m. Good. At high altitude not visible. Update size attribute. 
- Alpha: `const alpha = (0.25 + 0.35*seed) * Math.min(1, age/1.0) * (0.6+0.4*Math.sin(elapsed*2+seed*10));` Need flicker. Use elapsed. But if paused, flicker still. Fine.
- Smoke material opacity via alpha. Good.
- Need smoke at ground: Use `scene` add points. 
- At t high, smoke points maybe still at pad, but with huge spread (age 200 -> spread 1800m). Fine. The camera high, not visible. 
- Since smoke uses t and elapsed? Use both: evolution from t, flicker from elapsed. Good.

Need flame active and smoke active. At t=0, smoke none; flame active. Good.

Need maybe "large billowing white steam and smoke clouds". Points alpha white. Good.

Need maybe add a second smoke layer with bigger particles? Could use one system. Fine.

Need sky stars. Code:
```
const starCount=2400;
const starPositions = new Float32Array(starCount*3);
for i: random on sphere radius 4e7:
 const theta=Math.random()*Math.PI*2; const phi=Math.acos(Math.random()*2-1); 
 x = Math.sin(phi)*Math.cos(theta)*radius; y=Math.cos(phi)*radius; z=...
```
Need maybe not put stars below y<0? All sphere. Fine.
- `const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions,3)); const starMat = new THREE.PointsMaterial({color:0xffffff, size:2.2, sizeAttenuation:false, transparent:true, opacity:0, depthWrite:false, fog:false}); const stars = new THREE.Points(starGeo, starMat); scene.add(stars);`
- Update `starMat.opacity = THREE.MathUtils.smoothstep(alt, 70000, 100000) * 0.95;` But at low altitude, 0. At high. Need also maybe fade at very high? no.
- `sizeAttenuation:false` type? PointsMaterial has property. Good.
- Need star material transparent. Good.

Need sky mesh:
```
const skyGeo = new THREE.SphereGeometry(1.0e9, 32, 16);
const skyMat = new THREE.ShaderMaterial({... side: THREE.BackSide, depthWrite:false, uniforms:...});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.renderOrder = -1000;
scene.add(sky);
```
Need vertex shader:
```
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Actually in shader, `modelMatrix` available. Use `worldPosition`.
- Fragment:
```
uniform vec3 uCamPos;
uniform float uAlt;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
varying vec3 vWorldPos;
void main() {
  vec3 dir = normalize(vWorldPos - uCamPos);
  float h = dir.y;
  float hor = smoothstep(0.0, 0.25, h); // 0 horizon, 1 above
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.65, h));
  // haze at horizon
  col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.35, h)) * 0.65);
  // sun glow
  float s = max(dot(dir, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(s, 5.0) * 0.5;
  // fade to black at altitude
  float fade = smoothstep(0.0, 100000.0, uAlt);
  col = mix(col, vec3(0.0), fade);
  gl_FragColor = vec4(col, 1.0);
}
```
Need `uHaze` maybe include. 
- At high altitude, sky black. However if fade=1, sun glow also mixed to black. Good.
- At ground, horizon pale. Need color values: horizon = (0.72,0.88,0.98), zenith = (0.14,0.36,0.72), haze = (0.82,0.9,0.98), sunColor=(1.0,0.9,0.65). With tone mapping? Sky shader colors not tone-mapped? Actually renderer tone mapping applies to materials? ShaderMaterial output is tone-mapped? Three.js applies tone mapping in fragment? It may not automatically if shader. The shader doesn't include tone mapping. Renderer's tone mapping only for built-in materials? In WebGLRenderer, tone mapping is applied in shader only for standard materials. Custom ShaderMaterial gl_FragColor goes directly? Actually renderer's `toneMapping` is applied in materials' fragment shaders via tone mapping chunk; custom shader no. So sky colors are linear values displayed. Fine. Could include `#include <tonemapping_fragment>`? Not necessary. But bloom will affect. Keep.
- Need `uCamPos` update. Good.

- Sky shader `uniforms` with `uAlt`, `uCamPos`, `uSunDir`.
- Need set `uCamPos.value.copy(camera.position)` each frame. Since camera moves. Good.
- Stars not affected by sky? Sky drawn first. Good.

Need Earth texture. Let's write:
```
function createEarthTexture(): THREE.CanvasTexture {
 const w=2048,h=1024; canvas...
 ctx.fillStyle = '#1f6f8e'; fill.
 // draw continents with green blobs
 for (let i=0;i<20;i++) {
   ctx.beginPath();
   const cx=Math.random()*w; const cy=...;
   // draw irregular polygon around
   ctx.fillStyle = i%2 ? '#3d6d40' : '#587b3d';
   ctx.globalAlpha = 0.85;
   for (let j=0;j<12;j++) {
      const ang = j/12*Math.PI*2;
      const r = Math.random()*80+40;
      const x = cx + Math.cos(ang)*r*1.4;
      const y = cy + Math.sin(ang)*r*0.8;
      if (j==0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
   }
   ctx.closePath(); ctx.fill();
 }
 // clouds
 ctx.globalAlpha=0.25; ctx.fillStyle='#fff';
 for ... ellipse.
 // maybe coastline/land.
 ...
 const tex = new THREE.CanvasTexture(canvas); tex.colorSpace=SRGB; wrapS=Clamp...
 return tex;
}
```
Need draw continents at equatorial; fine. Use `ctx.ellipse` available. Good.
- At high altitude, this texture maybe enough.

Need ocean texture? Could use color. Maybe create simple ocean texture:
```
ctx.fillStyle '#1a5f78'; for i 5000 random white strokes.
```
Then material with map. But texture on huge ocean plane. Use repeat 20. Good.
- Need set `oceanTex.repeat.set(20,20)`.
- At horizon, fog. Good.

Need concrete texture with cracks. Good.

Need ground texture with vegetation. Good.

Need Rocket texture. Use canvas 1024x512. Draw white background, gray panel lines, dark band at maybe y=360. Flag at (120,180). Lettering "FALCON 9" at (650,230). Maybe "SPACE" etc. Use `ctx.font='bold 42px sans-serif'`. Good. Need maybe not draw band too dark because separate interstage. Use a dark band at y=380 height 20. Fine.

Need "flag and lettering drawn on a canvas texture". We draw. Good.

Need "physically based materials" for rocket body. Add `envMap`? No external. Could use `scene.environment`? No. We can set metalness and roughness. Fine.

Need maybe use `MeshPhysicalMaterial` for rocket body with clearcoat? "physically based" means MeshStandard. Use `MeshStandardMaterial`.

Need use ACES tone mapping. Good.

Need maybe add `renderer.outputColorSpace = THREE.SRGBColorSpace` and `tex.colorSpace = SRGB`. Good.

Need update overlay. Let's code.

Potential TS strict issue: `THREE.MathUtils.smoothstep` perhaps not exist? It does: `MathUtils.smoothstep(x, min, max)`. Yes.

Potential TS issue: `THREE.Fog` constructor takes `number` color? Use `new THREE.Fog(0xb9d6e8, 800, 250000);`. Good.

Potential TS issue: `MeshStandardMaterial` property `fog`? Default true. Fine.

Potential TS issue: `SpriteMaterial` not used.

Potential TS issue: `PointLight` intensity. Good.

Potential TS issue: `renderer.setAnimationLoop(animate)` type expects `(time: number) => void` or null. We define `function animate(): void`. It accepts? `setAnimationLoop` callback signature `(time: number) => void`. Function with no params is assignable? In TS strict, a function with fewer parameters is assignable to one with more? Yes, a function with fewer params can be assigned to one with more? Actually parameter bivariance? For function types, source with fewer parameters is assignable. `animate` no args works. Fine. Could define `function animate(time: number): void` and ignore. But no need. Use `function animate(): void`. Fine.
- Need clock getDelta. In animate, no timestamp. Fine.

Need `paused` property check. Good.

Need perhaps set `rocketSim.paused = false`.

Need build scene. Let's outline main code structure:

1. Imports.
2. Renderer setup, camera, scene.
3. Texture helpers.
4. Materials.
5. Environment (sky, stars, Earth, ground, ocean, shore, roads, buildings, bushes).
6. Launch pad/tower/masts.
7. Rocket model.
8. Flame group, smoke, trail.
9. Physics class.
10. Camera update function.
11. UI overlay and speed controls.
12. Animation loop.
13. Expose.

Need ensure order: create `viewerSpeed` before Rocket class. Good.

Let's write code carefully.

Detailed code:

```
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const DRY_MASS = 220000;
const BURN_TIME = 200;

let viewerSpeed: number | null = null;

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 1, 2e9);
camera.position.set(70, 22, 110);
camera.lookAt(0, 35, 0);

scene.fog = new THREE.Fog(0xb9d6e8, 800, 250000);

...
```

Need `document.body.style` works. Good.

Texture helper:
```
function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('2D context unavailable');
 return ctx;
}
```
Then functions.

```
function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: boolean = false): THREE.CanvasTexture {
 const c = document.createElement('canvas'); c.width=width; c.height=height; const ctx = get2DContext(c); draw(ctx);
 const tex = new THREE.CanvasTexture(c);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.anisotropy = 4;
 if (repeat) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; } else { tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; }
 return tex;
}
```
Need `THREE.ClampToEdgeWrapping` exists. Good.
- For `tex.repeat` set outside.

Concrete texture:
```
const concreteTex = canvasTexture(512,512,(ctx)=>{
 ctx.fillStyle='#8f8f86'; ctx.fillRect(0,0,512,512);
 for (let i=0; i<7000; i++) {
   const x=Math.random()*512, y=Math.random()*512;
   const alpha=Math.random()*0.25;
   ctx.fillStyle = `rgba(${...},${alpha})`; // Need string
   ctx.fillRect(x,y,1+Math.random()*2,1+Math.random()*2);
 }
 ctx.strokeStyle='rgba(50,50,50,0.35)'; ctx.lineWidth=1;
 for (let i=0;i<20;i++){ ctx.beginPath(); ctx.moveTo(...); ctx.lineTo(...); ctx.stroke(); }
}, true);
concreteTex.repeat.set(3,3);
```
Need use `ctx.fillStyle = 'rgba(60,60,55,0.2)'` etc. Avoid template heavy.

Ground:
```
const groundTex = canvasTexture(512,512,(ctx)=> {
 ctx.fillStyle='#526b3d'; fillRect;
 for (let i=0;i<1800;i++){ const x=...; const y=...; const r=Math.random()*8+1; ctx.fillStyle = Math.random()<0.5 ? 'rgba(70,100,55,0.7)' : 'rgba(90,110,60,0.5)'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
 // dry patches
 ctx.fillStyle='rgba(150,130,80,0.25)'; for...
}, true);
groundTex.repeat.set(12,12);
```
Need random arcs.

Ocean:
```
const oceanTex = canvasTexture(512,512,(ctx)=>{
 ctx.fillStyle='#1f6e8c'; fillRect;
 for (let i=0;i<600;i++){ ctx.strokeStyle='rgba(180,230,255,0.15)'; ctx.lineWidth=1+Math.random()*2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.random()*60,y+Math.random()*10); ctx.stroke(); }
}, true);
oceanTex.repeat.set(20,20);
```
But ocean plane 100000 x100000, repeat 20 each 5000m. Fine.
- Ocean material `MeshStandardMaterial({map:oceanTex, color:0x8bc6d8, roughness:0.35, metalness:0.1})`? If map includes blue, color multiply. Use color 0xffffff. Maybe `color:0xffffff`. Good. Actually map colors. Use roughness 0.3. 
- Ocean should be large; maybe a plane.

Earth texture:
```
const earthTex = canvasTexture(2048,1024,(ctx)=>{
 ctx.fillStyle='#1b5d7d'; fillRect;
 // continents
 for (let i=0;i<26;i++){ ... }
 // clouds
 ctx.globalAlpha = 0.25;
 for (...) { ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.ellipse(...); ctx.fill(); }
 ctx.globalAlpha=1;
}, false);
```
Need careful with globalAlpha reset.
- Use random blob. Fine.

Rocket texture:
```
const rocketTex = canvasTexture(1024,512,(ctx)=>{
 ctx.fillStyle='#f7f7f4'; fillRect;
 // panel seam
 ctx.strokeStyle='rgba(160,160,160,0.35)'; ctx.lineWidth=2; for(... vertical lines)
 // dark band
 ctx.fillStyle='#1f1f1f'; fillRect(0,380,1024,22);
 // flag
 ctx.fillStyle='#203c86'; ctx.fillRect(140,130,120,75);
 ctx.fillStyle='#d23b3b'; for stripes...
 ctx.fillStyle='#fff'; ...
 // lettering
 ctx.fillStyle='#222'; ctx.font='bold 42px sans-serif'; ctx.textAlign='center'; ctx.fillText('FALCON 9', 650, 250);
 // maybe "SPACE"...
}, false);
```
Need flag stripes. Draw 13 stripes? Simpler 7 red stripes and blue canton. Use loops. Good.

- Rocket texture map on main body. Since the body is white, map white. Good.

Materials:
```
const concreteMat = new THREE.MeshStandardMaterial({map: concreteTex, roughness:0.85, metalness:0.0});
const groundMat = new THREE.MeshStandardMaterial({map: groundTex, roughness:1.0, metalness:0.0});
const oceanMat = new THREE.MeshStandardMaterial({map: oceanTex, roughness:0.3, metalness:0.1});
const earthMat = new THREE.MeshStandardMaterial({map: earthTex, roughness:0.8, metalness:0.0});
const whiteMat = new THREE.MeshStandardMaterial({map: rocketTex, roughness:0.55, metalness:0.1});
const interstageMat = new THREE.MeshStandardMaterial({color:0x1c1c1c, roughness:0.6, metalness:0.5});
const metalMat = new THREE.MeshStandardMaterial({color:0x8b9094, roughness=0.45, metalness=0.7});
const nozzleMat = new THREE.MeshStandardMaterial({color:0x3a3d40, roughness=0.4, metalness=0.9});
const buildingMat = ...
```

Need `const rocketTex` colorSpace with repeat false. Fine.

Sky:
```
const skyMat = new THREE.ShaderMaterial({
 uniforms: {
  uAlt: { value: 0 },
  uCamPos: { value: new THREE.Vector3(0,0,0) },
  uHorizon: { value: new THREE.Color(0.75,0.9,1.0) },
  uZenith: { value: new THREE.Color(0.10,0.32,0.65) },
  uHaze: { value: new THREE.Color(0.85,0.93,1.0) },
  uSunColor: { value: new THREE.Color(1.0,0.85,0.6) },
 },
 side: THREE.BackSide,
 depthWrite: false,
 ...
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1.0e9, 32, 16), skyMat);
sky.renderOrder = -1000;
scene.add(sky);
```
Need fragment use `uSunDir` not provided. Could use sun direction uniform. Add `uSunDir: {value: new THREE.Vector3(0.5,0.7,0.3).normalize()}`. In fragment use. Good.
- Need color uniform values? `new THREE.Color(0.75,0.9,1.0)` constructor supports RGB. Fine.

Stars:
```
const starCount=2600; ...
const starMat = new THREE.PointsMaterial({
 color: 0xffffff,
 size: 2.4,
 sizeAttenuation: false,
 transparent: true,
 opacity: 0,
 depthWrite: false,
 fog: false
});
``` 
Need maybe `PointsMaterial` has `fog` property? I think yes. If TS complains? `PointsMaterial` definition includes `fog: boolean`. Probably.
- Add stars.

Earth:
```
const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 128, 64), earthMat);
earth.position.set(0, -EARTH_R, 0);
earth.receiveShadow = true; // Does receive? maybe.
scene.add(earth);
```
At low altitude, Earth sphere top at y=0. The local ground plane at y=0.01 covers. Good.
- Maybe `earth.castShadow` false.

Ground:
```
const landGeo = new THREE.PlaneGeometry(6000,6000); landGeo.rotateX(-Math.PI/2);
const land = new THREE.Mesh(landGeo, groundMat);
land.position.set(0, 0.01, 1000);
land.receiveShadow = true;
scene.add(land);
```
Careful: PlaneGeometry default is in XY plane; `rotateX(-Math.PI/2)` makes horizontal. Then position. Good. Use `.rotation.x = -Math.PI/2` instead. Better:
```
const land = new THREE.Mesh(new THREE.PlaneGeometry(6000,6000), groundMat);
land.rotation.x = -Math.PI/2;
land.position.set(0, 0.01, 1000);
```
- Plane extends x,z. Good.

Ocean:
```
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(100000,100000), oceanMat);
ocean.rotation.x=-Math.PI/2; ocean.position.set(0,0.005,-52000); ocean.receiveShadow = true?
```
Ocean maybe receive shadow from land? Fine.
- Shore strip:
```
const shore = new THREE.Mesh(new THREE.BoxGeometry(6000,0.08,6), new THREE.MeshStandardMaterial({color:0xc9b38a, roughness=1}));
shore.position.set(0,0.04,-2000);
```
- But land plane from z=-2000 to4000. Shore at -2000. Good.

Roads/buildings:
```
function addBox(x,y,z,w,h,d,mat)...
```
Need shadow.
Add road `new THREE.Mesh(new THREE.BoxGeometry(1400,0.06,10), roadMat); position(-760,0.03,80);`
Add another road maybe `BoxGeometry(600,0.06,8)` at (120,0.03,300). Fine.
Buildings:
- add at (-650,0,150) etc. Use buildingMat with color variations. `addBuilding(x,z,w,d,h,color)`:
```
const mat = new THREE.MeshStandardMaterial({color, roughness=0.9});
const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
m.position.set(x, h/2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
// roof maybe
const roof = new THREE.Mesh(new THREE.BoxGeometry(w*1.05, 0.3, d*1.05), new THREE.MeshStandardMaterial({color:0x555b5f}));
roof.position.set(x, h+0.15, z); ...
```
Maybe not.
- Add a few windows: small dark boxes. Could skip.

Bushes:
```
const bushGeo = new THREE.SphereGeometry(1, 8, 6);
const bushMat = new THREE.MeshStandardMaterial({color:0x4e6b36, roughness:1});
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 260);
bushes.castShadow = true; bushes.receiveShadow = true;
const dummy = new THREE.Object3D();
for (let i=0; i<260; i++) {
 let x = (Math.random()-0.5)*5200;
 let z = (Math.random()-0.5)*5000 + 1000; // from -1500 to 3500? 
 // avoid pad
 if (Math.sqrt(x*x+z*z) < 60) { x += 80; }
 const s = 1 + Math.random()*2.5;
 dummy.position.set(x, s*0.45, z);
 dummy.scale.set(s, s*0.7, s);
 dummy.rotation.y = Math.random()*Math.PI;
 dummy.updateMatrix();
 bushes.setMatrixAt(i, dummy.matrix);
}
bushes.instanceMatrix.needsUpdate = true;
scene.add(bushes);
```
Need use `bushes.instanceMatrix.needsUpdate = true;` after setting. Good.
- Maybe add some larger trees? no.

Pad:
```
const pad = new THREE.Mesh(new THREE.CylinderGeometry(45,45,0.8,8), concreteMat);
pad.position.set(0,-0.4,0); pad.receiveShadow=true; pad.castShadow=true;
scene.add(pad);
```
Top at 0. Good.
- Add trench:
```
const trenchMat = new THREE.MeshStandardMaterial({color:0x2c2b29, roughness=0.9});
const trench = new THREE.Mesh(new THREE.BoxGeometry(12,0.3,30), trenchMat);
trench.position.set(0,0.16,0); trench.receiveShadow=true;
scene.add(trench);
```
Actually top at y=0.16. Fine.
- Add pad edge? maybe a ring:
```
const padRing = new THREE.Mesh(new THREE.TorusGeometry(45,0.5,8,8), metalMat);
padRing.rotation.x = Math.PI/2; padRing.position.y=0; // torus ring
```
But TorusGeometry default in XY plane, rotation x=π/2 makes horizontal? Torus ring lies in XY; rotate x=π/2 makes XZ. Good. Add. Nice.
- Concrete texture applies.

Tower:
```
function makeBeam(...)...
```
Implement before use.

`buildLatticeTower(cx, cz, height, width, levels)` returns group. It uses `metalMat`. Add to scene.
- Launch tower: `const launchTower = buildLatticeTower(-6.0, 0.0, 60, 4.0, 10); scene.add(launchTower);`
- Lightning masts: positions (35,35), etc. `buildLatticeTower(35,-35,80,3.2,12)`; four.
- Umbilical arms:
```
const armMat = metalMat;
const arm1 = makeBeam(new Vector3(-5.6,28,0), new Vector3(0,28,0),0.16,armMat); scene.add(arm1);
...
```
Need tower center x=-6, rocket x=0. Beam to rocket. Good.
- Add a small vertical arm? Fine.

Rocket model:
```
const rocketGroup = new THREE.Group();
scene.add(rocketGroup);
rocketGroup.position.set(0,0,0);
```
Build parts:
- Engine section:
```
const engineSection = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,6,48), interstageMat); engineSection.position.y=5;
engineSection.castShadow=true; engineSection.receiveShadow=true; rocketGroup.add(engineSection);
```
- Main body:
```
const mainBody = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,47,48), whiteMat); mainBody.position.y=31.5; ...
```
- Interstage:
```
const inter = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,2,48), interstageMat); inter.position.y=56; ...
```
- Second stage:
```
const second = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,6,48), whiteMat); second.position.y=60; ...
```
- Fairing:
```
const fairing = new THREE.Mesh(new THREE.CylinderGeometry(0.45,1.85,7,48,1), whiteMat); fairing.position.y=66.5;
```
Cylinder signature radiusTop=0.45, radiusBottom=1.85, height=7. Good.
- Nose tip:
```
const tip = new THREE.Mesh(new THREE.ConeGeometry(0.45,1.2,32), whiteMat); tip.position.y=70.6; // total 71.2? 
```
But total 70. Maybe fairing from 63 to70, add tip from 70 to70.6. Requirement 70m. We can keep 70. The fairing top radius 0.45 at 70. Add a small rounded cap? Use `new THREE.SphereGeometry(0.45,16,8)`? Hmm. Could add a cone height 1 from 70 to71, making 71. Not necessary. Use exact 70.
- Add black band at bottom of fairing? Maybe:
```
const fairingBand = new THREE.Mesh(new THREE.CylinderGeometry(1.86,1.86,0.4,48), interstageMat); fairingBand.position.y=63; ...
```
- Add vertical fin? no.
- Add nozzles:
```
for (let i=0;i<8;i++) {
 const angle=i*Math.PI/4;
 const n = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.30,1.8,16), nozzleMat);
 n.position.set(Math.cos(angle)*1.18, 1.1, Math.sin(angle)*1.18);
 n.castShadow=true; rocketGroup.add(n);
}
const centerNozzle = ... at (0,1.1,0)
```
- Maybe add engine base plate:
```
const base = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,0.3,48), nozzleMat); base.position.y=2.1;
```
Good.

- Add flag/lettering map. whiteMat has map. Good.

Need maybe `rocketGroup` add flame group:
```
const flameGroup = new THREE.Group();
flameGroup.position.set(0, 0.2, 0);
rocketGroup.add(flameGroup);
```
Need flame geometry. Use cone with position.

Flame materials:
```
const innerFlameMat = new THREE.MeshBasicMaterial({color:0xfff2b5, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
const outerFlameMat = new THREE.MeshBasicMaterial({color:0xff7a2a, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
```
Need `MeshBasicMaterial` not tone mapped? Additive. Fine.

- inner cone:
```
const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(1.2, 12, 32, 1, true), innerFlameMat);
innerFlame.position.y = -6;
flameGroup.add(innerFlame);
```
At group y=0.2, apex at 0.2, base at -11.8. Good.
- outer cone:
```
const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(2.8, 24, 32, 1, true), outerFlameMat);
outerFlame.position.y = -12;
```
apex at 0, base at -24. Good.
- Mach diamonds: `const ringGeo = new THREE.TorusGeometry(1.0,0.08,8,32); const ringMat = new THREE.MeshBasicMaterial({color:0xfff5d0, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false});`
Positions y=-3,-7,-11? Add to flameGroup, rotate x=π/2. Use scale maybe. 
- Add point light:
```
const flameLight = new THREE.PointLight(0xffb25e, 80, 160, 2);
flameLight.position.set(0, -1.5, 0);
flameGroup.add(flameLight);
const flameLight2 = new THREE.PointLight(0xffffff, 30, 80, 2);
flameLight2.position.set(0, -0.5, 0);
flameGroup.add(flameLight2);
```
Point lights in flame group. Their intensity updated. Since PointLight intensity property. Good.
- Need maybe light at pad? The flame light at high altitude doesn't light pad. At liftoff yes. Fine.

Smoke:
Create before animate.

Trail:
```
const trailMaterial = new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.35, depthWrite:false});
trailMaterial.fog = false; // Is fog property exists? LineBasicMaterial has fog property? likely. Use `trailMaterial.fog = false;` strict if property maybe exists. To be safe, `trailMaterial.fog = false` type? I think LineBasicMaterial has `fog: boolean`. yes.
const trailLine = new THREE.Line(new THREE.BufferGeometry(), trailMaterial);
scene.add(trailLine);
```
Need update geometry. In animate:
```
if (rocketSim.trail.length >= 2) {
 const g = new THREE.BufferGeometry().setFromPoints(rocketSim.trail);
 trailLine.geometry.dispose();
 trailLine.geometry = g;
} else { ... }
```
Potential issue disposing geometry every frame heavy but okay. But if trail length large, setFromPoints each frame. Maybe okay? At high speed, maybe 10000 points, but each frame. It could be slow. Better use a dynamic buffer. Let's implement dynamic buffer capacity to be robust.

Max trail points? The simulation can be advanced many times. We can allocate a large capacity and grow if needed. Use a dynamic `Float32Array` and BufferGeometry. This avoids recreating each frame. But if trail length increases, need update buffer. Simpler:
```
let trailCapacity = Math.max(2, rocketSim.trail.length);
const trailPositions = new Float32Array(trailCapacity * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions,3));
trailGeo.setDrawRange(0, rocketSim.trail.length);
```
But capacity may need grow. We can at each frame ensure capacity >= trail.length, if not, create new array and update attribute. Could use a maximum capacity 20000, but if exceeded, drop? Requirement trail array full; line may draw latest. But tests may not care. Let's implement dynamic:
```
function updateTrail(): void {
 const count = rocketSim.trail.length;
 if (count < 2) { trailGeo.setDrawRange(0,0); return; }
 if (trailPositions.length < count*3) {
   const newCap = Math.max(count, 2) * 2;
   trailPositions = new Float32Array(newCap*3);
   trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
 }
 for (let i=0; i<count; i++) {
   const p = rocketSim.trail[i];
   trailPositions[i*3]=p.x; ...
 }
 (trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
 trailGeo.setDrawRange(0,count);
}
```
But `trailPositions` local variable used in closure; can define `let trailPositions = new Float32Array(0);` at module. In updateTrail, if capacity insufficient, update. Need `trailGeo.attributes.position` exists. Use `trailPosAttr` variable? We can create BufferGeometry and attribute at start. If we recreate attribute, need set. Use:
```
let trailPositions = new Float32Array(3 * 2);
const trailGeo = new THREE.BufferGeometry();
const trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);
trailGeo.setAttribute('position', trailPosAttr);
trailGeo.setDrawRange(0,0);
...
function updateTrail() {
 const count = rocketSim.trail.length;
 if (count < 2) { trailGeo.setDrawRange(0,0); return; }
 if (trailPosAttr.count < count) {
    const newCap = Math.max(count, 2);
    trailPositions = new Float32Array(newCap*3);
    trailPosAttr = new THREE.BufferAttribute(trailPositions,3);
    trailGeo.setAttribute('position', trailPosAttr);
    trailGeo.setDrawRange(0,0); // maybe
 }
 ...
 trailPosAttr.needsUpdate = true;
 trailGeo.setDrawRange(0,count);
}
```
But `trailPosAttr` declared const can't reassign; use let. 
```
let trailPosAttr = new THREE.BufferAttribute(trailPositions,3);
```
Then update. Good.
- `BufferAttribute.count` property exists. Use `trailPosAttr.count < count`. Good.
- `trailPosAttr.needsUpdate = true`.
- At count <2, line doesn't draw. Fine.
- Could add initial point? no.

Need update trail after step. If paused, trail unchanged. Fine.

Need update smoke. Use functions.

Need update camera. Need initial camera and transition. Use `THREE.MathUtils.smoothstep(st.alt, 55, 130)`; `smoothstep(x, min,max)` returns. Good.
- Ground camera pos: (70,22,110). Chase offset: (45,20,75). Chase pos = target + offset. Target = (st.x, st.alt+35, 0). Camera position lerp.
- But if rocket x grows, ground camera fixed. At liftoff x=0. Good.
- For transition factor, at alt 0 ->0. At alt 130 ->1. Good.
- Use `camera.position.set(...)`.
- LookAt. Need smooth camera motion. Direct update. Fine.
- Could use `camera.lookAt(target)`.
- At high altitude, chase position = target + offset. Good.

Need camera aspect resize:
```
function onResize() {
 const w = window.innerWidth, h = window.innerHeight;
 camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); composer.setSize(w,h); bloomPass.resolution.set(w,h);
}
window.addEventListener('resize', onResize);
```
Need `onResize` uses renderer/composer/bloom; define after composer. Good. Or in animate? Add event after composer.

Need overlay:
```
const overlay = document.createElement('div');
overlay.style.position='fixed'; overlay.style.left='12px'; overlay.style.top='12px'; overlay.style.padding='8px 12px'; overlay.style.background='rgba(0,0,0,0.55)'; overlay.style.color='#fff'; overlay.style.fontFamily='system-ui, sans-serif'; overlay.style.fontSize='13px'; overlay.style.lineHeight='1.5'; overlay.style.borderRadius='6px'; overlay.style.pointerEvents='none';
document.body.appendChild(overlay);
```
Need text update. Use `overlay.textContent`. But we need show speed and mission data. `overlay.textContent = ...`. Fine.
- Maybe need overlay not block buttons. Buttons at bottom. Good.

Buttons:
```
const controls = document.createElement('div');
controls.style.position='fixed'; ... bottom 12px left 12px; display flex gap; 
const speedOptions: Array<[number, number]> = [[1,1],[2,10],[3,30]];
for (const [key, value] of speedOptions) {
 const btn = document.createElement('button');
 btn.textContent = `x${value}`;
 btn.style...;
 btn.addEventListener('click', () => { viewerSpeed = value; });
 controls.appendChild(btn);
}
document.body.appendChild(controls);
window.addEventListener('keydown', (event: KeyboardEvent) => {
 if (event.key === '1') viewerSpeed = 1;
 else if (event.key === '2') viewerSpeed = 10;
 else if (event.key === '3') viewerSpeed = 30;
});
```
Need maybe update overlay speed after button. Fine.
- Use `Array<[number, number]>` but first tuple item might be key 1. Fine. Label value. Could just use `[1, 1]`. Good.
- Need `event.key` type. KeyboardEvent global. Good.

Need maybe reset clears viewerSpeed. When reset called, overlay speed uses default. Good.

Need animate:
```
const clock = new THREE.Clock();
let firstFrame = true;
const bloomPass = ... // define earlier
const composer = ...
function animate(): void {
 const delta = Math.min(clock.getDelta(), 1/30);
 const elapsed = clock.getElapsedTime(); // Wait getElapsedTime after getDelta maybe? `clock.getElapsedTime()` returns total elapsed since start and can be used. If call after getDelta, fine. But getDelta updates internal elapsed? In Three.Clock, getDelta returns and updates elapsed; getElapsedTime returns. Good.
 const stBefore = rocketSim.state();
 const speed = rocketSim.playbackSpeed();
 if (!rocketSim.paused) {
   rocketSim.step(delta * speed);
 }
 const st = rocketSim.state();
 // update rocket group
 rocketGroup.position.set(st.x, st.alt, 0);
 // update camera
 const target = new THREE.Vector3(st.x, st.alt+35, 0);
 const transition = THREE.MathUtils.smoothstep(st.alt, 55, 130);
 const groundCam = new THREE.Vector3(70,22,110);
 const chaseCam = target.clone().add(new THREE.Vector3(45,20,75));
 camera.position.lerpVectors(groundCam, chaseCam, transition);
 camera.lookAt(target);
 // sky
 skyMat.uniforms.uAlt.value = st.alt;
 skyMat.uniforms.uCamPos.value.copy(camera.position);
 // stars
 starMat.opacity = THREE.MathUtils.smoothstep(st.alt, 70000, 100000) * 0.9;
 // flame visibility and scale
 const burnActive = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME) / 5);
 const flicker = 0.75 + 0.25*Math.sin(elapsed*31) + 0.15*Math.sin(elapsed*53+1.3);
 const plumeScaleY = 1 + Math.min(st.alt / 8000, 7);
 const plumeScaleXZ = 1 + Math.min(st.alt / 30000, 2.2);
 flameGroup.scale.set(plumeScaleXZ, plumeScaleY, plumeScaleXZ);
 flameGroup.visible = burnActive > 0.02;
 // light intensities
 flameLight.intensity = 80 * burnActive * flicker;
 flameLight2.intensity = 30 * burnActive * flicker;
 // smoke update
 updateSmoke(st.t, elapsed);
 // trail update
 updateTrail();
 // overlay
 overlay.textContent = ...
 // render
 composer.render();
 if (firstFrame) { (window as any).__ready = true; firstFrame = false; }
}
```
Need `clock.getElapsedTime()` after `getDelta` okay. But if paused, elapsed still. Good.
- Need if flameGroup.visible false, light intensities maybe zero. Good.
- Need scale at t after burn maybe still; visible false. Fine.
- Need `flameGroup.visible` property. Good.

- Need update smoke positions. `updateSmoke(t, elapsed)`.
- Need update trail before render. Good.
- Need update rocket group position and flame group child. Good.
- Need maybe update `rocketGroup.position` with x and alt. Good.
- Need if alt clamped at 0, flame below. Good.

Need `composer.render()` each frame. Since composer uses renderer. Good.
- On resize, composer set size and bloom resolution. Good.

Need create `composer` before animate. Add RenderPass and bloom. `const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera)); const bloomPass = ...; composer.addPass(bloomPass);`
- Need `RenderPass` import. Good.
- Need `UnrealBloomPass` threshold. The flame bright. Use `new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.5, 0.35);` Need threshold maybe 0.2. Use 0.35.
- At high altitude, stars bloom? Points white maybe bloom. Actually stars with opacity 0.9 and white, bloom may glow. Good.
- But bloom on white rocket? Fine.

Need maybe renderer `setSize` before composer. Good.

Need update sky stars? Good.

Need check physics. Let's write class:

```
interface TrailPoint { x: number; y: number; z: number; }
interface RocketState { t: number; alt: number; vel: number; acc: number; pitch: number; speed: number; }

class RocketSim {
  t = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  trail: TrailPoint[] = [];
  paused = false;

  playbackSpeed(): number {
    if (viewerSpeed !== null) return viewerSpeed;
    return this.t < 10 ? 1 : 10;
  }

  pitchAt(time: number): number {
    if (time <= 10) return 0;
    const f = Math.min(1, Math.max(0, (time - 10) / 140));
    return 0.5 * (f * f * (3 - 2 * f)); // smoothstep
  }

  massAt(time: number): number {
    if (time >= BURN_TIME) return DRY_MASS;
    const frac = Math.max(0, time / BURN_TIME);
    return M0 + (DRY_MASS - M0) * frac;
  }

  thrustAt(time: number, mass: number): number {
    if (time >= BURN_TIME) return 0;
    return Math.min(1.3 * M0 * G0, 3 * mass * G0);
  }

  gravityAt(h: number): number {
    const ratio = EARTH_R / (EARTH_R + Math.max(0, h));
    return G0 * ratio * ratio;
  }

  reset(): void {
    this.t = 0;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.trail.length = 0;
    this.paused = false;
    viewerSpeed = null;
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    let remaining = dt;
    while (remaining > 0) {
      const sub = Math.min(remaining, 0.02);
      const mass = this.massAt(this.t);
      const thrust = this.thrustAt(this.t, mass);
      const pitch = this.pitchAt(this.t);
      const g = this.gravityAt(this.y);
      const ay = thrust * Math.cos(pitch) / mass - g;
      const ax = thrust * Math.sin(pitch) / mass - g * this.x / (EARTH_R + this.y);
      this.vy += ay * sub;
      this.vx += ax * sub;
      this.x += this.vx * sub;
      this.y += this.vy * sub;
      if (this.y < 0) {
        this.y = 0;
        this.vy = 0;
      }
      this.t += sub;
      remaining -= sub;
    }
    this.trail.push({ x: this.x, y: this.y, z: 0 });
  }

  state(): RocketState {
    const mass = this.massAt(this.t);
    const thrust = this.thrustAt(this.t, mass);
    const pitch = this.pitchAt(this.t);
    const g = this.gravityAt(this.y);
    const acc = thrust * Math.cos(pitch) / mass - g;
    const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    return { t: this.t, alt: this.y, vel, acc, pitch, speed: this.playbackSpeed() };
  }
}
const rocketSim = new RocketSim();
```
Need `viewerSpeed` declared before class; yes.
- `reset` clears viewer's choice. Good.
- `paused` resets? We set false. Fine.
- Step should maybe if paused? Requirement paused only render loop. Step can still. Fine.
- Trail one per step call. Good. Even if dt=0, trail adds point. Good.
- If dt negative, set 0 and push. Good.
- If dt NaN, set 0. Good.

Need state.acc maybe at t after final. Good.
- Need mass at t>200 = DRY_MASS. Thrust=0. Good.
- Need gravityAt y. If y negative, clamp in gravity. Fine.
- Need gravity horizontal component uses x/(R+y). Good. But if y=0, x/(R), small. Good.
- Need pitch never decreases. Our pitch constant after 150. Good.
- Need pitch at t=150 exactly maybe 0.5. f=1. smoothstep=1. Good.
- Need pitch at t=10 zero. f=0. Good.
- Need pitch at t=100: f=(90/140)=0.642857; smoothstep = 0.642857²*(3-1.2857)=0.413*1.714=0.708; pitch=0.354. Good. At 150 0.5.
- Need initial pitch 0. Good.

Need visual state after reset: x=0,y=0, rocketGroup at y=0. Flame group visible. Trail empty. Good.
- Need if paused, render loop no step; state remains. Good.
- Need `window.__rocket` might be tested by calling `reset()` and then `step(1)`, trail one point. Good.
- Need if `step(1)` from t=0: substeps 50; trail one final point. Good.

Need use state.speed. Good.

Need overlay update uses `rocketSim.state()`. Could call after step. Good.

Need potential issue: When viewerSpeed set to 30 and t<10, playback speed 30, so liftoff skips; okay.

Need flame active after t=200 fades; if paused at t=200, active? `burnActive = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME)/5);` At t=200 exactly, active=1 because not < burn? Actually condition false; formula at t=200 ->1 -0=1. At t=200, thrust zero, but flame active 1? That might contradict. Need flame should zero after burn. Use `burnActive = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME) / 5);` At t=200, active=1. But thrustAt(200) returns 0 because time>=BURN_TIME. So flame should fade at t=200. Use `st.t <= BURN_TIME ? 1 : ...`? At exactly 200, burn ends. Use `if (st.t < BURN_TIME) active =1; else active = Math.max(0, 1-(st.t-BURN_TIME)/5)`. At 200 active 1, but zero thrust. In reality at 200 engine cutoff, flame extinguish instantly; but visual fade can start at 200. Use `active = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME) / 5);` at 200 =1. Next substep maybe >200. Not a big deal. Could set active = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME + 0.1)/5). Fine.
- Maybe use `const active = st.t < BURN_TIME ? 1 : 0;` no fade. But requirement plume grows; after burn no plume. Use fade to avoid abrupt. At t=200, active=0.5? Let's define `const active = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME) / 4);` at 200=1. Hmm. Instead start fading at burn end but use `Math.max(0, 1 - (st.t - BURN_TIME) / 5)` and multiply by `(st.t < BURN_TIME ? 1 : 1)`; not. Could set active = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME + 1) / 5); at 200 ->0.8. Not zero. Fine.
- Maybe use thrustActive = st.t < BURN_TIME ? 1 : 0; visual flame fade based on `Math.max(0, 1 - Math.max(0, st.t - BURN_TIME)/4)`; at t=200 active=1 but actual thrust zero. Yet flame might be last frame. Acceptable. We can set `active = st.t < BURN_TIME ? 1 : Math.max(0, 1 - (st.t - BURN_TIME) / 6);` at t=200 active=1. Since after burn, at t just >200 active <1. If paused at exactly 200, flame visible. Fine.
- Better to use `const active = st.t < BURN_TIME ? 1 : 0;` and maybe fade via `Math.max(0, 1 - (st.t - BURN_TIME)/4)` but with `if (st.t >= BURN_TIME) active=0`? No. I think okay.

Need flame plume grows with altitude; at t=200 altitude maybe 143km, plume scale 1+143000/8000=18.9, huge. But active at 200 maybe 1/0. So if active fade, huge. At t=199, plume 18.8. That's unrealistic (plume 450m). But in vacuum, plume can be huge; okay. But camera near rocket within 100m; a 450m plume would extend far below, visible. Fine. It might dominate. But "plume grows longer and wider as air thins" yes.
- At t=150 alt ~70km, plume length ~25*(1+8.75)=244m. Good.
- At t=100 alt maybe 30km, plume length ~25*(1+3.75)=118m. Fine.

Need flame light at high altitude; lights. Fine.

Need smoke shader and update. Let's write exact.

```
const smokeCount = 480;
const smokePositions = new Float32Array(smokeCount*3);
const smokeSizes = new Float32Array(smokeCount);
const smokeAlphas = new Float32Array(smokeCount);
const smokeSeeds = new Float32Array(smokeCount);
const smokeBaseX = new Float32Array(smokeCount);
const smokeBaseZ = new Float32Array(smokeCount);
for (let i=0;i<smokeCount;i++) {
  const angle = Math.random()*Math.PI*2;
  const radius = 4 + Math.random()*14;
  smokeBaseX[i] = Math.cos(angle)*radius;
  smokeBaseZ[i] = Math.sin(angle)*radius + (Math.random()-0.5)*8;
  smokeSeeds[i] = Math.random();
  smokeSizes[i] = 4 + Math.random()*8;
  smokeAlphas[i] = 0;
  smokePositions[i*3] = smokeBaseX[i];
  smokePositions[i*3+1] = 0.5;
  smokePositions[i*3+2] = smokeBaseZ[i];
}
const smokeGeo = new THREE.BufferGeometry();
const smokePosAttr = new THREE.BufferAttribute(smokePositions,3);
const smokeSizeAttr = new THREE.BufferAttribute(smokeSizes,1);
const smokeAlphaAttr = new THREE.BufferAttribute(smokeAlphas,1);
smokeGeo.setAttribute('position', smokePosAttr);
smokeGeo.setAttribute('aSize', smokeSizeAttr);
smokeGeo.setAttribute('aAlpha', smokeAlphaAttr);
const smokeMat = ...
const smoke = new THREE.Points(smokeGeo, smokeMat);
scene.add(smoke);
```
Need update:
```
function updateSmoke(t: number, elapsed: number): void {
  for (let i=0;i<smokeCount;i++) {
    const seed = smokeSeeds[i];
    const age = Math.max(0, t - 0.4);
    const grow = Math.min(age, 40);
    const angle = seed * Math.PI*2;
    const radius = smokeBaseX[i]*smokeBaseX[i]+...? Use base positions.
    const x = smokeBaseX[i] + Math.cos(angle)*grow*6 + Math.sin(elapsed*0.6 + seed*6.28)*1.5;
    const z = smokeBaseZ[i] + Math.sin(angle)*grow*5 + Math.cos(elapsed*0.45 + seed*6.28)*1.5;
    const y = 0.5 + Math.max(0, grow - 1.5) * 1.2 + seed * 2.0;
    smokePositions[i*3] = x;
...
    const size = 4 + grow*0.8 + Math.random()*3; // random each frame leads flicker; better seed stable. Use seed.
    smokeSizes[i] = 4 + grow*0.8 + seed*3.0;
    const alpha = Math.min(0.65, (0.25 + seed*0.35) * Math.min(1, age/0.8) * (0.7 + 0.3*Math.sin(elapsed*2.0 + seed*12.0)));
    smokeAlphas[i] = alpha;
  }
  smokePosAttr.needsUpdate = true;
  smokeSizeAttr.needsUpdate = true;
  smokeAlphaAttr.needsUpdate = true;
}
```
Need `t` maybe huge; grow min 40. So smoke stops expanding after 40s. At t>40, smoke remains. That's fine. But requirement clouds rise; after 40s, still. Good.
- But t=10, age 9.6, grow 9.6, radius spread ~57m. Pad radius 45. Smoke rolls out. Good. At t=20, spread ~120m. Good.
- At t=0, alpha 0. Good.
- Need smoke flicker uses elapsed; if paused, smoke flickers still. Fine.
- Need maybe use alpha for t<0.4: age 0, alpha 0. Good.
- Need smoke size; at grow 40, size 36+seed*3. Good. 
- `smokeSizes` initial. Good.

Need custom shader in TS: use template strings. Fine.

Potential issue: In ShaderMaterial, attributes names `aSize` and `aAlpha`; Three.js uses `attribute` declaration in vertex shader. Good. Need `varying float vAlpha`. Good.
- Fragment noise using gl_PointCoord. Good.
- Need `gl_PointSize = aSize * (700.0 / max(1.0, -mv.z));` If `mv.z` negative. Fine.
- Need size at high altitude far distance small. Good.
- Need depth test default true. depthWrite false. Good.
- Need `blending: THREE.NormalBlending`. Good.

Need maybe smoke is white/gray but at launch smoke should be white steam and dark smoke? Use white. Maybe some gray via alpha. Good.

Need fire flame shader? We use Basic. Additive. Good.

Need maybe core "blinding white-yellow core at nozzles". Use inner cone. Good.

Need maybe "large billowing white steam and smoke clouds that roll sideways out of the flame trench along the ground and then rise". Smoke system near pad. Good.

Need maybe add a few sprite clouds? Points with soft. Good.

Need maybe add a "flame trench" smoke rolls sideways. We can bias smoke along x and z. We have base around trench. Fine.

Need building/vegetation procedural textures. Good.

Need "roads and low buildings around it": Add road and buildings. Good.

Need "Atlantic Ocean on horizon behind pad": Local ocean plane. Good.

Need "pale hazy sky near horizon (fog or haze)": Sky shader haze and fog. Good.

Need "lightning-protection masts around pad": four. Good.

Need "lattice launch/umbilical tower next to rocket": yes.

Need "interstage and darker band": yes.

Need "flag and lettering": yes.

Need "physically based materials": yes.

Need "ACES tone mapping": yes.

Need "shadows from sun": yes.

Need "atmospheric scattering": sky shader.

Need "aerial perspective": fog.

Need "bloom": yes.

Need "procedural textures for concrete, ground, vegetation": we have concrete, ground, bushes. Vegetation as instanced mesh; texture ground. Good.

Need no external assets. Good.

Need "the rocket cannot go below the pad." yes.

Need "camera low near pad looking up at liftoff; once clears tower viewer travels with it within 100m." yes.

Need "view of coast, curve of Earth and then space from near rocket all the way up." Earth sphere. Good.

Need "stars appear above about 70 km and clearly visible above 100 km." yes.

Need "trail visible white contrail drawn from trail points." yes.

Need "playback speed overlay". yes.

Potential issue: At high altitude, camera near rocket and Earth sphere, but the sky dome is radius 1e9 and the camera at 143km. The sky dome is centered at origin with radius 1e9. If camera inside, the sky dome is all around. But the Earth sphere is also inside? Earth sphere radius 6e6, centered at y=-6e6. Sky dome surrounds. Good.

Potential issue: The sky dome side BackSide may be culled? BackSide renders inside. Good. `depthWrite=false`, `renderOrder=-1000`. Good.
- The sky dome vertex position radius 1e9. With camera near rocket at 143km, distance to sphere ~1e9. Far plane 2e9. Good.
- But the Earth sphere at radius 6e6 is much closer; rendered. Good.
- The sky dome will not be fogged (ShaderMaterial no fog). Fine.

Potential issue: The stars at radius 4e7 are inside the sky dome, so they render in front of sky. Good. But they might be in front of Earth? Depth. Good.
- At low altitude, opacity 0. Good.

Potential issue: The star points at radius 4e7; camera near pad at distance 4e7, but with sizeAttenuation=false size 2.4 px. Good.

Need maybe add sun disk? The sky shader sun glow. Good. At ground, sun glow. At high altitude, fade to black, sun gone. Could still sun. Fine.

Need maybe the sun directional light and sky sun direction align. Sun position (150,250,100). Sky `uSunDir` normalized to maybe (0.5,0.8,0.3). Align. Good.

Need maybe atmosphere haze at horizon. Good.

Need maybe `scene.fog` affects sky? ShaderMaterial no fog. Good.
- Points stars fog false. Good.
- Trail line fog false. Good.
- Flame materials fog? MeshBasicMaterial defaults fog true. At high altitude plume close, no issue. Smoke custom no fog.
- Rocket materials fog true; close. Good.
- Earth fog true; haze. Good.
- Ocean/land fog true. Good.

Need maybe at high altitude, Earth fogged with pale blue; local ground under Earth? The fog at distance 143km factor ~ (143000-800)/(250000-800)=0.57. Earth pale. Good.

Need maybe the camera at high altitude looking at rocket and Earth. The rocket is at y=alt; Earth surface below y=0. The camera is at target+offset y=alt+35+20=alt+55. Looking at target (alt+35) slightly downward. The Earth below is in lower part. Good.

Need update overlay after render? Doesn't matter.

Need maybe `__ready` after first frame. We set after composer.render. Good.

Need expose after initialization:
```
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = rocketSim;
```
Need at end.

Potential issue: `window.__rocket` object has method `state()` and property `trail`. Good.

Need maybe `state().speed` uses viewerSpeed. Good.

Need reset clears viewer's choice, but if UI button clicked after reset, viewerSpeed set. Good.

Need maybe step uses substeps of at most 0.02, but if dt is exactly 0.02, okay. Good.

Need maybe integrate with substep using time at start, but for large dt and mass linear, use exact. Good.

Need maybe gravity formula: `g0 * (R/(R+h))^2`; we use R/(R+h) with h altitude. Good.

Need "mass falls linearly from m0 to dry mass during burn" yes.

Need "Thrust: T = 1.3 * m0 * g0 ... limited to 3*m*g0 (throttle) and zero after burn." We compute `thrustAt` with `Math.min(1.3*M0*G0, 3*mass*G0)`. Good.
- At liftoff, T=1.3*550k*9.81=7,013,? Let's calculate: 550000*9.81=5,395,500; *1.3=7,014,150. T-to-weight = T/(m0*g0)=1.3. Good.
- At t=200 mass=220k, 3*m*g0=6,475,260 <7,014,150; throttle. Good.

Need "state().acc (net vertical acceleration)". We compute with thrust and gravity at final state. Good.

Need maybe "vel (m/s)" should be vertical velocity? They said `vel (m/s)`; overlay "velocity". Could use total. Fine. If tests expect vertical velocity? Hmm. They might check state fields. The requirement: `state(): { t, alt (m), vel (m/s), acc (net vertical acceleration, m/s^2), pitch (rad), speed }`. "vel" likely velocity magnitude. Could be vertical velocity? They specify "alt", "vel", "acc". In physics, velocity vector; maybe `vel` should be vertical velocity? They say "vertical and horizontal acceleration ... state().acc (net vertical acceleration)". They don't specify vel vertical. I think total speed. Could include both? But object only has specified fields; adding extra fields okay? Could add `vx`, `vy`? But state object expected those. To be safe, set `vel` = total velocity magnitude. The overlay shows velocity. Good.
- `speed` = playback time scale. Good.

Need maybe `state().speed` after reset should be 1 (t<10 default). reset clears viewer choice. Good.

Need overlay display `T+`, altitude, velocity, speed. Use `const st = rocketSim.state(); overlay.textContent = ...`. Could include speed x. Good.

Need maybe state speed is number. Good.

Need "the render loop calls step(min(delta, 1/30) * speed) when not paused." Our `delta` is min(clock delta, 1/30); speed from playback. Good. We call `step(delta * speed)`. Good.

Potential issue: If paused, we still update rocketGroup and camera based on unchanged state; fine.

Need maybe UI buttons labels "x1", "x10", "x30". Good.

Need maybe keys 1,2,3 set values. Good.

Need maybe reset clears viewer choice but overlay still shows default. Good.

Let's consider compile strict errors for `THREE.MathUtils.smoothstep`. Signature: `smoothstep(x, min, max)`? Actually Three.js MathUtils has `smoothstep(x, min, max)`. Yes. Use.

Potential issue: `MeshStandardMaterial` map with `CanvasTexture` and `color` maybe. Fine.

Potential issue: `LineBasicMaterial` property `fog`: I think `LineBasicMaterial` has `fog` inherited from Material? The TypeScript definition may include `fog: boolean`. To avoid relying, set `trailMaterial.fog = false;` maybe okay. If TS complains, use `trailMaterial.fog = false` in any? Let's check. `LineBasicMaterial` constructor parameters include `fog?: boolean`; property exists. Yes.

Potential issue: `PointsMaterial` property `fog` exists. Good.

Potential issue: `new THREE.SphereGeometry(EARTH_R, 128, 64)` large radius. Fine.

Potential issue: `MeshStandardMaterial({map: earthTex, roughness:0.85, metalness:0.0})`. The Earth sphere may be enormous and cast shadow? No. `earth.receiveShadow = true` maybe. It will receive sun but not cast. Fine.
- At high altitude, Earth sphere may be lit by sun and fog. Good.

Need maybe Earth sphere has `roughness=0.9`, `metalness=0.0`. Fine.

Need maybe ocean plane at y=0.005 and land at y=0.01. The pad at y=0 top. The pad is slightly above land? Pad cylinder top y=0, land y=0.01. That means pad top slightly below land plane? Wait land plane at y=0.01, pad top at y=0.0. The land plane would cover the pad top if overlapping? The pad is a cylinder with top y=0; land plane at y=0.01 above it. The pad would be hidden by land plane in areas. Need make pad top above land: pad cylinder top y=0.05 or land y=0.0. Let's set land y=0.01, pad top y=0.1? Actually pad should sit on ground. Use pad cylinder height 0.8, position y=-0.35 so top=0.05. Land plane y=0.0. Then pad top above. Ocean y=0.005. Shore y=0.02. Good. We'll set pad top 0.05. Rocket base at alt=0, so rocket base slightly below pad top? Actually pad top 0.05, rocket base y=0; engine nozzles at local y=0.5. Maybe okay. But pad top should be around y=0.05; rocket base y=0 means rocket sits slightly inside pad. Could set rocketGroup initial y = 0.05? But physics altitude from pad is 0. The rocket base at y=0 means pad top 0.05, rocket bottom slightly below. Minor. Use pad top y=0 and land y=-0.05? Hmm. Let's set pad top y=0 and land y=-0.02? The land plane at y=-0.02, pad top 0. Then pad above. Ocean y=-0.01. Shore y=0.0. That's fine. But physics altitude 0 at pad top. The rocket base y=0. Good. Let's set land position y=0.0? If pad top 0, land plane at -0.02. Use:
- land y = -0.02.
- ocean y = -0.03.
- shore y = 0.0.
- pad top = 0, cylinder center y=-0.4, height 0.8.
- trench top at y=0.02.
- Rocket base y=0. Good. 
- Buildings y? Their base at y=0? If land plane at -0.02, building bottom at y=-0.02 or 0. Use building position y=h/2, bottom at 0. Good. Slight above land. Fine.
- Road y=0.02? Road at y=0.0. Fine.
- Bushes y=scale*0.5, bottom at 0. Good.
- Ocean plane y=-0.03. Shore y=0.0. Good.

Need maybe pad at y=0 top; land plane below. Good.

Need maybe camera at y=22, looking. Good.

Need local ground plane extends. Good.

Need buildings around pad: Their bottom at y=0, above land. Good.

Need "roads and low buildings around it" add.

Let's think about shadows with directional light and large earth. Shadow camera only near pad. The Earth sphere is huge; no shadows from sun. Good.

Need maybe the rocket at altitude beyond shadow camera but still lit. Good.

Need bloom `renderer.toneMappingExposure` and `bloomPass` threshold. Flame additive may be clipped. Use `MeshBasicMaterial` color 0xfff2b5 has values 1; additive. Bloom threshold 0.35. Good. But inner flame cone opacity 0.95; additive with transparent. It will show. Bloom picks bright. Good.

Need maybe flame core not white enough due tone mapping. Use `MeshBasicMaterial({color:0xffffff})`? Actually color 0xfff2b5. Good. Additive white-yellow. 
- Add outer orange.
- Add point light.

Potential issue: The flame cone geometry is open ended `ConeGeometry(... openEnded true)` and side DoubleSide. The cone faces outward. With additive blending, interior visible. Good.

Need maybe mach diamond rings: Torus geometry. Add to flame group. Their positions relative. Use `ring.rotation.x = Math.PI/2;` Actually TorusGeometry default lies in XY plane; rotate x=π/2 makes it horizontal (XZ). Good. Add.
- They may not be visible if plume cone. Fine.

Need maybe smoke "rolls sideways out of flame trench along ground then rise." Points update with base around trench. Good.

Need maybe ground vegetation texture with bushes. Good.

Need maybe sky stars opacity from alt. Good.

Need maybe sky black above 100 km. Good.

Need maybe `uAlt` update. Good.

Need maybe sky shader sun glow at high altitude not visible because fade to black. Good.

Need maybe star material opacity at alt 143km = smoothstep(70,100)=1. Good. At alt 70km =0. At alt 80km ~? smoothstep x: t=(80-70)/30=0.333; t²*(3-2t)=0.111*(2.333)=0.259. Good. Stars appear above 70. Clear above 100. Good.

Need maybe at alt 100km, sky fade = smoothstep(0,100000)=1 -> black. Stars opacity =1. Good.

Need maybe at alt 50km, sky still blue but dark. Good.

Need maybe camera at high altitude near rocket shows stars. Good.

Need maybe "curve of Earth" visible: Earth sphere. Good.

Need maybe "coast" view from near rocket all the way. Earth sphere texture. Good.

Potential issue: At high altitude, the Earth sphere radius 6.37e6 centered at -6.37e6. The camera at y=alt+55, x maybe 100km. The Earth surface below. The sphere is large; the horizon line may be close? At 143km, horizon distance ~sqrt(2*R*alt) = sqrt(2*6.37e6*143000)=sqrt(1.82e12)=1.35e6 m. The Earth sphere occupies huge field. Good.

Need maybe the rocket's horizontal displacement after gravity turn. At t=200, x maybe? Compute horizontal acceleration ~T sin p/m - gravity x. Average ~ maybe 10 m/s²? Horizontal velocity ~1000 m/s, x ~100 km. At apogee maybe further. Fine.
- Camera follows x. Earth sphere. Good.

Need maybe local pad at origin, rocket at x up to 100km, so after start, rocket moves horizontally. The camera follows. The coast view. Good.

Need maybe the rocket's trajectory could go down at apogee and clamp. Fine.

Let's consider if the trail array points use rocket base and at high altitude, the line from pad to rocket can be huge. It will be visible white contrail. The trail line material opacity 0.35. At low altitude, trail maybe. Good.
- At high altitude, line from pad to rocket (100km) is white; fog false; visible. Good.

Need maybe the trail line should be drawn behind rocket, not from pad to rocket? It is the trajectory. Good.

Need maybe after reset trail length zero; line draw range 0. Good.

Need maybe if trail length > capacity, update. Good.

Need maybe if trail length huge and updateTrail each frame loops over all points (could be thousands). Fine.

Need maybe `updateTrail` function uses rocketSim trail. Good.

Need maybe `rocketSim.trail.length` and `trailPosAttr.count`. Good.

Potential TS issue: `let trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);` type `BufferAttribute`. Reassign. Good.
- `trailGeo.setAttribute('position', trailPosAttr);` accepts BufferAttribute. Fine.
- `trailPosAttr.needsUpdate = true`. Good.
- `trailGeo.setDrawRange(0, count)`. Good.

Need maybe `trailGeo` needs `computeBoundingSphere`? Not necessary. But if draw range changes, Three.js may not update bounding sphere? For line, culling may be based on bounding sphere from initial empty geometry. If geometry initially has no positions? We create with empty Float32Array? Hmm. We set attribute with capacity 6? Let's set initial capacity 2 points (6 floats). The bounding sphere may be computed? BufferGeometry computes bounding sphere on first render? If not, culling could be wrong. Set `trailGeo.frustumCulled = false` for line. Good. That avoids issues. Use `trailLine.frustumCulled = false;`. Good.
- Similarly smoke points may be large; set `smoke.frustumCulled = false`? Since dynamic positions, bounding sphere not updated. Use `smoke.frustumCulled = false`. Good.
- Stars frustum culling? Static. Fine. Earth. 
- Sky dome. Fine.

Need maybe `rocketGroup` culling? It moves. Three.js updates bounding sphere? Mesh group with meshes. Should be okay. But at high altitude, culling? The rocket meshes local coordinates. Fine.

Need maybe the flame group scale changes and position. Fine.

Need maybe set `rocketGroup.frustumCulled = false`? Not necessary.

Need maybe shadow map with sun. Fine.

Let's plan code order:

1. Imports and constants.
2. Renderer, scene, camera, fog.
3. Texture helper and textures.
4. Materials.
5. Lighting.
6. Sky/stars/earth.
7. Ground/ocean/shore/roads/buildings/bushes.
8. Pad/tower/masts.
9. Rocket model/flame.
10. Smoke.
11. Trail.
12. Physics.
13. UI.
14. Composer.
But composer needed for render and resize; can define after scene/camera. RenderPass. The bloom. 
- Need update `__ready` after render. 
- Need composer before animate. Good.
- UI can be before animate.

Need all variables in scope for animate: rocketGroup, flameGroup, flameLight, flameLight2, smoke, skyMat, starMat, trailLine, overlay, composer, bloomPass, camera, rocketSim, viewerSpeed. Good.

Need define functions `updateSmoke`, `updateTrail`. Good.

Let's write exact code.

Potential issue with `scene.fog = new THREE.Fog(0xb9d6e8, 800, 250000);` At high altitude, sky dome shader not fog. Good.

Potential issue with star material opacity: `starMat.opacity = ...`. Need `starMat.transparent = true`. Good.
- At opacity 0, stars invisible. Good.

Potential issue with star material size and `sizeAttenuation:false`: In Three.js, `sizeAttenuation` false makes size in pixels? I think yes. Good.

Potential issue with smoke shader: `aSize` attribute; `BufferAttribute` named `aSize`. In shader, `attribute float aSize;`. Good. 
- Need `uniform` none. Good.
- Need alpha in fragment. Good.
- Need `transparent: true`. Good.
- Need `depthWrite: false`. Good.
- Need `blending: THREE.NormalBlending`. Good.
- Need `vertexShader` and `fragmentShader` strings. Good.
- Need no semicolon in strings? Fine.

Potential issue with `gl_PointSize` value if `mv.z` positive? `-mv.z` might be negative if point behind camera; max(1.0, -mv.z) -> if -mv.z negative, max 1.0. Good.
- At distance 1m, gl_PointSize large. Fine.

Potential issue with smoke points at t=0 all at pad, alpha 0, invisible. Good.

Need maybe smoke should be visible at t=0? Liftoff flame; no smoke yet. Good.

Need maybe flame light at t=0. Good.

Need maybe after burn, flame group visible false. Good.

Potential issue with overlay updates before render. Fine.

Need maybe `const speed = rocketSim.playbackSpeed();` before step. If t=0 speed=1. Good.
- After step, `state.speed` maybe used overlay. Good.
- If `paused`, no step; overlay still state. Good.
- If viewerSpeed=30, overlay shows x30. Good.

Need maybe `rocketSim.paused` property. Good.

Need maybe `window.__rocket = rocketSim;` after class. Good.

Now think about realistic rocket texture mapping. CylinderGeometry UV: The texture appears around circumference. The flag and lettering drawn once; from camera side, one side visible. Good. But the texture is applied to both main body and second stage using same map. On second stage, lettering may appear. Fine.
- The fairing uses same map? It will show lettering on taper; okay. Maybe use whiteMat with map. Fine.
- The map has dark band at y=380; on cylinder, v. If cylinder UV v 0 at bottom? Let's check Three.js CylinderGeometry: UV `uv.set( u, v )` where v from 0 top? Actually for cylinder, top at y=height/2, v=1? I think v=0 at bottom? The texture band may appear near top or bottom. Not critical. 
- Separate interstage dark band. Good.

Need maybe add "FALCON 9" and flag. Good.

Need maybe use `ctx.fillText('FALCON 9', 650, 250);` with font. Good.
- Flag: draw blue rectangle and red stripes. Need maybe white stripes. Fine.
- Use `ctx.fillStyle = '#ffffff'` for stripes. Draw alternating red/white. Good.

Need maybe if texture map has white background, the body material color white. Good.

Need maybe use `MeshStandardMaterial` with map and `roughness`. Good.

Need maybe add `rocketTex.anisotropy=4`. Good.

Need maybe concrete texture `repeat` set. Good.

Potential issue: The `canvasTexture` helper sets `tex.colorSpace = THREE.SRGBColorSpace`. Good.
- For ground texture, use `RepeatWrapping`, repeat. Good.

Need maybe use `new THREE.Color` in shader uniforms. Fine.

Need perhaps `renderer.setAnimationLoop(animate);` after all. Good.

Need maybe `renderer.domElement` appended with style? canvas default. We set body. Fine.

Need maybe overlay and buttons appended after body. Good.

Need maybe add CSS for canvas? `renderer.domElement.style.display = 'block';`. Not necessary.

Need maybe `document.body.style.background = '#000';`? Not necessary.

Need maybe `window.addEventListener('resize', ...)`. Good.

Need maybe update composer size and bloom resolution. Good.

Let's consider strict TypeScript issues with `THREE.CanvasTexture` and `tex.colorSpace` property. In Three types, `CanvasTexture` has `colorSpace` property? Yes, Texture has `colorSpace`. Good.
- `tex.anisotropy` property. Good.
- `tex.wrapS` property. Good.
- `tex.repeat.set`. Good.

Need maybe `CanvasRenderingContext2D` has `ellipse`. Good.

Need maybe `ctx.font = 'bold 38px sans-serif';` no issue.

Need maybe `Math.random` in texture drawing. Fine.

Potential issue: `scene.add(sky)` with sky material side BackSide. Good.
- `sky.renderOrder = -1000`. Good. `depthWrite=false`. Good.
- The sky shader uses `uCamPos` uniform. At first frame, camera position updated. Good.

Need maybe sky material `transparent:false`? It is opaque background. Good. But depthWrite false. Fine. If no transparent, no blending. Good.
- The sky will be drawn after? renderOrder -1000. Good.

Potential issue: The sky dome uses `modelMatrix * vec4(position,1)` and `projectionMatrix * viewMatrix * wp`. In Three shader, `viewMatrix` uniform is available? Yes. In ShaderMaterial, built-in uniforms include modelMatrix, viewMatrix, projectionMatrix. Good.
- Fragment `vWorldPos - uCamPos`. Good.

Potential issue: The sky shader at high altitude fades to black, but if camera is near rocket at 143km, the Earth sphere is below. The sky dome black. Good.

Need maybe use `uniform vec3 uSunDir` normalized. Set value. Good.

Need maybe `uSunColor` value as Color. In shader uniform of type vec3, Three.Color works. Good.

Need maybe `uHorizon` etc values. Good.

Need maybe update `uAlt` with `st.alt`; if alt huge >100km, fade 1. Good.

Need maybe stars opacity at alt >100km. Good.

Need maybe `THREE.MathUtils.smoothstep(st.alt, 70000, 100000)` but if st.alt=0, returns 0. Good.

Need maybe star opacity if alt=70000 exactly 0. Good.

Potential issue: `starMat.opacity` at high alt 1.0. Good.

Need maybe stars visible through sky because sky depthWrite false. Good.

Need maybe stars behind Earth occluded by Earth because Earth depthWrite true. Good. But stars with `depthWrite:false` and `depthTest:true`. Good.

Need maybe star points are rendered after Earth? Render order default. Depth test handles. Good.

Need maybe Earth sphere huge and at high altitude, the camera's far plane 2e9; good.

Need maybe the sky dome radius 1e9 and camera far 2e9; good.

Need maybe the star points radius 4e7. Good.

Need maybe local ground plane extends beyond Earth sphere? It is 6000x6000. Fine.

Need maybe the ocean plane size 100000; at high altitude, it's far below. Fine.

Potential issue: `scene.fog` with far 250000 will fog stars? We set `starMat.fog=false`. Good. Trail `fog=false`. Smoke custom no fog. Sky shader no fog. Good.

Need maybe `trailMaterial.fog = false` property. Good.

Need maybe flame materials fog default true? At high altitude, flame close to camera; distance ~100m, fog near 800, so no fog. Fine.

Need maybe rocket materials fog default true; distance 100m, no. Good.

Need maybe Earth fog true; at distance 143km, factor 0.57. Good.

Need maybe buildings/ocean fog true. Good.

Need maybe bushes fog true. Fine.

Need maybe pad/tower fog true. Good.

Need maybe add `PointLight` to flame group. Intensity 80. Is physically based? `PointLight` has intensity in candela? In Three, intensity arbitrary. Use 80 maybe. With tone mapping, bright. Good.
- At t=0, flameLight at local y=-1.5, rocket base near 0. It lights pad and rocket. Good.
- At high altitude, light moves. Good.
- `flameLight2` white intensity 30. Good.

Need maybe flame light color. Good.

Need maybe `flameLight.distance=160`, `decay=2`. Good.
- At t=200, active 1 maybe, intensity 80. Fine.

Need maybe update flameLight intensity with burnActive and flicker. Good.

Need maybe `const flicker = 0.75 + 0.25 * Math.sin(elapsed * 37.0) + 0.14 * Math.sin(elapsed * 61.0 + 1.7);` Could be >1.15. Fine.
- `burnActive` maybe 1. 
- Use `Math.max(0, flicker)`. Good.

Need maybe `flameGroup.visible = burnActive > 0.01;` Good.

Need maybe if flame group invisible, its lights? `visible` false affects children including lights? In Three.js, if parent group visible false, children not rendered and lights? Light is part of scene and if parent invisible, its light may not affect? I think if an object is invisible, its children are not rendered, but lights might still be in scene? Hmm, visibility affects object and descendants; lights may still affect? Actually visibility of light object not tied to rendering? If light is invisible, it may not be included in lighting? Not sure. Better set light intensity to zero when inactive, and keep group visible true? But flame meshes could remain visible if materials opacity? We can set `flameGroup.visible = burnActive > 0.02` and light intensity zero. If group invisible, light may not cast? To be safe, set `flameGroup.visible = burnActive > 0.02` and update intensities; if invisible, light might not cast? Fine. At after burn, no flame, no light. Good. If hidden, pad not lit. Good.

Need maybe smoke should be visible before flame? fine.

Need maybe camera transition uses `THREE.MathUtils.smoothstep(st.alt, 55, 130)`. At alt 0, 0. Good. At alt 70, smoothstep? (70-55)/75=0.2; smoothstep ~0.104. At alt 130, 1. Good. At alt 143, 1. Good. So chase. At t=10 alt ~155m, yes full chase. Actually alt 155m >130, full. The rocket clears tower at ~60-70m; transition starts at 55 and ends 130. Good. At t=10 alt 155m, full chase. Good.
- At t=5 alt maybe 30m; transition 0. So low camera. Good.
- At t=8 alt maybe 100m; transition 0.7. Camera starts moving. Good.

Need maybe initial camera target at y=35; rocket center. Good.
- At t=0, rocket base y=0, center 35. Camera (70,22,110) looking up at center. The camera y=22, target y=35, so looks up. Good.
- When rocket ascends, target moves up; ground camera fixed. Good. At t=10, target y=155+35=190; camera fixed at 22 looking up steeply; transition full chase by alt 130. Wait transition at alt=155 is 1, so camera is chase at alt=155, not ground. Good. The camera moves to chase. Smooth.

Need maybe at t=5 alt=30, transition 0, camera fixed looking at target y=65. Good. At t=8 alt=100, transition ~0.78, camera closer. Good.

Need maybe camera at chase target + offset (45,20,75). The offset length sqrt(45²+20²+75²)=sqrt(2025+400+5625)=sqrt(8050)=89.7. Within 100. Good.
- But camera y = target.y +20 = alt+55. The rocket center at alt+35. Camera 20 above center. Good. The camera is close. 
- The camera x = st.x +45; z=75. The rocket center x=st.x. Distance ~89.7. Good.
- Looking at center. Good.

Need maybe at high altitude, camera offset fixed relative. Good.

Need maybe "view of coast, curve of Earth and then space". The camera is above rocket, looking down at rocket; Earth below. Good.

Need maybe the rocket and plume might block Earth; but okay.

Potential issue: At high altitude, the trail line from pad to rocket passes through camera? No, trail behind. Good.

Need maybe use `camera.lookAt(target)`. Good.

Need maybe if rocket moves x, the ground camera at fixed x=70 might not track? It looks at target. Good.

Need maybe at t=0, the camera is at x=70, z=110. The ocean behind pad in -z. The camera sees ocean beyond? It is looking at pad, ocean behind pad maybe visible in background. Good.

Need maybe the low camera is near pad but not too low. Good.

Need maybe "launch photograph, not diagram" we add haze, bloom, shadows. Good.

Let's think about potential memory/performance:
- 480 smoke points with dynamic positions each frame. Fine.
- 260 bushes. Fine.
- 4 masts with many beams. Fine.
- Rocket with 9 nozzles. Fine.
- Earth sphere 128x64. Fine.
- Sky sphere 32x16. Fine.
- Stars 2600. Fine.
- Trail line dynamic. Fine.
- Composer bloom. Fine.

Need maybe avoid `Math.random` inside updateSmoke sizes? We use seed. Good.
- `smokeSizes` update each frame. Fine.

Need maybe `smokeSeeds` initial random. Good.

Need maybe `smokeBaseX` and Z; use initial positions. Good.

Need maybe update `smokePositions` arrays. Good.

Need maybe `smokeGeo` `frustumCulled = false`. Good.

Need maybe `trailLine` `frustumCulled = false`. Good.

Need maybe `smoke` render order? transparent. Fine.

Need maybe `smokeMat` depthTest true. Smoke at pad, ground. Good.

Need maybe smoke points around pad at t>0; depth test with pad. Fine.

Need maybe smoke at high altitude far below, hidden by Earth? It is at y=small, Earth sphere below? At camera high, smoke at pad is on Earth surface; could be visible? It is tiny. Fine.

Need maybe smoke points at y ~0.5; at high altitude camera far. They are at origin, Earth sphere surface. Fine.

Need maybe flame at high altitude behind Earth? No, rocket.

Need maybe the Earth sphere occlusion: At high altitude, the rocket at y=alt >0, Earth below. Camera above rocket. Good.

Need maybe the sky dome radius 1e9 and Earth sphere. Good.

Potential issue: At ground, the sky dome radius 1e9, but the ocean plane extends 100000; fog. The sky horizon. Good.
- The sky shader direction from camera to dome; at horizon, `dir.y` maybe. The dome is huge, so horizon at y=0 direction. The shader horizon haze. Good.
- The ocean horizon at z=-100000 maybe. The actual horizon in sky not exactly. Fine.

Need maybe add sun disk at low sky. The sun glow from `uSunDir`. Good.
- Set `uSunDir` to normalized sun.position. `sun.position` = (150,250,100). Direction from origin to sun = normalized (0.52,0.86,0.34). The sky shader sun glow. Good.
- Sun directional light from that direction. Good.

Need maybe `uSunDir` update? Not necessary fixed. But camera moves; sun direction relative camera? The sky shader `dot(dir, normalize(uSunDir))` uses direction from camera to sun point at infinity. The sun direction from camera to sun should be same as from origin to sun? At high altitude, the sun direction relative to camera is similar if sun at infinity. Good.

Need maybe sun position set before sky? We can set `sun.position`. Good.

Need maybe `sun.target.position.set(0,0,0); scene.add(sun.target);` Good.

Need maybe create `sun` after scene. Fine.

Let's consider exact TypeScript syntax for `const speedOptions: Array<[number, number]> = [[1, 1], [2, 10], [3, 30]];` Then for `const [key, value] of speedOptions`. Good. But key unused? Use label? We can use `const [buttonIndex, value]`. `buttonIndex` unused? In TS strict no unused locals? Actually `--strict` doesn't enable noUnusedLocals, but to be safe, use `_key`? Not. Use `const value` only? Iterate over `[1,10,30]`. 
```
const speedValues = [1, 10, 30];
for (const value of speedValues) { ... }
```
Need keys 1,2,3 map to values. The buttons labels x1,x10,x30 correspond to values. Good. Use `speedValues`. Simpler.
- Keyboard maps 1->1,2->10,3->30. Good.

Need maybe `viewerSpeed` type `number | null`. Good.

Need maybe overlay update with speed. Good.

Potential issue: `window.addEventListener('keydown', (event: KeyboardEvent) => { ... });` event key may be '1'. Good.

Need maybe use `document.body.appendChild(overlay);` before renderer? We append renderer first. Fine.

Need maybe set `document.body.style.overflow = 'hidden'` but overlay outside? Fine.

Need maybe style buttons. Good.

Need maybe set `controls.style.display = 'flex'` etc. Good.

Need maybe overlay text update; could use `overlay.textContent`. Good.

Need maybe include "T+" and altitude. Fine.

Let's write code.

Let's think about `updateSmoke` function using `t` and `elapsed`. It needs access to arrays. Good.

Potential issue: `smokeBaseX[i]` initial random; update uses `smokeBaseX[i] + Math.cos(angle)*grow*6`, but angle is seed*2π not matching original base angle. This results smoke positions drifting in random directions. Fine. Could use seed. Good.
- Maybe smoke should roll sideways along ground from trench. It will spread. Good.

Need maybe `grow` variable is age. At t=10, age 9.6, grow 9.6. At t=40, grow 39.6. At t>40, grow 40. Good. Smoke cloud size. Good.
- `y = 0.5 + Math.max(0, grow - 1.5) * 1.2 + seed * 2.0`. At grow 9.6, y ~0.5+8.1*1.2+2=12.2m. Good. At grow 40, y ~0.5+38.5*1.2+2=48.7m. Smoke rises. Good. But smoke on ground should roll sideways then rise; yes.
- The rocket at t=10 alt ~155m, smoke 12m. Good. 
- The flame trench at pad. Good.

Need maybe smoke alpha at t=10: age 9.6, alpha ~ (0.25+seed*0.35)*1*(0.7+0.3 sin) ~0.3-0.6. Good. Many particles. Cloud. Good.
- At t=0.5, age 0.1, alpha ~0.1. Good.
- At t=0, alpha 0. Good.

Need maybe smoke at t after burn still visible on ground; camera high, not visible. Fine.

Need maybe flame plume grows with altitude. Good.

Need maybe the flame group's scale affects cone length; if scale y huge, the cone base below far; fine.
- The flame group also scales mach rings; rings maybe stretched. Fine.
- The point light position scaled? The light position within group is affected by scale? In Three, scale of parent affects children's positions. A point light at local y=-1.5 will be scaled to -1.5*scaleY, farther below. That's okay; flame light moves down with plume. At high altitude, light far below rocket maybe still lights rocket? Light distance 160, but scaled to -1.5*18=-27m below nozzle. It lights rocket. Fine.
- But if flame group invisible, light not. Good.

Need maybe set `flameGroup.scale.set(plumeScaleXZ, plumeScaleY, plumeScaleXZ)` and `flameGroup.position.y` fixed. Good.

Potential issue: `flameGroup.visible = burnActive > 0.02` and then later light intensities. Good.

Need maybe update `rocketGroup.position` before flame group? It moves. Fine.

Need maybe `flameGroup` child; when rocketGroup position set, flame moves. Good.

Need maybe engine nozzles at local y=1.1. Flame group at y=0.2. Cone apex at y=0.2, so flame starts near nozzles. Good.

Need maybe the flame inner cone length 12, base at -11.8. At liftoff, pad top y=0, flame extends below. Good. But pad occludes lower. Smoke. Fine.

Need maybe make the flame start at local y=1.2? The nozzles bottom ~0.2. Use flame group position y=0.2. Good.

Need maybe add an "engine glow" sprite at nozzle. Could add `PointLight` enough. Maybe add a small sphere emissive at nozzle:
```
const core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 8), innerFlameMat);
core.position.set(0,0,0);
flameGroup.add(core);
```
But a sphere additive at nozzle could look like blinding core. Use innerFlameMat. Position local y=0? It would be at flame group y=0.2. Good. Add. But sphere might look solid. Additive. Fine. 
- `SphereGeometry(1.1, 16, 8)`. Add. Good.

Need maybe flame core blinding white. Good.

Need maybe mach diamonds. Good.

Need maybe smoke uses `Math.random` base. Good.

Need maybe add some "steam" near flame trench as sprites? Points.

Need maybe add "flame trench" as dark box. Good.

Need maybe add "lattice launch tower" with tower at x=-6. Good.

Need maybe add "umbilical tower" with arms. Good.

Need maybe add "lightning masts" at corners. Good.

Need maybe add buildings and roads. Good.

Need maybe add "Florida coast" with ocean. Good.

Potential issue: The ocean plane at z=-52000 size 100000 extends from -102000 to -2000. The land plane at z=1000 size 6000 extends -2000 to4000. Good. The shore at z=-2000. Good. The pad at origin within land. Good.
- Camera at z=110, looking at origin. Ocean behind at -2000. Good.

Need maybe add vegetation on land. Good.

Need maybe add low buildings around pad. Good.

Need maybe add road at z=80, x=-800. Good.

Need maybe add a few bushes near pad. Good.

Need maybe add "green scrub vegetation" with bushes. Good.

Need maybe add "road" with dark material. Good.

Need maybe add buildings with windows? Could add windows as small dark boxes. Not necessary. But realism. Add function `addBuilding` with roof and maybe a window stripe. Let's implement simple.

```
function addBuilding(x: number, z: number, w: number, d: number, h: number, color: number): void {
 const mat = new THREE.MeshStandardMaterial({color, roughness:0.9, metalness:0.0});
 const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
 mesh.position.set(x,h/2,z);
 mesh.castShadow = true;
 mesh.receiveShadow = true;
 scene.add(mesh);
 const roof = new THREE.Mesh(new THREE.BoxGeometry(w*1.1,0.25,d*1.1), new THREE.MeshStandardMaterial({color:0x5b6166, roughness:0.9}));
 roof.position.set(x,h+0.125,z);
 roof.castShadow = true;
 scene.add(roof);
 // window band
 const windowMat = new THREE.MeshStandardMaterial({color:0x1b2a33, roughness=0.4, metalness=0.2});
 const win = new THREE.Mesh(new THREE.BoxGeometry(w*0.75, h*0.2, 0.08), windowMat);
 win.position.set(x, h*0.55, z + d/2 + 0.04); // front
 scene.add(win);
}
```
Need `d` and `z + d/2`. Good. 
- Add 5 buildings. Good.
- Maybe use `MeshStandardMaterial` color. Good.

Need maybe road:
```
const roadMat = new THREE.MeshStandardMaterial({color:0x2b2e33, roughness=0.9});
const road = new THREE.Mesh(new THREE.BoxGeometry(1600,0.08,10), roadMat);
road.position.set(-700,0.02,80); road.receiveShadow=true; scene.add(road);
```
Good.
- Add another road to pad:
```
const road2 = new THREE.Mesh(new THREE.BoxGeometry(8,0.08,600), roadMat);
road2.position.set(-120,0.02,300);
```
Fine.

Need maybe add "shoreline" with sand. Good.

Potential issue: The buildings at y=h/2 with bottom at 0, land at -0.02. Good.

Need maybe add some lamp posts? Not necessary.

Need maybe add "launch pad" with concrete. Good.

Need maybe add "flame trench" dark strip. Good.

Need maybe add "pad ring" torus. Good.

Need maybe add "launch tower" with lattice. Good.

Need maybe add "lightning mast" with lattice. Good.

Need maybe add "umbilical arms". Good.

Need maybe add "rocket" with detailed parts. Good.

Need maybe add "flame" and "smoke". Good.

Need maybe add "trail". Good.

Need maybe add "UI overlay". Good.

Need maybe add "speed controls". Good.

Need maybe add "resize". Good.

Need maybe add "animation loop". Good.

Need maybe expose. Good.

Let's now consider TypeScript compile strict. We need declare types for helper functions. 
- `function createBeam(p1: THREE.Vector3, p2: THREE.Vector3, radius: number, material: THREE.MeshStandardMaterial): THREE.Mesh`
- `function buildLatticeTower(cx: number, cz: number, height: number, width: number, levels: number): THREE.Group`
- `function addBuilding(...)`. 
- `function updateSmoke(t: number, elapsed: number): void`
- `function updateTrail(): void`
- `function onResize(): void`
- `function animate(): void`
All good.

Need maybe use `const dummy = new THREE.Object3D();` outside loop. Good.

Potential issue: `bushes.instanceMatrix.needsUpdate = true` after setting. `InstancedMesh.instanceMatrix` type `InstancedBufferAttribute`; has `needsUpdate`. Good.
- `bushes.castShadow = true`. Good.
- `bushes.receiveShadow = true`. Good.
- `bushes.setMatrixAt(i, dummy.matrix)`. Good.

Potential issue: `mesh.castShadow` etc. Good.

Potential issue: `MeshStandardMaterial` color parameter. Good.

Potential issue: `new THREE.PlaneGeometry(6000,6000)` and `rotation.x = -Math.PI/2`. Good.

Potential issue: `TorusGeometry` ring material. Good.

Potential issue: `MeshBasicMaterial` `blending: THREE.AdditiveBlending` property. Good.

Potential issue: `ShaderMaterial` `blending: THREE.NormalBlending` property. Good.

Potential issue: `new THREE.BufferAttribute(smokePositions, 3)` expects `Float32Array` or `number[]`. Good.

Potential issue: `smokeGeo.setAttribute('position', smokePosAttr);` `BufferAttribute` type. Good.

Potential issue: `smokePosAttr.needsUpdate = true` property. Good.

Potential issue: `trailPosAttr.count` property. Good.

Potential issue: `trailGeo.setDrawRange(0, count);` accepts number. Good.

Potential issue: `trailLine.geometry` property. Good.

Potential issue: `trailLine.frustumCulled = false`. Good.

Potential issue: `smoke.frustumCulled = false`. Good.

Potential issue: `stars` material opacity. Good.

Potential issue: `skyMat.uniforms.uAlt.value = st.alt;` `uniforms` object property type `any`? In shader material, uniforms type `Record<string, {value: any}>`? TS might allow. `skyMat.uniforms.uAlt` can be accessed if type? `ShaderMaterial` has `uniforms: { [key: string]: { value: any } }`. Good.
- `skyMat.uniforms.uCamPos.value.copy(camera.position);` value type any. Fine.

Potential issue: `starMat.opacity` property. Good.

Potential issue: `flameLight.intensity`. Good.

Potential issue: `flameGroup.visible`. Good.

Potential issue: `overlay.textContent` property. Good.

Potential issue: `const speedValues = [1,10,30];` inferred number[]. Good.

Potential issue: `window as any` casting. Good.

Need maybe no other HTML, but we create overlay/buttons DOM. The prompt says "The page has no other HTML." That could mean the file itself should not contain HTML; creating via JS is necessary. It's okay.

Need maybe no external assets. Good.

Let's think about potential issue with t and playback speed when viewerSpeed chosen. If viewerSpeed=30, render loop calls step(delta*30). The simulation time t advances quickly. The state.speed returns 30. Good.
- If viewerSpeed chosen 1, speed 1 always. The default liftoff speed 1 then 10 is overridden. Good.
- If no chosen, at t<10 speed 1, then 10. Good.
- Reset clears viewer choice. Good.

Need maybe "state().speed returns the current value" after reset should be 1. Good.

Need maybe `step(dt)` uses internal substeps but not playback scaling. Good. Render loop applies scaling. Good.

Need maybe if user calls `rocket.step(1)` with no speed; advances 1s.