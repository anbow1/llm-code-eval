I need to write a single TypeScript file that builds this scene. Let me carefully plan.

Key components:
1. Renderer setup, ACESFilmic tone mapping, sRGB output, shadows.
2. Sky: I'll do a custom gradient sky dome shader with a sun disc, or use Sky addon. Sky addon is allowed. But Sky addon requires importing from 'three/addons/objects/Sky.js'. That's fine. However Sky addon needs textures? No, it's a shader. Let's use the Sky addon for realism, and set sun position. Actually simpler: custom sky shader dome — more control over fog matching. But Sky addon looks nice. Let me use Sky addon and set sun direction matching DirectionalLight.

Hmm, the Sky addon's sun position: sky.material.uniforms['sunPosition'].value.set(...). With elevation/azimuth. Then directional light placed at that direction.

Fog: scene.fog = new THREE.Fog(color, near, far). With sky dome the fog color should match horizon. Use FogExp2 maybe. I'll use THREE.Fog with a horizon-ish color.

3. Ocean: ShaderMaterial with custom vertex shader (Gerstner/sine sum) and fragment shader with Fresnel, sun specular, foam. Need heightAt in JS matching. Use sine waves (sum of sines) so heightAt is straightforward. But requirement says Gerstner or sine — with Gerstner, horizontal displacement ignored for heightAt per spec. I'll use Gerstner but compute height exactly (the vertical part), and ignore horizontal shift for JS. Actually simpler for exact matching: use pure vertical sine sum. But Gerstner looks better. Let's do Gerstner with the vertical displacement and horizontal offsets; heightAt returns just the vertical sum of Gerstner (which is what the spec says: "for Gerstner waves ignore the small horizontal shift"). That matches the shader's y displacement as a function of the *undisplaced* x,z. Good.

Wave parameters: I'll define in GLSL as constants, and mirror in JS. To avoid duplication drift, I could generate GLSL from a JS array of wave params via string interpolation. That's nice and guarantees match. Let's do that: define WAVES array of {dir: [x,z], steepness, wavelength, speed, amplitude?}. Gerstner: 

For each wave i with direction D (normalized), wavelength L, k = 2π/L, amplitude A, phase speed c = sqrt(g/k)?? Let's just use speed = sqrt(9.8/k) scaled... simpler: phase = k * dot(D, xz) - t * speedFactor * k? Standard: 

Q_i = steepness/(k * A * numWaves) ... Let's use a simple Gerstner:

For wave i:
  float k = 2π / L;
  float c = sqrt(9.8 / k) (deep water dispersion) — optional, but scale so speed feels right.
  float f = k * (dot(D, pos) - c * t);
  A = amplitude
  pos.x += Q * A * D.x * cos(f)
  pos.z += Q * A * D.y * cos(f)
  pos.y += A * sin(f)

heightAt returns sum of A*sin(f) using undisplaced x,z. Good — the spec says that's what it wants.

Wave params: 4 waves, amplitudes 0.5,0.35,0.22,0.15 → crest-to-trough up to ~2.4... total sum of amplitudes for crest-to-trough: 2*(sum A) ≈ 2*1.22 = 2.44. Hmm spec says crest-to-trough about 0.5 to 2 units. Let's target sum A ≈ 0.7 → crest-to-trough 1.4. Good: amplitudes 0.42, 0.22, 0.12, 0.06 → sum 0.82 → c2t 1.64. Fine.

Wavelengths: 24, 14, 8, 5. Directions varying.

Steepness Q should be modest to avoid loops: Q = 0.6 maybe with k*A... Let's compute Q_i such that horizontal displacement = 0.5*A*... Keep it simple: Q = 0.5 for all? The Gerstner horizontal displacement magnitude = Q*A*D*cos. With A=0.42 and Q=0.5 → 0.21 horizontal. Fine. But the standard requires Q*A*k <= 1 to avoid cusps. For L=5, k=1.2566, A=0.06 → k*A=0.075, fine. For L=24, k=0.2618, A=0.42 → 0.11. So Q up to 1 is fine. Use Q=0.8.

Ocean geometry: PlaneGeometry(400,400, 256, 256)? 256x256 = 65k verts, fine. Actually 256 segments = 257x257 verts = 66049, 131072 triangles. Fine. But for a 400x400 plane, cells are 1.56 units. Waves with wavelength 5 will alias badly. Better: use a smaller, denser plane near the camera and a large flat one far away? Simpler: keep single plane 400x400 with 256 segments but only use longer wavelengths for the vertex displacement, and add small-scale detail in the fragment shader via normal perturbation. Let's make the vertex waves wavelengths ≥ 8. Hmm, but "at least 3 directional waves" — fine.

Alternative: use a disc geometry with radial density? Let's keep it simple: PlaneGeometry(600, 600, 256, 256) — cell size 2.34. Meh.

I'll do plane 400x400 with 256 segments (cell 1.56). Wavelengths: 32, 19, 11, 7. The 7 one will alias slightly but with 1.56 cells that's ~4.5 samples per wavelength — Nyquist okay-ish (need >2, we have 4.5). Acceptable. Actually the fragment shader normal from analytic derivative will look fine; aliasing in displacement at 4.5 samples/wave is visible as jitter but mild.

Hmm, but if the plane is only 400x400 and the camera is at (35,12,35) looking at origin, the far plane edge at ~200-280 units away will be visible with fog hiding it. Fog far ~ let's compute: distance from camera to far corner of ocean ≈ sqrt((200+35)^2 + (200+35)^2) ≈ 332. So fog should fully hide by ~300. Set fog far = 320, near = 60. And the horizon: sky dome extends. With fog on the ocean, the far ocean fades to fog color which should match the sky near horizon. Since the sky is a big dome with gradient, the horizon color should equal the fog color. I'll pick fog color to match horizon color and set the sky gradient accordingly.

Actually the Sky addon's horizon color depends on sun elevation; hard to match fog exactly. Better to make my own sky shader with a horizon color I control exactly and a sun disc. That guarantees a nice horizon match. But Sky addon looks more "game-like" with atmosphere. Hmm. I could use Sky addon and set fog color to a sampled horizon color approximately. Risky.

Let me write a custom sky dome shader:
- gradient from zenith (deep blue) to horizon (pale warm blue), plus sun glow (pow(dot(viewDir, sunDir), power)) and a sharp sun disc. Also a slight warm tint near the sun.
Fog color = horizon color. That will blend perfectly.

I'll implement sky as a large sphere (radius 500) with BackSide, depthWrite false, and material fog off. Or use a full-screen quad. Sphere is fine.

Careful: fog affects the sky material if fog:true; set fog: false.

4. Boat: Group with hull (use a shape via ExtrudeGeometry? or use a LatheGeometry / BoxGeometry scaled). Let's build a hull from a rounded shape: use ExtrudeGeometry with a 2D hull outline (points defining boat profile) extruded along... Hmm, simplest good-looking: hull via a custom BufferGeometry? Let's use a scaled sphere/box combination:

Hull: BoxGeometry with tapered ends — could use a LatheGeometry rotated... Let's do: create a hull using a "boat shape" via THREE.Shape + ExtrudeGeometry:
- Shape in XY plane: hull side profile? Actually for a boat, extrude a "top view" outline downward with bevel. 

Approach: Create the hull as an ExtrudeGeometry of a 2D hull-plan shape (top view: pointed at both ends? Sailing boat: pointed bow, flat stern. Use a shape with a pointed bow). Extrude along Z with depth = hull height, then rotate so extrusion is Y (down), and scale the ends... Extrusion gives straight sides though. 

Better: use a custom geometry via parametric approach — build hull as a series of cross-sections. That's more code but gives a nicer shape. Alternatively, use a LatheGeometry: hull is like half of a spindle. Hmm.

Practical: Use a BoxGeometry with 24x24 segments and deform vertices in JS to create hull shape (taper at bow, rounded bottom). That's easy and gives a decent hull. Let's do that:

BoxGeometry(4, 1.2, 1.6, 20, 8, 12) centered. Then for each vertex:
- u = x/2 (from -1..1), 
- taper z and y by width factor: w = sqrt(clamp(1 - u^2 ... )). Let's define:
  - t = x / 2 (in [-1,1] at ends)
  - taper = 1 - pow(|t|, 2.2) roughly → bow taper.
  - y normalized v = y/0.6 in [-1,1]; bottom rounding: z *= (1 - 0.35*max(0,-v))? and round the bottom: for lower vertices, reduce z and raise... 

Let me do a cleaner parametric hull: generate via ParametricGeometry? Not in core anymore; it's in addons ('three/addons/geometries/ParametricGeometry.js'). That exists. But writing my own is straightforward.

I'll do a custom BufferGeometry hull:
For i in 0..N (along length), j in 0..M (around cross-section). Cross-section: half-ellipse-ish (rounded V). 
Define: 
- s = i/N in [0,1] along length; x = (s-0.5)*4.
- Beam profile: beam(s) = widthScale * sin(pi*s)^0.6 maybe, tapering to 0 at bow (s=1) and narrower at stern. Let's use beam(s) = maxBeam * (0.55 + 0.45*sin(pi*s^0.8))? Hmm, want bow pointed.

Let's do: bow factor bf = pow(1 - abs(2s-1)^2.0, 0.6)? At s=0 and s=1 it's 0 (both ends pointed). I want bow pointed (front, +x) and stern rounded/flat (transom). Let's set: 
- For s in [0,1], let bow = smooth taper near s=1: shape = sqrt(max(0, 1 - pow(max(0, (s - 0.55)/0.45), 2)))... 

I'm overcomplicating. Use this: 
w(s) = 0.8 * (0.55 + 0.45 * Math.sin(Math.PI * Math.pow(s, 0.7)))
At s=0: sin(0)=0 → 0.55*0.8 = 0.44 width at stern (transom). At s=0.5: pow(0.5,0.7)=0.616, sin(0.616π)=0.93 → ~0.99*0.8=0.79. At s=1: sin(π)=0 → 0.44. Hmm bow also 0.44 — not pointed. 

Instead: taper the bow region strongly: multiply by (1 - 0.9*smoothstep(0.7,1,s)). And keep stern wide-ish.

Simpler explicit formula:
w(s) = 0.85 * (1 - 0.75 * Math.max(0, s - 0.7)/0.3) for s>0.7... and for the stern, slightly narrower: 
Let me define: 
let halfBeam = 0.8 * (1 - 0.85 * Math.pow(Math.max(0,(s-0.5))/0.5, 1.6)); // tapers to 0 at bow
and stern: for s < 0.15, taper a bit: multiply by smoothstep? Keep stern flat-ish: use 0.9 factor.

Actually a flat transom is fine and looks boaty. Let's just do:
- s from 0 (stern) to 1 (bow)
- halfBeam = 0.8 * (1 - Math.pow(Math.max(0, (s - 0.35)/0.65), 1.8)) * (0.92 + 0.08*Math.sin(Math.PI*s))
At s=1: 0.8 * (1 - 1) = 0 → pointed bow. At s=0: 0.8 * (1-0) * 0.92 = 0.736. At s=0.5: (0.15/0.65)=0.23^1.8=0.0645 → 0.8*0.935*1.02≈0.763. Good, wide midship, pointed bow, moderately wide stern.

- Cross-section: for angle phi in [0, π] maybe: we want a U-shaped hull from gunwale (top edge at y=0.35) down to keel at y=-0.45. Parametrize with theta from 0 (starboard gunwale) to π (port gunwale):
  z = halfBeam * cos(theta) → at theta=0, z=+halfBeam, at π, z=-halfBeam. Good.
  y = topY - depth * pow(sin(theta), 0.8)... at theta=0, sin=0 → y=topY; at theta=π/2 → y = topY - depth (keel). Good, that's a U shape. But then we also should shrink z near the keel to make a V-ish. Actually y = topY - depth*sin(theta)^0.8 and z = halfBeam*cos(theta) gives a nice rounded hull cross-section (like an ellipse bottom). But the "depth" of the cross-section varies along the boat: deeper at midship, less at bow. depth(s) = 0.55 * (something).

Also, the deck: a flat top. We can close the top with a deck geometry (a flat polygon at y=topY). Let's build the hull as a closed-ish surface: cross-sections from theta=0..π sweep the outside; then add a deck as a separate flat mesh (ExtrudeGeometry not needed—just build a triangle fan/strip along the outline).

Simpler: build hull surface as a grid over (s, theta) with theta in [0, π], giving outer skin. Then build a deck: for each s, a strip from z=-halfBeam*? Hmm, at theta=0 z=+beam, at theta=π z=-beam. Deck should be a flat surface spanning z from -beam to +beam at y=topY. That's a grid over (s, t in [-1,1]) with z = t*halfBeam(s), y=topY. That's easy too. Then close the stern with a cap: at s=0, the transom is a flat face — the cross-section there is a U; we can just leave it open or add a small cap. With a solid double-sided material or just accept a tiny hole. I'll add a transom cap as a triangle fan from cross-section points at s=0.

Actually since the camera is far away and above, holes at the stern won't be too visible... but shadows might reveal. Let's do it properly-ish: build hull skin + deck + transom cap. It's all doable with manual buffer geometry but a lot of code. 

Alternative cheaper approach that still looks good: Hull = extruded shape with bevel.
Use THREE.Shape for the deck plan (top view): a rounded hull outline with pointed bow:
- shape.moveTo(-1.8, -0.6)... define points.
Then ExtrudeGeometry with depth 0.7, bevelEnabled true, bevelSize 0.15, bevelThickness 0.15. Rotate -90° about X so extrusion goes downward. Scale the lower part? The extrusion produces vertical sides — a slab with beveled edges. Looks like a barge, not great, but with a cabin, mast, sail, and it's small on screen, acceptable? "Graphics quality matters" — I want it to look decent.

Hmm. Let me do the manual hull — I'm confident I can write it compactly.

Plan for hull geometry:
```ts
function makeHullGeometry(): THREE.BufferGeometry {
  const NS = 24; // along length
  const NT = 16; // around cross-section (0..PI)
  ...
}
```
Build positions, uv, and normals via computeVertexNormals.

Then deck as separate flat grid (NS x 4). Then transom cap.

Actually I can merge: build the hull with theta from 0..π and additionally a deck strip. Let me just create three BufferGeometries and merge? Without BufferGeometryUtils import... I can import BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'. That's allowed (addons). Or just add three meshes to the group — fine, "at least 3 meshes in one Group" so more meshes is fine.

Boat parts:
- hull (dark blue/white painted), 
- deck (wood color), 
- cabin (box), 
- mast (cylinder), 
- boom, 
- sail (a curved plane — use PlaneGeometry with a slight curve, or a Shape + ShapeGeometry for a triangular-ish sail). Let's use a sail made from a custom geometry: a quad with curvature (billowing). Or simpler: PlaneGeometry(1.6, 2.2, 8, 8) with vertices pushed to billow, positioned as a triangular-ish... A plane rectangle sail is fine for a sloop if I taper it. Let's make a custom BufferGeometry for the sail: a triangle-ish quad with billow.

Simplify: sail as a shape geometry: THREE.Shape with points (0,0), (1.5,0.2), (0.15, 2.6)... then ShapeGeometry with curveSegments. Then rotate and add billow by displacing along z with a smooth function based on uv? ShapeGeometry gives flat. Billow: iterate positions, z += 0.12 * sin(...). Doable.

Let's keep the sail as a triangular mainsail attached to mast and boom, slightly curved.

I'll write:
```ts
const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.lineTo(1.4, 0.05);
sailShape.lineTo(0.1, 2.4);
sailShape.lineTo(0, 2.4);
sailShape.lineTo(0,0);
const sailGeo = new THREE.ShapeGeometry(sailShape, 12);
// billow: displace z by sin(y) etc.
```
Hmm ShapeGeometry triangulates the shape. Displacing z by a function of position gives billow. Good enough.

Boat orientation: hull length along X (bow at +X). Mast at x slightly aft of center. Sail plane in XY (width along X, height along Y) — that's a fore-aft sail. Good, and it billows in Z.

Then boat floats at (12, 0, 14). Boat drift: keep within 25 units of origin. Base position (12, 14) has radius ~18.4. Drift slowly with a sine of amplitude ~3 → radius up to 21. Ok, or keep it nearly stationary with small drift: x = 12 + 2*sin(0.07 t), z = 14 + 2*cos(0.05 t). Max radius ~ sqrt(14²+16²)= 21.3. Fine (< 25).

Boat y = heightAt(x,z,t) + offset (0.15 maybe, hull's center). The boat group origin should be at the waterline: hull built with y=0 at waterline, so the boat rocks around the waterline. Boat y = heightAt + 0.0 (plus small constant). Hull top at y≈0.35, keel at -0.45. Good.

Pitch and roll: sample heightAt at bow (x+2,z) and stern (x-2,z) → pitch = atan2(hFront - hBack, 4) — rotate around Z axis? If boat's forward is +X, pitch is rotation about Z... In three.js, rotation.z tilts the X axis up/down. For an object with forward +X, pitch = rotation about Z axis (negative?). Let's compute:
- hFore = heightAt(x + L, z), hAft = heightAt(x - L, z)
- pitchAngle = Math.atan2(hFore - hAft, 2L) → the angle the boat should tilt so that the bow rises. Rotating about Z by +θ moves +X axis toward +Y. So rotation.z = +pitchAngle? If bow is higher, we want +X end up → rotation.z positive. Wait: rotating about Z by θ maps (1,0,0) → (cosθ, sinθ, 0), so +X goes up for θ>0. Yes, rotation.z = atan2(hFore-hAft, 2L). Hmm but careful: rotation applied to the group also rotates the sample points... it's fine, approximate.

Actually with Euler order XYZ default, rotation.z applied first? Order XYZ means R = Rx*Ry*Rz? In three.js, Euler XYZ means rotations applied in the order X then Y then Z in terms of... The resulting matrix is R = Rz? Let's not worry — small angles.

But roll uses the port/starboard sample: hStar = heightAt(x, z + B), hPort = heightAt(x, z - B). Roll about X axis: rotating about X by φ maps (0,0,1) → (0, -sinφ, cosφ)... Actually Rx(φ): y' = y cosφ - z sinφ, z' = y sinφ + z cosφ. So the point (0,0,1) → (0, -sinφ, cosφ). For the starboard side (+z) to go up, we need φ negative. rollAngle = atan2(hStar - hPort, 2B) then rotation.x = -rollAngle. Let's verify: we want +z end up when hStar > hPort. Rx(θ) with θ<0 gives z-axis point (0,0,1) → (0, sin(-θ)... let's compute: Rx(θ) matrix: [1,0,0; 0,cosθ,-sinθ; 0,sinθ,cosθ]. Applied to (0,0,1): (0, -sinθ, cosθ). So y-component = -sinθ. For y>0 we need θ<0. So rotation.x = -atan2(hStar - hPort, 2B). Yes.

Also add slight yaw drift.

5. Island: procedural. Build a radial grid mesh: height = peak * exp(-r²/σ²) with noise. Colors by vertex colors: sand near water, grass higher, rock at peak.

Island radius ~ 22 (across 44). Peak 9 units.

Build with a custom BufferGeometry: polar grid: rings R=40, segments S=64. For ring i (r from 0 to R_max), angle j. Height function:
h(r, θ) = terrain
- base: 9 * exp(-(r/12)^2) → at r=0, 9; at r=12, 3.3; at r=22, 0.35.
- Add noise: use a deterministic pseudo-noise (hash-based value noise) with a few octaves, amplitude scaled by the base.
- Ensure h >= some negative to slope into sea: at r > 20, h goes slightly below 0 so the shoreline is natural. Let h = base - 0.6 + noise. Then the waterline is where h = 0.

Actually let's do: h(r,θ) = peakShape(r) * (1 + 0.35*noise(θ, r)) - 0.8, and clamp so it dips under water at edges. Then the island edge below water is hidden by the ocean. Good. Also the ocean is opaque so underwater terrain is hidden — fine, but at the shoreline we want sand visible. Good.

Vertex colors: 
- h < 0.35: sand (0xE8D9A8 with variation)
- 0.35 < h < 2.5: mix sand → grass (0x6B9B4A)
- higher: rock (0x8A8377) near peak.
Add noise-based variation.

Also add a slightly "flat-ish" beach.

Number of vertices: 40*64 ≈ 2560 — fine, use flat-ish shading with computed normals.

Also the island is centered on the origin and the camera looks at (0,2,0). The boat at (12,0,14) is next to the island. Camera at (35,12,35) looking at origin — island in center, boat at (12,14) in front-left area. Fine.

Note: island peak 9 units at origin, camera at (35,12,35) looking at (0,2,0) → the island might block the view? It's fine.

Hmm — a peak of 9 at the origin with radius 22, and the camera at distance ~51 with height 12. The island top at y=9 covers a good chunk. The boat at (12,14) is on the near side, water around it. OK.

Actually, should the island be centered at origin and the boat 18 units away — the boat is right at the island's shore (island radius ~22 at water level maybe ~18). Boat at radius 18.4 could be on land! Need to check the island's actual shoreline radius. Let's design so that the terrain reaches y=0 at about r = 15-16, and the boat at r=18.4 is in the water. Then the boat is right next to the shore. Nice. But with noise the shoreline varies; make sure the boat position stays in water. Maybe make the boat base position (14, 16) → r=21.3, with drift up to 24. Hmm "staying within 25 units of the origin" — so radius ≤ 25 always. Let's put the boat at (15, 16) radius 21.9, drift ±1.5 → max ~23.4. And island shoreline at r≈14. Good.

But the spec says "floating at about (12, 0, 14)". So x≈12,z≈14 → r≈18.4. Keep base at (12,0,14) and shoreline at radius ~15 max → but with noise a bump could reach 18. I'll make the island's radius parameter so that terrain is below water beyond r=15. Then heightAt at the boat is water. Good. Island "about 30 to 50 units across" → 30-50 across means radius 15-25. With shoreline radius 15, the island is 30 across. Good, satisfies the range. Maybe extend slightly: shoreline at r≈17 → 34 across. But then the boat at 18.4 is very close to shore. That's fine and looks nice actually — boat next to the beach. But risk of the boat sitting on terrain. Let's use shoreline radius 14-15 (island ~30 across) and add a few offshore rocks maybe. Keep it simple.

Let me define terrain:
```
function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  // radial falloff
  const base = 10.5 * Math.exp(-Math.pow(r/9.5, 2.2)) - 0.6;
  // noise
  ...
}
```
At r=0: 10.5*1 - 0.6 = 9.9 peak. Good (5-15).
At r=9.5: 10.5*exp(-1)=3.86-0.6=3.26.
At r=14: 10.5*exp(-(14/9.5)^2.2)= 10.5*exp(-(1.474)^2.2)= exp(-2.44)=0.0872 → 0.916-0.6 = 0.32. Hmm still above water at r=14. At r=16: (1.684)^2.2 = e^(2.2*ln1.684)=e^(2.2*0.521)=e^1.146=3.146 → exp(-3.146)=0.0431 → 0.452-0.6 = -0.15. Below water. Shoreline ~r=15.
With noise ±0.6 the shoreline varies between 13 and 17. The boat at r=18.4 is ok, but let's push the boat a bit: base (12,14) → keep, and make the noise amplitude smaller near the shore.

Also the ocean's shallow color should be visible near the shore. In the water shader, I can compute depth by checking the island height... that's expensive in GLSL. Alternative: pass a "shore" tint using a simple analytic island height function in the shader (the same exp-based one, ignoring noise). That gives a nice turquoise near the island. Cheap: one exp call. Let's do it — compute isl = islandHeightApprox(pos.x, pos.z), and if isl > -3 (shallow), tint toward turquoise and add foam near the waterline. 

I'll do that: in the fragment shader compute aShore = smoothstep(-2.5, 0.2, islandApproxHeight). Color mix to turquoise, plus foam band near |h| < 0.3 based on wave height + noise. That satisfies "foam near crests or near the shore".

Actually careful: The shader is on the ocean plane covering 400x400, so the island region is also rendered by the ocean plane (underneath the island, hidden). Fine.

6. Palm trees: at least 5. Trunk: curved — build via a TubeGeometry with a CatmullRomCurve3 (curved). Leaves: all leaves of all palms in ONE InstancedMesh with ≥30 instances. E.g., 7 palms × 8 leaves = 56 instances. Each leaf is a tapered shape — a plane with a curve, or a custom geometry (a bent, tapered blade). Use a simple leaf geometry: PlaneGeometry(0.35, 2.2, 1, 6) bent along its length, tapered. Or a custom geometry with a few triangles.

Leaf geometry: make a plane 0.5 wide × 2.4 long, with segments along the length, taper width by sin, and droop by bending y downward as a function of length. Then position the leaf at the crown and rotate around Y.

For the InstancedMesh, each instance matrix = compose(position, quaternion, scale). Every frame update with sway: rotate the leaf about its base to sway in the wind. Use Matrix4 composition: for each leaf, base orientation (a quaternion from yaw + pitch + roll) times a sway rotation. Use dummy Object3D and set matrix.

Instanced mesh count = 56 (or more). Must update every frame. Fine.

Also exposed as (window as any).__leaves.

Trunks: use Mesh with TubeGeometry per palm (7 meshes) or merge. Fine, 7 tube meshes. Plus coconuts maybe.

7. Sun light: DirectionalLight with shadow camera covering island and boat (±30 or so), shadow map 2048. Also HemisphereLight.

Sun direction: let's put the sun at elevation ~25°, azimuth ~ 40°. Position = direction * 100.

Sky dome: custom shader with sun direction uniform.

8. Camera exactly at (35,12,35), lookAt (0,2,0). OrbitControls allowed but must not auto-move. I'll add OrbitControls with target (0,2,0) — it's allowed. Actually the spec says "keep this view (OrbitControls are allowed if they start there and do not move by themselves)". Adding OrbitControls with damping is fine. But there's a risk: OrbitControls needs `controls.update()` each frame. Fine. Actually, simpler: skip OrbitControls entirely to avoid issues. But maybe nice for a "game" feel. I'll include it — no, potential issue with tests? Tests probably just check camera position. OrbitControls doesn't move the camera on its own. I'll skip to keep it simple and safe. Hmm, but being able to orbit is nice. I'll skip it; less code, less risk.

9. Testing hooks: __scene, __camera, __renderer, __ready, __ocean, __boat, __island, __leaves, __sun.

Note __ocean must be assigned before/at start.

Now, wave time: shader uses `uTime` uniform, and I set it each frame as elapsed. `time()` returns the current uniform value. The shader's internal time = uTime. But careful: I want a smooth continuous wave time; using clock.getElapsedTime() is fine.

Now let's write the ocean shader.

Vertex shader:
```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;
varying vec2 vGridPos;
... wave struct
```
We need the plane geometry rotated -PI/2 about X so it lies in the XZ plane. Then the vertex positions in local space are (x, y, 0) → after rotation they become (x, 0, y)... To keep it simple, I'll construct the plane geometry and apply `geo.rotateX(-Math.PI/2)` so the geometry's positions are already in the XZ plane with y=0. Then in the vertex shader, position.xz are the undisplaced positions. Good.

Vertex shader code:

```glsl
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
varying vec2 vXZ;

#define NW 4
const vec2 dirs[4] = ...
```
GLSL ES 1.0 (WebGL2 → GLSL 3.0 via three's ShaderMaterial? three compiles with `#version 300 es` for WebGL2 automatically? Actually three converts shader chunks; for ShaderMaterial with WebGL2, three prepends `#version 300 es` and does the attribute/varying conversion? No — three's WebGLProgram handles GLSL1 by default; for RawShaderMaterial you write your own. For ShaderMaterial, three adds `#version 300 es` only if glslVersion is set to THREE.GLSL3. By default it uses GLSL1 style and three's WebGL2 renderer compiles them fine (WebGL2 supports GLSL ES 1.00). So use GLSL1 syntax: attribute/varying, no const arrays? Actually GLSL ES 1.00 supports const arrays with constant index only. Indexing with a loop variable that's a constant expression works in practice but is technically restricted. Safer: unroll manually, or use a macro.

I'll generate the shader source from JS with template literals, unrolling the waves via a generated string. That's the cleanest and guarantees JS/GLSL matching.

```ts
interface Wave { dirX: number; dirZ: number; wavelength: number; amp: number; speed: number; q: number; }
const WAVES: Wave[] = [...];
```
For each wave generate GLSL lines:

```glsl
{
vec2 d = vec2(dx, dz);  // normalized
float k = K;
float c = C;  // phase speed in units/sec
float f = k * (dot(d, p) - c * uTime) + PHASE;
float a = A;
p.x += Q * a * d.x * cos(f);  // hmm wait Gerstner
p.z += Q * a * d.y * cos(f);
p.y += a * sin(f);
}
```
Where the Gerstner horizontal displacement uses cos and vertical uses sin. Note d is the direction in the XZ plane, with d.y corresponding to z. Ok.

Amplitude scaling: displacement horizontal = Q*a*cos(f). With Q = 0.6.

Also the normal: for the analytic normal of the Gerstner sum, it's easier to compute via the derivative. Alternative: compute the normal by finite differences using the same function (sample height at p+ε in x and z). That's 2 extra evaluations per vertex — but with unrolled code it's 3× the cost. Alternatively compute the tangent analytically.

For a Gerstner wave sum with horizontal displacement, the exact normal:
Let P(p) = p + sum_i (Q_i A_i D_i cos(f_i), A_i sin(f_i)). The tangent vectors:
∂P/∂x = (1 - sum Q A k Dx Dx sin f, sum A k Dx cos f, -sum Q A k Dz Dx sin f) hmm getting messy.

Simpler robust approach: compute the height function gradient analytically but ignoring the horizontal displacement (i.e., treat the surface as y = h(x,z)). That's the standard approach for cheap water normal. So:

∂h/∂x = sum A_i k_i D_i.x cos(f_i)
∂h/∂z = sum A_i k_i D_i.z cos(f_i)
normal = normalize(vec3(-dhdx, 1, -dhdz)) in world space (Y up). 

Since the geometry is in XZ plane, we compute in the vertex shader and pass out. Then in the fragment shader, we can also add small-scale detail normals from a procedural noise for sparkle. Good.

Note the camera is far and waves fairly small — the specular highlight needs decent normals. I'll add high-frequency detail in the fragment shader using derivative-based noise or a couple of extra high-frequency sine waves that don't displace geometry.

Fragment shader:
- input: world position, normal (interpolated), height, xz.
- view dir = normalize(cameraPosition - world)
- fresnel = pow(1 - max(dot(N, V), 0), 5) → mix base color to sky color.
- sky color: compute a simple gradient based on the reflected ray direction. reflect ray R = reflect(-V, N). Then skyColor = mix(horizonColor, zenithColor, smoothstep(0,1,R.y)) + sun glow.
- specular: blinn-phong: pow(max(dot(N, H),0), 300) * sunColor * intensity; plus a broader highlight.
- deep vs shallow: shallow near the island (or use height to tint crests). Use view-dependent: base deep color 0x03243a, shallow 0x1c7d8c. Add a bit of a "subsurface" brightening at crests.
- foam: crest foam where height > threshold, and shore foam near the island.
- fog: apply fog manually in the fragment shader since ShaderMaterial doesn't auto-apply fog unless we set fog: true and include the chunks. Actually ShaderMaterial with `fog: true` gets fog uniforms injected (fogColor, fogNear/Far) and defines, but you must include the fog chunks in your shader (`#include <fog_pars_fragment>` and `#include <fog_fragment>`). That works. But I can also just do it manually with uniforms — simpler and reliable. But `scene.fog` is required by the spec. So set scene.fog = new THREE.Fog(...) — and use it manually with my own uniforms. Hmm, if `fog: true` is set on the ShaderMaterial, three injects fog uniforms. Then `#include <fog_pars_fragment>` gives `vFogDepth` etc. Honestly easier: use my own uniforms uFogColor, uFogNear, uFogFar and just make sure they're consistent with scene.fog. Also set the material's `fog: true` so the built-in materials (boat, island) get fogged correctly. Actually built-in materials get scene.fog automatically.

I'll do manual fog in the ocean and sky shaders.

Ocean size: 400x400 = spec "at least 400x400 centered on origin". Use 600x600? The grid cell size grows. With 256 segments over 600 → 2.34 cell. With 400 → 1.56. Use 400x400 with 256x256 segments. Fog far ~330 so the edges fade. Actually will the ocean edge be visible? The plane spans [-200,200]. The camera at (35,12,35) looking at origin. The far edge is at distance ~ sqrt(235² + 235²) = 332 (corner) and the near edge behind the camera. FogFar = 300 would make far ocean fully fogged. The horizon: since the plane is finite and at y≈0, we'd see the sky below the horizon line beyond the plane edge... Actually the camera is 12 units above the water looking slightly down; the horizon (infinite ocean) would be at the eye level. With a finite plane, the far edge appears below the true horizon, and beyond that we'd see the sky dome's lower part. If the fog blends the water to the sky horizon color, and the sky dome's bottom half is also that horizon color, it'll be seamless. So I'll make the sky shader's lower hemisphere fade to the horizon color. Good — that's the standard trick.

So sky: for y<0 (below horizon), just use the horizon color (maybe slightly darker). And the ocean fog color = horizon color. Seamless.

Now the Sky dome radius: 1000 with the fog of the sky disabled. The camera far plane: 2000.

Fog: THREE.Fog(color, 40, 330). Hmm near 40 might fog the boat (distance from camera to boat ~ sqrt(23² + 12² + 21²) ≈ 33). Boat at distance ~33 < 40 so it's unfogged. Fine, keep fog near = 60, far = 340.

Hmm, but then the island center is at distance 51 → fog factor (51-60)... negative → 0. Good, unfogged. Ocean near the horizon gets fogged out. 

Let me now also handle the "shallow water" tint. In the fragment shader:
```glsl
float isl = islandApprox(vWorld.xz);
float shallow = smoothstep(-4.0, 0.0, isl); // 0 deep, 1 at shoreline
```
islandApprox returns terrain height (approx, ignoring noise). Then mix deep→shallow color, and add foam:
```glsl
float shoreFoam = smoothstep(0.9, 0.2, abs(isl + waveHeight)) ...
```
Actually simpler: foam where isl > -1.0 and isl < 0.6 → a band along the shore. Add some animation with sin.

Let's approximate the island height in GLSL with the same exp formula (no noise) so it's cheap. I'll pass it as a GLSL snippet generated from the JS parameters. Actually just hardcode the numbers in GLSL and keep the JS version matching (only for color, doesn't need to match exactly). But better: generate both from constants.

Now, wave heights and the island: the water surface at the shore moves up and down 1.6 units, so the shoreline foam band shifts. Use `float shoreDist = isl - vHeight` ... Hmm: the water surface world y = vHeight (wave height). The terrain height at that xz is isl. If vHeight > isl, the water covers the terrain. Foam appears where the water depth (vHeight - isl) is small. So:
```glsl
float depth = vHeight - isl;
float shore = smoothstep(2.5, 0.0, depth); // 1 where shallow
float foamShore = smoothstep(0.45, 0.0, depth) * step(0.0, depth+0.3);
```
Careful with positive/negative. When depth < 0, the terrain is above the water (dry land; the water plane is below the sand, hidden by the island mesh) — the fragment still renders but it's behind the island... actually the water plane at y~0 vs the island at that location: the water plane is at y = waveHeight, which could be below or above the sand. Since the island is solid and the water plane is a flat sheet, the water plane is hidden where the island terrain is above. But the ocean plane is at y≈0 (plus waves) and the island slopes up; there will be a clean intersection line. Good.

So near the shore, foam: `foam = smoothstep(0.6, 0.0, depth) ` for depth in [0, 0.6]. Good.

Also crest foam: based on the wave height relative to something, plus the sum of the steepness. Use `float crest = smoothstep(0.55, 0.95, vHeight / maxAmp)` with some noise. And keep it subtle.

Now let's talk about the boat's shadow: DirectionalLight with shadow camera covering the island and the boat: the island radius ~15, so a shadow camera of ±35 centered at the origin covers the boat too. shadow.mapSize 2048.

Shadow bias to avoid acne: -0.0005? Use normalBias 0.05.

Now, the boat needs castShadow on each mesh, and the island receiveShadow. Ocean: it can receive shadows too, but a custom ShaderMaterial doesn't support shadows automatically. Skip (the ocean receiving shadows is nice, but adding shadow map sampling to a ShaderMaterial requires including the shadow chunks). Since the boat is small and far, skip ocean shadows. Actually, a boat's shadow on the water adds a lot of realism... skip to reduce complexity. Hmm. It's a nice touch but the wave displacement complicates it. Skip.

Let's write the code.

```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
```

Note: `renderer.outputColorSpace` exists in r152+. Fine.

TS strict: window.devicePixelRatio is a number, fine.

Scene, camera:
```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.5, 2000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);
```
Wait, camera.lookAt with the camera's default up. Fine.

Fog:
```ts
const FOG_COLOR = new THREE.Color(0x9fc4d8) // horizon-ish
scene.fog = new THREE.Fog(FOG_COLOR, 70, 340);
```
Hmm the fog color should match the sky's horizon. Let's design the sky colors first:
- Zenith: #2b6fb8-ish (but with tone mapping ACES applied...). Wait: the sky shader output goes through tone mapping. Since I write the shader myself, I need to output linear colors. For a ShaderMaterial, the output is treated as linear and then tone mapping + sRGB conversion is applied by three (three applies tone mapping in the fragment shader only for built-in materials? No — for ShaderMaterial, tone mapping is applied via the `tonemapping_fragment` include, which is only added if the material's shader includes it. Actually three's WebGLProgram replaces `#include <tonemapping_fragment>` in the shader. Since I write custom shaders without those includes, no tone mapping or color space conversion is applied. Hmm — actually three appends `#include <colorspace_fragment>`? No. For custom ShaderMaterials you must handle the encoding yourself.

Right: three r152+ with outputColorSpace = SRGB: built-in materials include `<colorspace_fragment>` which converts linear → sRGB. Custom shaders must do it themselves. But wait — for ShaderMaterial, three's WebGLProgram adds a prefix and does include resolution; the shader author must include tonemapping/colorspace chunks manually.

So my ocean and sky shaders should end with:
```glsl
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
These operate on `gl_FragColor`. In three's shader chunks: `tonemapping_fragment` does `gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );` — wait, it's `#if defined( TONE_MAPPING ) gl_FragColor.rgb = toneMapping( gl_FragColor.rgb ); #endif`. The TONE_MAPPING define is added by the renderer based on the renderer's toneMapping... Let me check: In WebGLProgram, `parameters.toneMapping` is set based on the renderer's tone mapping and material.toneMapped. And the prefix includes `#define TONE_MAPPING` and the toneMapping function definitions when toneMapping !== NoToneMapping. Yes, three includes the tonemapping_pars_fragment in the prefix for all materials? Let me recall WebGLProgram.js:

```js
prefixFragment = [
  ...
  parameters.toneMapping !== NoToneMapping ? '#define TONE_MAPPING' : '',
  parameters.toneMapping !== NoToneMapping ? ShaderChunk['tonemapping_pars_fragment'] : '',
  parameters.toneMapping !== NoToneMapping ? getToneMappingFunction('toneMapping', parameters.toneMapping) : '',
  ...
].join('\n')
```
Yes — that's in the fragment prefix for all shaders (including ShaderMaterial). And `parameters.toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping`. So for a ShaderMaterial with toneMapped=true (default), TONE_MAPPING is defined and `toneMapping()` exists in scope. So including `#include <tonemapping_fragment>` works. And `<colorspace_fragment>` uses the `linearToOutputTexel` function which is added in the prefix too (`parameters.outputColorSpace`). Let me verify: in WebGLProgram the fragment prefix includes `ShaderChunk['colorspace_pars_fragment']` and `getTexelEncodingFunction(...)`. In recent versions, yes: `getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputColorSpace )`. This is included for all materials I believe. Yes, it's in the prefixFragment array unconditionally (for r15x+).

So I can safely use `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at the end of my custom shaders. That gives consistent ACES tone mapping with the rest of the scene. 

Then my sky colors as authored (linear values I pick) will be tone-mapped. I should pick colors that look good after ACES. ACES darkens/desaturates bright colors. I'll just pick nice values and boost brightness a bit (e.g., multiply by 1.2).

Alternatively set `toneMapped: false` and handle it manually... no, keep it consistent. Use the includes.

Hmm, but with fog: the fog color passed to the built-in materials is a THREE.Color which three converts to working color space (linear) — `scene.fog.color` is in sRGB when you set from hex? THREE.Color from hex applies color management: `new THREE.Color(0x9fc4d8)` → convertSRGBToLinear if THREE.ColorManagement is enabled. Yes, by default ColorManagement.enabled = true and colors are converted to linear-srgb working space. So scene.fog.color is linear. For my custom fog uniform I should pass the same color (linear) and treat it as linear in the shader, then tone-map the final result — consistent with built-in materials which apply fog in linear then tone map. 

So: in the ocean fragment shader, compute the color in linear, mix with the fog color (linear), then tonemap + colorspace. 

For the sky, I'll author the colors in linear (i.e., pick sRGB hex and convert with THREE.Color which converts to linear). Then the sky output goes through ACES. And the fog color must equal the sky's horizon color *before* tonemapping so the blending is seamless... Well, actually if the ocean is fully fogged and the sky is the horizon color, then both go through the same tonemap → identical. Good, as long as I use the same linear color value. But careful: the sky's horizon isn't a constant; it varies with the sun glow near the sun. The seam will be slightly visible near the sun but that's ok. I could make the sky's below-horizon color exactly the fog color and add a small sun glow contribution that fades near the horizon. Fine.

Let's define colors:
- SKY_ZENITH: 0x1e5fa8 → hmm linear. Let's use nicer: zenith #2a6cb0, mid #7fb5d8, horizon #cfe3ea (hazy). Then ACES will darken them. Let's boost: horizon 0xdfeef2.
- Fog color = horizon color.

Hmm, if the sun is low, the horizon near the sun should be warm. I'll add a warm tint near the sun azimuth. Not required for a perfect seam.

Let's simply make the sky: 
```glsl
vec3 dir = normalize(vWorldDir);
float h = dir.y;
vec3 sky = mix(uHorizon, uZenith, pow(smoothstep(0.0, 1.0, max(h,0.0)), 0.55));
// sun glow
float sd = max(dot(dir, uSunDir), 0.0);
sky += uSunColor * pow(sd, 64.0) * 0.6 + uSunColor * pow(sd, 8.0) * 0.12;
// sun disc
sky += uSunColor * smoothstep(0.9995, 0.9998, sd) * 30.0;  // hmm
```
For the sun disc, use a smoothstep on the angle: `float disc = smoothstep(0.9993, 0.9999, sd)`. With a radius ~0.02 rad. That's small. Let's use `smoothstep(cos(0.012), cos(0.008), sd)` → cos(0.012)=0.999928, cos(0.008)=0.999968. So `smoothstep(0.999928, 0.999968, sd)`.

Actually let's do: `float ang = acos(clamp(sd, -1.0, 1.0)); float disc = 1.0 - smoothstep(0.010, 0.016, ang);` and the glow `exp(-ang*ang*...)`. Simpler with pow.

Also the sun disc will be very bright and get tone-mapped down — set intensity ~20 in linear so it appears white-hot. Fine.

Below the horizon: `sky = mix(uHorizon, uHorizon*0.85, smoothstep(0.0, -0.2, h))`. Just make it the horizon color.

Now the boat.

Let me write the hull geometry function.

```ts
function createHullGeometry(): THREE.BufferGeometry {
  const NS = 28; // along length (0=stern, 1=bow)
  const NT = 18; // around section
  const LEN = 4.0;
  const positions: number[] = [];
  const indices: number[] = [];
  // cross-section: theta 0..PI
  const halfBeam = (s: number) => {
    const taper = 1 - Math.pow(Math.max(0, (s - 0.35) / 0.65), 1.7);
    return 0.78 * taper * (0.9 + 0.1 * Math.sin(Math.PI * s));
  };
  const depth = (s: number) => 0.62 * (0.55 + 0.45 * Math.sin(Math.PI * Math.pow(s, 0.6)));
  ...
}
```
Hmm, depth at s=1 (bow) = 0.62*(0.55+0.45*sin(π))=0.62*0.55=0.34. At s=0 (stern) = 0.34. At s=0.5: pow(0.5,0.6)=0.66, sin(0.66π)=0.876 → 0.62*(0.55+0.394)=0.585. Good.

Deck at y = DECK_Y = 0.34 (above waterline). So the hull's top edge is at y=0.34, and the keel is at 0.34 - depth → -0.24 at midship. Hmm, that's shallow — the hull barely goes below water. It's fine visually (the water hides the bottom). Actually with waves of ±0.8, the boat's y = heightAt + offset, so it rides the waves. Let's set the deck at y=0.35 and the keel at about -0.55 at midship (depth 0.9). Then the waterline crosses the hull nicely. Let's set depth(s) = 0.95*(0.5+0.5*sin(...)) → at midship 0.88, at the ends 0.475.

Ok.

Vertex generation:
```ts
for (let i = 0; i <= NS; i++) {
  const s = i / NS;
  const x = (s - 0.5) * LEN;   // -2 .. 2, bow at +2
  const hb = halfBeam(s);
  const dp = depth(s);
  for (let j = 0; j <= NT; j++) {
    const th = (j / NT) * Math.PI;
    const z = hb * Math.cos(th);
    const y = DECK_Y - dp * Math.pow(Math.sin(th), 0.85);
    positions.push(x, y, z);
  }
}
// indices
for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
  const a = i*(NT+1)+j, b = a + (NT+1), c = a+1, d = b+1;
  indices.push(a,b,c, ... ) // winding
}
```
Winding: we want outward-facing normals. Let's just use computeVertexNormals and set side to DoubleSide to be safe? For a watertight-ish hull, correct winding matters for lighting. Let me reason: increasing x = toward the bow, increasing th goes from z=+hb (starboard) to z=-hb (port), passing through the keel. The outward direction... At th=π/2 the point is at the keel (bottom center), outward = -Y. Take the triangle (a, b, c) with a=(i,j), b=(i+1,j), c=(i,j+1). Vectors: b-a ≈ +x direction, c-a ≈ direction of increasing th (from +z toward the keel = -y and -z at th near 0). Cross product (b-a) × (c-a): (+x) × (0,-δ,-δz) = x̂ × (-δŷ - δẑ) = -δ (x̂×ŷ) - δ(x̂×ẑ) = -δ ẑ + δ ŷ = (0, +δ, -δ). Hmm, at th near 0 the outward is +z (starboard); we got -z. So the winding is inverted. Use (a, c, b) instead. Let me just use DoubleSide for the hull material? That doubles the shading weirdness but is safe. Better: use `side: THREE.DoubleSide` only if unsure... Actually let's use FrontSide with the correct order (a, c, b) hmm let me recompute more carefully.

Let me define the vertex grid: index i along the length (x increasing), j along the section (th increasing, y decreasing from the deck to the keel, z going from +hb to -hb).

Quad corners: A=(i,j), B=(i+1,j), C=(i,j+1), D=(i+1,j+1).
Triangle 1: A, B, C? Normal = (B-A) × (C-A).
B-A = (Δx, 0, 0) ≈ +x.
C-A = (0, Δy<0, Δz<0) at th small (near the deck, starboard side going toward the keel).
(B-A)×(C-A) = (Δx,0,0) × (0,Δy,Δz) = (0*Δz - 0*Δy, 0*0 - Δx*Δz, Δx*Δy - 0) = (0, -ΔxΔz, ΔxΔy).
With Δx>0, Δy<0, Δz<0: (0, -(+)(-) , (+)(-)) = (0, +, -) → points +y, -z. At th≈0 (starboard, near the deck), outward is +z and up. We get -z. Wrong. So use triangle A, C, B → normal flips → (0, -, +)?? Wait that gives -y, +z. Hmm at the deck edge the outward normal is mostly +z (sideways), so (0,-,+) with a small -y... that's plausible if Δy is small near the deck. Actually near th=0, sin(th)=0 so y doesn't change much with th (derivative of sin^0.85 at 0 is infinite though). Hmm, at th=0 exactly, y = DECK_Y and dy/dth = -dp*0.85*sin^(-0.15)*cos → infinite. So the surface has a vertical tangent at the deck edge, meaning the hull side is vertical near the deck. So the outward there is +z and the normal (0,0,+). Our flipped normal (0,-,+) normalized → mostly +z. OK good.

Let me just use order (A, C, B) and (A, D, C)? For the second triangle: B, C, D → let's use C, B, D? Standard for a quad with corners A B / C D (A=(i,j), B=(i+1,j), C=(i,j+1), D=(i+1,j+1)) the two triangles are (A,C,B) and (B,C,D). Let's check (B,C,D): (C-B) × (D-B). C-B = (-Δx, Δy, Δz), D-B = (0, Δy, Δz). Cross = (Δy*Δz - Δz*Δy, Δz*0 - (-Δx)Δz, (-Δx)Δy - Δy*0) = (0, ΔxΔz, -ΔxΔy). With Δx>0, Δy<0, Δz<0: (0, -Δx|Δz|... ) hmm ΔxΔz<0, -ΔxΔy>0 → (0, -, +). Same as (A,C,B). Good, consistent.

So the triangles are (A,C,B) and (B,C,D).

Now the deck. A flat grid at y = DECK_Y covering z from -hb to +hb. Just build a separate geometry:
for i 0..NS, for k 0..2 (or 4), z = -hb + 2hb*k/K.
Indices: normal should be +y. Let's check: A=(i,k), B=(i+1,k), C=(i,k+1). B-A = +x, C-A = +z. Cross = x̂×ẑ = -ŷ. So use (A,C,B) → +y. Good.

Then add a transom cap at s=0: fan from the cross-section at i=0 to the center. Eh — since the hull at i=0 has a U-shaped cross-section and the deck covers the top, we just need to close the stern. Let's build a triangle fan with vertices at the s=0 cross-section plus a center point at (x0, deckY - dp0*0.5, 0). Actually easiest: skip it. From the camera at (35,12,35), looking at the boat from behind-ish? The boat's bow is +X. The camera is at (35,12,35), the boat at (12,0,14) → the camera sees the boat from the +x,+z side → it sees the bow and the starboard side. The stern is away from the camera. So a hole at the stern isn't visible. But shadows might... no, shadows only care about the silhouette. Skip the transom, but use `side: THREE.DoubleSide` for the hull so any interior isn't invisible-black. Actually with DoubleSide and computeVertexNormals, flipped normals inside will look dark. Just skip; the hull is fine.

Hmm, but maybe I should add the transom for robustness since the boat rotates. Whatever, skip. Actually, let me just add a simple stern cap by adding a fan from the deck edge down to the keel. Not too hard:

For the s=0 ring (j=0..NT), the points are from (x0, DECK_Y, +hb0) down to (x0, DECK_Y - dp0, 0) up to (x0, DECK_Y, -hb0). A fan from the centroid closes it. I'll add that. It's ~10 lines. Let's include it for quality.

Actually, since the stern is flat at s=0 with hb0 = 0.78*0.9*... let's just do it.

Then compute normals via computeVertexNormals — but the hull and deck are separate geometries so the seam normals differ; that's fine (it looks like a distinct deck edge).

Materials:
- hull: MeshStandardMaterial({ color: 0xf2f2f2? }) — a classic white hull with a colored stripe? Vertex colors could give a stripe. Let's do white hull with a dark blue painted bottom? Without vertex colors, keep it simple: hull color 0xf5f2ea (cream/white), roughness 0.5, metalness 0.05. Deck: wood 0x9a6b3f. Cabin: 0x2f5d7a (blue-grey) or wood. Mast: 0x8a5a2b wood. Sail: 0xf5f0e6 with a slight emissive/subsurface look.

Add a small red/blue stripe? Could add a thin box along the hull side. Skip.

Boat group children:
1. hullMesh
2. deckMesh
3. cabin (BoxGeometry 1.1 x 0.55 x 0.9) positioned at (0.3, 0.5, 0) — hmm, the hull length is 4 with the bow at +2.
   Cabin at x ≈ -0.3, y = DECK_Y + 0.27.
4. mast (CylinderGeometry(0.06, 0.07, 3.4)) at x = 0.35, from deck up.
5. boom (cylinder along x).
6. sail (ShapeGeometry) - plane attached between the mast and the boom.
7. Railing? maybe a couple of thin cylinders. Skip or add a small flag.

Let's do: mast at x=0.4, height 3.2 from the deck: y from 0.35 to 3.55. The sail hangs from the mast: a triangle from the mast top down to the boom aft. Fore-and-aft sail: the luff is along the mast (at x=0.4), the foot along the boom going aft (-x), and the leech from the mast top to the boom's aft end. So the sail is in the XY plane, extending from x=0.4 to x=-1.5.

Sail shape (in local 2D coords before positioning):
- point (0,0) at the mast base
- point (-1.9, 0.1) at the boom's aft end
- point (-0.15, 2.9) near the mast top
Then the plane is XY, and we set position (0.4, 0.5, 0) and it billows in Z.

Hmm, with a ShapeGeometry the winding/normal is +z, fine.

Billow: displace each vertex in z by amount proportional to distance from the edges... Roughly: z += 0.22 * sin(π * u) where u is normalized along the sail... Simple approach: z = 0.25 * (something). Let me use: for each vertex, compute a = the barycentric-ish distance from the luff... Simplest: z += 0.28 * Math.sin(Math.PI * (x - xmin)/(xmax - xmin)) * Math.sin(Math.PI*(y - ymin)/(ymax-ymin))? That would make a bulge in the middle of the bounding box which may be outside the triangle. It's fine — it's a small sail.

Actually a triangular sail bulging: use the distance from the hypotenuse... Let's keep it simple with the sine product, capped.

Ok. Also make the sail double-sided.

Boat orientation: rotation.y = some angle so the boat looks nice from the camera. Face the bow toward... Let's set rotation.y ≈ -0.6 rad. Hmm, we apply rotation.x, rotation.y, rotation.z each frame for the rocking. If I also need a base yaw, I'll use rotation.set(pitchRollX, baseYaw + driftYaw, pitchZ). With Euler order 'YXZ'? To make roll/pitch applied in the boat's local frame, the order should be such that yaw is applied last (outermost)... Actually for the standard: object rotated by yaw then pitch/roll about the local axes. With Euler order 'YXZ', the matrix is R = Ry * Rx * Rz. Applying to a local vector: first Rz (roll about local z), then Rx (pitch about local x), then Ry (yaw). Since pitch and roll are about the boat's local axes before the yaw, that's exactly right. So use `boat.rotation.order = 'YXZ'` and set (pitchX, yaw, rollZ). Hmm, with order 'YXZ', the arguments are still (x, y, z) = (rx, ry, rz), and the composition is Ry*Rx*Rz. Right.

So rotation.x = -rollSlope, rotation.y = yaw, rotation.z = pitchSlope. Wait, earlier I derived rotation.z = pitch and rotation.x = -roll. Yes.

Ok.

Now, the island.

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const base = 10.5 * Math.exp(-Math.pow(r / 10.0, 2.2)) - 0.75;
  // noise
  const n = fbm(x * 0.12, z * 0.12);   // returns -1..1
  const ridge = ... 
  return base + n * (1.2 * Math.exp(-Math.pow(r/16, 2))) ...
}
```
Hmm. Let me design more carefully to get a nice-looking island.

I want: beach around r 12-16 at y≈0, rising to a peak at r=0 of y≈8-10.

h(r) = A * exp(-(r/s)^2) - 0.8, with A=11, s=9.5.
r=0 → 10.2. r=5 → 11*exp(-0.277)=8.4-0.8=7.6. r=9.5 → 11*0.368=4.05-0.8=3.25. r=13 → 11*exp(-1.874)=1.69-0.8=0.89. r=15 → 11*exp(-2.49)=0.92-0.8=0.12. r=17 → 11*exp(-3.2)=0.44-0.8=-0.36. So the shoreline is at r≈15.6. Island ~31 across. Good (30-50).

Add noise: n(x,z) in [-1,1], amplitude 1.4*exp(-(r/12)^2) → at r=0, ±1.4 (peak varies 8.8-11.6); at r=9.5, ±0.75; at r=15, ±0.2. This makes the shoreline wiggle a bit. Good.

Use value noise:
```ts
function hash2(ix: number, iy: number): number {
  let h = ix * 374761393 + iy * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295; // 0..1
}
```
Careful with JS number precision — use Math.imul for 32-bit ops.

```ts
function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
```
Then bilinear value noise with smoothstep, and 3 octaves.

fbm(x,z): 
```ts
function noise2(x,z) {
  const ix = Math.floor(x), iy = Math.floor(z);
  const fx = x-ix, fy = z-iy;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  const a = hash2(ix,iy), b = hash2(ix+1,iy), c = hash2(ix,iy+1), d = hash2(ix+1,iy+1);
  return (a*(1-ux)+b*ux)*(1-uy) + (c*(1-ux)+d*ux)*uy; // 0..1
}
function fbm(x,z) {
  let v = 0, amp = 0.5, f = 1;
  for (let i=0;i<4;i++){ v += amp*(noise2(x*f, z*f)*2-1); amp*=0.5; f*=2.03; }
  return v; // roughly -1..1
}
```

Then the island mesh: polar grid rings with a radius up to 20 (beyond the shoreline so the terrain dips under the water). Colors by height.

Build:
```ts
const RINGS = 44, SEGS = 96;
```
That's ~4300 quads = 8600 triangles. Fine.

positions: for ring i (0..RINGS), r = RMAX * (i/RINGS)^1.0? With RMAX = 20, and 44 rings → dr=0.45. Fine. But at i=0 all vertices coincide at the center. Use i from 0 with r=0 duplicated (a degenerate ring). That's ok, or start at r = small. I'll handle i=0 as a single center vertex... Simpler: just let all segments at i=0 be at r=0 and create degenerate triangles. computeVertexNormals will produce zero-area normals for those triangles → NaN normals possibly. Safer: start rings at i=1 with r>0 and add a center vertex fan. Or set the first ring radius to 0.18 (small) and let the peak be a small flat plateau. That's fine — a slightly flattened peak is natural. Let's do r = RMAX * (i+0.35)/RINGS so the innermost ring has r=0.16.

Vertex colors: compute per-vertex from height + noise:
```
const h = islandHeight(x,z);
let col: THREE.Color;
if (h < 0.55) sand: 0xd9c48f with variation
else if (h < 1.0) mix sand→grass
else if (h < 6) grass 0x4f7a3a → 0x6ea24a
else rock 0x8d8578
```
Add some noise to break it up.

Also add a wet-sand darker band right at the waterline.

Grass color variation with fbm.

Let's use vertex colors with a MeshStandardMaterial({vertexColors: true, roughness: 0.9, flatShading: false}). Compute smooth normals.

Also add a slight "shore ring" — no, the ocean shader handles the shallow tint.

Palm positions: pick 7 positions on the island at various radii/angles, with the trunk base at islandHeight(x,z). Ensure they're above water (h between 0.6 and 4). Let's hardcode positions:

```
const palmSpots = [
  [ 6.5, 3.0], [-4.5, 6.5], [ 2.0, -7.5], [-7.5, -2.0], [ 8.5, -4.0], [-2.5, 9.5], [ 0.5, 0.5]
];
```
Compute heights at those spots and check they're > 0.5. Let's check with the formula roughly:
- (6.5,3): r=7.16 → base=11*exp(-(0.716)^2*... wait (r/9.5)^2.2 = (0.754)^2.2 = e^(2.2*ln0.754)=e^(2.2*(-0.282))=e^-0.62=0.538 → 11*0.538=5.92-0.8=5.12. Plus noise. Good, that's mid-slope.
- (2,-7.5): r=7.76 → (0.817)^2.2 = e^(2.2*(-0.202))=e^-0.444=0.641 → 7.05-0.8=6.25. Hmm, that's fairly high; palms should be lower, near the beach (h ~ 1-3). Let me choose positions further out.

Palm positions (radius 9-14):
- (9.5, 4.0) → r=10.3 → (1.084)^2.2=e^(2.2*0.0806)=1.194 → exp(-1.194)=0.303 → 3.33-0.8=2.53 ✓
- (-8.0, 8.5) → r=11.67 → (1.228)^2.2=e^(2.2*0.205)=1.57→exp(-1.57)=0.208→2.29-0.8=1.49 ✓
- (10.5, -7.0) → r=12.62 → (1.328)^2.2 = e^(2.2*0.284)=e^0.625=1.868→ exp(-1.868)=0.154→1.70-0.8=0.90 ✓ (beach-ish)
- (-11.0, -3.0) → r=11.4 → similar 1.6 ✓
- (1.0, 12.0) → r=12.04 → (1.267)^2.2=e^(2.2*0.237)=e^0.521=1.684→exp=0.186→2.05-0.8=1.25 ✓
- (-4.0, -10.5) → r=11.24 → 1.7 ✓
- (5.0, 8.0) → r=9.43 → (0.993)^2.2≈0.985→exp=0.373→4.1-0.8=3.3 ✓

Good, with noise ±0.5 the heights are all above 0.4. Some might dip below with noise... I'll compute the actual height and place the trunk base at max(h, 0.35). And keep them where they are.

Trunk: curved. Use CatmullRomCurve3 points: base (0,0,0), then lean: (0.3, 2, 0), (0.7, 4, 0.1), (0.9, 5.6, 0.2). TubeGeometry(curve, 12, 0.16, 6, false) — but a constant radius tube. Taper: modify the geometry? Use a custom radius function — TubeGeometry doesn't support that. Alternative: build the trunk from CylinderGeometry segments... Simplest: use TubeGeometry with radius 0.16 and add a slight scale taper by modifying the positions after generation? Eh, use two tube segments with decreasing radius: a lower tube radius 0.19, an upper radius 0.13. Or just accept constant radius. I'll accept a constant-ish trunk, or do a quick taper by scaling each vertex's offset from the curve... too complex.

Alternative trunk: build with a custom "tapered tube": I can generate it myself along a curve with a radius function using Frenet frames from curve.computeFrenetFrames. Meh. Constant radius tube with 0.15 looks fine at this scale.

Actually let's do a simple trick: generate TubeGeometry, then for each vertex, compute its y (in the local trunk space, since the curve is mostly vertical) and scale its xz offset by a factor that decreases with y. Since the curve is mostly vertical, I can use: for each vertex, find the closest curve point... complicated.

Fine: constant radius. Or use two tubes: lower half r=0.18, upper half r=0.12, overlapping. Actually simpler: the trunk curve is defined in local space; I could build a tapered tube by generating rings myself. Let me just write a small helper:

```ts
function makeTaperedTube(curve: THREE.Curve<THREE.Vector3>, segs: number, radial: number, r0: number, r1: number): THREE.BufferGeometry
```
Using curve.computeFrenetFrames(segs, false) → gives tangents, normals, binormals. Then for each i, sample the point and radius, and build the ring. That's ~25 lines. I'll do it — worth it for quality? Meh. It also gives the crown attachment point. Actually, a constant-radius tube is fine for a palm at 50 units away. Let me use TubeGeometry with radius 0.17 and taper by scaling the whole mesh? No.

Decision: use TubeGeometry with radius 0.16 and radialSegments 6. Add a slightly larger cylinder at the base for the root flare. Fine.

Leaves: InstancedMesh with a leaf geometry. Leaf geometry: a tapered, drooping blade.

```ts
function makeFrondGeometry(): THREE.BufferGeometry {
  // length along +X? Let's do along +Y then bend.
}
```
I'll build the frond with a parametric strip: for u in 0..1 (along the frond) and v in -1..1 (across):
- width(u) = 0.42 * Math.sin(Math.PI * Math.pow(u, 0.55)) ... at u=0 → 0, u=1 → 0. Hmm, a palm frond is widest in the middle and tapers to a point at the tip. width(u) = 0.45 * Math.pow(Math.sin(Math.PI*u*0.9 + 0.1), 0.7)? Let's use width(u) = 0.42 * Math.sin(Math.PI * Math.pow(u, 0.7)) → at u=0: 0; u=1: sin(π)=0 → tapered at both ends. Good.
- Also the frond should be a "V" cross-section (folded along the spine) for a nicer look: y_offset += -0.12*|v|*widthScale. 
- Length: 2.6 units along the local +X, drooping: y = -1.4 * u² ... Let's define the frond along +X with a droop: y = -0.9*u^2.2 and the tip curving down. Or use a quadratic bezier.

Frond in local space: x = u * L, y = -droop*u^2 + 0.9*u (rising initially then drooping)? Let's do: y = 0.75*u - 1.5*u². At u=0: 0; u=0.25: 0.19-0.09=0.1; u=0.5: 0.375-0.375=0; u=1: 0.75-1.5=-0.75. So it rises a bit, then droops. Good. z = v * width(u) (across), plus a small fold: y += 0.18*|v|*width(u)*... actually a fold should lower the edges or raise the center. Let's raise the center: y += 0.15*width(u)*(1-|v|). Hmm, simpler: skip the fold, or add a slight upward curl at the edges: y += 0.1 * (1 - v²) * width(u)? Eh.

Let's include the fold: y += 0.22 * (1 - Math.abs(v)) * width(u) — a V-shape ridge. Wait, that raises the center, making a ridge along the spine. Palm fronds have a raised midrib. Good.

Add UVs and compute normals. With side: DoubleSide for the leaf material (leaves are thin). Yes DoubleSide, and shadows — castShadow with DoubleSide works with shadowSide default (three uses material.side for shadows? shadowSide defaults to null → uses the material side flipped for FrontSide... it's fine).

Number of leaves: 7 palms × 9 leaves = 63 instances ≥ 30. 

Leaf placement: for each palm, at the crown position (the trunk's top), for each of 9 leaves: yaw = k/9 * 2π + palmOffset, pitch = varying (-0.15..0.35 rad up/down). Then the matrix = T(crown) * R(yaw) * R(pitch) * S(scale) with a wind sway added as a small extra rotation.

Sway: each frame, compute a sway angle = 0.12 * sin(t*1.5 + phase) + 0.05*sin(t*3.1 + phase*2) and apply as a rotation about the "horizontal axis perpendicular to the leaf direction" — i.e., rotate about the local Z? For a leaf pointing along +X, a wind sway is a rotation about Z (up/down flap) and about Y (side-to-side). Let's compose: quaternion from Euler(0, yawBase, 0) * Euler(0,0, pitchBase + sway)... 

The instance matrix construction each frame for 63 instances is cheap.

Use:
```ts
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
```
Per leaf store base data: {pos, yaw, pitch, scale, phase}.

Each frame:
```ts
for each leaf:
  const sway = Math.sin(t*2.0 + phase) * 0.14 + Math.sin(t*3.7 + phase*1.7) * 0.06;
  _e.set(0, yaw + sway*0.5, pitch + sway); // order XYZ default
  _q.setFromEuler(_e);
  _m.compose(pos, _q, scale);
  leaves.setMatrixAt(i, _m);
leaves.instanceMatrix.needsUpdate = true;
```
Hmm, Euler(0, yaw, pitch) with the default XYZ order = Rx*Ry*Rz → composition of Ry then Rz... Let me think: Euler XYZ means the rotation matrix is R = Rx(x) * Ry(y) * Rz(z)? In three.js, `Quaternion.setFromEuler` with order 'XYZ' produces the rotation equivalent to applying... The three.js docs: "The order in which to apply rotations" — for 'XYZ' the object is rotated first around X, then Y, then Z (intrinsic? extrinsic?). In three, the Euler 'XYZ' means the matrix R = Rx * Ry * Rz?? Let me recall the code:

```js
case 'XYZ':
  this._x = s1*c2*c3 + c1*s2*s3;
  ...
```
which corresponds to the quaternion product qx*qy*qz. And the rotation matrix is Rx*Ry*Rz. Applied to a vector v: R v = Rx(Ry(Rz v)) → the Z rotation is applied first (innermost). So with order 'XYZ', the Z rotation is applied first in the local frame, then Y, then X.

For a leaf: I want to pitch it up first (about Z, since the leaf points along +X, a Z-rotation raises the tip), then yaw it around Y. So set Euler(0, yaw, pitch, 'XYZ') → applies Rz(pitch) first, then Ry(yaw). Yes! That's what I want. So `_e.set(0, yaw, pitch + sway, 'XYZ')`.

Good.

Also, the crown should have a few coconuts? Skip.

Also the trunk should sway slightly — optional. Skip, or rotate the trunk group by a tiny amount. Skip.

Now, the leaves InstancedMesh needs castShadow, and the island receives shadows. Set leaves.castShadow = true.

Now the sun.

```ts
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), azimuth);
```
Simpler: 
```ts
const elev = THREE.MathUtils.degToRad(32);
const azim = THREE.MathUtils.degToRad(35);
const sunDir = new THREE.Vector3(Math.cos(elev)*Math.sin(azim), Math.sin(elev), Math.cos(elev)*Math.cos(azim));
```
Then position the light at sunDir * 60 with target at origin. Shadow camera: ortho left -40, right 40, top 40, bottom -40, near 1, far 200. Actually the light at distance 60 with a far of 200 covers it.

Hmm, if the light is at 60 units and the shadow camera is ortho ±40 with near 1, far 200 — fine.

The sun should be visible in the sky: the camera is at (35,12,35) looking at the origin, so the sun should be somewhere in the visible sky. The view direction is (-35,-10,-35) normalized ≈ (-0.7,-0.2,-0.7). The sun at azim 35° → direction (sin35*cos32, sin32, cos35*cos32) = (0.487, 0.53, 0.702). That's behind the camera (dot with the view dir is negative). So the sun is behind the camera — the sky won't show the sun. Better to place the sun in front of the camera, i.e., with a negative x and z direction: azimuth = 180+35 = 215° → direction (-0.487, 0.53, -0.702) → in front of the camera (dot with the view dir = 0.34+0.53*... > 0). But wait, the camera looks at the island; a sun in front means the island is backlit and we see it in silhouette. That's dramatic but might be too dark for the island.

Middle ground: put the sun to the side and slightly in front: azimuth ~150°, e.g., direction (-0.63, 0.53, -0.55)*... hmm at azim 180+50=230... Let me compute azimuth convention: dir = (sin(az)*cos(el), sin(el), cos(az)*cos(el)). For the sun to be at the left-front (from the camera's perspective, the camera is at +x+z looking toward -x-z), a sun with -x and -z... For a nice rim-lit island, backlighting is nice but the island shadows would face us.

Let's put the sun high-ish and to the side: ele=35°, azim=200° → dir = (sin200, sin35, cos200)*cos35 = (-0.342, 0.574, -0.940)*0.819 = (-0.28, 0.574, -0.77). The camera's view dir is (-0.7,-0.2,-0.7). dot = 0.196 + (-0.115) + 0.539 = 0.62 → the sun is 52° from the view direction, well within a 50° FOV? The half-FOV vertically is 25°, horizontally ~38° with aspect 1.5. So it might be just outside the frame at 52°... The sun would be near the top-left of the frame or just outside. Hmm.

Let's pick the sun so it's visible near the top of the frame: The camera looks at (0,2,0) from (35,12,35), the view dir is (-0.707, -0.202, -0.707) normalized. The sun needs to be within ~35° of that. Let's set the sun direction ≈ rotate the view dir up by 25°: something like (-0.6, 0.35, -0.7) normalized → that's a bit high but visible.

Actually, I want the sun to also give nice lighting on the boat and island. A sun at ~30° elevation behind/in-front... Let's go with the sun in front-left-ish and moderately high: direction = normalize(-0.55, 0.62, -0.56). Elevation = asin(0.62) = 38°. Azimuth: atan2(-0.55, -0.56) = atan2 gives ~ -135.5° → azim 224.5°. dot with the view dir: (-0.55)(-0.707) + 0.62*(-0.202) + (-0.56)(-0.707) = 0.389 - 0.125 + 0.396 = 0.66 → 48.7°. Hmm still far from the center of the screen. But the sun's glow (pow(sd, 8)*0.12) would be visible as a bright area near the top-left. And the sun disc itself at 48.7° from the center: the vertical half-FOV is 25°, horizontal half-FOV = atan(tan(25°)*aspect). With aspect 1.78: atan(0.466*1.78)=39.6°. The sun direction relative to the view: mostly up and to the... let's compute its position in camera space. 

Eh, let me instead just lower the sun's elevation and put it more centrally: direction (0.35, 0.45, -0.82) normalized → hmm.

Let me think about what looks good: A classic game-y tropical scene has the sun high (45-60°) and slightly behind the camera for a brightly lit island. The sun wouldn't be visible in the frame then. But the requirement says "with a visible sun position" — meaning the sun is visible in the sky (we render a sun disc). If it's behind the camera it's not visible in the frame. Hmm, "A sky: a gradient sky dome ... with a visible sun position" — I read this as "the sky shows the sun". Let's make sure the sun disc is in frame.

Let's put the sun at ~28° elevation and a direction roughly opposite to the camera's horizontal view... Let's parametrize by the camera: the camera looks toward (-1,0,-1)/√2 horizontally. The sun in front: horizontal direction ≈ (-0.5, -0.85) mixed. Let's choose the horizontal sun direction as (-0.35, -0.94) (mostly -z, slightly -x), elevated 26°: dir = (-0.35*cos26, sin26, -0.94*cos26) = (-0.315, 0.438, -0.845). dot with the view dir (-0.707,-0.202,-0.707): 0.223 - 0.0885 + 0.597 = 0.732 → 43°. Still a lot. The angle is dominated by the elevation: the view direction points 11.5° below horizontal, and the sun is 26° above → 37.5° vertical separation alone. The vertical half-FOV is 25°, so the sun is outside the frame vertically. 

To have the sun visible at 24° elevation with the camera pitched down 11.5°, the vertical separation is 35.5° > 25°. So I'd need the sun at ~10° elevation, which is a nice sunset look but a low sun.

Options: increase the FOV to 55 (half-FOV 27.5) — still not enough. Or put the sun behind the camera and rely on the sky showing a glow... 

Actually, wait. The camera looks at (0,2,0) from (35,12,35), so it's pitched down 11.5°. If the sun is at 26° elevation and its azimuth is aligned with the view azimuth, the sun is 37.5° up from the view center → outside a 25° half-FOV. So I'd need the sun's elevation ≤ ~13° to be visible at the center. With a FOV of 60 (half 30), the sun at 18° elevation would be at the very top edge.

Compromise: sun elevation 17°, FOV 50 → the vertical offset is 28.5° → just outside. FOV 60 with a 30° half → just inside at the top edge. 

Alternatively, "visible sun position" might just mean that the sky has a sun glow visible near the horizon area. I'll put the sun at ~20° elevation, and add a strong glow around the sun that reaches into the frame. Also, with a low sun, the water gets a beautiful specular path ("glitter road") toward the camera — that's the money shot for ocean scenes. A low sun in front of the camera creates a specular path toward the viewer. That's very game-like. Let's do it: sun elevation 20°, azimuth aligned so the sun is roughly in front, slightly left of the view center. Then the ocean's specular highlight spreads across the water toward the camera. And the island is backlit with a rim light — the island's face toward the camera would be in shadow, which is dark. Hmm, that hurts the island's look.

Balance: put the sun at azimuth 55° away from the view azimuth so it's to the side-front: the island's camera-facing side gets side lighting, and the water's specular still shows. But then the sun disc is 55° horizontally off-center, requiring a horizontal half-FOV > 55°, impossible without a very wide FOV.

Alright — decision: the sun is in the frame near the top, moderately high, and I'll accept a partially backlit island, which actually looks great with a rim-lit palm silhouette. But too dark is bad. Let's compute:

Sun elevation 24°, azimuth = the camera's view azimuth + 20° horizontally. The camera's horizontal view dir is (-0.707, -0.707) → azimuth = atan2(-0.707, -0.707) = -135° (i.e., 225°). The sun's azimuth = 225-20 = 205° → horizontal dir = (sin205, cos205) = (-0.423, -0.906). Sun dir with elevation 24: (-0.423*0.9135, 0.4067, -0.906*0.9135) = (-0.386, 0.407, -0.828).

Angle to the view dir (-0.707,-0.202,-0.707): dot = 0.273 - 0.082 + 0.585 = 0.776 → 39°. Vertical separation = 24 + 11.5 = 35.5 → outside a 25° half-FOV, but with a FOV of 50 and the sun 39° off-axis... In camera space: the sun's vertical angle above the view axis is 35.5°, horizontal ~ let's compute properly. 

The camera looks along -z_cam. Build the camera basis: forward f = (-0.707,-0.202,-0.707); right r = normalize(cross(f, up)) ... up=(0,1,0): cross(f,up) = (f_y*1 - f_z*0, f_z*0 - f_x*1, 0) → (f_y*1... let me just do: r = normalize(cross(up, -f))? Standard: right = normalize(cross(f, worldUp))? For a right-handed system with forward f, up u: right = normalize(cross(f, u))... hmm cross((-0.707,-0.202,-0.707),(0,1,0)) = ((-0.202)(0)-(-0.707)(1), (-0.707)(0)-(-0.707)(0), (-0.707)(1)-(-0.202)(0)) = (0.707, 0, -0.707). That's pointing (+x,-z), which is to the camera's... at the camera looking toward -x-z, the right-hand direction is +x... wait. If I'm at (35,12,35) looking toward the origin, my right is... The forward is (-0.7,0,-0.7). Right = forward × up? Let's use the standard: in a right-handed system with the camera looking along -Z, right = +X. right = normalize(cross(up, forward))? cross((0,1,0), (-0.707,-0.202,-0.707)) = (1*(-0.707) - 0*(-0.202), 0*(-0.707) - 0*(-0.707), 0*(-0.202) - 1*(-0.707)) = (-0.707, 0, 0.707). Hmm.

Let me do it concretely: camera at (35,12,35) looking at (0,2,0). The camera's local X axis (right) in world = ? Three's lookAt builds: z_axis = normalize(eye - target) = (35,10,35)/normalize = (0.707, 0.202, 0.707). x_axis = normalize(cross(up, z_axis)) = cross((0,1,0),(0.707,0.202,0.707)) = (1*0.707 - 0*0.202, 0*0.707 - 0*0.707, 0*0.202 - 1*0.707) = (0.707, 0, -0.707). So the camera's right is (0.707, 0, -0.707) → pointing +x, -z. Makes sense.

The camera's up = cross(z, x) = cross((0.707,0.202,0.707),(0.707,0,-0.707)) = (0.202*(-0.707) - 0.707*0, 0.707*0.707 - 0.707*(-0.707), 0 - 0.202*0.707) = (-0.1428, 0.4998+0.4998=0.9996, -0.1428) → (-0.143, 0.9996, -0.143). 

Sun dir s = (-0.386, 0.407, -0.828).
Camera-space: x_c = dot(s, right) = -0.386*0.707 + 0 + (-0.828)(-0.707) = -0.273 + 0.585 = 0.312.
y_c = dot(s, up) = (-0.386)(-0.143) + 0.407*0.9996 + (-0.828)(-0.143) = 0.0552 + 0.407 + 0.118 = 0.580.
z_c = dot(s, z_axis) = -0.386*0.707 + 0.407*0.202 + (-0.828)(0.707) = -0.273 + 0.082 - 0.585 = -0.776.
So in camera space (looking down -z), the sun is at (0.312, 0.580, -0.776). The angle from the -z axis: tan(vertical) = 0.580/0.776 = 0.747 → 36.8° up. Too high for a 25° half-FOV.

To get the sun into the frame, I need |y_c/z_c| < tan(FOV/2). With FOV 60 (half 30), tan30=0.577. Need vertical ≤ 0.577*|z_c|.

So I need the sun's elevation such that the vertical offset is under ~30°, meaning the elevation is under ~19° (since the camera is pitched 11.5° down). Then the sun's elevation is 19°, i.e., a late-afternoon look. Combined with a horizontal offset, the effective angle from the axis is larger, so I should keep the horizontal offset small.

Let's use: sun elevation 15°, azimuth equal to the camera's azimuth (225°) → s = (sin225*cos15, sin15, cos225*cos15) = (-0.707*0.966, 0.259, -0.707*0.966) = (-0.683, 0.259, -0.683).
Then y_c = 0.683*0.143 + 0.259*0.9996 + 0.683*0.143 = 0.0977+0.259+0.0977 = 0.454. z_c = -0.683*0.707 + 0.259*0.202 - 0.683*0.707 = -0.483+0.052-0.483 = -0.914. Ratio = 0.497 → 26.4° up. With FOV 55 (half 27.5), tan27.5=0.52 → just inside, near the top. Hmm, marginal.

Use elevation 12°: s=(-0.691*... cos12=0.978 → (-0.691, 0.208, -0.691)). y_c = 0.0988+0.208+0.0988 = 0.406; z_c = -0.489+0.042-0.489 = -0.936. Ratio 0.434 → 23.4°. With FOV 50 (half 25), tan25 = 0.466 → inside near the top. 

A 12° sun elevation is a golden-hour look. Long shadows, warm light. That's beautiful for a tropical scene, and the specular path on the water toward the camera will be gorgeous. But the island will be strongly backlit (the sun is behind it from the camera's view) → the island's front face is in shadow. Hmm, that's dark. With hemisphere fill + a warm sun rim, it could look dramatic. But "good-looking, game-like" often means a bright scene.

Compromise: put the sun at azimuth 195° (30° to the left of the view azimuth) and elevation 16°. Then it's within the frame horizontally? x_c = ?

s at azim195, elev16: horizontal = (sin195, cos195) = (-0.259, -0.966); times cos16=0.961 → (-0.249, 0.276, -0.928).
x_c = -0.249*0.707 + (-0.928)(-0.707) = -0.176 + 0.656 = 0.480.
y_c = (-0.249)(-0.143) + 0.276*0.9996 + (-0.928)(-0.143) = 0.0356+0.276+0.1327 = 0.444.
z_c = -0.249*0.707 + 0.276*0.202 - 0.928*0.707 = -0.176+0.0558-0.656 = -0.776.
Vertical ratio: 0.444/0.776 = 0.572 → 29.8°, needs a half-FOV of 30 → FOV 60. Horizontal ratio 0.48/0.776=0.62 → 31.7° horizontally; with aspect 1.78, the horizontal half-FOV = atan(0.466*1.78)... For FOV 60, tan(30)=0.577; horizontal half-FOV = atan(0.577*1.78) = 45.7° → ok, 31.7 < 45.7. So with FOV 60 the sun is in the frame. But then the sun is at 30° elevation... it's at the top-left corner region. That gives a nice 3/4 back-light on the island — the island's right side lit, the left in shade. 

Eh, honestly, let's not over-engineer. FOV 50, sun elevation 12°, azimuth 195°. The sun would be at the top edge / slightly out of frame vertically? Let's compute: y_c/|z_c| with elev12, azim195: horizontal = (-0.259,-0.966)*cos12=0.978 → (-0.253, 0.208, -0.945).
y_c = (-0.253)(-0.143) + 0.208*0.9996 + (-0.945)(-0.143) = 0.0362+0.208+0.135 = 0.379
z_c = -0.253*0.707 + 0.208*0.202 - 0.945*0.707 = -0.179+0.042-0.668 = -0.805
Ratio = 0.471 → 25.2°. tan(25)=0.466 → just barely at the very top edge of a 50° FOV frame. 

I'll use FOV 50 and sun elevation 11°, azimuth 190°. Then the sun is near the top of the frame, giving a beautiful golden specular path on the water toward the camera and a warm, low-contrast look. But the island will be quite dark on the camera side...

Hmm, but with the sun behind the island from the camera's viewpoint, the island's peak would cast a long shadow toward the camera. Dramatic sunset look. But the requirement says "realistic, good-looking... a picture that looks like a game". A sunset backlit tropical scene with a sparkling water path is very game-like and gorgeous. Let's embrace it but keep the ambient/hemisphere light strong enough to see the island's colors.

Hmm, but then the palm leaves (DoubleSide) lit from behind would look dark against the sky. Backlit palm silhouettes — pretty. And the island with a warm rim.

Risk: it might look too dark/flat. Let me instead choose the sun moderately high (30°) and slightly behind the camera's left. Then the scene is bright and colorful (classic game look), and the sun disc is not in the frame — but its glow is visible on the upper-left sky. "with a visible sun position" — hmm.

Let me compromise: sun elevation 22°, azimuth 205° (i.e., 20° to the right of the view azimuth... wait azim 225 is the view azimuth; 205 is 20° toward -z... anyway).

Compute for elev22, azim200: horizontal = (sin200, cos200) = (-0.342, -0.940), *cos22 = 0.927 → (-0.317, 0.375, -0.871).
y_c = 0.317*0.143*... let's redo: y_c = (-0.317)(-0.143) + 0.375*0.9996 + (-0.871)(-0.143) = 0.0453+0.375+0.1245 = 0.545.
z_c = -0.317*0.707+0.375*0.202-0.871*0.707 = -0.224+0.0758-0.616 = -0.764.
Vertical ratio 0.713 → 35.5° → needs FOV ~71. Too wide.

OK so with the camera pitched down 11.5°, the visible sun elevation is limited to about (FOV/2 - 11.5). With FOV 50 → 13.5°. With FOV 60 → 18.5°.

Decision: use FOV 55 (half 27.5), sun elevation 18° (a low-ish warm sun), azimuth such that it's slightly off the view azimuth: 210°. Let's compute:
horizontal at azim210: (sin210, cos210) = (-0.5, -0.866), *cos18 = 0.951 → (-0.476, 0.309, -0.824).
y_c = (-0.476)(-0.143) + 0.309*0.9996 + (-0.824)(-0.143) = 0.068+0.309+0.118 = 0.495.
z_c = -0.476*0.707 + 0.309*0.202 - 0.824*0.707 = -0.337+0.0624-0.583 = -0.858.
Vertical ratio 0.577 → 30° up. With a half-FOV of 27.5 it's just outside. Argh.

Elevation 15°: horizontal*cos15 = (-0.483, 0.259, -0.837).
y_c = 0.069 + 0.259 + 0.120 = 0.448
z_c = -0.341+0.052-0.592 = -0.881
ratio 0.508 → 26.9° < 27.5 ✓ (just inside).

OK: FOV 55, sun elevation 15°, azimuth 210°. The sun appears ~27° up from the view center, at the top edge of the frame — near the top-left (since x_c/|z_c| = ? x_c = -0.483*0.707 + 0 + (-0.837)(-0.707) = -0.341+0.592 = 0.251 → ratio 0.285 → 15.9° to the right of center). So the sun is up and slightly right of center, near the top of the frame. Its glow and disc would be visible. 

And the light direction: the sun is in front-right of the camera → the island is backlit from the right. The island's camera side is in shade. Hmm. With a warm sun and a strong blue hemisphere, it might look fine (typical sunset scene). But the island's grass/sand in shadow... I'll add a reasonably strong HemisphereLight (sky 0x88bbdd, ground 0x4a6b3a, intensity 0.8) so the shadowed side still has color. Plus tone mapping exposure ~1.1.

Actually, wait. Let me reconsider: at 15° elevation, the sun's light is warm/orange and grazes the scene. The water gets a golden glitter path. It's a beautiful "sunset tropical" look. Let's do it. Also the fog color should be warm-hazy near the sun and bluish elsewhere; I'll use a warm-ish horizon color (like #b9d3e0 → slightly warm #cfd9dd) and add a warm glow near the sun in the sky only.

Alright. Let's set:
- SUN_ELEV = 15°, SUN_AZIM = 210° (in my convention).
- sunDir normalized.
- DirectionalLight color 0xffe4b0 (warm), intensity 2.6 (with ACES + physically correct lighting in r155+, intensities need to be higher; note: since r155, `useLegacyLights` defaults to false, so lights use physical units — a DirectionalLight intensity of ~2-3 is reasonable for sunlight with exposure 1.0). Let's use intensity 3.0 for the sun and a hemisphere at 0.9. Hmm, with ACES tone mapping and exposure 1, direct sunlight at intensity 3 will be reasonably bright but ACES compresses. Let's set toneMappingExposure = 1.1.

Let's be careful with three version differences: In r155+, `WebGLRenderer.useLegacyLights` defaults to false. In r165+, it's removed. Ambient/hemisphere intensities are also scaled. I'll just tune with plausible values: sun 2.8, hemi 1.2, ambient 0.25.

Now the ocean shader details.

Uniforms: uTime, uSunDir, uSunColor, uDeep, uShallow, uSkyZenith, uHorizon, uFogColor, uFogNear, uFogFar, uCamPos (cameraPosition is built-in for ShaderMaterial? Yes, `cameraPosition` is provided automatically as a uniform in three's shaders — it's in the default uniforms for ShaderMaterial? Actually three injects `uniform vec3 cameraPosition;` in the vertex/fragment prefix for all materials. Yes, it's part of the default prefixFragment (`uniform vec3 cameraPosition;`). Let me double check — in WebGLProgram, prefixVertex includes 'uniform vec3 cameraPosition;'? Hmm. The prefix includes:
```
'uniform mat4 modelMatrix;',
'uniform mat4 modelViewMatrix;',
'uniform mat4 projectionMatrix;',
'uniform mat4 viewMatrix;',
'uniform mat3 normalMatrix;',
'uniform vec3 cameraPosition;',
'uniform bool isOrthographic;',
```
These are added to the vertex shader prefix. And in the fragment prefix:
```
'uniform mat4 viewMatrix;',
'uniform vec3 cameraPosition;',
'uniform bool isOrthographic;',
```
Yes, both include cameraPosition. 

The ocean geometry is a plane rotated to XZ. Model matrix = identity (the mesh is at the origin, no rotation since I baked the rotation into the geometry). Actually simpler: keep the mesh at the origin with identity transform, and bake the rotation into the geometry so that position.xz are the world coords.

Now the vertex shader:

```glsl
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vH;
varying vec2 vXZ;

void main() {
  vec2 p = position.xz;
  float h = 0.0;
  vec3 disp = vec3(0.0);
  float dhdx = 0.0, dhdz = 0.0;
  // unrolled per wave
  ...
  vec3 pos = vec3(position.x + disp.x, h, position.z + disp.z);
  vWorld = pos;  // model matrix identity so world == local
  vH = h;
  vXZ = p;
  vNormalW = normalize(vec3(-dhdx, 1.0, -dhdz));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Wait — but "heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z)". So heightAt(x,z,t) = sum A_i sin(f_i(x,z)). And the shader's y is exactly that. ✓. The shader also shifts x,z horizontally, which is fine since heightAt only needs to approximately match the visible surface. Also the boat samples heightAt at its position — matching. Good.

But careful: with the horizontal displacement, the surface at world (x,z) has a y that differs from heightAt(x,z). The difference is small (Q*A ~ 0.3 max) — acceptable.

Hmm, actually it might be better to use pure sine (no horizontal displacement) for exact matching. The spec explicitly says "for Gerstner waves ignore the small horizontal shift", so it expects Gerstner. I'll keep small Q to minimize the mismatch. Use Q = 0.35. Then the horizontal amplitude is ~0.35*A. With A=0.42 → 0.15. Small. Good. And the mismatch: the surface point at (x+0.15, z) has the height of (x,z)... a 0.15 offset with a wave slope of ~0.1 gives 0.015 error. Negligible. 

Now the fragment shader for the ocean. Let me write it:

```glsl
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyZenith;
uniform vec3 uHorizonColor;
uniform vec3 uFogColor;
uniform float uFogNear, uFogFar;

varying vec3 vWorld;
varying vec3 vNormalW;
varying float vH;
varying vec2 vXZ;

// small-scale detail normal
vec2 ripple(vec2 p, float t) { ... }

void main() {
  vec3 N = normalize(vNormalW);
  // add high frequency detail
  vec2 p = vXZ;
  float e = 0.0;
  // 3 extra high-frequency waves for normal detail
  ...
  N = normalize(vec3(N.x - ddx, N.y, N.z - ddz));  // hmm, need to be careful
```
Simpler: compute the detail slope as two extra sine sums (with a smaller amplitude, higher frequency) and add to the gradient:
```glsl
float dhx = 0.0, dhz = 0.0;
// detail waves
for each of 3 detail waves: dhx += A*k*D.x*cos(f); dhz += A*k*D.z*cos(f);
```
But I already pass the normal; I can just recompute the full gradient in the fragment shader for accuracy (per-pixel normals!). Actually, computing the same wave gradient per fragment is expensive but not crazy (4-7 waves × a few ops). Since it's a fullscreen-ish surface, it's ~ (ocean pixels) × 7 × ~10 ops. Probably fine on a mid-range GPU at 1080p. But it doubles the wave evaluation cost (vertex + fragment). Let's do a hybrid: pass the vertex normal (for the base waves) and add 3 high-frequency detail waves per fragment. That's cheap and adds sparkle.

```glsl
float detail(vec2 p, float t, out float dx, out float dz) {...}
```
GLSL out params are fine.

Actually let's write it inline:

```glsl
  float t = uTime;
  // detail waves (high freq, low amp)
  const ... 
```
I'll generate these as GLSL snippets from JS too — but they don't need JS counterparts. I'll just hardcode 3 detail waves in GLSL with vec2/float literals.

```glsl
  float dhx = 0.0;
  float dhz = 0.0;
  {
    float k = 1.9;  // wavelength 3.3
    vec2 d = vec2(0.8, 0.6);
    float f = k*dot(d, p) - t*1.6;
    float a = 0.05;
    dhx += a*k*d.x*cos(f);
    dhz += a*k*d.y*cos(f);
    ...
  }
```
With a=0.05, k=1.9 → slope 0.095. That's subtle but adds moving sparkle. Use 3 such waves with slopes summing to ~0.2. Good.

Then N = normalize(vec3(-(base_x + dhx), 1, -(base_z + dhz))) where base_x = -N_vertex.x/N_vertex.y... simpler: pass the vertex gradient (dhdx, dhdz) as varyings vGrad, then N = normalize(vec3(-(vGrad.x+dhx), 1.0, -(vGrad.y+dhz))).

Then:
```glsl
  vec3 V = normalize(cameraPosition - vWorld);
  float NdV = max(dot(N, V), 0.0);
  float fres = pow(1.0 - NdV, 5.0);
  fres = mix(0.02, 1.0, fres);
  
  // reflection of sky
  vec3 R = reflect(-V, N);
  vec3 skyCol = mix(uHorizonColor, uSkyZenith, pow(clamp(R.y,0.0,1.0), 0.6));
  // sun glow in reflection
  float sd = max(dot(R, uSunDir), 0.0);
  skyCol += uSunColor * pow(sd, 200.0) * 2.0 + uSunColor*pow(sd, 12.0)*0.15;
```
Hmm, the pow(sd,200) will produce the sun's reflection on the water — the "glitter path". Combined with the sun disc. Good.

```glsl
  // water body color
  float shallow = smoothstep(-3.5, 0.2, isl(xz));  // island height at this point
  vec3 body = mix(uDeepColor, uShallowColor, shallow * 0.9);
  // crest brightening (fake subsurface)
  body += uShallowColor * smoothstep(0.3, 1.0, vH/maxAmp) * 0.25;
  
  vec3 col = mix(body, skyCol, fres);
  
  // specular
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N,H),0.0), 400.0) * 6.0 + pow(max(dot(N,H),0.0), 40.0)*0.15;
  col += uSunColor * spec;
  
  // foam
  float foam = ...;
  col = mix(col, vec3(0.9,0.95,1.0)*0.9, foam);
  
  // fog
  float dist = length(cameraPosition - vWorld);
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);
  
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Foam: 
- crest foam: `float c = smoothstep(0.55*maxA, 0.95*maxA, vH)` times some noise. With maxA ~0.82, threshold at 0.45-0.78. Add time-varying noise: use a cheap hash-based 2D noise in the shader (a sin-based pseudo noise) or use the detail waves. Use `sin(p.x*3.0 + t*2.0)*sin(p.y*2.7 - t*1.5)` type patterns for a foam mask — looks a bit regular. Let's write a small value-noise function in GLSL (hash + smoothstep). That's ~15 lines but worth it.

I'll write a compact 2D value noise:
```glsl
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1)); return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
```
Good.

Foam = smoothstep(0.6, 0.95, vH/maxA + 0.35*vnoise(p*0.9 + t*0.15)) * 0.8 + shore foam.

Shore foam: `float depth = vH - islVal;` — hmm, vH is the wave height at the vertex, and islVal is the terrain height. If depth in [0, 1.2] → foamy. Actually I need it in the fragment shader; I'll compute islVal in the fragment shader (it's cheap: exp + dot). Fine.

```glsl
float islH = islandApprox(vXZ);
float depth = vH - islH;
float shoreFoam = smoothstep(0.9, 0.0, depth) * step(-0.05, depth);
```
Hmm, when depth < 0 the water is below the terrain (invisible anyway, hidden by the island). So just `smoothstep(0.9, 0.05, depth)` clamped. Combined with noise modulation: `* (0.4 + 0.9*vnoise(p*1.6 + t*0.6))`. And animate the foam edge: `depth + 0.25*sin(t*1.2 + ...)`. Fine.

Now the island approximation in GLSL:
```glsl
float islandApprox(vec2 p){
  float r = length(p);
  return 10.5*exp(-pow(r/9.5, 2.2)) - 0.75;
}
```
And in JS the same (without noise). Note pow with a negative base is undefined; r/9.5 ≥ 0 so it's fine. But `pow(x, 2.2)` in GLSL with x=0 is fine.

Wait, in the ocean shader I need this to match the island's actual terrain. The real island has noise on top. The shallow tint will be slightly off but it's fine.

Also note: I should ensure the ocean's shallow tint region roughly matches the island's shoreline (~r=15.6). ✓.

Now, the water color: deep 0x0b3d5c-ish, shallow 0x2fb8b0 turquoise. In linear terms those are darkish. Let's set deep = 0x06263b, shallow = 0x1f8f96. With tone mapping and the fresnel sky mix, it should look nice.

Hmm, the ACES tone mapping darkens things. Let me boost the body color a bit: deep 0x0a3a55, shallow 0x35c0b8.

Now the sky dome. Use a sphere of radius 800, BackSide, and the shader computes from the world direction. Since it's a sphere, the vertex position direction works. Also, set `depthWrite: false`, `fog: false`, and render it first (renderOrder = -1) or just let the depth test handle it (radius 800 < far 2000). Fine.

Actually, the sky dome with radius 800 while the camera is at (35,12,35) — the direction from the camera to the sphere vertex isn't exactly the vertex direction, but with a radius of 800 the error is negligible.

Now, the sun in the sky needs to match the DirectionalLight direction. ✓ (both from sunDir).

Sun disc: 
```glsl
float sd = dot(dir, uSunDir);
float ang = acos(clamp(sd,-1.0,1.0));
float disc = 1.0 - smoothstep(0.012, 0.020, ang);
```
0.012 rad ≈ 0.69° — the real sun is 0.53° across (radius 0.27°) but a bigger disc looks better. Use radius 0.02 rad (1.15°). Actually `1-smoothstep(0.012,0.02,ang)` gives a disc of radius 0.02 rad = 1.15°. Good.

Add a glow: `pow(max(sd,0.0), 200.0)*...` plus a broad haze `pow(max(sd,0.0), 8.0)`.

Let's set the sky colors:
- zenith: 0x1e4d8c (deep blue) → linear will be darker. Hmm, for a sunset-ish look, the zenith should be a deeper blue and the horizon warm. Let's use zenith = 0x2a5fa0, horizon = 0xbcd3e0 with a warm tint near the sun.

The fog color should match the horizon: 0xbcd3e0. Hmm, but the water fades to a light blue-grey. That's typical for ocean scenes. Good.

Hmm, with the sun at 15° elevation, a sunset look would want warmer horizon colors like 0xf0c9a0. Let me do a slightly warm, hazy horizon: 0xc9d8dd... Let's go with a nice golden-hour palette:
- zenith: 0x2b5f9e
- horizon: 0xc8dbe4 → but near the sun it becomes warm.

Actually, since the sky shader adds a sun glow, the warm tint appears only near the sun. The horizon elsewhere is pale blue. Fog = pale blue 0xc8dbe4? With ACES, the sky will look a bit desaturated. Let's boost: horizon 0xd6e7ee, fog the same.

Hmm. But a very light fog color for the ocean looks like haze — good.

Let me pick the final palette:
- SKY_ZENITH = 0x2d6cb5
- SKY_HORIZON = 0xcfe2ec
- SUN_COLOR = 0xffd9a0 (warm)
- FOG = SKY_HORIZON
- deep water 0x0a3550, shallow 0x2ec4b6, crest 0x5fd8cf

The sun's disc color = 0xfff2d0 * 30 (HDR).

Now, tone mapping: ACES will clamp to ~1 at the top. Bright sky colors ~0.8-1.0 linear will map to ~0.9 sRGB. Good.

The sky is a ShaderMaterial with `toneMapped` default true; include the tonemapping chunk.

Now shadows. The DirectionalLight's shadow: with the sun at 15° elevation, the shadows are long. Shadow camera: ortho ±32, near 1, far 200, light at sunDir*80. Bias -0.0006, normalBias 0.06. Map size 2048.

Wait — a low sun means the shadow camera must be big enough in the direction of the light. With the light at distance 80 and the ortho box ±32 centered on the target (0,2,0), the box must be deep enough along the light direction to cover the island (peak 10) — near 1 to far 200 is fine since the light is far away.

Also, the long shadows from a 15° sun will stretch across the water. The island is 30 wide, so the shadow is ~10/tan(15°) = 37 units long. The shadow camera ±32 might clip it. Use ±45 to be safe. That covers the island and the boat (the boat at (12,14) → within 45). Map size 2048 over 90 units → 22 texels per unit. Fine.

Now the boat sails. Let's write it.

Sail material: MeshStandardMaterial with side DoubleSide, color 0xf7f3e8, roughness 0.9. When backlit it'll be dark; use a small emissive 0x1a1a1a... or just rely on the hemisphere light. Add `emissive: 0x222222`? Hmm, a slight emissive makes it look translucent. Let's add emissive 0x554433 with intensity... no, keep it simple: emissive 0x2a2a2a.

Now the animation loop:

```ts
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt * WAVE_TIME_SCALE; // or just use elapsed
  ...
});
```
The spec: "time() returns the wave time in seconds that the shader uses right now". Just use elapsed = clock.getElapsedTime() and set uTime = elapsed; waveTime = elapsed. Simpler: `waveTime = clock.getElapsedTime()`.

Hmm, but clock.getDelta() updates the internal state; getElapsedTime also. Mixing them is fine (getDelta updates oldTime; getElapsedTime calls getDelta internally and accumulates... Actually getElapsedTime() sets elapsedTime += delta and returns it). If I call getDelta and then getElapsedTime in the same frame, getElapsedTime adds the delta from the call... Let me check three's Clock:

```js
getElapsedTime() { this.getDelta(); return this.elapsedTime; }
getDelta() { ... this.elapsedTime += diff; ... return diff; }
```
So calling getDelta() then getElapsedTime() → the second call's getDelta returns ~0 (since oldTime was just updated) and elapsedTime is unchanged. So it's fine — elapsedTime is consistent.

I'll do:
```ts
const dt = clock.getDelta(); // advances elapsedTime
const t = clock.elapsedTime;
```
Wait, does getDelta update elapsedTime when autoStart... `getDelta()` in three:
```js
getDelta() {
  let diff = 0;
  if (this.autoStart && !this.running) { this.start(); return 0; }
  if (this.running) {
    const newTime = now();
    diff = (newTime - this.oldTime) / 1000;
    this.oldTime = newTime;
    this.elapsedTime += diff;
  }
  return diff;
}
```
Yes, elapsedTime accumulates in getDelta. So I can use `const dt = clock.getDelta(); const t = clock.elapsedTime;` and clamp dt.

Then:
- uTime.value = t (smooth). If dt is huge (tab switch), time jumps — fine.

Actually to be safe with "motion must use delta/elapsed time", using elapsed time is fine.

Boat update:
```ts
const bx = 12 + Math.sin(t*0.06)*1.6;
const bz = 14 + Math.cos(t*0.045)*1.6;
```
radius: 12+1.6=13.6, 14+1.6=15.6 → r = 20.7 max. Good, within 25. Hmm, wait: could both be at max simultaneously? x=13.6 at sin=1, z=15.6 at cos=1 — these happen at different times but the max radius is sqrt(13.6²+15.6²)=20.7 < 25 ✓.

Height samples:
```ts
const hC = heightAt(bx, bz, t);
const hF = heightAt(bx + 2.0, bz, t);   // bow forward is +X in local; but with yaw, need rotated
```
Since the boat has a yaw, the bow is not at +X in world. Use the yaw to compute the forward direction:
```ts
const fx = Math.cos(yaw), fz = -Math.sin(yaw); // forward for yaw about Y: local +X → (cos yaw, 0, -sin yaw)
```
Because Ry(θ) maps (1,0,0) → (cosθ, 0, -sinθ). Yes.

Then:
```ts
const hF = heightAt(bx + fx*2, bz + fz*2, t);
const hB = heightAt(bx - fx*2, bz - fz*2, t);
const pitch = Math.atan2(hF - hB, 4.0);
```
And the starboard direction (local +Z → (sin θ, 0, cos θ)):
```ts
const sx = Math.sin(yaw), sz = Math.cos(yaw);
const hS = heightAt(bx + sx*0.8, bz + sz*0.8, t);
const hP = heightAt(bx - sx*0.8, bz - sz*0.8, t);
const roll = Math.atan2(hS - hP, 1.6);
```
rotation.x = -roll, rotation.z = pitch. Hmm wait, is rotation.z the pitch? With order 'YXZ', applying Rz first (in local space) then Rx then Ry. The local Z rotation tilts the local +X (bow) up. ✓. The local X rotation tilts the local +Z (starboard) — rotation.x = -roll makes +z go up when hS > hP ✓.

Also scale the rotation by ~0.8 and clamp for stability. And smooth them with lerping for a nicer feel? Instant is fine, but lerping adds realism (the boat lags). Let's lerp with a factor: `pitchSmooth += (pitch - pitchSmooth) * Math.min(1, dt*6)`. Good.

Also the boat's y = hC + 0.05.

Also a slow yaw oscillation: `yaw = 0.6 + Math.sin(t*0.09)*0.15`.

Wait, one issue: the wave function's height amplitudes are ~±0.82, so the boat rises and falls by 1.6 over a few seconds. With wavelengths of 32/19/11/7 and speeds... let's define the phases well.

Let me now define the waves concretely:

Deep-water dispersion: c = sqrt(g/k) with g=9.8. For L=32: k=0.196, c=7.07 units/s. Period T = L/c = 4.5s. That's fine. For L=7: k=0.897, c=3.3, T=2.1s.

Hmm, with a 400x400 ocean and a camera 50 units away, waves with L=32 and amplitude 0.4 look small but fine.

Let's define:
```ts
const WAVES = [
  { angle: 0.0,           L: 34, A: 0.46, Q: 0.42, phase: 0.0 },
  { angle: 0.9,           L: 21, A: 0.28, Q: 0.35, phase: 1.7 },
  { angle: 2.1,           L: 13, A: 0.16, Q: 0.3,  phase: 3.4 },
  { angle: -1.2,          L: 8,  A: 0.09, Q: 0.25, phase: 5.1 },
  { angle: 1.6,           L: 5.5,A: 0.05, Q: 0.2,  phase: 2.2 },
];
```
Sum of amplitudes = 0.46+0.28+0.16+0.09+0.05 = 1.04 → crest-to-trough up to 2.08. Slightly above the 2-unit max. Let's reduce: 0.40+0.25+0.14+0.08+0.04 = 0.91 → c2t = 1.82 ✓ (within 0.5-2).

Speed: c = sqrt(9.8/k) → for L=34: k=0.1848, c=7.28. For L=5.5: k=1.142, c=2.93. The temporal frequency is ω = k*c = sqrt(9.8*k). For L=34: ω=sqrt(1.81)=1.35 rad/s (T=4.65s). For L=5.5: ω=sqrt(11.19)=3.35 (T=1.88s). Good.

The shader: f = k*dot(d,p) - ω*t + phase.

For heightAt in JS: the same.

Note: the direction d should be a unit vec2 in the XZ plane: d = (cos(angle), sin(angle)) mapping to (x, z).

Now, the slope: ∂h/∂x = Σ A k d.x cos(f). Max slope = Σ A*k. For L=34: 0.40*0.1848=0.0739; L=21: 0.25*0.299=0.0748; L=13: 0.14*0.483=0.0676; L=8: 0.08*0.785=0.0628; L=5.5: 0.04*1.142=0.0457. Sum = 0.325 max slope → the waves are gentle (18°). Combined with the detail waves (slope ~0.2), the water gets a nice texture. Good.

Maybe make the waves a bit steeper for visual clarity. The spec says crest-to-trough 0.5-2 units — 1.82 is at the top. The slope 0.33 gives visible waves. OK.

Also add a "chop" — no.

Now, JS heightAt:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (