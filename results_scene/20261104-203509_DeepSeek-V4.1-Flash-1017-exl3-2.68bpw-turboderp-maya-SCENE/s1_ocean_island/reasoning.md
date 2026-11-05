We need to produce a single TS file. Let's design carefully.

Key components:

1. Renderer, scene, camera, controls maybe.
2. Sky: use Sky addon for good looks? Sky addon requires sun position and turbidity etc. It's a large sphere shader. That would look good. But we also need fog blending to horizon — Sky addon doesn't apply fog. We can use a custom gradient sky dome instead, simpler and consistent with fog. But "Sky addon" allowed. Let's do Sky addon since it looks great. But fog with sky? The Sky is a big sphere rendered with BackSide; fog would not apply (fog false by default on ShaderMaterial? ShaderMaterial has fog property false unless enabled). Sky's material doesn't use fog. Ocean far away will be fogged into horizon color which should approximate sky. With Sky addon, horizon color is bright whitish-blue. We can set fog color to something like 0xa8c8e0.

Alternatively a gradient sky dome shader with sun disk gives control and matches fog. That might be simpler and reliable. Let's do a custom sky dome: large sphere with vertex shader pass world position, fragment shader gradient from horizon to zenith plus sun glow and sun disk. That gives visible sun position matching directional light. Good and self-contained. But "good-looking" — a custom sky with sun glow can look nice.

Hmm, but the Sky addon is explicitly mentioned, and it looks realistic. Using it: 
```ts
import { Sky } from 'three/addons/objects/Sky.js';
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);
const u = sky.material.uniforms;
u.turbidity.value = 10; u.rayleigh.value = 2; u.mieCoefficient.value=0.005; u.mieDirectionalG.value=0.8;
sun position via setSunCoords.
```
That's fine but the shader renders sky on a sphere; fog doesn't apply. Ocean far edge will be fogged to fog color; we can choose fog color matching horizon by sampling? Hard. Let's just use custom sky dome — more control, guaranteed matching horizon fog color, and we can add sun disk. It's "a gradient sky dome" which is allowed.

I'll write own sky shader with:
- varying world direction
- gradient from horizon color (#cfe4f2?) to zenith (#3a7fc0) using pow on y.
- sun disk with smoothstep based on dot(dir, sunDir), plus glow.
- Maybe clouds? Could add procedural clouds via noise for realism, but keep simple. Maybe a simple fbm cloud layer using hash noise in shader. That adds realism. Let's add light wispy clouds near horizon... Could complicate. Let's add subtle procedural clouds with a couple of sine-based noise? Might look like bands. I'll consider.

Actually visual quality: We can add a horizon haze band, sun glow, and maybe a few clouds using simple 2D value noise in the shader. That is fine and cheap.

3. Ocean: PlaneGeometry(400,400) — need at least 400x400 units. Use 500? "at least 400 x 400 units, centered on origin". Use 400x400 with 200x200 segments (or 256x256). Let's use 256x256 segments → 66k verts, fine. Rotate -PI/2 so plane in XZ. Displacement computed in vertex shader from position (x, z). Note after rotation, the geometry local coords: position.x, position.y map to world x and -z? Rotating mesh by -PI/2 about X: local (x,y,0) → world (x, 0, -y)? Let's check: rotation -PI/2 about X: y' = y cos - z sin... For point (x, y, 0): rotation matrix Rx(θ) with θ=-π/2: y' = y cosθ - z sinθ = 0*? cos(-π/2)=0, sin(-π/2)=-1 → y' = 0 - z*(-1)= z =0; z' = y sinθ + z cosθ = -y. So local y becomes world -z. So world position x = local x, world z = -local y.

Easier: create plane geometry and apply rotation to geometry itself via geometry.rotateX(-Math.PI/2). Then vertex positions are in world space (x, y=0, z). Then displacement along y. And object at origin with no rotation. Good — use geometry.rotateX(-Math.PI/2) so position.x, position.z are world coords. But the mesh's bounding sphere for frustum culling should be okay. Set mesh.frustumCulled = false maybe. Since waves change y, bounding sphere is 0 height; may be culled incorrectly? Fine with frustumCulled = false.

Wave function in JS must match shader exactly. Define 4 Gerstner/sine waves. Use sine for simplicity: displacement = sum of A_i * sin(dot(D_i, (x,z)) * k_i + t * speed_i + phase_i). Need crest-to-trough ~0.5-2; total amplitude sum maybe 0.55+0.45+0.3+0.2 = 1.5, crest-to-trough 3.0, too much? "crest-to-trough height about 0.5 to 2 units" — so total amplitude sum ~0.75 → crest-to-trough 1.5. Let's use amps 0.45, 0.30, 0.20, 0.10 sum=1.05 → trough-to-crest 2.1. Slightly above 2, acceptable "about". Maybe 0.40+0.25+0.15+0.08 = 0.88 → 1.76. Good.

Wavelengths: 24, 13, 7, 4.5 → k = 2π/λ. speeds: deep water dispersion ω = sqrt(g k) ~ but just choose speeds: 1.2, 1.7, 2.2, 2.8 rad/s. Directions varied.

Gerstner waves give sharper crests and better normals; horizontal shift ignored in heightAt (per spec allowed). Let's implement Gerstner in vertex shader:

For each wave i: 
```
vec2 d = normalize(dir);
float k = 2π/λ;
float f = k * (dot(d, pos.xz)) - ω*t;  // phase
float A = amp;
// horizontal displacement: d * (A * cos(f)) * steepness? 
```
Gerstner: P.xz += Q*A*D*cos(f); P.y += A*sin(f). With Q steepness factor. If we use horizontal displacement, the heightAt(x,z,t) at undisplaced position is A*sin(f). Spec says ignore horizontal shift, so heightAt returns sum A sin(f) at (x,z). Good. But then actual rendered geometry at world position x,z has height from displaced position — slight mismatch. That's exactly what spec says: "heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z)... (for Gerstner waves ignore the small horizontal shift)". So shader should use undisplaced pos for f. If shader computes f from undisplaced position and adds horizontal displacement, the vertical displacement at the undisplaced vertex is a sum of sines of undisplaced pos. So heightAt matches exactly at vertices. Good.

But horizontal displacement would move the vertex so the point at world (x,z) is not the same vertex. Since we ignore shift, the boat uses heightAt(undisplaced) which is fine per spec. Actually to keep exact "the two must match the picture", simplest: no horizontal displacement, pure sine sum. Normals computed analytically from the same sum. That's clean and guarantees match. Visible waves with sharpness? Sine is fine. To make crests sharper, we can add a shaping function but then JS must match — doable but more work.

Let's do sum of sine waves. 4 waves. For normals: derivative dh/dx = sum A_i * k_i * d_i.x * cos(f_i); dh/dz similarly. normal = normalize(vec3(-dh/dx, 1, -dh/dz)).

Actually in vertex shader with geometry rotated, position.y is 0, and we set position.y = h. Fine.

Fragment shading:
- viewDir, normal
- fresnel = pow(1 - dot(N, V), 5) mix
- deep color (0x03203a?) and shallow color (0x1a6f8a?), mix by fresnel maybe plus wave height.
- sky reflection: approximate sky color by gradient function of reflect vector; we can implement a simplified skyColor(vec3 dir) function in GLSL matching the sky dome roughly. Good.
- sun specular: Blinn-Phong with high exponent, plus sun color.
- foam: near crests where height > threshold, and near shore (distance from island center < shore radius). Use noise for patchiness. Also foam based on steepness? Height threshold with smoothstep. Add foam color mix.
- Fog: apply manually in fragment shader to match scene.fog (fog color and density) since ShaderMaterial doesn't auto-fog unless we add fog uniforms and chunks. We can add `fog: true` and use fog chunks, but easier to compute manually with uniforms fogColor, fogDensity, and use exp2 fog: 1 - exp(-density^2 * depth^2). Scene.fog = FogExp2(color, density). In shader use cameraPosition and vWorldPos.

We need to be careful the water looks good: waves need fine detail. With 256x256 segments over 400 units, spacing ~1.56 units. Wavelength 4.5 min — barely resolved (need ~2-3 samples per wavelength; 1.56 spacing gives ~3 per 4.5, ok but aliasing). Could use normal-map-like detail in fragment shader by adding small ripples to the normal computed per-pixel? That would look much better. But then heightAt wouldn't match at small scales — heightAt only needs the large waves. We could add micro-ripples in fragment normal only (not displacement). Visually the ocean gets high-frequency sparkle. That's acceptable: heightAt returns the displacement (large waves). But "normals from the waves" — we compute analytic normals from the same waves in vertex. We can add small ripple normals in fragment for detail. Hmm, spec says the two must match the picture. Since ripples only affect shading not displacement, still matches.

Maybe simpler: compute normal per-fragment from the wave sum using world position (higher frequency accurate), then add small ripple perturbation. That gives crisp specular. Let's compute in fragment: 
```
vec3 waveNormal(vec2 p, float t) { ... same sum derivative ... }
```
4 waves with cos — cheap. Then add micro ripples with 2 additional sine terms (small amplitude, short wavelength) for sparkle. That looks good.

Vertex shader computes height for displacement; fragment computes normal from same base waves plus detail. Good.

Also shore foam: island radius ~ up to 22 units at water. Use radial distance from origin, foam where r between shoreR and shoreR+4 modulated by noise and wave phase. Also crest foam using height.

Also need the island to sit in water with beach. We'll do procedural island geometry.

4. Island: 30-50 units across, peak 5-15 above water. Use a plane geometry (e.g., 60x60 with 128x128 segments) rotated, with vertex heights from radial falloff plus noise. Or better a circular disc geometry: CylinderGeometry? Use PlaneGeometry(64,64,128,128) rotated -PI/2, compute y = height(r) with noise; set vertex colors: sand near water, grass higher, rock on steep slopes/high. Use MeshStandardMaterial({vertexColors:true, flatShading:false}) with roughness.

Height function: base = peak * (1 - smoothstep(0, R, r))^? Let's define:
```
const R = 24; // island radius where it meets water
h(r) = max(0, (1 - (r/R)^2) )^1.5 * peak + noise...
```
Need beach near water: where height near 0-0.8, sand color. Sloping into sea: geometry extends to 32 and below water (negative) so it goes underwater smoothly.

Let's define:
```
function islandHeight(x,z) {
  const r = Math.hypot(x,z);
  const falloff = Math.max(0, 1 - r/28);
  let h = 10 * Math.pow(falloff, 1.8);
  // add ridges
  h += 2.2 * Math.pow(falloff,1.5) * (Math.sin(x*0.35)*Math.cos(z*0.3) + 0.5*Math.sin(x*0.7+z*0.4));
  // flatten near peak? 
  h -= 1.5; // so edges below water
  return h;
}
```
We want island radius ~ 22 at waterline. With peak 12. Let's use R=26, peak 11, subtract 1.2 so at r=26 h=-1.2 (under water). At r=22: falloff=(1-22/26)=0.1538; pow1.8 ≈ 0.033; *11 = 0.37; -1.2 = -0.83. Hmm too low, so waterline nearer center. Let's compute where h=0.

Better use formula: h(r) = peak * (1 - (r/R)^k) - offset? Let's craft with smoothstep. Let's just use:
```
const t = clamp(1 - r/R, 0, 1);
let h = peak * Math.pow(t, 1.6) - 0.6;
```
At r = R: h = -0.6 (underwater); waterline where peak * t^1.6 = 0.6 → t = (0.6/11)^(1/1.6) = 0.0545^0.625 ≈ e^{0.625*ln0.0545}= e^{-1.814}=0.163 → r = R*(1-0.163)=0.837R. With R=28 → waterline r≈23.4, diameter ~47. Good, within 30-50 across. Peak 11 - 0.6 = 10.4. Good.

But plane geometry 64x64 covers r up to 45 in corners; need the mesh to extend below water — with R=28, t=0 beyond → h=-0.6, so flat underwater plane at -0.6. Fine but geometry still visible under water; ocean is opaque-ish (we can make it slightly transparent? No, keep opaque). The island underwater part would be hidden by ocean if ocean renders after? Ocean is opaque so it hides. But since ocean is drawn with depth, island below water gets occluded only if ocean is drawn and depth test passes. Ocean surface at y≈0 to ±1, island at -0.6 → ocean above, so occludes. Fine.

Use PlaneGeometry(70,70,160,160) = 25.6k verts fine. Compute vertex colors based on height and slope/noise. Sand: color for h < 1.2 with noise variation; grass 1.2–6; rock >6 and steep.

We need the island to receive shadows: mesh.receiveShadow = true. Also maybe castShadow = true (it receives shadows required; casting is nice). The sun shadow camera covers island and boat.

Also add some rocks/bushes? Optional. Keep it good-looking: add a few rock meshes? Could add palm trees: 6 palms.

5. Palm trees: curved trunk via TubeGeometry along CatmullRomCurve3, or stack of cylinders. TubeGeometry with radius taper? TubeGeometry has constant radius. Could use a LatheGeometry? Simpler: build trunk from ~10 cylinder segments with decreasing radius, positioned along a curve, in a Group. But 6 palms * 10 segments = 60 meshes — fine. Or use a CatmullRomCurve3 and TubeGeometry with radius 0.25, and scale? Fine visually with slight taper not critical. Use TubeGeometry(curve, 16, 0.22, 6, false) with MeshStandardMaterial brown. Add a "crown" at the top.

Leaves: one InstancedMesh with all leaves of all palms: 6 palms × 8 leaves = 48 instances (≥30). Leaf geometry: custom leaf shape — use a PlaneGeometry bent? Better: create a leaf from a Shape extruded? Simple approach: use a custom BufferGeometry for a tapered leaf blade (like a curved quad strip). But instancing with a single geometry and per-instance matrices requires each leaf instance to have its own orientation and position; we can build a leaf geometry centered at origin extending along +X (or +Y) with a droop curve baked into geometry, then per instance transform (rotate around y for azimuth, tilt). But swaying "in the wind by updating instance matrices every frame" — we need to update matrices, so each leaf's matrix = palmTop position + rotation(yaw) * rotation(tilt + sway) * scale. The droop can't be baked separately per instance easily unless geometry has droop. We can bake droop in geometry as a curved blade along +X with y decreasing. Then a per-instance yaw rotates it around trunk, a pitch tilts. Sway modifies yaw/tilt slightly.

Geometry for leaf: create a strip along X from 0 to length L=2.4, width tapering from 0.35 at base to 0 at tip, with y = -0.35 * (x/L)^2 (droop). Build manually as BufferGeometry with positions and indices. Use DoubleSide material, MeshStandardMaterial green with vertexColors maybe gradient. Since InstancedMesh uses one material, bake vertex colors along length for a nice gradient (dark base to bright tip). Use vertexColors true material.

Compute normals: geometry.computeVertexNormals(). DoubleSide.

Alternatively use a simple flat leaf and rely on rotation; but a curved blade looks better. Let's build a strip with segments N=8, for each segment two vertices at y offset curve, width taper. Actually leaf should be narrow at base, wide in middle, narrow at tip. width = 0.3 * sin(pi * u)^0.7? Let's do w = 0.28 * Math.sin(Math.PI * u) with u from 0..1, plus slight.

We'll create positions: for i in 0..N: u=i/N; x = u*L; y = -0.45*u*u; z = ±w(u)/2? Actually leaf lies in XZ plane with width in Z. Then y droop negative. Then rotate instance around Y to spread azimuth. Good.

But each leaf should extend from the crown point outward. If geometry starts at x=0 base at crown, and instances positioned at crown position with yaw rotation, good.

Sway: update each instance matrix each frame:
```
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
for each leaf: e.set(pitch + sway, yaw + sway2, roll); q.setFromEuler(e); m.compose(crownPos, q, scale); leaves.setMatrixAt(i, m);
```
Sway with time and per-instance phase: pitch += sin(t*1.5 + phase)*0.08.

Also the palm trunk could sway slightly? Not required.

Need trunk positions on island. Choose points around island with radius < waterline. For each palm, compute base y = islandHeight(x,z); trunk base at that y. Trunk curves slightly outward. Height ~5-7.

Palm creation: for each of 6:
- base position (x, y, z) with y = islandHeight.
- trunk curve: CatmullRomCurve3 with points from base to top with a lean; top at base + (leanX, 6, leanZ).
- TubeGeometry(curve, 20, 0.28, 8, false). Material brownish (0x6b4f2a) roughness 0.9.
- Add a small sphere at crown? Maybe not.
- Add coconuts? optional.

Add trunk meshes to island group so island group exposed as __island includes palms? The spec says expose the island (Mesh or Group) as __island, it receives shadows. If we group island terrain + palms + rocks, set receiveShadow on each. __island can be a Group. That's fine. But note "Expose the island (Mesh or Group) as (window as any).__island; it receives shadows." Group can't receive shadows itself but children can. Safer to make __island = terrain mesh (receives shadows), and add palms to scene separately or as children of terrain mesh? Palms as children of terrain mesh is fine. But InstancedMesh leaves are separate; keep them in scene. Let's expose __island as the terrain Mesh, and add palms to a group added to scene (or as children of island mesh). Hmm, if palms are children of island mesh, their transforms are relative to island mesh which is at origin, so fine. But terrain mesh geometry already has world-ish coords (plane centered at origin) with vertices displaced; mesh at origin. Children at world coords fine. Let's just add palms to scene directly, keep __island as terrain mesh. Add rocks too.

6. Boat: Group with hull, deck/cabin, mast, sail.
- Hull: use a LatheGeometry? Or an ExtrudeGeometry from a shape? Build from primitives: a hull can be made from a scaled sphere half? Or a BoxGeometry with tapered shape. Simplest good-looking: use a custom hull from ExtrudeGeometry of a boat-shaped 2D outline, extruded vertically, then scale? Or use a CylinderGeometry with radius top/bottom to make a tapered hull? Let's design:

Boat about 4 units long (x axis length), ~1.6 wide, ~0.9 tall.
Hull: Use a "boat hull" via LatheGeometry rotated? Easier: create a shape in XY (profile of hull cross-section?) Hmm.

Option: Use ExtrudeGeometry: define a Shape of the deck outline (a pointed oval) and extrude downward with bevel to create hull. Shape in XZ plane? ExtrudeGeometry extrudes along Z. Define shape in XY with boat outline (x length, y width), extrude along z by depth 0.8, then rotate -90° about X so extrusion becomes vertical (y). Bevel gives tapered sides. That looks like a hull with flat bottom. Add slight scale.

Alternatively use a "capsule" scaled: SphereGeometry with scale (2, 0.5, 0.8) and cut? A half-sphere hull looks like a bowl. Could use CylinderGeometry(0, 1, 0.8, 8) rotated? Hmm.

Let's do ExtrudeGeometry hull:
```
const hullShape = new THREE.Shape();
hullShape.moveTo(-2.0, 0);           // stern center? 
```
Shape coordinates: x along boat length, y across width. Boat outline symmetric:
- start at (-2, 0) stern tip? Actually stern is squared. Let's make outline points: (-1.9, -0.55), (-1.2,-0.8), (0.5,-0.8), (1.3,-0.55), (2.0, 0), (1.3, 0.55), (0.5, 0.8), (-1.2, 0.8), (-1.9, 0.55). Use quadratic curves for smoothness.

Extrude with depth 0.9, bevelEnabled true, bevelSize 0.15, bevelThickness 0.2, bevelSegments 3. Then rotate geometry by -PI/2 about X so extrusion along Y (upward). The shape's x → world x, shape y → world -z? After rotateX(-PI/2): (x, y, z) → (x, z, -y). So shape's y becomes world z = -y. Fine symmetric. Extrusion z 0..0.9 → world y = z? wait rotate -PI/2 maps local z to world y? Using matrix: y' = y cosθ - z sinθ = 0*y? cos(-π/2)=0, sin(-π/2)=-1: y' = y*0 - z*(-1) = z. z' = y sinθ + z cosθ = -y. So local z (extrusion) → world y. Good, hull extends upward 0..0.9. But we want the hull centered vertically around waterline, perhaps from y=-0.35 to y=0.6. Translate geometry by -0.3 in y. Then hull spans -0.3..0.6. Waterline at 0. Good.

Add a deck: a thin box or scaled box at y=0.55 sized to fit, color wood light. Add cabin: box at rear with slight roof (another box), windows maybe dark box strips. Mast: CylinderGeometry tall 3.2 at x=0.3, y from 0.6 to 3.8. Sail: use a triangle shape (ShapeGeometry) in XY plane oriented along x-y? Sail should be a triangle attached between mast and boom. Use BufferGeometry triangle with vertices. Or PlaneGeometry scaled/sheared? Simplest: custom triangle geometry with vertices (0,0.6,0), (0,3.6,0), (1.5,0.8,0) — a sail in the XY plane, material white DoubleSide. Add a boom cylinder. Maybe add another jib sail. Keep simple.

Sail also should be double sided white with slight roughness.

The boat group's origin at the waterline center. Then y = heightAt + offset. Boat at (12,0,14). But island radius ~23, boat at r = sqrt(144+196)=18.4 from origin — that's on the island slope! Boat would be on land. Need boat at (12,0,14) which is within island radius 23. Hmm, spec says boat at about (12, 0, 14) and island centered origin 30-50 across. That conflicts: boat would be on island. Distance 18.4, island waterline radius ~23. So boat sits on land/beach. Hmm. We must follow boat position. Maybe make island smaller: 30-50 units across means diameter 30-50 → radius 15-25. Boat at 18.4. Need waterline radius < 18.4. Choose diameter ~34 → waterline radius 17. Then peak 8-10. But island must be 30-50 across, so radius 17 is within 30-34 diameter. Good.

So set island waterline radius ~15-16.5, so boat at 18.4 is in water. Terrain plane extends to ~26 underwater. Peak 8.

Let's define R=20 in formula, peak 9, offset such that waterline at r≈15.2:
h = peak * t^1.6 - 0.5, t = clamp(1 - r/R,0,1).
Waterline: 9*t^1.6 = 0.5 → t = (0.0556)^(1/1.6) = e^{-2.891*0.625}= e^{-1.807}=0.164 → r=0.836*20=16.7. Diameter 33.4. Good, and boat at 18.4 clear by 1.7 units. But waves amplitude ~1 could wash boat near shore — fine, boat floats.

Peak height ~9-0.5 = 8.5 (within 5-15). Good.

The island "30 to 50 units across" — 33.4 waterline, terrain extends to 40 (plane 80 maybe). Fine.

Palm trees must be on land: radius < 15 maybe. Choose 6 positions with r between 4 and 13.

7. Sun direction: pick sun elevation ~20-30° for nice lighting, azimuth e.g. east. Camera at (35,12,35) looking at origin: sun should be visible in the sky maybe behind? Camera looks toward -x,-z direction... camera at +x,+z looking to origin; sky visible in that direction is +x,+z. Sun at direction e.g. (0.6, 0.5, 0.4) normalized would be visible in front-ish? Camera direction is (-0.7,-0.2,-0.7). Sun at (0.6,0.45,0.4) is behind camera. Put sun at (-0.5, 0.35, -0.6)? That's roughly in front of camera (camera looks -x,-z), so visible above ocean/island. Let's set sun direction normalized from origin toward sun: (-0.55, 0.42, -0.72) roughly. Elevation ~25°. Light position = sunDir * 100. Directional light target origin.

Sky shader sun disk at that direction. Nice.

Shadows: DirectionalLight shadow camera ortho covering island and boat: camera left/right ±30, top/bottom ±30, near 1 far 200, mapSize 2048. Position sunDir*80, target at origin. Bias -0.0005, normalBias 0.05.

Shadow camera covers boat at (12,14) and island. ±30 around origin covers. Good.

8. Fog: scene.fog = new THREE.FogExp2(0x9fc4dd, 0.0045)? With far ocean at 400 units, fog density 0.004 → at 200 units fog factor 1-exp(-(0.004*200)^2)=1-exp(-0.64)=0.47; at 400: 1-exp(-2.56)=0.92. Good. Horizon blend. Choose fog color matching sky horizon. Sky horizon color maybe #b8d8e8. Use 0xbcd6e4. Ocean shader uses same fog.

But the sky dome itself should not be fogged (so horizon gradient stays). Fine.

9. Tone mapping ACESFilmic, outputColorSpace = SRGBColorSpace. Set renderer.toneMappingExposure ~1.0.

10. Camera exactly at (35,12,35), lookAt (0,2,0). OrbitControls allowed but must start there and not move by themselves. Adding OrbitControls that start at camera position is fine; but they might change camera on user input only, fine. However OrbitControls target (0,2,0), camera position given. We can add controls with enableDamping false (so no self-motion). It's optional; skip to avoid issues? Adding OrbitControls is nice for testing but not required. I'll add it with target (0,2,0) — but camera.lookAt after controls? controls.update() sets orientation based on target. Should be consistent. Use enableDamping = false. Actually not necessary; skip controls to reduce risk. But "OrbitControls are allowed if they start there and do not move by themselves" — optional. I'll include for interactivity, with damping false, but camera.lookAt(0,2,0) first. Controls update once. It's fine. Hmm, OrbitControls import from 'three/addons/controls/OrbitControls.js'. Type definitions come with three package? In three's types, addons paths exist in recent versions. To be safe with tsc strict, importing OrbitControls might require moduleResolution that finds examples/jsm types. The three package includes types for addons? Modern three (r15x) ships types under `examples/jsm`? Actually `three/addons/*` maps to `three/examples/jsm/*` via package exports. TypeScript may resolve types from `@types/three`? If using three's own types (since r0.150+, three includes `types/three`? Hmm). The prompt explicitly allows addons imports, so environment likely supports. But to minimize risk, avoid addons entirely. Build own sky. Good — no addon imports needed. Only `import * as THREE from 'three';`.

11. Boat pitch and roll from wave slope: sample heightAt front/back and sides:
```
const hF = heightAt(x + 2, z), hB = heightAt(x - 2, z)
const hR = heightAt(x, z + 1.2?), hL = heightAt(x, z - 1.2)
pitch = Math.atan2(hB - hF, 4)? 
```
Define boat forward along +X. Pitch rotation about Z axis? In three, rotation.x rotates around X (pitch for boat heading along Z?). Let's set boat local forward = +X. A slope along X means bow up/down → rotation about Z axis. Slope along Z → roll about X axis. So:
- rotation.z = -atan2(hF - hB, 4) maybe (if front higher, bow should rise → rotation about Z positive raises +X? Rotation about Z by θ: point (1,0,0) → (cosθ, sinθ, 0), so positive θ raises +X. So rotation.z = atan2(hF - hB, 4). Good.
- roll about X: point (0,0,1) → (0, -sinθ, cosθ) for rotation x θ: y' = -z sinθ. Point on +Z side goes down for positive θ. Sample hR (starboard +Z) and hL (-Z): rotation.x = atan2(hL - hR, 2*side)? If right higher, want +Z side up → rotation.x negative. rotation.x = atan2(hL - hR, 2*span) with hL - hR negative → negative, so +Z goes up. Correct.

Also boat position y = heightAt(x,z,t) + offset (e.g., 0.0 since hull centered around waterline with bottom -0.3 and top 0.6). Maybe offset 0.1.

Drift slowly within 25 units of origin: boat base (12,14) distance 18.4. Drift must stay within 25. Add circular drift of radius 2 around base: x = 12 + 1.5 cos(t*0.1), z = 14 + 1.5 sin(t*0.1) — distance from origin up to 18.4+1.5=19.9 < 25. Good. But drift might take it closer to island: base 18.4, drift 1.5 → min 16.9 which is near waterline 16.7. Boat could be on beach. Use drift radius 1 with phase so min 17.4. Or keep boat mostly stationary: drift small 0.8. Fine.

Wave time: shader uses `waveTime` uniform updated by elapsed seconds from clock, possibly slowed. Let waveTime = elapsed (seconds). In shader phase uses waveTime. heightAt(x,z,t) computes with given t. time() returns current waveTime. Important: time() should return wave time in seconds that shader uses right now. If we use elapsed directly, time() returns elapsed. Use a uniform `uTime` set to elapsed each frame. Good.

12. Performance: ocean 256x256 = 65k verts, fragment with 4 waves + ripples — okay. Shadow map 2048. Island 160x160 plane = 25k. Fine.

13. Water is opaque; but island underwater part hidden. Good. The boat must float; hull at waterline.

Water foam near shore: in shader use uniform shore params (island radius etc.). Compute radial distance from origin of vWorldPos, foam band around shore radius 16.7 with noise. Need noise in GLSL. Implement hash/noise functions.

Let's write GLSL carefully. Use WebGL2 (Three r150+ uses GLSL ES 3.0 for ShaderMaterial? In Three.js, ShaderMaterial uses GLSL1 by default unless glslVersion set; three prepends and converts? It works with GLSL1 syntax. Use `varying`, `attribute`? In vertex shader, `position` and `normal` are automatically declared by Three's shader prefix (for ShaderMaterial, three prepends common uniforms/attributes for position, normal, uv). Yes ShaderMaterial gets `attribute vec3 position;` etc. via prefix. But note: if we set `glslVersion: THREE.GLSL3` not needed. Use standard.

In fragment shader, `cameraPosition` is available as a uniform automatically? For ShaderMaterial, Three prepends `uniform vec3 cameraPosition;` in vertex shader? Actually the common uniforms are in the fragment prefix too: `uniform mat4 viewMatrix; uniform vec3 cameraPosition;` yes in default fragment prefix. Let me recall: WebGLProgram's prefixFragment includes:
```
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
```
Yes. And prefixVertex includes `uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition; ... attribute vec3 position; attribute vec3 normal; attribute vec2 uv;`. Good.

Thus we can use cameraPosition in fragment.

Sky dome: We could implement as large SphereGeometry(500, 32, 16) with BackSide ShaderMaterial and depthWrite false, renderOrder? Or a full-screen background shader? Simpler: use scene.background with a shader? Can't. Use sphere radius 900 (less than far plane 2000), BackSide, depthWrite false, fog false, toneMapped? Sky shader outputs color; tone mapping applies if material.toneMapped true? For ShaderMaterial, tone mapping is applied only if `#include <tonemapping_fragment>` is in the shader. We'll include `<tonemapping_fragment>` and `<colorspace_fragment>` at end to apply ACES and sRGB. Actually for the sky we want it tone-mapped consistently. We can call `#include <tonemapping_fragment>` then `#include <colorspace_fragment>`. In fragment shader with ShaderMaterial, those chunks rely on `toneMappingExposure` uniform? Three injects `uniform float toneMappingExposure;` in prefix for fragment when material.toneMapped? Hmm. Let me recall: WebGLProgram prefixFragment includes `uniform float toneMappingExposure;`? It includes tone mapping functions based on renderer.toneMapping via getToneMappingFunction. The chunk `tonemapping_fragment` uses `toneMapping` function. The uniform `toneMappingExposure` is declared in prefixFragment? I believe yes: prefixFragment contains `uniform float toneMappingExposure;`? Let's verify mentally: In WebGLProgram.js, prefixFragment for non-raw includes:
```
'uniform mat4 viewMatrix;',
'uniform vec3 cameraPosition;',
'uniform bool isOrthographic;',
...
parameters.toneMapping !== NoToneMapping ? '#define TONE_MAPPING' : '',
parameters.toneMapping !== NoToneMapping ? ShaderChunk['tonemapping_pars_fragment'] : '',
parameters.toneMapping !== NoToneMapping ? getToneMappingFunction('toneMapping', parameters.toneMapping) : '',
...
```
And `tonemapping_pars_fragment` declares `uniform float toneMappingExposure;`? Yes it contains:
```
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
```
Something like that. Good. Then `#include <colorspace_fragment>` uses `linearToOutputTexel` function defined in colorspace_pars_fragment which is included in prefix based on outputColorSpace? I think the prefix includes `colorspace_pars_fragment`. Yes. So including both chunks works.

Alternatively, manually apply ACES? Too complex. Use chunks. Risk: Some versions require `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`; standard practice. Fine.

But for the ocean shader, we compute final linear color and then include tonemapping and colorspace chunks. Good.

For ShaderMaterial, set `fog: false` (we compute fog manually) but we want fog color uniform.

Let's plan the ocean shader:

Uniforms:
- uTime float
- uSunDir vec3
- uSunColor vec3
- uDeepColor vec3
- uShallowColor vec3
- uFoamColor vec3
- uFogColor vec3
- uFogDensity float
- uCamPos? use cameraPosition
- waves arrays? Could pass vec4 array for directions/amp/wavelength/speed, but defining constants in shader is fine and JS mirrors. To avoid mismatch, define constants in both and keep identical. Or pass uniforms and iterate. Using a uniform array of 4 vec4 plus wave params is clean.

Let's pass uniforms:
```
uWaveA: vec4 (amplitude per wave)
uWaveK: vec4 (wavenumber per wave) or wavelength
uWaveDir: vec4? Direction needs vec2 each → array of vec2 or four vec2 uniforms. Simpler: hardcode constants in shader and mirror in TS with a JS array. Since we control both, it's fine and less uniform overhead.
```
Define in GLSL:
```
const vec2 D0 = normalize(vec2(1.0, 0.35));
const float L0 = 26.0;
const float A0 = 0.40;
const float S0 = 1.15;
...
```
Phase: f = k*dot(D, p) - S*t. where k = 6.2831853/L.

Height: A*sin(f). Derivative: A*k*cos(f) * D.

Let's pick:
Wave 1: dir (1, 0.35) normalized, λ=32, A=0.40, speed=1.0
Wave 2: dir (-0.6, 1) normalized, λ=18, A=0.26, speed=1.3
Wave 3: dir (0.8, -0.7) normalized, λ=9.5, A=0.16, speed=1.8
Wave 4: dir (-0.3, -1) normalized, λ=5.2, A=0.08, speed=2.4

Sum amps=0.9 → crest-to-trough 1.8. Good.

Wave speeds: phase speed ω/k = S/k = S*L/(2π): wave1: 1.0*32/6.28=5.1 units/s (fast but fine), wave2 3.7, wave3 2.7, wave4 2.0. Could reduce speeds for calmer look: S=0.7, 1.0, 1.4, 1.9. Let's use ω = 0.8, 1.2, 1.7, 2.2. Fine.

In shader, we need the same phase sign in JS: h = Σ A sin(k * dot(D,p) - ω*t + φ). Add phases per wave for variety: φ = 0, 1.7, 4.1, 2.6. Mirror in JS.

Vertex:
```
float waveHeight(vec2 p, float t) { ... }
void main() {
  vec3 pos = position;
  float h = waveHeight(pos.xz, uTime);
  pos.y += h;
  vWorldPos = (modelMatrix * vec4(pos,1.0)).xyz;
  // pass undisplaced p for normal? fragment uses vWorldPos.xz
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}
```
Since model matrix identity, world pos ok.

Fragment:
```
vec3 n = waveNormal(vWorldPos.xz, uTime); // analytic base
// add ripples
n = normalize(n + vec3(rippleX, 0, rippleZ));
```
Ripple normal: use small waves with short wavelengths relative to p: 
```
float r1 = 0.06 * sin(p.x*2.1 + p.y*1.3 + t*3.0) ...
```
Actually derivative approach: add gradient:
```
vec2 g = vec2(0.0);
g += 0.05 * 2.6 * cos(dot(vec2(0.8,0.6),p)*2.6 + t*3.2) * vec2(0.8,0.6);
...
n = normalize(vec3(-(baseGrad + g).x, 1.0, -(baseGrad+g).y));
```
But if base normal computed from base waves only, and ripples added with gradient, good.

Compute viewDir = normalize(cameraPosition - vWorldPos).

Fresnel: `float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 5.0); fres = mix(0.02, 1.0, fres);` Actually Schlick: F = F0 + (1-F0)*pow(1-cosθ,5), F0=0.02.

Reflection direction: R = reflect(-viewDir, n); approximate sky color:
```
vec3 skyColor(vec3 dir) {
  float y = clamp(dir.y, 0.0, 1.0);
  vec3 horizon = vec3(0.75,0.86,0.93);
  vec3 zenith = vec3(0.16,0.38,0.66);
  vec3 c = mix(horizon, zenith, pow(y, 0.6));
  // sun glow
  float s = max(dot(dir, uSunDir), 0.0);
  c += uSunColor * pow(s, 180.0) * 2.0; // disk-ish
  c += uSunColor * pow(s, 8.0) * 0.15;
  return c;
}
```
But tone mapping will darken/brighten. Fine.

Water base color: mix deep and shallow based on height and/or fresnel:
```
float depthMix = smoothstep(-0.8, 0.9, heightAt? we don't have height in fragment; can compute waveHeight(vWorldPos.xz,uTime) → yes fragment can compute the same height (cheap).
vec3 waterCol = mix(uDeepColor, uShallowColor, smoothstep(-1.0, 1.0, h)*0.6 + 0.2);
```
Actually shallow color should be where near shore/shallow. We can use distance from origin: near island (r < 24) → shallow. Combine:
```
float shore = 1.0 - smoothstep(16.0, 30.0, length(p));
vec3 base = mix(uDeepColor, uShallowColor, clamp(0.25 + 0.5*shore + 0.2*h, 0,1));
```
Also add subsurface scattering-ish glow on crests: `base += uShallowColor * smoothstep(0.3,0.9,h)*0.2`.

Specular: Blinn-Phong:
```
vec3 H = normalize(uSunDir + viewDir);
float spec = pow(max(dot(n,H),0.0), 220.0) * 3.0;
col += uSunColor * spec;
```
Also a broader specular: pow 40 * 0.2.

Reflection combine: `col = mix(base, sky, F)` plus spec. Add sun glitter.

Foam:
- crest foam: smoothstep(0.55, 0.95, h) * noise pattern. Use fbm on p*0.8 + t. Foam near shore: shore band where r between 15.5 and 18 (island waterline 16.7), plus distance from shore. But the island occupies center; foam ring at r≈17. Also small foam along waves.
- Use `float foamMask = smoothstep(0.45, 0.9, h) * 0.6 + shoreBand * 0.5;` with noise.
Actually with h max ~0.9, crest foam threshold 0.45. Fine.

Foam color off-white, and use noise to break it. 
```
float n1 = noise(p*1.5 + t*0.3);
float n2 = noise(p*4.0 - t*0.5);
float foam = smoothstep(0.5, 0.85, h + n1*0.25) * smoothstep(0.2,0.8,n2);
float shoreFoam = ...;
col = mix(col, vec3(0.9,0.95,0.97), foam*0.7);
```

Fog: 
```
float dist = length(vWorldPos - cameraPosition);
float fogFactor = 1.0 - exp(-uFogDensity*uFogDensity*dist*dist);
col = mix(col, uFogColor, fogFactor);
```
Since fog color is defined in sRGB-ish values but shader works linear... The fog color passed as THREE.Color is linear? THREE.Color from hex is in sRGB by default and when set to material uniform it's... Color has convertSRGBToLinear maybe. For uniforms, three doesn't automatically convert. We can pass fog color and treat it as linear? To match scene.fog, three's fog color is also used raw in shader (fog chunk mixes with fogColor uniform, which is raw color values, i.e., sRGB-ish numbers treated as linear then tone mapped and output converted). Hmm, three's Color values in materials are converted to linear at material setup? For built-in materials, colors are converted via `ColorManagement` when set? Since r152, color management converts sRGB inputs to linear-sRGB working space on `Color.setHex`? Yes, with ColorManagement enabled, `new THREE.Color(0x...)` stores linear values? Actually THREE.Color.setHex(hex, colorSpace = SRGBColorSpace) converts to working color space (linear-sRGB) if ColorManagement.enabled. So uniform colors are linear. Good, so uFogColor from new THREE.Color(0xbcd6e4) is linear. Same for scene.fog.color. So matching works.

Sky shader: similar output linear then tonemap then colorspace.

Let's make the sky shader:
- SphereGeometry(600, 48, 24), material BackSide, depthWrite false, fog false.
- Vertex passes normalized direction: `vDir = normalize(position);` (sphere centered at camera? We'll keep sphere at origin and radius large; camera inside. Direction = normalize(worldPos)). Since sphere radius 600 and camera offset 35, negligible.
- Fragment: 
```
float h = clamp(dir.y, -1, 1);
float t = pow(clamp(h*0.5+0.5...), ...)
```
Better: horizon at y=0, zenith at y=1.
```
vec3 horizon = vec3(0.72, 0.84, 0.92);
vec3 zenith = vec3(0.12, 0.32, 0.62);
float alt = clamp(dir.y, 0.0, 1.0);
vec3 col = mix(horizon, zenith, pow(alt, 0.55));
// below horizon (not seen much) darker
col = mix(vec3(0.55,0.68,0.78), col, smoothstep(-0.1,0.05,dir.y));
```
Sun disk:
```
float sd = dot(dir, uSunDir);
float disk = smoothstep(0.9993, 0.9997, sd); // ~1-2 deg
col += uSunColor * disk * 12.0;
col += uSunColor * pow(max(sd,0.0), 64.0) * 0.6; // glow
col += uSunColor * pow(max(sd,0.0), 6.0) * 0.1;
```
Clouds: Add subtle procedural clouds:
We need noise. Use hash-based value noise, fbm 4 octaves. Cloud band near horizon: project dir onto plane at altitude. 
```
vec2 uv = dir.xz / max(dir.y, 0.08) * 1.5; // plane projection
float f = fbm(uv*0.6 + uTime*0.002);
float cloud = smoothstep(0.55,0.8, f) * smoothstep(0.02,0.15,dir.y) * (1.0-smoothstep(0.5,0.9,dir.y));
col = mix(col, vec3(1.0,0.99,0.97), cloud*0.5);
```
Could look decent. Use cheap noise. Need fbm defined in sky shader only. It adds shader cost but sky sphere covers screen; 4 octaves of value noise is fine on mid GPU. Maybe 3 octaves.

Potential issue: Tone mapping ACES will compress bright sky; exposure 1.0. Sky colors ~0.7-0.9 map to ~0.6. Should look okay. Maybe use exposure 1.05.

The ocean's sky reflection should approximate sky color. Use similar constants.

14. Sun light intensity: modern three uses physically correct lights? In r155+, default `useLegacyLights` removed; DirectionalLight intensity in lux-ish? DirectionalLight intensity 3 works with ACES. Set intensity 3.2. Hemisphere light intensity 0.6, sky color light blue, ground color sand/ocean. Ambient maybe 0.2.

Materials for island: MeshStandardMaterial vertexColors, roughness 0.95, metalness 0. Use flatShading? No, smooth. We compute vertex normals.

Vertex colors: 
- sand near h < 1.2: color 0xd9c8a0 (light sand). 
- grass 1.2-5.5: green 0x4f7a3a with variation.
- rock > 5.5: gray-brown 0x7a6a58.
- also steep slopes rock. Compute approximate slope from height gradient? We can compute normal after geometry computeVertexNormals; color based on height only + noise. Good enough. Add a beach ring.

To make the island look nicer, add a slight noise to height to avoid perfect cone. Use value noise in JS:
```
function hash2(x,z) { ... } // deterministic pseudo-random
function noise2(x,z) { interpolate hash }
```
Implement smooth value noise.

Island height:
```
const R = 20, PEAK = 9.0;
function islandHeight(x,z) {
  const r = Math.hypot(x,z);
  const t = Math.max(0, 1 - r/R);
  let h = PEAK * Math.pow(t, 1.7) - 1.2;
  // add ridge noise scaled by t
  h += (noise2(x*0.16, z*0.16) - 0.5) * 3.0 * Math.pow(t, 1.3);
  h += (noise2(x*0.45, z*0.45) - 0.5) * 0.8 * t;
  return h;
}
```
Waterline where base -1.2 + noise... Let's compute: PEAK 9, t such that 9 t^1.7 = 1.2 → t = (0.1333)^(1/1.7)= e^{-2.0149*0.588}= e^{-1.185}=0.306 → r = 0.694*20 = 13.9. Diameter 27.8 — slightly below 30. Need bigger. Use offset 0.5: t=(0.0556)^{0.588}= e^{-1.707}=0.181 → r=16.4, diameter 32.8. Good. Peak height ~8.5.

But noise subtracts up to 1.5, could push some areas below water. Fine, creates bays. Let's offset 0.5.

Let's define:
```
const R = 20;
const PEAK = 9.0;
h = PEAK * t^1.7 - 0.6
```
waterline t: (0.6/9)^(1/1.7)=0.0667^0.588= e^{-2.706*0.588}=e^{-1.592}=0.2035 → r=0.7965*20=15.93. Diameter 31.9. Good. Boat at 18.4 clear by 2.5. Add noise ± maybe 1.0 * t scaled; at waterline t=0.2, noise factor 0.2^1.3=0.12, so ±0.36 — beach varies. Good.

Peak height 8.4 + noise up to +1.0 = 9.4. Within 5-15. Good.

Plane size 56x56, segments 180? 180*180=32k. Fine. But geometry corners at r=39 → t=0 → h=-0.6 flat. Ocean hides. Good. Maybe make below-water terrain dark to avoid artifacts. Fine.

The island must receive shadows. mesh.receiveShadow = true; castShadow = true.

Palm trees: Need to place on land, where h between 1.5 and 7 and not too steep. Predetermined positions:
Let's pick 7 palms:
(3,1) r=3.16 → h high (~7)
(-6,-3) r=6.7 → ~5
(8,-5) r=9.4 → ~2.5
(-9,4) r=9.85 → ~2
(4,-10) r=10.8 → ~1.5
(-3,11) r=11.4 → ~1.2
(11,6) r=12.5 → maybe 0.7 (too low, beach). Use (10,3) r=10.4.
Let's make 8 palms to be safe for instances count: 8 palms × 7 leaves = 56. Need ≥30. Use 8 leaves each = 64 instances. Good.

Actually leaves per palm: 9 leaves × 7 palms = 63. Use 7 palms × 9 leaves = 63.

Palm top positions computed from base + lean. For instance matrices, base crown = trunk curve's end point.

Trunk curve: from base to top with slight curve:
```
const lean = new THREE.Vector3(0.6*dx, 0, 0.6*dz) where (dx,dz) radial outward.
points: p0 = base; p1 = base + (lean*0.3, 2.2, ...); p2 = base + (lean*0.7, 4.2); p3 = base + (lean, 6.0)
```
Trunk radius 0.25. Add top crown sphere? Use a small IcosahedronGeometry(0.35) green/brown maybe.

Leaves instanced: geometry built with length 2.6. Instance transform at crown: position = trunk top, rotation Euler(pitch, yaw, roll), scale 1 (or random ~0.9-1.15). The leaf geometry extends along +X from origin, droops. Pitch about Z? If geometry along +X and droops down in y, rotating about Y spreads azimuth. To make some leaves point more upright vs drooping, we apply rotation about Z (pitch) to raise/lower: rotating about Z by positive θ raises +X. Base geometry droops -0.45 at tip; if we apply pitch -0.2 to +0.5, can vary. But if we set rotation order 'YXZ'? Use Euler with order 'YXZ': yaw about Y then pitch about X? Hmm. Let's define q = Quaternion from Euler(0, yaw, tilt, 'YZX')? Let's think: We want to rotate leaf around world Y by yaw (azimuth), then tilt up/down around the horizontal axis perpendicular to leaf direction (which is local Z axis after yaw). If we use Euler with order 'YZX' (apply Y first, then Z, then X?) Three's Euler order 'YZX' means rotation matrix = Ry * Rz * Rx? Actually Three's Euler order applies in order? The rotation matrix is composed as R = Rz * Ry * Rx for 'XYZ'? In Three, Euler order 'XYZ' means rotate about X then Y then Z? Hmm. Simpler: build quaternion:
```
qYaw.setFromAxisAngle(up, yaw);
qTilt.setFromAxisAngle(new Vector3(0,0,1), tilt); // local Z, applied before yaw
q = qYaw.multiply(qTilt)
```
Then leaf direction = q * (1,0,0) → tilt raises it then yaw rotates. Good. Add sway to tilt and yaw.

Use Matrix4.compose(position, q, scale).

Every frame update all 63 matrices, `instanceMatrix.needsUpdate = true`. Also set `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

Shadows for leaves: castShadow = true, receiveShadow maybe. InstancedMesh shadows work.

15. Add extra details for "game not demo": 
- A few rocks on island (dodecahedron meshes with gray material).
- Maybe a small hut? Not required but adds charm. Could add a small beach hut near shore. But keep scope manageable.
- Clouds in sky.
- Sun glow on water.
- Boat details: wooden hull, white cabin, mast, sail, flag? Add a small flag maybe.
- Seagulls? Not required.

Let's add rocks and maybe some bushes (small green spheres) - optional. Keep moderate.

16. Testing exposure:
```
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ocean = { heightAt, time };
(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__island = island;
(window as any).__sun = sun;
```
And `__ready` after first frame rendered. Use a boolean in render loop: after renderer.render, if not ready set ready.

17. TypeScript strict: all variables typed or inferred. Avoid any implicit any. Use functions with explicit return types. Avoid possible null. `document.body.appendChild(renderer.domElement)`.

Resize handler typed.

Let's write code.

Detailed constants and functions:

```ts
const WAVE_DEFS = [
  { dir: new THREE.Vector2(1, 0.35).normalize(), wavelength: 32, amplitude: 0.40, speed: 0.8, phase: 0.0 },
  ...
];
```
But shader hardcodes the same. To avoid drift, I could generate GLSL from JS constants. That's elegant: build shader strings with template literals from WAVE_DEFS. Then guaranteed match. Let's do that! Generate wave constants as GLSL code lines.

Define type:
```ts
interface WaveDef { dx: number; dz: number; len: number; amp: number; speed: number; phase: number; }
```
Normalize dir in JS; store dx, dz normalized, and k = 2π/len.

Generate GLSL:
```
const WAVE_GLSL = waveDefs.map((w,i) => `
  const vec2 WD${i} = vec2(${w.dx}, ${w.dz});
  const float WK${i} = ${w.k};
  const float WA${i} = ${w.amp};
  const float WS${i} = ${w.speed};
  const float WP${i} = ${w.phase};
`).join('\n');
```
Then a function:
```
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  h += WA0 * sin(WK0 * dot(WD0, p) - WS0 * t + WP0);
  ...
  return h;
}
vec2 waveGradient(vec2 p, float t) {
  vec2 g = vec2(0.0);
  g += WA0 * WK0 * cos(...) * WD0;
  ...
  return g;
}
```
Generate using arrays. Good.

heightAt JS:
```
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of waveDefs) {
    const f = w.k * (w.dx * x + w.dz * z) - w.speed * t + w.phase;
    h += w.amp * Math.sin(f);
  }
  return h;
}
```
This matches shader exactly (floating point differences negligible).

Ocean vertex shader:
```
uniform float uTime;
varying vec3 vWorldPos;

${WAVE_GLSL}

float waveHeight(vec2 p, float t) { ... }

void main() {
  vec3 pos = position;
  pos.y += waveHeight(pos.xz, uTime);
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Note: ShaderMaterial vertex prefix includes projectionMatrix, modelViewMatrix, viewMatrix, modelMatrix. Using `projectionMatrix * viewMatrix * wp` fine.

Fragment:
Need uniforms: uTime, uSunDir, uSunColor, uDeepColor, uShallowColor, uFoamColor, uFogColor, uFogDensity.
Also varying vWorldPos.

Noise functions:
```
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i=0;i<4;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
  return v;
}
```
Need loop constant, fine.

Sky color function in ocean fragment:
```
vec3 skyColor(vec3 d) {
  float y = clamp(d.y, 0.0, 1.0);
  vec3 horizon = vec3(0.62, 0.78, 0.90);
  vec3 zenith = vec3(0.10, 0.28, 0.58);
  vec3 c = mix(horizon, zenith, pow(y, 0.55));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSunColor * pow(s, 6.0) * 0.25;
  c += uSunColor * pow(s, 128.0) * 1.5;
  return c;
}
```
Match sky dome roughly. In sky dome I used horizon (0.72,0.84,0.92) and zenith (0.12,0.32,0.62). Let's keep same values in both to be consistent: define horizon = vec3(0.66,0.80,0.91), zenith = vec3(0.11,0.30,0.60). Use pow(y, 0.6).

Given tone mapping, these linear colors will get brighter? ACES tonemapping darkens highlights, but these values <1. Good.

Ocean final:
```
vec2 p = vWorldPos.xz;
float h = waveHeight(p, uTime);
vec2 grad = waveGradient(p, uTime);

// detail ripples gradient
grad += 0.035 * 2.1 * cos(2.1*p.x + 1.3*p.y + 3.1*uTime) * vec2(2.1,1.3);
```
Wait derivative of sin(2.1x+1.3y+...) is cos * (2.1,1.3). Amplitude 0.035 → gradient magnitude 0.035*2.1 ≈ 0.07. Add a couple.

```
vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
```

View:
```
vec3 viewDir = normalize(cameraPosition - vWorldPos);
float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, viewDir), 0.0), 5.0);
vec3 refl = reflect(-viewDir, n);
vec3 sky = skyColor(refl);
```

Base color:
```
float shore = 1.0 - smoothstep(14.0, 26.0, length(p));
float depthTint = clamp(0.35 + 0.35*shore + 0.25*h, 0.0, 1.0);
vec3 base = mix(uDeepColor, uShallowColor, depthTint);
```
Deep color maybe 0x052a44 → linear dark blue. Shallow 0x1d7f8e? Let's pass sRGB hex colors and Color converts to linear. Deep 0x07324f, shallow 0x1a7f93. Mixed in linear. Could look dark. Add some ambient.

Specular:
```
vec3 hvec = normalize(uSunDir + viewDir);
float spec = pow(max(dot(n, hvec), 0.0), 180.0);
float spec2 = pow(max(dot(n, hvec), 0.0), 24.0);
vec3 col = mix(base, sky, fres);
col += uSunColor * (spec * 2.5 + spec2 * 0.15);
```
Sun color: warm white (1.0,0.93,0.82) * intensity? pass THREE.Color(0xfff2dc) with values ~1. Good.

Foam:
```
float crest = smoothstep(0.35, 0.8, h);
float fn = fbm(p * 0.9 + vec2(uTime*0.15, -uTime*0.1));
float fn2 = fbm(p * 3.5 - vec2(uTime*0.4));
float foam = crest * smoothstep(0.45, 0.8, fn) * smoothstep(0.2,0.7,fn2);
// shore foam ring
float dist = length(p);
float ring = smoothstep(18.0, 16.5, dist) * smoothstep(14.5, 16.0, dist); // ring around 15-18? 
```
Hmm shore waterline radius varies ~16. Foam ring around 16.5-18. Let's do:
```
float shoreFoam = (1.0 - smoothstep(16.0, 19.5, dist)) * smoothstep(13.5, 16.0, dist);
shoreFoam *= smoothstep(0.3, 0.7, fbm(p*1.3 + uTime*0.2));
```
But island radius ~16; water inside 16 is land (occluded), foam just outside. Also add wave-driven foam lines: use `sin(dist*2.0 - uTime*1.5)`? could look artificial. Keep noise.

```
float foamAmt = clamp(foam*0.85 + shoreFoam*0.7, 0.0, 1.0);
col = mix(col, uFoamColor, foamAmt);
```
uFoamColor ~ (0.9,0.95,0.97) linear... new THREE.Color(0xeaf4f7) converted linear ~0.8. Fine.

Add subtle sparkle: not necessary.

Fog:
```
float fogDist = length(cameraPosition - vWorldPos);
float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * fogDist * fogDist);
col = mix(col, uFogColor, fogFactor);
```
Then `#include <tonemapping_fragment>` `#include <colorspace_fragment>`.

Since output is gl_FragColor in GLSL1: chunks use gl_FragColor. In three r152+, colorspace_fragment uses `gl_FragColor = linearToOutputTexel(gl_FragColor);` yes.

Need `gl_FragColor = vec4(col, 1.0);` before chunks.

One issue: For ShaderMaterial, tonemapping chunk only included if material.toneMapped is true (default true). Good.

Transparent? No, opaque.

Ocean mesh: material side FrontSide. Plane rotated so normals up. Good.

Also set `renderer.outputColorSpace = THREE.SRGBColorSpace;` (default anyway) and toneMapping.

Sky shader final similarly.

Sky dome should be added before ocean? Render order: sky sphere large, depthWrite false, and material.depthTest true? If depthWrite false but depthTest true, sky renders first or last depending on renderOrder. Set `sky.renderOrder = -1` and material.depthWrite=false, depthTest=false? If depthTest false, sky drawn over everything? No, it draws first (renderOrder -1) then other objects draw over it. Since sky is backside and far, depth test off works if drawn first. But opaque objects render sorted by renderOrder; set sky.renderOrder = -1000 ensures first. With depthWrite false, subsequent objects draw over. Good. However if sky draws first with depthTest false it fills screen, then ocean/island drawn over. Good. Use material.depthWrite = false, depthTest = false. But careful: with tone mapping and sky, fine. Sphere radius 500, inside far plane 2000.

Alternatively use scene.background = color and a sky dome. Fine.

Sun disk visibility: camera looks at origin from (35,12,35) → direction (-0.7,-0.2,-0.7). Sun at (-0.55, 0.42, -0.72) normalized; camera's view direction is toward -x,-z and down. The sun direction is up and toward -x,-z. Is it within view? Camera FOV 50, camera pitch downward ~ -11°. Sun elevation 25°. Difference in elevation ~36°, FOV vertical 50 → the sun may be near the top edge or just outside. Hmm. Camera at (35,12,35) looking at (0,2,0): direction normalized: (-35, -10, -35) → elevation = atan2(-10, 49.5) = -11.4°. Sun elevation 25° → 36.4° above view center; vertical half-FOV = 25° (if fov 50). So sun outside view. We need a visible sun position: "a sky with a visible sun position". Could lower sun elevation to ~10°, giving 21° above center, within 25° half-FOV. Good. Sun direction (-0.6, 0.20, -0.78) normalized. Elevation ~11.5°. Direction dot: horizontal (-0.6,-0.78) length 0.985, elevation atan(0.20/0.985)=11.5°. Camera pitch -11.4°, difference 22.9°, within 25°. Visible near top. But a low sun gives warm lighting; nice. Directional light intensity maybe warm.

Sun position for light: sunDir * 100 (so y=20). Shadow camera near/far. Light target origin. With low sun, shadows long — nice. But shadow camera ortho ±30 covers.

Let's set sunDir = new THREE.Vector3(-0.55, 0.35, -0.76).normalize() → elevation ~23°, too high maybe. Camera half-FOV 25°, difference 34°. Not visible. Use FOV 60? Then half vertical 30°, difference 34 still outside. Use sunDir with elevation 0.18 → 10.2°, difference 21.6, visible with fov 50. Good. Let's set (-0.6, 0.22, -0.78).normalize() → y normalized: length sqrt(0.36+0.0484+0.6084)=sqrt(1.0168)=1.0084 → y=0.218, elevation 12.6°. Camera pitch -11.4, diff 24°, just inside 25°. Sun near top edge. Maybe set camera fov 55 → half 27.5. Good. Use fov 55? PerspectiveCamera(50) typical. Use 52. Let's use 55 for a nicer wide view, half 27.5. Then sun visible.

But the sun disk at top edge may be barely visible. Fine.

Alternatively set sun azimuth more towards camera's forward and elevation 8°. Diff 19.4. Good. Use sunDir (-0.7, 0.16, -0.7) normalized. Elevation ~9.2°. Diff 20.6. Visible. Lower sun gives golden hour, nice for a tropical scene. Warm sun color 0xffe0b0. Sky horizon warm.

Sun light color 0xfff0d0, intensity 3.0.

Hmm, low sun means shadow map coverage long shadows and light direction nearly horizontal. Fine.

Let's pick sunDir = (-0.62, 0.28, -0.73).normalize → elevation 16°. Diff 27.4 just outside fov 55 (half 27.5) edge. Hmm. Use fov 60 (half 30). Then visible. Let's set camera fov 55 and sun elevation 14°: dir (-0.65,0.22,-0.73). length sqrt(0.4225+0.0484+0.5329)=sqrt(1.0038)=1.002; y=0.2195, elevation 12.7°. Diff 24.1, inside 27.5. Good. Visible near top. Use that.

Sun disk radius: dot threshold 0.9993 corresponds angle acos(0.9993)=2.14°. Disk visible.

OK.

Sky dome clouds with sun low: clouds near horizon. Good.

18. Boat construction details with typed functions.

Hull via ExtrudeGeometry:
```ts
const shape = new THREE.Shape();
shape.moveTo(-1.9, -0.55);
shape.quadraticCurveTo(-2.0, -0.2, -1.9, 0.55); // hmm orientation
```
Let's create outline points symmetric around x-axis:
Start at stern (-2.0, 0.55) → go to bow tip.
Simplify:
```
shape.moveTo(-2.0, -0.62);
shape.lineTo(-1.1, -0.85);
shape.quadraticCurveTo(1.2, -0.85, 2.05, 0.0);
shape.quadraticCurveTo(1.2, 0.85, -1.1, 0.85);
shape.lineTo(-2.0, 0.62);
shape.closePath();
```
Wait bow at +x (2.05, 0). Stern at -2.0. Good. But shape y is width; boat beam 1.7 → half 0.85.

Extrude depth 0.9, bevel 0.12. Then rotate geometry -PI/2 about X, and translate y by -0.25 so hull spans -0.25..0.65 + bevel. Actually extrusion local z from 0..0.9 plus bevel extends -bevelThickness to depth+bevelThickness? Bevel extends both? ExtrudeGeometry bevel adds at both ends: z from -bevelThickness to depth+bevelThickness? I think bevel goes both sides. So span about -0.15..1.05. Translate y -0.35 → -0.5..0.7. Good waterline at 0.

Hull material: dark wood or painted navy/white? A white hull with teak deck looks nice. Use hull color 0xf2efe6 (white) or deep blue 0x2e5a7a? Realistic small sailboat: white hull with blue stripe. Let's use hull material color 0xe8e4d8, roughness 0.5, metalness 0.05. Deck: wood brown.

Deck: Use a thin box (or a shape geometry matching outline) at y=0.65. A box 3.4 x 0.08 x 1.2 is okay but corners stick out. Use ShapeGeometry of the deck outline scaled slightly smaller, rotate to horizontal. ShapeGeometry lies in XY plane. RotateX(-PI/2) to make it horizontal (XY → XZ). Set y=0.62. Deck material wood.

Actually we can reuse a scaled shape. Create `deckShape` similar to hull but smaller (scale 0.9) and ShapeGeometry; rotateX(-PI/2); translate y 0.62. Good.

Cabin: box or a small cabin at the stern: BoxGeometry(1.1, 0.6, 0.9) positioned at x=-0.7, y=0.95. White/cream material. Add roof slightly larger box. Add windows: dark small boxes on sides. Keep simple: cabin box + roof box + window strip.

Mast: CylinderGeometry(0.06, 0.08, 3.4, 8) at x=0.4, y bottom 0.65 → center y=0.65+1.7=2.35. Mast top y=4.05.

Boom: CylinderGeometry(0.05,0.05,1.6,8) rotated z=-PI/2? Horizontal along x at y=1.0, from mast x=0.4 to x=-1.2? Boom extends aft. Position x=-0.4, y=1.05, rotation.z = Math.PI/2 (cylinder along y by default, rotate to x). Length 1.6 → spans -1.2..0.4.

Sail: triangle shape from mast top (0.4, 4.0) down to boom (0.4, 1.1) and aft (-1.1, 1.1). Build BufferGeometry with vertices in local boat coordinates:
```
(0.42, 3.95, 0.0), (0.42, 1.15, 0.0), (-1.15, 1.15, 0.0)
```
A flat triangle in XY plane at z=0. But a sail should be slightly curved and double-sided. Could create a curved sail with segments. Simple triangle enough. Use MeshStandardMaterial white DoubleSide, roughness 0.7. Maybe add a jib: triangle from mast top to bow (2.0,0.7). Gives nice silhouette.

Add a small flag at mast top: a plane triangle red.

Boat group overall: hull, deck, cabin, roof, windows, mast, boom, main sail, jib, flag. ≥3 meshes. castShadow true for all, receiveShadow true for hull/deck.

Group origin at waterline. Position (12,0,14).

But boat 4 units long; group local length 4.2. Fine.

Boat heading: maybe rotate group yaw to face away from island, e.g., rotation.y = -0.6 rad. But pitch/roll from wave slope needs local axes; if we set group rotation, then rotate about local axes? We compute slope in world x/z and set rotation.x/z in local coordinates — if yaw nonzero, mismatch. Simpler: keep yaw = 0 (boat forward +X). Fine. Or compute rotated samples. Keep yaw 0 for correctness. Could apply yaw in a child group but then wave slope relative to local axes... not necessary. Keep boat aligned +X.

Boat height: y = heightAt(x,z,t) + 0.15? Hull spans -0.5..0.7 relative to group origin; group origin at waterline means bottom -0.5 under water, deck at 0.7 above. Good. Set offset 0.0 maybe. If wave height at center is h, set position.y = h. Then boat rides water surface. Good. Maybe +0.05.

Pitch/roll:
```
const hF = heightAt(x + 2.0, z, t);
const hB = heightAt(x - 2.0, z, t);
const hR = heightAt(x, z + 0.8, t);
const hL = heightAt(x, z - 0.8, t);
boat.rotation.z = Math.atan2(hF - hB, 4.0) * 0.8;  // reduce
boat.rotation.x = Math.atan2(hL - hR, 1.6) * 0.8;
```
Actually pitch should be about Z with forward +X. Positive θ raises bow. hF-hB positive → bow rises. Good. Roll: hR (starboard +Z) higher → +Z side up. Rotation about X positive sends +Z side down (as computed). So rotation.x = -atan2(hR - hL, 1.6) = atan2(hL-hR,1.6). Good.

Also add slight bobbing of mast? no.

Boat drift: x = 12 + 1.0*Math.sin(t*0.07), z = 14 + 1.0*Math.cos(t*0.05). Distance from origin max sqrt((13)^2+(15)^2)=19.8 <25. Min maybe 17. good. Ensure not on island: min distance ~17.4 > waterline 16. Good.

19. Shadow config:
```
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near = 1; far = 200;
sun.shadow.camera.left=-35; right=35; top=35; bottom=-35;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.03;
sun.position.copy(sunDir).multiplyScalar(80);
sun.target.position.set(0,0,0);
scene.add(sun.target);
```
The shadow camera at sun position looking at origin. Ortho ±35 covers island (±20) and boat at (12,14). Good.

20. Fog and background. Add scene.fog = new THREE.FogExp2(fogColor, 0.0038). Far ocean 400 units: exp(-(0.0038*400)^2)=exp(-2.31)=0.099 → 90% fog at edge. Good blend. At 100 units: exp(-0.144)=0.866 → 13% fog. Good.

Sky horizon color should match fog color. Fog color linear from 0xc8dde8 maybe. Sky horizon 0xc8dde8-ish linear ~ (0.58,0.73,0.80). Use same hex for both. But fog color should be horizon-ish blue with warm tint near sun? Uniform single color is fine.

Let's choose fogColor = 0xbfd8e6. Sky horizon = same. In sky shader, horizon color linear values from that hex: (0.75? no). Compute: 0xbf=191/255=0.749 sRGB → linear ≈0.52; 0xd8=216/255=0.847→linear 0.69; 0xe6=230/255=0.902→linear 0.79. So horizon linear (0.52,0.69,0.79). Use these in sky and ocean. Good. zenith hex 0x2f6fae → sRGB (47,111,174)/255=(0.184,0.435,0.682) → linear (0.029,0.16,0.42)? Hmm linear conversion: 0.184→0.0288, 0.435→0.16, 0.682→0.42. That's darker. In shader directly writing linear values, using (0.03,0.16,0.42) will produce after ACES+srgb a sky blue. Fine. Maybe use (0.08,0.25,0.55) for a nicer blue. Since sky shader output is linear then tonemapped; ACES will shift. Let's use zenith linear (0.08, 0.22, 0.52) and horizon (0.55, 0.72, 0.82). Sun color (1.0, 0.85, 0.65) maybe.

Tone mapping ACES: color (0.55,0.72,0.82) → moderately bright. Fine.

Could skip tone mapping chunk on sky and just output sRGB? No, consistency matters.

21. Palm leaves material: MeshStandardMaterial({vertexColors:true, side:DoubleSide, roughness:0.6, metalness:0.0}) with color gradient baked. Leaf geometry vertex colors: base darker green, tip brighter/yellowish. Add slight per-instance variation via instanceColor? InstancedMesh has setColorAt which requires material vertexColors? Instance colors multiply. We could use `leaves.setColorAt(i, color)` but that's optional. Simpler skip.

Need to compute normals for leaf geometry. Custom geometry positions with two vertices per segment. Index: for i, vertices 2i and 2i+1. Triangles: (2i, 2i+1, 2i+2), (2i+1, 2i+3, 2i+2). Compute normals; DoubleSide lighting okay.

Leaf curve: base at x=0, tip at x=2.6. y = -0.55 * u^1.7 (droop). width = 0.34 * sin(pi*u)^0.6 (narrow at base and tip). At u=0 width 0 (a point at crown); maybe base width 0.05 for a petiole. Use w = 0.05 + 0.3*sin(pi*u)^0.7. Hmm at tip width 0.05. Fine.

Actually leaves should be long and narrow. Keep length 2.4, width 0.35.

Vertex colors: base color 0x2f5d24, tip 0x7fae3c. Interpolate. Add midrib? Could add a center line but not necessary.

For a palm crown, also add a small sphere at top with brown/green.

22. Rocks: create 6 dodecahedron meshes with scale, gray material, on island near shore. Use `new THREE.DodecahedronGeometry(1, 0)` scaled randomly. Position on island height. cast/receive shadows. Add to scene. Good.

23. Add some bushes? maybe skip; enough detail.

24. Water shader must be visible waves: at crest-to-trough 1.8 units, visible. Ocean plane 400x400. But camera is at 35,12,35 looking at origin; water extends 200 units each direction. The horizon will be at y=0 from camera height 12 → horizon distance infinite; ocean plane edge at 200 units will be visible and fogged. But the plane edge against sky could show a hard line if fog doesn't fully hide. At distance ~280 from camera, fog exp(-(0.0038*280)^2)=exp(-1.13)=0.32 → 68% fog. Still visible edge. Increase fog density to 0.006? At 280: (1.68)^2=2.82, exp=0.06 → 94% fog. At 100: (0.6)^2=0.36→ exp=0.70 →30% fog. That might be too foggy near. Hmm. Ocean size 400 means edge at radius 200 from origin; camera is 50 from origin, so distance to far edge ~250. With density 0.005: (1.25)^2=1.56, exp=0.21 → 79% fog. Edge still slightly visible but the sky horizon color matches fog color, so blending is okay even if not fully. Since plane edges at y waves ±1 and sky horizon at y=0, the transition line could be hidden by fog color matching the sky horizon. Since fog color = horizon color, the far ocean becomes exactly horizon color, matching the sky at the horizon. Good. So even 70% fog looks blended because ocean converges to horizon color which equals sky horizon. Use density 0.0045.

Also the ocean plane extends to 400x400 but the camera sees edges at 200; with fog it's fine.

Could enlarge ocean to 600x600 with same segments (stretching waves) — but wave wavelengths would be resolved differently? The wave function still applies per position, but grid resolution 600/256=2.34 units spacing, under-sampling 5.2 wavelength (2.2 samples) → aliasing. Keep 400 with 256.

25. The island plane: 56x56 with 180 segments. Underwater part flat at -0.6, will intersect ocean waves (±0.9) causing ocean to cut through island near shore? At r>16, island height -0.6, ocean waves range -0.9..0.9. The island underwater would poke above water in troughs! Because island terrain at -0.6 while wave trough -0.9 → terrain visible above water where waves trough. That would look like muddy flat planes around island. Need island terrain to drop deeper underwater beyond waterline. Formula h = PEAK*t^1.7 - 0.6 gives -0.6 flat outside R. Should go deeper, e.g., subtract more strongly at low t or continue slope: for r > R, h = -0.6 - (r-R)*0.5. Let's make the island's base drop off steeply: 
```
let h = PEAK * Math.pow(t, 1.7) - 0.7;
if (r > R) h = -0.7 - (r - R) * 0.8;
```
But t=0 at r>=R, h=-0.7, then slope down. At r=24 (edge of visible shore), h=-0.7-4*0.8=-3.9, hidden under water. Good. But geometry plane 56 gives r up to 39 → h=-15.9, fine. Actually with r>R we want the terrain to continue descending. Use:
```
const base = PEAK * Math.pow(t, 1.7) - 0.7;
const deep = -0.7 - Math.max(0, r - R) * 0.9;
h = Math.min? 
```
Actually for r<R base may be negative near edge, base > deep? At r=19, base = 9*(0.05)^1.7 -0.7 = 9*0.0061-0.7=-0.645; deep = -0.7-... (r-R negative → max 0 → -0.7). base > deep. We want smooth: h = base + deepExtension where deepExtension = -0.9*max(0, r-R). So:
```
h = PEAK * t^1.7 - 0.7 - 1.2 * Math.max(0, r - R);
```
At r=R: -0.7. At r=24: -0.7-4.8=-5.5. Good. Hidden.

But wait, waterline where h=0. With -0.7: t=(0.7/9)^(1/1.7)=0.0778^0.588=e^{-2.553*0.588}=e^{-1.501}=0.223 → r=15.5. Diameter 31. Good. Boat at 18.4 clear.

Add noise term that only applies on land, scaled by t. At shore t=0.22, noise scale t^1.3=0.14 → ±0.5. Could make some shore bits below 0; fine.

26. Island vertex color: Need to compute after displacement. use `geometry.attributes.position`. For each vertex (x,z), y computed. Color based on y and noise. Set color attribute Float32BufferAttribute.

Sand near y < 1.4 (with noise variation), grass 1.4-5.5, rock higher or steep. Use smooth transitions by lerping colors.

Also darken underwater vertices (not visible). Fine.

Colors in sRGB hex need convert to linear? For vertex colors in three, vertex colors are assumed to be in linear-sRGB? Actually vertex color attribute values are used directly as linear. With ColorManagement, `new THREE.Color(0x...)` converts to linear via setHex. Then use c.r,c.g,c.b to fill attribute — those are linear. Good.

27. Materials: island MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }). Flat? smooth.

Trunk material brown.

28. Lighting: hemisphere light sky color 0x9fc4dd ground 0x5a6b40 intensity 0.5; ambient maybe 0.15. Sun directional 2.8.

Since sun is low, warm. Use sun color 0xffd9a0, intensity 3.0. Hemisphere 0.45.

29. Render loop:
```
const clock = new THREE.Clock();
let started = false;
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime(); // wave time
  oceanMaterial.uniforms.uTime.value = t;
  updateBoat(t);
  updateLeaves(t);
  renderer.render(scene, camera);
  if (!ready) { (window as any).__ready = true; ready = true; }
});
```
Use elapsed for wave time. For sway use t.

Delta unused? Could use for drift? Use elapsed. Delta not needed but we can still compute to avoid unused var lint? tsc strict doesn't complain unused locals unless noUnusedLocals is on (strict does not include noUnusedLocals). But keep clean: don't call getDelta, use getElapsedTime.

Note: __ready should be set after the first frame rendered. Setting after renderer.render in first loop is fine.

30. `window as any` assignments. Need cast to any. Use:
```
const w = window as any;
```
but TS strict fine.

31. Resize handler:
```
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize);
```
Set size initially too. Use setPixelRatio before setSize. For performance cap 2 (or 1.5). Mid-range GPU, cap 2 fine. Maybe cap 1.75. Use Math.min(devicePixelRatio, 2).

32. Camera exact position (35,12,35) and lookAt (0,2,0). Set fov 55, near 0.1, far 2000. `camera.lookAt(0, 2, 0)` after creation. Good. No controls.

33. Potential issue: Sky sphere radius 500, camera far 2000, okay.

34. Tone mapping on ShaderMaterial chunks. Let's double check that `#include <tonemapping_fragment>` uses `gl_FragColor`. In three r160 chunk:
```
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
Yes.

`#include <colorspace_fragment>`:
```
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
Yes.

Need `#include <common>`? We use no common functions except maybe none. For sky noise, use own functions. Fine.

In fragment shader, `cameraPosition` is available. But for ShaderMaterial, prefixFragment includes cameraPosition only if? Let me verify: In WebGLProgram.js:
```
prefixFragment = [
  ...
  'uniform mat4 viewMatrix;',
  'uniform vec3 cameraPosition;',
  'uniform bool isOrthographic;',
```
Yes.

35. ShaderMaterial uniforms types in TS: 
```
const oceanUniforms = {
  uTime: { value: 0 },
  ...
};
```
Three infers `{ value: number }` etc. Fine. Accessing `oceanMaterial.uniforms.uTime.value = t` typed as number? TypeScript type of uniforms is `{ [uniform: string]: IUniform }` where IUniform has value: any. Fine.

36. Build shader strings with template literal. Need to ensure `${WAVE_GLSL}` inserted.

Generate functions:
```
const waveDefs: WaveDef[] = [
  { dx: ..., dz: ..., len: 34, amp: 0.38, speed: 0.85, phase: 0.0 },
  ...
];
```
Compute normalized dir and k. Do:
```
function makeWave(dx:number,dz:number,len:number,amp:number,speed:number,phase:number): WaveDef {
  const l = Math.hypot(dx,dz);
  return { dx: dx/l, dz: dz/l, len, amp, speed, phase, k: (Math.PI*2)/len };
}
```
Type with k.

Then JS heightAt loops.

GLSL generator:
```
function buildWaveGLSL(defs: WaveDef[]): string {
  const consts = defs.map((w,i)=>`
const vec2 WD${i} = vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)});
const float WK${i} = ${w.k.toFixed(6)};
const float WA${i} = ${w.amp.toFixed(6)};
const float WS${i} = ${w.speed.toFixed(6)};
const float WP${i} = ${w.phase.toFixed(6)};`).join('\n');
  const heightTerms = defs.map((_,i)=>`  h += WA${i} * sin(WK${i} * dot(WD${i}, p) - WS${i} * t + WP${i});`).join('\n');
  const gradTerms = defs.map((_,i)=>`  g += WA${i} * WK${i} * cos(WK${i} * dot(WD${i}, p) - WS${i} * t + WP${i}) * WD${i};`).join('\n');
  return `${consts}\n\nfloat waveHeight(vec2 p, float t) {\n  float h = 0.0;\n${heightTerms}\n  return h;\n}\n\nvec2 waveGradient(vec2 p, float t) {\n  vec2 g = vec2(0.0);\n${gradTerms}\n  return g;\n}`;
}
```
Note: `vec2(${w.dx})` with toFixed yields e.g. "0.943883". Good.

37. Ocean vertex shader:
```
const oceanVertexShader = /* glsl */`
uniform float uTime;
varying vec3 vWorldPos;

${waveGLSL}

void main() {
  vec3 pos = position;
  pos.y += waveHeight(pos.xz, uTime);
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
```
Note `viewMatrix * world` gives view position; then projection. Good. But modelViewMatrix would also work: `projectionMatrix * modelViewMatrix * vec4(pos,1.0)`. Use that to be safe:
```
gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
```
And vWorldPos from modelMatrix. Fine.

38. Fragment shader string. Include `varying vec3 vWorldPos; uniform ...` etc. Note: with GLSL1, use `varying` in both. Fine.

Potential precision: set `mediump`? Default highp in fragment. Fine.

Write:
```
const oceanFragmentShader = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vWorldPos;

${waveGLSL}

float hash21(vec2 p) { ... }
float noise2(vec2 p) { ... }
float fbm(vec2 p) { ... }

vec3 skyTint(vec3 d) { ... }

void main() {
  vec2 p = vWorldPos.xz;
  float t = uTime;
  float h = waveHeight(p, t);
  vec2 grad = waveGradient(p, t);

  // fine ripples
  grad += 0.06 * cos(dot(p, vec2(1.7, 1.1)) * 1.9 + t * 3.4) * vec2(1.7, 1.1);
  grad += 0.04 * cos(dot(p, vec2(-1.2, 2.3)) * 2.6 - t * 4.1) * vec2(-1.2, 2.3);

  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(n, viewDir), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 sky = skyTint(reflect(-viewDir, n));

  float dist = length(p);
  float shore = 1.0 - smoothstep(13.0, 26.0, dist);
  float mixT = clamp(0.28 + 0.5 * shore + 0.18 * h, 0.0, 1.0);
  vec3 base = mix(uDeepColor, uShallowColor, mixT);

  vec3 col = mix(base, sky, fres);

  vec3 hv = normalize(uSunDir + viewDir);
  float ndh = max(dot(n, hv), 0.0);
  col += uSunColor * (pow(ndh, 200.0) * 2.2 + pow(ndh, 30.0) * 0.12);

  // Foam
  float fn = fbm(p * 1.15 + vec2(t * 0.18, t * -0.12));
  float fn2 = fbm(p * 2.9 - vec2(t * 0.35, t * 0.2));
  float crestFoam = smoothstep(0.32, 0.72, h + (fn - 0.5) * 0.25) * smoothstep(0.45, 0.75, fn2);
  float ring = smoothstep(19.0, 16.2, dist) * smoothstep(14.2, 16.2, dist);
  float shoreFoam = ring * smoothstep(0.35, 0.8, fn2);
  float foam = clamp(crestFoam * 0.75 + shoreFoam * 0.7, 0.0, 1.0);
  col = mix(col, uFoamColor, foam);

  // fog
  float fogDist = length(cameraPosition - vWorldPos);
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * fogDist * fogDist);
  col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
```
Wait: ring uses dist from origin in XZ. shore ring radius: island waterline ~15.5. ring = smoothstep(19,16.2,dist)*smoothstep(14.2,16.2,dist). At dist 16.2 first factor ~smoothstep(19,16.2,16.2)=1? smoothstep(edge0=19, edge1=16.2, x): if x<=16.2 → 1? Actually smoothstep(a,b,x) with a>b is undefined-ish; GLSL smoothstep requires edge0 < edge1, otherwise result is reversed but formula t=clamp((x-edge0)/(edge1-edge0)) gives for x=16.2: (16.2-19)/(16.2-19)=1 → smoothstep=1. For x>19: t negative clamp 0 → 0. So it's 1 near island, 0 far. Second smoothstep(14.2,16.2,dist): 0 at <=14.2, 1 at >=16.2. Product: ring is 1 only exactly at 16.2 and above? Hmm, product at 16.5: first ~1, second 1 → 1. At 18: first (18-19)/(-2.8)=0.357→ smooth ~0.29, second 1 → 0.29. At 14: first 1? x<16.2 →1; second 0 → 0. So ring covers 14.2-19 with peak 16.2-?; at 14.5 product small. That's okay: foam band around 15-18. But inside 14.2 where island is land, foam irrelevant (occluded). Fine.

Actually should be ring from shore outward: at 16.2 full, at 19 zero. Good.

`skyTint` function: 
```
vec3 skyTint(vec3 d) {
  float y = clamp(d.y, 0.0, 1.0);
  vec3 horizon = vec3(0.55, 0.71, 0.82);
  vec3 zenith = vec3(0.09, 0.25, 0.55);
  vec3 c = mix(horizon, zenith, pow(y, 0.6));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSunColor * pow(s, 8.0) * 0.35;
  c += uSunColor * pow(s, 200.0) * 2.5;
  return c;
}
```
This gives sun glitter reflection.

39. Sky shader:

Vertex:
```
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
Note sphere at origin; camera inside. `position` normalized gives direction from origin, good.

Fragment:
```
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
varying vec3 vDir;
... noise ...
void main() {
  vec3 d = normalize(vDir);
  float y = clamp(d.y, -1.0, 1.0);
  vec3 horizon = vec3(0.55, 0.71, 0.82);
  vec3 zenith = vec3(0.09, 0.25, 0.55);
  vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55));
  // below horizon
  col = mix(vec3(0.30, 0.42, 0.50), col, smoothstep(-0.15, 0.02, y));
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * pow(s, 220.0) * 3.0;
  col += uSunColor * pow(s, 12.0) * 0.25;
  // clouds
  if (y > 0.0) {
    vec2 uv = d.xz / max(y, 0.06) * 0.35;
    float n = fbm(uv * 2.0 + vec2(uTime * 0.01, uTime * 0.004));
    float cloud = smoothstep(0.55, 0.78, n) * smoothstep(0.03, 0.12, y) * (1.0 - smoothstep(0.45, 0.8, y));
    col = mix(col, vec3(0.86, 0.88, 0.90), cloud * 0.55);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Careful: `d.xz / max(y, 0.06)` when y near horizon gives huge uv → noise high frequency; could alias. Multiply 0.35. Might be fine. Could clamp y to 0.08 and use `uv = d.xz / (y + 0.15) * 0.5`. Fine.

Clouds with `if (y > 0.0)` branch ok.

Animated clouds with uTime (slow). We'll update sky uTime too. But spec time() returns wave time; sky can use same time. Fine.

Sun color uSunColor maybe (1.0,0.9,0.78).

40. Sun visible in sky dome: disk using pow(s, 220)*3. With s near 1, disk small. Good. Add a bright core.

41. Render order and sky visibility: The sky sphere is centered origin, radius 500. Camera at (35,12,35) inside. Fine. Ocean extends 400x400 → corners at 282 from origin. Sky radius 500 > ocean corners. Good.

42. Scene fog does not affect ShaderMaterial explicitly; we handle manually. Other materials (island, boat) use built-in fog. Good.

43. Boat material colors converted correctly.

44. Instanced leaves: Need to be added to scene, castShadow true. `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

The leaf geometry starts at origin (base) so instance position at crown. Each palm's leaves: define yaw angles evenly spread plus randomness. tilt: -0.1 to +0.5 radians (raise up). But leaf geometry already droops down; tilt about local Z positive raises. Let's set tilt around 0.15-0.55. With droop 0.45 at tip and length 2.6, leaf tip local y=-0.45; rotating by 0.3 rad raises tip by sin(0.3)*2.6=0.77, so tip goes up. Maybe use tilt 0.0-0.35 to keep leaves drooping a bit.

Sway: tilt += sin(t*1.3 + phase)*0.06 + sin(t*2.1+phase*2)*0.03; yaw += sin(t*0.9+phase)*0.05.

Use a per-instance data array with base position, yaw, tilt, scale, phase. Build at startup.

Note: `Quaternion.setFromAxisAngle` requires normalized axis. Use THREE.Vector3(0,1,0) and (0,0,1) constants.

Matrix compose: `m.compose(pos, q, scaleVec)`. Reuse temp objects.

Store leafData: 
```
interface LeafInstance { pos: THREE.Vector3; yaw: number; tilt: number; scale: number; phase: number; }
```

Update:
```
const qYaw = new THREE.Quaternion(); const qTilt = new THREE.Quaternion();
const axisY = new THREE.Vector3(0,1,0); const axisZ = new THREE.Vector3(0,0,1);
const mat = new THREE.Matrix4(); const sc = new THREE.Vector3();
for (...) {
  qYaw.setFromAxisAngle(axisY, d.yaw + Math.sin(t*0.9 + d.phase)*0.06);
  qTilt.setFromAxisAngle(axisZ, d.tilt + Math.sin(t*1.4 + d.phase*1.7)*0.10 + Math.sin(t*2.3 + d.phase)*0.04);
  qYaw.multiply(qTilt);
  sc.set(d.scale, d.scale, d.scale);
  mat.compose(d.pos, qYaw, sc);
  leaves.setMatrixAt(i, mat);
}
leaves.instanceMatrix.needsUpdate = true;
```
qYaw.multiply(qTilt) gives qYaw * qTilt (apply tilt then yaw). Good.

45. Palm trunk positions and top: Build a function `addPalm(baseX, baseZ)` returning {top, phase}. Use trunk curve:
```
const baseY = islandHeight(baseX, baseZ) - 0.15;
const outward = new THREE.Vector3(baseX, 0, baseZ).normalize();
const lean = outward.multiplyScalar(0.9);
const pts = [
  new THREE.Vector3(baseX, baseY, baseZ),
  new THREE.Vector3(baseX + lean.x*0.25, baseY + 2.2, baseZ + lean.z*0.25),
  new THREE.Vector3(baseX + lean.x*0.65, baseY + 4.4, baseZ + lean.z*0.65),
  new THREE.Vector3(baseX + lean.x, baseY + 6.2, baseZ + lean.z)
];
```
Wait normalize of (0,0) impossible; positions not at origin. Fine.

Trunk tube with radius 0.26. Curve type CatmullRom. TubeGeometry(curve, 18, 0.24, 7, false). Mesh castShadow/receiveShadow.

Top = pts[3]. Add crown sphere at top: IcosahedronGeometry(0.4,0), material brown-green, position top. This adds 7 meshes. Fine.

Add coconuts? 2 small spheres near top, brown. Optional; nice detail. 7 palms × 3 coconuts = 21 meshes; maybe too many but fine. Skip to keep clean.

Leaf positions top + slight offsets? Put at top.

46. Palm placement heights: compute islandHeight to place on land. If h<0.5, adjust maybe. Choose positions with r 4-12. Let's list:
(3.5, 1.5) r=3.8
(-5.5, -2.5) r=6.0
(7.5, -4.0) r=8.5
(-8.0, 3.5) r=8.7
(2.0, -9.0) r=9.2
(-2.5, 9.5) r=9.8
(10.0, 4.5) r=11.0
(-10.5, -6.0) r=12.1
8 palms × 8 leaves = 64 instances. Good. All within r=12.1 < waterline 15.5. Heights: at r=3.8, h≈9*(1-0.19)^1.7 -0.7 ≈9*0.70-0.7=5.6; at 12.1, t=0.395, t^1.7=0.213, h=1.9-0.7=1.2. Good, on land.

But noise may lower; still >0.5 mostly.

Leaves 8 per palm = 64. Good.

47. Island terrain geometry and colors. Need to compute heights per vertex:
```
const geo = new THREE.PlaneGeometry(56, 56, 180, 180);
geo.rotateX(-Math.PI/2);
const pos = geo.attributes.position as THREE.BufferAttribute;
const colors = new Float32Array(pos.count * 3);
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i);
  const y = islandHeight(x,z);
  pos.setY(i, y);
  // color
}
geo.computeVertexNormals();
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
```
PlaneGeometry 56 with 180 segments means 181*181 = 32761 vertices. Fine.

Color function:
```
const sand = new THREE.Color(0xdcc89a);
const wetSand = new THREE.Color(0xb99f76);
const grass = new THREE.Color(0x5d8a3c);
const darkGrass = new THREE.Color(0x3f6b2c);
const rock = new THREE.Color(0x8a7f6d);
```
Compute t between sand and grass based on y:
```
let c: THREE.Color;
if (y < 1.2) c = sand.clone().lerp(wetSand, smoothstep(0.6, -0.2, y)); // underwater darker
else if (y < 5.0) c = grass.clone().lerp(sand, 1 - smoothstep(1.2, 2.2, y))? 
```
Better: 
- y < 0.6: wetSand (but under water)
- 0.6..1.5: sand
- 1.5..3: blend sand → grass
- 3..6: grass with noise variation
- >6: blend grass → rock
Use noise for variation:
```
const n = noise2(x*0.5+11.3, z*0.5-4.7);
let c = new THREE.Color();
if (y < 0.8) c.copy(wetSand);
else if (y < 2.0) c.copy(sand);
else if (y < 4.0) c.copy(sand).lerp(grass, smoothstep(2.0,4.0,y));
else if (y < 6.5) c.copy(grass);
else c.copy(grass).lerp(rock, smoothstep(6.5, 9.0, y));
// variation
const v = 0.85 + 0.3 * n;
c.multiplyScalar(v);
```
But multiplyScalar might make colors >1? v up to 1.15, colors fine.

Use smoothstep helper in TS:
```
function smoothstep(edge0:number, edge1:number, x:number):number { const t = Math.min(1, Math.max(0, (x-edge0)/(edge1-edge0))); return t*t*(3-2*t); }
```

Slope rock: We don't have normals yet. Could approximate slope via height differences:
```
const e = 0.6;
const slope = Math.abs(islandHeight(x+e,z)-y)/e + ...
```
Expensive but fine (32k*2). Add rock on steep slopes:
```
const hx = islandHeight(x+0.8, z) - y;
const hz = islandHeight(x, z+0.8) - y;
const slope = Math.hypot(hx, hz)/0.8;
if (slope > 0.9) c.lerp(rock, smoothstep(0.9, 1.8, slope)*0.7);
```
This adds nice cliffs. But computing islandHeight twice more per vertex → 96k noise calls; fine.

Actually islandHeight uses noise2 twice, moderately cheap.

48. Rocks placement: choose 5 positions near shore:
(13, 6, r=14.3) h maybe 0.2? Beach. (12, -7, r=13.9), (-12, 4, r=12.6), (-6, -13, r=14.3), (9, 11, r=14.2). Scale ~1.2. Use DodecahedronGeometry with detail 0, material gray-brown roughness 1. Place y = islandHeight + 0.2*scale. Cast/receive shadows.

But rocks at waterline look like coastal rocks. Good.

49. Sky dome geometry: SphereGeometry(600, 48, 24). Since camera far 2000 and sphere 600, camera at 50 from origin inside. But sphere radius 600 centered at origin — camera is inside (distance 50). Fine.

Wait the camera is at (35,12,35) which is distance 50 from origin, inside sphere 600. The camera near 0.1, far 2000. Fine.

Sphere with BackSide and depthTest false; renders first. But is the sphere's geometry within frustum? The sphere surrounds camera; three's frustum culling for a sphere mesh at origin with radius 600 containing camera → intersects frustum, so rendered. Good. Set frustumCulled = false to be safe.

50. Sun position for directional light must match sky sunDir. `sun.position.copy(sunDir).multiplyScalar(120); sun.target.position.set(0,0,0); scene.add(sun.target); sun.target.updateMatrixWorld();` The DirectionalLight will point from position to target. Good.

Shadow camera ortho ±35. With sun at 120*dir, near/far: near 1, far 400. The shadow camera looks at target; distance 120. Objects within ±35 of origin along light direction; far 400 fine.

51. Water shader normal computation per fragment: waveGradient uses constants and sin/cos, 4 waves — cheap.

But note: In vertex shader, waveHeight uses `pos.xz` before model transform. Since geometry rotated and mesh at origin, equals world. In fragment, `p = vWorldPos.xz`. Good. If mesh model matrix has translation/rotation, mismatch; keep identity.

52. Boat heightAt calls use wave time t = elapsed. Good.

53. Potential mismatch of time in shader and JS: Both use same uTime. `time()` returns `waveTime` variable or `oceanUniforms.uTime.value`. Expose:
```
const oceanApi = {
  heightAt: (x:number,z:number,t:number):number => heightAt(x,z,t),
  time: ():number => oceanUniforms.uTime.value as number
};
```
But `uniforms.uTime.value` typed any; cast.

Set `uTime.value = elapsed` in loop. Good.

54. `window as any` assignments should happen after objects created. __ready after first render.

55. Need to double check TypeScript strict with `THREE.BufferAttribute` access: `geometry.attributes.position` is `BufferAttribute | InterleavedBufferAttribute`? In three types, `attributes: { [key: string]: BufferAttribute | InterleavedBufferAttribute }` maybe. Calling `pos.count`, `pos.getX` exists on both? InterleavedBufferAttribute has count, getX. Actually `BufferAttribute` has getX. Type union may work since both have getX/getZ/setY? InterleavedBufferAttribute has getX, setY? It has setY maybe. To be safe cast: `const pos = geo.attributes.position as THREE.BufferAttribute;` BufferAttribute has setY? Yes BufferAttribute.setY(index, y). Good.

For color attribute: `geo.setAttribute('color', new THREE.BufferAttribute(colors,3))`.

56. `THREE.Color` linear conversion: as of r152, `new THREE.Color(0xdcc89a)` uses ColorManagement and converts to working color space if `ColorManagement.enabled` (default true). Actually `Color.setHex(hex, colorSpace = SRGBColorSpace)` converts to working. Good. But `Color.lerp` works in linear. Good.

57. The island is exposed as mesh. Its children? None. Palms added separately. Good.

58. Boat group cast shadows: set every mesh castShadow true and receiveShadow true. Group exposed. Good.

59. Instanced leaves shadow: `leaves.castShadow = true; leaves.receiveShadow = true;` For InstancedMesh, shadows work. Good.

60. Sail double-sided material with shadow: thin triangle casting shadow okay.

61. A possible issue: The sail is a single triangle with BackSide? Use DoubleSide. Fine.

62. Sky material `fog: false`, `depthWrite: false`, `depthTest: false`, `side: THREE.BackSide`, `toneMapped: true` default. Render order -1000.

But with depthTest false and rendered first, then ocean etc draw over. With sky drawn first and depthWrite false, depth buffer remains clear (1.0). Subsequent objects render normally and appear. Good.

63. Boat should stay within 25 units. Drift as described. Check max: x=12+0.9, z=14+0.9 → sqrt(12.9²+14.9²)=sqrt(166.4+222)=19.7. Good.

64. Boat pitch/roll sampling offsets: with boat length 4, sample ±2.0. good.

65. Add a gentle constant roll? no.

66. Ocean foam near boat? no.

67. Sun light shadow camera: the sun is low, directional light position (sunDir*120) means y=26 for dir y=0.22. Shadow camera looking at origin from low angle. Ortho ±35, but with low sun, shadow map depth range along light dir: objects span maybe 80 units; near 1 far 400 fine. However ortho ±35 in shadow camera's local up/right may not cover tall island (9 units) and camera's up direction? Ortho box height ±35 enough.

68. The sun's shadow map resolution 2048.

69. Add `renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;`

Three's default outputColorSpace is SRGB. Set explicitly.

70. `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`

71. Antialiasing: renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); canvas appended.

72. Scene background: set scene.background to fog color? The sky dome covers everything, but set background color anyway. `scene.background = new THREE.Color(0xbfd8e6);` But if sky dome renders, background replaced. Fine.

73. Camera and initial look: `camera.position.set(35,12,35); camera.lookAt(0,2,0);` Exact.

74. No OrbitControls.

75. `document.body.style.margin = '0';` etc. optional. Need canvas full screen. Renderer set size. Could set body margin 0 and overflow hidden for cleanliness. Allowed.

76. TypeScript: `window.devicePixelRatio` fine.

77. Check for possible `tsc --strict` issues:
- `new THREE.Shape()` etc fine.
- `ExtrudeGeometry` options object fields typed.
- `geometry.attributes.position` cast.
- `leaves.setMatrixAt` requires Matrix4.
- `window as any` fine.
- `THREE.MathUtils` maybe unused.
- Arrays typed.

78. Let's think about the visual: camera at (35,12,35) looking at (0,2,0). Island at origin radius 15.5, peak 8.4. Boat at (12,14) — that's between camera and island? Camera direction from (35,35) to origin passes through (17.5,17.5) at halfway; boat at (12,14) is slightly to the left/far of that line but visible against island. Good composition: boat in front-right of island, camera looking over water. Sun low in sky. Waves visible.

Boat at 12,14 distance 18.4, island waterline 15.5 → boat 3 units off shore. Nice.

79. Wave amplitude: sum 0.9. At boat position waves ±0.9. Boat near shore, fine.

80. Ocean shading: deep color 0x07324f (dark teal), shallow 0x1e7f93 (turquoise). In linear: deep roughly (0.002,0.033,0.08), quite dark. Shallow (0.012,0.21,0.29). Mixed with sky fresnel. Good. Maybe deep too dark; use 0x0a3a55 → linear (0.0034,0.043,0.09). Fine.

Base water with fresnel: at grazing angles mostly sky reflection → ocean far is sky colored. Good.

81. Sun specular: sun low and forward-ish relative to camera? Sun direction (-0.65,0.22,-0.73) is roughly ahead of camera, so specular glitter path visible on water. Good.

82. Foam crest threshold: h max ~0.9, so threshold smoothstep(0.32,0.72,h) gives foam on higher crests. Good.

83. Add foam texture noise: fbm values range 0..~1 (sum of 0.5+0.25+0.125+0.0625=0.9375 * noise max 1). Good.

84. Ripple gradients: `0.06 * cos(...) * vec2(1.7,1.1)` derivative magnitude amp*k = 0.06*sqrt(1.7²+1.1²)=0.12. Fine, adds sparkle.

85. Sky dome cloud noise uses fbm with 4 octaves in fragment shading full screen — 4*2 hash calls per octave, plus sin? fine on mid GPU.

86. Could use `THREE.SphereGeometry(600, 64, 32)` 2k verts, fine.

87. Palm leaves droop geometry color attribute. Build with `BufferGeometry`. Let's write:

```ts
function createLeafGeometry(): THREE.BufferGeometry {
  const segs = 10;
  const len = 2.6;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const baseCol = new THREE.Color(0x2f5a22);
  const tipCol = new THREE.Color(0x87b83f);
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = u * len;
    const y = -0.55 * Math.pow(u, 1.8);
    const w = 0.02 + 0.34 * Math.pow(Math.sin(Math.PI * u), 0.6);
    positions.push(x, y, -w * 0.5);
    positions.push(x, y, w * 0.5);
    const c = baseCol.clone().lerp(tipCol, u);
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2);
      indices.push(a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
```
Winding: For a flat strip with positions increasing x and z ±w, the triangles a=(x,y,-w), a+1=(x,y,+w), a+2=(x+dx,y+dy,-w2). Normal direction? computeVertexNormals gives normals roughly ±y depending winding. With DoubleSide, lighting uses face orientation? MeshStandardMaterial DoubleSide flips normals for back faces so okay. Normals may point down/up; DoubleSide handles.

Color attribute values are linear from Color. Good.

88. Create leaves instance mesh:
```ts
const leafMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.0 });
const leaves = new THREE.InstancedMesh(leafGeo, leafMaterial, leafData.length);
leaves.castShadow = true; leaves.receiveShadow = true;
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
```
Set initial matrices via updateLeaves(0).

89. Trunk geometry use TubeGeometry, radialSegments 6, tubularSegments 20. Material brown 0x6b4a2b, roughness 0.95.

Add slight taper: TubeGeometry constant radius 0.22. Could use two tubes? Fine.

90. Palm crown: maybe add a small "crown base" sphere (IcosahedronGeometry(0.32,0), material green-brown) at top to hide leaf origins. Good.

91. Additional foliage: Could add bushes—skip.

92. Sun position and shadow: Need `sun.shadow.camera` type is OrthographicCamera; setting left etc works. `sun.shadow.camera.updateProjectionMatrix()` after changes maybe needed? Three updates automatically when rendering? DirectionalLightShadow.updateMatrices sets projection from camera. But after changing camera left/right before first render, call `sun.shadow.camera.updateProjectionMatrix()`. Let's call.

93. The light target must be added to scene for matrixWorld update. Yes.

94. The ocean plane geometry: `new THREE.PlaneGeometry(400, 400, 256, 256); geo.rotateX(-Math.PI/2);` PlaneGeometry vertices local x,y from -200..200. After rotateX(-π/2), y=0, z = -local y? Check: local (x,y,0) → world (x, 0, -y) as earlier. So z spans 200..-200. Fine, still centered. But `pos.xz` coordinates cover full square. Good.

Normals after rotation point +Y? Plane normal +Z rotated -π/2 about X: (0,0,1) → (0,1,0). Good.

Ocean mesh `frustumCulled = false` maybe.

95. Water ShaderMaterial `side: THREE.FrontSide`, `transparent: false`. Set `depthWrite: true`.

96. Water needs to be lit-ish; our shader is self-lit. Fine.

97. The wave heightAt at t uses same formula with phase. Good.

98. One subtlety: The vertex shader displaces y, but the fragment shader's `vWorldPos` gets displaced world position. We compute p = vWorldPos.xz. Since no horizontal displacement, p equals undisplaced xz. Good. And h = waveHeight(p,t) matches vertex y displacement. Good.

99. For boat pitch, sampling `heightAt(x+2, z, t)` where x,z are boat center. Good.

100. Let's think about the boat staying within 25 units of origin: yes.

101. Camera exact position: `camera.position.set(35, 12, 35)`. LookAt target (0,2,0). Good.

102. Sun direction and sky: The sky sphere is centered at origin; the camera is offset, but the sun direction vector used in sky shader is world direction. Since the sky dome is a sphere, `vDir = normalize(position)` where position is local to mesh (at origin). The actual view direction from camera to sky point differs slightly due to camera offset. But since radius 600 and offset 50, error ~5°, not negligible? Actually direction from camera to a point on sphere vs direction from origin to that point differs by up to ~asin(50/600)=4.8°. The rendered sun disk might appear shifted by up to 5° from the directional light direction, which could be noticeable. Better center the sky dome on the camera each frame: `sky.position.copy(camera.position)` and compute direction relative to camera? For a sky dome child of scene, if we move it to camera position, its vertices local positions represent offsets from camera, so normalize(position) is direction from camera correctly. Set `sky.position.copy(camera.position)` in render loop (or once since camera static). Camera static, so set once after creating camera: `sky.position.copy(camera.position);` Then sphere radius 600 around camera. But far plane 2000 fine. Ocean at 400 from origin; camera at 50 → ocean far edge 250 from camera; sky radius 600 behind. Good. Sun direction then correct. Do that. Also frustumCulled false.

Alternatively compute direction in world space and normalize(worldPos - cameraPosition) with cameraPosition uniform. But moving sky is simpler. Do `sky.position.copy(camera.position)` after camera set; and in render loop not needed (static camera). But if user resizes, camera static. Fine. But if using OrbitControls (not), no. Set once. However the sphere's local `position` is then relative to camera; `normalize(position)` gives correct direction from camera. Good.

But the modelViewMatrix applied with sky.position = camera.position gives view position of vertices around camera. Good.

103. Fog color and sky horizon must match. Choose hex `0xc2d9e8`. Let's compute linear approx: R 194/255=0.761→ linear 0.54; G 217/255=0.851→0.70; B 232/255=0.910→0.81. Use horizon vec3(0.54, 0.70, 0.81) in shaders. Good.

Zenith: 0x3a78b8 → (58,120,184)/255 = (0.227,0.470,0.722) sRGB → linear (0.043,0.188,0.48). Use (0.06,0.20,0.50) for nicer. Fine.

Sun color: 0xffe6c0 → (1.0,0.902,0.753) sRGB → linear (1.0,0.79,0.53). Use uSunColor = new THREE.Color(0xffe6c0) → linear values (1.0, ~0.79, ~0.53). In shader sun color used as linear. Good.

Light color same 0xffe6c0.

104. Tone mapping exposure 1.0. Directional light intensity 2.6.

105. Ambient/hemisphere: HemisphereLight(0x9ac4e0, 0x4a5a3a, 0.55). AmbientLight maybe 0.1. Fine.

106. The island grass color etc will be lit by warm sun + sky fill. Good.

107. Need `renderer.shadowMap.type = THREE.PCFSoftShadowMap;`

108. Performance: The ocean shader per fragment does 4 sin/cos for height and 4 for gradient, plus fbm (4 octaves × 4 hashes?) and noise. Might be heavy full-screen at 2x DPR but okay mid GPU. The ocean covers most of screen. Could reduce fbm octaves to 3. Use 3 octaves in ocean foam and sky clouds. Fine. `fbm` loop i<3.

Actually we call fbm twice in ocean fragment plus noise? fbm twice = 6 noise calls each 4 hash = 24 hash. Plus waves 8 trig. On 1080p 2M pixels → 48M hash ops per frame, maybe okay on mid GPU but borderline. Could reduce to one fbm and use cheap noise for second. Let's use:
```
float fn = fbm(p * 1.2 + ...);
float fn2 = noise(p * 3.1 - ...);
```
Then cost lower. fbm 3 octaves + noise. Good.

109. Sky fbm 3 octaves. Fine.

110. Let's write the full code now.

Careful with GLSL string generation and TS formatting.

Potential GLSL issue: declaring `const vec2 WD0 = vec2(...)` at global scope is fine in GLSL ES 1.0? Const global with non-constant initializer? `vec2(0.943, 0.33)` is constant expression, fine. `const float` fine.

GLSL loops in fbm: `for (int i = 0; i < 3; i++)` fine.

Noise hash function: use float fract. Fine.

Sky fragment uses `uTime` uniform; update with elapsed.

Let's write code step by step.

```ts
import * as THREE from 'three';

interface WaveDef {
  dx: number;
  dz: number;
  k: number;
  amp: number;
  speed: number;
  phase: number;
}

function makeWave(rawDx: number, rawDz: number, wavelength: number, amp: number, speed: number, phase: number): WaveDef {
  const len = Math.hypot(rawDx, rawDz);
  return {
    dx: rawDx / len,
    dz: rawDz / len,
    k: (Math.PI * 2) / wavelength,
    amp,
    speed,
    phase,
  };
}

const waveDefs: WaveDef[] = [
  makeWave(1.0, 0.35, 34, 0.36, 0.80, 0.0),
  makeWave(-0.6, 1.0, 19, 0.24, 1.15, 1.7),
  makeWave(0.8, -0.7, 10.5, 0.15, 1.65, 4.1),
  makeWave(-0.3, -1.0, 5.8, 0.08, 2.1, 2.6),
];
```
Sum amp 0.83 → crest-to-trough 1.66. Good.

heightAt:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < waveDefs.length; i++) {
    const w = waveDefs[i];
    const f = w.k * (w.dx * x + w.dz * z) - w.speed * t + w.phase;
    h += w.amp * Math.sin(f);
  }
  return h;
}
```

GLSL builder:
```ts
function buildWaveGLSL(defs: WaveDef[]): string {
  const parts: string[] = [];
  for (let i = 0; i < defs.length; i++) {
    const w = defs[i];
    parts.push(`const vec2 WD${i} = vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)});`);
    parts.push(`const float WK${i} = ${w.k.toFixed(6)};`);
    parts.push(`const float WA${i} = ${w.amp.toFixed(6)};`);
    parts.push(`const float WS${i} = ${w.speed.toFixed(6)};`);
    parts.push(`const float WP${i} = ${w.phase.toFixed(6)};`);
  }
  const heightTerms: string[] = [];
  const gradTerms: string[] = [];
  for (let i = 0; i < defs.length; i++) {
    heightTerms.push(`  h += WA${i} * sin(WK${i} * dot(WD${i}, p) - WS${i} * t + WP${i});`);
    gradTerms.push(`  g += WA${i} * WK${i} * cos(WK${i} * dot(WD${i}, p) - WS${i} * t + WP${i}) * WD${i};`);
  }
  return [
    parts.join('\n'),
    '',
    'float waveHeight(vec2 p, float t) {',
    '  float h = 0.0;',
    ...heightTerms,
    '  return h;',
    '}',
    '',
    'vec2 waveGradient(vec2 p, float t) {',
    '  vec2 g = vec2(0.0);',
    ...gradTerms,
    '  return g;',
    '}',
  ].join('\n');
}
```
Using spread in array literal with typed string[] fine.

111. Ocean material creation:
```ts
const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: sunColor.clone() },
  uDeepColor: { value: new THREE.Color(0x0a3550) },
  uShallowColor: { value: new THREE.Color(0x1c7d92) },
  uFoamColor: { value: new THREE.Color(0xeaf6f8) },
  uFogColor: { value: fogColor.clone() },
  uFogDensity: { value: fogDensity },
};
```
Type inferred as object of `{value: ...}`. When assigning to ShaderMaterial uniforms, fine.

Access later: `oceanUniforms.uTime.value = elapsed;`.

112. ShaderMaterial:
```ts
const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  side: THREE.FrontSide,
});
```
Need `toneMapped` default true. Good.

113. Fog: `const fogDensity = 0.0045; const fogColor = new THREE.Color(0xc2d9e8); scene.fog = new THREE.FogExp2(fogColor.getHex(), fogDensity);` Wait FogExp2 constructor takes color hex or Color? `new THREE.FogExp2(color: ColorRepresentation, density)`. Can pass Color? ColorRepresentation includes Color? In three types, `ColorRepresentation = Color | string | number`. Passing `fogColor` works. But FogExp2 stores its own Color; if we pass Color object it might copy? Actually constructor `this.color = new Color(color)`. Fine.

But note: if we pass `fogColor.getHex()`, getHex returns sRGB hex? It converts back. `new THREE.Color()` from hex converts to linear. If we pass the linear Color object to `new THREE.Color(color)`, it copies the linear values directly? `Color.set` with a Color argument copies values (no conversion). Good. So use `new THREE.FogExp2(fogColor, fogDensity)`. Type maybe accepts Color. Yes.

114. Scene background: `scene.background = fogColor.clone()`.

115. Sky uniforms and material. Sky shader uses fog? no.

116. Sun and lights.

117. Island group and terrain.

118. Palm functions.

119. Boat functions.

120. Animation loop.

Let's write all carefully.

Potential issue with `THREE.Float32BufferAttribute` setIndex with number[]: `geometry.setIndex(indices)` accepts number[]. Yes.

Potential issue with `leafGeometry` computeVertexNormals and vertexColors.

121. Boat hull shape and extrude. Let's write:

```ts
function createBoat(): THREE.Group {
  const boat = new THREE.Group();

  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.0, -0.58);
  hullShape.lineTo(-1.25, -0.82);
  hullShape.quadraticCurveTo(0.9, -0.86, 2.05, 0.0);
  hullShape.quadraticCurveTo(0.9, 0.86, -1.25, 0.82);
  hullShape.lineTo(-2.0, 0.58);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.85,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 2,
    curveSegments: 12,
  });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.translate(0, -0.32, 0);
  // Note: after rotate, shape y became -z? The extrusion along z became +y as computed; translating -0.32 lowers.
```
Wait after rotateX(-π/2): local (x,y,z) → (x, z, -y). Shape's y (width) becomes world z = -y. The boat outline is symmetric in y, so z symmetric. Fine. Extrusion z 0..0.85 becomes world y 0..0.85. Translate y -0.32 → -0.32..0.53 plus bevel. Good.

Hull material white:
```ts
const hullMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.55, metalness: 0.05 });
const hull = new THREE.Mesh(hullGeo, hullMat);
hull.castShadow = true; hull.receiveShadow = true;
boat.add(hull);
```

Deck shape smaller:
```ts
const deckShape = new THREE.Shape();
deckShape.moveTo(-1.85, -0.55);
deckShape.lineTo(-1.15, -0.76);
deckShape.quadraticCurveTo(0.85, -0.78, 1.85, 0.0);
deckShape.quadraticCurveTo(0.85, 0.78, -1.15, 0.76);
deckShape.lineTo(-1.85, 0.55);
deckShape.closePath();
const deckGeo = new THREE.ShapeGeometry(deckShape, 12);
deckGeo.rotateX(-Math.PI / 2);
deckGeo.translate(0, 0.56, 0);
const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.8 }));
deck.castShadow = true; deck.receiveShadow = true;
boat.add(deck);
```
ShapeGeometry in XY plane; rotate -π/2 makes it horizontal at y=0; translate up 0.56. Good.

Cabin:
```ts
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.6 });
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.95), cabinMat);
cabin.position.set(-0.75, 0.92, 0);
cabin.castShadow = true; cabin.receiveShadow = true;
boat.add(cabin);

const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.1, 1.08), new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.7 }));
roof.position.set(-0.75, 1.28, 0);
boat.add(roof);
```
Cabin bottom at 0.61 > deck 0.56, good.

Windows: dark strips on each side:
```ts
const winMat = new THREE.MeshStandardMaterial({ color: 0x203040, roughness: 0.25, metalness: 0.4 });
const winGeo = new THREE.BoxGeometry(0.7, 0.22, 0.02);
const winL = new THREE.Mesh(winGeo, winMat); winL.position.set(-0.75, 1.0, -0.48); boat.add(winL);
const winR = ... z=0.48
```
But z thickness 0.02, cabin half-depth 0.475; place at ±0.48. Good.

Mast:
```ts
const mastMat = new THREE.MeshStandardMaterial({ color: 0xb9a06a, roughness: 0.7 });
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 3.5, 8), mastMat);
mast.position.set(0.45, 0.56 + 1.75, 0); // center y 2.31, top 4.06
mast.castShadow = true;
boat.add(mast);
```
Wait bottom at 0.56, top at 4.06.

Boom:
```ts
const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 8), mastMat);
boom.rotation.z = Math.PI / 2;
boom.position.set(-0.4, 1.12, 0); // spans x -1.25..0.45
boat.add(boom);
```
Cylinder along y; rotate z π/2 → along x; center at -0.4 length 1.7 spans -1.25..0.45. Good.

Sail geometry:
```ts
const sailGeo = new THREE.BufferGeometry();
const sailVerts = new Float32Array([
  0.42, 3.95, 0.0,
  0.42, 1.15, 0.0,
  -1.20, 1.15, 0.0,
]);
sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
sailGeo.setIndex([0,1,2]);
sailGeo.computeVertexNormals();
const sailMat = new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.8, side: THREE.DoubleSide });
const sail = new THREE.Mesh(sailGeo, sailMat);
sail.castShadow = true;
boat.add(sail);
```
A flat triangle at z=0. Sail along boat center plane. Good.

Jib sail: triangle from mast top to bow:
```
(0.42, 3.8, 0), (2.0, 0.62, 0), (0.42, 0.9, 0)? 
```
Actually jib from mast top to bow tip and down to deck near mast bottom:
vertices (0.3, 3.7), (1.95, 0.6), (0.3, 0.85). Put z=0.0. But this triangle would overlap the hull area; it's forward of mast, fine. Add sailMat. Maybe use z=0.

But a jib attached at bow, visible. Good.

Flag:
```ts
const flagGeo = new THREE.BufferGeometry();
flagGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0, 0.55,-0.12,0, 0,-0.25,0]),3));
flagGeo.setIndex([0,1,2]); flagGeo.computeVertexNormals();
const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xd94a3a, side: THREE.DoubleSide, roughness: 0.8 }));
flag.position.set(0.45, 4.05, 0);
boat.add(flag);
```
Flag triangle in XY plane extends +x and -y. Good.

Add a small bowsprit? skip.

Group cast shadows: each mesh set. Could loop at end:
```ts
boat.traverse((obj) => { if (obj instanceof THREE.Mesh) { obj.castShadow = true; obj.receiveShadow = true; } });
```
`obj instanceof THREE.Mesh` works. Fine. Set individually not needed.

122. Boat update function:
```ts
function updateBoat(t: number): void {
  const bx = 12 + Math.sin(t * 0.075) * 0.85;
  const bz = 14 + Math.cos(t * 0.055) * 0.85;
  const h = heightAt(bx, bz, t);
  const hF = heightAt(bx + 1.9, bz, t);
  const hB = heightAt(bx - 1.9, bz, t);
  const hR = heightAt(bx, bz + 1.0, t);
  const hL = heightAt(bx, bz - 1.0, t);
  boat.position.set(bx, h + 0.06, bz);
  boat.rotation.z = Math.atan2(hF - hB, 3.8) * 0.9;
  boat.rotation.x = Math.atan2(hL - hR, 2.0) * 0.9;
  // slight yaw drift to keep some variety? Set rotation.y small oscillation but then pitch/roll local axes mismatch slightly. Keep 0.
  boat.rotation.y = 0;
}
```
If rotation.x and z both set, order XYZ default; small angles fine. Good.

Wait position.y = h + 0.06: hull bottom -0.32; waterline at hull center origin. Good.

123. Island height function uses noise. Implement:
```ts
function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}
```
This returns 0..1.

Island:
```ts
const ISLAND_R = 20;
const ISLAND_PEAK = 9.0;

function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const t = Math.max(0, 1 - r / ISLAND_R);
  let h = ISLAND_PEAK * Math.pow(t, 1.7) - 0.7;
  h -= Math.max(0, r - ISLAND_R) * 1.2;
  const ridge = (noise2(x * 0.18 + 7.1, z * 0.18 - 3.4) - 0.5) * 2.4;
  const detail = (noise2(x * 0.55 - 2.2, z * 0.55 + 5.7) - 0.5) * 0.9;
  const mask = Math.pow(t, 1.25);
  h += (ridge + detail) * mask;
  return h;
}
```
At r=0, t=1, h=9-0.7 + (ridge+detail)*1 = 8.3 ±1.65 → peak up to ~9.95. Good.

At r=15.5, t=0.225, base=9*0.225^1.7 -0.7 = 9*0.078? Let's compute 0.225^1.7 = exp(1.7*ln0.225)=exp(1.7*-1.4916)=exp(-2.5357)=0.0792 → 0.713-0.7=0.013. Waterline ~15.5 plus noise mask 0.225^1.25=0.155 → ±0.25. Good, shore varies.

At r=18, t=0.1, base=9*0.02? 0.1^1.7=0.02 →0.18-0.7=-0.52; minus (r-R negative→0). Wait r=18 < R=20, so no deep extension; h=-0.52 + noise small. But ocean trough -0.9 → island at -0.52 would poke out! At r=18, island terrain is -0.52 (just under water), waves trough to -0.9 exposing it. Need water depth outside waterline to be deeper. The formula's t goes to 0 at r=20 → h=-0.7, not deep enough. We should make the island drop faster after the waterline.

Better: define island height with a shore radius and steep underwater slope. Use t falloff with higher exponent? At r=18, need h < -1.5. Let's change depth offset: 
```
h = PEAK * t^1.7 - 1.8;
```
Waterline where PEAK*t^1.7=1.8 → t=(0.2)^0.588=e^{-1.609*0.588}=e^{-0.946}=0.388 → r=0.612*20=12.24. Diameter 24.5 — too small. Hmm.

We need a steeper underwater falloff while keeping waterline radius ~15.5. Use a function that drops sharply beyond the waterline. E.g., multiply falloff by a smooth "beach shelf":

Define waterline r0 = 15.5 and deep ocean beyond. Use:
```
const t = clamp(1 - r/ISLAND_R, 0, 1); // 0 at 20
base = PEAK * pow(t, 1.7) - 0.7; // waterline ~15.5
// add underwater drop that kicks in near the edge:
const edge = smoothstep(17.0, 21.0, r); // 0 at 17, 1 at 21
h = base - edge * 4.0;
```
At r=18: edge=0.25, base=-0.52 → h=-1.52. Good. At r=20: edge=0.84 → h=-0.7-3.36=-4.06. Good. At r=21+ edge=1 → -4.7 plus outside R extension. At r=16: edge=0, base=9*(0.2)^1.7-0.7 = 9*0.0643-0.7=0.579-0.7=-0.12; just below water. At 15.5 base ~0. Good. So the beach slopes gently to 0 at 15.5, then drops below. This way, from 15.5 to 17, terrain is 0 to -0.2 and could be exposed in troughs -0.9. Hmm at r=16.5, base=9*(0.175)^1.7-0.7 = 9*0.0515-0.7=-0.236; edge at 16.5=0 → -0.236, still above wave trough -0.9. Island visible above water in troughs up to r=17. That's a shallow shelf — could actually look like tidal flats. But not ideal.

Increase wave trough? Max ±0.83. At -0.236 no exposure. Only where h < trough. At r=17, base=9*(0.15)^1.7-0.7=9*0.0416-0.7=-0.326, edge starts at 17. So 0 to -0.326 shelf. That's fine; it's below water at mean and only shallow. Exposed in troughs? trough -0.83 < -0.326, so terrain at -0.326 is above trough, meaning it would be visible above water when waves trough! Wait water surface height at trough -0.83, terrain at -0.326 is above the water surface (-0.326 > -0.83) → visible. Yes, so a shelf at -0.3 will poke out in wave troughs, causing land ring visible. That's actually kind of natural (waves washing over shallow reef) but might look odd.

Better make the island drop steeply right below 0 at the waterline: e.g., base = PEAK*t^1.7 - 0.7 but add a term that becomes negative quickly for r > 15. Let's design height as a function with a controlled shoreline:

Use `shore = 15.5`. Define:
```
const d = r - shore; // positive outside
if (d > 0) h = -0.7 - d * 1.6;  // steep underwater slope, at d=1 -> -2.3, hidden
else h = land formula
```
But we need smooth land height reaching 0 at shore. Define land formula `hLand = PEAK * (1 - r/ISLAND_R)^1.7 - 0.7` which is 0 at r≈15.5. For r > shoreR, use `-0.7 - (r - shore)*2`. At r=16.5, -2.7 < trough -0.83, hidden. Good. At shore exactly 15.5, land height 0. So the beach drops steeply into water just past the waterline — like an island without a shallow shelf. Realistic enough.

Implement:
```ts
const shoreR = 15.6;
function islandHeight(x,z) {
  const r = Math.hypot(x,z);
  if (r > shoreR) {
    const underwater = -0.7 - (r - shoreR) * 2.2;
    // small noise for seabed
    return underwater;
  }
  const t = Math.max(0, 1 - r / ISLAND_R); // ISLAND_R=20, t at shore=0.22
  let h = ISLAND_PEAK * Math.pow(t, 1.7) - 0.7;
  ...
}
```
At r just under shoreR, t=0.22, h≈0.0. At r=shoreR exactly, h=0.0. For r>shoreR, h=-0.7, discontinuity! At r=15.6, land h≈0.0, underwater formula -0.7 → a 0.7 step down. That's okay visually (a drop at waterline) but the geometry will have a cliff under water; ocean covers it. Fine. But there's a gap where the beach suddenly drops; under water, invisible. Good. Could make it -0.2 - ... to be smoother: at shore, -0.2 (slightly under water), still fine. Ocean trough -0.83 exposes it though. So jump to -0.9 just outside: `underwater = -0.9 - (r-shoreR)*2.2`. At shore -0.9 exactly below maximum trough -0.83, so hidden even at trough. Nice. The beach edge ends abruptly at water; ocean waves lap over. Good.

Land formula needs to hit 0 at r=shoreR. With ISLAND_R=20 and -0.7 offset, at r=15.6 t=0.22, h=9*0.22^1.7-0.7 = 9*0.0782-0.7 = 0.004. Good. Perfect.

But noise can push h negative near shore, creating holes where underwater formula doesn't apply (h negative but r<shoreR). We multiply noise mask by pow(t,1.25) and t at shore=0.22 → mask=0.156, noise ±1.6*0.156=±0.25. So beach can dip to -0.25 near the shore, still below water. Ocean covers; fine but could create holes in the beach. Better reduce noise near shore with mask pow(t,2.5) → 0.22^2.5=0.023, tiny. Use mask = pow(t, 2.2) so noise mostly in the middle. Good. At center t=1 full noise. At shore negligible, smooth beach. Nice.

Also add cliffs on steep slopes via color.

So:
```ts
const ISLAND_R = 20;
const ISLAND_PEAK = 9.0;
const SHORE_R = 15.6;

function islandHeight(x,z) {
  const r = Math.hypot(x,z);
  if (r > SHORE_R) {
    return -0.9 - (r - SHORE_R) * 2.0;
  }
  const t = Math.max(0, 1 - r / ISLAND_R);
  const mask = Math.pow(t, 2.0);
  let h = ISLAND_PEAK * Math.pow(t, 1.7) - 0.7;
  h += (noise2(x*0.2+7.1, z*0.2-3.4) - 0.5) * 2.6 * mask;
  h += (noise2(x*0.6-2.2, z*0.6+5.7) - 0.5) * 1.0 * mask;
  return h;
}
```
At r=0: 8.3 + (−1.3..1.3) + (−0.5..0.5) → peak 8.3 ±1.8. Max 10.1, within 5-15. Good.

At r=10: t=0.5, h=9*0.307-0.7=2.06, mask 0.25 → noise ±0.65. Good.

Waterline: solve 9*t^1.7 - 0.7=0 → t=0.22 → r=15.6. Good, matches SHORE_R. Nice. But noise reduces near shore, so shoreline is basically circular at 15.6. Add a bit of irregularity? Could vary SHORE_R with angle? Might complicate. We can accept a gently curved circular shoreline; with waves and foam it looks okay.

Maybe make shoreline irregular by using angle noise:
```
const ang = Math.atan2(z,x);
const shoreR = SHORE_R + (noise2(Math.cos(ang)*2.0+5, Math.sin(ang)*2.0-3)-0.5)*1.6;
```
But then waterline height 0 would be at slightly different radius. Not worth. Keep circular.

Island diameter 31.2. Within 30-50. Good.

124. Island plane size: 52x52 with 180 segments. Corner r=36.8 → underwater -0.9 -21.2*2=-43.3. Very deep plane; fine. But geometry 52x52 may extend beyond island and be deep; hidden by ocean. The ocean is opaque and its surface at y ~0 hides everything below. Good. But could the deep plane's edges cast shadows? Not relevant.

125. Island receives shadows and casts shadows. The terrain mesh castShadow true. Palms cast.

126. Rocks on beach: use positions within r ~13 and heights. Good.

Let's pick rocks at (12.5, -5.5) r=13.7 h≈? t=0.315, h=9*0.129-0.7=0.46. Good beach. (-11.8, 6.3) r=13.4 h~0.55. (7.5, 12.0) r=14.1 h~0.2. (-5.5,-12.8) r=13.9 h~0.3. (13.5, 1.0) r=13.5 h~0.5. These are near shore. Use scale 0.8-1.4. Rocks partially in water? Place y = islandHeight + 0.3*scale. Good.

127. Add a couple of small huts? skip.

128. Shadow camera coverage: island radius 20, boat at 19.7 max. ±35 covers. Good.

129. Directional light position: sunDir * 120 = (-78, 26, -88). Shadow camera looks at origin. Near 1, far 400. Good.

130. Ocean geometry and material added.

131. Instanced leaves count 8 palms × 8 leaves = 64 ≥30. Good.

132. Every frame update leaves matrices: 64 matrix compositions — trivial.

133. Sway: leaves should sway in wind. Good.

134. `__leaves` must be InstancedMesh. Yes.

135. `__island` mesh. Yes.

136. `__sun` directional light.

137. `__boat` group.

138. `__ocean` heightAt/time.

139. The first frame `__ready` after render. Good.

140. Potential issue with `THREE.ShaderMaterial` and fog chunks: We include tonemapping and colorspace. Both need `#include` after gl_FragColor. Good.

141. Potential GLSL error: using `cameraPosition` in fragment with ShaderMaterial. Yes available.

142. Potential GLSL error: `reflect(-viewDir, n)` — reflect(I, N) with I incident vector pointing towards surface? We want reflection of view ray. The view direction is from surface to camera. The incident direction is from camera to surface = -viewDir. reflect(-viewDir, n) returns reflected ray from surface, correct.

143. Sky shader sun direction uniform must be normalized. sunDir normalized.

144. Sun light target: `sun.target.position.set(0,0,0)`. Fine.

145. Add `scene.add(sky)` before ocean. Sky renderOrder -1000.

146. Background fog color maybe use `scene.background = new THREE.Color(0xc2d9e8)` but the sky dome covers. Fine.

147. Set `renderer.setSize(window.innerWidth, window.innerHeight)`. Append canvas.

148. Body style. `document.body.style.margin = '0px'; document.body.style.overflow = 'hidden';`

149. On resize set size and aspect. Also `renderer.setPixelRatio` maybe on resize change. Fine.

150. TypeScript strict and `window as any` assignments:
```ts
const w = window as unknown as Record<string, unknown>;
w.__scene = scene;
```
But spec asks `(window as any).__scene = scene;`. Use exactly `(window as any).__scene = scene;` — TS allows any. Fine.

151. `renderer.setAnimationLoop` callback type `(time: number) => void` maybe? We can use `() => { ... }`. Fine.

152. Clock: use `const clock = new THREE.Clock();` then `const elapsed = clock.getElapsedTime();`.

153. Wave time: If we use `clock.getElapsedTime()`, time() returns uniform value. Good.

154. Sky uTime update with elapsed.

155. Boat drift uses `elapsed` (not wave time? same). Good.

156. Should boat drift be based on wave time? Use elapsed. Fine.

157. Let's consider the ocean shader's fog: uFogDensity equal scene fog density. FogExp2 uses `1 - exp(-density^2 * depth^2)`? Three's fog_fragment chunk for FogExp2:
```
float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
```
Yes. Matches.

158. For island/boat materials, built-in fog uses view-space depth, not Euclidean distance. Our shader uses Euclidean distance. Slight mismatch, acceptable. Could use depth = length(cameraPosition - vWorldPos) equivalent roughly. Fine.

159. Sky dome radius 600 with camera at 50; moving sky to camera means ocean corners at 282 from origin; camera at 50 → far ocean edge ~250, sky 600 behind, fine.

160. If sky.position = camera.position, the sphere's center is at camera; the backside sphere surrounds camera. With depthTest false, it renders over clear. Good.

161. Use `sky.material.depthWrite = false`. Set `sky.renderOrder = -10`. Good.

162. `sky.frustumCulled = false`.

163. Ocean `frustumCulled = false`.

164. Island mesh: geometry bounding sphere computed from displaced positions; three computes bounding sphere lazily. fine.

165. Check `THREE.ShapeGeometry` signature: `new THREE.ShapeGeometry(shape, curveSegments)`. Yes.

166. ExtrudeGeometry options: `depth`, `bevelEnabled`, etc. Type `ExtrudeGeometryOptions`. Fine.

167. `hullGeo.rotateX` works on BufferGeometry.

168. MeshStandardMaterial vertexColors for island. Set `vertexColors: true`.

169. Vertex colors attribute name 'color'. Good.

170. Compute island normals after displacement. `geo.computeVertexNormals();` Good. But vertex colors set after; fine.

171. For color variation, use a `THREE.Color` scratch. Avoid `clone` per vertex? 32k clones okay but better use temp colors:
```ts
const cSand = new THREE.Color(0xd8c39a);
const cWet = new THREE.Color(0xa8906a);
const cGrass = new THREE.Color(0x5c8a3e);
const cGrassDark = new THREE.Color(0x3c6b2d);
const cRock = new THREE.Color(0x8a7d6a);
```
But vertex color attribute values are linear. Colors from hex are linear. Good.

In loop:
```ts
const tmp = new THREE.Color();
...
tmp.copy(cSand);
if (y > 2) tmp.copy(cSand).lerp(cGrass, smoothstep(2, 4, y));
...
```
`Color.copy` returns Color. `lerp` mutates tmp. Fine.

Let's write:
```ts
const baseCol = new THREE.Color();
if (y < 0.6) {
  baseCol.copy(cWet);
} else if (y < 2.0) {
  baseCol.copy(cSand);
} else if (y < 5.5) {
  baseCol.copy(cSand).lerp(cGrass, smoothstep(2.0, 4.5, y));
} else {
  baseCol.copy(cGrass);
}
if (y > 5.5) {
  baseCol.lerp(cRock, smoothstep(5.5, 9.5, y));
}
// slope rock
const hx = islandHeight(x + 0.9, z) - y;
const hz = islandHeight(x, z + 0.9) - y;
const slope = Math.hypot(hx, hz) / 0.9;
baseCol.lerp(cRock, smoothstep(0.9, 1.8, slope) * 0.65);
// noise variation
const v = 0.82 + 0.36 * noise2(x * 0.9 + 3.1, z * 0.9 - 8.2);
baseCol.multiplyScalar(v);
```
MultiplyScalar could exceed 1 slightly (0.82+0.36=1.18 * color 0.8 = 0.94). Fine. `Color.multiplyScalar` exists.

For underwater, baseCol wet dark; ocean covers.

172. Island material roughness 0.92. Add slight flatShading? no.

173. Palm trunk placement: need to avoid steep slopes and beach. Use baseY = islandHeight(x,z) - 0.1. But if islandHeight < 0.4, skip? Our chosen points are on land. Fine.

174. The palm leaves' instance positions: top of trunk. Since trunk leans outward, leaves crown at top. Good.

175. Add a `crown` sphere at top with color 0x4a6b2a. Fine.

176. The leaves instanced mesh added to scene (not island) but positions are in world coordinates. Fine.

177. Ensure InstancedMesh's bounding sphere includes instances for shadow/frustum. Three computes bounding sphere from geometry and instance matrices? InstancedMesh has computeBoundingSphere that accounts for instances? I think InstancedMesh.computeBoundingSphere exists (yes, in recent versions). By default raycast uses. Frustum culling for InstancedMesh uses boundingSphere computed from instanceMatrix if not set? `InstancedMesh` has `boundingSphere: Sphere | null` and `computeBoundingSphere()`. Three's WebGLRenderer frustum culling calls object.boundingSphere? For Mesh it's geometry.boundingSphere. For InstancedMesh, `frustumCulled` maybe uses geometry bounding sphere * instance matrices? Actually `InstancedMesh` overrides `computeBoundingSphere` and `boundingSphere`, and WebGLRenderer's projectObject uses `object.frustumCulled` and `_frustum.intersectsObject(object)`. Frustum.intersectsObject uses `object.boundingSphere` if present else geometry.boundingSphere. InstancedMesh has boundingSphere maybe computed. To be safe, set `leaves.frustumCulled = false`? But then shadows still render. Fine. Or set true. Set `leaves.frustumCulled = false` to guarantee visible. Performance fine.

178. Similarly boat group culling is per mesh; fine.

179. Sun shadow needs to include leaves. Leaves castShadow true and not culled from shadow camera? Shadow map rendering uses the same frustum culling? It uses shadow camera frustum; if bounding sphere wrong could cull. Set `leaves.frustumCulled = false` avoids.

180. Boat/Island shadow casting/receiving.

181. Add a subtle "sun glare" sprite? Not needed.

182. One more detail: Add some floating foam around boat? no.

183. Camera fov 55. `camera.position.set(35,12,35); camera.lookAt(new THREE.Vector3(0,2,0));`

184. Does the boat at (12,14) block the island? Camera at (35,12,35), boat closer to camera than island, appears in front of island. Good.

185. Water at origin is island; ocean plane under island; ocean renders at y waves, island above. For r<shoreR, island is above water and hides ocean. Good.

186. The ocean plane extends under island at y displaced; island terrain covers it. Fine.

187. Potential z-fighting at shoreline where island height ≈0 and ocean waves cross; both surfaces intersect. Natural waterline, okay.

188. Sky sun position: sunDir (-0.65, 0.22, -0.73) normalized. Let's compute normalized: length = sqrt(0.4225 + 0.0484 + 0.5329) = sqrt(1.0038) = 1.0019. So (-0.6488, 0.2196, -0.7286). Elevation 12.7°. Camera pitch -11.4°, difference 24.1°, fov 55 half 27.5 → sun near top, visible. Horizontal: camera forward horizontal direction (-0.707,-0.707); sun horizontal (-0.665,-0.747) normalized, dot ~0.998 → aligned. Good, sun nearly straight ahead. Visible.

189. Sun disk in sky shader: `pow(s, 220)*3` with s near 1 gives a small bright spot. Good.

190. Sun glitter on water along the sun direction: reflection vector near sun. Good.

191. Fog density 0.0045; at boat distance ~50 → fog factor 1-exp(-(0.225)^2)=0.049 → 5%. good. At island 50 similar. At far ocean 250 → 1-exp(-1.266)=0.718 → 72%. Horizon blend to same color. Good.

192. Sky horizon exactly fog color. The ocean far becomes fog color. The sky at horizon also fog color (horizon color). Seamless.

193. Tone mapping affects both. Good.

194. Let's ensure our shader horizon color (0.54,0.70,0.81) equals fog color linear. `new THREE.Color(0xc2d9e8)` linear values: let's verify sRGB to linear conversion: c=194/255=0.7608; linear = ((0.7608+0.055)/1.055)^2.4 = (0.7733)^2.4. ln 0.7733=-0.257; *2.4=-0.617; exp=0.539. G: 217/255=0.851; (0.906/1.055=0.8588)^2.4: ln=-0.1522*2.4=-0.365→0.694. B: 232/255=0.9098; (0.9648/1.055=0.9145)^2.4: ln=-0.0894*2.4=-0.2146→0.807. So (0.539,0.694,0.807). Matches vec3(0.54,0.69,0.81). Good.

195. Sky gradient using `pow(y, 0.6)`. At horizon y=0 → horizon color. At zenith y=1 → zenith. Good.

196. The sky below horizon: not visible much (ocean covers). Fine.

197. Ocean specular uses uSunColor with linear values (1.0, 0.79, 0.53), multiplied by pow → warm highlights.

198. Sky sun disk uses uSunColor * 3.0 → (3.0,2.37,1.59) before tonemap → white-ish after ACES. Good.

199. Ocean reflection sky uses sun glow with pow(s,8)*0.35 and pow(s,200)*2.5 → sun glitter. Good.

200. Foam color `new THREE.Color(0xeaf6f8)` linear ~ (0.82,0.93,0.96). Good.

201. Water base deep/shallow colors: choose deep 0x0b3552, shallow 0x147a8f. Let's compute visual after ACES. The mix with sky Fresnel will brighten. Good.

202. Add a slight ambient reflection of sky to base: `base += sky * 0.08`? The mix with fres does. At normal incidence fres 0.02 → mostly base color. Base dark blue; good for deep water viewed from above. At grazing, sky. Good.

203. Ensure the water is not too dark: base deep (0.0? let's compute) 0x0b3552: R 11/255=0.043→linear 0.0034; G 53/255=0.208→0.035; B 82/255=0.322→0.085. Dark navy. Shallow 0x147a8f: R 20/255=0.078→0.0069; G 122/255=0.478→0.194; B 143/255=0.561→0.28. Mix 0.28+0.5*shore+0.18*h. Around island shore≈1, mixT≈0.78 → shallow turquoise. Far mixT≈0.28 → mix(deep,shallow,0.28) = (0.0044,0.08,0.14). Darkish blue. With sky reflection fres at grazing far (fres high) brightens. Good.

204. Add subtle light from hemisphere to water? Self-shaded. Fine.

205. Boat materials receive sun + hemisphere.

206. Palm leaf color with vertexColors and MeshStandardMaterial. InstancedMesh supports vertexColors. Good.

207. `leafMaterial` side DoubleSide. Shadows: DoubleSide shadows might cast from both sides; fine.

208. One issue: `InstancedMesh` with `castShadow` and vertexColors & DoubleSide okay.

209. Update leaves every frame before render. Good.

210. Let's ensure the boat's group position stays within 25: yes.

211. `time()` returns the wave time used by the shader. Since uTime set to elapsed each frame, return `oceanUniforms.uTime.value`. But if called before first frame, value 0. Fine. Cast:
```ts
const oceanApi = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => oceanUniforms.uTime.value as number,
};
```
`as number` from any? `uTime.value` type maybe any. Cast with `Number(oceanUniforms.uTime.value)`? Simpler: `return oceanUniforms.uTime.value;` Type inference: uniforms object is `{ uTime: { value: number }, ... }`, so `oceanUniforms.uTime.value` is number. Actually we define the object literal, TypeScript infers each `value` type; uTime value: number. So just return it. No cast. Good.

But we pass it to ShaderMaterial uniforms; no widening. Fine.

212. `__ocean` assignment expects an object with methods. Good.

213. Potential TS issue: `const w = window as any;` not needed, use direct.

214. Potential TS issue: `THREE.MeshStandardMaterial` parameter `vertexColors: true` valid.

215. Potential TS issue: `new THREE.FogExp2(fogColor, fogDensity)` — FogExp2 constructor signature `(color?: ColorRepresentation, density?: number)`. Color is ColorRepresentation. Good.

216. Potential TS issue: `geometry.setIndex(indices)` where indices is number[] works.

217. Potential TS issue: `const pos = geo.attributes.position as THREE.BufferAttribute;` then `pos.getX(i)`. BufferAttribute has getX. Good.

218. Potential TS issue: `mesh.traverse((obj) => {...})` object typed Object3D. `obj instanceof THREE.Mesh` narrows. Good.

219. Build wave GLSL with `toFixed` returns strings with decimal point. Good.

220. Need to avoid using `#include <tonemapping_fragment>` inside a template literal with `#` fine.

221. GLSL ES: declaring functions before use. In ocean fragment, waveGLSL inserted before noise functions and main. skyTint uses uSunDir/uSunColor declared before. Good.

222. In sky fragment, `uTime` used in cloud; declared.

223. Sky vertex: `vDir = normalize(position);` position is local to sky sphere centered at camera (since we move sky). Good.

224. Sky fragment uses `vDir` varying. Good.

225. Renderer color space: three r152+ uses `renderer.outputColorSpace`. Fine.

226. `renderer.toneMappingExposure = 1.0;` fine.

227. Should we set `renderer.shadowMap.autoUpdate`? default true. Fine.

228. The sun's shadow camera near/far with sun position 120*dir and target origin. Near 1 far 400. Good.

229. Shadow map coverage ±35 includes tall palms (up to ~15 above ground? base 5 + trunk 6 + leaves 2 = 13) and island peak 10. The ortho camera's near/far along light axis, and left/right/top/bottom 35. Good.

230. Light bias: `sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;` Good.

231. The directional light intensity in three r155+ with useLegacyLights false (default true? Actually r155 removed legacy lights and default is physically correct). Intensity 2.5 is reasonable with ACES. Hemisphere 0.5. Let's set sun intensity 3.0.

232. The island receives shadows from palms. Good.

233. Ocean shader doesn't receive shadows (not needed; shadows on water would be nice but optional). The boat's shadow on water would be nice but ShaderMaterial doesn't do shadows. Could add a fake shadow blob under boat? Not necessary, spec only requires boat meshes cast shadows (onto island? boat is in water, casts onto water which doesn't receive, but shadow map includes boat; island receives if nearby). Fine.

234. Ensure boat meshes castShadow true. Yes.

235. `__island` receives shadows: mesh.receiveShadow = true.

236. Let's produce the final code.

One more thought on the ocean shader using `gl_FragColor` with GLSL1: Three's ShaderMaterial default `glslVersion` is null → GLSL1 with `#version 100`? WebGL2 context but shaders compiled as GLSL1? Three prepends compatibility defines. Standard ShaderMaterial examples use gl_FragColor. Fine.

Potential warning: In WebGL2, `gl_FragColor` is not available in GLSL ES 3.00, but Three only uses GLSL3 if glslVersion set. Default is GLSL1, works.

237. In the sky shader, using `if (y > 0.0)` with varying calculations is fine.

238. Cloud noise in sky at horizon with `d.xz / max(y, 0.06)` might produce visible tiling but okay.

Let's improve clouds: 
```
vec2 uv = d.xz / (y + 0.18) * 0.9;
float n = fbm(uv * 1.6 + vec2(uTime*0.006, -uTime*0.004));
float band = smoothstep(0.02, 0.10, y) * (1.0 - smoothstep(0.55, 0.85, y));
float cloud = smoothstep(0.55, 0.75, n) * band;
col = mix(col, vec3(0.80, 0.83, 0.86), cloud * 0.5);
```
Good.

239. Sky sun disk should be above horizon; y of dir >0. Good.

240. Add a slight warm tint near sun on horizon:
```
float s = max(dot(d, uSunDir), 0.0);
col += uSunColor * pow(s, 12.0) * 0.2;
col += uSunColor * pow(s, 220.0) * 3.0;
```
Fine.

241. Water heightAt: The spec says heightAt returns vertical displacement shader applies at undisplaced position. Our shader uses `pos.y += waveHeight(pos.xz, uTime)`. Exactly. Good.

242. Time function returns uTime. Good.

243. `__ready` set after first render. Use a flag:
```ts
let readySet = false;
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  ...
  renderer.render(scene, camera);
  if (!readySet) {
    readySet = true;
    (window as any).__ready = true;
  }
});
```
Good.

244. Let's write the code with all pieces.

Also, body styles and append canvas.

Let me carefully write the shader strings.

Ocean vertex:
```ts
const oceanVertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;

${waveGLSL}

void main() {
  vec3 pos = position;
  pos.y += waveHeight(pos.xz, uTime);
  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
```
Using projectionMatrix * viewMatrix * worldPos (worldPos already model applied) is correct. Or use modelViewMatrix. Fine.

Ocean fragment:
```ts
const oceanFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vWorldPos;

${waveGLSL}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 skyTint(vec3 d) {
  float y = clamp(d.y, 0.0, 1.0);
  vec3 horizon = vec3(0.54, 0.69, 0.81);
  vec3 zenith = vec3(0.06, 0.20, 0.50);
  vec3 c = mix(horizon, zenith, pow(y, 0.6));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSunColor * pow(s, 8.0) * 0.30;
  c += uSunColor * pow(s, 200.0) * 2.2;
  return c;
}

void main() {
  vec2 p = vWorldPos.xz;
  float t = uTime;
  float h = waveHeight(p, t);
  vec2 grad = waveGradient(p, t);

  grad += 0.055 * cos(dot(p, vec2(1.7, 1.1)) * 1.9 + t * 3.4) * vec2(1.7, 1.1);
  grad += 0.040 * cos(dot(p, vec2(-1.2, 2.3)) * 2.6 - t * 4.1) * vec2(-1.2, 2.3);

  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(n, viewDir), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 sky = skyTint(reflect(-viewDir, n));

  float dist = length(p);
  float shore = 1.0 - smoothstep(13.0, 27.0, dist);
  float mixT = clamp(0.26 + 0.50 * shore + 0.18 * h, 0.0, 1.0);
  vec3 base = mix(uDeepColor, uShallowColor, mixT);

  vec3 col = mix(base, sky, fres);

  vec3 hv = normalize(uSunDir + viewDir);
  float ndh = max(dot(n, hv), 0.0);
  col += uSunColor * (pow(ndh, 220.0) * 2.4 + pow(ndh, 32.0) * 0.10);

  float fn = fbm(p * 1.15 + vec2(t * 0.18, -t * 0.12));
  float fn2 = noise2(p * 3.1 - vec2(t * 0.35, t * 0.22));
  float crestFoam = smoothstep(0.32, 0.72, h + (fn - 0.5) * 0.25) * smoothstep(0.40, 0.78, fn2);
  float ring = smoothstep(19.0, 16.0, dist) * smoothstep(14.0, 16.0, dist);
  float shoreFoam = ring * smoothstep(0.30, 0.80, fn2);
  float foam = clamp(crestFoam * 0.75 + shoreFoam * 0.75, 0.0, 1.0);
  col = mix(col, uFoamColor, foam);

  float fogDist = length(cameraPosition - vWorldPos);
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * fogDist * fogDist);
  col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
```
Potential issue: `smoothstep(19.0, 16.0, dist)` where edge0 > edge1. GLSL spec: results undefined if edge0 >= edge1. Actually smoothstep requires edge0 < edge1 for defined behavior; if edge0 > edge1, `t = clamp((x-edge0)/(edge1-edge0), 0,1)` still works but spec says undefined. Better avoid reversed. Use `1.0 - smoothstep(16.0, 19.0, dist)` for outer fade. Ring:
```glsl
float ring = (1.0 - smoothstep(16.5, 20.0, dist)) * smoothstep(13.5, 15.6, dist);
```
At dist<=13.5: 0; between 15.6 and 16.5: 1; at 20: 0. Good. Use that. Shoreline at 15.6; foam ring from 15.6 outward to ~20. But inside 15.6 island land; foam not visible. Fine.

`crestFoam` threshold uses h + noise; h max 0.83. smoothstep(0.32,0.72,...) works.

245. Sky shader:
```ts
const skyVertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragmentShader = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
varying vec3 vDir;

float hash21(vec2 p) { ... }
float noise2(vec2 p) { ... }
float fbm(vec2 p) { ... }

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 horizon = vec3(0.54, 0.69, 0.81);
  vec3 zenith = vec3(0.06, 0.20, 0.50);
  vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55));
  col = mix(vec3(0.28, 0.40, 0.48), col, smoothstep(-0.10, 0.03, y));

  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * pow(s, 12.0) * 0.20;
  col += uSunColor * pow(s, 220.0) * 3.0;

  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.18) * 0.9;
    float n = fbm(uv * 1.7 + vec2(uTime * 0.006, -uTime * 0.004));
    float band = smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.55, 0.85, y));
    float cloud = smoothstep(0.55, 0.75, n) * band;
    col = mix(col, vec3(0.80, 0.84, 0.88), cloud * 0.55);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
```
Note: `smoothstep(-0.10, 0.03, y)` edge0 < edge1. Good.

246. Sky material:
```ts
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: { uSunDir: { value: sunDir.clone() }, uSunColor: { value: sunColor.clone() }, uTime: { value: 0 } },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
});
```
ShaderMaterial has `fog` option? Yes `fog: boolean`. Fine. `depthTest` in ShaderMaterial parameters? `MaterialParameters` includes depthTest, depthWrite, side, etc. Yes.

`toneMapped: true` default.

247. Sky mesh renderOrder -1000, frustumCulled false, position copy camera.

248. Ocean uniforms and material.

249. The ocean is large; if depthTest false sky drawn first, ocean draws over. Good.

250. Island terrain shadows. Good.

251. One concern: With `sky.position.copy(camera.position)`, the sky sphere is centered at camera and radius 600; its backside triangles are at distance 600 from camera. The depth test is disabled so it doesn't matter, but the projection still places it within far plane (600 < 2000). Fine.

252. The sun disk in the sky is at direction from camera, matching the directional light. Good.

253. Boat drift: The boat moves slowly; each frame we update position. Good.

254. The boat pitch/roll from heightAt at world positions relative to boat center. Good.

255. Boat may be placed slightly inside island if drift radius too big? min distance from origin: base distance 18.44, drift ±0.85 in each axis could bring it to sqrt(11.15²+13.15²)=17.2, > 15.6 shore. Good. Max 19.7 <25. Good.

256. Palm leaves InstancedMesh instance count 64. `new THREE.InstancedMesh(geometry, material, count)`. Good.

257. `instanceMatrix.needsUpdate = true` each frame. Good.

258. Set `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);`.

259. `leafData` positions are THREE.Vector3. Good.

260. For each leaf, choose yaw = (i/leavesPerPalm)*2π + small random, tilt = 0.12 + random*0.4. The leaf geometry droops; tilt raises. Let's set tilt between -0.05 and 0.45. Some leaves droop more. Use `tilt = -0.05 + Math.random()*0.55`. Plus sway ±0.12.

But random without seed produces different each load; fine.

261. Add palm leaf scale 0.9-1.2.

262. Palm tops: trunk top. The leaf instances start at top. Good.

263. Add crown sphere at top with radius 0.35. Leaves start near it. Good.

264. Add trunk tube. TubeGeometry curve.

265. Maybe add a second smaller tube for taper? Fine.

266. Boat group added to scene.

267. Island terrain mesh added.

268. Rocks added.

269. Sun target added.

270. Hemisphere light.

271. Ambient maybe not needed with hemisphere. Add `const hemi = new THREE.HemisphereLight(0xa8cfe8, 0x4a5a3a, 0.55); scene.add(hemi);` and `const ambient = new THREE.AmbientLight(0xffffff, 0.08);` optional. Use hemi only.

272. Directional light intensity 3.0, color sunColor. `sun.castShadow = true`.

273. `sun.position.copy(sunDir).multiplyScalar(120)` but sunDir is normalized; multiplying mutates a clone? If we call `sun.position.copy(sunDir).multiplyScalar(120)`, it copies sunDir into sun.position then scales. sunDir unchanged. Good.

274. `sun.target.position.set(0, 0, 0); scene.add(sun.target);`.

275. `sun.shadow.camera.left = -34; ...`; `sun.shadow.camera.updateProjectionMatrix();`.

276. `sun.shadow.mapSize.set(2048, 2048);` (at default also 512; set).

277. `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;`.

278. `scene.add(sun);`.

279. Ocean material uniform uTime updated. Sky uTime updated.

280. Check strict TS for `Math.random()` fine.

281. One possible issue: `THREE.Color.multiplyScalar` returns Color, modifying in place. Fine.

282. Vertex color array set: `colors[i*3] = baseCol.r;` etc.

283. For island, `geo.computeVertexNormals()` after setting positions. Good. But `geo.attributes.position.needsUpdate = true;` not needed before first render but set it.

284. `geo.computeBoundingSphere()` maybe for culling; three does lazily. Fine.

285. Boat hull extrude's deck shape uses ShapeGeometry; geometry rotateX(-π/2) then translate y. The ShapeGeometry is flat in XY; after rotate, it lies in XZ plane at y=0. Normal +y? ShapeGeometry normals +z; rotate -π/2 → +y. Good.

286. Cabin windows: thickness in z, placed at z ±0.48. On a boat with beam 0.82, cabin depth 0.95 half 0.475. Windows at ±0.48 slightly outside, looks like windows. Fine.

287. Roof box at y 1.28, cabin top at 0.92+0.31=1.23. Roof bottom at 1.23. Good.

288. Mast bottom at 0.56; cylinder center 0.56+1.75=2.31, height 3.5 → top 4.06. Good.

289. Sail triangle top 3.95, bottom 1.15, aft -1.20. Good. Sail may intersect boom at y 1.12. Fine.

290. Jib: vertices (0.35, 3.8), (1.95,0.62), (0.35,1.0). Attach at mast top and bow. z=0. Good. Slight overlap with hull at bow? The triangle at z=0 plane passes through the boat center; the hull is solid so the lower part of jib might be inside hull. Bottom at y=1.0 above deck 0.56, fine. Bow tip at (1.95,0.62), deck y 0.56. Good.

291. Flag at mast top.

292. All meshes castShadow via traverse. Fine.

293. Boat materials: hullMat etc. Fine.

294. Add `boat.position.set(12, 0, 14)` initially; update each frame.

295. The group's pitch/roll is set, and position y. Good.

296. Boat forward is +X, but the camera looks from (+35,+35) toward origin; boat's bow points +X (toward camera-ish). Fine.

297. Could add a subtle yaw so boat looks more natural: but pitch/roll axes. We could incorporate yaw=0.35 and compute slope along boat axes by sampling rotated directions. Simpler keep yaw 0. It's fine.

298. Let's think about the island's top being pointy due to cone. Noise adds ridges. Fine.

299. Island colors: grass and rock. Good.

300. Add sand ring at shoreline. With height <2 sand. Good.

301. The shoreline at y=0 at r=15.6; sand extends to where y=2 at r~? Solve 9*t^1.7-0.7=2 → t=(0.3)^0.588=0.494 → r=10.1. So sand beach from r=10.1 to 15.6 — wide beach (~5.5 units). Grass from 10.1 inward. Good. Peak 8.3.

302. Palm positions mostly r<12; at r=12, y~0.5 (sand). Some palms on beach — okay. Maybe shift palms inward: use r<10 for most. Let's adjust:
(3.5,1.5) r3.8 h~5.6
(-5.5,-2.5) r6.0 h~? t=0.7, 9*0.7^1.7=9*0.552=4.97-0.7=4.27
(6.5,-3.5) r7.4 h~3.3
(-7.0,3.0) r7.6 h~3.1
(2.0,-8.0) r8.2 h~2.6
(-2.5,8.5) r8.9 h~2.0
(8.5,3.5) r9.2 h~1.8
(-8.5,-5.0) r9.9 h~1.4
All on grass/sand transition. Fine.

303. Rocks at r~13-14 on beach. Good.

304. Palm heights 6.2 trunk + base 1.4-5.6 → tops 7.6-11.8. Good.

305. Leaves at top; total tree height ~12. Island peak 9. Nice.

306. Camera sees palms against sky. Good.

307. Let's ensure palms don't float: base y = islandHeight(x,z) - 0.15, trunk starts there. Good.

308. TubeGeometry radius 0.24, trunk base. Good.

309. Add a tiny offset so trunk is embedded: base y -0.15.

310. Leaves crown at top. Good.

311. The rocks: DodecahedronGeometry(1,0) with random scale. Material gray 0x7d7466 roughness 0.95. Position y = islandHeight+0.35*scale. Some rocks at r=13.5 h~0.6. Good.

312. Add rock rotation random.

313. Add `rocks` to scene. Cast/receive shadows.

314. Type strict: arrays of positions typed.

315. Use `const palmPositions: [number, number][] = [...]`.

316. Loop:
```ts
for (let i = 0; i < palmPositions.length; i++) {
  const [px, pz] = palmPositions[i];
  ...
}
```
Destructuring of tuple fine.

317. `leafData` global array. `const leafData: LeafInstance[] = [];`.

318. Within addPalm, create trunk and crown and push leaves. `leavesPerPalm = 8`.

319. Yaw: `const yaw = (k / leavesPerPalm) * Math.PI * 2 + Math.random() * 0.5;` and `tilt = 0.05 + Math.random() * 0.45`.

Wait, if tilt positive raises leaf tip too much, leaves point up; palm leaves should arch outward/droop. Our geometry droops; tilt 0.05..0.5 compensates. With tilt 0.5, tip rises a lot: leaf direction (cos0.5, sin0.5) = (0.878,0.479) → nearly 29° up. Combined with droop y=-0.55 at tip relative to length 2.6 → the geometry tip before rotation has slope -0.55/2.6 = -0.21 (-12°). Rotating +0.5 (28.6°) → net +17° up. Good. Some leaves up, some down. Use tilt range -0.1 to 0.5. Nice crown variety.

320. Scale of leaves 0.9-1.2.

321. Sway modifies tilt around base. Good.

322. Every frame the leaves matrices update. Good.

323. Performance of 64 matrix composes fine.

324. Use scratch objects created outside loop.

325. `qYaw.multiply(qTilt)` — careful: `qYaw` is reused, and multiply mutates qYaw. Then setFromAxisAngle next iteration resets. Fine. But `qYaw.multiply(qTilt)` multiplies qYaw by qTilt (qYaw = qYaw * qTilt). Good.

326. `mat.compose(pos, qYaw, scaleVec)`. Good.

327. `leaves.setMatrixAt(i, mat)`.

328. After loop, `leaves.instanceMatrix.needsUpdate = true;`.

329. Potential issue: setting instance matrices every frame and `computeBoundingSphere` outdated; we set frustumCulled false. Good.

330. Shadows for InstancedMesh with dynamic matrices: shadow map updates each frame (autoUpdate true), so fine.

331. Let's write final code now.

Need to be careful with `THREE.ExtrudeGeometry` shape orientation: shape y becomes -z. The boat is symmetric so okay. The deck shape too.

332. Boat hull after rotate and translate: hull spans y -0.32..0.65? Extrude depth 0.85 plus bevel thickness 0.12 both sides → -0.12..0.97; translate -0.32 → -0.44..0.65. Good. The deck at 0.56 is slightly below hull top 0.65? The hull outer edge is 0.65; deck sits inside at 0.56, slightly recessed. Good. Cabin bottom 0.61. Good.

333. Waterline: hull bottom -0.44, top 0.65. Boat group origin at water surface; hull sinks 0.44. Looks right.

334. Boat offset +0.06 gives slight float. Good.

335. Let's include `boat.userData`? no.

336. Set `renderer.domElement.style.display = 'block'` maybe.

337. Body background maybe set to fog color to avoid white flash. Set `document.body.style.background = '#c2d9e8'`.

338. Final assembly.

Let's write out the code now, making sure no syntax errors.

One more check: `new THREE.PlaneGeometry(400, 400, 256, 256)` creates 257x257 = 66,049 vertices. That's fine.

339. Ocean geometry rotateX then mesh. Good.

340. Ocean mesh position y=0. Good.

341. Ocean material uniforms object typed; when we create ShaderMaterial, `uniforms: oceanUniforms` type compatibility: ShaderMaterialParameters.uniforms?: { [uniform: string]: IUniform }. Our object structural matches. Good.

342. We access `oceanUniforms.uTime.value = elapsed;`. Good.

343. `skyUniforms.uTime.value = elapsed;` Good.

344. Let's name uniforms variables to access.

345. `sunColor` as `new THREE.Color(0xffe6c0)` for both light and shader. Fine.

346. `sunDir` as normalized Vector3.

347. Shadows: `sun.shadow.camera.left = -35; right=35; top=35; bottom=-35;`.

348. For a low sun, the shadow camera's default up vector may produce weird orientation but fine.

349. `sun.shadow.camera.near = 1; far = 400;`.

350. `sun.shadow.camera.updateProjectionMatrix();`.

351. Add `scene.add(sun.target);`.

352. One more: The sun's target object must be in the scene before render for light direction. Yes.

353. Light intensity with ACES: maybe 3.5. Use 3.2.

354. Hemisphere intensity 0.55.

355. Water specular uses uSunColor (linear ~1.0,0.79,0.53) times pow. Good.

356. Boat hull white will be lit warmly. Good.

357. Let's write.

Potential TS strict issue: `const leafData: LeafInstance[] = [];` defined before `addPalm` function; function hoisting okay. We'll define interfaces and functions then use.

358. `function smoothstep(edge0: number, edge1: number, x: number): number` used.

359. Ensure `islandHeight` is used in geometry and palms.

360. The `heightAt` function is used by boat and exposed.

361. Make sure `heightAt` ignores horizontal shift (none). Good.

362. `__ocean` object created after heightAt defined. Good.

363. Final code.

Let me now carefully write everything in one code block.

Check possible GLSL issue: In ocean fragment, `float ring = (1.0 - smoothstep(16.0, 20.0, dist)) * smoothstep(13.5, 15.6, dist);`. At dist=15.6: first = 1 - smoothstep(16,20,15.6)=1-0=1; second = smoothstep(13.5,15.6,15.6)=1 → ring 1. Good, foam at shoreline. At 16.5: first=1 - smoothstep(16,20,16.5)=1-0.036=0.964; second=1 → 0.96. At 18: first=1-smoothstep(16,20,18)=1-0.5=0.5; second=1 →0.5. At 20:0. So foam ring spreads outward. But wait, island shore at 15.6; foam for dist >15.6 visible. For dist<15.6 both? second smoothstep(13.5,15.6,dist) at 14.5=0.43, first 1 → foam on land (occluded). Fine.

364. The foam ring is static circular; could look artificial but noise modulated. Fine.

365. Add a little wave-driven shore foam animation via fn2. Good.

366. `crestFoam` uses h + noise; threshold. Fine.

367. In the ocean fragment, `smoothstep(0.40, 0.78, fn2)` with fn2 noise 0..1. Fine.

368. The ocean normal from gradient: gradient amplitude from waves: A*k: wave1 0.36*0.1848=0.0665; wave2 0.24*0.3307=0.0794; wave3 0.15*0.5984=0.0898; wave4 0.08*1.083=0.0866. Sum slope magnitude up to 0.32 → normals tilt ~18°. Visible waves. Good, maybe too gentle? Crest-to-trough 1.66 over wavelength 34. Slope 0.066 per wave, sum 0.32 → 18°. Fine. Could increase amplitudes a bit: 0.42, 0.28, 0.18, 0.10 sum 0.98 → crest-to-trough 1.96. Still within 2. Use these.

Let's set amps: 0.42, 0.28, 0.16, 0.09 = 0.95 → 1.9 crest-to-trough. Good.

Wavelengths: 34, 19, 10.5, 5.8. Speeds: 0.8, 1.15, 1.65, 2.1.

369. `heightAt` max ~0.95. Boat pitch from h diff over 3.8 → slope up to ~0.4 rad? Wave gradient 0.3 → h differences over 3.8 ~1.1 → atan(1.1/3.8)=0.28 rad = 16°. Good.

370. The water shader foam threshold: h max 0.95, smoothstep(0.32,0.72) gives foam on high crests. Good.

371. Boat drift x/z uses elapsed, independent.

372. One more: `renderer.setAnimationLoop` callback receives time param; we ignore. Fine.

373. Ensure canvas appended and body styles.

374. Set `document.body.appendChild(renderer.domElement);`.

375. On resize, set pixel ratio again (in case of monitor change) and size.

376. Write now.

Actually, check `THREE.ExtrudeGeometry` options `curveSegments` exists. Yes.

377. `hullGeo.rotateX(-Math.PI / 2);` after ExtrudeGeometry. Good.

378. `deckGeo.rotateX(-Math.PI / 2);`.

379. BufferGeometry for sail: indices optional; three infers triangle from 3 vertices if no index. Setting index [0,1,2] fine.

380. Sail normals: computeVertexNormals. With a single triangle, normal along +z or -z depending winding. DoubleSide. Fine.

381. Flag geometry similarly.

382. Potential issue: The sail's single triangle has no uv, but MeshStandardMaterial doesn't require uv unless maps. Fine.

383. `THREE.ShapeGeometry` deck has uv but no maps. Fine.

384. Boat's meshes cast shadow: traverse.

385. Also set `boat.traverse` receiveShadow true. Fine.

386. Island mesh: `island.castShadow = true; island.receiveShadow = true;`. Casting shadow from terrain okay.

387. Rocks cast/receive.

388. Palms cast/receive.

389. Leaves cast/receive.

390. Sun castShadow.

391. Let's ensure no use of `THREE` addon imports. Only three.

392. `import * as THREE from 'three';` at top.

393. The output is a single code block.

Let me write the code fully.

One detail: `const posAttr = islandGeo.attributes.position as THREE.BufferAttribute;` then `posAttr.setY(i, h)`. Good. After loop `posAttr.needsUpdate = true;`.

For colors: `const colorArray = new Float32Array(posAttr.count * 3);`.

394. In island color computation, call `islandHeight(x+0.9,z)` etc; these use noise; 32k*3 calls, each noise 2 times; maybe 200k hash operations, fine at startup.

395. Palm `islandHeight` calls.

396. `Math.pow(t, 1.7)` with t=0 gives 0. Good.

397. `islandHeight` for r > SHORE_R returns negative; used for rocks near shore maybe still land. fine.

398. For terrain vertices with r>SHORE_R, color computed wet dark. Fine.

399. `islandGeo.computeVertexNormals()` after setting colors? Normals only depend on positions. Order doesn't matter. Set positions, compute normals, then colors.

400. Vertex colors may need `geometry.attributes.color` set before material usage. Fine.

401. `new THREE.BufferAttribute(colorArray, 3)`.

402. Material `vertexColors: true`.

403. Let's write final answer.

Wait, one more consideration: The fog color uniform in ocean shader uses linear color. `fogColor` is `new THREE.Color(0xc2d9e8)` which is linear under color management. Good.

404. Scene fog: `new THREE.FogExp2(fogColor, fogDensity)` - if passing a Color, `FogExp2` constructor stores `new Color(color)` which copies linear values? Actually `new Color(color)` when color is a Color calls `this.copy(color)`? In three, `Color.set(value)` handles Color by `this.copy(value)`. So linear values preserved. Good.

405. Scene background: `scene.background = fogColor` (same Color object). Fine. But background is rendered with tone mapping? Background color is tone-mapped? Three renders background color via clear color which is converted to output color space, not tone-mapped? The scene background color rendering uses `renderer.setClearColor` with color converted? It might not be tone mapped, but sky dome covers so irrelevant.

406. If sky dome fails shader compilation, background color is fine. But we want it to work.

407. I should double check `ShaderMaterial` + `#include <tonemapping_fragment>` works: ShaderMaterial sets `toneMapped` default true, and WebGLProgram injects tone mapping functions and `toneMappingExposure` uniform into the fragment prefix. Yes, for all materials including ShaderMaterial (not RawShaderMaterial). Good.

408. `#include <colorspace_fragment>` uses `linearToOutputTexel` which is injected based on renderer.outputColorSpace. Yes.

409. If not injected, compile error. Three's WebGLProgram prefixFragment includes `getTexelEncodingFunction('linearToOutputTexel', parameters.outputColorSpace)`? In newer versions, `colorspace_pars_fragment` chunk is included and defines functions. Let me recall the prefix. In r160 WebGLProgram:
```
prefixFragment = [
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
Yes. Good.

410. The same for the sky.

411. Let's produce.

Potential minor: `cameraPosition` in fragment is available in prefixFragment; yes.

412. GLSL: `uniform vec3 uSunDir;` and also prefix has `uniform vec3 cameraPosition;`. No name clash.

413. In the vertex shader, we use `uTime` uniform declared. Good.

414. The wave GLSL has const declarations inserted into both vertex and fragment. In fragment, `waveGradient` uses constants. Good.

415. String interpolation of waveGLSL into both shaders duplicates constants. Fine.

416. One more: The `waveGLSL` inserted after varying/uniform declarations in fragment and vertex. Functions use `p`, `t` params. Fine.

417. TypeScript: `const waveGLSL = buildWaveGLSL(waveDefs);`.

418. `sunDir.clone()` for uniform.

419. Need `skyUniforms` separately or inline. We'll access `skyMaterial.uniforms.uTime.value`.

420. Let's define `const skyUniforms = { uSunDir: { value: sunDir.clone() }, uSunColor: { value: sunColor.clone() }, uTime: { value: 0 } };` and use.

421. Same for ocean.

422. Now write.

423. Add `renderer.domElement.style.width = '100%'`? setSize handles style? renderer.setSize sets canvas style width/height in px. Fine.

424. Window resize listener.

425. `document.body.style.margin = '0'` and `overflow = 'hidden'`.

426. Finally assign `__scene`, etc.

427. `__ready` after first render.

428. Done.

Let me now write the final code block.

Double-check the leaf geometry color: `baseCol.clone().lerp(tipCol, u)` per vertex (22 verts) fine.

Leaf width: at u=0, w=0.02 + 0 = 0.02; at u=1, sin(pi)=0 → w=0.02. So tip width 0.02 (nearly pointed). Good.

Droop y = -0.55 * u^1.8. Good.

429. For the leaf instance position, the leaf geometry starts at base at origin; the leaf position is at the crown. Good. Since the geometry droops downward from base, leaves will hang. The crown sphere hides bases.

430. Palm trunk curve: uses `outward` normalized. For base at (0,0) would NaN; not our case.

431. Add a small random rotation to trunk? no.

432. Crown sphere geometry: `new THREE.IcosahedronGeometry(0.34, 0)`, material `new THREE.MeshStandardMaterial({ color: 0x5b6b2f, roughness: 0.9 })`. Fine.

433. Maybe add a coconut cluster? skip.

434. Palm trunk material color 0x7a5a34 roughness 0.95.

435. TubeGeometry with 20 tubular segments, 6 radial. Good.

436. Add `trunk.castShadow = true; trunk.receiveShadow = true;`.

437. Leaves cast/receive.

438. Rocks cast/receive.

439. Done.

Let's finalize.

Wait, one issue: The leaves InstancedMesh has geometry whose vertex colors are baked; `vertexColors: true` on InstancedMesh material works. Good.

440. The `leafData` array is filled by addPalm during setup; then `leaves` InstancedMesh is created after. Good.

441. `updateLeaves(0)` initial call sets matrices before first render. Good.

442. Add leaves to scene after creation.

443. Add `leaves.instanceMatrix.needsUpdate = true` initially as well.

444. Render loop updates.

445. All set.

446. TypeScript strict: `const [px, pz] = palmPositions[i];` with tuple type fine. If array typed `Array<[number, number]>`, destructuring gives numbers.

447. In `addPalm`, use `const outward = new THREE.Vector3(baseX, 0, baseZ).normalize();` If baseX/baseZ nonzero, fine.

448. Use `const lean = outward.clone().multiplyScalar(1.0);` or just outward. We use outward components.

449. Points: 
```ts
const p0 = new THREE.Vector3(baseX, baseY, baseZ);
const p1 = new THREE.Vector3(baseX + outward.x * 0.25, baseY + 2.1, baseZ + outward.z * 0.25);
const p2 = new THREE.Vector3(baseX + outward.x * 0.65, baseY + 4.3, baseZ + outward.z * 0.65);
const p3 = new THREE.Vector3(baseX + outward.x * 1.0, baseY + 6.2, baseZ + outward.z * 1.0);
```
Good.

450. Curve = new THREE.CatmullRomCurve3([p0,p1,p2,p3]); TubeGeometry(curve, 20, 0.24, 6, false). Good.

451. The top p3.

452. Leaves per palm 8, total 8 palms = 64.

453. Good.

I think ready.

One more thought: `renderer.shadowMap.type = THREE.PCFSoftShadowMap;` and mapSize 2048.

454. `sun.shadow.camera` ortho with left/right. Need `sun.shadow.camera.updateProjectionMatrix()` after setting. Good.

455. `sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;`.

456. Add `sun.target` to scene and `sun.target.updateMatrixWorld();` maybe not needed.

457. Fine.

Let's write it.

Also, ensure the ocean `heightAt` function matches shader wave time. `time()` returns `oceanUniforms.uTime.value`, which is elapsed. If a tester calls `heightAt(x,z,__ocean.time())`, it matches. Good.

458. Shader time uses uTime, updated each frame before render. Good.

459. The ocean's wave function also includes no horizontal shift. Good.

460. Done.

Now produce the final answer with the code block.

Let me write the code carefully, checking syntax as I go.

Potential concern: `THREE.Color` with numeric hex and ColorManagement: vertex colors are linear, good. But for `baseCol.multiplyScalar(v)` where v >1, linear values may exceed 1 slightly, okay.

Potential concern: `THREE.PlaneGeometry` attribute position type union. Cast.

Potential concern: `THREE.BufferAttribute` setY exists. Yes.

Potential concern: `geo.computeVertexNormals()` after modifying positions works.

Potential concern: `const colorArray = new Float32Array(posAttr.count * 3);` and `geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));`. Good.

Potential concern: `const baseCol = new THREE.Color();` reused and set per vertex; then `colorArray[i*3] = baseCol.r;` etc. Good.

Potential concern: `noise2` with negative coordinates: Math.floor handles negatives, hash uses sin, fine.

Potential concern: `hash2` returns fractional part; with negative sin values, `s - Math.floor(s)` yields [0,1). Good.

Potential concern: In GLSL hash21, `p = fract(p * vec2(...));` with negative p? GLSL fract of negative gives positive fractional [0,1), fine.

Potential concern: fbm returns up to ~0.9375. Good.

Potential concern: `smoothstep(0.32, 0.72, h + ...)` GLSL smoothstep okay.

Potential concern: `pow(s, 220.0)` with s possibly 0 and pow(0,220)=0, fine. But `pow(ndh, 220.0)` with ndh 0 fine (undefined for negative base, but ndh >=0). Good.

Potential concern: `reflect(-viewDir, n)` n normalized. Good.

Potential concern: In sky fragment, `pow(clamp(y,0,1),0.55)` fine.

Potential concern: Sky `d = normalize(vDir)` vDir already normalized; fine.

Potential concern: `col += uSunColor * pow(s,220.0)*3.0` with s=1 → bright. Good.

Potential concern: Tone mapping chunk may darken sky; exposure 1.0. Fine.

Potential concern: `skyMaterial.depthTest = false` might cause sky to render over everything if renderOrder not respected. Opaque objects sorted by renderOrder then material id? Three sorts opaque by renderOrder, then program/material id, then z. Sky renderOrder -1000 ensures first. Even though depthTest false, it draws first and subsequent objects draw over with depthTest true and depthWrite true. Since sky doesn't write depth, later objects pass depth test against cleared depth. Good.

Potential concern: The ocean is opaque and drawn after sky. Good.

Potential concern: The island and palms have `fog: true` default, scene.fog applies. Good.

Potential concern: The sky material is ShaderMaterial with fog false. Good.

Potential concern: `renderer.setSize` before appending? Either. Append then set size. Fine.

Potential concern: `camera.lookAt(0,2,0)` after setting position. Good.

Potential concern: `scene.add(sky)` after setting position copy camera. Fine.

Potential concern: The sun's target and light: set `sun.position` and `sun.target.position`; add both to scene. Good.

Potential concern: Shadow camera's `up` may be parallel to light direction? Light direction is nearly horizontal (-0.65,0.22,-0.73), not parallel to up (0,1,0). Fine.

Potential concern: The directional light's shadow camera might not cover the palms' shadows; ±35 covers.

Potential concern: Boat is at (12,14) which is within ±35. Good.

Potential concern: The sun's position at 120*dir has y=26; shadow camera looks at origin; near/far 400 covers island (which extends along light direction maybe 20). Good.

Potential concern: The `leaves` InstancedMesh uses `leafMaterial` with `vertexColors: true`; the instance matrices update. Good.

Potential concern: `leaves.instanceMatrix.needsUpdate = true` each frame plus `setUsage(DynamicDrawUsage)`. Good.

Potential concern: Shadows from instanced leaves: Three supports InstancedMesh shadows. Good.

Potential concern: The palm leaves' positions are world coordinates, and the InstancedMesh is at origin with identity matrix. Good.

Potential concern: If we move sky.position to camera.position, the `sky` mesh's world matrix is set; the shader uses `position` local normalized, correct direction from camera. Good.

Potential concern: Camera static, so no need to update each frame.

Potential concern: If the tester moves the camera? Not our concern.

Now final code.

I'll write it.

One more check on GLSL wave constants: `const vec2 WD0 = vec2(0.943883, 0.330350);` global const with vec2 constructor of literals is a constant expression in GLSL ES 1.00? Global const initializers must be constant expressions; vec2 constructor of literals is allowed. Yes.

Actually, in GLSL ES 1.00, `const` declarations at global scope with constructor expressions are allowed? I believe yes (the spec allows constant expressions including constructors). Three examples often use `const float`. To be safe, don't use `const vec2`; use `#define`? Or just inline the vectors in the functions. Simpler: generate inline formulas without constants:

```
h += 0.42 * sin(0.184800 * dot(vec2(0.943883, 0.330350), p) - 0.800000 * t + 0.000000);
```
and gradient similarly. Then no global consts. That's safest and avoids any const issue. But recomputing `dot` with literal vec2 each time is fine.

Let's generate inline expressions:
```
heightTerms.push(`  h += ${amp} * sin(${k} * dot(vec2(${dx}, ${dz}), p) - ${speed} * t + ${phase});`);
gradTerms.push(`  g += ${amp} * ${k} * cos(${k} * dot(vec2(${dx}, ${dz}), p) - ${speed} * t + ${phase}) * vec2(${dx}, ${dz});`);
```
This is safe. Use toFixed(6).

Then buildWaveGLSL just functions. Good. Let's do that.

Now the shader function is a bit verbose but fine.

Let's write buildWaveGLSL accordingly.

Final code below.

Also remember to not use `any` implicitly. `(window as any)` is explicit.

Potential lint noUnusedLocals: `dt` not used; avoid. `clock.getElapsedTime` only.

Potential noUnusedParameters: none.

Let's go.