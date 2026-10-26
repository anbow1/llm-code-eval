I need to write one complete TypeScript file. Let me plan carefully.

Key requirements:
- Import three as THREE, addons.
- Renderer, canvas appended to body, resize handling.
- setAnimationLoop, delta-based motion.
- Expose __scene, __camera, __renderer, __ready after first frame, __ocean with heightAt and time, __boat, __leaves, __island, __sun.
- Ocean: ShaderMaterial with vertex displacement (sum of 3+ directional waves, Gerstner), fragment shading with deep/shallow color, fresnel sky reflection, sun specular, foam.
- heightAt JS must match shader: same wave parameters, sum of vertical displacements at (x,z,t). Use Gerstner waves; JS computes vertical component (ignoring horizontal shift as allowed).
- Boat: primitives, group, ~4 units long, at (12,0,14), floats following heightAt, pitch/roll from slopes. Casts shadows.
- Island: procedural, ~30-50 across, peak 5-15 above water, vertex colors sand/grass/rock. Receives shadows.
- Palms: curved trunks, crown leaves — ALL leaves as ONE InstancedMesh >= 30 instances, sway in wind each frame by updating instance matrices. Expose __leaves.
- Sky addon or gradient dome; sun DirectionalLight casting shadows covering island+boat; hemisphere light; fog; ACES tone mapping; sRGB output.
- Camera at exactly (35,12,35) looking at (0,2,0); OrbitControls allowed.
- Ocean grid ≤ 256x256, shadow maps ≤ 2048.

Implementation details:

Gerstner waves: define N=4 waves. Each wave: direction (dx,dz) normalized, amplitude a, wavelength L, speed c. Steepness Q.

Wave function in GLSL:
```
vec3 gerstner(vec2 p, float t, ...) {
  float k = 2π/L;
  float f = k * (dot(dir, p) - c * t);
  float a = amplitude;
  x += Q * a * dir.x * cos(f);
  z += Q * a * dir.y * cos(f);
  y += a * sin(f);
}
```

For JS heightAt, return sum of a*sin(k*(dot(dir,p) - c*t)). That's the vertical displacement at undisplaced position — matches "for Gerstner waves ignore the small horizontal shift".

I'll keep steepness small-ish so vertical matches visually reasonably.

Ocean shader: vertex shader computes displaced position, computes normal analytically (accumulate partial derivatives). Actually simpler: compute normal by sampling displacement at neighbor points (p + dx, p + dz) in vertex shader, using a function that returns displacement y (and horizontal shifts). Analytic normal with Gerstner is more complex; neighbor sampling is fine and standard. I'll compute displaced positions at (x,z), (x+e,z), (x,z+e) and cross product.

Actually with Gerstner horizontal displacement, neighbor sampling should also compute horizontal shifts, then use (displacedNeighbor - displacedCenter). That's fine — I'll write a function `vec3 waveDisplace(vec2 p, float t)` returning vec3 offset, and sample 3 points.

Fragment shader: compute view dir, fresnel = pow(1 - dot(N,V), ...), sky color function (gradient by reflected ray y), deep/shallow color mix based on... maybe foam/depth factor; use wave height for shallow color near crests, plus distance-based. Sun specular: Blinn-Phong or GGX-ish with high exponent. Foam: based on wave height (crest) plus a noise-ish factor (use sin-based hash since no textures). Foam near shore: blend with distance to island? Simple: foam factor based on crest height + screen-space-ish noise.

Also fog: ShaderMaterial doesn't automatically get fog unless I include fog chunks. I can add fog manually in fragment shader using uniforms matching scene.fog, or add THREE fog chunks. Simpler: compute fog manually with uniforms fogColor, fogNear/fogFar (FogExp2 maybe). I'll use scene.fog = new THREE.Fog(color, near, far) and pass uniforms to ocean material; update if needed. Or implement in ocean shader directly with hardcoded matching values. I'll pass scene.fog params as uniforms and update each frame if changed (they don't change). Actually easier: use `material.fog` chunks... ShaderMaterial supports fog if you set fog: true and include fog_pars_vertex, fog_vertex, fog_pars_fragment, fog_fragment chunks. With ShaderMaterial you need to include those chunks and uniforms via UniformsLib.fog. I'll do manual fog to keep it simple: uniforms uFogColor, uFogNear, uFogFar, and mix in fragment.

Actually to be safe with tone mapping: ShaderMaterial output — renderer applies tone mapping in the material's fragment via `tonemapping_fragment` chunk only if using built-in includes... Actually tone mapping is applied per-material in the fragment shader output through `#include <tonemapping_fragment>` and `<colorspace_fragment>`. For ShaderMaterial I can include those chunks manually:
```
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
That works with ShaderMaterial since chunks are resolved. Yes, ShaderMaterial supports include chunks.

So ocean fragment ends with:
```
gl_FragColor = vec4(color, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
Note: newer three versions renamed to `#include <colorspace_fragment>` (r152+). I'll assume recent three (r160+). Use `tonemapping_fragment` and `colorspace_fragment`.

Sky addon: use Sky from 'three/addons/objects/Sky.js'. Set turbidity, rayleigh, sun elevation/azimuth. Sun elevation ~ 15-25 degrees for nice light. Set sun position vector, DirectionalLight direction matching.

Sky shader is huge (renders over full scene as a box). Fine.

Island geometry: create a disc-ish plane or a Cone-based heightfield. Approach: CircleGeometry or PlaneGeometry 60x60 with many segments, displace vertices with radial falloff + noise (sin-based pseudo-noise). Vertex colors: sand below ~1.2, grass above, rock near peak / steep slopes. Compute vertex normals. Use MeshStandardMaterial with vertexColors: true. receiveShadow = true.

Island height function used for palms placement too. Define JS function islandHeight(x,z):
- r = sqrt(x²+z²), maxR = 25
- base = falloff: (1 - smoothstep(r/25)) * 12 * shapeNoise
- add noise: sum of sines.
Peak ~ 9-11.

But island must slope into sea below water. Water at y≈0 with waves ±1. Island base extends to y=-2 maybe. Falloff: height = peak * pow(max(0, 1 - r/R), 1.5) plus noise*(falloff). Then subtract a bit so edges go underwater.

Palm trees: 5-7 palms. Trunk: curved via TubeGeometry along a curve (CatmullRomCurve3 with bend). Trunk material brown. Crown: leaves as InstancedMesh. Leaf geometry: a bent plane — PlaneGeometry (e.g., 0.3 x 2.2, segments) with vertices shaped into drooping arc, maybe a simple frond shape via triangle strip. Simpler: make a frond from PlaneGeometry with custom bend in geometry (positions manipulated once), color green, DoubleSide.

Leaves instancing: each palm has ~7 fronds, 6 palms → 42 instances ≥ 30. Each instance matrix: position at crown top, rotation (yaw around trunk + pitch droop), scale. Sway: each frame update matrices by adding rotation around some axis based on time + instance phase. Updating 42 matrices per frame is cheap.

For wind sway: precompute for each instance base matrix (position + base orientation). Each frame, compute sway angle = amplitude * sin(t*speed + phase), compose matrix: M = T(pos) * R_sway * R_base * S. Use Object3D dummy or manual matrix composition. Use a THREE.Object3D dummy: dummy.position/quaternion/scale, update matrix. Simpler: store base quaternion; each frame create quaternion from Euler(swayX, 0, swayZ)? But base orientation varies (fronds pointing different directions). Approach: dummy.position.copy(pos); dummy.quaternion.copy(baseQuat) then multiply by small rotation quaternion premultiplied... I'll do: q = qSway * baseQuat where qSway = small rotation around axis perpendicular-ish. Use Euler(sway, sway*0.6, 0) applied in world before base: dummy.quaternion.copy(qSway).multiply(baseQuat). Good.

Trunk could also sway slightly but keep static or add small rotation to whole palm group — keep trunks static (acceptable) or add gentle rotation of crown group. Keep trunks static.

Boat: Group with hull (shape via primitive). Hull: use a scaled/stretched shape... primitives: hull from a Box or a lathe? "built from primitives (hull, deck or cabin, mast and sail; at least 3 meshes)". I'll do:
- Hull: a BoxGeometry stretched, with tapered bow — could use a custom BufferGeometry... Keep primitives: hull = box (4 x 0.8 x 1.6) but that looks blocky. Could use CylinderGeometry rotated? Or use a Shape + ExtrudeGeometry? ExtrudeGeometry of a boat outline shape extruded vertically — hull outline (pointed bow, rounded stern) extruded in Y with bevel. That's a nice primitive-based hull. ExtrudeGeometry with bevel gives rounded hull sides. I'll do that: THREE.Shape outline in XZ (x length, z width), extrude depth 0.7 along Y, then rotate. Actually extrude is along +Z; I'll build shape in XY and rotate the mesh -90° about X so shape lies in XZ, extrusion depth becomes Y height. Bevel adds nice curves.

Boat parts:
- Hull mesh (extruded shape) — casts shadow.
- Deck: a slightly smaller extruded shape or a box plank on top — thin box, wood color.
- Cabin: small box with roof (another box), at stern.
- Mast: cylinder.
- Sail: plane geometry, slightly curved? Simple plane, DoubleSide, white.
- Boom maybe. Total ≥3 meshes, fine.

Boat motion: pos (12, y, 14) with slow drift: x = 12 + sin(t*0.05)*2 etc., staying within 25 units. y = heightAt(x,z,t) + offset (offset ~0.35). Pitch/roll: sample heightAt at (x±1.5, z) and (x, z±1.5); slope forward = (hFront - hBack)/dist; pitch = atan(slope) limited; roll similar. Apply in boat.rotation with smoothing (lerp).

Boat rotation order: rotate pitch (x) and roll (z) and slight yaw drift. Use boat.rotation.set(pitch, yaw, roll) — fine.

DirectionalLight sun: position from sun direction * distance, target at origin. Shadow camera: orthographic covering ~ -40..40, mapSize 2048. castShadow true.

Hemisphere light: sky/ground colors, low intensity. Also maybe slight ambient.

Renderer: shadowMap.enabled = true, type PCFSoftShadowMap. toneMapping = ACESFilmicToneMapping, toneMappingExposure ~ 0.55? Sky addon is HDR-ish bright; typical exposure 0.5. outputColorSpace = SRGBColorSpace (default anyway).

Camera at (35,12,35), lookAt(0,2,0). OrbitControls: import, target (0,2,0), enableDamping, but they said "do not move by themselves" — damping is fine? Damping causes slight continued movement after user input only; starts static. I'll include OrbitControls with enableDamping and update in loop — safe. Actually to be extra safe, maybe just skip OrbitControls? Allowed but optional. I'll include with damping — it doesn't move by itself when no input. Keep maxDistance etc. Actually, controls.update() each frame with damping is standard. Include it.

Ocean geometry: PlaneGeometry 480x480? Requirement: at least 400x400 centered origin. Use 440x440 with 256x256 segments. Rotate -PI/2. But ShaderMaterial displaces in vertex shader — write custom vertex shader operating on plane positions (position.x, position.y in plane local before rotation... easier: create PlaneGeometry and rotateX(-PI/2) applied to geometry so positions are world-ish (x, 0, z)). Then vertex shader: worldPos = modelMatrix * position; since mesh at origin no transform, displacement in object space equals world. I'll still use modelMatrix properly.

Vertex shader:

```glsl
uniform float uTime;
// wave params as arrays or hardcoded constants
```

I'll hardcode wave params in GLSL as constants and mirror them in JS array. Define in JS:

```ts
const WAVES = [
  { dirX, dirZ, amplitude, wavelength, speed },
  ... 4-5 waves
];
```

GLSL function:

```glsl
vec3 gerstnerWave(vec2 p, float t) {
  vec3 disp = vec3(0.0);
  // wave 0
  ...
}
```

To avoid manual duplication, generate GLSL string from JS array. Build a string with a loop? GLSL ES 3.0 (WebGL2 in three r160+) supports const arrays with fixed loop. Simpler: generate unrolled code from the JS array — elegant and guarantees match. I'll construct the wave function string programmatically.

Wave set (amplitudes sum ~ crest-to-trough 0.5-2 → total amplitude ~1.0-1.3):

- Wave 1: dir (1, 0.3) normalized, amp 0.45, wavelength 22, speed 7, steep Q 0.7
- Wave 2: dir (-0.7, 1) norm, amp 0.3, wavelength 13, speed 5.5
- Wave 3: dir (0.3, -1) norm, amp 0.2, wavelength 8, speed 4
- Wave 4: dir (-1, -0.4) norm, amp 0.12, wavelength 4.5, speed 3
- Wave 5 (small chop): dir (0.8, 0.8), amp 0.06, wavelength 2.5, speed 2.5

Sum amp = 1.13 → crest-trough ~2.26 peak, typical ~1.5. Good within spec (0.5-2, roughly fine).

Gerstner steepness: Q per wave such that sum(Q*k*a) < 1. k = 2π/L. For wave1: k=0.286, a=0.45, Q=0.7 → Qka = 0.09. fine. Actually Gerstner horizontal displacement = Q*a*cos(f) — with Q=0.7, horizontal shift up to 0.31. Fine.

JS heightAt: sum a*sin(k*(dot(d,p) - c*t)). GLSL same.

GLSL generation:

```ts
function waveGLSL(): string {
  let s = 'vec3 waveDisplace(vec2 p, float t){\n vec3 d = vec3(0.0);\n';
  for (const w of WAVES) {
    const len = Math.hypot(w.dx, w.dz); nx = dx/len; nz = dz/len;
    const k = 2π/wavelength;
    s += `  { float f = ${k}*(${nx}*p.x + ${nz}*p.y - ${w.speed}*t); float a = ${w.amp}; float s = sin(f); float c = cos(f); d.y += a*s; d.x += ${w.steep}*a*${nx}*c; d.z(?) ...}`
  }
}
```

Note vec2 p corresponds to (x,z), displacement d in vec3 (x,y,z offsets). d.z += Q*a*nz*c.

Wait — need consistent naming: d.xy = horizontal (x,z), d.y vertical. So d.x += Q*a*nx*c; d.z += Q*a*nz*c; d.y += a*s.

Vertex shader full:

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWaveHeight; // vertical disp for foam

<waveDisplace function>

void main(){
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
  float t = uTime;
  vec3 p0 = waveDisplace(wp.xz, t);
  float e = 0.6;
  vec3 px = waveDisplace(wp.xz + vec2(e,0.0), t);
  vec3 pz = waveDisplace(wp.xz + vec2(0.0,e), t);
  vec3 disp = wp + p0;
  vec3 dx = wp + vec3(e,0,0) + px - disp;
  vec3 dz = wp + vec3(0,0,e) + pz - disp;
  vNormal = normalize(cross(dz, dx));
  ...
```

Normal orientation: for y-up water, normal ≈ (0,1,0). cross(dz, dx): dz ≈ (0,0,e), dx ≈ (e,0,0). cross((0,0,e),(e,0,0)) = (0*0 - e*0, e*e - 0*0, 0*0 - 0*e) = (0, e², 0). Yes up. Good.

Also need normalMatrix? Since no rotation on mesh, world normal = object normal; pass directly.

vWaveHeight = p0.y.

Also compute a foam-ish noise value in vertex or fragment: use hash noise in fragment based on world xz.

Fragment shader:

```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyColor;    // horizon
uniform vec3 uSkyTop;
uniform vec3 uFogColor;
uniform float uFogNear, uFogFar;
uniform vec3 uCameraPos;
uniform float uTime;
varying ...
```

Compute:
- N = normalize(vNormal); add small normal perturbation from high-freq waves? Already have chop waves in displacement; fine.
- V = normalize(uCameraPos - vWorldPos);
- fresnel = 0.02 + 0.98*pow(1 - max(dot(N,V),0), 5);
- sky reflection color: reflectDir = reflect(-V, N); t = clamp(reflectDir.y*0.5+0.5, 0,1); sky = mix(horizon, top, pow(t, ...)). Actually use a sky gradient function matching the Sky addon roughly — I'll just use my own gradient colors (warm horizon near sun, blue up). To keep cohesive, sample: skyCol = mix(uHorizon, uZenith, clamp(reflectDir.y,0,1)^0.7); add sun glow: pow(max(dot(reflectDir, uSunDir),0), 200) * sun.
- base water color: mix deep/shallow by factor: shallowFactor = smoothstep on vWaveHeight (crest → shallower/greener) plus fresnel-inverse. Also add sub-surface scattering-ish: add uSSS * pow(max(dot(V, -sunDirFlat?),0)...). Simple: sss = pow(max(dot(normalize(sunDir + vec3(0,?)) ... skip. Add crest translucency: crestGlow = clamp(vWaveHeight*0.5+0.5,0,1) * pow(max(dot(V, uSunDir), 0.0), 3.0) — light through wave crests toward sun. Nice touch.
- specular: half vector spec = pow(max(dot(N, H),0), 300) * sunColor * 3.
- foam: crest foam where vWaveHeight high relative: foamMask = smoothstep(0.55, 0.95, vWaveHeight) * noise; plus shore foam: near island — compute distance to island edge? Island radius ~ up to 20 where height ~ 0. Could pass uniform island radius... simpler: shore foam based on world position distance from origin: shoreDist = length(vWorldPos.xz); foam shore = smoothstep(22, 16, shoreDist) — but island isn't circular exactly due to noise. Approximate: use radial with the same shape function? Too complex. Alternative: compute island height in JS? Not in shader. I'll approximate shoreline as radius r0 ~ 19 with smooth band 19..24 fading. With noise on island edges, foam band won't hug exactly, but visually acceptable. Better: make the island shape purely radial falloff (smooth) plus small noise that stays small near shore, so shoreline ≈ circular radius ~19. I'll design islandHeight so height crosses 0 around r≈18-20 fairly smoothly. Then shore foam ring works decently.

Also modulate foam with noise texture function (hash-based value noise in shader).

Fog: fogFactor = smoothstep(uFogNear, uFogFar, dist); color = mix(color, uFogColor, fogFactor). Blend fog color to match horizon color of Sky. Sky addon horizon color: I'll set fog color to a light blue-white like 0xbfd8e6... With Sky addon, horizon near sun is bright. Use fogColor ~ (0.78, 0.85, 0.92)? Tune-ish. Set fog near 120, far 320. Ocean extends 220 units radius from origin; camera at ~50 from origin → far corner distance up to ~250. Fog far ~ 280 so edges fade. Hmm, ocean size 440 → corners at 311 from center; from camera at (35,35) corner distance up to ~340. Set fog near 100, far 300.

But island is at origin distance ~50 from camera — barely fogged. Good.

Ocean material transparent? No, opaque.

Also add a subtle sun disc? Sky addon renders sun disc. Good.

Sky setup:
```ts
const sky = new Sky();
sky.scale.setScalar(1000);
const u = sky.material.uniforms;
u.turbidity.value = 6; u.rayleigh.value = 2; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.8;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
u.sunPosition.value.copy(sunDir);
```
Elevation ~ 18°, azimuth chosen so sun is roughly behind/above scene nicely relative to camera at (35,12,35) looking at origin. Camera looks toward -x,-z direction. Sun placed opposite-ish so scene front-lit: sun direction from which light comes. Put sun at azimuth so its position is roughly at (positive x, positive z) region? Camera at (35,12,35) looking at origin sees the scene from the +x+z corner; light from behind camera (from +x+z direction) front-lit the island/boat. But then sun in sky visible behind camera — not visible in frame. Spec says "visible sun position" — meaning the sky shows a sun. Sun visible in frame means light comes from across the scene (backlit). Backlit with specular glitter on water looks great though, and fresnel sky reflection. With camera looking toward origin (-x-z direction), a sun low at azimuth in the -x-z half will be visible in the sky above horizon. Backlighting: island silhouetted-ish, but hemisphere fill keeps it readable. Sun elevation 20°, azimuth pointing toward (-1, ... ) direction. setFromSphericalCoords(1, phi=π/2 - elevation, theta=azimuth). theta measured... In three, setFromSphericalCoords: x = r sinφ sinθ, z = r sinφ cosθ. So theta=0 → +z. I want sun in direction (-0.7, ..., -0.7) horizontal → sinθ = -0.7... θ ≈ 225°? sinθ=-0.707, cosθ=-0.707 → θ = π*1.25 = 3.927. Let elevation = 22° → phi = π/2 - 0.384 ≈ 1.187.

DirectionalLight position = sunDir * 100, intensity ~ 3 (with ACES + exposure 0.5). Colors: light slightly warm white.

Hmm — with exposure 0.5 and Sky, typical values: renderer.toneMappingExposure = 0.5. DirectionalLight intensity 3-4 works in three's physically-correct-ish lighting (r155+ uses lights physical units by default; intensity 3 fine).

Hemisphere light: sky color 0x9db8d8-ish? Actually Hemisphere(skyColor, groundColor, intensity 0.5).

Shadow camera: position sun light at sunDir*120, target origin; shadow.camera left/right/top/bottom ±45, near 50, far 250. Since sun is across the scene (from -x-z), shadows cast toward camera — nice. Shadow map 2048.

Island geometry: PlaneGeometry(60,60, 128,128) rotated, displace with islandHeight function, vertex colors. 128x128 segments = 16k verts fine.

islandHeight(x,z):
```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const R = 20;
  let h = 10 * Math.pow(Math.max(0, 1 - r / R), 1.7);  // peak ~10
  // noise
  const n = Math.sin(x * 0.35 + 1.7) * Math.cos(z * 0.3 - 0.6) * 1.2
          + Math.sin(x * 0.12 - z * 0.09) * 1.5;
  h += n * Math.max(0, 1 - r / R) ... 
  // make sure edge goes under water:
  h -= 0.6 * smoothstep? 
```
Hmm — with base 10*(1-r/R)^1.7: at r=0 h=10; at r=10, (0.5)^1.7 ≈ 0.307 → 3.07; at r=15, (0.25)^1.7≈0.093 → 0.93; at r=18, (0.1)^1.7 ≈ 0.02 → 0.2. Shoreline near r≈19. Add noise scaled by (1-r/R) so shore stays smooth-ish circular; noise amplitude near center ±2. Also subtract a small base dip: h -= (r/R)^4 * 1.5? That pulls edges below 0 before falloff ends — good for sloping into sea: at r=19, base=0.036, minus dip (0.95^4*1.5≈1.22) → ~ -1.2 under water. Good, ensures underwater slope. At r=15: dip (0.75)^4*1.5=0.47, h≈0.93+noise*0.25 - 0.47 ≈ 0.5±0.3 — hmm could dip below water at r=15 making non-circular shoreline. Noise at r=15: scaled by (1-0.75)=0.25 → ±0.7 max. So some spots at r=15 underwater — shoreline irregular, which is actually natural-looking. But shore foam ring assumption breaks. Options: make foam band wide-ish (r from 14 to 21, fading). Or compute shore foam from the actual island height in shader — replicate islandHeight in GLSL! That's doable: write island height as GLSL function mirroring JS (sines). Then shore foam = smoothstep on island height near 0..0.8 (where waves lap). That's elegant and accurate. I'll do that: GLSL islandH(vec2 p) same formula; foam shore = smoothstep(1.2, 0.1, islandH) — foam where land height between -0.5 and ~1, i.e., smoothstep(islandH range). Also use it to tint shallow water: shallower where islandH higher → mix deep/shallow by smoothstep(-1.5, 1.0, islandH) combined with crest factor. 

But wait: vertex shader only — I can compute islandH in fragment from world xz (interpolated). Fine, cheap sines.

Also could displace ocean vertices down near island? Not needed.

Vertex colors for island:
```ts
for each vertex: h = islandHeight(x,z), slope estimate via finite difference.
color: sand (0.83,0.76,0.55) for h<1.5 blending to grass (0.25,0.45,0.18) for 1.5<h<4, rock (0.42,0.4,0.38) where slope steep or h>7.5.
```
Use MeshStandardMaterial({vertexColors:true, roughness:0.95}). flatShading? No — compute normals.

Palm placement: pick positions on island where height between 2 and 6: precompute few spots: e.g., (5,3), (-6,4), (3,-7), (-4,-5), (8,-2), (0,6)... check heights via islandHeight and place at that height minus a bit (sink trunk base 0.3). Trunk height ~4-6.

Trunk geometry: TubeGeometry along CatmullRomCurve3 from base to top with curve bend (top offset in random direction ~1.2). Radius taper: TubeGeometry constant radius; use radius 0.16 and scale? Taper not necessary; use radius 0.14, radialSegments 6. Fine. Or build custom tapered — keep tube, acceptable. Actually a slight taper looks better: I can create the tube then scale vertices? Skip — radius 0.13 constant ok, plus a couple of ring bumps? Keep simple.

Palm crown: crown top point = curve end. Leaves: frond geometry. Build one frond geometry: PlaneGeometry(0.5, 2.6, 1, 8) — oriented along +Y? Let me build along +Z with droop in geometry: plane in XY (width x=0.5? ) Let's define frond along local -Z... Simplest: PlaneGeometry(width 0.55, length 2.6, 2, 10) lies in XY (x width, y length). I want frond extending along +Z direction with droop: rotate geometry so length is along +z, droop down at tip, and taper width. I'll construct manually: for each vertex, t = (y + 1.3)/2.6 ∈[0,1]; after transform: new position: x *= taper (1 - 0.7t), z = t*2.6? Actually easier: create plane in XY with y from 0..2.6: PlaneGeometry(0.55, 2.6) centered — translate y +1.3 so base at 0. Then map: pos = (x*taper(t), droopY(t), t*len) where droopY = -1.1*t*t? Droop: y = 0.5*t*? Palm fronds arch up then down: y = 1.2*t*(1-?)... simple: y = 0.9*sin(t*π*0.5) - 1.3*t*t? Let's just: y = 0.8*t - 1.5*t*t → at t=0.27 y≈0.21 max? peak at t=0.267: y=0.107. Hmm want arch higher: y = 1.4*t - 1.9*t*t → peak at t=0.368, y=0.258, tip y=1.4-1.9=-0.5. So frond rises 0.26 then droops to -0.5. Good. Also taper: x *= (1 - 0.75*t) with slight middle bulge? fine.

Compute normals after modification: geometry.computeVertexNormals().

Frond material: MeshStandardMaterial color green (0x2d7a2d...), DoubleSide, roughness 0.8. Instance color variation? Could use setColorAt for variation — optional; keep uniform with slight per-instance color via setColorAt (needs instanceColor). Nice touch but optional; I'll add slight variation.

Leaf instances: per palm, 8 fronds: yaw = i/8*2π + jitter, pitch (droop overall rotation around X of frond base) varying: rotate frond around local axis so some point more upward. Base orientation quaternion: Euler(pitchTilt, yaw, rollJitter) — order... Use quaternion from Euler(tiltX, yaw, tiltZ, 'YXZ')? The frond extends +Z; rotating yaw around Y spreads them; tiltX rotates up/down. Compose Euler('YXZ')? Set dummy.rotation.set(tiltX, yaw, 0, 'YXZ')? Euler order 'YXZ' applies Y then X then Z... In three, Euler order string means rotations applied as R = Ry * Rx * Rz? Three's Euler order 'YXZ' composes as... intrinsic rotations applied in that order: first Y? Actually three applies in order specified: for 'XYZ', matrix = Rx*Ry*Rz? Let me not overthink: use quaternion multiplication manually: qYaw (around Y) * qTilt (around X). dummy.quaternion.setFromAxisAngle(Y, yaw).multiply(setFromAxisAngle(X, tilt)). Then frond local +Z rotated by tilt around X first, then yaw around Y. That gives fronds at yaw directions with tilt. tilt varies 0.1..0.6 rad (some more drooping). Position at crown top + small offset downward 0.2.

Instance count: 6 palms × 8 fronds = 48 ≥ 30. 

Sway per frame: swayAngle = 0.12 * sin(t*1.5 + phase_i) + 0.05*sin(t*3.1 + phase*1.7); rotate around axis roughly perpendicular to frond direction — simpler: apply small rotation around X (local) and Z: qSway from Euler(swayA, 0, swayB). Compose dummy.quaternion.copy(qSway).multiply(baseQuat). Position at crown top (which also could sway — keep position fixed; slight visual mismatch acceptable, or add small position offset). Also add position sway: pos + trunkTopSway offset = bend direction * sway * 0.1. Keep it simple: rotate only, plus move position slightly: px = top + (sin(t..)*0.08) in wind direction. I'll add small lateral position offset same for all fronds of a palm (crown shifting with trunk-top sway) plus per-frond rotation sway.

Wind direction fixed (1,0,0.3) normalized.

Store per-instance data arrays: baseQuat (Quaternion), basePos (Vector3), phase, palmIndex.

Boat position/drift: 
```ts
const bx = 12 + Math.sin(t*0.05)*2.0;
const bz = 14 + Math.cos(t*0.04)*2.0;
```
distance from origin: max sqrt(14²+16²)=21.3 <25. Good.

Boat orientation: 
```ts
const hC = heightAt(bx, bz, t);
const hF = heightAt(bx + fx*1.5, bz + fz*1.5, t); // forward dir
```
Boat yaw: face direction slowly rotating: yaw = 0.3*sin(t*0.03)+initial. Forward vector from yaw. Simpler: keep boat heading fixed at some yaw (e.g., -0.6 rad) with tiny drift; sample front/back along heading.

pitch = atan2(hF - hB, 3.0) — but note wave displacement includes horizontal Gerstner shift ignored — fine per spec.

Roll = atan2(hL - hR, 2.2)? hull width ~1.6, sample ±1.1.

Smooth: boat.rotation.x = lerp toward -pitch? Sign: if water higher in front (hF > hB), bow should pitch up → rotation.x negative (since rotation.x positive tilts nose down? For object facing +Z? Let's define boat forward along +Z local. rotation.x positive rotates +Z downward? Rotation about x by θ maps z→ (0, sin? ) Vector (0,0,1) under Rx(θ): (0, -sinθ, cosθ)? Rx(θ): y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. So (0,0,1) → (0, -sinθ, cosθ). Positive θ → front dips down. So if hF>hB, want bow up → rotation.x = -atan((hF-hB)/dist). I'll compute and just tune sign; either sign looks like it follows waves reasonably; but correctness matters little visually. I'll use rotation.x = Math.atan2(hB - hF, 3).

Roll: boat right side (local +X). If hR > hL, right side up → roll rotation.z: Rz(θ) maps (1,0,0) → (cosθ, sinθ, 0); positive θ lifts right side up. So rotation.z = atan2(hR - hL, dist).

Boat bobbing offset: y = hC + 0.45.

Also add tiny extra rocking: roll += 0.03*sin(t*1.2), pitch += 0.02*sin(t*0.9+1) for liveliness.

Boat cast shadows: each mesh castShadow = true.

Boat build:
- Hull: THREE.Shape outline: boat ~4 long (x from -2 to 2), width 1.5 (z ±0.75). Shape in XY: 
```ts
const shape = new THREE.Shape();
shape.moveTo(-1.9, 0);  // stern center-left? Let's draw in shape coords (x = length axis, y = width axis)
shape.moveTo(-1.8, -0.75)? 
```
Outline: start at bow tip (2, 0), curve to side (0.5, 0.75), to stern (-1.9, 0.6), stern rounded to (-1.9,-0.6), back (0.5,-0.75), close to bow. Use quadraticCurveTo.

Then ExtrudeGeometry depth 0.9 (height), bevel enabled: bevelThickness 0.25, bevelSize 0.25, bevelSegments 3. This bevels top and bottom edges, giving rounded hull. Rotate mesh: geometry.rotateX(-π/2) so shape XY→ XZ plane with width along Z, extrusion +Z becomes... geometry extrudes along +Z in shape space; after rotateX(-π/2), shape's y (width) → -z? rotateX(-π/2): (x,y,z)→(x, z, -y)? Rx(-90°): y' = y cos(-90) - z sin(-90) = z; z' = y sin(-90) + z cos(-90) = -y. So shape width y → world -z (fine, symmetric), extrusion z (0..0.9) → world y (0..0.9). Then translate y by -0.45 to center, so hull spans y -0.45..+0.45 plus bevel. Position hull so deck at ~0.35.

- Deck: thin extruded shape (same shape scaled 0.85) depth 0.06 at y≈0.42. Or Box — use same shape smaller, extrude 0.08. Simpler: another ExtrudeGeometry with scale, position y=0.4. Wood color 0x8a6a42.

- Cabin: box 1.0×0.7×0.9 at (-1.0, 0.8, 0), color white-ish 0xe8e4da, plus roof box slightly bigger, dark. casts shadow.

- Mast: cylinder r 0.05, h 2.6 at (0.4, y from 0.4 to 3). 
- Sail: PlaneGeometry(1.6, 1.9) positioned at mast, rotated to catch... DoubleSide white, slight rotation.y. Position (0.55, 1.6, 0)? Sail plane perpendicular to boat axis (like a squaresail): plane in X? plane default XY (facing +z); I want sail across width: geometry rotateY(π/2) → plane in ZY facing +x. Position at x=0.55 (slightly aft of mast? forward). Fine.
- Boom: cylinder along z at sail bottom.

Materials: MeshStandardMaterial.

Boat meshes castShadow = true; also boat doesn't receiveShadow necessarily (hull can receive too—set receiveShadow true for deck).

Ocean mesh: receiveShadow? ShaderMaterial custom won't support shadows easily. Skip shadows on water (spec doesn't require).

Now heightAt must include wave time t param; time() returns current wave time = elapsed accumulated. Wave time = clock elapsed (accumulate delta). Use `waveTime += delta`. Expose time() => waveTime.

Note ShaderMaterial uTime updated to waveTime each frame.

__ocean.heightAt(x,z,t): 
```ts
heightAt(x, z, t) {
  let y = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.wavelength;
    y += w.amplitude * Math.sin(k * (w.nx * x + w.nz * z - w.speed * t));
  }
  return y;
}
```

Now island also might need to receive shadows: islandMesh.receiveShadow = true.

Palm trunks: castShadow true. Leaves InstancedMesh castShadow = true (instanced shadows work).

Sun shadow bias: -0.0005, normalBias 0.02 to avoid acne.

Fog: scene.fog = new THREE.Fog(0xcfe4ee?, 130, 320). Ocean shader manual fog with same values; standard materials get automatic fog. Need ocean fog color to match scene fog color exactly: pass scene.fog.color. Also fog applies to island/palms — distance ~50 from camera, fog factor small. Good.

Sky and fog: Sky addon material ignores fog (fine). Horizon color of Sky at elevation 22°, turbidity 6: whitish-blue. Fog color 0xc8dcea-ish. I'll pick 0xcfe0ea and exposure 0.6.

Let me also add subtle glitter/normal detail in fragment: perturb N with small procedural noise based on world pos and time: N.xz += (noise gradients)*0.05. Use a hash-based value noise function with two octaves; compute gradient numerically or just add sin-based ripples:
```glsl
float ripple = sin(p.x*1.3 + t*2.0)*... 
```
Simple: add small high-frequency wave terms to normal analytically in vertex shader — add two extra tiny waves in the displacement function? They'd change heightAt (must match). Alternative: perturb normal in fragment with pseudo-noise — decoupled from heightAt, allowed (visual only). I'll add fragment normal perturbation:

```glsl
vec2 np = vWorldPos.xz;
float n1 = sin(np.x*2.1 + uTime*1.7) * sin(np.y*1.7 - uTime*1.3);
float n2 = sin(np.x*3.7 - uTime*2.3 + np.y*2.9);
N = normalize(N + vec3(n1*0.06, 0.0, n2*0.06));
```
This creates shimmering. Fine.

Foam noise: value noise hash:
```glsl
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
```
foam pattern: foamN = vnoise(np*0.9 + t*0.15) * 0.6 + vnoise(np*2.3 - t*0.1)*0.4.

Crest foam: foamCrest = smoothstep(0.65, 1.05, vWaveHeight + foamN*0.5 - 0.25) → white patches at high crests. Shore foam: islandH = islandHeightGLSL(vWorldPos.xz); shoreFactor = smoothstep(0.9, -0.2, islandH) — wait islandH near shore goes from negative (sea floor) to positive on land. In water region islandH < 0. Foam where islandH > -0.9 and < 0.3: shoreFoam = smoothstep(-1.0, -0.3, islandH) * smoothstep(0.6, 0.0, islandH). Multiply by foamN pattern and a time pulsing: * (0.7 + 0.3*sin(t*1.3 + islandH*4.0)).

Also water color shallow near shore: shallowMix = smoothstep(-1.2, 0.4, islandH).

Wait — islandH function in GLSL must mirror JS islandHeight exactly for the shore foam to align with the visible island. I'll write islandHeight in one place as a formula and duplicate carefully.

Define islandHeight(x, z):
```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const falloff = Math.max(0, 1 - r / 20);
  let h = 10.5 * falloff * falloff * falloff * Math.sqrt(falloff); // ~falloff^3.5
```
Hmm choose: h = 11 * pow(falloff, 1.8). At r=0: 11. r=5: falloff 0.75 → 11*0.75^1.8 = 11*0.596=6.6. r=10: 0.5^1.8=0.287→3.16. r=15: 0.25^1.8=0.082→0.9. r=18: 0.1^1.8=0.0158→0.17. Plus dip: dip = 2.2 * pow(r/20, 6)? At r=18: (0.9)^6=0.53*2.2=1.17 → h≈-1.0. At r=15: (0.75)^6=0.178*2.2=0.39 → h≈0.51±noise. Noise: n = 1.1*sin(x*0.32+1.7)*cos(z*0.27-0.6) + 0.7*sin(x*0.13 - z*0.11 + 2.0) + 0.5*sin(x*0.53 + z*0.41); scaled by min(1, falloff*2.5)? Scale noise by smooth ramp: noiseAmp = clamp((1 - r/20) * 3.0, 0, 1) → full at r≤13.3, zero at r=20. At r=15: amp=0.75, noise ±(1.1+0.7+0.5)=±2.3*0.75 — too big, would push shoreline wildly. Reduce noise amplitudes: total ±1.4 max. n = 0.8*sin(...)*cos(...) + 0.4*sin(...) + 0.25*sin(...). Max 1.45. At r=15: h = 0.9+0.51=1.41 base ±1.09 → could be 0.3 to 2.5 — shoreline meanders between r~13-19. That's natural but foam ring via islandH function still matches since we use the same function. OK good — since shore foam uses islandH, alignment guaranteed regardless.

Peak: r=0, noise amp: at r=0 clamp(3,0,1)=1 → h = 11 + noise ±1.45 → 9.5..12.5. Peak within 5-15 ✓. Island across ~ 26-38 units ✓ (30-50 target... "about 30 to 50 units across" — diameter ~26-38 is slightly under 30. Increase R to 22: falloff at r=22→0. Shoreline where h crosses 0: base 11*(1-r/22)^1.8 + dip 2.2*(r/22)^6 + noise. At r=18: (0.818)^1.8=0.7? compute: ln0.818=-0.2, *1.8=-0.36, e^-0.36=0.697 → 11*0.697=7.67?? That's wrong — (1-r/22) at r=18 = 0.818, pow 1.8 → 0.7, h=7.67. That makes island much bigger. Let me recompute properly: I want shoreline around r≈17-19 with R=22. Use pow 2.6: (0.818)^2.6: ln=-0.2*2.6=-0.52→0.594*11=6.5. Still high. Use exponent 3.5: (0.818)^3.5 = e^(-0.703)=0.495*11=5.45. Hmm.

Let me parametrize differently: h_base = 11 * pow(max(0,1 - r/22), 3.0). At r=11: (0.5)^3=0.125*11=1.37. That's too narrow — island mostly low. Want dome shape: high center, gradual slope. Better: use smoothstep-like dome: h = 11 * (1 - smoothstep(0, 22, r))? At r=11: 0.5² area... smoothstep(0,22,0.5norm)=0.5 → 1-0.5=0.5 → 5.5. At r=16.5 (0.75): smoothstep=0.84→0.16*11=1.76. At r=19.8(0.9): smoothstep 0.972→ 0.31. Shoreline near r≈21. Diameter ~42 ✓ within 30-50.

So: base = 11 * (1 - smoothstep(0,22,r)) i.e. 11 * smoothstep-like: s = r/22; ss = s*s*(3-2*s); base = 11*(1-ss).

Dip: dip = 2.0 * s^8 → at r=20 (s=0.909): 2.0*0.47=0.94; base at r=20: ss=0.983*? s=0.909: ss = 0.909²*(3-1.818)=0.826*1.182=0.976 → base=0.26; h = 0.26-0.94 = -0.68 ✓ underwater. At r=16 (s=0.727): ss=0.529*(3-1.454)=0.818 → base 2.0; dip=2*0.0777=0.155; h≈1.85±noise. Noise amp = clamp((1-s)*2.2, 0, 1): at r=16, (0.273*2.2)=0.6 → ±0.87. Shore meanders r 14-19. At r=20 noise amp=0 → smooth circular underwater. Good.

Peak at r=0: 11 ± noise(1.4) → ~9.6-12.4 ✓ (5-15).

Island size: PlaneGeometry(56, 56, 160, 160)? vertices 161² = 25921, fine. Use 150 segments. Beyond r>22 h goes to dip only: at r=25 (s=1.136): dip=2*2.8=5.6?? s^8 grows beyond 1 — must clamp dip: dip = 2.0 * pow(min(s,1), 8). Beyond r=22: h = 0 + noise(0) - 2.0 = -2.0 flat seafloor. Fine (invisible below water). Actually make it keep sloping: dip = 2.0 * s^8 for s<1, and beyond, base=0, h=-2.0 constant. OK plane radius 28 corner. Good.

GLSL mirror:
```glsl
float islandHeight(vec2 p){
  float r = length(p);
  float s = r / 22.0;
  float ss = s*s*(3.0-2.0*s);
  float base = 11.0 * (1.0 - clamp(ss, 0.0, 1.0));
  float dip = 2.0 * pow(min(s, 1.0), 8.0);
  float amp = clamp((1.0 - s) * 2.2, 0.0, 1.0);
  float n = 0.8 * sin(p.x*0.32 + 1.7) * cos(p.y*0.27 - 0.6)
          + 0.4 * sin(p.x*0.13 - p.y*0.11 + 2.0)
          + 0.25 * sin(p.x*0.53 + p.y*0.41);
  return base - dip + n * amp;
}
```
JS identical. 

Vertex colors: compute slope via finite differences of islandHeight:
```ts
const e = 0.5;
const hx = islandHeight(x+e,z) - islandHeight(x-e,z);
const hz = islandHeight(x,z+e) - islandHeight(x,z-e);
const slope = Math.hypot(hx, hz) / (2*e);
```
Colors:
- sand: (0.86, 0.79, 0.58)
- grass: (0.23, 0.42, 0.16) with variation
- rock: (0.45, 0.43, 0.40)
Blend: sandMix = smoothstep(2.2, 0.7, h); rockMix = smoothstep(0.55, 0.9, slope) + smoothstep(7.5, 10.5, h)*0.7, clamped.
color = mix(grass, sand, sandMix) then mix toward rock by rockMix. Add slight noise variation to grass color: g *= 0.9+0.2*hash.

Underwater sand: below h<0.2 keep sand (extended). sandMix covers h<2.2 → sand near water ✓.

Palm positions: choose manually-ish but verify with islandHeight at runtime: candidate list, filter h between 1.5 and 6 and slope < 0.5. Provide list: [(3,-2), (-5,3), (6,6), (-2,-7), (8,-3), (-8,-4), (1,9), (-9,2), (5,-9)]. Compute h at runtime, pick first 6 valid. Trunk base y = h - 0.25.

Curve: points from base to top: top = base + (bendX, trunkH, bendZ), bend magnitude ~1.0-1.4 random direction. CatmullRomCurve3 with mid point leaning. trunkH = 3.5 + rand*1.5.

Crown top = curve getPoint(1).

Leaves geometry frond: as described. One InstancedMesh with frond geometry, count = palms*8.

Trunk as one mesh per palm merged? Each palm trunk separate mesh in island group — fine. Or merge all trunks into one geometry via BufferGeometryUtils.mergeGeometries — could import 'three/addons/utils/BufferGeometryUtils.js'. Not necessary; 6 meshes fine.

Island group: islandMesh + trunks. __island = group (spec says Mesh or Group ✓, receives shadows — set receiveShadow on group children; also group-level? Set on meshes).

Leaves InstancedMesh added to island group (or scene). castShadow true.

Frond sway update: need dummy Object3D.

Now shadows on water from island/palm? Ocean is ShaderMaterial — no shadow receive. Fine.

Sun light shadow camera must cover island (r~22) and boat (~21 away): ortho ±45.

DirectionalLight: 
```ts
sunLight.position.copy(sunDir).multiplyScalar(120);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera: left -50 right 50 top 50 bottom -50 near 60 far 220;
```
Distance from light pos (120 away) to origin 120; to farthest point ~120+30. near=40, far=200. Fine.

Shadow acne on island slopes: bias -0.0003, normalBias 0.05.

Exposure and colors: with ACES + exposure 0.55, Sky addon brightness: typical examples use exposure 0.5 with rayleigh 2-3. I'll use 0.55.

Water colors: deep 0x06335c-ish (0.02,0.15,0.28)? With ACES tone mapping and sun intensity, use deep (0.015, 0.12, 0.22), shallow (0.05, 0.45, 0.45) tropical. Sun color (1.0, 0.9, 0.75)*... spec intensity ~1.5.

Sky gradient reflection colors: horizon (0.7, 0.82, 0.92), zenith (0.25, 0.45, 0.75). Fog color match horizon-ish: 0xcdd9e4? Sky addon horizon at turbidity 6 is warmish-white. Use fog color 0xd7e4ee... Let me set fog color new THREE.Color(0.83, 0.89, 0.94).

Also scene.background: Sky mesh covers everything, background irrelevant.

Boat visible sun specular: ocean fragment spec uses uSunDir uniform — same as sky sunPosition. 

Ocean shader — write carefully.

Vertex shader complete:

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vCrest;

<generated waveDisplace>

void main() {
  vec3 center = (modelMatrix * vec4(position, 1.0)).xyz;
  float t = uTime;
  vec3 d0 = waveDisplace(center.xz, t);
  float e = 0.9;
  vec3 dx = waveDisplace(center.xz + vec2(e, 0.0), t);
  vec3 dz = waveDisplace(center.xz + vec2(0.0, e), t);
  vec3 p0 = center + d0;
  vec3 px = center + vec3(e, 0.0, 0.0) + dx;
  vec3 pz = center + vec3(0.0, 0.0, e) + dz;
  vNormal = normalize(cross(pz - p0, px - p0));
  vCrest = d0.y;
  vWorldPos = p0;
  gl_Position = projectionMatrix * viewMatrix * vec4(p0, 1.0);
}
```
Check cross orientation again: pz - p0 ≈ (0,?,e), px - p0 ≈ (e,?,0). cross((0,0,e),(e,0,0)) = (0*0-e*0, e*e-0*0, 0-0) = (0, e², 0) ✓ up.

Note viewMatrix: for ShaderMaterial, modelMatrix, viewMatrix, projectionMatrix, cameraPosition are built-in uniforms ✓. Use cameraPosition builtin instead of uCameraPos.

Fragment shader:

```glsl
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vCrest;

<islandHeight GLSL>
<hash/vnoise>

void main(){
  vec3 N = normalize(vNormal);
  vec2 p = vWorldPos.xz;
  // micro detail
  float n1 = sin(p.x*2.3 + uTime*1.9)*sin(p.y*1.9 - uTime*1.4);
  float n2 = sin(p.x*4.1 - uTime*2.7 + p.y*3.1);
  N = normalize(N + vec3(n1, 0.0, n2) * 0.07);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(N, V), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 R = reflect(-V, N);
  float sky = pow(clamp(R.y * 0.5 + 0.5, 0.0, 1.0), ... )
```
Actually R.y can be negative for steep view; clamp: skyT = clamp(R.y, 0.0, 1.0); skyCol = mix(uHorizon, uZenith, pow(skyT, 0.6)). Sun glow in reflection: sunGlint = pow(max(dot(R, uSunDir), 0.0), 400.0) * 2.0? Add halo pow 30 * 0.15.

Water base:
```glsl
float ih = islandHeight(p);
float shallowMix = smoothstep(-1.4, 0.5, ih);
float crestMix = smoothstep(0.1, 1.0, vCrest);
vec3 water = mix(uDeep, uShallow, clamp(shallowMix*0.8 + crestMix*0.35, 0.0, 1.0));
```
Subsurface: 
```glsl
float sss = pow(max(dot(V, -uSunDir * something...
```
Standard trick: sss = pow(max(dot(V, normalize(-uSunDir + N*... )), 0.0) — let's do: float towardSun = max(dot(normalize(vec3(uSunDir.x, 0.0, uSunDir.z)), -V_flat?)... Keep simple: sss = pow(max(dot(V, -uSunDir), 0.0)?? That's light coming toward camera through wave — dot(V, -sunDir) means camera looking toward sun. sss = pow(max(dot(V, vec3(-uSunDir.x, 0, -uSunDir.z)), 0.0), 3.0) * crestMix * 0.3 * sunColor. Add.

Specular:
```glsl
vec3 H = normalize(V + uSunDir);
float spec = pow(max(dot(N, H), 0.0), 240.0) * 3.0;
```

Foam:
```glsl
float fn = vnoise(p * 0.55 + uTime * 0.08) * 0.65 + vnoise(p * 1.9 - uTime*0.05) * 0.35;
float crestFoam = smoothstep(0.75, 1.15, vCrest + fn * 0.55);
float shoreFoam = smoothstep(-1.1, -0.35, ih) * smoothstep(0.9, 0.05, ih) * (0.55 + 0.45 * sin(uTime*1.5 + ih * 5.0 + fn*2.0));
float foam = clamp(crestFoam + shoreFoam, 0.0, 1.0) * smoothstep(0.35, 0.7, fn + 0.2);
vec3 foamCol = vec3(0.92, 0.96, 0.97);
```
Combine:
```glsl
vec3 col = water;
col += skyCol * fresnel * 0.9;
col += uSunColor * (spec + sunGlint);
col += uSunColor * sss;
col = mix(col, foamCol, foam * 0.85);
```
Foam should also reduce fresnel where full — fine.

Fog:
```glsl
float dist = length(cameraPosition - vWorldPos);
float fogF = smoothstep(uFogRange.x, uFogRange.y, dist);
col = mix(col, uFogColor, fogF);
```
Note fogColor should be in linear space matching scene.fog? Scene.fog color is specified as color; built-in materials use fogColor uniform as-is (linear working space — THREE.Color set from hex is converted to linear automatically when color management enabled... In r152+ with ColorManagement enabled, new THREE.Color(0x...) is sRGB converted to linear-sRGB working space automatically. If I pass scene.fog.color components as uniform, they're already linear ✓, and my ShaderMaterial outputs linear pre-tonemapping then tonemapping chunk converts. Built-in materials do the same ✓ consistent.

Similarly uniform colors: define via new THREE.Color(hex) — auto linear ✓. uSunColor etc.

Sun in fragment: sunDir normalized pointing from surface toward sun ✓ (same as sky sunPosition).

Tone mapping chunk: with ShaderMaterial, `#include <tonemapping_fragment>` uses toneMapping define — ShaderMaterial does get toneMapping applied? The chunk is:
```
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
The TONE_MAPPING define is set by the renderer for materials when renderer.toneMapping !== NoToneMapping... The program prefix includes tone mapping function definitions when material.toneMapped is true (default). For ShaderMaterial, toneMapped default true; renderer defines TONE_MAPPING and includes tonemapping_pars in the fragment prefix for all materials? Yes — WebGLProgram builds prefixFragment with toneMapping pars when material.toneMapped && renderer.toneMapping set. So including the chunk works. Same for colorspace_fragment (encodings). In r152+: `#include <colorspace_fragment>`. I'll target recent three (r160+). To be safe against versions where it was `encodings_fragment`? The prompt just says import from 'three' — presumably a recent version installed. I'll use colorspace_fragment (correct for r154+).

Actually — hmm, risk: if the installed version is older, `colorspace_fragment` doesn't exist and shader compile fails. But three latest (r16x/r17x) uses colorspace_fragment. I'll go with it. Alternatively, avoid chunks: do manual tone mapping? That would mismatch other materials. Or use RawShaderMaterial? No. Another safer approach: apply tonemapping/colorspace via chunks is standard practice in many examples. Keep it.

Ocean size: 440 x 440, 256x256 segments → 65k vertices, 131k triangles — fine.

PlaneGeometry(440, 440, 256, 256); geometry.rotateX(-Math.PI/2).

One more: ocean at y=0 mesh; waves displace around 0.

Boat floats: heightAt gives displacement only; base water level 0 → boat y = h + offset.

Now the leaves sway update loop: I need per-instance arrays. Let me define:

```ts
interface LeafData { pos: THREE.Vector3; quat: THREE.Quaternion; phase: number; }
const leafData: LeafData[] = [];
```

After building palms, create InstancedMesh(frondGeo, frondMat, leafData.length), then initial set via dummy. Store data.

Each frame:
```ts
for i: 
  const d = leafData[i];
  const sway = Math.sin(waveTime * 1.6 + d.phase) * 0.10 + Math.sin(waveTime*3.4 + d.phase*1.7)*0.045;
  dummy.position.copy(d.pos);
  // wind lean position offset
  dummy.position.x += windX * ... small: d.leanX? 
  dummy.quaternion.setFromEuler? 
```
Compose: qSway = new Quaternion().setFromEuler(new Euler(sway, 0, sway*0.6)); dummy.quaternion.copy(qSway).multiply(d.quat); dummy.scale.setScalar(d.scale); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix); leaves.instanceMatrix.needsUpdate = true.

Avoid allocating per frame: reuse Euler/Quaternion objects outside loop.

Also crown position offset with wind: pos.x += Math.sin(waveTime*1.6 + d.phase)*0.05.

Trunk tops: fronds positioned at trunk top point.

Frond geometry creation code:

```ts
function createFrondGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.5, 2.6, 3, 10);
  geo.translate(0, 1.3, 0); // base at origin, extends +y
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / 2.6;
    const x = pos.getX(i) * (1 - 0.65 * t);
    const newY = 1.3 * t - 1.9 * t * t;  // hmm scale: with y in 0..2.6 mapping
    const nz = t * 2.6;  // length along z
    pos.setXYZ(i, x, newY, nz);
  }
  geo.computeVertexNormals();
  return geo;
}
```
Wait newY: I want arch: y(t) = 1.3t - 1.9t² → t=1: -0.6; t=0.34: peak 0.22. Slightly low arch; make 1.6t - 2.1t²: t=1 → -0.5, peak t=0.38 → 0.30. OK: y = 1.6*t - 2.1*t*t.

Also add slight fold along center (V-shape cross section): x stays, but raise center? Plane has widthSegments 3 → x in {-0.25,0,0.25} scaled. Fold: y += (1 - |x|/0.25...)? skip, flat frond with DoubleSide is fine. Actually a slight crease helps realism: newY += 0.06 * (1 - abs(x)/maxX)? Meh — I'll add crease: fold = 1 - Math.abs(px)/0.25 clamped 0..1, y += fold * 0.05 * (1-t). Fine, cheap.

Trunk geometry: 

```ts
function createTrunk(base: Vector3, top: Vector3): TubeGeometry {
  const mid1 = base.clone().lerp(top, 0.4).add(new Vector3(bend*0.4...)) 
```
Simpler: curve points: p0=base, p1 = base + 0.5*(top-base) + lean*0.3 (perp), p2 = top. Actually CatmullRom through [base, base+dir*H*0.5 + lean0, top]. Let me define: top offset o = (ox, H, oz) with |o.xz| ~ 1.1. points: base, base+(o.x*0.3, H*0.45, o.z*0.3), base+(o.x*0.75, H*0.8, o.z*0.75), top. Curve bends progressively. TubeGeometry(curve, 8, 0.14, 6). Add a slight bulb at base: small cylinder or sphere at base — add sphere r 0.2 at base. Good detail.

Trunk material: brown 0x7a5b3a roughness 1. Add ring texture? Skip.

Now boat hull shape:

```ts
const hullShape = new THREE.Shape();
hullShape.moveTo(2.05, 0);
hullShape.quadraticCurveTo(1.2, 0.78, -0.3, 0.78);
hullShape.quadraticCurveTo(-1.5, 0.78, -1.9, 0.55);
hullShape.quadraticCurveTo(-2.15, 0, -1.9, -0.55);
hullShape.quadraticCurveTo(-1.5, -0.78, -0.3, -0.78);
hullShape.quadraticCurveTo(1.2, -0.78, 2.05, 0);
```
Extrude: {depth: 0.75, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.22, bevelSegments: 3, steps: 1}. Then geometry.rotateX(-Math.PI/2)?? Shape coordinates: x=length, y=width. Extrude along +z (height). We want: length → x, width → z, height → y. Rotate: after rotateX(-π/2): (x, y, z) → (x, z, -y). So shape y (width ±0.78) → world z (±0.78, sign flipped, symmetric ok), extrude z (0..0.75 + bevel ±0.28) → world y. So world y spans -0.28..1.03. Translate y by -0.4 → hull from -0.68..0.63. Waterline: hull draft. Good: hull bottom -0.68, deck top ~0.63.

Hmm bevel applies on both extrusion ends: bottom bevel rounds hull bottom ✓, top bevel rounds gunwale ✓. 

Deck: same shape scaled 0.8: use hullShape clone with points scaled? Easier: deck = ExtrudeGeometry of a scaled shape. Create second shape via hullShape.getPoints? Use clone and scale coordinates: create deckShape by mapping hullShape.getPoints(64) into new Shape scaled 0.8. Or simply: deckMesh = new Mesh(hullGeo, deckMat) with scale 0.8 and position y=0.55 — scaling whole hull geometry scales height too, making a thin hull-ish slab? Hull geometry height ~1.3 scaled 0.8 → 1.04 tall deck — wrong. 

Alternative deck: use ShapeGeometry (flat) of scaled outline placed at y≈0.5. Flat deck plank:
```ts
const pts = hullShape.getPoints(60).map(p => new THREE.Vector2(p.x*0.82, p.y*0.82));
const deckShape = new THREE.Shape(pts);
const deckGeo = new THREE.ShapeGeometry(deckShape);
deckGeo.rotateX(-Math.PI/2);
```
ShapeGeometry lies in XY facing +z; rotateX(-π/2) → facing +y? (x,y,z)→(x,z,-y): normal +z → +y ✓. Position y = 0.45. Wood color.

Cabin: box 0.9x0.55x1.0 at (-1.0, 0.75, 0); roof: box 1.05x0.1x1.15 at (-1.0, 1.05, 0). White/dark.

Mast at x=0.55: cylinder(0.05,0.07,2.8) center y = 0.45+1.4=1.85. 
Boom: cylinder r0.04 length 2.0 along z at (0.55, 0.85, 0) rotated to z-axis.
Sail: plane (1.7 width z?, 1.8 height): geometry PlaneGeometry(1.7, 1.8) default in XY (width x, height y) facing z. rotateY(π/2) → plane now in ZY? rotateY(π/2): (x,y,z)→(z? ) Ry(90°): x' = z, z' = -x. Plane vertices (x∈±0.85, y∈±0.9, z=0) → (0, y, -x): plane in ZY facing +x ✓. Position (0.75, 1.55, 0). Slight curve? Keep flat, DoubleSide, color 0xf2efe6. Sail attached spanning boom: bottom of sail at y=1.55-0.9=0.65 ≈ boom height 0.85 — adjust: sail position y=1.7, height 1.8 → spans 0.8..2.6; mast top 0.45+2.8=3.25. Fine.

Boat group at (12, y, 14) with yaw.

Boat heading yaw: rotate so bow faces some direction, say toward island slightly: yaw = 2.4 rad fixed + tiny drift 0.05*sin(t*0.02). Forward local +Z (bow at +x in shape → after rotateX, bow at +x; boat forward = +x local). Hmm my hull shape has bow at +x (2.05,0). So boat forward direction = local +X. Sampling front/back: front point = pos + (cos(yaw)*? ) With rotation.y = yaw, local +X maps to world (cos yaw, 0, -sin yaw). So forward = (cos yaw, 0, -sin yaw). Sample front at +1.6*forward, back at -1.6*forward, sides along right = local +Z maps to (sin yaw, 0, cos yaw)? local +Z under Ry(yaw): (z→) Ry: x' = x cos + z sin; z' = -x sin + z cos. (0,0,1) → (sin yaw, 0, cos yaw). Right side = (sin yaw, 0, cos yaw) — check perpendicular ✓.

pitch/roll as computed; boat.rotation.order default XYZ; set rotation.y = yaw, rotation.x = pitch, rotation.z = roll. Order XYZ: applies... R = Rz? three Euler 'XYZ' → R = Rx? Actually three composes as R = Rz? Let me recall: Euler order 'XYZ' means rotate about X first? In three.js, order 'XYZ' produces matrix = RX * RY * RZ? The docs: rotations applied in order specified: X, then Y, then Z — meaning matrix = Rz*Ry*Rx? Hmm. In three source, Euler 'XYZ' quaternion: q = qx * qy * qz? setFromEuler for 'XYZ': q = x-axis rotation * y * z? The convention: 'XYZ' means the rotations are applied in the order X then Y then Z in intrinsic... whatever — small angles, visual only. Fine.

Boat offset: y = h + 0.35 (hull bottom -0.68 → draft 0.33 below water). Waves ±1 → hull may submerge at troughs occasionally — offset 0.45. Use 0.42.

Boat also should castShadow on each mesh.

Camera: PerspectiveCamera(50, aspect, 0.1, 2000); position.set(35,12,35); lookAt(0,2,0) — with OrbitControls, set controls.target.set(0,2,0).

OrbitControls import: 'three/addons/controls/OrbitControls.js'. enableDamping true, dampingFactor 0.05, maxPolarAngle < π/2+? prevent going underwater: maxPolarAngle = 1.45? Also minDistance 10, maxDistance 200. In loop: controls.update().

Sky addon also: sky material has no fog — good.

Now __ready after first frame: in animation loop, after renderer.render, if (!ready) { (window as any).__ready = true; ready = true; }.

Renderer: antialias true, setPixelRatio(Math.min(devicePixelRatio, 2)).

Loop: 
```ts
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt;
  oceanUniforms.uTime.value = waveTime;
  updateBoat(); updateLeaves();
  controls.update();
  renderer.render(scene, camera);
  if (!readyFlag) { readyFlag = true; (window as any).__ready = true; }
});
```

Resize handler.

Exposures: __scene, __camera, __renderer set early.

Type strictness: everything typed; avoid implicit any. WAVES as const array of objects with number fields.

GLSL generation from WAVES:

```ts
function buildWaveGLSL(): string {
  const lines: string[] = [];
  lines.push('vec3 waveDisplace(vec2 p, float t) {');
  lines.push('  vec3 d = vec3(0.0);');
  for (const w of WAVES) {
    const len = Math.hypot(w.dirX, w.dirZ);
    const nx = w.dirX / len, nz = w.dirZ / len;
    const k = (Math.PI * 2) / w.wavelength;
    lines.push(
      `  {` +
      ` float f = ${k.toFixed(6)} * (${nx.toFixed(6)} * p.x + ${nz.toFixed(6)} * p.y - ${w.speed.toFixed(6)} * t);` +
      ` float a = ${w.amplitude.toFixed(6)} * sin(f);` +
      ` float b = ${w.steep.toFixed(6)} * ${w.amplitude.toFixed(6)} * cos(f);` +
      ` d.x += ${nx.toFixed(6)} * b; d.z += ${nz.toFixed(6)} * b; d.y += a; }`
    );
  }
  lines.push('  return d;');
  lines.push('}');
  return lines.join('\n');
}
```

heightAt JS matches d.y sum ✓.

Waves list (tuned):
```ts
const WAVES = [
  { dirX: 1.0, dirZ: 0.25, amplitude: 0.42, wavelength: 24, speed: 6.5, steep: 0.55 },
  { dirX: -0.65, dirZ: 0.9, amplitude: 0.30, wavelength: 14, speed: 4.8, steep: 0.55 },
  { dirX: 0.25, dirZ: -1.0, amplitude: 0.22, wavelength: 8.5, speed: 3.6, steep: 0.6 },
  { dirX: -0.9, dirZ: -0.35, amplitude: 0.13, wavelength: 4.8, speed: 2.8, steep: 0.6 },
  { dirX: 0.75, dirZ: 0.75, amplitude: 0.07, wavelength: 2.6, speed: 2.2, steep: 0.7 },
];
```
Sum 1.14 amplitude; steepness check for wave1: k=0.262, Q*k*a = 0.55*0.262*0.42=0.06 ✓ no looping.

Boat height sampling uses heightAt with horizontal position; note Gerstner horizontal shifts mean actual surface at world x differs, but spec explicitly allows ignoring.

Island vertex colors code:

```ts
const islandGeo = new THREE.PlaneGeometry(56, 56, 150, 150);
islandGeo.rotateX(-Math.PI/2);
const pos = islandGeo.attributes.position;
const colors = new Float32Array(pos.count * 3);
const cSand = new THREE.Color(0xd9c48a); // etc — careful: Color hex → linear; writing to color attribute: vertexColors are interpreted as linear-sRGB? Color attribute values used directly as linear. If I take a THREE.Color(hex) it's converted to linear automatically ✓ then copy components.
```
For each vertex:
```ts
const x = pos.getX(i), z = pos.getZ(i);
const h = islandHeight(x, z);
pos.setY(i, h);
```
Then compute slope from neighbors of height function.
colors:
```ts
const cSand = new THREE.Color(0xdcc797);
const cGrass = new THREE.Color(0x3a7a2c);
const cGrass2 = new THREE.Color(0x2f6323);
const cRock = new THREE.Color(0x6f6a62);
mix...
```
Add slight random variation using deterministic hash of x,z: v = fract(sin(x*12.9898+z*78.233)*43758.5) — multiply grass color by 0.85+0.3v.

islandGeo.computeVertexNormals();

Material: MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0 }).

Palm creation:

```ts
const palmDefs: Array<[number, number]> = [[3,-2],[-5,3],[6,6],[-2,-7],[8,-3],[-8,-4],[1,9],[5,-9]];
```
Filter: h between 1.2 and 7 → keep first 6.

Randomness: use deterministic pseudo-random function seeded, to keep reproducibility — or Math.random fine. Use seeded helper `rand(seed)` — I'll use a small mulberry32.

Trunk:
```ts
const H = 3.4 + rnd() * 1.6;
const ang = rnd() * Math.PI * 2;
const bend = 0.9 + rnd()*0.6;
const top = new THREE.Vector3(base.x + Math.cos(ang)*bend, base.y + H, base.z + Math.sin(ang)*bend);
const pts = [
  new THREE.Vector3(base.x, base.y, base.z),
  new THREE.Vector3(base.x + (top.x-base.x)*0.3, base.y + H*0.4, base.z + (top.z-base.z)*0.3),
  new THREE.Vector3(base.x + (top.x-base.x)*0.7, base.y + H*0.75, base.z + (top.z-base.z)*0.7),
  top
];
const curve = new THREE.CatmullRomCurve3(pts);
const trunkGeo = new THREE.TubeGeometry(curve, 10, 0.15, 6, false);
```
Taper: could scale radius along tube — TubeGeometry doesn't taper. Acceptable. Add base bulb sphere radius 0.24.

Trunk mesh castShadow.

Fronds: 8 per palm:
```ts
for (let f = 0; f < 8; f++) {
  const yaw = (f / 8) * Math.PI * 2 + rnd() * 0.5;
  const tilt = 0.15 + rnd() * 0.75; // radians drooping — rotation around X after yaw: frond +Z; tilt positive rotates +Z down? Rx(θ): z→(0,-sinθ,cosθ): positive θ dips frond down. tilt range 0.15..0.9, some nearly horizontal, some drooping.
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(new THREE.Quaternion().setFromAxisAngle(RIGHTX, tilt));
```
Wait order: q = qYaw * qTilt: applies tilt first then yaw ✓ (frond tilted in its local frame then rotated around world Y).

Also roll jitter around Z (twist frond): multiply small rotation around local Z before tilt: q = qYaw * qTilt * qTwist. Twist rotation around Z of the frond plane gives variation ✓.

leafData.push({ pos: crownTop offset slightly down (0, -0.05, 0) plus outward small offset along frond dir *0.15, quat q, scale: 0.85 + rnd()*0.4, phase: rnd()*Math.PI*2 }).

Frond geometry length 2.6 * scale up to 1.25 → fronds ~3 long. Crown diameter ~6 — island 40 across, proportionate ✓.

InstancedMesh:
```ts
const leaves = new THREE.InstancedMesh(frondGeo, frondMat, leafData.length);
leaves.castShadow = true;
leaves.receiveShadow = false? Fronds receiving their own shadow may look odd; set false? InstancedMesh receiveShadow true is fine with PCF; set true for self-shadowing palms? Palm fronds receiving shadow from other fronds looks good. Enable receiveShadow true.
```
Also could setColorAt for variation: leaves.setColorAt(i, colorVar) — then material.color white and instance colors green variations. instanceColor needsUpdate. I'll do: setColorAt with color hsl variation; frondMat = MeshStandardMaterial({color: 0xffffff...}) Actually if setColorAt used, final = material.color * instanceColor. Set material color white and instance colors greens. Do it once at init.

Sway update per frame:

```ts
const dummy = new THREE.Object3D();
const swayEuler = new THREE.Euler(0,0,0);
const qSway = new THREE.Quaternion();
function updateLeaves(t: number) {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const s = Math.sin(t*1.7 + d.phase) * 0.09 + Math.sin(t*3.6 + d.phase*1.9) * 0.04;
    swayEuler.set(s, 0, s*0.7);
    qSway.setFromEuler(swayEuler);
    dummy.position.copy(d.pos);
    dummy.position.x += Math.sin(t*1.7+d.phase) * 0.06;
    dummy.quaternion.copy(qSway).multiply(d.quat);
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
```

Wind direction: could make sway axis aligned with wind but generic is fine.

Now sky + sun:

```ts
const sky = new Sky();
sky.scale.setScalar(2000);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 5;
skyU.rayleigh.value = 2.2;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.85;
const elevation = 21 * Math.PI / 180;
const azimuth = Math.PI * 1.22; // pointing... 
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI/2 - elevation, azimuth);
skyU.sunPosition.value.copy(sunDir);
```
Azimuth: want sun visible from camera at (35,12,35) looking toward origin: view direction ≈ (-0.72, -0.23, -0.72) normalized. Sun should be roughly in that horizontal direction: (-0.7, y, -0.7). setFromSphericalCoords(1, phi, theta): x = sinφ sinθ, y = cosφ, z = sinφ cosθ. Want x<0, z<0 → sinθ<0, cosθ<0 → θ ≈ 180°+45° = 225° = 3.927 rad. theta = 3.927.

Sun height: elevation 21° → sun y = sin21 = 0.36. Visible in sky ✓ above horizon at 21°, camera looking slightly down will see horizon band; sun at 21° elevation visible if FOV 50° covers... camera pitch: looking at (0,2,0) from (35,12,35): direction (-35,-10,-35) → pitch ~ -11°. FOV vertical 50 → covers -36..+14 approx? Half FOV 25 → up to +14° elevation at screen top in view center column; sun at 21° elevation might be off-screen unless direction differs horizontally. View azimuth toward (-1,-1)/√2 = 225° horizontal; sun azimuth 225° too → sun directly ahead, elevation 21 vs camera center -11 → 32° above center — off screen (25 half FOV). Lower elevation to 12°: 12+11=23 > 25? 23 < 25 → visible near top. Hmm tight. Use elevation 10°: sun 21° above center → visible. But low sun → warm light, long shadows — pretty. Set elevation 10°. Sun y = 0.17. Light more horizontal: shadow camera covering ±50 at 120 distance fine.

With low sun, directional light color warm: 0xffd9a3, intensity 3.2.

Alternatively elevation 15 and camera FOV 55. I'll use elevation 13°, fov 52. Sun at 24° above center; half fov 26 → visible ✓ barely. Fine.

Hemisphere light: new THREE.HemisphereLight(0xbfd8ef? , ground 0x3a4a35, 0.55).

Fog: scene.fog = new THREE.Fog(0xd6e6f2?? , 140, 380). Compute ocean far corner distance: ocean half 220 → corners at (±220, ±220); camera at (35,35): max distance ~ sqrt(255² + 255²) ≈ 360. Fog far 380 → corners nearly fully fogged but maybe visible edge. Ocean 440 → let's fog far 360 so edges fully fog color; near 150. Island distance ~50 → factor smoothstep tiny ✓. Horizon of sky vs fog color: Sky at horizon (away from sun) is light blue-white; fog color 0xd0e2ec-ish plausible. I'll pick fogColor = new THREE.Color(0.78, 0.87, 0.93)?? That's (0xbfcf? ) hmm as sRGB ~ (0.9,0.94,0.97) bright. Set hex 0xcfe2ee and use for both.

Actually careful: scene.fog color with hex is stored linear-converted ✓ and ocean uniform gets same THREE.Color object → pass scene.fog.color directly as uniform value ✓ (uniform { value: scene.fog.color } — shares instance; consistent).

Ocean shader fog mixing linear color then tonemapped ✓ matches built-in fog path (fog applied before tonemapping in built-ins ✓).

Ocean uniform values:
- uDeep: new THREE.Color(0x0a3d62)? tropical deep: 0x08436e? Let me choose deep (0.008, 0.16, 0.30) hex 0x022a4d... I'll use new THREE.Color(0x06345f) and shallow new THREE.Color(0x1a8f8a). These become linear; under ACES with sun ~ they'll render nicely.
- uHorizon: new THREE.Color(0xbfd8e8); uZenith: new THREE.Color(0x4a7ec9)? reflection sky slightly deeper: 0x3f74b8.
- uSunColor: new THREE.Color(0xfff2d8) with intensity multiplier baked: multiply scalar 1.4? spec uses *3.0 in shader; keep color 1.0,0.93,0.8 and multipliers in shader.

Directional light: color 0xfff0d5, intensity 3.0.

Check overall brightness — hard to tune blind, but ACES handles; exposure 0.6.

Hemisphere intensity 0.5.

Island material roughness 1; grass color brightness fine.

Now — island slope shading: MeshStandardMaterial with directional sun low → nice long shadows.

Ocean shadow of boat missing (no receiveShadow on water) — acceptable; boat has shadow onto... nothing. Hmm, boat casting shadow onto water would be nice but custom shader shadow receiving is complex (needs shadow chunks). Spec only requires boat meshes cast shadows (they do, onto island if overlapping — boat is 20 away from island, shadow direction from sun toward +x+z... sun at azimuth 225° direction means light travels toward (0.7,?,0.7)*? light direction = -sunDir → shadows cast away from sun: direction (0.7, ..., 0.7)? sunDir points toward sun at (-0.66, 0.22, -0.66)... shadow of boat cast toward +x+z — away from island. Shadows mostly not visible on island. That's fine per spec.

Wait — but maybe better to have sun behind camera so island shadows visible toward viewer and water sparkles... but then sun not visible in frame. Spec: "a sky: ... with a visible sun position" — the Sky addon always renders a sun disc wherever sunPosition is; "visible" likely just means the sky shows sun position (disc). Compromise: elevation 13°, azimuth 225° → sun disc visible in frame ✓, water gets glitter path toward camera ✓ (specular reflect toward camera when looking toward sun — classic beautiful backlit glitter). Island backlit but hemisphere fill + fresnel... island might look darkish. Increase hemisphere to 0.7 and add slight ambient 0.15? Directional 3.2 from behind island → front faces (facing camera) in shadow-ish → island dark side toward camera. Hmm. Mitigation: rotate azimuth so sun is more from the side: sun direction horizontal (-0.25, y, -0.97)? Then sun visible in frame if within FOV horizontally: camera view azimuth center 225°, half horizontal FOV ~ 26*aspect... aspect ~1.7 → horizontal half FOV ≈ atan(tan(26°)*1.7) ≈ 40°. Sun azimuth offset up to 40° visible. Put sun azimuth at 245°? θ: direction (sinθ, cosθ) with θ=245° → (sin245=-0.906, cos245=-0.423) → dir (-0.906, -0.423): that's 20° off view center (225). Visible ✓. Sun horizontal direction (-0.88, -0.41): light comes from left-ish across — island side-lit: west-facing (toward -x) side lit, camera-facing side partially lit. Better. Choose θ = 4.28 rad (245°). Elevation 13°.

sunDir = setFromSphericalCoords(1, π/2 - 0.227, 4.28): φ=1.344. x = sin(1.344)sin(4.28) = 0.974*(-0.906) = -0.883; y = cos(1.344)=0.225; z = 0.974*(-0.423)=-0.412. sunDir = (-0.883, 0.225, -0.412) ✓.

DirectionalLight.position = sunDir * 130.

Ocean spec highlight: half-vector with sun low → glitter path across water toward camera when looking toward sun — camera looks toward (-x,-z) where sun is ✓ nice.

Shadow direction: shadows cast toward +x,+z (opposite sun) → boat shadow toward camera-right-front, island shadow away from camera. OK.

Shadow camera bounds: light at sunDir*130 = (-115, 29, -54). Shadow camera looks at origin. Ortho ±48. near 60 far 220. Distance from light to origin = 130. farthest scene point from light along view: boat at (14,?,16): its distance from light... set near 40, far 260 to be safe.

Also set sunLight.shadow.camera updates: after setting left/right etc, no updateProjectionMatrix needed if set before first render? It's safer: (sunLight.shadow.camera as THREE.OrthographicCamera).updateProjectionMatrix().

Leaves shadow: instanced with 48 instances castShadow ✓.

Performance: ocean 256² segments with heavy vertex shader (5 waves × 3 samples = 15 gerstner evals per vertex) → 65k verts fine.

Frond geometry: PlaneGeometry(0.55, 2.6, 3, 10).

Now write islandHeight JS and GLSL identically:

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const s = r / 22;
  const sc = s < 1 ? s : 1;
  const ss = sc * sc * (3 - 2 * sc);
  const base = 11 * (1 - ss);
  const dip = 2 * Math.pow(sc, 8);
  const amp = Math.min(Math.max((1 - s) * 2.2, 0), 1);
  const n = 0.8 * Math.sin(x * 0.32 + 1.7) * Math.cos(z * 0.27 - 0.6)
          + 0.4 * Math.sin(x * 0.13 - z * 0.11 + 2.0)
          + 0.25 * Math.sin(x * 0.53 + z * 0.41);
  return base - dip + n * amp;
}
```
GLSL identical (careful: clamp(ss,0,1) and pow(min(s,1),8), clamp((1-s)*2.2, 0,1)).

Island color assignment per vertex — also add slight beach wet-sand darker right at waterline: for h in [-0.5, 0.6], darken sand 15%. Nice.

Code:

```ts
const sand = new THREE.Color(0xe0cd9a);
const wetSand = new THREE.Color(0xb99f6e);
const grass = new THREE.Color(0x3f7d2f);
const grass2 = new THREE.Color(0x2c6425);
const rock = new THREE.Color(0x75706a);
```

loop:
```ts
const v = hash(x, z); // 0..1
let col: Color;
grassCol = grass.clone().lerp(grass2, v) — allocations; use temp color and lerpColors.
```
Use tmp = new THREE.Color(); tmp.lerpColors(grass, grass2, v); then sandMix: tmp2.lerpColors(tmp, sand, sandMix)... compose:

```ts
const c1 = new THREE.Color();
const c2 = new THREE.Color();
for (...) {
  const h = ...; const slope = ...;
  c1.lerpColors(grassA, grassB, v);
  const sandMix = THREE.MathUtils.smoothstep(h, 0.6, 2.4); // 0 below 0.6 → sand
```
Note three's MathUtils.smoothstep(x, min, max). sandMix = smoothstep(h, 0.6, 2.4): h<0.6 → 0 → full sand ✓; grass high.
```ts
  c2.lerpColors(sand, c1, sandMix);
  const rockMix = clamp(smoothstep(slope, 0.45, 0.8) + smoothstep(h, 8, 10.5)*0.8, 0, 1);
  c2.lerp(rock, rockMix*0.85);
  // wet sand
  const wet = 1 - smoothstep(h, 0.0, 0.9); // h<0 → 1
  c2.lerp(wetSandColor, wet*0.5);
  colors[3i..] = c2.r...
}
islandGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
```

Slope: e=0.6; slope = hypot(h(x+e)-h(x-e), h(z+e)-h(z-e)) / (2e).

Underwater vertices h ≈ -2 flat — sand color ✓ (sandMix 0 → sand; wet→ dark sand). Fine.

Now boat code with types.

Let me also double check ExtrudeGeometry shape orientation and hull look. Bow at +x tip (2.05, 0); stern flat-ish rounded at -2. Width ±0.78. Bevel size 0.22 expands outline by 0.22 → total width ~2.0, length ~4.5. "About 4 units long" ✓ close enough (4.5 slightly long; scale shape 0.9? Keep, "about").

Boat group:
```ts
const boat = new THREE.Group();
```
hull mesh: hullGeo translated: after rotateX, y spans -0.28..1.03 (extrude depth 0.75 + bevel 0.28 both ends: z from -0.28.. 0.75+0.28 = 1.03 → world y same). Translate geometry y -= 0.55 → spans -0.83..0.48. Deck at 0.45, cabin base 0.48. Waterline offset: boat.y = h + 0.45 → hull bottom at h-0.38 draft ✓.

Hmm bevelThickness adds along extrusion axis (z): depth 0.75 plus bevelThickness on each end → z total -0.28..1.03 ✓ as said.

Deck position y = 0.42 (flat ShapeGeometry). Gunwale top at 0.48 — deck slightly below rim ✓.

Cabin: BoxGeometry(0.95, 0.6, 1.1) at (-0.95, 0.78, 0). Roof: Box(1.1, 0.12, 1.25) at (-0.95, 1.14, 0).

Mast: CylinderGeometry(0.05, 0.08, 2.9, 8) at (0.55, 0.48+1.45=1.93, 0). Top at 3.38.

Boom: CylinderGeometry(0.035, 0.035, 1.9, 6), rotateZ? cylinder along Y default; rotateX(π/2) → along Z. position (0.55, 0.95, 0)?? boom from z -0.95..0.95 centered. Sail spans z ±0.85 at x=0.55? Sail plane after rotateY(π/2) is in ZY plane at x=0: set position (0.62, 1.85, 0), spans y 0.95..2.75, z ±0.85. Boom at y 0.95 ✓ matches sail bottom.

Sail slight billow: modify plane vertices z (before rotateY? after) — skip, flat is fine. Or use slight curvature: after creating PlaneGeometry(1.7,1.8, 6, 6): for each vertex, x bulge: pos.z += 0.15*(1-(x/0.85)²)? gives billow around mast. Then rotateY(π/2). Small effort, nice result. Do it.

Materials:
- hull: MeshStandardMaterial color 0xf5f2ea? A white hull; maybe two-tone impossible per mesh; fine: hull white 0xeef0ea, roughness 0.6.
- deck: wood 0x9c7a4d.
- cabin: 0xf4f1e8; roof: 0xb0402f? teal roof 0x2e6f6b nice tropical. roof dark red-brown? Choose 0x8c3b2e.
- mast/boom: 0x8a6b45.
- sail: 0xf7f4ea, DoubleSide, roughness 0.9.

All castShadow = true.

Add tiny flag on mast top? skip.

Boat drift: 
```ts
const bx = 12 + Math.sin(waveTime * 0.05) * 2.2;
const bz = 14 + Math.cos(waveTime * 0.04) * 2.2;
const yaw = 2.6 + Math.sin(waveTime * 0.02) * 0.15;
```
Distance from origin: (12±2.2, 14±2.2) → max ~ sqrt(14.2²+16.2²)=21.5 < 25 ✓.

Boat orientation update:
```ts
const fx = Math.cos(yaw), fz = -Math.sin(yaw);
const rx = Math.sin(yaw), rz = Math.cos(yaw);
const hC = oceanHeight(bx, bz, waveTime);
const hF = oceanHeight(bx + fx*1.5, bz + fz*1.5, waveTime);
const hB = oceanHeight(bx - fx*1.5, bz - fz*1.5, waveTime);
const hR = oceanHeight(bx + rx*0.8, bz + rz*0.8, waveTime);
const hL = oceanHeight(bx - rx*0.8, bz - rz*0.8, waveTime);
const pitch = Math.atan2(hB - hF, 3.0);
const roll = Math.atan2(hR - hL, 1.6);
boat.position.set(bx, hC + 0.45, bz);
boat.rotation.set(
  pitch + Math.sin(waveTime*0.9)*0.02,
  yaw,
  roll + Math.sin(waveTime*1.3 + 1.0)*0.035
);
```
Sign check for pitch: forward local +X. Positive rotation.x rotates +X toward... Rx(θ): x stays; vector (1,0,0) unchanged?? Rotation about x-axis doesn't move x-axis vector! Oops: pitch about local X? For boat forward = +X, pitch (bow up/down) is rotation about the boat's lateral axis = local Z. Roll (side up/down) about longitudinal axis = local X.

Redo: pitch about Z: Rz(θ): (1,0,0) → (cosθ, sinθ, 0): positive θ lifts bow (local +X) up ✓. So bow up when hF > hB → rotation.z = atan2(hF - hB, 3.0)... wait positive z-rotation lifts +X ✓ so rotation.z = +atan((hF-hB)/3) gives bow up when front higher ✓.

Roll about X: Rx(θ): (0,0,1) → (0, -sinθ, cosθ): local +Z (which side is that?) right vector computed earlier: local +Z maps to world (sin yaw, 0, cos yaw) — I called that "right". Rx positive θ moves local +Z down → right side down. If hR > hL, right side should be up → rotation.x negative: rotation.x = atan2(hL - hR, 1.6).

Euler order: default 'XYZ'. With yaw about Y plus small pitch/roll — order matters little for small angles. OK.

But careful: Euler default order applies X then Y then Z? Whatever — small angles.

boat.rotation.set(rx, yaw, rz) where rx = roll (about x) etc. Note also add the small oscillations with correct signs — just add to respective components.

Now __ocean exposure:

```ts
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number) => { ... },
  time: () => waveTime,
};
```

Everything assembled. Also `__boat`, `__leaves`, `__island`, `__sun`.

Sun exposure: (window as any).__sun = sunLight.

Shadow tuning: sunLight.shadow.bias = -0.0004; normalBias = 0.03.

Renderer: 
```ts
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

OrbitControls import; controls.target.set(0,2,0); after camera.lookAt not needed if target set and update called. camera.position.set(35,12,35).

Type strictness details:
- `sky.material.uniforms` — typed as any-ish; sky.material is ShaderMaterial; uniforms record typed; fine.
- ExtrudeGeometry options typed ✓.
- attributes: `geo.attributes.position as THREE.BufferAttribute` — PlaneGeometry position is BufferAttribute ✓ (typed as BufferAttribute | InterleavedBufferAttribute? In three types, Geometry attributes: `{[name: string]: BufferAttribute | InterleavedBufferAttribute...}`. Actually BufferGeometry.attributes is typed `{ [name: string]: BufferAttribute | InterleaveBufferAttribute }` hmm. In recent @types/three (three now ships own types), `geometry.attributes.position` type is `BufferAttribute | InterleavedBufferAttribute`. Calling getX on both exists; setY exists on both. So no cast needed, but to be safe cast: `const pos = geo.attributes.position as THREE.BufferAttribute;` InterleavedBufferAttribute doesn't have setXYZ? It does have setXYZ? Not sure. Cast to BufferAttribute to be safe — fine since PlaneGeometry uses BufferAttribute.

Hmm, in newer three's own TypeScript types (three r160+ ships types), `BufferGeometry.attributes: {[name:string]: BufferAttribute | InterleavedBufferAttribute & ...}`. Casting via `as THREE.BufferAttribute` may error "conversion of type X may be a mistake"? Casting union to one member is allowed (narrowing) ✓.

- InstancedMesh.setColorAt exists ✓.
- Sky from addons: has .material.uniforms — types: Sky class has material: ShaderMaterial ✓ (three examples types include Sky). `sky.material.uniforms.turbidity.value = 5` ✓.

- CatmullRomCurve3 ✓. TubeGeometry(curve, tubularSegments, radius, radialSegments, closed) ✓.

- Clock: use THREE.Clock; getDelta.

- window exposure: `(window as any).__scene = scene;` fine with strict.

Frond billow? Sail billow as described.

One more requirement check: "waves must be clearly visible (crest-to-trough height about 0.5 to 2 units)" — our total 2.28 peak possible; typical combined ~1.4. Some might judge crest-to-trough of sum; fine.

Ocean fragment: also darken water color by depth-ish? skip.

Also add distant water alpha? no.

Let me also handle: island plane 56x56 → corners at r=39.6, h=-2 underwater; visible through water? Ocean opaque — seafloor hidden ✓. Island edge visible under transparent water? Water opaque → fine.

Boat near island? Boat at (12,14) distance ~18.4 from origin — island shoreline meanders to r~13-19... boat could collide visually with shore foam/shallow. That's actually scenic (boat near shore) ✓. But could boat intersect land above water? At r=18.4, island height: base 11*(1-ss), s=0.836, ss=0.836²*(3-1.672)=0.699*1.328=0.928 → base=0.79; dip=2*0.836^8=2*0.241=0.48; h=0.31±noise(amp = (1-0.836)*2.2=0.36 → ±0.53) → up to 0.84 above water! Boat at (12,14) r=18.4 might overlap a land patch up to 0.84 high. Hull bottom at h_water - 0.38... boat y = waveHeight + 0.45; land at 0.8 could poke through hull visually. Risky. Move boat baseline further: (14, 10)? r = 17.2 — similar. (12, 16)? r=20: base at s=0.909: ss=0.976→base 0.26, dip 0.94*? 2*0.909^8=2*0.472=0.94 → h=-0.68±noise(0.2) → underwater ✓. Boat at (12, 16), drift ±2.2 → r from sqrt(9.8²+13.8²)=16.9 to sqrt(14.2²+18.2²)=23.1. At r=16.9: h = base(1-ss; s=0.768, ss=0.590*(3-1.536)=0.864→base 1.5) - dip(2*0.768^8=2*0.118=0.236) + noise(±0.51) → up to 1.77. Land patch! Boat at min r corner could hit land.

Alternative: reduce drift to ±1.2 and choose position r~20: boat (13,15): r=19.85, drift → r range sqrt(11.8²+13.8²)=18.15 to sqrt(14.2²+16.2²)=21.5. At r=18.15: s=0.825, ss=0.68*(3-1.65)=0.918→ base 0.90; dip 2*0.825^8 = 2*0.218=0.436 → h=0.46+noise(amp (1-0.825)*2.2=0.385 → ±0.56) → max 1.0. Land up to 1.0 possible at boat's closest point. Hmm.

Safer: place boat at (16, 12): r=20 — same by symmetry. The issue: noise creates islands/peninsulas around r 15-19. I could clamp noise amp to fade earlier: amp = clamp((1 - s)*1.4, 0, 1) → zero at r≥22? at r=18: (1-0.818)*1.4=0.255 → noise ±0.37 → max h at r=18: 0.9-0.44+0.37=0.83. Still above water possibly.

Simplest robust fix: push boat further out: (18, 14) → r=22.8, drift ±1.5 → min r ~ sqrt(16.5²+12.5²)=20.7. At r=20.7: s=0.941: ss=0.885*(3-1.882)=0.99→ base=0.115; dip=2*0.641=1.28 → h=-1.17±noise(amp=0.082*1.4 → ±0.13) → max -1.0 ✓ safely underwater. Boat within 25 of origin: max r = sqrt(19.5²+15.5²)=24.9 ✓ just inside. Drift ±1.5: bx = 18 + sin(t*0.05)*1.5, bz = 14 + cos(t*0.04)*1.5 → max 24.9 ✓. But spec said "floating at about (12, 0, 14)" — 18,14 isn't "about (12,0,14)". Hmm. Keep (12,0,14)-ish: use (13, 0, 15) with drift ±1.0: r range: sqrt(12²+14²)=18.44 to sqrt(14²+16²)=21.26. At r=18.44: s=0.838, ss=0.931→base 0.76; dip=2*0.838^8: 0.838^8 = e^(8*ln0.838)=e^(8*(-0.177))=e^-1.414=0.243→0.486 → h = 0.27 + noise(amp (1-0.838)*1.4 = 0.227, noise max 1.45*0.227 = 0.33) → max 0.6. Possible small land patch 0.6 at exactly boat position — boat hull bottom at -0.38 relative to water 0 → land 0.6 could poke through hull near boat. Chance depends on noise value at that spot; deterministic — I could just check: compute islandHeight at candidate and nudge. Since I'm writing code blind, safest: reduce noise amplitude overall and make shoreline smoother: noise amplitudes 0.55/0.3/0.18 → max 1.03. Then at r=18.44 with amp 0.227 → ±0.23 → max h 0.5. Still possible.

Alternative: make dip stronger so shoreline pulls inside: dip = 2.5*pow(min(s,1),7)? At r=18.44: 0.838^7 = e^(-1.24)=0.29 → 0.73; h = 0.76-0.73+0.23max = 0.26. Marginal.

Or start dip earlier with different shape: dip = 1.8 * smoothstep(0.55, 1.0, s) * ... hmm.

Cleanest: choose boat position and verify by mental math at exact deterministic spots, and place boat where h < -0.6 for all drift positions. Let me restructure: reduce island noise near shore more aggressively: amp = clamp((0.9 - s) * 3.0, 0, 1) → zero at r ≥ 19.8; at r=18: (0.9-0.818)*3=0.245→ noise ±0.36 (with max noise 1.45). At r=19: amp=0.03 → negligible. Boat min r 18.44: h max = base(0.76) - dip(0.49) + 0.36·? amp at r=18.44: (0.9-0.838)*3 = 0.186 → ±0.27 → max 0.54. Ugh.

OK let me directly lower base falloff exponent — make base drop faster near edge so shoreline at r≈17: base = 11*(1-ss)^1.6? At r=17 (s=0.773, ss=0.878): (1-0.878)=0.122^1.6 = e^(1.6*ln0.122)=e^(1.6*(-2.104))=e^-3.37=0.0344 → 0.38. dip 2*0.773^8 = 2*0.128 = 0.26 → h = 0.12±noise. Shoreline ~r 16-17.5. At r=18.44: base (s=0.838, ss=0.931): (0.069)^1.6 = e^(1.6*(-2.67))=e^-4.28=0.014→0.15; dip 0.49 → h=-0.34±noise(0.27) → max -0.07. Still marginally above 0 possible. Push dip: dip = 2.4*sc^8: at r=18.44 → 0.58 → h = -0.43+0.27 → max -0.16 ✓. And peak: r=0: 11 - 0 + noise(±1.45) → 9.5-12.4 ✓. At r=12 (s=0.545, ss=0.572): (0.428)^1.6 = e^(1.6*(-0.849))=e^-1.36=0.257→2.83; dip 2.4*0.0086=0.02 → h=2.8±noise(amp 1) → 1.4-4.3. Island profile: peak 11, gentle then drops. At r=15 (s=0.682, ss=0.78): (0.22)^1.6=e^(1.6*(-1.51))=e^-2.42=0.089→0.98; dip 2.4*0.045=0.108 → h≈0.87±1.03 → -0.16..1.9. Shoreline meanders r≈13-17.5 ✓ natural.

Recheck boat min-r point r=18.44 with noise amp: (1-s)*2.2 → 0.357 → ±0.52?? I need to pick amp formula. Use amp = clamp((0.85 - s) * 2.5, 0, 1): at s=0.838 → 0.03 → ±0.04. Zero at s≥0.85 (r≥18.7). Boat min r 18.44: h = -0.43 ± 0.04 → ✓ safe (max -0.39). And shoreline region r<18 gets noise amp up to clamp((0.85-0.68)*2.5)=0.425 at r=15 → ±0.6; at r=13 (s=0.59): amp=0.65→±0.94. Hmm noise fades between r=13-18.7 — shoreline between r 13-18 still meanders moderately ✓.

But wait, I changed base exponent to 1.6 — recheck "sloping into the sea" ✓ smooth.

Also island diameter: shoreline r~13-18 → diameter 26-36. Spec "about 30 to 50 units across" — 26-36 ok-ish ("about"). Increase R to 24: s = r/24. Shoreline shifts: at r=19 (s=0.792, ss=0.902): (0.098)^1.6=e^(1.6*(-2.32))=e^-3.72=0.024→0.27; dip 2.4*0.792^8=2.4*0.155=0.37 → h=-0.10±noise(amp (0.85-0.792)*2.5=0.145→±0.21) → shoreline r≈17.5-21 → diameter ~35-42 ✓ better. Boat at (13,15) min r 18.44: s=0.768, ss=0.878: (0.122)^1.6=0.034→0.38; dip=2.4*0.768^8=2.4*0.123=0.30; h=0.08±noise(amp (0.85-0.768)*2.5=0.205 → ±0.3) → max 0.38. Possible land 0.38 at boat spot — hull bottom -0.38 → could touch. Move boat to (14, 16)?? spec "about (12,0,14)": (13,15) close. With drift ±1.0 min r = 18.44. Land max 0.38 above water at worst-case noise. Boat waterline: hull bottom at h_boat... boat floats ON waves (±1.1). When wave trough at boat (water -1), land patch 0.38 pokes 1.4 above hull bottom... but hull bottom only matters if land within hull footprint (radius ~2.3). Land patch at boat center — yes overlap.

Pragmatic solution: sink island a touch globally: islandHeight returns value - 0.3? Then peak 9.2-12.1 ✓ still fine; shoreline pulls in slightly; boat spot: h = 0.08-0.3 = -0.22 ± 0.3 → max 0.08. Hull bottom at wave+0.45-0.83 = wave-0.38; when wave low (-1.1) hull bottom -1.48 → land 0.08 pokes 1.56 above hull bottom?? No wait — hull bottom at boat y + (-0.83) = (waveDisplacement + 0.45) - 0.83 = wave - 0.38. If wave = -1.1 → hull bottom -1.48, land at 0.08 → land sticks through hull. Ugh — but land patch height 0.08 is barely above still water; boat hull sides slope; visually a shallow reef touching keel occasionally is... acceptable? Actually boat floating in shallow water near shore looks natural. Land 0.08 is basically waterline sandbar. Honestly fine.

Better: verify exact numbers via deterministic check? I can't run code. Choose safer: boat at (12, 16)? "about (12,0,14)" — (12,16) is 2 off. r range with drift ±1: (11,15)→18.6 to (13,17)→21.4. Similar to before.

Alternatively reduce shoreline noise reach even more: amp = clamp((0.78 - s) * 3.0, 0, 1) → zero at s≥0.78 (r≥18.7 with R=24). At boat min r 18.44 (s=0.768): amp = 0.036 → ±0.05. h = 0.38-0.3(sink) - 0.3? Let me finalize numbers:

Final islandHeight:
```ts
const R = 24;
const r = hypot(x,z); const s = r/R; const sc = min(s,1);
const ss = sc*sc*(3-2*sc);
const base = 11 * pow(max(0, 1-ss), 1.6);
const dip = 2.4 * pow(sc, 8);
const amp = clamp((0.78 - s) * 3.0, 0, 1);
const n = 0.55*sin(x*0.32+1.7)*cos(z*0.27-0.6) + 0.3*sin(x*0.13 - z*0.11 + 2.0) + 0.18*sin(x*0.53+z*0.41);
return base - dip + n*amp - 0.3;
```
Peak at r=0: 11 - 0 + 1.03max - 0.3 → up to 11.7, min ~9.7 ✓ (5-15).
Shoreline: h=0 → base+dip tradeoff: at s=0.7 (r=16.8): ss=0.784 → (0.216)^1.6 = e^(1.6*(-1.532)) = e^-2.45=0.086→0.95; dip 2.4*0.7^8=2.4*0.0576=0.14; h = 0.95-0.14+noise(amp (0.78-0.7)*3=0.24→±0.25)-0.3 → range 0.26..0.76?? hmm h at r=16.8 ≈ 0.5±0.25 → above water! Shoreline further out: s=0.75 (r=18): ss=0.844 → (0.156)^1.6=e^(1.6*(-1.858))=e^-2.97=0.051→0.56; dip=2.4*0.75^8=2.4*0.100=0.24; h=0.56-0.24+noise(amp 0.09→±0.13)-0.3 = 0.02±0.13 → shoreline ≈ r 17-19.5 ✓ diameter 34-39 ✓.

Boat min r 18.44 (s=0.768): ss=0.872 → (0.128)^1.6 = e^(1.6*(-2.056))=e^-3.29=0.037→0.41; dip 2.4*0.768^8=2.4*0.123=0.295; h=0.41-0.295+noise(amp (0.78-0.768)*3=0.036→±0.037)-0.3 = -0.19±0.04 → max -0.15 ✓ underwater always. 

Also boat max r 21.4 → fine.

And foam shore band via islandH: smoothstep(-1.1,-0.35,ih)*smoothstep(0.9,0.05,ih): where water meets land ih∈(-0.5..0.3): foam band ✓ hugs actual shoreline ✓.

Shallow color: shallowMix = smoothstep(-1.6, 0.6, ih) ✓.

GLSL islandHeight must mirror exactly:
```glsl
float islandHeight(vec2 p){
  float r = length(p);
  float s = r / 24.0;
  float sc = min(s, 1.0);
  float ss = sc*sc*(3.0-2.0*sc);
  float base = 11.0 * pow(max(0.0, 1.0-ss), 1.6);
  float dip = 2.4 * pow(sc, 8.0);
  float amp = clamp((0.78-s)*3.0, 0.0, 1.0);
  float n = 0.55*sin(p.x*0.32+1.7)*cos(p.y*0.27-0.6) + 0.3*sin(p.x*0.13-p.y*0.11+2.0) + 0.18*sin(p.x*0.53+p.y*0.41);
  return base - dip + n*amp - 0.3;
}
```
JS:
```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const s = r / 24;
  const sc = Math.min(s, 1);
  const ss = sc * sc * (3 - 2 * sc);
  const base = 11 * Math.pow(Math.max(0, 1 - ss), 1.6);
  const dip = 2.4 * Math.pow(sc, 8);
  const amp = Math.min(Math.max((0.78 - s) * 3, 0), 1);
  const n = 0.55 * Math.sin(x * 0.32 + 1.7) * Math.cos(z * 0.27 - 0.6)
    + 0.3 * Math.sin(x * 0.13 - z * 0.11 + 2.0)
    + 0.18 * Math.sin(x * 0.53 + z * 0.41);
  return base - dip + n * amp - 0.3;
}
```
✓.

Palm positions: need h between ~1 and 6. Candidates (checked roughly): compute a few:
- (0, 5): r=5, s=0.208, ss=0.116 → (0.884)^1.6 = e^(1.6*(-0.123))=e^-0.197=0.82→9.05; dip tiny; amp=1; n = 0.55*sin(1.7)*cos(1.35-0.6=0.75): sin(1.7)=0.99, cos(0.75)=0.73 → 0.55*0.99*0.73=0.40; +0.3*sin(0*0.13-5*0.11+2 = 1.45)=0.3*0.993=0.30; +0.18*sin(5*0.41=2.05)=0.18*0.887=0.16; n=0.86 → h=9.05+0.86-0.3=9.6. Too high for palm (near peak).
- (6, 0): r=6, s=0.25, ss=0.156 → (0.844)^1.6 = e^(1.6*(-0.17))=e^-0.272=0.762→8.38; n: 0.55*sin(6*0.32+1.7=3.62)*cos(-0.6): sin(3.62)=-0.46→0.55*(-0.46)*0.825=-0.21; 0.3*sin(6*0.13+2=2.78)=0.3*0.35=0.10; 0.18*sin(6*0.53=3.18)=0.18*(-0.05)= -0.01 → n=-0.12; h≈8.0. High.
- Palms at mid-slope: r≈9-14. e.g. (10,0): s=0.417, ss=0.417²*(3-0.834)=0.174*2.166=0.377 → (0.623)^1.6=e^(1.6*(-0.473))=e^-0.757=0.47→5.17; n: 0.55*sin(10*0.32+1.7=4.9)*cos(-0.6)=0.55*(-0.982)*0.825=-0.446; 0.3*sin(1.3+2=3.3)=0.3*(-0.158)=-0.047; 0.18*sin(5.3)=0.18*(-0.83)=-0.15 → n=-0.64; h=5.17-0.64-0.3=4.23 ✓ good palm spot.
- (0,11): r=11, s=0.458, ss=0.21*(3-0.916)=0.438→(0.562)^1.6=e^(1.6*(-0.576))=e^-0.922=0.398→4.38; n: 0.55*sin(1.7)*cos(11*0.27-0.6=2.37): cos2.37=-0.72 → 0.55*0.99*(-0.72)=-0.39; 0.3*sin(-1.21+2=0.79)=0.3*0.71=0.21; 0.18*sin(4.51)=0.18*(-0.98)=-0.18 → n=-0.36; h≈3.72 ✓.
- (-7, 7): r=9.9, s=0.4125, ss=0.170*(2.175)=0.370→(0.63)^1.6≈0.478→5.26; n: 0.55*sin(-7*0.32+1.7=-0.54)*cos(7*0.27-0.6=1.29): sin(-0.54)=-0.514, cos1.29=0.277 → -0.078; 0.3*sin(-0.91-0.77+2=0.32)=0.094; 0.18*sin(-3.71+2.87=-0.84)=-0.134 → n=-0.12; h=4.84 ✓.
- (9,-6): r=10.8, s=0.45, ss=0.2*(2.1)=0.423→(0.577)^1.6=0.414→4.55; n: 0.55*sin(4.58)*cos(-1.62-0.6=-2.22): sin4.58=-0.99, cos(-2.22)=-0.60 → 0.327; 0.3*sin(1.17+0.66+2=3.83)=0.3*(-0.64)=-0.19; 0.18*sin(4.77-2.46=2.31)=0.18*0.74=0.13 → n=0.27; h=4.52 ✓.
- (-11, -2): r=11.18, s=0.466, ss=0.217*(2.068)=0.449→(0.551)^1.6=0.385→4.24; n: 0.55*sin(-3.52+1.7=-1.82)*cos(-0.54-0.6=-1.14): sin=-0.97, cos=0.42→ -0.224; 0.3*sin(-1.43+0.22+2=0.79)=0.21; 0.18*sin(-5.83-0.82=-6.65): sin(-6.65)= sin(-6.65+2π=−0.366)= -0.358→ -0.064 → n=-0.08; h=3.86 ✓.
- (4, -11): r=11.7, s=0.4875, ss=0.2376*(2.025)=0.481→(0.519)^1.6=e^(1.6*(-0.656))=e^-1.05=0.35→3.85; n: 0.55*sin(2.98)*cos(-2.97-0.6=-3.57): sin2.98=0.16, cos(-3.57)=-0.91→-0.08; 0.3*sin(0.52+1.21+2=3.73)=0.3*(-0.56)=-0.17; 0.18*sin(2.12-4.51=-2.39)=-0.147 → n=-0.40; h=3.15 ✓.
- (-3, 10): r=10.44, s=0.435, ss=0.189*(2.13)=0.403→(0.597)^1.6=0.437→4.8; n: 0.55*sin(0.74)*cos(2.7-0.6=2.1): 0.55*0.674*(-0.505)=-0.187; 0.3*sin(-0.39-1.1+2=0.51)=0.147; 0.18*sin(-1.59+4.1=2.51)=0.108 → n=0.07; h=4.57 ✓.

I'll hardcode palm positions: [(10,0), (0,11), (-7,7), (9,-6), (-11,-2), (4,-11), (-3,10)] — take 6-7; heights all 3-5 ✓. Use 7 palms × 8 fronds = 56 instances. Slopes there moderate ✓. Use all 7? count ≥30 ✓. I'll use 6: first six.

Trunk base y = islandHeight(x,z) - 0.2 (sunk).

Now also palm at (10,0) etc — trunk leaning direction random.

Frond count per palm: 8.

Sway magnitude fine.

Leaves material: MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }); with instance colors greens: color per instance like hsl(0.33±0.03, 0.5, 0.35±0.06). Use THREE.Color().setHSL(0.30+rnd*0.06, 0.55, 0.30+rnd*0.08).

Note setColorAt before first render; instanceColor.needsUpdate = true.

Now write the ocean ShaderMaterial:

```ts
const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir },
  uSunColor: { value: new THREE.Color(1.0, 0.93, 0.78) },
  uDeep: { value: new THREE.Color(0x0a3e63) },
  uShallow: { value: new THREE.Color(0x1b8a86) },
  uHorizon: { value: new THREE.Color(0xc2dde8)?? },
  uZenith: { value: new THREE.Color(0x3a70b8) },
  uFogColor: { value: scene.fog.color },
  uFogRange: { value: new THREE.Vector2(140, 360) },
};
```
scene.fog created before material.

Fog range: camera→far corner: ocean half 220, corners (±220,±220), camera (35,35): farthest corner (-220,-220): dist = sqrt(255²+255²)=360.6. So fog far 360 → corner fully fog ✓. near 150.

Ocean mesh: `const ocean = new THREE.Mesh(oceanGeo, oceanMat); ocean.frustumCulled = false? ` Geometry bounding box computed from undisplaced flat plane — displacement ±1.1 small; bounding sphere fine; keep culled true (plane always visible anyway).

Island group creation:

```ts
const islandGroup = new THREE.Group();
islandGroup.add(islandMesh);
palms' trunks added.
islandGroup.add(leaves);
scene.add(islandGroup);
(window as any).__island = islandGroup;
```

Island mesh receiveShadow = true. Trunk castShadow true, receiveShadow true.

Frond geometry — note instance colors with white material base.

Also: leaves InstancedMesh count must be exactly leafData.length.

One subtlety: `leaves.computeBoundingSphere?` InstancedMesh frustum culling uses geometry bounding sphere (not per instance) → could cull incorrectly? InstancedMesh boundingSphere computed via computeBoundingSphere considering instances (three r158+ InstancedMesh has computeBoundingSphere that iterates instances). To be safe: leaves.frustumCulled = false.

Boat meshes also fine.

Sail billow code:

```ts
const sailGeo = new THREE.PlaneGeometry(1.7, 1.8, 8, 8);
const sp = sailGeo.attributes.position as THREE.BufferAttribute;
for (let i = 0; i < sp.count; i++) {
  const x = sp.getX(i);
  sp.setZ(i, 0.18 * (1 - (x / 0.85) ** 2));
}
sailGeo.rotateY(Math.PI / 2);
```
After rotateY, billow becomes x-direction bulge ✓ (sail bulges toward +x? z→x mapping: Ry(π/2): (x,y,z)→(z, y, -x). So billow z=+0.18 → world x +0.18 → bulge forward — sail billows forward; physically sail billows... whatever, fine. Maybe billow backward: setZ negative → bulge toward -x (aft). Use -0.18? Wind direction arbitrary; choose +.

Hull extrude — ExtrudeGeometry options: `{ depth: 0.75, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.22, bevelSegments: 3, curveSegments