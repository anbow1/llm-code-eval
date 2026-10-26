Let me write a single TypeScript file with Three.js, implementing everything.

Key considerations:
- Ocean: large plane, e.g. 800x800 with 256x256 segments, custom ShaderMaterial with Gerstner waves.
- heightAt in JS must match shader wave height (Y displacement). For Gerstner waves, vertical displacement is what matters.
- Wave sum: 4 waves.
- Need to match exactly between GLSL and JS.

Let me define waves:

```ts
const WAVES = [
  { dir: new THREE.Vector2(1, 0.35).normalize(), steepness: 0.32, wavelength: 34, speed: 1.0, amplitude: ... }
];
```

Better to use Gerstner formulation:

For each wave i:
- D = normalized direction
- wavelength L, amplitude A (=> k = 2π/L, c = sqrt(9.8/k) maybe, but let's just use speed factor)
- Q = steepness / (k * A * numWaves) — hmm.

Standard Gerstner:
```
P.x += Q * A * D.x * cos(f)
P.z += Q * A * D.y * cos(f)
P.y += A * sin(f)
f = k * dot(D, P0.xz) - w*t
```
where w = k * speed.

For heightAt we ignore horizontal shift, so height = sum A_i * sin(k_i * dot(D_i, (x,z)) - w_i * t).

Crest-to-trough = 2 * sum(A). Let's aim for sum A ≈ 0.8 → crest-to-trough 1.6. Good.

Also for the normal computation in the shader, I can compute analytic derivatives from the full Gerstner (including horizontal displacement effects). Simpler: compute normals from a rotated tangent/binormal approach. Let's do it via finite-ish analytic:

Actually let's just compute derivative analytically:
With Gerstner:
dP/dx = 1 - sum( Q*A*k*D.x*D.x*sin(f) ) ... let me derive.

Let f = k*(D·P0) - w t, with P0 = (x,0,z).
P.x = x + sum Q_i A_i D_i.x cos(f_i)
P.z = z + sum Q_i A_i D_i.y cos(f_i)
P.y = sum A_i sin(f_i)

∂P/∂x:
 ∂f_i/∂x = k_i * D_i.x
 ∂P.x/∂x = 1 - sum Q A D.x * k * D.x * sin(f) = 1 - sum Q A k D.x² sin f
 ∂P.z/∂x = 0 - sum Q A D.y * k * D.x sin f
 ∂P.y/∂x = sum A k D.x cos f

∂P/∂z:
 ∂P.x/∂z = - sum Q A D.x * k * D.y sin f
 ∂P.z/∂z = 1 - sum Q A D.y * k * D.y sin f
 ∂P.y/∂z = sum A k D.y cos f

Normal = normalize(cross(∂P/∂z, ∂P/∂x))? For a heightfield with tangent along x: Tx = ∂P/∂x, Tz = ∂P/∂z. Normal = cross(Tz, Tx) normalized (since y-up, cross(Tz, Tx) gives... let's check: Tz ≈ (0,0,1), Tx ≈ (1,0,0). cross(Tz,Tx) = Tz × Tx = (0,0,1)×(1,0,0) = (0*0-1*0, 1*1-0*0, 0-0) = (0,1,0). Yes, up. Good.

I'll implement this in GLSL.

Now — the ocean plane. I want it large; using PlaneGeometry with 256x256 segments over 800x800 gives 3.1 unit spacing, waves of wavelength 34 fine, but smaller waves would alias. Let's use wavelengths ~ 40, 22, 13, 8. With 3.1 spacing, wavelength 8 gives 2.6 samples per wave — bad aliasing. Better: make grid 400x400 segments? Limit says at or below 256x256 segments. Hmm.

Option: use a smaller dense grid (e.g. 260x260 units with 256 segments → 1.0 unit spacing) plus... but requirement is water surface at least 400x400 units centered at origin. Hmm, "A large water surface (at least 400 x 400 units, centered on the origin)".

Idea: Use a plane with geometry that is displaced radially: use a plane 1200x1200 with 256x256 segments but apply a non-linear scaling so vertices are denser near center? Simpler: use the far ocean as a separate flat-ish disc extending to the horizon with only low-frequency waves, and a detailed inner ocean 400x400 with 256x256 (1.56 units spacing).

Actually simplest acceptable approach: single plane 800x800, 256x256 segments, waves with wavelengths ≥ 12 units (1.56*8 = 12.5 samples). Wait, 800/256 = 3.125 spacing. wavelength 12 → ~4 samples per wave. Aliasing.

Hmm. Two-tier approach is nicer and cheap. Let's do:
- Far ocean: PlaneGeometry(4000, 4000, 64, 64) with just the same shader but fewer waves? Must heightAt match... The far ocean just needs to blend into fog. Actually it can use the same material; the displacement is the same function, just coarser sampled — which will alias. But with fog, far ocean is hidden anyway. Risky for visual artifacts.

Alternative better plan: ocean as a polar/graded grid. Create a custom geometry: a disc of radius 1500 with rings whose spacing grows with radius, dense near the center. That's a nice trick: generate a grid in polar coords with radial rings: N_r rings × N_theta. With 256x256 budget total, e.g. 96 rings × 200 theta = ~19200 verts... Actually vertex count: rings*theta = 96*256 = 24576 verts, ~48000 triangles. That's fine. And near the center the spacing is tiny, far out it's coarse. Waves at far distances alias but fog hides.

But we need the undisplaced position of the vertex (x,z) — with polar grid that's just the vertex's plane coordinates. Fine, the shader uses position.xz.

Hmm, but polar grid gives radial spokes visible... With waves it might be OK but the triangulation with long thin triangles at the outer radius can cause shading artifacts. Let's keep it simpler and more robust:

Use a square plane 400x400 with 256x256 segments (spacing 1.56) for detailed waves, and a second larger plane 4000x4000 (32x32 segments) underneath/at same height using the same material but only... Hmm, two planes overlapping causes z-fighting.

Let me instead do: one plane 400x400 @ 256 segments for the detailed region (requirement: at least 400x400 ✓). Then a "far ocean" ring/plane at y slightly below? Displacement differences will make gaps visible at the seam.

Alternative: make the far ocean a flat plane at y=0 extending 4000 units, and the near 400x400 plane with waves. At the seam the near plane's waves dip below and rise above the flat far plane — you'd see the intersection line. But with fog starting around 150 units, the seam at 200 units is well into fog. That could work but might look off.

Honestly, the cleanest: single plane, 512x512 units with 256 segments (2 unit spacing), waves with min wavelength ~ 20 (10 samples per wave). And use normal-map-free detail via a second set of higher-frequency waves only affecting normals? No — heightAt must match the picture; extra normal detail doesn't change the height. Actually I could add high-frequency normal perturbation in the fragment shader for sparkle, which is a standard technique, and it doesn't change geometry. That's fine and keeps heightAt consistent.

But requirement: "waves must be clearly visible (crest-to-trough height about 0.5 to 2 units)". With amplitude sum ~0.7, crest-to-trough 1.4. ✓.

So: geometry 600x600 units, 256x256 segments → 2.34 unit spacing. Wavelengths: 90, 47, 26, 15? 15/2.34 = 6.4 samples. Ok-ish. Let's use wavelengths 120, 60, 32, 18 with amplitudes proportional (A = L * something). Hmm, but the ocean extends only 600 units; with fog we can hide the edge at ~250 units radius. Fog density such that at 250 units it's fully fogged. Camera at (35,12,35) looking at origin, distance ~50. Ocean edge at 300 units from origin → distance up to 330 from camera. Let's set fog near 60, far 320 (FogExp2 with density ~0.0075?). Let's compute: FogExp2 density d, factor = 1 - exp(-(d*dist)^2). At dist=300, want ~0.95: (d*300)^2 = 3 → d*300 = 1.73 → d = 0.0058. Fine. Hmm, but then the horizon meets the sky at 300 units which is close; the sky dome handles that. Actually with a sky dome and fog color matching the horizon, it blends.

Hmm, but the ocean edge at 600x600 means the corner is 424 units away. With fog d=0.006, at 424: (2.54)^2=6.4 → exp(-6.4)=0.0017 → fully fogged. Good.

Actually, let's just make it 800x800 with 256 segs (3.125 spacing) and wavelengths 130, 65, 34, 19 → 19/3.125 = 6 samples. Acceptable. Meh.

Let me reconsider: use a graded grid but in a robust way — a plane whose vertices are spread non-linearly. E.g., take PlaneGeometry(2,2,256,256) (unit square) and remap each vertex's x,z via a function f(u) = sign(u)*pow(|u|, 2.5)*halfSize. That gives dense center, sparse edges, no seams, still a regular grid topology (no degenerate triangles — well, near the center they'd be small, fine). And spacing near center could be very small.

With 256 segments over [-1,1]: du = 2/256 = 0.0078. With f(u)=sign(u)*|u|^2.5*300: near u=0, spacing ~ 300*2.5*u^1.5*du → tiny. At u=0.5, spacing = 300*2.5*0.5^1.5*0.0078 = 300*2.5*0.3536*0.0078 = 2.07. At u=0.9: 300*2.5*0.854*0.0078=5.0. At u=1: 5.85.

Hmm, that's uneven in a weird way. Maybe power 2 is nicer: spacing at u = 300*2*u*du → at u=0.5 → 2.34, at u=1 → 4.7. And near center it's very dense (fine, wasted verts near origin... actually the island is at center so that's wasted).

Alternatively use a smoothstep-ish remap. Honestly, let's just do a simple approach: uniform plane 700x700 with 256 segments = 2.73 spacing, waves min wavelength 18. That's ~6.6 samples/wave, acceptable with fog. And add a subtle specular/normal detail in fragment for high freq.

Hmm, I'm overthinking. Let me use the radial remap approach with power 2 and halfSize 500: grid spans ±500, dense near center. Waves min wavelength ~25 (9 samples near center region where boat/island are). Far away, waves alias but fog hides them. 

Hmm but a non-uniform grid means the displaced geometry has varying triangle sizes; with steep waves, far coarse triangles will produce jagged silhouettes against the sky near the horizon. But at the horizon it's fog anyway.

Decision: uniform plane, size 700, segments 256. Spacing 2.73. Waves: wavelengths 110, 55, 28, 16 with amplitudes such that sum ≈ 0.75... Let's define amplitude proportional to wavelength with a falloff so short waves are small.

Let's set:
w1: L=110, A=0.38, dir=(1,0.25)
w2: L=57, A=0.20, dir=(-0.6,1)  (i.e. direction with x negative)
w3: L=31, A=0.11, dir=(0.7,-0.8)
w4: L=17, A=0.06, dir=(1,0.9)

sum A = 0.75 → total height range 1.5. 

Speeds: phase speed c = sqrt(g*L/(2π))? For deep water c = sqrt(gL/2π). For L=110: sqrt(9.8*110/6.283)=sqrt(171.6)=13.1 m/s — that's fast for a 110m wave but physically right. Might look too fast. Use a speed factor to slow them: ω = k*c*0.5 or so. Just choose ω directly.

Let's use ω_i = sqrt(9.8 * k_i) * 0.45 maybe. For k=2π/110 = 0.0571: sqrt(9.8*0.0571)=0.748 rad/s → period 8.4s. Multiply by ~0.6 → 0.45. Fine, gives nice slow big swell.

For k=2π/17=0.3696: sqrt(9.8*0.3696)=1.903 → period 3.3s. Fine.

Use a constant multiplier 0.55 for all. Good.

Now Gerstner horizontal displacement: Q_i = steepness_i / (k_i * A_i * nWaves)? Standard: Q in [0,1] with QA ≤ 1 for no loops. Use Q_i such that Q_i*A_i*k_i ≤ 0.4/nWaves... Let's simply set Q_i = q_i/(k_i*A_i) with q_i chosen. Simpler: horizontal displacement amount H_i = 0.5 * A_i * ... hmm.

Let me just define per wave a "steepness" value s_i and set Q_i = s_i / (k_i * A_i). Then horizontal amplitude = Q_i*A_i = s_i/k_i. With s_i ~ 0.15 for each, horizontal amp = 0.15/k. For wave 1: 0.15/0.0571 = 2.6 units. That's a lot but ok for Gerstner swell. Sum over waves could give loops? The condition to avoid self-intersection: sum over i of Q_i*A_i*k_i*... the standard condition is that the Jacobian stays positive. Roughly sum(Q_i * A_i * k_i * |D|² ) < 1 — with D normalized, that's sum(s_i) < 1. With 4 waves * 0.15 = 0.6 < 1. Good.

But for the JS heightAt ignoring horizontal shift — the requirement says "(for Gerstner waves ignore the small horizontal shift)". Good.

Now let's also handle "foam near crests": in the fragment shader, use height fraction. Since it's a vertex shader we can pass a varying `vHeight` (the y displacement) and normalized. Foam when height > threshold, plus noise. I'll add simple procedural noise via hash functions. Keep it cheap.

Also "foam near the shore": distance to island center < some radius → foam based on depth. But island shape is procedural; I could compute the same island height function in the ocean shader to get depth. Let's do: island height function h(x,z) — compute in shader, if h > -0.6 (i.e. water depth small) add foam. That's doable if I keep the island function simple and duplicate it in GLSL. Good — nice touch, and easy: island is a radial cone with noise.

Hmm, but duplicating a noise-heavy function in GLSL is fine — use a couple of sin functions.

Let me design the island height function:

```
function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const R = 22; // base radius
  // angular noise
  const ang = Math.atan2(z, x);
  const wobble = 1 + 0.18*Math.sin(ang*3 + 1.2) + 0.12*Math.sin(ang*5 - 0.7);
  const rr = r / (R*wobble);
  let h = 9 * Math.pow(Math.max(0, 1 - rr), 1.6) ... 
}
```

Hmm, we want a peak of 5-15 units and the island sloping into the sea. Let's make:

h(r) = peak * exp(-(rr^2)*k) - shoreOffset.

Simpler: h = peak * (1 - smoothstep(0,1,rr))^? Let's use:

let t = clamp(1 - rr, 0, 1); h = peak * Math.pow(t, 1.5) - 2.0 (so that at t=0 (rr=1) h=-2 underwater, and at t=1 h = peak-2 = 9-2=7). Hmm let's do peak = 9.5, offset 2.5 → top 7, and at rr=1 it's -2.5 (underwater). Then the island visible above water out to where h=0: t^1.5 = 2.5/9.5 = 0.263 → t = 0.263^(2/3)=0.409 → rr = 0.591 → r = 0.591*R*wobble. With R=30, r ≈ 17.7*wobble. So island is ~35-40 units across. Good, within 30-50.

Plus add small bumps for detail: + 0.6*sin(x*0.35)*cos(z*0.31) etc., scaled by t so it doesn't affect the shoreline much.

Vertex colors: sand near y < 0.8, grass above, rock above 5.5. Blend with noise.

Now the palms: 5+ palms placed on the island. Trunk = curved (use a TubeGeometry along a CatmullRomCurve3, or a series of cylinders). Let's use TubeGeometry with a curve for a nice curved trunk. Leaves: instanced mesh of leaf geometry (a flattened cone or a plane shaped like a palm frond). Use a custom "frond" geometry: a plane bent... Let's make a simple frond shape from a lathe? Simplest: a THREE.PlaneGeometry(width, length, 1, 8) with vertices tapered and curved downward — build custom BufferGeometry. Or use a ConeGeometry with few segments scaled flat? 

Let's build a frond geometry procedurally: 
- length L=2.2, width W=0.5
- segments along length N=8
- vertices: for i in 0..N, t = i/N, y = -0.9*t*t (droop), x = ±w(t) where w(t) = W*Math.sin(Math.PI*t)^0.7 ... 
Actually build a strip: positions for left and right edges. Double-sided material.

Then per palm, we place ~8 fronds around the crown, each with a rotation. All fronds of all palms in one InstancedMesh. 6 palms * 8 = 48 instances ≥ 30 ✓.

Sway: update instance matrices each frame with a wind phase offset. Use dummy Object3D.

To make it efficient: store base data (palm position, frond index, azimuth, tilt) and rebuild matrices each frame. 48 matrices * 60fps = trivial.

Also need to expose __leaves = the InstancedMesh.

Boat: Group with hull (a box or a lathe/extruded shape), deck/cabin, mast (cylinder), sail (plane or a slightly curved shape). At least 3 meshes. About 4 units long. Position (12,0,14). Must stay within 25 units of origin — (12,14) is radius 16.4. Drift slowly: add a small circular drift, keep within 25.

Boat orientation: place group.position = (x, y, z) where y = heightAt + offset (like 0.15 so hull bottom sits in water). Pitch and roll from sampling heights.

Compute: fore = heightAt(x + sin? ...). Use boat's heading. Let's compute forward direction from boat heading angle; sample at ±2 along forward and ±1 along right.

pitch = atan2(hFore - hAft, 4) → rotate around the local X axis... In Three.js, for a group with rotation.y = heading, the local X axis points... Let's set group.rotation.order = 'YXZ', rotation.y = heading, rotation.x = pitch, rotation.z = roll.

With YXZ order: first Y, then X, then Z applied — actually Three's Euler order 'YXZ' means rotation matrix R = Ry * Rx * Rz. So local X (forward-ish) rotation happens after Y. Good.

Forward vector in world for heading h: (sin(h), 0, cos(h))? For rotation.y = h, the local +Z axis maps to (sin h, 0, cos h). So forward = local +Z.

Sample: hFront = heightAt(p.x + fwd.x*2, p.z + fwd.z*2), hBack = heightAt(p.x - fwd.x*2, p.z - fwd.z*2).
Slope along forward: (hFront - hBack)/4 → pitch angle. Rotation about local X: positive rotation.x tilts local +Z downward? Rotation about X by angle θ: +Z → (0, -sinθ, cosθ)... Let's check: Rx(θ) applied to (0,0,1) = (0, -sinθ, cosθ)? Rx = [[1,0,0],[0,cosθ,-sinθ],[0,sinθ,cosθ]]. Times (0,0,1) = (0, -sinθ, cosθ). So positive θ makes +Z go down (negative y). We want the boat's front to be higher when hFront > hBack, so the front should go up: need θ negative. So rotation.x = -atan(dy/4)? Let's define pitch = atan2(hFront - hBack, 4) and set rotation.x = -pitch. Hmm wait, we want +Z (front) raised when hFront>hBack, i.e. +Z y-component positive → need -sinθ > 0 → θ < 0. So rotation.x = -pitch where pitch = atan2(diff, 4). Yes.

Roll: right vector = (cos h, 0, -sin h) (local +X under Ry). Check: Ry(h)*(1,0,0) = (cos h, 0, -sin h). Yes.
hRight = heightAt(p + right*1.2), hLeft = heightAt(p - right*1.2).
Roll about local Z: Rz(φ)*(1,0,0) = (cosφ, sinφ, 0). So positive φ raises local +X. We want to raise the right side when hRight > hLeft. So φ = +atan2(hRight - hLeft, 2.4). rotation.z = roll.

Good.

Also add a slight y-rotation bob (heading wobble) — fine.

Sun / sky: Use Sky addon. 
```ts
import { Sky } from 'three/addons/objects/Sky.js';
```
Sky from three addons: `new Sky()`, sky.scale.setScalar(450000); uniforms: turbidity, rayleigh, mieCoefficient, mieDirectionalG, sunPosition.

Note: In newer three versions, Sky's material may output in a specific color space. Should be fine.

Set sun direction: elevation ~ 22°, azimuth ~ 130°. Compute:
```
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
sunDir.setFromSphericalCoords(1, phi, theta);
sky.material.uniforms.sunPosition.value.copy(sunDir);
```
Then directional light position = sunDir * 100, with target at origin.

Shadow camera: orthographic covering island + boat: left/right ±40, top/bottom ±40, near 1, far 300. Actually light at distance 100 with ortho ±45, near 20, far 200.

Hmm, shadow map 2048. Fine.

Also I should ensure the water receives shadows? Not necessary. But island receives shadows ✓, boat casts shadows ✓.

Setting castShadow on instanced leaves too — nice.

Tone mapping: ACESFilmic, outputColorSpace SRGB.

Now, the water shader. Let me write it carefully.

Vertex shader:

```glsl
uniform float uTime;
uniform vec3 uWaveA; // dir.x, dir.z, steepness  -- I'll use arrays instead
```

Use uniform arrays for clarity:

```glsl
#define NUM_WAVES 4
uniform vec2 uDir[NUM_WAVES];
uniform float uAmp[NUM_WAVES];   // amplitude A
uniform float uK[NUM_WAVES];     // wavenumber k = 2π/L
uniform float uOmega[NUM_WAVES]; // angular speed
uniform float uQ[NUM_WAVES];     // Q = steepness/(k*A)
```

Set as arrays of THREE.Vector2 and Float32Array? For array uniforms in Three.js, use a flat array or array of Vector2. Three supports `uniform vec2 uDir[4]` with value = [Vector2, Vector2, ...]. Yes.

Vertex shader:
```glsl
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vHeightNorm;

void main() {
  vec3 p = position; // plane geometry in xz, y=0
  vec2 xz = p.xz;
  vec3 disp = vec3(0.0);
  vec3 tangX = vec3(1.0, 0.0, 0.0);
  vec3 tangZ = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < NUM_WAVES; i++) {
    float k = uK[i];
    float A = uAmp[i];
    vec2 D = uDir[i];
    float f = k * dot(D, xz) - uOmega[i] * uTime;
    float s = sin(f), c = cos(f);
    float Q = uQ[i];
    disp.x += Q * A * D.x * c;
    disp.z += Q * A * D.y * c;
    disp.y += A * s;
    // derivatives
    float qak = Q * A * k;
    tangX.x -= qak * D.x * D.x * s;
    tangX.z -= qak * D.y * D.x * s;
    tangX.y += A * k * D.x * c;
    tangZ.x -= qak * D.x * D.y * s;
    tangZ.z -= qak * D.y * D.y * s;
    tangZ.y += A * k * D.y * c;
  }
  vec3 displaced = xzToVec(xz + disp.xz, disp.y) ...
  vec3 pos = vec3(p.x + disp.x, disp.y, p.z + disp.z);
  vec3 nrm = normalize(cross(tangZ, tangX));
  ...
}
```

Wait tangent vectors: careful, in the formula ∂P/∂x has x-component = tangX.x etc. Let me define tangX = (dPx/dx, dPy/dx, dPz/dx) and tangZ = (dPx/dz, dPy/dz, dPz/dz). And normal = normalize(cross(tangZ, tangX)). Verified earlier with flat: tangZ=(0,0,1), tangX=(1,0,0), cross = (0,1,0). ✓.

In my loop I wrote tangX.x, tangX.z, tangX.y — the .y for the derivative of y. And tangX.z for dPz/dx. ✓ matches formula.

vHeight = disp.y for foam.

Then the world position — since the ocean mesh is at origin with no rotation, model matrix is identity-ish. I'll set the ocean mesh position at y=0 and just use the position directly (or use modelMatrix for safety).

Fog: I need to apply fog manually in the ShaderMaterial: set `fog: true` and include fog chunks. With ShaderMaterial, `fog: true` provides `fogColor`, `fogNear`, `fogFar`, `fogDensity` uniforms automatically (via the ShaderChunk `fog_pars_fragment` etc. + the renderer's `refreshFogUniforms`). But we need to include `#include <fog_pars_vertex>`, `#include <fog_vertex>` and fragment versions. In vertex: `fog_vertex` chunk uses `vFogDepth = -mvPosition.z;` — requires `mvPosition` variable to exist. So I need to declare `vec4 mvPosition = viewMatrix * worldPosition;` in vertex shader. Let me just write it.

Let's write:
```glsl
#include <fog_pars_vertex>
...
void main(){
  ...
  vec4 mvPosition = viewMatrix * modelMatrix * vec4(pos, 1.0); // note: for ShaderMaterial, modelMatrix & viewMatrix are available
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
```
Wait, `fog_vertex` chunk is `#ifdef USE_FOG vFogDepth = - mvPosition.z; #endif`. So mvPosition must be defined. Good.

And `fog_pars_vertex` declares `varying float vFogDepth;` under USE_FOG.

USE_FOG define: ShaderMaterial with `fog: true` sets the FOG define? Actually the renderer sets `USE_FOG` define based on material.fog and scene.fog. Yes: in WebGLProgram, `parameters.fog && parameters.useFog ? '#define USE_FOG' : ''`. It's driven by `material.fog` and scene.fog. Good.

FogExp2 → FOG_EXP2 define also set. The chunks handle both.

Fragment fog chunk: `#include <fog_fragment>` uses `gl_FragColor` … actually it's:
```
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
```
It requires gl_FragColor. In modern three, the shader has `layout(location=0) out highp vec4 pc_fragColor` ... no, that's for the built-in materials. For raw ShaderMaterial, gl_FragColor is fine (three injects `#define gl_FragColor pc_fragColor`? Hmm). In Three.js WebGL2 GLSL3? Three uses GLSL1 by default for ShaderMaterial (glslVersion null → GLSL1 with gl_FragColor aliasing). Actually three's WebGLProgram prepends for WebGL2: `#define gl_FragColor pc_fragColor` ... Let me recall: In three r150+, the fragment shader prefix for WebGL2 includes:

```glsl
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
```
Hmm, that's only when glslVersion is GLSL3? Let me check: In WebGLProgram.js, for WebGL2 the prefixFragment includes `#define varying in`, `layout(location = 0) out highp vec4 pc_fragColor;`, `#define gl_FragColor pc_fragColor`, `#define gl_FragDepthEXT gl_FragDepth`, etc. Yes — that's in the `prefixFragment` for WebGL2 (it's applied to all fragment shaders, including ShaderMaterial, since `versionString` is '' for GLSL1 and the `#version 300 es` conversion... hmm, actually no).

Let me recall more carefully. In three.js WebGLProgram.js:

```js
if ( parameters.glslVersion === GLSL3 ) { ... }
```
And there's `prefixVertex`/`prefixFragment` construction. For WebGL2 (`isWebGL2`), there is a block:

```js
if ( isWebGL2 ) {
  ...
  prefixFragment = [
    '#version 300 es\n',
    ...
  ]
}
```
Hmm, no. Actually in three.js, the shader source is not automatically converted to GLSL3. The `gl_FragColor` is used directly and works because WebGL2 contexts still accept GLSL1 shaders (ES 1.00) unless `#version 300 es` is specified. Three.js does add `#version 300 es` only when glslVersion is GLSL3.

Wait, but three.js r160+ uses `#version 300 es` for all shaders? Let me think... I recall that three.js still uses GLSL1 by default and only uses GLSL3 when explicitly requested. The built-in materials work with gl_FragColor. Some newer versions added `pc_fragColor` handling for the `glslVersion = GLSL3` case. 

To be completely safe, I'll use `gl_FragColor` and manually implement fog rather than relying on the includes. Actually, simpler and safest: implement fog manually in my shader with my own uniforms (uFogColor, uFogDensity). But the requirement says "scene.fog that blends the far ocean into the horizon" — the ocean needs fog. I can set scene.fog for the built-in materials and manually match it in the water shader with my own uniforms. That's the safest and gives me control.

But then the sky... The Sky addon doesn't use fog. That's fine, the sky is the backdrop.

Actually, hmm, but if I use manual fog for water, I need to set the fog uniform values to match scene.fog. I'll do that: use THREE.FogExp2 with density, and in the shader compute `fogFactor = 1 - exp(-d*d*dist*dist)` using my uniforms. Simple and robust.

Even easier: I'll just include the fog chunks but use `gl_FragColor`. Let me avoid risk: manual.

Let me now also handle the `#include` needs — I'll write the shaders as plain strings, no includes. And write `gl_FragColor`. For maximum safety across versions, I could write the fragment output using a helper. Hmm. Three.js's ShaderMaterial with default glslVersion (null) compiles GLSL1 shaders, and in WebGL2 the browser accepts GLSL1 (ES 1.00) shaders. `gl_FragColor` is valid there. I'm confident that's fine.

Actually wait — three.js r152+ does have this in WebGLProgram:

```js
} else {
    prefixFragment = [ ... ].join('\n')
}
```
and in the `prefixFragment` array there's:
```
'#define gl_FragColor pc_fragColor' ... 
```
Hmm, I recall reading that in the built-in shader chunks (like `output_fragment` → `opaque_fragment`), it uses `gl_FragColor`. And the prefix includes `layout(location = 0) out highp vec4 pc_fragColor;` only in the WebGL2 + GLSL3 case... 

Let me just check my memory of three's WebGLProgram source (r160):

```js
const versionString = glslVersion ? '#version ' + glslVersion + '\n' : '';
...
if ( parameters.isWebGL2 ) {
  // nothing? 
}
```
Hmm, I actually recall this code:

```js
if ( isWebGL2 && parameters.glslVersion !== GLSL3 ) { ... }
```

I'm not 100% sure. But I strongly believe `gl_FragColor` works in three.js ShaderMaterial because it's the classic documented pattern (hundreds of examples use it). Yes — the official three.js examples (e.g. webgl_shader) use `gl_FragColor` in ShaderMaterial and work fine on WebGL2. Confirmed by memory. Good.

OK, continue.

Now, water fragment shading:
- vWorldPos, vNormal (world), vHeight.
- viewDir = normalize(cameraPosition - vWorldPos)
- fresnel = pow(1 - dot(N, V), 5) with base 0.02 → F = 0.02 + 0.98*pow(1-dot,5)
- deep color (0.004, 0.05, 0.09) shallow (0.02, 0.22, 0.28)
- sky reflection color: use a gradient based on reflect dir. I'll compute a simple sky color function: mix horizon color and zenith color based on reflected ray y.
- specular: Blinn-Phong with sun dir, high exponent.
- foam: smoothstep on vHeight near crest + noise, and shore foam from island height.
- Also add small high-frequency normal detail: perturb normal with a couple of sin terms computed from world position and time (no need for derivatives). But careful — this changes normals but not heights; acceptable as "detail".

Hmm, must be careful that detail doesn't look wrong. Keep it subtle.

Let's write the shader.

```glsl
varying vec3 vWorld;
varying vec3 vNrm;
varying float vH;

uniform float uTime;
uniform vec2 uDir[4];
uniform float uAmp[4];
uniform float uK[4];
uniform float uOmega[4];
uniform float uQ[4];

uniform vec3 uSunDir;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;
uniform float uFogDensity;
uniform vec3 uFogColor;
uniform float uIslandRadius; // for shore foam? need island function
```

For shore foam, I'll compute an approximate island height in the shader. Let me define a shared GLSL function:

```glsl
float islandH(vec2 p) {
  float ang = atan(p.y, p.x);
  float r = length(p);
  float wob = 1.0 + 0.16*sin(ang*3.0 + 1.2) + 0.10*sin(ang*5.0 - 0.7);
  float rr = r / (30.0 * wob);
  float t = clamp(1.0 - rr, 0.0, 1.0);
  float h = 9.5 * pow(t, 1.5) - 2.5;
  h += 0.9 * sin(p.x*0.28 + 1.3) * cos(p.y*0.31 - 0.8) * smoothstep(0.0, 0.35, t);
  return h;
}
```

Careful with pow(t, 1.5) for t=0 → 0. OK.

And in the JS island geometry I need the same function (with the same noise). I'll implement it identically in TS. The extra detail terms: `0.9*sin(x*0.28+1.3)*cos(z*0.31-0.8)*smoothstep(0,0.35,t)` — need smoothstep in JS too.

Actually for the JS side, I'll create the island as a radial grid mesh: center vertex + rings. Use a CircleGeometry with many segments and rings? A CircleGeometry has only 1 ring. Better: build a custom BufferGeometry with radial rings:

rings: R = 60 rings, segments = 128 → 60*128 = 7680 verts, fine. Radius up to 45.

Radius mapping: use r_i = 45 * (i/R)^1.2 maybe, or just linear with more density near shore. Linear is fine: 45/60 = 0.75 spacing. Good.

Actually a square grid might be simpler for normals & colors. Let's do a plane grid 90x90 with 90x90 segments (1 unit spacing) = 8100 verts, and cut out... no cutting — just let the outer parts be underwater (below the ocean). Since the ocean is opaque-ish, the underwater part of the island is hidden. Actually the ocean is transparent? Let's make it opaque. Then the underwater island is hidden. 

But the island grid at 90x90 with 1 unit spacing and the height function going to -2.5 at the edges — fine, hidden below the water surface except where waves dip. Hmm, waves amplitude 0.75 could expose terrain at y=-0.75. The island's edge at h=-2.5 is fine. Good. But we compute at radius 45: t = clamp(1 - 45/(30*wob),0,1) → negative → 0 → h = -2.5. Good, underwater everywhere beyond ~20*wob.

Hmm, with wob between 0.74 and 1.26, the island edge (h=0) is at r ≈ 0.591*30*wob ≈ 13 to 22. So the island above water is 26-44 across. Good: "about 30 to 50 units across".

Peak at r=0: t=1 → h = 9.5-2.5 = 7. Plus noise ±0.9. 7 units above water: "peak 5 to 15 units above the water" ✓.

Vertex colors: based on height and slope-ish. Compute in JS:
- h < 0.35 → sand (0.85, 0.78, 0.58)
- 0.35..1.6 → blend sand → grass
- grass (0.22, 0.45, 0.16)
- above 5 → blend to rock (0.45, 0.42, 0.38)
Add some noise variation.

Use MeshStandardMaterial with vertexColors: true, flatShading maybe false. Need normals: computeVertexNormals.

Plane geometry rotated -PI/2 about X so it lies in XZ. Then position attribute (x, y=0, z) with z = -planeY... Let's instead build the geometry manually to keep the mapping clear. Easier: create PlaneGeometry(90, 90, 90, 90), rotateX(-PI/2). After rotation, positions are (x, 0, z) where z corresponds. Then set y = islandHeight(x, z). Then computeVertexNormals. Good and simple.

Wait — PlaneGeometry(90,90,90,90) gives 91x91 = 8281 vertices. Fine.

Hmm, but 1-unit spacing with a peak of 7 gives fairly coarse shape; acceptable, and the noise adds detail. Let's use 128 segments over 96 units → 0.75 spacing, 16641 verts. That's fine too. Let's use 100 segments over 90 → 0.9.

Now palms: place at radius 6-14 from center, find the height, and place trunk base slightly below.

Palm construction:
- trunk: CatmullRomCurve3 from (0,0,0) curving out. Points: (0,0,0), (0.15,1.2,0.1) with offset, etc. Let's generate a curve that leans: p(t) = base + up*t*H + lean*t^2*dir*H*0.35. Use TubeGeometry(curve, 12, radius taper...). TubeGeometry has constant radius. Use a tube of radius 0.16 and then scale? Fine — constant radius is acceptable. Or build a custom tapered tube. Let's just use TubeGeometry with radius 0.18, radialSegments 6.

Actually, tapered trunk looks better. I can use a CylinderGeometry with segments and bend it via vertex modification... Let's keep TubeGeometry, simple. Radius 0.2 → looks chunky-ish at H=6. Use 0.16.

- crown: a small sphere/cone at the top.
- leaves: instanced.

Frond geometry: build a strip along +X? Let's define frond pointing along +Z with droop in Y. Hmm, for instancing with per-instance rotation, I'll define the frond local frame: origin at the crown, extending along +X, drooping in -Y.

Build: N=10 segments, length 2.4. For each i: t=i/N, x = t*L, y = -1.1*t*t, halfW = 0.30*Math.sin(Math.PI*Math.pow(t,0.6)) → width tapering. Actually make it: w = 0.34 * Math.sin(Math.PI * t^0.7)... at t=0 → 0, t=1 → 0. Good leaf shape.

Add a slight V-fold: z = ±w, y += -0.06*... nah.

Also add a slight jagged edge? Not needed. Use a texture-free double-sided material with color gradient via vertex colors (greener at base, lighter at tip).

Let's use MeshStandardMaterial({ color, side: DoubleSide, roughness: 0.8, metalness: 0 }). Or MeshLambert... Standard is fine.

Number of instances: 6 palms × 9 fronds = 54. Plus a couple of extra small ones = 60. ≥30 ✓.

Sway: for each instance, compute rotation: 
- base azimuth a = frond index * (2π/n) + palm offset
- tilt: frond droops from near-horizontal: angle from vertical ~ 75-100°.
- wind sway: multiply the tilt by (1 + 0.06*sin(time*1.6 + phase)) and add yaw wobble.

Compose the matrix:
dummy.position.copy(crownPos);
dummy.rotation.set(0, a, 0) then rotate around... Using Euler with order 'YXZ'? Let's do: dummy.rotation.set(0, a, 0); then apply a rotation about the local Z axis? Hmm, the frond extends along +X. To make it droop/point outward at an angle, rotate about Z by -45° (raises +X... rotating about Z by positive angle moves +X toward +Y). We want the frond to point outward and slightly up, then droop. Let's set base tilt around Z = +0.35 rad (pointing up-outward) and the geometry already droops downward. Then yaw around Y by azimuth a.

dummy.rotation.order = 'YXZ' → R = Ry(a) * Rx(0) * Rz(tilt). Applied to +X: Rz(tilt)*(1,0,0) = (cos tilt, sin tilt, 0) then Ry(a) rotates in XZ. Good.

So dummy.rotation.set(0, a, tilt, 'YXZ').

Sway: tilt += 0.08*sin(time*2.0 + phase + i), and a += 0.05*sin(time*1.3 + phase).

Good.

Scale: dummy.scale.setScalar(s).

Now the boat.

Hull: Let's make a nice hull shape. Use a LatheGeometry? No. Let's build a custom hull using a shape extrude or just a scaled BoxGeometry with rounded... 

Simplest good-looking: use a `THREE.BoxGeometry` scaled to a hull, plus a bow triangle? Let's do better: build a hull from a BufferGeometry with a few cross-sections (like a barge). Or use `CylinderGeometry` squashed? 

Let me build the hull procedurally: cross-sections along the length (z from -2 to 2), each an ellipse-ish half-section, with width tapering toward bow and stern, and a keel. That's a nice touch but takes code.

Alternative simple: 
- hull: BoxGeometry(1.6, 0.9, 4) with a taper... 

Let me do the procedural hull — it's not too bad.

Define function makeHull(): geometry with, for each station i (0..N), a "rib" — a closed loop of points in the XZ plane at y varying? Hmm.

Let me define the hull as a surface: for u along the length (t from 0 at stern to 1 at bow), half-width w(t) = W * sqrt(sin(pi*t))^0.7-ish... Actually a boat tapering at both ends: w(t) = W * (sin(pi*t))^0.6. At t=0 and 1, w=0.

Then the cross-section: for v from 0 (deck edge) to 1 (keel), x = w(t)*cos(v*pi/2)... and y = -depth*sin(v*pi/2). That gives a rounded V bottom. 

So positions: 
for i in 0..NS (stations), t=i/NS:
  for j in 0..NR (rib points), angle θ = j/NR * PI (from +x side to -x side):
    x = w(t)*cos(θ), y = -depth*sin(θ)... that's a semicircle from (w,0) to (-w,0) passing through (0,-depth). 
    z = (t-0.5)*length

That gives a smooth hull. Add a deck: a flat plane at y=0 covering the outline. Or just close the top with a flat cap: add a triangle fan / use the same stations with a flat quad strip. Simpler: add a separate deck mesh as a flat shape.

Actually, since the hull's top is open, from above you'd see inside. Add a deck: build a strip of quads along the top at y = 0.02 between -w(t) and +w(t). That's easy: for each station, two vertices (-w, 0.02, z) and (w, 0.02, z). 

I'll create the hull geometry and deck geometry in one function returning a BufferGeometry with a groups? Nah — just two geometries: hull (DoubleSide, since open) and deck.

Hmm, this is a fair bit of code but manageable. Let me be careful with indices.

Stations NS=12, ribs NR=8 (θ from 0 to π in NR+1 = 9 points). Vertices: 13*9 = 117. Indices: NS*NR*2 triangles = 12*8*2=192.

Let me write:

```ts
function buildHull(length = 4, beam = 1.7, depth = 0.9) {
  const NS = 14, NR = 8;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    const w = beam * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.55);
    const z = (t - 0.5) * length;
    for (let j = 0; j <= NR; j++) {
      const th = (j / NR) * Math.PI;
      const x = w * Math.cos(th);
      const y = -depth * Math.sin(th) * (0.6 + 0.4*Math.pow(Math.sin(Math.PI*t), 0.5));
      pos.push(x, y, z);
    }
  }
  ...
}
```
Hmm the y modulation makes it deeper amidships. Actually at t=0/1 w=0 so x=0 for all j and y = -depth*sin(θ)*0.6 — that creates a line at x=0 with varying y — degenerate triangles but fine.

Wait, at t=0, all points have x=0 and y ranging 0 to -0.54. That's the stem line. OK, acceptable (boat with pointed bow and stern). 

Indices: for i in 0..NS-1, j in 0..NR-1:
a = i*(NR+1)+j, b = a + (NR+1), c = b+1, d = a+1
triangles: (a,b,d) and (b,c,d)? Let's just use standard grid indexing:
```
idx.push(a, b, a+1);
idx.push(b, b+1, a+1);
```
Winding: whatever, use DoubleSide for the hull.

Deck: separate geometry, a triangle strip. For i in 0..NS, vertices at (-w_i, deckY, z_i) and (w_i, deckY, z_i). Then quads. Also close the bow/stern? w=0 there so it's fine.

Let me just make the deck a separate mesh with a wood color.

Cabin: BoxGeometry(0.9, 0.55, 1.4) at z = -0.3, y = 0.35. Color light. Plus a small roof.

Mast: CylinderGeometry(0.06,0.07,3,8) at z = 0.5, y = 1.5. 
Sail: a curved plane. Use PlaneGeometry(1.6, 2.2, 8, 8) with vertices bulged in z: z += 0.25*sin(pi*u)*... Let's build: for each vertex, bulge = 0.22 * Math.sin(Math.PI * (x/w + 0.5)) * Math.sin(Math.PI*(y/h+0.5))... something. Just a simple curve in x-direction.

Sail plane in XY plane, placed at mast, rotated. Sail as a mesh with DoubleSide, white-ish.

Boat local frame: forward = +Z (bow at +z). Length 4 along Z. ✓.

Boat position base (12, 0, 14) → radius 16.4 < 25 ✓. Drift: 
```
const t = time;
boatPos.x = 12 + 3*Math.sin(t*0.07);
boatPos.z = 14 + 3*Math.cos(t*0.05);
```
Radius up to ~19. < 25 ✓. But careful: drifts shouldn't be too fast. 3*0.07 = 0.21 units/s. Slow enough.

Heading: face roughly tangent to the drift, or just a fixed heading + slow oscillation. Let's set heading = 0.6 + 0.25*sin(t*0.05). 

Hull bottom offset: the hull's deepest point is -0.9. So set group y = heightAt + 0.55 so the keel is ~0.35 below the water surface... Actually we want the boat floating with the hull partially submerged: waterline around y_local = -0.4. So group.y = heightAt - (-0.4)?? If the waterline in local coords is at y = -0.4, then the group origin should be at waterHeight + 0.4. So `y = heightAt(x,z,t) + 0.35`. Good, that's the "constant offset".

Now, sampling heights: the boat is ~4 long, waves with L=17+ — pitch sampling over ±2 units is fine.

Let me also add a wake/foam? Not needed.

Now the sky. Sky addon:

```ts
import { Sky } from 'three/addons/objects/Sky.js';
const sky = new Sky();
sky.scale.setScalar(20000);
const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms;
skyUniforms['turbidity'].value = 5;
skyUniforms['rayleigh'].value = 2.2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;
skyUniforms['sunPosition'].value.set(...);
scene.add(sky);
```

Sky renders as a big box with `side: BackSide`, depthWrite false. It works with the camera far plane — need far > 20000? Actually Sky's scale 20000 means its box is 20000 wide, and camera far must be ≥ ~10000. Let's set camera far = 50000 and sky scale 10000. Actually the Sky shader `vertexShader` computes `gl_Position = projectionMatrix * mvPosition` and sets `gl_Position.z = gl_Position.w` typically to force depth = 1 (far plane). Let me recall Sky.js:

```glsl
gl_Position = projectionMatrix * mvPosition;
gl_Position.z = gl_Position.w; // set z to camera.far
```
Hmm, in newer versions it's `gl_Position.z = gl_Position.w;`? I think Sky.js does: 
```
vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
gl_Position = projectionMatrix * mvPosition;
```
Hmm. There's `sky.vertexShader` that does the standard thing. In the example, sky.scale.setScalar(450000) and camera far = 100000... Actually in webgl_shaders_sky example, camera far is 20000? Let me just use scale 20000 and camera far 40000. Also depthWrite is false for Sky's material? Sky's material has `side: BackSide, depthWrite: false` I believe. Either way, put sky at renderOrder = -1 or just add it first.

Since the ocean extends only 350 units, and far = 40000, the sky dome fills the background. Fine.

Also: with `renderer.toneMapping = ACESFilmic` and Sky's shader, the result may look washed out or over-bright; typical example uses exposure ~0.5. The Sky example uses `renderer.toneMappingExposure = 0.5`. Let's use 0.55.

Hmm, but the ocean/fog color must match the sky horizon. Since I'm using manual fog color for the water, I'll pick a color that approximates the sky near the horizon. Let's pick something like 0xbcd2e8 (light blue haze) — but with tone mapping applied to the water shader output... The water fragment output goes through tone mapping? For ShaderMaterial, tone mapping is NOT applied automatically (the renderer's tonemapping is applied in the built-in fragment chunk `tonemapping_fragment`). So my custom shader output won't be tone mapped → inconsistent with the rest.

Hmm. I can include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` in my fragment shader — those chunks operate on `gl_FragColor`. That works if the material is a ShaderMaterial and the renderer sets TONE_MAPPING defines... Actually the defines are set based on `renderer.toneMapping !== NoToneMapping` for all materials? In WebGLProgram, `parameters.toneMapping` comes from `renderer.toneMapping` only if `material.toneMapped !== false`. Yes: `toneMapping: material.toneMapped ? renderer.toneMapping : NoToneMapping`. And the prefix includes `#define TONE_MAPPING` and the tonemapping function. So including `<tonemapping_fragment>` works in a ShaderMaterial as long as `toneMapped` is true (default). 

Similarly `<colorspace_fragment>` handles output color space (sRGB encoding). In newer three it's `#include <colorspace_fragment>` (r152+). Since I don't know the exact version, risk. Hmm. `encodings_fragment` was the old name (pre r152). If the user installs a recent three (which they will, e.g. latest), `colorspace_fragment` exists.

To be safe, I could avoid includes entirely and do tone mapping + sRGB manually in my shader. That's fully version-independent except for the renderer's outputColorSpace handling. If renderer.outputColorSpace = SRGBColorSpace and my shader writes linear values to gl_FragColor, the renderer will... hmm, actually for ShaderMaterial, does three apply the output encoding conversion automatically? No — the conversion happens in the shader via the colorspace chunk. So if I don't include it, my colors will be written as-is (treated as sRGB values directly). That could actually be fine visually (I'd just tune colors in sRGB space).

Hmm, but then the water won't match tone-mapped geometry. Ugh.

Cleanest: do my own ACES tonemap + linear-to-sRGB in the water fragment shader manually. Then the water is tone-mapped consistently with the rest (approximately — ACESFilmic in three uses a slightly different implementation, the "ACESFilmicToneMapping" uses the same Narkowicz-ish curve with a 2.4 exposure factor... let me recall three's ACESFilmicToneMapping:

```glsl
vec3 ACESFilmicToneMapping( vec3 color ) {
  const mat3 ACESInputMat = mat3(...);
  ...
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return saturate(color);
}
```
Yes, three r150+ uses the full ACES fitted version with input/output matrices.

I can include that exact function manually in my shader. That's ~20 lines. Then multiply by toneMappingExposure. Then linear→sRGB.

Actually, simpler and quite reliable: use the includes `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` — but guard by not knowing version. Hmm.

Decision: write my own ACES + sRGB in the water shader, and set renderer.toneMapping = ACESFilmicToneMapping with exposure. Then the water matches built-ins closely.

Actually there's an even simpler option: set the water material's `toneMapped` and just include the chunks. But version uncertainty...

Let me just write the manual ACES matching three's implementation. I'll copy the standard three ACESFilmicToneMapping GLSL:

```glsl
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.98330 * v + 0.4329510) + 0.2381;
  return a / b;
}
vec3 ACESFilmic(vec3 color) {
  const mat3 ACESInputMat = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777)
  );
  const mat3 ACESOutputMat = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602)
  );
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
```
Note mat3 constructor in GLSL takes column vectors, so the above matches three's definition. Then `color *= toneMappingExposure` before (three does `vec3 toneMapped = ACESFilmicToneMapping( color * toneMappingExposure )`? Actually: 
```glsl
vec3 toneMapped = ACESFilmicToneMapping( color );
```
and exposure is applied earlier: in `tonemapping_pars_fragment` there's `uniform float toneMappingExposure;` and ACESFilmicToneMapping does `color *= toneMappingExposure;` at the start. Yes.

Then sRGB: `pow(color, vec3(1/2.2))` approximates; three uses the exact sRGB transfer:
```glsl
vec3 sRGBTransferOETF(vec3 value) {
  return mix(pow(value.rgb, vec3(1.0/2.4)) * 1.055 - 0.055, value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308))));
}
```
I'll use that.

OK. Let me set exposure to 0.6 and tune colors accordingly.

Hmm, but Sky (the addon) IS tone mapped (it's a ShaderMaterial with toneMapped default true and includes tonemapping in its shader?) Let me recall Sky.js fragment shader... It ends with:
```glsl
gl_FragColor = vec4( retColor, 1.0 );
```
Hmm, older versions don't apply tone mapping, and there's a `toneMapping` handling? In the current Sky.js:

```js
fragmentShader: /* glsl */`
  ...
  void main() {
    vec3 retColor = ...;
    gl_FragColor = vec4( retColor, 1.0 );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
```
Yes I'm fairly confident current Sky.js includes those chunks. OK.

So exposure affects the sky. With exposure 0.5-0.6 the sky looks right.

Alright, let's also think: the sun direction should match Sky's sunPosition. Sky's sunPosition uniform is a direction vector (the examples use `sun.setFromSphericalCoords(1, phi, theta)` and then `sky.material.uniforms['sunPosition'].value.copy(sun)`).

Then the DirectionalLight position = sunDir * 150.

Sun elevation ~ 25° for nice long shadows. Azimuth: let's put the sun behind-left so it lights the island and boat: azimuth 55°? Let's think: camera at (35,12,35) looking at origin, so the camera looks in direction (-1,-,-1)/... The sun should ideally be somewhat toward the camera side for a nice backlit look but that makes the water dark. Better: sun to the side and high: azimuth 130°, elevation 28°.

sunDir via setFromSphericalCoords(1, phi, theta): 
- phi = polar angle from +Y = 90° - elevation
- theta = azimuth measured from +Z toward +X (since setFromSphericalCoords uses: x = r*sinφ*sinθ, y = r*cosφ, z = r*sinφ*cosθ).

With elevation 28°, phi = 62°. theta = 130° → sinθ = 0.766, cosθ = -0.643.
sunDir = (sin62*0.766, cos62, sin62*(-0.643)) = (0.883*0.766, 0.469, -0.883*0.643) = (0.676, 0.469, -0.568).

So the sun is at +X, -Z, up. The camera is at +X,+Z. So the sun is roughly to the right and behind the scene → decent front-lighting from the camera's perspective? The light comes from (+X, -Z) toward the origin; camera at (35,12,35) looking at origin → direction of view = (-0.7,-0.2,-0.7). The sun is roughly perpendicular-ish. Fine, gives nice side lighting. Good.

Water specular: sun reflection on the water will be at the mirror direction... The camera is at +X+Z and the sun at +X-Z: the specular highlight would appear where the half-vector aligns. Should give a nice glint. Fine.

Fog color: sky near the horizon in the sun direction... let's use a warm-ish haze: 0xa8c4dd. Actually, use a color that matches the sky at the horizon opposite the sun. Let's just use a light blue-grey: new THREE.Color(0.62, 0.75, 0.86) in sRGB? For fog color, three's fogColor is in linear space when... hmm, scene.fog.color is a Color; the renderer converts it via `fogColor` uniform using the color's value directly (which is in sRGB-ish working space?). In three, `THREE.Color` values are interpreted as sRGB when set from hex with `setHex(hex, SRGBColorSpace)` — `Color` stores linear-sRGB if the color management is enabled (default since r152). So `new THREE.Color(0x9fc0dd)` stores linear values. Good.

For my manual fog in the water shader, I'll pass a uniform vec3 with the linear color: `new THREE.Color(0x9fc0dd)` value gives linear components. 

But careful — I also do tone mapping in the water shader. If the fog color goes through tone mapping, it'll get darkened/shifted. In built-in materials, fog is applied BEFORE tonemapping (fog_fragment comes before tonemapping_fragment). So to match, I should apply fog before tone mapping in my shader too. ✓ I'll do that.

For the sky to blend at the horizon: the sky is tone-mapped from its own HDR-ish values. With ACES and exposure 0.55, a sky horizon of ~ (0.9,0.95,1.0)-ish linear becomes lighter. Hmm, getting the exact blend is hard; approximate. Fog hides the ocean edge, so as long as the fog color is close to the sky horizon color it looks fine.

Let me estimate: Sky with turbidity 6, rayleigh 2.5, mieCoefficient 0.005, mieDirectionalG 0.8, and exposure 0.55 → I recall the webgl_shaders_sky example with exposure 0.5 gives a mid-blue sky with a warm horizon. The horizon near the sun is bright white-orange; away from the sun it's a pale blue.

I'll set the fog color to a pale blue: 0x9ec6e0-ish. With ACES tonemapping applied to fog color (0.62,0.77,0.88 sRGB → linear ~0.34,0.56,0.75) → *exposure 0.55 → (0.19,0.31,0.41) → ACES → roughly (0.4,0.55,0.64)? Then sRGB → ~ (0.66,0.77,0.82). Hmm, that's about the same as the input. Roughly identity-ish in the mid-tones. Fine.

I'll tune by feel; can't test. Let's go with a reasonably bright horizon-ish fog.

Actually — a simpler approach for blending: set the fog color equal to what the sky renders at the horizon. Let me approximate: at the horizon with the sun at 28° elevation and the view direction away from the sun, the sky is a soft blue-white. I'll use 0xaacbe8.

OK, moving on. Let me also make the water's sky reflection use a similar gradient so it looks coherent.

Now writing the code.

```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
```

Wait — 'three/addons/objects/Sky.js' requires the import map / bundler. Fine, that's stated.

Let's write it all.

```ts
// ---- Wave definitions (shared between JS and GLSL) ----
interface Wave { dir: THREE.Vector2; amp: number; k: number; omega: number; q: number; }

const WAVE_DEFS = [
  { angle: 0.32, wavelength: 110, amp: 0.38 },
  { angle: 2.35, wavelength: 57,  amp: 0.20 },
  { angle: -1.05, wavelength: 31, amp: 0.11 },
  { angle: 4.10, wavelength: 17,  amp: 0.06 },
];
```

Hmm, "different directions" ✓.

k = 2π/L, omega = sqrt(9.8*k)*0.55 — hmm, for L=110, k=0.0571, sqrt(9.8*0.0571)=0.748, *0.55 = 0.411 → period 15s. Fine (slow swell).
For L=17, k=0.3696, sqrt(3.62)=1.903, *0.55=1.047 → period 6s. Fine.

Hmm, waves with L=17 moving at omega/k = 1.047/0.3696 = 2.83 units/s. OK.

q (steepness) = 0.13 each → sum 0.52 < 1 ✓.

Q_i = q_i / (k_i * A_i). For wave 1: 0.13/(0.0571*0.38) = 0.13/0.0217 = 5.99. Horizontal amp = Q*A = 2.28. Reasonable for a swell.

heightAt(x,z,t) = Σ A_i * sin(k_i * (D.x*x + D.z*z) - omega_i * t).

Great.

Now the ocean geometry: PlaneGeometry(700, 700, 256, 256) rotated -PI/2 → y up. 257*257 = 66049 verts. That's ok. Triangles 131072. Fine for mid-range.

Hmm, 700x700 satisfies "at least 400x400" ✓.

Now the shader.

Vertex:
```glsl
uniform float uTime;
uniform vec2 uDir[4];
uniform float uAmp[4];
uniform float uK[4];
uniform float uOmega[4];
uniform float uQ[4];

varying vec3 vWorld;
varying vec3 vNrm;
varying float vH;

void main() {
  vec3 pos = position;
  vec2 xz = pos.xz;
  float h = 0.0;
  vec3 dpx = vec3(1.0, 0.0, 0.0);
  vec3 dpz = vec3(0.0, 0.0, 1.0);
  vec2 horiz = vec2(0.0);

  for (int i = 0; i < 4; i++) {
    float k = uK[i];
    float A = uAmp[i];
    vec2 D = uDir[i];
    float f = k * dot(D, xz) - uOmega[i] * uTime;
    float s = sin(f);
    float c = cos(f);
    float Q = uQ[i];
    float qak = Q * A * k;

    horiz += vec2(Q * A * D.x * c, Q * A * D.y * c);
    h += A * s;

    dpx.x -= qak * D.x * D.x * s;
    dpx.z -= qak * D.y * D.x * s;
    dpx.y += A * k * D.x * c;

    dpz.x -= qak * D.x * D.y * s;
    dpz.z -= qak * D.y * D.y * s;
    dpz.y += A * k * D.y * c;
  }

  vec3 displaced = vec3(xz.x + horiz.x, h, xz.y + horiz.y);
  vec3 nrm = normalize(cross(dpz, dpx));

  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorld = wp.xyz;
  vNrm = normalize(mat3(modelMatrix) * nrm);
  vH = h;

  gl_Position = projectionMatrix * viewMatrix * wp;
}
```

Note: PlaneGeometry rotated with `geometry.rotateX(-Math.PI/2)` so the mesh itself has identity rotation → modelMatrix is translation only. Good; but I use modelMatrix anyway.

Wait, `mat3(modelMatrix)` — three declares `uniform mat3 normalMatrix` but for our purposes `mat3(modelMatrix)` works fine (in GLSL ES 1.00, mat3(mat4) constructor is allowed? In GLSL ES 1.00, constructing a mat3 from a mat4 is allowed — "matrix constructors from a matrix" — yes, GLSL 1.20+ allows mat3(mat4)? Hmm. In GLSL ES 1.00 spec section 5.4.2: "A matrix can be constructed from a matrix by ... " Actually I recall GLSL ES 1.00 doesn't allow mat3(mat4). Let me check: The GLSL ES 1.00 spec says "If a matrix is constructed from a matrix, then... " Hmm, I believe `mat3(m4)` is valid in GLSL ES 1.00 — the spec says: "A matrix may be constructed from another matrix, in which case the ... " Let me not risk it. Since the model matrix is a pure translation here, I'll just use `nrm` directly (no transform) and compute vWorld = displaced + uOffset (or just use `modelMatrix[3].xyz`).

Actually, since I set the ocean mesh at position (0,0,0), modelMatrix = identity. I'll just use `displaced` as world pos and `nrm` as world normal. Simple and safe. I'll set the mesh position to origin. Good.

Hmm, but then cameraPosition is in world space and vWorld is world space ✓.

Fragment:
```glsl
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uExposure;

varying vec3 vWorld;
varying vec3 vNrm;
varying float vH;
```

Compute:
```glsl
// detailed normal perturbation
vec3 N = normalize(vNrm);
vec2 p = vWorld.xz;
float t = uTime;
// small ripples
float r1 = sin(p.x*1.7 + t*2.1) * cos(p.y*1.3 - t*1.7);
float r2 = sin(p.x*0.9 - p.y*1.1 + t*1.3);
N.x += 0.06 * (r1 + r2);
N.z += 0.06 * (r1 - r2);
N = normalize(N);
```
Hmm, r1 and r2 are in [-1,1]. This adds normal noise. Should look okay but might be too regular (sin patterns). Use a hash-noise? Keep it simple with a few sines at incommensurate frequencies. It's a detail on top of big waves; should be fine.

Actually, to avoid a visible grid pattern, use position-based sines with different frequencies and a rotation. Let's do:
```glsl
float n1 = sin(p.x*2.3 + p.y*1.1 + t*2.4);
float n2 = sin(p.x*-1.4 + p.y*2.7 - t*1.9);
float n3 = sin(p.x*3.7 - p.y*-0.8 + t*3.1);
```
and perturb along the wave-propagation-ish direction. Meh, I'll just add small offsets to N.x and N.z.

Then:
- V = normalize(cameraPosition - vWorld)
- fresnel: `float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);`
- reflected dir R = reflect(-V, N); skyCol = mix(uSkyHorizon, uSkyTop, clamp(R.y,0,1)^0.6)
- water base color: mix shallow/deep based on... use vH: deep in troughs, shallow at crests? Actually, near the shore use shallow. Let's mix by (vH normalized) plus foam.

Let's do:
```glsl
float crest = smoothstep(-0.2, 0.75, vH); // 0 trough, 1 crest
vec3 base = mix(uDeepColor, uShallowColor, crest * 0.55);
```
And shore blending: compute islandH(p) in the fragment shader; if the island height is > -3, the water is shallow there → blend to a turquoise. 

```glsl
float ih = islandH(vWorld.xz);
float shallowF = smoothstep(-4.0, 0.0, ih);  // 1 near/above water
base = mix(base, uShallowColor * 1.4, clamp(shallowF,0.0,1.0) * 0.8);
```
Also foam from the shore:
```glsl
float shoreFoam = smoothstep(0.35, -0.15, ih) * smoothstep(-1.2, -0.1, ih);
```
Hmm, let me define: foam where ih is between -0.9 and 0.1 roughly (at the shoreline). 
```glsl
float shoreBand = smoothstep(-1.4, -0.1, ih) * (1.0 - smoothstep(0.05, 0.5, ih));
```
That gives a band. Multiply by a wave-driven pulse: `0.6 + 0.4*sin(...)`. OK.

Crest foam:
```glsl
float foamN = noise(p*0.6 + t*0.3);
float crestFoam = smoothstep(0.62, 0.95, vH / maxAmp) ...
```
vH max = 0.75. Normalize: vHn = vH / 0.75. Crest foam where vHn > 0.75 → smoothstep(0.7, 1.0, vHn). Times noise. Should be subtle.

I'll write a small hash noise function:
```glsl
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1,0)), c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
```

Then specular:
```glsl
vec3 H = normalize(uSunDir + V);
float spec = pow(max(dot(N,H),0.0), 220.0) * 3.0;  // tight glint
// plus a broader sheen
spec += pow(max(dot(N,H),0.0), 24.0) * 0.25;
vec3 sunCol = uSunColor * spec;
```

Final:
```glsl
vec3 col = mix(base, skyCol, F);
col += sunCol;
col = mix(col, foamColor, foamAmount);  // foam after? foam should be shaded
```

Foam color: white-ish, lit by the sun: `vec3 foamCol = vec3(0.9) * (0.6 + 0.6*max(dot(N, uSunDir), 0.0))`. Simplify: foamCol = vec3(0.92, 0.96, 0.98).

Apply: `col = mix(col, foamCol, foamAmount)`.

Then fog:
```glsl
float dist = length(vWorld - cameraPosition);
float fogF = 1.0 - exp(-uFogDensity*uFogDensity*dist*dist);
col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
```

Then tone map and sRGB.

Note: my colors uSkyTop etc. — I should provide them in linear space. `new THREE.Color(0x...)` gives linear values (with color management on) — when I do `uniform.value = color`, three uploads color.r,g,b which are linear. Good. But my manual tone mapping expects linear inputs ✓.

Hmm, but careful: `THREE.Color.setHex(hex)` by default uses SRGBColorSpace conversion when `ColorManagement.enabled` — yes, since r152, `setHex(hex, colorSpace = SRGBColorSpace)` converts to working (linear) space. Good.

Now, gl_FragColor: I write the final sRGB-encoded color directly. Since three's renderer expects the fragment shader to output in the output color space (sRGB), and my shader does the conversion manually ✓.

But wait — three's WebGLRenderer may also apply `outputColorSpace` in the shader only (via the colorspace chunk), not on the framebuffer. So writing sRGB-encoded values to gl_FragColor is right. ✓

Alright.

Now let's make sure the sun direction in my shader matches: uSunDir = direction TOWARD the sun (normalized).

Let's write the code now.

```ts
const waveData = [ ... ];
const waveDirs: THREE.Vector2[] = [];
const waveAmp: number[] = [];
const waveK: number[] = [];
const waveOmega: number[] = [];
const waveQ: number[] = [];
```

heightAt:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < N; i++) {
    const d = waveDirs[i], k = waveK[i], A = waveAmp[i], w = waveOmega[i];
    h += A * Math.sin(k * (d.x * x + d.y * z) - w * t);
  }
  return h;
}
```

Note d.y is the z-component. ✓

Now, `__ocean.time()` returns the shader's current wave time. I'll maintain a `waveTime` variable incremented in the loop by delta, and pass it to the uniform.

Important: the boat uses heightAt(x,z,waveTime) so it matches the picture ✓.

Now the island height function in JS (matching GLSL):

```ts
function islandH(x: number, z: number): number {
  const ang = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  const wob = 1 + 0.16*Math.sin(ang*3 + 1.2) + 0.10*Math.sin(ang*5 - 0.7);
  const rr = r / (30*wob);
  const t = Math.min(Math.max(1 - rr, 0), 1);
  let h = 9.5*Math.pow(t, 1.5) - 2.5;
  h += 0.9*Math.sin(x*0.28 + 1.3)*Math.cos(z*0.31 - 0.8) * smoothstep(0, 0.35, t);
  return h;
}
```

smoothstep(edge0, edge1, x) standard.

Wait, Math.pow(t,1.5) where t≥0 ✓.

Hmm, but the peak: at r=0, t=1 → h = 9.5-2.5 = 7.0, plus noise ±0.9 → up to 7.9. ✓ within 5-15.

Island width: h=0 when 9.5*t^1.5 = 2.5 → t^1.5 = 0.263 → t = 0.409 → rr = 0.591 → r = 17.7*wob, wob ∈[0.74,1.26] → r ∈ [13.1, 22.3]. So ~26-45 across ✓.

For the island mesh, I'll use a plane of 100x100 units with 110 segments? That's 111^2 = 12321 verts. Wait, 100/110 = 0.9 spacing. Fine. But the corners at r=70 are far below water → hidden. Good. Actually let's use 90x90 with 100 segments → 0.9 spacing, 10201 verts. The island's max radius is 22, and the plane covers to 45 — enough.

Color computation in JS:
```ts
const c = new THREE.Color();
for each vertex:
  const y = ...;
  ...
```
Let's do:
- sand: 0xd9c89a? Let's use (0.82, 0.74, 0.55) linear-ish? For vertex colors with color management: setting via `color.setRGB(r,g,b, THREE.SRGBColorSpace)` or just `setHex`. Vertex colors are assumed to be in linear working space when ColorManagement is enabled? Actually, for `vertexColors: true`, three multiplies the vertex color attribute directly with the material color in the shader. The attribute values are used as-is (linear). So I should store linear values. If I use `new THREE.Color(0x...)` (which converts sRGB→linear), then `.r/.g/.b` are linear. 

So: build colors with THREE.Color objects and push their r,g,b. ✓

Sand: 0xd8c8a4, grass: 0x4a7a33, dark grass: 0x2f5a25, rock: 0x6b6a63.

```ts
function islandColor(x: number, z: number, y: number, out: THREE.Color) {
  const sand = new THREE.Color(0xd9c9a3);
  ...
}
```
Allocating Colors per-vertex is wasteful but it's only ~10k. Fine, or use static colors. Let's use static module-level colors.

Blend:
```ts
const t1 = smoothstep(0.15, 0.9, y);      // sand → grass
const t2 = smoothstep(4.2, 6.2, y);       // grass → rock
c.copy(sand).lerp(grass, t1).lerp(rock, t2);
// noise variation
const n = 0.9 + 0.2*Math.sin(x*1.7 + z*1.3) ...
c.multiplyScalar(n);
```
Also darken underwater parts (they're hidden anyway).

Also, add a bit of variation to grass color based on a noise.

Let's also add a beach ring — done via the height blend.

Now, the island receives shadows ✓ (mesh.receiveShadow = true), and casts shadows too (castShadow = true) — nice for palm shadows on the sand. The palm trunks cast shadows, leaves too.

Now let's write the palms.

```ts
const palmPositions: {x: number, z: number, h: number, scale: number}[] = [];
```
Choose 6 palms at various radii, ensuring they're above water: check islandH > 0.6.

Let's generate deterministically:
```ts
const palmSpots = [
  [4.5, 2.0], [-5.5, 3.5], [2.0, -6.0], [-3.0, -6.5], [7.5, -2.0], [-7.0, -3.0], [0.5, 7.0]
];
```
Check each: r must be < ~13 so they're on land with h > 0.7. Let's compute roughly: for r=7, wob at various angles... At r=7, rr = 7/(30*wob) = 0.233/wob ≈ 0.2-0.3 → t = 0.7-0.8 → h = 9.5*0.7^1.5 - 2.5 = 9.5*0.586-2.5=3.07. Good.

r=8: rr=0.267/wob → t≈0.68 → h=9.5*0.561-2.5=2.83. Fine.

All good. I'll filter by islandH(x,z) > 1.0 and place the trunk base there.

For each palm:
- height H = 4.5..6.5
- lean direction (random azimuth), lean amount 0.6..1.2
- crown position = base + (lean dir * lean, H, ...)

Trunk curve: 
```ts
const pts: THREE.Vector3[] = [];
for (let i=0;i<=4;i++){
  const t=i/4;
  pts.push(new THREE.Vector3(
    base.x + dirx*lean*t*t,
    base.y + H*t,
    base.z + dirz*lean*t*t
  ));
}
const curve = new THREE.CatmullRomCurve3(pts);
const geo = new THREE.TubeGeometry(curve, 14, 0.16, 6, false);
```
Hmm, TubeGeometry radius constant. Alternatively use `CylinderGeometry` per segment... TubeGeometry is fine. Actually for a taper I can modify: scale radius along the tube manually? Not easily. Just use 0.16 constant — fine at this scale? The trunk is 4.5-6.5 tall, radius 0.16 → looks thin but ok. Use 0.18.

Crown: sphere of radius 0.25 at the top, plus small coconut spheres. Keep it simple: a sphere.

Fronds: for each palm, nFronds = 9, arranged around.

frond instance data:
```ts
type Frond = { pos: THREE.Vector3, azim: number, tilt: number, len: number, phase: number };
```

Then each frame:
```ts
for (let i=0;i<fronds.length;i++){
  const f = fronds[i];
  const sway = Math.sin(time*1.7 + f.phase) * 0.13;
  const sway2 = Math.sin(time*2.6 + f.phase*1.7) * 0.07;
  dummy.position.copy(f.pos);
  dummy.rotation.set(0, f.azim + sway*0.5, f.tilt + sway + sway2, 'YXZ');
  dummy.scale.setScalar(f.scale);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```
`dummy.rotation.set(x,y,z,order)` — the Euler.set signature is (x,y,z,order?). ✓

But careful: `dummy.rotation.set(0, az, tilt, 'YXZ')` — with order YXZ, R = Ry*Rx*Rz. Rz(tilt) rotates +X toward +Y for positive tilt. Then Ry rotates around the vertical. So the frond points outward at an upward angle. ✓

Frond geometry: extends along +X from the origin, drooping in -Y as x increases. tilt ~ +0.25 rad gives a slight upward start, then the droop curve brings the tip down. Good.

Frond geometry built in local space with x from 0 to L=2.2, y = -0.9*(x/L)^2, width w(t).

Let's build:
```ts
function makeFrondGeometry(): THREE.BufferGeometry {
  const SEG = 12;
  const L = 2.3;
  const pos: number[] = [];
  const idx: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i <= SEG; i++) {
    const t = i/SEG;
    const x = t*L;
    const y = -1.0*t*t;
    const w = 0.38 * Math.sin(Math.PI * Math.pow(t, 0.65));
    // left and right vertices with a slight V fold
    pos.push(x, y + 0.05, -w);   // right (+z)
    pos.push(x, y + 0.05, w);    // left
    ...
  }
}
```
Hmm, better to make the leaf curve in z (spread) too. Keep simple.

Colors: base green darker, tip lighter:
```ts
const cA = new THREE.Color(0x2f6b23); const cB = new THREE.Color(0x63a83a);
```
lerp by t.

Indices: for i in 0..SEG-1: quad (2i, 2i+1, 2i+3), (2i, 2i+3, 2i+2).

Also add a central rib? Not needed.

Normals: computeVertexNormals with DoubleSide — fine.

Also add the leaf edges as jagged? no.

Fine. Material: MeshStandardMaterial({vertexColors:true, side: DoubleSide, roughness:0.85, metalness:0}). 

But with DoubleSide and thin flat leaves, lighting from behind will be dark. Set `flatShading: false`. Normals computed from the strip will point mostly +Y/-Y. With double side, three flips the normal for back faces. OK.

Now, the boat's sail: use a slightly curved plane. Let's build with a PlaneGeometry(1.9, 2.4, 10, 10) and displace z by a bulge, then position at the mast with rotation.y.

Actually the sail must be in the boat's local frame, at the mast. The mast is at local z=0.4, y from 0 to 3. Sail: a triangle-ish shape from the mast to the stern? Let's do a simple mainsail: vertices from (0, 2.9) near the top of the mast down to (0, 0.6) and out to (0, 0.4, -1.6)? 

Simplify: the sail is a plane in the local XY plane at z ≈ 0.35, spanning x ∈ [-0.05..1.6]? No — for a sail on a boat pointing along +Z, the sail plane should be in the YZ plane (facing ±X). So the sail spans z (from the mast at z=0.4 back to z=-1.4) and y (from 0.5 to 3.0). And it bulges in ±x.

Let's build the sail as a custom geometry:
```ts
const sailGeo = new THREE.PlaneGeometry(2.0, 2.4, 8, 8); // lies in XY plane
```
Then rotate the geometry -PI/2 about Y to put it in the ZY plane: after rotateY(-PI/2), x→? Let's just build it with a parametric approach.

Simplest: create PlaneGeometry(1, 1, 12, 12), then in the loop set positions manually:
- u = original x + 0.5 (0..1) → along z from mast (z=0.4) to stern (z=-1.5): z = 0.4 - 1.9*u
- v = original y + 0.5 (0..1) → height from 0.55 to 2.95: y = 0.55 + 2.4*v
- bulge: x = 0.45 * Math.sin(Math.PI*u) * (0.35 + 0.65*v)  — a billowing sail.

Set positions directly. Then computeVertexNormals.

Nice, that will look like a real sail. Sail color: off-white 0xf2efe6 or a warm cream.

Also add a jib? Keep it to mainsail.

Boat parts:
1. hull (custom, dark wood / white)
2. deck (wood)
3. cabin (white box + a small roof)
4. mast (cylinder, wood)
5. sail (custom, cream)
6. maybe a small flag. Optional.

That's ≥3 meshes ✓.

The whole group is __boat. Position it at (12,0,14) initially and update each frame.

Now shadows: directional light with shadow camera covering the island and boat. The island is ~45 wide centered at origin, the boat at (12,14). So ortho bounds ±35 centered at maybe (5, 0, 8). Let's set the light target at (6, 0, 6) and the shadow camera left/right/top/bottom ±40, near 1, far 400, with the light at sunDir*180 + target position.

Actually, the DirectionalLight's shadow camera is positioned at the light's position and looks at the target. Let's set:
```ts
sun.position.copy(sunDir).multiplyScalar(150);
sun.target.position.set(0, 0, 0);
scene.add(sun.target);
sun.shadow.camera.left = -45; right = 45; top = 45; bottom = -45; near = 20; far = 320;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
```
Distance from the light to the origin: 150. near 20, far 320 covers objects from 20 to 320 away along the light direction. Origin is at 150 → within range ✓.

Now the water should also receive shadows? Not necessary; skip (it's a custom shader).

The boat is within the shadow camera bounds: (12,14) is within ±45 ✓. But the shadow camera's ortho box must contain the boat considering the light direction — with ±45 around the origin and the light looking at the origin, roughly fine.

Hemisphere light: sky 0x9fc4e8, ground 0x3d5a4a, intensity 0.5. Plus ambient? Hemisphere is enough.

Also add `renderer.toneMappingExposure = 0.6`? Let me think about overall brightness. With ACES and exposure ~1.0, the scene will look normal. The Sky addon's output is quite bright (it's HDR-ish, values can exceed 1). In the sky example, exposure 0.5 is used to make it look good. Let's set 0.55 and tune the light intensities accordingly: sun intensity ~2.2, hemi 0.6. Since MeshStandardMaterial with intensity 2.2 * exposure 0.55... In three's newer lighting (physically correct by default since r155: `useLegacyLights = false`), directional light intensity is in "lux-ish" units — a value around 3 works with ACES. Let's use sun intensity 3.0 and hemi 0.8. Hmm, hard to guess. I'll use sun 2.8, hemi 0.9. Should be reasonable.

Actually careful: with `useLegacyLights = false` (default now), DirectionalLight intensity 1 gives roughly the same as before (the change affects point/spot lights mainly, dividing by 4π). For directional lights, the difference is negligible. So intensity ~2.5-3 is reasonable for ACES with exposure 0.55? Hmm, exposure 0.55 darkens everything. Then a directional light of 3 gives 1.65 effective. Standard material with albedo 0.5 and N·L=1 gives ~0.8. Fine.

Let's use toneMappingExposure = 0.62, sun 3.2, hemi 1.0.

Hmm, the sky at exposure 0.62 might be a bit bright; fine.

OK.

Also, `scene.fog = new THREE.FogExp2(0xa8c6e0, 0.0045)`. At 300 units: (0.0045*300)^2 = 1.82 → 1-exp(-1.82) = 0.84. At 400: (1.8)^2=3.24 → 0.96. Hmm, the ocean's visible far edge at 350 → 0.91 fog. Not fully fogged. Let's use density 0.006: at 350 → (2.1)^2=4.4 → 0.988 ✓. At 100 units → (0.6)^2=0.36 → 0.30 fog. That's a lot at 100 units (which is ~50 units beyond the boat). Hmm, maybe too foggy close by.

The camera is at distance ~51 from the origin. The boat at (12,14) is at distance sqrt(23²+21²)=31 from the camera. With d=0.006: (0.186)^2=0.035 → 3.4% fog. Fine.

The island's far side at ~40 units from the camera... fine.

Ocean at 200 units away → (1.2)^2 = 1.44 → 76% fog. Good, blends to the horizon.

Let's go with density 0.0058.

Hmm, but the ocean plane extends 350 from origin, and near the horizon in the view direction, the fog will make it fade to fog color around 250-350 units. Since the sky is behind it, there might be a visible color seam. I'll match the fog color to the sky horizon as best I can.

To be safer, I could make the fog color a bit brighter and desaturated so the transition is soft. Let's use 0xbcd4e6.

Now, let's write the actual code.

One more thing: `renderer.outputColorSpace = THREE.SRGBColorSpace;` — default in recent versions. Set explicitly.

`renderer.shadowMap.type = THREE.PCFSoftShadowMap`.

Also `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.

Let's write everything.

```ts
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// ============ Setup ============
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';  // hmm, canvas inline. Let's set style.
```
Set `renderer.domElement.style.display = 'block'` and body margin 0 → avoids scrollbars.

```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.5, 40000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);
```

FOV 50 at distance 51: the visible width at the origin ~ 2*51*tan(25°)=47 units. The island is 45 across. Good framing, plus the boat at (12,14). Hmm, the boat is at (12,14) which is 16.4 from the origin, at 31 from the camera; it will be in the right part of the frame. Fine.

Fog: FogExp2.

Now OrbitControls: "keep this view (OrbitControls are allowed if they start there and do not move by themselves)". I'll skip OrbitControls to avoid risk — the requirement says the camera must be at exactly (35,12,35) looking at (0,2,0). Without controls, that's simplest and safest.

Now writing the water.

I'll write the full shader strings.

Let me be careful about `uniform vec2 uDir[4]` etc. — In three, uniform arrays of Vector2 need `value: [v0,v1,v2,v3]`. That's supported for arrays of vectors ✓. For float arrays, `value: [0.1,0.2,...]` — actually three requires typed arrays or plain arrays for float arrays; plain arrays work ✓ (it uses `gl.uniform1fv(location, value)` with a Float32Array conversion via `flatten`).

Let me use `new Float32Array([...])` for float arrays to be safe.

Now the vertex shader with a `for (int i = 0; i < 4; i++)` loop — GLSL ES 1.00 requires constant loop bounds → 4 is a constant ✓. And indexing uniform arrays with a loop variable: in GLSL ES 1.00, dynamic indexing of uniform arrays IS allowed (only samplers and some things are restricted). Array indexing with a non-constant expression is allowed for uniform arrays? The spec says indexing must be with "constant-index-expression" for... hmm. In GLSL ES 1.00, "uniform arrays can be indexed with non-constant expressions" — actually the restriction is on samplers (must be constant-index-expression) and on arrays in general? Let me recall: GLSL ES 1.00 Appendix A: "Indexing of arrays: ... only with constant-index-expressions" for... no, that's for `varying` arrays and local arrays I think.

Hmm. In practice, three.js shaders loop over arrays with `for(int i=0;i<N;i++){ uniformArray[i] }` all the time (e.g., lights). Yes, that works fine on WebGL1 devices. ✓

Actually, since the loop variable is a uniform loop index (constant bounds) it's usually fine on all hardware. Let's go.

Now let me write it all out properly.

```ts
// --- Waves ---
const NUM_WAVES = 4;
const waveAngle = [0.35, 2.45, -1.02, 4.15];
const waveLen   = [110, 57, 31, 17];
const waveAmpJS = [0.38, 0.20, 0.11, 0.06];
const waveSteep = [0.13, 0.13, 0.13, 0.13];
```
Wait, "crest-to-trough height about 0.5 to 2 units": sum of amplitudes *2 = 1.5 ✓.

Directions: 
```ts
const dirs = waveAngle.map(a => new THREE.Vector2(Math.cos(a), Math.sin(a)));
```
d.x = cos, d.y = sin (which maps to z). ✓

k = 2π/L, omega = 0.55*sqrt(9.8*k), Q = steep/(k*A).

For wave 3 (L=31, A=0.11): k=0.2027, Q = 0.13/(0.2027*0.11) = 5.83, horizontal amp = Q*A = 0.64. Fine.

Let me just double check total steepness sum = 0.52 < 1 ✓ (no looping).

Now the ocean mesh:

```ts
const oceanGeo = new THREE.PlaneGeometry(700, 700, 256, 256);
oceanGeo.rotateX(-Math.PI / 2);
```

The material with side: THREE.DoubleSide? FrontSide is enough (plane faces +Y after rotation). Let's double-check: PlaneGeometry faces +Z; rotateX(-π/2) maps +Z to... Rx(-90°): (0,0,1) → (0, -sin(-90°)... let's compute: Rx(θ) = [[1,0,0],[0,cosθ,-sinθ],[0,sinθ,cosθ]]. θ=-π/2: cos=0, sin=-1. Rx = [[1,0,0],[0,0,1],[0,-1,0]]. Applied to (0,0,1) = (0,1,0). ✓ Faces +Y. Good.

Hmm, but the waves displace vertices and could flip winding if steep — with Q sum 0.52, no flips. Use FrontSide... but from the camera at y=12 looking down, we always see the top. Fine. Actually, let's use DoubleSide just in case? No, FrontSide is fine and cheaper.

Wait — one issue: the camera is above the water everywhere in view, so FrontSide is fine.

Let's write it.

Also: `mesh.frustumCulled = true` fine. But the displaced geometry might extend outside the bounding box... The displacement is ±2-ish, and the plane is 700 wide; the bounding sphere is huge anyway. Fine.

Now the ocean material needs `uniforms` including uTime, arrays, sun, colors, fog.

Let me write the shaders now in full.

```glsl
// vertex
uniform float uTime;
uniform vec2 uDir[4];
uniform float uAmp[4];
uniform float uK[4];
uniform float uOmega[4];
uniform float uQ[4];

varying vec3 vWorld;
varying vec3 vNrm;
varying float vH;

void main() {
  vec2 xz = position.xz;
  float h = 0.0;
  vec2 horiz = vec2(0.0);
  vec3 dpx = vec3(1.0, 0.0, 0.0);
  vec3 dpz = vec3(0.0, 0.0, 1.0);

  for (int i = 0; i < 4; i++) {
    float k = uK[i];
    float A = uAmp[i];
    vec2 D = uDir[i];
    float w = uOmega[i];
    float Q = uQ[i];
    float f = k * dot(D, xz) - w * uTime;
    float s = sin(f);
    float c = cos(f);
    float qak = Q * A * k;

    h += A * s;
    horiz += vec2(Q * A * D.x * c, Q * A * D.y * c);

    dpx.x -= qak * D.x * D.x * s;
    dpx.z -= qak * D.x * D.y * s;
    dpx.y += A * k * D.x * c;

    dpz.x -= qak * D.x * D.y * s;
    dpz.z -= qak * D.y * D.y * s;
    dpz.y += A * k * D.y * c;
  }

  vec3 p = vec3(xz.x + horiz.x, h, xz.y + horiz.y);
  vec3 nrm = normalize(cross(dpz, dpx));

  vWorld = p;
  vNrm = nrm;
  vH = h;

  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
```

Since modelMatrix = identity, using `p` directly as world is fine (ocean mesh at origin, no rotation/scale). ✓ I'll keep the mesh at origin.

Fragment:

```glsl
precision highp float;

uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uAmpSum;

varying vec3 vWorld;
varying vec3 vNrm;
varying float vH;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float islandH(vec2 p) {
  float ang = atan(p.y, p.x);
  float r = length(p);
  float wob = 1.0 + 0.16 * sin(ang * 3.0 + 1.2) + 0.10 * sin(ang * 5.0 - 0.7);
  float rr = r / (30.0 * wob);
  float t = clamp(1.0 - rr, 0.0, 1.0);
  float h = 9.5 * pow(t, 1.5) - 2.5;
  h += 0.9 * sin(p.x * 0.28 + 1.3) * cos(p.y * 0.31 - 0.8) * smoothstep(0.0, 0.35, t);
  return h;
}

vec3 acesFilmic(vec3 color) { ... }

void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNrm);

  // fine ripple detail
  vec2 q = vWorld.xz;
  float tp = uTime;
  float n1 = sin(q.x * 1.9 + q.y * 0.7 + tp * 2.3);
  float n2 = sin(q.x * -1.1 + q.y * 2.3 - tp * 1.7);
  float n3 = sin(q.x * 0.6 - q.y * 3.1 + tp * 2.9);
  N.x += (n1 * 0.05 + n2 * 0.04);
  N.z += (n2 * 0.05 + n3 * 0.045);
  N = normalize(N);
  ...
}
```

Hmm — adding 0.05-0.09 to a normal that's mostly (0,1,0) creates up to ~6° tilt. Reasonable sparkle.

Then:

```glsl
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  fres = clamp(fres, 0.0, 1.0);

  vec3 R = reflect(-V, N);
  float skyT = clamp(R.y, 0.0, 1.0);
  vec3 skyCol = mix(uSkyHorizon, uSkyTop, pow(skyT, 0.65));
  // sun glow in the reflection
  float sunDot = max(dot(R, uSunDir), 0.0);
  skyCol += uSunColor * pow(sunDot, 60.0) * 1.2;
  skyCol += uSunColor * pow(sunDot, 8.0) * 0.12;

  // base water colour
  float crest = smoothstep(-0.35, 0.6, vH);
  vec3 base = mix(uDeep, uShallow, crest * 0.5);

  float ih = islandH(vWorld.xz);
  float shallowF = clamp(smoothstep(-5.0, 0.5, ih), 0.0, 1.0);
  base = mix(base, uShallow * 1.3 + vec3(0.02, 0.12, 0.10), shallowF * 0.85);

  vec3 col = mix(base, skyCol, fres);

  // specular
  vec3 H = normalize(uSunDir + V);
  float nh = max(dot(N, H), 0.0);
  float spec = pow(nh, 320.0) * 2.5 + pow(nh, 40.0) * 0.22;
  col += uSunColor * spec;
```

Then foam:

```glsl
  float foamNoise = vnoise(vWorld.xz * 0.55 + vec2(tp * 0.25, -tp * 0.18));
  float foamNoise2 = vnoise(vWorld.xz * 1.7 - vec2(tp * 0.4, tp * 0.3));

  float crestMask = smoothstep(0.72, 1.0, vH / uAmpSum);
  float foam = crestMask * smoothstep(0.45, 0.85, foamNoise) * 0.85;

  // shore foam
  float band = smoothstep(-1.6, -0.25, ih) * (1.0 - smoothstep(0.15, 1.2, ih));
  float pulse = 0.55 + 0.45 * sin(tp * 1.6 + vWorld.x * 0.4 + vWorld.z * 0.35);
  float shoreFoam = band * clamp(pulse, 0.0, 1.0) * smoothstep(0.25, 0.75, foamNoise2);
  foam = clamp(foam + shoreFoam * 1.1, 0.0, 1.0);

  vec3 foamCol = vec3(0.86, 0.92, 0.95) * (0.55 + 0.75 * max(dot(N, uSunDir), 0.0));
  col = mix(col, foamCol, foam * 0.9);
```

Hmm, careful: `vH/uAmpSum` where uAmpSum = 0.75. Crest mask at vH>0.54 → smoothstep(0.72,1.0) → vH/0.75 > 0.72 means vH>0.54. OK.

Then fog:

```glsl
  float dist = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
  // also fade toward horizon slightly
  col = toneMap(col);
  gl_FragColor = vec4(col, 1.0);
```

Wait: fog color should be in linear space (as THREE.Color value) so mixing before tone mapping is right ✓.

Note: `pow(t, 1.5)` in GLSL — for t ≥ 0, fine.

One concern: `smoothstep(0.0, 0.35, t)` in islandH — matches the JS smoothstep(0,0.35,t) ✓.

Now, in the JS island function I must use exactly the same. ✓

Now the ACES function:

```glsl
vec3 rrtOdt(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.98330 * v + 0.4329510) + 0.2381;
  return a / b;
}
vec3 toneMapACES(vec3 color) {
  const mat3 inMat = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  const mat3 outMat = mat3(
    1.60475, -0.10208, -0.00327,
    -0.53108, 1.10813, -0.07276,
    -0.07367, -0.00605, 1.07602
  );
  color *= uExposure;
  color = inMat * color;
  color = rrtOdt(color);
  color = outMat * color;
  return clamp(color, 0.0, 1.0);
}
```
`const mat3` with a constructor initializer — is that allowed in GLSL ES 1.00? "const" variables must be initialized with a constant expression; matrix constructors with constant args are constant expressions. It's allowed in GLSL ES 1.00? I believe `const mat3 m = mat3(...)` is fine in ES 1.00 as long as the initializer is a constant expression. Yes — three's own tonemapping_pars_fragment declares `const mat3 ACESInputMat = mat3(...)` and it works on WebGL1. ✓

Then sRGB:
```glsl
vec3 toSRGB(vec3 c) {
  return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, step(c, vec3(0.0031308)));
}
```
Note: `step(c, vec3(0.0031308))` returns 1 when 0.0031308 >= c, i.e. when c <= threshold → use linear part. ✓ (mix(a,b,t) with t=1 gives b). So mix(srgbCurve, linear, step...) → when c small, step gives 1 → picks c*12.92 ✓.

Careful with `pow(c, ...)` for c=0 → 0 ✓ (fine).

OK.

Now let's assemble everything and be careful with TypeScript strictness.

Type issues:
- `sky.material` is a `ShaderMaterial` — Sky extends Mesh with material typed as... In three's Sky.d.ts, `Sky` extends `Mesh<BoxGeometry, ShaderMaterial>`? Let me check the types: three/addons/objects/Sky.d.ts:
```ts
export class Sky extends Mesh<BoxGeometry, ShaderMaterial> {
    readonly isSky: true;
    constructor();
    ...
}
```
Hmm, I'm not 100% sure of the exact typing. In the DefinitelyTyped @types/three, Sky is:
```ts
export class Sky extends Mesh {
    readonly isSky: true;
    constructor();
    static SkyShader: object;
    uniforms: ... 
}
```
Hmm, older typings might have `material: Material` from Mesh. Casting to ShaderMaterial: `const skyMat = sky.material as THREE.ShaderMaterial;` — if mesh.material is typed as `Material | Material[]`, the cast works... `as THREE.ShaderMaterial` from `Material | Material[]` might error "Conversion of type ... may be a mistake". Hmm, `Material | Material[]` → `ShaderMaterial`: TS allows a cast if the types are "comparable". ShaderMaterial is a subtype of Material, and Material[] is not. Actually for a union source, the cast succeeds if any member overlaps. I think it's fine, but to be safe use `as unknown as THREE.ShaderMaterial`.

Let's use `const skyMat = sky.material as unknown as THREE.ShaderMaterial;`.

Similarly for the ocean: I create `new THREE.ShaderMaterial(...)` so it's typed.

Accessing uniforms: `skyMat.uniforms['turbidity'].value = 5;`. With ShaderMaterial typed, `uniforms` is `{ [uniform: string]: IUniform }`. Indexing is fine.

Hmm, with `noUncheckedIndexedAccess`? Not part of `--strict`. `--strict` doesn't include noUncheckedIndexedAccess. So `uniforms['turbidity']` is `IUniform` (not undefined). ✓

Now, the Sky's uniforms names: 'turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition', 'up'. ✓

Let's write.

Also note: `Sky` shader needs `scene.add(sky)`. And it's huge; set `sky.scale.setScalar(20000)` and camera far 40000. Hmm, but the sky mesh is centered at the origin, so its box extends ±10000. The camera at (35,12,35) is inside ✓. Far plane 40000 ✓.

Hmm, Sky's material has `depthWrite: false` and `side: BackSide`? Not sure about depthWrite; it renders as background. It's fine.

Fog: the Sky material has fog disabled? If scene.fog exists and Sky's material.fog is true (default), the sky would be fogged... but the Sky's shader doesn't include fog chunks, so no effect. ✓ Actually, ShaderMaterial.fog defaults to false. ✓

Now, does the Sky render before or after other objects? With depthWrite false and depthTest... The sky's vertices are at distance ~10000-20000; with the Sky shader forcing gl_Position.z = gl_Position.w? Let me recall Sky.js vertex shader:

```glsl
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position.z = gl_Position.w; // set z to camera.far
}
```
Yes, I'm quite sure it sets z = w so it's at the far plane. Good, it always renders behind.

OK. Now the shadow from the sun and everything.

Let me write out the entire file now.

```ts
// ---------- helpers ----------
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
```

Careful: when e0 === e1, division by zero → Infinity → clamp → fine-ish. Not an issue here.

Island:

```ts
function islandHeight(x: number, z: number): number {
  const ang = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  const wob = 1 + 0.16 * Math.sin(ang * 3 + 1.2) + 0.10 * Math.sin(ang * 5 - 0.7);
  const rr = r / (30 * wob);
  const t = clamp(1 - rr, 0, 1);
  let h = 9.5 * Math.pow(t, 1.5) - 2.5;
  h += 0.9 * Math.sin(x * 0.28 + 1.3) * Math.cos(z * 0.31 - 0.8) * smoothstep(0, 0.35, t);
  return h;
}
```

Now island mesh:

```ts
const islandGeo = new THREE.PlaneGeometry(96, 96, 108, 108);
islandGeo.rotateX(-Math.PI / 2);
const ip = islandGeo.attributes.position as THREE.BufferAttribute;
const colors = new Float32Array(ip.count * 3);
const cSand = new THREE.Color(0xd7c49a);
const cWetSand = new THREE.Color(0xb9a678);
const cGrass = new THREE.Color(0x3f7a2e);
const cGrass2 = new THREE.Color(0x6ba03f);
const cRock = new THREE.Color(0x7a756b);
const tmpC = new THREE.Color();
for (let i = 0; i < ip.count; i++) {
  const x = ip.getX(i), z = ip.getZ(i);
  const y = islandHeight(x, z);
  ip.setY(i, y);
  // color
  ...
}
ip.needsUpdate = true; // not necessary before first render
islandGeo.computeVertexNormals();
```

Wait: after rotateX, position attributes are (x, 0, z) where the original plane's y becomes -z or +z. Doesn't matter, x and z are what I need.

Hmm, careful: PlaneGeometry(96,96,108,108) after rotateX(-π/2): x stays, y→? Rx(-90°): (x,y,0) → (x, 0*... ) Let's compute: Rx(-π/2) = [[1,0,0],[0,0,1],[0,-1,0]]. (x,y,0) → (x, 0, -y). So the z coordinate = -y_orig. Doesn't matter.

Vertices: 109*109 = 11881 ✓.

Color assignment:

```ts
for each vertex:
  const y = ...;
  const nz = 0.5 + 0.5 * Math.sin(x * 0.8 + z * 0.6) * Math.cos(x * 0.31 - z * 0.77);
  // sand -> grass
  const tg = smoothstep(0.55, 1.9, y + nz * 0.35);
  const tr = smoothstep(4.0, 6.3, y + nz * 0.6);
  tmpC.copy(cSand).lerp(cGrass, tg);
  tmpC.lerp(cGrass2, tg * 0.45 * nz);
  tmpC.lerp(cRock, tr);
  // darken wet sand near/below water
  const wet = 1 - smoothstep(0.05, 0.7, y);
  tmpC.lerp(cWetSand, wet * 0.65);
```
Hmm, careful with the order of lerps. It's fine.

Then push tmpC.r/g/b (linear values) ✓.

Colors array set as `islandGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))`.

Material: `new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0, flatShading: false })`. 

Hmm, for a slightly stylized look, flatShading could be nice, but smooth is more "realistic". Keep smooth.

Add `island.castShadow = true; island.receiveShadow = true;` — castShadow on a 96x96 plane will render a lot into the shadow map but that's fine.

Hmm, but the plane extends underwater to ±48, casting shadows on... nothing below. Fine.

`scene.add(island); (window as any).__island = island;` — expose the Mesh ✓.

Now, the shadow map covers ±45 and the island is ±48; the edges are underwater/hidden. Fine.

Now palms.

```ts
const palmSpots: [number, number][] = [
  [4.0, 1.5], [-5.5, 3.0], [1.5, -5.0], [-3.5, -6.0], [7.5, -2.5], [-7.0, -2.0], [0.0, 6.5]
];
```
Check heights: at r≈4.3, t≈1-4.3/(30*wob)≈0.85 → h = 9.5*0.784-2.5 = 4.95 ✓
r=6.3 (spot -5.5,3): t≈1-6.3/30 = 0.79 (assuming wob=1) → h=9.5*0.702-2.5=4.17 ✓
r=8.0 (7.5,-2.5): t≈0.733 → h=9.5*0.627-2.5=3.46 ✓
r=6.5 (0,6.5): h≈4.1 ✓

All good, above water.

For each spot, base y = islandHeight - 0.1.

Palm creation with a deterministic pseudo-random from a seed.

```ts
function rand(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
```
Careful with TS types. Fine.

Let me use a simple LCG.

Trunk: 
```ts
const H = 4.2 + rnd() * 2.2;
const leanDir = rnd() * Math.PI * 2;
const leanAmt = 0.8 + rnd() * 1.4;
const lx = Math.cos(leanDir), lz = Math.sin(leanDir);
const pts: THREE.Vector3[] = [];
for (let i = 0; i <= 4; i++) {
  const t = i / 4;
  pts.push(new THREE.Vector3(
    baseX + lx * leanAmt * t * t,
    baseY + H * t,
    baseZ + lz * leanAmt * t * t
  ));
}
const curve = new THREE.CatmullRomCurve3(pts);
const trunkGeo = new THREE.TubeGeometry(curve, 16, 0.17, 6, false);
```
Hmm, TubeGeometry's radius is constant; a taper would be nicer but let's keep it.

Wait — TubeGeometry with 16 tubular segments and 6 radial segments = 17*7 = 119 verts per palm. 7 palms → fine.

Actually, let me scale the radius along the tube by modifying the position attribute? Complicated. Skip.

Crown position: the curve's end point = base + (lx*leanAmt, H, lz*leanAmt).

Add a crown sphere (icosahedron, low poly, radius 0.28) — dark brown/green.

Merging: To keep the draw call count low, I could merge all palm trunks into one geometry. seven trunks = 7 draw calls; fine either way. Let's keep them as separate meshes added to a `palms` Group. Actually let's just add them to the scene directly. Each casts shadows.

Fronds: build the frond geometry once. Then an InstancedMesh with count = palms * frondsPerPalm.

```ts
const frondsPerPalm = 9;
const totalFronds = palmSpots.length * frondsPerPalm;
const leaves = new THREE.InstancedMesh(frondGeo, frondMat, totalFronds);
leaves.castShadow = true;
leaves.receiveShadow = false; // thin leaves
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
```

For each palm i, for each frond j:
- azimuth a = (j / n) * 2π + palmPhase
- tilt base = 0.15 + rnd()*0.25 (radians above horizontal) — hmm, the frond geometry starts at y=0 and droops. With tilt 0.2 rad, the base points slightly up, and the tip droops 1.0*... The geometry droops 1.0 over length 2.3 → about -23°. With tilt +0.2 (+11°), the tip is at about -12°. Good.
- Actually, some fronds should be more upright. Vary tilt from -0.1 to +0.5.
- scale 0.8-1.1

Frond instance position = crown position + a small offset upward (0.1).

Storing fronds:
```ts
interface FrondData { x:number;y:number;z:number;az:number;tilt:number;scale:number;phase:number; }
const frondData: FrondData[] = [];
```

Update per frame:
```ts
for (let i = 0; i < frondData.length; i++) {
  const f = frondData[i];
  const sw = Math.sin(waveTime * 1.9 + f.phase) * 0.10 + Math.sin(waveTime * 3.1 + f.phase * 2.1) * 0.05;
  dummy.position.set(f.x, f.y, f.z);
  dummy.rotation.set(0, f.az + sw * 1.2, f.tilt + sw, 'YXZ');
  dummy.scale.setScalar(f.scale);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```
Note `dummy.rotation.set(x, y, z, order)` — the Euler.set signature is `set(x, y, z, order?)`. ✓

Hmm, but `dummy` is an Object3D; `dummy.rotation.set(0, az, tilt, 'YXZ')` — TS: `Euler.set(x: number, y: number, z: number, order?: EulerOrder): Euler`. 'YXZ' is a valid EulerOrder ✓.

Also note that when using `dummy.updateMatrix()`, the Object3D's matrix composes from position/quaternion/scale. Setting `dummy.rotation` updates the quaternion via the onChange callback ✓.

Now the boat.

```ts
function buildHull(): THREE.BufferGeometry { ... }
```

Let me write it:

```ts
function buildHullGeometry(): THREE.BufferGeometry {
  const NS = 16;
  const NR = 8;
  const length = 4.0;
  const beam = 1.7;
  const depth = 0.85;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    const s = Math.sin(Math.PI * t);
    const w = beam * 0.5 * Math.pow(s, 0.5);
    const z = (t - 0.5) * length;
    const dm = 0.55 + 0.45 * Math.pow(s, 0.7);   // depth factor
    for (let j = 0; j <= NR; j++) {
      const th = (j / NR) * Math.PI;
      const x = w * Math.cos(th);
      const y = -depth * Math.sin(th) * dm;
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NR; j++) {
      const a = i * (NR + 1) + j;
      const b = a + (NR + 1);
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
```

Wait, at j=0, th=0 → x = w, y = 0 (deck edge). At j=NR, th=π → x = -w, y = 0. But -depth*sin(π)*dm = 0 ✓. Good — this gives the hull's cross-section as a semicircle from the starboard deck edge down to the keel at th=π/2 (x=0, y=-depth*dm) and back up to port. ✓

The bow (t=1) has w=0 → all x=0, y from 0 to -depth*0.55... hmm, dm at t=1: s=0 → dm=0.55, so the stem is a vertical line from y=0 to y=-0.467 at x=0. That's a bit odd but acceptable — it gives a pointed bow.

Hmm, actually the deck edge at the bow is a single point at (0,0,z). Good.

At the stern (t=0), same. So the boat has pointed bow and stern. That's fine for a small boat.

The deck: build a strip from (w, deckY, z) to (-w, deckY, z).

Let me make a separate geometry:
```ts
function buildDeckGeometry(): THREE.BufferGeometry {
  const NS = 16, length = 4.0, beam = 1.7;
  const pos: number[] = []; const idx: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    const w = beam * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.5);
    const z = (t - 0.5) * length;
    pos.push(w, 0, z, -w, 0, z);
  }
  for (let i = 0; i < NS; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  ...
}
```
Wait: vertices at index 2i = (w, 0, z), 2i+1 = (-w, 0, z). Quad between i and i+1: (2i, 2i+1, 2i+2, 2i+3). Triangles: (2i, 2i+1, 2i+2) and (2i+1, 2i+3, 2i+2). Normal direction: depends. Set material side DoubleSide to be safe, or compute normals and check. Use DoubleSide for the deck too — cheap.

Hmm, actually let's just use `side: THREE.DoubleSide` for the hull and deck. Simple.

Deck y = 0 (the top of the hull). Slight offset 0.02? The hull's top edge is at y=0, so the deck at y=0 coincides ✓.

Wait, there's a problem: the deck strip's width uses the same w as the hull's top edge, which is exactly the deck edge ✓.

Cabin: BoxGeometry(0.85, 0.5, 1.3), position (0, 0.27, -0.55). Wait, the boat's forward is +Z, so the cabin should be toward the stern (-Z) ✓. And the mast at z = +0.6.

Hmm, but if the bow is at z=+2 and the stern at z=-2, and the mast at +0.6, the sail extends backward from z=0.6 to about z=-1.2. It would overlap the cabin at z=-0.55 with height 0.5 (top at y=0.5). The sail starts at y=0.55. OK, no overlap. 

Actually let's move the