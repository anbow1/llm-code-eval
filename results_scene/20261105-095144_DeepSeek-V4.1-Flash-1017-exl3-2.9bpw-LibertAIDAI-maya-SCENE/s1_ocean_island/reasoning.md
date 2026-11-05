We need to produce a single TypeScript file with Three.js. Needs to compile under strict mode. Let's plan carefully.

Key elements:
- Renderer, camera at (35,12,35) lookAt (0,2,0).
- Ocean: PlaneGeometry 400x400 (or 600) with 256x256 segments, ShaderMaterial custom with Gerstner waves in vertex shader, normals computed analytically or via finite differences in fragment. Need heightAt in JS matching shader. Use 4 Gerstner waves. But Gerstner waves give horizontal displacement; shader displaces position horizontally too, so the vertex at (x,z) moves to (x+dx, z+dz). heightAt should return vertical displacement at undisplaced position (x,z) — fine.

Important: for a plane rotated -PI/2 about X, the local coordinates (x, y) map to world (x, -y)? Let's handle: create PlaneGeometry(400,400,256,256), rotateX(-PI/2) applied to geometry, then positions are world-like x and z with y=0. Then in vertex shader, position.xz are the horizontal coords. Simpler: geometry.rotateX(-Math.PI/2) so the attribute positions are already lying in XZ plane. Then vertex shader uses position.x, position.z.

Gerstner wave: for wave with direction d=(dx,dz) normalized, wavelength L, amplitude A, speed s, steepness Q:
k = 2π/L, c = sqrt(9.8/k) maybe speed, phase = k*(dot(d, p)) - w*t, w = s (choose speed).
Displacement:
x += Q*A*dx*cos(phase)
z += Q*A*dz*cos(phase)
y += A*sin(phase)

Tangent/binormal for normals. Simplify: compute normal analytically from sum of derivatives. For Gerstner, the surface normal can be computed with tangent vectors. Or easier: use sine waves for height and compute normals via derivative sums: For each wave, dH/dx = A*k*dx*cos(phase), dH/dz = A*k*dz*cos(phase); normal = normalize(vec3(-dH/dx, 1, -dH/dz)). But we use Gerstner displacement; ignoring horizontal shift for normals is acceptable visually, and matches heightAt. But the requirement says heightAt returns vertical displacement ignoring small horizontal shift — okay.

Use sine waves (sum of sines) rather than Gerstner to keep consistent. Requirement says sum of at least 3 directional waves (Gerstner or sine). Use 4 sine waves. Crest-to-trough: sum amplitudes ~0.6 each; total up to 2.4 maybe; "crest-to-trough height about 0.5 to 2 units" — sum of amplitudes might produce up to 2x sum. Let's choose amplitudes: 0.42, 0.3, 0.18, 0.1 => max ~1.0, crest-to-trough 2.0. Good.

Wavelengths: 42, 23, 13, 7. Speeds varying.

Wave time: use elapsed time accumulated by delta; shader uniform uTime updated each frame with same value as time(). heightAt uses that value.

Ocean shader:
vertex:
- compute displaced position by summing waves (sine vertical only, plus maybe slight horizontal Gerstner shift for realism — but then heightAt doesn't include shift; that's fine, spec allows ignore). Let's include horizontal shift for Gerstner look? It complicates matching since vertices move; but heightAt evaluated at undisplaced x,z returns vertical displacement; the shader applies vertical displacement at the displaced position... For a vertex at (x,z), shader displaces to (x+dx, z+dz, y+h). The actual water height at world (x,z) is from some other vertex, roughly h(x,z) ignoring shift. Since shift amplitude small (Q*A*cos ~ 0.3), the visual mismatch is minor. But for the boat, sampling heightAt at boat position should match picture. Fine. I'll use pure sine vertical displacement for simplicity and exact match, with maybe a slight choppiness via sharpening? Keep sine.

Actually, for better look, use Gerstner-ish normals with horizontal shift but heightAt ignores. Let's keep sine for exactness.

Fragment: compute normals analytically in vertex shader from derivative sums, pass vNormal, vWorldPos, vHeight. Then:
- Fresnel: based on view dir and normal.
- Sky color: gradient based on normal.y? Use reflection vector to sky: skyColor = mix(horizonColor, zenithColor, pow(max(reflectDir.y,0), 0.5)).
- Water color deep/shallow: mix deep and shallow by ... maybe height or fresnel.
- Sun specular: pow(max(dot(reflect(-viewDir, normal), sunDir), 0), 200) * sunColor.
- Foam near crests: smoothstep(0.75, 1.0, vHeight / maxAmp) with some noise via sin functions. Also foam near shore: distance to island center < 22? Island radius ~ 20. Foam when water shallow: near island, depth small. We can compute foam factor = smoothstep(24, 18, length(worldPos.xz)) * something. Add noise.

Need to use fog manually in ShaderMaterial? If we use custom ShaderMaterial, fog requires adding fog uniforms and code; can include #include <fog_pars_vertex> etc. Simpler: write own fog in fragment using uFogColor and distance. But scene.fog required; custom shader doesn't automatically use scene.fog unless we include fog chunks. We can include fog chunks in ShaderMaterial by setting fog: true and using #include <fog_pars_vertex> etc. Or compute fog ourselves with uniforms matching scene.fog. Requirement: scene.fog blends far ocean into horizon. We'll include fog chunks properly.

ShaderMaterial with fog: true and vertex includes fog_pars_vertex / fog_vertex; fragment includes fog_pars_fragment / fog_fragment. Need to define vFogDepth in fog_vertex chunk. Works if material.fog = true (default true for ShaderMaterial? Actually ShaderMaterial fog defaults false? ShaderMaterial has fog property default false? In three, Material.fog default true for most, ShaderMaterial default false? Checking: ShaderMaterial constructor sets this.fog = false? I think ShaderMaterial's fog property is false by default (it must be enabled and shader must include chunks). We'll set fog: true and include chunks.)

Sky: Use Sky addon. Import { Sky } from 'three/addons/objects/Sky.js'. It adds a large dome with shader; set sun position via sky.material.uniforms['sunPosition'].value. Scale sky to e.g. 10000. Then sun direction matches. Sky addon requires renderer tone mapping? It's fine. Sun position: direction from origin to sun. Choose sun at azimuth/elevation like elevation 25°, azimuth 135°. Compute using spherical.

DirectionalLight positioned along sun direction * distance (e.g., 60). Shadow camera covers island and boat: ortho -60..60, near 1 far 200, mapSize 2048.

Tone mapping ACESFilmic, outputColorSpace SRGB. Also renderer.toneMappingExposure ~0.5 with Sky addon (Sky's shader expects exposure?). Sky addon colors can be very bright; typical example uses exposure 0.5. We'll set 0.6.

Island: Procedural geometry. Use a CircleGeometry or PlaneGeometry with radial height. Let's create island as a Mesh with custom geometry generated in JS: a disc of radius R=22, with subdivisions, height = peak * exp(-r^2 / sigma) maybe plus noise. Actually island across 30-50 units => radius 18-22. Peak 8-12. Use a grid plane 60x60 with 128x128 segments, heights from radial falloff plus noise. Or radial geometry (rings and segments). Simpler: PlaneGeometry(56,56,96,96) rotated X, compute height = h(r) where r = distance from center, plus noise; below water level (negative) so it slopes into sea. Set heightAt radial: peakHeight * smoothstep falloff: h = H * (1 - smoothstep(innerR, outerR, r)) maybe. But then it's flat-ish on top. Use h = H * exp(-(r/12)^2) - 1.2, so at r=0 h=H-1.2 ~ 8; at r=28 h ~ -1.2 (underwater). Add noise for terrain. Make island centered origin. Water level 0. Need sand near water: vertex colors based on height: sand color for y < 1.2, grass above, rock on steep slopes/high.

But the island occupies origin and boat at (12,0,14) — distance from origin ~18.4, island radius where above water maybe ~12? Need boat not on land. Let's make island radius to shoreline ~ 12-14, with underwater slope extending to 22. Boat at (12,14) is 18.4 away, likely in water. However island's "30-50 units across" means diameter 30-50; so above-water extent should be ~ 15-20 radius. Boat at 18.4 could hit shore; better place island's land radius ~ 12 and shallow slope to 20; boat at 18.4 in shallow water, fine visually (boat next to island). Hmm, boat must stay within 25 of origin, so at (12,14) = 18.4 okay. Make island radius ~ 14 at waterline, with sand beach. Boat at 18.4 in water outside.

Maybe make island elliptical? Keep circular radius 13 at waterline; overall footprint diameter ~ 40 with underwater slope to 20. That satisfies "30 to 50 units across" if counting base; peak 10.

Height function for island:
h(r) = H * exp(-(r/9)^2) + noise - 1.5? At r=0: H-1.5 ~ 8.5 with H=10. At r=13: 10*exp(-2.09)=1.23 - 1.5 = -0.27 => near waterline. Hmm waterline where h=0: 10*exp(-(r/9)^2) = 1.5 => exp = 0.15 => r/9 = sqrt(1.897)=1.377 => r=12.4. Good.

But exp falloff gives a dome, nice but too smooth. Add FBM noise scaled by (something) to create ridges. Use simple value noise with hash function in TS. Noise amplitude 1.5 * (1 - r/20). Ensure no noise near center? Fine.

Vertex colors: based on final height and slope. Compute normals via geometry.computeVertexNormals. Color per vertex:
- if y < 0.4: sand (wet sand darker below 0)
- y < 1.5: sand
- up to 6: grass
- above 6: rock/dark green blend
Also slope: steep => rock. Use color lerp.

Material: MeshStandardMaterial({vertexColors: true, roughness: 0.9, flatShading? }) With flatShading false. receiveShadow true.

Island mesh exposed as __island; receives shadows.

Palm trees: at least 5 palms. Each palm: curved trunk built from primitives. Could use a series of CylinderGeometry segments or a TubeGeometry along a CatmullRomCurve3. Trunk as TubeGeometry (one mesh per palm) with brown material, plus coconuts (small spheres) optional. Leaves: one InstancedMesh for ALL leaves of all palms with at least 30 instances. Each palm has e.g. 8 leaves, 6 palms => 48 instances. Leaf geometry: a flattened shape — use PlaneGeometry? Better: custom leaf geometry shaped like a palm frond: a plane geometry with a tapered shape, or use a ConeGeometry flattened? Common approach: use PlaneGeometry(0.5, 2.5) with segments and bend? For instancing with sway, simple leaf as a long tapered blade: use a custom BufferGeometry: a strip with width tapering; or use a ConeGeometry(0.35, 2.0, 4) squashed? For instanced mesh with matrix updates, a plane is fine but double-sided with alpha? No textures allowed; use geometry with vertex shape.

Let's build leaf geometry: a frond as a triangle strip along local +Y direction (from base to tip) with width tapering, curved downward. Actually easier: create a BufferGeometry with vertices computed: for t in 0..segments, y = t*L, width = w * sin(pi * t)? and z = -0.3 * t^2 (droop). Build a strip with 2 vertices per step, indices. Then normals computed. Use MeshStandardMaterial with side: DoubleSide, color green, maybe vertex colors varying green. For instancing, need per-instance scale/rotation. Leaf base at origin, extends along +Y, droops in -Z. Then instance matrix places base at top of trunk and rotates around Y for radial distribution, plus tilt outward.

Sway: each frame, compute instance matrices: base position of each leaf (stored data), rotationY (angle), plus sway offset based on time: rotate around base slightly (rotation about local X or Z) and translate tip? Since matrix rotates whole leaf about base, sway = small tilt angle varying with sin(time + phase). Compose matrix: position + quaternion (Euler: tiltX etc). For leaves pointing outward with droop already in geometry, apply rotation around Y and a tilt outward (rotate about X? ). Let's define leaf geometry along +Y. Place base at crown. Rotation: rotateY(angle) then rotateZ(outward tilt)? Hmm: To make leaves radiate horizontally outward, rotate about X by ~ -70° so +Y points outward and slightly up? Let's think: local +Y is up. Rotation about X by +60° maps +Y toward +Z? R_x(θ): y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. So +Y with θ=70° gives (0, 0.34, 0.94) -> mostly +Z, slight up. Then rotate about Y by angle to distribute. Good. So Euler order 'YXZ' maybe: rotation = Euler(tiltX, angleY, 0, 'YXZ')? Three Euler order: for 'YXZ', rotation applied... Let's just use quaternion: qY.setFromAxisAngle(Y, angle) * qX.setFromAxisAngle(X, tilt). Then local +Y becomes rotated by qX first then qY. q = qY * qX. Good.

Sway: vary tilt by sin(t*1.5 + phase) * 0.12, plus angleY small variation. Each instance has stored base pos, angle, tilt, phase, scale. Update matrices each frame with needsUpdate.

InstancedMesh castShadow true, receiveShadow maybe true.

Leaves instanced count: number of palms * 9 = 54. Requirement at least 30. Good. Expose __leaves.

Palm trunk: TubeGeometry along curve: points from base (at island height) to top with a curve; radius ~0.25. Use MeshStandardMaterial brown. Compute points: base at (px, y0, pz), top at (px + leanX, y0 + height, pz + leanZ). Curve CatmullRomCurve3 with 4 points; TubeGeometry(curve, 12, 0.22, 8, false). Add a crown sphere small at top? The leaves instanced; maybe add a small sphere at crown (nuts). Each palm could have nuts as small spheres — but requirement at least 3 meshes in boat, palms just need trunk+leaves. Add coconuts as one instanced? Keep simple: small sphere per palm (not instanced) fine, 6 extra meshes okay.

Place palms at radius 3-10 from island center, at heights: compute island height function at (x,z). Use the same function used for terrain. Ensure above water (>0.5). Positions maybe angle distributed.

Boat: Group at (12,0,14). Build hull: use a shape? Primitives requirement: hull, deck/cabin, mast and sail; at least 3 meshes. Use:
- Hull: a BoxGeometry(1.6, 0.8, 4) scaled/twisted? Box looks blocky. Better use a sphere scaled? "built from primitives" — use a LatheGeometry? That's not exactly primitive but generated. Use CapsuleGeometry? Let's build hull from BoxGeometry with tapered ends using vertex manipulation (still from BoxGeometry primitive). Or use a CylinderGeometry rotated? Boat hull: use a BoxGeometry(1.8, 0.9, 4.2, 8, 2, 8) and modify vertices to narrow bow/stern and round bottom. That's a primitive-derived mesh, acceptable. Simpler: use a SphereGeometry scaled (1.0, 0.5, 2.2) cut? Hmm.

Let's do hull as a custom shape from BoxGeometry manipulation: positions: x scaled by (1 - 0.7*(z/2.1)^2)? narrow at ends; y bottom rounded. Add vertex colors? Use MeshStandardMaterial brown/white.

- Deck: BoxGeometry(1.5,0.12,3.2) at y=0.45, wood color.
- Cabin: BoxGeometry(1.0,0.6,1.0) at y=0.8, white.
- Mast: CylinderGeometry(0.06,0.06,3) at y ~ 2.2.
- Sail: a custom BufferGeometry triangle or PlaneGeometry curved? Use PlaneGeometry(1.8, 2.4, 8, 8) with slight curve (vertices pushed in z by sin) and white material double side. Position at mast, rotated. Maybe two sails (main + jib). At least 1 sail. Use ShapeGeometry? A triangular sail would look better. Build a BufferGeometry triangle: points (0,0,0), (0,2.4,0), (1.7,0.3,0) — but plane geometry with curve. Let's make a custom triangle geometry with a bulge by subdividing? Simplicity: PlaneGeometry(1.6, 2.2, 6, 6), modify vertices: z = sin(u*pi)*0.25 * (1 - v)?? Then place vertical. But sail should attach to mast, triangular-ish. Use BufferGeometry with explicit triangle and a slight curve. I'll do a simple triangle with 3 vertices, DoubleSide, white. Casts shadow. That's a mesh made from BufferGeometry; requirement "primitives" hull/deck/mast/sail — fine.

Boat group: hull, deck, cabin, mast, sail, maybe boom, flag. All castShadow true. receiveShadow maybe.

Boat motion: each frame compute t = time(); boat x,z drift slowly within 25 of origin: base (12,14) plus circular drift radius 1.5: x = 12 + sin(t*0.08)*1.2, z = 14 + cos(t*0.07)*1.0. Stay within 25.

Height: y = heightAt(x,z,t) + offset (offset ~ 0.25 to sit on water). Pitch/roll: sample heightAt ahead/behind and left/right relative to boat heading. Boat heading fixed maybe slight rotation yaw. Let's compute local forward along +Z? Boat hull long axis Z. rotation.y small drift? Keep boat yaw = e.g. 0.4 rad slowly oscillating. For pitch/roll, use world positions offset along boat's forward/right directions.

Compute forward vector f = (sin(yaw), 0, cos(yaw)) (for rotation.y = yaw, local +Z maps to (sin yaw, 0, cos yaw)). Right vector r = (cos yaw, 0, -sin yaw). Sample hF = heightAt(x + f.x*2, z + f.z*2, t), hB = heightAt(x - f.x*2, z - f.z*2, t); pitch = atan2(hF - hB, 4) maybe negative? If front is higher, boat should pitch nose up: rotation.x = -atan2(hF-hB, 4)? For rotation around local X, positive rotation.x tilts +Z downward? Let's test: rotating +Z about X by angle θ: z' = z cosθ, y' = -z sinθ? R_x: y' = y cosθ - z sinθ; z' = y sinθ + z cosθ. For point (0,0,1): y' = -sinθ. So positive θ moves front down. If front higher, we want front up => negative θ. So rotation.x = -atan2(hF - hB, spacing). Roll: sample right/left: hR - hL, roll around Z: positive rotation.z rotates +X toward +Y? R_z: x' = x cosθ - y sinθ, y' = x sinθ + y cosθ. For point (1,0,0): y' = sinθ, so positive θ raises right side. If right higher, rotation.z = atan2(hR - hL, spacing). Good.

Use group rotation order 'YXZ' maybe so yaw then pitch/roll. group.rotation.y = yaw; group.rotation.x = pitch; group.rotation.z = roll; default order XYZ would apply differently. Set group.rotation.order = 'YXZ'. Good.

Add smoothing: lerp current rotation toward target? Slight smoothing for realism. Use damp factor based on delta.

Sun light: position sun direction; DirectionalLight intensity 3? With ACES exposure 0.5 and Sky, intensity maybe 2. Shadow map 2048, camera ortho covering -60..60. Actually shadow camera needs to cover island and boat, centered near origin: left -50 right 50 top 50 bottom -50, near 1 far 200. Position sun at direction * 80. Target at origin (0,0,0). Add target to scene.

Hemisphere light: sky color 0x8ec5ff, ground 0x2a6a4a, intensity 0.6. Maybe AmbientLight 0.1.

Fog: scene.fog = new THREE.Fog(0x9ec9e8? horizon color, 80, 380). But ocean plane extends 400x400, camera at 50 distance; fog far 400. Horizon blending: use fog color matching sky horizon (light blue). Choose Fog(0xb6d8f0, 90, 360). Actually with Sky addon, horizon is bright; fog color should match sky. Set fog color 0xa8cfe8 maybe. Sky at elevation ~ 0.5. Let's compute sun.

Sky addon uniforms: turbidity, rayleigh, mieCoefficient, mieDirectionalG, sunPosition. Typical: turbidity 10, rayleigh 2, mieCoefficient 0.005, mieDirectionalG 0.8. Sun elevation 28°, azimuth 140°.

Note Sky addon's shader is designed with tone mapping? It writes output which goes through renderer tone mapping? Sky material is ShaderMaterial, toneMapped maybe true? Sky has material.toneMapped? Not sure; fine.

Need exposure: with ACES and Sky, typical example uses exposure 0.5. Set renderer.toneMappingExposure = 0.55.

Potential issue: Sky is huge sphere with BackSide; fog on sky? Sky material fog false. fine.

Ocean shader details.

Vertex shader:

uniform float uTime;
uniform vec3 uSunDir;
uniform float uWaveAmpTotal;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vWaveAmp;

Wave params in shader as const arrays? GLSL ES 1.0 supports arrays but constant initialization of arrays okay? Use #define and functions. Better hardcode four waves in a function.

Define:
const vec4 W1 = vec4(dirX, dirZ, wavelength, amplitude)? But speed too. Use function per wave with constants.

vec3 waveSum(vec2 p, float t, out vec2 deriv) — GLSL doesn't allow out params easily? It does (GLSL ES 1.00 supports out parameters in functions? Yes, `out` qualifier allowed for function parameters in GLSL ES 1.00). Alternatively compute normal in fragment with derivative analytic functions. Simpler: in vertex shader compute height and derivatives:

float waveHeight(vec2 p, float t) {
  float h = 0.0;
  h += 0.42 * sin(dot(vec2(0.8,0.6), p) * (6.2831853/42.0) + t*1.05);
  ...
}
But direction must be normalized and dot with p uses normalized dir. Need phase = k*dot(dir, p) - w*t. Use speed as angular frequency? Let's define each wave with frequency omega directly. For wavelength L, k = 2π/L. Phase = k*dot(d,p) - omega*t. Choose omega = k * c with c a speed maybe 2-6.

Let's pick waves:
1. dir (0.85, 0.53) normalized, L=44, A=0.42, speed c=6.0 -> omega = k*c = (0.1428)*6 = 0.857.
2. dir (-0.4, 0.92) normalized, L=26, A=0.30, c=4.5 -> k=0.2417, omega=1.088.
3. dir (0.6, -0.8) normalized, L=15, A=0.20, c=3.4 -> k=0.4189, omega=1.424.
4. dir (-0.9, -0.44) normalized, L=8.5, A=0.10, c=2.8 -> k=0.7392, omega=2.07.

Total amplitude 1.02, crest-trough ~2.04 max; typical wave visible.

Derivatives:
dH/dx += A*k*dirX*cos(phase)
dH/dz += A*k*dirZ*cos(phase)
Normal = normalize(vec3(-dHdx, 1, -dHdz)).

But for big plane 400 units, wave heights are low relative; waves visible near camera at distance ~50. Need at least 0.5-2 units; with amplitude sum 1.02 fine but might look small. Could raise amplitudes to 0.55,0.38,0.24,0.12 => total 1.29 => crest-trough 2.58, slightly above spec. Keep 0.45,0.32,0.20,0.10 = 1.07 crest-trough 2.14. Okay within "about".

But geometry 256 segments over 400 units = 1.56 unit spacing, wavelength 8.5 wave won't resolve well (aliasing). Use larger plane 500? no, grid at 256 over 400 => 1.56. Small wave L=8.5 barely. Could reduce plane to 300? Requirement at least 400x400. Use 400x400 with 256 seg. Fine; the small wave adds ripple detail in normals (fragment normal computed from analytic derivatives — but vNormal interpolated per-vertex; small wave at 8.5 wavelength with 1.56 spacing has ~5 samples per wavelength, acceptable).

Actually normals from analytic derivatives in vertex shader, interpolated. Fine.

Alternatively compute normals per-fragment using analytic derivative but we don't have undisplaced p in fragment; we can pass world position and compute waves again in fragment (cost okay). To make water look crisp, compute normal in fragment from vWorldPos (though displaced x,z shifted—negligible since no horizontal displacement). We'll compute in vertex for cheapness but 256 segments gives decent normals. Let's compute in fragment for better detail: pass vWorldPos, compute wave derivatives at vWorldPos.xz in fragment using uTime. That gives high-frequency normals even on coarse grid — nice. Also compute foam from vHeight and noise in fragment.

Cost: 4 waves per fragment, fine.

Water color: use depth-based shallow: distance from island center; near island (r<22) shallow color turquoise, deeper farther: deep color 0x05243f, shallow 0x1fa8a0. Use smoothstep(14, 30, r) to blend from shallow to deep. But island radius ~13 at waterline, so near r 13-20 shallow.

Fresnel = pow(1 - max(dot(normal, viewDir),0), 5) * 0.9 + 0.02. Reflect sky color with gradient: zenith blue to horizon light. Compute reflected dir R = reflect(-viewDir, normal). sky = mix(horizonColor, zenithColor, pow(max(R.y,0), 0.4)). Sun specular: spec = pow(max(dot(R, sunDir),0), 300) * sunColor * 2. Also broad glitter: pow(..., 60) * 0.15.

Foam: crest foam = smoothstep(0.75, 1.0, vHeight/uMaxAmp) * noise; plus shore foam = smoothstep(24.0, 16.0, r) * (0.4 + 0.3*noise) maybe too much; shoreline foam near r ~ 13-16 where water shallow. Actually water plane continues under island; island covers center. Foam ring near r 13-17. Use smoothstep(19,13,r) and add sin noise. We have island above water at r<12.4. Water visible r>12.4. Foam band 12.5-16. That looks like breaking waves. Combine foam = clamp(crestFoam + shoreFoam, 0,1). Foam color white-ish, mix into final color. Use noise function with sin/cos combos in fragment: n = fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453) maybe noisy; better use smooth sin patterns: n = 0.5 + 0.5*sin(p.x*3.1 + p.y*2.7 + uTime*1.5). fine.

Fog: use fog chunks. For ShaderMaterial with fog: true, we need `#include <fog_pars_vertex>` and `#include <fog_vertex>` in vertex; and `<fog_pars_fragment>` and `<fog_fragment>` in fragment. In fog_vertex, it uses mvPosition variable; we must have computed mvPosition. Include after computing gl_Position. In fragment, `<fog_fragment>` uses vFogDepth and fogColor etc. Must declare outgoing color variable gl_FragColor; chunk modifies gl_FragColor.rgb. In recent three versions ShaderMaterial with gl_FragColor works (still supported). Use gl_FragColor.

Important: `#include <fog_pars_fragment>` declares uniforms fogColor, fogNear, fogFar (or fogDensity), vFogDepth. Good.

Need to consider Three version: latest r160+ removed? gl_FragColor still valid in WebGL2 via compatibility. Three's WebGLProgram adds macros. fine.

ShaderMaterial uniforms: uTime, uSunDir, uDeepColor, uShallowColor, uSkyColor? and fog uniforms auto-filled when fog true? WebGLRenderer sets fog uniforms for materials with fog:true automatically (refreshFogUniforms). In ShaderMaterial, it sets uniforms.fogColor.value etc. if material.fog and uniforms has fogColor? Actually WebGLMaterials refreshFogUniforms(m_uniforms, fog) sets uniforms.fogColor.value.copy(fog.color) etc. But uniforms must exist in shader program; the fog chunk declares them via uniforms? The `fog_pars_fragment` declares `uniform vec3 fogColor;` etc. But ShaderMaterial uniforms object must include them or renderer tries? In WebGLProgram, uniform values are looked up from materialProperties.uniforms — if `fogColor` isn't defined in uniforms object, refreshFogUniforms would crash? Let's check Three's WebGLMaterials.refreshFogUniforms:
```
function refreshFogUniforms( uniforms, fog ) {
  fog.color.getRGB( uniforms.fogColor.value, getUnlitUniformColorSpace( renderer ) );
  if ( fog.isFog ) {
    uniforms.fogNear.value = fog.near;
    uniforms.fogFar.value = fog.far;
  } ...
}
```
So uniforms must have fogColor, fogNear, fogFar. Three's ShaderMaterial with fog: true: does WebGLRenderer auto-create? In `WebGLRenderer.getProgram` / `materialProperties`, for ShaderMaterial the uniforms are from material.uniforms. If fog enabled but no fogColor, refreshFogUniforms will error. However, typical examples of ShaderMaterial with fog: you must add fog uniforms yourself:
```
uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {...}])
```
Yes, use THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {uTime:...}]). Then fog uniforms present. And set fog: true. Good.

But UniformsUtils.merge clones; then set values after.

We'll do:
const uniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib['fog'],
  { uTime: { value: 0 }, uSunDir: { value: sunDir.clone() }, ... }
]);
Note uniforms typed as any? In strict TS, THREE.UniformsUtils.merge returns { [uniform: string]: THREE.IUniform }. Then uniforms.uTime.value = ... Type is IUniform value any, fine.

ShaderMaterial constructor accepts uniforms: { [uniform: string]: IUniform }.

Sky addon import path 'three/addons/objects/Sky.js'. Types included with three? The `three` npm package includes types for addons? Since r150+, types are in `three/examples/jsm/...` with `three/addons` alias? tsc module resolution may not know 'three/addons/...' unless types package declares? The instruction explicitly says imports from 'three/addons/...'. Assume it compiles with the environment (maybe has types via three's package exports). Sky.js has TS types? In recent three versions, addon JS files have corresponding .d.ts files (three/examples/jsm/objects/Sky.d.ts) and package exports map './addons/*' to './examples/jsm/*'. TypeScript with moduleResolution bundler/node16 can resolve. We'll trust.

To be safe, we can avoid Sky addon and build own sky dome shader — no external addon typing risk. Requirement allows gradient sky dome or Sky addon. A custom sky dome with gradient and a sun disc is easy and avoids type resolution issues, plus guarantees matching sun position and fog. But "with a visible sun position" — draw sun disc in shader. Let's build custom sky dome (SphereGeometry(500, 32, 16), BackSide, ShaderMaterial) with gradient from horizon to zenith and a sun glow disc based on dot(viewDir, sunDir). That is robust and looks good, matching fog color and tone mapping. Renderer tone mapping will apply if material.toneMapped default true? ShaderMaterial toneMapped default true? It's true unless set false. We'll write colors in linear space and let ACES handle. Use colors like horizon 0.75,0.85,0.95 (linear?) Hmm with ACES exposure 0.5, bright values get toned. Simpler: make sky shader output colors and mark toneMapped true; choose linear-ish values and tune. Could set output already sRGB? Shader output is linear, then tone mapping + encoding applies. For a bright sky, use values around 1.0-3.0? Let's think: with exposure 0.5 and ACES, a linear value of 1.0 maps to about 0.8 output? ACES tonemap approx (x*(2.51x+0.03))/(x*(2.43x+0.59)+0.14); for x=0.5*1=0.5 -> (0.5*(1.285))/(0.5*(1.805)+0.14)=0.6425/1.0425=0.616. Then sRGB encode ~0.8. Good. Sky horizon 1.2, zenith 0.4 (bluish), sun 20. Might look okay. Let's craft:
- zenith color: vec3(0.12, 0.32, 0.75) * 1.2?
- horizon: vec3(0.75, 0.88, 1.0) maybe.
- sunColor: vec3(1.0, 0.85, 0.6) * 40 for bloom-ish glow via smoothstep.

Sun disc: d = dot(normalize(vWorldDir), uSunDir); sun = smoothstep(0.9995, 0.99985, d) * 30 + pow(max(d,0),600)*2 + pow(max(d,0),8)*0.15 (halo). Add.

Gradient: mix(horizon, zenith, pow(max(dir.y,0), 0.35)); below horizon (dir.y<0) use horizon color darker (but ocean covers; sky dome below water visible at edges?). Set a "ground" fade to fog color for y<0.

Sky dome should be drawn behind everything and not fogged; set depthWrite false, side BackSide, fog false. Render order maybe -1? With a huge sphere, camera inside; it will be farthest and depth test handles. Set material.depthWrite = false and renderOrder = -10 to ensure behind. Actually sphere radius 500, far plane maybe 1000. Set camera far 2000.

Sun position for light: choose elevation 24°, azimuth 130°:
sunDir = new THREE.Vector3(cos(elev)*cos(azim), sin(elev), cos(elev)*sin(azim)). Direction from origin toward sun. So sun is above and to +x,+z? Let's choose azimuth 60°? Camera at (35,12,35) looking at origin; sun in front-right maybe at (0.7, 0.5, 0.5) to light island and boat and produce specular visible from camera. Camera direction from camera to origin is (-35,-10,-35) normalized. Reflection/specular on water: specular highlights appear when sun direction reflected toward camera. With sun on the opposite side of camera (behind camera), specular can appear on water ahead. Actually specular visible when the sun's reflection direction aligns with view. For sun in front of camera (beyond island), sun's glitter path can be visible in the water between camera and island. Sun direction from origin toward sun should be roughly toward camera-left? Hmm. Camera at +x,+z, looking toward origin (-x,-z). Sun at (+x,+z) high => behind camera; reflection likely visible? For water plane horizontal, reflection of sun over water appears in the direction of the sun from viewer, i.e., between camera and horizon toward sun. Since sun is behind camera, glitter path behind camera, not visible. Better put sun in front of camera: sunDir with negative x and negative z (e.g., azimuth 225°, elevation 30°). Then sun visible in sky in front of camera, glitter path between camera and island. Good. Let sunDir = (-0.65, 0.55, -0.52) approx normalized. Compute via elevation 30°, azimuth 210°: cos30=0.866, sin30=0.5; cos210=-0.866, sin210=-0.5 => (-0.75, 0.5, -0.433). Normalize not needed if using cos/sin: x=cos(elev)*cos(azim) = 0.866*-0.866=-0.75; y=0.5; z=0.866*-0.5=-0.433. Length 1. Good. Sun in front-left of camera view. Great.

DirectionalLight position = sunDir * 100 (so at (-75, 50, -43)), target origin. Light direction from sun to origin, matches sunDir pointing from origin to sun. Shadows cast from that direction.

Sky sun disc visible in front.

Ocean sun specular uses uSunDir.

Now boat positioned at (12,0,14) which is on the right/front of camera view (camera at 35,35 looking at origin). Boat is near camera direction. Good.

Island center origin.

Camera aspect: window innerWidth/innerHeight.

Performance: ocean 256x256 = 65k vertices, fine. Shadows 2048.

Now TypeScript strict details:
- Need to declare window properties via casting (window as any). Fine.
- Ensure no implicit any; all functions typed.
- THREE imports.
- Custom shader strings.
- Geometry vertex manipulation: BufferAttribute typed; use `const pos = geom.attributes.position as THREE.BufferAttribute; pos.getX(i)` etc.
- For color attribute: create Float32BufferAttribute.

Island geometry generation: PlaneGeometry(56,56,96,96) rotateX(-PI/2) then modify y. When rotateX applied, attributes positions y ~ 0 and z spans. Then for each vertex set y = islandHeight(x,z). Compute normals. Set colors based on y and slope after computing normals? Vertex colors need normals; compute normals first then color. But normals depend on heights; call computeVertexNormals after setting y, then read normal attribute for slope. But normals computed on geometry with y updated. Good. Then add color attribute based on y and normal.y (steepness). Use color attribute after compute normals.

However PlaneGeometry after rotateX(-PI/2) has normal attribute pointing (0,1,0); computeVertexNormals recalculates.

Island height function needs deterministic noise. Implement value noise with hash:
function hash2(x:number, y:number): number { const s = Math.sin(x*127.1 + y*311.7)*43758.5453; return s - Math.floor(s); }
Value noise using smooth interpolation. Could implement fbm with 3 octaves. Use it for terrain.

islandHeight(x,z): r = sqrt(x*x+z*z); base = 10.5 * Math.exp(-(r*r)/(2*8.5*8.5)) - 1.6; noise = fbm(x*0.08, z*0.08) * 2.2 * smoothstep? Multiply by clamp(1 - r/22)? Use noise centered: (fbm - 0.5) * 3.0 * (1 - smoothstep(10, 24, r)); Add slight ridges. Ensure at r>22 height < 0 (underwater). Base at r=22: 10.5*exp(-(484)/(144.5)) = 10.5*exp(-3.35)=0.368-1.6 = -1.23. plus noise ~0. Good. At r=28: -1.59. So island above water radius ~12.7. Total "across" ~25 units above water, maybe less than 30. Hmm requirement "about 30 to 50 units across" - should be island footprint 30-50. We can make it bigger: H=11, sigma=11, offset -1.4 => waterline where 1.4 = 11*exp(-(r^2)/(2*121)) => exp=0.127 => r^2/(242)=2.06 => r=22.3. So island diameter ~44. Peak 9.6. Good. Underwater slope extends further (to plane edge maybe small negative). That's fine: island ~44 across. But boat at r=18.4 would be on land/beach (since waterline r=22.3)! That's a conflict. Need boat in water next to island. Boat position is specified "floating at about (12, 0, 14)" - distance 18.4 from origin. Island must not extend above water at r=18.4. So waterline radius must be < ~16. Hmm requirement island 30-50 across—if above-water diameter ~ 30 (radius 15), boat at 18.4 is in water. Good: aim waterline radius 14-15, above-water diameter ~30. Underwater base extends to radius 25 (diameter 50) including shallow shelf. "about 30 to 50 units across" ambiguous but okay if base ~50.

Set island: H=10, sigma such that waterline at 14: 10*exp(-(196)/(2σ²)) = offset. Choose offset 1.2 => exp = 0.12 => 196/(2σ²)=2.12 => σ²=46.2 => σ=6.8. At r=0 height 8.8. At r=18.4: 10*exp(-(338)/(92.4)) = 10*exp(-3.66)=0.257 - 1.2 = -0.94, underwater. Good. Peak 8.8 (within 5-15).

But sigma 6.8 gives steep dome. Fine, tropical island. Add noise. Island extends underwater base to about r=25 with height -1.2. At r=30: -1.2. plane size 56 => 28 half, underwater ends at edge (-1.2). Good.

Actually to have a nicer island shape, use a radial function with a plateau: h = H * (1 - smoothstep(0, 15, r))? At r=0 H=10; at r=15 h=0. Choose offset. With smoothstep, height = 10*(1 - smoothstep(5,15,r)) - 0.8? At r=0..5 flat top 9.2, then slope to -0.8 at 15. Waterline where smoothstep=0.92 => r about 13.5. Waterline radius 13.5, boat at 18.4 is water. Island diameter 27 above water, underwater to 20+ gives "30-50 across". Add noise. This looks more like island with plateau and beach. But smoothstep with plateau gives flat top, less interesting. Use exp gives dome; fine.

Maybe use combination: base = 10.5*exp(-(r/8)^2) - 1.4 gives waterline at r ~ 13.4. Let's compute: need 10.5 exp(-(r/8)^2)=1.4 => exp=0.1333 => (r/8)^2=2.014 => r=11.35. Waterline radius 11.35, island diameter 22.7. Add noise extends shore irregularly to maybe 13. Boat at 18.4 clearly water. Hmm island a bit small vs requirement "30-50 across". But "across" including beach/shallow? We could enlarge the underwater base: add a wide shallow shelf with height just below water out to r=25, colored sand? The island geometry underwater not visible through opaque water unless water transparent? Our ocean is opaque-ish; shallow color only. The island mesh underwater is hidden by water (water shader alpha 1). So "across" visually = beach diameter.

Let's target above-water diameter ~ 30-36 (radius 15-18) while boat at 18.4 in water. Waterline radius 15, boat 18.4 just outside in shallow water — fine, nice. Set exp: 12*exp(-(r/10)^2) - 1.5 => at r=15: 12*exp(-2.25)=1.266 -1.5 = -0.234. Waterline where 12exp=1.5 => exp=0.125 => (r/10)^2=2.079 => r=14.4. Diameter 28.8. Increase: 13*exp(-(r/11)^2) - 1.5: waterline 13exp=1.5 => exp=.1154 => ln=2.159 => r=16.16. Diameter 32.3. Peak = 11.5. Boat at 18.4 => height 13*exp(-(18.4/11)^2)=13*exp(-2.797)=13*0.061=0.79-1.5=-0.71 underwater. Good. Island above-water radius ~16.2 (diameter 32.4) satisfying 30-50. Peak 11.5 within 5-15. 

Noise amplitude ~1.5 * (1 - smoothstep(10,22,r)) could push shore irregular. At r=16, noise might raise above water or lower; okay.

But boat at r=18.4 could be near shore where depth ~ -0.7; waves amplitude 1 could expose ground? Visually water opaque so fine.

Palm placement: radius 4-13, height above 1. We'll place 7 palms at angles, radius 5-12. Compute islandHeight at those positions; ensure > 0.8.

Leaves count = 7 * 9 = 63.

Boat group position: y computed each frame.

Now write the code.

Structure:

```ts
import * as THREE from 'three';

// constants
const SUN_ELEVATION = THREE.MathUtils.degToRad(30);
const SUN_AZIMUTH = THREE.MathUtils.degToRad(210);
const sunDir = new THREE.Vector3(...)

// wave params in JS matching shader
interface Wave { dx:number; dz:number; wavelength:number; amplitude:number; speed:number; }
const waves: Wave[] = [...]
```

heightAt(x,z,t): sum amplitude * sin(k*(dx*x + dz*z) - omega*t). With omega = k*speed. Need directions normalized. Compute.

k = 2π/wavelength.

Shader must use identical numeric constants. To avoid mismatch, we can pass wave parameters as uniform arrays? Uniform array of vec4 with (dx,dz,k,amp) plus omega array. GLSL loop over 4 waves. Then JS and shader guaranteed same if built from same arrays. But strict typing for uniform arrays: value: THREE.Vector4[] works. In shader `uniform vec4 uWaves[4]; uniform float uOmega[4];`. Loop `for (int i=0;i<4;i++)`. That's clean. Use constants N=4.

Vertex shader:
```
uniform float uTime;
uniform vec4 uWaves[4]; // dirx, dirz, k, amp
uniform float uOmega[4];
varying vec3 vWorldPos;
varying float vHeight;
void main() {
  vec3 pos = position;
  float h = 0.0;
  for (int i=0;i<4;i++) {
    vec4 w = uWaves[i];
    float phase = w.z * dot(w.xy, pos.xz) - uOmega[i]*uTime;
    h += w.w * sin(phase);
  }
  pos.y += h;
  vHeight = h;
  vec4 worldPos = modelMatrix * vec4(pos,1.0);
  vWorldPos = worldPos.xyz;
  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
```
Wait `#include <fog_vertex>` expects mvPosition variable declared; yes. But the include is inside main. Good.

Note `position` is vec3 local; geometry rotated so y is 0 initially? PlaneGeometry rotated -PI/2 about X: original (x,y,0) -> (x, 0, -y)?? Let's verify rotateX(-90): y' = y cos(-90) - z sin(-90) = 0*? For original plane z=0: y' = y*0 - 0 = 0; z' = y sin(-90) + z cos(-90) = -y. So y coordinate becomes 0, z becomes -original y. Good, plane lies in XZ. Local position.x and position.z are horizontal.

But in shader, pos.xz used; after rotation matrix is applied on geometry, positions baked. Good.

Ocean mesh: mesh.rotation none. Set mesh.position.y = 0. Fine.

For normals in fragment, we recompute:
```
uniform vec4 uWaves[4]; uniform float uOmega[4]; uniform float uTime;
varying vec3 vWorldPos; varying float vHeight;
float waveHeight(vec2 p, float t) { ...}
```
Compute derivatives:
```
vec2 grad = vec2(0.0);
for (...) {
  float phase = w.z*dot(w.xy,p) - uOmega[i]*t;
  float c = cos(phase);
  grad += w.w * w.z * w.xy * c;
}
vec3 normal = normalize(vec3(-grad.x, 1.0, -grad.y));
```
But p should be undisplaced position — vWorldPos includes vertical only, xz unchanged. Good.

View dir: normalize(cameraPosition - vWorldPos). cameraPosition is built-in uniform in ShaderMaterial? Yes `cameraPosition` is provided. Good.

Colors:
```
vec3 deep = vec3(0.015, 0.08, 0.13);
vec3 shallow = vec3(0.05, 0.32, 0.34);
float shore = 1.0 - smoothstep(16.0, 34.0, length(vWorldPos.xz));
vec3 waterCol = mix(deep, shallow, shore);
```
Actually near island (small r) shallow; far deep. shore = smoothstep(34,16,r)? Use `1.0 - smoothstep(16.0, 34.0, r)` gives 1 near 16 and 0 at 34. Good.

Fresnel:
```
float fres = pow(1.0 - clamp(dot(normal, viewDir),0.0,1.0), 5.0);
fres = 0.02 + 0.98*fres;
```
Sky reflection:
```
vec3 R = reflect(-viewDir, normal);
float skyUp = clamp(R.y, 0.0, 1.0);
vec3 skyRefl = mix(vec3(0.55,0.72,0.85), vec3(0.10,0.28,0.62), pow(skyUp, 0.45));
```
Hmm color management: output linear. Horizon color maybe (0.55,0.72,0.85) in linear? That would be quite light. Fine.
```
vec3 col = mix(waterCol, skyRefl, fres);
```
Specular:
```
vec3 H? Use reflect sun: float sunSpec = pow(max(dot(R, uSunDir),0.0), 350.0);
col += vec3(1.0,0.9,0.7) * sunSpec * 4.0;
col += vec3(1.0,0.85,0.6) * pow(max(dot(R,uSunDir),0.0), 40.0) * 0.15;
```
Foam:
```
float crest = smoothstep(0.65, 1.0, vHeight / uMaxAmp);
float n = 0.5 + 0.5*sin(vWorldPos.x*1.7 + vWorldPos.z*2.3 + uTime*1.9);
n *= 0.5 + 0.5*sin(vWorldPos.x*4.1 - vWorldPos.z*3.7 - uTime*2.7);
float shoreFoam = (1.0 - smoothstep(15.0, 19.0, length(vWorldPos.xz))) * smoothstep(0.3,0.8,n*1.5);
float foam = clamp(crest*0.8 + shoreFoam*0.7, 0.0, 1.0);
col = mix(col, vec3(0.85,0.92,0.95), foam*0.8);
```
But shore foam depends on island center distance; good.

Add subtle subsurface scattering: `col += vec3(0.0,0.25,0.2) * pow(max(vHeight/uMaxAmp,0),2)*0.15;`

Fog: `#include <fog_fragment>` after gl_FragColor.

Need `uMaxAmp` = sum of amplitudes.

Add distance-based fade? fog handles.

Also water should receive shadows? ShaderMaterial doesn't receive shadows. Boat shadow on water would be a plus but not required. Island shadow on water not required. Skip.

Sky dome custom shader:
```
vertexShader: varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
```
Sphere centered at origin; using modelViewMatrix with sphere at origin; camera at (35,12,35) inside sphere radius 800. Direction = normalize(position) (object space); since sphere no rotation, same world. Fragment:
```
vec3 dir = normalize(vDir);
float h = clamp(dir.y, -0.1, 1.0);
vec3 zenith = vec3(0.08,0.22,0.55);
vec3 horizon = vec3(0.72,0.84,0.92);
vec3 sky = mix(horizon, zenith, pow(max(h,0.0), 0.45));
float sunD = max(dot(dir, uSunDir), 0.0);
sky += vec3(1.0,0.75,0.45) * (pow(sunD, 800.0)*40.0 + pow(sunD, 20.0)*0.35 + pow(sunD, 3.0)*0.05);
// horizon haze
sky = mix(vec3(0.78,0.86,0.92), sky, smoothstep(-0.05, 0.08, dir.y));
```
Set depthWrite false, side BackSide, toneMapped true? ShaderMaterial material.toneMapped default true? Actually `Material` has `toneMapped = true` default. Good. But tone mapping in shader chunks is only applied if `#include <tonemapping_fragment>` in shader? For ShaderMaterial, renderer doesn't automatically tonemap; the shader must include tonemapping. Hmm important: Built-in materials include tonemapping chunks; custom ShaderMaterial needs `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` to apply renderer tone mapping and sRGB conversion. Yes! In Three, ShaderMaterial output is raw; renderer appends? Actually since r152, WebGLProgram adds tonemapping and colorspace functions but doesn't call them automatically; built-in shaders include chunks. Custom ShaderMaterial must include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at end of fragment (using gl_FragColor). Many examples do this.

So for sky and ocean fragment shaders, after computing gl_FragColor, include:
```
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
```
Order matters: fog should be applied in linear? In built-in mesh materials, fog_fragment is included after tonemapping? Let's check standard material fragment order: 
```
#include <output_fragment> // gl_FragColor = ...
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
#include <premultiplied_alpha_fragment>
#include <dithering_fragment>
```
Yes fog after colorspace. So use same order: gl_FragColor set, tonemapping, colorspace, fog, then maybe dithering. Good.

For tone mapping to work, define `TONE_MAPPING`? The chunk `tonemapping_fragment` is:
```
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
TONE_MAPPING define is added by WebGLProgram based on renderer.toneMapping !== NoToneMapping for materials with toneMapped true. So include chunk works if toneMapped true. Good.

`colorspace_fragment` chunk handles outputColorSpace. Good.

Ocean ShaderMaterial toneMapped true default? I think ShaderMaterial default `toneMapped = true` from Material. But maybe ShaderMaterial has `fog = false` default and `lights=false`. ToneMapped default true. Fine.

For ocean, include `<tonemapping_fragment> <colorspace_fragment> <fog_fragment>`. But fog uniform colors are in linear? Fog color provided as Color; Three's fog color handling with color management: scene.fog.color set via Color(0xa8cfe8) is converted to linear working color space automatically? THREE.Color management: when setting with hex, with ColorManagement enabled, `new THREE.Color(0xa8cfe8)` converts sRGB hex to linear working. And fogColor uniform gets set with getRGB into working color space? `fog.color.getRGB(uniforms.fogColor.value, getUnlitUniformColorSpace(renderer))` - it writes in linear if output color space? Whatever, built-in fog works consistently. Our shader applies fog after colorspace chunk, matching built-in order, so it's consistent.

But gl_FragColor used by fog chunk; fine.

Need to include `#include <fog_pars_fragment>` and `<fog_pars_vertex>`, `<fog_vertex>`. Set `fog: true` and uniforms via UniformsLib.fog.

Now sky dome shouldn't be fogged: fog false.

Sun disc: visible in sky; ensure not occluded.

Lighting: DirectionalLight intensity with ACES exposure 0.5. Three r155+ lighting units changed (useLegacyLights removed). Directional intensity ~3 gives bright. Hemisphere 1.0 maybe. MeshStandardMaterial colors sRGB.

Set renderer.toneMappingExposure = 0.6.

Let's choose directional light intensity 3.0, hemisphere intensity 0.8, ambient 0.15.

Shadows: renderer.shadowMap.enabled = true; type PCFSoftShadowMap. DirectionalLight shadow.mapSize 2048, camera left/right/top/bottom ±45, near 1, far 250, bias -0.0005, normalBias 0.05.

Ocean plane 400x400 may extend beyond shadow camera; fine.

Now boat geometry details.

Hull: use BoxGeometry(1.8, 0.9, 4.4, 10, 4, 12) and modify positions:
- Narrow at bow/stern based on z: factor = 1 - 0.75 * (z/2.2)^2? At ends factor 0.25, middle 1.
- Round bottom: y' = y*? 
Let's define original box coordinates with y from -0.45..0.45 and z -2.2..2.2. We want hull hull shape: top width wider, bottom narrower; ends pointed. Use:
```
const nx = px * (0.35 + 0.65 * Math.cos(Math.PI * pz / 4.4 / 2))? 
```
Simpler: taper factor from z: t = 1 - 0.8*Math.pow(Math.abs(pz)/2.2, 1.6). Multiply x by t.
Also taper bottom: x *= (0.55 + 0.45 * (py/0.45 + 1)/2) i.e. narrower at bottom. And round bottom by raising bottom at ends? Keep box-like but tapered ends.
Better hull silhouette: cross-section V: at bottom py=-0.45, x scale 0.2; at top py=0.45, x scale 1.0. Also y bottom curve: py += 0.25 * (1 - cos?) Hmm.

Let's do:
```
x = px * (0.25 + 0.75 * (py + 0.45)/0.9) * taper(z)
z stays, y stays
```
Plus at very ends, z maybe stretch? No.
This gives pointed bow visually (taper at ends). With 10x4x12 segments, smooth-ish. Compute normals after. Material: white/cream hull with roughness 0.5. Add a colored stripe? Could use a second thin box as gunwale. Keep.

Deck: BoxGeometry(1.5, 0.12, 3.4) at y=0.44, wood color.
Cabin: BoxGeometry(1.1, 0.7, 1.2) at (0, 0.85, -0.3) white/cream; maybe windows as dark box strips (one more mesh). Add cabin window: BoxGeometry(1.12,0.22,1.0) at y=0.95 dark.
Mast: CylinderGeometry(0.05,0.06,3.2) at (0, 2.1, 0.6) brown.
Boom: CylinderGeometry(0.04,0.04,1.6) rotated Z 90 at y=2.4? optional.
Sail: triangular BufferGeometry. Let's create with vertices:
base at mast near y=1.2, top at y=3.2, clew out to side. It's planar in XY plane? Mast at z=0.6, sail extends in z direction? For a boat with long axis z, sail plane should be YZ plane (vertical along mast, extending backward in -z). Use vertices in local boat coords:
p0 = (0, 1.3, 0.55) (near mast bottom)
p1 = (0, 3.2, 0.55) (top)
p2 = (0, 1.35, -1.0) (boom end) 
Triangle in YZ plane, x=0. DoubleSide, white. Add slight bulge by using PlaneGeometry-like subdivided triangle? Could just use a BufferGeometry with 3 vertices; flat sail looks okay but a bit stiff. Let's create a curved sail using parametric grid: for i in 0..segments, interpolate edges? More work. Simpler: create a ShapeGeometry from a triangle shape with slight curve? flat.

We can make a quadrilateral sail: points along mast and leech. Use BufferGeometry with 4 vertices and 2 triangles, with a bulge in x: vertices:
A (0, 1.2, 0.6), B (0, 3.2, 0.6), C (0, 1.5, -1.1), D? Actually a triangle sail is fine.

Make sail a custom triangle with a bulged middle: create 3x3 grid? Let's do a simple subdivided triangle:
Use PlaneGeometry? Better: create geometry via `new THREE.BufferGeometry()` with positions:
for row 0..N: interpolate from A to B? Hmm.

Let's implement a "sail" as a curved surface defined by parameters u (0..1 along mast, from bottom to top) and v (0..1 from mast to leech). Position = lerp(A,B,u) + v * (tailPoint - lerp(A,B,u)), plus bulge in x = sin(pi*u)*sin(pi*v)*0.25. Build grid N=8x8 with indices. This gives a nice curved sail. Let's do it — code not too long.

Actually easier: Use `THREE.PlaneGeometry(2.2, 2.2, 8, 8)` then modify vertices into triangle shape and bulge; but a triangle shape requires cutting. Let's do custom grid with bilinear interpolation of triangle; at u=1 the mast-to-leech span collapses to top point, giving triangle. Good.

Define bottom point A=(0,1.2,0.6) (mast base), top B=(0,3.3,0.55), leech bottom C=(0,1.5,-1.2). For u in [0,1], mast point M = lerp(A,B,u) (vertical along mast); at u=1 M=B, so row collapses. tail point T at u = lerp(C,B,u)?? The leech edge from C to B. So point = lerp(M,T,v) where T = lerp(C,B,u). Then bulge x = sin(pi*v)*sin(pi*u*0.8)*0.28 maybe. That gives triangle sail with curved surface. Build grid rows 10, cols 6.

Normals compute.

Sail material MeshStandardMaterial({color:0xf6f2e8, side:DoubleSide, roughness:0.7}).

Add a small flag at top: triangle plane red.

Hull/deck/cabin/mast/sail castShadow = true. Set group traverse castShadow.

Now boat bob: compute y = heightAt(x,z,t) + 0.35? Hull bottom at y=-0.45 relative group, so group y = water height + 0.35 to float hull with bottom ~ -0.45 => hull bottom at water -0.1? Actually group y = h + 0.35 means hull bottom = h + 0.35 - 0.45 = h - 0.1, slightly submerged. Good. Cabin etc above.

Actually boat hull local y center 0; bottom -0.45; deck y .44. Waterline at local y -0.1 visually. Good.

Smoothing: use group.position.y = h + 0.35 exactly per frame (required "y = heightAt plus constant offset"). Must match exactly, so no smoothing on y. Rotations can smooth but requirement pitch/roll follow slope; exact sampling is fine. Use direct values maybe with small smoothing is okay but they may check? They can't easily check rotations. Keep direct.

But the boat has yaw changing; pitch/roll computed from slope in boat's local axes. Fine.

Position drift: x = 12 + sin(t*0.1)*1.5, z = 14 + cos(t*0.08)*1.2; stays within 25. Good.

Boat group exposed.

Need to ensure boat's meshes cast shadows: set castShadow true on each.

Island receives shadows: mesh.receiveShadow = true. Also castShadow true (island shadow on itself / boat).

Palm trunks cast shadows, receive shadows.

Now leaf instancing.

Leaf geometry:
```
function createLeafGeometry(): THREE.BufferGeometry {
  const seg = 6; const verts: number[] = []; const idx: number[] = [];
  for (let i=0;i<=seg;i++){
    const t = i/seg;
    const y = t*2.2;
    const width = 0.34 * Math.sin(Math.PI * Math.pow(t,0.8))? 
    const z = -0.55 * t*t; // droop
    verts.push(-width/2, y, z, width/2, y, z); // two sides? 
  }
}
```
Hmm leaf should look like a frond: width widest near base-middle, taper tip. Use width = 0.45 * Math.sin(Math.PI * t) (0 at base and tip) but base should have some width; use (0.12 + 0.5*Math.sin(Math.PI*t)) * (1-t*0.4)? Let's use width = 0.5 * Math.sin(Math.PI * Math.pow(t, 0.6)) * ... at t=0 => 0. Actually sin(pi*0)=0, leaf pointed at base too, fine. Better: width = 0.45 * Math.sin(Math.PI * t) + 0.04. Width from 0.04 at base to max 0.49 at middle, zero-ish tip.

But a simple flat strip looks like a blade. To make it more palm-like, add serration? Could create leaf as a series of triangles (feather shape). Alternatively use two strips angled like a V to give 3D. Keep simple blade with slight droop and a fold: vertices at (-w, y, z + w*0.4) and (w, y, z - w*0.4) maybe creating a V cross-section. Nice.

Actually create leaf as a V-shaped blade:
for each t, left vertex (-w, y, z - 0.2*w?), center vertex (0, y, z), right vertex (w, y, z). Indices connecting left-center and center-right => two strips forming a folded leaf. That's 3 vertices per row. Normal compute.

Droop: z = -0.6 * t*t * length? In local coords +Y is outward direction. After rotation, +Y points outward horizontally; droop should be downward (local -Z or something). Let's think: geometry local +Y along leaf length. After tilt rotation about X by ~65°, local +Y maps to roughly +Z (outward), local +Z maps to? R_x(65): local +Z -> (0, -sin65, cos65) = (0,-0.9,0.42) downward-ish and outward. So if we droop by negative local Z (z = -k*t^2), after rotation it goes to +Y? Wait local -Z maps to (0, +0.9, -0.42) upward. Hmm, need droop downward. local +Z maps to downward (y negative), so set z = +0.6*t^2 for droop downward. Let's verify: R_x(θ) applied: point (0, y, z). y' = y cosθ - z sinθ; z' = y sinθ + z cosθ. With θ=65°, local +Y (0,1,0) -> (0, 0.42, 0.91) outward and slightly up. local +Z (0,0,1) -> (0, -0.91, 0.42) downward. So adding +z as t increases bends tip downward. Good. So droop z = 0.5 * t^2 (positive), plus width fold maybe vertices offset ±w in X (sideways) with small z variation.

So leaf geometry vertices per row: left (-w, y, z), center (0,y,z), right (w,y,z). Indices: for each segment, triangles left-center rows and center-right rows. Compute normals. Material DoubleSide green with roughness 0.8, color 0x2e7d32 maybe; vertex colors? Keep solid, maybe two colors by using vertex colors gradient: darker at base, yellowish tips? Could use vertexColors with green gradient. Let's add subtle vertex colors: color based on t: mix dark green to brighter green. InstancedMesh material with vertexColors true. Nice.

Leaf length ~2.4, width ~0.5. Palm height ~5-7; crown leaves ~2.5 long, looks good.

Each palm: trunk curve. Base at island height; top at base + (leanX, height, leanZ). Height 4.5-6.5. Curve points:
p0 = base
p1 = base + (lean*0.15, height*0.35, ...)
p2 = base + (lean*0.5, height*0.7, ...)
p3 = top
lean 0.8-1.5. Tube radius taper? TubeGeometry has constant radius. Use radius 0.18. Could add a slight taper by scaling? Use TubeGeometry with radius 0.16. Fine.

Coconuts: 3 small spheres at top around crown. Use SphereGeometry(0.14, 8, 6) repeated? Each palm 3 => 21 meshes. Fine but could be one InstancedMesh (not required). Simplicity: add a single small sphere per palm maybe. Not necessary. Add a "crown base" sphere.

Palm positions: choose 7 positions:
angles: 0, 0.9, 1.9, 2.9, 3.9, 4.9, 5.6 rad; radius 4, 7, 9, 6, 11, 5, 12. Compute x = cos(a)*r, z = sin(a)*r. Check islandHeight > 1. If low, move inward. We'll precompute with function and adjust? Just choose radii ≤ 10 to ensure above water. At r=10, height = 13*exp(-(100)/121)=13*0.439=5.71-1.5=4.2 plus noise. Good. Palms at r up to 11 => 3.6. Good. Use 7 palms.

Trunk base y = islandHeight(x,z) - 0.15 (slightly buried). Height 5-7.

Crown top position = base + curve end.

Leaf instances: for each palm, 9 leaves; base crown position = top + small offset. For each leaf k: angle = k/9 * 2π + offset; tilt = 1.0 rad (about 57°) plus variation; scale = 0.9-1.2.

But leaf geometry extends along +Y and droops. Place base at crown. Matrix = compose(position, quaternion, scale). Quaternion = qY(angle) * qX(-tilt?) Wait earlier rotation about X by θ maps +Y to outward +Z with slight up. We need tilt θ ~ 60-70° to make leaves mostly horizontal. But we may want some leaves more upright: θ between 0.9 and 1.3 rad. With θ=1.1 rad (63°), +Y maps to (0,0.45,0.89) => outward and slightly up. Good.

But `qY * qX` order: qX rotates +Y toward +Z; then qY rotates around Y distributing. So quaternion = new Quaternion().setFromAxisAngle(Y, angle).multiply(new Quaternion().setFromAxisAngle(X, tilt)). Yes.

Sway: tilt varies per instance: tilt = baseTilt + Math.sin(t*1.7 + phase) * 0.12. Also angle += sin(t*1.1+phase)*0.06. Scale varies maybe 1 + 0.03 sin.

Store leaf data arrays:
```
interface LeafData { base: THREE.Vector3; angle: number; tilt: number; phase: number; scale: number; }
const leafData: LeafData[] = [];
```

Create InstancedMesh(leafGeom, leafMat, leafData.length). Set castShadow true, receiveShadow true, frustumCulled maybe true but bounding sphere issue; set instanceMatrix usage dynamic? `mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

Update function each frame:
```
const dummy = new THREE.Object3D();
for each: 
 dummy.position.copy(base);
 dummy.quaternion.setFromAxisAngle(Y, angle + ...);
 dummy.quaternion.multiply(qx.setFromAxisAngle(X, tilt + ...));
 dummy.scale.setScalar(scale);
 dummy.updateMatrix();
 mesh.setMatrixAt(i, dummy.matrix);
mesh.instanceMatrix.needsUpdate = true;
```
Creating quaternions each frame is okay but allocate; use preallocated `const qY = new THREE.Quaternion(); const qX = new THREE.Quaternion(); const axisY = new THREE.Vector3(0,1,0); axisX`. Reuse.

Alternatively use dummy.rotation.set(tilt, angle, 0, 'YXZ')? Euler order 'YXZ' would apply? Object3D rotation Euler XYZ default; set rotation.order = 'YXZ' once. Then dummy.rotation.set(tiltX, angleY, 0) with order YXZ gives qY * qX. Actually Euler order 'YXZ' means rotation matrix R = R_y * R_x * R_z. So yes. Use dummy.rotation.order = 'YXZ'; dummy.rotation.set(tilt, angle, 0). Simpler.

Note that the tilt around X, then Y. Good.

Need to set instance matrices initially and each frame.

Also expose window.__leaves = leaves.

Potential issue: InstancedMesh shadow with DoubleSide material and thin geometry; fine.

Now island colors: vertex colors.

After computing heights and normals, loop vertices:
```
const y = pos.getY(i);
const ny = normal.getY(i);
const steep = 1 - ny; // 0 flat, 1 vertical
let color = new THREE.Color();
if (y < 0.25) color.setRGB(0.76,0.68,0.50); // wet sand (sRGB?) 
...
```
Colors: when creating vertex colors, Three expects linear color values (ColorManagement converts Color.setHex sRGB -> linear). Use `new THREE.Color(0xd9c08a)` etc and lerp. Use color.setHex for sRGB and then write r,g,b (which are linear). Good.

Define sandColor = new THREE.Color(0xdcc99a); wetSand = 0xb89f74; grass = 0x4f8a3a; darkGrass = 0x2f6b2c; rock = 0x6d6555.

For each vertex:
```
if (y < 0.4) col.copy(wetSand)
else if (y < 1.8) col.copy(sand)
else if (y < 4.5) col.copy(grass)
else col.copy(darkGrass) ... 
if (steep > 0.45) col.lerp(rock, smoothstep)
also high altitude rock above 7.
```
Use lerp.

Add noise color variation based on noise function: col.multiplyScalar(0.9 + 0.2*noise).

Set geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3)).

Material MeshStandardMaterial({vertexColors:true, roughness:0.95, metalness:0.0}).

Terrain should slope into sea; below water vertices hidden. Fine.

But island mesh edges at ±28 where height -1.5 underwater; ocean plane covers it. Since water opaque, no issue.

Need island to receive shadows: receiveShadow true, castShadow true.

Now atmosphere: maybe add a few billboard clouds? Not required. Could add clouds as sprites? No textures. Could add a few flattened spheres high in sky, white, unlit? Might look game-like. But risk. Maybe skip or add simple cloud groups with MeshStandardMaterial white at high altitude; distant, low detail. Optional. Keep code manageable.

Add ambient particles? Not necessary.

Also add sea floor? Not needed.

Let's handle camera OrbitControls? Requirement camera exactly at (35,12,35) looking at (0,2,0); OrbitControls allowed if start there and don't move by themselves. We can add OrbitControls with target (0,2,0), enableDamping false. But controls could move camera by user; tests likely check camera position at init. Adding controls risks camera position modified? No, we set camera then controls target. But it's optional; skip controls for simplicity, keep static camera. The requirement says keep this view. Static satisfies.

Now animation loop:
```
const clock = new THREE.Clock();
let waveTime = 0;
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt;
  uniforms.uTime.value = waveTime;
  ...
  updateBoat(waveTime, dt);
  updateLeaves(waveTime);
  renderer.render(scene, camera);
  if (firstFrame) { (window as any).__ready = true; firstFrame = false; }
});
```
Set waveTime as number. `time()` returns waveTime.

Set __ocean = { heightAt, time: () => waveTime }. Expose after creation. heightAt uses same waves array.

Need heightAt exactly matching shader. Shader uses wave direction and k from uWaves, omega from uOmega. JS uses waves array with dx,dz,k,amp,omega. Ensure directions normalized in JS and sent as uniforms.

Wave definitions:
```
const WAVE_DEFS = [
 { dir: new THREE.Vector2(0.86, 0.51).normalize(), length: 42, amp: 0.46, speed: 5.6 },
 ...
];
```
Compute k = 2π/length, omega = k*speed.
Wait phase = k*dot(dir,p) - omega*t. Wave speed c = omega/k. So omega = k*c. Good.

For a realistic ocean, wavelengths maybe 50, 27, 14, 7.5.

Amp: 0.45, 0.32, 0.20, 0.10 total 1.07.

Speeds: 6.0, 4.8, 3.6, 2.8 (units/s) — wave period = 2π/omega: 2π/(k*c). For L=42, k=0.1496, omega=0.898 => period 7 s. Good.

Shader uniform arrays: 
```
uWaves: { value: waves.map(w => new THREE.Vector4(w.dx, w.dz, w.k, w.amp)) },
uOmega: { value: waves.map(w => w.omega) },
uMaxAmp: { value: totalAmp }
```
UniformsUtils.merge clones Vector4s and arrays? merge clones values via `cloneUniforms`, which clones Vector4 etc. Fine. But we need reference for uTime update: `uniforms.uTime.value`. Good.

GLSL array indexing with loop constant works. In fragment too.

One concern: Uniform arrays of vec4 in ShaderMaterial: value should be array of Vector4, length 4. Three uploads via uniform4fv. Good. Float array similar.

Sky shader uses uSunDir uniform.

Now check TypeScript strict for Sky custom shader: fine.

Need `document.body.appendChild(renderer.domElement)`. Style canvas display block, margin 0. Add `document.body.style.margin='0'; overflow hidden`.

Set renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)).

Set renderer.outputColorSpace = THREE.SRGBColorSpace; toneMapping = ACESFilmicToneMapping.

Color management default enabled.

Shadow map: renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap.

Scene background? Sky dome covers, but set scene.background = new THREE.Color(0x8fb8d8) maybe fallback. With sky dome, fine. Fog color should match horizon.

Now write helper functions.

Noise for island and maybe foam: implement a small deterministic 2D value noise.

```
function fract(x:number):number { return x - Math.floor(x); }
function hash(x:number,y:number):number { return fract(Math.sin(x*127.1+y*311.7)*43758.5453123); }
function valueNoise(x:number,y:number):number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash(xi,yi), b = hash(xi+1,yi), c = hash(xi,yi+1), d = hash(xi+1,yi+1);
  return (a*(1-u)+b*u)*(1-v) + (c*(1-u)+d*u)*v;
}
function fbm(x,y):number {
  let f=0, amp=0.5, freq=1;
  for (let i=0;i<4;i++){ f += amp*valueNoise(x*freq, y*freq); amp*=0.5; freq*=2.03; }
  return f;
}
```

islandHeight:
```
function islandHeight(x:number,z:number):number {
  const r = Math.hypot(x,z);
  const base = 13 * Math.exp(-(r*r)/(11*11)) - 1.5;
  const ridge = (fbm(x*0.11+10, z*0.11+10) - 0.5) * 3.0 * Math.max(0, 1 - r/18);
  const detail = Math.sin(x*0.9)*Math.cos(z*0.8)*0.08 * Math.max(0,1-r/14);
  return base + ridge + detail;
}
```
At r=0: 13-1.5 + ridge ±1.5 => 10-13. Peak within 5-15 maybe 13. Fine. Actually ridge at center multiplied 1 => base 11.5 ±1.5 => up to 13. Good.

Waterline at ~16.2 ± noise; irregular.

Boat at 18.4 gets islandHeight ~ -0.7 + ridge 0? ridge clamped to 0 beyond 18, so -0.71. Good. Ocean wave amplitude 1 means water at -0.71 depth; boat floats fine.

Palm height placement using islandHeight; all above water for r≤11.

Island geometry: PlaneGeometry(64,64,96,96) => 9409 vertices, fine. rotateX(-PI/2). Set y per vertex. At r > ~25 base ≈ -1.5, ridge 0 => -1.5. fine.

Wait plane extends 32 units half; island dome radius 16 above water; underwater slope to 32. Good. "30-50 units across" ~32 above water, 64 base; okay.

Could make plane 72 for more base, but 64 fine.

Sea floor visible? no.

Potential issue: island mesh at y negative under water plane; water opaque, so hidden except shore where water is shallow color but opaque; island pokes through where y>0. Fine.

Now palm leaf instancing and trunk.

Trunk curve uses CatmullRomCurve3 and TubeGeometry. TubeGeometry(radius 0.17). Height maybe 6. Add trunk material brown 0x6b4a2f roughness 1. Also cast shadows.

At top add a small sphere crown base (0.35 radius) green? Maybe not needed; leaves cover.

Coconuts: maybe 3 spheres per palm at top; adds detail. Use one SphereGeometry shared, material brown. Cast shadow. Each palm 3 coconuts around top. That's 21 meshes, fine. Could clutter; add 2 per palm.

Now boat shadow etc.

Let's make sure meshes cast shadows: traverse boat group set castShadow true.

Add a subtle wake? Not required.

Add a small flag? optional.

Now write shaders carefully.

Ocean vertex shader with fog:
```
uniform float uTime;
uniform vec4 uWaves[4];
uniform float uOmega[4];
varying vec3 vWorldPos;
varying float vHeight;

void main() {
  vec3 p = position;
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float phase = w.z * dot(w.xy, p.xz) - uOmega[i] * uTime;
    h += w.w * sin(phase);
  }
  p.y += h;
  vHeight = h;
  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  vWorldPos = worldPosition.xyz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
```
`#include <fog_vertex>` uses `mvPosition` variable and sets `vFogDepth = - mvPosition.z;`. Good. But we already computed mvPosition. The chunk may redeclare? Let's check fog_vertex chunk:
```
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif
```
No redeclare. fine.

Need `#include <fog_pars_vertex>` at top (outside main) declares varying float vFogDepth; under USE_FOG.

USE_FOG define is set if material.fog and scene.fog. Good.

Ocean fragment:
```
precision highp float; // Three adds precision automatically? ShaderMaterial prepends precision. Don't add.
uniform float uTime;
uniform vec4 uWaves[4];
uniform float uOmega[4];
uniform vec3 uSunDir;
uniform float uMaxAmp;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
varying vec3 vWorldPos;
varying float vHeight;
#include <fog_pars_fragment>

void main() {
  vec2 p = vWorldPos.xz;
  vec2 grad = vec2(0.0);
  for (int i=0;i<4;i++){
    vec4 w = uWaves[i];
    float phase = w.z*dot(w.xy,p) - uOmega[i]*uTime;
    grad += w.w * w.z * w.xy * cos(phase);
  }
  vec3 normal = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  float ndv = clamp(dot(normal, viewDir), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-viewDir, normal);
  float skyT = pow(clamp(R.y, 0.0, 1.0), 0.45);
  vec3 skyRefl = mix(vec3(0.62, 0.78, 0.90), vec3(0.12, 0.30, 0.62), skyT);

  float r = length(vWorldPos.xz);
  float shallowFactor = 1.0 - smoothstep(16.0, 40.0, r);

  vec3 waterCol = mix(uDeepColor, uShallowColor, shallowFactor);
  // subsurface scattering on crests
  float crestH = clamp(vHeight / uMaxAmp, 0.0, 1.0);
  waterCol += vec3(0.02, 0.14, 0.12) * crestH;

  vec3 col = mix(waterCol, skyRefl, fres);

  float sunDot = max(dot(R, uSunDir), 0.0);
  col += vec3(1.0, 0.92, 0.75) * pow(sunDot, 420.0) * 6.0;
  col += vec3(1.0, 0.85, 0.6) * pow(sunDot, 48.0) * 0.18;

  float noise1 = 0.5 + 0.5 * sin(p.x * 2.3 + p.y * 1.7 + uTime * 2.1);
  float noise2 = 0.5 + 0.5 * sin(p.x * 5.1 - p.y * 4.3 - uTime * 3.3);
  float foamNoise = noise1 * noise2;

  float crestFoam = smoothstep(0.72, 0.98, crestH) * smoothstep(0.25, 0.8, foamNoise);
  float shoreFoam = (1.0 - smoothstep(15.0, 20.0, r)) * smoothstep(0.35, 0.85, foamNoise + 0.2);
  float foam = clamp(crestFoam + shoreFoam * 1.2, 0.0, 1.0);
  col = mix(col, vec3(0.82, 0.90, 0.94), foam * 0.85);

  // horizon tint
  float horizon = smoothstep(120.0, 300.0, distance(cameraPosition, vWorldPos));
  col = mix(col, vec3(0.58, 0.72, 0.82), horizon * 0.35);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
```

Wait: foam shore at r<15 could cover island area; water plane under island hidden by island. Fine. But island waterline ~16, so shore foam around 15-20 visible. Good.

Potential issue `uMaxAmp` if crestH uses vHeight/uMaxAmp; vHeight can be negative; fine.

Ocean colors uDeepColor maybe (0.008,0.05,0.11) in linear? Colors set via THREE.Color will be linear if using setHex? We'll pass new THREE.Color(0x0a2a44) (linear conversion) so value in linear. Shader output linear. Good. shallow 0x1f9e9a maybe. These colors in linear become darker. Fine.

Fresnel skyRefl colors are given directly as linear values in shader; okay.

Sun specular with tone mapping might bloom white.

Now sky shader:
```
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 zenith = vec3(0.06, 0.20, 0.48);
  vec3 horizon = vec3(0.72, 0.83, 0.90);
  vec3 sky = mix(horizon, zenith, pow(h, 0.42));
  float sun = max(dot(dir, uSunDir), 0.0);
  sky += vec3(1.0, 0.72, 0.40) * pow(sun, 1200.0) * 60.0;
  sky += vec3(1.0, 0.62, 0.30) * pow(sun, 80.0) * 0.6;
  sky += vec3(1.0, 0.85, 0.65) * pow(sun, 6.0) * 0.10;
  // below horizon
  sky = mix(vec3(0.55, 0.70, 0.80), sky, smoothstep(-0.08, 0.06, dir.y));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Need `vDir` maybe normalized in vertex to avoid precision; okay.

Sphere radius 800, camera far 2000; sphere at origin, camera inside.

Set material.depthWrite=false, depthTest maybe true, side BackSide, fog false. Render order -1000? Actually depthWrite false means it doesn't occlude; but if rendered after ocean, ocean drawn would overwrite? Depth test: sky sphere at far depth 800, ocean at closer depth, so sky pixels behind ocean fail depth test (ocean already drawn). Fine. If sky drawn first, ocean overwrites due depth test. Set renderOrder = -1 to draw first maybe. Fine.

Set skyMesh.frustumCulled = false maybe not needed.

Now directional light position: sunDir * 120. Shadow camera near 1, far 400, left -55 right 55 top 55 bottom -55. Since light at distance 120 and target origin, shadow camera positioned at light; ortho covers origin ±55 in light space. Good.

But shadows of island with 55 extent cover island (radius 32) and boat at 18. Good.

Sun light target at (0,0,0). Add to scene.

HemisphereLight sky 0xbfe3ff, ground 0x3b6b4a, intensity 0.8.

AmbientLight 0xffffff 0.12.

Also maybe a fill directional from opposite, no shadows, intensity 0.3 to soften. Good.

Renderer exposure 0.62.

Palm leaves material maybe `MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.65, metalness: 0.0 })`. With vertex colors green. Ensure colors are linear sRGB converted.

Leaf geometry vertex colors: 
```
const c1 = new THREE.Color(0x1e5f2a); const c2 = new THREE.Color(0x69b34c);
color = c1.clone().lerp(c2, t)
```
Write per vertex.

InstancedMesh with geometry vertex colors works.

Trunk material color 0x7a5a3a.

Boat hull material MeshStandardMaterial({color:0xf2efe6, roughness:0.55, metalness:0.05}). Add a blue stripe? Could add a thin box with blue color along the hull side; or not.

We can also add a rudder/tiller small box.

Boat group positions: group.position = (12 + drift, y, 14 + drift). But hull bottom at -0.45 relative; group y = height + 0.35.

Group rotation order YXZ. yaw = 0.4 + sin(t*0.05)*0.15 maybe. But hull long axis z; yaw rotates. Fine. Need to keep within 25: drift radius 1.5.

Boat pitch/roll sampling:
```
const t = waveTime;
const yaw = 0.35 + Math.sin(t*0.06)*0.18;
const x = 12 + Math.sin(t*0.09)*1.4;
const z = 14 + Math.cos(t*0.07)*1.2;
const fx = Math.sin(yaw), fz = Math.cos(yaw);
const rx = Math.cos(yaw), rz = -Math.sin(yaw);
const hC = heightAt(x,z,t);
const hF = heightAt(x + fx*2.0, z + fz*2.0, t);
const hB = heightAt(x - fx*2.0, z - fz*2.0, t);
const hR = heightAt(x + rx*1.0, z + rz*1.0, t);
const hL = heightAt(x - rx*1.0, z - rz*1.0, t);
const pitchTarget = -Math.atan2(hF - hB, 4.0);
const rollTarget = Math.atan2(hR - hL, 2.0);
group.position.set(x, hC + 0.35, z);
group.rotation.set(pitchTarget, yaw, rollTarget) with order YXZ.
```
Wait rotation.x maps to pitch relative to local z after yaw; with order YXZ, the x rotation applied after y? Euler 'YXZ' rotation matrix = Ry * Rx * Rz, so x rotation is in boat-local after yaw. Good. pitch sign: positive rotation.x tilts local +Z downward. If front hF > hB, want nose up => negative rotation.x. We set group.rotation.x = -atan2(hF-hB, 4). Good. Roll: positive rotation.z raises +X side. If right side higher (hR > hL), rotation.z positive. Good.

Maybe scale pitch by 0.6 to avoid extreme; slopes with wavelength 42 and amplitude 0.46 -> slope = A*k ≈ 0.46*0.149 = 0.069 => angle ~4°, fine. Small waves sum slope maybe up to 0.3 => 17°, a bit much but okay. Multiply 0.8 for aesthetics? Requirement "follow the wave slope"; direct is fine. Use exact.

Height offset 0.32.

Boat cast shadows. Also maybe set boatGroup.name.

Window exposure: __boat = group.

Now island exposed; __island = islandMesh.

__sun = dirLight.

__leaves = leaves.

__ocean = { heightAt, time }.

__scene, __camera, __renderer.

__ready after first render.

Potential testing: they may check `(window as any).__ocean.heightAt` matches shader. Our heightAt uses same wave params; good. time() returns waveTime used in shader uniform. Note shader time begins at 0 first frame after dt; good.

One nuance: The vertex shader uses local position.xz; since geometry rotated, world xz = local xz. Good.

Now potential TS strict compile issues.

- `THREE.UniformsUtils.merge` returns object indexable. Assign to `const uniforms: { [key: string]: THREE.IUniform } = THREE.UniformsUtils.merge([...])`. Then uniforms.uTime.value = ... fine.
- `leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);` fine.
- `new THREE.InstancedMesh(geom, mat, count)`.
- `dummy.rotation.order = 'YXZ';` fine type EulerOrder.
- `renderer.setAnimationLoop((time: number) => {...})` callback type `XRAnimationLoopCallback` may take time and frame. Using arrow with no args is fine. We use clock so no args needed: `renderer.setAnimationLoop(animate)` where `function animate(): void`. setAnimationLoop expects `XRAnimationLoopCallback | null`, function with fewer params is assignable. Fine.
- `clock.getDelta()`.
- `window` typed as Window & typeof globalThis; casting `(window as any)` fine.
- DOM: `document.body.appendChild(renderer.domElement)`.

- Geometry attributes: `const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;`; use setY.
- `geometry.computeVertexNormals();`

- Creating colors array: `const colors: number[] = []; colors.push(c.r, c.g, c.b);` fine.

- `new THREE.Float32BufferAttribute(colors, 3)`.

- For sail geometry, build positions/indices arrays typed number[].

- For leaf geometry same.

- Value noise returns number.

- `Math.hypot`.

- `THREE.Color` lerp: `const c = sand.clone().lerp(grass, t);` fine.

Check strict "noUnusedLocals"? `tsc --strict` doesn't include noUnusedLocals by default. Fine. But avoid unused variables anyway.

Let's write all code.

Potential problem with `#include <fog_vertex>` inside main after gl_Position: The chunk uses `mvPosition` which we defined. Good. But fog_pars_vertex must be included. In three's ShaderChunk, `fog_pars_vertex`:
```
#ifdef USE_FOG
	varying float vFogDepth;
#endif
```
fine.

`fog_pars_fragment` declares uniforms and varying. Good.

ShaderMaterial with fog: true. uniforms merged with UniformsLib.fog. Need `THREE.UniformsLib.fog` existence yes.

The renderer refreshFogUniforms for ShaderMaterial: does it happen only when material.fog true? yes.

Sky ShaderMaterial fog false (default? ShaderMaterial fog default false actually; but set explicitly).

For ocean, set `fog: true`.

One more: ShaderMaterial default `lights: false` so no lighting chunks; fine.

Tone mapping chunks: `tonemapping_fragment` uses `toneMapping` function defined by renderer when TONE_MAPPING; `colorspace_fragment` uses `linearToOutputTexel`. Includes are resolved. Good.

But `#include <colorspace_fragment>` might not exist in older versions? In r152+ it's `colorspace_fragment` (previously encodings_fragment). Environment likely current (three/addons path implies r150+). Use it.

Alternatively avoid tone mapping chunks for custom shaders by manually encoding? No, include is standard.

Now shadow acne on island: set shadow bias -0.0002, normalBias 0.06.

Light shadow camera: `dirLight.shadow.camera` is OrthographicCamera typed; set left etc.

DirectionalLight intensity 3.2. With ACES exposure 0.6.

Let's set renderer.toneMappingExposure = 0.65.

MeshStandard colors: island sand etc.

Sky dome color: With exposure 0.65, linear horizon 0.72 -> tonemapped to ~0.7 -> sRGB ~0.86, nice bright sky. Zenith 0.06,0.2,0.48 -> darker blue; after ACES, blue ~0.5. Fine. Sun disc 60 -> white bloom.

Fog color: use new THREE.Color(0x9fc4d8) sRGB -> linear ~ (0.35,0.55,0.68). Fog blends ocean to horizon. Scene fog near 90 far 350? Ocean extends 200 in each direction; camera at 50 from origin; far corners ~ 280. Fog far 400 to keep some visible; "blends far ocean into the horizon" use near 60 far 320. Maybe too much fog near; boat at 20 units from camera, island 50; near 80 means no fog on island. Good. Fog(0xa9c9dd, 70, 340). The sky at horizon is bright light blue; fog color a9c9dd matches.

But fog is applied after tonemapping/colorspace chunk; fogColor uniform is in working (linear) but fog_fragment does `gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );` after colorspace conversion — mixing linear fog color into sRGB-encoded color is what built-in materials do? Wait built-in order: tonemapping, colorspace, fog. So fogColor is written in output color space? `refreshFogUniforms` uses getUnlitUniformColorSpace(renderer) to convert fog color to output color space (sRGB) when outputColorSpace is sRGB. Ah they call `fog.color.getRGB(uniforms.fogColor.value, getUnlitUniformColorSpace(renderer))` so fogColor uniform is in output color space, matching post-colorspace application. Good. Our shader same order works.

Ocean at far distance will blend to fog color.

Now maybe add horizon fog also to ocean shader with manual? The fog chunk handles.

The sky dome isn't fogged, horizon color should roughly match fog. Set sky horizon linear (0.72,0.83,0.90) -> tonemapped+sRGB maybe (0.90,0.94,0.96); fog color 0xa9c9dd sRGB (0.66,0.79,0.87) darker. Mismatch visible? At horizon, ocean fog color vs sky horizon could differ slightly. Set fog color lighter, like 0xcfe3ee -> sRGB (0.81,0.89,0.93). After ACES tone mapping the sky horizon is bright ~0.93. Fog color 0xbcd6e6 maybe. Let's choose fog color 0xbcd6e8 (light blue-grey). Since fog applied after tone mapping in sRGB, it appears as given sRGB. Sky horizon after tone map maybe 0.93. Fog color 0xbed8e8 (0.745,0.847,0.91). Slight difference okay, adds haze.

Actually sky horizon in shader linear 0.72 -> with exposure 0.65 => 0.468; ACES -> ~0.58; sRGB encode -> ~0.78. Hmm not as bright. Sky may be darker than expected. Let's increase horizon to 1.1, zenith 0.12,0.3,0.65. With exposure 0.65: horizon 0.715 -> ACES ~0.7 -> sRGB ~0.86. Zenith 0.65*0.65=0.42 -> ACES ~0.55 -> sRGB ~0.76 blue. Sounds good. Sun adds.

Let's set horizon vec3(1.05, 1.15, 1.25) (slightly blue-white), zenith vec3(0.10, 0.30, 0.70). Sky looks bright.

Ocean skyRefl colors should match sky: horizon ~ (0.9,0.95,1.0) linear? The shader colors are pre-tonemap linear, so to match sky at horizon, use skyRefl horizon around (0.8,0.9,1.0). Fine.

Sun specular colors bright.

Exposure 0.62.

Directional light intensity 3.0 with ACES => bright. Hemisphere 0.9. Should be okay.

Let's also add a subtle directional fill 0.25 from opposite with bluish color to lift shadows.

Now write code in one file. Aim clean and compilable.

Detailed code:

```ts
import * as THREE from 'three';

// ---------- Utility noise ----------
function fract(x: number): number { return x - Math.floor(x); }
function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
}
function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x: number, y: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    sum += amp * valueNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
}
```

Wave setup:

```
interface WaveDef { dx:number; dz:number; k:number; amp:number; omega:number; }
const waveDefs: WaveDef[] = [
  { dirX: ...}
]
```
Use function makeWave(length, amp, speed, dirX, dirZ): WaveDef { normalize dir, k, omega }.

```
function makeWave(dirX:number, dirZ:number, length:number, amp:number, speed:number): WaveDef {
  const len = Math.hypot(dirX,dirZ);
  const dx = dirX/len, dz = dirZ/len;
  const k = (Math.PI*2)/length;
  return { dx, dz, k, amp, omega: k*speed };
}
```

waves:
```
const waves: WaveDef[] = [
 makeWave(0.86,0.51,46,0.46,6.2),
 makeWave(-0.42,0.91,27,0.32,4.6),
 makeWave(0.62,-0.78,14.5,0.20,3.4),
 makeWave(-0.93,-0.36,8.0,0.10,2.6),
];
const totalAmp = sum.
function oceanHeightAt(x,z,t) {
  let h=0;
  for (const w of waves) {
    const phase = w.k*(w.dx*x + w.dz*z) - w.omega*t;
    h += w.amp*Math.sin(phase);
  }
  return h;
}
```

Shader uniforms:
```
const waveUniform = waves.map(w => new THREE.Vector4(w.dx,w.dz,w.k,w.amp));
const omegaUniform = waves.map(w => w.omega);
```

But UniformsUtils.merge clones arrays? It will clone Vector4s? `cloneUniforms` handles arrays: if value is Array, clones each element if cloneable. Should be okay. But to be safe, after merge assign:
```
uniforms.uWaves.value = waveUniform;
uniforms.uOmega.value = omegaUniform;
```
No problem.

`uTime` set 0.

Ocean geometry:
```
const oceanGeo = new THREE.PlaneGeometry(400,400,256,256);
oceanGeo.rotateX(-Math.PI/2);
```
Note PlaneGeometry width 400 height 400, segments 256. 65k vertices. Good. Actually plane width 400 along x, height 400 along original y => after rotate along z. Good.

Ocean mesh position y 0.

Need large water at least 400x400 centered origin: yes.

Ocean mesh receiveShadow false (shader can't), castShadow false.

Ocean mesh frustumCulled = true maybe; fine.

Now ocean fragment uses `cameraPosition` built-in. Good.

Sky sphere: `new THREE.SphereGeometry(800, 48, 24)`. Camera far = 2000.

Scene fog: `new THREE.Fog(0xbed8e8, 70, 360)`.

Lighting.

Sun direction computed:
```
const sunElevation = THREE.MathUtils.degToRad(32);
const sunAzimuth = THREE.MathUtils.degToRad(212);
const sunDir = new THREE.Vector3(
  Math.cos(sunElevation)*Math.cos(sunAzimuth),
  Math.sin(sunElevation),
  Math.cos(sunElevation)*Math.sin(sunAzimuth)
).normalize();
```
Wait azimuth measured from +X toward +Z: cos(azimuth) for x, sin for z. 212° => cos=-0.848, sin=-0.530. Elevation 32 => cos=0.848. x=-0.719, z=-0.449, y=0.530. Good sun in front-left-up.

Directional light position = sunDir.multiplyScalar(120) => (-86,63.6,-53.9). target origin. Good.

Shadow camera ortho ±55, near 1, far 300. mapSize 2048. bias.

Sky uniform sunDir.

Ocean uniform sunDir.

Now sky dome rendered; camera inside.

Create island after lights? order irrelevant.

Island geometry code:

```
const islandGeo = new THREE.PlaneGeometry(66,66,110,110);
islandGeo.rotateX(-Math.PI/2);
const ipos = islandGeo.getAttribute('position') as THREE.BufferAttribute;
for (let i=0;i<ipos.count;i++){
 const x = ipos.getX(i), z = ipos.getZ(i);
 ipos.setY(i, islandHeight(x,z));
}
islandGeo.computeVertexNormals();
// colors
const normals = islandGeo.getAttribute('normal') as THREE.BufferAttribute;
const colors: number[] = [];
const sand = new THREE.Color(0xd9c18d);
...
for (...) {
 const x = ipos.getX(i), y = ipos.getY(i), z = ipos.getZ(i);
 const ny = normals.getY(i);
 const slope = 1 - Math.max(0, Math.min(1, ny));
 let c = new THREE.Color();
 if (y < 0.35) c.copy(wetSand);
 else if (y < 1.6) c.copy(sand);
 else if (y < 3.2) c.copy(sand).lerp(grass, smoothstep...)
 ...
}
```
Need smoothstep helper:
```
function smoothstep(edge0:number, edge1:number, x:number):number {
 const t = Math.min(1, Math.max(0, (x-edge0)/(edge1-edge0)));
 return t*t*(3-2*t);
}
```

Color logic:
```
let c = new THREE.Color();
if (y < 0.2) c.copy(wetSand);
else if (y < 1.7) c.copy(sand);
else if (y < 4.0) c.copy(grassLight).lerp(grassDark, smoothstep(1.7,4.0,y));
else c.copy(grassDark).lerp(rock, smoothstep(6.0, 9.5, y));
// steep rock
c.lerp(rock, smoothstep(0.25, 0.65, slope) * 0.8);
// noise variation
const n = fbm(x*0.3+40, z*0.3+40);
c.multiplyScalar(0.88 + 0.24*n);
```
Careful multiplyScalar >1 might clip? Color channels can >1; fine.

At high peak, rock gray-brown. Good.

Wet sand under water y<0; okay.

Add color attribute.

Material MeshStandardMaterial({vertexColors:true, roughness:0.95, metalness:0.0}). Maybe flatShading false. Compute normals.

Island mesh castShadow true, receiveShadow true.

Could add a second mesh for the beach ring? no.

Palms:

```
interface PalmSpec { angle:number; radius:number; height:number; lean:number; }
const palmSpecs = [...]
const palmGroup = new THREE.Group(); // maybe not needed
const leafData: LeafData[] = [];
const trunkMat = new THREE.MeshStandardMaterial({color:0x7a5a3a, roughness:0.95});
const nutMat = new THREE.MeshStandardMaterial({color:0x4c3320, roughness:0.9});
const nutGeo = new THREE.SphereGeometry(0.16, 10, 8);
for each spec:
  const px = Math.cos(angle)*radius; pz = ...
  const baseY = islandHeight(px,pz) - 0.1;
  const leanX = Math.cos(angle+0.7)*lean; leanZ = Math.sin(...)*lean;
  const top = new THREE.Vector3(px+leanX, baseY+height, pz+leanZ);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(px, baseY, pz),
    new THREE.Vector3(px+leanX*0.15, baseY+height*0.35, pz+leanZ*0.15),
    new THREE.Vector3(px+leanX*0.55, baseY+height*0.72, pz+leanZ*0.55),
    top
  ]);
  const tube = new THREE.TubeGeometry(curve, 16, 0.2, 8, false);
  const trunk = new THREE.Mesh(tube, trunkMat);
  trunk.castShadow = true; trunk.receiveShadow = true;
  scene.add(trunk);
  // crown sphere/nuts
  for 3 nuts:
    const nut = new THREE.Mesh(nutGeo, nutMat);
    nut.position.set(top.x + Math.cos(a)*0.25, top.y - 0.1, top.z + Math.sin(a)*0.25);
    nut.castShadow = true; scene.add(nut);
  // leaf data
  for (let l=0; l<9; l++) {
    leafData.push({
      base: top.clone().add(new THREE.Vector3(0,0.15,0)),
      angle: (l/9)*Math.PI*2 + angle,
      tilt: 0.95 + (l%3)*0.12,
      phase: l*1.7 + angle*3,
      scale: 0.9 + 0.15*Math.sin(l*2.1)
    });
  }
```
Wait leaf tilt 0.95 rad (54°) gives outward-upper; droop geometry bends down. Good. Maybe tilt 1.15 rad (66°) more horizontal. Use 0.95 + variation ±0.15.

Leaf base top.clone each time; 63 clones fine.

Leaf geometry scale: leaf length 2.4 * scale 0.9-1.05 => 2.2-2.5. Palm height 5-7. Good.

Trunk radius 0.2, maybe too thin; use 0.22.

Number of leaves: 7 palms * 9 = 63. Good.

Leaf geometry build:

```
function buildLeafGeometry(): THREE.BufferGeometry {
  const rows = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const dark = new THREE.Color(0x1f5c24);
  const light = new THREE.Color(0x76c04a);
  const tip = new THREE.Color(0xa8d96a);
  const tmp = new THREE.Color();
  for (let i=0;i<=rows;i++){
    const t = i/rows;
    const y = 2.4*t;
    const w = 0.06 + 0.42*Math.sin(Math.PI*Math.pow(t,0.75));
    const z = 0.55*t*t;
    // left, center, right
    positions.push(-w, y, z + 0.06*w, 0, y, z, w, y, z + 0.06*w);
    // colors
    tmp.copy(dark).lerp(light, Math.min(1,t*1.4));
    if (t > 0.8) tmp.lerp(tip, (t-0.8)/0.2);
    for (let k=0;k<3;k++) colors.push(tmp.r,tmp.g,tmp.b);
  }
  for (let i=0;i<rows;i++){
    const a = i*3, b=(i+1)*3;
    // left strip: a, a+1, b+1 ... 
    indices.push(a, a+1, b+1, a, b+1, b);
    indices.push(a+1, a+2, b+2, a+1, b+2, b+1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
```

Winding: For left strip (a=-w, a+1=0, b+1 = next center), normals maybe downward; DoubleSide anyway.

Leaf material: MeshStandardMaterial({vertexColors:true, side:DoubleSide, roughness:0.6, metalness:0.0}).

InstancedMesh: `const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafData.length); leaves.castShadow = true; leaves.receiveShadow = true; leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(leaves);`

Initial matrices need set before first render; call updateLeaves(0).

Update leaves function:
```
const dummy = new THREE.Object3D();
dummy.rotation.order = 'YXZ';
function updateLeaves(t: number): void {
  for (let i=0;i<leafData.length;i++){
    const d = leafData[i];
    const sway = Math.sin(t*1.8 + d.phase);
    const sway2 = Math.sin(t*2.6 + d.phase*1.7);
    dummy.position.copy(d.base);
    dummy.rotation.set(d.tilt + sway*0.13, d.angle + sway2*0.07, sway2*0.06);
    const s = d.scale * (1 + sway*0.03);
    dummy.scale.set(s,s,s);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
```
`dummy.rotation.set(x,y,z)` uses order YXZ set earlier (order persists). Good.

Now boat.

Build hull:
```
function createBoat(): THREE.Group {
  const group = new THREE.Group();
  const hullGeo = new THREE.BoxGeometry(1.8, 0.9, 4.2, 12, 4, 16);
  const hp = hullGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i=0;i<hp.count;i++){
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const taper = 1 - 0.82*Math.pow(Math.min(1, Math.abs(z)/2.1), 1.7);
    const vTaper = 0.28 + 0.72*(y + 0.45)/0.9;
    hp.setX(i, x*taper*vTaper);
    // lift bottom at the ends? modify y slightly:
    const lift = 0.25 * Math.pow(Math.abs(z)/2.1, 3) * (1 - (y+0.45)/0.9);
    hp.setY(i, y + lift);
  }
  hullGeo.computeVertexNormals();
  const hullMat = new THREE.MeshStandardMaterial({color:0xf0eee4, roughness:0.5, metalness:0.05});
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true; hull.receiveShadow = true;
  group.add(hull);
```
Hull has bottom narrower and raised at ends (bow/stern). Good.

Deck: BoxGeometry(1.4,0.1,3.2); position y .46; wood color 0x9a6b3f.

Cabin: BoxGeometry(1.0,0.55,1.1); position (0,0.83,-0.2); color 0xf7f4e8. Add roof? Maybe a small box roof. Add windows: BoxGeometry(1.02,0.18,0.8) at y .92, dark 0x2b3d44. Slightly bigger x to show on sides. Good.

Mast: CylinderGeometry(0.05,0.06,3.4,8) position (0,2.2,0.6). Brown/dark.

Boom: CylinderGeometry(0.04,0.04,1.8,6) rotated z? Boom horizontal along z: rotate X 90? Cylinder axis Y; to align with z rotate X by PI/2. Position (0,1.5,-0.2)? Let's skip boom or add: position (0,1.45,-0.25), rotation.x = Math.PI/2 means axis along z. Length 1.8 => z ±0.9. But sail extends to -1.2. Fine add boom.

Sail geometry as described. Build:
```
function createSailGeometry(): THREE.BufferGeometry {
  const rows = 12, cols = 6;
  const positions: number[] = [];
  const indices: number[] = [];
  const A = new THREE.Vector3(0, 1.25, 0.6);
  const B = new THREE.Vector3(0, 3.25, 0.6);
  const C = new THREE.Vector3(0, 1.35, -1.25);
  const mastPoint = new THREE.Vector3();
  const tailPoint = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i=0;i<=rows;i++){
    const u = i/rows;
    mastPoint.lerpVectors(A,B,u);
    tailPoint.lerpVectors(C,B,u);
    for (let j=0;j<=cols;j++){
      const v = j/cols;
      p.lerpVectors(mastPoint, tailPoint, v);
      p.x += Math.sin(Math.PI*u) * Math.sin(Math.PI*v) * 0.28;
      positions.push(p.x,p.y,p.z);
    }
  }
  for (let i=0;i<rows;i++){
    for (let j=0;j<cols;j++){
      const a = i*(cols+1)+j;
      const b = a+1;
      const c = a+cols+1;
      const d = c+1;
      indices.push(a,c,b, b,c,d);
    }
  }
  ...
}
```
At u=1, mastPoint=tailPoint=B, all cols same point => degenerate triangles but okay. The sail is triangular-ish. It extends from mast at y1.25 to top and leech to -1.25. x bulge positive (to one side). Good. Position sail mesh at group origin.

Sail material white 0xf5f0e0 side DoubleSide roughness 0.65. castShadow true.

Add flag at mast top: small triangle BufferGeometry with red material. Optional.

Group position initial (12,0,14) with y 0; will set each frame.

Set group.rotation.order='YXZ'.

Expose __boat.

Make sure boat hull does not intersect island: at 18.4 r, island underwater -0.7; boat bottom at -0.1 relative water, so could clip terrain underwater; not visible.

Now island receives shadows.

Now animation update order: uniform time, leaves, boat, render.

Maybe add subtle water movement to boat drift with time.

Camera set:
```
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(35,12,35);
camera.lookAt(0,2,0);
```
FOV 55, good.

Resize handler updates aspect, size.

Renderer antialias true, powerPreference high-performance. setPixelRatio min(devicePixelRatio,2).

Canvas style width/height 100%? Setting size via renderer does canvas style width/height. Fine. Set body margin 0 overflow hidden background color.

Now potential issue: Ocean plane edge visible at horizon if fog not enough; plane 400 extends ±200. Camera at (35,35) looking at origin; horizon distance ~ sqrt(200^2+...) far edges ~ 240. Fog near 70 far 360 leaves edge somewhat visible but blended. Maybe increase fog far 300 so edges fade to fog. Set fog far 280? Then island at distance ~50 unaffected. Boat ~20. Far ocean blends. Use Fog(0xbfd8e6, 80, 300). Good. Ocean edge at distance 200+ will be fogged heavily. Sky horizon color similar. Fine.

But requirement ocean at least 400x400 centered origin; yes.

Maybe use plane size 600 with same 256 segments? Wavelength detail worse. 400 fine.

Now, testing might call `__ocean.heightAt(x,z,t)` at arbitrary t and compare boat? They can't compare shader easily but maybe visual. Good.

One thing: ShaderMaterial vertex uses `uOmega[i]` array indexing with loop; fragment also. On GLSL ES 1.0, uniform arrays with non-constant index? loop index is constant after unrolling by compiler; should work. But WebGL1 requires constant-index-expression for uniform arrays? GLSL ES 1.00 allows indexing uniform arrays only with constant-index-expressions (loops with constant bounds are okay if index is loop variable? Actually "constant-index-expression" includes loop indices of for loops with constant bounds per Appendix A). Should compile. Three WebGL2 default nowadays, where dynamic indexing allowed. Fine.

Alternatively define individual uniforms to avoid any issue. But arrays are simpler. Three's WebGLRenderer defaults to WebGL2 in recent versions. If WebGL1 fallback, loop index allowed by spec. Fine.

Potential issue with UniformsUtils.merge cloning Vector4 arrays and then assigning uniform values: fine.

Type of `uniforms.uWaves.value` any.

Let's ensure `uniforms` declared as `THREE.UniformsUtils.merge([...])` returns `{ [uniform: string]: THREE.IUniform; }` (actually returns any?). The signature in three types: `static merge( uniforms: object[] ): { [uniform: string]: IUniform };`. Good.

Set uTime initial 0.

Height function uses waves array defined before shader. Good.

Now strict TS: `const hp = hullGeo.getAttribute('position') as THREE.BufferAttribute;` fine.

`hullGeo.computeVertexNormals()`.

Colors per vertex for island typed.

`new THREE.Color()` default white; fine.

Now a subtlety: island geometry PlaneGeometry after rotateX, z from -33..33 but the original plane's y coordinate orientation maybe z sign flipped; islandHeight symmetric-ish with noise, fine.

Now compute island height at palm positions using same function; good.

Let's decide exact palm specs:
```
const palmSpecs = [
 { angle: 0.4, radius: 4.5, height: 6.2, lean: 1.2 },
 { angle: 1.5, radius: 7.5, height: 5.6, lean: 1.0 },
 { angle: 2.6, radius: 10.0, height: 6.8, lean: 1.3 },
 { angle: 3.7, radius: 6.0, height: 5.4, lean: 0.9 },
 { angle: 4.8, radius: 9.0, height: 6.0, lean: 1.1 },
 { angle: 5.5, radius: 3.5, height: 7.0, lean: 0.8 },
 { angle: 0.9, radius: 11.2, height: 5.8, lean: 1.4 },
];
```
At radius 11.2, islandHeight maybe 13*exp(-(125)/121)=13*0.356=4.63-1.5=3.13 plus noise; fine above water. Good.

Check palm at angle 0.4 radius 4.5 near boat direction? Boat at (12,14) angle ~0.86 rad radius 18.4; palms at radius ≤ 11; boat outside. Good.

Tree trunk top base+height; leaves extend outward 2.4; far palm at r=11.2 + leaf 2.4 => 13.6 still above water/over beach. Fine.

Now update boat: The boat group's origin at waterline? Hull geometry centered y 0; bottom -0.45. group y = h+0.35 puts hull bottom 0.1 below water, deck 0.46 above water 0.81. Good.

But boat group at (12,0,14) and y computed; first frame okay.

Boat rotation pitch computed from height differences at ±2 units; hull half-length 2.1. Good.

Now shadow camera: directional light target at origin; shadow camera is attached to light. Since light positioned at sunDir*120, target at origin, ortho ±60 covers scene. But the shadow camera position at light and pointing at target; near 1 far 400. The island (radius 33) and boat fit within ±60 in light space. Good.

Set `dirLight.shadow.camera.left = -60; right=60; top=60; bottom=-60; near=20?` If light distance 120, near 20 far 300. Use near 1 far 400. Fine.

Potential shadow acne on large ocean? Ocean not receiving shadows. Island self-shadow with normalBias 0.05.

Now let's add a subtle point light? no.

Maybe add "sun" visible disc in sky matched by directional light. Yes.

Sky dome radius 800; camera far 2000; island at 50. Sky drawn with depthWrite false, so ocean may overwrite. Render order -10 ensures sky first. Then ocean drawn after, depth test passes because sky didn't write depth. Fine. If sky depthWrite false, objects always draw over sky. Good.

Set skyMesh.renderOrder = -10; material.depthWrite=false; material.depthTest=false? If depthTest false, sky would draw over everything if rendered after but renderOrder -10 means first, so okay; set depthTest false to be safe? With renderOrder -10 and depthWrite false, drawing sky first fills color; then everything else draws. Set depthTest false might cause sky to ignore depth but it's first anyway. Use `depthWrite:false, depthTest:false` and renderOrder -10. Fine.

Now write shaders as template strings. Ensure backticks not containing `${}` accidental. Use GLSL `for (int i = 0; i < 4; i++)`. No template placeholders.

One concern: In ocean fragment, including `<fog_pars_fragment>` declares `varying float vFogDepth;` and uniforms. We also declare `varying vec3 vWorldPos; varying float vHeight;` before. Fine.

`#include <tonemapping_fragment>` requires `gl_FragColor` defined.

Order includes: some built-in materials include tonemapping then colorspace then fog. We follow.

Potential TS issue with string literal containing `#include` fine.

Now `const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {...}])`; then `uniforms.uDeepColor.value = new THREE.Color(0x082a44);`. But uDeepColor initial in merge maybe a Color already cloned. Set values after.

Let's define:
```
const oceanUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone() },
    uWaves: { value: [] as THREE.Vector4[] },
    uOmega: { value: [] as number[] },
    uMaxAmp: { value: totalAmp },
    uDeepColor: { value: new THREE.Color(0x07233a) },
    uShallowColor: { value: new THREE.Color(0x2ba39a) },
  }
]);
oceanUniforms.uWaves.value = waves.map(w => new THREE.Vector4(w.dx,w.dz,w.k,w.amp));
oceanUniforms.uOmega.value = waves.map(w => w.omega);
```
Type of value array with `as` maybe: `value: [] as THREE.Vector4[]`. UniformsUtils.merge clone of empty array works.

Height function uses wave defs.

Ocean material:
```
const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: oceanVertexShader,
  fragmentShader: oceanFragmentShader,
  fog: true,
  // toneMapped default true
});
```
Maybe set `toneMapped: true` explicitly? ShaderMaterialParameters includes toneMapped? yes from MaterialParameters. Set it.

Sky material:
```
new THREE.ShaderMaterial({
 uniforms: { uSunDir: { value: sunDir.clone() } },
 vertexShader: skyVertex,
 fragmentShader: skyFragment,
 side: THREE.BackSide,
 depthWrite: false,
 depthTest: false,
 fog: false,
 toneMapped: true
});
```

Sun light.

Now check `renderer.outputColorSpace = THREE.SRGBColorSpace;`.

Create renderer:
```
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```
Style:
```
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
```
Maybe canvas display block.

Scene, fog.

Camera.

Window resize event.

Now the animation loop; `let waveTime = 0;` and clock. Use `const clock = new THREE.Clock(); let started=false;`.

```
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;
  oceanUniforms.uTime.value = waveTime;
  updateLeaves(waveTime);
  updateBoat(waveTime);
  renderer.render(scene, camera);
  if (!ready) { (window as any).__ready = true; ready = true; }
});
```
If tab inactive delta spikes; clamp 0.1.

But `clock.getDelta()` first call returns tiny; waveTime starts ~0. Good.

time() returns waveTime; test may call after.

Update boat function uses heightAt.

Ensure `__ocean.time` returns current waveTime; closure okay.

Now the boat pitch/roll exact.

One more: Boat should "staying within 25 units of the origin". x,z drift max 12+1.4=13.4, 14+1.2=15.2 => distance sqrt(13.4²+15.2²)=20.3 <25. Good.

Now all window assignments after construction:
```
(window as any).__scene = scene;
...
(window as any).__ocean = { heightAt: oceanHeightAt, time: () => waveTime };
```
Note waveTime declared with let before.

`__sun = sunLight`.

Now I need to ensure no `any` implicit errors. Functions typed.

Let's carefully write the file.

Potential issue: `THREE.UniformsLib.fog` type maybe `{ [uniform: string]: IUniform }`. UniformsUtils.merge accepts object[]; `THREE.UniformsLib.fog` is object. Fine.

Potential issue: `new THREE.Vector4(w.dx,w.dz,w.k,w.amp)`.

Potential issue: `oceanUniforms.uWaves.value = ...` Type any.

Now shader arrays: In GLSL, uniform arrays must be declared with size, e.g. `uniform vec4 uWaves[4];`. three uploads array of Vector4 via `uniform4fv`. Good. `uniform float uOmega[4];` uploaded as array of numbers via uniform1fv. Good.

Potential shader compile issue: using `cameraPosition` in fragment: It's a built-in uniform available in fragment too? Three's WebGLProgram prefixFragment includes `uniform vec3 cameraPosition;`? Let's recall: prefixVertex includes cameraPosition? In Three's WebGLProgram, prefixVertex includes `uniform vec3 cameraPosition;`? Actually for both vertex and fragment, prefix includes:
```
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
```
I believe both vertex and fragment prefixes include cameraPosition (in prefixFragment too). Yes, `cameraPosition` is declared in prefixFragment. Good.

`modelMatrix` and `viewMatrix` are built-in in vertex (prefixVertex declares modelMatrix, modelViewMatrix, projectionMatrix, viewMatrix, normalMatrix, cameraPosition). Good.

Now the fog chunks require `USE_FOG` define; material.fog true and scene.fog set => renderer defines USE_FOG. Good. `FOG_EXP2` not defined (linear fog). Good.

One subtle issue: `#include <fog_vertex>` placed after `gl_Position`; fine.

Sky material set `fog: false`, but we don't include fog chunks.

Now island color computation uses `smoothstep` function name conflicting? No.

Implement `clamp01` maybe.

Colors: Using `new THREE.Color(0xd9c18d)` yields linear values (since ColorManagement enabled and setHex uses SRGBColorSpace). Good.

Now vertex colors in linear, standard material handles.

Palm leaf colors linear.

Now possible issue: `new THREE.Color().copy(wetSand)` etc.

Let's write island color loop:

```
const colorAttr: number[] = [];
const sand = new THREE.Color(0xd9c38c);
const wetSand = new THREE.Color(0xa58d63);
const grassLight = new THREE.Color(0x6aa84f);
const grassDark = new THREE.Color(0x2f6b35);
const rock = new THREE.Color(0x726b58);
const c = new THREE.Color();
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i), z = posAttr.getZ(i);
  const y = posAttr.getY(i);
  const ny = normalAttr.getY(i);
  const steep = 1 - Math.min(1, Math.max(0, ny));
  c.copy(wetSand);
  if (y > 0.15) {
    if (y < 1.8) c.copy(sand);
    else if (y < 4.6) { c.copy(grassLight); c.lerp(grassDark, smoothstep(1.8,4.6,y)*0.6); }
    else { c.copy(grassDark); c.lerp(rock, smoothstep(6.2, 9.6, y)); }
  }
  c.lerp(rock, smoothstep(0.28, 0.62, steep) * (y > 0.5 ? 0.9 : 0.2));
  const n = fbm(x * 0.22 + 13.7, z * 0.22 + 8.1);
  const f = 0.85 + n * 0.3;
  colorAttr.push(c.r * f, c.g * f, c.b * f);
}
```
At y<0.15 wet sand, underwater but hidden.

Fine.

Now island geometry position attribute after setting y: `posAttr.setY(i, islandHeight(x,z));` then `posAttr.needsUpdate = true` maybe not necessary before computeVertexNormals but set anyway.

`islandGeo.computeVertexNormals();`.

Set bounding sphere? computeBoundingSphere maybe not necessary.

Now trunk curve: CatmullRomCurve3 type.

Coconuts geometry shared.

Use `nut.position.set(...)`.

Leaves instanced.

Now to update leaves on first frame (t=0). do updateLeaves(0) before animation.

Boat initial updateBoat(0) before first render perhaps; animation first frame does it.

Now some polish: add a few rocks on island? Could add 5-8 rocks as dodecahedrons near shore. Not required but adds quality. Simple: place small gray rocks at radius 10-14 where height 0.3-1.5. Use DodecahedronGeometry(0.5,0) scaled, castShadow. Maybe 8 rocks. Adds detail. Also a small campfire? Skip.

Add birds? Skip.

Add a few clouds? Could add 5 flattened spheres at high y (80-120) far; MeshStandardMaterial white emissive? They might look odd with lighting; use MeshBasicMaterial white with fog false, but flat blobs. Could skip to keep quality consistent.

Ocean foam noise is procedural with sin; may look stripey. Fine.

Let's consider the sun in sky shader. Dot(dir, sunDir) where dir is normalized position. Sun angular radius: smoothstep-like pow 1200 gives a small disc: pow(cosθ,1200) > 0.5 when cosθ^1200=0.5 => θ ≈ sqrt(2*ln2/1200)=0.034 rad ≈ 2°, quite big but okay. Multiply 60 => bright white. Add halo pow 80 *0.6 => broad glow ~ sqrt(2 ln2/80)=0.13 rad 7.5°, nice. Sun visible at elevation 32° in front-left. Good.

Now potential mismatch: Sky is a sphere centered origin; camera at (35,12,35) near center, so sun position in sky in front of camera. Sun direction from origin used in shader dot with dir from sphere center, not camera direction; tiny parallax negligible.

Directional light sunDir same.

Ocean specular sunDir same.

Now write.

One concern: `renderer.setAnimationLoop` callback with `() => void`; okay.

Also need to handle resize:
```
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```
Maybe also setPixelRatio again? no.

Now strict TS: window.addEventListener callback typed.

Now I'll compose the full file.

Let me double check all THREE types:
- `THREE.BufferAttribute` has `getX`, `setY` etc.
- `THREE.Float32BufferAttribute` constructor `(array: ArrayLike<number>, itemSize: number, normalized?: boolean)`.
- `THREE.InstancedMesh` `setMatrixAt(index: number, matrix: Matrix4)`.
- `THREE.Object3D` `updateMatrix()`.
- `THREE.CatmullRomCurve3` constructor points: Vector3[].
- `THREE.TubeGeometry(path: Curve<Vector3>, tubularSegments?, radius?, radialSegments?, closed?)` fine.
- `THREE.PlaneGeometry(width?, height?, widthSegments?, heightSegments?)`.
- `MeshStandardMaterialParameters` `vertexColors: boolean` fine.
- `MeshStandardMaterial({ color, roughness })`.
- `THREE.PCFSoftShadowMap`.
- `THREE.SRGBColorSpace`.
- `THREE.ACESFilmicToneMapping`.
- `renderer.setPixelRatio`.
- `renderer.shadowMap.enabled`.
- Light shadow camera props typed.
- `dirLight.shadow.bias`, `normalBias`.
- `new THREE.HemisphereLight(skyColor, groundColor, intensity)`.

- `new THREE.Fog(color, near, far)` color can be number.

- `scene.fog = fog;` type Fog | FogExp2 | null.

- `scene.background` maybe skip.

Sky mesh add to scene.

Now ocean plane centered at origin. mesh position 0.

Potential issue: The ocean plane vertices have y=0; shader adds h. Fine.

HeightAt ignores horizontal shift (none).

Now the boat y uses oceanHeightAt + 0.35.

Testing may check that boat y equals heightAt at boat position + constant. We use exactly hC + 0.35. Good.

But group position x,z drift; tests might read boat.position and evaluate __ocean.heightAt(pos.x,pos.z,time()) and compare y - 0.35. Matches.

Pitch/roll tests may not.

Now code.

Let me write the shaders with correct syntax.

Ocean vertex:
```glsl
uniform float uTime;
uniform vec4 uWaves[4];
uniform float uOmega[4];

varying vec3 vWorldPos;
varying float vHeight;

#include <fog_pars_vertex>

void main() {
  vec3 p = position;
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float phase = w.z * dot(w.xy, p.xz) - uOmega[i] * uTime;
    h += w.w * sin(phase);
  }
  p.y += h;
  vHeight = h;

  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  vWorldPos = worldPosition.xyz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
```
Does `#include <fog_vertex>` need to be at start of line with no spaces? Three's parser `includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm`; leading whitespace okay. Good.

Fragment:
```glsl
uniform float uTime;
uniform vec4 uWaves[4];
uniform float uOmega[4];
uniform vec3 uSunDir;
uniform float uMaxAmp;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec3 vWorldPos;
varying float vHeight;

#include <fog_pars_fragment>

void main() {
  vec2 p = vWorldPos.xz;
  vec2 grad = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float phase = w.z * dot(w.xy, p) - uOmega[i] * uTime;
    grad += w.w * w.z * w.xy * cos(phase);
  }
  vec3 normal = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  float ndv = clamp(dot(normal, viewDir), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-viewDir, normal);
  float skyT = pow(clamp(R.y, 0.0, 1.0), 0.45);
  vec3 skyRefl = mix(vec3(0.85, 0.95, 1.05), vec3(0.10, 0.30, 0.72), skyT);
  ...
}
```
Hmm skyRefl horizon (0.85,0.95,1.05) brighter than sky horizon maybe similar. Fine.

Water deep color set via Color(0x07233a) gives linear approx (0.002,0.017,0.045); shallow 0x1fa79c linear ~ (0.013,0.38,0.34). Shader uses them; shallow bright teal. Good.

`waterCol += vec3(0.02, 0.14, 0.12) * crestH;` adds teal.

Fresnel makes distant water reflect sky (bright blue) which is good.

Foam shore radius: island waterline ~16, so foam band 15-20. `1.0 - smoothstep(15.0, 20.0, r)` => near 15 =>1, at 20 =>0. Good.

But near r<15 the island geometry covers water, so foam ring visible 15-20.

Crest foam threshold 0.72 of max amplitude: only crests foam. Good.

Add `foam *= smoothstep(0.0, 0.4, crestH)`? no.

Sun glints: pow 420 maybe too sharp; add 60 *0.15. Fine.

Include final:
```
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
```

Note fog chunk uses `gl_FragColor` indeed.

Sky fragment:
```
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 zenith = vec3(0.10, 0.30, 0.72);
  vec3 horizon = vec3(1.05, 1.15, 1.28);
  vec3 sky = mix(horizon, zenith, pow(h, 0.42));
  float sun = max(dot(dir, uSunDir), 0.0);
  sky += vec3(1.0, 0.72, 0.40) * pow(sun, 1200.0) * 60.0;
  sky += vec3(1.0, 0.62, 0.30) * pow(sun, 80.0) * 0.6;
  sky += vec3(1.0, 0.85, 0.65) * pow(sun, 6.0) * 0.10;
  sky = mix(vec3(0.62, 0.75, 0.85), sky, smoothstep(-0.12, 0.06, dir.y));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Vertex sky:
```
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
Since sphere at origin no rotation, position is world direction. If camera inside and sphere centered origin, fine.

Now sky sphere radius 800, geometry segments 48x24.

Set skyMesh.frustumCulled = false (since camera inside, bounding sphere may cull? Sphere is huge and camera inside, frustum culling may still pass; set false).

Ocean mesh frustumCulled maybe false? plane visible always; leave true.

Now the lights.

Sun light:
```
const sunLight = new THREE.DirectionalLight(0xfff2dd, 3.0);
sunLight.position.copy(sunDir).multiplyScalar(120);
sunLight.target.position.set(0,0,0);
scene.add(sunLight.target);
scene.add(sunLight);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.left = -60;
...
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.05;
```
Need `sunLight.shadow.camera.updateProjectionMatrix()`? Renderer updates. fine.

Hemisphere:
```
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3d6b4f, 0.9);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
```
Fill directional:
```
const fill = new THREE.DirectionalLight(0x8fb8e0, 0.35);
fill.position.set(-40, 30, 60); // opposite-ish
scene.add(fill);
```
No shadows.

Could maybe oversaturate; fine.

Now palms: `leafData` interface.

```
interface LeafInstance {
  base: THREE.Vector3;
  angle: number;
  tilt: number;
  phase: number;
  scale: number;
}
```

Trunk material one shared.

Create palm specs array and loop.

Coconuts use nutGeo; add to scene with position top + offset. Cast shadows.

Crown small sphere maybe not.

Now leaf InstancedMesh added to scene.

`(window as any).__leaves = leaves;`

Now rocks:
```
const rockMat = new THREE.MeshStandardMaterial({color:0x6c685c, roughness:0.95, flatShading:true});
const rockGeo = new THREE.DodecahedronGeometry(0.6,0);
for (let i=0;i<10;i++){
  const ang = i*2.399; const rad = 11 + (i%3)*2.5;
  const x = Math.cos(ang)*rad, z=Math.sin(ang)*rad;
  const y = islandHeight(x,z);
  if (y > -0.2) { ... }
}
```
Place at height max(y, -0.2); cast/receive shadows. Adds shore rocks. Might clutter; fine.

Actually rocks at radius 11-16 may float if y<0; only add if y>0.2 and y<2.5. Keep.

Now overall code length maybe 500 lines. Fine.

Let's ensure TypeScript `THREE.MathUtils.degToRad`.

Now potential issue with `THREE.Color` set via `setHex` in constructor with color management. Good.

Potential issue: `new THREE.Vector3().lerpVectors` etc.

Now the boat sail geometry: positions with vector reuse `p.x += ...` but `p` reused; fine. indices.

Compute normals.

Now add boat group and meshes.

Order:
```
const hull = ...
group.add(hull);
const deck = ...
...
group.add(sail);
```
Set castShadow/receiveShadow individually. Maybe `group.traverse` at end:
```
group.traverse((obj) => { if (obj instanceof THREE.Mesh) { obj.castShadow = true; obj.receiveShadow = true; } });
```
`instanceof` check okay with strict. Use `(obj as THREE.Mesh).castShadow`? Better `if (obj instanceof THREE.Mesh)`. Fine.

Then scene.add(group).

Position group initial y = oceanHeightAt(12,14,0) + 0.35.

Now updateBoat function defined after group creation? It can reference group.

Let's define after.

One concern: pitch/roll with heightAt uses waveTime; call each frame.

Now window resize.

Now animate.

Let's write final code now. I'll be careful about TS types and no unused imports.

Check if `THREE.UniformsLib.fog` might be typed as `{ [key: string]: IUniform }` and `merge` expects `object[]`; okay.

Let me think about `THREE.UniformsUtils.merge` cloning `new THREE.Vector4` arrays. After merge, `oceanUniforms.uWaves` exists with value [] cloned to []; assign new array afterwards. Fine.

`oceanUniforms.uOmega.value = waves.map(w => w.omega);` fine.

`oceanUniforms.uTime.value = 0;` initial.

Now shader uniform names: uWaves, uOmega, uTime, uSunDir, uMaxAmp, uDeepColor, uShallowColor. All declared in shaders.

UniformsLib.fog has fogColor, fogNear, fogFar (and fogDensity?). `fogColor` etc are not declared in our shader manually; fog_pars_fragment declares them. Good.

Sky shader no fog.

Now tone mapping: ocean and sky have `toneMapped` default true. But note ShaderMaterial `toneMapped` default is true? Let me verify: In three, `Material` constructor sets `this.toneMapped = true;`? Yes. ShaderMaterial inherits. Fine. If false, TONE_MAPPING define not set but chunk is no-op and colorspace still applies. Fine either way.

`renderer.outputColorSpace = SRGBColorSpace` default anyway.

Now let's think about performance: 256x256 plane (66k verts) with shader; fragment compute 4 waves; fine.

Shadow map 2048; fine.

Leaves 63 instances; trivial.

Island 110x110 = 12k verts. fine.

Now a subtlety: PlaneGeometry(400,400,256,256) after rotate has positions x ∈ [-200,200], z ∈ [-200,200]. Ocean shader uses p.xz. Good.

Now `heightAt(x,z,t)` returns displacement at undisplaced position; shader same.

Now window exposing `time()` returns waveTime variable. The function closure created before waveTime declared? Need declare `let waveTime = 0;` before assigning window.__ocean. We'll declare near top before ocean creation, and assign later. In heightAt function, uses waves only.

Now first frame ready: after renderer.render call in animation. Good. But `__ready` should be true only after first frame; if tests check before animation, false. okay.

Now possible issue: setting `renderer.setAnimationLoop` starts immediately but clock delta. Fine.

Let's write the code.

Also need to avoid using `Math.PI*2` repeatedly? fine.

One more check: In ocean vertex shader, `p.xz` uses position local; after geometry rotation, local xz is world xz. Good. modelMatrix identity. vWorldPos = p world.

Now `cameraPosition` in fragment might not be available if ShaderMaterial? It is in prefixFragment yes.

Now the sky dome: `new THREE.Mesh(skyGeo, skyMat)`; add to scene; position at origin.

Now scene.fog.

Let's ensure the island is "centered on origin" yes.

Now write.

After writing, mentally compile strict.

Types:
- `const waves: WaveDef[] = [...]` WaveDef interface fields.
- `function oceanHeightAt(x: number, z: number, t: number): number`.
- `const oceanUniforms = THREE.UniformsUtils.merge([...]);` Type `{ [uniform: string]: THREE.IUniform<any>; }` maybe generic? In newer three types, `IUniform<TValue = any>`. Assigning `THREE.Vector4[]` to `value` any fine.

- `new THREE.ShaderMaterial({ uniforms: oceanUniforms, ... })`.

Now `THREE.UniformsLib.fog` might be undefined in types? It's defined.

- `renderer.setAnimationLoop(animate)` where `function animate(): void`. Type of setAnimationLoop: `(callback: XRAnimationLoopCallback | null) => void`. XRAnimationLoopCallback is `(time: number, frame?: XRFrame) => void`. Passing `() => void` okay (fewer args allowed). Good.

- `clock.getDelta()` number.

Now `document.body.style.background` string.

Now the code.

Let me also include `renderer.domElement.style.display = 'block';`.

Now island palms: `for (const spec of palmSpecs)`. Use typed array.

Now leaf creation: need `leafData` before leaves mesh. Fine.

Now updateLeaves references leaves which is defined after function? If function defined after leaves, fine. Define function after creating mesh.

Now boat update function after group.

Now window assignments after all.

Now code detail for sail geometry indices: ensure no degenerate issues at top row (u=1 all vertices same) -> triangles zero area; harmless.

Now rocks: maybe skip to reduce risk. But detail good. Add 7 rocks.

Now sun direction in sky shader uses normalized; good.

Let's write now.

One more thought on wave amplitudes and boat: total amplitude 1.08; ocean crest-to-trough up to 2.16, slightly above "about 0.5 to 2". Fine; "about".

Could reduce to 0.44+0.30+0.18+0.09 = 1.01 => crest-trough 2.02. Use those: amps 0.44, 0.30, 0.18, 0.09. Waves visible. Let's use 0.44, 0.30, 0.18, 0.09. totalAmp=1.01.

Wavelengths 46, 27, 14.5, 8.

Speeds 6.2, 4.6, 3.4, 2.6.

Directions as above.

At far ocean, waves of 8 wavelength over 1.56 grid spacing may alias but fragment normals from analytic formula will still show high freq normals even if geometry coarse; can cause shimmering but okay.

Now if the fragment normal uses p = vWorldPos.xz and vWorldPos includes vertical only; exact.

Now `uMaxAmp` = 1.01.

Now foam crest threshold 0.72 => height > 0.727; happens occasionally.

Now write final.

Also, `heightAt` used for boat and tests. Wave time from uniform.

One concern: The animation increments waveTime by clamped dt; if tab pauses, wave time discontinuous but okay.

Let's write code.

Additionally expose `__island` as mesh. `__sun` directional light.

Now maybe set islandMesh.name = 'island'; boatGroup.name='boat'; leaves.name='leaves'; helpful.

Now final code.

Check for strict errors like `const spec: { angle: number; radius: number; height: number; lean: number; }` inferred from array literal fine.

Now `const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.65, metalness: 0.0 });`.

InstancedMesh with vertexColors uses color attribute; good.

Now `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);`.

Now dummy Object3D created once; rotation.order set once to 'YXZ'.

Potential issue: Changing rotation.set each frame with order? order persists.

Now let's write.

I need to make sure `#include` lines are exactly recognized; use backtick strings with newlines.

Now produce final answer as one ts code block.

Let me draft the full code:

```ts
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Small deterministic noise helpers                                  */
/* ------------------------------------------------------------------ */
function fract(x: number): number { return x - Math.floor(x); }

function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}

function valueNoise(x: number, y: number): number { ... }

function fbm(x: number, y: number): number { ... }

function smoothstep(a: number, b: number, x: number): number { ... }

/* ------------------------------------------------------------------ */
/*  Ocean waves (shared by JS and GLSL)                                */
/* ------------------------------------------------------------------ */
interface WaveDef { dx: number; dz: number; k: number; amp: number; omega: number; }

function makeWave(dirX: number, dirZ: number, length: number, amp: number, speed: number): WaveDef { ... }

const waves: WaveDef[] = [...];

function oceanHeightAt(x: number, z: number, t: number): number { ... }

let waveTime = 0;
```

Then renderer/scene/camera.

Order matters: renderer created, scene, camera, lights, sky, ocean, island, palms, boat, window exposes, animate.

Height function references waves only, fine.

Let's ensure no duplicate variable names (`sunDir` used in shader uniforms and light).

Now I'll write.

For sky sphere, use `new THREE.SphereGeometry(900, 48, 24)`. Camera far 3000? Set camera far 4000 to be safe. near 0.1.

Fog far 320.

Directional light distance 140.

Shadow far 500.

Let's set camera far 2500, sky radius 900. fine.

Now lights intensity: sun 3.2, hemi 0.75, ambient 0.18, fill 0.3.

Exposure 0.6.

Let's finalize.

Potential issue with `renderer.shadowMap.type = THREE.PCFSoftShadowMap;` typed.

Now full code.

One thing: When using ShaderMaterial with custom fog, the `fogColor` uniform is only refreshed if `material.fog` true and scene.fog exists. We set both. Good.

Now write code.

Let me reconsider ocean shallow color: shader uses uShallowColor which is THREE.Color linear of 0x2ba39a -> ~ (0.022,0.37,0.33). Good.

Deep color 0x07233a -> ~ (0.002,0.017,0.043). Very dark. Fresnel adds sky at grazing angles, so ocean looks deep blue near, bright far. Good.

Add slight ambient tint to water: `waterCol += vec3(0.01,0.03,0.05)`. Fine.

Now the foam color (0.82,0.90,0.94) linear bright, tonemapped to white. Good.

Now final.

Code writing time.

I need to ensure the `uniforms` for ocean includes `uWaves` as array of Vector4 and `uOmega` as number array. When `UniformsUtils.merge` clones the initial empty array, then assign. Good.

Let me check that assigning `oceanUniforms.uWaves.value = waveVectors;` where waveVectors is `THREE.Vector4[]` accepted (value any). Good.

Now write.

Potential problem: GLSL loop `for (int i = 0; i < 4; i++)` and `uWaves[i]` in WebGL1 with uniform array indexing requires loop index allowed. fine.

Now output.

Wait: One detail: `uDeepColor` in shader is used; uniform declared. Good.

Now code.

I'll also add a little sea "sparkle" by sun spec.

Let me be mindful of `cameraPosition` in fragment shader being in world space. Yes.

Now final answer.