We need produce one TS file. Need code compile strict. Need implement many features. Need careful with imports addons types. Three version likely latest with types. Need avoid errors: OrbitControls? maybe not necessary. Sky addon, EffectComposer, RenderPass, UnrealBloomPass. Types in three/addons maybe. Need know module import paths: 'three/addons/objects/Sky.js', 'three/addons/postprocessing/EffectComposer.js', 'three/addons/postprocessing/RenderPass.js', 'three/addons/postprocessing/UnrealBloomPass.js'. With strict, addons have types? three package includes types for addons? In newer versions, yes via package exports types? I think three/addons JSDoc? Types from @types/three? Hmm compile strict perhaps known. We can avoid addons requiring typings? But requirement suggests Sky and UnrealBloomPass. If using addons, TypeScript may complain missing declaration if not types. In modern three, addons have .d.ts under examples/jsm? Actually three package includes types in `examples/jsm`? Since r152? Three package types maybe in `src/Three.d.ts`? Historically @types/three includes examples/jsm. The import `three/addons/...` is mapped to `three/examples/jsm/...`. @types/three includes declarations. likely fine.

Need build scene. Need physics implementation robust.

Let's design all.

Coordinate: y up, rocket at pad origin x,z 0. Rocket 70m tall. Pad at y=0, rocket base y=0 perhaps. Rocket group origin base. Camera near pad.

Physics:
- window.__rocket object with reset, step(dt), state, trail array, paused.
- constants. m0 550000, dry 220000, burn 200, thrust max = 1.3*m0*g0 = 7,? 550000*9.81=5,395,500; *1.3=7,014,150 N. TWR 1.3. limited to 3*m*g0 throttle and zero after burn. Need note mass linearly falls m = m0 - (m0-dry)*t/burn for 0..burn; after burn mass dry. Thrust T = 1.3*m0*g0 if t<burn, limited min(T, 3*m*g). However at t=0 thrust = 7.014 MN; 3*m*g = 16.2MN, so no limit. As mass decreases, base T constant ~7MN, 3*m*g remains > ~6.5? at dry 3*220000*9.81=6.47MN, so cap after ~ maybe mass <= 7.014/(3*9.81)=238,? at late burn cap. zero after burn.
- g(h) = g0*(R/(R+h))^2.
- pitch: 0 at liftoff; after 10 starts grow gravity turn, reaching ~0.5 rad at 150s, never decreases. Need define function. Could use piecewise: if t<=10:0; else if t<=150: 0.5 * smooth? Need about 0.5 at 150. Could use t between 10-150: 0.5 * ((t-10)/140)^? maybe smoothstep? "starts to grow" and gravity turn; use 0.5 * (smoothstep?) but pitch must monotonic. After 150 maybe continue to ~ maybe 1.4 rad by 300? Need orbit-ish. But state pitch never decreases. We can after 150 slowly increase to 1.35 maybe. Need avoid horizontal too much? Simulated ascent. We can use target pitch function: t <=10 0; 10-150 pitch = 0.5 * smoothstep? maybe linear perhaps gravity turn. After 150 pitch = 0.5 + 0.85*(1-exp(-(t-150)/120))? monotonic. Or simple pitch = min(1.5, 0.5*(t-10)/140) for 10..150 -> at 150=0.5. After 150: 0.5 + 0.9*(1-exp(-(t-150)/150)) approaches 1.4. Keep never decreases. At t<10 zero.
- Equations: vertical acceleration a_y = (T*cos(pitch))/m - g(h) (if thrust active). Horizontal a_x = (T*sin(pitch))/m, maybe direction x positive. Need integrate with fixed substep <=0.02. Use velocity integration, position. "rocket cannot go below pad": if y<0 set y=0 and vy=max(0,vy); on pad initial until thrust > weight? thrust/weight 1.3 so accelerates immediately. Need also maybe x.
- state t, alt (m), vel (m/s) probably vertical? state.vel ambiguity likely vertical velocity. speed = magnitude. acc = net vertical acceleration. pitch, speed. We'll set vel = vy. acc = a_y. speed = sqrt(vx^2+vy^2). altitude = y.
- trail one point per step() call, not per substep. world points of rocket. trail same array reset but emptied. One per step() call. Should push after step call maybe rocket position. If paused, step not called.
- dt any, use substeps inside. Need handle negative? clamp 0? If dt<=0 no push? Step advances by dt; one trail per call. Use remaining, max 0.02. Must integrate accurately. Use t increments. If huge dt (e.g. 1000s), loop 50k okay. Need perhaps trail push even if dt >0. One point at final position. Should maybe push current after step. If dt 0? one per call maybe push? We can push if dt>0? Requirement "one per step() call" maybe if step(0), still one. We'll push always? But render loop only calls when not paused. Good.
- Playback speed: state().speed returns current value. But "speed" is the time scale. However state() also has speed (m/s)? They explicitly list state(): { ..., speed } and later "state().speed returns the current value". Contradiction: state speed used for time scale, not rocket velocity? They list velocity separately: `{ t, alt (m), vel (m/s), acc ..., pitch, speed }`, then playback speed ... state().speed returns current value. Likely `speed` should be playback speed time scale, not rocket speed magnitude. But earlier state object speed ambiguous. They call "velocity" maybe vel. We need obey later: state().speed returns current value (time scale). So state.speed = timeScale. Speed (rocket) not exposed? We can add `velocity` or `speedMagnitude` extra. But schema says speed likely time scale per explicit. Use state().speed = timeScale. Could include extra `v` maybe no issue. Need display velocity from vel or compute magnitude. State() should t alt vel acc pitch speed. We'll return speed current time scale; maybe also speedMagnitude extra. For overlay velocity use state().vel vertical? Better compute horizontal too.

- Viewer choice keys 1,2,3 set x1,x10,x30. But at liftoff t<10 speed must be 1 regardless? "speed is the time scale. It is 1 for the liftoff (t < 10 s) and then 10, unless the viewer chose a speed: keys 1, 2, 3 (and three buttons) set x1, x10, x30. state().speed returns current value; reset() clears viewer's choice." Interpret: default speed = 1 for t<10 then 10. But keys set viewer's choice to 1,10,30; if chosen, speed that regardless? But t<10 must be 1 for liftoff? "It is 1 for liftoff (t<10), and then 10, unless viewer chose a speed." Viewer choice maybe overrides all, including t<10? Need ensure state().speed returns current. We can implement: if userSpeed !== null return userSpeed. Else t<10 ? 1 : 10. reset clears userSpeed. For buttons keys 1,2,3. At t<10 default 1. If user presses 30, speed 30 maybe liftoff fast. Fine.

- Render loop step(min(delta,1/30)*speed) when not paused. Here speed from __rocket.state().speed perhaps.

Need render and visuals.

Implementation plan:

Set up renderer physically based:
- WebGLRenderer antialias true, powerPreference.
- toneMapping ACESFilmic, toneMappingExposure maybe 1.0, outputColorSpace SRGBColorSpace.
- shadowMap enabled PCFSoft.
- append canvas.
- scene, camera Perspective 45, near .1, far maybe 1e7? Need space and Earth. Use logarithmicDepthBuffer maybe true to handle huge distances? For 6.37e6 and near low, logarithmic depth needed. Set renderer with logarithmicDepthBuffer: true maybe. camera.near=0.5? During chase near 1? We can update near far maybe far 1e8. Use near 1, far 2e7? Rocket camera near rocket within 100m and need Earth. logarithmic depth works. Set near 0.5, far 1e8. Renderer logarithmicDepthBuffer true.
- FogExp2? Haze toward distance. But when altitude high, need no fog? Use scene.fog = new THREE.FogExp2(0xa8c7dd, maybe 0.00001); at ground. As altitude up scale density exponentially. But fog would make rocket in high altitude fog? Can reduce with altitude. We can update fog density = base * exp(-alt/8000) perhaps. For visual aerial perspective, use linear Fog? FogExp2 with density based on camera altitude? Hmm. It affects distant Earth. Use FogExp2 low density 0.000035 at ground, reduce above 15km. At high altitude maybe zero. But Earth distant should pale blue due to atmosphere. We can have a separate atmosphere shell? Simpler: fog for low altitude; at high, sky shader handles. To see Earth, create huge ground plane / sphere? Need coastal landscape and Earth curve from altitude.

Sky from blue to black driven by rocket altitude. Use Sky addon? It simulates atmosphere, but to get black at 100km maybe adjust sun and turbidity? Sky addon doesn't know altitude. Could implement our own sky shader dome that changes based altitude, plus stars. But requirement says atmospheric scattering in sky (e.g. Sky addon or own shader). We can create own shader sky to have full control. Need stars above 70km. We can use a large sphere with BackSide custom shader, uniforms zenithColor/horizon/sun direction, altitude factor. Or use Sky addon and overlay black? Own shader easier and no import concerns. But prompt says "e.g." so okay. Need physical materials, shadows, bloom. UnrealBloomPass maybe import. Could implement own postprocess? Better use addons. Need compile. We'll use EffectComposer + RenderPass + UnrealBloomPass. Need set pixel ratio. With strict types, import okay. We need maybe output pass? EffectComposer by default writes to screen? RenderPass etc. Tone mapping applied by renderer and bloom? Should work. Avoid OutputPass maybe addon. We can import OutputPass 'three/addons/postprocessing/OutputPass.js' to ensure color. But with composer and ACES, bloom pass after tone? In newer three, OutputPass applies tone mapping. If renderer.toneMapping set, RenderPass renders to target with toneMapping? Actually EffectComposer render targets use HalfFloat, renderer tone mapping might not apply until OutputPass. Need import OutputPass. But strict type. We'll use maybe simpler: renderer.toneMapping ACES, composer with RenderPass, UnrealBloomPass, OutputPass. Need set renderer.toneMapping. OutputPass supports tone mapping. Fine. Must ensure bloom selective? It will bloom whole scene; high intensity sky maybe. Set threshold 0.8, strength 0.7. Flame bright.

Need build landscape:
- Ground plane with green scrub texture. Because scale 1 unit=1m, camera near 10-100m. Ground extends far. Use a large plane e.g. 20,000 x 20,000 for land? But Earth curve. Could use a huge circle for ground and ocean horizon. Cape Canaveral flat. We need ocean behind pad. Could create a land plane (green) 4km and ocean plane extending to horizon at y=-0.5 behind? But camera looking from near rocket to coast. Coordinate and camera chase upward, need coastline visible. Make ground large plane 8000 x 8000 land, ocean at y=-0.3 extending 200,000 in z positive? Let pad near coast. Orientation: Ocean behind pad along -z? Camera low near pad maybe at (120, 8, 80) looking at rocket. We need ocean horizon behind pad. Put ocean on +z beyond z=800? Land on z<800. Let's choose pad at origin. North maybe +x. Ocean to east +x? Simplify: coastline at z=1000, land for z<1000 and ocean for z>1000. Camera near z=100, ocean behind rocket? If camera at z=-120 looking at origin, ocean behind it? We need ocean in background behind pad as seen from camera, so ocean should be +z and camera at -z looking +z. Put camera (80, 12, -100) looking origin; ocean at z>800 behind rocket. Good. But low camera near pad looking up at liftoff: camera at (90,6,-110) looking at rocket base/tower. Ocean behind.

- Ground: plane geometry 6000x? Maybe green with procedural texture. Vegetation: use many soft sprite/particle? We can make scrub bushes with InstancedMesh low-poly? Realistic enough. Use ground texture from canvas with noise, green/brown. Add thousands of instanced low bush spheres/planes? Maybe expensive but manageable. For launch photograph, low camera can see scrub. Use InstancedMesh cones/spheres with green material and random scales. Maybe 2000 instances within 1500m. But from high altitude, ground. Simpler create ground texture procedural and add instanced grass tufts/bushes at distances. Shadows from sun.

- Roads and low buildings: create road as plane strips, dark asphalt, buildings boxes off to side. Launch pad area.

Pad:
- concrete circular/rect slab maybe 120x120, y=0.5. Use texture. Flame trench: dark trench maybe a rectangular depression with two raised sides, under rocket to one side. Could use simple black boxes/planes and an opening. Since rocket 3.7m diameter, pad maybe 80m. Use concrete texture.
- launch tower: lattice next to rocket. Build using cylinders/boxes for vertical columns and cross braces. 70m tall maybe 80. Red/gray. At x=12, z=0. Need physically. Use Instanced? Simpler create function latticeTower(width,depth,height) with 4 vertical beams and horizontal/vertical cross-braces using cylinders between points. Use box geometry for beams. Many meshes (~100) fine. Need compile and render. Place tower at x=12? Rocket radius 1.85, tower width 8, center x=8? To avoid intersect maybe tower center x=9.5, width 6. Need near rocket. Tall ~85m.
- Lightning masts: tall lattice masts around pad, e.g. 4 at corners radius 70m, height 100m, thin. Use same function with scale. Add cables maybe line segments. Could use LineBasicMaterial. Fine.
- Pad flame trench: black rectangular trench extending from center toward +z? With concrete walls. Add a dark slot under rocket maybe 20x12. Maybe flame exhaust side. Not physically but visual.

Rocket:
70m tall, diameter 3.7. Body cylinder radius 1.85 height ~55? Full 70 incl fairing. Falcon 9: first stage 42.6m, interstage 3m, second stage ~11m, fairing ~13m. Build group with base at y=0. When physics alt h means base altitude above pad? At pad alt 0. Rocket group position.y = padTop + alt? We'll set pad top y=0.4, and rocket base at pad top. Physics alt from 0; visually group position y = padTop + alt. On pad, rocket base at y=0.5. Need state alt true h measured from pad? "alt (m)" likely altitude above pad. We can use h from 0. For visual altitude relative sea level add pad top? negligible. Set group y = padTop + alt. Camera target should follow rocket center = group.y + maybe 35. Physics h plus pad top okay.

Rocket components:
- material white: MeshStandardMaterial({color:0xf5f5f5, roughness:0.55, metalness:0.1}); maybe use clearcoat? MeshPhysicalMaterial for body? Physically based. Use MeshStandard for many.
- body: main cylinder radius 1.85 height 45 from y=6 to 51? Engine section lower y 0-6. Need base. Let's define local y from base 0 to 70:
  - engine section y=0..5.5 with dark gray, slightly tapered? Use cylinder radius 1.9 height 5.5.
  - first stage tank y=5.5..46.5 white, cylinder radius 1.85 height 41.
  - interstage dark band y=45..48 maybe dark gray.
  - second stage white y=48..57 height 9.
  - fairing nose: from y=57 to 70, use cylinder+cone or lathe. White fairing, diameter 3.7 height 6 cylinder then ogive nose (cone/ sphere). Could create LatheGeometry points profile. Use mesh physical.
- dark band and interstage. Markings: flag and lettering via canvas texture. Create canvas 512x1024 with transparent? Use CanvasTexture. Add to body as separate plane wrapped? A CanvasTexture applied to body cylinder material map would wrap all around with white background? We can create a texture for the whole body with white background and markings, but need high enough. Simpler create decal plane attached to front side of body, with canvas texture transparent containing flag and "FALCON 9"/"SPACEX" lettering. Plane size maybe 8x4, positioned at radius+0.02 on z side (front toward camera). But "markings (a flag and lettering drawn on canvas texture)" satisfied. Could create two planes: flag and text. Use one canvas 512x256 with transparent bg; draw US flag and "SPACEX" / "FALCON 9". Place on -z side facing camera? Camera is -z, rocket front -z. Body cylinder at x=0,z=0. plane at z=-1.86, y maybe 32, width 6, height 3. Rotate? PlaneGeometry lies in xy plane facing +z. To face -z, rotation.y=Math.PI. But a plane at z=-1.86 with rotation y PI faces -z, camera at -z sees. Good. But curved body; plane flat. Fine.
- engine nozzles: 9 small cone/cylinder nozzles at base. Use ConeGeometry or cylinder. Merlin engines arranged 8 around + center. Use dark metallic. Extend down maybe y=-1.5? But rocket base at pad top; nozzles could sit above pad, flame from bottom. Set group base maybe pad + 2? Need rocket visual resting: engine section base at y=3? Let's set local base y=0 at nozzle exit, body starts y=4. Engine section 0..5.5. Nozzles extend to -1? If base at padTop, nozzles below pad. Better group position y=padTop + 3 (nozzle bottom at pad). But state alt = 0 should be on pad. Define rocket group local origin at nozzle exit y=0, all geometry above. Height 70: engine nozzles y=0..4, engines. Body bottom y=4. So top at 70. Group position y = padY + alt. At pad, nozzle exits at padY+1 maybe. Add padY = 0.5. Good.

- flame plume: Need visual from nozzles. Could use sprite (canvas radial gradient) for core and plume meshes. Physical? Create cone/cylinder additive layered with shader? For bloom need bright. Use Sprites with additive blending and procedural gradient textures.
  - central blinding white-yellow core at nozzles: sprite with radial texture, scale 8x20? Mach diamonds: create chain of small bright sprites/cones below. Flicker.
  - plume grows longer/wider as air thins. A cone/cylinder mesh with additive shader, and sprites. Use a cylinder oriented downward with gradient shader? Simpler group of sprites scaled according to altitude and throttle. Could use THREE.Sprite with additive material, canvas texture. Need orient? Sprites always camera-facing, good for plume. For core at base, use several sprites overlapping. As air thins, plume scale grows. Need plume visible behind rocket and camera. Use `plumeGroup` child of rocket group at base. Sprites centered below nozzle with different offsets. However Sprite is always camera-facing, so plume column may not align downward. If sprites camera-facing, a long plume in y direction as sprite will face camera and show a vertical ellipse. Fine. Add chain of plume sprites along y downward, with colors. Could look like exhaust. For ascent, long: scale y 30-100. The sprite's y axis in screen? Sprite is billboard, scale.y vertical in world? Actually Sprite scale in local x/y; billboarding rotates to camera, so vertical is not guaranteed world vertical when camera looks up? Sprite billboard up is camera up? Three Sprite uses camera-facing with up in camera plane, so scale.y is screen vertical. If camera not looking down, plume should extend downward relative rocket; but a camera-facing plume will be okay-ish. Better use Mesh cones with additive shader for physical orientation and sprites for glow. The camera chases close; plume is below rocket. Use cylinder/cone mesh with transparent additive gradient via ShaderMaterial. Cone axis along local y, point downward? Use geometry cylinder radiusTop 2, radiusBottom maybe 5, height 30, open. The rocket base at local y=0, plume extends downward negative y, so position y=-plumeLength/2. Cylinder geometry oriented y. Add shader with uv gradient and noise, additive. Add sprite at top and some diamonds. Use cone with wider bottom? Exhaust expands. Could use lathe geometry. But easier shader cone: CylinderGeometry(radiusTop=1.8, radiusBottom=6, height=40, radialSegments=32, 1, true). But top at y=20, bottom y=-20. Need attach top at nozzle y=0 => mesh.position.y=-height/2. Material transparent additive, side DoubleSide, depthWrite false. Shader gradient: alpha high at top, fading down, noise. Color white-yellow at top -> orange at bottom. This mesh can scale x,z with altitude. It will look cone. Need flame orientation. Use `uTime`, `uAltitude`, `uThrottle`; shader uses uv y and pseudo-noise. Add bloom? Bloom pass bright. MeshBasicMaterial? Shader supports additive.
  - Mach diamonds: series of glowing sprites along axis below nozzle for first 100s. Use Sprite with texture. We can make 5 small sprites at local y -3,-6 etc, with scales, visible near sea level. But if camera chase, okay.
  - Light from plume: PointLight orange at rocket base, intensity flickers. At pad, shadows? PointLight castShadow? Expensive. Use non-shadow point light and directional sun shadows. Flame lights pad and rocket. Add point light with intensity varying, distance 200. Need maybe castShadow false.
  - Smoke/steam clouds: Many soft particles (sprites) generated at liftoff, roll sideways out of flame trench and rise. Need maintain arrays. At t > 0 thrust and maybe until 20s; create particles each frame/time with random positions around pad and trench. Use THREE.Points? Sprites need per-particle scale, rotation. A Points shader with soft circular texture can produce many. But each point size attenuation and opacity. Could use custom ShaderMaterial Points, with attributes (position, size, opacity, color, age). At each render update. Need soft volumetric. Use 600-1000 points. For realistic billowing, use sprite particles with per-particle individual sprite? 400 sprites as THREE.Sprite objects is heavy but okay; each shares texture/material but scale/opacity require cloned materials? Sprite material can have per-sprite opacity? If same material cannot. Use Points custom shader with per-particle attributes, best. Build BufferGeometry, attributes position (3), size, alpha, seed. Shader with soft particle texture procedurally in fragment (radial and noise) no external texture. PointsMaterial custom vertex sets gl_PointSize based on size/distance. In shader, discard outside, soft alpha with radial gradient, color white/gray. Additive? Smoke should normal blending with alpha, maybe use NormalBlending, depthWrite false. Big soft particles. They can overlap and look volumetric. Need per-particle color maybe.

- Contrails: trail array from sim, one point per step. Render as Line with vertex positions, white translucent. But if trail points are world positions of rocket. Add a `Line` geometry with dynamic BufferAttribute. Since trail can be long (thousands). Cap? Requirement trail array world points one per step. Visual line from points. Reallocate buffer maybe 10000. Set drawRange. Use LineBasicMaterial white transparent opacity 0.6, depthWrite false. It will be a thin line. Need visible white contrail behind rocket, maybe make line wide? Could use multiple parallel lines or use TubeGeometry update? Simpler line plus points (sprites) along trail? Requirement visible. Use LineBasic + maybe `THREE.Points` with smoke texture along trail? We can create a second BufferGeometry points for trail puffs, using same positions and a soft texture, sizes depending altitude. But line at large scale. Could use custom shader line? Fine. Use line with opacity. As rocket rises, trail appears.

- The trail should be from trail points. Need update geometry from window.__rocket.trail. Could add every frame. If default speed 10 and render 60fps, each step advances ~0.166s and one trail point per frame. Over 200s sim => ~1200 points. Fine. At x30 and dt 0.033 => 1s sim per frame, 1200 points. Fine. Allocate 20000. Render line. Use `setDrawRange(0,count)`. Need positions array. Points every step maybe. At high altitude contrail drifting slowly. Could update positions? Trail points static world. "contrail stays in the sky and drifts slowly." We can render a separate Points cloud along trail with drift offset? Or modify display positions by wind offset based age without changing __rocket.trail. Since rendering line directly no drift. We can create a Points system from trail points and add a slow drift based point index/time. Could still use trail array. Simpler: every frame, create display positions = trail points + wind * age. But line would drift too. Use buffer and per frame update. Could implement contrail Points with drifting positions computed from trail points. A white line is enough. But "trail visible white contrail" plus "contrail stays and drifts slowly" maybe add Points with fade and drift. Use custom Points material with soft circle texture. Number of trail points maybe 6000; update positions each frame. We can fill buffer. Use Points with size maybe 8-40 (larger as air thins) and opacity low. But trail points one per step may be dense enough. Could also add line.

- Camera:
  low near pad looking up at liftoff; once rocket clears tower, viewer travels with it within 100 m, smooth motion; view coast, Earth curve, space.
  Need dynamic camera. Use camera control logic based on state/t. Start at (85, 8, -115) looking at rocket center (0, 20, 0). Low near pad. As rocket climbs and clears tower (~85m maybe t ~6s), switch to chase. Need smooth. We can have a chase camera position relative to rocket with e.g. offset (80, 12, -80) maybe within 100. For high altitude, use offset (70, 20, -70) normalized, length ~100. Camera looks at rocket center and beyond maybe. Need maintain horizon/coast visible. Chase position can be around rocket with same offset in x,z and y. During early liftoff, camera stays at pad. After rocket clears tower, camera begins to follow, smoothing. At high altitude, the coast/earth should be visible by camera orientation: if camera near rocket looking at rocket, background includes Earth below. Need look at rocket plus maybe slight. We can compute desired camera relative to rocket: offset vector (75, 10, -75) (world), distance ~107. But within about 100; scale to 90. At high alt, earth curve visible in background if camera looks slightly down? If camera is at rocket center + offset, looking at rocket, behind rocket is sky/space, Earth below. From low orbit altitude maybe 300km? Simulation may reach? Need determine. With physics burn 200s, maybe altitude 150-500km? Let's estimate: Thrust 7MN, mass 550t => a ~12.8 m/s2 - 9.8 = 3 m/s2 initially. After 200s mass 220t, T capped 3mg around late; acceleration maybe up to ~? With pitch grows horizontal, vertical might still. Burn 200s. Delta-v maybe maybe 3-6 km/s. At 200s altitude maybe 130 km? Let's approximate. Average vertical acceleration maybe 10 m/s2, t=200 => v 2km/s, alt 200km if vertical. Pitch reduces vertical. Likely 150-250km. Good, Earth curve visible. We can switch camera to focus on Earth? Need "view of coast, curve of Earth and then space seen from near rocket all way up." With camera close to rocket, horizon/earth visible. At high, camera should perhaps be oriented to include rocket and Earth. Look at rocket, Earth below. We can set camera offset with some sideways/up so Earth appears. Maybe camera position = rocket pos + offset (120, 25, -120) and look at rocket pos + (0, 20, 0). At 200km altitude, looking horizontally behind rocket, Earth horizon below. Good.

  Need smooth camera: use damped lerp for position and target. At pad before liftoff, camera fixed; after t>6 and alt > 90 (clears tower), desired chase. We can use `camera.position.lerp(desiredPos, 1 - exp(-k*dt))` with dt real frame; target also lerp. Need transition smooth. Use state alt. Maybe start chase at alt>90. At very low, desired is local pad camera. At high, desired follows rocket. Use blend factor smooth based altitude. Could simply compute chase weight = smoothstep(80, 200, alt). desiredPos = lerp(padCamPos, chasePos, w). But padCamPos fixed at ground; as rocket alt high, if w transitions, camera flies from pad to rocket over alt 80-200 (2s maybe fast). Need smooth. Alternative camera always damp follows desired. Desired = if alt<100 padCam; else rocket relative plus maybe. At alt crossing, camera will lerp. But if rocket speed ~100 m/s, by alt 100, it may be 200m away; follow quickly. Smooth. Use camera pos damping. For high altitudes, chase offset.

  To keep rocket and Earth: chase position relative to rocket with distance ~95 and above? e.g. offset = (80, 30, -60) maybe. Looking at rocket + (0,15,0). From there, Earth below/behind. Need camera "within about 100 m". distance sqrt(80^2+30^2+60^2)=104. Use (65,25,-65)=94.5. Good. But at pad if camera is (80, 8, -110) distance ~136, okay.

  At high, maybe camera should rotate / offset follow heading? The rocket pitches and moves horizontally. We can orient chase offset in world; if rocket travels +x, camera relative (65,25,-65) always sees from southeast. Good. At space, star background visible.

  At high altitude, the horizon/earth. Maybe camera look target = rocket center + horizontal direction? If look at rocket at altitude, camera orientation downward slightly? Rocket center at 200km, camera +25 y, look at rocket => downward angle small. Earth below is far down, likely out of FOV if camera level. From 200km, Earth horizon at ~? For altitude 200km, horizon dips ~14°, and Earth occupies lower half of view. If camera looks at rocket (slightly down), the Earth below is within FOV 45? Should see. Good.

- Sky:
  own shader on large sphere / box. Could create `SphereGeometry(1e6, 32, 16)` BackSide with ShaderMaterial, depthWrite false, fog false. Need ensure not clipped. Set renderOrder -1000, frustumCulled false and maybe scale. It should follow camera? Since sphere centered at camera? It can be at origin huge, camera within. Far 1e8 so visible. But at high altitude camera y=200km, sphere radius maybe 1.5e7, still inside. Good. Use uniforms `uAltitude`, `uSunDir`, etc. Vertex passes world direction. Fragment computes gradient: horizon color vs zenith. At ground: zenith blue 0x2b6bb5, horizon pale 0xcfe0e8. As altitude increases, zenith transitions to dark blue -> black; horizon maybe blue. Need stars. We can add stars as Points in separate object or in sky shader. Better add a stars Points sphere radius maybe 1e6 centered at origin? At camera moving, star sphere fixed. Use Points with many random stars on unit sphere, scale to huge radius 5e7, centered at origin. Need stars visible above 70km; control Points material opacity based altitude. But at camera at 200km, star sphere radius 5e7 still. Use `depthWrite:false`, `fog:false`, renderOrder -100. Size maybe 0.8? PointsMaterial sizeAttenuation false maybe; use shader with gl_PointSize. Simple Points with size 1.5 pixels and opacity. But renderer pixel ratio changes. Use PointsMaterial size 1.5, sizeAttenuation false, transparent, opacity. Add to scene, maybe parent to camera? If parent to camera, stars always around. But sky sphere fixed at origin also okay. Let's create starfield group centered on camera each frame? Simpler: star geometry positions on sphere radius 1 (unit), Points object at camera position each frame. Use PointsMaterial size=1.5 (sizeAttenuation false). Parent to camera? If add to camera, it's in camera local coordinates and star positions on sphere. Camera far covers. But camera child will be affected by camera rotation, good. `camera.add(stars)`, scene.add(camera) maybe. However camera is not in scene by default? Need add camera to scene for children. Add scene.add(camera). But scene camera not typical; okay. Star Points at local positions sphere radius 1000? With size attenuation false. Set material opacity based altitude. Need renderOrder maybe. Stars draw over sky. But if star points behind objects? They are at radius 1000 from camera, depth test with sky? Sky sphere depthWrite false, stars depthWrite false; transparent order. We can render sky first then stars. Since renderer sorts transparent by distance. The sky material is ShaderMaterial transparent? Set depthTest false, depthWrite false, renderOrder -1000. Stars renderOrder -999. They appear behind scene but over sky. Good.

  Sky shader also stars? We can implement stars in shader for more control. But Points easier. Need stars appear above 70km, clearly at 100km. Set opacity smoothstep(70e3, 100e3, alt). Stars still visible at high. At ground 0.

  Sun in sky: maybe add sun disk? Could add using shader based sun direction. But the scene has directional sunlight. We can include sun glow in sky shader. Could also add lens flare? not necessary. Use sun direction uniform.

  Sky shader: use direction normalized. `vWorldPosition` maybe. Since sphere centered at camera? If large sphere at origin and camera at 200km, view direction not simply normalized(position) but relative to camera; with radius huge okay. Better parent sky to camera? If sky mesh add to camera and scale huge, then geometry unit sphere, fragment uses local normalized position. But when camera moves, rotates, sky follows. Need camera added to scene. Use a mesh with SphereGeometry(1, 32, 16), BackSide, material side BackSide, parent camera, scale 9000? If scale 9000 then near/far? It is relative to camera at origin, far 1e8. Use radius 9000, far fine. Sky follows camera and all. Shader computes local direction. This avoids giant object. But if camera near far 1e8, 9000 okay. Need ensure stars child of camera at radius maybe 8000. Sky at 9000. Rendering order. Good. Add sky and stars to camera. But camera added to scene. Good. The sky should not be fog affected. No fog for shader.

  Vertex shader for sky: varying vec3 vDir = position normalized? For sphere geometry local positions. Fragment: 
    float h = pow(max(vDir.y,0),0.5);
    vec3 zenith = mix(vec3(0.08,0.28,0.75), vec3(0.0,0.02,0.08), uAltFactor);
    maybe ground below horizon? Need horizon haze. vDir.y from -1 to 1. Use horizon band. At altitude, lower hemisphere may show Earth? Sky sphere behind Earth; ground/ocean cover low. But at high, earth sphere should occupy lower view. We can let sky color dark below horizon; earth render. Need Earth below.

  Sky altitude: `uSpace = smoothstep(30000, 100000, alt)` for black; `uHigh = smoothstep(0, 60000, alt)`.
    zenith = mix(groundZenith (0.15,0.4,0.8), black, uSpace)
    horizon = mix(paleHaze (0.65,0.78,0.86), deep blue maybe, uHigh)
    Below horizon maybe dark blue/earth.
    sun glow: dot(dir, sunDir), add orange/white glow near sun and a bright disk. At ground atmosphere: add sun haze. At space, sun disk bright.
    Use `toneMapped: false`? ShaderMaterial with toneMapped maybe true? Need colors. We can set `toneMapped: false` maybe to keep? But ACES; sky can be bright. Let's set toneMapped false? OutputPass will tone map. For custom ShaderMaterial, color values as linear. Use moderate. If toneMapped false, renderer won't apply tone mapping? But OutputPass applies. Need manage. Simpler okay.

  Stars: Points with random directions, opacities. Use custom shader points with `uOpacity`; color white/blue. Size 1.5 maybe. Better use ShaderMaterial for stars:
    vertex: `gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = size * (0.8+0.6*aRand);` but sizeAttenuation? Since camera child at radius 7000, points small. Need fixed pixels: `gl_PointSize = uPixelRatio * size;` no attenuation. fragment soft circle. 
  Use BufferGeometry with position on sphere radius 1? Actually if Points as camera child and scaled? Vertex positions on unit sphere; camera child scale not. Projection maps. With radius 1 and camera near .5, they are very close and inside? Points rendered at radius 1 from camera; near .5, far huge, okay. But points behind camera clipped. Use radius 5000. In camera local, camera at origin looking -z. points on sphere 5000. `uPixelRatio`.
  Fragment: circle with glow, alpha uOpacity. Color maybe. Add `transparent`, `depthWrite:false`, `depthTest:false`? Stars should be occluded by Earth? At high, Earth may occlude lower stars. If depthTest false, stars over earth. Need stars only above horizon maybe. We can generate positions only upper hemisphere? But as camera rotates, stars all around. At high altitude, stars in sky should show; Earth blocks lower half. With depthTest true, Earth render depth occludes stars. But stars at radius 5000, Earth at distance 6.3e6? Wait rocket at altitude 200km, Earth surface below ~200km, so Earth closer than 5000? 200,000 > 5000, so stars sphere at 5000 would be in front of Earth, wrong. Actually stars should be at huge distance. If camera child at radius 5000, and Earth surface 200km away, stars at 5km would draw in front of Earth when depth test, not correct. Need set depthTest false and rely on star positions above horizon? Or set stars at huge radius e.g. 1e7 > Earth distance, but far plane 1e8, okay. If camera child radius 1e7, points at 1e7, depth test with Earth at 200km => Earth occludes. But with far 1e8, okay. However point size and precision? fine. Use sky sphere radius 8e6? At 200km alt, sphere should encompass Earth? If parent to camera radius 8e6, Earth surface at 200km in front, depth works. But sky mesh at radius 9e6, behind Earth? Earth distance 200km, so sky behind Earth, good. But if camera gets above 8e6? unlikely. Ground/sky draw. At low altitude, sky radius 9e6, fine. Far 1e8. Use camera child sky sphere radius 8e6, stars 7e6? Wait sky radius 9e6, stars should be behind sky but sky depthWrite false. Stars at 8e6. With depthTest true, Earth at 200km occludes both. But sky depthWrite false so stars don't care. Transparent sorting? Sky renderOrder -1000, stars -999. Good. Stars at depth. Fine. At low alt, distant ocean plane maybe extends beyond 8e6? Need far less. Set ocean 100km etc. okay.
  However camera far 1e8, near 0.5 causes depth precision; logarithmic true helps. Good.
  Simpler set stars depthTest false and only generate upper hemisphere relative world? But camera rotates; no. Use depthTest true with huge radius.
  But star Points are children of camera, so their world positions move with camera; if camera at altitude 200km, radius 8e6, they are 8e6 away. Earth surface distance 200km, so Earth closer. Good. But sky sphere radius 9e6 also beyond Earth? At low altitude Earth is at ~radius 6.37e6 below, but the sky sphere centered at camera extends around; lower hemisphere at 9e6 below, Earth ground/ocean covers. Fine.
  Need sky sphere not occlude Earth due to depthWrite false; draw first. DepthTest false maybe. Set sky material depthTest false, depthWrite false. Stars depthWrite false, depthTest true? If sky depthTest false no depth. Stars depth test with Earth. But if sky rendered with depthWrite false, stars can be tested against Earth only. Good. However transparent objects render after opaque, so stars after Earth, depth test sees depth buffer from Earth. good. At low, ocean covers lower. At high, Earth mesh (a huge sphere) covers. Fine.

Need Earth sphere for curve at high altitude. We need a large Earth surface. Could use sphere radius R centered at (0,-R,0) with green/blue material? But we also have local ground plane. At low altitude, local ground plane enough. As rocket climbs, the horizon should curve and show Earth. We can render a giant Earth sphere beneath, with a procedural texture (ocean blue, land green). But Cape Canaveral local ground plane would z-fight with sphere. Could hide local ground above some altitude? Or use Earth sphere with local plane above? Need both. We can position Earth sphere center at (0, -R + maybe, 0), so its top surface at y=0 at origin, matching ground. At local area, sphere is nearly flat. But our ground plane at y=0.4. At high altitude, sphere visible. However if sphere radius 6.37e6 and geometry segments 128x64, camera near local ground, the sphere surface at origin flat enough. We can make local ground plane at y=0.3 but it covers only 20 km, sphere underneath. At high, sphere extends to horizon. Use Earth sphere material with procedural canvas texture? It will show large-scale ocean/land. But local ground plane is green and occupies up to 10 km. From orbit, it may look small patch. Fine.
  Earth sphere with `SphereGeometry(R, 128, 64)` centered at (0,-R + 0? top at y=0). To show ocean/land, need UV texture canvas with noise. Could use a MeshStandardMaterial with map. The texture should be generated 1024x512 with oceans and continents. But the exact coast? Need Florida coast. Hard to map at Cape. We can make local coastline at z=1000 with ocean plane, and for Earth sphere lower res. But high altitude the coast is visible maybe not accurate. Need enough realism.
  Alternative create a large curved Earth patch around launch site: use a very large plane with shader bending by Earth curvature. Simpler: create a ring/plane mesh with geometry vertices displaced by y = -(x^2+z^2)/(2R) for distances, colored land/ocean via shader. But local ground plane 20km, ocean horizon. For high altitude, need bigger. Use Earth sphere.

  Earth sphere material with procedural texture; ocean regions blue, land green/brown, but around origin need land coast. We can craft texture 1024x512 with a green landmass near a coordinate and ocean. But mapping and orientation complicated. At high, any Earth texture okay. At low, local ground plane dominates. Use sphere material MeshStandard with map texture representing Earth. Add clouds? optional.

  But Earth sphere top at y=0; local pad/ground at y=0.3 z-fight around local? The plane has depth offset. At y=0.5, above sphere. Fine. But if ground plane extends 20km, at edges, sphere surface below by ~15m at 20km (R=6371km, sag=-x^2/2R ~-31m), plane would float 31m above; from high, weird. We can make ground plane itself curved by modifying vertices with sag. Use a large plane with bend (Earth curvature). Need ocean too maybe. But local flat enough. Could hide ground plane above 20km altitude? At high, Earth sphere visible, local plane small. Use opacity? Not necessary. For high altitude, a flat 20km plane floating 30m above sphere maybe unnoticeable. Could build ground plane as a disk with curvature. Maybe better use a local `CurvedGround` plane 100km with vertices displaced to sphere: y = -(x^2+z^2)/(2R). But pad at center. Use PlaneGeometry(200000,200000,200,200) and displace y. Then it approximates Earth. Ocean can be part of the same ground with vertex colors/texture. Need coastline at z=1000. We can color land vs ocean via shader or texture. If texture generated covering 200km, with ocean region, but at 200km resolution poor. Could create shader with world position: if z>1000 and |x|<... ocean. But local needs green land, roads. Maybe use two meshes:
    - Earth sphere huge with blue/ocean texture.
    - Local land plane 40km x 40km green with curvature; ocean beyond coastline at z=2000 maybe another curved plane with blue, plus coast line.
  For high altitude, earth sphere with ocean/land.
  Could simply use Earth sphere and no local ocean plane? At low, the horizon ocean behind pad needs realistic. Use local land mesh 20km and local ocean mesh beyond. Earth sphere high.
  
  Need not be perfect; visual.

  Earth sphere can be hidden at low altitude or always. At low, its top at y= -0.5. Local ground covers. At high, show. Material: MeshStandard with a canvas texture (earth). Use `side: THREE.FrontSide`. Since camera above, sees outside. Need top at y= - maybe 0. Put ground at y=0.3.

  Earth curvature visible via sphere. Use texture with green and blue. Need use physically based material. For sun shadows? huge no.

  Maybe add atmospheric glow shell around Earth: sphere radius R+100km with shader transparent blue, additive? At high, see blue atmosphere. Use BackSide? An atmosphere shell slightly above Earth. Could create sphere radius R+120000, material transparent, side BackSide? Camera outside at altitude, need see shell; BackSide from outside sees interior? A shell around Earth should be visible from outside as a rim/glow. Use ShaderMaterial side DoubleSide, additive, alpha based Fresnel. Could add. But maybe not necessary.

  For stars visible above 70km. At high, Earth + stars.

- Sun: DirectionalLight positioned far, castShadow with shadow camera covering pad 300m. Need as rocket moves high, sun shadow? Sun shadows on rocket at high maybe not needed. Keep light target maybe at rocket? But shadow camera must update? Could set shadow camera large 500 and target at pad; at high rocket outside, no shadow but okay. Requirement shadows from sun for pad. At high, rocket can be lit without shadow? Fine. But to shadow rocket on itself? Not critical. Could add directional light with castShadow and update target to rocket? Large shadow map covering 1000m in chase would need re-render; maybe. We can update directional light position relative rocket and target at rocket, shadow camera 200, to shadow rocket? But at altitude, ground not visible. Use sun light target pad. For pad scene shadows, set shadow camera size 400. Good.
  Need sun intensity high, ambient/hemisphere for sky. Use HemisphereLight sky color / ground color. At high, ambient dark? We can adjust intensity with altitude. Sun stays. Add directional light at e.g. (-500,1000,500), intensity 3.5 (ACES). Use shadow map 2048.

- Procedural textures:
  - Concrete: canvas 512 with noise, cracks? Use CanvasTexture with repeat wrapping. Generate.
  - Ground/vegetation: canvas 1024 with green/brown noise, maybe small speckles. Repeat 80. Use color map plus roughness maybe.
  - Road: canvas 256 asphalt.
  - Earth: canvas 1024x512 with ocean blue and continents green/brown. Use.
  - Marking: canvas 512x256, flag and lettering.
  - Soot? maybe.

- Vegetation: InstancedMesh of low bushes using IcosahedronGeometry(1,0) maybe flattened, material green, random positions within 2km excluding pad. Cast shadows? 1000 instances cast shadow heavy but okay. Set castShadow true maybe. Might be slow. Use 800 with castShadow false? Requirement shadows from sun; main structures shadows. We can cast shadows for some. Use two InstancedMesh with 800 instances each of low bush (SphereGeometry scaled). Use `setMatrixAt`. Need random deterministic maybe. Use Math.random okay. Bushes at local ground y=0.5. But at distance, curved ground? Ignore. Limit within 3000m. Use `ConeGeometry`? Low scrub. Use `IcosahedronGeometry(1,1)` scaled. Material MeshStandard color 0x3d5d35 roughness. Add variation with instance colors. InstancedMesh supports setColorAt. Good.

  Trees? low scrub. Maybe add palm trees? not needed.

- Roads and buildings:
  - Roads: long boxes/planes. Road from pad to background, e.g. dark strips at y=0.55. Use plane rotate -PI/2. widths. A couple roads.
  - Low buildings: boxes with light gray roofs, some with flat roofs. Positions at x +/- etc. Need shadows. Create 10 buildings.

- Lattice tower:
  Need function createLattice(width, depth, height, material, beamThickness). Use boxes for posts and cross braces. Create group. Vertical posts at 4 corners. Horiz segment every 10m, diagonals on sides. Use helper createBeamBetween(p1,p2,thickness, mat, group). For box beam oriented along vector. Geometry BoxGeometry(thickness, thickness, length) oriented along z then quaternion setFromUnitVectors(Z, dir). For cross braces. Or use cylinder. Many boxes. Fine.
  Tower at x=10, z=0. Maybe extends 80m; top has swing arms. Add arms near top from tower to rocket at y=50 and 58 using thin boxes, maybe gray. Add umbilical arm.
  Lightning masts: 4 at positions (±70, ±70), height 90; create lattice narrow width 3. Cables from mast tops to ground? Use LineSegments. Need add maybe.

- Pad flame trench and details:
  - Concrete pad: BoxGeometry(100,1,100) at y=0? Top 0.5. Use concrete mat with map. Actually y=0.5, center at 0.5. top y=1.0? Need rocket base at pad top maybe 0.5. Let's set ground y=0, pad box 100x1x100 position y=0.5 => top 1.0. Rocket group padY=1.0. But scale 70m, 1m pad. okay.
  - Flame trench: A dark slot through pad under rocket, maybe box 20x0.6x60 at y=1.01 dark; plus two walls. But visual from above. We can make a black rectangular hole by placing dark box on top at y=1.01, size 18x0.1x70, extending +z. Flame trench out to side. Add concrete side walls. Since rocket sits over it. Add black opening perhaps 12x50. But rocket base at y=1 so trench top same. Could create black box at y=1.02. For side exhaust steam, particles spawn along z +? Smoke out of trench along ground to +z and sideways. 
  - Launch mount: gray support structure around base, maybe box ring. Add 4 hold-down clamps.
  - Water tower? no.

- Rocket engine flames: The rocket thrust should only be visible when t<200; at t==0 just engines start. We can show during burn and maybe after with decreasing? no.
  `isBurning = t < 200 && t>=0`, and maybe at reset t=0 burning immediately. At liftoff t<10, plume. After burnout no plume, contrail? The trail should continue. Good.
  Flicker via sine and random. Core intensity.
  Need flame light intensity update. Use PointLight at local base but attached to rocket group. If rocket high, light moves with rocket, illuminates rocket and nearby but not ground. At pad, it lights pad. Point light intensity flickers, distance 150. Maybe second point light at pad? Use one child of rocket at y=-2. At high, distance 200 still. Fine. castShadow false.

- Smoke particles should spawn at pad during first ~20s and continue maybe. At speed 10, liftoff 20s sim passes in 2s real. Need a lot. Could spawn based sim time intervals and use particle pool. Because render steps variable. We can implement a `SmokeSystem` with pool of N=1200 points. On each render frame, while simTime during 0..30, spawn particles at intervals maybe 0.08s sim, but simulation speed 10; spawn count based dtSim. Need world positions. They should roll sideways out of trench then rise. Use velocity in m/s. For each particle:
  - position spawn x random -8..8, y=1, z random 0..-? flame trench extends +z? Let's set trench extends +z 60m. Smoke shoots out +z and sideways. Spawn at x random ±4, y=1, z=0..5; velocity with z positive 20-50 m/s, x random ±10, y upward 2-10. Then drag and buoyancy. As they travel, y increases, z out. Need roll sideways along ground then rise.
  - age, life 8-20s (sim time); in render at speed 10 they vanish in 1-2 real sec. Might be fast. But flight speed 10. At liftoff t<10, speed 1, so first 10s real-time, smoke nice. After t 10 speed 10, the cloud will quickly evolve. Fine. For visual could use real-time? But requirement smoke should roll and rise. It is okay at 10x? Maybe make lifetime 20-30 sim s and render at speed. At t 10 speed jumps, clouds evolve faster, but camera chases too.
  - Since default speed jumps at t=10, smoke from pad will be left behind. Fine.
  - Use custom Points shader with per-particle color alpha size. Points positions/scale updated on CPU. Pool. Spawn count. Use deterministic? no.
  - Smoke appears also during ascent? At high altitude, exhaust plume expands. Could spawn contrail? Contrails particles based on trail.
  - Liftoff steam also from sound suppression water? At launch, huge white clouds. We'll create particles not only during first 10s but until 20s sim. Need visible at t=0 even before? At t=0 engines start, so spawn.
  - Need reset smoke when reset. We can detect `simTime < lastSmokeTime - 1` or if state.t < lastTime - .5 clear particles. Reset called externally. We can implement a reset listener? __rocket.reset is created; we can't easily hook? We can wrap reset method to also clear visual? We can define original reset then override to clear smoke/camera/trail. But `window.__rocket` object with reset. We can add our own onReset by monkey patching after creation:
    const rocket = createRocketSim();
    const origReset=rocket.reset; rocket.reset=()=>{origReset(); clearSmoke(); ...}
  Or simply detect t==0. At reset, lastSimTime may be large, need clear. In render loop, if t < lastT - 1, reset visuals. This handles.
  - Also trail reset array same object; visual geometry updates based length.

- Physics details.

Let's write a class or object.

Types:
interface RocketState { t:number; alt:number; vel:number; acc:number; pitch:number; speed:number; }
type TrailPoint = {x:number;y:number;z:number};
interface RocketSim { reset():void; step(dt:number):void; state(): RocketState; trail: TrailPoint[]; paused:boolean; }

Need expose (window as any).__rocket = rocket.

Implement internal variables: t=0, x=0, y=0, vx=0, vy=0, pitch=0. Mass. Use state computed.

`computePitch(t)` monotonic:
```
function pitchAt(t:number): number {
 if (t <= 10) return 0;
 if (t <= 150) {
   const u=(t-10)/140;
   return 0.5 * (u*u*(3-2*u)); // smoothstep, starts slow and ends 0.5; derivative zero at both ends maybe "starts to grow" okay
 }
 const u = t-150;
 return 0.5 + 0.85 * (1 - Math.exp(-u/90));
}
```
Monotonic, max 1.35. At t=200, .5+.85*(1-exp(-.555))=.5+.85*.426=.862. Horizontal. Maybe not enough for orbit but okay. If simulated after 200, continues horizontal acceleration none, gravity downward, pitch constant, falls? It can continue ballistic. At t=300 pitch 1.18. fine.
Need pitch never decreases independent of alt. Good.

Mass:
```
let m = t < burn ? m0 - (m0-dry)*(t/burn) : dry;
```
For thrust at t<burn. T0 = 1.3*m0*g0. Limited min(T0, 3*m*g0). Actually at late burn cap. Maybe throttle? `T = t < burn ? Math.min(T0, 3*m*g0) : 0;`
At t=0 T0 = 7.014e6, acceleration = 12.75 -9.81=2.94 m/s2. With pitch 0 vertical. Pad cannot go below. It rises. Good.
As mass decreases, thrust constant until cap. At t ~? m at cap = T0/(3g0)=7.014e6/(29.43)=238,333 kg. Burn reaches m=238k near t = (550-238)/(330)*200 = 189s. Cap only final 11s. Fine.
At t=100 mass 385k, thrust 7.014 MN, a=18.2-? weight g=9.8, net 8.4 vertical with cos pitch ~0.45? pitch at 100 ~? smoothstep(90/140=0.642) = 0.5*0.708=0.354; cos .938; vertical 17.1-9.8=7.3; horizontal 6.3. Good.
At t=200, mass 220k, T=min(7.014, 6.47)=6.47MN, a=29.4 m/s2, pitch .86, vertical 18.5-? altitude gravity ~? h maybe. Burnout. v maybe high. After 200 no thrust, gravity, follows ballistic.

But equation says "Thrust T = 1.3 m0 g0, limited to 3 m g0 ... and zero after burn." We did.

Vertical/horizontal acceleration. Need pitch relative to vertical; define thrust direction from vertical toward +x. 
```
const ax = T*Math.sin(pitch)/m;
const ay = T*Math.cos(pitch)/m - gAlt;
```
No drag. Velocity and position. When on pad, y=0, vy can be negative? Prevent. Also if t<0 reset. If y<=0 and vy<0, y=0; vy=0; maybe vertical acceleration should not include? But state.acc net vertical acceleration can be negative on pad? At start thrust > gravity, positive. okay. When falling after burnout, hit pad, clamp.

Integration with substeps <=0.02. Use semi-implicit Euler:
```
while rem>0:
  h=Math.min(0.02, rem)
  // compute at current t maybe mass at midpoint? Use t.
  const T=...
  const pitch=pitchAt(t) (or t+ h)
  ...
  vy += ay*h; vx += ax*h;
  x += vx*h; y += vy*h;
  if (y<0) { y=0; if(vy<0) vy=0; }
  t += h;
```
Could use midpoint/velocity Verlet but okay. Need acc state at current maybe after last step? Compute state.acc as net vertical acceleration at current t,y,m. State computes g, thrust, pitch, acc. `vel` = vy. `speed` per chosen timeScale. But maybe also add `vSpeed` extra? Not in interface. We can define return type with extra fields? Type interface allow extra? If function returns object literal with extra fields, structural okay. We can declare `state(): RocketState & { velocity: number }`? But exposed any. For our code, use `const s = rocket.state(); s.speed` is time scale. Need velocity magnitude for overlay: compute from internal? We can add `v`/`velocity` to state object not declared? TypeScript object can have extra okay when returned from function declared RocketState? It can include extra only if typed as any? In implementation we can return object with extra but function return type RocketState rejects excess? Return object literal assigned to interface with extra properties triggers excess property check? If function return type RocketState, object literal may have extra properties but excess property checks apply? I think yes for direct return. We can include optional `velocity` in interface. That's fine. Requirements only specify fields; extra okay.
Define:
```
interface RocketState { t; alt; vel; acc; pitch; speed; velocity:number; }
```
But `speed` time scale and `velocity` magnitude. Maybe not necessary to display velocity: use `alt` and `vel` maybe vertical. Overlay can show vertical velocity. But better compute from state? We can track last h speed separately. Add `vSpeed` optional? We can not expose? Use `const st = __rocket.state() as any;` and add `st.velocity` internally. Fine. Interface with velocity.

Actually phrase state().speed returns current time scale. Then what about rocket's speed? They have `vel`. Could be vertical velocity. We can put `vel` = vertical, `speed` = playback. We might add `velocity` extra. Overlay shows `st.vel` vertical, acceptable. But "velocity" maybe magnitude. Show vertical velocity with m/s. Fine.

Time scale:
variables `userSpeed: number | null = null;`
`function timeScale(): number { return userSpeed ?? (t < 10 ? 1 : 10); }`
keys: '1','2','3' => 1,10,30. `reset()` userSpeed = null.
`state().speed` returns timeScale.
`paused` boolean property. Need it in object. Use let paused = false; expose as property. In object, `paused` as bool. But if set from outside, should work. `paused: boolean` field. For render loop, reads `rocket.paused`.
Need keyboard controls and buttons. Page has no HTML, but we can create overlay/buttons via JS. Good.

When reset, trail array same object emptied. "trail: array ... keep same array object". In reset use `trail.length=0`.
Need reset to time 0, rocket on pad, trail emptied. Also clear visual? Hook via wrapper.

Implement createRocketSim:
```
function createRocketSim() {
 let t=0,x=0,y=0,vx=0,vy=0;
 let userSpeed:null|number=null;
 const trail: TrailPoint[]=[];
 const sim: RocketSim = {
  paused:false,
  trail,
  reset(){ t=0; x=0; y=0; vx=0; vy=0; userSpeed=null; trail.length=0; },
  step(dt){ if (!isFinite(dt) || dt<=0) { trail.push({x,y,z:0}); return; } ... trail.push({x,y,z:0}); },
  state(){ ... }
 };
 return sim;
}
```
If dt 0? one trail point? The render loop calls step only positive maybe. To be safe, if dt=0 push. If negative, set 0? `if (dt <=0) { trail.push(...); return; }`.
Need dt upper no limit by sim but render loop min. `step(any dt)`, so if huge dt (10000s), loops 500k, okay; maybe cap? No, must advance by dt. We can use adaptive substeps? Fixed <=0.02, loop. Could be 10^6. Fine. Avoid infinite for Infinity. If !finite return.
One trail point per call after advancement. z=0.
`state` acc compute:
```
function massAt(tt)...
function thrustAt(tt,m)...
const m=...
const T=...
const g=...
const pitch=pitchAt(tt)
const ay=(T*Math.cos(pitch))/m - g;
return { t, alt:y, vel:vy, acc:ay, pitch, speed:timeScale(), velocity: Math.hypot(vx,vy) };
```
At on pad before lift? t=0 T on, acc positive. Good.
Potential issue `vel` vertical, if rocket after gravity turn, vertical might decrease. overlay uses velocity magnitude via extra.

State speed uses `userSpeed` or default. At reset clears.

Need visuals update each frame:
- s = rocketSim.state().
- Determine if reset: if s.t < lastT - 0.5 or trail empty and lastT>0 maybe clear smoke, reset camera? Detect.
- Update rocket group position: `rocketGroup.position.set(s? x? physics x, padY + alt, 0)`. State doesn't expose horizontal x. Need expose x/z maybe optional. Requirement state only alt etc. But visual needs horizontal drift. We can add `x` extra to state. Or use trail last point x. Trail one per step, gives x. But state should know x. Add optional `x:number` and `z:number` to interface. `state()` returns x. Visual uses. Fine.
- Rocket should pitch? The rocket orientation in flight should follow pitch? In gravity turn, rocket tilts. For realism, rotate rocket group around z (or x) by pitch. Thrust is angled from vertical; the rocket should pitch over by pitch. Need rotate around z axis so body leans +x. `rocketGroup.rotation.z = -pitch`? In Three, rotation z positive rotates local y axis toward negative x? Actually rotating around z by angle θ maps local y (0,1,0) to (-sinθ, cosθ,0). So to point +x, set rotation.z = -pitch. Or use `rotation.z = -pitch`. Then engine exhaust points along +x/down. The flame attached to rocket rotates with it, good. But camera follows.
  At launch pitch 0.
  Need engine base position at rocket group origin. Group position = (x, padY + alt, 0). Since base y. Rotate around base origin. Good.

- Camera chase should target the rocket center (group local y maybe 35). If rotated, center = group.position + rotated local (0,35,0). Use `rocketCenter` from `rocketGroup.localToWorld(new Vector3(0,38,0))`. Avoid allocations maybe. Use vector.
  At high altitude, rocket rotated by pitch ~0.8, center moves +x by 35 sin. fine.
  Camera offset relative to rocket center? We can use world offset. Need distance <=100. 
  Low camera initial `(95, 7, -120)`, target rocket center maybe (0,25,0). Once alt > 80, chase. Desired position = center + (Math.cos? maybe -?).
  If rocket moves to +x, camera offset can be (70,25,-70). Distance 102. Looking at center + maybe forward. Need not collide. Use target = center. At high, maybe target = center + (0, -10, 0). Camera position should be offset from target distance 85. Let's define const offset = new Vector3(70, 22, -65); length 98. This places camera ahead? Rocket front maybe -z, camera -z, side. Good. But when rocket tilts +x, camera still south. 
  For smooth transition, compute desired:
```
const center = rocketGroup.localToWorld(new Vector3(0, 35, 0));
const padTarget = new Vector3(0, 25, 0); // before launch
const groundCam = new Vector3(95, 8, -125);
const chaseOffset = new Vector3(68, 20, -68).normalize().multiplyScalar(95);
const w = smoothstep(70, 140, s.alt);
desiredPos.lerpVectors(groundCam, center.clone().add(chaseOffset), w);
desiredTarget.lerpVectors(padTarget, center.clone().add(new Vector3(0, maybe 5,0)), w);
camera.position.lerp(desiredPos, 1 - exp(-2.5*dtReal));
currentLook.lerp(desiredTarget, 1 - exp(-3*dtReal));
camera.lookAt(currentLook);
```
But if w grows quickly while rocket is at 100m, lerp camera to near rocket over seconds. Good. At alt 70-140, transition. But at t<10, speed 1, altitude at t=10? Let's approximate. Initial net accel 2.94, by t=10 y ~147m, v 29.4. So rocket clears tower ~100m at t~8. Transition starts at alt 60. Speed jumps at t=10; camera follows. Good.
  At high, camera position follows rocket but with damping maybe lag due high speed. At x30 sim, rocket moves 1s per frame, lag could be tens of m. Use stronger damping? It's okay smooth but within 100 maybe. Use k 3-5. Since frame dt .016, exp(-5*dt)=0.92 lerp, lag ~ velocity*dt/5? At 30x, sim velocity maybe 3km/s, per frame movement 50m? Actually dt sim 1s, rocket moves 2km per frame, camera lags huge. At x30 after burn, camera would never catch up? The desired position changes by 2km each frame; exponential lerp with dt real only 0.016, factor .08 => lag 2km/frame /0.08 = 25km. Bad. Need camera follow based on sim time or use real delta and high damping. The render loop step 30x; rocket movement per frame large. We can use camera follow in simulated time? But smooth real motion. Set lerp factor based on stepSim maybe, maybe 1-exp(-5*simDt) -> at 1s sim factor .993, still lag 20m. But camera motion would be fast (since sim accelerated). We want chase within 100m always. Use direct camera position relative to rocket at high, with smoothing only on offset? Could use `camera.position.copy(center).add(offset)` at high, no lag; and smooth target? But requirement smooth camera motion. Since rocket moves fast, direct relative offset gives smooth motion (it follows). At transition, lerp. We can set camera directly for chase after alt > 150. Or use high k in real time. At x30, direct.
  Use a follow blend variable? Simpler: compute desired and set camera.position.lerp with damping factor `1 - Math.exp(-6 * Math.max(dtReal, simDt))`? At x30 simDt ~0.333, factor .86, lag ~1/6 * movement? If movement 1000m per frame, lag ~160m. Still >100. Use factor 1-exp(-20*simDt) ~0.999. Then camera almost direct. But transition from pad to chase then direct. We can use different damping when alt >300: direct copy desired. To maintain smooth, desired itself smoothly follows. At high, direct relative offset to rocket gives smooth camera due rocket.
  Implement:
```
const follow = smoothstep(55, 130, alt);
const desiredPos = groundCam * (1-follow) + chasePos*follow;
const desiredTarget...
if (follow > 0.95) {
  camera.position.copy(desiredPos); // maybe add smoothing on offset? no
  currentLook.copy(desiredTarget);
  camera.lookAt(currentLook);
} else {
  camera.position.lerp(desiredPos, 1-Math.exp(-4*dtReal));
  currentLook.lerp(desiredTarget, ...);
  camera.lookAt(currentLook);
}
```
But direct copy when follow > .95; at alt 130, rocket movement per frame at t~10 speed 10, movement ~3m/frame, fine. At x30 later, direct. Good. During follow, camera may smoothly transition. Set currentLook direct after. At reset, camera should return pad. Need detect t decrease and set to pad, clear smoke. Use resetVisuals.
  But if direct copy while rocket rotation? Camera orientation target direct. Smooth enough? There may be small discontinuities switching to direct. Could always use `camera.position.lerp(desired, 1-exp(-10*Math.max(dtReal, s.dtSim*?)))` but high speed. Direct is fine.

- Rocket visibility: At high, chase within 100m, rocket visible. Its total length 70; camera distance 95, FOV 45 shows rocket. Good.
- At liftoff, low camera sees rocket. Overlay.

- Flame updates:
  `plume.scale.set(1+altFactor*? )`. At ground, length 35, radius 5. At high, plume grows longer and wider: length 60 (or 100) and radius 12. But camera near rocket, if plume length 100, okay. Need throttle = T/T0 maybe, and burn. For t<200, visible. `uThrottle` maybe. At high, plume expands due vacuum: base radius scaling 2-3. Use `plume.scale.set(1+0.8*airThin, 1+1.5*airThin, 1+0.8*airThin)`? If geometry length base 40 and position child -20, scaling y changes top? If scaling around center, top moves. Need set pivot at top: create group at y=0 with cylinder geometry translated so top at 0: `new CylinderGeometry(1.6, 6, 1, 24,1,true)` then translate(0,-0.5,0) making top y=0 and bottom -1. Then scale y=length. Good. Use `plumeMesh.position.y=0`; geometry height 1, top 0, bottom -1. Scale y length; scale x,z width. Add shader. Great.
  The base radius top 1.6, bottom 6 at height 1. scale. Maybe as it grows, radius bottom 10. Use scale x 1+... 
  Shader:
```
vertex: varying uv, position; 
fragment:
vec2 uv... 
float y = vUv.y; // maybe 0 bottom,1 top? cylinder UV vertical? CylinderGeometry uv v from 0 bottom to 1 top maybe. Since translated, still.
float along = 1.0 - vUv.y; // top? 
...
```
Could implement `vPosition = position;` but scaled. Use uv. We need gradient from top bright to bottom transparent. In geometry translated, top at y=0 and bottom -1; UV v likely 1 at top? Need not exact; can use model local position.y after translation. Varying local position y in [-1,0]. In vertex after geometry translated, `vLocalY = position.y;` top 0, bottom -1. Fragment `float t = clamp(-vLocalY,0,1);` t=0 top,1 bottom. alpha= pow(1-t,1.5) with noise. color mix white-yellow at top, orange at bottom.
But scaling y changes geometry positions before vertex? The position attribute y range [-1,0], model scaled. vLocalY unaffected by scale? It is attribute, so t normalized 0-1. Good.
  Add noise by `sin` with uTime and position? Fragment can't see world pos unless varying. Use UV.x and vLocalY and uTime.
  Color: top white 7.0, mid yellow 3, bottom orange 0.5. For tone mapping, values maybe >1. Use additive, alpha.
  ShaderMaterial transparent, blending AdditiveBlending, depthWrite false, side DoubleSide. `uIntensity`.
  Need toneMapped: for ShaderMaterial default `toneMapped: true`? Three injects tone mapping based on material.toneMapped? For ShaderMaterial, tone mapping chunk not auto? Usually ShaderMaterial doesn't include tone mapping unless include. Fine.
  Add another inner white core cylinder smaller (radius 1.2->2.5, length) and a sprite core.
  Sprite core at y=-1, scale 10x8, material additive with radial texture. At high, scale 20. But sprite billboard. Good.
  Mach diamonds: create sprites with `createGlowTexture`, white, additive. Attach at y=-5, -9, -13, scale 2,3.5. Visibility if `s.alt < 30000` and burning, perhaps fade. But at ground, mach diamonds visible. Actually in vacuum no mach diamonds. Use opacity fade with altitude. Each sprite material clone to adjust opacity? We can create a group of sprites sharing material? opacity is material-wide. We can make one material and all same; okay, all fade together. Scale individually. Use `machGroup.visible` and material.opacity = clamp(1-alt/25000). Sprites material shared. Fine.
  Flame point light intensity flicker. At burn: base 15? Three physically correct lights intensity in candela? With renderer.useLegacyLights? In newer three r155 lights use physically correct by default (intensity in candela/lux?). MeshStandard with DirectionalLight intensity maybe 3. PointLight intensity maybe 5000 with decay 2 and distance? Need check. Three r155 removed useLegacyLights? Directional intensity 3 is okay. PointLight intensity with physically correct decay 2: need high values to illuminate at 10m. With intensity 2000, at 20m => 2000/400=5. Use 5000. Set distance 200, decay 2. Flicker 3000-8000. At high, distance maybe 500, intensity 20000? We can update. But this could blow. Use PointLight at plume base, color orange, intensity 1500? Hmm. In Three, point light `power` in watts. With intensity 500 and distance 200, at 50m illuminance .2? For visible on pad materials, need maybe 10000. Let's test mentally: point light intensity 1000, at distance 20 => 2.5. Good. At pad distance 50=>0.4. Use intensity 3000. Fine. Directional light 3. Add flame. 
  Set `flameLight.intensity = 4000 * flicker * (0.3 + 0.7*airFactor?)`. At high no pad nearby. okay.
  `flameLight.distance = 300`.
  Need flame light illuminate rocket/pad. Since child of rocket at base, at pad y=1, lights pad around. At high, lights rocket only.

- Smoke particles:
Implement class SoftParticles maybe. Need compile. Let's write code.

For points shader with per-point size and alpha:
```
const smokeGeo = new THREE.BufferGeometry();
const MAX=1600;
const positions = new Float32Array(MAX*3);
const sizes = new Float32Array(MAX);
const alphas = new Float32Array(MAX);
const seeds = new Float32Array(MAX);
smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
...
const smokeMat = new THREE.ShaderMaterial({
 uniforms:{ uPixelRatio:{value: renderer.getPixelRatio()}, uScale:{value:1}},
 vertexShader:`attribute float aSize; attribute float aAlpha; attribute float aSeed; varying float vAlpha; varying float vSeed;
 void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = aSize * (uPixelRatio) * (300.0 / max(1.0, -mv.z)); vAlpha=aAlpha; vSeed=aSeed;}`,
 fragmentShader:`varying...; 
  float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard; float soft=smoothstep(0.5,0.0,d); float n=0.85+0.15*sin(...); vec3 color=mix(vec3(0.85,0.86,0.88), vec3(1.0), vSeed); gl_FragColor=vec4(color, soft*soft*vAlpha);`
 transparent:true, depthWrite:false, blending:THREE.NormalBlending (smoke normal) or maybe additive for glow. White steam should be normal with alpha. Use normal.
```
`gl_PointSize` formula: world size * projection? Common: `gl_PointSize = aSize * (300.0 / -mv.z)`. If aSize in world units? At distance 100, size 20 => 60px. Good. At camera near 10, 600px. We need clamp max maybe 512? Add `min(400.0, ...)`. Use pixelRatio uniform. For chase at high, smoke from pad far behind not visible. Fine.
  Points as one object at origin with world positions updated in buffer. PointsMaterial not used.
  Need hide inactive points with alpha 0 or position far. Draw all MAX but alpha 0; gl_PointSize maybe huge for far? Set aAlpha 0. Set position maybe. fine.
  Update each frame:
  - particle arrays (position, velocity, age, life, size, alpha, seed, active).
  - Spawn based on sim time. We need maintain `spawnAccumulator`. While t from 0 to 25 and burning, spawn rate. However reset detection.
  Implement fixed number of particles 1600. Spawning per render frame:
```
let lastSimT=0;
function updateSmoke(simT, dtReal, dtSim) {
 if (simT < lastSimT - 0.5) { clear; lastSimT=simT; }
 if (simT < 30 && simT >=0) {
   let spawnTime = Math.min(0.25, dtSim*2? no)
   // spawn based sim time: if speed 1, dtSim=0.016, spawn many; if speed 10, dtSim=.16, spawn more but should not explode.
   spawnAcc += dtSim * 25; // 25 particles per sim second => at first 10s 250, over 30s 750. Good. At speed 10, dtSim .16 =>4 per frame, okay.
   while spawnAcc>=1 spawn.
 }
 for each active: age += dtSim? Particle physics should use sim time so clouds move with simulation. At 10x, they'll roll fast. Use dtSim. Cap? The sim time steps may be large under x30, dtSim 0.333, still okay. For real-time flicker use elapsed real.
 Update position: velocity + buoyancy. For each active:
   vel.y += 3.5 * dtSim (buoyancy), vel.x *= exp(-0.8 dtSim), vel.z*=...
   pos += vel*dtSim; y max? 
   alpha = smoothstep(0,2,age)*(1-age/life)^? maybe; size grows with age.
   if age>life deactivate.
```
  Spawn positions: under rocket and trench. The flame trench extends +z. To get billowing out sideways along ground, spawn at flame trench exit z maybe 20, x ±. Use initial velocity mostly z positive and x outward. But flame physically goes down and sideways. At liftoff, steam rolls out from pad. Spawn at positions around pad with random angle, velocity outward. We can spawn at center x ±4, z ±4 or trench z=15; velocity outward direction normalized times 20-50, upward 2-8. Need "roll sideways out of the flame trench along the ground and then rise." Use radial velocity, low initial y, buoyancy slowly. If y rises immediately, okay. We can make upward vel small 2 then buoyancy. 
  Spawn with `dir` random angle mostly +z? Flame trench maybe extends +z toward camera? Camera at -z, so smoke might move toward camera if trench +z? We want visible behind/side. Let's orient trench along x or z. Camera at -z; smoke out of trench to +x and -x sides? Could be huge clouds around. Use radial all directions, but bias +x and -z? The plume hits trench and steam billows out both sides. Let's spawn at `z=random(-25,25)`, x=random(-10,10)` with radial velocity outward from center (x,z) plus +z drift for trench. Need from flame trench which maybe runs ±z. Hmm.
  Set trench extends from center to +z 35m. Smoke exits +z and sides. Camera at z=-100 sees smoke behind rocket maybe. Fine. Add spawn sometimes at x ±20, z random. Use:
```
const angle = Math.random()*Math.PI*2;
const r = 10 + Math.random()*20;
const px = Math.cos(angle)*r;
const pz = Math.sin(angle)*r + 10; 
vx = Math.cos(angle)*(15+rand*25) + 5;
vz = Math.sin(angle)*(15+rand*25) + 8;
vy = 2+rand*8;
```
At t, if rocket lifted, smoke source should maybe follow ground? It comes from flame impinging pad until rocket high. Continue at pad for 20s sim. okay.
  White steam color. Use seed. Maybe some darker gray but mostly white.

  Need large billowing clouds: sizes start 8-20m and grow to 40-80m over life. With 1000 particles, can look soft. At pad scale, 20m large. Good.

- Contrail:
  Use trail points from rocket. Need line geometry with max maybe 30000. Since one per step call. At x30, 30 steps per sec sim? Actually render loop 60fps, each step advances up to .333s sim, one trail point per frame. Burn 200s at 30x =6.7 real sec => 400 points only. Trail in space after burn? Actually at x30, after 200s sim, 400 points, fine. At x1 initial 10s 600 points. Overall <5000. Allocate 20000. Good.
  `trailLine.geometry` positions array max 20000*3. Set positions from rocket.trail. Also line drawRange. Need z=0. This line starts at pad. At high altitude, line long. It should be visible.
  For drift, create a Points system for contrail? Let's implement `contrailPoints` with shader soft particle, positions from trail points plus drift. But Points all same size? Use varying size by index. Custom shader with aSize. Need update buffer each frame from trail. Could produce visible puffy contrail. But line enough. Let's implement both:
   - line: thin white line. Material opacity 0.65.
   - puffs: every Nth trail point (e.g. if count > 1000, use all maybe). Use a Points shader with soft circle, per-point size based altitude (larger at high) and alpha. Create positions = trail point + drift: `x + windX*age, y + ... , z`. `age = (count - i)*simDt??` We don't know time per point. We can use index difference * average sim step? Sim time per step varies with playback speed. But trail points don't store time. Requirement trail only points. For drift, can just add `i*0.5`? Not age. We can update static? "drifts slowly" we can compute display offset from elapsed real maybe, independent of point age. Or maintain separate `trailAges`? Not exposed. We can add parallel array. But simpler: at render, for each point, offset by `wind * ((count - i) * 0.005)`? Not physically time. At render loop, we can store per-trail-point creation elapsed time in a parallel `trailTimes` array when new points are observed. Since trail array updated by sim and reset. We can detect new points and push `performance.now()` elapsed. But if many steps? one per frame. Then drift = wind * min(age,100s). We can maintain `contrailCount`, `trailBirth` array. On each frame, while trail.length > count push current time. On reset, clear. Trail array emptied; count > trail.length => clear. Good.
   - But requirement visual contrail stays in sky and drifts. This satisfies.
   - However the line uses actual trail, puffs drift. Good.
   - Need update points each frame: for each point, display pos = (trail[i].x + wind.x*age, y + maybe wind.y*age, z). Since wind slow e.g. x 2 m/s, z 3m/s. For trail at 200km, 3m/s*100s=300m, okay.
   - Points shader alpha based age? Use static size. Could use a custom points with no per-point alpha? We can use same soft points shader but with aAlpha. Simpler create a `THREE.Points` with custom shader, attributes position, size. For each frame set positions from trail plus drift for every maybe max 4000 points. Need memory. Use MAX_TRAIL=20000. That's many points, but draw 20000. Each as soft sprite maybe overdraw. Could be okay. Use every point. At high, 20000 soft points large, costly. Limit visual to every 3rd point. We can use up to 5000. The trail array itself unbounded but visual max. Use step = Math.max(1, Math.floor(trail.length / MAX_PUFFS)). Fill up to 4000.
   - Size: maybe 3-10m; at distance near chase, would be large. Contrail from exhaust should be thin; use puffs sizes 4-12. At high altitude, plume expands so contrail maybe 15m. Use `size = 3 + alt*0.00005`? But altitude not per point. Use 8. At distance 100, gl_PointSize huge. We need scale. Formula. Could just use line. To avoid overdraw, maybe skip puffs or use small opacity. Requirement only trail visible; line is okay. Contrails not necessarily particles. "The contrail stays in the sky and drifts slowly." A line drawn from static trail doesn't drift. Could update line positions with wind based on age, so line itself drifts. But "visible white contrail behind rocket, drawn from trail points" and "contrail stays ... drifts". We can modify displayed line points using drift based on creation time. That means the line is drawn from trail points with drift. The actual trail array remains physical. Nice. Let's create line positions with per-point age drift. Use `trailBirthTimes` and current elapsed. Then display points = original + wind * age. Then the contrail drifts, and line is from trail points (with drift). Could also add puffs for softness. Use line plus maybe a second parallel line? We'll implement puffs modestly with 2000 max to make it soft. But complexity. Let's do line + `contrailPuffs` using a simple ShaderMaterial with circular texture. Need compile.

Maybe reuse `createSoftPointsMaterial` for smoke and contrail. But need attributes. Let's implement functions returning ShaderMaterial with uniforms and options. For smoke, per-particle alpha. For contrail, could use a PointsMaterial with a procedural canvas texture and vertexColors? PointsMaterial supports size, map, transparent, depthWrite false, opacity. But size same. We can use PointsMaterial with map = glow texture, size=8, color white, sizeAttenuation true. It will be soft circle. 20000 points, okay. But all same size. Fine. Drift positions. Use `THREE.Points` with PointsMaterial({map:glowTex, transparent:true, opacity:0.35, depthWrite:false, color:0xffffff, size:8, sizeAttenuation:true, blending:NormalBlending})`. Points size in world units with attenuation. Need texture from canvas. We can create soft circle. This is easier. However PointsMaterial alphaTest maybe. Use alphaTest 0.01. Need `map`. Good.
  But one point per trail point 20k with size 8 at close distances could look dense. We can include only every 2nd. Fine. Update positions. Use static draw range. The line plus puffs. Need update at each frame maybe high overhead but okay 5000 points.
  Use `MAX_TRAIL_POINTS = 20000`. `contrailGeo` positions. For puffs, use points every 2nd and max 6000. We can compute.
  Need `trailBirthTimes` maintain length equal trail length. In render, if trail.length < trailCount (reset) clear. If trail.length > trailCount, push current elapsed for each new. But if simulation calls step multiple times outside render? Not relevant. On reset, length 0, clear. At t=0 before first step, no trail. 
  For drift, need elapsed real time since point creation. Use `clockElapsed` from animationLoop. Store `now`. If point created early, age huge. Wind drift maybe cap to 60s. `drift = wind * Math.min(age, 120)`. With wind 2m/s, 240m. Fine. At high, contrail slowly. 
  But if simulation at 1x and contrail age 100s, drift 200m. okay.
  Need on reset clear `trailBirthTimes=[]; trailCount=0;`.
  Update line positions using drift. For points beyond array, hide by setting drawRange.
  Since we use trail points with drift, the old trail in sky shifts. Good.

  Contrails should only appear after lifting off and maybe after t>4? The trail starts at pad, including ground. Fine. Maybe hide first few points? okay.
  At high speed, points per frame sparse; line may jagged if long. But okay. At x1 low, dense.

- Earth:
  Create Earth sphere. Need material map procedural. But for coast visible at low altitude, local ground. At high, earth sphere. Need make local ground/ocean follow curvature? Could make large local ground plane curved and add ocean plane curved. But also Earth sphere underneath. At high, local details maybe. Let's build a curved local ground 200km x 200km with shader/texture:
  - Use PlaneGeometry(200000, 200000, 200,200), rotate -PI/2, then modify vertices y = - (x^2+z^2)/(2R). But a plane with vertices after rotation? Easier create BufferGeometry manually or use PlaneGeometry and modify position attribute before rotation? Let's use a plane in XZ via `PlaneGeometry(200000,200000,200,200)`, rotateX(-PI/2). Then iterate positions: local x,z; y = - (x²+z²)/(2R) - maybe 0.5. This creates downward curve. But texture mapping repeat. Use ground texture. At center y=0. Use it for land. Need ocean region and coast. Could use custom shader to color by world z: land for z<coast? But texture green. Maybe create a separate land plane limited z<1000 and ocean beyond? Complex with curvature.
  - Simpler: local ground plane 30km x 30km flat green, local ocean plane 200km x 200km starting at z=800, but flat. At high, the horizon flat not curved. But Earth sphere will be visible beyond 200km. Hmm.
  - Better create one big curved disk with a canvas texture that includes land and ocean, with a coastline at z=1000. The texture can cover 200km x 200km with green land and blue ocean region. If generated at 1024, 200km per 1024 ~195m/pixel, too coarse for local coast. At low altitude, pad ground uses separate 1km concrete/vegetation? Wait pad area is concrete and local ground. We can have a detailed local plane 4km with green, and a larger curved ocean/land terrain beyond. The horizon coast visible at 4km. At high, Earth sphere.
  - Use Earth sphere plus local ground plane (10km) and ocean plane (200km) both slightly curved? We can hide local when alt >100km? At high, sphere dominates. 
  - Let's build:
    * Earth sphere radius R, segments 128,64, centered (0,-R+0.2,0), with texture (ocean/land). This covers entire Earth. At high altitude, looks like Earth. At low, top surface under pad at y≈0.2. Pad at 1.0. Local ground plane at y=0.5 covers 30km. Ocean local plane at y=0.45 from z=1000 to 300km? It would float over sphere slightly but from high the local plane patch maybe visible. Could hide local ground/ocean above alt 150km, but then sphere has texture. At 100km, transition maybe.
    * Local ground plane 20km x 20km green, flat at y=0.5. At z>800 coastline, ocean plane 400km x 400km? If flat at y=0.45, at high altitude it will stretch and maybe dominate; but hide when alt>150km.
    * Ocean plane 400,000 x 400,000 at y=0.45? From pad, horizon at 20km due fog. If ocean extends 200km, flat horizon at y=0.45, but Earth curvature should dip below; from low camera, far ocean might be above horizon? Flat plane at y=0.45 extends to 200km, horizon at 200km, not realistic. Fog hides. Could use curvature for ocean plane too: large plane with vertices y = -(x²+z²)/(2R) + 0.45. Then far edges drop 3km at 200km, below horizon. Good. Do this for both ground and ocean. For local ground 40km, sag 125m at 40km, okay. For ocean plane 400km, sag 12.5km at 400km, maybe fine. Need segments.
    * But overlap: ocean plane at z>800 and extends all around? We only need ocean one side. Could create a huge ocean plane with curvature covering entire area, then land plane on top for z<1000? Land plane 50km x 50km centered at z=0, green. Ocean beyond and under. But at low, if ocean under land, not visible. Put land plane y=0.6 and ocean y=0.45. For z<coast, land; for z>coast, land plane ends? Actually land plane square extends to z=+25000, covering ocean where should be sea. Need shape land only z<1000. Use a land plane 40km in x and 2km in z? Hmm.
    * Make land plane 60,000 x 60,000, but texture has ocean beyond coastline. Could use shader mix by world z. Instead of separate ocean, use a ground shader with color based on local z and curvature. But need green texture and ocean texture. Could use a single large curved plane with a procedural shader using world coords: `if (z > 800) ocean else land`. But local pad requires concrete and vegetation on top. We can still use ground shader for base. Add pad concrete. The shader can include procedural noise for land, ocean, and coastline. Maybe simpler but shader code longer.
    * However ground texture requirement: procedural textures for ground and vegetation. We can use a canvas map for land. For ocean, separate plane. Could create land as a plane 100km x 100km but only visible z<coast via clipping? Not.
    * Let's use a shaped land mesh: PlaneGeometry(60000, 3000, 200, 30) centered at z=-? Actually land extends from z=-30000 to z=+900 (coast), width x ±30000. This is a rectangle 60km x 30.9km, with coastline at z=900. Rotate to XZ, curve. Then ocean plane huge at y lower covering z beyond. Pad at origin. At low, land behind camera up to coast 900m, ocean beyond. Good. But land only ±30km x; at z=-30000, ends, ocean underneath? At low, behind camera not important. At high, local patch. Fine.
    * Ocean plane: 2,000,000 x 2,000,000? 2,000km, segments 100, curved. But Earth sphere also. A flat ocean plane at y=0.4 curved with R will align with Earth sphere approximately, but could z-fight with sphere. Set ocean y=0.6 and use only when alt<100km; at high hide and use sphere texture. At high, Earth sphere ocean texture. Good. Also local land hide at high maybe. But then the launch site disappears at high; okay. Keep Earth sphere.
    * At low, Earth sphere under ocean/land? Top at y=0.2. local ocean y=0.5, land y=0.6. Fine.
    * At high, hide local ocean and land if alt>80km? Transition. But ground plane 30km is small from 80km; still visible under rocket. Could keep up to 200km maybe. For visual, at 100km, local ocean flat patch could look wrong. Use hide at alt>30000? But then Earth sphere visible. The camera is near rocket at 30km, looking down sees Earth sphere with texture; local detail gone. We can fade local planes via opacity? Material transparent may be expensive. Could set visible false > 50km. There may be a pop. But camera at high with rocket, maybe okay. However "view coast, curve Earth" at high. Earth sphere can show coast? We need Earth texture to have Florida-ish coast. Hard.
    * We can make Earth sphere texture with approximate Florida east coast near pad longitude. But mapping at local origin. The sphere UV at top (lat 0?) We can create texture where the origin corresponds to a specific uv. If Earth sphere centered at (0,-R), the point (0,0,0) is north pole? Sphere geometry default UV lat/lon, top at y=+R local. Earth center at -R, so top is y=0. The top of sphere is pole (lat +90). Cape Canaveral is not pole. Need rotate sphere so launch site at a non-pole coordinate. If sphere top at pad, the texture at pole may stretch. Could rotate the sphere by x/z to place a continent. But local ground covers. At high, we can orient Earth so the launch site is on a coastline. Hard.
    * Alternative use a custom Earth sphere with a texture oriented such that the camera sees a coastline. But not exact. We can just make ocean blue with green landmasses; the horizon coast maybe. At high, "coast" maybe not accurate. Could add a large green Florida-like peninsula on the Earth texture at appropriate location. But mapping.
    * Simpler: Use Earth sphere with a `CanvasTexture` generated with an ocean and a green peninsula positioned near the horizon. Since the sphere's top is at launch site if centered at -R, the launch site is at the north pole, where texture pinches. We can center Earth lower but rotate geometry? Let's create Earth sphere centered at (0, -R, 0), but rotate the sphere so the point at local (0,0,0) (top) is not pole? Actually sphere top is local (0,R,0), world (0,0,0). It corresponds to UV v=1? In SphereGeometry, the pole is at +y, UV pole. The texture at pole will be tiny. The local area near launch site at the pole: east/west coordinate maps around the polar angle. This could cause weird. But at high, we can rotate the Earth sphere so launch site not at pole? If sphere center is (0,-R,0), the surface at origin is top. To have local up vertical, the normal is up, which is a pole of the sphere. That's unavoidable if centered below origin. But texture could use a polar projection with a coastline around, not ideal. We can instead use a sphere segment geometry for local Earth with a local tangent plane, but high needs full.
    * Could make the Earth sphere centered at (0, -R, 0), but use a custom shader based on world normal to color continents, with launch site on a continent. At high, large-scale. We can procedurally color from direction. For local, use `if normal.y > .999` land. The launch site at normal up. As altitude increases, camera sees around; normal up patch is small. The rest could be ocean. Use shader noise. Fine.
    * But requirement "Florida coast... Atlantic Ocean on horizon behind pad" at low. Local land/ocean handles. At high "view of coast, curve Earth" from near rocket. We can keep local land/ocean up to e.g. 100km? At 100km, coast at 900m is tiny but visible maybe under. The viewer close to rocket at 100km looking down, the local patch of 100km shows coast. That might be enough. Need curve: local ocean plane curved, land curved. At 100km, the horizon of a 100km patch maybe. Earth sphere behind. Use local planes up to 200km, curved, with coast. Great. Then "curve of Earth" visible at edge of ocean plane? The ocean plane 2000km curved with sag, gives curved horizon. Use that at all altitudes maybe. At 200km, a plane 2000km wide with curvature appears like Earth surface. Could keep. But overlapping Earth sphere. Hide Earth sphere maybe until >500km. At high, local ocean plane 2000km enough for horizon? At 200km altitude, horizon distance sqrt(2R h) ~50,000km. Need Earth sphere. But local plane not. Could use Earth sphere for far, local planes for coast. Combine by making Earth sphere slightly below local planes; z-fighting only at overlap. It should be okay if Earth sphere top at y=-50, local planes at y=0.5 within 2000km. At distance 2000km, local plane sag by 314km, while Earth sphere sag by same, so they align. They will z-fight across entire ocean. Could offset Earth sphere down by 100m to avoid, but then local ocean appears 100m above Earth; at high, edge visible. Maybe okay. At high, Earth sphere provides far, local ocean 100m above only near center, negligible.
    * Set Earth sphere top at y=-20 (center -R-20). Local ground/land y=0, ocean y=-1. At 1000km, sphere top at -20, local ocean sag same; local ocean 20m above Earth, fine. At the pad, local land 20m above sphere. Good. Earth sphere visible beyond local plane edge.
    * Great. Use Earth sphere with procedural texture for large. Local ocean plane 2000km curved. But creating 2000km plane with 100x100 segments = 40k vertices, fine. Sag at edge (1000km) 78km; huge. Use formula. But the local ocean plane at y=-1 with curvature relative to center at origin, points at 1000km have y=-78km. Earth sphere at same position has y ~ -78km too (top offset -20), so they align. Good.
    * Land plane 40km x 30km curved at y=0.5. At edges sag. Fine.
    * Ocean plane may cover entire area under land (including under pad), but land/y higher hides. Fine. At coast, ocean visible.
    * Need coastline at z=900. Land plane extends z=-30000 to +900. Use a plane with width x 60000, depth 30900 centered at z=-14550. At coast. Good. But roads etc.
    * At low camera at -z, looking +z, land extends behind camera to z=-30000, ocean beyond coast +900. Horizon ocean. Good.
    * Earth sphere has texture; at high, the local ocean patch aligns and maybe no seam. Nice.
  - Earth texture: procedural canvas 1024x512. Need if sphere top is pole, local area corresponds to top of texture (v=1) with ocean/land. At high, we see mostly ocean due texture. Could create a simple blue ocean with some green land at top. But Florida coast at local ocean already. At high, ocean plane covers 2000km; Earth beyond. At 200km altitude, horizon maybe Earth sphere. The camera looking at rocket, lower portion shows ocean plane and Earth. Fine.

  - Sea material: physically based with blue color, roughness 0.25, metalness 0.0, maybe envMap? No environment map except sky. Use MeshStandardMaterial with color 0x1a4b6b, roughness 0.2, metalness 0.1. Without environment, sea looks dark, but sun specular. Could add a shader with waves? Procedural texture normal? Simpler use color and roughness; add a canvas texture with subtle water noise. At low, ocean behind pad, pale with haze. Good.
  - Land material: map procedural ground texture, color green. Could combine road overlays.

  - Curved geometry: Create function createCurvedPlane(width, depth, segX, segZ, y, material) with PlaneGeometry and modify y. Need ensure coordinates. PlaneGeometry(width, depth, segX, segZ) lies in XY, then rotateX(-Math.PI/2) -> XZ. After rotation, positions x, y=0, z. We can iterate:
```
geo.rotateX(-Math.PI/2);
const pos=geo.attributes.position as THREE.BufferAttribute;
for i: x=pos.getX(i); z=pos.getZ(i); y = baseY - (x*x+z*z)/(2*R); pos.setY(i,y);
geo.computeVertexNormals();
```
But plane's center at origin. For land, need center offset (0, -14550) so coastline at z=900. We can create geometry centered at origin then translate z=-14550; but curvature must be computed after translation. So modify after geo.translate? Do: create plane, rotate, translate z center, then modify y using final x,z. Or create geometry with positions and center. Fine.
  Ocean: PlaneGeometry(2e6, 2e6, 160,160), rotate, baseY=-1, curve. But camera far 1e8. 2e6 is okay. At high, local ocean 2000km. Earth sphere R 6.37e6. Good.
  Land: 60km x 31km. Need enough segments for curvature. 120x60.
  Roads and pad on land, but y offset? At local origin, y=0.5. Buildings y from land. Good.
  Vegetation positions on curved land: y = 0.5 - (x²+z²)/(2R). For small local 3km sag <1m. We can compute.

  - Pad position y: base ground at local y=0.5 (land). Pad top y=1.5 maybe. Set `padY = 1.5`. Rocket base at padY. Physics alt 0. local ground at y ~0.5. Pad concrete box from y=0.5 to 1.5. Good. But camera and tower at y. Use padY = 1.5. Rocket top y ~71.5. Tower height 85 above pad.
  - At high, rocket y = alt + padY. Alt 0 on pad at 1.5. State alt is h above pad, okay.

  - Earth sphere center: (0, -R - 20, 0). Top at y=-20. Local ground at 0.5. Fine.
  - At high altitude, if rocket alt 200km, Earth surface at y ~ -200km? Wait physics alt measured from pad y=0, but Earth sphere center at -R-20, surface at origin y=-20. At rocket altitude 200km, its world y ~200km. Earth surface below at x=0,z=0 y=-20. Great. At x horizontal movement maybe 500km, Earth sphere surface y=-R -20 + sqrt(R² - (x²+z²)) approx -20 - dist²/(2R). Our local ocean plane uses same formula relative origin, aligns.

  - At high, camera near rocket looking at rocket; Earth below. The sky sphere as camera child radius 9e6, Earth surface maybe 300km away. Good.

- Fog:
  Scene fog will apply to all materials except shader. We can use `FogExp2` with color 0xcfe0ef, density base 0.00002? At distance 1000m, exp2 factor exp(-(density*d)^2) ~ exp(-0.0004)=0.999 no haze. Need stronger for aerial perspective. FogExp2 density 0.00008 at 10km -> exp(-0.64)=0.53. At 1km ->0.994. Reasonable. But at low, ocean horizon 10km hazy. Use density 0.00006. At high altitude, reduce: density = 0.00008 * exp(-alt/12000) maybe at 10km 0.000035, at 100km ~0. Fog near Earth should remain for distant Earth? Fog is based camera distance, not altitude. If camera at 100km, fog density maybe 0 if we reduce, but Earth should still have atmospheric perspective. Sky handles. At high, the Earth sphere distance 100km+ should be pale blue due atmosphere. Could keep small fog density tied to camera altitude but not reduce to zero? We can set density = 0.00008 * exp(-alt/20000) + 0.0000005. At 200km, density 0.0000005, over 1000km exp(-0.25)=0.78 slight. At near rocket (100m) no fog. Good.
  But fog affects sky? custom shader no. Stars no fog.
  Scene fog color should shift with altitude? At high, haze blue. Use pale blue. Fog color can change from 0xd8e8f4 to 0x2b5a8a? At high, Earth atmosphere blue. Use static pale blue.
  Materials need fog true except sky/stars.

- Tone mapping and compositor. With composer, shadows and bloom. Need resize composer too. `composer.setSize(width,height)` and `bloomPass.resolution`? `UnrealBloomPass` constructor takes `new THREE.Vector2(window.innerWidth,window.innerHeight)`, then setSize on composer handles? It has `setSize`. EffectComposer setSize calls passes setSize. Good.
  Use `renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))`. Composer uses renderer pixel ratio? EffectComposer setPixelRatio? In newer three, `composer.setPixelRatio(renderer.getPixelRatio())`? EffectComposer has setPixelRatio. We can call. Need type. It should exist. Or let composer size use renderer size. `composer.setSize(innerWidth, innerHeight)` with pixel ratio? Actually EffectComposer render targets width = size * pixelRatio? It has setPixelRatio. We'll call.
  Use `renderer.outputColorSpace = THREE.SRGBColorSpace;`.
  ACES: `renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;`
  OutputPass sets tone mapping from renderer. We may use OutputPass. Import. Potential compile. If unsure, we can omit OutputPass and rely on renderer with composer. But in newer three, OutputPass is recommended. I'll include.

  Bloom selective? `UnrealBloomPass` from addons. Settings: strength 0.9, radius 0.5, threshold 0.9. It will bloom the sky sun? Sky shader maybe bright. Set threshold 0.85, strength 0.8. Flame shader colors >1 can bloom. But bloom pass on whole scene. fine.

- Lights:
  Directional sun. Use maybe color 0xfff5e6, intensity 3.5. Position (-800,1200,-500) or (500,1500,800). To have nice shadows. Shadow camera near/far. `shadow.camera.left=-300`, right=300, top=300, bottom=-300, near=1, far=4000. `shadow.mapSize.set(2048,2048)`. `shadow.bias=-0.0002`, normalBias 0.5. Target at (0,0,0). Sun direction from SE. Use sunDir uniform for sky normalized (from light position to target? Direction *toward* sun). 
  HemisphereLight sky 0x9cc8ff ground 0x3a4a2a intensity maybe 0.5 at ground, reduce with altitude? At high, ambient should be low but sun bright. Set `hemi.intensity = 0.35 + 0.65*Math.exp(-alt/20000)?` Actually at ground atmosphere scattering gives blue ambient, at space no ambient. Set `Math.max(0.05, 0.6 * exp(-alt/25000))`. At 100km ~0.05. Good.
  Maybe add ambient? Not needed.

- Overlay:
  Create div fixed top-left, small, style monospace, color white, background rgba(0,0,0,.45), padding, z-index. Show speed, T+ time, altitude km, velocity m/s. Buttons x1 x10 x30 in overlay. Also paused? Maybe key Space toggles paused? Not required but nice. Could add. Need keyboard keys 1,2,3. Buttons.
  Update text each frame. `speed` from state. T+ format `T+${...}s` maybe minutes. Alt `(alt/1000).toFixed(1) km`. Velocity compute `Math.hypot(vx,vy)`? State has extra velocity. Use `st.velocity`. Also overlay display time scale. 
  Button event: set speed and maybe prevent focus. `document.body.appendChild(overlay)`.
  Need handle pointer? no.
  Add "LIFTOFF", "PAD" maybe. But small.
  Ensure overlay not block canvas? fine.

- Initial state: Should the simulation run immediately? The scene maybe rocket on pad and t=0. If animation starts, step is called and rocket lifts off immediately. Good. "launch scene... ascent" yes. At t=0 engines start. Maybe no hold. Fine.
  At first frame after init, step maybe? Animation loop: compute dt; call step. The first frame t>0. `__ready` after first render.
  But reset should be possible via window.__rocket.reset. Need visual reset. Our render loop detection handles.

- Testing: Expose scene, camera, renderer. After first frame set __ready. Use animation loop. `__ready` set after composer.render once. Could set in loop after first render. Need not before.

- TypeScript strict:
  - All variables types inferred. Watch nullable.
  - `const pos = geometry.attributes.position as THREE.BufferAttribute;` because geometry.attributes.position type BufferAttribute | InterleavedBufferAttribute? In three, `BufferGeometry.attributes.position` is `BufferAttribute | InterleavedBufferAttribute`. getX exists both. setY only BufferAttribute? Interleaved has setY? I think BufferAttribute has setY; InterleavedBufferAttribute also has setY maybe. But cast.
  - `geometry.setAttribute` okay.
  - `instancedMesh.instanceColor` maybe nullable. Use setColorAt.
  - `renderer.setAnimationLoop((time: number) => {...})`: signature `(time: number) => void`. Good. Use `const dt = Math.min((time - lastTime)/1000, 1/30)` but first time. Need lastTime undefined. Use `let lastTime = performance.now();` or use clock. The animation loop `time` is in ms. Use `const delta = Math.min((time - lastTime)/1000, 1/30); lastTime=time;` Initialize lastTime = performance.now() perhaps.
  - Use `performance.now()` for timing; in animation loop time is DOMHighResTimeStamp. Use same.
  - `renderer.setAnimationLoop(animate)`; `animate(time: number)`.
  - Expose `(window as any).__rocket = rocketSim;` etc.
  - `window` and `document` types available (DOM lib). tsc strict likely includes DOM.
  - Ensure no unused locals? strict doesn't error on unused unless noUnusedLocals set by default? `tsc --strict` doesn't enable noUnusedLocals. Fine.
  - Avoid possibly undefined: use non-null assertions where needed.
  - Arrays typed.

- Build geometry functions.

Let's start outlining code.

Imports:
```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```
Potential issue: TypeScript with `moduleResolution`? The user compiles. `three/addons` type mappings exist in package? If not, compile fails. But instructed to use addons. Good.

Could avoid Sky addon, own shader. Good.

Constants:
```ts
const G0=9.81, EARTH_R=6371000, M0=550000, DRY=220000, BURN=200, PAD_Y=1.5;
```

Rocket sim interface:
```ts
interface RocketState {
  t:number; alt:number; vel:number; acc:number; pitch:number; speed:number;
  velocity:number; x:number; z:number;
}
interface TrailPoint { x:number; y:number; z:number; }
interface RocketSim {
  paused:boolean;
  trail: TrailPoint[];
  reset():void;
  step(dt:number):void;
  state():RocketState;
}
```
Potential issue requirement `state(): { ... }` exact? extra fields okay. `speed` time scale.

Create:
```ts
function createRocketSim(): RocketSim {
 let t=0,x=0,y=0,z=0,vx=0,vy=0,vz=0;
 let userSpeed: number | null = null;
 const trail: TrailPoint[] = [];
 function pitchAt(tt:number){...}
 function massAt(tt:number){...}
 function timeScale(){ return userSpeed !== null ? userSpeed : (t < 10 ? 1 : 10); }
 const sim: RocketSim = {
  paused:false,
  trail,
  reset(){...},
  step(dt:number){...},
  state(){...}
 };
 return sim;
}
```
Note: state.timeScale uses current t. User choice. Good.
`step`:
```ts
if (!Number.isFinite(dt) || dt <= 0) { trail.push({x,y,z}); return; }
let remaining = dt;
while (remaining > 0) {
  const h = Math.min(0.02, remaining);
  remaining -= h;
  const m = massAt(t);
  const thrust = t < BURN ? Math.min(THRUST0, 3*m*G0) : 0;
  const pitch = pitchAt(t);
  const grav = G0 * Math.pow(EARTH_R/(EARTH_R + Math.max(0,y)),2);
  const ax = thrust * Math.sin(pitch) / m;
  const ay = thrust * Math.cos(pitch) / m - grav;
  vx += ax*h;
  vy += ay*h;
  x += vx*h;
  y += vy*h;
  t += h;
  if (y < 0) { y=0; if (vy<0) vy=0; }
}
trail.push({x,y,z});
```
Need rocket cannot go below pad even if horizontal. y clamp. On reset x=0 y=0 z=0. Thrust at t<BURN. At t=0 exact. Good.
Could use gravity at y after? Fine.

State:
```
const m=massAt(t); const thrust=...; const grav=...
const ay=...
return { t, alt:y, vel:vy, acc:ay, pitch:pitchAt(t), speed:timeScale(), velocity:Math.hypot(vx,vy), x, z };
```
No horizontal z.

`reset()`: t=0; x=0; y=0; z=0; vx=0; vy=0; vz=0; userSpeed=null; trail.length=0; `sim.paused`? Not specified reset paused? Should it unpause? Maybe no. Keep paused as is? "reset(): time 0..." They might expect paused unchanged. Fine. user choice clears. Could also set paused false? Not stated. Leave.

Need keyboard sets userSpeed. But userSpeed internal only via sim. We need method to set speed. Not in interface. We can add `setSpeed(mult: number): void` to RocketSim interface or cast. Requirements don't prohibit extra. Use `rocketSim as any`? Better add `setSpeed(mult: number): void;` extra. But window exposed has method. Fine. Reset clears. Could also use function `chooseSpeed`.
Add interface:
```
setSpeed(mult: number): void;
```
Implementation sets userSpeed = mult. If mult maybe 1/10/30.
Buttons call sim.setSpeed(1).

But state().speed returns userSpeed if chosen. At t<10, if user hasn't chosen returns 1. Good.

Build textures:

`function makeCanvasTexture(w,h,draw:(ctx:CanvasRenderingContext2D)=>void, repeatX=1, repeatY=1): THREE.CanvasTexture`:
```ts
const c=document.createElement('canvas'); c.width=w; c.height=h;
const ctx=c.getContext('2d'); if(!ctx) throw new Error('...');
draw(ctx);
const tex=new THREE.CanvasTexture(c);
tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
tex.repeat.set(repeatX,repeatY);
tex.colorSpace=THREE.SRGBColorSpace; // for color maps
tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
return tex;
```
But renderer defined after? We need renderer before textures. Set renderer first. Or create textures after renderer. Use function takes renderer? Use global `let renderer`. Better set renderer at top then textures. Function uses optional `anisotropy`. `renderer.capabilities.getMaxAnisotropy()` exists. Fine.
For non-color maps, colorSpace? Only color. We can set colorSpace. For roughness map maybe NoColorSpace. Simpler all color. We only need color maps.

Concrete texture:
```
const concreteTex = makeCanvasTexture(512,512,(ctx)=>{
 ctx.fillStyle='#9a9a91'; fillRect...
 for i 0..20000: random gray dots
 cracks lines
});
concreteTex.repeat.set(8,8);
```
Ground land texture green with noise:
```
ctx.fillStyle='#5a6d39';...
random patches of green/brown, dots.
```
Maybe `repeat.set(80,40)` on land plane? But canvas texture repeat depends on UV. Plane UV 0..1. For 60km, repeat 120 would create 500m patches. Need fine vegetation. We can set repeat (60,50). Good. But pad overlay.

Ocean texture: simple waves. `makeCanvasTexture(512,512)` fill blue with noise. repeat (100,100) for 2e6 plane -> 20km per tile, too coarse. Maybe no map, use material color + roughness. Add a normal map? not necessary. Use rough blue plane. Could use custom shader for water with sun glint? Overkill.

Earth texture: 1024x512. Fill ocean; draw continents with random polygons; maybe white clouds. But top pole stretch. We can draw green patch at top center for Florida? Hmm. Use generic.

Marking texture:
```
const markTex = makeCanvasTexture(512,256,ctx=>{
 ctx.clearRect
 // flag at left
 draw striped flag, blue canton with stars maybe.
 // text "SPACEX" and "FALCON 9" 
},1,1); tex.wrapS=Clamp...
```
CanvasTexture alpha. Need material `MeshBasicMaterial({map:markTex, transparent:true, side: DoubleSide, depthWrite:false, polygonOffset...})`. MeshBasic to show clear. Or MeshStandard. Use MeshBasic with transparent; okay. But physically based requirement overall. Markings can be basic. Could use MeshStandard with map and transparent. Use MeshStandard and alphaTest. Set `map` with transparent. The canvas has transparent background. MeshStandard supports alpha. Use roughness .5. Good.
Flag lettering orientation. Plane at front. Need plane to not intersect. Position z=-1.87. But when rocket rotates around z, plane rotates. Fine.

Soft circle texture for smoke? We use shader no texture. For contrail PointsMaterial need texture. Create radial canvas:
```
function makeGlowTexture(){ canvas 128, radial gradient white center transparent edge; }
```
Use for sprites core and contrail points. `colorSpace=SRGB`. Use `THREE.CanvasTexture`.

Sky shader.

Create camera and scene. Add camera to scene for sky/stars children. Important: camera should be added to scene before rendering. `scene.add(camera)`.
Sky mesh:
```ts
const skyGeo = new THREE.SphereGeometry(1, 32, 16);
const skyMat = new THREE.ShaderMaterial({... side: THREE.BackSide, depthWrite:false, depthTest:false, fog:false, toneMapped:false? });
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.scale.setScalar(8e6);
sky.renderOrder=-1000;
camera.add(sky);
```
Wait if scale 8e6 and camera near .5, far 1e8, okay. Geometry radius 1 => world radius 8e6. But stars should be at 7e6 or 9e6? If sky sphere at 8e6 and has depthTest false, stars at 7e6 would be in front of sky; good. But stars should draw over sky. If sky depthTest false but depthWrite false, stars drawn after due renderOrder. Stars at radius 7e6, inside sky, but they draw over because sky renderOrder -1000, stars -999. Good. If stars depthTest true, Earth at 200km closer occludes. Fine. But stars at 7e6 and sky at 8e6, both camera children. Earth could be at 6.37e6? At ground, Earth surface distance ~6.37e6? For a point below, distance to Earth center; from camera, surface distance? At ground, camera at y=2, Earth surface at y=-20 below, distance 22m? Wait Earth sphere top is 20m below, not 6.37e6. The sphere surface is directly under the camera at local, so depth 20m. That will occlude stars in lower hemisphere. Good. At high, Earth distance 200km. Good. Stars at 7e6; Earth closer, occludes. Fine.
  But sky sphere at 8e6 should be behind Earth? It has depthTest false so renders regardless. It will draw over Earth if rendered after? RenderOrder -1000 means before opaque? Transparent objects sorted? If transparent material (sky transparent? not necessarily), renderOrder. Set `skyMat.transparent = true`? With depthTest false, it draws over everything if rendered after opaque. But renderOrder -1000 ensures before opaque? RenderOrder applies within opaque and transparent separately. Opaque objects render first, sorted by material? Actually opaque objects render before transparent. If sky material is opaque (transparent false) and renderOrder -1000, it draws first, then Earth covers. Good. But if sky depthWrite false and opaque, it draws first, Earth covers where closer. Since sky is at 8e6 and Earth is at 200m, Earth depthWrite and depthTest > sky none, so Earth covers. Good. But sky shader should not write depth. Set transparent? If transparent true, it might render after opaque and cover Earth with depthTest false. So set `transparent: false`, `depthWrite:false`, `depthTest:false`, renderOrder -1000. It is opaque pass, draws first. Stars Points material transparent, render after; depthTest true so Earth occludes. Good.
  Since sky depthWrite false, other opaque won't be occluded. Fine.
  Set `frustumCulled=false`.
  Camera child scale 8e6; at altitude > maybe 8e6 camera inside still. far 1e8.

Sky uniforms:
```ts
uAlt:{value:0},
uSunDir:{value:new THREE.Vector3(...).normalize()},
uTime:{value:0}
```
Fragment:
```glsl
varying vec3 vDir;
uniform float uAlt;
uniform vec3 uSunDir;
uniform float uTime;
float hash(vec2 p){...}
void main(){
 vec3 d=normalize(vDir);
 float alt01=clamp(uAlt/100000.0,0.0,1.0);
 float space=smoothstep(40000.0,100000.0,uAlt);
 float high=smoothstep(0.0,60000.0,uAlt);
 float h=max(d.y,0.0);
 float horizon=pow(1.0-h, 3.0);
 vec3 groundZenith=vec3(0.12,0.34,0.72);
 vec3 groundHorizon=vec3(0.72,0.82,0.90);
 vec3 highZenith=mix(vec3(0.035,0.09,0.24), vec3(0.0,0.0,0.0), space);
 vec3 highHorizon=mix(vec3(0.65,0.78,0.9), vec3(0.02,0.05,0.12), smoothstep(0.0,0.5,high))? 
```
Need from blue at ground to black at 100km. Better compute:
```
vec3 zenith = mix(vec3(0.12,0.34,0.72), vec3(0.0,0.0,0.0), space);
vec3 horizon = mix(vec3(0.65,0.78,0.90), vec3(0.03,0.08,0.15), high);
vec3 col = mix(horizon, zenith, pow(h,0.55));
```
At ground, zenith blue, horizon pale. At high, zenith black, horizon dark blue. At 100km, space=1 -> zenith black, horizon maybe medium blue (because high=1 => 0.03,0.08,0.15). That's not black at horizon, but Karman line should black. Maybe use `space` for horizon too:
```
vec3 horizon = mix(vec3(0.65,0.78,0.90), vec3(0.02,0.05,0.12), space);
```
At 100km horizon dark blue almost black. Below horizon maybe Earth. Good.
Add sun:
```
float sd=max(dot(d,uSunDir),0.0);
float sunDisk=smoothstep(0.9995,0.9999,sd);
float sunGlow=pow(sd, 40.0)*0.3 + pow(sd, 8.0)*0.12;
vec3 sunColor=vec3(1.0,0.85,0.55);
col += sunColor*(sunGlow*(1.0-space*0.7)+sunDisk*8.0);
```
At high sun disk clear. Need maybe horizon warm glow near sun:
```
col += vec3(1.0,0.65,0.3)*pow(sd,4.0)*horizonFactor*0.2;
```
Below horizon: if d.y <0, use dark (space) / maybe Earth? But sky sphere behind earth; below horizon at low is occluded by ocean/land. At high, below Earth occluded. Fine.
Add subtle stars? Points. No need.
Use `toneMapped`? ShaderMaterial default toneMapped true but no include. The output pass will tone. Colors maybe linear. Values 0.72 etc after ACES become lighter? Fine.
Set `gl_FragColor = vec4(col,1.0);` For background.

Need `vDir` passed from vertex:
```glsl
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
```
Since sky mesh scaled, position normals okay.

Stars:
```ts
const STAR_COUNT=1800;
const starGeo=new THREE.BufferGeometry();
const posArr=new Float32Array(STAR_COUNT*3);
for i: random unit vector; pos*7e6; maybe only sphere. 
const starMat = new THREE.ShaderMaterial({
 uniforms:{uOpacity:{value:0}, uPixelRatio:{value: renderer.getPixelRatio()}},
 vertexShader:`attribute float aBrightness; varying float vB; uniform float uPixelRatio; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(1.0+aBrightness*2.0)*uPixelRatio; vB=aBrightness;}`,
 fragmentShader:`varying float vB; uniform float uOpacity; void main(){ vec2 p=gl_PointCoord-0.5; float d=length(p); float a=smoothstep(0.5,0.1,d)*uOpacity*vB; if(a<0.01) discard; gl_FragColor=vec4(0.8,0.9,1.0,a);}`,
 transparent:true, depthWrite:false, depthTest:true, blending:THREE.AdditiveBlending, fog:false
});
```
Need geometry attribute aBrightness. Points renderOrder -999. `frustumCulled=false`; parent camera. Stars at radius 7e6. Camera positions local. Because parent camera, positions relative to camera. Earth occlusion? Star points depthTest true and camera child. Earth at distance variable. At altitude 100km, Earth in front. Good.
At low, opacity 0.05? Requirement stars appear above 70km and clear above 100km. Set opacity = smoothstep(70000,100000,alt). At 100km opacity 1. At ground 0. Use state alt. At 70km 0. Good.
But with camera child, stars have modelViewMatrix; points at radius 7e6, far 1e8. Good. Need `uPixelRatio` update on resize.

Potential conflict: sky sphere with back side and camera child scaled 8e6. If camera near/far 0.5/1e8, at radius 8e6 depth, depthTest false so okay. Stars at 7e6, they are inside sky but sky drawn first with no depth, stars after. Good.

Earth sphere:
- Create canvas earth texture maybe after renderer. Use `makeEarthTexture`.
- Geometry sphere radius R, 256x128? 128x64 fine. Need high enough. `new THREE.SphereGeometry(EARTH_R, 128, 64)`.
- Material MeshStandard with map. Set `map` repeat? It should map once, wrap clamp? Sphere UV. Use `side: THREE.FrontSide`, roughness .8, metalness 0.0. Add color maybe white.
- Important: camera at altitude 200km sees Earth. But local ocean plane 2000km and land. Earth sphere top at -20. To avoid z-fight, local ocean at -1, land at 0.5. At far distances, local ocean and Earth differ by 19m, z-fighting maybe not visible because distance and depth. From 200km, 19m is tiny, may z-fight but local plane covers near region; Earth under. Could show artifacts. Better set Earth sphere top at y=-100 to avoid. Local ocean appears 100m above Earth at center; at high, edge maybe a 100m cliff, negligible. Use center -R-100. Earth top -100. Local ocean -1. Good. At high, Earth surface below by 100m, fine. Use 50? use 80. 
- Local ground plane and ocean are curved with base y. At high, local ocean extends 2000km, sag 314km, while Earth surface at same xz has y = -80 - dist²/(2R). Difference 79m. Constant, okay.
- Hide Earth sphere? no.
- Earth atmosphere shell: sphere radius R+100000, material shader transparent BackSide? Center at (0,-R-80,0). At high, see blue rim. Use ShaderMaterial with `side: THREE.BackSide`? From outside a sphere, BackSide renders inner faces; but when camera is outside, you see through to the far side interior, giving full disk instead of rim. Better side DoubleSide and fresnel. It would overlay Earth. Use additive with alpha based on view normal. A common atmosphere shader:
```
varying vec3 vNormal; varying vec3 vWorldPos;
void main(){ ... }
frag: float intensity = pow(0.7 - dot(vNormal, viewDir?), 4.0)...
```
But camera outside, normals point outward; view dot normal. For limb, dot ~0, center ~1. Need glow at limb. `intensity = pow(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition - vWorldPos))), 3.0)` gives rim. Additive. But atmosphere shell radius R+80km, from high altitude at 200km camera above shell? Camera at 200km, shell top at 80km below? Wait center -R-80, radius R+80km gives top at 80km. Camera at 200km is outside shell. The shell is below; from above looking at Earth, visible as a thin rim at horizon. Good. At 100km, camera at 100km above, also above shell top 80km. At ground, camera inside? At y=0, center -R-80, distance to center R+80, on shell surface. Hmm shell top at 80km, camera on surface? Actually top of shell at y=80km relative origin. Ground at y=0 is inside shell. Camera inside atmosphere shell. BackSide needs. Could avoid.
  Simpler add a blue haze at horizon via fog/sky. No atmosphere shell. Not necessary.

Local land and ocean:
- `const oceanMat = new THREE.MeshStandardMaterial({color:0x184b64, roughness:0.25, metalness:0.15});` Maybe no map. Add fog true. Sea has no procedural texture requirement? only ground and vegetation. okay. We can add subtle ocean canvas texture for roughness/color. Use make texture with blue noise repeat 80. But 2e6 plane UV. Use repeat 400? Each tile 5km. waves at 5km scale. Could. But no need.
- `oceanMesh.receiveShadow = true;` maybe.
- Land mesh with map ground texture repeat (60,40), rough. receiveShadow.
- Need maybe add distant beaches: a sand strip at coast z=~880 to 900 using Box/plane? Could add a thin sand-colored strip along coast, for realism. Land ends at 900; ocean begins. Create a strip 60km x 30m at y=0.55, z=890, color sand. Curved? Simple plane maybe. Could be visible low. Use a box or plane. Add.
- Pad area: vegetation texture underneath concrete. Add local pad concrete on top. Fine.

Vegetation:
- Instanced bushes. The ground is curved; for points within 2km, sag <0.3m, we can ignore and set y = 0.6 + sag? Use function `groundYAt(x,z) { return 0.5 - (x*x+z*z)/(2*R); }` for land, maybe ocean. Set y. Need on land. Use random positions within radius 1500, excluding pad radius 80. Use deterministic random maybe. `for`.
  `const bushGeo = new THREE.IcosahedronGeometry(1,0); bushGeo.scale(...?)` Actually instanced mesh with geometry sphere radius 1; scale individual via matrix. Use color variation. Set material `MeshStandardMaterial({color:0x4a6235, roughness:0.95})`; set instance colors. 800 instances. Maybe also create grass patches as Points? too much. Bushes enough.
  Add some tall trees? maybe. Low buildings and roads.

Roads:
- Function createRoad(x,z,w,d, rot) as PlaneGeometry with dark asphalt map on top of land. For curved ground, at distances maybe sag. For local within 2km, ignore. Position y=groundY+0.02. Use MeshStandard material. Add road at z from -1 to -500? The pad is at origin, roads around.
  - main road along z from -4000 to 400 maybe, width 40 at x=250. Another access road. Use plane rotated x.
  - Markings? not necessary.
- Buildings: boxes at x positions 500, -600, z -1000 etc. Low 1-2 stories. Use concrete/metal. With flat roofs. Add a few.

Lattice tower function:
```ts
function makeBeam(p1: THREE.Vector3, p2: THREE.Vector3, thickness: number, mat: THREE.Material): THREE.Mesh {
 const dir = new THREE.Vector3().subVectors(p2,p1);
 const len = dir.length();
 const geo = new THREE.BoxGeometry(thickness, thickness, len);
 const mesh = new THREE.Mesh(geo, mat);
 mesh.position.copy(p1).addScaledVector(dir,0.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.normalize());
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 return mesh;
}
```
Need all geometry unique? Many boxes; okay 100s. Could reuse? fine.

`createLatticeTower(width, depth, height, mat, thickness, levels)`:
- group
- corners (x±w/2, z±d/2) at y=0..height. Vertical beams segments? Use a single box per corner height. Use BoxGeometry(thick, height, thick) at corner. That is simpler, no lattice vertical segmentation. But for lattice look, cross braces on each face:
  - At each level y=0,10,...height, horizontal beams connecting corners. 
  - Diagonal braces between levels on each face. For each face, at y0 and y1, connect corner A at y0 to corner B at y1 and B at y0 to A at y1. This creates X. 
- 4 faces. Height 80, level 10 -> 8 levels. Each level 4 horizontals + 8 diagonals? ~96 beams. Fine.
- For masts, levels maybe 10, width 3, height 90. Four around pad -> many beams ~400. Fine. Use low segments. Maybe use shared material.
- For performance, could use `THREE.LineSegments` for masts. But mesh boxes okay ~500 meshes. Draw calls high but okay. Could combine with InstancedMesh? not necessary maybe 600 draw calls might be heavy. We can reduce: lightning masts use LineSegments with `LineBasicMaterial`, 4 masts with 3 legs and braces. Lines no shadows. Lattice tower main mesh boxes ~100. Lightning masts lines. Good.
  - Create `createLatticeMast` as LineSegments positions. Or use cylinder? Use `THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',...), lineMat)`. Add many line segments (vertical + cross). Good. Tall lightning masts can be thin lines, realistic enough. 
  - Main tower use beams.
  - Add 4 masts at (±80,±60). Each mast lattice? Use lines with 4 legs, width 4, height 100, cross. LineBasic color 0x777777. Add.
  - Cables: Lines from mast tops to tower top? Use LineSegments maybe. Could add simple lines from mast tops to ground? Lightning protection masts often have wires. Add thin lines from top of each mast to top of launch tower. Use `Line` with points. Maybe.

Tower placement:
- Tower at x=10, z=0, width 7, depth 7, height 85. Rocket radius 1.85. Tower side near x=6.5, rocket at x=0, gap 4.6. Good. But after pitch rotates, at t>0 rocket tilts +x towards tower? Rotation z=-pitch tilts local y toward +x, could collide with tower. At liftoff rocket rises vertically and soon moves +x after pitch. Tower is at x=10; rocket might pass near. At t=100, x displacement maybe 5km, gone. At t=20, pitch small, x maybe few m, tower near but rocket y ~? Could be okay. Maybe put tower at x=-12 to avoid tilting side? But rocket tilts +x, tower on -x safer. Camera at -z, tower on x=10 visible. Let's put tower at x=13 or -13? For visual, next to rocket. Use x=12. It might look like rocket tilts away. Fine.
- Umbilical arms extend from tower to rocket at y=40,55. Create thin box arms with small connectors. At launch, arms could stay; but realistic they retract. Not required. We can keep static.

Pad:
- pad concrete slab 90x90x1.5 at y=0.75? Land y at center ~0.5. Set pad bottom at 0.5, top at 1.5. Box(90,1,90) center y=1.0. Actually top 1.5. Good.
- Use concrete map repeat.
- Black trench: box(14,0.05,70) y=1.51 dark, position z=15? top 1.55. Extend from z=-15 to 50. Under rocket centered. Add side walls maybe. Add rectangular hole with black material.
  - `trench = new Mesh(new BoxGeometry(16,0.2,70), darkMat); position (0,1.4,20)`? It should be top. Use y=1.42, top 1.52. 
  - Add flame trench walls: two boxes (4,2,70) at x ±10, y=1.2. Maybe.
  - Add launch mount ring: `CylinderGeometry(6,7,2,8)` at y=1.5? But rocket base y=1.5. Use a gray octagonal pedestal maybe.
  - Hold-down clamps: 4 small boxes around base.
- At launch, smoke spawn from trench.

Rocket construction:
Need group. Create `createRocket()` returns group with various materials and flame stuff. But flame references need update. Use globals.

Let's code:
```ts
const rocketGroup = new THREE.Group();
scene.add(rocketGroup);
const rocketBodyMat = new THREE.MeshStandardMaterial({color:0xf3f3f1, metalness:0.1, roughness:0.55});
const darkMat = new THREE.MeshStandardMaterial({color:0x22262b, metalness:0.4, roughness:0.5});
const metalMat = ...
```
- Engine section: `new CylinderGeometry(1.85,1.9,4.5,32)` position y=2.5? local base y=0. Need nozzles below. Let's define:
  - nozzle height 2.2, base y=0. Engine section from y=2 to 6 maybe. `CylinderGeometry(1.85,1.85,4,32)` center y=4.5? Maybe body:
    - nozzle bell center y=0.8 height 2.4, bottom y=-0.4? We want base at 0. Use ConeGeometry? Nozzle is a bell widens down. Use `CylinderGeometry(0.35, 0.8, 2.2, 16, 1, true)` open-ended metal, center y=1.1? Bottom at 0, top 2.2. So local y 0 at bottom. Nine nozzles arranged, but to avoid below pad, bottom at 0. Good.
    - engine section: cylinder radius 1.85 height 4, center y=4.0? From y=2 to 6. Maybe body starts at y=5. 
    - first stage from y=6 to 47 (height 41). White.
    - interstage y=47 to 50 dark gray.
    - second stage y=50 to 58 white.
    - fairing base y=58 to 64 cylinder radius 1.85, then nose cone/ogive y=64 to 70. Use Lathe or Cone.
  Height total 70. Good.
  - Engine section y=2..6 dark. Nozzles 0..2.
  - Add base plate at y=2 maybe cylinder.
  - Stage1 body cylinder radius 1.85 height 41 center y=26.5.
  - Interstage cylinder radius 1.82 height 3.2 center y=48.6 dark.
  - stage2 cylinder radius 1.85 height 8 center y=54.
  - fairing: use LatheGeometry with points from y=58 to70. Profile radius: at y58 r=1.85, y64 r=1.85, y67 r=1.4, y69 r=.7, y70 r=0.05. Lathe. Need points as Vector2(radius, y). `LatheGeometry(points, 32)`. This creates around y. Good. Material white. The fairing includes a cylinder and nose. For smooth. Add a seam ring at y=64.
  - Maybe first stage has a visible darker band at y=43? Add thin ring.
  - Add engine nozzles: 8 around radius 0.9 plus center, bottom y=0. Use `CylinderGeometry(0.35,0.75,2.2,16,1,true)`; positions x=cos*1.1, z=sin*1.1, y=1.1. Need bottom at 0. Center y=1.1.
  - Add landing legs? no, not needed. Add small fin-like? no.
  - Marking plane at z=-1.861, y=30, width 6, height 2.5. Use flag + text. Need if body radius 1.85, plane at z=-1.86. Use rotation.y=Math.PI. But plane local x maps? PlaneGeometry lies XY; after rotate y PI, its normal points -z. Position z=-1.86. It will be visible from camera at -z. Its x remains maybe mirrored? Rotating y PI flips x; text may mirror? A plane front side normal +z; rotation y=PI makes normal -z but also front side faces -z, text texture is mirrored horizontally? Since rotate y PI, the right side of texture maps to -x (left in world). To avoid mirroring text, use material side DoubleSide and rotation y=0? A plane at z=-1.86 with normal +z faces +z, backside toward camera, with DoubleSide material renders texture on backside maybe mirrored? Hmm. Camera at -z looking +z sees backside. With side DoubleSide, the texture on backside might be mirrored. To have correct text facing camera, position at z=-1.86 and rotate y=PI; the front face normal -z. In local coordinates before rotation, texture x increases to right. After rotation y=PI, local +x maps to world -x, so text right appears world left, mirrored? Wait rotating the whole plane by 180 about y: the texture orientation rotates, so the text becomes mirrored from world view? Imagine a plane with text facing +z. Camera at +z sees correct. Rotate plane 180 about y, camera at -z now sees the front face? The text rotates with plane; from camera at -z, the text's left/right relative screen? The plane's local +x now points -x world. The camera at -z looking +z has world -x on screen right or left? Camera at (0,0,-10) looking +z: screen right is world -x? Let's compute: camera forward +z, up +y, right = forward × up? In right-handed, camera right = +x? Standard: looking down -z, right +x. If looking +z, right is -x. So world -x appears screen right. The text local +x (world -x) appears screen right, but texture right should appear screen right, so maybe correct? Actually original text texture left-to-right: local +x. After rotation, local +x -> world -x -> screen right. So texture right appears screen right. Good. No mirror. Fine.
    - However camera at -z and plane normal -z, correct front face. Good.
  - Flag maybe on one side. Use one plane. Draw US flag left, text right? On screen. Fine.
  - Add "FALCON 9" vertical? Keep.

- Shadows: rocket meshes castShadow=true, receiveShadow maybe. Need traverse set cast/receive. For engine no.
- rocketGroup position set later.

- Flame group child of rocketGroup at local base. Because rocket rotates, flame rotates. Good.
  - Create plume mesh geometry `CylinderGeometry(1, 3.5, 1, 32, 1, true)` translated. Actually top radius narrower than bottom? Exhaust expands downward. `CylinderGeometry(1.0, 4.0,1,32,1,true)` top radius 1 bottom 4. Translate y=-0.5 so top at 0. 
  - Material shader. Need uniforms uTime, uIntensity, uAltitude factor, uColor? Use.
  - `plumeMesh.scale.set(2.2, 30, 2.2)` initially? Top radius base 1*2.2=2.2, bottom 4*2.2=8.8, length 30. Good. At high, scale x 3.5, y 60. Let's use base `plumeLength=32`. Update `plumeMesh.scale.set(2.0+thin*1.5, length, 2.0+thin*1.5)`. But geometry top/bottom radius. Fine.
  - position y=-1? top at 0. set y=0.0.
  - Shader fragment:
```
uniform float uTime; uniform float uIntensity; varying vec2 vUv; varying float vY;
float hash(vec2 p){...}
void main(){
 float t=clamp(-vY,0.0,1.0); // 0 at top,1 bottom
 float n=0.75+0.25*sin(vUv.x*40.0+uTime*20.0)*sin(vUv.x*17.0-uTime*13.0);
 float core = exp(-t*2.2);
 vec3 c = mix(vec3(1.0,0.32,0.05), vec3(1.0,0.9,0.65), core);
 c += vec3(1.0,0.75,0.3)*core*1.5;
 float a = pow(1.0-t,1.3)*n*uIntensity;
 // maybe edges fade by uv.x? use vUv.x? Cylinder wraps, edges not.
 gl_FragColor=vec4(c*1.4, a*0.75);
}
```
Need `vY` local position y. Vertex:
```
varying vec2 vUv; varying float vY;
void main(){ vUv=uv; vY=position.y; gl_Position=...; }
```
Because geometry y [-1,0]? after translate, top 0, bottom -1. Good.
  - `depthWrite:false`, `transparent:true`, `blending:AdditiveBlending`, `side:DoubleSide`.
  - Inner core mesh maybe another cylinder smaller with higher intensity. Could skip; have sprite core.
  - Core sprite: `new THREE.Sprite(new THREE.SpriteMaterial({map: glowTexture, color:0xfff2c0, blending:AdditiveBlending, transparent:true, depthWrite:false, opacity:1}))`; position y=-1, scale (12,12,1). At high maybe scale 25. Update.
  - Mach diamonds: sprites at local y=-4..-20. Use glow texture, color white-blue, opacity. Create group. Sprites all share one material with color 0xcfe8ff, opacity .6. `machGroup.visible = burning && alt<25000`. Scale each. Add flicker. Use positions y=-5, -10, -15, -20 with scales 2.5, 4, 5, 6? Note local coordinates, but plume scales don't affect mach group (sibling). It is at rocket base. At high, plume length 60, mach diamonds visible only low. Fine.
  - Flame point light attached to rocket group at y=-5. But if rotation, local. Use `new THREE.PointLight(0xff9a3c, 0, 400, 2)`. Add to rocketGroup. Position y=-2. castShadow false. Intensity update.
  - Add small glow at nozzle with sprite.

- Update flame every frame:
  Need `const burning = simT < BURN && simT >=0 && rocketState...` But after reset t=0. If paused at t=0, still show? maybe engines not started? The simulation starts. Use `simT < BURN`.
  `const active = simT < BURN && simT >= 0;`
  `const throttle = active ? Math.min(1, THRUST0/(M0*G0*1.3)? ) : 0;` Since T capped late, throttle = T/THRUST0. Need compute from state mass? Use function exposed? Could approximate: `Math.min(1, 3*massAt*G0/THRUST0)`. We have mass. Use `massAtTime(simT)`. Define global helper. 
  Flicker: `0.8 + 0.2*Math.sin(realTime*40) + 0.1*Math.sin(realTime*83)` plus random.
  `uIntensity` = active ? 0.8*throttle*flicker : 0. 
  `plumeMesh.visible = active; coreSprite.visible=active; machGroup.visible=active && alt<25000;`
  length = 30 + 35*airThin + maybe speed? At launch ground 28, at 20km 40, at 60km 70. Use `airThin = clamp(alt/60000,0,1)`; length 30+55*airThin.
  width = 1.0 + 1.2*airThin.
  `plumeMesh.scale.set(width*2? We already base top radius. Use scale.x = 1.4 + 1.4*airThin, scale.y=length, scale.z same.`
  `coreSprite.scale.set(10+15*airThin, 10+15*airThin,1)` maybe sprite vertical? Sprite scale x,y. Could separate x/y. Fine.
  Mach diamonds fade with alt: material.opacity = 0.8*(1 - alt/25000).
  Flame light intensity = active ? (3000+6000*airThin? maybe) * flicker : 0. `distance = 300`. At high, light on rocket. Use 4000.

- Camera follow and sky:
  In animation loop, state alt. Update sky uniforms `uAlt` alt; star opacity; fog density; hemi intensity; earth atmosphere? no.
  Update rocket position and rotation.
  Need use `simState.x` plus maybe z. `rocketGroup.position.set(st.x, PAD_Y + st.alt, st.z)`. Since alt measured above pad. Rotation.z = -st.pitch. But if on pad and t=0, pitch 0.
  `rocketGroup.rotation.set(0, 0, -st.pitch)`? Need pitch around z. If rocket travels +x and tilts +x, rotation.z = -pitch. Yes.
  `rocketGroup.updateMatrixWorld()`. For camera center compute via localToWorld. Since group position set and rotation, localToWorld works after updateMatrixWorld. Could manually compute with quaternion:
```
const centerLocal = new THREE.Vector3(0, 35, 0);
rocketGroup.localToWorld(centerLocal);
```
Need no allocation? create temp vectors.
  But rocketGroup position y = PAD_Y + alt; local center y=35; after rotation, center world y ~alt+35 cos. Fine.
  Camera desired:
```
const groundCam = new THREE.Vector3(105, 9, -135);
const padTarget = new THREE.Vector3(0, 28, 0);
const chaseOffset = new THREE.Vector3(65, 25, -65); // length 95
const chaseTarget = center.clone().add(new THREE.Vector3(0, -5, 0)); // look slightly below?
const follow = smoothstep(60, 150, alt);
desiredPos.lerpVectors(groundCam, center.clone().add(chaseOffset), follow);
desiredTarget.lerpVectors(padTarget, center, follow);
```
At alt 150, follow 1. Camera at center+(65,25,-65) = distance sqrt(65²+25²+65²)=94.6. Good. Look at center. 
  But at ground, camera groundCam maybe y=9, padTarget y=28. Low camera looking up. good.
  Transition: desired changes with follow. Use camera position direct if follow > .98 else lerp. But at follow between 0 and 1, desiredPos includes static groundCam and moving rocket center. This will move camera up as rocket climbs, gradually. Could be okay. Use damping. After follow .98, direct. At follow .98 alt ~? 150? rocket at 150m. Direct copy might snap slightly from lag. But smooth enough. Use currentLook to look. To avoid snap, use damping all the time with high k but at high speed. Alternative compute desired camera based on actual rocket and then use `camera.position.lerp(desired, factor)` with factor `1 - Math.exp(-12*Math.max(dtReal, simDt))`? At x30, simDt~0.33, factor 0.98. Lag 2% of relative movement, maybe 20m for 1km. within 100. At x30 with rocket moving 2km per frame, lag 40m. Still within 100? Could be. Use factor based on simDt: `const followLerp = 1 - Math.exp(-15 * Math.max(dtReal, dtSim));` If dtSim=0.33, factor 0.993; lag on 2km = 14m. Good. If dtSim=1 (dt capped 1/30*30=1), factor 0.999999? 1-exp(-15)=1. Great. At low speed, factor 1-exp(-15*0.016)=0.21, smooth. At high, direct. Good. Use `Math.max(dtReal, simDt)` but simDt can be 0 if paused. Use dtReal. 
  `camera.position.lerp(desiredPos, 1 - Math.exp(-14 * Math.max(dtReal, Math.abs(dtSim))))`.
  Look target similarly factor 1-exp(-18*...). At high nearly direct. Good.
  At reset, detect and snap camera to ground. Also currentLook.
  Need update camera far? far 1e8. Near 0.5. With logarithmic depth, okay. At high, near 0.5. Rocket close 100. fine.
  Camera can see stars and Earth. 
  Maybe add slight orbit movement? No.

- Reset detection:
  Variables `let lastSimTime=0; let lastTrailCount=0; let trailBirthTimes:number[]=[];`
  In animation loop after state:
```
if (st.t < lastSimTime - 0.001 || (lastSimTime > 1 && st.t === 0)) {
  clearSmoke();
  trailBirthTimes.length=0;
  lastTrailCount=0;
  camera.position.copy(groundCam);
  currentLook.copy(padTarget);
  lastSimTime=st.t;
}
lastSimTime=st.t;
```
If paused and reset? still render loop. Good.
  If t goes backwards. 
  Need when reset called, userSpeed resets and camera pad.
  Also smoke spawn time reset. `lastSmokeT=0; spawnAcc=0`.
  `flame` active at t=0.

- Smoke update uses simT and dtSim. In the render loop:
```
const dtSim = stepAmount; // actual time advanced this frame (min(delta,1/30)*speed) if !paused else 0
```
If paused, no step, but smoke shouldn't evolve? Maybe pause all physics and visual? The render loop should not step physics, but smoke particles can continue? Paused means flight paused. We can still animate flame/flicker and smoke maybe freeze? Not specified. Sim paused stops step. Smoke can maybe drift with real time? But no. Simpler update smoke with dtSim (0 if paused), so frozen. Flame flicker can still use real time. Fine.
  Since sim step may be 0 when paused. Use actual step amount.
  But if user resets, clear.

- Trail update:
  The trail array is updated by sim step. Need after step and state. Use `rocketSim.trail`. Maintain birth times:
```
if (trail.length < lastTrailCount) { trailBirthTimes.length=0; lastTrailCount=0; }
while (lastTrailCount < trail.length) { trailBirthTimes.push(elapsedReal); lastTrailCount++; }
```
But if reset empties trail, length 0 < last => clear. Good.
  If sim runs multiple step calls between render? no.
  Update line buffer:
```
let idx=0;
const windX=2.5, windZ=1.2;
for i in trail: 
  const age = Math.min(elapsed - trailBirthTimes[i], 120);
  const p=trail[i];
  positions[idx++] = p.x + windX*age*0.5? 
  positions[idx++] = p.y + 0? // wind y maybe 0
  positions[idx++] = p.z + windZ*age;
  if (idx/3 >= MAX) break;
trailLine.geometry.attributes.position.needsUpdate = true;
trailLine.geometry.setDrawRange(0, count);
```
Point size / line material. Use `THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.55, depthWrite:false})`. The line could be too thin. Use additive? Normal. 
  Contrails should be behind rocket. At high, line visible. Maybe add a second line offset? no.
  Puffs:
```
const puffCount = Math.min(MAX_PUFFS, count);
const stride = Math.max(1, Math.floor(count/MAX_PUFFS));
for j=0..: i=j*stride; set positions; set size? PointsMaterial shared size.
```
Use PointsMaterial size=6, map=glowTex, transparent, opacity=0.5, depthWrite:false, sizeAttenuation true, alphaTest=0.01, blending Normal. Color white.
  But PointsMaterial with `map` and `transparent` default depthWrite false? set.
  Update positions. Need geometry drawRange.
  Use drift for puffs too. Use maybe less. The line and puffs drift.
  At high, the contrail behind rocket may be far below; camera near rocket sees only recent part. Good.
  Set puffs sizes via shader? PointsMaterial fixed size. Use 5m; at 100m distance, 5m appears big. Maybe 4m. Use `size:4.5`. At far it shrinks. Fine.

- Smoke spawn and update:
  Need class/struct:
```
const SMOKE_MAX=1600;
const smokePositions = new Float32Array(SMOKE_MAX*3);
const smokeSizes = new Float32Array(SMOKE_MAX);
const smokeAlphas = new Float32Array(SMOKE_MAX);
const smokeSeeds = new Float32Array(SMOKE_MAX);
const smokeVel = new Float32Array(SMOKE_MAX*3);
const smokeAge = new Float32Array(SMOKE_MAX);
const smokeLife = new Float32Array(SMOKE_MAX);
let smokeCursor=0;
```
Initialize positions far away and alphas 0, sizes 1. Geometry attributes.
  Shader uses attributes aSize, aAlpha, aSeed. Need set `aSize` etc.
  `smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions,3).setUsage(THREE.DynamicDrawUsage));`
  `smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(smokeSizes,1));` etc.
  `smokeGeo.setDrawRange(0, SMOKE_MAX);` all.
  `smokePoints.frustumCulled = false;` Because positions maybe far and bounding sphere stale. Set false.
  Shader material transparent, depthWrite false, depthTest true. Vertex gl_PointSize formula. At camera distance, if point behind camera? discard by clip. Points can still draw if behind? projection. Fine.
  Add `uPixelRatio` uniform update on resize.
  Fragment alpha. Use smoke color white with slight gray. Could use per particle seed. Add a `vSeed`.
  Use `NormalBlending`. Smoke clouds normal. Add `gl_FragColor = vec4(mix(vec3(0.85,0.86,0.87),vec3(1.0,0.98,0.94),vSeed), alpha);`
  Need if alpha < maybe 0.01 discard. Add `if(alpha<0.01) discard;`.
  For lit smoke? Shader not lit. Could tint based on sun direction? Not. Use color. It's okay, physically not but soft. 
  Update:
```
function spawnSmoke(n:number, simT:number) {
 for...:
  const i=smokeCursor; smokeCursor=(smokeCursor+1)%SMOKE_MAX;
  const angle=Math.random()*Math.PI*2;
  const r=4+Math.random()*30;
  const px=Math.cos(angle)*r;
  const pz=Math.sin(angle)*r + (Math.random()<0.5? 15:-5);
  // ensure around pad, not under rocket? 
  positions: x=px, y=PAD_Y+0.5+Math.random()*4, z=pz
  vel: outward* (20+random*40), y=2+random*10; plus z + 20? 
  life=10+random*12; age=0; size=8+random*18; alpha=0; seed=random.
}
```
But if spawn in air at y up to 4. Pad top 1.5. okay.
  Update per active:
```
for i:
 if (alpha<=0 && age>life) continue? Need active flag. Use age < life && life>0.5.
 age += dtSim;
 if age > life: alpha=0; size=0; continue
 // drag
 const drag=Math.exp(-0.8*dtSim);
 vx *= drag; vz *= drag;
 vy += (6 + 2*seed)*dtSim; // buoyancy
 // For rolling along ground, if y near ground, maybe y velocity low until after 2s
 const roll = smoothstep(0,3,age); // 0 until 2?
 // Instead, we set low vy initially, buoyancy gradually.
 positions...
 y += vy*dtSim; if y < ground+size*0.3? maybe.
 // fade alpha
 const lifeFrac=age/life;
 a=Math.sin(Math.PI*Math.min(1,lifeFrac))?; Actually fade in quickly, fade out. alpha = smoothstep(0,1,age) * (1 - smoothstep(0.6,1,lifeFrac)) * 0.7.
 size = baseSize + age*2.0;
 // clamp y above ground? Smoke can rise.
```
Need store baseSize. Use `smokeBaseSize` array.
  Because smoke puffs can be huge; set size = base + age*1.5.
  Use positions y from 2 to maybe 100.
  At speed 1, clouds expand over 15s, good. At 10, fast. But user sees from chase by then.
  Spawning logic:
```
let smokeSpawnAcc=0;
function updateSmoke(simT, dtSim) {
 if (dtSim>0 && simT < 28 && simT >=0) {
   smokeSpawnAcc += dtSim * 30; // 30/s sim
   while (smokeSpawnAcc>=1) { spawn; smokeSpawnAcc-=1; }
 }
 // update all active
 ...
 // update attributes
}
```
At t=0, dtSim=0.016*1=0.016 => spawnAcc .48, after 2 frames spawn 1. Could be slow. Want clouds immediately. Could pre-spawn some when t small? When reset, spawn a few? At t=0 engines start, after 0.1s smoke. Accept. Increase rate to 80/s: first second 80. At 10s 800. That's a lot. Use 45/s. Over 28s 1260, matches max. At 1x first 10s 450 particles. Good. At x10, dtSim .16 ->7 per frame, 420/s real. Heavy but only for 2 real secs. Fine.
  But if sim time starts 0 and then jumps to 0.16, spawn 7. Good.
  We need not spawn after 28s. At t=30, stop.
  Colors mostly white. 
  Set all attributes needsUpdate each frame while changing. Could update only if dtSim>0. If paused, still need? no. 
  Reset clear: alphas 0, ages 0, life 0, sizes 0, cursor 0, spawnAcc 0.

  Ground clamp: For smoke `y` maybe below ground. Keep y >= groundYAt(x,z)+size*0.2? But particles huge and soft; can intersect ground. Clamp. Use `const gy = 0.5; if (positions[i*3+1] < gy+0.5) positions...`. Actually large clouds at ground should start at y ~2 and roll. If y+size? Visual point centered. okay.

- Add a subtle pad steam before launch? no.

- The smoke point size formula: `gl_PointSize = aSize * uPixelRatio * (240.0 / max(1.0, -mv.z));` If aSize=20m, distance 100 => 20*1.5*240/100=72px. okay. distance 10 =>720px, but pad smoke at camera 130m, size 20 =>55px. Good. Clamp `gl_PointSize = min(400.0, ...)`. Need pixel ratio in fragment? no.

- Blending for smoke: NormalBlending with alpha. Since many overlapping, may look gray. Good. The color white. Sunlight not applied. Could add slight alpha.

- Stars opacity update: `starMat.uniforms.uOpacity.value = smoothstep(70000,100000, alt)`. Need also maybe at high black sky. Good.

- Sky sun and exposure. 
- Earth texture:
`makeEarthTexture`: 
```
const c=document.createElement('canvas'); c.width=1024; c.height=512; ctx...
ctx.fillStyle='#1c4f73'; fill
for continents: draw random green/brown blobs; maybe use noise.
ctx.fillStyle='rgba(255,255,255,0.25)' clouds...
```
Need maybe top of texture land. But local ground covers. At high, texture okay. Use repeat wrap. 
Set `tex.wrapS=RepeatWrapping`, `wrapT=ClampToEdge`.
Material roughness 0.75. Maybe use a bump? no.

- Distant atmospheric haze: FogExp2. At high reduce. But Earth material fog true. At high density small. Good.
  Fog color `0xcfe3f2`. Scene background? Sky covers. For clear color set. 
  `scene.fog = new THREE.FogExp2(0xcfe3f2, 0.00008);`
  Update each frame: `fog.density = 0.00008 * Math.exp(-alt/15000) + 0.0000002;`
  At ground 0.00008. At distance 2000m exp(-0.16)=0.85. Not much. Need haze at horizon 10km: 0.00008*10000=0.8 exp(-? FogExp2 factor exp(-(d*density)^2)=exp(-0.64)=0.53. Good. 
  At high alt 100km, density ~0.0000002, over 100km: exp(-(0.02)^2)=0.9996 no. Earth visible clear. But aerial perspective at high maybe not. Fine.

- Ground texture map. Maybe set `colorSpace=SRGBColorSpace`.
- Concrete map roughness etc.

- Buttons: 
```
const overlay = document.createElement('div');
overlay.style...
document.body.appendChild(overlay);
const info = document.createElement('div');
overlay.appendChild(info);
const btnWrap = ...
for speeds...
button.onclick = () => rocketSim.setSpeed(s);
```
Need no HTML. Buttons are HTML created. Fine.
  Add CSS styles. 
  Keyboard:
```
window.addEventListener('keydown', (e)=>{
 if (e.key==='1') rocketSim.setSpeed(1); ...
 if (e.key===' ') { rocketSim.paused = !rocketSim.paused; }
});
```
Need paused maybe toggled by Space. Not requested but okay. But buttons overlay might capture. Good.
  `state().speed` returns current. At t<10 default 1; if user pressed 30, speed 30. Overlay update.

- `__ready`: after first render. Use `let firstFrame=true;` in animation after `composer.render(); if (firstFrame){...}`. Need `__scene`, `__camera`, `__renderer` set before. `__rocket` set. `paused` bool. 
- `__rocket` typing any. 
- `window.__ready` set.

- Animation loop:
```
const clock = new THREE.Clock();
let lastTime = performance.now();
let elapsed = 0;
renderer.setAnimationLoop((time:number)=>{
 const dtReal = Math.min(Math.max((time-lastTime)/1000,0), 1/30);
 lastTime=time;
 elapsed += dtReal;
 const stBefore = rocketSim.state();
 const scale=stBefore.speed;
 const dtSim = rocketSim.paused ? 0 : Math.min(dtReal,1/30) * scale;
 if (!rocketSim.paused) rocketSim.step(dtSim);
 // but if paused, need trail? no
 const st = rocketSim.state();
 // reset detection before update visual?
 ...
});
```
Wait `stBefore.speed` before step. At t<10 speed 1, after step may cross 10. Next frame speed 10. Good. The render loop should call step(min(delta,1/30) * speed) when not paused. Use speed from current state before step. If state speed default at t=0 =1. Fine.
  But if t exactly <10, step 0.016. After step t=10.03, speed becomes 10 next frame. Good.
  When `paused`, dtSim=0 and do not call step. But then if reset while paused, state t=0, visuals should update. The reset detection sees t<lastSim. Clear and camera. Good.
  `dtReal` cap 1/30. The spec: render loop calls step(min(delta,1/30)*speed). We follow. delta from ms. Use if `dtRaw`. 
  If tab hidden, time difference large, cap.

  Need if not paused, step any even if dtSim=0. fine.
  `rocketSim.step(dtSim);`
  Then state. If paused, dtSim=0 and no trail. Good.

  For reset detection, lastSimT. If step called with positive then t increases. If paused and t same, not reset. 
  On reset, `st.t=0`, lastSimT maybe 0. If reset when t=0 already, trail empty, no issue.
  Use if `st.t + 1e-6 < lastSimT` or `rocketSim.trail.length === 0 && lastSimT > 0.5`. The second may trigger at startup after reset. Fine.
  When reset, also set `smoke...`, `trailBirthTimes`, `lastTrailCount`, `smokeLastT`. 

  Update camera after rocketGroup. 
  Use `dtReal` in damping. 
  Update overlays.

  `renderer` size etc. 
  `composer.render();`
  if not ready set.

- Resize:
```
window.addEventListener('resize', () => {
 const w=innerWidth,h=innerHeight;
 camera.aspect=w/h; camera.updateProjectionMatrix();
 renderer.setSize(w,h);
 composer.setSize(w,h);
 starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
 smokeMat.uniforms.uPixelRatio.value = ...
});
```
Need set renderer pixel ratio initially. `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`
Then composer.setPixelRatio(renderer.getPixelRatio()) maybe. Does EffectComposer have setPixelRatio? It does likely. But to avoid type error if missing? Let's check three EffectComposer API: has `setPixelRatio(pixelRatio: number): void` since r? likely yes. If not, compile error. I think @types/three EffectComposer includes setPixelRatio. Use it? Could avoid and rely on setSize. But render target then uses size without pixel ratio, causing lower res. Accept? Hmm. Use `composer.setPixelRatio` maybe. Let's recall @types/three example jsm postprocessing EffectComposer.d.ts: 
```
export class EffectComposer {
 constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget);
 renderer: WebGLRenderer;
 renderTarget: WebGLRenderTarget;
 ...
 setSize(width: number, height: number): void;
 setPixelRatio(pixelRatio: number): void;
 render(deltaTime?: number): void;
}
```
Yes.

  On resize, setPixelRatio again after renderer. Maybe `composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h);`.
  Need update `starMat.uniforms.uPixelRatio` and smoke. Since star points size in pixels, pixel ratio. 
  Use `renderer.getPixelRatio()`.

- Bloom pass type. Constructor `new UnrealBloomPass(new THREE.Vector2(w,h), 0.8, 0.5, 0.85)`. Good.
- OutputPass: `new OutputPass()`.

- renderer.shadowMap.enabled; use `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.
- logarithmicDepthBuffer true may conflict with composer? It should. 
- `renderer.setClearColor(0x000000)`? Sky covers.
- `renderer.toneMapping`.

- Earth sphere and sky parent. Need add camera to scene. 
- `scene.add(camera)` once. Then `camera.add(sky)`, `camera.add(stars)`.
- Could camera children inherit scene fog? shader no fog. Points shader fog false.
- Need `starPoints.frustumCulled=false`.

- Need use `THREE.Object3D` etc.

- Create ground curvature:
```ts
function curvePlane(geo: THREE.BufferGeometry, baseY:number): void {
 const pos = geo.attributes.position as THREE.BufferAttribute;
 for (let i=0;i<pos.count;i++){
   const x=pos.getX(i), z=pos.getZ(i);
   pos.setY(i, baseY - (x*x+z*z)/(2*EARTH_R));
 }
 pos.needsUpdate=true;
 geo.computeVertexNormals();
}
```
But after creating PlaneGeometry and rotateX(-PI/2). Then translate if land. For land, we want center z = -14550 and dimensions 60000 x 30900. Create plane, rotate, translate(0,0,-14550), then curve. The x,z used from vertices after translation. Good.
For ocean, plane 2e6 centered origin, baseY=-2. It extends under land. curve. But if center at origin, the coastline? Ocean everywhere. Land overlay covers land. For z>900, ocean visible. For z<900, land overlay. Good.
  Land plane y base maybe 0.6. Ocean y -1.5. At coast, land ends at z=900, edge maybe visible as a 2m cliff. Add beach strip. Could set land base 0.8 and ocean -0.2, cliff 1m. Fine.
  But land plane is 60km wide x 30.9km deep. At x beyond ±30km, ocean visible. Good.
  Use `landBase=0.75`, `oceanBase=-0.2`. At origin land y .75. Pad bottom perhaps .8.
  Need `groundYAt(x,z) = 0.75 - (x*x+z*z)/(2R)` for land. Pad at y = groundYAt(0,0)=.75. Set pad top = 1.8. Use PAD_Y=1.8. 
  Rocket base at PAD_Y. 
  Pad box height 1.2 center y=1.2? Land .75. Pad bottom .75, top 1.95. Set PAD_Y=1.95. `padBox` height 1.2 center .75+0.6=1.35, top 1.95. Good. Tower base at pad top? Set tower group position y=PAD_Y. Masts base maybe groundY+? around pad outside concrete, use ground. 
  Use PAD_Y=1.9. Good enough.

  `groundYAt` for land at different x,z. For local objects within 2km, sag. Use base .75.
  For pad, 90x90 extent, curvature sag ~0.0003m negligible, so flat pad at top constant.

  Ocean plane with base -0.5. At origin under land. At coast z=900, ocean y -0.5 -0.063 = -0.56, land y .75-.063=.69, cliff 1.25m. Beach strip at y=.72. Fine.
  At far 1000km, both sag ~78km, ocean .5 below land. Earth below 80m. Good.

  Need Earth sphere top at -80 maybe. Set center y = -R - 80. Earth surface at origin -80. Local ocean -0.5, 79.5m above. Fine.

  At high, local ground plane 60x30km visible under rocket. Earth sphere beyond. Could see a rectangular land patch? At 200km altitude, 60km patch is small. Fine.

- Earth texture mapping. Sphere top pole. The local area at normal up corresponds to texture pole where ocean color maybe. At high, the ocean plane covers center; Earth sphere far. The Earth sphere's top under ocean. So texture only visible beyond 1000km. We can make it mostly ocean with continents. Good.

- At high, the horizon of local ocean at 1000km sag and Earth sphere. Ocean plane extends 2e6, so beyond 1000km it curves down. It may cover Earth sphere out to 1000km radius. At 200km altitude, horizon distance ~1.6e6? sqrt(2*6371*200)=50,000 km? Wait calculate: sqrt(2*R*h) = sqrt(2*6.371e6*2e5)=sqrt(2.548e12)=1.596e6 m = 1596 km. Local ocean plane extends 1000km radius, not enough. Beyond it Earth sphere. Earth sphere radius 6371km. At altitude 200km, line of sight to horizon 1596km. Earth sphere needed. Local ocean 1000km covers near half. There may be a transition at 1000km edge. Make ocean plane 4e6 x 4e6 (radius 2e6) and segments 200. At edges sag 313km, still. Use 200x200 ~40k vertices. Fine. Then horizon 1600km within ocean plane; Earth sphere beyond? At the horizon, local ocean plane extends to 2e6 (2000km), enough. It will render a curved ocean surface but lacks the far side curvature? With base -0.5 and curvature formula, at 1600km sag 201km, matches Earth. Good. The ocean plane is a flat sheet curved, so the horizon will be where it curves below view, similar. It won't wrap around Earth but at 200km altitude horizon at 1600km, so edge at 2000km just beyond. Great. At 500km altitude, horizon 2524km, plane 2000km not enough; Earth sphere visible. Fine.
  Use ocean size 4,000,000 x 4,000,000, segments 160? 2e6 radius. Vertex spacing 25km. Enough. 25,600 vertices. 
  But at low, ocean plane 4000km, fog/haze. Fine.
  Earth sphere still under. 
  At high, local ocean plane is textured blue and appears as a giant flat curved plane. At 200km, good. At 500km, edge visible but Earth sphere behind, ocean plane and sphere same blue, maybe seamless. Add fog/haze? could hide edge. Good.
  Set ocean material color similar to earth texture ocean. 
  Could apply ocean map repeat 300 on 4e6, tile 13km, no wave detail. Fine.

  Land plane 60km x 30km. At high, a green strip near pad. "view of the coast" yes, the coastline at 900m is too close. Wait coast at 900m from pad means from 200km altitude, the coast line is tiny around pad. Not a visible coastline. For launch photo from altitude, they'd see Florida coastline. We need coastline scale maybe bigger. Put ocean at z=6000? Pad could be near coast; Cape Canaveral pad 39A is about 1km from ocean, but from 200km, coastline over 1km not visible. Need maybe exaggerate: coastline 5km behind pad. From high, still tiny. To see Florida coast, need hundreds of km. But no need exact. The prompt says "Atlantic Ocean on horizon behind pad", "view of coast". At low, coast at 900m. At high, local land patch could include a coast at 5000m, still small. Could make land plane wide but the coastline at z=5000 and x large; at 200km, a 5km coast is 1% of horizon. Not noticeable. But Earth texture could show a coastline. Hmm.
  Maybe set coastline at z=1500 for low, and add a large green peninsula on Earth sphere visible at high. But mapping. 
  At high, the camera near rocket looking at rocket; Earth below. The local ocean/land patch visible. A coastline might not be obvious. The requirement may be evaluated visually in screenshot, not exact. The low scene ocean behind pad is important. We'll have coast at 1200m. At high, Earth sphere with generic land/ocean maybe. 
  Could add a large land peninsula shape on the ocean plane itself: use a green landmass extending along x? The local land plane could be extended to 300km in x and 3km in z, so coastline is a long strip visible from high. At high, a long green strip along coast. Hmm.
  Make land plane 400,000 x 30,900? That is 400km along x, 31km deep to coast. Then from high, coastline is long. But the pad area extends. At low, land to x ±200km, ocean beyond z=1200. Good. Curvature. More vertices. Use 200x40 segments. 8k vertices. Land texture repeat (200,15). That gives a long coastline and landmass. But the land behind pad extends z=-30000, fine. A 400km x 31km strip is a long peninsula roughly. At high, visible. Good. At x beyond 200km, ocean. Florida is a peninsula; this approximates.
  However from low camera looking toward +z, the coastline is at z=1200 across x; ocean horizon. To the sides, land extends. Fine.
  Let's use land width 300,000, depth 30,000, centered z=-14,400 (coast z=600? wait size 30,000, center z = -14,400 => edges -29,400 and 600. We want coast at 1200, set center z=(zmin+1200)/2. Let zmin=-30000, zmax=1200 => center=-14400, depth=31200. Good). Width 300,000. At high, a long strip. Great.
  But at x=±150,000, the land sag by (150e3)^2/(2R)=1,766m. Ocean base -0.5; land high at center. It is curved. Good.
  Use `PlaneGeometry(300000, 31200, 240, 60)`; curve. 14k vertices. Fine.
  Land texture repeat (150, 15) -> 2km tiles. Good.

  But roads/buildings only near pad. Vegetation within 2km. Fine. At high, land is green with texture. 

  Need coast visible: land edge at z=1200, ocean. Good. Add beach strip along z=1200, width 300,000, depth 80. Curve. Sand color. At high, a long beach. Good.
  
  At low camera at z=-100 looking +z, ocean starts at 1200m. The ocean horizon beyond. That's okay; the pad is 1.2km from shore, like Cape Canaveral. 

  Ocean plane 4e6 x 4e6 centered at origin. At z>1200, visible. At z<1200, land covers. Great.
  Earth sphere under. 

  Land plane at y .75, ocean -0.5. Cliff 1.25m at coast. Add beach strip at y .8 maybe. Good.

- Roads: place main road on land near pad. Use curved? ignore local sag. For long roads maybe align but not. Use short 2km. Fine.
  - Road along x at z=-300, 2km x 35m. Another along z at x=300 from z=-2000 to 1000. Use boxes at y .82. They may be flat while ground curved, but within 2km sag .3m, fine.
  - Add road stripes? not necessary.

- Buildings: low hangars at x=-1000,z=-1500, etc. With light gray. Add maybe.

- Pad details:
  - create a circular concrete pad? box. 
  - Add blast pit under rocket: cylinder radius 6? dark. 
  - Add water tower? no.

- Camera view: Initial camera at (110, 10, -140) looking at (0, 30, 0). Distance ~180. Low near pad. Rocket 70m tall. FOV 45 vertical; at distance 180, vertical coverage 150m, rocket fills about half. Good. Low looking up. Ocean behind at z=1200 beyond rocket. Tower. Nice.
  At liftoff, camera stays until follow. Good.

- Maybe add a sun disc. Sky shader sun. Directional light position should align with sky sun. Let `sunDir = new THREE.Vector3(-0.4, 0.6, 0.65).normalize()`? We need sky sun behind? For a launch photo, sun perhaps behind camera or side. If sun is in front, rocket backlit; plume. Let's set sun from (0.35,0.55,-0.75)? Sun in front? Sky sphere fragment uses direction toward sun. Camera at -z looking +z. If sunDir (0.3,0.6,0.75) is toward +z (in front), backlit rocket. It could look dramatic but details dark. Better sun side/back: sunDir (0.6,0.5,-0.6) toward -z (behind camera) to front-light rocket. The sun would be behind camera, not in view. Sky maybe no sun disk. Launch photos often sun high. Use directional light at (-600,1000,-600) meaning light comes from (-x,+y,-z); sky sun direction toward light = normalized(-0.5,0.7,-0.5). It is behind-left of camera. Good. Shadow cast to +x,+z. 
  But if sun behind camera, the sky sun not in view. Fine. Add glow maybe not visible. The scene lit.
  Use `sunDir = new THREE.Vector3(-0.45, 0.75, -0.5).normalize()` (direction from scene to sun). Directional light position = sunDir * 2000. target 0. Good.
  At high, sky sun maybe behind. Stars.

- Directional light shadow target. `const sun = new THREE.DirectionalLight(0xfff6e8, 3.2); sun.position.copy(sunDir.clone().multiplyScalar(2000)); sun.target.position.set(0,0,0); scene.add(sun.target);` But DirectionalLight target must be in scene? If target not added, default target at origin? It uses target.matrixWorld. Add. `sun.castShadow=true`. shadow camera. 
  As camera/rocket high, shadow camera remains near pad. The rocket at high no shadow. Fine. At low, good.
  Could update sun.target to rocket? no.

- Add ambient/hemi. 
- Need renderer.info maybe no.

- Potential issue with shadow map and large near/far. Set camera left/right 300, near 10, far 5000. Position at 2000, target 0. Shadow camera near 10 far 5000, okay. 
- `sun.shadow.bias=-0.0001; normalBias=0.5;`
- Light intensities with ACES. Use 3.5. Hemi 0.5.

- Marking texture uses flag. Need draw. Fine.

- Code length maybe 1000+ lines. Accept.

Let's be mindful compile strict: no implicit any, all functions typed. ShaderMaterial uniforms type can be inferred. Accessing `material.uniforms` typed as `{[uniform:string]: IUniform}`? For ShaderMaterial, `uniforms` type `{[uniform: string]: IUniform}`. Access `.value`. Fine.
- `starMat.uniforms.uOpacity.value = ...` no type error.
- Variables with possible null: e.g. `const ctx = canvas.getContext('2d'); if (!ctx) throw new Error;`.
- `document.body` exists.
- `window.devicePixelRatio`.
- `setAnimationLoop((time: number) => { ... });`
- `const trailPosAttr = trailLine.geometry.attributes.position as THREE.BufferAttribute;`
- `setDrawRange(0, count)`.

- Build lattice using `THREE.Mesh` maybe type.
- `mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());`
- If dir length zero? no.

- `LineSegments` geometry setAttribute position. Type okay.

- InstancedMesh matrix:
```ts
const dummy = new THREE.Object3D();
for(...) { dummy.position.set(...); dummy.scale.set(...); dummy.rotation.set(...); dummy.updateMatrix(); bushes.setMatrixAt(i, dummy.matrix); bushes.setColorAt(i, color); }
bushes.instanceMatrix.needsUpdate = true;
if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
```
`setColorAt` exists. Need `bushes.instanceColor` type `InstancedBufferAttribute | null`. Test null. Good.
- Use `THREE.Color` random. 
- Could use `bushes.castShadow = true` and receiveShadow. 1000 instances cast. okay but shadow camera only near pad. Fine.
- Add a second InstancedMesh for taller shrubs with different geometry? Maybe not.

- Ground vegetation texture procedural: no external.

- Smoke shader attribute names. Need use `attribute float aSize;` in ShaderMaterial. In WebGL2, Three injects? For ShaderMaterial, custom attributes declared. Fine.
- Points size uniform. `gl_PointSize = min(500.0, aSize * uPixelRatio * (320.0 / max(1.0, -mvPosition.z)));`
- If aAlpha 0, still computes. Fine.

- Contrail PointsMaterial: use `map: glowTexture`, `alphaTest: 0.01`, `transparent:true`, `depthWrite:false`, `size:5`, `sizeAttenuation:true`, `color:0xffffff`, `opacity:0.35`, `blending:THREE.NormalBlending`. Need `glowTexture` maybe colorSpace.
  The points positions drift. geometry drawRange. 
  To create contrail geometry, positions Float32Array(MAX_TRAIL_VIS*3). MAX maybe 6000. Use one point per every maybe 2. We'll fill up to 6000. If trail length larger, stride. Need buffer allocated `MAX_CONTRAIL_POINTS=8000`. 
  In update, iterate all trail points but cap at 8000; if count > 8000, stride. Compute wind by age. Use `trailBirthTimes[i]`. Need update after new points. 
  For line, allocate `MAX_TRAIL_LINE=20000`. If trail length >20000, use last? But trajectory from launch should include all. Could show first 20000 and ignore rest. At 60fps x1 for 200s -> 12000 points, under 20000. x30 -> 400. Fine. Use all.
  For line positions, if count > max, stride. Use `stride=Math.max(1, Math.ceil(count/MAX_TRAIL_LINE))`. Fill every stride. Then line not exactly all points but okay. Need keep first point? fine.
  For puffs, also.

  `trailBirthTimes`: At start, for each new trail point push `elapsed`. If sim t resets, clear. If trail length grows by multiple? We only call step once per frame, so +1. But if reset and t=0 no trail. Fine. If we pause then no new. 
  If user calls `window.__rocket.step(dt)` outside render loop, multiple points can appear. The birth times will all get same current real time. okay.
  If trail length decreased due reset, clear.

- Update `trailLine` every frame. Could be expensive 20k but fine.
- Contrails in space? After burn, plume gone but trail continues? The trail persists. Good. The rocket continues ballistic.

- At high, the trail points are in world. The camera is near rocket; the trail extends below along path. It may look like a white line and puffs. Drift slowly. Good.

- The overlay mission data:
  Need format T+ time maybe `T+${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`. Simpler `T+${t.toFixed(1)} s`.
  Alt km `st.alt/1000`.
  Velocity `st.velocity.toFixed(0)` m/s.
  Speed `x${st.speed}`. 
  `paused` maybe display "PAUSED" if paused. 
  Buttons active styling maybe. Not needed.
  Need overlay small but visible. CSS position fixed, left 12px top 12px, padding 8px 10px, font 12px, color #fff, text-shadow. background rgba. Pointer events auto. Canvas under. 
  Buttons x1 x10 x30. Use `button.style...`; `button.onclick`.
  Add press keyboard. Need also set button active maybe.

- "Playback speed ... keys 1,2,3 (and three buttons) set x1, x10, x30." Use e.key. Use `e.preventDefault()`.
- Default speed: state.speed at t<10 =1; after 10 =10. When viewer chooses, overrides. reset clears.
- Need `state().speed returns current value`. Good.

- `reset` also clears viewer choice. We do. Does reset clear paused? maybe no.
- `reset` sets trail same array object, length 0. Good.

- State `t` increases. Use step dt, not speed. 
- Physics substep at most 0.02. Our loop uses h <=0.02. Good. But when t crosses burn, mass etc. Use per substep. Thrust zero after 200. Fine.
- "throttle limited to 3*m*g0" we do.
- "pitch never decreases" function. Good.
- "rocket cannot go below pad" clamp. Good.
- "one trail point per step() call". Our step with dt<=0 also pushes. For normal pushes one per call. Good.
- "world points of the rocket" z=0, x, y. y is altitude not world pad? Requirement says `trail: array of {x,y,z} world points of the rocket`. Our y is altitude above pad, but world rocket base y = PAD_Y + alt. We should push world points including padY. They say world points. Use y + PAD_Y? But state alt measured from pad. The trail should be world. Use `y: y + PAD_Y`. x same, z=0. Need do in step. The visual line uses trail directly (world). Good. But camera/rocket uses `PAD_Y + alt`. Trail y should be `PAD_Y + y`. Let's set trail push y = y + PAD_Y. Then reset clears. Good. At pad, trail y=1.9. 
  - Physics y internally altitude above pad. State alt=y. Step push `{x, y: y+PAD_Y, z:0}`.
  - The visual line starts at pad. Good.
  - During reset, trail empty.
  - If step with dt<=0 push world.

- State `alt` maybe altitude above pad or sea level? They say h altitude. We use above pad, negligible 2m. Fine.
- `x` state for visual. 
- Maybe `z` always 0. Add.

- Rocket visual position uses st.x and PAD_Y + alt. 
- Trail world y uses same.

- Gravity uses h = y. Good.

- `acc` net vertical acceleration at state. Good.

- Check thrust and acceleration at t=0: 7.014e6/550000=12.75; -9.81=2.94. Good.

- Playback: At t=0 default speed 1. Liftoff realistic. At t=10 jump 10x. User can choose. Good.

- Need reset clears visuals. Our detection uses st.t < lastSimT. If reset called at t=0 after lastSimT=0, no detect. But if not yet stepped, no. If reset at t=0, okay. If reset called at t=0 after lastSimT=0 but smoke exists? possible if paused at t=0? Smoke not evolved. Could ignore. To robustly detect reset, wrap `reset` method to increment a counter and visual reset. We can override reset after creating sim. Let's do both: create sim, then wrap `const originalReset = sim.reset.bind(sim); let resetToken=0; sim.reset = () => { originalReset(); resetToken++; };` But `sim` typed RocketSim includes reset. Reassigning method on const object allowed. In render loop compare resetToken to lastResetToken, clear. This handles. Need set initial resetToken=0, last=-1. After first frame, maybe clear. Fine.
  But `window.__rocket` points same object. Good.
  Implement:
```
const rocketSim = createRocketSim();
let resetCounter=0;
const baseReset = rocketSim.reset;
rocketSim.reset = () => { baseReset(); resetCounter++; };
```
Type okay.
  In animate, `if (resetCounter !== lastResetCounter) { clearSmoke(); trailBirthTimes.length=0; lastTrailCount=0; camera...; lastResetCounter=resetCounter; }`
  Also detect time decrease for step? No external step reset. Good.
  Reset camera when reset. Need clear smoke. Also set lastSimTime=state.t. 
  `lastTrailCount=0; trailBirthTimes.length=0;`
  If reset while render loop hasn't detected, trail length 0. good.
  Also set speed? sim.reset clears userSpeed. Overlay next frame shows 1. Buttons active maybe update.

  Need smoke spawn time after reset. Set `lastSimTime=0; smokeSpawnAcc=0;` and clear particles.
  Camera snap to pad. Set `camera.position.copy(groundCam); currentLook.copy(padTarget); camera.lookAt(currentLook);` in reset detection.
  But if reset while paused, camera snaps. good.

- Add pause with Space maybe. Not required. Could show. 
- Buttons set speed. 
- Need if user presses 1 at t<10, speed=1 same. Fine.

- `window.__scene = scene;` etc.
- `__ready` after first composer.render. Use `renderer.setAnimationLoop`. Set ready inside.

- Need compile with strict. Use `const anyWindow = window as any;`

Let's now write code carefully. Might be long. Need ensure no syntax errors.

Potential issue with `THREE.SRGBColorSpace` type. fine.
Potential issue with `renderer.outputColorSpace`.
Potential issue with `Math.exp` etc.

Let's assemble in order.

1. Imports.
2. Constants, interfaces.
3. Renderer scene camera setup.
4. Utility textures.
5. Lights.
6. Earth, ocean, land, roads, pad, tower.
7. Rocket.
8. Flame.
9. Smoke.
10. Contrail.
11. Camera and sky.
12. Sim.
13. Overlay, controls.
14. Animate.

Order: renderer first, textures use renderer. Sky material needs sunDir.
Need sim before animate. Rocket visuals before animate.
Need PAD_Y constants for sim step trail. Define early.

Let's write.

Some details:

**Renderer**:
```ts
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin='0'; document.body.style.overflow='hidden'; document.body.style.background='#000';
document.body.appendChild(renderer.domElement);
```
Need canvas style display block full. 
`renderer.domElement.style.display='block';`

Scene:
```ts
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xcfe3f2, 0.00008);
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.5, 1e8);
camera.position.set(110, 10, -140);
scene.add(camera);
```

Tone mapping and composer:
After camera.
```ts
const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(innerWidth,innerHeight);
composer.addPass(new RenderPass(scene,camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.8, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
```
But RenderPass uses scene/camera and output. OutputPass applies tone mapping. Renderer toneMapping is ACES. Good.
Need if renderer.toneMapping set, RenderPass might tone map materials? Actually render to half float, tone mapping not applied until OutputPass? Fine. 
Maybe set `renderer.toneMapping` after composer? no.

**Sun**:
```ts
const sunDir = new THREE.Vector3(-0.45,0.75,-0.5).normalize();
const sun = new THREE.DirectionalLight(0xfff4e2, 3.3);
sun.position.copy(sunDir).multiplyScalar(2200);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
const shadowCam = sun.shadow.camera;
shadowCam.left=-320; right=320; top=320; bottom=-320; near=10; far=6000;
sun.shadow.bias=-0.0001; sun.shadow.normalBias=0.4;
sun.target.position.set(0,0,0);
scene.add(sun); scene.add(sun.target);
```
Type of `sun.shadow.camera` is OrthographicCamera? `DirectionalLightShadow.camera` typed OrthographicCamera. Its properties left etc. Should compile. 
`const hemi = new THREE.HemisphereLight(0x9ccbff,0x3c4a2a,0.55); scene.add(hemi);`

**Textures**:
Need use maxAnisotropy. Function:
```ts
function makeTexture(w:number,h:number, draw:(ctx:CanvasRenderingContext2D)=>void): THREE.CanvasTexture {
 const canvas = document.createElement('canvas'); ...
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
 return texture;
}
```
For marking, need Clamp and transparent. We'll set after.
For glow, use separate maybe colorSpace and no wrap? set wrap clamp. 
`renderer.capabilities.getMaxAnisotropy()` type number. 
Ground texture:
```ts
const groundTex = makeTexture(1024,1024, ctx => { ... });
groundTex.repeat.set(140,15);
```
But same texture used on land plane. repeat set once. Good.
Concrete tex repeat maybe 10,10.
Asphalt tex repeat 8,40? We can use one material with map but repeat cannot vary per mesh if same texture. Create separate.
Ocean texture maybe 512,512 with blue. repeat 200,200. 
Earth texture.

Procedural noise:
Use `for` loops. Need maybe deterministic simple. Use Math.random. Fine.

Ground draw:
```
ctx.fillStyle='#53663c'; fillRect...
for 20000 dots: random green/brown with alpha.
for 300 patches: ctx.beginPath ellipse...
```
Vegetation look. 
Concrete: gray with speckles and cracks. 
Road: dark gray with noise and line? Use texture.
Marking: draw.

Flag drawing on canvas:
- Canvas 512x256. Transparent.
- US flag at x=20,y=40,w=120,h=70? Draw red stripes, blue canton, stars. Then text "SPACEX" x=180 y=105 font bold 50, fill #111 maybe. "FALCON 9" x=180 y=160 font 30. 
  But on rocket, white body, black text. Flag colors. Use transparent.
  The plane width 7m height 3.5. The canvas aspect 2:1. Place y=30. Text clear.
  Use `ctx.textBaseline='middle'`.
  Draw flag rectangle. Good.

Earth texture:
Draw ocean base #123b5b, add land shapes with green. Maybe a large landmass near top (v high) and some islands. But top pole. Use random blobs. Then clouds white translucent. Use repeat no? For sphere texture, wrapS repeat, wrapT clamp. 
`earthTex.wrapS = THREE.RepeatWrapping; earthTex.wrapT = THREE.ClampToEdgeWrapping;`

Glow texture:
`makeGlowTexture`:
```ts
const c=document.createElement('canvas'); c.width=c.height=128;
const ctx=...;
const g=ctx.createRadialGradient(64,64,0,64,64,64);
g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.25,'rgba(255,255,255,0.8)'); g.addColorStop(0.6,'rgba(255,255,255,0.18)'); g.addColorStop(1,'rgba(255,255,255,0)');
...
const tex=new THREE.CanvasTexture(c); tex.colorSpace=SRGB; return tex;
```
Use for sprites and PointsMaterial.

**Curved plane function**:
```ts
function makeCurvedPlane(width:number, depth:number, segX:number, segZ:number, centerZ:number, baseY:number, material:THREE.Material): THREE.Mesh {
 const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
 geo.rotateX(-Math.PI/2);
 geo.translate(0,0,centerZ);
 const pos = geo.attributes.position as THREE.BufferAttribute;
 for (let i=0; i<pos.count; i++){
   const x=pos.getX(i); const z=pos.getZ(i);
   pos.setY(i, baseY - (x*x+z*z)/(2*EARTH_R));
 }
 pos.needsUpdate=true;
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo, material);
 mesh.receiveShadow=true;
 return mesh;
}
```
For land, centerZ = -14400, depth 31200 -> z from -30000 to 1200. Good.
For ocean, width=4e6, depth=4e6, centerZ=0, base -0.5.
Need ocean under land. Add ocean first.
Material:
```ts
const oceanMat = new THREE.MeshStandardMaterial({ color:0x174c6d, roughness:0.25, metalness:0.0, map:oceanTex });
oceanTex.repeat.set(220,220);
```
Map color may multiply. For ocean, map blue. Better set material color white and map. `color:0xffffff`. Texture itself blue. Use roughness .3. Need water specular. Without env, directional specular may show sun. fine.
Land material:
`map: groundTex, color:0x9aa77a?` The map already green; use white. roughness .95.
Add `mesh.receiveShadow=true`.
Ocean receiveShadow false? water shadows not.
Land mesh castShadow? no.

Beach:
Use a curved plane width 300000, depth 60, centerZ=1190, baseY=0.82, sand material. But `makeCurvedPlane` with depth 60, segments 240x2. 
Sand material color 0xc7b98a roughness .9. It will overlay land edge/ocean. Good. But land ends at z=1200; beach at z 1160..1220. Nice.
`const beach = makeCurvedPlane(300000,80,1? segX 200, segZ 2, centerZ=1180, baseY=0.82, sandMat)`. Actually width 300k. Good.

Need coastline not exactly straight due curvature? fine.

**Pad**:
```ts
const padMat = new THREE.MeshStandardMaterial({ map: concreteTex, color:0xffffff, roughness:0.85, metalness:0.02 });
concreteTex.repeat.set(8,8);
const pad = new THREE.Mesh(new THREE.BoxGeometry(90,1.2,90), padMat);
pad.position.set(0, 0.75+0.6, 0); // bottom .75, top 1.95
pad.receiveShadow=true; pad.castShadow=true; scene.add(pad);
```
PAD_Y=1.95. But land top at origin .75. yes.
Add another central mount maybe.
```ts
const mount = new THREE.Mesh(new THREE.CylinderGeometry(7,9,1.4,8), metalMat); position y=PAD_Y-0.6; 
```
But rocket base at PAD_Y, nozzles bottom at group local 0. The mount should be below. If mount top at PAD_Y maybe intersects. Need rocket nozzles rest on mount. Fine.
Pad top 1.95. Mount top 1.95. `CylinderGeometry(6,7,1.2,8)` center y=1.95-0.6=1.35. It rises to 1.95. Good. It may intersect rocket base but okay. Use dark metal. Add hold down clamps around at radius 4.
  - Trench black box height 0.1 at y=PAD_Y+0.01 center, but mount covers center. Maybe trench runs out z=45. Create a dark rectangle from z=10 to 60. 
    `new BoxGeometry(14,0.08,70)` position (0,PAD_Y+0.02,20). This lies on top of pad. Could look like a black strip. Add side walls? 
    Use dark material.
  - The flame trench opening under rocket should be visible. Add dark circle under mount? maybe.
  - Add raised concrete walls along trench. 
  - Add pad markings lines? no.

**Tower**:
Need metal material. Use `towerMat = new THREE.MeshStandardMaterial({color:0x7d817e, roughness:0.6, metalness:0.6})` maybe. Lattice.
Create `createLatticeBeam`.
Place at x=13, z=0, base y=PAD_Y. Width 7, depth 7, height 85.
`tower.position.set(13, PAD_Y, 0);`
  But `createLatticeTower` group local base y=0.
  Add arms:
   - `const arm1 = new THREE.Mesh(new THREE.BoxGeometry(8,1,1.5), towerMat); arm1.position.set(-? local x?)` Tower local center x 0. Rocket at world x=0, tower x=13. So arm extends from tower to rocket, width ~9. Tower local x from -3.5 to 3.5; world to rocket x=0. Arm should extend in -x from tower. Position local x = -? Tower center at x=13, near face at x=10.5. Arm length 8, center x local -4.5? world x=8.5. Extend to x=4.5, not to rocket. Hmm rocket radius 1.85, need arm to x=2. Maybe length 10, center local -5 -> world x=8 to 2. Good. Add at y=45 and 55. `BoxGeometry(10,1.2,1.2)` position (-5,45,0). Add small vertical connector at end? fine.
  Add top crane? simple box.
  Tower cast shadows.
- Lightning masts:
  `createMast(x,z,height)` with LineSegments. Base at groundYAt(x,z). But x,z at ±90, ground sag small. Use padY? ground. Add to scene.
  Code:
```
function createLightningMast(x:number,z:number,height:number): THREE.Group {
 const g = new THREE.Group(); g.position.set(x, groundYAt(x,z), z);
 const w=4;
 const pts:number[]=[];
 const levels=10;
 const corners=[...];
 for l=0..levels:
  y=height*l/levels;
  for each corner: vertical segment from l to l+1? 
 ...
 // Add verticals maybe.
 for each corner: pts.push(cx,0,cz, cx,height,cz);
 for l=1..levels: horizontal at y connecting corners
 // diagonals per face between levels
```
Simpler generate all line segments in a loop.
  `const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts,3)); const line = new THREE.LineSegments(lineGeo, mastMat);`
  Mast material LineBasic color 0x6d7a80, transparent? no. 
  Cast shadows? Lines don't. Fine.
  Add small red beacon at top: SphereGeometry(1.5) emissive red. Maybe.
  Cables: Use `LineSegments` from mast tops to tower top. Add with same material. Do after tower.
  Masts positions: (85,85), (-85,85), (85,-85), (-85,-85)? Camera at -z: masts visible. But ocean behind +z at 1200. Put around pad at ±80. Use (80,80),(-80,80),(80,-80),(-80,-80). Height 110. Add.
  Cables from each mast top to (13, PAD_Y+85,0). Use lines.
- Buildings:
  Use BoxGeometry with light gray material. Place not on pad. e.g. (-250,-300), (-450,-200), (350,-500). Low 8x6x5. Add roof. Cast shadows. 
  Roads:
   - main road plane 2400x35 at x=250, z=-400? Orientation. Build with `PlaneGeometry(35, 3000)` rotated -PI/2, position (250,groundYAt+0.03,-800). 
   - cross road `PlaneGeometry(3000,35)`? Actually plane width,height. Rotate. Need repeat. Use asphalt material.
   - road texture repeat set. 
   - For road materials, use `MeshStandardMaterial({map: asphaltTex, roughness:.95})`.
  Since land is curved, road flat at y .82. Fine.

**Vegetation**:
`const bushGeo = new THREE.IcosahedronGeometry(1,1);` maybe 80 triangles * 1200 = okay.
But all same geometry, use instanced.
`const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 1200);`
Bush material `MeshStandardMaterial({color:0x5c703a, roughness:1})`. Use vertex color? setColorAt.
Loop:
- random x,z within radius 1600, exclude radius 70 maybe. If z > 1100 (ocean) skip. Also skip roads? not necessary.
- scale (2-6m wide, 0.8-2.5 high). position y = groundYAt(x,z) + scaleY*0.4? The geometry sphere radius 1, centered at position. Set position y = groundYAt + scaleY*0.4 so bottom near ground. 
- rotation y random.
- castShadow true maybe. With 1200, shadow map at 300m only some. no.
  `bushes.castShadow=true; bushes.receiveShadow=true;` But instanced shadows may be expensive; with 1200, okay. 
- setColorAt with color variation.
Need use count exact. If fewer due ocean, set mesh.count = index. Initialize count = 1200, then after loop `bushes.count = n;`.
InstancedMesh.count writable. yes.
- Add taller trees? no.

Could add grass tufts as Points? not necessary.

**Rocket materials and geometry**:
Need mark texture material. 
- Use `const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf3f2ee, metalness: 0.05, roughness: 0.48, clearcoat: 0.15, clearcoatRoughness: 0.4 })`. MeshPhysicalMaterial is okay. 
- `const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.7, roughness: 0.35 });`
- `const engineMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3d, metalness: 0.9, roughness: 0.3 });`
- For rocket group, all castShadow/receiveShadow.
Build:
```ts
const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_Y, 0);
scene.add(rocketGroup);
```
Nozzles: 
```
const nozzleGeo = new THREE.CylinderGeometry(0.38, 0.82, 2.2, 16, 1, true);
for i=0..8:
  const ang = (i/8)*2PI;
  const r = i===8?0:1.0;
  const nozzle = new THREE.Mesh(nozzleGeo, engineMat);
  nozzle.position.set(Math.cos(ang)*r, 1.1, Math.sin(ang)*r);
  nozzle.castShadow=true;
  // slight rotate? cone vertical.
  rocketGroup.add(nozzle);
```
Center nozzle at r=0. Actually 9 engines: center plus 8. Loop i 0..8; if i<8 radius=1.05; else 0. Angle i/8. Position y=1.1.
Engine section: CylinderGeometry(1.85,1.95,4,32) center y=4? bottom y=2, top 6. But nozzles top y=2.2. We need bottom of engine section at y=2.2. Set height=3.8 center y=4.1, bottom 2.2, top 6.0. Good.
Add base heat shield: cylinder radius 1.9 height .4 center y=2.2? dark.
Stage1: CylinderGeometry(1.85,1.85,40.8,48) center y=6+20.4=26.4. top 47.2. 
Interstage: radius 1.83, height 3, center y=48.7, from 47.2 to 50.2. dark.
Stage2: CylinderGeometry(1.85,1.85,8,48) center y=54.2, from 50.2 to 58.2. white.
Fairing: Lathe:
points = [
 new Vector2(1.85,58.2),
 new Vector2(1.85,64.0),
 new Vector2(1.65,66.0),
 new Vector2(1.2,68.0),
 new Vector2(0.6,69.3),
 new Vector2(0.02,70.0)
]
LatheGeometry(points, 48). It creates surface around Y. Need maybe close top? The last radius 0.02, fine. Material white. Add ring at y=64.
But LatheGeometry with first point radius 1.85 at y58.2 and next same radius 64; surface includes cylinder. Good. 
Add small ring at fairing base using TorusGeometry? Maybe a thin cylinder radius 1.87 height .25 at y=58.4 dark/white. Fine.
Add interstage band at y=45? Actually stage1 top. Add a darker band at stage1 upper y=43? `CylinderGeometry(1.86,1.86,1.0,48) color dark; position y=45.0` maybe. It will overlay. 
Add thin black stripe at y=46.5.
Add "flag" plane at y=32 maybe. Body radius. Plane width 6.5 height 3.2. Position (0, 31, -1.86). rotation.y=Math.PI. 
But body is cylinder, plane flat at -z. Camera at -z. Good. Add material side DoubleSide? Plane front faces -z. Use `side: THREE.DoubleSide` anyway.
Marking material `MeshStandardMaterial({map:markTex, transparent:true, roughness:0.6, metalness:0.0, alphaTest:0.1, side:THREE.DoubleSide, depthWrite:false})`. Might z-fight? Plane at radius +0.01. Use position z=-1.861. Good.
Also small flag on upper. One enough.
Set shadows. `rocketGroup.traverse`.
Need engine flame group child at local base. Add after body.

Need rocket group rotation z update. But if rocket pitched after 10s, the marking rotates. fine.

Add small fins? no.

**Flame**:
Glow texture. 
```ts
const plumeUniforms = { uTime:{value:0}, uIntensity:{value:0}};
const plumeMat = new THREE.ShaderMaterial({...});
const plumeGeo = new THREE.CylinderGeometry(1.0,4.2,1,32,1,true);
plumeGeo.translate(0,-0.5,0);
const plume = new THREE.Mesh(plumeGeo, plumeMat);
plume.position.y=0; // top at 0
plume.visible=false;
rocketGroup.add(plume);
```
But `CylinderGeometry` top radius at y=+0.5, bottom at -0.5. Translate y=-0.5 => top at 0, bottom -1. Good. Top radius 1, bottom 4.2. 
Shader vertex:
```glsl
varying vec2 vUv;
varying float vY;
void main(){ vUv=uv; vY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
```
Fragment:
Need use `uTime`, `uIntensity`. 
```
float t = clamp(-vY,0.0,1.0);
float flick = 0.82 + 0.18*sin(uTime*55.0 + vUv.x*12.0) * sin(uTime*31.0 + vUv.x*37.0);
float edge = 0.55+0.45*sin(vUv.x*6.28318*3.0+uTime*4.0);
vec3 c = mix(vec3(1.0,0.22,0.02), vec3(1.0,0.9,0.65), pow(1.0-t,3.0));
float a = pow(1.0-t,1.4)*uIntensity*flick*edge;
gl_FragColor = vec4(c*1.8, a);
```
Top t=0 gives white. Bottom t=1 orange and alpha 0. Good.
`uIntensity` maybe 1.0. Since additive, bright. Need perhaps `uIntensity` 0.85.
`depthWrite:false, transparent:true, blending:AdditiveBlending, side:DoubleSide`.
`toneMapped:false`? If false, the additive output stays >1? In ShaderMaterial, tone mapping not auto. OutputPass still tonemaps whole frame. Fine.

Core sprite:
```ts
const coreMat = new THREE.SpriteMaterial({map:glowTex, color:0xfff0b0, blending:AdditiveBlending, transparent:true, depthWrite:false, opacity:0.95});
const coreSprite = new THREE.Sprite(coreMat); coreSprite.position.y=-1.0; coreSprite.scale.set(12,12,1); rocketGroup.add(coreSprite);
```
At high, scale.
Mach group:
```ts
const machMat = new THREE.SpriteMaterial({map:glowTex, color:0xcfeaff, blending:AdditiveBlending, transparent:true, depthWrite:false, opacity:0});
for i 0..4: Sprite clone? If using same material, all same. Add sprites positions y=-4-i*3.5, scale 2+i*1.5.
```
`Sprite` uses clone material? We set machMat opacity globally. Fine. All visible. 
`machGroup.visible=false`.
Add `flameLight`.
Need update.

**Smoke**:
Need create after camera? no.
Use `glowTex`? Smoke shader procedural. Fine.
Code:
```ts
const SMOKE_MAX=1800;
...
```
We need avoid huge gl_PointSize with camera near. Use `min(320.0, ...)`.
Vertex:
```
uniform float uPixelRatio;
attribute float aSize; attribute float aAlpha; attribute float aSeed;
varying float vAlpha; varying float vSeed;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(420.0, aSize * uPixelRatio * (320.0 / max(1.0, -mv.z)));
  vAlpha = aAlpha; vSeed = aSeed;
}
```
Fragment:
```
varying float vAlpha; varying float vSeed;
void main(){
 vec2 p=gl_PointCoord-0.5;
 float d=length(p);
 if(d>0.5) discard;
 float soft=pow(smoothstep(0.5,0.05,d),1.4);
 float wisps=0.82+0.18*sin((p.x*12.0+p.y*9.0)+vSeed*30.0)*sin((p.x*7.0-p.y*13.0)+vSeed*20.0);
 vec3 col=mix(vec3(0.76,0.78,0.8),vec3(1.0,0.99,0.95),vSeed);
 gl_FragColor=vec4(col, soft*wisps*vAlpha);
}
```
With NormalBlending, color not lit. Fine. Could maybe smoke brighter. 
Add to scene at origin.
`smokePoints.renderOrder = 3;` after rocket? Transparent sorted by depth. Maybe.
`smokePoints.frustumCulled=false;`

`smokePositions` initial 0 and alphas 0. 
Update function.

Spawn:
```
function clearSmoke(){ for all alpha=0, size=0, age=0, life=0; smokeSpawnAcc=0; smokeCursor=0; mark attrs; }
function spawnSmokeParticle(simT:number){
 const i=smokeCursor; smokeCursor=(smokeCursor+1)%SMOKE_MAX;
 const ang=Math.random()*Math.PI*2;
 const r=5+Math.random()*30;
 const px=Math.cos(ang)*r;
 const pz=Math.sin(ang)*r + 12;
 // not too far
 smokePos[i*3]=px; y=PAD_Y+1+Math.random()*6; z=pz;
 const out=18+Math.random()*40;
 vx = Math.cos(ang)*out + 4;
 vz = Math.sin(ang)*out + (Math.random()*18-3);
 vy = 3+Math.random()*7;
 age=0; life=12+Math.random()*16; seed=Math.random(); baseSize=8+Math.random()*22; alpha=0;
}
```
But spawn at pz +12, if radial ang random, some at z=-18 (behind pad). fine. y from 2-8. 
Roll sideways: velocities radial. Good.

Update:
```
function updateSmoke(simT:number, dtSim:number) {
 if(dtSim > 0 && simT < 32 && simT >=0){
   smokeSpawnAcc += dtSim * 45;
   while(smokeSpawnAcc >=1){ spawnSmokeParticle(simT); smokeSpawnAcc-=1; }
 }
 for i...:
  if(life[i] >0 && age[i] < life[i]){
    age[i]+=dtSim;
    if(age[i]>=life[i]){ alpha[i]=0; size[i]=0; continue; }
    const drag=Math.exp(-1.1*dtSim);
    vx[i]*=drag; vz[i]*=drag;
    vy[i] += (6.5 + seed[i]*4.0)*dtSim;
    // maybe slow roll
    pos += vel*dtSim;
    // ground collision/clamp
    const gy = 0.8 - (x*x+z*z)/(2*EARTH_R);
    if(y < gy+2) { y=gy+2; if(vy[i]<0)vy[i]=0; }
    const lifeFrac = age/life;
    const a = Math.min(1, age[i]/1.5) * (1 - Math.max(0,(lifeFrac-0.55)/0.45)) * 0.55;
    alpha[i]=a;
    size[i]=baseSize[i] + age[i]*2.2;
  } else { alpha[i]=0; size[i]=0; }
 // write attributes needsUpdate
}
```
But if dtSim=0, loop still sets. okay. alpha fade out. Base size stored. Need arrays.
  Note puffs can go below if age? clamp.

We should spawn some smoke immediately when launch, even if simT=0 and dt small. The first few frames spawnAcc accumulates. Fine. Maybe initial pre-spawn 120 on reset? Could make launch cloud instantly. At t=0, before step, no smoke. After a few frames, yes. At speed 1, after 0.5s, 22 particles. Enough. Could pre-spawn on reset 80. But reset counter first frame after initial; we could call `prewarmSmoke()` 100. That spawns at t=0. We can call clearSmoke and spawn 80 maybe. But spawn uses no simT. This would show cloud immediately. The launch photograph has steam before rocket rises. Good. But our simulation steps immediately, t=0.02. Fine. Let's `spawnBurst(80)` at initial reset. We can implement `prewarmSmoke(80)`. However it might look like smoke without engines. But engines start. Fine.
  On initial and reset, call `clearSmoke(); for 80 spawnSmokeParticle(0)`. Need before animate. Good. But smoke particles have alpha initially 0; update fade-in over 1.5s. okay. We can set initial age random 0-0.5? Not. Fine.

- Attribute update after clear and spawn.

- Smoke shader `uPixelRatio` update on resize.

**Contrail**:
Need after sim? We can create before sim; update uses trail.
`const MAX_TRAIL_LINE=20000;`
Line geometry:
```ts
const trailLineGeo=new THREE.BufferGeometry();
trailLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL_LINE*3),3).setUsage(THREE.DynamicDrawUsage));
trailLineGeo.setDrawRange(0,0);
const trailLine = new THREE.Line(trailLineGeo, new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.55, depthWrite:false}));
trailLine.frustumCulled=false;
scene.add(trailLine);
```
Maybe LineBasicMaterial opacity too faint. Use 0.75. 
Contrail points:
```ts
const MAX_TRAIL_PUFFS=7000;
...
const trailPuffs = new THREE.Points(geo, new THREE.PointsMaterial({map:glowTex, color:0xffffff, size:8, transparent:true, opacity:0.25, depthWrite:false, sizeAttenuation:true, alphaTest:0.01, blending:THREE.NormalBlending}));
trailPuffs.frustumCulled=false;
```
Set renderOrder maybe 2.
Need `glowTex` colorSpace. 
Positions and drawRange.

Update function:
```ts
function updateTrail(elapsed:number){
 const trail = rocketSim.trail;
 if (trail.length < lastTrailCount) { trailBirthTimes.length=0; lastTrailCount=0; }
 while(lastTrailCount < trail.length){ trailBirthTimes.push(elapsed); lastTrailCount++; }
 // line
 const n = Math.min(trail.length, MAX_TRAIL_LINE);
 if (trail.length===0){ setDrawRange 0; ...}
 const stride = Math.max(1, Math.ceil(trail.length/MAX_TRAIL_LINE));
 let c=0;
 for (let i=0;i<trail.length;i+=stride){
   if (c>=MAX_TRAIL_LINE) break;
   const p=trail[i];
   const age=Math.min(120, elapsed - (trailBirthTimes[i] ?? elapsed));
   const wx = 2.2 * age; const wz = 1.3 * age;
   positions[c*3]=p.x + wx*0.35; // slow drift east?
   positions[c*3+1]=p.y + Math.sin(age*0.1+i*0.01)*0.5? no
   positions[c*3+2]=p.z + wz;
   c++;
 }
 attr.needsUpdate=true; geo.setDrawRange(0,c);
 // puffs
 const strideP = ...
 ...
}
```
Wind should be same for line and puffs. Use `windX=1.5, windZ=2.5`. But if line drifts with puffs, the trail starts at pad and its old points drift; the newest points not. This causes line curvature. Good.
  However the trail line using drift means the line no longer exactly follows the trajectory at old points, but okay. The rocket's current position at the last point should have age ~0, no drift. Good.
  Need if trail.length >0 but `trailBirthTimes` maybe not filled for all due reset? while fills.
  At initial trail length 0.
  For puffs, use a glow texture; size maybe 7. But at altitude, perhaps. Fine.
  Use stride such that c <= MAX_TRAIL_PUFFS.
  Set positions y p.y. 
  PointsMaterial size 7.5. At high altitude distance from camera ~100m, 7.5m puffs appear 100px? Formula size attenuation: point size = size * (height/2) / distance? The viewport height 1000, at 100m, 7.5m -> 7.5*500/100=37px. okay. Contrail puffs large. Fine.
  Opacity 0.18 to be subtle. Maybe 0.22.

  At high, the contrail behind the rocket is long and puffy, with drift. Good.

  Need if `trail.length` enormous > max, line uses stride not all. Fine.

**Sky**:
Create after camera. 
Uniforms. 
Fragment code needs no errors in shader string. Be careful. 
Use `smoothstep(70000.0,100000.0,uAlt)` in shader maybe for star? no, stars separate.
Sky shader:
```
uniform float uAlt;
uniform vec3 uSunDir;
uniform float uTime;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float space = smoothstep(35000.0, 100000.0, uAlt);
  float high = smoothstep(0.0, 70000.0, uAlt);
  float h = max(d.y, 0.0);
  vec3 zenithGround = vec3(0.12,0.34,0.72);
  vec3 horizonGround = vec3(0.65,0.78,0.90);
  vec3 zenith = mix(zenithGround, vec3(0.0,0.0,0.0), space);
  vec3 horizon = mix(horizonGround, vec3(0.005,0.012,0.03), space);
  vec3 col = mix(horizon, zenith, pow(h, 0.55));
  float sunD = max(dot(d, normalize(uSunDir)),0.0);
  float disk = smoothstep(0.9995, 0.9999, sunD);
  float glow = pow(sunD, 8.0)*0.22 + pow(sunD, 42.0)*0.45;
  col += vec3(1.0,0.72,0.36)*glow*(1.0-space*0.65);
  col += vec3(1.0,0.92,0.72)*disk*10.0;
  // subtle band near horizon
  col += horizonGround * 0.04 * pow(1.0-h, 8.0) * (1.0-space);
  gl_FragColor=vec4(col,1.0);
}
```
`normalize(uSunDir)` uSunDir already normalized; fine. Values high with disk. Tone map.
Maybe at space horizon should black. `space` at 100km 1. Good.
Add a blue rim above earth? Earth sphere.
`depthTest:false`, `depthWrite:false`, `side:BackSide`, `fog:false`. `transparent:false`.

Stars:
Need `starGeo` positions. Use random with distribution. `uOpacity`, `uPixelRatio`.
`const starPositions = new Float32Array(STAR_COUNT*3); const starBrightness = new Float32Array(STAR_COUNT);`
Generate uniform sphere:
```
const u=Math.random()*2-1; const theta=Math.random()*2π; const r=Math.sqrt(1-u*u); x=r*cosθ*STAR_RADIUS; y=u*STAR_RADIUS; z=r*sinθ*STAR_RADIUS;
```
Since camera child, all around. But with camera parent, at y negative maybe below Earth. depthTest true. 
Star material depthTest true. But sky draw first. Stars at radius 7e6. Earth at high 200km; Earth depth buffer. Stars below occluded. Good. 
At low, ocean at far 1000m, stars at 7e6 behind, occluded by ocean for lower hemisphere. Good.
Need `starPoints.frustumCulled=false`. Since points positions radius 7e6 and camera near/far 1e8, all in frustum? The entire sphere may be outside frustum? frustumCulled false. Good.
`starMat.uniforms.uOpacity.value` update.
Set `starPoints.renderOrder=-999`.
`transparent:true`, `depthWrite:false`, `depthTest:true`, `blending:AdditiveBlending`, `fog:false`.
Fragment alpha with uOpacity. At 100km opacity 1. At 70km 0. Good.
Potential issue with depthTest against sky? sky doesn't write. good.

**Camera update**:
Need temp vectors. 
`const currentLook = new THREE.Vector3(0, 28, 0);`
`const groundCamPos = new THREE.Vector3(110, 10, -140);`
`const padLook = new THREE.Vector3(0, 30, 0);`
`const tempCenter = new THREE.Vector3();`
`const tempDesired = new THREE.Vector3();`
`const tempTarget = new THREE.Vector3();`
`const chaseOffset = new THREE.Vector3(65,25,-65);`
Update:
```ts
function updateCamera(st:RocketState, dtReal:number, dtSim:number, snap:boolean){
  tempCenter.set(0,38,0);
  rocketGroup.localToWorld(tempCenter);
  const follow = THREE.MathUtils.smoothstep(st.alt, 55, 140); // signature smoothstep(x,min,max)? Three MathUtils.smoothstep(x,min,max) returns. Yes.
  const chasePos = tempCenter.clone().add? Avoid clone: use tempDesired.copy(tempCenter).add(chaseOffset).
  // desired
  tempDesired.copy(groundCamPos).lerp(tempDesired?? no)
```
Need separate:
```ts
const chasePos = new THREE.Vector3(); // global temp2
chasePos.copy(tempCenter).add(chaseOffset);
tempDesired.copy(groundCamPos).lerp(chasePos, follow);
tempTarget.copy(padLook).lerp(tempCenter, follow);
if (snap) { camera.position.copy(tempDesired); currentLook.copy(tempTarget); }
else {
  const maxStep = Math.max(dtReal, Math.abs(dtSim));
  const k = 1 - Math.exp(-16.0 * maxStep);
  camera.position.lerp(tempDesired, k);
  currentLook.lerp(tempTarget, Math.min(1, k*1.2));
}
camera.lookAt(currentLook);
```
But if follow is 0, desired is groundCam. At follow 1, chase. The camera lerps. At high speed, k ~1. Good.
When `follow` grows, tempDesired changes smoothly. 
At snap, camera to desired; but if alt 0, ground.
Maybe during transition, camera can be behind rocket? Fine.
Note `THREE.MathUtils.smoothstep(st.alt, 55, 140)`. Signature `(x, min, max)` correct. Use.
Need `rocketGroup.localToWorld(tempCenter)` after updateMatrixWorld. In animate, after setting position/rotation, call `rocketGroup.updateMatrixWorld(true)`. Then update camera. But camera.lookAt. Good.

At high alt, the chase offset (65,25,-65) relative to rocket center. If the rocket is at alt 200km, camera at 200km+25. The Earth horizon below. The rocket at center. Good. The camera "within about 100m", yes distance 94.6.
Maybe the rocket fills view; camera FOV 45, rocket half-height 35, distance 95, angular size 40°, fits. Good.
At pad, camera distance 180, rocket 70 → 22°, good.
During transition, camera may be far. Fine.

- If rocket after 200s falls below pad (clamp), camera follows.

- At high, sky/stars and earth. Earth sphere center. 
- When camera at 200km, local ocean plane and Earth. Good.
- The camera near .5 far 1e8 with logarithmic depth. Fine.

**Reset visual function**:
Need after global variables declared. Use `clearSmoke`, `prewarm`. 
```
function resetVisuals() {
 clearSmoke();
 for (let i=0;i<70;i++) spawnSmokeParticle(0);
 trailBirthTimes.length=0; lastTrailCount=0;
 camera.position.copy(groundCamPos); currentLook.copy(padLook); camera.lookAt(currentLook);
 smokeSpawnAcc=0;
 lastSimTime=0;
}
```
But initial call before sim? We can call after everything and before animate. Need spawnSmokeParticle defined. At initial, launch smoke appears while rocket still on pad. Good. But spawn at t=0. Could be okay.
On reset, `rocketSim.reset()` increments resetCounter; animate calls resetVisuals. It might also have initial resetCounter 0 and lastResetCounter=-1, calls resetVisuals. Good.
In resetVisuals, maybe don't reset speed? sim reset does. 
Camera snap to ground. 

- If reset while high, camera snaps to pad in one frame. Fine.

- Need when first initial resetVisuals before animate, camera at ground look. Good.

- `lastSimTime` global. Use for spawn. On reset, set.

**Sim creation and expose**:
After scene setup maybe. Need PAD_Y in trail. PAD_Y defined before create. 
Create sim after PAD_Y.
Wrap reset. 
`(window as any).__rocket = rocketSim;`
Maybe expose methods. 
Need ensure `__rocket.paused` toggles. In animate, `if (!rocketSim.paused) step`. 
- state().speed uses userSpeed. 
- `setSpeed` extra. 

**Overlay**:
Create after sim.
Need show `T+`. Use `document.createElement('div')`.
`overlay.innerHTML`? Can set. But buttons created. Use static. 
```ts
const overlay=document.createElement('div');
...
const info=document.createElement('div');
info.style.whiteSpace='pre';
overlay.appendChild(info);
const bwrap=document.createElement('div'); ...
const speedButtons: HTMLButtonElement[] = [];
for (const s of [1,10,30]) { ... }
document.body.appendChild(overlay);
```
`button.onclick = () => rocketSim.setSpeed(s);`
Button text `x1`.
Need `info.textContent`.
Maybe include paused. 
Style: 
```
overlay.style.position='fixed'; left='12px'; top='12px'; ...
overlay.style.pointerEvents='auto';
```
Canvas appended before overlay; overlay above.
Buttons pointer. Good.

- Keyboard:
```
window.addEventListener('keydown',(e)=>{
 const k=e.key;
 if(k==='1'){rocketSim.setSpeed(1);}
 else if(k==='2'){...}
 else if(k==='3'){...}
 else if(k===' '){ rocketSim.paused = !rocketSim.paused; e.preventDefault(); }
});
```
Could `e.key` be '1'. fine.
Need maybe buttons prevent focus interfering with keys; okay.

**Animate loop**:
```ts
let lastTime = performance.now();
let elapsed = 0;
let firstFrame = true;
let lastResetCounter = -1;
let lastSimTime = 0;

renderer.setAnimationLoop((time: number) => {
  const dtRaw = (time - lastTime)/1000;
  const dtReal = Math.min(Math.max(dtRaw,0), 1/30);
  lastTime = time;
  elapsed += dtReal;

  if (resetCounter !== lastResetCounter) {
    lastResetCounter = resetCounter;
    resetVisuals();
  }

  const speedBefore = rocketSim.state().speed;
  const dtSim = rocketSim.paused ? 0 : dtReal * speedBefore; // min(dtReal,1/30) * speed. 
  if (!rocketSim.paused) rocketSim.step(dtSim);
  const st = rocketSim.state();

  // reset detection if time decreased (maybe external)
  if (st.t + 1e-6 < lastSimTime) { resetVisuals(); lastResetCounter = resetCounter; }
  lastSimTime = st.t;

  rocketGroup.position.set(st.x, PAD_Y + st.alt, st.z);
  rocketGroup.rotation.set(0,0,-st.pitch);
  rocketGroup.updateMatrixWorld(true);

  updateFlame(st, dtSim, elapsed);
  updateSmoke(st.t, dtSim);
  updateTrail(elapsed);
  updateCamera(st, dtReal, dtSim, false); // snap handled by resetVisuals

  // sky uniforms
  skyMat.uniforms.uAlt.value = st.alt;
  skyMat.uniforms.uTime.value = elapsed;
  starMat.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(st.alt, 70000, 100000);
  const fog = scene.fog as THREE.FogExp2;
  fog.density = 0.00008 * Math.exp(-st.alt/18000) + 0.00000025;
  hemi.intensity = 0.07 + 0.55 * Math.exp(-st.alt/22000);
  // sun? no
  info.textContent = ...
  overlay speed...
  composer.render();
  if (firstFrame) { firstFrame=false; (window as any).__ready=true; }
});
```
Need `resetVisuals()` when resetCounter changes: but it calls camera snap before step. Then step. Good. But in resetVisuals, should maybe also set `lastSimTime=0` after. We set then lastSimTime after st. okay.
But using `rocketSim.state().speed` before step. If paused, still. If not paused, step. 
Spec says render loop calls step(min(delta,1/30)*speed) when not paused. We do `dtReal` already min. Good.
- If paused, still `rocketSim.state()` and update visuals but dtSim 0. Trail remains. Camera follows current. Fine. Flame flicker uses elapsed. Smoke freeze because dtSim 0 (but updateSmoke spawn no, ages no). Good. The sky remains. 
- Reset while paused: resetVisuals, step not called. Visuals update at t=0. Good.
- After `reset()`, `lastSimTime` from previous; resetVisuals sets lastSimTime? In code resetVisuals maybe sets `lastSimTime=0`. Then after st, lastSimTime=0. Good.
- On initial, resetCounter=0, last=-1, resetVisuals. It prewarms smoke. Good. But then simulation steps from t=0 to 0.016. Smoke spawn. Fine.
- We need define resetCounter/lastResetCounter before animate. `let resetCounter=0; const baseReset = rocketSim.reset; rocketSim.reset = () => { baseReset(); resetCounter++; };` Then `let lastResetCounter=-1;`.

- `resetVisuals` defined before animate and uses `rocketGroup`? It only camera/smoke/trail. Good.
- `prewarm` uses spawnSmokeParticle.
- In resetVisuals, `smokeSpawnAcc=0; clearSmoke(); for ...`. But clearSmoke sets cursor. Then spawn 70. Good.
- Need not clear trail array itself, sim reset did. If external resetCounter and trail not yet length 0? baseReset cleared. Good. 
- `trailBirthTimes.length=0; lastTrailCount=0;`.
- Also reset `lastSimTime=0`.
- Maybe set `currentLook.copy(padLook)` and `camera.position.copy(groundCamPos)`, `camera.lookAt`.
- Star opacity updates.

- Overlay update: 
```ts
const minutes = Math.floor(st.t/60); const secs = st.t - minutes*60;
info.textContent = `T+${minutes.toString().padStart(2,'0')}:${secs.toFixed(1).padStart(4,'0')}\nALT ${(st.alt/1000).toFixed(1)} km\nVEL ${st.velocity.toFixed(0)} m/s\nSPEED x${st.speed}${rocketSim.paused?'  PAUSED':''}`;
```
At t<10 speed 1. if user 30, show x30. 
Buttons active? Could update style, not needed. But visual. Maybe set data. 
  Need `st.velocity` from extra. Good.
  Add pitch? maybe. no.
  The requirement "Show the speed and the mission data (T+ time, altitude in km, velocity)". Good.
  Could show "ALT" and "VEL". 
- Need maybe "SPEED x1" in overlay. yes.

- Key speed setting after t<10: state.speed user. Good.

Potential issue: `rocketSim.state()` called before step and after. Extra state returns speed. fine.

**Physics sim**:
Need use `THRUST0` and `M0`. 
```
const THRUST0 = 1.3 * M0 * G0;
```
Burn.
`pitchAt` uses t. 
Need at t after 200, thrust zero. 
At t in [10,150], smoothstep yields 0.5. Fine.
At t>150, `0.5+0.85*(1-exp(-(t-150)/120))`. At t=200 ~0.5+0.85*0.349=0.797. Earlier I used 90. Use 120 to not too horizontal. At 300 ~1.08. Never decreases. 
At t=0 exactly pitch 0.
- Integrate. Need mass at t. 
- Gravity g(h) at y. `Math.max(0,y)` maybe altitude. If y negative, use 0. y never negative. 
- Thrust cap: `Math.min(THRUST0, 3*m*G0)`. 
- If pitch > Math.PI/2? max 1.35 <π/2. OK.
- `vz` unused. Could omit. But z always 0. We can just use x, y. Trail z=0. `vz` not needed. 
- state x,z. 
- `step` pushes world y `y+PAD_Y`.

- `speed` time scale: use `userSpeed !== null`. If userSpeed 1 at t<10 then 1. If userSpeed 10 after? At t<10, if user chose 10, speed 10. The requirement "It is 1 for liftoff (t<10) and then 10, unless viewer chose a speed." We follow.
- `setSpeed` sets `userSpeed = mult`. Could clamp positive. 
- reset clears `userSpeed=null`.
- Expose state with `speed`.
- `velocity = Math.hypot(vx,vy)`.

**Potential compile issue with `THREE.MathUtils.smoothstep` return signature**:
In Three, `MathUtils.smoothstep(x: number, min: number, max: number): number`. yes.

**Potential issue `scene.fog` can be null**:
We set `scene.fog = new THREE.FogExp2`. In animate:
```
const fog = scene.fog;
if (fog instanceof THREE.FogExp2) fog.density = ...
```
Use instanceof to satisfy strict. Good.
`scene.fog` type Fog | FogExp2 | null. 
- `hemi.intensity`. fine.

**Potential issue `renderer.capabilities.getMaxAnisotropy()`** exists.

**Potential issue `OutputPass` not available type**. likely.

**Potential issue `UnrealBloomPass` constructor resolution** signature `(resolution: Vector2, strength: number, radius: number, threshold: number)`. fine.

**Potential issue `composer.setPixelRatio` method not in types**. To be safe, avoid using. Let's see. EffectComposer docs have setPixelRatio. I think yes. Use? If compile error, catastrophic. Could avoid and just set composer.setSize. The render target will be at CSS pixels not device pixels, lower quality. That's acceptable. But if renderer pixel ratio 1.75, composer output full screen? EffectComposer's `renderToScreen` final pass uses renderer's drawing buffer, and intermediate target size set by setSize (CSS size) maybe lower resolution. It will render at CSS size, then output to full drawing buffer upscaled? Actually OutputPass renders to screen at viewport full, but intermediate target low res. Accept. We can not call setPixelRatio. But on high DPI, antialias may be lower. Fine. Yet if `renderer.setPixelRatio` is 2, `composer.setSize(innerWidth, innerHeight)` sets render target to width*? Let's check EffectComposer constructor creates render target with `renderer.getDrawingBufferSize(new Vector2())`? In recent versions, constructor uses `renderer.getDrawingBufferSize`. In `setSize`, it sets `this.renderTarget1.setSize(width, height)` where width is the passed CSS size? Hmm. It might call `this.renderer.getPixelRatio()` inside setSize? Let's recall code: 
```
setSize( width, height ) {
 this.renderTarget1.setSize( width, height );
 this.renderTarget2.setSize( width, height );
 for ( let i = 0; i < this.passes.length; i ++ ) {
  this.passes[i].setSize( width, height );
 }
}
```
No pixel ratio. So lower. But we can use `setPixelRatio`. I'm fairly sure types include. Use it. If not, compile error. But instructed to use addons; likely types current. I'll use `composer.setPixelRatio(renderer.getPixelRatio());`. 
Also on resize call setPixelRatio. Good.

**Potential issue `sun.shadow.camera.left` etc. because `sun.shadow.camera` type is OrthographicCamera. yes.
**Potential issue `skyMat.uniforms.uAlt.value` but type maybe readonly? no.

**Potential issue custom ShaderMaterial `toneMapped` property in constructor? ShaderMaterialParameters includes toneMapped? Base Material has toneMapped. yes.
**Potential issue `fog:false` in ShaderMaterial parameters? MaterialParameters has fog?: boolean maybe. yes.

**Potential issue `blending: THREE.AdditiveBlending` okay.

**Potential issue `line geometry setDrawRange` type. fine.

**Potential issue `starGeo.setAttribute('aBrightness', ...)`: custom attr. fine.

**Potential issue `Line` constructor `new THREE.Line(geometry, material)`. fine.

**Potential issue Canvas `ctx.ellipse` etc. fine.

Let's consider visual quality:
- Haze/sky. 
- The Earth sphere material with texture will receive light. It is huge; directional light shadow? It casts? no. 
- Earth sphere might intersect sky? Camera child sky radius 8e6, Earth radius 6.37e6 centered below, distance from camera at ground to far side maybe 1.27e7, behind sky? The sky sphere is at 8e6 from camera. Earth extends 6.37e6 below, its far side 6.37e6 away? From camera at origin, Earth sphere center -6.37e6, radius 6.37e6, far side at -1.27e7. The sky sphere radius 8e6. Some Earth far parts behind sky sphere. But sky has depthWrite false and depthTest false, draws first, Earth draws over. Fine. At camera high 200km, sky radius 8e6, Earth diameter maybe. Sky drawn first, Earth over. Good. 
- Sky sphere is camera child at radius 8e6 and far 1e8. Fine.
- Stars at 7e6, but Earth far side could be 1.27e7, behind stars? Wait depth test: stars at 7e6, Earth along lower direction maybe at distance ~? In directions where Earth is visible, surface is near 200km. But the Earth sphere can be at far side 1.27e7 in directions not occluded? Looking up, no Earth. Looking down, surface near. Stars lower hemisphere occluded by Earth near. Good.
- At ground, Earth sphere top is 80m below; looking down at floor, local ground/ocean. Fine.
- Star sphere at 7e6 centered camera; if looking down, stars below Earth, Earth surface near 80m. Occluded. Good.

- The Earth sphere top at -80. Local ocean plane at -0.5. The gap 79.5m. At ground, the local ocean/land hide. At coastline, ocean. 
- At high, local ocean plane 4e6 wide covers near. Earth sphere under. 
- But local ocean plane uses `MeshStandardMaterial` with map repeating. At 200km, the plane has a visible rectangular edge at ±2e6 if within horizon. Horizon at 1.6e6, so edge beyond horizon? Wait plane half-size 2e6, horizon at 1.6e6, so edge is beyond the horizon? The horizon is where line of sight tangent to the curved plane. It occurs before plane edge. Beyond the horizon, we see Earth sphere (or sky) not ocean. Because the local ocean plane curves down and its farthest visible point is at horizon distance 1.6e6, which is within half-size 2e6. So no edge visible. Good. At 500km altitude, horizon 2.52e6 > half-size 2e6, edge visible. But Earth sphere behind fills. The local ocean edge at 2e6, 313km sag, Earth sphere at same position 313km+80m below? Actually local ocean y = -0.5 - (2e6)^2/(2R) = -313.9km. Earth sphere y at radius 2e6 from origin = -R-80 + sqrt(R² - (2e6)²) ≈ -313.9km - 80. Ocean 80m above. Edge not visible if Earth same color. Good.
- Ocean plane and Earth sphere colors should match. Set Earth texture ocean similar. Good.

- Land plane 300km wide by 31km deep. At high, a green strip. Good.

- Pad concrete etc.

**Sky and sun**: sunDir points (-.45,.75,-.5). If camera at -z looking +z, sun behind camera-left. Sky sun disk behind not visible. The sky near horizon may have glow from sun. Fine.
- Directional light from sunDir*2200. Shadow camera. 
- If sun behind camera, rocket lit from front-left. Good.

**Marking decal visibility**: Camera at -z, rocket plane at z=-1.86. Good. The text plane is on the visible side. 
- At chase high, camera at center+(65,25,-65), looking from -z +x, sees front-right side? Rocket at x, camera offset +x/-z. The marking plane faces -z; camera offset z=-65 relative, so sees it. Good.
- At low, camera -z, sees it.

**Engine flame from nozzles**: plume top at y=0 local, but nozzle exits at y=0. Good. Core sprite at y=-1.5. Fine.
- At pad, plume extends down to y=-32, below pad and into trench. But depth will be below ground, may be hidden by pad? Since plume mesh from y=0 to -32, top at rocket base, down into pad. At launch, flame should go down into trench. The lower half may be occluded by pad if depth test. It has depthWrite false, depthTest true, so pad occludes. Good, but top visible. Smoke covers. At liftoff, as rocket rises, plume below. Good.
- At t=0, rocket at pad, plume may be mostly hidden by pad. Core visible. Fine.
- At high, visible.

**Plume scale** update:
`plume.scale.set(1.2+airThin*1.3, length, 1.2+airThin*1.3)`.
But geometry top radius 1 and bottom 4.2. Base total radius at ground = bottom 4.2*1.2=5m, top 1.2m. Good.
At high width 2.5 => bottom 10.5, top 2.5. length 70. Good.
Need `plume.scale.set(width, length, width)`.
`coreSprite.scale.set(10+thin*18, 12+thin*22, 1)`? Sprite aspect. Use x 10, y 14. At high x 20,y 30. 
`coreSprite.position.y = -1 - thin*5`? keep.
`machMat.opacity`. Need material created.

Flame light intensity:
`flameLight.intensity = active ? (2500 + 5000*airThin) * flicker : 0;` Might be too high. Use 4000. At pad distance 20m, illuminance 10. Good. 
But PointLight intensity units: with physically correct, intensity 4000 candela, at 20m =10 lux; with standard material and ACES, visible. Good.
`flameLight.distance=400; flameLight.decay=2;`.
`flameLight.color.set(0xff8a36)`.

- We need flicker real time. `updateFlame(st, dtSim, elapsed)`. Use `elapsed`.
```
const active = st.t >=0 && st.t < BURN;
const altThin = THREE.MathUtils.clamp(st.alt/60000,0,1);
const flick = 0.78 + 0.12*Math.sin(elapsed*47.0) + 0.1*Math.sin(elapsed*91.0+1.3);
...
```
`plumeUniforms.uTime.value = elapsed; uIntensity.value = active ? flick : 0;`
`plume.visible=active`.
`coreMat.opacity = active ? 0.9 : 0`.
`machGroup.visible = active && st.alt<25000; machMat.opacity = active?0.7*(1-st.alt/25000):0;`
`flameLight.intensity = active ? (3500+3500*altThin)*flick : 0;`
`flameLight.position.y = -2 + ...` no.
- After burn, maybe residual flame for 1s? not required.

**Update Earth?** Not needed.

**Fog update**:
At high, fog still affects Earth. If `fog.density` near 0.00000025, at 1000km factor exp(-(0.25)^2)=0.94. Good.
At ground, at 1200m coast, exp2 factor exp(-(0.00008*1200)^2)=exp(-0.0092)=0.99. Fog not very strong. At 10km, exp(-0.64)=0.53. Horizon ocean is 10km visible. Good. The land plane extends 300km, ocean horizon. Haze. 
Maybe fog density 0.00012 for more haze. At 10km, exp(-(1.2)^2)=0.237. Good. At 1200m, exp(-(0.144)^2)=0.979. Fine. Use 0.00011. At high, reduce. 
`fog.density = 0.00011 * exp(-alt/16000) + 0.0000003`.
At 20km, 0.000029; at 100km ~0.0000005. Good.

**Hemi intensity**:
At ground 0.6. At 20km 0.24. At 100km 0.07. Use `0.06 + 0.54*exp(-alt/18000)`. Good.

**Star opacity**:
`THREE.MathUtils.smoothstep(st.alt,70000,100000)`. At 100km 1. 
Need sky itself black at 100km via uAlt. Good.

**Camera and `__ready`**: Good.

**Resize**:
```
window.addEventListener('resize', () => {
 const w=window.innerWidth, h=window.innerHeight;
 camera.aspect=w/h; camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
 renderer.setSize(w,h);
 composer.setPixelRatio(renderer.getPixelRatio());
 composer.setSize(w,h);
 starMat.uniforms.uPixelRatio.value=renderer.getPixelRatio();
 smokeMat.uniforms.uPixelRatio.value=renderer.getPixelRatio();
});
```
`starMat` and smokeMat declared const before listener. Use. 
Maybe call setPixelRatio before setSize. fine.
- On initial, composer set.

**OutputPass** with renderer tone mapping. OutputPass constructor maybe `new OutputPass()`; yes.
Maybe OutputPass import path is `three/addons/postprocessing/OutputPass.js`. good.

**Potential TypeScript: `uniforms` property on ShaderMaterial for custom uniform `uPixelRatio`** typed. Fine.

**Potential TypeScript: `sun.shadow.mapSize.set(2048, 2048)`** Vector2. fine.

**Potential TypeScript: `THREE.Float32BufferAttribute`** fine.

**Potential TypeScript: `InstancedMesh.setColorAt` may set instanceColor; use if statement. `if (bushes.instanceColor !== null) bushes.instanceColor.needsUpdate = true;`. fine.
**Potential TypeScript: `bushes.count = bushCount`**. count property number. fine.

**Potential TypeScript: `const noise = ...`** no.

Let's write the code now. Need be careful no `undefined` in arrays.

One more thing: `resetVisuals` uses `clearSmoke` and `spawnSmokeParticle`, both defined later maybe function declarations are hoisted if function declarations. They can be after. Use function declarations. If defined as const arrow, not hoisted. We'll use function declarations for smoke. 
`lastSimTime` global variable used in resetVisuals. Define before. 
`trailBirthTimes` defined before. 
`lastTrailCount` before.

Need `rocketGroup` global before resetVisuals? No.

Order: Let's define globals:
- `const PAD_Y = 1.95;`
- `const EARTH_R...`.
- Renderer, scene, camera, etc.
- Textures.
- etc.
- Smoke arrays and functions.
- Sim.
- resetVisuals after sim maybe.
- animate.

Could sim be created before smoke? resetVisuals needs sim? no. But initial resetCounter. 
Let's create sim early after PAD_Y, then scene. Expose. 
But `sim.step` uses PAD_Y. fine.
We'll create sim after constants, before renderer maybe. Then set window.
Wrap reset.

Need `RocketState` interface with extra fields. Good.

Let's write.

Potential issue with `THREE.MeshPhysicalMaterial` `clearcoat` etc. fine.

Potential issue with `ctx.fillText` and font. no external fonts, use sans-serif. Requirement no external fonts. Native fonts okay. Text drawn with canvas uses system sans-serif; allowed (no external assets). Good.

Potential issue with lettering "SpaceX" trademark? okay.

Potential issue with "Falcon-9-like" and flag. Fine.

Let's write the shader strings with backticks. Need no template interpolation unless intended. Use plain backticks. TypeScript accepts. Watch `${}` not introduced accidentally. 

In fragment shader, use `gl_FragColor`. In WebGL2/Three, ShaderMaterial uses GLSL1 by default, so gl_FragColor works. Good. 
In vertex shader, `attribute` and `varying` okay for GLSL1. 

Points shaders with custom attributes. Fine.

**Smoke prewarm**: `for (let i=0;i<80;i++) spawnSmokeParticle(0);` But spawnSmokeParticle sets age=0, alpha=0. updateSmoke with dtSim >0 first frame will fade in. fine.
Maybe set age random for prewarm to make cloud already spread? Could set `smokeAge[i]=Math.random()*2` and positions displaced? Not. After 0.5s. Fine.

**Clear smoke** needs update attributes. `markSmokeDirty()`.
Implementation:
```ts
function setSmokeDirty(){ (smokeGeo.attributes.position as THREE.BufferAttribute).needsUpdate=true; ... }
```
Need types. 
Simpler in updateSmoke after loop set all attr needsUpdate. clear calls too.
Clear:
```ts
for (...) { smokeAlpha[i]=0; smokeSize[i]=0; smokeAge[i]=0; smokeLife[i]=0; }
smokeSpawnAcc=0; smokeCursor=0;
markSmokeDirty();
```
`markSmokeDirty` sets needsUpdate on `smokePositionAttr`, `smokeSizeAttr`, `smokeAlphaAttr`, `smokeSeedAttr`. We can store consts.
For `seed` not change in clear? no, but dirty.
Define `const smokePositionAttr = smokeGeo.getAttribute('position') as THREE.BufferAttribute` after set. Or use `smokeGeo.attributes.position as ...`.
Need custom attr names. 
```
const smokePosAttr = new THREE.BufferAttribute(smokePositions,3).setUsage(THREE.DynamicDrawUsage);
smokeGeo.setAttribute('position', smokePosAttr);
```
Store. `setUsage` returns BufferAttribute. Good.

Similarly trail line attr and contrail puffs.

**ShaderMaterial uniforms**: `smokeMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();` works.

**Trail line drift**:
Need `trailBirthTimes` may be shorter than trail if new points and while adds. fine.
When `trail.length > lastTrailCount`, while push `elapsed`. But if reset and `trail.length` 0, we clear. If external step multiple? no.
`const birth = trailBirthTimes[i] ?? elapsed;`.
`const age = Math.min(120, Math.max(0, elapsed - birth));`.
Use `windX=1.4, windZ=2.2`. `wx=windX*age; wz=windZ*age;`
Set line y = p.y + Math.min(age,30)*0.02? no.
Set positions.
For puffs, same drift.
Need `trailLineGeo.setDrawRange(0, c);` and `trailPuffGeo.setDrawRange(0, pc);`.
When no trail: set drawRange 0. Attributes needsUpdate? if previously. Set. 
`trailLine.visible = c>1; trailPuffs.visible = pc>0;`
`trailLine.frustumCulled=false`.
Use line material transparent, depthWrite false, `opacity:0.68`. 
Maybe `line` only has 1 point initially, invisible. fine.
Note if trail line points drift, the line segment from current rocket to recent trail may not exactly meet rocket (the last point age 0, yes). Good.

**Contrail birth times and elapsed reset**: resetVisuals clears. Good.

**Rocket trail array world points**: On step after reset, trail point at `y+PAD_Y`. Visual uses. Great.

**Ground land texture repeat**: `groundTex.repeat.set(150, 15)`; but the texture is also used for land only. Good. Concrete repeat 6,6. Ocean repeat 128,128. If same texture? separate. 
`earthTex` no repeat. 
`markTex` clamp. 

**Land material map sRGB**, okay.

**Road material**: create `asphaltTex` with repeat set (8,80) for main road? If used on both roads with different sizes, same repeat. Maybe create as material `MeshStandardMaterial({color:0x30343a, roughness:0.95})` no texture. But requirement procedural textures for ground and concrete; roads can be plain. Add noise map from asphalt for realism. Use one asphalt material.
`asphaltTex.repeat.set(6,120);` For a 3000m road, 120 repeat ->25m tile. fine.

**Concrete pad map** repeat 6,6 on 90m ->15m tile. Good.

**Tower beams**:
Use material. 
`function beamBetween(...)`. Need not use BoxGeometry length maybe. 
`const box = new THREE.BoxGeometry(thickness, thickness, len);` Then quaternion. Fine.
Potential shadows: each beam. Set