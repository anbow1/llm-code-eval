Let me write a single TypeScript file implementing this scene.

Key components:
1. Renderer setup: WebGLRenderer, ACESFilmic tone mapping, sRGB output, shadow map enabled, PCFSoft shadows.
2. Camera at (35,12,35) looking at (0,2,0). OrbitControls from three/addons/controls/OrbitControls.js with target (0,2,0) and update.
3. Sky: use Sky addon with sun position. Sky shader needs sunPosition uniform. Alternatively a custom gradient dome. The Sky addon requires a directional light + renderer tone mapping. Let's use Sky with the sun elevation ~ 15 degrees, azimuth maybe 60 degrees.

Actually with Sky addon, sun position in Sky is a vector; compute from elevation/azimuth using THREE.Spherical or the set from sky uniforms. Standard three.js example: 

```js
const sky = new Sky();
sky.scale.setScalar(450000);
const uniforms = sky.material.uniforms;
uniforms['sunPosition'].value.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth));
```
And the direction of light = sunPosition normalized.

But Sky addon requires the scene background? We'll add sky mesh. Note fog won't affect the sky shader (it's a shader material without fog). Fine — fog blends far ocean into horizon; to make the fog color match the sky near the horizon, choose fog color like 0xbcd7e8 or similar warm.

Hmm, the Sky shader in newer versions has 'sunPosition' and works. Since the sky dome is huge, fog won't apply. Ocean at distance will fade into fog color; we should set the fog color to something that matches the horizon sky color. With sun elevation ~10-20 degrees, horizon is fairly bright with warm tint. Let's pick fog color 0xbfd8e8 (light blue) and blend near horizon.

Actually to be safe, maybe build a custom gradient sky dome via ShaderMaterial — full control, no addon dependency issues. But requirement says sky dome or Sky addon. A custom shader dome gives us a nicer look and we can add a sun disc. Let's do a custom sky dome shader: gradient from horizon color to zenith, plus sun glow/disc based on dot direction. That's simpler and more controllable than Sky addon (which requires careful tuning of turbidity/rayleigh/mieCoefficient).

I'll do a sky dome sphere with BackSide and ShaderMaterial with uniforms: topColor, horizonColor, sunDirection, sunColor. Include sun disc + glow.

4. Ocean: PlaneGeometry(400,400, 200, 200) rotated -PI/2. ShaderMaterial with vertex displacement using Gerstner waves sum. Compute normal analytically in fragment via derivatives of the displacement (need careful math) or via finite differences using the same function in the vertex shader for 3-4 taps — expensive but simple. Better: compute analytic derivatives in vertex shader and pass normal as varying. But waves in fragment shader for detail would require derivatives too. Let's compute in vertex shader with analytic derivative sums for the base normal, plus add high-frequency detail using a normal map-ish procedural approach in the fragment shader (small-scale ripple using sin functions with analytic derivatives). Hmm, need to keep fragment cost moderate.

Simplest robust approach: vertex shader computes displacement + analytic tangent/binormal, outputs world position and normal. Fragment does Fresnel, specular from sun (Blinn-Phong), deep/shallow colors from view depth, foam near crests based on height and wave steepness, sky reflection approximated by a gradient based on reflected ray Y.

Since we need specular highlight from the sun and Fresnel reflection of the sky, use reflection vector R = reflect(-V, N) and evaluate a simple analytic sky function (same as the dome color) in the fragment shader. That makes water reflect the sky nicely.

Gerstner waves: for wave i with direction D, amplitude A, wavelength L, speed s:
k = 2π/L, omega = sqrt(g*k) maybe or custom speed. Use phase = k*(D·(x,z)) - omega*t.
Displacement: 
x += D.x * (A * cos(phase) * ... ) — Gerstner horizontal shift: horizontal = D * (Q*A*cos(phase)) with Q steepness. To keep heightAt matching "vertical displacement at undisplaced position (ignore small horizontal shift)", we can use sum of A*sin(phase) for height. For a proper Gerstner, the y = A * sin(phase) and horizontal shift = D * cos(phase) * A * steepness... For simplicity and matching, I'll use Gerstner with horizontal displacement in the vertex shader but the heightAt function in JS returns just the sum of A*sin(phase) (ignoring horizontal shift as allowed). Good.

Actually to keep boat motion matching, the JS heightAt must match the shader's y at undisplaced position. If the shader includes horizontal displacement (Gerstner), the point at (x,z) in undisplaced space moves to (x+dx, z+dz) and its height y is sum A*sin(phase) evaluated at the *undisplaced* position. So heightAt(x,z,t) = sum A*sin(phase(x,z,t)) matches y at that base position. 

Let me define waves:

Wave parameters (amplitude, wavelength, speed, direction angle):
1. A=0.55, L=42, angle 30°, omega = 1.6? Let's use deep water dispersion omega = sqrt(9.8 * k). For L=42, k=0.1496, omega=1.21. Speed of phase = omega/k = 8.1 units/s. Too fast maybe. We'll use scaled speeds to control. Let's just define wavelength and speed (phase speed) directly and omega = 2π*speed/L... Actually the shader uses phase = k*(D·p) - omega*t. Let's define per-wave "speed" as omega and choose it. Crest-to-trough total height should be about 0.5-2 units: sum of amplitudes*2 = maybe 1.6. So amplitudes: 0.5, 0.28, 0.16, 0.1 => total 1.04 amp => crest-to-trough 2.08. Slightly too big; use 0.42,0.24,0.14,0.08 => 0.88 => 1.76 crest-to-trough. Good, within 0.5-2.

Hmm, "crest-to-trough height about 0.5 to 2 units" — 1.76 is fine.

Waves:
- k1: dir (cos 25°, sin 25°)... Let's set direction angles: 20°, 75°, 150°, 250°.
- L1 = 46, A1 = 0.42, omega1 = 1.15
- L2 = 26, A2 = 0.24, omega2 = 1.55
- L3 = 15, A3 = 0.14, omega3 = 2.1
- L4 = 8,  A4 = 0.08, omega4 = 2.9

Sum amplitude = 0.88 → crest to trough 1.76. Good.

For steepness in Gerstner horizontal displacement: Q_i = steepness/(k_i * A_i * numWaves) to avoid looping. Simpler: horizontal displacement = D * A * cos(phase) * steep = factor. Let's use horizontal factor 0.6 for all: dx += D.x * A * cos(phase) * 0.6. Hmm, that's the standard Gerstner "Q*A*cos" with Q=0.6. It creates nice choppy crests. But the normals computed with derivative must account for horizontal displacement. Analytic normal for Gerstner:

Let phase_i = k*(D·p) - omega*t. 
Position: P = (x + Σ D_i.x * A_i * Q * cos(phase_i), Σ A_i*sin(phase_i), z + Σ D_i.z*A_i*Q*cos(phase_i)).

∂P/∂x: 
x-component: 1 - Σ D_i.x * A_i * Q * k_i * D_i.x * sin(phase_i)
y-component: Σ A_i * k_i * D_i.x * cos(phase_i)
z-component: - Σ D_i.z * A_i * Q * k_i * D_i.x * sin(phase_i)

∂P/∂z:
x: - Σ D_i.x * A_i*Q*k_i*D_i.z * sin
y: Σ A_i * k_i * D_i.z * cos
z: 1 - Σ D_i.z*A_i*Q*k_i*D_i.z*sin

Normal = normalize(cross(∂P/∂z, ∂P/∂x))? With y up, tangent along x = Tx = ∂P/∂x, tangent along z = Tz = ∂P/∂z. Normal = cross(Tz, Tx) normalized... Let's check with flat: Tx=(1,0,0), Tz=(0,0,1). cross(Tz,Tx) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Yes correct.

I'll implement this in the vertex shader with loops over 4 waves written explicitly (unrolled) to avoid dynamic array issues, and pass normal in world space.

But wait: the ocean plane's local space vs world space — plane rotated -PI/2 about X then positioned at y=0. To simplify, do displacement in the vertex shader using the world position: compute worldPos = (position.x, 0, position.z) after applying modelMatrix (or since plane is rotated, local position.x = world x, local position.y = -world z... messy). Better: build a custom geometry in the XZ plane directly (no rotation), i.e., create PlaneGeometry and rotate its geometry: `geo.rotateX(-Math.PI/2)`. Then local coordinates are (x, 0, z) = world coordinates (mesh at origin). Then displace in local space and set gl_Position via projectionMatrix * modelViewMatrix * vec4(displaced,1). And normals from analytic derivatives in the same space (object space = world space). 

Fog: ShaderMaterial needs fog support — either include fog manually in the shader (with fog uniforms) or use `fog: true` in the material and include the fog chunks. For ShaderMaterial, setting `fog: true` requires the shader to include fog pars chunks and the material's uniforms unified with UniformsLib.fog. Easier: implement fog manually with a uniform fogColor, fogNear, fogFar, and use distance-based exponential fog. But requirement: scene.fog that blends far ocean into horizon. We can set scene.fog = new THREE.Fog(color, near, far) for the other objects (standard materials), and in the water shader replicate the same fog math (linear fog) manually with the same near/far and color uniforms. That works and keeps consistency. I'll use THREE.Fog with near=60, far=260. Hmm camera at 35,12,35 → distance to origin ~50. Ocean extends 200 units from origin; far parts will be fogged out. Good.

Actually maybe use FogExp2 for nicer blend? For standard materials, scene.fog = new THREE.Fog(...) linear is fine, easy to replicate in shader. Let's do linear fog with near 40, far 220? The horizon distance from camera is large. Let's compute: camera at (35,12,35); ocean spans x,z in [-200,200]. The distance to the far edge varies from ~230 to ~290. Fog near 50, far 300 → far corners almost fully fogged. Island is within 50 units — shouldn't be fogged much at distance ~50. Hmm, at the island center distance is ~50, fog factor (50-50)/(300-50)=0. So island unaffected. Good. Boat at (12,0,14) distance from camera ~ sqrt(23²+12²+21²) ≈ 34 → no fog. Good.

Choose fog color to match horizon sky: maybe 0xa9c6d8 or warm 0xc6d8e0. Let's set fogColor = 0x9fc0d8 and sky horizon color similar but slightly warmer. Let me pick a nice sunset-ish? "Realistic, good-looking" — tropical midday or golden hour. Golden hour gives pretty colors: warm sun, blue-teal water. Let's do late afternoon: sun elevation ~18°, warm white sun (0xfff2d8), sky gradient zenith #2e6cb4 to horizon #a8c9e0 with warm glow near sun.

Hmm, tone mapping ACES with exposure 1.0. Let's keep colors moderate.

Let's design sky shader:

```glsl
varying vec3 vWorldDir; // direction from camera
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;

void main() {
  vec3 dir = normalize(vWorldPos); // position relative to camera... 
  float h = max(dir.y, 0.0);
  vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));
  // sun glow
  float d = max(dot(dir, uSunDir), 0.0);
  sky += uSunColor * pow(d, 900.0) * 30.0; // disc... maybe too big
  sky += uSunColor * pow(d, 12.0) * 0.25;  // glow
  sky += uSunColor * 0.08 * pow(max(dot(dir, uSunDir),0.0), 3.0);
  ...
}
```

For the dome, simplest: create a large sphere with BackSide; compute direction as normalize(worldPosition - cameraPosition) — but sphere is huge, so normalize(worldPosition) works if centered at camera. Let's add the sky dome as a mesh that we follow the camera? Simpler: make the sky dome huge (radius 800), centered at origin, and camera stays near origin (radius <60), so normalize(vWorldPos) approximates the direction. Add `depthWrite: false`, `side: BackSide`, `fog: false`.

Sun disc: uSunDir points from origin toward sun. pow(dot, 1500) gives a small disc but with vertices interpolation it's fine since we compute per fragment.

The ocean reflection evaluates the same sky function with reflected direction.

Let's write a shared GLSL function as a string constant and include in both sky and ocean fragment shaders. Nice.

5. Boat: Group with hull (a shape). Build hull from primitives: use a LatheGeometry? Simplest is a Box scaled + tapered via geometry manipulation, but "built from primitives" — use several meshes: hull using a custom shape? Let's use:
- Hull: a CapsuleGeometry? Hmm. A boat hull shape: use `THREE.BoxGeometry(1.6, 0.9, 4.2)` scaled with taper isn't primitive-ish. Could use ExtrudeGeometry from a shape (2D hull cross-section extruded) — that's not a primitive but is procedural geometry, allowed ("built from primitives (hull, deck or cabin, mast and sail; at least 3 meshes in one Group)"). I think using primitives is safest: hull = a box with slightly modified vertices? Let's use a `SphereGeometry`-based hull? A nice trick: use `THREE.CylinderGeometry` with different top/bottom radii and a half-rotation... 

Simplest good-looking: hull from a box rotated? Let's create the hull from a `THREE.CapsuleGeometry(0.9, 2.2, 4, 12)` — capsules are rounded cylinders, lying along... capsule axis is Y. Rotate X by 90° to lie along Z, scale Y (which becomes vertical after rotation?) Hmm. Maybe use a `SphereGeometry` scaled: sphere radius 1, scale (0.9, 0.55, 2.1) → a rounded blob hull shape. Then cut off the top by placing a deck box. That reads as a boat hull with a deck plane on top. That's decent.

Better approach: build hull with ExtrudeGeometry using a Shape (side profile) extruded in width, plus a taper via scaling. Let's do:
Hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), hullMaterial); scale (1,0.6,2.1)? Sphere gives a symmetric ellipsoid; boat hull should have a pointed bow and flat-ish stern. Could modify the sphere vertices procedurally: for each vertex, taper x based on z (bow narrower). This is "procedural geometry" — fine, no external assets. I'll do a simple displacement of a sphere to make it hull-like:

Actually, let's create a hull via `THREE.Shape` profile + ExtrudeGeometry with bevel — a common approach:

```ts
const hullShape = new THREE.Shape();
hullShape.moveTo(-2.0, -0.05);   // stern bottom... 
```
Extrude along width (depth), then rotate so the shape is the side profile. Hmm, side profile extruded gives a constant-width boat which is okay-ish but boxy.

Let me just use a Sphere-based hull with vertex tweaking:

```ts
const geo = new THREE.SphereGeometry(1, 24, 16);
const pos = geo.attributes.position;
for (i...) {
  const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
  // taper width toward bow (z>0) and stern
  const taper = 1 - 0.55 * Math.pow(Math.max(0, z), 2);  // bow narrower
  let nx = x * taper;
  let ny = y;
  // flatten bottom
  if (y < 0) ny = y * 0.6;
  // deck cut: clamp top
  ...
}
```
Then scale the mesh: (0.95, 0.75, 2.1) with hull length 4.2. Add a deck plane on top (BoxGeometry), cabin (Box), mast (Cylinder), sail (a plane or a custom triangle shape — use a `THREE.BufferGeometry` triangle, or a PlaneGeometry with slight curve). Use `THREE.ShapeGeometry` triangle for sail? A sail as a slightly curved plane: PlaneGeometry(1.6, 2.2, 8, 8) with vertices bulged in z. That's nice.

Also a boom (cylinder), ropes maybe not needed. Add a small flag? Keep it reasonable.

Boat group at (12,0,14), drift slowly: x = 12 + 3*sin(0.05*t), z = 14 + 2*cos(0.07*t). Ensure stays within 25 units of origin: 12+3=15, 14+2=16, distance ~21.9 < 25. Good.

Height: y = heightAt(x,z,t) + offset where offset ~ 0.15 (hull sits with bottom below water). The hull center is at y=0 in local space with hull half-height ~0.75 → hull bottom at -0.75. Put offset such that hull sits in water: offset = 0.15 means the waterline cuts the hull (which extends from -0.75 to +0.5). Good.

Pitch and roll: sample heightAt at bow (z+1.8), stern (z-1.8), port (x-1), starboard (x+1) in boat-local directions. Since boat may rotate slightly, approximate using world offsets. pitch = atan2(hBow - hStern, 3.6) → rotation about X axis. With y-up and forward +z: rotation.x = -atan2(dz_forward... let's think: if the bow (at +z) is higher, the boat should pitch up at the front → rotation about x axis negative? For a rotation about X by angle a, the point (0,0,1) maps to (0, sin(a)... let's compute: RotX(a): y' = y cos a - z sin a; z' = y sin a + z cos a. Point (0,0,1) → y' = -sin a, z' = cos a. So positive rotation.x moves the bow downward. If bow is higher (hBow > hStern), we want bow up → rotation.x = -atan(dy/dz). So rotation.x = -atan2(hBow - hStern, dist).

Roll about Z: point (1,0,0) (starboard) → RotZ(a): x' = x cos a - y sin a; y' = x sin a + y cos a → (cos a, sin a, 0). Positive rotation.z raises starboard. If starboard higher (hStb > hPort), we want that → rotation.z = +atan2(hStb - hPort, width). Hmm sign: yes positive z rotation raises +x side. So rotation.z = atan2(hStb - hPort, dist).

Smooth with lerp for less jitter.

But careful: the boat's rotation affects sampling points. Just use world-space offsets around (x,z) — good enough.

6. Island: procedural terrain from PlaneGeometry or a CircleGeometry-based grid, displaced by a radial falloff + noise. Use PlaneGeometry(90, 90, 96, 96) with vertex displacement in JS: 

height = peak * falloff(r) where falloff is smooth (1 - smoothstep) shaped, plus hills via sin/noise. Ensure it goes below water at the edges so it slopes into the sea. Use vertex colors: sand below y<0.8, grass above, rock on steep/high. Then a standard material with vertexColors, flatShading off, roughness 0.9. Also add a sandy beach ring.

Island radius: about 30-50 units across, so radius ~20-25. Peak 5-15 units above water.

Let's define: for each vertex at (x,z), r = length(x,z). Base height: 
```
const R = 22;
let h = 11 * Math.pow(1 - clamp(r/R,0,1), 1.6)  // hmm gives 11 at center → sharp peak
```
Better: use a smooth dome: h = peak * (1 - smoothstep(0, R, r)) with some noise. Add ridge noise for realism using a few sine octaves (no external noise lib; implement simple value noise or use sin combos).

Let's implement a small hash-based value noise function in TS for the island. Fine.

Height function:
```
function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const dome = Math.max(0, 1 - r/26);
  let h = 10 * Math.pow(dome, 1.5);          // peak ~10 at center
  h += 2.2 * noise(x*0.06, z*0.06) * dome;   // knolls
  h += 1.0 * noise(x*0.15, z*0.15) * dome;   // small detail
  h -= 1.6;  // sink edges below water? At r=26, dome=0 → h=-1.6 → underwater. 
  return h;
}
```
At center: h = 10 + ~2.2*0.5 + ... -1.6 ≈ 9.7. Peak 5-15 ✓. Distance across where h>0: need dome^1.5*10 > 1.6 → dome > (0.16)^(2/3) = 0.294 → r < 26*0.706 = 18.4 → diameter ~37 units. ✓ 30-50 across.

Add a small reef/lagoon? Not needed.

Also maybe add rocks and a few shrubs? Palms are required (at least 5). Let's do 7 palms placed on the island at various angles/radii, with trunk base at islandHeight. Trunk drawn with TubeGeometry along a curve (curved trunk) — that's a mesh per palm, fine (7 meshes). Leaves: all leaves of all palms in ONE InstancedMesh with 7 palms × 8 leaves = 56 instances. Each instance matrix = palmBase transform * leaf local transform (rotation around crown, tilt, sway). Update every frame with sway: rotate leaf slightly with time-based sin, plus flutter.

Leaf geometry: a plane geometry shaped like a palm frond — use a PlaneGeometry(0.6, 3.2, 1, 8) and modify vertices to taper and curve (droop). Or a custom BufferGeometry forming a leaf shape. Let's make a frond: PlaneGeometry with segments along length, taper width via sin, and curve downward along length (position.y offset -0.3*t² ...). Actually easier: build the frond as a plane in local space where +Y is the length direction (from base at y=0 to tip at y=L), and we bend it: for each row at t = y/L, we apply z-offset? Let's define local orientation: the frond extends along +X, drooping in -Y, with width along Z. Build PlaneGeometry(len, width, 12, 1) then rotate so...

Simplest: create PlaneGeometry(3.2, 0.55, 12, 1) in XY plane (x along length, y along width), then modify:
- taper width: scale y by sin(π t)^0.7 with t = (x + L/2)/L
- droop: set z? No, droop should bend it downward; we'll rotate in the instance matrix. Let's instead bend along the local Y direction: y_offset = -0.35 * L * t².

Then in the instance matrix, orient the frond with a base rotation (yaw around trunk) and pitch up ~ -20° and roll... Actually the frond local geometry: extends along +X from -L/2..L/2. Let's translate geometry so the base is at origin and it extends along +X: geometry.translate(L/2? ) Hmm. PlaneGeometry(3.2,0.55) centered; I'd modify vertices: x in [-1.6,1.6]. Translate +1.6 so base at x=0, tip at x=3.2. Then droop: y = -0.9 * (x/3.2)^2 * ... Let's compute per vertex: t = x/3.2 ∈[0,1]; y_droop = -0.45*3.2*t^2? That's -1.44 at the tip; reasonable droop. Also add a slight "V" fold along the spine for volume: z offset = 0.12*|u| (the width coordinate), making a shallow V. Nice.

Actually for palm leaves, a frond that arcs upward then droops: y = a*t - b*t² with a>0. Let's do y = 1.0*t - 1.6*t² times 3.2? At t=0: 0; t=0.5: (0.5-0.4)=0.1*... hmm let's use: y = L*(0.55*t - 1.1*t²)? tip: 0.55-1.1=-0.55*L → goes below. At t≈0.25 max: 0.55*0.25 - 1.1*0.0625 = 0.1375-0.06875=0.069*L. So the frond arcs up slightly then droops. With L=3.2: max +0.22, tip -1.76. Hmm tip -1.76 below the crown, fine for drooping fronds but maybe too much. Use coefficients (0.7t - 1.0t²): max at t=0.35 → 0.245-0.1225=0.1225*L=0.39; tip: 0.7-1.0=-0.3*L=-0.96. Good.

Palm crown: also add coconuts (small spheres) maybe in the palm group. And the trunk: TubeGeometry along a QuadraticBezierCurve3 or CatmullRomCurve3 curving. Trunk radius ~0.25 tapering.

The leaves InstancedMesh must be exposed and its matrix updated every frame. Note InstancedMesh with 56 instances and castShadow — fine.

Leaf material: MeshStandardMaterial with vertexColors? Use a nice green with slight color variation via instanceColor? We can use setColorAt for per-instance color variation (instanced color). That's allowed and looks good. But InstancedMesh with instanceColor requires material support — standard material supports it via USE_INSTANCING_COLOR. Yes, `mesh.setColorAt(i, color)` works. We must call instanceColor.needsUpdate = true once.

Leaves should be double-sided (side: THREE.DoubleSide) and maybe alphaTest not needed since geometry is shaped.

7. Shadows: directional light with shadow camera covering island and boat: ortho left/right ±40, near 1, far 200, position sun dir * 60, target origin. shadow.mapSize 2048. Bias -0.0005, normalBias 0.05.

8. Sun: DirectionalLight, intensity ~2.2? With ACES tone mapping. Let's use intensity 2.6 and hemisphere light 0.6.

Also add ambient fill: HemisphereLight(sky color, ground color, 0.6).

9. Ocean foam: near crests based on the wave height relative to max amplitude, plus maybe shore foam near the island (based on distance to island). Compute in fragment shader: use vHeight (displaced height) and a foam factor = smoothstep(0.55, 0.9, h/hmax) with some noise (procedural sin noise). For shore foam: distance from origin < ~22 → foam based on the island's approximate edge. But since the island is not circular, use a ring around the island radius ~19 with a wavy modulation using sin(angle*3). We'll compute worldPos distance in the fragment shader.

Let's implement foam as: 
```
float crest = smoothstep(0.65, 0.95, vWaveH);  // vWaveH normalized to amplitude sum
float noise = ...;
float foam = crest * noise;
```
Plus shore: `float shoreFade = smoothstep(21.5, 18.0, r)` combined with wave pulses.

Keep it subtle to look good.

10. Sky reflection: in the ocean fragment shader, compute the sky color for the reflected direction using the same function (shared GLSL). Also add sun glitter using a Blinn-Phong specular with high shininess and multiply.

Also water depth color: use a base deep color and a shallow color near the island (based on distance from origin?) — "deep/shallow color": mix deep teal with a lighter turquoise near the island shallows. Use distance to origin to mix, plus view-dependent Fresnel.

Let's write the water fragment shader:

```glsl
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFogColor;
uniform float uFogNear, uFogFar;
uniform float uTime;
uniform vec3 uSkyZenith, uSkyHorizon;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdotV = clamp(dot(N,V), 0.0, 1.0);
  // fresnel
  float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 skyRefl = skyColor(R);
  // water body color
  float distToIsland = length(vWorldPos.xz);
  float shallow = 1.0 - smoothstep(14.0, 30.0, distToIsland);
  vec3 body = mix(uDeepColor, uShallowColor, shallow * 0.75);
  // specular
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N,H),0.0), 380.0) * 2.5;
  float spec2 = pow(max(dot(N,H),0.0), 40.0) * 0.15;
  vec3 col = mix(body, skyRefl, fresnel);
  col += uSunColor * (spec + spec2);
  // foam
  ...
  // fog
  float d = length(cameraPosition - vWorldPos);
  float f = clamp((d - uFogNear)/(uFogFar-uFogNear), 0.0, 1.0);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>? 
}
```

For a ShaderMaterial, tone mapping isn't applied automatically unless we include the chunks. Actually three.js applies tone mapping in the fragment shader via `#include <tonemapping_fragment>` in built-in materials. For a raw ShaderMaterial, we need to add `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at the end of the shader (they operate on gl_FragColor). The renderer defines tone mapping macros? For ShaderMaterial, the program still includes the tone mapping function definitions? Let me recall: three.js WebGLProgram prepends a bunch of defines and functions including `#include <tonemapping_pars_fragment>` only if the shader includes it. Hmm, the shader chunks are resolved by the renderer for any material (`resolveIncludes` on both vertex and fragment shader). And the tone mapping function definitions come from `tonemapping_pars_fragment` which must be included. Also the renderer's `getToneMappingFunction` is injected in `WebGLProgram` based on `material.toneMapped` and renderer.toneMapping — actually there's `#include <tonemapping_pars_fragment>` in the built-in shaders which uses `TONE_MAPPING` define to pick the function. The renderer adds `#define TONE_MAPPING` and the function body via `getToneMappingFunction` in the prefix when `material.toneMapped` is true? Let me recall WebGLProgram.js:

```js
if ( parameters.toneMapping !== NoToneMapping ) {
  prefixFragment += '#define TONE_MAPPING\n';
  prefixFragment += ShaderChunk[ 'tonemapping_pars_fragment' ];
  prefixFragment += getToneMappingFunction( 'toneMapping', parameters.toneMapping );
  ...
}
```
Yes — three.js injects tone mapping pars into the fragment prefix when toneMapping !== NoToneMapping. Then the shader can call `toneMapping(gl_FragColor.rgb)` via `#include <tonemapping_fragment>`, which is:

```glsl
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```

So including `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` in a ShaderMaterial works (they're resolved by the renderer's include resolver). But note: `tonemapping_fragment` uses `gl_FragColor` — with WebGL2 and GLSL3 it'd be different, but default ShaderMaterial uses GLSL1 with gl_FragColor. Fine.

However, `colorspace_fragment` chunk is named `colorspace_fragment` in newer three versions (r152+). Older: `encodings_fragment`. I'll target recent versions (r160+). I'll include both? Just include `#include <colorspace_fragment>`.

Hmm, risk: if tone mapping include references undefined stuff. It's standard usage; fine. But wait — does the renderer add tone mapping defines for ShaderMaterial? Yes: `parameters.toneMapping` comes from the material's `toneMapped` and renderer.toneMapping... In WebGLPrograms.getParameters: `toneMapping: material.toneMapped ? renderer.toneMapping : NoToneMapping`. ShaderMaterial has `toneMapped = true` by default? Material base has `this.toneMapped = true`. Yes. So it works.

Alternatively, I can just output linear color and let the renderer... no, ShaderMaterial doesn't get post-processing. Including the chunks is the correct approach.

Note also: since three r155ish, `renderer.outputColorSpace = THREE.SRGBColorSpace` is default. The `colorspace_fragment` chunk applies the linear→sRGB conversion. So our shader colors should be defined in linear-ish. Hmm, when we set `new THREE.Color(0x...)` those are converted from sRGB to linear if we use `.convertSRGBToLinear()` or via `THREE.ColorManagement`. With color management enabled (default), `new THREE.Color(hex)` converts to working (linear) space automatically. But if we pass colors as uniforms, we should convert them: `new THREE.Color(0x2a6da8)` in the code will already be in linear space when color management is enabled (THREE.ColorManagement.enabled defaults to true since r152). So passing `color` to the shader uniform gives linear values — good for our shader, which then applies tone map + sRGB encode at the end. And for the sky shader too. 

But careful with `new THREE.Color().setHex(0x..., THREE.SRGBColorSpace)`? Default setHex uses SRGBColorSpace conversion when color management enabled. Yes.

So all colors I define via hex will be linearized automatically. Good, and at the end the shader's tone mapping + colorspace conversion will treat them consistently.

For consistency: use the same approach for the sky dome (ShaderMaterial with tone mapping include).

Now let's think about the sun glow in the water reflection. The `skyColor` function should include the sun disc, so the water gets a nice sun glitter path. But a mirror-perfect reflected sun disc is small (pow(d, 900)) and the water normals vary — with per-pixel normals from vertex interpolation, we'd get a glitter path. Since specular highlight is already added, fine.

Sky function shared GLSL:

```glsl
vec3 skyColor(vec3 dir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.62));
  // horizon haze
  col = mix(col, uSkyHorizon * 1.02, exp(-h * 22.0) * 0.6);
  float d = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * pow(d, 8.0) * 0.18;      // broad glow
  col += uSunColor * pow(d, 90.0) * 0.55;     // tight glow
  col += uSunColor * smoothstep(0.9995, 0.9999, d) * 6.0; // disc
  return col;
}
```
Hmm smoothstep on dot for the disc: dot > 0.9995 corresponds to angle < ~1.8°, which is much larger than the sun's 0.53° (dot 0.99996). Use pow(d, 4000.0)*something for the disc, plus a glow. Let's use: col += uSunColor * pow(d, 2500.0) * 20.0 for a bright disc; with tone mapping it'll clip to white and look like a sun. Fine.

But if uSunDir is used both for sky and the reflection, the direction must point TO the sun.

Now the ocean's normal varies per vertex; reflection of the sky at R gives a nice gradient.

11. Also add clouds? Might improve realism but not required. Optional: add a few billboard-ish cloud puffs (spheres with low opacity)? Risky. Skip, or add subtle procedural clouds in the sky shader using noise — could look bad. Skip; gradient + sun is fine.

12. Also to make it look like a game: add a wake/foam around the boat, maybe a few rocks, a smaller island... Keep focused.

Let me also add distant smaller island? Not required. Maybe skip.

13. Ocean grid: PlaneGeometry(500, 500, 220, 220) → 220x220 ≤ 256. Actually with a 400x400 requirement and camera at 35,12,35, a 500x500 plane with fog far 300 → beyond fog distance, the water is fully fog colored, which may look flat/horizon-like. Hmm, with fog far = 300, everything beyond 300 is pure fog color, which matches the sky horizon color if we set the same. That gives a clean horizon. But a fully fogged plane at the horizon line — the plane's edge at 250 units away is at distance ~250-350 from the camera depending on direction. Setting fog far ~ 340 ensures the far edge blends. Let's use ocean size 480x480 with fog near 70, far 330. Hmm, the island at distance 50 won't be fogged. Good.

Actually the camera looks toward the origin from (35,12,35). The horizon is at y=0 at infinity; with a plane 480 wide, the far edge is ~ (240+35) = 275 in the direction away from camera... The visible edge in the view direction (toward -x,-z) is at distance sqrt(275² + 275²) ≈ 389 from camera in the corner. With fog far 330, corners are fully fog. Edges beyond ~330 fully fogged — good, they blend into the sky horizon color.

Let's make fog near 80, far 340. And fog color = sky horizon color (converted). Good.

Now for the ocean plane, to reduce moiré/aliasing in the distance, a 480x480 with 220 segments gives 2.18 unit quads. Waves of wavelength 8 might alias. Since amplitude of the short wave is small (0.08), fine. Could fade out small waves with distance, but skip.

Ocean as a single mesh with frustumCulled = false? It's centered at origin so it's fine.

Let me now write out the height/wave data consistently between GLSL and TS.

Define waves array in TS:

```ts
type Wave = { dir: [number, number]; amp: number; len: number; omega: number };
const WAVES: Wave[] = [
  { dir: [ 0.94,  0.34], amp: 0.42, len: 46, omega: 1.15 },
  { dir: [-0.26,  0.97], amp: 0.24, len: 26, omega: 1.60 },
  { dir: [ 0.71, -0.71], amp: 0.14, len: 15, omega: 2.10 },
  { dir: [-0.87, -0.50], amp: 0.08, len: 8,  omega: 2.85 },
];
```
Directions normalized. k = 2π/len.

heightAt(x, z, t) = Σ A_i * sin(k_i*(dx*x + dz*z) - omega_i*t).

GLSL needs the same numbers; I'll build the GLSL from the TS array via template strings to guarantee a match. Good idea: generate the wave code from the array. Simpler: hardcode both but be careful. Generating from the array is safer. I'll create a function `wavesGLSL()` that returns declarations.

For the vertex shader, I'll generate code with a loop over a uniform array:

```glsl
uniform vec4 uWaves[4]; // xy = dir, z = k, w = amplitude... need omega too
uniform vec4 uWaves2[4]; // x = omega, y = steepness
```
Simpler: generate constant code (floats) at build time:

```glsl
// wave 0
{
  float k = 0.13659; float A = 0.42; float om = 1.15;
  vec2 D = vec2(0.940, 0.340);
  float ph = k * dot(D, p) - om * t;
  ...
}
```
Generating unrolled code from TS: clean and exact. Let's do that.

I'll write a helper to produce both the displacement/normal vertex code and keep TS in sync with the same table.

Vertex shader (ocean):

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying vec2 vBase; // undisplaced xz

void main() {
  vec2 p = vec2(position.x, position.z);   // geometry rotated so y=0
  vec3 disp = vec3(0.0);
  vec3 tx = vec3(1.0, 0.0, 0.0);
  vec3 tz = vec3(0.0, 0.0, 1.0);
  // for each wave:
  {
     float k = ...; float A = ...; float om = ...; vec2 D = ...; float Q = ...;
     float ph = k * dot(D, p) - om * uTime;
     float s = sin(ph), c = cos(ph);
     disp.x += D.x * A * Q * c;
     disp.z += D.y * A * Q * c;
     disp.y += A * s;
     tx.x -= D.x * D.x * A * Q * k * s;
     tx.z -= D.x * D.y * A * Q * k * s;
     tx.y += D.x * A * k * c;
     tz.x -= D.y * D.x * A * Q * k * s;
     tz.z -= D.y * D.y * A * Q * k * s;
     tz.y += D.y * A * k * c;
  }
  vec3 pos = position + disp;
  vec3 n = normalize(cross(tz, tx));
  ...
}
```
Wait, careful with Q naming: displacement x = D.x * A * Q * cos(ph) where Q is a dimensionless steepness factor (0..1). Derivative dx/dx: d/dx [ D.x*A*Q*cos(ph) ] = -D.x*A*Q*sin(ph)*k*D.x. ✓ as written.

Normal = normalize(cross(tz, tx)) as verified.

Note the plane is at y=0; the geometry rotated -PI/2 so position.y = 0 and position.x/z are the coordinates. After rotateX(-π/2): original (x,y,0) → (x, 0, ...). Let's just build with `new THREE.PlaneGeometry(...)` then `geo.rotateX(-Math.PI/2)`. PlaneGeometry lies in XY with z=0, x∈[-w/2,w/2], y∈[-h/2,h/2]. After rotateX(-π/2): y' = y cos(-90) - z sin(-90) = 0*... let's compute: rotX(θ): y' = y cosθ - z sinθ; z' = y sinθ + z cosθ. θ=-π/2: cos=0, sin=-1. y' = 0*y - (-1)*0 = 0; z' = y*(-1) + 0 = -y. So (x, y, 0) → (x, 0, -y). Good: a plane in XZ with z = -y. Normal (0,0,1) → (0, 1, 0)? rotX(-90) on (0,0,1): y' = 0*0 - 1*(-1) = 1; z' = 0*(-1) + 1*0 = 0 → (0,1,0). ✓ Up.

Since I compute the normal manually, the geometry's normal attribute is unused.

Also note: position.y should be 0. Use `position.xz` in GLSL — actually in GLSL, `position.xz` works on vec3. Fine. But after rotateX, the attribute has y=0 exactly.

14. Sky dome radius: sphere 700 with BackSide, and fog must not affect it (ShaderMaterial default fog false unless set). Also `depthWrite: false`? If depthWrite false and rendered first, other objects draw over it. But the sphere is at radius 700, and the camera far plane must be > 700. Camera far = 2000. Fine. Actually with the sky dome at radius 700 and depthWrite true, objects closer will render in front anyway (depth test). Keep it simple: material.side = BackSide, depthWrite = false, and set renderOrder = -1? With depthWrite false and depth test true, the sky won't occlude anything and will be drawn... If drawn after the ocean, the ocean's depth is closer, so the sky gets rejected — fine. If drawn first, no depth write, ocean draws over it. Either way OK.

Hmm, one issue: with the sky sphere centered at origin, the camera at (35,12,35) is off-center → the "direction" from the camera isn't exactly normalize(worldPos). Use `vDir = normalize(worldPos - cameraPosition)` in the shader — that's exact regardless of the sphere's center. Do that. `cameraPosition` is available in ShaderMaterial (built-in uniform). ✓

Sky sphere: make it follow the camera? Not needed since we use cameraPosition in the calculation.

15. Also, the ocean's sky reflection uses skyColor(R) with R.y clamped ≥ 0. The horizon color for R.y ~ 0 is uSkyHorizon. Since the fog color equals the horizon sky color, the far ocean will blend nicely.

16. The boat: materials — hull white with a colored stripe? Let's use two meshes for the hull: a white hull and a dark blue stripe just above the waterline (another scaled sphere sliver?). Simpler: hull white, deck wood brown, cabin white with wooden windows, mast wood, sail cream.

Let's build:
- hull Mesh (modified sphere) white-ish material (0xf2f0e8), roughness 0.6.
- stripe: a slightly larger sphere clone scaled 1.01 with... no. Skip; instead add a "gunwale" torus? Let's add a thin box along the deck edge? Not needed.

Add:
- deck: BoxGeometry(1.7, 0.12, 3.6) at y=0.25, wood color.
- cabin: BoxGeometry(1.1, 0.7, 1.4) at y=0.62, z=-0.5; white.
- cabin roof: BoxGeometry(1.25, 0.1, 1.55) at y=1.0.
- windows: small dark boxes on the sides of the cabin? Maybe a couple of planes. Keep it: two small boxes of dark glass on cabin sides.
- mast: CylinderGeometry(0.06, 0.09, 3.6) at (0, 1.8, 0.35), wood.
- boom: cylinder rotated to horizontal.
- sail: a curved plane from the mast — attach to the mast at y from 0.9 to 3.4, bulging to -x. Sail mesh positioned with a rotation. Use PlaneGeometry(1.7, 2.3, 10, 12) and bulge vertices along z with sin. Then rotate the sail so it's roughly in the YZ plane? The boat's forward is +Z, so a sail spanning the mast and the stern would be in the YZ plane. For a simple look, put the sail in the YZ plane: geometry in XY plane (x horizontal, y vertical) then rotate Y by π/2 so x→z. Then position at (0, 2.0, -0.3). Bulge along x (the normal direction after rotation) — bulge before rotation along z.

Hmm, this is decorative; simpler: a triangular sail. Let's do a "lateen"-like sail: a triangle from the mast top going down-forward. Use a modified PlaneGeometry with a diagonal cut is complex. Let's just use the rectangular bulged sail as the mainsail — looks fine.

Actually simplest attractive option: a jib-like triangular sail + a boom. I'll do a curved rectangle sail; it reads fine.

Let's also add a tiny flag at the top and maybe a couple of rope lines (cylinders) — skip.

All boat meshes castShadow = true, receiveShadow = true.

17. Palms: 7 palms at positions on the island with radius between 6 and 16, angle spread. Each palm is a Group added to the island group? The island group is exposed as __island and should receive shadows. The palms can be children of the island group. But the leaves InstancedMesh must be a single mesh — it can be added to the scene root (or to the island group) with world-space matrices. I'll compute the instance matrices in world space and add the InstancedMesh directly to the scene (or island group at origin with no transform — since the island group is at the origin with no rotation, it's the same). To be safe, add the leaves mesh to the scene root, and compute matrices in world space.

Trunks: create per-palm TubeGeometry along a curve from the base (x, h, z) upward with a lean and curve. Add to scene. Trunk mesh castShadow, and the island receives.

Coconut clusters: small spheres at the crown — add to the palm group as meshes (7×3 spheres = 21 meshes, fine but might be excessive draw calls; ok).

Palm trunk material: brown (0x6b4f34), roughness 0.9.

Leaves: InstancedMesh with a custom frond geometry, MeshStandardMaterial green (0x2e7d32 or 0x3f8f3a), side DoubleSide, roughness 0.8, maybe flat shading off.

Sway: per-instance, rotate around the palm crown base by a small angle depending on time and instance index, plus bend. Since the frond geometry has its base at the origin extending +X, we can build the matrix as: T(crownPos) * Ry(yaw) * Rz(pitch) * Rx(flutter) * ... plus scale variation.

Note the frond local geometry: to keep it simple, orient the frond along +X with droop in -Y.

Instance matrix composition:
```
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
e.set(0, yaw, pitch + sway, 'YZX')? 
```
Let's build: base rotation = Rz(pitch) applied first (tilting the frond up), then Ry(yaw) around the trunk. Combined matrix = T * Ry(yaw) * Rz(tilt) * Rx(flutter). We can use quaternion multiplication: q = qYaw * qTilt * qFlutter.

Actually the frond's droop is baked into the geometry (y goes down at the tip). A pitch of ~ +0.5 rad (rotate about Z) would lift the tip? Rotation about Z by angle a: point (1,0,0) → (cos a, sin a, 0), so positive a lifts +X. So tilt = +0.45 rad lifts the frond up, and the built-in droop curves it down. Good.

Sway: add a time-dependent delta to tilt: tilt + 0.06*sin(t*1.6 + phase_i) and flutter around X (the frond's local length axis after the previous rotations... hmm). Use a small rotation about the Y axis too for waving. Just do: yaw + 0.05*sin(...), tilt + 0.08*sin(...). Good enough and visibly sways.

Also, the leaves are attached at the crown: crown position = trunk top.

18. Boat wake: a foam ring under the boat? Could add a small "foam" plane? Skip; the wave foam is enough.

Let's now write code.

Structure:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';  // must style? The page has no other HTML — body margin default 8px would cause scrollbars. Set margin 0 and overflow hidden.
```

Also `renderer.domElement.style.display = 'block'`.

Scene, camera, controls.

```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 3000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);
```

OrbitControls:
```ts
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();
```
Careful: OrbitControls with damping requires update() each frame; it won't move on its own. But it will set the camera position based on spherical from the target — since the camera position is (35,12,35) and the target (0,2,0), after update() the position stays. Fine. But `controls.update()` with damping when the user isn't moving does nothing. OK.

Hmm — one risk: OrbitControls imports fine with tsc strict? Yes, it ships types.

Sun direction: elevation 22°, azimuth 40° (measured from +x?). Let's define:
```ts
const sunElevation = THREE.MathUtils.degToRad(24);
const sunAzimuth = THREE.MathUtils.degToRad(35);
const sunDir = new THREE.Vector3(
  Math.cos(sunElevation) * Math.cos(sunAzimuth),
  Math.sin(sunElevation),
  Math.cos(sunElevation) * Math.sin(sunAzimuth)
).normalize();
```
Then the sun is at +x, +z-ish direction, i.e., toward the camera side (camera at +x,+z). Then the sun would be behind the camera... Camera at (35,12,35) looking at origin: view direction is (-0.68,-0.19,-0.68). Sun direction (0.75, 0.4, 0.53) — the sun is behind/above the camera, meaning the water's specular highlight (sun reflection) would be toward the opposite side — visible? For a sun behind the camera, the reflection would be off toward the horizon away from the camera — probably not visible on screen. For a beautiful sun glitter path toward the camera, the sun should be in front of the camera, i.e. around (-x, -z). Let's put the sun at azimuth 235° (i.e., -x,-z) with elevation 20°. Then it's in the view direction, creating a beautiful glitter path and backlit island. With ACES and warm colors, backlit looks gorgeous.

But the sun disc visible in the sky at elevation 20° — in view? Camera looks at origin from (35,12,35) with a 50° FOV; the view direction is down ~ -15°. The sun at 20° elevation in the direction (-0.66, 0.34, -0.66)... The horizontal angle between view dir and sun dir: view horizontal is (-0.707, -0.707); sun horizontal (-0.707,-0.707) — the same! So the sun is dead center horizontally, elevation 20° while the camera's view tilts down 11.3° (from (35,12,35) to (0,2,0): dy=10, horizontal dist = 49.5 → 11.4°). So the sun appears at 31° above the view center; with a vertical FOV of 50°/... vertical FOV = 50°, half = 25°. So the sun would be slightly above the top edge. It'd be near the top of the screen — fine, glowing.

Hmm, but a strong backlit sun could wash out the scene. Let's place the sun a bit off-axis: azimuth such that the horizontal sun dir is at 45° to the view. Let's set the sun horizontal direction at 250°? Let me parametrize the sun on the opposite side with an offset: sun horizontal angle = 225° - 60° = 165°? Let's think in terms of "azimuth" defined as the angle in the XZ plane from +X toward +Z. Camera is at (35,35) → azimuth 45°. View direction is azimuth 225°. For a nice side-back light, choose sun azimuth 200° (i.e. x = cos200 = -0.94, z = sin200 = -0.34) with elevation 28°. Then the sun is to the left-ish behind. The reflection would be visible toward the left of the screen. Good.

Let's use azimuth 205°, elevation 26°.
sunDir = (cos26*cos205, sin26, cos26*sin205) = (0.899*(-0.906), 0.438, 0.899*(-0.423)) = (-0.815, 0.438, -0.380).

Camera horizontal view dir: (-0.707, -0.707). The dot with sun horizontal (-0.895, -0.446) = 0.632+0.315 = 0.947 → 18.8° apart. Nice, the sun is near the center of the view, slightly left, elevation 26° → screen: vertical offset from the view center 26° - 11.4° = 14.6° above center, with a half-FOV of 25° → visible near the top. The sun disc will be visible. Good.

Sunlight color: warm white 0xfff1d6, intensity ~3.0. Hemisphere: sky 0x88bbff, ground 0x4a6b6a? Actually a warm sand bounce: ground 0x6b5a3a. Intensity 0.55.

Also add ambient 0.15? Not necessary.

Now materials: with ACES tone mapping and Physically-correct-ish lighting (r155+: lights use physical units by default? `useLegacyLights` was removed in r165; intensity is fine).

Let's just tune with reasonable values: directional 2.8, hemisphere 0.6.

Shadow config:
```ts
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const d = 42;
sun.shadow.camera.left = -d; right = d; top = d; bottom = -d;
sun.shadow.camera.near = 1; far = 260;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.06;
sun.position.copy(sunDir).multiplyScalar(110);
sun.target.position.set(0,0,0);
scene.add(sun, sun.target);
```
Shadow camera near/far: the light is at distance 110 from the origin; the shadow camera ortho near/far along the light direction. near = 60, far = 180 to tightly cover. Since the light is at 110 units from the target, set near = 40, far = 200.

19. Island geometry: PlaneGeometry(120, 120, 120, 120)? That's 14k verts, fine. But the island should be a mesh with vertex colors. Actually let's use PlaneGeometry(110,110,110,110) rotated -90° and displace y. Since the region outside the island is underwater (y<0), the water plane at y=0 will cover it. But z-fighting with the water at the edges? The island's underwater parts are below the water surface, hidden by the opaque water. Fine.

But we should avoid the island mesh being visible above water where it shouldn't be... it's fine.

Vertex colors by height and slope:
- y < 0.9 → sand (0xe8d9a8 to 0xd9c48c)
- y between 0.9 and 2.2 → blend sand to grass
- y > 2.2 → grass (0x4e7d3a → 0x6fa04a), higher/steep → rock (0x7a7268)

Also, the island material: MeshStandardMaterial with vertexColors, roughness 0.95, metalness 0.

Add a slight flatShading? No; smooth is better with vertex colors, but for a game look, low-poly flat shading can look great. Let's use flat shading = false but with a coarse grid (110 segments over 110 units → 1 unit per quad). Use `flatShading: true` for a stylized look? The requirement says realistic. Smooth shading with noise-based heights.

Hmm, the island: since water covers the below-water part, we don't need an underwater floor.

Compute normals after displacement: geometry.computeVertexNormals().

Sand/grass transitions: also add a beach ring around the waterline.

20. Foam near the island shore: let's add it in the water shader based on distance to the island center with a wavy coastline radius, plus the wave height. Simple.

Let's now write shaders.

Shared sky GLSL (a function that takes dir and the uniforms). I'll define the uniforms in each material separately but with identical values.

```ts
const SKY_UNIFORMS_DECL = `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
vec3 skyColor(vec3 dir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.7));
  col = mix(col, uSkyHorizon, exp(-h * 18.0) * 0.5);
  float d = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * pow(d, 6.0) * 0.14;
  col += uSunColor * pow(d, 60.0) * 0.35;
  col += uSunColor * pow(d, 900.0) * 2.5;   // tighter glow
  col += uSunColor * pow(d, 8000.0) * 30.0; // disc
  return col;
}
`;
```

Hmm, with pow(d, 8000) the disc has an angular radius of about sqrt(2*ln(...)) ... d = cos θ ≈ 1 - θ²/2; d^8000 = e^{-8000θ²/2} = e^{-4000θ²}. Half-max at θ = sqrt(ln2/4000) = 0.0132 rad = 0.75°. The sun's real radius is 0.27°; 0.75° is a bit big but fine. Scale: multiplied by 30 → very bright white core.

For the disc, careful with the reflected sky in the water: pow(d,8000) is extremely sensitive to the normal → severe aliasing. But since we only add it as a highlight, aliasing shows as sparkle. The specular highlight is computed separately anyway. Maybe drop the ultra-sharp disc from the water reflection... The shared function includes it; the water reflection near the sun direction could alias. It'll look like glitter — acceptable, actually pretty. But it might be noisy sparkles when moving. With a static camera, no shimmer; with orbit it might. It's fine.

Let's keep the disc term but reduce to pow(d, 3000.0) * 12.0.

Ocean shader.

Vertex:

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vDisp;
varying vec2 vBase;

void main() {
  vec2 p = position.xz;
  vec3 disp = vec3(0.0);
  vec3 tx = vec3(1.0, 0.0, 0.0);
  vec3 tz = vec3(0.0, 0.0, 1.0);
  ... generated ...
  vec3 wp = position + disp;
  vWorldPos = (modelMatrix * vec4(wp, 1.0)).xyz;
  vNormalW = normalize(cross(tz, tx));
  vDisp = disp.y;
  vBase = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
```
Since the mesh is at the origin with no transform, modelMatrix is identity. But use modelMatrix for safety.

Note: the normal from cross() is in object space = world space here.

Fragment:

```glsl
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAmpSum;
varying ...

// cheap hash noise
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }

void main(){
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormalW);
  // detail normal from small ripples (procedural, view-distance faded)
  ...
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 refl = skyColor(normalize(R));
  // body
  float distIsland = length(vWorldPos.xz);
  float shallowness = 1.0 - smoothstep(12.0, 32.0, distIsland);
  vec3 body = mix(uDeepColor, uShallowColor, shallowness * 0.85);
  // sun diffuse-ish scatter
  vec3 col = mix(body, refl, fres);
  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  col += uSunColor * pow(ndh, 220.0) * 1.6;
  col += uSunColor * pow(ndh, 24.0) * 0.06;
  // foam
  float hn = clamp(vDisp / uAmpSum * 0.5 + 0.5, 0.0, 1.0);
  float crestN = vnoise(vBase * 1.7 + vec2(uTime*0.6));
  float foamCrest = smoothstep(0.78, 0.97, hn) * smoothstep(0.35, 0.75, crestN) * 0.9;
  // shore foam
  float shoreN = vnoise(vBase * 1.6 - vec2(uTime * 0.4));
  float pulse = 0.5 + 0.5 * sin(uTime * 1.6 - distIsland * 1.2);
  float shoreBand = smoothstep(24.0, 20.0, distIsland + 1.5*sin(atan(vBase.y,vBase.x)*3.0)) * smoothstep(0.0, 0.5, pulse*0.6+0.4);
  float foam = clamp(foamCrest + shoreBand * 0.7 * smoothstep(14.0, 21.0, distIsland), 0.0, 1.0);
  ...
}
```
Hmm this is getting complicated. Let me simplify the shore foam: the island's waterline radius is roughly constant (r≈18-19 due to the dome). Foam should be a band within ~2 units of the shoreline, pulsing. Use:
```
float shoreFoam = 1.0 - smoothstep(0.0, 2.2, abs(distIsland - 18.0 - 1.0*sin(atan(z,x)*4.0 + uTime*0.8)));
shoreFoam *= 0.5 + 0.5*sin(uTime*2.0 - distIsland*2.5);
```
That gives a wavy band. Multiply by a noise for texture. Fine, and only apply at close range (the water covers everywhere, but the island hides the underwater part).

Actually since the island mesh rises above water, foam at the waterline where the water meets the sand would be visible only near the shore. Our band radius ~18-19 must match the island's waterline. But the island is not a perfect circle — using the actual island height function would be better: foam if islandHeight ≈ 0. But the shader doesn't know the island's height function. Since the island mesh is drawn over the water, foam near the shoreline radius is fine if it roughly matches. We can just use a radius band with an angular modulation to mimic the irregular coast. Good enough for a "plus".

Let's set the island's waterline radius ≈ 18.5 (from the height function). I'll compute the exact waterline from the height function to set the foam radius. Since the noise makes it irregular by ±2 units, the foam band will partially overlap the sand — but the sand is drawn above the water, so any foam that is over the sand is not visible (depth test: the foam is at y≈0, the sand at y>0 hides it). Foam that's slightly offshore is visible. So a band from r=18 to r=22 with noise looks like surf. Good enough.

OK. Also, foam should be tinted white and mixed in.

Fog at the end.

21. Now let's write the wave generator.

```ts
interface WaveDef { ax: number; az: number; amp: number; len: number; om: number; q: number; }

const WAVES: WaveDef[] = [
  { ax: 0.94, az: 0.34, amp: 0.42, len: 46, om: 1.15, q: 0.55 },
  { ax: -0.26, az: 0.96, amp: 0.24, len: 27, om: 1.55, q: 0.5 },
  { ax: 0.71, az: -0.71, amp: 0.14, len: 16, om: 2.05, q: 0.45 },
  { ax: -0.87, az: -0.5, amp: 0.08, len: 9, om: 2.95, q: 0.4 },
];
```
Normalize (ax,az) in the generator and compute k = 2π/len.

Amplitude sum = 0.88 → peak-to-trough 1.76 ✓.

heightAt:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    h += w.amp * Math.sin(k * (w.ax * x + w.az * z) - w.om * t);
  }
  return h;
}
```
With normalized (ax, az).

GLSL generation:

```ts
function wavesGLSL(): string {
  return WAVES.map(w => {
    const k = (Math.PI * 2) / w.len;
    const L = Math.hypot(w.ax, w.az);
    const dx = w.ax / L, dz = w.az / L;
    return `
  {
    float k = ${k.toFixed(8)};
    float A = ${w.amp.toFixed(8)};
    float om = ${w.om.toFixed(8)};
    float Q = ${w.q.toFixed(8)};
    vec2 D = vec2(${dx.toFixed(8)}, ${dz.toFixed(8)});
    float ph = k * dot(D, p) - om * uTime;
    float s = sin(ph);
    float c = cos(ph);
    disp.y += A * s;
    disp.x += D.x * A * Q * c;
    disp.z += D.y * A * Q * c;
    tx.x -= D.x * D.x * A * Q * k * s;
    tx.z -= D.x * D.y * A * Q * k * s;
    tx.y += D.x * A * k * c;
    tz.x -= D.y * D.x * A * Q * k * s;
    tz.z -= D.y * D.y * A * Q * k * s;
    tz.y += D.y * A * k * c;
  }`;
  }).join('\n');
}
```

Wait: tx.x derivative of disp.x w.r.t. x: disp.x = Σ D.x*A*Q*cos(ph), d/dx = -D.x*A*Q*sin(ph)*k*D.x ✓. tx.y = d(disp.y)/dx = A*k*D.x*cos(ph) ✓. Good, and my code has tx.y += D.x * A * k * c ✓.

Normal check with a flat case: tx = (1,0,0)+..., tz=(0,0,1)+... cross(tz,tx) = (tz.y*tx.z - tz.z*tx.y, tz.z*tx.x - tz.x*tx.z, tz.x*tx.y - tz.y*tx.x). With flat: (0*0-1*0, 1*1-0*0, 0*0-0*1)=(0,1,0) ✓.

22. Water time: `const oceanTime = { t: 0 }`. Each frame, t += dt. The shader uniform uTime = t. `__ocean.time()` returns t.

Important: motion must use delta time. Yes.

To make waves stable, clamp dt to e.g. 0.05.

23. The boat bobbing must use the same wave time as the shader for the current frame. Since we update the uniform and then use t for heightAt in the same frame, they match.

24. Also, the sail should be a nice curved shape. And add a subtle flag waving? Not needed.

25. Now let's write the island height function with value noise.

```ts
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  const a = hash2(ix, iy), b = hash2(ix+1, iy), c = hash2(ix, iy+1), d = hash2(ix+1, iy+1);
  return (a + (b-a)*ux) + ((c + (d-c)*ux) - (a + (b-a)*ux)) * uy;
}
function fbm(x: number, y: number): number {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { v += amp * valueNoise(x*f, y*f); f *= 2.03; amp *= 0.5; }
  return v; // ~0..1
}
```

Island height:
```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const dome = Math.max(0, 1 - r / 27);
  const dn = Math.pow(dome, 1.4);
  let h = 11.0 * dn;
  h += 3.2 * (fbm(x * 0.045 + 5.2, z * 0.045 + 1.7) - 0.5) * Math.pow(dome, 0.8);
  h += 1.1 * (fbm(x * 0.13, z * 0.13) - 0.5) * dome;
  h -= 2.2;
  return h;
}
```
At r=0: dome=1, h = 11 + 3.2*(fbm-0.5) + 1.1*(...) - 2.2 ≈ 8.8 ± 1.8 → peak ~8-10 ✓ (5-15).

Waterline: where h=0 → dn ≈ 2.2/11 = 0.2 → dome = 0.2^(1/1.4) = 0.316 → r = 27*0.684 = 18.5 ✓ (diameter ~37) ✓.

Hmm, plus noise variations. Good.

The peak: maybe add a bit more variation so the peak is off-center. Add a shift: use x-3 in the dome calculation? Let's offset the dome center slightly: use r = hypot(x*0.95 + 2, z + 1)... Keep it centered per requirement ("centered on the origin"). Use slight asymmetry via noise only.

Vertex colors: 
```ts
const sand = new THREE.Color(0xe3d2a3);
const wetSand = new THREE.Color(0xcdb98a);
const grass = new THREE.Color(0x4f8a3d);
const grassDark = new THREE.Color(0x35652c);
const rock = new THREE.Color(0x8a8272);
```
Blend:
- y < 0.6: wetSand→sand
- 0.6..1.8: sand → grass mix
- above: grass with noise variation, rock if slope steep or y > 7.

Compute slope from the height difference? We can compute per-vertex normal after building and use the normal's y to detect steepness. Easier: compute the analytic-ish slope by sampling neighboring heights in the color pass. Since we displace the vertices in a loop, we can compute the height gradient by finite differences using islandHeight.

Let's do a straightforward approach: in the loop over vertices, compute h = islandHeight(x,z); set y = h; compute dh/dx and dh/dz via ±0.6 offsets; slope = sqrt(gx²+gz²); then color.

Then after setting positions, computeVertexNormals().

Island geometry: PlaneGeometry(110, 110, 128, 128) has 129² = 16,641 vertices; computing islandHeight 3 times per vertex = 50k evaluations of fbm with 4 octaves ≈ ok (a few ms).

Use 110 size with 128 segments → 0.86 units per quad. Good detail.

Since only the island (radius < 25) matters, most of the 110×110 plane is underwater — wasteful but fine. Could use 80x80. Let's use 80x80 with 120 segments (0.67 units/quad). Waterline at r≈18.5, so 80 covers up to r=40. Good.

26. Now, shadow-receiving on the island and the boat. Ocean: castShadow? No (expensive and pointless). Ocean receiveShadow? With a custom ShaderMaterial, receiving shadows requires shadow map code — skip; instead, the boat's shadow on the water is missing. Not required ("Its meshes cast shadows" — the boat must cast shadows; the island receives shadows). So the boat's shadow will land on the island if near. Fine. Actually, it'd be nice for the boat to have a shadow on the water, but implementing shadow reception in the custom water shader is complex. Skip.

Hmm, but the boat casts a shadow onto... nothing nearby. The requirement only asks for casts. Fine.

27. Extra visual polish: 
- Add a few rocks near the island (icosahedron geometry, scaled) — 4-6 meshes.
- Add a small wooden dock? Adds complexity. Skip.
- Add seagulls? Skip.
- Add clouds: maybe some soft flat cloud spheres? Could look bad. Skip.

Let's add a few rocks poking out of the water + on the island for detail. Cheap and improves the look.

Also, add a subtle "sun glitter" ... already have.

28. Post-processing? Not needed and adds complexity. Skip.

29. Now write the boat builder in detail.

```ts
function makeHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 28, 18);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // z in [-1,1] along the length; bow at +z
    const t = v.z; // -1..1
    // width taper: narrower toward the bow
    const taper = 1 - 0.45 * Math.max(0, t) ** 2 - 0.15 * Math.max(0, -t) ** 2;
    v.x *= taper;
    // flatten the bottom
    if (v.y < 0) v.y *= 0.65;
    // raise the deck line (clamp top)
    if (v.y > 0.55) v.y = 0.55 + (v.y - 0.55) * 0.25;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
```
The hull length: scale by (0.95, 0.75, 2.1) → length 4.2 ✓ about 4 units long. Width 1.9, height ~1.2 (from -0.75 to +0.41+). Hmm, the top clamp at 0.55*0.75 = 0.41. The deck at y=0.38 maybe. Let's scale the hull by (0.95, 0.8, 2.05) and add a deck box at y=0.33.

Boat group origin at the waterline. Hull center at y=0.2, so the hull spans y from 0.2-0.8*0.65 = 0.2-0.52 = -0.32 to 0.2+0.44=0.64. Hmm, I want the hull bottom around -0.35 and the deck around +0.6.

Let me define: hull mesh position y = 0.25, scale (0.95, 0.8, 2.05). The sphere's local y ∈ [-0.65, 0.55] after modification (bottom flattened to -0.65, top clamped to 0.55+...). Actually after the modification, the top: for y>0.55, y = 0.55 + (y-0.55)*0.25, so max y = 0.55 + 0.45*0.25 = 0.6625. The bottom min = -0.65. So the world hull spans 0.25-0.52= -0.27 to 0.25+0.53 = 0.78. Waterline at y=0 → the hull extends 0.27 below the water. Good.

Deck: BoxGeometry(1.25, 0.1, 2.6) at y=0.72? The hull top at 0.78; the deck should be at ~0.72 inside the hull rim. Since the hull's top surface is rounded, a flat deck at y=0.72 with a width of 1.25 (the hull width at the top is ~0.95*taper*? ) Hmm, the hull's max x at y≈0.66 is 0.95 * taper * sqrt(1-...) — the sphere cross-section at the top is small. The deck may poke out. Let's just place a deck box of width 1.3 and length 2.9 at y = 0.55 and let it intersect the hull. Should look acceptable.

Boat visual: hull white, deck wood, cabin with windows, mast, boom, sail.

The mast at z=0.3, height 3.2 from y=0.7 → top at ~3.9. Boat total height ~4; a bit tall relative to a 4-unit length, but that's fine for a sailboat.

Sail: PlaneGeometry(1.9, 2.4, 12, 16), bulged. Position at (0, 2.2, -0.35) rotated Y by -π/2 → the plane originally spans x∈[-0.95,0.95], y∈[-1.2,1.2] in the XY plane with z=0. After rotating by -π/2 about Y: x→ -z... Let's compute: RotY(a): x' = x cos a + z sin a; z' = -x sin a + z cos a. For a=-π/2: cos=0, sin=-1. x' = -z; z' = x. So the plane's x-axis maps to the +z axis. Good: the sail spans z∈[-0.95,0.95], y∈[-1.2,1.2] at x=0. The bulge (originally in z) maps to x' = -z_bulge. So a positive bulge in z becomes a negative x. Fine.

Position: mast at z=0.3; the sail should hang from the mast toward the stern (z from 0.3 to -1.6). So the center at z ≈ -0.6, and its width along z is 1.9 → z from -1.55 to 0.35 ✓. Position the sail at (0, 2.1, -0.6).

Boom: CylinderGeometry(0.05,0.05, 2.0) rotated 90° about X to lie along z, at (0, 0.95, -0.6)? The sail bottom is at 2.1-1.2=0.9 ✓.

The sail should be double-sided and slightly translucent? Use MeshStandardMaterial, side: DoubleSide, color 0xf7f3e6, roughness 0.9.

Ropes: skip.

Add a small flag at the masthead: a tiny triangle plane, red. Nice detail.

30. Boat drift: the boat should stay within 25 units of the origin. Base (12,14), drift amplitude 2.5 and 2. Keep max radius: 14.5² + 16² ≈ 210+256=466 → sqrt = 21.6 ✓.

Boat orientation: add a slight yaw with time: rotation.y = 0.25*sin(t*0.13) maybe. Since the pitch/roll are set each frame, we need to combine rotations. Use `boat.rotation.set(pitch, yaw, roll)` with order 'YXZ'? Set boat.rotation.order = 'YXZ' so yaw is applied first. Fine.

Careful: with the rotation order YXZ, rotation.x (pitch) and rotation.z (roll) are applied after yaw. Good enough.

Actually, `Object3D.rotation` uses Euler with the default order XYZ. Set `boat.rotation.order = 'YXZ'`.

31. Leave matrices. Build the palm data:

```ts
interface Palm { base: THREE.Vector3; crown: THREE.Vector3; lean: number; }
```

For each palm i:
- angle a = i*2π/7 + 0.35 (fixed pattern), radius = 6 + (i%3)*4.
- x = cos(a)*radius, z = sin(a)*radius, groundY = islandHeight(x,z).
- height = 4.5..6.5.
- lean direction (toward the outside: away from the center) — palm trunk curves outward.
- Build a curve from base to top with a control point offset.
- Trunk: TubeGeometry(curve, 8, radius, 6, false) with a tapered radius? TubeGeometry has a constant radius. Use 0.22 constant, then scale? Simpler: use a TubeGeometry with radius 0.2 and additionally a tapered cylinder... Let's just use TubeGeometry with radius 0.2 and taper by scaling the mesh? No. Constant radius trunk is fine, but palm trunks taper. Alternative: use a custom approach: a CylinderGeometry bent by moving vertices. Hmm.

Simplest: build a trunk from 3 stacked CylinderGeometry segments with decreasing radii, each rotated, but the curve is smoother with a TubeGeometry.

Let's use TubeGeometry with radial segments 7 and tubular segments 12 — it looks smooth. Constant radius is acceptable for a stylized palm. Add a slight scale taper by modifying the tube geometry's vertices? Not trivial.

Use `new THREE.TubeGeometry(curve, 12, 0.22, 7, false)` and then apply a taper to the geometry vertices relative to the curve? We could modify the vertex positions radially around the curve — complex.

Alternative: build a LatheGeometry? No.

Honestly, a constant-radius trunk looks fine. But let's make the trunk look tapered by adding a cone at the top? Meh. Constant radius with radius 0.18 is fine.

Trunk curve:
```ts
const base = new THREE.Vector3(x, y, z);
const dirOut = new THREE.Vector2(cos(a), sin(a));  // outward
const h = 5 + (i % 3) * 0.7;
const top = new THREE.Vector3(x + dirOut.x * 1.6, y + h, z + dirOut.y * 1.6);
const mid = new THREE.Vector3(x + dirOut.x * 0.35, y + h * 0.55, z + dirOut.y * 0.35);
const curve = new THREE.QuadraticBezierCurve3(base, mid, top); // hmm: for a bend, the control point should be more outward
```
For a curved trunk leaning outward: base at (x,y,z), control at (x + dx*0.4, y + h*0.6, z + dz*0.4), top at (x + dx*1.8, y + h, z + dz*1.8). The QuadraticBezier gives a nice curve. Good.

Crown position = top + a bit (the trunk top). The crown center = top (the tube's end).

Leaves: 8 per palm, radius 0.8 from the crown (leaves start at the crown, base at the trunk top).

Instance transform: position = crown, orientation yaw = leafAngle + sway, tilt.

Leaf colors: vary by instance using setColorAt with slight hue variation.

Trunk casts a shadow; leaves cast shadows too (InstancedMesh supports castShadow).

32. Let's also add a small "rock" mesh on the island and a couple of rocks in the water near the shore.

Also add a bird? No.

33. Renderer color: scene.background = null; the sky dome covers everything. But if some pixels aren't covered (they will be, being a full dome), set scene.background = fogColor? Set scene.background = new THREE.Color(fogColorHex) as a fallback — but the sky dome covers the whole view. Set scene.background = null; fine. Actually, setting background to a color is safer. But then the sky dome draws on top anyway. Let's set `scene.background = new THREE.Color(0x9fc3dd)`.

Hmm, careful: with a sky dome, the background is invisible. Fine.

34. Ocean size: PlaneGeometry(520, 520, 220, 220). 220*220*2 = 96,800 triangles. Fine. The requirement says at least 400×400. 520 ✓. Segments ≤ 256 ✓.

Actually 220x220 = 48,841 vertices — okay.

Hmm, for a smoother horizon and less distortion, use a radial grid? Not needed.

35. Also we need the ocean to extend beyond the fog far distance so no edge is visible. Fog far = 340. The plane extends 260 in each direction from the origin; from the camera at (35,12,35), the far edge along the view direction is at ~(260+35)*sqrt(2)? No: the camera at (35,35) looking toward (-x,-z). The plane's edge in that direction is at x=-260, z=-260, which is at horizontal distance sqrt(295² + 295²) = 417 from the camera. Fully fogged (>340) ✓. But in other directions, e.g., looking toward +x: the edge at x=260 is 225 units away → fog factor (225-80)/260 = 0.56 — not fully fogged, so we'd see an edge (the plane ends and the sky shows) at a visible distance when looking sideways. But the camera looks toward the origin and the horizontal FOV is ~ 50°*aspect... With aspect 1.7, the horizontal FOV ≈ 77°. The view direction is (-0.707,-0.707) horizontally; the edge directions at ±38° from that. The plane's edge distance in those directions: in the worst case the ray from (35,35) at 38° off the diagonal toward +x... e.g., direction (-0.3, -0.95) → hits z=-260 at t = 295/0.95 = 310 (and x = 35-93 = -58, inside) → distance 310 < 340 → not fully fogged but close (fog factor (310-80)/260=0.88). Slight visible edge? It's at 88% fog. Might be slightly noticeable but acceptable. Let's increase the ocean to 700×700 with fog far 320? Or set fog near 60, far 300 → then the far edge at 310 is fully fogged. Everything beyond 300 is the fog color = horizon color → seamless horizon. But the camera is at 50 distance from the island; the island would be barely fogged (0 at 60). Boat at 34 → no fog. Good.

Let's use fog near = 70, far = 300. Then the ocean needs to extend at least 300 from the camera in all visible directions: from (35,35), the required half-size is 35 + 300 = 335 in the worst case. So the ocean should be ~700×700 to guarantee the horizon is fully fogged everywhere. But a 700×700 plane with 220 segments → 3.2 units/quad, losing wave detail near the boat. Better: keep the ocean 500x500 (still ≥ 400) and accept a 0.85-1.0 fog factor at the edges. Actually, that's fine — the fog factor reaches ~0.9, and the remaining difference between the water color and the fog color at 90% blend is small. With fog far=300 and near=60, the edge at ~310-420 → mostly ≥1.0. Let's use ocean 600×600 with 240 segments (2.5 units/quad, still fine for waves with wavelengths 9-46; the 9-unit wave is undersampled by 3.6 samples/wave → aliasing. Hmm.

Let's reduce to 3 waves? No, at least 3. We could fade out the shortest wave with distance and only use it near the camera. Actually, aliasing of a small-amplitude wave on a 2.5-unit grid produces a low-frequency moiré that could look bad. Since the 4th wave has an amplitude of 0.08, the aliased artifact amplitude is small, and the water is mostly specular/reflection, so maybe it's acceptable. To be safe, let's drop the shortest wave's amplitude to 0.06 and its wavelength to 11 → 4.4 samples per wave. Or just keep 4 waves with the shortest being 12 units: with 2.5-unit quads → 4.8 samples per wavelength — acceptable.

Let's set: 46, 27, 17, 11 with amplitudes 0.42, 0.24, 0.14, 0.07 and use the ocean at 600x600 with 240 segments → 2.5 units/quad; the 11-unit wave gets 4.4 samples — meh but okay given the tiny amplitude.

Alternatively make the ocean 500×500 with 250 segments → 2 units/quad, and fog far 260. From the camera at 50 from the origin, edges are at 250-35=215 minimum distance in some directions... no. Let's compute: with a 500×500 plane (half=250), from (35,35), the minimum distance to the plane boundary along a view ray in the -x,-z direction: the boundary at x=-250 → distance 285/cos... In the diagonal direction, the corner is at distance sqrt(285²+285²)=403. In the sideways direction (+x), the boundary is at x=250, 215 units away. But is the +x direction visible? The camera's horizontal FOV covers 38° around the -x,-z direction. The direction of a boundary point at +x is behind the camera — not visible. The visible horizontal directions span from (-0.707±0.66)... roughly angles from 180°-42°... let me think in world azimuth: the view direction is 225° (using the convention where 0°=+x, 90°=+z). The horizontal half-FOV = 38.5°, so the visible azimuths are 186.5° to 263.5°. In these directions, the distance to the plane boundary: for azimuth θ, the ray from (35,35) with direction (cos θ, sin θ). For θ=186.5°: direction (-0.993, -0.113). It hits x=-250 at t = 285/0.993 = 287. For θ=263.5°: direction (-0.113, -0.993) → hits z=-250 at t = 285/0.993 = 287. For θ=225°: hits the corner at t=403. So the minimum visible edge distance is ~287. With fog far=300, the edges at 287 are 97% fogged. 

So: ocean 500×500, segments 250 (2 units per quad), fog near 60, far 300. Hmm, 250x250 = 62,500 vertices; fine. Actually, wait: the fog factor at 287 is (287-60)/240 = 0.945. Combined with the ocean color being close to the horizon color at the far distance... The sky right above the horizon has the horizon color; the ocean at 94.5% fog is nearly the fog color. So the seam is subtle. Good.

Let's use fog near 70, far 300 → at 287, factor 0.94. OK.

Let's pick: Ocean geometry 500×500, 250×250 segments. Hmm, 250 might slow a mid-range GPU with a heavy fragment shader? The vertex count is 63k with ~4 wave computations in the vertex shader — negligible. The fragment shader cost dominates; the ocean covers much of the screen. Keep the fragment shader moderate.

Actually, maybe use 200×200 segments (2.5 units) for performance. Requirement ≤256. Let's do 220×220. 2.27 units per quad. Fine.

36. Let me write the sky dome radius 1200, camera far 2500. Fog doesn't affect the sky (ShaderMaterial fog: false by default).

37. The sun light's shadow camera covers the island (radius ~25) and the boat at (12,14). So a half-size of 45 covers everything: left/right/top/bottom = ±48. Shadow map 2048 → ~4.7 cm per texel? 96/2048 = 0.047 units/texel. Good.

38. Now, the code for the leaves InstancedMesh update every frame:

```ts
const dummy = new THREE.Matrix4();
const qYaw = new THREE.Quaternion();
const qTilt = new THREE.Quaternion();
const qRoll = new THREE.Quaternion();
const eul = new THREE.Euler();
...
function updateLeaves(t: number) {
  const wind = 0.10 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3 + 1.7);
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway = Math.sin(t * 1.7 + d.phase) * 0.09 + wind * 0.5;
    eul.set(sway * 0.6, d.angle + sway * 0.35, d.tilt + sway, 'YXZ');  // hmm
    // Actually build with quaternions:
    qYaw.setFromAxisAngle(UP, d.angle + sway * 0.5);
    qTilt.setFromAxisAngle(Z_AXIS?, ...)
  }
}
```
Careful: the tilt should be applied before yaw in world space. Compose: M = T * R_yaw * R_tilt * R_flutter? The flutter should be about the frond's own axis; since the frond lies along +X after tilt, a rotation about the X axis (in the local frame) rotates the frond's plane. That's the flutter.

Order: first tilt about Z, then flutter about X, then yaw about Y. So the matrix = Ry(yaw) * Rz(tilt) * Rx(flutter). But note Rz and Rx are in the frame after... Matrix composition: M = Ry * Rz * Rx applied to the local vector. So a local point p: first Rx (flutter about X, which is the frond's length axis — this rotates the leaf plane about itself: good, that's the flutter/twist), then Rz (tilt), then Ry (yaw). Yes, this is what we want.

Using quaternions: q = qYaw.multiply(qTilt).multiply(qFlutter). Then matrix.compose(position, q, scale).

Also add a slight scale variation per leaf: scale (1, 1, 1) mostly.

Position: the crown position, possibly with a small offset in the direction of the frond: crown + (dir_yaw * 0.25). Fine, use the crown directly.

Use `dummy.makeRotationFromQuaternion(q)` then `dummy.setPosition(crown)`, then `dummy.scale(...)`? Note that Matrix4.compose(position, quaternion, scale) is the cleanest. Let me precreate position and scale vectors.

39. Instance count: 7 palms × 8 leaves = 56 ≥ 30 ✓.

40. Now, let's write everything and be careful about TypeScript strictness: no implicit any, all types.

Let me also handle `window as any` assignments.

Let's write the code.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

Renderer setup:

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
```

Scene:

```ts
const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0x9db8cf); // will be linear
scene.fog = new THREE.Fog(FOG_COLOR, 70, 300);
```
Hmm, with an atmospheric sky, the fog color should match the horizon. Let's set the sky horizon = 0xb9d2e4 and the fog = the same-ish but slightly darker: 0xa9c4d8. Let's just use 0xa8c4d8 for both, and the sky horizon color = the same 0xa8c4d8. Then the fogged ocean blends with the horizon color.

But wait: the sky at the horizon in the shader uses tone mapping; the fog color is also tone-mapped (standard materials apply tone mapping to the fogged result: fog is mixed in the shader before tone mapping, so the fog color gets tone-mapped too). And in the ocean shader, I mix toward uFogColor before tone mapping. Both tone-mapped equally. But the sky horizon color also gets tone-mapped. So if the fog color = the sky horizon color in linear space, the horizon blends perfectly. ✓

Let me define:
```ts
const SKY_HORIZON_HEX = 0xc3d9e8;  // pale blue
const SKY_ZENITH_HEX = 0x2a6bb0;
```
Wait — the zenith at 8-10k should be a deep blue; with ACES tone mapping and exposure 1.05, a value like 0x2a6bb0 in linear (0.024, 0.15, 0.44) will appear darker after tone mapping. Multiply the sky colors by an intensity factor (e.g., 1.2) in the shader to compensate. Let me use a skyIntensity multiplier of ~1.6 in the shader. Hmm, but the horizon color must match the fog color exactly, and the fog color isn't multiplied. So if I multiply the whole sky color by an intensity, the horizon no longer matches the fog.

Solution: keep the sky gradient un-multiplied (or multiply inside the mix only if both use the same). Let's not multiply. Instead pick brighter colors:
SKY_ZENITH = 0x3a7ec8 (linear ~0.045, 0.22, 0.58) → after ACES it'll look like a medium blue. Real sky zenith is deep blue but the tone mapper darkens saturated colors. Let's test mentally: ACES maps 0.2 linear to about 0.18 → sRGB ~0.46. So a mid blue. OK.

Actually the water reflection uses skyColor too, so consistency matters more.

Let's set:
- uSkyZenith = 0x4a90d9 → linear (0.07,0.28,0.68)
- uSkyHorizon = 0xbfd8ea → linear (0.5,0.67,0.82)
Hmm, that's a fairly bright horizon. The fog color = 0xbfd8ea. After ACES tone mapping with exposure 1.05, 0.5 linear → ~0.42 → sRGB ~0.68. Sounds reasonable for a hazy horizon.

Sun color: 0xfff0d0, and in the shader we multiply the disc by 30 etc.

Let me also add a warm glow near the horizon around the sun: add `uSunColor * pow(d, 4.0) * 0.25` for a warm cast.

41. Hemisphere light colors: sky 0x9fc4e8, ground 0x6b5b3e, intensity 0.7. Directional light color 0xfff2dc, intensity 2.6.

With ACES tone mapping, the sand lit by 2.6 directional + 0.7 hemisphere → a diffuse albedo of ~0.8*2.6/π? In three.js, MeshStandardMaterial with a directional light of intensity I gives radiance = albedo * I * NdotL / π? Actually three's physical lights: for a directional light, the irradiance = color * intensity; the diffuse BRDF = albedo/π; so the outgoing radiance = albedo/π * intensity * NdotL. With intensity 2.6 → 2.6/π = 0.83 * albedo * NdotL. So a white surface directly facing the light gives 0.83 linear → tone-mapped to ~0.55 sRGB. Good, bright but not blown out. Maybe intensity 3.0.

Let's use directional intensity 3.2 and hemisphere 0.8. Then a white surface facing the sun: 3.2/π = 1.02 → tone mapped ~0.65. Nice.

42. Now the ocean vertex shader with 220 segments; the plane is 500×500 → each quad is 2.27 units.

43. Let's write the island vertex colors precisely.

```ts
function buildIsland(): THREE.Group {
  const grp = new THREE.Group();
  const geo = new THREE.PlaneGeometry(90, 90, 130, 130);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cSandDry = new THREE.Color(0xeadcae);
  const cSandWet = new THREE.Color(0xc9b78d);
  const cGrass = new THREE.Color(0x4d8a3a);
  const cGrass2 = new THREE.Color(0x376d2c);
  const cRock = new THREE.Color(0x8b8578);
  ...
}
```

For each vertex: x = pos.getX(i), z = pos.getZ(i), h = islandHeight(x,z); pos.setY(i, h).

Compute the slope: 
```ts
const e = 0.75;
const hx = (islandHeight(x+e, z) - islandHeight(x-e, z)) / (2*e);
const hz = (islandHeight(x, z+e) - islandHeight(x, z-e)) / (2*e);
const slope = Math.hypot(hx, hz);
```
3 extra evaluations per vertex → 4 total × 17k = 68k fbm calls × 4 octaves = 270k noise evals — fast enough (a few ms).

Color logic:
```ts
const t = THREE.MathUtils.clamp((h + 0.4) / 1.2, 0, 1); // 0 at underwater, 1 above the waterline+0.8
let c = cSandWet.clone().lerp(cSandDry, t);
// grass above 1.4
const g = THREE.MathUtils.smoothstep(h, 1.2, 2.6);  // note THREE.MathUtils.smoothstep(x, min, max)
c.lerp(cGrass.clone().lerp(cGrass2, fbm(x*0.2, z*0.2)), g * (1 - rockFactor));
// rock on steep slopes or high
const rockFactor = THREE.MathUtils.clamp((slope - 0.75) * 1.6, 0, 1) * THREE.MathUtils.smoothstep(h, 1.5, 4.0) + THREE.MathUtils.smoothstep(h, 6.5, 9.0);
c.lerp(cRock, clamp(rockFactor,0,1) * 0.85);
```
THREE.MathUtils.smoothstep(x, min, max) exists ✓ (signature: smoothstep(x, min, max)).

Set colors: colors[i*3] = c.r ... Note: c.r etc. are in linear space if color management is on (since `new THREE.Color(hex)` converts). For vertex colors, three.js expects linear (the attribute is used directly in linear space). ✓ So assigning c.r directly is correct.

Material: `new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 })`.

Also, since the island geometry spans 90×90 with 130 segments, that's 131² = 17,161 vertices.

After displacement, `geo.computeVertexNormals()`.

Then `const islandMesh = new THREE.Mesh(geo, mat); islandMesh.receiveShadow = true; islandMesh.castShadow = true;` (cast so it shadows the water? no shadow reception on water. But cast for the palms.)

grp.add(islandMesh).

44. Rocks: create a few IcosahedronGeometry(1,0) meshes with random-ish scales positioned near the shore and on the island, using deterministic positions. Add them to the island group, cast/receive shadows.

Let's add 6 rocks at various angles/radii on the island, plus 3 in the water near the shore.

45. Palms: created in buildPalms() → returns the trunk group + the leaf InstancedMesh + leafData.

Let me write it:

```ts
interface LeafInstance { pos: THREE.Vector3; yaw: number; tilt: number; phase: number; scale: number; }

const leavesData: LeafInstance[] = [];

function buildPalms(): { group: THREE.Group; leaves: THREE.InstancedMesh } {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.95, metalness: 0 });
  const palmCount = 7;
  const leafGeo = makeFrondGeometry();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f3f, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palmCount * 8);
  ...
}
```
Wait: InstancedMesh count must be known at construction. palmCount*8 = 56 ✓.

For per-instance colors: create the color attribute and setColorAt in the loop. `mesh.instanceColor!.needsUpdate = true` after all sets. Actually setColorAt creates instanceColor if missing (it initializes to white and sets). We call setColorAt for each index in the leaf loop. Fine.

Trunk: create for each palm, `new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.2, 7, false), trunkMat)`.

Curve points as described. Also add a "root bulge"? Skip.

Coconuts: for each palm, 3 small spheres (SphereGeometry(0.16,8,6)) at the crown offset. Adds 21 meshes. Fine, but maybe combine into a single InstancedMesh? Simpler to add a single small cluster per palm: use 3 spheres as separate meshes in the palm's group. OK, 21 extra draw calls is fine.

Actually, let's reduce: 2 coconuts per palm = 14.

Hmm, draw calls: ocean(1), sky(1), island(1), rocks(9), palms: 7 trunks + 14 coconuts + 1 leaf instanced + boat (~10 meshes) ≈ 45 draw calls. Fine.

46. Wind sway update each frame:

```ts
function updateLeaves(t: number): void {
  const windBase = 0.10 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 1.9 + 2.1) + 0.03 * Math.sin(t * 3.7 + 0.5);
  for (let i = 0; i < leavesData.length; i++) {
    const d = leavesData[i];
    const sway = Math.sin(t * 1.6 + d.phase) * 0.08 + Math.sin(t * 2.9 + d.phase * 1.7) * 0.03;
    qYaw.setFromAxisAngle(AXIS_Y, d.yaw + windBase * 0.9 + sway * 0.4);
    qTilt.setFromAxisAngle(AXIS_Z, d.tilt + windBase * 0.7 + sway);
    qTwist.setFromAxisAngle(AXIS_X, Math.sin(t * 3.1 + d.phase * 2.0) * 0.14 + windBase * 0.5);
    q.copy(qYaw).multiply(qTilt).multiply(qTwist);
    scaleV.set(d.scale, d.scale * (1 + 0.02*Math.sin(t*2 + d.phase)), d.scale);
    mat.compose(d.pos, q, scaleV);
    leaves.setMatrixAt(i, mat);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
```
Where AXIS_Y = new THREE.Vector3(0,1,0), etc.

Careful: `q.copy(qYaw).multiply(qTilt)` gives q = qYaw * qTilt ✓.

47. Boat update:

```ts
function updateBoat(t: number, dt: number): void {
  const bx = 12 + Math.sin(t * 0.11) * 2.6;
  const bz = 14 + Math.cos(t * 0.083) * 2.2;
  const yaw = Math.atan2(-Math.cos(t*0.11)*2.6*0.11, -Math.sin(t*0.083)*2.2*0.083) ... 
```
Too fancy. Let's just set a gentle yaw: `0.15 * Math.sin(t * 0.13) + 2.2` — hmm, a fixed base yaw makes the boat face a direction. Let's have the boat face roughly toward the island: the boat at (12,14) faces the origin → yaw such that the boat's +Z points toward the origin. Direction to origin = (-12,-14) normalized → yaw = atan2(dx, dz) = atan2(-12, -14) ≈ -2.43 rad? For an object with forward +Z, `rotation.y = θ` makes +Z point to (sin θ, cos θ). We want (sin θ, cos θ) ∝ (-12,-14) → θ = atan2(-12, -14) = -π + atan2(12,14)... atan2(-12,-14) ≈ -(π - 0.708) = -2.433 rad. Yes.

Add a slow variation: yaw = baseYaw + 0.12*sin(t*0.09). Fine.

Height sampling:
```ts
const hC = heightAt(bx, bz, t);
const hF = heightAt(bx + fx*1.7, bz + fz*1.7, t);  // forward
const hB = heightAt(bx - fx*1.7, bz - fz*1.7, t);
const hR = heightAt(bx + sx*1.0, bz + sz*1.0, t);  // starboard
const hL = ...
```
where (fx,fz) = (sin yaw, cos yaw) is the forward direction and (sx,sz) = (cos yaw, -sin yaw)? For the right vector of an object with forward (sin θ, cos θ) and up +Y: right = forward × up? Let's compute: forward f = (sinθ, 0, cosθ), up u = (0,1,0). The right vector r should satisfy: r = normalize(cross(u, f))? cross(u,f) = (1*cosθ - 0*0, 0*sinθ - 0*cosθ, 0*0 - 1*sinθ) = (cosθ, 0, -sinθ). For θ=0 (forward +z), right = (1,0,0) ✓ (that's the object's +x direction). Yes, right = (cosθ, 0, -sinθ).

Pitch about X: rotation.x = -atan2(hF - hB, 3.4)? We derived that a positive rotation.x lowers the bow. So pitch = -atan((hF-hB)/dist). ✓

Roll about Z: rotation.z = atan2(hR - hL, 2.0). Positive rotation.z raises the +x side, so if the right side water is higher, the right side goes up ✓.

Yaw = θ.

Also smooth: use lerp toward the target with a factor like 1 - exp(-dt*8) to avoid jitter. Actually, the wave height changes smoothly with time, so no smoothing needed. Direct assignment is fine and guarantees the boat follows the water.

Boat y = hC + 0.12 (offset). Hmm, since the hull's local y ranges from -0.27 to 0.78, the boat origin should sit such that the hull bottom is below the water: y = hC + 0.05 means the hull bottom at -0.22 relative to the water surface → floating. Let's use y = hC + 0.1.

Wait, careful: the boat y position is set to hC + offset; the hull bottom local y = -0.27, so the bottom sits at hC - 0.17 → below the wave surface at the center. Good — a boat floats with the hull partly submerged.

48. The camera must stay at (35,12,35) — set the position, lookAt the target via OrbitControls. OrbitControls.update() may reposition the camera based on the internal spherical coords, but the initial state derives from the current camera position and target, so it stays. ✓

Also set `controls.enablePan = false`? Panning is allowed but not necessary. Keep pan enabled = false to avoid the camera moving away? "OrbitControls are allowed if they start there and do not move by themselves." Panning is fine. I'll enable damping and set min/max distance, and maxPolarAngle to avoid going under the water: maxPolarAngle = Math.PI * 0.49. And minDistance 5, maxDistance 200.

49. The render loop:

```ts
const clock = new THREE.Clock();
let waveT = 0;
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveT += dt;
  oceanMat.uniforms.uTime.value = waveT;
  skyMat.uniforms.uTime? no.
  updateBoat(waveT);
  updateLeaves(waveT);
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Hmm: `waveT` should start at 0 and the shader uses uTime. ✓

But note: on the very first frame, dt could be large? clock.getDelta() on the first call returns the time since the clock was created (which is small). Clamped anyway.

50. `__ocean.time()` returns waveT.

51. Shader uniform declarations must be typed as `{ [key: string]: THREE.IUniform }`. Fine with ShaderMaterial.

I need `oceanMat.uniforms.uTime.value = waveT;` — with strict TS, `oceanMat.uniforms` is of type `{ [uniform: string]: THREE.IUniform }` ✓.

52. Potential TS strict issues:
- `geo.attributes.position` is a `BufferAttribute`; `.getX(i)` exists ✓.
- `THREE.MathUtils.smoothstep` ✓.
- `new THREE.Fog(color, near, far)` ✓.
- `renderer.setAnimationLoop(cb)` ✓.

53. Sky dome mesh and the sun disc: the sun's elevation of 26° means the disc is 26° above the horizon. Good.

54. Also add `renderer.setClearColor`? Not needed with the sky dome + background color.

Let me now write the shaders fully.

Ocean vertex shader:

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vDisp;
varying vec2 vBase;

void main() {
  vec2 p = position.xz;
  vec3 disp = vec3(0.0);
  vec3 tx = vec3(1.0, 0.0, 0.0);
  vec3 tz = vec3(0.0, 0.0, 1.0);
  ${WAVE_CODE}
  vec3 wp = position + disp;
  vWorldPos = (modelMatrix * vec4(wp, 1.0)).xyz;
  vNormalW = normalize(cross(tz, tx));
  vDisp = disp.y;
  vBase = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
```
Hmm, `viewMatrix` is a built-in uniform ✓. But `modelMatrix * vec4` then `viewMatrix * ...` — correct only if the model matrix is applied. ✓ (projectionMatrix * viewMatrix * worldPos).

Ocean fragment shader: needs the sky function, so include the sky uniforms and function.

```glsl
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAmpSum;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vDisp;
varying vec2 vBase;

${SKY_FUNC}

float hash21(vec2 p) { ... }
float vnoise(vec2 p) { ... }

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormalW);

  // add fine ripple detail normal (fades with distance)
  float dist = length(cameraPosition - vWorldPos);
  float fade = 1.0 - smoothstep(40.0, 160.0, dist);
  vec2 q = vBase * 0.9 + vec2(uTime * 0.35, uTime * 0.21);
  float d1 = sin(q.x * 1.9 + q.y * 1.1) * cos(q.y * 2.3 - q.x * 0.7);
  N.x += d1 * 0.05 * fade;
  N.z += cos(q.x * 1.3 - q.y * 2.1) * 0.05 * fade;
  N = normalize(N);
  ...
}
```
Hmm, adding a fake detail normal without derivatives can look odd but adds sparkle. It's fine; keep it subtle.

Continue:
```glsl
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.025 + 0.975 * pow(1.0 - NdotV, 5.0);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 refl = skyColor(normalize(R));

  float dIsland = length(vBase);
  float shallow = 1.0 - smoothstep(11.0, 34.0, dIsland);
  vec3 body = mix(uDeepColor, uShallowColor, shallow * 0.9);
  // subtle depth darkening
  body *= 0.85 + 0.15 * shallow;

  vec3 col = mix(body, refl, clamp(fres, 0.0, 1.0));

  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = pow(ndh, 320.0) * 2.2 + pow(ndh, 40.0) * 0.12;
  col += uSunColor * spec;

  // foam
  float crestH = vDisp / max(uAmpSum, 0.001);
  float fn = vnoise(vBase * 1.8 + vec2(uTime * 0.5, -uTime * 0.35));
  float foamCrest = smoothstep(0.55, 0.85, crestH) * smoothstep(0.45, 0.8, fn);
  float ang = atan(vBase.y, vBase.x);
  float shoreR = 18.0 + 1.6 * sin(ang * 3.0 + 0.7) + 0.9 * sin(ang * 7.0 - 1.3);
  float band = 1.0 - smoothstep(0.0, 2.6, abs(dIsland - shoreR));
  float pulse = 0.5 + 0.5 * sin(uTime * 1.9 - dIsland * 1.6 + fn * 3.0);
  float foam = clamp(foamCrest * 0.9 + band * pulse * 0.85, 0.0, 1.0);
  foam *= smoothstep(0.0, 0.35, fn + 0.2);
  col = mix(col, vec3(0.92, 0.96, 0.98), foam * 0.85);
  
  // fog
  float f = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Note: `uFogColor` is in linear space (since Color is converted). ✓

`crestH = vDisp / uAmpSum` ranges roughly [-1,1]. Using smoothstep(0.55, 0.85, crestH) → foam only at high crests.

Hmm, `vDisp` is the sum of amplitudes; the max is ~0.88 but actual crests rarely align. So the foam appears only in rare spots. Let's use smoothstep(0.45, 0.75, crestH). Crests of ~0.55+ will get foam — nice.

Careful with the colors: foam white 0.92 etc. after tone mapping will be near white. Fine.

Note about `#include <tonemapping_fragment>` — it modifies gl_FragColor.rgb. Then `#include <colorspace_fragment>` converts linear → output color space. ✓

But: does the ShaderMaterial's fragment prefix define `toneMapping`? Yes as discussed. In three r160+, the chunk `tonemapping_fragment` is:
```glsl
#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
And `TONE_MAPPING` is defined when renderer.toneMapping ≠ NoToneMapping and the material's toneMapped is true. ✓

`colorspace_fragment`:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
which is defined in the prefix as well (getTexelEncodingFunction). ✓ Actually in r160, `linearToOutputTexel` is defined in the fragment prefix via `getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputColorSpace )`. ✓

Good — this is the standard way custom shaders handle tone mapping.

Also, the sky dome shader does the same.

55. One more thing: the water needs `fog: false` on the material? ShaderMaterial's fog defaults to false, and I handle fog manually. But `material.fog` isn't used unless the shader includes the fog chunks. Since I don't include them, no problem. Actually, the renderer's program parameters include `fog` only if material.fog is true; for ShaderMaterial it's false by default. ✓

56. Sky shader:

vertex:
```glsl
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Hmm, using cameraPosition for the direction; note the vertex interpolation of a direction vector is fine.

fragment:
```glsl
uniform vec3 ...;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyColor(dir);
  // below-horizon darkening (not needed, the ocean covers it)
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Sky material: side: BackSide, depthWrite: false, depthTest: false? If depthTest false, the sky is drawn over everything that comes before it. With depthWrite false and rendering order: opaque objects sorted by renderOrder then by material/z. The sky sphere is centered at the origin, huge; the ocean and island are closer, so the sky is drawn last among opaque objects (sorted by distance ascending: nearest first). With depthTest true and the depth buffer containing the ocean, the sky's fragments behind the ocean get rejected. That's correct and fine. Keep depthTest true, depthWrite false.

Since the sky sphere is huge (radius 1200) and the camera far is 2500, the sky survives clipping ✓.

To ensure the sky doesn't get culled by the frustum: it's a sphere around the camera, fine.

57. The water plane center at the origin, 500×500, camera at (35,12,35) — the plane is huge, so no culling issue.

58. Let's double check the heightAt ↔ shader match. The shader uses `position.xz` where the geometry was rotated so y=0. position.x = world x, position.z = world z (with modelMatrix identity). The mesh is at (0,0,0). ✓

The JS heightAt uses the undisplaced (x,z) ✓ matching p = position.xz.

Additionally, Gerstner horizontal displacement means the actual vertex sits at a shifted position; the requirement explicitly allows ignoring that. ✓ Note the vertex's y is exactly Σ A sin(phase(p)) — the same as heightAt(x,z,t) at the base position. So a buoy placed at (x,z) via heightAt is at the correct height for the water surface at that base position, though the surface vertex at the shifted position may be slightly elsewhere. Fine.

59. Ocean uniform values: uAmpSum = 0.88 (sum of amplitudes).

60. Colors:
- deep: 0x0d3b52? Let's think in linear. Tropical ocean deep teal: 0x0b4f63, shallow turquoise: 0x2fbfb0 or 0x39c4b5.
After tone mapping, these will darken. Deep = 0x073a4a (very dark), shallow = 0x2ec9b8. The Fresnel mix with the sky at grazing angles will make the water bright — good.

Let's use uDeepColor = 0x0a2c3d, uShallowColor = 0x2bc4bd. Hmm, with `shallow` near the island, the water becomes turquoise ✓. Deep water is dark blue-green ✓.

Maybe add a bit of sun scattering to the body: `body += uSunColor * 0.02 * max(dot(N,uSunDir),0)` — subtle.

61. The boat's waterline: fine.

62. The sail: for a nicer look, use a slightly warm white and double-sided, with `shadowSide`? DoubleSide shadows are fine.

63. Let's handle the sun disc visible in the sky and the DirectionalLight direction matching exactly: `sun.position.copy(sunDir).multiplyScalar(120)` with the target at the origin → the light direction is -sunDir ✓, and the sky's uSunDir = sunDir (pointing from the scene toward the sun) ✓.

64. Hemisphere light: `new THREE.HemisphereLight(0x9fc8f0, 0x4a5a3a, 0.75)`.

65. Boat shadow: the sun casts shadows from the boat onto... the water doesn't receive, so nothing. But the boat casts onto the island if near — the boat is at (12,14), the island's shore is at r≈18.5, so the boat is over water. Its shadow won't be visible. Not required though. Hmm, "Its meshes cast shadows" — we set castShadow = true. ✓

To make the shadow visible, we could give the ocean shadow reception... Let's consider adding shadow reception to the water shader — it's actually not too hard with `shadowMap` chunks, but it needs the shadow uniforms and the light matrices. With ShaderMaterial and `lights: true`? We'd have to include `#include <shadowmap_pars_fragment>` and `getShadowMask()`. This requires material.lights = true and proper uniforms merging (UniformsLib.lights). Doable but risky. Skip: the requirement only says the boat's meshes cast shadows.

Alternative to show a shadow: place the boat closer to the island? The boat must be at ~(12,0,14) which is over water. Fine.

66. Let's ensure `renderer.shadowMap.enabled` and the island's `receiveShadow` ✓; palms receive ✓; boat receives ✓ (so the sail shadows the deck).

Also, the shadow camera must cover the palms (up to y=6 near the island center) — with the directional shadow camera ortho ±48 around the origin, the 3D volume along the light direction covers it ✓.

67. Now let's write the frond geometry.

```ts
function makeFrondGeometry(): THREE.BufferGeometry {
  const L = 3.4;
  const W = 0.62;
  const segL = 14, segW = 2;
  const geo = new THREE.PlaneGeometry(L, W, segL, segW);
  // PlaneGeometry lies in XY: x along length, y along width
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.x + L / 2) / L;     // 0 at base, 1 at tip
    const u = v.y / (W/2);            // -1..1 across the width
    const width = Math.sin(Math.PI * Math.pow(t, 0.65));  // taper: 0 at base?? 
    ...
  }
}
```
Hmm, at t=0 we want the width to be ~0 (a narrow stem) and near t=0.3 the full width. Use `w = Math.pow(Math.sin(Math.PI * Math.min(t*1.0,1.0)), 0.6)` gives 0 at t=0 and 0 at t=1. Actually, we want the widest around t=0.35. Let's use `w = Math.sin(Math.PI * Math.pow(t, 0.6))`? At t=0 → 0; t=0.35 → sin(π*0.54)=0.99; t=1 → sin(π)=0. Good.

Then the new y (width) = u * (W/2) * w.

The droop: y2 = L * (0.62*t - 1.02*t*t) → and then rotate the whole thing? Wait, in the plane geometry x is the length and y is the width; the droop should go in -Y? No: y is the width axis. Hmm, I need to re-map.

Let's set it up so the geometry's local axes are: X = length (base at origin, tip at +X), Z = width, Y = droop (up/down). But the PlaneGeometry is in XY. So let's build the frond with X = length and use the plane's Y as the width, then rotate the geometry -90° about X so that y→? Let's instead directly construct: after modifying, apply `geo.rotateX(-Math.PI/2)`, mapping y→ -z? Earlier computed: rotateX(-π/2): (x,y,z) → (x, 0*..., ...). We computed (x, y, 0) → (x, 0, -y) for a plane. So the width along y becomes width along -z. Fine — width along z (mirrored, no matter).

So: keep the plane's x = length, y = width. Apply the width taper to y. Then apply the droop as a z offset (z = f(t)) (since z=0 initially, and after rotating -90° about X, z becomes... hmm, the rotation also transforms z: (x,y,z) → (x, z*1? ). Let's recompute rotX(-π/2) for a general point: y' = y cos(-90) - z sin(-90) = 0 + z = z; z' = y sin(-90) + z cos(-90) = -y. So (x,y,z) → (x, z, -y). So the plane's z-offset becomes the world y (droop) and the plane's y becomes -z (width). 

So in the plane's local space: x = length, y = width, z = droop (positive z → positive y after rotation). So set z = droop(t) with droop positive to arc up then down: droop(t) = L*(0.62t - 1.02t²) → at t=0: 0; t=0.3: 0.19-0.09=0.098*L≈0.33; t=1: -0.4*L = -1.36. Good.

Also translate the geometry so the base is at x=0: after PlaneGeometry(L,W), x ∈ [-L/2, L/2]. In the loop, compute t from the original x, then set x = t*L (base at 0). ✓

Also add a V-fold: the width coordinate y should be tilted: the leaf folds slightly along the spine. After the rotation, the width is along z; a fold means y (which becomes world y after rotation... confusing). Let's skip the fold; instead, add a slight cupping by offsetting z (the droop axis) by a small amount dependent on |u|: z -= 0.10 * (u*u) * ... that would curl the edges down. Actually z (droop axis) — adding -0.12*u² makes the edges lower → a nice cupped frond. Do it.

So:
```ts
const t = (v.x + L/2)/L;
const u = v.y / (W/2);
const w = Math.sin(Math.PI * Math.pow(t, 0.6));
const y = u * (W/2) * w;
const z = L * (0.62*t - 1.02*t*t) - 0.12 * u*u;
pos.setXYZ(i, t*L, y, z);
```
At t=0, all vertices collapse to the same point (w=0) — degenerate triangles at the base, but acceptable. Maybe use max(w, 0.05). Fine.

Then `geo.rotateX(-Math.PI/2)` → the frond extends along +X, droops in +Y then -Y, width along Z. Then `geo.computeVertexNormals()`. Since the material is DoubleSide, normals matter less. The normals will be computed for the curved surface ✓.

Also add slight vertex color variation? Not necessary; per-instance colors are enough.

68. Now, potential problem: the leaves InstancedMesh's `castShadow` with a double-sided material and thin geometry → shadow acne? Set `material.shadowSide = THREE.DoubleSide` (default is front). Fine.

69. Let's write the boat hull material colors: white hull with a blue stripe. I'll add a "stripe" mesh: a torus? Skip.

Let's add a rub rail: TorusGeometry? A simple approach: a slightly larger, flattened sphere scaled to a thin band at the deck line, colored navy. Actually, let's add a "gunwale" as a thin box ring... skip. Keep it clean: white hull + wood deck + white cabin + blue windows + wood mast + cream sail + red flag.

Hmm, a pure white hull might look plain. Let's make the hull a cream white (0xf2eee3) and the deck wood (0xa9754a), and the cabin white with a blue-gray roof.

70. Windows: two boxes of size (0.06, 0.22, 0.5) at x = ±0.56, y = 0.9, z = -0.5 with a dark blue material (0x1c2a33) and some roughness. Cabin half-width = 0.55. So the windows at ±0.56 protrude slightly. ✓

71. Cabin position: (0, 0.75, -0.55), size (1.05, 0.55, 1.5)? The deck is at y≈0.62. Let's define the deck top at y=0.62, and the cabin from 0.62 to 1.2 → center 0.91, height 0.58.

Hmm, let me lay out the boat coordinates carefully:

- Hull: position (0, 0.25, 0), scale (0.95, 0.8, 2.05). The hull's top is at 0.25 + 0.6625*0.8 = 0.78; the bottom at 0.25 - 0.65*0.8 = -0.27.
- Deck: Box(1.15, 0.1, 2.7) at (0, 0.7, 0). The deck top at 0.75.
- Cabin: Box(1.0, 0.6, 1.4) at (0, 1.05, -0.5) → spans 0.75..1.35.
- Roof: Box(1.15, 0.09, 1.55) at (0, 1.39, -0.5).
- Mast: cylinder height 3.2, at (0, 2.3, 0.45) → spans 0.7..3.9. radius 0.07.
- Boom: cylinder length 1.9 along z at (0, 1.1, -0.3)? The boom should be at the sail's bottom.
- Sail: PlaneGeometry(1.75, 2.5) bulged, at (0, 2.45, -0.35) rotated Y by -π/2 → the sail spans z from -0.35-0.875 to -0.35+0.875 = [-1.225, 0.525], y from 1.2 to 3.7. The mast at z=0.45 — the sail's fore edge at z=0.525 is close ✓.
- Boom at (0, 1.15, -0.35) along z, length 1.8.
- Flag at the mast top: a small triangle at (0, 3.95, 0.45) pointing -z.

Total boat height 4, length 4.1. ✓ "about 4 units long" ✓.

Sail bulge: the vertices of PlaneGeometry(1.75, 2.5, 10, 14) have z ∈ 0; set z = 0.35 * sin(π * (x/L + 0.5)) * sin(π*(y/H+0.5))... a nice billow. Since we then rotate by -π/2 about Y, the local +z becomes -x. OK.

Let's do the bulge: z = 0.32 * cos(π * x / 1.75) * cos(...)? Simple: `z = 0.3 * Math.cos((v.x / 1.75) * Math.PI * 0.5) * Math.cos((v.y/2.5) * Math.PI * 0.5)`. Hmm, at the edges x=±0.875: cos(0.875/1.75*π*0.5) = cos(π/4)=0.707 → z=0.21 at the edges, not 0. Let's use `z = 0.35 * (1 - (v.x/(0.875))²) * (1 - (v.y/1.25)²)` → 0 at the edges, 0.35 in the middle, times maybe reduce. Actually the edge where it attaches to the mast should have some slack. Fine, a simple billow.

Wait, the sail's width is along x in local space, which after the rotation becomes z. So the sail's edges at z = center ± 0.875. The edge at the mast (z=0.525) is z=0 for the bulge → attached. Fine.

72. Now consider the boat's `rotation.order = 'YXZ'` and setting `boat.rotation.y = yaw` etc. But since we set rotation.x/z from the waves and the y is the drift yaw, fine.

However, the pitch/roll sampling directions use `yaw` — good.

73. Let's check the "staying within 25 units of origin" for the boat ✓ (max ~21.6).

74. Add a subtle water "wake" ring around the boat? Skip.

75. Let's think about the `__ready` flag: set it after the first render.

76. Also, `(window as any).__scene = scene;` etc.

77. The OrbitControls import — `three/addons/controls/OrbitControls.js` requires the tsconfig to have paths for 'three/addons/*'. Since the task says to use that import form, assume the environment supports it. Types: OrbitControls has types ✓.

78. Now, potential strict TS errors:
- Unused variables? `noUnusedLocals` might be on in an unknown tsconfig... Typically the evaluation uses `tsc --strict` only, which doesn't include noUnusedLocals. I'll avoid obvious unused variables anyway.
- Strict null checks: `geo.attributes.position` returns BufferAttribute (not nullable) ✓.
- `mesh.instanceColor` is `InstancedBufferAttribute | null` — check before use.

79. Let's write the wave code generation with `.toFixed()`. Ensure the resulting GLSL floats are valid: toFixed(8) gives e.g. "0.13665928" ✓. Negative numbers get a "-" ✓ (e.g., "-0.26000000" is fine).

80. Ocean geometry `PlaneGeometry(500, 500, 220, 220)` → 221² = 48,841 vertices. Hmm, 220 segments → 220*220*2 = 96,800 triangles ✓.

81. Let's now also consider draw order: the sky dome might be sorted as the farthest (distance ~1200) → drawn last among opaque. With depthTest, the ocean's depth will reject sky fragments behind it. Fine.

But there's an issue: if the sky is drawn last and the ocean has depthWrite=true, the sky's fragments behind the ocean are rejected ✓.

82. Let me double check the sun glitter: The sun is at azimuth 205°, elevation 26°. The camera at (35,12,35) looking at the origin. The specular reflection would be visible along the direction from the camera toward the sun's mirror point on the water. The reflected sun direction on the water: the point where the sun's reflection appears is where the water's normal bisects the sun direction and the view direction. Since the sun is 26° above the horizon and the camera looks down ~11°, the mirror point is roughly where the view ray hits the water at an angle such that tan(θ_view) relates. The mirror direction in the horizontal plane is roughly toward the sun's azimuth (205°), i.e., toward (-x,-z) from the camera → visible in the view. Good, the glitter will be in the picture near the horizon in the sun's direction.

83. Sun specular power 320 with a normal that varies per pixel — this should produce nice glitter.

84. Let's also add a warm tint to the water body based on the sun's angle for a golden-hour feel: skip.

85. Now the palm placement must avoid the very center (peak) and be on land (h > 1). Radius 6..16 with h>1 ✓ (the waterline is at 18.5). Some palms at radius 16 have h maybe ~1.5 ✓.

Let's compute h at r=16: dome = 1-16/27 = 0.407; dn = 0.407^1.4 = 0.29; h = 11*0.29 - 2.2 = 3.19 - 2.2 = 0.99 plus noise. Hmm, marginal — could be underwater with bad noise. Use radii 5..13 to be safe. At r=13: dome=0.52, dn=0.41, h=4.5-2.2=2.3 ✓.

Let's distribute palms at radii 4..13.

86. Rocks: place some at radius 12-19.

87. Let me also consider adding a small lagoon/secondary islet? No.

88. Let me write out the final code now.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============ Waves ============

interface WaveDef { ax: number; az: number; amp: number; len: number; om: number; q: number; }

const WAVES: WaveDef[] = [
  { ax:  0.94, az:  0.34, amp: 0.42, len: 46, om: 1.15, q: 0.55 },
  { ax: -0.26, az:  0.96, amp: 0.24, len: 27, om: 1.60, q: 0.50 },
  { ax:  0.71, az: -0.71, amp: 0.13, len: 17, om: 2.05, q: 0.45 },
  { ax: -0.88, az: -0.47, amp: 0.07, len: 11, om: 2.85, q: 0.40 },
];

const AMP_SUM = WAVES.reduce((s, w) => s + w.amp, 0); // 0.86
```
Wait, the directions should be normalized; (0.94, 0.34) has norm 0.9997 ≈ 1; (-0.26,0.96) → 0.994; (0.71,-0.71) → 1.004; (-0.88,-0.47) → 0.998. I'll normalize in both the TS and GLSL generation to be exact.

heightAt with normalized directions:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const l = Math.hypot(w.ax, w.az);
    const k = (Math.PI * 2) / w.len;
    h += w.amp * Math.sin(k * ((w.ax / l) * x + (w.az / l) * z) - w.om * t);
  }
  return h;
}
```
✓ matches the GLSL.

89. Sky function string.

90. Now let me write the whole thing carefully.

Also note: `THREE.Color` uniforms — `uniforms: { uSunColor: { value: new THREE.Color(0xfff2d8) } }`. With color management on, `new THREE.Color(hex)` stores linear ✓. And a `Color` uniform gets uploaded as vec3 with its linear components ✓.

But careful: if color management is disabled (it isn't by default; it's enabled since r152), colors would be raw sRGB. We assume the default and modern three.

Hmm, one subtlety: colors set via `new THREE.Color(0x...)` when `THREE.ColorManagement.enabled` is true do NOT get converted? Let me recall: `Color.setHex(hex, colorSpace = SRGBColorSpace)` → `ColorManagement.toWorkingColorSpace(this, colorSpace)` → converts sRGB→Linear-sRGB when color management is enabled. Yes, converted ✓.

So all hex colors I define are converted to linear. And the shader outputs them with tone mapping + sRGB encoding. ✓ Consistent.

For the fog color, `new THREE.Fog(hex, near, far)` — the Fog constructor does `new Color(color)` → converted ✓. And the standard materials' fog blends in linear space ✓. And my ocean's uFogColor is also converted ✓. Match ✓.

91. Let me define the sky colors:
- zenith: 0x2f6fb8 → linear (0.03, 0.16, 0.48)
- horizon: 0xa9c9e2 → linear (0.4, 0.58, 0.76)
- fog: 0xa9c9e2 same as horizon ✓

But actually, the near-horizon sky in my skyColor function mixes toward uSkyHorizon*1.02 etc. The pure horizon at dir.y=0 gives exactly uSkyHorizon (plus the sun glow). So the ocean's farthest parts should match the sky just above the horizon. Good.

Since the sun is near the horizon in azimuth, there's a warm glow at the horizon near the sun; the ocean there will be fogged toward the plain fog color, not the warm glow. Slight mismatch, acceptable.

Maybe add a bit of sun glow to the fog color in the water shader: mix the fog color with a sun-warm tint depending on the direction: skip.

92. Sky glow strength: `col += uSunColor * pow(d, 6.0) * 0.10;` with uSunColor linear ~ (1.0, 0.86, 0.66). Times 0.10 → a subtle glow. Then `pow(d, 200.0)*0.6` for a tight glow, and the disc.

Let's write:
```glsl
vec3 skyColor(vec3 dir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.65));
  col = mix(col, uSkyHorizon, exp(-h * 16.0) * 0.45);
  float d = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * (pow(d, 5.0) * 0.12 + pow(d, 45.0) * 0.35 + pow(d, 900.0) * 1.6);
  col += uSunColor * pow(d, 5000.0) * 24.0;
  return col;
}
```
Hmm, `pow(h, 0.65)` smooths the gradient. At h=1, the zenith color. ✓

The `pow(d, 5000.0)*24.0` disc: half-max at θ = sqrt(2*ln2/5000)=0.0236 rad = 1.35° — a bit large (the real sun is 0.53°). Use pow 20000 → 0.68°. But such high exponents may alias. Since the camera is static, fine. Use 12000 and multiply by 40.

Let's just use `pow(d, 4000.0) * 12.0` and accept a slightly larger, softer sun. It'll look like a hazy sun. Fine.

93. One more consideration: `skyColor` is used by the water for reflections, and the disc term will create a bright highlight in the water reflection — nice.

94. Boat sail double-sided lighting: standard material handles it.

95. Let's write the final code.

Also, I should double check: does `ShaderMaterial` need `glslVersion` for `position.xz`? No, GLSL1 supports swizzles ✓.

96. `#include <tonemapping_fragment>` inside the ocean shader after setting gl_FragColor. But wait — the `ShaderMaterial` fragment prefix defines the tone mapping function only if `parameters.toneMapping !== NoToneMapping`. It's ACESFilmic ✓.

97. Also, the sky material and water material should have `depthWrite` as needed. The water: depthWrite true (default) ✓.

The water mesh is a huge plane; transparent? No ✓.

98. Renderer antialias: true ✓.

99. Performance: shadow map 2048 ✓, ocean 220² ✓.

100. Let's also add `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` ✓ and handle resize with the pixel ratio kept.

Now write everything.

One more thought on the island's vertex colors and the `smoothstep` helper. THREE.MathUtils.smoothstep(x, min, max) returns 0..1 ✓.

Also the color `lerp` mutates in place; I'll create scratch colors.

Let me write the island builder:

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const dome = Math.max(0, 1 - r / 27);
  const dn = Math.pow(dome, 1.45);
  let h = 10.5 * dn;
  h += 3.4 * (fbm(x * 0.045 + 5.2, z * 0.045 + 1.7) - 0.5) * Math.pow(dome, 0.7);
  h += 1.2 * (fbm(x * 0.12 + 11.0, z * 0.12 + 3.0) - 0.5) * dome;
  h -= 2.1;
  return h;
}
```
At the center: 10.5 + 3.4*(fbm-0.5)*1 + 1.2*(...)-2.1. fbm ∈ (0,1), average 0.47 with 4 octaves of value noise (the max is ~0.94, min ~0.06). So the center height ranges 8.4 ± 1.7 + ... ≈ 7-11 ✓ (peak 5-15).

The waterline: 10.5*dn = 2.1 + noise → dn ≈ 0.2 → dome = 0.2^(1/1.45) = 0.316 → r = 18.5 ✓.

The island diameter ≈ 37 ✓ (30-50).

The plane size 90 covers it ✓.

101. The beach: at h ∈ [0, 0.8] sand; grass above 1.6.

102. Colors: sand 0xe6d6a8, wet sand 0xcbb78a, grass 0x4e8b3c, dark grass 0x2f6628, rock 0x8d8779.

103. Let's write `islandHeight` used both for the geometry and for the palm placement ✓.

104. Now, code writing time. I'll be careful with types.

```ts
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_X = new THREE.Vector3(1, 0, 0);
```

Full leaves update code:

```ts
const leafMesh: THREE.InstancedMesh = ...;
const leafData: LeafInstance[] = [];
const _m4 = new THREE.Matrix4();
const _qYaw = new THREE.Quaternion();
const _qTilt = new THREE.Quaternion();
const _qTw = new THREE.Quaternion();
const _q = new THREE.Quaternion();
const _sv = new THREE.Vector3();

function updateLeaves(t: number): void {
  const gust = 0.09 * Math.sin(t * 0.63) + 0.05 * Math.sin(t * 1.71 + 2.0) + 0.03 * Math.sin(t * 3.1 + 0.4);
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const sway = Math.sin(t * 1.55 + d.phase) * 0.075 + Math.sin(t * 2.7 + d.phase * 1.6) * 0.025;
    _qYaw.setFromAxisAngle(AXIS_Y, d.yaw + gust * 0.8 + sway * 0.5);
    _qTilt.setFromAxisAngle(AXIS_Z, d.tilt + gust * 0.6 + sway);
    _qTw.setFromAxisAngle(AXIS_X, Math.sin(t * 3.3 + d.phase * 2.3) * 0.13 + gust * 0.4);
    _q.copy(_qYaw).multiply(_qTilt).multiply(_qTw);
    _sv.set(d.scale, d.scale * (1.0 + 0.03 * Math.sin(t * 2.2 + d.phase)), d.scale);
    _m4.compose(d.pos, _q, _sv);
    leafMesh.setMatrixAt(i, _m4);
  }
  leafMesh.instanceMatrix.needsUpdate = true;
}
```
✓

105. Build palms:

```ts
interface LeafInstance { pos: THREE.Vector3; yaw: number; tilt: number; phase: number; scale: number; }

function buildPalms(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f5136, roughness: 0.95, metalness: 0.0 });
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x6b4b2a, roughness: 0.9 });
  const frondGeo = makeFrondGeometry();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3e8f3c, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide });
  const palmCount = 7;
  const leavesPerPalm = 8;
  leafMesh = new THREE.InstancedMesh(frondGeo, leafMat, palmCount * leavesPerPalm);
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  leafMesh.frustumCulled = false;   // matrices updated dynamically; safer
  ...
}
```
Hmm, `frustumCulled = false` avoids incorrect culling (the bounding sphere is computed from the geometry + instance matrices; three computes InstancedMesh's boundingSphere from the instances at raycast/frustum time? In `InstancedMesh.computeBoundingSphere`? Actually, frustum culling for InstancedMesh uses `this.boundingSphere` computed from all instances if `boundingSphere` is null? In recent three, InstancedMesh has its own computeBoundingSphere that accounts for the instance matrices. But it's computed lazily once; since our instance positions are static except for sway (small), it's fine. Set frustumCulled = false for safety.

Also, we must set instance matrices before the first render (we do that in updateLeaves called in the animation loop before rendering ✓). But the initial bounding sphere computation may happen before the first matrix update... it's fine with frustumCulled=false.

Leaf colors: `leafMesh.setColorAt(i, color)` — do this at creation for each i with slight hue variation:
```ts
const c = new THREE.Color();
for (let i = 0; i < total; i++) {
  c.setHSL(0.28 + (rand()-0.5)*0.05, 0.5, 0.28 + rand()*0.12);
  leafMesh.setColorAt(i, c);
}
```
Careful: setHSL with color management converts from sRGB to linear? `Color.setHSL(h,s,l, colorSpace=SRGBColorSpace)` → converts ✓.

But note: setColorAt writes to instanceColor; the material must have `vertexColors`? No — instanced color works automatically via USE_INSTANCING_COLOR when instanceColor exists ✓. The material's `vertexColors` doesn't need to be true. And the base material color multiplies? In the shader, `vColor` from instancing is multiplied with the diffuse color. So set the material color to white (0xffffff) and use instance colors ✓.

Since leaves are green via instance colors, set leafMat.color = 0xffffff.

Hmm, but then the leaves' appearance is entirely from instance colors. OK.

Note that instanceColor with `setColorAt` requires `leafMesh.instanceColor.needsUpdate = true` after the loop.

Now, the trunk curve per palm:

```ts
for (let i = 0; i < palmCount; i++) {
  const a = i * (Math.PI * 2 / palmCount) + 0.6;
  const rad = 5.0 + ((i * 37) % 9); // 5..13
  ...
}
```
Deterministic: rad = 5 + (i % 4) * 2.2 → 5, 7.2, 9.4, 11.6, then repeats. With i=0..6 → 5,7.2,9.4,11.6,5,7.2,9.4. Heights vary. Fine, but visually a bit patterned. Use a pseudo-random hash: `const rand = (n:number)=>{ const s = Math.sin(n*127.1+311.7)*43758.5453; return s - Math.floor(s); }` and use it for the radius/angle/height. Better.

```ts
const ang = i * 2.3999632 + 0.4;  // golden angle for spread
const rad = 4.5 + rand(i*3.1) * 8.5;   // 4.5..13
const px = Math.cos(ang) * rad, pz = Math.sin(ang) * rad;
const groundY = islandHeight(px, pz);
```
Ensure groundY > 0.5; with rad ≤ 13 it should be ~2-4 ✓.

Trunk:
```ts
const h = 4.2 + rand(i*7.7) * 2.2;  // 4.2..6.4
const outX = Math.cos(ang), outZ = Math.sin(ang);
const base = new THREE.Vector3(px, groundY - 0.15, pz);
const mid  = new THREE.Vector3(px + outX * 0.5, groundY + h * 0.6, pz + outZ * 0.5);
const top  = new THREE.Vector3(px + outX * 1.9, groundY + h, pz + outZ * 1.9);
const curve = new THREE.QuadraticBezierCurve3(base, mid, top);
const trunkGeo = new THREE.TubeGeometry(curve, 16, 0.21, 7, false);
const trunk = new THREE.Mesh(trunkGeo, trunkMat);
trunk.castShadow = true; trunk.receiveShadow = true;
group.add(trunk);
```
Crown position = top (the tube's end). Actually the tube's end is at `top`, so the crown = top ✓.

Coconuts: 3 spheres around the crown at a radius of 0.35 below the crown.
```ts
for (let c = 0; c < 3; c++) {
  const ca = c * 2.1 + i;
  const coco = new THREE.Mesh(coconutGeo, coconutMat);
  coco.position.set(top.x + Math.cos(ca)*0.34, top.y - 0.22, top.z + Math.sin(ca)*0.34);
  coco.scale.setScalar(0.9 + 0.3*rand(i+c*4));
  coco.castShadow = true;
  group.add(coco);
}
```
That's 21 extra meshes. Acceptable. Or use 2 per palm → 14. Let's use 3 for fullness; the cost is small.

Leaves: 8 per palm:
```ts
for (let l = 0; l < 8; l++) {
  const yaw = l * (Math.PI * 2 / 8) + rand(i * 13.1 + l * 3.7) * 0.45;
  const tilt = 0.20 + rand(i * 5.3 + l * 1.9) * 0.35;   // up-tilt
  leafData.push({ pos: new THREE.Vector3(top.x, top.y + 0.12, top.z), yaw, tilt, phase: rand(i*17.3 + l*2.1) * 6.28, scale: 0.85 + rand(i*3.9+l*7.1)*0.35 });
}
```
Then set the instance matrices for these indices.

The index = i * 8 + l ✓ (so the total is 56).

106. Now, the leaf tilt: the frond droops in the geometry, and positive tilt lifts it. With tilt 0.2..0.55 rad, the fronds start nearly horizontal, arcing up slightly then drooping. Good.

107. Rock meshes:

```ts
const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d7a70, roughness: 0.9, flatShading: true });
for (let i = 0; i < 9; i++) {
  const g = new THREE.IcosahedronGeometry(1, 0);
  // jitter vertices
  ...
}
```
Reuse one geometry with per-mesh scaling/rotation. Let's create 2-3 rock geometries with vertex jitter and reuse them for 9 rocks.

Rock placement: some on the island (r 6..16 with y = islandHeight > 0.3), some in the water (r 19..24, y ≈ -0.3 partially submerged).

Simple approach:
```ts
const rockGeo = new THREE.IcosahedronGeometry(1, 1);
// jitter
const rp = rockGeo.attributes.position;
for (i) { scale each vertex by 0.85 + 0.3*hash }
```
Then 10 meshes with positions/scales.

108. Now, writing the code for the boat and the update functions.

Also, define `boatGroup` and `__boat`.

109. Everything is set. Let me write the final code, being careful about the ordering of declarations (functions hoisted, const not). I'll define things top-down.

Let me now produce the code.

```ts
// ---------------------------------------------------------------------------
// Ocean wave model (shared between GLSL and JS)
// ---------------------------------------------------------------------------
interface WaveDef { ax: number; az: number; amp: number; len: number; om: number; q: number; }

const WAVES: WaveDef[] = [...];

function waveNormalized(w: WaveDef): { dx: number; dz: number; k: number } {
  const l = Math.hypot(w.ax, w.az);
  return { dx: w.ax / l, dz: w.az / l, k: (Math.PI * 2) / w.len };
}

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    const { dx, dz, k } = waveNormalized(w);
    h += w.amp * Math.sin(k * (dx * x + dz * z) - w.om * t);
  }
  return h;
}
```
Note: creating objects each call is a small allocation cost; used a handful of times per frame (boat sampling ~5 calls × 4 waves). Fine. But `heightAt` is also called in `__ocean.heightAt` from tests. Fine.

Optimization not needed.

GLSL generation:

```ts
function waveGLSL(): string {
  let src = '';
  for (const w of WAVES) {
    const { dx, dz, k } = waveNormalized(w);
    src += `
  {
    float k = ${k.toFixed(8)};
    float A = ${w.amp.toFixed(8)};
    float om = ${w.om.toFixed(8)};
    float Q = ${w.q.toFixed(8)};
    vec2 D = vec2(${dx.toFixed(8)}, ${dz.toFixed(8)});
    float ph = k * dot(D, p) - om * uTime;
    float sn = sin(ph);
    float cs = cos(ph);
    disp.y += A * sn;
    disp.x += D.x * A * Q * cs;
    disp.z += D.y * A * Q * cs;
    tx.x -= D.x * D.x * A * Q * k * sn;
    tx.z -= D.x * D.y * A * Q * k * sn;
    tx.y += D.x * A * k * cs;
    tz.x -= D.y * D.x * A * Q * k * sn;
    tz.z -= D.y * D.y * A * Q * k * sn;
    tz.y += D.y * A * k * cs;
  }`;
  }
  return src;
}
```

Hmm — `D.y` is the z-component of the direction (D is a vec2 of (x,z)) ✓.

110. Let me write the ocean material.

```ts
const oceanUniforms = {
  uTime: { value: 0 },
  uDeepColor: { value: new THREE.Color(0x08303f) },
  uShallowColor: { value: new THREE.Color(0x2ec4b6) },
  uFogColor: { value: FOG_COLOR.clone() },
  uFogNear: { value: 70 },
  uFogFar: { value: 300 },
  uAmpSum: { value: AMP_SUM },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff1d0) },
  uSkyZenith: { value: new THREE.Color(0x2f6fb8) },
  uSkyHorizon: { value: new THREE.Color(0xa9c9e2) },
};
```
Where FOG_COLOR is a THREE.Color.

Wait, uSkyHorizon = 0xa9c9e2 and FOG_COLOR = 0xa9c9e2 (same). ✓

The sky material uses the same uniforms (share the same objects? Sharing the uniform value objects across materials is fine — same Color instance referenced by multiple uniforms). I'll create separate uniform objects but with the same values for clarity/simplicity. Actually sharing the same Color instance is fine; three uploads the value per material.

Let's create a shared set:
```ts
const SKY_ZENITH = new THREE.Color(0x2f6fb8);
const SKY_HORIZON = new THREE.Color(0xa9c9e2);
const SUN_COLOR = new THREE.Color(0xfff1d0);
```
Then use them in both.

111. Sky material:

```ts
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir },
    uSunColor: { value: SUN_COLOR },
    uSkyZenith: { value: SKY_ZENITH },
    uSkyHorizon: { value: SKY_HORIZON },
  },
  vertexShader: SKY_VERT,
  fragmentShader: SKY_FRAG,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});
```

112. Now, writing the render loop and the exports.

Also, `(window as any).__ocean = { heightAt, time: () => waveTime };`

113. Edge case: the first frame's `dt` from `clock.getDelta()`: the clock starts when `getDelta` is first called (autoStart). Fine.

114. Let me finalize the island and check everything compiles.

Potential strict error: `THREE.MathUtils.smoothstep(h, 1.2, 2.6)` — the signature is smoothstep(x, min, max) ✓.

For `THREE.MathUtils.clamp` ✓.

115. Another potential issue: `geo.attributes.position` typing — `BufferAttribute | InterleavedBufferAttribute`. `.setXYZ` exists on BufferAttribute only. `PlaneGeometry` uses BufferAttribute. To satisfy strict TS, cast: `const pos = geo.attributes.position as THREE.BufferAttribute;` ✓.

116. In the frond geometry, `pos.count` ✓.

117. `new THREE.PlaneGeometry(L, W, segL, segW)` then modifying.

Let me write makeFrondGeometry:

```ts
function makeFrondGeometry(): THREE.BufferGeometry {
  const L = 3.4;
  const W = 0.7;
  const geo = new THREE.PlaneGeometry(L, W, 14, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (x + L * 0.5) / L;
    const u = y / (W * 0.5);
    const w = Math.sin(Math.PI * Math.pow(t, 0.62));
    const width = u * (W * 0.5) * w;
    const droop = L * (0.62 * t - 1.02 * t * t) - 0.10 * u * u;
    pos.setXYZ(i, t * L, width, droop);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}
```
Hmm wait: after rotateX(-90°), the plane's y (width) → -z, and z (droop) → +y. The frond extends along +X ✓, width along z ✓, droop in y ✓.

Hmm, but the base at t=0 has all vertices at x=0, y=0, z=0 → degenerate. With w=0 at t=0, all the base vertices collapse → triangles with zero area at the base. That's fine (they just don't render).

Actually, w = sin(π * t^0.62) at t=0 → 0 ✓. The taper should reach full width around t≈0.4.
t=0.4: 0.4^0.62 = 0.575 → sin(0.575π) = 0.97 ✓.
t=1: sin(π)=0 → a pointed tip ✓.

Nice leaf shape.

118. The trunk TubeGeometry with 16 tubular segments and 7 radial → 16*7*2 triangles = 224 tris per trunk ✓.

119. Now the boat builder function. Let's write it.

```ts
function buildBoat(): THREE.Group {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.55, metalness: 0.05 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xa9764b, roughness: 0.8 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f4a5c, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf6f0dd, roughness: 0.95, side: THREE.DoubleSide });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x16242e, roughness: 0.25, metalness: 0.4 });
  ...
}
```

Hull geometry function as above.

Add a thin dark stripe along the hull? Let's add a "boot stripe" — a slightly larger hull copy scaled 1.01 in x/z and thin in y? That would be a solid ellipsoid, not a stripe. Skip.

Add a small anchor/tiller? Skip.

120. Total boat meshes: hull, deck, cabin, roof, mast, boom, sail, flag, 2 windows = 10 ✓ ≥3.

121. Sail geometry bulge function:

```ts
function makeSailGeometry(w: number, h: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(w, h, 12, 16);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const nx = x / (w * 0.5), ny = y / (h * 0.5);
    pos.setZ(i, 0.34 * (1 - nx * nx) * (1 - ny * ny * 0.6));
  }
  geo.computeVertexNormals();
  return geo;
}
```
Then the sail mesh: rotation.y = -Math.PI/2, position (0, 2.45, -0.35).

After rotY(-π/2): local x → +z? We computed earlier: for a = -π/2, x' = -z, z' = x. So a point (x, y, 0) → (0, y, x). So the sail's local x maps to world z ✓, and the bulge (local z) maps to world -x ✓.

So the sail spans world z from -0.35-0.875 to -0.35+0.875 = [-1.225, 0.525] ✓, and the bulge goes -x (to the left). Good.

122. Flag: a small triangle. Use BufferGeometry with 3 verts:
```ts
const flagGeo = new THREE.BufferGeometry();
flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0,-0.35,0, 0.5,-0.18,0], 3));
flagGeo.computeVertexNormals();
```
Hmm, a triangle with the right orientation. Position at (0, 3.85, 0.45). The flag points along +x. Use a double-sided red material. Simple. But a flag made of 1 triangle is flat — fine.

Actually, we could animate the flag with a slight rotation. Skip animation; give it a slight rotation.

123. I'll now write out the whole file.

One more check: OrbitControls `update()` each frame with damping. Since the camera starts at (35,12,35) with target (0,2,0), `controls.update()` keeps the position. ✓ But careful: OrbitControls' constructor calls `this.update()`? It sets up and calls update at the end of the constructor — which recomputes the camera position from the spherical based on the offset — no change ✓. But to be safe, set the position and target before creating the controls, then call update. And maybe disable damping? Damping requires update() per frame, which we do.

Note: OrbitControls also requires `controls.update()` after changing the target. We do it every frame ✓.

124. Should the camera look exactly at (0,2,0)? With OrbitControls, the camera's position stays (35,12,35) and the target is (0,2,0) → the camera looks at the target ✓ (OrbitControls calls camera.lookAt(target)).

125. Finally, `(window as any).__ready = true;` after the first `renderer.render`.

Let me write the final code now.

Also I should be careful: `renderer.setAnimationLoop` in a headless test environment might not run; but the requirement asks for it.

Let me write out everything now in full.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

Full code:

I'll write it now in order:
1. Constants + wave model.
2. Renderer/scene/camera/controls.
3. Sun + lights.
4. Sky.
5. Ocean.
6. Island (height fn, noise, build, rocks).
7. Palms (fronds, trunks, leaves).
8. Boat.
9. Update functions.
10. Loop + exports.

Let me be careful that `islandHeight` is defined before it's used at module top-level execution (function declarations are hoisted, so that's fine even if defined later — but the constants it uses, like noise functions, are also function declarations ✓).

Writing the value noise with a deterministic hash:

```ts
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
```
This is deterministic ✓.

```ts
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  const ab = a + (b - a) * ux;
  const cd = c + (d - c) * ux;
  return ab + (cd - ab) * uy;
}

function fbm(x: number, y: number): number {
  let v = 0, amp = 0.5, fx = x, fy = y;
  for (let i = 0; i < 4; i++) {
    v += amp * vnoise(fx, fy);
    fx *= 2.02; fy *= 2.02; amp *= 0.5;
  }
  return v;
}
```
Note: hash2 with large negative coordinates works fine.

Also `rand(n)` helper for palm placement:
```ts
function rand(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
```

Now the island build.

Also: to avoid z-fighting between the island's underwater portion and the water plane, the water is opaque and drawn... the island's underwater parts are below y=0 and the water plane is at y≈0 (with waves). At the shoreline, the water and sand intersect — that's expected and looks like a beach ✓.

One issue: the water plane's waves go up to +0.86, and near the shore the island is above the water. The water surface intersects the sand slope. Fine.

Let me now write the code for real. I'll try to keep it organized.

Additional consideration for `renderer.outputColorSpace` — default is sRGB already, but set explicitly.

Let me also set `THREE.ColorManagement.enabled = true;` — it's default true; setting it is fine.

Final assembly of the ocean's vertex shader template:

```ts
const OCEAN_VERT = /* glsl */`
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vDisp;
varying vec2 vBase;

void main() {
  vec2 p = position.xz;
  vec3 disp = vec3(0.0);
  vec3 tx = vec3(1.0, 0.0, 0.0);
  vec3 tz = vec3(0.0, 0.0, 1.0);
${waveGLSL()}
  vec3 wp = position + disp;
  vWorldPos = (modelMatrix * vec4(wp, 1.0)).xyz;
  vNormalW = normalize(cross(tz, tx));
  vDisp = disp.y;
  vBase = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
`;
```
Careful: `viewMatrix * vec4(vWorldPos, 1.0)` — viewMatrix is a mat4 ✓.

Note the wave GLSL uses `uTime` from the uniform ✓ and `p`.

Now the fragment:

```ts
const OCEAN_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
uniform float uAmpSum;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vDisp;
varying vec2 vBase;

${SKY_FUNC}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  float dist = length(cameraPosition - vWorldPos);

  vec3 N = normalize(vNormalW);

  float detailFade = 1.0 - smoothstep(30.0, 140.0, dist);
  vec2 q = vBase * 0.55 + vec2(uTime * 0.42, uTime * 0.31);
  float r1 = sin(q.x * 3.1 + q.y * 1.7) * cos(q.y * 2.9 - q.x * 1.1);
  float r2 = cos(q.x * 2.3 - q.y * 3.7) * sin(q.y * 1.3 + q.x * 2.1);
  N.xz += vec2(r1, r2) * 0.06 * detailFade;
  N = normalize(N);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 refl = skyColor(normalize(R));

  float dIsl = length(vBase);
  float shallow = 1.0 - smoothstep(10.0, 34.0, dIsl);
  vec3 body = mix(uDeepColor, uShallowColor, shallow * 0.9);
  body *= 0.82 + 0.35 * shallow;

  vec3 col = mix(body, refl, fres);

  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = pow(ndh, 300.0) * 2.4 + pow(ndh, 30.0) * 0.10;
  col += uSunColor * spec;

  float crest = vDisp / max(uAmpSum, 0.001);
  float fn = vnoise2(vBase * 1.7 + vec2(uTime * 0.55, -uTime * 0.4));
  float foamCrest = smoothstep(0.42, 0.78, crest) * smoothstep(0.4, 0.85, fn);

  float ang = atan(vBase.y, vBase.x);
  float shoreR = 18.2 + 1.7 * sin(ang * 3.0 + 0.6) + 0.8 * sin(ang * 7.0 - 1.1);
  float band = 1.0 - smoothstep(0.0, 2.8, abs(dIsl - shoreR));
  float pulse = 0.5 + 0.5 * sin(uTime * 1.7 - dIsl * 1.5 + fn * 4.0);
  float foam = clamp(foamCrest + band * pulse * 0.9, 0.0, 1.0);
  foam *= smoothstep(0.05, 0.4, fn + 0.15);
  col = mix(col, vec3(0.95, 0.98, 1.0), foam * 0.85);

  float fogF = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
```

Hmm: `N.xz += vec2(...)` — modifying a swizzle in place: `N.xz += vec2(...)` is valid GLSL ✓.

`foam *= smoothstep(0.05, 0.4, fn + 0.15);` — fn ∈ [0,1], so fn+0.15 ∈ [0.15,1.15]; smoothstep gives 0 for values below 0.05 and 1 above 0.4 → mostly 1 except for very low fn. This adds breakup ✓.

The shore band uses a fixed radius while the island's actual shoreline varies with noise. The island's waterline radius changes with the noise (up to ±2). The foam band with ±2.8 width covers it ✓.

Note: the foam appears on the water surface where the sand isn't covering. Since the water is a huge plane and the island mesh is drawn on top where it's above water, foam overlapping the sand is hidden ✓ (the sand is above y=0 there).

`shallow` uses dIsl (the distance from the island center) to blend the turquoise near the island ✓.

126. The `SKY_FUNC` string declares the uniforms uSunDir, uSunColor, uSkyZenith, uSkyHorizon. In the ocean fragment shader, I declare them once (before the function) — but SKY_FUNC also declares them. I must not declare them twice. So SKY_FUNC includes the uniform declarations. Then in the ocean fragment, I should NOT redeclare them. Let me structure: SKY_FUNC = uniform declarations + the function. In the ocean fragment, I only declare the other uniforms. In the sky fragment, the same SKY_FUNC provides everything ✓.

127. The sky vertex/fragment:

```ts
const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
```
`cameraPosition` is available in the vertex shader as a built-in uniform ✓ (three injects it into both vertex and fragment shaders).

128. Now, `scene.background`: with a sky dome, set `scene.background = SKY_HORIZON.clone()`? Setting a Color background is fine. Actually, `scene.background = new THREE.Color(0x9ec6e0)` — but wait, the background color is tone-mapped? In three, the background color is rendered through the same output pipeline (it applies tone mapping to the background in the `background` pass? For a Color background, the renderer clears with the color converted to the output color space... Actually `renderer.setClearColor` + clear uses the color converted via `ColorManagement` but is not tone-mapped (a plain clear). Using a sky dome avoids the issue entirely. I'll set `scene.background = null` and rely on the sky dome (which covers all directions). Safer: set the background to a color anyway as a fallback; since the sky dome covers everything, the background is never seen. But if the background color were visible at the edges it might mismatch. Just set it to the horizon color; fine.

129. One more consideration: the water plane is 500x500 and the sky dome is 1200 in radius. When the camera orbits far out (maxDistance 200), the sky dome still surrounds it ✓, but the ocean's edge might become visible when the camera is far away. OrbitControls maxDistance 200, and the ocean extends 250 from the origin. At the camera's max distance of 200 from the target (0,2,0), the horizon edge may be visible. Restrict maxDistance to 120. Fine.

130. Write the code.

Let me carefully write out the complete file.

```ts
// ---------------------------------------------------------------- setup
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
...
```

I'll write it all now. I need to be careful with the ordering of the top-level statements that use later-defined consts. Since all my top-level code runs in order, I'll define the helper functions first, then the constants, then the build calls.

Let me write:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =====================================================================
// 1. Renderer / Scene / Camera
// =====================================================================
const renderer = ...
const scene = ...
const camera = ...
```

Then `const controls = new OrbitControls(...)`.

Then the sun.

Then the sky.

Then the ocean.

Then the island, etc.

All heights/offsets defined inline.

Let me write the palm builder to return the group and fill `leafData` + create the InstancedMesh at the module level.

I'll structure it as:

```ts
// module-level mutable references created in builders
let leafMesh: THREE.InstancedMesh | null = null;
```
Hmm, strict null checks: I'd have to check for null in updateLeaves. Better: build everything in an IIFE-ish flow with `const` declared after the builder function? Since the builder function returns the mesh, I can do:

```ts
const palms = buildPalms();  // returns { group, leaves }
scene.add(palms.group);
scene.add(palms.leaves);
```
And `buildPalms` returns an object with the group and the leaves mesh, and pushes into a module-level `leafData` array (declared before the function is *called* — since `const leafData: LeafInstance[] = []` must be initialized before the call. Function declarations are hoisted, but the const must be initialized before the call; since the call happens after the declaration in the source order, it's fine).

Let me place `const leafData: LeafInstance[] = [];` near the top of the palm section, then `function buildPalms() {...}`, then `const palmBuild = buildPalms();`.

OK, writing it all out now. I'll aim for correctness on the first pass.

One more detail: `InstancedMesh.setColorAt` requires the index < count ✓, and after all setColorAt calls, set `instanceColor.needsUpdate = true`. `leafMesh.instanceColor` may be null if no setColorAt was called. In buildPalms, I call setColorAt inside the loop, creating the attribute ✓. Then:

```ts
if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
```
✓ TS-safe.

Also, `InstancedMesh.setMatrixAt(i, m)` with i < count ✓.

Let me also call `updateLeaves(0)` once at build time so the initial matrices exist ✓ (though the loop calls it each frame anyway).

Now, about `leafData` positions: they're world positions (the palm group is at the origin, so local = world ✓ since I add the group at the origin with no transform). The leaves InstancedMesh is added to the scene at the origin ✓.

Wait, the palms group is added to the scene at the origin, and the island group is also at the origin. So all positions are in world space ✓.

Let's write the boat:

```ts
const boat = buildBoat();
boat.position.set(12, 0.1, 14);
scene.add(boat);
```

`__boat = boat`.

The update sets `boat.position.x/y/z` each frame.

Let me write everything now, final.

Regarding the shadow: `sun.shadow.camera` is an OrthographicCamera; after changing left/right/etc., call `sun.shadow.camera.updateProjectionMatrix()` — three does that internally when the shadow is rendered? `DirectionalLightShadow.updateMatrices` calls `camera.updateProjectionMatrix()`? Let me recall: `LightShadow.updateMatrices(light)` sets the camera's position/target and calls `camera.updateMatrixWorld()` and computes the shadow matrix. The ortho camera's projection matrix is updated in `updateProjectionMatrix()`, which is not called automatically... Actually `DirectionalLightShadow` has:

```js
updateMatrices( light ) {
  const shadowCamera = this.camera;
  ...
  shadowCamera.updateMatrixWorld();
  ...
}
```
Hmm, `LightShadow` has a `_projScreenMatrix`, and `updateMatrices` does `shadowCamera.updateMatrixWorld()` and `_projScreenMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse)`. The projection matrix is only updated if updateProjectionMatrix is called. Changing left/right/etc. requires `camera.updateProjectionMatrix()`. In the WebGLShadowMap, `shadow.updateMatrices(light)` is called each frame, but it doesn't update the projection matrix. So we must call `sun.shadow.camera.updateProjectionMatrix()` after setting the bounds. Do that.

Also, `sun.shadow.camera.near/far` then updateProjectionMatrix ✓.

Let me finalize.

Another consideration: with `renderer.shadowMap.type = PCFSoftShadowMap` and a 2048 map over ±48 units, shadows will be reasonably sharp.

Also `sun.shadow.bias = -0.0005; normalBias = 0.08;`.

Now let's write the final code. I'll be meticulous.

Also note: for the boat's shadow to be visible on the island, the boat would need to be near the island. It's not. Fine.

Also let's ensure `boat.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } })` after building.

Let me write it.

Final check on the `heightAt` export signature: `(window as any).__ocean = { heightAt(x,z,t) {...}, time() {...} }` ✓.

Let me write the code out now.

One more: the `time()` function returns the wave time that the shader uses right now. In the animation loop we set the uniform to `waveT` before the render, so `time()` returns the same value ✓.

Also I should account for the possibility that a test calls heightAt at t where the shader's uniform differs — as long as we update both together ✓.

Writing now.

Regarding `THREE.Fog` and the ocean uniform uFogNear/uFogFar — I'll use constants:
```ts
const FOG_NEAR = 70, FOG_FAR = 310;
```
and `new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR)`.

Alright. Also `scene.fog` affects standard materials (the island, palms, boat) — the island is at ~50 distance, so almost no fog ✓.

Now write.

Let me also handle the `resize` listener:

```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Done. Writing the final answer now.

Wait, one more: the ocean must be "centered on the origin" and "at least 400x400" ✓ 500x500.

And the boat must be "about 4 units long" ✓ (4.1).

Let me also double check the hull vertex modification math for `taper`:

```ts
const t = v.z; // -1..1, bow at +z
const taper = 1 - 0.45 * Math.max(0, t) ** 2 - 0.15 * Math.max(0, -t) ** 2;
```
`Math.max(0, t) ** 2` — the exponentiation operator in TS ✓.

The stern (z=-1) taper = 1-0.15 = 0.85 (slightly narrower) ✓. The bow (z=1) → 1-0.45 = 0.55 ✓.

Then `v.x *= taper` — hmm, the sphere's x is already 0 at the bow tip, so the taper widens... no, it narrows the cross-section ✓.

Then flatten the bottom and clamp the top.

Then scale the mesh: (0.95, 0.8, 2.05).

The hull's max width = 0.95 (at z≈0) → the beam is 1.9 units for a 4.1-unit boat — a bit wide, but sailboats are ~1/3 beam; 1.9/4.1 = 0.46. Slightly beamy but fine. Let's scale x by 0.8 → a beam of 1.6. Fine.

I'll set the hull mesh scale (0.82, 0.78, 2.05) → length 4.1, beam 1.64, height ~1.0.

Then the deck box width 1.15 vs the hull's max half-width 0.82 → the deck (half-width 0.575) fits inside ✓.

Cabin width 1.0 → half 0.5 ✓ fits on the deck (0.575). ✓

Windows at x = ±0.51 with a size of 0.05 in x → protrude slightly from the cabin sides ✓.

OK, writing now for real.

Also: the boat's local origin y=0 with the hull bottom at 0.25 - 0.65*0.78 = -0.257 and the deck top at 0.25+0.6625*0.78 = 0.767. Deck box at y=0.68, height 0.08 → top at 0.72. Hmm, I said 0.7 earlier. Fine: deck center y=0.66, thickness 0.1 → top 0.71.

Cabin: center 1.0, height 0.58 → 0.71..1.29 ✓ sitting on the deck.
Roof: center 1.33, thickness 0.08 → 1.29..1.37 ✓.

Mast: height 3.3, center y = 0.71 + 1.65 = 2.36 → spans 0.71..4.01 ✓.
Sail: center y = 2.35, height 2.6 → 1.05..3.65 ✓. Width 1.6 → the sail spans z from -0.75 to 0.85 with the mast at z=0.55... Let me set the mast at z=0.5 and the sail center at z=-0.3 with a width of 1.6 → z ∈ [-1.1, 0.5] ✓ touching the mast.

Sail position: (0, 2.35, -0.3), rotation.y = -π/2 ✓.
Boom: a cylinder along z, length 1.7, at (0, 1.02, -0.3) → rotates to align with z: rotation.x = π/2 (a Y-axis cylinder rotated about X by 90° aligns with Z ✓).
Boom spanning z from -1.15 to 0.55 ✓, matching the sail's bottom edge (y=1.05) ✓.

The flag at (0, 3.95, 0.5).

Good.

Now, writing.

Let me be careful with the CylinderGeometry rotation: CylinderGeometry's axis is Y. Rotating by π/2 about X maps Y → Z? RotX(π/2): y' = y cos - z sin = -z; z' = y sin + z cos = y. So a point (0,1,0) → (0,0,1) ✓ aligned with Z.

OK, writing the final code.

Regarding the fog and the sky dome: the sky dome is a ShaderMaterial with fog disabled; the scene fog doesn't affect it ✓ (ShaderMaterial ignores fog unless coded).

One last thought on `scene.background`: I'll leave it null to avoid a color mismatch, since the sky dome always covers the view. Actually, on WebGL, if scene.background is null, the renderer clears with the clear color (default black) then draws the sky. The sky dome covers everything ✓. But if the camera far plane cuts the dome... 1200 < 2500 ✓.

Let me set `scene.background = new THREE.Color(0x0a1018)` just in case? No: use the horizon color. It won't matter. I'll set the sky dome and leave the background as the horizon color for safety.

Writing the answer now.

I also want to double check the `#include <colorspace_fragment>` name in current three versions (r152+ renamed `encodings_fragment` to `colorspace_fragment`). If the environment uses an older version (r150), this would fail to compile. The instructions mention three/addons, which implies r150+. Since the prompt mentions AgX tone mapping (added in r168) as an option, the environment likely uses a recent version. I'll use `colorspace_fragment` (present since r152).

Hmm, risk. Alternatively, avoid the include and do manual tone mapping + sRGB encoding. But then double tone mapping... I could set `material.toneMapped = false` and do everything manually:

Actually the cleanest safe approach: keep `toneMapped = true` and use the includes. If the include name doesn't resolve, the shader fails. Given that modern three is used (AgX mentioned → r168+), `colorspace_fragment` is definitely present. Go with it.

Also, with tone mapping enabled and the includes, the ShaderMaterial's fragment prefix defines `toneMapping()` ✓.

Let me finalize.

One more potential issue: in the ocean fragment shader I named a variable `fogF`; fine.

Also, `precision highp float;` — three adds its own precision declaration in the prefix; adding another could cause a redeclaration error? The prefix has `precision highp float;` and adding it again is allowed? Redeclaring precision is legal in GLSL (it just sets the default precision again). Actually, duplicate precision statements are allowed. But to be safe, omit it (three adds it).

Let me remove that line.

Also, in the sky fragment, no need.

Now writing.

For the leaves' per-instance color, note that `setColorAt` with color management converts the color to linear? `setColorAt` just writes `color.toArray(this.instanceColor.array, index*3)` — using the color's internal (linear) values ✓. Then the shader uses vColor in linear space ✓.

Fine.

Let me write out the final file.

Also I realize I should double-check `THREE.MathUtils.smoothstep` argument order: `smoothstep(x, min, max)` ✓ (three's MathUtils.smoothstep(x, min, max)).

Now, writing.

Final code below. I'll keep comments light but organized.

Also: `document.body.style.margin = '0';` before appending.

One more: `renderer.domElement` style width/height are set by setSize ✓.

I think everything's ready.

Let me write the boat hull function once more with the correct final scale.

```ts
function makeHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 30, 20);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const t = z;
    const taper = 1 - 0.45 * Math.max(0, t) ** 2 - 0.16 * Math.max(0, -t) ** 2;
    x *= taper;
    if (y < 0) y *= 0.62;
    if (y > 0.5) y = 0.5 + (y - 0.5) * 0.25;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}
```
Then `new THREE.Mesh(geo, hullMat)` with scale (0.82, 0.78, 2.05), position (0, 0.25, 0).

Hmm: the sphere's z at the poles is ±1 → length 2 → scaled by 2.05 → 4.1 ✓.

Top: y max = 0.5 + 0.5*0.25 = 0.625 → world 0.25 + 0.625*0.78 = 0.7375. Deck top at 0.71 ✓ close.

Bottom: y min = -0.62 → world 0.25 - 0.484 = -0.234 ✓.

Waterline at 0: the hull is submerged 0.234 deep at the center. The beam at the waterline: at y=0 (local 0 world → local y = -0.32), the sphere's radius factor sqrt(1-0.32²)=0.947 → the half-width is 0.947*taper*0.82 ≈ 0.75. That's a wide waterline. Fine.

The deck at 0.71 covers the hull's interior ✓ (a box on top).

Good. Writing the final answer.

Ah, one thing: `pos.setXYZ(i, x, y, z)` on a sphere geometry with the top clamped — the top vertices all flatten to 0.625, creating a flat-ish top. The deck box covers it ✓.

Alright, final code.

For the island's rocks jitter, I'll write:

```ts
function makeRockGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.75 + 0.35 * rand(seed + i * 3.7);
    v.multiplyScalar(n);
    v.y *= 0.85;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
```
Note: IcosahedronGeometry is non-indexed? It is indexed by default? `PolyhedronGeometry` produces non-indexed geometry (each triangle has its own vertices) — so vertices are duplicated and the jitter per vertex breaks the surface (non-watertight, gaps). With flatShading and small rocks, that's fine, but the jitter would tear it apart. To avoid tearing, use `geo.toNonIndexed()`? It's already non-indexed. Hmm. To keep it watertight, jitter by a function of the vertex direction rather than the index:

```ts
const n = 0.8 + 0.3 * vnoise(v.x * 2.0 + seed, v.z * 2.0 + v.y * 1.7);
```
Since identical positions give identical jitter, the shape stays watertight ✓. Nice trick. Use that.

Then flatShading: true for a faceted rock look.

OK, final code. Writing it now.

Let me also remember to set `islandGroup` as `__island`.

Also note "Expose the island (Mesh or Group) as __island; it receives shadows." ✓ islandMesh.receiveShadow = true.

And the palms/rocks are children of the island group (they also receive shadows) ✓.

Writing!

Final code below.

Let me count the total number of `setColorAt` calls: 56 ✓.

Also: `leaves.receiveShadow = true;` — instanced shadows on leaves work ✓.

Writing the final answer now.

One last detail: make sure `updateLeaves` is called with the current time each frame BEFORE rendering ✓.

Also `boat.rotation.set(pitch, yaw, roll)` with order YXZ: `boat.rotation.set(pitch, yaw, roll)` sets x, y, z ✓ and the order is YXZ ✓.

Done.