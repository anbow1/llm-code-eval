I need to build a complete single-file TypeScript Three.js scene: ocean with shader waves, boat floating on waves, procedural island with palm trees (instanced leaves), sky, sun with shadows, fog, tone mapping.

Let me plan carefully.

**Ocean shader**: Use a custom ShaderMaterial with Gerstner waves (sum of ~5 waves). Plane 400x400, 256x256 segments, rotated -PI/2. Vertex shader displaces y and xz (Gerstner horizontal shift). Compute normal analytically or via partial derivatives of the wave sum. Fragment shader: deep/shallow color based on... maybe height/fresnel, sky color fresnel reflection, sun specular (Blinn-Phong), foam near crests (based on wave height / steepness) and shore foam (distance from origin < ~30 → foam near island based on depth... I can use a "depth" approximation: foam where water height near shore and near island radius). Simpler: foam based on crest height + a noise-ish factor, and shore foam based on world position radius (island at origin with radius ~25). Compute shore factor = smoothstep based on distance from origin relative to island slope.

Need to export heightAt matching shader: implement Gerstner displacement function in JS. For Gerstner, vertical displacement at undisplaced (x,z) — the prompt says "for Gerstner waves ignore the small horizontal shift", so heightAt(x,z,t) = sum of Ai * sin(dot(D,(x,z))*k + t*ω + phi) (the y component evaluated at undisplaced position). But the shader displaces y as function of undisplaced position too (Gerstner: y = A*sin(dot(D,P)*k + φ) where P is undisplaced). So JS matches: y-displacement at undisplaced (x,z). Good — shader y = sum A*sin(dot(D, xz)*k + t*w + phase). And horizontal offset shifts xz. So heightAt matches shader's y given undisplaced coordinates. The boat samples heightAt(x,z,t) — small mismatch due to horizontal shift but acceptable per spec.

Let me define waves:

```ts
const WAVES = [
  { dirX: 1.0, dirZ: 0.3, amp: 0.45, wavelength: 24.0, speed: 5.0 },
  { dirX: -0.7, dirZ: 1.0, amp: 0.32, wavelength: 14.0, speed: 4.0 },
  { dirX: 0.3, dirZ: -1.0, amp: 0.22, wavelength: 8.0, speed: 3.2 },
  { dirX: 1.0, dirZ: -0.6, amp: 0.15, wavelength: 5.0, speed: 2.5 },
  { dirX: -1.0, dirZ: -0.2, amp: 0.1, wavelength: 3.2, speed: 2.0 },
];
```

Crest-to-trough total ~ 2*(0.45+0.32+0.22+0.15+0.1) = 2.48 — a bit high; requirement 0.5 to 2. Reduce amps: 0.35, 0.25, 0.18, 0.12, 0.08 → sum 0.98, trough-crest ~1.96. OK, within 2. Good.

For each wave: k = 2π/wavelength, ω = speed * k (phase speed). Direction normalized.

Gerstner with steepness Q: horizontal displacement xy -= D * A * Q * cos(...)? Standard: 
P.x += D.x * (Q*A*cos(θ)), P.z += D.z*(Q*A*cos θ), P.y = A*sin(θ), θ = dot(D, P.xz)*k + t*ω.

But to keep heightAt matching shader y exactly, shader computes y from undisplaced xz: y = Σ A*sin(dot(D,xz)*k + t*ω + φ). Then horizontal displacement uses same θ. Fine.

Normal computation in vertex shader: compute partial derivatives analytically. With Gerstner horizontal displacement, proper normals require chain rule; common approach: compute derivative of y with respect to undisplaced x,z and approximate, or do full Gerstner normal math. I'll do a decent approximation: compute tangent/binormal using derivatives including horizontal terms. Actually standard GPU Gems formulation:

For Gerstner with position displacement, normal:
Normal = (-Σ D.x * WA * C, 1 - Σ Q*WA*S, -Σ D.z * WA*C)? Let me recall GPU Gems ch1 eq 12:

Given P(x,z,t) with:
- WA = k * A
- S = sin(dot(D, xy)*k + t*ω)
- C = cos(...)
Normal = ( -Σ D.x * WA * C, 1 - Σ Q * WA * S, -Σ D.z * WA * C )

Yes that's the GPU Gems formula. I'll use that in the vertex shader, passing normal to fragment (normalized there). Also compute world position varying.

Fragment shader:
- normalize normal
- viewDir = normalize(cameraPosition - worldPos)
- fresnel = pow(1 - max(dot(N, V),0), 5) with F0 ~0.02
- skyColor reflect: reflect(-V, N) → sample procedural sky gradient: color based on reflected ray y: mix horizon color to zenith color.
- deepColor/shallowColor: shallow near shore (worldPos radius small) and near crests slightly.
- base water color = mix(deep, shallow, factor)
- specular: sun direction uniform, Blinn-Phong: spec = pow(max(dot(N, H),0), shininess) * sunColor * intensity. Add broad glitter maybe with high power ~150 plus a wider lobe.
- foam: crest foam: smoothstep on wave height (vWaveHeight) + noise from a hash function on worldpos; shore foam: based on distance to island: islandRadius(x,z) function — since island is procedural heightfield, compute shore = smoothstep where terrain height ≈ 0. I'll compute terrain height function in JS and pass... simpler: define island height function h_island(x,z) shared between JS (to displace island geometry) and used in shader? Fragment shader can't call JS. I'll replicate the island height formula in GLSL as a function too. Or simpler: shore foam factor from world position: island is roughly a radial falloff, so shore = smoothstep(30, 22, length(worldPos.xz - islandCenter)) plus noise. The island will be radial-ish with noise; approximate with radial function. Good enough visually since foam band is near waterline.

Actually I'll define island height as function of radius r with noise from sin-based pseudo-noise: h = maxH * exp(-(r/R)^2) ... plus angular variation. For the shader, approximate shore factor = smoothstep(uShoreDist...) Let me just use: shoreT = 1.0 - smoothstep(20.0, 26.0, r + angularNoise). Hmm, to keep it simple: foam band where r between islandWaterlineRadius and islandWaterlineRadius + 3, modulated by a moving noise. Island geometry itself will use a matching-ish height function; exact alignment of foam isn't critical.

Better: make island height function shared conceptually:

```
islandHeight(x,z) = peak * falloff(r) * (1 + 0.3*noise) - 1.2 (so it slopes below water)
falloff(r) = cos-like: smoothstep(1,0,r/islandRadius)
```

I'll write both TS and GLSL versions of a simple function:

```
float noise(vec2 p) { // value noise via hash
  ...
}
float islandH(vec2 p) {
  float r = length(p);
  float base = smoothstep(uIslandRadius, uIslandRadius*0.15, r); // 1 at center, 0 at edge
  float n = noise(p*0.15)*0.5 + noise(p*0.4)*0.25;
  return base * (uPeak + n*4.0) - 2.0;
}
```

In TS, replicate. This lets the fragment shader compute water depth = -islandH → shallow color where depth small, shore foam where depth near 0. That's actually great: shallow turquoise near island automatically. And vertex shader could also damp waves near shore? Optional — waves attenuate with depth: amplitude *= smoothstep(0, 6, depth+2). Nice touch: waves flatten near island. Keep it: shallow factor reduces amplitude. But then heightAt JS must match! heightAt must return "the vertical displacement your shader applies at the undisplaced position". If shader attenuates waves by depth, JS heightAt must apply the same attenuation → JS needs the same island function. Fine — I'll implement islandHeight in TS and use it in heightAt. But the boat floats at (12,0,14): r = √(144+196)=√340≈18.4. Island radius ~26 with waterline... boat at r=18.4 might be in shallow water where waves are damped, making the boat motion subtle. Hmm. Let me design island: radius parameter R=30 (island across ~40-50 units, requirement 30-50 across). Waterline where islandH crosses 0. peak 8. base = smoothstep(R, R*0.1, r): at r=18.4, base = smoothstep(30,3,18.4) → t = (30-18.4)/(30-3)=0.43 → smooth ≈ 0.43²(3-2*0.43)=0.185*2.14≈0.396. h = 0.396*(8+n*4) - 2 ≈ 3.17 + noise -2 ≈ 1.2-ish → island above water at boat position. Bad. Need island smaller or boat farther. Requirement: island 30-50 units across; boat at (12,0,14) within 25 of origin... overlapping. Boat can drift slowly though; but must "float at about (12, 0, 14)". Hmm, "about" gives some leeway. Also boat staying within 25 units of origin — it can be at (18, 0, 20)? that's r=26.9 >25. (16,0,18): r=24.1 ok. Hmm but "about (12,0,14)". 

Alternative: island across ~32 units (radius 16), waterline radius ~13. Boat at (12,0,14): r=18.4, outside waterline, in shallow-ish water. Island peak 9, base = smoothstep(16, 2, r): waterline where base*(peak+noise) = 2 (since offset -2). peak 9: base = 2/9≈0.22 → smoothstep⁻¹... t where 3t²-2t³=0.22 → t≈0.28 → r = 16 - 0.28*14 = 12.1. So waterline radius ~12 ± noise. Boat at r=18.4: island h = base(18.4)... base=0 there (r>16). Good, boat beyond island slope. Waves attenuate where depth small: depth = -islandH ≈ up to 2 at r just outside 16, deepening outward. Let me make attenuation: amp *= clamp(depth*0.5 + 0.5, 0.15, 1) or smoothstep(0.0, 5.0, depth+1.0). At boat: islandH at r=18.4 = base=0 → h=-2 → depth 2 → attenuation smoothstep(0,5,3)=0.6²... that dampens boat waves too much (only 60% amp → visible but weaker). Let me use gentler: smoothstep(0.0, 3.0, depth) * 0.65 + 0.35 → at depth 2: smoothstep=0.74 → 0.83. At depth 0 (waterline): 0.35. Good: foam/shallow near shore, waves mostly intact at boat.

Actually simpler for matching: define in both TS and GLSL:

```
float depthFactor(float d) { return 0.35 + 0.65 * smoothstep(0.0, 3.0, d); }
```

d = -islandH(x,z), clamped ≥0.

heightAt in TS: same computation with same island function. Must ensure identical island function in TS and GLSL. I'll write a value-noise:

GLSL:
```
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
```

TS version must produce identical values. `sin` in GLSL vs JS differs slightly in precision but should match closely enough (hash uses sin(dot)*43758 — large number precision differences could cause visible mismatch between foam location and actual island? The foam uses noise for variation; slight differences fine. But island geometry (built in TS from TS islandH) vs shader depth (GLSL islandH) — differences only affect foam band subtly. Acceptable.

Hmm, but actually precision: GLSL highp float sin of values up to ~500*... dot(p,(127.1,311.7)) with p up to ~±15*0.15≈±2 → dot ~±800 → sin fine. fract of 43758*x where x∈[-1,1] — precision ok-ish. Mismatch might occur but visually negligible.

Actually — simpler and safer: I can compute the island heightfield entirely in JS (build island geometry with vertex colors from height), and for the water shader pass shallow/foam via a different cheap approach. But depth-based shading really helps realism. I'll keep GLSL island replica. It's fine.

Island geometry: PlaneGeometry 100x100? Island region radius 16 plus underwater slope extending to ~radius 24 where h=-2... base=0 for r>16 gives h=-2 everywhere outside → seabed flat at -2. Ocean is opaque-ish; seabed only visible through shallow water. Fine, but abrupt edge at r=16 where noise term vanishes... h = base*(peak + n*4) - 2; at r→16⁻, base→0, h→-2 smoothly. OK continuous. But underwater terrain flat at -2 beyond 16 — through shallow water you'd see sand. Make seabed slope: h = base*(peak+n*4) - 2 - r*0.05? Then beyond island it keeps descending — nicer: -2 at r=16, -5 at r=60. Let's do: h = base*(peak + n*4.0) - 2.0 - max(r-16.0, 0.0)*0.08. Hmm keep it simple: -2.0 - r*0.05 → at r=0: -2 (under island center? no—base=1, h = 9+n*4-2 ≈ 7-13). At r=30: -3.5. Fine, gentle seabed slope. But heightAt/depth then depends on r everywhere; ok.

Island geometry: circular-ish. Use PlaneGeometry(120, 120, 128, 128) rotated flat, displace vertices with islandH, compute vertex colors: sand below ~1.2 (including underwater), grass above, rock near peak (h>6.5). Compute normals. Actually to have decent resolution on the island, maybe use a separate mesh for island rather than combined with seabed. One plane 120x120 with 128 segs = 2.5 units per quad — island radius 16 → ~12 quads across... coarse but with vertex colors and smooth shading acceptable. Better: 180 segments? That's 32k verts, fine. Or make island a separate high-res plane 60x60 with 160 segs centered at origin (island region), plus... the surrounding seabed barely visible. I'll do one plane 140x140 with 200 segments (40k verts) — fine for mid GPU. Actually 200x200 = 40401 vertices, static geometry, fine.

Hmm — but the ocean is a separate opaque plane at y≈0 with waves. Seabed under water would be hidden by ocean except through transparency. Should ocean be transparent? For shallow water look, transparency helps: make ocean material transparent with alpha based on depth (more opaque in deep water). That's nice: alpha = mix(0.55, 0.97, depthFactor). With transparent ocean, seabed shows through near shore. Set ocean renderOrder fine. Underwater terrain colored sand. Good.

Boat: Group with:
- hull: could use a few primitives: elongated shape. Build hull from a scaled sphere? Or LatheGeometry? Simplest good-looking: hull from BoxGeometry modified? Let me build hull via a custom approach: use a CylinderGeometry scaled? I'll construct hull from a shape: create hull using `THREE.SphereGeometry` scaled (4 long, 1.2 wide, 0.8 tall) cut? Eh.

Alternative attractive approach: hull = CapsuleGeometry lying along z, scaled to be pointier... Actually a decent hull: use LatheGeometry for a dinghy cross-section? Lathe makes round boat. Let me do: hull from a `THREE.Shape` extruded? Extrude along length with taper isn't native.

Pragmatic good-looking hull: take a SphereGeometry(1, 24, 16), scale (0.7, 0.5, 2.2) → ellipsoid 4.4 long, 1.4 wide, 1 tall; then cut off the top half above deck? We can use two hemispheres: bottom half (phiStart...) Actually SphereGeometry with thetaStart=π/2, thetaLength=π/2 gives bottom hemisphere → hull bottom. Then deck = a flattened box or an ellipse (CircleGeometry scaled) on top. Plus gunwale rim: TorusGeometry scaled elliptical? Torus scaled to ellipse via scale (1, 1, 2.2)... torus in XY plane radius 0.7, scale z? Torus lies in XY; scale (1, 2.2, 1) then rotate flat. Good.

Boat parts:
1. hull: hemisphere ellipsoid, MeshStandardMaterial white-ish with red bottom? Use two materials? Keep single: white hull with... vertex colors maybe. Simple: hull material color #f2f0e8 (white), roughness 0.5.
2. deck: ellipse (CircleGeometry radius 0.65, scaled z 2.1) color #b08050 wood, rotated flat, positioned at y just below rim.
3. gunwale rim: torus scaled, wood color.
4. cabin? Small boat with mast and sail instead: mast = cylinder height 3.2, sail = custom geometry — a triangular sail from PlaneGeometry manipulated or BufferGeometry triangle with slight curve. Use a simple curved sail: PlaneGeometry(1.4, 2.2, 8, 8), bend it (z = curvature * x²...), position as triangle-ish? A triangular sail: make BufferGeometry with vertices: mast top, mast bottom-ish, boom end. Could use Shape → ShapeGeometry triangle, then add slight curvature via vertex modification. ShapeGeometry is flat; bend: for each vertex, z = 0.15*(x²) bulge. Fine. DoubleSide material, color white.
5. boom: thin cylinder horizontal.
6. Maybe a small flag? Not needed.

At least 3 meshes in one Group — we'll have ~6. castShadow on all.

Boat floats at (12, 0, 14), drifts slowly: drift velocity small circular drift, keep within 25 of origin: orbit around (12,14) with slow sin drift: x = 12 + 1.5*sin(t*0.05), z = 14 + 1.5*cos(t*0.05). Stays near.

Each frame:
```
const t = waveTime;
const y = heightAt(x, z, t) + 0.35; // offset so hull sits properly (hull half-height ~0.5, draft)
```
Boat group origin: design so waterline at local y=0. Hull ellipsoid center at y ≈ 0.15? Let me set: hull bottom hemisphere center at y=0.2, hemisphere scaled y 0.5 → bottom at -0.3, deck at ~0.35. Set offset 0.25 → sits with slight draft.

Pitch/roll from slope: sample h ahead (z + 1.5 along boat forward?) Boat orientation: point boat along some heading, slowly rotating? Keep heading fixed-ish with slow yaw drift. Sample:
```
const hx = heightAt(x + L, z, t) - heightAt(x - L, z, t); // slope along world x
const hz = heightAt(x, z + L, t) - heightAt(x, z - L, t);
pitch (rotation about x?) Actually pitch = slope along boat's forward axis, roll = slope along side.
```
Boat heading yaw ψ; forward dir f = (sinψ, 0, cosψ)... Let me just set boat rotation.y = ψ, and compute:
slopeF = (heightAt(pos + f*d) - heightAt(pos - f*d)) / (2d)
slopeS = (heightAt(pos + s*d) - heightAt(pos - s*d)) / (2d)
boat.rotation.x = -slopeF? Need care with rotation order. Use boat.rotation.order = 'ZYX' or compute quaternion from basis. Simple approach: 
- rotation.z (roll) = slopeS * factor? Signs: For a plane rotated about x-axis by angle a, the surface slope along z... Let me define desired: boat's up vector tilts along wave normal. Wave normal n ≈ normalize(-dh/dx, 1, -dh/dz). Build boat quaternion aligning up (0,1,0) to n partially (damped), plus yaw. Use quaternion setFromUnitVectors? That also changes yaw. Alternative: 
```
const n = new THREE.Vector3(-slopeX, 1, -slopeZ).normalize();
// tilt in boat local frame
```
Easier: use Euler with order 'YXZ': rotation.y = yaw; rotation.x = pitch; rotation.z = roll. With order YXZ, after yaw, pitch about local x, roll about local z. Pitch (rotation.x) tilts forward/back: positive rotation.x tilts nose... rotation about x by θ maps +z toward -y? Rotation x by θ: z axis → (0, sinθ... let me compute: R_x(θ): y→(0,cosθ,sinθ), z→(0,-sinθ,cosθ). So nose (+z) goes down (−y) when θ>0. Slope along forward f: if water higher ahead (h(ahead) > h(behind)), nose should go up. f = (sinψ, 0, cosψ). slopeF>0 → nose up → rotation.x = -slopeF? nose up means +z moves +y → need sinθ negative... z→(0,-sinθ,cosθ): nose y-component = -sinθ. Nose up ⇒ -sinθ>0 ⇒ θ<0. So rotation.x = -atan(slopeF) approximately = -slopeF (small angle). Hmm wait check rotation.x positive: rotating about +x axis by right-hand rule: +z rotates toward... R_x(θ) applied to (0,0,1): standard: (0, -sinθ? ) Let me be careful: Rotation about x: y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. So (0,0,1) → (0, -sinθ, cosθ). Yes nose down for θ>0. So rotation.x = -slopeF gives nose up when slopeF>0. But wait — after yaw rotation.y=ψ applied first (order YXZ means R = Ry * Rx * Rz). Local +z after yaw = (sinψ, 0, cosψ) = f. Good. Local x (starboard?) after yaw: (cosψ, 0, -sinψ) = s. Roll: rotation.z: x→(cosθ, sinθ, 0), y→(-sinθ, cosθ,0). Starboard +x goes up for θ>0. If water higher on starboard side (slopeS>0), starboard should rise: rotation.z = +slopeS? Water surface normal tilts; boat deck parallel to surface: if h increases along +x_local, then surface tilts up along +x, boat rolls so starboard up: rotation.z = atan(slopeS) ≈ slopeS. Hmm check consistency: surface with h = s*x_local: normal = (-s,1,0)_local. Boat up (0,1,0) rotated by R_z(θ): (−sinθ, cosθ, 0). Align to normal: -sinθ = -s → θ = s. Yes rotation.z = slopeS. And rotation.x: surface h = f_f * z_local: normal (0? ) with h = c*z: normal (-c, 0... in local (x,y,z): grad (0, c) → normal (-0? normal = (-∂h/∂x, 1, -∂h/∂z) = (0, 1, -c)). Boat up after R_x(θ): (0, cosθ, sinθ)? From above: y→(0,cosθ,sinθ). Align: sinθ = -c → θ = -c. Matches rotation.x = -slopeF. 

Slope in world: dh/dx = (h(x+d)-h(x-d))/(2d), dh/dz similarly. Then slopeF = dot(grad, f) = gx*sinψ + gz*cosψ; slopeS = dot(grad, s) where s = (cosψ, 0, -sinψ): slopeS = gx*cosψ - gz*sinψ.

Damp with smoothing: lerp boat tilt each frame for nicer motion: store smoothed values, lerp factor 1 - exp(-delta*4). Also add slight lag/bobbing. Good.

Palm trees: trunk = curved — use a series of cylinders? Or TubeGeometry along a curve (CatmullRomCurve3) — one TubeGeometry per trunk, radius tapering not supported by TubeGeometry (constant radius). Could use CylinderGeometry bent manually: create CylinderGeometry(0.12, 0.2, H, 6, 8), bend vertices: x += curve(y). Simple: for each vertex, t = (y/H + 0.5), offset.x = bend * t*t. Good, curved trunk, merged per palm. Trunks: individual meshes (5-7 palms) — fine, cast shadows.

Crown of leaves: each leaf = a bent blade geometry. Leaf geometry: PlaneGeometry(0.5, 2.2, 1, 6) shaped: taper width toward tip and droop (curve along length). Build one leaf geometry (unit), then InstancedMesh with per-instance matrix = palm position + rotation yaw + tilt, count ≥ 30 (say 7 palms × 8 leaves = 56). Sway wind: update instance matrices each frame — recompute each leaf matrix with additional sway rotation proportional to sin(time*freq + phase(palmIndex)) and gust. Store base matrices (position, quaternion base) and per-frame compose with extra small rotation: matrix = translation(palmTop) * rotationY(yaw) * rotationX(baseTilt + sway) * rotationZ(rollSway) * translation(leafOffset?) Hmm.

Leaf geometry design: origin at leaf base, extends along +Y length 2.2? Let's make leaf along +Y with droop baked in? If droop baked into geometry and sway rotates about base, leaves pivot at base — good. So leaf geometry: plane in local space: length along +Y from 0 to L, width along X, droop: rotate progressively — bake droop by transforming vertices: for each vertex with y=t*L, rotate about X axis by droop*t (cumulative droop). Simpler: z = -droop * (y/L)² * L (parabolic droop) and also curve. Then per-instance: rotation about base. Compose matrix per leaf:

```
m = new THREE.Matrix4();
pos = palm top position
quat = yaw * tilt (base orientation, leaf pointing outward and up slightly)
sway: additional rotation about local X and Z by wind angles: windPhase per palm, swayX = 0.12*sin(t*1.3+phase)+0.05*sin(t*3.7+phase*2)
```

Compute quaternion each frame: qYaw(ψ) * qTilt(basePitch) * qSway. Use Euler order or quaternion multiply. Precompute base quaternion per leaf; per frame: q = qSway * qBase (sway in world-ish frame applied after? Apply sway as rotation about the leaf base in world axes: q_final = qSwayX * qSwayZ * qBase). Compose matrix: compose(pos, q, scale). scale maybe vary per leaf. Store per-leaf data arrays. 56 instances × matrix compose per frame — trivial.

Leaf geometry shaping: PlaneGeometry(w, L, 1, 8) translated so base at y=0 (translate y by L/2). Then modify vertices: taper: x *= (1 - t*0.85) where t=y/L... leaves taper to tip. Droop: z = -droopCoef * t². Also fold: slight V-shape: z += fold * |x|? Keep simple: droop + taper. Material MeshStandardMaterial DoubleSide, color green with variation? Instance color: use setColorAt for green variation. Nice.

Palm placement: on island where h between 2 and 5, positions chosen procedurally: use fixed seed random or hand-pick angles/radii, compute h from islandHeight fn, place at y=h. I'll place palms at predefined angles: for i in 0..6: angle = i/7*2π + jitter, r = 6 + rand*4 → compute h; if h < 1.5, move inward. Simpler deterministic: try random with seeded RNG (mulberry32), accept if 1.8 < h < 5.5, up to attempts. Fine.

Coconuts? Skip. Maybe add rocks: few dodecahedrons — optional, adds realism. Add a few rocks (IcosahedronGeometry with random scale, gray). Cheap. And maybe a small dock? Skip.

Sky: use Sky addon. Sun position: elevation ~18°, azimuth ~ some angle so lighting nice from camera at (35,12,35) looking at origin. Sun toward... light from behind-left of camera for good specular on water toward camera? Specular highlight visible when sun roughly opposite/side. Camera looks toward -x,-z direction (from (35,12,35) to origin → view dir ≈ (-0.9, -0.31, -0.9) normalized). Sun specular on water visible if reflected sun direction toward camera: sun in direction opposite view horizontally, i.e., sun at azimuth toward (-x,-z) region? Reflection: for horizontal water, sun reflected to camera when sun is behind the scene relative to camera, i.e., sun direction from origin toward camera-opposite: sun position at negative x, negative z? Camera at +x+z looking to origin; sun beyond origin at (-x, -z) direction → sun glints on water between camera and horizon. But then island is backlit — dramatic but dark island. Alternatively sun to the side: sun at azimuth along (x: -0.5, z: +0.7)? Let me place sun azimuth so it's off to the left: sunDir from spherical: elevation 22°, azimuth 130°? Sky addon: sunPosition from spherical coords. I'll set sun direction (from origin toward sun) = normalize(vec3(-0.6, 0.42, -0.75))? That's behind island → glitter path toward camera across water in front of island — actually beautiful (backlit tropical scene, sun glint on water, island silhouette-ish but hemisphere fill + shadow side visible). Risk: island too dark. With hemisphere light and moderate elevation it's fine, and backlit water looks great. Alternatively side lighting: sun direction (0.7, 0.45, -0.4)? Then glint reflected: camera sees reflection of sun when sun direction ≈ mirror of view: view dir d = (-0.87,-0.3,-0.87) horizontal (-0.71,-0.71)... reflected ray from water to camera is upward version of camera forward: r ≈ (0.87? ...). Sun should be roughly along (camera→scene mirrored): sun horizontal direction ≈ (-0.71, ·, -0.71) i.e., behind island. I'll go with sun at azimuth toward (-0.55, 0, -0.84) horizontal, elevation 25°. DirectionalLight positioned at sunDir * 80, target origin. Shadow camera: orthographic covering island+boat: left/right/top/bottom ±45, near 10 far 200. Shadow map 2048. 

Actually with sun behind island, boat at (12,14) (toward camera) is front-lit — good, boat well lit, island backlit with rim. Add hemisphere light fairly strong (sky #bfdcff? ground #3a4a3f, intensity 0.7) plus small ambient.

Sky addon with turbidity 8, rayleigh 2, mieCoefficient 0.005, mieDirectionalG 0.8. Note: Sky addon shader with tone mapping — renderer.toneMapping = ACESFilmic, outputColorSpace SRGB (default). Sky material toneMapped: Sky uses its own shader; three's Sky example sets toneMappingExposure ~0.5. I'll set exposure 0.6.

Water fragment sky reflection: sample procedural gradient matching Sky roughly: horizon warm-ish light blue, zenith deeper blue. Use reflected vector y: skyCol = mix(horizonColor, zenithColor, pow(max(r.y,0),0.6)) plus sun glow: pow(max(dot(r, sunDir),0), 350)*sunColor*big for sun disk reflection + broader glow pow 8. Combined with Blinn spec? The reflect-based sun disk is nicer. I'll do: spec = pow(max(dot(R, sunDir),0), 400)*3 (sun glint) + pow(...,40)*0.08 (haze glow). Plus Fresnel mix.

Water color: deep #06364a? tropical: deep teal #0a4d5e... deep: vec3(0.02, 0.18, 0.24)? shallow turquoise vec3(0.08, 0.55, 0.55)? Tune: deepColor (0.015, 0.12, 0.18), shallowColor (0.05, 0.45, 0.45). Shallow factor from depth (small depth → shallow) plus crest height a bit. Also subsurface: add scatter on wave crests facing sun: scatter = pow(max(dot(V, -sunDirFlat?),0)...) keep simple: crest boost: color += shallowColor * crestFactor * 0.3.

Foam: foamFactor = shore foam (depth < 0.6 band) * (0.6 + 0.4*noise(worldPos.xz*0.8 + t*0.3)) + crest foam smoothstep(hi, higher, waveHeightSum) * noise. Foam color mix toward vec3(0.9). Also alpha increase with foam.

Transparency: alpha = clamp(0.75 + fresnel*0.2 ...). Deep water nearly opaque (0.95), shallow 0.6. foam → 1.0.

Fog: scene.fog = new THREE.FogExp2? With ShaderMaterial, fog needs manual implementation — include fog code in shader manually: use fogColor uniform, compute fogFactor = 1 - exp(-dist²*density²)? I'll add manual fog: uniform uFogColor, uFogDensity: factor = 1 - exp(-pow(dist*density, 2)). Match FogExp2 in scene for other meshes (three handles those automatically if I use FogExp2 with same density/color). Set fog color to horizon color (light hazy blue #cfe4ec... with sunset-ish sun maybe #d8e6ea). Use FogExp2(color, 0.0038)? At 200 units: exp(-(200*0.0038)²)=exp(-0.577)=0.56 → 44% fog at 200. Ocean extends to 200+√2... corner at 283: factor exp(-(1.075)²)=0.31 → 69% fogged. Horizon blends okay. Sky addon doesn't get fog — good, sky stays clear; ocean fades to fog color which should match sky horizon color. Sky horizon color with turbidity 8 and sun low is whitish — pick fog color #c8dcE8-ish. I'll eyeball: use new THREE.Color(0.78, 0.87, 0.92). Hmm with exposure 0.6 ACES, colors shift; fog applied before tone mapping in three? Fog is applied in material fragment before tonemapping (fog chunk is part of shader, tonemap after) — for my water shader, apply fog then three's tonemapping? ShaderMaterial doesn't automatically tonemap unless I include tonemapping fragment chunk. If I write custom ShaderMaterial, output goes... The renderer applies tone mapping via `tonemapping_fragment` chunk which ShaderMaterial doesn't include unless I add it. So I should include in my fragment shader:

```
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
at the end. These operate on gl_FragColor. With ShaderMaterial (RawShaderMaterial no; ShaderMaterial yes, chunks resolve). tonemapping_fragment uses toneMapping function defined when material.toneMapped... For ShaderMaterial, the tone mapping code is included if `material.toneMapped` true? The chunk `#include <tonemapping_fragment>` expands to `gl_FragColor.rgb = toneMapping(gl_FragColor.rgb);` and `toneMapping` function is defined in the program header based on renderer state — for ShaderMaterial, `#include <tonemapping_pars_fragment>` needed too. Yes: add `#include <common>`? To be safe, include at top of fragment: `#include <tonemapping_pars_fragment>` and `#include <colorspace_pars_fragment>`? colorspace_fragment doesn't need pars (uses linearToOutputTexel which is defined in program header automatically? In newer three, `colorspace_fragment` = `gl_FragColor = linearToOutputTexel(gl_FragColor);` and linearToOutputTexel is injected in the shader prefix for all programs? I believe output color space encoding functions are added to fragment prefix for every program (getTexelEncodingFunction). Yes, WebGLProgram adds `linearToOutputTexel` to fragment shader prefix unconditionally. And toneMapping function is added via `tonemapping_pars_fragment`? Actually the prefix includes `#include <tonemapping_pars_fragment>` when parameters.toneMapping — for ShaderMaterial, parameters.toneMapping = material.toneMapped && renderer.toneMapping !== NoToneMapping → prefix includes ShaderChunk.tonemapping_pars_fragment. So I just need `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at end of main. Good.

Also for fog matching: three's FogExp2 for standard materials: `fogFactor = 1 - exp(-fogDensity² * fogDepth²)`. I'll replicate with vFogDepth = -mvPosition.z or distance? three uses `vFogDepth = -mvPosition.z` (view depth). I'll use distance to camera for nicer radial fog: fogDepth = length(worldPos - cameraPosition). Slight mismatch with other materials' view-depth fog; negligible.

Sun light intensity: with ACES and exposure 0.6... DirectionalLight intensity ~3 (three r150+ uses physically correct lights by default: renderer.useLegacyLights default false since r155). I'll target recent three version. Let me set: DirectionalLight color 0xfff2d8, intensity 3.2. HemisphereLight(0x9fc6e8, 0x2e4638, 0.9). 

Sky addon + exposure: Sky example uses exposure 0.5 with renderer.toneMappingExposure. Water custom shader tone mapping uses same exposure — fine.

Shadow: sun.castShadow = true; mapSize 2048; camera left -50 right 50 top 50 bottom -50, near 20, far 250; bias -0.0005, normalBias 0.5? Set shadow.bias = -0.0003, normalBias = 0.8 for terrain acne. Ocean doesn't receive shadows (custom shader — skip). Island receives, boat casts, trunks cast, leaves cast (InstancedMesh castShadow true — instanced shadows work).

Ocean geometry: PlaneGeometry(400,400, 256,256) → 66k verts, vertex shader heavy-ish but fine. Rotate -PI/2 via geometry.rotateX(-PI/2) so positions are xz-plane with y up, positions attribute has x, y=0, z. In vertex shader, use position.xz as undisplaced coords.

Wave uniforms: pass wave params as arrays of vec4s: uWaves[5] each (dirX, dirZ, amplitude, wavelength) plus speed? Encode: vec4(dir.x, dir.z, amp, k) and float speed array... use two arrays or vec4 with k and separate omega computed in shader from k & speed: omega = speed * k. Pack: uWavesA: vec4(dirx, dirz, amp, k); uWavesB: vec4(speed, phase, 0,0)? Simpler: since I define waves in TS, I can precompute k and omega and steepness in TS, pass uniform arrays:

```
uniform vec4 uWavesA[N]; // dirx, dirz, amp, k
uniform vec4 uWavesB[N]; // omega, Qsteepness, phase, 0
```
N = 5. But GLSL requires constant loop bounds — use `#define NUM_WAVES 5` via string interpolation in shader source (template literal `${NUM_WAVES}`).

Vertex shader:

```
uniform float uTime;
uniform vec3 uSunDir;
uniform float uIslandPeak; etc? 
vec3 gerstner(vec2 p, out vec3 normal?) 
```

Compute:
```
vec3 disp = vec3(0.0);
vec3 norm = vec3(0.0, 1.0, 0.0); // accumulate GPU Gems terms
float depth = max(-islandHeight(p), 0.0);
float damp = 0.35 + 0.65*smoothstep(0.0, 3.0, depth);
float crest = 0.0;
for i:
  vec2 D = normalize(uWavesA[i].xy);
  float A = uWavesA[i].z * damp;
  float k = uWavesA[i].w;
  float w = uWavesB[i].x;
  float Q = uWavesB[i].y;
  float ph = uWavesB[i].z;
  float th = dot(D, p)*k + uTime*w + ph;
  float S = sin(th), C = cos(th);
  disp.x += D.x * (Q*A*C);
  disp.z += D.z * (Q*A*C);
  disp.y += A * S;
  // normal accumulation (using undisplaced derivatives, GPU Gems):
  float WA = k * A;
  norm.x -= D.x * WA * C;
  norm.z -= D.z * WA * C;
  norm.y -= Q * WA * S;
  crest += A * S;
```
Note GPU Gems normal: Normal = (-Σ D.x WA C, 1 - Σ Q WA S, -Σ D.z WA C). So accumulate norm.x as above, norm.y = 1 - Σ Q*WA*S. OK.

Wait: damp factor also should scale Q? If Q relative to A, then Q*A already includes amp; I set per-wave Q as steepness value (e.g., Q = 0.35 / (k*A*numWaves)?) GPU Gems: Qi = Q/(wi Ai × numWaves). Simpler: choose fixed Q per wave like 0.6 for gentle, ensuring no loops (Q*k*A < 1 sum). With A=0.35, k=2π/24≈0.26, Q=0.5: QkA=0.046. Fine — horizontal displacement small. I'll set Q=0.7 flat for all: disp horizontal = 0.7*A*C — subtle chop. Good.

Height damp with depth: heightAt TS must replicate damp: damp = 0.35+0.65*smoothstep(0,3,depth), depth=max(-islandH,0).

crest variable → varying vCrest = disp.y (the total height). Pass vHeight = disp.y and vNormal (world), vWorldPos.

Also foam near shore needs depth too: compute in fragment from islandHeight again (fragment also has islandHeight function). Pass nothing extra; fragment recomputes islandHeight(worldPos.xz) → depth. That's fine (value noise in fragment — ok cost).

Actually for foam noise animated: vnoise(worldPos.xz * 1.2 + uTime*0.2) etc.

Fragment shader outline:

```
vec3 N = normalize(vNormal);
vec3 V = normalize(cameraPosition - vWorldPos);
// flatten normal slightly for distance? optional: N = normalize(mix(N, vec3(0,1,0), 0.0));
float depth = max(-islandHeight(vWorldPos.xz), 0.0);
float shoreFade = 1.0 - smoothstep(0.0, 6.0, depth); // near shore
vec3 deep = uDeepColor;
vec3 shallow = uShallowColor;
float shallowMix = (1.0 - smoothstep(0.0, 5.0, depth)) * 0.8;
shallowMix += clamp(vHeight*0.5+0.5, 0.0, 1.0) * 0.15; // crest lighter? maybe skip
vec3 base = mix(deep, shallow, clamp(shallowMix,0.,1.));
// fresnel
float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
fres = mix(0.04, 1.0, fres);
vec3 R = reflect(-V, N);
R.y = abs(R.y) maybe; 
vec3 sky = skyGradient(R);
// sun glint
float sunSpec = pow(max(dot(R, uSunDir), 0.0), 600.0) * 4.0 + pow(max(dot(R,uSunDir),0.0), 64.0)*0.25;
vec3 col = mix(base, sky, fres) + uSunColor * sunSpec * (something);
// subsurface crest
col += shallow * 0.2 * clamp(vHeight*1.5, 0.0, 1.0) * max(dot(V, -uSunDir*?),0)...
// foam
float foamNoise = vnoise(vWorldPos.xz*1.5 + uTime*0.35) * 0.6 + vnoise(vWorldPos.xz*4.0 - uTime*0.5)*0.4;
float crestFoam = smoothstep(0.55, 0.9, vHeight * uCrestFoamGain + foamNoise*0.3) — hmm crest height max ~1.0. crestFoam = smoothstep(0.6, 0.95, vHeight + foamNoise*0.25 - 0.3)?
```

vHeight range ±~1.0. crestFoam = smoothstep(0.55, 0.9, vHeight*0.8 + foamNoise*0.35). Peaks reach 0.8+ → some foam at top crests. OK.

Shore foam: band where depth < 0.8: shoreFoam = smoothstep(0.9, 0.15, depth) — 1 at waterline. Animate with waves: multiply by (0.55 + 0.45*sin(uTime*1.5 + depth*4.0 - length?)?). Use: shoreFoam *= 0.5 + 0.5 * sin(uTime*1.2 + foamNoise*6.0). Plus fade with noise. foam = clamp(crestFoam*0.8 + shoreFoam, 0,1). col = mix(col, vec3(0.92,0.96,0.97), foam). alpha = mix(alphaBase, 1.0, foam).

Alpha: alphaBase = mix(0.6, 0.96, smoothstep(0.0, 4.0, depth)); deep water nearly opaque. Then fog mix, then alpha maybe also reduce... keep alpha after fog (fog doesn't change alpha).

Sky gradient function in water shader:

```
vec3 skyGradient(vec3 r){
  float t = clamp(r.y, 0.0, 1.0);
  vec3 horizon = uSkyHorizon; // vec3(0.75, 0.85, 0.92)
  vec3 zenith = uSkyZenith;  // vec3(0.12, 0.32, 0.55)
  vec3 c = mix(horizon, zenith, pow(t, 0.5));
  float sunAmt = pow(max(dot(r, uSunDir),0.0), 8.0);
  c += uSunColor * sunAmt * 0.15;
  return c;
}
```

Match Sky addon appearance roughly. Sky addon with exposure — the actual sky will look different from my gradient slightly; acceptable.

Island colors: sand #d9c28f? underwater sand slightly darker/greener. Compute per-vertex: 
- h < 0.3: wet sand (0.72, 0.66, 0.5) darker
- 0.3–1.6: sand (0.85, 0.78, 0.6)
- blend to grass (0.25, 0.5, 0.22) between 1.5 and 3
- rock above 6.5: (0.45,0.42,0.4) blend. Peak ~9+noise... islandH max = 1*(peak + n*4) - 2 where n∈[0,1] → up to peak+2... with peak 9 → 11 max? n = noise*0.5+noise*0.25 ∈ [0,0.75]; h_max = 9 + 0.75*4 - 2 = 10. Requirement peak 5-15 ✓. Add color variation noise for interest: grass color varies with noise. Add vertex color jitter.

Use MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }) with flatShading? Smooth normals look better for terrain; computeVertexNormals after displacement.

Seabed visible through water near shore: sand color continues underwater — good, gives turquoise lagoon over sand.

Island receives shadows: material needs receiveShadow — standard.

Palms: trunk material brown (0.45, 0.35, 0.25) roughness 1. Leaves material green (0.2, 0.55, 0.2), DoubleSide, roughness 0.8. Leaves instanced with instance colors for variation: setColorAt.

Leaf count: 7 palms × 9 leaves = 63 ≥ 30 ✓. Trunk height ~5-7 → island peak ~9-10; palms on slopes h∈[2,5.5]. Palm top = base + trunkH.

Coconut? skip.

Trunk geometry per palm: CylinderGeometry(0.09, 0.18, H, 6, 10) then bend: translate so base at 0: geometry.translate(0, H/2, 0); then for each vertex: t = y/H; x += bend * t*t; also slight lean. Merge? Each trunk is its own mesh (7 draw calls, fine). castShadow.

Rock: few IcosahedronGeometry(1, 1) scaled randomly, gray with vertex jitter, placed near shore/heights. 4 rocks.

Camera: PerspectiveCamera(50?, aspect, 0.1, 2000) at (35,12,35), lookAt(0,2,0). Use OrbitControls enabled with target (0,2,0), enableDamping? "do not move by themselves" — damping with no input stays still. I could skip controls entirely — simpler and safe. The requirement says keep this view; I'll add OrbitControls (optional) — but any damping still moves only after user input. I'll include OrbitControls with enableDamping for niceness? If damping is on and user flicks, it continues briefly — that's user-initiated. Fine. Actually to minimize risk, include controls with damping, controls.update() in loop (needed for damping; without input it's static). maxDistance etc. I'll include it.

Wave time: maintain `waveTime += delta` accumulated (so time() returns shader time). Use clock.getDelta(). Expose __ocean.time() returns waveTime.

heightAt(x, z, t): 
```
let y = 0;
for wave: damp computed with depth from islandHeight(x,z); y += A*damp*sin(dot(D,p)*k + t*w + ph)
```
Wait — damp is computed once per position (not per wave) — in shader I compute damp once and multiply each A. Yes match: compute damp once, add A_i*damp*sin(...) exactly.

Important: shader uses undisplaced p = position.xz; heightAt called with undisplaced (x,z). For boat, we treat boat xz as undisplaced position — small mismatch due to Gerstner horizontal shift, acceptable per spec.

TS smoothstep helper.

islandHeight in TS:
```
function vnoise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf*xf*(3-2*xf), v = zf*zf*(3-2*zf);
  const h = (i:number, j:number) => {
    const s = Math.sin(i*127.1 + j*311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  return lerp(lerp(h(xi,zi), h(xi+1,zi), u), lerp(h(xi,zi+1), h(xi+1,zi+1), u), v);
}
```
GLSL hash: fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123). dot(p, vec2) = p.x*127.1 + p.y*311.7 — matches. Precision: sin arg up to |p|*~311 with p up to ~ (worldpos*0.15 → ±10) → ~3000; sin fine in highp. fract of large products — GPU float32 precision: 43758.545 * sin(...) magnitude up to 43758; float32 has ~7 digits → fract resolution ~0.004 at that magnitude — hash quality slightly degraded but fine. JS double vs GPU float will give different fract results sometimes! That's a real concern: fract(x) in shader vs x-floor(x) in JS with x ~ 43758 magnitude: float32 rounding changes the fractional part materially. So islandH computed in GLSL (for water depth shading/foam) may differ from TS islandH (island geometry) by noticeable amounts?? The noise term: n = vnoise(p*0.15)*0.5 + vnoise(p*0.4)*0.25, contribution to h: n*4 up to 3 units. A hash mismatch changes noise value entirely → island geometry (TS) vs water depth (GLSL) mismatch up to ~3 units → foam band misplaced relative to actual shore! Hmm.

Options:
a) Make island geometry from a height function whose noise is robust to float32: reduce magnitude in hash: use hash with smaller multiplier: fract(sin(dot)* 43758) is standard; precision issue is real but at p*0.15 the lattice cells are ~6.7 units — mismatch just shifts noise pattern; but geometry vs shader mismatch is what matters. Alternative: avoid hash noise in shader; instead pass island height to water shader via... could compute depth on CPU per-vertex? No — fragment needs per-pixel.

b) Use a different foam/shallow approach not requiring GLSL island: compute shore distance analytically as pure radial function (no noise) shared trivially: shoreR = waterline radius; depth ≈ (r - rWaterline) * slope for r > rWaterline else negative(land). Make island terrain mostly radial with noise only above waterline (noise amplitude scaled by height above water so underwater terrain is smooth radial). Then GLSL depth function = simple radial formula, exact match. 

Design islandH(x,z):
```
r = length(p)
base = smoothstep(R, 2.0, r)  // R = 16
d = r - R... 
```
Let me define:
- underwater/sea floor: h_floor(r) = -2.2 - r*0.04 (smooth radial)
- island mass: h_mass(r) = peak * smoothstep(R, 1.5, r) - something... 

Let me construct: h(r, ang) = max(h_floor, islandProfile) where islandProfile = (peak + noiseAng) * falloff(r) - 2.0? Let me simplify to guarantee waterline shape: 

h = h_floor + mound(r) * (1 + 0.25 * noiseAbove) where mound(r) = M * smoothstep(R, 0, r)... then h crosses 0 where mound(r) = -h_floor(r) ≈ 2.2 → radial waterline (noise scaled by mound fraction so at waterline noise ≈ 0 → circular waterline). 

Concretely:
```
mound = Math.max(0, 1 - (r/R)^2)-ish: use m = (1 - (r/R)^2); m<0 → 0
h = -2.0 - r*0.03 + m * (peak + nAng * m * 4.0)   where nAng = angular+pos noise
```
At r=R: m=0 → h = -2 - 0.48. Waterline where m*(peak + n*m*4) = 2 + 0.03r ≈ 2.4 → with peak 8: m ≈ 0.3 → (r/R)² = 0.7 → r ≈ 0.837R = 13.4 for R=16. Noise at that point: n*m*4 with m=0.3 → n*1.2 where n∈[0,0.75] → up to 0.9 variation in h → waterline radius varies: solving m*(8+n*4m)=2.4: for n=0: m=0.3, r=13.4; n=0.75: m*(8+3m)=2.4 → m≈0.276 → r=13.66. Small variation — waterline nearly circular. Depth GLSL function: replicate exactly — depth = -h. All terms smooth analytic: r = length(p) (exact same in GLSL/JS to float precision), n computed via value noise — precision mismatch concern again? n*m*4 term: at waterline m=0.3 → small; deeper m larger but depth also larger (only affects shading slightly). Mismatch of hash noise between CPU/GPU: affects waterline radius by ~±0.2 units maybe. Foam band uses noise modulation anyway — acceptable. But island geometry height vs water depth mismatch affects shallow color: shallow tint where depth<5 — a ~0.5 unit error invisible. OK — with noise scaled by m (and even by m²), errors are damped near shore. 

Let me finalize island function (both TS & GLSL identical math):

```
float islandHeight(vec2 p) {
  float r = length(p);
  float m = max(0.0, 1.0 - (r*r)/(R*R)); // R=16 → m = 1 - r²/256
  float n = vnoise(p*0.18)*0.65 + vnoise(p*0.45 + 7.3)*0.35;
  return -2.0 - r*0.035 + m*(PEAK + n*4.5*m);
}
```
PEAK = 8.0 → max h ≈ -2 + 1*(8 + 4.5*0.75*1) ≈ 9.4 ✓ (5–15). Island across: waterline at m solving m*(8 + n*4.5m) = 2 + 0.035r ≈ 2.45 → m≈0.29 → r ≈ 16*sqrt(1-0.29)=13.5 → diameter ~27... requirement 30–50 across. Bump R to 19: waterline r≈19*0.843=16 → diameter 32 ✓. Check boat at r=18.4: m = 1 - 338/361 = 0.064 → h = -2 - 0.64 + 0.064*(8 + small) ≈ -2.15. Depth 2.15 at boat → wave damp = 0.35+0.65*smoothstep(0,3,2.15)=0.35+0.65*0.81? smoothstep(0,3,2.15): t=0.717 → 3t²-2t³ = 1.54-0.737=0.80 → damp=0.87. Boat waves 87% amplitude — good. And boat at r=18.4 is outside waterline r≈16 ✓ (drift ±1.5 keeps r between ~16.9 and 19.9 — hmm drift inward could put boat at r=16.9, m=1-286/361=0.208, h=-2-0.59+0.208*8=−0.93 → depth 0.93 — boat near shore. Drift of 1.5 toward origin: (12-1.06, 14-1.06) → r=√(121+... let me compute: x=12+1.5*sin, z=14+1.5*cos; min r when direction aligned: r_min = 18.44-1.5 = 16.94. Waterline ~16 (+noise variation) — boat could occasionally touch very shallow water. Reduce drift to ±1.0 or drift outward: drift center at (12.8, 14.8)? Keep drift small: amplitude 1.0 → r_min 17.4, m=0.16, depth ≈ 0.7+... h = -2-0.61+0.16*8.3 = -1.28, depth 1.28, damp = 0.35+0.65*ss(0,3,1.28)=0.35+0.65*0.35=0.58. Hmm waves noticeably smaller there. Maybe reduce island R to 18: waterline ≈ 18*0.843=15.2, diameter 30.4 ✓ borderline. Or increase peak: peak 9 → m*(9+...)=2.45 → m≈0.26 → r = R*sqrt(0.74)=0.86R. R=19 → 16.3. Boat r 17.4–19.4: at 17.4: m=1-303/361=0.16 → h=-2.61+0.16*9.6=-1.07 → depth 1.07, damp 0.52. Eh.

Alternative: make the boat drift tangentially (circle around origin at constant r≈18.5): x = 18.5*cos(a), z=18.5*sin(a) with a drifting... but spec says "floating at about (12,0,14)" — r=18.44, angle atan2(14,12)=0.86 rad. Drift along that circle: angle = 0.86 + 0.05*sin(t*0.03)?? Slow oscillation keeps r constant at 18.44. Plus small radial breathing ±0.5. That keeps depth ~2.1 constant-ish. 

Check depth at r=18.44, R=19, peak=9: m = 1 - 340/361 = 0.058 → h = -2 - 0.645 + 0.058*9.3 = -2.10 → depth 2.10 → damp = 0.35+0.65*ss(0,3,2.1) = 0.35+0.65*0.794 = 0.866. Good.

Waterline radius ~16.3 → foam ring around island, boat 2 units beyond waterline... hmm boat at 18.44 with waterline 16.3 — boat is only ~2 units from the foam ring; visually "next to island" — actually nice, boat floats in the lagoon near beach. But is the boat ON the shallow shelf? depth 2.1 with boat draft 0.3 — fine.

Hmm wait, also shallow color: shallowMix = 1-smoothstep(0,5,depth) → at depth 2.1 → mix ~0.5 → boat sits in turquoise water. Pretty!

Shore foam: shoreFoam where depth < 0.9 → radius < ~17. Boat at 18.4 outside foam ✓.

Camera at (35,12,35), boat at (12,14) — boat is between camera and island, slightly left. 

Island across = ~32.6 ✓ (30-50). Peak 9.3 ✓.

Now noise function TS/GLSL match — as discussed, minor float differences OK since noise contributes ≤ 4.5*m² ≈ 0.03*... at waterline m=0.26 → n*4.5*0.26 = n*1.17 — wait, term is n*4.5*m (one m, not m²): at m=0.26 → up to 1.17 variation. Hash mismatch changes n by up to 1 → waterline radius mismatch: dh=1.17 → dm = 1.17/9 ≈ 0.13 → dr = R*dm/(2*... dr/dm: m=1-r²/R² → dm = -2r dr/R² → dr = dm*R²/(2r) = 0.13*361/32.6 ≈ 1.44 units. So foam ring position could be off by up to ~1.4 units from actual island waterline in worst case. Visible? Foam band is ~1.5 wide with noisy modulation; a 1.4 offset could put foam over the beach or slightly offshore. Hmm.

Mitigate: make noise term smaller near shore: use n*4.5*m*m (m²): at m=0.26 → n*0.30 → dh 0.3 → dr ≈ 0.37 units. Negligible. And peak variation: max h = -2 + 9 + 4.5*0.75 = 10.4. Also m² makes inner region still full variation. 

Also vnoise at scale p*0.18: lattice 5.5 units — across island r<16: few cells; fine.

Actually, also consider: does GLSL highp float match JS double for this smooth function? length(p), squares — differences ~1e-5 relative — irrelevant. The noise hash fract mismatch — damped by m². 

But hold on: island geometry itself is built with TS islandHeight including noise — the visible terrain noise: n*4.5*m² → at island center m=1: ±3.4 variation — good rolling terrain. Near shore smooth. 

Now write GLSL value-noise identical to TS. fract(sin(x)*43758.5453123) — in GLSL: fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123). TS: v = Math.sin(x*127.1 + y*311.7)*43758.5453123; return v - Math.floor(v). Float32 rounding → mismatch possible but damped near shore as computed. At island center m=1, mismatch only affects water color/foam subtly, not geometry-vs-something consistency that's visible... wait — it DOES affect geometry consistency in one way: nothing else uses GLSL islandHeight except water shading (depth → shallow color, foam, wave damp). Wave damp mismatch near shore → waves slightly off from foam — invisible. Fine.

One more consideration: the water vertex shader also uses islandHeight for damp — per-vertex, 256×256. Fine.

Fragment shader performance: vnoise called ~4-6 times per pixel — fine.

Sun position & Sky: 
```
const sky = new Sky(); sky.scale.setScalar(1000);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
```
phi = MathUtils.degToRad(90 - elevation), theta = azimuth. elevation 24°, azimuth: I want sun horizontal direction ≈ (-0.6, -0.8)ish (toward -x,-z). In three's Sky example: sun.setFromSphericalCoords(1, phi, theta) with theta azimuth measured from +z? Spherical: x = sinφ sinθ, y = cosφ, z = sinφ cosθ. For direction (-0.55, y, -0.83): sinθ = -0.55/0.91... horizontal components: sinθ = -0.6, cosθ = -0.8 → θ = π + ... θ ≈ 3.79 rad (217°). Set theta = MathUtils.degToRad(215)? sin(215°)=-0.574, cos(215°)=-0.819 ✓. elevation 24° → phi = 66°.

sunDir = (-0.53, 0.407, -0.745) normalized. DirectionalLight.position = sunDir * 120.

Camera view direction ≈ (-0.71, ·, -0.71) normalized horizontally; sun horizontal (-0.58,-0.82) — dot with view ≈ 0.41+0.58 = 0.99... sun nearly directly behind island from camera → glint path right at island. Slightly offset: azimuth 200°: sin=-0.34, cos=-0.94 → dir (-0.32, ·, -0.88). Glint direction between view and island — nice, sun sparkles on water left of island. Use elevation 26°, azimuth 205°.

Fog color: match horizon: with turbidity etc., hard to predict; pick #bcd4de... I'll go with a hazy light blue (0.72, 0.82, 0.88). FogExp2 density 0.0045? At 100 units: (0.45)²=0.2 → 18% fog; at 250: (1.125)² → 1.27 → 72%. Ocean half-diagonal 283 → 79%. Reasonable.

Tone mapping exposure: 0.65.

Sky uniforms: turbidity 6, rayleigh 1.8, mieCoefficient 0.004, mieDirectionalG 0.85, sunPosition sunDir.

Water uniforms: uSunDir, uSunColor vec3(1.0, 0.85, 0.6)*?, uSkyHorizon: sample-ish (0.65, 0.78, 0.85)? With ACES exposure 0.65... I'll tune by feel: horizon vec3(0.68, 0.80, 0.87), zenith vec3(0.09, 0.28, 0.52), deepColor vec3(0.012, 0.10, 0.16), shallowColor vec3(0.06, 0.42, 0.42), sunColor vec3(1.4, 1.1, 0.8).

Boat detail plan:
Group boat; meshes:
1. Hull: SphereGeometry(1, 28, 14, 0, 2π, π/2? thetaStart... hemisphere bottom: thetaStart = π/2, thetaLength = π/2 gives lower hemisphere (from equator to -y? SphereGeometry theta measured from +y pole: thetaStart π/2 → from equator down to south pole ✓). Scale (0.75, 0.55, 2.1). Position y = 0.28 so bottom at 0.28-0.55 = -0.27 (draft below waterline 0). Hull color: white #e8e4da; but maybe two-tone via vertex colors? Keep single white with red-ish bottom? Use material only white; add a separate thin waterline stripe? Skip.
   Hull open top? A hemisphere is closed by nothing at top — from above you'd see inside (backfaces). Put deck covering: an ellipse mesh (CircleGeometry radius 1 scaled (0.72, 2.05) rotated flat) at y=0.30, color wood #9a6b42. Covers opening. Also add interior rim torus: TorusGeometry(0.72, 0.06, 8, 32) scaled (1, 2.8, 1)? Torus in XY plane: scale x 0.72*? TorusGeometry(0.72...) scaled (0.75, 2.1, 1) then rotateX(π/2) → lies flat, ellipse ring a=0.54... hmm torus radius 0.72 ring in XY; after scale (0.75, 2.1, 1): ellipse rx=0.54, ry=1.51 → then rotateX(π/2) maps XY→XZ: ellipse in xz: 0.54 x, 1.51 z ✓ matches hull ellipse (0.75*1=0.75 radius x? hull scaled 0.75 in x → radius 0.75; torus ellipse rx should be 0.75: torus radius 1.0 scaled x 0.75, z 2.1 → rx 0.75, rz 2.1 ✓. Use TorusGeometry(1, 0.05, 8, 40), scale (0.75, 2.1, 1), rotateX(π/2), y=0.32. Wood color.
2. Mast: CylinderGeometry(0.045, 0.06, 3.4, 8) at y = 0.3 + 1.7 = 2.0, position z = 0.3 (slightly forward of center? mast at z=0.4). Color dark wood.
3. Sail: triangular, along x? Sail on mast plane facing... boat forward = +z? Which direction should boat face? Heading yaw ψ; make boat's forward +z (matches my pitch math with f=(sinψ,0,cosψ)). Sail: main sail behind mast? Simple Bermuda: triangle from mast top (z=0.4, y=3.3) down to boom. Build BufferGeometry triangle with curve: vertices A=(0, 3.3, 0.4) top at mast, B=(0, 0.7, 0.4) at boom gooseneck, C=(0, 0.55, -1.6) boom end aft. Subdivide for curvature: create PlaneGeometry-like param grid? Easier: use THREE.Shape with quadraticCurveTo, ShapeGeometry(shape, 12) — flat in XY; then orient: shape in (x=zBoat?, y). Then bend: displacement in x (out of plane) proportional to ... give sail a belly: x += 0.25*sin(π*v)*? Let me do: after creating ShapeGeometry in XY plane where shape-x maps to boat -z (aft), rotate so plane is vertical along boat centerline (plane normal = boat x). Bend vertices: pos.x += belly * sin(π * u) where u = normalized position along... just use z-curve: for each vertex, x = 0.18 * sin(π * (y - 0.55)/(3.3-0.55)) * (1 - |shapeX|/width)... simpler: x = 0.15*sin(π*t) where t = (vY - yMin)/(yMax-yMin)? That gives uniform belly bulge, more at middle height. But sail is triangle: bulge should be near foot. Fine — subtle. Material DoubleSide white #f5f2ea, roughness 0.85. 
   Actually simpler and robust: construct sail manually as ParametricGeometry-like BufferGeometry: grid 8×10 over triangle domain? Overkill. ShapeGeometry path: moveTo(0, 0.55) → lineTo(0, 3.35) (luff along mast) → quadraticCurveTo(-0.5, 1.6, -1.7, 0.6) → close. In shape coords x=aft direction? Then rotate: shape lies in XY; I want it in boat's ZY plane: map shape.x → boat -z? rotateY(-π/2)? RotateY(π/2) maps x→? R_y(π/2): x→(cos, 0, -sin)... point (1,0,0) → (0,0,-1). So shape x+ → boat -z (aft) ✓ with rotateY(π/2). Then position at z=0.4 (mast). ShapeGeometry(shape, 10). Then add belly via vertex loop after rotation: pos.x += 0.16*sin(π*clamp((y-0.55)/2.8,0,1)) * (1 - |z-0.4|/1.8)? Just x = belly*sin(π*t) where t=heightFrac, scaled also by horizontal extent fraction: extent = |z - 0.4|/1.7 (1 at boom end). x = 0.2*sin(π*t)*extent? Belly should push sail outward leeward; fine.
   computeVertexNormals after.
4. Boom: CylinderGeometry(0.035, 0.035, 1.75, 8) rotateX(π/2) → along z, position (0, 0.62, 0.4 - 0.85) → from mast aft. 
5. Flag/pennant at mast top: small triangle, red. Cute. BufferGeometry or ConeGeometry? Use a small Shape triangle, orange-red #d84f3a. Optional — include, cheap.
6. Rudder/tiller? skip. Maybe a small cabin? It's a small sailboat; skip cabin. Spec says "hull, deck or cabin, mast and sail" — deck ✓.

All boat meshes castShadow = true. Boat also receiveShadow? Hull receives shadow from sail — set receiveShadow true on hull/deck.

Boat group position y set each frame; also add slight extra bob: + 0.05*sin(t*0.9). And yaw slowly: ψ = base + 0.15*sin(t*0.05)? plus drift along heading? Keep drift as circular-arc around origin: angle a = a0 + 0.06*sin(t*0.02+1)... very slow. Let me do: a0 = atan2(14,12)≈0.8622; r0 = 18.439; a = a0 + 0.15*sin(t*0.021); r = r0 + 0.8*sin(t*0.013+2.0). x = r cos a, z = r sin a. Max r = 19.24+... r_max ≈ 19.24 < 25 ✓. Heading: face tangent? Heading ψ = a + π/2 (tangent direction) plus oscillation: ψ = a + π/2 + 0.4*sin(t*0.05)? That makes boat slowly turn — nice life-like. But then pitch/roll computed from slope along heading — fine, generic code.

Wait — with heading tangent to circle, boat moves along its heading when drifting — consistent. Good.

Boat offset: hull bottom at local y=-0.27 relative to group origin (group origin at waterline). So boat.position.y = heightAt(...) + 0.12? Waterline: hull is a hemisphere centered y=0.28 with radius 0.55 vertical → hemisphere spans y ∈ [-0.27, 0.28]. Waterline at group origin y → draft = 0.27 units submerged. Add offset 0.05 → boat.position.y = h + 0.05. Visually boat floats with hull sides slightly submerged at troughs. Good.

Palm sway update: per-frame loop over leaves:
```
for (let i = 0; i < count; i++) {
  const d = leafData[i];
  const sway = Math.sin(time * 1.4 + d.phase) * 0.09 + Math.sin(time*3.1 + d.phase*1.7)*0.03;
  const swayZ = Math.cos(time*1.1 + d.phase*0.9)*0.05;
  _euler.set(sway + d.tiltX?, ...) 
```
Better: base quaternion qb; additional: q.setFromEuler(new Euler(sway, 0, swayZ)); q.multiply(qb)? Order: world-frame sway rotation applied before base: q_final = qSway * qb — rotating leaf about world axes at its base — pivot is instance origin (leaf base at instance origin since geometry base at origin, instance matrix includes translation to palm top) ✓. Then matrix.compose(d.pos, q_final, d.scale). instanceMatrix.needsUpdate = true.

Leaf geometry: base at origin, extends up+outward; base tilt per leaf: pitch outward ~ -50°..-70° from vertical (leaves arch out and droop). With droop baked, set tilt: leaves point outward at ~35° above horizontal initially then droop. Leaf geometry along +Y with baked droop curving z: droop makes it curve toward -z? Then yaw distributes directions. Let me define leaf local: grows along +Y, droops toward +Z: vertex z += droop * t² (t=y/L) with droop ≈ 1.1*L? Then per-instance: yaw φ around Y evenly (i * 2π/n + jitter), then tilt: rotate about X to pitch leaf from vertical toward horizontal: tilt angle α ≈ 65° (rotate about X by -α tips +Y toward +Z? R_x(-α): y→(0,cosα, -sinα)... +Y → (0, cosα, sinα)? R_x(θ): y→(0,cosθ,sinθ). θ=+70°: y→(0,0.34,0.94) — tips toward +z ✓ same direction as droop (+z). Then yaw rotates around. So qb = R_y(φ) * R_x(70°+jitter). Droop baked: leaf tip ends up arcing below horizontal — classic palm.

Leaf geometry details: PlaneGeometry(0.55, 2.4, 1, 7) → vertices along Y from -1.2..1.2; translate(0, 1.2, 0) → 0..2.4. Taper: for each vertex, t = y/2.4; x *= (1 - 0.9*t*t)? Palm leaves taper: widest near base-middle. x *= (1 - t)^0.7-ish → tip narrow. Use x *= (1 - 0.85*t). Also droop: z = 0.9 * t*t * 2.4*0.35? Let me set z = t*t * 1.4 (tip drops 1.4 units). Also slight fold along center: z -= |x|*0.18 (V-shape). computeVertexNormals; DoubleSide.

Trunk: bend direction +X local; per palm rotate randomly. Trunk top position must match where leaves are: compute trunk top world position: base + R_y(trunkYaw) * (bend, H, 0) where bend = lean. I'll compute in code: trunk geometry translated base to origin, bend x += lean*t². Top offset = (lean, H, 0) rotated by yaw. Leaves positioned at palmTop = base + that. 

Palm base positions: pick with seeded RNG on island where 2.5 < h < 6: attempts loop, r between 3 and 11. Ensure ≥5 palms: do 7 palms; use fixed seed; but must guarantee acceptance — with rng and range checks plus fallback (place at prescribed positions). Safer: hand-tuned array of (angle, radius) in radians: [(0.3, 5), (1.2, 8), (2.2, 6.5), (3.1, 9), (4.0, 5.5), (4.9, 8.5), (5.7, 7)] → compute h; all within island (m>0 region r<19... at r=9: m=1-81/361=0.776 → h = -2.3 + 0.776*(9 + n*4.5*0.6) ≈ -2.3 + 0.776*~10 ≈ 5.4 ✓; r=5: m=0.93 → h ≈ -2.2+0.93*11 ≈ 8 — high on island, near peak — fine, palms at various heights. Peak h max ~10.4 at center; palm at r=5 h≈8 ✓ below peak. But is peak location center? n varies. h(0,0): m=1, n=vnoise(0,0)*0.65+vnoise(7.3ish)*0.35 — whatever, ≈ 9±2. Palms at h up to ~8, fine. If some palm ends at h > 7, still fine visually. Add jitter via rng but keep guaranteed valid base positions. I'll use fixed list with small rng jitter ±1.5 and clamp r to [3.5, 11.5].

Rocks: 5 rocks at shore area r ∈ [13,16], h near 0..1: compute h, place, random scale/rotation, gray material, castShadow. 

Island material: MeshStandardMaterial vertexColors, roughness 1.0? maybe roughness 0.95, metalness 0. Add slight flatShading? No — smooth.

Beach wet-sand band near waterline: color by height h: 
```
h < -0.5: underwater sand (0.55, 0.52, 0.38) slightly greenish (0.5,0.5,0.36)
-0.5..0.4: wet sand (0.76, 0.68, 0.5)
0.4..1.8: dry sand (0.87, 0.79, 0.58)
1.8..3.5: blend to grass (0.28, 0.52, 0.2)
>7: blend to rock (0.42, 0.40, 0.38)
+ noise variation per vertex.
```
Grass color vary: mix toward (0.35,0.55,0.18) by noise.

Island geometry size: plane 120×120 covers seabed to r=60 where h=-2-2.1=-4.1; edges of plane visible through water? Deep water opaque (alpha .96) so seabed hidden. But at plane edge, water alpha 0.96 over void (sky/背景 below?) — camera never sees below horizon at distance. Ocean plane 400 wide covers beyond. Seabed 120 wide at depth ~-4: through 0.96-alpha water barely visible. But wait, at distance water alpha high — but transparent sorting: seabed (opaque) renders first, ocean transparent after ✓. Beyond seabed plane (r>60), water over empty background (sky color below horizon?) — with alpha 0.96, 4% of background (renderer clear color) shows. Set renderer clear color to deep sea dark or scene.background = null and clear color = dark blue-teal (0x06222e)? With fog on ocean fading to fog color... background clear color is fogged? No — clear color isn't fogged; ocean at 283 dist is 79% fog color mixed... plus 4% clear color at far edge — set clear color = fog color-ish. Actually simpler: make ocean fully opaque? Then no lagoon seabed visibility — lose shallow realism. Keep transparent; set clear color (0.55,0.72,0.8)? Just set clear color to fog color: far ocean ≈ fog color anyway. But near-horizon between island... fine. Actually alternative: keep alpha min 0.9. And clear color = horizon haze color. OK.

Hmm — but transparent ocean renders after opaque; boat hull intersects water surface: hull below waterline visible through transparent water — correct (submerged hull tinted). Good realism actually!

Also ocean transparent → renderOrder vs Sky? Sky is a huge box (scale 1000) — material side BackSide, not transparent, depthWrite... Sky renders as opaque background; fine.

Shadow: leaves instanced mesh castShadow ✓; trunk castShadow; island receiveShadow; boat cast+receive. Shadow camera bounds ±48 covers boat at 19 + island 16 ✓. Sun elevation 26° → long shadows across island — nice.

Also self-shadowing on water: skip.

Performance: ocean 256×256 = 131k tris; fine. Fragment shader moderate.

Now — Sky import: 'three/addons/objects/Sky.js'. OrbitControls: 'three/addons/controls/OrbitControls.js'.

TypeScript strictness: careful with possibly-undefined, types for uniform arrays: { value: Array<THREE.Vector4> }.

Let me now also handle `__ocean.heightAt` signature: heightAt(x, z, t). And time() returns waveTime. Wave params shared:

```ts
interface Wave { dx: number; dz: number; amp: number; wavelength: number; speed: number; phase: number; }
const WAVES: Wave[] = [
  { dx: 1.0, dz: 0.25, amp: 0.34, wavelength: 26, speed: 5.2, phase: 0.0 },
  { dx: -0.6, dz: 1.0, amp: 0.24, wavelength: 15, speed: 4.0, phase: 1.7 },
  { dx: 0.4, dz: -1.0, amp: 0.17, wavelength: 9, speed: 3.1, phase: 4.2 },
  { dx: 1.0, dz: -0.55, amp: 0.12, wavelength: 5.5, speed: 2.4, phase: 2.9 },
  { dx: -0.9, dz: -0.35, amp: 0.09, wavelength: 3.4, speed: 1.9, phase: 5.6 },
];
```
Sum amps 0.96 → trough-crest ~1.92 ✓ (0.5–2).

Precompute per wave: k = 2π/λ, ω = speed*k, dir normalized.

heightAt:
```
function heightAt(x, z, t) {
  const d = Math.max(-islandHeight(x, z), 0);
  const damp = 0.35 + 0.65 * smoothstep(0, 3, d);
  let y = 0;
  for (w of WAVES) y += w.amp * damp * Math.sin((x*w.dirx + z*w.dirz)*w.k + t*w.omega + w.phase);
  return y;
}
```
Shader must match exactly: same damp formula and islandHeight GLSL.

GLSL shader code (write carefully):

Vertex:
```glsl
uniform float uTime;
uniform vec4 uWavesA[NUM_WAVES]; // dirx, dirz, amp, k
uniform vec4 uWavesB[NUM_WAVES]; // omega, unused, phase, unused
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float islandHeight(vec2 p){
  float r = length(p);
  float m = max(0.0, 1.0 - r*r/361.0);
  float n = vnoise(p*0.18)*0.65 + vnoise(p*0.45 + 7.31)*0.35;
  return -2.0 - r*0.035 + m*(9.0 + n*4.5*m);
}
```
Wait: "vnoise(p*0.45 + 7.31)" — add scalar to vec2: GLSL allows vec2 + float. TS: vnoise(x*0.45+7.31, z*0.45+7.31) ✓ same.

Note TS vnoise: floor for negative values — Math.floor matches GLSL floor ✓. fract: p - floor(p) ✓.

Vertex main:
```
vec3 world = (modelMatrix * vec4(position, 1.0)).xyz; // model = identity for ocean (positioned at origin)
vec2 p = position.xz; // geometry pre-rotated? 
```
If I rotate the geometry (geometry.rotateX(-π/2)), then position attribute already has xz plane with y=0 ✓. Use p = position.xz.

```
float depth = max(-islandHeight(p), 0.0);
float damp = 0.35 + 0.65*smoothstep(0.0, 3.0, depth);
vec3 disp = vec3(0.0);
vec3 nrm = vec3(0.0, 1.0, 0.0);
for (int i = 0; i < NUM_WAVES; i++) {
  vec4 A = uWavesA[i];
  vec4 B = uWavesB[i];
  vec2 D = A.xy; // pre-normalized in JS
  float amp = A.z * damp;
  float k = A.w;
  float w = B.x;
  float ph = B.z;
  float th = dot(D, p)*k + uTime*w + ph;
  float S = sin(th), C = cos(th);
  float Q = 0.6;
  disp += vec3(D.x * Q * amp * C, amp * S, D.y * Q * amp * C);
  float WA = k * amp;
  nrm.x -= D.x * WA * C;
  nrm.z -= D.y * WA * C;
  nrm.y -= Q * WA * S;
}
vec3 pos = position + disp;
vec4 wp = modelMatrix * vec4(pos, 1.0);
vWorldPos = wp.xyz;
vNormal = nrm;
vHeight = disp.y;
gl_Position = projectionMatrix * viewMatrix * wp;
```
Note: normal accumulate: start nrm=(0,1,0) then nrm.y -= Q*WA*S accumulates from 1 ✓.

Fragment:
```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyZenith;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime;
varying ... 

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float depth = max(-islandHeight(vWorldPos.xz), 0.0);

  float shallowMix = 1.0 - smoothstep(0.0, 5.0, depth);
  vec3 base = mix(uDeepColor, uShallowColor, shallowMix * 0.85);
  // crest subsurface glow
  base += uShallowColor * 0.25 * clamp(vHeight*0.9 + 0.2, 0.0, 1.0) * (1.0 - smoothstep(0.0, 4.0, depth));

  float NdV = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);

  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.0);  // avoid sampling below horizon? use abs
  vec3 Rn = normalize(R);
  float t = pow(clamp(Rn.y, 0.0, 1.0), 0.6);
  vec3 sky = mix(uSkyHorizon, uSkyZenith, t);
  float sd = max(dot(Rn, uSunDir), 0.0);
  sky += uSunColor * (pow(sd, 320.0)*3.0 + pow(sd, 24.0)*0.12);

  vec3 col = mix(base, sky, fres);

  // foam
  float fn = vnoise(vWorldPos.xz*1.4 + uTime*0.4)*0.65 + vnoise(vWorldPos.xz*4.2 - uTime*0.6)*0.35;
  float crestFoam = smoothstep(0.62, 0.95, vHeight + fn*0.32 - 0.25);
  float shoreBand = 1.0 - smoothstep(0.05, 1.1, depth);
  float pulse = 0.55 + 0.45*sin(uTime*1.3 + depth*5.0 + fn*5.0);
  float shoreFoam = shoreBand * shoreBand * pulse;
  float foam = clamp(crestFoam*0.85 + shoreFoam, 0.0, 1.0);
  col = mix(col, vec3(0.93, 0.96, 0.96), foam);

  float alpha = mix(0.62, 0.97, smoothstep(0.5, 5.0, depth));
  alpha = max(alpha, foam);

  // fog
  float dist = length(cameraPosition - vWorldPos);
  float fogF = 1.0 - exp(-uFogDensity*uFogDensity*dist*dist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
crestFoam: vHeight max ~0.96*damp... plus fn*0.32 (up to .32) minus 0.25 → max ≈ 1.0 → smoothstep(0.62,0.95,~1.0) reaches ~1 at highest crests ✓; typical crest 0.6+0.15-0.25=0.5 → 0. Occasional foam patches ✓.

Check vnoise(p*0.45+7.31): p up to 200*0.45+7.3 = 97 → hash sin arg up to 97*311=30000 — float32 sin precision at 3e4: highp float has 24-bit mantissa; sin(30000) argument reduction on GPU... precision of fract(sin(huge)*43758) is garbage-ish at large args — that's fine for noise (still deterministic-ish per GPU but may mismatch JS!). Mismatch matters for islandHeight consistency between JS (geometry) and GLSL (water depth). At large p (far ocean), islandHeight noise term scaled by m²=0 → no effect ✓. Near island p*0.45+7.31 ≤ ~15*0.45+7.3 ≈ 14 → sin arg ≤ 14*311.7 ≈ 4400. fract(sin(4400)*43758): float32 relative precision at 4400: eps ≈ 4400*2^-24 ≈ 2.6e-4; after *43758 → abs error ~11 in fract → completely different hash value between CPU and GPU!! So the noise term differs entirely between JS island geometry and GLSL water depth. Contribution near shore: n*4.5*m² — at waterline m≈0.28, m²=0.078, contribution ≤ 0.35 → depth error ≤0.35 → foam band shift ~0.5 units. Acceptable. Deeper: m=0.5 → 1.1 error in h → shallow color boundary off by ~1 unit underwater — barely noticeable through water. OK, accept. 

Alternatively use a precision-safe hash: fract(x) with smaller multipliers, e.g., hash = fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453) is standard; could instead use a hash without big multiply: e.g., 

h = fract(43758.5453 * fract(dot(p, vec2(0.1031, 0.11369))))? still large fract of product... Any fract-based hash has float32 vs float64 mismatch. Mitigation as computed is acceptable. Moving on.

Alternatively compute islandHeight in vertex/fragment without noise at all (pure radial) and add noise ONLY in JS geometry above water?? But then depth shading near shore radial — foam ring perfectly circular — less natural but consistent. Compromise taken above (noise damped by m²) is fine — noise still shapes the island visibly (interior), while near-shore nearly circular with m²... wait noise also uses vnoise(p*0.18) — same mismatch, but multiplied by m² near shore → damped. Interior differences don't matter (not visible — terrain above water isn't compared to anything). ✓.

Waves damp uses islandHeight too — per-vertex in water VS (JS matches heightAt ✓ same formula, mismatch from hash again but damped near shore... damp depends on depth where m small → noise term n*4.5*m² small ✓).

Now TS vnoise/hash must mirror GLSL exactly in structure.

Island geometry: PlaneGeometry(120, 120, 180, 180).rotateX(-π/2) → 32.7k verts. Displace: pos.y = islandHeight(x, z). Colors per vertex. computeVertexNormals.

Island mesh receiveShadow = true, castShadow = true? Island casting shadow onto water — water doesn't receive. Island cast onto itself/rocks — enable castShadow true (adds realism for palm shadows? palms cast onto island ✓ island cast onto seabed — invisible). Set castShadow true anyway.

Vertex colors: use SRGB colors? Colors set via Color.setRGB with values in linear or sRGB? MeshStandardMaterial vertexColors expects linear-space vertex colors. I'll pick values in linear directly (eyeball) — or use color.setStyle with convertSRGBToLinear. I'll define palette via new THREE.Color(hex) (constructor with hex assumes sRGB and converts? THREE.Color(hex) stores as-is in r152+? Actually Color hex is interpreted in sRGB working color space conversion — in recent three, Color hex/Style are converted to linear working space automatically (ColorManagement enabled default). So use hex colors → linear ✓.

Palette:
- deepWetSand underwater: 0x8a7a55 darkened → underwater sand 0x9c8a5e? Underwater sand should be light for lagoon look: 0xc2b083 with slight green: use 0xb5a878.
- wet sand 0xd8c493
- dry sand 0xe8d9a8
- grass 0x4a7c2e? tropical green 0x3e7a2f; variation 0x5d9440.
- rock 0x8a8378.

Color logic per vertex with noise n2 = vnoise(x*0.3+5, z*0.3+5):
```
const h = y;
c = lerp between stops using smoothstep:
underwater (h<0.2): sandU
0.2→1.2: sandU → wet sand? Actually wet band right at waterline: 
Let me do:
let c = new Color();
if below: mix(sandUnder, sandWet, smoothstep(-1.5, 0.1, h))
then mix(sandWet→sandDry, smoothstep(0.3, 1.4, h))
mix(sandDry→grass, smoothstep(1.6, 3.2, h + n2*0.8))
mix(grass→rock, smoothstep(6.0, 8.5, h + n2*1.5))
grass variation: lerp(grass, grass2, n3)
```
Implement sequentially with Color.lerp.

Trunk: CylinderGeometry(0.1, 0.22, H, 7, 12), translate(0,H/2,0), bend vertices: for each vertex t=y/H: x += 0.9*t*t? Lean amount per palm 0.5–1.2. computeVertexNormals? Cylinder normals become wrong after bend — recompute: geometry.computeVertexNormals() (cylinder is indexed? CylinderGeometry is indexed with separate side/normals... computeVertexNormals works on indexed geometry ✓ but may create seams where uv seam duplicates vertices — acceptable).

Trunk material: 0x8a6a4a roughness 1. Add trunk ring texture? skip.

Coconuts: skip.

Leaves InstancedMesh: geometry LeafGeometry (built once), count = palms*9. Material MeshStandardMaterial({ color 0x3e8f3e? use white base with instance colors: base color white, setColorAt greens } ). Actually instance color multiplies material color; set material color 0xffffff and instance colors various greens 0x2f7a33, 0x3f9440, 0x5aa845. DoubleSide, roughness 0.7.

Sway update per frame — also update per-leaf matrix. Store arrays: basePos: Vector3[] (palm top), baseQuat: Quaternion[], scale: Vector3[] (uniform ~0.9–1.3), phase: number[].

Leaf orientation: leaf extends +Y with droop toward +Z. Base quat: qY(yaw) × qX(tilt) where tilt ~ 50°–75°: R_x(tilt) tips +Y toward +Z ✓ then yaw distributes. Note droop direction +Z consistent with tilt direction ✓.

Per frame: 
```
qTmp.setFromEuler(euler.set(windSwayX, 0, windSwayZ));
qTmp.multiply(baseQuat[i]);
m.compose(basePos[i], qTmp, scale[i]);
leaves.setMatrixAt(i, m);
```
windSwayX = sin(t*1.5 + phase)*0.07 + sin(t*3.7+phase*2.3)*0.025; windSwayZ = cos(t*1.2 + phase)*0.05.

All leaves of a palm share phase (palm-level phase + leaf jitter) — use per-palm phase + leaf index*0.35.

Palm tops: base position (bx, h, bz) + leanOffset rotated by trunk yaw: top local = (lean, H, 0); world offset: (lean*cosψ, H, -lean*sinψ)? R_y(ψ) applied to (lean, H, 0): x' = lean cosψ, z' = -lean sinψ. ✓. trunk mesh rotation.y = ψ.

Leaf count 7 palms × 9 = 63 ✓.

Boat sail — check ShapeGeometry type imports fine.

Now the loop:
```
renderer.setAnimationLoop((time) => { ... })
```
Use clock: const delta = clock.getDelta(); waveTime += delta; Actually spec: time() returns "the wave time in seconds that the shader uses right now". Use elapsed-based: waveTime = clock elapsed accumulated via delta (pauses aside). Use elapsed = clock.getElapsedTime() directly — simpler and consistent. But OrbitControls damping needs delta too. Use delta for waveTime accumulation: waveTime += delta; pass waveTime to shader and heightAt. ✓.

__ready: set after first render: track framesRendered; in loop after renderer.render, if frames===0 → (window as any).__ready = true. Actually "after the first frame is rendered" — set right after render call on first iteration ✓.

Camera: PerspectiveCamera(55, aspect, 0.1, 3000); position.set(35,12,35); lookAt(0,2,0). OrbitControls target (0,2,0), update().

Wait — OrbitControls will override camera orientation to look at target — same thing ✓.

Exposure: renderer.toneMapping = THREE.ACESFilmicToneMapping; toneMappingExposure = 0.62; outputColorSpace default SRGB ✓.

Shadow config:
```
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 20; far = 260;
sun.shadow.camera.left = -55; right = 55; top = 55; bottom = -55;
sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.6;
sun.position.copy(sunDir).multiplyScalar(140);
sun.target.position.set(0,0,0); scene.add(sun.target);
```

Hemisphere: new THREE.HemisphereLight(0xbfd8ef, 0x3d5544, 0.85). Maybe ambient 0.15 extra — hemisphere suffices.

Sky:
```
const sky = new Sky();
sky.scale.setScalar(2000);
const u = sky.material.uniforms;
u.turbidity.value = 6; u.rayleigh.value = 1.7; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.85;
u.sunPosition.value.copy(sunDir);
scene.add(sky);
```
Sky material toneMapped default true? Sky's ShaderMaterial... its tone mapping is handled since renderer applies tonemapping only for built-in? Sky includes tonemapping_fragment chunk in its shader (yes, three's Sky.js includes `#include <tonemapping_fragment>` and colorspace). ✓.

Fog: scene.fog = new THREE.FogExp2(fogColorHex, 0.0042). Water uses matching uniforms manually. Note FogExp2 factor: 1 - exp(-density² * depth²) where depth = view depth (-mvPosition.z), mine uses distance — close enough.

Fog color: pick 0xc3d7e2? With sky horizon bright haze: 0xbfd4de. Hmm want slight warm: 0xc9d8de. Go 0xc2d6df.

Ocean uniforms fog color must match: same THREE.Color instance reused ✓ (linear space; ShaderMaterial uniform color passed as-is; three's fog uniforms also linear ✓).

Water side: DoubleSide? Camera above always; FrontSide fine but plane rotated -x π/2 → normal +y ✓. Use side: THREE.DoubleSide just in case? FrontSide ok. Keep FrontSide... underwater camera never happens. FrontSide.

Ocean mesh frustumCulled: geometry displaced up to ±1 — bounding box from flat plane could cull incorrectly when looking... plane is huge, camera inside — fine. But displacement small anyway; also set mesh.frustumCulled = false to be safe? The flat plane bounds y=0±0; waves ±1: near edges plane at distance... camera at y=12 looking down; plane always intersects frustum. Leave default; safe enough. Actually set frustumCulled=false — cheap safety.

Boat drift & rotation code:

```
const boat = new THREE.Group();
... meshes ...
boat.rotation.order = 'YXZ';
```
Set per frame:
```
const a = A0 + 0.12*Math.sin(wt*0.021 + 1.3);
const r = R0 + 0.7*Math.sin(wt*0.013 + 4.0);
const bx = Math.cos(a)*r, bz = Math.sin(a)*r;
const psi = a + Math.PI/2 + 0.35*Math.sin(wt*0.043);
const h = heightAt(bx, bz, wt);
const d = 1.6;
const gx = (heightAt(bx+d, bz, wt) - heightAt(bx-d, bz, wt)) / (2*d);
const gz = (heightAt(bx, bz+d, wt) - heightAt(bx, bz-d, wt)) / (2*d);
const fx = Math.sin(psi), fz = Math.cos(psi);
const sx = Math.cos(psi), sz = -Math.sin(psi);
const slopeF = gx*fx + gz*fz;
const slopeS = gx*sx + gz*sz;
// smooth
smF += (slopeF - smF) * k; etc, k = 1 - Math.exp(-delta*5);
boat.position.set(bx, h + 0.05 + 0.04*Math.sin(wt*0.8+2), bz);
boat.rotation.set(-Math.atan(smF), psi, Math.atan(smS)); // order YXZ
```
Wait rotation.x sign: earlier derived rotation.x = -slopeF for nose-up when slope ahead positive... verify: slopeF>0 means water higher at +f (ahead). Boat nose should rise. rotation.x = θ gives nose y-component -sinθ → nose up needs θ<0 → rotation.x = -slopeF ✓ (use atan for boundedness: rotation.x = -Math.atan(slopeF)... hmm but with smoothing slopeF small (<0.3), atan≈identity). rotation.z = +slopeS? Check: slopeS>0: water higher at starboard (+s local x). Boat rolls starboard up: R_z(θ): x→(cosθ, sinθ,0): +x goes up for θ>0 ✓ rotation.z = Math.atan(slopeS). Hmm wait but does the boat deck align with water or the boat align its up to wave normal? Same thing. ✓.

But caution: rotation order 'YXZ' with rotation.set(x, y, z) — Euler.set(x,y,z) sets components; order property stays 'YXZ' ✓.

Boat heading ψ vs tangent a+π/2: tangent direction for increasing a: d/da (cos a, sin a) = (-sin a, cos a) → heading vector (-sin a, cos a). My f = (sinψ, cosψ). Set ψ = a + π/2: f = (sin(a+π/2), cos(a+π/2)) = (cos a, -sin a) — that's perpendicular-ish inward. Tangent is (-sin a, cos a) = (cos a + π/2? ) Let me just compute: tangent angle ψ_t such that (sinψ, cosψ) = (-sin a, cos a) → ψ = a + π? sin(a+π) = -sin a ✓, cos(a+π) = -cos a ✗. ψ = π - a: sin = sin a ✗. Solve: sinψ = -sin a, cosψ = cos a → ψ = -a. So ψ = -a makes f = tangent. Hmm sign conventions... f=(sinψ, 0, cosψ); want f ∝ (-sin a, cos a): sinψ = -sin a and cosψ = cos a → ψ = -a ✓. So ψ = -a + oscillation. Then boat sails along its drift circle. Since drift oscillates back and forth (a oscillates), boat rocks heading gently — fine, looks like boat swinging at anchor. Actually with oscillating a, boat goes back and forth — anchor swinging. Nice.

Add slight forward bob? fine.

Leaves & boat must update even when tab throttles — using delta ✓.

Now boat meshes details & materials:

```
const hullMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.45, metalness: 0.0 });
hull = Mesh(SphereGeometry(1, 32, 16, 0, Math.PI*2, Math.PI/2, Math.PI/2), hullMat)
hull.scale.set(0.75, 0.55, 2.1); hull.position.y = 0.28;
```
Hemisphere normals after non-uniform scale — three handles normal matrix ✓.

deck: CircleGeometry(1, 32), rotateX(-π/2), scale (0.72, 1, 2.02)? After rotateX geometry is in xz; mesh.scale.set(0.72, 1, 2.0); position.y = 0.30. Deck material wood 0xa87848, roughness 0.8. Note CircleGeometry rotated: rotateX(-π/2) maps +z→+y? Points in xy → after rotateX(-π/2): (x, y, 0) → (x, 0, y)? R_x(-90°): y→(0, cos, -sin)(0,0,... whatever, becomes horizontal ✓, normal +y ✓.

rim: TorusGeometry(1, 0.055, 10, 48), scale (0.75, 2.1, 1)? Torus default lies in XY plane (around z-axis? TorusGeometry ring in XY plane). Points: x = (R + r cosφ')... ring in XY ✓. Scale (0.75, 2.1, 1) → ellipse in XY; rotateX(π/2) → XY→XZ: (x, y, 0)→(x, 0, y)? R_x(π/2): y→z? R_x(90°): (x,y,z)→(x, -z, y). Ring point (x,y,0) → (x, 0, y) ✓ ellipse in xz: rx 0.75, rz 2.1 ✓. position.y = 0.33. Wood dark 0x7c5232.

mast: CylinderGeometry(0.05, 0.07, 3.5, 10), position (0, 0.3+1.75, 0.45). Color 0x6e4f33, roughness 0.7.

boom: CylinderGeometry(0.04, 0.04, 1.8, 8), rotateX(π/2) → along z; position (0, 0.75, 0.45-0.9) = (0, 0.75, -0.45). 

sail: Shape: 
```
const shape = new THREE.Shape();
shape.moveTo(0, 0.6);
shape.lineTo(0, 3.45);
shape.quadraticCurveTo(-0.35, 1.9, -1.75, 0.62);
shape.closePath();
const sailGeo = new THREE.ShapeGeometry(shape, 12);
sailGeo.rotateY(Math.PI/2); // shape x → -z? check: R_y(π/2): (x,y,z)→(z? ) R_y(θ): x' = x cosθ + z sinθ, z' = -x sinθ + z cosθ. θ=90°: x' = z, z' = -x. Point (x,y,0) → (0, y, -x). So shape-x negative (aft curve) → z' = -x > 0?? shape x is negative (-1.75..0) → z' = -x ∈ [0, 1.75] → sail extends +z (forward)! I want aft: use rotateY(-π/2): x' = -z? θ=-90°: x' = x*0 + z*(-1) = -z, z' = x. Point (x,y,0)→(0,y,x): shape x=-1.75 → z=-1.75 aft ✓.
```
So sailGeo.rotateY(-π/2). Then belly: for each vertex: t = (y - 0.6)/2.85 clamp; x += 0.16 * Math.sin(Math.PI*t) * (1 + z/1.75*0.3)? Keep: x += 0.15*Math.sin(Math.PI*clamp(t)) * (0.3 + 0.7*(-z/1.75)). Wait z∈[-1.75, 0]; -z/1.75 ∈ [0,1] (1 at boom end... actually leech curve). Belly more toward foot: multiply by (1 - t*0.5). Fine:
```
x += 0.14 * Math.sin(Math.PI * t) * (1.0 - t * 0.4);
```
computeVertexNormals. Mesh position z = 0.45 (at mast). Material: MeshStandardMaterial({ color 0xf7f4ec, side: DoubleSide, roughness: 0.9 }). castShadow ✓. Position (0, 0, 0.45).

pennant: small Shape triangle at mast top: skip or add simple: ConeGeometry? Add small triangle flag: BufferGeometry from Shape similar, red, position (0, 3.5, 0.45), rotate? Keep simple: PlaneGeometry(0.5, 0.18) → triangle-ish? Use ShapeGeometry: moveTo(0,0) lineTo(0.55, 0.09) lineTo(0, 0.18) — flag along +x; fine at mast top, DoubleSide red 0xd1462f. Rotate y slight. OK add.

Boat meshes all castShadow=true; hull & deck receiveShadow=true.

Also maybe an anchor rope? skip.

Rocks: geometry IcosahedronGeometry(1, 1) with vertex jitter (positions *= 1 + (rand-0.5)*0.3), nonindexed? keep indexed; computeVertexNormals... jitter then compute normals. Material 0x7a746b roughness 0.95. 5 rocks, positions: near shore ring r ∈ [12, 15.5] at various angles, y = islandHeight - 0.2, scale (0.8–2.0, 0.6–1.2, ...). castShadow, receiveShadow.

Seeded RNG mulberry32(1337).

Now let me also double check heightAt consistency with shader once more: shader uses p = position.xz where geometry positions are undisplaced; heightAt(x,z,t) uses same. The mesh modelMatrix identity ✓ (ocean at origin, no rotation since geometry pre-rotated). ✓.

One more: `uWavesA[i].xy` must be normalized dir; precompute in JS: dirx/dz normalized.

GLSL uniform arrays: 
```
uniform vec4 uWavesA[5];
```
Set via { value: [Vector4, ...] } — three handles arrays of Vector4 ✓.

NUM_WAVES defined via template string interpolation with actual length.

Edge case: ShaderMaterial + fog: false (we do custom).

Now assemble palm/leaf data.

```
interface LeafInst { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3; phase: number; }
const leafInstances: LeafInst[] = [];
const palmDefs = [ [0.4, 5.0], [1.3, 8.5], [2.3, 6.0], [3.2, 9.0], [4.1, 5.5], [5.0, 8.0], [5.8, 7.0] ];
for (let i = 0; i < palmDefs.length; i++) {
  const [ang, rad] = palmDefs[i];
  const px = Math.cos(ang) * (rad + (rng()-0.5)*1.6);
  const pz = Math.sin(ang) * (rad + (rng()-0.5)*1.6);
  const py = islandHeight(px, pz);
  // skip if underwater
  if (py < 1.2) continue? — but need ≥5 palms. With r∈[5,9], m = 1 - r²/361 ≥ 1-81/361=0.776 → h = -2 - 0.31 + 0.776*(9 + n*4.5*0.6) ≥ -2.31+0.776*9 = 4.67 ✓ always above water. Good, no skip needed.
  const H = 4.5 + rng()*2.0;
  const lean = 0.6 + rng()*0.9;
  const yaw = rng()*Math.PI*2;
  // trunk
  const tg = new THREE.CylinderGeometry(0.09, 0.2, H, 7, 12);
  tg.translate(0, H/2, 0);
  bend: pos.x += lean * (y/H)²; also slight z wobble: z += lean*0.15*sin(y/H*π)? keep simple.
  tg.computeVertexNormals();
  trunk mesh, position (px, py-0.2, pz), rotation.y = yaw, castShadow.
  // top offset in world:
  const topLocal = new THREE.Vector3(lean, H, 0).applyAxisAngle(Y, yaw);
  const top = new THREE.Vector3(px, py-0.2, pz).add(topLocal);
  // leaves
  const nL = 9;
  for (j...): 
    const yawL = (j / nL) * Math.PI * 2 + rng()*0.5;
    const tilt = (0.9 + rng()*0.5); // radians ~51°–80° from vertical... 0.9 rad = 51°, 1.4 rad = 80°
    quat = qY(yawL) * qX(tilt): q.setFromAxisAngle(Y,yawL); q2.setFromAxisAngle(X, tilt); q.multiply(q2);
    scale s = 0.85 + rng()*0.4;
    phase = i*1.7 + j*0.4 + rng()*0.3;
    leafInstances.push({pos: top, quat, scale: new Vector3(s,s,s), phase});
    colors: setColorAt later.
}
```
Wait: tilt about X tips +Y toward +Z; droop baked toward +Z ✓; then yaw rotates whole thing ✓. But tilt random per leaf → some leaves more upright — natural.

Leaf droop baked: geometry z += droop. Also leaves length 2.4 * scale up to 1.25 → 3 units long; palm crown radius ~2.5 — proportionate for H≈5.5. ✓.

InstancedMesh:
```
const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafInstances.length);
leafInstances.forEach((li, i) => { leaves.setMatrixAt(i, m.compose(li.pos, li.quat, li.scale)); leaves.setColorAt(i, color.setHSL(0.29 + rng()*0.05, 0.55, 0.32 + rng()*0.12)); });
leaves.castShadow = true; leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
```
Note: setColorAt creates instanceColor; needs material vertexColors? No — instanceColor works automatically with standard material ✓ (three injects). After setColorAt initially, instanceColor.needsUpdate = true.

Per-frame sway update: loop compose & setMatrixAt; leaves.instanceMatrix.needsUpdate = true.

Expose: __leaves = leaves; __island = islandGroup (Group containing island mesh, trunks, rocks — spec: island Mesh or Group; leaves separate). I'll make islandGroup with island mesh + trunks + rocks (not leaves since leaves exposed separately — but they're part of palms... spec says expose island; leaves separately; fine to include trunks in island group).

__boat = boat group. __sun = dirLight. __ocean = { heightAt, time }. __scene/__camera/__renderer.

Also spec: "its meshes cast shadows" ✓.

Water specular & boat shadow on water: not received (custom shader) — acceptable.

Check shadow camera covers boat: ortho ±55 centered at origin along sun dir ✓ boat at r≤19.3 ✓.

Renderer: antialias true, setPixelRatio(Math.min(devicePixelRatio, 2)).

Resize handler: camera.aspect, updateProjectionMatrix, renderer.setSize.

Now, Sky addon import path 'three/addons/objects/Sky.js' — Sky class: `new Sky()`; scale — Sky is a Mesh with BoxGeometry(1,1,1); scale 2000... camera far 3000 ✓.

One more detail: water fragment `cameraPosition` built-in uniform available in ShaderMaterial ✓ (world camera position).

`#include <tonemapping_fragment>` — for ShaderMaterial with toneMapped=true, the toneMapping function is defined in prefix. Actually check: WebGLProgram parameters.toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping... For ShaderMaterial, in getParameters: `toneMapping: material.toneMapped ? renderer.toneMapping : NoToneMapping`? I believe it's: const toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping — yes applies to all materials. And prefix includes getToneMappingFunction when toneMapping !== NoToneMapping ✓. So includes work.

colorspace_fragment: `gl_FragColor = linearToOutputTexel(gl_FragColor);` — linearToOutputTexel defined in prefix always ✓.

Potential pitfall: in newer three (r152+), `tonemapping_fragment` chunk name still exists ✓, `colorspace_fragment` replaced `encodings_fragment` in r154. Depending on version... I'll target recent (r160+); use colorspace_fragment. Risk if grader uses older three — can't satisfy all; use current API (r160+): outputColorSpace, etc.

Also `THREE.ColorManagement` default enabled ✓.

OrbitControls: enableDamping true, dampingFactor 0.06, minDistance 8, maxDistance 300, maxPolarAngle Math.PI*0.495 (keep above water). controls.update() each frame with delta? update() no args fine.

Let me now also double check smoothstep helper TS:
```
function smoothstep(a: number, b: number, x: number) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
```

islandHeight TS:
```
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z); // length(p) ✓
  const m = Math.max(0, 1 - (r * r) / 361);
  const n = vnoise(x * 0.18, z * 0.18) * 0.65 + vnoise(x * 0.45 + 7.31, z * 0.45 + 7.31) * 0.35;
  return -2 - r * 0.035 + m * (9 + n * 4.5 * m);
}
```
GLSL identical.

heightAt:
```
function heightAt(x: number, z: number, t: number): number {
  const depth = Math.max(-islandHeight(x, z), 0);
  const damp = 0.35 + 0.65 * smoothstep(0, 3, depth);
  let y = 0;
  for (const w of WAVES) {
    y += w.amp * damp * Math.sin((x * w.dx + z * w.dz) * w.k + t * w.omega + w.phase);
  }
  return y;
}
```
Shader: identical with precomputed arrays. ✓ (dx,dz normalized; k=2π/λ; omega=speed*k.)

Vertex shader damp uses islandHeight(p) — matches ✓.

Now write vertex colors for island; island geometry 120 size — but islandHeight defined for all r; plane edge h=-2-4.2=-6.2. fine.

Vertex color computation (per vertex, using vnoise with JS):
```
const c = new THREE.Color();
const sandU = new THREE.Color(0xb3a06f);
const sandWet = new THREE.Color(0xd6c391);
const sandDry = new THREE.Color(0xe6d7a3);
const grass1 = new THREE.Color(0x3f7a2c);
const grass2 = new THREE.Color(0x6a9a3a);
const rock = new THREE.Color(0x7e7669);
per vertex h:
c.copy(sandU).lerp(sandWet, smoothstep(-1.6, 0.2, h));
c.lerp(sandDry, smoothstep(0.25, 1.3, h));
const n1 = vnoise(x*0.25+11.7, z*0.25+3.1);
c.lerp(grass1, smoothstep(1.5, 3.0, h + n1*1.2));
c.lerp(grass2, n1 * smoothstep(2.0, 3.5, h));
c.lerp(rock, smoothstep(6.5, 9.0, h + n1*2.0));
slight random darkening: c.multiplyScalar(0.94 + rng2()*0.09) — use deterministic vnoise instead for tsc simplicity: multiplyScalar(0.93 + 0.1*vnoise(x*3.1, z*3.1)).
colors attribute push.
```
Color.lerp mutates ✓. Colors from hex are converted to linear automatically (ColorManagement) — setStyle/hex with ColorManagement.enabled converts sRGB→linear ✓.

Underwater sand gets darker with depth? Add: c.multiplyScalar(clamp(1 + h*0.08, 0.55, 1)) for h<0 — depth attenuation: at h=-4: 0.68. Nice.

Island material roughness 0.9, maybe flatShading false.

Now check the "m" for r>19: m=0 → islandHeight = -2 - 0.035r ✓ gentle seabed.

Island plane 120 → covers r up to 60 in corners... at plane edge x=60: fine.

Ocean size 400x400 centered ✓.

Now the shader strings. NUM_WAVES = WAVES.length (5).

Also water: add small normal detail ripple in fragment? Would improve realism: perturb N with high-frequency procedural normal: N.xz += 0.08 * vec2(vnoise-based gradient?) Cheap trick: use two scrolling vnoise samples for pseudo-normal:
```
float n1 = vnoise(vWorldPos.xz*2.0 + uTime*vec2(0.6, 0.3));
```
Need vec2 time offset: vnoise(p + vec2(...)). Compute derivative-ish: 
```
vec2 q = vWorldPos.xz*1.7 + uTime*vec2(0.8,0.5);
float e = 0.15;
float n0 = vnoise(q);
float nx = vnoise(q + vec2(e,0.0));
float nz = vnoise(q + vec2(0.0,e));
N = normalize(N + vec3((n0-nx)/e, 0.0, (n0-nz)/e) * 0.35);
```
Hmm sign: normal perturbed by gradient: N.xz -= grad * strength. (n0-nx)/e ≈ -d/dx. So N.xz += -(grad)*s → using (n0-nx)/e = -∂n/∂x approx ✓ N.xz += that *0.35. Add second layer different scale/speed. This adds sparkle detail. Cost: 6 vnoise — fine. Strength fade with distance to avoid aliasing: * smoothstep(120.0, 20.0, dist)? add factor.

Careful: N normalize after.

Sun glint pow 320 with perturbed normals gives nice sparkle.

Let me now also make sure the boat isn't swamped by 2-unit waves... wave height at boat ~±1 with damp 0.87 → ±0.85; boat freeboard: hull top at 0.28+... hemisphere top at y=0.28 above waterline 0 → deck at 0.30, rim 0.33. Wave crest +0.85 → water 0.85 above boat deck?! Boat would look submerged at crests!! Problem: waves trough-to-crest ~1.9 units vs boat freeboard 0.3. Need boat to ride waves — it does follow heightAt exactly (position y = h + offset), so relative to local water surface, boat stays at same height ✓. The boat moves up/down with the water; relative submersion constant (draft 0.27). Only slope differences (pitch/roll) cause relative variation. Since boat follows the wave height at its center, crest passing under boat: boat rises with it ✓. OK good. But visually waves of amplitude ~0.9 with wavelength 26 look like gentle ocean swell ✓; boat bobbing ±0.9 units — looks alive.

But note heightAt at boat uses undisplaced coords; Gerstner horizontal shift up to Q*A = 0.6*0.34≈0.2 — negligible.

Pitch from slope: max slope: A*k = 0.34*0.24=0.082 + 0.24*0.42=0.1 + 0.17*0.7=0.12 + 0.12*1.14=0.14 + 0.09*1.85=0.166 → total possible ~0.6 slope worst-case aligned — atan ~31° extreme; typical much less. Damp roll/pitch a bit? Multiply slope by 0.8. OK.

Rocks near shore at h≈0: check islandHeight at r=14: m = 1