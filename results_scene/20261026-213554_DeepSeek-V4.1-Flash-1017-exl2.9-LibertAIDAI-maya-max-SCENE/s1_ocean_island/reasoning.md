Let me write a single TypeScript file with Three.js, strict-mode compliant.

Key considerations:
- Imports: `import * as THREE from 'three';` and addons like OrbitControls, Sky.
- Renderer creation, appended to body.
- Resize handling.
- setAnimationLoop.
- Expose globals.
- Ocean with ShaderMaterial: Gerstner waves sum of 3+ waves, normals computed analytically, Fresnel, specular, foam.
- heightAt must match shader. Use Gerstner sum ignoring horizontal shift. Careful: Gerstner wave height y = A * sin(dot(D, P) * w + phi) — for the shader displacement, using undisplaced position. heightAt(x,z,t) computes the same sum using undisplaced (x,z). Good.
- Also wave time: shader uses uniform uTime; we accumulate time in JS with delta; `time()` returns the accumulated wave time. But careful: the ocean wave time should be the accumulated time, and boat uses `heightAt(x,z,time())`. Good.

Let's define waves:

```ts
type Wave = { dir: THREE.Vector2; amplitude: number; wavelength: number; speed: number; steepness: number; phase: number };
```

Gerstner: for each wave with direction D (normalized), wavelength L, amplitude A, speed s:
- k = 2π/L
- w = k * speed? Actually phase speed c = speed units/sec, so omega = k*c.
- phase = k * dot(D, P0) - omega * t + phase0

Displacement:
x += steepness * A * D.x * cos(phase)
z += steepness * A * D.y * cos(phase)
y += A * sin(phase)

For heightAt ignoring horizontal shift: return sum A*sin(phase) where phase computed at undisplaced (x,z). Good.

Actually for a proper Gerstner, the vertical is A * sin(phase). Sum of 4 waves: crest-to-trough ~ 2 * sum(A). Let's use amplitudes like 0.45, 0.28, 0.18, 0.1 → sum ~1.0, so crest to trough ~2. Good, "0.5 to 2 units" crest-to-trough.

Normals: compute analytically. For Gerstner wave, tangent/binormal. Simpler: compute normal by finite differences in JS? In shader we can compute analytically:

For Gerstner sum, position P = P0 + sum( Q_i * A_i * D_i * cos(phase_i), A_i sin(phase_i) ).

Tangent along x: dP/dx = (1,0,0) + sum over i of derivative.
d/dx of phase_i = k_i * D_i.x.
d/dx of horizontal displacement x-comp: -Q_i*A_i*D_i.x*D_i.x*k_i*sin(phase_i)  (since d/dx of Q A D_x cos = -Q A D_x * k D_x sin)
Actually derivative of cos(phase) wrt x is -sin(phase)*k*D_x.
So dx/dx = 1 - sum Q A D_x^2 k sin(phase)
dy/dx = sum A k D_x cos(phase)
dz/dx = - sum Q A D_x D_y k sin(phase)

Similarly along z.

Then normal = normalize(cross(dP/dz, dP/dx))? Let's be careful with orientation. Actually normal = normalize(cross(Tz, Tx)) where Tx = dP/dx, Tz = dP/dz. In right-handed coords, cross(Tz, Tx) gives... Let's just compute normal via cross of tangent vectors: N = normalize(cross(Tx, Tz))? For flat: Tx = (1,0,0), Tz = (0,0,1). cross(Tx,Tz) = (1,0,0)x(0,0,1) = (0*1-0*0, 0*0-1*1, 0) = (0,-1,0). That's downward. So use cross(Tz, Tx) = (0,0,1)x(1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Up. Good. So N = normalize(cross(Tz, Tx)).

Simpler approach for shader: compute normal with analytic partial derivatives as above, or use finite differences in shader (4 extra evaluations of sum — cheap enough). Analytic is nicer. Let's do analytic.

Implement a GLSL function `waveSum` computing height and derivatives.

Let me write GLSL:

```glsl
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform float uFogNear...
```

Actually we can rely on Three's fog by adding fog chunks in the fragment shader manually. Simpler: include `#include <fog_pars_fragment>` etc. with ShaderMaterial and `fog: true`. That works: ShaderMaterial has `fog: true` option and we can include fog chunks. Need `#include <fog_pars_vertex>` too and vFogDepth. Let's do that properly:

vertex:
```glsl
#include <fog_pars_vertex>
...
void main(){
  ...
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
```
fog_vertex uses `mvPosition` variable name — let me check: three's `fog_vertex` chunk:

```glsl
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif
```
Yes it expects `mvPosition`. Good.

fog_pars_vertex:
```glsl
#ifdef USE_FOG
	varying float vFogDepth;
#endif
```
Requires USE_FOG define which ShaderMaterial sets when fog: true? Actually for ShaderMaterial, `fog: true` sets `USE_FOG` define? Let's check: WebGLProgram adds `#define USE_FOG` if `parameters.fog && parameters.fogExp2 === false`... Hmm. In WebGLRenderer, `getParameters` sets `fog: !!fog`, `useFog: material.fog === true`, and in WebGLProgram prefixes: `parameters.useFog && parameters.fog ? '#define USE_FOG' : ''`. Yes that works for ShaderMaterial too (material.fog defaults false for ShaderMaterial? Actually Material has fog: true by default I think; ShaderMaterial.fog defaults... ShaderMaterial has `fog` property? Material.fog = true default. But ShaderMaterial's `fog` is inherited, yes). Set `fog: true` explicitly in the constructor params to be safe.

Hmm, for ShaderMaterial, in the program prefix, it's `parameters.useFog && parameters.fog`. `useFog` is from `material.fog === true`. OK.

Also `fogDensity`/`fogNear` uniforms need to be set. For ShaderMaterial, WebGLRenderer sets fog uniforms automatically if material.fog is true? In `refreshFogUniforms` — yes, `if ( material.fog === true && fog )` sets uniforms fogColor, fogNear/fogDensity etc. Actually `refreshFogUniforms( uniforms, fog )` sets `uniforms.fogColor.value.copy( fog.color )` and `uniforms.fogNear.value = fog.near` etc. But it only does this if the uniforms exist? It checks `if ( uniforms.fogColor !== undefined )`? Let me recall three r150+ code:

```js
function refreshFogUniforms( uniforms, fog ) {
	fog.color.getRGB( uniforms.fogColor.value, getUnlitUniformColorSpace( renderer ) );
	if ( fog.isFog ) {
		uniforms.fogNear.value = fog.near;
		uniforms.fogFar.value = fog.far;
	} else if ( fog.isFogExp2 ) {
		uniforms.fogDensity.value = fog.density;
	}
}
```
And it's called when `material.fog === true` and `materialProperties.fog !== fog`... Also in `setProgram`, uniforms are refreshed only when needed. Hmm, there's a check: `if ( material.fog === true && materialProperties.fog !== fog ) { ... refreshFogUniforms }`. If the uniforms don't exist, `.value` of undefined throws. So I must declare `fogColor`, `fogNear`, `fogFar` in the uniforms object of the ShaderMaterial. Indeed, three's built-in materials include them via UniformsLib.fog. I'll merge `THREE.UniformsLib.fog` into my uniforms. That's the safest approach: `THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {...}])`. But merge clones; fine. Careful: merge requires uniforms values be objects with `value`. Use plain object spread instead: `{ ...THREE.UniformsLib.fog, uTime: { value: 0 }, ... }` — spreading UniformsLib.fog gives references to shared uniform objects. That could be a problem if shared across materials; but only one ocean material. Actually sharing is fine but better to clone: `{ fogColor: { value: new THREE.Color() }, ... }`. Let's just use `THREE.UniformsUtils.clone(THREE.UniformsLib.fog)` then assign. UnformsUtils.clone returns objects. Then spread with mine.

Simpler: just write my own fog manually in the fragment shader to avoid all that fuss. I could set scene.fog for other materials and add my own fog uniform in the ocean shader with values matching. But it's fine to use the chunks. Let's just do the manual approach to reduce risk? Hmm, using `#include <fog_pars_fragment>` and `#include <fog_fragment>` requires `vFogDepth` varying and `fogColor`, `fogNear`, `fogFar` uniforms. With UniformsLib.fog merged, it works. If the renderer fails to set them, defaults are fogColor white (bad). Actually, I'd rather compute fog manually with my own uniforms synced to scene.fog. That's fully deterministic:

fragment: `float fogFactor = smoothstep(uFogNear, uFogFar, -vViewZ);` and mix with uFogColor. Set uniforms from scene.fog in JS (constant anyway). Let's do that. It's simple, predictable. But then the fog color must match scene.fog.color so the ocean blends. I'll set both from a constant.

Hmm — but the requirement says "scene.fog that blends the far ocean into the horizon". Using my own fog in the ocean shader that matches scene.fog color/near/far is fine.

Let's keep it simpler still: Use scene.fog = new THREE.Fog(color, 120, 600) maybe. Wait ocean is 400x400, camera at (35,12,35) looking at origin; the ocean extends 200 units each way; horizon at distance ~250-300. Fog near 100, far 400.

Hmm, the ocean plane of 400x400 with 256x256 segments = 1.5625 units per segment — waves with wavelength 30+ sampled at 1.56 is fine-ish. Actually for smooth waves we need ~10+ vertices per wavelength. With wavelength 20-40 and 1.56 spacing, fine.

Ocean grid: 400x400 units, maybe 220x220 segments to be safe (below 256). Let's use 200 segments. Actually with waves displacement, edges of the plane at 200 units away might be visible; with fog they fade. Good.

But Gerstner waves with 200-size plane: the plane is centered at origin — the island is at origin. Ocean should not overlap the island interior... it will, but the island is above water so it hides the ocean where land is above. Where the island slopes below water, ocean covers it — fine.

Ocean material: double-sided? Not needed; camera above water. FrontSide.

Now, the vertex shader: I need world position for the wave computation. The plane is at origin with rotation -PI/2 (horizontal), and position y = 0. But the ocean group could be at y=0. Use the model matrix to compute world position: `vec4 worldPos = modelMatrix * vec4(position, 1.0);` then compute waves using worldPos.xz, and then set `transformed`... Simpler approach: build the plane geometry rotated in geometry space (geometry.rotateX(-PI/2)), then vertex position already in world-like coordinates when the mesh is at origin with no scale. Then in the vertex shader: `vec3 p = position;` compute displacement using `p.xz`, add to p, then `gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0)`. That works since mesh at origin. I'll keep the ocean mesh at (0,0,0) with no rotation applied to the mesh (rotation baked in geometry). Then camera-relative waves are in world coords since modelMatrix is identity. 

Let's do that but also use `modelMatrix` for generality? Nah — keep it simple, but I'll compute with `(modelMatrix * vec4(position,1.0)).xz` for correctness... then displacement must be applied in world space; the modelViewMatrix would then double-apply translation. Let's just require identity transform and bake rotation into geometry. Fine.

Also need the boat to sit on the water: boat position (12,0,14) — heightAt(12,14,t) plus offset 0.5 maybe.

Boat design: Group with hull, deck, cabin, mast, sail. About 4 units long. Let's build:
- Hull: use a lathe? Or just a box scaled with tapering? For a nice look: use an ExtrudeGeometry? Simpler: a hull from a `THREE.CapsuleGeometry`? Hmm.

Simplest realistic: hull from a BoxGeometry with modified vertices (taper toward bow). Or a `THREE.CylinderGeometry` rotated? I'd do: hull as a lathe geometry rotated 90°... Honestly, a decent-looking hull: create a shape via ExtrudeGeometry of the boat's side profile? Let me do:

Hull: `THREE.BoxGeometry(1.6, 0.8, 4, 8, 4, 16)` and deform vertices so that width narrows toward bow (z = +2) and stern, and the bottom is rounded. Actually let me make a hull with a custom function:

For each vertex, with z from -2..2, compute taper factor: t = 1 - (|z|/2)^2 roughly, width *= taper. And bend the bottom. Hmm, could look odd but acceptable.

Alternative classic: use `THREE.LatheGeometry`? no.

Let me just do a nice-looking hull via a Shape extruded: side profile of a boat hull in the XZ plane extruded in Y? Not quite.

I'll do: CylinderGeometry with radialSegments 16, height 4 (length), radius top 1.0, radius bottom 0.5, then rotate so axis along Z, scale y (vertical) by 0.6, and taper the ends. Hmm.

Practical approach: build hull from a parametric BufferGeometry. That's more code but gives a great hull. Let's do that:

Hull cross-section: parametrize u in [0,1] along length (z from -2 to 2), v in [0,1] around the cross-section (a U-shape). Let cross-section be a半circle: x = halfWidth(u) * cos(theta), y = ... Let's define cross-section as a semi-ellipse from x = -w to +w with y from 0 (deck level) down to -depth at center. Use theta from 0..PI: x = w*cos(theta), y = -depth*sin(theta) * shape... Actually a semi-ellipse: x = w*cos(theta), y = -d*sin(theta) with theta from 0 to PI gives x from w to -w with y=0 at ends and y=-d in the middle. Good, that's a hull cross-section (rounded bottom).

Then along length: halfWidth(u) = w0 * sqrt(1 - ((u-0.5)*something)^2)... Let's define u along z: z = -2 + 4u. Width profile: wide amidships, tapered to bow and stern:
`w = 0.75 * Math.pow(Math.sin(Math.PI * u), 0.6)` — hmm at u=0 and 1 gives 0 width, so the ends pinch to a point. That's fine for a bow but stern should be flat-ish. Let's use `w = 0.75 * Math.sin(Math.PI*u)^0.5` → at u=1, 0. Maybe better: bow pointed, stern squared: use width = 0.8 * (0.5 + 0.5*sin(...))? Let's not overthink.

Actually for a "small boat" (a sailboat), let's use:
- length 4, beam 1.4, depth 0.7.
- Width profile: taper towards the bow (z = +2) with power 1.5, keep stern rectangular-ish.

Let me define via `w(t) = beam * (1 - Math.pow(t, 3))` where t = (z+2)/4 ∈ [0,1] measured from stern to bow. At stern t=0 → w = beam; at bow t=1 → w=0. And the deck line rises toward the bow (sheer). Also the bottom: depth profile d(t) = 0.6 * (1 - 0.6*t^2).

That'll give a decent hull. Add a deck plane at y=0 (top). Add cabin (box), mast (cylinder), sail (plane with a triangular shape or a simple plane, maybe a lathe). And a small flag.

Boat group at (12, 0, 14). It's about 4 units long. Group rotation: pitch (rotation.x) and roll (rotation.z) from wave slope. Boat's forward direction along +Z? Let's define hull length along Z. Then pitch = rotation.x (nose up/down about X axis), roll = rotation.z.

Wave slope sampling: sample heightAt at points in front/behind along the boat's forward direction and beside.

Boat heading: give the boat a fixed yaw (e.g., rotate slightly) and drift slowly. Let's have the boat's yaw change slowly or just a fixed heading with slow drift in a small circle. Requirement: staying within 25 units of the origin. Start at (12,0,14) and drift slowly in a circle radius ~2 around... let's do position = (12 + 2.0*cos(t*0.05), 0, 14 + 2.0*sin(t*0.05))? Wait that keeps within 25 of origin: max distance sqrt(14^2+16^2)= ~21. Yes fine. Hmm, but "floating at about (12, 0, 14)" — starting at t=0 gives (14, 16) if cos(0)=1. Better: start exactly at (12,14): use position = (12 + 2*sin(t*0.06), 14 + 2*(cos(t*0.06)-1))... eh. Simpler: drift along a small circular path with phase so that at t=0 it's exactly (12,14):

x = 12 + 2*Math.sin(t*0.07), z = 14 + 2*(1 - Math.cos(t*0.07)). At t=0 → (12,14). Good, drift ~2 units.

Yaw: boat heading fixed at some angle, and slight yaw based on drift direction. Let's set the boat yaw = Math.PI * 0.15 or aligned with the drift direction. Keep it simple: fixed yaw with slight rotation over time.

Actually for pitch/roll sampling we need the boat's local axes in world space. With yaw θ (rotation about Y), forward = (sin θ, 0, cos θ) if the boat's forward is +Z. So sample ahead p_ahead = pos + forward*2, behind = pos - forward*2, side = pos + right*1 (right = (cos θ, 0, -sin θ)).

pitch = atan2(hAhead - hBehind, 4)? That's the slope. Since rotation.x positive tilts... Let's just compute: pitch = -Math.atan2(hFront - hBack, dist)? Test: if the bow (front, +Z) is higher than the stern, the boat should tilt nose-up. In Three.js, rotation about X by angle a: a point at +Z goes to y = -sin(a)*... rotate (0,0,1) about X by a: (0, -sin a? ) Let's compute: Rx(a) * (0,0,1) = (0, -sin a, cos a)? Rotation matrix about X:
[1 0 0; 0 cos a -sin a; 0 sin a cos a]. Applied to (0,0,1) → (0, -sin a, cos a). So for the +Z end to go up, we need -sin a > 0 → a < 0. So pitch angle = -atan2(hFront - hBack, distance). Good.

Roll about Z: Rz(a) applied to (1,0,0) → (cos a, sin a, 0). So +X side goes up with a>0. So roll = atan2(hRight - hLeft, dist). Right side is +X in local space.

Now, smoothing: we could lerp the rotations for stability. Sure, use damping with delta.

Palm trees: curved trunk + crown of leaves. Trunk: use a TubeGeometry along a CatmullRomCurve3 or a series of cylinders. Simplest good-looking: TubeGeometry with a curve, radius tapering — TubeGeometry has constant radius. Use a curve with many points and TubeGeometry radius 0.25 with radiusSegments 6, then scale? Tapering: could build with CylinderGeometry segments along the curve manually. Let's just do a LatheGeometry? Nah.

Alternative: build the trunk as a chain of 6 cylinders each rotated, decreasing radius — but that shows seams. A TubeGeometry with constant radius is acceptable if radius is small (0.22) and we add a slight taper by scaling the whole mesh? Not tapered.

Let's build trunk geometry manually: sample the curve at N points, build a tube with varying radius. That's ~40 lines. Let me write a helper `makeTaperedTube(curve, segments, radialSegments, radiusFn)`. Actually THREE.TubeGeometry creates the tube; then I can post-process its vertices to taper: for each vertex, compute distance along the tube via the index (i = floor(vertexIndex / (radialSegments+1))) and scale the offset from the curve center position. TubeGeometry's vertex order: for i in 0..tubularSegments, for j in 0..radialSegments. So vertex index = i*(radialSegments+1)+j. I can compute the center at parameter i/tubularSegments from the curve and scale (v - center) by taper factor. That's a neat trick. 

For leaves: ONE InstancedMesh with >= 30 instances covering all palms' leaves. Palm crown: 8 leaves per palm × say 6 palms = 48 leaves. Each leaf is a flattened, elongated shape — use a PlaneGeometry with segments and bend it? Since instance matrices can't bend, we can pre-bend the leaf geometry (curve it downwards), then instance it with rotation around the crown. Good: build a leaf geometry that is a tapered strip arcing downward, e.g., a plane 2.4 long × 0.7 wide with a bend in Y, plus maybe a slight serration. Use a custom BufferGeometry or just PlaneGeometry(0.7, 2.4, 8, 1) bent along its length and then rotated so it lies horizontally. Let's do: PlaneGeometry(width 0.8, length 2.6, 6, 3) — the plane lies in XY, so length along Y. Then bend: displace z by a curve based on y, and taper width by y. Then rotate the geometry so length goes along +X (or keep and handle in instance matrix). Simpler to design the leaf pointing along +X with droop:

Build the leaf in the XZ plane: for each vertex of a PlaneGeometry(w=0.7, h=2.6, 6, 8)... hmm.

Let me instead construct the leaf geometry manually as a ribbon: for i in 0..N (along the leaf), t = i/N, the centerline: x = L*t, y = -droop*t^2 (droop down), and width w(t) = maxW * sin(pi*t)^0.7 (pointy at both ends, widest near middle). Build two vertices per i: center ± halfWidth along z. Actually in local frame, leaf extends along +X, width along Z. Then vertices: (x, y, ±w). Plus a slight curl in y across the width for a nice cross-section: y ± 0.06.

Then indices for triangle strips. And compute normals, set material DoubleSide.

That's like 30 lines. Fine, and it gives a good look. 48 instances.

Wait, but leaf instances: I need instance matrices updated every frame for the wind sway. Store per-instance base transforms (position, rotation quaternion, scale), then apply a sway rotation perturbation each frame. Use a dummy Object3D: for each leaf, set position, quaternion from baseQuat * swayQuat, scale, updateMatrix, setMatrixAt.

Wind sway: rotate about the leaf's base (the crown point) with a small oscillating angle: sway = 0.12 * sin(t*2.0 + phase_i) plus a per-leaf phase. Rotate around Y (yaw flutter) and around Z (up-down). Since the leaf geometry emanates from the origin (crown point at local origin) and extends along +X, rotation around Z tilts it up/down and rotation around Y swings it around. Good — the leaf pivot is at the crown, so it looks like it's swaying at the base. 

Trunks: 6 palms at positions on the island. Palm trunk base at island surface height. Get island height from a JS function `islandHeight(x,z)` used to build the island geometry, so palms sit exactly on the ground.

Island: procedural, ~40 units across, peak 5-15 above water. Use a PlaneGeometry (say 200x200 with 128 segments? too many) — actually island is 40 units across, so a plane of 60x60 with 96x96 segments. Or use a radial island shape. Let's build a PlaneGeometry(70, 70, 96, 96) rotated to horizontal, then displace y by islandHeight(x,z) and color vertices by height (sand near water, grass higher, rock at the top). Set vertex colors, material MeshStandardMaterial with vertexColors, flatShading maybe. Receive shadows. Expose as __island.

islandHeight: h(x,z) = peak * falloff(r) with some noise. Needs to be >= 0 above water... Actually if it dips below y=0, we can clamp so the geometry goes to a negative value and the ocean hides it. Let's define:

```
function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const R = 22; // island radius
  if (r > R) return -2 ... 
}
```
Better: use a smooth shape with noise:

```
const base = Math.max(0, 1 - (r / 26)**1.6); // 0 outside
let h = 11 * Math.pow(base, 1.7);
h += noise stuff
h -= 1.5; // so the shoreline is at y=0 where h crosses 0
```
Hmm. We want the water line at y=0 at r ≈ 20. Let's design: h(r) = peak * (1 - r/R)^2 style. Let peak = 11 at r=0, and 0 at r=R=24. Add noise for realism.

With noise: `h = 11 * smoothstep-ish * (0.75 + 0.25*noise)` plus a smaller second bump for asymmetry.

We want a slope into the sea: beyond R, go negative gradually so it goes underwater. Let h(r) = 11 * exp(-(r/14)^2)? At r=0 → 11; at r=24 → 11*exp(-2.94) = 0.58; at r=30 → 11*exp(-4.6)=0.11. Not enough. Let's use a piecewise: 

```
const n = noise(x,z);
const r = hypot(x,z);
const t = clamp(1 - r/26, 0, 1);   // 1 at center, 0 at r=26
let h = 12 * Math.pow(t, 1.6) + n*1.2*t;
h -= 1.2; // waterline at h=0
```
At r=0: 12 - 1.2 = 10.8. At r=26: -1.2 (underwater). Waterline where 12*t^1.6 = 1.2 → t^1.6 = 0.1 → t = 0.1^(1/1.6) = e^(ln0.1/1.6)= e^(-1.439) = 0.237 → r = 26*(1-0.237) = 19.8. So the island is ~40 units across at the waterline. 

Noise: use a simple value-noise or sin-based fbm. Implement a small hash noise in JS (deterministic). Keep it cheap since the geometry is built once. Let's implement simple 2D value noise with smoothstep interpolation and 4 octaves.

Also add a bit of directional variation so it's not radially symmetric: add `+ 1.5 * Math.cos(angle*3)` etc. Also noise: n in [-1,1] * 1.5 * t.

Colors: sand (h < 1.2), grass (1.2..7), rock (>7, or steep slopes). Use vertex colors as THREE.Color lerps. Also blend based on slope.

Vertex colors with MeshStandardMaterial(vertexColors: true) — in three r152+, colors are in sRGB? Vertex colors are treated as linear when using `material.vertexColors`? Actually Three uses vertex colors as-is in linear space (they're multiplied). Use `color.convertSRGBToLinear()`? Hmm. In three r152+, `THREE.Color.setHex` applies colorManagement conversion when ColorManagement.enabled — `new THREE.Color(0xffcc88)` will convert from sRGB to linear working space by default (since r152, `Color.setHex(hex, colorSpace = SRGBColorSpace)`). So `new THREE.Color(0x...).setHex(...)` is already linear. Then setting vertex color attribute from those values gives linear values → correct. Good. And `renderer.outputColorSpace = THREE.SRGBColorSpace` is default.

Now, sky: use the Sky addon. `import { Sky } from 'three/addons/objects/Sky.js';` Configure turbidity, rayleigh, mieCoefficient, mieDirectionalG, sunPosition. The sun position from elevation/azimuth. Then the DirectionalLight direction matches. Expose __sun (DirectionalLight).

Sky mesh scale: 450000 or so (typical). With camera far = 2000? Sky scale 10000 is fine. Actually Sky's shader uses a box of scale; set scale 20000 and camera far 30000? That might blow up depth precision combined with the ocean at 400 units. Use logarithmicDepthBuffer? Simpler: set sky scale to 3000 and camera far 5000. Depth precision at 0.1 near and 5000 far with 24-bit depth is fine.

Hmm, but the SKY shader requires the camera to be inside the box. Camera at (35,12,35) with sky scale 3000 — fine.

Sky's material has `side: BackSide`, `depthWrite: false`. Good.

Also set `sky.material.uniforms['sunPosition'].value` to the sun direction vector. Note the Sky shader expects sunPosition in world-ish direction, normalized-ish. It uses `sunPosition` uniform as a vec3 direction.

Tone mapping: ACESFilmic, exposure ~0.5 (Sky needs low exposure like 0.4-0.6). Let's use renderer.toneMappingExposure = 0.55 and tune light intensities accordingly. With ACES and exposure 0.55, things get dark. Hmm, the Sky addon typically wants exposure ~0.5. But the rest of the scene with standard materials: DirectionalLight intensity 3 with exposure 0.55... Let's just pick: renderer.toneMapping = ACESFilmicToneMapping; toneMappingExposure = 1.0; Sky with turbidity 6, rayleigh 1.5, mieCoefficient 0.005, mieDirectionalG 0.8, sun elevation ~8°, azimuth 130°. With exposure 1.0 the sky can look washed out but generally fine. Actually the Sky shader output is in the range 0..~10; with ACES and exposure 1, the sky near the sun is blown out white and elsewhere blue. Typical examples use exposure 0.5 to get a nicer gradient. I'll use 0.5 and boost the directional light intensity to ~4-5 and ambient accordingly, since tone mapping compresses. Hmm, with exposure 0.5 everything is 2x darker. So light intensity 5 with exposure 0.5 ≈ 2.5 effective — quite bright but ACES will roll off. Let's use exposure 0.6, sun intensity 4.0, hemi 1.2, ambient 0.3. I'll tune by feel.

Actually simpler and safer: exposure 1.0 and Sky with lower turbidity/rayleigh so it's not overly bright: turbidity 4, rayleigh 1.2, mieCoefficient 0.004, mieDirectionalG 0.8, elevation 12°. That gives a nice blue sky with the sun disc visible. I'll go with exposure 0.85 maybe. Let's just pick exposure = 0.9, sun intensity 3.2, hemi 0.9.

Hmm, I can't test. Keep balanced values.

Now the ocean shader details:

Vertex shader:
```glsl
uniform float uTime;
uniform vec3 uCamPos;  // maybe not needed in vertex
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vFoam;

// wave params as uniforms arrays or constants?
```
I'll hardcode the wave constants in GLSL and mirror them in TS. Risk of mismatch — but I'll define them in TS and inject via template string, using a loop generated? Using uniform arrays is cleaner: `uniform vec4 uWaves[4]` where each vec4 = (dirX, dirZ, amplitude, wavelength) plus a second array for speed/steepness: `uniform vec4 uWaveB[4]` = (speed, steepness, phase, unused). Loops with constant bounds are fine in GLSL ES 1.0 (`for (int i = 0; i < 4; i++)`).

Actually simplest: pass as uniform arrays and loop. But the number of waves is fixed at 4. Let's do:

```glsl
uniform vec4 uWaves[NWAVES]; // x: dirX, y: dirZ, z: amplitude, w: wavelength
uniform vec4 uWaveParams[NWAVES]; // x: speed, y: steepness, z: phase0, w: unused
```

with `#define NWAVES 4`.

GLSL function:

```glsl
vec3 gerstner(vec4 w, vec4 p, vec2 pos, float t, out vec3 tangentX, out vec3 tangentZ) ...
```
Simpler: compute height and derivatives inline in one function returning a struct-ish. GLSL ES 1.0 doesn't have structs returned? It does support structs, but let's use out params.

Let me write:

```glsl
void waves(vec2 p, float t, out float height, out vec3 nrm, out float crest)
{
  vec3 dX = vec3(1.0, 0.0, 0.0);
  vec3 dZ = vec3(0.0, 0.0, 1.0);
  float h = 0.0;
  float steep = 0.0;
  for (int i = 0; i < NWAVES; i++) {
    vec4 w = uWaves[i];
    vec4 q = uWaveParams[i];
    vec2 dir = normalize(vec2(w.x, w.y));
    float k = 6.2831853 / w.w;
    float omega = k * q.x;
    float phase = k * dot(dir, p) - omega * t + q.z;
    float A = w.z;
    float Q = q.y;
    float s = sin(phase);
    float c = cos(phase);
    h += A * s;
    // derivatives
    dX.x -= Q * A * dir.x * dir.x * k * s;
    dX.y += A * k * dir.x * c;
    dX.z -= Q * A * dir.x * dir.y * k * s;
    dZ.x -= Q * A * dir.x * dir.y * k * s;
    dZ.y += A * k * dir.y * c;
    dZ.z -= Q * A * dir.y * dir.y * k * s;
    steep += Q * A * k * c;  // approximate crest measure
  }
  height = h;
  nrm = normalize(cross(dZ, dX));
  crest = steep;
}
```
Hmm the crest measure: use normalized height / max amplitude for foam. Let's compute foam from height relative to amplitude sum. `float hmax = sum(A)`. Then foamFactor = smoothstep(0.55, 0.95, h / hmax) maybe. Plus foam near the island shore (distance-based) — but the shader doesn't know the island. We can pass a uniform for the island center and radius, and add foam where r is near the shoreline radius (~20 units) — plus we can use the islandHeight function in the shader? Too complex. Just use a radial band: `foam += smoothstep(1.0, 0.0, abs(length(p.xz) - 20.0) / 3.0)` with wave-driven variation. Actually the island is centered at origin with the waterline at r ≈ 20. Foam ring near the shore: `shoreFoam = smoothstep(4.0, 0.0, abs(r - 19.0))` modulated by time. Hmm, the island isn't circular (noise), so a perfect ring might look off. But with noise in the island shape, the ring could float over the island in places. Risky. Let's instead do foam based on water depth approximation: we can't easily. I'll do crest foam only, plus a subtle foam where the wave height is high. Also add foam near the boat? no.

Hmm, requirement: "foam near crests or near the shore is a plus". Crest foam is enough.

Fragment shader:
```glsl
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; ...
vec3 N = normalize(vNormal);
vec3 V = normalize(cameraPosition - vWorldPos);
float fres = pow(1.0 - max(dot(N,V), 0.0), 5.0); // Schlick
fres = 0.02 + 0.98*fres;
// reflection color: approximate sky by gradient using reflect vector
vec3 R = reflect(-V, N);
vec3 skyCol = mix(uSkyHorizon, uSkyTop, clamp(R.y, 0.0, 1.0));  // plus sun glow
// deep water color mixed with shallow based on height
vec3 water = mix(uDeep, uShallow, smoothstep(-0.6, 0.6, vHeight));
// subsurface scattering: add some light through waves
vec3 col = mix(water, skyCol, fres);
// specular sun
vec3 H = normalize(uSunDir + V);
float spec = pow(max(dot(N,H),0.0), 250.0) * 3.0;
col += uSunColor * spec;
// sun glitter on crests
// foam
float foam = smoothstep(0.55, 0.9, vCrest) * ...
```
Note: `cameraPosition` is a built-in uniform in Three's shaders (yes, `cameraPosition` is provided by WebGLRenderer for all materials). Good.

For height-based color, shallow water near the island — we can approximate by using distance from origin: near the island shallow. Let's add: `float d = length(vWorldPos.xz); float shallow = 1.0 - smoothstep(18.0, 40.0, d);` giving turquoise near the island. That's nice and matches "deep/shallow color". Actually this makes water shallow around the island — realistic! Use `mix(uDeep, uShallow, shallow)` plus wave height effect.

Careful: the ocean plane covers the whole 400x400 including the island; near the island the water is turquoise. 

Fog: mix with fog color based on distance.

Now, sky reflection direction should also show the sun glow. Add:
```glsl
float sunGlow = pow(max(dot(R, uSunDir), 0.0), 8.0);
skyCol += uSunColor * sunGlow * 0.5;
```

Good.

Let me now write the wave definitions in TS to keep the JS heightAt matching:

```ts
const WAVES = [
  { dirX: 0.82, dirZ: 0.57, amp: 0.52, len: 34, speed: 6.0, steep: 0.55, phase: 0.0 },
  { dirX: -0.35, dirZ: 0.94, amp: 0.30, len: 19, speed: 4.2, steep: 0.45, phase: 1.7 },
  { dirX: 0.99, dirZ: -0.14, amp: 0.18, len: 11, speed: 2.8, steep: 0.35, phase: 3.1 },
  { dirX: -0.7, dirZ: -0.71, amp: 0.11, len: 6.5, speed: 1.9, steep: 0.3, phase: 5.2 },
];
```
Sum amplitudes = 1.11 → crest-to-trough ≈ 2.22 max. Requirement says 0.5–2 units crest-to-trough. Hmm, it's the sum of sines so max 2.22 only when all align; typical range smaller. Let's reduce: amplitudes 0.45, 0.26, 0.15, 0.08 = 0.94 → max 1.88. Good.

Wait, "crest-to-trough height about 0.5 to 2 units" — ok, 1.88 max.

Gerster steepness Q: with Q*A*k ≤ 1 to avoid loops. For wave 1: A=0.45, k=2π/34=0.1848, A*k=0.0832, Q=0.55 → 0.0457, fine. Actually steepness in Gerstner is usually Q*A*k where Q ~ 1/(A*k*numWaves). Our values are small so the horizontal displacement is small — that's fine and it says "for Gerstner waves ignore the small horizontal shift".

Hmm, with such small horizontal shifts, waves look like sine waves. Fine.

Now, JS heightAt:

```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    const omega = k * w.speed;
    const phase = k * (w.dirX * x + w.dirZ * z) - omega * t + w.phase;
    h += w.amp * Math.sin(phase);
  }
  return h;
}
```
Note dir must be normalized: 0.82²+0.57²=0.6724+0.3249=0.9973 ≈ 1. Good enough (normalize in shader would differ slightly). Better to normalize in TS and pass normalized values to GLSL, and have GLSL not normalize. Let's normalize in TS and remove normalize in the shader. Yes — that guarantees the match.

Compute normalized dirs:
- w1: (0.82, 0.57), len = sqrt(0.9973) = 0.99865 → (0.82111, 0.57077). Fine.
- w2: (-0.35, 0.94): 0.1225+0.8836=1.0061 → len 1.00305 → (-0.34894, 0.93714)
- w3: (0.99, -0.14): 0.9801+0.0196 = 0.9997 → len 0.99985 → ~(0.99015, -0.14002)
- w4: (-0.7,-0.71): 0.49+0.5041=0.9941 → len 0.99705 → (-0.70207, -0.71210)

I'll just do the normalization in code with a helper at load time.

Now the ocean uniform arrays: 
```ts
uWaves: { value: WAVES.map(w => new THREE.Vector4(w.dirX, w.dirZ, w.amp, w.len)) }
uWaveParams: { value: WAVES.map(w => new THREE.Vector4(w.speed, w.steep, w.phase, 0)) }
```
ShaderMaterial with array uniforms of Vector4 works.

Vertex shader needs `uTime`, `uWaves`, `uWaveParams`. Also `vWorldPos`, `vNormal`, `vHeight`, `vCrest`, `vViewZ` maybe.

Also I want the ocean to have a slight normal-map-like detail... skip.

Ocean grid: PlaneGeometry(400, 400, 200, 200) → 201*201 = 40401 vertices. Fine.

Hmm — the vertex shader displaces vertices; near the island the water plane at y≈0 would intersect the island. The island slopes down below water, so the ocean is drawn over the submerged part of the island. Since the ocean is opaque, the underwater island part will be hidden — good.

But wait: the ocean plane is drawn at y = wave displacement; where the island is above water, the ocean plane will still be drawn on top of the island where the wave crest is higher than the ground? Unlikely since the island is above y=0 and waves are within ±1. At the shoreline, waves ±1 will poke into the beach. Acceptable.

Consider the island's render order — both opaque, depth test handles it. Fine.

Shadows: DirectionalLight with shadow camera covering the island and boat: left/right/top/bottom ±40, near 1, far 200. Position the light at sunDir * 80, target at origin. Shadow map 2048. Set bias -0.0005, normalBias 0.5 maybe.

Hemisphere light: sky color light blue, ground color sandy, intensity ~0.8.

Now the boat:
Group at (12, 0.4, 14)? The boat's y = heightAt + offset. Let's set the group's position y = heightAt(x,z,t) + 0.35 (hull sits with the deck around y=0.35, hull bottom at -0.35). Boat hull local: deck at y=0, bottom at y=-0.7. So the floating offset means the waterline is at local y ≈ -0.3 → boat origin at y = waterHeight + 0.35. Let's use +0.45.

Boat parts:
1. Hull (custom geometry, dark blue/white paint) — MeshStandardMaterial color 0x2a3550 or white with a blue stripe. Let's do hull color 0xf0f0f0 with... Actually a wooden boat: hull sides painted deep blue 0x1e3a5f, and a wooden deck 0xb98a5a. But one mesh can only have one material; I can use vertex colors on the hull or split into two meshes: hull (dark blue) + deck (wood). Let's add a deck: a flattened box or a plane covering the top opening at y=0.01, color wood.

2. Cabin: BoxGeometry(1.0, 0.6, 1.2) at y=0.3, white.
3. Mast: CylinderGeometry(0.05, 0.06, 4.5) at y=2.2, near z=0.2. Wood color.
4. Sail: a triangular-ish plane. Use a Shape + ShapeGeometry: a triangle from (0,0) to (0,4) to (1.6, 0.4). Position near the mast, rotated. Material MeshStandardMaterial, side: DoubleSide, color 0xf7f3e8, roughness 0.9. Maybe slightly emissive/translucent.
5. Boom: a cylinder along the sail's foot.
6. A small flag at the mast top.
7. Maybe a rudder/tiller.

Also boat name? no textures allowed.

Boat casts shadows: set castShadow on children. Also receiveShadow maybe.

Sail: when the boat rocks the sail moves with it. Fine.

Should the sail be its own mesh? Yes.

Boat parts count ≥ 3 meshes → hull, deck, cabin, mast, sail, boom = 6.

Now, sail geometry using THREE.Shape:
```ts
const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.quadraticCurveTo(1.1, 1.2, 0.15, 3.6); // curved luff? 
```
Let's make a triangle-ish sail: points (0,0), (1.9, 0.5), (0.05, 3.6) with a curved leech. Simpler: 
```
shape.moveTo(0, 0);
shape.lineTo(0, 3.4);
shape.quadraticCurveTo(1.6, 2.0, 1.7, 0.25);
shape.lineTo(0, 0);
```
That gives a triangle with a curved hypotenuse. Good. ShapeGeometry with curveSegments 16. Then position the sail at (0, 0.5, 0.2) with rotation.y = -Math.PI/2? The sail plane is in XY; the boat's length is along Z; the sail should be in the YZ plane (fore-aft). So rotate the sail group by Math.PI/2 about Y so the sail's X axis maps to -Z... Let's put the sail mesh with rotation.y = -Math.PI/2 → local X → world -Z... whatever, it'll look fine either way as long as it's aligned along the boat. Actually a sail is aligned with the boat's fore-aft axis and vertical — so the sail plane should contain the Z and Y axes. The ShapeGeometry is in the XY plane, so rotate about Y by 90°, giving the XZ... rotate about Y by π/2 maps local +X to world -Z (for rotation about Y: x' = x cos + z sin... let's not fuss; rotating by π/2 about Y puts the plane in the YZ plane). Good.

Now the palms. Position 6 palms on the island at various spots where height > 1:

```
const palmSpots = [];
for (let i = 0; i < 8 && palmSpots.length < 6; i++) { ... }
```
Simpler: predefine candidate positions at radius 8-14 with angles, and verify islandHeight > 0.6; if not, push to a lower radius. Let's just pick fixed spots and check height; since the island is mostly solid at r<14, heights there are > 2. Let's pick:

angles: 0.3, 1.4, 2.5, 3.6, 4.7, 5.5 with radii 9, 11, 8, 12, 10, 7.

For each: x = r*cos(a), z = r*sin(a), y = islandHeight(x,z). Then trunk from y up to y + 3.5, curving.

Trunk curve: start at base, go up with a slight lean: control points:
```
p0 = (0,0,0)
p1 = (0.25*lean, 1.2, 0.1)
p2 = (0.9*lean, 2.4, 0.2)
p3 = (1.5*lean, 3.4, 0.3)
```
with lean in a random direction (rotate the whole trunk group).

Crown at the top of the trunk: leaves instanced there, with a slight offset.

Leaf instances: for each palm, 8-9 leaves, at the crown position, rotated around Y by i*2π/n + jitter, and tilted downward by ~20-40°. Plus scale variation.

Total instances = 6 palms × 9 leaves = 54 ≥ 30. Good.

InstancedMesh with the leaf geometry and MeshStandardMaterial(color 0x3f7a2e, side: DoubleSide, roughness 0.8). castShadow = true (instanced shadows work). receiveShadow = true.

Also add coconuts? Optional, skip or add a few small spheres — maybe skip to save code. Could add 2 coconuts per palm as one InstancedMesh? Not required. Skip.

Wind sway update: each frame, for each instance:
```
dummy.position.copy(basePos);
dummy.rotation.set(0,0,0);
dummy.quaternion.copy(baseQuat).multiply(swayQuat);
dummy.scale.copy(baseScale);
dummy.updateMatrix();
leafMesh.setMatrixAt(i, dummy.matrix);
```
where swayQuat is from Euler(swayX, swayY, swayZ). Since the leaf pivot is at the crown (geometry starts at origin), rotating the instance rotates the leaf about the crown. 

Compute sway: `const s = Math.sin(t * 1.8 + phase); angleZ = 0.10*s; angleY = 0.18*Math.sin(t*1.3 + phase*1.7);` plus a gust factor.

Also the trunk could sway slightly but not required.

Now, ocean time vs global time: The ocean's wave time = accumulated elapsed. I'll accumulate: `waveTime += delta * 1.0`. And also use elapsed for other animations. Let's just use a single `elapsed` variable from `clock.getElapsedTime()` and use it for the ocean time too, so heightAt(x,z,time()) matches. Use `const elapsed = clock.getElapsedTime()` each frame; set uTime = elapsed. `time()` returns `elapsed` (the last set value). Clean and matches exactly. Since we never pause/scale, elapsed == wave time. Good.

But careful: the requirement says `time()` returns the wave time in seconds the shader uses right now. Using elapsed exactly. 

Also `heightAt` must be the shader's displacement at undisplaced (x,z). Since we compute the wave phase from `position.xz` in the shader (model identity), and the plane geometry is centered at origin — yes matches world coords as long as the ocean mesh is at origin and unrotated/unscaled.

Now, one subtlety: the ocean vertex shader computes displacement from `position.xz` (undisplaced), so `heightAt(worldX, worldZ, t)` matches exactly. 

Now the camera: PerspectiveCamera at exactly (35,12,35) looking at (0,2,0). Set camera.position.set(35,12,35); camera.lookAt(0,2,0). Also OrbitControls optional — I'll skip OrbitControls to guarantee the exact view, or include with target (0,2,0) and no auto-rotate. Including OrbitControls means the camera might be moved by the user, but the test probably checks the initial position. The requirement says "keep this view (OrbitControls are allowed if they start there and do not move by themselves)". I'll include OrbitControls for interactivity with damping? Damping doesn't move by itself. Actually, enabling damping with no input doesn't move. But safer to skip controls entirely — fewer failure modes. Hmm, but a nice scene benefits from controls. I'll include them with target (0,2,0), enableDamping = true, and update() each frame — but that's fine, since it won't move without input. Actually with damping and no input, `update()` may keep applying zero movement — no change. OK, I'll include it. Hmm, but if the camera position gets changed by damping... no.

Risk: OrbitControls might alter camera.position on update due to... no, it only applies deltas. Fine. But the test may check camera.position after a frame; it stays (35,12,35). Include.

Hmm, actually one risk: OrbitControls with `enableDamping` calls `update()` which recalculates the camera position from spherical coordinates — it stores the spherical from the current offset each time, so it should stay identical (modulo floating point). Set dampingFactor 0.06. Actually to be safest: no damping, just plain OrbitControls. Then update() does nothing when idle. Let's do enableDamping = false. Fine.

Hmm, I want to be careful about tsc --strict with OrbitControls types — fine.

Sun position: elevation 14°, azimuth 120°. 
```
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
sunDir.setFromSphericalCoords(1, phi, theta);
```
Then `sky.material.uniforms['sunPosition'].value.copy(sunDir)`; directionalLight.position.copy(sunDir).multiplyScalar(90).

Hmm: `setFromSphericalCoords(radius, phi, theta)` where phi is polar angle from +Y. So with elevation e, phi = 90° - e. Good.

Directional light intensity: 2.5-3.5 with ACES exposure ~0.9.

Let's think about the ocean colors under ACES with exposure. MeshStandardMaterial + ACES + directional 3.0 → decent. The ocean ShaderMaterial outputs raw colors that then get tone-mapped? Yes — the renderer applies tone mapping in the fragment shader for output. Wait, for a ShaderMaterial, does Three apply tone mapping automatically? No! Tone mapping is applied via the `#include <tonemapping_fragment>` and `colorspace_fragment` includes which must be added manually in custom shaders. `WebGLProgram` adds `TONE_MAPPING` defines and the renderer sets `toneMappingExposure` uniform... but the actual tone mapping call happens in the shader chunk. So my custom ocean shader must include:

```glsl
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
at the end of main, with `gl_FragColor` set before. These chunks operate on `gl_FragColor`. In newer three versions (r152+), `colorspace_fragment` is:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
which requires the `<colorspace_pars_fragment>`? Actually `linearToOutputTexel` is defined in the shader prefix by the renderer (getTexelEncodingFunction) appended to the fragment prefix. It's added automatically by WebGLProgram for all materials? Let's check: WebGLProgram's fragment prefix includes `getTexelEncodingFunction('linearToOutputTexel', parameters.outputColorSpace)` — yes, in the prefixFragment for all shaders (both ShaderMaterial and built-ins). Hmm, in r155 the prefix includes it. So `#include <colorspace_fragment>` works in a ShaderMaterial.

Similarly `tonemapping_fragment` requires the `toneMapping` function defined via `getToneMappingFunction` in the prefix — included for all materials when toneMapping !== NoToneMapping. And `toneMappingExposure` uniform is automatically set.

So including these two chunks at the end of my fragment shader is correct and makes the ocean tone-mapped consistently. 

Also need `ShaderMaterial` to be a raw shader — but the includes are resolved by Three's shader chunk parser for ShaderMaterial too (yes, resolveIncludes applies to all shaders). Good.

Alternatively, use `gl_FragColor = vec4(col, 1.0)` then `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`.

Note: in three r163+ WebGL2 with GLSL3? ShaderMaterial defaults to GLSL1 with gl_FragColor available. Should be fine as long as I don't set glslVersion. Recent three versions still support gl_FragColor in GLSL1 shaders.

Which three version? The import map presumably resolves 'three' to a recent version. Let's target r160-ish API. Things to avoid: `THREE.sRGBEncoding` (removed), use `renderer.outputColorSpace = THREE.SRGBColorSpace` (default anyway). `renderer.useLegacyLights` removed. Light intensities are physical-ish since r155 (WebGLRenderer.useLegacyLights = false default). In r155+, DirectionalLight intensity ~3 is reasonable for sun.

Let me now also handle `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.

Now write the code.

Structure:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------- constants / waves ----------
type WaveDef = { dirX: number; dirZ: number; amp: number; len: number; speed: number; steep: number; phase: number };

const WAVE_DEFS: WaveDef[] = [...]; // normalized dirs

function heightAt(x, z, t) {...}

// ---------- renderer/scene/camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd8e8, 90, 420);
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 3000);
camera.position.set(35,12,35);
camera.lookAt(0,2,0);
```

Hmm fog color should match the horizon sky color. Sky at horizon with sun elev 14° → pale blue/white. Use 0xcfe3f0.

Sky mesh scale: 2000? The fog far is 420 and the sky is a box of size 2000 (half-extent 1000) so it's beyond the fog. Sky material has fog: false by default? Sky's ShaderMaterial — I need to make sure the sky is not fogged (it would be entirely fogged at distance 1000 → fully fog colored). Sky.js's material has `fog: false`? Let's check Sky.js source: 

```js
const material = new THREE.ShaderMaterial({
    name: 'SkyShader',
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: THREE.UniformsUtils.clone(shader.uniforms),
    side: THREE.BackSide,
    depthWrite: false
});
```
No `fog: false`... Material.fog defaults to `true`! Hmm, but Sky's shaders don't include fog chunks, so no fog is applied regardless. However `parameters.useFog && parameters.fog` adds `#define USE_FOG` — harmless if unused. But the renderer will try `refreshFogUniforms` on the Sky material's uniforms... In setProgram: `if ( material.fog === true && materialProperties.fog !== fog )` → `materialProperties.fog = fog; if (uniforms.fogColor !== undefined)...` hmm, actually the code is:

```js
if ( refreshMaterial ) {
  ...
  if ( material.fog === true && fog ) { ... }
}
```
Let me recall exactly. In WebGLRenderer.setProgram:

```js
if ( refreshMaterial || materialProperties.receiveShadow !== object.receiveShadow ) { ... }
...
if ( materialProperties.needsLights ) { ... }
if ( fog && material.fog === true ) {
    materials.refreshFogUniforms( m_uniforms, fog );
}
```
And refreshFogUniforms:
```js
function refreshFogUniforms( uniforms, fog ) {
	fog.color.getRGB( uniforms.fogColor.value, getUnlitUniformColorSpace( renderer ) );
	if ( fog.isFog ) {
		uniforms.fogNear.value = fog.near;
		uniforms.fogFar.value = fog.far;
	} else if ( fog.isFogExp2 ) {
		uniforms.fogDensity.value = fog.density;
	}
}
```
If Sky's uniforms don't have fogColor → `uniforms.fogColor.value` throws TypeError! Hmm, that would be a real bug. But Sky is used in official examples with scene.fog? Probably not. Let me check: `materials.refreshFogUniforms` — in three r150+:

```js
if ( material.fog === true && fog ) {
    materials.refreshFogUniforms( m_uniforms, fog );
}
```
Hmm, wait, actually the guard might be `if ( material.fog === true && fog && m_uniforms.fogColor !== undefined )`? Let me think about three's actual source... I recall:

```js
if ( material.fog === true && fog ) {
    materials.refreshFogUniforms( m_uniforms, fog );
}
```
Hmm. To be safe, set `sky.material.fog = false` (not in the type declaration? ShaderMaterial has `fog: boolean` property — yes, Material has `fog`). Actually `Sky` extends Mesh, and `sky.material` is typed as `ShaderMaterial` in the .d.ts? Sky.d.ts: `export class Sky extends Mesh { constructor(); material: ShaderMaterial; ... }`. Hmm, in newer three types, Sky extends Mesh<BufferGeometry, ShaderMaterial>. Setting `.fog = false` is fine.

Alternatively, just don't add scene.fog... no, fog is required.

To be extra safe: set `sky.material.fog = false;` — I'll cast to any? No: `sky.material` is `ShaderMaterial` which has a `fog` property in the type declarations (three's Material has `fog: boolean`). Actually in recent three types, `Material` has `fog: boolean`? Let me recall the TypeScript definitions: 

```ts
export class Material {
    ...
    fog: boolean;
    ...
}
```
Yes, Material has `fog: boolean` in three's types (it's set for standard materials). Hmm, actually I recall in Material: `alphaTest`, `alphaHash`, `blending`, `blendSrc`, ... `fog: boolean`. Yes, it's there.

OK, so `sky.material.fog = false;`.

Now let me write the ocean shader.

Vertex:

```glsl
#define NWAVES 4
uniform float uTime;
uniform vec4 uWaves[NWAVES];
uniform vec4 uWaveParams[NWAVES];

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vCrest;

void main() {
  vec2 p = position.xz;
  float h = 0.0;
  float crest = 0.0;
  vec3 dX = vec3(1.0, 0.0, 0.0);
  vec3 dZ = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < NWAVES; i++) {
    vec4 w = uWaves[i];
    vec4 q = uWaveParams[i];
    vec2 dir = vec2(w.x, w.y);
    float k = 6.28318530718 / w.w;
    float omega = k * q.x;
    float phase = k * dot(dir, p) - omega * uTime + q.z;
    float A = w.z;
    float Q = q.y;
    float s = sin(phase);
    float c = cos(phase);
    h += A * s;
    float qak = Q * A * k;
    dX.x -= qak * dir.x * dir.x * s;
    dX.y += A * k * dir.x * c;
    dX.z -= qak * dir.x * dir.y * s;
    dZ.x -= qak * dir.x * dir.y * s;
    dZ.y += A * k * dir.y * c;
    dZ.z -= qak * dir.y * dir.y * s;
    crest += A * s; // just use height for foam
  }
  vec3 pos = vec3(position.x, h, position.z);
  vec3 nrm = normalize(cross(dZ, dX));
  vWorldPos = pos;
  vNormal = nrm;
  vHeight = h;
  vCrest = crest;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```
Wait, the plane geometry rotated to be horizontal: after `geometry.rotateX(-Math.PI/2)`, position.xz spans the grid and position.y = 0. Good.

But careful: `vWorldPos = pos` assumes modelMatrix identity. It is (ocean mesh at origin, no rotation/scale, since rotation baked into geometry). Good.

Hmm, but the plane's vertex.y = 0 always, and we set pos.y = h. Then normal in world = nrm. Good.

The crest measure: h relative to total amplitude. In the fragment, foam = smoothstep(0.6, 0.95, vCrest / 0.95)? Let's normalize: `float hNorm = vCrest / TOTAL_AMP` where TOTAL_AMP is a uniform (sum of amplitudes = 0.94). Then foam threshold ~0.55.

Actually, using the height alone gives foam on all big crests — fine, that's what we want.

Fragment:

```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTotalAmp;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vCrest;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  if (!gl_FrontFacing) N = -N; // not needed

  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
  fres = mix(0.03, 1.0, fres);

  vec3 R = reflect(-V, N);
  float up = clamp(R.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(uSkyHorizon, uSkyTop, pow(clamp(R.y, 0.0, 1.0), 0.7));
  float sunGlow = pow(max(dot(R, uSunDir), 0.0), 24.0);
  sky += uSunColor * sunGlow * 0.9;

  float dist = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(18.0, 46.0, dist);
  shallow *= 0.9;
  vec3 baseWater = mix(uDeepColor, uShallowColor, shallow * 0.75 + 0.25 * smoothstep(-0.5, 0.9, vHeight));

  vec3 col = mix(baseWater, sky, fres);

  // sun specular
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 400.0);
  col += uSunColor * spec * 3.0;

  // foam on crests
  float hN = vCrest / uTotalAmp;
  float foam = smoothstep(0.62, 0.95, hN);
  foam *= smoothstep(0.0, 0.35, ...); // ripple noise
  col = mix(col, vec3(0.9, 0.95, 1.0), foam * 0.65);

  // fog
  float d = length(cameraPosition - vWorldPos);
  float fogF = smoothstep(uFogNear, uFogFar, d);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Careful with the color space: my uniform colors — if I create them with `new THREE.Color(0x...)`, ColorManagement converts to linear working space. Custom shader uniforms get the linear value. Since I then output through `colorspace_fragment` (linear → sRGB), it's consistent. Good. But the `uFogColor` must match `scene.fog.color` which is also a Color (linear internally). Good — set uFogColor from scene.fog.color.

Hmm, but the fog on other materials is applied in linear space before tone mapping. My ocean fog is applied in linear space too, then tone-mapped. Consistent-ish.

Wait: fog is applied before tone mapping in standard materials too. Yes (`fog_fragment` before `tonemapping_fragment`). Good.

One thing: `cameraPosition` built-in uniform — available in fragment shaders? Yes, `cameraPosition` is declared in the common prefix for both vertex and fragment shaders (in `prefixFragment`, `uniform vec3 cameraPosition;` is included). Actually let me double-check: three's `WebGLProgram` prefixVertex includes:
```
uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;
```
prefixFragment includes:
```
uniform mat4 viewMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;
```
Yes, both. Good, so I don't need to declare `cameraPosition`.

Also `gl_FrontFacing` usage not needed.

Note: the ShaderMaterial's built-in uniforms (`modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `cameraPosition`) are auto-provided. Good.

For the specular exponent: 400 might be too tight for a 200-segment grid; normals vary per-vertex smoothly so highlights are computed per-pixel with interpolated normals — fine, gives a small sun glitter. Use 220 for a broader highlight, times intensity.

Now: the sky reflection uses R.y only — fine.

Now let me consider the `uSunDir`: it must be the direction *toward* the sun (normalized). Good.

Now the island:

```ts
function valueNoise2(x: number, z: number): number // smooth hash noise
```

Implementation of a simple hash-based value noise:

```ts
function hash2(ix: number, iz: number): number {
  let h = ix * 374761393 + iz * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) / 4294967295);
}
```
Careful with 32-bit overflow in JS: use Math.imul.

```ts
function hash2(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
```

```ts
function noise2(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx*fx*(3-2*fx), uz = fz*fz*(3-2*fz);
  const a = hash2(ix, iz), b = hash2(ix+1, iz), c = hash2(ix, iz+1), d = hash2(ix+1, iz+1);
  return (a*(1-ux)+b*ux)*(1-uz) + (c*(1-ux)+d*ux)*uz;
}
function fbm(x, z) { let v=0, a=0.5, f=1; for 4 octaves: v += a*noise2(x*f, z*f); f*=2; a*=0.5; return v; } // returns 0..~1
```

islandHeight:
```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const t = Math.max(0, 1 - r / 27);
  const n = fbm(x * 0.09 + 11.3, z * 0.09 + 7.7) - 0.5; // -0.5..0.5
  const ridge = Math.cos(Math.atan2(z, x) * 2.0) * 0.8;
  let h = 13.0 * Math.pow(t, 1.7);
  h += (n * 6.0 + ridge) * t;
  h -= 1.4;
  // flatten beach a bit near the waterline
  return h;
}
```
At r=0: t=1 → h = 13 + (n*6 + ridge) - 1.4 = 11.6 + noise. Could exceed 15? 11.6 + 3 + 0.8 = 15.4. Requirement: peak 5-15 above water. Let's keep it ≤ 14. Use 12.0 * pow(t,1.7) + (n*4.5 + ridge)*t - 1.3 → max ≈ 12+2.25+0.8-1.3 = 13.75. But the actual peak might not be at r=0 with noise. Good.

But hmm — the peak must be > 5. At t=1 (r=0) h ≈ 10.7 + noise*(4.5). Fine.

Vertex colors:
```ts
const sand = new THREE.Color(0xd9c48f); // warm sand
const grass = new THREE.Color(0x4f7a3a);
const rock = new THREE.Color(0x6b6459);
```
Color by height h with noise:
- h < 0.8 → sand (wet sand darker at h<0.2)
- 0.8..3.5 → blend sand→grass
- 3.5..9 → grass, with rock streaks where noise high
- > 9 → rock

Also steep slopes → rock. Compute slope from neighbors? Simpler: use height + noise. I'll compute the slope approximately by sampling the height function at ±0.6 in x and z. That's 4 extra height evaluations per vertex × 9409 vertices = 37k evaluations of fbm (4 octaves) — fine at load.

Actually let's use a simpler rock factor from noise: `rockiness = smoothstep(0.6,0.9, fbm(x*0.15, z*0.15))`.

Let's do slope-based since it looks better:
```ts
const e = 0.7;
const hx = islandHeight(x+e, z) - islandHeight(x-e, z);
const hz = islandHeight(x, z+e) - islandHeight(x, z-e);
const slope = Math.hypot(hx, hz) / (2*e);
```
That's 4 extra calls × 9409 = 37k, fine (fbm 4 octaves × 4 = 16 noise evaluations each → 150k noise evals... ~ fine, maybe 50ms).

Hmm, geometry 96×96 = 9409 vertices. OK.

Then `rockMix = smoothstep(0.35, 0.9, slope)`.

Colors:
```ts
const c = new THREE.Color();
if (h < 0.0) → underwater: sandy darker
```
Let's do:
```ts
const sandCol = new THREE.Color(0xe6d3a3);
const wetSand = new THREE.Color(0xc9b183);
const grassCol = new THREE.Color(0x5d8a3f);
const darkGrass = new THREE.Color(0x3f6b2e);
const rockCol = new THREE.Color(0x7a7468);
```

Blend:
```ts
let col = wetSand.clone().lerp(sandCol, smoothstep(-0.6, 0.9, h));
col.lerp(grassCol.clone().lerp(darkGrass, noise), smoothstep(1.0, 3.2, h));
col.lerp(rockCol, smoothstep(0.45, 1.1, slope) * smoothstep(2.0, 5.0, h));
```
Also darken underwater parts.

Use THREE.MathUtils.smoothstep(x, min, max) — it exists: `THREE.MathUtils.smoothstep(x, min, max)`. Yes.

Island geometry: PlaneGeometry(64, 64, 100, 100)? That's 10201 verts. Rotate to horizontal, then displace y = islandHeight(x,z). Also for points beyond r=27 we want the geometry to slope down underwater and not be visible. islandHeight returns negative far out. At r = 45 (the plane corner at 32*√2=45): t = max(0, 1-45/27) = 0 → h = -1.4. So the terrain is flat at -1.4 underwater beyond the island — hidden by the ocean (which is opaque). Fine. But wait — the ocean plane at those points might have wave troughs below -1.4, exposing the seabed. Max trough is -0.94. So -1.4 seabed stays under water. Good. Alternatively set the far terrain to -3 to be safe. Let's make the outside fall off to -3: h = 12*t^1.7 ... with t clamped at 0 gives -1.3. Let's subtract more outside: `h -= 1.3 + (1 - t) * 1.5`? At t=0 → -2.8. At t=1 → -1.3 (center is unaffected since t=1 → 0 extra). Hmm, that would make the waterline shift. Let's compute: shoreline where h=0: 12*t^1.7 + noise*t - 1.3 - 1.5*(1-t) = 0. With noise 0: 12 t^1.7 + 1.5 t - 2.8 = 0. Try t=0.45: 12*0.45^1.7 = 12*0.2594 = 3.11; +0.675 - 2.8 = 0.985 > 0. t=0.35: 12*0.35^1.7=12*0.1708=2.05; +0.525-2.8 = -0.225. So the shoreline is around t=0.37 → r = 27*(1-0.37) = 17. So the island is ~34 units across. Requirement: 30-50 across. Good.

Let's simplify and keep a clean formula:

```ts
function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const t = clamp(1 - r / 27, 0, 1);
  const n = fbm(...) - 0.5;
  const ridge = 0.8 * Math.cos(2 * Math.atan2(z, x));
  const base = 13 * Math.pow(t, 1.65);
  const bump = (n * 5.0 + ridge) * t;
  const drop = -1.35 - 1.6 * (1 - t);
  return base + bump + drop;
}
```
At t=1 (center): 13 + noise*5 + 0.8 - 1.35 → max 13+2.5+0.8-1.35 = 14.95. Hmm right at 15. Reduce base to 12 → max 13.95. Good.

Waterline: 12 t^1.65 + 1.6t - 2.95 = 0 → t≈0.40 → r = 16.2 → 32 units across. Good, within 30-50.

Hmm, but the noise makes the shoreline irregular. Good.

Now the island mesh:
```ts
const geo = new THREE.PlaneGeometry(60, 60, 120, 120);
geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position as THREE.BufferAttribute;
const colors = new Float32Array(pos.count * 3);
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i);
  const y = islandHeight(x, z);
  pos.setY(i, y);
  ... colors
}
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geo.computeVertexNormals();
const island = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 }));
island.receiveShadow = true;
island.castShadow = true;
```
60x60 plane with 120x120 segments = 0.5 unit spacing. Good detail. 14641 vertices — that's fine.

Hmm, `castShadow` on the terrain is good for palm shadows.

One issue: with 120x120 segments and 0.5 spacing, the noise in islandHeight at 0.09 frequency is smooth. Good.

Now palms: positions. Let's pick 6 palms on the island with x,z chosen radially:

```ts
const palmDefs = [
  { a: 0.5, r: 9.5, lean: 0.4, h: 5.2 },
  { a: 1.6, r: 11.0, lean: 0.55, h: 4.6 },
  { a: 2.7, r: 8.0, lean: 0.3, h: 5.6 },
  { a: 3.9, r: 10.5, lean: 0.45, h: 4.9 },
  { a: 5.0, r: 9.0, lean: 0.5, h: 5.4 },
  { a: 5.9, r: 6.5, lean: 0.35, h: 6.0 },
];
```
Careful: angles should be spread out, and radius ≤ 16 so they're on land. With r=11 the ground height: t = 1-11/27 = 0.593; 12*0.593^1.65 = 12*0.4293 = 5.15; + 1.6*0.593 = 0.95; - 2.95 → 3.15 + noise*5*0.593 ±1.5. So the ground is around 3-4.5 above sea level. Fine.

For each palm, trunk height ~4.5-6.

Trunk curve (local, base at origin):
```ts
const leanDir = angle of lean;
const pts = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(lean*0.15, height*0.35, 0),
  new THREE.Vector3(lean*0.55, height*0.7, 0),
  new THREE.Vector3(lean*1.0, height, 0),
];
const curve = new THREE.CatmullRomCurve3(pts);
const tube = new THREE.TubeGeometry(curve, 24, 0.22, 8, false);
// taper
```
Taper post-process: for vertex index i = vertexIndex, tubularIndex = floor(i / (radialSegments+1)); u = tubularIndex / tubularSegments; center = curve.getPointAt(u)?? TubeGeometry uses `curve.computeFrenetFrames(tubularSegments, closed)` and `curve.getPointAt(i/tubularSegments)` (for non-closed, it uses getPointAt? It uses `path.getPointAt(u)`). Hmm, `getPointAt` requires arc-length parameterization. Whatever — I'll compute the center as the average of the ring vertices instead! For each ring, compute the centroid of the (radialSegments+1) vertices, then scale the offsets toward the centroid by taper(u). That's robust.

```ts
const radialSegments = 8;
const tubularSegments = 24;
const ring = radialSegments + 1; // 9
const p = tube.attributes.position;
const v = new THREE.Vector3(), c = new THREE.Vector3();
for (let iu = 0; iu <= tubularSegments; iu++) {
  const u = iu / tubularSegments;
  // centroid
  c.set(0,0,0);
  for (let iv = 0; iv < ring; iv++) {
    const idx = iu * ring + iv;
    c.x += p.getX(idx); c.y += p.getY(idx); c.z += p.getZ(idx);
  }
  c.multiplyScalar(1 / ring);
  const scale = 1 - 0.55 * u; // taper toward the top
  for (let iv = 0; iv < ring; iv++) {
    const idx = iu * ring + iv;
    v.set(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(c).multiplyScalar(scale).add(c);
    p.setXYZ(idx, v.x, v.y, v.z);
  }
}
tube.computeVertexNormals();
```
Good.

Trunk material: MeshStandardMaterial color 0x8b6f4b, roughness 0.9. Add subtle rings? Not needed.

Trunk orientation: rotate about Y by the lean direction and place the base at the ground.

Actually the trunk curve leans in +X locally. Then set `trunk.rotation.y = leanAngle`. And position at (x, groundY - 0.1, z).

Crown position in world: base + rotated (lean*1.0, height, 0) → compute:
```ts
const crownLocal = new THREE.Vector3(lean, height, 0);
const crown = crownLocal.clone().applyAxisAngle(new THREE.Vector3(0,1,0), leanAngle).add(basePos);
```

Leaves: instance count = 6 palms × 9 = 54.

For each leaf instance: position = crown, rotation: quaternion from Euler with yaw = i*2π/9 + palmRandom, pitch down = -(0.25..0.6) rad, plus roll. Scale: 0.85..1.15.

The leaf geometry extends along +X and droops in -Y. So a pitch rotation about Z (negative rotates +X downward): rotate about Z by -tilt would point +X down. Let's use Euler order: build the quaternion via `new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))`. With YXZ order: yaw applied first (about Y), then pitch about the new X axis. Hmm, I want: direction = (cos yaw, 0, sin yaw) horizontal, tilted down by angle t. That is: take the local +X axis, rotate about Y by yaw, then rotate downward about the horizontal axis perpendicular to the direction. The perpendicular horizontal axis for direction (cos yaw, 0, sin yaw) is (sin yaw, 0, -cos yaw)... For a rotation about Y by yaw: local +X → (cos yaw, 0, -sin yaw) in three's convention (Ry(θ)*(1,0,0) = (cosθ, 0, -sinθ)). Then to tilt down, rotate about the axis perpendicular to that in the XZ plane, which is local +Z rotated... 

Simpler: use Euler('YXZ') where rotation.y = yaw and rotation.z = -tilt. In YXZ order, the rotation matrix = Ry * Rx * Rz. So Rz first (about local Z): +X → (cos tilt, -sin tilt... wait Rz(a)*(1,0,0) = (cos a, sin a, 0). For a negative tilt a = -t: (cos t, -sin t, 0) → points down. Then Rx (identity), then Ry(yaw) rotates it around Y: → (cos t cos yaw, -sin t, -cos t sin yaw). Good: it points outward at angle yaw and downward. 

So `euler.set(0, yaw, -tilt, 'YXZ')`. Plus a small random roll (rotation.x) for variety.

For the sway animation, I keep base quaternion `qBase` and multiply by a sway quaternion:
```
const sway = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06*Math.sin(t*1.7+ph), 0.12*Math.sin(t*1.1+ph*1.7), 0.09*Math.sin(t*2.3+ph*0.6), 'YXZ'));
dummy.quaternion.copy(qBase).multiply(sway);
```
Multiplying on the right applies the sway in the leaf's local frame — good (pivot at the crown).

Also add a slight scale pulse? no.

Set `leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

Also need to call `leafMesh.computeBoundingSphere()`? For frustum culling with changing matrices — the instance matrices change but only slightly, so the initial bounding sphere is fine. Since we set matrices in the constructor before the first render... Actually InstancedMesh computes the bounding sphere from instanceMatrix when needed for raycasting; frustum culling uses `geometry.boundingSphere` transformed by the mesh's matrixWorld — for InstancedMesh, three computes `this.boundingSphere` if null via `computeBoundingSphere()`. It's computed lazily in `frustumCulled` checks? In WebGLRenderer's projectObject: `if (object.frustumCulled === false || _frustum.intersectsObject(object))`. `Frustum.intersectsObject` uses `object.boundingSphere` for InstancedMesh? Actually:

```js
intersectsObject( object ) {
    if ( object.boundingSphere !== undefined ) {
        if ( object.boundingSphere === null ) object.computeBoundingSphere();
        _sphere.copy( object.boundingSphere ).applyMatrix4( object.matrixWorld );
    } else {
        const geometry = object.geometry;
        if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();
        _sphere.copy( geometry.boundingSphere ).applyMatrix4( object.matrixWorld );
    }
    return this.intersectsSphere( _sphere );
}
```
InstancedMesh has a boundingSphere property (null initially) → computeBoundingSphere from instances. So it will be computed on the first frame after matrices are set. Good. Since we set the matrices before rendering, it's fine. And the sway doesn't move leaves far.

Actually, to be safe I'll set `leafMesh.frustumCulled = false;` — it's one draw call anyway. Fine.

Now the boat geometry details.

Hull construction:

```ts
function createHull(): THREE.BufferGeometry {
  const lengthSegs = 24;
  const radialSegs = 18;  // around the U cross-section
  const halfLength = 2.0;
  const beam = 0.78;
  const deckY = 0;
  const keelDepth = 0.62;

  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  // grid of (i along length, j around cross section)
  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;     // 0 = stern, 1 = bow
    const z = -halfLength + 2 * halfLength * t;
    // width profile
    const taper = Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.55);  // hmm
    ...
  }
}
```
Let's define width(t): use `w = beam * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * t)), 0.5)`? Hmm.

Let me think about the shape: stern (t=0) should be fairly wide (transom), bow (t=1) pointed.

`w(t) = beam * (1 - t^2.0) * (0.85 + 0.15*Math.sin(Math.PI*t))` — at t=0: beam*1*0.85 = 0.663; at t=0.5: beam*(0.75)*(1.0) = 0.585; at t=1: 0. Hmm, the widest should be around t=0.4-0.5.

Try: `w(t) = beam * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.45)/0.55, 2)))` for t > 0.45... messy.

Alternative approach: define `w(t) = beam * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.6)`. At t=0 → 0 (pointed stern, bad).

Let's use a superellipse-ish: `w(t) = beam * Math.pow(1 - t, 0.35) * Math.pow(1 - Math.pow(1 - t, 3), 0.4)`? Too fiddly.

Practical: `w(t) = beam * Math.pow(Math.sin(Math.PI * (0.12 + 0.44 * t)), 0.85)`. At t=0: sin(0.12π)=0.368 → 0.368^0.85=0.427 → w=0.33. At t=0.5: sin(0.34π)=sin(61°)=0.875 → 0.89 → 0.695. At t=1: sin(0.56π)=sin(100.8°)=0.982 → 0.985 → 0.77. That makes the bow wide. Wrong direction.

OK, let's just parametrize by hand with a piecewise smooth function. Boat length 4 (z from -2 to 2). Let:
- Stern at z=-2: width 1.2 (transom, total beam).
- Widest at z=-0.4: width 1.5.
- Bow at z=+2: width 0.05.

Use a simple polynomial in s = (z + 2)/4 ∈ [0,1]:
`w = 0.75 * (1 - s^3)` where 0.75 is the half-beam. At s=0: 0.75 (beam 1.5). At s=0.5: 0.75*0.875=0.656. At s=1: 0. Hmm, the widest is at the stern, which is okay-ish for a small dinghy (the stern is the widest). Good enough, plus the hull tapers to a point at the bow.

Add a bit of extra fullness amidships: `w = 0.75 * (1 - 0.92 * Math.pow(s, 2.6))`. At s=0.5: 0.75*(1-0.92*0.165)=0.75*0.848=0.636. Fine.

Cross-section: for j from 0..radialSegs, angle θ = π * j/radialSegs (from 0 to π), giving x = w*cos θ, y = -depth*sin θ * (something). At θ=0 → x=w, y=0 (deck edge, starboard). At θ=π → x=-w, y=0 (port deck edge). At θ=π/2 → x=0, y=-depth (keel). Good, a semi-ellipse.

Depth also varies along the length: d(s) = 0.62 * Math.pow(1 - 0.6*Math.pow(s,2.2), 1)? At the bow depth is less. Also add sheer: the deck line at y = deckRise(s) which is higher at the bow (sheer). Let's have the deck edge y = 0.12 * Math.sin(Math.PI * s) * ... eh. Keep the deck at y=0 for simplicity, and add a slight rise at the bow: y_deck = 0.10 * s^2. Then the hull edges at y = 0.10*s^2.

So: for each (i,j): 
```
s = i/lengthSegs; z = -2 + 4*s;
w = halfBeam(s); d = depth(s); rise = 0.12*s*s;
theta = PI * j/radialSegs;
x = w * cos(theta);
y = rise - d * sin(theta);
```
With this, the top edge (j=0 and j=radialSegs) are at y=rise. Then the deck covers the opening. The hull is a shell; it's open at the top and open at the stern (transom). Since we only see the outside from above, the inside is visible when looking into the boat from the camera at (35,12,35) — we'd see the hull interior (backfaces, culled → holes). Add a deck mesh covering the top, so we won't see inside much. Deck: a flat shape following the outline at y = rise... but the deck should be below the gunwale. Let's just build a deck as a triangle strip between the port and starboard edges at the top: for each i, connect (j=0) and (j=radialSegs). That closes the top. Then the boat interior is invisible. And with a dark wood deck it looks good.

Hmm, but then the cabin sits on the deck at y ≈ 0.05. Good.

Also close the stern: the transom. j = 0..radialSegs at i = 0 forms a curve; add a fan to close it. Let's just add a triangle fan from the centroid of the stern ring. Or simpler — since the deck covers the top, the stern opening would only be visible from behind at the waterline; add a fan.

Let's add both: stern transom fan and the deck.

Actually simpler: make the deck the top surface, and add the transom as a fan. Fine, a bit of code.

Alternatively use a single geometry with indices and add the deck as a separate mesh (wood color) — that's better for material variety: hull mesh (blue) + deck mesh (wood). Deck as a separate geometry built from the gunwale outline: a triangle strip along the length connecting the port and starboard top edges, but that's a flat ribbon of zero thickness — fine (it's a plane). Actually the deck should be slightly below the gunwale. Let's put it at y = rise - 0.06. And make it slightly narrower (0.94 * w). Fine.

Hmm, but the deck must be opaque; a plane with FrontSide facing up: build the vertices in order so that the winding gives an upward normal. I'll compute normals afterward with computeVertexNormals and check winding... Rather than fuss: use `side: THREE.DoubleSide` for the deck material. Simple and safe.

Actually, for the hull, I need correct winding for outward normals. Let me think: with indices (i, j) grid, quad = [a(i,j), b(i+1,j), c(i+1,j+1), d(i,j+1)]. I'll just use DoubleSide for the hull too? That would look bad with lighting on the inside faces... but the inside is hidden by the deck. Let's compute the winding carefully, or simply use `geometry.computeVertexNormals()` and check the sign of the normal at a known vertex. Alternative robust approach: after computing normals, check a specific vertex: at the widest point (starboard side, θ ≈ 0.3π), the normal should point outward (+x). If it doesn't, flip the index order. Too fiddly.

Let me reason: The parametric surface P(i,j) with i along +z and j increasing θ from 0 to π where x = w cos θ decreases from +w to -w. So the surface goes: at j=0, +x side; at j=π, -x side. The tangent along i is ∂P/∂i ≈ +z direction. The tangent along j is ∂P/∂j ≈ (dx/dθ, dy/dθ, 0) with dx/dθ = -w sinθ < 0 for θ∈(0,π), dy/dθ = -d cosθ.

Normal = ∂i × ∂j = (0,0,1) × (dx, dy, 0) = ( -dy, dx, 0 )? Cross product (0,0,1)×(a,b,0) = (0*0 - 1*b, 1*a - 0*0, 0*b - 0*a) = (-b, a, 0). With a = dx/dθ < 0 and b = dy/dθ. At θ = π/2 (bottom/keel): dx/dθ = -w, dy/dθ = 0 → normal = (0, -w, 0) → points down. Correct for the keel (outward = down).

At θ = 0.3π: dx/dθ = -w sin(0.3π) = -0.8w <0; dy/dθ = -d cos(0.3π) = -0.588d < 0. Normal = (-dy, dx, 0) = (0.588d, -0.8w, 0) → points +x and -y. Outward at the starboard bow region: yes, the outward normal there points +x and downward-ish. Correct!

So with the vertex order (i,j) and quad indices [ (i,j), (i,j+1), (i+1,j+1), (i+1,j) ] — need to get the winding right so that the normal = ∂i × ∂j.

For a triangle with vertices A=(i,j), B=(i,j+1), C=(i+1,j+1): edge AB ≈ ∂j, edge AC ≈ ∂i + ∂j. Normal = AB × AC = ∂j × (∂i+∂j) = ∂j × ∂i = -(∂i × ∂j). That's inverted. So use A=(i,j), B=(i+1,j), C=(i+1,j+1): AB = ∂i, AC = ∂i+∂j, normal = ∂i × (∂i+∂j) = ∂i × ∂j. Correct!

So the quad indices: [a, b, c] and [a, c, d] where a=(i,j), b=(i+1,j), c=(i+1,j+1), d=(i,j+1). Let's verify the second triangle: A=a, B=c, C=d: AB ≈ ∂i+∂j, AC ≈ ∂j → normal = (∂i+∂j)×∂j = ∂i×∂j. Correct.

So indices order: a, b, c and a, c, d with a = i*(rows) + j, b = (i+1)*rows + j, c = (i+1)*rows + j+1, d = i*rows + j+1.

Good. Then computeVertexNormals gives outward normals.

I'll also add a UV? Not needed (no textures).

Then the hull mesh: material color 0x25405e (deep navy) roughness 0.45 metalness 0.1. Actually a classic white hull with a blue bottom. Let's go with a rich teal/navy: 0x1c3f5c, roughness 0.5.

Deck: wood 0xb08a5a, roughness 0.85.

Cabin: white 0xf2efe6 box (1.0 w, 0.55 h, 1.2 l) at (0, 0.3, -0.6). Plus a cabin roof? Just the box with maybe a smaller box on top. Keep a simple box + windows? Windows would need extra meshes. Let's add a small dark box "window" strip: a box slightly larger in z... meh, skip.

Mast: cylinder radius 0.045, height 4.6, at (0, 2.4, 0.35) — hmm, the mast should be at about z=0.2 from the cabin forward. The deck is at y≈0.05. The mast base at y=0.05, top at 4.65. So position y = 2.35, height 4.6.

Sail: shape height 3.6, width 1.7. Position at the mast. Rotated to be in the ZY plane. Its base at y = 0.9 (above the deck) and extending aft. Let's place the sail mesh at position (0, 0.9, 0.35) and rotation.y = Math.PI/2 so it lies in the ZY plane, with the local +X mapping to -Z (aft) or +Z. With rotation.y = π/2: Ry(π/2) maps (1,0,0) → (0,0,-1). So the sail's local +X extends toward -Z (aft, since the bow is +Z). Good: sail extends aft from the mast.

Sail shape:
```
(0,0) → (0,3.4) → curve to (1.55, 0.25) → close
```
Since the local +X is aft and +Y up: the sail's luff (leading edge) is at x=0 (the mast), the foot at y=0 going aft to x=1.55, and the leech curves from the top of the mast down to the clew. Good triangle.

Boom: cylinder from the mast base aft at y=0.95 along -Z, length 1.6. Rotate about X by π/2 to lie along Z: CylinderGeometry axis is Y; rotation.x = π/2 maps Y→Z. Position (0, 0.95, 0.35 - 0.8).

Flag at the mast top: a small triangle shape or a plane 0.35x0.2 at y=4.6. Maybe skip; add a small sphere/ball at the masthead. Let's add a small flag plane for charm. Eh, skip to reduce code.

Total meshes: hull, deck, cabin, mast, boom, sail = 6 meshes. 

Now boat group placement and animation:

```ts
const boat = new THREE.Group();
boat.position.set(12, 0, 14);
```
In the loop:
```ts
const bt = elapsed;
const bx = 12 + 2 * Math.sin(bt * 0.07);
const bz = 14 + 2 * (1 - Math.cos(bt * 0.07));
const by = heightAt(bx, bz, waveTime) + 0.55;
boat.position.set(bx, by, bz);
// heading: tangent to drift path
const yaw = Math.atan2(...) 
```
Let's compute the heading from the drift direction: dx/dt = 2*0.07*cos(bt*0.07), dz/dt = 2*0.07*sin(bt*0.07). Heading = atan2(dx, dz). At t=0: dx = 0.14, dz = 0 → heading = atan2(0.14, 0) = π/2. So the boat points along +X. That's fine (no requirement on heading). Yaw applied smoothly.

Maybe let's just have a fixed yaw of about 2.2 rad plus a slow drift; simpler and the boat's orientation relative to the camera matters for the picture. Camera at (35,12,35) looking at origin; the boat is at (12,14). The camera→boat direction... The boat should look nice from the camera, i.e., we should see its side/three-quarter view. The camera is at (35,35) looking toward the origin, and the boat at (12,14) is roughly between them. The vector from the camera to the boat is (12-35, 14-35) = (-23,-21), i.e., pointing toward the origin. A boat heading along +X (yaw=π/2, bow toward +X) would present its port side... it's fine, a three-quarter view.

Let's set the yaw as the drift heading with a slight offset, so it looks dynamic. Use yaw = heading + 0.35? Hmm, then the drift tangent isn't aligned. Doesn't matter visually. Actually for a boat drifting in a circle, aligning the hull along the motion makes sense. Use heading.

But careful: with heading = π/2, forward (bow) is +X and the pitch sampling uses the world forward vector.

Compute:
```ts
const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));  // local +Z transformed by Ry(yaw) → (sin, 0, cos)
```
Ry(θ)*(0,0,1) = (sinθ, 0, cosθ). Yes.

```ts
const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); // Ry(θ)*(1,0,0) = (cosθ,0,-sinθ)
```

Sample:
```ts
const d = 1.6;
const hF = heightAt(bx + fwd.x*d, bz + fwd.z*d, t);
const hB = heightAt(bx - fwd.x*d, bz - fwd.z*d, t);
const hR = heightAt(bx + right.x*1.0, bz + right.z*1.0, t);
const hL = heightAt(bx - right.x*1.0, bz - right.z*1.0, t);
const pitchTarget = -Math.atan2(hF - hB, 2*d) * 0.9;
const rollTarget = Math.atan2(hR - hL, 2.0) * 0.9;
```
Smooth with lerp toward the target: `pitchCur += (pitchTarget - pitchCur) * Math.min(1, delta * 8);` Hmm, the requirement says pitch and roll follow the wave slope, sampled each frame — smoothing is fine and looks better. But a test might check that rotation changes over time — it will.

Actually, let me not smooth too much; the wave slope changes slowly anyway. Smoothing factor 0.15 per frame at 60fps ≈ time constant ~0.1s. Use `1 - Math.exp(-delta * 10)`.

Also set yaw: boat.rotation.set(pitch, yaw, roll) — but the Euler order matters. Set `boat.rotation.order = 'YXZ'` so yaw is applied first, then pitch about the (rotated) X axis, then roll about Z. With YXZ, the matrix = Ry * Rx * Rz — yaw first (outermost), pitch, roll last. That's what we want.

So boat.rotation.set(pitchAngle, yaw, rollAngle) with order 'YXZ'. Note that with YXZ, `rotation.x` is the pitch about the local (yawed) X axis, which points to the boat's right... wait. Ry(yaw) then Rx: the X axis of the boat's local frame after yaw = right vector. Rotating about the local X (right) axis pitches the boat forward/back. Correct. Then Rz rolls about the local Z (forward). Correct.

Boat y offset: `by = heightAt(...) + 0.5`. The hull's local y ranges from -d (keel at -0.62) to ~0. The waterline should cut the hull at about y=-0.3 local. So boat.position.y = waterHeight + 0.3 puts the local y=-0.3 at the water level. Let's use +0.32.

Since the deck is at local y≈0 and the cabin above, the boat sits with ~0.3 of hull submerged. Good.

Now, `__boat` must be the Group.

Now shadows: the boat meshes castShadow = true; the island receives shadows; also the boat receives shadows? Set receiveShadow on the boat too (minimal cost).

Sun light:
```ts
const sun = new THREE.DirectionalLight(0xfff2d8, 3.0);
sun.position.copy(sunDir).multiplyScalar(120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45; right 45; top 45; bottom -45; near 20; far 320;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.6;
sun.target.position.set(0, 0, 0); // hmm target should be at the island/boat region
scene.add(sun); scene.add(sun.target);
```
The shadow camera covers ±45 around the target — with the target at origin, the boat at (12,14) is inside. Good. Wait, the shadow camera's near/far with the light at distance 120: near 20, far 320 covers it. Actually the light position is at sunDir*120, so the distance from the light to the origin is 120, and the shadow camera looks from the light toward the target. near/far along that axis: near = 60, far = 200 would be tighter for better depth precision. Let's use near 40, far 260.

Hmm: sun position 120 units from the origin with an elevation of 15° gives the light at a shallow angle — long shadows. That's nice for a sunset-ish look but might cause shadow acne. normalBias 0.5-1.0 helps. Elevation 15° gives a warm afternoon look. Let's use elevation 20° for a nicer picture and fewer acne issues. Hmm, but a low sun makes a beautiful ocean glitter path. Let's use 16°.

Actually, with sun elevation 16°, the sun is visible in the sky near the horizon — very pretty. The ocean specular highlight will streak toward the camera if the sun is roughly opposite the camera... The camera is at (35,35) looking toward the origin, so the view direction is (-1,-,-1) horizontally. The sun azimuth should be toward that direction-ish for a glare path: azimuth ~ 200-225°. Let's set azimuth = 210°, elevation = 16°. Then sunDir = (sin(210°)... let's compute with setFromSphericalCoords: phi = 90-16 = 74°, theta = azimuth (radians) = 210° → 3.665 rad. x = sin(phi)*sin(theta) = 0.9613*sin(210°) = 0.9613*(-0.5) = -0.4807; y = cos(phi) = 0.2756; z = sin(phi)*cos(theta) = 0.9613*cos(210°) = 0.9613*(-0.866) = -0.8325. So sunDir = (-0.48, 0.276, -0.83). The sun is in the direction of the origin from the camera — the glare would be right behind the island, giving a beautiful backlit scene. Hmm, backlit means the boat and island are in shadow-ish (the camera sees their dark side). That could look moody but maybe too dark. Alternatively put the sun to the side: azimuth 150° → sunDir = (sin74*sin150, cos74, sin74*cos150) = (0.4807, 0.2756, -0.8325). The sun is to the left-front. That lights the island and boat from the side, visible in the frame at the upper left. That's a nicer "game" look. Let's do azimuth 135°: x = 0.9613*0.707 = 0.68, z = 0.9613*(-0.707) = -0.68. Sun at upper-left-front. Camera at (35,35) looking at origin: the sun direction from the camera is toward (+0.68, +0.276, -0.68) → up-left. It would be visible in the frame at the upper left if the FOV covers it (fov 50, the camera looks down at ~-14°). The sun at elevation 16° and the camera pitched down 14° → the sun is 30° above the view center, and the vertical half-FOV is 25° → just out of frame. Hmm, "with a visible sun position" — probably means the sky has a sun visible; it's fine if it's near the frame edge. Let's lower the sun to elevation 10° so it's closer to the frame. Hmm, but long shadows at 10°... normalBias handles it.

Let's use elevation 12°, azimuth 145°. Then x = sin(78°)*sin(145°) = 0.978*0.5736 = 0.561; y = cos(78°) = 0.2079; z = 0.978*cos(145°) = 0.978*(-0.8192) = -0.801. Sun elevation 12° → the camera looking down 14°, so the sun is 26° above the view center; vertical half-FOV = 25° → just outside. Ugh.

The camera looks at (0,2,0) from (35,12,35) → the pitch down angle = atan(10/49.5) = 11.4°. Half vertical FOV for 50° fov = 25°. So the sun is visible if its elevation above the view direction < 25°, i.e., elevation < 36.4°... wait, the view direction points downward by 11.4°, so the center of the frame is at -11.4° elevation. The top of the frame is at -11.4 + 25 = +13.6° elevation. So a sun at elevation 12° is just inside the top of the frame (when horizontally aligned with the view direction). The view direction's horizontal component points from (35,35) to (0,0) → direction (-0.707, -0.707), i.e., azimuth 225° in the xz-plane sense. For the sun to appear in the frame horizontally, its azimuth should be near 225° ± some horizontal half-FOV (aspect-dependent; for a 16:9 window the horizontal FOV is larger, ~40°; for a square window it's 25°... hmm, the horizontal FOV depends on the aspect: hFov = 2*atan(tan(vFov/2)*aspect). For a wide window (1.78), hFov ≈ 2*atan(0.466*1.78) = 79° → half 39.6°.

The camera's horizontal direction is 225° (in the notation where azimuth is measured such that x = sin(theta)*..., hmm, I need to be careful). Let me use the direction vector: the camera looks along d = (-0.707, 0, -0.707) horizontally. Sun horizontal direction: (sin θ, 0, cos θ) with θ = azimuth in `setFromSphericalCoords` convention. With θ=145°: (0.574, 0, -0.819). The angle between the camera's horizontal direction (-0.707,0,-0.707) and the sun's horizontal direction (0.574,0,-0.819): dot = -0.707*0.574 + (-0.707)*(-0.819) = -0.406 + 0.579 = 0.173 → angle = 80°. That's outside a 39.6° half-hFOV. So the sun would be off-screen to the left.

Let's pick the sun azimuth so it appears on screen: we want the horizontal angle from the camera direction < ~35°. Camera horizontal direction: (-0.707, -0.707) in (x,z). In the azimuth convention, the vector (sinθ, cosθ) = (-0.707, -0.707) → θ = 225°. So the sun azimuth should be in [190°, 260°] for it to be on screen. But then the sun is behind the scene (opposite the camera) → backlit. Hmm, that's the geometry of the shot: the camera looks toward the origin from the +x+z quadrant, so anything visible in the sky in front of the camera is in the -x,-z direction, and the sun in front means backlighting.

Options: put the sun at the frame edge, azimuth ~260° or ~190°, elevation ~14° → the sun is at the left or right edge but still lights the scene from the side-ish. With azimuth 260°: sunDir = sin(76°)*(sin260, cos260) = 0.970*( -0.985, -0.174) = (-0.955, 0.242, -0.169). The sun is to the left (mostly -x), low. The camera's horizontal direction is 225°; the sun at 260° is 35° away → at the left edge of a wide screen. Side lighting from the left, backlit-ish. Good compromise: nice rim lighting on the boat and island, visible sun near the left edge.

Hmm, for a "good-looking game" picture I'd prefer front-side lighting. But the sun is required to be visible-ish. Honestly, "a visible sun position" likely just means the sky has a sun (the Sky addon draws the sun disc). It doesn't need to be in the camera frustum. But nicer if it is.

I'll go with azimuth 245°, elevation 14°. sunDir: sinθ = sin245° = -0.906, cosθ = cos245° = -0.4226; sinφ = sin(76°) = 0.9703; y = cos76 = 0.2419. sunDir = (-0.879, 0.242, -0.410). Angle from the camera's horizontal dir (-0.707,-0.707): dot = 0.621 + 0.290 = 0.911 → 24.4° → definitely on screen (upper left). Elevation 14°, frame top at 13.6°... just above the top edge. Lower elevation to 10° → y = cos(80°) = 0.1736, sinφ = 0.9848: sunDir = (-0.892, 0.174, -0.416). Elevation 10° is below the frame top of 13.6°, so it's visible near the upper-left. 

But a 10° sun gives very long shadows and a warm golden look. With ACES it should look great. Shadow bias might be an issue; use normalBias 0.8. Actually, low sun + shadows: the shadow camera near/far along the light direction — the light is at sunDir*120, elevation 10°, so the light is close to the horizontal plane. The shadow camera looks nearly horizontally, and its ortho box ±50 must contain the island and boat. Fine.

Hmm, at very low sun angles, tall objects cast super-long shadows outside the shadow camera's frustum → shadow artifacts at the frustum edges (shadows just stop). With ±50 and an island radius of 16 and palms 6 tall, shadows are ~34 units long at 10° elevation, so they'd extend to r≈50 — near the edge. Use ±60 for the shadow camera and mapSize 2048 → texel size 120/2048 = 0.058 units — fine quality.

Let's set elevation 14° and azimuth 245° and accept the sun being just at the top edge. Eh. Let me use elevation 12°, azimuth 235°: sunDir = (sin(78°) * sin(235°), cos(78°), sin78*cos235°) = (0.978*(-0.8192), 0.2079, 0.978*(-0.5736)) = (-0.801, 0.208, -0.561). Horizontal angle from the camera dir: dot = (-0.707)(-0.801) + (-0.707)(-0.561) = 0.566+0.397 = 0.963 → 15.6°. Elevation 12° < 13.6° top edge → visible slightly above center-left. Nice.

Long shadows at 12° elevation: length = h/tan(12°) = 4.7*h. A 6-unit palm → 28 units. OK within ±60.

Alright, sun light color: 0xfff0d0 warm. Intensity 3.2.

Hemisphere: sky 0x9fc4e8, ground 0x6b5a3a, intensity 1.0. Ambient 0.15 maybe. Hemi 1.2.

Now, the Sky addon parameters: turbidity 5, rayleigh 2.2, mieCoefficient 0.005, mieDirectionalG 0.8. With a low sun, rayleigh 2 gives a warm horizon. Good.

Renderer exposure 0.75.

Let's make sure the ocean shader's `uSkyTop` / `uSkyHorizon` roughly match the sky. uSkyTop = 0x2a5f9e-ish, uSkyHorizon = 0xcfe3ee. And uFogColor 0xbfd4e2 or matching the horizon. Let's set fog color 0xc6dbe8 and uSkyHorizon = 0xd6e6f0.

The sun glow in the reflection adds warmth.

Now let's write everything.

Also expose:
```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ocean = { heightAt, time: () => waveTime };
(window as any).__boat = boat;
(window as any).__leaves = leafMesh;
(window as any).__island = island;
(window as any).__sun = sun;
```

`__ready = true` after the first frame rendered. In the animation loop, use a flag.

Let me handle `renderer.setAnimationLoop((time) => {...})` — the callback receives the time in ms. I'll use a THREE.Clock for delta and elapsed. `clock.getDelta()` and `clock.elapsedTime`. Hmm, `Clock.getDelta()` updates elapsedTime. So `const dt = clock.getDelta(); const elapsed = clock.elapsedTime;`. But if the loop is paused... fine.

Actually, using `clock.getElapsedTime()` and `getDelta()` both — getDelta updates oldTime and elapsedTime; getElapsedTime also calls getDelta internally and adds to elapsedTime. So calling both in the same frame would double-count. So: call `getDelta()` once, then use `clock.elapsedTime`. 

But `THREE.Clock` starts on the first `getDelta` (autoStart) — the first delta might be large. Clamp dt to 0.1.

For determinism with the ocean time, I'll maintain `waveTime += dt` clamped, and use that as uTime and `time()`. And use the same waveTime for everything else. Actually the clock's elapsedTime is fine too. Let's use our own accumulator: `waveTime += Math.min(dt, 0.05)`. Simpler: use clock.elapsedTime directly, no clamping issues since the first frame elapsed is ~0 (clock autostarts on the first getDelta, setting elapsedTime = 0 at that point).

Hmm, Clock's autoStart: on the first getDelta call, start() sets startTime and oldTime to now, and elapsedTime = 0, and returns 0. So the first delta is 0. Good.

So:
```ts
const dt = clock.getDelta();
const t = clock.elapsedTime;
```
And ocean uTime = t; heightAt(x,z,t) matches. `time()` returns clock.elapsedTime.

I'll store `let lastTime = 0;` updated each frame and `time: () => lastTime`.

Let me write it all out now.

Also consider: the ocean plane is 400x400. The camera is at (35,12,35) looking at the origin; the far edge of the water at -200 is 250 units away → within fog far (420)? Then the horizon would show the water plane's edge against the sky, which looks bad. Better: make the fog far ≈ 260 so the water fades into the fog before the plane boundary. The plane's nearest edge is at 200 in the -x -z direction, distance ~ 250. So fog far = 240 means the water is fully fogged at 240. Hmm, but the island is at ~50 distance; distant features fog out around 200. Set fog near 60, far 260. Then the water plane's edge is fully fogged, and the fog color matches the horizon sky so it blends.

But careful, the Sky dome at radius 2000 is not fogged (Sky material doesn't use fog). If scene.fog were applied to the sky it'd be fully fogged. I set `sky.material.fog = false`. Since Sky's shader doesn't include fog chunks, no fog. Good — the horizon shows the sky, and the water fades to the fog color at the horizon. As long as the fog color ≈ the horizon sky color. The sky at the horizon with a low sun is bright/warm; the fog color 0xc9dbe6 pale blue. Not a perfect match but OK. It's a plus that it blends "into the horizon".

Alternatively, expand the ocean to 1000x1000 with a finer center? The vertex count would blow up. With 400x400 we have the fog trick. Alternatively use a radial ocean grid... skip.

Hmm, actually — with the camera at (35,12,35) and the ocean plane extending to x=-200,z=-200, the visible horizon is at ~250 units, and the fog far is 260 → the water at the plane edge is ~97% fogged. The edge might still be slightly visible as a line against the sky. To be safer, let's make the fog far = 230 and near = 55. Then at 250 distance it's fully fogged. But the water at 200 distance is heavily fogged — the scene would look very hazy, losing the "game" look. Alternatively, extend the ocean plane to 600x600 with 256 segments → segment size 2.34 units. Waves with wavelength 6.5 would be aliased. Hmm. The smallest wave is 6.5 units with 2.34 spacing — 2.8 samples per wavelength → bad. But its amplitude is small (0.08). It'd look like noise. Hmm.

Let's instead use a 500x500 plane with 256 segments (1.95 units/segment) and bump the smallest wavelength to 9. Waves 34, 21, 13, 9 with the amplitudes 0.45, 0.26, 0.15, 0.08. Segment 1.95 vs the smallest wavelength 9 → 4.6 samples/wavelength — marginal but OK; amplitude 0.08 is small.

Actually, let's keep 400x400 with 240x240 segments (1.67 units) and make the smallest wavelength 11. Then fog far 240 hides the edge. Hmm, 400/240 = 1.667.

I think the simplest good choice: ocean 600x600 with 256 segments (2.34 u/seg), and waves: wavelengths 60, 34, 18, 10. The smallest wavelength 10 with 2.34 spacing = 4.3 samples — okay-ish for a small amplitude. And the fog far can be ~330, hiding the edge at ~ 400 distance. Hmm, at 300 distance the plane edge (300 in -x-z... wait, the plane extends 300 units, so the far corner is at 424, and the nearest far edge is at 300 in the -x direction from the camera at 35 → distance ~ 265). Ugh, the camera is offset from the origin, so the far edge in the view direction: the view direction from the camera toward -x,-z; the plane's edge at x=-300 → distance ≈ 335 horizontally from the camera at (35,35). So the fog far should be ~330.

But 400x400 with the camera at (35,35): the edge in the view direction is at (-200,-200), distance = sqrt(235² + 235²) = 332. Oh wait, that's the corner. Along the -x,-z diagonal, the plane edge is at the corner (-200,-200), which is 332 away. Along the -x axis, the edge is at (-200, 35) → 235 away.

Hmm, so with either size the far edge is far. The fog handles it. Let's use a 500x500 plane with 250 x 250 segments (2 units/seg), waves 44, 26, 15, 9.5, and fog near 70 far 260. At 260+ distance the water is fully fogged, and the plane edge at 300+ is invisible. But between 250 and 300, the fog is 100% → uniform fog color. And the sky above the horizon is the sky gradient. So the transition at the horizon line: water at full fog color vs the sky at the horizon. Match the colors reasonably.

But making the fog far 260 means that the ocean is fogged heavily starting at 70 — the island at ~50 distance is barely fogged. The far water gets hazy — that's realistic and looks like a game. 

Let's set: fog near 60, far 230. uFogNear/uFogFar match.

Hmm, but then the visible ocean is only within ~200 units; beyond that it's fog color. The fog color is a pale blue-grey. The sky at the horizon should be similar. OK.

Honestly I'll go with the 500x500 plane, 250 segments, fog near 80 far 320, and the sky horizon color = fog color. The plane edge at 335 in the diagonal is just at the fog far → nearly invisible. Good.

Wait, but does the fog fully hide it? At 320+ the fog factor = 1 → the water is exactly the fog color. The sky just above the horizon is a slightly different color; there will be a subtle line. That's normal in games.

OK. Let me also add the `depthWrite` for the ocean: true.

Ocean plane geometry: PlaneGeometry(500, 500, 250, 250) → 63001 vertices. That's fine for a mid-range GPU (one draw call, 125k triangles). Hmm, 250×250×2 = 125,000 triangles. Acceptable. But we could reduce to 200 segments (80k tris). Let's use 220 segments: 48400 verts, 96,800 tris. Fine. Hmm, "keep the ocean grid at or below 256 x 256 segments" — 220 is fine.

With 500/220 = 2.27 units per segment. Smallest wavelength 9.5 → 4.2 samples. OK.

Let's finalize the waves:
1. dir (0.821, 0.571), amp 0.50, len 46, speed 7.5, steep 0.5, phase 0.0
2. dir (-0.349, 0.937), amp 0.30, len 27, speed 5.0, steep 0.45, phase 1.7
3. dir (0.990, -0.140), amp 0.16, len 15, speed 3.4, steep 0.35, phase 3.1
4. dir (-0.702, -0.712), amp 0.09, len 9.5, speed 2.4, steep 0.3, phase 5.2

Sum = 1.05 → max crest-to-trough 2.1. Slightly over 2 but "about 0.5 to 2". Let's reduce wave 1 to 0.44 and wave 2 to 0.26 → sum 0.95. Max 1.9. Good.

Speed: for a wave of wavelength L in deep water, c = sqrt(gL/2π) = sqrt(9.8*46/6.283) = sqrt(71.8) = 8.5 m/s. Our speed 7.5 is realistic for L=46. But visually, big waves move fast; that's fine. The phase velocity matters for the visual speed: omega = k*c = 0.1366*7.5 = 1.02 rad/s → period 6.2s. Good.

Wave 2: L=27, k=0.2327, c=5.0 → omega=1.16, period 5.4s.
Wave 3: L=15, k=0.4189, c=3.4 → omega=1.42, period 4.4s.
Wave 4: L=9.5, k=0.6614, c=2.4 → omega=1.59, period 3.95s.
Good, dispersive.

Now with directional normalization, I'll compute in TS at setup:

```ts
const rawWaves = [{dx, dz, ...}];
const WAVES = rawWaves.map(w => { const l = Math.hypot(w.dx, w.dz); return {...w, dirX: w.dx/l, dirZ: w.dz/l}; });
```
And pass the normalized dirX/dirZ to the uniform.

Now writing the GLSL uniform arrays:
```ts
uniforms: {
  uTime: { value: 0 },
  uWaves: { value: WAVES.map(w => new THREE.Vector4(w.dirX, w.dirZ, w.amp, w.len)) },
  uWaveParams: { value: WAVES.map(w => new THREE.Vector4(w.speed, w.steep, w.phase, 0)) },
  ...
}
```
Note: ShaderMaterial with array uniforms — the shader must declare `uniform vec4 uWaves[4];` and the JS value must be an array of Vector4. WebGLUniforms handles it via `setValueV4fArray`. Good.

One caution: GLSL ES 1.0 requires a constant loop bound for indexing arrays — `for (int i = 0; i < NWAVES; i++)` with `#define NWAVES 4` works since NWAVES is a literal.

But indexing `uWaves[i]` with a loop variable i is allowed in GLSL ES 1.0 only if the index is a "constant-index-expression" — loop indices qualify. Yes, that's allowed.

Now let's write the code fully.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
```

Wait — does `three/addons/...` resolve with tsc? Depends on the tsconfig paths. Presumably the environment has the types. The instruction says to import addons from 'three/addons/...', so fine.

Hmm — potential tsc strict issue: `import { Sky } from 'three/addons/objects/Sky.js';` — the .js extension with types. three's types include `examples/jsm/objects/Sky.d.ts` in newer versions with the addons mapping. Should be fine as instructed.

Let me write out the whole file carefully.

```ts
/* Ocean / boat / island scene */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------------------------------------------------------------- utilities

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- waves

interface Wave { dirX: number; dirZ: number; amp: number; len: number; speed: number; steep: number; phase: number; }

const RAW_WAVES = [
  { dirX: 0.82, dirZ: 0.57, amp: 0.44, len: 46, speed: 7.5, steep: 0.55, phase: 0.0 },
  ...
];

const WAVES: Wave[] = RAW_WAVES.map((w) => {
  const l = Math.hypot(w.dirX, w.dirZ) || 1;
  return { ...w, dirX: w.dirX / l, dirZ: w.dirZ / l };
});

const TOTAL_AMP = WAVES.reduce((s, w) => s + w.amp, 0);

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const k = (Math.PI * 2) / w.len;
    const omega = k * w.speed;
    h += w.amp * Math.sin(k * (w.dirX * x + w.dirZ * z) - omega * t + w.phase);
  }
  return h;
}
```

Note `WAVES[i]` with noUncheckedIndexedAccess could be `Wave | undefined` → tsc error. Is `noUncheckedIndexedAccess` part of --strict? No, it's a separate flag. `--strict` doesn't include it. So indexing is fine. But to be safe, use `for (const w of WAVES)`. Yes, safer.

Also `RAW_WAVES.map` with the object spread: typed fine.

Now, the island height function and noise.

```ts
function hash2(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return (a * (1 - ux) + b * ux) * (1 - uz) + (c * (1 - ux) + d * ux) * uz;
}

function fbm(x: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise(x * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v / 0.9375;  // normalize to 0..1
}
```
Sum of amps = 0.5+0.25+0.125+0.0625 = 0.9375. Good.

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const t = clamp(1 - r / 27, 0, 1);
  const n = fbm(x * 0.085 + 13.7, z * 0.085 + 4.3) - 0.5;   // -0.5..0.5
  const ridge = 0.85 * Math.cos(2 * Math.atan2(z, x));
  const base = 12 * Math.pow(t, 1.65);
  const bump = (n * 5.2 + ridge) * t;
  const drop = -1.35 - 1.7 * (1 - t);
  return base + bump + drop;
}
```
At r=0: atan2(0,0)=0 → ridge=0.85. base=12. bump = (n*5.2 + 0.85). drop=-1.35. h = 12 + 2.6 + 0.85 - 1.35 (if n=0.5) = 14.1. Peak ≤ 14.1 ✓.

Waterline ~ t where 12 t^1.65 + 1.7t - 3.05 = 0 (ignoring noise). t=0.42: 12*0.42^1.65 = 12*0.2374=2.85; +0.714 - 3.05 = 0.51. t=0.38: 12*0.38^1.65 = 12*0.2055 = 2.47; +0.646-3.05 = 0.06. t=0.37: 12*0.1929=2.31+0.629-3.05=-0.11. So t≈0.375 → r = 27*0.625 = 16.9. Diameter ~34 units ✓ (30-50).

Good.

Now island geometry: PlaneGeometry(64, 64, 128, 128)? 64/128 = 0.5 spacing, 16641 vertices. That's fine but the height function is called 16641 + 4*16641 for slopes ≈ 83k calls each with 4 fbm octaves = 330k noise evaluations... each noise has 4 hashes. ~1.3M hash ops. That's maybe 50-100ms. Acceptable at load. But let's reduce: 96x96 segments (0.667 spacing) → 9409 verts, ~47k height calls. Fine. Actually detail matters for the silhouette. Let's use 110 segments over 64 units → 0.58 spacing. 12321 vertices. OK.

Hmm, actually since the island is only ~34 across, the plane could be 44x44 with 100 segments (0.44 spacing). Then the outer part is just flat seabed. The plane must extend beyond the waterline for the island to slope into the sea: the island's radius is 17 at the waterline, so a 44x44 plane extends to 22 — the terrain goes to -2.8 underwater. Fine. Corners at 31 → t=0. Good. Use 44x44 with 110 segments → 0.4 spacing. 12321 verts. Good detail on the beach.

Actually the palms need the ground height; the terrain between 0.4-spaced vertices is linearly interpolated, so a palm placed exactly at the analytic height could float slightly. Offset by -0.15 to sink it. Fine.

Colors, use a small seeded random for variation... no need.

Now the palm creation:

```ts
interface PalmSpec { angle: number; radius: number; height: number; lean: number; leanAngle: number; }
const PALMS: PalmSpec[] = [
  { angle: 0.4, radius: 9.0, height: 5.2, lean: 0.9, leanAngle: 2.1 },
  { angle: 1.7, radius: 11.5, height: 4.6, lean: 1.1, leanAngle: 0.4 },
  { angle: 2.9, radius: 8.5, height: 5.8, lean: 0.8, leanAngle: 4.2 },
  { angle: 4.1, radius: 10.5, height: 5.0, lean: 1.2, leanAngle: 5.5 },
  { angle: 5.2, radius: 7.5, height: 5.5, lean: 0.7, leanAngle: 1.2 },
  { angle: 5.9, radius: 12.0, height: 4.4, lean: 1.0, leanAngle: 3.3 },
];
```
6 palms. With r up to 12, the ground height is around 3-4.5 → the palm crowns are at ~8-10 altitude. Nice.

Building trunks:

```ts
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness: 0.9, metalness: 0.0 });

const crownPoints: THREE.Vector3[] = [];

for (const p of PALMS) {
  const px = Math.cos(p.angle) * p.radius;
  const pz = Math.sin(p.angle) * p.radius;
  const py = islandHeight(px, pz) - 0.2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(p.lean * 0.18, p.height * 0.34, 0),
    new THREE.Vector3(p.lean * 0.55, p.height * 0.68, 0),
    new THREE.Vector3(p.lean, p.height, 0),
  ]);
  const tube = new THREE.TubeGeometry(curve, 28, 0.24, 8, false);
  // taper ...
  const trunk = new THREE.Mesh(tube, trunkMaterial);
  trunk.position.set(px, py, pz);
  trunk.rotation.y = p.leanAngle;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const crown = new THREE.Vector3(p.lean, p.height, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.leanAngle).add(trunk.position);
  crownPoints.push(crown);
}
```
Wait — `applyAxisAngle(axis, angle)` rotates the vector about the axis. `trunk.rotation.y = leanAngle` applies Ry(leanAngle). So (lean, height, 0) rotated by Ry(leanAngle) matches. Ry(θ) applied to (x,0,z): x' = x cosθ + z sinθ, z' = -x sinθ + z cosθ. With z=0: (lean cosθ, height, -lean sinθ). And applyAxisAngle with the Y axis and θ gives exactly the same. Good.

Then the leaves: I need the world crown positions, and the leaf instance matrices are in the InstancedMesh's local space. If I put the InstancedMesh at the origin with no transform, the instance matrices are world transforms. Good — add the InstancedMesh to the scene at the origin.

Leaf geometry: build a ribbon along +X.

```ts
function createLeafGeometry(): THREE.BufferGeometry {
  const segs = 10;
  const maxWidth = 0.42;
  const length = 2.6;
  const droop = 1.05;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = length * t;
    const y = -droop * t * t * t;          // droop increasingly
    const w = maxWidth * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.75);
    // two vertices
    positions.push(x, y, -w, x, y + w * 0.25, w);  // hmm asymmetric
  }
}
```
Let me do a simple symmetric ribbon with a slight V cross-section:
```
for each i: 
   left vertex at z = -w, y = yc + w*0.18 
   right vertex at z = +w, y = yc + w*0.18
   and a center ridge vertex at z = 0, y = yc
```
3 vertices per row for a V-shaped (ridged) leaf. That's nicer. Rows = segs+1 = 11 → 33 vertices, indices for 2 quads per segment.

Let's do it: for each i: center (x, yc, 0), and the two edge vertices (x, yc + w*0.22, ±w). Triangles: (c_i, e_i_right, c_{i+1})... let me define vertex indices: 3*i = center, 3*i+1 = left (-z), 3*i+2 = right (+z).

Triangles between rows i and i+1:
- right: (c_i, r_i, r_{i+1}) and (c_i, r_{i+1}, c_{i+1})
- left: (c_i, l_{i+1}, l_i) and (c_i, c_{i+1}, l_{i+1})

Winding: with DoubleSide it doesn't matter for the material, but for the normals it does. Since the leaf is DoubleSide and I'll computeVertexNormals, the shading will flip per face... With DoubleSide, three flips the normal for back faces automatically in the shader (gl_FrontFacing). So it's fine.

Actually, MeshStandardMaterial with DoubleSide handles normals correctly for back faces (flipping them). Yes.

The leaf width w: at t=0, sin(0)=0 → w=0 (pointed at the base). Good — the leaf emerges from the crown at a point. At t=1, sin(π)=0 → 0. Good.

`Math.sin(Math.PI * Math.pow(t, 0.85))` — fine.

Length 2.6, droop 1.05 at the tip... that's a lot of droop. Use droop 0.75 with y = -droop * t^2.2. Let's tune: leaves arc up a bit first then droop. Let's do y = 0.35*t - 0.8*t^2 → at t=0.5: 0.175-0.2 = -0.025 (roughly flat), at t=1: 0.35-0.8 = -0.45. That gives an arc that rises slightly then droops. 

Actually palm leaves typically curve up from the crown and then droop at the tip. y(t) = 0.5*t - 0.9*t^2.2 → at t=0.3: 0.15 - 0.9*0.0685 = 0.088; t=0.6: 0.3-0.9*0.316=-0.0 hmm 0.9*0.6^2.2 = 0.9*0.3245=0.292 → 0.008; t=1: 0.5-0.9 = -0.4. OK, it rises 0.09 then droops to -0.4 at the tip. Nice.

The leaf geometry is then rotated per instance.

Now let's count: 6 palms × 9 leaves = 54 instances.

Wind sway: base quaternion per instance, and a per-instance phase.

Let's code the leaves:

```ts
const LEAVES_PER_PALM = 9;
const leafCount = crownPoints.length * LEAVES_PER_PALM;

const leafGeo = createLeafGeometry();
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8b35, roughness: 0.75, metalness: 0.0, side: THREE.DoubleSide });
const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.frustumCulled = false;

interface LeafBase { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3; phase: number; }
const leafBases: LeafBase[] = [];

let idx = 0;
for (let p = 0; p < crownPoints.length; p++) {
  const crown = crownPoints[p];
  for (let i = 0; i < LEAVES_PER_PALM; i++) {
    const yaw = (i / LEAVES_PER_PALM) * Math.PI * 2 + p * 0.7;
    const tilt = 0.35 + 0.35 * Math.sin(i * 1.7 + p);
    const roll = 0.12 * Math.sin(i * 2.3 + p * 1.1);
    const e = new THREE.Euler(roll, yaw, -tilt, 'YXZ');
    const quat = new THREE.Quaternion().setFromEuler(e);
    const s = 0.85 + 0.3 * ((i * 7 + p * 3) % 5) / 4;
    ...
    leafBases.push({ pos: crown.clone(), quat, scale: new THREE.Vector3(s, s, s), phase: Math.random()... });
  }
}
```
Avoid Math.random for determinism? It's fine but let's use a deterministic pseudo-random: `const rnd = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };`

Then set the initial matrices and update every frame.

Update function:
```ts
const dummy = new THREE.Object3D();
const swallow = new THREE.Quaternion();
const swayEuler = new THREE.Euler(0,0,0,'YXZ');

function updateLeaves(t: number) {
  for (let i = 0; i < leafBases.length; i++) {
    const b = leafBases[i];
    const wind = Math.sin(t * 1.9 + b.phase) * 0.5 + 0.5;   // gust
    swayEuler.set(0.10 * Math.sin(t * 1.6 + b.phase * 1.3),
                  0.16 * Math.sin(t * 1.1 + b.phase * 2.1),
                  0.09 * Math.sin(t * 2.4 + b.phase * 0.7) * (0.5 + wind), 'YXZ');
    swallow.setFromEuler(swayEuler);
    dummy.position.copy(b.pos);
    dummy.quaternion.copy(b.quat).multiply(swallow);
    dummy.scale.copy(b.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
```
Careful with `leafBases[i]` typing — fine without noUncheckedIndexedAccess. But `b` could be undefined per the type if noUncheckedIndexedAccess were on. It's not part of strict. OK.

Hmm — actually, `for (let i = 0; i < leafBases.length; i++)` with plain index access is fine.

Also `new THREE.Euler(...).set(x,y,z,order)` — the Euler.set signature is `set(x, y, z, order?)`. Good.

Now the ocean mesh creation and shader.

Let me write the full shader strings.

```ts
const oceanUniforms = {
  uTime: { value: 0 },
  uWaves: { value: WAVES.map((w) => new THREE.Vector4(w.dirX, w.dirZ, w.amp, w.len)) },
  uWaveParams: { value: WAVES.map((w) => new THREE.Vector4(w.speed, w.steep, w.phase, 0)) },
  uSunDir: { value: new THREE.Vector3() },
  uSunColor: { value: new THREE.Color(0xfff0d5) },
  uSkyTop: { value: new THREE.Color(0x3a7abf) },
  uSkyHorizon: { value: new THREE.Color(0xcfe2ee) },
  uDeep: { value: new THREE.Color(0x0b2b45) },
  uShallow: { value: new THREE.Color(0x2f9fae) },
  uFogColor: { value: new THREE.Color(0xc8dbe8) },
  uFogNear: { value: 70 },
  uFogFar: { value: 300 },
  uTotalAmp: { value: TOTAL_AMP },
};
```

Vertex shader — note it must handle `position`. Let's write it.

Then the fragment.

Then:
```ts
const oceanGeo = new THREE.PlaneGeometry(500, 500, 220, 220);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader, fragmentShader,
  fog: false,
  side: THREE.FrontSide,
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.receiveShadow = false; // custom shader won't receive shadows anyway
scene.add(ocean);
```

Hmm: the ocean won't receive shadows (custom shader) — that's fine; the boat's shadow on the water would be nice but not required.

Also `ocean.renderOrder` default.

Since the ocean is a huge plane, it will be frustum-culled correctly (the bounding sphere is huge but fine).

Now: the ocean plane's bounding sphere is computed from the undisplaced geometry (radius ~353). Fine.

Sky setup:

```ts
const sky = new Sky();
sky.scale.setScalar(4000);
sky.material.uniforms['turbidity'].value = 6;
sky.material.uniforms['rayleigh'].value = 2.2;
sky.material.uniforms['mieCoefficient'].value = 0.005;
sky.material.uniforms['mieDirectionalG'].value = 0.8;
sky.material.fog = false;
scene.add(sky);
```
Accessing `sky.material.uniforms['turbidity']` — with strict TS, index access on a typed object returns the value type (no error without noUncheckedIndexedAccess). The Uniforms type is `{ [key: string]: THREE.IUniform }` presumably. In Sky.d.ts, `material: ShaderMaterial` and ShaderMaterial.uniforms is `{ [uniform: string]: IUniform }`. So `sky.material.uniforms['turbidity'].value = 6;` is fine.

Camera far: 3000, sky scale 4000 → the box extends 2000 from the center in each direction; the camera at 49 from the origin is inside. The far plane 3000 > 2000. Good, the sky is not clipped.

Hmm, but the Sky's vertex shader places the box at the camera position? Sky's ShaderMaterial uses `vWorldPosition = (modelMatrix * vec4(position,1)).xyz` and the fragment uses the direction from the camera... The standard usage: `sky.scale.setScalar(450000)` and the camera far is large. With depthWrite false and BackSide, the box is rendered but the box's far corners may be clipped by the camera's far plane if the scale is larger than the far plane. With scale 4000 (half-extent 2000) and far 3000, the box corners are at 3464 from the center → could be clipped! Since the camera looks toward the origin from (35,12,35), the visible box surface (back faces) is at a distance of ~2000-3464 in the view direction. The far plane at 3000 might clip the corners. Hmm, the Sky shader is not depth-tested against... it has `depthWrite: false` but depthTest is true by default. Clipping at the far plane would cut off parts of the sky.

Better: set the camera far to 6000 and the sky scale to 4000 (max distance 3464 < 6000). Or set the sky scale to 1000 and far to 2000. The fog handles the ocean anyway; there's nothing beyond 350 units except the sky. Let's use camera far = 4000, sky scale = 2000 (half-extent 1000, corners at 1732 < 4000). 

Hmm, but with near=0.1 and far=4000, depth precision: 24-bit depth is fine for the ocean at 350 units. Use near 0.5. Actually near 0.5 with a boat 4 units long that we're ~30 units from — fine.

Depth precision: with a logarithmic... no. near=0.5, far=4000 → ratio 8000, adequate for a 24-bit depth buffer at these distances.

Let's use near 0.3, far 4000. The sky scale 1500 → the box half-extent 750, corners 1299. The camera is inside. Fine.

Hmm, is the Sky box centered at the origin or does it follow the camera? In the standard example, the sky is at the origin and the camera moves around; since the box is huge, it's fine. With a 1500 scale and the camera at (35,12,35), fine.

Now the sun light and fog.

Let me write the animation loop:

```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  waveTime = t;
  oceanUniforms.uTime.value = t;
  ...
  controls.update();
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Careful: `clock.getDelta()` resets; `clock.elapsedTime` gives the accumulated. Good.

Hmm, `Math.min(clock.getDelta(), 0.05)` — clamping dt but using elapsedTime, which is fine.

Boat update per frame.

Now let me also double check the ocean's uSunDir: I should set it from the sun direction. `oceanUniforms.uSunDir.value.copy(sunDir)`.

Now writing the final code. Let me be careful with TS types and strict null checks.

Potential strict issues:
- `const el = document.body;` fine.
- Unused variables → `noUnusedLocals` is not part of strict. Still, avoid.

Let's write.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

const rnd = (n: number): number => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/* ------------------------------------------------------------------ *
 * Wave definition + shared height function
 * ------------------------------------------------------------------ */

interface WaveDef {
  dirX: number; dirZ: number;
  amp: number; len: number;
  speed: number; steep: number; phase: number;
}

const RAW_WAVES: WaveDef[] = [...];

const WAVES: WaveDef[] = RAW_WAVES.map((w) => {
  const l = Math.hypot(w.dirX, w.dirZ) || 1;
  return { ...w, dirX: w.dirX / l, dirZ: w.dirZ / l };
});

const TOTAL_AMP = WAVES.reduce((acc, w) => acc + w.amp, 0);

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    const omega = k * w.speed;
    h += w.amp * Math.sin(k * (w.dirX * x + w.dirZ * z) - omega * t + w.phase);
  }
  return h;
}
```

Then the renderer etc.

Let me write the shaders as template literals with careful escaping (no `${}` unless intended).

Vertex shader:

```glsl
#define NWAVES 4
uniform float uTime;
uniform vec4 uWaves[NWAVES];
uniform vec4 uWaveParams[NWAVES];

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec2 p = position.xz;

  float h = 0.0;
  vec3 dX = vec3(1.0, 0.0, 0.0);
  vec3 dZ = vec3(0.0, 0.0, 1.0);

  for (int i = 0; i < NWAVES; i++) {
    vec4 w = uWaves[i];
    vec4 q = uWaveParams[i];

    vec2 dir = vec2(w.x, w.y);
    float k = 6.283185307179586 / w.w;
    float omega = k * q.x;
    float phase = k * dot(dir, p) - omega * uTime + q.z;

    float A = w.z;
    float Q = q.y;
    float s = sin(phase);
    float c = cos(phase);

    h += A * s;

    float qak = Q * A * k;
    dX.x -= qak * dir.x * dir.x * s;
    dX.y += A * k * dir.x * c;
    dX.z -= qak * dir.x * dir.y * s;
    dZ.x -= qak * dir.x * dir.y * s;
    dZ.y += A * k * dir.y * c;
    dZ.z -= qak * dir.y * dir.y * s;
  }

  vec3 displaced = vec3(position.x, h, position.z);

  vWorldPos = displaced;
  vNormal = normalize(cross(dZ, dX));
  vHeight = h;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

Wait — I need to double check `dX.z` and `dZ.x`. Both are the same term: ∂/∂x of the z-displacement and ∂/∂z of the x-displacement. z-disp = sum Q A dir.y cos(phase); ∂/∂x = -Q A dir.y * k dir.x * sin = -qak*dir.x*dir.y*s ✓. x-disp = sum Q A dir.x cos(phase); ∂/∂z = -qak*dir.x*dir.y*s ✓. Good.

Fragment:

```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTotalAmp;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-V, N);
  float up = clamp(R.y, 0.0, 1.0);
  vec3 skyCol = mix(uSkyHorizon, uSkyTop, pow(up, 0.55));
  float glow = pow(max(dot(R, uSunDir), 0.0), 16.0);
  skyCol += uSunColor * glow * 0.6;

  float dist = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(14.0, 46.0, dist);
  shallow *= 0.85 + 0.15 * sin(vWorldPos.x * 0.12 + vWorldPos.z * 0.09);

  vec3 water = mix(uDeep, uShallow, shallow * 0.55 + 0.35 * smoothstep(-0.7, 1.0, vHeight));

  // light scattering through crests
  water += uShallow * 0.35 * smoothstep(0.15, 1.0, vHeight);

  vec3 col = mix(water, skyCol, fres);

  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 180.0);
  col += uSunColor * spec * 2.2;

  // foam on crests
  float hN = vHeight / max(uTotalAmp, 0.001);
  float foam = smoothstep(0.55, 0.95, hN);
  foam *= 0.65 + 0.35 * sin(vWorldPos.x * 1.7 + vWorldPos.z * 2.3 + 4.0 * uFogNear * 0.0);
  ...
}
```
Hmm, I want some noise for the foam; without a time uniform it's static. Let me add `uTime` to the fragment too for the foam animation:

`float ripple = sin(vWorldPos.x * 1.9 + uTime * 1.7) * sin(vWorldPos.z * 2.3 - uTime * 1.3);`
`foam *= smoothstep(-0.2, 0.6, ripple);` — makes the foam patchy and animated.

Then `col = mix(col, vec3(0.92, 0.97, 1.0), foam * 0.8);`

Fog:
```
float dcam = length(cameraPosition - vWorldPos);
float f = smoothstep(uFogNear, uFogFar, dcam);
col = mix(col, uFogColor, f);
```

Then output with tonemapping + colorspace.

Note the `spec` might blow out; ACES handles it.

One more consideration: the sky reflection color should be somewhat desaturated/blue. Fine.

Also add a slight "sun glitter path" by widening the specular with a lower exponent... 180 is decent.

Now, is `vHeight / uTotalAmp` reaching 1? The sum of sines could reach 1 at the extreme. Threshold 0.55..0.95 → foam on the highest crests. Good.

Now let's put it all together. Also, one thing to verify: `#include <tonemapping_fragment>` uses `gl_FragColor` — yes, the chunk is:

```glsl
#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
Good.

`colorspace_fragment`:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
Good — requires `linearToOutputTexel` which the renderer defines in the fragment prefix. In newer three (r152+), yes. In r160+, the function is generated by `getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputColorSpace )`. Included for all materials. OK.

Potential issue: with WebGL2 and the new shader prefix... it's fine.

Now, one more risk: In some three versions, ShaderMaterial fragment prefix does NOT include the tone mapping function unless... Let me recall WebGLProgram.js:

```js
prefixFragment = [
    customExtensions,
    generatePrecision( parameters ),
    '#define SHADER_TYPE ' + parameters.shaderType,
    '#define SHADER_NAME ' + parameters.shaderName,
    customDefines,
    parameters.useFog && parameters.fog ? '#define USE_FOG' : '',
    ...
    '#define TONE_MAPPING',   // hmm, this is inside a conditional
    ...
].filter(...)
```
Actually the fragment prefix includes:

```js
parameters.toneMapping !== NoToneMapping ? '#define TONE_MAPPING' : '',
parameters.toneMapping !== NoToneMapping ? ShaderChunk['tonemapping_pars_fragment'] : '',
parameters.toneMapping !== NoToneMapping ? getToneMappingFunction('toneMapping', parameters.toneMapping) : '',
parameters.dithering ? '#define DITHERING' : '',
parameters.opaque ? '#define OPAQUE' : '',
ShaderChunk['colorspace_pars_fragment'],   // (in older versions) 
getTexelEncodingFunction('linearToOutputTexel', parameters.outputColorSpace),
...
```
Yes, this is in the prefixFragment for all materials including ShaderMaterial. Good.

Actually, in newer versions (r165+), `colorspace_fragment` calls `linearToOutputTexel(gl_FragColor)`. And `getTexelEncodingFunction` is still added. OK.

To be extra safe against the chunk names changing, I could do the tone mapping and sRGB conversion manually:
```glsl
col = ACESFilm(col * exposure) ... 
```
But exposure is a renderer global (uniform `toneMappingExposure` is auto-added? It's added as a uniform in the material's uniforms? Actually `toneMappingExposure` is a uniform declared in the fragment prefix when tone mapping is enabled: `uniform float toneMappingExposure;` and its value is set by the renderer via `p_uniforms.setValue(_gl, 'toneMappingExposure', _this.toneMappingExposure)` for the program. Yes, so it's available.

I'll just use the includes; they're standard and stable.

Hmm, one risk: if the chunk resolution fails (e.g., the shader can't find the chunk), three throws an error at compile. `tonemapping_fragment` and `colorspace_fragment` are both standard chunks in all recent versions. Fine.

Now, writing the boat hull geometry code. Let me write it as a function returning a BufferGeometry.

```ts
function buildHullGeometry(lengthSegs: number, radialSegs: number): THREE.BufferGeometry {
  const halfLength = 2.0;
  const positions: number[] = [];
  const indices: number[] = [];
  const rows = radialSegs + 1;

  const halfBeam = (s: number): number => 0.72 * (1 - 0.93 * Math.pow(s, 2.4));
  const draft = (s: number): number => 0.62 * (1 - 0.55 * Math.pow(s, 1.8));
  const shear = (s: number): number => 0.10 * s * s + 0.04 * Math.sin(Math.PI * s);

  for (let i = 0; i <= lengthSegs; i++) {
    const s = i / lengthSegs;
    const z = -halfLength + 2 * halfLength * s;
    const w = halfBeam(s);
    const d = draft(s);
    const rise = shear(s);
    for (let j = 0; j < rows; j++) {
      const a = (Math.PI * j) / radialSegs;
      const x = w * Math.cos(a);
      const y = rise - d * Math.sin(a);
      positions.push(x, y, z);
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      const c = (i + 1) * rows + j + 1;
      const d = i * rows + j + 1;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
```
Check the geometry: at s=0, w = 0.72, so the stern is 1.44 wide. At s=1, w = 0.72*(1-0.93)=0.0504 (bow, nearly a point). The length from z=-2 to 2. Good.

Wait, the width at s=1 being 0.05 means a nearly-pointed bow. Good.

The keel depth at s=0: 0.62; at s=1: 0.62*0.45=0.279. Good.

The hull has an open top (the deck covers it) and an open stern (the transom at i=0). Add the transom: a triangle fan from the centroid of the i=0 ring. Let's add:

```ts
  // stern cap
  const sternCenterIndex = positions.length / 3;
  let cx = 0, cy = 0;
  for (let j = 0; j < rows; j++) { cx += positions[j*3]; cy += positions[j*3+1]; }
  cx /= rows; cy /= rows;
  positions.push(cx, cy, -halfLength);
```
Hmm, `positions[j*3]` etc. Then fan: for j in 0..radialSegs-1: triangle (center, j, j+1) — winding for an outward (=-z) normal: the stern faces -z. Let's check: the vertices j go from starboard (x=+w) around the bottom to port (x=-w). The fan triangles (center, j, j+1): with the center inside. Normal = (vj - center) × (vj+1 - center). Hmm, let's just not care: the transom is barely visible, and the deck covers... Actually the stern is at the back of the boat and might be visible from the camera. Since the camera is at (35,35) and the boat is at (12,14) with yaw ~π/2 (bow along +X), the stern faces -X, away from the camera-ish. Whatever. Let's just compute it properly:

For the -z facing normal: we want the cross product of the edges to point in -z. Points: center c = (0, y_c, -2). Starboard j=0: (w, rise, -2). Next j=1: something with +x, lower y.

Take triangle (c, v0, v1). v0 - c = (w, ...), v1 - c = (x1, y1). Cross = (v0-c) × (v1-c) → its z component = (v0-c).x*(v1-c).y - (v0-c).y*(v1-c).x. With v0 = (0.72, 0, 0) relative and v1 = (0.72*cos(a1), -0.62*sin(a1), 0) ≈ (0.5, -0.4, 0) relative for a small a1: z = 0.72*(-0.4) - 0*(0.5) = -0.288 → points -z. That's outward for the stern (the stern faces -z). Good — so the winding (c, j, j+1) is correct.

Hmm, but the center c has y = the average y of the ring, so c is at the centroid which is below the deck. Fine.

Now the deck: build from the gunwale outline. For each i, the two top vertices are j=0 (starboard) and j=radialSegs (port). Build a triangle strip:
```ts
const deckPositions: number[] = [];
for (let i = 0; i <= lengthSegs; i++) {
  const s = i/lengthSegs;
  const w = halfBeam(s) * 0.97;
  const rise = shear(s) - 0.05;
  const z = -halfLength + 4*s;
  deckPositions.push(w, rise, z, -w, rise, z);
}
const deckIndices = [];
for (let i = 0; i < lengthSegs; i++) {
  const a = 2*i, b = 2*i+1, c = 2*(i+1), d = 2*(i+1)+1;
  // a=starboard_i, b=port_i, c=starboard_{i+1}, d=port_{i+1}
  deckIndices.push(a, c, b, b, c, d);
}
```
Check the winding for an up normal: a = (+w, 0, z), c = (+w', 0, z+dz), b = (-w, 0, z). (c-a) ≈ (0,0,+dz), (b-a) ≈ (-2w, 0, 0). Normal = (c-a)×(b-a) = (0,0,dz)×(-2w,0,0) = (0*0 - dz*0, dz*(-2w) - 0*0, 0) = (0, -2w*dz, 0) → down. Wrong. Swap: (a, b, c): (b-a)×(c-a) = (-2w,0,0)×(0,0,dz) = (0*dz - 0*0, 0*0 - (-2w)*dz, 0) = (0, 2w*dz, 0) → up. 

So use indices: (a, b, c) and (b, d, c). Check the second: (b,d,c): (d-b) = (0,0,dz), (c-b) = (2w', 0, dz)... cross = (d-b)×(c-b) = (0,0,dz)×(2w',0,0) = (0*0-dz*0, dz*2w'-0*0, 0) = (0, 2w' dz, 0) → up ✓.

I'll just use DoubleSide for the deck material anyway, but correct winding gives correct normals. computeVertexNormals is used.

Deck geometry might z-fight with the hull top edge at y = shear(s) — I set the deck at rise - 0.05, 0.05 below the gunwale. Since the hull is a shell with an open top, we'd see the deck slightly below the rim. Good, looks like a real boat.

Cabin: BoxGeometry(0.9, 0.5, 1.1) at (0, 0.25, -0.75) (aft of the mast). White.
Add a cabin roof? The box is enough. Maybe add a couple of dark windows: a thin box (0.92, 0.18, 0.05) at the cabin front? Let's add a window strip that is slightly wider than the cabin so it shows: BoxGeometry(0.94, 0.16, 0.06) positioned at (0, 0.32, -0.19) (the front face of the cabin which is at z = -0.75 + 0.55 = -0.2). Color dark 0x1b2b33. That's a nice detail. Adds a mesh.

Mast: cylinder r=0.045, height 4.6, at (0, 2.3, 0.25). Wood.

Boom: cylinder r=0.035, length 1.5, rotated to lie along Z at (0, 0.95, 0.25-0.75).

Sail: as described, at (0, 0.9, 0.25), rotation.y = π/2.

Hmm, careful: the sail's local X after Ry(π/2) maps to world -Z. The sail extends aft (-Z) from the mast at z=0.25, up to 1.6 → down to z = -1.35. That's within the boat (z from -2 to 2). Good.

The sail's local origin is at (0,0) → world (0, 0.9, 0.25). The sail extends up 3.4 → top at y = 4.3. The mast top is at 2.3+2.3 = 4.6. Good, the sail is slightly below the masthead.

Boom at y = 0.95 from z=0.25 to z=-1.25? The sail's foot at y=0.9 extends aft 1.55. Boom length 1.6 at y 0.92, centered at z = 0.25-0.8 = -0.55. Good.

Sail shape width 1.55 at the foot — the boat is 4 long, so the sail spans 1.55 aft. Fine.

Now the boat Group: add hull, deck, cabin, windows, mast, boom, sail. All castShadow = true. 

Also set receiveShadow on the deck/hull.

The boat's overall size: 4 units long ✓.

Now the render loop updates.

Also: "Every frame its height follows the water: y = heightAt(x, z, time()) plus a constant offset" ✓.

Let me now assemble the final code. I'll be careful about the TS types.

One more: OrbitControls constructor `new OrbitControls(camera, renderer.domElement)`. Then `controls.target.set(0, 2, 0)`. `controls.update()` each frame — without damping, update() is basically a no-op but it does apply the target. Actually, OrbitControls.update() recomputes the camera position from the spherical offset relative to the target. If I set camera.position then controls.target then call update, the camera position stays. Good.

Hmm, careful: OrbitControls' `update()` does `position.copy(target).add(offset)`, where offset was computed from the initial camera position - target. So it stays. But it also has `minPolarAngle`/`maxPolarAngle` clamping: the default maxPolarAngle is π. The camera's polar angle: the offset is (35, 10, 35) → the angle from +Y = atan2(sqrt(35²+35²), 10) = atan2(49.5, 10) = 78.6°, less than π. Good, no clamping.

Also set `controls.enablePan = false` maybe. Keep it simple: enableDamping = false.

One risk: OrbitControls in newer versions requires `controls.update()` and handles `domElement`. Fine.

Let me now write the final file.

Also I should double check the `Sky` types: `sky.material.uniforms` — with the TS types, `Sky` extends `Mesh<BufferGeometry, ShaderMaterial>`? Let's check three's Sky.d.ts:

```ts
import { Mesh, ShaderMaterial, Vector3 } from 'three';
export class Sky extends Mesh {
    constructor();
    material: ShaderMaterial;
    static SkyShader: object;
}
```
Hmm, in older three's examples/jsm/*.d.ts it's `export class Sky extends Mesh { ... }`. With the newer @types/three built into three (since r150+ the types come with the package under `three/examples/jsm/...d.ts`)... Actually since three r167 or so, the TS types are bundled in the three package? No — types are still from @types/three for most setups, but three now ships its own types (since r165 the package includes the types for the core; examples types come from @types/three). Hmm, this is ambiguous. I'll write code that works with either.

`sky.material.uniforms['turbidity'].value = 6;` — works with `ShaderMaterial` typed material.

Actually, in @types/three, the Sky class is:
```ts
export class Sky extends Mesh<BufferGeometry, ShaderMaterial> {
    constructor();
    readonly isSky: true;
    material: ShaderMaterial;
    ...
}
```
Hmm, actually older definitions: `export class Sky extends Mesh { constructor(); material: ShaderMaterial; }`. Either way, `.material.uniforms[...].value` works.

If the Mesh generic typing is used, the constructor signature is the same. Fine.

Now: `sky.material.fog = false;` — Material.fog is a boolean property. Exists. Good.

Let me write everything now. I'll also add a few seagull-free extras? No, keep focused.

One more consideration about "It must run smoothly": 220x220 ocean = 48k verts, one draw call. Island 110² verts. Shadows: 2048 map, one directional light, ~20 shadow-casting objects (instanced leaves + trunks + boat). Fine.

Let me write the code.

Also don't forget `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` and the resize handler updating camera.aspect + updateProjectionMatrix + renderer.setSize + setPixelRatio.

Final check on the ocean shader's vertex: `position.xz` — PlaneGeometry rotated by -π/2 about X. Original plane: x ∈ [-250,250], y ∈ [-250,250], z=0. After rotateX(-π/2): y→? Rx(-90°): (x, y, 0) → (x, y*cos(-90) - 0*sin(-90), y*sin(-90)+0*cos(-90)) = (x, 0, -y). So position.z = -y_original, spanning [-250,250]. Good, horizontal.

Then in the shader, `position.xz` spans the grid ✓, and `position.y` = 0 ✓ (we override with h).

Now the boat's forward direction and the fact that the hull's bow is at +Z in local space — yes, halfBeam is narrow at s=1 (z=+2). ✓

Let me write out the boat update function.

```ts
const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();

function updateBoat(t: number): void {
  const px = 12 + 2.0 * Math.sin(t * 0.07);
  const pz = 14 + 2.0 * (1 - Math.cos(t * 0.07));
  const ph = heightAt(px, pz, t) + 0.34;

  // heading follows the drift
  const vx = Math.cos(t * 0.07);
  const vz = Math.sin(t * 0.07);
  const yaw = Math.atan2(vx, vz);

  tmpForward.set(Math.sin(yaw), 0, Math.cos(yaw));
  tmpRight.set(Math.cos(yaw), 0, -Math.sin(yaw));

  const d = 1.7;
  const hF = heightAt(px + tmpForward.x * d, pz + tmpForward.z * d, t);
  const hB = heightAt(px - tmpForward.x * d, pz - tmpForward.z * d, t);
  const hR = heightAt(px + tmpRight.x * 0.9, pz + tmpRight.z * 0.9, t);
  const hL = heightAt(px - tmpRight.x * 0.9, pz - tmpRight.z * 0.9, t);

  const pitchTarget = -Math.atan2(hF - hB, 2 * d);
  const rollTarget = Math.atan2(hR - hL, 1.8);

  boatPitch += (pitchTarget - boatPitch) * 0.12;
  boatRoll += (rollTarget - boatRoll) * 0.12;

  boat.position.set(px, ph, pz);
  boat.rotation.set(boatPitch, yaw, boatRoll);
}
```
The smoothing factor 0.12 per frame is framerate-dependent but fine visually. Let's use delta-based: `const k = 1 - Math.exp(-dt * 6);`. I'll pass dt.

Wait, the boat rotation order must be set to 'YXZ' at creation: `boat.rotation.order = 'YXZ';`. Then `boat.rotation.set(pitch, yaw, roll)` sets x=pitch, y=yaw, z=roll. With order YXZ the matrix = Ry*Rx*Rz ✓.

Hmm, at t=0, yaw = atan2(cos0, sin0) = atan2(1, 0) = π/2. So the bow points toward +X. Good.

Now the pitch sign check: with order YXZ, the pitch is about the boat's local X (right) axis after yaw. A positive rotation.x rotates the +Z (bow) toward... Rx(a)*(0,0,1) = (0, -sin a, cos a), so positive a moves the bow down. We want the bow up when hF > hB → pitch negative. pitchTarget = -atan2(hF-hB, 2d) ✓.

Roll: Rz(a)*(1,0,0) = (cos a, sin a, 0) → positive a raises the +X (right/starboard) side. If hR > hL, the starboard side should be up → positive roll. rollTarget = atan2(hR - hL, 1.8) ✓.

Good.

Now, one more thing: the ocean's waves at the boat position — heightAt gives ±0.95. The boat y offset 0.34 means the hull's keel (local -0.62) is at waterHeight + 0.34 - 0.62 = waterHeight - 0.28, submerged. Good.

Everything checks out. Let me write the final code.

Also, `(window as any).__ocean = { heightAt, time: () => waveTime }` where waveTime is updated each frame.

Let me make sure `waveTime` is assigned before the first frame — initialize to 0.

Let me also double check `renderer.setAnimationLoop` with a callback typed `(time: number) => void`. I'll ignore the param: `renderer.setAnimationLoop(() => {...})`. TS allows a callback with fewer params. Good.

Writing the final answer now.

One last thought on the ocean's ShaderMaterial type: `new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, fog: false, side: THREE.FrontSide })`. `fog: false` is a valid ShaderMaterialParameters field? `ShaderMaterialParameters` extends MaterialParameters which includes `fog?: boolean`. Yes.

Also `transparent: false`.

Let me write the fragment shader with `uTime` declared.

Also: in the vertex shader I should handle the ocean's `vWorldPos` with the model matrix... it's identity, fine.

I also want to double check the shader compiling with `#include <tonemapping_fragment>` — the chunk file name in three is `tonemapping_fragment` (lowercase). Yes: `ShaderChunk.tonemapping_fragment`. And `colorspace_fragment` ✓ (renamed from `encodings_fragment` in r152).

Final code writing.

For the island geometry vertex loop I need `pos.getX(i)` etc. — with BufferAttribute types, `getX` exists. `geo.attributes.position` is `BufferAttribute | InterleavedBufferAttribute`; I'll cast: `const pos = geo.attributes.position as THREE.BufferAttribute;`. Good.

Also `geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))`.

Let me write.

```ts
function buildIsland(): THREE.Mesh {
  const size = 46;
  const segs = 110;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cSandWet = new THREE.Color(0xb9a074);
  const cSand = new THREE.Color(0xe4d2a4);
  const cGrass = new THREE.Color(0x5e8f3c);
  const cGrassDark = new THREE.Color(0x3d6b2b);
  const cRock = new THREE.Color(0x77705f);
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z);
    pos.setY(i, h);

    const e = 0.6;
    const sx = (islandHeight(x + e, z) - islandHeight(x - e, z)) / (2 * e);
    const sz = (islandHeight(x, z + e) - islandHeight(x, z - e)) / (2 * e);
    const slope = Math.hypot(sx, sz);

    const n = fbm(x * 0.22 + 3.1, z * 0.22 + 9.7);

    tmpA.copy(cSandWet).lerp(cSand, smoothstep(-0.8, 1.1, h));
    tmpB.copy(cGrass).lerp(cGrassDark, n);
    tmpA.lerp(tmpB, smoothstep(1.2, 3.4, h) * 0.95);
    tmpA.lerp(cRock, smoothstep(0.55, 1.3, slope) * smoothstep(1.8, 4.5, h));

    // darken the underwater part a bit
    const under = 1 - smoothstep(-1.6, 0.0, h);
    tmpA.multiplyScalar(1 - 0.45 * under);

    colors[i * 3] = tmpA.r;
    colors[i * 3 + 1] = tmpA.g;
    colors[i * 3 + 2] = tmpA.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
```

Note: `new THREE.Color(...)` converts sRGB → linear by default (ColorManagement enabled). Then writing `.r/.g/.b` into the vertex color buffer gives linear values ✓. And `lerp` operates in linear space, fine.

`smoothstep(-0.8, 1.1, h)` — h ranges from -3 to 14. Fine.

The sand-to-grass transition at h 1.2..3.4.

OK.

One thing: `pos.setY(i, h)` before computing the slope — the slope uses islandHeight (analytic), fine.

The mesh's bounding sphere: after modifying positions I should call `geo.computeBoundingSphere()` — PlaneGeometry sets it at construction based on the flat plane; after displacement, the bounding sphere might be slightly off but the plane is 46 wide, and the displacement is ±14, so the existing sphere (radius ~32.5) still contains it mostly. Call `geo.computeBoundingSphere()` to be safe.

Also `geo.computeVertexNormals()`.

Now writing everything out. Let me be careful with template literal backticks inside shader strings — no `${}` in GLSL.

Let me write the final code.

Also: after the first render, set __ready. I'll do it in the loop after renderer.render.

Total code length is significant but fine.

Let me also double-check `THREE.Vector4` array uniforms with `ShaderMaterial`: `uWaves: { value: [Vector4, Vector4, ...] }`. The uniform setter is `setValueV4fArray` which handles arrays of Vector4 ✓.

Writing now.

Actually, one more consideration about the sky: with the sun at elevation 12° and the standard Sky parameters, the sun disc appears. Good.

And `scene.fog = new THREE.Fog(0xc8dbe8, 70, 300)`. Hmm, fog near 70 far 300 with the island at 50 distance: the far side of the island (at ~65 distance) starts to fog slightly. Fine.

Let me reconsider the fog far vs. the ocean plane edge: the ocean is 500x500, so the corner is at (250,250) from the origin; the camera at (35,35) sees the far edge in the view direction at a distance of ~(250-35)*1.414 ≈ 304 → essentially fully fogged at 300 ✓. But parts of the ocean at the screen edges could be closer... e.g., looking toward +x the plane edge is at x=250 → distance 215 from the camera → fog factor at 215: (215-70)/(300-70) = 0.63 → partially fogged. But that's off to the side (the camera looks toward -x,-z), so mostly outside the view or at the extreme screen edge. OK.

Actually, hFov for a 16:9 window is ~79°, so we see ±39.6° around the view direction (225°). So the visible azimuth range is 185°..265°. At azimuth 185°, the ray direction is nearly (-0.09, -0.996) → traveling mostly in -z; the plane edge at z=-250 is at a distance of (250+35)/0.996 ≈ 286 → fog factor 0.94 ✓. At azimuth 265°: direction (0.996, -0.087) → toward +x; the plane edge at x=250 → distance 215/0.996 = 216 → fog 0.63. So at the extreme left/right edges of the screen, the water at the plane boundary is 63% fogged — a visible hard edge could appear! Hmm.

But wait, does the horizon matter at those azimuths? At azimuth 265°, the ray goes toward +x, nearly parallel to the water plane (which is at the camera's height 12). The distance to the horizon... The plane edge at 216 units, seen from a height of 12 → the angular elevation of that point below the horizon is atan(12/216) = 3.2°. The view direction is 11.4° below the horizontal (looking down at the target). So the plane edge appears at 3.2° below the horizontal, which is 8.2° above the view center — within the vertical half-FOV of 25° → yes, visible on screen (upper part of the water). So the edge could show as a line at the left/right screen edges.

To be safe, enlarge the ocean to 700x700 with 220 segments (3.2 units/seg — hmm, too coarse for the small waves) OR increase the fog density so the far edge is fogged.

Better: use fog near 60, far 220. Then at 216 distance it's ~100% fogged. And the island at 50 distance is just starting to fog (0%). The visible water goes from 0 fog at the island to full fog at ~220. That's a hazy ocean. It looks fine and matches "blends the far ocean into the horizon".

Hmm, but then the far ocean is just fog color — the "ocean horizon" is at the fog color, and the sky above it is the sky gradient. It's a common look. Let's do fog near 55, far 210.

Hmm, that's quite hazy for a daytime scene. Alternative: make the ocean plane much bigger (2000x2000) with a non-uniform grid so the segments near the camera are dense. Complex.

Alternative: keep the ocean at 400x400 (200 segments) and add a separate "far ocean" plane (e.g., 4000x4000) at y=0 with a simple flat material matching the fog color, drawn under everything (or simply a large disc at y=0 with the fog color). Since the fog fully kicks in at ~200, the far plane is just the fog color — indistinguishable. But the transition from the animated water to the flat far plane: the far plane is at y=0 while the animated water is at ±1 → at the boundary of the 400x400 plane, there'd be a visible seam... but if the fog is 100% at that boundary, no seam.

Simpler: rely on fog. Use fog(0xc9dceb, 60, 240). The ocean plane is 500x500 (250 half-extent). The nearest edge distance (at azimuth 265°) is 215 → fog 92% — a slight line. Use far = 210, so at 215 → 100% ✓. And at azimuth 185°, the edge is at 286 → 100% ✓. Good: fog near 55, far 210.

Wait — but the boat at distance ~30 and the island at ~50 remain unfogged. The palms at ~50-60 get slightly fogged (5%). Fine.

Hmm, the whole scene may look hazy beyond 100 units. The water in the middle distance will be washed out. For a "game" look, that's acceptable — many games use distance fog.

Alternatively, use exponential fog? FogExp2 with density 0.006 → at 200 units: exp(-(0.006*200)^2) = exp(-1.44) = 0.237 → 76% fogged. At 300: exp(-3.24) = 0.039 → 96%. Hmm, near the plane edge (215): exp(-(1.29)^2)= exp(-1.66)=0.19 → 81% fogged. Still a visible-ish edge.

I'll use linear fog near 50, far 200. At 215 → 100% ✓. At 286 → 100% ✓.

Hmm, but the sky near the horizon is bright/warm while the fog color is pale blue — a visible horizon line is OK (that's how oceans look).

Alright, and the ocean's uFogNear/uFogFar must match: 50 / 200.

Hmm, wait: is it too aggressive? The island's far edge at ~65 → fog 8%. The palms at ~55 → 3%. Fine.

Let me also consider using a higher camera far since the sky is at scale 1500: far = 3000 ✓.

OK, writing now for real.

Actually, one more: the ocean plane 500x500 at 220 segments = 2.27 units/segment. The smallest wavelength 9.5 → 4.2 samples/wavelength. The vertex displacement is fine-ish, but the normals are computed analytically per vertex in the vertex shader and interpolated — that's actually good (smooth normals, no faceting from geometry). The 4.2 samples per wavelength will cause some aliasing in the height/silhouette, but at amplitude 0.09 it's imperceptible. Good.

Now writing.

Also: `THREE.MathUtils.randFloat` etc. not needed.

Let me write the leaf geometry function.

```ts
function buildLeafGeometry(): THREE.BufferGeometry {
  const segs = 12;
  const len = 2.7;
  const maxW = 0.40;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = len * t;
    const y = 0.55 * t - 0.95 * Math.pow(t, 2.2);
    const w = maxW * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.7);
    const dihedral = w * 0.35;
    // center
    positions.push(x, y, 0);
    // left
    positions.push(x, y + dihedral, -w);
    // right
    positions.push(x, y + dihedral, w);
  }

  for (let i = 0; i < segs; i++) {
    const c0 = i * 3, l0 = i * 3 + 1, r0 = i * 3 + 2;
    const c1 = (i + 1) * 3, l1 = (i + 1) * 3 + 1, r1 = (i + 1) * 3 + 2;
    indices.push(c0, r0, r1, c0, r1, c1);
    indices.push(c0, l1, l0, c0, c1, l1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
```

At t=0: w=0, all three vertices coincide → degenerate triangles but harmless. Actually sin(0)=0 → w=0 and dihedral 0 → the first row is all (0,0,0) → degenerate triangles at the base. Fine (no NaN normals? computeVertexNormals on degenerate triangles gives zero-length normals which get normalized to 0,0,0 — could cause a black spot). To avoid, start at t=0 with a small width: use `Math.max(w, 0.02)`. Or just not worry. Let me use `const w = Math.max(0.02, maxW * ...)`. Hmm, that makes the tip blunt. It's fine visually at 0.02.

Actually, computeVertexNormals: for each triangle it computes a face normal and adds it to the vertices; degenerate triangles add zero. Then normalize() of a zero vector gives (0,0,0) in three? `Vector3.normalize()` divides by length || 1. Actually three's BufferGeometry.normalizeNormals uses `Vector3.normalize()` which sets to (0,0,0) if length is 0? Let's check: `normalize() { return this.divideScalar( this.length() || 1 ); }` → zero stays zero. Then the shading normal is zero → lighting artifacts. But the base vertices are at the crown, hidden. Fine. But safer with a min width of 0.02.

Alright.

Now let me finalize and write the answer.

Oh wait — one more important thing: the leaves InstancedMesh must have ≥30 instances. 6 palms × 9 = 54 ✓.

And `__leaves` is the InstancedMesh ✓.

Let me write it.

Final code:

```ts
// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);
```

Also set `document.body.style.margin = '0'` and overflow hidden. Nice touch.

OK writing the answer now. I'll order:

1. imports
2. helpers
3. waves + heightAt
4. renderer, scene, camera, controls
5. sky + sun + lights
6. ocean
7. island
8. palms + leaves
9. boat
10. globals
11. animation loop + resize

Let me write it all.

For the sun direction I'll use:

```ts
const sunDir = new THREE.Vector3();
const elevation = 12;
const azimuth = 235;
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
sunDir.setFromSphericalCoords(1, phi, theta);
```

Check `setFromSphericalCoords(radius, phi, theta)`:
```
const sinPhiRadius = Math.sin( phi ) * radius;
this.x = sinPhiRadius * Math.sin( theta );
this.y = Math.cos( phi ) * radius;
this.z = sinPhiRadius * Math.cos( theta );
```
✓.

The directional light: `sun.position.copy(sunDir).multiplyScalar(150)`. And the shadow camera near/far accordingly: the light is at 150 from the origin. The shadow camera looks at the target (0,0,0) from there. The scene objects are within ±20 of the origin, and the palms are up to ~10 high, so the depth range along the light direction is roughly 150 ± 25. Set near 60, far 260. Also set the shadow camera's left/right/top/bottom = ±50.

Also since the light is at 150 units, with an ortho shadow camera of ±50, the shadow texel size = 100/2048 = 0.049 ✓.

Setting `sun.shadow.camera.updateProjectionMatrix()` isn't needed since the renderer updates it. Actually, after modifying the shadow camera properties, you need `sun.shadow.camera.updateProjectionMatrix()`? The renderer calls `shadow.updateMatrices(light)` each frame which calls `camera.updateProjectionMatrix()`? Let me recall: `LightShadow.updateMatrices` does `camera.updateMatrixWorld()` and computes the shadow matrix — it doesn't call updateProjectionMatrix. So yes, I should call `sun.shadow.camera.updateProjectionMatrix()` after setting the bounds. Do it.

OK, writing.

Also add `sun.shadow.bias = -0.0004;` and `sun.shadow.normalBias = 0.4;`.

Let me write out everything now, carefully.

For the palm trunk taper I need to ensure the TubeGeometry vertex layout assumption (rows of radialSegments+1). TubeGeometry builds: for i in 0..tubularSegments, for j in 0..radialSegments → vertices. So index = i*(radialSegments+1) + j ✓.

Let me write the final code.

One more: `renderer.setAnimationLoop(...)` returns void. Fine.

Also, `(window as any).__ready = true;` only once.

Let me write it.

Also note: The test might check `__boat.position.y` ≈ heightAt(x,z,time()) + offset. We use 0.34 constant offset ✓.

Let me write the final answer.

Also, for extra polish, add a few small rocks on the beach? Skip.

Add a couple of seagull-free — no.

Write.

Also careful: in the fragment shader, `uTime` must be declared (used for foam ripple).

Final check on the ocean fragment's use of `cameraPosition` — declared in the prefix ✓.

Writing.

Actually hold on — the ocean geometry has 221×221 = 48841 vertices with a custom shader. Fine.

Let me now produce the code.

I'll also want the ocean to render with `side: THREE.DoubleSide`? No, FrontSide.

One more: the ocean mesh should probably be added before the island so... doesn't matter with depth testing.

Writing the answer.

For the cabin windows, I'll add one box with `MeshStandardMaterial({color: 0x14242e, roughness: 0.2, metalness: 0.6})`.

OK go.

Also, I realize I should double check the deck geometry z-coordinate: `z = -halfLength + 4*s`? halfLength = 2, so z = -2 + 4s ✓ (that's what I wrote for the hull: `z = -halfLength + 2*halfLength*s` = -2+4s ✓).

Now writing for real. I'll produce the complete file.

Let me handle `boat.rotation.order = 'YXZ'` — set once.

Also `boat.position.set(12, 0.3, 14)` initially.

Final: I'll write the loop:

```ts
const clock = new THREE.Clock();
let waveTime = 0;
let boatPitch = 0;
let boatRoll = 0;
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  waveTime = t;

  oceanMaterial.uniforms.uTime.value = t;

  updateBoat(t, dt);
  updateLeaves(t);

  controls.update();
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

`oceanMaterial.uniforms.uTime` — typed as IUniform; `.value` is any ✓.

Careful: `oceanMaterial.uniforms` — declared as an object literal, so TS knows the shape; `.uTime.value = t` works ✓.

The uniforms object I create: `const oceanUniforms = { uTime: {value: 0}, ... }` — the type of `{value: 0}` is `{value: number}` ✓. But `uSunDir: {value: new THREE.Vector3()}` etc. Fine. Then `new THREE.ShaderMaterial({ uniforms: oceanUniforms, ... })` — ShaderMaterialParameters.uniforms is `{ [uniform: string]: IUniform }`. Assigning my object works since each value has `value: any`. Hmm — is `{value: number}` assignable to `IUniform` which is `{ value: any }`? Yes ✓.

Now writing the answer. Let me be thorough but concise.

Let me write the final file text.

Regarding `THREE.UniformsLib` — not used.

One more check on the shader: `uniform vec4 uWaves[NWAVES];` and JS value array of Vector4 ✓.

Writing now.

Wait, also need `#define NWAVES 4` in the fragment? Only the vertex shader uses it.

OK.

Also, is `position` available in the vertex shader for ShaderMaterial? Yes (BufferGeometry attribute) ✓.

Final answer.