We need to write one TypeScript file. Big task. Let's plan carefully to make it compile with tsc --strict and look good.

Key pieces:
- Imports: THREE, Sky addon, EffectComposer, RenderPass, UnrealBloomPass, maybe OrbitControls not needed.
- Renderer setup, ACES tone mapping, shadows.
- Scene with fog (haze).
- Ground: Florida coast. Ocean plane, land, vegetation via procedural texture (canvas).
- Pad, flame trench, lattice tower, lightning masts.
- Rocket: 70 m tall, 3.7 m diameter, white body, interstage, darker band, engine section with nozzles, fairing, markings from canvas texture.
- Physics simulation for __rocket.
- Plume with lights, particles for smoke.
- Stars.
- Camera follow.
- Trail line.
- Overlay HTML (create via DOM since page has no other HTML — we can append elements).
- Buttons and keys.

Let's write with care about types.

Physics model details:
Constants:
- g0 = 9.81, R = 6371000, m0 = 550000, mdry = 220000, burn = 200 s.
- Thrust T = 1.3 * m0 * g0 = 1.3*550000*9.81 ≈ 7,014,150 N. Limited to 3*m*g0. At liftoff 3*550000*9.81 = 16,180,000 — not limiting. As mass decreases, 3*m*g0 decreases; at m=220000, 3*m*g0=6,474,600 < 7,014,150 so it limits near the end. Fine.
- Mass linear from m0 to mdry during burn: m = m0 - (m0-mdry)*t/200. After burn m = mdry.
- Gravity g(h) = g0*(R/(R+h))^2.
- Pitch: 0 until 10 s, then grows to 0.5 at 150 s, never decreases. Use a function: pitch(t) = t<=10?0: 0.5 * ((t-10)/140) maybe eased. At 150 -> 0.5. Then constant (never decreases). Must be monotonic non-decreasing. Use smoothstep or linear. Let's use: p = 0.5 * clamp((t-10)/140,0,1) maybe with slight curve. Fine.
- Acceleration: vertical: (T*cos(pitch))/m - g(h). Horizontal: (T*sin(pitch))/m.
- Integrate with substeps <= 0.02 s. Semi-implicit Euler.
- alt starts 0 (rocket on pad), vel 0. Rocket cannot go below pad: alt = max(0, alt); if alt==0 and vel<0 -> vel = 0.
- Also horizontal velocity, position x. But state only exposes alt, vel (vertical velocity?), acc (net vertical acceleration), pitch, speed. speed = sqrt(vx^2+vy^2) probably. Let's do that.
- Trail: array of {x,y,z} world points, one per step() call. x = horizontal displacement (x axis, maybe east), y = altitude, z = 0. Actually rocket world position: we can put rocket at pad, moves up in Y and in some horizontal direction (X). Trail points are world points of the rocket (maybe base). Push one per step call.

Note the trail should be "one per step() call" — even when step called with dt=0? Push after each call. Keep same array object on reset: trail.length = 0.

Now the rocket mesh. Rocket is 70 m tall, 3.7 m diameter. Build in a group with origin at base (bottom of engines) so position.y = alt. Actually rocket base sits on pad at y = padHeight. Let's define world Y up, pad top at y=0 for simplicity? Better: pad top at y = 0, rocket base at y=0, and alt measured from pad top so worldY = alt. Ground at y=0 too (land flat). Actually the pad is at ground level; let ground plane at y = 0, pad top slightly above at y = 0.5? Keep simple: ground at y=0, pad top y = 0. So rocket base y = alt. Good. Camera near pad at y ~ 2-5, distance ~ 150 m.

Rocket geometry:
- body: cylinder radius 1.85, height 70 total. Let's split: engine section 0..6 m (dark), tank/body 6..55, interstage 55..60 with darker band, fairing/nose 60..70 (cone-ish, ogive). Nose fairing: use LatheGeometry for ogive or use CylinderGeometry with top radius small.
- Actually Falcon 9: first stage + interstage + second stage + fairing. 70 m total. We'll make: engine section 0-3, body 3-40, interstage band 40-46, upper stage 46-58, fairing 58-70 (slightly wider? fairing diameter 5.2 m). Let's make fairing radius 2.6 (5.2 m diameter). Good.
- Nozzles: 9 small cones at the base. Use ConeGeometry with open ended, dark material.
- Markings: canvas texture with flag and "SpaceX"/"FALCON" lettering — but "no external fonts" fine, using canvas 2d fillText with generic sans-serif. Apply as a decal? Simpler: create a cylinder with the texture mapped as the body texture. We can create canvas texture of body with flag and lettering, use MeshStandardMaterial map with repeat. But easier: create a separate thin plane slightly outside body cylinder surface with texture (transparent). Use a canvas texture with flag + text, alpha. Position plane on body facing camera-ish. Alternatively wrap the whole body texture: canvas 1024x2048 with vertical stripes and lettering, applied to cylinder — lettering will wrap once around. That could look decent. Let's do a body texture canvas: white background, dark band, interstage, flag and lettering repeated? Use one canvas applied to the main body cylinder (height 40). Hmm.

Simplify: Use white PBR materials for body, separate meshes for bands/interstage with darker material. Add a canvas texture plane decal on the body: a vertical text "FALCON 9" plus small flag, on a plane curved? Use a plane positioned at radius+0.01, rotated to face outward, e.g. at angle theta. The plane will be tangent; fine. Add another on other side. Also "SPACEX" vertical lettering.

Let's do: createMarkingTexture() returns CanvasTexture with transparent background, drawing a US flag (blue canton + red stripes) and the word "SPACEX" rotated? Actually for a rocket, text reads vertically. We can draw text rotated 90 degrees. Use plane 6m wide x 10m tall, placed at radius 1.86, facing +Z, at y=25. Also mirror on other side facing -Z.

Physics state exposure: window.__rocket.

Now rendering features:
- Sky: use Sky addon. But Sky addon's turbidity etc. We need sky from blue to black at 100 km. Sky addon renders atmospheric scattering but doesn't go black with altitude automatically. We can tweak uniforms: Rayleigh, Mie, turbidity, and also fade to space with rocket altitude. Approach: create Sky mesh with scale large (e.g. 100000). Set uniforms. For altitude, we can't change camera altitude relative to sky easily... Actually Sky shader is based on view direction and sun position; it's an infinite sky. To make it dark with altitude, we can blend the sky with a black color by adjusting the sky material's uniforms? Sky addon has uniform "rayleigh" — decreasing rayleigh makes sky darker/bluer. We could set rayleigh to lerp(2, 0.05, altFactor) and mieCoefficient similarly, making the sky go dark. Plus add stars with opacity based on altitude. Also set scene.fog color that changes with altitude.

Alternative: use own gradient sky shader on a big sphere that goes from blue to black based on altitude. But requirement says "atmospheric scattering in the sky (e.g. the Sky addon or your own shader)". Sky addon is good. Let's use Sky addon and adjust uniforms over altitude; plus scene.background? The Sky mesh is huge, follows camera or centered at origin with big scale. If rocket goes to 100 km, the sky sphere must contain camera. We can set sky.scale to 1e6 and keep at origin; camera at 100 km still inside. Good. But Sky shader uses cameraPosition for direction; fine.

Actually Sky addon's shader computes sky based on sun direction and camera. With rayleigh decreased, sky gets darker. Let's test mentally: Sky shader output L0 = rayleigh * ... ; at horizon etc. Reducing rayleigh to 0 → black. Mie too. So set rayleigh = mix(2.0, 0.0, altFactor) and mieCoefficient = mix(0.005, 0.0, altFactor), turbidity fixed. Sun position constant.

Stars: Points with random positions on sphere radius ~ 2e5, size attenuation false, opacity based on altitude (0 below 70 km, 1 above 100 km; smoothstep). Use PointsMaterial with transparent, depthWrite false, size 1.5? With sizeAttenuation false and size in pixels.

Fog: scene.fog = new THREE.Fog(hazeColor, 200, 20000). Fog color pale hazy near horizon (#b8c8d8). But at altitude we want space black. We can adjust fog color and far per altitude. Or use FogExp2. With fog, distant objects fade. At high altitude, we can lerp fog density to 0. Use THREE.Fog with near/far and change far far away as altitude grows. Actually haze toward distance when on ground; at high alt, fog should vanish. We'll update fog color to darker and far larger with altitude. Since materials use fog, need materials fog:true (default). Fine.

Aerial perspective: fog handles it.

Ground: 
- Ocean: large plane at y = -0.5 maybe, positioned to the east (behind pad) covering horizon. Actually the ocean on the horizon behind the pad. Let's put ocean plane huge (200 km) at y=-1, covering everything, then land plane on top of it at y=0 covering up to a coastline. Simpler: a giant ocean plane at y=-0.6 (radius 100km), and a land disc/plane at y=0 with a coastline shape offset in -Z direction? Let's define: pad at origin, ocean to the east (+X) beyond x = +12000 m? Cape Canaveral: ocean east. Camera near pad looking at rocket (up and slightly east?), we want ocean visible on horizon behind pad. Let's orient: camera south-west of pad looking north-east? Simpler: camera positioned at (-60, 3, 90) looking at rocket; ocean at distance behind pad along +Z direction? Hmm.

Let's define rocket at origin, pad at origin. Camera near pad for liftoff at (-80, 2.5, 120), looking at rocket base/nose. Then ocean should be visible behind the rocket in the distance. Put ocean in +Z direction beyond z = 3000? Let's make land plane covering from z = -50000 to z = +2000 (coastline at z=+2000), and ocean from z=+2000 outward to +200000. Camera at z=120 looking toward origin (rocket) sees behind rocket +Z: coastline 2 km behind, ocean horizon. Good.

Land: plane 100km x 100km? Use PlaneGeometry rotated. Vegetation texture procedural: canvas with green scrub noise. Could use a large circular/disc ground with vertex colors. Simpler: plane 120000 x 120000 at y=0 with a canvas texture repeating, color dark green/brown. But ocean must be visible; place ocean plane at y=-0.8 over entire area, and land plane only covering z from -60000 to +2000. Use PlaneGeometry(width=200000, height=62000) centered at z = (2000 + (-60000))/2 = -29000. Rotate -PI/2. Ocean plane 400000 at y=-0.8. Then coastline visible at z=2000.

Add beach strip: a sand-colored plane along z between 1500 and 2000? Maybe overkill. Add a strip of sand at coastline.

Roads and low buildings: small boxes around pad, dark asphalt line shapes. Use instanced or simple boxes. Keep counts reasonable.

Vegetation: procedural ground texture with noise, plus many low bushes? For performance, use a canvas texture with green scrub mottling, repeated. Add some low bush meshes (icosahedron flattened, dark green) near pad, maybe 200 instanced. Could use InstancedMesh for bushes.

Pad: concrete pad, maybe 60x60 m with flame trench: a rectangular slot. Concrete canvas texture with noise. Add raised platform, and trench as a dark box cut: can't cut geometry, but add a dark trench box in the middle (a rectangular depression) with two concrete ramps. We can model pad as a large box with a trench: use two pad halves separated by gap along x, plus a dark trench floor. The rocket sits on a mount above the trench.

Lattice tower: built from thin cylinders/boxes: vertical legs and cross braces. Build using a function to create lattice mast with given height, width, and number of segments. Use InstancedMesh for braces? Simpler: use LineSegments with LineBasicMaterial for lattice, plus thin box columns. Lines look thin but okay. Better: use boxes for legs and braces, merged? Many meshes (~hundreds) might be okay but drawcalls. Use InstancedMesh per orientation? Hmm.

Alternative: create lattice using THREE.LineSegments with many segments — one draw call, looks like a lattice, but lines are 1px and don't receive shadows. For a "launch photograph" look, thicker members matter. We can use InstancedMesh of thin cylinders (or boxes) for braces: one InstancedMesh with count = number of members, each instance transformed. That's efficient. Let's do that: create a unit box geometry (1,1,1) and set instance matrices to stretch between points with thickness. Write helper `latticeBetween(points)`.

Build tower: 4 vertical legs at corners of 8x8 m, height 80 m, with horizontal rings every 5 m and diagonal X braces. Use InstancedMesh with box geometry; for each member between two points, compute matrix via position midpoint, quaternion from up vector to direction, scale (thickness, length, thickness).

Lightning masts: 3-4 tall masts (100 m) around pad with lattice, plus catenary wires? Add thin lines for wires.

Rocket flame/plume:
- Use a cone/cylinder mesh with additive shader material for the plume core, animated flicker via scale/opacity. Plus Sprite with radial gradient canvas texture for glow.
- PointLight at nozzle with intensity flickering, color orange, distance 300.
- Mach diamonds: a few small bright spheres/cones along plume? Could add a shader with stripes. Simpler: add a series of small additive cones/sprites along the plume axis with alternate brightness — "diamonds". Or use a custom shader for plume with `sin` modulation along length to create diamond pattern. Let's do a shader material on a cone geometry with uv.y along length: brightness = pow(1 - vUv.y, 1.5) * (0.8 + 0.2*sin(vUv.y*40)). Additive blending, depthWrite false. Two cones (inner bright white-yellow, outer orange). At altitude, plume expands: scale x/z with altitude factor and length grows.

- Plume length: at ground ~ 25 m, at altitude ~ 80 m. Scale over time/altitude.
- Plume only visible while thrusting (t < 200 s) and after liftoff.

Smoke/steam clouds:
- Particle system with many sprites using a soft radial gradient canvas texture (procedural). Use THREE.Points with a custom shader? Points with size attenuation and per-particle opacity. But large soft volumetric clouds need big particles. Use THREE.Points with a shader that computes size and opacity from attributes, with a fragment shader using gl_PointCoord for soft circle with noise-ish alpha. Many particles (~2000) with random drift. Simpler: use Points with PointsMaterial map=gradient texture, transparent, depthWrite=false, vertexColors, sizeAttenuation. But varying sizes per particle requires shader or separate systems.

Better: use an InstancedMesh of billboard planes with a soft texture and additive/normal blending? Billboard orientation needs per-instance facing camera each frame. That's heavy but doable: use ShaderMaterial with instanced quads, custom billboarding in vertex shader. That may be complex but gives good control. Alternatively use THREE.Points with custom ShaderMaterial: attributes position, size, alpha, color; vertex shader sets gl_PointSize = size * (300/ -mvPosition.z) etc; fragment shader samples nothing (procedural soft circle) using gl_PointCoord. Points are always screen-aligned billboards, perfect.

Use a custom ShaderMaterial for particles:
- attributes: position (vec3), size (float), opacity (float), color (vec3) maybe.
- uniform pixelRatio / scale.
- vertex: gl_PointSize = size * (500.0 / -mvPosition.z) ... standard.
- fragment: alpha = smoothstep(0.5, 0.0, dist) * opacity; maybe multiply by soft noise using gl_PointCoord. Combine color.

But large point sprites get clipped when center is off-screen? Points get clipped by their center crossing frustum? WebGL points are clipped when center outside; large points near screen edge can disappear. Acceptable.

Volume: 3000 particles of smoke. Update positions each frame with velocity, drag, rise, expand. Manage arrays in JS (Float32Array attributes, update needsUpdate).

Let's implement a smoke system:
- MAX particles e.g. 1600.
- Each particle has position, velocity, life, maxLife, size, seed.
- Spawn continuously at ground near trench exits (left/right) and below rocket as it lifts, while t < ~20 s after liftoff? Actually steam clouds persist. Spawn from t=0 (ignition) to t=25 s, and also for a bit as rocket ascends low. In playback, time advances fast (10x), so particle simulation should use real frame delta or simulation time? Use simulation time scaled: we can update particles with dt (real) * playback? For visual, using real dt may cause smoke to linger while rocket zooms. But physics time is sped up 10x, so the rocket leaves quickly. The smoke should billow fast. Use dt*clamp(speed,1,3) for smoke, or use simulation dt but cap. Let's use simulation dt (already scaled) for particle evolution, but that means at 10x smoke flies fast. That's okay — smoke is billowing out quickly. But with 10x, particles at 30 m/s move 300 m/s, looks too fast. Hmm. Better: use real dt for smoke, since it's visual spectacle. And spawn rate based on simulation time. Actually if playback is 10x, the first 10 s (real-time) still uses 1x, so liftoff smoke is real. After that, rocket is already 100+ m up, and camera goes with it. Ground smoke not important. We'll use real dt clamped for particles, and spawn counts based on sim time thresholds.

Contrail: a line from trail points, white, fading with altitude? "Trail: a visible white contrail behind the rocket, drawn from the trail points." Use THREE.Line with BufferGeometry updated from trail array. Trail points are world points at rocket base; add offset? The line should be behind the rocket. Points stored maybe at rocket center. Use white LineBasicMaterial transparent opacity 0.6, depthWrite false. Could use Line2 addon for thick lines, but import 'three/addons/lines/Line2.js' etc. Simpler: THREE.Line with linewidth ignored (1px). Might look thin. Could build a ribbon/tube? We can build a tube geometry updated each frame from trail points — expensive but trail could be long. Alternative: use a Points cloud? Hmm.

We can use a custom "ribbon" mesh: generate a strip along the trail with width in screen space? Complex. Use Line2 from addons: Line2, LineMaterial, LineGeometry. That gives thick lines. Import:
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
These work. LineMaterial needs resolution. We can set linewidth 2-4. Update geometry each frame via setPositions(trail array flattened). If trail gets huge (with 10x speed and sim minutes), thousands of points; fine, but setPositions each frame with large arrays might be costly. Limit by rendering every few points? We can rebuild every few frames. Let's cap points: if trail length > 5000, maybe decimate for rendering. Actually total sim time maybe 500 s at 10x = 50 s real, step called each frame ~60fps => 3000 points. Fine.

Line2 requires geometry with positions and maybe instanceCount. It should be fine. But setPositions expects number[]; convert. Doing it every frame at 3000 points is okay-ish. Let's rebuild every 3 frames.

Hmm, complexity. Alternatively use THREE.Line and accept 1px. The requirement just says visible white contrail. A 1px line at 1080p is thin but visible. Let's use Line2 for quality, but risk of type errors. Let's check LineMaterial in three r160+: `new LineMaterial({ color: 0xffffff, linewidth: 3, worldUnits: false, transparent: true, opacity: 0.7, depthWrite: false })` and `material.resolution.set(w, h)`. LineGeometry: `lineGeom.setPositions(positions)`. `new Line2(geom, mat)`, `line.computeLineDistances()`. Fine.

Trail world points: physics trail points are at rocket base (x, alt, 0). For rendering, offset to rocket center (y + 35) maybe. We can map trail point to (x, y+35, z) to draw through rocket axis. But the contrail behind rocket should originate at engines. For ascent, the plume. Let's draw through the rocket center offset by +20 m so it looks like a column. Hmm, physically the exhaust trail marks the path of the engines; drawing through base is correct. But then line passes through rocket body? Rocket is at the tip; trail behind. Use base points exactly. Fine.

Camera:
- Phase 1: low camera near pad looking up. Camera at (-70, 2.5, 110), lookAt rocket mid/plume.
- After rocket clears tower (alt > ~80 m or t > ~8 s), switch to chase camera near rocket: offset from rocket position, e.g. (rocketX + 55, alt + 20, 55) looking at rocket mid. Smoothly interpolate.
- Need to handle high altitude: camera relative to rocket.
- Use smooth damping (lerp with dt).
- When rocket is high, we want to see the coast, Earth curve, space. The camera follows rocket ~60-100 m away.
- Provide smooth transition: weight = smoothstep(70, 150, alt) or based on time since alt > tower.
- Camera target: rocket position + (0, 35, 0). Desired camera position: rocketPos + offset where offset rotates slowly? Keep offset with slight variation by time. Near rocket within 100 m: e.g. offset (60, 25, 70) => distance ~96. Good. At high altitude, maybe offset rotates to show Earth below: camera up-ish? For view of coast and curve of Earth, we want camera looking at rocket with Earth in background — offset with slight downward component? If camera is beside rocket, the Earth is below and the rocket near; the background may be space. To see the coast and curve of Earth, we could have camera positioned slightly below and to the side, looking up at rocket, with Earth horizon in background. But near 100 km, the rocket is high; coast far below. It's fine; we can tilt camera a bit.

Actually simpler: camera offset in rocket's local frame rotated such that view shows rocket against Earth. If camera is at same altitude as rocket, looking horizontally, background is space (or horizon). To see the Earth's curve we'd need to look down a bit. Let's position camera slightly above rocket looking down? Then background is Earth. Hmm. Chase plane: camera at rocket altitude + 20 m, 80 m away horizontally, looking at rocket center — the view direction is slightly downward toward rocket center (which is at y ~ rocket base+35). Background beyond rocket is Earth far below? If we're at 100 km and looking horizontally, the Earth limb is below, so background above horizon is black. The rocket will be silhouetted against black sky, with maybe the horizon below. That's realistic.

Maybe vary offset: at low altitude, camera low and near pad; in mid-ascent, chase close; at high altitude, pull back a bit and angle so Earth limb visible. Keep it simple and smooth.

Overlay: create a div with monospace font, position absolute, top-left, color white, background rgba(0,0,0,0.35), padding, pointer-events none. Show "T+ 00:00", "ALT 0.00 km", "VEL 0 m/s", "SPEED x1". Also mission data. Buttons bottom: x1, x10, x30. Use DOM createElement, append to body. Buttons pointer-events auto.

Keys: '1','2','3' set speed. Also maybe space to pause? Requirement says paused boolean; not required key but nice: 'p' or space toggles. Add it.

Viewer speed choice: default speed is 1 for t<10, then 10 unless viewer chose. So state().speed returns 1 if t<10 else (chosenSpeed ?? 10). Reset clears chosen.

Careful: "speed is the time scale. It is 1 for the liftoff (t < 10 s) and then 10, unless the viewer chose a speed". So state().speed computed dynamically: if t < 10 return 1; else chosen ?? 10. But if the viewer chose x1 before 10 s, after 10 s should it be 1? "unless the viewer chose a speed" — yes, chosen overrides after 10. But at t<10 must be 1 always? It says "It is 1 for the liftoff (t < 10 s) and then 10, unless the viewer chose a speed". So viewer choice could override even at t<10? I'd say viewer choice overrides at all times except maybe default. But "It is 1 for the liftoff" is a strong statement. Let's implement: if chosenSpeed === null: return t < 10 ? 1 : 10; else return chosenSpeed. Hmm, but then choosing x30 before 10s would make speed 30. That seems acceptable ("unless the viewer chose a speed"). Actually ambiguous. Tests might check state().speed at t<10 = 1. If a test sets speed by key then steps... unlikely. Safer: at t < 10, always return 1? But then pressing x30 at start does nothing, confusing. Requirement: "Playback speed ... It is 1 for the liftoff (t < 10 s) and then 10, unless the viewer chose a speed: keys 1, 2, 3 ... set x1, x10, x30. state().speed returns the current value; reset() clears the viewer's choice." I'll implement chosen override including early. Hmm, tests likely: reset, check speed == 1; step(5), speed 1; step(10), speed 10; press... no. I'll go with: if (chosen !== null) return chosen; return t < 10 ? 1 : 10. Wait at reset t=0 speed 1 (chosen null) ✓. At t=20 -> 10 ✓. Fine.

But "It is 1 for the liftoff (t < 10 s)" might be violated if chosen. I'll keep override; it says unless the viewer chose.

Hmm, but a tester may simulate key press? Not accessible through __rocket. They can only read state().speed. So chosen only changed via UI. Fine.

Physics step: any dt; substeps max 0.02. Handle dt potentially huge (e.g. 1000 s): loop. Need to avoid infinite loops; dt finite. Use n = ceil(dt/0.02). Loop n times with h = dt/n.

Mass: during burn, m = m0 - (m0 - mdry) * (t/burn) — linear. Note "the mass falls linearly from m0 to the dry mass during the burn". Yes.

Thrust: if t >= 200 -> 0. else T = min(1.3*m0*g0, 3*m*g0). Note at t=0 thrust = 1.3*m0*g0 > weight, so it lifts. But the rocket is on the pad and "cannot go below the pad". With thrust > weight, immediately accelerates. Good. Acceleration net vertical = T*cos(pitch)/m - g.

Hmm, net vertical acc at t=0 is 1.3*g0 - g0 = 0.3*g0 = 2.943 m/s². Good.

Pitch function: at t=10 start, reach 0.5 at 150. Use p = 0.5 * smoothstep? Linear gives 0.5 at 150 with slope. "reaching about 0.5 rad at 150 s, and it never decreases". Use p = 0.5 * clamp((t-10)/140)^0.8? Keep monotonic. Let's use a gravity turn with increasing rate? Real gravity turn pitch rate slows. Use p = 0.5 * (1 - cos(π/2 * u))? That's smooth at start. At u=1 -> 0.5. Monotonic. After 150 constant 0.5. Good. Actually then pitch grows slowly at first and fast around 80, fine.

Horizontal position: x += vx*h. vx initial 0. Since pitch>0, thrust has horizontal component. World x.

Velocity: vertical vy, horizontal vx. state.vel = vy (vertical velocity) presumably; state.speed = sqrt(vx²+vy²). "vel (m/s)" ambiguous. Given "state(): { t, alt (m), vel (m/s), acc (net vertical acceleration), pitch, speed }". I'd set vel = vertical velocity (m/s), speed = total. acc = net vertical acceleration. That's consistent.

Rocket world position: (x, alt, 0) where x = horizontal displacement and alt above pad.

Trail points: push {x: this.x, y: alt, z: 0} after each step() call. "one per step() call" - even if dt=0? If dt=0, push a point maybe duplicate. Let's push always.

Reset: t=0, alt=0, vy=0, vx=0, x=0, pitch=0, acc computed, trail.length=0, paused unchanged? "reset(): time 0, the rocket on the pad, trail emptied (keep the same array object)". paused maybe set false? Not specified. Keep paused? Probably reset paused=false. Hmm. "reset() clears the viewer's choice" for speed. I'll set paused = false too? Tests might set paused true then reset and expect false? Unclear. I'd leave paused false for a clean reset. Actually likely they set paused then step to verify no movement. Reset not involved. Setting false is fine.

Initial step: after reset, maybe push initial point? Trail "one per step() call" - reset empties, no point until step. Fine.

Let's code physics class.

```ts
class RocketSim {
  t = 0; alt = 0; vy = 0; vx = 0; x = 0; acc = 0; pitch = 0;
  trail: {x:number;y:number;z:number}[] = [];
  paused = false;
  chosenSpeed: number | null = null;
  get speed(): number {...}
  reset() {...}
  step(dt: number) {...}
  state() {...}
}
```

Note exposing `trail` array directly; keep same object: `this.trail.length = 0`.

Now let's think about rendering coordinates. Rocket 70 m tall. Camera near pad at maybe (-80, 3, 130) looking at (0, 20, 0)? Distance ~150. Rocket occupies decent screen. FOV 50.

At liftoff flame and smoke occupy foreground. Good.

Ground scale: 1 unit = 1 m. Far plane maybe 5e6 (to see ocean and Earth). Fog far 30000 initially.

Sun: DirectionalLight, position e.g. (-500, 800, 400) normalized * large, castShadow with shadow camera covering pad (left/right ±200, top/bottom ±200, near 1, far 3000). As rocket ascends, we can move shadow camera to follow? Shadow on rocket/plume mostly near pad. At altitude, shadows not important. Set shadow camera bounds ±300, near 0.5, far 5000. Light target at (0,0,0).

Sky addon: `new Sky(); sky.scale.setScalar(450000); scene.add(sky);` Sun position: `sky.material.uniforms.sunPosition.value.copy(sunDir)`. In newer three, Sky uses `sunPosition` uniform. Yes.

Tone mapping ACESFilmic, exposure ~0.9. With Sky addon scaled 450000, its brightness is high (radiance). Sky addon output is quite bright; ACES handles.

EffectComposer with RenderPass + UnrealBloomPass. Set renderer.setPixelRatio(min(devicePixelRatio,2)). Composer setSize. Bloom strength ~0.7, radius 0.5, threshold 0.9.

Need renderer.outputColorSpace = SRGBColorSpace (default in recent three). Use `THREE.SRGBColorSpace`.

Rocket materials: MeshStandardMaterial white (color 0xf2f2f2, roughness 0.35, metalness 0.15), dark bands (0x1a1a1c, roughness 0.6), interstage black, engine section dark gray. Nozzles with metalness 0.9, roughness 0.35, color 0x444444.

Nose fairing: use LatheGeometry with points to create ogive shape. Let's craft lathe profile:
```
const pts: THREE.Vector2[] = [];
// from base radius 2.6 at y=0 up to tip
for (let i=0;i<=16;i++){ const u=i/16; const y=12*u; const r=2.6*Math.cos(u*Math.PI/2)**0.5? }
```
For a fairing, an ogive: r = 2.6 * sqrt(1 - u^2) maybe gives elliptical. Use `r = 2.6 * Math.sqrt(Math.max(0, 1 - u*u))` with a slight cylinder base. At u=1 r=0. That's an ellipsoid nose, fine. Fairing height 12 m, from y=58 to 70. Add a cylinder from 58 to 61 (r=2.6) plus ogive 61-70.

Actually simpler: body cylinder 3.7 diameter from y=0..55; upper stage/fairing from 55..70 with radius 2.6 (5.2 m). But Falcon 9 fairing is 5.2 m wide and the rocket is 3.7 m. Yes, that looks right: second stage + fairing wider than first stage. But interstage: first stage top at 47? Let's structure:
- Engine section: y 0..4, r 1.85, dark gray.
- First stage tank: y 4..42, r 1.85, white with black band at top? Add dark band 38..42.
- Interstage: y 42..48, r 1.9, black/dark composite.
- Second stage: y 48..58, r 1.85, white.
- Fairing: y 58..70, r 2.6 (cylinder 58..62, ogive 62..70). Good.
Total 70.

Nozzles: 9 cones at y 0..2? Place at base y=0, pointing down. ConeGeometry(0.45, 2.2, 12, 1, true) with apex? Cone has apex at top; we want nozzle with wide bottom and narrow top? Actually engine nozzle is bell: wide at bottom, narrow at throat. Use CylinderGeometry(0.35, 0.55, 2.0, 12, 1, true) (top radius 0.35, bottom 0.55). Positioned y=1.0. 8 around radius 1.2, 1 center. Dark metal with inner glow? Add emissive material maybe not.

Rocket origin at base: group.position.set(x, alt, 0). Base at pad top y=0.

Rocket orientation: pitch tilts the rocket. At pitch 0 vertical; as pitch increases, rocket tilts. The physics says pitch is angle of thrust from vertical. Visual: rotate rocket around Z axis by pitch so nose tips toward +X. Since horizontal motion is +X. `rocket.rotation.z = -pitch`? In three, rotating around Z by negative angle tips +Y toward +X. Yes, rotation.z = -pitch. Rotation order default XYZ; rotation about z. Fine.

When the rocket tilts, we should rotate the group around its base (origin at base) — good.

Plume attached to rocket group at the base, pointing down (-Y), and rotates with rocket. Fine.

Smoke spawn position: near ground around pad, in world coords.

Camera chase: rocket world position = (x, alt, 0) base. Rocket center = (x, alt+35, 0). Camera desired = center + offset. Offset maybe (70, 10, 80) => distance ~106. Within 100 m? Requirement "within about 100 m". Use (60, 5, 60) => sqrt(3600+25+3600)=85. Good. Looking at center. But we need to avoid the rocket pointing toward camera as it tilts; fine.

Add slight orbital motion: offset angle = 0.6 + sin(time*0.05)*0.2. Compute camera pos = center + (cos(a)*R, yOffset, sin(a)*R). At high altitude, maybe increase R to 90.

Smooth camera: `camera.position.lerp(desired, 1 - Math.exp(-dt*2.5))`; and lookAt smoothed target. Use a separate `camTarget` vector lerped.

Transition: phase = smoothstep(60, 160, alt) maybe also based on t>7. At t<7 altitude maybe ~70 m? Compute: a ~ 3 m/s² increasing as mass drops... after 7 s v ~ 25 m/s, alt ~ 100 m. Tower is 80 m. Let's use alt threshold: blend = smoothstep(80, 200, alt). At that point rocket is above tower. The low camera can track it by lookAt. So:

```
const center = (x, alt+35, 0)
lowCamPos = (-80, 4, 130) fixed
lowLookAt = center
chasePos = center + offset
desiredPos = lerp(lowCamPos, chasePos, blend)
desiredTarget = lerp(lowLookAt, center, blend)? both same-ish.
```
When blend=0, camera fixed near pad looking at rocket; as rocket climbs, it looks up (lookAt center). Good.
But as rocket goes high, low camera lookAt changes fast; transition to chase avoids extreme.

At high altitude, we want the Earth curvature: as camera follows, the horizon might not be visible because looking at rocket horizontally. Could tilt chase offset to be slightly above rocket so we look down at Earth? Let's set chase offset y = 15 (above center) and camera looks at center; then view direction is downward slightly, with Earth below. Actually if camera is 15 m above rocket center, 85 m away, the downward angle is ~10°, so the background behind rocket is space above horizon? The Earth limb from 100 km is at depression angle ~ acos(R/(R+h)) ≈ 10.1° below horizontal. Hmm, so the horizon is 10° below horizontal. Camera looking down 10° means horizon near center. Nice: rocket silhouette with Earth limb behind. But the rocket is 70 m tall at 85 m distance, filling view; background at rocket lower body might be Earth. Good.

Let's vary chase offset y with altitude: y offset from -10 at low to +20 at high? Simpler fixed (60, 20, 60).

At very high altitude (>200 km?), Earth should look curved. Our ground plane is flat, not a sphere. Requirement says "the curve of the Earth". We can approximate by rendering a large sphere for the Earth at high altitude, or use a big sphere with radius R and procedural ocean/land? That's heavy. Maybe add a "Earth limb" sphere: a huge sphere centered at (0, -R, 0) with radius R, blue-ish material with atmosphere glow; but our local ground plane would conflict. Alternative: as altitude increases, fade in a big sphere representing Earth (radius 6,371,000) centered at (0, -R, 0), textured with procedural ocean/land colors. But the pad scene at low altitude is within this sphere, hidden. Could enable it only above say 30 km, and hide the flat ground? Hmm, the sphere would surround everything; at low alt it's beneath the ground plane so not visible. At high alt, the flat ground plane is still there (a 200 km plane) which at 100 km altitude would look weird.

Maybe simpler: keep the flat ground/ocean (200 km extent) and the horizon curve won't be very visible. The requirement specifically mentions "the curve of the Earth". We could add a subtle curved horizon by using a giant ring/sphere at high altitude. Let's think.

Option: Use a "far ground" sphere of radius R centered at (0, -R, 0) with a shader that renders ocean blue and land green — but we already have local ground. If the sphere is slightly below the local ground (radius R, center -R so top at y=0), its top touches the local ground plane. At high altitude, the sphere surface curves away, giving Earth's limb. The local flat plane extends 200 km; at 100 km altitude, the flat plane edge at 100 km distance would appear below. The sphere is beneath it and hidden by the plane until the plane edge. Hmm, the flat plane would occlude the sphere's horizon. If the plane is smaller (say 50 km), then beyond it the sphere shows. But at ground level, the flat plane needs to reach the ocean horizon (~20 km due to curvature, but with haze we can't see farther). Use fog far 30000 (30 km). So make flat land/ocean 60 km; beyond it the Earth sphere takes over, hidden by fog at low altitude. At high altitude, fog fades and we see the sphere's curvature. Nice.

But building a textured Earth sphere with continents is complex without textures. We can use a procedural shader with noise for land/ocean, or simply a sphere with a blue-green gradient plus clouds noise. At high altitude the visible portion is near Cape Canaveral — mostly ocean and Florida coast. Our flat local ground sits on top of the sphere at the pad region. Could be fine visually.

Alternative: Use a "horizon haze" ring to fake curvature.

Given time, maybe implement a large Earth sphere with a shader: ocean blue with subtle noise, land green in a limited region? Hmm. Could use a canvas texture 2048x1024 procedural equirectangular map with continents? Generating a recognizable Florida coast is hard. Could generate generic landmasses with noise. The user likely checks visuals loosely. A curved Earth limb at high altitude is a nice touch.

Let's do: Earth sphere radius 6,371,000 at center (0, -6,371,000, 0), with a ShaderMaterial that mixes ocean color and a subtle noise land? Simpler: draw a canvas equirect texture with blue base, green/brown blotches using value noise, plus white clouds? 2048x1024 canvas generation with sin-based noise is fine. Use MeshStandardMaterial with map & roughness, but lighting from sun. At high altitude, mostly blue with some green. Hmm, could look like a planet.

But the sphere's radius is huge relative to camera; depth precision issues. Use logarithmicDepthBuffer? That helps. Set renderer logarithmicDepthBuffer: true maybe. With far plane 10^8. Hmm, sky sphere at 450,000 scale? Sky addon scale 450000 means radius ~450000. Earth radius 6.4e6. Far plane need > 7e6. Set camera.far = 2e7, near = 0.5, logarithmicDepthBuffer: true. Fine, but logarithmic depth can have issues with some materials/shaders. Alternative: near=1, far=1e7 and accept z-fighting. Our pad details at 1 m scale, near 0.5, far 1e7: depth precision terrible. Use logarithmicDepthBuffer.

Hmm, Sky addon with scale 450000 is inside Earth sphere? That's fine; sky mesh rendered (depthWrite false presumably, sky material side BackSide). Actually Sky addon's material has depthWrite false and side: BackSide, and it's rendered as background-ish. If Earth sphere is at 6.4e6 and sky at 450000, sky is closer, so sky would occlude Earth. Bad! Sky addon's mesh scale must be larger than Earth if Earth is visible. We can set sky.scale to 1e7? The sky shader uses camera direction only, so scale can be huge. Set sky.scale.setScalar(8.0e6) or 9e6, larger than Earth radius. But then it's beyond far plane? far 2e7 fine. However sky is a sphere centered at origin, Earth sphere centered at (0,-R,0) extends to radius R; at origin, Earth surface is 6.4e6 below. Sky sphere radius 9e6 around camera, so Earth is inside sky sphere, good, Earth rendered in front of sky. But the sky sphere is centered at origin and camera moves up to 100 km, still inside. Fine.

Alternatively make Earth a smaller "disk"/spherical cap near origin that stays below and renders only at high altitude. Simpler: Create a "Earth limb" mesh: a large sphere of radius R centered at (0,-R,0) but only render above e.g. 20 km. It's always there and might appear at ground level? At ground, camera at y=3, the sphere's interior? Camera is inside the sphere (since sphere center -R, radius R; camera at origin is exactly on surface). Hmm, at y=0 we're exactly on the sphere surface; above, inside? Distance from center = R + alt, which is > R, so outside the sphere. So the sphere is below us, visible as ground everywhere. It would replace the flat ground. At ground level the sphere surface is at y=0 at the origin, curving down. The local flat pad sits on the sphere's top. Beyond 5 km, the sphere curves below the flat plane. If the flat plane is 60 km, it occludes the sphere until its edge. Then the sphere appears beyond 30 km (fog hides). At altitude, we see the sphere limb. Great, that could work. The sphere with a procedural map: ocean and land. But at low altitude near the pad, the sphere is just below the flat ground, hidden. Fine.

Let's set the sphere radius maybe 6,371,000 but rendering a sphere that large with camera near its surface: vertices need to be dense? Sphere geometry 128x64, radius 6.4e6 -> segment size ~ 300 km; the local surface would be very coarse and could poke through the flat plane. The top of the sphere near origin is a vertex maybe; with center below, the surface at origin is exactly y=0 but nearby it curves down (1 km away, drop 0.08 m; 10 km -> 7.8 m). Actually a sphere of R=6371 km curves 7.8 m down at 10 km. The ground plane is flat at y=0, so it occludes the sphere (sphere lower). Good, as long as the sphere doesn't poke above due to coarse tessellation. Coarse segments would create flat chords below the true sphere (inscribed), so they are below. Good. But the visible horizon at high altitude: sphere surface rendered coarse but fine because huge.

Earth sphere texture: procedural canvas 1024x512 with blue ocean and green/brown continent blobs. But orientation/scale: the visible area at 100 km is a circle of radius ~ 1100 km (horizon distance sqrt(2Rh) ≈ 1128 km). With a 1024-wide texture over 40,000 km circumference, 1100 km is 28 pixels. Too coarse. Use 4096x2048 → ~112 px. Still coarse but okay for abstract land. We could instead make the texture mostly ocean blue with faint land; Cape Canaveral is on the coast, so mostly ocean and a land strip. Maybe generate a local "land patch" around the origin in the shader rather than a full map: use the sphere's local coordinates? Complex.

Alternative approach for the curve of Earth: render a thin "horizon" ring/arc at high altitude, no texture. Hmm.

Maybe simpler: Fake the Earth's limb with a large sphere that is mostly ocean blue with an atmospheric glow shader, plus we keep the procedural land plane visible near the pad. At high altitude, the sphere shows blue-white. It'd look like Earth's ocean/atmosphere from near the coast. Acceptable.

Let's do a custom ShaderMaterial for the Earth sphere with a procedural ocean/land based on the direction/normal noise (3D value noise in the shader). Generate continents with fbm noise. Color ocean deep blue, land greenish-brown, ice caps white near poles. Plus a rim atmosphere glow? For a sphere that big, atmosphere glow can be added as a slightly larger sphere with additive shader (Fresnel). That would look nice.

But we also have scene fog; the Earth sphere far away would be fogged. At high altitude we reduce fog. Set material fog false for the Earth sphere (ShaderMaterial without fog). Good.

Sun light at high altitude still illuminates.

Let's evaluate scope. This is a huge single file. Need to manage complexity and compile errors. Let's design modular code with clear sections.

Potential compile pitfalls:
- `THREE.Sky` addon import: `import { Sky } from 'three/addons/objects/Sky.js';`
- EffectComposer: `import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';` etc.
- UnrealBloomPass: `import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';`
- `renderer.setAnimationLoop((time: number) => ...)` — types: the callback receives time. In newer three types, setAnimationLoop takes `XRAnimationLoopCallback | null` = `(time: number, frame?: XRFrame) => void`. Fine.
- `new THREE.CanvasTexture(canvas)`.
- `THREE.SRGBColorSpace`, `texture.colorSpace = THREE.SRGBColorSpace`.
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`.
- Type strict: all variables typed, no implicit any. Careful with forEach callbacks: annotate params or infer from array type. Use explicit types.
- DOM elements: `document.createElement('div')` types.

For shaders: use `new THREE.ShaderMaterial({...})` with uniforms object typed as `{ [key: string]: THREE.IUniform }` or just inline; TS infers. Access `material.uniforms.foo.value`—inferred as any? When we construct ShaderMaterial, uniforms property typed `{ [uniform: string]: IUniform }`, so `.uniforms.foo.value` is `any`, which is allowed under strict (noImplicitAny only for implicit). Fine.

InstancedMesh matrices: use dummy Object3D, `dummy.updateMatrix()`, `mesh.setMatrixAt(i, dummy.matrix)`. Fine.

Let's write the code.

Structure:

```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
```

Constants.

Renderer:
```ts
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
```

Scene:
```ts
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa9c2d8, 400, 30000);
```

Camera:
```ts
const camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 2.5e7);
camera.position.set(-85, 4, 130);
```

Sun light:
```ts
const sunDir = new THREE.Vector3(-0.35, 0.55, 0.75).normalize(); // sun direction from origin? 
```
Sky sunPosition should point toward the sun. Directional light position = sunDir * 2000.

Cape Canaveral morning sun lowish: sun elevation 25°. Let's set sunDir = (0.55, 0.42, 0.72).normalize()? The ocean is +Z, so sun maybe over ocean. Let's choose sunDir = (0.6, 0.35, 0.7).normalize() (sun in front-right). Sky sun position accordingly.

Directional light:
```ts
const sun = new THREE.DirectionalLight(0xfff2e0, 3.0);
sun.position.copy(sunDir).multiplyScalar(800);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera; sc.near = 10; sc.far = 3000; sc.left=-250; ...
sun.shadow.bias = -0.0005;
sun.target.position.set(0,0,0);
scene.add(sun, sun.target);
```
Intensity values: with ACES and physically correct lighting (three r155+ uses physically correct units by default), a DirectionalLight intensity of 3 is bright. Sky addon is very bright. Use ambient HemisphereLight 0.5 maybe.

Sky:
```ts
const sky = new Sky();
sky.scale.setScalar(9.0e6);
scene.add(sky);
const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 6;
skyUniforms['rayleigh'].value = 2.2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;
skyUniforms['sunPosition'].value.copy(sunDir);
```
Note: sky.material is typed as `Material`? In the addon TS declarations, Sky class has `material: ShaderMaterial` maybe. If it's `Material`, accessing `.uniforms` errors. In three's examples, Sky extends Mesh<SphereGeometry, SkyMaterial>? Let's check. `three/examples/jsm/objects/Sky.js` defines `class Sky extends Mesh { constructor() { const shader = SkyShader; const material = new ShaderMaterial(...); super(geometry, material); this.isSky = true; } }`. TS types likely: `export class Sky extends Mesh<SphereGeometry, ShaderMaterial>`. If generic, `sky.material.uniforms` works. If `Mesh` non-generic (defaults to `Mesh<BufferGeometry, Material | Material[]>`), then `material` is `Material | Material[]` and `.uniforms` errors. To be safe, cast: `const skyMat = sky.material as THREE.ShaderMaterial;`. Good.

Also newer three might have `sky.material.uniforms` with `sunPosition`. Fine.

Stars:
```ts
const starGeo = new THREE.BufferGeometry();
const starCount = 3000;
const pos = new Float32Array(starCount*3);
for ... random on sphere radius 1.5e5
starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
const stars = new THREE.Points(starGeo, starMat);
stars.frustumCulled = false;
scene.add(stars);
```
But stars radius 150000, sky sphere radius 9e6, Earth 6.4e6. Stars at 150000 within Earth sphere? Camera at high altitude (100 km) is at distance R+h from Earth center; stars sphere centered at origin with radius 150000; camera at 100 km is outside star sphere (100,000 < 150,000? camera at y=100000, radius 150000, so inside). Good up to 150 km. Beyond that stars would be outside; we can make stars radius 5e6 (within Earth? camera at 100 km is way inside, fine). Use radius 4e6, still less than Earth sphere at 6.4e6? Doesn't matter with depthWrite false and renderOrder. Points depthTest false maybe. Set `depthTest: false, depthWrite: false, renderOrder: 1` so they draw over sky but behind objects? If depthTest false, stars will draw over the rocket! Unless renderOrder negative and objects draw after? With depthTest false, stars always visible on top of whatever was drawn before. Draw stars first (renderOrder = -1) then other objects with depthTest true will draw over them if closer... Actually if stars drawn first with depthWrite false, later objects will write color over them regardless of depth (depth buffer untouched). So stars appear behind everything. Good: set stars.renderOrder = -1, material.depthTest = false, depthWrite = false. But the sky mesh drawn before? The sky writes color (depthWrite false). Stars after sky, before other objects if renderOrder -1 vs default 0. Yes. Set sky.renderOrder = -2. Good.

Stars opacity driven by altitude: `smoothstep(70000, 110000, alt)`.

Earth sphere:
Maybe make it optional. Let's create with a shader.

```ts
const earthGroup = new THREE.Group();
const earthMat = new THREE.ShaderMaterial({
  uniforms: { uSun: {value: sunDir}, uTime: ... },
  vertexShader: ..., fragmentShader: ...,
  side: THREE.FrontSide,
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), earthMat);
earth.position.set(0, -R, 0);
earth.frustumCulled = false;
scene.add(earth);
```
Careful: camera at y=0 is exactly on the sphere surface; with logarithmic depth near plane 0.5, the sphere surface at y=0 could z-fight with the ground plane. The ground plane is at y=0, same. Let's place earth sphere center at (0, -R - 2, 0) so its top is y=-2, below ground. At high altitude, slight offset invisible. Good.

Procedural earth shader:
- Use world position to compute noise? On a sphere, use normalized local position as 3D coordinates for fbm noise. Vertex passes `vPos = position` (local, radius R). Fragment: `vec3 n = normalize(vPos);` compute fbm(n * 4.0). Land mask: smoothstep, with noise. Add ocean/land color. Add ice near |n.y| > 0.85. Add a subtle atmospheric rim? We can add a separate atmosphere mesh with additive Fresnel.

Actually the pad is at the "top" of the sphere, n = (0,1,0). The noise determines land there randomly. We want land under the pad and ocean visible toward the horizon. Since the Earth sphere is huge and the visible local area is small, a random noise at scale 4 might put a continent edge near the pad, which could look nice. We can bias: `float land = smoothstep(0.15, 0.35, fbm(n*3.0)) ;` plus force land near the top? Let's not overthink.

At low altitude, the earth sphere is hidden below the ground plane. Ground plane size: to hide the sphere near the pad we use a land plane 80 km and ocean plane 300 km at y=-1? Wait, ocean needs to be part of the scene at ground level. If we have the Earth sphere with ocean, maybe we don't need the huge ocean plane. The sphere is ocean/land, but its top is at y=-2 near the pad, so if we extend a flat ground plane only around the pad (say 40 km), the ocean sphere surface beyond 40 km would still be at y ≈ -2 - (d²/(2R)) — essentially level. From a low camera, the horizon would be at the sphere surface, but with fog at 30 km, it's hidden. Hmm, the flat ocean plane could just be a local plane extending 60 km with ocean material, and beyond that the Earth sphere. With fog, seamless.

Let's use a flat ocean plane 200 km x 200 km at y=-1.5, and land plane 80 km x 80 km at y=0 offset so coastline at z=+2500. Then the Earth sphere is below at y=-2 and hidden entirely by these planes at low altitude. At high altitude, the planes' edges (100 km) will be visible as a square, which is ugly. But with altitude, we can fade out the flat planes' opacity? Ground material opaque; fading at high altitude could reveal the sphere. We can set material.transparent = true and opacity fade to 0 based on altitude. But transparency with fog etc. Hmm.

Alternative: make the flat ground planes circular discs (radius 40 km for land+ocean) instead of squares, so the edge is a smooth circle. At high altitude, fade them out when alt > 20 km, revealing the Earth sphere. The pad and everything else are at the center, visible.

Let's do:
- Ocean disc: CircleGeometry(radius 60000, 64) at y=-1.5 (or a big plane? circle edge at 60 km with fog at 30 km at ground).
- Land: use a shape approximating a coastline: land half-disc? We need ocean beyond coastline +Z. Let's build land as a large rectangle covering z from -60000 to +2500, x ±60000, but at high altitude it has square edges. Fade out at altitude anyway. Or land as a CircleGeometry clipped? Could use a shape with a curved coastline. Simpler: land plane 120km x 120km centered at z = -58000 (so it spans z -118000..+2000). At ground level, we only see up to 30 km due to fog, so fine. At high altitude, fade.

For the horizon at ground level, ocean disc edge at 60 km plus fog → pale haze. Good.

At high altitude, fade land/ocean/vegetation to reveal the Earth sphere. Actually at high altitude we look down from 100 km; the local ground (60 km radius) is a small patch below. Fading it out would remove the pad area from view, but the rocket is close so we don't care. The Earth sphere provides the planet. We can fade at alt between 30 km and 60 km. But camera chase is near rocket; at 30 km, the ground is far below and the local patch matters little. Fine.

However the Earth sphere's texture scale: with 128x64 segments, at 100 km altitude the surface near the pad is rendered with large triangles; the visible horizon ~1100 km, so segments ~ 300 km — chunky but smooth-ish due to shading. Could use 256x128 segments (33k vertices) fine.

Also an atmosphere glow shell: sphere radius R+80000? At the Earth's limb, a blue glow. Use a slightly larger sphere with additive ShaderMaterial and Fresnel-like rim based on view. Actually simpler: a second sphere radius R + 60000, BackSide, additive, color blue, opacity based on view angle. But at ground level it would tint the sky. Only render above 30 km. Fine.

Maybe skip atmosphere shell to reduce complexity; the sky already gives atmosphere. But the Earth limb without atmosphere looks flat. Add a subtle one.

Sky at altitude:
- `skyMat.uniforms.rayleigh.value = lerp(2.2, 0.02, f)`; `mieCoefficient` similar; `turbidity` stays 6; `sunPosition` fixed.
- Also `scene.fog.color` lerp from haze to black; fog far lerp from 30000 to 1e7, near from 400 to... Hmm, fog at high altitude should be off. Set fog.near = 500, fog.far = 40000 at ground; at high alt far = 5e6 (effectively none) and color dark. Or set scene.fog = null at high altitude? Changing fog object is fine but materials need recompile? No, toggling fog requires material.needsUpdate. Better keep fog and adjust far/color.
- At altitude > 40 km, fog color dark blue/black. But then the Earth sphere materials (fog false) unaffected.

Haze color: 0xb9c9d6 near horizon. At high altitude, 0x000008.

Camera far plane: 2e7, near 0.5, logarithmicDepthBuffer. Note: LineMaterial may not support logarithmic depth? It has `logdepth` handling? Probably not. Line2 shader may not include logdepth. It could z-fight or render weirdly. Hmm. THREE.Line2 material uses custom shaders and may not support logarithmic depth buffer. That could cause the contrail to render incorrectly. Risk. Maybe skip logarithmic depth and use near=0.5, far=1.2e7. Depth precision 24-bit: near/far ratio 2.4e7; at 100 m, precision = z² * (far-near)/(near*far*2^24) ≈ 1e4 * 1.2e7/(0.5*1.2e7*1.6e7) ≈ 1e4/1.6e7*... let me compute: dz ≈ z²/(near * 2^b) = 10000/(0.5*16.7e6) = 0.0012 m. That's fine! At 10 km: z²=1e8 / (0.5*1.67e7) = 12 m. Hmm at 10 km, 12 m precision, okay for distant terrain. At 100 km: 1.2 km precision, but distant Earth. It might be okay. Actually with far=1.2e7, near=0.5, the precision at 100 m is z² * (1/near)/2^24? Formula: depth precision ≈ z²/(near * 2^24) for far >> near. At z=100: 1e4/(0.5*1.67e7)=0.0012 m. Good. At z=1000: 1e6/8.35e6=0.12 m. Good. At z=100 km: 1e10/8.35e6=1197 m. Acceptable for Earth limb. No z-fighting on rocket. Sky/Earth are huge but separate. So skip logarithmic depth buffer. Use near 0.5, far 1.5e7.

But the Sky mesh at scale 9e6 and Earth sphere at 6.37e6: fine with far 1.5e7.

Shadow camera: only near pad, fine.

Rocket build details.

Let's write helper functions:
- `makeNoiseCanvas(size, baseColor, variation)` for concrete/ground.
- Procedural textures using 2D canvas with random circles. Use `ctx.createImageData` and a value noise function? Simpler: fill base, draw lots of random translucent blobs. That looks decent for ground/concrete.

Ground texture:
```ts
function makeGroundTexture(): THREE.CanvasTexture {
  const s = 1024;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d')!; // strict: getContext may be null, use if
  ...
}
```
Under strict, `getContext('2d')` returns `CanvasRenderingContext2D | null`. Use:
```ts
const ctx = c.getContext('2d');
if (!ctx) throw new Error('2d context unavailable');
```
That's fine.

Vegetation: base #4a5a2e, random darker/lighter blobs, small speckles. Repeat 64x64 over 100 km → each tile 1.5 km? Actually texture repeat 80 over 120 km => tile 1.5 km, too large. We want scrub texture at ~1 m scale near camera but also 100 km plane. Use multiple layers? A single texture with repeat 2000 would tile 60 m, but at distance it becomes aliasing with mipmaps; okay. Set repeat (2000, 2000) and anisotropy 8. But UVs on plane 120km: each tile 60 m. Near the pad, the ground texture features are 60 m, too coarse for close-ups. Add a separate "pad apron" ground mesh with finer texture near the pad (e.g. 300x300 m). Good.

Actually we can use a custom ground shader with fractal noise across scales, avoiding tiling. But a canvas texture is simpler. Use a large texture (2048) with repeat 300 over the local 2000x2000 m area? Hmm.

Let's split:
- Near ground: a circle/plane 4000x4000 m around pad with detailed vegetation texture (repeat 40 → 100 m tile; still coarse). Make texture with varied blobs and speckles at multiple scales. With 2048 px over 100 m, 1 px = 5 cm, good. Repeat 40 over 4000 m = 100 m/tile. At the camera 150 m away, ground around pad up to maybe 500 m visible, so 5 tiles; okay.
- Far ground: 120 km plane with same texture repeat 1200 → 100 m tile, mipmapped, fine.

Use the same texture and material? Different repeat requires different texture clones. Create two textures.

Colors: Florida scrub is green-brown. Base #5b6b3b with darker #3c4a28 and sandy #8a7a55 patches.

Concrete pad: canvas with gray base, speckles, cracks (lines). MeshStandardMaterial roughness 0.9.

Pad geometry:
- Pad box 70 x 1.2 x 70 centered at (0, -0.6, 0)? Top at y=0. Yes: BoxGeometry(70, 1.2, 70), position (0,-0.6,0). But we need a flame trench; the rocket sits over a rectangular hole. Build pad as 4 boxes around a trench: trench along X axis? Falcon 9 flame trench at the pad directs exhaust to the sides. Let's make a trench 16 m wide (z), 80 m long (x), with the rocket at the center above it. Pad as two halves at z = ±? Hmm.

Simpler visual: The pad deck is a box with a dark rectangular trench visible in front (the exhaust opening). Use a raised launch mount (steel) with the rocket on top, and a dark trench slot underneath. Build:
- Pad slab: 80 x 1 x 80 at y top 0? But rocket base at y=0. If the pad top is 0, and there's a trench, the rocket should sit on a launch mount above the trench at y=2. Let's set rocket base y=0, launch mount platform at y=-2 (top at 0), pad deck top at y=1.5 around it. Hmm, that means the rocket base is below the deck top? Let's design:

Ground y=0. Pad is a raised concrete slab from y=0 to y=1.5 (top at 1.5), size 100x100. But then rocket base should be at y=1.5, and altitude measured from there. The physics alt is height above pad; set rocket world y = PAD_Y + alt where PAD_Y = 1.5. But then trail y = alt + PAD_Y. The camera near pad etc. Simpler to set pad top at y=0 and ground at y=-1.5. Then the whole terrain is at -1.5, pad top 0. Rocket base at y=0. The ocean at -2. The trail points use y = alt (pad-relative) which is world y (since pad top 0). Good. Let's use PAD_TOP = 0, ground y = -1.2.

Pad slab: 90x90, top at 0, thickness 1.2, so position y = -0.6. Ground plane at y = -1.2 (the slab sits on it). Fine.

Flame trench: a dark box depression cannot be cut from the slab, but we can make the slab from pieces:
- Build 4 boxes around a central trench opening 14 m wide (along z?) and 40 m long (x). Actually make the trench run along X from -45 to +45, width 14 in z. The rocket sits at center above the trench. Pad pieces: two side slabs at z = ±(7 + 20) with width 40 in z, and two end caps at x = ±(20+12.5) width 25 in x? Let's define:
  - Trench: x ∈ [-45, 45], z ∈ [-7, 7].
  - Slab pieces: front strip z ∈ [7, 45] (width 38), back strip z ∈ [-45, -7] (width 38), each x ∈ [-45,45] (length 90), y thickness 1.2, top 0.
  - End caps: x ∈ [-45,-45?]. Hmm that already covers x ±45. The trench is open at both ends (±45) to let exhaust out. So only two slabs: z from 7 to 45 and -45 to -7. Then the rocket at x=0 sits above the open trench. A launch mount spans the trench at x=0.
  - Trench floor at y = -6, dark; ramp walls? Add vertical walls along z=±7 from y=-6 to 0, and a floor. The trench is 6 m deep. Add a dark "flame deflector" wedge? Fine.
- Launch mount: steel platform at y=0 spanning the trench, roughly 20x20, with a hole under rocket. Build with 4 box beams and a ring. Actually rocket base sits on a launch mount at y=0. Let's create a dark steel table: a box 18 x 1 x 18 with top at -0.5? Hmm, rocket base y=0, so the mount top should be at 0 and the rocket's engines overlap it. It's fine if the mount is just below, with the nozzles visible above. Make a platform 16x0.8x16 at y=-0.4, dark metal, and 4 support legs down to the trench floor. Add hold-down clamps (small boxes) around the base.

- Flame trench exits at x=±45. Smoke spawns from there.

Tower: Falcon 9 launch tower is a lattice tower ~80 m tall next to the rocket. Place at (12, 0, 0) or (-14, 0, 8). The rocket radius 1.85, tower 10x10 at x=14. Height 75. Build with InstancedMesh of box members.

Lightning masts: 3 masts at radius ~70 m around pad, heights 100 m, plus wires. Use lattice helper. Add a small red beacon light on top (sphere with emissive).

Roads: dark gray thin boxes/planes. A road from the pad toward -Z (south) and some buildings. Buildings: low boxes with light gray walls and darker roofs, placed at distances 200-800 m. Add a few.

Vegetation: InstancedMesh of low bushes: IcosahedronGeometry(1,0) scaled random 0.5-2.5, color dark green, 400 instances within 400 m radius but not on pad/roads. Use a single InstancedMesh with per-instance color? MeshStandardMaterial with vertexColors? InstancedMesh supports setColorAt. Could use setColorAt to vary green. Need `mesh.instanceColor!.needsUpdate = true` after. Or just one color. Use varied via setColorAt.

Smoke system implementation details:

Particle class-ish arrays:
```ts
interface SmokeParticle { pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number; size: number; active: boolean; }
```
1600 particles, each with Vector3 allocations (3200 vectors). Fine.

ShaderMaterial with attributes:
```
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aSize', ...);
geometry.setAttribute('aOpacity', ...);
geometry.setAttribute('aColor', ...);
```
Vertex:
```glsl
attribute float aSize;
attribute float aOpacity;
attribute vec3 aColor;
varying float vOpacity;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
  vOpacity = aOpacity;
  vColor = aColor;
}
```
Wait, size in world units: want a particle of world size S to have pixel size S * (screenHeight/2) / (tan(fov/2) * dist). Use uniform `uScale = 0.5 * window.innerHeight / Math.tan(fov/2)`. Then gl_PointSize = aSize * uScale / -mv.z. With aSize in meters (e.g. 8 m), at 100 m distance and 800 px height, that's 8*800/(2*0.466*100) ≈ 68 px. Good.

Fragment:
```glsl
varying float vOpacity; varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.05, d);
  // soft noise-ish edge
  a *= a;
  gl_FragColor = vec4(vColor, a * vOpacity);
}
```
Use `transparent: true, depthWrite: false, depthTest: true, blending: NormalBlending`.

To get soft volumetric look, particles should be large and overlapping with low opacity, white-gray. Color slight brown near the flame? White steam.

Spawn:
- At ignition (t between 0 and ~8 s), emit from trench exits at x=±45, z random ±7, y=0 to 5, velocity outward ±X at 30-80 m/s, some upward.
- Also emit under the rocket at base (0, 0, 0) upward/outward as it lifts.
- Spawn rate: per frame, 60 * dt? With 1600 pool, lifetimes 8-20 s. At 60/s for 20s = 1200. Good.
- Use real dt clamped to 1/30 for particle update, but spawn amount proportional to real dt and gated by sim t (t < 25). During the initial 10 s at 1x, good. After 10 s at 10x, t crosses 25 quickly (1.5 s real). So smoke spawns ~1.5 s of real time after liftoff — less than realistic but okay. Maybe gate by sim t < 60, giving more.
- Update: vel.y += 1.5*dt (buoyancy); drag: vel.multiplyScalar(1 - 0.8*dt); pos += vel*dt; size grows (expand) over life; opacity fades in/out. Keep ground collision: if y < 0.5, y = 0.5 and vel.y *= -0.2? They roll along the ground.
- Use `aSize` growing as `size * (1 + life/maxLife * 2)`.

We need to update the attributes each frame. With 1600 particles, fine.

Also add a few "steam jets" from the trench using the same particles.

Plume:
- group attached to rocket at y=0 (base), pointing down.
- Core mesh: ConeGeometry(radius 3, height 1, 24, 1, true) with apex up? Cone default apex +Y, base at -Y. We want a plume extending downward from y=0: cone with apex at y=0 (nozzle) and base at y=-L. So ConeGeometry(radius, L, 24, 1, true) has apex at +L/2 and base at -L/2. Position at y=-L/2 → apex at 0, base at -L. Good.
- Radius ~2.5, L ~ 20. Scale y with time/altitude.
- Material: ShaderMaterial additive, transparent, depthWrite false. Vertex passes uv. Fragment: intensity = pow(1.0 - uv.y, 1.5) * something. But uv.y for ConeGeometry: v=0 at base? Let's not rely; use a varying computed from local position y: vT = clamp(-position.y / length, 0, 1) where 0 at nozzle, 1 at end. In vertex: `vT = clamp(-position.y / uLength, 0.0, 1.0)`. Since we scale the mesh, local position remains the base geometry, uLength = 1 (geometry height), so vT = 0 at apex (y=0 in geometry? apex at +0.5 local). Hmm, geometry local y from -0.5 (base) to +0.5 (apex). After positioning at y=-L/2, apex is at 0. vT = 0.5 - position.y (0 at apex, 1 at base) works. Then color mix white-yellow → orange → transparent. Add Mach diamonds: `1.0 + 0.35*sin(vT*50.0)` maybe. And flicker via uniform uTime.
- Outer glow cone radius 3.5, use similar material, orange, lower opacity, larger.

- Sprite glow at the nozzle: a Sprite with radial gradient canvas texture, additive blending, scale 20. Attach to rocket. Gives bloom source.

- PointLight at nozzle: `new THREE.PointLight(0xffaa55, 0, 300, 2)` with intensity animated (huge, e.g. 5000 in physical units? PointLight intensity in candela; with distance 300 and decay 2, at 50 m intensity = I/2500. Need I ~ 200000 to light the pad. Let's use intensity 300000 and distance 500, decay 2. We'll test mentally; might be too bright. Let's use 100000. With ACES, okay. Flicker.

Actually three's lights: Directional intensity 3; PointLight with decay 2 intensity in candela. At distance 50, illuminance = I/d² = 100000/2500 = 40 lux-equivalent — very bright. Good.

- The flame lights the rocket and pad. Shadow casting off for point light (expensive). Fine.

Plume scale with altitude: `plumeScale = 1 + alt/40000 * 3` clamped 1..4; length also grows. At ground, plume length ~ 25 m; at 100 km, ~ 100 m. Also the rocket exhaust expands in vacuum. Use `atm = exp(-alt/12000)`.

Rocket plume visible while t < 200 and t > 0.2. During flight after burnout, no plume.

Rocket exhaust at high altitude, camera close: a big plume. Good.

Contrail:
- Trail line from rocket base. Use Line2 with white color, linewidth 2.5, opacity 0.65. `lineMaterial.resolution.set(w,h)` on resize.
- Update every ~4 frames with trail positions. The trail array includes points from reset. If only 1 point, skip.
- We might want to offset the trail points to the rocket's actual world position including PAD_TOP? Our rocket base world y = alt (pad top 0), so trail points y=alt. Good.
- But the trail should continue behind the rocket even after it's high. The line from ground to rocket base. Good.

Could add a second "smoke trail" thicker line with lower opacity. Keep one.

Stars, sky, fog update each frame:
```ts
const alt = sim.alt;
const spaceF = smoothstep(60000, 110000, alt) or use (alt/100000).
skyMat.uniforms.rayleigh.value = THREE.MathUtils.lerp(2.2, 0.02, smoothstep(0, 90000, alt));
skyMat.uniforms.mieCoefficient.value = THREE.MathUtils.lerp(0.005, 0.00005, smoothstep(...));
skyMat.uniforms.turbidity.value = THREE.MathUtils.lerp(6, 1, f);
starMat.opacity = smoothstep(70000, 105000, alt);
fog.color.lerpColors(hazeColor, spaceColor, smoothstep(0, 80000, alt));
fog.far = lerp(30000, 20000000, smoothstep(0, 50000, alt));
fog.near = lerp(300, 10000, ...)? Hmm, if far becomes huge and near stays 300, ground haze at distance becomes dark. At high altitude, we want no fog. Set fog.near = 400 + f*1e6 and far = 30000 + f*2e7. Then fog barely affects anything. Good.
```
Also sky brightness/space black. The Sky shader may not go fully black with rayleigh 0.02 and mie 0.00005; let's also blend in a black background? The sky is drawn as a mesh; if its shader outputs near black, good. To be safe, set sky material's `turbidity` and reduce `rayleigh` to 0.001. Hmm, the sun disk in Sky remains visible (bright), which is fine—sun in space. But the user wants black at 100 km. The Sky shader sun disk may show. Fine.

Actually the Sky addon uses sun angular diameter and produces a sun disk; okay.

Also scene.background: maybe set to black, but Sky covers. Set scene.background = new THREE.Color(0x000000).

Fog affects sky? Sky material has fog: false? The Sky shader doesn't include fog. Good.

Lighting at high altitude: keep sun intensity.

The ocean/land fading: 
```ts
const fade = 1 - smoothstep(20000, 60000, alt); // 1 at ground, 0 high
landMat.opacity = fade; landMat.transparent = true;
```
But transparent ground with depth? Use `material.transparent = true` and `opacity`, `depthWrite = true` maybe. If opacity 0, still writes depth if depthWrite true; set depthWrite = fade > 0.5. Hmm. Simpler: set `visible = alt < 60000` for the local ground group. Sudden disappearance at 60 km; not visible from camera near rocket? At 60 km altitude, the ground patch below would vanish; but we're looking mostly horizontally. Could work. Let's use visibility threshold with opacity fade if cheap. I'll do opacity fade with transparent true and depthWrite true until near 0 then hide. MeshStandardMaterial transparent with opacity fade; many meshes. Might look odd but okay.

Actually the local ground includes the pad, tower, buildings. Fading them out at high altitude is fine. Create a group `groundGroup` with all local terrain; update `groundGroup.visible = alt < 90000`. No fade. Since the rocket is at 90 km, ground patch 90 km below; if it disappears, the Earth sphere shows. Probably a slight pop but not visible due to camera looking horizontally. Hmm.

Better to keep the local ground but make it smaller (30 km radius) and let Earth sphere show beyond. At low altitude, fog at 30 km hides the edge. At high altitude, the local 30 km patch near the pad floats above the Earth sphere (at y=0 vs sphere surface at y≈0 at origin, but the patch edge at 30 km is 70 m above the sphere). At 100 km altitude, you'd see a flat square patch 30 km across below, hovering 70 m — tiny. It's fine.

Let's keep local ground visible always. Earth sphere below. The edge of the ocean disc at 60 km might be visible at high altitude (as a circular patch). Make the ocean disc 200 km radius; at 100 km altitude it covers a good area. Hmm, at 400 km altitude (rocket can reach far? Our rocket burn 200s with 7 MN and 220t dry; delta-v ~ 7e6*200/... rough. Let's estimate: thrust 7 MN, avg mass 385 t, avg accel 18 m/s², over 200 s → ~3600 m/s plus gravity losses, so it reaches maybe 100-150 km altitude, not orbit. Actually gravity turn: vertical velocity component decreases. It could reach ~100 km. Fine, camera up to ~150 km.

Ocean disc radius 100 km; at 100 km altitude the horizon is ~1100 km, so the ocean disc patch is small. The Earth sphere shows beyond. Good. The visible patch edge at 100 km distance below... The disc is flat, edge would show. To avoid, make ocean disc 300 km radius. At high altitude, still flat but larger. Use 250 km radius, 64 segments; fog off at high altitude. Hmm.

Maybe skip the flat ocean disc at high alt by fading. Let's not over-engineer. Given the effort, I'll implement the Earth sphere and a big local ocean/land (radius 120 km) and fade the local ground group at alt > 50 km with opacity? Actually we can set `groundGroup.visible = alt < 80000`. The camera at 80 km sees the patch disappear; but the chase camera is focused on the rocket, the ground below is out of frame or small. Acceptable.

Actually simpler: don't fade; the flat ocean/land disc at 120 km radius will be visible as a patch when at 100 km altitude. From the camera near rocket (85 m away looking horizontally), the ground below is at depression angle ~10°, within the frame bottom. The patch spans 120 km radius; at 100 km altitude, its angular size is large (from directly below out to 50°). You'd see a flat green/blue square-ish patch — bad. So better: use a circular ocean disc (radius 300 km) and land patch near the coast, and rely on the Earth sphere for the far view. The 300 km disc edge at 100 km altitude is at 70° depression; mostly outside the narrow FOV (50°). The camera looks near horizontal (down 10°), so the disc edge at 70° below is outside. Good. The local disc still looks flat but is below.

Let's set ocean disc radius 250 km, land area maybe a rectangle/circle sector around the coast. The Earth sphere visible beyond and above the horizon, which at 100 km is 10° below horizontal — the limb. 

The flat ocean disc at y=-1.5 and the Earth sphere at y=-2: at 100 km altitude, the disc edge at 250 km is 4900 m below the sphere's surface? Wait, sphere surface at horizontal distance d drops d²/(2R) = 250000²/(1.27e7) ≈ 4900 m. So the disc edge is 4.9 km above the sphere. At 100 km altitude, this 4.9 km step at 250 km distance is 1.1° — small. Might be visible as a slight edge, but with haze maybe fine. Good.

Horizon at ground: ocean disc edge at 250 km from a 3 m high camera would be below the horizon anyway (the true horizon at 3 m is 6 km). But fog at 30 km hides everything beyond. Good.

Let's use fog near 200, far 25000 at ground. Ocean haze looks pale.

Vegetation and trees: bushes near pad.

Now the rocket launch mount and tower. Let's write helper `createLattice(height, width, segments)` returning InstancedMesh of box members. Compute members list of [Vector3, Vector3].

```ts
function latticeMembers(legs: THREE.Vector3[][], thickness: number): ...
```

Simpler generic:
```ts
function makeLatticeMesh(members: { a: THREE.Vector3; b: THREE.Vector3; t: number }[], material: THREE.Material): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(1,1,1);
  const mesh = new THREE.InstancedMesh(geo, material, members.length);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0,1,0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  members.forEach((m, i) => {
    dir.subVectors(m.b, m.a);
    const len = dir.length();
    dir.normalize();
    mid.addVectors(m.a, m.b).multiplyScalar(0.5);
    dummy.position.copy(mid);
    dummy.quaternion.setFromUnitVectors(up, dir);
    dummy.scale.set(m.t, len, m.t);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
```
Be careful: `dummy.quaternion.setFromUnitVectors` on Object3D; dummy.rotation gets quaternion. Fine.

Tower members: build a square tower of width w, height h, with 4 legs and rings every seg. Legs from (x,z) corners. Cross diagonals on each face per segment. Number of members: 4 legs + for each level 4 horizontals + 4 diagonals. At 80 m tall, segments of 5 m = 16 levels → 16*(8) + 4 = 132. Fine.

Add a tower top with a hammerhead crane? Maybe a small box at top. Add red beacon.

Lightning masts: 3 masts at angles, height 110, width 3, segments 22, thinner. Add wires: use Line with catenary between mast tops and ground, or just straight lines. Use LineSegments with thin white material, fog true. Optional.

Roads: Create with PlaneGeometry rotated, dark gray, y=-1.15. A main road along z from -60 to -600, width 10. Another road crossing. Buildings: 4-6 boxes near road, low (5-15 m), at z=-300..-800, with windows? Simple boxes with light walls and darker roofs. Add a few.

Vehicle? Not needed.

Rocket markings canvas:
```ts
function makeRocketMarkingTexture(): THREE.CanvasTexture {
  canvas 512x1024 transparent.
  draw flag: blue rect with white stars (draw small white dots) and red/white stripes.
  draw vertical text "SPACEX" in dark gray, font 'bold 70px sans-serif', rotate.
}
```
Place as a plane:
```ts
const markingGeo = new THREE.PlaneGeometry(5, 12);
const markingMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, metalness: 0.0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const marking = new THREE.Mesh(geo, mat);
marking.position.set(0, 25, 1.87); // front
```
Plane faces +Z by default. For the back, clone with rotation.y = Math.PI and position z=-1.87. Actually if rotate π, the plane faces -Z, and its x flips (text mirrored?). Rotating a plane 180° about Y mirrors text horizontally; not ideal but okay. Could use the same texture with a mirror? Not critical.

Better: apply marking textures as a decal on both sides with rotation. For the back side, text will read reversed because we see the front face from outside through the plane? No: a plane rotated π about Y faces -Z; from the -Z side we see its front, and the texture is mirrored left-right relative to the +Z view. Text mirrored. To fix, set `marking.scale.x = -1`? That flips the geometry winding (culling). Or create a separate texture flipped horizontally. Let's just put markings on the front only, and maybe a flag on the other side (flag mirrored is fine). Fine.

Add a vertical dark band (interstage) and a band near the top of the first stage with `CylinderGeometry(1.87, 1.87, 1.5)`.

Now the physics-sim ↔ render sync. In animation loop:
```ts
const delta = Math.min(clock.getDelta(), 1/30); // real dt
if (!sim.paused) {
  const spd = sim.state().speed; // speed getter
  sim.step(delta * spd);
}
updateVisuals(delta, elapsed);
composer.render();
if (!ready) { ready = true; (window as any).__ready = true; }
```
But `speed` depends on sim.t before stepping; at t<10 returns 1, after 10 returns 10. Step with dt*speed. If dt*speed is large (1/30*30=1s), substeps 50. Fine.

Simulation time and render time: `sim.t` is the sim time. Use it for flicker etc.

The rocket visual position: `rocket.position.set(sim.x, sim.alt, 0)` (pad top at 0). Rotation z = -pitch. Base at pad y=0. Good.

But on the pad, the rocket's engine section is at y=0, and the launch mount is at y=-0.4. The nozzles at y=0..2? They'd intersect the mount. Let's put nozzles at y=0.2..2.0? Actually rocket group origin is at the bottom of the nozzles. Nozzles are internal to the engine section: the rocket body starts at y=0 with the engine section 0..4, and nozzles hang from y=0 down? If nozzles hang below y=0, they'd intersect the pad. Let's have the engine section from y=0 to 4 and nozzles from y=0 to 2 (inside), pointing downward but flush. Or rocket base at y=2 (nozzles below)? Simpler: rocket group origin at pad level; nozzles from y=0 to 2.2, body starts at y=0 with engine bay. The launch mount top at y=0, so nozzles sit on it. Visually acceptable (rocket sitting on mount).

Actually for a launch photo, the rocket base is elevated above the pad with a mount. We can set the rocket's group y = alt + 2.5 and adjust trail points +2.5? But physics alt is height above pad. If we offset the whole rocket by 2.5, at alt=0 it sits 2.5 m above the pad on the mount. That's realistic. But then the trail (world points of the rocket) should include the offset? The trail is "world points of the rocket". If trail y = alt, the contrail starts 2.5 m below the rocket base. Minor. Let's just use base at alt (no offset) and have the mount top at 0. Simpler for consistency.

Camera and rocket positions consistent.

Now the "chase camera" should use the rocket's world center, which is (x, alt+35, 0) but when pitched, the center moves: rotate the local center (0,35,0) by pitch around z. `new THREE.Vector3(0, 35, 0).applyAxisAngle(zAxis, -pitch)` plus base. Let's compute `rocketCenter = new THREE.Vector3(0, 33, 0).applyAxisAngle(new THREE.Vector3(0,0,1), -sim.pitch).add(rocketBase)`.

At high pitch (0.5 rad), the rocket tilts 28°, center offset ~ (16, 29, 0).

Camera offset relative to world, not rocket orientation, to avoid motion sickness. Use world offset rotating slowly.

Low camera position: (-90, 3, 120). Looking at rocket center. At liftoff, rocket base at origin, center y=35, distance ~150, looking up 13°. Good. Plume/smoke visible.

Transition: `blend = smoothstep(60, 220, alt)` maybe. At alt 60, rocket center 95 m up, low camera at 150 m distance. As it climbs, low camera tracks up; at blend 1, chase. Good.

Chase offset: choose a fixed world-space offset e.g. (65, 18, 65) (distance ~93). Add slow oscillation:
```
const ang = 0.7 + Math.sin(elapsed*0.07)*0.15;
const off = new THREE.Vector3(Math.cos(ang)*70, 22, Math.sin(ang)*70);
```
Distance sqrt(70²+22²+70²) ≈ 101.5. Slightly >100 but "about". Use 60: distance 89. Good.

At high altitude, increase radius slightly: r = 60 + smoothstep(20000,100000, alt)*30 → up to 90, distance ~104. Hmm keep 60..80.

Camera near 0.5, rocket length 70; at 90 m distance, FOV 50 → vertical view height 2*90*tan25 = 84 m. Rocket fills the view. Good. Maybe use FOV 55.

But during ascent, the rocket plus plume (up to 100 m) needs to fit. Camera target at rocket center; at high altitude plume extends downward, possibly out of frame. Use camera distance 110 at high altitude or target lower. Let's target between rocket center and plume: `center + (0,-10,0)`? Hmm. We want the rocket and plume visible. At ground, plume 25 m and rocket 70 m = 95 m; at 90 m distance with FOV 55, view height ~ 94 m. Tight. Increase camera distance to 130 m? Requirement within about 100 m. Use ~95 m and FOV 60. View height 2*95*tan30 = 110 m. Good.

Camera offset (62, 20, 62) length 90. FOV 60.

Smooth camera: use exponential lerp with dt. But at speed 30, the rocket moves fast; exponential smoothing might lag. Use lerp factor 1-exp(-dt*6) with real dt; at 30x the rocket moves 30*... per frame ~ maybe 200 m. Camera would lag. Better: set camera directly to desired chase position (which is derived from rocket) with smoothing of the offset only. Since desired follows rocket exactly, no lag. For the low→chase transition, smooth blend. Use `camera.position.copy(desiredPos)` once blended, and for blend smoothstep it's smooth. But camera jitter from sim step positions? The rocket position is smooth.

Add a bit of smoothing on the lookAt target: lerp with factor. But if we lag, the rocket drifts in frame. Fine with high factor.

Let's do:
```
const desired = lowPos.clone().lerp(chasePos, blend);
camera.position.lerp(desired, blend > 0.99 ? 1 : 1 - Math.exp(-dt*3));
```
Actually at high blend, just copy desired to avoid lag. Use `camera.position.copy(desired)` always; desired is continuous because lowPos fixed and chasePos continuous, blend continuous. The blend transition is smooth. During low phase, camera fixed. Good. No lag needed. But the low camera stays fixed while rocket climbs; fine; then blend transitions.

Look target: `lookAt` center. If center jumps with rocket step (it's continuous), fine. We can smooth with `camLook.lerp(target, 1-exp(-dt*8))`.

At high altitude, we may want to look slightly above the rocket? No.

Overlay:
```ts
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;left:16px;top:14px;...';
document.body.appendChild(overlay);
const buttonsDiv ...
```
Set `pointer-events: none` for overlay, buttons `pointer-events: auto`.

Mission data: update each frame:
```
T+ MM:SS
ALT xx.x km
VEL xxx m/s
SPEED x10
```
Format time from sim.t.

Buttons: x1, x10, x30; clicking sets `sim.setSpeed(n)`. Also maybe pause button. Add "PAUSE" button with pointer events. Requirement only mentions three buttons. Add pause optional.

Key handler:
```ts
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === '1') sim.chosenSpeed = 1; ...
  if (e.key === 'p' || e.key === ' ') sim.paused = !sim.paused;
});
```

Expose:
```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__rocket = sim;
```
Note: sim should expose `state()`, `step(dt)`, `reset()`, `trail`, `paused`, `speed` getter. The overlay uses sim.state().

Types: `(window as any).__rocket = sim;` fine.

Update loop must call step with `min(delta, 1/30) * speed`, where speed = sim.state().speed. Then `sim.step(...)`.

Ready after first render: set `__ready = true` after composer.render. Use a flag.

Now let's write all the code.

Detailed code sections:

1. Imports & constants.
2. Utility functions: smoothstep, clamp, lerp.
3. Renderer/scene/camera.
4. Lights & sky & stars.
5. Earth sphere.
6. Ground (land, ocean, beach, roads, buildings, bushes).
7. Pad (slab, trench, mount, tower, masts).
8. Rocket model.
9. Plume.
10. Smoke particles.
11. Contrail.
12. Sim class.
13. Overlay UI.
14. Resize & animation loop.

Let's write carefully.

### Utility functions

```ts
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
```

### Canvas textures

```ts
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
```

Ground texture:
```ts
function makeVegetationTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#4b5a30';
    ctx.fillRect(0,0,w,h);
    // large patches
    for (let i=0;i<900;i++){
      const x=Math.random()*w, y=Math.random()*h;
      const r=4+Math.random()*60;
      const g = 60 + Math.random()*70;
      const rcol = 40 + Math.random()*50;
      const b = 20 + Math.random()*30;
      ctx.fillStyle = `rgba(${rcol|0},${g|0},${b|0},${0.08+Math.random()*0.15})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    // speckles
    for (let i=0;i<30000;i++){
      const x=Math.random()*w, y=Math.random()*h;
      const v = Math.random();
      ctx.fillStyle = v < 0.5 ? `rgba(30,45,20,0.35)` : `rgba(140,140,90,0.22)`;
      ctx.fillRect(x,y,1.5,1.5);
    }
  });
}
```
Repeat wrapping: `tex.wrapS = tex.wrapT = THREE.RepeatWrapping;` set outside.

Concrete:
```ts
function makeConcreteTexture(): THREE.CanvasTexture {
  return canvasTexture(1024,1024,(ctx,w,h)=>{
    ctx.fillStyle = '#9a9a96'; fillRect;
    // mottling
    for 3000 blobs gray
    // cracks
    for 40 cracks: random walk lines dark
    // expansion joints lines
  });
}
```

Marking texture:
```ts
function makeMarkingTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.clearRect(0,0,w,h);
    // flag at top
    const fx = 60, fy = 60, fw = 200, fh = 110;
    ctx.save();
    ctx.beginPath(); ctx.rect(fx,fy,fw,fh); ctx.clip();
    for (let i=0;i<13;i++){ ctx.fillStyle = i%2===0 ? '#b22234' : '#ffffff'; ctx.fillRect(fx, fy+i*(fh/13), fw, fh/13+1); }
    ctx.fillStyle = '#3c3b6e'; ctx.fillRect(fx, fy, fw*0.42, fh*0.54);
    ctx.fillStyle = '#fff';
    for (let r=0;r<5;r++) for (let c=0;c<6;c++){ ctx.beginPath(); ctx.arc(fx + 8 + c*13, fy + 8 + r*10, 2.2, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
    // vertical text
    ctx.save();
    ctx.translate(w/2, 620);
    ctx.rotate(-Math.PI/2); // text reads bottom-to-top? 
    ctx.fillStyle = 'rgba(30,30,34,0.95)';
    ctx.font = 'bold 92px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPACEX', 0, 0);
    ctx.restore();
    // small "FALCON 9"
  });
}
```
Note: font "Arial" is a system font, not external. Fine. But "no fonts from the network" — system fonts okay.

Plane 5m wide, 12m tall would stretch texture (512x1024 → 5x12 ratio 0.42 vs 0.5). Fine.

The marking plane at y=25 covers y 19..31. Good.

### Earth shader

Vertex:
```glsl
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Fragment:
```glsl
uniform vec3 uSun;
varying vec3 vNormalW;
varying vec3 vPosW;

float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float n = mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)),f.x),
                    mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)),f.x),f.y),
                mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)),f.x),
                    mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  return n;
}
float fbm(vec3 p){ float a=0.5; float s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.02; a*=0.5;} return s; }

void main(){
  vec3 n = normalize(vPosW - vec3(0.0, -6371000.0, 0.0));
  float land = fbm(n*6.0);
  land = smoothstep(0.48, 0.56, land);
  vec3 ocean = vec3(0.03,0.12,0.25);
  vec3 shallow = vec3(0.06,0.25,0.35);
  vec3 landCol = mix(vec3(0.13,0.22,0.08), vec3(0.35,0.32,0.18), fbm(n*20.0));
  vec3 col = mix(ocean, landCol, land);
  // coast shallow
  col = mix(col, shallow, smoothstep(0.44,0.48,land)*0.5);
  // ice caps
  float ice = smoothstep(0.80, 0.92, abs(n.y));
  col = mix(col, vec3(0.9), ice);
  // lighting
  float d = max(dot(normalize(vNormalW), normalize(uSun)), 0.0);
  col *= 0.15 + 0.95*d;
  // atmospheric blue haze at limb
  vec3 viewDir = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 3.0);
  col += vec3(0.15,0.35,0.7) * fres * 0.6;
  gl_FragColor = vec4(col, 1.0);
}
```
Note: `cameraPosition` is available in ShaderMaterial by default. The sphere's local position vs world normal: use modelMatrix. The local position `position` from SphereGeometry is centered at origin; world position is position + (0,-R,0). `n = normalize(vPosW - center)` works with center (0,-R-2,0). But I hardcoded -6371000; use a uniform uCenter. Let's pass `uCenter`.

Actually computing noise from `n*6` gives continents ~ 1/6 of the sphere ~ 10,000 km, huge. We want continental scale maybe 3.0. Use n*2.5 for continents, detail n*10. Whatever.

The sun direction in world = sunDir. Good.

Since the sphere is lit, fine. Add a second atmosphere sphere:
```ts
const atmoMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: sunDir } },
  vertexShader: ..., // pass normal and world pos
  fragmentShader: `... intensity = pow(0.7 - dot(normalize(vNormalW), viewDir), 4.0); gl_FragColor = vec4(0.3,0.6,1.0, intensity*0.8);`,
  side: THREE.BackSide? 
});
```
For a glow shell around the Earth, use a sphere at R+60000 with BackSide? A front-side sphere with additive and fresnel based on view works: at the limb, fresnel is high; center of the disc, low. Render it with additive blending, depthWrite false, transparent. But the atmosphere sphere is in front of the Earth sphere (radius bigger). If front-side, the front hemisphere is closer than the Earth surface, so it will overlay a glow over the whole Earth disc, more at the limb. Good. Use side: FrontSide, blending Additive, depthWrite false, depthTest true. Scale up a bit.

At low altitude, the atmosphere sphere is below ground, hidden. Fine.

### Sky altitude update

We need to ensure the Sky shader stays bright blue at ground and dark at alt. Sky addon's rayleigh value influences color. At ground, rayleigh 2.0, turbidity 6, mie 0.005. At 100 km, rayleigh 0.02, turbidity 0.5, mie 0.00001. The sun disk remains. Good.

Also the sky's sun position stays fixed. If the camera goes up, the horizon moves? Sky shader uses camera direction, same.

### Fog and stars update each frame

### Rocket group

Let's write:

```ts
function buildRocket(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.32, metalness: 0.12 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.45, metalness: 0.3 });
  const darkGray = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.55, metalness: 0.5 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.35, metalness: 0.95 });
  ...
}
```
Cylinders: `new THREE.CylinderGeometry(rTop, rBottom, height, 32, 1, false)`. The origin of a cylinder is its center. Position y = base + h/2.

Body:
- engine section: Cylinder(1.85, 1.85, 4, 32) at y=2, darkGray.
- first stage: Cylinder(1.85,1.85,38,32) at y=4+19=23, white.
- dark band at y=38..42? Add Cylinder(1.87,1.87,1.6) at y=38.5, black.
- interstage: Cylinder(1.88,1.88,6) at y=45? Let's re-map:

Let's define precise segments:
```
0..4   engine section (dark)
4..42  first stage tank (white), height 38
42..48 interstage (black), height 6
48..58 second stage (white), height 10
58..62 fairing cylinder (white), height 4, radius 2.6
62..70 ogive nose (white), height 8
```
Add a dark band at y=40..42? first stage top has a black band. Add `Cylinder(1.86,1.86,1.2)` at y=41.4 black. Also a small "raceway" cable conduit along the body: a thin box at x=1.86, y=4..42, depth 0.15. Use a BoxGeometry(0.25, 38, 0.2) at x=1.85, y=23. White-ish dark. Nice detail.

Nozzles: 9. `CylinderGeometry(0.32, 0.55, 1.8, 12, 1, true)` metal. Position at y=0.9 (from 0 to 1.8). Place 8 around radius 1.1 plus center. But engine section radius 1.85; 8 at radius 1.05 fit. Their lower ends at y=0. Good.

Fairing ogive: use LatheGeometry:
```ts
const profile: THREE.Vector2[] = [];
for (let i=0;i<=20;i++){
  const u = i/20;
  const y = 62 + u*8;
  const r = 2.6 * Math.sqrt(Math.max(0, 1 - u*u*0.98));
  profile.push(new THREE.Vector2(r, y));
}
```
But LatheGeometry rotates around Y and expects points with x=radius and y=height. The profile starts at r=2.6 at y=62 and ends at 0 at y=70. Good. Need to close the top? At u=1, r=0. Fine. Use segments 32. Position group inside rocket group at origin. Note LatheGeometry points should be in order from bottom to top? It generates around Y; order fine.

Actually to avoid a gap between the fairing cylinder and ogive, the ogive base at y=62, r=2.6. Good.

Markings plane at radius 1.87 front. Add a second on the fairing? The fairing radius 2.6, but markings on the first stage.

Add the US flag and "SPACEX" on the first stage.

Add a thin white "cold gas thruster" bumps? Not needed.

Rocket group castShadow/receiveShadow: traverse and set.

### Plume

Create group at rocket base. Since the rocket group is rotated by pitch, the plume rotates too. Good.

Plume core shader:
```ts
const plumeVert = `
uniform float uTime;
varying float vT;
varying vec3 vCol;
void main(){
  vT = clamp(0.5 - position.y, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const plumeFrag = `
uniform float uTime;
uniform float uIntensity;
varying float vT;
void main(){
  float flick = 0.75 + 0.25*sin(uTime*40.0 + vT*20.0);
  float a = pow(1.0 - vT, 1.6) * uIntensity * flick;
  float diamonds = 0.75 + 0.45*sin(vT*55.0 - uTime*10.0);
  a *= mix(1.0, diamonds, 0.35);
  vec3 hot = vec3(1.0, 0.98, 0.85);
  vec3 mid = vec3(1.0, 0.65, 0.25);
  vec3 col = mix(hot, mid, smoothstep(0.0, 0.5, vT));
  gl_FragColor = vec4(col * (1.5 + a), a);
}
`;
```
With additive blending, alpha matters less; use `gl_FragColor = vec4(col * a * 2.0, a);`.

Geometry: `ConeGeometry(2.4, 1.0, 32, 1, true)` with apex at +0.5. Position y=-0.5 so apex at 0, base at -1. Then scale.y = plumeLength. Radius scale x/z = 1 + alt factor. But scaling y by length also scales the vT mapping? vT uses geometry local position, unaffected by mesh scale. Good. `vT = 0.5 - position.y` where position.y from -0.5..0.5 → vT 1 at base (bottom), 0 at apex (top). Good.

Outer plume: same geometry, larger radius 4, orange, opacity lower, length 1.2x.

Nozzle glow sprite:
```ts
const glowTex = canvasTexture(128,128,(ctx,w,h)=>{ radial gradient white to transparent });
const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffddaa, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
const glow = new THREE.Sprite(glowMat); glow.scale.set(30,30,1); glow.position.y = -3;
```
Sprite in rocket group, additive.

Point light at y=-3.

Plume animation: `plumeRoot.visible = burning && sim.t > 0.15`. Set `plumeCore.scale.set(1+atm*0.5, length, ...)`. Actually `plumeCore.scale.set(radiusScale, length, radiusScale)` where geometry base length 1. length = 18 + (1-atm)*40. Add flicker to length.

At `t=0` ignition, plume starts. Use a ramp `ignition = smoothstep(0, 0.8, t)`.

No plume if paused? Paused just stops sim; plume flicker can continue based on elapsed real time. Fine.

### Smoke particles

Implement class:

```ts
class SmokeSystem {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private positions: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  private colors: Float32Array;
  private particles: Particle[] = [];
  private count: number;
  private next = 0;
  ...
}
```
Particle fields: x,y,z, vx,vy,vz, life, maxLife, size0, growth, active, colorR/G/B? Store color in Float32Array per index and set on spawn.

Shader material uniforms `uScale`.

Update:
```ts
update(dt: number, emit: boolean, emitPos: THREE.Vector3, alt: number): void {
  for each active:
    life += dt;
    if life > maxLife -> active=false, opacity=0, size=0;
    else:
      vy += 1.2*dt; // buoyancy
      vx *= drag; ...
      x += vx*dt...
      if y < 0.3 { y=0.3; vy = Math.abs(vy)*0.15; vx*=0.98; }
      const f = life/maxLife;
      const size = size0 * (1 + growth*f);
      const op = opacity0 * smoothstep(0,0.15,f) * (1-smoothstep(0.55,1,f));
      ...
}
```
Spawn: find inactive slot; if none, overwrite oldest (next index). 
```
spawn(x,y,z, vx,vy,vz, size, life, r,g,b)...
```
Emit from trench exits:
- `emitSmoke(dt, t)` called each frame in visuals. If sim.t < 30 (and not paused? pause should stop emission but particles can still move), spawn rate = 900 per sim second? We use real dt. We want ~80 particles/s during first 6 s. With pool 2000 and lifetimes 6-18 s, 80/s*12 = 960. Fine.
- Positions: side exits at x = ±50, z ∈ [-8,8], y=0..3. Velocity: outward x ±(30..70), z random ±10, vy 5..20.
- Also under the rocket when alt < 100: spawn at (rocketX + rand*10, 1, rand*10), with radial outward velocity and upward.
- At t > 200 (burnout) no emission.

Colors: white-gray (0.85..1.0) with slight orange near the flame? Add a few warm particles at the trench: color (1.0, 0.85, 0.7). Most are white-gray.

For soft cloud look, particles size 8..25 m, opacity 0.08..0.2. Large overlapping.

Use `uScale` uniform updated on resize: `0.5 * renderer.domElement.height / Math.tan(fov*0.5*PI/180)` but with pixel ratio? gl_PointSize is in physical pixels, while renderer.domElement.height is CSS pixels * pixelRatio? The drawing buffer height = window.innerHeight * pixelRatio. Use `renderer.getDrawingBufferSize(tmp).y` maybe. Set uScale = 0.5 * (window.innerHeight * pixelRatio) / tan(fov/2). Actually the composer renders at pixel ratio size; gl_PointSize is in framebuffer pixels. Use drawingBufferSize. We'll compute on resize and initialization.

Fragment shader uses gl_PointCoord. Ensure `precision` fine.

`gl_PointSize` has a max size limit, often 1024 or more. Large near particles may clamp. Fine.

Fog on particles? Add fog manually? Not necessary. They are near camera.

Points geometry: positions attribute usage dynamic. Set `setUsage(THREE.DynamicDrawUsage)`.

One issue: Points with size 0 and alpha 0 still rendered; fine.

### Contrail

Line2 with up to many points. We'll rebuild geometry every N frames:
```ts
const trailPositions: number[] = [];
for (const p of sim.trail) { trailPositions.push(p.x, p.y + 0.5, p.z); }
if (trailPositions.length >= 6) lineGeom.setPositions(trailPositions);
```
LineGeometry.setPositions can take a number[] or Float32Array. TS signature: `setPositions(array: number[] | Float32Array): this`. Fine.
But rebuilding a new LineGeometry each time is expensive; `setPositions` updates the buffer. It may reallocate. Fine.

Also need `line.computeLineDistances()` for dashed? Not using dashes, skip.

Line material resolution set on resize.

Potential issue: Line2's material needs `worldUnits` false and resolution set. Use `linewidth: 2.5` (in pixels). Good.

Trail opacity: fade with altitude? Keep 0.7. The line from ground to rocket at 100 km is huge; near the rocket it's a thin line. Fine.

Maybe add a "contrail cloud" of particles along the trail? Not required.

### Physics class code

```ts
class RocketSim {
  t = 0;
  alt = 0;
  vy = 0;
  vx = 0;
  x = 0;
  acc = 0;
  pitch = 0;
  paused = false;
  trail: { x: number; y: number; z: number }[] = [];
  chosenSpeed: number | null = null;

  get speed(): number {
    if (this.chosenSpeed !== null) return this.chosenSpeed;
    return this.t < 10 ? 1 : 10;
  }

  reset(): void {
    this.t = 0; this.alt = 0; this.vy = 0; this.vx = 0; this.x = 0;
    this.pitch = 0;
    this.paused = false;
    this.chosenSpeed = null;
    this.trail.length = 0;
    this.acc = this.netAcc(0);
  }

  private mass(): number { return this.t < BURN ? M0 - (M0 - MDRY) * (this.t / BURN) : MDRY; }
  ...
}
```

Careful with mass at t slightly > burn: mdry.

Thrust:
```ts
private thrust(): number {
  if (this.t >= BURN) return 0;
  const m = this.mass();
  return Math.min(1.3 * M0 * G0, 3 * m * G0);
}
```

Pitch:
```ts
private pitchAt(t: number): number {
  if (t <= 10) return 0;
  const u = clamp((t - 10) / 140, 0, 1);
  return 0.5 * (1 - Math.cos(Math.PI * 0.5 * u)); // smooth
}
```
Actually `1 - cos(πu/2)` at u=1 = 1, at u=0.5 = 0.293 (of 0.5). Fine.

Gravity:
```ts
const g = G0 * Math.pow(R / (R + alt), 2);
```

Net vertical acc:
```ts
private netAcc(alt: number): number {
  const m = this.mass();
  const T = this.thrust();
  const g = G0 * (R/(R+alt))**2;
  return (T * Math.cos(this.pitch)) / m - g;
}
```

Step:
```ts
step(dt: number): void {
  if (!isFinite(dt) || dt <= 0) {
    // Still push a trail point per call? "one per step() call". For dt<=0, push current.
    this.trail.push({x:this.x, y:this.alt, z:0});
    return;
  }
  const n = Math.max(1, Math.ceil(dt / 0.02));
  const h = dt / n;
  for (let i=0; i<n; i++) {
    // update pitch based on current t? Pitch is a function of t; compute before integration.
    this.pitch = this.pitchAt(this.t);
    const m = this.mass();
    const T = this.thrust();
    const g = G0 * Math.pow(R/(R+this.alt), 2);
    const ay = (T * Math.cos(this.pitch)) / m - g;
    const ax = (T * Math.sin(this.pitch)) / m;
    this.acc = ay;
    this.vy += ay * h;
    this.vx += ax * h;
    this.alt += this.vy * h;
    this.x += this.vx * h;
    if (this.alt < 0) { this.alt = 0; if (this.vy < 0) this.vy = 0; }
    this.t += h;
  }
  this.pitch = this.pitchAt(this.t);
  // acc for state after step
  ...
  this.trail.push({x: this.x, y: this.alt, z: 0});
}
```
"fixed substep of at most 0.02 s" — n = ceil(dt/0.02) gives h <= 0.02. Good.

But updating t after integration means thrust/mass use t at the start of substep. Fine.

Should `acc` be the final net vertical acceleration? Compute at end with current altitude/pitch/mass/t. Set `this.acc = ...`.

State:
```ts
state(): { t:number; alt:number; vel:number; acc:number; pitch:number; speed:number } {
  return {
    t: this.t,
    alt: this.alt,
    vel: this.vy,
    acc: this.acc,
    pitch: this.pitch,
    speed: Math.hypot(this.vx, this.vy),
  };
}
```

On the pad before liftoff: thrust > weight, so it immediately leaves. There's no hold-down. Fine.

But "the rocket cannot go below the pad" — with alt=0 initially and upward acceleration, fine. Could a negative dt/ weird? Fine.

Also horizontal velocity: at high altitude, vx grows; x could reach hundreds of km. World coordinate x. The trail extends horizontally. Fine.

Check numbers: at t=200, mass 220t, thrust min(7.014e6, 3*220000*9.81=6.47e6) = 6.47e6, acc = 29.4*cos(0.5)=25.8 - g ≈ 25.8 - 9.5 = 16.3 m/s². Delta-v roughly. Altitude maybe 80-120 km. Let's estimate quickly:
Thrust/mass ~ 12.7 m/s² at start (1.3g0), minus g = 2.9. With pitch, vertical. At 100 s, mass = 385t, thrust 7.014e6 (since 3mg0 = 11.3e6 > T) => a=18.2, pitch about 0.5*(1-cos(π/2*0.643))=0.5*(1-cos(57.9°))=0.5*(1-0.532)=0.234. Vertical a = 18.2*0.973 - 9.6 = 8.1. Horizontal 4.3.
Average vertical acc maybe 6-8 over 200s → v ~ 1200-1500 m/s; alt ~ 100-150 km. Good. Speed total maybe 2000 m/s.

The trajectory is suborbital (no second stage), fine for the demo.

### Camera target and rocket transform

Rocket base position: `(sim.x, sim.alt, 0)`. If pad top is 0 and ground -1.2, fine.

But sim.x may grow into the hundreds of km; camera follows. Ground plane centered at origin extends 250 km, enough maybe. At high altitude, the rocket may drift 100+ km horizontally. The Earth sphere covers. Fine.

Rocket rotation z = -pitch. The camera low phase looks at the rocket; when x grows, the lookAt changes.

### Sun & shadows

Directional light shadow camera fixed at origin; as the rocket ascends, it leaves the shadow volume. Fine.

### Resize

```ts
function onResize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  const buf = new THREE.Vector2();
  renderer.getDrawingBufferSize(buf);
  smoke.setScale(buf.y, camera.fov);
  trailMaterial.resolution.set(w, h);
}
```
`renderer.getDrawingBufferSize(target: Vector2): Vector2` fine.

`composer.setSize(w,h)` — with pixel ratio set on renderer, composer uses renderer's size? EffectComposer.setSize sets render targets to w*pixelRatio? Actually EffectComposer has `setPixelRatio` and `setSize`. We should call `composer.setPixelRatio(renderer.getPixelRatio())` initially and `composer.setSize(w,h)`. Yes.

### Bloom

```ts
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio,2));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.6, 0.85);
composer.addPass(bloom);
```
Note EffectComposer constructor accepts renderTarget optional. Fine.

With bloom and tone mapping: The RenderPass renders to a render target. Tone mapping applied in renderer? Output pass? In three, tone mapping is applied in the material shaders when rendering to screen? Actually tone mapping is applied in the renderer for each material when outputColorSpace conversion; when rendering to a render target, tone mapping is still applied in the material shader (unless renderer.toneMapping is set and render target is not sRGB?). In three r152+, tone mapping and color space conversion are applied when rendering to screen, but for render targets, they are applied only if `renderTarget.texture.colorSpace`? Hmm. EffectComposer typically adds an OutputPass at the end to apply tone mapping and color space. Modern three requires `OutputPass`. The RenderPass renders with renderer's tone mapping? Let me recall: in WebGLRenderer, the tone mapping is applied in the fragment shader (via `#include <tonemapping_fragment>`) if `toneMapping !== NoToneMapping` and the material is not rendering to a render target? The shader includes tonemapping always, and the renderer sets `toneMapping` uniform... Actually `WebGLProgram` includes tonemapping and colorspace fragment based on renderer settings, and these are applied regardless of the render target. Hmm, but the recommendation is to add OutputPass when using post-processing, which handles tone mapping and color space, because the composer's render targets are linear. Since r152, `EffectComposer` render targets are half-float linear and the renderer might disable tone mapping when rendering to a render target? I believe there's a check: `renderer.toneMapping` is applied only when rendering to the canvas? Let me recall from source: `const toneMapping = _currentRenderTarget === null ? _this.toneMapping : NoToneMapping;` Yes! In WebGLRenderer, `getToneMapping()` uses NoToneMapping when rendering to a render target. So with the composer, the RenderPass renders linear without tone mapping, and the final OutputPass applies tone mapping and color space. So we need to import OutputPass and add it. Let's do:

```ts
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
...
composer.addPass(bloom);
composer.addPass(new OutputPass());
```
Then renderer.toneMapping is used by OutputPass. Good.

Also bloom operates in linear space, good.

### Sky and tone mapping

The Sky addon material is a ShaderMaterial with `toneMapped`? ShaderMaterial has `toneMapped = true` by default? For ShaderMaterial, the `toneMapped` property exists. But with composer, the sky is rendered into the linear render target; the OutputPass applies tone mapping to the whole image. Actually if the sky shader outputs huge values (sun), the bloom sees them. Good.

But does the Sky shader include tone mapping internally? It's a custom shader that doesn't include tonemapping chunks. So its output is linear radiance. OutputPass tone maps. Good.

Materials' color values in MeshStandardMaterial are sRGB converted to linear; renderer handles texture color spaces. Good.

### Star points color space

PointsMaterial color white, size 2, opacity. Fine.

### Earth shader output

Custom ShaderMaterial outputs linear color; Earth colors we specify are linear-ish (values). The OutputPass tone maps. Fine.

### Smoke shader

Custom shader outputs colors; no tone mapping in shader; OutputPass applies. Alpha blending in linear space? Transparent blending happens in the render target linear space; colors should be linear. Our color values chosen are approximate. Fine.

Note: custom ShaderMaterials with `transparent` and `blending` render into the linear target. Good.

### Sun intensity

With tone mapping, DirectionalLight intensity 3 might be okay. Sky is very bright. Maybe use 3.5.

### Building the pad group

Let's write functions to create concrete boxes with material.

```ts
const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.92, metalness: 0.0 });
```
Clone texture with repeat for different sizes? Use one concrete texture repeat (4,4). For each box, UVs are 0..1 per face, so texture repeats 4 times over the box side. Fine.

Pad:
- Ground group at y=0? Let's define all world y coordinates directly.

Ground level y = -1.2. Pad top y = 0.
- Slab front: BoxGeometry(90, 1.2, 38) position (0, -0.6, 26) — z from 7 to 45.
- Slab back: position (0, -0.6, -26).
- Trench floor: BoxGeometry(90, 0.4, 14) at y=-6, z=0.
- Trench side walls: BoxGeometry(90, 6, 1) at z=±7, y=-3.
- Trench end ramps? Add a ramp at each end from floor to top? Not necessary; the trench is open at x=±45.
- Fire deflector wedge: a triangular prism in the trench? Could use a BoxGeometry rotated. Skip or add a dark steel plate.

Launch mount:
- 4 legs: BoxGeometry(1.2, 6, 1.2) at (±8, -3, ±8), dark steel.
- Platform: BoxGeometry(20, 1, 20) at (0, -0.5, 0) (top at 0). Dark steel.
- A circular opening under the rocket? Not needed; the rocket sits on top.
- Hold-down clamps: 4 small boxes at (±2.5, 0.3, ±1) rotated? Add small dark boxes around the base.

Tower at (-14, 0, 6)? Let's place at (14, 0, 0). It should be next to the rocket, not overlapping. Tower width 8, so from x=10 to 18; rocket radius 1.85, gap ~8 m. Good. Height 78.

Tower base at ground -1.2? Build from y=0 to 78. Add a lattice with 4 legs at (14±4, 0±4). Good.

Tower also has a "crew access arm" reaching toward the rocket at y=50 and y=60? Add a horizontal lattice arm from x=12 to x=3 at y=60. Nice.

Lightning masts: at positions around the pad, e.g. (60, 0, 45), (-55, 0, 50), (70, 0, -50), heights 110, width 2.5. Use lattice. Add catenary wires from mast tops toward the tower top (thin lines).
Wire material: LineBasicMaterial({color: 0x222222, transparent: true, opacity: 0.5}). Use BufferGeometry with points. Catenary: sample quadratic sag. Good.

Roads: main road at z from -60 to -1000, x=0, width 14, at ground y=-1.15. Another road at x from -1000 to 1000 at z=-200. Draw dark asphalt. Since the ground is at -1.2, put road at -1.19.

Buildings: a few at (x,z) around (-200, -350) etc. Box walls with light gray material, roofs dark. Add windows via emissive? Not needed.

Bushes: 600 instances in a ring radius 60..800 around pad, avoiding roads? Random.

Also add some trees (taller cones) near buildings. Optional.

### Ocean and land

- Ocean disc radius 250000 at y=-2, color 0x1b4668, roughness 0.25, metalness 0.1. Use MeshStandardMaterial with a procedural normal-ish? No textures. Could use a canvas ocean texture with wave noise. Add a canvas texture for water: blue with lighter streaks. Repeat 2000. Nice.

Actually water reflection: use `roughness: 0.15, metalness: 0.6, color: 0x14406b`. With sun, it will have specular. Good.

- Beach: a sand strip along z from 2200 to 3000, x ±60000, at y=-1.1, color 0xcdb98a. But land covers up to z=2500. Let's define coastline at z=2500, beach from 2400 to 2600. Land from -120000 to 2600 (a big plane). Ocean beyond 2500.

Land plane: use Box or PlaneGeometry with rotation -PI/2. Size 240000 (x) x 124000 (z), centered at z = (2600 - 120000)/2? Let's compute: land z from -120000 to 2600, length 122600, center z = (-120000+2600)/2 = -58700. PlaneGeometry(240000, 122600) rotated -π/2, position (0, -1.2, -58700). Texture repeat (2400, 1226) for 100 m tiles. With mipmaps and anisotropy, okay.

Hmm, at low altitude the land plane's far edge is behind us? We look toward +Z (ocean), so the land behind the camera is less important.

Beach plane: PlaneGeometry(240000, 300) at z=2450, y=-1.15, sand material with texture.

Ocean disc: CircleGeometry(250000, 96) rotated -π/2, position (0,-2,0). But the ocean disc overlaps the land (land above it) fine. The ocean extends to x ±250km and z ±250km, covering everything below the land.

But the ocean disc at y=-2 near the pad is below the land at -1.2, hidden. Fine.

Vegetation texture repeat on land 240000/100 = 2400. Texture anisotropy 8. At grazing angles, mipmapping will blur. Fine.

At high altitude, the land plane (240 km wide) is big. Fine.

Maybe add a few "water" specular highlights. Fine.

### Ground near pad

Add a 600x600 m "apron" plane at y=-1.19 with a finer vegetation texture (repeat 12) to break up tiling near the camera. Also a concrete apron around the pad? The pad slab covers 90x90. Add a gravel area 250x250 at y=-1.18, light gray, around the pad. Good.

### Buildings/roads detail

Not too many.

### The rocket plume and smoke effects relative to the pad

At ignition, spawn smoke. The rocket begins moving immediately. The flame hits the trench and billows out both ends. Spawn at x=±48, y=1, z random. Also spawn under the rocket while alt < 40.

We need a "flame trench" visual: the trench exits could have flame glow. Add point lights at the exits? Maybe not.

### Camera low position

To see the rocket and the ocean behind at the horizon, place the camera at (-100, 2.5, 150) looking at (0, 30, 0). The ocean is behind the rocket (+Z). Yes, camera at +Z=150 looking toward origin, so the ocean behind the origin is visible. Good. The tower is at x=14, to the right.

The sun direction (0.6, 0.35, 0.7) means the sun is in front-right of the camera (behind the rocket), possibly in frame causing glare. Good for a launch photo (backlit). Sky is pale.

Maybe offset camera to (-110, 3, 140), looking at (0, 35, 0).

### Pitch rotation

`rocket.rotation.z = -sim.pitch` — rotating around the base. But the group origin is at the base. Good. The plume child rotates too.

The rocket group position is the base. If rotation.z = -pitch, the nose tips toward +X. Good since horizontal acceleration is +X. 

### Trail points and rocket base

When tilted, the trail point is the base; fine.

### Camera target with tilted rocket

`rocketCenterLocal = (0, 33, 0)` rotated by -pitch. Add base.

### Update visual function

```ts
let elapsed = 0;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 1/30);
  elapsed += delta;
  if (!sim.paused) sim.step(delta * sim.speed);
  updateScene(delta, elapsed);
  composer.render();
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```
Wait, the requirement: "The render loop calls step(min(delta, 1/30) * speed) when not paused." We use clock.getDelta() which is delta since last frame. Good. But after the first frame, `ready` set.

Note: if `sim.paused` is true, no step. Smoke should still animate? "when true, the render loop does not call step()" only. Visuals can continue. Fine.

`updateScene`:
- rocket position/rotation.
- plume visibility and scaling.
- point light intensity flicker.
- smoke emission/update using delta (real) and sim.t.
- camera.
- sky/fog/stars from sim.alt.
- trail.
- overlay text.

The overlay text update every frame is fine but could be throttled. Fine.

### Smoke emission details

Use elapsed real time for randomness, sim.t for gating.

```ts
const ignitionActive = sim.t > 0.2 && sim.t < (BURN + 5);
if (ignitionActive) {
  let rate = 0;
  if (sim.t < 12) rate = 120; else if (sim.alt < 200) rate = 60; else rate = 0;
  smoke.emitCount(delta * rate, ...);
}
```
But if the sim is paused, t doesn't advance; emission continues forever, filling the pool. That's okay, maybe stop emission when paused.

We need to spawn at positions that depend on sim state. Let's implement in `updateScene`:

```ts
if (!sim.paused && sim.t > 0 && sim.t < 200) {
  const rate = sim.t < 15 ? 110 : (sim.alt < 300 ? 60 : 20);
  let n = delta * rate;
  while (n > 0) {
    if (Math.random() < n) emitOne();
    n -= 1;
  }
}
```
Simpler: accumulate a spawn accumulator float, add delta*rate, spawn floor.

`emitOne()`:
- 60% from trench exits, 40% from under rocket if alt < 100.
- Trench exit: side = Math.random()<0.5 ? -1 : 1; x = side*50; y = 0.5 + Math.random()*2; z = (Math.random()*2-1)*7; velocity x = side*(20+Math.random()*50), y=2+Math.random()*18, z=(Math.random()-0.5)*20.
- Under rocket: x = sim.x + (Math.random()-0.5)*10; y = 2; z = (Math.random()-0.5)*10; velocity outward radial 10-30, up 10-30. But at high altitude, no ground; gate alt < 200.
- size 8..20, lifetime 6..16, color white-ish.

At t=0 ignition, the rocket is on the pad; the plume hits the trench and steam billows.

Particles update with real delta (capped 1/30) for nice slow billowing.

### Plume light intensity

```ts
const burning = sim.t < BURN && sim.t > 0.05;
const flicker = 0.75 + 0.25*Math.sin(elapsed*37) + 0.1*Math.sin(elapsed*91);
plumeLight.intensity = burning ? 90000 * flicker * (1 - smoothstep(0, 30, alt)*0.6) : 0;
```
Actually light intensity should drop with altitude (less air scattering), but for pad lighting, only matters near ground. Keep.

The light position: in rocket group at (0, -2, 0). It will be transformed with rocket. Good. Need `plumeLight` added to rocket group.

### Plume scaling

```ts
const atm = Math.exp(-sim.alt / 9000);
const pLen = 18 + (1 - atm) * 70; // up to 88
const pRad = 1.0 + (1 - atm) * 2.5;
plumeCore.scale.set(pRad, pLen * (0.85 + 0.15*flicker), pRad);
```
But geometry length is 1, so scale.y = pLen. The cone base radius 2.4 * pRad. At ground pRad 1 → radius 2.4 m (good). At 100 km pRad 3.5 → 8.4 m radius. Good.
Position of the core: y = -pLen/2? We built the geometry with apex at +0.5 and position y=-0.5, so apex at 0 and base at -1. If we scale y by pLen, the geometry's local y extent is -0.5..0.5 scaled to -0.5pLen..0.5pLen, with position y = -0.5 * pLen gives apex at 0 and base at -pLen. Since the mesh is a child of `plumeRoot`, set `core.position.y = -0.5 * pLen`? But scaling and position: the mesh has geometry centered at 0, position -0.5pLen, so apex at -0.5pLen + 0.5pLen = 0. Yes. Update each frame: `core.position.y = -0.5 * pLen;`.

Alternatively create the cone geometry translated so apex at 0 in geometry, then scale works with position 0. Let's do that: `const geo = new THREE.ConeGeometry(2.4, 1, 32, 1, true); geo.translate(0, -0.5, 0);` Now apex at y=0, base at -1. Scaling y by pLen keeps apex at 0. Then vT = clamp(-position.y, 0, 1) (local geometry). Great. Do that for both cones. Then `mesh.scale.set(pRad, pLen, pRad)` and position 0.

But `vT = clamp(-position.y, 0.0, 1.0)` works since geometry y from -1 to 0. Good.

Sprite glow at y=-2, scale maybe 25.

### Mach diamonds

We have the shader `diamonds` modulation. Good.

### Stars positions

Use random on a sphere with radius 4e6 around origin. Camera up to y=150 km, inside. Points are at 4e6, within far 1.5e7. With `depthTest: false`, they always draw behind if rendered first. To ensure they render before other objects, set `renderOrder = -10`. Sky renderOrder = -20. Earth renderOrder default 0. If stars are drawn first and other objects after without depth test issues, stars appear behind. But the Earth sphere (6.4e6 radius) is bigger than the star sphere (4e6) and would occlude stars if depthTest is on for Earth. Stars depthTest false means they draw regardless of Earth's depth, but since they are drawn first and Earth afterwards, Earth covers them where it is drawn. Good, stars visible above Earth's limb. Nice.

However the Earth is drawn after stars and is opaque; it covers the lower part. Good.

Sky drawn first (renderOrder -20) also covers full screen with sky color. Then stars (renderOrder -10) drawn over the sky. Then Earth and scene. Great. But with `depthTest: false` for stars, they'd also draw over the sky (desired) and over nothing else (since drawn before). Fine.

Stars should be visible only at high altitude; opacity 0 at ground. Good.

### Fog and sky interplay

Fog color at ground pale blue. Distant land/ocean fade to fog. At high altitude fog color → black, so distant geometry turns black? Actually if fog color is black and far is huge, the ground won't be fogged because far is huge. Good.

We should set fog color to a dark blue at high altitude and far huge so no effect.

### Sky addon updates and camera far

Set sky scale 9e6, but with camera far 1.5e7 okay.

But the Sun in Sky at altitude: reducing rayleigh makes the whole sky dark. The horizon may still glow. Good.

### The "altitude drives sky" check

Tests might check window.__rocket.state().alt and maybe the sky. Hard to test visually. Fine.

### Potential TS issues

- `THREE.MathUtils.lerp` returns number, fine.
- `material.uniforms['...']` typed as IUniform<any>? fine.
- `new THREE.ShaderMaterial({...})` uniforms object: values typed. Accessing `.uniforms.uTime.value` is `any`, allowed.
- `renderer.setAnimationLoop` callback signature: use `() => {}` (no params) fine.
- `clock.getDelta()`.
- `THREE.Points` generic: `new THREE.Points(geometry, material)` type `Points<BufferGeometry, ShaderMaterial>`. Fine.
- InstancedMesh setColorAt requires instanceColor; after calls set `mesh.instanceColor.needsUpdate = true`, but `instanceColor` type is `InstancedBufferAttribute | null`. Use `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;`.
- `THREE.Line` vs Line2: Line2 import.
- `LineMaterial` property `resolution` is `Vector2`; `.set(w,h)` fine.
- For `Line2`, `line.computeLineDistances()` exists? Line2 extends LineSegments2, which has computeLineDistances. Fine. Not needed.
- `geometry.setPositions` with number[] fine.
- `UnrealBloomPass` constructor `new UnrealBloomPass(new THREE.Vector2(w,h), strength, radius, threshold)`.
- `OutputPass` import.

Potential three version: The environment likely uses three latest (r160+). `Sky` addon exists. `OutputPass` exists. `Line2` etc. exists.

Potential issue: `THREE.Sky` type not exported generically; we import Sky. Its `material` may be typed as `Material`. Cast.

Potential issue: `scene.fog` type `Fog | FogExp2 | null`. We'll hold a `const fog = new THREE.Fog(...)` and assign; update `fog.color`, `fog.near/far` (Fog class has near/far). Good.

Potential issue: `MeshStandardMaterial` property `envMapIntensity`. Fine.

Potential issue: `renderer.outputColorSpace = THREE.SRGBColorSpace;` with OutputPass, the final output is encoded by OutputPass. If renderer.outputColorSpace is SRGB, that's fine since the OutputPass writes to the canvas? Actually OutputPass does the color space conversion itself; renderer.outputColorSpace also applies for materials rendered directly to canvas, but composer's final pass writes to canvas through the renderer, and the ShaderMaterial of OutputPass handles conversion. Setting outputColorSpace is still standard. Fine.

### More realistic rocket detailing

Add a slight taper on the interstage? Fine.

Add a "grid fin" near the top? Small boxes at y=44, x=±1.9. Nice detail.

Add raceway: a thin box down the side.

Add a "SpaceX" text plane. Good.

### Shadows on the rocket

Rocket meshes castShadow and receiveShadow. Directional shadow map 2048, camera bounds 200. At ground, rocket casts a shadow on the pad. Good.

### Ambient

HemisphereLight sky 0xbfd4ea, ground 0x556644, intensity 0.6. With physical lights, maybe 0.8.

Add ambient? Hemisphere enough.

### Let's write the code now, in order.

We must be careful with the order of definitions: `sim` used in updateScene; define at the end or use function declarations (hoisted). Function declarations hoist. Consts not. We'll structure: define everything top-level in order; the animation loop starts after all definitions.

Class definitions can be anywhere.

Let's draft the full file.

```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// ---------- Physics constants ----------
const G0 = 9.81;
const EARTH_R = 6371000;
const M0 = 550000;
const MDRY = 220000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * M0 * G0;

const clamp = ...
```

Then renderer etc.

Let me write the physics class first maybe, then scene.

```ts
class RocketSim {
  t = 0;
  alt = 0;
  vy = 0;
  vx = 0;
  x = 0;
  acc = 0;
  pitch = 0;
  paused = false;
  trail: { x: number; y: number; z: number }[] = [];
  chosenSpeed: number | null = null;

  get speed(): number {
    if (this.chosenSpeed !== null) return this.chosenSpeed;
    return this.t < 10 ? 1 : 10;
  }

  reset(): void { ... }

  private pitchAt(t: number): number { ... }
  private massAt(t: number): number { ... }
  private thrustAt(t: number): number { ... }
  private accAt(t: number, alt: number, pitch: number): number { ... }

  step(dt: number): void { ... }
  state(): {...} { ... }
}
```

Note: `chosenSpeed` should maybe be private but UI needs set. Provide `setSpeed(s: number): void { this.chosenSpeed = s; }` and `clearSpeed()`. Use methods in UI.

`state()` returns a fresh object each call.

In step, if dt is NaN/negative, treat as 0 and push trail.

One subtlety: "trail: array of {x, y, z} world points of the rocket, one per step() call". If `step` is called with dt=0, should we still push? Yes, one per call. We'll push always at the end. Also for dt<=0 push.

Now the render code.

Let me write helper `makeSpriteTexture` for radial gradient:
```ts
function makeRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
  });
}
```
For smoke particles we don't use a texture (procedural in shader). For the plume glow sprite, use a radial texture.

For the smoke shader, alpha smoothstep.

Now let's begin writing the scene setup.

#### Renderer

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
document.body.appendChild(renderer.domElement);
```

#### Scene & camera

```ts
const scene = new THREE.Scene();
const groundFogColor = new THREE.Color(0xb7c8d6);
const spaceFogColor = new THREE.Color(0x000006);
const fog = new THREE.Fog(groundFogColor.clone(), 300, 28000);
scene.fog = fog;
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.5, 1.5e7);
camera.position.set(-110, 3, 145);
```

#### Sun, sky

```ts
const sunDir = new THREE.Vector3(0.55, 0.38, 0.72).normalize();
const sky = new Sky();
sky.scale.setScalar(9.0e6);
sky.renderOrder = -20;
scene.add(sky);
const skyMat = sky.material as THREE.ShaderMaterial;
const skyUniforms = skyMat.uniforms;
skyUniforms['turbidity'].value = 5.5;
...
```
Note: `sky.material` might be an array? Cast via `as unknown as THREE.ShaderMaterial` to be safe: `const skyMat = sky.material as THREE.ShaderMaterial;` If TS complains about conversion from Material|Material[] to ShaderMaterial, direct cast may error "Conversion of type ... may be a mistake". Use `as unknown as THREE.ShaderMaterial`. Safer.

Similarly for uniforms.

Directional light:
```ts
const sun = new THREE.DirectionalLight(0xfff1dd, 3.2);
sun.position.copy(sunDir).multiplyScalar(1200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const shadowCam = sun.shadow.camera;
shadowCam.left = -180; right=180; top=260; bottom=-120; near=200; far=3000;
```
Wait, the light position at sunDir*1200 is 1200 away; shadow camera near 200, far 3000, with target at origin, so covers. Ortho bounds 180 wide maybe not enough to cover the rocket at 70 m and pad 90 m; use 250. shadowCam.top=300, bottom=-200. Good. `sun.shadow.bias = -0.0008`. `sun.shadow.normalBias = 0.05`.

Note: DirectionalLight shadow camera bounds are in light space; fine.

HemisphereLight.

#### Earth sphere

Let's write the shader carefully.

```ts
const earthCenter = new THREE.Vector3(0, -EARTH_R - 2, 0);
const earthGeo = new THREE.SphereGeometry(EARTH_R, 192, 96);
const earthMat = new THREE.ShaderMaterial({
  uniforms: {
    uSun: { value: sunDir.clone() },
    uCenter: { value: earthCenter.clone() },
  },
  vertexShader: `
    varying vec3 vPosW;
    varying vec3 vNormalW;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vPosW = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `...`,
  side: THREE.FrontSide,
});
const earth = new THREE.Mesh(earthGeo, earthMat);
earth.position.copy(earthCenter);
earth.frustumCulled = false;
earth.renderOrder = -5; // after stars? stars -10, earth -5
scene.add(earth);
```
Hmm, earth renderOrder -5, stars -10, sky -20. Then Earth drawn after stars, covering them. Good. But Earth drawn before other opaque objects (renderOrder 0). Depth test is on and Earth is far, so other objects draw over it. Good.

The atmosphere shell:
```ts
const atmoGeo = new THREE.SphereGeometry(EARTH_R + 55000, 128, 64);
const atmoMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: sunDir.clone() } },
  vertexShader: same,
  fragmentShader: `
    varying vec3 vPosW; varying vec3 vNormalW;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosW);
      float rim = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 4.0);
      float sun = max(dot(normalize(vNormalW), normalize(vec3(0.55,0.38,0.72))), 0.0);
      vec3 col = vec3(0.25,0.55,1.0) * rim * (0.4 + 0.6*sun);
      gl_FragColor = vec4(col, rim * 0.9);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.FrontSide,
});
```
This overlays glow on the Earth disc. At the limb (viewDir tangent), rim high. Good. renderOrder -4.

But the atmosphere sphere is in front of Earth, and with depthTest true, it's closer, so it draws over. Fine.

At ground level, the atmosphere sphere is below the ground plane (top at y=55000 - 2? No! The atmosphere sphere radius R+55km centered at -R-2, so its top is at y ≈ 55,000 m = 55 km, above the ground! That's a problem: at ground level, the camera is inside the atmosphere sphere? Radius R+55km, center -R-2; camera at y=3, distance from center = R+5, which is < R+55km, so camera is inside. With FrontSide, from inside the sphere you see nothing (backfaces culled). So it won't render at ground. At altitude 100 km, camera distance from center = R+100km > R+55km, outside, so visible. Great. The Earth sphere radius R: at ground, camera is outside (distance R+5 > R), so the Earth surface is visible below — but the ground plane hides it. Good. The atmosphere shell also surrounds the rocket up to 55 km; from inside invisible. Fine.

But at altitude 60 km, the atmosphere shell is visible as a blue globe around the Earth. Nice.

#### Stars

```ts
const starCount = 4000;
const starPositions = new Float32Array(starCount * 3);
for (let i=0;i<starCount;i++){
  const u = Math.random()*2-1;
  const th = Math.random()*Math.PI*2;
  const r = 4.5e6;
  const s = Math.sqrt(1-u*u);
  starPositions[i*3] = Math.cos(th)*s*r;
  starPositions[i*3+1] = u*r;
  starPositions[i*3+2] = Math.sin(th)*s*r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
const stars = new THREE.Points(starGeo, starMat);
stars.frustumCulled = false;
stars.renderOrder = -10;
scene.add(stars);
```
Wait stars radius 4.5e6, but Earth radius 6.37e6: the star sphere is inside the Earth sphere! With depthTest false and drawn first, Earth draws over them (Earth covers the entire lower hemisphere). The stars above the Earth's limb are in directions where the Earth doesn't cover. But the star sphere geometry at radius 4.5e6 is inside Earth; the Earth sphere isn't drawn there because it's below/behind. Actually the Earth sphere occupies directions below the horizon. In directions above the horizon (sky), the Earth sphere doesn't cover, so stars show. Good. But the star sphere radius 4.5e6 centered at origin means stars at y=+4.5e6; at altitude 100 km, the camera is at y=100 km, and the star sphere surrounds. Fine. However some stars at directions below horizon would be behind the Earth sphere; Earth drawn after covers them.

Maybe make star radius 1e7 (outside Earth) but within far 1.5e7. Then the stars are behind the Earth too. DepthTest false, renderOrder -10 before Earth, Earth covers. Fine. Use 8e6. But the sky sphere at 9e6 is farther; stars at 8e6 inside sky. Good.

#### Ground

Create textures, materials.

Vegetation texture:
```ts
const vegTex = makeVegetationTexture();
vegTex.wrapS = vegTex.wrapT = THREE.RepeatWrapping;
vegTex.repeat.set(2400, 1226);
vegTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
```
`renderer.capabilities.getMaxAnisotropy()` returns number. Fine.

Land mesh:
```ts
const landMat = new THREE.MeshStandardMaterial({ map: vegTex, color: 0xffffff, roughness: 1.0, metalness: 0.0 });
const landGeo = new THREE.PlaneGeometry(240000, 122600, 1, 1);
const land = new THREE.Mesh(landGeo, landMat);
land.rotation.x = -Math.PI/2;
land.position.set(0, -1.2, -58700);
land.receiveShadow = true;
scene.add(land);
```
Note: PlaneGeometry's local XY; rotating -π/2 maps +Y to -Z? Let's verify: rotation.x = -π/2 rotates +Y to -Z? Rotation about X by -90°: y→? R_x(-90): y' = y cos(-90) - z sin(-90) = 0*y + z? Wait, vector (0,1,0) rotated by -90 about X: y' = cos(-90)*1 = 0; z' = sin(-90)*1 = -1. So +Y → -Z. The plane's top edge (v=1, y=+h/2) maps to z=-h/2. The texture orientation: fine, but the plane will extend z from -h/2 to +h/2 with sign flipped. Our position center -58700, so z from -58700-61300 to -58700+61300 = -120000 to 2600. Good regardless of orientation.

Ocean disc:
```ts
const oceanTex = makeOceanTexture(); repeat...
const oceanMat = ...
const ocean = new THREE.Mesh(new THREE.CircleGeometry(250000, 96), oceanMat);
ocean.rotation.x = -Math.PI/2;
ocean.position.y = -2;
ocean.receiveShadow = true;
```
CircleGeometry is in XY plane, rotated to XZ. Good. Center at origin.

Beach: PlaneGeometry(240000, 500) at z=2450, y=-1.15.

Detailed near ground:
```ts
const nearTex = vegTex.clone(); nearTex.needsUpdate = true; nearTex.repeat.set(60,60);
const nearMat = new THREE.MeshStandardMaterial({ map: nearTex, roughness: 1 });
const near = new THREE.Mesh(new THREE.PlaneGeometry(4000,4000), nearMat);
near.rotation.x = -Math.PI/2; near.position.y = -1.18;
```
But near plane overlaps land; z-fighting at y=-1.18 vs -1.2: 2 cm difference at 100 m could z-fight? Near plane at -1.18, land at -1.2; at distance 1000 m, depth precision ~0.12 m, so 2 cm causes z-fighting. Raise near plane to -1.0? Then it's above the land by 0.2 m, okay. But the pad is at y=0 and ground at -1.2; near plane at -1.15. At 1 km, depth precision 0.12 m so 5 cm difference still z-fights. Use 0.5 m difference: near plane at -0.7, but then it floats 0.5 m above the land, invisible from above. Fine. Or use polygonOffset. Simpler: skip the near plane; the main land texture with repeat 2400 gives tiles 100 m; near the pad, 100 m tiles are visible. Maybe increase texture repeat to 12000 (20 m tiles) — at a distance, mipmap handles. Near the camera (150 m), 20 m tiles might look okay with detailed texture. Let's use repeat (12000, 6130) → 20 m per tile. With a 1024 texture, that's 2 cm per pixel. Good. At distance, mipmaps blur to average green. Fine. Use 6000 maybe (40 m). Let's use 8000.

Actually anisotropy 16 helps.

I'll skip the near plane to avoid z-fighting, but add a gravel/concrete apron around the pad:
```ts
const apron = new THREE.Mesh(new THREE.CircleGeometry(300, 64), gravelMat);
apron.rotation.x = -Math.PI/2; apron.position.y = -1.1;
```
At 300 m radius, z-fighting with land (-1.2) at 300 m: precision at 300m ≈ 0.01 m, difference 0.1 m, fine. Good. Gravel texture: concrete texture repeat.

Add roads at y=-1.09.

#### Pad

Concrete texture repeat (4,4) etc.

Let's write:
```ts
const concreteTex = makeConcreteTexture();
concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
concreteTex.repeat.set(6,6);
const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9, metalness: 0.02, color: 0xffffff });
```
For each slab, the UV repeat applies 6 times per face regardless of size. Fine; maybe clone with different repeats.

Pad group at y offsets. Let's use a group `padGroup`.

- slabA: BoxGeometry(90, 1.2, 38), pos (0,-0.6, 26)
- slabB: pos (0,-0.6,-26)
- Trench floor: BoxGeometry(96, 0.4, 14) pos (0,-5.8,0)
- walls: BoxGeometry(96,5.8,1) at z=±7? The gap is z ∈ [-7,7]; walls at z=±7.5, y=-2.9. Actually the slab edges are at z=±7. Add wall boxes inside the trench at z=±7, with thickness 0.6, height 5.8 (from -5.8 to 0). Position y=-2.9.
- trench interior dark material.
- Launch mount: platform box 22x1x22 at (0,-0.5,0) (top at 0), steel. But this covers the trench opening at the center; the plume would hit it? The rocket sits on the platform; exhaust goes down through a hole. We don't have a hole. Could make the platform a ring of 4 beams instead of a solid box: two beams along x at z=±6, two along z at x=±6. Then the exhaust passes through the center into the trench. Good.
  - beams: BoxGeometry(22,1.2,2) at (0,-0.6, ±6); BoxGeometry(2,1.2,10) at (±6,-0.6,0)? Let's just make a cross frame.
  - legs: 4 boxes at (±10, -3, ±10) size 1.2x6x1.2.
- The rocket base then sits on... nothing at the center. That's okay; it looks like it's held by clamps.
- Hold-down clamps: 4 boxes at (±2.2, 0, ±2.2)? small.

Tower: place at (16, 0, 0), width 9, height 82.

Lightning masts: positions (70, 0, 55), (-62, 0, 62), (78, 0, -55) heights 115, 110, 120, width 3.

Wires: connect mast tops to each other and to the tower top. Use catenary points. Could add, but three long lines. Let's add simple.

#### Roads and buildings

Roads:
```ts
const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.95 });
const road1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 900), asphaltMat);
road1.rotation.x = -Math.PI/2; road1.position.set(0, -1.08, -520);
```
Road from z=-70 to -970. Good, behind the pad (camera is at +z, so the road is behind the pad; not visible). Put a road crossing in front? A road at z=200 from x -2000..2000 would be between camera and pad, visible in the foreground. Camera at z=145, so road at z=200 is behind the camera. Let's put road at z=-200 (behind pad) and a road at x=120 running along z? The camera sees it. Fine.

Maybe add roads around the pad at x=±150 and z=-150.

Buildings: at (-250, 0, -300), etc. Visible from camera? Camera at (-110,3,145) looking toward +? It looks at origin, so buildings at z=-300 are behind the pad, visible. Good.

Bushes: scatter around, avoiding a 120 m radius from pad and roads. Use InstancedMesh.

#### Rocket model function

Let's write it.

For the flag/markings, add the plane. Since the rocket body is a cylinder, the marking plane at z=1.86 extends 5 m wide across the curved surface, and its edges will float outside the cylinder (chord vs arc). At width 5 m, the cylinder radius 1.85, half-angle = asin(2.5/1.85)? Wait, 2.5 > 1.85 — the plane is wider than the cylinder diameter, so it floats outside at the edges. Use width 3.0 (half 1.5), half-angle asin(1.5/1.85)=54°, edges are outside by r(1/cos? no). A flat plane tangent at z=1.86 will be outside the cylinder except at the center, by up to r*(1/cosθ -1)? Actually at x=1.5, the cylinder surface is at z=sqrt(1.85²-1.5²)=1.08; the plane is at z=1.86, so it floats 0.78 m outside. That's noticeable. Use width 1.6 (half 0.8): cylinder z at x=0.8 is 1.67, plane at 1.86 → 0.19 m gap. Still. Use curved geometry? Simpler: create a thin cylinder segment (thetaLength ~ 0.8 rad) with the texture mapped, radius 1.87. Use CylinderGeometry(1.87, 1.87, 10, 16, 1, true, -0.4, 0.8) — an open segment. The UVs will map the texture across the segment. Then the text will wrap around slightly, good! But the marking texture has a specific aspect; the cylinder segment's UV u goes 0..1 across 0.8 rad. Fine.

Use `CylinderGeometry(1.875, 1.875, 12, 24, 1, true, -0.45, 0.9)` (thetaStart, thetaLength). In three, thetaStart=0 is at +Z? For CylinderGeometry, theta start 0 is at +X? Let me recall: CylinderGeometry vertices: x = radius * sin(theta), z = radius * cos(theta) where theta = thetaStart + u*thetaLength. At theta=0 → x=0, z=r (front +Z). Good. So thetaStart=-0.45, length 0.9 centers at theta=0 → +Z. Great.

Material: MeshStandardMaterial with map=markingTex, transparent true, side=DoubleSide? The segment is open, visible from outside. Use FrontSide. It should render over the body; set polygonOffset maybe. At radius 1.875 vs body 1.85, a 2.5 cm gap avoids z-fighting. Good.

The texture aspect: 512x1024 (0.5) over 0.9 rad * 1.875 = 1.69 m wide and 12 m tall → aspect 0.14, text will be stretched. Hmm. Our canvas has text drawn vertically (rotated), so the text is vertical along the 1024 height. In the UV mapping, u is around the circumference (1.69 m) and v along height (12 m). The texture's width 512 maps to 1.69 m, height 1024 to 12 m. The rotated text occupies the height dimension; its height in texture (the original text length) becomes vertical. Good. But the aspect: a 92px font over 1024 height becomes 12 m * 92/1024 ≈ 1.1 m tall characters, and the text length ~ 400px becomes 4.7 m vertical. Fine.

The flag drawn at top of canvas maps to top of the 12 m segment. Good, at y≈31 m.

Place the marking mesh at y=25 (center), so from 19 to 31. Good. The interstage band starts at 42, not conflicting. The flag at the top of the marking, around y=30. Good.

Maybe add "SPACEX" text going down the rocket. Fine.

#### Plume and rocket group

`rocketVisual` group added to scene. `rocketVisual.position` updated.

#### Smoke system code

Let's write:

```ts
interface SmokeParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number; life: number;
  size0: number; growth: number; alpha0: number;
  r: number; g: number; b: number;
  active: boolean;
}

class SmokeSystem {
  readonly points: THREE.Points;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.ShaderMaterial;
  private readonly parts: SmokeParticle[] = [];
  private readonly posAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private cursor = 0;
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
    for (let i=0;i<max;i++) this.parts.push({...});
    const positions = new Float32Array(max*3);
    ...
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    ...
    this.mat = new THREE.ShaderMaterial({...});
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  setViewportHeight(h: number, fovDeg: number): void {
    this.mat.uniforms.uScale.value = 0.5 * h / Math.tan(fovDeg * Math.PI / 360);
  }

  spawn(...): void { ... }

  update(dt: number): void { ... }
}
```

For rendering transparency order, renderOrder 5 so smoke draws after opaque objects. Good. depthWrite false, depthTest true (so rocket occludes smoke when in front? Smoke near camera in front of rocket should occlude rocket via blending order; since smoke drawn after rocket, it blends over. Fine.)

Spawn:
```ts
spawn(x,y,z,vx,vy,vz,size,life,alpha,r,g,b): void {
  const p = this.parts[this.cursor];
  this.cursor = (this.cursor + 1) % this.max;
  p.x=x; ... p.age=0; p.life=life; p.size0=size; p.growth=1.5+Math.random(); p.alpha0=alpha; p.r=r;...
  p.active=true;
}
```
Find inactive instead? Cursor overwrites oldest; fine.

Update:
```ts
for (let i=0;i<this.max;i++){
  const p = this.parts[i];
  const idx = i*3;
  if (!p.active) { sizes[i]=0; alphas[i]=0; continue; }
  p.age += dt;
  if (p.age >= p.life) { p.active=false; ... continue; }
  p.vy += 1.4 * dt;
  const drag = Math.max(0, 1 - 1.1*dt);
  p.vx *= drag; p.vz *= drag; p.vy *= Math.max(0, 1 - 0.4*dt);
  p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt;
  if (p.y < 0.7) { p.y = 0.7; if (p.vy < 0) p.vy *= -0.15; }
  const f = p.age / p.life;
  const size = p.size0 * (1 + p.growth * f);
  const alpha = p.alpha0 * smoothstep(0, 0.08, f) * (1 - smoothstep(0.5, 1, f));
  positions[idx]=p.x; ...
  sizes[i]=size; alphas[i]=alpha;
  colors...
}
attrs.needsUpdate = true;
```

Color values: store as r,g,b in particle and write each frame. Fine.

Shader:
```glsl
uniform float uScale;
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, aSize * uScale / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
  vAlpha = aAlpha;
  vColor = aColor;
}
```
Fragment:
```glsl
varying float vAlpha; varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.02, d);
  a *= a * (3.0 - 2.0 * a); // soften
  gl_FragColor = vec4(vColor, a * vAlpha);
}
```
Use `blending: THREE.NormalBlending`, `transparent: true`, `depthWrite: false`.

The particle color should be white-gray: 0.85-1.0 with slight blue.

#### Smoke spawning function

In the update loop:

```ts
let smokeAcc = 0;
function emitSmoke(dt: number): void {
  if (sim.paused) return;
  const t = sim.t;
  if (t <= 0.1 || t > 35) return; // emit only early
  const rate = t < 12 ? 150 : 45;
  smokeAcc += dt * rate;
  while (smokeAcc >= 1) {
    smokeAcc -= 1;
    // trench
    spawn...
    // under rocket
    if (Math.random() < 0.35 && sim.alt < 120) spawn...
  }
}
```
But if t > 12 and alt is already high, emitting from the ground is okay—steam clouds from the pad linger. The requirement: "large billowing white steam and smoke clouds that roll sideways out of the flame trench along the ground and then rise." So emission mostly at liftoff. Let's emit until t < 20 at 60/s.

Use real dt; at 10x speed t jumps 0.33 per frame, so t crosses 20 quickly. During the first 10 s real-time at speed 1, 10*150 = 1500 particles. Good. At speed 10 after t=10, the remaining 10 s of sim time pass in 1 s real → 60 particles. So mostly the first 1500. Good.

Wait, t < 12 at speed 1 gives 12 s of emission, then speed 10. So 1500-1800 particles. Nice.

Pool 2500.

Particle lifetime 5-15 s real; by the time the camera chases the rocket, the smoke is left behind. Fine.

We also need the clouds to "roll sideways out of the flame trench along the ground and then rise." Spawn with strong horizontal velocity at ground, y=1; ground collision keeps them low initially, then buoyancy makes them rise. Good.

#### TrailLine

```ts
const trailGeo = new LineGeometry();
const trailMat = new LineMaterial({ color: 0xffffff, linewidth: 2.2, transparent: true, opacity: 0.55, depthWrite: false, worldUnits: false });
trailMat.resolution.set(window.innerWidth, window.innerHeight);
const trailLine = new Line2(trailGeo, trailMat);
trailLine.frustumCulled = false;
trailLine.renderOrder = 3;
scene.add(trailLine);
```
LineGeometry initial empty may error? LineGeometry constructor can be empty. `setPositions` with fewer than 2 points might throw? LineSegmentsGeometry.setPositions requires positions length >= 6? It handles empty? Let's not call until >=2 points. Initially no line: `trailLine.visible = false`.

Update every frame or every few frames:
```ts
let trailCounter = 0;
function updateTrail(): void {
  trailCounter++;
  if (trailCounter % 3 !== 0) return;
  const tr = sim.trail;
  if (tr.length < 2) { trailLine.visible = false; return; }
  const arr: number[] = new Array(tr.length * 3);
  for (let i=0;i<tr.length;i++){ arr[i*3]=tr[i].x; arr[i*3+1]=tr[i].y+0.5; arr[i*3+2]=tr[i].z; }
  trailGeo.setPositions(arr);
  trailLine.visible = true;
}
```
`LineGeometry.setPositions` may require the array length to be a multiple of 6 (at least 2 points). If points <2 return.

Note Line2 positions are in world space; the line at origin. Good.

Performance: sim.trail grows unbounded over minutes. At 30x and 60fps, 200 s sim → 6.6 s real → 400 points. At 1x for 10 s → 600 points. Total maybe 5000. Fine. If the user leaves it running for hours, trail huge; cap rendering to last 4000 points? Let's cap the rendered positions to the last 4000 points to avoid huge arrays. But the trail array itself must keep all points. Use start index. Fine.

Actually, sim.trail can grow unbounded if paused=false forever; at 30x, 200 s sim time occurs in 6.7 s real, then burnout, so t stops advancing? No, step keeps advancing t beyond 200 with no thrust, and the rocket falls back (or keeps going up then down). The trail keeps growing. Could be thousands after minutes. Cap rendering.

Also the rocket after burnout: no thrust, gravity pulls it back; it will fall below the pad; our clamp sets alt=0 and vy=0 at the pad, so it lands and stops? It would stay at 0 with vx still nonzero (no ground friction). Hmm, "the rocket cannot go below the pad". It will land and slide horizontally. Fine.

The camera at high altitude follows it back down. Fine.

Maybe cap the simulation? Not required.

#### Overlay

```ts
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;left:14px;top:14px;padding:10px 14px;background:rgba(0,0,0,0.35);color:#dff0ff;font:12px/1.5 monospace;letter-spacing:0.06em;border-left:2px solid #7fb8ff;pointer-events:none;z-index:10;text-shadow:0 1px 2px #000;';
document.body.appendChild(ui);
const btnBar = document.createElement('div');
btnBar.style.cssText = 'position:fixed;left:14px;bottom:14px;display:flex;gap:8px;z-index:10;';
document.body.appendChild(btnBar);
```
Buttons:
```ts
const speeds = [1,10,30];
const buttons: HTMLButtonElement[] = speeds.map(s => { ... });
function setSpeed(s:number){ sim.setSpeed(s); updateButtons(); }
```
Button style: background rgba(0,0,0,0.45), border 1px solid #7fb8ff, color #dff0ff, padding 6px 10px, font monospace, cursor pointer. On click, event.
Add pause button.

Update buttons active state: `btn.style.background = sim.chosenSpeed === s ? '#2a6fb0' : 'rgba(0,0,0,0.45)'`.

Overlay text update:
```ts
const st = sim.state();
const mm = Math.floor(st.t/60).toString().padStart(2,'0');
const ss = Math.floor(st.t%60).toString().padStart(2,'0');
ui.innerHTML = `T+ ${mm}:${ss}<br>ALT ${(st.alt/1000).toFixed(2)} km<br>VEL ${st.speed.toFixed(0)} m/s<br>SPEED x${sim.speed}`;
```
Using innerHTML fine.

Note `state().speed` is the total speed, `sim.speed` is time scale.

#### Animation update

```ts
const clock = new THREE.Clock();
let elapsed = 0;
let ready = false;
const tmpVec = new THREE.Vector3();

function animate(): void {
  const dt = Math.min(clock.getDelta(), 1/30);
  elapsed += dt;
  if (!sim.paused) {
    sim.step(dt * sim.speed);
  }
  updateVisuals(dt);
  composer.render();
  if (!ready) { ready = true; (window as any).__ready = true; }
}
renderer.setAnimationLoop(animate);
```

Wait: `sim.speed` getter depends on sim.t before stepping. At t=9.99, speed=1; step 0.033*1 → t=10.02. Next frame speed=10. Fine.

`updateVisuals`:
- rocket position/rotation.
- plume scaling/visibility.
- light flicker.
- smoke.
- camera.
- sky/fog/stars.
- trail.
- UI.

Let's write it.

```ts
const rocketBase = new THREE.Vector3();
const rocketCenter = new THREE.Vector3();
const zAxis = new THREE.Vector3(0,0,1);
const camTarget = new THREE.Vector3(0, 35, 0);
const lowCamPos = new THREE.Vector3(-110, 3, 145);
const chaseOffset = new THREE.Vector3();

function updateVisuals(dt: number): void {
  const st = sim.state();
  rocketBase.set(sim.x, sim.alt, 0);
  rocketVisual.position.copy(rocketBase);
  rocketVisual.rotation.z = -sim.pitch;

  rocketCenter.set(0, 33, 0).applyAxisAngle(zAxis, -sim.pitch).add(rocketBase);

  // plume
  const burning = st.t < BURN_TIME && st.t > 0.08;
  const ignition = smoothstep(0, 1.0, st.t);
  plumeRoot.visible = burning;
  if (burning) {
    const atm = Math.exp(-st.alt / 8500);
    const flicker = 0.85 + 0.1*Math.sin(elapsed*47) + 0.05*Math.sin(elapsed*113);
    const len = (16 + (1 - atm) * 55) * (0.9 + 0.1*flicker) * ignition;
    const rad = 0.8 + (1 - atm) * 2.2;
    plumeCore.scale.set(rad, len, rad);
    plumeOuter.scale.set(rad*1.45, len*1.12, rad*1.45);
    plumeGlow.scale.setScalar((18 + (1-atm)*22) * (0.9 + 0.1*flicker));
    plumeLight.intensity = 120000 * flicker * (0.4 + 0.6*atm) * ignition;
  } else {
    plumeLight.intensity = 0;
  }
  ...
}
```
The point light inside the rocket group, with position y=-3, but as the plume length grows, the light at the nozzle is fine.

Smoke emission uses st.t and rocketBase.

Camera:
```ts
const blend = smoothstep(70, 230, st.alt);
chaseOffset.set(Math.cos(0.75 + Math.sin(elapsed*0.06)*0.12) * 62, 20, Math.sin(...) * 62);
chaseCamPos.copy(rocketCenter).add(chaseOffset);
desiredCamPos.copy(lowCamPos).lerp(chaseCamPos, blend);
camera.position.copy(desiredCamPos);
camTarget.lerp(rocketCenter, 1 - Math.exp(-dt*6)); // but during low phase, target should be rocket center
camera.lookAt(camTarget);
```
Hmm, camTarget lerp with dt means at the start it lags from (0,35,0) to rocket center. Initialize camTarget to rocket center. At launch, rocket center moves up; lag could make the camera look slightly below the rocket. Use `camTarget.lerp(rocketCenter, 1 - Math.exp(-dt*10))` for smoothness. At 30x speed, the rocket moves fast, camera target lags a bit; acceptable (smooth camera). But the chase position is exact, the look target lags, so the rocket might move toward the top of the frame. At high speed the lag could be large: rocket velocity ~2000 m/s * dt*speed? Wait, sim step advances 30*0.016=0.5 s per frame; rocket moves ~1000 m per frame at high speed. The camera position jumps with the rocket, but lookAt target lerps with factor ~0.15/frame, meaning it lags ~1 km behind, so the camera would look at empty space! Bad.

Need to avoid lag when following high-speed motion. Since the camera and target are both derived from the rocket, just set the camera target to rocketCenter directly (no smoothing), because the motion is inherently smooth in sim time. The visual will be smooth enough. The low→chase blend is smooth. Use `camera.lookAt(rocketCenter)`.

But at 30x, the rocket position changes in large steps each frame, causing jitter (discrete jumps of hundreds of meters). The camera follows exactly, so the rocket appears stationary; the background jumps. Acceptable? The background (Earth) would jitter noticeably. We could interpolate the render position between physics steps for smoothness. That's more advanced. Since dt*speed = 0.5 s per frame at 30x, the rocket moves 0.5 s worth each frame, and both camera and rocket jump together. The relative position is constant, so the rocket appears fixed; the stars/ground jump. At 30x, a fast-moving scene will be jittery anyway. Fine.

At 10x, dt*speed = 0.16 s per frame, still jumpy but okay.

We could smooth the camera but keep the look target exact; no.

Let's use exact positions for chase, and smoothing only for the low camera lookAt (rocket near pad, slow). During the low phase, the sim speed is 1, so fine. For the blend, it's gradual.

`camera.lookAt(rocketCenter)` always? At the low phase, yes, looking at the rocket. At the chase, yes. Good.

But with the rocket tilting, rocketCenter shifts; fine.

For a more cinematic look at liftoff, the low camera is fixed and the rocket rises in the frame, camera looking at the rocket center. Good.

At chase, camera is at rocketCenter + offset, looking at rocketCenter → the rocket center is exactly in the middle of the screen; the rocket body spans ±35 m vertically. The plume extends down. With a 90 m offset and FOV 60, vertical view height 104 m. Rocket 70 + plume 20 = 90, fits. At high altitude, plume 70, total 140 > 104; the plume bottom is cut. Increase offset to 110 m? The requirement says within about 100 m. Use 95 m and FOV 65: view height 2*95*tan32.5=121. Still maybe cut. We can target lower: look at `rocketCenter + (0,-10,0)`, so the view is shifted down, showing more plume. And use offset 100. Let's set chase offset length ~105 with y=15, and look at rocket base+25? Hmm.

Let's target the rocket's midpoint shifted down by 8 m: `lookTarget = rocketCenter - (0,8,0)` (world down). Then the rocket top is 43 m above target, plume base at -25-8=-33, plume end at -25-8-70 = -103 at high alt. With view half-height 55, the plume end is cut. But at high altitude, maybe the plume shouldn't be fully visible; it's huge. Fine.

At ground, plume 16. Fine.

Use camera offset (62, 18, 62) length 91. FOV 60, view height 105. Rocket from -35 to +35 relative to center, then target shifted -8: rocket top +43, bottom -27, plume end -27-16=-43. Fits. Good.

At high altitude, plume end -27-70=-97, partially cut. Acceptable; the top part of the plume visible.

### Ground fade at altitude

We could set `groundGroup.visible = st.alt < 120000`; no matter. The Earth sphere is always there. Let's leave visible. Actually at 100 km the flat land patch may look odd, but the camera is close to the rocket and the ground is a distant patch. Fine.

Maybe fade the fog and use the Earth sphere.

### Sky update

```ts
const sf = smoothstep(30000, 105000, st.alt);
skyUniforms['rayleigh'].value = lerp(2.2, 0.008, sf);
skyUniforms['mieCoefficient'].value = lerp(0.0045, 0.00002, sf);
skyUniforms['turbidity'].value = lerp(5.5, 0.4, sf);
skyUniforms['mieDirectionalG'].value = 0.82;
starMat.opacity = smoothstep(68000, 105000, st.alt);
fog.color.copy(groundFogColor).lerp(spaceFogColor, smoothstep(10000, 80000, st.alt));
fog.near = lerp(250, 2e6, smoothstep(10000, 80000, st.alt));
fog.far = lerp(28000, 8e6, smoothstep(10000, 80000, st.alt));
```
At 30 km, sf ~ 0.33, sky moderately dark. Good.

Hmm, the Sky addon's sun disk brightness might be huge; at high altitude, it's still the sun. Fine.

### Sun intensity and exposure with altitude

No change.

### Building the trail line with LineMaterial resolution

On resize, update.

### Test compile concerns

- `smoke.setViewportHeight` uses `renderer.getDrawingBufferSize`. In newer three, method exists. Yes: `getDrawingBufferSize(target: Vector2): Vector2`.
- `new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)` returns BufferAttribute.
- `geometry.setAttribute('aSize', this.sizeAttr)`.
- In shader material, `uniforms: { uScale: { value: 1 } }` — typed fine.

### Writing the code

This will be long (~1200 lines). Let's be efficient but complete.

Let me start writing final code mentally, checking TS.

One concern: `sky.material` might be `Material | Material[]`; using `sky.material as THREE.ShaderMaterial` — TS may complain that conversion may be a mistake. Use `as unknown as THREE.ShaderMaterial`.

Another: `sky` may not have `renderOrder`? It extends Mesh, yes.

`renderer.setAnimationLoop(animate)` where animate is `() => void`: The type for setAnimationLoop is `(callback: XRFrameRequestCallback | null) => void` where XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void. A function with zero params is assignable. Fine.

`THREE.Clock` getDelta fine.

`LineGeometry.setPositions` expects `number[] | Float32Array`, and maybe `instanceCount`? Fine.

`new LineMaterial({...})` options type includes `worldUnits`? Yes. `linewidth`, `resolution` not set via options? There is `resolution` property on material; the constructor `LineMaterial(parameters: LineMaterialParameters)` includes `resolution?: Vector2`? Actually LineMaterialParameters includes `color`, `linewidth`, `worldUnits`, `dashed`, etc. `resolution` may not be in the parameters type but is a property. Set after construction. Fine.

`Line2` constructor `(geometry?: LineGeometry, material?: LineMaterial)`. Fine.

`trailMat.resolution.set(w, h)`.

`composer.setPixelRatio` exists. Yes.

`OutputPass` constructor optional? `new OutputPass()`. Fine.

`UnrealBloomPass` resolution Vector2. Fine.

Potential TS strict issue: `const ctx = canvas.getContext('2d'); if (!ctx) throw...`. Fine.

`document.body.appendChild` fine.

For event listeners: `window.addEventListener('keydown', (e: KeyboardEvent) => {...})` fine.

`btn.addEventListener('click', () => setSpeed(s))`.

Let me now write the file.

I'll organize with comments.

Detailed code:

```ts
// ===================== Physics =====================
class RocketSim { ... }
```

Then visuals.

Let me carefully write the earth shader GLSL with no syntax errors.

```glsl
uniform vec3 uSun;
uniform vec3 uCenter;
varying vec3 vPosW;
varying vec3 vNormalW;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x);
  float b = mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x);
  float c = mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x);
  float d = mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x);
  return mix(mix(a,b,f.y), mix(c,d,f.y), f.z);
}
float fbm(vec3 p) {
  float amp = 0.5;
  float sum = 0.0;
  for (int i = 0; i < 5; i++) {
    sum += amp * vnoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
void main() {
  vec3 n = normalize(vPosW - uCenter);
  float cont = fbm(n * 2.3 + vec3(3.1));
  float detail = fbm(n * 11.0);
  float landMask = smoothstep(0.47, 0.55, cont + detail * 0.08);
  vec3 deep = vec3(0.012, 0.045, 0.11);
  vec3 shallow = vec3(0.02, 0.16, 0.24);
  vec3 green = mix(vec3(0.08, 0.15, 0.05), vec3(0.28, 0.27, 0.14), detail);
  vec3 sand = vec3(0.42, 0.38, 0.24);
  vec3 landCol = mix(green, sand, smoothstep(0.45, 0.52, detail));
  vec3 col = mix(deep, landCol, landMask);
  float coast = smoothstep(0.43, 0.48, cont) * (1.0 - landMask);
  col = mix(col, shallow, coast * 0.65);
  float ice = smoothstep(0.84, 0.94, abs(n.y));
  col = mix(col, vec3(0.85, 0.9, 0.95), ice);

  vec3 N = normalize(vNormalW);
  float diff = max(dot(N, normalize(uSun)), 0.0);
  col *= 0.08 + 1.1 * diff;

  vec3 V = normalize(cameraPosition - vPosW);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.12, 0.32, 0.75) * rim * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
```
Note: `p *= 2.03;` inside a for loop with a function parameter `p` (non-const local copy) fine.

`cameraPosition` is a built-in uniform in ShaderMaterial (three injects it). Yes, `cameraPosition` is available.

The `uCenter` uniform. Good.

Atmo shader uses `cameraPosition` as well.

Vertex shader shared:
```glsl
varying vec3 vPosW;
varying vec3 vNormalW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
`mat3(modelMatrix)` okay. Note: modelMatrix includes translation; mat3 only rotation/scale. Good.

The Earth sphere has no scale, so normals fine.

### Ocean texture

```ts
function makeOceanTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#123c63';
    ctx.fillRect(0,0,w,h);
    for (let i=0;i<600;i++){
      const x=Math.random()*w, y=Math.random()*h;
      const len=20+Math.random()*120;
      ctx.strokeStyle = `rgba(${120+Math.random()*80|0},${170+Math.random()*60|0},${200+Math.random()*40|0},${0.05+Math.random()*0.1})`;
      ctx.lineWidth = 1+Math.random()*2;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x+len*(Math.random()-0.5)*0.3, y+len*(Math.random()-0.5)*0.1);
      ctx.stroke();
    }
  });
}
```
But the ocean plane texture repeat huge; okay.

Actually using a map with a StandardMaterial color; the map already has color. Set color white.

### Buildings

Use a helper:
```ts
function addBuilding(x:number,z:number,w:number,d:number,h:number,rot:number): void {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
  wall.position.set(x,h/2-1.2,z);
  wall.rotation.y = rot;
  wall.castShadow = true; wall.receiveShadow = true;
  scene.add(wall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w*1.03, 0.5, d*1.03), roofMat);
  roof.position.set(x,h-0.95,z);
  roof.rotation.y = rot;
  scene.add(roof);
}
```
`h/2 - 1.2` so the base at ground -1.2.

Add windows? Maybe a stripe of emissive material. Skip.

### Bushes

```ts
const bushGeo = new THREE.IcosahedronGeometry(1, 0);
const bushMat = new THREE.MeshStandardMaterial({ color: 0x2f4020, roughness: 1, flatShading: true });
const bushCount = 700;
const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
const dummy = new THREE.Object3D();
for (let i=0;i<bushCount;i++){
  let x=0,z=0,r=0;
  do { r = 80 + Math.random()*700; const a = Math.random()*Math.PI*2; x=Math.cos(a)*r; z=Math.sin(a)*r; }
  while (Math.abs(x) < 100 && z > -100 && z < 300); // avoid pad area? 
  const s = 1 + Math.random()*3.5;
  dummy.position.set(x, -1.2 + s*0.35, z);
  dummy.scale.set(s, s*0.7, s);
  dummy.rotation.y = Math.random()*Math.PI;
  dummy.updateMatrix();
  bushes.setMatrixAt(i, dummy.matrix);
}
bushes.castShadow = true; bushes.receiveShadow = true;
scene.add(bushes);
```
Colors could vary; use `bushes.setColorAt(i, color)`. Need material with vertexColors? InstancedMesh color works automatically if instanceColor set. In three, InstancedMesh supports instanceColor and the material uses it when `USE_INSTANCING_COLOR` is defined; setColorAt triggers it. Yes. Use:
```ts
const col = new THREE.Color().setHSL(0.22 + Math.random()*0.08, 0.35 + Math.random()*0.2, 0.15 + Math.random()*0.12);
bushes.setColorAt(i, col);
```
After loop: `if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;`

Avoid pad: if r < 120, reposition. Simpler: generate r from 110 to 800.

### Roads

Use simple planes; no need for lane markings.

### Tower and lattice

`makeLatticeMesh` with array of members. Define a type:
```ts
interface Member { a: THREE.Vector3; b: THREE.Vector3; t: number; }
```

Tower:
```ts
function buildTower(cx:number, cz:number, width:number, height:number, levels:number, memberThickness:number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const hw = width/2;
  const members: Member[] = [];
  const corners = [
    new THREE.Vector3(cx-hw, 0, cz-hw),
    new THREE.Vector3(cx+hw, 0, cz-hw),
    new THREE.Vector3(cx+hw, 0, cz+hw),
    new THREE.Vector3(cx-hw, 0, cz+hw)
  ];
  // legs
  for (const c of corners) {
    members.push({ a: new THREE.Vector3(c.x, 0, c.z), b: new THREE.Vector3(c.x, height, c.z), t: memberThickness*1.4 });
  }
  const segH = height/levels;
  for (let i=0;i<=levels;i++){
    const y = i*segH;
    // horizontals
    for (let j=0;j<4;j++){
      const p1 = corners[j]; const p2 = corners[(j+1)%4];
      members.push({ a: new THREE.Vector3(p1.x, y, p1.z), b: new THREE.Vector3(p2.x, y, p2.z), t: memberThickness });
    }
    if (i < levels) {
      const y2 = (i+1)*segH;
      for (let j=0;j<4;j++){
        const p1 = corners[j]; const p2 = corners[(j+1)%4];
        // alternate diagonals
        if ((i+j)%2===0) members.push({a:new THREE.Vector3(p1.x,y,p1.z), b:new THREE.Vector3(p2.x,y2,p2.z), t:memberThickness*0.7});
        else members.push({a:new THREE.Vector3(p2.x,y,p2.z), b:new THREE.Vector3(p1.x,y2,p1.z), t:memberThickness*0.7});
      }
    }
  }
  // horizontal cross bracing at top
  g.add(makeLatticeMesh(members, mat));
  return g;
}
```
But this tower is at ground y=-1.2? Build starting at -1.2 maybe. Use y0 = -1.2; add to y. Let's just build from 0 to height (base at pad top). Fine.

MakeLatticeMesh sets castShadow/receiveShadow. For the tower, yes.

The tower InstancedMesh count ~ 4 + 17*4 + 16*4 = 136. Fine.

Access arm: a lattice box from the tower to the rocket at y=55.

Lightning masts: use same function with cx,cz, width 3, height 110, levels 22, thickness 0.15. Add.

Wires: create `THREE.Line` with catenary points:
```ts
function addWire(a: THREE.Vector3, b: THREE.Vector3): void {
  const pts: THREE.Vector3[] = [];
  const sag = 8;
  for (let i=0;i<=20;i++){
    const t=i/20;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(Math.PI*t) * sag;
    pts.push(p);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.45 });
  scene.add(new THREE.Line(geo, mat));
}
```
Wires between mast tops and tower top, and between masts. Fine.

### Pad smoke spawn coordinate

Trench exits at x=±48 (pad half length 45 plus a bit). z ∈ [-7,7]. Use x=±48, y=1.5. Good.

### Rocket exhaust lighting the pad

Point light at the nozzle (inside rocket group at y=-2). Intensity 120000. With distance 400 and decay 2. At 50 m: 48. Okay.

Add a second orange light at the trench exits? Maybe two lights, intensity 30000 each, animate. Adds cost but nice. Let's add one at (0,-2,0)? The plume light suffices.

### Final camera view of the coast

At launch, the camera looks up at the rocket, so the ocean may not be visible (looking up). The ocean is on the horizon behind the pad; the camera is at y=3 looking up at 15°, so the horizon may be below the frame. Hmm. The low camera at (-110, 3, 145) looking at rocket center (0,35,0): the view direction is up by atan(32/185) ≈ 10°. FOV 55 vertical, so the frame covers -17.5° to +37.5° relative to horizontal. The horizon (0°) is in the lower part of the frame. Good, the ocean is visible below the rocket. Nice.

### Sun glare / bloom

The Sky sun disk may bloom if in frame. Fine.

### Potential issue: Sky sunPosition and DirectionalLight

The Sky shader expects `sunPosition` normalized. Good.

### Test for `__ready`

After the first composer.render, set. Good.

### Make sure camera aspect handled before first render.

### Add `__rocket` before first render.

Now let's write the code in full. I'll be careful with template literals inside shaders (backticks). Use backticks for GLSL; no `${}` inside unless needed. Avoid.

Let me write.

```ts
/* ... */
```

I need to ensure no TS errors from unused variables? `noUnusedLocals` might be enabled under strict? `tsc --strict` does not include noUnusedLocals/Parameters. So unused is fine, but let's avoid obvious ones.

Potential issue: `const tmp = new THREE.Vector2();` used.

Potential issue: `THREE.BufferAttribute` array types: `new THREE.BufferAttribute(positions, 3)` where positions is Float32Array. Fine.

Potential issue: `geometry.setAttribute('position', this.posAttr)` where posAttr is `THREE.BufferAttribute`. Fine.

Potential issue: In SmokeSystem, `this.points.renderOrder = 5;` fine.

Potential issue: `this.mat.uniforms.uScale.value` type any; fine.

Potential issue: `this.mat` typed `THREE.ShaderMaterial`; yes.

Potential issue: `new THREE.Points(this.geo, this.mat)` gives `THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>`, assigned to `readonly points: THREE.Points`. `THREE.Points` default generics are `<BufferGeometry, Material | Material[]>`. A `Points<BufferGeometry, ShaderMaterial>` is assignable to `Points<BufferGeometry, Material | Material[]>`? Generics are invariant-ish but structurally, ShaderMaterial extends Material, and the `material` property type ShaderMaterial is assignable to Material | Material[]. TS structural typing should allow. To avoid issues, type `points: THREE.Points` and assign; it should be fine because `Points<BufferGeometry, ShaderMaterial>` is structurally compatible with `Points<BufferGeometry, Material | Material[]>`? The `material` field type mismatch (ShaderMaterial vs Material|Material[]) is fine (covariant). Other methods use the type parameter? `Points` doesn't have methods with TMaterial parameters. Fine.

Potential issue: `THREE.InstancedMesh` material type: passing `THREE.Material`. Fine.

Potential issue: `setFromUnitVectors` on `THREE.Quaternion` via dummy.quaternion; fine.

Potential issue: `Object3D.quaternion.setFromUnitVectors` returns Quaternion; fine.

Potential issue: `dummy.updateMatrix()`.

Potential issue: `LineMaterial` `resolution` is public? Yes.

Potential issue: `LineGeometry` `setPositions` accepts `number[] | Float32Array`. Good.

Potential issue: `new Line2(trailGeo, trailMat)` typed.

Potential issue: imports of addons require the `three/addons/` path mapping; the instructions say use it. Fine.

Let's now write the final code.

I'll write the class and then everything.

One more thought on the physics pitch: The thrust direction is tilted by pitch, but the rocket visual tilts the same. The vertical thrust component cos, horizontal sin. Good.

Mass at t=0: m0. Thrust 1.3 m0 g0. Good.

Burn ends at exactly t=200; thrust from t<200. With substeps, the last step crosses 200; use the thrust at the start of the substep. Fine.

"limited to 3 * m * g0 (throttle)" — g0 constant, not g(h)? It says 3*m*g0. Yes, use g0. Done.

"zero after the burn" — yes.

Initial `acc` on reset should be computed: T*cos(0)/m0 - g0 = 1.3*g0 - g0 = 2.943. Set. state().acc = 2.943.

Alt clamp: on the pad, if alt < 0, set 0 and vy=0. At t=0, thrust > weight, no issue.

What if dt is huge like 1e9? n = 5e10 iterations — impossible. Cap dt? The spec says "any dt". Tests might call step(1000) (n=50,000, fine). step(1e6) would hang. Not likely. We could cap substeps per call to e.g. 1e6. But "any dt" means handle arbitrary dt reasonably. We can implement a smarter loop but still fixed substeps. For dt=1e7, n=5e8, too slow. Maybe clamp total dt to some max? That would violate "advances the simulated time by dt". Tests likely use dt ≤ 100. Leave it. But to be safe, use `const n = Math.ceil(dt / 0.02)` and if n > 2_000_000, cap h at dt/n where n=2e6 (substep > 0.02), violating. Better to not cap. Fine.

Trail one per step call; for dt=1000, one point. Fine.

Let's write.

Actually, consider trail size when step is called with tiny dt many times. Fine.

Let's write the final response.

(While writing, keep line count manageable.)

I'll now produce the code.

Additional detail: `rocketVisual` needs to be defined before `updateVisuals` references it. Since `updateVisuals` is a function declaration, it can reference variables declared later as long as it's called after they're initialized. We'll initialize everything before starting the loop. Good.

Let me now write out the entire file.

Potential issue with `THREE.Sky` import name and usage. Fine.

Let me draft the code text:

```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
...
```

I'll now write it for real, carefully.

I need to make sure that all template literals in shaders don't contain backticks. Fine.

Let me consider the `canvasTexture` helper with `draw` callback. Inside, `tex.anisotropy = 8` but renderer max may be lower; fine. Set `tex.colorSpace = THREE.SRGBColorSpace`. For data textures like the marking, yes. For the smoke? No texture.

`makeVegetationTexture()` uses `Math.random()` at init; deterministic not needed.

Now output.

One more thing: the rocket body texture marking segment uses `CylinderGeometry(1.875, 1.875, 12, 24, 1, true, -0.45, 0.9)`. The cylinder's UVs: u around theta, v along height. The texture is transparent, so only the drawn flag/text show. Use `alphaTest: 0.1`? With transparent true and a map with alpha, fine. Set `depthWrite: false` maybe to avoid sorting issues. But it's on the opaque body; better `transparent: true, depthWrite: true`? Transparent objects render after opaque, so it will blend over the body. depthWrite true would cause artifacts with other transparent stuff, but fine. Use `depthWrite: false`, `polygonOffset` true with factor -2 to avoid z-fighting? It's at radius 1.875, 2.5 cm outside; no z-fight. Set transparent true, depthWrite false, roughness 0.35, metalness 0.1.

The marking texture background is transparent; the material color white multiplies. Good.

For the flag at the top of the marking segment, rotate? Fine.

Let's write.

Also the rocket should cast shadow; traverse.

`rocketVisual.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });` Type: `o` is Object3D; cast to Mesh. `isMesh` exists on Object3D? Not typed; cast. Use:
```ts
if ((o as THREE.Mesh).isMesh) { ... }
```
`isMesh` is on Mesh type. Fine.

But `castShadow` is on Object3D, so just set o.castShadow = true for all.

Now writing.

Also the smoke point material `depthTest: true`.

The plume shader material: set `side: THREE.DoubleSide`? The cone is open-ended and viewed from outside; FrontSide is fine. Use DoubleSide so the inside shows too.

Plume geometry translated: `const coreGeo = new THREE.ConeGeometry(2.4, 1, 32, 1, true); coreGeo.translate(0, -0.5, 0);` Note: ConeGeometry apex at +0.5, base at -0.5; translating by -0.5 moves apex to 0 and base to -1. Good.

Vertex shader `vT = clamp(-position.y, 0.0, 1.0);` at apex y=0 -> 0; at base y=-1 -> 1. Good.

The plume mesh is at y=0 in the rocket group.

Now the code.

Let me think about the render order of smoke relative to the plume: plume additive renderOrder maybe 6, smoke 5. Smoke drawn before plume; fine.

The plume `depthWrite: false`, `depthTest: true`. The rocket body occludes the plume if in front. Good.

The trail line renderOrder 3, depthWrite false, depthTest true.

Now the final code.

I'll also add `scene.add(rocketVisual)`.

Let's handle the rocket position at high altitude relative to the Earth sphere: the rocket stays within the Earth's atmosphere near the pad; the Earth sphere is centered below. The pad is at the top. Good. The rocket x drift up to ~100 km; the Earth sphere surface at that horizontal offset drops ~0.8 km, but the rocket's y is measured from the pad plane, so at high altitude it's above the local sphere. Fine.

The camera and rocket at 100 km y; the Earth sphere top at y=0; good.

Let's write the code now.

I'll keep the shadow map small for performance.

One more consideration: at high altitude, the DirectionalLight shadow camera is near the pad; the rocket is out of the shadow camera's frustum. Shadow rendering still fine.

Now the final answer.