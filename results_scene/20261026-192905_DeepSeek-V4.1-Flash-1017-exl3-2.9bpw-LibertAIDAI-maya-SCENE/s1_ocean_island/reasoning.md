We need to produce a single TS file, strict compiles. Let's plan carefully.

We need: ocean with ShaderMaterial, Gerstner waves sum of 3+, matching JS heightAt. Boat with primitives. Island procedural with vertex colors. Palm trees with leaves as one InstancedMesh >=30 instances, swaying updated per frame. Sky addon. DirectionalLight sun. Fog. ACESFilmic, sRGB. Camera at (35,12,35) look at (0,2,0). OrbitControls optional but keep view - probably skip OrbitControls to be safe (must "start there and not move by themselves" — safe to skip). Expose globals.

Ocean at least 400x400 centered origin. Grid <= 256x256 segments. Use PlaneGeometry(400,400,256,256) rotated -PI/2. Waves: Gerstner sum of 4 waves, height ~0.5-2 units crest-to-trough. Let's define waves with amplitude total ~0.9 -> crest-to-trough 1.8. Good.

Wave definition must match between shader and JS. Use same constants. Define in TS:

interface Wave { dirX, dirZ, amplitude, wavelength, speed, steepness }
Wavenumber k = 2π/wavelength. phase = k*(dot(dir, pos)) - speed*k*t? Let's use standard: phase = k * dot(dir, p) - omega * t, omega = speed? Let's define omega = sqrt(g*k)? Simpler: omega = k * speed where speed in units/s... Actually to keep consistent, define phase = k*dot(d,p) + t * omega, with omega = 1.2 * sqrt(k) maybe. Let's just pick explicit: omega = 2π * freq. To match easily, define wave table with dir, amplitude, wavelength, speed (phase speed in units/s), steepness.

phase = k * dot(d, p) - k * speed * t. Hmm with speed as phase speed: omega = k*speed. That works.

Gerstner horizontal displacement: x += Q * A * d.x * cos(phase), z similarly. height y = A * sin(phase). Requirement: "heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z)... (for Gerstner waves ignore the small horizontal shift)". So JS returns sum A*sin(phase) at given (x,z), and shader does the same but also horizontal shift. The shader's vertex displacement at undisplaced position p is: y = sum A sin(k dot(d,p) - omega t) and horizontal displacement. Since we evaluate at undisplaced position, height matches. Good. Note that the actual point ends up at displaced x/z, but spec says ignore horizontal shift.

Normal: compute analytically. For Gerstner, tangent/binormal. Simpler: compute derivative of height field: dy/dx = sum A*k*d.x*cos(phase), dy/dz = sum A*k*d.z*cos(phase). Normal = normalize(vec3(-dy/dx, 1, -dy/dz)). That's good enough and matches the height function derivative approx (ignoring horizontal shift). Use that in shader and JS for boat slope sampling maybe just use heightAt samples as instructed.

For boat pitch/roll: sample heightAt in front/behind and beside hull. Compute pitch = atan2(hFront - hBack, 2*dist)? Boat orientation: boat group's local +Z is forward? Let's define boat forward along +X? Easier: boat aligned with +Z forward. Pitch (rotation about X axis) computed from height difference along forward direction: rotation.x = -atan2(hFront-hBack, 2*d)? Actually for object with forward +Z, raising front means rotating about X negative? Let's think: rotation about X by angle θ rotates +Z toward... Rotation matrix Rx: y' = y cosθ - z sinθ; z' = y sinθ + z cosθ. A point at +Z (0,0,1) becomes (0, -sinθ, cosθ). So positive θ lowers the front. If front height is higher, we want front raised → θ negative. So rotation.x = -atan2(hFront - hBack, 2d)? Wait we want slope: forward vector tilts up by angle atan2(dh, 2d). Setting θ = -atan2(dh,2d) gives front point y = -sinθ * L ≈ +atan2(dh,2d)*L, raised. Yes.

Roll about Z axis: point at +X (1,0,0) under Rz: (cosθ, sinθ, 0). Positive θ raises +X side. So rotation.z = atan2(hRight - hLeft, 2d) where right is +X.

But boat's local axes: let's orient boat with forward along +Z, starboard +X. Fine.

Boat position: (12, 0, 14), drift slowly within 25 of origin. Keep radius: base (12,0,14) radius 18.4; drifting small circle of radius 4 keeps within 22.4 <25. Good. Drift: x = 12 + 3*sin(t*0.05), z = 14 + 3*cos(t*0.07)? Max radius from origin = sqrt((12+3)^2+(14+3)^2)=sqrt(225+289)=22.7 <25. Good. Or just small drift. Use elapsed time.

Boat y = heightAt(x,z,time()) + offset (0.25?). Boat meshes cast shadows.

Island: procedural. Use a PlaneGeometry or custom geometry? Better: create a radial-ish heightfield mesh. Use PlaneGeometry(60,60,128,128) rotated, with height function based on distance from center with noise-like variation. Peak 8-12. Colors from height: sand near water (<0.6), grass, rock near peak. Use vertex colors with MeshStandardMaterial({vertexColors:true, flatShading? no}). Island receives shadows.

Height function: h = peak * exp(-(r/scale)^2) roughly but plateau. Use smooth falloff and add some sinusoidal noise for irregularity. Ensure at r=0 peak ~10. At r=25, ~0 (below water slightly). "about 30 to 50 units across, peak 5-15 units above water".

Let's define islandHeight(x,z):
r = sqrt(x*x+z*z)
base = 11 * Math.exp(-Math.pow(r/14, 2.0)) maybe. At r=14, 11*e^-1 = 4.05. At r=28, 11*e^-4 = 0.2. Hmm 30-50 across: radius ~20-25. Let's use scale factor: 11 * exp(-(r/13)^1.6). At r=20, (20/13)^1.6 = (1.538)^1.6 ≈ e^(1.6*ln1.538)=e^(1.6*0.4308)=e^0.689=1.99 → e^-1.99=0.137 → 1.5. At r=25: (1.923)^1.6 = e^(1.6*0.6536)=e^1.046=2.846 → 0.058 → 0.64. At r=30: (2.308)^1.6=e^(1.6*0.836)=e^1.338=3.81→0.022→0.24. Hmm, island diameter ~50 with shore around r=22-25 where height crosses ~0.3? Add noise.

Add ridge for peak: 11 * exp(...) plus small noise 1.2 * sin(3x)*cos(2.5z)*exp(-(r/18)^2). Fine.

Actually simpler: use a few gaussian bumps:
h = 9*exp(-(r/12)^2) + 4*exp(-((x-3)^2+(z+2)^2)/40) + noise. Peak ~13? clamp.

Let's design height:
const r = hypot(x,z);
let h = 12 * Math.exp(-Math.pow(r / 13, 2.0)); // at center 12
h += 1.5 * Math.sin(x*0.25) * Math.cos(z*0.22) * Math.exp(-Math.pow(r/20, 2));
At r=0: 12 + sin0*... = 12. Good.
At r=13: 12*e^-1=4.41.
At r=20: 12*e^-2.37 = 1.12 + noise*0.37.
At r=26: 12*e^-4 = 0.22.
Sand until h<1.2 maybe shore region. Islands mesh extends 70x70 to go underwater - fine, but visible underwater? Underwater part of island will be visible through water? Water is not transparent (opacity?) The water shader could be opaque; then underwater geometry hidden. But foam near shore nice. Keep water opaque-ish. Actually we want to see the sand transition near water. Water surface at y=0 with waves; island slopes down; where island height <0, hidden under water. Fine.

Island mesh: PlaneGeometry(70,70,140,140). Vertex count ~20k, fine. Displace y by islandHeight. Compute vertex colors based on height and slope:
- below 0.15: sand (dark wet sand) maybe
- 0.15-1.2: sand pale
- 1.2-3.5: sand/grass blend
- 3.5+: grass green to rock grey at top (height>9 or steep slope).

Also add sand ring color. Use noise to vary.

Then palm trees: at least 5. Positions on island where height between 0.4 and 1.6 near beach. Compute positions manually by picking angles/radii and computing islandHeight. For each palm, trunk curved: use TubeGeometry along a CatmullRomCurve3 with slight bend, or use a series of cylinders? Simpler: create a curved trunk using a custom curve and TubeGeometry with taper? TubeGeometry doesn't taper easily. Use CylinderGeometry stacked segments? Let's use a TubeGeometry with radius 0.22, 16 segments, curve bending. Then add a small crown base sphere. Foliage: instanced leaves.

Leaves: each palm has say 8 leaves = 40 instances total (>=30). One InstancedMesh with a leaf geometry. Leaf geometry: a flattened cone or a custom shape — use PlaneGeometry with a leaf-like shape? Since instanced with matrices we can scale. Use a custom BufferGeometry for a frond: a long tapered shape made of a few segments, double-sided, vertex color? Simpler: use THREE.PlaneGeometry(1, 0.35, 8, 1) with vertex positions modified to taper to a point, or just a cone flattened. Use a cone geometry radius 0.35, height 2.2, radialSegments 4, scaled flat? Hmm.

Better: create leaf geometry from a Shape? Let's do: PlaneGeometry(2.2, 0.6, 6, 1) oriented along local +X (length). Modify vertices: taper width by x: for each vertex, width factor = sin curve. And maybe curve downward. Use MeshStandardMaterial({color: 0x2f7d32, side: DoubleSide, roughness:0.7}) with flatShading? Leaves as double-sided planes with slight droop. Instance transforms: position at crown top, rotation by yaw, pitch, plus swaying animation.

We need instance matrices updated every frame with sway. Store base data per instance: palmIndex, angle, index within palm, length scale etc. Each frame, compute matrix from palm data: translation = palm crown position (palm base + curved trunk top), rotation quaternion combining yaw, droop, sway (sin(t*speed + phase)), and scale. Use THREE.Object3D dummy to compose matrix; setMatrixAt.

For leaf pivot: geometry should have origin at base and extend along +X. PlaneGeometry is centered; so translate geometry by +length/2 along X. Then rotate around Y for direction, around Z (or local) for droop.

Let's build leaf geometry: base plane in XY plane? We want leaf in XZ plane? Let's put leaf along +X, lying roughly in XZ plane with slight upward curve. Use PlaneGeometry(2.4, 0.7, 8, 1) (in XY plane). Rotate to XZ: geometry.rotateX(-PI/2) puts it in XZ, width along Z. Then translate(1.2, 0, 0) so base at origin. Then modify vertices to taper and droop: For each vertex, x in [0,2.4], width factor = sin(π x / L)^0.6, scale z by factor, and y -= droop * (x/L)^2 * 0.5. Apply via position attribute. Good.

InstancedMesh count = numberOfPalms * leavesPerPalm = 6*9 = 54. DoubleSide material. castShadow true? Sure, but instanced shadows fine. Maybe castShadow true, receiveShadow false.

Palm trunk: TubeGeometry with curve that bends. Use CatmullRomCurve3 with points offset. Trunk positioned at palm base; but tube curve built relative to base? Build curve in world coords directly with points at palmBase + bend. TubeGeometry accepts absolute points. Then trunk mesh at origin (curve points world). Add to island group? Island group contains island mesh and palms. Expose __island as Group. Requirement "Expose the island (Mesh or Group) as __island; it receives shadows." Group children receive shadows. We'll set islandMesh.receiveShadow = true, trunk receiveShadow maybe.

Actually the boat position (12,0,14) with radius ~18 from origin -- that's over water near island? Island radius ~25, at (12,14) r=18.4, island height there maybe ~1.7? That would put boat on land! Boat at (12, 14) is 18.4 from center; island extends to ~25 with height >0 until r≈25. Hmm height at r=18.4: 12*e^-(18.4/13)^2 = 12*e^-2.0 = 1.62. Boat floating on water at that spot would intersect the island! Requirement says boat floating at about (12,0,14). Island "centered on origin: about 30 to 50 units across". Conflict: boat should be in water. Need island to be smaller or offset? "procedural island centered on the origin" — must be centered at origin. Make island diameter ~30 (radius 15) so at r=18.4 the island is underwater. Height at r=15 should be near 0. Let's use falloff scale 9: 12*e^-(r/9)^2. At r=9: 4.4; r=15: 0.75; r=18: 0.22; r=20: 0.09. Hmm still above water at 18.4 by 0.2 - boat y = heightAt + offset; but island height 0.2 would poke through water? Actually water waves amplitude ~1 crest-to-trough, so island top 0.2 underwater mostly? The island sand at r=18 would be barely above water at y=0.2, visible as a sandbar; boat at (12,14) might sit on it. Better make island radius smaller: falloff 7.5: at r=15: 12*e^-4 = 0.22, at r=12: 12*e^-2.56=0.93. Island diameter ~24-28. Requirement says 30 to 50 units across. Hmm.

Alternative: use a plateau island height function with radius parameter such that island is ~34 across (radius 17) with height exactly 0 at r=17 and steep falloff. Boat at 18.4 from center is just outside. But waves could still overlap shoreline; it's fine. Let's design island height:

h(r) = peak * smoothstep-ish falloff reaching 0 at R=17.5:
h = 11 * (1 - (r/R))^1.6 for r<R, times noise variation. At r=0: 11. At r=8.75 (half): 11*0.5^1.6=11*0.33=3.63. At r=15: 11*(0.143)^1.6 = 11*0.045=0.49. At r=17.5: 0. Add angular noise: R varies with angle: R(θ) = 15 + 3*sin(3θ)+... between 13 and 18. Boat at r=18.4 then likely outside. Good.

But the plane geometry extends 70; heights beyond R negative (set to negative to slope under water). Let's define:
const R = 15.5 + 2.5*sin(3θ + 0.7) + 1.2*cos(5θ + 2.1); // 11.8..19.2
u = clamp(1 - r/R, 0, 1)
h = 11 * pow(u, 1.6) * (0.9 + 0.2*sin(...)) - 0.6*(1-u) maybe to drop below water.
Actually for r>R, set h = -0.8 - (r-R)*0.08 so it slopes down underwater sharply. Boat at r=18.4 maybe just outside R for some angles but if R varies up to 19.2, at boat angle could be inside! Boat angle θ = atan2(14,12)=0.862 rad. R(0.862)=15.5+2.5*sin(3*0.862+0.7)=15.5+2.5*sin(3.286)=15.5+2.5*(-0.144)=15.14; +1.2*cos(5*0.862+2.1)=cos(6.41)=0.99*1.2=1.19 → 16.33. Boat at 18.4 outside. Good. But wave amplitude 1 and island at r=16.3 edge, boat at 18.4 is 2.1 units away from shore, water depth fine. Good.

But island across: diameter ~2*16.3 = 32.6, within 30-50. Peak ~11. Good.

Island mesh plane size 70 covers. Vertices far: h negative. Good.

But wait, "peak 5 to 15 units above water" 11 good.

Boat at (12,0,14) distance 18.4 from origin, water. But requirement "Boat floating at about (12, 0, 14) and staying within 25 units of the origin". Drift small: keep radius <= 23.

Hmm, however island near boat: shore edge 16.3 at boat direction. The boat (18.4) sits just off shore. Nice picture.

But wait: the camera at (35,12,35) looks at (0,2,0). Boat at (12,0,14) is between camera and island — fine. Island behind. Good composition.

Ocean: PlaneGeometry 400x400 with 256x256 segments (65k verts) — fine. But ocean waves at horizon; fog blends. Use fog color matching sky horizon. Need scene.fog = new THREE.Fog(color, 60, 260)? Ocean extends to ±200; camera 50 units away; fog far ~250. Set fog near 40 far 300 maybe. The ocean at distance fades to horizon. Sky dome gradient. fog color light blue matching horizon.

Sky: use Sky addon. Sky is a big mesh with shader; set turbidity, rayleigh, mieCoefficient, mieDirectionalG, sunPosition. Then sun direction = sunPosition normalized. Need DirectionalLight position aligned. Sky addon sunPosition is a vector (direction, not actual position). Set elevation ~25°, azimuth ~135°. Compute sunDir. Then directional light position = sunDir * 100 maybe, target origin.

But Sky addon's material with fog? Sky addon has fog: false probably. It's fine.

Alternatively gradient sky dome custom shader to guarantee good look + sun disk. I think Sky addon looks good. Use Sky with sun position. Need to ensure sky renders behind everything; Sky geometry scaled 1000 or so, material side BackSide, depthWrite false. Sky addon handles.

Tone mapping ACESFilmic, exposure ~0.6 maybe (Sky is bright, needs exposure ~0.5). outputColorSpace = SRGBColorSpace.

Sun DirectionalLight intensity: with ACES and Sky, use intensity 2.5-3. Hemisphere light intensity 0.4 with sky color and ground color.

Shadows: 2048 map, camera covers island and boat: shadow camera ortho left/right ±40, top/bottom ±40, near 1 far 200. Directional light position sunDir*80, target origin, shadow.bias -0.0005.

Water shader:

uniforms: uTime, uSunDir, uSkyColorTop, uSkyColorHorizon, uDeepColor, uShallowColor, uFogColor, uFogNear, uFogFar, maybe camera position (cameraPosition built-in available in ShaderMaterial). Use built-in cameraPosition. Use fog uniforms manually (or set material.fog = true and include fog chunks? Custom ShaderMaterial can include <fog_pars_vertex>, <fog_vertex>, <fog_pars_fragment>, <fog_fragment> and set fog: true, and scene.fog will populate uniforms. That works: ShaderMaterial with fog: true honors scene.fog? Yes, WebGLRenderer sets fog uniforms for materials with fog=true (if material.fog). It requires uniforms fogColor, fogNear, fogFar declared via fog_pars_fragment chunk or manually. Let's manually declare and set updates each frame? Simpler: set material.fog = true and include chunks. Actually chunks require USE_FOG define? The material's fog property triggers USE_FOG define. Let's just manually add uniforms uFogColor, uFogNear, uFogFar and compute fog ourselves in fragment; and not use scene.fog for water? But scene.fog needs to blend far ocean into horizon. If water computes its own fog, that's fine, but island/boat also fogged by scene.fog; consistent colors. We'll set scene.fog and water uniform uFogColor same color, uFogNear/Far same values. Update on resize not needed.

Water vertex shader:
- attribute position (plane rotated? We'll create PlaneGeometry(400,400,256,256) and rotateX(-PI/2) so vertices have x, y=0, z. Then in shader, compute displacement using p = position.xz. Good; normals we compute analytically.
- Compute displaced position: p.xz plus horizontal Gerstner offsets, y = height.
- Compute normal via derivatives of height (as described) — gives smooth normal; but for Gerstner, better compute tangent/binormal properly. Use analytic derivative approach: dHdx = sum A*k*d.x*cos(phase), dHdz = sum A*k*d.z*cos(phase). normal = normalize(vec3(-dHdx, 1.0, -dHdz)). Good enough.

Add small high-frequency detail? Maybe extra waves beyond the 4 main but then heightAt must match exactly. Requirement: heightAt returns vertical displacement shader applies. So all vertical waves must be included in JS. We can include 5 waves. Keep up to 5.

Wave table: 
1. dir (1,0) normalized, A=0.42, wavelength 26, speed 6.0, steepness 0.55
2. dir normalize(0.6,0.8), A=0.30, wavelength 15, speed 4.5
3. dir normalize(-0.7,0.7), A=0.20, wavelength 9, speed 3.2
4. dir normalize(0.2,-0.98), A=0.12, wavelength 5.5, speed 2.4
5. dir normalize(-0.95,0.3), A=0.08, wavelength 3.2, speed 1.8
Total amplitude 1.12 → crest-to-trough 2.24, maybe a bit above 2. Requirement 0.5-2 crest to trough. Sum of amplitudes = 1.12 → max 2.24. Reduce: 0.38+0.26+0.16+0.10+0.06 = 0.96 → 1.92. Good. Make sure visible.

Actually Gerstner with steepness: Q controls horizontal; vertical amplitude A. Keep steepness small (0.3) to avoid loops.

Wave speed: phase = k*dot(d,p) - omega*t, omega = k*speed (speed = phase velocity m/s). k=2π/λ.

JS heightAt(x,z,t): sum A*sin(k*(d.x*x + d.z*z) - omega*t).

Shader same.

Note: shader time uTime must equal time() returned. `__ocean.time()` returns uTime value. Use elapsed time as wave time but maybe pause? We'll set uTime = elapsed (from Clock). The animation loop uses clock.getElapsedTime. Good.

Water color: mix deep and shallow based on wave height (crest brighter) and maybe distance to island? Shallow color near shore: compute distance to origin? Island centered at origin; but shore radius varies. Simpler: shallow based on world x,z radial distance < 24; but also wave height. Let's compute shallowFactor = smoothstep(30, 12, length(p)) maybe — near island water lighter turquoise. Actually since island centered origin radius ~16, water within 25 is shallow. Use radial.

Fresnel: viewDir from camera, N. fresnel = pow(1 - max(dot(N, V),0), 5) * 0.9 + 0.02. Mix water color with sky reflection color. Sky reflection: mix horizon and zenith color based on reflected ray y. reflectDir = reflect(-V, N). skyCol = mix(horizonColor, zenithColor, smoothstep(0.0, 0.5, reflectDir.y)). Multiply by sun? Add specular sun: spec = pow(max(dot(reflectDir, sunDir),0), 250) * sunIntensity. Add foam: near crests (height > threshold relative to amplitude) and near shore. Foam: use noise-ish sine pattern to break up. foam = smoothstep(0.55, 0.95, waveHeight/maxAmp) * ... plus shore foam using distance from island shore. Since island shore radius varies, use r < 18ish? Let's do shore foam = smoothstep(19.5, 17.0, r) * 0.8 and add noise. Combine with wave pattern: foam = clamp(crestFoam + shoreFoam * (0.5+0.5*sin(...)), 0,1). Add white foam color.

Need to be careful: shore foam where r near island edge. Island R varies 11.8-19.2. Using fixed 17 might put foam over land. Better approximate shore radius with same angular function? Could replicate in shader: R(θ) = 15.5 + 2.5 sin(3θ+0.7) + 1.2 cos(5θ+2.1). Then foam when r between R and R+4 with wave. Fine. But the island geometry uses per-vertex R based on angle and radial falloff; the shoreline is where h crosses 0 around R. Good.

Actually island height function: h = 11 * pow(1 - r/R, 1.6) for r<R, with angular variation. Shore is at r=R. So foam near r slightly > R (in water) — foam band ~ R+0 to R+3. Let's do `float shore = smoothstep(shoreR + 4.0, shoreR + 0.5, r)`? Wait smoothstep(edge0, edge1, x) with edge0 > edge1 inverted. Use 1.0 - smoothstep(R, R+4, r) gives 1 inside. But inside is land; foam should be at the boundary. Use band: exp(-pow((r-R-1.0)/2.0, 2)) etc. Simpler: foamShore = smoothstep(R + 3.5, R + 0.2, r) -> 1 when r < R+0.2. Combined with wave foam. It's okay to have foam under the island edge (hidden). Add ripple bands: sin(r*3 - t*2) modulation.

Also add subtle sparkle? Not needed.

For visual quality, add normal detail via small procedural noise? Can use sin combos for micro normal; not needed since waves sum already.

Water transparency? Keep opaque to hide underwater geometry. Could add slight transparency? opaque fine. But near shore, want turquoise. Use shallow color.

Water material: side FrontSide; plane rotated so normal up.

Set water.receiveShadow? ShaderMaterial doesn't receive shadows easily. Not needed.

Add foam line? fine.

Now boat detail: Group with hull, deck, cabin, mast, sail, boom, maybe railing. All primitives with nice materials. Hull: use a shape? Must be primitives. Use a stretched sphere/box combination. Let's design a small sailboat 4 units long:
- Hull: use a Mesh with LatheGeometry? Hmm "built from primitives" - primitives like Box, Cylinder, Sphere, Cone. Could use ExtrudeGeometry not primitive. Let's use a scaled sphere (SphereGeometry) for hull, scaled (1.2, 0.5, 2.2) — looks boat-ish, plus a box deck on top. Or use CapsuleGeometry? CapsuleGeometry is primitive. Use a sphere scaled to a hull and cut? Can't cut. A sphere scaled: elongated ellipsoid. Add a box deck slightly above. It'd look okay. Better: hull from a scaled sphere with top half? Use SphereGeometry with phiStart... Actually we can use a "boat hull" made from a CylinderGeometry rotated 90° around Z? Hmm.

Let's make a decent stylized boat:
- Hull: SphereGeometry(1, 24, 16, 0, Math.PI*2, Math.PI*0.5, Math.PI*0.5)? That's bottom half? Sphere thetaStart=PI/2 to PI gives lower hemisphere (negative y). Then scale (1.0, 0.6, 2.0). That gives a rounded bottom hull, flat top at y=0. Then a deck as a box or a flattened shape on top. Hull length 4 (z scale 2 → sphere radius 1 * 2 = diameter 4). Width 2. Good.
- Deck: CylinderGeometry? Or BoxGeometry(1.8, 0.12, 3.6) at y=0.05 (deck). Better rounded: use CylinderGeometry(0.9, 0.9, 0.12, 24) scaled z 2? Hmm. Use BoxGeometry with rounded? Keep box.
- Cabin: BoxGeometry(1.0, 0.5, 1.2) at y=0.35, z=-0.3 with white material, plus windows maybe.
- Mast: CylinderGeometry(0.05,0.06,3.2) at y=2.0, z=0.4.
- Sail: main sail as a triangle: use BufferGeometry? Not primitive. Could use ConeGeometry? Better use a plane rotated? A sail is triangular. "Built from primitives" — at least 3 meshes; we can use PlaneGeometry for rectangular sail, or a custom BufferGeometry triangle. I think custom triangle is fine but "built from primitives" suggests using primitives. Use a ConeGeometry with radialSegments 3? Hmm.

Could make sail as a plane with shape via scaling: PlaneGeometry(1.8, 2.6) positioned behind mast, rotated slightly, white double-sided. Rectangular sail looks okay (like a gaff sail). Also add a jib triangle using ConeGeometry(?) Maybe use a ShapeGeometry triangle — but that's not primitive. I'll use a custom BufferGeometry to make a triangular mainsail — but requirement says primitives; however "built from primitives (hull, deck or cabin, mast and sail; at least 3 meshes in one Group)"—probably just means procedural geometry, not imported models. We can still use BufferGeometry. But to be safe use PlaneGeometry for sail (primitive) and shape it via vertex displacement in geometry? PlaneGeometry is a primitive. Let's make sail from PlaneGeometry(2.0, 3.0, 8, 8), then modify vertices to make it a triangular/curved sail (taper at top and bottom) — that's still a primitive base. Nice: create function makeSailGeometry that takes PlaneGeometry and modifies positions: width scaled by (1 - y/height) etc. This gives a curved sail. Similarly jib.

Sail orientation: mast along Y, sail behind mast in XZ? Boat forward +Z. Sail plane should be in YZ plane (vertical, along forward), so plane geometry initially in XY plane; rotateY(Math.PI/2) puts it into ZY plane with width along Z. Then position at z = 0.4? Actually sail behind mast: mast at z=0.4 (forward of center), sail extends backwards along -Z. Let's set sail at z = -0.5, y=2.0, with width along Z 2.4, height 2.6. Hmm mast height 3.2 from deck y=0.1 → top at 3.3. Sail from y=0.6 to 3.1. Place plane center at y=1.9, z=-0.4. Good.

Add boom: CylinderGeometry(0.04,0.04,2.2) rotated X 90° (along Z) at y=0.7, z=-0.9.

Add flag/pennant small.

Materials: hull white/cream with slight roughness, cabin wood brown, mast dark wood, sail off-white double side.

Boat group scale? 4 units long overall. Hull sphere scaled z 2 => 4 length. Good.

Boat cast shadows: traverse set castShadow true, receiveShadow true.

But boat pivot: group origin at water level. Hull bottom extends below origin by 0.6? The hull lower hemisphere with y scale 0.6: bottom at -0.6. So boat offset y=+0.35 so hull bottom slightly submerged. Requirement: y = heightAt + constant offset. Use offset 0.35. Fine.

Boat rotation: set group.rotation.x (pitch), rotation.z (roll), plus slow yaw drift to face direction of drift? The boat should point somewhere nice. Set base yaw = 0.6 rad? Hmm if pitch/roll are computed around world axes? The group's local axes rotate with yaw. Better apply quaternion: yaw first then pitch/roll in local frame? If we set rotation order 'YXZ', then rotation.y = yaw, rotation.x = pitch, rotation.z = roll applied in local after yaw. Sampling front/behind should use forward direction from yaw: forward = (sin(yaw), 0, cos(yaw))? For rotation.y = yaw, local +Z transformed = (sin(yaw), 0, cos(yaw)). Right = local +X transformed = (cos(yaw), 0, -sin(yaw)). Then sample front at pos + forward*d, back at pos - forward*d, right at pos + right*d, left at pos - right*d. Then pitch = -atan2(hFront - hBack, 2d) (about local X), roll = atan2(hRight - hLeft, 2d) (about local Z). With rotation order 'YXZ' these are applied appropriately. Use Euler with order YXZ: rotation.y = yaw, rotation.x = pitch, rotation.z = roll. Good.

The yaw could slowly change? Keep yaw constant ~2.4? Let's see camera at (35,12,35) looking to origin. Boat at (12,0,14). To see the boat's side nicely, camera direction from boat to camera = (23, ...,21) → roughly +X+Z. Yaw of boat such that its side faces camera: forward direction perpendicular-ish. If forward = (sin yaw, 0, cos yaw), choose yaw = 0.9π? Let's set yaw = 2.6 rad → forward = (sin 2.6=0.515, cos 2.6=-0.857) → pointing -Z+X. Camera sees mostly side. Good. Maybe yaw = 2.2. Fine. Sails visible.

Also boat drift: x = 12 + 2.2*Math.sin(t*0.07), z = 14 + 2.2*Math.cos(t*0.05). Max from origin sqrt((14.2)^2+(16.2)^2)=21.5. Good.

But boat might drift onto island shore? Min radius from origin ~ sqrt((9.8)^2+(11.8)^2)=15.3 at some times, could hit island (R ~ up to 19). Hmm drift circle radius 2.2 around base radius 18.4 → min distance 16.2, island R at that angle maybe 16.3. Risky. Reduce drift amplitude to 1.2 → min radius 17.2. Still possible. Better design island R max 15, and boat at 18.4. Let's reduce island base radius: R = 14 + 1.6*sin(3θ+0.7) + 0.8*cos(5θ+2.1) → max 16.4, min 11.6. Average 14. Then boat at 18.4 with drift ±1.2 → min 17.2 > 16.4. Safe. Island diameter ~28-33 at widest = 32.8 max (2*16.4) is slightly under 30 minimum if we take average 28. Hmm requirement "about 30 to 50 units across" — let's make base 15 and variation 1.4+0.7 → max 17.1, min 12.9, diameter 25.8-34.2. Boat min distance 17.2 could touch 17.1 at boat angle? At boat angle R was ~16.3 with earlier params. Let's compute with new: R(θ=0.862)=15+1.4 sin(3.286)+0.7 cos(6.41)=15+1.4*(-0.144)+0.7*0.99=15-0.20+0.69=15.49. Boat min 17.2. Safe. Diameter across varies 26-34; "about 30 to 50 across" — 34 max maybe acceptable but "about 30 to 50" wants at least 30 across. Make base R=16, variation 1.5 and 0.8 → max 18.3, min 13.7. At boat angle: 16+1.5*(-0.144)+0.8*0.99=16-0.216+0.792=16.58. Boat min 17.2 > 16.58, safe (0.6 clearance). Waves amplitude near shore could wash; fine. Island diameter up to 36.6, min 27.4. Average ~32. Good enough "about 30 to 50".

Hmm but boat min distance 17.2, island R max 18.3 at other angles, but at boat angle safe. The boat drifts in a circle though; at other times boat position changes angle slightly. Let's check the furthest island R along the drift circle: boat angle ranges roughly atan2(14±1.2, 12±1.2) → angle between atan2(12.8,13.2)=0.77 and atan2(15.2,10.8)=0.95. R at 0.77: 16+1.5 sin(3*0.77+0.7=3.01)=sin3.01=0.129*1.5=0.19; cos(5*0.77+2.1=5.95)=0.94*0.8=0.75 →16.94. Boat min radius ~17.2. Close but okay; clearance 0.26. Tight. Reduce drift amplitude to 0.8 → min radius 17.6. Boat stays "within 25 units" easily. Drift slowly. Fine. Actually simpler: keep boat base at (12,14) and drift ±0.8. It's slow motion. Good.

Hmm, but visually boat near the shore, good.

Actually maybe better to offset island a bit? Requirement centered on origin. Keep centered.

Wait, shore height at r=16.58 is 0; but for r>R, h negative. The island plane vertices near boat: height negative. Fine.

Island height function details:
function islandHeight(x, z) {
  const r = Math.hypot(x,z);
  const theta = Math.atan2(z,x);
  const R = 16 + 1.5*Math.sin(3*theta + 0.7) + 0.8*Math.cos(5*theta + 2.1);
  if (r >= R) {
    // underwater slope
    return -0.4 - (r - R) * 0.12; // drops
  }
  const u = 1 - r/R;
  let h = 11 * Math.pow(u, 1.5);
  // add ridge/noise
  h += 1.2 * Math.sin(x*0.35 + 1.3) * Math.cos(z*0.31 - 0.7) * u * u;
  // small bumps
  h += 0.4 * Math.sin(x*1.1) * Math.sin(z*0.9) * u;
  return h;
}
At r=0: 11 + 1.2*sin1.3*cos(-0.7) = 11 + 1.2*0.9636*0.7648 = 11 + 0.884 = 11.88 + 0. Peak ~12.4 (since u^2 term 1.2 max but sinus values). Peak within 5-15. Good.
At r=8, theta whatever: u=0.5 → 11*0.3536=3.89 + noise. Sand/grass transitions around h~2.
Shore where h=0 at r=R exactly (u=0, all terms vanish). Good.

Underwater slope: at r=30, -0.4 - 14*0.12 = -2.08. Fine, underwater hidden.

But with water waves ±1, the shore line moves; fine.

Vertex colors:
const h = height; slope? compute approximate normal via finite differences? For color, use h:
- h < 0.05: wet sand dark (0xC2A878?); but underwater hidden.
- 0.05..1.5: sand (0xE8D8A8)
- 1.5..3.0: blend sand → grass (0x5E8C3A)
- 3..8: grass (0x4C7A32) with variation
- >8: rock/dark green (0x6B6355) or green.
Add noise: use Math.sin(x*3.1+z*2.7)*0.04 to vary colors. Set color attribute.

Also add rocks at peak? Could add a few low-poly rocks (DodecahedronGeometry) on island for detail. Maybe add a few boulders near shore and peak. But not required. It improves look. Could add 5 rocks with MeshStandardMaterial gray, cast/receive shadows. Keep simple.

Palm tree placement: choose 6 spots with radius 4..11 around island at angles spread, h between 0.6 and 2.5 (beach/lower grass). Compute using islandHeight. For each palm:
- base = (x, h, z).
- Trunk curve: from base up to height ~5-7, bending outward. Points: p0 base, p1 base + (0,2.2,0) + lean*0.2, p2 + (0,4.4,0)+lean*0.6, p3 top + (0,6.2,0)+lean*1.2. Lean direction random angle. TubeGeometry(curve, 12, 0.18, 8, false) — radius at top same as base; could use a custom taper by scaling? TubeGeometry constant radius. Okay. Alternatively build trunk from stacked cones/cylinders (primitive): 6 cylinder segments with decreasing radius, positioned along curve and rotated. That gives taper and segment look. But TubeGeometry constant 0.2 is fine. Add a crown sphere at top (SphereGeometry(0.28)) green-brown.

Actually make trunk with CylinderGeometry segments: easier to taper and looks okay. But curve with segments: compute each segment between curve points, cylinder oriented along segment via quaternion. 6 segments per palm ×6 palms = 36 meshes, fine. But could merge? Not necessary. Use TubeGeometry with radius 0.16 and radialSegments 6; looks smooth, no taper. To taper, could modify TubeGeometry vertices scaling by v? TubeGeometry uv.x along tube. We can build tube and then scale vertices radially based on distance along curve. Simpler: create CylinderGeometry(0.10, 0.22, 1, 8) per segment with matrix. Let's do segments with Object3D transform: for i in 0..segments-1, midpoint of curve segment, cylinder length = distance, aligned via quaternion from (0,1,0) to segment dir, scale radius taper via top/bottom radii: cylinder radiusTop = lerp(0.08, 0.20, ...). Actually CylinderGeometry(radiusTop, radiusBottom, height). For segment i near top smaller. Add slight rotation. 6 palms * 5 segments = 30 meshes, okay. But each palm group.

However each cylinder casting shadow adds draw calls. Fine ~30.

Leaves: crown at top = curve.getPoint(1). Leaves radiate from crown. Each palm 8 leaves → 48 instances (>=30). Instances at crown position. Leaf geometry base at origin extending +X, with plane in XZ. For each leaf: yaw = angle around Y, droop = downward tilt, plus sway. Compose: dummy.position = crown; dummy.rotation.set(0,yaw,0); then apply droop by rotating around Z? If leaf extends +X and we rotate around Z by positive angle, it lifts up (since +X rotates toward +Y). Droop means downward → rotation.z = -droopAngle. With quaternion order: dummy.rotation.set(0, yaw, -droop) with default XYZ order applies Rx then Ry then Rz? THREE Euler XYZ means rotation matrix R = Rx * Ry * Rz? Actually Euler order 'XYZ' means apply X then Y then Z? The resulting matrix is R = Rx * Ry * Rz? Need not be precise; visually fine. Better compose quaternions manually: q = qYaw * qDroop (local droop around Z after yaw). Use dummy.quaternion.setFromEuler(new THREE.Euler(0, yaw, -droop, 'YXZ'))? Euler YXZ means R = Ry * Rx * Rz? Hmm. Simpler: dummy.rotation.set(0, yaw, 0); then dummy.rotateZ(-droop) — rotateZ rotates in local frame after yaw. And sway similarly rotateZ. That's intuitive: leaf points along +X in local, yaw determines direction, rotateZ tilts up/down in that vertical plane. Actually rotateZ rotates around local Z axis; after yaw around Y, local Z is horizontal perpendicular to leaf direction; rotating around it tilts leaf up/down. Good. Then scale (1, 1, 1) varying leaf length factor per instance (store in data). Use dummy.scale.set(len, 1, 1)? Since leaf extends along X and has width in Z, scaling X changes length. Also scale y? no thickness. Fine.

Sway: droop = baseDroop + 0.10 * Math.sin(t*1.7 + phase). yaw sway = 0.08*sin(t*1.3+phase). Use dummy.rotateY(swayYaw) after yaw? Maybe skip. update matrix every frame, instanceMatrix.needsUpdate = true. Also maybe update InstancedMesh material? no.

Leaves material: MeshStandardMaterial({color:0x2E7D32, side: DoubleSide, roughness:0.8, metalness:0.0}) and vertexColors? We'll set instance colors? Not necessary. Could add slight color variation with setColorAt once. Optional. Use material with flatShading? Leaves look nicer smooth.

Leaf geometry double-sided, castShadow true. For instanced shadows, fine.

Palm crown: add a small SphereGeometry(0.3) at top brownish-green and a few coconuts (SphereGeometry(0.08)) maybe.

Island group: contains island mesh, palms (trunk segment meshes, crown spheres), leaves InstancedMesh (must be in scene). Expose __island = islandGroup; islandMesh.receiveShadow = true. Leaves probably not in island group? Could be inside group; instanced matrices relative to group. Group at origin, no transform, so fine. But requirement expose __leaves = leaves mesh. Fine.

Sky and sun:
Sky addon import { Sky } from 'three/addons/objects/Sky.js'; Need types? three addons have types in @types/three? The user says addons from 'three/addons/...'. With modern three, types included. `import { Sky } from 'three/addons/objects/Sky.js';` should compile with @types/three? Three's package includes types for addons? Actually three r160+ ships with types? Three.js doesn't include TypeScript types in package? Since r150ish, `three` package includes types? It has `types/three` via `@types/three` typically. The addons types are in @types/three/examples/jsm/... Wait import path 'three/addons/objects/Sky.js' maps to examples/jsm/objects/Sky.js. Types from @types/three provide definitions under 'three/examples/jsm/...' maybe also 'three/addons/...' since @types/three v0.160 includes paths? Hmm, risk. Could avoid Sky addon and write custom gradient sky dome shader — safe, no addon types issue. Requirement allows gradient sky dome or Sky addon. A custom sky dome with sun disk looks great and avoids type issues. Let's do custom sky.

Sky dome: SphereGeometry(500, 32, 16), ShaderMaterial with side BackSide, depthWrite false, fog false. Vertex shader passes world direction (or normalized position). Fragment: gradient from horizon color to zenith color based on normalized direction y; sun disk: pow(max(dot(dir, sunDir),0), 2000) etc. Add sun glow halo: pow(max(dot),0), 8) etc. Add slight haze near horizon. Sky mesh follow camera? If radius 500 and camera at 50 from origin, camera inside. Fine; but ocean extends 200, sky at 500, fine. Depth: sky should render behind everything; set renderOrder = -1? With depthWrite false and depthTest true, it's fine drawn first? Renderer sorts opaque by distance; sky is huge, might draw last but depth test passes because ocean within 200 is closer. Actually if sky drawn after ocean, depth test rejects sky where ocean drawn (ocean depth values closer) — correct. Sky where no geometry passes. Fine. Set sky.frustumCulled = false maybe. Also since camera far plane: set camera far = 1000.

Sun position: direction. Choose elevation 24°, azimuth 130°. sunDir = (cos(elev)*cos(az), sin(elev), cos(elev)*sin(az))? Using spherical: y = sin(elev), horizontal = cos(elev); x = cos(az)*cos(elev), z = sin(az)*cos(elev). With az 130° = 2.269 rad: x = -0.643*0.9135 = -0.587; z = 0.766*0.9135 = 0.700; y = sin24°=0.407. So sun in -X,+Z, above. Camera at +X+Z looking origin; sun behind-left? It will appear in upper left/back? Actually camera direction is toward -X-Z. Sun at -X+Z; from camera's perspective might be left-ish. Fine.

Hmm for a nice picture, sun maybe at azimuth 70° (x=0.31,z=0.86) → sun toward +Z, camera at +Z looking -Z; sun behind camera? Better sun in front of camera: camera at (35,12,35) looks toward origin (-X,-Z direction). Sun direction with x negative, z negative would be in front. Choose azimuth 225°: x=-0.707,z=-0.707, elevation 30°. Sun in front of camera, nice backlit? Backlighting makes water sparkle toward camera; good. But island/boat front sides in shadow — use hemisphere fill. Maybe azimuth 135° (x=-0.643,z=0.766) gives side lighting: sun to left and slightly behind the island relative to camera, so island lit from left. Good.

Let's set elevation 28°, azimuth 135°: x=cos(135°)*cos28=-0.7071*0.8829=-0.624; z=+0.624; y=sin28=0.469. Sun direction (-0.624, 0.469, 0.624). Directional light position = sunDir * 120 = (-74.9, 56.3, 74.9). Target origin. Shadow camera covers ±40.

Sun disk in sky shader: use dir dot sunDir.

Sky colors: zenith deep blue (0x2a6fb0?) horizon pale (0xcfe4f2). For a tropical look, zenith #2b74c4, horizon #a8d8ef, plus near-horizon warm haze #f7e2c0 maybe. Keep.

Fog color: horizon color ~0xa9c9de or 0xb8d6e6. Fog near 60 far 280. The ocean extends 200 from origin; camera at 50; farthest ocean distance ~300, so fog far 280 will partially hide edge. But sky dome radius 500, horizon at y=0 from camera's height 12 → distance to horizon of dome ~ sqrt(500^2-...)=500. The water edge at 200 will be fogged to fog color; sky horizon color same → seamless. Good. Use FogExp2? Linear Fog(0xb8d6e6, 50, 260). At 200 distance from camera ~ 250 → fully fogged. Good.

Tone mapping: ACESFilmic exposure 0.65 (Sky custom colors can be tuned directly, no Sky addon intensity). Sun intensity 3.0? In three r155+, lights use physically correct units by default? DirectionalLight intensity 3 is bright but with ACES exposure 0.65. Let's set sun intensity 2.8, hemi 0.7, ambient 0.15. Need a good look but can't preview. Typical: renderer.toneMappingExposure = 1.0 with ACES; directional intensity 3.0; hemisphere 0.6. Standard materials albedo 0.6. Should be okay.

Water shader also needs tone mapping? ShaderMaterial output is not tone mapped automatically unless we include tonemapping fragment chunk. For ShaderMaterial, renderer applies tone mapping only via #include <tonemapping_fragment> and colorspace_fragment. Need to include those to match. Use `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at end of fragment shader. These chunks require uniforms/defines handled by renderer; ShaderMaterial supports them if the shader includes. Yes typical. The tone mapping is applied based on renderer's toneMapping (define TONE_MAPPING) when material.toneMapped true (default). For ShaderMaterial, `#include <tonemapping_fragment>` works? It uses `toneMapping` function defined in `tonemapping_pars_fragment` which must be included too. Include both `#include <tonemapping_pars_fragment>` and `#include <colorspace_pars_fragment>`? In recent three, colorspace_fragment uses `linearToOutputTexel`. It might need `#include <colorspace_pars_fragment>`. Many examples do:

```
gl_FragColor = vec4(color, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
The pars are injected by WebGLProgram automatically for built-ins? For raw ShaderMaterial, the prefix includes tonemapping_pars_fragment and colorspace_pars_fragment automatically in WebGLProgram's fragment prefix (it does include these for all materials? Let's recall WebGLProgram: prefixFragment includes `#include <tonemapping_pars_fragment>`? Actually WebGLProgram builds `prefixFragment` with defines and includes: for non-raw shader materials, it prepends `#include <tonemapping_pars_fragment>`? Hmm. In three source, `getToneMappingFunction` etc are included in prefixFragment: `parameters.toneMapping !== NoToneMapping ? '#define TONE_MAPPING' ... + ShaderChunk['tonemapping_pars_fragment']`. And colorspace_pars_fragment similarly. So `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` in the shader body works. Yes standard.

Alternatively set material.toneMapped = false and output colors in sRGB manually? Simpler to include chunks. I'll include tonemapping_fragment and colorspace_fragment at end.

But the output of our shader is computed in linear space (colors specified via new THREE.Color(0x...) are converted? THREE.Color stores values; if setHex, it's sRGB values but Color stores components as-is in r155? `new THREE.Color(0x...)` sets r,g,b by converting from sRGB to linear if ColorManagement enabled (default true). Yes Color.setHex converts to working color space (linear). So uniform colors passed are linear. Good.

Let's code carefully.

Potential strict TS issues:
- Need types for callbacks, uniforms.
- `renderer.setAnimationLoop((time: number) => {...})` — setAnimationLoop signature (callback: XRFrameRequestCallback | null). XRFrameRequestCallback = (time: number, frame: XRFrame) => void. Providing (time: number) => void works? Function with fewer params is assignable. Yes.
- Use clock.getDelta / getElapsedTime.

- ShaderMaterial uniforms typed as { [uniform: string]: THREE.IUniform }. We'll create uniforms object with values. Fine.

- Accessing window with `(window as any)`.

- InstancedMesh setMatrixAt etc.

- Geometry attribute access: `geometry.getAttribute('position') as THREE.BufferAttribute`; in newer three, `getAttribute` typed as BufferAttribute | InterleavedBufferAttribute. Cast to BufferAttribute for setXYZ. Fine.

- For PlaneGeometry rotated: use plane.rotateX(-Math.PI/2) then position attribute includes y=0 and z. Compute normals? Material is ShaderMaterial so no need.

Ocean mesh: Mesh(geometry, waterMaterial). Set frustumCulled = false? Plane at origin; fine. CastShadow false, receiveShadow false.

Note the water plane 400x400 centered: camera at 50, far side 200+. Good.

Waves in shader and JS must match. Define constants in TS arrays and inject into shader via string generation to guarantee match. Build shader source string with wave constants embedded. That's robust.

Let's define:

type WaveDef = { dx: number; dz: number; amp: number; len: number; speed: number; steep: number };

Waves normalized dirs.

WAVE_A: dir (1,0), amp .38, len 27, speed 7.5, steep 0.35
Wave B: dir (0.62,0.78), amp .24, len 17, speed 5.5, steep 0.3
Wave C: dir (-0.72,0.69), amp .16, len 10.5, speed 4.2, steep 0.25
Wave D: dir (0.25,-0.97), amp .10, len 6.5, speed 3.0, steep 0.2
Wave E: dir (-0.94,0.34), amp .06, len 4.0, speed 2.2, steep 0.15

Sum amp .94, crest-trough 1.88. Good.

Omega = k * speed. k = 2π/len. Speed ~7.5 for len 27: omega 1.745 rad/s, period 3.6s. Good. Wave at 17: k=0.3696, omega=2.033, period 3.09s. Fine.

Phase = k*(dx*x + dz*z) - omega*t. Wait sign: with -omega t, waves travel in +dir. Fine.

Shader functions:

```
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;
varying float vCrest;
varying vec2 vXZ;

float waveHeight(vec2 p, float t) {
  float h = 0.0;
  // for each wave: h += A*sin(k*dot(d,p) - omega*t);
  return h;
}

vec3 waveDisplace(vec2 p, float t) {
  vec3 offset = vec3(0.0);
  for each: 
    float ph = k*dot(d,p) - omega*t;
    float c = cos(ph);
    offset.y += A*sin(ph);
    offset.x += steep * A * d.x * c;   // Q = steep
    offset.z += steep * A * d.z * c;
  return offset;
}
```

Normal: 
```
vec2 grad = vec2(0.0);
for each: float ph...; float c=cos(ph); grad.x += A*k*d.x*c; grad.y += A*k*d.z*c;
vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
```
Note grad components: dHdx, dHdz. Good.

Crest factor: sum of A? vCrest = h / 0.94 maybe. Use smoothstep in frag.

Vertex shader:
```
vec3 pos = position;
vec2 p = pos.xz; // plane is in XZ
vec3 disp = waveDisplace(p, uTime);
vec3 world = vec3(pos.x + disp.x, disp.y, pos.z + disp.z);
vec4 wp = modelMatrix * vec4(world, 1.0);
vWorldPos = wp.xyz;
vNormalW = normalize(mat3(modelMatrix) * waveNormal(p, uTime)); // model matrix is identity maybe
vHeight = disp.y;
vXZ = p;
gl_Position = projectionMatrix * viewMatrix * wp;
```
Wait `viewMatrix` is a built-in uniform? Yes WebGLRenderer provides viewMatrix to ShaderMaterial? Built-in uniforms: modelMatrix, modelViewMatrix, projectionMatrix, viewMatrix, normalMatrix, cameraPosition. Yes viewMatrix exists. Use projectionMatrix * viewMatrix * wp.

Better use modelViewMatrix: gl_Position = projectionMatrix * modelViewMatrix * vec4(world,1.0); but vWorldPos requires modelMatrix. Model matrix identity (mesh at origin, no rotation). Use modelMatrix.

Fragment:
```
vec3 N = normalize(vNormalW);
vec3 V = normalize(cameraPosition - vWorldPos);
float fres = pow(1.0 - clamp(dot(N,V),0.0,1.0), 5.0);
fres = mix(0.02, 1.0, fres);

vec3 R = reflect(-V, N);
float skyT = smoothstep(-0.05, 0.6, R.y);
vec3 skyCol = mix(uSkyHorizon, uSkyTop, skyT);

// water base color: shallow near island, deep elsewhere
float r = length(vXZ);
// shore radius approx
float theta = atan(vXZ.y, vXZ.x); // careful: vXZ = (x, z); atan(z, x)
float Rshore = 16.0 + 1.5*sin(3.0*theta+0.7) + 0.8*cos(5.0*theta+2.1);
float shallow = 1.0 - smoothstep(Rshore, Rshore + 14.0, r);
vec3 base = mix(uDeepColor, uShallowColor, shallow * 0.9);

// vary by height
float crest = smoothstep(0.25, 0.9, vHeight / 0.94); // 0..1
base = mix(base, base * 1.35 + vec3(0.02,0.05,0.05), crest*0.5);

// sun specular
float spec = pow(max(dot(R, uSunDir), 0.0), 220.0);
float sunUp = smoothstep(-0.05,0.15,N.y?)...
vec3 color = mix(base, skyCol, fres * 0.85) + uSunColor * spec * 3.0;

// maybe water sparkle
float sparkle = pow(max(dot(R, uSunDir),0.0), 800.0) * 2.0;
color += uSunColor * sparkle;

// foam
float crestMask = smoothstep(0.62, 0.95, vHeight / 0.94);
float foamNoise = 0.5 + 0.5 * sin(vXZ.x*2.3 + uTime*1.5) * sin(vXZ.y*2.1 - uTime*1.1);
float crestFoam = crestMask * (0.4 + 0.6*foamNoise);
float shoreDist = r - Rshore;
float shoreFoam = 1.0 - smoothstep(0.0, 3.2, shoreDist); // inside? shoreDist negative inside land
shoreFoam *= (0.6 + 0.4*sin(shoreDist*4.0 - uTime*2.0));
float foam = clamp(crestFoam*0.7 + shoreFoam * smoothstep(Rshore-1.0, Rshore+0.5, r) * 1.2, 0.0, 1.0);
color = mix(color, uFoamColor, foam * 0.85);
```
Careful with shore foam: should be a band just outside shore. Let band = smoothstep(Rshore + 3.0, Rshore + 0.0, r) * smoothstep(Rshore - 1.0, Rshore + 0.0, r)? Hmm. Let's define d = r - Rshore. Foam when d between -0.5 and 3: shoreFoam = smoothstep(3.5, 0.5, d) * smoothstep(-1.5, -0.2, d)?? smoothstep(edge0, edge1, x) with edge0>edge1 handles inverted okay but confusing. Simpler: shoreFoam = exp(-pow((d - 1.0)/1.5, 2.0)); This is 1 at d=1 (just outside shore), falls to 0. Use this. Multiply by (0.6+0.4 sin(...)). Good. Also add wave crest foam (vHeight relative to amplitude). Use vHeight/amp but wave amplitude max 0.94; crest foam threshold 0.55*0.94=0.52. fine.

Fog:
```
float dist = length(cameraPosition - vWorldPos);
float fogFactor = smoothstep(uFogNear, uFogFar, dist);
color = mix(color, uFogColor, fogFactor);
```
Then tonemapping/colorspace.

One issue: fresnel mixing sky reflection should account for sun brightness? Sky colors are custom. Fine.

Also add "sun glitter path": water spec with roughness? A single pow 220 gives a small highlight; add a broader streak using pow(dot(R,sunDir), 40) * 0.15. Gives sheen.

Water color values: deep #062a3f? For tropical: deep #05364a or #0a3d52; shallow #1a9ba8 / #2ec4b6. Let's use deep 0x073a4d, shallow 0x1f9e9e. Foam 0xeaf7f7. Sky top 0x2a6fc0, horizon 0xb8d9ec. Fog 0xb8d9ec. Sun color 0xfff4d6.

Sky shader:
Vertex: vWorldDir = normalize((modelMatrix * vec4(position,1.0)).xyz); Actually sphere centered at origin; position direction. Simpler: vDir = normalize(position). Use sphere radius 400 centered at origin; camera inside. But the sky sphere is centered at origin, camera offset 50; direction from camera to sky vertex differs slightly; negligible. Better sky sphere follows camera each frame? We can add sky.position.copy(camera.position) in loop, but then direction normalized position is direction from camera. Let's just set sky.position = camera.position each frame? Camera doesn't move (no controls), so no need. But if camera static, fine. To be safe, in animation loop set sky.position.copy(camera.position). Then vDir from local position still correct (sphere centered at camera). Good.

Sky fragment:
```
varying vec3 vDir; // normalized world direction (position normalized, sphere local)
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyTop, pow(h, 0.55));
  // horizon haze
  float haze = exp(-max(d.y,0.0)*10.0); // near horizon
  col = mix(col, vec3(0.95,0.98,1.0)*??, haze*0.3)
  // sun
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  float disk = smoothstep(0.9995, 0.9999, sd); // careful
  col += uSunColor * (pow(sd, 900.0) * 3.0 + pow(sd, 30.0) * 0.25 + pow(sd,6.0)*0.06);
  // maybe sun disk
  col += uSunColor * disk * 6.0;
  gl_FragColor = vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
But tone mapping of sky with exposure 0.65, sunColor 1,1,0.9 → disk 6 → tone mapped bright white. Fine. Sky colors linear? Uniforms from THREE.Color are linear; ACES handles.

Note sunDir used in sky should be normalized. Directional light position = sunDir * 150. Directional light target origin; light direction from target to light = sunDir, good.

Shadow camera: directional light shadow.camera left/right/top/bottom = ±45, near 1, far 300. Position at sunDir*120 (distance 120 from origin), near 300 covers. mapSize 2048.

Also set light.shadow.camera.updateProjectionMatrix()? Setting properties automatically? Need to call updateProjectionMatrix after changing? DirectionalLightShadow.updateMatrices updates each frame? Not automatically for ortho camera property changes; call `sun.shadow.camera.updateProjectionMatrix()` after setting. Good.

Bias -0.0004, normalBias 0.02.

Ocean receiveShadow? no.

Island material: MeshStandardMaterial vertexColors true, roughness 0.95, metalness 0.0, flatShading false. Compute geometry normals after displacing (computeVertexNormals). For plane rotated, normals upward initially; after displacement recompute.

Important: PlaneGeometry rotated -PI/2: position attribute x,y,z with y=0. When we set y = islandHeight(x,z), we should account for y originally 0. Good. Need also maybe add shoreline smoothing.

Island geometry segments 128x128 = 16k verts; fine, but plane size 70 → vertex spacing 0.55; shoreline smooth enough.

Boat: uses heightAt at (x,z,t). Because shader displaces x/z, actual surface at boat's position differs slightly; acceptable per requirement.

Also boat y offset constant. The hull bottom at -0.6 relative, offset 0.35 → bottom 0.35 below water surface? Wait boat group y = height + 0.35; hull bottom local -0.55 → world bottom = height + 0.35 - 0.55 = height - 0.2 → slightly submerged. Good.

Boat pitch/roll sampling: front = pos + forward*1.8, back = pos - forward*1.8, right = pos + right*1.0, left = pos - right*1.0. pitch = -Math.atan2(hF - hB, 3.6); roll = Math.atan2(hR - hL, 2.0). Clamp maybe ±0.25 rad.

Smooth the pitch/roll? Could lerp to avoid jitter. Use direct fine.

Boat drift: compute boatX = 12 + 0.8*Math.sin(t*0.09); boatZ = 14 + 0.8*Math.cos(t*0.07). yaw = 2.3 + 0.15*Math.sin(t*0.05)? Slight yaw motion okay. But then sample directions based on yaw. Fine, slow.

Make sure boat stays in water; island shore R at boat angle ~16.6; boat min radius 17.6. Good.

Camera: PerspectiveCamera(50, aspect, 0.1, 2000); position.set(35,12,35); lookAt(0,2,0). Since no controls, camera static. Requirement keep this view. Fine. But if we don't use OrbitControls, no import needed. But maybe allow orbit? Not necessary. Static is safest (no self movement).

Animation loop:
```
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();
  oceanTime = t;
  waterUniforms.uTime.value = t;
  ...
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```
But requirement: "After the first frame is rendered, set __ready". Set after render call. Good.

`(window as any).__ocean = { heightAt: (x,z,t) => oceanHeight(x,z,t), time: () => waveTime };`

where waveTime = t used for shader. Need `time()` returns the wave time in seconds shader uses right now. Yes.

Important update order: compute boat using current t (same as shader uniform). Set uniform before render.

Now boat should also cast shadows: traverse. Ocean doesn't.

Palm leaves update every frame uses t; fine.

Let's write helper functions.

Ocean height:
```
function oceanHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    const omega = k * w.speed;
    const phase = k * (w.dx * x + w.dz * z) - omega * t;
    h += w.amp * Math.sin(phase);
  }
  return h;
}
```

Shader generation: 
```
const waveGLSL = WAVES.map(w => { const k = 2π/w.len; const omega=k*w.speed; return `h += ${w.amp.toFixed(5)} * sin(${k.toFixed(6)} * (${w.dx.toFixed(6)} * p.x + ${w.dz.toFixed(6)} * p.y) - ${omega.toFixed(6)} * t);` }).join('\n');
```
Also displacement and normal. Need to ensure JS numbers formatted with enough precision (toFixed(6)). Good.

Use vec2 p where p.x = x, p.y = z.

Let's write shader fully:

```
const waterVert = /* glsl */`
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;
varying vec2 vXZ;

vec3 gerstner(vec2 p, float t) {
  vec3 o = vec3(0.0);
  float ph;
  ${waveDisplaceCode}
  return o;
}

vec3 waveNormal(vec2 p, float t) {
  vec2 g = vec2(0.0);
  ${waveNormalCode}
  return normalize(vec3(-g.x, 1.0, -g.y));
}

void main() {
  vec2 p = position.xz;
  vec3 d = gerstner(p, uTime);
  vec3 worldPos = vec3(position.x + d.x, d.y, position.z + d.z);
  vWorldPos = (modelMatrix * vec4(worldPos, 1.0)).xyz;
  vNormalW = normalize(mat3(modelMatrix) * waveNormal(p, uTime));
  vHeight = d.y;
  vXZ = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
`;
```

Wait `mat3(modelMatrix)` — modelMatrix is mat4, mat3(modelMatrix) valid in GLSL (constructor). Yes.

But waveNormal should include horizontal displacement effect; ignore.

Fragment uses `vXZ`, `vHeight`, `vNormalW`.

Note: gl_Position should use viewMatrix not modelViewMatrix because vWorldPos already world. Fine.

Water uniforms: uTime, uSunDir, uSunColor, uSkyTop, uSkyHorizon, uDeepColor, uShallowColor, uFoamColor, uFogColor, uFogNear, uFogFar.

Add `uCameraPos`? Use built-in cameraPosition. Good.

Fragment includes:
```
uniform vec3 uSunDir;
...
varying ...
void main() {
 ...
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
```
`#include <colorspace_fragment>` requires gl_FragColor; fine.

For THREE r160+, `colorspace_fragment` chunk uses `linearToOutputTexel(gl_FragColor)`; defined in prefix if outputColorSpace. Should work.

ShaderMaterial define: `new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.FrontSide, fog: false })`. Note: tone mapping applied only if material.toneMapped? Default true. Renderer will define TONE_MAPPING if renderer.toneMapping != NoToneMapping and material.toneMapped true. For ShaderMaterial, WebGLProgram's parameters.toneMapping checks material.toneMapped. Yes.

Now island vertex colors creation:
```
const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
const colors = new Float32Array(count*3);
const cSand = new THREE.Color(0xE6D3A1);
...
for i: x=pos.getX(i), z=pos.getZ(i), h=islandHeight(x,z); pos.setY(i,h);
  determine color via height + noise; colors[...] = color.r...
geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
geo.computeVertexNormals();
```
But note pos.y originally 0; set.

Color function:
```
function islandColor(x: number, z: number, h: number, out: THREE.Color) {
  const n = Math.sin(x*3.3 + z*2.7) * 0.5 + Math.cos(x*1.7 - z*4.1) * 0.5;
  if (h < 0.35) { out.setHex(0xC9B98A).multiplyScalar(0.9 + 0.1*n) } // wet sand / underwater
  else if (h < 1.6) { mix sand light and wet? }
  ...
}
```
Better smooth blending: use color lerp based on h with thresholds, plus noise. Let's do:
- sand = 0xEAD9A8
- wetSand = 0xC9B48A
- grass = 0x4E7C33 (dark tropical)
- grassLight = 0x6FA34A
- rock = 0x7A7264
Blend:
if h < 1.2: t = clamp(h/1.2,0,1); mix(wetSand, sand, t)
else if h < 3.5: t=(h-1.2)/2.3; mix(sand, grass, smoothstep) 
else if h < 8: mix(grass, grassLight, noise) 
else: mix(grassLight, rock, (h-8)/4)
Add noise variation to green.

Also add "beach ring" where h between 0.2 and 1.4 mostly sand. Since steep island slope, sand band narrow. That's okay; tropical island with narrow beach.

Maybe the island's shape with pow(u,1.5) means slopes steep near shore? derivative ~1.5*11/R*(1)^0.5 = 16.5/16=1.03 slope. Beach ~1 unit wide. Fine.

Add rocks: few dodecahedrons at positions near peak. Use DodecahedronGeometry(0.6) scaled, gray material, cast/receive shadow. Place ~4 on island at h>5. Good for detail. Optional but nice.

Palm positions: Choose 7 palms. For each, angle and radius chosen to be near shore/beach: r = R(θ) * (0.55..0.75) → h maybe 1.5-4. Actually island h at u=0.3: 11*0.3^1.5=1.8. Good beach. Use radius fraction 0.6-0.75 gives h between 1.5 and 3.0. Palms on lower slopes. Let's compute positions from angles: angles = [0.4, 1.3, 2.2, 3.3, 4.3, 5.2, 5.9] with radiusFactor [0.62, 0.7, 0.58, 0.72, 0.6, 0.66, 0.75]. Compute x = R*cos, z=R*sin, y = islandHeight. Ensure palms not colliding with boat region? Boat near angle 0.86 r 18.4, palms inside r<~12 so fine.

Palm height ~5-7; camera sees them.

Trunk: Build from segments using curve points. Let's create curve:
```
const leanDir = new THREE.Vector3(Math.cos(ang+0.6), 0, Math.sin(ang+0.6));
const top = new THREE.Vector3(base.x, base.y, base.z).add(new THREE.Vector3(leanDir.x*1.5, 6.2 + rand*0.8, leanDir.z*1.5));
const p0 = base;
const p1 = base.clone().add(new THREE.Vector3(0,2.2,0)).addScaledVector(leanDir,0.15);
const p2 = base.clone().add(new THREE.Vector3(0,4.3,0)).addScaledVector(leanDir,0.6);
const p3 = top;
const curve = new THREE.CatmullRomCurve3([p0,p1,p2,p3]);
```
Then trunk segments: for i 0..5, t0=i/6, t1=(i+1)/6, points curve.getPoint(t0), getPoint(t1). Cylinder between them:
```
const mid = a.clone().add(b).multiplyScalar(0.5);
const dir = b.clone().sub(a);
const len = dir.length();
const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, len, 8);
const mesh = new THREE.Mesh(geo, trunkMat);
mesh.position.copy(mid);
mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
```
radii: base 0.22 at t=0 to 0.10 at top: radiusBottom = lerp(0.24,0.10,t0), radiusTop = lerp(...t1). Note cylinder local Y from bottom to top; with quaternion aligning Y to dir upward. Good.

Crown at curve.getPoint(1) top. Add sphere (0.35) or a cluster of spheres. Use SphereGeometry(0.3) with brownish green.

Leaves instances data:
```
type LeafData = { crown: THREE.Vector3; yaw: number; droop: number; phase: number; scaleX: number; };
```
For each palm, leavesPerPalm = 8; yaw evenly spaced + random. droop around 0.35-0.75 rad (below horizontal). Scale 0.85-1.15.

Instance mesh count = palms.length * 8.

Each frame:
```
const dummy = new THREE.Object3D();
for each leaf:
  dummy.position.copy(crown);
  dummy.rotation.set(0, yaw, 0);
  dummy.rotateZ(-(droop + sway));
  dummy.scale.set(scaleX, 1, 1);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
leaves.instanceMatrix.needsUpdate = true;
```
Wait rotateZ after rotation.set(0,yaw,0): The rotation order default XYZ; setting rotation (0,yaw,0) then rotateZ modifies quaternion. `Object3D.rotateZ` applies local rotation; good. Then updateMatrix uses quaternion. Fine.

But droop: leaf plane is in XZ plane after geometry.rotateX(-PI/2) and has droop already built in (y decreasing with x²). Its base direction is +X. Rotating around local Z by -droop tilts +X downward? Rotation around Z by -droop: +X → (cos(-d), sin(-d), 0) = (cos d, -sin d) → downward. Yes.

Sway: droop varies ±0.12 sin(t*1.8 + phase). Also yaw sway ±0.1 sin(t*1.2+phase). Apply dummy.rotateY(swayYaw)? After yaw/droop, local Y rotation twists leaf. Could skip. Just droop sway.

Leaf geometry:
```
const leafGeo = new THREE.PlaneGeometry(2.6, 0.8, 10, 1);
leafGeo.rotateX(-Math.PI/2); // now in XZ, width along Z, length X
leafGeo.translate(1.3, 0, 0); // base at x=0
// modify positions: normalize x along 0..2.6
const p = leafGeo.getAttribute('position') as BufferAttribute;
for i:
  const x = p.getX(i);
  const t = x / 2.6;
  const taper = Math.sin(Math.PI * Math.min(t,1)) ** 0.55; // width
  p.setZ(i, p.getZ(i) * taper);
  p.setY(i, -0.55 * t * t + 0.08*Math.sin(t*Math.PI)); // droop curve
```
Hmm need check plane rotated: PlaneGeometry(width=2.6 along X, height=0.8 along Y) rotateX(-PI/2): Y becomes Z. So z in [-0.4,0.4]. Good. Then translate X by 1.3 → x in [0,2.6]. Taper by sin(pi*t)^0.55: at base t=0 → 0 width (pointy base), middle max, tip 0. Leaves look like fronds; fine but base should be narrow too. Actually palm fronds are wide in middle, narrow at tip; base attached. Good.

Droop: y = -0.5*t². Good.

Compute normals after modification: leafGeo.computeVertexNormals(). DoubleSide.

Material with color 0x2c7a2f? Slightly varied via instance colors? Use setColorAt each instance with varying green. Need material vertexColors? InstancedMesh instanceColor works with material that supports it (standard). Just call leaves.setColorAt(i, color) and instanceColor.needsUpdate = true. Good. Colors slight variation of green/orange. Use `new THREE.Color().setHSL(0.27 + rand*0.05, 0.55, 0.28 + rand*0.08)`.

DoubleSide shadows: shadows of DoubleSide planes are fine.

Palm crowns receive shadows? set receiveShadow true.

Now boat group construction:

```
const boat = new THREE.Group();
boat.position.set(12,0,14);
```
Hull: SphereGeometry(1, 32, 20, 0, Math.PI*2, Math.PI*0.5, Math.PI*0.5) → lower hemisphere? SphereGeometry parameters: radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength. thetaStart = PI/2, thetaLength = PI/2 gives bottom half (theta from equator to south pole) → y from 0 to -r. Good. Scale (1.05, 0.62, 2.0). Then hull bottom -0.62, length 4.0. Hull top at y=0.

Add a deck at y=0.02: BoxGeometry(1.9, 0.12, 3.4)? The hull at y=0 is a circle of radius 1 scaled x1.05,z2 → width 2.1, length 4.0. A deck box 1.7 x 0.10 x 3.2 fits, slightly inside. Color wood. Add a rim: Torus? maybe not.

Use a slightly larger flat top with a CylinderGeometry scaled? Let's use Box for deck; with rounded hull it looks fine.

Cabin: BoxGeometry(1.1,0.55,1.3) at y=0.36, z=-0.55. White/cream. Roof: BoxGeometry(1.2,0.1,1.4) at y=0.66. Windows: small dark boxes on sides (0.02 thick) maybe. Add portholes: CylinderGeometry small rotated Z 90. Might be extra. Keep simple: one dark strip BoxGeometry(1.12,0.18,1.32) at y=0.44 (window band) dark blue. Nice.

Mast: CylinderGeometry(0.045,0.06,3.4,8) at y=2.0? Mast base at deck y=0.1 → center y=0.1+1.7=1.8, top 3.5. Position z=0.55.

Boom: CylinderGeometry(0.04,0.04,2.0,8), rotateX(PI/2) to align along Z, at y=1.0, z=-0.55? Boom from mast at z=0.55 extending backward to z=-1.45: center z=-0.45, length 2.0. Good.

Main sail: PlaneGeometry(2.6, 2.5, 12, 12) modified into curved triangular-ish sail. Plane in XY; width 2.6 along X, height 2.5 along Y. We want sail vertical along Z, so rotateY(-PI/2)? Then X becomes -Z or +Z. Actually rotateY(PI/2): X axis → -Z? Rotation Y by +90°: x→(cos=0, 0, -sin=-1) so +X → -Z. So plane's width from -1.3..1.3 in X becomes z from +1.3..-1.3. We want width along Z. Fine, rotateY(Math.PI/2). Then taper: modify vertices before rotation: for each vertex with y (height), width factor = 1 - (y+1.25)/2.5? Actually sail should be wider at bottom, narrower top. Plane centered at origin: y ∈ [-1.25, 1.25]. Set x scale = 0.55 + 0.45 * (1 - (y+1.25)/2.5)= 0.55+0.45*(0.5 - y/2.5)... Let's define t = (y + 1.25)/2.5 ∈ [0,1] bottom→top; widthFactor = 0.6 + 0.4*(1-t) → bottom 1, top 0.6. Hmm a gaff sail roughly rectangular with slight taper. Add curvature (belly): z? After rotateY, belly in X? Let's do before rotation: x? The sail plane lies in XY with normal Z; belly bulges in Z as function of x,y. Set z = 0.25 * (1 - (2x/width)^2) * (0.5+0.5*...)? Actually plane has z=0; set z = 0.25*(1 - (x/1.3)^2) * (1 - t*0.5)? Bulge toward +Z. Then rotateY(PI/2) maps z to x? Hmm rotation maps +Z to +X. The sail normal becomes along X (sideways) which is correct for a sail (faces sideways). The bulge along +Z becomes +X. Good.

Maybe simpler: sail rectangular with slight curve, positioned behind mast. It's okay.

Sail position: center y=2.0 (from 0.75 to 3.25), z = 0.55 - 1.3 = -0.75? After rotateY(PI/2), width (2.6) spans z from +1.3 to -1.3; center at z=0. So position z = 0.55 - 1.3 = -0.75 to have sail extend from mast (z=0.55) backwards to -2.05? That's too long (boat length 4, z ∈ [-2,2]); sail back edge at z=-2.05 slightly beyond. Scale sail width 2.4 → half 1.2, center z = 0.55-1.2=-0.65, back edge -1.85. Good. Sail height 2.4, center y=1.85 → top 3.05, bottom 0.65.

Actually mast at z=0.55, sail from mast backward; sail's leading edge at z=0.55. Good.

Use a custom geometry from PlaneGeometry(2.4, 2.4, 10, 10) modified; then rotateY(PI/2). Sail material white double-side, roughness 0.9, slight emissive? no.

Maybe add a jib: a triangular sail from mast top to bow. Could use ConeGeometry flattened? Or another modified plane. Let's add using BufferGeometry triangle? Hmm. Keep main sail + optional small flag; enough.

Add flag at mast top: PlaneGeometry(0.3,0.5) red, positioned y=3.4, z=0.55, maybe rotates. Small.

Deck details: railing? Could add thin torus? Not necessary.

Life ring? A TorusGeometry(0.16,0.05) white/red on cabin side. Nice detail. Add simple.

Boat meshes castShadow and receiveShadow true.

Water shader should not cast shadows. Island castShadow true? It could cast shadows on itself/water (water doesn't receive). Island castShadow true maybe for self-shadow; set true, receiveShadow true. Shadow map covers island and boat, good. But island 70x70 plane with 16k verts casting shadows is fine.

Palm trunks and leaves castShadow true. Leaves receiveShadow maybe false (instanced with double side; fine).

Renderer setup:
```
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```
Style body margin 0 overflow hidden? The page has no other HTML. Set document.body.style.margin='0'; overflow hidden. Good.

Scene background? Sky dome covers. Set scene.background = new THREE.Color(fog color) just in case. Also scene.fog = new THREE.Fog(0xb8d9ec, 55, 260).

Camera lookAt after creation.

Lights:
```
const sun = new THREE.DirectionalLight(0xfff2d8, 3.0);
sun.position.copy(sunDir.clone().multiplyScalar(120));
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left = -45; right=45; top=45; bottom=-45; near=1; far=300;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun); scene.add(sun.target);
```
target at (0,0,0). Good.

Hemisphere: new THREE.HemisphereLight(0xbfe6ff, 0x3b4d2f, 0.6). Ambient: 0.12 maybe. Or hemisphere 0.8.

Tone mapping exposure: 1.0? Let's pick 0.95. With sun intensity 3 and ACES, whites may clip nicely. Sky colors custom; sun disk bright.

Sun color uniform for water matching 0xfff3d0.

Now ocean shader sun direction uniform: use normalized sunDir (same as light position normalized). Good.

Fresnel sky reflection color based on reflected ray. Since sky is custom gradient, match: mix(horizon, top).

One concern: the sky dome is centered at camera, radius 400; camera far 2000, fine; ocean 400 wide may extend outside sky dome? Sky dome is at camera radius 400, ocean max 200 from origin, camera at 50, farthest ocean ~250 < 400. So ocean inside sky. Good. Sky sphere radius 600 maybe to be safe. Use 600, camera far 3000.

The sky dome with BackSide: camera inside; draws inner surface. Position copy camera each frame. Good.

Fog: sky material fog false. scene.fog applies to island/boat/palms/water (water custom). Good.

Now strict TS details:

- `const clock = new THREE.Clock();` fine.
- `renderer.setAnimationLoop((time) => {...})` parameter `time: number` but XRFrameRequestCallback is (time: number, frame: XRFrame). Our callback `() => {}` is fine.
- Use `window.innerWidth` etc.

- `document.body.style.margin = '0'`; `document.body.style.overflow = 'hidden'`.

- Types for `(window as any).__ocean` fine.

- `const geometry = new THREE.PlaneGeometry(400, 400, 256, 256); geometry.rotateX(-Math.PI/2);`

Note: 256x256 segments = 257*257 = 66049 vertices, 131072 triangles. Fine.

- Shader strings using template literals.

- Water material uniforms values: THREE.Color objects, numbers, Vector3. Types IUniform.

- For instanced leaves, initial matrix update before first render (call updateLeaves(0)). Then loop updates.

- island group: `const island = new THREE.Group(); island.add(islandMesh); ...` expose as __island. islandMesh.receiveShadow = true. Also islandMesh.castShadow = true? Sure.

- Ensure island group doesn't have transform.

- Palm trees: need ensure positions above water. Compute islandHeight at chosen point; if <= 0.4, adjust radius factor or just place with y = max(h, 0.4)? Better choose positions known h>0.8. Use the formula: r = R(θ)*f with f 0.55-0.75 → u=0.25-0.45 → h=11*u^1.5 = 11*0.125=1.37 (f=0.75); at f=0.55 → u=0.45 → 11*0.302=3.32. Good, beach to lower grass. Use f in [0.5,0.72] and check.

Actually h = 11*(1-f)^1.5. f=0.72 → 11*0.28^1.5 = 11*0.148=1.63. f=0.5 → 11*0.5^1.5=3.89. Fine.

Also the noise terms shift h a bit.

For each palm also set trunk base y slightly above h (e.g., base.y = h + 0.05).

- Palm crown sphere maybe merge into trunk? Add sphere mesh per palm (6).

- Palm leaves instanced mesh added to island group? InstancedMesh matrices are in local coords (group identity). If added to island group (identity), fine. Expose __leaves.

- update leaves every frame; need keep references.

- Boat pitch/roll clamp values: `THREE.MathUtils.clamp`.

- Note: `heightAt` for boat includes waves; the sample at front/back must use the same t. Compute each frame.

Let's also add subtle bobbing yaw with t? Keep yaw slowly changing slightly: yaw = 2.35 + 0.12*Math.sin(t*0.11). Fine. Drift small.

But requirement "Every frame its height follows the water: y = heightAt(x, z, time()) plus a constant offset". So `boat.position.y = oceanHeight(boatX, boatZ, t) + 0.35`. Yes.

Now let's consider visual quality further: Add clouds? Not required. Could add a few soft cloud sprites? No textures allowed; we could add flattened spheres white with transparent material? Might look bad. Skip. Sky gradient + sun is fine.

Add distant rocks? maybe.

Add birds? no.

Foam: improve crest foam using height and slope? Fine.

Maybe add "sun glitter" broader.

Add water edge fade? The plane edge at 200 might be visible beyond fog if fog not complete. Fog far 260, distance from camera to far edge up to ~300; fully fogged at 260. Set fog near 40, far 240 to be safe. Sky horizon color equals fog color. Water at horizon blends into fog color, sky horizon color same → seamless. Good.

But note: fog on the sky dome is disabled; sky near horizon shows horizon color exactly. Good.

Set fog color 0xB9D6E8 and sky horizon same 0xB9D6E8. Sky top 0x2E6FB5. 

Sun disk color warm.

Tone mapping ACES will darken horizon a bit; fine.

Water shallow color maybe 0x2FA8A0; deep 0x072F42. Under ACES and sun lighting (water shader not lit by light automatically, but we add sun spec), water may look dark. Fresnel sky reflection will brighten grazing angles; from camera at 12 height looking outward, most water is at grazing angle → strong sky reflection → bright blue. Good.

At near distance below camera, fresnel smaller → deep color. Okay.

Let's set fresnel power 5 and base mix 0.06 → strong reflection at horizon. Use `fres = pow(1 - dot(N,V), 5.0); vec3 col = mix(base, skyRefl, clamp(0.04 + fres*0.96, 0.0, 1.0));` Good.

Add wave height color variation: crests lighter/turquoise: `base += vec3(0.03,0.10,0.10) * smoothstep(-0.2,0.9,vHeight);`

Foam color white-blue.

Sun spec: `pow(max(dot(R, uSunDir),0), 300) * 4.0` plus broad `pow(..., 30)*0.4`. With sun near 28° elevation, reflection vector near water surface points toward sun only at certain slopes; gives sparkles. Good.

The spec dot with R should be positive only when sun reflection aligns. Add sun color.

Add a subtle "sun path glitter" using noise: multiply spec with a noise function to break up. Fine.

Implement noise in glsl: simple hash/sin. Keep simple.

Water opacity? opaque.

One more: water plane normals and shading—ShadingMaterial with custom shader; no shadow receive. Fine.

Now code the whole file.

Let's think about strict TS type issues with `THREE.MathUtils` etc. All fine.

`const waterUniforms: { [key: string]: THREE.IUniform } = { ... }`; then `uTime: { value: 0 }`. Fine.

Material creation with uniforms. Later `waterUniforms.uTime.value = waveTime;`. Since typed as IUniform, value is any. Fine.

ShaderMaterial uniforms expects `{ [uniform: string]: IUniform }`. Passing our object works.

Sky material uniforms typed similarly.

Sky: 
```
const skyGeo = new THREE.SphereGeometry(600, 48, 24);
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uSunDir: {value: sunDir.clone()}, uSunColor: {value: new THREE.Color(0xfff0c9)}, uSkyTop: {value: new THREE.Color(0x2e6fb5)}, uSkyHorizon: {value: new THREE.Color(0xb9d6e8)} },
  vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.frustumCulled = false;
scene.add(sky);
```
Sky vertex: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }` Since sky position copied to camera, modelViewMatrix includes translation → gl_Position correct. vDir uses local position normalized = direction from center (camera). Good.

Sky fragment:
```
varying vec3 vDir;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  float g = pow(h, 0.45);
  vec3 col = mix(uSkyHorizon, uSkyTop, g);
  // horizon glow
  col = mix(col, vec3(0.72, 0.83, 0.92), exp(-max(d.y,0.0)*14.0)*0.35);
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sd, 1200.0) * 8.0;
  col += uSunColor * pow(sd, 60.0) * 0.35;
  col += uSunColor * pow(sd, 8.0) * 0.12;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Note `vec3(0.72,0.83,0.92)` is interpreted as linear? In shader literal treated linear; fine-ish; maybe use horizon color mix. Use `col = mix(col, uSkyHorizon * 1.15, exp(-max(d.y,0.0)*14.0)*0.5);` simpler.

For below horizon (d.y<0), clamp to horizon color; sky sphere lower half visible? Ocean covers, but beyond ocean edge maybe. `h = clamp(d.y, 0.0, 1.0)` so below horizon = horizon color. Good.

Ensure sky renders: with depthWrite false but depthTest true; if drawn after water, sky fragments where ocean already drawn fail depth test (ocean closer). Fine. But sky's depth value? Sky writes no depth; depthTest uses existing depth buffer. Good. If sky drawn first, everything draws over it. Fine.

Need sky renderOrder? Not needed.

Add `renderer.autoClear` default.

Now shadow map and island/boat. MeshStandardMaterial vertexColors on island: `new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 })`. Three will use color attribute. Good.

Note: island geometry has vertex color attribute named 'color'; material vertexColors true.

Potential issue: `PlaneGeometry` color attribute creation after normals; fine.

Also water and sky ShaderMaterial with `#include <tonemapping_fragment>` may fail compile if tone mapping defines absent but chunk exists? The chunk `tonemapping_fragment`:
```
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
So safe even without define. `colorspace_fragment`:
```
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
`linearToOutputTexel` is provided by `colorspace_pars_fragment` automatically prepended for all materials? Let's verify: In WebGLProgram, prefixFragment includes:
```
parameters.outputColorSpace !== ... ? '...' 
```
Actually in recent three, ShaderChunk.colorspace_pars_fragment is included in the prefix for all non-raw shaders? Let me recall three r160 WebGLProgram.js:

```
prefixFragment = [
  customExtensions,
  generatePrecision(parameters),
  '#define SHADER_TYPE ' + parameters.shaderType,
  '#define SHADER_NAME ' + parameters.shaderName,
  customDefines,
  parameters.useFog && parameters.fog ? '#define USE_FOG' : '',
  ...
  parameters.toneMapping !== NoToneMapping ? '#define TONE_MAPPING' : '',
  parameters.toneMapping !== NoToneMapping ? ShaderChunk['tonemapping_pars_fragment'] : '',
  parameters.toneMapping !== NoToneMapping ? getToneMappingFunction('toneMapping', parameters.toneMapping) : '',
  parameters.dithering ? '#define DITHERING' : '',
  parameters.opaque ? '#define OPAQUE' : '',
  ShaderChunk['colorspace_pars_fragment'],
  getTexelEncodingFunction('linearToOutputTexel', parameters.outputColorSpace),
  ...
]
```
Yes, colorspace_pars_fragment and linearToOutputTexel are always included. Good. So using `#include <colorspace_fragment>` at end works.

But wait: if we include tonemapping_fragment, need `gl_FragColor` defined; yes.

Set `material.toneMapped = true` default.

One subtlety: For ShaderMaterial, the renderer sets `parameters.toneMapping` based on material.toneMapped? In WebGLPrograms.getParameters: `toneMapping: material.toneMapped ? renderer.toneMapping : NoToneMapping`. Yes.

Now animation:

```
let waveTime = 0;
let ready = false;

const boatState = { yaw: 2.35 };

const dummy = new THREE.Object3D();
const tmpV = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  waveTime = t;
  waterUniforms.uTime.value = t;
  sky.position.copy(camera.position);

  // boat drift
  const bx = 12 + 0.8 * Math.sin(t * 0.09);
  const bz = 14 + 0.8 * Math.cos(t * 0.07);
  const yaw = 2.35 + 0.12 * Math.sin(t * 0.11);
  const h = oceanHeight(bx, bz, t);
  boat.position.set(bx, h + 0.35, bz);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const d = 1.7;
  const hF = oceanHeight(bx + fx*d, bz + fz*d, t);
  const hB = oceanHeight(bx - fx*d, bz - fz*d, t);
  const hR = oceanHeight(bx + rx*1.0, bz + rz*1.0, t);
  const hL = oceanHeight(bx - rx*1.0, bz - rz*1.0, t);
  const pitch = -Math.atan2(hF - hB, 2*d);
  const roll = Math.atan2(hR - hL, 2.0);
  boat.rotation.set(THREE.MathUtils.clamp(pitch, -0.18, 0.18), yaw, THREE.MathUtils.clamp(roll, -0.22, 0.22), 'YXZ');
```
Careful: rotation.set(x,y,z,order). With order 'YXZ'. `boat.rotation.set(pitch, yaw, roll, 'YXZ')`. Good.

Wait requirement: boat's pitch and roll follow wave slope. Fine.

Update leaves:
```
for (let i = 0; i < leafData.length; i++) {
  const L = leafData[i];
  const sway = Math.sin(t * 1.6 + L.phase) * 0.09 + Math.sin(t*0.7+L.phase*1.7)*0.04;
  dummy.position.copy(L.crown);
  dummy.rotation.set(0, L.yaw + Math.sin(t*1.1+L.phase)*0.05, 0);
  dummy.rotateZ(-(L.droop + sway));
  dummy.scale.set(L.scaleX, L.scaleX * 0.9, 1.0); // scale y irrelevant; maybe width along z scaling 1
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```
Hmm scale: geometry leaf length along X 2.6; scale x scales length. Width along Z 0.8; scale z. Set dummy.scale.set(L.scale, 1, L.widthScale). Store widthScale ~0.8-1.2. Simpler store scaleX and scaleZ. Fine. Maybe scaleY 1.

Also update leaves count? All good.

Note dummy.rotation.set(...) uses Euler order XYZ default; then rotateZ applies local. Actually after setting rotation (0, yaw, 0) and calling rotateZ, the resulting quaternion = q * qz where q is yaw. So local Z rotation after yaw → tilt in leaf plane. Correct.

First frame update leaves before render: call updateLeaves(0) function defined. We can implement a function updateLeaves(t: number) and call once before loop, then each loop.

Also ensure `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

Boat drift max radius: base (12,14) + 0.8 → max 18.4? (12.8,14.8)=19.55; min (11.2,13.2)=17.3. Safe vs island R at angle up to ~17 maybe? Let's check island R at angles around atan2(13.2,11.2)=0.867 and atan2(14.8,12.8)=0.858. R(0.86)=16.58 (calculated). Boat min radius 17.3 > 16.58. clearance 0.7. Waves ±1 might visually wash shore but boat not on land. Good.

But island shore at 16.58 with water waves; boat at 17.3, 0.7 away. That is very close, maybe boat visually touches beach at wave trough. Could reduce island R slightly or shift boat base outward? Requirement says about (12,0,14), so keep. Reduce island base radius to 15? Then max diameter ~34? Let's compute base 15, variation 1.5,0.8: max 17.3, at boat angle 15.58. Boat min 17.3 — equal to max but at boat angle 15.58 → clearance 1.7. Island diameter max 34.6, within 30-50. Good. Set R = 15 + 1.5 sin(3θ+0.7) + 0.8 cos(5θ+2.1). Peak same. Width at shore varies 12.7-17.3 radius → diameter 25.4-34.6. "about 30 to 50" — mostly ~30. Hmm max 34.6, min 25.4. Average 30. Acceptable "about 30 to 50 across". Let's maybe use 15.5 base + 1.6 + 0.9 → max 18, min 13; at boat angle 15.5? compute: 15.5+1.6*(-0.144)+0.9*0.99=15.5-0.23+0.89=16.16. Boat min 17.3 clearance 1.14. Diameter max 36, min 26. Good, average ~31. Use this.

R(θ) = 15.5 + 1.6*sin(3θ+0.7) + 0.9*cos(5θ+2.1).

Peak: h = 11 * pow(1 - r/R, 1.5) with noise. Wait at r=0 h=11. Good.

Now palm positions at f=0.5-0.72 of R ~ 8-13 units radius. Boat at 17+, so clear.

Need island geometry extends to ±35 (70x70) to cover underwater slope; good.

Note: island plane y displacement below water; parts outside R go to -0.4 - (r-R)*0.15, at r=35 → -0.4-19*0.15=-3.25. Fine.

But the mesh is a square plane; corners at r=49.5, y=-5.5. Under water (opaque). Fine.

However, the water is opaque so island underwater parts hidden. Good.

Also island mesh edges might poke above water due to noise? No, r>=R h negative.

Now vertex color for below 0: wet sand darker; hidden.

We should ensure island normals smooth: computeVertexNormals after displacement. Edge vertices may have weird normals; fine.

Now boat sail geometry modification function:

```
function makeSailGeometry(width: number, height: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(width, height, 16, 16);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + height*0.5) / height; // 0 bottom, 1 top
    const w = 0.55 + 0.45 * (1 - t);
    pos.setX(i, x * w);
    const belly = Math.cos((x / (width*0.5)) * Math.PI * 0.5); // 1 center, 0 edges
    pos.setZ(i, belly * 0.22 * (1 - t*0.4));
  }
  g.computeVertexNormals();
  g.rotateY(Math.PI * 0.5);
  return g;
}
```
Wait x range after w scaling; belly uses original x. fine. y position center offset later.

Also taper top to a point? w at top 0.55, not pointy. A gaff sail fine.

Sail mesh position: `sail.position.set(0, 0.75 + height/2, 0.55 - width/2)`? Since rotated Y, plane's local width along -Z? With rotateY(PI/2), the x axis becomes -Z. The plane x from -1.2..1.2 → z from +1.2..-1.2. So leading edge is z = +1.2 local. To have leading edge at mast z=0.55, position z = 0.55 - 1.2 = -0.65. Yes.

Add a slight rotation on sail? Maybe rotate around Y small angle to mimic wind: `sail.rotation.y = 0.08` (after geometry rotation) around mast? Rotating the mesh would offset from mast. Keep 0.

Jib: maybe add a second sail triangle using ConeGeometry? Let's add a small jib using a modified plane too, but "mast and sail" satisfied with main sail. Fine.

Flag: small plane red at mast top. Could be nice. Add.

Boat materials:
- hull: MeshStandardMaterial color 0xf4efe6, roughness 0.5, metalness 0.05.
- deck: 0x9c6b3f wood, roughness 0.8.
- cabin: 0xf7f3ea; roof 0x7a4a2a; windows 0x2b4b5c (metalness 0.4).
- mast/boom: 0x6b4a2f.
- sail: 0xfaf7ef, DoubleSide, roughness 0.9.
- flag: 0xd8402f.
- ring: 0xff5722? life ring white/red via torus.

Add portholes: two small cylinders on cabin sides. Not necessary.

Boat group children count >3, fine.

Set boat.position (12,0,14) initially; loop sets.

Shadows: traverse boat children: castShadow = true, receiveShadow = true. For DoubleSide sail, shadow fine.

Now performance: 256x256 ocean, 2048 shadows, 16k island. Fine.

Let's write the code.

Detailed shader code generation:

```
function f(n: number): string { return n.toFixed(6); }

const waveDisplaceCode = WAVES.map(w => {
  const k = (Math.PI * 2) / w.len;
  const omega = k * w.speed;
  return `
  ph = ${f(k)} * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(omega)} * t;
  {
    float s = sin(ph);
    float c = cos(ph);
    o.y += ${f(w.amp)} * s;
    o.x += ${f(w.steep * w.amp * w.dx)} * c;
    o.z += ${f(w.steep * w.amp * w.dz)} * c;
  }`;
}).join('\n');
```
Need declare `float ph;` once before. 

Normal code:
```
const waveNormalCode = WAVES.map(w => {
  const k = ...;
  const omega=...;
  return `
  ph = ${f(k)} * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(omega)} * t;
  {
    float c = cos(ph);
    g.x += ${f(w.amp * k * w.dx)} * c;
    g.y += ${f(w.amp * k * w.dz)} * c;
  }`;
}).join('\n');
```

Need `float ph;` declared in each function. Fine.

The height function in JS uses same k, omega, amp. Good.

Note: normal computed from height gradient, not including steep horizontal. Acceptable.

Water vertex shader:
```
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vHeight;
varying vec2 vXZ;

vec3 gerstner(vec2 p, float t) {...}
vec3 waveNormal(vec2 p, float t) {...}

void main() {
  vec2 p = position.xz;
  vec3 d = gerstner(p, uTime);
  vec3 wp = vec3(position.x + d.x, d.y, position.z + d.z);
  vec4 world = modelMatrix * vec4(wp, 1.0);
  vWorldPos = world.xyz;
  vec3 n = waveNormal(p, uTime);
  vWorldNormal = normalize(mat3(modelMatrix) * n);
  vHeight = d.y;
  vXZ = p;
  gl_Position = projectionMatrix * viewMatrix * world;
}
```
Note position.xz from plane rotated: position.y=0, position.z. Good.

Fragment shader:
```
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vHeight;
varying vec2 vXZ;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, N);

  float skyT = smoothstep(-0.08, 0.65, R.y);
  vec3 skyCol = mix(uSkyHorizon, uSkyTop, skyT);

  float r = length(vXZ);
  float theta = atan(vXZ.y, vXZ.x);
  float shoreR = 15.5 + 1.6 * sin(3.0 * theta + 0.7) + 0.9 * cos(5.0 * theta + 2.1);
  float shallow = 1.0 - smoothstep(shoreR, shoreR + 16.0, r);

  vec3 base = mix(uDeepColor, uShallowColor, shallow);
  float crest = smoothstep(0.05, 0.95, vHeight);
  base = mix(base, base * 1.5 + vec3(0.02, 0.06, 0.06), crest * 0.6);

  vec3 col = mix(base, skyCol, clamp(0.02 + fres * 0.98, 0.0, 1.0));

  float spec = pow(max(dot(R, uSunDir), 0.0), 260.0);
  float broad = pow(max(dot(R, uSunDir), 0.0), 24.0);
  col += uSunColor * (spec * 5.0 + broad * 0.18);

  // sparkle
  float sparkNoise = 0.55 + 0.45 * sin(vXZ.x * 7.0 + uTime * 2.3) * sin(vXZ.y * 6.0 - uTime * 1.7);
  col += uSunColor * spec * sparkNoise * 3.0;

  // foam
  float crestFoam = smoothstep(0.55, 0.95, vHeight) * (0.5 + 0.5 * sin(vXZ.x * 2.1 + uTime * 1.7) * sin(vXZ.y * 1.9 - uTime * 1.3));
  float d = r - shoreR;
  float shoreFoam = exp(-pow((d - 0.8) / 1.6, 2.0));
  shoreFoam *= 0.55 + 0.45 * sin(d * 4.0 - uTime * 2.0);
  float foam = clamp(crestFoam * 0.8 + shoreFoam * 0.9, 0.0, 1.0);
  col = mix(col, uFoamColor, foam * 0.85);

  float dist = length(cameraPosition - vWorldPos);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Wait crest smoothstep(0.55,0.95,vHeight) where vHeight max ~0.94; good. shoreFoam exp should be band outside shore; at d=0.8 max; for d negative (inside land) still foam (hidden under island? the water plane is at wave height, island above; foam may show on water over land? Water plane intersects island; the island covers it. But water plane at y ~ wave height can be above island beach? Island shoreline slopes; water waves can be above low land near shore; the foam over land area looks like waves washing up — fine, but water plane is a single surface; where land is higher it hides. Where land is lower, water shows. Near shore, water surface may be above sand for a bit — wave wash. Fine.)

Actually water plane is opaque and covers the entire 400x400; where island height > water height, island pokes through. Where island below water, water surface above. Shoreline visually is intersection. Good. So foam band around shore is fine.

But the island mesh at r>R drops to -0.4 quickly; so water covers. Good.

Add slight foam at the very shore using d = r-shoreR; exp band 0.8 gives foam from d=-2 to 3; inside land it's hidden mostly.

Now ocean color uniforms: deep 0x062a3c, shallow 0x1b9e9e. Foam 0xe8f6f7. uSunColor 0xfff2cf. uSkyTop 0x2e6fb5, horizon 0xb9d6e8. Fog same horizon 0xb9d6e8. Note uniform colors are linear.

Tone mapping exposure 0.85 maybe. Since our sky shader outputs values up to 8 for sun; with ACES exposure 0.85, sun disk white. Sky colors linear values ~0.04 for top blue? 0x2e6fb5 → sRGB (46,111,181) → linear (0.027, 0.16, 0.46). ACES with exposure 0.85 maps 0.46 → ~0.55 maybe, then sRGB encode → bright sky. Okay.

Actually with ACES exposure 1.0, sky zenith linear 0.46 → ACES ~0.6 → sRGB ~0.8 → nice blue. Good. Use exposure 1.0. Sun intensity 3.0 with ACES might blow out whites slightly; fine.

Hmm ACES tonemapping tends to desaturate; we can boost colors. Fine.

Let's set `renderer.toneMappingExposure = 1.0`.

Water spec *5 might blow to white sparkles; nice.

Now island colors: Need colors in linear (Color handles). Set Hex.

Color assignment:
```
function colorForIsland(x: number, z: number, h: number, out: THREE.Color) {
  const n = Math.sin(x*2.3+z*3.1)*0.5 + Math.cos(x*4.7-z*1.9)*0.5; // -1..1
  const n01 = n*0.5+0.5;
  const wet = 0xb9a77e;
  const sand = 0xead9a8;
  const grassDark = 0x356b2e;
  const grassLight = 0x6da34a;
  const rock = 0x827a68;
  if (h < 0.9) {
    out.setHex(wet).lerp(new THREE.Color(sand), THREE.MathUtils.clamp(h/0.9,0,1));
  } else if (h < 3.2) {
    const t = (h-0.9)/2.3;
    out.setHex(sand).lerp(new THREE.Color(grassDark), t*t);
  } else if (h < 8.0) {
    const t = (h-3.2)/4.8;
    out.setHex(grassDark).lerp(new THREE.Color(grassLight), t*0.8 + n01*0.2);
  } else {
    const t = THREE.MathUtils.clamp((h-8)/4,0,1);
    out.setHex(grassLight).lerp(new THREE.Color(rock), t);
  }
  out.multiplyScalar(0.94 + 0.12*n01);
}
```
Creating new THREE.Color per vertex is okay for 16k but slow-ish; precompute constants outside. Use module-level color constants. Better.

Also beach sand should extend a bit above water: h<1.1. Fine.

Maybe the island's top is rock; peak 12 → rock; good.

Let's define `const SAND = new THREE.Color(0xead9a8);` etc.

But careful: setting color via `.setHex` then `.lerp` modifies; need out.copy(base). Implement with static temp? Use out.copy(c).lerp(c2,t). Good.

Now Palm trunk materials: brown 0x7a5a3a roughness 0.9. Crown sphere material 0x4a6b2a. Leaves material green.

Coconuts maybe skip.

Rocks: create 5 rocks with DodecahedronGeometry(0.5..1.2) at random positions on island near peak. Could be nice—use MeshStandardMaterial 0x6f6a5e roughness 0.95. cast/receive shadow. Add to island group. Deterministic positions.

Ensure rocks sit on island: y = islandHeight(x,z) + radius*0.2 or slightly. Use islandHeight + 0.2*scale. Good.

Now island group also has leaves. Expose __leaves directly.

Boat sails: white; maybe an orange stripe on hull? Use a thin box? Let's add a colored stripe along the hull? A Torus? Could add a red waterline stripe using a slightly larger scaled sphere bottom? Not necessary.

Let's maybe add a small red pennant flag at top. Good.

Now let's think about camera view: camera (35,12,35) looking at (0,2,0). Boat at (12, ~1, 14) distance from camera sqrt(23²+23²+~11²)=34.5. Boat 4 units long → occupies decent size. Island radius 15.5 centered; visible behind. Sun position (-0.62,0.47,0.62) i.e. upper-left-behind? From camera looking towards (-X,-Z). Sun direction is (-X,+Z) — that is to the left and somewhat behind the island? Actually relative to camera: camera forward = normalize(0-35, 2-12, 0-35) = (-0.71, -0.2, -0.71). Sun dir (-0.62,0.47,0.62). Dot with forward = 0.44 -0.094 -0.44 = -0.09 → sun slightly behind camera (or near perpendicular). It'll appear high to the left. Good. Water specular: reflection direction needs to align with sun; since sun behind camera, the specular would be toward camera? Specular highlight appears where reflection points to sun; with sun behind camera, the highlight visible in front of camera on water. Good.

Maybe choose azimuth 135° and elevation 30°. sunDir = (-0.612, 0.5, 0.612). Fine.

Sky horizon color and fog 0xb9d6e8.

Add subtle ambient 0.1.

Now, one thing: the sky dome is centered at camera each frame. The water fog to horizon and sky horizon color match. But at the horizon, the water plane's edge at 200 is fogged to 0xb9d6e8; sky at horizon is 0xb9d6e8 (with tone mapping applied both) → match. Good.

DirectionalLight target: scene.add(sun.target); target position default 0. Good.

Shadow camera at sun position: sun at (-0.612*130, 0.5*130, 0.612*130) = (-79.5, 65, 79.5). Direction to origin. Shadow camera ortho ±45, near 1, far 300: distance from light to origin = 130, so near/far around 100-160; set near 20 far 300. Fine. The island radius 35? Island mesh plane 70 → but only ±18 is above water; shadows only need above-water ±20 plus boat at (12,14). Ortho ±45 covers. Good.

Set sun.shadow.camera.near = 10; far = 300; left/right/top/bottom ±45.

Now shadow bias: -0.0003, normalBias 0.03.

Water not receiving shadows (custom shader). The island and boat shadows fall on themselves; boat shadow on water absent. Could add a fake shadow blob under boat? Water shader could receive shadows only with complex code. Not required. But boat floating without shadow on water is okay for stylized. Shadows requirement: sun casts shadows; boat meshes cast shadows; island receives shadows. Island receives its own/palms shadows. Good.

To make palm shadows on island visible, leaves castShadow true, island receiveShadow true. Good.

Potential issue: InstancedMesh castShadow with double-sided leaves and alpha? No alpha; fine.

Now implement.

Let's write the file with all functions.

Need to be careful about TS strict: 
- No implicit any. e.g., `WAVES.map((w) => ...)` typed.
- Function parameters typed.
- `const colors = new Float32Array(count * 3);` index assignment fine.
- `geometry.getAttribute('position') as THREE.BufferAttribute` fine.
- `new THREE.InstancedMesh(leafGeo, leafMat, leafData.length)` created after leafData built. But leafData requires palms built. Order: build island mesh, palms (positions/trunks/crowns), collect leaf data, then create leaves InstancedMesh. Fine.
- To compute palm positions, need islandHeight and shoreR functions.

Define:
```
function islandShoreRadius(theta: number): number {
  return 15.5 + 1.6*Math.sin(3*theta + 0.7) + 0.9*Math.cos(5*theta + 2.1);
}
```

islandHeight:
```
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const R = islandShoreRadius(theta);
  if (r >= R) return -0.4 - (r - R) * 0.16;
  const u = 1 - r / R;
  let h = 11 * Math.pow(u, 1.5);
  h += 1.2 * Math.sin(x*0.35 + 1.3) * Math.cos(z*0.31 - 0.7) * u * u;
  h += 0.35 * Math.sin(x*1.1 + 0.4) * Math.sin(z*0.9 - 1.2) * u;
  return h;
}
```
At r=0, theta = 0 (atan2(0,0)=0), u=1, h=11 + 1.2*sin(1.3)*cos(-0.7)=11+0.884 + 0.35*sin(0.4)*sin(-1.2)=0.35*0.389*(-0.932)=-0.127 → 11.76. Good.

Palm placement: choose f values so y > 0.6. Use precomputed angle/fraction arrays and compute x,z; then y = islandHeight(x,z). If y < 0.5, maybe skip? Better ensure f<=0.7 → h ≈ 11*0.3^1.5=1.8. Good. Use f between 0.52 and 0.7.

7 palms:
angles: 0.3, 1.15, 2.05, 2.9, 3.85, 4.7, 5.55
fractions: 0.62, 0.55, 0.68, 0.58, 0.64, 0.52, 0.70
Compute R = islandShoreRadius(angle); x = R*f*cos(angle), z = R*f*sin(angle); y = islandHeight(x,z) (could be slightly different because R uses theta and x,z radius = R*f; consistent). Good.

Check boat direction angle 0.86: palm at 0.3 and 1.15 nearby inside radius ~10; no conflict.

Palm heights: 6.0 + 0.6*randomish. Use deterministic `0.6*Math.sin(i*2.1)`.

Trunk segments count 6. Trunk radii base 0.22 top 0.09.

Crown at top point.

Leaf count per palm 9 → 63 instances ≥30. Each leaf yaw = angle * 2π/9 + offset; droop = 0.35 + 0.25*random. scale 0.75-1.15.

Let's structure.

```
const palms: { base: THREE.Vector3; top: THREE.Vector3 }[] = [];
for i...
  const base = new THREE.Vector3(x, y+0.1, z);
  const top = base.clone().add(new THREE.Vector3(leanX, 6.2 + ..., leanZ));
  // build trunk segments
  ...
  palms.push({ base, top });
```
But leaf crown needs top. Actually top computed from curve.getPoint(1). Build curve with points; get top = curve.getPoint(1). Good.

Trunk segment cylinders added to islandGroup with castShadow true receiveShadow true.

Crown sphere at top: `const crown = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), crownMat); crown.position.copy(top);` add.

Leaves data for each palm: crown = top.clone() maybe slight offset y+0.1.

Now leaf geometry's base at origin; crown position on island. Good.

Note leaf plane has vertex droop built-in; but at base y=0. Good.

Add a slight vertical offset for leaf attachment: top.y + 0.05.

Now `updateLeaves(t)` loops.

We must call updateLeaves before first render or in loop (first loop handles). Since setAnimationLoop begins immediately, first frame renders after update. Fine.

The instanced mesh initial matrices before first update? We'll call updateLeaves(0) after creation to set matrices; then loop updates. Actually instance matrices default identity (all leaves at origin) until first frame; but first frame loop updates before render. Fine either way. Call updateLeaves(0) for safety.

Now potential strict issue: `dummy.rotation.set(0, yaw, 0); dummy.rotateZ(...)` fine.

`leaves.setColorAt(i, color)` requires instanceColor initialized; setColorAt creates if null. Good. Then `leaves.instanceColor!.needsUpdate = true;` Since strict, instanceColor possibly null; after setColorAt it exists. Use `if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;`. Similarly instanceMatrix typed non-null? `leaves.instanceMatrix.needsUpdate = true` — instanceMatrix is InstancedBufferAttribute, not nullable. Fine.

Need `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);` after creation.

Now rendering loop uses `boat`, `leaves`, etc. in closure.

Set `(window as any).__ready = true` only once after first render. Use a boolean.

```
if (!readyFlag) {
  readyFlag = true;
  (window as any).__ready = true;
}
```
After renderer.render.

Now let's write it all.

One more detail: requirement "Ocean at least 400x400 centered on origin." Plane 400x400 centered origin. Good.

"camera at exactly (35,12,35) looking at (0,2,0)". We set camera.position.set(35,12,35); camera.lookAt(0,2,0). Ensure not OrbitControls. Good. But note lookAt is called once; camera matrix updates on render. Good.

Potential issue: camera lookAt then later no changes. Fine.

Now the sun's position must match sky's sun direction: both from sunDir computed. Sky uniform uSunDir = sunDir. DirectionalLight position = sunDir * 130. Good.

Compute sunDir:
```
const elevation = THREE.MathUtils.degToRad(28);
const azimuth = THREE.MathUtils.degToRad(135);
const sunDir = new THREE.Vector3(
  Math.cos(elevation) * Math.cos(azimuth),
  Math.sin(elevation),
  Math.cos(elevation) * Math.sin(azimuth)
).normalize();
```
Wait azimuth standard: x = cos(az)*cos(el), z = sin(az)*cos(el). At 135°, x=-0.62, z=0.62. Good.

Sun disk visible in sky at that direction.

