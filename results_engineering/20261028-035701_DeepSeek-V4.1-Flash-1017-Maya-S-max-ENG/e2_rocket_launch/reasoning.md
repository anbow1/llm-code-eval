We need to produce a single TypeScript file implementing all this. Need to be careful about TypeScript strict compilation and Three.js addons imports. Must only reply with code block.

Key design:

- Scene setup, renderer, camera, resize, animation loop.
- Sky: use Sky addon? The Sky addon requires sun position; driving sky from altitude means we might want custom shader. Simpler: use own gradient sky dome shader with uniforms for altitude and sun direction, plus stars as Points visible above 70 km. But requirement mentions atmospheric scattering e.g. Sky addon or own shader. Could use Sky addon for ground, and blend to black with altitude via a full-screen? Hmm, easier: custom sky shader on a large sphere with BackSide, shader mixing horizon haze and zenith blue based on sun; mix to black based on rocket altitude. Add stars (Points) with opacity based on altitude. Also fog color changes with altitude maybe. Use fog exp2 for aerial perspective at ground, reduce as altitude rises.

- Rocket model: body 70 m tall, 3.7 m diameter. Group at origin = base? Let's define rocket group at (0,0,0) ground, with model geometry positioned from y=0 up. Rocket body cylinder height ~ 55 m from y=6 (engine section) etc. Build details: engine section (dark), 9 nozzles, body white with markings canvas texture, interstage darker band, fairing nose cone, grid fins maybe.

- Pad: concrete pad with flame trench: concrete box with slot cut? Could build pad as 2 slabs either side of trench + ramp. Lattice tower: thin boxes/cylinders; make lattice via segments. Lightning masts: tall lattice masts 100m.

- Ground: large plane with procedural canvas texture green scrub. Add ocean plane behind, horizon. Roads: dark strips, low buildings boxes.

- Clouds/smoke: particle sprites via THREE.Points with custom shader sprite (soft circle) or use sprites with canvas-generated radial gradient texture (procedural, allowed: canvas textures). Thousands of particles for steam. Use shader-based points with size attenuation and soft alpha. Flicker light: PointLight near plume with intensity noise.

- Plume: cone geometry with additive shader or mesh with gradient; Mach diamonds using small cones/lights. Flame grows with altitude.

- Sky driven by altitude: uniforms.

- Contrail: line from trail points, white line with vertex alpha; also perhaps particle puffs. Requirement: visible white contrail drawn from trail points, stays in sky and drifts. Need use trail array and a BufferGeometry line updated. Keep trail points as given. To "stays in the sky and drifts slowly": could keep particles at trail positions with drift. But simplest line updated; maybe add drifting thin smoke puffs at intervals. Let's implement a Line with additive/transparent white and also contrail particle puffs that spawn at rocket position periodically and drift with wind, staying. Use Points with fading? "stays in the sky and drifts slowly." Could keep puffs persistent with slow drift; cap count.

- Physics model:
  state: t, alt, vel (vertical? state vel (m/s)), acc net vertical, pitch. Need horizontal position for world trail {x,y,z}. Let's define simulation variables: alt, vy (vertical velocity), vx (horizontal velocity), x (horizontal position), t. Pitch angle from vertical, never decreases. Pitch model: 0 until 10s, then grows to ~0.5 rad at 150s. Use smooth function e.g. pitch = 0.5 * smoothstep-ish over (t-10)/140, and never decrease. Maybe physical gravity turn: pitch based on time formula. Requirement: "Pitch = angle of thrust from vertical; Pitch is 0 at liftoff; after 10 s it starts to grow (a gravity turn), reaching about 0.5 rad at 150 s, and it never decreases." Implement pitch = max(currentPitch, 0.5 * clamp01((t-10)/140) with ease). At 150 = 0.5. Beyond: continue slowly growing maybe to ~1.2 rad, never decrease. Use pitch = 0.5 * ((t-10)/140) smooth; after 150, add slow growth after? Could keep ~0.5 -> grows towards 1.0 by 300 s? But requirement says reaching about 0.5 at 150 and never decreases. Let's do: for t<=10: 0; for t>10: 0.5 * (1 - exp(-(t-10)/60))? At 150: 0.5*(1-exp(-140/60)) = 0.5*0.903=0.451. Hmm "about 0.5". Use smoothstep: u = clamp((t-10)/140); p = 0.5 * (u*u*(3-2u)); at 150 exactly 0.5. After 150: p = 0.5 + 0.25*clamp((t-150)/300) maybe not decrease. But then gravity turn continues. Fine.

  Thrust: T = 1.3*m0*g0 = 1.3*550000*9.81 ≈ 7,013,? compute 550000*9.81=5,395,500; *1.3=7,014,150 N. Limited to 3*m*g0 throttle, zero after burn. During burn thrust is T or limited: 3*m*g0 is huge (at m0 = 16.2e6 N), so no limit initially; near end m=220000 => 3*m*g0=6.47e6, so T limited after m < T/(3g0) = 7,014,150/(29.43) = 238,300 kg. So mass between 238,300 and 220,000 => limited. Good. Mass declines linearly during burn: m = m0 + (dry-m0)*(t/200) for t<=200. After burn m=dry.

  Equations: vertical acceleration = (T_effective * cos(pitch))/m - g(h); horizontal acceleration = (T_effective * sin(pitch))/m. There's also maybe no drag. vel vertical, horizontal. Integrate fixed substep ≤0.02 s. Use semi-implicit Euler: acc computed, v += a*dt, pos += v*dt, clamp alt>=0 (pad), if clamped, vy = max(vy,0)? "rocket cannot go below the pad". At t=0 thrust-to-weight 1.3, so accelerates upward immediately. Fine.

  Need update trail once per step() call, not per substep. trail is array of {x,y,z} world points of the rocket, one per step() call. Keep same array object on reset: rocket.trail.length = 0. Use push.

  paused boolean.

  Position in world: rocket "rocket position" for trail: world points of the rocket, likely base or center? Use rocket center maybe; trail points in world 3D. Use x horizontal offset along x, y alt plus maybe base, z = 0. Let rocket base at (x, alt, z). But trail for contrail should start near rocket body; use y = alt + 30 maybe? World points of rocket; use rocket group position plus some up? Keep trail at rocket position base plus 35? The rocket group position: we'll place rocket group at (sim.x, alt, 0), model base at y=0. Then trail points perhaps (x, alt, 0) or center. Requirement "world points of the rocket" ambiguous; use (x, alt, 0). Contrail line from trail points.

  For rendering, rocket group updated each frame from sim state.

- Camera: low camera near pad looking up at liftoff then long-lens shot tracking upward. Implement camera mode based on altitude/time: ground camera positions near pad, tracks rocket with lookAt; then long-lens with narrower FOV (e.g. 20°) and tracking. Smooth transitions. Need update camera each frame. Camera near pad at (30, 8, 60) looking at rocket. As altitude rises > some threshold, long lens camera at ground (e.g. 400 m away) looking at rocket and FOV 18°. Maybe altitude > 300 m switch. Use smooth blend. Also when high and far, camera tracks with long lens. Ensure lookAt works.

- Sky altitude: use rocket altitude. Sky shader: vertical gradient from horizon haze pale to blue to black; stars opacity increases 70-100 km; sun disk. Fog color changes from hazy pale blue near ground to black at altitude; scene.fog = FogExp2 with density decreasing.

- Need TypeScript strict zero errors. Careful types: define interfaces. For any window assignments, use `(window as any)`. Import THREE and addons. Which addons? UnrealBloomPass, EffectComposer, RenderPass maybe OutputPass? If using composer, renderer tone mapping ACES. Need ensure first frame rendered then __ready. With composer, still render. Import addons:
  import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
  import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
  These have types in three package? Typically yes in @types/three with addons. tsc strict likely okay if module resolution configured. Use only known addons. Could avoid Sky addon to control. Use OutputPass.

  Potential issue UnrealBloomPass constructor types in current three versions. Use `new UnrealBloomPass(new THREE.Vector2(w,h), 1.0, 0.8, 0.9)`. OutputPass exists. Alternatively, to avoid addon import TS issues, use just EffectComposer, RenderPass, UnrealBloomPass. But output color space: renderer.outputColorSpace = SRGBColorSpace; composer with render target? If using EffectComposer, tone mapping may be applied by renderer in RenderPass then bloom on tone-mapped colors; OutputPass does tone mapping and color space conversion. If renderer.toneMapping = ACESFilmicToneMapping, with EffectComposer, need OutputPass. Typically set renderer.toneMapping = NoToneMapping and OutputPass does tone mapping if renderer.toneMapping? Hmm. We can use composer with RenderPass, UnrealBloomPass, OutputPass. Renderer toneMapping = ACESFilmicToneMapping; OutputPass applies tone mapping? In three's OutputPass, it does tone mapping using renderer's toneMapping; RenderPass renders with tone mapping disabled? Actually WebGLRenderer toneMapping is applied in materials shaders, unless rendering to a render target? It applies always. OutputPass then maybe double tone-map. To avoid complexity, can use renderer.toneMapping = ACESFilmicToneMapping and composer render, plus OutputPass? Common pattern:
renderer.toneMapping = THREE.ACESFilmicToneMapping;
composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
bloomPass ...
composer.addPass(new OutputPass());
This is standard; OutputPass handles tone mapping/color space, and materials don't apply tone mapping when rendering into composer? Three does apply tone mapping in shaders based on renderer.toneMapping; but OutputPass commonly used. Could set renderer.toneMapping = ACESFilmicToneMapping and output pass. It's okay visually maybe. Alternatively use renderer.setRenderTarget internal? Hmm.

  We can just use renderer.render normally and also bloom? Requirement bloom for flame. Use composer.

  Need set renderer.shadowMap.enabled = true; PCFSoftShadowMap. DirectionalLight sun castShadow with large shadow map, shadow camera bounds around pad. PointLight flicker castShadow maybe expensive; maybe no shadows from flame. Sun shadows.

- Procedural textures: create canvas texture functions. Need no network assets. Canvas texture for concrete, ground, vegetation maybe ground canvas with noise; markings flag and lettering. TypeScript DOM types available. Use document.createElement('canvas'), getContext('2d')!, fill, noise. For texture: new THREE.CanvasTexture(canvas); set colorSpace = SRGBColorSpace; wrapS/T RepeatWrapping. Flag: draw American flag simplified + "FALCON 9" text? Need lettering. Create a rocket texture canvas maybe wrap around cylinder with white background and draw flag, "FALCON 9", black bands. Or separate decal plane. Simpler: CanvasTexture applied to body material map, repeated? Cylinder UV wraps; draw a 1024x1024 canvas with white, vertical? Body material as white with map, draw flag near top, text. Cylinder UV wraps whole texture; text may look odd but okay. Better add separate planes slightly outside body with flag and text using canvas textures, but transparency. Could do a decal plane curved? Use PlaneGeometry attached to body, facing -Z, with mesh offset radius+0.01. Camera mostly from side. For flag and lettering visible, add plane with transparent canvas texture containing flag and "FALCON 9" text. Need alpha map? Canvas texture with transparent background; material transparent. Map on PlaneGeometry (8m x 6m) offset 1.87 m in z (or x). Since body cylinder vertical, plane at (0, 38, 1.88) facing +Z. Camera at +Z sees. Use two: flag plane and text plane. Also draw markings directly maybe. Use canvas texture with flag and lettering.

  Ground texture: canvas 1024, green scrub noise with speckles; repeat 40x40 on plane. Ocean: large plane blue with slight shader? Use MeshStandardMaterial with color and roughness, maybe a noise map. Ocean horizon behind launch pad: lay a large plane at y=-0.5 far in negative z? The camera looks from south; ocean is east of pad. Could put a large water plane to the east (x positive? choose coast at z=-800?). Scene coordinate: rocket at origin, camera at (30,8,70) looking toward origin -> background is -Z (north). Place ocean far behind: z=-6000, from x -20000..20000, big plane. But terrain extends; make land plane 4000x4000, ocean plane 40000x40000 at y=-0.4 starting beyond terrain? If ocean plane covers under land but land is at y=0 opaque so okay. Place ocean plane huge at y = -0.6 and terrain plane 5000x5000 at y=0; but beyond terrain, ocean visible at horizon behind -Z. Ensure terrain not covering horizon: ground plane extends 3000 m; camera low, horizon at ~few km, ocean beyond. Add coastline strip maybe.

  Fog exp2 density ground around 0.00018, color pale blue (0xb8cfe0). At altitude change fog color to black and density near 0. For distant pale/bluer.

- Vegetation: many scattered low bushes/trees as InstancedMesh cones/spheres dark green around, random positions; cast shadows maybe not all. Use instanced mesh with 1000 low shrubs; procedural material color. Roads: dark gray strips with markings; buildings: low boxes with gray roofs. Need not too heavy.

- Launch pad: concrete slab maybe 80x80 at y=0.2, flame trench: a slot 10x60 through center, dark interior, maybe actual geometry: two slabs separated by trench. Concret pad with trench and ramp. Need rocket on pad: rocket base at y=? Launch mount at ~8m above ground? Sim alt is altitude of rocket base relative pad? "rocket cannot go below the pad"; alt = altitude. Let alt=0 on pad top. Rocket base at y=alt. Place pad top at y=0. Maybe rocket engine base at y=2. Use sim alt + pad height? For simplicity pad top y=0; rocket group base at alt. Render rocket body bottom at y=6. Nozzles extend down to y=2. Flame below.

  Grid: concrete pad 70x70, trench cut along z from -30 to 30 under rocket; build floor slabs at y=0? If trench is open, need geometry. Could make pad top at y=0 with a dark trench below: use two slabs left/right of trench at y=-0.5 thickness 1, plus a ramp. Or use one box and a dark long box slightly above to imply trench. Requirement flame trench; visual enough: concrete pad at y=0, dark trench strip at y=0.02 (black) with side walls and ramp. Smoke rolls out both ends along z. Fine.

  Launch tower: lattice tower next to rocket, ~70m tall, steel truss. Build using cylinders/boxes between points. Use helper createLatticeColumn: for levels, place vertical beams and cross diagonals. Could use LineSegments? Better meshes with thin BoxGeometry or cylinders. Use InstancedMesh for lattice segments? Simpler functions using BoxGeometry and MeshStandardMaterial. Number of meshes manageable. Use a helper `strut(a,b,thickness,mat,group)`: create cylinder between two points via quaternion. A cylinder geometry aligned Y, position midpoint, scale etc. Need reusable geometry. Use function addStrut(group, p1, p2, radius, mat): cylinder height 1, radius, position mid, quaternion setFromUnitVectors(up, dir). The geometry unit height and scale y. Type strict. Use a shared `strutGeo = new THREE.CylinderGeometry(1,1,1,6)` and scale (r,len,r). Quaternion.

  Tower maybe on side at x=8, z=0? Rocket at origin radius 1.85; tower at x=7, z=0, 60m. Lightning masts at corners 80m high lattice.

- Rocket geometry details:
  - engine section: cylinder radius 1.9, height 8 at y=4, dark material.
  - 9 nozzles: ConeGeometry open? Use CylinderGeometry with radiusTop 0.4, radiusBottom 0.7, height 1.5, openEnded, dark metal, positioned y=2.5, in 3x3 grid around center. Maybe rocket base at y=0? Body bottom around 6; nozzles from 2 to 5; engine section y=5..10.
  - main body: cylinder radius 1.85, height 45 from y=10 to 55, white.
  - interstage/darker band at y ~49? Falcon 9 has black interstage at top near fairing. Use dark band at y=48..52.
  - fairing: cylinder from 55 to 62 radius 1.85 then cone/ogive to 70: use LatheGeometry for nose fairing profile. Lathe points create nice fairing. White.
  - grid fins near top / landing legs maybe. Add 4 grid fins as thin boxes with grid texture? Simple boxes with wire-like lines maybe.
  - markings decal.
  - Materials: white painted metal roughness 0.35 metalness 0.1; dark carbon roughness 0.6; nozzle metal metalness 1 roughness 0.3.

- Flame/plume:
  - A group attached to rocket at base, with cone/sprites. Use custom shader material additive for core and outer plume. Create cone geometry pointing downward? Rocket thrust downward, flame goes down from nozzles. At liftoff, plume goes down and splashes. In flight it trails behind. Use a Mesh with ConeGeometry radius top/bottom oriented down. Actually cylinder/cone: small radius at top (nozzle) and wider lower? Rocket exhaust expands downward. Use CylinderGeometry(radiusTop=1.6, radiusBottom=2.2, height=10, 16, 1, true) with additive shader gradient. Attach at y = -6 relative base (nozzles at y~2, so flame from y=2 down to -8). Since rocket group base at alt, flame can go below pad at liftoff; okay clipped by smoke. For ascent, update scale.y and scale.x based on altitude and throttle. Additive blending, depthWrite false.
  - Bright core: smaller cone or a Sprite with radial gradient texture additive, plus PointLight. Mach diamonds: several small glowing cones inside plume, scaling flicker; diamond shapes via octahedron geometry? Use small sphere/cone white-blue.
  - Flame light: PointLight color 0xffaa55 intensity flickers, position near nozzle, distance 200. Could cast shadows? expensive; no.
  - Add a larger sprite glow at nozzle with canvas radial texture; maybe 3 sprites.
  - Plume needs visible flickering and grows with altitude. Use shader uniform time and altitude, plus scale.

  Custom shader for plume: vertex passes UV, fragment uses uv.y gradient, noise based on sin; color mix white-yellow core to orange; alpha; additive. Need avoid strict issues: uniforms typed. Use ShaderMaterial with transparent true, blending Additive, depthWrite false, side DoubleSide.

  Alternatively use MeshBasicMaterial with map from canvas gradient; simpler. But requirement bloom; additive white is enough. Use shader to be nice.

- Smoke particles:
  Implement a particle system with custom ShaderMaterial for soft volumetric sprites. Use Points with custom attributes: position, size, alpha, seed; update via arrays per frame. Up to maybe 1500 particles. Create BufferGeometry with position, size, opacity attributes. Shader:
    attribute float size; attribute float alpha; varying float vAlpha;
    gl_PointSize = size * (300.0 / -mvPosition.z); // perspective
    fragment: vec2 uv = gl_PointCoord - .5; float d = length(uv); float soft = smoothstep(0.5,0.1,d); fragment alpha = vAlpha * soft; color varies.
  Need per-particle color? Add color attribute maybe. Use uniform color and mix? White steam with gray tint. Vary brightness via alpha. Could use a `color` attribute (vec3) and vertex color. But simpler uniform color with per-particle alpha. Large cloud looks volumetric if many overlaps. Use custom shader with soft noisy edges: add fbm-ish noise from gl_PointCoord and seed. 
    vSeed attribute float; fragment: n = sin(uv.x*... + seed) etc; alpha *= 0.7+0.3*n; radial soft.
  Particles positions update CPU per frame: spawn from flame trench ends and around rocket; velocities roll sideways then rise; expand size; alpha fades. At liftoff, lots of smoke. During ascent, contrail particles from trail spawn at intervals and drift. Could unify two systems: ground smoke and contrail points.

  Ground smoke: pool of e.g. 500 particles, continuous emission while throttle and altitude < maybe 1000m, rate high at liftoff. Spawn positions at trench ends (x ±? Actually trench along z; exits at z=±28), and around pad. Velocity horizontal outward along z plus random, upward small; then buoyancy. Life ~8-15 s, size grows from 3 to 30 m. Color white-gray. Also spawn near nozzle base at liftoff. Keep `SmokeParticle` array with active flag. Update each frame with dt. Since smoke should drift and rise. Light from flame affects standard material? Points with custom shader not lit; we can tint based on flicker by uniform. Good.

  Contrail: use separate particle system persistent: spawn at trail points every e.g. 0.4 sim seconds (or every frame limited), positions at rocket altitude, small initial radius grows 2-15m, alpha low, drift with wind (e.g. x += 0.5*dt, z -= 0.3*dt) and perhaps rise slowly. Persist for 120 s? "stays in the sky and drifts slowly." Use lifetime long e.g. 60 s and fade at end. Only spawn when alt > 50 m and throttle on. Since scene scale huge, contrail must be visible: rocket at 100 km, camera tracking; particles near it with sizes large? Points size attenuation with world-size parameter. Need support sizing in world units: gl_PointSize = size * (projection scale / -mvPosition.z). Standard formula: size * (renderHeight/2) / -mvPosition.z? We can use uniform `uPixelScale` = height/(2*tan(fov/2))? But we can approximate: gl_PointSize = size * uScale / -mvPosition.z where uScale = height * 0.5 maybe. For a 10m particle at 1km distance, pixel size = 10 * (h/2) / 1000? Actually pointsize = size * (projectionMatrix[1][1] * viewportHeight / -mvPosition.z) maybe. Pass uniform uHeight and use `size * uHeight / (-mvPosition.z) * 0.5`? We'll do `gl_PointSize = size * uScale / max(-mvPosition.z, 1.0);` with uScale = window.innerHeight / (2*tan(fov/2)). But camera fov changes; update uniform per frame maybe. Not needed perfect. Use pixel scale factor.

  For far contrail at 100 km with camera near ground, 10m particles are subpixel. But contrail from trail points is line, visible with width maybe. Requirement contrail visible; with long lens and line it appears. Ground smoke huge.

  Maybe use separate contrail line geometry plus puffs. Use line vertices from trail with a custom shader material fading by index, and additive/white. Since trail array grows, update geometry each frame. For very high altitude, line still visible as white streak. Set linewidth unsupported >1 on most platforms; use Line with 1px; at high res maybe thin. Could build a ribbon (triangle strip) along trail segments with width in world units? That's better. Build a "contrail ribbon" from trail points, with width varying by altitude, e.g. width 6m near ground, grows to 200m at 100km? Real contrail width maybe larger due expansion. But world units at distance, visible. Use BufferGeometry with positions for pairs along trail, and material MeshBasicMaterial transparent white with vertex alpha/color. Simpler use THREE.Line with vertex colors maybe enough. Since "visible white contrail", line plus puffs. But if camera long lens at 100km, line width 1px visible. Fine. Use two lines? Let's implement ribbon geometry to look better: for each consecutive trail point generate left/right offset along x (or perpendicular horizontal) with width = 2 + alt*0.004 (max 100m) maybe. Camera sees from side. Trail path x-z plane. Build positions, colors alpha via vertex color with transparent material; MeshBasicMaterial vertexColors true, transparent true, opacity 0.85, side DoubleSide, depthWrite false. Since rocket goes mostly x in one direction and z=0, ribbon in x-y plane offset along z. Use width in z. That faces camera at +z. Good. Update each frame from trail. Limit trail length? Requirement trail array keep same object; can grow until many points. Sim runs paused? Fine.

  Need trail points one per step call. Render loop calls step ~60/s, so 60 points/sec for maybe long sim. Up to thousands; fine. But step may be called externally with large dt? `step(dt)` advances simulated time by dt and pushes one trail point. User could call many. Limit? Keep array unbounded maybe. We can maybe cap at e.g. 20000 while preserving same array. But requirement "one per step() call" implies no dropping? We can push all; okay. To avoid perf, ribbon uses maybe every N. Do all.

- Physics and stepping:
  Define class? Use plain object with closures. Must expose exact API. `window.__rocket` with reset, step, state, trail, paused. Keep trail same array on reset: `sim.trail.length = 0`.
  Because TypeScript strict, type interface:
  interface RocketState { t: number; alt: number; vel: number; acc: number; pitch: number; }
  interface TrailPoint { x:number; y:number; z:number; }
  interface RocketSim { reset():void; step(dt:number):void; state():RocketState; trail: TrailPoint[]; paused:boolean; }
  internal alt, vy, vx, pitch, t, acc, x, mass. Also maybe total velocity? state vel = vertical velocity? Requirement state vel (m/s), acc (net vertical acceleration). Use vertical velocity as vel. But trajectory horizontal too. Could return total speed? Likely they expect vertical velocity. "vertical and horizontal acceleration ... state(): { t, alt (m), vel (m/s), acc (net vertical acceleration, m/s^2), pitch }" So vel might be vertical velocity. Use vertical velocity. Net vertical acceleration is thrust*cos(pitch)/m - g, excluding? yes. `acc` as net vertical acceleration.

  Integration: fixed substep at most 0.02. Need handle any dt including negative? use max(0, dt), maybe clamp huge? "any dt; use substeps inside". Use while remaining > 0 with h = min(0.02, remaining). Could be many for huge dt; okay maybe cap? No cap required. But a step with dt=1000 would 50000 substeps; okay. Use exact substep count? `const n = Math.max(1, Math.ceil(dt/0.02)); const h = dt/n;` That keeps fixed equal substeps, at most 0.02. Good. For dt=0, should still push trail per step call. Use if (dt <= 0) maybe push same; no advancement. Use substeps n = Math.max(1, ceil(dt/0.02)) when dt>0; h=dt/n. If dt=0 n=1 h=0. Update pitch formula after advancing t.

  Mass: evaluate m at substep time. Thrust: active if t < 200 and maybe t >= 0; during burn T_base = 1.3*m0*g0; limited to 3*m*g0. At t=0, m=m0 so thrust 7.014 MN, T/W 1.3. Good. Throttle limit only matters late. After 200 thrust 0.
  Pitch: computed each substep as max(prev, target(t)). At liftoff 0. For t<=10 target 0. For t>10 smoothstep to 0.5 at 150; after 150 add slow growth: maybe `0.5 + 0.35 * clamp01((t-150)/250)`? Then never decreases. But gravity turn might continue to horizontal. At 200, pitch 0.57; fine. Could make beyond 150 continue to ~1.2 by 400 to go horizontal. "reaching about 0.5 rad at 150 s, and it never decreases." No requirement beyond. Maybe slow increase to 1.0 by 400. But if burn ends at 200, pitch continues? It says pitch after 10 grows reaching 0.5 at 150 and never decreases. Could keep pitch fixed 0.5 after 150 to be safe. But then after burn, no thrust. trajectory continues ballistically with vx and vy under gravity. At 200s, alt what? Let's estimate: initial acceleration 0.3g=2.94; 10s -> 29 m/s, alt ~150m. Gravity turn pitch increases, horizontal accel. Thrust acceleration decreases? Thrust ~ 12.75 m/s² * m0/m. With mass declining, acceleration increases. At t=150, m=550000+(220000-550000)*0.75=550000-247500=302500; T limited? 3*m*g0 = 8.9e6 > 7.0e6; no; accel thrust 23.2 m/s². Vertical component cos(0.5) ~0.878 => 20.4 - g ~10.8 => 10; over 150 sec vertical velocity maybe > 1500 m/s, alt maybe 100+ km. Let's integrate rough: early 10s avg acc 2.9 -> v 29. Then as pitch grows, vertical acc increases. At t=150, vertical vel maybe 1500, alt maybe 100km. Good. At 200, maybe 300 km. Karman line. Good. Horizontal speed significant.

  Need rocket starts on pad: alt 0, vel 0. But initial acceleration positive 2.94 so lifts off immediately. "liftoff" maybe hold down for a second? Not required. Physics thrust immediately. Could include launch hold? Requirement pitch 0 at liftoff etc. Sim t=0 on pad; step begins ascent. Fine.

  Cannot go below pad: after integrating, if alt<0 set alt=0, vy = Math.max(vy, 0)? If falling and hits pad, should stop (vy=0). Use if (alt < 0) { alt=0; if (vy<0) vy=0; }.

  Position x accumulates horizontally. z=0.

  After burn, mass dry. T=0. Gravity acts.

  Also trail point should reflect rocket base. Use x and alt. Since world z 0.

  Need update rendering with simulation state. When paused, render still updates smoke etc. Smoke emission only if throttle and changes. The render loop calls step(min(delta,1/30)) not paused. Rocket state updates. We also need camera and sky each frame.

- Starting state and auto-run. `paused` initial false. Maybe at t=0 render for a moment then ascent. No requirement countdown. Fine. But launch photograph at liftoff; maybe delay 2s? If simulation starts immediately at t=0 and rocket accelerates, first frames show liftoff. Good.

- Need not include HTML. Canvas appended to body. Set body margin 0? No other HTML; set document.body.style.margin = '0'; overflow hidden. Good.

- `__ready` after first frame rendered. Use flag `readySet` and after composer render first time set true. Make sure exposed globals assigned before loop.

- Strict TS potential issues:
  - Window augmentation? Use `(window as any)`.
  - Canvas getContext returns `CanvasRenderingContext2D | null`; assert.
  - typed uniforms: `{ value: number }`; `THREE.IUniform`.
  - Attributes: BufferAttribute. Set usage.
  - Geometry.setAttribute.
  - `renderer.setAnimationLoop((time: number) => { ... })` callback signature? WebGLRenderer.setAnimationLoop(callback: XRFrameRequestCallback | null) maybe parameter time: number, frame?: XRFrame. Use `renderer.setAnimationLoop(animate); function animate(now: number)`. Should compile.
  - use clock `new THREE.Clock()`; `getDelta()`.
  - Resize: camera.aspect; composer.setSize.
  - addons import paths compile with three types. We'll assume.
  - Avoid unused variables? tsc --strict doesn't error on unused unless noUnusedLocals option; likely not. But keep clean.
  - Avoid implicit any, all params typed.
  - class fields typed.

- Add `OrbitControls`? No, camera controlled automatically. Not needed.

- Need camera aspect and renderer size.

- Build functions:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

  Maybe `OutputPass` path exists. In three r152+, yes. `UnrealBloomPass` types. Good.

  Could avoid OutputPass if worried; use renderer.toneMapping and composer with bloom only; output might be linear/sRGB okay? EffectComposer render targets default RGBAFormat; renderer outputColorSpace applies only to screen render? When rendering to target, sRGB conversion may not happen, then final pass to screen might convert? Actually UnrealBloomPass's final output uses ShaderPass CopyShader with renderToScreen, and WebGLRenderer outputColorSpace converts in material shaders? The copy shader may not use colorspace? It might. Common examples add OutputPass. Include.

- World scale: 1 unit = 1 m. The camera near pad at (35, 10, 90); rocket 70m tall. Ground 5000m, fog. Good.

  Ocean horizon behind pad: Camera looks toward -z; place ocean beyond z<-1200 maybe and around. With fog, horizon pale. Terrain plane huge 6000 x 6000 at y=0 covers up to z=-3000; ocean plane 20000 from z=-3300 onward? Use separate plane geometry 20000x20000 at position z=-12000, y=-1.2, so its near edge at z=-2000. But ground extends to -3000 overlapping. Could make terrain from z=+4000 to z=+? A plane centered at z=0 covering ±3000; ocean at (0,-0.6,-5000) size 40000x8000, near edge z=-1000, but terrain at y=0 overlays over it up to -3000, so ocean visible only beyond -3000. Horizon will show ocean if ground ends at -3000. Since ground plane is opaque, ocean beneath hidden; beyond edge visible. Fine. Add beach strip near edge? Not necessary, fog hides.

  For ocean, MeshStandardMaterial color 0x2e5d6f roughness .35 metalness .1, maybe shader normal waves via procedural? Could use simple canvas normal-ish map. But at horizon haze, okay. Add subtle waves by plane segments? not needed.

  Distant tree line, roads, buildings: place around z between -100 and -800, x ±500. Instanced shrubs. Keep rocket pad clear.

- Ground texture: create 1024x1024 canvas with base green (0x3a5a34), random speckles varying greens/browns. Set repeat 80,80. Anisotropy. Material roughness 1, metalness 0, map. Fog.

- Concrete texture: 512x512 gray noise with cracks and stains; repeat. Use on pad boxes. Need UV repeat accordingly.

- Rocket body: texture can be plain white with subtle vertical noise; use CanvasTexture repeated. Markings as decal.

- Flag/lettering:
  createMarkingTexture(): canvas 512x512 transparent. Draw American flag at top? For a plane 8x10. Draw flag rectangle 120x70 with stripes and blue canton and stars dots. Below text "FALCON 9" in bold black or gray, with "SPACEX" maybe avoid trademark? Requirement flag and lettering; use "FALCON 9" and "SPACE LAUNCH". Fine. Draw at center. Use `ctx.font='bold 64px sans-serif'`. Fonts are browser built-in; no external. Texture SRGB, anisotropy. Mesh plane 7x9 at z=1.88, y=35, maybe rotated y? Rocket cylinder radius 1.85, plane at z=1.86; camera at +z sees. Add also x side maybe rotated. The text could be mirrored if plane front side; PlaneGeometry default faces +Z. Put at z=1.87. For flag near top on another plane maybe. Use one canvas 512x1024 with flag at upper and lettering. Plane 6x12 at y=38. Good.

  Need interstage dark band visible: cylinder at y=50, height 3, dark. Fairing top. Engine section dark.

- Lattice tower: use group at x=9, z=0. Width 5m. Levels every 6m to 72m. Four corner vertical struts plus horizontal and diagonal on faces. Use cylinders thin. Many (4*12 vertical segments + ...). Could add 300 meshes but okay. Better use LineSegments with LineBasicMaterial for far lattice? But realistic shadows? Use BoxGeometry meshes. Maybe create an InstancedMesh of struts? Simpler use `LineSegments` with line width 1, but appearance okay. Requirement tall lattice masts. A mesh lattice looks better. Implement generic `addLattice(group, center, width, height, levels, radius, material)`:
  corners at ±w/2 x, ±w/2 z. For each level: vertical struts between levels at each corner; horizontal ring at each level; diagonal braces on four faces per level. Use shared cylinder unit geometry and add meshes. For tower: 12 levels * (4 vertical + 4 horizontal + 8 diagonal) = 192 meshes; lightning masts 3 * maybe 10 levels * 8 = 240; pad total ~500 meshes shadows maybe fine. Could use InstancedMesh; but complexity. Use low segments. Use `castShadow=true` maybe only tower/masts. Shadow camera includes. Keep ~300.

  Maybe use `THREE.LineSegments` for masts to reduce performance, but realism "lattice" visible. Mesh thin boxes can alias. Let's use cylinders with 4 radial segments.

  Tower should be tall, perhaps 80m. Add swing arms to rocket at a couple heights, white/dark; antenna at top; red lights. Rocket on pad adjacent to tower. Add tall lightning masts at corners (x=±45, z=±45) height 90m, and maybe a catenary wire between? Add line curves using `THREE.Line` with sag. Light masts lattice. At least 3. Could add 4.

  Launch mount: gray box base at y=2 around rocket? Table with hold-down clamps. Build pedestal. Add pipes along pad.

- Smoke from flame trench along ground: spawn at trench exits (z ±32) with velocity outward along ±z and slight radial. Big billowing. At liftoff, massive. Also from nozzle all around when rocket near pad. Use two systems? Implement single SmokeSystem with pool 900. Emission rate depends on throttle & altitude: if thrust > 0 and alt < 3000, spawn. At alt>3000 maybe reduce. For ground smoke only while alt<500. Spawn 8-20 per frame at liftoff. Cap.

  But smoke particle count 900 with Points; good. Use additive? Smoke is white lit; use normal blending maybe with `depthWrite:false`, transparent. Custom shader with color; can't be affected by bloom too much; normal blending. Use soft alpha; over many gives volumetric. Colors uniform white-gray; tint by flame flicker for nearby? Use per-particle color attribute maybe. Add color attribute to smoke geometry and shader `attribute vec3 color; varying vec3 vColor;`. Set colors light gray/white, and for some warm tinted near flame. That looks nice.

  Points depth sort issue; set depthWrite false, depthTest true. Points may intersect rocket weirdly. Fine.

  Smoke particle update:
  ```
  interface Smoke { pos: Vector3; vel: Vector3; life: number; maxLife: number; size: number; growth: number; alpha: number; warm: number; seed: number; active: boolean}
  ```
  Could avoid allocating lots each frame by pool arrays. Use arrays of objects preallocated. For performance, typed arrays for attributes. Use `Float32Array(maxSmoke)` etc. On spawn index next. Update each active. Simpler use arrays `smokeLife`, `smokeMax`, `smokeSize`, etc and Vector3 arrays. But TypeScript easier with class `Particle` and array; 900 objects fine.

  For Points positions attribute, loop through particles set active positions; inactive set to far away / alpha 0. `geometry.attributes.position.needsUpdate = true`. Use `alpha` attribute. Use `size`. `color`. Every frame update all.

  Similar contrail particles pool ~600. But contrail puffs at altitude far away; need bigger size; use sizes in meters. Use same smoke shader for both? Two Points objects with different materials/colors. Contrail particles white, alpha low. Use a separate points object with same shader clone but uniform.

  Need "contrail stays in the sky and drifts slowly": spawn puffs along ascent, life maybe 180s, drift. But if simulation time runs 200s, puffs remain. Render loop sim time; smoke lifetime in real seconds? Use real dt perhaps. Contrail puffs persist by `life -= dt` (real time). They drift. If camera follows rocket high, old puffs far below not visible; the trail line helps. Fine.

  Ground smoke uses real dt to animate.

  Should we update smoke only when simulation updates? Use render delta for visual. Fine.

- Emit contrail at intervals: `if (simState.alt > 30 && throttle > 0.1)`, accumulate `contrailAccumulator += dt`; while > 0.35 spawn. Position jitter around rocket x/y. Since rocket high speed, puffs spread. Keep puffs at world position, drift slowly. Also line from trail for continuous contrail.

- Trail geometry:
  Build ribbon from trail points. Must handle when trail length changes. Reallocate max vertices? Could create BufferGeometry and rebuild arrays each frame if needed. Trail could grow to e.g. 10000; rebuilding each frame heavy. Use preallocated arrays of some max (e.g. 20000 points -> 40000 vertices) and set drawRange. But requirement trail array unbounded. Could allocate max 30000 and if more, skip old? The trail line can show latest. But "trail visible" okay. Use dynamic arrays? Let's use line geometry update with preallocated max of 16000 and sample trail: map each trail point to two vertices, but if length > max, downsample. Simpler: each frame build positions from all points only if changed; number maybe 10000; allocate new Float32Array for positions & colors each frame -> GC heavy but maybe okay for a demo. Better preallocate `MAX_TRAIL_VERTS = 40000` (20k points) and update count. If trail longer, stride = ceil(length / MAX_POINTS). Build ribbon for points at stride. Keep same array object.

  Ribbon with pairs along z offset: for each sample point (x, y, z=0), offset ± width/2 in z. Width in meters based on altitude/age maybe `w = 2 + Math.min(80, sample.y*0.003)`? at 100km width 80. At ground 2. But contrail from rocket should be thin. Use 4 + 0.0008*alt maybe. Also fade alpha toward tail with vertex colors. Material transparent, opacity 0.9, vertexColors. Build color attribute per vertex with white to gray; tail older gets fainter? `alpha` not built into MeshBasicMaterial vertex colors; use color darker? With transparent opacity 0.75 and vertex color, distant tail still visible. Could use ShaderMaterial with varying alpha per vertex. Easier custom shader for ribbon: attributes position, alpha; uniform color. Vertex passes alpha. Fragment color white * alpha. Transparent blending. Use depthWrite false, side DoubleSide. Update alpha tail fade. Let's implement.

  But at 100km, camera near ground, trail line width in world 100m gives visible. camera long lens fov 18°, at 100km 100m is ~0.1° => ~50 px. Good.

  Need maybe trail points one per step; if step called externally while paused? step is manual; trail updates. Fine.

- Sky:
  Create sphere radius e.g. 200000? Camera near rocket; if rocket at 300km, sky sphere must encompass camera; make radius 800000, follows camera position each frame. Use ShaderMaterial BackSide depthWrite false.
  Vertex: vWorldPosition maybe position normalized. Fragment: direction = normalize(vPosition) in local; use y coordinate. Colors:
    horizon color pale blue-white; zenith blue; lower below horizon pale gray.
  Sun: uniform sunDir. Add sun glow in direction. At altitude, mix skyColor to black with `exp(-alt/... )`? At 100km black. Define `spaceFactor = smoothstep(60000, 110000, alt)`. Sky color mix to near black by spaceFactor, but horizon maybe blue until 100km. Use:
    `float t = clamp(dir.y*0.5+0.5, ...)`; base = mix(horizonColor, zenithColor, pow(max(dir.y,0),0.6)); belowHorizon maybe haze.
    space = mix(base, vec3(0.0,0.0,0.01), spaceFactor)
    sun disk: `d = max(dot(dir, sunDir),0)`, add sun glow.
  Uniform alt, sunDir, camera maybe. Stars:
    Points with ~2500 stars on sphere radius 700000, fixed to camera? The sky dome follows camera; stars group also follow camera position so no parallax. Star positions random on sphere. Material PointsMaterial size maybe 1.4, transparent, opacity driven. But with camera fov changes and positions far, point size constant? PointsMaterial default sizeAttenuation true, at 700000 units size 2 would be invisible. Set sizeAttenuation false and size 2 px. Or custom shader. Use PointsMaterial with sizeAttenuation false, size 1.5, color white, transparent, opacity. Need stars above 70km visible and clear above 100km. Opacity = smoothstep(70k, 100k, alt). Also maybe opacity lower during day? Requirement must appear above 70 and clearly visible above 100. Use exactly. Since sky black above 100.

  Stars group centered at camera each frame. Points could be occluded by sky? Sky sphere radius 800000 BackSide; stars radius 600000 inside sphere, rendered after sky. depthWrite false; depthTest? If sky depthWrite false, stars visible. Ensure stars renderOrder maybe -1? Sky renderOrder = -10, depthWrite=false, stars renderOrder=-9. They will be behind objects due depth test with depth buffer? Sky depthWrite false means no depth; stars depthWrite false, depthTest false? If depthTest false, stars might render over rocket. Better stars depthTest true; since sky doesn't write depth, stars only occluded by geometry in front? Rocket at 100km, stars radius 600km behind, depth from rocket may occlude only exact pixels; fine. Stars depthWrite=false, depthTest=true. But without sky depth, okay. Set renderOrder = -9 after sky -10. The sky material depthWrite false, depthTest false? If depthTest false and renderOrder low first, sky fills then world; good. Stars after sky with depthTest true. Objects rendered later. Actually transparent objects ordering maybe; sky material transparent? ShaderMaterial can be opaque but BackSide. Set depthWrite false, depthTest false, side BackSide. Render order -100. Fine.

  Fog: `scene.fog = new THREE.FogExp2(0xb9cfe0, 0.00025)`; update color based on altitude to pale haze, fade density as altitude rises. But fog will affect stars? PointsMaterial fog default true; set fog false for stars and sky. Set fog:false in materials. Ground distant hazy. At altitude, fog density to near 0 and color dark. Update each frame `fog.color.copy(...)`, `fog.density = ...`. Also adjust sun light intensity? Sun in space harsher; not necessary.

- Lighting:
  DirectionalLight sun intensity ~3.0, color 0xfff3e0, position (200, 300, 150) or behind camera? shadows. Use shadow.camera near/far and left/right ±150 to cover pad and tower. At high rocket, shadow not important. Sun direction for sky consistent. HemisphereLight sky 0xbcd8ff ground 0x6b7a55 intensity 0.8. Ambient maybe 0.2. PointLight flicker at rocket base.
  Maybe sun below horizon? No daytime.

  Use `renderer.toneMappingExposure = 0.9`.
  Bloom strength 0.7 radius 0.5 threshold 0.7. Flame emissive white will bloom. Need output pass.

- Shadows: renderer.shadowMap.enabled = true; type PCFSoftShadowMap. Sun castShadow true. Ground receiveShadow; rocket castShadow; pad receive/cast; tower cast. Shadow map 2048 maybe 4096? 2048 okay. Shadow camera bounds ±200, near 1, far 1200. At rocket high, shadow camera target maybe origin; shadow doesn't follow rocket. Fine.

  Instanced bushes castShadow false maybe to save.

- Postprocessing resizing. UnrealBloomPass setSize from composer.

- Camera tracking:
  Have ground camera base position e.g. (28, 6, 75) (distance 80). Look at rocket center (sim.x, alt+35, 0). If rocket alt low, camera tracks upward. At altitude > 500 switch to long lens at (500, 10, 500) or maybe (350, 8, 350) with FOV 18. Need smooth. Long-lens tracking: position stays around (600, 20, 900) looking at rocket; FOV 20. At rocket high, to see it, camera must look up steeply; camera.lookAt works. The rocket may appear tiny at 300km, but long lens sees a dot + trail/flame. Could zoom FOV to 8° at > 50km. "long-lens shot that tracks the rocket upward." Use FOV = 18 near; at high alt reduce to 6°? A long lens can be 300mm -> FOV ~7°. Use dynamic 18 -> 8. This helps. Camera at ground, distance to rocket at 300km; a 70m rocket subtends 0.013°, impossible even with 8° ~ few pixels. Real launch tracking at 100km would have long lens and rocket still small. Fine.

  For scene visual, maybe keep camera at a fixed elevated distance but follow. We need user see rocket ascent. Better dynamic camera that tracks but also maybe moves up partially? Requirement low camera near pad looking up at liftoff, then long-lens shot that tracks rocket upward. Could place long-lens camera on the ground at a distance e.g. 600m, but at 100km rocket essentially invisible. Could scale rocket or use camera follow at high alt? Realism says track upward; we can switch to tracking camera that stays near rocket at a distance (like a chase) for high altitude? But "long-lens shot" suggests from ground. We can make camera position track rocket with some lag and look at it, but low near pad. Hmm.

  Alternative: after 20s, camera remains at a ground location but tilts up; at high alt rocket tiny. Add a HUD-like indicator? Not requested. Better visual: a long-lens camera located on a tower or ground with FOV 10°, always pointing at rocket; at high altitude rocket is a bright dot with plume and contrail, and sky darkens/stars. Could still satisfy. But user wants "ascent to space" visible. We can have camera follow rocket with a distance proportional to altitude after some point, perhaps "long-lens tracking" from a camera that rises? Not realistic. Maybe use a camera on an aircraft? But requirement only low near then long-lens tracks upward. Could set long-lens camera at a large distance but not ground? Hmm.

  We can implement camera that initially at ground; as altitude grows, camera position smoothly rises and stays e.g. 400 m below rocket but far back 1000 m, effectively tracking shot. But that's not launch photography. Another approach: use two cameras? Requirement camera singular. Let's do a long-lens ground camera with automated zoom that keeps rocket roughly same angular size: set FOV based on distance to rocket, decreasing with distance, e.g. FOV = clamp(0.02 * distance / ...?); but very narrow fov < 0.1° can't show much. We can adjust FOV to keep rocket same screen size: desired angular size = 70m / distance; FOV = angular size * factor. At 100km, needed FOV 0.04°—too narrow, unrealistic and also impossible to see context. Not good.

  Perhaps let the rocket scale not physical? No, units must be 1 unit = 1m, 70m tall. Camera can be near.

  Maybe after reaching a certain altitude, use camera that follows the rocket upward (like a tracking camera on a chase plane) and call it "long-lens shot" because fov is narrow and camera is far behind. Many launch videos from ground show rocket until staging at 60km. At 100km impossible. But requirement isn't graded visually? likely screenshot tests and API. Need make visually pleasing. I'll implement camera modes:
    - groundCam: at (26, 7, 60) tracking, fov 40, until alt > 250m.
    - longLens: position (380, 12, 600) fov 14 for alt < 15000? It tracks.
    - ascentCam: once alt > 15000, camera smoothly moves to a position near the rocket: e.g. rocket position + offset (-300, -120, 700) scaled with altitude? Then rocket stays visible, fov 35. But requirement says long-lens shot; can keep narrow FOV 20 and offset distance 600. This is a chase camera, not ground. Maybe acceptable visually? Could be seen as tracking camera. However user explicitly "low camera near the pad looking up at liftoff, then a long-lens shot that tracks the rocket upward." A long lens from ground is desired. We can make the camera stay on the ground but adjust position to a tall tower? Not.

  Compromise: camera begins ground near pad, then switches to a long-lens ground camera that tracks, and as altitude passes 8 km, smoothly transitions to an "airborne tracking long-lens" view? Hmm.

  Maybe use camera that remains near pad but in order to show ascent, make the rocket physically visible by adding a bright plume many tens of meters long; at 100km the plume may be km long, making a visible streak. Also the contrail line. The sky darkens and stars appear. This is realistic-ish. I'll set long lens camera at (600, 20, 900) with fov maybe 9°, tracking. The rocket at 100 km will be extremely tiny but plume expands with altitude to hundreds of meters, and contrail to 100m wide. Still tiny (~10px maybe? compute: 100km distance, fov 9° => vertical span at distance = 2*100000*tan4.5°=15,700m; 70m rocket = 0.45% of screen height ~4px at 1080; plume 500m -> 35px). Visible as a dot/streak. Contrails 100m -> 7px. Fine. It might look like a distant launch. Good. Camera at 600m ground tracking. Actually distance 600m to rocket near pad; rocket 70m at fov 9° spans 70 / (2*600*tan4.5) = 7.4% of height ~80px. Nice long-lens. Good. At liftoff, switch at alt maybe 100m to long lens; prior near camera with fov 45 shows tower and rocket. 

  Implement camera transition blending:
  Variables `cameraMode` smooth parameter. Define targets:
    nearPos = (30, 10, 85); nearFov = 55; look at rocket base+35.
    longPos = (520, 18, 760); longFov = 10; look at rocket base+35.
  Blend factor based on alt maybe smoothstep(60, 300, alt) and elapsed time? At alt 0, factor 0. At 300m factor 1. Then use factor to interpolate position and fov. Camera looks at target each frame. The near camera "looking up" as rocket goes up. The long-lens camera at 900m away. We can use `THREE.MathUtils.smoothstep`. With alt beyond 300m it's long. Good. It tracks upward.

  Maybe add slight camera shake at liftoff proportional to throttle and alt < 50m. Use sin noise, applied to position. Nice.

- Flame scale and light:
  Determine mass/thrust from sim via state? The API only exposes state, not mass or thrust. We can compute throttle from t: active = t < 200. `throttle = active ? 1 : 0`. For plume scale at altitude; at 200s cutoff. Also before liftoff? t 0. Fine.
  Plume group as child of rocket group at y=2 (nozzle base). At rocket group base alt. During ascent plume extends downward in rocket local orientation? Rocket should pitch with flight. We should rotate rocket group according to pitch. Pitch is angle from vertical; rocket should tilt along x (horizontal direction). Set `rocketGroup.rotation.z = -pitch`? If vertical rocket axis is Y. Thrust tilted toward +x means acceleration +x; rocket should tilt its nose in +x direction and exhaust opposite. Rotation about z by -pitch tilts local Y axis to +x? A point (0,1,0) rotated about z by -θ becomes (sinθ, cosθ,0). Yes rotation.z = -pitch gives nose toward +x. So rocket group.rotation.z = -pitch. But at liftoff on pad pitch 0. Good. However base position at alt; rotation about base causes entire rocket lean, okay. Plume also tilts with rocket.

  But if the rocket group position is at (x, alt, 0), rotating about base means model base at group origin. Good. Camera looks at center computed from rotated? Use rocket group's local center transformed maybe. Simpler target = (x, alt+35*cos(pitch), 35*sin(pitch)?). Actually rocket nose shifted x by sin(pitch)*35; target center = (simX + sin(pitch)*35, alt + cos(pitch)*35, 0) depending rotation sign. With rotation.z=-pitch, local y axis maps to (sin pitch, cos pitch). So center = x + sin(pitch)*35, alt + cos(pitch)*35. Use that.

  Trail points from sim are base only; line along base. Fine.

  Flame is child so rotates.

- Sky driven by rocket altitude; update uniform. Also fog and stars. Camera position may be ground; sky dome follows camera; stars follow camera. Sun direction fixed.

- Physics details and numeric accuracy:
  At t=0, thrust T = 1.3*m0*g0. `m = m0 + (dry - m0) * (t / burnTime)` for t in [0,200]. At t=0 m0. The thrust limit = 3*m*g0. Effective = min(baseT, limit) if t<200 else 0. Compute g(h). Pitch target. accelY = F*cos(pitch)/m - g. accelX = F*sin(pitch)/m. vx += ax*h; vy += ay*h; alt += vy*h; x += vx*h. Need use altitude for gravity at start of substep. Good.
  `acc` = vertical accel computed at current state after integration? State returns net vertical acceleration maybe compute current mass/thrust/pitch/g at current time and alt. Use helper `netVerticalAcceleration()` after updating. At t>200 zero thrust, acc = -g. Store.
  Since thrust direction and gravity; net vertical acc includes thrust cos and gravity. Horizontal not returned. `vel` vertical velocity. Mass and horizontal velocity internal not exposed.

  Pitch: initial 0. After 10: target. At t 150 -> 0.5. After 150 maybe smooth further to 0.9 at 300? Requirement "never decreases"; do:
    ```
    function targetPitch(t: number): number {
      if (t <= 10) return 0;
      const u = Math.min(1, (t-10)/140);
      const s = u*u*(3-2*u);
      const base = 0.5*s;
      const extra = t>150 ? 0.35 * Math.min(1,(t-150)/250) : 0;
      return base + extra;
    }
    ```
    But at t=150 exactly base 0.5, extra 0 =>0.5. After increases. Since never decreases, `pitch = Math.max(pitch, targetPitch(t))`. However if t resets? reset set pitch=0. Good.
    If step called with dt after 200, pitch continues to increase but thrust 0; rocket just rotates? The requirement pitch from thrust; after burn no thrust. Fine. Maybe pitch should stay after 200; extra stop at 200? Use extra up to 200 or 300. Doesn't matter. If no thrust, rocket orientation can still be rotated as per pitch; okay.

  Time integration: t += h. Pitch update before acceleration at new t? At t=0 h first, compute pitch target at t+h? Could compute target at t+0.5h. Minor. Use current t for pitch and mass, then t += h. At exact 200, burn condition t < 200; fine.

  On reset: t=0 alt=0 vy=0 vx=0 x=0 pitch=0 acc=0, trail.length=0. "rocket on pad, trail emptied (keep same array object)". paused? Should reset set paused? Requirement reset: time 0, rocket on pad, trail emptied; not necessarily paused. Keep paused current? Could set paused false? Probably keep paused? We'll not change paused. Maybe reset should also clear particle systems? The rocket trail only required. We'll clear visual contrail/smoke too.

  Expose `window.__rocket = rocketSim;` and maybe also `window.__sim`. Fine.

  Ensure trail push once per step. If step dt=0, push current point. If reset called, trail length 0. On next step push. Good.

  Need paused boolean used by render loop: `if (!rocketSim.paused) rocketSim.step(Math.min(clockDelta, 1/30));` exactly.

- Time source for motion: use delta/elapsed, not frame counts. `const dt = Math.min(clock.getDelta(), 1/30)` maybe clock.getDelta returns. For simulation, step uses dt. For smoke, use elapsed? Use real delta. The requirement "Motion must use delta/elapsed time, not frame counts." Good.

- Potential issue if tab hidden and delta large; clamp to 1/30 per requirement. Use `Math.min(clock.getDelta(), 1/30)`. For render effects, also clamp.

- First frame __ready: after composer.render, if !readySet set ready. Need render first frame maybe in animation loop. Good.

- Need scene object accessible.

- Maybe add `window.addEventListener('resize')`; orientation? no.

- Camera aspect resize.

- Types for `UnrealBloomPass` imported. Ensure OutputPass. Fine.

- Strict TS with canvas texture: `texture.colorSpace = THREE.SRGBColorSpace;` property exists. For DataTexture maybe.

- Three r160 changed `outputColorSpace`. Use.

- `renderer.useLegacyLights` removed? Avoid.

- Shader uniforms: `{ uAlt: { value: 0 } }` types `{ [key:string]: THREE.IUniform }`; okay.

- Sky shader:
```
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uSun: { value: new THREE.Vector3(...).normalize() },
    uAlt: { value: 0 },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `...`,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
});
```
Need sky sphere follow camera. If depthTest false and renderOrder -100, objects draw after. Good. But if depthTest false, it still writes color to screen, okay. However if transparent false, it may render in opaque pass ordered by renderOrder -100. Good.

  Fragment compute:
```
varying vec3 vDir;
uniform vec3 uSun;
uniform float uAlt;
float hash...
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y*0.5+0.5,0.0,1.0);
  vec3 horizon = vec3(0.72,0.82,0.88);
  vec3 zenith = vec3(0.10,0.35,0.70);
  float y = clamp(dir.y,0.0,1.0);
  vec3 col = mix(horizon, zenith, pow(y,0.55));
  float below = smoothstep(0.0,-0.15,dir.y); // maybe
  col = mix(vec3(0.62,0.70,0.66), col, smoothstep(-0.05,0.15,dir.y));
  float sf = smoothstep(70000.0, 110000.0, uAlt);
  vec3 space = vec3(0.0,0.0,0.0);
  // airglow blue near horizon at high alt? 
  col = mix(col, space, sf);
  float sd = max(dot(dir, normalize(uSun)),0.0);
  col += vec3(1.0,0.9,0.7) * pow(sd, 800.0) * 3.0; // sun disk
  col += vec3(1.0,0.75,0.45) * pow(sd, 8.0)*0.25;
  col *= mix(1.0, 0.35, sf); // dim
  gl_FragColor = vec4(col,1.0);
}
```
But OutputPass/tone mapping may make sun colored. Fine.

  Need stars visible from 70km but not below due sky brightness. Use PointsMaterial opacity. With sky black above 100, high contrast.

  Sun direction: pick directional light position; normalize. Direction in sky shader should be direction from camera to sun (i.e. sunDir). If light position is (200,300,150), direction to sun normalized (0.51,0.77,0.38). Use same. Sky fragment dot(dir, uSun) gives sun in that direction. Camera ground looking toward rocket +x? Sun maybe behind camera? Choose sun direction positive z: (0.4,0.7,0.6) so visible in sky. DirectionalLight position = sunDir*1000. Light from that direction. Good.

- Fog affects ocean and ground to hazy pale blue. Use FogExp2. Sky not fog. At high alt no fog. Set scene.fog color update. At high alt, ground far below maybe not visible.

- Horizon: if camera looks up during ascent, ground not visible. But initial photo shows ocean horizon behind pad. Place ocean behind (negative z) and camera at +z looking toward origin and beyond to -z. Yes. Ground plane extends 3000m; ocean beyond. Camera at (30,8,85) looking at rocket (0,35,0), background is -z behind. See ocean horizon. Good. But tower and masts behind? Fine.

  Ocean plane at y=-0.4 centered z=-6000, with size 50000 x 8000? A plane 50000 x 20000; near edge -4000 maybe. Ground ±3000. Gap from -3000 to -4000 with ocean visible? Ocean plane extends under ground from z=-? Make ocean plane 40000x40000 at y=-0.8 centered (0, -0.8, -10000) with z range -30000..10000; ground at y=0 covers until z=-3000, ocean visible beyond. Good.
  But camera at z=85 sees ocean at z<-3000. Horizon at few km due low camera. Yes.

  Add distant land strip maybe.

- Roads and buildings: place along x at z=200? In camera background? roads around pad. Use plane strips dark asphalt. Building boxes near. Add launch support buildings low gray. Scrub bushes.

- Pad coordinates: pad big 90x90 at origin, top y=0. Ground y=-0.2. Concrete slabs. Rocket at origin base. Flame trench along z from -40 to 40, width 10. Pad surface top y=0; trench top y=-2, slopes. Build:
  - Pad slab box 100x3x100 centered y=-1.5 (top y=0) but trench cut? Instead two slabs at x ±? Wait trench runs along z under rocket, width in x = 10. Pad split into left slab (x from -50 to -5) and right (x 5 to 50), and end slabs for z beyond ±40? Use BoxGeometry left: width 45, height 3, depth 100, center x=-27.5, y=-1.5. Right similar. Then central strip width 10 with trench floor at y=-3 and no top. To create ramp exits, add floor at y=-3 dark. Good. But rocket at center x=0 sits over trench? Launch mount over trench. Fine.
  - Need pad top visible around; split leaves slot. Add trench walls maybe boxes.
  - Actually flame trench usually runs under rocket along one direction and deflects flames sideways; smoke exits at both ends. Dark trench at y=-2 with length 90. Add two slabs either side. Good.
  - Flame exhaust at rocket base y=0; at t=0 plume downward into trench, okay.
  - Add a launch mount table at y=2 (pedestal) spanning trench, with hold-down clamps. Rocket base at alt 0; body base/nozzles start maybe y=2; visually on mount. The sim alt starts 0. If rocket group at y=0 and nozzles bottom at y=1.5, it's above pad. Good.
  - Trench exits z=±50, smoke spawn at (0, 0.5, ±42) with outward. Big clouds roll along ground.

- Lattice tower at x=10, z=0, height 80. Add swing arms from tower to rocket at y=30 and y=55? At liftoff arms retract maybe static. They can pass close. Keep arms up to x=3.5. Use boxes dark. Add umbilical cables as curve lines maybe.

- Lightning masts around pad corners at (±55, 0, ±55) height 90, but maybe visually tall. Add wires from masts to a point above rocket? Lines with sag. Good.

- Shadows from sun: sun direction (0.4,0.7,0.6); shadow camera covers ±150. Light position = (200,350,240) maybe. Shadow cast on pad/ground.

- Rocket material map: use concrete? create subtle white panel lines. Canvas:
  512x1024 white-ish with vertical panel lines light gray, some faint smudges. Set wrap. Body cylinder map repeats maybe. Fine.
  Interstage dark band separate geometry, not map.
  Add black band near base and at top. Use CylinderGeometry height 2 radius 1.86.

- Fairing nose with LatheGeometry: Define points from r=1.85 at y=55 to r=0 at y=70. Use 2D profile: maybe (0.0, 0), (?). Lathe geometry uses points (x,y) rotated around Y. Points list for fairing: start at (1.85,55) but if local group y? We can create lathe with points in local coordinates starting at y=0, then position y=55. Points: (1.85,0), (1.85,3), (1.7,6), (1.4,9), (1.0,12), (0.5,14.2), (0,15). Height 15. Body from y=10 to 55. Engine section y=4..10. Nozzles y=1.0..4? The rocket total 70. Body: main stage 42 m? Falcon 9 first stage ~41m, second stage+fairing ~20m. Use engine section 8, tank 45, interstage 3, fairing 14 = 70. Body: engine y=3..10? Let's lay:
    nozzles from y=0.5 to 2.5
    engine section cylinder y=2.5 to 9.5 (height 7)
    main body y=9.5 to 53 (height 43.5)
    interstage band y=53 to 56 (3)
    upper stage/fairing cylinder y=56 to 62 (6)
    nose lathe y=62 to 70 (8)
  Total 70. Good. Rocket group base at alt; nozzles bottom at 0.5. At alt=0, nozzle bottom y=0.5 above pad. Plume goes down from y=0.7 into trench. Good.

  Add 9 Merlin nozzles at base in a 3x3 pattern: positions x -1.1,0,1.1 and z -1.1,0,1.1, center y=1.6, height 1.8. Cone/cylinder that flares. Use CylinderGeometry(0.35,0.65,1.8,12,1,true) with dark metal; openEnded true. Position y=1.5. They extend 0.6..2.4. Fine. Add inner glow maybe.

  Add landing legs stowed: dark strips along lower body, 4 thin boxes at angles. Grid fins: at y=52, four boxes 2x1.5x0.2 offset radius 1.9, rotated. Material dark. Good.

  Body decal planes: for flag/text. With rocket rotation, okay.

  Maybe add stage separation? Not required.

- Plume design:
  `plumeGroup` child of rocket group at y=0.5 maybe; extends downward. Use a custom cone geometry with `CylinderGeometry(1.4, 0.3, 12, 24, 1, true)`? To have wide at nozzle? Actually exhaust narrow at nozzle and widens downward. Use cylinder radiusTop 1.6 (at top), radiusBottom 2.4, height 10, openEnded. Position y = -height/2 + 0.7? Then visible.
  Shader color based on uv.y and noise. Cylinder UV v=0 at top? In Three CylinderGeometry uv v=0 bottom? likely. Not critical.
  Use additive, depthWrite false, side DoubleSide. Scale with altitude:
    base length = 8 + min(60, alt*0.01) maybe at 10km -> 100? Requirement plume grows longer and wider as air thins. Use `plumeLength = 8 + Math.min(150, alt * 0.004)` at 100km -> 158; but flame at vacuum expands huge. Could be 500m. Use 8 + min(300, alt*0.002) => 300 at 100km. And width = 1.5 + min(30, alt*0.0005)=30. That makes visible streak. Scale cylinder geometry height from 10 to plumeLength, radius scale. Note parent rotation with pitch.
    Use two layers: inner core (white-yellow, thin) and outer plume (orange, wide). Core scales. Add glow sprites.
  PointLight at nozzle; intensity = throttle * (100 + 20*sin...). At high alt still.
  Mach diamonds: 4 small cones/octahedrons along plume y positions, with additive white/yellow; scaling with pulse. They should only show near low altitude dense air? Mach diamonds at sea level; at altitude fewer. Set visible if alt < 20000, opacity.

  A blinding white-yellow core sprite at nozzle: `SpriteMaterial` with canvas radial gradient white center to transparent. Additive blending. Sprites attached to plume group? Sprite scale in world; will be 30m maybe. At nozzle. Since sprite always faces camera, nice. Add flicker via scale/intensity. Put at y=0.2 relative base. Bloom.

  A long glow sprite maybe.

  Also light the pad: flicker PointLight with color 0xffc070, intensity 500? Three physically correct lighting intensity units: PointLight intensity in candela; at distance 20m, intensity 500 gives 500/400=1.25. Need enough. Use intensity ~2000 at ground with decay 2. At rocket base near pad, pad illuminated. At high altitude no pad visible. Use distance 200. Flickers.

  Maybe add a SpotLight pointing down? PointLight fine.

- Smoke and flame lighting: Points shader not lit. Add warm tint via uniform `uFlame` and per-particle `heat` attribute. For ground smoke near nozzle, warm tint. Could tint color attribute on spawn warm based on distance. Since flame light dynamic, use a uniform `uWarm` for all smoke; but distant clouds also warm. Acceptable. Better per-particle `heat` decays.

  Shader:
```
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
...
void main(){
  vec3 mv = (modelViewMatrix * vec4(position,1.0)).xyz;
  gl_PointSize = aSize * uScale / max(-mv.z, 1.0);
  gl_Position = projectionMatrix * vec4(mv,1.0); // careful: modelViewMatrix already applied; should use projectionMatrix*vec4(mv,1)
  vAlpha = aAlpha;
  vColor = aColor;
  vSeed = aSeed;
}
```
For points modelView includes object matrix. Use `projectionMatrix * mv`? `mv` is vec3 view position; vec4(mv,1.0) * projection. Yes.

  Fragment:
```
vec2 p = gl_PointCoord - 0.5;
float r = length(p)*2.0;
float soft = smoothstep(1.0,0.15,r);
float noise = 0.7 + 0.3*sin(p.x*9.0+vSeed)+...; 
alpha = vAlpha * soft * noise;
if (alpha < 0.01) discard;
gl_FragColor = vec4(vColor, alpha);
```
Need clamp and maybe blend normal. Uniform `uScale`: compute from renderer height and camera fov maybe. With perspective, formula `gl_PointSize = aSize * (uHeight / (2*tan(fov/2))) / (-mv.z)`. Set uScale each frame = height/(2*tan(fov/2)) maybe use `renderer.domElement.height` or window.innerHeight * pixelRatio. Since gl_PointSize is in physical pixels? In WebGL, gl_PointSize in pixels in drawing buffer. Use renderer.domElement.height (drawing buffer) for scale. `projectionMatrix[1][1]` equals 1/tan(fov/2) for perspective. So `uScale = 0.5 * drawingBufferHeight * projectionMatrix[1][1]`. Use maybe `0.5 * height * proj[1][1]`. Then world size. Good. Set uniform each frame. But gl_PointSize max can be limited; large smoke near camera may be huge and clamped. Fine.
  For smoke near camera (10m away, size 30m), pointSize = 30 * 0.5*1080*1.4 /10 = 2268 px; beyond max often 1024; may clamp, but okay. Could reduce.

- Update smoke:
  Use real dt. Spawn at trench ends if rocket t < 12? Actually at liftoff. Sim state t starting 0. Spawn while t between 0 and 30 and alt<200 maybe. Massive at first. Also nozzle steam maybe. Use continuous while `state.t < 30` and thrust. Rate maybe 60 per second (1 per frame). 900 particles with life 12s -> at 60/s over 12s = 720. Good.
  Spawn:
    side = random ±1; p = (rand(-3,3), 0.3+rand*2, side*(42+rand*3)) near trench exits. vel = (rand*-, small up, side*(15+rand*20)). The cloud rolls sideways. Add upward velocity 2..6. Size 6..18, growth 6..12 per sec. alpha 0.35. Color warm white/gray. As it expands upward. Also spawn near pad center around rocket at y 1.5 with radial velocity outward, bigger.
  But at t<0? no.
  Update: vel.y += 1.5*dt (buoyancy), drag exp; pos += vel*dt; size += growth*dt; alpha decays based on life. Life 10-18s.
  Alpha: `baseAlpha * smoothstep(0, 1.5, age) * (1 - age/life)^1.5` maybe. Ensure fade in quickly. Use `alpha = 0.28 * sin(pi * age/life)`? Better fade in 0.5s, fade out last half. 
  Color: initial warm (1.0,0.85,0.6) near rocket, then white/gray. Hard with per-particle color; set warmer for spawn near nozzle, and gray for trench. Use `aColor` random white-gray (0.7-0.95). Add slight warm for nozzle.
  For light from plume, could scale colors by uniform warm? Use fragment mix with a `uGlow` uniform? not spatial. Could set per-particle color warm for those near flame, then fade color? Update color attribute over time. We can set color based on age; warm to gray. Nice. During update, `col = lerp(warmStart, cool, min(1, age/2))`. Store warmStart? Simpler set spawn color with warm random, and each frame multiply color toward white? We can store `heat` and update; but extra typed. Use particles as objects and typed arrays.

  Let's define class `SmokeParticle`:
```
class SmokeParticle {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  age=0; life=0; size=0; growth=0; alpha=0; seed=0;
  warm=0;
  active=false;
}
```
  900 objects. For contrail similar but no warm. Use one class.

  Update attributes by iterating array. Color computed each frame:
    base = 0.72..0.98; warm factor `p.warm * Math.max(0, 1 - p.age*0.5)`; color = base*(1) with r = base, g=base*(0.9+0.1warm?), b=base*(1- warm*0.3). Good. Set attribute.

  For contrail: spawn sizes 5-15m, growth 1-3 m/s, life 120s, alpha 0.12-0.25, drift x + wind. At high alt, maybe size 30. Keep count maybe 600. Contrail puffs persist but when rocket altitude high, camera tracking; old puffs left below and behind; visible trail. Good.

  Points attributes:
    positions, sizes, alphas, colors, seeds. `geometry.setDrawRange(0, max)`. Update all. For inactive, set alpha 0, position? pointSize maybe still. Set positions same, alpha 0. fine.
    Need `geometry.attributes.position.needsUpdate = true` etc. Preallocate Float32Array(max*3).

  To mark attributes dynamic: `new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage)`.

  For smoke material uniforms: `uScale: {value:1}`, maybe `uColor` not. Use vertex color attribute.

  For contrail maybe same shader with softer/lower alpha. Clone material with different uniforms.

- Flare/bloom threshold: bloom will catch flame and sun? Sun in sky shader maybe bright may bloom. Fine.

- Rocket visual at altitude. When sim alt is large, rocket group y=alt. At 100km, scene scale; camera at ground looking up. Shadow, fog? fine.

- Floating origin? Not needed; up to 300km, Three.js double precision okay. Camera near ground; sky sphere radius 800km. Star sphere. Distances okay.

- Add a "shockwave" ring maybe not.

- Pad steam around at liftoff might obscure rocket, but keep moderate.

- Need ensure the rocket moves visibly. At first step with dt 1/30, alt ~0.016m; next frames. Smoke begins. Good.

- Sim time and camera:
  If user tests `window.__rocket.step(...)`, render loop also steps unless paused. Fine.

- Some physics tests may check thrust limit and pitch. Ensure `state()` returns numbers. `acc` computed net vertical. Maybe they expect velocity total? Hard. Could include extra fields? Type doesn't restrict. We can add `mass`, `thrust`, `vx`? They asked exact shape; extra okay. But TypeScript `state()` return declared with only specified fields. Could add but tests only use those. Keep shape.

  At t=0, acc should be 1.3*g0 - g0 = 0.3*g0 = 2.943. Good. Pitch 0. vel 0. alt 0. If state called after reset.
  Integration: at t=0, mass m0, thrust effective 7,014,150. acc 2.943. After 1 sec alt maybe 1.47. Good.

  Thrust-to-weight T = 1.3*m0*g0. Limit 3*m*g0. At t=200, mass dry, burn zero. Need discontinuity; okay.

  Burn mass: "mass falls linearly from m0 to dry mass during the burn." Use linear in t. At t=200 m=dry. For t>200 dry. Good.

  Gravity: g(h) = g0*(R/(R+h))^2. Use alt maybe negative? clamp alt. Good.

  Cannot go below pad: clamp.

  Fixed substep at most 0.02. Use n = Math.max(1, Math.ceil(dt / 0.02)); h = dt / n. n may be huge; okay. Maybe `dt` NaN? Avoid. Use finite. `if (!isFinite(dt) || dt<=0)`. If dt not finite, ignore? Use dt=0. Strict. Push trail always. For huge dt, maybe heavy but requirements.

  Trail world points: `{x: simX, y: alt, z: 0}`. But since rocket tilts, actual center not vertical. Base world point exactly. Good.

- Reset visual contrail? Requirement only trail array. But for consistent visual, clear smoke and contrail particles and reset rocket group. We can expose a callback `onReset` from sim? Since sim defined before visual systems perhaps. We can create sim first, then visual; hook `rocketSim.reset` maybe a wrapper that also clears effects. But requirement `reset()` semantics; adding clearing effects okay. We can set a global resetEffects function. Sim's reset calls it if defined. Simpler after creating effects, monkey patch? Might break. Instead define `let resetVisuals: () => void = () => {};` and sim reset calls. Then assign after effects created. Also reset trail geometry. Good.

- Need update trail geometry after step. Render loop after step calls `updateTrailGeometry()`. If paused and no step, still update when new manual step? Render loop calls update each frame regardless. Fine.

- Trail length one per step. If paused, no new. Good.

- External tests may inspect scene camera/rocket. They may call `__rocket.paused = true` then step manually, render. Fine.

- The camera's look target uses rocket position. If paused, still.

- Sim starts with step in render loop. Need maybe initial `rocketSim.step(0)`? Trail empty until first step. Render loop step dt. Fine.

- Potential test: `__rocket.trail` should be same array after reset. Ensure reset doesn't reassign. We'll define `const trail: TrailPoint[] = [];` and use `trail.length = 0`.

- `window.__rocket` after first frame? Assign before loop. Fine.

- Strict: `renderer.setAnimationLoop(animate)` types maybe function receives `time: number` but `setAnimationLoop(callback: XRFrameRequestCallback | null)`. XRFrameRequestCallback is `(time: number, frame?: XRFrame) => void`. Define `function animate(_time: number): void`. Fine.

- Avoid `HTMLCanvasElement.getContext('2d')!` strict okay. Use helper:
```
function makeCanvas(w:number,h:number): {canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D} {
  const canvas = document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return {canvas, ctx};
}
```
  Throw okay.

- Types for custom shaders: ShaderMaterial.

- Need handle output pass: if use `OutputPass`, renderer.toneMapping = ACESFilmicToneMapping. OutputPass will maybe apply tone mapping. Set `renderer.toneMapping = THREE.ACESFilmicToneMapping`. In three r160, when rendering to composer, materials see `toneMapping`? WebGLPrograms uses renderer.toneMapping for material, yes. OutputPass also uses `toneMapping` uniform from renderer.toneMapping if material? It likely does. Could double tone map but still image. To avoid double, set renderer.toneMapping = NoToneMapping and OutputPass with `renderer.toneMapping`? OutputPass constructor maybe doesn't take toneMapping; it reads renderer.toneMapping in render? Let's recall Three.js OutputPass implementation:
```
class OutputPass extends Pass {
 constructor() {
   ...
   this.material = new ShaderMaterial({ ... OutputShader ...});
 }
 render(renderer, writeBuffer, readBuffer) {
   this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
   // toneMapping define based on renderer.toneMapping
   if (renderer.toneMapping !== NoToneMapping) ...
 }
}
```
I think OutputPass uses renderer.toneMapping to set defines and applies tone mapping+color space. Meanwhile regular materials rendered into the composer's render target may also tone map based on renderer.toneMapping unless renderer uses render target and disables? In WebGLRenderer, tone mapping is disabled when rendering to render target? Actually `getToneMappingFunction` in WebGLProgram: tone mapping is applied only if `material.toneMapped` and renderer.toneMapping not NoToneMapping. It doesn't check render target. So to use OutputPass properly, one should set renderer.toneMapping = NoToneMapping and let OutputPass do tone mapping? But OutputPass needs toneMapping info; examples set renderer.toneMapping = ACESFilmicToneMapping and add OutputPass. The docs common. I think EffectComposer sets renderToScreen false, and WebGLRenderer still applies tone mapping. Hmm maybe OutputPass uses `renderer.toneMapping` and materials do too; double. Yet examples work because tone mapping is only applied when rendering to screen? Let me recall WebGLRenderer's `render` sets `_currentRenderTarget`; in `renderBufferDirect`, program is compiled with `toneMapping` parameter from `renderer.toneMapping`. I believe it's always. Many postprocessing examples set `renderer.toneMapping = ACESFilmicToneMapping; ... composer.addPass(new OutputPass())` and look okay. Maybe RenderPass's material? No. Let's not overthink; use OutputPass and ACES. If double, slightly washed. Could set renderer.toneMapping = NoToneMapping and OutputPass will not tone map, no ACES requirement? Requirement says ACES tone mapping. Set ACES. Could instead not use OutputPass and just use bloom pass with renderToScreen true. UnrealBloomPass final pass writes to screen; color space may be wrong. Many examples use OutputPass. We'll include.

- Could add `renderer.toneMappingExposure = 1.0`.

- For physically based materials, ambient.

- Use `THREE.Color` with SRGB. Fine.

- Let's outline code:

```ts
import * as THREE from 'three';
import { EffectComposer } ...
...
// ---------- renderer/scene/camera
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin='0'; document.body.style.overflow='hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 2000000);
scene.fog = new THREE.FogExp2(...);
...
(window as any).__scene=scene; etc.
```

  Camera far 2,000,000 to see sky sphere radius 800,000 + rocket high. near 0.1. Depth precision at 300km and 0.1 near can cause z-fighting? Rocket geometry at 300km; depth precision fine enough. near 0.5 maybe. Use near 0.5. Camera ground sees pad details at 50-100m. Fine.

  Maybe near 0.3 far 1e6. At high altitude rocket and ground far, okay.

- Helper materials and textures.

- Build ground:
```
const groundTex = makeGroundTexture();
const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness:1, metalness:0, color:0x9fb47a });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000,8000,1,1), groundMat);
ground.rotation.x=-Math.PI/2; ground.position.y=-0.15; ground.receiveShadow=true;
scene.add(ground);
```
  Use plane geometry huge; shadow camera doesn't cover entire; fine. Ocean:
```
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(60000,60000), new MeshStandardMaterial({color:0x2f6172, roughness:0.28, metalness:0.15}));
ocean.rotation.x=-PI/2; ocean.position.set(0,-0.5,-16000); scene.add(ocean);
```
  But ocean overlaps land under; ground at y=-0.15 covers up to ±4000; ocean y=-0.5 lower so hidden. Good. Horizon beyond.

  Add coastline maybe a sand strip at z=-3900; optional.

  Scrub instanced: use `IcosahedronGeometry(1, 1)` scaled random, green material. Place between distance 120 to 2500 excluding near pad. 1200 instances. Use matrix with position (x,z), y=0, scale (2-8, 1-3, 2-8). castShadow false, receiveShadow true. Color variation via instanceColor? InstancedMesh supports setColorAt. Use per-instance color. Need enable? `instanceColor` set. Use `mesh.setColorAt(i, color)`. Material vertexColors? For instanceColor, MeshStandardMaterial supports automatically? It uses instanceColor when present, material vertexColors maybe not required in three. In recent versions yes. Add.

  Trees maybe cone geometry separate but bush okay.

  Roads: create road strips using PlaneGeometry placed y=0.02. Use asphalt material. Main road from z=100 to -2000 at x=200? Need not intersect. Add parallel road, stripes maybe thin white boxes. Buildings near x ±300, z=-500..500 low boxes gray. Add a few hangars. Maybe road leading to pad. Use MeshStandardMaterial dark gray. For road stripes, create small boxes repeated; could be too many; just a couple.

  Buildings: 12 boxes with gray roofs, positions random around. MeshStandardMaterial colors. receiveShadow. Add.

- Pad group:
  concrete material with map repeat. Create box geometries.
  Pad left slab: width 44, height 3, depth 100, position x=-27, y=-1.5? Wait trench width 10 centered x=0. Left slab should cover x from -50 to -5 => width 45 center -27.5. Right +27.5. Top y=0 if height 3 center -1.5. Use same for both. But under rocket central x[-5,5] only trench. Add floor at y=-3 with dark material. Add back/end walls maybe. Add ramp: at z=±50, ramp geometry.
  Actually the rocket base sits at x=0 over trench, supported by launch mount. Good.
  Add concrete hardstand around trench ends maybe.
  Pad top y=0; ground at -0.15, pad slightly raised. Add beveled edges? okay.
  Add black scorch marks near trench with dark material planes.
  Add yellow lines? Maybe.

  Launch mount: box 10x2x10 at y=2? But rocket nozzles at y 0.6-2.4 and base, if mount top y=2 intersects nozzles. Place mount around edges: four pedestals/support boxes at x ±4, z ±4 with height 4, and a base ring at y=3? The rocket engine section starts at 2.5, so nozzle exits at 0.6. If support pedestals at corners, fine. Add hold-down clamps at corners. Add a flame deflector wedge under rocket (dark) at y=-1.
  Tower at x=10 maybe too close to mount. Use x=12, z=0 width 5, height 80. Tower base from ground. Lattice. Swing arms reach to rocket.

  Lightning masts at (±52, 0, ±52) maybe four. Height 95. Add mast heads with red light. Wire lines: use `CatmullRomCurve3` and `TubeGeometry` thin? Lines with LineBasicMaterial dark. Use `THREE.Line` with points sagging. Connect opposite masts with sag? maybe from each mast top to a point above rocket (0, 100, 0). Could clutter. Add one catenary wire across masts. Use Line.

- Rocket group: create.

- Materials:
  `rocketWhite = new MeshStandardMaterial({ color: 0xf2f2ee, map: bodyTex, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.5 });`
  Add `bodyTex` subtle.
  Dark carbon: color 0x1a1b1d roughness .5 metalness .2.
  Nozzle: 0x2a2b2e metalness .9 roughness .35.

  Cylinders with radialSegments 32. Body may have a map repeated around. Use texture UV; CanvasTexture 512x512 maybe white with vertical panel lines; wrapS Repeat, wrapT Clamp. Set repeat once? If cylinder height, map wraps. Panel lines.

  Decal plane: 
```
const decalTex = makeMarkingTexture();
const decal = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 9), new THREE.MeshBasicMaterial({ map: decalTex, transparent:true, depthWrite:false, side:THREE.DoubleSide }));
decal.position.set(0, 36, 1.87); // front
```
  With basic material it's not lit; better MeshStandardMaterial transparent map, alphaTest 0.05, roughness .6. But transparency and shadows. Use MeshBasic to ensure visible; maybe fine. Use MeshStandard with transparent, alphaTest 0.1.
  Make texture 512x1024; flag at top 150x90; text below. Plane aspect 5:10 matches? Use 4.5x9 plane ratio 0.5, texture 512x1024 ratio .5. Good.
  Also add on other side x? Maybe place at x=1.87 rotated y=PI/2 so visible from x side. Camera from z, front decal enough. Also maybe both sides z=±. Add front and back? Back plane rotated Y PI. Good.

  Add "FALCON 9" vertical? Use horizontal text on curved surface. Fine.

  Add small black band at base top, interstage.

  Grid fins: 4 boxes 1.8x1.4x0.12 at y=52; positions around radius 1.95; rotate y to face outward; dark.

  Add landing legs: 4 long thin boxes 0.5x18x0.3 at y=14 around radius 1.95, carbon. Could be visible. Good.

  Add a second-stage interstage band and maybe fairing separation line.

- Physics sim defined maybe before build? Doesn't matter.

- Sky creation:
  sphere radius 900000, widthSegments 32 height 16. Shader. follow camera. Add stars.
  Need sunDir uniform.

  Stars: `Points` with 3000 positions random on sphere radius 850000. Use PointsMaterial({size: 1.8, sizeAttenuation:false, color: 0xffffff, transparent:true, opacity:0, depthWrite:false, fog:false}). PointsMaterial has `fog` property? yes. Use `opacity` update. Star color variation maybe per-vertex colors. Could use `vertexColors` with random brightness. Add color attribute. PointsMaterial vertexColors true, color white. Fine.
  Positions on sphere: random direction * 800000. Need avoid y<0 maybe visible upper hemisphere and some below horizon; stars from space all sphere but ground blocks below; okay. Random uniform on sphere: use `u = 2*Math.random()-1`, `theta`, etc. Or random normalized vector. Add.

  Star group follows camera position. If camera near ground, stars far. Depth test. Since sky sphere depthTest false, stars might render and then sky? Order: sky renderOrder -1000, stars -900. Both opaque/transparent; render sorting first by renderOrder then transparent. The renderer first renders opaque objects sorted; sky material transparent? We didn't set transparent, so opaque; renderOrder -1000. Stars material transparent=true, so transparent pass after all opaque objects. That means stars render after ground/ocean, with depthTest true and depthWrite false. They will be occluded by ground. Good. But transparent pass after rocket; stars could render over rocket if depthTest? Rocket depth buffer has depth; stars fragment behind rocket fails. Fine. Sky opaque with depthTest false at beginning. Good.
  Stars render after transparent smoke; they may blend over smoke? Depth test not written by smoke; stars behind smoke but transparent blending order could appear over smoke if stars rendered after smoke. Set stars renderOrder -900 maybe before smoke renderOrder 1? Transparent sorting respects renderOrder. Star renderOrder -900, smoke 10. Fine.

  Also atmosphere dome maybe.

- Sun light:
```
const sunDir = new THREE.Vector3(0.42,0.72,0.55).normalize();
const sun = new THREE.DirectionalLight(0xfff2df, 3.2);
sun.position.copy(sunDir).multiplyScalar(400); // position relative
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near=10; far=1200; left=-200...
sun.target.position.set(0, 30, 0); scene.add(sun.target);
```
  Light intensity in Three r155 physically correct, sun intensity 3.0 okay. Add hemisphere 0.55. Add ambient 0.15.

  Shadow map camera target 0,30. Shadow only near pad.

- Camera initial target. Camera near.

- Smoke system classes.

Let's detail TypeScript implementation.

Define:
```ts
type Vec3 = THREE.Vector3;

class Puff {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  age = 0;
  life = 1;
  size = 1;
  growth = 1;
  alpha = 1;
  seed = Math.random()*100;
  warm = 0;
  active = false;
}
```
Strict initialization okay. `Math.random()` field initializer valid.
Class fields all initialized.

`class PuffSystem { ... }`:
  fields: points: THREE.Points; geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial; particles: Puff[]; maxParticles: number; cursor=0; positions: Float32Array; sizes: Float32Array; alphas: Float32Array; colors: Float32Array; seeds: Float32Array; pscaleUniform? 
  constructor(max: number, color?, blending?, alphaMul?)
    create attributes; geometry.setAttribute with new THREE.BufferAttribute(...).setUsage.
    material from createPuffMaterial maybe.
    points = new THREE.Points(geometry, material); points.frustumCulled=false; scene.add.
  spawn(...)? Public.
  update(dt).
  clear().
  setScale(scale).
  Need a shared shader.

Shader code strings:
```glsl
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
attribute float aSeed;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uScale / max(-mv.z, 1.0));
  vAlpha = aAlpha;
  vColor = aColor;
  vSeed = aSeed;
}
```
Fragment:
```glsl
varying float vAlpha; varying vec3 vColor; varying float vSeed;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float r = length(p) * 2.0;
  if (r > 1.0) discard;
  float soft = smoothstep(1.0, 0.1, r);
  float n = 0.72 + 0.28 * sin(p.x*11.0 + vSeed) * sin(p.y*9.0 + vSeed*1.7);
  float a = vAlpha * soft * n;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}
```
But gl_PointCoord can produce blocky; okay.
  Use `transparent: true, depthWrite:false, depthTest:true, blending: THREE.NormalBlending` maybe for smoke; contrail use Normal. Additive white maybe overexposed. Smoke white normal. Fine.

  Points material needs `toneMapped` false? Not. ShaderMaterial toneMapped true default; output color white. Bloom might pick. Fine.

  `uScale` update in animate: compute `const scale = 0.5 * renderer.domElement.height * camera.projectionMatrix.elements[5]` maybe. camera.projectionMatrix.elements[5] is projectionMatrix[1][1]? Matrix elements column-major: elements[5] = m11 = 1/tan(fov/2) for perspective. Yes. Set both systems. `0.5*h*m11`. At fov 55 => 1.0; h=1080 => 540. Particle size 10m at 100m => 54 px. Good.

  `points.renderOrder = 10`.

  Particle update: iterate all, if active:
    age += dt; if age >= life -> deactivate.
    pos.addScaledVector(vel, dt);
    vel.multiplyScalar(Math.exp(-drag*dt)) maybe drag 0.6;
    vel.y += buoyancy*dt;
    size += growth*dt;
    alpha = baseAlpha * fade...
    set attributes.
  Need base alpha stored. `alpha` is current? Use `p.alpha` initial max. Compute. We'll store `opacity` maybe. Let's define `alpha` as initial opacity. On update, `const f = ...; const a = p.alpha * fade;`.
  Store `color` base? Could use `p.color: THREE.Color`. Add field `color = new THREE.Color(1,1,1)`. For warm: color set at spawn. During life, gradually desaturate? Not needed.
  Set array values for inactive: alpha 0. positions can stale. Need update all arrays and needsUpdate. For performance fine.

  `spawn(...)` parameters: position, velocity, size, growth, life, alpha, color, warm? Could define:
```
spawn(px,py,pz, vx,vy,vz, size, growth, life, alpha, color: THREE.Color): void
```
  To avoid many args? Use object options. Strict. Let's create `spawn(x,y,z, vx,vy,vz, size, growth, life, alpha, r,g,b)`. Many but fine.

  Puff fields colorR, colorG, colorB? Use numbers. Set p.r etc. Add fields.
  `p.warm` maybe not.

  Puff class:
```
class Puff {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  age=0; life=1; size=1; growth=1; alpha=0; seed=0;
  r=1; g=1; b=1; active=false;
}
```
  In update, color can be adjusted with age: no.
  We can set per-particle `warm` and compute:
```
const w = Math.max(0, 1 - p.age/3) * p.warm;
r = lerp(p.r, p.r, ...)...
```
  But simpler set warm color at spawn and fade. We'll add `warm` field and `baseR/baseG/baseB`. On update, warm factor:
```
const w = p.warm * Math.max(0, 1 - p.age * 0.35);
const r = p.r * (0.9 + 0.35*w);
const g = p.g * (0.85 + 0.15*w);
const b = p.b * (0.85 - 0.25*w);
```
  clamp. Good.

  Need `clear()` sets all inactive and alpha arrays 0, then needs update.

- Spawning smoke:
  We'll have `groundSmoke = new PuffSystem(900, 1)`; `contrail = new PuffSystem(700,...);`.
  Spawn function:
    `spawnGroundSmoke(dt, state, thrustActive)`:
      maintain emission accumulator based on sim time. But render loop dt ~ 1/60. At liftoff, spawn maybe 70 per second. Use accumulator:
```
let smokeAccum = 0;
if (thrustActive && sim.alt < 400) {
  smokeAccum += dt * (sim.alt < 20 ? 70 : 35);
  while (smokeAccum >= 1) { smokeAccum -= 1; ... }
}
```
    Need state values each frame; call after step.
    Two exits: For each particle choose side ±1, position:
      x = (Math.random()-0.5)*8;
      y = 0.5 + Math.random()*3;
      z = side*(41 + Math.random()*4);
      velocity: x random ±8, y 1+random*4, z side*(18+Math.random()*25) * (0.6+0.6*Math.random());
      size 7..18, growth 5..11, life 8..16, alpha 0.22..0.4, color 0.82..1.0, warm maybe 0.4 if near nozzle? Trench smoke white. 
    Also spawn around rocket at pad: position near (rocketBase x + random*4, 1+rand*5, z random*4), velocity radial outward 3..10 and up 2..6, size 6..14, warm 0.8 (lit by flame).
    But smoke at the center could obscure flame. Add moderate.
    Sim time < maybe 18? Liftoff steam should persist while rising. Use condition alt < 500, spawn continuously. At 500m after ~? 8s, smoke stops. Good.
  Use `thrustActive = simState.t < 200`.
  If paused, maybe still smoke update but no spawn? Sim time not advanced, but render should not emit if paused? Fine use thrustActive and smoke emission; if paused at t=5, still spawn continuously unrealistic. Could gate `if (!rocket.paused && thrustActive)`. For render loop, if paused no emission. But external step while paused should maybe. Use sim state changes? Simpler check `!sim.paused` for spawn. Good.

  Warm colors: `r=1.0`, `g=0.9`, `b=0.75` for close; trench `r=0.95,g=0.96,b=0.97`.

  "large billowing white steam and smoke clouds that roll sideways out of the flame trench along the ground and then rise." Velocity outward, buoyancy, drag. Good.
  Smoke should expand to hundreds of meters? At life 15s, growth 10m/s => +150m; initial 10 -> 160m. Big. Good. Alpha 0.3. 900 particles.

- Contrail emission:
  Accumulator `contrailAccum += dt`; while >0.25 and thrust. Spawn at rocket world center/plume with size 4..9, growth 1.5..4, life 80..150s, alpha 0.1..0.18, color light 0.9; velocity small random plus wind (2,0.5,-1). Drift slowly via vel. Since particles persistent, camera tracking sees them. Use max 700; oldest replaced. At high altitude, sizes maybe 8m. Could scale size with altitude? Use 5 + alt*0.0002 maybe.
  Need "contrail stays in the sky and drifts slowly." Yes.

  But Points particles at 100km far from camera may be behind camera? At ground tracking, they are ahead. Fine.
  For old contrail puffs near lower altitudes, when camera tracks up, old particles below view. Fine.

- Trail ribbon:
  Use `MAX_TRAIL_SAMPLES = 20000` pairs -> positions length 20000*2*3, colors? custom alpha. Make `trailGeom`. 
  Custom shader:
```
vertex: attribute float aAlpha; varying float vA;
fragment: uniform vec3 uColor; varying float vA; gl_FragColor=vec4(uColor,vA);
```
  transparent, depthWrite false, side DoubleSide.
  Positions; index? Use non-indexed triangle strip? Use `THREE.TriangleStrip` with pairs? A strip with vertices ordering [left0,right0,left1,right1...] doesn't create triangles properly unless each pair repeats? `TriangleStrip` draws triangles between successive vertices (0,1,2),(1,2,3) etc; with alternating sides, will create triangles that cross. Need use indexed triangles or duplicate pairs. A ribbon strip can be drawn as triangle strip with vertices: left0,right0,left1,right1,left2,right2; triangles (left0,right0,left1), (right0,left1,right1), (left1,right1,left2)... That's actually correct for a ribbon. Yes triangle strip with alternating sides yields quads. Good.
  Build each sample two vertices at z ±width/2. Use z offset. Width changes gradually.
  Vertex order: for i, positions[base] = (x, y, -w/2), positions[base+1] = (x,y,w/2). Then strip. alpha at tail small, at head bigger.
  Number of samples = min(trail.length, MAX_SAMPLES). If length > max, stride = ceil(len/MAX). Use every stride-th point. Each frame rebuild. For length <2, drawRange 0.
  Need head alpha maybe 1, tail alpha 0.1; based on i/(n-1) but rocket trail older at start. Tail (oldest) should fade. Set alpha = 0.15 + 0.65 * (i/(n-1)) maybe. But when rocket at 100km, old tail near ground should be visible white? Contrail should persist; fade old. Fine.
  Width at sample: `width = 3 + Math.min(120, sample.y*0.0006)` maybe at 100km -> 63. At lower -> small. Use 4 + alt*0.0009 max 140.
  Material color white; maybe opacity via attr.
  Need geometry bounding sphere large; set `frustumCulled = false` to avoid culling issues.
  For trail update, also include last point to rocket current? Trail updated once per step. fine.
  The ribbon may be invisible if the trail path only horizontal in x and altitude in y; camera from z sees it. Good.

  Set trailGeom.setDrawRange(0, count*2); needs update. Use DynamicDrawUsage on attributes. Rebuild `positions` each frame. If > MAX_SAMPLES, sampling down; set count. Alpha array.
  When reset trail length=0, update drawRange 0.

- Sim:
Define functions before render loop. Need reference `rocketGroup` and visual in animate. Sim object independent. `resetVisuals` uses functions defined later. We'll define `let clearVisualEffects: () => void = () => {};` before sim. In reset, call. But the effects are defined later; assign. Also the `rocketGroup` resets in animate.

- State retrieval:
```
function currentMass(t: number): number {
  if (t >= burnTime) return dryMass;
  return m0 + (dryMass-m0)*(t/burnTime);
}
function gravity(alt: number): number { ... Math.max(0,alt) }
function targetPitch(t: number): number {...}
function thrustAt(t:number, mass:number): number {
  if (t >= burnTime || t < 0) return 0;
  return Math.min(baseThrust, 3*mass*g0);
}
```
  At t 0, target pitch 0. At t=10 exactly 0, after begins. "after 10 s it starts to grow." Good.
  For `targetPitch` after 150: base 0.5; extra? Use extra small:
```
if (t <= 150) return 0.5 * s*s*(3-2*s) with s=(t-10)/140;
const extra = 0.45 * Math.min(1,(t-150)/300);
return 0.5 + extra;
```
  At 150 exactly 0.5. Never decrease. At 450 -> 0.95. Good. But `max(pitch, target)` ensures.
  At t=0 if target 0. At t<10 target 0 but max with previous. Fine.

  State `acc` net vertical acceleration. At reset 0? Could compute initial acceleration (2.943). Requirement reset time 0 rocket on pad; state maybe acc 0 or 2.943. Compute current net vertical acceleration at t=0 -> 2.943. On reset set acc = compute? Should reflect physics. Use `computeVerticalAccel()` after reset. Let's set acc=0? API maybe tests check 0 on pad. "state(): { ..., acc (net vertical acceleration)}". On pad at t=0 with thrust, net acceleration is 0.3g. Use actual. At reset set acc = 0? Hmm. If on pad and launch not started, maybe no thrust. But thrust formula active at t=0. T/W 1.3 at liftoff. Set 2.943. Better.
  State alt maybe 0. vel 0. pitch 0. t 0.
  reset function:
```
t=0; alt=0; vy=0; vx=0; x=0; pitch=0; acc=0;
trail.length=0;
clearVisualEffects();
```
  If tests check acc after reset maybe they expect 0. But API doesn't specify. Could set acc = computeVerticalAcceleration(0,0,0) = 2.943. I'll do that. But the rocket is "on the pad" and thrust at t=0; launch. Fine.

  `step(dt)`:
```
const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
if (safeDt > 0) {
  const n = Math.max(1, Math.ceil(safeDt / MAX_SUBSTEP));
  const h = safeDt / n;
  for (let i=0; i<n; i++) {
    pitch = Math.max(pitch, targetPitch(t));
    const mass = massAt(t);
    const thrust = thrustAt(t, mass);
    const g = gravity(alt);
    const ay = (thrust * Math.cos(pitch)) / mass - g;
    const ax = (thrust * Math.sin(pitch)) / mass;
    vy += ay * h;
    vx += ax * h;
    alt += vy * h;
    x += vx * h;
    if (alt < 0) { alt = 0; if (vy < 0) vy = 0; vx = 0? maybe horizontal doesn't matter; don't zero vx? rocket on pad, horizontal maybe zero initially. If falling with horizontal, could slide; zero? "cannot go below pad" only. Leave vx.
    t += h;
  }
}
acc = computeVerticalAcceleration();
trail.push({x, y: alt, z: 0});
```
  But pitch update uses t before increment. At t=149.99 to 150.01, target 0.5. Fine. `pitch` never decreases. However at reset pitch=0. After 150, extra.
  What about t beyond 200: thrust zero; mass dry; acc = -g. Good.
  If rocket lands? only alt clamp; after burn if it falls back, alt maybe returns to 0 at end; vy set 0; okay. `acc = -g` though at pad with no thrust. Fine.
  Horizontal x continues if vx>0 after landing? It might slide; not important.
  Note after burn at t>200, if rocket goes up and then falls, it may eventually hit pad. Fine.
  Need prevent alt below pad due negative dt no. Good.

  `trail.push` after every call, even dt=0, satisfying one per call. But reset then no step. Good.

  Potential huge dt causes trail one point. Good.

  `state(): RocketState { return { t, alt, vel: vy, acc, pitch }; }`.
  Maybe return copy to avoid mutation. Fine.

  Expose `paused: false` as property.

  We need physics use total velocity? Horizontal thrust; yes.

  Check trajectory approximate: at t=10 pitch starts; by 150 pitch 0.5; at 200 pitch ~? extra at 200 = 0.35*min(1,50/300)=0.058 => 0.558. Fine. At t=200, mass dry, thrust zero abruptly (real MECO). alt maybe compute. Let's quickly estimate with rough integration to ensure reaches >100km. Could do a rough discrete simulation mentally or approximate. We need be sure it reaches Karman line by burn? Let's estimate.

  Thrust acceleration = T/m ≈ 7.014e6/m. Mass decreases linearly to 220k. Integral. At time t, mass = 550 - 1.65 t (thousands kg), for t in s. Thrust accel = 7014.15 / (550-1.65t) kN? m in thousands: T 7014.15 kN? Actually 7.014e6 N = 7014 kN; m in kg. a = 7014.15/(550-1.65t) in kN per tonne? 7014 kN/550 t = 12.75 m/s². Good.
  Early vertical acc = 12.75*cos(p) - 9.81. At t=0 2.94; at t=10 mass 533.5 => a_thrust 13.15 => net 3.34. At t=50 mass 467.5 =>14.99, pitch target: s=(40/140)=.286, smooth=.195, pitch~0.097, cos .995 =>14.9-9.8=5.1. At t=100 mass 385 =>18.2, s=.643 smooth=.71, pitch=.355 cos .938 =>17.1-9.7=7.4. At t=150 mass 302.5=>23.2, pitch .5 cos .878 =>20.4-9.6=10.8. At t=200 mass 220 => thrust limited to 3mg => 3g =29.43, cos .85 =>25 -9.5=15.5. Average vertical acc maybe 8 m/s² over 200s -> vy ~1600 m/s; alt ~0.5*8*40000=160km. Yes reaches >100km. Good. Horizontal velocity also significant ~ maybe 800 m/s. Fine.

  However thrust limited to 3*m*g after m<238t at t≈189; then vertical acc jumps to 3g*cos - g ~15-16. Fine.
  At t=200 MECO; altitude maybe 100-150km. Good. Sky black.

- Visual rocket update after step:
```
const st = rocket.state();
rocketGroup.position.set(st.alt? x from internal not exposed; we need x. Add internal `x` but state doesn't expose. Animate can access via sim internal? Since sim defined in closure, we can keep references to sim variables? `state` only returns t, alt, vel, acc, pitch. Need horizontal x for render and trail. Trail's last point gives x and y. Use last = rocket.trail[rocket.trail.length-1]; if available. Or extend state with x? Extra field allowed but interface. We can return `x`? API specified exact object; extra okay. But TypeScript interface can include x optional. Better keep an object `simInternal` or expose `get position`. Use trail last. On first frame before step, trail empty; x=0. Use `lastTrail` or `sim.trail`. Sim step always occurs before animate update (unless paused at reset), then no trail. We can use `rocket.trail.length >0 ? last.x : 0`. But after reset paused, rocket at 0. Fine.
```
  Or add `x` to state return not declared? We can define interface with `x: number` extra. Tests destructure maybe ignore. Fine. But user specified state shape; extra field probably okay. To be safe, we can expose `state()` returning only specified fields, and have `__rocketPosition`? Hmm. Use trail.
  At each step, trail point pushed with x and y. In animate, read last point. Good.
  However if paused and trail empty, group y=0.

  `rocketGroup.position.set(last.x, last.y, 0)`; `rotation.z = -pitch`. The rocket base at last.y; pad top 0. Good.
  `rocketGroup.rotation.z = -st.pitch;`.
  Trail points follow base; contrail spawn at rocket position + rotated center offset. Use center target.

  Pitch in radians; rotation.z signs. Camera target center:
```
const cx = last.x + Math.sin(st.pitch) * 35;
const cy = last.y + Math.cos(st.pitch) * 35;
```
  if last missing x=0,y=alt (alt state), still.

  Flame opacity:
  `flameActive = st.t < 200 && thrust?` At t=0 yes; if paused at reset t=0, flame on. Good. But if t<0? no. Use `st.t < 200`.
  Plume group visible. Scale based on alt and flicker.
  At t<0? none.
  Flame light intensity flicker based on elapsed real time + random. Use noise function:
```
const flick = 0.75 + 0.25*Math.sin(now*0.031) * Math.sin(now*0.017+1.7) + ...
```
  Motion uses time (elapsed) for flicker; okay.

  At high altitude, flame longer; `const growth = Math.min(1, st.alt/100000)`. length = 10 + st.alt*0.002? At 100km -> 210; width = 1.5 + st.alt*0.0004 -> 41. Use factor with throttle. If MECO (t>=200), hide.

  Plume mesh scaling: geometry base height 10, radiusTop 1.5, radiusBottom 2.2. For length L: scale.y=L/10; scale.x = width factor; scale.z same. Position y = -L/2 + 0.5? Wait plume local to rocket; nozzle at y≈0.6. Plume top at y=0.6, extends downward. Geometry centered at origin vertically; scale y=L/10 => height L. Position y = 0.6 - L/2. Then bottom at 0.6-L. At liftoff L=12, bottom -11 below ground; okay hidden by pad/trench. At high alt L=210, extends 210m below; visible. Parent rotation tilts. Good.
  But if rocket pitched, downward thrust direction is along -local Y rotated; good.

  Core mesh same but smaller radius, length 0.7L, position.
  Glow sprite at nozzle position y=0.6; scale e.g. 12m; additive. At high alt maybe scale grows 20.

  Mach diamonds: group of small `OctahedronGeometry(1,0)` positions along local -Y at y = 0.6 - k*(L/6)? They should be inside plume near top. For k=1..4, local y = 0.6 - k*2.5 maybe; scale 1-2. Set material emissive additive. Visible if alt < 15000 and thrust. As L grows they stay near top? Actual mach diamonds at fixed location near nozzle; at altitude air thin fewer. Use y positions based on distance below nozzle: -2.5,-5,-8,-12 local; scale. When L > 20. At liftoff, visible. Hide above 20km. Add a group `machGroup` as child; update.

  Could use small cones with `MeshBasicMaterial({color:0xfff5c0, blending:AdditiveBlending, transparent:true, opacity:0.9, depthWrite:false})`.

  Also plume light. `flameLight.position.set(0, -2, 0)` child of rocketGroup? If PointLight child of rocketGroup, shadow? castShadow false. When rocket rotates, light rotates but position near base. Add to rocketGroup. PointLight intensity scales with flicker. Distance 300. Need light the pad at liftoff. Use intensity ~1000. Set color 0xffb060. At altitude, light still.
  Add second light white near nozzle with intensity 200.

  At t>=200 hide flame. But rocket may be in space; no flame.

- Camera shake: use time-based noise and throttle closeness. `camera.position.x += ...` after choose. But camera tracking each frame; add small shake if alt<200. Use `Math.sin(elapsed*41.3)*...`. This is motion using elapsed. Good. Only near pad. In long lens maybe less.

  Determine blend:
```
const blend = THREE.MathUtils.smoothstep(st.alt, 40, 400);
const nearPos = new Vector3(28, 8, 78);
const farPos = new Vector3(520, 22, 780);
const pos = nearPos.clone().lerp(farPos, blend);
camera.position.copy(pos);
camera.fov = THREE.MathUtils.lerp(52, 11, blend);
camera.lookAt(targetX, targetY, targetZ);
camera.updateProjectionMatrix();
```
  But at alt=0 and t=0, camera near. As rocket moves up, the near camera looks up; after alt 40 begins transition. Fine. Maybe transition later: 100-800 m. Use smoothstep(150,900,alt). At 900m long lens. Good.
  At near camera looking at rocket center 35m up from 85m away, angle ~22°. Good.
  Long position (480,15,720), distance ~860m; rocket at 35 m, angle small; fov 11. Good.

  For very high, target may be directly up. Camera at (480,15,720) direction to rocket; if rocket x moves horizontally, target moves; camera.lookAt. Good.

  Long lens FOV maybe 8. Set lerp 50 -> 9.5.

  Add subtle roll? no.

  The camera near pad initially sees rocket and tower. At high, stars.

- Sky/fog update:
```
const alt = st.alt;
skyUniforms.uAlt.value = alt;
starsMaterial.opacity = smoothstep(70k,100k,alt);
fogColor = groundFogColor.clone().lerp(new Color(0.03,0.05,0.09), smoothstep(30000,100000,alt));
scene.fog.color.copy(fogColor);
scene.fog.density = 0.00022 * (1 - smoothstep(0, 80000, alt)) + 0.000001;
```
  But at alt ground initial camera at ground, fog on pad slight. Set density 0.00012. That makes ground distant <10km haze. Ocean horizon. Use 0.00018. At high altitude reduce to 0.00002 maybe. Requirement aerial perspective. At ground, distant pale/bluer. Good.
  `sun.intensity` maybe 3.5.
  Background? Set `scene.background = new THREE.Color(0x000000)`? Sky covers. Fine.
  `renderer.setClearColor(0,1)`.
  Stars opacity. At 70km 0, at 100km 1. Requirement "stars must appear above about 70 km and are clearly visible above 100". Good.
  But if camera at ground and rocket at 100km, sky is black because sky shader alt 100km. It makes high noon ground dark in scene even though ground lit. That's stylized. Fine.
  Maybe mix sky to black only above 80km. Good.
  Fog color darkens.

  Ground/ocean still lit by sun in space? Sun same. okay.

- Sun brightness / exposure: no need.

- Post bloom:
```
const composer = new EffectComposer(renderer);
composer.setPixelRatio? EffectComposer has setPixelRatio; we already renderer pixel ratio. Use composer.setSize.
composer.addPass(new RenderPass(scene,camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.75, 0.6, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());
```
  Note RenderPass clears etc. Sky depth. fine.
  On resize `composer.setSize(width,height)`. Maybe `composer.setPixelRatio(renderer.getPixelRatio())` on init. Actually EffectComposer by default uses renderer size; with setSize. Add `composer.setPixelRatio(renderer.getPixelRatio());` before setSize? Constructor creates target based on renderer drawing buffer maybe. Use `composer.setPixelRatio(Math.min(devicePixelRatio,2));` then setSize. Fine.

  render loop: `composer.render()`.

- First-frame ready. `let hasRendered=false;` after composer.render(), if not then `(window as any).__ready = true`.

- Expose after creation. `__camera` maybe camera. Good.

- Need animation loop set with `renderer.setAnimationLoop(animate)` after all.

- Window resize updates camera and renderer and composer and bloom? composer.setSize handles. Also update `uScale` next frame. Fine.

- Potential TS issue: `window.innerWidth` etc in browser.

- Material names.

Let's code systematically.

Detailed code skeleton:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- utility ----------
function makeCanvasTexture(w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void, repeatX=1, repeatY=1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(repeatX,repeatY);
  tex.anisotropy = 8;
  return tex;
}
```
  For decal need ClampToEdge and no repeat; helper not suitable. Make separate.

`makeConcreteTexture`:
```
function concreteTexture(): THREE.CanvasTexture {
 const c=document.createElement('canvas'); c.width=512; c.height=512; ...
 const ctx = ...;
 ctx.fillStyle='#9c9b94'; fillRect;
 // random noise blocks
 for (let i=0;i<16000;i++){ const g=...; ctx.fillStyle=`rgba(...)`; ctx.fillRect(x,y,1,1);}
 // cracks
 for... 
 const tex = new THREE.CanvasTexture(c); tex.colorSpace=SRGB; wrap repeat; repeat(6,4); anisotropy.
 return tex;
}
```
  Avoid string template maybe.

Ground texture 1024:
  base #4e653b; noise speckles green/brown; patches. repeat 110? Ground plane 8000; texture repeat 80 means each tile 100m; okay. Use repeat 60. Need `tex.repeat.set(60,60);`.

Body texture 512x1024 white with subtle panel lines and smudges. Repeat maybe (1,1). CanvasTexture no repeat. Since cylinder UV wraps around 360 degrees, vertical lines across texture correspond to seams. Draw many vertical lines in light gray at x positions, horizontal at some. Fill #f2f1ea. Add subtle noise. Use anisotropy 8.

Marking texture 512x1024 transparent:
  ctx.clearRect; flag at x=70,y=170, width=220, height=120; stripes red/white 13 stripes; canton blue 100x60; white dots; text maybe "FALCON 9" at y=520 font 64; "SPACE LAUNCH" etc. Add black border. Use no external font (sans-serif). Since plane map transparent, use texture with alpha; set `tex.colorSpace=SRGB`. wrap clamp. `tex.premultiplyAlpha` no.
  Maybe plane material `transparent:true`, `alphaTest:0.05`, `depthWrite:false`.

- `makeRadialTexture` for sprite glow:
```
function makeGlowTexture(): THREE.CanvasTexture {
 const c=...256; const g=ctx.createRadialGradient(128,128,0,128,128,128);
 g.addColorStop(0,'rgba(255,255,240,1)'); ...; fill;
 const tex=...; colorSpace SRGB;
 return tex;
}
```
  SpriteMaterial map; `blending:AdditiveBlending`, depthWrite false. Great.

- Sim:
Place after utilities before scene or after scene. Needs clear reset callback. Define `let clearEffects = () => {};`.
Then sim object.

- Scene creation.

Let's write code.

Potential issue `MathUtils.smoothstep(x, min, max)` signature: `smoothstep(x: number, min: number, max: number): number`. Use.

- For stars:
```
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(STAR_COUNT*3);
const starCol = new Float32Array(STAR_COUNT*3);
for ...
 const v = new THREE.Vector3(Math.random()-0.5, Math.random()*? ...).normalize();
 starPos[...] = v.x*STAR_RADIUS;...
 const b=0.5+Math.random()*0.5;
 starCol...
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
starGeo.setAttribute('color', ...)
const starMat = new THREE.PointsMaterial({size: 1.7, sizeAttenuation:false, transparent:true, opacity:0, vertexColors:true, depthWrite:false, depthTest:true, fog:false, color:0xffffff});
```
  Is PointsMaterial `fog` property in type? Yes `fog?: boolean`. `sizeAttenuation` yes.
  Add to scene; set `frustumCulled=false`. Each frame copy camera position. Because star sphere centered same as camera; positions relative.
  Star radius 600000. Sky radius 850000. Camera far 2,000,000. Good.
  The star group should be a Group with points at 0; set group.position.copy(camera.position) each frame. Sky sphere also camera position.
  If stars are centered at camera, some behind, depth? Fine.

  Star visibility: maybe also multiply by dark sky; PointsMaterial color white and opacity. Good.

- Custom sky material.
  Use `depthWrite:false`, `depthTest:false`, `side:THREE.BackSide`, `fog:false`. ShaderMaterial doesn't have fog unless defines? It ignores.

- Add sun in sky? Fragment code. Need normalize uSun in shader or uniform already normalized. Fine.
  Add a visible bright sun disk. Tone mapping/bloom might make it.

- Sun directional light. Shadow camera. Add target.

- Ocean material add environment? no.

- For bloom threshold, bright flame. Sprite additive maybe values >1. With tone mapping, bloom sees before tone mapping? UnrealBloom uses render target after RenderPass. Fine.

- Build all.

Let's be careful with `EffectComposer` type and `OutputPass` import. TypeScript compile with three types includes these addons. Good.

- Potential issue use `THREE.SRGBColorSpace` exists.
- `renderer.outputColorSpace`.
- `texture.colorSpace`.

- Custom shader `gl_FragColor`; with WebGL2 and three GLSL3? Default ShaderMaterial uses GLSL1, gl_FragColor okay.

- `ShaderMaterial` with `vertexColors`? no.

- PuffSystem `material.uniforms.uScale` typed `THREE.IUniform`. Access `this.material.uniforms.uScale.value = scale;` TS knows `uniforms: { [uniform: string]: IUniform }`, so okay.

- `this.geometry.attributes.position` type `BufferAttribute | InterleavedBufferAttribute`; we can store references separately in fields. Use fields `positionAttr`, etc of type `THREE.BufferAttribute`. Set attributes. Then update `this.positionAttr.needsUpdate=true`. Good.

- `positionAttr.setUsage(THREE.DynamicDrawUsage)` returns BufferAttribute? yes.
- `Float32Array` assignment.

- PuffSystem spawn:
```
spawn(
 x:number,y:number,z:number,
 vx:number,vy:number,vz:number,
 size:number, growth:number, life:number, alpha:number,
 r:number,g:number,b:number,warm:number
): void {
 const p = this.pool[this.cursor];
 this.cursor = (this.cursor + 1) % this.max;
 p.active = true; p.age=0; p.life=life; ...
 p.pos.set(x,y,z); p.vel.set(vx,vy,vz);
 ...
}
```
  If overwriting active, okay.
  Set arrays only on update; can wait. But if no update before render, update called each frame. Fine.

  update(dt):
```
const positions = this.positions; ...
for (let i=0;i<this.max;i++) {
 const p=this.pool[i];
 const o=i*3;
 if (!p.active) { this.alphas[i]=0; continue; }
 p.age += dt;
 if (p.age >= p.life) { p.active=false; this.alphas[i]=0; continue; }
 const t = p.age / p.life;
 p.pos.addScaledVector(p.vel, dt);
 p.vel.y += 1.2 * dt;
 p.vel.multiplyScalar(Math.exp(-0.35*dt));
 p.size += p.growth * dt;
 const fadeIn = Math.min(1, p.age/0.8);
 const fadeOut = 1 - t;
 let a = p.alpha * fadeIn * Math.pow(Math.max(0,fadeOut),1.3);
 this.positions[o]=p.pos.x; ...
 this.sizes[i]=p.size;
 this.alphas[i]=a;
 // color
 const w = Math.max(0, 1 - p.age*0.4) * p.warm;
 this.colors[o] = Math.min(1, p.r*(0.85+0.4*w));
 ...
}
...
```
  Need `this.colors[o+1]`, etc. Fine.
  For inactive positions, leave previous. Alpha zero. For draw, fine.
  `size` initial; at spawn update attribute maybe next call; we update immediately in spawn with p.age? Could leave. First render after update.

  `clear()`:
```
for each p.active=false; fill alphas 0; attr needsUpdate.
```
  Then maybe `points.visible = true`.
  Add `dispose` not needed.

  `setScale(scale)`.

- Smoke spawn code:
```
function emitSmoke(dt: number, st: RocketState, rocketPos: THREE.Vector3, pitch: number): void {
  if (st.t >= 200) return;
  if (st.alt > 450) return;
  const rate = st.alt < 30 ? 80 : 45;
  smokeAccumulator += dt * rate;
  while (smokeAccumulator >= 1) {
    smokeAccumulator -= 1;
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) { if (Math.random() < 0.7?) ...}
  }
}
```
  Need exactly perhaps one particle per loop, with randomly choose side. Use 70/s total. For each:
```
const side = Math.random()<0.5?-1:1;
const z = side * (42 + Math.random()*3);
...
```
  Spawn size bigger. `groundSmoke.spawn(...)`.
  Also occasionally spawn near rocket:
```
if (Math.random()<0.35) { const angle=rand*2pi; radius=2+rand*5; ... spawn at rocketPos.x+cos*radius, y=1+rand*4, z=sin*radius; velocity outward 5..15; size 5..12; warm 0.8}
```
  But rocket base moves up; at early t, y=alt. If alt<450. Use world position `baseX, baseY`, not rocketPos center. Spawn around base. Good.
  If rocket is tilted, fine.
  `const baseX = lastTrail?.x ?? 0; const baseY = st.alt;`.
  During ascent at alt 300, ground smoke emitter at pad still? Could spawn at pad trench even when rocket high until alt 450; steam continues. Good. Could also spawn at rocket high altitude? no.

  Gate if `!rocket.paused`? If paused but initial, maybe no emission. We can pass `advancing` boolean from animation. Use `if (!didStep) return;` perhaps. The animation if paused doesn't step; smoke should still billow and settle, but not new. If manual step while paused maybe no emission until unpaused. Fine. Use `didStep`.
  But if paused at t=5, no more smoke while it dissipates; okay.

  Sim time changes with min(delta,1/30), so emission accumulator based on dt real, not sim; fine.

- Contrail emission:
```
let contrailAccumulator=0;
function emitContrail(dt, st, baseX, baseY) {
 if (st.t >= 200 || st.alt < 20) return;
 contrailAccumulator += dt;
 while (contrailAccumulator >= 0.22) {
   contrailAccumulator -= 0.22;
   const jitter=...; 
   contrail.spawn(baseX+jitter, baseY+30+..., ... , 6+..., 2..., 120, 0.14, 0.85,0.9,0.95,0);
 }
}
```
  But if simulation step is manual with big dt while paused, dt real small and no spawn. Okay. Could base emission on sim time change instead. Better: track `lastContrailTime` and spawn for each 0.2s of simulated time advanced, regardless real dt. In animate, after step, `const newT = st.t`. Use `while (contrailSpawnTime < st.t) ...` with step 0.25. This ties to simulation time, good. Reset sets contrailSpawnTime=0. But if step huge, many puffs; cap maybe. Since tests may call step(100), we could spawn 400 puffs; max 700 okay. Use loop with limit. Implement global `lastContrailSimTime` reset to 0. In animate:
```
if (!paused && st.t > lastContrailSimTime) {
  const stepT = 0.25;
  let ts = lastContrailSimTime + stepT;
  let count=0;
  while (ts <= st.t && count < 80) { spawn; ts += stepT; count++; }
  lastContrailSimTime = st.t;
}
```
  Need rocket position at historical times for trail, not just current. Could spawn at trail points. Since trail has points once per step, for contrail puffs use current base at each 0.25s not exact. Simpler spawn at current rocket position each 0.25s; with dt small one per some frames. Fine. Or use trail points to place puffs at past positions? Could iterate recent trail points. But current is okay.

  Clear visual sets lastContrailSimTime=0.

  However if animation dt and sim step min 1/30, st.t increases. Good. We can spawn based on sim time.

  `emitContrail` function receives st. Use accumulator with sim time.

  Smoke emission based on sim time too? Use `smokeEmitTime`; while time advances < maybe t<30 and alt<500, spawn at rate 60 per sim second. This ensures tests stepping huge produce smoke, but may spawn tons. Cap per frame. The visual is render-loop driven; use `dt`. Hmm. Since requirement "motion uses delta/elapsed", both okay. Use real dt for smoke update, sim time for emission rate. Simple:
```
let lastSmokeTime = 0;
function emitSmokeForSimulation(st, baseX, baseY) {
 if (st.t < 0 || st.t > 40 || st.alt > 600) { lastSmokeTime = st.t; return; }
 const rate = 55;
 let count = 0;
 while (lastSmokeTime + 1/rate <= st.t && count < 120) { lastSmokeTime += 1/rate; spawn... count++; }
 if (st.t >= 40) lastSmokeTime = st.t;
}
```
  But at t after 40 steam stops suddenly; liftoff steam lasts 30s. Fine.
  Since sim starts at 0, first frame t=0.016, no spawn until t>1/55. Good.
  At 40s rocket alt maybe >1km; no pad smoke. We also gate alt<600. Set until t<25 or alt<600.
  Count 55*25=1375 but pool 900 recycles. Good.
  Spawn two clouds per tick maybe one; rate 70. Use 70. Max 900. Fine.
  But if test calls step(30) paused? The render loop if not paused? If they call step manually while paused then unpause, smoke emission? Our emission uses st.t; but animation only if didStep. If paused no. They might not care visuals. Fine.

  Sim initial t=0; no smoke until 0.014s; near liftoff immediate.
  Need clear effects reset lastSmokeTime=0, lastContrailSimTime=0.

- In animate, `const didStep = !rocket.paused; if didStep rocket.step(min(delta,1/30));`. Then st. If didStep and st.t ... emit. If paused after manual step, render won't update until unpaused. Fine.

  But tests might set paused=true at start and inspect the scene? Not relevant.

  The requirement says "The render loop calls step(min(delta, 1/30)) when not paused." Do exactly. If delta from clock is e.g. 0.016. Use `Math.min(delta, 1/30)`. Good. We may also use `clock.getDelta()`. Fine.

  For smoke visual while paused, still update with delta. Good.

- `rocket.paused` type boolean.

- `resetVisuals` should clear smoke, contrail, emitters, trail geometry, flame; and set rocket group identity? Animate will. Good.
  Implement after systems:
```
clearEffects = () => {
  groundSmoke.clear();
  contrail.clear();
  smokeSpawnTime = 0;
  contrailSpawnTime = 0;
  updateTrailGeometry();
};
```
  Need function declaration hoisted? Define after. In sim reset call uses current `clearEffects`. Before defined, default no-op. Fine.

- Sim object creation before visuals; after creating visuals assign.

- The trail geometry update needs rocket.trail. Define after. On reset, sim.reset invokes clearEffects which calls updateTrailGeometry; if geometry not defined yet at initial? reset initial not called after? We won't call reset initially; sim state initialized. Fine. If reset called after, defined.

- Initial sim t=0, but no trail; drawRange 0.

- Sky and star updates every frame.

- `__ready` after render.

- Need avoid using `window` before body. Document body exists. Good.

Let's write exact code.

Potential TypeScript strict issues in shader strings? no.

Potential `OutputPass` import may not exist in older @types? The three package version likely current. We can avoid OutputPass if unsure. But likely. User expects addons. Use.

- Three's `EffectComposer` `render()` may require `delta`? no.

- `renderer.setAnimationLoop(animate);` animate signature `function animate(): void` may accept no args and be assignable to callback? If setAnimationLoop expects function with parameters, a zero-arg function is assignable in TS (fewer args allowed). Use `(time: number)`.

- `document.body.style.margin = '0';` etc.

- The canvas fills screen via renderer size; body no overflow.

- `window.addEventListener('resize', onResize);`.

- Need set camera.aspect and updateProjectionMatrix in onResize. But animate sets camera fov each frame; onResize still.

- Camera projection update in animate when fov changes every frame; calling `camera.updateProjectionMatrix()` each frame. Fine.

- If camera position changes and fov changes, projection.

- Puff uniform scale update after camera.updateProjectionMatrix.

- Use `renderer.domElement.height` actual drawing buffer? after setPixelRatio yes. `renderer.domElement.height` is actual buffer height attribute. Good. But `camera.projectionMatrix.elements[5]` from last update. Set after camera update. Then `puffScale = 0.5 * renderer.domElement.height * camera.projectionMatrix.elements[5]`. Wait `projectionMatrix.elements[5]` is m11 = 1/tan(fov/2), yes. For FOV 55, m11=1.92; h=1080 => 1037. A 10m particle at 100m -> 103 px. Maybe large. Actual world-to-pixel: pixels = size / (2*z*tan(fov/2)) * viewportHeight = size * h / (2*z*tan) = size * h * m11 / (2z) = size * (0.5*h*m11)/z. Correct. Good. At z=100, 10m -> 103px. fine.

- For smoke at ground (size 20m, camera distance 50m), huge; may cover screen. That's realistic billowing. PointSize max may be 1024; okay.
  Maybe initial size 3..8, growth 4..10; at 5s size 30. Camera 80m, 30m at 80 -> 350px. Big clouds. Good.

- Points sorting/depth. custom shader `depthTest:true`, `depthWrite:false`. Render order 10. They blend. Fine.

- Transparent smoke near camera can obscure the rocket completely at liftoff. Use moderate rate 55/s and alpha .25. Good.

- Shadows on smoke not, but lit not.

- Add ambient fog scene. Fog affects standard materials only; ShaderMaterial smoke no fog. Fine.

- Could set `points.material.fog`? ShaderMaterial has fog false by default; no.

- Ground texture using CanvasTexture with `repeat` and `wrap`. Need ensure color space.

- For InstancedMesh bushes, `setColorAt` needs `mesh.instanceColor!.needsUpdate = true`. After loop:
```
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
```
  Type `InstancedBufferAttribute | null`. Fine.
  Geometry: `new THREE.IcosahedronGeometry(1, 1)`; scale non-uniform. Use `dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);`.
  Use `matrixAutoUpdate` no.
  Color random green.
  Set `mesh.receiveShadow = true`.
  Position random annulus: radius between 120 and 3500. But avoid ocean beyond; ground plane only. Use angle around; positions. For a Florida coast, green scrub around.
  Maybe cluster. Fine.

- Buildings and roads:
  Helper `addBox`.
  Roads: long strips at y=0.02.
  Main road along z at x=260, width 12, length 3000; another along x at z=220 etc. Add dashed center lines as small white boxes (20) maybe. Use 20 dashes. Fine.
  Buildings: 10 low gray boxes around (x ±200..800, z -200..-1000). Height 5-20. Use `MeshStandardMaterial` colors. Add roofs maybe. Fine.

- Lightning masts: `addLatticeMast`.
  Need efficient. Use shared strut geometry. Function:
```
const strutGeo = new THREE.CylinderGeometry(1,1,1,5,1,true); // radius 1 unit height
function addStrut(group: THREE.Group, ax,ay,az, bx,by,bz, r, mat) {
 const a = new THREE.Vector3(ax,ay,az); const b = new THREE.Vector3(bx,by,bz);
 const dir = b.clone().sub(a); const len = dir.length();
 if (len < 1e-4) return;
 const mesh = new THREE.Mesh(strutGeo, mat);
 mesh.position.copy(a).addScaledVector(dir, 0.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
 mesh.scale.set(r, len, r);
 mesh.castShadow=true; mesh.receiveShadow=true;
 group.add(mesh);
}
```
  Scale `r` is radius; geometry radius 1 height 1. Good.
  But geometry radiusTop 1 radiusBottom 1; scaling x/z r, y len. fine.
  `openEnded` true for cylinder maybe visible hollow; use radialSegments 5 closed? `CylinderGeometry(1,1,1,5)` with caps; creates many triangles. Use 5. Fine.

  `addLattice(group, cx, cz, width, height, levels, radius, mat)`:
```
const half=width/2;
const pts = corners local...
for each level l=0..levels:
  y0 = l*(height/levels), y1=...
  for each corner: vertical from y0 to y1
  horizontal at y1 connecting corners around square
  diagonals on faces for each segment
```
  Need avoid duplicates; fine. Add base plate box.
  Tower width 5, height 80, levels 16. radius 0.14. Masts width 3, height 95, levels 14, radius 0.12. Number ~ tower: vertical 4*16=64; horiz 4*16=64; diagonals 8*16=128 =>256. Masts 4*(4*14+4*14+8*14)=4*224=896. Total 1152 meshes too many. Reduce masts to 3? 4 masts × levels 10 × (8+8?) ~640. Still okay but many draw calls. Could use LineSegments for lightning masts instead of meshes. Let's implement masts lattice as `LineSegments` to reduce draw calls, but shadows? lines don't cast shadows. Tall lattice masts still visible. Requirement lattice lightning-protection masts; lines okay but less realistic. Could create one merged geometry? Without BufferGeometryUtils addon, could use InstancedMesh for struts. Better: use InstancedMesh for lattice struts with matrices. But varying lengths and rotations; can use one instanced cylinder geometry and set matrix per strut. That yields one draw call and casts shadows. Build all lattice struts into one InstancedMesh. Nice.

  Implement a `LatticeBuilder` class or function collecting matrices then produce InstancedMesh. For tower and masts with same material, combine into one InstancedMesh. But tower may have different radius. Use same geometry scaled per instance. Use `InstancedMesh(unitCylinder, steelMat, maxCount)` with matrix scale. Strut positions use matrix compose. Need quaternion. We can collect `THREE.Matrix4[]`. Create one InstancedMesh with count. CastShadow true. Great.

  Simpler: create a global `steelStruts: THREE.Matrix4[]`; function addStrutMatrix(ax...r) pushes matrix. After adding tower/masts, create InstancedMesh with count. But tower and masts need all geometry. Use a helper `StrutBatch`:
```
const strutMatrices: THREE.Matrix4[] = [];
function pushStrut(ax,ay,az,bx,by,bz,r): void {
 const start = new THREE.Vector3(...); ...
 const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
 const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(r, len, r));
 strutMatrices.push(m);
}
```
  Build all, then:
```
const latticeGeo = new THREE.CylinderGeometry(1,1,1,5);
const latticeMat = new THREE.MeshStandardMaterial({color:0x5a5f63, roughness:0.7, metalness:0.8});
const latticeMesh = new THREE.InstancedMesh(latticeGeo, latticeMat, strutMatrices.length);
for i setMatrixAt.
latticeMesh.castShadow=true; receiveShadow=true; scene.add(latticeMesh);
```
  Great. Use one draw call. Need ensure matrices count >0. Fine.
  Add tower swing arms as separate boxes, not lattice. Masts lines/wires as Line.

  Build lattice function adds struts to batch. Tower at x=11, z=0. Masts at four corners x=±50,z=±50 with height 95. Add mast head red lights maybe.

  `addLattice` uses local points:
```
function addLattice(cx:number, cz:number, width:number, height:number, levels:number, radius:number): void {
 const hw=width/2;
 const corners = [[-hw,-hw],[hw,-hw],[hw,hw],[-hw,hw]];
 const yAt = (l:number)=> (l/levels)*height;
 for (let l=0;l<levels;l++) {
   const y0=yAt(l), y1=yAt(l+1);
   for corners vertical
   // horizontal at y1 and maybe y0? top and bottom
   for i corners horizontal from corner i to i+1 at y1
   // diagonals on faces: corner i at y0 to corner (i+1)%4 at y1; and corner i at y1 to corner i+1 at y0 maybe add one per face for zigzag
   for i=0..3: addStrut(cx+corner[i][0], y0, cz+corner[i][1], cx+corner[(i+1)%4][0], y1, cz+corner[(i+1)%4][1], radius*0.7)
   // horizontal at bottom only l==0? skip? Add at y0 for base maybe.
 }
 // top ring
}
```
  This creates 4 vertical +4 horiz top +4 diagonal per level = 12*16=192. Fine. Masts 4*12*12=576 total 768 instances. Good.
  Tower height 78, width 6, levels 18. Masts height 96 width 4 levels 14. Total maybe 4*(4+4+4)*14=672 + tower 216=888. Instanced fine.

  Add diagonal cross on each face both directions? one enough.

  Tower arms: boxes at y=35 and y=58 from tower to rocket; box length ~8, width 1, height 0.6. At x=6? tower center 11, near rocket x=1.85; arm from x=8 to 2. Add hinge. White/dark. Could be okay.
  Add cables/umbilical lines: use TubeGeometry or Line. A line from tower y=40 to rocket y=40? Not needed.

  Lightning wires: Use `THREE.Line` with points from mast tops to a central point above rocket. Use `BufferGeometry.setFromPoints(points)`. Material LineBasicMaterial dark gray, transparent .6. Could add 4. They don't cast shadows. Fine.

- Pad concrete slabs:
  Material concrete texture repeat 8,4. `MeshStandardMaterial({map: concreteTex, color:0xbfc0b8, roughness:0.95})`.
  Create left/right slabs; maybe one slab for z ends? central slot open along entire z. Build floor at y=-2.2.
  Use:
```
const slabGeo = new THREE.BoxGeometry(45,3,100);
const left = new Mesh(slabGeo, concreteMat); left.position.set(-27.5,-1.5,0); ...
```
  UVs repeat according to box; texture may stretch. Fine.
  Add front and back walls at z=±50? central trench exits; not wall.
  Trench floor: BoxGeometry(10,0.5,100) at y=-2.5 dark.
  Trench side walls inside x=±5 at y=-1.2, box 1x3x100, dark gray concrete or steel.
  Add scorched strip around exits: plane dark.
  Add ramp at z=±55 maybe using box rotated x? A ramp of length 20 rising; not necessary.
  Add pad edge stripes yellow around? Could add yellow lines along slab edges. Nice.

  Pad base/ground: large concrete hardstand? fine.

  Launch mount at center: four boxes at (±4,2,±4) size 2x4x2 with metal mat. A base ring under rocket? Add circular ring using CylinderGeometry(6,6,0.6,24) at y=3, dark metal with hole? It would intersect rocket; maybe hold-down ring at y=2.5 around base. Use `TorusGeometry(3.2,0.18,8,24)` rotated x PI/2 at y=2.5 metallic. Add 4 hold-down clamps. Fine.

  Add flame deflector: a curved or angled box under rocket at y=-1.5? Use wedge via BufferGeometry? Simple box rotated 45° at y=-1.5. Could be hidden by flame/smoke. Add.

- Rocket's base at y=0. The engine section bottom at 2.5, nozzles down to 0.6. Ring at y=2.5 could intersect engine. It's okay.

- Add "strongback" tower / umbilical. Good.

- Shadows for ground: receiveShadow true. For huge plane and shadow camera around pad, shadow works near.

- Haze: fog and ocean. Add a distant horizon strip of land? Add some low tree line using instanced bushes at z=-2500 maybe. Ocean beyond. Fine.

- Renderer shadow map at high pixel ratio; map 2048. Good.

- We may need `camera.layers`? no.

- Sky star points with depthTest true might not appear because sky dome doesn't write depth, but other far objects? Stars at 600k, no geometry there; depth buffer clear means far; pass. However ocean plane far 60000; stars beyond, depth test passes if ocean doesn't cover at high alt? At high alt camera looks up, no ocean. Good.

- Fog affects ground/ocean with high altitude dark color; distant haze. Fine.

- Sim physics exposed. Need exact `__rocket`. Use `(window as any).__rocket = rocketSim;` maybe also `__rocketSim`.

- `__ready` after first composer.render.

- Add a clock: `const clock = new THREE.Clock();`. First getDelta maybe 0. Good.

- The renderer canvas appended to body. No HTML.

- Need maybe hide cursor? no.

- Performance: many shadows from rocket/tower; okay.

- `shadow.camera` type OrthographicCamera; TS accesses `sun.shadow.camera.left` etc. DirectionalLightShadow camera property typed OrthographicCamera. Fine.

Let's write the code in detail now.

Potential TypeScript issue in window assignments:
```
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```
  okay.

- Use `const MAX_SUBSTEP = 0.02;`

- Need `rocketSim` expose trail array type. Define interface and object:
```
interface RocketState { t:number; alt:number; vel:number; acc:number; pitch:number; }
interface TrailPoint { x:number;y:number;z:number; }
interface RocketSim { reset():void; step(dt:number):void; state():RocketState; trail:TrailPoint[]; paused:boolean; }
```
  Then `const rocketSim: RocketSim = { paused:false, trail, reset, step, state }`. But methods need access to internal variables; define arrow functions or function declarations before. Use local variables and methods in object:
```
const rocketTrail: TrailPoint[] = [];
let simT=0, simAlt=0, simVy=0, simVx=0, simX=0, simPitch=0, simAcc=0;
...
const rocketSim: RocketSim = {
  paused: false,
  trail: rocketTrail,
  reset(): void { ... },
  step(dt: number): void { ... },
  state(): RocketState { return {...}; },
};
```
  Inside methods, `this.paused` not needed. `trail` closure. `reset` calls `clearVisualEffects();`. Need clearVisualEffects declared before with `let`.
  `computeAcc` function uses current.
  In step, compute after loop. `simAcc = netVerticalAcceleration(simT, simAlt, simPitch);`. Need mass and thrust.
  `netVerticalAcceleration(t, alt, pitch)`:
```
const m = massAt(t);
const T = thrustAt(t,m);
const g = gravityAt(alt);
return (T*Math.cos(pitch))/m - g;
```
  At t>=200 T=0.
  At reset simAcc = netVerticalAcceleration(0,0,0) => 2.943.
  If user expects 0 maybe. Hmm. Could set simAcc = 0 at reset to indicate not moving. But state after first step becomes. I think physical acceleration 2.943 more correct. The phrase "rocket on the pad" maybe state acc 0? I'd lean to actual. But tests might check `state().acc` after reset? Unlikely. They may check T/W. 2.943 indicates 1.3 T/W. Let's use actual.

  At step dt, pitch update inside loop before t increment. After loop `simAcc = computeNetVerticalAccel(simT, simAlt, simPitch)`. Note if t>200 no thrust. Good.

  Push trail after updating. `rocketTrail.push({x: simX, y: simAlt, z: 0});` This is one per call. For reset initial no trail. Good.

  "fixed substep of at most 0.02 s": n = ceil(dt/0.02), h=dt/n. if dt is huge 1000, h=0.02 exactly if divisible; okay. Floating. At most 0.02. Use `Math.max(1, Math.ceil(safeDt / MAX_SUBSTEP))`. if dt=0.0200000001 n=2 h=0.01; fine.

  If dt is not finite or <=0, skip integration but still push. If NaN, `Number.isFinite` false skip. Good.

  Mass at t: if t >= 200 dry; if t<0 m0; else. ThrustAt t if t<0? 0 or base? For t<0 not used. If t>=200 0. `if (t < 0 || t >= BURN) return 0;`
  At t=199.999, mass ~220000.9; thrust limited. Good.

  Pitch never decreases: `simPitch = Math.max(simPitch, targetPitch(simT));` before acceleration. At t=0 target 0. Good. If dt huge, one pitch update per substep, not each micro? h<=.02 so okay.

  Horizontal acceleration only thrust. After burn vx constant. `simX += simVx*h`.
  Altitude clamp after integration. If alt<0 set 0, vy max 0, maybe x continues. "cannot go below pad". Good.
  Could rocket re-launch? no.

  Time and trail: `simT` might go beyond 200. Fine.

- One nuance: pitch target uses time `simT`, but after updating within loop at t=0 then integrate to 0.02; target at 0.02 still 0. Good.

- `paused` when true animation doesn't step. User can still step manually. Good.

- `reset` should perhaps set `paused` false? The spec lists paused separately. Do not change paused. But initial visuals clear. Good.

- We need update visuals when reset occurs outside frame. Animate picks state. Fine.

- Clear effects function assigned after creation. In reset, if `clearVisualEffects` defined. Good.

Now scene.

Let's maybe define constants and helper. Need be mindful code length. User asks single file; can be long. We have token budget 128k; okay. Aim ~1500 lines? We can write ~1100 lines. Need ensure compile.

Let's draft in mind all code.

Utility:
```ts
function makeCanvas(w: number, h: number): HTMLCanvasElement { ... }
function get2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D { const ctx=...; if(!ctx) throw...; return ctx; }
```
  Simpler:
```ts
function canvas2d(w:number,h:number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context unavailable');
  return {canvas, ctx: context};
}
```
  Type of context is CanvasRenderingContext2D. Good.

Ground texture:
```ts
function createGroundTexture(): THREE.CanvasTexture {
 const {canvas, ctx}=canvas2d(1024,1024);
 ctx.fillStyle='#4f6538'; ctx.fillRect(0,0,1024,1024);
 for (let i=0;i<42000;i++){
   const x=Math.random()*1024, y=Math.random()*1024;
   const g=30+Math.random()*70;
   const r=30+Math.random()*60;
   const b=20+Math.random()*40;
   ctx.fillStyle=`rgba(${r|0},${g|0},${b|0},${0.15+Math.random()*0.5})`;
   const s=1+Math.random()*4;
   ctx.fillRect(x,y,s,s);
 }
 // patches
 for (let i=0;i<180;i++){ ctx.fillStyle=`rgba(${...},0.12)`; ctx.beginPath(); ctx.ellipse(...); ctx.fill(); }
 // paths? no
 const tex = new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.repeat.set(64,64);
 tex.anisotropy=8;
 return tex;
}
```
  Color numbers. Use string template. TS fine.

Concrete texture:
  base #a8a69d, noise. Cracks lines.
  repeat set per material? Canvas texture used in material map; clone to set different repeats? We can use one for pad with repeat(8,8). For buildings maybe not. Fine.
  concrete map wrap repeat 6,6. Texture repeat applies to all UV.

Body texture:
  Canvas 512x1024 white with subtle grey noise and panel seams. Need no repeat? Set wrapS Repeat? Cylinder UV; set Clamp? Use RepeatWrapping both. No set repeat. Texture maybe on cylinder with UV from 0..1. Fine.
  Draw base #f4f3ee, noise. Vertical seam lines at x = 80,180,300,430 with `rgba(120,120,115,.28)` 2px. Horizontal rings. Use white smudges.
  For engine? separate.

Marking texture:
  `const {canvas,ctx}=canvas2d(512,1024); ctx.clearRect(...)`.
  Draw flag near y=180. Canvas coordinate y down; plane texture mapped with y up? Texture flipY true by default, so top of canvas appears top of plane? For CanvasTexture, flipY true default; UVs of PlaneGeometry: top left uv (0,1), so canvas top? With flipY, image is flipped; the top of canvas maps to v=1 -> plane top. Good.
  Draw flag at x=80,y=140 width=220 height=120. Text below.
  Flag stripes: 13 alternating red/white; canton blue at top-left. Draw `ctx.fillStyle='#b22234';` etc. White stripes. Canton #3c3b6e. Stars white small circles. simplified.
  Text: `ctx.fillStyle='#2a2a2a'; ctx.font='bold 74px Arial, sans-serif'; ctx.textAlign='center'; ctx.fillText('FALCON 9', 256, 500);` Maybe letter spacing no. Another smaller "SPACE LAUNCH SYSTEM"? Avoid. "REUSABLE" maybe. Use "FALCON 9" and "SPACEX"? Realism. Add "FALCON 9" and "SPACE LAUNCH". User says lettering. Fine.
  Add vertical black text? no.
  Texture `minFilter=LinearMipmapLinearFilter`.
  Set `tex.anisotropy`.

Glow radial texture:
  canvas 256; create radial gradient. Color stops: 0 white alpha1; 0.2 yellow .9; 0.5 orange .4; 1 transparent. Additive. Use `THREE.SRGBColorSpace`.

Ocean waves texture? Not needed. But "procedural textures for concrete, ground and vegetation". Vegetation texture? Could use ground texture and instance colors. Maybe create a bush material with a canvas texture with green noise? Not necessary but requirement says procedural textures for concrete, ground and vegetation. We can create a vegetation texture and apply to bush material. A small 256x256 noise with dark/light green, wrap repeat. The bushes use UV sphere-like but okay. Create `vegetationTexture`. Or we can use ground texture as scrub. Better make. Bush material map with canvas noise, roughness 1. Use on InstancedMesh. Fine. Texture repeat maybe 1,1 but small; okay.

Let's implement `createVegetationTexture` similar.

- Sky ShaderMaterial:
Need `uSun: { value: THREE.Vector3 }`. Set uniform.
  Vertex shader uses `vWorldDir`? If sphere centered at camera, local position direction works. But sky sphere has position camera; geometry local positions centered; normalize position. Use.
  Fragment:
```
uniform vec3 uSun;
uniform float uAlt;
varying vec3 vDir;
float hash(vec2 p){...}
void main(){
 vec3 d = normalize(vDir);
 float y = d.y;
 vec3 horizon = vec3(0.66, 0.79, 0.88);
 vec3 zenith = vec3(0.075, 0.32, 0.68);
 float t = pow(clamp(y,0.0,1.0), 0.48);
 vec3 col = mix(horizon, zenith, t);
 float below = smoothstep(0.03, -0.12, y);
 col = mix(col, vec3(0.56,0.65,0.63), below*0.7);
 float sf = smoothstep(70000.0, 110000.0, uAlt);
 vec3 space = vec3(0.004,0.008,0.018);
 col = mix(col, space, sf);
 // airglow band?
 col += vec3(0.02,0.06,0.16) * (1.0 - smoothstep(0.0,0.25,abs(y))) * sf * 0.4;
 float sd = max(dot(d, normalize(uSun)),0.0);
 col += vec3(1.0, 0.92, 0.78) * pow(sd, 1200.0) * 4.0;
 col += vec3(1.0, 0.68, 0.38) * pow(sd, 10.0) * 0.18 * (1.0 - sf);
 gl_FragColor = vec4(col, 1.0);
}
```
  Sun disk pow 1200 maybe tiny; radius ~2.5°? Actually pow(sd,1200) for angular radius sqrt(2/1200) ~0.04 rad=2.3°, large. Fine.
  Need use `uAlt` uniform; if altitude >100 km black.

  The sky sphere radius 900000; camera at position; camera far 2M. Good.

- Star `Points` use `size` 1.6 and sizeAttenuation false; with high DPR maybe 1.6 px. Fine. Use 2200 stars.
  `starMat.opacity = 0`.
  star positions full sphere; points material with `depthWrite:false`. Add `toneMapped:false`? PointsMaterial has toneMapped property. Set false maybe for white. Not necessary.
  Set point colors.

- Lights:
  `const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x56603f, 0.6); scene.add`.
  `const ambient = new THREE.AmbientLight(0xffffff, 0.06)`. Maybe unnecessary.
  Sun directional intensity 3.4, color 0xfff0dc. With ACES exposure 1.0.

  Shadow:
```
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 1200;
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.8;
sun.target.position.set(0, 20, 0);
scene.add(sun); scene.add(sun.target);
```
  Position = sunDir * 600? Need shadow from direction. `sun.position.copy(sunDir).multiplyScalar(500)`. Target origin. Direction from position to target = -sunDir. If sunDir is direction from world toward sun, light should be located at +sunDir. Yes. Shadow camera direction toward target. Good. But if sunDir y .72, distance 500, height 360; shadow camera far 1200. Fine. Ground.

- Camera initial:
```
camera.position.set(30, 8, 78);
camera.lookAt(0, 35, 0);
```

- Build pad and environment before rocket.

- For shadows on instanced bushes: receive only. Fine.

- Rocket:
```ts
const rocketGroup = new THREE.Group(); scene.add(rocketGroup);
```
  Add engine section, body, bands, fairing. White material uses bodyTex.
  Need geometry positions local.

  `addCylinder(radiusTop, radiusBottom, height, y, material, segments=32)`: position y. Use Mesh. For body y center.
  Body from y=9.5 to 53 -> height 43.5 center 31.25. Radius 1.85.
  Engine section from 2.5 to 9.5 height 7 center 6, radius 1.86, dark. Nozzles bottom.
  Interstage from 53 to 56 height 3 center 54.5, dark. Maybe body continues white then dark band. Use dark.
  Upper stage cylinder from 56 to 62 height 6 center 59, white. It may be narrower 1.85 same.
  Nose lathe: create points for y local 0..8; position y=62. Points: (0,0)? Lathe needs first point radius at y. Use Vector2(x,y). Start (1.86,0), (1.86,0.8), (1.75,2.0), (1.55,3.5), (1.2,5.2), (0.7,6.5), (0,8.0). LatheGeometry(points, 40). The first point radius 1.86 at bottom y=0; last 0 at y=8. Good. Material white. `geometry.computeVertexNormals()` maybe.
  Total top 70.
  Add separation line ring at y=62.
  Add black band at y=61.5? Fairing base maybe thin dark line. Add torus or thin cylinder.
  Add second smaller black band at y=8.5? Engine section already dark.
  Add COPV bumps? not.

  Nozzles: 3x3 grid. `const nozzleGeo = new THREE.CylinderGeometry(0.33,0.55,1.7,16,1,true);` Position y=1.4 center. But open ended; use two materials? Use nozzleMat side DoubleSide maybe. Add inner dark. Maybe add a small inner cylinder emissive? 
  positions x/z [-1.1,0,1.1], center? Outer ring radius 1.25. Use grid -1.1,0,1.1. Good.
  `mesh.position.set(x, 1.4, z)`; bottom y=0.55. Nice.
  Add center nozzle too. Nine.
  Add a base heat shield ring at y=2.5 with CylinderGeometry 1.86,1.86,0.4 maybe dark.

  Landing legs: 4 boxes size 0.55x20x0.2 at y=18, positioned x/z radius 1.9, rotated. Attach along body. Color dark gray. A box oriented vertical; at angle around. Use `leg.position.set(Math.cos(a)*1.88, 18, Math.sin(a)*1.88); leg.rotation.y = -a;` The box's z thickness .2 extends along radial? Box width .55 x height 20 x depth .2; rotated y. Fine. Maybe 4. They may intersect decal? okay.
  Grid fins: 4 boxes 1.6x1.3x0.12 at y=51.5, positions radius 2.0, rotation y. Add grid pattern via small bars? Could add a grid texture canvas with transparent grid? Simpler add two thin bars inside? Not necessary.
  Add black stripe at y=52? interstage.

  Decals: plane at z=1.87; front; and back rotated. Use MeshStandardMaterial transparent; `polygonOffset`? Put at z=1.88, body radius 1.85, so 0.03 outside. Good. `decal.rotation.y = 0` for +z face. For back rotate y=PI. For x sides maybe not. Add one at x=1.87 rotated y=PI/2? The plane normal +Z; rotate y=PI/2 -> normal +X, position x=1.87. Add. Might be fine. Add front and back only maybe.
  Plane width 4.2, height 8.5; position y=35. Texture 512x1024 ratio .5, plane .494. good. It spans y 30.75..39.25. Flag and text. Fine.
  White body has panel lines; decal visible.

  Rocket group base y=0. Set initial. Add to scene.

  Plume:
  Create `plumeGroup`.
  `outerPlumeMat`, `corePlumeMat` shaders. Could define function `makePlumeMaterial(core:boolean)`.
  Vertex:
```
varying vec2 vUv;
varying vec3 vPos;
void main(){ vUv=uv; vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
```
  Fragment:
```
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;
void main(){
 float y = vUv.y; // maybe
 float n = 0.7 + 0.3*sin(vUv.x*40.0 + uTime*30.0) * sin(vUv.y*18.0 - uTime*20.0);
 float edge = smoothstep(0.0,0.15,vUv.x) * smoothstep(1.0,0.85,vUv.x); // cylinder uv x edges
 float alpha = 0.5 + 0.5*sin(...); 
 vec3 col = mix(uColorA,uColorB, clamp(y,0,1));
 gl_FragColor = vec4(col, alpha * edge * n * ...);
}
```
  For cylinder, UV v bottom/top; we don't know. Use `vUv.y`; maybe top = 0? In Three CylinderGeometry, v goes from 0 bottom to 1 top? Typically uv.y = 1 at top? For cylinder, generateTorso sets uv.y = v? It might be 1 - v. Regardless, we can make gradient symmetric or use vPos.y local? vPos.y ranges -5..5; normalized. Use `float yy = clamp(vPos.y/10.0 + 0.5,0.0,1.0);` to get top/bottom. For outer, make white at top and orange at bottom. Use vPos local.
  Additive with depthWrite false, side DoubleSide, transparent. Blend.
  But the shader alpha if many overlaps. Fine.
  `uColorA` white-yellow, `uColorB` orange. `uTime` updates.
  Maybe use `toneMapped: false`? If false, additive bright colors bypass tone mapping; bloom threshold works. ShaderMaterial `toneMapped` property exists. Set true default; okay.

  Outer geometry `CylinderGeometry(1.5, 2.8, 10, 24, 4, true)`. Radius top 1.5 at nozzle, bottom 2.8. Actually exhaust expands downward; bottom wider. Good.
  Core geometry `CylinderGeometry(0.75, 1.2, 10, 20, 2, true)`. White/yellow. Additive.
  Position local via scaling; store base geometries and meshes.
  `outerPlume = new Mesh(outerGeo, outerMat)`, `corePlume`.
  Add to plumeGroup, which is child of rocketGroup, at y=0.7? Wait mesh geometry centered y=0; we will set mesh position.y = -L/2. Parent plumeGroup at y=0.7? Better: plumeGroup.position.set(0,0.7,0); meshes local center at y = -L/2. `plumeGroup` itself not scaled. 
  In animate:
```
const L = ...; outerPlume.scale.set(widthScale, L/10, widthScale); outerPlume.position.y = -L/2;
core scale ...
```
  Parent at nozzle y .7. Good.
  Note rocketGroup rotation applies.
  Add glow Sprite to `plumeGroup`, position y=0, scale. `Sprite` position relative. Since plumeGroup at y=.7, sprite at y=0. Good.
  Add a second sprite behind.
  Mach diamonds child of plumeGroup at local positions y = -3, -6, -9 etc. But plumeGroup base at 0.7, so okay. They should be inside the plume; use small octahedrons with additive. Need each visible until alt<25km. Scale maybe 1.3. Since plume length changes, they remain near top; okay.
  Flame light child of rocketGroup at y=1? But rocketGroup rotation; light position near base. Add to rocketGroup. It will also move. Fine.
  PointLight intensity updated. Add a second point light white smaller.

  Plume group visible when thrust.

  At t=0 flame on. Good.

- Sprites: `new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color:..., blending:AdditiveBlending, depthWrite:false, transparent:true, toneMapped:false }))`. `toneMapped` exists on SpriteMaterial. Scale 20. At high altitude, scale maybe 30.
  Add 3 sprites: core (white), outer (orange), long glow. `sprite.center` default .5.

- Smoke Points created after rocket maybe.

- Ground smoke colors; use scene.

- Camera and update.

- Trail ribbon create.

Let's implement `updateTrailGeometry()`:
```ts
const MAX_TRAIL_SAMPLES = 24000;
const trailPositions = new Float32Array(MAX_TRAIL_SAMPLES*2*3);
const trailAlphas = new Float32Array(MAX_TRAIL_SAMPLES*2);
const trailGeom = new THREE.BufferGeometry();
const trailPosAttr = new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage);
const trailAlphaAttr = new THREE.BufferAttribute(trailAlphas,1).setUsage(THREE.DynamicDrawUsage);
trailGeom.setAttribute('position', trailPosAttr);
trailGeom.setAttribute('aAlpha', trailAlphaAttr);
trailGeom.setDrawRange(0,0);
...
function updateTrailGeometry(): void {
 const pts = rocketSim.trail;
 if (pts.length < 2) { trailGeom.setDrawRange(0,0); return; }
 const count = Math.min(MAX_TRAIL_SAMPLES, pts.length);
 const stride = Math.max(1, Math.floor(pts.length / count));
 let out = 0;
 for (let i=0;i<pts.length;i+=stride) {
   const p=pts[i];
   if (out >= MAX_TRAIL_SAMPLES) break;
   const altWidth = 4 + Math.min(140, p.y * 0.0012);
   const z0 = -altWidth*0.5, z1=altWidth*0.5;
   const o=out*6;
   trailPositions[o]=p.x; ... p.y ...
   ...
   const t = out / Math.max(1, count-1);
   const a = 0.12 + 0.65*t*t; // or smooth
   trailAlphas[out*2]=a; trailAlphas[out*2+1]=a;
   out++;
 }
 // ensure last point included? Optional.
 trailPosAttr.needsUpdate = true; trailAlphaAttr.needsUpdate = true;
 trailGeom.setDrawRange(0, out*2);
}
```
  But triangle strip with drawRange count out*2 and vertices alternating; yes.
  Need set `trailGeom.boundingSphere` or `frustumCulled=false`. Set line mesh.frustumCulled=false. Good.
  Width uses p.y; at high alt big; at ground small.
  If trail length huge, stride floor maybe produces count slightly > max? `Math.floor(pts.length/count)` could be 1 if length < count; if length>max, stride=floor(length/max) >=1; sampled out <= ceil. We cap. Good.
  But if `pts.length` e.g. 24001, stride=1, out reaches 24000 leaves last; okay.
  t = out/(count-1) but out may count-1. Fine.
  Alpha head 0.77, tail 0.12. Good.

  Material:
```
const trailMat = new THREE.ShaderMaterial({
 uniforms: { uColor: { value: new THREE.Color(0xf6fbff) } },
 vertexShader: `attribute float aAlpha; varying float vAlpha; void main(){ vAlpha=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
 fragmentShader: `uniform vec3 uColor; varying float vAlpha; void main(){ gl_FragColor=vec4(uColor,vAlpha); }`,
 transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.NormalBlending
});
```
  `trailMesh = new THREE.Mesh(trailGeom, trailMat); trailMesh.renderOrder=5; trailMesh.frustumCulled=false; scene.add`.
  Use `THREE.TriangleStrip` default for BufferGeometry is TriangleStrip? Actually BufferGeometry drawMode default is TriangleStrip? Wait THREE.BufferGeometry default drawMode is Triangles? In modern three, `BufferGeometry.drawMode` not property; renderer uses `geometry.index ? :` and `geometry.drawRange`. `Mesh` always uses Triangles unless `geometry.index`? Actually BufferGeometry has `setDrawRange` but no drawMode; `Mesh` uses `TriangleStrip`? No, `Mesh` renders triangles. `THREE.Mesh` with non-indexed BufferGeometry treats vertices as triangles, not strip. To use triangle strip, need `THREE.Mesh`? There is `THREE.Mesh` with `geometry.setDrawRange` but no primitive mode. In WebGLRenderer, `renderBufferDirect` calls `renderer.renderBufferDirect` with mode based on object type: Mesh = Triangles, Line = Lines, Points = Points. BufferGeometry drawRange count. So a triangle strip as Mesh would produce triangles between vertex 0,1,2, 3,4,5 etc, not correct. Need build indexed geometry triangles or use `THREE.TriangleStrip`? There is no Mesh mode. Actually old BufferGeometry had drawMode; removed. Need build triangles with indices or duplicate vertices.

  Build ribbon triangles indexed:
    For each sample pair, create 2 vertices. For each segment i between samples, create 6 indices (two triangles): indices base0, base0+1, base2; base0+1, base3, base2. Need IndexBufferAttribute. Preallocate Uint32Array(MAX_SAMPLES*6) and set drawRange? With index, drawRange counts indices. Use `setIndex(new BufferAttribute(indices,1))`; update indices. `setDrawRange(0, segmentCount*6)`. Vertex count = samples*2. Alpha per vertex.
  Yes. Use indexed triangles. Build indices each update based on out.
  Preallocate `trailIndices = new Uint32Array(MAX_TRAIL_SAMPLES*6)`. Set attribute. In update, for s=0..out-2:
    const b=s*2;
    idx[k++]=b; idx[k++]=b+1; idx[k++]=b+2;
    idx[k++]=b+1; idx[k++]=b+3; idx[k++]=b+2;
  Update index attr needsUpdate. `setDrawRange(0, k)`.
  Geometry `setAttribute` etc. Good.
  Need index attribute type. `const trailIndexAttr = new THREE.BufferAttribute(trailIndices,1);` but `Uint32Array` supported. `setIndex(trailIndexAttr)`. `trailGeom.setDrawRange(0,0)`.
  Use `trailIndexAttr.setUsage(DynamicDrawUsage)`.
  Mesh material side DoubleSide. DepthWrite false. Good.
  Frustum culling false.

  Since camera may be inside ribbon? fine.

- Postprocessing.

- Animation:
```ts
const clock = new THREE.Clock();
let hasRendered = false;
let starOpacity = 0;
const targetVec = new THREE.Vector3();

function animate(now: number): void {
  const delta = Math.min(clock.getDelta(), 1/30);
  // if clock first delta huge? clamp.
  if (!rocketSim.paused) {
    rocketSim.step(Math.min(delta, 1/30));
  }
  const st = rocketSim.state();
  const last = rocketSim.trail.length > 0 ? rocketSim.trail[rocketSim.trail.length - 1] : null;
  const bx = last ? last.x : 0;
  const by = st.alt;
  rocketGroup.position.set(bx, by, 0);
  rocketGroup.rotation.z = -st.pitch;
  // flame
  const burning = st.t < 200 && st.t >= 0;
  const flick = ...
  const altFactor = Math.min(1, st.alt / 100000);
  const plumeLength = 10 + altFactor*280; ... but at 0 10? Use 10 + Math.min(280, st.alt*0.0028) = 10 at 0? Actually st.alt*0.0028 at 100km =280; good.
  const plumeWidth = 1 + Math.min(25, st.alt*0.00025);
  plumeGroup.visible = burning;
  if (burning) { update scales; light; sprite; mach; }
  // emit smoke/contrail
  if (!rocketSim.paused) { emitSmokeForTime(st,bx,by); emitContrailForTime(st,bx,by); }
  // update puff positions with delta
  groundSmoke.update(delta);
  contrail.update(delta);
  // trail
  updateTrailGeometry();
  // camera
  const blend = smoothstep(st.alt, 120, 800);
  ...
  // sky/fog
  ...
  // star follow
  starField.position.copy(camera.position);
  sky.position.copy(camera.position);
  // uScale
  ...
  // composer
  composer.render();
  if (!hasRendered) { hasRendered = true; (window as any).__ready = true; }
}
```
  Need `now` parameter unused? Use for flicker? We can use `elapsed = clock.elapsedTime`? `clock.getElapsedTime()`? We can use `now * 0.001` from animation time for flicker. But motion must use delta/elapsed; `now` is elapsed from setAnimationLoop in ms. Use `const time = now * 0.001;` for flicker. But if `now` undefined? setAnimationLoop passes time. Use.
  Maybe `clock.elapsedTime` from getDelta. Use `const elapsed = clock.elapsedTime;` after getDelta. It updates. Use.
  `const delta = Math.min(clock.getDelta(), 1/30);` clock.elapsedTime updated. Use `clock.elapsedTime`.
  When tab hidden clock delta huge clipped, okay.
  On the first frame `clock.getDelta()` may be 0; sim doesn't step; ready after render. Fine.
  `emitSmokeForTime` after step.
  Puff update uses delta.

  Need update machine for `didStep`; if paused no emission. But smoke should still update.

  The simulation started only when unpaused. Initial paused false. Good.

  Camera:
```
const nearPos = new THREE.Vector3(28, 7, 76);
const farPos = new THREE.Vector3(520, 18, 760);
const blend = THREE.MathUtils.smoothstep(st.alt, 80, 900);
camera.position.set(
  nearPos.x + (farPos.x-nearPos.x)*blend,
  ...
);
camera.fov = THREE.MathUtils.lerp(52, 10, blend);
// shake
const shake = (1-blend) * (st.t>=0 && st.alt<150 ? 0.25 : 0.03) * (burning?1:0);
camera.position.x += Math.sin(elapsed*33.1)*shake;
camera.position.y += Math.sin(elapsed*27.7+1.3)*shake*0.7;
const cx = bx + Math.sin(st.pitch)*35;
const cy = st.alt + Math.cos(st.pitch)*35;
camera.lookAt(cx,cy,0);
camera.updateProjectionMatrix();
```
  Wait if blend based on alt and at t=0 alt=0, near. As rocket leaves, blend. At alt 900, far. Good.
  For high altitude, rocket may move in x; target. Good.
  But camera far position at z=760, x=520: looking from southeast; ocean behind? At start background ocean behind -z. Long lens position also +z, still ocean background. Good.
  At high altitude looking up, sky black. Good.

  `camera.near=0.5`. Update fov.

  Camera shake should not destabilize at high alt; blend reduces.

  At t after burn flame off but smoke stops? ground smoke updates/fades; contrail stops. Good.

  `plumeGroup.visible = burning;` If not burning, flame lights set intensity 0, mach visible false. Fine.

  Flame scale:
```
const length = (10 + Math.min(300, st.alt*0.0025)) * (0.9 + 0.2*Math.random())? random per frame not time-based? Motion should use delta/elapsed not frame counts; random flicker is okay but could use sin elapsed. Use flicker.
const widthScale = 1 + Math.min(28, st.alt*0.00025);
plumeOuter.scale.set(widthScale, length/10, widthScale);
plumeOuter.position.y = -length/2;
plumeCore.scale.set(0.7*widthScale, length*0.75/10, 0.7*widthScale);
plumeCore.position.y = -length*0.75/2;
```
  Mesh positions in plumeGroup; both start at y=0. Core length shorter. Good.
  Glow sprites at y=0; `glow.scale.setScalar(8 + Math.min(20, st.alt*0.00015) + flick*2)`. Sprite parent plumeGroup at 0.7. Add a second.
  For point light: `flameLight.intensity = 1200 * flick * (1 - Math.min(0.6, st.alt/200000))`. Flicker uses elapsed and sin. Color. `flameLight.distance = 300`.
  Light white: intensity 400.
  Mach diamonds: positions local in plumeGroup. Visible if alt<25000; scale set. The mesh positions constant y -2.4,-4.8,-7.2,-9.6; set. At high alt hide. Each mesh opacity maybe flicker. Use shared material? If same opacity all. Use array. Set `machGroup.visible`. For size, octahedron 0.8. Additive white-yellow. Good.

  Fire in trench: At alt<20, the plume points into pad; add a bright light below maybe. The flame itself will be visible under the rocket; pad may hide but smoke. Fine.

- Rocket group shadow: each mesh castShadow. Set traverse after build:
```
rocketGroup.traverse((obj)=>{ if (obj instanceof THREE.Mesh) { obj.castShadow=true; obj.receiveShadow=true; }});
```
  TypeScript `obj` Object3D; `if (obj instanceof THREE.Mesh)`. Mesh type. Fine.
  Sprite no shadow. Plume no cast? Mesh with additive and depthWrite false should not cast shadow. If traverse after adding plume, it would set plume castShadow true; bad. Do traverse before adding plume, or set plume castShadow false. We'll build rocket body, add, traverse, then add plume. Good.
  Actually plumeGroup added after. Fine.

  Lattice instanced mesh castShadow.

- Add pad/tower functions before rocket.

- Environment order: scene, sky, lights, ground, ocean, vegetation, roads/buildings, pad, masts, rocket, smoke, trail, post.

- Use constants.

Let's ensure no external assets. All canvas textures.

- Possible strict error: `renderer.info` etc no.

- `THREE.MathUtils.smoothstep` returns number.

- `new THREE.CylinderGeometry(0.33, 0.55, 1.7, 16, 1, true)` constructor type. Good.
- `new THREE.LatheGeometry(points, 40)` points type `THREE.Vector2[]`.
- `new THREE.TorusGeometry(3.4, 0.18, 8, 32)` okay.
- `THREE.InstancedMesh` set matrix. Good.

- For ocean: `new THREE.PlaneGeometry(60000, 60000, 1, 1)` far; y=-0.6, position z=-16000. If ground plane ±4000, horizon ocean beyond. Ocean extends toward camera to z=14000; lower than ground so hidden. Good. But if ground plane is finite 8000, ocean appears beyond. At camera ground z=76, ground horizon? Ground plane extends 8000, ocean beyond at z<-4000. With fog density 0.00016, at 4km fog factor exp(-(0.00016*4000)^2)= exp(-0.4096)=0.66; visible pale. Good. Ocean color blue and hazy.
  Horizon line maybe at 4 km; height of camera 7m, horizon distance 9km on flat. Ocean visible beyond 4km. Fine. The plane edge of ground may show a straight line; use fog and coastline. Add a "beach" strip maybe at z=-4000. Not needed.

  Maybe ground plane 12000 to horizon; ocean at z=-8000. Use ground 12000x12000. Then horizon farther, fog. But camera can see ground edge. Fog hides. Use ground 10000. Ocean at z=-12000 huge. Fine.
  Let's set ground 12000x12000; ocean 80000x80000 at z=-25000. Near edge z=-? ocean plane centered -25000 size 80000, extends to +15000, under ground hidden. Ground extends to -6000. Ocean visible beyond -6000. Good.
  Horizon at ~9km, ground edge 6km, fog hides. Fine.
  But ground plane geometry 12000 with texture repeat 100, each tile 120m. Good.

  Roads etc.

- Coastline: Florida coast ocean east. If ocean behind pad (north), not quite. Could put ocean to the east (x positive) and camera looking toward pad from southwest? Requirement ocean on horizon behind the pad. We can put ocean behind (negative z) and call it coast, okay.

- Bush distribution: radius > 140, but ground extends 6000. Use 1400 instances within radius 3000; positions random in square? Use polar. Need avoid pad/tower and roads? Fine.
  Add tree line near horizon maybe.

- Buildings positions: avoid pad. Add at x 250..1000 z -100..-1500. They may be behind rocket, visible. Low buildings.
  Use simple boxes with rooftop AC units. Maybe 8.

- Roads: main road behind pad at z=-250 running x; another perpendicular; asphalt. Make with `PlaneGeometry(3000,10)` rotated; y=0.01; color 0x3e4144 roughness 0.8. Dashed lines with small white plane boxes maybe 30. Use shared material. Good. Not shadows? receive.

- Pad top slightly above ground: y=0; ground -0.1, okay. Launch mount.

- Need no ground below pad to hide trench. Ground plane is at y=-0.12 but trench floor at -2.6, open hole might show ground plane through? The trench slot is open, but ground plane under pad at y=-0.12 would cover the trench floor, appearing at near y=0. That ruins trench. The ground plane is at y=-0.12; trench floor at -2.5, so ground plane would occlude. We need avoid ground plane under pad. Options: raise ground plane? No. Make pad slab top at y=0 and ground at -0.15; the trench slot should be dark, but ground plane at -0.15 is only 0.15 below pad top, so it would fill. Need cut ground or put an opaque dark trench box above ground? Could make trench visible as dark strip at y=0.015 with side walls, no actual hole. Simpler: pad slab covers entire area including trench top dark, with a shallow dark rectangle. The flame will hit it, smoke spawn. "concrete pad with a flame trench" can be visual with dark recessed strip. Use two slabs plus a dark trench floor at y=-2.5, and a large ground plane at y=-3? Or move ground plane lower globally to -3? That would lower terrain, with pad raised 3m, okay. But rocket base at y=0; ground at -3, pad top 0, realistic hardstand elevated. Ocean at -3.2. Then trench floor -2.5 is above ground, still no hole? The central slot between slabs is open; ground plane at -3 below trench floor -2.5, so trench floor visible. Good. Terrain around pad at -3? That makes launch pad 3m high, fine. But bushes at y=-3, buildings. Camera. Need launch pad ground with slope? Could be okay, but rocket altitude measured from pad; visual alt relative world. Rocket group y=sim.alt; pad top 0. Ground at -3. Good. The pad is a raised concrete platform. Real pads are slightly raised. Let's do ground y=-2? Pad top 0. Trench floor -2.5 below ground, but ground plane under slot still at -2; trench floor -2.5 below ground hidden by ground plane? Ground plane at -2 would cover trench. The open slot doesn't remove ground plane; it sees ground at -2. So need ground plane below trench floor at -2.5. Set ground y=-3.5. Trench floor -2.5, visible. Pad slabs top 0 height 3 => bottom -3; ground -3.5. Good. Trench floor at -2.6. Fine.
  Surrounding terrain at -3.5 while pad top 0; 3.5m high pad. Maybe realistic-ish. Add a sloped ramp/berm? Not needed. Camera near pad sees pad as raised slab. Ground around may be lower; okay. Add a concrete ramp from pad to ground at edge? Could add box sloped. Not essential. Requirement "concrete pad with flame trench." Raised pad fine.
  But the ocean horizon from low camera at y=8 still okay. Ground at -3.5.
  Buildings at y=-3.5 base.

  However `alt` cannot go below pad; clamp 0. Rocket base at pad top 0. Good. If alt 0, nozzles y=0.55 above pad; flame downward to -10, into trench/open slot. The pad slab top 0; trench slot center open; flame goes down. Great.
  Trench exits at z=±50; smoke spawn at y=0.5? At ends, pad top 0; okay.

  Ground plane at -3.5; pad side walls visible. Add side skirts.

- But requirement "flat land" and pad; okay.

- Bushes y=-3.5.

- Camera at y=8 looking low; launch pad 3.5m high. Fine.

- The tower base at ground -3.5 but tower height 80; our lattice addY from 0 maybe base on pad? Put tower base at y=0 (pad top), same as rocket. Lightning masts base at ground y=-3.5 or pad top? Put around pad top 0. Fine.

- Pad dimensions 100x100, top 0. Ground -3.5. Side skirts drop. Add four side boxes. Slabs height 3 centered -1.5 top 0. bottom -3.0 above ground -3.5. Good.
  Trench floor at -2.7.

- Launch mount at y=2? Box support top y=3.5 maybe intersects nozzles bottom 0.55. If support at corners, fine. Rocket held at base. No need.

- Camera near pad at y=8 (ground level 0?) It's on a tripod at pad level? Could be at (28,8,78) where y=8 absolute, 11.5 above ground, like an elevated camera. Fine.

- Rocket on pad: nozzles bottom 0.55; base ring.

- The lightning masts wires at high.

- Use scene.fog influences building.

- Ground smoke spawn y=0.5 at trench exits, but the trench exits are at z=±50 and the pad side; smoke rolls along pad top y=0. It should roll out along ground. Spawn y=1.5. It rises. Fine.
  At liftoff flame goes down into trench; smoke exits both ends.

- The flame may clip through trench floor; additive bright. Fine.

- Maybe add a flame trench "deflector" wedge under rocket and visible flame spraying sideways out exits. We could add two small flame cones at trench exits? Not required but nice. At liftoff, if alt<30, spawn a flame sprite at z=±45 y=1, horizontal? Could be. But requirement large steam. Maybe skip.

- Use `rocketGroup.traverse` for castShadow; pad/tower shadows.

- Bloom strength maybe 0.9 to make flame. `UnrealBloomPass(new Vector2(w,h), 0.9, 0.6, 0.72)`.
  At high sun, bloom on sun too. Fine.

- Output pass. No sky addon. Requirement says "e.g. Sky addon or your own shader"; own shader satisfies.

- "atmospheric scattering in the sky" our shader simple gradient/sun, okay. Could include Rayleigh-like:
```
float sunAmt = pow(max(dot(d, uSun),0.0), 8.0);
col += vec3(1.0,0.75,0.5)*sunAmt*0.25;
```
  Good.

- "Aerial perspective (distant things paler and bluer)" fog.

- "stars clearly visible above 100 km" yes.

- "Contrail stays in the sky and drifts slowly." line + puffs drift. Need puffs update drift independent of time? We update with real dt. They drift as long as render. Good. But if camera has moved upward with rocket? Ground camera. Contrail puffs at high alt; visible. Good.
  Contrail particle size at very high alt: 6-12m, camera distance 100km, 0.1 px, invisible. Need larger particles/contrail for visibility. Requirement visible white contrail; ribbon width maybe 140m at 100km, visible. Contrail puffs 10m not visible. Could scale puffs with altitude to e.g. 80m at 100km. Use `size = 8 + st.alt * 0.003` => at 100km 308m, visible. Real contrails expand. Use growth 3. At 100km, size 308m, at 300km 908m huge; but far. Good. Also ribbon width 4+alt*0.002 = 204m at 100km. Good.
  Contrail puffs lifetime 120s, while rocket may travel 100km in 200s. The puffs stay at old positions. Good.
  But if we spawn large 300m puffs at 100km, points shader will render; yes.
  Make contrail puffs size = 5 + alt*0.0025, growth 2..5; at 100km 255m. Alpha 0.1. Fine.
  At low alt size 5-10. Ribbon width = 4 + min(200, alt*0.0018). Good.

- Smoke points near camera may be huge and block view. The flame and rocket eventually visible. Fine.

- Sky at high alt black, stars. Sun still. Fine.

- Stars points follow camera; if `starField.position.copy(camera.position)` then stars move with camera, no parallax. Good.

- At high altitude camera still ground at y 8, stars overhead. The sky shader space. The ground below remains visible if camera looks down; not. Good.

- If rocket alt high, camera target high; camera pitched up; ground/pad not in view. Stars.

- Need fog update based on alt. Fog density decreases. But at high alt the ground/ocean down below might be foggy; not visible. Fine.

- Could add a "ground haze" horizon color. Sky.

- Ensure renderer clear color maybe black.

- Add `scene.background = new THREE.Color(0xbfd4e5);` but sky covers. Fine.

- Ready after first render.

- No external assets.

Let's think about tests:
  - They may import file with tsc strict; ensure no implicit any and all types.
  - They may run in headless; WebGLRenderer perhaps. No issue.
  - `__rocket` available immediately after script executes; yes.
  - `trail` same array after reset; yes.
  - `step` substeps; yes.
  - paused; yes.
  - render loop step min(delta, 1/30) when not paused; yes.
  - Camera tracking, sky, etc.

  They may test physics numeric:
    After reset, state: t=0, alt=0, vel=0, pitch=0.
    Step(1): substeps 50 ×0.02. Thrust. alt should ~? use linear mass per substep. Our mass uses t at beginning; pitch 0 for first 10s. Acceleration vertical ~2.943.. maybe alt 1.47. Good.
    Thrust limit: maybe test `acc` at late burn <= 2*g? At t=199, acc = min(T,3mg)/m*cos - g <= 3g*cos - g. Good.
    If they step 200 times 1s, trail length 200. Fine.
    `state().pitch` at t=150 should be ~0.5. Our function uses t after 150, step resolution: if step(150) with substeps, after loop t=150, pitch reached target at last substep before t=150? At simT=149.98 target 0.4996; after t=150, acc compute doesn't update pitch? Actually inside loop at t=149.98, pitch max target 0.4996; then t becomes 150.0. After loop, simPitch still 0.4996, not exactly 0.5. state pitch ~0.4996. Good "about 0.5". If step(150.02), next substep t=150.0 target 0.500? max. Fine. Never decreases.
    "pitch never decreases" yes.

    They may test gravity at alt 0 g=9.81; yes.
    Mass dry after 200; thrust zero; acc = -g. Yes.
    `vel` vertical. If they test horizontal maybe no. Fine.

    `acc` "net vertical acceleration" after integration; our computed at state. At t=0 reset actual 2.943. After step, correct.
    Thrust T formula exact 1.3*m0*g0. Using `g0` constant. Yes.
    "limited to 3 * m * g0 (throttle)" We use limit based on current mass. Good.
    Burn 200. Good.

  Potential issue in thrust limit test: At t=0, T=7,014,150; 3m g=16,186,500, not limited. Good.
    At t=200 exactly, mass dry, burn ended, thrust 0. The limit before at t=199.98 with mass 220000.33, T_limited=6,474,?; good.
    If t=199.99 maybe. Fine.

  Trail point per step: our step pushes one even if dt=0. Good. Reset uses length=0 not reassign. Good.

  `paused` property in object; used by loop. Good.

  They may set `__rocket.paused=true` then call `step(10)` and check trail. Works. Render loop won't auto. Then set false.

  They may call `reset` while paused, then trail length=0 same array. Good.

  `step` with negative dt: we clamp to 0 and push trail. Acceptable. "advances simulated time by dt seconds" negative not likely.

  Large dt performance: 1000/0.02=50k substeps okay maybe. 1e9 -> huge loop freeze. Could cap n? Requirement "any dt". We can't fully. Could use analytic integration? No. Maybe cap at e.g. 1e6 substeps. Not needed. Tests likely small. But any dt they might test step(1000); 50k fine. Step(1e6) 50M slow. We can guard if dt > 600? Hmm. Requirement any dt; don't cap incorrectly. Keep.

  Need no `Math.random` in physics (deterministic) aside from visuals. Good.

  Physics mass and thrust not exposed; okay.

- TypeScript `interface RocketSim` with methods in object. Fine.

- Now build the code.

Let's write code carefully.

I need decide exact numbers and ensure no compile errors.

Start:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

type ... 
```

Maybe use `THREE.MathUtils` etc.

Utility `canvas2d`.

`create...Texture` functions.

Need `tex.anisotropy = 8` but renderer not created yet; anisotropy fixed okay. Could set to renderer.capabilities.getMaxAnisotropy later, but no. Use 8.

Body texture function.

Marking texture.

Glow texture.

`createPuffMaterial` and `Puff` class, `PuffSystem`.

Need be careful with class fields and TS `strict`.

```ts
class PuffSystem {
  readonly max: number;
  readonly points: THREE.Points;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;
  private pool: Puff[];
  private cursor = 0;
  private posAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private alphaAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private seedAttr: THREE.BufferAttribute;
  private positions: Float32Array;
  ...
  constructor(scene: THREE.Scene, max: number, opacityScale = 1) { ... }
}
```
  Do we need `opacityScale`? Could multiply alpha in update. Maybe. Use `alphaScale: number`.
  Shader uniform `uScale`.
  Constructor has scene. `max`.
  Pool create loop.
  Attributes arrays.
  Seed values random for each particle but updated at spawn. In update set seed array from p.seed. Or initial random. Set at spawn and update. Fine.
  Colors. Set initial 1.
  Make material.
  Add.
  `this.points.frustumCulled=false; this.points.renderOrder=20;`.
  `this.geometry.setDrawRange(0,max);`.
  No bounding sphere needed.
  Store fields.

  Constructor syntax: In TS strict, need definite assignment? We assign all in constructor. Class fields declared without initializers but assigned in constructor; strictPropertyInitialization true under strict. Ensure every declared field assigned. Use readonly and assign. Or initialize at declaration. Simpler initialize arrays? For pool etc.

```
private readonly pool: Puff[];
private readonly positions: Float32Array;
...
```
  all assigned in constructor. TS handles if assigned directly in constructor, but strictPropertyInitialization tracks. Fields assigned as `this.positions = new Float32Array...` okay.
  `this.pool` assigned loop before use. Fine.
  `cursor = 0` initializer.
  `alphaScale` assigned param property? Use `readonly alphaScale: number;` assigned. Fine.

  `spawn` uses `this.pool[this.cursor]`, `this.cursor = (this.cursor +1)%this.max`.
  If max 0 not. max positive.
  `p.seed = Math.random()*100`.
  Set attr arrays maybe call `this.writeParticle(p, i)`? We'll update next frame; but if paused and no update? We call smoke.update each frame. Fine. However spawn after groundSmoke.update in animate? Order: we can emit before update so new particle gets one update. We'll set arrays in spawn to ensure immediate. Set positions, size, alpha, color, seed. Then needsUpdate. Good.
  In spawn, `this.alphas[i] = alpha; ...`. Need compute index = cursor before increment. Do.
  `this.positionAttr.needsUpdate = true;` etc. Good.

  Update all arrays each frame.

  `clear` loops and fills alphas zero. Also maybe positions not. `this.alphas.fill(0); this.alphaAttr.needsUpdate = true;` and p.active false. Good.

  `setScale`.
  `dispose` maybe not.

  Note if `alphaScale` not used. Skip.

  Puff class: declare all. Use `readonly`? no.

  For material, `uScale: { value: 1 }`. Use `new THREE.ShaderMaterial({... uniforms: { uScale: { value: 1 } }, vertexShader, fragmentShader, transparent:true, depthWrite:false, depthTest:true, blending:THREE.NormalBlending });`.
  `depthTest` default true. Fine.
  `fog` not supported. okay.

  Fragment color: use premultiplied? NormalBlending with alpha. use `gl_FragColor = vec4(vColor, a);`.
  No `#include <tonemapping_fragment>`; ShaderMaterial toneMapped true but no tone mapping chunks; it will not apply. Fine. The colors are in linear-ish. We can set `toneMapped: false`? ShaderMaterial has `toneMapped` but unless includes chunk, no effect. Fine.

  In the bloom threshold, smoke white may bloom but alpha low; okay.

- `groundSmoke = new PuffSystem(scene, 900);`, `contrailPuffs = new PuffSystem(scene, 600);`.

- Need update their uniforms scale in animate.
  Expose maybe `puffSystems: PuffSystem[] = [groundSmoke, contrailPuffs]; for (const s of puffSystems) s.setScale(scale);`.

- `PuffSystem` private pool accessed by `clear` etc. Good.

- Smoke emission functions after system creation.
  Track `let smokeEmitTime = 0;`.
  `function emitGroundSmoke(st: RocketState, bx: number): void { ... }`
    Use while:
```
if (st.t < 0) return;
if (smokeEmitTime > st.t) { smokeEmitTime = st.t; } // reset?
if (st.t > 35 || st.alt > 600) { smokeEmitTime = Math.max(smokeEmitTime, st.t); return; }
const rate = 56;
while (smokeEmitTime + 1/rate <= st.t) {
  smokeEmitTime += 1/rate;
  // spawn
}
```
  But if step dt huge and st.t=20, while 1120 spawns; max 900, CPU okay. But test huge to 200: st.t>35 -> smokeEmitTime=st.t and return. Good.
  At reset, smokeEmitTime=0.
  At t small, spawn.
  Choose two exits:
```
const side = Math.random()<0.5?-1:1;
const z = side*(40+Math.random()*8);
const x = (Math.random()-0.5)*9;
const y = 1 + Math.random()*3;
const vx=(Math.random()-0.5)*10;
const vy=2+Math.random()*5;
const vz=side*(16+Math.random()*24);
groundSmoke.spawn(x,y,z, vx,vy,vz, 6+Math.random()*8, 5+Math.random()*8, 10+Math.random()*8, 0.22+Math.random()*0.18, 0.96,0.96,0.98, 0.15);
```
  Maybe spawn around rocket:
```
if (Math.random()<0.35) {
 const a=Math.random()*Math.PI*2; const r=2+Math.random()*5;
 groundSmoke.spawn(bx + Math.cos(a)*r, 1+Math.random()*4, Math.sin(a)*r,
   Math.cos(a)*(5+Math.random()*8), 2+Math.random()*6, Math.sin(a)*(5+Math.random()*8),
   4+Math.random()*7, 5+Math.random()*7, 8+Math.random()*7, 0.25+..., 1.0,0.9,0.7, 0.8);
}
```
  At high t, rocket bx maybe small. Good.
  Color warm for center.
  Note y absolute: pad top 0, ground -3.5. Spawn y=1. Good. On trench exits y=1.5.
  `groundSmoke.spawn` parameter warm. Fine.

  At t after 35, no more liftoff smoke. But steam may persist. Update with life 18s; by t=50 faded.
  Could emit until alt<600; at t~? 600m after maybe 12s. Fine. Use `st.t > 45`. 
  Rate 50. 900 particles for ~18s at 50/s =900. Good.

  Add an initial big steam burst? At t=0.014 first. Fine.

- Contrail emission:
```
let contrailEmitTime = 0;
function emitContrail(st: RocketState, bx: number): void {
  if (st.t < contrailEmitTime) contrailEmitTime = 0;
  if (st.t >= 200 || st.alt < 30) { contrailEmitTime = Math.max(contrailEmitTime, st.t); return; }
  const interval = 0.35;
  let guard=0;
  while (contrailEmitTime + interval <= st.t && guard < 60) {
    contrailEmitTime += interval; guard++;
    const cy = st.alt + 35? 
    // use base y = st.alt + 20
    const s = 6 + st.alt*0.0022;
    contrailPuffs.spawn(bx + (Math.random()-0.5)*6, st.alt + 20 + (Math.random()-0.5)*10, (Math.random()-0.5)*6,
       1.2+Math.random()*1.5, 0.2+Math.random()*0.5, -0.5+Math.random(),
       s, 2+Math.random()*3, 90+Math.random()*50, 0.10+Math.random()*0.08, 0.92,0.96,1.0, 0);
  }
  if (guard >= 60) contrailEmitTime = st.t;
}
```
  Need spawn at rocket's current x and y. Use base y + maybe 15. 
  At high altitude, s huge. At t=200, alt 100km -> s=226. Good.
  Lifetime 90-140s. Stays.
  Wind drift: velocity x 1.2..2.7, y .2..0.7, z -0.5..0.5. Over 100s drift 200m. Slow relative. Fine.
  Add a slight upward drift.
  `contrailPuffs.spawn` size growth maybe.
  At st.alt<30, no puffs; line anyway.

  If `st.t` jumps from 0 to 200 while paused/unpaused, while guard 60 spawns then sets time=st.t, maybe only 60 puffs. Fine.

- We need not expose smoke.

- Create trail after sim. `updateTrailGeometry` function; assign clear.

  `clearVisualEffects` assignment:
```
clearVisualEffects = (): void => {
  groundSmoke.clear();
  contrailPuffs.clear();
  smokeEmitTime = 0;
  contrailEmitTime = 0;
  updateTrailGeometry();
};
```
  But `smokeEmitTime` etc declared let before. Good.
  Also hide flame? next animate.

- Build scene before sim? sim can be before. `clearVisualEffects` default. Fine.

- Need define `let clearVisualEffects: () => void = () => {};` before rocketSim. Then sim.reset uses.

- The animation references `rocketSim.trail` etc.

- The physics `reset` pushes no trail; visual update next frame. Fine.

- If tests call reset after visual setup, clear function defined. Good.

- But `clearVisualEffects` calls `updateTrailGeometry` which references `rocketSim` and trail geometry defined later. At reset after setup, fine. Assign after.

- Initial visual `rocketGroup.position` at 0. Good.

- Potential reset during animation: animate then steps if unpaused after reset; could immediately climb. But paused likely. If reset while not paused, it starts again. Fine.

- Need ensure reset's `simAcc` maybe compute. Use compute function declared before. Since reset is object method, references function declaration (hoisted). Good.

- Need `g0`, `R`, `M0`, `M_DRY`, `BURN_TIME`, `BASE_THRUST`. Constants.

- At reset `simAcc = netVerticalAccel(0,0,0)`. Good.

- Let's compute baseThrust with constants:
`const BASE_THRUST = 1.3 * M0 * G0;`.

- `thrustAt` check `if (t < 0 || t >= BURN_TIME) return 0;`. At t=0 active. Good. Limit: `Math.min(BASE_THRUST, 3*mass*G0)`.
  If t exactly 0, yes. If t maybe 200 exactly zero. Good.

- `massAt`: `if (t >= BURN_TIME) return DRY_MASS; if (t <= 0) return M0; return M0 + (DRY_MASS-M0)*(t/BURN_TIME);`
  At t=0 m0.

- `targetPitch`:
```
if (t <= 10) return 0;
if (t <= 150) { const u = (t-10)/140; const s = u*u*(3-2*u); return 0.5*s; }
return 0.5 + 0.45 * Math.min(1, (t-150)/300);
```
  At t=10 exactly 0. At 150 exactly? if t<=150 uses s=1 =>0.5. Good. For t=150.01 extra. Never decreases. Good.
  Could pitch beyond 0.95 at 450; max 0.95. Fine. Maybe at t>450 stays 0.95. Fine.

- If t after 200, pitch keeps moving due extra; but thrust zero. Requirement pitch never decreases. Good.

- `netVerticalAccel(t, alt, pitch)`: mass and thrust. Compute.

- The state `vel` vertical. Could also add `speed`? Keep.

- In `step`, use `const n = Math.max(1, Math.ceil(safeDt/MAX_SUBSTEP)); const h = safeDt/n;` for safeDt >0. If safeDt=0 n=1 h=0; loop does nothing; push. We can simply compute n even for 0 =>1, h=0, loop one iteration with pitch update at t=0? Could set pitch target 0. fine. But acceleration integration zero. Use if (safeDt >0) skip loop; then compute acc. Good.
  But requirement fixed substep at most 0.02; for dt=0 no need.
  Inside loop:
```
simPitch = Math.max(simPitch, pitchTarget(simT));
...
simT += h;
```
  For dt huge, after last t maybe >. 
  After loop, `simAcc = netVerticalAccel(simT, simAlt, simPitch);`
  `rocketTrail.push(...)`.
  Good.
  Note if `safeDt` not finite, treat 0. `const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;`.

- If rocket alt clamp to 0, and t at 0, first iteration with thrust. Good.

- Use `if (simAlt < 0) { simAlt = 0; if (simVy < 0) simVy = 0; }`.
  If rocket at 0 and thrust positive, alt rises. Good.

- `simX` can drift. Fine.

Now scene creation. Need camera far 1,500,000 perhaps; sky radius 900000 plus camera at 0; far 2,000,000. Fine.

- Star radius 700000, sky radius 900000; camera far 2000000.

- Sky sphere geometry `SphereGeometry(900000, 32, 16)`. Position copy camera.

- Star points positions radius 650000. Add to group.

- Sky shader sun.

- Fog; scene.background maybe.

- Use `renderer.info.autoReset` not.

Let's start writing actual code in final answer. We'll need ensure all code compiles. I'll mentally type.

Some TS strict pitfalls:
- `let trailIndexAttr: THREE.BufferAttribute | undefined;` not.
- `const trailIndexAttr = new THREE.BufferAttribute(trailIndices, 1);` type BufferAttribute; `THREE.BufferAttribute` constructor accepts `BufferAttribute | ArrayBufferView`? `Float32BufferAttribute` / `Uint32BufferAttribute`? In three, BufferAttribute constructor `array: ArrayLike<number> | ArrayBufferView`, typed. Uint32Array okay. `setUsage` returns this.
- `geometry.setIndex(trailIndexAttr)` accepts BufferAttribute | null. good.

- `THREE.CylinderGeometry` positions etc. 
- In shader strings, template literal with `${}`? avoid.

- `function addStrutMatrix` pushes matrix. Then InstancedMesh count maybe `strutMatrices.length`. If zero, can't have InstancedMesh count 0? count >0. We add many. Good.
  ```
  const lattice = new THREE.InstancedMesh(latticeStrutGeometry, latticeMaterial, strutMatrices.length);
  for (let i=0; i<strutMatrices.length; i++) lattice.setMatrixAt(i, strutMatrices[i]);
  lattice.instanceMatrix.needsUpdate = true;
  lattice.castShadow = true; lattice.receiveShadow = true;
  scene.add(lattice);
  ```
  Type of `lattice.instanceMatrix` `InstancedBufferAttribute`. needsUpdate.

- `new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(radius, len, radius))`.
  `mid` = new Vector3(ax,ay,az).add(b).multiplyScalar(0.5)? Use `new Vector3((ax+bx)/2,...)`.
  Direction b-a; len. Quaternion `new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize())`. Note dir computed once. Good.
  For radius 0.12, cylinder radius 1 scaled .12. Fine.

- Lattice add function:
```
function addLattice(cx: number, cy: number, cz: number, width: number, height: number, levels: number, radius: number): void {
  const hw=width/2;
  const corners: Array<[number,number]> = [[-hw,-hw],[hw,-hw],[hw,hw],[-hw,hw]];
  for (let l=0; l<levels; l++) {
    const y0 = cy + (l/levels)*height;
    const y1 = cy + ((l+1)/levels)*height;
    for (let i=0;i<4;i++) {
      const c=corners[i];
      addStrut(cx+c[0],y0,cz+c[1], cx+c[0],y1,cz+c[1], radius);
    }
    for (let i=0;i<4;i++) {
      const a=corners[i], b=corners[(i+1)%4];
      addStrut(cx+a[0], y1, cz+a[1], cx+b[0], y1, cz+b[1], radius*0.85);
      addStrut(cx+a[0], y0, cz+a[1], cx+b[0], y1, cz+b[1], radius*0.7);
    }
  }
  // top horizontal ring
  for... at cy+height...
}
```
  Note corners order forms ring. Good.
  At bottom l=0, vertical/horiz/diagonal. Add base plate box separately.
  Add top ring at height maybe duplicate with last level top horizontal already; no need. Add.
  `cy` base y. Tower base at pad top 0.0. Masts base at ground? Use 0.

  Tower addLattice(12,0,0,6,78,16,0.14). But tower center x=12; nearest side x=9, rocket radius 1.85; good. Add arms.
  Masts at (-52,0,-52), (52,0,-52), (-52,0,52), (52,0,52)? Four. Width 4, height 96, levels 14, radius .11. 
  Add mast tip red lights as Mesh spheres with emissive. Or PointLight? Use MeshBasicMaterial red small spheres at top. fine.
  Wires: from each mast top to a central high point (0,105,0). Use `Line` from top to (0,105,0) to other? Draw one wire? Use `LineSegments` with pairs? Simpler create a single `THREE.Line` with points for each mast top to central point? Multiple disconnected segments via LineSegments. Build BufferGeometry positions.
  ```
  const wirePositions: number[] = [];
  for each mast top: push(top.x,top.y,top.z, 0,108,0)
  const wireGeo = new BufferGeometry(); setAttribute...
  const wire = new THREE.LineSegments(wireGeo, new LineBasicMaterial({color:0x222222, transparent:true, opacity:0.35}));
  ```
  Good. Catenary not but okay. Could add sag points; line segments straight. Fine.
  Add central lightning rod? no.

  Tower arms: Add `Mesh(new BoxGeometry(8,0.6,1.2), steelWhiteMat)` at x=7? Tower center x=12, arm from x=8 to 2. `position.set(7,34,0)`, maybe length 10 from x=12 to 2. Add at y=35 and 58. Rotate? Box extends x 10. `new BoxGeometry(10,0.7,1.2)` position x=7. Hmm center x=7, spans 2..12. Good. Add small white room near base tower maybe. Add tower top antenna. 
  Tower base building box 8x5x8 at x=15,y=2.5,z=0. But tower is at x=12; fine.

- Lightning masts shadows included in instanced mesh.

- Concrete material with map. Use `map: concreteTex, color: 0xffffff`? Canvas texture gray; material color white. Fine.
  Slabs:
```
const padMat = new THREE.MeshStandardMaterial({map: concreteTex, roughness:0.95, metalness:0.02, color:0xcfd0c8});
const left = new THREE.Mesh(new THREE.BoxGeometry(45,3,100), padMat); left.position.set(-27.5,-1.5,0);
```
  Geometry shared for left/right. Add. Right.
  End platforms? central slot open; pad ends at z ±50. Trench exits.
  Trench floor: box 10x0.4x100 at y=-2.8? Ground -3.5. Put y=-2.9, top -2.7. dark material. Add.
  Trench walls maybe boxes at x=±5.5, y=-1.5 height 3? Slabs already side faces at x ±5. Good.
  Add black scorch plane inside at y=-2.68? Fine.
  Add yellow edge lines at slab inner edges maybe boxes 0.25x0.1x100 at x=±5.3,y=0.05. yellow paint material.
  Add pad side walls at z=±50 maybe box 100x3x0.6? This could block trench exits. Avoid at center? Add end caps at x outside trench? Not necessary.
  Add pad access ramp: box 16x0.5x20? Put from ground to pad top at z=60? A sloped box rotated x. We'll add simple ramp using BoxGeometry 12x0.5x25 rotated x=-0.12, position (35,-1.5,55) etc. Not essential. Maybe skip.

  Launch mount:
  - base ring `new TorusGeometry(3.6,0.22,8,32)` rotated x=PI/2, y=2.2, metal. It will float above trench. Add 4 support columns from y=-2.5 to 2.2 at x/z ±4? Use boxes 1.5x5x1.5. Center at y=-0.3? Let's compute: columns from ground -3.5 up to 2.2, height 5.7, center -0.65. At (±3.8, -0.65, ±3.8). They sit around rocket. Add.
  - flame deflector wedge under center: a box 8x1x8 at y=-2.2? Add dark.
  - hold-down clamps: small boxes at around ring y=2.3. Add.

- Add pad markings: maybe large numbers? no.

- Buildings and roads with y offset -3.5.

  For roads, use plane at y=-3.44. If ground at -3.5, roads 0.06 above. Good.
  `roadMaterial = new MeshStandardMaterial({color:0x42484a, roughness:0.85, metalness:0.0})`.
  Road plane y=-3.44 rotated -PI/2.
  Add dashes at y=-3.42: white boxes 0.25x0.02x4 maybe length along road. Could be many. Use 20. At world distance fine.

  Buildings base y=-3.5, box position y=-3.5+h/2. Use `MeshStandardMaterial` with colors. Add roofs? just boxes with slightly different color top? A box single material. Fine. Add small AC units maybe not.

  Beach/ocean y=-3.55 to avoid z-fight with ground? Ocean at -3.6. Ground at -3.5. Good. Ocean visible beyond ground edge. If ocean plane under ground, hidden. At ground edge, ground covers until -6000. Ocean at -3.6. Fine.

  But ground is a finite plane with edge; ocean extends under; at far edge, ground ends at -6000. Ocean visible beyond. Good.

  Fog color.

- Vegetation instanced at y=-3.5 + scale? Geometry center at origin; for scale y 1-3, position y=-3.5. It will partly below; set y=-3.4. Bushes radius 2-8. Ground y=-3.5. Fine.
  Avoid near pad radius <160. Use random polar positions. Use `for i<1300`; if radius<160 or >3000, continue. Use while maybe. Simpler:
```
const r = 160 + Math.pow(Math.random(),0.6)*2800;
const a = Math.random()*Math.PI*2;
const x = Math.cos(a)*r; const z = Math.sin(a)*r;
```
  `x,z` within ±3000. Ground extends ±6000. Good. Add some further to -5000 maybe. But okay.
  Instance scale y 1..3, x 2..5. Use dummy.
  `mesh.setColorAt(i, color)` after loop. Color random HSV. Need call `mesh.setColorAt` before? instanceColor created. fine.
  `mesh.castShadow = false; mesh.receiveShadow=true;`.

- Distant treeline maybe use additional instanced bigger dark cones at z=-2500. Not necessary.

- Ocean material maybe add slight roughness 0.35 metalness .2. With no env map it appears dark. Add `emissive`? no. Use color 0x2a5c70, roughness .4. Under sun. Fine. Add a mesh with `MeshStandardMaterial` maybe fog.

- Aerial perspective: fog density 0.00014. At 6000m fog exp2 factor exp(-(0.00014*6000)^2)=exp(-0.7056)=0.49. Good. Ocean hazy.

- Scene background maybe color 0xbcd2e2 (not visible). Fine.

- Rocket material map. Body texture repeat? CanvasTexture wrap default clamp; fine.

- Lathe geometry normals? `geometry.computeVertexNormals()`.
  Add white material. Use `new THREE.LatheGeometry(points, 40)`.

- `whiteMat` also used for arms? separate.

- Plume shader strings. Need ensure uniforms `uTime`, `uColorA`, `uColorB`, `uIntensity` maybe. Use.
  Outer fragment:
```
uniform float uTime;
uniform vec3 uHot;
uniform vec3 uCool;
varying vec2 vUv;
varying vec3 vLocal;
void main() {
 float t = clamp(vLocal.y * 0.1 + 0.5, 0.0, 1.0); // top at .5, bottom 0? vLocal y -5..5 => 0..1
 float bands = 0.65 + 0.35 * sin(vUv.x * 30.0 + uTime * 24.0 + vUv.y * 18.0);
 float edge = smoothstep(0.0,0.18,vUv.x) * smoothstep(1.0,0.82,vUv.x);
 float alpha = (0.22 + 0.55 * bands) * (0.35 + 0.65 * (1.0 - t)) * edge;
 vec3 col = mix(uHot, uCool, t);
 gl_FragColor = vec4(col, alpha);
}
```
  But `vUv.x` edges on cylinder seam; multiplying by edge can fade the vertical seam. We want avoid fading at wrap edges because seam not actual edge. Cylinder UV wraps, so `smoothstep(0,.18,u)` fades at seam. Better don't edge fade; use geometry side and additive, no need. Alpha based on vLocal? Use `sin`; let alpha all around. For open-ended cylinder, side visible. Use `float alpha = (0.25+0.45*bands) * (0.4+0.6*(1.0-t));`. Additive. Fine.
  Use `t = clamp(vLocal.y * 0.15 + 0.5,0,1)` with y ranges -5..5 => 0..1. Cool at bottom. `mix(uHot,uCool,t)` hot at top? top t=1->cool. Actually we want white-yellow at top, orange bottom. Set hot color white; `t=0 bottom` should orange, `t=1 top` white. Use `mix(uCool,uHot,t)`. In code define uHot white, uCool orange; `col = mix(uCool, uHot, t)`. Good.
  Core similar with more white and alpha.
  `uIntensity` could scale; not needed.
  Time flicker: bands.
  Vertex local position declared `varying vec3 vLocal;` and set `vLocal=position;`. Good.

  `outerPlumeMat = new ShaderMaterial({ uniforms:{uTime:{value:0},uHot:{value:new Color(1.0,0.93,0.62)},uCool:{value:new Color(1.0,0.24,0.03)}}, vertexShader, fragmentShader, transparent:true, blending:Additive, depthWrite:false, side:DoubleSide });`
  Use colors with sRGB? ShaderMaterial uniforms Color values linear? Color(1,0.93,0.62) values maybe linear. Fine.
  `uTime` update every frame.

  Core colors white/yellow; alpha.

  The plume mesh may be behind rocket? Additive and depth test; if inside pad, hidden by pad. At alt 0, flame goes into trench; some visible. Good.

- Flame glow sprite. Add two. `glowSprite.material` typed SpriteMaterial. Set color. `scale.set(12,12,1)`.
  Sprite always faces camera. 
  `glowSprite.position.set(0,0,0)`. Parent plumeGroup at 0.7. Good.
  Add long sprite at y=-2 with scale 20,8? Sprites square; scale x,y. Use `scale.set(18,24,1)`.
  Because parent plumeGroup at rocket base.

- Mach diamonds: `const machGroup = new THREE.Group(); plumeGroup.add(machGroup);` Add 4 `OctahedronGeometry(0.8,0)` meshes with shared `MeshBasicMaterial({color:0xfff3cc, transparent:true, opacity:0.8, blending:AdditiveBlending, depthWrite:false})`. Position y = -2.5 - i*2.8? Since plumeGroup at base. Good. Mesh scales maybe. In animate, if alt<25000, visible; `machGroup.position` no. Set each `scale.setScalar(0.7 + 0.3*sin(...))`. Need store `machDiamonds: THREE.Mesh[]`.
  At t=0 flame visible; mach group visible. Good.

- Flame light:
  `flameLight = new THREE.PointLight(0xffaa55, 0, 220, 2); flameLight.position.set(0,0,0); rocketGroup.add(flameLight);`
  Second `coreLight = new THREE.PointLight(0xffffff, 0, 120, 2);`.
  At high altitude no pad; but still lights rocket. Fine.
  Maybe castShadow false default.
  Intensity units: PointLight with decay 2 and distance 220. Intensity 3000 at 5m = 120; strong. Need avoid overblown. Use 1200. Flicker. The pad at 20m: 1200/400=3; bright. Good. At 50m 0.48. Fine.
  Core 500.

- Use `flameLight.intensity = burning ? (900 * flick * (1 - Math.min(0.75, st.alt/200000))) : 0;`
  At high alt still light rocket. Use not fade too much. `coreLight.intensity = burning ? 450*flick :0`.

- Sun shadows at high altitude? Sun target at origin; rocket high may cast shadow far; shadow camera won't include. Fine.

- Update `plumeGroup.visible = burning;` If not, flame lights intensity 0. At t>=200.
  At reset t=0. flame visible.

- Maybe if rocket has landed and t>200 no flame. Fine.

- Sky update and fog:
```
const alt = st.alt;
skyMat.uniforms.uAlt.value = alt;
const space = THREE.MathUtils.smoothstep(alt, 30000, 100000);
scene.fog.density = 0.00016 * (1 - THREE.MathUtils.smoothstep(alt, 0, 80000)) + 0.000001;
const fogGround = new Color(0xb7cbd8);
const fogSpace = new Color(0x02050b);
scene.fog.color.copy(fogGround).lerp(fogSpace, THREE.MathUtils.smoothstep(alt, 40000, 110000));
starMat.opacity = THREE.MathUtils.smoothstep(alt, 70000, 100000);
```
  But stars should "appear above about 70km and clearly visible above 100". At 70 opacity 0, 100 1. Perfect. Maybe appear slightly at 65; use 65000..100000. Requirement above about 70. Use smoothstep 68000, 100000. At 70 small. Good.
  `stars.visible = opacity > 0.001` else maybe false for perf. Set.
  `scene.fog.density` at alt 100km ~1e-6. Fine.
  Fog color lerp. At high alt fog dark; ground maybe. 
  Maybe sun intensity increase with alt? no.

  Sky needs update `sky.position.copy(camera.position)`, `starField.position.copy(camera.position)`. Do before render.
  Stars `rotation` constant? no.

  If camera fov changes narrow, star points sizeAttenuation false; okay.

- Update `puffSystems` scale after camera projection update. `const puffScale = 0.5 * renderer.domElement.height * camera.projectionMatrix.elements[5]; groundSmoke.setScale(puffScale); ...`.
  Note renderer.domElement.height may be 0 before first? after setSize nonzero. fine.

- `trail` update each frame. If trail empty, drawRange 0. 

- `__ready` after composer.render first. Good.

- Resize:
```
function onResize(): void {
 const w=window.innerWidth, h=window.innerHeight;
 camera.aspect=w/h; camera.updateProjectionMatrix();
 renderer.setSize(w,h);
 composer.setSize(w,h);
}
window.addEventListener('resize', onResize);
```
  composer `setPixelRatio`? On resize, renderer pixel ratio same. composer setSize uses renderer pixel ratio? EffectComposer has `_pixelRatio`; if set initial `composer.setPixelRatio(renderer.getPixelRatio())`. Do.
  Note `renderer.getPixelRatio()` exists.
  Initialize composer after renderer. 
  `composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));` maybe.
  Then `composer.setSize(window.innerWidth,window.innerHeight)`.
  Render target size.

- Antialias and postprocessing; composer render target antialias? EffectComposer uses WebGLRenderTarget with type HalfFloat maybe; no antialias. Renderer antialias only default framebuffer; post target might not. Use `renderer.setPixelRatio` high. Fine.

- Maybe set `composer.renderTarget1.samples = 4`? WebGL2 MSAA. Could set `composer.renderTarget1.samples = 4; composer.renderTarget2.samples = 4;` but not necessary. Type maybe. Avoid.

- Bloom threshold. Use `new UnrealBloomPass(new THREE.Vector2(w,h), 0.85, 0.55, 0.72)`. `bloomPass` variable not needed.

- Ensure the sky shader's sun appears even with fog. good.

- Need `THREE.Color` for fog maybe allocate once outside loop to avoid GC. Use `const fogGroundColor = new THREE.Color(0xb9cfdf); const fogSpaceColor = new THREE.Color(0x000000); const fogTemp = new THREE.Color();`.
  Each frame `scene.fog.color.copy(fogGroundColor).lerp(fogSpaceColor, f)`. `FogExp2.color` type Color. `scene.fog` created as FogExp2. In TS, `scene.fog` type `Fog | FogExp2 | null`; after assignment maybe still type union. Use `const fog = scene.fog as THREE.FogExp2;` or keep reference `const fog = new THREE.FogExp2(...); scene.fog = fog;` Then use `fog.density`, `fog.color`. Good.
  Define `const fog = new THREE.FogExp2(...)`.

- `scene.background = new THREE.Color(0x000000)`? Sky covers all; no need.

- `starField` group. `starMaterial` variable. Good.

- Need initial `skyUniforms` reference. Use `const skyMaterial = new THREE.ShaderMaterial({...}); const sky = new THREE.Mesh(...)`. `skyMaterial.uniforms.uAlt.value = ...` type. Good.

- Sky material shader `sunDir` normalize in shader. Need uniform `uSun` as new Vector3. Use sunDir clone. Since sunDir might not be exactly normalized? It is normalized. Good.

- Directional light uses sunDir. Define sunDir before sky. `const sunDirection = new THREE.Vector3(0.42,0.72,0.55).normalize();`.

- `sun.position.copy(sunDirection).multiplyScalar(600);`. Add target at (0,30,0). Light direction downward. Good.

- Hemi light.

- Maybe add a second directional fill light from sky? Hemisphere enough.

- `renderer.toneMappingExposure = 1.0`.

- Postprocessing OutputPass might tone map; ACES. Fine.

Let's begin writing final code. But I must be meticulous with TypeScript.

Potential issue `THREE.BufferAttribute` constructor with Uint32Array under `--strict`: types accepted. Fine.

Potential issue assigning to `mesh.instanceColor.needsUpdate`: `mesh.instanceColor` type `InstancedBufferAttribute | null`. Check:
```
if (bushMesh.instanceColor) bushMesh.instanceColor.needsUpdate = true;
```
  property needsUpdate exists. Fine.

Potential issue `puffSystem` `private readonly pool: Puff[];` etc. We assign. Fine.

Potential issue `interface TrailPoint` used by `rocketSim.trail`. Good.

Potential issue `RocketSim.reset` method using `clearVisualEffects()` variable declared with let before; captured. Fine.

Potential issue `paused` property in object and animation references. `rocketSim.paused` can be changed externally. fine.

Potential issue `rocketSim.state()` called before any step returns acc. fine.

Potential issue sim trail point `y: simAlt` but rocket group base at alt; good. z always 0. They said world points of rocket. Maybe tests expect point y = alt? likely. x horizontal offset. Fine.

Potential issue camera target uses `bx` from last trail, but if no trail after reset, `x=0`. okay.

Potential issue external tests might set `__rocket.paused=true`, call `__rocket.reset()`, and inspect `__rocket.trail.length===0`. clearVisualEffects uses trailGeom defined; fine. If reset is called before `clearVisualEffects` assigned? The script executes synchronously; external test can't call until after script; assigned. Fine. Unless some internal call? none.

- If `reset` called after scene disposal? no.

- Need set `window.__ready` only after first frame; but user could test before animation. fine.

Let's write.

One issue: in animation, physics step occurs before reading state, and if paused false, dt min. Good.
  But `clock.getDelta()` first call after clock start returns small. okay.

- Camera initial position can be overwritten in first animate. fine.

- `__scene`, `__camera`, `__renderer` should be set after creation early, before first frame.

- No OrbitControls.

Let's craft code now. Use `Arial, sans-serif` font. No external.

I need make sure string contexts.

Let's write helpers:

```ts
function createConcreteTexture(): THREE.CanvasTexture {
  const {canvas, ctx} = canvas2d(512,512);
  ctx.fillStyle = '#b4b1a8'; ctx.fillRect...
  for (let i=0;i<24000;i++) { const v = 130 + Math.random()*70; ctx.fillStyle = `rgba(${...},0.2)`; ... }
  // panel seams
  ctx.strokeStyle = 'rgba(70,70,65,0.45)'; ctx.lineWidth=2;
  for (let x=32; x<512; x+=64) { ... }
  // stains and cracks
  for (let i=0;i<22;i++){ ... }
  const tex = ...
  tex.repeat.set(5,5); // but box UV maybe
```
  Concrete on pad boxes: repeat 8,8; but same texture for all. Fine.
  Use `tex.wrapS = tex.wrapT = THREE.RepeatWrapping;` This assignment works? `tex.wrapS = THREE.RepeatWrapping; tex.wrapT = ...`. Good.

`createGroundTexture` repeat 80.

`createVegetationTexture` small 256 noise. Use on bushes. repeat 1. Use 2.

`createBodyTexture` 512x1024. Use `ctx.fillStyle='#f0efe7'`. Noise. Panel lines vertical. Draw subtle gray. `const tex=new CanvasTexture; tex.colorSpace=SRGB; tex.wrapS=RepeatWrapping; tex.wrapT=ClampToEdgeWrapping; tex.anisotropy=8;` The cylinder UV has v; fine. If wrapS repeat not repeat, cylinder seam might show; texture 1.0. fine.
  Draw at x=0 edge; no.

`createMarkingTexture`: use `ctx.clearRect(0,0,512,1024);`. Draw border? Use flag.
  Text:
```
ctx.fillStyle='#222222';
ctx.font='bold 62px Arial, sans-serif';
ctx.textAlign='center';
ctx.fillText('FALCON 9', 256, 520);
ctx.font='bold 32px Arial, sans-serif';
ctx.fillStyle='#555';
ctx.fillText('SPACE LAUNCH',256,570);
```
  Maybe add horizontal stripe.
  Texture.

`createGlowTexture` radial: 
```
const grad = ctx.createRadialGradient(128,128,0,128,128,128);
grad.addColorStop(0,'rgba(255,255,255,1)');
grad.addColorStop(0.18,'rgba(255,248,210,0.95)');
grad.addColorStop(0.45,'rgba(255,170,60,0.55)');
grad.addColorStop(1,'rgba(255,80,0,0)');
ctx.fillStyle=grad; ctx.fillRect...
```
  Texture colorSpace SRGB.

- `createPuffMaterial` function maybe outside class:
```
function createPuffMaterial(): THREE.ShaderMaterial { ... }
```
  vertex shader string. Need no backticks conflict.

- Puff class:
```ts
class Puff {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  age = 0;
  life = 1;
  size = 1;
  growth = 1;
  alpha = 0;
  seed = 0;
  r = 1;
  g = 1;
  b = 1;
  warm = 0;
  active = false;
}
```
  Good.

- PuffSystem class fields. Need `scene` param maybe unused after adding; okay.
  `readonly alphaAttr` etc.
  Declare arrays.
  Constructor:
```
constructor(scene: THREE.Scene, max: number) {
 this.max = max;
 this.positions = new Float32Array(max*3);
 ...
 this.pool = [];
 for (let i=0; i<max; i++) { this.pool.push(new Puff()); }
 this.posAttr = new THREE.BufferAttribute(this.positions,3);
 ...
 this.posAttr.setUsage(THREE.DynamicDrawUsage);
 ...
 for (let i=0;i<max;i++){ this.seeds[i]=Math.random()*100; this.colors[i*3]=1; ... this.alphas[i]=0; this.sizes[i]=1; }
 this.geometry = new THREE.BufferGeometry();
 this.geometry.setAttribute('position', this.posAttr);
 ...
 this.material = createPuffMaterial();
 this.points = new THREE.Points(this.geometry, this.material);
 this.points.frustumCulled = false;
 this.points.renderOrder = 20;
 scene.add(this.points);
}
```
  Need assign `this.geometry` before? Declared readonly. okay.
  Set `this.seedAttr = ...` etc. Assign all.
  `this.material` creation after arrays.
  Field order maybe.

  In class, all private readonly fields declared. TS strict checks assigned. Ensure.

  `spawn`: Use `const index=this.cursor; const p=this.pool[index]; this.cursor=(this.cursor+1)%this.max;` Set. Then set arrays directly at index. Use `p.active=true`.
  `this.alphas[index] = alpha;` etc. Set colors with warm? at spawn just base r/g/b. Fine.
  Set `this.seeds[index] = p.seed`.
  Mark attributes needsUpdate. Position, size, alpha, color, seed.
  This is called many times per frame; setting needsUpdate repeatedly okay.

  `update(dt)` as above. Need if dt>0. Use `const damp = Math.exp(-0.45*dt);`.
  For each p active:
```
p.age += dt;
if (p.age >= p.life) { p.active=false; this.alphas[i]=0; continue; }
p.pos.addScaledVector(p.vel, dt);
p.vel.y += 1.4 * dt;
p.vel.multiplyScalar(damp);
p.size += p.growth * dt;
const k = p.age / p.life;
const fadeIn = Math.min(1, p.age / 0.9);
const fade = fadeIn * Math.pow(Math.max(0, 1 - k), 1.15);
const a = p.alpha * fade;
const w = p.warm * Math.max(0, 1 - p.age*0.45);
...
```
  Set positions etc. `this.sizes[i]=p.size;` `this.alphas[i]=a`.
  Colors:
```
const r = Math.min(1, p.r * (0.82 + 0.30*w));
const g = Math.min(1, p.g * (0.82 + 0.18*w));
const b = Math.min(1, p.b * (0.82 - 0.25*w));
```
  Need clamp min 0. For b. `Math.max(0,...)`. Use.
  `this.colors[i*3]=r; ...`.
  Inactive: `this.alphas[i]=0;` Maybe also sizes. fine.
  At end set needsUpdate. Because update each frame, always. Fine.
  `this.alphaAttr.needsUpdate = true; this.positionAttr.needsUpdate = true; this.sizeAttr.needsUpdate = true; this.colorAttr.needsUpdate = true; this.seedAttr.needsUpdate = true;`
  Good.

  `clear()` loop p.active=false; `this.alphas.fill(0);` update. Maybe positions unchanged. Good.
  `setScale(value)`.

  A subtle bug: spawn writes attributes but does not immediately set `this.positions` if overwritten? yes it does. Good.

- We need `PuffSystem` to receive scene. Fine.

- `createPuffMaterial`:
```
function createPuffMaterial(): THREE.ShaderMaterial {
 return new THREE.ShaderMaterial({
   uniforms: { uScale: { value: 1 } },
   vertexShader: `attribute float aSize; ...`,
   fragmentShader: `...`,
   transparent:true,
   depthWrite:false,
   depthTest:true,
   blending: THREE.NormalBlending,
 });
}
```
  The shader uses `varying vec3 vColor;` etc. Good.
  Add `#include <common>` not.

  Fragment:
```
varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;
  float soft = smoothstep(1.0, 0.15, d);
  float n = 0.72 + 0.28 * sin(uv.x * 12.0 + vSeed) * sin(uv.y * 11.0 + vSeed * 1.7);
  float a = vAlpha * soft * n;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, a);
}
```
  `smoothstep(1.0,0.15,d)` returns 1 when d=0.15, 0 when d=1. Good.
  Note gl_PointCoord y direction no matter.

- Puff point size scale.

- Need maybe `this.points.material` has fog? not.

- Renderer exposure. Good.

- Build `smoke` before animation. Fine.

Let's now write final code. I'll ensure no missing semicolons.

Potential issue with TypeScript `THREE.MathUtils.smoothstep` uses `MathUtils.smoothstep(x, min, max)`. yes.

Potential issue `OutputPass` import after UnrealBloom. fine.

Potential issue `new UnrealBloomPass(new Vector2(width,height), 0.8, 0.5, 0.75)` type expects `resolution: Vector2, strength: number, radius: number, threshold: number`. yes.

- Camera projection near/far and fov updated. On start initial lookAt.

- `camera.aspect = innerWidth / innerHeight`.

- `composer.setPixelRatio` method exists. yes.

- Renderer DOM canvas can be selected by style.

- Maybe set `renderer.domElement.style.display='block'`.

- Body background black.

- Scene fog and color.

- For sky sphere, `sky.material` shader; `sky.frustumCulled=false`; perhaps renderOrder = -1000. Fine.
  If depthTest false, it will always draw; renderOrder ensures first among opaque? Opaque objects sorted by renderOrder. Add `sky.renderOrder = -1000`.
  Sky sphere might be frustum culled by camera far? Radius 900000, camera at sphere center, camera far 2000000, inside, no. Set false.

- Stars group `depthWrite:false`.

- Star material `vertexColors: true`, color white. Good.

- To make stars clearly visible, size 1.5 maybe with DPR. Use 2.0. `sizeAttenuation:false` so size in pixels. Good. `opacity` 0..1.

- At high altitude, sky black. The scene's light still daytime; good.

- Sun in sky maybe appears. Direction vector relative. The sky sphere local direction from camera; if position copy camera, local direction. Good.

- `skyMaterial.uniforms.uSun.value` is a Vector3; normalized? yes.

- Directional light target added.

- Shadows. For tower InstancedMesh cast shadows. For pad. For rocket.
  `latticeMesh.castShadow = true;` InstancedMesh supports.

- Add ground plane receiveShadow but shadow map only near pad. okay.

- `hemi.position.set(0,200,0)` maybe default.

- Buildings maybe cast shadow. Add castShadow false to reduce? Some near. Set true for a few. Fine.

- Use `MeshStandardMaterial` for bushes with map. Instanced colors combine with map. Fine.

- We need create `vegetationTexture`; texture.repeat set maybe 2,2. For icosahedron UVs maybe weird; colors dominate. Fine.

- Instanced mesh rotation? dummy.rotation.y random; scale. setMatrixAt. Good.

- Bushes y: geometry centered origin, scale y 1..3. Position y = -3.5 + scaleY? To sit on ground, set y=-3.5+scaleY*0.5? But dummy scale y=1-3 and geometry radius 1; bottom at pos.y - scaleY. If pos.y=-3.5, bottom -6.5. Set pos.y=-3.4. It will sink; okay for scrub. Better pos.y=-3.2. Fine. Looks like low bushes.
  Or use `dummy.position.set(x, -3.5 + sy*0.6, z)` but sy variable. Do. Need set scale before computing. Use:
```
const sx = 2+Math.random()*5;
const sy = 1+Math.random()*3;
const sz = 2+Math.random()*5;
dummy.position.set(x, -3.45 + sy*0.55, z);
dummy.scale.set(sx,sy,sz);
dummy.rotation.set(0,Math.random()*Math.PI*2,0);
dummy.updateMatrix();
```
  Geometry radius 1, so bottom y = pos - sy, top pos + sy. With pos = -3.45+0.55 sy: bottom = -3.45 -0.45 sy (below ground), top= -3.45+1.55 sy. Fine. Mostly hidden bottom.

- Trees/bushes dark green. color variation.

- Roads and buildings y positions. Buildings height. Use base -3.5.

- The ocean plane at y=-3.7. Ground at -3.5. Good.

- Add a distant shoreline strip? Maybe a sand plane at z=-6000? Not.

- The horizon should show ocean. Ground edge at 6000; ocean beyond. With camera low, but ground is 3.5 below; horizon line distance from 8m height to ground plane? Ground plane ends 6000; beyond ocean at -3.7. See. Good.

- Fog.

- Pads, tower, etc.

- Add maybe "Cape Canaveral" labels? Not necessary.

- Rocket decal and flag.

- Interstage dark band. The fairing maybe white but upper stage dark? Falcon 9 fairing white; okay.

- Add a dark band near top body and engine.

- Use `THREE.MeshStandardMaterial` with `envMap` none. Physically based but no environment map, still fine.

- Add a `PMREM` env? no external. Could generate a simple environment map from scene? Not necessary. But PBR metallic nozzles appear black without env map. Add a procedural environment? Could create a `RoomEnvironment` addon? No external assets, addon okay but not requested. Avoid complexity. Metals get direct sun specular. Fine.
  Use lower metalness for metals 0.8.

- Sky lighting via HemisphereLight.

- Maybe use `renderer.setClearColor(0x000000, 1)`.

- `scene.fog` affects sky? no.

- Need add `window.__scene` after scene creation and camera etc. Fine.

- We also may expose `__rocket` at end; but tests might expect before first frame, script completes before frame anyway. Fine.
  Set immediately after sim creation.

- Expose `__ready` after first frame.

- `window.__renderer` etc.

- Handle window resize; `composer.setSize`. Also update camera aspect, renderer. good.

- When window resize, `renderer.domElement` CSS width/height auto? renderer.setSize sets style. fine.

- `document.body` has no other HTML. We append.

- Maybe remove scrollbars.

- Need ensure canvas on top; body.

- Code no imports of models.

Let's produce code.

But before final, check exact TS syntax for `new THREE.ShaderMaterial` uniforms values. `uniforms: { uScale: { value: 1 }, ... }` typed as `{ [uniform:string]: IUniform }`; okay.

- `Color` assignments in uniforms require `{ value: new THREE.Color(...) }`. good.

- Custom shader varyings.
  For plume vertex, use `varying vec2 vUv; varying vec3 vLocal;` and `vUv = uv; vLocal = position;`.
  Fragment use. good.

- Mach diamonds mesh material. Fine.

- `glowSprite.material` with `SpriteMaterial` can set `opacity`, `color`, `map`. Additive.
  Use `new THREE.SpriteMaterial({ map: glowTex, color:0xffd7a0, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, opacity:0.9 })`. 
  In animate, set `.opacity = ...`? Type of `glowSprite.material` is `SpriteMaterial | Material`? `Sprite` type has `material: SpriteMaterial`; yes property typed as SpriteMaterial. Use directly.
  `glowSprite.material.opacity = 0.75*flick;`
  Good.

- `rocketGroup.traverse` for shadows before adding plume. However fairing etc. Fine. For decal planes, castShadow true might cast weird; okay. But transparent decals cast shadows maybe. Could set castShadow false on decals manually. Not important.

- Use `mesh.castShadow=true` for body/nozzles. Decal planes with transparent map may cast solid plane shadows. Minor. Could set decal.castShadow=false after traverse? Traverse after all. Set decal.castShadow=false before? Traverse overrides. Do traversal before adding decals? Or in traverse set all cast. Then set decals false after. Fine.
  Also no shadow on flag. Fine.

- Plume castShadow false by default; added after. Sprites. fine.

- `rocketGroup` position set in animate; initial position (0,0,0). Good.

- The rocket body cast shadows onto itself? receive true.

- At high altitude, rocket far from shadow camera; no shadows. fine.

- Add a launch mount that does not intersect.

- Camera near might see smoke covering rocket; okay.

- Sim time maybe the camera transition starts at alt >80; at t=~? likely 5s. That means long lens early. Requirement low camera near pad looking up at liftoff then long-lens. The transition begins at 80m (~5s). Fine. Could delay to alt 200, fully 1000. Use blend smoothstep(100, 1200). Good. At liftoff first 4s near camera. Nice.

- Low camera looking up: camera near y=8 and rocket base; camera target center 35m. Good.

- Camera shake only while burning. Use amplitude 0.15; subtle.

- Maybe adjust camera far position for better view of ocean: x=520,z=760 means camera is southeast; ocean -z behind rocket; nice.
  At high alt, target high; camera pitch upward. Good.

- FOV 52 near, 10.5 far. Good.

- At alt 0, target center 35; near camera 76 z distance; rocket fits. Tower at x=12 visible. Good.

- Need possibly sky sphere not behind due camera inside. good.

- At high alt, `rocketGroup` at 100km; camera ground. Rocket tiny but flame/plume large and trail. The camera fov 10.5. Fine. Stars.

- At alt 100km, rocket base y=100000, plume length 10+280=290m; camera distance ~100km, 290m at fov10.5 -> about 3.4px? Actually screen height 1080; angular size 0.0029 rad; fov vertical 0.183 rad; fraction 1.6%; 17px. Visible. Rocket 70m ->4px. Trail width ~184m ->10px. Smoke sizes ~220m ->13px. Good. Fine.

- However smoke puffs at 100km are large points maybe 13px; few. Trail line. Good.

- At alt 300km, plume hidden (burnout at 200s). Trail maybe. Sky black. Fine.

- Burn lasts 200s; animation real 200s; testers may wait. Fine.

- Could time-warp? no. Physics real. Requirement.

- At first screenshot after a second, rocket low, smoke. Fine.

- If test ready quickly, scene visible. Good.

- The sky at ground pale blue. Ocean horizon. Nice.

- Need perhaps add clouds in sky? not required. Could add