Let me plan this out carefully.

We need a single TS file, strict compile, no external assets. Use Three.js.

Components:
1. Renderer, camera (35,12,35) lookAt (0,2,0). OrbitControls optional — but requirement says camera at exactly (35,12,35) looking at (0,2,0). I'll skip OrbitControls to avoid it moving, or add with no auto-move. Simpler: don't add OrbitControls. But "OrbitControls are allowed if they start there and do not move by themselves" — optional.

2. Sky: use Sky addon objects/Sky.js with sun direction set. Good.

3. Ocean: PlaneGeometry 400x400 with 256 segments. ShaderMaterial with uniforms: uTime, uSunDir, uDeepColor, uShallowColor, uSkyColorTop/Bottom... Custom vertex shader computing waves (Gerstner sum of 3+ waves), displacement, normal computed analytically, foam factor.

We need heightAt in JS to match the shader exactly. Implement a Gerstner wave sum function in JS. Note: Gerstner waves also displace horizontally (x,z) — the requirement says "for Gerstner waves ignore the small horizontal shift". But the shader's vertex displacement displaces both x and z. Hmm — heightAt(x,z,t) returns vertical displacement the shader applies at undisplaced position (x,z). So we just compute the vertical part. Good.

But careful: the boat's y should follow the wave height at its x,z. With Gerstner horizontal shifts, the actual rendered surface at (x,z) is at a different position, but ignoring that small shift is fine per spec.

Let me implement waves:

```
function waveHeight(x, z, t) {
  let y = 0;
  // wave 1
  for each wave { dir (dx,dz), wavelength L, amplitude A, speed s, steepness }
  const k = 2*PI/L;
  const phase = k*(dir.x*x + dir.z*z) - s*t? 
  ...
}
```

Gerstner: y = A * sin(k*(d·p) - omega*t) where omega related to speed. Use amplitude scaling 1... Let's define:

wave list:
1. dir (0.85, 0.53) normalized, L=24, A=0.55, omega=1.6
2. dir (-0.42, 0.91), L=16, A=0.38, omega=2.1
3. dir (0.35, -0.94), L=11, A=0.28, omega=2.6
4. dir (0.95, -0.3), L=7, A=0.16, omega=3.4

Sum amplitudes ≈ 1.37, crest-to-trough up to 2.7. Hmm requirement crest-to-trough 0.5 to 2 units. So amplitudes should sum to about 0.8. Let's use A: 0.42, 0.28, 0.18, 0.10 → sum 0.98 → crest-trough ~1.96... Actually crest-to-trough = 2*sum(A) at max when all aligned? No, sum of sine waves, max amplitude = sum(A) = 0.98, so crest-to-trough = 1.96. That's within ~2. Ok.

Let me make total ~0.9.

Gerstner normal: derivative. For each wave:
y_i = A_i * sin(k_i * (d·p) - omega_i * t)
dy/dx = A_i * k_i * d.x * cos(...)
dy/dz = A_i * k_i * d.z * cos(...)
So normal = normalize(-dy/dx, 1, -dy/dz). Actually for surface y = h(x,z), normal = normalize(-dh/dx, 1, -dh/dz). Yes.

In vertex shader we compute displaced position: pos.x += dx_shift, pos.z += dz_shift where Gerstner horizontal displacement = ... To keep it simple and consistent with heightAt (which ignores horizontal shift), I'll just do vertical displacement only. That's a "sine" sum, still fine — the spec says sum of directional waves (Gerstner or sine). Vertical-only sine waves are acceptable, and matching JS exactly.

Actually a pure sine sum gives nice rolling water but lacks sharp crests. Add a small sharpening? Keep sine sum; visually fine with shading.

Let's make the vertex shader compute normal analytically in the fragment shader (pass vNormal). Good.

Water shader:
- Uniforms: uTime, uSunDir, uDeep, uShallow, and sky colors for reflection.
- Vertex: compute height, normal, foam based on height relative to... We need foam near crests. Compute foamFactor = smoothstep(0.55, 0.95, h / maxAmp) or similar.

Fragment: 
- base color mix deep/shallow based on view angle & height.
- Fresnel: F = pow(1 - dot(n, viewDir... ), 5) maybe using normal and view direction (from fragment to camera).
- Sky reflection: approximate sky gradient color by reflecting ray direction: r = reflect(viewDir, normal); then sample sky color from gradient based on r.y using mix of horizon and zenith colors.
- Sun specular: pow(max(dot(n, sunDir),0), 60)? Use Blinn-ish. Specular highlight.
- Foam: white near crests.
- Also a subtle sparkle.

Distance fade to fog: fragment fog handled by scene.fog? ShaderMaterial doesn't get fog automatically unless we include fog uniforms. We can manually fade: mix color toward horizon color based on distance from camera. Simpler: include fog by computing distance and blending to fog color. Use uniform uFogColor and uFogNear/uFogFar. But scene.fog also affects other materials. Let's manually do it in shader for correctness.

Alternatively use `#include <fog_pars_fragment>` etc., but ShaderMaterial doesn't auto-inject uniforms unless we set fog: true and provide fog uniforms through material.fog = true? Actually ShaderMaterial supports fog only if you include fog chunks and set material.fog=true (material has fog property). Three.js WebShaderMaterial has `fog` boolean, and it will include fog uniforms when material.fog is true? In three.js, ShaderMaterial defines fog uniforms if `fog: true`? Let's recall: ShaderMaterial constructor sets `this.fog = false` by default? The `ShaderMaterial` has parameters `fog` (bool) - yes it exists in newer versions. The shader material's uniforms include fogColor etc.? Hmm. Actually the WebShaderMaterial uses `WebShaderMaterial.setupShader`... Not sure. Safer to manually implement fog in fragment with custom uniforms.

Let's do manual: uniform uFogColor, uFogNear, uFogFar; compute dist = length(vWorldPosition - cameraPosition); fogFactor = smoothstep(near, far, dist); mix.

Also add distance-based color darkening.

Ocean plane: PlaneGeometry(400,400,256,256), rotated -PI/2. Vertices in local XY plane; after rotation, world x = local x, world z = -local y. In vertex shader we operate on `position` before rotation? Attributes: position in local space (x, y, 0) with y the plane's second coord. After applying rotation via mesh rotation, world x = local x, world z = -local y... Actually rotation -PI/2 about X maps local (x,y,0) → (x, 0, -y). So world z = -local y. To compute wave height as function of world x,z: use p.x = position.x, p.z = -position.y. Then displace along local z? Since the plane is rotated, the local z axis becomes world y. So displacing local z by height gives world y displacement. Yes! So in vertex shader, `vec3 p = position; vec2 wp = vec2(p.x, -p.y); float h = wave(wp, uTime); p.z = h;` Then normal computed in local space, which after rotation maps appropriately. Normals: if we set transformed normal in local coords, the rotation applies afterwards (three.js applies modelMatrix to normal). Fine.

Actually careful: normal in local space computed as normalize(-dh/dx_world, 1, -dh/dz_world) in world coords. In local space, world y = local z. World x = local x. World z = -local y. The world-space normal for surface y=h(x,z) is n_world = (-∂h/∂x, 1, -∂h/∂z) normalized. In local space, we need mapping: local coords (lx, ly, lz) → world (lx, lz, -ly). So a world vector (nx, ny, nz) maps to local (nx, -nz, ny). So local normal = (-∂h/∂x, ∂h/∂z, 1)? Let's compute: world normal n = (-hx, 1, -hz). local = (n.x, -n.z, n.y) = (-hx, hz, 1). Good. So in the vertex shader, normal = normalize(vec3(-hx, hz, 1)). Then object's rotation transforms it to world. Good.

Wait but the geometry after rotation: the model matrix rotates. NormalMatrix applied to the local normal gives world normal. Since rotation -90° about X maps (a,b,c) → (a, c, -b)? Let's check rotation matrix about X by -90: 
R = [[1,0,0],[0,cos(-90), -sin(-90)],[0,sin(-90), cos(-90)]] = [[1,0,0],[0,0,1],[0,-1,0]]. So (a,b,c) → (a, c, -b). Yes matches. Good.

So local normal (-hx, hz, 1) → world (-hx, 1, -hz). Correct.

In the fragment, we need world normal for reflection: use vNormal (transformed by normalMatrix? we can compute in vertex: `vNormal = normalMatrix * nLocal` after setting `objectNormal`). In raw ShaderMaterial, we can just compute world normal via `normalMatrix` uniform (available automatically? ShaderMaterial built-in uniforms include modelViewMatrix, projectionMatrix, normalMatrix? For ShaderMaterial, three provides `modelViewMatrix`, `projectionMatrix`, `normalMatrix`? I believe ShaderMaterial includes these built-in uniforms automatically (the shader has them declared in the material's default uniforms). Hmm, actually ShaderMaterial's uniforms are user-defined, but the vertex shader gets `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `modelMatrix`, `cameraPosition`? Let me recall three.js source: `ShaderMaterial` — in `WebShaderMaterial`, shader code receives uniforms declared by user. However, the WebGL renderer injects `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `modelMatrix`, `cameraPosition`? Actually GLSL built-in uniforms are added by the renderer: in `Renderer` there's a list: `uniforms` set: modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix, cameraPosition, and also fog... Yes, three.js WebGLRenderer provides these automatically for ShaderMaterial (they're "built-in" uniforms set per-object). I'm fairly confident: in `ShaderMaterial`, you can use `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `cameraPosition`, `modelMatrix` without declaring them — they're provided by the renderer. Let me verify: three.js `WebGLRenderer` in `_refreshUniformsCommon`: for ShaderMaterial, `refreshUniforms` sets... Hmm. Actually the code: in `ShaderMaterial.getUniforms()`? There's a list in `Renderer.js`:
```
function refreshUniformsCommon( uniforms, material ) {
  uniforms.opacity.value = material.opacity; ...
}
```
The built-in uniforms such as modelViewMatrix, projectionMatrix, normalMatrix, modelMatrix, cameraPosition are set in `material`'s uniform object by `ShaderMaterial` constructor? In `ShaderMaterial.js` (older versions) there's:
```
this.uniforms = uniforms; ... 
```
Hmm.

I know for sure that `cameraPosition` and `normalMatrix` are available in ShaderMaterial without declaration — commonly used in custom shaders. Yes, I've written custom ShaderMaterial with `normalMatrix` and `modelViewMatrix` and it works. Three.js defines these uniforms internally: in `Renderer.js`, `_uniforms` with modelMatrix, normalMatrix, etc., set by `WebGLRenderer` for all materials. Let me be safe by computing world normal manually with our own attributes? Simpler: I can compute vNormal = vec3(...) in world space directly by not using normalMatrix: since our plane is axis-aligned in world (only rotated by -90 about X, model has no translation... Actually the mesh may have rotation only), the local→world mapping is fixed. But safest: compute world normal explicitly:

In vertex shader, I'll compute local normal nLocal = vec3(-hx, hz, 1) (already normalized), then world normal = vec3(nLocal.x, nLocal.z, -nLocal.y). That's exact given the mesh rotation of -PI/2 about X (and mesh at origin). Good, no normalMatrix needed. But if I set mesh.rotation.x = -Math.PI/2, then the vertex shader's output world normal via this formula is correct. And this bypasses any need of normalMatrix. But three also transforms normals from attribute if we use `normal` attribute... we're overriding `objectNormal`? In raw ShaderMaterial we don't need three's normal handling; we just output our own computed normal as `vNormal` and compute lighting ourselves in fragment. That's fine.

Actually in the fragment shader we need world-space normals; we can also just declare varying `vNormal` computed as above and use it.

Lighting: sun direction uniform (world vector normalized pointing from sun toward scene? Typically sunDir = direction of light (from light toward origin) or direction toward sun. We'll define uSunDir = normalized vector pointing toward the sun (i.e., from origin to sun). For specular: dot(n, uSunDir). For reflection we can compute.

Sky: Sky addon with turbidity etc. Set sun position via `sky.material.uniforms['sunPosition'].value.copy(sunDir)` — note Sky's sunPosition expects a direction vector (the position of sun in the sky). We'll set sunDir to e.g. (0.6, 0.5, 0.4) normalized... Wait Sky's sunPosition uniform is a direction (vec3 position of the sun on the sphere). In Sky shader, `sunPosition` used as vec3 and normalized. Typical: `sky.material.uniforms['sunPosition'].value.set(100, 50, 100)` or a direction. Use direction (normalized).

Directional light position = sunDir * 60 (with target at origin). Direction pointing from sun to scene = -sunDir.

Let's pick sunDir = normalize(0.55, 0.62, 0.45) → sun in upper right. Light at 60*sunDir.

Sky addon requires scene.background? Sky is a mesh, big sphere, add to scene. Need to make sure fog blends. With fog far 400.

Sky mesh should not cast/receive shadows. Good.

Ocean at 400x400; camera at (35,12,35) looks at origin — ocean extends to +-200, so fog far ~ 400 makes horizon fade. Sky dome radius 2000 maybe? Sky default scale 450000? The Sky addon geometry is SphereGeometry(1, 32, 15) with scale set? Actually `Sky` object is a Mesh with material; typically you scale it to 450000 or add to scene directly? In examples: `sky.scale.setScalar(450000)`. Hmm, but that's huge and fog may hide it. Sky material has no fog. Fine.

We should also set scene.fog = new THREE.Fog(color, 60, 340) maybe. Then sky is behind fog? The sky mesh is not affected by fog (SkyShader doesn't include fog). So the sky will show fine. Ocean would fade to fog color. The fog color should match horizon color.

Let's set fog color ~ 0xbcd3e0 (light blue), near 80, far 360.

Island:
- Procedural mesh: use a cone-ish shape via custom geometry or a modified sphere? Best: create a ring-lattice island: a radial grid with height computed from noise. Let's do a custom BufferGeometry: radial segments (64 rings?) Actually make a "island" mesh with vertices arranged in polar grid: rings from center to radius R, with height h(r, angle) = peak * (1 - (r/R)^2) plus noise, and slope into sea. Under water near edges, height slightly below 0. Vertex colors: sand at low, grass higher, rock.

But the island as a mesh with radial grid: center at r=0 with high peak, edge at r=R. Let's create a mesh with rings: for i in 0..N (radial rings), radius = R * (i/N) but we want peak at center → radius small. Height = peak * (1 - (r/R))^1.5 maybe + noise * ... and slope into sea (negative at rim). Actually to make island shape: h(r) = peakHeight * (1 - (r/R))^2? That makes sharp center. Hmm, "peak 5 to 15 units above water; sloping into sea". Let's do: h(r) = peak * smooth(1 - r/R) with noise, and near r=R height goes slightly negative (-0.6) so it meets water. Use a radial grid mesh with multiple rings and angular segments (e.g., 48 rings × 96 segments = 4608 verts, fine).

Also add rocks? Keep simple but pretty: island mesh with vertex colors (sand near rim, grass middle, darker rock peak). Add a few bushes? Not required.

Need "sand near the water and grass or rock higher up (vertex colors)". So vertex colors based on height/r.

Add also a beach strip? Not necessary.

Also island receives shadows.

Palm trees: 6 palms on island at positions on the island (radius ~ 8-16). Trunk: curved — build with a series of cylinders? "curved trunk" — use a TubeGeometry along a CatmullRom curve, or several small cylinders. Let's use TubeGeometry with a curve; cast shadows.

Leaves: ONE InstancedMesh with at least 30 instances across all palms. Each palm crown has ~8-10 leaves. 6 palms × 8 = 48 instances. Leaf geometry: a flattened cone or a custom leaf shape (a plane with a taper). Use a custom geometry: leaf as a "blade" — a small elongated shape. Simplest: use a ConeGeometry? Leaves look like curved fronds. Use PlaneGeometry with a shape? Could use `ConeGeometry` scaled flat. Better: a custom BufferGeometry leaf shape (a thin quad with tips). Or use `SphereGeometry` scaled? Hmm.

I'll create a leaf geometry using `PlaneGeometry(1, 2, 4, 8)`?? A flat blade with taper using a custom geometry: vertices along the blade. Let's make a leaf as a tapered blade: length 1.8, width 0.5 at base and 0.05 at tip? Actually palm leaves are long and narrow. Use a simple `ConeGeometry(0.35, 2.2, 6)` scaled? A cone looks like a spike. Better: build a lathe-ish blade from a parametric surface.

Alternative: use `PlaneGeometry(0.5, 2, 1, 6)` and modify vertices: taper width along length, and curve upward (bend). Set y along length, z displacement for droop. That yields a nice frond.

Let's do:
```
const leafGeo = new THREE.PlaneGeometry(0.55, 2.0, 6, 12);
// modify positions: width scaled by taper (1 - t^2), and y curve
```
Hmm, plane geometry lies in XY plane with width along X, height along Y. We want leaf extending outward. We'll orient per-instance with a matrix. To make the leaf droop, bend it: for each vertex, y in [-1,1] (height 2 means from -1 to 1). Take t = (y+1)/2 (0 at base, 1 at tip). Width: x *= (1 - 0.9*t) maybe with taper. And bend: z = -1.0 * t^2 (droop down at tip). Actually we want leaf pointing up-outward and then drooping. If leaf extends along +y from base, then droop means tip bends downward: z displacement in local plane's normal direction.

Let's define leaf geometry with base at origin (y from 0 to 2.2), so translate: use PlaneGeometry(0.6, 2.2, 8, 16) translated by y +1.1 so base at y=0. Then taper: for vertex with y ∈ [0,2.2], t = y/2.2, x *= (1 - 0.85*t)^0.7? Use width factor 1 - t*0.85 with rounded. And bend z = -0.9 * t^2 * something? Wait plane is in XY, z=0. Bend downward = z negative (local). Then rotating instance leaves around.

Also apply a slight curl: z = -0.5*t*t.

Then instance matrices: for each palm at position, crown at top of trunk. Leaves arranged around a ring, rotated by angle, tilted up ~ -20° (pointing upward and outward), then droop. We need to update matrices every frame for wind sway: compute base matrix (position + rotation) then multiply by a sway rotation (small rotation about X/Z varying with time and phase per instance). Keep deterministic.

We must store per-instance base data (position, rotation) and compute matrix each frame.

InstancedMesh: leaf geometry, MeshStandardMaterial with color green, side DoubleSide, castShadow, receiveShadow.

Trunks: For each palm, create a group? Requirement: island exposed as Mesh or Group. We can make island group containing island mesh + trunks + leaves instanced mesh. But leaves should be exposed separately; if it's in the island group, fine.

Palm tree count: 6, at least 5.

Wind sway: update instanceMatrix each frame.

Boat:
Group with hull, deck/cabin, mast, sail. Boat near (12,0,14). 4 units long. Drift slowly: x = 12 + sin(t*0.15)*1.5, z = 14 + cos(t*0.12)*1.2, stays within 25 units.

Hull: use a capsule-ish? Simple: hull from a BoxGeometry scaled/tapered or use a `CapsuleGeometry` rotated? Let's build:
- hull: use a custom shape? Use a `ConeGeometry` rotated? Simplest good-looking: hull made from a scaled sphere (SphereGeometry(1, 24, 16)) scaled (2.0, 0.6, 0.85) with lower half? Hmm sphere bottom is round.

Better: hull as an extruded shape: A boat hull cross-section. Use `THREE.Shape` with a curve (like a lens shape) extruded along length with taper? ExtrudeGeometry from a 2D boat outline and then scale.

Alternative: create hull using a parametric custom geometry: a "boat hull" formed by a lathe? Let's do a simple but convincing hull:

Use `CylinderGeometry`? No.

I'll construct hull via `ExtrudeGeometry`: define shape of hull side profile:
- outline: a closed shape in the X-Y plane representing the boat's side silhouette: bow raised, keel. Then extrude along Z with bevel? Actually extruding side profile along depth gives a flat box shape. Hmm.

Better approach: hull = scaled box with rounded bow: use `SphereGeometry(1, 32, 24)` scaled to (2.0, 0.55, 0.8) and clipped? Looks like a blob. Could be fine as a boat hull if we add a deck on top.

Let's do:
- Hull: `SphereGeometry(1, 32, 16)` scaled (1.9, 0.55, 0.75), plus position y such that top at 0. Use a "cut" no need.
- Deck: `BoxGeometry(3.2, 0.12, 1.25)` at y=0.3 with slight taper? Actually top of hull at y≈0.55.
- Cabin: `BoxGeometry(1.2, 0.5, 0.9)` on deck near aft.
- Mast: `CylinderGeometry(0.05, 0.05, 2.4)` at forward, vertical.
- Sail: `PlaneGeometry(1.3, 2.0)`? A triangular sail: use a custom Shape → `ShapeGeometry` triangle. DoubleSide material.
- Maybe a boom.

Hull material: white/cream with slight roughness; deck wood brown; sail off-white.

Boat must rock: pitch and roll from sampling heights.

For pitch: sample height at (x, z - L/2?) and (x, z + L/2)? The boat's local orientation: we set group rotation around Y maybe fixed heading. Let's define boat's heading along world +z direction? With hull long axis along X by default (sphere scaled 1.9 in x). So long axis along world X. So front at x + 2, behind at x - 2.

Pitch (rotation about Z axis since long axis X): pitch angle = atan2(h_front - h_back, 2*lengthHalf). Roll (rotation about X axis, since side axis Z): roll = atan2(h_left - h_right, width). Wait careful: rotation about X tilts the Z axis vertically: positive rotation about X raises +Z side? R_x(θ) maps +Z to (0, sinθ? ) Let's compute: rotation about X by θ: y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. A point at +Z (0,0,1) → (0, -sinθ, cosθ). So positive θ lowers the +Z side. So to match height difference, roll θ = atan2(h_left_right...). Let's just compute: side A at z=+w, sideB at z=-w. Height at A vs B. We want world height of point = hA. The group's local point at +Z has world y = y0 + ... So rotation θ about X gives local (0,0,w) → world (0, -w sinθ, w cosθ)+y0. Set equal to hA → -w sinθ = hA - y0 → sinθ = (y0 - hA)/w. So θ = atan((y0 - hA)/w). Similarly +X point for pitch rotation about Z: R_z(θ): x' = x cosθ - y sinθ, y' = x sinθ + y cosθ. Local (L,0,0) → (L cosθ, L sinθ). We want world y = hFront → sinθ = (hFront - y0)/L, θ = atan((hFront - y0)/L). Good.

Use small angles.

But should we apply rotation order? Set group.rotation.set(roll about X, yaw maybe, pitch about Z)? Euler order matters. Use quaternion compose or just set rotation.x = roll, rotation.z = pitch, rotation.y = yaw. With default order XYZ... Three's Euler order default 'XYZ' applies X then Y then Z. Fine for small angles.

Also y offset constant: y = heightAt(x,z,t) + 0.35 (hull center above water).

We need boat meshes cast shadows: set each mesh castShadow = true; maybe receive too.

Island: make sure it's above water. Island radius ~ 20 (30-50 units across → 40 diameter → radius 20). Peak ~ 9.

Water foam near shore: can add foam ring using a separate mesh? Optional. Could add foam factor in shader based on distance from island? Not needed but "plus". We can add foam in shader near crests only, and maybe a foam ring mesh around island (a torus/ring with transparent white) as a nice shoreline foam. Let's add a subtle foam ring: RingGeometry around island radius 20 to 26 with vertex alpha? Could do simple: a flat ring mesh with additive transparency animated. Might be nice but risk. Keep it simple maybe skip; spec says foam near crests or near shore is a plus (optional). I'll implement foam near crests in shader, and optionally a shore foam ring. Let's include shore foam as part of ocean shader via a uniform? Hmm, computing foam based on island distance requires distance to island in shader: foam = smoothstep(R+3, R-1, dist)? Actually near shore within 1-3 units of island radius. We can add in shader: `float shoreFoam = smoothstep(2.5, 0.0, abs(distToCenter - 20.0));` blended. That might look like a ring of white foam. Good. But the island base is at radius 20 with height ~0 at rim; foam ring inside radius 20-22. Let's add subtle foam line.

Let's define island radius R = 19, foam band around r ∈ [17.5, 22].

Now ocean shader details:

Vertex:
```
uniform float uTime;
uniform vec3 uSunDir;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFoam;
varying float vHeight;

float waveHeight(vec2 p, float t) { ... }

void main() {
  vec3 p = position;
  vec2 wp = vec2(p.x, -p.y);
  float h = waveHeight(wp, uTime);
  p.z = h;
  vHeight = h;
  // derivatives
  vec2 g = waveGrad(wp, uTime);
  vec3 nLocal = normalize(vec3(-g.x, g.y, 1.0));
  vec3 nWorld = vec3(nLocal.x, nLocal.z, -nLocal.y);
  vNormal = nWorld;
  // position in world: modelMatrix * p
  vec4 wp4 = modelMatrix * vec4(p, 1.0);
  vWorldPos = wp4.xyz;
  vFoam = ...;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}
```
Wait modelMatrix is a built-in uniform? In ShaderMaterial, `modelMatrix` is provided by renderer. I'm fairly sure. Hmm, let me think again. In three.js `ShaderMaterial`, the GLSL built-in uniforms are indeed injected by the renderer: `uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat4 normalMatrix; uniform vec3 cameraPosition;` These are set by the renderer for each material via `WebGLRenderer`'s "common uniforms". Actually in `Renderer`, `_refreshUniformsCommon` sets `uniforms.opacity`, `diffuse`, etc., and also the built-in ones are set in `WebGLRenderer.setUniforms`? Let me recall: In `three.js` source, `WebGLRenderer.js` has `function refreshUniformsCommon(uniforms, material)` and in `_render`... there is `setUniforms(material, uniforms)`? The common uniforms like `modelViewMatrix`, `projectionMatrix` are set by `WebGLRenderer` in `setUniforms` per object (in `renderObject`): `_refreshUniforms(material, object)`? Hmm.

Actually yes: In `Renderer`, `programUniforms` includes `modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `cameraPosition`, and these are set via `material.uniforms` internally? No — for ShaderMaterial, the material's uniforms are user-provided, but the shader declares these as built-in uniforms that the renderer provides via GLSL `uniform` declarations? Wait GLSL doesn't have built-in uniforms except gl_*; three.js injects them into the shader code automatically when compiling? For `ShaderMaterial`, the vertex shader is user-written; the renderer doesn't inject uniform declarations, but the material's `program` is compiled with just user uniforms. However, the renderer sets `material.uniforms` values for built-ins? I remember in older three.js (r<150), `ShaderMaterial` did have `modelViewMatrix` etc. as automatically available because the renderer sets them? Hmm.

Let me recall concretely: I've used `ShaderMaterial` with `vertexShader` that uses `modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `cameraPosition`. I'm quite sure these work without declaring them. Many examples on the web (e.g., custom water shaders) use `modelMatrix`. Yes, e.g. three.js shader examples:

```
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
```

This is standard in ShaderMaterial — works. Good. The renderer provides `modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `cameraPosition` as built-in uniforms to ShaderMaterial by injecting them into `material.uniforms`? Actually the Renderer's `setUniforms` function: `uniforms.modelViewMatrix.value = ...`? Hmm, but the material's shader's `uniform` declarations must exist for these. The renderer in `WebGLRenderer` has a `commonUniforms` object? I recall `ShaderMaterial` shaders don't declare these uniforms; the renderer compiles the program with these uniforms as part of `program` (the `program` includes predefined uniforms via `UniformsLib`?).

Actually in three.js source `ShaderMaterial.js`, when constructing:
```
this.uniforms = uniforms;
```
No built-ins.

But in `WebGLRenderer.js`, `_render`:
```
material.uniforms.modelViewMatrix.value = ...
```
Hmm, `material.uniforms` for ShaderMaterial would be user-declared only; setting `modelViewMatrix` would add it. But shader code must declare `uniform mat4 modelViewMatrix;` for GLSL to accept. Since examples use it without declaring... Let me check an actual example: `three.js/examples/webgl_shaders_ocean.html` uses `ShaderMaterial`? That example uses `THREE.ShaderMaterial`? Actually the ocean example uses built-in? It uses `UniformsLib`? Hmm.

Another known example: custom vertex shader in `ShaderMaterial`:
```
uniform float time;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(...);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
```
This is commonly used in three.js docs (e.g., "ShaderMaterial" tutorial). It works. So indeed built-ins are auto-declared? I believe the renderer injects them by adding to `material.uniforms` and the shader source is compiled with these uniforms declared in the "vertexShader" source? Wait the vertexShader is user code, but the renderer prepends nothing.

Hold on — In `ShaderMaterial`, three.js does inject `#include` of common uniforms? Let me recall `ShaderMaterial` code:
```
const material = new THREE.ShaderMaterial({
  uniforms: ...,
  vertexShader: ...,
  fragmentShader: ...
});
```
The shader code examples indeed use `modelViewMatrix` without declaring. So three must inject declarations. I think the renderer uses `UniformsLib`? No.

Actually I remember: `WebGLRenderer` compiles shader with `ShaderMaterial` using `getShaderProgram` that adds `#define` etc. Hmm.

Let me check memory of three.js `WebGLRenderer.js` source (r16x):
```
function setUniforms( material, uniforms ) ...
```
There's `_uniforms` for `WebShaderMaterial`? 

I'm quite sure the built-in uniforms are declared in the shader by the renderer: In `ShaderMaterial`, the `vertexShader` code is wrapped with "uniform mat4 modelMatrix;"? Not that I recall.

Alternative recollection: `THREE.ShaderMaterial` examples (like `webgl_shaders_ocean`) — I recall the ocean shader from three.js uses `#include <common>`? The example "webgl_shaders_ocean" uses `THREE.ShaderMaterial` with vertex shader containing `varying vec2 vUv;` and `gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);`. Yes, that's from three.js examples. So it works.

Actually maybe the renderer sets `material.uniforms` and then when compiling the program, it uses `ShaderMaterial` with `program` from `this.vertexShader` — but the uniforms are declared in the code by the user? In the ocean example, the vertex shader might include `uniform mat4 modelViewMatrix;`? Hmm.

Let me just avoid relying on built-ins by declaring them explicitly? If we declare `uniform mat4 modelViewMatrix;` in our shader and renderer also declares, duplicate declaration would be an error. Hmm.

Hmm, let me recall the three.js source precisely. In `WebGLRenderer.js` there's a function `setUniforms`? Actually in `Renderer` (the render loop), for each object it calls `refreshUniforms(material, object)`? There is `material.uniforms.modelViewMatrix.value.copy(...)`? Let me recall lines from `three.js/src/WebGLRenderer.js`:

```
function refreshUniformsCommon( uniforms, material ) {
  uniforms.opacity.value = material.opacity;
  ...
  if ( material.map ) ...
}
```

This is for built-in materials. For ShaderMaterial with custom uniforms, the renderer calls? Hmm.

There's `WebGLRenderer.js` `renderObject`:
```
if ( material.isShaderMaterial || material.isRawShaderMaterial ) ...?
```

Hmm. I think the built-in uniforms for ShaderMaterial are handled in `WebShaderMaterial` by defining uniforms in the material? Actually I now recall from three.js docs: "ShaderMaterial: ... The shader material's built-in uniforms: modelViewMatrix, projectionMatrix, normalMatrix, ... are automatically provided." Hmm.

Let me search memory: In three.js, the source `WebGLRenderer.js` includes:
```
const _uniforms = {
  modelMatrix: new Matrix4(),
  modelViewMatrix: new Matrix4(),
  projectionMatrix: new Matrix4(),
  normalMatrix: new Matrix3(),
  ...
};
```
No.

I'm confident the standard pattern works; many StackExchange answers say for ShaderMaterial you can use `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `modelMatrix`, `cameraPosition` without declaring them. Actually I recall the GLSL declared uniforms are added via `ShaderMaterial`'s `vertexShader` being wrapped? In `three.js` source `ShaderMaterial.js`, there's:

```
function getShaderMaterial( material ) {
  ...
}
```

Hmm, no.

Okay let's think: In the compiled program, three.js uses `ShaderMaterial` code as-is. If `modelViewMatrix` is not declared in the code and not declared as uniform, GLSL compile error. Since examples work, the renderer must inject declarations. In `WebGLRenderer.js`, there's a function `getShaderMaterial`? Let me recall: When compiling, the renderer calls `material.program = program` where the vertex shader is `this.vertexShader`. No injection.

Wait — actually I think `ShaderMaterial` shaders *do* declare built-in uniforms because three.js sets `material.uniforms.modelViewMatrix` etc., but the GLSL `uniform mat4 modelViewMatrix;` must be present. In the webgl_shaders_ocean example, view the vertex shader: I recall:

```
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;
varying float vWaveHeight;

void main() {
  vUv = uv; ...
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Hmm maybe it declares `uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;`? I don't remember.

Let me think about GLSL built-ins in three.js: In custom shader code, you can use `modelViewMatrix` without declaring, because three.js's `ShaderMaterial` uses the `#include <common>`? No, that's for built-in ShaderLib.

Hmm. Actually I strongly recall writing custom ShaderMaterial in three.js:

```js
const material = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  ...
});
```

This is a very common pattern from three.js docs ("three.js custom shader"?). Yes, I've seen the "webgl_shaders_ocean" example: The shaders use `#include <common>`? Let me recall the code from three.js example 52 "webgl_shaders_ocean":

```js
const material = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsLib.ocean, ...
});
```

Hmm, not sure.

There's a well-known example in three.js docs for `RawShaderMaterial` vs `ShaderMaterial`: "ShaderMaterial: ... modelViewMatrix, projectionMatrix, normalMatrix and cameraPosition are provided as built-in uniforms." I'm fairly sure of this statement: Indeed, from three.js documentation: 

> ShaderMaterial ... "The following uniforms are provided automatically: modelViewMatrix, projectionMatrix, normalMatrix, cameraPosition, modelMatrix" ? 

I'll trust it. To be safe, I could avoid `modelMatrix` by computing world position using a uniform of the mesh's rotation? Actually we can compute world position ourselves: the plane geometry vertices are known, and the mesh's model matrix is identity except rotation. But `modelMatrix` built-in is convenient. I'll use `modelMatrix` and hope it's built-in. It's a well-known pattern indeed (Sky shader uses modelMatrix internally? The Sky addon uses `modelMatrix`? Let's check Sky's shader: `Sky.js` vertexShader includes `#include <common>`? It uses `vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;`? Hmm the Sky addon's shader (SkySphere) uses `vWorldPosition`? I recall Sky shader:

```
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0);
}
```
Yes! The Sky addon uses `modelMatrix` and `projectionMatrix`/`modelViewMatrix` without declaring—so built-ins are definitely auto-provided for ShaderMaterial. Great.

Now, the ocean shader needs `modelMatrix` for world pos; good.

Fog: we can also use `fog` built-in if material.fog=true? We'll do manual with uniforms and use `vWorldPos` and `cameraPosition` (built-in). Good.

For tone mapping: renderer.toneMapping = THREE.ACESFilmicToneMapping; toneMappingExposure = maybe 1.1. outputColorSpace = THREE.SRGBColorSpace (default in newer three). We'll set it.

Since custom ShaderMaterial's colors are in sRGB? Fragment outputs are linear; with toneMapping enabled, ShaderMaterial output gets tone mapped? In three.js, for ShaderMaterial, toneMapping is applied? I think the renderer sets gl_FragColor and then applies tone mapping only if `material.toneMapped = true`? Actually `ShaderMaterial` doesn't include tone mapping code; the renderer doesn't apply post tone mapping; tone mapping is done in built-in material shader with `#include <tonemapping_fragment>`. For custom ShaderMaterial, you must apply manually. Hmm. Actually tone mapping is applied in the fragment shader of built-in materials via `#include <tonemapping_fragment>` which uses `toneMappingExposure` etc. For custom ShaderMaterial, you'd need to include those chunks. That's complicated in raw shader string (can't use #include in ShaderMaterial? Actually you can use `#include <tonemapping_fragment>` in ShaderMaterial and the renderer will substitute includes? Three.js does process `#include` in ShaderMaterial? I believe `ShaderMaterial` shader code is compiled as-is; `#include` is processed only when using ShaderLib? Hmm, in three.js, `ShaderMaterial` uses `Shader` conversion? The `ShaderMaterial`'s shader code is passed to `ShaderChunk` resolution? No, `#include` is expanded in `ShaderLibrary` for built-in materials, but for custom ShaderMaterial the code goes to `ShaderMaterial` and `glsl` includes are NOT expanded — actually `ShaderMaterial` code does not support `#include`. Right: `#include` expansion happens in `ShaderMaterial`? Hmm, I believe `ShaderMaterial` doesn't process includes because `ShaderMaterial` is raw. But there is `ShaderMaterial` supporting `#include`? The built-in Shaders use `ShaderLib` with `#include` and the renderer expands.

Custom ShaderMaterial: no include processing. So tone mapping: we manually implement ACES? Or simpler: set toneMapping and apply to our shader by doing our own ACES approximation? Could set renderer.toneMapping = THREE.ACESFilmicToneMapping and rely on the fact that the shader output is treated? No, tone mapping is per-fragment code in shader; ShaderMaterial doesn't include it, so colors will not be tone-mapped. However, `material.toneMapped` property? Hmm, in `ShaderMaterial`, if `toneMapped` true, the renderer doesn't do anything. So we must implement tone mapping ourselves.

Alternatively use a `MeshPhysicalMaterial` for water and extend via onBeforeCompile — but spec allows either. Using onBeforeCompile on MeshStandardMaterial may be trickier for waves + normals (would modify built-in shader, includes tone mapping, fog, etc.). Could be nicer. But exposing heightAt matches.

Let's consider onBeforeCompile approach for ocean: use MeshPhysicalMaterial with transparent? Hmm water needs Fresnel, sky reflection — physical material lacks env unless we have a PM generated from sky (we could generate a PM from a scene with Sky). That could give nice reflections: `PMREMGenerator.fromScene` of sky? That requires an env map texture — allowed (procedural, no external asset). But using PMREM adds complexity.

Simpler: custom ShaderMaterial with manual fresnel/reflection/specular and manual tone mapping approximation. I'll implement ACES filmic via a simple function or just apply `pow`/saturation. Actually if we set renderer.toneMapping = ACESFilmic and shader doesn't apply it, output colors are treated as linear and displayed with sRGB conversion (since outputColorSpace sRGB, the renderer sets `gl_FragColor` then converts? The sRGB conversion: The renderer uses `outputEncoding`/`outputColorSpace`; for ShaderMaterial, three.js does not automatically convert to sRGB—output is passed directly to the display. Hmm, in newer versions, `renderer.outputColorSpace = THREE.SRGBColorSpace` and shaders output linear; built-in materials include `#include <colorspace_fragment>` to convert. So for custom ShaderMaterial you'd need to convert manually (`gl_FragColor = vec4(pow(color, vec3(1.0/2.2)), 1.0)` or use `linearToSRGB`).

Actually there's a simpler approach: use ShaderMaterial with manual tone mapping + manual sRGB. Let's just do it: define function `vec3 linearToSRGB(vec3 c) { return pow(c, vec3(1.0/2.2)); }`? Not exact but fine. Or use accurate conversion. Alternatively set `renderer.toneMapping = NoToneMapping` and `outputColorSpace = SRGB` while manually converting in shader? But requirement says ACESFilmic tone mapping, sRGB output. We can set toneMapping = ACESFilmic and apply ACES ourselves in shader using exposure uniform. Fine: set renderer.toneMapping = ACESFilmic; but our shader manually applies ACES → double? No, ShaderMaterial doesn't auto apply. But the built-in materials will apply tone mapping; Sky addon's shader — Sky uses its own tone mapping? The Sky addon material is ShaderMaterial with its own uniforms; I recall Sky shader includes `#include <tonemapping_fragment>`? Let me recall `Sky.js` source: 

```
const sky = new Sky(); ...
```

The material's fragment shader:
```
varying vec3 vWorldPosition;
void main() {
  vec3 vSunDirection = normalize(sunPosition);
  ...
  gl_FragColor = vec4( color, 1.0);
}
```
I think it does not include tone mapping. Hmm, in the Sky example, they set `renderer.toneMapping = THREE.ACESFilmicToneMapping` and it works with Sky? In the official example "webgl_postprocessing_unreal_bloom" etc. Sky is a ShaderMaterial; I think its fragment shader includes `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`? Let me recall Sky.js code:

```
const Sky = class extends class extends ... 
```

Sky.js:
```
const Sky = class Sky extends THREE.Mesh {
  constructor() {
    ...
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        turbidity: ...
        ...
      },
      vertexShader: shader,
      fragmentShader: fragmentShader
    });
  }
}
```

Hmm, the Sky addon fragment shader ends with:
```
gl_FragColor = vec4( color, 1.0);
```
and there's:
```
#include <common>
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
Wait I recall `Sky.js` uses `ShaderMaterial` with `toneMapped`? In the example `webgl_animation_skies.html`? Also `examples/webgl_shaders_sky.html` uses Sky with `renderer.toneMapping = THREE.ACESFilmicToneMapping` and it looks fine. Maybe Sky's shader includes tone mapping chunks because the shader source uses `#include` which ShaderMaterial DOES support? Hmm! Actually three.js ShaderMaterial uses `Shader` class and does support `#include`? Let's check: In `ShaderMaterial`, `Shader` library is used to build `ShaderChunks`? I know `#include` is expanded by `renderer` when compiling programs? The `ShaderMaterial`'s `shader` string goes to `Shader` object? Hmm, no.

Actually I know for `ShaderMaterial` you CAN use `#include <common>` and it will be expanded? Many StackOverflow posts say: "ShaderMaterial does not support #include directives; you must include them manually." But Sky uses #include? Hmm.

Let me recall the actual Sky.js source (three.js r16x). I've seen it:

```js
const Sky = class extends THREE.Mesh {
  ...
}
```
The shaders are quite long:
```
uniform vec3 sunPosition;
uniform float rayleigh;
uniform float turbidity;
uniform float mieCoefficient;
uniform vec3 up;

varying vec3 vWorldPosition;
...
```
No includes maybe.

I'll not rely on tone mapping for Sky; manually apply ACES in ocean shader and accept Sky's own look. If Sky shader doesn't tone-map, it might be too bright with toneMapping exposure, but the sky's own colors are fine. Hmm.

Actually, to guarantee consistency and avoid double conversion issues, perhaps set `renderer.toneMapping = THREE.ACESFilmicToneMapping` (per requirement) and for custom shaders manually apply ACES tone mapping in fragment + convert to sRGB. Wait if `renderer.toneMapping` is set, does the renderer apply tone mapping to ShaderMaterial output? Let's check: In `WebGLRenderer.js`, tone mapping is included in material shaders via `#include <tonemapping_fragment>` for built-in materials. The renderer does not post-process. So custom ShaderMaterial output is raw (linear) and gets displayed without sRGB conversion? Hmm, but `outputColorSpace` conversion also is done per material shader via `<colorspace_fragment>`. So custom shader output is raw. If we don't convert, our colors look wrong (too dark? Actually linear values displayed as if sRGB, they'd appear darker). So manual conversion needed.

So I'll apply ACES and sRGB conversion manually in ocean shader. The Sky will look plausible regardless.

Alternatively, could set toneMapping = ACES and use `Sky` addon which might use includes... risk of double exposure doesn't matter visually much.

Let me be practical: Ocean shader manual ACES + sRGB. Boat and island use MeshStandardMaterial → renderer applies ACES tone mapping and sRGB conversion automatically via built-in shaders. So boat/island colors tone-mapped; ocean manually tone-mapped similarly. Good consistency if our manual ACES matches.

Manual ACES approximation (from three.js `ACESFilmicToneMapping` GLSL):
```
vec3 acesFilm(vec3 x) {
  float a = 2.51, b = 0.03? 
}
```
Three.js chunk:
```
vec3 ACESFilmicToneMapping(vec3 color) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 0.43;
  const float d = 0.59;
  const float e = 0.14;
  return (color * (a * color + b)) / (color * (c * color + d) + e);
}
```
Applied with exposure: `color *= toneMappingExposure`. Good.

Then `linearToSRGB`: three.js has function `linearToSRGB`? In colorspace_fragment: `gl_FragColor = linearToOutputColorSpace(gl_FragColor);` which for SRGB uses `sRGBTransferOETF` etc. Simpler: use `pow(color, vec3(1.0/2.2))`. Good enough.

Now, ocean shading specifics:

Colors: deep ocean #1a4a6e? shallow #2f8f9c? Let's pick:
- uDeep = (0.02, 0.09, 0.15)
- uShallow = (0.12, 0.45, 0.55)
Actually with ACES, values. Use physically plausible colors. Maybe deep = 0.015, 0.055, 0.09; shallow = 0.08, 0.32, 0.42. Add a bit of teal.

Fragment:
```
vec3 viewDir = normalize(cameraPosition - vWorldPos);
vec3 n = normalize(vNormal);
float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0); // maybe use 3.0
// base water color from height and fresnel
vec3 base = mix(uDeep, uShallow, smoothstep(-0.5, 1.0, vHeight) * 0.6 + 0.35);
// sky reflection
vec3 r = reflect(-viewDir, n); // reflect view direction
float skyY = clamp(r.y, 0.0, 1.0);
vec3 skyCol = mix(uHorizon, uZenith, pow(skyY, 0.55));
// sun specular
vec3 sunDir = normalize(uSunDir);
float spec = pow(max(dot(n, sunDir), 0.0), 80.0);
// Fresnel reflection contribution
vec3 color = base * (1.0 - fres * 0.85) + skyCol * fres * 0.85;
// sun highlight
color += vec3(1.0, 0.95, 0.85) * spec * 1.6;
// foam
float foam = smoothstep(0.55, 0.95, vHeight / maxAmp) ... 
```
Need max amplitude uniform uMaxHeight.

Foam: height ranges -A...A; crests where height > ~0.6? Let's compute foam = smoothstep(0.45, 0.85, vHeight / uMaxHeight) * 0.7. Combined with wave normal etc.

Shore foam: compute dist from origin in world xz: `float d = length(vWorldPos.xz); foam += smoothstep(23.0, 18.5, d) ...` Actually to make foam near island shoreline where water meets sand: the water plane extends under the island; foam band around r≈19. But the island covers r<19. So foam visible in ring r ∈ [19, 24]? Hmm the island slopes down from peak to rim at r=19 where height ~ -0.5 (below water), so shoreline where island crosses y=0 is at smaller radius (say ~17). Let's design island geometry to have its rim at radius 19 with height -1.5 (submerged) and the zero-height line at about r=15. Then foam band around r=14-17. Let's just compute foam = smoothstep(20.0, 14.0, d) * ... Actually foam near shore typically in the ring just outside sand. But our island has sand near water; the water is around it. Let's put foam ring at r ∈ [16.5, 19] where water is shallow. Since island mesh covers up to radius 19 with height dropping below water, the water plane is visible around it. So foam at r ≈ 17-19 might be hidden by island. Better to make foam just outside island rim: r from 18.5 to 22. Hmm but if island rim at 19 is below water, then at r between 19 and 22 water shows. So foam band 19-22. Let's use island radius 18 and foam band 18-22.

I'll not overdo shore foam; crest foam is enough. But spec says "foam near crests or near the shore is a plus" — crest foam satisfies.

Let's also add sparkle via a second specular with different direction? Not needed.

Water plane geometry: PlaneGeometry(400, 400, 200, 200) maybe 256. Use 256 to be at limit. 256×256 = 65536 cells, 66049 vertices. Fine. Use 256 segments.

Note: displacement only vertical; the plane's silhouette at the horizon (far) might show waves and clipping; fog hides.

The plane at -PI/2 rotation, at y=0.

Ocean receives shadows? Water can receive shadows from island/boat; but spec doesn't require. Set ocean mesh.receiveShadow = true? ShaderMaterial doesn't support shadows unless we add shadow code. Skip; shadows on island and boat self.

Island geometry:
Let's build with custom BufferGeometry, radial grid.

Parameters:
- R = 18 (diameter 36, within 30-50).
- Peak height H = 9.
- rings = 40, segments = 80.
- height function:
```
function islandHeight(r, a) {
  // r in [0,R]
  const t = r / R;
  // base shape: rounded peak
  let h = H * Math.pow(1 - t, 1.4); // at r=0 → H, at r=R → 0
  // add noise for organic shape
  h += 1.2 * noise-ish using sin combos
  // below water near rim
  h -= 1.2 * smoothstep(0.75, 1.0, t);
  // maybe flatten top
  return h;
}
```
We need sand near water: color based on height. If h <= 1.2 → sand color; 1.2-4 → grass; >4 → rock/darker green. Vertex colors.

But careful: island rim at r=R height ≈ -1.2 → below water; good, slopes into sea.

Noise: add angle-dependent term: `h += 0.9 * Math.sin(a*3.0 + 1.3) * Math.pow(1-t, 1.2)`? That makes peak uneven. Fine.

Also maybe add a second smaller hill? Not needed.

Vertex colors: compute from h and maybe slope. Colors:
- sand: (0.86, 0.78, 0.58)
- grass: (0.24, 0.45, 0.18)
- rock: (0.35, 0.32, 0.28)
Mix by height:
```
if h < 1.6 → sand
else t2 = smoothstep(1.6, 4.5, h) → mix sand→grass
t3 = smoothstep(5.5, 8.5, h) → mix grass→rock/dark
```
Also vary colors with noise for realism. Add small random per-vertex tint.

Geometry: build positions, colors, compute normals via `computeVertexNormals` (works fine for radial grid with non-indexed? Use indexed geometry for smoother). Build indexed: for each ring i, for each segment j: vertex. Then triangles between rings. At the center (i=0, r=0), all vertices coincide → degenerate triangles. Better start ring at r=0.001? Or handle by creating center vertex and first ring. Simpler: start at i=0 with r = R*0.02? But peak should be at center. Use rings from 0 to N; at i=0, r=0, all segment vertices are same point; triangles at i=0 are degenerate. That's fine but normals may be weird. Instead handle center as single vertex: create center vertex and ring 1..N, connect center to ring 1 via triangles. Let's do that.

Actually simpler: build rings i=1..N with r = R * i/N (skip center), and add a top center vertex at (0, H, 0). Then connect center to ring 1. That gives a nice peak.

Let's implement:
```
const seg = 96, rings = 36;
positions = [];
positions.push(0, peakH, 0);
for i in 1..rings:
  r = R * i / rings;
  for j in 0..seg-1:
    a = j/seg * 2π
    // add radial noise
    rr = r + 0.6*Math.sin(a*5 + 2) * (r/R) ... hmm keep simple
    h = islandHeight(r, a)
    positions.push(rr*cos a, h, rr*sin a)
```
Careful: radial noise changes radius; fine.

Indices: center idx 0. For ring 1 (first ring), triangles: for j: center, ring1[j], ring1[j+1] (with winding order such that normals point up). Then for rings between: ring i and i+1: two triangles each quad.

Winding: let's choose order (center, v_j, v_{j+1})? Compute: center (0,0). Points at angle a and a+da. In xz plane, with y up. Triangle (center, p(a), p(a+da)). Normal = cross(p(a)-c, p(a+da)-c). Let p(a) = (cos a, 0, sin a) (ignoring y), p(a+da) = (cos(a+da), 0, sin(a+da)). cross = (0*...? ) compute: u = (cos a, 0, sin a), v = (cos(a+da), 0, sin(a+da)). cross u×v = (0*sin(a+da) - sin a*0, sin a*cos(a+da) - cos a*sin(a+da), cos a*0 - 0*cos(a+da)) = (0, sin a cos(a+da) - cos a sin(a+da), 0) = (0, sin(a - (a+da)) = sin(-da) <0, 0). So normal points down for that winding. Reverse: (center, p(a+da), p(a)) gives up. Let's use indices (0, j+1, j)? Hmm careful ordering. Actually with y up, standard counterclockwise view from above: For upward normal, winding must be counterclockwise when viewed from above (looking down -y). Hmm. Let's just use computeVertexNormals and if normals point down, flip index order. I'll test mentally: Triangle vertices A = (0, h0, 0), B = (cos a, h1, sin a), C = (cos(a+da), h2, sin(a+da)). Normal ≈ (B-A) × (C-A). If B at angle a, C at a+da, then it's a rotation in +angle direction. Viewed from above (+y looking down), the rotation from B to C is counterclockwise? The cross gave negative y, so it points down. So index order should be (center, C, B) i.e. (0, j+1, j). Alternatively swap the ring segment order. I'll use (0, next, current) pattern for center triangles and for quads use appropriate order.

For quads between ring i (inner) and ring i+1 (outer):
inner vertices at angles a_j, a_{j+1}; outer at same angles. Two triangles:
- inner j, outer j, outer j+1? Compute normal. Let inner_j = (cos a_j, h, sin a_j), outer_j = r2*(cos a_j, h2, sin a_j), outer_{j+1}. Hmm.

General rule: for surface with up normal, triangles ordered counterclockwise when viewed from above (i.e., in xz plane, angle increases CCW about +y axis when viewed from above? Wait viewed from above means looking down -y, so x to the right, z to...? Let's not worry: use computeVertexNormals, and if normals mostly downward, reverse all indices. I can just add a check: after computeVertexNormals, test normal.y of some vertex; if negative, flip indices. Or simply set `geometry.scale(1,1,1)` and rely. Let me reason more concretely.

In a right-handed coordinate system with y up, looking from +y down at the xz plane: The x axis to the right, z axis... if we look down -y, then x to the right and z toward viewer? Hmm, standard: right-handed, looking along -y, x right, z up? Confusing. Let's use math: A CCW triangle in the xz plane as viewed from +y has normal +y. The cross product (B-A)×(C-A) with y component = (Bz - Az)(Cx - Ax) - (Bx - Ax)(Cz - Az)? Compute cross (u×v)_y = u_z v_x - u_x v_z. For u = (cos a, 0, sin a), v = (cos(a+da), 0, sin(a+da)): u_z v_x - u_x v_z = sin a * cos(a+da) - cos a * sin(a+da) = sin(a - a - da) = -sin(da) < 0. So (u×v) has y negative. Thus the triangle (A, B, C) with B at a, C at a+da has downward normal. So to get up, use (A, C, B).

Thus center triangles: (0, j+1, j) where index of vertex at angle a_j is j and a_{j+1} is j+1. Wait A=center, B=vertex j (a_j), C=vertex j+1 (a_{j+1}). Use (A, C, B) = (0, j+1, j). Good.

For quad: inner ring i at angles j, j+1; outer ring i+1 same. Triangles: inner_j, outer_{j+1}, outer_j? Let's derive using same pattern: For the radial outward quad, imagine vertices: inner_j (a_j), inner_{j+1} (a_{j+1}), outer_j (a_j), outer_{j+1} (a_{j+1}). The surface normal up. Use order (inner_j, outer_{j}, outer_{j+1})? Let's compute with u = outer_j - inner_j (mostly radial outward), v = outer_{j+1} - inner_j. u ≈ (r2 cos a, h2 - h, r2 sin a). v ≈ (r2 cos(a+da), h2-h, r2 sin(a+da)). y component of u×v = u_z v_x - u_x v_z = r2 sin a * r2 cos(a+da) - r2 cos a * r2 sin(a+da) = -r2^2 sin(da) < 0. So order (inner_j, outer_j, outer_{j+1}) gives down normal. Reverse: (inner_j, outer_{j+1}, outer_j) gives up. Or (inner_j, outer_{j+1}, inner_{j+1})? Let's compute second triangle of quad: (inner_{j+1}, outer_{j+1}, outer_j)? Hmm.

Let me just construct all triangles with a consistent orientation and then after computeVertexNormals, check sign. Easier: build positions and indices using two triangles:
- T1: inner_j, outer_j, outer_{j+1} → down.
- T2: inner_j, outer_{j+1}, inner_{j+1} → compute: u = outer_{j+1} - inner_j, v = inner_{j+1} - inner_j. u_z v_x - u_x v_z ≈ r2 sin(a+da)*r1 cos(a+da)?? messy.

Rather than being clever, I'll just reverse winding globally: use (inner_j, outer_{j+1}, outer_j) and (inner_j, inner_{j+1}, outer_{j+1}). Let's verify T2: vertices A=inner_j, B=inner_{j+1}, C=outer_{j+1}. u = B-A = r1(cos(a+da)-cos a, h_{j+1}-h_j, sin(a+da)-sin a), v = C-A = (r2 cos(a+da) - r1 cos a, h2 - h, r2 sin(a+da) - r1 sin a). This should be up if the quad order follows CCW. Eh.

I'll instead compute normals manually from the height function? Too complex.

Better: after building geometry, run computeVertexNormals and check the y of normal at a mid-vertex; if negative, flip each triangle index order. Simple robust approach:

```
const geom = new THREE.BufferGeometry();
geom.setAttribute('position', new Float32Array(pos));
geom.setAttribute('color', new Float32Array(cols));
geom.setIndex(indices);
geom.computeVertexNormals();
// check
const nAttr = geom.getAttribute('normal') as THREE.BufferAttribute;
if (nAttr.getY(1) < 0) { reverse each triple }
```
Actually flipping only index order after computing normals would leave normals unchanged (since computeVertexNormals uses index order). So flip indices then recompute normals. Or just choose order correctly.

Let me be careful with center triangle orientation and use the same ordering for quads derived from it.

For a full mesh with a top center and rings outward, define vertices ordered around rings. Use triangles:
- Center fan: (center, ring1[j+1], ring1[j]) as derived gives up.
- Ring quads: we can use (ring i [j], ring i+1 [j+1], ring i+1 [j]) and (ring i [j], ring i [j+1], ring i+1 [j+1])? Let's check with our earlier derivation: (inner_j, outer_{j+1}, outer_j) had up normal? We computed u×v with u=outer_j-inner_j, v=outer_{j+1}-inner_j gave negative. But order (inner_j, outer_{j+1}, outer_j): u = outer_{j+1}-inner_j, v = outer_j - inner_j. Then u×v_y = u_z v_x - u_x v_z = r2 sin(a+da) * r2 cos a - r2 cos(a+da) * r2 sin a = r2^2 sin(da) > 0. Up. Good. So triangle T1 = (inner_j, outer_{j+1}, outer_j). 

Second triangle T2 = (inner_j, inner_{j+1}, outer_{j+1}). Check: u = inner_{j+1} - inner_j, v = outer_{j+1} - inner_j. u×v_y = u_z v_x - u_x v_z. Let r1 = inner radius, r2 = outer radius, h similar. Approximate u = r1(cos(a+da)-cos a, ..., sin(a+da)-sin a). v = (r2 cos(a+da)-r1 cos a, ..., r2 sin(a+da)-r1 sin a). Hard. Let's test numerically with simple values: a=0, da=0.1, r1=1, r2=2, h=0. inner_j = (1,0,0). inner_{j+1} = (cos0.1, 0, sin0.1) = (0.995, 0, 0.0998). outer_{j+1} = (1.99, 0, 0.1997). u = (-0.005, 0, 0.0998). v = (0.99, 0, 0.1997). u×v_y = u_z v_x - u_x v_z = 0.0998*0.99 - (-0.005)*0.1997 = 0.0988 + 0.001 = 0.0998 > 0. Up. Good.

So indices per quad: (inner_j, outer_{j+1}, outer_j) and (inner_j, inner_{j+1}, outer_{j+1}). Wait T2 uses inner_j, inner_{j+1}, outer_{j+1}: yes up. Good. Note T1 and T2 form the quad (inner_j, inner_{j+1}, outer_{j+1}, outer_j) traversed in order? Fine.

For center fan using ring1: (center, ring1[j+1], ring1[j]) = up? Earlier we said (A, C, B) with C = j+1 at a+da, B = j at a: (center, j+1, j) gives up. Yes.

Now create geometry with color attribute. Use MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }) — flat shading disabled. Also maybe use `flatShading: false` for smooth. Add `receiveShadow = true`, `castShadow = true`? Island should cast shadows too (on itself and water? water doesn't receive). Set castShadow = true for island; receiveShadow = true.

Palms: trunks as TubeGeometry along curve, castShadow. Leaves instanced mesh castShadow true.

Palm positions: choose radii around 8-14 from center on island. For each, angle random. Height at that point: compute islandHeight(r,a) to place trunk base at that height. But trunk base should be on the island surface; use same function as geometry's height, accounting for radial noise? We'll use same islandHeight without radial noise. Fine.

Palm base y = islandHeight(r, a) - 0.2 (slightly embedded). Trunk curve from base going up with a bend: CatmullRom with points (0,0,0),(0.3,2,0),(0.7,4,0.2)? Use a curve in local space then transform. Let's create trunk as a TubeGeometry of a curve in local coordinates, then place group at base position, rotate around y so trunk bends outward. Simpler: use `THREE.CatmullRomCurve3` with points going up in y and slightly outward in x, then TubeGeometry(curve, 16, 0.16, 8). Position the trunk mesh at (px, baseY, pz), rotation.y = angle to orient bend direction outward. Bend outward: local x positive; after rotation.y = angle, local +x maps to world direction (cos angle, 0, -sin angle)? Rotation about y by θ maps x→(cosθ,0,-sinθ). We want outward radial direction (cos a, 0, sin a) where a is the palm's angle. So set rotation.y = -a? Since x_local maps to (cosθ, 0, -sinθ); to match (cos a, 0, sin a), need cosθ=cos a, -sinθ = sin a → θ = -a. Yes rotation.y = -a.

Crown position: at top of trunk curve end: local end (0.8, 4.5, 0.1) transformed by rotation -a + base. Compute crown world pos = base + R_y(-a) * curveEnd.

Leaves: for each palm, for k in 0..7: instance with position crown + small offset, rotation: arrange around ring: yaw = k/8*2π + offset; pitch = -0.5 rad (tilt outward/down?) Actually leaves radiate from crown and droop downward. Our leaf geometry has base at origin extending +y (up). To radiate outward and droop, rotate leaf about local X? Let's design instance matrix: 
- Start with leaf geometry: base at origin, extends along +y up to 2.2, with bend z negative increasing with t (droop).
- Rotate leaf about X by ~ +1.1 rad (60°) so it points outward horizontally-ish (tilt from vertical); then rotate about Y to orient outward direction.

Hmm, if we rotate about X by angle θ, the +y axis maps to (0, cosθ, sinθ). To point radially outward in world (cos a, 0, sin a), we need a sequence. Let's think: For each leaf, choose a direction angle φ (around the crown). We want leaf's main axis to point outward radially and slightly upward. Use a quaternion: rotate +Y to direction d = (cos φ * sin tilt? , cos tilt?, sin φ * ...). Simpler: compose Euler: rotation order Y then X then Z? Instance rotation via `makeRotationFromEuler(new Euler(...))`.

Maybe easiest: leaf local extends along +Y. Apply rotation about Y by φ to orient toward world xz direction? Rotation about Y maps +Y to +Y (unchanged). Not helpful. Apply rotation about Z by tilt angle, maps +Y toward +X? Rotation about Z by -tilt maps +Y to (sin tilt, cos tilt, 0). Then rotation about Y by φ maps that to (sin tilt cos φ, cos tilt, sin tilt sin φ). Good. So Euler: apply Z rotation first then Y? In three, Euler order 'YXZ' or compose quaternions. We can use `new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, ...))` order. Let's use explicit quaternions:

q = qY(φ) * qZ(-tilt) * qExtra? Since we want first rotate leaf by Z then Y (world axes), the resulting rotation matrix R = R_y(φ) * R_z(-tilt). As quaternion q = qY * qZ. Good.

Then leaf direction d = R * (0,1,0) = R_y * R_z * (0,1,0) = R_y * (sin tilt, cos tilt, 0) = (sin tilt cos φ, cos tilt, sin tilt sin φ). Good: mostly up, tilted outward. tilt ≈ 1.1 rad (63°) gives (0.9*cosφ, 0.44, 0.9*sinφ). Good outward.

Leaves droop: our leaf geometry bends in local -z? Let's make the leaf's local bend in +? The leaf plane is XY; bend along z. If leaf local +y points up-outward, then bending downward relative to leaf means local z... The leaf's local z after rotation: R_z(-tilt) leaves z unchanged (0,0,1); R_y(φ) maps z to (-sinφ, 0, cosφ). Hmm. To droop, we'd want the tip to bend downward (world -y). In local leaf frame, downward relative to leaf axis maybe local -z or +z. With the leaf rotated so +y points up-outward, bending local +z direction would be world ... The rotation R applied to local +z gives R_y(φ) * R_z(-tilt) * (0,0,1) = R_y(φ)*(0,0,1) = (-sinφ, 0, cosφ). This is horizontal, not downward. Hmm, to droop we want a component along world -y. But the leaf geometry's bend along local z doesn't have -y component after this rotation. Instead we should bend along local -y? That's along the axis itself. Hmm.

Let's reconsider: A palm frond radiates outward and slightly up, then droops down at the tip. In local leaf coordinates before rotation, if the leaf extends along +Y and we bend its tip toward +Z (say increasing z), then after rotation R = R_y(φ) R_z(-tilt), local +Z maps to (-sinφ, 0, cosφ) (horizontal). Not downward. So our bend produces sideways curl, not droop. Change R to include tilt around X instead?

Alternative: use leaf geometry extending along +Z (outward horizontally), with droop along -Y. Let's define leaf geometry extending along +Z from base at origin, width along X, droop in -Y. Then per-instance rotation is just yaw φ around Y plus slight upward tilt. Then droop is along local -Y... after yaw, -Y stays -Y. Great! So define leaf along +Z.

Let's build leaf geometry: base at origin, extends along +Z to length L=2.2. Width along X tapering. Droop: for parameter t along Z, y = -droop * t^2 (so tip bends downward) — but palm fronds often arch upward then downward. Could have y = +0.5*sin(pi*t?) Hmm. Let's do: y = 0.55 * t - 0.9 * t^2? At t=1 → -0.35. So rises then droops. Nice arch.

Actually simpler: y = 1.0 * sin(t * Math.PI * 0.5)? Hmm. Let's do a curve: y = 0.8*t - 0.7*t^2 for t in [0,1] → at t=0.5, y=0.4-0.175=0.225; at t=1, 0.1. That's a gentle arch. Then droop more: y = 0.9*t - 1.0*t^2 → at t=1 = -0.1. Hmm not big.

For a palm frond, the whole frond arches out and down from the crown. Since we tilt the leaf up a bit? Let's keep leaf geometry mostly flat with slight downward curve and a per-instance tilt upward (rotate about X by -0.15?). The crown fronds usually start high then droop. Fine.

Let's build the leaf geometry as a thin blade along Z:
```
const L = 2.4, W = 0.55;
const segZ = 16, segX = 4;
for i in 0..segZ:
  t = i/segZ;
  z = t*L;
  y = -0.55 * t*t + 0.25*t; // arch: starts slightly up, droops
  w = W * (1 - Math.pow(t, 1.6)) * (0.8 + 0.2*Math.sin(t*3)); // taper
  for j in 0..segX:
    u = (j/segX - 0.5) * 2; // -1..1
    x = u * w * 0.5? 
```
Hmm width: at base w = 0.5*W? Let's set half-width = W*(1-t^1.5) with W=0.5. Use points: x = u * halfWidth where u ∈ [-1,1].

Also add a crease/normal: maybe not needed. Use Plane-ish triangles. Set double-sided material.

Build indexed geometry with triangles. Use computeVertexNormals.

Then per-instance matrix: position = crown + small local offset (like 0.05). Rotation: Euler or quaternion:
- yaw φ around Y (so leaf extends outward radially: local +Z maps to (sinφ? ) R_y(φ) maps +Z to (sinφ, 0, cosφ). Good. For palm at angle a, leaves should point outward mostly: φ = a? Actually outward direction at palm = (cos a, 0, sin a). Setting φ such that +Z maps to (cos a, 0, sin a): need sinφ = cos a, cosφ = sin a → φ = π/2 - a. Hmm. Or we can just choose leaf angle = a + something. Let's not overthink: leaves arranged around crown at angles φ around Y, with local +Z pointing to (sinφ, 0, cosφ). For a palm at island angle a, outward direction is (cos a, 0, sin a). Set sinφ = cos a, cosφ = sin a, φ = π/2 - a. Then leaf points outward. Other leaves fan around with φ offset.

- Also tilt upward slightly: rotate about X negative? R_x(θ) maps +Z to (0, -sinθ, cosθ). To point slightly upward (positive y), need θ negative: -sinθ>0. Use θ = -0.25.

- Extra droop handled by geometry.

Sway: multiply base rotation by a small time-varying rotation about X or Z: e.g., `sway = 0.08 * sin(t*1.6 + phase)`. Apply rotation about local X? Use additional quaternion q = qX(sway) or qZ(sway). Since the leaf's base is at crown, small sway. Good.

Compute matrices each frame: use `mesh.setMatrixAt(i, matrix)`; `instanceMatrix.needsUpdate = true`.

We also need `matrixAutoUpdate`? For instanced mesh no. Ensure `instanceMatrix.needsUpdate = true` each frame. Also set `mesh.instanceMatrix` update. Call `mesh.updateMatrixWorld`? no.

Number of instances: 6 palms × 9 = 54. Requirement at least 30. Good.

Trunks: MeshStandardMaterial brown, roughness 0.9. Maybe trunk curves outward too.

Now boat detail:
Group `boat = new THREE.Group()`.

Hull: use `SphereGeometry(1, 32, 20)` scaled (2.1, 0.55, 0.85), y position 0. It's a bit like an ellipsoid. But the bottom is rounded, top rounded. We want an open boat with deck. We can place hull scaled and a deck on top. Perhaps use a "hull" with top cut: use SphereGeometry and scale, then scale y to 0.6 and place y=0.35 so top at ~0.9? Hmm.

Alternatively use a custom hull geometry: an extruded shape along length. Let's do a simple hull using a "lathe"? Hmm.

I think a scaled sphere plus a deck plate gives a decent cartoon-but-polished boat. Add a rim: a `TorusGeometry`? Hmm.

Let's do:
- Hull: `SphereGeometry(1, 32, 24, 0, Math.PI*2, 0, Math.PI*0.55)`? That's a top half of sphere (dome). We want hull bottom. Use `SphereGeometry(1, 32, 16)` scaled (2.0, 0.6, 0.8) and clip? Simpler just use full sphere, place center at y=0.45 with scale y=0.6 → bottom at -0.15, top at 1.05? Hmm.

Maybe use `CapsuleGeometry`? A capsule lying horizontally: `CapsuleGeometry(0.6, 2.2, 8, 16)` oriented along X. That's a rounded cylinder; looks like a hull. CapsuleGeometry in three.js r? `THREE.CapsuleGeometry(radius, length, capSegments, radialSegments)` — exists in newer versions (r140+). Default axis Y. Rotate z by π/2 to lie along X. Then scale y (thickness) maybe flatten. Capsule gives rounded ends → nice boat hull. Scale: radius 0.55, length 2.4 → total length ≈ 3.5. Scale y by 0.6 to flatten. But capsule is round; hull would look like a log. Add a deck plane on top, cabin, mast, sail. Good enough.

Actually, better hull: use `BoxGeometry(3.4, 0.65, 1.2)` with bevel? No bevel. A box hull looks like a toy. Hmm.

Let's create hull from a custom extruded shape (a boat side profile) which will look convincing. Use `ExtrudeGeometry` with a shape defining the top view? Hmm.

Consider building hull as a custom BufferGeometry using a parametric surface: for u along length (x from -2 to 2), v around cross-section (angle from -π to π around x axis? Actually hull cross-section: at each x, cross-section is a rounded V shape). Define hull length axis X, cross-section in Y-Z: bottom point at z=0,y=-0.5, sides flare out.

Parametric: for each x, width w(x) = maxWidth * (1 - ((x)/L)^2) maybe, and height profile. Hull shape: bottom keel at y=-0.45, top rim at y=0.2, sides at z = ±w(x). Use a half-ellipse cross-section: points around from left rim (0,0.2,-w) down to keel (0,-0.45,0) up to right rim (0,0.2,w). This is like a U shape. Generate with rings along x (say 24) and cross-section segments (say 12) from -π/2 to π/2? Let's parameterize:

For x in [-L/2, L/2], let s = x/(L/2) ∈ [-1,1], w = maxW * (1 - s^2) maybe (pointed at bow and stern) but boat has stern flat-ish. Use w = maxW * (1 - 0.85*s^2) with rounded. Cross-section: θ from 0 to π (around bottom): 
y = -depth + depth * sin? Let's define cross-section as a half-ellipse from left rim to right rim: 
z = w * cos(θ)?? Hmm we need y and z.

Parametrize θ ∈ [0, π]: 
- At θ=0: left rim: z = -w, y = 0.2.
- At θ=π/2: bottom: z = 0, y = -0.45.
- At θ=π: right rim: z = w, y = 0.2.
Use y = -0.45 + 0.65 * sin? Hmm sin(θ) gives 0 at θ=0/π, 1 at mid. So y = -0.45 + 0.65*sin(θ) → at 0: -0.45 not 0.2. Need y = a + b*cos? Let's use y = -0.35 + 0.55 * sin(θ)?? At θ=0: -0.35, not rim.

Better: use superellipse: z = w*cos(θ - π/2)? Let's param θ from -π/2 to π/2 where z = w*sin(θ)?? Hmm.

Simplest: define the cross section as a curve of points manually for each x:
For j = 0..M, parameter t = j/M ∈ [0,1] going from left rim to bottom to right rim:
- t in [0,0.5]: left side descending: z = -w*(1 - 2t)? At t=0, z=-w, y=0.2; at t=0.5, z=0, y=-0.45.
- t in [0.5,1]: right side ascending.
Use a smooth function: z = -w * cos(2π? ). Let's do z = -w * cos(π t)? Hmm at t=0: -w; t=0.5: 0; t=1: w. Good z = -w*cos(π t)? cos(0)=1 → -w; cos(π/2)=0; cos(π)=-1 → w. Yes.
y = -0.45 + 0.65 * sin(π t)? sin(0)=0 → -0.45; sin(π/2)=1 → 0.2; sin(π)=0 → -0.45. Not right: at rim y should be 0.2. Hmm we want y low at bottom and high at rims. Let's set y = -0.45 + 0.65 * (sin(π t))^? Actually sin(π t) is 0 at both ends. We want 0.2 at ends and -0.45 at middle. Use y = 0.2 - 0.65 * sin(π t). At ends: 0.2 - 0 = 0.2. Middle: 0.2 - 0.65 = -0.45. 

So cross-section:
z = -w*cos(π t), y = 0.2 - 0.65*sin(π t). That gives a U-shaped cross-section (open top). At t=0 and t=1 the top rim at y=0.2 with z=±w. Good.

The hull surface is the outer shell. Normals computed. Add a deck: a flat top surface at y=0.2 that closes the shape? If we close the top with a deck (Box or Plane) it looks like an open boat with a deck? Actually deck at y=0.2 spans from -w to w at each x; we can create a second mesh: a flat top (using same x-z shape) at y=0.2. That would be a flat deck covering the top opening. But then the interior is hidden; that's fine—boat with deck. Could instead leave opening. Simpler: make deck as a slightly smaller flat surface at y=0.18, maybe wooden color. Good, it closes.

Hull geometry: build with rows along x and columns t. At the bow and stern, w small → pointed. But hull cross-section at ends collapses. Fine.

Let's use L = 4.0 total length, x ∈ [-2, 2], maxW = 0.75. w = maxW * (1 - Math.pow(s, 2))? At s=0 -> 0.75, at ends -> 0. That makes a pointed bow and stern, like a canoe. Boat length 4. Good. But canoe-like; add cabin.

Maybe stern should be flat: use w = maxW * (1 - 0.9*s^2) * (0.5 + 0.5*(1 - smooth))... keep simple: pointed both ends is fine for a small sailboat.

Then deck: similar shape at y=0.2 with width w*0.92. Use a custom geometry or use the hull with slightly modified? Simple: create a shape using x and z = ±w, top at y=0.2: that's just a flat ribbon. Build a BufferGeometry with quads. Material wood.

Cabin: box at stern area x=-0.8, y=0.45, z=0; dimensions (1.0, 0.5, 0.7) maybe rounded? Use `BoxGeometry` with a slight bevel not available. Add a small box roof. Fine.

Mast: cylinder at x=0.3, from y=0.2 to 2.6. radius 0.05. Sail: triangle from mast to bow? Actually sail attached to mast. Use a `ShapeGeometry` triangle: points (0,0),(0,1.8),(1.2,0.2)? Hmm. Place sail offset in z. Create a triangle shape with vertices (0,0), (0,1.9), (1.1,0.15) representing a sail. Use `ShapeGeometry` and material DoubleSide. Rotate? ShapeGeometry lies in XY plane; sail in X-Y plane with z = 0 at mast, extends toward +x? A sail on a boat whose length is along X; mast at x=0.3. Sail should extend toward stern or bow. Let's make sail extend toward +X (front) plus maybe. We'll place sail at (0.3, 1.0?) Hmm.

Maybe better make two sails: main triangular sail. Let's define shape points: (0,0), (0, 2.2), (1.6, 0.2) → a triangle. ShapeGeometry in XY plane; position at mast x=0.3, y=0.2, z=0. Maybe extend toward +x. The sail's plane is in XY, which is the boat's side plane; but a sail should be aligned with the boat's length direction, i.e., in the X-Y plane, which is exactly that. Good. It will look like a sail seen from the side. But since the boat's long axis is X, a sail spanning X-Y is like a sail oriented along the boat's length, which is plausible for a sailboat (sail in the fore-aft plane). Hmm real sail is perpendicular-ish? A sail's plane is roughly along the boat's length, yes for a main sail. Good. Add slight z offset ±? Use `side: DoubleSide`.

Also add a boom (thin cylinder) along X at sail bottom? optional.

Add a small flag? not needed.

Maybe add a rudder? no.

Boat rocking: sample heights at front (x+2), back (x-2), left side (z+0.75), right side (z-0.75). But wave heights are for the undisplaced position; fine.

Set boat group position to (x_drift, y, z_drift) with y computed as heightAt + offset. Then rotations.

Boat heading: maybe drift with slow rotation? "may drift slowly" — we can drift x,z and maybe yaw slightly oscillate. But if we yaw, the front/back sampling positions need to account for heading. Keep heading fixed (no yaw) for simplicity, or small yaw. Let's use fixed heading with a slight oscillating yaw? If we set rotation.y = 0, the front/back sample along world X. Good. Add yaw oscillation small maybe 0.05*sin(t*0.3) for liveliness, but then pitch sampling using world positions approximate. Keep yaw = 0 for exactness. Drift is fine.

Now, `heightAt` in JS must match the shader. The shader's wave sum and speed. We'll implement:

```
type Wave = { dx: number; dz: number; amp: number; len: number; speed: number; };
const waves = [
  {dir: (0.94, 0.34), len: 26, amp: 0.42, speed: 1.5},
  {dir: (-0.5, 0.86), len: 17, amp: 0.28, speed: 2.1},
  {dir: (0.25, -0.97), len: 11, amp: 0.17, speed: 2.8},
  {dir: (0.8, -0.6), len: 7.5, amp: 0.10, speed: 3.6},
];
```
Direction normalized. k = 2π/len. phase = k*(d.x*x + d.z*z) - speed*t. Height = sum amp * sin(phase). Max amplitude sum = 0.97; crest-to-trough 1.94. Good.

But shader needs derivatives: dh/dx = sum amp * k * d.x * cos(phase); dh/dz = sum amp * k * d.z * cos(phase). Normal = normalize(-dh/dx, 1, -dh/dz).

We'll implement the wave function in the shader with hardcoded constants (GLSL doesn't support arrays of structs easily? It does). Simpler: write explicit functions in GLSL:

```
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  h += 0.42 * sin(6.2831853/26.0 * dot(vec2(0.94,0.34), p) - 1.5 * t);
  h += 0.28 * sin(6.2831853/17.0 * dot(vec2(-0.5,0.86), p) - 2.1 * t);
  h += 0.17 * sin(6.2831853/11.0 * dot(vec2(0.25,-0.97), p) - 2.8 * t);
  h += 0.10 * sin(6.2831853/7.5 * dot(vec2(0.8,-0.6), p) - 3.6 * t);
  return h;
}
``` 
But need normalized dirs: (0.94,0.34) length ≈ 1.0? sqrt(0.8836+0.1156)=sqrt(0.9992)=0.9996 ≈1. Good enough but normalize in JS to match exactly. Use exact normalized values in both JS and GLSL. Let's compute normalized dirs in JS and use the same values in GLSL.

Let's choose directions and compute normalized numbers:
1. (0.94, 0.34) → norm sqrt(0.8836+0.1156)=sqrt(0.9992)=0.9996. Normalize: dx=0.9404, dz=0.3401. Small difference negligible but to match exactly, use exact constants in both. Let's compute with actual numbers: 0.94/0.9996 = 0.94038; 0.34/0.9996=0.34014. I'll use those.

2. (-0.5, 0.86): norm = sqrt(0.25+0.7396)=sqrt(0.9896)=0.9948. → (-0.50265, 0.86457).
3. (0.25, -0.97): norm = sqrt(0.0625+0.9409)=sqrt(1.0034)=1.0017 → (0.24958, -0.96838).
4. (0.8, -0.6): norm = sqrt(0.64+0.36)=1.0 exactly → (0.8,-0.6). Nice.

I'll define arrays in JS with those normalized values and hardcode same in GLSL.

Wave speeds: use `omega` as 1.5 etc. Height = A sin(k d·p - omega t). In JS `t` is the wave time. Good.

Ocean mesh at origin with rotation -PI/2. In shader, we use `position` local, and world p = (pos.x, -pos.y). If the mesh has rotation only, yes.

But wait: PlaneGeometry local coordinates: x ∈ [-200,200], y ∈ [-200,200]. After rotation -PI/2, world z = -y. So p = (x, -y). Good.

HeightAt in JS should take world coordinates x and z. Good.

We also need the ocean's vHeight and foam. `vHeight` = h. `uMaxAmp` = 0.97.

Fragment foam: `float crest = smoothstep(0.55, 0.95, vHeight / uMaxAmp);` Combined with normal? Maybe foam should be near crests, and more on steep slopes. Use `float foam = smoothstep(0.45, 0.9, vHeight/uMaxAmp) * smoothstep(0.0, 0.6, fres?)`. Let's keep simple.

Also add a shore foam ring based on distance:
```
float shore = smoothstep(22.0, 19.0, length(vWorldPos.xz)); // 1 inside radius 19, 0 outside 22
shore *= smoothstep(0.0, 1.0, vHeight/uMaxAmp + 0.3)? 
```
Hmm if we make foam ring, use vWorldPos.xz distance to origin. Island radius 18. Water plane visible outside island. Foam band should be around island edge. Use `float shore = smoothstep(24.0, 18.0, d) * smoothstep(14.0, 18.0, d);` which creates band d ∈ [14,24]? That's inside island too. Maybe better: foam band d ∈ [18, 23]. `shore = smoothstep(18.0, 23.0, d)` gives 0 at 18, 1 at 23 — no, smoothstep(a,b,x) returns 0 when x<a =18, 1 when x>23. That's foam farther out. We want near island edge: foam at 18-23, so use `shore = 1.0 - smoothstep(18.0, 23.0, d)`? That's 1 for d<18 (under island), 0 for d>23. Hmm.

Maybe: `float shore = smoothstep(18.0, 22.0, d) * (1.0 - smoothstep(22.0, 24.0, d))`? Eh.

Simpler: `float shore = smoothstep(22.0, 18.5, d);` → 1 at d<18.5, 0 at d>22. Then multiply by a wave-driven factor. That creates foam in ring d ∈ [18.5,22] fading. But island covers d<18, so visible ring 18-22. Good.

But foam ring might be too big or weird. Let's include subtle: `foam += shore * 0.35 * (0.5 + 0.5*sin(vHeight*3.0 + d*0.7))`. Fine.

Let's be cautious: foam near shore may look like a white ring, pretty.

Now sky colors:
- uZenith = (0.35, 0.55, 0.85) maybe in linear.
- uHorizon = (0.65, 0.82, 0.92).

Could just use `Sky` addon for the sky dome and sample colors from it; but our ocean reflection uses a simple gradient - fine.

Actually, if we use Sky addon, we should match the sun direction. And set scene.background? Sky mesh covers the background. Also set `scene.fog` color to horizon color.

Sky addon setup:
```
const sky = new Sky();
sky.scale.setScalar(1000); // maybe 45000? Camera at distance ~50; 1000 enough.
const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 8;
skyUniforms['rayleigh'].value = 1.5;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;
skyUniforms['sunPosition'].value.copy(sunDir);
scene.add(sky);
```
Note Sky is a mesh from addon. The default sky material has `side: THREE.BackSide`? yes. It's a sphere.

Sky's sun position: In examples, `sunPosition` is set via `pmremGenerator.fromScene`. Typical: 
```
const sun = new THREE.Vector3();
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
sun.setFromSphericalCoords(1, phi, theta);
sky.material.uniforms['sunPosition'].value.copy(sun);
```
This is direction where sun appears. We'll set directly.

We want sun high-ish: elevation ~ 30°, azimuth ~ 60°.
sunDir = (cos? ). Let's compute: sunDir = (0.55, 0.55, 0.62) normalized? Let's choose: x = 0.6, y=0.5, z=0.6 → normalized length sqrt(0.36+0.25+0.36)=sqrt(0.97)=0.985 → (0.609, 0.507, 0.609). This puts sun to the camera's right-ish/front. Camera at (35,12,35) looking at origin: view direction toward (-35,-12,-35). Sun at (0.6,0.5,0.6) direction is behind the scene from camera's perspective? It's in same direction as camera position, so sun is in front of camera, shining toward scene. This creates a nice backlit view? Hmm, if sun is on the camera's side, the scene is lit from the camera direction, which looks flat. Better to put sun off to the side/back to create rim light: sunDir = (-0.5, 0.6, 0.4)? Let's think aesthetics: Camera at (35,12,35) looking toward origin. If sun is at right side (x positive, z positive) high, then the scene is front-lit, fine. Reflections on water appear toward the sun; the camera sees them if sun is between camera and scene—the specular highlight will be near the center/right. Could be nice.

Maybe choose sunDir = (0.55, 0.42, -0.55) so sun behind the island from camera view, creating backlight rim and sparkle reflections? Then the sky's brightest area is behind the island, and water reflections toward horizon. Might look dramatic. But shadow of island cast toward camera could darken foreground. Hmm.

Choose sun high and slightly left/front: sunDir = (-0.45, 0.65, 0.55). Camera at (35,12,35), so the sun's horizontal direction (-0.45, 0.55) points from origin toward upper-left-front. Shadows fall opposite: (0.45, -0.55) → toward camera's right? The island's shadow would be cast to the right-back? Not important.

Let's pick sunDir = normalize(0.65, 0.55, 0.35) — sun high to the right and front. Directional light position = sunDir * 80. Camera view: sun specular on water visible around center. Good.

The sky addon's sun position should match.

Set light:
```
const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
sun.position.copy(sunDir).multiplyScalar(80);
sun.target.position.set(0,0,0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; far = 200; left=-60; right=60; top=60; bottom=-60;
sun.shadow.bias = -0.0005;
```
Sun intensity with ACES exposure ~1.0. Directional 2.2 maybe too bright; use 1.8. Hemisphere light sky color 0.6 intensity; ambient 0.15.

Actually MeshStandardMaterial with tone mapping; let's set sun intensity 2.5? In physically-based rendering, directional light intensity ~ 2-3 works. We'll use 2.2 and exposure 1.0.

HemisphereLight(0xb3d7f0, 0.35) maybe.

Add a second fill directional? no.

Fog: `scene.fog = new THREE.Fog(0x9fc6d8, 80, 380);` But ocean uses custom fog uniform. Other meshes use scene.fog. Good.

Camera: PerspectiveCamera(45, aspect, 0.1, 1000). Position (35, 12, 35), lookAt(0, 2, 0).

Now ocean: The fog uniform should match scene.fog color and near/far. Use `uFogNear = 80`, `uFogFar = 380`.

Ocean shader fragment manual:
```
vec3 col = ...;
col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));
// tone map
col *= uExposure;
col = ACESFilm(col);
// linear to sRGB
col = pow(max(col, 0.0), vec3(1.0/2.2));
gl_FragColor = vec4(col, 1.0);
```
Note if renderer.outputColorSpace sRGB and material not converted, we manually do. Good.

But wait, `ShaderMaterial` with `toneMapped`? If renderer.toneMapping is ACES, does it affect custom shader? No. Good.

If we apply ACES in shader and renderer.toneMapping also set (global), does the renderer apply tone mapping to ShaderMaterial via something else? I'm confident no. Actually I recall `ShaderMaterial` has property `toneMapped` (default true) and the renderer might apply tone mapping via `material.toneMapped`? Hmm... `MeshStandardMaterial` has `toneMapped` property, but for `ShaderMaterial` I think it doesn't do any automatic conversion. So our manual is correct.

However, to be safe about double tone mapping: If three.js does apply ACES to ShaderMaterial output automatically (I doubt), the scene would be over-darkened. Let's check memory: In three.js, tone mapping is implemented in shader chunks included in built-in materials. Custom ShaderMaterial doesn't include them. So no auto. Good.

But we also need to apply tone mapping manually consistently: our manual ACES will produce values that match built-in materials' tone mapping. Good.

Actually the built-in materials also convert to output color space; our manual conversion does that.

Now shore foam in shader: uses vWorldPos which we compute. Good.

Potential issue: The ocean mesh at y=0, but waves displace up to ~0.97; the island rim at -1.2 below water; foam ring near r=18-22. The island slopes from peak 9 down to -1.2 at r=18. So at r around 16, height maybe 1.5 above water; at r=18 underwater. The shoreline is around r ~ 16.5. Foam band 18-22 is actually outside the island (since island radius 18), water visible from 18 outward. But near shoreline at 16.5, water is under the island (hidden). Hmm foam at 18-22 is a bit offshore, okay.

But maybe island radius R should be 18; the mesh extends to 18. Water plane exists underneath but hidden by island where island is above water. Beyond r=18, island is below water, so water covers it. So foam ring at 18-22 appears just outside where island surface emerges? Actually at r=18 island height = -1.2, so the island is below water, hidden. The visible shoreline is where island height = 0 around r ≈ 16. The foam ring at 18-22 would be separated from the visible shoreline by ~2 units of water? Hmm, the visible island edge is at r≈16, so foam at 18-22 is offshore. Not terrible but slightly disconnected.

Let's design island height so rim at r=R is ~0.2 above water? Then island slopes into sea just at edge. But requirement "sloping into the sea" means extends below water at edge. Let's set island geometry radius R=20, and height at rim = -0.8. The zero-height line at maybe r≈18.5. Then foam band 18.5-22 works. Good.

Let's compute: h(t) = H*(1-t)^1.3 - 0.8*smoothstep(0.85,1.0,t). At t=1 → 0 -0.8 = -0.8. At t=0.9 → H*0.1^1.3 - 0.8*smoothstep(0.85,1,0.9)≈9*0.05? Wait (1-0.9)=0.1, ^1.3 = 0.05, times H=9 → 0.45; smoothstep(0.85,1,0.9) ≈ (0.05/0.15)^2... smoothstep 0.9 between 0.85 and 1: x=(0.05)/0.15=0.333, smoothstep=0.333^2*(3-2*0.333)=0.111*2.333=0.259; -0.8*0.259=-0.207; h≈0.24. So zero crossing around r=0.88*R ≈17.6. Good.

So foam band should be around r 17.5-20. Use `shore = smoothstep(20.5, 17.0, d)` → 1 inside 17, 0 outside 20.5, with fading. At d=17-20.5 foam. Good.

But the island geometry extends to R=18 maybe. Let's set R=18: zero crossing at ~15.8, foam band 16-20.

Let's set R=18, H=9. Then island diameter 36 (within 30-50). Good.

Now, the island vertex positions need color: sand near water. Since the island's visible edge is at height ~0, sand color for low heights, grass above.

Let's implement `islandHeight(r, a)`:
```
const t = Math.min(1, r / R);
const base = H * Math.pow(1 - t, 1.35);
const bump = 0.8 * Math.sin(a * 3 + 1.2) * Math.pow(1 - t, 1.1) + 0.4 * Math.sin(a * 5 + 3.7) * Math.pow(1 - t, 1.2);
const rim = -2.0 * smoothstep(0.86, 1.0, t); // wait -0.8
return base + bump + rim;
```
At t=1: base 0, bump 0, rim -2.0 → too low. Use -1.2.

Actually if we use `-1.2*smoothstep(0.85,1,t)` at t=1 → -1.2. Fine.

But note our island radii with radial noise: we might add `r_eff = r * (1 + 0.04*sin(a*4))`? That makes edge irregular. But then height function uses r/R. Keep simple; radial noise small.

Let's make the island not perfectly circular: use radius modulation: `rr = r * (1 + 0.06 * Math.sin(a * 3.1 + 1.7) + 0.03*Math.sin(a*7))` for the outer rings; but height based on r. Fine.

Colors: compute h at each vertex, then:
```
const sand = new THREE.Color(0.86, 0.78, 0.58)
const grass = new THREE.Color(0.28, 0.52, 0.22)
const rock = new THREE.Color(0.42, 0.38, 0.32)
let c = sand;
if (h > 1.2) mix sand->grass by smoothstep(1.2, 3.5, h)
if (h > 4.5) mix grass->rock by smoothstep(4.5, 8.0, h)
```
Add slight noise variation using vertex index sin.

Since MeshStandardMaterial vertexColors, colors are in sRGB? Vertex colors are converted? In three, `Color` values are stored linear? Actually `THREE.Color` stores sRGB-ish values (r,g,b in 0-1; they are treated as linear? Since r155, Color values are in working color space (linear) if set via setHex? `new THREE.Color(0.86,...)` is linear. Fine.

Now palms: base positions on island. Choose 6:
- (r=6, a=0.5)
- (r=10, a=1.8)
- (r=13, a=4.2)
- (r=8, a=2.8)
- (r=12, a=5.6)
- (r=9, a=0.2)
Ensure heights positive; use islandHeight(r,a) to check. Let's compute approximate: at r=6 (t=0.333), base=9*(0.667)^1.35 ≈ 9*0.58=5.2; at r=10 (t=.556), base=9*0.444^1.35=9*0.34=3.06; at r=13 (t=.722), base=9*0.278^1.35=9*0.17=1.55; r=8 (t=.444), base=9*0.556^1.35=9*0.44=3.96; r=12 (t=.667), base=9*0.333^1.35=9*0.22=2.0. Good, all above water. Trunks base at these heights.

Trunk height ~ 5-6; crown above.

Leaves should be big enough. Palm crown radius maybe 2.5.

Trunk geometry: curve points:
```
const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.35, 1.6, 0.05),
  new THREE.Vector3(0.75, 3.3, 0.1),
  new THREE.Vector3(0.95, 5.0, 0.15),
]);
const trunkGeo = new THREE.TubeGeometry(trunkCurve, 20, 0.16, 8, false);
```
Crown at end: local end = (0.95, 5.0, 0.15). After rotating by -a about Y: world offset = (0.95*cos(-a) + 0.15*(-sin(-a))? Let's just compute using a matrix/quaternion. Simpler: create a group per palm and add trunk to it; then use group's world matrix for crown position? We can compute crown by creating a `THREE.Object3D` for the palm and using `localToWorld`. But easier: trunk mesh rotated and positioned; crown local end transformed by the same rotation: use `new THREE.Vector3(0.95,5.0,0.15).applyAxisAngle(new THREE.Vector3(0,1,0), -a)`. Then add base.

Then trunk mesh: position (px, baseY, pz), rotation.y = -a. But the TubeGeometry is in local coordinates starting at (0,0,0). Good.

Leaves positions: crown world = base + rotated end. Also leaves' y maybe crown + 0.1. Add slight offset.

Leaf instance matrices:
```
const palmInfo = [];
for each palm:
  compute base pos, angle a, crown pos
  for k in 0..8:
    const phi = a + (k/9)*Math.PI*2; // but leaf local +Z maps to (sin phi, 0, cos phi). We want outward radial mostly: for palm at angle a, outward dir = (cos a, 0, sin a). Set phi = π/2 - a? Hmm if leaves fan around, use phi = a + k*... Actually with local +Z mapping to (sin phi, 0, cos phi), to point outward at direction (cos a, 0, sin a), choose phi = π/2 - a. Then other leaves spread with phi variation ±.

Let's just choose leaves angle around crown: phi_k = (π/2 - a) + (k - n/2) * (2π/n)? That makes a full ring of leaves around the trunk, which looks like a palm crown (all fronds radiating in all directions). That's good! For a palm, leaves radiate in all directions around the crown. So use phi_k = k/n * 2π + offset (not tied to a). Then leaves point in all directions. Good. The palm's crown is a ring of fronds. Perfect.
```
Use `phi = k * 2π/n + a*0.5` maybe.

Tilt upward: rotate about X by -0.15? Since after yaw, local +Z maps to horizontal; then a rotation about X tilts it up/down. Compose: q = qY(phi) * qX(-0.2)? Let's derive: local +Z (0,0,1). Apply qX(θ) to local vector: R_x(θ)*(0,0,1) = (0, -sinθ, cosθ). Then qY(phi) rotates: ( -sinθ * ? ) Let's compute R_y(phi)*(0,-sinθ,cosθ) = (cosθ? ) R_y(φ) maps x→(cosφ,0,-sinφ), z→(sinφ,0,cosφ). So vector (0,-sinθ,cosθ) → (sinφ cosθ, -sinθ, cosφ cosθ). So tilt upward if -sinθ > 0 → θ negative. Set θ = -0.25 → y component 0.247. Good, leaves tilt up slightly.

So per leaf: q = qY(phi) * qX(-0.25) * qSway. Also position: crown + small vector? Each leaf base at crown.

But if leaves are arranged all around, they'd overlap the trunk? They start at crown (top of trunk). Fine.

Leaves droop: geometry already curves downward (y negative toward tip). After tilt up by 0.25, still droops at tip.

Our leaf geometry: along +Z, y = 0.25*t - 0.55*t^2? Let's set y = 0.35*t - 0.8*t^2. At t=0.5: 0.175 - 0.2 = -0.025; at t=1: 0.35-0.8 = -0.45. So tip droops 0.45 below base. With tilt up 0.25, tip roughly at -0.2. Fine. Maybe more droop: y = 0.5*t - 1.0*t^2 → tip -0.5, peak at t=0.25 y=0.125-0.0625=0.0625. Good. Use that.

Width taper: halfWidth = 0.45 * (1 - t^1.8) * (0.9 + 0.1*Math.sin(t*4)). At t=0, 0.45; at t=1, 0. Good.

Leaf geometry: 
```
const segZ = 18, segX = 4;
positions, indices.
for i=0..segZ:
  t = i/segZ;
  z = t * 2.6;
  y = 0.5*t - 1.0*t*t;
  halfW = 0.42 * Math.pow(1 - t, 1.8) * (0.85 + 0.15*Math.sin(t*5.0)); // at base 0.85*0.42=0.357
  for j=0..segX:
    u = j/segX - 0.5; // -0.5..0.5
    x = u * 2 * halfW? If u ∈ [-0.5,0.5], x = u * 2 * halfW = u*0.714*... hmm halfW is half-width, so x = u*2*halfW where u in [-0.5,0.5] yields x ∈ [-halfW, halfW]. Correct.
```
Actually let u = (j/segX)*2 - 1 ∈ [-1,1], x = u * halfW. Then halfW = half width. Good.

Triangles: for i in 0..segZ-1, for j in 0..segX-1: quad of (i,j), (i+1,j), (i+1,j+1), (i,j+1). Need winding with normal up? For a leaf, we want double-sided so normals matter less. Use standard index: (a, b, c) etc. computeVertexNormals will produce some normal. Double-sided material handles both. Use indices:
```
const a = i*(segX+1) + j;
const b = (i+1)*(segX+1) + j;
const c = (i+1)*(segX+1) + j+1;
const d = i*(segX+1) + j+1;
indices.push(a,b,c, a,c,d);
```
Fine.

Mesh material for leaves: MeshStandardMaterial({color: 0x2f7a32, roughness:0.8, metalness:0.0, side: THREE.DoubleSide, flatShading? maybe not}). Maybe add `MeshStandardMaterial` with `vertexColors`? Not needed; leaf shape color uniform. Could use a color with slight variation per instance via `instanceColor`? InstancedMesh supports per-instance color via `setColorAt`. We can add slight color variation for realism. Let's do `mesh.setColorAt(i, color)` with colors varying between green shades. But we also need set `instanceColor.needsUpdate`? InstanceColor is a buffer attribute; colors set once. Fine.

Trunks: brown `0x6b4a2f`, roughness 0.9.

Maybe add coconut clusters? Not required.

Island shadows: leaves castShadow true; trunks castShadow.

Instanced mesh leaves: castShadow = true, receiveShadow = true.

Now boat sail material: double-sided, off-white 0xf2f0e6, roughness 0.6. Hull: 0xd8e2e8 (white/blue), or 0x2a6f8f? A small sailboat with white hull and blue stripe. Let's make hull cream white with a blue stripe (maybe a torus ring? not necessary). Add a waterline stripe: a thin band? Could add an additional scaled sphere? Hmm. Simpler: hull material cream; deck wood; cabin cream with dark windows? Add a small window box dark blue. Nice.

Add a rudder? no.

Boat group position and rotations.

Need `__boat` Group; its meshes cast shadows. Good.

Motion: Use `elapsed` from `clock.getElapsedTime()` or accumulate delta. For wave time `time()` we use `elapsed`. We'll store `waveTime` uniform = elapsed. In animation, update uniform `uTime.value = elapsed`. But the ocean shader uses uniform uTime. Expose `time()` returns `oceanTime` (elapsed). Must match exactly the shader's uTime. So set `oceanTime = elapsed` and uniform = oceanTime.

We also want water motion to be consistent.

Animation loop:
```
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05); // delta
  // maybe accumulate time ourselves? Use elapsed = clock.elapsedTime.
  const t = clock.getElapsedTime();
  ...
}
```
But `getElapsedTime` resets? `THREE.Clock` getElapsedTime returns time since start, and getDelta returns delta since last call. If we call `getElapsedTime`, it doesn't consume delta. Actually `getElapsedTime()` calls `getDelta()` internally? Let's recall: `Clock.getElapsedTime()` returns `this.elapsedTime`? In three.js:
```
getElapsedTime() {
  this.getDelta();
  return this.elapsedTime;
}
```
Hmm, `Clock.getElapsedTime()` calls `this.getDelta()`? Let me recall source:
```
getElapsedTime() {
  this.getDelta();
  return this.elapsedTime;
}
```
It uses `elapsedTime` accumulated by `getDelta`. So calling getElapsedTime each frame also advances delta. If we also call getDelta, double advance? Actually `getElapsedTime` starts/updates. Simpler: use `getDelta` and accumulate `elapsed += delta`. Then `time = elapsed`. That's robust. Do:
```
let elapsed = 0;
function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);
  elapsed += delta;
  ...
}
```
Use `elapsed` for wave time. Good.

At first frame, before animation starts, set `__ready` after first render. In animation loop, after first render set flag. Use a boolean `firstFrame` and set `(window as any).__ready = true` after renderer.render? But `setAnimationLoop` calls the callback; we can render inside and set ready. Actually the callback is where we render. So:
```
let first = true;
renderer.setAnimationLoop((time?) => {
  ... 
  renderer.render(scene, camera);
  if (first) { (window as any).__ready = true; first = false; }
});
```
But user says "After the first frame is rendered, set ready = true". Good.

Need `(window as any).__scene`, etc. set immediately.

Potential issue: `setAnimationLoop` callback receives `time` argument? In three.js, setAnimationLoop callback receives `time` (elapsed time) and `frame`? Actually signature `(time: number)`. We can ignore and use our clock. Fine.

Now strict TS compilation. Need careful typing for addons: `import { Sky } from 'three/addons/objects/Sky.js'`? The addon exports a class named `Sky`. We can import:
```
import { Sky } from 'three/addons/objects/Sky.js';
```
Does TypeScript resolve module path? The module specifier 'three/addons/objects/Sky.js' with types? Since no actual file is available in compile environment? For a browser file, tsc with `--strict` requires modules resolvable? Hmm, `three/addons/...` is a bare specifier with a path; TS may not find declarations for `three/addons/objects/Sky.js` unless import maps or d.ts. But many such files compile if `three` package has addons type declarations? In three.js npm package, `three/addons/objects/Sky.js` exists as JS module with no d.ts? Actually three's package includes `examples/jsm/objects/Sky.js` and type definitions maybe `three/examples/jsm/...` with .d.ts? The instruction says import addons from 'three/addons/...'. In TS, `three` resolves to npm package with type declarations in `three.d.ts`? The module `three/addons/objects/Sky.js` might have a `.d.ts` file? The three.js package (r150+) includes `examples/jsm/objects/Sky.js` and possibly type defs under `three/addons/...`? I'm not certain.

To be safe, avoid addon imports. The spec allows sky dome or Sky addon. We can build our own gradient sky dome with ShaderMaterial or a large sphere with vertex colors. That avoids addon import and thus no missing module. But the instructions say "Addons from 'three/addons/...'" — only if needed. We don't need addons. Use a custom sky dome with ShaderMaterial: a gradient based on y plus sun glow. Nice and no missing type.

Let's do a sky dome: SphereGeometry(500, 32, 16), material ShaderMaterial side BackSide (so inside visible), vertex shader passes world position; fragment computes gradient from horizon to zenith and a sun glow around sun direction. That gives a visible sun.

Sky dome shader:
```
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
varying vec3 vWorldPos;
void main() {
  vec3 dir = normalize(vWorldPos);
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.6));
  // sun glow
  float sun = max(dot(dir, normalize(uSunDir)), 0.0);
  col += vec3(1.0, 0.85, 0.6) * pow(sun, 12.0) * 1.2; // bright disc
  // maybe horizon haze
  gl_FragColor = ...
}
```
Need to be careful: the sky dome is huge and camera inside. Use `SphereGeometry(600, 48, 24)` and position at origin. vWorldPos should be computed with modelMatrix but sphere at origin, fine: use `position` directly? The sphere is at origin, so world position = position. But to be generic use modelMatrix. We'll compute `vWorldPos = (modelMatrix * vec4(position,1.0)).xyz` and direction normalize. Fine.

Sun glow: if we want a visible sun disc, add: `float sun = dot(dir, uSunDir); float disc = smoothstep(0.999, 0.9995, sun);` That would be tiny. Better create a sun sprite? We can add a small sphere at far distance along sun direction with emissive-like material (MeshBasicMaterial) to show sun. Or the gradient glow is enough. "with a visible sun position" — the DirectionalLight and sky glow indicate it. Add a bright sun disc sphere: `MeshBasicMaterial({color: 0xfff3d8})` at sunDir * 400, radius 20? But with fog? Basic material no fog? MeshBasicMaterial supports fog maybe. The sun disc should be large enough: at distance 400, radius 12 gives angular size ~0.03 rad, small. Use radius 25. Or use a sprite? Sprite needs texture. Use SphereGeometry(25). It will look like a sun. We'll add a glow sphere with additive? Could use MeshBasicMaterial transparent with opacity? A solid sphere is fine.

Actually the sky dome's sun glow might be enough. But a visible sun disc helps. Add sun mesh at sunDir * 450 with radius 18, color 0xfff2d0, transparent? Set `fog: false`? MeshBasicMaterial's fog default true? We can set `fog: false`? MeshBasicMaterial has `fog` property. Set false so sun not faded by fog. But it's beyond fog far; if not fogged, visible. Good.

However fog affects sky dome? Sky dome material is custom, no fog. So sky visible. The sun sphere with fog false visible. Good.

Wait, scene.fog at far 380; camera at distance 50; the sky dome radius 600 is far beyond fog, but custom shader no fog → sky visible. That's typical. Fine.

Now light: directional light intensity. Under ACES exposure 1.0, we want bright. Let's set `renderer.toneMappingExposure = 1.0` and sun intensity 2.5, hemisphere sky 0.5, ambient? Actually MeshStandardMaterial with environment absent and only directional + hemisphere: could look okay. Add a soft fill directional from opposite side intensity 0.4 (no shadow) to avoid black sides.

Let's set:
- sun: DirectionalLight(0xfff0d8, 2.6)
- fill: DirectionalLight(0x88b4d8, 0.5) from (-30, 20, -30)
- hemisphere: HemisphereLight(0xbcd8ef, 0.5, 0.35? Actually HemisphereLight(skyColor, groundColor, intensity). Use new THREE.HemisphereLight(0xbfd8ee, 0x335044, 0.45).
Could be too bright but ACES will handle.

Shadow map: 2048. Camera bounds ±60. Good.

Now ocean shader with reflection of sky: we need sky colors matching our dome. Use uHorizon/uZenith same as dome. Good.

Water fresnel: water normal is mostly up with slight waves. View from camera at (35,12,35) toward origin: viewDir from fragment to camera; the angle to normal gives Fresnel. Near horizon, fresnel high → sky reflection. Good.

Specular: use `pow(max(dot(n, uSunDir),0), 60.0)` maybe too sharp. Use 120? Water specular from sun is sharp. Use 90. Also add a broad glint: `pow(..., 8) * 0.1`. We'll add:
```
float spec = pow(max(dot(n, sunDir), 0.0), 60.0);
color += vec3(1.0, 0.95, 0.8) * spec * 3.0;
```
With ACES, bright.

Also add a secondary specular from the second sky? Not needed.

Foam color white, blend.

Let's write fragment:
```
vec3 n = normalize(vNormal);
vec3 viewDir = normalize(cameraPosition - vWorldPos);
float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
vec3 base = mix(uDeep, uShallow, clamp(0.5 + 0.5*vHeight/uMaxAmp, 0.0, 1.0));
// maybe shallow near shore: distance factor
float dist = length(vWorldPos.xz);
float shoreShallow = smoothstep(45.0, 15.0, dist); // near origin shallow?
base = mix(base, uShallow, shoreShallow*0.35);
vec3 refl = reflect(-viewDir, n);
float up = clamp(refl.y, 0.0, 1.0);
vec3 skyCol = mix(uHorizon, uZenith, pow(up, 0.7));
vec3 col = base * (1.0 - fres*0.85) + skyCol * (fres*0.85);
// sun
float nds = max(dot(n, sunDir), 0.0);
float spec = pow(nds, 80.0);
float glint = pow(nds, 12.0);
col += vec3(1.0, 0.92, 0.75) * (spec * 2.5 + glint * 0.15);
// foam
float foam = smoothstep(0.55, 0.95, vHeight / uMaxAmp);
float d = length(vWorldPos.xz);
float shoreFoam = smoothstep(20.5, 17.0, d) * smoothstep(17.0, 15.0, d)? 
```
Hmm `smoothstep(a,b,x)` with a>b is invalid? GLSL smoothstep requires edge0 < edge1? Actually it works with reversed? The function is defined as `t = clamp((x-edge0)/(edge1-edge0), 0,1)`, if edge0>edge1 it still computes. It may return 1 when x<edge0? Let's avoid reversed. Use `1.0 - smoothstep(17.0, 20.5, d)` to get 1 for d<17, 0 for d>20.5. That gives foam inside 17 (under island) and fades to 20.5. At d=18, value = 1 - smoothstep(17,20.5,18)=1-0.13=0.87. Good. But we want foam ring from 17 to 20.5. That's fine. It will be visible just outside island.

Multiply foam by wave: `shoreFoam *= 0.5 + 0.5*sin(vHeight*2.0 + d*0.4)`. Then `col = mix(col, vec3(0.9,0.95,1.0), foam*0.7 + shoreFoam*0.4)`. With ACES.

Also depth: `uDeep` etc. Use linear colors maybe:
uDeep = new Color(0.015, 0.05, 0.10) maybe too dark. With ACES, dark. Let's use (0.02, 0.09, 0.16).
uShallow = (0.12, 0.45, 0.52).
uHorizon = (0.68, 0.84, 0.92) maybe.
uZenith = (0.25, 0.5, 0.85).
These are linear. After ACES and sRGB, they'll look nice.

Sky dome uses same colors but maybe brighter; our sky dome shader outputs linear and we must tone map? If we don't, sky will look raw linear → too dark? Actually if we output linear and display as sRGB, colors appear darker. We should apply tone mapping/sRGB to sky dome too. Let's include the same conversion in sky dome shader. Or just set sky dome material as `MeshBasicMaterial` with vertex colors and fog? Hmm.

Custom sky dome shader: include manual ACES + sRGB conversion like ocean. Then sky looks consistent with tone mapping. Good.

Sun disc: MeshBasicMaterial is tone-mapped by renderer (built-in) and converted to sRGB. It will be bright. Fine.

Now, `renderer.outputColorSpace = THREE.SRGBColorSpace` (default maybe). Set explicitly. `renderer.toneMapping = THREE.ACESFilmicToneMapping`. `renderer.toneMappingExposure = 1.0`.

If we manually ACES in custom shaders, and renderer.toneMapping is set to ACES for built-in materials, built-in materials get ACES. Good.

But wait, does the renderer apply tone mapping to ShaderMaterial if `material.toneMapped = true`? Hmm. I want to double check. I recall `ShaderMaterial` has `toneMapped` property but the renderer's `refreshUniformsCommon` etc. does not apply it. The tone mapping chunk is part of the shader code; ShaderMaterial's code has no include. So no. Good.

However, one subtlety: three.js's `WebGLRenderer` applies `gl_FragColor` transformation? There is `outputColorSpace` handled via shader chunks. So custom shader must do manual. Good.

Let's also ensure our ocean shader doesn't show artifacts: use `varying vWorldPos` for fog and foam. Distances.

Potential issue: The ocean plane's far edge at 200 units; camera at 35, distance to edge ~ 240. Fog far 380, so far edge still visible but fogged? At 240, fog factor = (240-80)/(300)=0.53. So far ocean blends. But horizon at 200 units from camera maybe visible as a straight edge against the sky. Hmm, camera at (35,12,35) looking at origin; the ocean plane extends to 200; the horizon line where ocean meets sky at distance ~ 200 along the view direction? The plane's far edge is at 200 from origin, view direction toward origin means the far edge on the opposite side (x=-200,z=-200) is ~280 from camera. The near edge is behind camera. The visible horizon will be the far edge of the plane at ~ 283 distance; fog far 380 means it's not fully fogged but partly. Might show a jagged ocean edge against the sky. To hide this, set fog far ~ 300 and near 100; at 283, factor ~ (283-100)/(200)=0.915, nearly fully fogged. Good. Set fog near 60, far 320. Then ocean edge mostly fog color blends with sky horizon color. Need fog color close to sky horizon. Use fog color = 0.68,0.84,0.92 in linear? But THREE.Fog color is a Color; scene fog used in built-in materials; set `new THREE.Color(0x9db9cc)`? Hmm, fog color should be in linear? THREE.Color values are linear. Use `new THREE.Color(0.55, 0.72, 0.85)`? The horizon color uHorizon is 0.68,0.84,0.92 linear; after tone mapping and sRGB it becomes light blue. Fog color in built-in materials will be tone mapped and sRGB converted automatically, so setting fog color to the linear horizon color should match. Good: `scene.fog = new THREE.Fog(new THREE.Color(0.62, 0.80, 0.92), 70, 330)`.

But our ocean shader manually mixes to uFogColor and then tone maps; that will match.

Actually scene.fog color is set as linear? THREE.Color constructor with a hex is interpreted in sRGB and converted to linear (since r152, Color has `setHex` with colorSpace). `new THREE.Color(0x... )` converts from sRGB to linear (working color space). If we pass floats, it sets them directly as linear? `new THREE.Color(r,g,b)` sets components directly, treated as linear. So use floats matching linear values.

Sky dome shader also outputs manual ACES+sRGB, so horizon color will visually match fog color (fog blend happens before tone mapping? In ocean shader we mix to fog color then tone map; in built-in materials fog is applied in the shader before tone mapping too. So consistent).

Now, possible issue with shadows and fog: fine.

Let's think about island normals. Because we have a top center vertex and rings, computeVertexNormals smooths. The island rim slopes down. Good.

The island is a solid mesh; it's not closed underneath; from the camera we see the top and slopes; the underside is below water, hidden. Fine.

Maybe add a sandy beach ring at water level? The island's rim underwater; visible shoreline is where height crosses 0. Vertex colors make sand near there. Good.

Add rocks on island? Maybe scatter some small rocks (spheres/dodecahedrons) for detail. Not required but improves realism. Could add a few `DodecahedronGeometry` small rocks with rough gray material on the upper island. Nice. But not necessary. Let's add a few bushes/rocks maybe: 3 rocks near peak. Also maybe add small grass tufts? Not needed.

Add a small "lighthouse"? no.

Now palm tree trunks: Use `TubeGeometry` with curves. Ensure each trunk's castShadow. The trunk mesh at base. Since trunk curves outward, we may want the crown to be offset. Good.

Leaves: InstancedMesh created once with count = 6*8 = 48. `new THREE.InstancedMesh(leafGeo, leafMat, 48)`. Set `mesh.instanceMatrix.needsUpdate = true` per frame. Also set `mesh.castShadow = true`, `receiveShadow = true`. Maybe set `frustumCulled = false`? Not needed but instance matrices update; bounding sphere may be off. InstancedMesh computes bounding from geometry; since instances move locally, culling might be okay. Set `leaves.frustumCulled = false`? Could be fine; but not necessary. Yet when swaying, bounding volume computed from instance matrices maybe updated? Three's InstancedMesh bounding sphere is computed from geometry only, not instances? Actually `InstancedMesh` has `computeBoundingSphere`? It might use instance matrices at initialization. To avoid culling issues, set `frustumCulled = false`. Fine.

Boat meshes cast shadows. Island casts and receives.

Water doesn't receive shadows (custom shader). Fine.

Now expose objects.

Potential strict TS errors:
- `(window as any)` is allowed.
- `const renderer = new THREE.WebGLRenderer({ antialias: true })`; `renderer.setSize`; `document.body.appendChild(renderer.domElement)`.
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.
- Resize handler.
- `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
- `scene.background` maybe set to color if sky dome covers. Set `scene.background = new THREE.Color(0x87a9c4)`? But sky dome covers entire view. Could skip. But fog interplay? Sky is drawn behind everything; scene.background not needed.

- `THREE.Color` values with `new THREE.Color(0.02, 0.09, 0.16)`.
- Shader uniform types: `{ value: THREE.Color }` etc. TS types for uniform object are `{ [key: string]: { value: any } }`? `ShaderMaterial` uniforms type is `{ [key: string]: IUniform }` where IUniform has value. Assigning a `THREE.Color` works because value is any in IUniform? In three's types, `IUniform = { value: any }`? Let me check: `interface IUniform { value: any; }`? The type in three.d.ts is `type IUniform = { value: any }`? I think `IUniform` is `{ value: any }`. Good.

- `const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);` type is InstancedMesh. Setting `leaves.setColorAt(i, color)` exists? In three.d.ts, `setColorAt(index: number, color: Color): void`. Good, but `instanceColor` may be null; `setColorAt` creates it automatically? In JS implementation, yes it creates instanceColor if null? `setColorAt` sets `this.instanceColor = new InstancedBufferAttribute(...)` if null? I think yes. To avoid TS issues, just don't use instance colors. Use single material color; simpler. Or use vertex colors on leaf geometry? Fine, use uniform green.

- The leaf geometry creation: typed arrays for positions and indices. `new THREE.BufferGeometry()`; `setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))`; `setIndex(indices)` where indices is number[]; `computeVertexNormals()`. Good.

- Island geometry: positions number[] etc. `geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))`. `computeVertexNormals()`.

- Materials: `MeshStandardMaterial({ vertexColors: true })` with `color`? If vertexColors true, `color` default white multiplies. Good.

- `mesh.receiveShadow = true; mesh.castShadow = true;`

- Boat: create group. Use `THREE.Group`. Add meshes. Set `boat.position`. Rotations.

- Boat hull geometry: custom BufferGeometry. Let's implement hull with positions and indices.

Hull:
```
const hullLength = 4.0;
const halfLen = hullLength/2;
const maxW = 0.78;
const ringsX = 28; // along x
const ringsT = 14; // cross-section subdivisions
positions = [];
for i=0..ringsX:
  const s = (i/ringsX)*2 - 1; // -1..1
  const x = s*halfLen;
  const w = maxW * (1 - Math.pow(Math.abs(s), 2.2)) * (0.85 + 0.15*(1 - Math.max(0, s)))? 
```
Maybe make stern slightly fuller than bow: `w = maxW * (1 - Math.pow(Math.abs(s), 2.0)) * (0.9 + 0.1 * (1 - s))`; at s=1 (bow) w=0; stern s=-1 w=0 too. Pointed at both. If want stern flat, set w at s=-1 to 0.25*maxW. But pointed is fine.

Actually a sailboat hull with pointed bow and rounded stern: let's set stern flat: Use a shape that goes from stern (flat) to bow (pointed). Let s = -1 stern, +1 bow. Width function: `w = maxW * (1 - Math.pow(Math.max(0, s), 2.2))` for bow taper, but at stern s=-1, w = maxW. That makes stern full width. That's plausible. Let's use:
```
const taper = (s > 0) ? 1 - Math.pow(s, 1.8) : 1.0;
const w = maxW * taper;
```
At s=0 w=maxW, at s=1 w=0, at s=-1 w=maxW. Stern is full width but hull ends abruptly. Extrude shape closes? Since cross-section at s=-1 has full width and height; there are open ends at front and stern? Wait the hull geometry with rings from s=-1 to 1 and cross-section from rim left to bottom to rim right, the ends (s=-1 and s=1) are just curves, not closed. The mesh is a surface, not solid. At the stern, the cross-section is a U-shape with open top; no cap at stern; you can see through. Add a stern cap? Add deck covers top; but the underside at stern shows a U-shaped opening? Actually hull surface ends at the line where s=-1; there's no face closing it. But the open ends are only at the top rim; the U-shape is a surface (like a trough) and at the end there's no cap. The hull is like a trough; from the side, you see the interior through the top. Add deck to close top. The ends remain open at top but deck covers; the gap maybe visible at stern? Since deck is flat top above the hull, it covers. But the hull's end line at s=-1—looks like a rim edge. Maybe okay.

Alternatively build hull as a closed solid: add top deck as separate mesh, plus maybe a stern cap. Fine.

Deck: use a similar shape: for i=0..ringsX, x, w, z from -w to w; at y=0.18. Build flat strip with a slight curvature (y = 0.18 + 0.02*sin?). But deck could just be a BoxGeometry scaled? Hmm, use custom geometry:
```
for i=0..ringsX:
  s = ...
  w = maxW * taper * 0.92;
  positions.push(x, 0.18, -w); positions.push(x, 0.18, w)
```
Then indices connecting consecutive strips. Use two triangles per segment. This makes a flat deck following the hull width. Nice. Use wood material.

The deck top visible. Since hull top rim at y=0.2, deck slightly below (0.18) shows inside? Actually deck should be at y=0.2 to close. Use 0.19. Fine.

Cabin: place at stern side x=-1.0, y=0.45? Dimensions (1.1, 0.45, 0.7). Let's compute its top at y = 0.19+0.45 = 0.64. Good.

Maybe cabin should be a rounded box: use `BoxGeometry(1.1, 0.5, 0.7)` at (-0.9,0.44,0). Add a small window: dark blue box on each side? just one on +z side. `BoxGeometry(0.5,0.18,0.02)` at (-0.9,0.48,0.36). Nice.

Mast: at x=0.4 maybe forward of cabin. `CylinderGeometry(0.045,0.05,2.4, 10)` at (0.4, 1.4, 0) since base at 0.19, top at 2.59. Good.

Sail: shape triangle. Use `ShapeGeometry`. Shape points: `(0,0), (0,2.0), (1.5,0.2)`? The sail should attach to mast at x=0.4, y=0.19 and extend toward bow (positive x) or stern? Let's make sail extend toward +x (forward). Points: (0,0), (0,1.9), (1.3,0.15). Place at (0.4, 0.25, 0). The shape's local origin at mast. Add maybe a boom along bottom. The sail plane in XY, so it lies along the boat's length; may look thin from camera angle (camera at 35,35, looking toward origin; boat at (12,14), camera sees boat from the side-ish at angle 45°; a sail in X-Y plane is visible at angle). Good.

Add a second small sail? not needed. Maybe add a jib sail from mast to bow: another triangle in XY. Could look nice. But spec says mast and sail; one is enough. Add a small flag at mast top maybe.

Add a rim stripe: a thin `TorusGeometry`? Not needed.

Boat scale: 4 units long. Our hull length 4. Good.

But our hull w at stern is maxW and at bow 0. The deck. Good.

Hull geometry indices for the trough surface:
For i=0..ringsX-1, for j=0..ringsT-1:
- vertices: (i,j), (i+1,j), (i+1,j+1), (i,j+1). Need normal orientation outward. Since the surface is a trough, normals should point outward from the hull (away from interior). Compute with winding. Let's not worry: We can set `material.side = THREE.DoubleSide`? Hull should be solid-looking; double side would show interior too, which is okay since deck covers. Use `side: THREE.DoubleSide`? That may look fine but shadows weird. Better compute normals. We can rely on `computeVertexNormals` and if some normals inward, hull may appear dark. Let's determine winding.

Coordinates: x along length, z = -w*cos(π t), y = 0.2 - 0.65*sin(π t). At t=0, z=-w, y=0.2. t=0.5, z=0, y=-0.45. t=1, z=w, y=0.2. This is a U cross-section. The outward normal on the left side (z negative) should point toward negative z and down/out. 

We need triangles. Use order: for quad between j and j+1: vertices A=(i,j), B=(i,j+1), C=(i+1,j+1), D=(i+1,j)? Let's compute normal for one point. Take i at s=0, x=0; i+1 at x=+0.1. j at t=0 (z=-w, y=0.2); j+1 at t small (z slightly less negative? cos(π t) at t small ~1, so z ≈ -w; y decreases slightly). Actually as t increases from 0, z = -w cos(π t) → -w*(1 - small) → less negative; y decreases. So along j→j+1, the surface goes from top-left rim downward. Along i→i+1, x increases.

At a point on the left side, the outward normal should be roughly (-? , -, ?). Let's compute triangle (A, B, C): A=(0, y0, -w), B=(0, y1, -w+δ), C=(dx, y1, -w+δ). Vector u = B-A = (0, y1-y0, δ) where y1-y0 <0, δ>0. v = C-A = (dx, y1-y0, δ). u×v = (u_y v_z - u_z v_y, u_z v_x - u_x v_z, u_x v_y - u_y v_x) = ((y1-y0)*δ - δ*(y1-y0), δ*dx - 0, 0*(y1-y0) - (y1-y0)*dx) = (0, δ dx, - (y1-y0) dx). Since dx>0, y1-y0<0, so normal ≈ (0, +, +) → points upward and +z. Hmm that's inward (the left side's outward is -z). So (A,B,C) gives inward-ish. Use reverse: (A,C,B). Let's just use indices and if needed flip.

For the right side at t=1, outward normal +z. But our cross-section symmetric. Probably flipping all is fine if the hull interior is visible through the deck? Actually if normals point inward, the outside of the hull would be dark and the inside lit. With MeshStandardMaterial front-side only (default FrontSide), triangles with normal pointing inward are still rendered? FrontSide renders faces whose winding is counterclockwise from camera; the normal direction doesn't determine visibility, winding does. If normals point inward but winding is such that front faces show outward? The normal used for lighting will be inward wrong. Hmm.

Better compute normals robustly: Since the hull is a trough open at top, the outward direction is away from the boat's interior (which is above the keel and between the sides). For a point on the left side, outward is left (-z) and maybe downward. Our computed normal had +z and +y; that's inward/up. So reverse triangle order gives outward. Let's use indices such that normals outward: For quad, maybe (A, B, C) gives inward, so use (A, C, B). Then second triangle (A, C, D)? Let's define quad vertices: A=(i,j), B=(i+1,j), C=(i+1,j+1), D=(i,j+1). Triangles: (A,B,C) and (A,C,D) perhaps. Our computed (A,B,C) was inward. So use (A,C,B) and (A,D,C) to flip. That yields outward normals? Let's check (A,C,B): u=C-A, v=B-A. u=(dx, y1-y0, δ), v=(0, y1-y0, δ). u×v = (u_y v_z - u_z v_y, u_z v_x - u_x v_z, u_x v_y - u_y v_x) = ((y1-y0)*δ - δ*(y1-y0), δ*0 - dx*δ, dx*(y1-y0) - (y1-y0)*0) = (0, -dx δ, dx (y1-y0)). dx>0, δ>0, y1-y0<0 → normal = (0, -δ dx, - dx |...|) points downward and -z. Outward for left side: -z and downward. Yes. Good.

So use (A,C,B) and (A,D,C). Let's verify second triangle (A,D,C): A=(i,j), D=(i,j+1), C=(i+1,j+1). u = D-A = (0, y1-y0, δ), v = C-A = (dx, y1-y0, δ). u×v = (u_y v_z - u_z v_y, u_z v_x - u_x v_z, u_x v_y - u_y v_x) = ((y1-y0)*δ - δ*(y1-y0), δ*dx - 0, 0 - (y1-y0)*dx) = (0, δ dx, -dx(y1-y0)) = (0, +, +) → inward? Hmm that's up +z. Wait the second triangle should also be on the left side, outward. Hmm my quad definitions confused.

Maybe use simpler: Instead of relying on winding, compute normals manually for the hull. Since the hull surface is a parametric function, we can compute normals from cross product of derivatives and then orient outward. Or simply use `material.side = THREE.DoubleSide` for hull; the lighting uses the normal as computed, which could be inward on one side, causing the hull to appear wrong. But if double-sided, the normal for a face is the same either way; the lighting would use whatever normal. With DoubleSide, the shader flips normal for back-facing fragments? In three, `DoubleSide` material flips the normal in the fragment shader (via `normal *= gl_FrontFacing ? 1 : -1`? Actually `#include <double_side>`? MeshStandardMaterial with side DoubleSide does flip normals for back faces using `gl_FrontFacing`? Yes, three.js sets `normal = gl_FrontFacing ? normal : -normal` in shader when double side? I think `MeshStandardMaterial` handles double-sided with `normal *= gl_FrontFacing ? 1 : -1`? There is `#include <normal_fragment_begin>` with `faceDirection = gl_FrontFacing ? 1.0 : -1.0; normal *= faceDirection`? Something like that. So double-side with correct geometry might look okay. But shadows and normal orientation could be weird.

Let's compute normals explicitly for hull geometry rather than relying on indices. Use parametric normal:

For each surface point, compute derivatives along x and t, cross to get outward normal. Let's derive:

Position P(x, t) = (x, 0.2 - 0.65 sin(π t), -w(x) cos(π t)) with x = s*halfLen and w = maxW * taper(s).

∂P/∂x = (1, 0, -w'(x) cos(π t))? Actually w depends on x. Let's compute in terms of s: x = s*halfLen. dP/dx = (1, 0, -(dw/dx) cos(π t)). dw/dx = maxW * taper'(s) / halfLen. taper' for s>0 = -1.8 s^1.8? hmm derivative of 1 - s^1.8 = -1.8 s^0.8; for s<0 taper=1 derivative 0. There's a kink at s=0. Could cause issues. Simpler use w = maxW * (1 - Math.pow(Math.max(0, s), 2.0)) maybe smooth-ish at s=0 derivative 0. At s=0, taper=1, derivative 0; for s<0 taper=1 derivative 0; smooth. Good. Use taper = 1 - Math.pow(Math.max(0, s), 2.0). This makes bow taper smoothly, stern full. Nice.

Then ∂P/∂x = (1, 0, -(dw/dx) cos(π t)). dw/dx = maxW * (-2 s)/halfLen for s>0 = -2 * maxW * s / halfLen. So - (dw/dx) cos = (2 maxW s / halfLen) cos(π t).

∂P/∂t = (0, -0.65 π cos(π t), w π sin(π t)). Wait derivative of -w cos(πt) wrt t = w π sin(πt). Yes.

Outward normal should be perpendicular to surface and pointing away from interior. Compute cross of ∂P/∂x and ∂P/∂t: n = ∂P/∂x × ∂P/∂t? Let's test at t=0 (top left rim, z=-w, y=0.2): ∂P/∂x = (1, 0, -dw/dx cos0) = (1,0,-dw/dx). At s=0, dw/dx=0 → (1,0,0). ∂P/∂t at t=0: (0, -0.65π, 0) (since sin0=0). Cross (1,0,0) × (0,-0.65π,0) = (0*0 - 0*(-0.65π), 0*0 - 1*0, 1*(-0.65π) - 0*0) = (0, 0, -0.65π) → points -z. Outward (left side) is -z. Good! So n = ∂P/∂x × ∂P/∂t gives outward at left rim. At t=1 (right rim): ∂P/∂t = (0, -0.65π cosπ = +0.65π, 0) (sinπ=0). ∂P/∂x ≈ (1,0, -dw/dx * cosπ = (1,0, +dw/dx)). Cross at s=0: (1,0,0) × (0, +0.65π, 0) = (0*0 - 0*+0.65π, 0*0 - 1*0, 1*0.65π - 0) = (0,0,0.65π) → +z. Outward right side. Good. So normal n = ∂P/∂x × ∂P/∂t is outward. Nice.

We can compute per vertex normals manually and assign. But easier: choose index winding that matches this normal. The triangle order should be such that the cross product of edges matches ∂P/∂x × ∂P/∂t. Use vertices A=(x,t), B=(x+dx,t), C=(x,t+dt). Then u=B-A ≈ ∂P/∂x * dx, v=C-A ≈ ∂P/∂t * dt. Cross u×v = dx*dt*(∂P/∂x × ∂P/∂t) = outward. So triangle (A,B,C) with A=(i,j), B=(i+1,j), C=(i,j+1) gives outward. Great! So indices: (i,j), (i+1,j), (i,j+1) and the other triangle (i+1,j), (i+1,j+1), (i,j+1)? Let's verify: A=(i+1,j), B=(i+1,j+1), C=(i,j+1). u = B-A ≈ ∂P/∂t * dt, v = C-A ≈ -∂P/∂x * dx + ∂P/∂t * dt? Hmm. The quad triangles should together be consistent. Use triangles:
T1: (i,j), (i+1,j), (i,j+1) → outward.
T2: (i+1,j), (i+1,j+1), (i,j+1). Let's compute u = B-A = ∂P/∂t dt, v = C-A = (i,j+1)-(i+1,j) ≈ -∂P/∂x dx + ∂P/∂t dt. Cross u×v = dt*(-∂P/∂x dx)×? Actually u×v = (∂P/∂t dt) × (-∂P/∂x dx + ∂P/∂t dt) = dt*(-dx)(∂P/∂t × ∂P/∂x) + ... = -dx dt (∂P/∂t × ∂P/∂x) = +dx dt (∂P/∂x × ∂P/∂t) because cross is antisymmetric. Yes outward. Good. So use those.

For the deck, we want normals up. Use similar parameter with z = ±w; maybe build separate geometry. Deck: for each x (i), two vertices at z=-w and z=+w. Let's define columns j=0 (left) and j=1 (right). Need triangles. For up normal (+y), use order that yields up. A=(i,left), B=(i,right), C=(i+1,right)? Let's compute with position P(x, z) = (x, 0.19, z). At i (x), i+1 (x+dx). A=(x,0,-w), B=(x,0,w), C=(x+dx,0,w). u=B-A=(0,0,2w), v=C-A=(dx,0,w+? ) = (dx,0,w - (-w)=2w?) C z=w, A z=-w → v=(dx,0,2w). Cross u×v = (0*2w - 2w*0, 2w*dx - 0*2w? wait compute cross (u×v)_y = u_z v_x - u_x v_z = 2w*dx - 0 = 2w dx >0. Up. Good. So triangle (A,B,C) up. Second triangle (B,C,D) where D=(x+dx, -w)? Let's do quad: A=(i,left), B=(i,right), C=(i+1,right), D=(i+1,left). Triangles (A,B,C) and (A,C,D). Check second: u=C-A=(dx,0,2w), v=D-A=(dx,0,0). Cross (u×v)_y = u_z v_x - u_x v_z = 2w*dx - dx*0 = 2w dx >0. Up. Good. So deck indices (A,B,C), (A,C,D).

Now need to compute w(x) for deck using same taper.

Hull positions: for i=0..ringsX, s = i/ringsX*2 - 1; x = s*halfLen; w = maxW * (1 - Math.pow(Math.max(0,s), 2.0)); for j=0..ringsT, t = j/ringsT; z = -w * Math.cos(Math.PI * t); y = 0.2 - 0.65*Math.sin(Math.PI*t).
This gives rim at y=0.2. At bow s=1 w=0 → all points collapse at x=halfLen, z=0, y varying. It's a pointed bow. At stern s=-1 w=maxW.

Hull geometry might be non-closed at stern ends but okay.

Add a "keel line" maybe.

The hull bottom at y=-0.45 (center). Boat group offset y = heightAt + 0.35; hull bottom then at ~ -0.1 below water, maybe okay: hull sits slightly submerged. We want boat floating; set offset 0.35 so bottom is 0.35-0.45 = -0.1 relative to water, partially submerged. Fine. Or offset 0.55 → bottom 0.1 above water. But boat should look like it floats, with hull partly submerged. Use offset 0.45 → bottom 0.0. Good. Let's set constant offset 0.45. Then center y=0.45; hull bottom at -0.45? Wait hull local bottom y=-0.45, group y=0.45 → bottom at 0.0 (at water surface). Good. Top rim at y=0.2+0.45=0.65 above water. Good.

But the water height at boat position adds to group y; so bottom = heightAt + 0.45 - 0.45 = heightAt, matching water. Nice.

Boat pitch: sample front/back at x±2.0 (hull half length). Use heightAt(x+2, z, t) and (x-2, z, t). Our hull bow at x=+2? yes. Use pitch angle = atan2(hF - hB, length) maybe. Let's set pitch = atan((hFront - hBack) / 4.0). Roll = atan((hLeft - hRight) / 1.56)? Hmm.

But our group rotations: rotation.x = roll, rotation.z = pitch. Need signs:
- For +Z side (left? in world), local point (0,0,w) after group rotation about X θ gives y = -w sinθ + y0. Height at (x, z+w) = hLeft? Let side z +0.78, sample hA = heightAt(x, z+0.78). We want world y of that point = hA. y0 = hCenter. -w sinθ = hA - y0 → sinθ = (y0 - hA)/w. Thus θ = atan((hCenter - hA)/w). If hA > hCenter, θ negative. Fine.
- For pitch about Z: local (L,0,0) → world (L cosθ, L sinθ) + y0. Want hFront at x+L. sinθ = (hFront - y0)/L. θ = atan((hFront - y0)/L). Good.

But note rotations are applied to the group around its origin; the sampling positions should be the boat's world x,z (which we set). Use x_c and z_c. Front sample at x_c + L, z_c; back at x_c - L; side samples at x_c, z_c ± w. Good. Since we don't yaw, fine.

Then group.position.y = heightAt(x_c,z_c,t) + 0.45.
group.rotation.x = roll; rotation.z = pitch. But if both rotations applied, the pitch and roll combine; fine.

Also add a slight bob: `+ 0.05*Math.sin(t*0.9)`. Not necessary; the wave height gives bob.

Boat drift: x = 12 + Math.sin(elapsed*0.18)*1.8; z = 14 + Math.cos(elapsed*0.15)*1.4. Stays within ~13.8,15.4, within 25. Good. But the boat is near island? Island radius ~18; boat at 12-14,14-15 distance ~18.6, just outside the island. Good, next to tropical island. Could be closer: distance sqrt(12²+14²)=18.4; island edge ~18. Perfect "next to".

Camera at (35,12,35) looking at (0,2,0). The boat at (12,14) will be on the right side of view; island center. Good.

Now, palms on island; the island peak ~9, so palms at heights ~2-5 with trunks 5 → crowns at ~7-10, not too tall. Good.

Add maybe some rocks near island peak: 4 Dodecahedron rocks. Optional. Let's include small rocks to enhance. Use `DodecahedronGeometry(0.6, 0)` or `IcosahedronGeometry`. Place on island at random heights, material gray. Cast/receive shadows. Add to island group. Nice.

Maybe add a couple of bushes: small spheres with green material near base? Could add low bushes as `SphereGeometry` scaled. Not necessary but makes island lush. Let's add a few.

But careful to keep file size reasonable.

Now, `__island` exposed as Group containing island mesh, rocks, trunks? We expose the island mesh or Group. Spec: "Expose the island (Mesh or Group) as __island; it receives shadows." I'll expose the group containing the island mesh and palms. Set island mesh receiveShadow true. Group is a Group. Fine.

`__leaves` = InstancedMesh. Good.

`__boat` = Group. Good.

`__sun` = DirectionalLight. Good.

`__ocean` = object with heightAt and time. Good.

`__ready` after first frame.

Now shader code specifics and TS.

Let's write vertex shader with functions:

```
const oceanVertexShader = `
uniform float uTime;
uniform vec3 uSunDir;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

const float PI = 3.141592653589793;

float waveHeight(vec2 p, float t) {
  float h = 0.0;
  h += 0.42 * sin( (6.2831853/26.0) * dot(vec2(0.94038, 0.34014), p) - 1.5 * t );
  h += 0.28 * sin( (6.2831853/17.0) * dot(vec2(-0.50265, 0.86457), p) - 2.1 * t );
  h += 0.17 * sin( (6.2831853/11.0) * dot(vec2(0.24958, -0.96838), p) - 2.8 * t );
  h += 0.10 * sin( (6.2831853/7.5) * dot(vec2(0.8, -0.6), p) - 3.6 * t );
  return h;
}
vec2 waveGrad(vec2 p, float t) { ... }
```
Better compute derivatives directly in JS and GLSL. We can write separate function per wave? Or compute gradient:

```
vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  float k;
  float c;
  k = 6.2831853/26.0;
  c = cos(k*dot(vec2(0.94038,0.34014), p) - 1.5*t);
  g += 0.42 * k * c * vec2(0.94038,0.34014);
  ...
  return g;
}
```
In GLSL, vector operations fine.

Then main:
```
void main() {
  vec3 pos = position;
  vec2 wp = vec2(pos.x, -pos.y);
  float h = waveHeight(wp, uTime);
  pos.z = h; // wait local plane is in x-y; displacement along +z (which becomes world y after rotation by -PI/2)
  vec2 g = waveGrad(wp, uTime);
  vec3 nLocal = normalize(vec3(-g.x, g.y, 1.0));
  vNormal = vec3(nLocal.x, nLocal.z, -nLocal.y);
  vHeight = h;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```
Wait: the ocean mesh rotation is -PI/2 about X, and the mesh is at origin. But local pos.z is displacement; after rotation, local z maps to world y? Rotation -PI/2: local (x,y,z) → (x, z, -y). Yes. Good.

But note we displaced pos.z and also world = modelMatrix * pos. Since modelMatrix includes rotation, world y = local z = h. Good.

Normal mapping: local normal = (-g.x, g.y, 1). World = (local.x, local.z, -local.y) = (-g.x, 1, -g.y). Good. That matches expected world normal (-hx, 1, -hz) where g.x = hx, g.y = hz. Wait our world normal = (-g.x, 1, -g.y). If g = (hx, hz), then world normal = (-hx, 1, -hz). Correct.

But sign: we used nLocal = (-g.x, g.y, 1). World = (nLocal.x, nLocal.z, -nLocal.y) = (-g.x, 1, -g.y). Yes.

Good.

But careful: `vNormal = vec3(nLocal.x, nLocal.z, -nLocal.y);` after normalization. Fine.

Fragment:
```
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uMaxAmp;
uniform float uExposure;
```
Need define functions for ACES and sRGB.

```
vec3 aces(vec3 x) {
  float a = 2.51; float b = 0.03; float c = 0.43; float d = 0.59; float e = 0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
```

Fragment:
```
void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
  vec3 sunDir = normalize(uSunDir);
  float hN = vHeight / uMaxAmp;
  vec3 base = mix(uDeep, uShallow, clamp(0.55 + 0.45*hN, 0.0, 1.0));
  // distance to origin for shallowness
  float d = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(15.0, 55.0, d);
  base = mix(base, uShallow, shallow * 0.35);
  vec3 refl = reflect(-viewDir, n);
  float rUp = clamp(refl.y, 0.0, 1.0);
  vec3 skyCol = mix(uHorizon, uZenith, pow(rUp, 0.65));
  vec3 col = base * (1.0 - fres * 0.9) + skyCol * (fres * 0.9);
  float nds = max(dot(n, sunDir), 0.0);
  float spec = pow(nds, 70.0);
  float broad = pow(nds, 10.0);
  col += vec3(1.0, 0.92, 0.75) * (spec * 2.2 + broad * 0.12);
  float foam = smoothstep(0.55, 0.95, hN);
  float shore = (1.0 - smoothstep(17.0, 21.5, d)) * 0.55;
  shore *= 0.5 + 0.5*sin(vHeight*3.0 + d*0.6);
  float foamAmt = clamp(foam * 0.7 + shore * 0.5, 0.0, 1.0);
  col = mix(col, vec3(0.85, 0.9, 0.95), foamAmt);
  float dist = length(vWorldPos - cameraPosition); // cameraPosition is fragment? built-in cameraPosition available
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);
  col *= uExposure;
  col = aces(col);
  col = pow(max(col, vec3(0.0)), vec3(1.0/2.2));
  gl_FragColor = vec4(col, 1.0);
}
```
But `acex` expects linear color; we multiply exposure before. Good.

Potential issue: our base colors are linear; ACES tone mapping with exposure. Fine.

`cameraPosition` built-in is available in ShaderMaterial (yes). But do we need to also use `vWorldPos`? Yes.

Note: skyCol mixing with fog maybe not; fog applied.

Sun specular: Since sun specular is in linear and tone mapped, could be very bright. Fine.

Now sky dome shader:
```
const skyVertexShader = `
varying vec3 vWorldPos;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const skyFragmentShader = `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform float uExposure;
varying vec3 vWorldPos;
vec3 aces(vec3 x) { ... }
void main() {
  vec3 dir = normalize(vWorldPos);
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.7));
  float sun = max(dot(dir, normalize(uSunDir)), 0.0);
  col += vec3(1.0, 0.8, 0.5) * pow(sun, 20.0) * 0.8;
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9990, 1.0, sun) * 1.5;
  col *= uExposure;
  col = aces(col);
  col = pow(max(col, vec3(0.0)), vec3(1.0/2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;
```
But our sky dome sphere is at origin radius 600, so vWorldPos = position (since modelMatrix identity). Direction normalize. Good. But if the sphere has radius 600, then dir is normalized. Good.

Maybe add horizon subtle. Fine.

Sun disc mesh: `new THREE.Mesh(new THREE.SphereGeometry(20, 16, 12), new THREE.MeshBasicMaterial({color: 0xfff6d8}))` at sunDir * 400 or 600? If at 500 and sky radius 600, the sun is inside sky dome. It will be visible. Set `fog: false`? MeshBasicMaterial can set `fog: false`. Also set `depthWrite = false`? not needed. Maybe transparent? Use emissive-like. MeshBasicMaterial with tone mapping will show bright. Good. But if sun sphere is inside sky dome and sky dome is BackSide, sun sphere visible. Good.

However, with fog on, if `fog: false`, it won't be fogged. Set `const sunDisc = new THREE.Mesh(...); sunDisc.position.copy(sunDir).multiplyScalar(500); scene.add(sunDisc);` Also maybe add a glow via additional sphere with additive transparent material? Could be nice. Add a larger transparent sphere radius 40, opacity 0.15, additive. But no textures. A sphere with additive blending creates a soft glow but edges visible. Fine.

Let's include just a sun disc plus sky glow.

Now lighting: directional light shadow camera. Set target as Object3D? DirectionalLight target default is Object3D at origin? The light's target property is an Object3D; default position (0,0,0). Good. Need to add target to scene? If target not added, it still works? DirectionalLight uses `target` object and updates its matrixWorld? If target not in scene, its matrixWorld may not be updated. Usually you add `scene.add(light.target)`. We'll set target position (0,0,0) and add to scene. Actually default target is not in scene; three updates target's matrixWorld when computing shadow? In renderer, if target is not in scene, it may not update. To be safe, create a target object and add to scene.

Let's do:
```
const sunTarget = new THREE.Object3D();
sunTarget.position.set(0, 0, 0);
scene.add(sunTarget);
sun.target = sunTarget;
```

Set `sun.position.copy(sunDir).multiplyScalar(80);` and `sun.target.position.set(0,0,0)`. Light direction = target - position = -sunDir. Good. Sky sun position = sunDir. Matches.

Shadow camera bounds: Island radius 18, boat at 12,14, so ±60 is enough. Near 1, far 200. Shadow camera position is light position; fine.

Shadow bias: -0.0005 maybe.

Now ocean shader and shadows: ocean mesh doesn't receive shadows. Fine.

Potential visual issue: the ocean plane extends under island; island mesh casts shadow onto... water doesn't receive, so no shadow. The island mesh receives its own shadows.

Now we need to handle `window.resize`. `renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();`

Now strict TS: `renderer.setAnimationLoop(animate);` where `animate` is a function with no parameters. Three's setAnimationLoop type accepts `(time: number) => void`? In three.d.ts: `setAnimationLoop(callback: (time: number) => void, ): void` maybe. Our function with no args is assignable under strictFunctionTypes? A function with fewer parameters is assignable to one with more parameters (contravariance) — yes, `() => void` is assignable to `(time: number) => void`. Fine.

Let's write animate:
```
const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;

function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.1);
  elapsed += delta;
  // update ocean time
  oceanMaterial.uniforms.uTime.value = elapsed;
  // boat
  const bx = 12 + Math.sin(elapsed*0.18)*1.8;
  const bz = 14 + Math.cos(elapsed*0.15)*1.4;
  const hc = waveHeight(bx, bz, elapsed);
  const hF = waveHeight(bx + 2.0, bz, elapsed);
  const hB = waveHeight(bx - 2.0, bz, elapsed);
  const hS1 = waveHeight(bx, bz + 0.78, elapsed);
  const hS2 = waveHeight(bx, bz - 0.78, elapsed);
  boat.position.set(bx, hc + 0.45, bz);
  const pitch = Math.atan2(hF - hc, 2.0);
  const roll = Math.atan2(hc - hS1, 0.78);
  boat.rotation.set(roll, 0, pitch);
  // leaves sway
  ...
  renderer.render(scene, camera);
  if (firstFrame) { (window as any).__ready = true; firstFrame = false; }
}
```
Wait if we set `boat.rotation.set(roll, 0, pitch)` and then group position; good. But pitch angle based on front height difference. Actually use `hF - hc` where hc is center height. The hull extends L=2 from center; pitch = atan((hF - hc)/2). But if front and back both sampled, the rotation around Z should satisfy both; ideally pitch = atan((hF - hB)/4) and center height = hc. If wave is linear, both same. Use `atan((hF - hB)/4.0)` maybe better; but then center may not equal (hF+hB)/2 exactly due to wave curvature. Use front-center. Fine.

Roll: use hS1 (side +z) and hc; roll = atan((hc - hS1)/0.78). Good.

But our hull's wide half-width is 0.78 (maxW). Side sampling use maxW.

Now leaves sway matrices:
We need base positions and base quaternions. Precompute arrays:
```
type LeafInstance = { pos: THREE.Vector3; baseQuat: THREE.Quaternion; phase: number };
const leafInstances: LeafInstance[] = [];
```
For each palm:
- base position on island; angle a; crownPos.
- For k = 0..7:
  - phi = (k / 8) * Math.PI * 2 + a * 0.7; // fan
  - qBase = new Quaternion().setFromEuler? We want q = qY(phi) * qX(-0.25).
  - Use `const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), phi); const qX = ...; qBase = qY.multiply(qX)`? Careful: qY.multiply(qX) gives qY * qX (rotation order qY then qX? Matrix multiplication qY*qX means apply qX first then qY, which matches our derivation R_y * R_x. Good.)
  - position = crownPos + small offset (e.g., 0.05, 0.1, 0). Actually leaves base at crown; if all at exact crown, they'd coincide, fine. Add small outward offset along the leaf direction? Not needed.
- Store.

Per frame:
```
const tmpQ = new THREE.Quaternion();
const swayQ = new THREE.Quaternion();
const m = new THREE.Matrix4();
const basePos = ...
for (let i=0; i<leafInstances.length; i++) {
  const li = leafInstances[i];
  const sway = 0.08 * Math.sin(elapsed * 1.7 + li.phase) + 0.04 * Math.sin(elapsed * 2.3 + li.phase * 1.7);
  swayQ.setFromAxisAngle(new THREE.Vector3(0,0,1), sway); // rotate about local Z? hmm
  tmpQ.copy(li.baseQuat).multiply(swayQ);
  m.makeRotationFromQuaternion(tmpQ);
  m.setPosition(li.pos);
  leaves.setMatrixAt(i, m);
}
leaves.instanceMatrix.needsUpdate = true;
```
But `Matrix4.makeRotationFromQuaternion(q)` sets rotation part and position zero; then `m.setPosition` sets translation. That works. Good.

However, the sway should be around the leaf base, so rotation composition `qBase * swayQ` rotates in local leaf frame; yes.

We might also add a small translation sway? no.

Ensure instance matrix updates every frame as required.

The leaf instance positions are the crown positions; but after sway rotation, the base stays fixed. Good.

Need to check `THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), sway)` each instance creates a vector; could precreate axis vector `const swayAxis = new THREE.Vector3(0,0,1);`.

Now, `leaves.count` is 48. `leafInstances.length` = 48.

Now, palm trunk crown calculation. Let's define the curve end. Use a function to create trunk:
```
const trunkCurve = new THREE.CatmullRomCurve3([...]);
```
For each palm, use same curve geometry (reuse one TubeGeometry) but each trunk mesh is cloned or we can create one geometry and reuse with multiple meshes. Yes, create trunkGeo once and use for all trunks, each Mesh with same geometry. That's efficient. Position/rotation per mesh.

Crown local end = curve points last = (0.9, 5.0, 0.15). Apply rotation -a:
```
const crownLocal = new THREE.Vector3(0.9, 5.0, 0.15);
const crownOffset = crownLocal.clone().applyAxisAngle(new THREE.Vector3(0,1,0), -a);
const crown = new THREE.Vector3(px, baseY, pz).add(crownOffset);
```

Trunk mesh position = (px, baseY, pz), rotation.y = -a. The trunk's base at local (0,0,0) and top at local (0.9,5,0.15). Good.

Palms: at least 5. Use 6.
Positions list with r, a:
- (6.0, 0.6)
- (9.5, 1.9)
- (12.0, 4.4)
- (7.5, 3.2)
- (11.0, 5.7)
- (8.5, 0.2)
Check heights above water:
- r=6 t=0.333 base=9*(0.667)^1.35 ≈ 9*0.578=5.2, plus bump maybe. positive.
- r=9.5 t=0.528 base=9*(0.472)^1.35 ≈ 9*0.355=3.2.
- r=12 t=0.667 base=9*(0.333)^1.35 ≈ 9*0.230=2.07.
- r=7.5 t=0.4167 base=9*(0.583)^1.35 ≈9*0.484=4.36.
- r=11 t=0.611 base=9*(0.389)^1.35 ≈9*0.283=2.55.
- r=8.5 t=0.472 base=9*(0.528)^1.35 ≈9*0.426=3.83.
All good, above water. baseY = h - 0.3 maybe.

But the island has radial noise? We'll use the same islandHeight function (without radial). Fine.

Now, if palms at r=12, trunk top at baseY+5 => ~7.5, above peak 9. Fine.

Leaves count 6*8=48. Good.

Now, island group: Add island mesh, rocks, trunks, leaves. But leaves should be exposed separately. We can add leaves to island group and also set __leaves. Fine.

Island mesh receiveShadow; leaves castShadow.

Potential shadow issue: InstancedMesh castShadow supported? Yes in three.

Now, rocks: Place on island at r ~ 4-10, base height. Use `DodecahedronGeometry(0.5, 0)` or `IcosahedronGeometry(0.4, 0)`. Material gray-brown roughness 0.9. Set castShadow and receiveShadow. Use 3-5 rocks. Fine.

Maybe add some bushes: small spheres of green on island. Use 5 spheres scaled, material green. They cast shadows. Nice.

Keep it manageable.

Now, ocean material: `new THREE.ShaderMaterial({ uniforms: {...}, vertexShader, fragmentShader, side: THREE.DoubleSide? })`. The plane from above; FrontSide fine. Use `side: THREE.DoubleSide`? The water should be visible from above; camera above. Use DoubleSide maybe for safety; but transparent? no. use `side: THREE.DoubleSide` to see underside? The camera below? no. Use FrontSide default. However, with rotation -PI/2, the plane's front face normal points up? PlaneGeometry default in XY plane, front face +Z. After rotation -PI/2, +Z local maps to world +Y. So front face up. Good. Use FrontSide.

Set `material.side = THREE.DoubleSide`? Not needed.

Need `material.transparent = false`. Fine.

Ocean mesh `frustumCulled`? The plane extends large; okay. `receiveShadow = false`.

Now, does the ocean shader use `modelMatrix`? Yes, built-in uniform. In ShaderMaterial, `modelMatrix` is built-in. Good.

Potential TS issue: `oceanMaterial.uniforms.uTime.value = elapsed;` — uniforms typed as `{ [key: string]: { value: any } }`? In three.d.ts, `ShaderMaterial` constructor parameter `uniforms?: { [key: string]: IUniform }`. `oceanMaterial.uniforms` type is `{ [key: string]: IUniform }`, so `oceanMaterial.uniforms.uTime.value = elapsed` works. `IUniform` value is any. Good.

Now, `new THREE.PlaneGeometry(400, 400, 256, 256)`; 256 segments; good.

Now, animation: Need `renderer.setAnimationLoop(animate);` after defining. Set `renderer.shadowMap.enabled = true`.

Set camera `camera.position.set(35,12,35); camera.lookAt(0,2,0);` Use `new THREE.Vector3(0,2,0)`. Good.

Now, `scene.fog = new THREE.Fog(new THREE.Color(0.62, 0.80, 0.92), 70, 330);` Wait THREE.Fog constructor expects `color: Color` maybe `number`? In TS `new THREE.Fog(color: Color | number, near: number, far: number)`. Passing Color works. Good.

Sky dome shader uses uFog? no.

Now, maybe `scene.background = new THREE.Color(0x8fb7cf)`? If the sky dome is huge, it's behind. If the dome has a radius 600, the camera at 50 distance sees it. Good. If for some reason the dome is clipped by near/far? Camera far = 1000, dome radius 600, fine. The far plane 1000 includes dome. Good.

Now, the sky dome geometry: `new THREE.SphereGeometry(600, 48, 24)`. Material side BackSide. The camera inside. Add to scene. Not castShadow.

Sun disc at position sunDir * 500; sky dome radius 600, so inside. Good.

Sky dome shader uses `modelMatrix * vec4(position,1.0)`. Sphere at origin. Good.

Now, consider ACES tone mapping for sky dome manual: our fragment includes ACES; output. Good.

Now, `renderer.toneMappingExposure = 1.0`; if sky dome manual ACES uses uExposure = 1.0, matches. Could set exposure slightly >1: 1.1. Use constant.

Set `uExposure` uniform for ocean and sky to the same value as renderer.toneMappingExposure. Let's set exposure = 1.1; use in shader uniforms. Good.

But built-in materials get exposure 1.1 automatically. Custom shaders use uExposure 1.1. Consistent.

Now, shadow map and exposure: not important.

Now, lighting intensities: With exposure 1.1, sun 2.5 might be bright. Let's use sun intensity 3.0? Hmm, for MeshStandardMaterial, directional light intensity is in physical units? Since r155, light intensity is irradiance; typical values ~ 2-3. Use 2.8. Hemisphere 0.6. Add fill 0.4. Good.

The sky is bright; tone mapping handles.

Let's think about the boat materials: MeshStandardMaterial roughness. For hull, use `color: 0xf4f1e8`, roughness 0.6, metalness 0.0. Maybe add a blue stripe via a separate mesh? Could add a thin band along the hull: perhaps use a `BoxGeometry`? not needed.

Sail: `MeshStandardMaterial({ color: 0xf3f0e4, roughness: 0.7, side: THREE.DoubleSide })`. Add a warm tint.

Mast: brown/dark gray.

Cabin: `color: 0xdbe5ea`. Add roof? no.

Windows: `MeshStandardMaterial({ color: 0x1a2e3c, roughness:0.3, metalness:0.4 })`.

Now, create `boat` group at origin initially; animation sets position/rotation. All child meshes castShadow true.

Now, island `receiveShadow`; all palms etc. need castShadow.

Now, `__sun` = DirectionalLight; `__scene`, `__camera`, `__renderer`.

Let's write code.

Potential strict errors:
- Using `Math.pow(..., 2.0)` fine.
- `const tmp = new THREE.Vector3()` etc.
- Types of arrays: `const palmData: { r: number; a: number }[] = [...]`.
- `const leafInstances: LeafInstance[] = [];` define interface:
```
interface LeafInstance {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  phase: number;
}
```
- Type of `leaves.setColorAt` optional; we may avoid.
- InstancedMesh: `const leaves = new THREE.InstancedMesh(leafGeo, leafMat, totalLeaves);`
- `leaves.instanceMatrix.needsUpdate = true;` property exists.

- `THREE.Quaternion` constructor. `const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), phi);` `setFromAxisAngle` returns this quaternion (a Quaternion), so qY is Quaternion. Fine.
- `qBase.multiply(qX)` mutates qBase; good.

- Use `const tmpQ = new THREE.Quaternion(); tmpQ.copy(li.quat).multiply(swayQ);` `copy` returns this; multiply mutates. Fine.

- `const m = new THREE.Matrix4(); m.makeRotationFromQuaternion(tmpQ); m.setPosition(li.pos.x, li.pos.y, li.pos.z);` `setPosition` accepts Vector3 or x,y,z? In three.d.ts, `setPosition(x: number, y: number, z: number): Matrix4` or `setPosition(v: Vector3): Matrix4`? Actually Matrix4 has `setPosition(x,y,z)`? Let me check: Matrix4 methods include `setPosition(x: number, y: number, z: number)`? In three.js, `Matrix4.setPosition(x, y, z)`? I recall `matrix.setPosition(x, y, z)` or `matrix.setPosition(v)`; there is `setPosition(x: number, y: number, z: number): this`? In three.d.ts, `setPosition(x: number, y: number, z: number): this`? Or maybe `setPosition(v: Vector3): this`. Hmm. Actually `Matrix4.setPosition` signature in three.d.ts is `setPosition(x: number, y: number, z: number): this;` I think. To be safe, use `m.setPosition(new THREE.Vector3(...))`? Hmm, if signature expects numbers, passing vector fails. Let's avoid ambiguity by constructing matrix differently:
```
m.makeRotationFromQuaternion(tmpQ);
m.setPosition(li.pos); // if it accepts Vector3
```
In three.js, I recall `Matrix4.setPosition(x, y, z)` in older versions; in newer, `setPosition(x: number, y: number, z: number): this`. Let me verify: `Matrix4` has:
- `setPosition(x: number, y: number, z: number): this`? Hmm, from three.d.ts:
```
setPosition(x: number, y: number, z: number): this;
```
Actually I think both exist? There's `setPositionFromMatrix`? Let's just use `m.setPosition(li.pos.x, li.pos.y, li.pos.z);` which matches numeric signature. If the signature is vector, TS error. Let's check memory: In three.js Matrix4:
```
setPosition( x, y, z ) {
  this.elements[12] = x; ...
  return this;
}
```
No Vector3 overload maybe. In some versions, there is `setPositionFromMatrix` and `setPosition(v)`. Hmm.

I can avoid using Matrix4 entirely by composing Matrix from quaternion and translation via `m.compose(position, quaternion, scale)`. `Matrix4.compose(position: Vector3, quaternion: Quaternion, scale: Vector3)` exists and is safe. Use:
```
m.compose(li.pos, tmpQ, new THREE.Vector3(1,1,1));
```
But creating scale each time; use constant `const unitScale = new THREE.Vector3(1,1,1);`. Good. Or `m.makeTranslation` etc. Compose is clean.

Similarly for boat rotations, no issue.

- For leaf geometry, use `new THREE.Float32BufferAttribute(posArray, 3)` where posArray is number[]; correct.
- `geom.setIndex(indices)` where indices number[]; `setIndex` accepts buffer attribute or number[]? In three.d.ts, `setIndex(index: BufferAttribute | number[]): this`. Good.

- `geom.computeVertexNormals()`.

- For island, indices array length maybe large; fine.

- `THREE.ShapeGeometry` with `THREE.Shape`: create shape for sail:
```
const shape = new THREE.Shape();
shape.moveTo(0,0);
shape.lineTo(0,2.0);
shape.lineTo(1.4,0.25);
shape.closePath();
const sailGeo = new THREE.ShapeGeometry(shape);
```
Good.

Now, for the hull geometry normals, we can let computeVertexNormals; our winding is outward as derived. Good. If computeVertexNormals gives outward. Good.

But our hull geometry has a pointed bow where w=0 and cross-section collapses; normals may be weird but fine.

Potential duplicate vertices at bow: at s=1, w=0 so all j vertices at x=halfLen, z=0, y varying. The hull surface degenerates into a line; triangles at the bow may be degenerate. Fine; compute normals maybe zero; no big deal.

At stern s=-1, w=maxW; cross-section at x=-halfLen. The hull ends with a U-shaped cross-section open at top; the deck covers top. Maybe add a stern face to close the hull: Could add a final ring at x=-halfLen with a flat cap? The stern could be closed by a small box? Not necessary. But from the camera, we might see into the hull at stern since deck covers only top. The deck is at y=0.19, spanning width, so it covers the open top. The hull's U-shape inside is hidden by deck. Good. At the stern end, since there's no cap, the deck ends at the stern line; you might see the interior through the top? Deck covers. Fine.

At the bow, w=0, so deck width 0; fine.

Now maybe add a "gunwale" rim: a thin torus? no.

Cabin at x=-0.9, y=0.44. The deck top at 0.19. Cabin base at 0.19? We set box dimensions 0.5 height centered at y=0.44, so bottom at 0.19, top at 0.69. Good.

Mast at x=0.4 (forward of cabin), base y=0.19, bottom of cylinder at 0.19? `CylinderGeometry` centered at y=0, height 2.4; set position y=0.19+1.2=1.39. Top at 2.59. Good.

Sail shape base at (0.4, 0.19) maybe; geometry local y from 0 to 2.0; positioned at 0.4,0.24. The sail extends upward. Fine. But the sail's plane is in XY; at z=0. It will intersect the mast? The mast at x=0.4; sail at x=0.4 to 1.8; attached. Fine.

Add a boom: cylinder along X from mast to stern? maybe at y=0.3, x=-0.8? Not needed.

Maybe add a small flag on mast top: `PlaneGeometry(0.3,0.2)` at top. Nice but not necessary.

Now, boat is "about 4 units long" - our hull length 4. Good.

Now, the island's peak height 9, within 5-15. Good.

Ocean size 400x400. Good.

Camera at exact (35,12,35) looking at (0,2,0). Good.

Now, performance: 256×256 segments = 65k vertices; 2048 shadows. Fine.

Now, need to make the water look good. Add reflection of sky and fresnel. Maybe add "depth" variation: deep near camera? We used shallow near origin. The ocean color mix based on height.

Maybe include a subtle "wave crest" highlight via `vHeight` and normal. Good.

Let's refine fragment: The base color mix uses `hN = vHeight / uMaxAmp` (range -1..1). `clamp(0.55 + 0.45*hN, 0, 1)` ranges 0.1..1. Good.

Fresnel: `pow(1.0 - clamp(dot(n, viewDir),0,1), 3.0)`. For viewDir roughly horizontal near horizon, dot(n,view) small → fres ~1 → sky reflection strong. Good.

But our normal is mostly up, viewDir nearly horizontal? Camera at (35,12,35), looking at scene; for water far away, view direction is nearly horizontal (since camera height 12 over 283 distance), dot with up normal ≈ 12/283 ≈ 0.04, so fres ≈ high → sky reflection. Good.

Sky reflection uses `reflect(-viewDir, n)` (direction of reflected view). Actually for reflection of sky, we want the reflected direction of the incoming view direction around normal: `reflect(viewDir, n)`? Let's think: The specular reflection direction for a viewer: The sky direction that reflects into the viewer is `reflect(-viewDir, n)`? If we have view vector from surface to camera `viewDir`, the outgoing ray to camera; reflection ray = reflect(-viewDir, n) or reflect(viewDir, n)? For a mirror, the reflected image direction is `reflect(viewDir, n)`? Let's derive: Incoming light direction L (from surface toward sky?) and outgoing to camera V. For mirror, the reflected direction R = 2(n·V)n - V? Hmm.

Standard: `vec3 reflected = reflect(-viewDir, normal);` in water shaders to sample environment. Many water shaders use `vec3 r = reflect(-viewDir, normal);` where viewDir = normalize(cameraPosition - vWorldPos) (from surface to camera). Then reflected ray points away from surface. I think `reflect(-viewDir, n)` is correct: taking the direction opposite the view (toward surface?); Hmm.

Let's check simple: flat water normal up (0,1,0). Camera at (0,1,10)? Surface at origin; viewDir from surface to camera ≈ (0,0.1,0.995). `reflect(-viewDir, n)` = reflect((0,-0.1,-0.995), (0,1,0)) = (0,0.1,-0.995) → points toward negative z and slightly up; that's the direction of sky reflected by the water as seen from camera? The camera is at +z looking toward origin; reflection of sky should appear in the direction opposite camera, i.e., -z. Yes, reflected ray points -z. Good. So `reflect(-viewDir, n)` correct.

And skyCol from reflected direction's y. Good.

Now, sun specular: `dot(n, sunDir)` where sunDir points from surface toward sun. For flat n up, sunDir up → high → glint where sun's reflection is. Good.

Now, the sun disc and sky match.

Now, custom shader may need `precision`? ShaderMaterial default highp. Fine.

Now, the "visible sun position" is achieved by sky gradient and sun disc. Good.

Now, ensure `sun` DirectionalLight target added. Good.

Now, code for `__ocean`:
```
const oceanTime = { value: 0 } // uniform
const waveSpeed... 
function waveHeight(x, z, t) { ... }
(window as any).__ocean = {
  heightAt: (x: number, y: number, t: number) => waveHeight(x, y, t),
  time: () => elapsed
};
```
But `elapsed` is a variable; closure captures. Good. Need `heightAt(x: number, z: number, t: number): number` type. The object property can be arrow.

But `elapsed` is updated in animate; the object's `time()` returns current elapsed. Good.

The shader's `uTime` set to elapsed each frame. Matching.

Now, waveHeight in JS must match shader exactly. Use same constants. Let's compute normalized directions precisely in JS constants (I'll store arrays with dx, dz, amplitude, wavelength, speed). Then GLSL hardcodes the same. To avoid mismatch, define the constants in JS and build GLSL strings from them? In a TS file, we can generate the shader string via template interpolation of the constants at runtime. That ensures exact matching. Nice idea! Build GLSL functions by template using values. But GLSL needs many constants; can generate.

Let's define waves in JS:
```
const WAVES = [
  { dx: 0.94038, dz: 0.34014, amp: 0.42, len: 26.0, omega: 1.5 },
  ...
];
```
Then `waveHeight` JS loops.

For GLSL, we can create a string:
```
const waveGLSL = `
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  ${WAVES.map(w => `h += ${w.amp.toFixed(5)} * sin( (6.2831853/${w.len.toFixed(5)}) * dot(vec2(${w.dx.toFixed(5)}, ${w.dz.toFixed(5)}), p) - ${w.omega.toFixed(5)} * t );`).join('\n')}
  return h;
}
`;
```
But `6.2831853/${w.len}` in GLSL: need parentheses? String becomes `(6.2831853/26.00000) * dot(...)`. Good.

Similarly gradient:
```
float waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  ${WAVES.map(w => `{ float k = 6.2831853/${w.len}; float c = cos(k*dot(vec2(${w.dx}, ${w.dz}), p) - ${w.omega}*t); g += ${w.amp} * k * c * vec2(${w.dx}, ${w.dz}); }`).join('\n')}
  return g;
}
```
Need braces; each block. Good. But GLSL doesn't allow `{ ... }` block statements? Yes, in GLSL you can use block statements. But declaring variables inside loop? We don't have a loop; use separate blocks. Alternatively compute gradient directly like height: `g.x += amp*k*cos(...)*dx; g.y += amp*k*cos(...)*dz;`. Simplify:
```
g += ...
```
We can generate lines:
```
float c0 = cos(...); g += vec2(...);
```
Need unique variable names. Use block `{ ... }`. Fine. Or just compute with repeated expressions. I'll generate lines with `g += <amp> * <k> * cos(<phase>) * vec2(<dx>,<dz>);` where k numeric. Let's compute k in JS: `k = 2π/len`, and generate as literal:
```
g += ${amp} * ${k} * cos(${k} * dot(vec2(${dx}, ${dz}), p) - ${omega} * t) * vec2(${dx}, ${dz});
```
Good. Use `toFixed(6)`.

But GLSL float literals with `toFixed` are fine.

Now, JS wave function:
```
function waveHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = Math.PI * 2 / w.len;
    h += w.amp * Math.sin(k*(w.dx*x + w.dz*z) - w.omega * t);
  }
  return h;
}
```
Sum amplitudes ~ 0.97. Max height ±0.97. crest-trough 1.94. Good.

Now, the shader's `uMaxAmp` = sum of amps = 0.97. Set uniform.

Now, note the wave direction values must be normalized. Let's compute exact normalized dirs and use as constants in JS. We'll define:
```
const WAVES = [
 { dx: 0.94/Math.sqrt(0.94*0.94+0.34*0.34), ...}
]
```
But to keep code clean, just use precomputed normalized numeric literals. Let's calculate:

Wave 1: raw (0.94, 0.34). norm = sqrt(0.8836+0.1156)=sqrt(0.9992)=0.9995998. dx=0.94038? 0.94/0.9995998 = 0.94038 (since 0.94*1.0004002=0.940376). dz=0.340136. Let's use 0.940376, 0.340136.

Wave 2: raw (-0.5, 0.86). norm=sqrt(0.25+0.7396)=sqrt(0.9896)=0.994775. dx=-0.502627, dz=0.864518.

Wave 3: raw (0.25, -0.97). norm=sqrt(0.0625+0.9409)=sqrt(1.0034)=1.001698. dx=0.249577, dz=-0.968354.

Wave 4: raw (0.8, -0.6), norm=1. dx=0.8, dz=-0.6.

Good.

Amplitudes: 0.42,0.28,0.17,0.10. Sum = 0.97.

Wavelengths: 26,17,11,7.5. Speeds: 1.5,2.1,2.8,3.6.

Now, shader height at time t. Good.

Note: wave time is elapsed in seconds. Good.

Now, performance of shader: fine.

Now, ocean plane has 256x256 segments = 65536 quads; okay.

Now, let's think about `renderer.outputColorSpace` typing: `renderer.outputColorSpace = THREE.SRGBColorSpace;` In three.d.ts, `outputColorSpace` property type is `THREE.ColorSpace`? It exists. Good.

`renderer.toneMapping = THREE.ACESFilmicToneMapping;` exists.

`renderer.toneMappingExposure = 1.1;`.

`renderer.shadowMap.type = THREE.PCFSoftShadowMap;`.

Now, `scene.add(sky)` where sky is our own mesh.

Now, sun disc material: `MeshBasicMaterial({ color: 0xfff4d6, fog: false })` — does MeshBasicMaterial parameter include `fog`? Yes, `MeshBasicMaterial` has `fog` property. In TS, `MeshBasicMaterialParameters` includes `fog?: boolean`. Good.

But with tone mapping, MeshBasicMaterial gets tone mapped. Fine.

Now, the sky dome uses `ShaderMaterial` with `side: THREE.BackSide`, `depthWrite: false` maybe to avoid weird depth? A dome radius 600 inside far plane; depthWrite false fine. But if depthWrite false, sun disc drawn? It's at 500 inside dome; if dome drawn first with depthWrite false, the sun disc at 500 will be drawn, okay. Actually depth buffer matters; if dome depthWrite false, it doesn't write depth, so sun disc later drawn visible. Fine. But ocean far behind? no.

Set `sky.material.depthWrite = false` maybe. But default ShaderMaterial depthWrite true; dome at 600, ocean at max 200 distance; dome behind ocean, depth test: ocean closer, drawn after dome? Render order: opaque objects sorted by depth? Three sorts transparent vs opaque; opaque objects render in scene order? Usually the renderer sorts opaque objects by z? Actually not; opaque objects are rendered in order of addition. If sky added first, it renders first; ocean later covers. Depth test ensures ocean over sky (since closer). If dome is far, fine. Sun disc at 500 added after sky, renders after but depth test: it's farther than ocean but visible in sky region; no occlusion. Fine.

Maybe set sky dome `renderOrder = -1`? Not necessary.

Now, camera far = 1000; dome radius 600; sky visible. Sun disc at 500. Good.

But the ocean plane far edge at 283 distance; dome radius 600. The sky horizon line will be at dome's y=0 direction, which appears at screen horizon. Ocean edge at 283 might appear below/at horizon, but fog blends. Since the ocean plane is at y=0 and camera at y=12, the ocean extends to a horizon line at y=0; the far edge at distance 283 will appear at a certain height in the image; the dome horizon behind will appear at the true horizon (distance infinity). The ocean edge may not reach the true horizon—it leaves a gap between ocean edge and sky horizon? Actually the ocean plane extends 200 units from origin; far edge at distance ~283 from camera. The apparent horizon of an infinite plane at y=0 should be slightly below the eye level; the finite edge appears at a similar angle. With fog, it blends to sky color, likely okay. But there could be a visible line. Hmm.

To hide, we can make the ocean plane 400x400 but set fog far such that at edge it's fully fogged. The edge at 283 from camera; set fog far = 300, near 60. At 283, fog factor = (283-60)/(240)=0.93. The sky horizon color matches fog. Good, edge blends. But the ocean plane edge at 283 might still show a faint line; acceptable.

Could make ocean larger than 400? Spec "at least 400x400"; we can make 600x600 to extend farther, but grid limit 256 segments. The far edge would be 424 from camera; fog far 300 fully fogged. Better. Use 600x600 plane, but spec asks at least 400; 600 is fine. Then edge fully within fog. However, waves at 600 with 256 segments = 2.34 units spacing; okay. But the spec says ocean grid at or below 256x256; 600 size with 256 segments is fine. Let's use 500x500? At far edge distance ~ 400; fog far 330; fully fogged. Good. Use 500×500 with 256 segments. That ensures far edge hidden. The requirement is "at least 400x400"; 500 qualifies. Use 500.

Actually the wave displacement at far distance with fewer segments; no issue.

Let's set ocean plane 500 x 500, 256 segments. Far edge ~ 400 distance from camera; fog far 330. Good.

Now, island centered origin radius 18; boat at 12,14. Good.

Now, boat at distance from camera: camera (35,12,35), boat (13.8, ~0.5, 15.4); distance ~ sqrt((21.2)^2+(11.5)^2+(19.6)^2)=sqrt(449+132+384)=sqrt(965)=31. Good. Island center distance ~49. Good.

Now, maybe the light direction and sky: sunDir = (0.6,0.55,0.35) normalized. Let's compute normalized: raw (0.62, 0.58, 0.35) length sqrt(0.384+0.336+0.1225)=sqrt(0.8425)=0.918. Normalize: (0.675, 0.632, 0.381). Let's use (0.68, 0.62, 0.38) approximately normalized? length sqrt(0.4624+0.3844+0.1444)=sqrt(0.9912)=0.9956. Close enough. Normalize to exact: (0.683, 0.623, 0.382). Use `new THREE.Vector3(0.68, 0.62, 0.38).normalize()` in JS. For shader uniforms we pass the normalized vector; sky uniforms same. Good. No need hardcode.

Set `const sunDir = new THREE.Vector3(0.68, 0.62, 0.38).normalize();`
Sky addon not used; our sky dome uses uSunDir. Good.

Sun disc at `sunDir * 500`.

Now, Directional light `sun.position.copy(sunDir).multiplyScalar(80);` and target at origin. `sun.intensity = 2.8`. Good. Add fill light at `(-sunDir.x * 50, 30, -sunDir.z * 50)`? Use `new THREE.DirectionalLight(0xa9c9e8, 0.55)` position `(-40, 25, -30)`. Not casting shadow. Good.

Hemisphere: `new THREE.HemisphereLight(0xb8d8ef, 0x2a4a3c, 0.6)`. Adds ambient. Maybe too strong; use 0.5.

Now, tone mapping exposure 1.1.

Now, we need to be mindful: MeshStandardMaterial with no environment will have only directional/hemisphere lighting; island and boat should look decent.

Could add a PMREM environment from the sky for reflections on boat? Not necessary but spec says realistic. We could generate environment map from a scene with sky and use as `scene.environment`? That would affect MeshStandardMaterials and improve. But PMREMGenerator requires rendering the sky scene; can do:
```
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
// maybe add sky dome? but PMREM from scene with sky mesh
```
Actually we can create a temp scene containing a copy of sky dome? The Sky addon example does:
```
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const sceneEnv = new THREE.Scene();
sceneEnv.add(sky);
const env = pmremGenerator.fromScene(sceneEnv, 0.04).texture;
scene.environment = env;
```
But our sky is ShaderMaterial; PMREM would render it; okay. However, PMREMGenerator.fromScene expects the scene; our sky dome is huge radius 600 and camera? It uses an internal camera; might work. Could add environment for better reflections. But adds complexity and potential performance. The boat and island materials would get reflections from sky; nice. Let's consider.

If we create `scene.environment = envTexture`, MeshStandardMaterial will use it for IBL, making things look better. The sky dome itself is a ShaderMaterial; environment doesn't affect it. The water custom shader won't use env, but we manually reflect sky.

PMREM from a scene containing the sky dome: The sky dome is inside the PMREM scene; the PMREM camera is at origin (inside sphere). The dome is BackSide, so visible. Good. But our sky dome's ShaderMaterial uses `uExposure` and manual ACES; PMREM will capture tone-mapped sRGB? PMREM expects linear colors? Hmm, using our manual ACES + sRGB conversion in the sky shader means PMREM captures sRGB-converted colors as if linear, causing double conversion. Could just use a simpler environment gradient without tone mapping for PMREM. Might be overkill.

Simpler: skip environment. Standard materials with hemisphere light and directional look fine.

Alternatively, use a `MeshStandardMaterial` with `envMapIntensity` unavailable without env. Fine.

Now, water is the main visual. Good.

Now, maybe add a subtle bloom? Not required.

Now, let's think about the island's vertex colors and material. Standard material flat/smooth shading. With vertex colors, the grass/sand gradients. Add `roughness: 0.9`, `metalness: 0.0`. The island should cast shadows; but a large island with 40x80 grid and compute normals: fine.

One concern: `computeVertexNormals` on non-indexed? We use indexed. Good.

Now, island geometry building details:

```
const R = 18;
const peak = 9.0;
const segs = 96;
const rings = 40;

const positions: number[] = [];
const colors: number[] = [];
const indices: number[] = [];

// center vertex
const centerY = peak + 0.0; // maybe add noise
positions.push(0, peak, 0);
colors.push(... color for peak)
// ring vertices
for (let i=1; i<=rings; i++) {
  const t = i/rings;
  const r = R * t;
  for (let j=0; j<segs; j++) {
    const a = (j/segs)*Math.PI*2;
    const rr = r * (1 + 0.05*Math.sin(a*3.0+1.2) + 0.03*Math.sin(a*7.0+4.0));
    const h = islandHeight(r, a); // h depends on r not rr; use rr/R? hmm
    positions.push(rr*Math.cos(a), h, rr*Math.sin(a));
    // color
    ...
  }
}
```
Height should depend on r (the radial coordinate) perhaps with a noise term; we use r. But the vertex radius is rr; if rr differs from r, the height computed using r perhaps slight mismatch. Use `islandHeight(rr, a)`? But `islandHeight` takes radius and angle; if we use rr, then t = rr/R. That's fine. But then outer ring rr could exceed R so t>1; clamp. Let's compute `const rr = r * (1 + ...); const h = islandHeight(R * t? )` Hmm. Better: define height based on `r` and radial noise not affecting height; but to make the edge irregular, we can vary the radius and compute h using `rr`. Simpler to skip radial noise; island circular. Add angular height noise to make organic. No radial noise. Let's skip radial variation; island is roundish. Maybe vary radius a bit but height based on `rr` clamped. Let's keep straightforward: no radial noise. Use height = islandHeight(r,a). Good.

But the edge at r=R is below water; fine.

Color computation: 
```
function islandColor(h: number, a: number): [number,number,number] {
  const sand = [0.85, 0.76, 0.56];
  const grass = [0.27, 0.48, 0.20];
  const rock = [0.38, 0.35, 0.30];
  let c = ...
  const g1 = smoothstep(1.0, 3.0, h);
  const g2 = smoothstep(4.5, 7.5, h);
  ...
}
```
Use linear interpolation manually.

Also add color variation `const v = 0.05*Math.sin(a*5 + i*0.7)`.

Let's use helper:
```
const sandCol = new THREE.Color(0.86, 0.78, 0.56);
const grassCol = new THREE.Color(0.25, 0.48, 0.22);
const rockCol = new THREE.Color(0.38, 0.34, 0.30);
```

At each vertex, `let col = sandCol.clone();` We can compute linear mix:
```
const t1 = smoothstep(1.2, 3.2, h);
const t2 = smoothstep(4.8, 7.5, h);
const r1 = sandCol.r*(1-t1)+grassCol.r*t1;
const r2 = r1*(1-t2)+rockCol.r*t2;
```
Similarly. Add small variation.

Use `smoothstep` helper JS:
```
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x-a)/(b-a)));
  return t*t*(3-2*t);
}
```
Good.

Now `islandHeight(r,a)`:
```
function islandHeight(r: number, a: number): number {
  const t = Math.min(1, r / R);
  let h = peak * Math.pow(1 - t, 1.35);
  h += 0.9 * Math.sin(a * 3.1 + 1.3) * Math.pow(1 - t, 1.2);
  h += 0.4 * Math.sin(a * 6.7 + 3.9) * Math.pow(1 - t, 1.4);
  h -= 1.2 * smoothstep(0.85, 1.0, t);
  return h;
}
```
At t=1: h = 0 + 0 + 0 -1.2 = -1.2. Good. At t=0: peak + 0.9*sin(1.3)*1 + 0.4*sin(3.9) ≈ 9 + 0.83 + 0.4*(-0.7)=9+0.83-0.28=9.55. Peak a bit over 9, still within 5-15. Good.

At r=0 center, height computed for center vertex should match islandHeight(0, a)? a undefined; use center height = peak + 0.0? We might want center height ~9.55. Set center vertex height = islandHeight(0,0). For consistency, use `islandHeight(0, 0)` = 9 + 0.9*sin(1.3) + 0.4*sin(3.9) = 9+0.83+0.4*(-0.72) = 9.54. Good. Use that.

Now, color for center.

Now, indices:
- Center vertex index 0.
- Ring 1 starts at index 1; each ring has `segs` vertices. Vertex idx for ring i (1-based) and segment j: `1 + (i-1)*segs + j`.
- For center fan: for j=0..segs-1: a = idx(j), b = idx(j+1 mod segs) for ring1. Use indices (0, b, a) as derived (A=center, C=ring1[j+1], B=ring1[j]) → (0, b, a). Check: our earlier derivation: center triangle up = (center, j+1, j). Yes.

- For rings i=1..rings-1: inner ring i, outer ring i+1. For j: inner j = idx(i,j), inner j+1 = idx(i,j+1 mod segs), outer j = idx(i+1,j), outer j+1 = idx(i+1,j+1). Use two triangles: (inner_j, outer_j, inner_j+1) and (outer_j, outer_j+1, inner_j+1)? Let's derive using our earlier formula for quad with inner ring at smaller radius, outer at larger. We previously determined for rings where inner = ring at smaller radius, outer = ring at larger radius, triangles:
T1 = (inner_j, outer_{j+1}, outer_j)? Wait earlier I derived with A=inner_j, B=outer_j, C=outer_{j+1}: (A,B,C) gave downward; (A,C,B) up. So T1 = (inner_j, outer_{j+1}, outer_j) up. Good.
T2 = (inner_j, inner_{j+1}, outer_{j+1}) up. Good.

So indices: `inner_j, outer_j+1, outer_j` and `inner_j, inner_j+1, outer_j+1`.

Let's ensure we use the correct "next" indices with modulo.

Now, computeVertexNormals will give smooth normals. Good.

One more thing: The island height function is also used for palm bases, but the island's outer edge dips below water. Good.

Now, maybe add a "beach" ring mesh to improve sand? Vertex colors handle.

Now, water foam shore ring might be okay.

Now, shadow camera: The sun light from direction, shadow camera covers ±60; island radius 18 plus palms; boat; fine. The shadow map at 2048; shadow camera near 1, far 200. Light position at 80 distance. Good.

Now, the ocean plane has no `receiveShadow`; island shadows not on water. But requirement only says island receives shadows, boat casts. The island casts shadows on itself and leaves. Fine.

Now, `scene.background`: perhaps set a color to match sky. But our sky dome covers. Could set `scene.background = new THREE.Color(0x9fc6dd)` as fallback. Fine.

Now, `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`; good.

Now, maybe handle `document.body.style.margin = '0'`? The page has no HTML, but we should set canvas full screen. Renderer canvas appended; set styles:
```
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
```
Not required but okay. Avoid TS issues? `document.body.style` fine.

Now, no external assets.

Now, let's write code carefully.

Potential issue: `THREE.InstancedMesh` count and matrices. We create `leafInstances` array after creating palms. Need to add leaves as instanced mesh to island group. But `leaves` should be exposed; if added to island group, `leaves` transforms world accordingly (island group at origin). Fine.

Order: create island group, add island mesh; create trunks and add; create leaves InstancedMesh and add to group; fill base data; then expose.

For palm data, use `const palms = [...]` then loop. Need trunk geometry once:
```
const trunkCurve = new THREE.CatmullRomCurve3([...]);
const trunkGeo = new THREE.TubeGeometry(trunkCurve, 20, 0.16, 8, false);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4a2c, roughness: 0.9 });
```
The tube is oriented with curve points. Good.

For each palm:
```
const px = ...; // base x,z
const baseH = islandHeight(r, a);
const baseY = baseH - 0.15;
const trunk = new THREE.Mesh(trunkGeo, trunkMat);
trunk.position.set(px, baseY, pz);
trunk.rotation.y = -a;
trunk.castShadow = true;
trunk.receiveShadow = true;
islandGroup.add(trunk);
const crownLocal = new THREE.Vector3(0.9, 5.0, 0.15);
const crownOffset = crownLocal.clone().applyAxisAngle(new THREE.Vector3(0,1,0), -a);
const crown = new THREE.Vector3(px, baseY, pz).add(crownOffset);
```
Maybe the trunk bend outward; good.

Add a crown "coconut cluster" maybe small spheres? Not needed.

Leaves for each palm:
```
const n = 8;
for (let k=0; k<n; k++) {
  const phi = (k / n) * Math.PI * 2 + a * 0.5;
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), phi);
  const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -0.2);
  const qBase = qY.clone().multiply(qX);
  const pos = new THREE.Vector3(crown.x + 0.02, crown.y + 0.05, crown.z + 0.02);
  leafInstances.push({ pos, quat: qBase, phase: Math.random()*Math.PI*2 });
}
```
Do not use Math.random? Deterministic okay; but could use constant phase. Use deterministic `phase = k*0.7 + a*1.3 + palmIndex*0.5`. Fine. Avoid randomness for reproducibility. Use deterministic.

But leaf instances need 6 palms × 8 = 48. Good.

`leaves` created after filling. Set `leaves.instanceMatrix.needsUpdate = true` initially? Not needed but fine.

Now, `leaves.castShadow = true; leaves.receiveShadow = true;` (InstancedMesh has these properties inherited from Mesh).

Now, sway in animate. Use `leaves.instanceMatrix.needsUpdate = true;`.

Now, add rocks/bushes maybe.

Rocks:
```
const rockMat = new THREE.MeshStandardMaterial({color: 0x6b665c, roughness: 0.95});
for (let i=0; i<5; i++) { ... }
```
Use deterministic positions. Could add as icosahedron scaled.

Bushes: `SphereGeometry(0.5,8,6)` scaled (1,0.7,1), color green. Place near palms? maybe.

Not necessary; the scene already has palm trees.

Now, sun disc: If we add a solid sphere at 500 units, its radius 18 appears large? At distance 500, angular diameter ~ 36/500 = 0.072 rad ≈ 4°; good. Use radius 14. Color tone mapped: `MeshBasicMaterial({color: 0xfff2cc, toneMapped: true})`. It might be blown out to white. Good.

Maybe add a glow: `new THREE.Mesh(new THREE.SphereGeometry(28, 16, 12), new THREE.MeshBasicMaterial({color: 0xffe6b0, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}))` at same position. This makes a glow. Good.

But with ACES tone mapping, additive transparent glow maybe. Fine.

Now, fog color. Let's choose `const fogColor = new THREE.Color(0.62, 0.78, 0.90);` but that's linear; after ACES maybe. The sky horizon uHorizon should equal fogColor? Use same `uHorizon = fogColor`? Sky horizon is at y=0; set uHorizon to (0.62,0.78,0.90). That is a pale blue. Good. Sky zenith maybe (0.32,0.55,0.85). Hmm.

Let's pick:
- Horizon: (0.72, 0.84, 0.92) linear? After tone mapping, looks pale.
- Zenith: (0.28, 0.52, 0.82).
- Deep water: (0.02, 0.10, 0.16).
- Shallow water: (0.10, 0.40, 0.46).
- Fog color: (0.65, 0.80, 0.90).

Now, the ocean's `uHorizon` for reflection should be same as sky horizon. Use one shared uniform. Good.

Let's define `const horizonColor = new THREE.Color(0.68, 0.84, 0.92); const zenithColor = new THREE.Color(0.22, 0.45, 0.78); const deepColor = new THREE.Color(0.015, 0.075, 0.14); const shallowColor = new THREE.Color(0.10, 0.42, 0.50);`.

But `THREE.Color` with floats sets linear components. After tone mapping and sRGB, colors display. Fine.

Now, custom shaders include ACES and sRGB. For built-in materials, renderer handles. Good.

One thing: `ShaderMaterial` output is not converted to output color space, so our manual `pow(color, 1/2.2)` is approximate sRGB conversion. Three's `linearToSRGB` uses a more accurate function:
```
vec3 linearToSRGB(vec3 color) {
  return mix(1.055 * pow(color, vec3(0.416666667)) - 0.055, color * 12.92, step(color, vec3(0.0031308)));
}
```
Could use that for accuracy. Let's implement:
```
vec3 linToSRGB(vec3 c) {
  return mix(1.055 * pow(c, vec3(0.416666667)) - 0.055, c * 12.92, step(c, vec3(0.0031308)));
}
```
But `step(c, vec3(0.0031308))`? `step(edge, x)` returns 1 if x >= edge. We want if c <= 0.0031308, multiply 12.92; else pow. So `mix(pow..., c*12.92, step(vec3(0.0031308), c))`? Let's define:
```
vec3 linearToSRGB(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
  return mix(low, high, step(c, vec3(0.0031308)));
}
```
`step(c, vec3(0.0031308))`? GLSL `step(edge, x)`. If `edge = 0.0031308`, `x = c`, then for c <= edge returns 0, for c > edge returns 1. So mix(low, high, step(vec3(0.0031308), c))? `step(vec3(0.0031308), c)` = step(edge, x) with edge vec3 0.0031308 and x = c. Yes. Use `step(vec3(0.0031308), c)`. For c small, step = 0 → low; for c large, step = 1 → high. Good.

Use `pow(max(c, vec3(0.0)), vec3(1.0/2.4))`. Actually standard sRGB OETF exponent is 1/2.4. Three uses `1.0 / 2.4`. Good.

Now, ACES function:
```
vec3 acesFilm(vec3 c) {
  const float a = 2.51; ...
  return clamp((c * (a*c + b)) / (c * (c_? ...)), 0.0, 1.0);
}
```
As above.

Now, for sky dome, apply same.

Now, ocean fragment: mix fog color with tone mapping. Since fog color is linear; manual ACES. Good.

Now, `uExposure` for manual shaders. Set to `renderer.toneMappingExposure`. Use 1.1.

Now, the sky dome material's `fog`? ShaderMaterial ignores scene fog. Fine.

Now, we should ensure the sky dome is not affected by tone mapping twice. Manual.

Now, let's consider if `renderer.toneMapping = THREE.ACESFilmicToneMapping` combined with manual ACES for ShaderMaterial could be double? As argued no. But if three applies tone mapping to ShaderMaterial by some mechanism, our output would be double-tone-mapped and too bright. Let's be certain. In three.js, `WebGLRenderer` sets `renderer.toneMapping` and `material.toneMapped`; for built-in materials, the shader includes `#include <tonemapping_fragment>` which calls `toneMapping`. For `ShaderMaterial`, there is no automatic include; the material's `toneMapped` property might affect `WebGLRenderer` by setting `_uniforms`? Actually `ShaderMaterial`'s tone mapping is not handled. I've used custom ShaderMaterial with toneMapping enabled and it didn't tone map. So manual is needed. Good.

Now, maybe the sky dome and ocean shaders should use `gl_FragColor` with `vec4`. Good.

Now, we need to set `material.depthWrite`? Ocean should write depth. Fine.

Now, shadows: Directional light shadow camera with bounds. The light position at 80*sunDir ≈ (54.4, 49.6, 30.4) and target at origin. Shadow camera is placed at light position looking at target. Bounds ±60. Good.

`sun.shadow.camera.left = -60; right = 60; top = 60; bottom = -60; near = 1; far = 200;` Note the light is at distance 80 from origin; shadow camera near 1 and far 200. Good.

`sun.shadow.bias = -0.0005;` maybe `-0.0008`. Good.

Now, maybe set `sun.shadow.camera.updateProjectionMatrix()`? Automatically when set? The shadow camera's projection is updated in renderer when shadow map created. Fine.

Now, add `sun.target` to scene.

Now, `sun.position.copy(sunDir).multiplyScalar(80);` but `DirectionalLight.position` is a Vector3; `copy(sunDir).multiplyScalar(80)` mutates? `copy` returns Vector3, multiplyScalar returns Vector3. Fine.

Now, expose `__sun` after creation.

Now, let's write the code.

Before final, consider the leaf geometry and instanced matrix orientation. We derived leaf extends along +Z, base at origin. The instance position is crown. The leaf base at origin, so it radiates from crown. Good.

But the leaf geometry's base at t=0 has halfWidth 0.357; the frond's base is wide, then tapers. It might look like a leaf. Good.

The droop: y = 0.5*t - 1.0*t^2. At t=0, y=0; t=0.25, y=0.125-0.0625=0.0625; t=0.5, y=0.25-0.25=0; t=0.75, y=0.375-0.5625=-0.1875; t=1, y=0.5-1=-0.5. So it rises a little then droops. Good.

Leaf length 2.6; crown at top; fronds extend 2.6 units outward. Palm crown diameter ~5.2. Nice.

Tilt: qX(-0.2) applied to leaf: local +Z → (0, -sin(-0.2)=0.1987, cos(-0.2)=0.980) → slight upward. So leaves point up 0.2 rad. Good.

Sway: rotate base quaternion by small rotation about local Z or X. Use `swayQ.setFromAxisAngle(swayAxis, sway)` where swayAxis = (0,0,1) local? If we multiply qBase * swayQ, swayQ is in local coordinates after qBase? Actually qBase * swayQ means swayQ applied after qBase in local frame? The resulting rotation R = Q_base Q_sway. Since Q_sway is about local Z, the leaf (local +Z) would be rotated around its own axis (twist), not bend. Better sway about local X (bend up/down) or local Y (sideways). Use local X axis (1,0,0) for up/down sway; or local Y for side. Sway around X: Q_base * Q_sway means rotation Q_sway applied first in local coordinates? Let's think: World vector = Q_base * Q_sway * v. Q_sway rotates in local coordinate frame before Q_base. So a sway about local X makes the leaf bend up/down relative to its base orientation. Good. Use axis (1,0,0) local. However after qBase, local X maps to some world direction; fine.

Actually `qBase.multiply(swayQ)` = qBase * swayQ. Yes. Good.

Use `swayAxis = new THREE.Vector3(1,0,0)`.

But we create quaternions per instance; fine.

Now, if leaf geometry has normals, computeVertexNormals. DoubleSide material.

Now, `leafMat` roughness 0.8, metalness 0.0, side DoubleSide. Maybe `flatShading: false`. Good.

Colors of leaves: `0x2c7a35`. Add slight variation? Without instance colors, all same. Fine.

Maybe `MeshStandardMaterial` with `color: 0x2d7b38`. Good.

Now, trunks color `0x6a4929`.

Now, island material with vertex colors `color: 0xffffff`. Fine.

Now, rocks/sand maybe.

Now, let's think about `window` in TS. `window` is defined in browser environment; tsc needs `--dom` lib? The user compiles with tsc --strict; if tsconfig includes DOM lib default? In TS, default lib includes DOM if no `--lib`? Actually `tsc` with default `lib` includes ES + DOM. Fine. `document` and `window` available.

Now, import `* as THREE from 'three'` is fine. No addons. The instruction says "Addons from 'three/addons/...'" but we don't need any. Good.

Now, ensure no external assets. Our sun disc and materials procedural. Good.

Now, maybe use `THREE.CapsuleGeometry`? We avoid.

Now, let's write the full code. Need to be careful with GLSL template strings nested (backticks inside template strings). We'll build shader strings with template literals, careful not to include backticks inside. Use `${...}` for wave constants. Fine.

Let's formulate the shared wave GLSL function generation:

```
const waveHeightLines = WAVES.map((w) => {
  const k = (Math.PI * 2) / w.len;
  return `h += ${w.amp.toFixed(6)} * sin(${k.toFixed(6)} * dot(vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)}), p) - ${w.omega.toFixed(6)} * t);`;
}).join('\n');
```
But the expression `k * dot(...) - omega*t` needs parentheses? Multiplication and dot are fine: `0.2416 * dot(vec2(...), p) - 1.5 * t`. Good.

Gradient:
```
const waveGradLines = WAVES.map((w) => {
  const k = (Math.PI * 2) / w.len;
  return `g += ${w.amp.toFixed(6)} * ${k.toFixed(6)} * cos(${k.toFixed(6)} * dot(vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)}), p) - ${w.omega.toFixed(6)} * t) * vec2(${w.dx.toFixed(6)}, ${w.dz.toFixed(6)});`;
}).join('\n');
```
Then:
```
const oceanVertexShader = `
uniform float uTime;
uniform vec3 uSunDir;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

float waveHeight(vec2 p, float t) {
  float h = 0.0;
  ${waveHeightLines}
  return h;
}

vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  ${waveGradLines}
  return g;
}

void main() {
  vec3 pos = position;
  vec2 wp = vec2(pos.x, -pos.y);
  float h = waveHeight(wp, uTime);
  pos.z = h;
  vec2 g = waveGrad(wp, uTime);
  vec3 nLocal = normalize(vec3(-g.x, g.y, 1.0));
  vNormal = vec3(nLocal.x, nLocal.z, -nLocal.y);
  vHeight = h;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;
```
Note: The `waveGradLines` use `g += ...`. Good.

Potential problem: `modelMatrix` built-in declared; yes.

Now fragment shader:
```
const oceanFragmentShader = `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uMaxAmp;
uniform float uExposure;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

vec3 acesFilm(vec3 c) {
  const float a = 2.51;
  const float b = 0.03;
  const float d = 0.59;
  const float e = 0.14;
  const float cc = 0.43;
  return clamp((c * (a * c + b)) / (c * (cc * c + d) + e), 0.0, 1.0);
}
vec3 linToSRGB(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), c));
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
  vec3 sunDir = normalize(uSunDir);
  float hN = clamp(vHeight / uMaxAmp, -1.0, 1.0);
  vec3 base = mix(uDeep, uShallow, clamp(0.55 + 0.45 * hN, 0.0, 1.0));
  float d = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(14.0, 55.0, d);
  base = mix(base, uShallow, shallow * 0.35);
  vec3 refl = reflect(-viewDir, n);
  float rUp = clamp(refl.y, 0.0, 1.0);
  vec3 skyCol = mix(uHorizon, uZenith, pow(rUp, 0.65));
  vec3 col = base * (1.0 - fres * 0.9) + skyCol * (fres * 0.9);
  float nds = max(dot(n, sunDir), 0.0);
  float spec = pow(nds, 70.0);
  float broad = pow(nds, 10.0);
  col += vec3(1.0, 0.92, 0.75) * (spec * 2.5 + broad * 0.14);
  float foam = smoothstep(0.55, 0.95, hN);
  float shore = (1.0 - smoothstep(17.0, 21.5, d)) * 0.55;
  shore *= 0.5 + 0.5 * sin(vHeight * 3.0 + d * 0.7);
  float foamAmt = clamp(foam * 0.65 + shore * 0.5, 0.0, 1.0);
  col = mix(col, vec3(0.88, 0.93, 0.98), foamAmt);
  float dist = length(vWorldPos - cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);
  col *= uExposure;
  col = acesFilm(col);
  col = linToSRGB(col);
  gl_FragColor = vec4(col, 1.0);
}
`;
```
Wait `cameraPosition` built-in is from the camera. In ShaderMaterial, it's available. Good.

`step(vec3(0.0031308), c)` — in GLSL, `step` has overload `vec3 step(vec3 edge, vec3 x)`. Yes.

`pow(max(c, vec3(0.0)), vec3(1.0/2.4))` — good.

Now, sky shader:
```
const skyVertexShader = `
varying vec3 vWorldPos;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const skyFragmentShader = `
uniform vec3 uSunDir;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform float uExposure;
varying vec3 vWorldPos;
vec3 acesFilm(...) { ... }
vec3 linToSRGB(...) { ... }
void main() {
  vec3 dir = normalize(vWorldPos);
  float y = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(y, 0.7));
  float sun = max(dot(dir, normalize(uSunDir)), 0.0);
  col += vec3(1.0, 0.78, 0.45) * pow(sun, 24.0) * 0.9;
  col += vec3(1.0, 0.9, 0.75) * smoothstep(0.9992, 1.0, sun) * 2.0;
  col *= uExposure;
  col = acesFilm(col);
  col = linToSRGB(col);
  gl_FragColor = vec4(col, 1.0);
}
`;
```

Now, `sky` mesh:
```
const skyGeo = new THREE.SphereGeometry(600, 48, 24);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir },
    uHorizon: { value: horizonColor },
    uZenith: { value: zenithColor },
    uExposure: { value: exposure },
  },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);
```
`side: THREE.BackSide` with sphere; camera inside. Good.

Sun disc:
```
const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false });
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16), sunDiscMat);
sunDisc.position.copy(sunDir).multiplyScalar(500);
scene.add(sunDisc);
```
Maybe use `toneMapped: false`? If we want a bright sun not tone mapped? MeshBasicMaterial's toneMapping applies. With tone mapping, white stays white? ACES maps 1 to 0.65? Actually ACES(1) ≈ 0.61? Hmm, bright colors get mapped. A basic material color 0xfff2c8 is 1.0 linear; tone mapped to ~0.8. Fine.

Sun glow:
```
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffdf9e, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const glow = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 16), glowMat);
glow.position.copy(sunDir).multiplyScalar(500);
scene.add(glow);
```
Additive glow may make the sun region bright. Fine.

Now, maybe add a subtle "sun ray" no.

Now, camera and controls. No OrbitControls. Good.

Now, boat details:

Hull geometry creation function:
```
function makeHullGeometry(): THREE.BufferGeometry {
  const halfLen = 2.0;
  const maxW = 0.78;
  const ringsX = 28;
  const ringsT = 14;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i=0; i<=ringsX; i++) {
    const s = (i/ringsX)*2 - 1;
    const x = s*halfLen;
    const taper = 1.0 - Math.pow(Math.max(0, s), 2.0);
    const w = maxW * taper;
    for (let j=0; j<=ringsT; j++) {
      const t = j/ringsT;
      const y = 0.2 - 0.65*Math.sin(Math.PI*t);
      const z = -w*Math.cos(Math.PI*t);
      positions.push(x, y, z);
    }
  }
  for (int i ... ) {
    for (int j ...) {
      const a = i*(ringsT+1)+j;
      const b = (i+1)*(ringsT+1)+j;
      const c = (i+1)*(ringsT+1)+j+1;
      const d = i*(ringsT+1)+j+1;
      // triangles (a,b,d)? Wait we want (x,t), (x+dx,t), (x,t+dt) = (a,b,d) where a=(i,j), b=(i+1,j), d=(i,j+1). Use indices (a,b,d) and (b,c,d).
      indices.push(a,b,d);
      indices.push(b,c,d);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
```
Check triangulation: T1 (a,b,d) = (i,j),(i+1,j),(i,j+1) gave outward. T2 (b,c,d) = (i+1,j),(i+1,j+1),(i,j+1) gave outward. Yes.

Deck geometry:
```
function makeDeckGeometry(): BufferGeometry {
  const halfLen = 2.0;
  const maxW = 0.78;
  const ringsX = 28;
  const positions = [];
  const indices = [];
  for (let i=0; i<=ringsX; i++) {
    const s = (i/ringsX)*2 - 1;
    const x = s*halfLen;
    const taper = 1.0 - Math.pow(Math.max(0, s), 2.0);
    const w = maxW * taper * 0.92;
    positions.push(x, 0.19, -w);
    positions.push(x, 0.19, w);
  }
  for (let i=0; i<ringsX; i++) {
    const a = i*2; // left
    const b = i*2+1; // right
    const c = (i+1)*2;
    const d = (i+1)*2+1;
    // a=(x,left), b=(x,right), c=(x+dx,left), d=(x+dx,right)
    // T1 (a,b,d) up? a=(x,left z=-w), b=(x,right z=+w), d=(x+dx,right). We derived (A,B,C) with A=(i,left), B=(i,right), C=(i+1,right) up. So (a,b,d) = T1.
    // T2 (a,d,c) where c=(i+1,left). Up.
    indices.push(a,b,d);
    indices.push(a,d,c);
  }
  geom...
}
```
Check T2: A=a=(x,left), C? Wait T2 should be (A,C,D) with C=(i+1,right)? Hmm previously we had quad A=(i,left), B=(i,right), C=(i+1,right), D=(i+1,left). Triangles (A,B,C) and (A,C,D). So indices (a,b,d) and (a,d,c)? Let's map: C=(i+1,right) is d. D=(i+1,left) is c. So (a,b,d) and (a,d,c). Yes. I wrote (a,d,c). Good.

Hull material: `MeshStandardMaterial({ color: 0xf3f0e6, roughness: 0.55, metalness: 0.0 });`
Deck: wood `0x8a5a3b`, roughness 0.8.
Cabin: `0xdfe8ee` etc.

Maybe add a stripe on hull: Use another mesh? Could use a thin `BoxGeometry(3.2, 0.08, 0.9)` at y=0.1 with color blue, but hull width changes. Could look like a waterline stripe. Add a `Torus`? Not necessary.

Maybe add a small blue stripe along the hull: a scaled copy of hull geometry with color? The hull geometry could be duplicated with material blue and scaled slightly? That would overlay. Not necessary.

Now, sail: 
```
const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.lineTo(0, 2.0);
sailShape.lineTo(1.5, 0.25);
sailShape.lineTo(0,0);
const sailGeo = new THREE.ShapeGeometry(sailShape);
const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: 0xf6f1e0, roughness: 0.7, side: THREE.DoubleSide }));
sail.position.set(0.35, 0.25, 0);
```
Wait the mast at x=0.4, sail base at x=0.35? The sail extends toward +x. Good. Maybe rotate slightly? no.

Sail geometry has normal in +Z; DoubleSide handles.

Add a boom line: `CylinderGeometry(0.03,0.03,1.2,8)` at (0.85,0.28,0) rotated z? The boom along x. But optional.

Add a small flag at mast top: `PlaneGeometry(0.35,0.2)` at (0.55,2.6,0) maybe. Optional.

Now, cabin window:
```
const window = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.03), new THREE.MeshStandardMaterial({ color: 0x1a2a36, roughness:0.25, metalness:0.4 }));
window.position.set(-0.9, 0.48, 0.36);
```
Cabin box at z=0, depth 0.7 → side at z=0.35; window at z=0.36. Good.

Maybe add a second window on opposite side? not visible.

Add a cabin roof? no.

Now, boat group initial position not set until animate; but ensure it's visible at first frame. First frame animation sets position before render. Good.

Now, `boat.position` initial (12, 0.45, 14) maybe; but animation overrides. Set anyway.

Now, add all boat meshes castShadow = true, receiveShadow = true? Hull maybe receiveShadow from sail? Set true. Good.

Now, island group: set island mesh castShadow true, receiveShadow true. Palm trunks cast/receive. Leaves cast/receive.

Now, rocks: set cast/receive.

Now, maybe add a small dock? no.

Now, `__island` = islandGroup.

Now, animation of leaves. Need `leaves` variable accessible in animate. Define outside.

Now, `waveHeight` and `uTime` update. Ocean material uniform set.

Now, `__ocean.time()` should return `elapsed`. Note `elapsed` updated in animate. There is also clock time. Fine.

Now, `__ready` after first render. Because `setAnimationLoop` runs asynchronous; first frame maybe immediately after code. We set firstFrame. Good.

Now, if the page is not visible until animation loop, fine.

Now, compile with strict: Some potential issues:

- `const leafInstances: LeafInstance[] = [];` with interface. Need to define before use.
- `const WAVES = [...] as const`? If `as const`, property types are literal; fine. But `w.dx.toFixed` works. Use no `as const`.
- `const waveHeight` function typed.
- `const waveGradLines` uses `w.len` etc.
- `THREE.Float32BufferAttribute` available.
- `geometry.setIndex(indices)` with number[]; TS accepts? In three.d.ts: `setIndex(index: BufferAttribute | number[]): this;` yes.
- `geometry.computeVertexNormals()`.
- `THREE.ShapeGeometry(shape)` where shape: THREE.Shape. Good.
- `const sail = new THREE.Mesh(sailGeo, sailMat)`. Good.
- `sun.shadow.camera` properties: TS knows `DirectionalLight.shadow.camera` is `OrthographicCamera`? In three.d.ts, `LightShadow` has `camera: OrthographicCamera | PerspectiveCamera`? For DirectionalLight, shadow is `DirectionalLightShadow` with camera: OrthographicCamera? Let me check: `DirectionalLight` extends `Light`; `shadow` property is `LightShadow` with camera type `OrthoCamera`? In three.d.ts, `DirectionalLightShadow` interface? Actually `DirectionalLight` has `shadow: DirectionalLightShadow`, where `DirectionalLightShadow` extends `LightShadow` with `camera: OrthographicCamera`? Hmm, I think `DirectionalLight.shadow.camera` is typed as `OrthographicCamera`. Setting `.left`, `.right`, etc. is fine.

But TS strict might complain if `sun.shadow.camera` is `OrthographicCamera | PerspectiveCamera`. Let's check three.d.ts: 
```
class DirectionalLight extends Light {
  shadow: DirectionalLightShadow;
}
class DirectionalLightShadow extends LightShadow {
  camera: OrthographicCamera;
}
```
I think yes. For SpotLight shadow camera is PerspectiveCamera. So fine.

- `renderer.domElement.style.display = 'block';` fine.
- `window.innerWidth` fine.

Now, potential issue with `THREE.Color` passed to `Fog` constructor: `new THREE.Fog(fogColor, 70, 330)` where fogColor is Color. In three.d.ts `Fog` constructor `(color: Color | number | string, near: number, far: number)`. Fine.

Now, `scene.background = new THREE.Color(0x8db4cc)` maybe. Fine.

Now, `renderer.setSize(window.innerWidth, window.innerHeight);` and canvas appended. Good.

Now, `document.body.appendChild(renderer.domElement);`

Now, set body styles. Good.

Now, maybe we need to call `renderer.render(scene, camera)` in animate after updating. Good.

Now, let's think about how the ocean shader's normals are affected by the mesh's rotation. We compute world normal manually, but the mesh `modelMatrix` includes rotation; however our manual normal mapping assumes the mesh has exactly rotation -PI/2 about X. We set `oceanMesh.rotation.x = -Math.PI/2`. Good. If we also set position, no change. We don't apply `normalMatrix`; our world normal is computed. Good. But we output `vNormal` in world space and use it directly. Fine.

Now, one subtlety: `modelMatrix` built-in for ShaderMaterial: Since the mesh is rotated, the world position from `modelMatrix` correct. Good.

Now, `gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0)`. Good.

Now, `uSunDir` passed as normalized vector. In shader we normalize again. Fine.

Now, the sky dome uses `modelMatrix`; good.

Now, the sun disc position uses `sunDir`. Good.

Now, shadows and light direction: sunDir points from origin to sun. Light position = 80*sunDir. Light direction = target - position = -80*sunDir, so light shines from sun toward scene. Good. Sky sun position = sunDir; matches.

Now, the ocean sun specular uses `dot(n, sunDir)` where sunDir points toward sun. Good.

Now, `light` intensity: with tone mapping, 2.8. Fine.

Now, scene fog with custom ocean. Good.

Now, perhaps add some ambient to avoid too dark: HemisphereLight 0.5.

Now, maybe add a little "sun glow" in the sky. Good.

Now, write all code in one file, no extra HTML.

Let's also consider performance: The island geometry has 40 rings * 96 segments ≈ 3840 vertices; fine. Palm tubes 20*8 segments each; fine. Leaves 48 instanced; fine. Ocean 256*256; fine.

Now, maybe increase ocean segments to 256 exactly. Good.

Now, let's draft final code.

Potential TS issue with shader strings and `${...}`: fine.

Potential issue with `WAVES` array and `.map` producing strings; fine.

Now, `waveHeight` JS function uses `for (const w of WAVES)`. Type inference: WAVES is an array of object types with numbers. Fine.

Now, `const waveGLSL...` building. Good.

Now, let's be careful with the `waveGradLines` generation: each line `g += 0.42 * 0.2416 * cos(...) * vec2(...)`. In GLSL `vec2` multiplication works. Good.

Now, the shader fragment `smoothstep(0.55, 0.95, hN)` where hN ∈ [-1,1]. `smoothstep` returns 0 for hN<0.55, 1 for >0.95. So foam only at high crests. Good. But waves amplitude max 0.97; hN max 1.0. Good.

Shore foam: `d = length(vWorldPos.xz)`. For water far away, d up to 500; shore = 0. Good. Near island d between 17 and 21.5, foam. Good.

But note the water plane's y is wave height; vWorldPos.xz is same as undisplaced position (since only vertical displacement). Good.

Now, `shallow = 1.0 - smoothstep(14.0, 55.0, d)`; at d<14 shallow=1, at d>55 shallow=0. This changes base color near origin. But the island covers d<18; water not visible inside. Fine.

Now, fog factor: `smoothstep(uFogNear, uFogFar, dist)`. `uFogNear=70, uFogFar=330`. Good. At distance 30, fog 0. Fine.

Now, tone mapping exposure: use `const exposure = 1.1;`.

Now, sky dome radius 600; camera far 1000. Good.

Now, directional light shadow map size 2048. Good.

Now, `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;`.

Now, `sun.castShadow = true;`.

Now, maybe `sun.shadow.bias = -0.0008;`.

Now, `sun.shadow.normalBias = 0.02;` available? In three.d.ts, `LightShadow` has `normalBias`. Could set. Not necessary. Maybe set `sun.shadow.bias = -0.0005` only.

Now, `sun.shadow.camera.updateProjectionMatrix();` after setting bounds? In renderer, it updates. But could call to be safe. Good.

Now, need `sun.target` added. Good.

Now, camera lookAt. Good.

Now, `const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);` then set position and lookAt. Good.

Now, appending canvas and body styles. Good.

Now, we should handle resize before animation loop. Good.

Now, final code.

Let's consider a potential visual issue: The ocean plane is a simple plane; the island mesh may intersect with water at y=0. The island's rim at -1.2; the water plane displaces above; water may cover the rim. Good. But the island mesh from r=0 to 18; water plane extends underneath. The island surface above water is visible. At the edge, the island dips below water; water covers. Good.

Now, the boat hull is partly submerged; water plane will cover part of the hull if it's below water. But the boat's bottom is at water height, so mostly above. Good.

Now, shadows: boat meshes cast shadows; but water doesn't receive. Fine.

Now, leaves: maybe too large or too spread; okay.

Now, let's think about the palm trunk geometry: `TubeGeometry(curve, 20, 0.16, 8, false)` — TubeGeometry signature `TubeGeometry(path: Curve, tubularSegments: number, radius: number, radialSegments: number, closed: boolean)`. Good.

Now, the trunk base at local (0,0,0); curve starts there. Good. Top at (0.9,5.0,0.15). The crown local end. Good.

Now, `trunk.rotation.y = -a;` but `a` is palm's angle; outward direction. The trunk bends toward local +X; after rotation -a, local +X maps to (cos(-a), 0, -sin(-a))? Wait R_y(-a) maps local +X to (cos(-a), 0, -sin(-a)) = (cos a, 0, sin a). That's outward radial direction. Good.

Now, crown offset: applyAxisAngle(Y, -a) to (0.9,5,0.15). R_y(-a) maps x to (cos a, 0, sin a) and z to (-sin a? let's compute R_y(θ) matrix [[cosθ,0,sinθ],[0,1,0],[-sinθ,0,cosθ]]. For θ=-a: [[cos a,0,-sin a],[0,1,0],[sin a,0,cos a]]. So local (0.9,5,0.15) maps to (0.9 cos a - 0.15 sin a, 5, 0.9 sin a + 0.15 cos a). Hmm direction mostly outward? The x component cos a, z component sin a (since 0.15 small). Good. Outward radial. Good.

Now, the palm base position: px = rr*cos a, pz = rr*sin a. The outward direction is (cos a, sin a). Good. The trunk bends outward. Good.

Now, the crown position = base + rotated end. Good.

Now, leaves fan around crown. Good.

Now, leaves are instanced all in world coordinates (positions absolute). The `leaves` InstancedMesh added to islandGroup; instance matrices are world positions relative to islandGroup (which is at origin).