We need need produce complete TS single file compiles strict. Need think through code. Could be long. Need no external assets. Use Three and addons. Need make scene visually plausible. Need implement physics, camera, clouds, sky, bloom, overlay, buttons. Need ensure TypeScript strict no errors, no unused? "tsc --strict" doesn't error unused unless noUnusedLocals not part strict? strict includes noImplicitAny etc not noUnused. Still avoid.

Need consider imports addons from 'three/addons/...': EffectComposer, RenderPass, UnrealBloomPass, Sky? Maybe use Sky from 'three/addons/objects/Sky.js'. But sky from rocket altitude must transition. Sky addon uses shader uniforms and sun. Could use own shader? Easier implement sky dome with ShaderMaterial gradient controlled by alt, stars Points. Also haze/fog. Need maybe bloom via EffectComposer, UnrealBloomPass. Use addons. Need imports resolve. TypeScript definitions for three/addons? In TS with three package? Modern three types include addons? If using tsc with module resolution maybe addons types exist. We should be careful. Use `import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';` etc. Strict compile. Need renderer. Could use Orbit? Camera custom.

Need physics exactly.

Rocket body 70m tall, diameter 3.7. At pad origin? Coordinate system: y up. Pad at ground y=0; rocket base at y=2? Could set world pad floor y=0, rocket base (bottom of engines/nozzles) at y = 3. Rocket position center? Need physics alt = height above pad (base), perhaps y coordinate = alt + pad top? We'll make rocket group origin at base of rocket, position y = alt + launchPadTop (3). Actually alt state is altitude from pad; base at pad y=0? We can define rocket group origin at engine bottom, rocket geometry built from y=0 upward to 70. Position y = alt (start 0) + padTop? If pad top y=0? Ground at y=0 maybe pad raised. Simpler: ground plane at y=0; pad concrete top at y=0.15. Rocket base at y=0.2 + alt. Physics h = alt above pad. position.y = alt + baseY. `state().alt` meters above pad.

Rocket dimensions: body cylinder 3.7 diameter, 70 tall. Need fairing nose. Create group with body cylinder from 0-50? Falcon-like. Engine section: bottom 0-5 maybe dark, nozzles below. Body white cylinder radius 1.85 height about 55 from y=8 to 63? Interstage darker band. Nose fairing cone/cylinder tapered. Need total 70. Let's construct base y=0 at nozzles? For physics alt base. If group origin at engine bottom maybe nozzles from y=0 to 5, body from y=5 to 68, nose 68-70. Total 70. Okay.

Rocket group origin at bottom of engine (base). Add engines at y=0? Nozzles extend below origin maybe -1.5, but if alt 0 pad could intersect. Fine with pad top maybe. Let's set group origin at bottom, nozzle geometry from y=-1.5 to y=2? That means total height includes below? Better set base at y=0, nozzles from y=0 to y=3, engine section 3-8, body 8-60, interstage 56-60, fairing 60-70. total 70. At liftoff flame exits from y=0 downward. If rocket position y = padTop + alt. At alt 0, nozzle at pad top. Flame extends downward into trench/pad; okay.

Physics:

Constants. m0=550000 dry=220000 burnTime=200. Rocket state: t=0, alt=0, vx? Need horizontal velocity? State returns vel (maybe vertical velocity?) and speed. Equations vertical and horizontal. They mention vertical and horizontal acceleration from thrust component and gravity; integrate. `vel` in state maybe vertical velocity? "vel (m/s)" ambiguous but mission data velocity likely total speed. state returns vel perhaps vertical? We need include speed = sqrt(vv^2+vh^2). They specify state(): { t, alt, vel, acc (net vertical acceleration), pitch, speed }. Maybe vel is vertical velocity. We can set vel = vy. speed = total. horizontal not exposed but trail x. Need x horizontal. Trail world points.

Pitch angle from vertical: 0 straight up; pitch grows after 10, ~0.5 rad at 150, never decreases. Need define pitch over time. Could be piecewise smooth: pitch=0 for t<=10; for t>10, ramp to 0.5 at 150. Maybe `pitch = 0.5 * smoothstep((t-10)/140)`? At t=10 zero, at 150 0.5. After 150 stays 0.5? It never decreases. "reaching about 0.5 rad at 150 s, and it never decreases." Could continue slight increase after? For realism gravity turn pitch increases gradually, maybe after 150 to ~0.9 by 200? But spec says reaching about 0.5 at 150; never decreases. Could keep 0.5 after 150. Simpler and okay. But thrust after burn zero at 200; rocket coasts. At 200 pitch 0.5. Could maybe after 150 pitch continues to 1.0 by 200? "never decreases" allows increase. But "reaching about 0.5 at 150". If increase after, still. Could use `pitch = 0.5 * smoothstep(10,150,t)` for all t; remains 0.5 after 150. Fine.

Thrust: T = 1.3*m0*g0 = 1.3*550000*9.81. But limited to 3*m*g0. At liftoff 1.3 mass ratio? T = 1.3*m0*g0. As mass decreases, T constant? "Thrust: T = 1.3*m0*g0 ..., limited to 3*m*g0 (throttle) and zero after burn." So T constant except throttle upper bound 3*m*g. Since mass decreases, 3*m*g lower? Actually 3*m*g is huge at liftoff: 3*550000*9.81 > T. As mass decreases to 220k, 3*m*g ≈ 6.47e6, T≈7.0e6, so T limited to 6.47e6 near end. Wait T=1.3*550k*9.81 = 7.014e6. At m=220k, 3*m*g=6.474e6 so cap. So thrust slightly decreases at end. Good.

Acceleration vertical: `a_y = (T*cos(pitch) - m*g(h))/m`? Gravity downward; thrust component upward. If pitch is angle from vertical, thrust horizontal component T*sin(pitch), vertical T*cos. Gravity = -g. Horizontal acceleration = T*sin(pitch)/m. However is pitch of thrust relative to vertical; yes.

Mass during burn linear: m = m0 - (m0-dry)*t/burnTime, for t<=burn, else dry. Thrust zero after burn. Need at exactly 200 thrust maybe zero; mass dry.

Integration fixed substep max 0.02. Handle any dt, perhaps negative? step(dt) advance time by dt; if dt<=0 return. Use loop with substeps of max 0.02. Potential huge total time: we can loop many steps, okay. Need `trail` one per step() call, not per substep. Add point after step call at rocket position. Trail array same object reset length=0. World points `{x,y,z}` of rocket. x horizontal displacement. z maybe 0; could use x only. We can create x coordinate but orientation along world x. Rocket tilt? We need rotate rocket to pitch? If pitch thrust angle, rocket body could rotate slowly? Physically gravity turn: rocket tilts, thrust along body axis. We can set rocket group rotation z? Coordinate: vertical up y, horizontal x. Pitch angle from vertical means rocket axis tilted in x. In Three, rotation around z: positive rotation tilts y-axis toward? Rotating by pitch around z takes local y to (-sin? Actually rotation z: local y -> (-sinθ, cosθ)). To point toward +x, use rotation.z = -pitch. Need ensure plume angle matches. Rocket group's up direction world = (sin pitch? compute). If group rotation z = -pitch, local y transforms (sin pitch? rotation matrix z: x' = cos x - sin y = -sin; y' = sin x + cos y = cos for local y. Wait local (0,1) -> (-sinθ, cosθ). So points -x. Use rotation.z = +pitch? local y -> (-sin pitch, cos). Not +. Actually rotation around z by -pitch yields (sin pitch, cos). Let's calculate: Rz(θ) = [[cos,-sin],[sin,cos]]; (0,1)->(-sinθ, cosθ). So θ=-pitch gives (sin pitch, cos). yes set rotation.z = -pitch. Then horizontal motion positive x if thrust along +x. Good.

At liftoff pitch 0. Rocket rotates slowly; but physically rocket starts vertical, after 10 tilts.

Gravity g(h) at altitude h above pad; use h = alt. Earth radius. g downward independent of horizontal.

Ground collision: alt >=0; if alt<0 set alt=0 and vy=0 maybe. On pad at start. Rocket cannot go below pad. If alt becomes negative from gravity before liftoff? At t=0 thrust > weight, no. Reset vy=0.

Need initial state at t=0 alt=0, vel=0, acc maybe T/m - g? `acc` net vertical. At t=0 yes positive. `pitch=0`, speed=0.

Trail points: actual rocket world position? If position = alt + padTop, x. `x` horizontal, y = alt + baseHeight? They say world points of rocket; can include launch pad base? We can return y=alt + padTop? In camera/scene trail drawn. We'll use actual group position world y including pad top. Trail array store {x,y,z}. One per step call even if paused? Render only step when not paused. If dt zero? step() called. Add each call. Fine.

Playback speed: default 1 for liftoff t<10 then 10 unless viewer chosen. Keys 1,2,3 and buttons set x1,x10,x30. state().speed current. reset clears viewer choice. Need define `chosenSpeed: number | null`. `getSpeed()` returns chosen ?? (t<10 ? 1 : 10). Important if t reaches 10. Render loop: `rocket.step(Math.min(delta,1/30) * rocket.state().speed)`. But if speed chosen at t<10? They say keys set x1,x10,x30; viewer chose speed. Does chosen override liftoff? I think yes "unless viewer chose a speed"; speed is 1 for liftoff and then 10 unless chosen. So chosen override always. `state().speed` returns current. Need update overlay.

Reset rocket: t=0 alt=0 vel=0 vx=0 acc? pitch=0 speed=0 trail length=0; paused? Reset clears viewer choice; paused maybe unchanged? likely preserve paused? User says reset time 0 etc, resets speed choice. Could paused maybe not. We'll leave paused false? Maybe reset should not alter paused? We'll set paused=false? Hmm. Keep paused as is? reset clears choice. Fine.

Need overlay with T+ time, altitude km, velocity, speed, buttons. Need page no other HTML; can create overlay DOM via TS append to body. Need CSS. Buttons. They asked small overlay; create style. Could include controls. No external fonts. Use sans-serif default. Add instructions. Key listeners.

Need create scene and rendering.

Visual:
- Renderer append body, full window. setPixelRatio(Math.min(devicePixelRatio,2)). setSize. toneMapping ACESFilmicToneMapping; outputColorSpace SRGB? In Three modern: `renderer.outputColorSpace = THREE.SRGBColorSpace;` `toneMappingExposure = 0.9`. Shadows: `renderer.shadowMap.enabled = true`, type PCFSoftShadowMap.
- scene fog? Need aerial perspective. Use FogExp2 maybe near horizon. But sky above should not fog? Fog affects sky dome? custom shader with depth? We can use `scene.fog = new THREE.FogExp2(color, density)` and distant objects fade. But when rocket high, fog shouldn't obscure space? Camera at high altitude; scene fog affects objects at distance. We can adjust fog density with altitude, reducing as rocket ascends. Need update each frame. Use exponential fog color perhaps pale blue. Sky dome custom material no fog? ShaderMaterial doesn't receive fog unless enabled. Fine.

- Camera: low near pad looking up at liftoff; once rocket clears tower (~maybe 60 m), chase close within 100m. Need smooth camera motion. Could use dynamic camera based on rocket altitude. At start camera position at maybe (42, 8, 55), looking at rocket midbody (0, 25,0). At t clears tower when alt > tower height (tower maybe 60), switch to chase with offset. Need continuous smooth. Use lerp. Camera follows rocket at distance 60 m maybe. It can view coast etc. At high altitude, camera close. We can use `camera.position.lerp(target, smooth)` with target depending. Need maintain rocket in view, plume. Use dynamic target. For chase, position offset from rocket: e.g. behind/right/down? Want view rocket and plume, coast. Camera maybe at rocket pos + vector (55, 15, 55) looking at rocket center + (0, 25, 0)? At liftoff low camera at pad. As rocket climbs, we move camera to follow. Need ensure not inside tower? Use.

Could implement camera modes:
- if alt < 60: static low camera position perhaps (30, 12, 55) looking at (0, 30+alt*0.4,0) maybe.
- if alt >= 60: chase: `chasePos = rocketPos + (55, 12, 60)`? Need rocket close within sqrt(55^2+12^2+60^2)=82.2 <100. Looking at rocket center (y + 35). For high alt, Earth horizon visible looking slightly down? Camera position relative rocket maybe side; target rocket body. We can blend between static and chase using smoothstep alt 40-100. Smooth camera motion: compute desired position and lerp with factor `1 - exp(-delta*2)`; target similarly. Since alt can change rapidly but delta small. At very high, chase position remains relative. This means background stars/earth curve.

Need Earth curve and coast. We can have ground plane finite? At high altitude, need see Earth. Could make giant ground disc with radius maybe 2,000,000? But scene coordinate scale 1 unit=m; camera at 100 km, ground far. Need earth curvature visible. Could create Earth sphere? Simpler: large sphere radius R centered at y=-R? The scene camera and rocket at altitude up to 100km; Earth radius 6,371 km, cannot render full with local. Could create a massive sphere with radius R, but geometry enormous relative camera; with fog, maybe. At 100 km, sphere horizon visible if local coordinates. Could make `Earth` sphere radius R centered at (0,-R,0), then ground surface at y=0. Camera at 100km above; sphere visible. But local scene pad sizes ~m; a sphere radius 6.37e6 is okay. Need terrain texture? Procedural sphere surface? For Cape/Florida coast, near pad ground plane; at high altitude, use Earth sphere with color/no texture? Could have a large flat ground plane for local and ocean horizon; as rocket climbs, scale view. To show curvature, maybe create Earth sphere with a procedural shader/mesh. But near pad, sphere surface coincides approximately flat at y=0 if centered below, radius huge; local deviations negligible. It can serve ground. We can make sphere with radius R, position y=-R. The visible surface at y=0. We can texture with canvas? 6e6 sphere using canvas texture maybe. Create material color green/blue with ocean? But mapping entire surface to Cape region; large sphere texture maybe repeat. Simpler: create ground plane for near pad, plus a distant curved Earth "shell" for high-altitude. Since at high altitude, we mainly view from near rocket; horizon is far. Use a huge sphere with a shader gradient green and ocean blue based on local coordinates and a coastline. But camera at altitude 100km; sphere visible large.

Need flat land with green scrub, Atlantic horizon behind pad, roads/buildings. Create local ground plane (e.g., 2000x2000) with procedural canvas texture green/brown, roads, coastline? The ocean on horizon behind pad: create large ocean plane extending to distant horizon at y=-0.2 maybe from x? Need orient: pad near coast; ocean in background. Let's define axes: pad at x=0,z=0; coastline behind at z=-300 (ocean beyond negative z). Land plane covers z>-300 maybe; ocean plane at z<-300. Camera low at z positive looking toward negative z and up? Need view rocket. Let's decide camera at (45, 8, 55) looking at rocket (0,35,0). Background behind rocket (negative z) should be ocean; thus ocean at z<-250. Good. Land from z=-250 to +500. Large ocean plane z from -250 to -100000.

At high altitude, local ground tiny. We can create large earth curvature perhaps ocean extends far. But at 100 km camera near rocket, looking at rocket, background may show horizon. Need with local ocean plane and sky. But Earth curve not obviously. Could add a "Earth disk" huge circular plane at y=0? At altitude 100km, if plane extends to radius maybe 1000 km and camera at 100km, horizon at ~357 km; ocean plane to 1000 km would create horizon. Flat plane not curved but okay? They ask curve of Earth. Better sphere.

Potential issue with sphere centered at y=-R and local ground: camera at y=100km is inside? Sphere radius 6.371e6 centered at -6.371e6, camera y=0 at top. At y=100km, still above sphere. Sphere surface at y = -R + sqrt(R^2 - x^2 - z^2); near origin y~0. At high altitude, sphere large. Render with side? We can set material side=THREE.FrontSide; camera outside sphere (above surface) sees surface. Fine. With radius 6e6, geometry segments maybe 128 enough. But texture mapping local: UV mapping standard; texture repeats maybe. Could apply a procedural shader material with colors based on world coordinates: y>0? It's sphere. Hard to make coast. Maybe use canvas texture for entire sphere? At local scale, a 2048 texture over whole sphere yields low resolution. But visually okay at high altitude; local ground plane overlays near pad. We can also create flat land + ocean details near pad and use sphere only at high altitude / distant. Need manage occlusion: local flat plane at y=0.05 might obscure sphere near pad; fine. At high altitude, local plane small but still visible? Could keep.

For ocean horizon behind pad: create ocean plane y=0.0, z=-400 to -100000, width 100000. But if flat at y=0 and camera high, horizon at finite plane edge; not curved. We can have ocean color and haze. Earth sphere behind maybe.

Maybe simpler for aesthetic and compile: use `EarthSphere`: large sphere radius R centered at y=-R, with MeshStandardMaterial color green? Add separate ocean? But coast no. We can create a "local shoreline" plane on top near pad.

Need stars above 70 km. Create Points with random positions on large sphere radius e.g. 900000? But camera moves to 100 km; stars should be fixed sky. Use large radius 500000, positions random on sphere. But if points are too far beyond camera, render. Need only visible depending altitude. Material opacity controlled by altitude: visible above 70, clearly above 100. Use `starMaterial.opacity = smoothstep(70, 100, alt)` maybe. Need stars appear above 70 and clearly at 100. Could use altitude in km: `altKm=alt/1000`; opacity smoothstep(70,100,altKm). At 70 km zero? "appear above about 70" so set starts at 60? Use smoothstep(65,100). Also at 100 opacity 1. Stars Points at radius 2,000,000 maybe. Need sky dome radius? If sky dome not covering stars? Use sky dome radius 100000? At high camera 100km, sky dome radius maybe 500000, stars radius 400000. Need ensure sky dome not obscure stars. Could make sky dome `side: BackSide`, depthWrite false, renderOrder? Stars behind? Both sky and stars. Sky dome should be drawn first, stars after? If sky dome uses depthWrite false and depthTest false? Better sky dome radius larger than stars? Actually sky dome behind stars? If sky dome radius 900000, stars at 500000 inside, sky dome drawn with BackSide around; stars inside visible; depth test: sky dome fragments far, stars closer, so stars render over sky. Fine. But if stars opacity zero at low alt, no matter. Use sky dome radius 200000 maybe; camera at 100km inside. Stars radius 150000. Good.

Sky shader: custom gradient based on altitude and view direction. For ground blue to black at 100 km; near horizon pale haze. Use altitude uniform. Need stars appear; sky black at high. Shader could compute based on y direction and altitude. Could simply use large dome with ShaderMaterial:
- uniforms topColor, horizonColor, groundColor, altitude (km), haze?
- vertex pass world position? In fragment, vWorldPos normalized direction.
Need altitude controls sky color globally: at ground, top blue and horizon pale; at 100km, top black, horizon perhaps dark blue with haze only near lower direction. Add sun glow maybe.
We can use `mix(spaceBlack, groundSky, exp(-altKm/25))`, etc. At high alt sky black. At horizon still pale blue? In space at high, horizon around Earth might be pale blue atmosphere. But sky dome behind all; okay.

Need sun. Add directional light with shadows. For shadows from sun, sun at position maybe (80, 120, 60). Directional light castShadow, shadow camera. Sun visual? Could add sphere/light? Sky shader sun maybe not needed. Add a bright spot sprite? no textures. Could use mesh sphere with emissive.

Need bloom: EffectComposer and UnrealBloomPass. Need renderer animation loop calls composer.render. Need set composer size on resize. Use render pass and bloom pass. Need scene exposure. `const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera)); const bloom = new UnrealBloomPass(new THREE.Vector2(w,h), 1.3, 0.7, 0.6); composer.addPass(bloom);` Need bloom threshold maybe 0.8; flame extremely bright with MeshBasicMaterial emissive? Bloom picks bright tone? Use MeshBasicMaterial color high intensity? With ACES, bloom threshold. Also light flicker.

Need procedural textures canvas: concrete pad, ground/vegetation, rocket markings. Since no external assets, create canvas textures programmatically. Text rendering with canvas built-in fonts allowed (not external). Good.

Markings: body texture with flag and lettering drawn on canvas. Need cylinder material map. Canvas with white background, flag (US? maybe), black "FALCON 9" and "SPACE X"? Need not exact. Use procedural texture for body. But cylinder wraps; vertical orientation: Canvas 512x2048 maybe. Draw white, black stripes, flag. Map on cylinder. Body cylinder using canvas texture. Need ensure map orientation. For body cylinder y from 8 to 60 etc. We can apply.

Need physically based materials. Let `MeshStandardMaterial` roughness 0.45 metalness 0.1 with map. Interstage darker band with material.

Tower lattice: create via Instanced? Need lattice launch tower next to rocket. Build using thin cylinders/boxes. Could create a group with vertical posts and cross-braces. Need tall e.g. 60m at x = 8? Lattice tower next to rocket maybe x=10, z=0? The tower should be next to rocket; camera view. Build using `LineSegments`? Lattice could be metal, use cylinders for beams. Many boxes. For compile simple. Use helper addBeam between points with cylinder. Need orientation. Use `new THREE.CylinderGeometry(0.1,0.1,length,6)` and align via quaternion from y to direction. For lattice, add vertical beams at corners and horizontal/lateral. Light gray metal. Shadows. Use mesh. Tower height 60. Use maybe 4 corner beams at x=10±2, z=±2; vertical 60. Horizontal rings every 6m. Diagonal crosses at faces. Lightning masts around pad: 3 tall lattice masts height 80 at positions around. Could use one simple tower geometry reused? For performance okay.

Pad: concrete pad e.g. box 50x0.4x50 at y=0.2; flame trench: maybe a dark rectangular channel under rocket along z? The rocket at center. Flame trench maybe on sides; create dark trench depression or opening: a black trench under rocket running along z? At launch pad, flame trench beneath. Use box/plane with dark material, plus two walls. Need steam rolls sideways out of trench. Create trench along x? If plume goes down, trench under rocket maybe extends along x to sides. We'll create a rectangular trench (e.g., 22 wide x 0.4 high x 16 deep) centered under rocket? But rocket base on pad. More visually: pad top y=0.3, with central rectangular opening 12x0.8x21? Hmm.

Let's set ground y=0, pad box 46x0.5x46 position y=0.25. Rocket base y=0.5. Flame trench: dark plane at y=0.51 under rocket? Actually if pad surface, trench hole? Could make dark strip from x=-22 to 22, z=-4 to 4 with black material at y=0.52, looking like trench opening. Flame is downward; the steam emerge sideways along x from trench. We can place smoke around bottom. Good enough.

Roads and low buildings: create roads: dark gray strips on land around pad; low buildings boxes with roofs at distance. Maybe road strips at x=-80, z etc. Land texture includes roads? Simpler additional meshes. Add low buildings with canvas? Use MeshStandardMaterial. Add palm? Not required.

Vegetation: ground plane with procedural green texture. Could add scrub bushes via instanced low-poly icosahedrons/spheres around. At high altitude not visible. Need flat land with green scrub vegetation. Use many random small green flattened spheres on land near pad and ocean? Could be costly. Add maybe 300 low poly bushes. Use InstancedMesh of sphere with random scale. Good. Need not too much.

Ocean: large plane at y=-0.1 (or 0.0) beyond z=-260, color blue, rough. Should be horizontal and horizon. Use MeshStandardMaterial blue, with roughness 0.35. Need if camera high, plane extends to 200km. Use `PlaneGeometry(400000,400000)` maybe; horizon finite; but okay. Land plane size maybe 1000 x 800. At high alt, ocean plane huge. It may be flat, but Earth sphere can be behind? We can make ocean plane 500,000. At altitude 100km, horizon at ~357km, plane extends 250km from center not enough; use 800,000. Fine. It will be a flat ocean to horizon at edges at 400km; near. But no curve? Could skip Earth sphere. They ask view of curve of Earth. Could use Earth sphere large with atmosphere? Let's implement Earth sphere and ocean local? There is risk huge sphere shading and shadow. Could make sphere radius R (6371000) centered (0,-R,0), material with simple shader that colors surface based on world coordinate: lower z ocean, else green. But sphere surface near origin is flat. Need distinguish coastline at z<-300? Using world position x,z. The sphere mesh coordinates: world pos. A fragment shader can decide: if z < -250, ocean blue; if z between -250 and -? land green; maybe roads not. At high altitude, viewing from near rocket, the sphere surface with ocean/land split gives coastline but no Florida shape. Could use a canvas texture mapped on sphere with a Cape coastline; but texture across full sphere too large. Instead use a shader based on radial? Since camera views local region, we can color based on x,z: z<-300 ocean; z>-300 land. But Earth sphere extends beyond; shows ocean beyond coastline and land below. Horizon is curved because sphere. Good. Add atmospheric rim? Could use shader gradient. But near pad local flat ground overlays.

Use `EarthSphere` with ShaderMaterial:
- vertex world position.
- fragment: compute `land = step(-300, vWorld.z)`? Since sphere coordinates, world z. Ocean if z < -260. color = mix(oceanColor, landColor, smoothstep(-280,-260, z)?). Add noise based on x,z? Could add procedural mottled green from sin. Fog? no. Use MeshStandard? Shader won't receive lighting/shadows. At high altitude, lighting less important. Could use MeshStandard with vertex colors based on position? Simpler to use MeshStandardMaterial green, plus separate ocean sphere cap? Hard.

Maybe create Earth sphere with MeshStandardMaterial color dark green; on top add ocean plane that follows flat but curved? At high altitude, ocean plane can still show.

Need "Atlantic Ocean on horizon behind pad" for low view: ocean plane at y=0.05 from z=-300 to far, with color blue and maybe reflect sky. Good.

Actually at low camera, horizon behind pad must be ocean. Our land plane if finite, ocean beyond. Use land plane from z=-220 to z=+400? Let's define land plane size 5000x? Could use `PlaneGeometry(800, 1000)` centered at z=100? It would extend z=-400 to 600, x ±400. Ocean plane beyond. Pad at origin. Coast at z=-240. For low camera at z=60 looking toward -z, ocean beyond z=-240 horizon. Good.

At high altitude, local ground plane is small; but we have a huge Earth sphere for distance. Could make sphere only visible when altitude high enough? Add Earth sphere (radius R) below, its surface near y=0, but local ground plane at y=0.03 overlays. Sphere extends everywhere; ocean plane might overlay near. It could show curved horizon at high. But sphere's surface is only 0 below? For z=-300, sphere y = -R + sqrt(R^2 - x^2-z^2) ≈ - (x^2+z^2)/(2R) ~ -0.007, essentially flat. At distance 1000 km, y = -R + sqrt(R^2 - 1000^2) ≈ -78 km; curve. Good.

But if Earth sphere radius R and camera at 100km, visible horizon ~357km. Great. The EarthSphere material could be green/ocean via shader. But if camera near pad at y=8m, the sphere surface far maybe horizon at ~10km, not ocean at 240m? Hmm sphere horizon at ~10km; ocean plane finite 400km. Need ocean horizon at ~10km if camera low. Ocean plane extends far, appears horizon at edge but edge at 400km, below horizon? Camera at 8m sees ocean plane to horizon due to perspective at y=0? Actually flat plane extends infinite, horizon at eye level y=8m, visible many km. So ocean plane with 400km extent okay, horizon at edge. It will occlude Earth sphere. Good.

At high altitude, camera at 100km; ocean plane at y=0 extends 400km, from altitude sees it as a flat patch, edge maybe visible at 400km; Earth sphere behind maybe horizon at 357km and occludes? The ocean plane could extend to horizon but flat; okay. Maybe remove ocean plane at high? Could keep; at high, its edge could be visible unnatural. Use ocean plane huge 1,000,000 x 1,000,000; then covers Earth sphere and appears flat horizon at 357 km? For flat plane, at altitude 100km, horizon distance to plane is infinite? Actually a plane doesn't have horizon at finite distance; perspective horizon at plane edge if infinite. If plane 500km radius, edge at 500km, beyond Earth horizon 357km, but Earth sphere at radius R, line of sight intersects plane maybe all; flat plane extends beyond Earth surface? It could occlude curve. Better scale ocean to 300,000? at high 100 km, edge 300km before curve; bad. Hmm.

Alternative use Earth sphere as the global ground with shader. Add local land/ocean planes near pad only up to maybe 10 km; at high altitude fade them out or shrink. But scene should show coast. Could keep local. The Earth sphere visible at high shows curvature. Need set local ocean plane finite e.g. 20km across; at low view horizon at ~? 8m eye, plane 10km gives horizon near edge, okay. At high altitude, local plane small patch. Fine. Use land plane 2000m, ocean plane 50000m? At high altitude, 50km patch near rocket; still visible? Camera close rocket at high, looking down? The patch may be far below and small but okay. Earth sphere global behind. Let's not overdo.

Maybe create Earth sphere with procedural color based on latitude? Shader:
```
const earthGeo = new THREE.SphereGeometry(R, 128, 64);
const earthMat = new THREE.ShaderMaterial({
 side: THREE.FrontSide,
 uniforms...
 vertexShader: varying vec3 vWorld;
 void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld=wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}
 fragmentShader: ...
});
```
But at low camera, sphere behind local plane. The sphere color: use `float sea = smoothstep(-200.0, -260.0, vWorld.z)`? Need ocean at z negative: if z < -250 then sea. Use `float coast = smoothstep(-280.0,-240.0, vWorld.z);` but smoothstep edges reversed? Use `float land = smoothstep(-280.0, -240.0, vWorld.z);` returns 0 at z<-280,1 at z>-240. So sea = 1-land. Good. For far z, sea. But across globe, ocean should more. Since we only care Cape region.

Add green speckle based on sin. Land color mottled. Add ocean color. At high alt, atmospheric haze? Could use fog.

Could use MeshStandardMaterial with vertexColors to get colors, but shader material unlit means no sun shading; but high alt doesn't matter. We can make shader color with simple directional lighting? Add `normal` world? We could use MeshLambert? Simpler use `MeshStandardMaterial` with `map` canvas? But canvas mapping on sphere weird. I'd use ShaderMaterial with basic shading:
```
float light = 0.65 + 0.35*max(0.0, dot(normalize(vNormal), normalize(vec3(0.4,0.7,0.5))));
```
Need vNormal normal matrix. Fine.

But local ground plane with texture will occlude near pad; Earth sphere may z-fight at y=0. Set earth sphere center at y=-R-0.5 to be below. Local ground y=0.02. Fine.

Need sky's black at 100 km. At high altitude, earth sphere visible and horizon atmosphere.

Stars:
Create random points on sphere radius e.g. 300000. Use PointsMaterial size maybe 2? At radius 300k, with size 2 and sizeAttenuation true, distance from camera ~300k, screen size tiny. Better size maybe 500? At 300k, size in world units, points scale by 1/distance, size ~ 500/300k * viewport? ~1.6 px? Actually PointsMaterial size is world units if sizeAttenuation true; at distance 300k, size 1 world = 0.001? Need size large. Set sizeAttenuation false to use pixels: `size: 1.5` pixels. Good. PointsMaterial sizeAttenuation=false, transparent, opacity. At high, visible. Need position on sphere radius maybe 200000; distance constant. Good. Add some larger stars maybe two Points sets.

Sky dome:
Maybe `ShaderMaterial` with `side: BackSide`, uniforms `altKm`, `sunDir`? Need vertex. Fragment uses normalized world position direction. We can compute:
```
float h = normalize(vWorldPos).y;
float horizon = exp(-max(h,0.0)*8.0)? 
float altitudeFactor = clamp(altKm/100.0,0.0,1.0);
vec3 skyLow = mix(vec3(0.35,0.62,0.95), vec3(0.8,0.9,0.95), pow(max(h,0.0),...)?)
vec3 space = vec3(0.0,0.0,0.01);
vec3 col = mix(skyLow, space, smoothstep(0.0,1.0,altKm/100.0));
```
But at high, black; horizon near earth maybe keep pale. Could add `haze = exp(-abs(h)*?) * (1-altFactor)` so horizon pale at low. At high, horizon should show atmosphere as a thin blue rim near Earth? Maybe not needed.

Need sun disc? Could add bright sphere near sun direction at large radius? But sky shader can include sun glow:
```
float sun = max(0, dot(dir, sunDir));
col += vec3(1.0,0.8,0.5)*pow(sun,200)*...
```
Need not.

Fog: scene.fog = new THREE.FogExp2(0xb9d4e6, 0.0007?) At local pad, density maybe 0.0005; horizon haze. But at high, should reduce: update `fog.density = 0.00005 * max(0.1, 1 - altKm/40?)`? For aerial perspective; at high, less. But Earth sphere no fog if shader not fog. Use scene.fog on local objects. At alt high, many local objects tiny. Sky not fog.

Need render loop delta. Use clock `const clock = new THREE.Clock();` In animation loop: `const dt = Math.min(clock.getDelta(), 1/30)` maybe `delta = clock.getDelta()`. The render loop calls step(min(delta,1/30)*speed) when not paused. Need motion from delta/elapsed; camera uses elapsed `elapsed += dt`. Need update visual rocket based on state; flame flicker based on elapsed.

Important: rocket update after step. Need set rocket group position based on state alt and x. But horizontal x not in state. Need maintain internal `x` in simulation. Trail includes x. Could expose? Not required. Update rocketGroup.position.x = sim state x? We can store in object. `state()` not x. But rocket object internal accessible? only state. Need use `rocketVisual` position maybe computed from last trail point. We can set from sim's trail last point. But if trail empty at t=0, use rocket's state alt and x=0. We could expose hidden `x`? no. We can compute `const last = rocket.trail[rocket.trail.length-1]`; if exists. But after reset no trail. position x=0. Use `rocketVisual.position.set(last ? last.x : 0, last ? last.y : PAD_TOP,0)`. However trail y includes pad base offset. Good.

Trail: We need draw white contrail from trail points. At ground, trail begins at rocket base. Use Line with BufferGeometry dynamic. Trail length may grow over simulation; simulation can run many minutes but playback speed 10/30. A 200s burn plus coast maybe 600s; at speed 30 ~20 seconds. Trail points per frame ~60; total maybe 1000. Fine. Could cap trail maybe 4000. Need same array object on reset; can push, clear length. `window.__rocket.trail` array of {x,y,z}. We keep `const trail = []`. In reset `trail.length=0`. Need line geometry update per frame. Use `Float32Array(maxPoints*3)`. But trail grows; can create BufferGeometry and update from trail every frame. Use `Uint32`? Simpler allocate 6000 points, `BufferAttribute` dynamic. For each frame, fill vertices from trail positions (maybe if length > max, use all up to max). Use `setDrawRange`. Need trail line material white, transparent. Add maybe fading tail? Use vertex colors alpha? LineBasicMaterial doesn't support opacity per vertex. Could use two lines? Simple line. White contrail behind. At high altitude, contrail should expand/drift; trail line can be white with opacity. Add points? Fine. Could use Tube? line enough.

Need show exhaust plume. Build from meshes and sprites/particles. Use custom ShaderMaterial? Perhaps create a group attached to rocket base, oriented along rocket axis? Plume extends downward from nozzles, but as rocket pitches, thrust direction? Actually plume exits opposite thrust direction (down along -local y). Attach to rocket group at base, local -y. Use cone geometry with additive blending, bright. Need grow longer/wider as air thins: scale based on altitude and thrust. At liftoff, plume core blinding white-yellow, orange outer, flickering light. Mach diamonds. Use layered cone/cylinder meshes:
- inner cone: `ConeGeometry(1.2, 20, 32, 1, true)` with material additive transparent perhaps vertex colors/shader. Align along local -y. Need cone apex? A cone with height 20, radius 1.4 at base? Standard cone has tip at +y, base at -y? Three ConeGeometry radius bottom? It creates cone along y with tip at top (height/2) and base bottom (-height/2). We want plume taper downward: wider near nozzle at y=0, narrower at far down. Could use a cone with tip down? A cone from nozzle to far down, wide at top and pointed bottom. Use cylinder geometry radiusTop larger, radiusBottom small, height length, open-ended. Place center y=-length/2. Material.
- outer plume: CylinderGeometry(1.9, 0.6, length, 32, 1, true) transparent orange.
- inner white: CylinderGeometry(1.1, 0.1, length*0.6, 24,1,true) bright.
- Mach diamonds: small bright sprites/points along plume.
Need flicker: scale length and radius by `1 + sin(elapsed*...) *0.1`; light intensity flicker.

At high alt, scale plume length factor based on altitude: `length = min(60 + alt*0.003? Actually as air thins, plume grows longer/wider. At 1km maybe 40, at 100km huge 200? But rocket view close; okay). Use `plumeScale = 1 + Math.min(alt/10000, 6)`? At alt 100km, 10x. But physically vacuum plume expands; set width increases. Need not too huge. Use length = 20 + Math.min(alt*0.004, 200), width = 1 + Math.min(alt*0.001, 8). At ground length ~20, at 100km 420? Maybe too. Could use 80.

Liftoff light: PointLight near plume with color warm, intensity flickering; shadow? PointLight castShadow maybe expensive; use not shadow? "flickering light from plume that lights pad and rocket". Use PointLight at rocket base, color orange, intensity high, distance 200. No shadow perhaps. Add additional point. Update position relative. At high, intensity lower? It lights rocket. Could cast shadow? Not necessary.

Steam/smoke clouds: build from many soft sprites. Need no external assets; can generate canvas radial gradient texture for smoke sprite. Use `CanvasTexture` with radial gradient white/gray, transparent. Create maybe 120 sprites at pad, each with position/velocity/phase. Use `THREE.SpriteMaterial` with map smokeTexture, transparent, depthWrite false, opacity, blending NormalBlending maybe soft. Sprites always face camera, volumetric soft. Large billowing white steam clouds roll sideways out of trench then rise. Need animate. At liftoff, clouds only active during/after ignition; create group of sprites; initialize around bottom, update positions with velocities, scale growth, opacity fade/drift. Many soft particles.

Could create one smoke texture radial gradient white center transparent edges. Use `SpriteMaterial` color white, map texture, transparent, opacity 0.5, depthWrite false, blending Normal/Additive? Steam white; use normal. Size e.g. 30m at bottom. Need sprites at different depths. Create array of SmokeParticle with base pos/radius, velocity, phase, life; update:
- positions start near trench along x and z around rocket base; roll sideways outward.
- During liftoff (t<~30), spawn/expand. But we can pre-place all and animate with time; clouds persist rising. Need when reset, reset cloud time? Cloud state based on rocket time? Use elapsed global? If reset, use `t` from rocket; animate based on t. For smoke, set positions with age = t - birth. Reset requires t zero. Use simulation t.
We can pre-create 160 particles each with birth time maybe 0..10? At t=0, they start. Update position: initial trench center (0, base y,0) plus direction (random x mostly sideways) and upward. Size grows with age. At t large, drift. Need "roll sideways out of flame trench along the ground and then rise." Use velocity outward horizontally then upward as age increases. Could set `age = Math.max(0, t - birth)`, if age < 0 hidden. `x = dirx * (vx*age + ... )`; y = baseY + 2 + up*age^0.7 maybe. Need cloud at ground initially, then rises. But if t=0, smoke starts. Good.

At high altitude, pad smoke should not follow rocket; stays at ground. Camera high won't see.

Need smoke texture. `makeSmokeTexture` canvas 256x256 radial gradient with noise? Use radial gradient and random circles? Simple: draw radial gradient center white to transparent; maybe opacity. For volume, use multiple sprites with varied opacity and size. Good.

Need contrail in sky drifts slowly. The trail line could represent it. To make drift, we can draw line from trail points with slight offset based on time? But trail stored in world points. At high altitude, winds drift? We can maybe render trail from stored points plus tiny drift offset proportional to age? But line geometry updates each frame. Could transform trail line? If we offset all points by wind, trail would not follow current rocket. Better store trail points as rocket positions, draw them; drift slowly not critical. Could add `trailLine.position.x = elapsed*0.5` but then not behind rocket. Hmm.

Could create second "contrail" points with offsets? Simpler line white behind rocket fixed; "drifts slowly" maybe animate slight opacity/position. We can set line position `x = Math.sin(elapsed*0.05)*2` but that shifts all. Not noticeable. Since trail points are world positions, line is static after addition. At high altitude, no wind. Fine.

Need camera smooth and star opacity from altitude. Need overlay updates.

Need ensure `window.__ready` after first frame. We can set in animation loop after composer.render maybe first time. Since setAnimationLoop called after initial? Need first frame rendered. Use `let firstFrame = true; ... renderer? composer.render ... if (firstFrame) { (window as any).__ready = true; firstFrame=false; }`. Expose scene/camera/renderer before loop.

Need TypeScript strict:
- Add types for `(window as any)`.
- `const` etc. Need handle `THREE.WebGLRenderer` types.
- Import types? no.
- `new THREE.CylinderGeometry(1.85,1.85,52,32,1,false)` etc.
- Canvas `const ctx = canvas.getContext('2d'); if (!ctx) throw new Error(...);` Avoid null errors. Use helper `getContext`.
- `new THREE.CanvasTexture(canvas)`.
- Points positions using BufferAttribute.
- For line BufferGeometry setAttribute.
- Shader material uniforms typed by object; in TS no issue.
- `renderer.setAnimationLoop(animate)` where `animate` signature can be `(time: number) => void`; setAnimationLoop expects callback `(time: number)=>void`. Use `const animate = (): void => { ... }`? WebGLRenderer.setAnimationLoop callback type `(time: number) => void`; passing () works? It can accept no args? A function with fewer args is assignable. Fine.
- Use `window.addEventListener('keydown', (event) => { ... });` event key code. Buttons.
- Need not create external font.
- Use `document.createElement('button')` with style.

Potential type errors with addons imports if module declarations? Modern `three` package has types for addons? In package `three/examples/jsm/postprocessing/...`; `three/addons/...` path maybe supported via package exports and types? In TypeScript with moduleResolution bundler maybe. To be safe, import from `'three/addons/postprocessing/EffectComposer.js'` as required. It might find declaration files? Three since r152 includes types from `three/examples/jsm`? The `addons` export maps to examples/jsm, and types? `three/examples/jsm/postprocessing/EffectComposer.js` has corresponding `.d.ts`? In recent three package there are `.d.ts` in examples/jsm? I think yes. Use no explicit type imports. If no declarations, tsc errors. But prompt says imports from three/addons. Assume.

Need maybe use `RGBELoader` no.

Let's design detailed code structure.

Imports:
```
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```
Could also `import { OutputPass }?` not needed. In Three r160 EffectComposer requires `renderer.outputColorSpace`; bloom. Maybe need `OutputPass` for tone mapping? Not.

Renderer:
```
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```
Need CSS style for body canvas; `renderer.domElement.style.display='block'`. Add `document.body.style.margin = '0'; document.body.style.overflow='hidden'; background black`.

Scene:
```
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bce8)? Sky dome covers. scene.fog = new THREE.FogExp2(0xbfd9e8, 0.00045);
```
Set camera fov 55, near .1, far maybe 2,000,000. At high altitude, stars radius 300k and earth sphere far; far=3e6. near 0.2. Good.

Sun light:
```
const sun = new THREE.DirectionalLight(0xfff2dd, 3.0);
sun.position.set(-80, 130, 100)? 
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near=0.5; far=400; left/right=-100? Need at high altitude shadows not matter. Directional light target rocket? For local pad, use shadow camera around pad. set shadow.bias=-0.0005. 
scene.add(sun);
const sunTarget = new THREE.Object3D(); scene.add(sunTarget); sun.target=sunTarget; target at (0,0,0).
const hemi = new THREE.HemisphereLight(0xbcdcff,0x3a4a2d,0.6); 
```
But at high altitude no light? Directional light still.

Sky dome:
```
const skyUniforms = { uAltKm: {value:0}, uSunDir: {value: new THREE.Vector3(...).normalize()} };
const skyGeo = new THREE.SphereGeometry(400000, 32, 16);
const skyMat = new THREE.ShaderMaterial({
 uniforms: skyUniforms,
 vertexShader: `
 varying vec3 vDir;
 void main() {
   vec4 wp = modelMatrix * vec4(position,1.0);
   vDir = normalize(wp.xyz);
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
 }
 `,
 fragmentShader: `
 varying vec3 vDir;
 uniform float uAltKm;
 uniform vec3 uSunDir;
 void main() {
   float h = clamp(vDir.y, -0.05, 1.0);
   float alt = clamp(uAltKm / 100.0, 0.0, 1.0);
   vec3 groundSky = vec3(0.55, 0.72, 0.92);
   vec3 zenithLow = vec3(0.18, 0.42, 0.78);
   vec3 low = mix(groundSky, zenithLow, pow(max(h,0.0), 0.65));
   // pale horizon haze
   float haze = exp(-max(h,0.0)*8.0);
   low = mix(low, vec3(0.85,0.9,0.92), haze * 0.55 * (1.0-alt));
   vec3 space = vec3(0.0,0.005,0.015);
   vec3 col = mix(low, space, smoothstep(0.0,1.0,alt));
   float sun = max(0.0, dot(normalize(vDir), normalize(uSunDir)));
   col += vec3(1.0,0.8,0.45) * pow(sun, 32.0) * (0.25 + 0.6*(1.0-alt));
   // horizon rim atmosphere at high? 
   float rim = exp(-max(h,0.0)*30.0);
   col += vec3(0.20,0.45,0.85) * rim * alt * 0.8;
   gl_FragColor = vec4(col,1.0);
 }
 `,
 side: THREE.BackSide,
 depthWrite: false,
 fog: false
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);
```
Wait sky dome radius 400000, camera at 100km inside. Good. At ground, sky behind. At high, black except rim near horizon and sun. Stars radius 350000 (inside sky). But sky dome should not occlude stars because sky is farther (400k) and stars at 350k, depth: stars closer, render over. But sky material depthWrite=false so stars visible. Need render order: sky first maybe `sky.renderOrder = -10;` But if depthWrite false, stars drawn after? Points added after maybe; with depthTest true and sky depthWrite false, stars visible. Good.

Stars:
```
const starGeom = new THREE.BufferGeometry();
const starPositions = new Float32Array(2000*3);
for ... {
  const v = new THREE.Vector3(rand...).normalize().multiplyScalar(300000);
  starPositions[...] = v.x;...
}
starGeom.setAttribute('position', new THREE.BufferAttribute(...));
const starMat = new THREE.PointsMaterial({ size:1.8, sizeAttenuation:false, color:0xffffff, transparent:true, opacity:0, depthWrite:false, fog:false});
const stars = new THREE.Points(starGeom, starMat);
```
Need star positions avoid below horizon? random full sphere; okay. Since camera moves, stars in all directions. At high altitude, Earth blocks lower ones. Fine. Add a few bigger stars maybe one Points only. Could use same with size.

Earth sphere:
```
const earthR = 6371000;
const earthGeo = new THREE.SphereGeometry(earthR, 96, 48);
const earthMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: sun.position.clone().normalize() } },
  vertexShader: `varying vec3 vWorld; varying vec3 vNormalW; ...`,
  fragmentShader: ...
  side: THREE.FrontSide
});
const earth = new THREE.Mesh(earthGeo, earthMat);
earth.position.y = -earthR;
scene.add(earth);
```
But Earth sphere radius R; local ground plane also at y~0.02. Earth surface near origin at y=0. Earth sphere with frontside: camera above surface sees front faces. Good. At high altitude, horizon. Shader color:
```
float land = smoothstep(-300.0, -240.0, vWorld.z);
float ocean = 1.0 - land;
vec3 base = mix(vec3(0.12,0.24,0.38), vec3(0.16,0.32,0.12), land);
float mottled = 0.5+0.5*sin(vWorld.x*0.08 + vWorld.z*0.07);
base += land * ...;
float light = 0.6 + 0.4*max(0.0, dot(normalize(vNormalW), normalize(vec3(0.35,0.75,0.45))));
gl_FragColor = vec4(base * light, 1.0);
```
At z<-300 ocean blue; at z>-240 land green. But at far distances, ocean everywhere z negative, land positive. Good. At x far, ocean maybe all negative. This creates coastline at z=-300 across entire globe. Fine.

But local earth horizon at low camera may conflict with local land/ocean. The earth sphere at y=-R surface near origin; at low camera, if local ground plane extends 800m, sphere below; horizon far. Ocean plane covers z<-300 maybe up to 100km. Earth sphere behind. Fine.

Potential z-fighting at y=0: set earth.position.y = -earthR - 0.5 so surface y=-0.5. Local plane y=0.0. At high alt, difference negligible.

Ground plane:
- procedural land texture 1024x1024 with green/brown noise and maybe roads? Use CanvasTexture, repeat maybe 8.
```
const landTexture = makeGroundTexture();
const landMat = new THREE.MeshStandardMaterial({ map: landTexture, color: 0xffffff, roughness: 1, metalness:0 });
const land = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), landMat);
land.rotation.x=-Math.PI/2; land.position.set(0,0.02, 300); land.receiveShadow=true; scene.add(land);
```
Need coastline at z=-280. Land plane from z = 300-800? If size 1600 centered z=500 => z=-300 to 1300. x ±800. Good. Ocean beyond z<-300.
- Ocean plane: `PlaneGeometry(300000, 300000)` rotated x=-pi/2, position z=-150000? Need ocean starts at z=-300 and extends negative. Size maybe 300000 centered z=-150300? It covers from -300300 to -300? Actually if centered at -150000 size 300000 -> z -300000 to 0, overlaps land. It will overlay land maybe; set y=-0.1 and land y=0.02 so land visible. Good. But ocean at y=-0.15; if camera low, ocean plane behind land? It extends beneath land; land covers to z=-300. Good. Use color blue roughness 0.4 metalness 0.1. Maybe ocean plane at z=-150300 size 300000 => front edge z=-300. Use `ocean.position.set(0,-0.12,-150300); ocean.geometry = PlaneGeometry(300000,300000) -> z range -300300 to -300;` Good. It may appear too flat and extend to horizon. At high alt, plane edge at 300km; Earth horizon 357km; edge inside? Could see edge. Increase size to 700000 and center -350300 => z -700300 to -300. At high alt horizon 357km, plane extends beyond horizon; flat plane at y= -0.12 may occlude Earth curve? Hmm at high altitude, ocean plane flat extends 700km, to horizon? From 100km, flat plane edge 700km below line of sight? It will appear as a huge flat plane not curved, likely bad. But camera at high altitude looking at rocket not ground; background will be flat ocean horizon at 700km, while Earth sphere below. Maybe Earth sphere doesn't show because ocean plane covers. Better make ocean plane only local 100km? At high not important? Maybe fade ocean plane out as altitude increases? Could set ocean opacity? MeshStandard transparent? Hmm.

Maybe instead for high-altitude, hide local land/ocean when alt > 5000? But rocket view of coast at high? The prompt: "view of coast, curve of Earth and then space seen from near rocket all the way up." Need coast at high maybe visible. We can keep local land/ocean small and Earth sphere visible; local coast at Cape might become tiny. But Earth sphere shader coastline across world at z=-300, not the actual local ocean plane; it shows. At high altitude, local planes maybe tiny and could be below; Earth sphere dominates. Good. Set ocean plane size 40,000 (not huge) and center z=-20300, extends -40000 to -300. At high altitude, local ocean patch 40km across, but Earth sphere horizon 357km behind; okay. Land 1600m. Coast patch at high maybe small.

But at low camera, ocean horizon at 40km flat; okay. At high, local patch visible but far below. Earth sphere shows curved horizon.

Could adjust local planes visibility with altitude: perhaps fade land/ocean at alt > 10km? But not necessary.

Need roads/buildings. Roads: create dark asphalt strips at y=0.035, e.g. long boxes, not shadows? Use MeshStandard. Add roads around: one road along x direction at z=150? Buildings low boxes at distance 100-300m. Add maybe 10.
Need scrub vegetation: many instanced bushes. Use `InstancedMesh` of `IcosahedronGeometry(1,1)` with green material, random scale 2-5m, positions x±600, z from -250 to 1200 excluding pad and roads. Use dummy Object3D. At high, tiny. Maybe 400 instances. Fine.

Tower: Need build. Helper addBeam:
```
function addBeam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius=0.12, material: THREE.Material): THREE.Mesh {
 const dir = new THREE.Vector3().subVectors(b,a);
 const len = dir.length();
 const geom = new THREE.CylinderGeometry(radius,radius,len,6);
 const mesh = new THREE.Mesh(geom, material);
 mesh.position.copy(a).add(b).multiplyScalar(0.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
 mesh.castShadow = true; mesh.receiveShadow = true;
 parent.add(mesh); return mesh;
}
```
Need avoid creating many geometries? okay.

Launch tower: next to rocket at x=9, z=0? If rocket at x=0, z=0. Tower maybe x=7.5, z=0, height 60. Lattice with corners at x=5.5..9.5 and z ±2. Build vertical beams at four corners; horizontal braces every 6m; diagonals on front/back/sides. Since camera at z=55 looking -z, tower at x=8 maybe right of rocket. Add umbilical arm connecting to rocket? Use horizontal beam from tower to near rocket at y=35? Good.

Lightning masts: 3 tall masts at e.g. (-24,0,15), (25,0,-20), (0,0,-35)? Height 70. Build lattice using simple vertical beams and cross braces. But they might clutter. Use helper.

Pad and flame trench: 
```
const padMat = new THREE.MeshStandardMaterial({ map: concreteTexture, roughness: 0.9, metalness:0.02, color:0xbab7b0});
const pad = new THREE.Mesh(new THREE.BoxGeometry(46,0.45,46),padMat);
pad.position.y=0.225; pad.receiveShadow=true; pad.castShadow=true; scene.add(pad);
```
Need rocket at base y=0.45. `PAD_TOP = 0.45;`
Flame trench: dark opening on top: 
```
const trenchMat = new THREE.MeshStandardMaterial({color:0x1a1715, roughness:1});
const trench = new THREE.Mesh(new THREE.BoxGeometry(18,0.08,12), trenchMat);
trench.position.set(0,0.46,0); // top
```
But it sits on top not hole. Could create black recess with inner walls and a sloping deflector maybe. Actually flame trench under rocket extends away laterally. Add dark rectangular strip along x from -23 to 23, z width 8 at y=0.46. Add two long low walls. The flame plume down hits it. Smoke originates along trench x. Good.

Could create trench as black plane at top y=0.46, size 34x9 with `MeshBasicMaterial` black; but on pad top. Add trench walls.

Need pad surface concrete texture. Make concrete canvas: gray noise, cracks/stains. `color:0x8f8b82`? Use map only. Use `CanvasTexture`, repeat 2. Need concrete pad's box has map on all sides; okay.

Rocket:
Need `rocketGroup = new THREE.Group(); rocketGroup.position.set(0, PAD_TOP, 0); scene.add(rocketGroup);`
Construct body:
- engine section from y=0 to 6? Since base at 0. Nozzles at bottom maybe protrude below? Rocket body total 70 include nozzles? We can have engine section y=0..7. Rocket height 70. Body main from 7..57, fairing 57..70. Interstage band around 50..56 dark? Falcon interstage between first and second stage; can be dark band at 51..56. 
- Nozzles: 9 small cone/cylinder at bottom, local y maybe 0? We need rocket base at pad y=0.45; nozzles should extend from y=0 to maybe y=2? If base at y=0.45, nozzles would extend below pad. Better rocket group origin at nozzle bottom y=0.45; nozzles from y=0 to 3. Body starts y=3. Total height from bottom nozzle to fairing 70: nozzles 0..3, engine 3..8, body 8..58, fairing 58..70. At alt 0, nozzle bottom touches pad. Plume exits downward from y=0? The nozzle bottom at pad; flame can extend downward into trench (below pad?) but pad plane at same y. Could start plume at y=1? Hmm. Rocket base at pad, flame below pad would be under concrete; visually flame may extend sideways. But okay. Could set rocket group y=PAD_TOP+0.5 so slightly above; but alt should be above pad. We can set base offset 0.45 and nozzle bottom y=0.45; plume extends down through pad not visible except from side. The blinding core at nozzles y=1.5 etc. Fine.

Let's build:
```
const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTexture, roughness:0.38, metalness:0.05, color:0xffffff });
const body = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,50,32,1,false), bodyMat);
body.position.y = 8+25 = 33? 
```
If body height 50 from y=8 to 58, center 33. Good.
- Engine section: cylinder radius 1.85 height 5 from y=3 to8 center 5.5 dark material. Add nozzles at bottom y=3? Wait engine section from y=3 to 8, nozzles below y=0..3. Let's use engine section y=3..8. Nozzle bell inside engine bottom? Place 9 nozzles with top at y=3.5, bottom y=0.5. They are below engine section and would extend to y=0.5, okay. Rocket base at y=0.
- Add skirt maybe cylinder radius 1.9 height 0.8 at y=3.7.
- Nozzles: `ConeGeometry(0.45, 2.4, 12, 1, true)` with open? Standard cone tip up? Need bell shape wider at bottom. Use cylinder radiusTop 0.28 radiusBottom 0.55 height 2.4 open-ended; place y=1.4? top at y=2.6, bottom y=0.2. With 9 nozzles arranged around center: positions radius 0.9 angles. 
- Main body: from y=8 to y=57? Let's adjust: body height 49, center 33.0 (8..57). 
- Interstage: cylinder radius 1.86 height 6 from y=51 to57, dark gray/black, overlapping body. center 54.
- Upper stage fairing: cylinder radius 1.85 height 7 from y=57 to64, white, then nose cone 6 from 64 to70. Use `ConeGeometry(1.85,6,32)` tip at y=70 base at y=64? ConeGeometry height 6 tip top; base at -3 relative center; place center y=67. base y=64 tip y=70. good. Add fairing top maybe smooth. Body total 70 y=0 to70.
- Body texture map along cylinder; markings. Need canvas height maybe 2048, width 512. Cylinder's texture wraps horizontally; y in canvas maps along cylinder height. Draw white, flag around y maybe 0.7? Need orientation; not critical.
- Add black "SPACEX" text vertical? Use ctx.rotate? Canvas drawing.
- Add flag rectangle. Draw stripes maybe.
- Add dark band at bottom? Engine section separate.

Need rocket body maybe white with slight off-white and markings. Need not use texture? But requirement markings drawn on canvas texture. Do.

Need physically based materials. Use env? No environment map; PBR with lights. Could add `scene.environment` using procedural? Without env map, metalness may be dark. Use low metalness. Fine.

Need flame:
`plumeGroup` attached to rocketGroup at local (0,0.4,0) maybe. It points local -y. Build meshes:
- `plumeOuter`: CylinderGeometry(1.8, 0.4, 30, 32, 1, true); material transparent additive orange, opacity ~0.35; position.y = -15.
- `plumeInner`: CylinderGeometry(1.1,0.15,18,24,1,true); material additive, color 0xffffff; opacity 0.9; position y=-9.
- `plumeCore`: Cone? cylinder white bright; 
- `Mach diamonds`: small Spheres or sprites along y=-1..-15 spaced; additive white; scale 0.6 etc. Actually in local y down. Add maybe 5 small `MeshBasicMaterial` spheres; but with bloom. Could use point sprites? Use small `Mesh` with Icosahedron; update flicker. Mach diamonds in exhaust; add as bright white discs at positions. Good.
- Outer smoky orange: maybe second cone with normal blending. Need bloom.

Need orientation rotation of plume? Attached to rocket; with rocket rotation, plume follows thrust direction. Good.
Need flame scale & opacity based on thrust and altitude. If burn ended, hide plume. At high altitude, no air, plume grows. We can update `plumeGroup.visible = burnActive` (mass < dry? t<200) perhaps. At t>200, maybe no plume, but second stage? Our model one burn. Fine.
Scale: `const lengthScale = 1 + THREE.MathUtils.clamp(alt/8000,0,8);` `plumeGroup.scale.set(widthScale, lengthScale, widthScale)`? If scaling group uniformly, length and width both. Better each mesh.

Need flicker light:
`const exhaustLight = new THREE.PointLight(0xffb055, 20, 120, 2);` update position near rocket base maybe world. But if attached to rocketGroup at local (0,2,0), it moves with rocket. Light intensity high. With intensity units? Three r155 physically correct lights? PointLight intensity in candela; high maybe 500. Use `intensity=1000`? Renderer use physically correct? In r155 `useLegacyLights` removed? We can set intensity values. Directional light intensity 3.0; point light maybe 50. Need not too high. Use `intensity=120`, distance 200. Flicker.

Need smoke sprites material. Sprite positions in world. `scene.add(smokeGroup);`. Generate `smokeParticles`: each has sprite and base data. But using 120 sprites with map. Soft. Need update based on rocket t. When reset, t=0; smoke particles hidden? We can set opacity 0 before t small. At t=0, maybe steam not visible until ignition; but liftoff immediate. We'll set birth time random 0..3, so after t>0 visible. At reset, hide. `sprite.visible = false` if age<0 or age>life. Use opacity from age: fade in quickly, fade out after life. Some clouds persist longer. Use random.
Implementation:
```
interface SmokeData {
 sprite: THREE.Sprite;
 dirX: number; dirZ: number; speed: number; rise: number; birth: number; life: number; size: number; phase: number;
}
const smoke: SmokeData[] = [];
const smokeTex = makeSmokeTexture();
for i<160:
 const mat = new THREE.SpriteMaterial({ map: smokeTex, color:0xdfe7e8, transparent:true, opacity:0, depthWrite:false, blending: THREE.NormalBlending, fog:true});
 const sprite = new THREE.Sprite(mat);
 smokeGroup.add(sprite);
 smoke.push(...)
```
Update:
```
const t = rocketSim.t;
for s:
 const age = t - s.birth;
 if age < 0 or age > life { visible=false; continue; }
 visible=true;
 const a = age;
 // horizontal roll outward from trench
 const x = s.dirX * (8 + s.speed * Math.pow(a,0.75)) + Math.sin(s.phase + a*0.6)*4;
 const z = s.dirZ * (8 + s.speed * Math.pow(a,0.75)) + Math.cos(...)*3;
 const y = PAD_TOP + 0.3 + s.rise * Math.pow(a,0.65) + Math.sin(a*1.1+phase)*1.2;
 sprite.position.set(x,y,z);
 const grow = s.size * (0.6 + Math.min(a*0.25, 2.5));
 sprite.scale.setScalar(grow);
 const fade = Math.sin(Math.PI * Math.min(1, age/s.life))? For opacity, fade in `smoothstep(0,0.8,age)` and fade out `1-smoothstep(life-8,life,age)`; plus `0.55`.
 mat.opacity = 0.5 * fade;
 // maybe color mix white.
```
But at t=0-3, some clouds start; okay. Need clouds roll sideways out of trench: positions with dir mostly x for first few seconds. Good.

At high altitude, pad smoke stationary; camera high not see. But if camera chase and looking at rocket, pad below far away not visible much. Fine.

Need fog update based on altitude:
```
const altKm = rocketSim.state().alt/1000;
scene.fog.density = THREE.MathUtils.lerp(0.0009, 0.00002, clamp(altKm/40,0,1));
```
But if camera high, fog shouldn't obscure earth? It will make distant pale. Use `fog.color` pale.

Need stars opacity: `starMat.opacity = smoothstep(65,100,altKm)`. Actually if altKm=0 ->0; at 70 -> maybe 0.1; at 100 ->1. Use `THREE.MathUtils.smoothstep(altKm,70,100)`? Signature smoothstep(x,min,max). Yes. Maybe 0 at 70. "appear above about 70" so use smoothstep(60,100,altKm). At 70 ~0.08? Wait smoothstep(60,100,70)=0.156. Good. At 100=1. Need clear. Use `starMat.opacity = THREE.MathUtils.smoothstep(altKm, 65, 100);` but THREE.MathUtils.smoothstep(x,min,max) if min<max. yes. At 70 0.125. Fine.

Sky uniform altKm. Also camera high and earth sphere.

Need mission overlay update. Create div fixed top-left:
```
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;left:12px;top:12px;padding:10px 12px;color:#fff;background:rgba(0,0,0,.45);font:13px/1.4 system-ui...;border-radius:8px;pointer-events:none;backdrop-filter:blur(4px);';
overlay.innerHTML = `<div id="mission"></div>`;
```
But buttons need pointer events; separate controls div. Create `controls`. Buttons set speeds.
Need update text per frame (or throttled). Use `missionEl.textContent = ...`.
Mission data: T+ time (format mm:ss), altitude km, velocity m/s (or km/h), speed x. Show speed. Maybe `T+ 00:00 | Alt 0.00 km | Vel 0 m/s | Speed x1`. Buttons 1,2,3.
Keydown: if event.key==='1' etc. `e.preventDefault`.
Buttons: create labels x1 x10 x30. On click `setSpeed(1)` etc. Need if user clicks button, focus? okay.
Pause? Not required, but window.__rocket.paused. Could add pause button? Prompt mentions paused boolean. Maybe key P toggles pause. Add overlay text paused. But no requirement. Could add button pause? Not specified. We can support P key and maybe button. But not necessary. Need expose `paused`. Maybe add "P pause". It is okay. But playback only speed. Let's add P key and a pause button? The prompt only says three buttons set x1/10/30. It doesn't forbid pause button. But to keep clean, add key P toggle and overlay indicates. Maybe test expects paused property only. Good.

Need reset? Not specified UI but window.__rocket.reset exposed. Could add R key reset. Good. Buttons? maybe not.

Need `state().speed` returns current speed. The rocket object state method must compute current speed:
```
function currentSpeed(): number {
 return chosenSpeed ?? (simTime < 10 ? 1 : 10);
}
```
At reset chosenSpeed null; t=0. speed 1. At t=10.0 speed 10. Good. If chosen at t=0, speed chosen.

Physics details:

Let's define simulation variables within closure:
```
let t=0, alt=0, vx=0, vy=0;
const trail: {x:number;y:number;z:number}[] = [];
const m0=550000, dry=220000, burn=200, g0=9.81, R=6371000;
const thrustConst = 1.3*m0*g0;
let chosenSpeed: number | null = null;
let paused = false;
const baseOffset = PAD_TOP maybe need in closure? Trail world y includes padTop. Use `PAD_TOP` global.
```
We need trail points world coordinates; rocket group origin at base. World y = altd + PAD_TOP? Need position. Let's call `PAD_SURFACE_Y = 0.45`. Rocket group origin at bottom of rocket (nozzle bottom); at liftoff position y=PAD_SURFACE_Y. alt is altitude of rocket base above pad surface? If alt=0, base at pad. Trail y = alt + PAD_SURFACE_Y. Use `trailBaseY = PAD_SURFACE_Y`. Should match visual.

Physics step:
```
function pitchAt(time: number): number {
 if (time <=10) return 0;
 return 0.5 * THREE.MathUtils.smoothstep(time, 10, 150); // smoothstep(time, 10,150)
}
```
Three MathUtils.smoothstep signature `(x, min, max)` returns 0..1. At t=10 exactly 0, at 150 1. For t>150 1. Good.
Mass:
```
function massAt(time: number): number {
 if (time >= burnTime) return dryMass;
 return m0 - (m0-dryMass)*(time/burnTime);
}
```
Thrust:
```
function thrustAt(mass:number,time:number): number {
 if (time >= burnTime) return 0;
 return Math.min(1.3*m0*g0, 3*mass*g0); // g? throttle "limited to 3*m*g0" likely g0 or g(h)? Use g0? They state 3*m*g0; yes constant g0? Use g0 in constraint. Could use gAtAlt? text says 3 * m * g0. Use g0.
}
```
Gravity:
```
function gravityAt(h:number): number { const Rr = R + h; return g0*(R/Rr)*(R/Rr); }
```
Equations:
```
const pitch = pitchAt(t);
const m = massAt(t);
const T = thrustAt(m,t);
const g = gravityAt(Math.max(alt,0));
const vThrust = T*Math.cos(pitch);
const hThrust = T*Math.sin(pitch);
let ay = vThrust/m - g;
let ax = hThrust/m;
// Horizontal motion? Need integrate x velocity. Since no horizontal drag. vx += ax*dt; x += vx*dt.
vy += ay*dt;
alt += vy*dt;
vx += ax*dt;
x += vx*dt;
if (alt < 0) { alt=0; vy=Math.max(0, vy?)? Actually if falling below pad, set alt=0, vy=0; maybe also? Rocket cannot go below. If vy<0, set 0. }
```
At t=0, ay = T/m - g. T/m =1.3g0 -g0 = 0.3g0 positive. good.

Need fixed substep max 0.02:
```
function substep(dt: number) {
 // integration; dt <=0.02
}
function step(dt: number) {
 if (!Number.isFinite(dt) || dt <= 0) return;
 let remaining = dt;
 while (remaining > 0) {
   const h = Math.min(remaining, 0.02);
   integrate(h);
   remaining -= h;
 }
 // after step add trail point
 trail.push({x, y: alt + PAD_SURFACE_Y, z:0});
}
```
But if dt huge, remaining maybe enormous; while loops okay. For dt=1000 =>50k loops, fine. To avoid infinite if dt huge? no.
Trail max? Could grow too large if tests call step many times; not concern. But line geometry needs max. Could cap visual only. Keep trail array all points. The prompt expects trail array one per step. Keep all. If more than 10000, create geometry dynamic? We can rebuild? We can cap line displayed to last N. Use line.

Need state `vel`: vertical velocity? The state spec `vel (m/s)` maybe they expect vertical velocity. We can return `vel: vy`. `speed` total. `acc` net vertical acceleration computed at current state. At t exactly burn end, mass dry, thrust 0; acc = -g. Need compute state:
```
const pitch = pitchAt(t);
const m = massAt(t);
const g = gravityAt(alt);
const T = thrustAt(m,t);
const acc = T*Math.cos(pitch)/m - g;
const speed = Math.hypot(vx,vy);
return {t, alt, vel:vy, acc, pitch, speed};
```
Need if alt 0 and gravity; okay.
Could maybe `vel` is speed? But spec includes speed separately; so vel is vertical velocity likely. Good.

Reset:
```
function reset() {
 t=0; alt=0; vx=0; vy=0; chosenSpeed=null; trail.length=0;
 // Maybe paused? We can set paused=false? The task says reset(): time 0, rocket on pad, trail emptied (keep same array object), ... reset clears viewer's choice. It doesn't say paused. I'd not change paused.
}
```
But if paused true and animation loop won't advance; reset then paused remains true. Test maybe sets paused false manually. Fine.

`window.__rocket = { reset, step, state, trail, paused: false }`. But paused property must be mutable. If object property paused and internal logic reads `rocket.paused`, okay. But closure functions can access object? We can define `const rocket: { ... paused: boolean } = { ... paused: false }`. Then animation loop reads `rocket.paused`. Step functions don't need paused. `reset` not modify paused. Speed function can be inside object? state uses chosenSpeed. Fine.

Need if `state().speed` returns current speed. Could be in state; no separate property.

Potential problem: trail property must be same array object after reset. We define `const trail: ... = []` and assign. reset length=0. Good.

Need actual visual uses state and trail. `rocketSim.state()` each frame. But state includes speed; speed computed from t and chosen. Need chosenSpeed variable not accessible? okay.

When reset, visual rocket group update using last trail maybe. Need our animation's `updateVisual` each frame. If paused before first? still updates.

Need animation loop:
```
const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;
function animate(): void {
 const delta = clock.getDelta();
 const frameDelta = Math.min(delta, 1/30);
 elapsed += delta;
 const sim = rocketSim;
 if (!sim.paused) {
   const speed = sim.state().speed;
   sim.step(frameDelta * speed);
 }
 const st = sim.state();
 updateVisual(st, elapsed, frameDelta);
 // camera
 const alt = st.alt;
 // update sky, stars, fog
 const altKm = alt/1000;
 skyMat.uniforms.uAltKm.value = altKm;
 starMat.opacity = THREE.MathUtils.smoothstep(altKm, 65, 100);
 scene.fog.density = ...
 // rocket position
 // update camera
 updateCamera(st, delta, elapsed)
 // overlay
 updateOverlay(st)
 composer.render();
 if (firstFrame) { (window as any).__ready = true; firstFrame=false; }
}
renderer.setAnimationLoop(animate);
```
Need `clock.getDelta` first after start maybe. Reset not restart clock. Fine.

Motion uses delta and elapsed. Good.

Need camera:
Initial camera at low pad: `camera.position.set(34, 9, 58)`? Looking at rocket mid. Need view low camera near pad looking up. Maybe camera at (43, 7, 62) looking at (0, 28,0). FOV 52. At rocket base 0.45; height 70; distance ~75; okay.

As rocket climbs, camera blend. Let's compute desired:
```
const rocketCenterY = st.alt + PAD_SURFACE_Y + 35;
const rocketPos = new Vector3(st.x?? need x from trail, st.alt+PAD_SURFACE_Y,0)
```
Need horizontal x from visual rocket? We can store a global `rocketWorldX` variable from last trail. Since `state` doesn't expose x, use `trail` last. Define helper:
```
function rocketWorldPosition(): THREE.Vector3 {
 const last = trail[trail.length-1];
 return last ? new THREE.Vector3(last.x,last.y,last.z) : new THREE.Vector3(0, PAD_SURFACE_Y,0);
}
```
But `trail` in closure not accessible outside? rocketSim.trail is public. In updateVisual use `const last = rocketSim.trail[...]`. Good.

Chase offset relative to rocket base: e.g. `new Vector3(45, 18, 65)`. Need within 100: distance sqrt(45^2+18^2+65^2)=81. Good. But if x moves, camera offset same. Looking target at rocket center (base + 35). So distance from camera to rocket center = sqrt(45^2+(18-35)^2+65^2)=80.7. good.
As altitude grows, camera chase position relative same; could add slight vertical offset. The camera is close to rocket, view coast below and horizon. At 100km, camera at rocket + (45,18,65), looking at rocket center. It will see rocket and plume, background stars/earth. Good.

Blend with `smoothstep(alt, 40, 120)`: low static until alt 40, chase from 120. But "once rocket clears the tower" tower height ~60. At alt 60, blend partial. Good. Static camera pos (36,8,58); target low rocket center (0, PAD+35+alt*0.3? maybe). Chase desired. We can lerp.

Camera smooth motion: We can compute desired position and look point each frame based on altitude using smoothstep. Then `camera.position.lerp(desiredPos, 1 - Math.exp(-delta*3))`; `currentLook.lerp(desiredLook, ...)`; `camera.lookAt(currentLook)`. But at first frame camera initially set; need `currentLook` initial. Use global `let camLook = new THREE.Vector3(0,35,0)`. For smoothing, using delta real not simulation speed. Good.

Need if rocket goes beyond far? at 100km fine. alt maybe huge if simulation continues after burn; with vertical velocity at 200s? Let's estimate: mass decreases, acceleration high. At 200s, velocity maybe ~? T ~6.5e6, mass 220k, acceleration ~29 m/s² minus gravity ~9.5 = 20; over 200s average maybe 10-20; velocity maybe 3000 m/s, altitude maybe ~200km? Actually rocket acceleration increases from 3 to 30 m/s2, average 15 => v 3000, alt 300km. So after burn, coast up. If playback speed 30 and simulate minutes, alt could be >1000 km. Sky black; fine. Camera far. Physics continues. Earth maybe below. Need stars. Trail.

State speed after 10 is 10 or chosen 30; if burn ended and speed 10, it takes long. But okay. User can choose 30.

Need rocket rotation. Use `rocketGroup.position.set(x, alt+PAD_SURFACE_Y, 0); rocketGroup.rotation.z = -pitch;` Wait local y points to +x for rotation z=-pitch. At pitch positive, rocket tilts +x. Horizontal velocity positive x. Good.
But rocketGroup.rotation also rotates plume and engines. Good.
Need rocket center target for camera accounts tilt? `rocketCenter` should be rocket base + local axis vector? Body center along tilted axis. We can compute axis: `dir = new THREE.Vector3(Math.sin(pitch), Math.cos(pitch), 0)`. Rocket center at base + dir*35. Camera target to rocket base+dir*35. In updateVisual we can set. Use for camera. Need the rocket group position x from last trail. Use `rocketGroup.position`. Build `rocketCenter = rocketGroup.position.clone().add(new Vector3(Math.sin(pitch),Math.cos(pitch),0).multiplyScalar(35))`.
At liftoff pitch 0. Good.

At high altitude, camera looks at rocket center. Background earth behind maybe. Fine.

Need plume orientation and scale. Since attached to rocketGroup at y=0.2 and rotates with rocket.

Need flame light update: use rocketGroup.localToWorld? If light attached to rocketGroup at (0,1.5,0) then its world position follows. But light intensity in local. Add to rocketGroup. To have shadow? no.
```
exhaustLight.position.set(0,1.6,0);
rocketGroup.add(exhaustLight);
```
Then flicker `exhaustLight.intensity = 80 + ...` and color. If plume hidden, intensity 0.

Need smoke lights? Add a point light near pad at start? exhaust light at rocket base lights pad. Point lights physical distance. At alt high, far from pad so pad not lit. But at liftoff, rocket base near pad, light pad. Good. Maybe add a stationary pad light at plume? But rocket moves; initial enough.

Need smoke sprites maybe use `fog: true` property in SpriteMaterial? SpriteMaterial has fog property? Yes.

Need stars material `fog: false` maybe `PointsMaterial` has fog property.

Need "physically based materials, ACES tone mapping, shadows" yes.

Need `composer` resize. On window resize:
```
camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
composer.setPixelRatio(Math.min(window.devicePixelRatio,2));
composer.setSize(window.innerWidth,window.innerHeight);
```
EffectComposer has setPixelRatio? In Three, EffectComposer.setPixelRatio exists (yes). Need order. Use.
But if pixel ratio set on renderer and composer.setPixelRatio? EffectComposer internally uses renderer pixel ratio? It has setPixelRatio. Use.
Potential TS: `composer.setPixelRatio` exists? EffectComposer type includes `setPixelRatio(pixelRatio: number): void;`. yes.

Need make textures:

`createCanvasTexture(width, height, draw)` helper:
```
function makeCanvasTexture(w:number,h:number, draw:(ctx:CanvasRenderingContext2D)=>void): THREE.CanvasTexture {
 const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Canvas 2D context unavailable');
 draw(ctx);
 const tex = new THREE.CanvasTexture(canvas);
 tex.colorSpace = THREE.SRGBColorSpace; // for maps
 tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; // for some
 tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // maybe use renderer after creation. Renderer constructed before textures. yes.
 return tex;
}
```
Need for smoke texture maybe colorSpace? use sRGB.

Ground texture: Canvas 1024; random green/brown. Need per pixel noise? Use deterministic pseudo random? `Math.random` okay. Draw base fill, many random ellipses. Use `ctx.fillStyle`. Add roads? Instead roads meshes. Add vegetation texture. Make repeat. Set `tex.repeat.set(6,6)` for land plane? If plane 1600, 6 repeats -> each ~266m; okay.
Concrete: 512, gray noise cracks. Set repeat maybe 2.

Body texture: Canvas 512x2048 (vertical). Need map on cylinder. For cylinder, map U around circumference, V along height. Cylinder from y=8 to58 height 50. Texture spans entire cylinder (including caps? cylinder side). Draw white background. At vertical positions: flag at maybe 0.75 down? Need orientation of V 0 at bottom? In CylinderGeometry, v=0 at bottom? I think UV y from bottom to top? Actually cylinder side UV: y from 0 bottom to 1 top? It uses height segments. Likely v=0 bottom, v=1 top. We can draw. Add dark band near bottom? Body separate. Draw at y in canvas: top = 0? Canvas y increasing down; texture V mapping might invert. Doesn't matter. Draw flag around mid. Lettering rotated vertical maybe.

Canvas draw:
```
ctx.fillStyle = '#f3f3f1'; fillRect.
// subtle vertical seam
ctx.strokeStyle = '#d8d8d4'; line...
// flag: blue rectangle and red stripes; white stars simplified
ctx.save(); ctx.translate(120, 1000); // maybe.
```
Need text: `ctx.fillStyle='#151515'; ctx.font='bold 48px sans-serif'; ctx.fillText('SPACE-X', ...)`; But text vertical? Could draw "FALCON 9" horizontally; on cylinder wrap, maybe repeats. Fine. Markings. Draw a US flag rectangle with red/white stripes and blue canton. Use fill rectangles and maybe star dots. Good.

Use bodyMat map. Need because texture repeat? no. Maybe set `bodyTex.wrapS = RepeatWrapping` and repeat around circumference? If want flag not distorted. Cylinder map covers circumference (2πr=11.6m) and height 50m. Canvas 512x2048 aspect 0.25 vs real aspect 11.6/50=0.23. okay.

Smoke texture:
```
const canvas=256; const ctx; radial gradient center (128,128), radius 128; stops white alpha .8 to transparent; Add multiple small circles? Maybe radial with slight noise. Use gradient. For a soft sprite, a radial gradient with center white and transparent at edges. Also draw random lighter lobes to break shape. 
```
Use `ctx.globalCompositeOperation='lighter'`? no. Draw 10 radial gradients at random positions with low alpha. But sprite material map with alpha. Simpler radial gradient and some noise. Need color. White.

Rocket body markings canvas includes flag.

Ocean material: MeshStandardMaterial color `0x0d5e86`? At Cape, Atlantic deep blue. roughness 0.35, metalness 0.15. Add some specular via lights. Could use `MeshPhysicalMaterial` with clearcoat? Use MeshStandard.

Need low buildings: create boxes at positions with materials beige/gray, some roofs. Maybe at x=-120,z=100 etc. They must not conflict with ocean. Add low buildings around pad:
```
const buildingMat = new MeshStandardMaterial({color:0xb7b2a6, roughness:0.7, metalness:0.05});
for positions [[-90,120], [80,180], ...] create box size 20x5x12, y=2.5; roof box. 
```
Need roads:
```
const roadMat = new MeshStandardMaterial({color:0x3b3b3b, roughness:0.8});
const road = new Mesh(new THREE.BoxGeometry(600,0.06,10), roadMat); road.position.set(0,0.05,180);
...
```
But land plane at y=0.02; road at 0.05.

Need bushes. Use InstancedMesh:
```
const bushGeo = new THREE.IcosahedronGeometry(1,0);
const bushMat = new THREE.MeshStandardMaterial({color:0x2f5a2b, roughness:0.9});
const bushCount = 500;
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
const dummy = new THREE.Object3D();
for i<... {
 const x = (Math.random()-0.5)*1400; const z = 50 + Math.random()*1200 - 250? Need land area excluding pad, ocean. 
 if (dist from pad < 60) skip? Could still place but okay.
 dummy.position.set(x, 0.4 + Math.random()*0.6, z);
 dummy.scale.setScalar(1.5 + Math.random()*3.5);
 dummy.scale.y *= 0.55; // flattened
 dummy.rotation.y=random
 dummy.updateMatrix(); bushes.setMatrixAt(i,dummy.matrix);
}
bushes.castShadow=true; bushes.receiveShadow=false; scene.add(bushes);
```
Need if skip leave identity? instanced mesh count; for skipped, could set scale zero. Simpler choose all within land but avoid pad by if dist<40 then set y=-100? Not. Use while? Do for each set matrix; if inside pad or ocean, set position maybe far. But ocean excluded by z > -250. Use random z between -240 and 1000, x between -700,700; if near pad (<80) skip setting scale 0. Set dummy.scale.setScalar(0). Could. Need initialize all matrices. Use.
Maybe use `bushes.instanceMatrix.needsUpdate = true`.

Need maybe use `MeshStandardMaterial` with vertex? good.

Launch tower and masts: helper. Build with material:
```
const metalMat = new THREE.MeshStandardMaterial({ color: 0x6d6a62, roughness:0.65, metalness:0.6});
```
Need lattice towers. Write function `buildLatticeTower(x: number, z: number, width: number, depth: number, height: number, material)`:
- Four vertical posts at corners (x±w/2, z±d/2), from y=0 to height. Use addBeam.
- Horizontal levels every 8m: beams along four sides at y level.
- Diagonal cross on front and back maybe. For each face, add diagonal between level corners. Many beams. At height 60, 7 levels. Fine. For masts three height 80 and width 3.
- For launch tower next to rocket at x=8.5,z=0, width=4,depth=4,height=64. Add maybe an arm extending toward rocket at y=38, from tower to x=2.5. Use addBeam. Also umbilical line? Fine.
- Lightning masts at positions (-28,0,22),(30,0,-15),(0,0,-35), height=75. Their towers could be tall. Need not overlap ocean? okay.
- Add small red top lights? MeshBasic red spheres maybe.

Need tower shadow cast. Good.

Pad details:
- Pad box with concrete texture.
- Flame trench central. Maybe walls:
```
const trench = new THREE.Mesh(new THREE.BoxGeometry(34,0.05,8), new THREE.MeshStandardMaterial({color:0x1b1b1b, roughness:1}));
trench.position.set(0,0.46,0); scene.add(trench);
```
- Add two concrete side walls along x? Actually flame trench maybe runs in x direction from -18 to 18. Add dark area, and maybe smoke exits at x=±17. Good.
- Add trench deflectors at x=±20? perhaps.
- Add hold-down clamps around rocket? small boxes.
- Add water deluge pipes? not necessary.

Need rocket shadow maybe cast. Use body meshes castShadow. The sun shadow camera range around pad maybe 80. At high, rocket leaves shadow camera; shadow no longer. That's fine. But the rocket itself in shadow? sun light. Shadows from rocket on pad at liftoff. Good. Need update sun target? Directional light target static pad; shadow frustum around pad. At high, rocket no shadow; fine. Directional light still illuminates rocket. Could set target at rocket middle to ensure? But shadows only local. Directional light direction fixed; target can be at pad. Shadows with frustum. At high not matter. Good.

Need `sun.shadow.camera` type OrthographicCamera; set left/right etc. Use.
```
sun.shadow.camera.left=-80; right=80; top=100; bottom=-80; near=1; far=300;
sun.shadow.camera.updateProjectionMatrix();
```
Sun position (80,120,60). Target (0,0,0). Light from front? Good.

Need create "ocean" with roughness maybe use color. At high altitude ocean plane small. Earth sphere with shader.

Need horizon haze/aerial perspective. Fog affects local objects. Earth shader could add haze based on distance from camera? Not. But sky dome has haze. Distant ocean plane through fog. Fine.

Need use `scene.background = new THREE.Color(0x000000)`? Sky dome covers; if no background maybe black. Set background black, sky dome. At high black. Good.

Need `sky` not receive fog. Mesh with shader depthWrite false.

Need maybe `renderer.toneMappingExposure` update with altitude? At high, sunlight still. Stars with opacity. Fine.

Need physically based material and textures. Good.

Potential issue: large Earth sphere inside sky? Earth at radius R=6.37e6 and sky radius 400k, camera at 100km. Sky dome radius 400k encloses camera. Earth sphere surface near camera? The Earth sphere extends from y=-R to y=0, its center at -R. The sky dome radius 400k centered origin; Earth sphere radius 6.37e6 extends way beyond sky dome. Sky dome will be inside Earth? Hmm Earth sphere radius 6.37e6, center at -6.37e6. Its top surface at 0. Camera near 100km above origin, sphere is below camera. But the Earth sphere extends to y=-12.7e6; it's huge. Sky dome radius 400k centered at origin: from camera, sky dome is 400k away; Earth sphere surface below. They don't overlap much? Earth sphere surface at y around -? At horizontal distance 400k, surface y = -R + sqrt(R² - 400k²) ≈ -12.6 km. So at 400k distance toward horizon, Earth surface is 12.6 km below origin; sky dome at that direction? Sky dome point radius 400k has y maybe etc. Earth appears below horizon; sky above. Good. Stars radius 350k; Earth sphere surface at 350k distance is y≈-9.6km; sky dome 400k behind. Okay.

But Earth sphere renders over sky? Depth test: Earth surface is closer than sky dome in directions below horizon; correct. Sky above. Good.

Local ocean plane at y=-0.1 extends 40km. It may be inside Earth? Earth surface near origin at y=-0.5 (we set -R-0.5). At x=40km, Earth surface y≈ -125m, ocean plane y=-0.1 above, so ocean plane floats above Earth but small; okay. At distance 40km, the ocean plane edge appears above Earth. At high altitude, local ocean plane might appear as flat patch at y=-0.1, while Earth sphere surface at 40km distance is -125m; plane above surface by 125m, negligible. At 40km edge, flat plane horizon maybe. Hmm.

Could adjust Earth sphere center y = -R -0.5; local planes at 0.02/-0.12. Fine.

Need hide Earth sphere at low? It's visible maybe behind ocean? Local ocean plane 40km extends to horizon; Earth sphere at far distance beyond. At low camera, sky above. Fine.

Need ocean plane orientation and position: create plane size 80000 x 80000, center z=-40200? front edge at z=-200? Let's set coastline at z=-220. Ocean plane center z=-40220, size 80000 => z range -80220 to -220. It extends 80km, enough. x ±40000. At high altitude, local ocean patch 80km; Earth sphere curved beyond. Good.
Land plane center z=480? size 1600? range -320 to 1280. Coast at z=-320; ocean front edge -220 overlapping? Need no gap. Let's set land plane size 2000 centered z=780 -> range -220 to 1780. Ocean front edge -220. Good. Land x ±1000. Coast at z=-220 across x ±1000. Beyond x±1000, land? ocean? Earth sphere. Good. Use local ocean plane x width 80000; it starts at z=-220 and extends to -80220. It overlays land? land range down to -220; no overlap except edge. Good.

But camera low at z=58 looking -z. Ocean horizon beyond. Good.

Need roads/buildings on land plane, z between -100 and 600.

Need vegetation all land.

Need star positions maybe use full sphere; at alt 0 opacity 0.

Need overlay updates and UI. CSS no external.

Need possible compile strict issues:
- `THREE.MathUtils.smoothstep` signature? In Three types, `smoothstep(x: number, min: number, max: number): number`. Good.
- `CanvasTexture` colorSpace property exists in modern Three (`texture.colorSpace = THREE.SRGBColorSpace`). yes.
- `SpriteMaterial` constructor accepts object with `map`, `transparent`, `opacity`, `depthWrite`, `blending`, `fog`. `fog` may not be valid? SpriteMaterial extends Material with `fog: boolean`? Material has `fog` property? I think `MeshBasicMaterial` has fog; `SpriteMaterial` perhaps extends Material and includes fog? In types, `SpriteMaterial` has `fog: boolean`? Need check. In Three, SpriteMaterial has `fog` parameter? I think SpriteMaterial constructor params include `fog` (boolean). Yes.
- `PointsMaterial` `fog` yes.
- `MeshStandardMaterial` `map` etc.
- Add uniforms to ShaderMaterial; type `uniforms: { uAltKm: { value: number }, uSunDir: { value: THREE.Vector3 } }`. Fine.
- `skyMat.uniforms.uAltKm.value = altKm` type value any maybe. Fine.
- `starMat.opacity` etc.
- `new THREE.SphereGeometry(earthR, 96, 48)` with radius >? okay.
- `earth.position.y = -earthR - 0.5`.
- `earthMat.uniforms.uSun.value.copy(sunDir)` etc.
- In shaders need precision? no.
- `new THREE.FogExp2(0xbfd9e8, 0.00035)`.
- `scene.fog` type `Fog | FogExp2 | null`; `scene.fog.density` possible if type narrow? TS: `scene.fog` is `Fog | FogExp2 | null`, assigning FogExp2, then later `scene.fog.density`? TS may complain property density not on Fog? It knows assigned? Scene property type `Fog | FogExp2 | null`; if access `scene.fog.density`, strict error because could be Fog. Use local `const fog = new THREE.FogExp2(...); scene.fog = fog;` then update `fog.density` not scene.fog. Good.
- `renderer.capabilities.getMaxAnisotropy()` if renderer constructed. yes.
- `THREE.SRGBColorSpace`; if older type but likely. Good.
- `new THREE.BufferAttribute(starPositions,3)` etc.
- `trail` type; reset length.

Need animate uses camera `lookAt`; currentLook vector. Need ensure smooth camera motion with delta not frame counts. Use `const lerpFactor = 1 - Math.exp(-frameDelta * 2.2);` But if delta very small, okay. If speed simulation high, camera still smooth. Use `camera.position.lerp(desiredPos, lerpFactor)`, `camLook.lerp(desiredLook, lerpFactor)`, then camera.lookAt(camLook). Good.
But initial camera set maybe at desired low. To avoid first-frame lerp from default (0,0,0), set initial camera position. `camLook` initial rocket center.

Need camera static low target. Compute:
```
const basePos = rocketGroup.position;
const axis = new Vector3(Math.sin(pitch), Math.cos(pitch),0);
const center = basePos.clone().add(axis.multiplyScalar(35));
const staticCam = new THREE.Vector3(38, 9, 58);
const staticLook = new THREE.Vector3(0, PAD_SURFACE_Y + 32, 0);
const chaseCam = center.clone().add(new THREE.Vector3(50, -2, 62)); // Wait if add to center, camera distance to center = sqrt(50^2+(-2)^2+62^2)=79.5. Good. Looking center. 
const chaseLook = center.clone().add(new THREE.Vector3(0,-5? Actually target center? If look center, rocket centered; plume visible below. To see plume and coast, look at center + maybe (0,-8,0). Use target = center + (0,-10,0). Then camera sees rocket upper and plume below. Distance to rocket maybe 79. Use.
```
But static camera target should look up rocket. At liftoff, rocket at base, center 35. staticLook center at 35. Camera y=9. Good.

Blend by alt:
```
const blend = THREE.MathUtils.smoothstep(st.alt, 40, 140); 
const desiredPos = staticCam.clone().lerp(chaseCam, blend);
const desiredLook = staticLook.clone().lerp(chaseLook, blend);
```
At high altitude, camera offset (50,-2,62) from center. It looks down slightly? `chaseLook = center + (0,-8,0)`. So camera above? camera y center-2, target center-8, looking down. Plume below target. Good. The horizon maybe. If camera offset z=62 toward positive z, looking toward rocket, background behind negative z is ocean/earth; good. Camera at rocket+50 x, +62 z, right/front. Good.

Need ensure camera not under ground at liftoff: y=9.

At high altitude, staticCam to chase smooth. Need `desiredPos` clone each frame; allocate vectors per frame could cause garbage; okay but for performance use temp vectors global. Could keep simple; 60 fps fine. But TypeScript okay.

Need update rocket position before camera. Use `const last = trail[trail.length-1];` if paused and no trail, use base. In animation:
```
const lastPoint = rocketSim.trail.length ? rocketSim.trail[rocketSim.trail.length-1] : {x:0,y:PAD_SURFACE_Y,z:0};
rocketGroup.position.set(lastPoint.x, lastPoint.y, lastPoint.z);
rocketGroup.rotation.z = -st.pitch; // tilt
```
But after `step`, trail last y = alt+PAD_SURFACE_Y. state alt computed same. Good.
If `state().alt` and last y maybe current.
Need if no trail due to paused at t=0, base. Good.

Need update line geometry:
```
const maxTrailPoints = 10000;
const trailPositions = new Float32Array(maxTrailPoints*3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions,3));
trailGeo.setDrawRange(0,0);
const trailMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.55, depthWrite:false});
const trailLine = new THREE.Line(trailGeo, trailMat); scene.add(trailLine);
```
But trail may be >10000; fill last or all? Use up to max. We can fill min. But if we fill first max and later trail grows beyond, line stops. Fine. Use last? Better fill all if <= max; if more, use last max? The trail should be visible from start to current, but long. Could cap 12000. With speed 30, flight maybe 60s -> 3600 points; okay. max 12000. Use:
```
const n = Math.min(rocketSim.trail.length, maxTrailPoints);
for (let i=0;i<n;i++) { const p=trail[i]; ...}
trailGeo.setDrawRange(0,n);
trailAttr.needsUpdate = true;
trailGeo.computeBoundingSphere? no needed? For dynamic geometry, bounding sphere may be stale and frustum culling could hide if beyond. `trailLine.frustumCulled = false;` Good.
```
Need if trail length > max, use first max; maybe rocket later trail line not including current, but okay. Could use last max? To be behind rocket, use last max? However starting point not important. Use all? If length > max, we can use last max to show recent contrail. But then start at old; okay. Do:
```
const start = Math.max(0, trail.length - maxTrailPoints);
const count = trail.length - start;
...
```
Need line from trail points. Good. But if paused, line updates same.

Trail visual material opacity maybe. At low altitude, white visible; at high, okay. "white contrail". Use opacity 0.5 line. Maybe add additional thicker line? LineBasic lineWidth ignored on most platforms. Could use points along trail? Use small Points with white? Hmm. A single line is thin, maybe not visible enough. Use trail as `THREE.Line` and also a Points object along trail with size 2.5, opacity 0.35? But no external. Could make a `Line` with width 1 only. To make visible, use a transparent tube? Too heavy. Maybe create two lines? Use `LineBasicMaterial` color white opacity 0.6. Fine.

Could add contrail puffs: use sprite points along trail every few? But trail line enough.

Need smoke at pad and trail. Maybe add a separate `contrailPoints` maybe.

Need flame particles? We can make a core with additive material. Need no external textures. Could use ShaderMaterial for plume gradient. Simpler layered cylinders with MeshBasicMaterial transparent. PBR? flame not PBR. Use:
```
const outerPlumeMat = new THREE.MeshBasicMaterial({ color:0xff7a1a, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
```
MeshBasic no lighting. Good.
Inner: color white. Need "blinding white-yellow core fading to orange": outer orange, inner white/yellow. Also a small sphere at nozzle with emissive? Use MeshBasic white. Bloom.

Need mach diamonds: 5 small spheres with MeshBasicMaterial color 0xffffaa, transparent? Use additive. Or create group of 8 small "diamond" shapes, e.g. `OctahedronGeometry(0.6,0)`. Position along local y negative. Update flicker. They will rotate with plume. Good.
Need exhaust light flicker `flicker = 0.8 + 0.2*Math.sin(elapsed*23) + 0.1*Math.sin(elapsed*37)`; intensity. If burn active. `exhaustLight.color` orange. Use `exhaustLight.intensity = 130 * flicker * (0.4 + Math.min(1, alt/10000?))` maybe. At liftoff brightest. Actually light illuminates pad strongly; at high, no pad. Keep.
Need light should also illuminate rocket; point at base close.

Need plume update:
Set each mesh scale? If we scale group:
- Need length grows and width grows. `plumeGroup.scale.set(widthScale, lengthScale, widthScale)`. If all meshes positions along y scale too. Good. But `plumeGroup.position` at base; scaling y stretches downward. Use group scale. `plumeGroup.scale.set(widthScale, lengthScale, widthScale)`. Need if rocket rotates, okay.
- `plumeGroup.visible = t < burnTime` and maybe t >=? At t<burn. If pause after burn, hide.
- `widthScale = 1 + Math.min(st.alt / 20000, 6)`; lengthScale = 1 + Math.min(st.alt / 12000, 10)? At 100km -> width 6, length 9.3. Outer plume base length 30 ->280m. That may be too long but at high thin air, okay. At low alt 0 ->1. At 1km width 1.05, length 1.08. Good.
- But if thrust reduced at end, maybe still. Hide after burn.
- Mach diamonds scale? Group scale. Positions in local y; width gets large. Fine.

Need smoke sprites have material color maybe white. Need no shadows.

Need maybe add launch pad reflection? no.

Need update overlay:
```
function formatTime(t:number) { const total = Math.max(0,t); const mins = Math.floor(total/60); const secs = Math.floor(total%60); return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`; }
```
Need seconds with decimals? Show T+ 00:00.0 maybe. Use two decimals? Mission data. Use `T+ ${formatTime(t)}` and `Alt ${(alt/1000).toFixed(2)} km` `Vel ${Math.round(st.speed)} m/s` and speed `x${state.speed}`. `acc` maybe not in overlay. Could include.
Need state speed maybe 10; format `x10`. If chosen 1. Use `const speedText = st.speed === 1 ? 'x1' : `x${st.speed}``. Good.
Potential speed numeric may be 10 after t. Use template.

Need buttons: create div bottom? style:
```
const controls = document.createElement('div');
controls.style.cssText = 'position:fixed;right:12px;bottom:12px;display:flex;gap:6px;...';
const labels = [['x1',1],['x10',10],['x30',30]];
labels.forEach(([label,value]) => { const btn=...; btn.onclick=()=>setSpeed(value); controls.appendChild(btn); });
document.body.appendChild(controls);
```
Need pointer events. Buttons clickable. Overlay top-left. Add reset button? Could add reset button with R? Not required. Maybe do. But prompt only three buttons; extra okay? Keep three speed buttons. Add small pause indicator maybe.

Keyboard handler:
```
window.addEventListener('keydown',(e)=>{
 if (e.key==='1') setSpeed(1);
 else if (e.key==='2') setSpeed(10);
 else if (e.key==='3') setSpeed(30);
 else if (e.key==='p'||e.key==='P') rocket.paused = !rocket.paused;
 else if (e.key==='r'||e.key==='R') rocket.reset();
});
```
Need `rocket` defined before. Fine.

Need `setSpeed`:
```
let chosenSpeed: number | null = null;
function setSpeed(v:number) { chosenSpeed = v; }
```
Inside closure. But UI uses. Need `rocketSim.state()` uses chosenSpeed. Good.

Need ensure window.__rocket type:
```
interface RocketState { t: number; alt: number; vel: number; acc: number; pitch: number; speed: number; }
interface RocketSim {
 reset: () => void;
 step: (dt: number) => void;
 state: () => RocketState;
 trail: { x:number; y:number; z:number }[];
 paused: boolean;
}
```
Set (window as any).__rocket = rocket.

Potential issue reset "trail emptied (keep same array object)" – yes `trail.length=0`.

Need maybe expose `__ready` only after first render. composer.render. In animate first line maybe composer.render; set. Good.

Need composer render uses camera. If shadows? okay.

Need add `renderer.domElement` only after body. The page has no other HTML; we append canvas and overlays. fine.

Need `document.body.style.background='#000'`, overflow.

Now let's write code carefully. Need single ts block. Could be ~700 lines. Ensure no syntax errors.

Let's reason each helper.

Helper `makeCanvasTexture`:
```
function makeCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('2D canvas context unavailable');
 draw(ctx);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.wrapS = THREE.RepeatWrapping;
 texture.wrapT = THREE.RepeatWrapping;
 texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
 return texture;
}
```
Renderer is defined before. Good. For body texture, wrap maybe not repeat? It will repeat? If wrapS repeat and uv wraps 0..1, not repeat, just wraps edge. okay. We might set bodyTex.repeat.set(1,1). For ground, repeat set later.

Ground texture draw:
```
const tex = makeCanvasTexture(1024,1024, ctx => {
 ctx.fillStyle='#365a2c'; fillRect...
 for (let i=0;i<900;i++){ ... fillStyle = rand green/brown; beginPath ellipse... }
 // add darker mottles, light patches
});
tex.repeat.set(5,5);
```
Need deterministic random? Use Math.random.

Concrete:
```
const tex = makeCanvasTexture(512,512, ctx=>{
 fill #9a958b; noise tiny dots; cracks lines; 
});
tex.repeat.set(3,3);
```
Need `texture.wrapS` etc in helper.

Body texture:
```
const bodyTexture = makeCanvasTexture(512,2048, ctx => {
 fill '#f4f3ee';
 // subtle vertical gradient? 
 const grad = ctx.createLinearGradient(0,0,512,0); ...
 // panel seams lines vertical at x...
 // dark band at bottom? not.
 // flag around y=1100...
 ctx.fillStyle='#1f2a44'; fillRect(180, 930, 90, 55);
 // red stripes horizontal etc.
 ctx.fillStyle='#c33b3b'; for i... fillRect...
 // white stripes? maybe.
 // stars as white dots.
 // lettering
 ctx.fillStyle='#222'; ctx.font='bold 36px Arial, sans-serif'; ctx.fillText('FALCON', ...)
 // vertical? 
});
```
Could text look weird. fine.
Need wrap map no repeat. `bodyTexture.wrapS = THREE.RepeatWrapping` maybe.

Smoke texture:
```
function makeSmokeTexture(): THREE.CanvasTexture {
 const canvas=256...
 const ctx = ...
 const g = ctx.createRadialGradient(128,128,10,128,128,128);
 g.addColorStop(0, 'rgba(255,255,255,0.95)');
 g.addColorStop(0.35,'rgba(255,255,255,0.6)');
 g.addColorStop(0.75,'rgba(255,255,255,0.12)');
 g.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
 // add some noise lobes
 for (...) { const rg = ctx.createRadialGradient(...); ... ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(...); ctx.fill(); }
 return new THREE.CanvasTexture(canvas)
}
```
Need set colorSpace maybe not. For alpha white. `tex.colorSpace = THREE.SRGBColorSpace`? For sprite, yes. Use `makeCanvasTexture` helper? It expects opaque draw and repeat; can use then set wrap clamp. But smoke helper simpler. `const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS=THREE.ClampToEdgeWrapping; ...`. Need anisotropy. Good.
Could reuse `makeCanvasTexture` and set wrap clamp, no repeat. It already sets wrap repeat. We'll set `smokeTex.wrapS = ClampToEdgeWrapping`. Fine.

Need `SpriteMaterial` map uses alpha. In Three, CanvasTexture default premultiplyAlpha? okay.

Need build rocket body. Use `bodyTexture` map. Need castShadow/receive.

Let's code rocket:
```
const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, PAD_SURFACE_Y, 0);
scene.add(rocketGroup);

const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTexture, roughness:0.42, metalness:0.03, color:0xffffff });
const body = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,49,40,1,false), bodyMat);
body.position.y = 8 + 49/2 = 32.5? Wait if height 49 from 8 to57, center 32.5? (8+57)/2=32.5. yes.
body.castShadow = true; body.receiveShadow = true; rocketGroup.add(body);
```
Engine section:
```
const metalDark = new THREE.MeshStandardMaterial({ color:0x2b2b2e, roughness:0.5, metalness:0.55 });
const engine = new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,5,32,1), metalDark); engine.position.y=5.5? from 3 to8 center 5.5. 
```
Need body bottom at 8, engine top at8. fine.
- skirt / base ring at y=3.2 maybe.
- interstage from 51 to57: dark/white? "visible interstage and a darker band". Use dark grey from 51 to57; body may overlap. Create `interstage` radius 1.87 height 6 center 54; material dark. Since body 8..57, interstage covers top section; okay.
- upper fairing from 57 to64 white cylinder radius 1.85 height 7 center 60.5. But interstage covers until57. good.
- nose cone from 64 to70: cone radius 1.85 height6 center 67. ConeGeometry uses radius bottom at -height/2, tip at +height/2; base at 64, tip 70. good.
- engine nozzles: 9 cylinders. Each `CylinderGeometry(0.3,0.55,2.2,12,1,true)` and `MeshStandardMaterial({color:0x555555,metalness:0.8,roughness:0.3,side:THREE.DoubleSide})`. positions radius 0.95 around center, y = 1.1? top at 2.2, bottom 0.0? `height 2.2 center y=1.1` bottom 0, top 2.2. engine section bottom at3, nozzles top should attach at3. Set center y=1.9? top=3.0 bottom=0.8. Need bottom near 0.4. Use height 2.4 center y=1.4 => bottom 0.2 top2.6; gap to engine bottom y3. Could add. Fine. The nozzle bottom at 0.2, rocket base at 0. Maybe okay.
- Add hold down ring? no.

Need `bodyTexture` on body cylinder includes white; engine dark. good.

Need "markings flag lettering drawn on canvas texture" body map. We can add a small separate flag decal? not needed.

Need `plumeGroup`:
```
const plumeGroup = new THREE.Group();
plumeGroup.position.set(0, 0.6, 0);
rocketGroup.add(plumeGroup);

const outerMat = new THREE.MeshBasicMaterial({ color:0xff7b20, transparent:true, opacity:0.38, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.35, 34, 32, 1, true), outerMat);
outer.position.y = -17; plumeGroup.add(outer);
```
Wait cylinder with radiusTop=1.7 at top y=+17? Cylinder centered, y=+h/2 top. We position center y=-17, top at 0 (near nozzle), bottom at -34 radius 0.35. Good. The geometry radiusTop 1.7 at local top? In CylinderGeometry(radiusTop, radiusBottom, height), top is +y after center; if position -17, top y=0. Good. Add inner:
```
const innerMat = MeshBasicMaterial({color:0xfff2b0, transparent:true, opacity:0.9, additive, depthWrite:false, side:double});
inner = CylinderGeometry(1.2,0.12,20,24,1,true); inner.position.y=-10; 
```
Core:
```
const coreMat = MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.95, additive});
core = CylinderGeometry(0.8,0.05,10,16,1,true); core.position.y=-5;
```
Maybe add small nozzle glow sphere at y=0 with scale 1.0.

Mach diamonds:
```
const diamondMat = new MeshBasicMaterial({ color:0xfff7d0, transparent:true, opacity:0.85, blending:AdditiveBlending, depthWrite:false});
const diamonds: THREE.Mesh[] = [];
for (let i=0;i<7;i++){ const d=new THREE.Mesh(new THREE.OctahedronGeometry(0.4 - i*0.02,0), diamondMat); d.position.set(0, -2.5-i*2.8, 0); d.scale.set(1.6,0.6,1.6); plumeGroup.add(d); diamonds.push(d); }
```
Need material shared; opacity static. Flicker can scale diamonds.

Need outer/inner maybe no `castShadow`.

Exhaust light:
```
const exhaustLight = new THREE.PointLight(0xffa64a, 150, 180, 2);
exhaustLight.position.set(0, 1.5, 0);
rocketGroup.add(exhaustLight);
```
Need with point light intensity and decay 2; at 100m intensity 150/10000? maybe dim. At pad near 20m okay. Use 2000? In physically correct, point intensity candela; at distance 10m, illuminance 2000/100=20; okay. Let's use 800 maybe. But Three r155 with physicallyCorrectLights always. Directional intensity 3. Point 800 might be bright. Flicker. We'll see not testing. Set 300? Use `new THREE.PointLight(0xffa95c, 400, 200, 2)`. At distance 10, 400/100=4; bright. Good.
`exhaustLight.castShadow = false`.

Need update plume visible:
```
const burn = st.t < BURN_TIME;
plumeGroup.visible = burn;
if (burn) { const altFactor = Math.min(st.alt/9000, 8); ...}
```
But `st.t` simulation time. If t=200 exactly, maybe no thrust. Use `< BURN_TIME`. At liftoff yes.
`plumeGroup.scale.set(widthScale, lengthScale, widthScale);` Scaling group's y changes position of light? Light not in plumeGroup. fine.
`plumeGroup.position.set(0,0.5,0)` constant. Because rocketGroup rotates; okay.
`diamonds` maybe scale flicker? Group scale handles.

Need maybe set outer opacity lower at high alt? It should visible. okay.

Need camera and rocket orientation. At high altitude, rocket body rotates with pitch; but camera target center along axis. Good.

Need `rocketGroup.position` after step. We need update based on trail last. But `trail` one point per step call; after `step()` called with speed*dt. Good.
If `dt` large (sim speed 30 * 1/30 =1), substeps ~50; trail point after whole dt. okay.

Need trail line geometry update maybe after rocket position. Good.

Need add trailLine to scene before.

Need overlay. Need `speed` state maybe chosen; overlay updates.

Potential issue `state().speed` called inside animate before step? We call step then state. In render loop:
```
if (!rocket.paused) {
  const speed = rocket.state().speed;
  rocket.step(frameDelta * speed);
}
```
At t=0, speed=1. Good. If t<10 and chosen null, speed=1; once t crosses 10, next frame speed=10, but if frame step overshoots? It uses speed at current t. Good.

Need `frameDelta = Math.min(delta,1/30)`. If delta huge due tab switch, cap. Good. Playback speed. Motion uses delta.

Need clock gets delta. If reset, clock doesn't reset; elapsed continues. Fine. Visual flicker continues. Smoke uses rocket.t; reset hides.

Need `window.addEventListener('resize', onResize);`
```
function onResize(): void {
 const w=window.innerWidth; const h=window.innerHeight;
 camera.aspect=w/h; camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
 renderer.setSize(w,h);
 composer.setPixelRatio(Math.min(window.devicePixelRatio,2));
 composer.setSize(w,h);
}
```
Call initial? renderer initially sized; composer created after. Need create composer after renderer and camera. Then call `onResize()`? Could call to set composer. But composer created with size initial. We'll set. Actually:
```
const composer = new EffectComposer(renderer);
composer.setPixelRatio(...); composer.setSize(...);
```
Need `bloomPass.resolution` maybe set via composer. UnrealBloomPass resolution initial. On resize composer handles.
Need maybe renderer.setSize before composer. Good.

Need `renderer.setAnimationLoop(animate);`

Need `renderer.toneMapping = THREE.ACESFilmicToneMapping;` yes.

Need light intensities. Three new versions no `physicallyCorrectLights` property? Not needed.

Need shadows from sun. `sun.castShadow = true;` Need `sun.target` included. Good.

Need ocean plane and Earth shader. Let's formulate shader strings.

Earth vertex:
```
const earthVert = `
 varying vec3 vWorld;
 varying vec3 vNormalW;
 void main() {
   vec4 wp = modelMatrix * vec4(position, 1.0);
   vWorld = wp.xyz;
   vNormalW = normalize(mat3(modelMatrix) * normal);
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 }
`;
```
Normal matrix should be `mat3(modelMatrix)` but for sphere uniform scale, okay. `normal` attribute. Good.
Fragment:
```
varying vec3 vWorld;
varying vec3 vNormalW;
uniform vec3 uSunDir;
void main() {
  float coast = smoothstep(-280.0, -220.0, vWorld.z); // land 0 ocean, 1 land
  vec3 ocean = vec3(0.055, 0.16, 0.25);
  vec3 land = vec3(0.12, 0.25, 0.10);
  float mottled = 0.5 + 0.5 * sin(vWorld.x * 0.03 + vWorld.z * 0.025);
  land *= 0.75 + 0.25*mottled;
  vec3 base = mix(ocean, land, coast);
  float light = 0.55 + 0.45 * max(0.0, dot(normalize(vNormalW), uSunDir));
  gl_FragColor = vec4(base * light, 1.0);
}
```
But land/ocean based on world z across entire sphere; maybe okay. At high altitude, coastline at z=-220 but earth huge. However local land plane extends to -220; distant earth shows land for z>-220, ocean z<-220. So coastline line. Good.

Need add atmosphere rim near Earth's horizon? Could add in sky shader with altitude. Good.

Maybe Earth shader should be fog-like at distance? no.

Need sky shader careful: `vDir = normalize(wp.xyz)` but sky sphere centered origin. If camera at altitude 100km and sky dome radius 400000, direction from origin not camera. Shader uses direction from world origin, not view direction. For a dome at origin, a fragment's normalized position is similar to view direction from camera if camera near origin, but at high camera, direction should be from camera. But sky dome radius 400k, camera offset 100k: direction from camera to sky fragment differs. However visual okay. Could compute `vDir = normalize(wp.xyz - cameraPosition)` using `cameraPosition` built-in? In ShaderMaterial, `cameraPosition` uniform available in shader? Three injects `uniform vec3 cameraPosition;` and `cameraPosition` in vertex shader if using shader? For custom ShaderMaterial, built-in uniforms include cameraPosition? I think Three prepends many uniforms? It includes `uniform vec3 cameraPosition;` in vertex shader? Actually ShaderMaterial provides built-in `cameraPosition` in vertex? In WebGLProgram, built-in uniforms include `modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `cameraPosition`? Yes for ShaderMaterial. Use `vDir = normalize(wp.xyz - cameraPosition);` in vertex. But cameraPosition available in vertex shader? It is in `common`? In Three, ShaderMaterial has built-in uniforms `cameraPosition` declared automatically in vertex? I think yes. Many examples use `cameraPosition` in vertex shader. To be safe, use uniform `uCamPos` and update each frame. But no need. Simpler use direction from origin because sky dome large. At high, stars direction from camera? Stars fixed, okay. Sky pattern may shift but fine.

But to get correct black at high, direction vertical in world. okay.

Need horizon haze at low. At high, black sky with blue rim near horizon. Good.

Need `skyMat.uniforms.uAltKm.value` update. `skyUniforms` object.

Need `sunDir` for sky. Use normalized sun.position? sun.position (80,120,60) relative origin; normalized. In sky shader dot with vDir from origin. At high, sun glow. Fine.

Potential issue sky dome radius 400000, far camera > maybe 100km; if alt rockets goes >400km, camera outside sky dome? Then sky dome would be inside and backside not cover. After burn, altitude could exceed 400km if simulation continues. Need sky dome radius much larger, e.g. 5,000,000 or 50,000,000. Far plane must be >. Use far 10,000,000. Earth radius 6.37e6. Sky dome radius maybe 20,000,000. Stars radius 10,000,000. Far 25,000,000. But at 100km, sky dome huge; stars visible okay. Use `skyGeo = new SphereGeometry(20000000, 32,16)` and stars radius 12000000. Camera far 30000000. Earth sphere radius 6.37e6, surface. Good. But stars points at 12e6; sky dome behind. Far 30e6. At low camera, stars not visible opacity 0. Good.
Need point size with sizeAttenuation false; good.
Could sky dome with radius 20e6; at alt 100km, direction good. At high alt >1000km, camera still inside (20e6). Good.
Far = 30000000. near 0.2. For shadow far. Good.
Earth sphere radius 6.37e6, sky dome radius 20e6. At high altitude, Earth might be large. Good.
Need stars radius 10e6, inside sky. Points at 10e6, visible over sky due depth. Good.
At camera at 100km, distance to stars ~10e6; sizeAttenuation false. Good.
At camera far 30e6. good.
Need `scene.fog` with density maybe affects sky? no; stars `fog:false`. Earth shader no fog. Local objects fog.

Need with far 30e6, depth precision issues near objects? near 0.1, far 30e6 => depth precision poor around 0-100m. Could use logarithmic depth? Not necessary. But shadows and local objects may z-fight. Better use `camera.near = 0.5`, far=30e6 still. Could use `renderer` logarithmicDepthBuffer? For huge scenes maybe. `new WebGLRenderer({ antialias:true, logarithmicDepthBuffer:true })` may help. But with EffectComposer? okay. Use. However logarithmic depth doesn't work with some? fine.
Need near 0.5; local small objects. Good.

But Earth sphere radius 6.37e6 and camera far 30e6. Fine.

Need sky dome radius 20e6. It will be behind stars? Sky material depthWrite false. Stars depthWrite false. Draw order: sky renderOrder = -100 maybe; stars renderOrder = -50; earth? The sky mesh could be rendered after earth due transparent? ShaderMaterial not transparent, depthWrite false, depthTest true. Depth test will compare. Good. Set sky.renderOrder = -10 maybe; Earth opaque drawn before? Render order sorted by material? For opaque, renderOrder. We'll set sky.renderOrder=-10; stars.renderOrder=-5, but stars transparent maybe. Fine.

Need Earth sphere shadow? not. set receiveShadow false.

Need local ground with huge camera far. okay.

Need smoke sprite size maybe world. At high camera far, sprites visible if not culled? Frustum culling maybe for sprites uses position. Fine

I have thought about this long enough; time to give my answer.
